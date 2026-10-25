import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ByteWriter, parquetWrite } from 'hyparquet-writer';
import { PGlite } from '@electric-sql/pglite';
import { fromPglite, migrate } from '../src/db.js';
import { buildApp } from '../src/app.js';
import { makeCache } from '../src/data/cache.js';
import { makeOverture, polysOf, groupBox } from '../src/data/overture.js';
import { parquetMetadata } from 'hyparquet';

/* Soxta Overture: STAC katalog → kolleksiya → 2 ta item (fayl) → GeoParquet (bbox struct, 2 qatorli guruhlar) */
const sq = (x, y, d = 0.0002) => ({ type: 'Polygon', coordinates: [[[x, y], [x + d, y], [x + d, y + d], [x, y + d], [x, y]]] });
function pq(x0, n, step) {
  const geoms = [], bbox = [], id = [], height = [], num_floors = [];
  for (let i = 0; i < n; i++) { const x = x0 + i * step, y = 41.31; geoms.push(sq(x, y)); bbox.push({ xmin: x, xmax: x + 0.0002, ymin: y, ymax: y + 0.0002 }); id.push(`b${x0}-${i}`); height.push(i % 2 ? 12.5 : null); num_floors.push(i % 3 ? null : 4); }
  const w = new ByteWriter();
  parquetWrite({ writer: w, rowGroupSize: 2, columnData: [{ name: 'id', data: id }, { name: 'geometry', data: geoms }, { name: 'height', data: height }, { name: 'num_floors', data: num_floors }, { name: 'bbox', data: bbox }],
    schema: [{ name: 'root', num_children: 5 }, { name: 'id', type: 'BYTE_ARRAY', converted_type: 'UTF8', repetition_type: 'OPTIONAL' }, { name: 'geometry', type: 'BYTE_ARRAY', logical_type: { type: 'GEOMETRY' }, repetition_type: 'OPTIONAL' },
      { name: 'height', type: 'DOUBLE', repetition_type: 'OPTIONAL' }, { name: 'num_floors', type: 'INT32', repetition_type: 'OPTIONAL' }, { name: 'bbox', repetition_type: 'OPTIONAL', num_children: 4 },
      { name: 'xmin', type: 'FLOAT', repetition_type: 'OPTIONAL' }, { name: 'xmax', type: 'FLOAT', repetition_type: 'OPTIONAL' }, { name: 'ymin', type: 'FLOAT', repetition_type: 'OPTIONAL' }, { name: 'ymax', type: 'FLOAT', repetition_type: 'OPTIONAL' }] });
  return new Uint8Array(w.getBuffer());
}
const S3 = 'https://overturemaps-us-west-2.s3.us-west-2.amazonaws.com/release/2026-10-21.0/theme=buildings/type=building/';
const files = { [`${S3}part-0.parquet`]: pq(69.27, 8, 0.002), [`${S3}part-1.parquet`]: pq(10.0, 4, 0.01) };
let calls, ranges;
const json = (o) => new Response(JSON.stringify(o), { status: 200, headers: { 'content-type': 'application/json' } });
const fakeFetch = async (url, init = {}) => {
  calls.push(url);
  if (url === 'https://stac.test/catalog.json') return json({ latest: '2026-10-21.0' });
  if (url === 'https://stac.test/2026-10-21.0/buildings/building/collection.json') return json({ links: [{ rel: 'item', href: './00000/00000.json' }, { rel: 'item', href: './00001/00001.json' }, { rel: 'parent', href: '../catalog.json' }] });
  if (url.endsWith('/00000/00000.json')) return json({ bbox: [69.2, 41.2, 69.4, 41.4], assets: { azure: { href: 'https://overturemapswestus2.blob.core.windows.net/x.parquet' }, aws: { href: `${S3}part-0.parquet` } } });
  if (url.endsWith('/00001/00001.json')) return json({ bbox: [9.9, 41.2, 10.1, 41.4], assets: { aws: { href: `${S3}part-1.parquet` } } });
  const f = files[url];
  if (f) {
    if (init.method === 'HEAD') return new Response(null, { status: 200, headers: { 'Content-Length': String(f.byteLength) } });
    const h = new Headers(init.headers), m = /bytes=(\d+)-(\d*)/.exec(h.get('Range') ?? '');
    if (m) { ranges.push(url); const a = +m[1], b = m[2] ? +m[2] + 1 : f.byteLength; return new Response(f.slice(a, b), { status: 206, headers: { 'Content-Length': String(b - a) } }); }
    return new Response(f, { status: 200 });
  }
  return new Response('yoʻq', { status: 404 });
};

describe('Overture binolari (GeoParquet, STAC)', () => {
  beforeEach(() => { calls = []; ranges = []; });
  it('geometriya va statistikasi: halqalar 6 xona, oxirgi nuqta takrorlanmaydi; guruh bbox', () => {
    expect(polysOf(sq(1, 2))[0][0]).toHaveLength(4);
    expect(polysOf({ type: 'MultiPolygon', coordinates: [sq(1, 2).coordinates, sq(3, 4).coordinates] })).toHaveLength(2);
    expect(polysOf({ type: 'Point', coordinates: [1, 2] })).toEqual([]);
    const md = parquetMetadata(files[`${S3}part-0.parquet`].buffer);
    expect(md.row_groups).toHaveLength(4);
    const gb = groupBox(md.row_groups[1]); expect(gb[0]).toBeCloseTo(69.274, 3); expect(gb[2]).toBeCloseTo(69.2762, 3);
  });
  it('bbox: faqat kesishgan fayl va qator guruhlari; balandlik va qavat', async () => {
    const ov = makeOverture({ fetchImpl: fakeFetch, stac: 'https://stac.test' });
    // 69.2735…69.2765 — 1-guruhdagi ikki bino (69.274, 69.276)
    const r = await ov.buildings([69.2735, 41.30, 69.2765, 41.32]);
    expect(r.release).toBe('2026-10-21.0');
    expect(r.buildings).toHaveLength(2);
    expect(r.buildings.map(b => b.h)).toEqual([null, 12.5]);
    expect(r.buildings[0].rings[0]).toHaveLength(4);
    expect(ranges.every(u => u.endsWith('part-0.parquet'))).toBe(true);   // Yevropadagi fayl o'qilmaydi
    // ikkinchi so'rov — reliz va fayllar ro'yxati qayta so'ralmaydi
    const n = calls.filter(u => u.includes('stac.test')).length;
    await ov.buildings([69.2775, 41.30, 69.2805, 41.32]);
    expect(calls.filter(u => u.includes('stac.test')).length).toBe(n);
  });
});

describe('GET /data/overture/buildings', () => {
  let dir, db, app;
  beforeEach(async () => {
    calls = []; ranges = [];
    dir = await mkdtemp(join(tmpdir(), 'ov-')); db = fromPglite(new PGlite()); await migrate(db);
    app = await buildApp({ db, pepper: 'p'.repeat(20), secret: 's'.repeat(40), secure: false, send: async () => {}, origins: ['https://archemistry.uz'],
      data: { cache: makeCache({ dir }), fetchImpl: fakeFetch, overture: makeOverture({ fetchImpl: fakeFetch, stac: 'https://stac.test' }) } });
  });
  afterEach(async () => { await app.close(); await db.close(); await rm(dir, { recursive: true, force: true }); });
  it('javob, atributsiya, kesh; notoʻgʻri yoki katta bbox — 400', async () => {
    const r1 = await app.inject({ url: '/data/overture/buildings?bbox=69.2735,41.30,69.2765,41.32' });
    expect(r1.statusCode).toBe(200); expect(r1.headers['x-cache']).toBe('miss');
    const j = r1.json(); expect(j.buildings).toHaveLength(2); expect(j.attribution).toContain('Overture Maps Foundation'); expect(j.release).toBe('2026-10-21.0');
    const n = calls.length;
    const r2 = await app.inject({ url: '/data/overture/buildings?bbox=69.2735,41.30,69.2765,41.32' });
    expect(r2.headers['x-cache']).toBe('hit'); expect(calls.length).toBe(n);
    expect((await app.inject({ url: '/data/overture/buildings?bbox=1,2,3' })).statusCode).toBe(400);
    expect((await app.inject({ url: '/data/overture/buildings?bbox=69,41,69.5,41.5' })).statusCode).toBe(400);
  });
  it('Overture ishlamasa — 502', async () => {
    const bad = await buildApp({ db, pepper: 'p'.repeat(20), secret: 's'.repeat(40), secure: false, send: async () => {}, origins: ['https://archemistry.uz'],
      data: { cache: makeCache({ dir }), fetchImpl: fakeFetch, overture: makeOverture({ fetchImpl: async () => new Response('x', { status: 503 }), stac: 'https://stac.test' }) } });
    expect((await bad.inject({ url: '/data/overture/buildings?bbox=69.2735,41.30,69.2765,41.32' })).statusCode).toBe(502);
    await bad.close();
  });
});
