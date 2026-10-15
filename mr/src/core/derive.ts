/**
 * Hosilaviy koʻrsatkichlar — hujjatdan har safar qayta hisoblanadi, hech qayerda saqlanmaydi.
 * Aholi soni FAQAT shu yerda, bitta formula bilan hisoblanadi; maktab, MTM, yashillik va boshqa
 * ehtiyojlar keyingi bosqichlarda aynan shu sondan olinadi (KZ hujjatlaridagi «5 xil aholi» xatosi shu bilan yopiladi).
 */
import type { Project } from './doc';
import { frame, polyArea, ringLocal, area, longFacadeAzimuths, obb2 } from './geo';
import { computePlan } from './plan';
import { useDef } from './uses';

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
  /** kvartiralar soni (turar joy netto ÷ oʻrtacha kvartira) */
  apartments: number;
  /** parsellar maydonidan kelib chiqadigan sigʻim: maktab (41-jadval), MTM (543-band) */
  schoolCap: number; mtmCap: number;
  /** avtoturargoh: talab (416-band, 29-jadval) va taʼminot (413-band, ochiq — 25 m²/joy) */
  parkingReq: number; parkingProv: number; parkingParts: Record<string, number>;
  /** turar joy seksiyalari va ulardan uzun fasadi gʻarbga (200–290°) qaraganlari — SanQvaN 0331-16, 9.2-band */
  resSections: number; westFacing: number;
}

/** 41-jadval: oʻquvchiga 20 m² (≤ 660), 15 m² (661–989), 10 m² (> 989) → maydonga sigʻadigan eng koʻp oʻquvchi */
export function schoolCapacity(a: number): number {
  if (a / 10 > 989) return Math.floor(a / 10);
  if (a / 15 > 660) return Math.min(989, Math.floor(a / 15));
  return Math.min(660, Math.floor(a / 20));
}
/** 543-band: oʻringa 40 m² (≤ 100 oʻrin), 35 m² (> 100) */
export function mtmCapacity(a: number): number { return a / 35 > 100 ? Math.floor(a / 35) : Math.min(100, Math.floor(a / 40)); }


export function derive(doc: Project): Derived {
  const fr = frame(doc.origin);
  const siteM2 = doc.site ? polyArea(doc.site.rings.map(r => ringLocal(fr, r))) : 0;
  let footprint = 0, gfa = 0, resGfa = 0; const gfaByUse: Record<string, number> = {};
  for (const b of doc.buildings) {
    const a = area(ringLocal(fr, b.footprint));
    if (!b.z0) footprint += a; // stilobat ustidagi seksiyalar dogʻi stilobatniki ichida — ikki marta sanalmaydi
    gfa += a * b.floors;
    resGfa += a * Math.max(0, b.floors - b.nonRes) * useDef(b.use).res;
    const nonResGfa = a * b.floors - a * Math.max(0, b.floors - b.nonRes) * useDef(b.use).res;
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
  const apartments = s.aptNet > 0 ? resNet / s.aptNet : 0;
  const schoolCap = plan.blocks.filter(b => b.use === 'maktab').reduce((t, b) => t + schoolCapacity(b.area), 0);
  const mtmCap = plan.blocks.filter(b => b.use === 'mtm').reduce((t, b) => t + mtmCapacity(b.area), 0);
  // 29-jadval (Toshkent): kvartiraga 1; maʼmuriy — har 10 m²; savdo (> 200 m² savdo maydoni) — har 10 m² savdo maydoni (≈ 0,7·GFA); maktab, MTM — 25 ga 1; park — har 0,05 ga
  const trade = ((gfaByUse.savdo ?? 0) + (gfaByUse.aralash ?? 0) + (gfaByUse.turar ?? 0)) * 0.7;
  const parkingParts: Record<string, number> = {
    kvartiralar: Math.ceil(apartments), ofis: Math.ceil((gfaByUse.ofis ?? 0) / 10), savdo: trade > 200 ? Math.ceil(trade / 10) : 0,
    maktab: Math.ceil(schoolCap / 25), mtm: Math.ceil(mtmCap / 25), park: Math.floor(greenArea / 500),
  };
  const parkingReq = Object.values(parkingParts).reduce((a, b) => a + b, 0);
  const parkingProv = Math.floor((zoneArea.avtoturargoh ?? 0) / 25) + doc.garages.reduce((t, g) => t + g.spaces, 0);
  let resSections = 0, westFacing = 0;
  for (const b of doc.buildings) {
    if (useDef(b.use).res <= 0 || b.gen?.kind === 'stilobat') continue;
    const r = ringLocal(fr, b.footprint), o = obb2(r);
    if (o.L < o.S * 1.25) continue; // kvadratga yaqin (villa, minora) — barcha tomonga derazalar, alohida baholanmaydi
    resSections++;
    if (longFacadeAzimuths(r).some(a => a >= 200 && a <= 290)) westFacing++;
  }
  return {
    resSections, westFacing,
    apartments, schoolCap, mtmCap, parkingReq, parkingProv, parkingParts,
    streetArea: plan.corridorArea, blocks: plan.blocks.length, zoneArea, greenArea,
    greenPerPerson: population > 0 ? greenArea / population : 0, greenShare: siteM2 > 0 ? greenArea / siteM2 : 0,
    siteHa, buildings: doc.buildings.length, footprint, gfa, resGfa, resNet, population,
    density: siteHa > 0 ? population / siteHa : 0,
    housingDensity: siteHa > 0 ? resNet / siteHa : 0,
    gsi: siteM2 > 0 ? footprint / siteM2 : 0,
    far: siteM2 > 0 ? gfa / siteM2 : 0,
    avgFloors: footprint > 0 ? gfa / footprint : 0,
  };
}
