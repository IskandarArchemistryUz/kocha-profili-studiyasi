/**
 * Aholi yosh tarkibi — stat.uz SDMX (doimiy aholi, 2026-yil 1-yanvar). Iskandar yuklagan jadvallardan
 * (D:\Work\normalar\stat uz): jami (246), shahar (248) va 13 yosh guruhi (561…1191).
 * 3–5 yoshlilar jadvali yoʻq — jami aholidan qolgan guruhlar ayirib topilgan (jami «ming kishi»da 0,1 aniqlikda,
 * shuning uchun bu guruh tumanda ± 50 kishi aniqlikda).
 * Ehtiyoj — 100 % qamrov: maktab 7–17 yosh (11 sinf), MTM 3–6 yosh. 6–7 yosh guruhi teng ikkiga boʻlingan.
 */
import data from '../data/uz_demo.json';

export interface DemoRow { code: string; name: string; pop: number; urb: number; a0_2: number; a3_5: number; a6_7: number; a8_15: number; a16_17: number; a18_19: number; a20_24: number; a25_29: number; a30_34: number; a35_39: number; a40_49: number; a50_59: number; a60_64: number; a65: number }

export const DEMO = data as { source: string; year: string; rows: DemoRow[] };

export const demoRow = (code: string): DemoRow | null => DEMO.rows.find(r => r.code === code) ?? null;
/** viloyat (4 xonali kod) va uning tumanlari/shaharlari */
export function demoTree(): { region: DemoRow; parts: DemoRow[] }[] {
  const regs = DEMO.rows.filter(r => r.code.length === 4);
  return regs.map(region => ({ region, parts: DEMO.rows.filter(r => r.code.length > 4 && r.code.startsWith(region.code)) }));
}

/** 1000 kishiga: maktab yoshidagi (7–17) va maktabgacha (3–6) bolalar */
export function perThousand(r: DemoRow): { school: number; mtm: number; elderly: number } {
  const k = 1000 / r.pop;
  return { school: (r.a6_7 / 2 + r.a8_15 + r.a16_17) * k, mtm: (r.a3_5 + r.a6_7 / 2) * k, elderly: (r.a65) * k };
}
