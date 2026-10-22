/**
 * Xarita yozuvlari (inventar 4.1, maket «MR-Yozuvlar», qaror 2026-10-17):
 * daha va yer uchastkasi yozuvi yerga yotadi, faqat boʻsh joyda turadi va masshtabga qarab qisqaradi.
 *  - Joy: uchastka − bino dogʻlari − 2 m bufer → eng katta ichki toʻrtburchak (uchastka yoʻnalishida).
 *  - Darajalar: 3 — kod + qisqa funksiya + maydon; 2 — kod + maydon; 1 — kod; 0 — jadvalda.
 *  - Sigʻish: kenglik ≈ 0,6 × shrift × belgilar; balandlik = qatorlar × shrift + (qatorlar − 1) × 0,35 × shrift.
 *  - Ekranda: kod 12 px, qolgani 11 px; varaqda: kod 3,5 mm, qolgani 2,5 mm (GOST 2.304-81 qatori).
 * Bu modul faqat geometriya va tanlov — chizish sahnada (scene.ts) va varaqda (sheet.ts).
 */
import type { XY } from './geo';

export type LabelLevel = 0 | 1 | 2 | 3;
/** Foydalanuvchi tanlovi: avtomatik (masshtab va joyga qarab) yoki eng yuqori daraja */
export type LabelMode = 'auto' | 'full' | 'codeArea' | 'code' | 'off';
export const LABEL_MODES: { id: LabelMode; name: string }[] = [
  { id: 'auto', name: 'Avtomatik' }, { id: 'full', name: 'Toʻliq' }, { id: 'codeArea', name: 'Kod + maydon' }, { id: 'code', name: 'Faqat kod' }, { id: 'off', name: 'Yoʻq' },
];
export const modeMax = (m: LabelMode): LabelLevel => m === 'off' ? 0 : m === 'code' ? 1 : m === 'codeArea' ? 2 : 3;

/** Boʻsh joy: markaz, oʻlcham (m) va burchak (rad, matn yoʻnalishi — toʻrtburchakning uzun tomoni) */
export interface FreeRect { c: XY; w: number; h: number; ang: number }

const pin = (p: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
function segDist(p: XY, a: XY, b: XY): number {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0;
  return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t);
}
const ringDist = (p: XY, r: XY[]) => { let d = Infinity; for (let i = 0; i < r.length; i++) d = Math.min(d, segDist(p, r[i], r[(i + 1) % r.length])); return d; };

/**
 * Boʻsh kataklar niqobi (1 — yozuv qoʻyish mumkin): katak markazi halqalar ichida (juft-toq), chegaradan ≥ yarim katak,
 * toʻsiq (bino) ichida emas va undan ≥ buf + yarim katak. Natija oddiy (har katak × har qirra) usul bilan bir xil,
 * lekin tez: ichkari — har qator uchun bir marta qirralar kesishmasi; chegara va toʻsiqlar — faqat oʻz qamrovidagi kataklar.
 * (Katta uchastkada — murakkab daha konturi va yuzlab OSM binolari — oddiy usul sahifani soniyalab qotirardi.)
 */
export function freeMask(R: XY[][], O: XY[][], ob: number[][], x0: number, y0: number, cell: number, nx: number, ny: number, buf: number): Uint8Array {
  const free = new Uint8Array(nx * ny), cx = (i: number) => x0 + (i + 0.5) * cell, cy = (j: number) => y0 + (j + 0.5) * cell;
  // 1) ichkari: qator boʻyicha kesishmalar (pin bilan bir xil shart va formula)
  const xs: number[] = [];
  for (let j = 0; j < ny; j++) {
    const py = cy(j); xs.length = 0;
    for (const r of R) for (let i = 0, k = r.length - 1; i < r.length; k = i++) if ((r[i][1] > py) !== (r[k][1] > py)) xs.push((r[k][0] - r[i][0]) * (py - r[i][1]) / (r[k][1] - r[i][1]) + r[i][0]);
    if (!xs.length) continue;
    xs.sort((a, b) => a - b);
    let q = 0;
    for (let i = 0; i < nx; i++) { const px = cx(i); while (q < xs.length && xs[q] <= px) q++; if ((xs.length - q) & 1) free[j * nx + i] = 1; }
  }
  // har qirra atrofidagi kataklar: masofa < lim boʻlsa — band
  const near = (a: XY, b: XY, lim: number) => {
    const i0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - lim - x0) / cell - 0.5)), i1 = Math.min(nx - 1, Math.ceil((Math.max(a[0], b[0]) + lim - x0) / cell - 0.5));
    const j0 = Math.max(0, Math.floor((Math.min(a[1], b[1]) - lim - y0) / cell - 0.5)), j1 = Math.min(ny - 1, Math.ceil((Math.max(a[1], b[1]) + lim - y0) / cell - 0.5));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const n = j * nx + i; if (free[n] && segDist([cx(i), cy(j)], a, b) < lim) free[n] = 0; }
  };
  // 2) chegaradan yarim katak ichkarida (yozuv chegaraga tegmasin)
  for (const r of R) for (let i = 0; i < r.length; i++) near(r[i], r[(i + 1) % r.length], cell * 0.5);
  // 3) toʻsiqlar: faqat qamrov (ob) ichidagi kataklar
  for (let k = 0; k < O.length; k++) {
    const o = O[k], b = ob[k];
    const i0 = Math.max(0, Math.floor((b[0] - x0) / cell - 0.5)), i1 = Math.min(nx - 1, Math.ceil((b[2] - x0) / cell - 0.5));
    const j0 = Math.max(0, Math.floor((b[1] - y0) / cell - 0.5)), j1 = Math.min(ny - 1, Math.ceil((b[3] - y0) / cell - 0.5));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const n = j * nx + i; if (!free[n]) continue;
      const p: XY = [cx(i), cy(j)]; if (p[0] < b[0] || p[0] > b[2] || p[1] < b[1] || p[1] > b[3]) continue;
      if (pin(p, o) || ringDist(p, o) < buf + cell * 0.5) free[n] = 0;
    }
  }
  return free;
}

/** Halqaning asosiy yoʻnalishi: eng uzun qirra burchagi (rad) */
export function mainAngle(r: XY[]): number {
  let best = 0, L = -1;
  for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l > L) { L = l; best = Math.atan2(b[1] - a[1], b[0] - a[0]); } }
  // −90°…90° oraligʻiga (matn teskari boʻlmasin)
  while (best > Math.PI / 2) best -= Math.PI; while (best <= -Math.PI / 2) best += Math.PI;
  return best;
}

/**
 * Eng katta boʻsh toʻrtburchak: uchastka (teshiklari bilan) ichida, binolardan buf m nari.
 * Uchastka yoʻnalishida burilgan katakli toʻr (≤ 120 × 120) + gistogramma usuli (maksimal toʻrtburchak).
 */
export function freeRect(rings: XY[][], obstacles: XY[][], buf = 2): FreeRect | null {
  const outer = rings[0]; if (!outer || outer.length < 3) return null;
  const ang = mainAngle(outer), cs = Math.cos(ang), sn = Math.sin(ang);
  const rot = (p: XY): XY => [p[0] * cs + p[1] * sn, -p[0] * sn + p[1] * cs];
  const unrot = (p: XY): XY => [p[0] * cs - p[1] * sn, p[0] * sn + p[1] * cs];
  const R = rings.map(r => r.map(rot));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of R[0]) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  const W = x1 - x0, H = y1 - y0; if (!(W > 0 && H > 0)) return null;
  const cell = Math.max(0.5, Math.max(W, H) / 120), nx = Math.max(1, Math.ceil(W / cell)), ny = Math.max(1, Math.ceil(H / cell));
  // faqat uchastka qamroviga tushadigan binolar
  const O = obstacles.map(o => o.map(rot)).filter(o => o.some(p => p[0] >= x0 - buf && p[0] <= x1 + buf && p[1] >= y0 - buf && p[1] <= y1 + buf));
  const ob = O.map(o => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const p of o) { a = Math.min(a, p[0]); b = Math.min(b, p[1]); c = Math.max(c, p[0]); d = Math.max(d, p[1]); } return [a - buf, b - buf, c + buf, d + buf]; });
  const free = freeMask(R, O, ob, x0, y0, cell, nx, ny, buf);
  // maksimal toʻrtburchak (gistogramma, har qator uchun)
  const hgt = new Int32Array(nx); let best = { area: 0, i0: 0, i1: 0, j0: 0, j1: 0 };
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) hgt[i] = free[j * nx + i] ? hgt[i] + 1 : 0;
    const st: number[] = [];
    for (let i = 0; i <= nx; i++) {
      const hh = i < nx ? hgt[i] : 0;
      while (st.length && hgt[st[st.length - 1]] >= hh) {
        const top = st.pop()!, h0 = hgt[top], left = st.length ? st[st.length - 1] + 1 : 0, w = i - left;
        const sc = w * h0;
        if (h0 && sc > best.area) best = { area: sc, i0: left, i1: i - 1, j0: j - h0 + 1, j1: j };
      }
      st.push(i);
    }
  }
  if (!best.area) return null;
  const w = (best.i1 - best.i0 + 1) * cell, h = (best.j1 - best.j0 + 1) * cell;
  const c = unrot([x0 + (best.i0 + best.i1 + 1) / 2 * cell, y0 + (best.j0 + best.j1 + 1) / 2 * cell]);
  // matn yoʻnalishi: gorizontalga yaqinrogʻi, agar boshqa yoʻnalishda joy 1,5 baravar uzunroq boʻlmasa
  let a2 = ang + Math.PI / 2; while (a2 > Math.PI / 2) a2 -= Math.PI;
  const A = { c, w, h, ang }, B = { c, w: h, h: w, ang: a2 };
  const [near, far] = Math.abs(ang) <= Math.abs(a2) ? [A, B] : [B, A];
  return far.w >= near.w * 1.5 ? far : near;
}

/** Yozuv qatorlari darajaga qarab */
export function labelLines(level: LabelLevel, code: string, use: string, area: string): string[] {
  return level === 3 ? [code, use, area] : level === 2 ? [code, area] : level === 1 ? [code] : [];
}
/** Matn bloki oʻlchami, birlik — shrift balandligi birligida (px yoki mm): kod — big, qolgani — small */
export function blockSize(lines: string[], big: number, small: number): [number, number] {
  if (!lines.length) return [0, 0];
  const w = Math.max(...lines.map((t, i) => 0.6 * (i ? small : big) * t.length));
  const h = lines.reduce((s, _t, i) => s + (i ? small : big), 0) + (lines.length - 1) * 0.35 * small;
  return [w, h];
}

/**
 * Daraja tanlovi: birinchi sigʻgani (3 → 2 → 1), yuqori chegara — foydalanuvchi rejimi.
 * k — 1 shrift birligi necha metr (ekranda: m/px; varaqda: masshtab/1000 m/mm).
 */
export function pickLevel(r: FreeRect | null, code: string, use: string, area: string, k: number, big: number, small: number, max: LabelLevel = 3): LabelLevel {
  if (!r) return 0;
  for (let lv = max; lv >= 1; lv--) {
    const [w, h] = blockSize(labelLines(lv as LabelLevel, code, use, area), big, small);
    if (w * k <= r.w && h * k <= r.h) return lv as LabelLevel;
  }
  return 0;
}

/** Ekran masshtabi: 1 px necha metr → ≈ 1:N (96 dpi) */
export const screenScale = (mPerPx: number) => mPerPx / (0.0254 / 96);
