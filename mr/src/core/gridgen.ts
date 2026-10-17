/**
 * Koʻcha tarmogʻi generatori: uchastka ichida blok toʻri — tahlil qilingan shahar bloklari (claude/archemistry-bloklar-va-normalar.md, 2-jadval)
 * modullari boʻyicha. Natija — koʻcha oʻqlari (uchastka chegarasiga qirqilgan); kvartallar keyin oʻzi hisoblanadi
 * (uchastka − koridorlar). Oʻq yoʻnalishi: avtomatik (uchastkaning eng uzun tomoni) yoki berilgan burchak.
 */
import { obb2, signedArea, type XY } from './geo';

export interface GridPreset { id: string; name: string; w: number; h: number; note: string; src: string }
export const GRID_PRESETS: GridPreset[] = [
  { id: 'portlend', name: 'Portlend', w: 61, h: 61, note: 'mayda kvadrat bloklar, zich toʻr', src: 'Grid plan — Wikipedia' },
  { id: 'barselona', name: 'Barselona (Eixample)', w: 113, h: 113, note: 'Serda bloklari, 20 m koʻchalar', src: 'Grid plan — Wikipedia' },
  { id: 'chikago', name: 'Chikago', w: 100, h: 200, note: 'choʻziq bloklar', src: 'City block — Wikipedia' },
  { id: 'manhattan', name: 'Manhattan', w: 80, h: 274, note: 'uzun bloklar, avenyu 30 m', src: 'The Greatest Grid — MCNY' },
  { id: 'melburn', name: 'Melburn (Hoddle)', w: 200, h: 200, note: 'katta bloklar, oʻrtada kichik koʻcha', src: 'Hoddle Grid — Wikipedia' },
  { id: 'mikrorayon', name: 'Mikrorayon', w: 300, h: 300, note: 'yirik kvartal (≈ 9 ga), ichki oʻtish yoʻllari', src: 'Microdistrict — Wikipedia' },
  { id: 'daha', name: 'ShNQ daha', w: 316, h: 316, note: '≤ 10 ga (ShNQ 2.07.01-23, 56-band)', src: 'ShNQ 2.07.01-23' },
];

export interface GridParams {
  w: number; h: number;
  /** oʻq burchagi, ° (null — avtomatik: uchastkaning eng uzun tomoni) */
  angle: number | null;
  /** toʻr siljishi, modul ulushida (0 — chiziqlar chegaradan butun modulda; 0,5 — yarim modul) */
  offU: number; offV: number;
  /** har n-chi chiziq — asosiy koʻcha profili (0 — hammasi ikkilamchi) */
  mainEvery: number;
  /** oʻzgartirish: moduldan kichik chetki bloklar qoʻshni blokka qoʻshiladi (chiziq tashlanadi) */
  minEdge: number;
  profiles: { main: string; minor: string };
}
export const DEFAULT_GRID: GridParams = { w: 113, h: 113, angle: null, offU: 0, offV: 0, mainEvery: 3, minEdge: 0.45, profiles: { main: 'turar-20', minor: 'mahalla-15' } };

export interface GridStreet { axis: XY[]; profile: string; main: boolean }

/** Uchastka uchun avtomatik burchak (°): eng uzun tomon yoʻnalishi */
export function autoAngle(site: XY[]): number {
  const { U } = obb2(site); return Math.atan2(U[1], U[0]) * 180 / Math.PI;
}

/** Kesma ∩ koʻpburchak (teshiksiz): ichkaridagi boʻlaklar */
function clipSeg(a: XY, b: XY, ring: XY[]): XY[][] {
  const ts: number[] = [0, 1], n = ring.length, dx = b[0] - a[0], dy = b[1] - a[1];
  for (let i = 0; i < n; i++) {
    const p = ring[i], q = ring[(i + 1) % n], ex = q[0] - p[0], ey = q[1] - p[1], den = dx * ey - dy * ex; if (Math.abs(den) < 1e-9) continue;
    const t = ((p[0] - a[0]) * ey - (p[1] - a[1]) * ex) / den, s = ((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / den;
    if (t > 0 && t < 1 && s >= 0 && s <= 1) ts.push(t);
  }
  ts.sort((x, y) => x - y);
  const inside = (p: XY) => { let c = false; for (let i = 0, j = n - 1; i < n; j = i++) if ((ring[i][1] > p[1]) !== (ring[j][1] > p[1]) && p[0] < (ring[j][0] - ring[i][0]) * (p[1] - ring[i][1]) / (ring[j][1] - ring[i][1]) + ring[i][0]) c = !c; return c; };
  const out: XY[][] = [];
  for (let k = 1; k < ts.length; k++) {
    const t0 = ts[k - 1], t1 = ts[k]; if (t1 - t0 < 1e-6) continue;
    const m: XY = [a[0] + dx * (t0 + t1) / 2, a[1] + dy * (t0 + t1) / 2];
    if (inside(m)) out.push([[a[0] + dx * t0, a[1] + dy * t0], [a[0] + dx * t1, a[1] + dy * t1]]);
  }
  return out;
}

/** Toʻr koʻchalari: ikki yoʻnalishdagi chiziqlar, uchastkaga qirqilgan; qisqa boʻlaklar (< 0,6 modul) tashlanadi */
export function gridStreets(site: XY[], g: GridParams): GridStreet[] {
  const ring = signedArea(site) < 0 ? site.slice().reverse() : site.slice();
  const ang = (g.angle ?? autoAngle(ring)) * Math.PI / 180, u: XY = [Math.cos(ang), Math.sin(ang)], v: XY = [-u[1], u[0]];
  const pu = ring.map(p => p[0] * u[0] + p[1] * u[1]), pv = ring.map(p => p[0] * v[0] + p[1] * v[1]);
  const u0 = Math.min(...pu), u1 = Math.max(...pu), v0 = Math.min(...pv), v1 = Math.max(...pv);
  const out: GridStreet[] = [];
  /** c — chiziqning koʻndalang koordinatasi; dir — chiziq yoʻnalishi; along — chiziq boʻylab oʻq (uchun chegaralar) */
  const line = (c: number, dir: XY, nrm: XY, lo: number, hi: number, main: boolean, modulAlong: number) => {
    const a: XY = [nrm[0] * c + dir[0] * (lo - 50), nrm[1] * c + dir[1] * (lo - 50)], b: XY = [nrm[0] * c + dir[0] * (hi + 50), nrm[1] * c + dir[1] * (hi + 50)];
    for (const seg of clipSeg(a, b, ring)) { const L = Math.hypot(seg[1][0] - seg[0][0], seg[1][1] - seg[0][1]); if (L >= modulAlong * 0.6 && L >= 30) out.push({ axis: seg, profile: main ? g.profiles.main : g.profiles.minor, main }); }
  };
  // v boʻylab chiziqlar (u yoʻnalishida yotadi) — oraliq h; u boʻylab chiziqlar (v yoʻnalishida) — oraliq w
  /** chiziqlar: span moduldan butun songa boʻlinmasa, bloklar tenglashtiriladi (chetki yarim bloklar qolmasin); off — modul ulushida siljish */
  const place = (lo: number, hi: number, step: number, off: number): { c: number; k: number }[] => {
    const span = hi - lo, n = Math.max(1, Math.round(span / step)), st = span / n, cs: { c: number; k: number }[] = [];
    for (let k = 0; k <= n; k++) { const c = lo + (k + off) * st; if (c - lo < st * g.minEdge || hi - c < st * g.minEdge) continue; cs.push({ c, k }); }
    return cs;
  };
  // asosiy koʻcha — toʻrning har n-chi chizigʻi (chetlari tashlangan boʻlsa ham sanoq toʻr boʻyicha)
  place(v0, v1, g.h, g.offV).forEach(({ c, k }) => line(c, u, v, u0, u1, g.mainEvery > 0 && k % g.mainEvery === g.mainEvery - 1, g.w));
  place(u0, u1, g.w, g.offU).forEach(({ c, k }) => line(c, v, u, v0, v1, g.mainEvery > 0 && k % g.mainEvery === g.mainEvery - 1, g.h));
  return out;
}

/** Variantlar: bir preset — avtomatik burchak, 90° burilgan, yarim modul siljigan */
export function gridVariants(site: XY[], base: GridParams): { name: string; g: GridParams }[] {
  const a = autoAngle(site);
  return [
    { name: 'Uzun tomon boʻylab', g: { ...base, angle: a } },
    { name: 'Koʻndalang', g: { ...base, angle: a + 90 } },
    { name: 'Siljigan', g: { ...base, angle: a, offU: 0.5, offV: 0.5 } },
    { name: '45°', g: { ...base, angle: a + 45 } },
  ];
}
