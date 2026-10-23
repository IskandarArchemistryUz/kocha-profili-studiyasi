/**
 * Koʻcha tahlili (Joyshunos «Koʻcha» rejimi) — sof hisoblar, tarmoqsiz, vitest bilan tekshiriladi.
 * A nuqtadan B gacha OSM yoʻl grafida eng qisqa yoʻl → koʻcha oʻqi → ~20 m boʻlaklar → har boʻlakda ikki tomonga nur:
 * fasadgacha masofa, bino balandligi, daraxtlar, trotuar nuqtalarida soya. Birliklar — mahalliy metr (x — sharq, y — shimol).
 * Meʼyorlar: ShNQ 2.07.06-24 (2-ilova 1-jadval — piyoda yoʻlagi eni; 12-band — piyoda oʻtish joylari 300–500 m;
 * 26-band — bekatlar 400–600 m). H/W va soya uchun meʼyor yoʻq — «andoza» (amaliyotdagi oraliq) deb koʻrsatiladi.
 */
import type { XY } from '../core/geo';
import { insolation, type Prism, type SunStep } from '../core/sun';

export interface SRoad { id: number; pts: XY[]; cls: string; w: number; lanes?: number; oneway?: boolean; name?: string; maxspeed?: number }
export interface SBld { ring: XY[]; h: number }
/** Qoʻshimcha OSM nuqtalari koʻcha boʻylab: piyoda oʻtish joyi, svetofor, bekat, doʻkon/xizmat */
export type SPoiKind = 'crossing' | 'signals' | 'stop' | 'shop';
export interface SPoi { p: XY; kind: SPoiKind; name?: string }

export const CAR = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'living_street', 'service', 'road', 'motorway_link', 'trunk_link', 'primary_link', 'secondary_link', 'tertiary_link']);
const WALK_ONLY = new Set(['footway', 'path', 'pedestrian', 'steps', 'cycleway', 'track', 'bridleway', 'corridor']);

/* ---------------- 1. A → B yoʻli ---------------- */
export interface Route {
  pts: XY[];
  /** har oʻq kesmasi (pts[i] → pts[i+1]) qaysi yoʻlga tegishli */
  road: SRoad[];
  len: number;
  /** yoʻl boʻyidagi chorrahalar (avtomobil yoʻllari ≥ 3 tarmoq): masofa, m */
  junctions: number[];
}
const key = (p: XY) => `${Math.round(p[0] * 2)}:${Math.round(p[1] * 2)}`;
const dist = (a: XY, b: XY) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** Eng yaqin kesmaga proyeksiya */
function nearestOnRoads(roads: SRoad[], p: XY): { r: number; i: number; t: number; q: XY; d: number } | null {
  let best: { r: number; i: number; t: number; q: XY; d: number } | null = null;
  roads.forEach((rd, r) => {
    for (let i = 0; i + 1 < rd.pts.length; i++) {
      const a = rd.pts[i], b = rd.pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)), q: XY = [a[0] + dx * t, a[1] + dy * t], d = dist(p, q);
      if (!best || d < best.d) best = { r, i, t, q, d };
    }
  });
  return best;
}

/**
 * A va B ni eng yaqin yoʻlga bogʻlab, grafda eng qisqa yoʻl (Dijkstra). Piyoda yoʻlaklari 1,6 baravar «qimmat» —
 * koʻcha boʻylab yurish afzal. Nuqta yoʻldan > snapMax uzoq boʻlsa — null.
 */
export function routeAB(roads0: SRoad[], A: XY, B: XY, snapMax = 60): Route | null {
  const roads = roads0.filter(r => r.pts.length > 1 && r.cls !== 'motorway');
  const sa = nearestOnRoads(roads, A), sb = nearestOnRoads(roads, B);
  if (!sa || !sb || sa.d > snapMax || sb.d > snapMax) return null;
  const idx = new Map<string, number>(), xy: XY[] = [], adj: { to: number; w: number; L: number; r: number }[][] = [];
  const node = (p: XY): number => { const k = key(p); let i = idx.get(k); if (i == null) { i = xy.length; idx.set(k, i); xy.push(p); adj.push([]); } return i; };
  const edge = (a: number, b: number, r: number) => { if (a === b) return; const L = dist(xy[a], xy[b]), f = WALK_ONLY.has(roads[r].cls) ? 1.6 : 1; adj[a].push({ to: b, w: L * f, L, r }); adj[b].push({ to: a, w: L * f, L, r }); };
  const vA = { ...sa }, vB = { ...sb };
  roads.forEach((rd, r) => {
    let prev = node(rd.pts[0]);
    for (let i = 0; i + 1 < rd.pts.length; i++) {
      // A va B tushgan kesma ikkiga boʻlinadi (virtual tugun)
      const cuts: { t: number; q: XY; tag: 'A' | 'B' }[] = [];
      if (vA.r === r && vA.i === i) cuts.push({ t: vA.t, q: vA.q, tag: 'A' });
      if (vB.r === r && vB.i === i) cuts.push({ t: vB.t, q: vB.q, tag: 'B' });
      cuts.sort((x, y) => x.t - y.t);
      for (const c of cuts) { const n = node(c.q); edge(prev, n, r); prev = n; }
      const nx = node(rd.pts[i + 1]); edge(prev, nx, r); prev = nx;
    }
  });
  const ia = idx.get(key(vA.q))!, ib = idx.get(key(vB.q))!;
  if (ia === ib) return null;
  // Dijkstra (ikkilik uyum)
  const N = xy.length, D = new Float64Array(N).fill(Infinity), P = new Int32Array(N).fill(-1), PR = new Int32Array(N).fill(-1), heap: [number, number][] = [];
  const push = (d: number, i: number) => { heap.push([d, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = (): [number, number] => { const top = heap[0], last = heap.pop()!; if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  D[ia] = 0; push(0, ia);
  while (heap.length) {
    const [d, i] = pop(); if (d > D[i]) continue; if (i === ib) break;
    for (const e of adj[i]) { const nd = d + e.w; if (nd < D[e.to]) { D[e.to] = nd; P[e.to] = i; PR[e.to] = e.r; push(nd, e.to); } }
  }
  if (!Number.isFinite(D[ib])) return null;
  const seq: number[] = [], rs: number[] = [];
  for (let i = ib; i !== -1; i = P[i]) { seq.push(i); if (P[i] !== -1) rs.push(PR[i]); }
  seq.reverse(); rs.reverse();
  const pts = seq.map(i => xy[i]), road = rs.map(r => roads[r]);
  let len = 0; const junctions: number[] = [];
  for (let k = 0; k < seq.length; k++) {
    if (k) len += dist(pts[k - 1], pts[k]);
    if (k > 0 && k < seq.length - 1) { const nCar = adj[seq[k]].filter(e => CAR.has(roads[e.r].cls)).length; if (nCar >= 3) junctions.push(len); }
  }
  return { pts, road, len, junctions };
}

/* ---------------- 2. boʻlaklar va nurlar ---------------- */
export interface Side { d: number | null; h: number | null }
export interface Slice {
  s: number; len: number; p: XY; t: XY; n: XY; road: SRoad;
  /** chap (n tomonda) va oʻng tomondagi birinchi fasad: masofa oʻqdan, balandlik */
  L: Side; R: Side;
  /** daraxtlar soni (boʻlak ichida, koʻcha koridorida) */
  trees: number;
  /** trotuar nuqtalari: chap, oʻng — 14:00 dagi quyosh (1 — quyoshda, 0 — soyada) va kun davomidagi quyoshli soatlar */
  sun14: [number, number]; sunH: [number, number];
}
/** Yoʻl boʻylab har step metrda boʻlak (oxirgisi qisqaroq boʻlishi mumkin) */
export function slicesOf(rt: Route, step = 20): Omit<Slice, 'L' | 'R' | 'trees' | 'sun14' | 'sunH'>[] {
  const out: Omit<Slice, 'L' | 'R' | 'trees' | 'sun14' | 'sunH'>[] = [];
  const cum: number[] = [0]; for (let i = 1; i < rt.pts.length; i++) cum.push(cum[i - 1] + dist(rt.pts[i - 1], rt.pts[i]));
  const at = (s: number) => { let i = 0; while (i < cum.length - 2 && cum[i + 1] < s) i++; const a = rt.pts[i], b = rt.pts[i + 1], L = cum[i + 1] - cum[i] || 1, f = (s - cum[i]) / L, t: XY = [(b[0] - a[0]) / L, (b[1] - a[1]) / L]; return { p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f] as XY, t, road: rt.road[i] }; };
  const n = Math.max(1, Math.ceil(rt.len / step - 0.25));
  for (let k = 0; k < n; k++) {
    const s0 = k * step, s1 = k === n - 1 ? rt.len : (k + 1) * step, m = at((s0 + s1) / 2);
    out.push({ s: s0, len: s1 - s0, p: m.p, t: m.t, n: [-m.t[1], m.t[0]], road: m.road });
  }
  return out;
}

/** Binolar qirralari uchun toʻr (nur kesishuvini tez topish) */
function edgeGrid(blds: SBld[], C = 25) {
  const g = new Map<string, number[]>(), E: { a: XY; b: XY; h: number }[] = [];
  blds.forEach(b => { const r = b.ring; for (let i = 0; i < r.length; i++) { const a = r[i], c = r[(i + 1) % r.length]; const e = E.length; E.push({ a, b: c, h: b.h });
    const x0 = Math.floor(Math.min(a[0], c[0]) / C), x1 = Math.floor(Math.max(a[0], c[0]) / C), y0 = Math.floor(Math.min(a[1], c[1]) / C), y1 = Math.floor(Math.max(a[1], c[1]) / C);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) { const k = `${x}:${y}`; let l = g.get(k); if (!l) g.set(k, l = []); l.push(e); } } });
  const near = (p: XY, r: number): number[] => { const s = new Set<number>(); for (let x = Math.floor((p[0] - r) / C); x <= Math.floor((p[0] + r) / C); x++) for (let y = Math.floor((p[1] - r) / C); y <= Math.floor((p[1] + r) / C); y++) for (const e of g.get(`${x}:${y}`) ?? []) s.add(e); return [...s]; };
  return { E, near };
}
/** Nur (p + u·d, 0 < d ≤ max) bilan birinchi bino qirrasi */
function rayHit(p: XY, u: XY, max: number, G: ReturnType<typeof edgeGrid>, cand: number[]): Side {
  let best = max + 1, h: number | null = null;
  for (const k of cand) {
    const { a, b, h: hh } = G.E[k], ex = b[0] - a[0], ey = b[1] - a[1], den = u[0] * ey - u[1] * ex; if (Math.abs(den) < 1e-9) continue;
    const wx = a[0] - p[0], wy = a[1] - p[1], d = (wx * ey - wy * ex) / den, s = (wx * u[1] - wy * u[0]) / den;
    if (d > 0.3 && d < best && s >= 0 && s <= 1) { best = d; h = hh; }
  }
  return best <= max ? { d: best, h } : { d: null, h: null };
}

export interface SunInput { step14: SunStep; day: SunStep[] }
/**
 * Boʻlaklarni toʻldirish: fasadlar (nur, ≤ maxD m), daraxtlar, trotuar nuqtalarida soya.
 * Trotuar nuqtasi — qatnov qismi chetidan 2 m (fasad yaqinroq boʻlsa — chet va fasad oʻrtasi).
 * Daraxtlar soya uchun 8 qirrali prizma: toj radiusi 3 m, balandligi 8 m (andoza).
 */
export function analyzeSlices(rt: Route, blds: SBld[], trees: XY[], sun: SunInput | null, step = 20, maxD = 80): Slice[] {
  const S0 = slicesOf(rt, step), G = edgeGrid(blds);
  const sl: Slice[] = S0.map(s => {
    const cand = G.near(s.p, maxD), L = rayHit(s.p, s.n, maxD, G, cand), R = rayHit(s.p, [-s.n[0], -s.n[1]], maxD, G, cand);
    const half = s.road.w / 2;
    let tr = 0; for (const q of trees) { const dx = q[0] - s.p[0], dy = q[1] - s.p[1], al = dx * s.t[0] + dy * s.t[1], ac = Math.abs(dx * s.n[0] + dy * s.n[1]); if (Math.abs(al) <= s.len / 2 && ac <= half + 12) tr++; }
    return { ...s, L, R, trees: tr, sun14: [1, 1], sunH: [0, 0] };
  });
  if (sun) {
    const prisms: Prism[] = blds.map(b => ({ ring: b.ring, top: b.h }));
    for (const q of trees) { const ring: XY[] = []; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ring.push([q[0] + 3 * Math.cos(a), q[1] + 3 * Math.sin(a)]); } prisms.push({ ring, top: 8 }); }
    const pts: XY[] = [];
    for (const s of sl) for (const [side, sg] of [[s.L, 1], [s.R, -1]] as [Side, number][]) {
      const half = s.road.w / 2, off = side.d != null && side.d < half + 4 ? (half + side.d) / 2 : half + 2;
      pts.push([s.p[0] + s.n[0] * off * sg, s.p[1] + s.n[1] * off * sg]);
    }
    const z = pts.map(() => 1.5), a14 = insolation(pts, z, prisms, [{ ...sun.step14, dt: 1 }]), aD = insolation(pts, z, prisms, sun.day);
    sl.forEach((s, i) => { s.sun14 = [a14[2 * i] > 0 ? 1 : 0, a14[2 * i + 1] > 0 ? 1 : 0]; s.sunH = [aD[2 * i], aD[2 * i + 1]]; });
  }
  return sl;
}

/* ---------------- 3. koʻrsatkichlar ---------------- */
/** OSM sinfi → ShNQ toifasi (andoza: OSM sinfidan; haqiqiy toifa — bosh rejada) va eng kichik piyoda yoʻlagi eni */
export interface Cat { id: 'shahar' | 'tuman' | 'mahalliy' | 'piyoda'; name: string; sidewalk: [number, number] | null }
export function catOf(cls: string): Cat {
  if (/^(motorway|trunk|primary)(_link)?$/.test(cls)) return { id: 'shahar', name: 'Shahar ahamiyatidagi magistral koʻcha', sidewalk: [3.0, 4.5] };
  if (/^(secondary|tertiary)(_link)?$/.test(cls)) return { id: 'tuman', name: 'Tuman ahamiyatidagi magistral koʻcha', sidewalk: [2.25, 2.25] };
  if (WALK_ONLY.has(cls)) return { id: 'piyoda', name: 'Piyoda yoʻlagi', sidewalk: null };
  return { id: 'mahalliy', name: 'Mahalliy ahamiyatdagi koʻcha', sidewalk: [2.0, 2.0] };
}
/** H/W oraligʻi (andoza — amaliyotdagi tasnif, meʼyor emas) */
export const HW_BINS: [number, string, string][] = [[0, '#d9e4ef', 'ochiq (< 0,3)'], [0.3, '#9fbcd6', 'moʻtadil (0,3–0,6)'], [0.6, '#5b86b0', 'xona (0,6–1)'], [1, '#2c4f78', 'kanyon (> 1)']];
export const hwColor = (v: number | null) => v == null ? '#cfccc5' : HW_BINS.reduce((c, [t, col]) => (v >= t ? col : c), HW_BINS[0][1]);

export interface Gap { from: number; to: number; len: number }
/** Nuqtalarni oʻqqa proyeksiya qilish: masofa (s) va oʻqdan uzoqlik ≤ maxOff */
export function along(rt: Route, pts: SPoi[], maxOff = 25): (SPoi & { s: number; off: number })[] {
  const out: (SPoi & { s: number; off: number })[] = [];
  for (const q of pts) {
    let best: { s: number; off: number } | null = null, cum = 0;
    for (let i = 0; i + 1 < rt.pts.length; i++) {
      const a = rt.pts[i], b = rt.pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, t = Math.max(0, Math.min(1, ((q.p[0] - a[0]) * dx + (q.p[1] - a[1]) * dy) / (L * L)));
      const off = Math.hypot(q.p[0] - (a[0] + dx * t), q.p[1] - (a[1] + dy * t));
      if (!best || off < best.off) best = { s: cum + L * t, off };
      cum += L;
    }
    if (best && best.off <= maxOff) out.push({ ...q, ...best });
  }
  return out.sort((x, y) => x.s - y.s);
}
/** Ketma-ket nuqtalar orasidagi eng katta oraliq (boshi va oxiri bilan) */
export function maxGap(ss: number[], len: number): Gap | null {
  if (!len) return null;
  const xs = [0, ...ss.filter(s => s > 0 && s < len), len];
  let g: Gap | null = null;
  for (let i = 1; i < xs.length; i++) { const l = xs[i] - xs[i - 1]; if (!g || l > g.len) g = { from: xs[i - 1], to: xs[i], len: l }; }
  return g;
}

export interface StreetSummary {
  len: number; name: string; cls: string; cat: Cat;
  junctions: number; junctionGap: number | null;
  /** qatnov qismi (OSM width / lanes × 3,5 / sinf andozasi) va fasaddan fasadgacha (median) */
  carriage: number; corridor: number | null;
  /** fasadgacha boʻsh joy (qatnov qismi chetidan): chap / oʻng median */
  freeL: number | null; freeR: number | null;
  carShare: number | null;
  hw: number | null; wall: number; wallL: number; wallR: number; heightMed: number | null;
  treesPer100: number; shade14: number | null; sunHours: number | null;
  crossings: number; crossGap: Gap | null; stops: number; stopGap: Gap | null; shopsPer100: number;
  maxspeed: number | null; lanes: number | null; oneway: boolean;
}
const med = (a: number[]) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
/** Fasad «koʻcha chizigʻida»: qatnov qismi chetidan ≤ 15 m (andoza) */
export const FRONT_SETBACK = 15;
export function summarize(rt: Route, sl: Slice[], pois: (SPoi & { s: number })[], sunOn: boolean): StreetSummary {
  // asosiy yoʻl — uzunlik boʻyicha eng koʻp
  const byRoad = new Map<SRoad, number>(); for (let i = 0; i < rt.road.length; i++) byRoad.set(rt.road[i], (byRoad.get(rt.road[i]) ?? 0) + dist(rt.pts[i], rt.pts[i + 1]));
  const main = [...byRoad.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const names = new Map<string, number>(); byRoad.forEach((L, r) => { if (r.name) names.set(r.name, (names.get(r.name) ?? 0) + L); });
  const name = [...names.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
  const W = (s: Slice) => s.L.d != null && s.R.d != null ? s.L.d + s.R.d : null;
  const corr = med(sl.map(W).filter((v): v is number => v != null));
  const carriage = med(sl.map(s => s.road.w)) ?? main.w;
  const front = (d: number | null, s: Slice) => d != null && d - s.road.w / 2 <= FRONT_SETBACK;
  const wl = sl.filter(s => front(s.L.d, s)).length / sl.length, wr = sl.filter(s => front(s.R.d, s)).length / sl.length;
  const hws = sl.map(s => { const w = W(s); const hs = [s.L.h, s.R.h].filter((v): v is number => v != null); return w && hs.length ? hs.reduce((a, b) => a + b, 0) / hs.length / w : null; }).filter((v): v is number => v != null);
  const hAll = sl.flatMap(s => [s.L.h, s.R.h]).filter((v): v is number => v != null);
  const L = rt.len || 1;
  const cr = pois.filter(p => p.kind === 'crossing' || p.kind === 'signals').map(p => p.s);
  const crU: number[] = []; for (const s of cr) if (!crU.length || s - crU[crU.length - 1] > 15) crU.push(s);
  const st = pois.filter(p => p.kind === 'stop').map(p => p.s), stU: number[] = []; for (const s of st) if (!stU.length || s - stU[stU.length - 1] > 40) stU.push(s);
  const jg = rt.junctions.length ? (maxGap(rt.junctions, rt.len)?.len ?? null) : rt.len;
  return {
    len: rt.len, name, cls: main.cls, cat: catOf(main.cls),
    junctions: rt.junctions.length, junctionGap: jg,
    carriage, corridor: corr,
    freeL: med(sl.map(s => s.L.d != null ? s.L.d - s.road.w / 2 : null).filter((v): v is number => v != null)),
    freeR: med(sl.map(s => s.R.d != null ? s.R.d - s.road.w / 2 : null).filter((v): v is number => v != null)),
    carShare: corr ? Math.min(1, carriage / corr) : null,
    hw: med(hws), wall: (wl + wr) / 2, wallL: wl, wallR: wr, heightMed: med(hAll),
    treesPer100: sl.reduce((a, s) => a + s.trees, 0) / L * 100,
    shade14: sunOn ? 1 - sl.reduce((a, s) => a + s.sun14[0] + s.sun14[1], 0) / (2 * sl.length) : null,
    sunHours: sunOn ? sl.reduce((a, s) => a + s.sunH[0] + s.sunH[1], 0) / (2 * sl.length) : null,
    crossings: crU.length, crossGap: maxGap(crU, rt.len), stops: stU.length, stopGap: stU.length ? maxGap(stU, rt.len) : null,
    shopsPer100: pois.filter(p => p.kind === 'shop').length / L * 100,
    maxspeed: main.maxspeed ?? null, lanes: main.lanes ?? null, oneway: !!main.oneway,
  };
}

/** Xulosa: meʼyor va andozalar boʻyicha kuchli/zaif tomonlar (har biri manbasi bilan); t — tarjima kaliti (${…} oʻrinlari p da) */
export interface Finding { ok: boolean; t: string; p: Record<string, string | number>; src: string }
export function findings(S: StreetSummary): Finding[] {
  const out: Finding[] = [], f1 = (v: number) => v.toFixed(1).replace('.', ',');
  const F = (ok: boolean, t: string, p: Record<string, string | number>, src: string) => out.push({ ok, t, p, src });
  if (S.cat.sidewalk) {
    const minFree = Math.min(S.freeL ?? Infinity, S.freeR ?? Infinity), need = S.cat.sidewalk[0];
    if (Number.isFinite(minFree)) {
      if (minFree < need) F(false, 'Fasadgacha boʻsh joy ${a} m — ${b} m li piyoda yoʻlagi sigʻmaydi', { a: f1(minFree), b: f1(need) }, 'ShNQ 2.07.06-24, 2-ilova 1-jadval');
      else F(true, 'Fasadgacha ${a} m — piyoda yoʻlagi (≥ ${b} m) sigʻadi; trotuar eni oʻlchanmagan', { a: f1(minFree), b: f1(need) }, 'ShNQ 2.07.06-24, 2-ilova 1-jadval');
    }
  }
  if (S.cat.id !== 'piyoda' && S.len >= 300) {
    if (!S.crossings) F(false, 'OSM da piyoda oʻtish joyi belgilanmagan — joyida tekshiring', {}, 'ShNQ 2.07.06-24, 12-band (300–500 m)');
    else if (S.crossGap && S.crossGap.len > 500) F(false, 'Piyoda oʻtish joylari orasida ${g} m (${a}–${b} m)', { g: Math.round(S.crossGap.len), a: Math.round(S.crossGap.from), b: Math.round(S.crossGap.to) }, 'ShNQ 2.07.06-24, 12-band (300–500 m)');
    else F(true, 'Piyoda oʻtish joylari oraligʻi ≤ 500 m', {}, 'ShNQ 2.07.06-24, 12-band');
  }
  if (S.stops && S.stopGap && S.stopGap.len > 600 && S.len > 600) F(false, 'Bekatlar orasida ${g} m', { g: Math.round(S.stopGap.len) }, 'ShNQ 2.07.06-24, 26-band (400–600 m)');
  if (S.hw != null) {
    if (S.hw < 0.3) F(false, 'H/W ${v} — koʻcha ochiq, «xona» hissi yoʻq', { v: f1(S.hw) }, 'andoza (meʼyor emas)');
    else if (S.hw > 1.5) F(false, 'H/W ${v} — chuqur kanyon, quyosh va havo almashinuvi kam', { v: f1(S.hw) }, 'andoza (meʼyor emas)');
    else F(true, 'H/W ${v} — moʻtadil koʻcha xonasi', { v: f1(S.hw) }, 'andoza (meʼyor emas)');
  }
  if (S.shade14 != null) F(S.shade14 >= 0.4, '22 iyun 14:00 da trotuarning ${p} % i soyada', { p: Math.round(S.shade14 * 100) }, 'hisob: binolar + daraxtlar (andoza: toj 3 m, 8 m)');
  if (S.wall < 0.4) F(false, 'Fasad uzluksizligi ${p} % — koʻcha boʻylab bino chizigʻi uzilgan', { p: Math.round(S.wall * 100) }, 'andoza: qatnov qismi chetidan ≤ 15 m');
  return out;
}
