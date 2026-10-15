/**
 * Yagona geometriya: WGS84 ↔ mahalliy metr tizimi.
 * Eski kodda shu formula 34 joyda takrorlangan edi; endi faqat shu yerda.
 * Mahalliy tizim: X — sharq, Y — shimol, metrda, loyiha markazidan (origin).
 * Bir necha km gacha boʻlgan hududda xato < 0,1 % (ellipsoid boʻyicha meridian/parallel uzunligi).
 */
import type { LngLat, Ring } from './doc';

export type XY = [number, number];

export interface Frame {
  origin: LngLat;
  /** 1° uzunlik va kenglikdagi metr (origin kengligida) */
  mx: number;
  my: number;
  toLocal(p: LngLat): XY;
  toGeo(p: XY): LngLat;
}

const RAD = Math.PI / 180;

export function frame(origin: LngLat): Frame {
  const f = origin[1] * RAD;
  // WGS84 ellipsoidi uchun 1° uzunligi (metr)
  const my = 111132.92 - 559.82 * Math.cos(2 * f) + 1.175 * Math.cos(4 * f) - 0.0023 * Math.cos(6 * f);
  const mx = 111412.84 * Math.cos(f) - 93.5 * Math.cos(3 * f) + 0.118 * Math.cos(5 * f);
  return {
    origin, mx, my,
    toLocal: p => [(p[0] - origin[0]) * mx, (p[1] - origin[1]) * my],
    toGeo: p => [origin[0] + p[0] / mx, origin[1] + p[1] / my],
  };
}

/** Ishorali maydon (m²): soat strelkasiga teskari — musbat */
export function signedArea(r: XY[]): number {
  let a = 0;
  for (let i = 0, n = r.length; i < n; i++) { const p = r[i], q = r[(i + 1) % n]; a += p[0] * q[1] - q[0] * p[1]; }
  return a / 2;
}

export function area(r: XY[]): number { return Math.abs(signedArea(r)); }

/** Teshikli koʻpburchak maydoni: tashqi − teshiklar */
export function polyArea(rings: XY[][]): number {
  if (!rings.length) return 0;
  return Math.max(0, area(rings[0]) - rings.slice(1).reduce((s, h) => s + area(h), 0));
}

export function ringLocal(fr: Frame, r: Ring): XY[] { return r.map(fr.toLocal); }

export function perimeter(r: XY[]): number {
  let s = 0;
  for (let i = 0, n = r.length; i < n; i++) { const p = r[i], q = r[(i + 1) % n]; s += Math.hypot(q[0] - p[0], q[1] - p[1]); }
  return s;
}

export function centroid(r: XY[]): XY {
  let cx = 0, cy = 0, a = 0;
  for (let i = 0, n = r.length; i < n; i++) { const p = r[i], q = r[(i + 1) % n], k = p[0] * q[1] - q[0] * p[1]; a += k; cx += (p[0] + q[0]) * k; cy += (p[1] + q[1]) * k; }
  if (Math.abs(a) < 1e-9) { const n = r.length || 1; return [r.reduce((s, p) => s + p[0], 0) / n, r.reduce((s, p) => s + p[1], 0) / n]; }
  return [cx / (3 * a), cy / (3 * a)];
}

/** Halqa oʻzini kesib oʻtmaydimi (oddiy koʻpburchak) — chizishda tekshiriladi */
export function isSimple(r: XY[]): boolean {
  const n = r.length;
  if (n < 3) return false;
  const cross = (a: XY, b: XY, c: XY) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const inter = (a: XY, b: XY, c: XY, d: XY) => {
    const d1 = cross(c, d, a), d2 = cross(c, d, b), d3 = cross(a, b, c), d4 = cross(a, b, d);
    return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
  };
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    if (Math.abs(i - j) <= 1 || (i === 0 && j === n - 1)) continue;
    if (inter(r[i], r[(i + 1) % n], r[j], r[(j + 1) % n])) return false;
  }
  return Math.abs(signedArea(r)) > 1e-6;
}
