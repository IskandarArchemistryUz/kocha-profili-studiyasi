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
export function levelZ(s: Pick<Settings, 'floorHeight' | 'groundH'>, b: Pick<Building, 'nonRes' | 'z0'>, k: number): number {
  const fh = s.floorHeight, dg = tallBase(b) ? groundH(s) - fh : 0;
  return k <= 0 ? 0 : k * fh + dg;
}
/** bino oʻz qavatlari boʻyicha: pastki sath, mahalliy qavat f ning pastki sathi, tepasi, balandligi (yer sathidan) */
export function bLevels(s: Pick<Settings, 'floorHeight' | 'groundH'>, b: Pick<Building, 'nonRes' | 'z0' | 'floors'>): { z0: number; at: (f: number) => number; top: number; h: number; fh1: number } {
  const k0 = b.z0 ?? 0, at = (f: number) => levelZ(s, b, k0 + f), z0 = at(0), top = at(b.floors);
  return { z0, at, top, h: top - z0, fh1: at(1) - z0 };
}
/** yer sathidan y balandlikdagi nuqta binoning nechanchi (1 dan) mahalliy qavatida */
export function floorAt(s: Pick<Settings, 'floorHeight' | 'groundH'>, b: Pick<Building, 'nonRes' | 'z0' | 'floors'>, y: number): number {
  const L = bLevels(s, b); for (let f = 1; f <= b.floors; f++) if (y < L.at(f)) return f;
  return b.floors;
}
