/**
 * Kvartalni parsellarga boʻlish: toʻr (shimol–janub, burchak bilan, koʻcha boʻylab), chiziq bilan kesish, birlashtirish.
 * Parsellar hujjatda geometriya sifatida saqlanadi (foydalanuvchi qarori); kvartal chegarasiga qirqib ishlatiladi.
 */
import polygonClipping, { type MultiPolygon, type Polygon } from 'polygon-clipping';
import { signedArea, type XY } from './geo';

export type GridMode = 'ns' | 'angle' | 'street';
const P = (r: XY[]): [number, number][] => [...r, r[0]].map(p => [p[0], p[1]]);
const R = (r: [number, number][]): XY[] => r.slice(0, -1).map(p => [p[0], p[1]] as XY);
const toPoly = (rings: XY[][]): Polygon => rings.map(P);
const fromMP = (mp: MultiPolygon): XY[][][] => mp.map(p => p.map(R)).map(rs => rs.map((r, i) => (signedArea(r) < 0) === (i === 0) ? r.slice().reverse() : r));
const areaOf = (rings: XY[][]) => Math.abs(signedArea(rings[0])) - rings.slice(1).reduce((s, h) => s + Math.abs(signedArea(h)), 0);

/** Toʻr yoʻnalishi (radian): shimol–janub — 0; koʻcha boʻylab — kvartalning eng uzun qirrasi */
export function gridAngle(rings: XY[][], mode: GridMode, angleDeg = 0): number {
  if (mode === 'ns') return 0;
  if (mode === 'angle') return angleDeg * Math.PI / 180;
  const r = rings[0]; let best = 0, bl = -1;
  for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L > bl) { bl = L; best = Math.atan2(b[1] - a[1], b[0] - a[0]); } }
  return best;
}

/** Kvartalni ~target m² li parsellarga boʻlish; kichik (< 35 %) qoldiqlar qoʻshnisiga qoʻshiladi */
export function subdivide(rings: XY[][], target: number, ang: number): XY[][][] {
  const c = Math.cos(ang), s = Math.sin(ang), rot = (p: XY): XY => [p[0] * c + p[1] * s, -p[0] * s + p[1] * c], un = (p: XY): XY => [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of rings[0].map(rot)) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  const side = Math.sqrt(Math.max(400, target)), nx = Math.max(1, Math.round((x1 - x0) / side)), ny = Math.max(1, Math.round((y1 - y0) / side));
  const dx = (x1 - x0) / nx, dy = (y1 - y0) / ny, block = toPoly(rings);
  const cells: { i: number; j: number; rings: XY[][]; area: number }[] = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const q: XY[] = [[x0 + i * dx, y0 + j * dy], [x0 + (i + 1) * dx, y0 + j * dy], [x0 + (i + 1) * dx, y0 + (j + 1) * dy], [x0 + i * dx, y0 + (j + 1) * dy]].map(p => un(p as XY));
    let mp: MultiPolygon = [];
    try { mp = polygonClipping.intersection([P(q)], block); } catch { continue; }
    for (const rr of fromMP(mp)) { const a = areaOf(rr); if (a > 1) cells.push({ i, j, rings: rr, area: a }); }
  }
  // kichik qoldiqlarni qoʻshni katakka (umumiy chegarasi bor) qoʻshish
  const small = (x: typeof cells[0]) => x.area < 0.35 * dx * dy;
  for (let guard = 0; guard < 200; guard++) {
    const k = cells.findIndex(small); if (k < 0 || cells.length < 2) break;
    const a = cells[k]; let best = -1, bd = Infinity;
    cells.forEach((b, m) => { if (m === k) return; const d = Math.abs(a.i - b.i) + Math.abs(a.j - b.j); if (d < bd) { bd = d; best = m; } });
    const u = merge(a.rings, cells[best].rings);
    if (!u) break;
    const nb = { i: cells[best].i, j: cells[best].j, rings: u, area: areaOf(u) };
    cells.splice(Math.max(k, best), 1); cells.splice(Math.min(k, best), 1); cells.push(nb);
  }
  return cells.map(x => x.rings);
}

/** Ikki parselni birlashtirish; bitta yaxlit koʻpburchak chiqmasa — null (qoʻshni emas) */
export function merge(a: XY[][], b: XY[][]): XY[][] | null {
  try { const mp = polygonClipping.union(toPoly(a), toPoly(b)); return mp.length === 1 ? fromMP(mp)[0] : null; } catch { return null; }
}

/** Parselni A→B chiziq bilan ikkiga kesish (chiziq parseldan uzunroq deb olinadi) */
export function split(rings: XY[][], a: XY, b: XY): XY[][][] {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux, F = 5000;
  const A: XY = [a[0] - ux * F, a[1] - uy * F], B: XY = [a[0] + ux * F, a[1] + uy * F];
  const left: XY[] = [A, B, [B[0] + nx * F, B[1] + ny * F], [A[0] + nx * F, A[1] + ny * F]], right: XY[] = [A, [A[0] - nx * F, A[1] - ny * F], [B[0] - nx * F, B[1] - ny * F], B];
  const out: XY[][][] = [];
  for (const h of [left, right]) { try { out.push(...fromMP(polygonClipping.intersection(toPoly(rings), [P(h)]))); } catch { /* */ } }
  return out.filter(r => areaOf(r) > 20);
}

export { areaOf };
