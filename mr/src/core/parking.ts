/**
 * Avtoturargoh: meʼyoriy talab (ShNQ 2.07.01-23, 416-band, 29-jadval — Toshkent) va joylarni modul boʻyicha
 * joylashtirish (Toshkent dizayn-kodi, 6.3: turargoh turlari va eng kichik oʻlchamlari).
 *
 * Modul — ikki tomonlama qator: joy qatori + manevr boʻlagi + joy qatori. Joylar haqiqiy toʻrtburchak
 * (burchakli modulda — aylantirilgan), manevr boʻlagi ular orasida; boʻlak yaroqsiz (chegaradan chiqadi yoki
 * binoga tegadi) boʻlgan joydagi oʻrinlar olinmaydi.
 */
import type { XY } from './geo';

export type ParkModule = 'p90' | 'p60' | 'p45' | 'par';
/** W — joy eni, L — uzunligi, A — manevr boʻlagi, deg — boʻlakka nisbatan burchak (dizayn-kod 6.3, eng kichik qiymatlar) */
export const PARK_MOD: Record<ParkModule, { short: string; W: number; L: number; A: number; deg: number; name: string; src: string }> = {
  p90: { short: '90°', W: 2.5, L: 5.3, A: 6.0, deg: 90, name: 'Perpendikulyar 90°', src: '5–5,5 × 2,5–2,7 m, boʻlak ≥ 6 m' },
  p60: { short: '60°', W: 2.5, L: 5.0, A: 5.0, deg: 60, name: 'Burchakli 60°', src: '4,5–5 × 2,5 m, boʻlak 4,5–5 m' },
  p45: { short: '45°', W: 2.5, L: 5.0, A: 4.5, deg: 45, name: 'Burchakli 45°', src: '4,5–5 × 2,5 m, boʻlak 4,5–5 m' },
  par: { short: 'Parallel', W: 2.5, L: 6.0, A: 3.5, deg: 0, name: 'Parallel', src: '5,5–6 × 2,3–2,5 m, boʻlak ≥ 3 m' },
};
export const PARK_MODS = Object.keys(PARK_MOD) as ParkModule[];

/** 29-jadval (Toshkent): kvartiraga 1; maʼmuriy — har 10 m²; savdo (> 200 m² savdo maydoni) — har 10 m²; maktab, MTM — 25 ga 1; park — har 0,05 ga */
export function parkingNeed(x: { apartments?: number; ofisGfa?: number; tradeArea?: number; school?: number; mtm?: number; greenArea?: number }): Record<string, number> {
  const trade = x.tradeArea ?? 0;
  return {
    kvartiralar: Math.ceil(x.apartments ?? 0), ofis: Math.ceil((x.ofisGfa ?? 0) / 10), savdo: trade > 200 ? Math.ceil(trade / 10) : 0,
    maktab: Math.ceil((x.school ?? 0) / 25), mtm: Math.ceil((x.mtm ?? 0) / 25), park: Math.floor((x.greenArea ?? 0) / 500),
  };
}
export const sumNeed = (p: Record<string, number>) => Object.values(p).reduce((a, b) => a + b, 0);

/** Bitta joyga toʻgʻri keladigan maydon: joy qatori + boʻlakning yarmi (ikki tomonlama qatorda), m² */
export function stallGross(mod: ParkModule): number {
  const M = PARK_MOD[mod], a = M.deg * Math.PI / 180, d = M.deg === 0 ? M.W : M.L * Math.sin(a) + M.W * Math.cos(a), p = M.deg === 0 ? M.L : M.W / Math.sin(a);
  return (d + M.A / 2) * p;
}

export interface StallLayout { stalls: XY[][]; aisles: XY[][]; n: number; module: ParkModule; angle: number }

const inside = (p: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
function segD(p: XY, a: XY, b: XY): number {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
const ringD = (p: XY, r: XY[]) => { let d = Infinity; for (let i = 0; i < r.length; i++) d = Math.min(d, segD(p, r[i], r[(i + 1) % r.length])); return d; };
const cross = (o: XY, a: XY, b: XY) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
const segX = (a: XY, b: XY, c: XY, d: XY) => cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0;

/** Toʻsiq: halqa va undan bufer masofasi (m) */
export interface Obstacle { ring: XY[]; buf: number }

/** Toʻrtburchak (qavariq) maydon ichida va toʻsiqlardan uzoqmi */
function ok(q: XY[], area: XY[], obs: Obstacle[]): boolean {
  if (!q.every(p => inside(p, area))) return false;
  for (let i = 0; i < q.length; i++) for (let j = 0; j < area.length; j++) if (segX(q[i], q[(i + 1) % q.length], area[j], area[(j + 1) % area.length])) return false;
  const c: XY = [q.reduce((s, p) => s + p[0], 0) / q.length, q.reduce((s, p) => s + p[1], 0) / q.length];
  for (const o of obs) {
    if (inside(c, o.ring) || q.some(p => inside(p, o.ring)) || o.ring.some(p => inside(p, q))) return false;
    if (o.buf > 0 && [...q, c].some(p => ringD(p, o.ring) < o.buf)) return false;
    for (let i = 0; i < q.length; i++) for (let j = 0; j < o.ring.length; j++) if (segX(q[i], q[(i + 1) % q.length], o.ring[j], o.ring[(j + 1) % o.ring.length])) return false;
  }
  return true;
}

/** Bitta yoʻnalish va siljish uchun joylashtirish (mahalliy u — boʻlak boʻylab, v — unga tik) */
function layoutAt(area: XY[], obs: Obstacle[], mod: ParkModule, ang: number, off: number): StallLayout {
  const M = PARK_MOD[mod], a = M.deg * Math.PI / 180;
  const U: XY = [Math.cos(ang), Math.sin(ang)], V: XY = [-U[1], U[0]];
  const loc = (p: XY): XY => [p[0] * U[0] + p[1] * U[1], p[0] * V[0] + p[1] * V[1]];
  const glob = (u: number, v: number): XY => [u * U[0] + v * V[0], u * U[1] + v * V[1]];
  const L = area.map(loc);
  const u0 = Math.min(...L.map(p => p[0])), u1 = Math.max(...L.map(p => p[0])), v0 = Math.min(...L.map(p => p[1])), v1 = Math.max(...L.map(p => p[1]));
  // qator chuqurligi d va boʻlak boʻylab qadam p
  const par = M.deg === 0;
  const d = par ? M.W : M.L * Math.sin(a) + M.W * Math.cos(a), p = par ? M.L : M.W / Math.sin(a);
  const mw = 2 * d + M.A;
  // joy: qatordagi i-oʻrin; side = -1 (boʻlak ostida), +1 (ustida); ve — boʻlak cheti
  const stall = (us: number, ve: number, side: number): XY[] => {
    if (par || M.deg === 90) return [[us, ve], [us + p, ve], [us + p, ve + side * d], [us, ve + side * d]].map(q => glob(q[0], q[1]));
    // aylantirilgan toʻrtburchak: qisqa tomoni boʻlak chetida, uzun oʻqi boʻlakdan α burchakda
    const e: XY = [Math.cos(a), side * Math.sin(a)], f: XY = [Math.sin(a), -side * Math.cos(a)];
    const s: XY = [us, ve];
    const c1: XY = [s[0] + f[0] * M.W, s[1] + f[1] * M.W];
    const pts: XY[] = [s, c1, [c1[0] + e[0] * M.L, c1[1] + e[1] * M.L], [s[0] + e[0] * M.L, s[1] + e[1] * M.L]];
    // boʻlak chetiga tegishi uchun: eng yaqin uch ve da
    const dv = Math.min(...pts.map(q => side * (q[1] - ve)));
    return pts.map(q => glob(q[0], q[1] - side * dv));
  };
  const stalls: XY[][] = [], aisles: XY[][] = [];
  const nU = Math.floor((u1 - u0) / p);
  for (let vb = v0 + off; vb + d + M.A <= v1 + 1e-6; vb += mw) {
    const aLo = vb + d, aHi = aLo + M.A;
    // boʻlak katakchalari
    const cell = (i: number) => [[u0 + i * p, aLo], [u0 + (i + 1) * p, aLo], [u0 + (i + 1) * p, aHi], [u0 + i * p, aHi]].map(q => glob(q[0], q[1])) as XY[];
    const okA: boolean[] = []; for (let i = 0; i < nU; i++) okA.push(ok(cell(i), area, obs));
    const got: boolean[] = new Array(nU).fill(false), bay: XY[][] = [];
    for (let i = 0; i < nU; i++) {
      if (!okA[i]) continue;
      for (const side of [-1, 1]) {
        const q = stall(u0 + i * p, side < 0 ? aLo : aHi, side);
        if (ok(q, area, obs)) { bay.push(q); got[i] = true; }
      }
    }
    if (!bay.length) continue;
    stalls.push(...bay);
    // uzluksiz boʻlak boʻlaklari (joyi bor kataklar orasida)
    for (let i = 0; i < nU;) {
      if (!okA[i]) { i++; continue; }
      let j = i; while (j + 1 < nU && okA[j + 1]) j++;
      let a0 = -1, a1 = -1; for (let k = i; k <= j; k++) if (got[k]) { if (a0 < 0) a0 = k; a1 = k; }
      if (a0 >= 0) aisles.push([[u0 + a0 * p, aLo], [u0 + (a1 + 1) * p, aLo], [u0 + (a1 + 1) * p, aHi], [u0 + a0 * p, aHi]].map(q => glob(q[0], q[1])) as XY[]);
      i = j + 1;
    }
  }
  return { stalls, aisles, n: stalls.length, module: mod, angle: ang };
}

/** Eng koʻp joy beradigan yoʻnalish (maydon qirralari boʻyicha) va siljish */
export function layoutStalls(area: XY[], obs: Obstacle[], mod: ParkModule): StallLayout {
  const angs: number[] = [];
  for (let i = 0; i < area.length; i++) {
    const a = area[i], b = area[(i + 1) % area.length]; if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 8) continue;
    const t = ((Math.atan2(b[1] - a[1], b[0] - a[0]) % Math.PI) + Math.PI) % Math.PI;
    if (!angs.some(x => Math.abs(x - t) < 0.03 || Math.abs(Math.abs(x - t) - Math.PI) < 0.03)) angs.push(t);
  }
  if (!angs.length) angs.push(0);
  const M = PARK_MOD[mod], d = M.deg === 0 ? M.W : M.L * Math.sin(M.deg * Math.PI / 180) + M.W * Math.cos(M.deg * Math.PI / 180), mw = 2 * d + M.A;
  let best: StallLayout = { stalls: [], aisles: [], n: 0, module: mod, angle: 0 };
  for (const t of angs.slice(0, 6)) for (const ang of [t, t + Math.PI / 2]) for (const f of [0, 1 / 3, 2 / 3]) {
    const r = layoutAt(area, obs, mod, ang, f * mw);
    if (r.n > best.n) best = r;
  }
  return best;
}

/** Talabdan ortiqcha joylarni olib tashlash: maydon chetiga (koʻchaga) yaqinlari qoladi; boʻlaklar qisqartiriladi */
export function trimStalls(L: StallLayout, need: number, area: XY[]): StallLayout {
  if (L.n <= need) return L;
  const cen = (q: XY[]): XY => [q.reduce((s, p) => s + p[0], 0) / q.length, q.reduce((s, p) => s + p[1], 0) / q.length];
  // yaxlit guruh: boʻlak boʻylab bir uchidan (koʻchaga yaqin uchidan) toʻldiriladi — boʻlaklar qisqa boʻladi
  const U: XY = [Math.cos(L.angle), Math.sin(L.angle)], pr = (q: XY[]) => { const c = cen(q); return c[0] * U[0] + c[1] * U[1]; };
  const all = L.stalls.map(q => ({ q, t: pr(q), d: ringD(cen(q), area) }));
  const t0 = Math.min(...all.map(x => x.t)), t1 = Math.max(...all.map(x => x.t));
  // qaysi uch chegaraga yaqin: oʻsha uchidan boshlanadi
  const near = (t: number) => Math.min(...all.filter(x => Math.abs(x.t - t) < 4).map(x => x.d));
  const sgn = near(t0) <= near(t1) ? 1 : -1;
  const keep = all.sort((a, b) => sgn * (a.t - b.t) || a.d - b.d).slice(0, Math.max(0, need)).map(x => x.q);
  // boʻlak — saqlangan joylarga tegadigan qismi
  const aisles: XY[][] = [];
  for (const a of L.aisles) {
    const U: XY = [a[1][0] - a[0][0], a[1][1] - a[0][1]], len = Math.hypot(U[0], U[1]); if (len < 1e-6) continue;
    const u: XY = [U[0] / len, U[1] / len], V: XY = [a[3][0] - a[0][0], a[3][1] - a[0][1]], wid = Math.hypot(V[0], V[1]), v: XY = [V[0] / (wid || 1), V[1] / (wid || 1)];
    let t0 = Infinity, t1 = -Infinity;
    for (const q of keep) {
      const c = cen(q), du = (c[0] - a[0][0]) * u[0] + (c[1] - a[0][1]) * u[1], dv = (c[0] - a[0][0]) * v[0] + (c[1] - a[0][1]) * v[1];
      if (du < -3 || du > len + 3 || dv < -9 || dv > wid + 9) continue;
      for (const p of q) { const t = (p[0] - a[0][0]) * u[0] + (p[1] - a[0][1]) * u[1]; t0 = Math.min(t0, t); t1 = Math.max(t1, t); }
    }
    if (t1 <= t0) continue;
    t0 = Math.max(0, t0); t1 = Math.min(len, t1);
    const P = (t: number, w: number): XY => [a[0][0] + u[0] * t + v[0] * w, a[0][1] + u[1] * t + v[1] * w];
    aisles.push([P(t0, 0), P(t1, 0), P(t1, wid), P(t0, wid)]);
  }
  return { ...L, stalls: keep, aisles, n: keep.length };
}
