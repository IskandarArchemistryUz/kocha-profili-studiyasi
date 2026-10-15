/**
 * Seksiya generatori: kvartal ichida seksiyalardan iborat binolar.
 * Har bir seksiya — alohida bino yozuvi (oʻz izi, qavati, turi), shuning uchun chegaralari aniq koʻrinadi
 * va har birini alohida tahrirlash mumkin.
 *
 * Meʼyoriy cheklovlar (ShNQ 2.07.01-23, 79-band 2-jadval izohlari; claude/archemistry-bloklar-va-normalar.md):
 *  - izoh 8: seysmik 8+ ball — parallel uzun tomonlar orasi ≥ 2·Hmax  → qatorlar oraligʻi va hovli kengligi qavatni cheklaydi;
 *  - izoh 3: yopiq hovli fasadlari orasi ≥ 2,3·Hmax (yopiq perimetrda).
 */
import type { XY } from './geo';
import { signedArea, isSimple } from './geo';
import polygonClipping, { type Polygon } from 'polygon-clipping';

export type Typology = 'perimetr' | 'qatorlar';
export type SecKind = 'burchak' | 'oddiy' | 'qator';

export interface GenParams {
  typology: Typology;
  /** eng koʻp va eng kam qavat */
  maxF: number; minF: number;
  /** seksiya chuqurligi (eni), m */
  depth: number;
  /** seksiya uzunligi (moʻljal), m */
  secLen: number;
  /** qizil chiziqdan (kvartal chegarasidan) chekinish, m */
  setback: number;
  /** perimetrda har ~100 m da oʻtish (arka) qoldirish */
  passages: boolean;
  /** pastki noturar qavatlar (koʻchaga qaragan seksiyalarda) */
  nonRes: number;
}

export const DEFAULT_GEN: GenParams = { typology: 'perimetr', maxF: 12, minF: 5, depth: 15, secLen: 30, setback: 6, passages: true, nonRes: 1 };

export interface GenSection { ring: XY[]; floors: number; kind: SecKind; nonRes: number }
export interface GenResult { sections: GenSection[]; capFloors: number | null; notes: string[] }

const sub = (a: XY, b: XY): XY => [a[0] - b[0], a[1] - b[1]];
const add = (a: XY, b: XY): XY => [a[0] + b[0], a[1] + b[1]];
const mul = (a: XY, k: number): XY => [a[0] * k, a[1] * k];
const len = (a: XY) => Math.hypot(a[0], a[1]);
const unit = (a: XY): XY => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };
const cross = (a: XY, b: XY) => a[0] * b[1] - a[1] * b[0];

/** CCW halqa; qisqa qirralar va deyarli toʻgʻri burchaksiz uchlarni olib tashlash */
export function clean(r0: XY[], minEdge = 6): XY[] {
  let r = signedArea(r0) < 0 ? r0.slice().reverse() : r0.slice();
  for (let guard = 0; guard < 50 && r.length > 3; guard++) {
    let changed = false;
    for (let i = 0; i < r.length && r.length > 3; i++) {
      const p = r[(i - 1 + r.length) % r.length], c = r[i], n = r[(i + 1) % r.length];
      const a = unit(sub(c, p)), b = unit(sub(n, c));
      if (len(sub(n, c)) < minEdge || Math.abs(cross(a, b)) < 0.12 && a[0] * b[0] + a[1] * b[1] > 0) { r.splice(i, 1); changed = true; break; }
    }
    if (!changed) break;
  }
  return r;
}

/** Ichkariga ofset (CCW halqa, chap tomoni ichkari), uchlarda kesishma (miter) */
export function inset(r: XY[], d: number): XY[] | null {
  const n = r.length, out: XY[] = [];
  for (let i = 0; i < n; i++) {
    const p = r[(i - 1 + n) % n], c = r[i], q = r[(i + 1) % n];
    const u0 = unit(sub(c, p)), u1 = unit(sub(q, c)), n0: XY = [-u0[1], u0[0]], n1: XY = [-u1[1], u1[0]];
    const m = unit(add(n0, n1)), cos = m[0] * n0[0] + m[1] * n0[1];
    if (cos < 0.25) return null; // juda oʻtkir burchak
    out.push(add(c, mul(m, d / cos)));
  }
  if (!isSimple(out) || signedArea(out) <= 0) return null;
  return out;
}

/** Halqa ichidagi eng tor joy (OBB qisqa tomoni) — hovli kengligi taxmini */
function minWidth(r: XY[]): number {
  let best = Infinity;
  for (let i = 0; i < r.length; i++) {
    const a = r[i], b = r[(i + 1) % r.length], u = unit(sub(b, a)), v: XY = [-u[1], u[0]];
    let v0 = Infinity, v1 = -Infinity; for (const p of r) { const t = p[0] * v[0] + p[1] * v[1]; v0 = Math.min(v0, t); v1 = Math.max(v1, t); }
    best = Math.min(best, v1 - v0);
  }
  return best;
}

const FLOOR_H = 3.3;

export function generate(block: XY[], g: GenParams, floorH = FLOOR_H): GenResult {
  const notes: string[] = [];
  const outer0 = inset(clean(block), g.setback);
  if (!outer0) return { sections: [], capFloors: null, notes: ['Kvartal juda tor yoki shakli murakkab — chekinishdan keyin joy qolmadi'] };
  const A = clean(outer0, Math.max(6, g.depth * 0.6));
  return g.typology === 'qatorlar' ? rows(A, g, floorH, notes) : perimeter(A, g, floorH, notes);
}

function perimeter(A: XY[], g: GenParams, floorH: number, notes: string[]): GenResult {
  const D = g.depth, n = A.length;
  const inner = inset(A, D);
  if (!inner) return { sections: [], capFloors: null, notes: ['Kvartal perimetr uchun juda kichik — «qatorlar» ni sinab koʻring'] };
  // hovli: yopiq perimetr — 2,3·Hmax (izoh 3), oʻtishlar bilan — 2·Hmax (izoh 8, seysmik 8+)
  const wc = minWidth(inner), k = g.passages ? 2 : 2.3;
  const cap = Math.max(1, Math.floor(wc / k / floorH));
  if (cap < g.maxF) notes.push(`Hovli eni ${Math.round(wc)} m → qavat ≤ ${cap} (ShNQ 2.07.01-23, 79-band 2-jadval, izoh ${g.passages ? 8 : 3}: ${k.toString().replace('.', ',')}·Hmax)`);
  const maxF = Math.min(g.maxF, cap), minF = Math.min(g.minF, maxF);
  const sections: GenSection[] = [];
  const P = (i: number) => A[(i + n) % n];
  const U = (i: number) => unit(sub(P(i + 1), P(i))), N = (i: number): XY => { const u = U(i); return [-u[1], u[0]]; };
  const L = (i: number) => len(sub(P(i + 1), P(i)));
  const convex = (i: number) => cross(U(i - 1), U(i)) > 0.2; // i-uch qavariq (yetarli burilish)
  // har qirra uchun burchak qoʻllari (uchlardan masofa)
  const arm = D + Math.min(8, g.secLen * 0.3);
  const a0: number[] = [], a1: number[] = [];
  for (let i = 0; i < n; i++) {
    let s = convex(i) ? arm : D, e = convex(i + 1) ? arm : D;
    if (s + e > L(i) - 4) { const k2 = (L(i) - 1) / (s + e); s *= k2; e *= k2; }
    a0.push(s); a1.push(e);
  }
  // qavat taqsimoti: burchaklar baland; janubga qaragan qirra (tashqi normal −y) past — hovliga quyosh tushsin
  const southward = (i: number) => -N(i)[1] < -0.55; // tashqi normal = −N
  const edgeMax = (i: number) => southward(i) ? Math.max(minF, Math.round((maxF + minF) / 2)) : maxF;
  for (let i = 0; i < n; i++) {
    // burchak seksiyasi (i-uchda): oldingi qirra oxiri + shu qirra boshi
    if (convex(i)) {
      const pi = i - 1, O1 = add(P(pi), mul(U(pi), L(pi) - a1[(pi + n) % n])), O2 = add(P(i), mul(U(i), a0[i]));
      const ring: XY[] = [O1, P(i), O2, add(O2, mul(N(i), D)), inner[i], add(O1, mul(N(pi), D))];
      if (isSimple(ring) && signedArea(ring) > 0) sections.push({ ring, floors: Math.max(edgeMax(i), edgeMax(pi)), kind: 'burchak', nonRes: g.nonRes });
    }
    // oraliq seksiyalar
    const t0 = a0[i], t1 = L(i) - a1[i], span = t1 - t0;
    if (span < 8) continue;
    const gaps: number[] = [];
    if (g.passages && span > 70) { const m = Math.max(1, Math.floor(span / 100)); for (let k = 1; k <= m; k++) gaps.push(t0 + span * k / (m + 1)); }
    const cuts: number[][] = []; // [boshi, oxiri] boʻlaklar (oʻtishlar 6 m)
    let s = t0; for (const gp of gaps) { cuts.push([s, gp - 3]); s = gp + 3; } cuts.push([s, t1]);
    let idx = 0;
    for (const [c0, c1] of cuts) {
      const m = Math.max(1, Math.round((c1 - c0) / g.secLen)), step = (c1 - c0) / m;
      for (let k = 0; k < m; k++, idx++) {
        const ta = c0 + k * step, tb = ta + step;
        const oa = add(P(i), mul(U(i), ta)), ob = add(P(i), mul(U(i), tb));
        const ring: XY[] = [oa, ob, add(ob, mul(N(i), D)), add(oa, mul(N(i), D))];
        // burchakdan uzoqlashgan sari pasayadi (zinapoya)
        const fromCorner = Math.min(ta - t0, t1 - tb) / Math.max(1, span / 2);
        const top = edgeMax(i), f = Math.round(top - (top - minF) * Math.min(1, fromCorner * 1.4));
        sections.push({ ring, floors: Math.max(minF, f), kind: 'oddiy', nonRes: g.nonRes });
      }
    }
  }
  if (!sections.length) notes.push('Seksiya joylashmadi — parametrlarni kamaytiring');
  return { sections, capFloors: cap, notes };
}

function rows(A: XY[], g: GenParams, floorH: number, notes: string[]): GenResult {
  // meridional qatorlar (uzun oʻqi shimol–janub): Toshkentda sharq va gʻarb fasadlari quyosh oladi
  const D = g.depth, H = g.maxF * floorH, gap = Math.max(2 * H, 20); // izoh 8: ≥ 2·Hmax
  notes.push(`Qatorlar orasi ${Math.round(gap)} m = 2·Hmax (ShNQ 2.07.01-23, 79-band 2-jadval, izoh 8)`);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of A) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  const poly: Polygon = [[...A, A[0]].map(p => [p[0], p[1]] as [number, number])];
  const sections: GenSection[] = [];
  const count = Math.max(1, Math.floor((x1 - x0 - D) / (D + gap)) + 1), used = (count - 1) * (D + gap) + D, xs = x0 + (x1 - x0 - used) / 2;
  for (let k = 0; k < count; k++) {
    const bx = xs + k * (D + gap);
    for (let y = y0; y < y1 - 6; y += g.secLen) {
      const rect: Polygon = [[[bx, y], [bx + D, y], [bx + D, Math.min(y1, y + g.secLen)], [bx, Math.min(y1, y + g.secLen)], [bx, y]]];
      let parts: [number, number][][][] = [];
      try { parts = polygonClipping.intersection(rect, poly); } catch { continue; }
      for (const p of parts) {
        const ring = p[0].slice(0, -1).map(q => [q[0], q[1]] as XY);
        if (Math.abs(signedArea(ring)) < D * 10) continue;
        sections.push({ ring: signedArea(ring) < 0 ? ring.reverse() : ring, floors: g.maxF, kind: 'qator', nonRes: 0 });
      }
    }
  }
  if (!sections.length) notes.push('Qator sigʻmadi — chuqurlik yoki qavatni kamaytiring');
  return { sections, capFloors: Math.floor(gap / 2 / floorH), notes };
}
