/**
 * Uchastka chegarasidan chekinish — ShNQ 2.07.01-23, 79-band, 2-jadval (egasi 01.11 jadvalni yubordi — avvalgi
 * «raqam yoʻq» xulosam notoʻgʻri edi: jadvalda «yoʻl tarafdagi hudud chegarasigacha» va «qoʻshni taraf hudud chegarasigacha»
 * ustunlari bor):
 *  — yoʻl tarafdagi hudud chegarasigacha (qizil chiziq): har qanday tarz — H × 0,25;
 *  — qoʻshni taraf hudud chegarasigacha: derazali uzun tarz — H × kʏ / 2, yon tarzlar — H × 0,25* (I–II darajada ≥ 6 m);
 *  H — yer sathidan eng yuqori qavat tom yopmasigacha (1-izoh); kʏ — yoʻnalish koeffitsiyenti (2-ilova diagrammasi).
 * Qoʻshimcha ANDOZA (ixtiyoriy, sukut — oʻchiq): koʻcha kesimi H / (W + 2s) ≤ k.
 */
import type { XY } from './geo';
import PC from 'polygon-clipping';

export const SB_HW = 0;          // andoza: H/W chegarasi (0 — oʻchiq; meʼyor 2-jadval boʻyicha)
export const SB_W_DEF = 15;      // andoza: koʻcha kengligi nomaʼlum boʻlsa, m
export const SB_MIN_RES = 6;     // andoza: 1-qavat turar joy — eng kam chekinish, m
export const SB_MIN_PUB = 3;     // andoza: 1-qavat noturar (Strelka: 1–3 m past qavatlilar uchun) — eng kam, m
export const SB_MAX = 20;        // generator chegarasi (gSet 0–20 m)

export interface AutoSetback { d: number; H: number; W: number; k: number; min: number; wFound: boolean }

/** H — koʻchaga qaragan fasad balandligi, m; W — koʻcha kengligi (null — nomaʼlum); k — H/W chegarasi */
/** 05.11: 79-band 2-jadval qoʻllanadigan funksiyalar — 3+ qavatli koʻp kvartirali turar joy va yotoq oʻrinli binolar (mehmonxona).
 *  Asl matn: «Уч ва ундан юқори кўп қаватли турар жой бинолари ва барча ётоқ ўринлари мавжуд бўлган бинолар орасидаги масофалар» */
export const SB79_USES: ReadonlySet<string> = new Set(['turar', 'aralash', 'mehmonxona']);
export const sb79Applies = (use: string, floors: number): boolean => SB79_USES.has(use) && floors >= 3;

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

/**
 * Yoʻnalish koeffitsiyenti kʏ — ShNQ 2.07.01-23, 2-ilova diagrammasi (matnda rasm; qiymatlar egasi yuborgan
 * «230718_Masofalar_koeffitsiyenti» varagʻidagi diagrammadan): binoning uzun tomoni yoʻnalishi shimolga nisbatan
 * 0° — 1,2; 10° — 1,5; 20° — 1,7; 30° — 1,9; 40° va 50° — 2,3; 60° — 1,9; 70° — 1,7; 80° — 1,5; 90° — 1,2 (har 90° takrorlanadi).
 * Uzun tomonlar parallel yoki 45° gacha burchak ostida boʻlganda qoʻllanadi.
 */
export const KY = [1.2, 1.5, 1.7, 1.9, 2.3, 2.3, 1.9, 1.7, 1.5, 1.2];
export function kyOf(azDeg: number): number { const t = ((azDeg % 90) + 90) % 90; return KY[Math.min(9, Math.round(t / 10))]; }
/** mahalliy XY da yoʻnalish (u) ning shimolga nisbatan azimuti, ° (x — sharq, y — shimol) */
export const azOf = (u: XY): number => ((Math.atan2(u[0], u[1]) * 180 / Math.PI) % 180 + 180) % 180;

export type EdgeKind = 'kocha' | 'qoshni';
/** 2-jadval: chegara turi va tarz boʻyicha talab, m */
export function boundaryNeed(kind: EdgeKind, H: number, longWin: boolean, azDeg: number): number {
  if (kind === 'kocha') return H * 0.25;
  return longWin ? H * kyOf(azDeg) / 2 : Math.max(6, H * 0.25);
}

/**
 * Kvartal qirralari turi: loyiha koʻchasi oʻqidan W/2 + 1,5 m ichida — koʻcha; qolganlari — uchastka chegarasi
 * (siteEdges: 'kocha' — mavjud koʻcha deb olinadi, 'qoshni' — qoʻshni hudud).
 */
export function edgeKinds(ring: XY[], streets: { axis: XY[]; w: number }[], siteEdges: EdgeKind = 'kocha'): EdgeKind[] {
  return ring.map((a, i) => {
    const b = ring[(i + 1) % ring.length], m: XY = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    for (const s of streets) { let d = Infinity; for (let q = 1; q < s.axis.length; q++) d = Math.min(d, segD(m, s.axis[q - 1], s.axis[q])); if (d <= s.w / 2 + 1.5) return 'kocha'; }
    return siteEdges;
  });
}

/** Har qirradan oʻz masofasiga ichkariga surilgan koʻpburchak (qirra tasmalari ayirmasi); eng katta boʻlak, yoʻq boʻlsa null */
export function insetVar(ring: XY[], d: number[]): XY[] | null {
  const cw = ring.reduce((t, p, i) => { const q = ring[(i + 1) % ring.length]; return t + (p[0] * q[1] - q[0] * p[1]); }, 0) < 0;
  const R = cw ? [...ring].reverse() : ring, D = cw ? [...d].reverse().map((_, i, arr) => arr[(i + 1) % arr.length]) : d;
  const strips: [number, number][][][] = [];
  for (let i = 0; i < R.length; i++) {
    const a = R[i], b = R[(i + 1) % R.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), w = D[i]; if (L < 1e-6 || !(w > 0)) continue;
    const n: XY = [-(b[1] - a[1]) / L * w, (b[0] - a[0]) / L * w];   // CCW — ichkariga (chap)
    strips.push([[[a[0], a[1]], [b[0], b[1]], [b[0] + n[0], b[1] + n[1]], [a[0] + n[0], a[1] + n[1]], [a[0], a[1]]]]);
  }
  try {
    const res = PC.difference([[...R, R[0]].map(p => [p[0], p[1]] as [number, number])], ...strips);
    let best: XY[] | null = null, ba = 0;
    for (const poly of res) { const r = poly[0].slice(0, -1).map(p => [p[0], p[1]] as XY), ar = Math.abs(r.reduce((t, p, i) => { const q = r[(i + 1) % r.length]; return t + (p[0] * q[1] - q[0] * p[1]); }, 0) / 2); if (ar > ba) { ba = ar; best = r; } }
    return best;
  } catch { return null; }
}
