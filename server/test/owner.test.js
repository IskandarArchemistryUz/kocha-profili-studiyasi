import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { fromPglite, fromPool, migrate } from '../src/db.js';
import { buildApp, COOKIE } from '../src/app.js';
import { maskEmail, maskPhone } from '../src/owner.js';

let db, app, sent;
beforeEach(async () => {
  if (process.env.TEST_DATABASE_URL) {
    db = fromPool(new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 5 }));
    await db.query('DROP TABLE IF EXISTS project_spend, multicard_tx, kv, click_tx, payme_tx, orders, trials, exports, ledger, sessions, otp, users CASCADE');
  } else db = fromPglite(new PGlite());
  await migrate(db);
  sent = [];
  app = await buildApp({ db, pepper: 'p'.repeat(20), secret: 's'.repeat(40), secure: false, origins: [], owners: ['Boss@Archemistry.uz'],
    send: async (t, code) => { sent.push(code); } });
});
afterEach(async () => { await app.close(); await db.close(); });

async function login(target) {
  await app.inject({ method: 'POST', url: '/auth/code', payload: { target } });
  const r = await app.inject({ method: 'POST', url: '/auth/verify', payload: { target, code: sent.at(-1) } });
  return `${COOKIE}=${r.cookies.find((c) => c.name === COOKIE).value}`;
}
const stats = (cookie) => app.inject({ method: 'GET', url: '/owner/stats', headers: cookie ? { cookie } : {} });

describe('egasi paneli', () => {
  it('kirmagan — 401, oddiy foydalanuvchi — 403', async () => {
    expect((await stats()).statusCode).toBe(401);
    expect((await stats(await login('ali@mail.uz'))).statusCode).toBe(403);
  });
  it('egasi: foydalanuvchilar, to\'lovlar, tanga sarfi; pochta yashirin', async () => {
    await login('ali@mail.uz');
    const c = await login('boss@archemistry.uz');
    const { rows: [u] } = await db.query(`SELECT id FROM users WHERE email = 'ali@mail.uz'`);
    await db.query(`INSERT INTO orders (user_id, pack, coins, amount, provider, state, paid_at) VALUES ($1, 'p10', 10, 39000, 'multicard', 'paid', now()), ($1, 'p30', 30, 99000, 'multicard', 'new', null)`, [u.id]);
    const { rows: [o] } = await db.query(`SELECT id FROM orders WHERE state = 'paid'`);
    await db.query(`INSERT INTO multicard_tx (uuid, order_id, amount, ps) VALUES ('x', $1, 3900000, 'click')`, [o.id]);
    await db.query(`INSERT INTO ledger (user_id, delta, reason, ref) VALUES ($1, 10, 'payment', 'order:1'), ($1, -8, 'export', 'albom@h1')`, [u.id]);
    const r = await stats(c);
    expect(r.statusCode).toBe(200);
    const j = r.json();
    expect(j.users.total).toBe(2);
    expect(j.payments).toMatchObject({ paid: 1, revenue: 39000, buyers: 1, open: 1 });
    expect(j.payments.byPs).toEqual([{ ps: 'click', c: 1, s: 39000 }]);
    expect(j.coins).toMatchObject({ bought: 10, spent: 8 });
    expect(j.coins.spend30[0]).toMatchObject({ reason: 'export', item: 'albom', coins: 8 });
    expect(j.payments.recent[0].who).toBe('al•@mail.uz');
    expect(JSON.stringify(j)).not.toContain('ali@mail.uz');
  });
  const grant = (cookie, payload) => app.inject({ method: 'POST', url: '/owner/grant', headers: cookie ? { cookie } : {}, payload });
  it('sinov kirishi: faqat egasi; yangi pochtaga hisob ochiladi, tanga bir marta yoziladi va sotuvga qoʻshilmaydi', async () => {
    const body = { email: ' Francois@Mail.com ', coins: 1000, note: 'Sinov kirishi — 1 yil', key: 'k-12345678' };
    expect((await grant(null, body)).statusCode).toBe(401);
    expect((await grant(await login('ali@mail.uz'), body)).statusCode).toBe(403);
    const c = await login('boss@archemistry.uz');
    const r = await grant(c, body);
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ applied: true, balance: 1000, isNew: true, who: 'fr••••••@mail.com', coins: 1000 });
    expect((await grant(c, body)).json()).toMatchObject({ applied: false, balance: 1000, isNew: false }); // ikki marta bosilgan
    const fc = await login('francois@mail.com'); // keyin shu pochta bilan kiradi — tanga tayyor
    const me = (await app.inject({ method: 'GET', url: '/me', headers: { cookie: fc } })).json();
    expect(me.balance).toBe(1000);
    const hist = (await app.inject({ method: 'GET', url: '/me/history', headers: { cookie: fc } })).json().items;
    expect(hist[0]).toMatchObject({ delta: 1000, reason: 'promo' });
    const j = (await stats(c)).json();
    expect(j.payments).toMatchObject({ paid: 0, revenue: 0 });
    expect(j.coins).toMatchObject({ bought: 0, granted: 1000 });
    expect(j.coins.grants[0]).toMatchObject({ coins: 1000, note: 'Sinov kirishi — 1 yil', who: 'fr••••••@mail.com' });
    expect(JSON.stringify(j)).not.toContain('boss@archemistry.uz');
  });
  it('sinov kirishi: mavjud hisobga qoʻshiladi; notoʻgʻri miqdor, pochta va kalit — 400', async () => {
    await login('ali@mail.uz');
    const c = await login('boss@archemistry.uz');
    expect((await grant(c, { email: 'ali@mail.uz', coins: 50, key: 'k-aaaaaaaa' })).json()).toMatchObject({ applied: true, balance: 50, isNew: false });
    expect((await grant(c, { email: 'ali@mail.uz', coins: 25, key: 'k-bbbbbbbb' })).json().balance).toBe(75);
    for (const bad of [{ coins: 0 }, { coins: 5001 }, { coins: 1.5 }, { coins: '10' }, { email: '+998901234567' }, { email: 'yoq' }, { key: 'x' }])
      expect((await grant(c, { email: 'ali@mail.uz', coins: 10, key: 'k-cccccccc', ...bad })).statusCode).toBe(400);
    expect((await db.query(`SELECT count(*)::int AS c FROM users`)).rows[0].c).toBe(2);
  });
  it('roʻyxatdan oʻtganlar: toʻlov qilmaganlar ham; usul, balans, oxirgi kirish; hali kirmagan (sinov kirishi bilan ochilgan) — seen: null', async () => {
    await login('ali@mail.uz');
    await login('+998901234567');
    const c = await login('boss@archemistry.uz');
    await grant(c, { email: 'yangi@mail.com', coins: 40, key: 'k-dddddddd' });
    const p = (await stats(c)).json().people;
    expect(p.map((x) => x.who)).toEqual(['ya•••@mail.com', 'bo••@archemistry.uz', '+998•••••4567', 'al•@mail.uz']);
    expect(p[0]).toMatchObject({ method: 'email', balance: 40, seen: null });
    expect(p[2]).toMatchObject({ method: 'phone', balance: 0 });
    expect(p[3].seen).toBeTruthy(); expect(p[3].at).toBeTruthy();
  });
  it('maskPhone', () => { expect(maskPhone('+998901234567')).toBe('+998•••••4567'); expect(maskPhone(null)).toBeNull(); });
  it('maskEmail', () => { expect(maskEmail('iskandar@gmail.com')).toBe('is••••••@gmail.com'); expect(maskEmail(null)).toBeNull(); });
});
