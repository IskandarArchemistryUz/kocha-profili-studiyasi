/**
 * Meʼyorlar dvigateli: har bir band — maʼlumot yozuvi (manba, tahrir, chegara) + baholash funksiyasi.
 * Qoida qoʻshish yoki tahririni almashtirish ilovaning qolgan qismini oʻzgartirmaydi.
 * Qiymatlar loyihaning tekshirilgan hujjatlaridan (claude/archemistry-bloklar-va-normalar.md,
 * claude/abdurauf-fitrat-kz-normativ-audit.md); asl matn bilan solishtirilmaganlari `verified: false`.
 */
import type { Derived } from '../core/derive';
import type { Project } from '../core/doc';

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
