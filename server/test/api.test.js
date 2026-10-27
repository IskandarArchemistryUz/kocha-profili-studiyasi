import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { fromPglite, fromPool, migrate } from '../src/db.js';
import { buildApp, COOKIE } from '../src/app.js';
import { normalizeTarget } from '../src/auth.js';
import { priceOf, areaK } from '../src/prices.js';
import { weekKey } from '../src/wallet.js';

let db, app, sent, clock;
const H = 'a'.repeat(40);

beforeEach(async () => {
  // CI da haqiqiy PostgreSQL (TEST_DATABASE_URL) — qulflar (FOR UPDATE) haqiqatan tekshiriladi; aks holda PGlite
  if (process.env.TEST_DATABASE_URL) {
    db = fromPool(new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 5 }));
    await db.query('DROP TABLE IF EXISTS multicard_tx, kv, click_tx, payme_tx, orders, trials, exports, ledger, sessions, otp, users CASCADE');
  } else db = fromPglite(new PGlite());
  await migrate(db);
  sent = [];
  clock = new Date('2026-10-21T10:00:00Z'); // chorshanba
  app = await buildApp({
    db, pepper: 'p'.repeat(20), secret: 's'.repeat(40), secure: false,
    send: async (t, code) => { sent.push({ ...t, code }); }, origins: ['https://archemistry.uz'],
    owners: [' Boss@Mail.uz '], now: () => clock,
  });
});
afterEach(async () => { await app.close(); await db.close(); });

const post = (url, body, cookie) => app.inject({ method: 'POST', url, payload: body, headers: cookie ? { cookie } : {} });
const get = (url, cookie) => app.inject({ method: 'GET', url, headers: cookie ? { cookie } : {} });
async function login(target = 'ali@mail.uz') {
  await post('/auth/code', { target });
  const r = await post('/auth/verify', { target, code: sent.at(-1).code });
  expect(r.statusCode).toBe(200);
  const c = r.cookies.find((x) => x.name === COOKIE);
  return `${COOKIE}=${c.value}`;
}
const tick = (sec) => { clock = new Date(clock.getTime() + sec * 1000); };

describe('narx', () => {
  it('koeffitsiyent: ≤15 → 1, 15–60 → 1,5, >60 → 2', () => {
    expect([areaK(15), areaK(15.01), areaK(60), areaK(60.5)]).toEqual([1, 1.5, 1.5, 2]);
  });
  it('«Qoʻmitaga topshirish» 28 / 42 / 56 (narxlar sahifasi bilan bir xil)', () => {
    const kom = ['mr.album', 'mr.dxf', 'mr.tik', 'mr.norm'];
    expect([priceOf(kom, 10).coins, priceOf(kom, 30).coins, priceOf(kom, 80).coins]).toEqual([28, 42, 56]);
  });
  it('koeffitsiyent faqat MR fayllarga; takror bir marta', () => {
    expect(priceOf(['chz.album', 'mr.png', 'mr.png'], 80).coins).toBe(11);
    // katta uchastkani ochish: 10 tanga × maydon koeffitsiyenti
    expect(priceOf(['mr.site'], 4).coins).toBe(10);
    expect(priceOf(['mr.site'], 30).coins).toBe(15);
    expect(priceOf(['mr.site'], 80).coins).toBe(20);
    expect(priceOf(['mr.ifc', 'chz.album'], 80).coins).toBe(30);
  });
  it('nomaʼlum fayl — xato', () => { expect(() => priceOf(['x'])).toThrow(); });
});

describe('kirish', () => {
  it('raqam va pochtani bir xil koʻrinishga keltiradi', () => {
    expect(normalizeTarget('90 123-45-67').value).toBe('+998901234567');
    expect(normalizeTarget('+998 (90) 123 45 67').value).toBe('+998901234567');
    expect(normalizeTarget(' Ali@Mail.UZ ').value).toBe('ali@mail.uz');
    expect(() => normalizeTarget('12345')).toThrow();
  });
  it('kod → sessiya → /me; chiqish', async () => {
    const c = await login();
    const me = (await get('/me', c)).json();
    expect(me).toMatchObject({ email: 'ali@mail.uz', balance: 0, trialsLeft: 3, owner: false });
    await post('/auth/logout', {}, c);
    expect((await get('/me', c)).statusCode).toBe(401);
  });
  it('egasi pochtasi (OWNER_EMAILS) — /me da owner: true; telefon bilan kirgan — egasi emas', async () => {
    expect((await get('/me', await login('boss@mail.uz'))).json().owner).toBe(true);
    expect((await get('/me', await login('+998901234567'))).json().owner).toBe(false);
  });
  it('notoʻgʻri kod 5 martadan keyin bloklanadi', async () => {
    await post('/auth/code', { target: '+998901234567' });
    const good = sent.at(-1).code, bad = good === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) expect((await post('/auth/verify', { target: '+998901234567', code: bad })).statusCode).toBe(400);
    const r = await post('/auth/verify', { target: '+998901234567', code: good });
    expect(r.json().error).toBe('attempts');
  });
  it('eskirgan kod va qayta soʻrash oraligʻi', async () => {
    await post('/auth/code', { target: 'b@b.uz' });
    expect((await post('/auth/code', { target: 'b@b.uz' })).statusCode).toBe(429);
    tick(11 * 60);
    expect((await post('/auth/verify', { target: 'b@b.uz', code: sent.at(-1).code })).json().error).toBe('expired');
  });
  it('kod bazada ochiq saqlanmaydi', async () => {
    await post('/auth/code', { target: 'c@c.uz' });
    const { rows } = await db.query('SELECT code_hash FROM otp');
    expect(rows[0].code_hash).not.toContain(sent.at(-1).code);
    expect(rows[0].code_hash).toHaveLength(64);
  });
});

describe('hamyon va eksport', () => {
  it('tanga yetmasa 402, yetsa yechiladi; shu holatni qayta yuklash bepul', async () => {
    const c = await login();
    const body = { items: ['mr.album', 'mr.dxf', 'mr.tik', 'mr.norm'], areaHa: 30, stateHash: H };
    const r0 = await post('/export/ticket', body, c);
    expect(r0.statusCode).toBe(402);
    expect(r0.json()).toMatchObject({ error: 'insufficient', need: 42, balance: 0 });
    const uid = (await get('/me', c)).json().id;
    await app.wallet.credit(uid, 50, 'gift', 't1');
    const r1 = (await post('/export/ticket', body, c)).json();
    expect(r1).toMatchObject({ price: 42, charged: 42, balance: 8, repeat: false });
    const r2 = (await post('/export/ticket', { ...body, items: [...body.items].reverse() }, c)).json();
    expect(r2).toMatchObject({ charged: 0, balance: 8, repeat: true });
    const v = (await post('/export/verify', { ticket: r2.ticket })).json();
    expect(v).toMatchObject({ valid: true, stateHash: H });
  });
  it('soxta yoki eskirgan ruxsatnoma oʻtmaydi', async () => {
    const c = await login();
    const uid = (await get('/me', c)).json().id;
    await app.wallet.credit(uid, 5, 'gift', 't1');
    const { ticket } = (await post('/export/ticket', { items: ['mr.png'], stateHash: H }, c)).json();
    const [b] = ticket.split('.');
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(b, 'base64url')), i: ['mr.ifc'] })).toString('base64url') + '.' + ticket.split('.')[1];
    expect((await post('/export/verify', { ticket: forged })).json().valid).toBe(false);
    tick(16 * 60);
    expect((await post('/export/verify', { ticket })).json().valid).toBe(false);
  });
  it('bir vaqtdagi soʻrovlar balansni minusga tushirmaydi', async () => {
    const c = await login();
    const uid = (await get('/me', c)).json().id;
    await app.wallet.credit(uid, 10, 'gift', 't1');
    const rs = await Promise.all([1, 2, 3].map((i) => post('/export/ticket', { items: ['chz.album'], stateHash: String(i).repeat(16) }, c)));
    expect(rs.filter((r) => r.statusCode === 200)).toHaveLength(1);
    expect((await get('/me', c)).json().balance).toBe(0);
  });
  it('takroriy kirim (bir xil toʻlov xabari) bir marta yoziladi', async () => {
    const c = await login();
    const uid = (await get('/me', c)).json().id;
    expect((await app.wallet.credit(uid, 30, 'payme', 'tx-1')).applied).toBe(true);
    expect((await app.wallet.credit(uid, 30, 'payme', 'tx-1')).applied).toBe(false);
    expect((await get('/me', c)).json().balance).toBe(30);
  });
  it('kirishsiz ruxsatnoma berilmaydi', async () => {
    expect((await post('/export/ticket', { items: ['mr.png'], stateHash: H })).statusCode).toBe(401);
  });
});

describe('haftalik sinovlar', () => {
  it('hafta — Toshkent vaqti boʻyicha dushanbadan', () => {
    expect(weekKey(new Date('2026-10-18T18:59:00Z'))).toBe('2026-10-12'); // yakshanba 23:59 Toshkent
    expect(weekKey(new Date('2026-10-18T19:00:00Z'))).toBe('2026-10-19'); // dushanba 00:00 Toshkent
  });
  it('3 tasi bepul, 4-si narx boʻyicha, dushanba yangilanadi', async () => {
    const c = await login();
    const uid = (await get('/me', c)).json().id;
    for (let i = 0; i < 3; i++) expect((await post('/trial', { kind: 'flats' }, c)).json().free).toBe(true);
    expect((await post('/trial', { kind: 'flats' }, c)).statusCode).toBe(402);
    await app.wallet.credit(uid, 5, 'gift', 't1');
    expect((await post('/trial', { kind: 'wind' }, c)).json()).toMatchObject({ free: false, charged: 2, balance: 3 });
    clock = new Date('2026-10-26T01:00:00Z');
    expect((await get('/me', c)).json().trialsLeft).toBe(3);
  });
});
