import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { fromPglite, fromPool, migrate } from '../src/db.js';
import { buildApp, COOKIE } from '../src/app.js';
import { maskEmail } from '../src/owner.js';

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
  it('maskEmail', () => { expect(maskEmail('iskandar@gmail.com')).toBe('is••••••@gmail.com'); expect(maskEmail(null)).toBeNull(); });
});
