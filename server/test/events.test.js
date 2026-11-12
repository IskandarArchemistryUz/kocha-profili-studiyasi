import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { fromPglite, fromPool, migrate } from '../src/db.js';
import { buildApp, COOKIE } from '../src/app.js';
import { parseBatch, pruneEvents } from '../src/events.js';

let db, app, sent;
beforeEach(async () => {
  if (process.env.TEST_DATABASE_URL) {
    db = fromPool(new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 5 }));
    await db.query('DROP TABLE IF EXISTS events, private_features, private_layers, project_spend, multicard_tx, kv, click_tx, payme_tx, orders, trials, exports, ledger, sessions, otp, users CASCADE');
  } else db = fromPglite(new PGlite());
  await migrate(db);
  sent = [];
  app = await buildApp({ db, pepper: 'p'.repeat(20), secret: 's'.repeat(40), secure: false, origins: [], owners: ['boss@archemistry.uz'],
    send: async (t, code) => { sent.push(code); } });
});
afterEach(async () => { await app.close(); await db.close(); });

async function login(target) {
  await app.inject({ method: 'POST', url: '/auth/code', payload: { target } });
  const r = await app.inject({ method: 'POST', url: '/auth/verify', payload: { target, code: sent.at(-1) } });
  return `${COOKIE}=${r.cookies.find((c) => c.name === COOKIE).value}`;
}
// brauzer sendBeacon — text/plain
const ev = (a, s, e, cookie, headers = {}) => app.inject({ method: 'POST', url: '/ev', payload: JSON.stringify({ a, s, e }),
  headers: { 'content-type': 'text/plain;charset=UTF-8', ...(cookie ? { cookie } : {}), ...headers } });
const usage = (cookie) => app.inject({ method: 'GET', url: '/owner/usage', headers: cookie ? { cookie } : {} });
const count = async () => Number((await db.query('SELECT count(*) AS c FROM events')).rows[0].c);

describe('foydalanish hodisalari', () => {
  it('anonim yoziladi (davlat bilan), kirgan boʻlsa user_id; egasi va notoʻgʻri paket — yozilmaydi; javob doim 204', async () => {
    expect((await ev('anonAAAA1', 'mr', [{ n: 'pv' }, { n: 'mr/step/uchastka', p: { k: 1, s: 'x<y>', bad: { z: 1 } } }], null, { 'cf-ipcountry': 'KZ' })).statusCode).toBe(204);
    const { rows } = await db.query('SELECT anon, user_id, svc, name, props, country FROM events ORDER BY id');
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ anon: 'anonAAAA1', user_id: null, svc: 'mr', name: 'mr/step/uchastka', country: 'KZ' });
    expect(rows[1].props).toEqual({ k: 1, s: 'xy' });
    const a = await login('ali@mail.uz');
    await ev('anonAAAA1', 'mr', [{ n: 'click/mr/kgo' }], a);
    expect(Number((await db.query(`SELECT user_id FROM events WHERE name = 'click/mr/kgo'`)).rows[0].user_id)).toBeGreaterThan(0);
    const o = await login('boss@archemistry.uz');
    await ev('anonBOSS1', 'mr', [{ n: 'pv' }], o);
    expect(await count()).toBe(3);
    expect((await ev('x', 'mr', [{ n: 'pv' }])).statusCode).toBe(204);           // qisqa anon
    await ev('anonAAAA1', 'MR!', [{ n: 'pv' }]);                                 // notoʻgʻri xizmat
    await ev('anonAAAA1', 'mr', [{ n: 'Bad Name <x>' }]);                         // notoʻgʻri nom
    const r = await app.inject({ method: 'POST', url: '/ev', payload: 'not json', headers: { 'content-type': 'text/plain' } });
    expect(r.statusCode).toBe(204);
    expect(await count()).toBe(3);
  });
  it('parseBatch: koʻpi bilan 50 hodisa, 8 props', () => {
    const b = parseBatch({ a: 'abcdefgh', s: 'joy', e: Array.from({ length: 70 }, () => ({ n: 'pv', p: Object.fromEntries(Array.from({ length: 12 }, (_, i) => ['k' + i, i])) })) });
    expect(b.rows).toHaveLength(50); expect(Object.keys(b.rows[0].props)).toHaveLength(8);
    expect(parseBatch('{bad')).toBeNull();
  });
  it('egasi: voronka (zanjir), xizmatlar, eng koʻp harakatlar, qaytish; begona — 403', async () => {
    const a = await login('ali@mail.uz');
    const { rows: [u] } = await db.query(`SELECT id FROM users WHERE email = 'ali@mail.uz'`);
    // 3 ta brauzer: biri hammasini qiladi, biri faqat 1-qadam, biri faqat ochadi; bittasi Joyshunosda
    await ev('anon00001', 'mr', [{ n: 'pv' }, { n: 'mr/step/uchastka' }]);
    await ev('anon00001', 'mr', [{ n: 'mr/step/parsel' }, { n: 'click/mr/kgo' }, { n: 'click/mr/kgo' }], a);
    await db.query(`INSERT INTO ledger (user_id, delta, reason, ref) VALUES ($1, 10, 'payment', 'o'), ($1, -2, 'export', 'akso@h')`, [u.id]);
    await ev('anon00002', 'mr', [{ n: 'pv' }, { n: 'mr/step/uchastka' }]);
    await ev('anon00003', 'mr', [{ n: 'pv' }]);
    await ev('anon00004', 'joy', [{ n: 'pv' }]);
    // bir haftadan keyin qaytgan: roʻyxatdan oʻtgan vaqtni 8 kun oldinga suramiz
    await db.query(`UPDATE users SET created_at = now() - interval '8 days' WHERE id = $1`, [u.id]);
    expect((await usage(a)).statusCode).toBe(403);
    const j = (await usage(await login('boss@archemistry.uz'))).json();
    expect(j.funnel.map((x) => x.c)).toEqual([3, 2, 1, 1, 1]);
    expect(j.services).toEqual([{ svc: 'mr', who: 3, c: 8 }, { svc: 'joy', who: 1, c: 1 }]);
    expect(j.top[0]).toMatchObject({ svc: 'mr', name: 'click/mr/kgo', c: 2, who: 1 });
    expect(j.top.find((x) => x.name === 'pv')).toBeUndefined();
    const coh = j.cohorts.find((x) => x.size >= 1 && x.w[1 - 1] === 1);
    expect(coh).toBeTruthy();
    expect(j.since).toBeTruthy();
  });
  it('pruneEvents: eskilari oʻchadi', async () => {
    await ev('anon00001', 'mr', [{ n: 'pv' }, { n: 'pv' }]);
    await db.query(`UPDATE events SET at = now() - interval '500 days' WHERE id = (SELECT min(id) FROM events)`);
    expect(await pruneEvents(db)).toBe(1);
    expect(await count()).toBe(1);
  });
});
