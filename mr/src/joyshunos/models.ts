/**
 * Joyshunos — tarmoq modellari (sof funksiyalar): piyoda yetish (izoxronlar), odamlar oqimi (model, beta), yoʻl shovqini (model, beta).
 * Kirish: OSM yoʻllari mahalliy metrlarda (x — sharq, y — shimol, markaz — tanlangan nuqta).
 *
 * Piyoda yetish: Dijkstra tarmoq boʻylab, 5 km/soat (83 m/daq). Maydon — yetib boriladigan yoʻllardan 40 m bufer (20 m katak).
 * Odamlar oqimi: tasodifiy (urugʻli) boshlangʻich nuqtalardan 800 m gacha eng qisqa yoʻllar daraxti; manzil vazni — tugun (1) + yaqin
 *   jamoat transporti va xizmatlar. Qirra oqimi = undan oʻtadigan manzillar vazni yigʻindisi. Bu «betweenness» ning yaqinlashuvi —
 *   haqiqiy sanoq emas; nisbiy taqqoslash uchun.
 * Shovqin: har yoʻl qirrasi — chekli chiziqli manba; Lden(10 m) yoʻl toifasiga qarab (taxminiy), masofa boʻyicha 3 dB / ikki baravar
 *   (silindrik tarqalish), hissa — qirraning koʻrinish burchagi ulushi; manbalar energetik qoʻshiladi. Binolar toʻsiqligi, tezlik va oqim maʼlumoti hisobga olinmagan.
 */
import type { XY } from '../core/geo';
import { buildNet, snap, WALKABLE, type Net } from '../core/services';

export const WALK = 83;   // m/daq ≈ 5 km/soat

export interface Road { cls: string; pts: XY[]; /** poi.ts roadFlags: b — koʻprik/tunnel, n — piyodaga taqiq, s — trotuar alohida/yoʻq */ f?: string }

/** Piyoda tarmogʻi (avtomagistrallarsiz, foot=no yoʻllarsiz) */
export function walkNet(roads: Road[]): Net { return buildNet(roads.filter(r => WALKABLE(r.cls) && !r.f?.includes('n')).map(r => r.pts)); }

/** 13.11: bola, qariya, aravacha, homilador uchun yurib boʻlmaydigan yoʻl — trassa (trunk), magistral estakada/tunnel,
 *  trotuari alohida chizilgan katta koʻcha qatnov qismi (u holda piyoda alohida chizilgan trotuardan yuradi) */
export function hardRoad(r: Road): boolean {
  if (r.cls === 'trunk') return true;
  if (!/^(primary|secondary|trunk)(_link)?$/.test(r.cls)) return false;
  return !!r.f && (r.f.includes('b') || r.f.includes('s'));
}
/** Qattiq tarmoq: asosiy tarmoqning oʻzi (bir xil tugun/qirra raqamlari), lekin «qattiq» qirralar oʻchirilgan (adj, grid, off) */
export function strictNet(net: Net, roads: Road[]): Net {
  const hard = roads.filter(r => WALKABLE(r.cls) && hardRoad(r)), off = new Uint8Array(net.segs.length);
  if (!hard.length) return { ...net, off };
  const C = 50, g = new Map<string, [XY, XY][]>();
  for (const r of hard) for (let i = 1; i < r.pts.length; i++) {
    const a = r.pts[i - 1], b = r.pts[i];
    for (let x = Math.floor(Math.min(a[0], b[0]) / C); x <= Math.floor(Math.max(a[0], b[0]) / C); x++) for (let y = Math.floor(Math.min(a[1], b[1]) / C); y <= Math.floor(Math.max(a[1], b[1]) / C); y++) { const k = `${x},${y}`; (g.get(k) || g.set(k, []).get(k)!).push([a, b]); }
  }
  const onHard = (p: XY) => {
    for (const [a, b] of g.get(`${Math.floor(p[0] / C)},${Math.floor(p[1] / C)}`) ?? []) {
      const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy; if (L2 < 1e-6) continue;
      const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2));
      if (Math.hypot(a[0] + dx * t - p[0], a[1] + dy * t - p[1]) < 0.6) return true;
    }
    return false;
  };
  const cut = new Set<number>();
  net.segs.forEach(([a, b], s) => { const pa = net.xy[a], pb = net.xy[b]; if (onHard([(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2])) { off[s] = 1; cut.add(a * net.xy.length + b); cut.add(b * net.xy.length + a); } });
  const N = net.xy.length, adj = net.adj.map((es, i) => es.filter(e => !cut.has(i * N + e.to)));
  const grid = new Map<string, number[]>(); for (const [k, v] of net.grid) { const f = v.filter(s => !off[s]); if (f.length) grid.set(k, f); }
  return { ...net, adj, grid, off };
}

/* ---------------- Dijkstra (oʻtmishdosh bilan) ---------------- */
export function sssp(net: Net, src: XY[], limit: number): { D: Float64Array; P: Int32Array } {
  const n = net.xy.length, D = new Float64Array(n).fill(Infinity), P = new Int32Array(n).fill(-1);
  const hk: number[] = [], hv: number[] = [];
  const push = (d: number, i: number) => { hk.push(d); hv.push(i); let k = hk.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (hk[p] <= hk[k]) break; [hk[p], hk[k]] = [hk[k], hk[p]]; [hv[p], hv[k]] = [hv[k], hv[p]]; k = p; } };
  const pop = (): [number, number] => {
    const d = hk[0], i = hv[0], ld = hk.pop()!, li = hv.pop()!;
    if (hk.length) { hk[0] = ld; hv[0] = li; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < hk.length && hk[l] < hk[m]) m = l; if (r < hk.length && hk[r] < hk[m]) m = r; if (m === k) break; [hk[m], hk[k]] = [hk[k], hk[m]]; [hv[m], hv[k]] = [hv[k], hv[m]]; k = m; } }
    return [d, i];
  };
  for (const p of src) { const s = snap(net, p, 400); if (!s) continue; for (const v of net.segs[s.seg]) { const d = s.d + Math.hypot(net.xy[v][0] - s.q[0], net.xy[v][1] - s.q[1]); if (d < D[v]) { D[v] = d; P[v] = -1; push(d, v); } } }
  while (hk.length) {
    const [d, i] = pop(); if (d > D[i] || d > limit) continue;
    for (const e of net.adj[i]) { const nd = d + e.w; if (nd < D[e.to]) { D[e.to] = nd; P[e.to] = i; push(nd, e.to); } }
  }
  return { D, P };
}

/* ---------------- piyoda yetish ---------------- */
export interface Reach { mins: number[]; area: number[]; km: number[]; seg: Int8Array; D: Float64Array; directness: number | null }
/** mins — chegaralar (daqiqa); seg[i] — qirra qaysi oraliqda (-1 — yetib boʻlmaydi) */
export function reach(net: Net, mins = [5, 10, 15], cell = 20, buf = 40): Reach {
  const lim = mins[mins.length - 1] * WALK, { D } = sssp(net, [[0, 0]], lim + 50);
  const seg = new Int8Array(net.segs.length).fill(-1), km = mins.map(() => 0);
  const cells = mins.map(() => new Set<number>()), K = Math.ceil((lim + buf * 2) / cell);
  const mark = (x: number, y: number, b: number) => { const r = Math.ceil(buf / cell), ci = Math.round(x / cell), cj = Math.round(y / cell); for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) { if ((i * i + j * j) * cell * cell > buf * buf) continue; const a = ci + i + K, c = cj + j + K; for (let q = b; q < mins.length; q++) cells[q].add(a * 100000 + c); } };
  let farSum = 0, farStraight = 0;
  net.segs.forEach(([a, b], s) => {
    if (net.off?.[s]) return;
    const d = Math.max(D[a], D[b]); if (!Number.isFinite(d)) return;
    const band = mins.findIndex(m => d <= m * WALK); if (band < 0) return; seg[s] = band;
    const pa = net.xy[a], pb = net.xy[b], L = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
    for (let q = band; q < mins.length; q++) km[q] += L / 1000;
    const n = Math.max(1, Math.ceil(L / (cell * 0.8))); for (let k = 0; k <= n; k++) mark(pa[0] + (pb[0] - pa[0]) * k / n, pa[1] + (pb[1] - pa[1]) * k / n, band);
  });
  // toʻgʻrilik: 400–1000 m uzoqlikdagi tugunlar uchun toʻgʻri masofa / tarmoq masofasi
  net.xy.forEach((p, i) => { const s = Math.hypot(p[0], p[1]); if (s > 400 && s < 1000 && Number.isFinite(D[i])) { farSum += D[i]; farStraight += s; } });
  return { mins, area: cells.map(c => c.size * cell * cell), km, seg, D, directness: farSum > 0 ? farStraight / farSum : null };
}

/* ---------------- odamlar oqimi (model) ---------------- */
export interface Attr { p: XY; w: number }
/** Qirralar oqim indeksi 0..1 (95-persentilga nisbatan). n — boshlangʻich nuqtalar soni, lim — yoʻl uzunligi chegarasi */
/** ow — boshlangʻich nuqta vazni (13.11: aholi zichligi / qavat maydoni); boʻlmasa — tugunlar teng ehtimolli */
export function flow(net: Net, R: number, attrs: Attr[], n = 140, lim = 800, seed = 7, ow?: (p: XY) => number): Float32Array {
  const N = net.xy.length, W = new Float32Array(N).fill(1);
  for (const a of attrs) { const s = snap(net, a.p, 120); if (!s) continue; const [u, v] = net.segs[s.seg]; W[u] += a.w / 2; W[v] += a.w / 2; }
  const inR = [] as number[]; net.xy.forEach((p, i) => { if (p[0] * p[0] + p[1] * p[1] <= R * R) inR.push(i); });
  let x = seed; const rnd = () => { x = (x * 16807) % 2147483647; return x / 2147483647; };
  const segOf = new Map<number, number>(); net.segs.forEach(([a, b], s) => { segOf.set(a * N + b, s); segOf.set(b * N + a, s); });
  const F = new Float32Array(net.segs.length);
  const cum: number[] = []; let tot = 0; for (const i of inR) { tot += ow ? Math.max(0, ow(net.xy[i])) : 1; cum.push(tot); }
  const pick = () => { const r = rnd() * tot; let lo = 0, hi = cum.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < r) lo = mid + 1; else hi = mid; } return inR[lo]; };
  for (let k = 0; k < Math.min(n, inR.length) && tot > 0; k++) {
    const o = pick(), { D, P } = sssp(net, [net.xy[o]], lim);
    const reached: number[] = []; for (let i = 0; i < N; i++) if (D[i] <= lim) reached.push(i);
    reached.sort((a, b) => D[b] - D[a]);
    const sub = new Float32Array(N); for (const i of reached) sub[i] += W[i];
    for (const i of reached) { const p = P[i]; if (p < 0) continue; const s = segOf.get(p * N + i); if (s != null) F[s] += sub[i]; sub[p] += sub[i]; }
  }
  const sorted = Array.from(F).filter(v => v > 0).sort((a, b) => a - b), p95 = sorted[Math.floor(sorted.length * 0.95)] || 1;
  for (let i = 0; i < F.length; i++) F[i] = Math.min(1, F[i] / p95);
  return F;
}
/** Markaz atrofidagi (r m) eng katta oqim indeksi */
export function flowAt(net: Net, F: Float32Array, r = 80): number {
  let m = 0; net.segs.forEach(([a, b], s) => { const pa = net.xy[a], pb = net.xy[b], mx = (pa[0] + pb[0]) / 2, my = (pa[1] + pb[1]) / 2; if (mx * mx + my * my <= r * r) m = Math.max(m, F[s]); });
  return m;
}
export const flowClass = (v: number) => (v >= 0.66 ? 'Yuqori' : v >= 0.33 ? 'Oʻrtacha' : 'Past');

/* ---------------- shovqin (model) ---------------- */
/** Lden, dB(A), yoʻl oʻqidan 10 m da — toifa boʻyicha taxminiy (shahar tezliklari) */
export const NOISE_SRC: Record<string, number> = { motorway: 76, trunk: 74, primary: 71, secondary: 68, tertiary: 64, unclassified: 58, residential: 56, living_street: 50, service: 52, motorway_link: 70, trunk_link: 69, primary_link: 67, secondary_link: 64, tertiary_link: 60 };
export const NOISE_BINS: [number, string, string][] = [[50, '#e9f0e4', '< 50'], [55, '#d6e7b8', '50–55'], [60, '#f3dd8a', '55–60'], [65, '#f0a85c', '60–65'], [70, '#d9603f', '65–70'], [Infinity, '#8e2c4f', '≥ 70']];
export const noiseColor = (db: number) => NOISE_BINS.find(([t]) => db < t)![1];

/** Shovqin toʻri: n×n, qadam step (m), qiymat — Lden dB(A) */
export function noiseGrid(roads: Road[], R: number, step: number): { n: number; step: number; v: Float32Array } {
  const src: { a: XY; b: XY; L: number }[] = [];
  for (const r of roads) { const L = NOISE_SRC[r.cls]; if (L == null) continue; for (let i = 1; i < r.pts.length; i++) src.push({ a: r.pts[i - 1], b: r.pts[i], L }); }
  const C = 100, grid = new Map<string, number[]>();
  src.forEach((s, k) => { const x0 = Math.min(s.a[0], s.b[0]), x1 = Math.max(s.a[0], s.b[0]), y0 = Math.min(s.a[1], s.b[1]), y1 = Math.max(s.a[1], s.b[1]); for (let i = Math.floor(x0 / C); i <= Math.floor(x1 / C); i++) for (let j = Math.floor(y0 / C); j <= Math.floor(y1 / C); j++) { const key = `${i},${j}`; (grid.get(key) || grid.set(key, []).get(key)!).push(k); } });
  const n = Math.round(2 * R / step) + 1, v = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = -R + i * step, y = -R + j * step; if (x * x + y * y > R * R * 1.02) { v[j * n + i] = NaN; continue; }
    const ci = Math.floor(x / C), cj = Math.floor(y / C), seen = new Set<number>(); let E = 0;
    for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) for (const k of grid.get(`${ci + a},${cj + b}`) ?? []) {
      if (seen.has(k)) continue; seen.add(k);
      // chekli chiziqli manba: cheksiz chiziq intensivligi × koʻrinish burchagi ulushi (Δθ/π)
      const s = src[k], dx = s.b[0] - s.a[0], dy = s.b[1] - s.a[1], len = Math.hypot(dx, dy); if (len < 0.5) continue;
      const ux = dx / len, uy = dy / len, ax = s.a[0] - x, ay = s.a[1] - y;
      const ta = ax * ux + ay * uy, tb = ta + len, dp = Math.max(5, Math.abs(ax * uy - ay * ux));
      if (Math.min(Math.abs(ta), Math.abs(tb)) > 400 && ta * tb > 0) continue;
      const dth = Math.atan(tb / dp) - Math.atan(ta / dp);
      E += (dth / Math.PI) * Math.pow(10, (s.L - 10 * Math.log10(dp / 10)) / 10);
    }
    v[j * n + i] = E > 0 ? 10 * Math.log10(E) : 35;
  }
  return { n, step, v };
}
export function noiseAt(g: { n: number; step: number; v: Float32Array }): number { const c = (g.n - 1) >> 1; return g.v[c * g.n + c]; }
export function noiseShare(g: { n: number; v: Float32Array }, th: number): number { let a = 0, t = 0; for (const x of g.v) { if (Number.isNaN(x)) continue; t++; if (x >= th) a++; } return t ? a / t : 0; }
