/**
 * Quyosh va soya (xarita) — OSM binolari prizmalari (balandlik: height / levels / taxminiy) boʻyicha:
 *   • tanlangan soatdagi soyalar (har bino: asos ∪ siljigan asos qobigʻi),
 *   • kun davomida quyoshli soatlar toʻri (core/sun.ts insolation — Master rejadagi hisob bilan bir xil).
 * Relyef hisobga olinmaydi (tekis yer), daraxtlar soyasi yoʻq.
 */
import type { XY } from '../core/geo';
import type { Prism } from '../core/sun';

export const SUN_DAYS_MAP: [number, number, string][] = [[3, 22, '22 mart'], [6, 22, '22 iyun'], [12, 22, '22 dekabr']];
export const SUN_BINS: [number, string, string][] = [[0, '#2b3a67', '< 1 soat'], [1, '#4a6fa5', '1–2'], [2, '#7fb3c8', '2–3'], [3, '#c9e4a5', '3–4'], [4, '#f6e58d', '4–6'], [6, '#f9b24e', '≥ 6']];
export function sunColor(h: number): string { let c = SUN_BINS[0][1]; for (const [v, col] of SUN_BINS) if (h >= v) c = col; return c; }

/** Andrew monotone chain — qavariq qobiq */
export function hull(pts: XY[]): XY[] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cr = (o: XY, a: XY, b: XY) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: XY[] = [], up: XY[] = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

/**
 * Bino soyasi: quyosh azimuti az (shimoldan soat yoʻnalishida), balandligi alt (°). Soya quyoshga teskari tomonga h / tan(alt) uzunlikda.
 * Har devor qirrasi uchun (a, b, b+d, a+d) toʻrtburchak — botiq binolarda ham toʻgʻri; asos ham qoʻshiladi.
 */
export function shadowOf(pr: Prism, alt: number, az: number, maxLen = 600): XY[][] {
  if (alt <= 0.5) return [];
  const L = Math.min(maxLen, pr.top / Math.tan(alt * Math.PI / 180)), a = az * Math.PI / 180, d: XY = [-Math.sin(a) * L, -Math.cos(a) * L];
  const r = pr.ring, out: XY[][] = [r];
  for (let i = 0; i < r.length; i++) {
    const p = r[i], q = r[(i + 1) % r.length];
    if (p[0] === q[0] && p[1] === q[1]) continue;
    out.push([p, q, [q[0] + d[0], q[1] + d[1]], [p[0] + d[0], p[1] + d[1]]]);
  }
  return out;
}
/** Soddalashtirilgan: bitta qavariq koʻpburchak (kichik binolar uchun yetarli) */
export function shadowHull(pr: Prism, alt: number, az: number, maxLen = 600): XY[] {
  if (alt <= 0.5) return [];
  const L = Math.min(maxLen, pr.top / Math.tan(alt * Math.PI / 180)), a = az * Math.PI / 180, dx = -Math.sin(a) * L, dy = -Math.cos(a) * L;
  return hull([...pr.ring, ...pr.ring.map(p => [p[0] + dx, p[1] + dy] as XY)]);
}

export function inRing(p: XY, r: XY[]): boolean {
  let ins = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[j], b = r[i]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) ins = !ins; }
  return ins;
}

/** r doirasidagi toʻr nuqtalari (binolar ichidagilar chiqarib tashlanadi) */
export function sunPoints(prisms: Prism[], r: number, step: number): { n: number; pts: XY[]; idx: number[] } {
  const n = Math.round(2 * r / step) + 1, c = (n - 1) / 2, pts: XY[] = [], idx: number[] = [];
  const C = 25, grid = new Map<string, number[]>();
  prisms.forEach((pr, k) => { let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const p of pr.ring) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    for (let i = Math.floor(x0 / C); i <= Math.floor(x1 / C); i++) for (let j = Math.floor(y0 / C); j <= Math.floor(y1 / C); j++) { const key = `${i},${j}`; (grid.get(key) || grid.set(key, []).get(key)!).push(k); } });
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const p: XY = [(i - c) * step, (j - c) * step]; if (p[0] * p[0] + p[1] * p[1] > r * r) continue;
    const ids = grid.get(`${Math.floor(p[0] / C)},${Math.floor(p[1] / C)}`);
    if (ids?.some(k => inRing(p, prisms[k].ring))) continue;
    pts.push(p); idx.push(j * n + i);
  }
  return { n, pts, idx };
}

/** Statistika: markazga eng yaqin nuqta, oʻrtacha, ≥ 1 / ≥ 0,5 soat ulushi */
export function sunStats(pts: XY[], hours: ArrayLike<number>): { at: number; mean: number; ge1: number; ge05: number; ge3: number } {
  let best = 0, bd = Infinity, s = 0, a = 0, b = 0, c3 = 0;
  for (let k = 0; k < pts.length; k++) { const d = Math.hypot(pts[k][0], pts[k][1]); if (d < bd) { bd = d; best = k; } const v = hours[k]; s += v; if (v >= 1) a++; if (v >= 0.5) b++; if (v >= 3) c3++; }
  const n = pts.length || 1;
  return { at: pts.length ? hours[best] : NaN, mean: s / n, ge1: a / n, ge05: b / n, ge3: c3 / n };
}
