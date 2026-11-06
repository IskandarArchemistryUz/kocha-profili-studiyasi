/**
 * Ishlab chiqarish zonalari (02.11): logistika va ombor turlari, ularning SMZ andozasi va joylashuv qoidalari.
 *
 * Asl matn (egasining normalar papkasi):
 *  - ShNQ 2.07.01-23: 141, 144 (ishlab chiqarish zonasi tarkibi: kommunal-ombor, sanoat, texnopark), 146 (ishlab chiqarish zonasi va
 *    SMZ ichida turar joy, mehmonxona, yotoqxona, MTM, maktab, sport — yoʻq), 147 (turar joy va ishlab chiqarish zonalarini aralash
 *    joylashtirish mumkin emas), 173 (sabzavot-meva omborlari SMZ ≥ 50 m), 174 (aholiga kundalik xizmat bilan bogʻliq boʻlmagan omborlar —
 *    transport tugunlari, tashqi avtomobil va temir yoʻl yonida), 178 (kommunal-ombor zonasi: eng yirik va yirik shaharlarda 2 m²/kishi,
 *    boshqa shaharlarda 2,5 m²/kishi).
 *  - SanQvaN 0103-25 (SanPiN 0350-17 oʻrniga), 7-band va 1-ilova: 5-sinf (50 m) — 456 «don, meva va sabzavotlarni saqlash omborxonalari»,
 *    464 «meva va sabzavotlarni ulgurji saqlash joyi», 465 «past haroratda oziq-ovqat mahsulotlarini saqlash joyi (> 600 t)», 480 «qurilish
 *    (qum, tosh) materiallarini ortish-tushirish va ochiq joyda saqlash», 482 «oziq-ovqat … meva-sabzavotlarni ortish-tushirish va saqlash»;
 *    4-sinf (100 m) — 413 «shaharlararo yuk tashish uchun avtoturargohlar, bojxona terminallari», 419 «avtobus va troleybus parklari (300
 *    donagacha)», 425 «yoqilgʻi-moylash materiallari omborlari»; 3-sinf (300 m) — 299 «quruq qum, tosh va boshqa qurilish materiallari
 *    ortish-tushirish va ochiq joyda saqlash», 308 «avtovokzal», 309 «avtobus va trolleybus parklari, tramvay va metro depolari (taʼmirlash
 *    tarmogʻi bilan)». Umumtovar ombor (oziq-ovqatsiz) qatori 1-ilovada yoʻq — 5-sinf, TALQIN.
 * Matnda boʻlmagan qiymat — «ANDOZA».
 */
export type Flag = 'NORMA' | 'TALQIN' | 'ANDOZA';
export interface LogiType { id: string; name: string; szz: number; ref: string; flag: Flag; rail?: boolean }
export const LOGI: LogiType[] = [
  { id: 'tarqatish', name: 'Tarqatish markazi (umumtovar)', szz: 50, ref: 'SanQvaN 0103-25, 1-ilova, 5-sinf (umumtovar ombor qatori yoʻq)', flag: 'TALQIN' },
  { id: 'sovutgich', name: 'Sovutgichli ombor', szz: 50, ref: 'SanQvaN 0103-25, 1-ilova, 5-sinf, 465 (past haroratda, > 600 t), 482', flag: 'NORMA' },
  { id: 'sabzavot', name: 'Sabzavot-meva ombori', szz: 50, ref: 'ShNQ 2.07.01-23, 173; SanQvaN 0103-25, 1-ilova, 5-sinf, 456, 464', flag: 'NORMA' },
  { id: 'krossdok', name: 'Oxirgi mil / kross-dok', szz: 50, ref: 'SanQvaN 0103-25, 1-ilova, 5-sinf (umumtovar ombor qatori yoʻq)', flag: 'TALQIN' },
  { id: 'terminal', name: 'Yuk terminali (temir yoʻl yonida)', szz: 100, ref: 'SanQvaN 0103-25, 1-ilova, 4-sinf, 413 («shaharlararo yuk avtoturargohlari, bojxona terminallari»)', flag: 'TALQIN', rail: true },
  // 06.11 (c61): 1-ilovada ikki qator — 299 (3-sinf, «quruq» qum, tosh) va 480 (5-sinf, qum, tosh); ochiq quruq material — 300 m (TALQIN)
  { id: 'qurilish', name: 'Qurilish materiallari ombori', szz: 300, ref: 'SanQvaN 0103-25, 1-ilova, 3-sinf, 299 (quruq, ochiq saqlash); 5-sinf, 480 — 50 m', flag: 'TALQIN' },
  { id: 'yoqilgi', name: 'Yoqilgʻi ombori', szz: 100, ref: 'SanQvaN 0103-25, 1-ilova, 4-sinf, 425 («yoqilgʻi-moylash materiallari omborlari»)', flag: 'NORMA' },
];
export const logiType = (id?: string): LogiType => LOGI.find(t => t.id === id) ?? LOGI[0];
/** Boshqa ishlab chiqarish funksiyalari SMZ andozasi (turi aniqlanmaguncha; sanoat — 1-ilova sinfi bilan aniqlanadi) */
export const PROD_SZZ: Record<string, { szz: number; ref: string; flag: Flag }> = {
  sanoat: { szz: 100, ref: 'andoza (4-sinf; aniq sinf — SanQvaN 0103-25, 1-ilova)', flag: 'ANDOZA' },
  kommunal: { szz: 50, ref: 'andoza (5-sinf)', flag: 'ANDOZA' },
  transport: { szz: 50, ref: 'andoza (5-sinf; avtovokzal, taʼmirli depo — 0103-25, 1-ilova, 3-sinf 300 m; avtobus parki ≤ 300 — 4-sinf 100 m)', flag: 'ANDOZA' },
};
export function prodSzz(use: string, sub?: string): { szz: number; ref: string; flag: Flag } | null {
  if (use === 'logistika') { const t = logiType(sub); return { szz: t.szz, ref: t.ref, flag: t.flag }; }
  return PROD_SZZ[use] ?? null;
}
/** 178-band: kommunal-ombor zonasi uchun yer, m²/kishi */
export const sqmPerPerson = (bigCity: boolean) => (bigCity ? 2 : 2.5);
