/**
 * Qavatlar boʻyicha cheginish (terrasa): «f-qavatdan yuqorisi d m ichkariga» — barcha tomondan yoki bitta devordan.
 * Har cheginish oldingisining ustiga qoʻshiladi. Natija — qavat oraliqlari va ularning dogʻi.
 */
import { area, signedArea, type XY } from './geo';

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

export function insetRing(r: XY[], d: number, edge?: number): XY[] | null {
  const c = ccw(r), flip = c !== r, n = c.length;
  const e = edge == null ? null : flip ? (n - 2 - edge + n) % n : edge;   // teskari tartibda qirra raqami
  return offsetEdges(c, c.map((_, k) => (e == null || k === e ? d : 0)));
}

export function tierParts(r: XY[], floors: number, tiers: Tier[] = []): TierPart[] {
  const list = [...tiers].filter(t => t.from >= 2 && t.from <= floors && t.inset > 0).sort((a, b) => a.from - b.from);
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
