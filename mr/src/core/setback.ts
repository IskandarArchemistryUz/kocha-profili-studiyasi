/**
 * Qizil chiziqdan chekinish — fasad balandligiga qarab (avto), egasi 31.10.
 *
 * MANBALAR: ShNQ 2.07.01-23 da koʻp qavatli bino uchun balandlikka bogʻliq chekinish raqami yoʻq
 * (103-band: qizil chiziq va qurilishni tartibga solish chizigʻida xoʻjalik qurilmalari qurilmaydi; 100-band: yakka uy
 * uchastka chegarasidan ≥ 3 m — bu past qavatlilar qoidasida, core/lowrise). Strelka katalogi (2-qism, past qavatlilar):
 * jamoat/savdo 1-qavatda boʻlsa 1–3 m, boʻlmasa ≤ 7 m — tavsiya.
 * Shuning uchun koʻp qavatli uchun qoida — ANDOZA (tahrirlanadi): koʻcha kesimi nisbati H / (W + 2s) ≤ k,
 * ya'ni s = (H / k − W) / 2, kamida sMin (1-qavat noturar — 3 m, turar — 6 m; andoza). W — kvartalga tutash eng tor
 * loyiha koʻchasi kengligi (qizil chiziqlar orasi); topilmasa — 15 m (andoza).
 */
import type { XY } from './geo';

export const SB_HW = 1;          // andoza: H/W ≤ 1 (koʻcha kesimi)
export const SB_W_DEF = 15;      // andoza: koʻcha kengligi nomaʼlum boʻlsa, m
export const SB_MIN_RES = 6;     // andoza: 1-qavat turar joy — eng kam chekinish, m
export const SB_MIN_PUB = 3;     // andoza: 1-qavat noturar (Strelka: 1–3 m past qavatlilar uchun) — eng kam, m
export const SB_MAX = 20;        // generator chegarasi (gSet 0–20 m)

export interface AutoSetback { d: number; H: number; W: number; k: number; min: number; wFound: boolean }

/** H — koʻchaga qaragan fasad balandligi, m; W — koʻcha kengligi (null — nomaʼlum); k — H/W chegarasi */
export function autoSetback(H: number, W: number | null, nonResGround: boolean, k = SB_HW): AutoSetback {
  const w = W ?? SB_W_DEF, min = nonResGround ? SB_MIN_PUB : SB_MIN_RES, kk = Math.max(0.3, k);
  const raw = (H / kk - w) / 2, d = Math.min(SB_MAX, Math.max(min, Math.round(raw * 2) / 2));
  return { d, H, W: w, k: kk, min, wFound: W != null };
}

function segD(p: XY, a: XY, b: XY): number {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2));
  return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t);
}

/**
 * Kvartalga tutash koʻchalar: kvartal qirrasining nuqtalari (har ~10 m) koʻcha oʻqidan W/2 (+1,5 m) ichida boʻlsa — tutash.
 * Natija: tutash koʻchalarning eng kichik kengligi (null — tutash loyiha koʻchasi yoʻq).
 */
export function blockStreetWidth(ring: XY[], streets: { axis: XY[]; w: number }[]): number | null {
  let best: number | null = null;
  for (const s of streets) {
    if (s.axis.length < 2) continue;
    const lim = s.w / 2 + 1.5; let hit = 0;
    for (let i = 0; i < ring.length && hit < 2; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 10));
      for (let j = 0; j <= n && hit < 2; j++) {
        const p: XY = [a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n];
        let m = Infinity; for (let q = 1; q < s.axis.length; q++) m = Math.min(m, segD(p, s.axis[q - 1], s.axis[q]));
        if (m <= lim) hit++;
      }
    }
    if (hit >= 2) best = best == null ? s.w : Math.min(best, s.w);
  }
  return best;
}
