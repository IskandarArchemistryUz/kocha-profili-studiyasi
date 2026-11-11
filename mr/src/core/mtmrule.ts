/**
 * 06.11 (c62, egasi: «bogʻchada boʻsh yer gʻalati turibdi; qoida qanday — bino qancha qismni egallaydi, qavatliligi qanday»):
 * MTM uchastkasi tarkibi. Meʼyor (asl matn): 543-band — uchastka 40 / 35 m² oʻringa; 5-ilova (5-ustun) — bino 33 m² oʻringa;
 * QMQ 2.01.03-19, 3.1-jadval 2-izoh — 8–9 ballda bogʻcha 2 qavat bilan cheklanadi; 39-jadval — qizil chiziqdan 25 m.
 * ShNQ 2.07.01-23, 544-band (01/2-42 tahririda) MTM va hududini ShNQ 2.08.02-23 ga yuboradi (avval 2.08.02-09) — unda MTM guruh
 * maydonchalari va hududi boʻyicha talab yoʻq (c68 tekshiruvi), shuning uchun guruh hajmi, guruh maydonchasi, umumiy sport maydoni, xoʻjalik zonasi va koʻkalamzorlik ulushi — ANDOZA (MDH amaliyoti).
 */
export const MTM = {
  /** ANDOZA: bir guruhda bolalar soni */
  group: 20,
  /** ANDOZA: guruh oʻyin maydonchasi, m² (≈ 7,2 m²/bola) — har guruhga bittadan, soyabon bilan */
  play: 150,
  /** ANDOZA: soyabon (ayvon) — guruh maydonchasida, m */
  canopy: [6, 4] as [number, number],
  /** ANDOZA: umumiy jismoniy tarbiya maydoni, m² (har 150 oʻringa bittadan) */
  sport: 250,
  /** ANDOZA: xoʻjalik zonasi, m² */
  xojalik: 100,
  /** ANDOZA: uchastkani koʻkalamzorlashtirish ulushi */
  green: 0.5,
};
/** 5-ilova (5-ustun): MTM binosining hisobiy maydoni 1 oʻringa, m² */
export const MTM_M2 = 33;
export const mtmGroups = (cap: number): number => Math.max(1, Math.ceil(cap / MTM.group));

/**
 * 11.11 (c75, egasi: «maktab — bino boʻlmasa sigʻim 0; bino hajmi umumiy sigʻimdan normaga koʻra»): maktab binosi hajmi.
 * Meʼyor (asl matn): ShNQ 2.07.01-23 (joriy tahrir), 5-ilova, 5-ustun — umumiy oʻrta taʼlim tashkiloti binosining hisobiy maydoni
 * 24,0 m² 1 oʻringa (NORMA); 549-band, 41-jadval — uchastka 20 / 15 / 10 m² oʻquvchiga (40–660 / 661–989 / > 989; NORMA);
 * QMQ 2.01.03-19, 3.1-jadval 2-izoh — 8 va 9 ballda maktab ≤ 3 qavat, 9 balldan yuqori — ≤ 2 (NORMA). Seysmikligi 8 balldan past
 * hududda qavatlilik normada yoʻq (ShNQ 2.08.02-23 da maktab qavatliligi berilmagan) — 3 qavat (ANDOZA).
 */
export const SCHOOL_M2 = 24;
/** ANDOZA: seysmiklik < 8 ballda maktab qavatlari */
export const SCHOOL_FLOORS = 3;
/** 41-jadval: bir oʻquvchiga uchastka, m² */
export const schoolPlotPer = (cap: number): number => (cap > 989 ? 10 : cap > 660 ? 15 : 20);
export interface SchoolVolume { cap: number; gfa: number; floors: number; footprint: number; plot: number; per: number; floorsFlag: 'NORMA' | 'ANDOZA' }
/** Sigʻim → bino umumiy maydoni (5-ilova), qavatlar (QMQ 2.01.03-19 yoki ANDOZA), bino dogʻi, kerakli uchastka (41-jadval) */
export function schoolVolume(cap: number, ball: number, floors?: number): SchoolVolume {
  const lim = ball > 9 ? 2 : ball >= 8 ? 3 : null, f = Math.max(1, Math.min(floors ?? SCHOOL_FLOORS, lim ?? 4)), gfa = Math.max(0, cap) * SCHOOL_M2, per = schoolPlotPer(cap);
  return { cap, gfa, floors: f, footprint: gfa / f, plot: Math.max(0, cap) * per, per, floorsFlag: lim != null ? 'NORMA' : 'ANDOZA' };
}
