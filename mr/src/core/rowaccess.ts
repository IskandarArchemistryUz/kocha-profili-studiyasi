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
