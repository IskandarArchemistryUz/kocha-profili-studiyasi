/**
 * Ijtimoiy binolar avtomat: maktab, MTM (bogʻcha), poliklinika — parsel maydoni, aholi va meʼyordan sigʻim,
 * soʻng tanlangan modul (dunyo amaliyotidagi tipologiyalar) parselga joylashtiriladi.
 *
 * Meʼyorlar (asl matndan, ShNQ 2.07.01-23):
 *  548-band — maktab qamrovi: boshlangʻich va tayanch (1–9 sinf) 100 %, oʻrta (10–11) 75 %;
 *  549-band, 41-jadval — maktab uchastkasi: 20 / 15 / 10 m² oʻquvchiga (40–660 / 661–989 / > 989);
 *  542-band — MTM qamrovi (1–5 yosh 85 %, 5 yoshdan katta 100 %); 543-band — MTM uchastkasi 40 / 35 m² oʻringa;
 *  560-band, 45-jadval — poliklinika: 1000 kishiga smenada 26 qatnov (13 katta + 13 bolalar), uchastka 0,3–0,5 ga;
 *  39-jadval — maktab va MTM binosi devoridan qizil chiziqqacha ≥ 25 m (shaharda).
 * Bino maydoni (GFA) oʻringa — TAXMIN (Oʻzbekistonda maktab/MTM binolari meʼyori ushbu toʻplamda yoʻq): xalqaro va MDH
 * tipik loyihalari oraligʻidan; panelda oʻzgartiriladi.
 */
import { area, obb2, signedArea, type XY } from './geo';
import { offsetEdges } from './tiers';
import { insetRobust } from './offset';
import { freeRect } from './labels';
import { pointIn } from './plan';
import { perThousand, mtmNeedPerThousand, type DemoRow } from './demography';
import { schoolCapacity, mtmCapacity } from './derive';

export type SocialUse = 'maktab' | 'mtm' | 'poliklinika';
export type Module = 'taroq' | 'hovli' | 'kompakt' | 'chiziq' | 'u' | 'blok' | 'l';

export const SOCIAL: Record<SocialUse, { name: string; unit: string; m2: number; floors: number; maxFloors: number; modules: { id: Module; name: string; note: string }[] }> = {
  maktab: { name: 'Maktab', unit: 'oʻquvchi', m2: 10, floors: 3, maxFloors: 4, modules: [
    { id: 'taroq', name: 'Taroq (finger-plan)', note: 'koridor-oʻq va sinf qanotlari; qanotlar orasida yorugʻ hovlichalar — Yevropa va MDH maktablarida keng tarqalgan' },
    { id: 'hovli', name: 'Hovlili (atrium)', note: 'yopiq hovli atrofida sinflar — issiq iqlimda soyali ichki hovli (Oʻrta Osiyo madrasasi tamoyili)' },
    { id: 'kompakt', name: 'Kompakt blok', note: 'chuqur korpus, markazda yorugʻlik qudugʻi — Skandinaviya maktablari kabi qisqa yoʻllar, kam energiya' } ] },
  mtm: { name: 'MTM (bogʻcha)', unit: 'oʻrin', m2: 12, floors: 2, maxFloors: 3, modules: [
    { id: 'chiziq', name: 'Guruh yacheykalari qatori', note: 'har guruh — alohida yacheyka, oʻyin maydoniga chiqishi bilan; janubga qaratiladi' },
    { id: 'u', name: 'U shakl', note: 'guruhlar himoyalangan hovli atrofida — shamol va changdan panoh' } ] },
  poliklinika: { name: 'Poliklinika', unit: 'qatnov/smena', m2: 15, floors: 4, maxFloors: 6, modules: [
    { id: 'blok', name: 'Chiziqli blok', note: '18 m chuqurlik, ikki tomonlama koridor' },
    { id: 'l', name: 'L shakl', note: 'kattalar va bolalar boʻlimlari alohida kirish bilan' } ] },
};
export const isSocial = (u: string): u is SocialUse => u === 'maktab' || u === 'mtm' || u === 'poliklinika';

/** Loyiha aholisiga koʻra ehtiyoj (oʻrin yoki qatnov) */
export function socialDemand(use: SocialUse, pop: number, r: DemoRow | null): number {
  if (pop <= 0) return 0;
  if (use === 'maktab') { if (!r) return pop * 0.165; const k = 1000 / r.pop; return pop * (r.a6_7 / 2 + r.a8_15 + 0.75 * r.a16_17) * k / 1000; }
  if (use === 'mtm') return r ? pop * mtmNeedPerThousand(r) / 1000 : pop * 0.07;
  return pop * 26 / 1000;
}
void perThousand;

/** Parsel maydonidan sigʻim (41-jadval, 543-band; poliklinika — 0,5 ga ga ~ 750 qatnov deb) */
export function plotCapacity(use: SocialUse, a: number): number {
  if (use === 'maktab') return schoolCapacity(a);
  if (use === 'mtm') return mtmCapacity(a);
  return Math.floor(a / 5000 * 750);
}

export interface SocialPlan { sections: { ring: XY[]; floors: number }[]; gfa: number; footprint: number; notes: string[] }

const rot = (U: XY, c: XY) => (u: number, v: number): XY => [c[0] + U[0] * u - U[1] * v, c[1] + U[1] * u + U[0] * v];

/**
 * Modul joylashtirish. edgeSetback[k] — k-qirradan chekinish (qizil chiziqqa — 25 m, qoʻshni parselga — 6 m).
 */
export function socialPlan(ring: XY[], use: SocialUse, cap: number, mod: Module, m2: number, floors: number, edgeSetback: number[]): SocialPlan {
  const notes: string[] = [];
  const ccw = signedArea(ring) > 0, R = ccw ? ring : [...ring].reverse(), d = ccw ? edgeSetback : [...edgeSetback.slice(0, -1)].reverse().concat(edgeSetback.slice(-1));
  let inner = offsetEdges(R, d) ?? insetRobust(R, d, 20);   // oʻtkir burchak / botiq parsel — tasma ayirish usuli
  if (!inner || area(inner) < 400) { inner = offsetEdges(R, R.map(() => 6)) ?? insetRobust(R, 6, 20); notes.push('Qizil chiziqdan 25 m chekinish (39-jadval) sigʻmadi — 6 m qabul qilindi: meʼyordan chetlanish, ekspertizada asoslash kerak.'); }
  if (!inner || area(inner) < 200) return { sections: [], gfa: 0, footprint: 0, notes: ['Parsel juda kichik — bino sigʻmaydi'] };
  const gfaT = cap * m2, A = gfaT / floors;
  const { U, L, S } = obb2(inner), V: XY = [-U[1], U[0]];
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (const p of inner) { const u = p[0] * U[0] + p[1] * U[1], v = p[0] * V[0] + p[1] * V[1]; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
  void L; void S;
  const c: XY = [U[0] * (u0 + u1) / 2 + V[0] * (v0 + v1) / 2, U[1] * (u0 + u1) / 2 + V[1] * (v0 + v1) / 2];
  let P = rot(U, c), W = u1 - u0, D = v1 - v0;
  const box = (a: number, b: number, w: number, h: number): XY[] => [P(a, b), P(a + w, b), P(a + w, b + h), P(a, b + h)];
  const secs: XY[][] = [], gym: XY[][] = [];
  const fit = (scale: number) => {
    secs.length = 0; gym.length = 0;
    const At = A * scale;
    if (mod === 'taroq') {
      const sp = 15, wd = 12, Ls = Math.min(W, Math.max(40, At / sp * 0.45)), Lw = Math.min(D - sp - 2, 36);
      secs.push(box(-Ls / 2, -D / 2, Ls, sp));
      const n = Math.max(1, Math.min(Math.floor((Ls + 12) / 26), Math.ceil(Math.max(0, At - Ls * sp) / (wd * Math.max(6, Lw)))));
      for (let i = 0; i < n; i++) { const x = n === 1 ? -wd / 2 : -Ls / 2 + i * (Ls - wd) / (n - 1); if (Lw > 6) secs.push(box(x, -D / 2 + sp, wd, Lw)); }
      if (use === 'maktab' && W - Ls > 26) gym.push(box(Ls / 2 + 2, -D / 2, Math.min(36, W / 2 - Ls / 2 - 2), 24));
    } else if (mod === 'hovli' || mod === 'u') {
      const t = mod === 'hovli' ? 14 : 13;
      let a = Math.min(W, Math.max(36, Math.sqrt(At) * 1.25)), b = (At / t + 4 * t - 2 * a) / 2; if (mod === 'u') b = (At / t + 2 * t - a) / 2;
      b = Math.min(D, Math.max(2 * t + 8, b));
      const x0 = -a / 2, y0 = -D / 2;
      secs.push(box(x0, y0, a, t)); secs.push(box(x0, y0 + t, t, b - t)); secs.push(box(x0 + a - t, y0 + t, t, b - t));
      if (mod === 'hovli') secs.push(box(x0 + t, y0 + b - t, a - 2 * t, t));
    } else if (mod === 'kompakt') {
      const dpt = Math.min(D, 30), len = Math.min(W, At / dpt); secs.push(box(-len / 2, -dpt / 2, len, dpt));
    } else if (mod === 'chiziq') {
      const cw = 18, ch = 12, n = Math.max(1, Math.ceil(At / (cw * ch)));
      const perRow = Math.max(1, Math.floor(W / (cw + 1))), rows = Math.ceil(n / perRow);
      for (let i = 0; i < n; i++) { const r = Math.floor(i / perRow), k = i % perRow, off = (k % 2) * 3; secs.push(box(-W / 2 + k * (cw + 1), -D / 2 + r * (ch + 14) + off, cw, ch)); void rows; }
    } else if (mod === 'blok' || mod === 'l') {
      const dp = 18, len = Math.min(W, At / dp);
      secs.push(box(-W / 2, -D / 2, len, dp));
      const rest = At - len * dp; if (rest > 50 && (mod === 'l' || len >= W - 0.1)) secs.push(box(-W / 2, -D / 2 + dp, dp, Math.min(D - dp, rest / dp)));
    }
  };
  const inside = () => [...secs, ...gym].every(r => r.every(p => pointIn(p, [inner!]) || pointIn(p, [ring])));
  let sc = 1; fit(sc);
  for (let k = 0; k < 8 && (!inside() || secs.some(r => area(r) < 20)); k++) { sc *= 0.85; fit(sc); }
  if (!inside()) {
    /* uchburchak / qiya parsel: OBB oʻrniga chekinish ichidagi eng katta toʻrtburchak — modul shu ramkaga joylanadi */
    const fr = freeRect([inner], [], 0);
    if (fr && fr.w >= 12 && fr.h >= 12) {
      const u: XY = [Math.cos(fr.ang), Math.sin(fr.ang)], long = fr.w >= fr.h;
      const U2: XY = long ? u : [-u[1], u[0]];
      P = rot(U2, fr.c); W = (long ? fr.w : fr.h) * 0.98; D = (long ? fr.h : fr.w) * 0.98;
      sc = 1; fit(sc);
      for (let k = 0; k < 10 && (!inside() || secs.some(r => area(r) < 20)); k++) { sc *= 0.85; fit(sc); }
    }
  }
  if (!inside()) return { sections: [], gfa: 0, footprint: 0, notes: [...notes, 'Modul parselga sigʻmadi — boshqa modulni tanlang yoki parselni kattalashtiring'] };
  const fp = secs.reduce((t, r) => t + area(r), 0), gfa = fp * floors + gym.reduce((t, r) => t + area(r) * 2, 0);
  if (sc < 0.99) notes.push(`Parsel kichik: modul ${Math.round(sc * 100)} % ga kichraytirildi — sigʻim ~${Math.round(cap * sc)} ${SOCIAL[use].unit}.`);
  return { sections: [...secs.map(r => ({ ring: r, floors })), ...gym.map(r => ({ ring: r, floors: 2 }))], gfa, footprint: fp, notes };
}
