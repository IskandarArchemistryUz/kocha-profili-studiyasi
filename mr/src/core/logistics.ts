/**
 * Ishlab chiqarish zonalari (02.11): logistika va ombor turlari, ularning SMZ andozasi va joylashuv qoidalari.
 *
 * Asl matn (egasining normalar papkasi):
 *  - ShNQ 2.07.01-23: 141, 144 (ishlab chiqarish zonasi tarkibi: kommunal-ombor, sanoat, texnopark), 146 (ishlab chiqarish zonasi va
 *    SMZ ichida turar joy, mehmonxona, yotoqxona, MTM, maktab, sport — yoʻq), 147 (turar joy va ishlab chiqarish zonalarini aralash
 *    joylashtirish mumkin emas), 173 (sabzavot-meva omborlari SMZ ≥ 50 m), 174 (aholiga kundalik xizmat bilan bogʻliq boʻlmagan omborlar —
 *    transport tugunlari, tashqi avtomobil va temir yoʻl yonida), 178 (kommunal-ombor zonasi: eng yirik va yirik shaharlarda 2 m²/kishi,
 *    boshqa shaharlarda 2,5 m²/kishi).
 *  - SanPiN RUz № 0350-17: 6.3 IV sinf (100 m) — yoqilgʻi-moylash materiallari omborlari; 6.3 V sinf (50 m) — meva, sabzavot, kartoshka,
 *    don omborlari, material omborlari; 6.4 IV sinf (100 m) — shaharlararo yuk avtotransporti turargohlari, bojxona terminallari.
 * Omborlar SMZ sinflari uchun ShNQ 2.09.02-19 va SanQvaN 0019-21 normalar papkasida yoʻq — matnda boʻlmagan qiymat «ANDOZA».
 */
export type Flag = 'NORMA' | 'TALQIN' | 'ANDOZA';
export interface LogiType { id: string; name: string; szz: number; ref: string; flag: Flag; rail?: boolean }
export const LOGI: LogiType[] = [
  { id: 'tarqatish', name: 'Tarqatish markazi (umumtovar)', szz: 50, ref: 'SanPiN 0350-17, 6.3 V sinf («material omborlari»)', flag: 'TALQIN' },
  { id: 'sovutgich', name: 'Sovutgichli ombor', szz: 50, ref: 'andoza (ShNQ 2.09.02-19 papkada yoʻq)', flag: 'ANDOZA' },
  { id: 'sabzavot', name: 'Sabzavot-meva ombori', szz: 50, ref: 'ShNQ 2.07.01-23, 173; SanPiN 0350-17, 6.3 V sinf', flag: 'NORMA' },
  { id: 'krossdok', name: 'Oxirgi mil / kross-dok', szz: 50, ref: 'andoza (shahar ichida, kichik)', flag: 'ANDOZA' },
  { id: 'terminal', name: 'Yuk terminali (temir yoʻl yonida)', szz: 100, ref: 'SanPiN 0350-17, 6.4 IV sinf («yuk avtotransporti turargohi, bojxona terminali»)', flag: 'TALQIN', rail: true },
  { id: 'qurilish', name: 'Qurilish materiallari ombori', szz: 50, ref: 'SanPiN 0350-17, 6.3 V sinf («material omborlari»)', flag: 'TALQIN' },
  { id: 'yoqilgi', name: 'Yoqilgʻi ombori', szz: 100, ref: 'SanPiN 0350-17, 6.3 IV sinf («yoqilgʻi-moylash materiallari omborlari»)', flag: 'NORMA' },
];
export const logiType = (id?: string): LogiType => LOGI.find(t => t.id === id) ?? LOGI[0];
/** Boshqa ishlab chiqarish funksiyalari SMZ andozasi (turi aniqlanmaguncha; sanoat — ShNQ 2.09.02-19 bilan aniqlanadi) */
export const PROD_SZZ: Record<string, { szz: number; ref: string; flag: Flag }> = {
  sanoat: { szz: 100, ref: 'andoza (IV sinf; aniq sinf — ShNQ 2.09.02-19, papkada yoʻq)', flag: 'ANDOZA' },
  kommunal: { szz: 50, ref: 'andoza (V sinf)', flag: 'ANDOZA' },
  transport: { szz: 50, ref: 'andoza (V sinf; avtobus vokzali, depo — SanPiN 0350-17, 6.4 III sinf 300 m)', flag: 'ANDOZA' },
};
export function prodSzz(use: string, sub?: string): { szz: number; ref: string; flag: Flag } | null {
  if (use === 'logistika') { const t = logiType(sub); return { szz: t.szz, ref: t.ref, flag: t.flag }; }
  return PROD_SZZ[use] ?? null;
}
/** 178-band: kommunal-ombor zonasi uchun yer, m²/kishi */
export const sqmPerPerson = (bigCity: boolean) => (bigCity ? 2 : 2.5);
