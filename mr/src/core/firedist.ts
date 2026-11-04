/**
 * Binolar orasidagi yongʻinga qarshi masofa — ShNQ 2.07.01-23, 18-bob (04.11, egasi: «56-jadval: past uylar orasidagi yongʻin masofasi» — ok).
 * 641-band: Ф1–Ф4 binolar orasidagi minimal masofa — 56-jadval; 642-band: Ф1–Ф4 dan Ф5.1–Ф5.3 gacha — 56-jadvalning ikkinchi qismi.
 * 56-jadval (asl matndan), qator — bino, ustun — qarshidagi Ф1–Ф4 bino; olovbardoshlik darajasi / konstruktiv yongʻin xavfi sinfi:
 *   ustunlar: «I, II, III C0» | «II, III C1» | «IV C0, C1» | «IV, V C2, C3»
 *   Ф1–Ф4:  I–III C0: 6 8 8 10;  II–III C1: 8 10 10 12;  IV C0–C1: 8 10 10 12;  IV–V C2–C3: 10 12 12 15
 *   Ф5.1–5.3: I–III C0: 10 12 12 12;  II–III C1: 12 12 12 12;  IV C0–C1: 12 12 12 15;  IV–V C2–C3: 15 15 15 18
 * 644-band: Ф5 binolar oʻzaro — ShNQ 2.09.17-22 va QMQ 2.09.01-19 (bu yerda tekshirilmaydi).
 * 649-band: 9 ball va undan yuqori hududda Ф1 binolar orasidagi va IV–V darajali Ф1–Ф4 binolar orasidagi masofa +20 %.
 * 648-band (koʻr devorlar, I–II C0, yonmaydigan tom: −20 %) va 651-band (avtomatik yongʻin oʻchirish: −50 % gacha) —
 *   deraza va jihozlar maʼlum emas, qoʻllanmaydi (izohda aytiladi).
 * 652-band: tomorqadagi bir va ikki xonadonli uylar va xoʻjalik imoratlaridan qoʻshni uchastkadagilarigacha — ham 56-jadval.
 * 101-band (bloklash): chegaradosh uylar yopishib qurilishi mumkin — tegib turgan (< 0,5 m) juftlar bitta blok, tekshirilmaydi.
 * TAXMIN: olovbardoshlik sinfi — koʻp qavatli binolar (monolit, karkas, gʻisht — yonmaydigan) I–III C0; past uylar — sozlamada
 *   (settings.fireLow, sukut I–III C0). Funksional sinf (ShNQ 2.01.02-04) — funksiyadan: turar joy, mehmonxona, bogʻcha — Ф1;
 *   logistika, sanoat, avtoturargoh, transport, kommunal, texnik — Ф5 (TALQIN); qolganlari — Ф3–Ф4.
 */
import type { Project, Building } from './doc';
import { frame, type XY } from './geo';
import { useDef } from './uses';

export const FIRE_CLS = ['I–III, C0', 'II–III, C1', 'IV, C0–C1', 'IV–V, C2–C3'] as const;
export type FireCls = 0 | 1 | 2 | 3;
const T_F14: number[][] = [[6, 8, 8, 10], [8, 10, 10, 12], [8, 10, 10, 12], [10, 12, 12, 15]];
const T_F5: number[][] = [[10, 12, 12, 12], [12, 12, 12, 12], [12, 12, 12, 15], [15, 15, 15, 18]];
const F5 = new Set(['logistika', 'sanoat', 'avtoturargoh', 'transport', 'kommunal', 'texnik']);
const F1 = new Set(['turar', 'yakka', 'aralash', 'mehmonxona', 'mtm']);
export type FClass = 'F1' | 'F34' | 'F5';
export const fClassOf = (use: string): FClass => (F5.has(use) ? 'F5' : F1.has(use) ? 'F1' : 'F34');
export const isLowHouse = (b: Pick<Building, 'use' | 'gen'>): boolean => !!b.gen?.plot || b.use === 'yakka';
export const fireClsOf = (doc: Pick<Project, 'settings'>, b: Pick<Building, 'use' | 'gen'>): FireCls => (isLowHouse(b) ? (doc.settings.fireLow ?? 0) : 0) as FireCls;

/** Ikki bino orasidagi talab, m (null — tekshirilmaydi: ikkalasi Ф5, 644-band) */
export function fireNeed(a: { f: FClass; c: FireCls }, b: { f: FClass; c: FireCls }, seismic: number): { need: number; plus20: boolean } | null {
  if (a.f === 'F5' && b.f === 'F5') return null;
  let need: number;
  if (a.f === 'F5') need = T_F5[a.c][b.c];
  else if (b.f === 'F5') need = T_F5[b.c][a.c];
  else need = Math.max(T_F14[a.c][b.c], T_F14[b.c][a.c]);
  const plus20 = seismic >= 9 && a.f !== 'F5' && b.f !== 'F5' && ((a.f === 'F1' && b.f === 'F1') || (a.c >= 2 && b.c >= 2));   // 649-band (IV–V — 2 va 3-sinflar ichida IV darajali ham bor; TALQIN)
  return { need: plus20 ? Math.round(need * 1.2 * 10) / 10 : need, plus20 };
}

/** Halqalar orasidagi eng yaqin nuqtalar (kesishsa — d = 0) */
function closest(a: XY[], b: XY[]): { d: number; p: XY; q: XY } {
  const inside = (p: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
  if (a.some(p => inside(p, b)) || b.some(p => inside(p, a))) return { d: 0, p: a[0], q: a[0] };
  let best = { d: Infinity, p: a[0], q: b[0] };
  const seg = (p: XY, q: XY, x: XY, swap: boolean) => {
    const dx = q[0] - p[0], dy = q[1] - p[1], L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((x[0] - p[0]) * dx + (x[1] - p[1]) * dy) / L)) : 0, c: XY = [p[0] + dx * t, p[1] + dy * t], d = Math.hypot(x[0] - c[0], x[1] - c[1]);
    if (d < best.d) best = swap ? { d, p: x, q: c } : { d, p: c, q: x };
  };
  for (let i = 0; i < a.length; i++) for (const x of b) seg(a[i], a[(i + 1) % a.length], x, false);
  for (let i = 0; i < b.length; i++) for (const x of a) seg(b[i], b[(i + 1) % b.length], x, true);
  return best;
}

export interface FirePair { a: string; b: string; d: number; need: number; plus20: boolean; seg: [XY, XY]; low: boolean }
/** Barcha juftlar (yaqinlari, ≤ 20 m), talabdan kami — buzilish */
export function firePairs(doc: Project): { pairs: FirePair[]; checked: number } {
  const fr = frame(doc.origin), seismic = doc.settings.seismic ?? 0;
  const bl = doc.buildings.filter(b => b.floors > 0 && useDef(b.use).build && b.gen?.kind !== 'arka').map(b => {
    const r = b.footprint.map(fr.toLocal); let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of r) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return { b, r, bb: [x0, y0, x1, y1] as const, f: fClassOf(b.use), c: fireClsOf(doc, b), low: isLowHouse(b) };
  });
  // tegib turgan (< 0,5 m) binolar — bitta blok (bloklangan qator, 101-band; stilobat ustidagi minora): zanjir boʻylab birlashtiriladi
  const near: { i: number; j: number; n: { need: number; plus20: boolean }; c: ReturnType<typeof closest> }[] = [], par = bl.map((_, i) => i);
  const root = (i: number): number => (par[i] === i ? i : (par[i] = root(par[i])));
  for (let i = 0; i < bl.length; i++) for (let j = i + 1; j < bl.length; j++) {
    const A = bl[i], B = bl[j], m = 22;
    if (!(A.bb[0] - m < B.bb[2] && B.bb[0] - m < A.bb[2] && A.bb[1] - m < B.bb[3] && B.bb[1] - m < A.bb[3])) continue;
    const c = closest(A.r, B.r);
    if (c.d < 0.5) { par[root(i)] = root(j); continue; }
    const n = fireNeed(A, B, seismic); if (n) near.push({ i, j, n, c });
  }
  const pairs: FirePair[] = []; let checked = 0;
  for (const { i, j, n, c } of near) {
    if (root(i) === root(j)) continue;   // bir blok ichidagi uylar (oraliqdagi uy orqali tutashgan)
    checked++; if (c.d >= n.need - 0.05) continue;
    const A = bl[i], B = bl[j];
    pairs.push({ a: A.b.id, b: B.b.id, d: c.d, need: n.need, plus20: n.plus20, seg: [c.p, c.q], low: A.low && B.low });
  }
  return { pairs, checked };
}

/** Past uylar oʻzaro (Ф1, bir xil sinf) talab, m — generator uchun */
export const lowFireNeed = (doc: Pick<Project, 'settings'>): number => { const c = (doc.settings.fireLow ?? 0) as FireCls; return fireNeed({ f: 'F1', c }, { f: 'F1', c }, doc.settings.seismic ?? 0)!.need; };
