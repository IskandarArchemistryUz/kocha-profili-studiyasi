/**
 * Past qavatli uylar (31.10): avval uchastka (parsel), keyin uy dogʻi — koʻp qavatli seksiyalar qoidasidan alohida.
 * Qoidalar — loyiha hujjati «past-qavatli-uylar-qoidalari»:
 *  ShNQ 2.07.01-23: 74-band — tomorqa ≥ 200 m²; 75-band — yakka uy uchastkasi 400 m²; 96-band — uchastkaning ≥ 30 % koʻkalamzor;
 *   100-band — chegaradan turar joy devorigacha ≥ 3 m; 101-band — chegaradosh uylar bloklanishi mumkin (yon masofa 0);
 *  Strelka katalogi, 3-bob: bloklangan qator — ≤ 100 m va 10–15 uy, blok eni ≥ 3,6 (optimal ≥ 6) m, kirishdan qizil chiziqqacha 2–7 m;
 *  ShNQ 2.07.01-23, 56-jadval — qatorlar orasidagi yongʻin masofasi 6–15 m (bu yerda 8 m — I–III daraja, C0–C1 oraligʻi).
 * Uylar kvartal chetlari (qizil chiziq) boʻylab yoki ixtiyoriy chiziq boʻylab qoʻyiladi.
 */
import polygonClipping, { type MultiPolygon, type Polygon } from 'polygon-clipping';
import { signedArea, type XY } from './geo';

export type LowKind = 'yakka' | 'taunhaus';
export interface LowHouse { ring: XY[]; plot: XY[]; floors: number; kind: 'uy' | 'taunhaus'; /** yashil (bogʻ) ulushi uchastkada */ green: number }
export interface LowParams { plotW: number; plotD: number; front: number; side: number; depth: number; maxW: number; floors: number; rowMax: number; rowLen: number; gap: number; minPlot: number }
export const LOW: Record<LowKind, LowParams> = {
  // yakka: uchastka 20 × 22 = 440 m² (75-band ≥ 400), oldi 5 m (Strelka 2–7), yon 3 m (100-band), uy 10–12 m
  yakka: { plotW: 20, plotD: 22, front: 5, side: 3, depth: 10, maxW: 12, floors: 2, rowMax: 0, rowLen: 0, gap: 0, minPlot: 400 },
  // taunhaus: blok eni 6,5 m (Strelka: ≥ 6 optimal), chuqurligi 11,5 m, uchastka 6,5 × 30 ≈ 195 m² → 31 m (≥ 200, 74-band); qator ≤ 15 uy va ≤ 100 m, oraliq 8 m
  taunhaus: { plotW: 6.5, plotD: 31, front: 5, side: 0, depth: 11.5, maxW: 6.5, floors: 3, rowMax: 15, rowLen: 100, gap: 8, minPlot: 200 },
};

const close = (r: XY[]): [number, number][] => [...r, r[0]].map(p => [p[0], p[1]]);
const open = (r: [number, number][]): XY[] => r.slice(0, -1).map(p => [p[0], p[1]] as XY);
const areaOf = (r: XY[]) => Math.abs(signedArea(r));
const mpArea = (mp: MultiPolygon) => mp.reduce((s, p) => s + areaOf(open(p[0])) - p.slice(1).reduce((t, h) => t + areaOf(open(h)), 0), 0);
const tryOp = <T>(f: () => T, fb: T): T => { try { return f(); } catch { return fb; } };
const pin = (p: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };

/** Bitta toʻgʻri chiziq boʻlagi (a → b) boʻylab, chap tomonga (ichkariga) uchastkalar va uylar; free — joylash mumkin boʻlgan hudud */
function alongSeg(a: XY, b: XY, free: MultiPolygon, P: LowParams, kind: LowKind, out: LowHouse[], floors: number): MultiPolygon {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < P.plotW) return [];
  const U: XY = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], N: XY = [-U[1], U[0]];
  const W = (u: number, v: number): XY => [a[0] + U[0] * u + N[0] * v, a[1] + U[1] * u + N[1] * v];
  const strip: Polygon = [close([W(0, -0.5), W(L, -0.5), W(L, P.plotD), W(0, P.plotD)])];
  const zone = tryOp(() => polygonClipping.intersection(strip, free), [] as MultiPolygon);
  if (!zone.length) return [];
  const inZone = (p: XY) => zone.some(q => pin(p, open(q[0])) && !q.slice(1).some(h => pin(p, open(h))));
  // chiziq boʻylab uchastkalar; taunhaus — qatorlar (≤ rowMax uy, ≤ rowLen m), orasida gap
  let u = 0, inRow = 0, rowStart = 0;
  const used: Polygon[] = [];
  while (u + P.plotW <= L + 1e-6) {
    if (kind === 'taunhaus' && (inRow >= P.rowMax || u + P.plotW - rowStart > P.rowLen)) { u += P.gap; inRow = 0; rowStart = u; continue; }
    const u0 = u, u1 = u + P.plotW;
    const slab: Polygon = [close([W(u0, -0.5), W(u1, -0.5), W(u1, P.plotD), W(u0, P.plotD)])];
    const pl = tryOp(() => polygonClipping.intersection(slab, zone), [] as MultiPolygon);
    const plotA = mpArea(pl);
    // uchastka deyarli toʻliq (≥ 85 % toʻgʻri toʻrtburchak) va ≥ minPlot; uy toʻrtburchagi uchastka ichida
    const sideL = kind === 'taunhaus' && inRow === 0 ? 1.5 : P.side, hw = Math.min(P.maxW, P.plotW - sideL - (kind === 'taunhaus' ? 0 : P.side));
    const h0 = kind === 'taunhaus' ? u0 + sideL : u0 + (P.plotW - hw) / 2;
    const house = [W(h0, P.front), W(h0 + hw, P.front), W(h0 + hw, P.front + P.depth), W(h0, P.front + P.depth)];
    // uy atrofida chegaragacha: yon va orqa ≥ side (100-band, 3 m; bloklangan — 0), oldi — front
    const m = P.side, marg = [W(h0 - m + 0.01, P.front), W(h0 + hw + m - 0.01, P.front), W(h0 + hw + m - 0.01, P.front + P.depth + Math.max(m, 3)), W(h0 - m + 0.01, P.front + P.depth + Math.max(m, 3))];
    const ok = pl.length === 1 && plotA >= Math.max(P.minPlot * 0.98, 0.85 * P.plotW * P.plotD) && house.every(inZone) && marg.every(p => pin(p, open(pl[0][0])));
    if (!ok) {
      // qator uziladi: tugagan qatorning oxirgi uyi — oxirgi blok (yon 1,5 m)
      if (kind === 'taunhaus' && inRow > 0) { inRow = 0; rowStart = u1; }
      u += kind === 'taunhaus' ? P.plotW : P.plotW / 2;
      continue;
    }
    const plot = open(pl[0][0]);
    out.push({ ring: house, plot, floors, kind: kind === 'yakka' ? 'uy' : 'taunhaus', green: Math.max(0, 1 - (hw * P.depth + P.front * Math.min(3, hw)) / plotA) });
    used.push(pl[0]);
    inRow++; u = u1;
  }
  // qator oxiridagi uy: oʻng tomonda ham 1,5 m (oxirgi blok)
  if (kind === 'taunhaus') endTrim(out);
  return used.length ? tryOp(() => polygonClipping.union(used[0], ...used.slice(1)), [] as MultiPolygon) : [];
}

/** Taunhaus qatorlari: qoʻshnisi boʻlmagan oxirgi uy — tashqi yonidan 1,5 m qisqartiriladi (yongʻin va oʻtish uchun yon yoʻlak) */
function endTrim(hs: LowHouse[]): void {
  const touch = (p: LowHouse, q: LowHouse) => p !== q && p.ring.some(a => q.ring.some(b => Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.05));
  for (const h of hs) {
    if (h.kind !== 'taunhaus') continue;
    const nb = hs.filter(q => q.kind === 'taunhaus' && touch(h, q));
    if (nb.length !== 1) continue;
    const r = h.ring, sharedAtStart = nb[0].ring.some(b => Math.hypot(r[0][0] - b[0], r[0][1] - b[1]) < 0.05);
    if (sharedAtStart) {
      // oʻng (r[1], r[2]) tomoni ochiq — 1,5 m ga qisqartirish (agar boshlanishda allaqachon qisqartirilmagan boʻlsa)
      const ux = (r[1][0] - r[0][0]), uy = (r[1][1] - r[0][1]), l = Math.hypot(ux, uy); if (l < 5.5) continue;
      const k = 1.5 / l; r[1] = [r[1][0] - ux * k, r[1][1] - uy * k]; r[2] = [r[2][0] - ux * k, r[2][1] - uy * k];
    }
  }
}

/** Kvartal chetlari boʻylab (uzun qirralardan boshlab): har qirra — chiziq, burchaklarda uchastkalar ustma-ust tushmaydi */
export function lowriseBlock(block: XY[], kind: LowKind, floorsMax = 3): { houses: LowHouse[]; notes: string[] } {
  const P = LOW[kind], floors = Math.max(1, Math.min(floorsMax, P.floors));
  const ring = signedArea(block) < 0 ? block.slice().reverse() : block.slice();
  let free: MultiPolygon = [[close(ring)]];
  const edges = ring.map((p, i) => ({ a: p, b: ring[(i + 1) % ring.length], L: Math.hypot(ring[(i + 1) % ring.length][0] - p[0], ring[(i + 1) % ring.length][1] - p[1]) })).filter(e => e.L >= P.plotW).sort((x, y) => y.L - x.L);
  const out: LowHouse[] = [];
  for (const e of edges) {
    const used = alongSeg(e.a, e.b, free, P, kind, out, floors);
    if (used.length) free = tryOp(() => polygonClipping.difference(free, used), free);
  }
  const notes: string[] = [];
  if (out.length) notes.push(kind === 'yakka'
    ? `Yakka uylar: ${out.length} ta, uchastka ${P.plotW} × ${P.plotD} m ≥ 400 m² (75-band), oldi ${P.front} m, yon ${P.side} m (100-band), ${floors} qavat`
    : `Taunhauslar: ${out.length} ta blok, eni ${P.plotW} m, qator ≤ ${P.rowMax} uy va ≤ ${P.rowLen} m (Strelka), oraliq ${P.gap} m; uchastka ≥ 200 m² (74-band), ${floors} qavat`);
  else notes.push('Past qavatli uylar sigʻmadi — kvartal qirralari juda qisqa yoki tor');
  return { houses: out, notes };
}

/** Ixtiyoriy siniq chiziq boʻylab (side: 1 — chap, −1 — oʻng tomonga); area — joylash mumkin boʻlgan hudud (masalan, kvartal) */
export function lowriseAlong(line: XY[], side: 1 | -1, kind: LowKind, area: XY[] | null, floorsMax = 3): LowHouse[] {
  const P = LOW[kind], floors = Math.max(1, Math.min(floorsMax, P.floors)), out: LowHouse[] = [];
  const pts = side === 1 ? line : line.slice().reverse();
  let free: MultiPolygon = area ? [[close(signedArea(area) < 0 ? area.slice().reverse() : area)]] : [[close([[-1e5, -1e5], [1e5, -1e5], [1e5, 1e5], [-1e5, 1e5]])]];
  for (let i = 0; i + 1 < pts.length; i++) {
    const used = alongSeg(pts[i], pts[i + 1], free, P, kind, out, floors);
    if (used.length) free = tryOp(() => polygonClipping.difference(free, used), free);
  }
  return out;
}
