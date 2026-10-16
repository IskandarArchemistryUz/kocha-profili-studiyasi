/**
 * Qavatlar boʻyicha cheginish (terrasa): «f-qavatdan yuqorisi d m ichkariga» — barcha tomondan yoki bitta devordan.
 * Har cheginish oldingisining ustiga qoʻshiladi. Natija — qavat oraliqlari va ularning dogʻi.
 */
import { area, signedArea, type XY } from './geo';
import polygonClipping, { type Polygon, type MultiPolygon } from 'polygon-clipping';

/** inset > 0 — ichkariga (terrasa), < 0 — tashqariga (konsol) */
export interface Tier { from: number; inset: number; edge?: number }
export interface TierPart { f0: number; f1: number; ring: XY[] }

const ccw = (r: XY[]) => (signedArea(r) < 0 ? [...r].reverse() : r);
const inter = (p1: XY, d1: XY, p2: XY, d2: XY): XY | null => { const den = d1[0] * d2[1] - d1[1] * d2[0]; if (Math.abs(den) < 1e-9) return null; const t = ((p2[0] - p1[0]) * d2[1] - (p2[1] - p1[1]) * d2[0]) / den; return [p1[0] + d1[0] * t, p1[1] + d1[1] * t]; };

/** Qirralarni ichkariga siljitish: d[k] — k-qirra uchun masofa (CCW halqa) */
export function offsetEdges(r0: XY[], d: number[], grow = false): XY[] | null {
  const r = r0, n = r.length, lines: { p: XY; v: XY }[] = [];
  for (let k = 0; k < n; k++) {
    const a = r[k], b = r[(k + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, v: XY = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], nIn: XY = [-v[1], v[0]];
    lines.push({ p: [a[0] + nIn[0] * d[k], a[1] + nIn[1] * d[k]], v });
  }
  const out: XY[] = [];
  for (let k = 0; k < n; k++) { const A = lines[(k - 1 + n) % n], B = lines[k]; const q = inter(A.p, A.v, B.p, B.v); out.push(q ?? B.p); }
  if (signedArea(out) <= 1 || (!grow && area(out) > area(r) + 1e-6)) return null;
  // oʻz-oʻzini kesib oʻtmasin: har qirra yoʻnalishi saqlansin
  for (let k = 0; k < n; k++) { const a = out[k], b = out[(k + 1) % n], o = lines[k].v; if ((b[0] - a[0]) * o[0] + (b[1] - a[1]) * o[1] <= 0) return null; }
  return out;
}

/** Qisqa qirralar (< minEdge) va bir chiziqdagi uchlarni olib tashlash — terrasa konturi tekis boʻlsin */
export function cleanRing(r0: XY[], minEdge = 0.6): XY[] {
  let r = r0.slice();
  for (let g = 0; g < 60 && r.length > 3; g++) {
    let done = true;
    for (let k = 0; k < r.length; k++) {
      const a = r[(k - 1 + r.length) % r.length], b = r[k], c = r[(k + 1) % r.length];
      const L = Math.hypot(c[0] - b[0], c[1] - b[1]), cr = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
      if (L < minEdge) { r.splice(k, 1, [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2]); r.splice((k + 1) % r.length, 1); done = false; break; }
      if (cr < 0.05 * Math.max(1, Math.hypot(c[0] - a[0], c[1] - a[1]))) { r.splice(k, 1); done = false; break; }
    }
    if (done) break;
  }
  return r;
}

/** Barcha tomondan cheginish — koʻpburchakdan qirra koridorlarini ayirish (botiq shakllarda ham toza, tikanlarsiz) */
function insetAll(c: XY[], d: number): XY[] | null {
  const n = c.length, poly: Polygon = [[...c, c[0]].map(p => [p[0], p[1]] as [number, number])];
  const cors: Polygon[] = [];
  for (let k = 0; k < n; k++) {
    const a = c[k], b = c[(k + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, nx = -uy * d, ny = ux * d, ex = ux * d, ey = uy * d;
    // qirra atrofida d kenglikdagi tasma, uchlarda d ga uzaytirilgan (burchaklar ham qirqilsin)
    cors.push([[[a[0] - ex + nx, a[1] - ey + ny], [b[0] + ex + nx, b[1] + ey + ny], [b[0] + ex - nx, b[1] + ey - ny], [a[0] - ex - nx, a[1] - ey - ny], [a[0] - ex + nx, a[1] - ey + ny]]]);
  }
  let res: MultiPolygon;
  try { res = d > 0 ? polygonClipping.difference(poly, ...cors) : polygonClipping.union(poly, ...cors); } catch { return null; }
  let best: XY[] | null = null, ba = 0;
  for (const pp of res) { const ring = pp[0].slice(0, -1).map(q => [q[0], q[1]] as XY), ar = Math.abs(signedArea(ring)); if (ar > ba) { ba = ar; best = ring; } }
  if (!best || ba < 20) return null;
  const out = cleanRing(signedArea(best) < 0 ? best.reverse() : best);
  return out.length >= 3 ? out : null;
}

export function insetRing(r: XY[], d: number, edge?: number): XY[] | null {
  const c = ccw(r), flip = c !== r, n = c.length;
  if (edge == null) return insetAll(c, d);
  const e = flip ? (n - 2 - edge + n) % n : edge;   // teskari tartibda qirra raqami
  const out = offsetEdges(c, c.map((_, k) => (k === e ? d : 0)), d < 0);
  return out ? cleanRing(out, 0.3) : null;
}

export function tierParts(r: XY[], floors: number, tiers: Tier[] = []): TierPart[] {
  const list = [...tiers].filter(t => t.from >= 2 && t.from <= floors && t.inset !== 0).sort((a, b) => a.from - b.from);
  const out: TierPart[] = []; let cur = r, f = 0;
  for (const t of list) {
    const next = insetRing(cur, t.inset, cur === r ? t.edge : undefined); if (!next) continue;
    if (t.from - 1 > f) out.push({ f0: f, f1: t.from - 1, ring: cur });
    f = Math.max(f, t.from - 1); cur = next;
  }
  if (floors > f) out.push({ f0: f, f1: floors, ring: cur });
  return out;
}

/** Qavatlar maydoni (cheginishlar hisobga olingan) */
export function tieredGfa(r: XY[], floors: number, tiers?: Tier[]): number {
  return tierParts(r, floors, tiers).reduce((t, p) => t + area(p.ring) * (p.f1 - p.f0), 0);
}

/** Bitta devorni normal boʻyicha siljitish (itarish/tortish): + tashqariga */
export function pushEdge(r: XY[], edge: number, d: number): XY[] | null {
  const n = r.length, sgn = signedArea(r) >= 0 ? 1 : -1;
  const out = offsetEdges(sgn > 0 ? r : [...r].reverse(), (sgn > 0 ? r : [...r].reverse()).map((_, k) => (k === (sgn > 0 ? edge : (n - 2 - edge + n) % n) ? -d : 0)), true);
  if (!out) return null;
  return sgn > 0 ? out : [...out].reverse();
}
