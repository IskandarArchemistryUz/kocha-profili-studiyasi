/**
 * Uy narxlari (Joyshunos, «Biznes»): uybor.uz eʼlonlari → olti burchakli katakchalar («soti») boʻyicha median $/m².
 * Maʼlumot narx-monitoring tarmogʻida (tools/narx_hex.py) jamlanadi: xom eʼlonlar yoʻq, 5 tadan kam eʼlonli katakda narx yoʻq.
 * Rang: qimmat — toʻq, arzon — och, maʼlumot yetarli emas — oq. Bu SOʻRALGAN narx, bitim narxi emas.
 * Toʻr narx_hex.py bilan aynan bir xil (oʻzgartirmang): boshi 41.10 / 69.05, pointy-top axial (q, r).
 */
import type { LngLat } from '../core/doc';

export const NARX_URL = 'https://raw.githubusercontent.com/IskandarArchemistryUz/kocha-profili-studiyasi/narx-monitoring/data/narx/toshkent_hex.json';
export type NarxKat = 'kvartira' | 'hovli' | 'hammasi';
/** [q, r, n, median, p25, p75] — narxli; [q, r, 0] — eʼlon yoʻq; [q, r, -1] — 5 tadan kam */
export type Cell = number[];
export interface NarxData { v: number; sana: string; min: number; kat: Record<NarxKat, Record<string, Cell[]>>; shahar?: Partial<Record<NarxKat, number[]>> }

const LAT0 = 41.10, LNG0 = 69.05, MLAT = 111320, MLNG = 111320 * Math.cos(41.3 * Math.PI / 180);
/** Katak oʻlchami: hovli eʼlonlari kam — kattaroq katak */
export const sizeOf = (k: NarxKat): number => (k === 'hovli' ? 1500 : 1000);
/** Och → toʻq (iliq jigarrang): 7 sinf */
export const NARX_PAL = ['#fbf3e4', '#f1dcb2', '#e2bb81', '#cc9156', '#a96833', '#7a431d', '#47250e'];

let memo: Promise<NarxData> | null = null;
export function loadNarx(f: typeof fetch = fetch): Promise<NarxData> {
  memo ??= f(NARX_URL).then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() as Promise<NarxData>; }).catch(e => { memo = null; throw e; });
  return memo;
}

function center(q: number, r: number, w: number): [number, number] { const R = w / Math.sqrt(3); return [R * Math.sqrt(3) * (q + r / 2), R * 1.5 * r]; }
const toGeo = (x: number, y: number): LngLat => [LNG0 + x / MLNG, LAT0 + y / MLAT];
export function hexRing(q: number, r: number, w: number): LngLat[] {
  const R = w / Math.sqrt(3), [cx, cy] = center(q, r, w), out: LngLat[] = [];
  for (let i = 0; i < 6; i++) { const a = (60 * i - 30) * Math.PI / 180; out.push(toGeo(cx + R * Math.cos(a), cy + R * Math.sin(a))); }
  out.push(out[0]); return out;
}
export function hexAt(c: LngLat, w: number): [number, number] {
  const x = (c[0] - LNG0) * MLNG, y = (c[1] - LAT0) * MLAT, R = w / Math.sqrt(3);
  const xc = (Math.sqrt(3) / 3 * x - y / 3) / R, zc = (2 / 3 * y) / R, yc = -xc - zc;
  let rx = Math.round(xc), ry = Math.round(yc), rz = Math.round(zc);
  const dx = Math.abs(rx - xc), dy = Math.abs(ry - yc), dz = Math.abs(rz - zc);
  if (dx > dy && dx > dz) rx = -ry - rz; else if (dy > dz) ry = -rx - rz; else rz = -rx - ry;
  return [rx, rz];
}
const cells = (d: NarxData, k: NarxKat): Cell[] => d.kat[k]?.[String(sizeOf(k))] ?? [];
const priced = (d: NarxData, k: NarxKat) => cells(d, k).filter(c => c[2] > 0);

/** 7 sinf chegaralari — narxli kataklar medianalarining kvantillari (6 ta chegara) */
export function breaks(d: NarxData, k: NarxKat): number[] {
  const v = priced(d, k).map(c => c[3]).sort((a, b) => a - b); if (v.length < 2) return [];
  const out: number[] = [];
  for (let i = 1; i < 7; i++) { const x = v[Math.min(v.length - 1, Math.floor(i * v.length / 7))]; out.push(Math.round(x / 50) * 50); }
  return [...new Set(out)];
}
export const colorOf = (m: number, b: number[]): string => NARX_PAL[Math.min(NARX_PAL.length - 1, b.filter(x => m >= x).length + (NARX_PAL.length - 1 - b.length))];

/** Xarita uchun: har katak — koʻpburchak; m — median (yoʻq boʻlsa null), c — rang */
export function narxFC(d: NarxData, k: NarxKat): unknown {
  const w = sizeOf(k), b = breaks(d, k);
  return { type: 'FeatureCollection', features: cells(d, k).map(c => ({ type: 'Feature', properties: { m: c[2] > 0 ? c[3] : null, n: c[2], col: c[2] > 0 ? colorOf(c[3], b) : '#ffffff' }, geometry: { type: 'Polygon', coordinates: [hexRing(c[0], c[1], w)] } })) };
}

export interface NarxAt { inCity: boolean; n: number; median?: number; p25?: number; p75?: number; /** shahar kataklarining necha foizidan qimmat */ rank?: number; size: number }
export function narxAt(d: NarxData, k: NarxKat, c: LngLat): NarxAt {
  const w = sizeOf(k), [q, r] = hexAt(c, w), all = cells(d, k), cell = all.find(x => x[0] === q && x[1] === r);
  if (!cell) return { inCity: false, n: 0, size: w };
  if (cell[2] <= 0) return { inCity: true, n: cell[2], size: w };
  const ms = priced(d, k).map(x => x[3]);
  return { inCity: true, n: cell[2], median: cell[3], p25: cell[4], p75: cell[5], rank: Math.round(100 * ms.filter(m => m < cell[3]).length / ms.length), size: w };
}
/** Sheet / albom uchun: mahalliy (metr) koordinatada koʻpburchaklar */
export function narxPolys(d: NarxData, k: NarxKat, toL: (p: LngLat) => [number, number], half: number): { pts: [number, number][]; col: string; empty: boolean }[] {
  const w = sizeOf(k), b = breaks(d, k), out: { pts: [number, number][]; col: string; empty: boolean }[] = [];
  for (const c of cells(d, k)) {
    const pts = hexRing(c[0], c[1], w).map(toL);
    if (pts.every(p => Math.abs(p[0]) > half + w || Math.abs(p[1]) > half + w)) continue;
    out.push({ pts, col: c[2] > 0 ? colorOf(c[3], b) : '#ffffff', empty: c[2] <= 0 });
  }
  return out;
}
