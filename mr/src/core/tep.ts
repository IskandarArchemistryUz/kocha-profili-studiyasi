/**
 * Texnik-iqtisodiy koʻrsatkichlar (TEP) — yagona roʻyxat: PDF hisobot ham, Excel ham shundan.
 * Barcha qiymatlar derive.ts dan (aholi bitta formula bilan); bu yerda faqat tartib, nom va birlik.
 */
import type { Derived } from './derive';
import type { Project } from './doc';
import { frame, area } from './geo';
import { useDef } from './uses';
import type { CompResult } from './compensation';

export interface TepRow { g: string; name: string; unit: string; v: number | string | null; note?: string }
export interface Demolition { gone: number; kept: number; foot: number; floorArea: number }

export function tepRows(d: Derived, doc: Project, demo?: Demolition | null, extra?: { apts?: number; aptOk?: number; svc?: { name: string; r: number; share: number }[]; comp?: CompResult; regime?: string; priceSource?: string }): TepRow[] {
  const s = doc.settings, R: TepRow[] = [], add = (g: string, name: string, unit: string, v: TepRow['v'], note?: string) => R.push({ g, name, unit, v, ...(note ? { note } : {}) });
  add('Hudud', 'Uchastka maydoni', 'ga', d.siteHa);
  add('Hudud', 'Koʻchalar (qizil chiziqlar orasi)', 'm²', d.streetArea);
  add('Hudud', 'Kvartallar va parsellar', 'ta', d.blocks);
  for (const [u, a] of Object.entries(d.zoneArea).sort((x, y) => y[1] - x[1])) add('Hudud', `— ${useDef(u).name}`, 'm²', a);
  add('Qurilish', 'Binolar (seksiyalar) soni', 'ta', d.buildings);
  add('Qurilish', 'Qurilish dogʻi', 'm²', d.footprint);
  add('Qurilish', 'Qurilish zichligi (GSI)', '%', d.gsi * 100);
  add('Qurilish', 'Umumiy qavatlar maydoni (GFA, yer usti)', 'm²', d.gfa);
  add('Qurilish', 'UMN (FAR)', '', d.far);
  add('Qurilish', 'Oʻrtacha qavatlar', 'qavat', d.avgFloors);
  add('Qurilish', 'Turar joy GFA', 'm²', d.resGfa);
  add('Qurilish', 'Noturar GFA', 'm²', d.gfa - d.resGfa);
  add('Turar joy', 'Kvartiralar umumiy maydoni (netto)', 'm²', d.resNet, `GFA × ${s.netToGross}`);
  add('Turar joy', 'Kvartiralar soni', 'ta', Math.round(d.apartments), d.aptSource === 'sxema' ? `kvartira sxemasi (miks ${s.aptMix.join('/')} %)` : `oʻrtacha ${s.aptNet} m² boʻyicha taxmin`);
  if (d.apartments > 0) add('Turar joy', 'Oʻrtacha kvartira (netto)', 'm²', d.resNet / d.apartments);
  if (extra?.aptOk != null && extra.apts) add('Turar joy', 'Insolyatsiya va yoʻnalish talabiga mos kvartiralar', '%', extra.aptOk / extra.apts * 100, 'SanQvaN 0331-16, 8.3–8.5, 9.2');
  add('Turar joy', 'Aholi', 'kishi', Math.round(d.population), `${s.m2PerPerson} m²/kishi`);
  add('Turar joy', 'Aholi zichligi', 'kishi/ga', d.density, 'ShNQ 2.07.01-23, 84-band: ≤ 400');
  add('Turar joy', 'Uy-joy fondi zichligi', 'm²/ga', d.housingDensity, '82-band, 3-jadval');
  add('Iqtisod', 'Ish oʻrinlari (taxmin)', 'ta', Math.round(d.jobs), 'noturar GFA ÷ bandlik zichligi (core/jobs.ts)');
  if (d.population > 0) add('Iqtisod', 'Ish oʻrinlari aholiga nisbati', '', d.jobsRatio, '1,0 dan past — yotoqxona tuman');
  add('Ijtimoiy', 'Maktab oʻrinlari (parsellar sigʻimi)', 'oʻrin', d.schoolCap, `talab ≥ ${Math.ceil(d.population * 0.165)} (5-ilova)`);
  add('Ijtimoiy', 'MTM oʻrinlari (parsellar sigʻimi)', 'oʻrin', d.mtmCap, `talab ≥ ${Math.ceil(d.population * 0.07)} (5-ilova)`);
  add('Yashil', 'Yashil zonalar', 'm²', d.greenArea);
  add('Yashil', 'Yashil zona, kishi boshiga', 'm²/kishi', d.greenPerPerson);
  add('Transport', 'Avtoturargoh talabi', 'joy', d.parkingReq, '416-band, 29-jadval');
  add('Transport', 'Avtoturargoh taʼminoti', 'joy', d.parkingProv);
  for (const x of extra?.svc ?? []) add('Xizmatlar', `${x.name} — ${x.r} m radiusda aholi`, '%', x.share * 100, '539-band, 38-jadval');
  if (demo) {
    add('Buzish', 'Buziladigan mavjud binolar', 'ta', demo.gone);
    add('Buzish', 'Buziladigan binolar dogʻi', 'm²', demo.foot);
    add('Buzish', 'Buziladigan binolar qavatlar maydoni (taxmin)', 'm²', demo.floorArea, 'OSM balandligi ÷ 3,2 m');
    add('Buzish', 'Saqlanadigan mavjud binolar', 'ta', demo.kept);
  }
  const c = extra?.comp;
  if (c) {
    const law = extra?.regime === 'orq1149' ? 'OʻRQ-1149 (renovatsiya)' : 'OʻRQ-781 (olib qoʻyish)';
    add('Koʻchirish', 'Koʻchiriladigan xonadonlar (taxmin)', 'ta', c.households);
    add('Koʻchirish', 'Bozor qiymati', '$', c.market, extra?.priceSource ? `narx: ${extra.priceSource}` : 'narx kiritilmagan');
    add('Koʻchirish', `Noqulaylik uchun ${c.pct} %`, '$', c.inconvenience, law);
    add('Koʻchirish', 'Ijara, koʻchish, boy berilgan foyda', '$', c.rent + c.moving + c.profit);
    add('Koʻchirish', 'Jami (dastlabki baho, baholovchi xulosasi emas)', '$', c.total, c.missing.length ? `narxi yoʻq: ${c.missing.join(', ')}` : undefined);
    if (d.gfa > 0) add('Koʻchirish', 'Jami, loyiha GFA ga', '$/m²', c.total / d.gfa);
    add('Koʻchirish', 'Qaytariladigan turar joy maydoni', 'm²', c.resArea, d.resNet > 0 ? `loyiha kvartiralarining ${Math.round(c.resArea / d.resNet * 100)} %` : undefined);
  }
  return R;
}

/** Binolar jadvali (Excel) */
export function buildingRows(doc: Project): (string | number)[][] {
  const fr = frame(doc.origin), fh = doc.settings.floorHeight;
  return doc.buildings.map((b, i) => {
    const a = area(b.footprint.map(fr.toLocal));
    return [i + 1, useDef(b.use).name, b.gen?.kind ?? 'qoʻlda', b.floors, b.nonRes, b.z0 ?? 0, Math.round(a * 10) / 10, Math.round(a * b.floors), Math.round(((b.z0 ?? 0) + b.floors) * fh * 10) / 10];
  });
}
export const BUILDING_HEAD = ['№', 'Funksiya', 'Turi', 'Qavatlar', 'Noturar qavatlar', 'Stilobat ustida (qavat)', 'Dogʻ, m²', 'GFA, m²', 'Balandlik, m'];
