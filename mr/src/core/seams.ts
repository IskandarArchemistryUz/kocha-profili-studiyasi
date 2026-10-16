/**
 * Qoʻshni seksiyalar choklari: umumiy devor va bir xil balandlikdagi tom chegarasi chizilmasin.
 * Har seksiya uchun: har qirraga tegib turgan qoʻshnining eng baland tepasi va har uchiga tegib turganlarniki.
 */
import type { XY } from './geo';

export interface Prism3 { ring: XY[]; base: number; top: number }
export interface SeamInfo { edgeTop: number[]; vertTop: number[] }

const segDist = (p: XY, a: XY, b: XY) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0; return Math.hypot(a[0] + dx * t - p[0], a[1] + dy * t - p[1]); };

export function seams(list: Prism3[], tol = 0.3): SeamInfo[] {
  const bb = list.map(p => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const q of p.ring) { a = Math.min(a, q[0]); b = Math.min(b, q[1]); c = Math.max(c, q[0]); d = Math.max(d, q[1]); } return [a - tol, b - tol, c + tol, d + tol]; });
  return list.map((A, i) => {
    const n = A.ring.length, edgeTop = new Array(n).fill(-Infinity), vertTop = new Array(n).fill(-Infinity);
    list.forEach((B, j) => {
      if (j === i || bb[i][2] < bb[j][0] || bb[j][2] < bb[i][0] || bb[i][3] < bb[j][1] || bb[j][3] < bb[i][1]) return;
      if (B.base > A.base + 0.1 || B.top <= A.base + 0.1) return;   // B yuqorida turadi yoki A dan past
      const m = B.ring.length, onB = (p: XY) => { for (let k = 0; k < m; k++) if (segDist(p, B.ring[k], B.ring[(k + 1) % m]) < tol) return true; return false; };
      for (let k = 0; k < n; k++) {
        const a = A.ring[k], b = A.ring[(k + 1) % n], mid: XY = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        if (onB(mid)) edgeTop[k] = Math.max(edgeTop[k], B.top);
        if (onB(a)) vertTop[k] = Math.max(vertTop[k], B.top);
      }
    });
    return { edgeTop, vertTop };
  });
}

/** Seksiya qirralari (chiziq kesmalari, [x, y, z] juftliklar): faqat koʻrinadigan qismlar */
export function seamEdges(A: Prism3, s: SeamInfo, bands: number[] = []): [number, number, number][] {
  const out: [number, number, number][] = [], n = A.ring.length, eps = 0.6;   // relyef farqi (poydevor sathi) chok hisoblanmasin
  const hz = (z: number, filter: (k: number) => boolean) => { for (let k = 0; k < n; k++) if (filter(k)) { const a = A.ring[k], b = A.ring[(k + 1) % n]; out.push([a[0], a[1], z], [b[0], b[1], z]); } };
  hz(A.top, k => s.edgeTop[k] < A.top - eps);
  hz(A.base, k => s.edgeTop[k] === -Infinity);
  for (const z of bands) hz(z, k => s.edgeTop[k] < z - eps);
  for (let k = 0; k < n; k++) {
    const z0 = Math.max(A.base, s.vertTop[k]); if (z0 >= A.top - eps) continue;
    const p = A.ring[k]; out.push([p[0], p[1], z0], [p[0], p[1], A.top]);
  }
  return out;
}

/**
 * Qirraning qoʻshni seksiya bilan yopilgan qismlari (qismiy chok): har interval — qirra boʻylab [s0, s1] (m) va
 * qoʻshnining tepasi. Qoʻshnining shu qirra bilan bir chiziqda yotgan qirralari (torets devor uzun devorga oʻrtasidan tegsa ham).
 */
export function edgeCover(A: Prism3, list: Prism3[], tol = 0.3): { s0: number; s1: number; top: number }[][] {
  const n = A.ring.length, out: { s0: number; s1: number; top: number }[][] = [];
  for (let k = 0; k < n; k++) {
    const a = A.ring[k], b = A.ring[(k + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    const iv: { s0: number; s1: number; top: number }[] = [];
    for (const B of list) {
      if (B === A || B.base > A.base + 0.1 || B.top <= A.base + 0.1) continue;
      const m = B.ring.length;
      for (let j = 0; j < m; j++) {
        const p = B.ring[j], q = B.ring[(j + 1) % m];
        // bir chiziqda: ikkala uch ham A qirrasining toʻgʻri chizigʻiga yaqin
        const d = (r: XY) => Math.abs((r[0] - a[0]) * uy - (r[1] - a[1]) * ux);
        if (d(p) > tol || d(q) > tol) continue;
        const sp = (p[0] - a[0]) * ux + (p[1] - a[1]) * uy, sq = (q[0] - a[0]) * ux + (q[1] - a[1]) * uy;
        const s0 = Math.max(0, Math.min(sp, sq)), s1 = Math.min(L, Math.max(sp, sq));
        if (s1 - s0 > 0.2) iv.push({ s0, s1, top: B.top });
      }
    }
    out.push(iv);
  }
  return out;
}
