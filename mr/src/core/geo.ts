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

/** Eng kichik yuzali yoʻnaltirilgan toʻrtburchak: U — uzun oʻq birlik vektori, L × S — oʻlchamlari */
export function obb2(r: XY[]): { U: XY; L: number; S: number } {
  let best = { U: [1, 0] as XY, L: 0, S: 0, A: Infinity };
  for (let i = 0; i < r.length; i++) {
    const a = r[i], b = r[(i + 1) % r.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 0.3) continue;
    const u: XY = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const p of r) { const x = p[0] * u[0] + p[1] * u[1], y = -p[0] * u[1] + p[1] * u[0]; u0 = Math.min(u0, x); u1 = Math.max(u1, x); v0 = Math.min(v0, y); v1 = Math.max(v1, y); }
    const A = (u1 - u0) * (v1 - v0);
    if (A < best.A) best = (u1 - u0) >= (v1 - v0) ? { U: u, L: u1 - u0, S: v1 - v0, A } : { U: [-u[1], u[0]], L: v1 - v0, S: u1 - u0, A };
  }
  return { U: best.U, L: best.L, S: best.S };
}

/** Uzun fasadlar normallarining azimutlari (°, shimoldan soat yoʻnalishida) */
export function longFacadeAzimuths(r: XY[]): [number, number] {
  const { U } = obb2(r), n: XY = [-U[1], U[0]];
  const az = (v: XY) => ((Math.atan2(v[0], v[1]) * 180 / Math.PI) + 360) % 360;
  return [az(n), az([-n[0], -n[1]])];
}
