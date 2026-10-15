/**
 * Meʼyorlar dvigateli: har bir band — maʼlumot yozuvi (manba, tahrir, chegara) + baholash funksiyasi.
 * Qoida qoʻshish yoki tahririni almashtirish ilovaning qolgan qismini oʻzgartirmaydi.
 * Qiymatlar loyihaning tekshirilgan hujjatlaridan (claude/archemistry-bloklar-va-normalar.md,
 * claude/abdurauf-fitrat-kz-normativ-audit.md); asl matn bilan solishtirilmaganlari `verified: false`.
 */
import type { Derived } from '../core/derive';
import type { Project } from '../core/doc';
import { CATS, checkProfile, profileById } from '../core/profiles';
import { DEMO, demoRow, perThousand } from '../core/demography';

/** stat.uz boʻyicha haqiqiy yosh tarkibidan ehtiyoj (izoh uchun) */
function demoNote(doc: Project, pop: number, kind: 'school' | 'mtm'): string {
  const r = demoRow(doc.settings.district); if (!r) return '';
  const k = perThousand(r)[kind], need = Math.round(pop * k / 1000);
  return ` Haqiqiy yosh tarkibi (stat.uz, ${r.name}, ${DEMO.year}): ${kind === 'school' ? '7–17' : '3–6'} yoshlilar 1000 kishiga ${Math.round(k)} → loyiha aholisi uchun ≈ ${need} ${kind === 'school' ? 'oʻquvchi' : 'bola'} (100 % qamrov).`;
}

export type Status = 'pass' | 'fail' | 'review' | 'na';

export interface Source { doc: string; clause: string; edition: string; verified: boolean }

export interface Result {
  id: string; title: string; status: Status;
  value?: number; limit?: string; unit?: string;
  /** chegaradan chetlanish, % (musbat — oshib ketgan) */
  delta?: number;
  note?: string; source: Source;
}

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
      const lim = 400, v = d.density;
      return {
        status: v <= lim ? 'pass' : 'fail', value: v, unit: 'kishi/ga', limit: '≤ 400',
        delta: v > lim ? (v / lim - 1) * 100 : undefined,
        note: 'Uchastka (netto) boʻyicha hisoblandi; meʼyor brutto yoki netto ekani band matnidan tekshirilsin.',
      };
    },
  },
  {
    id: 'housing-82',
    title: 'Uy-joy fondi zichligi',
    source: { ...SHNQ_2_07_01, clause: '82-band, 3-jadval' },
    evaluate(d) {
      if (d.siteHa <= 0 || d.resNet <= 0) return { status: 'na', unit: 'm²/ga', limit: '2 200–7 500' };
      const lo = 2200, hi = 7500, v = d.housingDensity;
      return {
        status: v > hi ? 'fail' : v < lo ? 'review' : 'pass', value: v, unit: 'm²/ga', limit: '2 200–7 500',
        delta: v > hi ? (v / hi - 1) * 100 : undefined,
        note: v < lo ? 'Pastki chegaradan kam — yer samarasiz ishlatilmoqdami?' : 'Hududiy birlik (mavze, kvartal) band matnidan tekshirilsin.',
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
      return { status: d.schoolCap >= lo ? 'pass' : 'fail', value: d.schoolCap, unit: 'oʻrin', limit: `≥ ${lo}`, delta: d.schoolCap < lo ? (1 - d.schoolCap / lo) * -100 : undefined,
        note: `Talab ${lo}–${hi} oʻrin (1-navbat 165–280 / 1000). Sigʻim «Maktab» parsellari maydonidan 41-jadval boʻyicha (20/15/10 m² oʻquvchiga). Yaqin atrofdagi mavjud maktablar hisobga olinmagan.${demoNote(doc, d.population, 'school')}` };
    },
  },
  {
    id: 'mtm',
    title: 'MTM (bogʻcha) oʻrinlari',
    source: { ...SHNQ_2_07_01, clause: '5-ilova (70–125 oʻrin / 1000 kishi); 543-band (uchastka)' },
    evaluate(d, doc) {
      if (d.population <= 0) return { status: 'na', unit: 'oʻrin', note: 'Aholi yoʻq' };
      const lo = Math.ceil(d.population * 0.07), hi = Math.ceil(d.population * 0.125);
      return { status: d.mtmCap >= lo ? 'pass' : 'fail', value: d.mtmCap, unit: 'oʻrin', limit: `≥ ${lo}`, delta: d.mtmCap < lo ? (1 - d.mtmCap / lo) * -100 : undefined,
        note: `Talab ${lo}–${hi} oʻrin. Sigʻim «MTM» parsellari maydonidan (40 m² — 100 oʻringacha, 35 m² — undan ortiq).${demoNote(doc, d.population, 'mtm')}` };
    },
  },
  {
    id: 'parking',
    title: 'Avtoturargoh joylari',
    source: { ...SHNQ_2_07_01, clause: '416-band, 29-jadval; 413-band (ochiq — 25 m²/joy)' },
    evaluate(d, doc) {
      if (d.parkingReq <= 0) return { status: 'na', unit: 'joy', note: 'Talab yoʻq (binolar yoʻq)' };
      const parts = Object.entries(d.parkingParts).filter(([, v]) => v > 0).map(([k, v]) => `${k} ${v}`).join(', ');
      return { status: d.parkingProv >= d.parkingReq ? 'pass' : 'fail', value: d.parkingProv, unit: 'joy', limit: `≥ ${d.parkingReq}`,
        note: `Talab: ${parts} (Toshkent: kvartiraga 1). Taʼminot: «Avtoturargoh» parsellari (ochiq, 25 m²/joy, 413-band) + generator parkovkalari (yer osti/stilobat — 30 m²/joy brutto, taxmin). Kvartiralar soni oʻrtacha ${doc.settings.aptNet} m² (netto) boʻyicha taxmin.` };
    },
  },
  {
    id: 'west-facing',
    title: 'Yashash xonalari yoʻnalishi (gʻarb 200–290°)',
    source: { doc: 'SanQvaN 0331-16', edition: '2016', clause: '9.2, 9.4-bandlar', verified: true },
    evaluate(d) {
      if (!d.resSections) return { status: 'na', note: 'Choʻziq turar joy seksiyalari yoʻq' };
      return { status: d.westFacing ? 'review' : 'pass', value: d.westFacing, unit: `/ ${d.resSections} seksiya`, limit: '0',
        note: d.westFacing ? 'Bu seksiyalarning bir uzun fasadi gʻarbga qaraydi: yashash xonalari derazalari u tomonga qaratilmasligi kerak (istisno: 2 xonalida — 1 xona, 3 xonalida — ≤ 2 xona). Kvartira rejasida tekshiriladi (4-bosqich). Eng qulay — kenglik boʻylab joylashuv (9.4).' : 'Uzun fasadlar gʻarbiy sektorga qaramaydi.' };
    },
  },
  {
    id: 'green-per-person',
    title: 'Yashil hudud, kishi boshiga',
    source: { doc: 'ShNQ 2.07.01-23', edition: '2023', clause: 'band aniqlanmagan', verified: false },
    evaluate(d) {
      if (d.population <= 0) return { status: 'na', unit: 'm²/kishi', limit: '≥ 17', note: 'Turar joy binolari yoʻq' };
      const v = d.greenPerPerson, lim = 17;
      return {
        status: v >= lim ? 'pass' : 'review', value: v, unit: 'm²/kishi', limit: '≥ 17',
        note: '17–19 m²/kishi — Abdurauf Fitrat KZ hujjatidagi umumshahar yashillik normasi; bu loyiha ichidagi «yashil» zonalar bilan solishtirildi. Band va hisob birligi tekshirilsin.',
      };
    },
  },
];

export function evaluateAll(d: Derived, doc: Project, rules: Rule[] = RULES): Result[] {
  return rules.map(r => ({ id: r.id, title: r.title, source: r.source, ...r.evaluate(d, doc) }));
}
