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
import { landscape } from '../core/landscape';
import { frame, type XY } from '../core/geo';
import { deadEnds } from '../core/streetends';
import { firePairs, FIRE_CLS } from '../core/firedist';
import { checkBlock, lenLimit, heightLimit, tallMax, socialFloorLimit, SYS, FIRE_COMP_ANDOZA, fireComp, isPodium, jointOpt, jointScheme } from '../core/seysmik';
import { area as areaOf, obb2 } from '../core/geo';
import { computePlan, corridor } from '../core/plan';
import { useDef } from '../core/uses';
import { edgeKinds, boundaryNeed, azOf } from '../core/setback';
import polygonClipping, { type Polygon } from 'polygon-clipping';
import { nextTier, schoolCapacity, mtmCapacity } from '../core/derive';
import { limitChecks, type SzzVerdict } from '../core/limitcheck';
import { prodChecks } from '../core/prodcheck';
import { isTashkent } from '../core/parking';
import { need413, T30, capCol, CAP_COL_NAME, pct5, ringDist, rampLen, ML } from '../core/mlpark';
import { szzGreen } from '../core/szzgen';
import { isActive } from '../core/limits';

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

/** Ikki koʻpburchak orasidagi eng qisqa kesma (uchdan qirragacha) */
function closestSeg(a: XY[], b: XY[]): [XY, XY] {
  let best: [XY, XY] = [a[0], b[0]], bd = Infinity;
  const proj = (p: XY, u: XY, v: XY): XY => { const dx = v[0] - u[0], dy = v[1] - u[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - u[0]) * dx + (p[1] - u[1]) * dy) / L2)); return [u[0] + dx * t, u[1] + dy * t]; };
  for (const [P, Q] of [[a, b], [b, a]] as [XY[], XY[]][]) for (const p of P) for (let i = 0; i < Q.length; i++) { const q = proj(p, Q[i], Q[(i + 1) % Q.length]), d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; best = P === a ? [p, q] : [q, p]; } }
  return best;
}

const nm = (v: number) => (Math.round(v * 10) / 10).toString().replace('.', ',');
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
export type FixId = 'parking' | 'mtm' | 'seismic-joint' | 'podium-joint' | 'floors-down' | 'yards-on' | 'street-clear' | 'dead-end';
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

const SHNQ_2_07_01: Omit<Source, 'clause'> = { doc: 'ShNQ 2.07.01-23', edition: '2023', verified: true };

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
        note: `Talab ${lo}–${hi} oʻrin. Sigʻim «MTM» parsellari maydonidan (40 m² — 100 oʻringacha, 35 m² — undan ortiq).${d.mtmBuiltIn ? ` Shundan ${d.mtmBuiltIn} oʻrin — turar joy binolarining 1-qavatida (543-band: uchastka 29 m²/oʻrin, hovlidan ajratiladi, sigʻmagani sanalmaydi; bino maydoni 33 m²/oʻrin — 5-ilova).` : ' Turar joy binosining 1-qavatiga oʻrnatish mumkin (543-band, 29 m²/oʻrin) — bino inspektorida «1-qavatda MTM».'}${tierNote(d, 'mtm')}${demoNote(doc, d.population, 'mtm')}` };
    },
  },
  {
    id: 'parking',
    title: 'Avtoturargoh joylari',
    source: { ...SHNQ_2_07_01, clause: '416-band, 29-jadval; 413-band (ochiq — 25 m²/joy)' },
    evaluate(d, doc) {
      if (d.parkingReq <= 0) return { status: 'na', unit: 'joy', note: 'Talab yoʻq (binolar yoʻq)' };
      const parts = Object.entries(d.parkingParts).filter(([, v]) => v > 0).map(([k, v]) => `${k} ${v}`).join(', ');
      const lack = d.parkingReq - d.parkingProv, reg = isTashkent(doc.settings.district) ? 'Toshkent shahri va viloyati: kvartiraga 1' : 'boshqa viloyatlar: 2 kvartiraga 1';
      return { status: d.parkingProv >= d.parkingReq ? 'pass' : 'fail', value: d.parkingProv, unit: 'joy', limit: `≥ ${d.parkingReq}`,
        ...(lack > 0 ? { fix: { id: 'parking' as const, label: 'Yer osti avtoturargoh qoʻshish', hint: `Yetishmaydi ${lack} joy (≈ ${Math.round(lack * 30 / 1000) / 10} ming m² — 30 m²/joy). Turar joy kvartallari hovlisi ostiga yer osti avtoturargoh qoʻshiladi, sathlar soni meʼyor boʻyicha (1–4) — kvartallar qayta generatsiya qilinadi. Boshqa yoʻllar: stilobat ichida yoki alohida koʻp qavatli avtoturargoh (parsel «Avtoturargoh»).` } } : {}),
        // tarjima kaliti: ichma-ich shablonsiz (i18n ${…} namunasi bilan mos kelsin)
        note: `Talab: ${parts} (${reg}). Taʼminot: «Avtoturargoh» parsellari (ochiq, 25 m²/joy, 413-band) + generator parkovkalari (yer osti/stilobat — 30 m²/joy brutto, taxmin). ${aptSrc(d, doc)}` + (mlSum(doc) ? `\nKoʻp qavatli avtoturargohlar: ${mlSum(doc)} joy — qavat rejalaridan (pandus, yoʻlak va zina-lift tugunlari chiqarilgan).` : '') };
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
    source: { ...SHNQ_2_07_01, clause: '418-band, 30-jadval' },
    evaluate(_d, doc) {
      const ml = mlOf(doc); if (!ml.length) return { status: 'na', note: 'Koʻp qavatli avtoturargoh yoʻq.' };
      const fr = frame(doc.origin), plan = computePlan(doc), fails: string[] = [], revs: string[] = []; const bids = new Set<string>();
      const PUB = new Set(['maktab', 'mtm', 'poliklinika', 'ijtimoiy', 'mamuriy', 'savdo', 'ofis', 'mehmonxona', 'sport', 'aralash']);
      for (const g of ml) {
        const r = g.ring.map(fr.toLocal), col = capCol(g.spaces), cn = CAP_COL_NAME[col];
        for (const b of doc.buildings) {
          if (b.gen?.grp === g.grp || b.use === 'avtoturargoh') continue;
          const u = useDef(b.use), d = ringDist(r, b.footprint.map(fr.toLocal)); if (d > 60) continue;
          if (u.res > 0) {
            const fN = T30.front[col]!, bN = T30.blind[col]!;
            if (d < Math.min(fN, bN) - 0.3) { fails.push(`turar joy ${Math.round(d)} m < ${Math.min(fN, bN)} m`); bids.add(b.id); }
            else if (d < fN - 0.3) { revs.push(`turar joy ${Math.round(d)} m: derazasiz yon tomoni boʻlsa ≥ ${bN} m yetadi, old tomoni — ${fN} m`); bids.add(b.id); }
          } else if (PUB.has(b.use)) { const n = T30.pub[col]!; if (d < n - 0.3) { fails.push(`jamoat binosi ${Math.round(d)} m < ${n} m`); bids.add(b.id); } }
        }
        // maktab va MTM hududlarigacha (territoriya chegarasi)
        for (const k of plan.blocks) {
          if (k.use !== 'maktab' && k.use !== 'mtm') continue;
          const d = ringDist(r, k.rings[0]); if (d > 80) continue; const n = T30.school[col];
          if (n == null) revs.push(`maktab/MTM hududi ${Math.round(d)} m — sigʻim ${cn}: jadvalda qiymat yoʻq («–»), sanitariya nazorati bilan kelishiladi`);
          else if (d < n - 0.3) fails.push(`maktab/MTM hududi ${Math.round(d)} m < ${n} m`);
        }
      }
      const cap = ml.map(g => `${g.spaces} joy → ${CAP_COL_NAME[capCol(g.spaces)]}`).join(', ');
      return { status: fails.length ? 'fail' : revs.length ? 'review' : 'pass', value: fails.length, unit: 'ta', limit: '0',
        ...(bids.size ? { where: { bids: [...bids] } } : {}),
        note: `Yer usti avtoturargohdan masofa: turar joy old tomoni 12/15/25/35/50 m, derazasiz yon tomoni 12/10/15/25/35 m, jamoat binolari 10/10/15/25/25 m, maktab va taʼlim hududi 15/25/25/50/– m (sigʻim ≤ 10, 11–50, 51–100, 101–300, > 300). Sigʻim: ${cap}.` + (fails.length ? `\nMos emas: ${fails.slice(0, 4).join('; ')}.` : '') + (revs.length ? `\nKoʻrib chiqish: ${revs.slice(0, 4).join('; ')}.` : '') };
    },
  },
  {
    id: 'park-411',
    title: 'Nogironlar va elektromobil joylari',
    source: { ...SHNQ_2_07_01, clause: '411–412-bandlar' },
    evaluate(_d, doc) {
      const ml = mlOf(doc); if (!ml.length) return { status: 'na', note: 'Koʻp qavatli avtoturargoh yoʻq.' };
      const n = mlSum(doc), inv = pct5(n), ev412 = doc.buildings.some(b => b.use === 'savdo' || b.use === 'mehmonxona');
      return { status: 'pass', value: inv, unit: 'joy', limit: `≥ ${inv}`,
        note: `411-band: nogironligi boʻlgan shaxslar uchun joylarning kamida 5 % (kamida 1): ${n} dan ${inv} joy — 1-qavatda, kirishga yaqin ajratiladi.` + (ev412 ? `\n412-band: loyihada savdo / mehmonxona bor — ularning avtoturargohida kamida 5 % (kamida 1) elektromobil quvvatlash joyi: ${pct5(n)} joy (TALQIN: koʻp qavatli avtoturargoh shu obyektlarga xizmat qiladi deb olindi).` : '\n412-band: elektromobil quvvatlash joylari savdo va biznes markazlari, mehmonxona va boshqa sanab oʻtilgan obyektlar avtoturargohlari uchun talab qilinadi — loyihada bunday obyekt yoʻq (TALQIN).') };
    },
  },
  {
    id: 'park-414',
    title: 'Avtoturargoh kirish-chiqishi va pandus',
    source: { ...SHNQ_2_07_01, clause: '414-band; pandus — ANDOZA (SP 113.13330.2016)', verified: false },
    evaluate(_d, doc) {
      const ml = mlOf(doc); if (!ml.length) return { status: 'na', note: 'Koʻp qavatli avtoturargoh yoʻq.' };
      return { status: 'review', unit: '', note: `414-band: kirish-chiqish joylari magistral koʻchalar chorrahasidan kamida 50 m, mahalliy koʻchalardan 20 m, jamoat transporti bekatidan 5 m — darvoza joyi loyihada aniqlanadi.\nPandus (ANDOZA — Oʻzbekiston normasi papkada yoʻq, SP 113.13330.2016 (RF) — taqqoslash uchun): qavat ${String(ML.floorH).replace('.', ',')} m, qiyalik ≤ 18 % (egri pandus ≤ 13 %), bir yoʻnalishli yoʻlak ≥ 3,5 m, uchlarida 3,6 m oʻtish uchastkalari — gorizontal uzunlik ${String(rampLen()).replace('.', ',')} m.` };
    },
  },
  {
    // 05.11 (egasi): yer osti avtoturargoh — chegarasi chekinishga bogʻlanmaydi; kirish-chiqish va shamollatish 15 m
    id: 'ug-park-415',
    title: 'Yer osti avtoturargoh: kirish-chiqish va shamollatish shaxtalari',
    source: { doc: 'ShNQ 2.07.01-23; SanPiN RUz № 0350-17', edition: '2023; 2017', clause: '415-band; 6.4.1-jadval, 8-izoh', verified: false },
    evaluate(_d, doc) {
      const ug = doc.garages.filter(g => g.kind === 'yer_osti'); if (!ug.length) return { status: 'na', note: 'Yer osti avtoturargoh yoʻq.' };
      return { status: 'review', unit: '', note: `Yer osti avtoturargohlar: ${ug.length} ta, ${ug.reduce((t, g) => t + g.spaces, 0)} joy. 415-band: kirish-chiqish joylari turar joy va jamoat binolari derazalaridan, taʼlim va davolash muassasalari hududlaridan kamida 15 m. SanPiN 0350-17, 6.4.1-jadval 8-izoh: kirish-chiqish va shamollatish shaxtalaridan maktab, MTM, davolash muassasalari, turar joy fasadlari va dam olish maydonchalarigacha kamida 15 m. Rampa va shaxtalar joyi modelda yoʻq — loyihada aniqlanadi.` };
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
    title: 'Turar joy zonasining yashil hududi (≥ 25 %)',
    source: { doc: 'ShNQ 2.07.01-23', edition: '2023', clause: '86, 87, 474-bandlar', verified: true },
    evaluate(d, doc) {
      if (d.greenBase <= 0) return { status: 'na', unit: '%', limit: '≥ 25' };
      const v = d.greenShareTotal * 100;
      // hovli obodonlashtirish oʻchiq — hovli maysasi hisobga kirmagan: «mos emas» emas, «koʻrib chiqish» (hisob toʻliq emas)
      const noYards = !doc.settings.yards && doc.buildings.length > 0;
      return { status: v >= 25 ? 'pass' : noYards ? 'review' : 'fail', value: v, unit: '%', limit: '≥ 25', delta: v < 25 ? (v / 25 - 1) * 100 : undefined,
        ...(noYards && v < 25 ? { fix: { id: 'yards-on' as const, label: 'Hovlilarni obodonlashtirish', hint: 'Hovlilar avtomatik obodonlashtiriladi (trotuar, maysa, 4-jadval maydonchalari, daraxtlar) — hovli maysasi va maydonchalar (87-band) hisobga kiradi.' } } : {}),
        note: (noYards ? 'Hovli maysasi hisobga olinmadi — «Hovlilarni avtomatik obodonlashtirish» oʻchiq (Yashil qadami).\n' : '') + `Hisob: yashil kvartallar ${Math.round(d.greenArea)} m² + hovli maysasi ${Math.round(d.yardGreen)} m² + maydoncha va yoʻlaklar ${Math.round(d.yardPlay)} m² (87-band: uchastkaning 30 % idan oshmasa) ÷ mavze maydoni (maktab va MTM uchastkalarisiz, 86-band) ${Math.round(d.greenBase)} m².` };
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
      const v = d.playNeed > 0 ? d.playGot / d.playNeed * 100 : 0;
      return { status: v >= 99 ? 'pass' : v >= 50 ? 'review' : 'fail', value: d.playGot, unit: 'm²', limit: `${Math.round(d.playNeed)} (3,1 m²/kishi)`,
        note: `Talab: bolalar 0,7 + kattalar 0,1 + sport 2,0 + xoʻjalik 0,3 m²/kishi; joylashtirilgan ${Math.round(v)} %. 90-band: chang boʻronli hududlarda yoki mavze sport majmuasi boʻlsa — ikki baravargacha qisqartirish mumkin; 92-band: zichlik > 7000 m²/ga — tomlarga joylashtirish.` };
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
        note: `${def.name} (${def.row}), ${bt} ball: balandlik va qavatlar soni — ${limTxt}. 8–9 ballda maktab ≤ 3, bogʻcha ≤ 2 qavat; 9 dan yuqori — ≤ 2 qavat (2-izoh).`
          + (tl.length ? ` ${tl.length} ta monolit bino jadval chegarasidan baland, lekin ≤ ${tm} m: ShNQ 2.01.06-25 (01/2-38, 15.08.2025) boʻyicha alohida seysmik hisob talab qilinadi — 70 m dan baland bino (2-bob) chiziqsiz hisob asosida; balandlik sinfi — 5-jadval (SLS 1–2: H ≤ 100 m).` : '')
          + (tm != null ? '' : ' ShNQ 2.01.06-25 (baland binolar) — monolit temir-beton uchun (6–7-jadvallar); bu tizimga qoʻllanmaydi.') };
    },
  },
  {
    id: 'fire-56',
    title: 'Binolar orasidagi yongʻinga qarshi masofa',
    source: { doc: 'ShNQ 2.07.01-23', edition: '2023', clause: '641, 642, 649, 652-bandlar, 56-jadval', verified: true },
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
          'Koʻr devorlar (648-band, −20 %) va avtomatik yongʻin oʻchirish (651-band, −50 % gacha) qoʻllanmadi — derazalar va jihozlar maʼlum emas.'].join(' ') };
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
  // 02.11, cheklovlar 3-bosqichi — asl matn: SanPiN RUz № 0350-17 (2.17, 2.20, 6.3, 6.4), VMQ № 1050 (14, 17), ShNQ 2.07.01-23 (251, 253)
  {
    id: 'szz-217',
    title: 'SMZ ichida taqiqlangan funksiya',
    source: { doc: 'SanPiN RUz № 0350-17', edition: '2017', clause: '2.17 (taqiq), 2.20 (ruxsat); SMZ — 6.3, 6.4; temir yoʻl — ShNQ 2.07.01-23, 359', verified: true },
    evaluate(_d, doc) {
      const c = limitChecks(doc);
      if (!c.any) return { status: 'na', unit: 'bino', limit: '0', note: 'Cheklov obyektlari kiritilmagan (1-qadam, «Mavjud holat va cheklovlar»).' };
      const ids = (v: SzzVerdict) => [...new Set(c.szz.filter(x => x.verdict === v).map(x => x.bid))];
      const deny = ids('deny'), rev = ids('review'), allow = ids('allow'), blk = [...new Set(c.szzBlocks.map(x => x.block))];
      if (!deny.length && !rev.length && !allow.length && !blk.length) return { status: 'pass', value: 0, unit: 'bino', limit: '0', note: 'SMZ ichida bino yoʻq.' };
      const show = deny.length ? deny : rev.length ? rev : allow;
      // 04.11 (audit): park, sport, tomorqa, maktab/MTM/poliklinika hududi ham (binosiz) tekshiriladi; poliklinika va oziq-ovqat ombori — taqiq
      return { status: deny.length || blk.length ? 'fail' : 'review', value: deny.length + blk.length, unit: 'bino', limit: '0', where: { bids: show, rings: [...c.zoneRings, ...c.szzBlocks.flatMap(x => x.rings)] },
        note: `SMZ ichida: taqiqlangan funksiyada ${deny.length} ta bino (2.17); roʻyxatlarda yoʻq funksiyada ${rev.length} ta — sanitariya nazorati bilan kelishiladi; ruxsat etilgan funksiyada ${allow.length} ta (2.20; qabriston uchun — talqin). Taqiqlangan hudud (park, sport, tomorqa, maktab, MTM, poliklinika uchastkasi) SMZ ga tushgan: ${blk.length} ta kvartal/parsel. Poliklinika (umumiy foydalanish) va oziq-ovqat omborlari — 2.17 taqiqi; korxonaga xizmat qiluvchi poliklinika (2.20) — qoʻlda kelishiladi.` };
    },
  },
  {
    id: 'elu-1050',
    title: 'ELU muhofaza zonasida bino',
    source: { doc: 'VMQ № 1050 (26.12.2018)', edition: '2018', clause: '14-band (zona), 17-band (bino — tarmoq egasining yozma roziligi); ≥ 330 kV — SanPiN 0350-17, 2.23.4', verified: true },
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
      const suv = (doc.limits ?? []).filter(l => l.kind === 'suv' && isActive(l));
      if (!suv.length) return { status: 'na', unit: 'bino', limit: '0', note: 'Suv obyekti kiritilmagan (1-qadam, «Mavjud holat va cheklovlar»).' };
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
    source: { doc: 'SanPiN RUz № 0350-17', edition: '2017', clause: '2.9 izohi (rekonstruksiyada belgilangan tartibda tuzatish); 6.4 izohi («′» belgili obyektlar — sanitariya nazorati xulosasi bilan 2 baravargacha)', verified: true },
    evaluate(_d, doc) {
      const c = limitChecks(doc);
      if (!c.any) return { status: 'na', unit: 'obyekt', limit: '0', note: 'Cheklov obyektlari kiritilmagan.' };
      if (!c.manual.length) return { status: 'pass', value: 0, unit: 'obyekt', limit: '0', note: 'Barcha zonalar jadvaldagi qiymatda (yoki kattaroq).' };
      const list = c.manual.map(x => `${x.m} m < ${x.table} m`).join(', ');
      return { status: 'review', value: c.manual.length, unit: 'obyekt', limit: '0',
        note: `Qoʻlda kamaytirilgan: ${list}. Davlat sanitariya nazoratining ijobiy xulosasi kerak; qabristonlar 6.4 dagi «′» belgili obyektlar qatorida emas.` };
    },
  },
  // 02.11, cheklovlar 3b — SanPiN RUz № 0350-17, 2.19 (asl matn): IV–V sinf ≥ 60 %, II–III ≥ 50 %, I ≥ 40 %; avtomagistral qatnov qismi foizni kamaytirmaydi
  {
    id: 'szz-219',
    title: 'SMZ koʻkalamzorligi',
    source: { doc: 'SanPiN RUz № 0350-17', edition: '2017', clause: '2.19 (IV–V sinf ≥ 60 %, II–III ≥ 50 %, I ≥ 40 %); ShNQ 2.07.01-23, 475 (maxsus maqsadli yashil)', verified: true },
    evaluate(_d, doc) {
      const z = szzGreen(doc);
      if (!z.length) return { status: 'na', unit: '%', limit: '≥ 60', note: 'Uchastka ichida SMZ yoʻq.' };
      const bad = z.filter(x => x.share + 1e-6 < x.need), worst = [...z].sort((a, b) => (a.share - a.need) - (b.share - b.need))[0];
      const pc = (v: number) => Math.round(v * 100);
      const list = z.map(x => `${x.cls}: ${pc(x.share)} % / ${pc(x.need)} %`).join("; ");
      return { status: bad.length ? 'fail' : 'pass', value: pc(worst.share), unit: '%', limit: `≥ ${pc(worst.need)}`, where: { rings: (bad.length ? bad : z).flatMap(x => x.rings) },
        note: bad.length ? `SMZ ning uchastka ichidagi qismida koʻkalam yetarli emas (${list}). Koʻcha koridorlari ham hisob maydonida (2.19: qatnov qismi foizni kamaytirmaydi). Yechim: SMZ qismini «Himoya koʻkalamzorligi (SMZ)» funksiyasiga bering (Parsellar → «SMZ chegarasi boʻyicha ajratish»). Koʻkalam — himoya koʻkalamzorligi va park kvartallari (talqin); qabriston SMZ i uchun qoʻllash — talqin.`
          : `SMZ koʻkalamzorligi yetarli (${list}).` };
    },
  },
  // 02.11: ishlab chiqarish zonalari (logistika, sanoat, kommunal, transport) — ShNQ 2.07.01-23, 146, 147, 174
  {
    id: 'prod-146',
    title: 'Ishlab chiqarish zonasi SMZ ichida turar joy va ijtimoiy binolar',
    source: { ...SHNQ_2_07_01, clause: '146-band; SMZ — SanPiN 0350-17, 6.3, 6.4 (omborlar uchun matnda yoʻq qiymat — andoza)' },
    evaluate(_d, doc) {
      const c = prodChecks(doc);
      if (!c.zones.length) return { status: 'na', unit: 'bino', limit: '0', note: 'Ishlab chiqarish zonasi (logistika, sanoat, kommunal, transport) yoʻq.' };
      if (!c.p146.length && !c.p146b.length) return { status: 'pass', value: 0, unit: 'bino', limit: '0', note: 'Ishlab chiqarish SMZ ichida turar joy va ijtimoiy bino yoʻq.' };
      // 04.11 (audit): jamoat binolari (poliklinika, maʼmuriy, savdo, ofis) va rekreatsiya hududi ham taqiq; «ofisga bering» maslahati olib tashlandi
      return { status: 'fail', value: c.p146.length + c.p146b.length, unit: 'bino', limit: '0', where: { bids: c.p146.map(x => x.bid), rings: [...c.zoneRings, ...c.p146b.flatMap(x => x.rings)] },
        note: `Ishlab chiqarish zonasi SMZ ichida ${c.p146.length} ta turar joy, ijtimoiy yoki jamoat binosi va ${c.p146b.length} ta park, sport yoki tomorqa hududi (146-band). Yechim: binoni SMZ dan chiqarish yoki SMZ qismini himoya koʻkalamzorligi yoki avtoturargohga berish.` };
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
