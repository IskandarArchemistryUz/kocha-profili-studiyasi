/**
 * 14.11.2026 (egasi): xorijiy loyihada seysmiklik — foydalanuvchi ballni tanlaydi yoki PGA (g) kiritadi.
 * PGA → ball — taxminiy moslik (MSK-64): 7 ≈ 0,1 g, 8 ≈ 0,2 g, 9 ≈ 0,4 g; chegaralar — qoʻshni qiymatlarning geometrik oʻrtasi.
 * Mamlakat izohi — qaysi kattalik va (ishonchli maʼlum boʻlsa) qaysi meʼyor; meʼyor raqami nomaʼlum boʻlsa — faqat shkala turi.
 */
export function pgaToBall(g: number): number {
  if (!(g > 0)) return 6;
  return g < 0.07 ? 6 : g < 0.14 ? 7 : g < 0.28 ? 8 : g < 0.57 ? 9 : 10;
}

/** Shkala turi — tr() kaliti */
export type SeisScale = 'ball' | 'ag' | 'pga' | 'zona' | 'spektr';
export const SCALE_TXT: Record<SeisScale, string> = {
  ball: 'ball (MSK-64) — milliy seysmik xaritadan',
  ag: 'aₙ, g — milliy ilovadagi xaritadan; PGA maydoniga kiriting',
  pga: 'PGA, g — milliy xaritadan; PGA maydoniga kiriting',
  zona: 'seysmik zona — zonadagi tezlanishni (g) PGA maydoniga kiriting',
  spektr: 'spektral tezlanish — PGA (g) yoki ballni muhandis bilan aniqlang',
};

const EU = 'EN 1998-1 + milliy ilova';
export const SEIS_HINT: Record<string, { scale: SeisScale; code?: string }> = {
  RU: { scale: 'ball', code: 'SP 14.13330' }, KZ: { scale: 'ball', code: 'SP RK 2.03-30-2017' }, KG: { scale: 'ball' }, TJ: { scale: 'ball' },
  TM: { scale: 'ball' }, AZ: { scale: 'ball' }, AM: { scale: 'ball' }, GE: { scale: 'ball' }, MD: { scale: 'ball' }, BY: { scale: 'ball' }, UA: { scale: 'ball' },
  IT: { scale: 'ag', code: 'NTC 2018' }, GR: { scale: 'ag', code: EU }, RO: { scale: 'ag', code: 'P100-1' }, PT: { scale: 'ag', code: EU }, ES: { scale: 'ag', code: EU },
  FR: { scale: 'ag', code: EU }, DE: { scale: 'ag', code: EU }, AT: { scale: 'ag', code: EU }, CH: { scale: 'ag', code: 'SIA 261' }, BG: { scale: 'ag', code: EU },
  HR: { scale: 'ag', code: EU }, SI: { scale: 'ag', code: EU }, NL: { scale: 'ag', code: EU }, BE: { scale: 'ag', code: EU }, PL: { scale: 'ag', code: EU },
  CZ: { scale: 'ag', code: EU }, SK: { scale: 'ag', code: EU }, HU: { scale: 'ag', code: EU }, RS: { scale: 'ag', code: EU }, AL: { scale: 'ag', code: EU },
  CY: { scale: 'ag', code: EU }, GB: { scale: 'ag', code: EU }, IE: { scale: 'ag', code: EU },
  TR: { scale: 'pga', code: 'TBDY-2018' },
  CL: { scale: 'zona', code: 'NCh433' }, MX: { scale: 'zona', code: 'CFE MDOC' },
  US: { scale: 'spektr', code: 'ASCE 7' }, JP: { scale: 'spektr' }, CN: { scale: 'pga', code: 'GB 18306' },
};
