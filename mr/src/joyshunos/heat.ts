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
export interface LstGrid { n: number; step: number; R: number; v: Float32Array; year: number; used: number }
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
