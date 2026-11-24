import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { fromPglite, migrate } from '../src/db.js';
import { buildApp } from '../src/app.js';
import { makeCache } from '../src/data/cache.js';

let dir, db, app, calls, mode, t;
const BIN = Buffer.from([0, 1, 2, 250, 251, 252, 253, 254, 255]);
const fakeFetch = async (url) => {
  calls.push(String(url));
  if (mode === 'down') return new Response('x', { status: 503 });
  if (String(url).endsWith('yoq.json')) return new Response('Not Found', { status: 404 });
  if (String(url).endsWith('.json')) return new Response(JSON.stringify({ v: mode === 'v2' ? 2 : 1 }), { status: 200 });
  return new Response(BIN, { status: 200 });
};
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'fayl-')); calls = []; mode = 'ok'; t = Date.parse('2026-11-24T10:00:00Z');
  db = fromPglite(new PGlite()); await migrate(db);
  app = await buildApp({ db, pepper: 'p'.repeat(20), secret: 's'.repeat(40), secure: false, send: async () => {}, origins: ['https://archemistry.uz'],
    data: { cache: makeCache({ dir: join(dir, 'kesh') }), fetchImpl: fakeFetch, files: { dir: join(dir, 'fayl'), now: () => t } } });
});
afterEach(async () => { await app.close(); await db.close(); await rm(dir, { recursive: true, force: true }); });
const get = (p) => app.inject({ method: 'GET', url: `/data/file/${p}`, headers: { origin: 'https://archemistry.uz' } });

describe('/data/file — tayyor maʼlumot fayllari nusxasi', () => {
  it('birinchi soʻrov manbadan, ikkinchisi diskdan; JSON va ikkilik fayl oʻzgarishsiz', async () => {
    const a = await get('narx/toshkent_hex.json');
    expect(a.statusCode).toBe(200); expect(a.headers['x-cache']).toBe('miss'); expect(a.json()).toEqual({ v: 1 });
    expect(a.headers['content-type']).toMatch(/application\/json/); expect(a.headers['access-control-allow-origin']).toBe('https://archemistry.uz');
    expect(calls).toEqual(['https://raw.githubusercontent.com/IskandarArchemistryUz/kocha-profili-studiyasi/narx-monitoring/data/narx/toshkent_hex.json']);
    const b = await get('narx/toshkent_hex.json');
    expect(b.headers['x-cache']).toBe('hit'); expect(calls).toHaveLength(1);
    const c = await get('kadastr/toshkent_50m.bin.gz');
    expect(c.statusCode).toBe(200); expect(c.headers['content-type']).toBe('application/octet-stream'); expect(c.headers['content-encoding']).toBeUndefined();
    expect(Buffer.compare(c.rawPayload, BIN)).toBe(0);
    const d = await get('lst/toshkent_2026.bin');
    expect(Buffer.compare(d.rawPayload, BIN)).toBe(0); expect(calls[2]).toMatch(/\/lst-data\/data\/lst\/toshkent_2026\.bin$/);
    expect((await readdir(join(dir, 'fayl'))).sort()).toEqual(['kadastr', 'lst', 'narx']);
  });
  it('muddati oʻtsa yangilanadi; manba yiqilsa — eski nusxa (stale), manbaga qayta-qayta borilmaydi', async () => {
    await get('lst/toshkent_index.json');
    t += 25 * 3600e3; mode = 'v2';
    const a = await get('lst/toshkent_index.json'); expect(a.headers['x-cache']).toBe('miss'); expect(a.json()).toEqual({ v: 2 });
    t += 25 * 3600e3; mode = 'down';
    const b = await get('lst/toshkent_index.json'); expect(b.statusCode).toBe(200); expect(b.headers['x-cache']).toBe('stale'); expect(b.json()).toEqual({ v: 2 });
    const n = calls.length; await get('lst/toshkent_index.json'); expect(calls).toHaveLength(n);
    t += 11 * 60e3; await get('lst/toshkent_index.json'); expect(calls).toHaveLength(n + 1);
  });
  it('faqat roʻyxatdagi toʻplam va nom andozasi; manbada yoʻq fayl — 404 va qayta soʻralmaydi; nusxasiz yiqilish — 502', async () => {
    for (const p of ['boshqa/a.json', 'narx/a.txt', 'narx/..%2F..%2Fpackage.json', 'lst/A.bin', 'kadastr/a.bin', 'narx/a.bin', '__proto__/a.json'])
      expect((await get(p)).statusCode, p).toBe(404);
    expect(calls).toHaveLength(0);
    expect((await get('narx/yoq.json')).statusCode).toBe(404); expect((await get('narx/yoq.json')).statusCode).toBe(404); expect(calls).toHaveLength(1);
    mode = 'down'; expect((await get('narx/toshkent_hex.json')).statusCode).toBe(502);
  });
});
