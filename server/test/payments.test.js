import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { createHash } from 'node:crypto';
import { fromPglite, fromPool, migrate } from '../src/db.js';
import { buildApp, COOKIE } from '../src/app.js';
import { PAYME_TIMEOUT } from '../src/payments.js';

const PAYME = { merchantId: 'm123', key: 'payme-secret', test: true };
const CLICK = { serviceId: '777', merchantId: '555', secret: 'click-secret' };
let db, app, sent, clock;

beforeEach(async () => {
  if (process.env.TEST_DATABASE_URL) {
    db = fromPool(new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 5 }));
    await db.query('DROP TABLE IF EXISTS kv, click_tx, payme_tx, orders, trials, exports, ledger, sessions, otp, users CASCADE');
  } else db = fromPglite(new PGlite());
  await migrate(db);
  sent = []; clock = new Date('2026-10-21T10:00:00Z');
  app = await buildApp({ db, pepper: 'p'.repeat(20), secret: 's'.repeat(40), secure: false, origins: [], payme: PAYME, click: CLICK,
    returnUrl: 'https://archemistry.uz/app/', send: async (t, code) => { sent.push(code); }, now: () => clock });
});
afterEach(async () => { await app.close(); await db.close(); });

const post = (url, payload, headers = {}) => app.inject({ method: 'POST', url, payload, headers });
async function login(target = 'ali@mail.uz') {
  await post('/auth/code', { target });
  const r = await post('/auth/verify', { target, code: sent.at(-1) });
  return `${COOKIE}=${r.cookies.find((c) => c.name === COOKIE).value}`;
}
const me = async (cookie) => (await app.inject({ method: 'GET', url: '/me', headers: { cookie } })).json();
const auth = (key = PAYME.key) => ({ authorization: 'Basic ' + Buffer.from(`Paycom:${key}`).toString('base64') });
const rpc = async (method, params, key) => (await post('/pay/payme', { jsonrpc: '2.0', id: 1, method, params }, auth(key))).json();
const tick = (msAdd) => { clock = new Date(clock.getTime() + msAdd); };

async function order(cookie, pack = 'p30', provider = 'payme') {
  const r = await post('/pay/order', { pack, provider }, { cookie });
  expect(r.statusCode).toBe(200);
  return r.json();
}

describe('buyurtma', () => {
  it('kirmagan — 401; narx va tanga serverdan; toʻlov havolalari', async () => {
    expect((await post('/pay/order', { pack: 'p30', provider: 'payme' })).statusCode).toBe(401);
    const c = await login();
    const p = await order(c);
    expect(p).toMatchObject({ amount: 99000, coins: 30 });
    expect(p.url.startsWith('https://checkout.test.paycom.uz/')).toBe(true);
    expect(Buffer.from(p.url.split('/').pop(), 'base64').toString()).toBe(`m=m123;ac.order_id=${p.orderId};a=9900000;c=https://archemistry.uz/app/?tolov=${p.orderId}`);
    const k = await order(c, 'p10', 'click');
    const u = new URL(k.url);
    expect(u.origin + u.pathname).toBe('https://my.click.uz/services/pay');
    expect(Object.fromEntries(u.searchParams)).toMatchObject({ service_id: '777', merchant_id: '555', amount: '39000', transaction_param: String(k.orderId) });
    expect((await post('/pay/order', { pack: 'x', provider: 'payme' }, { cookie: c })).statusCode).toBe(400);
    expect((await app.inject({ method: 'GET', url: '/pay/config' })).json()).toMatchObject({ payme: true, click: true });
  });
});

describe('Payme Merchant API', () => {
  it('kalitsiz — -32504; nomaʼlum usul — -32601', async () => {
    expect((await rpc('CheckPerformTransaction', {}, 'notogri')).error.code).toBe(-32504);
    expect((await rpc('Nimadir', {})).error.code).toBe(-32601);
  });
  it('tekshiruv → yaratish → bajarish: tanga bir marta qoʻshiladi', async () => {
    const c = await login(), o = await order(c);
    const acc = { order_id: String(o.orderId) };
    expect((await rpc('CheckPerformTransaction', { amount: 100, account: acc })).error.code).toBe(-31001);
    expect((await rpc('CheckPerformTransaction', { amount: 9900000, account: { order_id: '99999' } })).error.code).toBe(-31050);
    expect((await rpc('CheckPerformTransaction', { amount: 9900000, account: acc })).result).toEqual({ allow: true });
    const cr = (await rpc('CreateTransaction', { id: 'pm1', time: clock.getTime(), amount: 9900000, account: acc })).result;
    expect(cr.state).toBe(1);
    expect((await rpc('CreateTransaction', { id: 'pm1', time: clock.getTime(), amount: 9900000, account: acc })).result.transaction).toBe(cr.transaction);
    expect((await rpc('CreateTransaction', { id: 'pm2', time: clock.getTime(), amount: 9900000, account: acc })).error.code).toBe(-31051);
    const pf = (await rpc('PerformTransaction', { id: 'pm1' })).result;
    expect(pf.state).toBe(2);
    expect((await rpc('PerformTransaction', { id: 'pm1' })).result.perform_time).toBe(pf.perform_time);
    expect((await me(c)).balance).toBe(30);
    expect((await rpc('CheckTransaction', { id: 'pm1' })).result).toMatchObject({ state: 2, transaction: cr.transaction });
    expect((await rpc('CheckPerformTransaction', { amount: 9900000, account: acc })).error.code).toBe(-31051);
    const st = (await rpc('GetStatement', { from: clock.getTime() - 1000, to: clock.getTime() + 1000 })).result.transactions;
    expect(st).toHaveLength(1); expect(st[0]).toMatchObject({ id: 'pm1', amount: 9900000, account: { order_id: String(o.orderId) }, state: 2 });
    const so = (await app.inject({ method: 'GET', url: `/pay/order/${o.orderId}`, headers: { cookie: c } })).json();
    expect(so).toMatchObject({ state: 'paid', balance: 30 });
  });
  it('bekor qilish: bajarilmagan → -1; bajarilgan, tanga ishlatilmagan → -2 va tanga qaytadi; ishlatilgan → -31007', async () => {
    const c = await login(), acc = (o) => ({ order_id: String(o.orderId) });
    const o1 = await order(c);
    await rpc('CreateTransaction', { id: 'a', time: clock.getTime(), amount: 9900000, account: acc(o1) });
    expect((await rpc('CancelTransaction', { id: 'a', reason: 3 })).result.state).toBe(-1);
    expect((await rpc('PerformTransaction', { id: 'a' })).error.code).toBe(-31008);
    const o2 = await order(c);
    await rpc('CreateTransaction', { id: 'b', time: clock.getTime(), amount: 9900000, account: acc(o2) });
    await rpc('PerformTransaction', { id: 'b' });
    expect((await rpc('CancelTransaction', { id: 'b', reason: 5 })).result.state).toBe(-2);
    expect((await me(c)).balance).toBe(0);
    const o3 = await order(c, 'p10');
    await rpc('CreateTransaction', { id: 'c', time: clock.getTime(), amount: 3900000, account: acc(o3) });
    await rpc('PerformTransaction', { id: 'c' });
    await post('/export/ticket', { items: ['mr.dxf'], areaHa: 5, stateHash: 'a'.repeat(32) }, { cookie: c });   // 8 tanga ishlatildi
    expect((await rpc('CancelTransaction', { id: 'c', reason: 5 })).error.code).toBe(-31007);
  });
  it('12 soatdan keyin bajarilmaydi', async () => {
    const c = await login(), o = await order(c);
    await rpc('CreateTransaction', { id: 't', time: clock.getTime(), amount: 9900000, account: { order_id: String(o.orderId) } });
    tick(PAYME_TIMEOUT + 1000);
    expect((await rpc('PerformTransaction', { id: 't' })).error.code).toBe(-31008);
    expect((await rpc('CheckTransaction', { id: 't' })).result).toMatchObject({ state: -1, reason: 4 });
  });
  it('ChangePassword: yangi kalit ishlaydi, eskisi — yoʻq', async () => {
    expect((await rpc('ChangePassword', { password: 'yangi-kalit' })).result).toEqual({ success: true });
    expect((await rpc('CheckTransaction', { id: 'x' })).error.code).toBe(-32504);
    expect((await rpc('CheckTransaction', { id: 'x' }, 'yangi-kalit')).error.code).toBe(-31003);
  });
});

describe('Click Shop API', () => {
  const sign = (r, action) => createHash('md5').update(`${r.click_trans_id}${r.service_id}${CLICK.secret}${r.merchant_trans_id}${action === 1 ? r.merchant_prepare_id : ''}${r.amount}${r.action}${r.sign_time}`).digest('hex');
  const form = (o) => new URLSearchParams(Object.entries(o).map(([k, v]) => [k, String(v)])).toString();
  const call = async (path, r) => (await app.inject({ method: 'POST', url: path, payload: form(r), headers: { 'content-type': 'application/x-www-form-urlencoded' } })).json();
  const req = (orderId, action, extra = {}) => { const r = { click_trans_id: 9001, service_id: CLICK.serviceId, click_paydoc_id: 1, merchant_trans_id: orderId, amount: '39000.00', action, error: 0, error_note: 'Success', sign_time: '2026-10-21 15:00:00', ...extra }; return { ...r, sign_string: sign(r, action) }; };

  it('prepare → complete: tanga qoʻshiladi, takror — -4', async () => {
    const c = await login(), o = await order(c, 'p10', 'click');
    const p = await call('/pay/click/prepare', req(o.orderId, 0));
    expect(p).toMatchObject({ error: 0, merchant_trans_id: String(o.orderId) });
    const cm = await call('/pay/click/complete', req(o.orderId, 1, { merchant_prepare_id: p.merchant_prepare_id }));
    expect(cm).toMatchObject({ error: 0, merchant_confirm_id: p.merchant_prepare_id });
    expect((await me(c)).balance).toBe(10);
    expect((await call('/pay/click/complete', req(o.orderId, 1, { merchant_prepare_id: p.merchant_prepare_id }))).error).toBe(-4);
    expect((await me(c)).balance).toBe(10);
  });
  it('xatolar: imzo -1, summa -2, buyurtma -5, tranzaksiya -6, Click xatosi -9', async () => {
    const c = await login(), o = await order(c, 'p10', 'click');
    expect((await call('/pay/click/prepare', { ...req(o.orderId, 0), sign_string: 'x' })).error).toBe(-1);
    expect((await call('/pay/click/prepare', req(o.orderId, 0, { amount: '100' }))).error).toBe(-2);
    expect((await call('/pay/click/prepare', req(424242, 0))).error).toBe(-5);
    expect((await call('/pay/click/complete', req(o.orderId, 1, { merchant_prepare_id: 777 }))).error).toBe(-6);
    const p = await call('/pay/click/prepare', req(o.orderId, 0));
    expect((await call('/pay/click/complete', req(o.orderId, 1, { merchant_prepare_id: p.merchant_prepare_id, error: -5017 }))).error).toBe(-9);
    expect((await me(c)).balance).toBe(0);
    expect((await call('/pay/click/prepare', { click_trans_id: 1 })).error).toBe(-8);
  });
});
