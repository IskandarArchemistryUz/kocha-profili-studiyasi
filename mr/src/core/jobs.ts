/**
 * Ish oʻrinlari — noturar GFA ÷ bir ish oʻrniga toʻgʻri keladigan maydon.
 * TAXMIN: xalqaro amaliyotdagi bandlik zichligi (masalan, Homes and Communities Agency, «Employment Density Guide», 3-nashr, 2015;
 * u yerda qiymatlar netto maydonda — bu yerda umumiy maydon (GFA) ga keltirilgan va yaxlitlangan). Oʻzbekiston uchun meʼyor emas.
 */
export const JOB_M2: Record<string, number> = {
  ofis: 15, savdo: 30, mehmonxona: 60, maktab: 50, mtm: 45, poliklinika: 30, ijtimoiy: 40,
  // turar joy va aralash binolarning pastki noturar qavatlari — doʻkon, xizmat
  turar: 30, aralash: 30, yakka: 30, sport: 100, texnik: 200, avtoturargoh: 0, yashil: 0, maydon: 0,
};
export const JOBS_NOTE = 'Ish oʻrinlari — taxmin: noturar GFA ÷ bandlik zichligi (ofis 15, savdo va pastki qavat xizmatlari 30, poliklinika 30, ijtimoiy 40–50, mehmonxona 60 m² GFA/ish oʻrni; HCA Employment Density Guide 2015 asosida GFA ga keltirilgan).';

export function jobsFrom(gfaByUse: Record<string, number>): number {
  let j = 0;
  for (const [u, a] of Object.entries(gfaByUse)) { const m = JOB_M2[u] ?? 40; if (m > 0) j += a / m; }
  return j;
}
