/**
 * Koʻrinadigan joy — izovist (13.11, kanvas «Joyshunos» K0–K2).
 * Kuzatuvchi nuqtasidan qancha joy koʻrinadi: nur otish usuli (Benedikt, 1979). Toʻsiq — faqat binolar.
 * Sof hisob, DOM siz: koordinatalar — lokal metr (geo.frame), tahlil doirasi markazi (0, 0).
 */
export type P2 = [number, number];

/** Bino qirralari va katakli indeks (nur faqat yaqin qirralarni tekshiradi) */
export interface IsoIndex {
  /** qirralar: [x1, y1, x2, y2] × n */
  segs: Float64Array; n: number;
  cell: number; x0: number; y0: number; nx: number; ny: number;
  /** har katak — qirra raqamlari */
  grid: number[][];
  rings: P2[][];
  /** har bino halqasining chegara qutisi: minx, miny, maxx, maxy */
  bb: Float64Array;
}

export function buildIndex(rings: P2[][], cell = 20): IsoIndex {
  const rs = rings.filter(r => r.length >= 3);
  let n = 0; for (const r of rs) n += r.length;
  const segs = new Float64Array(n * 4), bb = new Float64Array(rs.length * 4);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, k = 0;
  rs.forEach((r, j) => {
    let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
    for (let i = 0; i < r.length; i++) {
      const p = r[i], q = r[(i + 1) % r.length];
      segs[k++] = p[0]; segs[k++] = p[1]; segs[k++] = q[0]; segs[k++] = q[1];
      a = Math.min(a, p[0]); b = Math.min(b, p[1]); c = Math.max(c, p[0]); d = Math.max(d, p[1]);
    }
    bb[j * 4] = a; bb[j * 4 + 1] = b; bb[j * 4 + 2] = c; bb[j * 4 + 3] = d;
    x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, c); y1 = Math.max(y1, d);
  });
  if (!n) return { segs, n: 0, cell, x0: 0, y0: 0, nx: 1, ny: 1, grid: [[]], rings: rs, bb };
  const nx = Math.max(1, Math.ceil((x1 - x0) / cell) + 1), ny = Math.max(1, Math.ceil((y1 - y0) / cell) + 1);
  const grid: number[][] = Array.from({ length: nx * ny }, () => []);
  for (let s = 0; s < n; s++) {
    const o = s * 4, ax = Math.min(segs[o], segs[o + 2]), bx = Math.max(segs[o], segs[o + 2]), ay = Math.min(segs[o + 1], segs[o + 3]), by = Math.max(segs[o + 1], segs[o + 3]);
    const i0 = Math.floor((ax - x0) / cell), i1 = Math.floor((bx - x0) / cell), j0 = Math.floor((ay - y0) / cell), j1 = Math.floor((by - y0) / cell);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) grid[j * nx + i].push(s);
  }
  return { segs, n, cell, x0, y0, nx, ny, grid, rings: rs, bb };
}

/** Nuqta biror bino ichidami */
export function inBuilding(ix: IsoIndex, p: P2): boolean {
  for (let j = 0; j < ix.rings.length; j++) {
    const o = j * 4; if (p[0] < ix.bb[o] || p[1] < ix.bb[o + 1] || p[0] > ix.bb[o + 2] || p[1] > ix.bb[o + 3]) continue;
    const r = ix.rings[j]; let c = false;
    for (let i = 0, k = r.length - 1; i < r.length; k = i++) {
      const a = r[i], b = r[k];
      if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
    }
    if (c) return true;
  }
  return false;
}

/** Radius ichidagi qirralar (takrorsiz) */
function near(ix: IsoIndex, p: P2, R: number): Int32Array {
  if (!ix.n) return new Int32Array(0);
  const i0 = Math.max(0, Math.floor((p[0] - R - ix.x0) / ix.cell)), i1 = Math.min(ix.nx - 1, Math.floor((p[0] + R - ix.x0) / ix.cell));
  const j0 = Math.max(0, Math.floor((p[1] - R - ix.y0) / ix.cell)), j1 = Math.min(ix.ny - 1, Math.floor((p[1] + R - ix.y0) / ix.cell));
  const seen = new Uint8Array(ix.n), out: number[] = [];
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) for (const s of ix.grid[j * ix.nx + i]) if (!seen[s]) { seen[s] = 1; out.push(s); }
  return Int32Array.from(out);
}

export interface Iso {
  /** koʻrinish poligoni (lokal metr); bino ichida — boʻsh */
  poly: P2[];
  /** m² */ area: number;
  /** m */ perim: number;
  /** koʻrinadigan ulush: maydon / (π R² · burchak/360), 0–1 */ open: number;
  /** ixchamlik 4πA/P², 0–1: 1 — doira, 0 ga yaqin — tor va uzun */ comp: number;
  /** kuzatuvchi bino ichida */ inside: boolean;
}

export interface IsoOpt {
  /** koʻrish radiusi, m */ R: number;
  /** koʻrish burchagi, gradus (360 — har tomon) */ fov: number;
  /** nurlar soni (sukut: 200° da 721, 360° da 1441) */ rays?: number;
  /** tahlil doirasi radiusi (markaz 0,0): koʻrinish undan chiqmaydi */ clip?: number;
}

const raysFor = (fov: number) => Math.max(37, Math.round(fov / 360 * 1440) + 1);

/** Bitta nuqtadan izovist. heading — radian (x oʻqidan soat strelkasiga teskari) */
export function isovist(ix: IsoIndex, p: P2, heading: number, o: IsoOpt): Iso {
  const fov = Math.min(360, Math.max(1, o.fov)), full = fov >= 360, N = o.rays ?? raysFor(fov);
  if (inBuilding(ix, p)) return { poly: [], area: 0, perim: 0, open: 0, comp: 0, inside: true };
  const cand = near(ix, p, o.R), S = ix.segs, pts: P2[] = [];
  const a0 = heading - (fov * Math.PI / 180) / 2, da = (fov * Math.PI / 180) / (full ? N : N - 1);
  const C2 = o.clip ? o.clip * o.clip : 0, pp = p[0] * p[0] + p[1] * p[1];
  for (let k = 0; k < N; k++) {
    const a = a0 + k * da, dx = Math.cos(a), dy = Math.sin(a);
    let tm = o.R;
    if (o.clip) { const b = p[0] * dx + p[1] * dy, c = pp - C2, D = b * b - c; tm = Math.min(tm, D > 0 ? Math.max(0, -b + Math.sqrt(D)) : 0); }
    for (let q = 0; q < cand.length; q++) {
      const s = cand[q] * 4, ex = S[s + 2] - S[s], ey = S[s + 3] - S[s + 1], den = dx * ey - dy * ex;
      if (den > -1e-12 && den < 1e-12) continue;
      const qx = S[s] - p[0], qy = S[s + 1] - p[1], t = (qx * ey - qy * ex) / den;
      if (t <= 0 || t >= tm) continue;
      const u = (qx * dy - qy * dx) / den;
      if (u >= 0 && u <= 1) tm = t;
    }
    pts.push([p[0] + tm * dx, p[1] + tm * dy]);
  }
  const poly = full ? pts : [[p[0], p[1]] as P2, ...pts];
  let A = 0, P = 0;
  for (let i = 0; i < poly.length; i++) { const u = poly[i], v = poly[(i + 1) % poly.length]; A += u[0] * v[1] - v[0] * u[1]; P += Math.hypot(v[0] - u[0], v[1] - u[1]); }
  const area = Math.abs(A) / 2;
  return { poly, area, perim: P, open: Math.min(1, area / (Math.PI * o.R * o.R * fov / 360)), comp: P > 0 ? Math.min(1, 4 * Math.PI * area / (P * P)) : 0, inside: false };
}

/** Marshrut uzunligi boʻyicha nuqta va yoʻnalish */
export function polyline(route: P2[]): { L: number; at: (d: number) => P2; heading: (d: number, w?: number) => number } {
  const cum = [0]; for (let i = 1; i < route.length; i++) cum.push(cum[i - 1] + Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]));
  const L = cum[cum.length - 1];
  const at = (d: number): P2 => {
    if (route.length === 1) return route[0];
    d = Math.max(0, Math.min(L, d));
    let i = 1; while (i < cum.length - 1 && cum[i] < d) i++;
    const s = cum[i] - cum[i - 1] || 1, t = (d - cum[i - 1]) / s, a = route[i - 1], b = route[i];
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  const heading = (d: number, w = 10) => { const a = at(d - w), b = at(d + w); return Math.atan2(b[1] - a[1], b[0] - a[0]); };
  return { L, at, heading };
}

export interface Walk {
  /** masofa (m), maydon (m²), ochiqlik, ixchamlik — har namuna */
  d: Float64Array; area: Float64Array; open: Float64Array; comp: Float64Array;
  L: number;
}
/** Marshrut boʻylab namunalar soni: qadam ≥ 1 m, koʻpi bilan max */
export function walkSteps(L: number, step = 1, max = 700): number { return Math.max(2, Math.min(max, Math.floor(L / step) + 1)); }

export function walk(ix: IsoIndex, route: P2[], o: IsoOpt, n?: number): Walk {
  const pl = polyline(route), N = n ?? walkSteps(pl.L);
  const w: Walk = { d: new Float64Array(N), area: new Float64Array(N), open: new Float64Array(N), comp: new Float64Array(N), L: pl.L };
  for (let i = 0; i < N; i++) walkAt(ix, pl, o, w, i, N);
  return w;
}
/** Bitta namuna (boʻlaklab hisoblash uchun) */
export function walkAt(ix: IsoIndex, pl: ReturnType<typeof polyline>, o: IsoOpt, w: Walk, i: number, N: number): Iso {
  const d = N > 1 ? pl.L * i / (N - 1) : 0, r = isovist(ix, pl.at(d), pl.heading(d), o);
  w.d[i] = d; w.area[i] = r.inside ? NaN : r.area; w.open[i] = r.inside ? NaN : r.open; w.comp[i] = r.inside ? NaN : r.comp;
  return r;
}

export interface WalkSum { mean: number; iMax: number; iMin: number; /** chegaradan kichik ulush, 0–1 */ low: number }
export function walkSum(w: Walk, thr = 1000): WalkSum {
  let s = 0, n = 0, lo = 0, iMax = -1, iMin = -1;
  for (let i = 0; i < w.area.length; i++) {
    const a = w.area[i]; if (Number.isNaN(a)) continue;
    s += a; n++; if (a < thr) lo++;
    if (iMax < 0 || a > w.area[iMax]) iMax = i;
    if (iMin < 0 || a < w.area[iMin]) iMin = i;
  }
  return { mean: n ? s / n : NaN, iMax, iMin, low: n ? lo / n : NaN };
}
