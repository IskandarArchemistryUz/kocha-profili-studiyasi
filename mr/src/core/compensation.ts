/**
 * Koʻchirish (buziladigan mavjud binolar) xarajati — dastlabki baho.
 *
 * Huquqiy asos (asl matndan, D:\Work\normalar):
 *  OʻRQ-781 (29.06.2022) «Yer uchastkalarini kompensatsiya evaziga jamoat ehtiyojlari uchun olib qoʻyish tartib-taomillari toʻgʻrisida»:
 *   23-modda — koʻchmas mulk va yerga boʻlgan huquqning bozor qiymati, dov-daraxtlar, koʻchish va vaqtinchalik ijara,
 *   boy berilgan foyda (≤ 1 yil), noqulaylik uchun koʻchmas mulk bozor qiymatining 5 % i;
 *   24-modda — yangi uy 24 oydan kechiksa, kuniga baholash qiymatining 0,05 % i penya;
 *   25-modda — koʻp kvartirali uy uchun teng qiymatli, ijtimoiy normadan kam boʻlmagan kvartira; farq huquq egasiga qoplanadi;
 *   29-modda — qiymatni baholovchi tashkilot belgilaydi (tartib-taomil boshlanguncha boʻlgan holatda).
 *  OʻRQ-1149 (10.06.2026, kuchga kirishi 12.12.2026) «Shaharsozlik renovatsiyasi toʻgʻrisida»:
 *   40-modda — xuddi shu turlar, boy berilgan foyda — ikki yillik;
 *   41-modda — noqulaylik uchun aniqlangan kompensatsiya miqdorining 12 % i;
 *   42-modda — beriladigan uy-joy maydoni renovatsiya qilinayotganidan kam boʻlmasligi;
 *   7-modda — renovatsiya hududining kamida 1/4 qismi yashil zona; 36-modda — avariya uyi uchun 4/5 rozilik shart emas.
 *
 * Bu baholovchi xulosasi EMAS: bozor qiymati — eʼlonlardagi soʻralgan narx (monitoring) yoki foydalanuvchi kiritgan qiymat.
 */
export type Regime = 'orq781' | 'orq1149';
export type DemoKind = 'hovli' | 'kvartira' | 'noturar';

export interface CompParams {
  regime: Regime;
  /** bozor narxi, $/m² umumiy maydon */
  priceFlat: number; priceHouse: number; priceNonres: number;
  /** narx manbasi (matn: «uybor.uz Mirobod, 2026-10-16» yoki «qoʻlda») */
  priceSource: string;
  /** koʻp kvartirali uyda umumiy maydon / qavatlar maydoni */
  flatNet: number;
  /** oʻrtacha kvartira, m² — xonadonlar sonini baholash uchun */
  avgFlat: number;
  /** vaqtinchalik ijara: oy va $/m²·oy (0 — kiritilmagan) */
  rentMonths: number; rentRate: number;
  /** koʻchish (yuk tashish), $ har xonadon (0 — kiritilmagan) */
  movingPerHh: number;
  /** noturar: yillik foyda, $/m² (0 — kiritilmagan) */
  profitRate: number;
}

export const COMP_DEFAULT: CompParams = { regime: 'orq781', priceFlat: 0, priceHouse: 0, priceNonres: 0, priceSource: '', flatNet: 0.8, avgFlat: 60, rentMonths: 24, rentRate: 0, movingPerHh: 0, profitRate: 0 };

export interface DemoBuilding { id: number; area: number; h: number; kind?: string }

const RES_HOUSE = /^(house|detached|semidetached_house|bungalow|farm|hut|cabin)$/;
const RES_FLAT = /^(apartments|dormitory)$/;
const NONRES = /^(commercial|retail|office|industrial|warehouse|garage|garages|shed|kiosk|school|kindergarten|hospital|public|civic|government|mosque|church|service|supermarket|hotel|construction|transportation|train_station|roof|parking)$/;

/** OSM tegi, qavatlar va dogʻ boʻyicha tur */
export function classify(b: DemoBuilding): DemoKind {
  const k = b.kind ?? 'yes', floors = Math.max(1, Math.round(b.h / 3.2));
  if (RES_FLAT.test(k)) return 'kvartira';
  if (RES_HOUSE.test(k)) return 'hovli';
  if (NONRES.test(k)) return 'noturar';
  // building=yes / residential: 3+ qavat va katta dogʻ — koʻp kvartirali, qolgani — hovli uy
  return floors >= 3 && b.area > 250 ? 'kvartira' : 'hovli';
}

export interface CompRow { kind: DemoKind; n: number; floorArea: number; households: number; market: number; rent: number; moving: number; profit: number }
export interface CompResult {
  rows: CompRow[]; market: number; inconvenience: number; rent: number; moving: number; profit: number; total: number;
  /** noqulaylik foizi (5 yoki 12) va boy berilgan foyda yillari (1 yoki 2) */
  pct: number; profitYears: number;
  /** turar joy maydoni (qaytariladigan, 42-modda / 25-modda) */
  resArea: number; households: number;
  /** narxi kiritilmagan toifalar */
  missing: DemoKind[];
}

export function compensation(list: DemoBuilding[], p: CompParams): CompResult {
  const pct = p.regime === 'orq1149' ? 0.12 : 0.05, profitYears = p.regime === 'orq1149' ? 2 : 1;
  const by = new Map<DemoKind, CompRow>();
  for (const b of list) {
    const kind = classify(b), floors = Math.max(1, Math.round(b.h / 3.2)), fa = b.area * floors;
    const r = by.get(kind) ?? { kind, n: 0, floorArea: 0, households: 0, market: 0, rent: 0, moving: 0, profit: 0 };
    r.n++; r.floorArea += fa;
    const usable = kind === 'kvartira' ? fa * p.flatNet : fa;
    const hh = kind === 'hovli' ? 1 : kind === 'kvartira' ? Math.max(1, Math.round(usable / p.avgFlat)) : 0;
    r.households += hh;
    r.market += usable * (kind === 'kvartira' ? p.priceFlat : kind === 'hovli' ? p.priceHouse : p.priceNonres);
    if (kind !== 'noturar') { r.rent += usable * p.rentRate * p.rentMonths; r.moving += hh * p.movingPerHh; }
    else r.profit += usable * p.profitRate * profitYears;
    by.set(kind, r);
  }
  const rows = (['hovli', 'kvartira', 'noturar'] as DemoKind[]).map(k => by.get(k)).filter((r): r is CompRow => !!r);
  const sum = (f: (r: CompRow) => number) => rows.reduce((t, r) => t + f(r), 0);
  const market = sum(r => r.market), rent = sum(r => r.rent), moving = sum(r => r.moving), profit = sum(r => r.profit);
  // 781: 5 % — koʻchmas mulk bozor qiymatidan; 1149: 12 % — aniqlangan kompensatsiya miqdoridan (bozor + ijara + koʻchish + foyda)
  const inconvenience = p.regime === 'orq1149' ? (market + rent + moving + profit) * pct : market * pct;
  const missing = rows.filter(r => (r.kind === 'kvartira' ? p.priceFlat : r.kind === 'hovli' ? p.priceHouse : p.priceNonres) <= 0).map(r => r.kind);
  const resArea = rows.filter(r => r.kind !== 'noturar').reduce((t, r) => t + (r.kind === 'kvartira' ? r.floorArea * p.flatNet : r.floorArea), 0);
  return { rows, market, inconvenience, rent, moving, profit, total: market + inconvenience + rent + moving + profit, pct: pct * 100, profitYears, resArea, households: sum(r => r.households), missing };
}

/** monitoring CSV (narx-monitoring tarmogʻi) dan oxirgi sana boʻyicha median $/m² */
export function parseMonitoring(csv: string): { date: string; flat?: number; house?: number; flatNear?: number; houseNear?: number } | null {
  const lines = csv.trim().split(/\r?\n/); if (lines.length < 2) return null;
  const head = lines[0].split(','), rows = lines.slice(1).map(l => l.split(','));
  const ix = (n: string) => head.indexOf(n), last = rows.map(r => r[ix('sana')]).sort().pop()!;
  const get = (cat: string, col: string) => { const r = rows.filter(x => x[ix('sana')] === last && x[ix('kategoriya')] === cat).pop(); const v = r ? Number(r[ix(col)]) : NaN; return Number.isFinite(v) && v > 0 ? v : undefined; };
  return { date: last, flat: get('kvartira', 'median_usd_m2'), house: get('hovli', 'median_usd_m2'), flatNear: get('kvartira', 'atrof_1500m_median_usd_m2'), houseNear: get('hovli', 'atrof_1500m_median_usd_m2') };
}

export const MONITORING_URL = 'https://raw.githubusercontent.com/IskandarArchemistryUz/kocha-profili-studiyasi/narx-monitoring/data/narx/mirobod_uybor.csv';
