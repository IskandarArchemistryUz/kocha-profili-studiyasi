import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { fromPglite, fromPool, migrate } from '../src/db.js';
import { buildApp, COOKIE } from '../src/app.js';
import { cleanGeom, cleanProps } from '../src/private.js';

let db, app, sent;
beforeEach(async () => {
  if (process.env.TEST_DATABASE_URL) {
    db = fromPool(new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 5 }));
    await db.query('DROP TABLE IF EXISTS private_features, private_layers, project_spend, multicard_tx, kv, click_tx, payme_tx, orders, trials, exports, ledger, sessions, otp, users CASCADE');
  } else db = fromPglite(new PGlite());
  await migrate(db);
  sent = [];
  app = await buildApp({ db, pepper: 'p'.repeat(20), secret: 's'.repeat(40), secure: false, origins: [], owners: ['boss@archemistry.uz'], send: async (t, code) => { sent.push(code); } });
});
afterEach(async () => { await app.close(); await db.close(); });

async function login(target) {
  await app.inject({ method: 'POST', url: '/auth/code', payload: { target } });
  const r = await app.inject({ method: 'POST', url: '/auth/verify', payload: { target, code: sent.at(-1) } });
  return `${COOKIE}=${r.cookies.find((c) => c.name === COOKIE).value}`;
}
const sq = (x, y, d = 0.0002) => ({ type: 'Polygon', coordinates: [[[x, y], [x + d, y], [x + d, y + d], [x, y + d], [x, y]]] });
const feat = (x, y, p) => ({ type: 'Feature', properties: p, geometry: sq(x, y) });

describe('shaxsiy qatlam', () => {
  it('geometriya va xususiyatlar tozalanadi: shaxsga oid maydon tushmaydi, proyeksiyalangan koordinata rad etiladi', () => {
    expect(cleanProps({ qavat: '9', xonadon: 102, yil: 2018, devor: 'g‘isht', SUBYEKT: 'Aliyev', STIR: 123, kadastr: '10:01' })).toEqual({ qavat: 9, xonadon: 102, yil: 2018, devor: 'g‘isht' });
    expect(cleanProps({ qavat: -3, yil: 1200 })).toEqual({});
    expect(cleanGeom(sq(69.28, 41.31))).toMatchObject({ bbox: [69.28, 41.31, expect.any(Number), expect.any(Number)] });
    expect(cleanGeom({ type: 'Polygon', coordinates: [[[350000, 4570000], [350010, 4570000], [350010, 4570010], [350000, 4570000]]] })).toBeNull();
    expect(cleanGeom({ type: 'Point', coordinates: [69, 41] })).toBeNull();
  });
  it('faqat egasi; maʼlumot faqat yuklagan hisobga koʻrinadi', async () => {
    const u = await login('ali@mail.uz');
    expect((await app.inject({ method: 'GET', url: '/private/layers' })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: '/private/layers', headers: { cookie: u } })).statusCode).toBe(403);
    const o = await login('boss@archemistry.uz');
    const c = await app.inject({ method: 'POST', url: '/private/layers', headers: { cookie: o }, payload: { name: 'Koʻp kvartirali uylar', source: 'Toshkent sh. GIS, 2023' } });
    expect(c.statusCode).toBe(200);
    const id = c.json().id;
    const a = await app.inject({ method: 'POST', url: `/private/layers/${id}/features`, headers: { cookie: o }, payload: { features: [feat(69.28, 41.31, { qavat: 9, xonadon: 102, STIR: '1' }), feat(69.5, 41.5, { qavat: 4 }), { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [69, 41] } }] } });
    expect(a.json()).toEqual({ added: 2, skipped: 1 });
    const f = await app.inject({ method: 'GET', url: '/private/features?bbox=69.27,41.30,69.29,41.32', headers: { cookie: o } });
    expect(f.statusCode).toBe(200);
    const j = f.json();
    expect(j.layers).toEqual([{ id, name: 'Koʻp kvartirali uylar', source: 'Toshkent sh. GIS, 2023' }]);
    expect(j.features).toHaveLength(1);
    expect(j.features[0].p).toEqual({ qavat: 9, xonadon: 102 });
    expect(JSON.stringify(j)).not.toContain('STIR');
    expect((await app.inject({ method: 'GET', url: '/private/features?bbox=69,41,70,42', headers: { cookie: o } })).statusCode).toBe(400);   // juda katta bbox
    const l = (await app.inject({ method: 'GET', url: '/private/layers', headers: { cookie: o } })).json();
    expect(l.layers[0]).toMatchObject({ id, n: 2 });
    expect((await app.inject({ method: 'POST', url: `/private/layers/${id}/delete`, headers: { cookie: o } })).json()).toEqual({ ok: true });
    expect((await app.inject({ method: 'GET', url: '/private/features?bbox=69.27,41.30,69.29,41.32', headers: { cookie: o } })).json().features).toHaveLength(0);
    expect((await app.inject({ method: 'POST', url: `/private/layers/${id}/delete`, headers: { cookie: o } })).statusCode).toBe(404);
  });
});
