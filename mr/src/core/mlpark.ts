/**
 * Koʻp qavatli avtoturargoh (05.11, egasi: «koʻp qavatli parkovka qoʻsh — qoidalari bilan, ichida pandus yoʻlaklari bilan,
 * nechta mashina sigʻishini ham hisoblasin»).
 *
 * NORMA (asl matn, ShNQ 2.07.01-23):
 *  - 410-band — hisob muddatiga kutiladigan avtomobillar uchun yer osti yoki koʻp qavatli avtoturargohlar loyihalanadi;
 *  - 411-band — machina joylarining kamida 5 % (kamida 1) nogironligi boʻlgan shaxslar uchun;
 *  - 412-band — savdo va biznes markazlari, koʻngilochar va dam olish maskanlari, YoQSh, mehmonxonalar… avtoturargohlarida
 *    kamida 5 % (kamida 1) elektromobil va gibridlarni quvvatlantirish uchun;
 *  - 413-band — bir mashina-joyga yer uchastkasi kamida: 2 qavatli — 20, 3 — 14, 4 — 12, 5 — 10, ochiq — 25 m²;
 *  - 414-band — kirish-chiqish joylari magistral koʻchalar chorrahasidan ≥ 50 m, mahalliy koʻchalardan ≥ 20 m, bekatdan ≥ 5 m;
 *  - 418-band, 30-jadval — yer usti va ochiq avtoturargohlardan binolargacha masofa (sigʻimga qarab).
 *
 * ANDOZA (Oʻzbekiston normasi normalar papkasida yoʻq — SP 113.13330.2016 (RF) — taqqoslash uchun):
 *  - qavat balandligi 3,0 m (gabarit ≥ 2,2 m); toʻgʻri pandus qiyaligi ≤ 18 % (egri ≤ 13 %); bir yoʻnalishli pandus eni ≥ 3,5 m;
 *    pandus uchlarida oʻtish uchastkalari — qiyaligi yarmi, uzunligi 3,6 m: gorizontal uzunlik = H / i + 3,6 (3 m da ≈ 20,3 m);
 *  - joy 2,5 × 5,3 m, manevr yoʻlagi 6,0 m (PARK_MOD.p90 — Toshkent dizayn-kodi 6.3); tashqi chekinish 3 m;
 *  - har qavatda 2 ta evakuatsiya zinasi / lift tuguni (har biri 3 joy oʻrnida), 1-qavatda nazorat punkti (2 joy oʻrnida).
 *
 * Reja (mahalliy u — bino uzunligi, v — eni): [pandus tasmasi 7,5 m: ikki yoʻnalish 3,5 + 3,5 + ajratgich 0,5] [yoʻlak 6] [joylar 5,3],
 * keyin ikki tomonlama qatorlar [joylar 5,3][yoʻlak 6][joylar 5,3]; ikki uchida koʻndalang yoʻlak 6 m (qatorlar yoʻlaklarini ulaydi).
 * Pandus tasmasining pandusdan boshqa qismida — joylar (yoʻlakka tutash 5,3 m). Pandus barcha qavatlarda bir joyda (ustma-ust).
 */
import type { XY } from './geo';
import { PARK_MOD } from './parking';

export const ML = {
  floorH: 3.0, clear: 2.2, slope: 0.15, slopeCurve: 0.13, lane: 3.5, sep: 0.5, trans: 3.6, setback: 3,
  stallW: PARK_MOD.p90.W, stallL: PARK_MOD.p90.L, aisle: PARK_MOD.p90.A, coreStalls: 3, gateStalls: 2,
  /** 05.11 (egasi: misollar papkasi «parkovka»): ustun har 3 joyda, 0,6 m → toʻr 8,1 m (misollar: 7,8–8,1 m) — ANDOZA */
  col: 0.6, colEvery: 3,
  /** koʻndalang (burilish) yoʻlagi bino uchlarida, m */
  endAisle: 6.0,
  /** qiya qavat: pol qiyaligi ≤ 5 % (misol: 3,9 %) — ANDOZA */
  floorSlope: 0.05,
  /** tashqi spiral (ikki yoʻlakli, konsentrik): tashqi radius 11 m, ichki 3,1 m (RU sxema, qavat 2,8–3,0 m) — ANDOZA */
  helixR: 11, helixRin: 3.1,
  /** evakuatsiya: istalgan joydan eng yaqin zina tuguniga ≤ 40 m (toʻgʻri chiziq) — ANDOZA: ShNQ 2.05.07-24 «Avtoturargohlar» normalar papkasida yoʻq */
  evac: 40,
  /** «oʻralgan» avtoturargoh: 1–2-qavat perimetrida savdo/ofis lentasi chuqurligi, m — ANDOZA (De Werf, Amsterdam) */
  linerD: 9,
} as const;
/** 05.11: pandus tizimi (misollar: tekis qavat + toʻgʻri pandus; yarim qavatli; qiya qavat; tashqi spiral) */
export type MlRamp = 'togri' | 'yarim' | 'qiya' | 'spiral';
export const ML_RAMPS: MlRamp[] = ['togri', 'yarim', 'qiya', 'spiral'];
export const ML_RAMP_NAME: Record<MlRamp, string> = { togri: 'Toʻgʻri pandus', yarim: 'Yarim qavatli', qiya: 'Qiya qavat', spiral: 'Tashqi spiral' };
export type MlMod = 'p90' | 'p60' | 'p45';
export const ML_MODS: MlMod[] = ['p90', 'p60', 'p45'];
export interface MlOpts { ramp?: MlRamp | 'auto'; mod?: MlMod | 'auto'; liner?: boolean; land?: number }
/** 413-band: bir mashina-joyga yer uchastkasi, m² (kamida) */
export const ML_413: Record<number, number> = { 2: 20, 3: 14, 4: 12, 5: 10 };
export const OPEN_413 = 25;
/** 413-band qiymati qavatlar boʻyicha; 5 dan koʻp — matnda yoʻq, 5 qavat qiymati olinadi (TALQIN) */
export const need413 = (levels: number): number => levels <= 1 ? OPEN_413 : ML_413[Math.min(5, Math.max(2, Math.round(levels)))];

/** Pandus gorizontal uzunligi, m: asosiy qiyalik + ikki uchida yarim qiyalikdagi oʻtish uchastkalari (ANDOZA) */
export function rampLen(H: number = ML.floorH, i: number = ML.slope, t: number = ML.trans): number {
  return Math.round((H / i - t + 2 * t) * 10) / 10;
}
export const rampWidth = (): number => 2 * ML.lane + ML.sep;

/** 30-jadval (418-band): masofa, m — sigʻim ustunlari: ≤ 10, 11–50, 51–100, 101–300, > 300; null — jadvalda «–» */
export const T30 = {
  front: [12, 15, 25, 35, 50], blind: [12, 10, 15, 25, 35], pub: [10, 10, 15, 25, 25], school: [15, 25, 25, 50, null], hosp: [25, 50, null, null, null],
} as const satisfies Record<string, readonly (number | null)[]>;
export const capCol = (n: number): number => n <= 10 ? 0 : n <= 50 ? 1 : n <= 100 ? 2 : n <= 300 ? 3 : 4;
export const CAP_COL_NAME = ['≤ 10', '11–50', '51–100', '101–300', '> 300'];

/** 411-band: nogironlar uchun joylar (≥ 5 %, kamida 1); 412-band: elektromobil quvvatlash joylari (≥ 5 %, kamida 1) */
export const pct5 = (n: number): number => n > 0 ? Math.max(1, Math.ceil(n * 0.05)) : 0;

export interface MlPark {
  ring: XY[]; levels: number; perFloor: number[]; spaces: number;
  stalls: XY[][]; aisles: XY[][]; ramps: XY[][]; cores: XY[][];
  L: number; W: number; bays: number; rampL: number; notes: string[];
  ramp: MlRamp; mod: MlMod; nCores: number; liner: XY[][]; slope?: number;
}

const rotP = (p: XY, a: number): XY => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
function signedArea(r: XY[]): number { let s = 0; for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }
/** Gorizontal chiziq bilan koʻpburchak kesishmasi — ichki oraliqlar */
function scan(r: XY[], y: number): [number, number][] {
  const xs: number[] = [];
  for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; if ((a[1] > y) !== (b[1] > y)) xs.push(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
  xs.sort((p, q) => p - q); const out: [number, number][] = []; for (let i = 0; i + 1 < xs.length; i += 2) out.push([xs[i], xs[i + 1]]); return out;
}
function segD(p: XY, a: XY, b: XY): number { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)) : 0; return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); }
const edgeD = (p: XY, r: XY[]) => { let d = Infinity; for (let i = 0; i < r.length; i++) d = Math.min(d, segD(p, r[i], r[(i + 1) % r.length])); return d; };

/** Burilgan koʻpburchakdagi eng katta oʻqqa parallel toʻrtburchak (chetdan ≥ sb), 1 m qadam */
function bestRect(r: XY[], sb: number): { x0: number; x1: number; y0: number; y1: number } | null {
  let y0 = Infinity, y1 = -Infinity; for (const p of r) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  const st = Math.max(1, (y1 - y0) / 160), ys: number[] = [], iv: ([number, number] | null)[] = [];
  for (let y = y0 + sb; y <= y1 - sb + 1e-9; y += st) {
    const s = scan(r, y); let best: [number, number] | null = null;
    for (const [a, b] of s) if (!best || b - a > best[1] - best[0]) best = [a, b];
    ys.push(y); iv.push(best ? [best[0] + sb, best[1] - sb] : null);
  }
  let out: { x0: number; x1: number; y0: number; y1: number } | null = null, oa = 0;
  for (let i = 0; i < ys.length; i++) {
    let a = -Infinity, b = Infinity;
    for (let j = i; j < ys.length; j++) {
      const q = iv[j]; if (!q) break; a = Math.max(a, q[0]); b = Math.min(b, q[1]); if (b - a < 10) break;
      const ar = (b - a) * (ys[j] - ys[i]); if (ar > oa) { oa = ar; out = { x0: a, x1: b, y0: ys[i], y1: ys[j] }; }
    }
  }
  return out;
}

type R4 = [number, number, number, number];
/** Modul: qator boʻylab qadam, qator chuqurligi (yoʻlakka perpendikulyar), yoʻlak eni; burchakli — bir yoʻnalishli yoʻlak */
function modDims(m: MlMod): { W: number; L: number; th: number; pitch: number; d: number; A: number } {
  const P = PARK_MOD[m], th = P.deg * Math.PI / 180, W = P.W, L = m === 'p90' ? ML.stallL : P.L;
  return { W, L, th, pitch: W / Math.sin(th), d: L * Math.sin(th) + W * Math.abs(Math.cos(th)), A: m === 'p90' ? ML.aisle : P.A };
}
interface Row { e: number; s: 1 | -1; dir: 1 | -1; wall: boolean }
interface Plan { stalls: XY[][]; aisles: R4[]; ramps: XY[][]; cores: R4[]; cols: R4[]; slope?: number; rampL: number }
const rq = (q: R4): XY[] => [[q[0], q[1]], [q[2], q[1]], [q[2], q[3]], [q[0], q[3]]];
const hitR = (a: R4, b: R4) => a[0] < b[2] - 1e-6 && a[2] > b[0] + 1e-6 && a[1] < b[3] - 1e-6 && a[3] > b[1] + 1e-6;

/** Eni: bay soni boʻyicha (toʻgʻri pandusda birinchi devor qatori oʻrnida pandus tasmasi) */
function widthOf(ramp: MlRamp, md: ReturnType<typeof modDims>, nb: number): number {
  const bay = md.A + 2 * md.d;
  return ramp === 'togri' ? Math.max(rampWidth(), md.d) + md.A + md.d + (nb - 1) * bay : nb * bay;
}

/** Bitta qavat rejasi (u — uzunlik, v — eni, mahalliy) */
function floorPlan(L: number, W: number, nb: number, ramp: MlRamp, md: ReturnType<typeof modDims>): Plan | null {
  const E = ML.endAisle, ue0 = E, ue1 = L - E, A = md.A, d = md.d, bay = A + 2 * d;
  if (ue1 - ue0 < 20) return null;
  const aisles: R4[] = [[0, 0, E, W], [L - E, 0, L, W]], ramps: XY[][] = [], blocked: R4[] = [], rows: Row[] = [];
  let rampL = 0, slope: number | undefined;
  if (ramp === 'togri') {
    const rw = Math.max(rampWidth(), d), rl = rampLen(); rampL = rl;
    if (ue0 + rl + 10 > ue1) return null;
    ramps.push(rq([ue0, 0, ue0 + rl, ML.lane]), rq([ue0, ML.lane + ML.sep, ue0 + rl, rampWidth()]));
    blocked.push([ue0, 0, ue0 + rl, rw]);
    rows.push({ e: rw, s: -1, dir: 1, wall: true }); aisles.push([ue0, rw, ue1, rw + A]); rows.push({ e: rw + A, s: 1, dir: 1, wall: false });
    let v = rw + A + d;
    for (let k = 1; k < nb; k++) { const dir: 1 | -1 = k % 2 ? -1 : 1; rows.push({ e: v + d, s: -1, dir, wall: false }); aisles.push([ue0, v + d, ue1, v + d + A]); rows.push({ e: v + d + A, s: 1, dir, wall: k === nb - 1 }); v += bay; }
  } else {
    if (nb < 2 && ramp !== 'spiral') return null;
    for (let k = 0; k < nb; k++) { const v = k * bay, dir: 1 | -1 = k % 2 ? -1 : 1; rows.push({ e: v + d, s: -1, dir, wall: k === 0 }); aisles.push([ue0, v + d, ue1, v + d + A]); rows.push({ e: v + d + A, s: 1, dir, wall: k === nb - 1 }); }
    const vm = Math.floor(nb / 2) * bay;   // ikki yarim orasidagi qoʻsh qator chizigʻi
    if (ramp === 'yarim') {
      const rl = rampLen(ML.floorH / 2); rampL = rl; if (ue0 + 2 * rl + 10 > ue1) return null;
      for (const [a, b] of [[ue0, ue0 + rl], [ue1 - rl, ue1]]) { ramps.push(rq([a, vm - d, b, vm - d + ML.lane]), rq([a, vm + d - ML.lane, b, vm + d])); blocked.push([a, vm - d, b, vm + d]); }
    } else if (ramp === 'qiya') {
      slope = (ML.floorH / 2) / (ue1 - ue0); if (slope > ML.floorSlope + 1e-9) return null;
    }
  }
  // zina-lift tugunlari: avval ikki uchida (devor qatorlari), keyin eng uzoq nuqtaga yaqin qatorga — evakuatsiya radiusi ≤ ML.evac (ANDOZA)
  const walls = rows.filter(r => r.wall), cl = ML.coreStalls * md.pitch, cores: R4[] = [];
  const coreAt = (r: Row, u: number): R4 => { const v0 = r.s > 0 ? r.e : r.e - d; return [u, v0, u + cl, v0 + d]; };
  const place = (r: Row, u0: number) => { let u = Math.max(ue0, Math.min(ue1 - cl, u0)); for (let t = 0; t < 60; t++) { const c = coreAt(r, u); if (!blocked.some(b => hitR(b, c)) && !cores.some(b => hitR(b, c))) { cores.push(c); return true; } u += (t % 2 ? -1 : 1) * (t + 1) * 1.5; u = Math.max(ue0, Math.min(ue1 - cl, u)); } return false; };
  place(walls[0] ?? rows[0], ue0); place(walls[walls.length - 1] ?? rows[rows.length - 1], ue1 - cl);
  const pts: XY[] = []; for (let u = 0; u <= L + 1e-6; u += 4) for (let v = 0; v <= W + 1e-6; v += 4) pts.push([u, v]);
  const dc = (p: XY) => Math.min(...cores.map(c => Math.hypot(p[0] - (c[0] + c[2]) / 2, p[1] - (c[1] + c[3]) / 2)));
  for (let n = 0; n < 24; n++) {
    let fp: XY = pts[0], fd = -1; for (const q of pts) { const x = dc(q); if (x > fd) { fd = x; fp = q; } }
    if (fd <= ML.evac) break;
    const r = rows.slice().sort((x, y) => Math.abs(x.e + x.s * d / 2 - fp[1]) - Math.abs(y.e + y.s * d / 2 - fp[1]))[0];
    if (!place(r, fp[0] - cl / 2)) break;
  }
  const bl = [...blocked, ...cores], stalls: XY[][] = [], cols: R4[] = [];
  for (const r of rows) {
    const ct = Math.cos(md.th), st = Math.sin(md.th), a: XY = [r.dir * ct, r.s * st], nn: XY = [st, -r.s * r.dir * ct];
    const shift = r.dir > 0 && ct > 1e-6 ? md.W * ct : 0;
    let u = ue0 + (r.dir < 0 ? md.L * ct : 0), k = 0;
    while (true) {
      const F: XY = [u, r.e + r.s * shift];
      const q: XY[] = [F, [F[0] + md.W * nn[0], F[1] + md.W * nn[1]], [F[0] + md.W * nn[0] + md.L * a[0], F[1] + md.W * nn[1] + md.L * a[1]], [F[0] + md.L * a[0], F[1] + md.L * a[1]]];
      const us = q.map(p => p[0]), vs = q.map(p => p[1]), bb: R4 = [Math.min(...us), Math.min(...vs), Math.max(...us), Math.max(...vs)];
      if (bb[2] > ue1 + 1e-6) break;
      if (!bl.some(b => hitR(b, bb))) { stalls.push(q); k++; if (k % ML.colEvery === 0) { const cv = r.s > 0 ? r.e + d - 0.6 : r.e - d; cols.push([u + md.pitch, cv, u + md.pitch + ML.col, cv + 0.6]); u += ML.col; } }
      else k = 0;
      u += md.pitch;
    }
  }
  return { stalls, aisles, ramps, cores, cols, slope, rampL };
}

/** Tashqi spiral: annulus boʻlaklari (toʻrtburchaklar) + ulovchi yoʻlak; markaz (cx, cy) */
function helix(cx: number, cy: number, x0: number): XY[][] {
  const R = ML.helixR, r = ML.helixRin, n = 16, out: XY[][] = [rq([x0, cy - ML.lane, cx - R + 0.5, cy + ML.lane])];
  for (let k = 0; k < n; k++) { const a0 = 2 * Math.PI * k / n, a1 = 2 * Math.PI * (k + 1) / n; out.push([[cx + r * Math.cos(a0), cy + r * Math.sin(a0)], [cx + R * Math.cos(a0), cy + R * Math.sin(a0)], [cx + R * Math.cos(a1), cy + R * Math.sin(a1)], [cx + r * Math.cos(a1), cy + r * Math.sin(a1)]]); }
  return out;
}

/**
 * Parsel halqasi (mahalliy metr) ichida koʻp qavatli avtoturargoh: eng katta toʻrtburchak (har qirra yoʻnalishida), pandus tizimi va joy moduli
 * boʻyicha eng koʻp joy beradigan variant («auto») yoki tanlangani. 413-band: land berilsa joylar soni land / need413 dan oshmaydi — bino qisqartiriladi.
 */
export function mlParking(ring: XY[], levels: number, landOrOpts?: number | MlOpts): MlPark | null {
  const o: MlOpts = typeof landOrOpts === 'number' ? { land: landOrOpts } : landOrOpts ?? {};
  const lv = Math.max(2, Math.min(5, Math.round(levels)));
  const ccw = signedArea(ring) > 0 ? ring : [...ring].reverse();
  const sb = ML.setback + (o.liner ? ML.linerD : 0);
  const rampsT: MlRamp[] = o.ramp && o.ramp !== 'auto' ? [o.ramp] : ML_RAMPS, modsT: MlMod[] = o.mod && o.mod !== 'auto' ? [o.mod] : ML_MODS;
  const cap = o.land && o.land > 0 ? Math.floor(o.land / need413(lv)) : Infinity;
  const tot = (p: Plan) => p.stalls.length * lv - ML.gateStalls;
  interface Cand { a: number; x0: number; y0: number; L: number; W: number; nb: number; ramp: MlRamp; mod: MlMod; p: Plan; hx: number }
  const cands: Cand[] = [];
  const angles = new Set<number>(); for (let i = 0; i < ccw.length; i++) { const p = ccw[i], q = ccw[(i + 1) % ccw.length]; if (Math.hypot(q[0] - p[0], q[1] - p[1]) < 5) continue; const a = Math.atan2(q[1] - p[1], q[0] - p[0]); angles.add(Math.round(a * 1000) / 1000); angles.add(Math.round((a + Math.PI / 2) * 1000) / 1000); }
  for (const a of angles) {
    const R = ccw.map(p => rotP(p, -a)), b = bestRect(R, sb); if (!b) continue;
    const L0 = b.x1 - b.x0, Wr = b.y1 - b.y0;
    for (const mod of modsT) for (const ramp of rampsT) {
      const md = modDims(mod), hx = ramp === 'spiral' ? 2 * ML.helixR + 2 : 0, L = L0 - hx;
      if (ramp === 'spiral' && Wr < 2 * ML.helixR) continue;
      let nb = 0; while (widthOf(ramp, md, nb + 1) <= Wr + 1e-6) nb++;
      if (nb < 1) continue;
      const W = widthOf(ramp, md, nb), p = floorPlan(L, W, nb, ramp, md); if (!p || !p.stalls.length) continue;
      cands.push({ a, x0: b.x0, y0: b.y0 + (Wr - W) / 2, L, W, nb, ramp, mod, p, hx });
    }
  }
  if (!cands.length) return null;
  cands.sort((x, y) => tot(y.p) - tot(x.p));
  // 413-band: eng yaxshi bir necha variant qisqartiriladi (avval uzunlik, keyin qatorlar), keyin eng koʻpi tanlanadi
  let best: Cand | null = null;
  if (cap === Infinity) best = cands[0];
  else for (const c of cands.slice(0, 8)) {
    let fit: Cand | null = tot(c.p) <= cap ? c : null;
    const md = modDims(c.mod);
    for (let nb = c.nb; nb >= 1 && !fit; nb--) {
      const W = widthOf(c.ramp, md, nb);
      for (let L = c.L; L >= 30; L -= md.pitch) { const p = floorPlan(L, W, nb, c.ramp, md); if (p && tot(p) <= cap) { fit = { ...c, nb, W, L, p, x0: c.x0 + (c.L - L) / 2, y0: c.y0 + (c.W - W) / 2 }; break; } }
    }
    if (fit && (!best || tot(fit.p) > tot(best.p))) best = fit;
  }
  if (!best) return null;
  const { a, x0, y0, L, W, nb, p, ramp, mod } = best;
  const toW = (u: number, v: number): XY => rotP([x0 + u, y0 + v], a);
  const wq = (q: XY[]) => q.map(([u, v]) => toW(u, v)), wr = (q: R4) => wq(rq(q));
  const rampsW = ramp === 'spiral' ? helix(L + 1 + ML.helixR, W / 2, L).map(wq) : p.ramps.map(wq);
  const D = ML.linerD, liner = o.liner ? [[-D, -D, L + (ramp === 'spiral' ? 0 : D), 0], [-D, W, L + (ramp === 'spiral' ? 0 : D), W + D], [-D, 0, 0, W], ...(ramp === 'spiral' ? [] : [[L, 0, L + D, W]])].map(q => wr(q as R4)) : [];
  const per = p.stalls.length, perFloor = Array.from({ length: lv }, (_, k) => k === 0 ? Math.max(0, per - ML.gateStalls) : per);
  const notes: string[] = [];
  if (ramp === 'yarim') notes.push('Yarim qavatli: bino ikki yarmi ½ qavatga siljigan, pandus qisqa (≈ ' + p.rampL.toFixed(1) + ' m) — ikki yarim orasidagi qoʻsh qator uchlarida.');
  if (ramp === 'qiya' && p.slope != null) notes.push(`Qiya qavat: pol qiyaligi ${(p.slope * 100).toFixed(1)} % — alohida pandus yoʻq, joylar qiya polda.`);
  if (ramp === 'spiral') notes.push(`Tashqi spiral pandus: R ${ML.helixR} m, bino uchida (ANDOZA).`);
  return {
    ring: wr([0, 0, L, W]), levels: lv, perFloor, spaces: perFloor.reduce((t, x) => t + x, 0),
    stalls: p.stalls.map(wq), aisles: p.aisles.map(wr), ramps: rampsW, cores: [...p.cores, ...p.cols].map(wr),
    L: Math.round(L * 10) / 10, W: Math.round(W * 10) / 10, bays: nb, rampL: p.rampL, notes, ramp, mod, nCores: p.cores.length, liner, ...(p.slope != null ? { slope: p.slope } : {}),
  };
}

/** Ikki halqa orasidagi eng qisqa masofa (kesishmasa), m */
export function ringDist(a: XY[], b: XY[]): number {
  let d = Infinity; for (const p of a) d = Math.min(d, edgeD(p, b)); for (const p of b) d = Math.min(d, edgeD(p, a)); return d;
}
