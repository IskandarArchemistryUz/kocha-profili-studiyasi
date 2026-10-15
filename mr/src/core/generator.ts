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

export type Typology = 'avto' | 'yakka' | 'taunhaus' | 'villa' | 'perimetr' | 'qatorlar' | 'minora' | 'blok_minora' | 'blok_villa';
export type SecKind = 'burchak' | 'oddiy' | 'qator' | 'uy' | 'taunhaus' | 'villa' | 'minora' | 'stilobat';
export type ParkingKind = 'yoq' | 'yer_osti' | 'stilobat' | 'yer_usti';

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
  /** maqsadli UMN (FAR); 0 — oʻchiq. Berilsa, qavatlar shu qiymatga yaqinlashtiriladi (maxF — yuqori chegara) */
  far?: number;
  /** minora qavati */
  towerF?: number;
  /** stilobat qavatlari (0 — yoʻq) */
  stylobate?: number;
  parking?: ParkingKind;
  /** yer osti qavatlari */
  parkLevels?: number;
}

export const DEFAULT_GEN: GenParams = { typology: 'perimetr', maxF: 12, minF: 5, depth: 15, secLen: 30, setback: 6, passages: true, nonRes: 1, far: 0, towerF: 16, stylobate: 0, parking: 'yoq', parkLevels: 1 };

/** face — hovliga qaragan fasad oʻrtasi va ichkari normal (qarshidagi binogacha masofa uchun) */
export interface GenSection { ring: XY[]; floors: number; kind: SecKind; nonRes: number; face?: { p: XY; n: XY }; /** pastki sathi (qavatlarda) — stilobat ustidagi seksiyalar uchun */ z0?: number; use?: string }
export interface GenParking { kind: Exclude<ParkingKind, 'yoq'>; ring: XY[]; levels: number; spaces: number }
export interface GenResult { sections: GenSection[]; capFloors: number | null; notes: string[]; parking?: GenParking; typology?: Typology; far?: number }

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

export function generateBase(block: XY[], g: GenParams, floorH = FLOOR_H): GenResult {
  const notes: string[] = [];
  const outer0 = inset(clean(block), g.setback);
  if (!outer0) return { sections: [], capFloors: null, notes: ['Kvartal juda tor yoki shakli murakkab — chekinishdan keyin joy qolmadi'] };
  const A = clean(outer0, Math.max(6, g.depth * 0.6));
  if (g.typology === 'qatorlar') return rows(A, g, floorH, notes);
  // toza perimetr (L-burchaklar) faqat qavariq va yetarli keng kvartalda; aks holda — istalgan shakl uchun zaxira algoritm
  const allConvex = A.every((_, i) => cross(unit(sub(A[i], A[(i - 1 + A.length) % A.length])), unit(sub(A[(i + 1) % A.length], A[i]))) > -0.05);
  let r = allConvex && inset(A, g.depth) ? perimeter(A, g, floorH, notes) : null;
  // hovli shunchalik torki, minimal qavat ham sigʻmaydi — yopiq perimetr oʻrniga qirralar boʻylab (qarshi qatorlar olib tashlanadi)
  if (!r || !r.sections.length || (r.capFloors != null && r.capFloors < g.minF)) { notes.length = 0; r = edgeFill(A, g, notes); }
  facingCap(r, g, floorH);
  return r;
}

/** Istalgan shakl: uzun qirralardan boshlab qirra boʻylab seksiyalar, kvartalga qirqiladi, oldingilari bilan kesishmaydi */
export function edgeFill(A: XY[], g: GenParams, notes: string[]): GenResult {
  const D = g.depth, n = A.length, sections: GenSection[] = [];
  const poly: Polygon = [[...A, A[0]].map(p => [p[0], p[1]] as [number, number])];
  let placed: Polygon[] = [];
  const order = A.map((_, i) => i).sort((a, b) => len(sub(A[(b + 1) % n], A[b])) - len(sub(A[(a + 1) % n], A[a])));
  const southward = (N: XY) => N[1] > 0.55; // ichkari normal shimolga → qirra janubda
  for (const i of order) {
    const a = A[i], b = A[(i + 1) % n], L = len(sub(b, a)); if (L < Math.min(g.secLen * 0.6, 14)) continue;
    const u = unit(sub(b, a)), N: XY = [-u[1], u[0]], m = Math.max(1, Math.round(L / g.secLen)), step = L / m;
    for (let k = 0; k < m; k++) {
      const oa = add(a, mul(u, k * step)), ob = add(a, mul(u, (k + 1) * step));
      const rect: Polygon = [[oa, ob, add(ob, mul(N, D)), add(oa, mul(N, D)), oa].map(p => [p[0], p[1]] as [number, number])];
      let piece: [number, number][][][] = [];
      try { piece = polygonClipping.intersection(rect, poly); if (placed.length && piece.length) piece = polygonClipping.difference(piece, ...placed); } catch { continue; }
      let best: XY[] | null = null, ba = 0;
      for (const pp of piece) { const r = pp[0].slice(0, -1).map(q => [q[0], q[1]] as XY), ar = Math.abs(signedArea(r)); if (ar > ba) { ba = ar; best = r; } }
      if (!best || ba < 0.45 * D * step || ba < 80) continue;
      const ring = signedArea(best) < 0 ? best.reverse() : best;
      placed.push([[...ring, ring[0]].map(p => [p[0], p[1]] as [number, number])]);
      const fromEnd = Math.min(k, m - 1 - k) / Math.max(1, (m - 1) / 2);
      const top = southward(N) ? Math.max(g.minF, Math.round((g.maxF + g.minF) / 2)) : g.maxF;
      sections.push({ ring, floors: Math.max(g.minF, Math.round(top - (top - g.minF) * Math.min(1, fromEnd))), kind: 'oddiy', nonRes: g.nonRes, face: { p: add(mul(add(oa, ob), 0.5), mul(N, D)), n: N } });
    }
  }
  if (!sections.length) notes.push('Seksiya joylashmadi — chuqurlik yoki chekinishni kamaytiring');
  return { sections, capFloors: null, notes };
}

/** Koʻpburchakka nur boʻyicha kirish masofasi */
function rayHit(p: XY, d: XY, r: XY[]): number {
  let best = Infinity;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const a = r[j], b = r[i], ex = b[0] - a[0], ey = b[1] - a[1], den = d[0] * ey - d[1] * ex; if (Math.abs(den) < 1e-12) continue;
    const t = ((a[0] - p[0]) * ey - (a[1] - p[1]) * ex) / den, s = ((a[0] - p[0]) * d[1] - (a[1] - p[1]) * d[0]) / den;
    if (t > 0.5 && s >= 0 && s <= 1 && t < best) best = t;
  }
  return best;
}

/**
 * Qarshidagi seksiyagacha masofa → qavat cheklovi: seysmik 8+ ballda parallel uzun tomonlar orasi ≥ 2·Hmax
 * (ShNQ 2.07.01-23, 79-band 2-jadval, izoh 8). Ikkala seksiya ham cheklanadi.
 */
function facingCap(r: GenResult, g: GenParams, floorH: number): void {
  // 1) qarshidagi qator meʼyoriy minimal qavatga ham sigʻmasa — keyin joylashganini (qisqaroq qirra) olib tashlaymiz:
  //    tor kvartalda bir tomonlama, lekin balandroq qurilish qavat soni 1–2 gacha tushirilgan ikki qatordan yaxshiroq
  let removed = 0;
  for (let guard = 0; guard < 200; guard++) {
    let worst: [number, number] | null = null, wd = Infinity;
    r.sections.forEach((s, i) => {
      if (!s.face) return;
      r.sections.forEach((o, k) => { if (k === i) return; const t = rayHit(s.face!.p, s.face!.n, o.ring); if (t < wd) { wd = t; worst = [i, k]; } });
    });
    if (!worst || wd / 2 / floorH >= g.minF) break;
    const [i, k] = worst as [number, number]; r.sections.splice(Math.max(i, k), 1); removed++;
  }
  if (removed) r.notes.push(`${removed} ta seksiya olib tashlandi: qarshidagi binogacha masofa ${g.minF} qavatga ham yetmaydi (≥ 2·H, ShNQ 2.07.01-23, 79-band 2-jadval, izoh 8)`);
  // 2) qolganlarida — masofa boʻyicha qavat cheklovi
  let cut = 0;
  r.sections.forEach((s, i) => {
    if (!s.face) return;
    let d = Infinity, j = -1;
    r.sections.forEach((o, k) => { if (k === i) return; const t = rayHit(s.face!.p, s.face!.n, o.ring); if (t < d) { d = t; j = k; } });
    if (!Number.isFinite(d) || d > 200) return;
    const cap = Math.max(g.minF, Math.floor(d / 2 / floorH));
    for (const x of [s, r.sections[j]]) if (x.floors > cap) { x.floors = cap; cut++; }
  });
  if (cut) r.notes.push(`${cut} ta seksiyaning qavati qarshidagi binogacha masofa boʻyicha kamaytirildi (≥ 2·H, izoh 8)`);
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
        sections.push({ ring, floors: Math.max(minF, f), kind: 'oddiy', nonRes: g.nonRes, face: { p: add(mul(add(oa, ob), 0.5), mul(N(i), D)), n: N(i) } });
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

/* ====================== tipologiyalar ====================== */

const aOf = (r: XY[]) => Math.abs(signedArea(r));
const inside = (p: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
const longestAngle = (r: XY[]) => { let best = 0, bl = -1; for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length], L = len(sub(b, a)); if (L > bl) { bl = L; best = Math.atan2(b[1] - a[1], b[0] - a[0]); } } return best; };

/** Nuqtali binolar (villa, minora) toʻri: kvadrat dogʻ `size`, oraliq `gap`, A ichiga toʻliq sigʻadiganlari; avoid — band joylar */
function points(A: XY[], size: number, gap: number, avoid: XY[][] = []): XY[][] {
  const ang = longestAngle(A), c = Math.cos(ang), s = Math.sin(ang), rot = (p: XY): XY => [p[0] * c + p[1] * s, -p[0] * s + p[1] * c], un = (p: XY): XY => [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const p of A.map(rot)) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  const step = size + gap, nx = Math.max(1, Math.floor((x1 - x0 + gap) / step)), ny = Math.max(1, Math.floor((y1 - y0 + gap) / step));
  const ox = x0 + (x1 - x0 - (nx * step - gap)) / 2, oy = y0 + (y1 - y0 - (ny * step - gap)) / 2, out: XY[][] = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const q = ([[0, 0], [size, 0], [size, size], [0, size]] as XY[]).map(p => un([ox + i * step + p[0], oy + j * step + p[1]]));
    if (q.every(p => inside(p, A)) && !avoid.some(av => q.some(p => inside(p, av)) || av.some(p => inside(p, q)))) out.push(q);
  }
  return out;
}

/** Halqani markaziga nisbatan k marta kichraytirish */
const shrink = (r: XY[], k: number): XY[] => { const c = r.reduce((a, p) => add(a, p), [0, 0] as XY); const m = mul(c, 1 / r.length); return r.map(p => add(m, mul(sub(p, m), k))); };

function typoCore(block: XY[], t: Typology, g: GenParams, floorH: number): GenResult {
  const notes: string[] = [];
  const outer0 = inset(clean(block), g.setback);
  if (!outer0) return { sections: [], capFloors: null, notes: ['Kvartal juda tor — chekinishdan keyin joy qolmadi'] };
  const A = clean(outer0, 6), tf = Math.max(g.towerF ?? 16, g.minF);
  switch (t) {
    case 'yakka': case 'taunhaus': {
      const D = t === 'yakka' ? 12 : 12, L = t === 'yakka' ? 20 : 7;
      const r = edgeFill(A, { ...g, depth: D, secLen: L, minF: 1, maxF: 3 }, notes);
      r.sections = r.sections.map(s => ({ ...s, ring: t === 'yakka' ? shrink(s.ring, 0.6) : s.ring, floors: t === 'yakka' ? 2 : 3, kind: t === 'yakka' ? 'uy' : 'taunhaus', nonRes: 0, face: undefined }));
      if (t === 'yakka') notes.push('Yakka uylar: uchastka eni 20 m, uy dogʻi ~12×7 m, 2 qavat (75-band: yakka uy uchastkasi 400 m²)');
      return r;
    }
    case 'villa': {
      const H = g.maxF * floorH, gap = Math.max(18, 0.6 * H);
      const sq = points(A, 20, gap);
      notes.push(`Villalar orasi ${Math.round(gap)} m — derazali toretslar orasi (H1+H2)·0,3 (79-band 2-jadval) va ≥ 18 m`);
      return { sections: sq.map(ring => ({ ring, floors: g.maxF, kind: 'villa' as SecKind, nonRes: 0 })), capFloors: null, notes };
    }
    case 'minora': {
      const H = tf * floorH, gap = Math.max(25, 0.6 * H);
      const sq = points(A, 24, gap);
      notes.push(`Minoralar orasi ${Math.round(gap)} m — (H1+H2)·0,3 (79-band 2-jadval), ≥ 25 m`);
      return { sections: sq.map(ring => ({ ring, floors: tf, kind: 'minora' as SecKind, nonRes: g.nonRes })), capFloors: null, notes };
    }
    case 'blok_minora': {
      const r = generateBase(block, { ...g, typology: 'perimetr' }, floorH);
      // shimoliy burchak(lar) — minora (janubiy hovliga soya tushmasin)
      const corners = r.sections.map((s, i) => ({ s, i, y: s.ring.reduce((a, p) => a + p[1], 0) / s.ring.length })).filter(x => x.s.kind === 'burchak').sort((a, b) => b.y - a.y).slice(0, 2);
      corners.forEach(c => { c.s.floors = tf; c.s.kind = 'minora'; });
      if (corners.length) r.notes.push(`${corners.length} ta shimoliy burchak — ${tf} qavatli minora (hovliga soya tushirmasligi uchun shimolda)`);
      return r;
    }
    case 'blok_villa': {
      const r = generateBase(block, { ...g, typology: 'perimetr' }, floorH);
      const court = inset(A, g.depth + 20);
      if (court) {
        const v = points(court, 18, Math.max(18, 0.6 * 5 * floorH), r.sections.map(s => s.ring));
        r.sections.push(...v.map(ring => ({ ring, floors: Math.min(5, g.maxF), kind: 'villa' as SecKind, nonRes: 0 })));
        if (v.length) r.notes.push(`Hovli ichida ${v.length} ta villa (≤ 5 qavat)`);
      }
      return r;
    }
    default: return generateBase(block, { ...g, typology: t === 'qatorlar' ? 'qatorlar' : 'perimetr' }, floorH);
  }
}

/** UMN boʻyicha avtomatik tipologiya (Planimetric dagi kabi chegaralar: 0,6 / 1,3 / 3,5) */
export function autoTypology(far: number): Typology { return far < 0.6 ? 'yakka' : far < 1.3 ? 'villa' : far < 3.5 ? 'perimetr' : 'blok_minora'; }

const gfaOf = (r: GenResult) => r.sections.reduce((s, x) => s + aOf(x.ring) * x.floors, 0);

/** Asosiy kirish: tipologiya, maqsadli UMN, stilobat va parkovka */
export function generate(block: XY[], g: GenParams, floorH = FLOOR_H): GenResult {
  const site = aOf(clean(block));
  const far = g.far ?? 0;
  const t: Typology = g.typology === 'avto' ? autoTypology(far || 2) : g.typology;
  let r: GenResult;
  if (far > 0 && !['yakka', 'taunhaus'].includes(t)) {
    // maxF ni minF…maxF oraligʻida tanlash: UMN maqsadga eng yaqin (oshmasdan afzal)
    let best: GenResult | null = null, bd = Infinity;
    for (let f = Math.max(1, g.minF); f <= Math.max(g.minF, g.maxF); f++) {
      const gg = { ...g, maxF: f, towerF: Math.max(f, Math.min(g.towerF ?? 16, f + 6)) }, rr = typoCore(block, t, gg, floorH), v = gfaOf(rr) / site;
      const d = Math.abs(v - far) + (v > far ? 0.15 : 0);
      if (d < bd) { bd = d; best = rr; }
    }
    r = best ?? typoCore(block, t, g, floorH);
  } else r = typoCore(block, t, g, floorH);
  r.typology = t;
  if (g.typology === 'avto') r.notes.unshift(`Avto: UMN ${String(far || 2).replace('.', ',')} → «${TYPO_NAME[t]}»`);
  // stilobat: chekinish ichidagi butun maydon, seksiyalar uning ustida
  const st = Math.max(0, Math.round(g.stylobate ?? 0)), outer = inset(clean(block), g.setback);
  const podiumOk = st > 0 && outer && ['perimetr', 'qatorlar', 'minora', 'blok_minora'].includes(t);
  if (podiumOk) {
    r.sections = r.sections.map(s => ({ ...s, z0: st, nonRes: 0 }));
    r.sections.unshift({ ring: clean(outer!, 6), floors: st, kind: 'stilobat', nonRes: st, use: g.parking === 'stilobat' ? 'avtoturargoh' : 'savdo' });
  }
  // parkovka
  const pk = g.parking ?? 'yoq';
  if (pk !== 'yoq' && outer) {
    const A = clean(outer, 6), area = aOf(A), lv = Math.max(1, Math.round(g.parkLevels ?? 1));
    if (pk === 'yer_osti') r.parking = { kind: pk, ring: A, levels: lv, spaces: Math.floor(area * 0.85 * lv / 30) };
    else if (pk === 'stilobat') { if (podiumOk) r.parking = { kind: pk, ring: A, levels: st, spaces: Math.floor(area * 0.85 * st / 30) }; else r.notes.push('Stilobat ichida parkovka uchun stilobat qavatini kiriting'); }
    else { const built = r.sections.filter(s => !s.z0 && s.kind !== 'stilobat').reduce((s, x) => s + aOf(x.ring), 0); r.parking = { kind: pk, ring: A, levels: 1, spaces: Math.floor(Math.max(0, area - built) * 0.35 / 25) }; }
    if (r.parking) r.notes.push(`Parkovka: ${r.parking.spaces} joy (${PARK_NAME[pk]}${pk === 'yer_usti' ? ' — boʻsh hovlining 35 %, 413-band: 25 m²/joy' : ' — 30 m²/joy brutto, taxmin'})`);
  }
  r.far = (gfaOf(r)) / site;
  return r;
}

export const TYPO_NAME: Record<Typology, string> = { avto: 'Avto (UMN boʻyicha)', yakka: 'Yakka uylar', taunhaus: 'Taunhauslar', villa: 'Shahar villalari', perimetr: 'Perimetral blok', qatorlar: 'Meridional qatorlar', minora: 'Minoralar', blok_minora: 'Blok + burchak minorasi', blok_villa: 'Blok + villalar' };
export const PARK_NAME: Record<ParkingKind, string> = { yoq: 'Yoʻq', yer_osti: 'Yer osti', stilobat: 'Stilobat ichida', yer_usti: 'Yer usti' };
