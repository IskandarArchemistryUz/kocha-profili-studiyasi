/**
 * Joyshunos · Ijtimoiy skaner (12.11.2026): tahlil hududidagi HAR BIR BINO uchun kundalik xizmatlarga piyoda yetish bali.
 * Sof funksiyalar (UI yoʻq) — main.ts dan chaqiriladi, unit testlar shu faylni tekshiradi.
 *
 * Usul:
 *  - masofa — piyoda tarmogʻi boʻylab (har xizmat turi uchun bitta koʻp manbali Dijkstra), bino markazidan eng yaqin tarmoq nuqtasigacha
 *    toʻgʻri chiziq qoʻshiladi; tarmoqqa ulanmagan bino yoki 80 m ichidagi (bir hovli) manba — toʻgʻri masofa × 1,3;
 *  - ball: masofa ≤ meʼyor radiusi (ShNQ 2.07.01-23, 38-jadval; bekat — 382-band; services.ts) → 100;
 *    ≥ 3 × radius → 0; oraligʻi chiziqli. Transport = bekat va metro ballarining kattasi;
 *  - umumiy ball — 6 yoʻnalish oʻrtachasi; «eng zaif yoʻnalish» — eng past ball.
 * Bu xonadon haqidagi kuzatuv emas — binoning joylashuvi bahosi. OSM toʻliq emas: «topilmadi» — «OSM da yoʻq» degani.
 */
import type { XY } from '../core/geo';
import { snap, svcDef, type Net, type Svc } from '../core/services';
import { sssp } from './models';

export type SkDim = 'maktab' | 'mtm' | 'poliklinika' | 'dorixona' | 'savdo' | 'transport';
export const SK_DIMS: { id: SkDim; name: string; kinds: Svc[] }[] = [
  { id: 'maktab', name: 'Maktab', kinds: ['maktab'] },
  { id: 'mtm', name: 'Bogʻcha', kinds: ['mtm'] },
  { id: 'poliklinika', name: 'Poliklinika', kinds: ['poliklinika'] },
  { id: 'dorixona', name: 'Dorixona', kinds: ['dorixona'] },
  { id: 'savdo', name: 'Kundalik savdo', kinds: ['savdo'] },
  { id: 'transport', name: 'Jamoat transporti', kinds: ['bekat', 'metro'] },
];
/** Yoʻnalish ranglari (xaritada «eng zaif yoʻnalish» uslubi va kartadagi chiziqlar) */
export const SK_COL: Record<SkDim, string> = { maktab: '#2f6da8', mtm: '#b07a0c', poliklinika: '#c2416b', dorixona: '#2b7449', savdo: '#8b4a9c', transport: '#4c5bd4' };
/** Umumiy ball sinflari: past → yuqori (Joyshunos rangi #c0643a dan och kulranggacha) */
export const SK_BINS: [number, string, string][] = [[40, '#b4552e', '< 40'], [60, '#d07a4f', '40–60'], [75, '#e2a580', '60–75'], [90, '#ecd2bf', '75–90'], [101, '#dedbd4', '90–100']];
export const skColor = (v: number): string => (SK_BINS.find(([t]) => v < t) ?? SK_BINS[SK_BINS.length - 1])[1];

/** Masofa → ball (0–100): ≤ r — 100, ≥ 3r — 0 */
export function skScore(d: number, r: number): number {
  if (!Number.isFinite(d)) return 0;
  if (d <= r) return 100;
  return Math.max(0, Math.round(100 * (3 * r - d) / (2 * r)));
}

export interface SkBuilding {
  /** markaz (mahalliy metr) */ c: XY;
  /** har xizmat turiga masofa, m (topilmasa — Infinity) */ d: Partial<Record<Svc, number>>;
  /** 6 yoʻnalish bali (SK_DIMS tartibida) */ s: number[];
  comp: number; weak: number;
}
export interface SkResult { b: SkBuilding[]; mean: number[]; comp: number; bins: number[] }

const centroid = (ring: XY[]): XY => {
  let a = 0, x = 0, y = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]; a += f; x += (ring[j][0] + ring[i][0]) * f; y += (ring[j][1] + ring[i][1]) * f; }
  if (Math.abs(a) < 1e-6) { const n = ring.length; return [ring.reduce((s, p) => s + p[0], 0) / n, ring.reduce((s, p) => s + p[1], 0) / n]; }
  return [x / (3 * a), y / (3 * a)];
};

/**
 * @param net   piyoda tarmogʻi (mahalliy metr)
 * @param rings binolar konturlari (mahalliy metr, tashqi halqa)
 * @param pois  xizmat obyektlari turi bo'yicha (mahalliy metr) — OSM va «hisobga kiritilgan» qoʻshilganlar
 */
export function skScan(net: Net, rings: XY[][], pois: Partial<Record<Svc, XY[]>>): SkResult {
  const kinds = [...new Set(SK_DIMS.flatMap(d => d.kinds))];
  const R = Object.fromEntries(kinds.map(k => [k, svcDef(k).r])) as Record<Svc, number>;
  // har tur uchun bitta koʻp manbali Dijkstra (3 × radius dan nariga bormaydi — ball baribir 0)
  const field = new Map<Svc, Float64Array>();
  for (const k of kinds) { const src = pois[k] ?? []; if (src.length) field.set(k, sssp(net, src, 3 * R[k] + 400).D); }
  const out: SkBuilding[] = [];
  for (const ring of rings) {
    if (ring.length < 3) continue;
    const c = centroid(ring), s0 = snap(net, c, 250);
    const d: Partial<Record<Svc, number>> = {};
    for (const k of kinds) {
      const D = field.get(k); let best = Infinity;
      if (D && s0) { const [a, b] = net.segs[s0.seg]; best = s0.d + Math.min(D[a] + Math.hypot(net.xy[a][0] - s0.q[0], net.xy[a][1] - s0.q[1]), D[b] + Math.hypot(net.xy[b][0] - s0.q[0], net.xy[b][1] - s0.q[1])); }
      // tarmoqqa ulanmagan bino (yoki tur boʻyicha tarmoq yoʻq) — toʻgʻri masofa × 1,3; bir hovli ichidagi manba (≤ 80 m) — ham shunday
      // tarmoq uzilgan (manba boshqa boʻlakda) — ham toʻgʻri masofa × 1,3
      const fb = !s0 || !D || !Number.isFinite(best);
      for (const q of pois[k] ?? []) { const e = Math.hypot(c[0] - q[0], c[1] - q[1]); if (fb || e <= 80) best = Math.min(best, e * 1.3); }
      d[k] = best;
    }
    const s = SK_DIMS.map(dim => Math.max(...dim.kinds.map(k => skScore(d[k] ?? Infinity, R[k]))));
    let weak = 0; s.forEach((v, i) => { if (v < s[weak]) weak = i; });
    out.push({ c, d, s, comp: Math.round(s.reduce((a, v) => a + v, 0) / s.length), weak });
  }
  const n = Math.max(1, out.length);
  const mean = SK_DIMS.map((_, i) => Math.round(out.reduce((a, b) => a + b.s[i], 0) / n));
  const bins = SK_BINS.map(() => 0); for (const b of out) bins[SK_BINS.findIndex(([t]) => b.comp < t)]++;
  return { b: out, mean, comp: Math.round(out.reduce((a, b) => a + b.comp, 0) / n), bins };
}
