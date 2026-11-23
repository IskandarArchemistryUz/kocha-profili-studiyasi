/**
 * Bogʻshunos — vertikal rejalash (15.11.2026): manzara tepaligi, suvga tushuvchi pogʻonalar va yer balansi.
 *
 * Usul (T): relyef toʻri (Ctx.E, qadam 3 m) ustiga loyiha farqi dE qoʻyiladi; hajm = Σ dE × katak maydoni.
 *  • Tepalik — chizilgan konturda gumbaz: dE = H · s(t), t = chetdan masofa / eng katta masofa, s — silliq qadam (3t² − 2t³).
 *    Eng katta qiyalik = 1,5 · H / dmax; maysa qiyaligi ≤ 1:3 (oʻrish uchun amaliy chegara, T) — H shunga qarab cheklanadi.
 *  • Pogʻonalar — suv chetidan uzoqlashgan sari har katak qatori 0,45 m koʻtariladi (oʻtirish balandligi, T), birinchi pogʻona suv sathidan +0,3 m (P).
 *    Faqat qaziladi: pogʻona yerdan baland chiqsa, yer oʻz holicha qoladi.
 *  • Suv sathi — kontur atrofidagi 30 m ichidagi suv kataklari balandligining 20-persentili (P); suv yoʻq boʻlsa — konturdagi eng past nuqta.
 * Natija: yangi relyef (E2), qazish / toʻkish / balans (m³). Raqamlar loyiha bosqichi uchun taxminiy (P) — ishchi loyihada geodezik syomka bilan aniqlanadi.
 */
import type { XY } from './types';
import type { Ctx } from './analyze';
import { fillPoly } from './grid';

export type VKind = 'tepalik' | 'sohil_pogona';
export interface VIn { kind: VKind; ring: XY[]; h?: number; i?: number }
export interface VPart { i?: number; kind: VKind; n: number; area: number; h: number; hMax: number; cut: number; fill: number; wl?: number }
export interface VOut { E2: Float32Array; dE: Float32Array; cut: number; fill: number; parts: VPart[] }

export const HILL_H = 3;          // sukut balandligi, m (P)
export const HILL_SLOPE = 1 / 3;  // maysa qiyaligi chegarasi (T)
export const STEP_RISE = 0.45;    // pogʻona balandligi, m (T)
export const STEP_W0 = 0.3;       // birinchi pogʻona suv sathidan, m (P)

const segDist = (p: XY, r: XY[]): number => { let m = Infinity; for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length], dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)); m = Math.min(m, Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)); } return m; };

export function grade(C: Ctx, ins: VIn[]): VOut {
  const G = C.G, cA = G.cellA, dE = new Float32Array(G.n), parts: VPart[] = [];
  let no = { tepalik: 0, sohil_pogona: 0 };
  for (const v of ins) {
    if (v.ring.length < 3) continue;
    const m = G.u8(); fillPoly(G, m, [v.ring]);
    const ks: number[] = []; for (let k = 0; k < G.n; k++) if (m[k] && C.site[k] && !C.water[k] && !C.bld[k] && Number.isFinite(C.E[k])) ks.push(k);
    if (!ks.length) continue;
    const at = (k: number): XY => [G.cx(k % G.nx), G.cy((k / G.nx) | 0)];
    let cut = 0, fill = 0, H = 0, hMax = 0, wl: number | undefined;
    if (v.kind === 'tepalik') {
      const d = ks.map(k => segDist(at(k), v.ring)), dmax = Math.max(...d, G.step);
      hMax = Math.round(dmax * HILL_SLOPE / 1.5 * 10) / 10; H = Math.min(v.h ?? HILL_H, hMax);
      ks.forEach((k, i) => { const t = d[i] / dmax, z = H * t * t * (3 - 2 * t); dE[k] += z; fill += z * cA; });
    } else {
      // suv sathi
      const xs = v.ring.map(p => p[0]), ys = v.ring.map(p => p[1]), R = 30, wz: number[] = [];
      for (let k = 0; k < G.n; k++) if (C.water[k] && Number.isFinite(C.E[k])) { const [x, y] = at(k); if (x > Math.min(...xs) - R && x < Math.max(...xs) + R && y > Math.min(...ys) - R && y < Math.max(...ys) + R) wz.push(C.E[k]); }
      wz.sort((a, b) => a - b); wl = wz.length ? wz[Math.floor(wz.length * 0.2)] : Math.min(...ks.map(k => C.E[k]));
      // suvgacha masofa (kataklarda, 8 qoʻshni BFS; suv yoʻq boʻlsa — konturdagi eng past katakdan)
      const dist = new Int32Array(G.n).fill(-1), q: number[] = [];
      if (wz.length) { for (let k = 0; k < G.n; k++) if (C.water[k]) { dist[k] = 0; q.push(k); } }
      else { const k0 = ks.reduce((a, b) => (C.E[b] < C.E[a] ? b : a)); dist[k0] = 0; q.push(k0); }
      for (let h = 0; h < q.length; h++) { const k = q[h], i = k % G.nx, j = (k / G.nx) | 0; if (dist[k] > 80) continue; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= G.nx || jj >= G.ny) continue; const kk = jj * G.nx + ii; if (dist[kk] >= 0) continue; dist[kk] = dist[k] + 1; q.push(kk); } }
      const d0 = Math.min(...ks.map(k => (dist[k] < 0 ? 1e9 : dist[k])));
      for (const k of ks) { if (dist[k] < 0) continue; const z = wl + STEP_W0 + (dist[k] - d0) * STEP_RISE, dz = Math.min(0, z - C.E[k]); dE[k] += dz; cut -= dz * cA; H = Math.max(H, (dist[k] - d0 + 1)); }
      H = Math.round((H * STEP_RISE + STEP_W0) * 100) / 100;
    }
    no = { ...no, [v.kind]: no[v.kind] + 1 };
    parts.push({ i: v.i, kind: v.kind, n: no[v.kind], area: Math.round(ks.length * cA), h: Math.round(H * 100) / 100, hMax, cut: Math.round(cut), fill: Math.round(fill), ...(wl != null ? { wl: Math.round(wl * 100) / 100 } : {}) });
  }
  const E2 = new Float32Array(G.n); for (let k = 0; k < G.n; k++) E2[k] = C.E[k] + dE[k];
  return { E2, dE, cut: parts.reduce((s, p) => s + p.cut, 0), fill: parts.reduce((s, p) => s + p.fill, 0), parts };
}
