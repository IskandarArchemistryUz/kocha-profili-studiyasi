/**
 * Qavat sathlari (01.11, egasi: «1-qavat 5,7 m — 4 marshli zina ham boʻladi»).
 * 1-qavat balandligi (settings.groundH) faqat «baland 1-qavatli» binolarga qoʻllanadi: 1-qavati noturar (savdo, xizmat)
 * yoki stilobat ustidagi (z0 > 0) bino — ostidagi stilobatning 1-qavati baland. Turar joy (1-qavati turar) va yakka uylar — floorHeight.
 * Sath k (0 — yer): E(k) = k · fh + (k > 0 ? dg : 0), dg = groundH − fh.
 */
import type { Building, Settings } from './doc';

export const groundH = (s: Pick<Settings, 'floorHeight' | 'groundH'>): number => (s.groundH != null && s.groundH > 0 ? s.groundH : s.floorHeight);
/** baland 1-qavatli bino */
export const tallBase = (b: Pick<Building, 'nonRes' | 'z0'>): boolean => (b.nonRes ?? 0) > 0 || (b.z0 ?? 0) > 0;
/** binoning yer sathidan k-sath balandligi (k — umumiy sath: z0 + mahalliy qavat) */
export function levelZ(s: Pick<Settings, 'floorHeight' | 'groundH'>, b: Pick<Building, 'nonRes' | 'z0'> & { hall?: number; gh?: number }, k: number): number {
  // 02.11: katta oraliqli zal (ombor, logistika) — 1-qavat balandligi binoning oʻzida (groundH emas)
  if (b.hall && !(b.z0 ?? 0)) return k <= 0 ? 0 : b.hall + (k - 1) * s.floorHeight;
  // 04.11: binoning oʻz 1-qavat balandligi (gh) — har qanday bino uchun (stilobat ustidagi seksiyada — stilobatniki hisobga olinmaydi)
  const fh = s.floorHeight, dg = b.gh != null && !(b.z0 ?? 0) ? b.gh - fh : tallBase(b) ? groundH(s) - fh : 0;
  return k <= 0 ? 0 : k * fh + dg;
}
/** bino oʻz qavatlari boʻyicha: pastki sath, mahalliy qavat f ning pastki sathi, tepasi, balandligi (yer sathidan) */
export function bLevels(s: Pick<Settings, 'floorHeight' | 'groundH'>, b: Pick<Building, 'nonRes' | 'z0' | 'floors'> & { hall?: number; gh?: number }): { z0: number; at: (f: number) => number; top: number; h: number; fh1: number } {
  const k0 = b.z0 ?? 0, at = (f: number) => levelZ(s, b, k0 + f), z0 = at(0), top = at(b.floors);
  return { z0, at, top, h: top - z0, fh1: at(1) - z0 };
}
/** yer sathidan y balandlikdagi nuqta binoning nechanchi (1 dan) mahalliy qavatida */
export function floorAt(s: Pick<Settings, 'floorHeight' | 'groundH'>, b: Pick<Building, 'nonRes' | 'z0' | 'floors'>, y: number): number {
  const L = bLevels(s, b); for (let f = 1; f <= b.floors; f++) if (y < L.at(f)) return f;
  return b.floors;
}

/**
 * Antresol (01.11, egasi: quruvchilar 1-qavatni baland sotadi — ijarachi ichida antresol quradi).
 * Maydon (04.11, audit): ShNQ 2.08.02-23, 11-ilova, 1-band — antresollar binoning umumiy maydoniga kiradi → GFA ga qoʻshiladi (core/derive).
 * Balandlik: Strelka katalogi (kvartira, shift ≥ 4,8 m) — antresol ostida ≥ 2,5 m, ustida ≥ 2,1 m; ora yopma 0,3 m (andoza).
 * Ulush: 1-qavat maydonining 40 % i (andoza, egasi 01.11).
 */
export const ANTRESOL_SHARE = 0.4;
export const ANTRESOL_LO = 2.5, ANTRESOL_HI = 2.1, ANTRESOL_SLAB = 0.3;
export const ANTRESOL_MIN_H = ANTRESOL_LO + ANTRESOL_SLAB + ANTRESOL_HI;   // 4,9 m
/** antresol sathlari (1-qavat balandligi h): pastki va yuqori sath balandligi; sigʻmasa — null */
export function antresolSplit(h: number): { lo: number; hi: number } | null {
  const avail = h - ANTRESOL_SLAB; if (avail < ANTRESOL_LO + ANTRESOL_HI - 1e-6) return null;
  const hi = Math.max(ANTRESOL_HI, avail / 2), lo = avail - hi;
  return lo >= ANTRESOL_LO - 1e-6 ? { lo, hi } : { lo: ANTRESOL_LO, hi: avail - ANTRESOL_LO };
}
/** binoning antresoli bormi: 04.11 (egasi) — avtomatik, 1-qavat noturar va balandligi yetsa (≥ 4,9 m); qoʻlda oʻchirilsa (antresol: false) — yoʻq */
export const hasAntresol = (s: Pick<Settings, 'floorHeight' | 'groundH'>, b: Pick<Building, 'nonRes' | 'z0' | 'floors' | 'antresol'>): boolean =>
  b.antresol !== false && (b.nonRes ?? 0) >= 1 && !(b.z0 ?? 0) && antresolSplit(bLevels(s, b).fh1) != null;
