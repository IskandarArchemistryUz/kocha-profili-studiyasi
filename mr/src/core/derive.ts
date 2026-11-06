/**
 * Hosilaviy koʻrsatkichlar — hujjatdan har safar qayta hisoblanadi, hech qayerda saqlanmaydi.
 * Aholi soni FAQAT shu yerda, bitta formula bilan hisoblanadi; maktab, MTM, yashillik va boshqa
 * ehtiyojlar keyingi bosqichlarda aynan shu sondan olinadi (KZ hujjatlaridagi «5 xil aholi» xatosi shu bilan yopiladi).
 */
import { parkingNeed, isTashkent } from './parking';
import { hasAntresol, ANTRESOL_SHARE } from './levels';
import type { Project } from './doc';
import { frame, polyArea, ringLocal, area, longFacadeAzimuths, obb2, type XY } from './geo';
import { computePlan } from './plan';
import { landBalance, type LandBalance } from './limits';
import { useDef, resShare } from './uses';
import { planApartments } from './apartments';
import { jobsFrom } from './jobs';
import { tieredGfa } from './tiers';
import { landscape, greenBalance, PLAY_NORM } from './landscape';
import polygonClipping, { type Polygon } from 'polygon-clipping';

export interface Derived {
  /** uchastka maydoni, ga (teshiklar ayirilgan) */
  siteHa: number;
  /** 02.11: yer balansi (cheklovlar boʻlsa): qurib boʻlmaydigan · SMZ · yaroqli, ga */
  balance: LandBalance | null;
  buildings: number;
  /** qurilish dogʻi, m² */
  footprint: number;
  /** umumiy qavatlar maydoni (yer usti), m² */
  gfa: number;
  /** turar joy GFA, m² (noturar pastki qavatlar ayirilgan) */
  resGfa: number;
  /** kvartiralar umumiy maydoni (netto), m² — uy-joy fondi */
  resNet: number;
  /** aholi, kishi */
  population: number;
  /** aholi zichligi, kishi/ga (uchastka boʻyicha) */
  density: number;
  /** uy-joy fondi zichligi, m²/ga */
  housingDensity: number;
  /** qurilish zichligi (GSI) = dogʻ / uchastka */
  gsi: number;
  /** FAR (brutto) = barcha binolar GFA / butun uchastka (koʻchalar bilan) */
  far: number;
  /** 04.11: UMN — ShNQ 2.07.01-23, 66-band: turar joy binosi yer usti qavatlari maydoni / unga ajratilgan uchastka (kvartal yoki parsel).
   *  Faqat turar joy binosi bor uchastkalar; aralash uchastkada butun GFA olinadi (TALQIN) */
  umnBlocks: { block: number; area: number; gfa: number; umn: number; bids: string[] }[];
  /** UMN uchastkalar boʻyicha: Σ GFA / Σ maydon (turar joy uchastkalari) */
  umn: number;
  /** 04.11 (audit): 82-band, 3-jadval — qavatlilik boʻyicha aralash chegara (4-izoh formulasi) va 3-izoh hisob hududi */
  housing82: { lo: number; hi: number; baseHa: number; v: number; mix: { cls: string; share: number }[] } | null;
  avgFloors: number;
  /** koʻchalar (qizil chiziqlar orasi) uchastka ichida, m² */
  streetArea: number;
  /** kvartallar soni va funksiya boʻyicha maydon, m² */
  blocks: number;
  zoneArea: Record<string, number>;
  /** yashil zona maydoni, m²; kishi boshiga va ulushi */
  greenArea: number;
  greenPerPerson: number;
  greenShare: number;
  /** kvartiralar soni: seksiyalar fasad modullari boʻyicha sxemadan (+ yakka uy / taunhaus — 1 xonadon); sxema yoʻq boʻlsa netto ÷ oʻrtacha kvartira */
  apartments: number;
  /** kvartiralar soni qayerdan: 'sxema' yoki 'taxmin' */
  aptSource: 'sxema' | 'taxmin';
  /** 39-jadval: maktab va MTM binolari devoridan qizil chiziqqacha masofa, m (faqat loyiha koʻchalari) */
  redLineSocial: { bid: string; use: string; d: number }[];
  /** loyiha koʻchasi koridoriga (qizil chiziqlar orasiga) tushgan binolar: kesishma maydoni va koʻpburchaklari (mahalliy XY) — koʻcha siljitilganda (30.10) */
  streetOverlap: { bid: string; area: number; polys: XY[][] }[];
  /** parsellar maydonidan kelib chiqadigan sigʻim: maktab (41-jadval), MTM (543-band) */
  schoolCap: number; mtmCap: number;
  /** turar joy binolariga oʻrnatilgan MTM oʻrinlari: bino 33 m²/oʻrin (5-ilova), hovli uchastkasi 29 m²/oʻrin sigʻgancha (543-band) */
  mtmBuiltIn: number;
  /** baland 1-qavatdagi antresollar maydoni, m² — GFA ga kiradi (ShNQ 2.08.02-23, 11-ilova, 1-band) */
  antresol: number;
  /** maktab va MTM parsellari maydoni, m² — meʼyor izohida keyingi pogʻona uchun */
  socialPlots: { use: 'maktab' | 'mtm'; area: number }[];
  /** avtoturargoh: talab (416-band, 29-jadval) va taʼminot (413-band, ochiq — 25 m²/joy) */
  parkingReq: number; parkingProv: number; parkingParts: Record<string, number>;
  /** turar joy seksiyalari va ulardan uzun fasadi gʻarbga (200–290°) qaraganlari — SanQvaN 0102-25, 15-band */
  resSections: number; westFacing: number; /** gʻarbga qaragan seksiyalar (sahnada koʻrsatish) */ westIds?: string[];
  /** ish oʻrinlari (taxmin, core/jobs.ts) va aholiga nisbati */
  jobs: number; jobsRatio: number;
  /** yashil va quyosh panelli tomlar maydoni, m² */
  greenRoof: number; solarRoof: number;
  /** hovli obodonlashtirish va yashillik balansi (core/landscape.ts) */
  yardGreen: number; yardPlay: number; greenCounted: number; greenBase: number; greenShareTotal: number; yardTrees: number;
  /** 4-jadval maydonchalari: talab va joylashtirilgan, m² */
  playNeed: number; playGot: number;
  /** 05.11: 90-band qisqartirishidan oldingi talab; stilobat tomidagi maydonchalar (92-band); birlashtirilgan maydonchalar (91-band) soni va 150 m² dan kichiklari */
  playNeed0: number; playRoof: number; playComb: number; playCombSmall: number;
}

/** 41-jadval: oʻquvchiga 20 m² (40–660), 15 m² (661–989), 10 m² (> 989) → maydonga sigʻadigan eng koʻp oʻquvchi.
 *  04.11 (audit, «norma boʻyicha»): har pogʻona oʻz chegarasida tekshiriladi — N oʻquvchi uchun talab N·m(N) ≤ maydon.
 *  Jadval oʻzi uzilishli: 9 899 m² → 494 oʻrin (20 m²), 9 900 m² → 990 (10 m²); 15 m² pogʻonasi hech qachon eng katta sigʻim bermaydi */
export function schoolCapacity(a: number): number {
  let c = 0;
  if (a / 10 >= 990) c = Math.floor(a / 10);
  if (a / 15 >= 661) c = Math.max(c, Math.min(989, Math.floor(a / 15)));
  if (a / 20 >= 40) c = Math.max(c, Math.min(660, Math.floor(a / 20)));
  return c;
}
/** 543-band: oʻringa 40 m² (≤ 100 oʻrin), 35 m² (> 100) — har pogʻona oʻz chegarasida */
export function mtmCapacity(a: number): number { return a / 35 >= 101 ? Math.floor(a / 35) : Math.min(100, Math.floor(a / 40)); }
/** 41-jadval / 543-band pogʻonasi: yuqori pogʻonaga oʻtish uchun kerakli uchastka maydoni va undagi sigʻim (null — eng yuqori pogʻonada) */
export function nextTier(use: 'maktab' | 'mtm', a: number): { area: number; cap: number } | null {
  const need = use === 'maktab' ? 990 * 10 : 101 * 35;
  return a < need ? { area: need, cap: use === 'maktab' ? 990 : 101 } : null;
}
/** 04.11 (audit): turar joy binosiga oʻrnatilgan MTM — 1-qavat maydoni ÷ 33 m²/oʻrin (5-ilova, binoning hisobiy maydoni 1 oʻringa);
 *  avvalgi 12 m² — 543-banddagi yakka uylar uchastkasi raqami edi */
export const MTM_BLD_M2 = 33, MTM_PLOT_BUILTIN = 29;
export const builtInMtm = (footprintM2: number): number => Math.floor(footprintM2 / MTM_BLD_M2);


export function derive(doc: Project): Derived {
  const fr = frame(doc.origin);
  const siteM2 = doc.site ? polyArea(doc.site.rings.map(r => ringLocal(fr, r))) : 0;
  let footprint = 0, gfa = 0, resGfa = 0, greenRoof = 0, solarRoof = 0; const gfaByUse: Record<string, number> = {}, tradeAreas: number[] = [];
  for (const b of doc.buildings) {
    const r = ringLocal(fr, b.footprint), a = area(r);
    // stilobat ustidagi seksiyalar dogʻi stilobatniki ichida — ikki marta sanalmaydi. 04.11: arka (bino ostidan oʻtish) dogʻga kiradi —
    // ShNQ 2.08.01-24, 1-ilova, 10-band: «… bino ostidan oʻtish joylarining maydoni»; ShNQ 2.08.02-23, 11-ilova, 7-band
    if (!b.z0 || b.gen?.kind === 'arka') footprint += a;
    // cheginishlar (terrasalar) boʻlsa — oʻrtacha qavat maydoni kamayadi; turar/noturar ulushi shu nisbatda
    const g = b.tiers?.length ? tieredGfa(r, b.floors, b.tiers) : a * b.floors, k = g / (a * b.floors || 1);
    gfa += g;
    if (b.roof === 'yashil') greenRoof += a; if (b.roof === 'quyosh') solarRoof += a;
    const rg = k * a * Math.max(0, b.floors - b.nonRes) * resShare(b.use, b.nonRes);
    resGfa += rg;
    const nonResGfa = g - rg;
    // 04.11 (audit): antresol binoning umumiy maydoniga kiradi — ShNQ 2.08.02-23, 11-ilova, 1-band («Антресоллар … ҳам бинонинг умумий
    // майдонига киритилиши керак»); ShNQ 2.08.01-24, 1-ilova, 8-band: ichki jamoat xonalari 2.08.02-23 boʻyicha hisoblanadi
    const ant = hasAntresol(doc.settings, b) ? a * ANTRESOL_SHARE : 0;
    gfa += ant;
    gfaByUse[b.use] = (gfaByUse[b.use] ?? 0) + nonResGfa + ant;
    // 29-jadval: «savdo maydoni 200 m² dan ziyod savdo markazlari» — har bino alohida (savdo maydoni ≈ 0,7·GFA, TAXMIN)
    if (b.use === 'savdo' || b.use === 'aralash' || b.use === 'turar') { const t = (nonResGfa + ant) * 0.7; if (t > 0) tradeAreas.push(t); }
  }
  const s = doc.settings;
  /* Taʼminot (m²/kishi) kvartiralar umumiy maydoniga nisbatan: kvartiralar maydoni = turar joy GFA × netto ulushi */
  const resNet = resGfa * s.netToGross;
  const population = s.m2PerPerson > 0 ? resNet / s.m2PerPerson : 0;
  const siteHa = siteM2 / 1e4;
  const plan = computePlan(doc), zoneArea: Record<string, number> = {};
  plan.blocks.forEach(b => { zoneArea[b.use] = (zoneArea[b.use] ?? 0) + b.area; });
  const greenArea = zoneArea.yashil ?? 0;
  // kvartiralar: sxemadan (har seksiya × turar qavat); yakka uy va taunhaus — har biri 1 xonadon
  const plans = planApartments(doc);
  const houses = doc.buildings.filter(b => (b.gen?.kind === 'uy' || b.gen?.kind === 'taunhaus') && useDef(b.use).res > 0).length;
  const fromPlan = plans.reduce((t, p) => t + p.layout.apts.length * (p.f1 - p.f0), 0) + houses;
  const aptSource: 'sxema' | 'taxmin' = fromPlan > 0 ? 'sxema' : 'taxmin';
  const apartments = fromPlan > 0 ? fromPlan : s.aptNet > 0 ? resNet / s.aptNet : 0;
  // 39-jadval: maktab/MTM binosi → qizil chiziq (loyiha koʻchalari koridorlari)
  const redLineSocial: Derived['redLineSocial'] = [];
  if (plan.corridors.length) for (const b of doc.buildings) {
    if (b.use !== 'maktab' && b.use !== 'mtm') continue;
    const r = ringLocal(fr, b.footprint); let d = Infinity;
    // 31.10: koridor koʻpburchagi teshikli (kvartallar — teshik): tashqi halqa ichida, lekin teshikda turgan bino — 0 emas, chegaragacha masofa
    for (const poly of plan.corridors) d = Math.min(d, polyDist(r, poly));
    redLineSocial.push({ bid: b.id, use: b.use, d });
  }
  // bino koʻcha koridorida (qizil chiziqlar ichida) — koʻcha siljitilganda qoʻlda chizilgan yoki qoldirilgan binolar
  const streetOverlap: Derived['streetOverlap'] = [];
  if (plan.corridors.length) for (const b of doc.buildings) {
    const r = ringLocal(fr, b.footprint), polys: XY[][] = []; let a = 0;
    for (const mp of plan.corridors) { let cut: Polygon[] = []; try { cut = polygonClipping.intersection([r] as Polygon, mp as Polygon) as Polygon[]; } catch { cut = []; } for (const poly of cut) for (const ring of poly) { const q = ring.map(p => [p[0], p[1]] as XY); const aa = Math.abs(area(q)); if (aa > 1) { polys.push(q); a += aa; } } }
    if (a > 1) streetOverlap.push({ bid: b.id, area: a, polys });
  }
  const schoolCap = plan.blocks.filter(b => b.use === 'maktab').reduce((t, b) => t + schoolCapacity(b.area), 0);
  // 543-band: oʻrnatilgan MTM uchun uchastka 29 m²/oʻrin — kvartal hovlisidan (kvartal − binolar dogʻi); sigʻmagan oʻrinlar sanalmaydi
  const inBl = (p: XY, k: { rings: XY[][] }) => { const inR2 = (q: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > q[1]) !== (r[j][1] > q[1]) && q[0] < (r[j][0] - r[i][0]) * (q[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; }; return inR2(p, k.rings[0]) && !k.rings.slice(1).some(h => inR2(p, h)); };
  const ctr = (r: XY[]): XY => [r.reduce((t, p) => t + p[0], 0) / r.length, r.reduce((t, p) => t + p[1], 0) / r.length];
  const mtmByBlock = new Map<number, number>(); let mtmBuiltIn = 0;
  for (const b of doc.buildings) {
    if (!(b.mtm && b.nonRes >= 1 && useDef(b.use).res > 0)) continue;
    const r = ringLocal(fr, b.footprint), n = builtInMtm(area(r)), bi = plan.blocks.findIndex(k => inBl(ctr(r), k));
    if (bi < 0) { mtmBuiltIn += n; continue; }
    mtmByBlock.set(bi, (mtmByBlock.get(bi) ?? 0) + n);
  }
  for (const [bi, n] of mtmByBlock) {
    const k = plan.blocks[bi], foot = doc.buildings.filter(b => !b.z0 || b.gen?.kind === 'arka').map(b => ringLocal(fr, b.footprint)).filter(r => inBl(ctr(r), k)).reduce((t, r) => t + area(r), 0);
    mtmBuiltIn += Math.min(n, Math.max(0, Math.floor((k.area - foot) / MTM_PLOT_BUILTIN)));
  }
  const mtmCap = plan.blocks.filter(b => b.use === 'mtm').reduce((t, b) => t + mtmCapacity(b.area), 0) + mtmBuiltIn;
  const antresol = doc.buildings.filter(b => hasAntresol(s, b)).reduce((t, b) => t + area(ringLocal(fr, b.footprint)) * ANTRESOL_SHARE, 0);
  const socialPlots = plan.blocks.filter(b => b.use === 'maktab' || b.use === 'mtm').map(b => ({ use: b.use as 'maktab' | 'mtm', area: b.area }));
  // 29-jadval (core/parking): koʻp qavatli turar joy — Toshkent shahri/viloyatida 10 kvartiraga 7 (01/2-42 tahriri), boshqa viloyatlarda 2 kvartiraga 1
  // (yakka uy va blokli uylar kirmaydi — oʻz uchastkasida); maʼmuriy/ofis — har 10 m²; savdo markazi > 200 m² — har bino alohida;
  // maktab, MTM — 25 ga 1; poliklinika, mehmonxona — 5 ga 1 (sigʻim GFA dan, ANDOZA); park — har 0,05 ga
  const parkingParts = parkingNeed({ apartments: Math.max(0, apartments - houses), tashkent: isTashkent(s.district), ofisGfa: (gfaByUse.ofis ?? 0) + (gfaByUse.mamuriy ?? 0), tradeAreas, school: schoolCap, mtm: mtmCap, greenArea, hotelGfa: gfaByUse.mehmonxona ?? 0, clinicGfa: gfaByUse.poliklinika ?? 0 });
  const parkingReq = Object.values(parkingParts).reduce((a, b) => a + b, 0);
  // 05.11: koʻp qavatli avtoturargoh turgan «Avtoturargoh» parseli ochiq (25 m²/joy) deb ikki marta hisoblanmaydi — joylar qavat rejalaridan
  const mlC = doc.garages.filter(g => g.kind === 'kop_qavatli').map(g => ctr(ringLocal(fr, g.ring)));
  const mlArea = plan.blocks.filter(k => k.use === 'avtoturargoh' && mlC.some(c => inBl(c, k))).reduce((t, k) => t + k.area, 0);
  const parkingProv = Math.floor(Math.max(0, (zoneArea.avtoturargoh ?? 0) - mlArea) / 25) + doc.garages.reduce((t, g) => t + (g.truck ? 0 : g.spaces), 0);   // yuk hovlisi tirkamalari — yengil avtomobil joyi emas
  let resSections = 0, westFacing = 0; const westIds: string[] = [];
  for (const b of doc.buildings) {
    if (useDef(b.use).res <= 0 || b.gen?.kind === 'stilobat') continue;
    const r = ringLocal(fr, b.footprint), o = obb2(r);
    if (o.L < o.S * 1.25) continue; // kvadratga yaqin (villa, minora) — barcha tomonga derazalar, alohida baholanmaydi
    resSections++;
    if (longFacadeAzimuths(r).some(a => a >= 200 && a <= 290)) { westFacing++; westIds.push(b.id); }
  }
  // 66-band UMN: bino markazi qaysi uchastkada boʻlsa — oʻsha uchastkaga (yer usti GFA, antresol bilan; tashqi oʻlcham — xavfsiz tomonga)
  const inR = (p: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
  const umnAcc = new Map<number, { gfa: number; res: boolean; bids: string[] }>();
  for (const b of doc.buildings) {
    if (b.floors <= 0) continue;
    // 05.11 (egasi: «qoida boʻyicha parkovka UMN ga kirishi kerakmi?»): 66-band — «турар жой биносининг умумий майдони (ерустидаги барча
    // қаватларнинг фойдали майдонлари йиғиндиси) … ер участкаси майдонига нисбати» — faqat turar joy binosi va uning yer usti qismi (stilobat);
    // alohida noturar binolar (koʻp qavatli avtoturargoh, ofis, savdo, maktab…) qoʻshilmaydi
    const isSt = b.gen?.kind === 'stilobat';
    if (useDef(b.use).res <= 0 && !isSt) continue;
    const r = ringLocal(fr, b.footprint), a = area(r), c: XY = [r.reduce((t, p) => t + p[0], 0) / r.length, r.reduce((t, p) => t + p[1], 0) / r.length];
    const bi = plan.blocks.findIndex(k => inR(c, k.rings[0]) && !k.rings.slice(1).some(h => inR(c, h)));
    if (bi < 0) continue;
    // stilobat avtoturargohi: pandus foydali maydonga kirmaydi (TALQIN: ShNQ 2.08.02-23, 11-ilova, 2-band) — pandus halqalari maʼlum boʻlsa ayiriladi
    const ramp = isSt && b.use === 'avtoturargoh' ? doc.garages.filter(q => q.kind === 'stilobat' && q.grp === b.gen?.grp).reduce((t, q) => t + (q.ramps ?? []).reduce((u, rr) => u + area(ringLocal(fr, rr)), 0) * q.levels, 0) : 0;
    const g = Math.max(0, (b.tiers?.length ? tieredGfa(r, b.floors, b.tiers) : a * b.floors) + (hasAntresol(s, b) ? a * ANTRESOL_SHARE : 0) - ramp);
    const e = umnAcc.get(bi) ?? { gfa: 0, res: false, bids: [] }; e.gfa += g; e.bids.push(b.id); if (useDef(b.use).res > 0 && b.gen?.kind !== 'stilobat') e.res = true; umnAcc.set(bi, e);
  }
  const umnBlocks: Derived['umnBlocks'] = [...umnAcc].filter(([, e]) => e.res && plan.blocks[0] != null).map(([bi, e]) => ({ block: bi, area: plan.blocks[bi].area, gfa: e.gfa, umn: plan.blocks[bi].area > 0 ? e.gfa / plan.blocks[bi].area : 0, bids: e.bids }));
  const umnA = umnBlocks.reduce((t, x) => t + x.area, 0), umn = umnA > 0 ? umnBlocks.reduce((t, x) => t + x.gfa, 0) / umnA : 0;
  // 82-band, 3-jadval: qavatlilik sinflari (ShNQ 2.07.01-23, atamalar: kam 1–3, oʻrta 4–9, koʻp 10–16, yuqori 17–24, baland ≥ 25);
  // tomorqali uylar — uchastka oʻlchami boʻyicha (0,02–0,04 ga — 1 800; 0,04–0,10 — 1 200; 0,10–0,15 — 1 000). 4-izoh: 100 / Σ(aᵢ / nᵢ)
  const H82: [string, number, number][] = [['1–3 qavat', 2200, 4200], ['4–9 qavat', 4200, 6000], ['10–16 qavat', 6000, 6700], ['17+ qavat', 6700, 7500]];
  const byCls = new Map<string, { a: number; lo: number; hi: number }>();
  for (const b of doc.buildings) {
    const u = useDef(b.use); if (u.res <= 0 || b.gen?.kind === 'stilobat') continue;
    const r = ringLocal(fr, b.footprint), a = area(r), rn = (b.tiers?.length ? tieredGfa(r, b.floors, b.tiers) / Math.max(1, b.floors) : a) * Math.max(0, b.floors - b.nonRes) * resShare(b.use, b.nonRes) * s.netToGross;
    if (rn <= 0) continue;
    let key: string, lo: number, hi: number;
    if (b.gen?.plot || b.use === 'yakka') { const pa = b.gen?.plot ? area(ringLocal(fr, b.gen.plot)) : 400; [key, lo, hi] = pa < 400 ? ['≤ 0,04 ga', 1800, 1800] : pa < 1000 ? ['0,04–0,10 ga', 1200, 1200] : ['0,10–0,15 ga', 1000, 1000]; }
    else { const fl = b.floors + (b.z0 ?? 0), row = fl <= 3 ? H82[0] : fl <= 9 ? H82[1] : fl <= 16 ? H82[2] : H82[3]; [key, lo, hi] = row; }
    const e = byCls.get(key) ?? { a: 0, lo, hi }; e.a += rn; byCls.set(key, e);
  }
  // 3-izoh: hisob hududi — turar joy, taʼlim, kundalik xizmat, koʻkalam va avtoturargohlar (koʻchalar bilan); tuman/shahar ahamiyatidagi obyektlar kirmaydi (TALQIN: ofis, mehmonxona, poliklinika, maʼmuriy, ishlab chiqarish, himoya)
  const NOT82 = new Set(['ofis', 'mehmonxona', 'poliklinika', 'mamuriy', 'logistika', 'sanoat', 'kommunal', 'transport', 'himoya']);
  const base82 = siteM2 - plan.blocks.filter(b => NOT82.has(b.use)).reduce((t, b) => t + b.area, 0);
  const tot82 = [...byCls.values()].reduce((t, e) => t + e.a, 0);
  const housing82: Derived['housing82'] = tot82 > 0 && base82 > 0 ? {
    lo: 1 / [...byCls.values()].reduce((t, e) => t + (e.a / tot82) / e.lo, 0), hi: 1 / [...byCls.values()].reduce((t, e) => t + (e.a / tot82) / e.hi, 0),
    baseHa: base82 / 1e4, v: resNet / (base82 / 1e4), mix: [...byCls].map(([cls, e]) => ({ cls, share: e.a / tot82 })),
  } : null;
  const jobs = jobsFrom(gfaByUse);
  const yards = doc.settings.yards ? landscape(doc) : [], gb = greenBalance(doc, yards);
  // 05.11: 90-band — sport majmuasi boʻlsa bolalar, kattalar, sport; chang boʻronli hududda yopiq inshoot boʻlsa xoʻjalik — ikki baravargacha (×0,5)
  const p90 = s.play90 ?? {}, kS = p90.sport ? 0.5 : 1, kD = p90.dust ? 0.5 : 1;
  const playNeed0 = population * (PLAY_NORM.bolalar + PLAY_NORM.kattalar + PLAY_NORM.sport + PLAY_NORM.xojalik);
  const playNeed = population * ((PLAY_NORM.bolalar + PLAY_NORM.kattalar + PLAY_NORM.sport) * kS + PLAY_NORM.xojalik * kD), playGot = yards.reduce((t, y) => t + (y.social ? 0 : y.areas.play), 0);
  const playRoof = yards.reduce((t, y) => t + (!y.social && y.z ? y.areas.play : 0), 0);
  const combs = yards.flatMap(y => y.social ? [] : y.play.filter(q => q.comb)), playComb = combs.length, playCombSmall = combs.filter(q => q.area < 150 - 0.5).length;   // maktab / MTM maydonchalari — 4-jadval talabiga kirmaydi
  return { antresol, umnBlocks, umn, housing82,
    resSections, westFacing, westIds, greenRoof, solarRoof, jobs, yardGreen: gb.yardGreen, yardPlay: gb.yardPlay, greenCounted: gb.counted, greenBase: gb.base, greenShareTotal: gb.share, yardTrees: gb.trees, playNeed, playGot, playNeed0, playRoof, playComb, playCombSmall, jobsRatio: population > 0 ? jobs / population : 0,
    apartments, aptSource, redLineSocial, schoolCap, mtmCap, mtmBuiltIn, socialPlots, parkingReq, parkingProv, parkingParts,
    streetArea: plan.corridorArea, blocks: plan.blocks.length, zoneArea, greenArea, streetOverlap,
    greenPerPerson: population > 0 ? greenArea / population : 0, greenShare: siteM2 > 0 ? greenArea / siteM2 : 0,
    siteHa, balance: doc.limits?.length ? landBalance(doc) : null, buildings: doc.buildings.length, footprint, gfa, resGfa, resNet, population,
    density: siteHa > 0 ? population / siteHa : 0,
    housingDensity: siteHa > 0 ? resNet / siteHa : 0,
    gsi: siteM2 > 0 ? footprint / siteM2 : 0,
    far: siteM2 > 0 ? gfa / siteM2 : 0,
    avgFloors: footprint > 0 ? gfa / footprint : 0,
  };
}

/** Ikki halqa orasidagi eng kichik masofa (kesishsa yoki biri ichida boʻlsa — 0) */
/** Bino halqasidan teshikli koʻpburchakkacha: bino koʻpburchak ichida (tashqi halqada va hech bir teshikda emas) — 0, aks holda barcha halqalar chegarasigacha */
export function polyDist(a: XY[], poly: XY[][]): number {
  const inside = (p: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
  const inPoly = (p: XY) => inside(p, poly[0]) && !poly.slice(1).some(h => inside(p, h));
  // 31.10: nuqta-koʻpburchak sinovi teshikli koridorlarda (worker) adashardi — 0 faqat haqiqiy kesishma (≥ 0,5 m²) boʻlsa
  if (a.some(inPoly)) { let ov = 0; try { for (const q of polygonClipping.intersection([[...a, a[0]]] as Polygon, poly.map(r => [...r, r[0]]) as Polygon)) ov += area(q[0].slice(0, -1) as XY[]) - q.slice(1).reduce((t, h) => t + area(h.slice(0, -1) as XY[]), 0); } catch { ov = 1; } if (ov >= 0.5) return 0; }
  const seg = (p: XY, q: XY, x: XY) => { const dx = q[0] - p[0], dy = q[1] - p[1], L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((x[0] - p[0]) * dx + (x[1] - p[1]) * dy) / L)) : 0; return Math.hypot(x[0] - p[0] - dx * t, x[1] - p[1] - dy * t); };
  let d = Infinity;
  for (const ring of poly) {
    for (let i = 0; i < a.length; i++) { const p = a[i], q = a[(i + 1) % a.length]; for (const x of ring) d = Math.min(d, seg(p, q, x)); }
    for (let i = 0; i < ring.length; i++) { const p = ring[i], q = ring[(i + 1) % ring.length]; for (const x of a) d = Math.min(d, seg(p, q, x)); }
  }
  return d;
}
export function ringDist(a: XY[], b: XY[]): number {
  const inside = (p: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
  if (a.some(p => inside(p, b)) || b.some(p => inside(p, a))) return 0;
  const seg = (p: XY, q: XY, x: XY) => { const dx = q[0] - p[0], dy = q[1] - p[1], L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((x[0] - p[0]) * dx + (x[1] - p[1]) * dy) / L)) : 0; return Math.hypot(x[0] - p[0] - dx * t, x[1] - p[1] - dy * t); };
  let d = Infinity;
  for (let i = 0; i < a.length; i++) { const p = a[i], q = a[(i + 1) % a.length]; for (const x of b) d = Math.min(d, seg(p, q, x)); }
  for (let i = 0; i < b.length; i++) { const p = b[i], q = b[(i + 1) % b.length]; for (const x of a) d = Math.min(d, seg(p, q, x)); }
  return d;
}
