/**
 * Hosilaviy koʻrsatkichlar — hujjatdan har safar qayta hisoblanadi, hech qayerda saqlanmaydi.
 * Aholi soni FAQAT shu yerda, bitta formula bilan hisoblanadi; maktab, MTM, yashillik va boshqa
 * ehtiyojlar keyingi bosqichlarda aynan shu sondan olinadi (KZ hujjatlaridagi «5 xil aholi» xatosi shu bilan yopiladi).
 */
import { parkingNeed } from './parking';
import type { Project } from './doc';
import { frame, polyArea, ringLocal, area, longFacadeAzimuths, obb2, type XY } from './geo';
import { computePlan } from './plan';
import { useDef } from './uses';
import { planApartments } from './apartments';
import { jobsFrom } from './jobs';
import { tieredGfa } from './tiers';
import { landscape, greenBalance, PLAY_NORM } from './landscape';
import polygonClipping, { type Polygon } from 'polygon-clipping';

export interface Derived {
  /** uchastka maydoni, ga (teshiklar ayirilgan) */
  siteHa: number;
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
  /** UMN / FAR = GFA / uchastka */
  far: number;
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
  /** turar joy binolariga oʻrnatilgan MTM oʻrinlari (543-band, 29 m²/oʻrin) */
  mtmBuiltIn: number;
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
}

/** 41-jadval: oʻquvchiga 20 m² (≤ 660), 15 m² (661–989), 10 m² (> 989) → maydonga sigʻadigan eng koʻp oʻquvchi */
export function schoolCapacity(a: number): number {
  if (a / 10 > 989) return Math.floor(a / 10);
  if (a / 15 > 660) return Math.min(989, Math.floor(a / 15));
  return Math.min(660, Math.floor(a / 20));
}
/** 543-band: oʻringa 40 m² (≤ 100 oʻrin), 35 m² (> 100) */
export function mtmCapacity(a: number): number { return a / 35 > 100 ? Math.floor(a / 35) : Math.min(100, Math.floor(a / 40)); }
/** 41-jadval / 543-band pogʻonasi: yuqori pogʻonaga oʻtish uchun kerakli uchastka maydoni va undagi sigʻim (null — eng yuqori pogʻonada) */
export function nextTier(use: 'maktab' | 'mtm', a: number): { area: number; cap: number } | null {
  const need = use === 'maktab' ? 990 * 10 : 101 * 35;
  return a < need ? { area: need, cap: use === 'maktab' ? 990 : 101 } : null;
}
/** turar joy binosiga oʻrnatilgan MTM: 1-qavat oyoq izining 80 % i, 12 m²/oʻrin (TAXMIN, SOCIAL.mtm.m2) */
export const builtInMtm = (footprintM2: number): number => Math.floor(footprintM2 * 0.8 / 12);


export function derive(doc: Project): Derived {
  const fr = frame(doc.origin);
  const siteM2 = doc.site ? polyArea(doc.site.rings.map(r => ringLocal(fr, r))) : 0;
  let footprint = 0, gfa = 0, resGfa = 0, greenRoof = 0, solarRoof = 0; const gfaByUse: Record<string, number> = {};
  for (const b of doc.buildings) {
    const r = ringLocal(fr, b.footprint), a = area(r);
    if (!b.z0) footprint += a; // stilobat ustidagi seksiyalar dogʻi stilobatniki ichida — ikki marta sanalmaydi
    // cheginishlar (terrasalar) boʻlsa — oʻrtacha qavat maydoni kamayadi; turar/noturar ulushi shu nisbatda
    const g = b.tiers?.length ? tieredGfa(r, b.floors, b.tiers) : a * b.floors, k = g / (a * b.floors || 1);
    gfa += g;
    if (b.roof === 'yashil') greenRoof += a; if (b.roof === 'quyosh') solarRoof += a;
    resGfa += k * a * Math.max(0, b.floors - b.nonRes) * useDef(b.use).res;
    const nonResGfa = g - k * a * Math.max(0, b.floors - b.nonRes) * useDef(b.use).res;
    gfaByUse[b.use] = (gfaByUse[b.use] ?? 0) + nonResGfa;
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
  const mtmBuiltIn = doc.buildings.filter(b => b.mtm && b.nonRes >= 1 && useDef(b.use).res > 0).reduce((t, b) => t + builtInMtm(area(ringLocal(fr, b.footprint))), 0);
  const mtmCap = plan.blocks.filter(b => b.use === 'mtm').reduce((t, b) => t + mtmCapacity(b.area), 0) + mtmBuiltIn;
  const socialPlots = plan.blocks.filter(b => b.use === 'maktab' || b.use === 'mtm').map(b => ({ use: b.use as 'maktab' | 'mtm', area: b.area }));
  // 29-jadval (Toshkent): kvartiraga 1; maʼmuriy — har 10 m²; savdo (> 200 m² savdo maydoni) — har 10 m² savdo maydoni (≈ 0,7·GFA); maktab, MTM — 25 ga 1; park — har 0,05 ga
  const trade = ((gfaByUse.savdo ?? 0) + (gfaByUse.aralash ?? 0) + (gfaByUse.turar ?? 0)) * 0.7;
  const parkingParts = parkingNeed({ apartments, ofisGfa: gfaByUse.ofis ?? 0, tradeArea: trade, school: schoolCap, mtm: mtmCap, greenArea });
  const parkingReq = Object.values(parkingParts).reduce((a, b) => a + b, 0);
  const parkingProv = Math.floor((zoneArea.avtoturargoh ?? 0) / 25) + doc.garages.reduce((t, g) => t + g.spaces, 0);
  let resSections = 0, westFacing = 0; const westIds: string[] = [];
  for (const b of doc.buildings) {
    if (useDef(b.use).res <= 0 || b.gen?.kind === 'stilobat') continue;
    const r = ringLocal(fr, b.footprint), o = obb2(r);
    if (o.L < o.S * 1.25) continue; // kvadratga yaqin (villa, minora) — barcha tomonga derazalar, alohida baholanmaydi
    resSections++;
    if (longFacadeAzimuths(r).some(a => a >= 200 && a <= 290)) { westFacing++; westIds.push(b.id); }
  }
  const jobs = jobsFrom(gfaByUse);
  const yards = doc.settings.yards ? landscape(doc) : [], gb = greenBalance(doc, yards);
  const playNeed = population * (PLAY_NORM.bolalar + PLAY_NORM.kattalar + PLAY_NORM.sport + PLAY_NORM.xojalik), playGot = yards.reduce((t, y) => t + y.areas.play, 0);
  return {
    resSections, westFacing, westIds, greenRoof, solarRoof, jobs, yardGreen: gb.yardGreen, yardPlay: gb.yardPlay, greenCounted: gb.counted, greenBase: gb.base, greenShareTotal: gb.share, yardTrees: gb.trees, playNeed, playGot, jobsRatio: population > 0 ? jobs / population : 0,
    apartments, aptSource, redLineSocial, schoolCap, mtmCap, mtmBuiltIn, socialPlots, parkingReq, parkingProv, parkingParts,
    streetArea: plan.corridorArea, blocks: plan.blocks.length, zoneArea, greenArea, streetOverlap,
    greenPerPerson: population > 0 ? greenArea / population : 0, greenShare: siteM2 > 0 ? greenArea / siteM2 : 0,
    siteHa, buildings: doc.buildings.length, footprint, gfa, resGfa, resNet, population,
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
