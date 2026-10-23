/**
 * Tom va fasad materiallari: turlari, qiya tom geometriyasi va quyosh panellari salohiyati.
 * Qiya tom istalgan qavariq dogʻda quriladi (chetlari dogʻ uchlarida); botiq dogʻ qavariq qismlarga boʻlinadi (roofParts).
 */
import { area, obb2, type XY } from './geo';
import { skeletonRoof } from './roofsk';

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
/** Qiya tom tizmasining eng katta balandligi, m: keng binolarda nishab shunga koʻra yassilanadi */
export const ROOF_RISE_MAX = 6;
export const isRoof = (v: unknown): v is Roof => ROOFS.some(r => r.id === v);
export const isMat = (v: unknown): v is Mat => MATS.some(m => m.id === v);

/** Qiya tom boʻlagi: tris — tom yuzalari, walls — fronton va baland tomondagi devor (bino devori rangida); x, y — mahalliy, z — tom asosidan */
export interface RoofPart { tris: number[]; walls: number[]; h: number }

/**
 * Qavariq dogʻ uchun qiya tom (toʻgʻri toʻrtburchak shart emas — trapetsiya, parallelogramm, qiya burchakli seksiya ham),
 * yoki null (botiq shakl — roofParts uni qismlarga boʻladi). Tom chetlari aynan dogʻ uchlarida turadi (OBB emas).
 *  ikki/toʻrt: tizma — toʻrtburchakda qisqa qarama-qarshi qirralar oʻrtalari orasida, boshqa shaklda — OBB uzun oʻqi boʻylab;
 *              har qirra tizmaga proyeksiyasi bilan bogʻlanadi; ikki nishablida tik uchburchaklar — frontonlar (devor);
 *  bir: eng uzun qirra past, qarshi tomoni baland (≤ 4 m); baland tomonlarda devor.
 */
export function pitchedRoof(r0: XY[], kind: 'ikki' | 'tort' | 'bir', pitchDeg = kind === 'bir' ? 10 : 30): RoofPart | null {
  let r = simplify(signedA(r0) < 0 ? r0.slice().reverse() : r0.slice()); const n = r.length; if (n < 3) return null;
  for (let i = 0; i < n; i++) { const a = r[(i - 1 + n) % n], b = r[i], c = r[(i + 1) % n]; if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) < -1e-6) return null; }   // botiq
  const { U, L, S } = obb2(r); if (L < 2 || S < 2) return null;
  const t = Math.tan(pitchDeg * Math.PI / 180), tris: number[] = [], walls: number[] = [];
  const tri = (o: number[], a: [XY, number], b: [XY, number], c: [XY, number]) => {   // nol yuzali (buzilgan) uchburchak — tashlanadi (normal NaN boʻlmasin)
    const ux = b[0][0] - a[0][0], uy = b[0][1] - a[0][1], uz = b[1] - a[1], vx = c[0][0] - a[0][0], vy = c[0][1] - a[0][1], vz = c[1] - a[1];
    if (Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) < 1e-6) return;
    for (const [p, z] of [a, b, c]) o.push(p[0], p[1], z);
  };
  const E = (i: number) => Math.hypot(r[(i + 1) % n][0] - r[i][0], r[(i + 1) % n][1] - r[i][1]);
  if (kind === 'bir') {
    let k = 0; for (let i = 1; i < n; i++) if (E(i) > E(k)) k = i;
    const a = r[k], b = r[(k + 1) % n], el = E(k) || 1, nx = -(b[1] - a[1]) / el, ny = (b[0] - a[0]) / el;
    const d = r.map(p => Math.max(0, (p[0] - a[0]) * nx + (p[1] - a[1]) * ny)), dm = Math.max(...d) || 1, h = Math.min(dm * t, 4), z = d.map(x => x / dm * h);
    for (let i = 1; i < n - 1; i++) tri(tris, [r[0], z[0]], [r[i], z[i]], [r[i + 1], z[i + 1]]);
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; if (z[i] < 0.01 && z[j] < 0.01) continue;
      if (z[j] > 0.01) tri(walls, [r[i], 0], [r[j], 0], [r[j], z[j]]); if (z[i] > 0.01) tri(walls, [r[i], 0], [r[j], z[j]], [r[i], z[i]]); }
    return { tris, walls, h };
  }
  // tizma
  let R0: XY, R1: XY, w: number;
  if (n === 4) {
    const s02 = E(0) + E(2), s13 = E(1) + E(3), e = s02 <= s13 ? 0 : 1;   // qisqa qarama-qarshi juftlik — uchlar (fronton)
    const m = (i: number): XY => [(r[i][0] + r[(i + 1) % 4][0]) / 2, (r[i][1] + r[(i + 1) % 4][1]) / 2];
    R0 = m(e + 2); R1 = m(e); w = (E(e) + E(e + 2)) / 2;
  } else {
    const V: XY = [-U[1], U[0]];
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const p of r) { const u = p[0] * U[0] + p[1] * U[1], v = p[0] * V[0] + p[1] * V[1]; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const vm = (v0 + v1) / 2, P = (u: number): XY => [U[0] * u + V[0] * vm, U[1] * u + V[1] * vm];
    // tizma chizigʻi dogʻ ichida qayerdan qayergacha (qavariq — bitta oraliq)
    let ta = Infinity, tb = -Infinity;
    for (let i = 0; i < n; i++) { const p = r[i], q = r[(i + 1) % n], vp = p[0] * V[0] + p[1] * V[1] - vm, vq = q[0] * V[0] + q[1] * V[1] - vm; if ((vp <= 0) === (vq <= 0) && Math.abs(vp) > 1e-9 && Math.abs(vq) > 1e-9) continue; const k = Math.abs(vp - vq) < 1e-9 ? 0 : vp / (vp - vq), x: XY = [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k], u = x[0] * U[0] + x[1] * U[1]; ta = Math.min(ta, u); tb = Math.max(tb, u); }
    if (!(tb > ta)) { ta = u0; tb = u1; }
    R0 = P(ta); R1 = P(tb); w = S;
  }
  // keng binoda (savdo markazi, sport zali, 20 m dan chuqur) 30° tom ~20 m gacha koʻtarilib noreal boʻlardi — tizma ≤ 6 m
  // (oddiy turar seksiyalar, chuqurligi ≤ 20 m, oʻzgarmaydi)
  const h = Math.min(w / 2 * t, ROOF_RISE_MAX), dx = R1[0] - R0[0], dy = R1[1] - R0[1], RL = Math.hypot(dx, dy) || 1;
  if (kind === 'tort') { const sh = Math.min(w / 2, RL / 2); R0 = [R0[0] + dx / RL * sh, R0[1] + dy / RL * sh]; R1 = [R1[0] - dx / RL * sh, R1[1] - dy / RL * sh]; }
  if (n === 4) {   // toʻrtburchak (istalgan): uchlar e va e+2 — fronton yoki qiyalik, boʻylama qirralar — ikki qiyalik
    const s02 = E(0) + E(2), s13 = E(1) + E(3), e = s02 <= s13 ? 0 : 1, Q = (i: number) => r[(e + i) % 4];
    tri(kind === 'ikki' ? walls : tris, [Q(0), 0], [Q(1), 0], [R1, h]); tri(kind === 'ikki' ? walls : tris, [Q(2), 0], [Q(3), 0], [R0, h]);
    tri(tris, [Q(1), 0], [Q(2), 0], [R0, h]); tri(tris, [Q(1), 0], [R0, h], [R1, h]);
    tri(tris, [Q(3), 0], [Q(0), 0], [R1, h]); tri(tris, [Q(3), 0], [R1, h], [R0, h]);
    return { tris, walls, h };
  }
  const ex = R1[0] - R0[0], ey = R1[1] - R0[1], E2 = ex * ex + ey * ey;
  const proj = (p: XY): XY => { if (E2 < 1e-9) return R0; const k = Math.max(0, Math.min(1, ((p[0] - R0[0]) * ex + (p[1] - R0[1]) * ey) / E2)); return [R0[0] + ex * k, R0[1] + ey * k]; };
  const same = (a: XY, b: XY) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6;
  /** tik uchburchak (fronton): uchala nuqtaning tarhdagi proyeksiyasi bir chiziqda */
  const vertical = (a: XY, b: XY, c: XY) => Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) < 1e-3 * Math.max(1, Math.hypot(b[0] - a[0], b[1] - a[1]) ** 2);
  for (let i = 0; i < n; i++) {
    const p = r[i], q = r[(i + 1) % n], Rp = proj(p), Rq = proj(q);
    const o = kind === 'ikki' && vertical(p, q, Rq) ? walls : tris;
    tri(o, [p, 0], [q, 0], [Rq, h]);
    if (!same(Rp, Rq)) tri(kind === 'ikki' && vertical(p, Rq, Rp) ? walls : tris, [p, 0], [Rq, h], [Rp, h]);
  }
  return { tris, walls, h };
}

/**
 * Murakkab dogʻ (L, T, U shakl) uchun: ichki (botiq) uchlardan qirra davomi boʻyicha kesib, toʻrtburchak qismlarga boʻlinadi
 * va har qismga alohida tom quriladi. Boʻlib boʻlmasa — null (tekis tom).
 */
export function roofParts(r: XY[], kind: 'ikki' | 'tort' | 'bir'): RoofPart[] | null {
  // toʻrtburchak (qavariq) — aniq usul; boshqa shakl (L, T, U, xoch, koʻpburchak) — yaxlit skelet tom (ichki burchakda endova)
  const q = simplify(signedA(r) < 0 ? r.slice().reverse() : r.slice());
  if (kind !== 'bir' && !(q.length === 4 && isConvex(q))) { const sk = skeletonRoof([q], kind, 30, ROOF_RISE_MAX); if (sk) return [sk]; }
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
const isConvex = (r: XY[]) => r.every((b, i) => { const a = r[(i - 1 + r.length) % r.length], c = r[(i + 1) % r.length]; return (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) >= -1e-6; });
const signedA = (r: XY[]) => { let s = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; s += p[0] * q[1] - q[0] * p[1]; } return s / 2; };

/**
 * Quyosh panellari salohiyati — TAXMIN: tom maydonining 60 % i panel, 0,2 kWp/m²,
 * Toshkentda yillik solishtirma ishlab chiqarish ~1 500 kWh/kWp (Global Solar Atlas maʼlumotlari oraligʻida).
 */
export const PV = { cover: 0.6, kwpPerM2: 0.2, yield: 1500 };
export function pvEstimate(roofM2: number): { kwp: number; mwh: number } {
  const kwp = roofM2 * PV.cover * PV.kwpPerM2; return { kwp, mwh: kwp * PV.yield / 1000 };
}
