/**
 * Hosilaviy koʻrsatkichlar — hujjatdan har safar qayta hisoblanadi, hech qayerda saqlanmaydi.
 * Aholi soni FAQAT shu yerda, bitta formula bilan hisoblanadi; maktab, MTM, yashillik va boshqa
 * ehtiyojlar keyingi bosqichlarda aynan shu sondan olinadi (KZ hujjatlaridagi «5 xil aholi» xatosi shu bilan yopiladi).
 */
import type { Project } from './doc';
import { frame, polyArea, ringLocal, area } from './geo';
import { computePlan } from './plan';

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
}

const RES_SHARE: Record<string, number> = { turar: 1, aralash: 0.7, ijtimoiy: 0, savdo: 0, yashil: 0, texnik: 0 };

export function derive(doc: Project): Derived {
  const fr = frame(doc.origin);
  const siteM2 = doc.site ? polyArea(doc.site.rings.map(r => ringLocal(fr, r))) : 0;
  let footprint = 0, gfa = 0, resGfa = 0;
  for (const b of doc.buildings) {
    const a = area(ringLocal(fr, b.footprint));
    footprint += a; gfa += a * b.floors;
    resGfa += a * Math.max(0, b.floors - b.nonRes) * (RES_SHARE[b.use] ?? 0);
  }
  const s = doc.settings;
  /* Taʼminot (m²/kishi) kvartiralar umumiy maydoniga nisbatan: kvartiralar maydoni = turar joy GFA × netto ulushi */
  const resNet = resGfa * s.netToGross;
  const population = s.m2PerPerson > 0 ? resNet / s.m2PerPerson : 0;
  const siteHa = siteM2 / 1e4;
  const plan = computePlan(doc), zoneArea: Record<string, number> = {};
  plan.blocks.forEach(b => { zoneArea[b.use] = (zoneArea[b.use] ?? 0) + b.area; });
  const greenArea = zoneArea.yashil ?? 0;
  return {
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
