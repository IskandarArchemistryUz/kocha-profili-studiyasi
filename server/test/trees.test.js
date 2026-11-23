import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { fromPglite, migrate } from '../src/db.js';
import { buildApp } from '../src/app.js';
import { makeCache } from '../src/data/cache.js';

/** /data/trees — Toshkent daraxtlar reyestri (Bogʻshunos, 23.11.2026): shaxsga oid maydonlar soʻralmaydi va javobga chiqmaydi */
let dir, db, app, calls, mode;
const fakeFetch = async (url) => {
  calls.push(String(url));
  if (mode === 'down') return new Response('x', { status: 500 });
  return new Response(JSON.stringify({ features: [
    { geometry: { coordinates: [69.2801234, 41.3112345] }, properties: { name_oz: 'Chinor', dbh_cm: 52, crowndiameter_m: 9, height_m: 18, is_verified: true, volunteer_id: 77, dendrologist_id: 5 } },
    { geometry: null, properties: {} },
  ] }), { status: 200 });
};
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'trees-')); calls = []; mode = 'ok';
  db = fromPglite(new PGlite()); await migrate(db);
  app = await buildApp({ db, pepper: 'p'.repeat(20), secret: 's'.repeat(40), secure: false, send: async () => {}, origins: ['https://archemistry.uz'],
    data: { cache: makeCache({ dir }), fetchImpl: fakeFetch, servers: ['https://a.test/api'] } });
});
afterEach(async () => { await app.close(); await db.close(); await rm(dir, { recursive: true, force: true }); });
const get = (bbox) => app.inject({ method: 'GET', url: `/data/trees?bbox=${bbox}` });

describe('/data/trees', () => {
  it('faqat ruxsat etilgan maydonlar; ikkinchi soʻrov keshdan; manba atributsiyasi', async () => {
    const r1 = await get('69.27,41.30,69.285,41.315');
    expect(r1.statusCode).toBe(200); expect(r1.headers['x-cache']).toBe('miss');
    const j = r1.json();
    expect(j.trees).toEqual([[69.280123, 41.311234, 'Chinor', 52, 9, 18, 1]]);
    expect(JSON.stringify(j)).not.toMatch(/volunteer|dendrologist/);
    expect(j.attribution).toMatch(/green\.tashkent\.uz/);
    expect(calls[0]).not.toMatch(/volunteer|dendrologist/);
    expect(calls[0]).toMatch(/propertyName=dbh_cm/);
    const r2 = await get('69.27,41.30,69.285,41.315');
    expect(r2.headers['x-cache']).toBe('hit'); expect(calls).toHaveLength(1);
  });
  it('notoʻgʻri yoki katta bbox, Toshkentdan tashqari — 400; manba yiqilsa — 502', async () => {
    expect((await get('a,b')).statusCode).toBe(400);
    expect((await get('69.2,41.3,69.3,41.4')).statusCode).toBe(400);
    expect((await get('70,41.3,70.01,41.31')).statusCode).toBe(400);
    mode = 'down'; expect((await get('69.27,41.30,69.28,41.31')).statusCode).toBe(502);
  });
  it('/data/sources roʻyxatida «trees» bor', async () => {
    const ids = (await app.inject({ method: 'GET', url: '/data/sources' })).json().sources.map((s) => s.id);
    expect(ids).toContain('trees');
  });
});
