/**
 * Seksiya generatori: kvartal ichida seksiyalardan iborat binolar.
 * Har bir seksiya — alohida bino yozuvi (oʻz izi, qavati, turi), shuning uchun chegaralari aniq koʻrinadi
 * va har birini alohida tahrirlash mumkin.
 *
 * Meʼyoriy cheklovlar (ShNQ 2.07.01-23, 79-band 2-jadval izohlari; claude/archemistry-bloklar-va-normalar.md):
 *  - izoh 8: seysmik 8+ ball — parallel uzun tomonlar orasi ≥ 2·Hmax  → qatorlar oraligʻi va hovli kengligi qavatni cheklaydi;
 *  - izoh 3: yopiq hovli fasadlari orasi ≥ 2,3·Hmax (yopiq perimetrda).
 */
import { insetRobust } from './offset';
import { freeRect } from './labels';
import type { XY } from './geo';
import { signedArea, isSimple } from './geo';
import polygonClipping, { type Polygon } from 'polygon-clipping';
import { squareSections, avoidObstacles, assignEnds, type Obstacle3 } from './genfix';
import { lowriseBlock } from './lowrise';
import { layoutStalls, trimStalls, parkAccess, parkingNeed, sumNeed, stallGross, PARK_MOD, type ParkModule, type Obstacle } from './parking';

export type Typology = 'avto' | 'yakka' | 'taunhaus' | 'juft' | 'hovli' | 'villa' | 'perimetr' | 'qatorlar' | 'minora' | 'blok_minora' | 'blok_villa' | 'ofis_plita' | 'ofis_minora' | 'savdo_blok';
export type SecKind = 'burchak' | 'oddiy' | 'qator' | 'uy' | 'taunhaus' | 'villa' | 'minora' | 'stilobat' | 'savdo' | 'arka';
export type ParkingKind = 'yoq' | 'yer_osti' | 'stilobat' | 'yer_usti';

export interface GenParams {
  typology: Typology;
  /** eng koʻp va eng kam qavat */
  maxF: number; minF: number;
  /** seksiya chuqurligi (eni), m */
  depth: number;
  /** seksiya uzunligi (moʻljal), m */
  secLen: number;
  /** seysmik boʻlma uzunligi chegarasi, m (QMQ 2.01.03-19, 3.1-jadval) — seksiya va birlashgan boʻlak shundan oshmaydi */
  maxLen?: number;
  /** seysmik rejim: chiqib turgan qism chegarasi, m (3.1.1) — burchak L qoʻli shundan oshmaydi, burchak seksiyalari birlashtirilmaydi (chok) */
  maxProj?: number;
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
  /** yer osti qavatlari (meʼyor boʻyicha oʻchiq boʻlsa) */
  parkLevels?: number;
  /** joylashtirish moduli (dizayn-kod 6.3) */
  parkModule?: ParkModule;
  /** seksiya uzunligi aniq (secLen × depth); oʻchiq — qirra teng boʻlaklarga boʻlinadi (secLen — moʻljal) */
  exact?: boolean;
  /** joylar soni 29-jadval talabi boʻyicha (yer osti sathlari avtomatik) */
  parkNorm?: boolean;
}
/** Talab hisobi uchun loyiha sozlamalari */
export interface GenOpts { use?: string; aptNet?: number; netToGross?: number; /** toʻsiqlar (mahalliy metr): saqlanadigan mavjud, qoʻlda chizilgan va boshqa guruh binolari, h — balandlik (m) */ avoid?: Obstacle3[] }

export const DEFAULT_GEN: GenParams = { typology: 'perimetr', maxF: 12, minF: 5, depth: 15, secLen: 30, setback: 6, passages: true, nonRes: 1, far: 0, towerF: 16, stylobate: 0, parking: 'yoq', parkLevels: 1, parkModule: 'p90', parkNorm: true };

/** face — hovliga qaragan fasad oʻrtasi va ichkari normal (qarshidagi binogacha masofa uchun) */
export interface GenSection { ring: XY[]; floors: number; kind: SecKind; nonRes: number; /** past qavatli uy uchastkasi (lowrise) */ plot?: XY[]; /** derazasiz torets qirralari (ring[i]→ring[i+1]); generatsiyada belgilanadi */ blind?: number[]; face?: { p: XY; n: XY }; /** pastki sathi (qavatlarda) — stilobat ustidagi seksiyalar uchun */ z0?: number; use?: string }
export interface GenParking { kind: Exclude<ParkingKind, 'yoq'>; ring: XY[]; levels: number; spaces: number; need?: number; module?: ParkModule; stalls?: XY[][]; aisles?: XY[][] }
export interface GenResult { sections: GenSection[]; capFloors: number | null; notes: string[]; parking?: GenParking; typology?: Typology; far?: number }

const sub = (a: XY, b: XY): XY => [a[0] - b[0], a[1] - b[1]];
const add = (a: XY, b: XY): XY => [a[0] + b[0], a[1] + b[1]];
const mul = (a: XY, k: number): XY => [a[0] * k, a[1] * k];
const len = (a: XY) => Math.hypot(a[0], a[1]);
const unit = (a: XY): XY => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };
const cross = (a: XY, b: XY) => a[0] * b[1] - a[1] * b[0];

/** 12-band: aniq oʻlcham statistikasi (generate() da nolga tushiriladi) */
let XS = { full: 0, short: 0, gap: 0, stretch: 0 };
/**
 * Qirra oraligʻini [c0, c1] seksiyalarga boʻlish.
 * Moʻljal rejimi — teng boʻlaklar (uzunlik ≈ len). Aniq rejim — har seksiya aynan len; qoldiq ≥ 9 m — qisqa seksiya (oxirida),
 * 3–9 m — oraliq (oʻrtada; bitta seksiyada — oxirida), < 3 m — oxirgi seksiyaga qoʻshiladi (izohda koʻrsatiladi).
 */
function spans(c0: number, c1: number, len: number, exact: boolean, maxLen?: number): [number, number][] {
  const span = c1 - c0, out: [number, number][] = [];
  // teng boʻlaklar: seysmik chegara berilsa — boʻlak undan oshmasin (yaxlitlash 1,5·len gacha chiqarishi mumkin edi)
  if (!exact) { const m = Math.max(1, Math.round(span / len), maxLen ? Math.ceil(span / maxLen - 1e-6) : 1), st = span / m; for (let k = 0; k < m; k++) out.push([c0 + k * st, c0 + (k + 1) * st]); return out; }
  const m = Math.floor(span / len + 1e-6), rem = span - m * len;
  if (m === 0) { XS.short++; return [[c0, c1]]; }
  if (rem < 0.5) { for (let k = 0; k < m; k++) out.push([c0 + k * len, c0 + (k + 1) * len]); XS.full += m; return out; }
  if (rem >= 9) { for (let k = 0; k < m; k++) out.push([c0 + k * len, c0 + (k + 1) * len]); out.push([c0 + m * len, c1]); XS.full += m; XS.short++; return out; }
  if (rem >= 3) {
    const a = m >= 2 ? Math.ceil(m / 2) : m; let t = c0;   // bitta seksiyada — oraliq oxirida
    for (let k = 0; k < m; k++) { if (k === a) t += rem; out.push([t, t + len]); t += len; }
    XS.full += m; XS.gap++; return out;
  }
  for (let k = 0; k < m; k++) out.push([c0 + k * len, k === m - 1 ? c1 : c0 + (k + 1) * len]);
  XS.full += m - 1; XS.stretch++; return out;
}

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
  return insetMiter(r, d) ?? (d > 0 ? insetRobust(r, d, 20) : null);   // oʻtkir burchak / botiq shakl — tasma ayirish usuli
}
function insetMiter(r: XY[], d: number): XY[] | null {
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
/** arka ostidagi ochiq balandlik, qavatlarda (2 × 3,3 = 6,6 m ≥ 4,25 m) */
export const ARCH_F = 2;

export function generateBase(block: XY[], g: GenParams, floorH = FLOOR_H): GenResult {
  const notes: string[] = [];
  const outer0 = inset(clean(block), g.setback);
  if (!outer0) return { sections: [], capFloors: null, notes: ['Kvartal juda tor yoki shakli murakkab — chekinishdan keyin joy qolmadi'] };
  const A = clean(outer0, Math.max(6, g.depth * 0.6));
  if (g.typology === 'qatorlar') return rows(A, g, floorH, notes);
  // toza perimetr (L-burchaklar) faqat qavariq va yetarli keng kvartalda; aks holda — istalgan shakl uchun zaxira algoritm
  const allConvex = A.every((_, i) => cross(unit(sub(A[i], A[(i - 1 + A.length) % A.length])), unit(sub(A[(i + 1) % A.length], A[i]))) > -0.05);
  // perimetrning L-burchak mantigʻi ~90° burchak uchun; oʻtkir (< 50°) burchakda burchak seksiyasi qurilmay, qoʻshni seksiyalar
  // ustma-ust tushardi va qatorda oraliq qolardi (egasi, 21.10, 24-band) — bunday kvartal qirralar boʻylab toʻldiriladi
  const minAng = Math.min(...A.map((_, i) => { const u1 = unit(sub(A[i], A[(i - 1 + A.length) % A.length])), u2 = unit(sub(A[(i + 1) % A.length], A[i])); return Math.acos(Math.max(-1, Math.min(1, -(u1[0] * u2[0] + u1[1] * u2[1])))) * 180 / Math.PI; }));
  // toʻgʻri burchakli (90° ± 12°) qavariq kvartal — klassik perimetr; qolgani — faqat toʻgʻri toʻrtburchak seksiyalar (orthoFill):
  // qiya qirrali parselda seksiya chegaradan chekinadi, shakli buzilmaydi (27.10, tester: «qiyshiq, noodatiy formalar»)
  const maxDev = Math.max(...A.map((_, i) => { const u1 = unit(sub(A[i], A[(i - 1 + A.length) % A.length])), u2 = unit(sub(A[(i + 1) % A.length], A[i])); return Math.abs(Math.acos(Math.max(-1, Math.min(1, -(u1[0] * u2[0] + u1[1] * u2[1])))) * 180 / Math.PI - 90); }));
  let r = allConvex && minAng >= 50 && maxDev <= 12 && insetMiter(A, g.depth) ? perimeter(A, g, floorH, notes) : null;
  // hovli shunchalik torki, minimal qavat ham sigʻmaydi — yopiq perimetr oʻrniga qirralar boʻylab (qarshi qatorlar olib tashlanadi)
  if (!r || !r.sections.length || (r.capFloors != null && r.capFloors < g.minF)) { notes.length = 0; r = orthoFill(A, g, notes); }
  facingCap(r, g, floorH);
  return r;
}

/**
 * Istalgan shakl: uzun qirralardan boshlab qirra boʻylab tasma (chuqurlik D) — kvartalga qirqiladi, oldin joylanganlardan
 * ayiriladi; qolgan BOʻSH qism butunicha seksiyalarga boʻlinadi (oraliq qolmaydi). Burchakda qolgan kichik boʻlak — qoʻshni
 * seksiyaga qoʻshiladi (L-shakl), alohida «uzilgan» boʻlak boʻlib qolmaydi.
 */
export function edgeFill(A: XY[], g: GenParams, notes: string[]): GenResult {
  const D = g.depth, n = A.length, sections: GenSection[] = [];
  const P = (r: XY[]): Polygon => [[...r, r[0]].map(p => [p[0], p[1]] as [number, number])];
  const poly: Polygon = P(A);
  const placed: Polygon[] = [];
  const meta: { edge: number; first: boolean; last: boolean }[] = [];
  const order = A.map((_, i) => i).sort((a, b) => len(sub(A[(b + 1) % n], A[b])) - len(sub(A[(a + 1) % n], A[a])));
  const southward = (N: XY) => N[1] > 0.55; // ichkari normal shimolga → qirra janubda
  const ringsOf = (mp: [number, number][][][]): XY[][] => mp.map(pp => { const r = pp[0].slice(0, -1).map(q => [q[0], q[1]] as XY); return signedArea(r) < 0 ? r.reverse() : r; });
  /** kichik boʻlakni tegib turgan seksiyaga qoʻshish (birlashma — bitta teshiksiz halqa boʻlsa) */
  const attach = (r: XY[]): boolean => {
    for (const sc of sections) {
      let u: [number, number][][][] = [];
      try { u = polygonClipping.union(P(sc.ring), P(r)); } catch { continue; }
      if (u.length !== 1 || u[0].length !== 1) continue;
      const ring = ringsOf(u)[0]; if (!isSimple(ring)) continue;
      sc.ring = ring; if (sc.kind === 'oddiy') sc.kind = 'burchak'; return true;
    }
    return false;
  };
  for (const i of order) {
    const a = A[i], b = A[(i + 1) % n], L = len(sub(b, a)); if (L < Math.min(g.secLen * 0.6, 14)) continue;
    const u = unit(sub(b, a)), N: XY = [-u[1], u[0]];
    const top = southward(N) ? Math.max(g.minF, Math.round((g.maxF + g.minF) / 2)) : g.maxF;
    let strip: [number, number][][][] = [];
    try { strip = polygonClipping.intersection(P([a, b, add(b, mul(N, D)), add(a, mul(N, D))]), poly); if (placed.length && strip.length) strip = polygonClipping.difference(strip, ...placed); } catch { continue; }
    for (const r of ringsOf(strip)) {
      const ar = Math.abs(signedArea(r)); if (ar < 40) continue;
      const ts = r.map(p => (p[0] - a[0]) * u[0] + (p[1] - a[1]) * u[1]), t0 = Math.min(...ts), t1 = Math.max(...ts), span = t1 - t0;
      placed.push(P(r));
      // juda qisqa yoki sayoz boʻlak (burchakdagi qoldiq) — qoʻshni seksiyaga
      if (span < Math.max(10, g.secLen * 0.35) || ar < 0.45 * D * Math.min(span, g.secLen)) { if (!attach(r) && ar >= 0.45 * D * Math.max(10, span) && span >= 10) { sections.push({ ring: r, floors: g.minF, kind: 'oddiy', nonRes: g.nonRes }); meta.push({ edge: i, first: false, last: false }); } continue; }
      const sp = spans(t0, t1, g.secLen, !!g.exact, g.maxLen), m = sp.length;
      for (let k = 0; k < m; k++) {
        const [ta, tb] = sp[k];
        const slab = P([add(a, mul(u, ta)), add(a, mul(u, tb)), add(add(a, mul(u, tb)), mul(N, D + 2)), add(add(a, mul(u, ta)), mul(N, D + 2))].map(q => add(q, mul(N, -1))) as XY[]);
        let part: [number, number][][][] = [];
        try { part = polygonClipping.intersection(P(r), slab); } catch { continue; }
        let best: XY[] | null = null, ba = 0;
        for (const q of ringsOf(part)) { const x = Math.abs(signedArea(q)); if (x > ba) { ba = x; best = q; } }
        if (!best || ba < 20) continue;
        const fromEnd = Math.min(ta, L - tb) / Math.max(1, L / 2);
        const oa = add(a, mul(u, ta)), ob = add(a, mul(u, tb));
        sections.push({ ring: best, floors: Math.max(g.minF, Math.round(top - (top - g.minF) * Math.min(1, fromEnd * 1.4))), kind: 'oddiy', nonRes: g.nonRes, face: { p: add(mul(add(oa, ob), 0.5), mul(N, D)), n: N } });
        meta.push({ edge: i, first: k === 0 && ta < D + 2, last: k === m - 1 && tb > L - D - 2 });
      }
    }
  }
  // botiq (ichki) burchak: ikki tasma faqat bir nuqtada tegadi — orasidagi D × D kvadrat qoʻshni seksiyaga qoʻshiladi (uzluksiz L)
  for (let v = 0; v < n; v++) {
    const pv = A[(v - 1 + n) % n], c = A[v], nx = A[(v + 1) % n], u1 = unit(sub(c, pv)), u2 = unit(sub(nx, c));
    if (cross(u1, u2) > -0.2) continue;
    const N1: XY = [-u1[1], u1[0]];
    let sq: [number, number][][][] = [];
    try { sq = polygonClipping.intersection(P([c, add(c, mul(u1, D)), add(add(c, mul(u1, D)), mul(N1, D)), add(c, mul(N1, D))]), poly); if (placed.length && sq.length) sq = polygonClipping.difference(sq, ...placed); } catch { continue; }
    for (const r of ringsOf(sq)) if (Math.abs(signedArea(r)) > 20 && attach(r)) placed.push(P(r));
  }
  if (!sections.length) notes.push('Seksiya joylashmadi — chuqurlik yoki chekinishni kamaytiring');
  // seysmik rejim (QMQ 2.01.03-19, 3.1.1): burchakda ikki toʻrtburchak boʻlma, orasida antiseysmik chok — L ga birlashtirilmaydi
  const merged = g.maxProj != null ? 0 : mergeCorners(A, sections, meta);
  if (merged) notes.push(`${merged} ta burchak — bitta L-shakl bino (ikki seksiya birlashtirildi)`);
  else if (g.maxProj != null) notes.push('Seysmik boʻlmalar: burchaklarda seksiyalar alohida (orasida antiseysmik chok)');
  return { sections, capFloors: null, notes };
}

/**
 * Notekis kvartal (27.10, tester izohi «qiyshiq, noodatiy shakllar»): seksiyalar faqat TOʻGʻRI TOʻRTBURCHAK.
 * Har qirra boʻylab chuqurligi D boʻlgan tasma kataklarga (1 m) boʻlinadi; katak kvartal ichida toʻliq yotsa va oldin
 * joylanganlardan ≥ 6 m uzoq boʻlsa (yoki ularga tik — L burchak hosil qiladi) — joylanadi. Ketma-ket kataklar —
 * toʻrtburchak seksiyalar. Qirra parsel chegarasiga qiya boʻlsa, seksiya chegaradan biroz chekinadi, shakli buzilmaydi.
 * Qirralar navbati: uzunidan qisqasiga; qisqa yoki joy qolmagan qirraga bino qoʻyilmaydi (qolgan joy — hovli).
 */
export function orthoFill(A: XY[], g: GenParams, notes: string[]): GenResult {
  const D = g.depth, n = A.length, sections: GenSection[] = [], meta: { edge: number; first: boolean; last: boolean }[] = [];
  const placed: { ring: XY[]; u: XY }[] = [];
  const inA = (p: XY) => inside(p, A);
  const segD = (p: XY, r: XY[]) => { let d = Infinity; for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length], ab = sub(b, a), L2 = ab[0] * ab[0] + ab[1] * ab[1], t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / L2)) : 0; d = Math.min(d, len(sub(p, add(a, mul(ab, t))))); } return d; };
  const order = A.map((_, i) => i).sort((a, b) => len(sub(A[(b + 1) % n], A[b])) - len(sub(A[(a + 1) % n], A[a])));
  const minRun = Math.max(12, Math.min(g.secLen * 0.6, 20));
  // tutashmaydigan (qiya) seksiyalar orasi: uzun tomon ↔ torets 2·Hmax·0,3, ≥ 6 m (79-band 2-jadval)
  const gapT = Math.max(6, 0.6 * g.maxF * FLOOR_H);
  for (const i of order) {
    const a = A[i], b = A[(i + 1) % n], L = len(sub(b, a)); if (L < minRun) continue;
    const u = unit(sub(b, a)), N: XY = [-u[1], u[0]];
    const top = N[1] > 0.55 ? Math.max(g.minF, Math.round((g.maxF + g.minF) / 2)) : g.maxF;   // janubiy qirra pastroq — hovliga quyosh
    // chegaradan chekinish: qirra boʻylab tasma ichkariga 0…4 m surilishi mumkin (qiya qoʻshni qirralar)
    const ok = (t: number, off: number): boolean => {
      for (const s of [off + 0.2, off + D / 2, off + D - 0.2]) for (const dt of [0.05, 0.95]) { const p = add(add(a, mul(u, t + dt)), mul(N, s)); if (!inA(p)) return false; }
      const c = add(add(a, mul(u, t + 0.5)), mul(N, off + D / 2));
      for (const q of placed) {
        const perp = Math.abs(q.u[0] * u[0] + q.u[1] * u[1]) < 0.35;   // ~tik (70–110°) — L burchak boʻlib tutashishi mumkin
        for (const s of [off + 0.2, off + D / 2, off + D - 0.2]) for (const dt of [0.05, 0.95]) { const p = add(add(a, mul(u, t + dt)), mul(N, s)); if (inside(p, q.ring)) return false; if (!perp && segD(p, q.ring) < gapT) return false; }
        if (inside(c, q.ring)) return false;
      }
      return true;
    };
    // eng koʻp katak sigʻadigan chekinish (0, 2, 4 m)
    let best: { off: number; runs: [number, number][]; tot: number } | null = null;
    for (const off of [0, 2, 4]) {
      const runs: [number, number][] = []; let s0: number | null = null;
      // botiq uchda tasma qirra tashqarisiga D gacha davom etadi (ichki burchak kvadrati — uzluksiz L)
      const T0 = -Math.ceil(D), T1 = Math.floor(L + D) - 1;
      for (let t = T0; t <= T1; t += 1) { const f = ok(t, off); if (f && s0 === null) s0 = t; if ((!f || t === T1) && s0 !== null) { const e = f ? t + 1 : t; if (e - s0 >= minRun) runs.push([s0, e]); s0 = null; } }
      const tot = runs.reduce((x, r) => x + r[1] - r[0], 0); if (!best || tot > best.tot + 2) best = { off, runs, tot };
    }
    if (!best || !best.runs.length) continue;
    for (const [r0, r1] of best.runs) {
      const base = add(a, mul(N, best.off));
      const rect = (t0: number, t1: number): XY[] => { const oa = add(base, mul(u, t0)), ob = add(base, mul(u, t1)); return [oa, ob, add(ob, mul(N, D)), add(oa, mul(N, D))]; };
      placed.push({ ring: rect(r0, r1), u });
      // hovliga oʻtish (arka) — keyingi bosqichda seksiya ichida; bu yerda tasma uzluksiz (L/T kvartal bitta zanjir)
      const cuts: [number, number][] = [], arches: XY[][] = [];
      if (g.passages && r1 - r0 > 70) {
        const m = Math.max(1, Math.floor((r1 - r0) / 100)); let s1 = r0;
        for (let k = 1; k <= m; k++) { const gp = r0 + (r1 - r0) * k / (m + 1); cuts.push([s1, gp - 3]); s1 = gp + 3; arches.push(rect(gp - 3, gp + 3)); }
        cuts.push([s1, r1]);
      } else cuts.push([r0, r1]);
      for (const [c0, c1] of cuts) {
        const sp = spans(c0, c1, g.secLen, !!g.exact, g.maxLen);
        sp.forEach(([ta, tb], k) => {
          const ring = rect(ta, tb), oa = ring[0], ob = ring[1];
          const fromEnd = Math.min(ta, L - tb) / Math.max(1, L / 2);
          sections.push({ ring, floors: Math.max(g.minF, Math.round(top - (top - g.minF) * Math.min(1, fromEnd * 1.4))), kind: 'oddiy', nonRes: g.nonRes, face: { p: add(mul(add(oa, ob), 0.5), mul(N, D + best!.off)), n: N } });
          meta.push({ edge: i, first: k === 0 && c0 === r0, last: k === sp.length - 1 && c1 === r1 });
        });
      }
      for (const ar of arches) { sections.push({ ring: ar, floors: 1, kind: 'arka', nonRes: 0, z0: ARCH_F }); meta.push({ edge: i, first: false, last: false }); }   // arkalar — tasma seksiyalaridan keyin (facingCap tartibi oʻzgarmasin)
    }
  }
  if (!sections.length) { notes.push('Seksiya joylashmadi — kvartal bu chuqurlik uchun juda kichik yoki tor'); return { sections, capFloors: null, notes }; }
  // tik tutashgan qoʻshni seksiyalar — bitta L-shakl burchak binosi
  const merged = mergeTouching(sections, D, g.secLen, g.maxLen, g.maxProj);
  if (merged) notes.push(`${merged} ta burchak — bitta L-shakl bino (ikki seksiya birlashtirildi)`);
  return { sections, capFloors: null, notes };
}

/** Tik tutashgan ikki toʻrtburchak seksiya (umumiy devor ≥ 3 m, oʻqlari tik) — bitta L-shakl burchak binosi */
/**
 * L-burchak qoʻli juda uzun boʻlmasin (oddiy burchak seksiyasi): seksiyaning ikkinchi seksiyaga tegadigan uchidan keep m qoladi,
 * qolgani — qoʻshni seksiyaga qoʻshiladi yoki alohida seksiya (mergeTouching hal qiladi). Faqat toʻgʻri toʻrtburchak seksiya kesiladi. [qoʻl, qoldiq] yoki null.
 */
function trimArm(s: GenSection, o: GenSection, keep: number, D: number): [GenSection, GenSection] | null {
  if (s.ring.length !== 4 || !s.face) return null;
  const n = s.face.n, u: XY = [-n[1], n[0]], du = (p: XY) => p[0] * u[0] + p[1] * u[1], dn = (p: XY) => p[0] * n[0] + p[1] * n[1];
  const tu = s.ring.map(du), tn = s.ring.map(dn), u0 = Math.min(...tu), u1 = Math.max(...tu), n0 = Math.min(...tn), n1 = Math.max(...tn);
  if (s.ring.some(p => Math.min(Math.abs(du(p) - u0), Math.abs(du(p) - u1)) > 1.2 || Math.min(Math.abs(dn(p) - n0), Math.abs(dn(p) - n1)) > 1.2)) return null;
  const ou = o.ring.map(du), om = (Math.min(...ou) + Math.max(...ou)) / 2, nearLo = Math.abs(om - u0) < Math.abs(om - u1);
  // ikkinchi seksiya shu seksiyaning yon tomoniga tegsa — burchak kvadrati shu seksiyada (D + qoʻl), aks holda faqat qoʻl qoladi
  const k = om > u0 + 1 && om < u1 - 1 ? keep + D : keep;
  if (u1 - u0 < k + 6) return null;
  const ccw = signedArea(s.ring) > 0, P = (a: number, b: number): XY => [u[0] * a + n[0] * b, u[1] * a + n[1] * b];
  const R = (a: number, b: number): XY[] => { const r = [P(a, n0), P(b, n0), P(b, n1), P(a, n1)]; return (signedArea(r) > 0) === ccw ? r : r.reverse(); };
  const cut = nearLo ? u0 + k : u1 - k;
  const arm = nearLo ? R(u0, cut) : R(cut, u1), rest = nearLo ? R(cut, u1) : R(u0, cut);
  return [{ ...s, ring: arm, blind: undefined }, { ...s, ring: rest, blind: undefined }];
}

function mergeTouching(S: GenSection[], D = 15, secLen = 30, maxLen?: number, maxProj?: number): number {
  const ext0 = Math.min(1.7 * secLen, maxLen ?? Infinity);   // seysmik boʻlma chegarasi (QMQ 2.01.03-19, 3.1-jadval) — birlashganda ham oshmasin
  const keep = Math.min(Math.max(10, 0.4 * secLen), maxProj ?? Infinity);   // L qoʻli (chiqib turgan qism) — seysmik rejimda 3.1.1 chegarasi
  let cnt = 0;
  for (let guard = 0; guard < 50; guard++) {
    let done = false;
    for (let i = 0; i < S.length && !done; i++) for (let j = i + 1; j < S.length && !done; j++) {
      const a = S[i], b = S[j]; if (a.kind !== 'oddiy' || b.kind !== 'oddiy' || !a.face || !b.face) continue;
      if (Math.abs(a.face.n[0] * b.face.n[0] + a.face.n[1] * b.face.n[1]) > 0.35) continue;
      if (!touching(a.ring, b.ring) || sharedWall(a.ring, b.ring) < 3) continue;
      // uzun qoʻllar — burchakka D + qisqa qoʻl qoladi, qolgani alohida seksiya
      // qoldiq: shu tasmadagi qoʻshni seksiyaga qoʻshiladi (≤ 1,7·secLen) yoki ≥ 18 m boʻlsa alohida; aks holda qoʻl kesilmaydi
      const place = (t: [GenSection, GenSection] | null, self: GenSection, other: GenSection): { nb: number; ring: XY[] } | 'own' | null => {
        if (!t) return null; const rest = t[1], n0 = self.face!.n;
        for (let q = 0; q < S.length; q++) { const x = S[q]; if (x === self || x === other || x.kind !== 'oddiy' || !x.face || x.face.n[0] * n0[0] + x.face.n[1] * n0[1] < 0.99 || !touching(x.ring, rest.ring) || sharedWall(x.ring, rest.ring) < 0.8 * D) continue;
          let uu: [number, number][][][] = []; try { uu = polygonClipping.union([[...x.ring, x.ring[0]].map(p => [p[0], p[1]] as [number, number])], [[...rest.ring, rest.ring[0]].map(p => [p[0], p[1]] as [number, number])]); } catch { continue; }
          if (uu.length !== 1 || uu[0].length !== 1) continue;
          let r2 = clean(uu[0][0].slice(0, -1).map(z => [z[0], z[1]] as XY), 0.8); if (signedArea(r2) < 0) r2 = r2.reverse();
          const ext = Math.max(...r2.map(p => Math.max(...r2.map(z => Math.hypot(p[0] - z[0], p[1] - z[1])))));
          if (r2.length === 4 && isSimple(r2) && ext <= Math.hypot(ext0, D) + 0.5) return { nb: q, ring: r2 };
        }
        const t2 = rest.ring, L = Math.max(...t2.map(p => Math.max(...t2.map(z => Math.hypot(p[0] - z[0], p[1] - z[1])))));
        return L >= Math.hypot(18, D) ? 'own' : null;
      };
      let ta = trimArm(a, b, keep, D), tb = trimArm(b, a, keep, D);
      const pa = place(ta, a, b), pb = place(tb, b, a); if (!pa) ta = null; if (!pb) tb = null;
      const A2 = ta ? ta[0] : a, B2 = tb ? tb[0] : b;
      let u: [number, number][][][] = [];
      try { u = polygonClipping.union([[...A2.ring, A2.ring[0]].map(p => [p[0], p[1]] as [number, number])], [[...B2.ring, B2.ring[0]].map(p => [p[0], p[1]] as [number, number])]); } catch { continue; }
      if (u.length !== 1 || u[0].length !== 1) continue;
      let ring = clean(u[0][0].slice(0, -1).map(q => [q[0], q[1]] as XY), 0.8); if (signedArea(ring) < 0) ring = ring.reverse();
      if (!isSimple(ring)) continue;
      const ra = ta ? ta[1] : null, rb = tb ? tb[1] : null;
      if (pa && pa !== 'own') S[pa.nb] = { ...S[pa.nb], ring: pa.ring, blind: undefined };
      if (pb && pb !== 'own' && !(pa && pa !== 'own' && pa.nb === pb.nb)) S[pb.nb] = { ...S[pb.nb], ring: pb.ring, blind: undefined };
      S[i] = { ...A2, ring, floors: Math.max(a.floors, b.floors), kind: 'burchak' }; S.splice(j, 1, ...(pb === 'own' && rb ? [rb] : [])); if (pa === 'own' && ra) S.push(ra); cnt++; done = true;
    }
    if (!done) break;
  }
  return cnt;
}

/**
 * Yakka «uzilib qolgan» boʻlak: hech bir seksiyaga tegmaydi, lekin boshqasiga meʼyordan yaqin (uzun tomon ↔ torets 2·Hmax·0,3, ≥ 6 m) —
 * odatda qarshi qator olib tashlangach oʻtkir uchda qoladi; olib tashlanadi (yolgʻiz seksiyali kvartal tegilmaydi).
 */
function dropStrays(S: GenSection[], gap: number, notes: string[]): void {
  if (S.length < 2) return;
  const segD = (p: XY, r: XY[]) => { let d = Infinity; for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length], ab = sub(b, a), L2 = ab[0] * ab[0] + ab[1] * ab[1], t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / L2)) : 0; d = Math.min(d, len(sub(p, add(a, mul(ab, t))))); } return d; };
  const dist = (a: XY[], b: XY[]) => Math.min(...a.map(p => segD(p, b)), ...b.map(p => segD(p, a)));
  let n = 0;
  for (let i = S.length - 1; i >= 0; i--) {
    const s = S[i]; if (s.kind === 'stilobat' || s.kind === 'villa' || s.kind === 'uy' || s.kind === 'minora') continue;
    const others = S.filter(o => o !== s && o.kind !== 'stilobat');
    if (others.some(o => touching(s.ring, o.ring) && sharedWall(s.ring, o.ring) >= 3)) continue;
    if (others.some(o => dist(s.ring, o.ring) < gap - 0.5) && Math.abs(signedArea(s.ring)) < Math.max(...others.map(o => Math.abs(signedArea(o.ring))))) { S.splice(i, 1); n++; }
  }
  if (n) notes.push(`${n} ta yakka boʻlak olib tashlandi: qoʻshni binoga meʼyordan yaqin (≥ 2·Hmax·0,3, ≥ 6 m)`);
}

/** Arka ustidagi qavatlar: ikki yonidagi seksiyalardan pastrogʻi − ARCH_F; bir yoni qolmasa — oddiy seksiya, ikkalasi ham yoʻq — olinadi */
function archFloors(S: GenSection[]): void {
  for (let i = S.length - 1; i >= 0; i--) {
    const a = S[i]; if (a.kind !== 'arka') continue;
    const nb = S.filter(o => o !== a && o.kind !== 'arka' && sharedWall(a.ring, o.ring) >= 3);
    if (!nb.length) { S.splice(i, 1); continue; }
    if (nb.length < 2) {
      // narigi tomonda yaqin (≤ 10 m) seksiya bor — bu aniq oʻlcham qoldigʻi oraligʻi: arka olinadi (oddiy oʻtish);
      // yoʻq — tasma uchi: arka oddiy seksiyaga aylanadi (yakka boʻlak «uzilib» qolmasin)
      const o = nb[0], near = S.some(q => q !== a && q !== o && q.kind !== 'arka' && q.ring.some(p => a.ring.some(r => Math.hypot(p[0] - r[0], p[1] - r[1]) < 10)));
      if (near) { S.splice(i, 1); continue; }
      const c: GenSection = { ...a, kind: o.kind === 'burchak' ? 'oddiy' : o.kind, floors: o.floors, nonRes: o.nonRes, face: o.face }; delete c.z0; if (o.z0) c.z0 = o.z0; S[i] = c; continue;
    }
    a.floors = Math.max(1, Math.min(...nb.map(o => (o.z0 ?? 0) + o.floors)) - (a.z0 ?? ARCH_F));
  }
}

/** Koʻpburchakka nur boʻyicha kirish masofasi. par — faqat nurga deyarli tik (fasadga parallel, ≤ 30°) qirralar hisobga olinadi */
/** Nur bilan kesishgan qirra uzun tomonmi (torets emas): uzunligi halqaning eng uzun qirrasining ≥ 0,6 qismi va ≥ 1,2·chuqurlik */
function hitLong(p: XY, d: XY, r: XY[], depth: number): boolean {
  let best = Infinity, bi = -1;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const a = r[j], b = r[i], ex = b[0] - a[0], ey = b[1] - a[1], den = d[0] * ey - d[1] * ex; if (Math.abs(den) < 1e-12) continue;
    const el = Math.hypot(ex, ey) || 1; if (Math.abs((ex * d[0] + ey * d[1]) / el) > 0.5) continue;
    const t = ((a[0] - p[0]) * ey - (a[1] - p[1]) * ex) / den, s2 = ((a[0] - p[0]) * d[1] - (a[1] - p[1]) * d[0]) / den;
    if (t > 0.5 && s2 >= 0 && s2 <= 1 && t < best) { best = t; bi = j; }
  }
  if (bi < 0) return true;
  const L = (k: number) => len(sub(r[(k + 1) % r.length], r[k])), e = L(bi), mx = Math.max(...r.map((_, k) => L(k)));
  return e >= 0.6 * mx && e >= 1.2 * depth;
}
/* Qarshidagi seksiyagacha talab: uzun tomon ↔ uzun tomon — 2·Hmax (8-izoh); uzun tomon ↔ torets — 2·Hmax·0,3 va ≥ 6 m (2-jadval).
   facingCap «samarali masofa» bilan ishlaydi: torets uchun t / 0,3 (2·H ≤ t/0,3 ⇔ 0,6·H ≤ t). */
function rayHit(p: XY, d: XY, r: XY[], par = false): number {
  let best = Infinity;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const a = r[j], b = r[i], ex = b[0] - a[0], ey = b[1] - a[1], den = d[0] * ey - d[1] * ex; if (Math.abs(den) < 1e-12) continue;
    if (par) { const el = Math.hypot(ex, ey) || 1; if (Math.abs((ex * d[0] + ey * d[1]) / el) > 0.5) continue; }
    const t = ((a[0] - p[0]) * ey - (a[1] - p[1]) * ex) / den, s = ((a[0] - p[0]) * d[1] - (a[1] - p[1]) * d[0]) / den;
    if (t > 0.5 && s >= 0 && s <= 1 && t < best) best = t;
  }
  return best;
}
/** Umumiy devor uzunligi (parallel, ≤ 0,5 m oraliqdagi qirralar ustma-ust qismi), m */
function sharedWall(a: XY[], b: XY[]): number {
  let tot = 0;
  for (let i = 0; i < a.length; i++) {
    const p = a[i], q = a[(i + 1) % a.length], dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy); if (L < 0.1) continue;
    const ux = dx / L, uy = dy / L;
    for (let j = 0; j < b.length; j++) {
      const r = b[j], s = b[(j + 1) % b.length], ex = s[0] - r[0], ey = s[1] - r[1], M = Math.hypot(ex, ey); if (M < 0.1) continue;
      if (Math.abs(ux * ey / M - uy * ex / M) > 0.05) continue;                       // parallel emas
      if (Math.abs((r[0] - p[0]) * uy - (r[1] - p[1]) * ux) > 0.5) continue;          // bir chiziqda emas
      const t0 = (r[0] - p[0]) * ux + (r[1] - p[1]) * uy, t1 = (s[0] - p[0]) * ux + (s[1] - p[1]) * uy;
      tot += Math.max(0, Math.min(L, Math.max(t0, t1)) - Math.max(0, Math.min(t0, t1)));
    }
  }
  return tot;
}
/** Ikki halqa tegib turadimi (umumiy devor yoki ≤ 0,5 m) — bitta bino majmuasi, «qarshidagi bino» emas */
function touching(a: XY[], b: XY[]): boolean {
  const sd = (p: XY, q: XY, r: XY) => { const dx = r[0] - q[0], dy = r[1] - q[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - q[0]) * dx + (p[1] - q[1]) * dy) / L2)); return Math.hypot(q[0] + t * dx - p[0], q[1] + t * dy - p[1]); };
  for (const p of a) for (let i = 0; i < b.length; i++) if (sd(p, b[i], b[(i + 1) % b.length]) < 0.5) return true;
  for (const p of b) for (let i = 0; i < a.length; i++) if (sd(p, a[i], a[(i + 1) % a.length]) < 0.5) return true;
  return false;
}

/** Qavariq qobiq (monotone chain), CCW */
function convexHull(pts: XY[]): XY[] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o: XY, a: XY, b: XY) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: XY[] = [], up: XY[] = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return [...lo.slice(0, -1), ...up.slice(0, -1)];
}
/**
 * Bitta bino majmuasi (umumiy devor ≥ 3 m) — «qarshidagi bino» emas. Faqat burchagi bilan tegib turgan seksiyalar
 * (oʻtkir burchakli kvartalda pastki qator gipotenuza qatoriga uchi bilan tegadi) — alohida binolar: ular orasidagi
 * masofa tekshiriladi (avval tegishi yetarli edi va 4–5 m masofadagi 5 va 12 qavatli seksiyalar qolib, oʻrtada boʻshliq chiqardi).
 */
const joined = (a: XY[], b: XY[]): boolean => touching(a, b) && sharedWall(a, b) >= 3;
/** qarama-qarshi fasadlar (U shaklining ikki qanoti): umumiy devorli boʻlsa ham tor hovli orqali bir-biriga qaraydi */
const opposed = (a: GenSection, b: GenSection): boolean => !!a.face && !!b.face && a.face.n[0] * b.face.n[0] + a.face.n[1] * b.face.n[1] < -0.5;

/**
 * Qarshidagi seksiyagacha masofa → qavat cheklovi: seysmik 8+ ballda parallel uzun tomonlar orasi ≥ 2·Hmax
 * (ShNQ 2.07.01-23, 79-band 2-jadval, izoh 8). Ikkala seksiya ham cheklanadi.
 */
function facingCap(r: GenResult, g: GenParams, floorH: number): void {
  // 1) qarshidagi qator meʼyoriy minimal qavatga ham sigʻmasa — keyin joylashganini (qisqaroq qirra) olib tashlaymiz:
  //    tor kvartalda bir tomonlama, lekin balandroq qurilish qavat soni 1–2 gacha tushirilgan ikki qatordan yaxshiroq
  let removed = 0; const gone: XY[] = [];
  for (let guard = 0; guard < 200; guard++) {
    let worst: [number, number] | null = null, wd = Infinity;
    r.sections.forEach((s, i) => {
      if (!s.face) return;
      r.sections.forEach((o, k) => { if (k === i || (joined(s.ring, o.ring) && !opposed(s, o))) return; const t = rayHit(s.face!.p, s.face!.n, o.ring, true); if (!Number.isFinite(t)) return; const eff = hitLong(s.face!.p, s.face!.n, o.ring, g.depth) ? t : (t < 6 ? 0 : t / 0.3); if (eff < wd) { wd = eff; worst = [i, k]; } });
    });
    if (!worst || wd / 2 / floorH >= g.minF) break;
    const [i, k] = worst as [number, number], rm = r.sections.splice(Math.max(i, k), 1)[0]; if (rm.face) gone.push(rm.face.n); removed++;
  }
  // shu qirradan qolgan, hech biriga tegmaydigan yakka boʻlaklar — «uzilib» qolmasin, ular ham olinadi
  if (gone.length) for (let guard = 0; guard < 50; guard++) {
    const j = r.sections.findIndex((s, i) => s.face && gone.some(n => n[0] * s.face!.n[0] + n[1] * s.face!.n[1] > 0.999) && !r.sections.some((o, k) => k !== i && sharedWall(s.ring, o.ring) > 3));
    if (j < 0) break; r.sections.splice(j, 1); removed++;
  }
  // oʻtkir burchak uchida shu qirradan qolgan kichik boʻlak (qoʻshni qator bilan umumiy devorli) — qoʻshni binoga qoʻshiladi:
  // pastki qator oʻrtasi olib tashlangach uchida alohida «orolcha» qolmasin (bitta «flatiron» uchi)
  if (gone.length) for (let guard = 0; guard < 20; guard++) {
    let done = false;
    for (let i = 0; i < r.sections.length && !done; i++) {
      const s = r.sections[i]; if (!s.face || !gone.some(n => n[0] * s.face!.n[0] + n[1] * s.face!.n[1] > 0.999)) continue;
      if (Math.abs(signedArea(s.ring)) > 0.6 * g.depth * g.secLen) continue;
      if (r.sections.some((o, k) => k !== i && o.face && o.face.n[0] * s.face!.n[0] + o.face.n[1] * s.face!.n[1] > 0.999 && sharedWall(s.ring, o.ring) > 3)) continue;   // shu qatorda davomi bor
      for (let k = 0; k < r.sections.length && !done; k++) {
        const o = r.sections[k]; if (k === i || sharedWall(s.ring, o.ring) < 3) continue;
        let u: [number, number][][][] = [];
        // umumiy devor hisob xatosi bilan (≤ 0,5 m) — boʻlakni markazidan ~0,4 m kattalashtirib birlashtiramiz
        const cx = s.ring.reduce((a, p) => a + p[0], 0) / s.ring.length, cy = s.ring.reduce((a, p) => a + p[1], 0) / s.ring.length;
        const big = s.ring.map(p => { const dx = p[0] - cx, dy = p[1] - cy, L = Math.hypot(dx, dy) || 1, f = (L + 0.4) / L; return [cx + dx * f, cy + dy * f] as [number, number]; });
        const hull = convexHull([...o.ring, ...s.ring]);   // tashqariga 0,4 m chiqib ketmasin
        try { u = polygonClipping.union([[...o.ring, o.ring[0]].map(p => [p[0], p[1]] as [number, number])], polygonClipping.intersection([[...big, big[0]]], [[...hull, hull[0]].map(p => [p[0], p[1]] as [number, number])])); } catch { continue; }
        if (u.length !== 1 || u[0].length !== 1) continue;
        let ring = clean(u[0][0].slice(0, -1).map(q => [q[0], q[1]] as XY), 0.8); if (signedArea(ring) < 0) ring = ring.reverse();
        if (!isSimple(ring)) continue;
        o.ring = ring; r.sections.splice(i, 1); done = true;
      }
    }
    if (!done) break;
  }
  if (removed) r.notes.push(`${removed} ta seksiya olib tashlandi: qarshidagi binogacha masofa ${g.minF} qavatga ham yetmaydi (≥ 2·H, ShNQ 2.07.01-23, 79-band 2-jadval, izoh 8)`);
  // 2) qolganlarida — masofa boʻyicha qavat cheklovi
  let cut = 0;
  r.sections.forEach((s, i) => {
    if (!s.face) return;
    let d = Infinity, j = -1;
    r.sections.forEach((o, k) => { if (k === i || (joined(s.ring, o.ring) && !opposed(s, o))) return; const t = rayHit(s.face!.p, s.face!.n, o.ring, true); if (!Number.isFinite(t)) return; const eff = hitLong(s.face!.p, s.face!.n, o.ring, g.depth) ? t : (t < 6 ? 0 : t / 0.3); if (eff < d) { d = eff; j = k; } });
    if (!Number.isFinite(d) || d > 200) return;
    const cap = Math.max(g.minF, Math.floor(d / 2 / floorH));
    for (const x of [s, r.sections[j]]) if (x.floors > cap) { x.floors = cap; cut++; }
  });
  if (cut) r.notes.push(`${cut} ta seksiyaning qavati qarshidagi binogacha masofa boʻyicha kamaytirildi (≥ 2·H, izoh 8)`);
}

function perimeter(A: XY[], g: GenParams, floorH: number, notes: string[]): GenResult {
  const D = g.depth, n = A.length;
  // faqat miter: inner[i] A[i] ga mos boʻlishi shart (insetRobust uchlarni tashlab yuboradi — egri qirrali kvartalda «inner[i] undefined» qulashi, sayt 25.10)
  const inner = insetMiter(A, D);
  if (!inner || inner.length !== A.length) return { sections: [], capFloors: null, notes: ['Kvartal perimetr uchun juda kichik — «qatorlar» ni sinab koʻring'] };
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
  const arm = D + Math.min(g.maxProj ?? 8, g.secLen * 0.3);
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
    // hovliga oʻtish — bo'shliq emas, ARKA: 6 m eni, 2 qavat balandlikda ochiq (ShNQ 2.01.02-04, 1-son oʻzgartirish, 3.12:
    // har 100 m da ≥ 3,5 m eni, ≥ 4,25 m balandlik); ustidagi qavatlar qoʻshni seksiyalar bilan bir xil (archFloors)
    for (const gp of gaps) { const oa = add(P(i), mul(U(i), gp - 3)), ob = add(P(i), mul(U(i), gp + 3)); sections.push({ ring: [oa, ob, add(ob, mul(N(i), D)), add(oa, mul(N(i), D))], floors: 1, kind: 'arka', nonRes: 0, z0: ARCH_F }); }
    let idx = 0;
    for (const [c0, c1] of cuts) {
      const sp = spans(c0, c1, g.secLen, !!g.exact, g.maxLen);
      for (let k = 0; k < sp.length; k++, idx++) {
        const [ta, tb] = sp[k];
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

/**
 * Qirralar boʻylab joylangan seksiyalar burchakda (yoʻnalish ≥ 25° oʻzgarganda) bitta L-shakl binoga birlashtiriladi:
 * oldingi qirraning oxirgi seksiyasi + keyingi qirraning birinchi seksiyasi, umumiy devori boʻlsa. Qavati — kattasi.
 */
function mergeCorners(A: XY[], S: GenSection[], meta: { edge: number; first: boolean; last: boolean }[]): number {
  const n = A.length, gone = new Set<number>(); let cnt = 0;
  for (let v = 0; v < n; v++) {
    const pe = (v - 1 + n) % n, u1 = unit(sub(A[v], A[pe])), u2 = unit(sub(A[(v + 1) % n], A[v]));
    if (u1[0] * u2[0] + u1[1] * u2[1] > Math.cos(25 * Math.PI / 180)) continue;   // deyarli toʻgʻri davom — burchak emas
    const a = meta.findIndex((m, i) => m.edge === pe && m.last && !gone.has(i)), b = meta.findIndex((m, i) => m.edge === v && m.first && !gone.has(i));
    if (a < 0 || b < 0 || a === b) continue;
    let u: [number, number][][][] = [];
    try { u = polygonClipping.union([[...S[a].ring, S[a].ring[0]].map(p => [p[0], p[1]] as [number, number])], [[...S[b].ring, S[b].ring[0]].map(p => [p[0], p[1]] as [number, number])]); } catch { continue; }
    if (u.length !== 1 || u[0].length !== 1) continue;   // tegmaydi yoki teshikli
    const ring0 = u[0][0].slice(0, -1).map(q => [q[0], q[1]] as XY), ring = signedArea(ring0) < 0 ? ring0.reverse() : ring0;
    S[a] = { ...S[a], ring, floors: Math.max(S[a].floors, S[b].floors), kind: 'burchak' };
    gone.add(b); cnt++;
  }
  if (gone.size) { const keep = S.filter((_, i) => !gone.has(i)); S.length = 0; S.push(...keep); }
  return cnt;
}

function rows(A: XY[], g: GenParams, floorH: number, notes: string[]): GenResult {
  // kenglik boʻylab qatorlar (uzun oʻqi sharq–gʻarb): SanQvaN 0102-25, 3-band — turar joy obyektlari janubiy, janubi-sharqiy, sharqiy, shimoli-sharqiy yoʻnalishda;
  // 15-band — xona derazalari gʻarbga (200–290°) yoʻnaltirilmaydi, bu joylashuvda fasadlar janub va shimolga qaraydi
  const D = g.depth, H = g.maxF * floorH, gap = Math.max(2 * H, 20); // izoh 8: ≥ 2·Hmax
  notes.push(`Qatorlar sharq–gʻarb yoʻnalishida (SanQvaN 0102-25, 3 va 15-bandlar); orasi ${Math.round(gap)} m = 2·Hmax (ShNQ 2.07.01-23, 79-band 2-jadval, izoh 8)`);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of A) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  const poly: Polygon = [[...A, A[0]].map(p => [p[0], p[1]] as [number, number])];
  const sections: GenSection[] = [];
  const count = Math.max(1, Math.floor((y1 - y0 - D) / (D + gap)) + 1), used = (count - 1) * (D + gap) + D, ys = y0 + (y1 - y0 - used) / 2;
  for (let k = 0; k < count; k++) {
    const by = ys + k * (D + gap);
    for (let x = x0; x < x1 - 6; x += g.secLen) {
      const rect: Polygon = [[[x, by], [Math.min(x1, x + g.secLen), by], [Math.min(x1, x + g.secLen), by + D], [x, by + D], [x, by]]];
      let parts: [number, number][][][] = [];
      try { parts = polygonClipping.intersection(rect, poly); } catch { continue; }
      for (const p of parts) {
        const ring = p[0].slice(0, -1).map(q => [q[0], q[1]] as XY);
        const ar = Math.abs(signedArea(ring)); if (ar < D * 10) continue;
        if (g.exact) { if (ar < D * g.secLen * 0.98) { if (ar < D * 9) continue; XS.short++; } else XS.full++; }
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
  XS = { full: 0, short: 0, gap: 0, stretch: 0 };
  const notes: string[] = [];
  const outer0 = inset(clean(block), g.setback);
  if (!outer0) return { sections: [], capFloors: null, notes: ['Kvartal juda tor — chekinishdan keyin joy qolmadi'] };
  const A = clean(outer0, 6), tf = Math.max(g.towerF ?? 16, g.minF);
  switch (t) {
    case 'yakka': case 'taunhaus': case 'juft': case 'hovli': {
      // 31.10: past qavatli uylar — alohida qoida (core/lowrise): kvartal cheti (qizil chiziq) boʻylab avval uchastka, keyin uy;
      // chekinish uchastka ichida (oldi 5 m), shuning uchun kvartalning oʻzi olinadi (setback emas)
      const { houses, notes: n2 } = lowriseBlock(clean(block, 4), t, Math.max(1, Math.min(3, g.maxF)));
      return { sections: houses.map(h => ({ ring: h.ring, floors: h.floors, kind: h.kind as SecKind, nonRes: 0, plot: h.plot })), capFloors: null, notes: [...notes, ...n2] };
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
    case 'ofis_plita': {
      // ofis plitalari: chuqur korpus (18 m), uzun seksiyalar, barcha qavatlar noturar; qatorlar orasi ≥ 2·H emas (turar joy emas) — ≥ 0,8·H, kamida 15 m
      const H = g.maxF * floorH, gap = Math.max(15, 0.8 * H);
      const r = edgeFill(A, { ...g, depth: 18, secLen: Math.max(36, g.secLen), passages: false }, notes);
      r.sections = r.sections.map(s => ({ ...s, floors: g.maxF, nonRes: g.maxF, use: 'ofis' }));
      // ichkarida parallel plitalar (hovli oʻrniga) — kvartal chuqur boʻlsa
      const court = inset(A, 18 + gap);
      if (court && aOf(court) > 1500) { const rows = points(court, 18, gap, r.sections.map(s => s.ring)); r.sections.push(...rows.map(ring => ({ ring, floors: g.maxF, kind: 'oddiy' as SecKind, nonRes: g.maxF, use: 'ofis' }))); }
      notes.push(`Ofis plitalari: korpus 18 m, ${g.maxF} qavat, hammasi noturar; qatorlar orasi ${Math.round(gap)} m (yoritish uchun ≥ 0,8·H — taxmin)`);
      return r;
    }
    case 'ofis_minora': {
      // stilobat (2 qavat, chekinish ichida) + minoralar toʻri; stilobat ustidagi ofis minoralari
      const H = tf * floorH, gap = Math.max(30, 0.7 * H), sq = points(A, 28, gap);
      const sections: GenSection[] = [{ ring: A, floors: 2, kind: 'stilobat', nonRes: 2, use: 'savdo' }, ...sq.map(ring => ({ ring, floors: tf - 2, kind: 'minora' as SecKind, nonRes: tf - 2, z0: 2, use: 'ofis' }))];
      notes.push(`Ofis minoralari: 2 qavatli stilobat (savdo) + ${sq.length} minora × ${tf} qavat; minoralar orasi ${Math.round(gap)} m`);
      return { sections, capFloors: null, notes };
    }
    case 'savdo_blok': {
      // savdo markazi: bitta katta blok (≤ 120 × 80 m) uzun tomon boʻylab, 2 qavat; qolgan hovli — yer usti parkovka
      const ang = longestAngle(A), c = Math.cos(ang), s = Math.sin(ang), rot = (p: XY): XY => [p[0] * c + p[1] * s, -p[0] * s + p[1] * c], un = (p: XY): XY => [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const p of A.map(rot)) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
      const W = Math.min(120, (x1 - x0) * 0.8), D = Math.min(80, (y1 - y0) * 0.75), cx = (x0 + x1) / 2, cy = y0 + (y1 - y0) * 0.62;   // orqasi parkovkaga, oldi koʻchaga
      let ring = ([[cx - W / 2, cy - D / 2], [cx + W / 2, cy - D / 2], [cx + W / 2, cy + D / 2], [cx - W / 2, cy + D / 2]] as XY[]).map(un);
      for (let k = 0; k < 6 && !ring.every(p => inside(p, A)); k++) ring = shrink(ring, 0.9);
      if (!ring.every(p => inside(p, A))) {   // uchburchak / botiq kvartal: chekinish ichidagi eng katta toʻrtburchak
        const fr = freeRect([A], [], 0);
        if (fr && fr.w >= 12 && fr.h >= 12) {
          const w = Math.min(120, fr.w * 0.96), h = Math.min(80, fr.h * 0.96), u: XY = [Math.cos(fr.ang), Math.sin(fr.ang)], v: XY = [-u[1], u[0]];
          ring = ([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]] as XY[]).map(q => [fr.c[0] + u[0] * q[0] + v[0] * q[1], fr.c[1] + u[1] * q[0] + v[1] * q[1]] as XY);
        }
      }
      if (!ring.every(p => inside(p, A))) return { sections: [], capFloors: null, notes: ['Savdo bloki sigʻmadi — chekinishni kamaytiring'] };
      const sw = Math.hypot(ring[1][0] - ring[0][0], ring[1][1] - ring[0][1]), sd = Math.hypot(ring[2][0] - ring[1][0], ring[2][1] - ring[1][1]);
      notes.push(`Savdo markazi ${Math.round(sw)} × ${Math.round(sd)} m, ${Math.min(3, Math.max(1, g.maxF))} qavat; hovli — yer usti parkovka (413-band, 25 m²/joy)`);
      return { sections: [{ ring, floors: Math.min(3, Math.max(1, g.maxF)), kind: 'savdo', nonRes: Math.min(3, Math.max(1, g.maxF)), use: 'savdo' }], capFloors: null, notes };
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
export function generate(block: XY[], g: GenParams, floorH = FLOOR_H, opts: GenOpts = {}): GenResult {
  XS = { full: 0, short: 0, gap: 0, stretch: 0 };
  const site = aOf(clean(block));
  const far = g.far ?? 0;
  const t: Typology = g.typology === 'avto' ? autoTypology(far || 2) : g.typology;
  let r: GenResult;
  if (far > 0 && !['yakka', 'taunhaus', 'juft', 'hovli'].includes(t)) {
    // maxF ni minF…maxF oraligʻida tanlash: UMN maqsadga eng yaqin (oshmasdan afzal)
    let best: GenResult | null = null, bd = Infinity, bx = { ...XS };
    for (let f = Math.max(1, g.minF); f <= Math.max(g.minF, g.maxF); f++) {
      const gg = { ...g, maxF: f, towerF: Math.max(f, Math.min(g.towerF ?? 16, f + 6)) }, rr = typoCore(block, t, gg, floorH), v = gfaOf(rr) / site;
      const d = Math.abs(v - far) + (v > far ? 0.15 : 0);
      if (d < bd) { bd = d; best = rr; bx = { ...XS }; }
    }
    r = best ?? typoCore(block, t, g, floorH); if (best) XS = bx;
  } else r = typoCore(block, t, g, floorH);
  r.typology = t;
  if (t === 'yakka' || t === 'taunhaus' || t === 'juft' || t === 'hovli') {
    // past qavatli uylar: uchastkalar oʻz qoidasida (lowrise) — seksiya tuzatishlari (qirqish, tor boʻlak, avtoturargoh) qoʻllanmaydi;
    // mavjud binolar (toʻsiq) bilan kesishgan uchastkadagi uy olinmaydi
    const hit = (s: GenSection) => (opts.avoid ?? []).some(o => { try { return polygonClipping.intersection([[...(s.plot ?? s.ring), (s.plot ?? s.ring)[0]].map(p => [p[0], p[1]] as [number, number])], [[...o.ring, o.ring[0]].map(p => [p[0], p[1]] as [number, number])]).length > 0; } catch { return false; } });
    const n0 = r.sections.length; r.sections = r.sections.filter(s => !hit(s));
    if (r.sections.length < n0) r.notes.push(`${n0 - r.sections.length} ta uy mavjud bino bilan kesishgani uchun qoʻyilmadi`);
    r.far = gfaOf(r) / site;
    return r;
  }
  // notekis parsel: oʻtkir uchlar tik qirqiladi, tor boʻlaklar olinadi; mavjud binolar — toʻsiq (ustiga qurilmaydi, masofa saqlanadi)
  r.sections = squareSections(r.sections, g.depth, r.notes);
  if (opts.avoid?.length) r.sections = avoidObstacles(r.sections, opts.avoid, g.minF, floorH, r.notes);
  if (g.exact && XS.full + XS.short > 0) {
    const n = (v: number) => String(v).replace('.', ',');
    const a = n(g.secLen), b = n(g.depth), parts = [`Aniq oʻlcham: ${XS.full} seksiya ${a} × ${b} m`];
    if (XS.short) parts.push(`${XS.short} ta qisqa (qoldiq ≥ 9 m)`);
    if (XS.gap) parts.push(`${XS.gap} ta oraliq (qoldiq 3–9 m)`);
    if (XS.stretch) parts.push(`${XS.stretch} tasi < 3 m uzunroq`);
    r.notes.push(parts.join(' · '));
  }
  if (g.typology === 'avto') r.notes.unshift(`Avto: UMN ${String(far || 2).replace('.', ',')} → «${TYPO_NAME[t]}»`);
  // stilobat: chekinish ichidagi butun maydon, seksiyalar uning ustida
  const st = Math.max(0, Math.round(g.stylobate ?? 0)), outer = inset(clean(block), g.setback);
  const podiumOk = st > 0 && outer && ['perimetr', 'qatorlar', 'minora', 'blok_minora', 'ofis_plita'].includes(t);
  if (podiumOk) {
    r.sections = r.sections.map(s => ({ ...s, z0: st, nonRes: 0 }));
    r.sections.unshift({ ring: clean(outer!, 6), floors: st, kind: 'stilobat', nonRes: st, use: g.parking === 'stilobat' ? 'avtoturargoh' : 'savdo' });
  }
  // avtoturargoh
  const pk = g.parking ?? 'yoq';
  if (pk !== 'yoq' && outer) r.parking = placeParking(clean(outer, 6), r, g, t, opts) ?? undefined;
  archFloors(r.sections);
  dropStrays(r.sections, Math.max(6, 0.6 * g.maxF * floorH), r.notes);
  assignEnds(r.sections, opts.avoid ?? [], g.depth, floorH);
  r.far = (gfaOf(r)) / site;
  if (far > 0 && r.far < far - 0.15) r.notes.push(`UMN maqsadi ${String(far).replace('.', ',')} ga yetmadi (${r.far.toFixed(2).replace('.', ',')}): meʼyoriy oraliqlar bilan joy yetmadi — «Qavat, eng koʻp» ni oshiring (qavat qoʻshish orqali)`);
  return r;
}

/** 29-jadval talabi shu kvartal binolaridan (xonadonlar — turar GFA × netto ulushi ÷ oʻrtacha xonadon) */
export function blockParkingNeed(sections: GenSection[], opts: GenOpts = {}): Record<string, number> {
  let res = 0, ofis = 0, trade = 0;
  for (const s of sections) {
    if (s.kind === 'stilobat' && s.use === 'avtoturargoh') continue;
    const a = aOf(s.ring), u = s.use ?? opts.use ?? 'turar', nr = Math.min(s.floors, s.nonRes);
    if (u === 'ofis' || u === 'mehmonxona') ofis += a * s.floors;
    else if (u === 'savdo') trade += a * s.floors;
    else if (u === 'turar' || u === 'aralash') { res += a * (s.floors - nr); trade += a * nr; }
  }
  return parkingNeed({ apartments: res * (opts.netToGross ?? 0.75) / (opts.aptNet ?? 65), ofisGfa: ofis, tradeArea: trade * 0.7 });
}

const NEED_NAME: Record<string, string> = { kvartiralar: 'xonadonlar', ofis: 'ofis', savdo: 'savdo', maktab: 'maktab', mtm: 'MTM', park: 'park' };
/** Avtoturargoh: joylar modul boʻyicha (dizayn-kod 6.3), soni — 29-jadval talabi boʻyicha (yoki sigʻimicha) */
function placeParking(A: XY[], r: GenResult, g: GenParams, t: Typology, opts: GenOpts): GenParking | null {
  const pk = g.parking ?? 'yoq'; if (pk === 'yoq') return null;
  const mod: ParkModule = g.parkModule ?? 'p90', M = PARK_MOD[mod], norm = g.parkNorm ?? true;
  const parts = blockParkingNeed(r.sections, opts), need = sumNeed(parts);
  const needTxt = Object.entries(parts).filter(([, v]) => v > 0).map(([k, v]) => `${NEED_NAME[k] ?? k} ${v}`).join(' · ');
  const modTxt = `${M.name}, ${String(M.W).replace('.', ',')} × ${String(M.L).replace('.', ',')} m, boʻlak ${String(M.A).replace('.', ',')} m`;
  let out: GenParking | null = null;
  if (pk === 'yer_osti' || pk === 'stilobat') {
    const st = Math.max(0, Math.round(g.stylobate ?? 0));
    if (pk === 'stilobat' && !r.sections.some(s => s.kind === 'stilobat')) { r.notes.push('Stilobat ichida parkovka uchun stilobat qavatini kiriting'); return null; }
    // bitta sath: modul boʻyicha joylar; rampa, zinapoya-lift tugunlari, ustunlar va texnik xonalar uchun −20 %
    const per = Math.floor(layoutStalls(A, [], mod).n * 0.8);
    if (per <= 0) { r.notes.push('Avtoturargoh uchun joy yetarli emas'); return null; }
    const lv = pk === 'stilobat' ? st : norm ? Math.max(1, Math.min(4, Math.ceil(need / per))) : Math.max(1, Math.round(g.parkLevels ?? 1));
    out = { kind: pk, ring: A, levels: lv, spaces: per * lv, need, module: mod };
    r.notes.push(`Avtoturargoh (${PARK_NAME[pk]}): ${out.spaces} joy — ${lv} sath × ${per} joy (${modTxt}; rampa, tugunlar va ustunlar −20 %)`);
  } else {
    // yer usti: binolardan bufer (turar — 10 m, boshqa — 3 m); joylar va boʻlaklar hovlining koʻpi bilan 35 % ida, savdo markazida — butun hovli
    const ground = r.sections.filter(s => !s.z0 && !(s.kind === 'stilobat' && s.use === 'avtoturargoh'));
    const obs: Obstacle[] = ground.map(s => ({ ring: s.ring, buf: (s.use ?? opts.use ?? 'turar') === 'turar' || s.use === 'aralash' ? 10 : 3 }));
    const L = layoutStalls(A, obs, mod);
    const free = Math.max(0, aOf(A) - ground.reduce((s, x) => s + aOf(x.ring), 0));
    const cap = t === 'savdo_blok' ? Infinity : Math.floor(free * 0.35 / stallGross(mod));
    const n = Math.min(L.n, cap, norm ? Math.max(need, 0) : Infinity);
    const K = trimStalls(L, n, A);
    if (!K.n) { r.notes.push('Yer usti avtoturargoh uchun hovlida joy yoʻq — yer osti variantini tanlang'); return null; }
    // #25: boʻlaklar bir-biriga va koʻchaga (kvartal chegarasi) ulanadi
    const acc = parkAccess(K, A, ground.map(s => s.ring));
    out = { kind: pk, ring: A, levels: 1, spaces: K.n, need, module: mod, stalls: K.stalls, aisles: K.aisles };
    r.notes.push(`Avtoturargoh (${PARK_NAME[pk]}): ${K.n} joy (${modTxt})`);
    const accLen = String(Math.round((acc?.len ?? 0) * 10) / 10).replace('.', ',');
    if (acc) r.notes.push(`Kirish yoʻli: ${accLen} m, eni 5,5 m (ShNQ 2.07.06-24, 106-band); chiqish kvartal burchagidan ≥ 20 m (ShNQ 2.07.01-23, 414-band)`);
    else r.notes.push('Avtoturargohni koʻchaga ulab boʻlmadi — binolar toʻsadi; kirish yoʻlini qoʻlda chizing');
  }
  if (need > 0) {
    r.notes.push(`Talab: ${need} joy (29-jadval: ${needTxt})`);
    if (out.spaces < need) {
      const per = Math.max(1, Math.floor(layoutStalls(A, [], mod).n * 0.8));
      r.notes.push(`Yetishmaydi: ${need - out.spaces} joy — yer osti avtoturargoh (≈ ${Math.ceil((need - out.spaces) / per)} sath) yoki «Avtoturargoh» yer uchastkasi kerak`);
    }
  }
  return out;
}

export const TYPO_NAME: Record<Typology, string> = { avto: 'Avto (UMN boʻyicha)', yakka: 'Yakka uylar', taunhaus: 'Taunhauslar', juft: 'Juft uylar (ikki xonadonli)', hovli: 'Hovli uylar (oʻzbek tipi)', villa: 'Shahar villalari', perimetr: 'Perimetral blok', qatorlar: 'Kenglik qatorlari (sharq–gʻarb)', minora: 'Minoralar', blok_minora: 'Blok + burchak minorasi', blok_villa: 'Blok + villalar', ofis_plita: 'Ofis plitalari', ofis_minora: 'Ofis minoralari + stilobat', savdo_blok: 'Savdo markazi + parkovka' };
/** Funksiya boʻyicha odatiy generator sozlamalari (turar joydan tashqari); null — foydalanuvchi sozlamalari */
export function usePreset(use: string, g: GenParams): GenParams | null {
  switch (use) {
    case 'ofis': return { ...g, typology: g.typology === 'ofis_minora' ? 'ofis_minora' : 'ofis_plita', minF: 6, maxF: Math.max(6, Math.min(12, g.maxF)), towerF: Math.max(12, g.towerF ?? 16), nonRes: 0, far: 0, stylobate: 0, parking: g.parking === 'yoq' ? 'yer_osti' : g.parking };
    case 'mehmonxona': return { ...g, typology: 'ofis_minora', towerF: Math.max(10, Math.min(16, g.towerF ?? 12)), nonRes: 0, far: 0, stylobate: 0 };
    case 'savdo': return { ...g, typology: 'savdo_blok', maxF: Math.min(3, Math.max(1, g.maxF)), minF: 1, nonRes: 0, far: 0, stylobate: 0, parking: 'yer_usti' };
    default: return null;
  }
}
export const PARK_NAME: Record<ParkingKind, string> = { yoq: 'Yoʻq', yer_osti: 'Yer osti', stilobat: 'Stilobat ichida', yer_usti: 'Yer usti' };
