/**
 * Tom va fasad materiallari: turlari, qiya tom geometriyasi va quyosh panellari salohiyati.
 * Qiya tom faqat toʻrtburchakka yaqin dogʻda quriladi (dogʻ / OBB ≥ 0,9); murakkab shaklda — tekis tom.
 */
import { area, obb2, type XY } from './geo';

export type Roof = 'tekis' | 'yashil' | 'quyosh' | 'ikki' | 'tort' | 'bir';
export type Mat = 'suvoq' | 'gisht' | 'beton' | 'tosh' | 'yogoch' | 'metall' | 'shisha' | 'terrakota';

export const ROOFS: { id: Roof; name: string }[] = [
  { id: 'tekis', name: 'Tekis' }, { id: 'yashil', name: 'Yashil' }, { id: 'quyosh', name: 'Quyosh panelli' },
  { id: 'ikki', name: 'Ikki nishabli' }, { id: 'tort', name: 'Toʻrt nishabli' }, { id: 'bir', name: 'Bir nishabli' },
];
export const MATS: { id: Mat; name: string; color: number }[] = [
  { id: 'suvoq', name: 'Suvoq', color: 0xf1ebe1 }, { id: 'gisht', name: 'Gʻisht', color: 0xc07a5e }, { id: 'beton', name: 'Beton', color: 0xcfcdc8 },
  { id: 'tosh', name: 'Tosh', color: 0xdcd1bc }, { id: 'yogoch', name: 'Yogʻoch', color: 0xc49a6c }, { id: 'metall', name: 'Metall', color: 0xa7afb6 },
  { id: 'shisha', name: 'Shisha', color: 0xa9c2d1 }, { id: 'terrakota', name: 'Terrakota', color: 0xd08a63 },
];
export const isRoof = (v: unknown): v is Roof => ROOFS.some(r => r.id === v);
export const isMat = (v: unknown): v is Mat => MATS.some(m => m.id === v);

/** Qiya tom boʻlagi: tris — tom yuzalari, walls — fronton va baland tomondagi devor (bino devori rangida); x, y — mahalliy, z — tom asosidan */
export interface RoofPart { tris: number[]; walls: number[]; h: number }

/** Bitta toʻrtburchakka yaqin dogʻ uchun qiya tom, yoki null (shakl toʻrtburchak emas) */
export function pitchedRoof(r: XY[], kind: 'ikki' | 'tort' | 'bir', pitchDeg = kind === 'bir' ? 10 : 30): RoofPart | null {
  const { U, L, S } = obb2(r); if (L < 2 || S < 2) return null;
  if (area(r) / (L * S) < 0.9) return null;
  const V: XY = [-U[1], U[0]];
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (const p of r) { const u = p[0] * U[0] + p[1] * U[1], v = p[0] * V[0] + p[1] * V[1]; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
  const P = (u: number, v: number): XY => [U[0] * u + V[0] * v, U[1] * u + V[1] * v];
  const t = Math.tan(pitchDeg * Math.PI / 180), tris: number[] = [], walls: number[] = [];
  const tri = (o: number[], a: [XY, number], b: [XY, number], c: [XY, number]) => { for (const [p, z] of [a, b, c]) o.push(p[0], p[1], z); };
  const A = P(u0, v0), B = P(u1, v0), C = P(u1, v1), D = P(u0, v1);
  if (kind === 'bir') {
    const h = Math.min(S * t, 4); // v0 tomoni past, v1 — baland (≤ 4 m)
    tri(tris, [A, 0], [B, 0], [C, h]); tri(tris, [A, 0], [C, h], [D, h]);
    tri(walls, [A, 0], [D, h], [D, 0]); tri(walls, [B, 0], [C, 0], [C, h]);          // yon uchburchaklar
    tri(walls, [C, 0], [D, 0], [D, h]); tri(walls, [C, 0], [D, h], [C, h]);          // baland tomondagi devor (teshik qolmasin)
    return { tris, walls, h };
  }
  const h = S / 2 * t, vm = (v0 + v1) / 2, inset = kind === 'tort' ? Math.min(S / 2, L / 2) : 0;
  const R0 = P(u0 + inset, vm), R1 = P(u1 - inset, vm);
  tri(tris, [A, 0], [B, 0], [R1, h]); tri(tris, [A, 0], [R1, h], [R0, h]);             // janubiy (v0) qiyalik
  tri(tris, [C, 0], [D, 0], [R0, h]); tri(tris, [C, 0], [R0, h], [R1, h]);             // shimoliy (v1) qiyalik
  if (kind === 'tort') { tri(tris, [D, 0], [A, 0], [R0, h]); tri(tris, [B, 0], [C, 0], [R1, h]); }
  else { tri(walls, [D, 0], [A, 0], [R0, h]); tri(walls, [B, 0], [C, 0], [R1, h]); }  // frontonlar — devor rangida
  return { tris, walls, h };
}

/**
 * Murakkab dogʻ (L, T, U shakl) uchun: ichki (botiq) uchlardan qirra davomi boʻyicha kesib, toʻrtburchak qismlarga boʻlinadi
 * va har qismga alohida tom quriladi. Boʻlib boʻlmasa — null (tekis tom).
 */
export function roofParts(r: XY[], kind: 'ikki' | 'tort' | 'bir'): RoofPart[] | null {
  const one = pitchedRoof(r, kind); if (one) return [one];
  const out: RoofPart[] = [];
  const rec = (q: XY[], depth: number): boolean => {
    const pr = pitchedRoof(q, kind); if (pr) { out.push(pr); return true; }
    if (depth > 3 || area(q) < 30) return false;
    const pieces = splitAtReflex(q); if (!pieces) return false;
    return pieces.every(x => rec(x, depth + 1));
  };
  return rec(r, 0) && out.length ? out : null;
}

/** Birinchi botiq uchdan oldingi qirra davomi boʻyicha ikkiga boʻlish */
export function splitAtReflex(r0: XY[]): XY[][] | null {
  const r = signedA(r0) < 0 ? r0.slice().reverse() : r0, n = r.length;
  for (let i = 0; i < n; i++) {
    const a = r[(i - 1 + n) % n], b = r[i], c = r[(i + 1) % n];
    if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) >= -1e-6) continue; // qavariq
    // kesuvchi toʻgʻri chiziq: a→b yoʻnalishida b orqali
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, nx = -uy, ny = ux;
    const side = (s: number) => { const out: XY[] = []; for (let k = 0; k < n; k++) { const p = r[k], q = r[(k + 1) % n], dp = ((p[0] - b[0]) * nx + (p[1] - b[1]) * ny) * s, dq = ((q[0] - b[0]) * nx + (q[1] - b[1]) * ny) * s; if (dp >= -1e-9) out.push(p); if ((dp >= -1e-9) !== (dq >= -1e-9)) { const t = dp / (dp - dq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); } } return simplify(out); };
    const A1 = side(1), A2 = side(-1);
    // yarim tekislik kesimi botiq shaklda bir nechta boʻlak berishi mumkin — faqat oddiy holatni qabul qilamiz (maydon yigʻindisi saqlansa)
    if (A1.length >= 3 && A2.length >= 3 && Math.abs(area(A1) + area(A2) - area(r)) < 0.02 * area(r) && area(A1) > 10 && area(A2) > 10) return [A1, A2];
  }
  return null;
}
/** takroriy va bir chiziqda yotgan uchlarni olib tashlash */
function simplify(r: XY[]): XY[] {
  let q = r.slice();
  for (let changed = true, g = 0; changed && g < 50 && q.length > 3; g++) {
    changed = false;
    for (let k = 0; k < q.length; k++) {
      const a = q[(k - 1 + q.length) % q.length], b = q[k], c = q[(k + 1) % q.length];
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 1e-6 || Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) < 1e-6) { q.splice(k, 1); changed = true; break; }
    }
  }
  return q;
}
const signedA = (r: XY[]) => { let s = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; s += p[0] * q[1] - q[0] * p[1]; } return s / 2; };

/**
 * Quyosh panellari salohiyati — TAXMIN: tom maydonining 60 % i panel, 0,2 kWp/m²,
 * Toshkentda yillik solishtirma ishlab chiqarish ~1 500 kWh/kWp (Global Solar Atlas maʼlumotlari oraligʻida).
 */
export const PV = { cover: 0.6, kwpPerM2: 0.2, yield: 1500 };
export function pvEstimate(roofM2: number): { kwp: number; mwh: number } {
  const kwp = roofM2 * PV.cover * PV.kwpPerM2; return { kwp, mwh: kwp * PV.yield / 1000 };
}
