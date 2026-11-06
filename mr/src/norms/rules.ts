/**
 * Meʼyorlar dvigateli: har bir band — maʼlumot yozuvi (manba, tahrir, chegara) + baholash funksiyasi.
 * Qoida qoʻshish yoki tahririni almashtirish ilovaning qolgan qismini oʻzgartirmaydi.
 * Qiymatlar loyihaning tekshirilgan hujjatlaridan (claude/archemistry-bloklar-va-normalar.md,
 * claude/mirobod-kz-normativ-audit.md); asl matn bilan solishtirilmaganlari `verified: false`.
 */
import type { Derived } from '../core/derive';
import { bLevels } from '../core/levels';
import type { Project } from '../core/doc';
import { CATS, checkProfile, profileById, profileWidth } from '../core/profiles';
import { DEMO, demoRow, perThousand, mtmNeedPerThousand } from '../core/demography';
import { spacingIssues } from '../core/spacing';
import { landscape, GREEN_86, GREEN_474 } from '../core/landscape';
import { frame, centroid, type XY } from '../core/geo';
import { deadEnds } from '../core/streetends';
import { firePairs, FIRE_CLS } from '../core/firedist';
import { checkBlock, lenLimit, heightLimit, tallMax, socialFloorLimit, SYS, FIRE_COMP_ANDOZA, fireComp, isPodium, jointOpt, jointScheme } from '../core/seysmik';
import { area as areaOf, obb2 } from '../core/geo';
import { computePlan, corridor, pointIn } from '../core/plan';
import { useDef } from '../core/uses';
import { edgeKinds, boundaryNeed, azOf } from '../core/setback';
import polygonClipping, { type Polygon } from 'polygon-clipping';
import { nextTier, schoolCapacity, mtmCapacity } from '../core/derive';
import { MTM, mtmGroups } from '../core/mtmrule';
import { limitChecks, type SzzVerdict } from '../core/limitcheck';
import { prodChecks } from '../core/prodcheck';
import { isTashkent } from '../core/parking';
import { need413, T30, Q3, WIN30, SOC30, capCol, CAP_COL_NAME, pct5, ringDist, rampLen, ML } from '../core/mlpark';
import { szzGreen, szzBelt, BELT_GAP } from '../core/szzgen';
import { isActive, SZZ_DENY, limitZones } from '../core/limits';
import { entryReport, hasEntryRules, isUg } from '../core/parkenv';
import { type CheckKind } from '../core/parkentry';

const mlOf = (doc: Project) => doc.garages.filter(g => g.kind === 'kop_qavatli');
const mlSum = (doc: Project) => mlOf(doc).reduce((t, g) => t + g.spaces, 0);
const cOf = (r: XY[]): XY => [r.reduce((t, p) => t + p[0], 0) / r.length, r.reduce((t, p) => t + p[1], 0) / r.length];
const inR = (q: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > q[1]) !== (r[j][1] > q[1]) && q[0] < (r[j][0] - r[i][0]) * (q[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
const n0 = (x: number) => Math.round(x).toLocaleString('ru-RU').replace(/\u00a0/g, ' ');
/** Keyingi pogʻona izohi (41-jadval / 543-band): qaysi parsellar kichik va qancha maydon yetishmaydi — faqat ochilgan izohda */
function tierNote(d: Derived, use: 'maktab' | 'mtm'): string {
  const ps = d.socialPlots.filter(p => p.use === use), cap = use === 'maktab' ? schoolCapacity : mtmCapacity;
  const low = ps.map(p => ({ p, t: nextTier(use, p.area) })).filter(x => x.t);
  if (!low.length) return '';
  const lim = use === 'maktab' ? '9 900 m² (41-jadval: 989 dan ortiq — 10 m²/oʻquvchi)' : '3 535 m² (543-band: 100 dan ortiq — 35 m²/oʻrin)';
  const parts = low.map(({ p, t }) => `${n0(p.area)} m² → ${cap(p.area)}; +${n0(t!.area - p.area)} m² → ${t!.cap}`);
  return ` Pogʻona: ${low.length} / ${ps.length} parsel ${lim} dan kichik — ${parts.join(' · ')}. Qavat qoʻshish sigʻimni oshirmaydi (meʼyor — yer maydoni).`;
}

/** 06.11 (c62): binosiz MTM parsellari — sigʻim hisobga olinmagan */
function mtmEmpty(d: Derived): string {
  const e = d.mtmPlots.filter(p => !p.bld); if (!e.length) return '';
  return ' ' + tfU('${n} ta «MTM» parselida bino yoʻq — ≈ ${c} oʻrin hisobga olinmadi (Hajmlar → Joylashtirish).', { n: e.length, c: e.reduce((t, p) => t + p.plot, 0) });
}
/** kalit andozasi (i18n strings.json da ${…} bilan) → oʻzbekcha matn; tarjima koʻrsatishda dyn() orqali */
const tfU = (k: string, v: Record<string, unknown>) => k.replace(/\$\{(\w+)\}/g, (_m, e: string) => String(v[e] ?? ''));

/** Ikki koʻpburchak orasidagi eng qisqa kesma (uchdan qirragacha) */
function closestSeg(a: XY[], b: XY[]): [XY, XY] {
  let best: [XY, XY] = [a[0], b[0]], bd = Infinity;
  const proj = (p: XY, u: XY, v: XY): XY => { const dx = v[0] - u[0], dy = v[1] - u[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - u[0]) * dx + (p[1] - u[1]) * dy) / L2)); return [u[0] + dx * t, u[1] + dy * t]; };
  for (const [P, Q] of [[a, b], [b, a]] as [XY[], XY[]][]) for (const p of P) for (let i = 0; i < Q.length; i++) { const q = proj(p, Q[i], Q[(i + 1) % Q.length]), d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; best = P === a ? [p, q] : [q, p]; } }
  return best;
}

const nm = (v: number) => (Math.round(v * 10) / 10).toString().replace('.', ',');
const EK: Record<CheckKind, string> = { chorraha: 'chorraha', bekat: 'bekat', deraza: 'turar / jamoat binosi', hudud: 'taʼlim / davolash hududi', maydoncha: 'dam olish maydonchasi' };
/** Avtoturargoh kirishlari boʻyicha tekshiruv yigʻindisi (414 / 415): fails matni, where (nuqtalar, kesma va «bor → kerak» yozuvi) */
function entryEval(doc: Project, gs: Project['garages'], pick: (c: { kind: CheckKind }) => boolean): { n: number; fails: string[]; revs: string[]; where?: Where; minX: number | null; noX: boolean } {
  const fails: string[] = [], revs: string[] = [], pts: XY[] = [], segs: [XY, XY][] = [], nsegs: [XY, XY][] = [], labels: { at: XY; text: string }[] = []; let n = 0, minX: number | null = null, anyX = false;
  for (const g of gs) for (const r of entryReport(doc, g)) {
    n++; pts.push(r.e.at);
    const cs = r.checks.filter(pick); if (cs.length) anyX = true;
    for (const c of cs) { if (minX == null || c.d < minX) minX = c.d; if (c.ok) continue;
      // 05.11: shaxta uchun joiz joy topilmagan (garaj chetiga qoʻyilgan) — «koʻrib chiqish», mos emas emas
      (r.e.edge ? revs : fails).push(`${r.e.kind === 'shaxta' ? 'shaxta' : 'kirish'} → ${EK[c.kind]}${c.kind === 'chorraha' && c.main ? ' (magistral)' : ''}: ${nm(c.d)} m, kerak ${c.need} m`);
      segs.push([r.e.at, c.to]); const ns = needSeg(r.e.at, c.to, c.need); nsegs.push(ns); labels.push({ at: ns[1], text: `${nm(c.d)} → ≥ ${c.need} m` }); }
  }
  const where: Where | undefined = n ? { pts, ...(segs.length ? { segs, need: { segs: nsegs, labels } } : {}) } : undefined;
  return { n, fails, revs, ...(where ? { where } : {}), minX, noX: n > 0 && !anyX && pick({ kind: 'chorraha' }) };
}
/** kesma a→b yoʻnalishida, a dan L uzunlikdagi kesma (kerakli masofa) */
function needSeg(a: XY, b: XY, L: number): [XY, XY] {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [a, [a[0] + dx / l * L, a[1] + dy / l * L]];
}
/** sigʻim funksiyasi boʻyicha n oʻringa yetadigan eng kichik maydon, m² (41-jadval / 543-band pogʻonalari bilan) */
export function areaForCap(cap: (a: number) => number, n: number): number {
  let lo = 0, hi = 1000; while (cap(hi) < n && hi < 1e7) hi *= 2;
  while (hi - lo > 1) { const m = Math.floor((lo + hi) / 2); if (cap(m) >= n) hi = m; else lo = m; }
  return hi;
}

/**
 * 10-band (egasi, 22:49): oʻrin yetmasa — sahnada mos uchastka maydoni. Eng katta parsel kerakli maydon bilan yozuvlanadi
 * (halqa — mavjud parsel); parsel yoʻq boʻlsa — uchastka markazida kerakli maydondagi kvadrat (oʻlcham moʻljali).
 */
function socialNeed(doc: Project, use: 'maktab' | 'mtm', deficit: number): Where | undefined {
  if (deficit <= 0) return undefined;
  const cap = use === 'maktab' ? schoolCapacity : mtmCapacity, plan = computePlan(doc);
  const ps = plan.blocks.filter(b => b.use === use).sort((a, b) => b.area - a.area);
  if (ps.length) {
    const p = ps[0], need = areaForCap(cap, cap(p.area) + deficit);
    return { need: { rings: [p.rings[0]], labels: [{ at: p.centroid, text: `${n0(p.area)} → ≥ ${n0(need)} m²` }] } };
  }
  if (!doc.site) return undefined;
  const fr = frame(doc.origin), all = doc.site.rings[0].map(fr.toLocal), c: XY = [all.reduce((t, q) => t + q[0], 0) / all.length, all.reduce((t, q) => t + q[1], 0) / all.length];
  const need = areaForCap(cap, deficit), h = Math.sqrt(need) / 2;
  return { need: { rings: [[[c[0] - h, c[1] - h], [c[0] + h, c[1] - h], [c[0] + h, c[1] + h], [c[0] - h, c[1] + h]]], labels: [{ at: c, text: `≥ ${n0(need)} m²` }] } };
}

/**
 * 39-jadval (10-band, egasi): qizil chiziqqa yaqin maktab/MTM — haqiqiy masofa (qizil), qizil chiziqdan 25 m (yashil kesma)
 * va parsel ichida binoga mos joy: parsel − (koʻcha koridori + 25 m) (yashil halqa).
 */
function redLineNeed(doc: Project, bad: { bid: string; d: number }[]): Where {
  const fr = frame(doc.origin), plan = computePlan(doc), segs: [XY, XY][] = [], nsegs: [XY, XY][] = [], labels: { at: XY; text: string }[] = [], rings: XY[][] = [];
  const cuts = doc.streets.map(st => corridor(st.axis.map(fr.toLocal), profileWidth(profileById(st.profile)) / 2 + 25)).filter(m => m.length);
  const seen = new Set<number>();
  for (const x of bad) {
    const b = doc.buildings.find(q => q.id === x.bid); if (!b) continue;
    const r = b.footprint.map(fr.toLocal); let best: [XY, XY] | null = null, bd = Infinity;
    for (const poly of plan.corridors) for (const ring of poly) { const s = closestSeg(r, ring), l = Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]); if (l < bd) { bd = l; best = s; } }
    if (best) { segs.push(best); const n = needSeg(best[1], best[0], 25); nsegs.push(n); labels.push({ at: n[1], text: `${nm(x.d)} → ≥ 25 m` }); }
    const c: XY = [r.reduce((t, q) => t + q[0], 0) / r.length, r.reduce((t, q) => t + q[1], 0) / r.length];
    const bi = plan.blocks.findIndex(k => (k.use === 'maktab' || k.use === 'mtm') && inRing(c, k.rings[0]));
    if (bi >= 0 && !seen.has(bi) && cuts.length) {
      seen.add(bi);
      try { const z = polygonClipping.difference(plan.blocks[bi].rings.map(q => [...q, q[0]].map(p => [p[0], p[1]] as [number, number])) as Polygon, ...cuts); for (const poly of z) rings.push(poly[0].slice(0, -1).map(p => [p[0], p[1]] as XY)); } catch { /* geometriya xatosi — halqasiz */ }
    }
  }
  return { bids: bad.map(x => x.bid), segs, need: { rings, segs: nsegs, labels } };
}
const inRing = (p: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };

/** Xonadonlar soni manbasi (izoh boʻlagi; alohida kalit — tarjima uchun) */
function aptSrc(d: Derived, doc: Project): string {
  if (d.aptSource === 'sxema') { const mix = doc.settings.aptMix.join('/'); return `Kvartiralar soni — seksiyalarning kvartira sxemasidan (miks ${mix} %; yakka uy va taunhaus — 1 xonadon).`; }
  const net = doc.settings.aptNet; return `Kvartiralar soni oʻrtacha ${net} m² (netto) boʻyicha taxmin (sxema yoʻq).`;
}
const badList = (bad: { use: string; d: number }[]) => bad.map(x => `${x.use === 'mtm' ? 'MTM' : 'maktab'} ${Math.round(x.d * 10) / 10} m`).join(', ') || '—';
/** stat.uz boʻyicha haqiqiy yosh tarkibidan ehtiyoj (izoh uchun) */
function demoNote(doc: Project, pop: number, kind: 'school' | 'mtm'): string {
  const r = demoRow(doc.settings.district); if (!r) return '';
  if (kind === 'school') { const k = perThousand(r).school; return ` Haqiqiy yosh tarkibi (stat.uz, ${r.name}, ${DEMO.year}): 7–17 yoshlilar 1000 kishiga ${Math.round(k)} → loyiha aholisi uchun ≈ ${Math.round(pop * k / 1000)} oʻquvchi (100 % qamrov).`; }
  const k = mtmNeedPerThousand(r);
  return ` Haqiqiy yosh tarkibi (stat.uz, ${r.name}, ${DEMO.year}) va 542-band qamrovi (1–5 yosh — 85 %, 5 yoshdan katta — 100 %): 1000 kishiga ${Math.round(k)} oʻrin → loyiha aholisi uchun ≈ ${Math.round(pop * k / 1000)} oʻrin.`;
}

export type Status = 'pass' | 'fail' | 'review' | 'na';

export interface Source { doc: string; clause: string; edition: string; verified: boolean }

/** «Tuzat» tugmalari (31.10): har biri bitta bekor qilinadigan amal (Ctrl+Z) */
export type FixId = 'parking' | 'mtm' | 'seismic-joint' | 'podium-joint' | 'floors-down' | 'yards-on' | 'street-clear' | 'dead-end' | 'play-ug' | 'szz-belt' | 'park-30' | 'hovli-floors' | 'seismic-floors' | 'spacing-floors' | 'redline-move';
export interface Result {
  id: string; title: string; status: Status;
  value?: number; limit?: string; unit?: string;
  /** qiymatning kasr xonalari (sukut 0) */
  digits?: number;
  /** chegaradan chetlanish, % (musbat — oshib ketgan) */
  delta?: number;
  note?: string; source: Source;
  /** sahnada koʻrsatish (31.10, egasi): meʼyorga tushmagan joylar — bino id lari, mahalliy nuqtalar, halqalar, masofa kesmalari */
  where?: Where;
  /** 31.10 (egasi): loyihani meʼyorga moslash — tugma (editor.applyFix) va qisqa tavsiya */
  fix?: { id: FixId; label: string; hint: string };
}
/** need (egasi, 22:49, 10-band): meʼyor talab qiladigan holat — mos joy (halqa), kerakli masofa (kesma) va yozuvlar; sahnada yashil */
export interface Need { rings?: XY[][]; segs?: [XY, XY][]; labels?: { at: XY; text: string }[] }
export interface Where { bids?: string[]; pts?: XY[]; rings?: XY[][]; segs?: [XY, XY][]; need?: Need }

export interface Rule {
  id: string; title: string; source: Source;
  evaluate(d: Derived, doc: Project): Omit<Result, 'id' | 'title' | 'source'>;
}

/** 06.11 (c68): joriy (konsolidatsiyalangan) tahrir — 01/2-42 (09.12.2025, № 380), 01/2-3 (21.01.2026, № 383), 01/2-14 (06.04.2026, № 397),
 *  01/2-15 (06.04.2026, № 396), 01/2-24 (17.06.2026, № 407) buyruqlari bilan (normalar/ShNQ-2.07.01-23-joriy-tahrir.txt) */
const SHNQ_2_07_01: Omit<Source, 'clause'> = { doc: 'ShNQ 2.07.01-23', edition: '2023 (joriy tahrir: 01/2-42, 01/2-3, 01/2-14, 01/2-15, 01/2-24)', verified: true };
export { GREEN_86, GREEN_474 };
/** 06.11 — Qurilish vazirining 09.12.2025 dagi 01/2-42-son buyrugʻi (AV 17.12.2025, № 380): ShNQ 2.07.01-23 ga 53 band oʻzgartirish */
const PARK_4242 = '01/2-42 buyrugʻi (09.12.2025): Toshkent shahri va viloyatida 10 kvartiraga 7 joy (avval kvartiraga 1); 29-jadval izohining 1-bandi (500 m gacha uzoqlikdagi avtoturargoh) kuchini yoʻqotgan.';
const FIRE_6511 = '6511-band (01/2-42): Ф1–Ф4, I–II darajali binolarda qarama-qarshi devor (yoki maxsus mustaqil devor) I-turdagi yongʻinga qarshi va oyna-eshiksiz boʻlsa — masofa normalanmaydi; modelda bunday devor belgilanmagan.';
/** 06.11 (c61): 0103-25-son SanQvaN (SEO qoʻmitasi 15.08.2025 dagi 24-son qarori, AV 29.09.2025, № 373) — SanPiN 0350-17 oʻrniga (2-ilova, 3-band) */
const SANQ: Omit<Source, 'clause'> = { doc: 'SanQvaN 0103-25', edition: '2025', verified: true };

/** 06.11 (c58): 79-band, 2-jadval — «mos emas» juftlardagi binolar (ustma-ust tushganlar bundan mustasno; spacing-79 bilan bir xil saralash) */
export function spacingBadIds(doc: Project): string[] {
  const { pairs } = spacingIssues(doc);
  const bad = pairs.filter(p => (p.kind === 'uzun' && !p.red) || (p.kind === 'uzun-torets' && !p.red) || (p.kind === 'torets' && !p.red && p.d < p.need - 0.5) || p.kind === 'yakka');
  return [...new Set(bad.flatMap(p => [p.a, p.b]))];
}

export const RULES: Rule[] = [
  {
    id: 'density-84',
    title: 'Aholi zichligi',
    source: { ...SHNQ_2_07_01, clause: '84-band' },
    evaluate(d) {
      if (d.siteHa <= 0 || d.population <= 0) return { status: 'na', unit: 'kishi/ga', limit: '≤ 400', note: 'Uchastka yoki turar joy binolari yoʻq' };
      // 04.11 (audit): 84-band — «кўп қаватли комплекс қурилишда»: faqat tomorqali uylar boʻlsa qoʻllanmaydi
      if (d.housing82 && d.housing82.mix.every(x => x.cls.endsWith(' ga'))) return { status: 'na', unit: 'kishi/ga', limit: '≤ 400', note: 'Faqat tomorqali uylar — 84-band koʻp qavatli kompleks qurilishga tegishli.' };
      const lim = 400, v = d.density;
      return {
        status: v <= lim ? 'pass' : 'fail', value: v, unit: 'kishi/ga', limit: '≤ 400',
        delta: v > lim ? (v / lim - 1) * 100 : undefined,
        ...(v > lim ? { fix: { id: 'floors-down' as const, label: 'Turar qavatlarni kamaytirish', hint: `Zichlik ${Math.round(v)} → ≤ ${lim} kishi/ga: barcha turar joy binolarining turar qavatlari ≈ ${Math.round((1 - lim / v) * 100)} % ga kamaytiriladi (noturar qavatlar va stilobat oʻzgarmaydi, kamida 1 turar qavat). Muqobil — uchastkaga yashil yoki jamoat kvartali qoʻshish.` } } : {}),
        note: 'Koʻp qavatli kompleks qurilishda mavzening hisobiy aholi zichligi (84-band): loyiha uchastkasi mavze deb olindi (koʻchalar bilan). Aholi — 1-jadval taʼminoti boʻyicha.',
      };
    },
  },
  {
    id: 'umn-66',
    title: 'UMN — turar joy uchastkasi',
    source: { ...SHNQ_2_07_01, clause: '66-band' },
    evaluate(d) {
      if (!d.umnBlocks.length) return { status: 'na', limit: '≤ 4,5', note: 'Turar joy binosi turgan uchastka yoʻq' };
      const lim = 4.5, over = d.umnBlocks.filter(x => x.umn > lim), worst = d.umnBlocks.reduce((a, b) => b.umn > a.umn ? b : a);
      return {
        status: over.length ? 'fail' : 'pass', value: worst.umn, digits: 2, limit: '≤ 4,5',
        delta: over.length ? (worst.umn / lim - 1) * 100 : undefined,
        ...(over.length ? { where: { bids: over.flatMap(x => x.bids) } } : {}),
        note: 'Har turar joy uchastkasi (kvartal yoki parsel) alohida: binolarning yer usti qavatlari maydoni / uchastka maydoni; eng kattasi koʻrsatiladi. Maydon tashqi oʻlcham boʻyicha olinadi — meʼyordagi ichki oʻlchamdan biroz katta (xavfsiz tomonga). Turar joy va noturar binolar bitta uchastkada boʻlsa — hammasi olinadi (TALQIN).',
      };
    },
  },
  {
    id: 'pop-61',
    title: 'Uy-joy bilan taʼminlanish, m²/kishi',
    source: { ...SHNQ_2_07_01, clause: '61-band, 1-jadval' },
    evaluate(d, doc) {
      if (d.population <= 0) return { status: 'na', unit: 'm²/kishi', limit: '≥ 16' };
      const v = doc.settings.m2PerPerson;
      return { status: v >= 16 ? 'pass' : 'fail', value: v, unit: 'm²/kishi', limit: '≥ 16',
        note: 'Aholi = kvartiralar umumiy maydoni ÷ taʼminot. 1-jadval: biznes 40, ekonom 30, munitsipal 20 m²/kishi; ulushlar boʻyicha oʻrtacha ≈ 28 (68-band). Taʼminot meʼyorlar roʻyxati tepasida tanlanadi.' };
    },
  },
  {
    id: 'housing-82',
    title: 'Uy-joy fondi zichligi',
    source: { ...SHNQ_2_07_01, clause: '82-band, 3-jadval' },
    evaluate(d) {
      const h = d.housing82;
      if (d.siteHa <= 0 || d.resNet <= 0 || !h) return { status: 'na', unit: 'm²/ga', limit: '2 200–7 500' };
      // 04.11 (audit): chegara qavatlilik sinfi boʻyicha (3-jadval), aralash qurilishda — 4-izoh formulasi; hisob hududi — 3-izoh
      const lo = Math.round(h.lo), hi = Math.round(h.hi), v = h.v, lim = lo === hi ? `${n0(hi)}` : `${n0(lo)}–${n0(hi)}`;
      const mix = h.mix.map(x => `${x.cls} ${Math.round(x.share * 100)} %`).join(', ');
      return {
        status: v > hi + 0.5 ? 'fail' : v < lo - 0.5 ? 'review' : 'pass', value: v, unit: 'm²/ga', limit: lim,
        delta: v > hi ? (v / hi - 1) * 100 : undefined,
        ...(v > hi + 0.5 ? { fix: { id: 'floors-down' as const, label: 'Turar qavatlarni kamaytirish', hint: `Uy-joy fondi ${Math.round(v)} → ≤ ${hi} m²/ga: turar qavatlar ≈ ${Math.round((1 - hi / v) * 100)} % ga kamaytiriladi (zichlik meʼyori bilan birga — qaysi biri qattiqroq boʻlsa).` } } : {}),
        note: `Qavatlilik boʻyicha (kam 1–3, oʻrta 4–9, koʻp 10–16, yuqori va baland ≥ 17; tomorqali — uchastka oʻlchami): ${mix}. Chegara — 4-izoh formulasi 100 / Σ(aᵢ/nᵢ). Hisob hududi ${h.baseHa.toFixed(2).replace('.', ',')} ga: tuman/shahar ahamiyatidagi obyektlar (ofis, mehmonxona, poliklinika, maʼmuriy, ishlab chiqarish) ayirilgan (3-izoh; TALQIN).`,
      };
    },
  },
  {
    id: 'street-profiles',
    title: 'Koʻcha profillari (kenglik, tasmalar, piyoda yoʻlagi)',
    source: { ...SHNQ_2_07_01, clause: '310-band, 20-jadval va 1-izoh; 338, 404-bandlar' },
    evaluate(_d, doc) {
      if (!doc.streets.length) return { status: 'na', note: 'Loyiha koʻchalari yoʻq' };
      const bad: string[] = [];
      doc.streets.forEach((s, i) => { const p = profileById(s.profile); checkProfile(p).forEach(x => bad.push(`${i + 1}. ${p.name} (${CATS[p.cat].name}): ${x.what} ${x.value}, meʼyor ${x.norm}`)); });
      return { status: bad.length ? 'fail' : 'pass', value: doc.streets.length - new Set(bad.map(b => b.split('.')[0])).size, unit: `/ ${doc.streets.length} mos`, note: bad.length ? bad.join('; ') : 'Barcha koʻchalar oʻz toifasi meʼyoriga mos.' };
    },
  },
  {
    id: 'school',
    title: 'Maktab oʻrinlari',
    source: { ...SHNQ_2_07_01, clause: '5-ilova (165–280 oʻrin / 1000 kishi); 549-band, 41-jadval (uchastka)' },
    evaluate(d, doc) {
      if (d.population <= 0) return { status: 'na', unit: 'oʻrin', note: 'Aholi yoʻq' };
      const lo = Math.ceil(d.population * 0.165), hi = Math.ceil(d.population * 0.28);
      const sw = d.schoolCap < lo ? socialNeed(doc, 'maktab', lo - d.schoolCap) : undefined;
      return { status: d.schoolCap >= lo ? 'pass' : 'fail', value: d.schoolCap, unit: 'oʻrin', limit: `≥ ${lo}`, ...(sw ? { where: sw } : {}), delta: d.schoolCap < lo ? (1 - d.schoolCap / lo) * -100 : undefined,
        note: `Talab ${lo}–${hi} oʻrin (1-navbat 165–280 / 1000). Sigʻim «Maktab» parsellari maydonidan 41-jadval boʻyicha (20/15/10 m² oʻquvchiga). Yaqin atrofdagi mavjud maktablar hisobga olinmagan.${tierNote(d, 'maktab')}${demoNote(doc, d.population, 'school')}` };
    },
  },
  {
    id: 'mtm',
    title: 'MTM (bogʻcha) oʻrinlari',
    source: { ...SHNQ_2_07_01, clause: '5-ilova (70–125 oʻrin / 1000 kishi); 543-band (uchastka)' },
    evaluate(d, doc) {
      if (d.population <= 0) return { status: 'na', unit: 'oʻrin', note: 'Aholi yoʻq' };
      const lo = Math.ceil(d.population * 0.07), hi = Math.ceil(d.population * 0.125);
      const mw = d.mtmCap < lo ? socialNeed(doc, 'mtm', lo - d.mtmCap) : undefined;
      return { status: d.mtmCap >= lo ? 'pass' : 'fail', value: d.mtmCap, ...(mw ? { where: mw } : {}), ...(d.mtmCap < lo ? { fix: { id: 'mtm' as const, label: '1-qavatlarga MTM joylash', hint: `Yetishmaydi ${lo - d.mtmCap} oʻrin. Turar joy binolarining 1-qavatiga MTM (543-band, uchastka 29 m²/oʻrin hovlidan) — kattaroq binolardan boshlab, kerakli oʻringa yetguncha; 1-qavati turar boʻlsa noturarga oʻtkaziladi. Alternativa — «MTM» parseli (≥ 3 535 m² — 35 m²/oʻrin).` } } : {}), unit: 'oʻrin', limit: `≥ ${lo}`, delta: d.mtmCap < lo ? (1 - d.mtmCap / lo) * -100 : undefined,
        note: `Talab ${lo}–${hi} oʻrin. Sigʻim «MTM» parsellaridan: uchastka (543-band: 40 m² — 100 oʻringacha, 35 m² — undan ortiq) va bino (33 m²/oʻrin, 5-ilova) sigʻimining kichigi; binosiz parsel hisobga olinmaydi.${mtmEmpty(d)}${d.mtmBuiltIn ? ` Shundan ${d.mtmBuiltIn} oʻrin — turar joy binolarining 1-qavatida (543-band: uchastka 29 m²/oʻrin, hovlidan ajratiladi, sigʻmagani sanalmaydi; bino maydoni 33 m²/oʻrin — 5-ilova).` : ' Turar joy binosining 1-qavatiga oʻrnatish mumkin (543-band, 29 m²/oʻrin) — bino inspektorida «1-qavatda MTM».'}${tierNote(d, 'mtm')}${demoNote(doc, d.population, 'mtm')}` };
    },
  },
  {
    // 06.11 (c62, egasi: «qoida qanday — bino qancha qismni egallaydi, qavatliligi qanday»): MTM uchastkasi va binosi
    id: 'mtm-plot',
    title: 'MTM uchastkasi va binosi',
    source: { ...SHNQ_2_07_01, clause: '543-band; 5-ilova (33 m²/oʻrin); QMQ 2.01.03-19, 3.1-jadval 2-izoh; maydonchalar — ANDOZA' },
    evaluate(d, doc) {
      if (!d.mtmPlots.length) return { status: 'na', unit: 'oʻrin', note: '«MTM» parseli yoʻq.' };
      const plan = computePlan(doc), yards = landscape(doc), lim = socialFloorLimit('mtm', doc.settings.seismic);
      const mb = plan.blocks.map((b, bi) => ({ b, bi })).filter(x => x.b.use === 'mtm');
      const parts: string[] = []; let bad = false, rev = false;
      d.mtmPlots.forEach((p, k) => {
        const n = k + 1;
        if (!p.bld) { rev = true; parts.push(tfU('MTM ${n}: bino yoʻq — sigʻim hisobga olinmadi (uchastka boʻyicha ≈ ${c} oʻrin)', { n, c: p.plot })); return; }
        const req = p.cap <= 100 ? 40 : 35, per = p.cap ? p.area / p.cap : 0;
        if (p.cap && per < req - 0.05) bad = true;
        parts.push(tfU('MTM ${n}: ${c} oʻrin, uchastka ${a} m² — ${r} m²/oʻrin (543-band: ≥ ${q})', { n, c: p.cap, a: n0(p.area), r: nm(per), q: req }));
        if (lim != null && p.floors > lim) bad = true;
        parts.push(tfU('${f} qavat (QMQ 2.01.03-19, 3.1-jadval 2-izoh: ≤ ${l})', { f: p.floors, l: lim ?? '—' }));
        const y = yards.find(q => q.social === 'mtm' && q.block === mb[k]?.bi), g = mtmGroups(p.cap), pl = y ? y.play.filter(q => q.kind === 'bolalar').length : 0, gr = y ? y.areas.green / Math.max(1, p.area) : 0;
        if (pl < g) rev = true; if (gr < MTM.green - 0.005) rev = true;
        parts.push(tfU('guruh maydonchalari ${a} / ${b} (ANDOZA: ${m} m², soyabon bilan)', { a: pl, b: g, m: MTM.play }));
        parts.push(tfU('koʻkalamzorlik ${v} % (ANDOZA: ≥ ${m} %)', { v: Math.round(gr * 100), m: Math.round(MTM.green * 100) }));
      });
      const val = d.mtmPlots.reduce((t, p) => t + p.cap, 0);
      return { status: bad ? 'fail' : rev ? 'review' : 'pass', value: val, unit: 'oʻrin', note: parts.join('; ') + '\n' + 'Guruh — 20 bola, maydonchalar, sport va xoʻjalik zonasi, koʻkalamzorlik — ANDOZA: 544-band (01/2-42 tahririda) ShNQ 2.08.02-23 ga yuboradi, unda MTM guruh maydonchalari va hududi boʻyicha talab yoʻq.' };
    },
  },
  {
    id: 'parking',
    title: 'Avtoturargoh joylari',
    source: { ...SHNQ_2_07_01, clause: '416-band, 29-jadval (01/2-42 tahririda); 413-band (ochiq — 25 m²/joy)' },
    evaluate(d, doc) {
      if (d.parkingReq <= 0) return { status: 'na', unit: 'joy', note: 'Talab yoʻq (binolar yoʻq)' };
      const parts = Object.entries(d.parkingParts).filter(([, v]) => v > 0).map(([k, v]) => `${k} ${v}`).join(', ');
      const lack = d.parkingReq - d.parkingProv, reg = isTashkent(doc.settings.district) ? 'Toshkent shahri va viloyati: 10 kvartiraga 7' : 'boshqa viloyatlar: 2 kvartiraga 1';
      return { status: d.parkingProv >= d.parkingReq ? 'pass' : 'fail', value: d.parkingProv, unit: 'joy', limit: `≥ ${d.parkingReq}`,
        ...(lack > 0 ? { fix: { id: 'parking' as const, label: 'Yer osti avtoturargoh qoʻshish', hint: `Yetishmaydi ${lack} joy (≈ ${Math.round(lack * 30 / 1000) / 10} ming m² — 30 m²/joy). Turar joy kvartallari hovlisi ostiga yer osti avtoturargoh qoʻshiladi, sathlar soni meʼyor boʻyicha (1–4) — kvartallar qayta generatsiya qilinadi. Boshqa yoʻllar: stilobat ichida yoki alohida koʻp qavatli avtoturargoh (parsel «Avtoturargoh»).` } } : {}),
        // tarjima kaliti: ichma-ich shablonsiz (i18n ${…} namunasi bilan mos kelsin)
        note: `Talab: ${parts} (${reg}). Taʼminot: «Avtoturargoh» parsellari (ochiq, 25 m²/joy, 413-band) + generator parkovkalari (yer osti/stilobat — 30 m²/joy brutto, taxmin). ${aptSrc(d, doc)}` + (mlSum(doc) ? `\nKoʻp qavatli avtoturargohlar: ${mlSum(doc)} joy — qavat rejalaridan (pandus, yoʻlak va zina-lift tugunlari chiqarilgan).` : '')
          + '\n' + PARK_4242 };
    },
  },
  {
    id: 'park-413',
    title: 'Koʻp qavatli avtoturargoh: yer uchastkasi bir joyga',
    source: { ...SHNQ_2_07_01, clause: '413-band' },
    evaluate(_d, doc) {
      const ml = mlOf(doc); if (!ml.length) return { status: 'na', note: 'Koʻp qavatli avtoturargoh yoʻq («Avtoturargoh» parseli → «Koʻp qavatli»).' };
      const plan = computePlan(doc), fr = frame(doc.origin);
      const rows = ml.map(g => { const r = g.ring.map(fr.toLocal), c = cOf(r), k = plan.blocks.find(b => inR(c, b.rings[0])), A = k?.area ?? areaOf(r), per = g.spaces ? A / g.spaces : Infinity; return { g, A, per, need: need413(g.levels) }; });
      const bad = rows.filter(x => x.per < x.need - 0.05), w = rows.reduce((a, x) => (x.per / x.need < a.per / a.need ? x : a));
      return { status: bad.length ? 'fail' : 'pass', value: Math.round(w.per * 10) / 10, unit: 'm²/joy', limit: `≥ ${w.need}`,
        note: `Bir mashina-joyga yer uchastkasi kamida: 2 qavatli — 20, 3 — 14, 4 — 12, 5 — 10, ochiq — 25 m² (413-band). Eng zichi: ${Math.round(w.A)} m² ÷ ${w.g.spaces} joy = ${Math.round(w.per * 10) / 10} m² (${w.g.levels} qavat, talab ${w.need}).` + (bad.length ? `\nMos emas: ${bad.length} ta — qavatni kamaytiring yoki uchastkani kengaytiring.` : '') };
    },
  },
  {
    id: 'park-30',
    title: 'Avtoturargohdan binolargacha masofa (30-jadval)',
    source: { doc: 'ShNQ 2.07.01-23; SanQvaN 0103-25', edition: '2023; 2025', clause: '418-band, 30-jadval; 17-band, 3-ilova', verified: true },
    evaluate(_d, doc) {
      // 06.11 (c61): ikki norma — ShNQ 30-jadval va 0103-25, 3-ilova (ochiq avtoturargoh SMZ). 06.11 (c63, egasi): 3-ilovada derazali/derazasiz
      // qatorlar almashgan koʻrinadi — derazali tomon: kattasi (NORMA); derazasiz torets (gen.blind): ShNQ (NORMA), faqat 3-ilova — koʻrib chiqish (TALQIN)
      // 06.11 (B6): 30-jadval — «ерусти, ерусти-ерости ҳамда очиқ автотураргоҳлар»: koʻp qavatli va ochiq (yer usti) avtoturargohlar
      const ml = doc.garages.filter(g => (g.kind === 'kop_qavatli' || g.kind === 'yer_usti') && !g.truck && g.spaces > 0); if (!ml.length) return { status: 'na', note: 'Yer usti yoki koʻp qavatli avtoturargoh yoʻq.' };
      const fr = frame(doc.origin), plan = computePlan(doc), fails: string[] = [], revs: string[] = []; const bids = new Set<string>();
      const PUB = new Set(['poliklinika', 'ijtimoiy', 'mamuriy', 'savdo', 'ofis', 'mehmonxona', 'aralash']);
      for (const g of ml) {
        const r = g.ring.map(fr.toLocal), col = capCol(g.spaces), cn = CAP_COL_NAME[col];
        // 06.11: ochiq avtoturargoh konturi butun hovli boʻlishi mumkin — masofa mashina-joylardan (stalls) oʻlchanadi
        const stl = g.kind === 'yer_usti' && g.stalls?.length ? g.stalls.map(q => q.map(fr.toLocal)) : null;
        const dist = (o: XY[]) => stl ? stl.reduce((m, q) => Math.min(m, ringDist(q, o)), Infinity) : ringDist(r, o);
        for (const b of doc.buildings) {
          if ((g.kind === 'kop_qavatli' && b.gen?.grp === g.grp) || b.use === 'avtoturargoh') continue;
          const u = useDef(b.use), d = dist(b.footprint.map(fr.toLocal)); if (d > 60) continue;
          if (u.res > 0) {
            // 06.11 (c63): derazali tomon — WIN30 (NORMA); derazasiz torets (gen.blind) — ShNQ 30-jadval (NORMA), faqat 3-ilova 2-qatori — koʻrib chiqish (TALQIN)
            const fp = b.footprint.map(fr.toLocal), bl = new Set((b.gen?.blind ?? []).filter(i => i >= 0 && i < fp.length));
            const ed = (i: number) => dist([fp[i], fp[(i + 1) % fp.length]]), idx = fp.map((_, i) => i);
            const dW = bl.size ? Math.min(...idx.filter(i => !bl.has(i)).map(ed)) : d, dB = bl.size ? Math.min(...[...bl].map(ed)) : Infinity;
            const nW = WIN30[col], nB = T30.blind[col]!, nQ = Q3.blind[col]!;
            if (dW < nW - 0.3) { fails.push(`turar joyning derazali tomoni ${Math.round(dW)} m < ${nW} m`); bids.add(b.id); }
            else if (dB < nB - 0.3) { fails.push(`turar joyning derazasiz toretsi ${Math.round(dB)} m < ${nB} m`); bids.add(b.id); }
            else if (dB < nQ - 0.3) revs.push(`turar joyning derazasiz toretsi ${Math.round(dB)} m: ShNQ 30-jadval ${nB} m bajarildi, 0103-25, 3-ilova 2-qatori ${nQ} m — 3-ilovada derazali/derazasiz qatorlar ShNQ 30-jadvalga nisbatan almashgan boʻlishi mumkin (TALQIN)`);
          } else if (b.use === 'maktab' || b.use === 'mtm' || b.use === 'sport') {
            const n = SOC30[col] ?? SOC30[3]!; if (d < n - 0.3) { fails.push(`taʼlim yoki sport binosi ${Math.round(d)} m < ${n} m`); bids.add(b.id); }
          } else if (PUB.has(b.use)) { const n = T30.pub[col]!; if (d < n - 0.3) { fails.push(`jamoat binosi ${Math.round(d)} m < ${n} m`); bids.add(b.id); } }
        }
        // maktab, MTM va sport hududlarigacha (territoriya chegarasi); park — «aholi dam olish joylari» (3-ilova, 3-qator; TALQIN — koʻrib chiqish)
        for (const k of plan.blocks) {
          if (k.use !== 'maktab' && k.use !== 'mtm' && k.use !== 'sport' && k.use !== 'yashil') continue;
          const d = dist(k.rings[0]); if (d > 80) continue; const n = SOC30[col];
          if (n == null) revs.push(`maktab, MTM yoki sport hududi ${Math.round(d)} m — sigʻim ${cn}: jadvalda qiymat yoʻq («–»), sanitariya nazorati bilan kelishiladi`);
          else if (d < n - 0.3) (k.use === 'yashil' ? revs : fails).push(k.use === 'yashil' ? `park ${Math.round(d)} m < ${n} m (aholi dam olish joyi — TALQIN)` : `maktab, MTM yoki sport hududi ${Math.round(d)} m < ${n} m`);
        }
      }
      const cap = ml.map(g => `${g.spaces} joy → ${CAP_COL_NAME[capCol(g.spaces)]}`).join(', ');
      const openG = ml.filter(g => g.kind === 'yer_usti' && (g.stalls?.length ?? 0) > 0);
      return { status: fails.length ? 'fail' : revs.length ? 'review' : 'pass', value: fails.length, unit: 'ta', limit: '0',
        ...(bids.size ? { where: { bids: [...bids] } } : {}),
        ...((fails.length || revs.length) && openG.length ? { fix: { id: 'park-30' as const, label: 'Yaqin joylarni olib tashlash', hint: 'Ochiq avtoturargohning 30-jadval masofasini buzayotgan joylari olib tashlanadi; joylar kamaysa sigʻim ustuni kichrayadi va masofa ham qisqaradi. Yetishmagan joylar — 29-jadval qoidasida (yer osti yoki koʻp qavatli avtoturargoh).' } } : {}),
        note: `Yer usti avtoturargohdan masofa (sigʻim ≤ 10, 11–50, 51–100, 101–300, > 300). ShNQ 30-jadval: turar joy old tomoni 12/15/25/35/50 m, derazasiz yon tomoni 12/10/15/25/35 m, jamoat binolari 10/10/15/25/25 m, maktab va taʼlim 15/25/25/50/– m. SanQvaN 0103-25, 3-ilova: turar joyning derazali tomoni 10/12/15/25/35 m, derazasiz tomoni 10/15/25/35/50 m; MTM, taʼlim, dam olish joylari va sport inshootlari 15/25/25/50/– m. Qoʻllangani: turar joyning derazali tomoni — ikkalasining kattasi 12/15/25/35/50 m (NORMA); derazasiz torets (generator belgilagan) — ShNQ 12/10/15/25/35 m (NORMA), 3-ilova 2-qatori faqat buzilsa — «koʻrib chiqish»: 3-ilovada derazali/derazasiz qatorlar ShNQ 30-jadvalga nisbatan almashgan boʻlishi mumkin (TALQIN); torets belgilanmagan bino — derazali deb olinadi. Taʼlim va sport — kattasi 15/25/25/50/– m, jamoat binolari 10/10/15/25/25 m. Sigʻim: ${cap}.` + (fails.length ? `\nMos emas: ${fails.slice(0, 4).join('; ')}.` : '') + (revs.length ? `\nKoʻrib chiqish: ${revs.slice(0, 4).join('; ')}.` : '') + '\nStatsionar davolash muassasalarigacha (25/50/–/–/– m) — loyihada bunday funksiya yoʻq, tekshirilmadi.' };
    },
  },
  {
    id: 'park-411',
    title: 'Nogironlar va elektromobil joylari',
    source: { ...SHNQ_2_07_01, clause: '411–412-bandlar' },
    evaluate(_d, doc) {
      // 06.11 (B6): 411-band barcha avtoturargohlarga (yer osti, stilobat, yer usti, koʻp qavatli; yuk hovlisidan tashqari)
      const all = doc.garages.filter(g => !g.truck && g.spaces > 0); if (!all.length) return { status: 'na', note: 'Avtoturargoh yoʻq.' };
      const n = all.reduce((t, g) => t + g.spaces, 0), inv = pct5(n), ev412 = doc.buildings.some(b => b.use === 'savdo' || b.use === 'mehmonxona');
      return { status: 'pass', value: inv, unit: 'joy', limit: `≥ ${inv}`,
        note: `411-band: nogironligi boʻlgan shaxslar uchun joylarning kamida 5 % (kamida 1): ${n} dan ${inv} joy (${all.length} ta avtoturargoh). Joylashuvi — kirishga yaqin (AMALIYOT).` + (ev412 ? `\n412-band: loyihada savdo / mehmonxona bor — ularning loyihasiga elektromobil quvvatlash stansiyalari kiritilishi lozim. Normada joylar ulushi berilmagan: ${pct5(n)} joy (5 %) — ANDOZA.` : '\n412-band: elektromobil quvvatlash joylari savdo va biznes markazlari, mehmonxona va boshqa sanab oʻtilgan obyektlar avtoturargohlari uchun talab qilinadi — loyihada bunday obyekt yoʻq (TALQIN).') };
    },
  },
  {
    // 06.11 (B6): 88-band — velosiped va boshqa mobil vositalar saqlash maydonchasi; oʻlchami 4-jadvalda berilmagan
    id: 'velo-88',
    title: 'Velosiped va mobil vositalar maydonchasi',
    source: { ...SHNQ_2_07_01, clause: '88-band, 4-jadval' },
    evaluate(d) {
      if (d.population <= 0) return { status: 'na', note: 'Turar joy yoʻq.' };
      return { status: 'na', note: '88-band: turar joy mavzesida velosiped va boshqa mobil vositalarni (samokat, nogironlar va bolalar aravachalari) saqlash maydonchasi boʻlishi kerak. 4-jadvalda uning oʻlchami va binolargacha masofasi berilmagan — maydon talabi hisoblanmaydi, hovli rejasida joy qoldiring.' };
    },
  },
  {
    // 06.11 (B6): 257–258-bandlar — TP / taqsimlash punkti; modelda TP obyekti yoʻq — talab izohda
    id: 'tp-257',
    title: 'Transformator podstansiyasi (TP) va taqsimlash punkti',
    source: { ...SHNQ_2_07_01, clause: '257–258-bandlar' },
    evaluate(_d, doc) {
      if (!doc.buildings.length) return { status: 'na', note: 'Binolar yoʻq.' };
      return { status: 'na', note: '257-band: alohida turgan taqsimlash punktlari va 6–20 kV kuchlanishli, koʻpi bilan ikki transformatorli (har biri 1000 gacha — matnda «1000 kV қуввати», kVA nazarda tutilgan — TALQIN) podstansiyalar turar joy va jamoat binolaridan kamida 10 m, davolash-profilaktika muassasalari binolaridan kamida 25 m. 258-band: maktab va MTM hududida TP va taqsimlash punkti joylashtirilmaydi. TP loyihada obyekt sifatida yoʻq — joyi va soni muhandislik (elektr taʼminoti) loyihasida belgilanadi; masofalar tekshirilmadi.' };
    },
  },
  {
    id: 'park-414',
    title: 'Avtoturargoh kirish-chiqishi va pandus',
    source: { ...SHNQ_2_07_01, clause: '414-band; pandus — ANDOZA (SP 113.13330.2016)', verified: false },
    evaluate(_d, doc) {
      const gs = doc.garages.filter(hasEntryRules); if (!gs.length) return { status: 'na', note: 'Yer osti, stilobat yoki koʻp qavatli avtoturargoh yoʻq.' };
      const ramp = `Pandus (ANDOZA — Oʻzbekiston normasi papkada yoʻq, SP 113.13330.2016 (RF) — taqqoslash uchun): qavat ${String(ML.floorH).replace('.', ',')} m, qiyalik ≤ 18 % (egri pandus ≤ 13 %), bir yoʻnalishli yoʻlak ≥ 3,5 m, uchlarida 3,6 m oʻtish uchastkalari — gorizontal uzunlik ${String(rampLen()).replace('.', ',')} m.`;
      const E = entryEval(doc, gs, c => c.kind === 'chorraha' || c.kind === 'bekat');
      const n = E.n, mx = E.minX == null ? '—' : nm(E.minX), fails = E.fails;
      if (!n) return { status: 'review', unit: '', note: `414-band: kirish-chiqish joylari magistral koʻchalar chorrahasidan kamida 50 m, mahalliy koʻchalardan 20 m, jamoat transporti bekatidan 5 m. Kirish nuqtasi qoʻyilmagan (${gs.length} ta avtoturargoh) — Hajmlar qadamida «Kirish-chiqish → Avtomatik joylashtir» yoki sahnada belgini sudrang.\n${ramp}` };
      return { status: fails.length ? 'fail' : E.noX ? 'review' : 'pass', value: fails.length, unit: 'ta', limit: '0', ...(E.where ? { where: E.where } : {}),
        note: `414-band: kirish-chiqish magistral koʻchalar chorrahasidan ≥ 50 m, mahalliy koʻchalar chorrahasidan ≥ 20 m (TALQIN: «маҳаллий аҳамиятидаги кўчалардан 20 m» — chorrahadan), bekatdan ≥ 5 m. Kirishlar: ${n} ta; eng yaqin chorraha: ${mx} m.` + (fails.length ? `\nMos emas: ${fails.slice(0, 4).join('; ')}.` : '') + (E.noX ? '\nLoyiha koʻchalari chorrahasi topilmadi — kirish koʻcha tarmogʻi bilan koʻrib chiqilsin.' : '') + (doc.pois.some(q => q.kind === 'bekat' || q.kind === 'metro') ? '' : '\nBekatlar: qoʻlda qoʻshilgan POI yoʻq (OSM bekatlari bu tekshiruvda yoʻq).') + `\n${ramp}` };
    },
  },
  {
    // 05.11 (egasi): yer osti avtoturargoh — chegarasi chekinishga bogʻlanmaydi; kirish-chiqish va shamollatish 15 m
    id: 'ug-park-415',
    title: 'Yer osti avtoturargoh: kirish-chiqish va shamollatish shaxtalari',
    // 06.11 (c61): bekor qilingan 0350-17 ning 6.4.1-jadval 8-izohi 0103-25 da yoʻq — tekshiruv faqat 415-band boʻyicha;
    // ShNQ 2.05.07-24, 10-band: bino ichidagi yer osti avtoturargohi kirish-chiqishidan oʻz binosigacha masofa belgilanmaydi
    source: { doc: 'ShNQ 2.07.01-23; ShNQ 2.05.07-24', edition: '2023; 2024', clause: '415-band; 10-band (oʻz binosi)', verified: true },
    evaluate(_d, doc) {
      const ug = doc.garages.filter(g => isUg(g) && !g.truck); if (!ug.length) return { status: 'na', note: 'Yer osti avtoturargoh yoʻq.' };
      const nug = ug.length, sp = ug.reduce((t, g) => t + g.spaces, 0);
      const head = `Yer osti avtoturargohlar: ${nug} ta, ${sp} joy. 415-band: kirish-chiqish joylari turar joy va jamoat binolari derazalaridan, taʼlim va davolash muassasalari hududlaridan kamida 15 m. ShNQ 2.05.07-24, 10-band: bino ichidagi (binoga joylashgan) yer osti avtoturargohi kirish-chiqishidan oʻz binosigacha masofa belgilanmaydi — oʻz binosi tekshirilmaydi. Oʻz binosi — garaj konturi bilan kesishgan yoki unga tutash (≤ 0,5 m) bino yoki stilobat (TALQIN); boshqa binolar — 415-band boʻyicha. Shamollatish shaxtalari — 415-band qiymati (15 m) bilan, TALQIN: amaldagi normada shaxta uchun alohida qiymat yoʻq (bekor qilingan 0350-17, 6.4.1-jadval 8-izohi 0103-25 da yoʻq).`;
      const E = entryEval(doc, ug, c => c.kind === 'deraza' || c.kind === 'hudud' || c.kind === 'maydoncha');
      if (!E.n) return { status: 'review', unit: '', note: `${head} Pandus va shaxtalar qoʻyilmagan — Hajmlar qadamida «Kirish-chiqish → Avtomatik joylashtir».` };
      const sh = ug.reduce((t, g) => t + (g.entries ?? []).filter(e => e.kind === 'shaxta').length, 0), np = E.n - sh, mx = E.minX == null ? '—' : nm(E.minX), fails = E.fails, revs = E.revs;
      return { status: fails.length ? 'fail' : revs.length ? 'review' : 'pass', value: fails.length, unit: 'ta', limit: '0', ...(E.where ? { where: E.where } : {}),
        note: `${head} Pandus ${np} ta, shaxta ${sh} ta (shaxtalar soni — ANDOZA: har 2 000 m² ga 1; hisob loyihada). Eng yaqin bino, hudud yoki maydoncha: ${mx} m. TALQIN: deraza va fasad — turar va jamoat binolarining butun konturi; dam olish maydonchalari — hovlidagi bolalar, kattalar va sport maydonchalari (xoʻjalik emas).` + (fails.length ? `\nMos emas: ${fails.slice(0, 4).join('; ')}.` : '') + (revs.length ? `\nShaxta uchun joiz joy topilmadi — garaj chetiga, koʻcha tomonga qoʻyildi; loyihada aniqlansin: ${revs.slice(0, 4).join('; ')}.` : '') };
    },
  },
  {
    id: 'street-overlap',
    title: 'Bino koʻcha qizil chiziqlari ichida',
    source: { doc: 'Rejalash qoidasi', edition: '—', clause: 'qizil chiziq ichida qurilish yoʻq (koʻcha koridori boʻsh)', verified: false },
    evaluate(d) {
      if (!d.streetOverlap.length) return { status: d.streetArea > 0 ? 'pass' : 'na', value: 0, unit: 'bino', limit: '0', note: d.streetArea > 0 ? 'Hech bir bino loyiha koʻchasi koridoriga tushmaydi.' : 'Loyiha koʻchalari yoʻq.' };
      return { status: 'fail', value: d.streetOverlap.length, unit: 'bino', limit: '0', where: { bids: d.streetOverlap.map(x => x.bid), rings: d.streetOverlap.flatMap(x => x.polys) },
        fix: { id: 'street-clear' as const, label: 'Binolarni koʻchadan chiqarish', hint: `${d.streetOverlap.length} ta bino eng yaqin koʻcha oʻqiga perpendikulyar, qizil chiziqdan tashqariga suriladi: 3+ qavatli turar joy — H × 0,25 (79-band), boshqalari — 0,5 m (bino panelidagi «Koʻchadan chiqarish» bilan bir xil).` },
        note: `${d.streetOverlap.length} ta bino koʻcha koridoriga tushadi (jami ${Math.round(d.streetOverlap.reduce((t, x) => t + x.area, 0))} m²). Koʻcha siljitilganda qoʻlda chizilgan yoki qoldirilgan binolar — «Koʻchadan chiqarish» tugmasi bino panelida; yoki koʻchani qaytaring.` };
    },
  },
  {
    id: 'red-line-39',
    title: 'Maktab va MTM binosidan qizil chiziqqacha',
    source: { ...SHNQ_2_07_01, clause: '539-band, 39-jadval (shahar: 25 m)' },
    evaluate(d, doc) {
      if (!d.redLineSocial.length) return { status: 'na', unit: 'm', limit: '≥ 25', note: 'Loyiha koʻchalari yonida maktab yoki MTM binosi yoʻq. Mavjud (OSM) koʻchalar qizil chizigʻi hisobga olinmaydi.' };
      const min = Math.min(...d.redLineSocial.map(x => x.d)), bad = d.redLineSocial.filter(x => x.d < 25);
      return { status: bad.length ? 'fail' : 'pass', value: min, unit: 'm', limit: '≥ 25', ...(bad.length ? { where: redLineNeed(doc, bad) } : {}),
        note: `${d.redLineSocial.length} ta bino tekshirildi, ${bad.length} tasi 25 m dan yaqin (${badList(bad)}). Masofa bino devoridan loyiha koʻchasi qizil chizigʻigacha; turar joy binolarigacha — insolyatsiya va yoritish meʼyorlari boʻyicha (39-jadval).` };
    },
  },
  {
    // 04.11 (egasi: «SanQvaN 15/16 — koʻrib toʻgʻrisini ol; mezon — generatsiya qulay shahar qura olsin»): 16-band matni (yashash xonalari
    // 90°–290° ga qaratilmasin) 15-bandga (janubiy, janubi-sharqiy, sharqiy xonalar talab qilinadi) va 3-bandga zid — sharq, janub va gʻarbni
    // birga taqiqlaydi, faqat shimolga qaragan uy qoladi (insolyatsiya 94–95-bandlari bajarilmaydi). Shuning uchun 15-band (200–290°) olinadi.
    id: 'west-facing',
    title: 'Yashash xonalari yoʻnalishi (gʻarb 200–290°)',
    source: { doc: 'SanQvaN 0102-25', edition: '2025', clause: '15-band; 3-band', verified: true },
    evaluate(d) {
      if (!d.resSections) return { status: 'na', note: 'Choʻziq turar joy seksiyalari yoʻq' };
      return { status: d.westFacing ? 'review' : 'pass', value: d.westFacing, unit: `/ ${d.resSections} seksiya`, limit: '0', ...(d.westIds?.length ? { where: { bids: d.westIds } } : {}),
        note: d.westFacing ? 'Bu seksiyalarning bir uzun fasadi gʻarbga qaraydi: xona derazalarini 200 — 290° oraligʻiga yoʻnaltirishga yoʻl qoʻyilmaydi (15-band, istisnosiz). Kvartira rejasida tekshiriladi («Kvartiralar» qadami). Turar joy obyektlari janubiy, janubi-sharqiy, sharqiy va shimoli-sharqiy yoʻnalishda joylashtiriladi (3-band).' : 'Uzun fasadlar gʻarbiy sektorga qaramaydi.' };
    },
  },
  {
    id: 'renov-green-7',
    title: 'Renovatsiya hududida yashil zona (≥ 1/4)',
    source: { doc: 'OʻRQ-1149 «Shaharsozlik renovatsiyasi toʻgʻrisida»', edition: '10.06.2026 (kuchga kirishi 12.12.2026)', clause: '7-modda', verified: true },
    evaluate(d, doc) {
      if (doc.settings.comp.regime !== 'orq1149') return { status: 'na', note: 'Koʻchirish rejimi — OʻRQ-781 (jamoat ehtiyojlari uchun olib qoʻyish). Renovatsiya rejimida tekshiriladi.' };
      if (d.siteHa <= 0) return { status: 'na', unit: '%', limit: '≥ 25' };
      // 04.11 (audit, «norma boʻyicha»): «yashil zonalar» — hududiy zonalashtirish toifasi (7-modda, 95-qator: zonalarni oʻzgartirish); hovli maysasi
      // turar joy zonasining qismi — kirmaydi. Hisob: park/bogʻ va himoya koʻkalamzorligi zonalari ÷ butun qamrab olingan hudud (maktab/MTM ayirilmaydi)
      const g = (d.zoneArea.yashil ?? 0) + (d.zoneArea.himoya ?? 0), v = g / (d.siteHa * 1e4) * 100;
      return { status: v >= 25 ? 'pass' : 'fail', value: v, unit: '%', limit: '≥ 25', delta: v < 25 ? (v / 25 - 1) * 100 : undefined,
        note: 'Renovatsiya loyihasida qamrab olingan hududning kamida toʻrtdan bir qismi yashil zonalardan iborat boʻlishi kerak. Hisob: park/bogʻ va himoya koʻkalamzorligi zonalari ÷ butun hudud; hovli maysasi turar joy zonasiga tegishli — kirmaydi.' };
    },
  },
  {
    id: 'green-86',
    // 06.11 (c68): 86-band 01/2-15 buyrugʻi (06.04.2026) tahririda — 25 % → 30 %; 474-bandning umumiy 25 % i — alohida «green-474»
    title: 'Turar joy zonasining yashil hududi (≥ 30 %)',
    source: { ...SHNQ_2_07_01, clause: '86-band (01/2-15 tahririda), 87-band' },
    evaluate(d, doc) {
      const L = GREEN_86, lim = `≥ ${L}`;
      if (d.greenBase <= 0) return { status: 'na', unit: '%', limit: lim };
      const v = d.greenShareTotal * 100;
      // hovli obodonlashtirish oʻchiq — hovli maysasi hisobga kirmagan: «mos emas» emas, «koʻrib chiqish» (hisob toʻliq emas)
      const noYards = !doc.settings.yards && doc.buildings.length > 0;
      return { status: v >= L ? 'pass' : noYards ? 'review' : 'fail', value: v, unit: '%', limit: lim, delta: v < L ? (v / L - 1) * 100 : undefined,
        ...(noYards && v < L ? { fix: { id: 'yards-on' as const, label: 'Hovlilarni obodonlashtirish', hint: 'Hovlilar avtomatik obodonlashtiriladi (trotuar, maysa, 4-jadval maydonchalari, daraxtlar) — hovli maysasi va maydonchalar (87-band) hisobga kiradi.' } } : {}),
        note: (noYards ? 'Hovli maysasi hisobga olinmadi — «Hovlilarni avtomatik obodonlashtirish» oʻchiq (Yashil qadami).\n' : '') + `Hisob: yashil kvartallar ${Math.round(d.greenArea)} m² + hovli maysasi ${Math.round(d.yardGreen)} m² + maydoncha va yoʻlaklar ${Math.round(d.yardPlay)} m² (87-band: uchastkaning 30 % idan oshmasa) ÷ mavze maydoni (maktab va MTM uchastkalarisiz, 86-band) ${Math.round(d.greenBase)} m².` };
    },
  },
  {
    // 06.11 (c68): 474-band, 1-xatboshi — aholi punkti hududlarida, shu jumladan turar joy yoki aralash qurilish hududlarida mavzening umumiy
    // koʻkalamzorlashtirilganlik darajasi ≥ 25 % (86-banddan farqli: hisob asosi — butun mavze, maktab va MTM uchastkalari bilan)
    id: 'green-474',
    title: 'Mavzening umumiy koʻkalamzorlashtirilganlik darajasi (≥ 25 %)',
    source: { ...SHNQ_2_07_01, clause: '474-band, 1-xatboshi' },
    evaluate(d, doc) {
      const plan = computePlan(doc), base = plan.blocks.reduce((t, b) => t + b.area, 0) + plan.corridorArea, L = GREEN_474, lim = `≥ ${L}`;
      if (base <= 0 || d.greenCounted <= 0 && !doc.buildings.length) return { status: 'na', unit: '%', limit: lim };
      const v = d.greenCounted / base * 100, noYards = !doc.settings.yards && doc.buildings.length > 0;
      return { status: v >= L ? 'pass' : noYards ? 'review' : 'fail', value: v, unit: '%', limit: lim, delta: v < L ? (v / L - 1) * 100 : undefined,
        note: `Hisob: yashil hudud ${Math.round(d.greenCounted)} m² (86-band hisobidagi bilan bir xil) ÷ butun mavze ${Math.round(base)} m² (maktab va MTM uchastkalari bilan; ularning ichidagi yashil hisobga olinmadi — ehtiyot tomonga, TALQIN).` };
    },
  },
  {
    // 06.11 (c68): 474-band, 3-xatboshi (01/2-3 buyrugʻi, 21.01.2026, № 383) — faqat Toshkent shahri: balandligi ≥ 12 m yoki umumiy maydoni
    // ≥ 500 m² yakka uy-joylar va hajmi ≥ 300 m³ noturar binolar (sanoatdan tashqari) — bino umumiy maydonining har 100 m² ga ≥ 1 daraxt, 2 buta
    id: 'trees-474',
    title: 'Toshkent: daraxt va buta koʻchatlari (har 100 m² ga 1 daraxt va 2 buta)',
    source: { ...SHNQ_2_07_01, clause: '474-band, 3-xatboshi (01/2-3 tahririda)' },
    evaluate(_d, doc) {
      if (!/^1726/.test(doc.settings.district ?? '')) return { status: 'na', unit: 'daraxt', note: 'Talab faqat Toshkent shahri hududida qoʻllanadi (474-band, 01/2-3 buyrugʻi bilan qoʻshilgan xatboshi).' };
      const fr = frame(doc.origin), s = doc.settings, plan = computePlan(doc), sel: { id: string; gfa: number; blk: number }[] = [];
      for (const b of doc.buildings) {
        const u = useDef(b.use), r = b.footprint.map(fr.toLocal), a = areaOf(r), h = bLevels(s, b).h, gfa = a * b.floors;
        const yakka = b.use === 'yakka' || ((b.gen?.kind === 'uy' || b.gen?.kind === 'taunhaus') && u.res > 0);
        const noturar = u.res === 0 && b.use !== 'sanoat';
        if (!(yakka ? h >= 12 - 1e-6 || gfa >= 500 : noturar ? a * h >= 300 : false)) continue;
        const c = centroid(r);
        sel.push({ id: b.id, gfa, blk: plan.blocks.findIndex(k => pointIn(c, k.rings)) });
      }
      if (!sel.length) return { status: 'na', unit: 'daraxt', note: 'Mos bino yoʻq: koʻp kvartirali uylar bu xatboshiga kirmaydi; yakka uy (≥ 12 m yoki ≥ 500 m²) va noturar bino (≥ 300 m³, sanoatdan tashqari) — loyihada yoʻq.' };
      const need = sel.reduce((t, x) => t + Math.ceil(x.gfa / 100 - 1e-9), 0), blks = new Set(sel.map(x => x.blk).filter(i => i >= 0));
      const yards = doc.settings.yards ? landscape(doc) : [], got = yards.filter(y => blks.has(y.block)).reduce((t, y) => t + y.trees.length, 0);
      const ok = got >= need, gfaSum = Math.round(sel.reduce((t, x) => t + x.gfa, 0)), need2 = need * 2;
      return { status: ok ? 'review' : doc.settings.yards ? 'fail' : 'review', value: got, unit: 'daraxt', limit: `≥ ${need}`, where: { bids: sel.map(x => x.id) },
        note: `Mos binolar: ${sel.length} ta, umumiy maydon ${gfaSum} m² (tashqi oʻlcham boʻyicha). Talab: ${need} daraxt va ${need2} buta. Loyihada shu binolar kvartallaridagi hovli daraxtlari: ${got}.`
          + '\n' + 'Butalar modelda yoʻq — «koʻrib chiqish». Taunhaus — yakka uy-joy deb olindi (TALQIN).' + (doc.settings.yards ? '' : '\n' + 'Hovli obodonlashtirish oʻchiq — daraxtlar sanalmadi.') };
    },
  },
  {
    id: 'spacing-79',
    title: 'Binolar orasidagi masofa va ustma-ust tushish',
    source: { ...SHNQ_2_07_01, clause: '79-band, 2-jadval, 7–8-izohlar' },
    evaluate(_d, doc) {
      if (doc.buildings.length < 2) return { status: 'na', note: 'Binolar yoʻq' };
      const { pairs } = spacingIssues(doc);
      const ov = pairs.filter(p => p.kind === 'ustma-ust').length, lng = pairs.filter(p => p.kind === 'uzun' && !p.red), lt = pairs.filter(p => p.kind === 'uzun-torets' && !p.red), hard = pairs.filter(p => p.kind === 'torets' && !p.red && p.d < p.need - 0.5), red = pairs.filter(p => p.red), soft = pairs.filter(p => p.kind === 'torets' && p.d >= p.need - 0.5), pass = pairs.filter(p => p.kind === 'otish').length, yk = pairs.filter(p => p.kind === 'yakka');
      const parts: string[] = [];
      if (ov) parts.push(`Ustma-ust tushgan binolar: ${ov} juft — qayta generatsiya qiling yoki ortiqchasini oʻchiring.`);
      if (lng.length) { const w = lng.reduce((a, b) => (b.d / b.need < a.d / a.need ? b : a)); parts.push(`Derazali uzun tarzlar orasi yetmaydi — Hmax × kʏ (2-ilova; kʏ = ${String(w.ky ?? '').replace('.', ',')}), seysmik 8+ ballda ≥ 2·Hmax (8-izoh): ${lng.length} juft, eng yomoni ${Math.round(w.d)} m, talab ${Math.round(w.need)} m.`); }
      if (lt.length) { const w = lt.reduce((a, b) => (b.d / b.need < a.d / a.need ? b : a)); parts.push(`Uzun tomon va torets orasi 2·Hmax·0,3 dan va 6 m dan kam: ${lt.length} juft, eng yomoni ${Math.round(w.d)} m, talab ${Math.round(w.need)} m.`); }
      if (hard.length) { const w = hard.reduce((a, b) => (b.d / b.need < a.d / a.need ? b : a)); parts.push(`Toretslar orasi yetmaydi (derazali — (H1+H2)·0,3, biri derazasiz — 0,25, ikkalasi — 0,15; ≥ 6 m): ${hard.length} juft, eng yomoni ${Math.round(w.d)} m, talab ${Math.round(w.need)} m.`); }
      if (soft.length) parts.push(`Toretslar orasi (H1+H2)·0,3 dan kam: ${soft.length} juft — toretslar derazali boʻlsa yetmaydi.`);
      if (red.length) { const w = red.reduce((a, b) => (b.d / b.need < a.d / a.need ? b : a)); parts.push(`Rekonstruksiya rejimi (7-izoh): ${red.length} juft jadval masofasidan kam, lekin yarmidan va 6 m dan koʻp (eng yaqini ${Math.round(w.d)} m, jadval ${Math.round(w.need)} m) — SanQvaN 0102-25 boʻyicha insolyatsiya hisobi bilan asoslansin (94–95-bandlar: kvartiralarda 1–2 xona, 22.03–22.09 da ≥ 2 soat). Yongʻin masofalari (56-jadval) qisqarmaydi.`); if (red.some(p => p.s8)) parts.push(`Seysmik 8+ ballda uzun tarzlar orasi ham yarmiga (2·Hmax → Hmax) qisqartirildi: ${red.filter(p => p.s8).length} juft. TALQIN — 7-izoh «jadvalda keltirilgan masofalar» deydi, 8-izoh shu jadval izohi; ekspertiza bilan kelishilsin.`); }
      if (yk.length) { const w = yk.reduce((a, b) => (b.d / b.need < a.d / a.need ? b : a)); parts.push(`Koʻp qavatli turar joy va uchastkali past uy orasi bino balandligidan kam (6-izoh; oynasiz tomondan — yarmi): ${yk.length} juft, eng yomoni ${Math.round(w.d)} m, talab ${Math.round(w.need)} m.`); }
      if (pass) parts.push(`Hovliga oʻtishlar (≤ 7,5 m): ${pass} ta — arka sifatida loyihalansin, aks holda toretslar orasi talab qilinadi.`);
      const bad = ov + lng.length + lt.length + hard.length + yk.length;
      // sahnada: muammoli juftlar va ular orasidagi eng qisqa kesma
      const prob = pairs.filter(p => p.kind === 'ustma-ust' || yk.includes(p) || lng.includes(p) || lt.includes(p) || hard.includes(p) || soft.includes(p) || red.includes(p)), fr = frame(doc.origin), R = new Map(doc.buildings.map(b => [b.id, b.footprint.map(fr.toLocal)]));
      // 10-band (egasi): kerakli masofa — eng yaqin nuqtadan shu yoʻnalishda talab uzunligida yashil kesma va «bor → kerak» yozuvi
      const cs = prob.flatMap(p => { const a = R.get(p.a), b = R.get(p.b); return a && b && p.kind !== 'ustma-ust' ? [{ p, s: closestSeg(a, b) }] : []; });
      const nd = cs.filter(({ p }) => p.need > p.d + 0.5 || (p.soft ?? 0) > p.d + 0.5).map(({ p, s }) => { const L = Math.max(p.need, p.soft ?? 0), n = needSeg(s[0], s[1], L); return { n, text: `${nm(p.d)} → ${nm(L)} m` }; });
      const where: Where | undefined = prob.length ? { bids: [...new Set(prob.flatMap(p => [p.a, p.b]))], segs: cs.map(x => x.s), ...(nd.length ? { need: { segs: nd.map(x => x.n), labels: nd.map(x => ({ at: x.n[1], text: x.text })) } } : {}) } : undefined;
      return { status: bad ? 'fail' : (soft.length || pass || red.length) ? 'review' : 'pass', value: bad, unit: 'juft', limit: '0', ...(where ? { where } : {}),
        ...(bad && !ov ? { fix: { id: 'spacing-floors' as const, label: 'Baland binoning qavatlarini kamaytirish', hint: 'Masofa yetmaydigan juftlarda balandroq binoning qavati bittadan kamaytiriladi, toki 2-jadval masofasi bajarilguncha. Bino 3 qavatdan pastga tushirilmaydi; toretslar orasi 6 m dan kam boʻlsa, qavat yordam bermaydi — binoni suring. Bekor qilish — Ctrl+Z.' } } : {}),
        note: (parts.length ? parts.join(' ') : 'Ustma-ust tushgan va yaqin joylashgan binolar yoʻq. Avtomatik binolarda torets derazalari generatsiyada belgilangan; qoʻlda chizilganlarda — eng qatʼiy holat.') + ' Qoʻllanish: 2-jadval — faqat 3+ qavatli koʻp kvartirali turar joy va yotoq oʻrinli binolar oʻzaro (79-band); noturar binolar va uchastkali past uylar oʻzaro tekshirilmaydi (78-band — insolyatsiya va yongʻin masofalari).' + ' Tarzlar bir-biriga qaramasa (fasad roʻparasida bino yoʻq, faqat burchaklar diagonal yaqin) — jadval talabi qoʻyilmaydi (TALQIN).' };
    },
  },
  {
    id: 'redline-79',
    title: 'Binodan yoʻl tarafdagi hudud chegarasigacha (qizil chiziq)',
    source: { ...SHNQ_2_07_01, clause: '79-band, 2-jadval (H × 0,25)' },
    evaluate(d, doc) {
      const plan = computePlan(doc); if (!plan.corridors.length) return { status: 'na', unit: 'm', note: 'Loyiha koʻchalari yoʻq — qizil chiziq maʼlum emas. Mavjud (OSM) koʻchalar hisobga olinmaydi.' };
      const inStreet = new Set((d.streetOverlap ?? []).map(x => x.bid));   // koridorga kirgan bino — «street-overlap» qoidasida
      const fr = frame(doc.origin), bad: { b: Project['buildings'][number]; d: number; need: number; seg: [XY, XY] }[] = []; let n = 0;
      for (const b of doc.buildings) {
        if (b.floors < 3 || useDef(b.use).res <= 0 || inStreet.has(b.id)) continue;   // 79-band: 3 va undan yuqori qavatli turar joy binolari
        const r = b.footprint.map(fr.toLocal), H = bLevels(doc.settings, b).top, need = H * 0.25; n++;
        let best: [XY, XY] | null = null, bd = Infinity;
        for (const poly of plan.corridors) for (const ring of poly) { const sg = closestSeg(r, ring), l = Math.hypot(sg[1][0] - sg[0][0], sg[1][1] - sg[0][1]); if (l < bd) { bd = l; best = sg; } }
        if (best && bd < need - 0.3) bad.push({ b, d: bd, need, seg: best });
      }
      if (!n) return { status: 'na', unit: 'm', note: '3 va undan yuqori qavatli turar joy binolari yoʻq.' };
      const worst = bad.reduce<typeof bad[number] | null>((a, x) => (!a || x.d / x.need < a.d / a.need ? x : a), null);
      const where: Where | undefined = bad.length ? { bids: bad.map(x => x.b.id), segs: bad.map(x => x.seg), need: { segs: bad.map(x => needSeg(x.seg[1], x.seg[0], x.need)), labels: bad.map(x => { const q = needSeg(x.seg[1], x.seg[0], x.need)[1]; return { at: q, text: `${nm(x.d)} → ${nm(x.need)} m` }; }) } } : undefined;
      return { status: bad.length ? 'fail' : 'pass', value: bad.length, unit: `/ ${n} bino`, limit: 'H × 0,25', ...(where ? { where } : {}),
        ...(bad.length ? { fix: { id: 'redline-move' as const, label: 'Binolarni qizil chiziqdan surish', hint: 'Qizil chiziqqa H × 0,25 dan yaqin binolar koʻchadan ichkariga yetarli masofaga suriladi. Qavatlar va shakl oʻzgarmaydi; qoʻshni binolar bilan masofani qayta tekshiring. Bekor qilish — Ctrl+Z.' } } : {}),
        note: `Yoʻl tarafdagi hudud chegarasigacha (loyiha koʻchasi qizil chizigʻi) har qanday tarzdan H × 0,25; H — yer sathidan eng yuqori qavat tom yopmasigacha (1-izoh).${worst ? ` Eng yaqini ${nm(worst.d)} m, talab ${nm(worst.need)} m.` : ''} Qoʻshni taraf hudud chegarasigacha: derazali uzun tarz H × kʏ / 2, yon tarz H × 0,25 (I–II darajada ≥ 6 m) — uchastka chetlari turi generatorda («Uchastka chetlari») tanlanadi. Qizil chiziqqa tutash (0 m) binolar — «Koʻcha koridori» bandida.` };
    },
  },
  {
    id: 'qoshni-79',
    title: 'Binodan qoʻshni taraf hudud chegarasigacha',
    source: { ...SHNQ_2_07_01, clause: '79-band, 2-jadval (H × kʏ / 2; H × 0,25*)' },
    evaluate(_d, doc) {
      // 01.11 (egasi): qoʻshni chegara tekshiruvi meʼyorlar roʻyxatida — uchastka chetlari turi loyihada saqlanadi (doc.siteEdges)
      const plan = computePlan(doc); if (!plan.blocks.length) return { status: 'na', unit: 'm', note: 'Uchastka yoʻq.' };
      const kind = doc.siteEdges ?? 'kocha', fr = frame(doc.origin);
      const streets = doc.streets.map(s => ({ axis: s.axis.map(fr.toLocal), w: profileWidth(profileById(s.profile)) }));
      const edges: [XY, XY][] = [];
      for (const b of plan.blocks) { const ring = b.rings[0], ks = edgeKinds(ring, streets, kind); ring.forEach((p, i) => { if (ks[i] === 'qoshni') edges.push([p, ring[(i + 1) % ring.length]]); }); }
      if (!edges.length) return { status: 'na', unit: 'm', note: kind === 'kocha' ? 'Uchastka chetlari «Koʻcha» deb belgilangan — qoʻshni hudud chegarasi yoʻq. Qoʻshni hudud boʻlsa: Hajmlar → Qoʻshimcha sozlamalar → «Uchastka chetlari» → «Qoʻshni hudud».' : 'Barcha chetlar loyiha koʻchalariga tutash.' };
      const segD = (p: XY, a: XY, b: XY) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)); return { d: Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t), q: [a[0] + dx * t, a[1] + dy * t] as XY }; };
      const bad: { id: string; d: number; need: number; seg: [XY, XY]; long: boolean }[] = []; let n = 0;
      for (const b of doc.buildings) {
        if (b.floors < 3 || useDef(b.use).res <= 0) continue;   // 79-band: 3 va undan yuqori qavatli turar joy binolari
        const r = b.footprint.map(fr.toLocal), H = bLevels(doc.settings, b).top, o = obb2(r); n++;
        for (const [a, c] of edges) {
          const L = Math.hypot(c[0] - a[0], c[1] - a[1]); if (L < 1) continue;
          const e: XY = [(c[0] - a[0]) / L, (c[1] - a[1]) / L];
          let best = { d: Infinity, p: r[0], q: a };
          for (const p of r) { const x = segD(p, a, c); if (x.d < best.d) best = { d: x.d, p, q: x.q }; }
          if (best.d > 3 * H) continue;
          // chegaraga qaragan tarz: OBB uzun tomoni chegaraga parallel boʻlsa — derazali uzun tarz (H × kʏ / 2), aks holda yon tarz (H × 0,25, ≥ 6 m)
          const long = Math.abs(o.U[0] * e[1] - o.U[1] * e[0]) < 0.5, need = boundaryNeed('qoshni', H, long, azOf(o.U));
          if (best.d < need - 0.3) bad.push({ id: b.id, d: best.d, need, seg: [best.p, best.q], long });
        }
      }
      if (!n) return { status: 'na', unit: 'm', note: '3 va undan yuqori qavatli turar joy binolari yoʻq.' };
      const worst = bad.reduce<typeof bad[number] | null>((w, x) => (!w || x.d / x.need < w.d / w.need ? x : w), null);
      const where: Where | undefined = bad.length ? { bids: [...new Set(bad.map(x => x.id))], segs: bad.map(x => x.seg), need: { segs: bad.map(x => needSeg(x.seg[1], x.seg[0], x.need)), labels: bad.map(x => ({ at: needSeg(x.seg[1], x.seg[0], x.need)[1], text: `${nm(x.d)} → ${nm(x.need)} m` })) } } : undefined;
      return { status: bad.length ? 'fail' : 'pass', value: bad.length, unit: `/ ${n} bino`, limit: 'H × kʏ / 2; H × 0,25', ...(where ? { where } : {}),
        note: `Qoʻshni taraf hudud chegarasigacha: derazali uzun tarz H × kʏ / 2 (kʏ — 2-ilova, uzun tomon yoʻnalishi), yon tarz H × 0,25 (I–II darajada ≥ 6 m). Qoʻshni chegara qirralari: ${edges.length}.${worst ? ` Eng yaqini ${nm(worst.d)} m, talab ${nm(worst.need)} m.` : ''}` };
    },
  },
  {
    id: 'hovli-79-3',
    title: 'Yopiq ichki hovli: ichki fasadlar orasi (Hmax × 2,3)',
    source: { ...SHNQ_2_07_01, clause: '79-band, 2-jadval, 3 va 7-izohlar' },
    evaluate(_d, doc) {
      // yopiq hovli — binolar (antiseysmik choklar va arkalar bilan birga) toʻliq oʻrab olgan boʻshliq:
      // har bir izning 1,5 m tasmasi bilan birlashmasidagi teshik (≤ 3 m tirqishlar yopiladi)
      const fr = frame(doc.origin), bs = doc.buildings.filter(b => b.floors > 0), R = new Map(bs.map(b => [b.id, b.footprint.map(fr.toLocal)]));
      if (!bs.some(b => useDef(b.use).res > 0)) return { status: 'na', note: 'Turar joy binolari yoʻq' };
      const parts = bs.flatMap(b => { const r = R.get(b.id)!; return [[[...r, r[0]]] as Polygon, ...corridor([...r, r[0]], 1.5)]; });
      let U: Polygon[] = [];
      try { U = parts.length ? polygonClipping.union(parts[0], ...parts.slice(1)) : []; } catch { return { status: 'na', note: 'Geometriya hisoblanmadi' }; }
      const holes = U.flatMap(p => p.slice(1).map(h => h.slice(0, -1) as XY[])).filter(h => Math.abs(areaOf(h)) > 100);
      if (!holes.length) return { status: 'na', note: 'Yopiq ichki hovli yoʻq (hovli koʻchaga ochiq yoki 3 m dan keng oraliq bor) — 2-jadvalning umumiy masofalari qoʻllanadi.' };
      const ringD = (p: XY, r: XY[]) => { let m = Infinity; for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)); m = Math.min(m, Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t)); } return m; };
      const res: { h: XY[]; S: number; need: number; Hm: number; ids: string[]; c: XY; U: XY }[] = [];
      for (const h of holes) {
        const near = bs.filter(b => R.get(b.id)!.some(p => ringD(p, h) < 2.5) || h.some(p => ringD(p, R.get(b.id)!) < 2.5));
        if (!near.some(b => useDef(b.use).res > 0)) continue;   // 3-izoh: turar joylarda
        const Hm = Math.max(...near.map(b => bLevels(doc.settings, b).top)), o = obb2(h), S = o.S + 3;
        const c: XY = [h.reduce((t, p) => t + p[0], 0) / h.length, h.reduce((t, p) => t + p[1], 0) / h.length];
        res.push({ h, S, need: Hm * 2.3, Hm, ids: near.map(b => b.id), c, U: [-o.U[1], o.U[0]] });
      }
      if (!res.length) return { status: 'na', note: 'Yopiq hovli turar joy binolari bilan oʻralmagan.' };
      // 05.11 (egasi): rekonstruksiya rejimi — 7-izoh bilan yarmigacha (≥ 6 m): «mos emas» emas, «koʻrib chiqish» (TALQIN)
      const rc = doc.settings.recon === true, low = res.filter(x => x.S < x.need - 0.5), bad = low.filter(x => !rc || x.S < Math.max(6, x.need / 2) - 0.5), worst = res.reduce((a, x) => (x.S / x.need < a.S / a.need ? x : a));
      const redN = low.length - bad.length;
      const where: Where | undefined = bad.length ? { bids: [...new Set(bad.flatMap(x => x.ids))], need: { segs: bad.map(x => [[x.c[0] - x.U[0] * x.need / 2, x.c[1] - x.U[1] * x.need / 2], [x.c[0] + x.U[0] * x.need / 2, x.c[1] + x.U[1] * x.need / 2]] as [XY, XY]), labels: bad.map(x => ({ at: [x.c[0] + x.U[0] * x.need / 2, x.c[1] + x.U[1] * x.need / 2] as XY, text: `${nm(x.S)} → ${nm(x.need)} m` })) } } : undefined;
      return { status: bad.length ? 'fail' : redN ? 'review' : 'pass', value: worst.S, unit: 'm', limit: `≥ ${nm(worst.need)} (Hmax ${nm(worst.Hm)} × 2,3)`, ...(where ? { where } : {}),
        ...(bad.length ? { fix: { id: 'hovli-floors' as const, label: 'Hovli atrofidagi qavatlarni kamaytirish', hint: 'Hovlini oʻrab turgan eng baland binoning qavati bittadan kamaytiriladi, toki hovli eni Hmax × 2,3 ga yetguncha (3-izoh). Bino 3 qavatdan pastga tushirilmaydi va oʻchirilmaydi; bekor qilish — Ctrl+Z.' } } : {}),
        note: `Yopiq ichki hovlisi bor turar joylarda binolarning ichki fasadlari orasidagi masofa Hmax × 2,3 qabul qilinadi (3-izoh). Hovlilar: ${res.length}; eng tori ${nm(worst.S)} m (hovlining qisqa oʻlchami), talab ${nm(worst.need)} m. Hmax — hovlini oʻrab turgan binolarning eng balandi (1-izoh: yer sathidan eng yuqori qavat tom yopmasigacha).` + (redN ? `\nRekonstruksiya rejimi (7-izoh): ${redN} ta hovli talabdan tor, lekin yarmidan va 6 m dan keng — insolyatsiya hisobi bilan asoslansin (TALQIN: 7-izoh 3-izohga ham qoʻllandi).` : '') };
    },
  },
  {
    id: 'green-36',
    title: 'Mavzedagi umumiy foydalanishdagi yashil hudud, kishi boshiga',
    source: { doc: 'ShNQ 2.07.01-23', edition: '2023', clause: '486-band, 36-jadval (eng yirik va katta shaharlar)', verified: true },
    evaluate(d) {
      if (d.population <= 0) return { status: 'na', unit: 'm²/kishi', limit: '3–4', note: 'Turar joy binolari yoʻq' };
      const v = d.greenPerPerson;
      return { status: v >= 3 ? 'pass' : 'fail', value: v, unit: 'm²/kishi', limit: '≥ 3', delta: v < 3 ? (v / 3 - 1) * 100 : undefined,
        note: '36-jadval: mavzelardagi yashil hududlar 3–4 m²/kishi (shu jumladan xiyobonlar 1, uy guruhlari va mahalla markazlari bogʻlari 1–1,5). Hisob: «Park / bogʻ» kvartal va parsellari ÷ aholi; hovlilar bu yerga kirmaydi.' };
    },
  },
  {
    // 04.11 (audit, B6): chiqindi toʻplash shoxobchasi — xoʻjalik maydonchasida (4-jadval, 20 m); ShNQ 2.08.01-24, 346-band:
    // derazalardan ≥ 20 m va ≤ 100 m. Har koʻp kvartirali turar joy binosidan eng yaqin xoʻjalik maydonchasigacha tekshiriladi
    id: 'waste-346',
    title: 'Chiqindi maydonchasi: binodan 20–100 m',
    source: { doc: 'ShNQ 2.08.01-24', edition: '2024', clause: '346-band; ShNQ 2.07.01-23, 4-jadval (xoʻjalik maydonchasi)', verified: true },
    evaluate(_d, doc) {
      if (!doc.settings.yards) return { status: 'na', note: 'Hovli obodonlashtirish oʻchirilgan.' };
      const fr = frame(doc.origin), ys = landscape(doc).filter(y => !y.social), bins = ys.flatMap(y => y.play.filter(p => p.kind === 'xojalik').map(p => p.ring));
      const res = doc.buildings.filter(b => useDef(b.use).res > 0 && b.floors >= 3 && !b.gen?.plot && b.gen?.kind !== 'stilobat');
      if (!res.length) return { status: 'na', note: 'Koʻp kvartirali turar joy binolari yoʻq.' };
      const dist = (r: XY[], q: XY[]) => { let m = Infinity; for (const a of r) for (const b of q) m = Math.min(m, Math.hypot(a[0] - b[0], a[1] - b[1])); return m; };
      const far = res.filter(b => { const r = b.footprint.map(fr.toLocal); return !bins.length || Math.min(...bins.map(q => dist(r, q))) > 100; });
      return { status: far.length ? 'review' : 'pass', value: far.length, unit: `/ ${res.length} bino`, limit: '≤ 100 m', ...(far.length ? { where: { bids: far.map(b => b.id) } } : {}),
        note: 'Chiqindi konteynerlari xoʻjalik maydonchasida (binolardan ≥ 20 m — maydoncha shunday joylanadi). 100 m dan uzoq yoki maydonchasiz binolar koʻrsatiladi; masofa burchaklar boʻyicha taxminiy. Maxsus mashina uchun 12 × 12 m burilish maydonchasi (347-band) — qoʻlda.' };
    },
  },
  {
    id: 'play-89',
    title: 'Hovli maydonchalari (bolalar, kattalar, sport, xoʻjalik)',
    source: { doc: 'ShNQ 2.07.01-23', edition: '2023', clause: '89-band, 4-jadval; 90–92-bandlar', verified: true },
    evaluate(d, doc) {
      if (d.population <= 0) return { status: 'na', unit: 'm²', limit: '3,1 m²/kishi' };
      if (!doc.settings.yards) return { status: 'review', note: 'Hovli obodonlashtirish oʻchirilgan (4-qadam, Yashil) — maydonchalar tekshirilmadi.', fix: { id: 'yards-on' as const, label: 'Hovlilarni obodonlashtirish', hint: 'Hovlilar avtomatik obodonlashtiriladi: 4-jadval maydonchalari binolardan meʼyoriy masofada, trotuar, maysa va daraxtlar.' } };
      const p90 = doc.settings.play90 ?? {}, perP = d.population > 0 ? d.playNeed / d.population : 3.1;
      // 05.11: 92-band — «уй-жой қурилишининг зичлиги … 7000 m2/ha дан ортиқ» hududlarda maydonchalarni yer osti / yarim yer osti inshootlari tomlariga
      // joylashtirish «керак» (NORMA). Kichik zichlikda tom maydonchalari ham hisobga olinadi — taqiq yoʻq (TALQIN), lekin yerdagisi yetmasa «koʻrib chiqish»
      const dens = d.housing82?.v ?? d.housingDensity, dense = dens > 7000, ground = d.playGot - d.playRoof;
      const v = d.playNeed > 0 ? d.playGot / d.playNeed * 100 : 0, vG = d.playNeed > 0 ? ground / d.playNeed * 100 : 0;
      let status: Status = v >= 99 ? 'pass' : v >= 50 ? 'review' : 'fail';
      const parts = [`Talab: bolalar 0,7 + kattalar 0,1 + sport 2,0 + xoʻjalik 0,3 m²/kishi; joylashtirilgan ${Math.round(v)} %.`];
      if (p90.sport || p90.dust) {
        parts.push('90-band qoʻllandi (ikki baravargacha qisqartirish).');
        if (p90.sport) parts.push('Mavze sport-sogʻlomlashtirish majmuasi — bolalar, kattalar va sport maydonchalari ×0,5.');
        if (p90.dust) parts.push('Chang boʻronli hudud, xoʻjalik uchun yopiq inshoot — xoʻjalik maydonchasi ×0,5.');
        parts.push(`Qisqartirishsiz talab ${Math.round(d.playNeed0)} m²; asos loyiha hujjatida koʻrsatilsin.`);
      }
      else parts.push('90-band: chang boʻronli hududda xoʻjalik uchun yopiq inshoot qurilsa yoki mavze sport-sogʻlomlashtirish majmuasi boʻlsa — ikki baravargacha qisqartirish mumkin (Yashil qadami → Batafsil; faktga bogʻliq, avtomatik yoqilmaydi).');
      if (d.playRoof > 0) {
        if (dense) parts.push(`92-band: uy-joy zichligi ${Math.round(dens)} m²/ga > 7000 — stilobat tomidagi ${Math.round(d.playRoof)} m² maydonchalar hisobga olindi.`);
        else { parts.push(`Stilobat tomidagi ${Math.round(d.playRoof)} m² maydonchalar ham hisobga olindi (zichlik ${Math.round(dens)} m²/ga ≤ 7000; 92-band tomlarni zich hudud uchun nazarda tutadi, taqiqlamaydi — TALQIN).`); if (status === 'pass' && vG < 99) status = 'review'; }
      } else if (dense && status !== 'pass') parts.push(`92-band: uy-joy zichligi ${Math.round(dens)} m²/ga > 7000 — maydonchalarni yer osti va yarim yer osti inshootlari tomlariga joylashtirish va tomlarni koʻkalamzorlashtirish kerak.`);
      const ug = doc.garages.filter(g => g.kind === 'yer_usti' && !g.truck && (g.stalls?.length ?? 0) > 0);
      return { status, value: d.playGot, unit: 'm²', limit: p90.sport || p90.dust ? `${Math.round(d.playNeed)} (${String(Math.round(perP * 100) / 100).replace('.', ',')} m²/kishi)` : `${Math.round(d.playNeed)} (3,1 m²/kishi)`, note: parts.join(' '),
        ...(status !== 'pass' && ug.length ? { fix: { id: 'play-ug' as const, label: 'Avtoturargohni yer ostiga', hint: `${ug.length} ta yer usti avtoturargoh yer osti qilinadi — hovli boʻshaydi, maydonchalar uning tomiga joylashadi (92-band).` } } : {}) };
    },
  },
  {
    id: 'play-91',
    title: 'Birlashtirilgan maydoncha ≥ 150 m²',
    source: { doc: 'ShNQ 2.07.01-23', edition: '2023', clause: '91-band', verified: true },
    evaluate(d, doc) {
      if (!doc.settings.yards || d.playComb === 0) return { status: 'na', unit: 'ta', limit: '≥ 150 m²' };
      return { status: d.playCombSmall ? 'fail' : 'pass', value: d.playCombSmall, unit: `/ ${d.playComb} ta`, limit: '≥ 150 m²',
        note: [`Bolalar oʻyin va kattalar dam olish maydonchalari birlashtirilgan: ${d.playComb} ta.`, '91-band: «майдончаларнинг юзаси 150 m2 дан кам бўлмаслиги лозим».', ...(d.playCombSmall ? [`${d.playCombSmall} tasi kichik — alohida qiling yoki kattalashtiring.`] : [])].join(' ') };
    },
  },
  {
    id: 'seismic-blocks',
    title: 'Seysmik boʻlmalar: uzunlik va chiqib turgan qism',
    source: { doc: 'QMQ 2.01.03-19', edition: '2019', clause: '3.1-jadval, 3.1.1, 3.1.3, 3.7.2-bandlar', verified: true },
    evaluate(_d, doc) {
      const s = doc.settings, sys = s.construct ?? 'monolit', ball = s.seismic, lim = lenLimit(sys, ball), def = SYS[sys];
      const bl = doc.buildings;
      if (!bl.length) return { status: 'na', limit: lim == null ? 'NSTT' : `≤ ${lim} m`, unit: 'bino', note: `Binolar yoʻq. ${def.name} (${def.row}), ${ball} ball.` };
      const fr = frame(doc.origin), res = bl.map(b => ({ b, c: checkBlock(b.footprint.map(fr.toLocal), sys, ball, !!b.joint, jointOpt(b, bl, fr.toLocal, sys)) }));
      const longs = res.filter(x => !x.c.lenOk), projs = res.filter(x => !x.c.projOk), worst = res.reduce((a, x) => x.c.len > a.c.len ? x : a);
      const n = new Set([...longs, ...projs].map(x => x.b.id)).size;
      const parts = [`${def.name} (3.1-jadval, ${def.row}), ${ball} ball: boʻlma uzunligi ${lim == null ? 'cheklanmagan (NSTT)' : `≤ ${lim} m`}, chiqib turgan qism ≤ ${def.proj} m (3.1.1). Har bino alohida boʻlma deb olindi (inspektorda «Antiseysmik chok» yoqilgan binolar — ichki burchaklaridan boʻlmalarga ajratilgan holda); tegib turgan binolar orasida antiseysmik chok boʻlishi kerak (3.1.3; eng kichik kengligi 3.1.4).`];
      if (longs.length) parts.push(`Uzun: ${longs.length} ta (eng uzuni ${worst.c.len} m) — chok bilan boʻlmalarga ajrating yoki seksiya uzunligini kamaytiring.`);
      if (projs.length) parts.push(`Chiqib turgan qism ${def.proj} m dan katta: ${projs.length} ta (${projs.slice(0, 3).map(x => `${x.c.proj} m`).join(', ')}${projs.length > 3 ? ' …' : ''}) — burchak binosini chok bilan toʻgʻri toʻrtburchak boʻlmalarga ajrating (3.1.1) yoki 1.1-band boʻyicha asoslang.`);
      // 31.10: chok sxemasi uzunlikni ham boʻladi (3.7.2) — uzun binolar va stilobatlar ham chok bilan tuzatiladi
      const fixable = [...new Set([...longs, ...projs])].filter(x => !x.b.joint && (() => { const c = checkBlock(x.b.footprint.map(fr.toLocal), sys, ball, true, jointOpt(x.b, bl, fr.toLocal, sys)); return c.lenOk && c.projOk; })()).length;
      return { status: n ? 'fail' : 'pass', value: n, unit: `/ ${bl.length} bino`, ...(fixable ? { fix: { id: 'seismic-joint' as const, label: 'Antiseysmik chok qoʻyish', hint: `${fixable} ta bino chok bilan tuzatiladi: ichki burchakdan toʻgʻri toʻrtburchak boʻlmalarga (3.1.3), uzun qism — teng boʻlmalarga, choklar orasi ≤ ${lim ?? '—'} m (3.7.2). Stilobatda chok ustidagi minoralar orasidan oʻtkaziladi.` } } : {}), ...(n ? { where: { bids: [...new Set([...longs, ...projs].map(x => x.b.id))] } } : {}), limit: lim == null ? 'NSTT' : `≤ ${lim} m, ≤ ${def.proj} m`, delta: longs.length ? (worst.c.len / (lim ?? worst.c.len) - 1) * 100 : undefined, note: parts.join(' ') };
    },
  },
  {
    id: 'seismic-height',
    title: 'Seysmik balandlik va qavatlar soni',
    source: { doc: 'QMQ 2.01.03-19; ShNQ 2.01.06-25', edition: '2019; 2025', clause: '3.1-jadval (balandlik, qavatlar), 1, 2 va 7-izohlar; ShNQ 2.01.06-25: 2-bob, 5-jadval', verified: true },
    evaluate(_d, doc) {
      const s = doc.settings, sys = s.construct ?? 'monolit', ball = s.seismic, lim = heightLimit(sys, ball), def = SYS[sys];
      const bl = doc.buildings.filter(b => b.floors > 0 && b.gen?.kind !== 'stilobat');
      if (!bl.length) return { status: 'na', unit: 'bino', note: 'Binolar yoʻq.' };
      const bad: { id: string; why: string }[] = [], tall: string[] = [], tm = tallMax(sys);
      for (const b of bl) {
        const L = bLevels(s, b), fl = b.floors + (b.z0 ?? 0), H = L.top;   // 1-izoh: yer sathidan tashqi devorlar yuqorisigacha; 7-izoh: yer usti qavatlari
        if (lim && lim.h == null) bad.push({ id: b.id, why: 'tizim qoʻllanmaydi' });
        else if (lim && lim.h != null && (H > lim.h + 0.05 || (lim.f != null && fl > lim.f))) {
          // 04.11: ShNQ 2.01.06-25 — monolit, H ≤ 100 m (5-jadval): alohida seysmik hisob bilan loyihalanadi — «koʻrib chiqish»
          if (tm != null && H <= tm + 0.05) tall.push(b.id); else bad.push({ id: b.id, why: `${fl} qavat, ${Math.round(H)} m` });
        }
        const sf = socialFloorLimit(b.use, ball); if (sf != null && fl > sf) bad.push({ id: b.id, why: `${b.use} ${fl} > ${sf} qavat (2-izoh)` });
      }
      const ids = [...new Set(bad.map(x => x.id))];
      const limTxt = lim == null ? 'NSTT' : lim.h == null ? 'qoʻllanmaydi' : `≤ ${lim.h} m (${lim.f})`, bt = ball > 9 ? '>9' : String(ball);
      const tl = tall.filter(x => !ids.includes(x));
      return { status: ids.length ? 'fail' : tl.length ? 'review' : 'pass', value: ids.length || tl.length, unit: `/ ${bl.length} bino`, limit: limTxt, ...(ids.length || tl.length ? { where: { bids: ids.length ? ids : tl } } : {}),
        ...(ids.length ? { fix: { id: 'seismic-floors' as const, label: 'Qavatlarni seysmik chegaraga tushirish', hint: '3.1-jadval va 2-izoh chegarasidan baland binolarning qavatlari chegaragacha kamaytiriladi. Binolar oʻchirilmaydi; bekor qilish — Ctrl+Z.' } } : {}),
        note: `${def.name} (${def.row}), ${bt} ball: balandlik va qavatlar soni — ${limTxt}. 8–9 ballda maktab ≤ 3, bogʻcha ≤ 2 qavat; 9 dan yuqori — ≤ 2 qavat (2-izoh).`
          + (tl.length ? ` ${tl.length} ta monolit bino jadval chegarasidan baland, lekin ≤ ${tm} m: ShNQ 2.01.06-25 (01/2-38, 15.08.2025) boʻyicha alohida seysmik hisob talab qilinadi — 70 m dan baland bino (2-bob) chiziqsiz hisob asosida; balandlik sinfi — 5-jadval (SLS 1–2: H ≤ 100 m).` : '')
          + (tm != null ? '' : ' ShNQ 2.01.06-25 (baland binolar) — monolit temir-beton uchun (6–7-jadvallar); bu tizimga qoʻllanmaydi.') };
    },
  },
  {
    id: 'fire-56',
    title: 'Binolar orasidagi yongʻinga qarshi masofa',
    source: { doc: 'ShNQ 2.07.01-23', edition: '2023', clause: '641, 642, 649, 652, 6511-bandlar, 56-jadval (01/2-42 tahririda)', verified: true },
    evaluate(_d, doc) {
      const { pairs, checked } = firePairs(doc), cl = FIRE_CLS[doc.settings.fireLow ?? 0];
      if (!checked) return { status: 'na', unit: 'juft', note: 'Yaqin (≤ 20 m) binolar juftlari yoʻq.' };
      const w = pairs.length ? pairs.reduce((a, b) => (b.d / b.need < a.d / a.need ? b : a)) : null, f = (x: number) => String(Math.round(x * 10) / 10).replace('.', ',');
      const low = pairs.filter(p => p.low).length, p20 = pairs.some(p => p.plus20) || (doc.settings.seismic ?? 0) >= 9;
      return { status: pairs.length ? 'fail' : 'pass', value: pairs.length, unit: 'juft', limit: '6–18 m',
        ...(pairs.length ? { where: { bids: [...new Set(pairs.flatMap(p => [p.a, p.b]))], segs: pairs.map(p => p.seg) } } : {}),
        ...(w ? { delta: (1 - w.d / w.need) * 100 } : {}),
        note: [w ? `Masofa yetmaydi: ${pairs.length} juft, eng yaqini ${f(w.d)} m, talab ${f(w.need)} m.` : 'Barcha yaqin juftlar 56-jadval masofasiga mos.',
          ...(low ? [`Shundan past uylar orasida — ${low}.`] : []),
          `Koʻp qavatli binolar — I–III daraja, C0 (TAXMIN: monolit, karkas, gʻisht — yonmaydigan); past uylar — ${cl} (sozlamada).`,
          'Ф1–Ф4 oʻzaro 6–15 m, Ф5 gacha 10–18 m; Ф5 oʻzaro — 644-band (boshqa meʼyor).',
          ...(p20 ? ['9 ball va yuqori: Ф1 binolar orasi va IV–V darajali binolar orasi +20 % (649-band).'] : []),
          'Tegib turgan (bloklangan, 101-band) uylar bitta blok deb olinadi.',
          'Koʻr devorlar (648-band, −20 %) va avtomatik yongʻin oʻchirish (651-band, −50 % gacha) qoʻllanmadi — derazalar va jihozlar maʼlum emas.',
          'Bitta yer uchastkasidagi turar joy binolari va xoʻjalik imoratlari orasi normalanmaydi (652-band, 01/2-42).', FIRE_6511].join(' ') };
    },
  },
  {
    id: 'arch-159',
    title: 'Arka (bino ostidan oʻtish): eni va balandligi',
    source: { doc: 'ShNQ 2.08.01-24', edition: '2024', clause: '159-band (eni ≥ 3,5 m, balandligi ≥ 4,25 m)', verified: true },
    evaluate(_d, doc) {
      const fr = frame(doc.origin), ar = doc.buildings.filter(b => b.gen?.kind === 'arka');
      if (!ar.length) return { status: 'na', unit: 'arka', note: 'Arkalar yoʻq.' };
      const bad = ar.filter(b => { const o = obb2(b.footprint.map(fr.toLocal)); return bLevels(doc.settings, b).z0 < 4.25 - 0.01 || o.S < 3.5 - 0.01; });
      const h = Math.min(...ar.map(b => bLevels(doc.settings, b).z0));
      return { status: bad.length ? 'fail' : 'pass', value: bad.length, unit: `/ ${ar.length} arka`, limit: '≥ 3,5 × 4,25 m', ...(bad.length ? { where: { bids: bad.map(b => b.id) } } : {}),
        note: `Arka ostida 1-qavat ochiq; eng past arka ${h.toFixed(2).replace('.', ',')} m. Transport oʻtadigan arka ≥ 4,25 m — loyiha sozlamasida 1-qavat balandligini (baland 1-qavat) ≥ 4,25 m qiling.` };
    },
  },
  {
    id: 'dead-end-57',
    title: 'Berk koʻcha oxiri: burilish joyi va uzunligi',
    source: { doc: 'ShNQ 2.07.06-24', edition: '2024', clause: '57, 106-bandlar', verified: true },
    evaluate(_d, doc) {
      const des = deadEnds(doc);
      if (!des.length) return { status: 'na', note: 'Loyiha koʻchalarida berk uch yoʻq' };
      const miss = des.filter(e => !e.has), long = des.filter(e => e.narrow && e.len > 150);   // 04.11 (audit): 150 m — faqat berk tor koʻcha (106-band)
      const parts = ['57-band: berk koʻcha radiusi ≥ 15 m aylanish maydonchasi yoki 20 × 20 m maydoncha bilan tugaydi'];
      if (miss.length) parts.push(`${miss.length} ta uchda burilish joyi yoʻq`);
      parts.push('106-band: berk tor koʻcha (qatnov qismi 3,5 m) ≤ 150 m');
      if (long.length) parts.push(`${long.length} tasi uzun, eng uzuni ${Math.round(Math.max(...long.map(e => e.len)))} m`);
      return { status: miss.length || long.length ? 'fail' : 'pass', ...(miss.length || long.length ? { where: { pts: [...miss, ...long].map(e => e.p) } } : {}),
        ...(miss.length ? { fix: { id: 'dead-end' as const, label: 'Burilish maydonchasi qoʻyish', hint: `${miss.length} ta berk uchga R 15 m aylanish maydonchasi qoʻyiladi (57-band). 20 × 20 m maydonchaga — «Koʻchalar» qadamida. ${long.length ? '150 m dan uzun berk koʻchalarni (106-band) qisqartirish yoki ulash — qoʻlda.' : ''}`.trim() } } : {}), value: des.length - miss.length, unit: `/ ${des.length}`, limit: 'R ≥ 15 m yoki 20 × 20 m; ≤ 150 m', note: parts.join(' · ') };
    },
  },
  {
    id: 'low-green-96',
    title: 'Past qavatli uy uchastkasini koʻkalamzorlashtirish',
    source: { ...SHNQ_2_07_01, clause: '96-band' },
    evaluate(_d, doc) {
      const lows = doc.buildings.filter(b => b.gen?.plot);
      if (!lows.length) return { status: 'na', limit: '≥ 30 %', note: 'Past qavatli uylar (oʻz uchastkasi bilan) yoʻq' };
      const fr = frame(doc.origin), ar = (r: XY[]) => Math.abs(r.reduce((t, p, i) => t + p[0] * r[(i + 1) % r.length][1] - r[(i + 1) % r.length][0] * p[1], 0) / 2);
      // yashil = uchastka − uy dogʻi − oldi yoʻlak va avtomobil joyi (≈ 3 × oldi chekinish, landshaft lowYard bilan bir xil taxmin)
      const sh = lows.map(b => { const P = ar(b.gen!.plot!.map(fr.toLocal)), H = ar(b.footprint.map(fr.toLocal)); return P > 0 ? Math.max(0, 1 - (H + 3 * 5) / P) : 0; });
      const bad = sh.filter(x => x < 0.3).length, mn = Math.min(...sh), badB = lows.filter((_, i) => sh[i] < 0.3);
      return { status: bad ? 'fail' : 'pass', ...(bad ? { where: { bids: badB.map(b => b.id), rings: badB.map(b => b.gen!.plot!.map(fr.toLocal)) } } : {}), value: Math.round(mn * 100), unit: '% (eng kami)', limit: '≥ 30 %', delta: bad ? (0.3 / Math.max(0.01, mn) - 1) * 100 : undefined,
        note: ['96-band: uchastkaning kamida 30 % i koʻkalamzorlashtiriladi', `${lows.length} ta uchastka`, bad ? `${bad} tasida 30 % dan kam` : 'hammasida bajarilgan', 'hisob: uchastka − uy dogʻi − oldi yoʻlak va avtomobil joyi (~15 m²)'].join(' · ') };
    },
  },
  {
    id: 'fire-666',
    title: 'Yongʻin-qutqaruv texnikasi yoʻlagi (hovlida, H ≥ 28 m)',
    source: { doc: 'ShNQ 2.07.01-23', edition: '2023', clause: '666, 667, 675–677-bandlar', verified: true },
    evaluate(_d, doc) {
      const Ht = (b: Project['buildings'][number]) => bLevels(doc.settings, b).top;
      // 31.10: stilobat ustidagi jamoat binolari (F2, F3, F4.2–F4.4) — H ≥ 18 m
      if (!doc.buildings.some(b => Ht(b) >= 28 || ((b.z0 ?? 0) > 0 && Ht(b) >= 18))) return { status: 'na', note: 'Balandligi 28 m va undan yuqori turar joy binolari yoʻq — bitta uzun tomondan (koʻchadan) yetib kelish yetarli (666-band).' };
      if (!doc.settings.yards) return { status: 'review', note: 'Hovli obodonlashtirish oʻchiq — hovlidagi yoʻlak tekshirilmadi (Yashil qadami).', fix: { id: 'yards-on' as const, label: 'Hovlilarni obodonlashtirish', hint: 'Hovlilar obodonlashtiriladi va hovlidagi yongʻin yoʻlagi (667, 675, 676-bandlar) avtomatik chiziladi.' } };
      const ys = landscape(doc).filter(y => y.fire), bad = ys.filter(y => !y.fire!.area), noIn = ys.filter(y => !y.z && y.fire!.area && !(y.entries ?? []).some(e => e.kind === 'arka' || (e.kind === 'oraliq' && (e.w ?? 0) >= y.fire!.w)));
      const roofs = ys.filter(y => y.z), noRamp = roofs.filter(y => y.fire!.area && !y.ramp);
      const w = Math.max(0, ...ys.map(y => y.fire!.w));
      const fr = frame(doc.origin), P = computePlan(doc), ringOf = (y: (typeof ys)[number]) => y.roofOf ? doc.buildings.find(b => b.id === y.roofOf)?.footprint.map(fr.toLocal) : P.blocks[y.block]?.rings[0];
      const wh = [...bad, ...noIn, ...noRamp].map(ringOf).filter((r): r is XY[] => !!r);
      // 666-band: qurilish maydoni > 10 000 m² yoki eni > 100 m — barcha tomondan
      const big = doc.buildings.filter(b => b.gen?.kind === 'stilobat').map(b => b.footprint.map(fr.toLocal)).filter(r => areaOf(r) > 10000 || obb2(r).S > 100).length;
      let note = `Binoning ikkala uzun tomonidan yetib kelish (666-band, F1.3, H ≥ 28 m): hovlida eni ${w} m yoʻlak (667-band), ichki chetidan devorgacha 9 m (675-band: 8–10 m), yoʻlak va bino orasida daraxt qatori yoʻq (676-band).`;
      if (bad.length) note += ` Hovlida yoʻlak sigʻmadi: ${bad.length} kvartal — hovlini kengaytiring yoki qavatlarni kamaytiring.`;
      if (noIn.length) note += ` Hovliga mashina kirishi (arka yoki ≥ ${w} m oraliq) topilmadi: ${noIn.length} kvartal.`;
      if (roofs.length) {
        const rp = roofs.find(y => y.ramp)?.ramp;
        note += ` Stilobat tomida yoʻlak: ${roofs.length} ta (ustidagi binolar F1.3 ≥ 28 m yoki jamoat ≥ 18 m). 677-band: tom konstruksiyasi yongʻin avtomobilining har oʻqidan ≥ 16 t yukka hisoblanadi.`;
        if (rp) note += ` Rampa: stilobat balandligi ${Math.round(rp.h * 10) / 10} m, nishab ≤ ${Math.round(rp.slope * 100)} % (ShNQ 2.07.01-23, 20- va 22-jadval: «uzunasiga eng katta qiyalik — 80», jadvalda «foiz» deb berilgan, birligi ‰ — ShNQ 2.07.06-24, 13-ilova, 1-jadval: 50 km/soat 80 ‰, 30 km/soat 100 ‰) → uzunligi ${rp.len} m, eni ${rp.w} m.`;
        if (noRamp.length) note += ` Rampa sigʻmadi: ${noRamp.length} ta stilobat — chekinishni kengaytiring yoki rampani bino ichida loyihalang.`;
      }
      if (big) note += ` 666-band: qurilish maydoni 10 000 m² dan yoki eni 100 m dan katta stilobat — ${big} ta: barcha tomondan yetib kelish kerak (koʻchalar va hovli yoʻlagi bilan tekshiring).`;
      return { status: bad.length || noRamp.length ? 'fail' : noIn.length || big ? 'review' : 'pass', ...(wh.length ? { where: { rings: wh } } : {}), value: ys.length - bad.length - noRamp.length, unit: 'kvartal', limit: `${ys.length}`, note };
    },
  },
  {
    id: 'fire-podium',
    title: 'Stilobat: yongʻin boʻlmalari va yongʻinga qarshi devorlar',
    source: { doc: 'ShNQ 2.08.02-23; ShNQ 2.01.02-04', edition: '2023; 2004', clause: '44-band, 2-ilova 2–3-jadval; 6.16–6.18, 6.20, 6.22-bandlar', verified: true },
    evaluate(_d, doc) {
      const pods = doc.buildings.filter(isPodium);
      if (!pods.length) return { status: 'na', note: 'Stilobat yoʻq.' };
      const fr = frame(doc.origin), sys = doc.settings.construct ?? 'monolit', lim = lenLimit(sys, doc.settings.seismic);
      const rows = pods.map(b => { const r = b.footprint.map(fr.toLocal), o = jointOpt(b, doc.buildings, fr.toLocal, sys), sc = b.joint ? jointScheme(r, lim, o.area, o.avoid) : { parts: [r], cuts: [] }, fc = fireComp(b.use, b.floors, sys);
        return { b, n: sc.parts.length, max: Math.max(...sc.parts.map(p => areaOf(p))), cuts: sc.cuts.length, fc }; });
      const bad = rows.filter(x => x.max > x.fc.area + 1), worst = rows.reduce((a, x) => x.max / x.fc.area > a.max / a.fc.area ? x : a);
      const anyAnd = rows.some(x => !x.fc.norm);
      const parts = [
        `44-band: 1-tipli (REI 150) yongʻinga qarshi devorlar orasidagi qavat maydoni — 2-ilova: jamoat binolari 2-jadval (I, CO: 1 qavat 6000, 2–9 qavat 5000, 10–16 qavat 2500 m²), savdo 3-jadval (I, II: 1 qavat 3500, 2 qavat 3000, 3–5 qavat 2500 m²). Avtomatik yongʻin oʻchirish tizimi boʻlsa — ikki barobargacha oshirish mumkin (izohlar). Olovbardoshlik darajasi taxmin: monolit / karkas — I, boshqa tizim — II; loyihachi yongʻin-texnik tasnif boʻyicha aniqlaydi.`,
        ...(anyAnd ? [`Avtoturargoh stilobati — ≤ ${FIRE_COMP_ANDOZA} m²: ShNQ 2.01.02-04 ga 1-son oʻzgartirish, 4.12–4.13-bandlar (baland binolar stilobati va yer osti avtoturargohi — «odatda 3000 m²»); oddiy binolar uchun 4.3-band SNiP 21-02-99 ga havola qiladi, uning matni yoʻq — oʻxshashlik boʻyicha qabul qilindi.`] : []),
        '6.16–6.17 (ShNQ 2.01.02-04): yongʻinga qarshi devor binoning butun balandligiga, poydevordan, barcha qavatlarni kesib oʻtadi — shuning uchun chok stilobat ustidagi minoralar orasidan oʻtkaziladi.',
        '6.18: devor tomdan kamida 60 sm (yopma elementlaridan biri G3–G4 boʻlsa) yoki 30 sm (G1–G2) baland; hammasi yonmaydigan (NG) boʻlsa — chiqmasligi mumkin.',
        '6.20: yongʻinga qarshi devor — balandroq va kengroq boʻlmaniki. 6.22: burchak ostida tutashganda tashqi devordagi teshiklar orasi gorizontal boʻyicha ≥ 4 m.',
        `Stilobatlar: ${pods.length} ta, eng ogʻiri ${Math.round(worst.max)} m² / ≤ ${worst.fc.area} m² (${worst.fc.src})${worst.b.joint ? `, ${worst.n} boʻlma` : ''}.`,
      ];
      if (bad.length) parts.push(`${bad.length} ta stilobatda boʻlma chegaradan katta — avtomatik choklar sxemasi bilan boʻlmalarga ajrating yoki avtomatik yongʻin oʻchirish tizimini nazarda tuting.`);
      const fixable = bad.filter(x => !x.b.joint).length;
      return { status: bad.length ? (bad.every(x => x.fc.norm) ? 'fail' : 'review') : 'pass', value: Math.round(worst.max), unit: 'm² (eng katta boʻlma)', limit: `≤ ${worst.fc.area} m²${worst.fc.norm ? '' : ' (andoza)'}`,
        ...(bad.length ? { where: { bids: bad.map(x => x.b.id) } } : {}),
        ...(fixable ? { fix: { id: 'podium-joint' as const, label: 'Choklar sxemasini qoʻyish', hint: `${fixable} ta stilobat teng boʻlmalarga ajratiladi: har boʻlma ShNQ 2.08.02-23, 2-ilova chegarasidan oshmaydi va ≤ ${lim ?? '—'} m (QMQ 2.01.03-19, 3.1-jadval); chok — antiseysmik chok va yongʻinga qarshi devor, minoralar orasidan.` } } : {}),
        note: parts.join(' ') };
    },
  },
  // 02.11, cheklovlar 3-bosqichi; 06.11 (c61) — asl matn: SanQvaN 0103-25 (7, 12, 14-bandlar, 1-ilova), VMQ № 1050 (14, 17), ShNQ 2.07.01-23 (251, 253)
  {
    id: 'szz-217',
    title: 'SMZ ichida taqiqlangan funksiya',
    source: { ...SANQ, clause: '12-band (taqiq), 14-band (ruxsat); SMZ — 7-band, 1-ilova; temir yoʻl — ShNQ 2.07.01-23, 359' },
    evaluate(_d, doc) {
      // 06.11 (c65): qabriston SMZ i — alohida qoida (qab-szz, VM 101, 50-band)
      const c0 = limitChecks(doc), qabIds = new Set((doc.limits ?? []).filter(l => l.kind === 'qabriston').map(l => l.id));
      const c = { ...c0, szz: c0.szz.filter(x => x.kind !== 'qabriston'), szzBlocks: c0.szzBlocks.filter(x => !qabIds.has(x.limit)) };
      if (!c.any) return { status: 'na', unit: 'bino', limit: '0', note: 'Cheklov obyektlari kiritilmagan (1-qadam, «Mavjud holat va cheklovlar»).' };
      const ids = (v: SzzVerdict) => [...new Set(c.szz.filter(x => x.verdict === v).map(x => x.bid))];
      const deny = ids('deny'), rev = ids('review'), allow = ids('allow'), blk = [...new Set(c.szzBlocks.filter(x => !x.amal).map(x => x.block))];
      const amB = [...new Set(c.szz.filter(x => x.amal && SZZ_DENY.includes(x.use)).map(x => x.bid))].length, amK = [...new Set(c.szzBlocks.filter(x => x.amal).map(x => x.block))].length;
      const amal = amB || amK ? `\nQabriston SMZ i: amaldagi normada (0103-25) qiymat yoʻq; oldingi 0350-17, 6.4 qiymati — maʼlumot uchun (AMALIYOT), baholanmadi. Unda ${amB} ta bino va ${amK} ta kvartal 12-band roʻyxatidagi funksiyada — koʻrib chiqish.` : '';
      if (!deny.length && !rev.length && !allow.length && !blk.length) return { status: amK ? 'review' : 'pass', value: 0, unit: 'bino', limit: '0', note: 'SMZ ichida bino yoʻq.' + amal };
      const show = deny.length ? deny : rev.length ? rev : allow;
      // 04.11 (audit): park, sport, tomorqa, maktab/MTM/poliklinika hududi ham (binosiz) tekshiriladi; poliklinika va oziq-ovqat ombori — taqiq
      return { status: deny.length || blk.length ? 'fail' : 'review', value: deny.length + blk.length, unit: 'bino', limit: '0', where: { bids: show, rings: [...c.zoneRings, ...c.szzBlocks.flatMap(x => x.rings)] },
        note: `SMZ ichida: taqiqlangan funksiyada ${deny.length} ta bino (12-band); roʻyxatlarda yoʻq funksiyada ${rev.length} ta — sanitariya nazorati bilan kelishiladi; ruxsat etilgan funksiyada ${allow.length} ta (14-band: sinfi past obyektlar — TALQIN; himoya koʻkalamzorligi — 13-band). Taqiqlangan hudud (park, sport, tomorqa, maktab, MTM, poliklinika, ijtimoiy uchastka) SMZ ga tushgan: ${blk.length} ta kvartal/parsel. Poliklinika (umumiy foydalanish) va oziq-ovqat omborxonalari — 12-band taqiqi; obyekt tarkibidagi poliklinika, oʻquv binosi, ishlab chiqarishga taalluqli savdo va umumiy ovqatlanish (14-band) — qoʻlda kelishiladi. Boshqaruv binolari, avtoturargoh, umumiy savdo va muhandislik 14-band roʻyxatida yoʻq (oldingi 0350-17, 2.20 da bor edi) — koʻrib chiqish.` + amal };
    },
  },
  // 06.11 (c65, egasi): qabriston SMZ i — VM 101, 50-band (turi boʻyicha 500 / 300 / 100 / 50 m) + SanQvaN 0103-25, 12 va 14-bandlar
  {
    id: 'qab-szz',
    title: 'Qabriston SMZ',
    source: { doc: 'VM 101-son qarori (04.04.2011)', edition: '2011', clause: '1-ilova, 50-band; SanQvaN 0103-25, 12-band (taqiq), 14-band (ruxsat)', verified: true },
    evaluate(_d, doc) {
      const qs = (doc.limits ?? []).filter(l => l.kind === 'qabriston' && isActive(l));
      if (!qs.length) return { status: 'na', unit: 'bino', limit: '0', note: 'Saqlanadigan qabriston kiritilmagan (1-qadam, «Mavjud holat va cheklovlar»).' };
      const c = limitChecks(doc), ids = new Set(qs.map(l => l.id)), hits = c.szz.filter(x => x.kind === 'qabriston'), blocks = c.szzBlocks.filter(x => ids.has(x.limit));
      const zones = limitZones(doc).soft.filter(z => z.kind === 'qabriston'), ms = [...new Set(zones.map(z => z.m))].sort((a, b) => a - b).map(m => `${m} m`).join(', ');
      const by = (v: SzzVerdict) => [...new Set(hits.filter(x => x.verdict === v).map(x => x.bid))], deny = by('deny'), rev = by('review'), blk = [...new Set(blocks.map(x => x.block))];
      const base = `SMZ: ${ms || '—'} (VM 101, 50-band: yangi 20–40 ga — 500 m, 20 ga dan kichik — 300 m; yopiq va kuydirishdan keyin dafn — 100 m, yopiqda sanepid kelishuvi bilan 50 m gacha; qishloq va kolumbariy — ≥ 50 m). «SҲZ ҳудудида бирор-бир турар жой ва жамоат биноларини қуриш тақиқланади»; SanQvaN 0103-25, 12-band roʻyxati (dam olish joylari, sport inshootlari) ham taqiq. 100 m masofa — alohida qoida.`;
      if (!deny.length && !rev.length && !blk.length) return { status: 'pass', value: 0, unit: 'bino', limit: '0', ...(zones.length ? { where: { rings: zones.flatMap(z => z.rings) } } : {}), note: `Qabriston SMZ ida taqiqlangan funksiyali bino yoki hudud yoʻq. ${base}` };
      return { status: deny.length || blk.length ? 'fail' : 'review', value: deny.length + blk.length, unit: 'bino', limit: '0', where: { bids: deny.length ? deny : rev, rings: [...zones.flatMap(z => z.rings), ...blocks.flatMap(x => x.rings)] },
        note: `Qabriston SMZ ida: taqiqlangan funksiyada ${deny.length} ta bino, ${blk.length} ta kvartal/parsel (park, sport, tomorqa, maktab, MTM, poliklinika); roʻyxatlarda yoʻq funksiyada ${rev.length} ta bino — sanitariya nazorati bilan kelishiladi. ${base}` };
    },
  },
  // 06.11 (c65, egasi): VM 101, 50-band — qabriston SMZ idan alohida, 100 m masofa talabi
  {
    id: 'qab-100',
    title: 'Qabristondan turar joy, jamoat binolari va dam olish zonalarigacha ≥ 100 m',
    source: { doc: 'VM 101-son qarori (04.04.2011)', edition: '2011', clause: '1-ilova, 50-band', verified: true },
    evaluate(_d, doc) {
      const qs = (doc.limits ?? []).filter(l => l.kind === 'qabriston' && isActive(l));
      if (!qs.length) return { status: 'na', unit: 'bino', limit: '≥ 100 m', note: 'Saqlanadigan qabriston kiritilmagan (1-qadam, «Mavjud holat va cheklovlar»).' };
      const c = limitChecks(doc), bids = [...new Set(c.qab.map(x => x.bid))], blk = [...new Set(c.qabBlocks.map(x => x.block))];
      const quote = 'Asl matn: «Турар жой ва жамоат бинолари ҳамда дам олиш зоналари деворидан қабристонгача масофа 100 метрдан кам бўлмаслиги керак». Masofa SMZ dan alohida: sanepid kelishuvi bilan kamaytirish (yopiq qabriston SMZ i) bu talabga qoʻllanmaydi. Garaj, avtoturargoh, ombor, yoʻl, muhandislik obyektlari 100 m ichida mumkin (SMZ ichida — SMZ rejimi boʻyicha).';
      if (!bids.length && !blk.length) return { status: 'pass', value: 0, unit: 'bino', limit: '≥ 100 m', ...(c.qabRings.length ? { where: { rings: c.qabRings } } : {}), note: `Qabristondan 100 m ichida turar joy, jamoat binosi va dam olish zonasi yoʻq. ${quote}` };
      return { status: 'fail', value: bids.length + blk.length, unit: 'bino', limit: '≥ 100 m', where: { bids, rings: [...c.qabRings, ...c.qabBlocks.flatMap(x => x.rings)] },
        note: `Qabristondan 100 m ichida: ${bids.length} ta turar joy yoki jamoat binosi, ${blk.length} ta dam olish zonasi yoki jamoat uchastkasi (park, sport, maydon, maktab, MTM, poliklinika, tomorqa). ${quote}` };
    },
  },
  {
    id: 'elu-1050',
    title: 'ELU muhofaza zonasida bino',
    source: { doc: 'VMQ № 1050 (26.12.2018)', edition: '2018', clause: '14-band (zona), 17-band (bino — tarmoq egasining yozma roziligi); SMZ — SanQvaN 0103-25, 15-band', verified: true },
    evaluate(_d, doc) {
      const c = limitChecks(doc), elu = (doc.limits ?? []).filter(l => l.kind === 'elu');
      if (!elu.length) return { status: 'na', unit: 'bino', limit: '0', note: 'ELU kiritilmagan.' };
      const ids = [...new Set(c.elu.map(x => x.bid))], kv = [...new Set(c.elu.map(x => `${x.kv} kV — ${x.m} m`))].join(', ');
      if (!ids.length) return { status: 'pass', value: 0, unit: 'bino', limit: '0', note: 'ELU zonasida bino yoʻq.' };
      return { status: 'fail', value: ids.length, unit: 'bino', limit: '0', where: { bids: ids, rings: c.zoneRings },
        note: `ELU zonasida ${ids.length} ta bino (${kv}). Yechim: binoni zonadan chiqarish, ELU ni kabelga oʻtkazish yoki koʻchirish (tarmoq egasi bilan).` };
    },
  },
  {
    id: 'elu-251',
    title: '35 kV va undan yuqori havo ELU turar joy hududi ustidan',
    source: { ...SHNQ_2_07_01, clause: '251-band (turar joy hududidan tashqarida), 253-band (rekonstruksiyada chiqarish yoki kabelga)' },
    evaluate(_d, doc) {
      const c = limitChecks(doc), hv = (doc.limits ?? []).filter(l => l.kind === 'elu' && (l.kv ?? 0) >= 35 && l.elu !== 'kabel' && l.elu !== 'demontaj');
      if (!hv.length) return { status: 'na', unit: 'kvartal', limit: '0', note: '35 kV va undan yuqori havo ELU yoʻq.' };
      const n = c.elu251.reduce((t, x) => t + x.blocks, 0), kv = c.elu251.map(x => `${x.kv} kV`).join(', ');
      if (!n) return { status: 'pass', value: 0, unit: 'kvartal', limit: '0', note: 'Havo liniyalari turar joy kvartallari orqali oʻtmaydi.' };
      return { status: 'fail', value: n, unit: 'kvartal', limit: '0',
        note: `Havo liniyasi (${kv}) ${n} ta turar joy kvartali orqali oʻtadi. 253-band: liniyani turar joy hududidan chiqarish yoki kabelga almashtirish (ELU holati — «Kabelga»).` };
    },
  },
  // 04.11 (Murad Buildings sinovi, 6-band; egasi: «981-ni qoʻlla») — kengliklar VM 981-son nizomidan; hujjat kuchini yoʻqotgan (LexUz)
  {
    id: 'water-981',
    title: 'Suvni muhofaza qilish zonasi va qirgʻoq boʻyi mintaqasi',
    source: { doc: 'VM 981-son qarori (11.12.2019) nizomi; Suv kodeksi (30.07.2025)', edition: '2019 — 23.06.2026 dan kuchini yoʻqotgan (LexUz), oʻrnini bosuvchi hujjat aniqlanmagan', clause: '18, 21, 23, 29, 30, 31, 32, 35, 37-bandlar; Suv kodeksi 24-bob, 125–138-moddalar (rejim)', verified: false },
    evaluate(_d, doc) {
      // 06.11 (c63): bezak suvi (fontan, bezak hovuzi, basseyn) — 981-son nizomdagi suv obyekti emas (TALQIN), tekshirilmaydi
      const suv = (doc.limits ?? []).filter(l => l.kind === 'suv' && isActive(l) && l.suv?.t !== 'bezak');
      if (!suv.length) return { status: 'na', unit: 'bino', limit: '0', note: (doc.limits ?? []).some(l => l.kind === 'suv' && l.suv?.t === 'bezak') ? 'Faqat bezak suvi (fontan, bezak hovuzi) — suvni muhofaza zonasi qoʻllanmaydi (TALQIN).' : 'Suv obyekti kiritilmagan (1-qadam, «Mavjud holat va cheklovlar»).' };
      const c = limitChecks(doc), sh = [...new Set(c.suv.filter(x => x.shore).map(x => x.bid))], zn = [...new Set(c.suv.filter(x => !x.shore && !sh.includes(x.bid)).map(x => x.bid))];
      const own = suv.filter(l => l.szz != null || l.qir != null).length, tail = ` Kengliklar — 981-son nizom (oraliqning quyi chegarasi; yer turi, nishablik, sarf yoki hajmga qarab oshadi); aholi punktida — bosh reja boʻyicha (23, 37-bandlar). Hujjat LexUz da 23.06.2026 dan kuchini yoʻqotgan — amaldagi hujjat va kengliklar tasdiqlanishi kerak.${own ? ` Qoʻlda oʻzgartirilgan: ${own} ta obyekt.` : ''}`;
      if (!sh.length && !zn.length) return { status: 'review', value: 0, unit: 'bino', limit: '0', where: { rings: c.suvRings }, note: `Qirgʻoq boʻyi mintaqasida va suvni muhofaza qilish zonasida bino yoʻq.${tail}` };
      return { status: sh.length ? 'fail' : 'review', value: sh.length || zn.length, unit: 'bino', limit: '0', where: { bids: sh.length ? sh : zn, rings: c.suvRings },
        note: `Qirgʻoq boʻyi mintaqasida ${sh.length} ta bino (qurilish taqiqlanadi, suv xoʻjaligi obyektlaridan tashqari); suvni muhofaza qilish zonasida ${zn.length} ta bino — zona rejimi (Suv kodeksi, 125–138-moddalar) boʻyicha koʻrib chiqiladi.${tail}` };
    },
  },
  {
    id: 'szz-manual',
    title: 'SMZ yoki ELU zonasi qoʻlda kamaytirilgan',
    source: { ...SANQ, clause: '10-band (qisqartirish shartlari), 11-band (10 barobargacha kengaytirish)' },
    evaluate(_d, doc) {
      const c = limitChecks(doc);
      if (!c.any) return { status: 'na', unit: 'obyekt', limit: '0', note: 'Cheklov obyektlari kiritilmagan.' };
      if (!c.manual.length) return { status: 'pass', value: 0, unit: 'obyekt', limit: '0', note: 'Barcha zonalar jadvaldagi qiymatda (yoki kattaroq).' };
      const list = c.manual.map(x => `${x.m} m < ${x.table} m`).join(', ');
      return { status: 'review', value: c.manual.length, unit: 'obyekt', limit: '0',
        note: `Qoʻlda kamaytirilgan: ${list}. 10-band: qisqartirish — REM va shovqin meʼyorlari taʼminlanganda, laboratoriya-instrumental tahlil natijasida (1–2-sinf — kamida 50 kun, 3–5-sinf — kamida 30 kun), sinf oʻzgarganda yoki ifloslanishni kamaytiruvchi texnologiya qoʻllanganda; asoslovchi hujjat kerak. Qabriston SMZ i — AMALIYOT (0103-25 da yoʻq).` };
    },
  },
  // 02.11, cheklovlar 3b; 06.11 (c61) — SanQvaN 0103-25, 13-band (asl matn): 1-sinf — SMZ ning 40 %, 2–3-sinf — 50 %, 4–5-sinf — 60 % koʻkalamzorlashtiriladi
  {
    id: 'szz-219',
    title: 'SMZ koʻkalamzorligi',
    source: { ...SANQ, clause: '13-band (1-sinf ≥ 40 %, 2–3-sinf ≥ 50 %, 4–5-sinf ≥ 60 %); ShNQ 2.07.01-23, 475 (maxsus maqsadli yashil)' },
    evaluate(_d, doc) {
      const z = szzGreen(doc);
      if (!z.length) return { status: 'na', unit: '%', limit: '≥ 60', note: 'Uchastka ichida SMZ yoʻq.' };
      const bad = z.filter(x => x.share + 1e-6 < x.need), badN = bad.filter(x => !x.amal), worst = [...z].sort((a, b) => (a.share - a.need) - (b.share - b.need))[0];
      const pc = (v: number) => Math.round(v * 100);
      const list = z.map(x => `${x.cls}: ${pc(x.share)} % / ${pc(x.need)} %`).join("; ");
      const amal = z.some(x => x.amal) ? ' Qabriston SMZ i (VM 101, 50-band): 13-band 1-ilova obyektlari uchun, qabriston u yerda yoʻq — foiz maʼlumot uchun, «mos emas» berilmaydi.' : '';
      return { status: badN.length ? 'fail' : bad.length ? 'review' : 'pass', value: pc(worst.share), unit: '%', limit: `≥ ${pc(worst.need)}`, where: { rings: (bad.length ? bad : z).flatMap(x => x.rings) },
        note: (bad.length ? `SMZ ning uchastka ichidagi qismida koʻkalam yetarli emas (${list}). Koʻcha koridorlari ham hisob maydonida (TALQIN). Yechim: SMZ qismini «Himoya koʻkalamzorligi (SMZ)» funksiyasiga bering (Parsellar → «SMZ chegarasi boʻyicha ajratish»). Koʻkalam — himoya koʻkalamzorligi kvartallari (TALQIN).`
          : `SMZ koʻkalamzorligi yetarli (${list}).`) + amal };
    },
  },
  // 06.11 — bekor qilingan SanPiN 0350-17, 2.19: selitebnaya hudud tomonida daraxt-buta tasmasi ≥ 50 m, zona ≤ 100 m boʻlsa ≥ 20 m.
  // c61 (egasi): 0103-25 da bu talab yoʻq — sukut boʻyicha oʻchiq (Sozlama «SMZ daraxt-buta tasmasi»); yoqilganda — AMALIYOT, eng koʻpi «koʻrib chiqish»
  {
    id: 'szz-belt',
    title: 'SMZ: turar joy tomonida daraxt-buta tasmasi',
    source: { doc: 'AMALIYOT: SanPiN 0350-17 (bekor qilingan)', edition: '2017 — 0103-25 bilan bekor', clause: '2.19 (≥ 50 m; zona ≤ 100 m boʻlsa ≥ 20 m)', verified: false },
    evaluate(_d, doc) {
      if (!doc.settings.szzBelt) return { status: 'na', unit: 'm', limit: '—', note: 'Oʻchiq: amaldagi SanQvaN 0103-25 da daraxt-buta tasmasi talabi yoʻq. Bekor qilingan 0350-17, 2.19 tekshiruvini AMALIYOT sifatida yoqish — reyestrdagi «Qoʻshimcha» sozlamalarida.' };
      const z = szzBelt(doc);
      if (!z.length) return { status: 'na', unit: 'm', limit: '≥ 50 / ≥ 20', note: 'Uchastka ichida turar joy tomonga qaragan SMZ yoʻq.' };
      const tol = (x: typeof z[number]) => x.miss <= Math.max(50, 0.02 * x.area);
      const bad = z.filter(x => !tol(x)), worst = [...z].sort((a, b) => (a.width - a.need) - (b.width - b.need))[0];
      const list = z.map(x => `${Math.round(x.width)} / ${Math.round(x.need)} m`).join('; '), needs = bad.map(x => `${Math.round(x.need)} m`).join(', '), missM = Math.round(bad.reduce((t, x) => t + x.miss, 0)), gap = BELT_GAP;
      const parts = [bad.length ? `Daraxt-buta tasmasi yetarli emas (${list}). Koʻkalamsiz qismi: ${missM} m².` : `Daraxt-buta tasmasi yetarli (${list}).`];
      if (z.some(x => x.outside)) parts.push('SMZ ning bir qismi uchastkadan tashqarida — faqat uchastka ichidagi qismi tekshirildi.');
      parts.push(`Tasma — SMZ ning tashqi qismi, turar joy, maktab, MTM, poliklinika, sport va park kvartallari tomonida (selitebnaya hudud — 12-band roʻyxati, TALQIN; oradagi koʻcha uchun ${gap} m — ANDOZA; koʻcha koridorlari hisobga olinmaydi). Daraxt-buta tasmasi — «Himoya koʻkalamzorligi (SMZ)» kvartallari.`);
      parts.push('AMALIYOT: talab bekor qilingan 0350-17, 2.19 dan; amaldagi 0103-25 da yoʻq — natija «mos emas» emas, «koʻrib chiqish».');
      return { status: bad.length ? 'review' : 'pass', value: Math.round(worst.width), unit: 'm', limit: `≥ ${Math.round(worst.need)}`,
        ...(bad.length ? { where: { rings: bad.flatMap(x => x.missRings.map(p => p[0])) }, fix: { id: 'szz-belt' as const, label: 'Daraxt-buta tasmasini ajratish', hint: `Turar joy tomonidagi ${needs} enli tasma «Himoya koʻkalamzorligi» parseli qilib ajratiladi. Binolar oʻchirilmaydi — tasmaga tushganlari izohda aytiladi.` } } : {}),
        note: parts.join(' ') };
    },
  },
  // 02.11: ishlab chiqarish zonalari (logistika, sanoat, kommunal, transport) — ShNQ 2.07.01-23, 146, 147, 174
  {
    id: 'prod-146',
    title: 'Ishlab chiqarish zonasi SMZ ichida turar joy va ijtimoiy binolar',
    source: { ...SHNQ_2_07_01, clause: '146-band; SMZ — SanQvaN 0103-25, 7-band, 1-ilova (umumiy ombor qatori yoʻq — talqin)' },
    evaluate(_d, doc) {
      const c = prodChecks(doc);
      if (!c.zones.length) return { status: 'na', unit: 'bino', limit: '0', note: 'Ishlab chiqarish zonasi (logistika, sanoat, kommunal, transport) yoʻq.' };
      if (!c.p146.length && !c.p146b.length) return { status: 'pass', value: 0, unit: 'bino', limit: '0', note: 'Ishlab chiqarish SMZ ichida turar joy va ijtimoiy bino yoʻq.' };
      // 04.11 (audit): jamoat binolari (poliklinika, maʼmuriy, savdo, ofis) va rekreatsiya hududi ham taqiq; «ofisga bering» maslahati olib tashlandi
      return { status: 'fail', value: c.p146.length + c.p146b.length, unit: 'bino', limit: '0', where: { bids: c.p146.map(x => x.bid), rings: [...c.zoneRings, ...c.p146b.flatMap(x => x.rings)] },
        note: `Ishlab chiqarish zonasi SMZ ichida ${c.p146.length} ta turar joy, ijtimoiy yoki jamoat binosi va ${c.p146b.length} ta park, sport yoki tomorqa hududi (146-band). Yechim: binoni SMZ dan chiqarish yoki SMZ qismini himoya koʻkalamzorligiga berish (avtoturargoh 0103-25, 14-band roʻyxatida yoʻq — koʻrib chiqish).` };
    },
  },
  {
    id: 'prod-147',
    title: 'Turar joy va ishlab chiqarish zonasi tutash',
    source: { ...SHNQ_2_07_01, clause: '147-band (aralash joylashtirish mumkin emas)' },
    evaluate(_d, doc) {
      const c = prodChecks(doc);
      if (!c.zones.length) return { status: 'na', unit: 'kvartal', limit: '0', note: 'Ishlab chiqarish zonasi yoʻq.' };
      if (!c.p147.length) return { status: 'pass', value: 0, unit: 'kvartal', limit: '0', note: 'Turar joy kvartallari ishlab chiqarish zonasidan koʻcha yoki yashil tasma bilan ajratilgan.' };
      return { status: 'fail', value: c.p147.length, unit: 'kvartal', limit: '0', where: { rings: c.zoneRings },
        note: `${c.p147.length} juft kvartal tutash: turar joy va ishlab chiqarish orasida koʻcha yoki yashil tasma yoʻq (oraliq 6 m dan kam). Yechim: oraliqqa koʻcha yoki koʻkalamzor tasma.` };
    },
  },
  {
    id: 'logi-174',
    title: 'Logistika — tashqi yoʻl yoki temir yoʻl yonida',
    source: { ...SHNQ_2_07_01, clause: '174-band (omborlar — transport tugunlari, tashqi avtomobil va temir yoʻl yonida); masofa — andoza' },
    evaluate(_d, doc) {
      const c = prodChecks(doc), lg = c.zones.filter(z => z.use === 'logistika');
      if (!lg.length) return { status: 'na', unit: 'kvartal', limit: '0', note: 'Logistika zonasi yoʻq.' };
      if (!c.p174.length) return { status: 'pass', value: 0, unit: 'kvartal', limit: '0', note: 'Logistika zonalari magistral koʻcha yoki temir yoʻl yonida.' };
      return { status: 'review', value: c.p174.length, unit: 'kvartal', limit: '0',
        note: `${c.p174.length} ta logistika zonasi magistral koʻcha yoki temir yoʻldan uzoq (yuk terminali — temir yoʻldan ≤ 150 m, qolganlari ≤ 300 m; masofa — andoza). Magistral koʻcha loyiha koʻchalari va kiritilgan temir yoʻl boʻyicha tekshiriladi.` };
    },
  },
];

/** Oʻzbekiston meʼyoriy hujjati (ShNQ, QMQ, SanQvaN, OʻRQ, Toshkent dizayn-kodi …) */
export const isUzDoc = (doc: string): boolean => /ShNQ|QMQ|SanQvaN|SanPiN RUz|VMQ №|KMK|OʻRQ|O'RQ|Toshkent|Oʻz|Vazirlar Mahkamasi/i.test(doc);
/**
 * 33-band (egasi, 24.10: «hududga qarab»): loyiha Oʻzbekistondan tashqarida boʻlsa, Oʻzbekiston meʼyori u yerda
 * majburiy emas — «mos emas» natijasi «andoza (koʻrib chiqish)» ga aylanadi, izohda aytiladi; qiymat va chegara saqlanadi.
 * Mahalliy meʼyorlar profili ulanganda (xalqaro → NYC/NL → RU/KZ) shu yerda almashtiriladi.
 */
export function abroadRules(rs: Result[], norms: 'UZ' | 'intl'): Result[] {
  if (norms === 'UZ') return rs;
  return rs.map(r => !isUzDoc(r.source.doc) ? r : { ...r, status: r.status === 'fail' ? 'review' : r.status, note: `${ABROAD_NOTE}${r.note ? '\n' + r.note : ''}` });
}
export const ABROAD_NOTE = 'Andoza: Oʻzbekiston meʼyori — bu hududda majburiy emas.';

export function evaluateAll(d: Derived, doc: Project, rules: Rule[] = RULES): Result[] {
  return rules.map(r => ({ id: r.id, title: r.title, source: r.source, ...r.evaluate(d, doc) }));
}
