/**
 * Koʻrinish tekshiruvi (Master reja, 13.11.2026): har nuqtadan atrofga (360°, R m) koʻrinadigan maydon — VGA (Turner 2001).
 * Bir xil nuqtalar toʻrida ikki holat: «hozir» (faqat mavjud binolar) va «loyiha» (loyiha + saqlangan atrof).
 * Hisob — Joyshunos «Koʻrinadigan joy» dvigateli (joyshunos/izovist.ts), bitta joyda.
 */
import { buildIndex, isovist, type P2 } from '../joyshunos/izovist';

export interface KorJob { pts: P2[]; hozir: P2[][]; loyiha: P2[][]; R: number }
export interface KorOut { hozir: Float32Array; loyiha: Float32Array }

/** NaN — nuqta bino ichida */
export function korinishVga(j: KorJob, onProg?: (f: number) => void): KorOut {
  const o = { R: j.R, fov: 360, rays: 361 };
  const run = (rings: P2[][]): Float32Array => {
    const ix = buildIndex(rings), out = new Float32Array(j.pts.length);
    for (let i = 0; i < j.pts.length; i++) {
      const r = isovist(ix, j.pts[i], 0, o); out[i] = r.inside ? NaN : r.area;
      if (onProg && !(i % 500)) onProg(i / j.pts.length);
    }
    return out;
  };
  const hozir = run(j.hozir); onProg?.(0.5);
  return { hozir, loyiha: run(j.loyiha) };
}

/** Rang shkalasi: yopiq → ochiq (Joyshunos Maydon rejimi bilan bir xil) */
export const KOR_COLS = [0x2b2d6e, 0x5a4fa0, 0xc45a8a, 0xf39a52, 0xffe7a3];
export function korColor(v: number, vmax: number): number {
  const t = Math.max(0, Math.min(1, v / vmax)) * (KOR_COLS.length - 1), i = Math.min(KOR_COLS.length - 2, Math.floor(t)), f = t - i;
  const a = KOR_COLS[i], b = KOR_COLS[i + 1];
  const ch = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * f);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

export interface KorStat { n: number; med: number; p10: number; low: number; freeHa: number }
/** Uchastka ichidagi koʻrsatkichlar: mediana, eng yopiq 10 %, < thr m² ulushi, binolardan boʻsh joy */
export function korStat(v: Float32Array, inSite: boolean[], cell: number, thr = 1000): KorStat {
  const a: number[] = [];
  for (let i = 0; i < v.length; i++) if (inSite[i] && !Number.isNaN(v[i])) a.push(v[i]);
  a.sort((x, y) => x - y);
  const q = (p: number) => (a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : NaN);
  return { n: a.length, med: q(0.5), p10: q(0.1), low: a.length ? a.filter(x => x < thr).length / a.length : 0, freeHa: a.length * cell * cell / 10_000 };
}
