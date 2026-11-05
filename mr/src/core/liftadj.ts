/**
 * Lift shaxtasi va zinapoya katagining kvartira xonalariga tutashuvi (05.11, egasi: «lift va zina shaxtalari kvartiralardan
 * ajratilgan boʻlishi kerakmi?»).
 *
 * NORMA — ShNQ 2.08.01-24 (asl matn):
 *   230-band: «Lift shaxtalari yashash xonalari bilan yonma-yon joylashishiga yoʻl qoʻyilmaydi.»
 *   231-band: «Liftlarning mashina xonalarini yashash xonalarining bevosita ustida va yonida joylashtirishga yoʻl qoʻyilmaydi.»
 * TALQIN: yashash xonasi — umumiy xona (oshxona-mehmonxona), yotoqxona, xona; oshxona, sanuzel, dahliz, yoʻlak, kiyimxona — emas
 *   (46-band «oshxona va yashash xonalari»ni alohida sanaydi).
 * AMALIYOT: zinapoya katagi yotoqxonaga tutashmasin — papkadagi normalarda taqiq topilmadi (shovqin — SHNQ 2.01.08-24, matni yoʻq),
 *   shuning uchun «koʻrib chiqish».
 */
import { aptInterior, type InKind, type AptInterior } from './aptplan';
import { sharedEdge, type RulePlan, type FacadeMod, type PlanCheck, type RuleApt } from './sectionplan';
import type { XY } from './geo';

const LIVING: InKind[] = ['umumiy', 'xona', 'yotoq', 'master'];
const BED: InKind[] = ['xona', 'yotoq', 'master'];
const touch = (a: XY[], b: XY[]) => sharedEdge(a, b, 0.3).len;

export interface AdjHit { apt: number; len: number; kind: InKind }
/** Kvartira ichki rejasidagi yashash xonalari lift shaxtasiga / yotoqxonalar zinaga tegadimi */
export function liftAdj(P: RulePlan, mods: FacadeMod[], interior: (a: RuleApt) => AptInterior | null = a => aptInterior(a, mods)): { lift: AdjHit[]; stair: AdjHit[]; unknown: number } {
  const lift: AdjHit[] = [], stair: AdjHit[] = []; let unknown = 0;
  P.apts.forEach((a, i) => {
    const nl = P.lifts.filter(l => touch(a.ring, l) > 0.3), ns = P.stairs.filter(s => touch(a.ring, s) > 0.3);
    if (!nl.length && !ns.length) return;
    let I: AptInterior | null = null; try { I = interior(a); } catch { I = null; }
    if (!I) { if (nl.length) unknown++; return; }
    for (const r of I.rooms) {
      if (LIVING.includes(r.kind)) { const len = nl.reduce((t, l) => t + touch(r.ring, l), 0); if (len > 0.3) lift.push({ apt: i, len, kind: r.kind }); }
      if (BED.includes(r.kind)) { const len = ns.reduce((t, s) => t + touch(r.ring, s), 0); if (len > 0.3) stair.push({ apt: i, len, kind: r.kind }); }
    }
  });
  return { lift, stair, unknown };
}

/**
 * Generator: liftga tutash yashash xonasi chiqqan kvartirada ichki rejaning ikkinchi varianti (umumiy xona narigi tomonda — inner.flip)
 * sinanadi; tutashuv yoʻqolsa yoki kamaysa — shu qoldiriladi. Qoʻlda tanlangan (inner.flip berilgan) kvartiraga tegilmaydi.
 */
export function fixLiftAdj(P: RulePlan, mods: FacadeMod[]): number {
  const lenOf = (a: RuleApt) => { let I: AptInterior | null = null; try { I = aptInterior(a, mods); } catch { I = null; } if (!I) return Infinity; return I.rooms.filter(r => LIVING.includes(r.kind)).reduce((t, r) => t + P.lifts.reduce((s, l) => s + touch(r.ring, l), 0), 0); };
  let fixed = 0;
  P.apts.forEach(a => {
    if (a.inner?.flip != null || !P.lifts.some(l => touch(a.ring, l) > 0.3)) return;
    const l0 = lenOf(a); if (!(l0 > 0.3)) return;
    const b: RuleApt = { ...a, inner: { ...(a.inner ?? {}), flip: true } }, l1 = lenOf(b);
    if (l1 < l0 - 0.3) { a.inner = b.inner; fixed++; }
  });
  return fixed;
}

const f1 = (v: number) => v.toFixed(1).replace('.', ',');
/** Reja tekshiruvlari: lift-230 (mos emas) va zina-amaliyot (koʻrib chiqish) */
export function liftChecks(P: RulePlan, mods: FacadeMod[]): PlanCheck[] {
  if (!P.lifts.length && !P.stairs.length) return [];
  const r = liftAdj(P, mods), nL = new Set(r.lift.map(h => h.apt)).size, nS = new Set(r.stair.map(h => h.apt)).size;
  return [
    { id: 'lift-230', title: 'Lift shaxtasi yashash xonasiga tutashmaydi', ok: P.lifts.length ? (nL ? false : r.unknown ? null : true) : null, value: !P.lifts.length ? 'lift yoʻq' : nL ? `${nL} kvartirada yashash xonasi liftga tutash (${f1(Math.max(...r.lift.map(h => h.len)))} m)` : r.unknown ? `${r.unknown} kvartira ichki rejasi yoʻq — tekshirilmadi` : 'tutash yashash xonasi yoʻq', norm: 'yonma-yon yoʻl qoʻyilmaydi (oshxona, sanuzel, dahliz — mumkin)', source: 'ShNQ 2.08.01-24, 230–231-bandlar' },
    { id: 'zina-amaliyot', title: 'Zinapoya katagi yotoqxonaga tutashmaydi', ok: nS ? null : true, value: nS ? `${nS} kvartirada yotoqxona zinaga tutash` : 'tutash yotoqxona yoʻq', norm: 'yotoqxona — zinadan ajratilgan (shovqin)', source: 'AMALIYOT (SHNQ 2.01.08-24 papkada yoʻq)' },
  ];
}
