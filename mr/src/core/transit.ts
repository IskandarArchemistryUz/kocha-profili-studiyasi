/**
 * Jamoat transporti bekatigacha piyoda radius — ShNQ 2.07.01-23 (asl matndan, inventar 2026-10-17):
 *  382-band      — istiqomat yoki ishxonadan bekatgacha ≤ 400 m;
 *  382, 2-qism   — yakka tartibdagi uy-joy hududlarida: eng yirik, yirik va katta shaharlarda 600 m gacha, oʻrta va kichik shaharlarda 800 m gacha;
 *  383-band      — eng yirik va yirik shaharlarning umumshahar markazlarida 250 m; ommaviy dam olish va sport zonalarida 800 m;
 *  383, 2-qism   — murakkab relyefda har 10 m balandlik farqiga 50 m qisqartiriladi.
 * Shahar toifasi chegaralari ShNQ 2.07.01-23 matnida yoʻq — SNiP 2.07.01-89 asosidagi ANDOZA (manba tasdiqlanmagan), qoʻlda oʻzgartiriladi.
 * Hududlar tasniflanganda (keyingi bosqich) kvartal → hudud bogʻlanishi qayta koʻriladi.
 */
import type { Use } from './doc';
import { DEMO, demoRow } from './demography';

export type CityCat = 'engyirik' | 'yirik' | 'katta' | 'orta' | 'kichik';
export const CITY_CATS: { id: CityCat; name: string; range: string; min: number }[] = [
  { id: 'engyirik', name: 'Eng yirik', range: '> 1 mln', min: 1_000_000 },
  { id: 'yirik', name: 'Yirik', range: '250 ming – 1 mln', min: 250_000 },
  { id: 'katta', name: 'Katta', range: '100–250 ming', min: 100_000 },
  { id: 'orta', name: 'Oʻrta', range: '50–100 ming', min: 50_000 },
  { id: 'kichik', name: 'Kichik', range: '< 50 ming', min: 0 },
];
export const catName = (c: CityCat) => CITY_CATS.find(x => x.id === c)!.name;

/** Aholi soni boʻyicha toifa (andoza) */
export function cityCategory(pop: number): CityCat {
  return (CITY_CATS.find(c => pop > c.min || (c.min === 0)) ?? CITY_CATS[4]).id;
}

/**
 * 1-qadamdagi hudud (stat.uz kodi) → shahar va aholisi.
 * Toshkent shahri tumanlari → butun shahar; «… shahri» qatori → oʻzi; tuman yoki viloyat — shahar emas (city: false, toifani qoʻlda tekshirish kerak).
 */
export function cityOf(code: string): { name: string; pop: number; city: boolean } | null {
  const tash = code.startsWith('1726') ? demoRow('1726') : null;
  const r = tash ?? demoRow(code); if (!r) return null;
  return { name: r.name.replace(/\s+/g, ' ').trim(), pop: r.pop, city: !!tash || /shahri/i.test(r.name) };
}
export const DEMO_YEAR = DEMO.year;

export type StopZone = 'odatiy' | 'yakka' | 'dam';
export const ZONE_NAME: Record<StopZone, string> = { odatiy: 'odatdagi', yakka: 'yakka tartibdagi uy-joy', dam: 'dam olish va sport zonasi' };
/** Kvartal funksiyasidan hudud turi (avtomatik) */
export const stopZone = (u: Use): StopZone => u === 'yakka' ? 'yakka' : u === 'sport' || u === 'yashil' || u === 'maydon' ? 'dam' : 'odatiy';

export interface StopRadius { r: number; base: number; cut: number; clause: string }
/**
 * Bekatgacha radius, m.
 * center — loyiha umumshahar markazida (faqat eng yirik va yirik shaharda amal qiladi);
 * dh — uchastka va bekat orasidagi eng katta balandlik farqi, m (relyef tuzatmasi oʻchirilgan boʻlsa 0).
 */
export function stopRadius(zone: StopZone, cat: CityCat, center: boolean, dh = 0): StopRadius {
  const big = cat === 'engyirik' || cat === 'yirik';
  const [base, clause] = zone === 'dam' ? [800, '383'] : center && big ? [250, '383'] : zone === 'yakka' ? [big || cat === 'katta' ? 600 : 800, '382, 2-qism'] : [400, '382'];
  const cut = dh > 0 ? Math.round(dh / 10 * 50) : 0;
  return { r: Math.max(50, base - cut), base, cut, clause };
}
