/**
 * Relyef tahlili (04.11, egasi: «tahlil varaqlari — relyef»): balandlik toʻri (AWS Terrain Tiles, 10–20 m qadam) dan
 * gorizontallar (marching squares) va gipsometrik boʻyash. Sof funksiyalar — «Relyef» varagʻi (core/sheet) uchun.
 * Toʻr: n × n, i — x, j — y; nuqta (i, j) mahalliy koordinatasi: (c0x − radius + i·step, c0y − radius + j·step); h — mutlaq balandlik, m.
 */
import type { XY } from './geo';

export interface ReliefGrid { n: number; step: number; radius: number; c0: XY; h: ArrayLike<number> }

/** Gorizontal oraligʻi: koʻrinadigan balandlik farqida ~ 8–25 ta chiziq */
export function contourStep(range: number): number {
  for (const s of [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100]) if (range / s <= 25) return s;
  return 200;
}

/** Oyna (mahalliy, metr) ichidagi toʻr indekslari va balandlik oraligʻi */
export function windowOf(g: ReliefGrid, box: [number, number, number, number]): { i0: number; i1: number; j0: number; j1: number; min: number; max: number } | null {
  const ix = (x: number) => (x - g.c0[0] + g.radius) / g.step, jy = (y: number) => (y - g.c0[1] + g.radius) / g.step;
  const i0 = Math.max(0, Math.floor(ix(box[0]))), i1 = Math.min(g.n - 1, Math.ceil(ix(box[2]))), j0 = Math.max(0, Math.floor(jy(box[1]))), j1 = Math.min(g.n - 1, Math.ceil(jy(box[3])));
  if (i1 - i0 < 1 || j1 - j0 < 1) return null;
  let min = Infinity, max = -Infinity;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const v = g.h[j * g.n + i]; if (v < min) min = v; if (v > max) max = v; }
  return Number.isFinite(min) ? { i0, i1, j0, j1, min, max } : null;
}

/** Gorizontal kesmalari: har daraja uchun [a, b] kesmalar (mahalliy koordinatada) */
export function contourSegs(g: ReliefGrid, w: { i0: number; i1: number; j0: number; j1: number }, levels: number[]): { lv: number; segs: [XY, XY][] }[] {
  const P = (i: number, j: number): XY => [g.c0[0] - g.radius + i * g.step, g.c0[1] - g.radius + j * g.step], H = (i: number, j: number) => g.h[j * g.n + i];
  return levels.map(lv => {
    const segs: [XY, XY][] = [];
    const cut = (i1: number, j1: number, i2: number, j2: number): XY => { const a = H(i1, j1), b = H(i2, j2), t = a === b ? 0.5 : (lv - a) / (b - a), p = P(i1, j1), q = P(i2, j2); return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; };
    for (let j = w.j0; j < w.j1; j++) for (let i = w.i0; i < w.i1; i++) {
      const a = H(i, j) >= lv ? 1 : 0, b = H(i + 1, j) >= lv ? 2 : 0, c = H(i + 1, j + 1) >= lv ? 4 : 0, d = H(i, j + 1) >= lv ? 8 : 0, k = a | b | c | d;
      if (k === 0 || k === 15) continue;
      // qirralar: pastki (i,j)-(i+1,j), oʻng (i+1,j)-(i+1,j+1), yuqori (i,j+1)-(i+1,j+1), chap (i,j)-(i,j+1)
      const B = () => cut(i, j, i + 1, j), Rr = () => cut(i + 1, j, i + 1, j + 1), T = () => cut(i, j + 1, i + 1, j + 1), L = () => cut(i, j, i, j + 1);
      switch (k) {
        case 1: case 14: segs.push([L(), B()]); break;
        case 2: case 13: segs.push([B(), Rr()]); break;
        case 3: case 12: segs.push([L(), Rr()]); break;
        case 4: case 11: segs.push([Rr(), T()]); break;
        case 6: case 9: segs.push([B(), T()]); break;
        case 7: case 8: segs.push([L(), T()]); break;
        case 5: segs.push([L(), T()], [B(), Rr()]); break;   // egar nuqta — oddiy tanlov
        case 10: segs.push([L(), B()], [Rr(), T()]); break;
      }
    }
    return { lv, segs };
  });
}

/** Qiyalik, % (markaziy farq) — katak boʻyicha */
export function slopeAt(g: ReliefGrid, i: number, j: number): number {
  const H = (a: number, b: number) => g.h[Math.max(0, Math.min(g.n - 1, b)) * g.n + Math.max(0, Math.min(g.n - 1, a))];
  const dx = (H(i + 1, j) - H(i - 1, j)) / (2 * g.step), dy = (H(i, j + 1) - H(i, j - 1)) / (2 * g.step);
  return Math.hypot(dx, dy) * 100;
}

/** Gipsometrik ranglar (pastdan yuqoriga) */
export const HYPSO = ['#e3eed3', '#d3e4bd', '#e6e3b1', '#eed79c', '#e7c28a', '#dca97a', '#cd916c', '#bb7c63'];
