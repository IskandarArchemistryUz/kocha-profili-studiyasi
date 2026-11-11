/**
 * Meʼyorlar toʻplamlari — 1-bosqich (11.11.2026, egasi: «xorijda Lab juda qattiq, boshqa shaharlarda ancha erkin»).
 * Inventar va tasnif: claude/normalar-toplamlar-inventar-11-11.md (egasi tasdiqladi).
 *
 * Tekshiruv va generator kodi bitta qoladi — qiymat va daraja toʻplamdan olinadi:
 *  - UZ   — barcha qoidalar majburiy, generator ShNQ boʻyicha (oʻzgarishsiz);
 *  - intl — A (fizik va xavfsizlik), C (loyiha konverti), D (cheklovlar) — tavsiya; B (mintaqaviy siyosat) — oʻchiq.
 *
 * Xalqaro andoza masofalari — NSW Apartment Design Guide (2015), 3F «Visual privacy», 3F-1 design criteria 1:
 * yon va orqa chegaragacha — H ≤ 12 m (4 qavat): 6 m yashash xonalari va balkonlar / 3 m boshqa xonalar; ≤ 25 m (5–8): 9 / 4,5 m;
 * > 25 m (9+): 12 / 6 m. Izoh: bir uchastkadagi binolar orasi — talablar yigʻindisi (3F.2-rasm).
 * 11.11: asl PDF (planning.nsw.gov.au, Part 3 «Siting the development») bilan solishtirildi — mos.
 */
export type NormSet = 'UZ' | 'intl';
/** A — fizik va xavfsizlik; B — mintaqaviy siyosat (UZ/MDH); C — loyiha konverti (zonalash); D — cheklovlar (zona va bufer) */
export type RuleKind = 'A' | 'B' | 'C' | 'D';
export type Level = 'majburiy' | 'tavsiya' | 'andoza' | 'ochiq';

export const RULE_KIND: Readonly<Record<string, RuleKind>> = {
  // A — fizik va xavfsizlik
  'street-profiles': 'A', 'park-413': 'A', 'park-411': 'A', 'park-20507': 'A', 'park-414': 'A', 'street-overlap': 'A',
  'seismic-blocks': 'A', 'seismic-height': 'A', 'fire-56': 'A', 'arch-159': 'A', 'dead-end-57': 'A', 'fire-666': 'A', 'fire-podium': 'A',
  // B — mintaqaviy siyosat
  'pop-61': 'B', school: 'B', mtm: 'B', 'school-plot': 'B', 'mtm-plot': 'B', 'park-30': 'B', 'ug-park-415': 'B', 'velo-88': 'B',
  'tp-257': 'B', 'red-line-39': 'B', 'west-facing': 'B', 'renov-green-7': 'B', 'green-86': 'B', 'green-474': 'B', 'trees-474': 'B',
  'green-36': 'B', 'spacing-79': 'B', 'hovli-79-3': 'B', 'waste-346': 'B', 'play-89': 'B', 'play-91': 'B', 'low-green-96': 'B',
  // C — loyiha konverti
  'density-84': 'C', 'umn-66': 'C', 'housing-82': 'C', parking: 'C', 'redline-79': 'C', 'qoshni-79': 'C',
  // D — cheklovlar
  'szz-217': 'D', 'qab-szz': 'D', 'qab-100': 'D', 'elu-1050': 'D', 'elu-251': 'D', 'water-981': 'D', 'szz-manual': 'D',
  'szz-219': 'D', 'szz-belt': 'D', 'prod-146': 'D', 'prod-147': 'D', 'logi-174': 'D',
};

/** qoida darajasi; null — qoida tasniflanmagan (masalan insolyatsiya, reja qoidalari) — eski xatti-harakat */
export function levelOf(id: string, set: NormSet): Level | null {
  const k = RULE_KIND[id]; if (!k) return null;
  if (set === 'UZ') return 'majburiy';
  return k === 'B' ? 'ochiq' : 'tavsiya';
}

export const ADG_SRC = 'NSW Apartment Design Guide (2015), 3F-1, design criteria 1';
export const ADG_URL = 'https://www.planning.nsw.gov.au/sites/default/files/2023-03/apartment-design-guide-part-3-siting-the-development.pdf';

/** ADG 3F-1: binolar orasi, m — H ≤ 12 m (4 qavat) / ≤ 25 m (5–8) / > 25 m (9+);
 *  hab — yashash xonalari va balkonlar bir-biriga qaraydi, non — yashashga moʻljallanmagan (torets, zina) */
const ADG_SEP = { hab: [12, 18, 24], non: [6, 9, 12] } as const;
const ADG_H = [12, 25] as const;

/** ADG: H balandlikdagi binolar orasidagi masofa, m */
export function adgSep(H: number, hab = true): number {
  const t = hab ? ADG_SEP.hab : ADG_SEP.non;
  return H <= ADG_H[0] ? t[0] : H <= ADG_H[1] ? t[1] : t[2];
}
/** ADG: d masofada ruxsat etilgan eng katta balandlik, m (0 — eng past pogʻona ham sigʻmaydi; Infinity — cheklanmaydi) */
export function adgMaxH(d: number, hab = true): number {
  const t = hab ? ADG_SEP.hab : ADG_SEP.non;
  return d >= t[2] ? Infinity : d >= t[1] ? ADG_H[1] : d >= t[0] ? ADG_H[0] : 0;
}

/**
 * Qarshidagi bino tomonidan ruxsat etilgan balandlik, m.
 * UZ: uzun tomon ↔ uzun tomon — d / k2 (k2 = 2·H, 8-izoh; rekonstruksiyada 1·H); torets — d < 6 m boʻlsa 0, aks holda d / 0,3 / k2 (2-jadval).
 * intl: ADG — uzun tomonlar (derazali) hab, torets — non.
 */
export function facingMaxH(set: NormSet | undefined, d: number, long: boolean, k2: number): number {
  if (set === 'intl') return adgMaxH(d, long);
  return long ? d / k2 : d < 6 ? 0 : d / 0.3 / k2;
}

/** Parallel qatorlar orasi, m. UZ — oʻzgarishsiz (chaqiruvchida); intl — ADG (yashash xonalari bir-biriga qaraydi) */
export const intlRowGap = (H: number): number => adgSep(H, true);

/** Chegaragacha chekinish (qoʻshni uchastka) — ADG: binolar orasining yarmi (masofa «teng boʻlinadi», 3F-1) */
export const intlSideSetback = (H: number, longWin: boolean): number => adgSep(H, longWin) / 2;

/** ADG 3F-1: binoning oʻz balandligi boʻyicha chegaragacha ulushi, m (yashash xonalari): 6 / 9 / 12 */
export const adgHalf = (H: number): number => adgSep(H, true) / 2;
/** ADG: oʻz ulushi r m boʻlsa ruxsat etilgan eng katta balandlik, m (0 — sigʻmaydi; Infinity — cheklanmaydi) */
export const adgMaxHHalf = (r: number): number => adgMaxH(2 * r, true);
