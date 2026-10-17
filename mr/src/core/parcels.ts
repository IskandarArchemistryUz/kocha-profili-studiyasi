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

/** Burilgan koordinata tizimi: rot — mahalliy → toʻr, un — teskari; chegaralar toʻr oʻqlarida */
function gridFrame(ring: XY[], ang: number) {
  const c = Math.cos(ang), s = Math.sin(ang), rot = (p: XY): XY => [p[0] * c + p[1] * s, -p[0] * s + p[1] * c], un = (p: XY): XY => [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of ring.map(rot)) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  return { rot, un, x0, x1, y0, y1 };
}

/** Kvartalni ~target m² li parsellarga boʻlish; kichik (< 35 %) qoldiqlar qoʻshnisiga qoʻshiladi */
export function subdivide(rings: XY[][], target: number, ang: number): XY[][][] {
  const { x0, x1, y0, y1 } = gridFrame(rings[0], ang);
  const side = Math.sqrt(Math.max(400, target)), nx = Math.max(1, Math.round((x1 - x0) / side)), ny = Math.max(1, Math.round((y1 - y0) / side));
  return gridCells(rings, ang, nx, ny);
}

/** Toʻr katakchalari: x boʻylab nx, y boʻylab ny ta; kvartalga qirqiladi, mayda qoldiqlar qoʻshniga qoʻshiladi */
export function gridCells(rings: XY[][], ang: number, nx: number, ny: number): XY[][][] {
  const { un, x0, x1, y0, y1 } = gridFrame(rings[0], ang);
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

/** Qatorlar: kvartal uzun oʻqi boʻylab ~target li parsellar, nrow qator (1 — koʻcha boʻylab bir qator; 2 — orqama-orqa ikki qator) */
export function rowCells(rings: XY[][], target: number, ang: number, nrow: number): XY[][][] {
  const { x0, x1, y0, y1 } = gridFrame(rings[0], ang);
  const depth = (y1 - y0) / nrow, w = Math.max(8, target / Math.max(1, depth)), nx = Math.max(1, Math.round((x1 - x0) / w));
  return gridCells(rings, ang, nx, nrow);
}

/** Ichkariga ofset (miter); oʻtkir burchak yoki oʻz-oʻzini kesish — null */
function insetMiter(r: XY[], d: number): XY[] | null {
  const n = r.length, out: XY[] = [];
  for (let i = 0; i < n; i++) {
    const p = r[(i - 1 + n) % n], c = r[i], q = r[(i + 1) % n];
    const u0 = unit([c[0] - p[0], c[1] - p[1]]), u1 = unit([q[0] - c[0], q[1] - c[1]]), n0: XY = [-u0[1], u0[0]], n1: XY = [-u1[1], u1[0]];
    const m = unit([n0[0] + n1[0], n0[1] + n1[1]]), cos = m[0] * n0[0] + m[1] * n0[1];
    if (cos < 0.3) return null;
    out.push([c[0] + m[0] * d / cos, c[1] + m[1] * d / cos]);
  }
  if (signedArea(out) <= 0) return null;
  // har bir ichki qirra tashqi qirra bilan bir yoʻnalishda boʻlsin (ofset oʻz-oʻzini kesmagan)
  for (let i = 0; i < n; i++) { const a = r[i], b = r[(i + 1) % n], a2 = out[i], b2 = out[(i + 1) % n]; if ((b[0] - a[0]) * (b2[0] - a2[0]) + (b[1] - a[1]) * (b2[1] - a2[1]) <= 0) return null; }
  return out;
}
const unit = (v: XY): XY => { const L = Math.hypot(v[0], v[1]) || 1; return [v[0] / L, v[1] / L]; };

/** Qirra uzunligi ≥ minLen boʻlgan halqa (kalta qirralar — qoʻshni uchlar tashlanadi) */
function simplifyRing(r: XY[], minLen: number): XY[] {
  const out = r.slice();
  for (let g = 0; g < 50 && out.length > 3; g++) { const k = out.findIndex((p, i) => Math.hypot(out[(i + 1) % out.length][0] - p[0], out[(i + 1) % out.length][1] - p[1]) < minLen); if (k < 0) break; out.splice(k, 1); }
  return out;
}

/**
 * Perimetr: har qirra boʻylab chuqurligi D li frontal parsellar (burchakdagilar kattaroq — miter), oʻrtada ichki hovli/yadro.
 * Kvartal tor boʻlsa (yadro sigʻmasa) — null.
 */
export function perimeterCells(rings: XY[][], target: number): XY[][][] | null {
  if (rings.length > 1) return null;
  const r = simplifyRing(signedArea(rings[0]) < 0 ? rings[0].slice().reverse() : rings[0].slice(), 6);
  const shortSpan = minWidth(r), D = Math.max(12, Math.min(Math.sqrt(Math.max(400, target)), shortSpan / 3));
  if (shortSpan < D * 3 - 1e-6) return null;   // yadro kamida D kenglikda (tor kvartal — null)
  const inner = insetMiter(r, D); if (!inner) return null;
  const w = Math.max(10, target / D), n = r.length, out: XY[][][] = [];
  for (let i = 0; i < n; i++) {
    const a = r[i], b = r[(i + 1) % n], a2 = inner[i], b2 = inner[(i + 1) % n];
    const u = unit([b[0] - a[0], b[1] - a[1]]), nv: XY = [-u[1], u[0]];
    // ichki qirra tashqi qirraga proyeksiyada [s0, s1]; kesimlar qirraga perpendikulyar, ichki qirra teng boʻlinadi — burchak parsellari miter hisobiga kattaroq
    const s0 = (a2[0] - a[0]) * u[0] + (a2[1] - a[1]) * u[1], s1 = (b2[0] - a[0]) * u[0] + (b2[1] - a[1]) * u[1];
    const k = Math.max(1, Math.round((s1 - s0 + D) / w));   // burchak parsellari miter qismini oladi — kattaroq, lekin 2× emas
    const P = (s: number): XY => [a[0] + u[0] * s, a[1] + u[1] * s], Q = (s: number): XY => [a[0] + u[0] * s + nv[0] * D, a[1] + u[1] * s + nv[1] * D];
    for (let j = 0; j < k; j++) {
      const sa = s0 + (s1 - s0) * j / k, sb = s0 + (s1 - s0) * (j + 1) / k;
      const cell: XY[] = [j === 0 ? a : P(sa), j === k - 1 ? b : P(sb), j === k - 1 ? b2 : Q(sb), j === 0 ? a2 : Q(sa)];
      if (Math.abs(signedArea(cell)) > 20) out.push([cell]);
    }
  }
  if (Math.abs(signedArea(inner)) > 20) out.push([inner]);
  return out.length >= 3 ? out : null;
}

function minWidth(r: XY[]): number {
  let best = Infinity;
  for (let i = 0; i < r.length; i++) {
    const a = r[i], b = r[(i + 1) % r.length], u = unit([b[0] - a[0], b[1] - a[1]]), v: XY = [-u[1], u[0]];
    let v0 = Infinity, v1 = -Infinity; for (const p of r) { const t = p[0] * v[0] + p[1] * v[1]; v0 = Math.min(v0, t); v1 = Math.max(v1, t); }
    best = Math.min(best, v1 - v0);
  }
  return best;
}

export type ParcelMethod = 'tor' | 'bir_qator' | 'ikki_qator' | 'perimetr';
export interface ParcelVariant { id: ParcelMethod; name: string; note: string; cells: XY[][][] }
/** Kvartalni boʻlish variantlari (≥ 2 parsel chiqqanlari); ang — toʻr burchagi */
export function parcelVariants(rings: XY[][], target: number, ang: number): ParcelVariant[] {
  const list: ParcelVariant[] = [
    { id: 'tor', name: 'Toʻr', note: 'teng katakchalar', cells: subdivide(rings, target, ang) },
    { id: 'bir_qator', name: 'Bir qator', note: 'koʻcha boʻylab, toʻliq chuqurlikda', cells: rowCells(rings, target, ang, 1) },
    { id: 'ikki_qator', name: 'Ikki qator', note: 'orqama-orqa, oʻrtada umumiy chegara', cells: rowCells(rings, target, ang, 2) },
    { id: 'perimetr', name: 'Perimetr + hovli', note: 'burchak parsellari kattaroq, oʻrtada yadro', cells: perimeterCells(rings, target) ?? [] },
  ];
  return list.filter(v => v.cells.length >= 2);
}

export { areaOf };
