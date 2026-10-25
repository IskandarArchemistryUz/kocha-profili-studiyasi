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

/** Ikki qavariq koʻpburchak kesishadimi (ajratuvchi oʻq teoremasi) */
function convexHit(a: XY[], b: XY[]): boolean {
  for (const P of [a, b]) for (let i = 0; i < P.length; i++) {
    const p = P[i], q = P[(i + 1) % P.length], n: XY = [q[1] - p[1], p[0] - q[0]];
    const pr = (R: XY[]) => R.map(x => x[0] * n[0] + x[1] * n[1]);
    const A = pr(a), B = pr(b);
    if (Math.max(...A) <= Math.min(...B) + 1e-6 || Math.max(...B) <= Math.min(...A) + 1e-6) return false;
  }
  return true;
}
/** p dan q gacha, eni w boʻlgan toʻrtburchak (oʻq — pq) */
function band(p: XY, q: XY, w: number): XY[] {
  const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * w / 2, ny = dx / l * w / 2;
  return [[p[0] + nx, p[1] + ny], [q[0] + nx, q[1] + ny], [q[0] - nx, q[1] - ny], [p[0] - nx, p[1] - ny]];
}
export interface ParkAccess { lanes: XY[][]; len: number; removed: number; exit: XY }
/**
 * Kechki roʻyxat (26.10, #25): yer usti avtoturargoh boʻlaklari bir-biriga va kvartal chegarasidagi koʻchaga ulanadi.
 *  1) yigʻuvchi boʻlak — boʻlaklarning koʻchaga yaqin uchlarini koʻndalang birlashtiradi (bitta boʻlak boʻlsa — kerak emas);
 *  2) kirish yoʻli — yigʻuvchi (yoki boʻlak uchi) dan kvartal chegarasigacha eng qisqa, binolarni kesib oʻtmaydigan;
 *     chegaradagi chiqish nuqtasi kvartal burchagidan ≥ gap (ShNQ 2.07.01-23, 414-band: turargoh kirish-chiqishi
 *     mahalliy koʻcha chorrahasidan ≥ 20 m; kvartal burchagi — chorraha deb olinadi, taxmin);
 *  eni — 5,5 m (ShNQ 2.07.06-24, 106-band: turar joyga kirish yoʻli). Yoʻl ustidagi joylar olib tashlanadi.
 */
function accessGroup(L: StallLayout, aisles: XY[][], A: XY[], blds: XY[][], w: number, gap: number): { lanes: XY[][]; len: number; exit: XY } | null {
  if (!aisles.length) return null;
  const u: XY = [Math.cos(L.angle), Math.sin(L.angle)], v: XY = [-u[1], u[0]];
  const T = (p: XY) => p[0] * u[0] + p[1] * u[1], Vv = (p: XY) => p[0] * v[0] + p[1] * v[1], G = (t: number, s: number): XY => [u[0] * t + v[0] * s, u[1] * t + v[1] * s];
  const ais = aisles.map(a => { const ts = a.map(T), vs = a.map(Vv); return { t0: Math.min(...ts), t1: Math.max(...ts), v0: Math.min(...vs), v1: Math.max(...vs) }; });
  const blocked = (q: XY[]) => blds.some(b => convexHit(q, b) || b.some(p => inside(p, q)) || q.some(p => inside(p, b)));
  const inA = (q: XY[]) => q.every(p => inside(p, A) || ringD(p, A) < 0.5);
  /** p dan eng yaqin chiqish (burchakdan ≥ gap): yoʻl va uzunligi; p chegarada boʻlsa — yoʻlsiz */
  const exitFrom = (p: XY): { lane: XY[] | null; len: number; q: XY } | null => {
    let b: { lane: XY[] | null; len: number; q: XY } | null = null;
    for (let i = 0; i < A.length; i++) {
      const a = A[i], c = A[(i + 1) % A.length], ex = c[0] - a[0], ey = c[1] - a[1], el = Math.hypot(ex, ey);
      if (el < 2 * gap + w) continue;
      let t = ((p[0] - a[0]) * ex + (p[1] - a[1]) * ey) / (el * el);
      t = Math.max((gap + w / 2) / el, Math.min(1 - (gap + w / 2) / el, t));
      const q: XY = [a[0] + ex * t, a[1] + ey * t], len = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (b && len >= b.len) continue;
      const lane = len > 1 ? band(p, q, w) : null;
      if (lane && (blocked(lane) || !inside([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], A))) continue;
      b = { lane, len, q };
    }
    return b;
  };
  let best: { lanes: XY[][]; len: number; exit: XY; cost: number } | null = null;
  // narx: yoʻl uzunligi + yoʻqotilgan joylar (bitta joy ≈ 3 m yoʻl)
  const take = (lanes: XY[][], len: number, exit: XY) => {
    const lost = L.stalls.filter(q => lanes.some(l => convexHit(q, l))).length, cost = len + 3 * lost;
    if (!best || cost < best.cost) best = { lanes, len, exit, cost };
  };
  for (const side of [-1, 1] as const) {
    const end = (a: typeof ais[number]) => (side < 0 ? a.t0 : a.t1);
    const tEnd = side < 0 ? Math.min(...ais.map(a => a.t0)) : Math.max(...ais.map(a => a.t1));
    // A) yigʻuvchi: boʻlaklar uchidan tashqarida koʻndalang, bitta kirish yoʻli bilan
    // yigʻuvchi boʻlaklar uchidan tashqarida (oʻrin boʻlsa) yoki ichkarida — oxirgi joylar ustidan (joylar olinadi)
    if (ais.length > 1) for (const inward of [false, true]) {
      const vLo = Math.min(...ais.map(a => a.v0)), vHi = Math.max(...ais.map(a => a.v1)), tc = tEnd + (inward ? -1 : 1) * side * w / 2, spine = band(G(tc, vLo), G(tc, vHi), w);
      const ext = ais.filter(a => Math.abs(end(a) - tEnd) > 0.3).map(a => [G(end(a), a.v0), G(tEnd, a.v0), G(tEnd, a.v1), G(end(a), a.v1)] as XY[]);
      if (inA(spine) && !blocked(spine) && !ext.some(blocked))
        for (let k = 0; k <= 12; k++) { const e = exitFrom(G(tc, vLo + w / 2 + (vHi - vLo - w) * k / 12)); if (e) take([spine, ...ext, ...(e.lane ? [e.lane] : [])], e.len, e.q); }
    }
  }
  // B) har boʻlak oʻzining qulayroq uchidan koʻchaga (uchi chegarada boʻlsa — yoʻlsiz)
  const lost = (l: XY[] | null) => (l ? L.stalls.filter(q => convexHit(q, l)).length : 0);
  const lanes: XY[][] = []; let tot = 0, first: XY | null = null, okB = true;
  for (const a of ais) {
    const es = [a.t0, a.t1].map(t => exitFrom(G(t, (a.v0 + a.v1) / 2))).filter((e): e is NonNullable<typeof e> => !!e).sort((x, y) => x.len + 3 * lost(x.lane) - y.len - 3 * lost(y.lane));
    const e = es[0]; if (!e) { okB = false; break; } if (e.lane) lanes.push(e.lane); tot += e.len; first ??= e.q;
  }
  if (okB && first) take(lanes, tot, first);
  return best;
}
export function parkAccess(L: StallLayout, A: XY[], blds: XY[][], w = 5.5, gap = 20): ParkAccess | null {
  if (!L.aisles.length) return null;
  // boʻlaklar guruhlari: boʻylama oraliqlari kesishadiganlar (bino bilan ajralgan qatorlar — alohida guruh, oʻz kirishi bilan)
  const u: XY = [Math.cos(L.angle), Math.sin(L.angle)], T = (p: XY) => p[0] * u[0] + p[1] * u[1];
  const rs = L.aisles.map(a => ({ a, t0: Math.min(...a.map(T)), t1: Math.max(...a.map(T)) })).sort((x, y) => x.t0 - y.t0);
  const groups: XY[][][] = [];
  let cur: typeof rs = [], hi = -Infinity;
  for (const r of rs) { if (cur.length && r.t0 > hi - 1) { groups.push(cur.map(x => x.a)); cur = []; hi = -Infinity; } cur.push(r); hi = Math.max(hi, r.t1); }
  if (cur.length) groups.push(cur.map(x => x.a));
  const lanes: XY[][] = []; let len = 0, exit: XY | null = null;
  for (const g of groups) { const b = accessGroup(L, g, A, blds, w, gap); if (!b) return null; lanes.push(...b.lanes); len += b.len; exit ??= b.exit; }
  if (!exit) return null;
  const n0 = L.stalls.length, keep = L.stalls.filter(s => !lanes.some(l => convexHit(s, l)));
  L.stalls.splice(0, L.stalls.length, ...keep); L.n = keep.length;
  L.aisles.push(...lanes);
  return { lanes, len, removed: n0 - keep.length, exit };
}
