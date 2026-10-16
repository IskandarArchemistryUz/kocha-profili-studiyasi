/**
 * Yuza qizishi — TAXMIN (skrining): yoz kuni (15 iyul, 11:00–17:00) yer yuzasi harorati qoplama turi va soyaga qarab.
 * T = T_quyosh − soya_ulushi × (T_quyosh − T_soya); daraxt toji ostida — soya ulushi kamida 0,85.
 * Qoplama haroratlari — issiq quruq iqlim (havo ~38–40 °C) uchun adabiyotdagi odatiy oraliqlardan yaxlitlangan;
 * bu sunʼiy yoʻldosh oʻlchovi (Landsat LST) emas — loyiha variantlarini solishtirish uchun.
 */
import type { XY } from './geo';
import type { PartKind } from './profiles';
import { offsetLine } from '../scene/streets3d';

export type Cover = 'asfalt' | 'trotuar' | 'hovli' | 'ochiq' | 'maysa' | 'daraxtzor' | 'suv';
/** [quyoshda, soyada], °C */
export const COVER_T: Record<Cover, [number, number]> = {
  asfalt: [62, 41], trotuar: [52, 38], hovli: [52, 37], ochiq: [54, 38], maysa: [37, 32], daraxtzor: [33, 30], suv: [29, 28],
};
export const COVER_NAME: Record<Cover, string> = { asfalt: 'Asfalt', trotuar: 'Trotuar, maydon', hovli: 'Hovli (aralash qoplama)', ochiq: 'Ochiq tuproq / nomaʼlum', maysa: 'Maysa, park', daraxtzor: 'Daraxtzor', suv: 'Suv' };

export const HEAT_BINS: { max: number; color: number; label: string }[] = [
  { max: 34, color: 0x2c7bb6, label: '< 34 °C' },
  { max: 40, color: 0x8fc3dd, label: '34–40 °C' },
  { max: 46, color: 0xf3eaa0, label: '40–46 °C' },
  { max: 52, color: 0xf6b26b, label: '46–52 °C' },
  { max: 58, color: 0xe8603c, label: '52–58 °C' },
  { max: 999, color: 0xb2182b, label: '≥ 58 °C' },
];
export const heatColor = (t: number) => HEAT_BINS.find(b => t < b.max)!.color;

export interface HeatInputs {
  /** loyiha koʻchalari: oʻq va profil tasmalari */
  streets: { axis: XY[]; parts: { k: PartKind; w: number }[] }[];
  /** kvartallar (uchastka ichida): funksiyasi bilan */
  blocks: { rings: XY[][]; use: string }[];
  site: XY[][] | null;
  roads: { pts: XY[]; w: number; cls: string }[];
  green: { rings: XY[][]; kind: string }[];
  water: XY[][][];
  trees: XY[];
  /** hovlilar (core/landscape.ts) */
  yards?: { green: XY[][][]; hard: XY[][][] }[];
}

type BB = [number, number, number, number];
const bbOf = (pts: XY[], pad = 0): BB => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const p of pts) { a = Math.min(a, p[0]); b = Math.min(b, p[1]); c = Math.max(c, p[0]); d = Math.max(d, p[1]); } return [a - pad, b - pad, c + pad, d + pad]; };
const inBB = (p: XY, b: BB) => p[0] >= b[0] && p[0] <= b[2] && p[1] >= b[1] && p[1] <= b[3];
const inRing = (p: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
const inPoly = (p: XY, rings: XY[][]) => inRing(p, rings[0]) && !rings.slice(1).some(r => inRing(p, r));
/** nuqtadan siniq chiziqqacha masofa */
const lineDist = (p: XY, l: XY[]) => { let m = Infinity; for (let i = 1; i < l.length; i++) { const a = l[i - 1], b = l[i], dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0; m = Math.min(m, Math.hypot(a[0] + dx * t - p[0], a[1] + dy * t - p[1])); } return m; };

/** Qoplama tasniflagichi: tayyorlangan indekslar bilan (bir necha ming nuqta uchun tez) */
export function coverClassifier(I: HeatInputs): { cover: (p: XY) => Cover; canopy: (p: XY) => boolean } {
  const site = I.site, siteBB = site ? bbOf(site[0]) : null;
  // loyiha koʻchalari: har tasma — oʻqdan siljigan chiziq ± yarim kenglik
  const strips = I.streets.flatMap(s => { const W = s.parts.reduce((a, p) => a + p.w, 0); let o = -W / 2; return s.parts.map(p => { const mid = o + p.w / 2; o += p.w; const line = offsetLine(s.axis, mid); return { line, half: p.w / 2, k: p.k, bb: bbOf(line, p.w / 2 + 0.5) }; }); });
  const blocks = I.blocks.map(b => ({ ...b, bb: bbOf(b.rings[0]) }));
  const yardsIx = (I.yards ?? []).map(y => ({ ...y, bb: bbOf([...y.green, ...y.hard].flatMap(q => q[0] ?? [])) }));
  const sw = (c: string) => /^(motorway|trunk|primary|secondary)/.test(c) ? 4 : /^tertiary/.test(c) ? 3 : /^(service|footway|path|steps|track|pedestrian|cycleway)/.test(c) ? 0 : 2.2;
  const roads = I.roads.map(r => ({ ...r, s: sw(r.cls), foot: /^(footway|path|steps|pedestrian|cycleway)$/.test(r.cls), bb: bbOf(r.pts, r.w / 2 + 4.5) }));
  const green = I.green.map(g => ({ ...g, bb: bbOf(g.rings[0]), wood: /wood|forest|scrub|orchard/.test(g.kind) }));
  const water = I.water.map(w => ({ rings: w, bb: bbOf(w[0]) }));
  // daraxtlar: 8 m li katakchalar xeshi
  const H = new Map<string, XY[]>(), key = (x: number, y: number) => `${Math.floor(x / 8)},${Math.floor(y / 8)}`;
  for (const t of I.trees) { const k = key(t[0], t[1]); (H.get(k) ?? H.set(k, []).get(k)!).push(t); }
  const canopy = (p: XY) => { for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const t of H.get(key(p[0] + dx * 8, p[1] + dy * 8)) ?? []) if (Math.hypot(t[0] - p[0], t[1] - p[1]) <= 4) return true; return false; };
  const cover = (p: XY): Cover => {
    const inSite = !!site && inBB(p, siteBB!) && inPoly(p, site);
    for (const s of strips) if (inBB(p, s.bb) && lineDist(p, s.line) <= s.half) return s.k === 'yashil' || s.k === 'ajratuvchi' ? 'maysa' : s.k === 'trotuar' ? 'trotuar' : 'asfalt';
    if (inSite) {
      for (const y of yardsIx) if (inBB(p, y.bb)) { if (y.green.some(g => inPoly(p, g))) return 'maysa'; if (y.hard.some(g => inPoly(p, g))) return 'trotuar'; }
      for (const b of blocks) if (inBB(p, b.bb) && inPoly(p, b.rings)) return b.use === 'yashil' || b.use === 'sport' ? 'maysa' : b.use === 'maydon' ? 'trotuar' : b.use === 'avtoturargoh' ? 'asfalt' : 'hovli';
      return 'hovli';
    }
    for (const w of water) if (inBB(p, w.bb) && inPoly(p, w.rings)) return 'suv';
    for (const r of roads) if (inBB(p, r.bb)) { const d = lineDist(p, r.pts); if (d <= r.w / 2) return r.foot ? 'trotuar' : 'asfalt'; if (d <= r.w / 2 + r.s) return 'trotuar'; }
    for (const g of green) if (inBB(p, g.bb) && inPoly(p, g.rings)) return g.wood ? 'daraxtzor' : 'maysa';
    return 'ochiq';
  };
  return { cover, canopy };
}

/** Yuza harorati: qoplama, soya ulushi (0–1) va daraxt toji */
export function surfaceT(c: Cover, shade: number, underTree: boolean): number {
  const [ts, tsh] = COVER_T[c], s = underTree ? Math.max(shade, 0.85) : shade;
  return ts - s * (ts - tsh) - (underTree ? 1 : 0);
}
