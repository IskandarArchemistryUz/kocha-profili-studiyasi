/**
 * Overture Maps binolari — OSM boʻsh joylarini toʻldirish va taxminiy balandliklarni aniqlashtirish (32-band, 25.10.2026).
 * Maʼlumot oʻz serverimizdan (api.archemistry.uz/data/overture/buildings): u Overture GeoParquet ni bbox boʻyicha oʻqib, 90 kun keshlaydi.
 * Overture binolari — OSM + Microsoft/Google ML izlari (ODbL 1.0): «© OpenStreetMap contributors, Overture Maps Foundation».
 * Server ishlamasa yoki javob bermasa — jim oʻtadi (OSM oʻzi qoladi).
 */
import { API_BASE } from '../account/config';
import type { LngLat } from '../core/doc';
import type { BBox, CtxBuilding, OsmData } from './osm';

export const OVERTURE_ATTR = '© OpenStreetMap contributors, Overture Maps Foundation';
/** Server bitta soʻrovda ≤ 0,06° qabul qiladi — kattaroq hudud 0,05° li boʻlaklarga */
const STEP = 0.05, MAX_TILES = 9;
export interface OvBuilding { rings: LngLat[][]; h: number | null; f: number | null }
export interface OvResult { release: string | null; buildings: OvBuilding[] }
export interface OvMerge { added: number; heights: number; release: string | null }

/** BBox (janub, gʻarb, shimol, sharq) → server boʻlaklari [gʻarb, janub, sharq, shimol] */
export function ovTiles(b: BBox): [number, number, number, number][] | null {
  const [s, w, n, e] = b, nx = Math.ceil((e - w) / STEP - 1e-9), ny = Math.ceil((n - s) / STEP - 1e-9);
  if (nx * ny > MAX_TILES || nx < 1 || ny < 1) return null;
  const out: [number, number, number, number][] = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) out.push([w + i * (e - w) / nx, s + j * (n - s) / ny, w + (i + 1) * (e - w) / nx, s + (j + 1) * (n - s) / ny]);
  return out;
}

export async function fetchOverture(b: BBox, f: typeof fetch = fetch, base = API_BASE, timeoutMs = 30_000): Promise<OvResult | null> {
  const tiles = ovTiles(b); if (!tiles) return null;
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const parts = await Promise.all(tiles.map(async q => {
      const r = await f(`${base}/data/overture/buildings?bbox=${q.map(v => v.toFixed(5)).join(',')}`, { signal: ctl.signal });
      if (!r.ok) throw new Error(String(r.status));
      return await r.json() as { release?: string; buildings?: OvBuilding[] };
    }));
    const seen = new Set<string>(), buildings: OvBuilding[] = [];
    for (const p of parts) for (const x of p.buildings ?? []) {
      if (!Array.isArray(x.rings) || !x.rings[0] || x.rings[0].length < 3) continue;
      const k = x.rings[0].slice(0, 2).map(q => q.join(',')).join('|'); if (seen.has(k)) continue; seen.add(k);   // boʻlak chegarasidagi takror
      buildings.push(x);
    }
    return { release: parts.find(p => p.release)?.release ?? null, buildings };
  } catch { return null; } finally { clearTimeout(t); }
}

/* ---------- birlashtirish ---------- */
const centroid = (r: LngLat[]): LngLat => { let x = 0, y = 0; for (const p of r) { x += p[0]; y += p[1]; } return [x / r.length, y / r.length]; };
function inRing(p: LngLat, r: LngLat[]): boolean {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; }
  return c;
}
const bbOf = (r: LngLat[]) => { let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity; for (const p of r) { w = Math.min(w, p[0]); e = Math.max(e, p[0]); s = Math.min(s, p[1]); n = Math.max(n, p[1]); } return [w, s, e, n]; };
const area = (r: LngLat[]) => { const k = 111_320 * Math.cos(r[0][1] * Math.PI / 180); let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] * k) * (r[i][1] * 111_132) - (r[i][0] * k) * (r[j][1] * 111_132); return Math.abs(a) / 2; };
/** Overture balandligi: height, boʻlmasa qavatlar × 3,2 m */
const ovH = (b: OvBuilding): number | null => (b.h != null && b.h > 1 && b.h < 900 ? b.h : b.f != null && b.f >= 1 && b.f < 200 ? b.f * 3.2 : null);

/**
 * OSM ga Overture ni qoʻshish (joyida oʻzgartiradi):
 * 1) OSM binosi balandligi taxminiy boʻlsa va ichida Overture binosi (balandligi maʼlum) boʻlsa — Overture balandligi;
 * 2) Overture binosi hech bir OSM binosi bilan ustma-ust tushmasa — yangi bino (OSM da chizilmagan).
 * heightByArea — taxmin funksiyasi (osm.ts), balandligi nomaʼlum yangi binolar uchun.
 */
export function mergeOverture(osm: OsmData, ov: OvResult, heightByArea: (kind: string, a: number, def: number) => number): OvMerge {
  // tez qidiruv: ~100 m katakli toʻr
  const G = 0.001, grid = new Map<string, number[]>(), key = (x: number, y: number) => `${Math.floor(x / G)},${Math.floor(y / G)}`;
  const B = osm.buildings, bbs = B.map(b => bbOf(b.rings[0]));
  bbs.forEach((bb, i) => { for (let x = Math.floor(bb[0] / G); x <= Math.floor(bb[2] / G); x++) for (let y = Math.floor(bb[1] / G); y <= Math.floor(bb[3] / G); y++) { const k = `${x},${y}`; const a = grid.get(k); if (a) a.push(i); else grid.set(k, [i]); } });
  const near = (p: LngLat) => grid.get(key(p[0], p[1])) ?? [];
  let added = 0, heights = 0, nid = -1;
  const done = new Set<number>();
  for (const o of ov.buildings) {
    const outer = o.rings[0], c = centroid(outer), oh = ovH(o);
    // OSM binosi Overture ichida yoki Overture markazi OSM binosi ichida — bitta bino
    let hit = near(c).find(i => inRing(c, B[i].rings[0]));
    if (hit == null) { const ob = bbOf(outer); for (let x = Math.floor(ob[0] / G); x <= Math.floor(ob[2] / G) && hit == null; x++) for (let y = Math.floor(ob[1] / G); y <= Math.floor(ob[3] / G) && hit == null; y++) hit = (grid.get(`${x},${y}`) ?? []).find(i => inRing(centroid(B[i].rings[0]), outer)); }
    if (hit != null) {
      const b = B[hit];
      if (b.hSrc === 'taxmin' && oh != null && !done.has(hit)) { b.h = Math.round(oh * 10) / 10; b.hSrc = 'overture'; heights++; done.add(hit); }
      continue;
    }
    const a = area(outer); if (a < 12) continue;   // sun'iy intellekt shovqini (≤ 12 m²)
    const nb: CtxBuilding = { id: nid--, rings: o.rings, h: oh ?? heightByArea('yes', a, 9), hSrc: oh != null ? 'overture' : 'taxmin', kind: 'yes' };
    B.push(nb); added++;
  }
  return { added, heights, release: ov.release };
}
