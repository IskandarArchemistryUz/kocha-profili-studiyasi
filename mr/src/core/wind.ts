/**
 * Shamol: iqlim maʼlumoti (EPW → shamol guli) va piyoda sathidagi oqimning soddalashtirilgan 2D hisobi.
 *
 * Usul: Lattice Boltzmann (D2Q9, BGK). Binolar dogʻi — toʻsiq (bounce-back), kirishda bir xil oqim.
 * Bu toʻliq 3D CFD emas: balandlik, turbulentlik va bino ustidan oqish hisobga olinmaydi — dastlabki loyiha
 * uchun tezlashish (tunnel), pana va «burchak» zonalarini sifat jihatidan koʻrsatadi.
 *
 * Qulaylik: Lawson (LDDC) mezoni — 5 % vaqt oshib ketadigan tezlik: < 4 m/s oʻtirish, < 6 turish,
 * < 8 sayr, < 10 tez yurish, ≥ 10 noqulay. Bu xalqaro amaliyot mezoni, Oʻzbekiston meʼyori emas.
 */
import type { XY } from './geo';

export interface Station { name: string; file: string; lat: number; lon: number; elev: number; hours: number; calm: number; rose: number[][]; mean: number; p95: number; monthT: (number | null)[]; monthV: (number | null)[] }
export interface Climate { source: string; bins: number[]; stations: Station[] }

const NAME8 = ['shimol', 'shimoli-sharq', 'sharq', 'janubi-sharq', 'janub', 'janubi-gʻarb', 'gʻarb', 'shimoli-gʻarb'];
/** 16 sektor nomi (22,5° qadam) */
export const rumbName = (k: number) => k % 2 === 0 ? NAME8[(k / 2) % 8] : `${NAME8[((k - 1) / 2) % 8]}–${NAME8[((k + 1) / 2) % 8]}`;

/**
 * Iqlim stansiyasidan foydalanish chegarasi, km. Shamol guli joyning relyefi va shahar qurilishiga bogʻliq — uzoq stansiya
 * boshqa iqlimni koʻrsatadi. 50 km dan uzoqda (va hozircha faqat Oʻzbekiston stansiyalari bor) shamol koʻrsatilmaydi.
 */
export const WIND_MAX_KM = 50;
export function nearestStation(c: Climate, lon: number, lat: number): { s: Station; km: number } {
  let best = c.stations[0], bd = Infinity;
  for (const s of c.stations) {
    const dx = (s.lon - lon) * 111.32 * Math.cos(lat * Math.PI / 180), dy = (s.lat - lat) * 111.13, d = Math.hypot(dx, dy);
    if (d < bd) { bd = d; best = s; }
  }
  return { s: best, km: bd };
}

/** Eng koʻp esadigan yoʻnalish (sektor indeksi 0..15 va gradusda «qayerdan») */
export function prevailing(s: Station): { k: number; deg: number; share: number } {
  let k = 0, m = -1; s.rose.forEach((r, i) => { const t = r.reduce((a, b) => a + b, 0); if (t > m) { m = t; k = i; } });
  return { k, deg: k * 22.5, share: m };
}

/* ---------------- Lattice Boltzmann D2Q9 ---------------- */
const EX = [0, 1, 0, -1, 0, 1, -1, -1, 1], EY = [0, 0, 1, 0, -1, 1, 1, -1, -1], W = [4 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 36, 1 / 36, 1 / 36, 1 / 36], OPP = [0, 3, 4, 1, 2, 7, 8, 5, 6];

/**
 * Oqim maydoni. solid — 1 boʻlgan kataklar toʻsiq. Oqim +x yoʻnalishida.
 * Natija: har katakda |u| / u_kirish (toʻsiqda 0).
 */
export function lbm(nx: number, ny: number, solid: Uint8Array, steps = 2400, uIn = 0.08, tau = 0.56): Float32Array {
  const N = nx * ny, f = new Float32Array(9 * N), g = new Float32Array(9 * N), om = 1 / tau;
  const feq = (k: number, rho: number, ux: number, uy: number) => { const eu = EX[k] * ux + EY[k] * uy, u2 = ux * ux + uy * uy; return W[k] * rho * (1 + 3 * eu + 4.5 * eu * eu - 1.5 * u2); };
  for (let i = 0; i < N; i++) for (let k = 0; k < 9; k++) f[k * N + i] = feq(k, 1, solid[i] ? 0 : uIn, 0);
  for (let t = 0; t < steps; t++) {
    // toʻqnashuv + oqish
    for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
      const i = y * nx + x;
      if (solid[i]) continue;
      let rho = 0, ux = 0, uy = 0;
      for (let k = 0; k < 9; k++) { const v = f[k * N + i]; rho += v; ux += v * EX[k]; uy += v * EY[k]; }
      ux /= rho; uy /= rho;
      for (let k = 0; k < 9; k++) {
        const v = f[k * N + i] + om * (feq(k, rho, ux, uy) - f[k * N + i]);
        let xx = x + EX[k], yy = y + EY[k];
        if (xx < 0 || xx >= nx) continue;
        yy = (yy + ny) % ny; // yon chegaralar — davriy
        const j = yy * nx + xx;
        if (solid[j]) g[OPP[k] * N + i] = v; // bounce-back
        else g[k * N + j] = v;
      }
    }
    // kirish (x=0): muvozanat holat; chiqish (x=nx-1): nol gradient
    for (let y = 0; y < ny; y++) {
      const i0 = y * nx, i1 = y * nx + nx - 1, i2 = y * nx + nx - 2;
      for (let k = 0; k < 9; k++) { g[k * N + i0] = feq(k, 1, uIn, 0); g[k * N + i1] = g[k * N + i2]; }
    }
    f.set(g);
  }
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    if (solid[i]) continue;
    let rho = 0, ux = 0, uy = 0; for (let k = 0; k < 9; k++) { const v = f[k * N + i]; rho += v; ux += v * EX[k]; uy += v * EY[k]; }
    out[i] = Math.hypot(ux / rho, uy / rho) / uIn;
  }
  return out;
}

export interface WindJob { rings: XY[][]; box: [number, number, number, number]; fromDeg: number; cell: number; steps?: number }
export interface WindOut { ratio: Float32Array; nx: number; ny: number; cell: number; ox: number; oy: number; ang: number }

/**
 * Binolar (mahalliy XY) va hisob qutisi boʻyicha oqim. fromDeg — shamol qayerdan esadi (meteorologik, ° shimoldan).
 * Hudud oqim yoʻnalishiga burilib, yuqori oqim tomonga 120 m zaxira qoʻshiladi.
 */
export function windField(job: WindJob): WindOut {
  const to = (job.fromDeg + 180) * Math.PI / 180, dir: XY = [Math.sin(to), Math.cos(to)], ang = Math.atan2(dir[1], dir[0]);
  const c = Math.cos(ang), s = Math.sin(ang), rot = (p: XY): XY => [p[0] * c + p[1] * s, -p[0] * s + p[1] * c];
  const [bx0, by0, bx1, by1] = job.box;
  const corners = [[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1]].map(p => rot(p as XY));
  let x0 = Math.min(...corners.map(p => p[0])) - 120, x1 = Math.max(...corners.map(p => p[0])) + 160;
  let y0 = Math.min(...corners.map(p => p[1])) - 80, y1 = Math.max(...corners.map(p => p[1])) + 80;
  const cell = job.cell, nx = Math.ceil((x1 - x0) / cell), ny = Math.ceil((y1 - y0) / cell);
  x1 = x0 + nx * cell; y1 = y0 + ny * cell;
  const solid = new Uint8Array(nx * ny);
  for (const r0 of job.rings) {
    const r = r0.map(rot); let ry0 = Infinity, ry1 = -Infinity; for (const p of r) { ry0 = Math.min(ry0, p[1]); ry1 = Math.max(ry1, p[1]); }
    for (let j = Math.max(0, Math.floor((ry0 - y0) / cell)); j <= Math.min(ny - 1, Math.floor((ry1 - y0) / cell)); j++) {
      const py = y0 + (j + 0.5) * cell, xs: number[] = [];
      for (let a = 0, b = r.length - 1; a < r.length; b = a++) if ((r[a][1] > py) !== (r[b][1] > py)) xs.push(r[a][0] + (py - r[a][1]) / (r[b][1] - r[a][1]) * (r[b][0] - r[a][0]));
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let i = Math.max(0, Math.ceil((xs[k] - x0) / cell - 0.5)); i <= Math.min(nx - 1, Math.floor((xs[k + 1] - x0) / cell - 0.5)); i++) solid[j * nx + i] = 1;
    }
  }
  const ratio = lbm(nx, ny, solid, job.steps ?? 2400);
  return { ratio, nx, ny, cell, ox: x0, oy: y0, ang };
}

/** Hisob katagidagi qiymat — mahalliy (oʻgirilmagan) nuqta uchun */
export function sampleWind(w: WindOut, p: XY): number {
  const c = Math.cos(w.ang), s = Math.sin(w.ang), x = p[0] * c + p[1] * s, y = -p[0] * s + p[1] * c;
  const i = Math.floor((x - w.ox) / w.cell), j = Math.floor((y - w.oy) / w.cell);
  if (i < 0 || j < 0 || i >= w.nx || j >= w.ny) return 1;
  return w.ratio[j * w.nx + i];
}

/** Lawson (LDDC) toifasi — 5 % oshadigan tezlik (m/s) boʻyicha */
export const LAWSON: [number, number, string][] = [[4, 0x4caf7d, 'Oʻtirish (< 4 m/s)'], [6, 0xa8d06b, 'Turish (4–6)'], [8, 0xf2d15b, 'Sayr (6–8)'], [10, 0xf29a4a, 'Tez yurish (8–10)'], [Infinity, 0xd9534f, 'Noqulay (≥ 10)']];
export const lawsonClass = (v: number) => LAWSON.findIndex(([t]) => v < t);
/** 10 m (meteostansiya) → 1,5 m (piyoda): daraja qonuni, shahar atrofi α ≈ 0,25 */
export const PED_FACTOR = Math.pow(1.5 / 10, 0.25);
