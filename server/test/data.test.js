import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readdir, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { fromPglite, migrate } from '../src/db.js';
import { buildApp } from '../src/app.js';
import { makeCache } from '../src/data/cache.js';

let dir, db, app, calls, mode;
const Q = '[out:json][timeout:25];node(1);out;';
const fakeFetch = async (url) => {
  calls.push(url);
  if (mode === 'down' || (mode === 'first-down' && calls.length === 1)) return new Response('busy', { status: 429 });
  return new Response(JSON.stringify({ elements: [{ type: 'node', id: 1 }] }), { status: 200 });
};
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'kesh-')); calls = []; mode = 'ok';
  db = fromPglite(new PGlite()); await migrate(db);
  app = await buildApp({ db, pepper: 'p'.repeat(20), secret: 's'.repeat(40), secure: false, send: async () => {}, origins: ['https://archemistry.uz'],
    data: { cache: makeCache({ dir }), fetchImpl: fakeFetch, servers: ['https://a.test/api', 'https://b.test/api'] } });
});
afterEach(async () => { await app.close(); await db.close(); await rm(dir, { recursive: true, force: true }); });
const ov = (data) => app.inject({ method: 'POST', url: '/data/overpass', payload: `data=${encodeURIComponent(data)}`, headers: { 'content-type': 'application/x-www-form-urlencoded' } });

describe('/data — hudud ma’lumoti keshi', () => {
  it('Overpass: birinchi so‘rov tashqariga, ikkinchisi keshdan; manifestda manba va litsenziya', async () => {
    const r1 = await ov(Q);
    expect(r1.statusCode).toBe(200); expect(r1.headers['x-cache']).toBe('miss'); expect(r1.json().elements).toHaveLength(1);
    const r2 = await ov(Q);
    expect(r2.headers['x-cache']).toBe('hit'); expect(calls).toHaveLength(1);
    const meta = (await readdir(dir)).find((n) => n.endsWith('.meta.json'));
    const { readFile } = await import('node:fs/promises');
    const m = JSON.parse(await readFile(join(dir, meta), 'utf8'));
    expect(m).toMatchObject({ source: 'osm', licence: 'ODbL 1.0', attribution: '© OpenStreetMap contributors', odbl: true, server: 'a.test' });
  });
  it('birinchi server band bo‘lsa — keyingisi; hammasi yiqilsa — 502', async () => {
    mode = 'first-down';
    expect((await ov(Q)).statusCode).toBe(200); expect(calls).toEqual(['https://a.test/api', 'https://b.test/api']);
    mode = 'down';
    expect((await ov(Q + ' ')).statusCode).toBe(502);
  });
  it('faqat [out:json] so‘rovlari, hajmi cheklangan', async () => {
    expect((await ov('[out:xml];node(1);out;')).statusCode).toBe(400);
    expect((await ov('[out:json];' + 'x'.repeat(9000))).statusCode).toBe(400);
    expect(calls).toHaveLength(0);
  });
  it('manbalar reyestri', async () => {
    const r = await app.inject({ method: 'GET', url: '/data/sources' });
    const ids = r.json().sources.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(['osm', 'overture', 'worldcover', 'copdem', 'hrsl']));
  });
});

describe('kesh hajmi (LRU)', () => {
  it('chegaradan oshsa eng eski yozuvlar o‘chiriladi', async () => {
    const c = makeCache({ dir, maxBytes: 250 });
    for (let i = 0; i < 4; i++) { await c.put(`k${i}`, 'x'.repeat(100), { source: 'osm' }); const t = new Date(Date.now() - (10 - i) * 1000); await utimes(join(dir, `${c.hash(`k${i}`)}.json`), t, t); }
    const s = await c.sweep();
    expect(s.total).toBeLessThanOrEqual(250); expect(s.removed).toBe(2);
    expect(await c.get('k0')).toBeNull(); expect(await c.get('k3')).not.toBeNull();
  });
  it('eskirgan yozuv (TTL) qaytarilmaydi', async () => {
    let t = Date.parse('2026-10-24T00:00:00Z');
    const c = makeCache({ dir, now: () => t });
    await c.put('a', '{}', { source: 'osm' });
    expect(await c.get('a', 30)).not.toBeNull();
    t += 31 * 864e5; expect(await c.get('a', 30)).toBeNull();
  });
});

describe('/config/maps', () => {
  it('kalit .env dan beriladi, boʻlmasa null', async () => {
    const db2 = fromPglite(new PGlite()); await migrate(db2);
    const mk = (mapKeys) => buildApp({ db: db2, pepper: 'p'.repeat(20), secret: 's'.repeat(40), secure: false, send: async () => {}, origins: ['https://archemistry.uz'], mapKeys });
    const a = await mk({ arcgis: 'AAPTxyz' }); expect((await a.inject({ method: 'GET', url: '/config/maps' })).json()).toEqual({ arcgis: 'AAPTxyz' }); await a.close();
    const b = await mk(undefined); expect((await b.inject({ method: 'GET', url: '/config/maps' })).json()).toEqual({ arcgis: null }); await b.close();
    await db2.close();
  });
});
