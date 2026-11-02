/**
 * Uylar qatori uchun kirish koʻchasi (02.11, egasi: «yakka uylarni generatsiya qilganda sukut boʻyicha kichik koʻcha profili bilan
 * chizsin — atrofdagi koʻchaga oʻzi avtomat bogʻlasin»). Qator chizigʻi mavjud koʻcha koridori ustida boʻlsa — koʻcha kerak emas.
 * Aks holda chiziq oʻzi koʻcha oʻqi boʻladi; uchlari eng yaqin koʻcha oʻqiga (≤ LINK m) perpendikulyar ulanadi.
 */
import type { XY } from './geo';

export const LINK = 120;
const segP = (p: XY, a: XY, b: XY): XY => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)); return [a[0] + dx * t, a[1] + dy * t]; };
const pin = (p: XY, r: XY[]) => { let ins = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) ins = !ins; } return ins; };
const inPoly = (p: XY, poly: XY[][]) => pin(p, poly[0]) && !poly.slice(1).some(h => pin(p, h));

/** Eng yaqin koʻcha oʻqi nuqtasi: [nuqta, masofa] */
export function nearestOnAxes(p: XY, axes: XY[][]): [XY, number] | null {
  let best: XY | null = null, bd = Infinity;
  for (const ax of axes) for (let i = 1; i < ax.length; i++) { const q = segP(p, ax[i - 1], ax[i]), d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; best = q; } }
  return best ? [best, bd] : null;
}

export interface Access { axis: XY[]; half: number; linked: boolean }
export function accessStreet(line: XY[], corridors: XY[][][], axes: XY[][], width: number): Access | null {
  if (line.length < 2) return null;
  // chiziqning koʻp qismi mavjud koridor ichida — koʻcha bor
  const samples: XY[] = []; for (let i = 1; i < line.length; i++) for (let k = 0; k <= 4; k++) { const t = k / 4; samples.push([line[i - 1][0] + (line[i][0] - line[i - 1][0]) * t, line[i - 1][1] + (line[i][1] - line[i - 1][1]) * t]); }
  if (samples.filter(p => corridors.some(c => inPoly(p, c))).length > samples.length / 2) return null;
  const axis = [...line]; let linked = false;
  for (const end of [0, 1] as const) {
    const e = end ? axis[axis.length - 1] : axis[0], n = nearestOnAxes(e, axes);
    if (!n || n[1] < 1 || n[1] > LINK) continue;
    if (end) axis.push(n[0]); else axis.unshift(n[0]);
    linked = true;
  }
  return { axis, half: width / 2, linked };
}

/**
 * Chuqur past qavatli kvartal uchun ichki koʻchalar (02.11, egasi: «yakka uylarda haliyam koʻchalar qurilmayapti»).
 * Kvartal uzun qirrasiga parallel oʻtish yoʻllari: har koʻcha ikki tomonida bir qator uchastka, kvartal chetida ham bir qator —
 * chuqurlik D = (n + 1) · 2 · plotD + n · W. Har oʻq kvartal chegarasidan eng yaqin koʻcha oʻqiga ulanadi (≤ 40 m).
 * Uchastka chuqurligi — LOW andozasi (lowrise.ts); koʻcha eni — «Oʻtish yoʻli» profili (338-band).
 */
export function innerStreets(ring: XY[], plotD: number, W: number, axes: XY[][]): XY[][] {
  if (ring.length < 3) return [];
  let ang = 0, bl = -1;
  for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L > bl) { bl = L; ang = Math.atan2(b[1] - a[1], b[0] - a[0]); } }
  const u: XY = [Math.cos(ang), Math.sin(ang)], v: XY = [-u[1], u[0]];
  const R = ring.map(p => [p[0] * u[0] + p[1] * u[1], p[0] * v[0] + p[1] * v[1]] as XY), ys = R.map(p => p[1]), y0 = Math.min(...ys), y1 = Math.max(...ys), D = y1 - y0;
  const n = Math.max(0, Math.floor((D - 2 * plotD) / (2 * plotD + W) + 0.25));
  if (!n) return [];
  const back = (x: number, y: number): XY => [u[0] * x + v[0] * y, u[1] * x + v[1] * y], out: XY[][] = [];
  for (let k = 1; k <= n; k++) {
    const y = y0 + D * k / (n + 1), xs: number[] = [];
    for (let i = 0; i < R.length; i++) { const a = R[i], b = R[(i + 1) % R.length]; if ((a[1] > y) !== (b[1] > y)) xs.push(a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1])); }
    xs.sort((p, q) => p - q);
    for (let j = 0; j + 1 < xs.length; j += 2) {
      if (xs[j + 1] - xs[j] < 4 * plotD) continue;   // juda qisqa boʻlak — koʻcha kerak emas
      const line: XY[] = [back(xs[j], y), back(xs[j + 1], y)];
      for (const end of [0, 1] as const) {
        const e = end ? line[line.length - 1] : line[0], nn = nearestOnAxes(e, axes);
        if (nn && nn[1] >= 0.5 && nn[1] <= 40) { if (end) line.push(nn[0]); else line.unshift(nn[0]); }
      }
      out.push(line);
    }
  }
  return out;
}
