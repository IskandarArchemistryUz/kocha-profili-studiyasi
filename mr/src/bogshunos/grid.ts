/**
 * Bogʻshunos — rastr toʻri: niqoblar (maydon), masofa, konturlash. Poligon «buffer» oʻrniga toʻr ishlatiladi:
 * hisob (maydon, masofa, moslik) toʻrda, chizish esa SVG chiziq qalinligi va kontur orqali.
 */
import type { XY, Ring, MPoly } from './types';

export class Grid {
  readonly n: number;
  constructor(public x0: number, public y0: number, public step: number, public nx: number, public ny: number) { this.n = nx * ny; }
  static around(bb: [number, number, number, number], step: number, pad = 0): Grid {
    const x0 = Math.floor((bb[0] - pad) / step) * step, y0 = Math.floor((bb[1] - pad) / step) * step;
    return new Grid(x0, y0, step, Math.ceil((bb[2] + pad - x0) / step) + 1, Math.ceil((bb[3] + pad - y0) / step) + 1);
  }
  /** katak markazi */
  cx(i: number): number { return this.x0 + (i + 0.5) * this.step; }
  cy(j: number): number { return this.y0 + (j + 0.5) * this.step; }
  idx(x: number, y: number): number { const i = Math.floor((x - this.x0) / this.step), j = Math.floor((y - this.y0) / this.step); return i < 0 || j < 0 || i >= this.nx || j >= this.ny ? -1 : j * this.nx + i; }
  u8(): Uint8Array { return new Uint8Array(this.n); }
  f32(v = 0): Float32Array { return new Float32Array(this.n).fill(v); }
  get cellA(): number { return this.step * this.step; }
}

export function bbox(pts: XY[]): [number, number, number, number] {
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const [x, y] of pts) { if (x < a) a = x; if (y < b) b = y; if (x > c) c = x; if (y > d) d = y; }
  return [a, b, c, d];
}

/** Poligonni (teshiklari bilan) niqobga: skanlash qatori, katak markazi boʻyicha (juft-toq qoida) */
export function fillPoly(G: Grid, m: Uint8Array, rings: Ring[], val = 1): void {
  for (let j = 0; j < G.ny; j++) {
    const y = G.cy(j), xs: number[] = [];
    for (const r of rings) for (let k = 0, l = r.length - 1; k < r.length; l = k++) {
      const [x1, y1] = r[k], [x2, y2] = r[l];
      if ((y1 > y) !== (y2 > y)) xs.push(x1 + (y - y1) * (x2 - x1) / (y2 - y1));
    }
    xs.sort((a, b) => a - b);
    for (let q = 0; q + 1 < xs.length; q += 2) {
      const i0 = Math.max(0, Math.ceil((xs[q] - G.x0) / G.step - 0.5)), i1 = Math.min(G.nx - 1, Math.floor((xs[q + 1] - G.x0) / G.step - 0.5));
      for (let i = i0; i <= i1; i++) m[j * G.nx + i] = val;
    }
  }
}
export function fillMPoly(G: Grid, m: Uint8Array, mp: MPoly, val = 1): void { for (const p of mp) fillPoly(G, m, p, val); }

/** Toʻrning har katagidan eng yaqin «1» katakkacha masofa (m) — 8 yoʻnalishli chamfer (3-4) */
export function distance(G: Grid, src: Uint8Array): Float32Array {
  const INF = 1e9, d = new Float32Array(G.n).fill(INF), s = G.step, a = s, b = s * Math.SQRT2;
  for (let k = 0; k < G.n; k++) if (src[k]) d[k] = 0;
  for (let j = 0; j < G.ny; j++) for (let i = 0; i < G.nx; i++) {
    const k = j * G.nx + i; let v = d[k];
    if (i > 0) v = Math.min(v, d[k - 1] + a);
    if (j > 0) { v = Math.min(v, d[k - G.nx] + a); if (i > 0) v = Math.min(v, d[k - G.nx - 1] + b); if (i < G.nx - 1) v = Math.min(v, d[k - G.nx + 1] + b); }
    d[k] = v;
  }
  for (let j = G.ny - 1; j >= 0; j--) for (let i = G.nx - 1; i >= 0; i--) {
    const k = j * G.nx + i; let v = d[k];
    if (i < G.nx - 1) v = Math.min(v, d[k + 1] + a);
    if (j < G.ny - 1) { v = Math.min(v, d[k + G.nx] + a); if (i < G.nx - 1) v = Math.min(v, d[k + G.nx + 1] + b); if (i > 0) v = Math.min(v, d[k + G.nx - 1] + b); }
    d[k] = v;
  }
  return d;
}

/** Siniq chiziqni kenglik bilan niqobga (chiziq — markaz, w — toʻliq kenglik) */
export function strokeLine(G: Grid, m: Uint8Array, pts: XY[], w: number, val = 1): void {
  const r = w / 2, rr = r * r;
  for (let s = 0; s + 1 < pts.length; s++) {
    const [ax, ay] = pts[s], [bx, by] = pts[s + 1], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9;
    const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - r - G.x0) / G.step)), i1 = Math.min(G.nx - 1, Math.floor((Math.max(ax, bx) + r - G.x0) / G.step));
    const j0 = Math.max(0, Math.floor((Math.min(ay, by) - r - G.y0) / G.step)), j1 = Math.min(G.ny - 1, Math.floor((Math.max(ay, by) + r - G.y0) / G.step));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const px = G.cx(i) - ax, py = G.cy(j) - ay, t = Math.max(0, Math.min(1, (px * dx + py * dy) / L2));
      const qx = px - t * dx, qy = py - t * dy;
      if (qx * qx + qy * qy <= rr) m[j * G.nx + i] = val;
    }
  }
}
export function disc(G: Grid, m: Uint8Array, c: XY, r: number, val = 1): void { strokeLine(G, m, [c, c], 2 * r, val); }

export const count = (m: Uint8Array, v = 1): number => { let n = 0; for (let k = 0; k < m.length; k++) if (m[k] === v) n++; return n; };
export const area = (G: Grid, m: Uint8Array, v = 1): number => count(m, v) * G.cellA;
export function and(a: Uint8Array, b: Uint8Array): Uint8Array { const o = new Uint8Array(a.length); for (let k = 0; k < a.length; k++) o[k] = a[k] && b[k] ? 1 : 0; return o; }
export function andNot(a: Uint8Array, b: Uint8Array): Uint8Array { const o = new Uint8Array(a.length); for (let k = 0; k < a.length; k++) o[k] = a[k] && !b[k] ? 1 : 0; return o; }
export function or(...ms: Uint8Array[]): Uint8Array { const o = new Uint8Array(ms[0].length); for (const m of ms) for (let k = 0; k < m.length; k++) if (m[k]) o[k] = 1; return o; }
export function threshold(d: Float32Array, lim: number): Uint8Array { const o = new Uint8Array(d.length); for (let k = 0; k < d.length; k++) o[k] = d[k] <= lim ? 1 : 0; return o; }

/**
 * Niqobni poligonlarga (marching squares) — chegara katak oʻrtasidan oʻtadi; keyin Chaikin bilan yumshatiladi.
 * Natija: halqalar roʻyxati (teshiklar alohida halqa, SVG da evenodd bilan chiziladi).
 */
export function contour(G: Grid, m: Uint8Array, smooth = 2): Ring[] {
  const at = (i: number, j: number) => (i < 0 || j < 0 || i >= G.nx || j >= G.ny ? 0 : m[j * G.nx + i]);
  const segs = new Map<string, [string, XY, XY][]>(); const key = (p: XY) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`;
  const P = (i: number, j: number): XY => [G.x0 + (i + 0.5) * G.step, G.y0 + (j + 0.5) * G.step];
  const mid = (a: XY, b: XY): XY => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const out: [XY, XY][] = [];
  for (let j = -1; j < G.ny; j++) for (let i = -1; i < G.nx; i++) {
    const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
    const code = a | (b << 1) | (c << 2) | (d << 3);
    if (code === 0 || code === 15) continue;
    const pa = P(i, j), pb = P(i + 1, j), pc = P(i + 1, j + 1), pd = P(i, j + 1);
    const S = mid(pa, pb), E = mid(pb, pc), N = mid(pc, pd), W = mid(pd, pa);
    const add = (u: XY, v: XY) => out.push([u, v]);
    switch (code) {
      case 1: add(W, S); break; case 2: add(S, E); break; case 3: add(W, E); break; case 4: add(E, N); break;
      case 5: add(W, N); add(E, S); break; case 6: add(S, N); break; case 7: add(W, N); break; case 8: add(N, W); break;
      case 9: add(N, S); break; case 10: add(N, E); add(S, W); break; case 11: add(N, E); break; case 12: add(E, W); break;
      case 13: add(E, S); break; case 14: add(S, W); break;
    }
  }
  for (const [u, v] of out) { const k = key(u); (segs.get(k) ?? segs.set(k, []).get(k)!).push([key(v), u, v]); }
  const rings: Ring[] = [];
  const used = new Set<string>();
  for (const [u, v] of out) {
    const sk = key(u) + '>' + key(v); if (used.has(sk)) continue;
    const ring: XY[] = [u]; let cur = v, curk = key(v); used.add(sk);
    for (let guard = 0; guard < 1e6; guard++) {
      ring.push(cur);
      const nx = (segs.get(curk) ?? []).find(s => !used.has(curk + '>' + s[0]));
      if (!nx) break;
      used.add(curk + '>' + nx[0]); cur = nx[2]; curk = nx[0];
      if (curk === key(u)) break;
    }
    if (ring.length > 3) rings.push(chaikin(ring, smooth));
  }
  return rings;
}
export function chaikin(r: XY[], it = 2, closed = true): XY[] {
  let p = r;
  for (let n = 0; n < it; n++) {
    const q: XY[] = []; const L = p.length;
    for (let k = 0; k < (closed ? L : L - 1); k++) {
      const a = p[k], b = p[(k + 1) % L];
      q.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
    }
    if (!closed) { q.unshift(p[0]); q.push(p[L - 1]); }
    p = q;
  }
  return p;
}
/** Douglas–Peucker */
export function simplify(p: XY[], tol: number): XY[] {
  if (p.length < 3) return p;
  const keep = new Uint8Array(p.length); keep[0] = keep[p.length - 1] = 1;
  const st: [number, number][] = [[0, p.length - 1]];
  while (st.length) {
    const [a, b] = st.pop()!; let dm = 0, im = -1;
    const [ax, ay] = p[a], [bx, by] = p[b], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-9;
    for (let k = a + 1; k < b; k++) { const d = Math.abs((p[k][0] - ax) * dy - (p[k][1] - ay) * dx) / L; if (d > dm) { dm = d; im = k; } }
    if (dm > tol && im > 0) { keep[im] = 1; st.push([a, im], [im, b]); }
  }
  return p.filter((_, k) => keep[k]);
}
export const len = (p: XY[]): number => { let s = 0; for (let k = 1; k < p.length; k++) s += Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]); return s; };
export function ptInRing(p: XY, r: Ring): boolean {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) c = !c; }
  return c;
}
export const ptInPoly = (p: XY, rings: Ring[]): boolean => { let c = false; for (const r of rings) if (ptInRing(p, r)) c = !c; return c; };
export function distSeg(p: XY, a: XY, b: XY): number {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-9;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
export function distLine(p: XY, l: XY[]): number { let m = Infinity; for (let k = 1; k < l.length; k++) m = Math.min(m, distSeg(p, l[k - 1], l[k])); return m; }
export function interp(l: XY[], t: number): XY {
  const L = len(l) * t; let s = 0;
  for (let k = 1; k < l.length; k++) { const d = Math.hypot(l[k][0] - l[k - 1][0], l[k][1] - l[k - 1][1]); if (s + d >= L) { const u = (L - s) / (d || 1); return [l[k - 1][0] + u * (l[k][0] - l[k - 1][0]), l[k - 1][1] + u * (l[k][1] - l[k - 1][1])]; } s += d; }
  return l[l.length - 1];
}
