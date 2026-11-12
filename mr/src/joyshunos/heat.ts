/**
 * Issiqlik oroli (beta) — NASA GIBS orqali MODIS Terra yer yuzasi harorati (MOD11A2, 8 kunlik, ~1 km, kunduzi ≈ 10:30).
 * Plitkalar rangli PNG; rang → Kelvin GIBS rang xaritasi (MODIS_Land_Surface_Temp.xml, 0,6 K qadam) boʻyicha qaytariladi.
 * Yozgi kompozitlar (4 iyul – 20 avgust, 6 ta) oʻrtachalanadi — bulut boʻshliqlari toʻladi.
 * Bu havo harorati emas — sirt harorati; 1 km piksel: mahalla darajasi, alohida bino emas.
 */
import type { LngLat } from '../core/doc';

export const GIBS = 'https://gibs.earthdata.nasa.gov';
export const LST_LAYER = 'MODIS_Terra_L3_Land_Surface_Temp_8Day_Day';
export const LST_CMAP = `${GIBS}/colormaps/v1.3/MODIS_Land_Surface_Temp.xml`;
export const LST_Z = 7;
export const lstTile = (date: string, z: number, x: number, y: number) => `${GIBS}/wmts/epsg3857/best/${LST_LAYER}/default/${date}/GoogleMapsCompatible_Level7/${z}/${y}/${x}.png`;

/** Oxirgi toʻliq yoz (sentabrdan keyin — joriy yil) va uning 8 kunlik kompozit sanalari (yil kuni 1 + 8k) */
export function lstDates(now = new Date()): { year: number; dates: string[] } {
  const year = now.getUTCMonth() >= 8 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const dates: string[] = [];
  for (let doy = 185; doy <= 225; doy += 8) dates.push(new Date(Date.UTC(year, 0, doy)).toISOString().slice(0, 10));
  return { year, dates };
}

/** Rang xaritasi: rgb kaliti → Kelvin (oraliq oʻrtasi) */
export type CMap = Map<number, number>;
export function parseCmap(xml: string): CMap {
  const m: CMap = new Map();
  for (const e of xml.match(/<ColorMapEntry\b[^>]*>/g) ?? []) {
    if (/transparent="true"/.test(e)) continue;
    const rgb = /rgb="(\d+),(\d+),(\d+)"/.exec(e), v = /value="\[([\d.]+),([\d.]+)\)"/.exec(e);
    if (!rgb || !v) continue;
    const lo = +v[1], hi = +v[2]; if (lo < 150 || hi > 400) continue;   // chetki «quyi/yuqori» oraliqlar
    m.set((+rgb[1] << 16) | (+rgb[2] << 8) | +rgb[3], (lo + hi) / 2);
  }
  return m;
}

/** Web Mercator plitka koordinatasi (kasr) */
export function tileXY(p: LngLat, z: number): [number, number] {
  const n = 2 ** z, la = p[1] * Math.PI / 180;
  return [(p[0] + 180) / 360 * n, (1 - Math.log(Math.tan(la) + 1 / Math.cos(la)) / Math.PI) / 2 * n];
}

export interface Px { w: number; h: number; data: Uint8ClampedArray }
/** src: 'landsat' — oldindan hisoblangan Landsat to'ri (100 m), aks holda MODIS (GIBS, 1 km); used — kompozitlar (MODIS) yoki bulutsiz kunlar (Landsat) soni */
export interface LstGrid { n: number; step: number; R: number; v: Float32Array; year: number; used: number; src?: 'landsat' | 'modis'; px?: number; /** Landsat: mavjud yillar (13.11 — yil tanlash) */ years?: number[] }
/** Markaz atrofida R metrli kvadrat toʻr (qadam step) — yozgi kompozitlar oʻrtachasi, °C (maʼlumot yoʻq — NaN) */
export async function loadLst(c: LngLat, R: number, step: number, cm: CMap, getTile: (date: string, z: number, x: number, y: number) => Promise<Px | null>, now = new Date()): Promise<LstGrid> {
  const { year, dates } = lstDates(now), n = Math.round(2 * R / step) + 1;
  const kx = 111_320 * Math.cos(c[1] * Math.PI / 180), ky = 111_132;
  const sum = new Float32Array(n * n), cnt = new Uint8Array(n * n);
  const cache = new Map<string, Promise<Px | null>>();
  let used = 0;
  for (const d of dates) {
    let any = false;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const p: LngLat = [c[0] + (-R + i * step) / kx, c[1] + (-R + j * step) / ky];
      const [tx, ty] = tileXY(p, LST_Z), x = Math.floor(tx), y = Math.floor(ty), key = `${d}/${x}/${y}`;
      if (!cache.has(key)) cache.set(key, getTile(d, LST_Z, x, y).catch(() => null));
      const t = await cache.get(key)!; if (!t) continue;
      const px = Math.min(t.w - 1, Math.floor((tx - x) * t.w)), py = Math.min(t.h - 1, Math.floor((ty - y) * t.h)), o = (py * t.w + px) * 4;
      if (t.data[o + 3] < 128) continue;
      const k = cm.get((t.data[o] << 16) | (t.data[o + 1] << 8) | t.data[o + 2]); if (k == null) continue;
      sum[j * n + i] += k - 273.15; cnt[j * n + i]++; any = true;
    }
    if (any) used++;
  }
  const v = new Float32Array(n * n); for (let k = 0; k < v.length; k++) v[k] = cnt[k] ? sum[k] / cnt[k] : NaN;
  return { n, step, R, v, year, used };
}

/** Markaz qiymati, r ichidagi oʻrtacha va atrof (r..R halqa) oʻrtachasi */
export function lstStats(g: LstGrid, r: number): { at: number; inside: number; ring: number; delta: number } {
  const c = (g.n - 1) / 2, at = g.v[Math.round(c) * g.n + Math.round(c)];
  let si = 0, ni = 0, so = 0, no = 0;
  const rin = Math.max(r, g.step * 0.75);
  for (let j = 0; j < g.n; j++) for (let i = 0; i < g.n; i++) {
    const v = g.v[j * g.n + i]; if (Number.isNaN(v)) continue;
    const d = Math.hypot((i - c) * g.step, (j - c) * g.step);
    if (d <= rin) { si += v; ni++; } else if (d <= g.R) { so += v; no++; }
  }
  const inside = ni ? si / ni : NaN, ring = no ? so / no : NaN;
  return { at, inside, ring, delta: inside - ring };
}

/** Harorat rangi (°C) — sovuqdan issiqqa */
export const LST_BINS: [number, string, string][] = [[-99, '#3b5bab', '< 30'], [30, '#5aa0c8', '30–35'], [35, '#a7d3b5', '35–40'], [40, '#f2e08a', '40–45'], [45, '#f4a259', '45–50'], [50, '#d9503f', '50–55'], [55, '#8e1f2f', '≥ 55']];
export function lstColor(t: number): string { let c = LST_BINS[0][1]; for (const [v, col] of LST_BINS) if (t >= v) c = col; return c; }

/** Mahalliy issiqlik orolini koʻrsatish uchun: 6 km oʻrtachasidan farq (°C) — mutlaq shkala shahar ichida bir xil rang beradi */
export const LST_DEV_BINS: [number, string, string][] = [[-99, '#2c6fb0', '< −3'], [-3, '#79b0d6', '−3…−1,5'], [-1.5, '#cfe3ee', '−1,5…−0,5'], [-0.5, '#f4f1e6', '±0,5'], [0.5, '#f7c9a0', '0,5…1,5'], [1.5, '#ee8a5a', '1,5…3'], [3, '#c43b2e', '> 3']];
export function devColor(d: number): string { let c = LST_DEV_BINS[0][1]; for (const [v, col] of LST_DEV_BINS) if (d >= v) c = col; return c; }
export function lstMean(g: LstGrid): number { let s = 0, n = 0; const c = (g.n - 1) / 2; for (let j = 0; j < g.n; j++) for (let i = 0; i < g.n; i++) { const v = g.v[j * g.n + i]; if (Number.isNaN(v) || Math.hypot(i - c, j - c) * g.step > g.R) continue; s += v; n++; } return n ? s / n : NaN; }

/** Toʻrdan silliq qiymat (bilinear): x — sharqqa, y — shimolga (metr, markazdan); NaN kataklar ogʻirlikdan chiqariladi.
 * 12.11 (egasi): issiqlik 100 m piksel boʻlib «kvadrat» koʻrinmasin — doira ichida silliq sirt. */
export function bilinear(v: Float32Array, n: number, step: number, x: number, y: number): number {
  const c = (n - 1) / 2, fx = x / step + c, fy = y / step + c, i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j;
  let s = 0, w = 0;
  for (const [di, dj, wt] of [[0, 0, (1 - tx) * (1 - ty)], [1, 0, tx * (1 - ty)], [0, 1, (1 - tx) * ty], [1, 1, tx * ty]] as const) {
    const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= n || jj >= n || wt <= 0) continue;
    const q = v[jj * n + ii]; if (Number.isNaN(q)) continue; s += q * wt; w += wt;
  }
  return w > 1e-6 ? s / w : NaN;
}

/* ---------- Landsat 8/9 (oldindan hisoblangan, lst-data branchi) ----------
 * Quvur: landsat_yoz_harorat.py (USGS Landsat C2 L2 ST_B10, Microsoft Planetary Computer) — iyun–avgust medianasi, haqiqiy piksel 100 m.
 * Fayl: uint16 LE = (°C + 50) · 100, 0 — maʼlumot yoʻq; 0-qator shimol; qadam `qadam` gradus. Qamrovdan tashqarida MODIS ishlatiladi. */
export const LST_DATA = 'https://raw.githubusercontent.com/IskandarArchemistryUz/kocha-profili-studiyasi/lst-data/data/lst';
export const LST_REGIONS = ['toshkent'];
/** Doira ichidagi kataklarning shuncha ulushida maʼlumot boʻlmasa — MODIS ga qaytiladi */
export const LST_MIN_COVER = 0.8;
export interface LstIndex { hudud: string; bbox: [number, number, number, number]; nx: number; ny: number; qadam: number; piksel_m?: number; yillar: Record<string, { fayl: string; N: number; sahna?: number; qamrov?: number }> }

export function lstIndexHas(ix: LstIndex, c: LngLat): boolean {
  const [w, s, e, n] = ix.bbox; return c[0] >= w && c[0] <= e && c[1] >= s && c[1] <= n;
}
/** Eng oxirgi yil (yoki berilgan yil, agar bor boʻlsa) */
export function lstLatestYear(ix: LstIndex, want?: number): number | null {
  const ys = Object.keys(ix.yillar).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!ys.length) return null;
  return want != null && ys.includes(want) ? want : ys[ys.length - 1];
}
/** Landsat to'ridan markaz atrofida R metrli kvadrat to'r (qadam step), °C; doira ichidagi qamrov ulushi bilan */
export function landsatGrid(ix: LstIndex, year: number, q: Uint16Array, c: LngLat, R: number, step: number): { g: LstGrid; cover: number } {
  const n = Math.round(2 * R / step) + 1, v = new Float32Array(n * n).fill(NaN);
  const kx = 111_320 * Math.cos(c[1] * Math.PI / 180), ky = 111_132, [w, , , nB] = ix.bbox, mid = (n - 1) / 2;
  let inC = 0, ok = 0;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const lon = c[0] + (-R + i * step) / kx, lat = c[1] + (-R + j * step) / ky;
    const col = Math.floor((lon - w) / ix.qadam), row = Math.floor((nB - lat) / ix.qadam);
    const inside = Math.hypot(i - mid, j - mid) * step <= R; if (inside) inC++;
    if (col < 0 || row < 0 || col >= ix.nx || row >= ix.ny) continue;
    const u = q[row * ix.nx + col]; if (!u) continue;
    v[j * n + i] = u / 100 - 50; if (inside) ok++;
  }
  const meta = ix.yillar[String(year)];
  return { g: { n, step, R, v, year, used: meta?.N ?? 0, src: 'landsat', px: ix.piksel_m ?? 100 }, cover: inC ? ok / inC : 0 };
}
const ixCache = new Map<string, Promise<LstIndex | null>>(), binCache = new Map<string, Promise<Uint16Array>>();
/** Uchastka Landsat qamrovida boʻlsa — Landsat to'ri, aks holda null (MODIS ga qaytiladi). Tarmoq xatosi ham null. */
export async function loadLstLandsat(c: LngLat, R: number, step: number, f: typeof fetch = fetch, regions = LST_REGIONS, base = LST_DATA, want?: number): Promise<LstGrid | null> {
  for (const h of regions) {
    const ku = `${base}/${h}_index.json`;
    if (!ixCache.has(ku)) ixCache.set(ku, f(ku).then(r => (r.ok ? r.json() as Promise<LstIndex> : null)).catch(() => null));
    const ix = await ixCache.get(ku)!; if (!ix || !lstIndexHas(ix, c)) { if (!ix) ixCache.delete(ku); continue; }
    const y = lstLatestYear(ix, want); if (y == null) continue;
    const bu = `${base}/${ix.yillar[String(y)].fayl}`;
    if (!binCache.has(bu)) binCache.set(bu, f(bu).then(async r => { if (!r.ok) throw new Error(`Landsat ${r.status}`); return new Uint16Array(await r.arrayBuffer()); }));
    let q: Uint16Array; try { q = await binCache.get(bu)!; } catch { binCache.delete(bu); return null; }
    if (q.length !== ix.nx * ix.ny) return null;
    const { g, cover } = landsatGrid(ix, y, q, c, R, step);
    g.years = Object.keys(ix.yillar).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
    return cover >= LST_MIN_COVER ? g : null;
  }
  return null;
}
