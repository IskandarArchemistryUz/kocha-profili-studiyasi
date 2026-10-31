/**
 * Seysmik boʻlmalar — QMQ 2.01.03-19 «Seysmik hududlarda qurilish» (egasi, 30.10).
 * 3.1.3: bino 3.1.1 talablariga javob bermasa yoki tarhdagi oʻlchamlari 3.1-jadvaldan katta boʻlsa — antiseysmik choklar bilan
 * boʻlmalarga ajratiladi. 3.7.2: choklar orasidagi masofa 3.1-jadvaldan oshmaydi.
 * 3.1.1: bino tarhda geometrik toʻgʻri shakllardan iborat; chiqib turgan qism — tosh/gʻisht 2 m, monolit/panel/karkas 6 m gacha;
 * bir boʻlmada qavatlar farqi 6 m (ikki qavat) gacha. 3.2.3: bikrlik yadroli bino/boʻlma 24 m dan uzun boʻlsa — kamida 2 yadro.
 * 3.1-jadval, «Bino (boʻlma) uzunligi, m» ustuni (7 / 8 / 9 ball) — asl matndan (33-bet):
 *   2-qator — yaxlit temirbeton, yirik panelli devorlar: 60 / 45 / 36;
 *   1.2.2 б — bogʻlamli yoki rama-bogʻlamli yaxlit temirbeton karkas: 100 / 80 / 60;
 *   1.2.2 е/ж — toʻldiruvchili (tosh, blok, gʻisht) karkas: 80 / 60 / 40;
 *   4 — qoʻlda terilgan kompleks konstruksiyali devorlar, oliy va I toifa: 80 / 60 / 40;
 *   5 — qoʻlda terilgan sopol/beton tosh, gʻisht, oliy va I toifa: 40 / 30 / 20.
 */
import { area, obb2, signedArea, type XY } from './geo';
import { splitAtReflex } from './roof';
import type { Building, ConstructSys } from './doc';

export interface SysDef { id: ConstructSys; name: string; /** 3.1-jadval qatori */ row: string; /** boʻlma uzunligi, m: 7 / 8 / 9 ball */ len: [number, number, number]; /** chiqib turgan qism, m (3.1.1) */ proj: number; /** bikrlik yadrosi qoidasi (3.2.3) tegishli */ core: boolean }
export const SYS: Record<ConstructSys, SysDef> = {
  monolit: { id: 'monolit', name: 'Monolit temirbeton devorlar / yirik panel', row: '2-qator', len: [60, 45, 36], proj: 6, core: false },
  karkas: { id: 'karkas', name: 'Monolit karkas (bogʻlamli, rama-bogʻlamli)', row: '1.2.2 б', len: [100, 80, 60], proj: 6, core: true },
  toldirgich: { id: 'toldirgich', name: 'Toʻldiruvchili karkas (gʻisht, blok)', row: '1.2.2 е/ж', len: [80, 60, 40], proj: 6, core: true },
  gisht: { id: 'gisht', name: 'Gʻisht devorlar (qoʻlda terilgan, I toifa)', row: '5-qator', len: [40, 30, 20], proj: 2, core: false },
};
/** Boʻlma uzunligi chegarasi, m (ball 7–9; 9 dan katta — 9 ustuni, 7 dan kichik — NSTT: cheklanmagan) */
export function lenLimit(sys: ConstructSys, ball: number): number | null {
  const d = SYS[sys] ?? SYS.monolit; if (ball < 7) return null;
  return d.len[Math.max(0, Math.min(2, Math.round(ball) - 7))];
}

export interface BlockShape { /** eng katta oʻlcham (OBB), m */ len: number; /** chiqib turgan qismlar, m (toʻrtburchakda boʻsh) */ proj: number[]; /** toʻgʻri toʻrtburchakmi (OBB toʻldirilishi ≥ 92 %) */ rect: boolean }
/** Kontur shakli: uzunligi va chiqib turgan qismlari (L, T, U qanotlari — asosiy qanotdan tashqariga qancha chiqadi) */
export function blockShape(r0: XY[]): BlockShape {
  const r = signedArea(r0) < 0 ? [...r0].reverse() : r0, o = obb2(r), fill = area(r) / Math.max(1e-6, o.L * o.S);
  if (fill >= 0.92 || r.length < 5) return { len: o.L, proj: [], rect: fill >= 0.92 };
  const wings = splitAtReflex(r); if (!wings || wings.length < 2) return { len: o.L, proj: [], rect: false };
  const main = wings.reduce((a, b) => area(b) > area(a) ? b : a), proj: number[] = [];
  for (const w of wings) {
    if (w === main) continue;
    // asosiy qanotning har qirrasi: qanot shu qirraga tegsa — undan tashqariga eng uzoq nuqtasi
    let best = Infinity;
    for (let i = 0; i < main.length; i++) {
      const a = main[i], b = main[(i + 1) % main.length], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = dy / L, ny = -dx / L;   // tashqi normal (CCW)
      const ds = w.map(p => (p[0] - a[0]) * nx + (p[1] - a[1]) * ny);
      if (Math.min(...ds.map(Math.abs)) > 0.3) continue;   // tegmaydi
      const out = Math.max(...ds); if (out > 0.3 && out < best) best = out;
    }
    if (best < Infinity) proj.push(Math.round(best * 10) / 10);
  }
  return { len: o.L, proj, rect: false };
}

export interface BlockCheck { len: number; limit: number | null; lenOk: boolean; proj: number; projLim: number; projOk: boolean; rect: boolean }
/**
 * Yongʻin boʻlmasi qavat maydoni — ANDOZA faqat avtoturargoh stilobati uchun (avtoturargoh meʼyori matni yoʻq). Jamoat binolari —
 * ShNQ 2.08.02-23, 44-band, 2-ilova (fireComp).
 */
export const FIRE_COMP_ANDOZA = 2500;
/**
 * ShNQ 2.08.02-23, 44-band: 1-tipli (REI 150) yongʻinga qarshi devorlar orasidagi qavat maydoni, m² — 2-ilova:
 *  2-jadval (jamoat binolari, konstruktiv yongʻin xavfi sinfi CO; ustunlar 1 / 2 / 3–5 / 6–9 / 10–16 qavat):
 *   I — 6000 / 5000 / 5000 / 5000 / 2500;  II — 6000 / 4000 / 4000 / 4000 / 2200;
 *  3-jadval, savdo korxonalari (I, II; ≤ 5 qavat): bir qavatli 3500, ikki qavatli 3000, 3–5 qavatli 2500;
 *  izohlar: I va II darajali, avtomatik yongʻin oʻchirish tizimi boʻlsa — ikki barobargacha oshirish mumkin.
 * Olovbardoshlik darajasi — taxmin: monolit / monolit karkas — I, qolganlari — II. Avtoturargoh — andoza.
 */
export function fireComp(use: string, floors: number, sys: ConstructSys): { area: number; src: string; norm: boolean } {
  if (use === 'avtoturargoh') return { area: FIRE_COMP_ANDOZA, src: 'andoza (avtoturargoh meʼyori matni yoʻq)', norm: false };
  const deg = sys === 'monolit' || sys === 'karkas' ? 'I' : 'II';
  if (use === 'savdo') { const a = floors <= 1 ? 3500 : floors === 2 ? 3000 : 2500; return { area: a, src: `ShNQ 2.08.02-23, 2-ilova, 3-jadval (savdo, ${deg})`, norm: true }; }
  const T = deg === 'I' ? [6000, 5000, 5000, 5000, 2500] : [6000, 4000, 4000, 4000, 2200];
  const i = floors <= 1 ? 0 : floors === 2 ? 1 : floors <= 5 ? 2 : floors <= 9 ? 3 : 4;
  return { area: T[i], src: `ShNQ 2.08.02-23, 2-ilova, 2-jadval (${deg}, CO)`, norm: true };
}
/** Antiseysmik chok bilan ajratilgan boʻlmalar: ichki (botiq) burchaklardan toʻgʻri toʻrtburchak qismlar (3.1.3) */
export function jointBlocks(ring: XY[], maxLen?: number | null, maxArea?: number, avoid: XY[][] = []): XY[][] {
  return jointScheme(ring, maxLen, maxArea, avoid).parts;
}
/**
 * Avtomatik choklar sxemasi (31.10, egasi: «stilobatlar… avtomat choklar sxemasini ishlab chiqish kerak»):
 * 1) ichki burchaklardan toʻgʻri toʻrtburchak qismlar (3.1.3); 2) har qism uzun oʻqi boʻylab n = max(⌈L / maxLen⌉, ⌈A / maxArea⌉)
 * teng boʻlakka (3.7.2: choklar orasi 3.1-jadvaldan oshmaydi; maydon — yongʻin boʻlmasi, andoza). Chok chizigʻi `avoid`
 * konturlarini (stilobat ustidagi minoralar) kesmasligi uchun eng yaqin boʻsh joyga suriladi; joy boʻlmasa — oʻz oʻrnida.
 * Chok = antiseysmik chok + yongʻinga qarshi devor (bitta chiziq; andoza yechim).
 */
export function jointScheme(ring: XY[], maxLen?: number | null, maxArea?: number, avoid: XY[][] = []): { parts: XY[][]; cuts: [XY, XY][] } {
  const r = signedArea(ring) < 0 ? [...ring].reverse() : ring, w = r.length >= 5 ? splitAtReflex(r) : null;
  const base = w && w.length > 1 ? w : [r];
  const cuts: [XY, XY][] = [];
  if (base.length > 1) for (let i = 0; i < base.length; i++) for (let j = i + 1; j < base.length; j++) { const sh = sharedEdge(base[i], base[j]); if (sh) cuts.push(sh); }
  if (!maxLen && !maxArea) return { parts: base, cuts };
  const parts: XY[][] = [];
  for (const q of base) {
    const o = obb2(q), U = o.U, V: XY = [-U[1], U[0]], A = area(q);
    const pu = (p: XY) => p[0] * U[0] + p[1] * U[1], pv = (p: XY) => p[0] * V[0] + p[1] * V[1];
    const u0 = Math.min(...q.map(pu)), u1 = Math.max(...q.map(pu)), v0 = Math.min(...q.map(pv)), v1 = Math.max(...q.map(pv));
    // toʻr: har ikki yoʻnalishda uzunlik chegarasi, maydon oshsa — kattaroq katak tomoni boʻyicha qoʻshimcha chok
    let nu = maxLen ? Math.max(1, Math.ceil((u1 - u0) / maxLen - 0.001)) : 1, nv = maxLen ? Math.max(1, Math.ceil((v1 - v0) / maxLen - 0.001)) : 1;
    if (maxArea) while (A / (nu * nv) > maxArea && nu * nv < 400) { if ((u1 - u0) / nu >= (v1 - v0) / nv) nu++; else nv++; }
    if (nu * nv <= 1 || nu * nv > 400) { parts.push(q); continue; }
    const tu = pick(u0, u1, nu, maxLen, avoid.map(a => a.map(pu))), tv = pick(v0, v1, nv, maxLen, avoid.map(a => a.map(pv)));
    const eu = [u0, ...tu, u1], ev = [v0, ...tv, v1];
    for (let a = 0; a < eu.length - 1; a++) {
      const strip = clipU(q, U, eu[a], eu[a + 1]); if (strip.length < 3) continue;
      for (let b = 0; b < ev.length - 1; b++) { const piece = clipU(strip, V, ev[b], ev[b + 1]); if (piece.length >= 3 && area(piece) > 1) parts.push(piece); }
    }
    const P = (u: number, v: number): XY => [U[0] * u + V[0] * v, U[1] * u + V[1] * v];
    for (const t of tu) cuts.push([P(t, v0), P(t, v1)]);
    for (const t of tv) cuts.push([P(u0, t), P(u1, t)]);
  }
  return { parts, cuts };
}
/**
 * Bir oʻq boʻyicha n − 1 chok oʻrni: teng boʻlinish nuqtasiga eng yaqin, ustidagi binolarni (avoid proyeksiyalari) eng kam kesadigan joy —
 * nomzodlar: teng boʻlinish nuqtasi va binolar chetlari (seksiyalar orasidagi chok). Qoʻshni boʻlma maxLen dan oshmasligi shart.
 */
function pick(a: number, b: number, n: number, maxLen: number | null | undefined, av: number[][]): number[] {
  if (n <= 1) return [];
  const iv = av.map(xs => [Math.min(...xs), Math.max(...xs)] as [number, number]).filter(([x0, x1]) => x1 > a && x0 < b);
  const cross = (t: number) => iv.filter(([x0, x1]) => t > x0 + 0.3 && t < x1 - 0.3).length;
  const step = (b - a) / n, out: number[] = [];
  let prev = a;
  for (let k = 1; k < n; k++) {
    const t0 = a + step * k, lo = Math.max(prev + 3, maxLen ? t0 - step * 0.4 : t0 - step * 0.4), hi = Math.min(b - 3, maxLen ? prev + maxLen : t0 + step * 0.4, t0 + step * 0.4);
    let best = t0, bs = cross(t0) * 1000;
    for (const c of iv.flatMap(([x0, x1]) => [x0, x1])) { if (c < lo || c > hi) continue; const sc = cross(c) * 1000 + Math.abs(c - t0); if (sc < bs) { bs = sc; best = c; } }
    out.push(best); prev = best;
  }
  // oxirgi boʻlma chegaradan oshsa — teng boʻlinish
  if (maxLen && [a, ...out, b].some((x, k, e) => k && x - e[k - 1] > maxLen + 0.05)) return Array.from({ length: n - 1 }, (_, k) => a + step * (k + 1));
  return out;
}
/** Koʻpburchakni u ∈ [a, b] tasmaga qirqish (Sutherland–Hodgman, ikki yarim tekislik) */
function clipU(r: XY[], U: XY, a: number, b: number): XY[] {
  const half = (pts: XY[], f: (p: XY) => number): XY[] => {
    const out: XY[] = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length], fp = f(p), fq = f(q);
      if (fp >= 0) out.push(p);
      if ((fp >= 0) !== (fq >= 0)) { const t = fp / (fp - fq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
    }
    return out;
  };
  const pu = (p: XY) => p[0] * U[0] + p[1] * U[1];
  return half(half(r, p => pu(p) - a), p => b - pu(p));
}
/** Ikki qismning umumiy qirrasi (chok chizigʻi) */
function sharedEdge(a: XY[], b: XY[]): [XY, XY] | null {
  for (let i = 0; i < a.length; i++) {
    const p = a[i], q = a[(i + 1) % a.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]); if (L < 0.5) continue;
    const u: XY = [(q[0] - p[0]) / L, (q[1] - p[1]) / L];
    for (let j = 0; j < b.length; j++) {
      const c = b[j], d = b[(j + 1) % b.length];
      const off = (x: XY) => Math.abs((x[0] - p[0]) * u[1] - (x[1] - p[1]) * u[0]);
      if (off(c) > 0.05 || off(d) > 0.05) continue;
      const t = (x: XY) => (x[0] - p[0]) * u[0] + (x[1] - p[1]) * u[1], lo = Math.max(0, Math.min(t(c), t(d))), hi = Math.min(L, Math.max(t(c), t(d)));
      if (hi - lo > 0.5) return [[p[0] + u[0] * lo, p[1] + u[1] * lo], [p[0] + u[0] * hi, p[1] + u[1] * hi]];
    }
  }
  return null;
}
/** joint — bino chok bilan boʻlmalarga ajratilgan: har boʻlma alohida tekshiriladi, natija — eng yomoni */
export function checkBlock(ring: XY[], sys: ConstructSys, ball: number, joint = false, opt: { area?: number; avoid?: XY[][] } = {}): BlockCheck {
  if (joint) { const parts = jointBlocks(ring, lenLimit(sys, ball), opt.area, opt.avoid); if (parts.length > 1) { const cs = parts.map(p => checkBlock(p, sys, ball)); const bad = (c: BlockCheck) => (c.projOk ? 0 : 2) + (c.lenOk ? 0 : 1); return cs.reduce((a, c) => bad(c) > bad(a) || (bad(c) === bad(a) && c.len > a.len) ? c : a); } }
  const sh = blockShape(ring), d = SYS[sys] ?? SYS.monolit, limit = lenLimit(sys, ball), proj = sh.proj.length ? Math.max(...sh.proj) : 0;
  return { len: Math.round(sh.len * 10) / 10, limit, lenOk: limit == null || sh.len <= limit + 0.05, proj, projLim: d.proj, projOk: proj <= d.proj + 0.05, rect: sh.rect };
}

/** Stilobatmi (generator stilobati) */
export const isPodium = (b: Building): boolean => b.gen?.kind === 'stilobat';
/**
 * Bino uchun chok sxemasi parametrlari: stilobat — yongʻin boʻlmasi maydoni (andoza) va ustidagi minoralar (chok ular ostidan oʻtmaydi:
 * ShNQ 2.01.02-04, 6.16–6.17 — yongʻinga qarshi devor binoning butun balandligiga), boshqa binolar — faqat 3.1-jadval uzunligi.
 */
export function jointOpt(b: Building, all: Building[], toLocal: (p: [number, number]) => XY, sys: ConstructSys = 'monolit'): { area?: number; avoid?: XY[][] } {
  if (!isPodium(b)) return {};
  const grp = b.gen?.grp, avoid = all.filter(o => o !== b && (o.z0 ?? 0) > 0 && o.gen?.grp === grp).map(o => o.footprint.map(toLocal));
  return { area: fireComp(b.use, b.floors, sys).area, avoid };
}
