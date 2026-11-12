import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { fromPglite, migrate } from '../src/db.js';
import { buildApp } from '../src/app.js';
import { makeCache } from '../src/data/cache.js';
import { makeEra5 } from '../src/data/era5.js';
import { makePower, parsePower, snapP } from '../src/data/power.js';

/* Sun'iy POWER javobi: bir yil soatlik, shamol shimoli-sharqdan (45°) 3 m/s, har 10-soat tinch; harorat oy × 2 °C; −999 — bo'sh */
function powerJson(y) {
  const WS = {}, WD = {}, T = {};
  const t0 = Date.UTC(y, 0, 1);
  for (let h = 0; h < 24 * 365; h++) {
    const d = new Date(t0 + h * 3600_000), k = d.toISOString().slice(0, 13).replace(/[-T]/g, '');
    WS[k] = h % 10 === 0 ? 0.2 : 3; WD[k] = 45; T[k] = d.getUTCMonth() * 2;
  }
  WS['9999999999'] = 1;
  return { type: 'Feature', geometry: { type: 'Point', coordinates: [69.5, 41.5, 400] }, header: { fill_value: -999 }, properties: { parameter: { WS10M: WS, WD10M: WD, T2M: T } } };
}

describe('NASA POWER: javobdan shamol guli', () => {
  it('«qayerdan» yoʻnalish, tinch ulushi, oylik harorat; −999 tashlanadi', () => {
    const j = powerJson(2023); const k0 = Object.keys(j.properties.parameter.WS10M)[1]; j.properties.parameter.WS10M[k0] = -999;
    const rows = parsePower(j);
    expect(rows).toHaveLength(8760);
    expect(rows[1].u).toBeNull();
    expect(Math.atan2(-rows[2].u, -rows[2].v) * 180 / Math.PI).toBeCloseTo(45, 6);
    expect(rows[0].tk).toBeCloseTo(273.15, 6);
    expect(snapP(41.31)).toBe(41.5); expect(snapP(69.2)).toBe(69);
    expect(() => parsePower({ properties: { parameter: {} } })).toThrow();
  });
});

let calls, failYear, slow;
const fake = async (url) => {
  calls.push(url);
  const u = new URL(url), y = +u.searchParams.get('start').slice(0, 4);
  if (slow) await new Promise((ok) => setTimeout(ok, 60));
  if (y === failYear) return new Response('{"messages":["x"]}', { status: 500 });
  return new Response(JSON.stringify(powerJson(y)), { status: 200 });
};
const base = (data) => ({ pepper: 'p'.repeat(20), secret: 's'.repeat(40), secure: false, send: async () => {}, origins: ['https://archemistry.uz'], data });

describe('GET /data/wind (NASA POWER — ERA5 kaliti yoʻq)', () => {
  let dir, db;
  beforeEach(async () => { calls = []; failYear = 0; slow = false; dir = await mkdtemp(join(tmpdir(), 'pw-')); db = fromPglite(new PGlite()); await migrate(db); });
  afterEach(async () => { await db.close(); await rm(dir, { recursive: true, force: true }); });

  it('kalitsiz — POWER: 10 yil (har yil alohida soʻrov), atributsiya NASA; ikkinchi soʻrov keshdan', async () => {
    const app = await buildApp({ db, ...base({ cache: makeCache({ dir }), era5: makeEra5({ key: null }), power: makePower({ fetchImpl: fake, base: 'https://power.test/api' }) }) });
    const r = await app.inject({ url: '/data/wind?lat=41.31&lon=69.28' });
    expect(r.statusCode).toBe(200);
    const j = r.json(); expect(j.source).toBe('power'); expect(j.attribution).toContain('NASA Langley');
    expect(j.station.rose).toHaveLength(16); expect(j.station.name).toBe('NASA POWER 41.50, 69.50');
    const petals = j.station.rose.map((x) => x.reduce((a, b) => a + b, 0));
    expect(petals.indexOf(Math.max(...petals))).toBe(2);
    expect(j.station.calm).toBeCloseTo(0.1, 2); expect(j.station.monthT[11]).toBeCloseTo(22, 1);
    expect(calls).toHaveLength(10);
    expect(calls[0]).toContain('latitude=41.5'); expect(calls[0]).toContain('start=20150101'); expect(calls[9]).toContain('end=20241231');
    expect(calls[0]).not.toMatch(/key|token/i);
    const r2 = await app.inject({ url: '/data/wind?lat=41.4&lon=69.4' });   // xuddi shu 0,5° katak
    expect(r2.headers['x-cache']).toBe('hit'); expect(calls).toHaveLength(10);
    failYear = 2019;
    expect((await app.inject({ url: '/data/wind?lat=10&lon=10' })).statusCode).toBe(502);
    await app.close();
  });

  it('uzoq davom etsa — 202 (ish davom etadi), keyin keshdan; ERA5 yiqilsa — POWER', async () => {
    slow = true;
    const app = await buildApp({ db, ...base({ cache: makeCache({ dir }), era5: makeEra5({ key: null }), power: makePower({ fetchImpl: fake, base: 'https://power.test/api' }), powerWaitMs: 100 }) });
    const r1 = await app.inject({ url: '/data/wind?lat=48.85&lon=2.35' });
    expect(r1.statusCode).toBe(202); expect(r1.json().source).toBe('power');
    // fondagi ish tugashini kutamiz (sekin CI da 1,2 s yetmay qolardi) — keshga tushguncha, koʻpi bilan 6 s
    let r2;
    for (let t = 0; t < 30; t++) {
      await new Promise((ok) => setTimeout(ok, 200));
      r2 = await app.inject({ url: '/data/wind?lat=48.85&lon=2.35' });
      if (r2.headers['x-cache'] === 'hit') break;
    }
    expect(r2.statusCode).toBe(200); expect(r2.headers['x-cache']).toBe('hit'); expect(calls).toHaveLength(10);
    await app.close();
    // ERA5 bor, lekin Copernicus 500 — POWER
    slow = false; calls = [];
    const bad = async (url, init) => (String(url).includes('cds.test') ? new Response('x', { status: 500 }) : fake(url, init));
    const app2 = await buildApp({ db, ...base({ cache: makeCache({ dir }), era5: makeEra5({ key: 'tok', fetchImpl: bad, base: 'https://cds.test/api' }), power: makePower({ fetchImpl: fake, base: 'https://power.test/api' }) }) });
    const r3 = await app2.inject({ url: '/data/wind?lat=-33.9&lon=18.4' });
    expect(r3.statusCode).toBe(200); expect(r3.json().source).toBe('power');
    await app2.close();
  });
});
