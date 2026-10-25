import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { zipSync, strToU8 } from 'fflate';
import { PGlite } from '@electric-sql/pglite';
import { fromPglite, migrate } from '../src/db.js';
import { buildApp } from '../src/app.js';
import { makeCache } from '../src/data/cache.js';
import { makeEra5, parseSeries, stationOf, snap } from '../src/data/era5.js';

/* Sun'iy qator: yil davomida soatlik, shamol asosan shimoli-sharqdan (u, v < 0 → «qayerdan» NE), 10 % tinch */
function csv() {
  const L = ['valid_time,u10,v10,t2m,latitude,longitude'];
  const t0 = Date.UTC(2023, 0, 1);
  for (let h = 0; h < 24 * 365; h++) {
    const t = new Date(t0 + h * 3600_000), m = t.getUTCMonth();
    const calm = h % 10 === 0, s = calm ? 0.2 : 3, u = -s * Math.SQRT1_2, v = -s * Math.SQRT1_2;
    L.push(`${t.toISOString().slice(0, 19).replace('T', ' ')},${u.toFixed(3)},${v.toFixed(3)},${(273.15 + m * 2).toFixed(2)},41.25,69.25`);
  }
  return L.join('\n');
}

describe('ERA5: qatordan shamol guli', () => {
  it('yoʻnalish «qayerdan», tinch ulushi, oylik harorat; zip ichidagi alohida fayllar birlashtiriladi', () => {
    const rows = parseSeries(strToU8(csv()));
    expect(rows).toHaveLength(8760);
    const s = stationOf(rows, 41.25, 69.25);
    expect(s.calm).toBeCloseTo(0.1, 2);
    const petals = s.rose.map(r => r.reduce((a, b) => a + b, 0));
    expect(petals.indexOf(Math.max(...petals))).toBe(2);   // 45° — shimoli-sharq (16 sektor)
    expect(s.rose[2][1]).toBeCloseTo(0.9, 2);                // 2–4 m/s oralig'i
    expect(s.monthT[0]).toBeCloseTo(0, 1); expect(s.monthT[11]).toBeCloseTo(22, 1);
    expect(s.mean).toBeGreaterThan(2.5); expect(s.p95).toBeCloseTo(3, 1);
    // zip: shamol va harorat alohida CSV larda
    const t = csv().split('\n'), wind = t.map(l => l.split(',').slice(0, 3).join(',')).join('\n'), temp = t.map(l => { const c = l.split(','); return [c[0], c[3]].join(','); }).join('\n');
    const z = zipSync({ 'a.csv': strToU8(wind), 'b.csv': strToU8(temp) });
    const s2 = stationOf(parseSeries(z), 41.25, 69.25);
    expect(s2.monthT[11]).toBeCloseTo(22, 1); expect(s2.calm).toBeCloseTo(0.1, 2);
    expect(snap(41.31)).toBe(41.25); expect(snap(69.28)).toBe(69.25);
  });
});

let calls, status, posted;
const fake = async (url, init = {}) => {
  calls.push(`${init.method ?? 'GET'} ${url}`);
  if (url.endsWith('/execution') && init.method === 'POST') {
    expect(init.headers['PRIVATE-TOKEN']).toBe('tok');
    posted.push(JSON.parse(init.body).inputs.location);
    return new Response(JSON.stringify({ jobID: 'j1', status: 'accepted' }), { status: 201 });
  }
  if (url.endsWith('/jobs/j1')) return new Response(JSON.stringify({ jobID: 'j1', status }), { status: 200 });
  if (url.endsWith('/jobs/j1/results')) return new Response(JSON.stringify({ asset: { value: { href: 'https://obj.test/f.csv', type: 'text/csv' } } }), { status: 200 });
  if (url === 'https://obj.test/f.csv') return new Response(csv(), { status: 200 });
  return new Response('?', { status: 404 });
};

describe('GET /data/wind (ERA5)', () => {
  let dir, db, app;
  beforeEach(async () => {
    calls = []; status = 'running'; posted = [];
    dir = await mkdtemp(join(tmpdir(), 'era-')); db = fromPglite(new PGlite()); await migrate(db);
    app = await buildApp({ db, pepper: 'p'.repeat(20), secret: 's'.repeat(40), secure: false, send: async () => {}, origins: ['https://archemistry.uz'],
      data: { cache: makeCache({ dir }), era5: makeEra5({ key: 'tok', fetchImpl: fake, base: 'https://cds.test/api' }) } });
  });
  afterEach(async () => { await app.close(); await db.close(); await rm(dir, { recursive: true, force: true }); });
  it('navbatda — 202, tayyor boʻlgach — shamol guli; ish bir marta yuboriladi; ikkinchi soʻrov keshdan', async () => {
    const r1 = await app.inject({ url: '/data/wind?lat=41.31&lon=69.28' });
    expect(r1.statusCode).toBe(202); expect(r1.json().status).toBe('pending');
    status = 'successful';
    const r2 = await app.inject({ url: '/data/wind?lat=41.30&lon=69.27' });   // xuddi shu 0,25° katak
    expect(r2.statusCode).toBe(200);
    const j = r2.json(); expect(j.source).toBe('era5'); expect(j.attribution).toContain('Copernicus');
    expect(j.station.rose).toHaveLength(16); expect(j.station.name).toBe('ERA5 41.25, 69.25');
    expect(posted).toEqual([{ latitude: 41.25, longitude: 69.25 }]);
    const n = calls.length;
    const r3 = await app.inject({ url: '/data/wind?lat=41.26&lon=69.26' });
    expect(r3.headers['x-cache']).toBe('hit'); expect(calls.length).toBe(n);
    expect((await app.inject({ url: '/data/wind?lat=x' })).statusCode).toBe(400);
  });
  it('kalit yoʻq — 503; ish yiqilsa — 502', async () => {
    const off = await buildApp({ db, pepper: 'p'.repeat(20), secret: 's'.repeat(40), secure: false, send: async () => {}, origins: ['https://archemistry.uz'], data: { cache: makeCache({ dir }), era5: makeEra5({ key: null }) } });
    expect((await off.inject({ url: '/data/wind?lat=41.3&lon=69.3' })).statusCode).toBe(503); await off.close();
    status = 'failed';
    expect((await app.inject({ url: '/data/wind?lat=48.85&lon=2.35' })).statusCode).toBe(502);
    expect(posted.at(-1)).toEqual({ latitude: 48.75, longitude: 2.25 });
  });
});
