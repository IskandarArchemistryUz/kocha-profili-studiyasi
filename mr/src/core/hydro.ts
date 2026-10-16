/**
 * Relyef gidrologiyasi (relyef toʻri — AWS Terrain Tiles, 10 m qadam):
 *  · chuqurliklarni toʻldirish — priority-flood (Barnes va boshq., 2014);
 *  · oqim yoʻnalishi — D8 (eng tik pasayish), oqim toʻplanishi;
 *  · HAND — eng yaqin oqim yoʻlidagi drenaj (soy, kanal) ustidan balandlik (Rennó va boshq., 2008): past qiymat — suv bosish xavfi;
 *  · TWI — topografik namlik indeksi ln(a / tan β) (Beven va Kirkby, 1979).
 * Bu skrining: relyef modelining aniqligi ~1–3 m, yomgʻir kanalizatsiyasi va binolar hisobga olinmaydi.
 */
import type { XY } from './geo';

export interface Grid { n: number; step: number; radius: number; h: Float32Array }
export interface Hydro { filled: Float32Array; acc: Float32Array; drain: Uint8Array; hand: Float32Array; twi: Float32Array; slope: Float32Array }

const D8: [number, number, number][] = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];

/** Kichik ikkilik uyum (priority queue) */
class Heap {
  private k: number[] = []; private v: number[] = [];
  get size() { return this.k.length; }
  push(key: number, val: number) { const k = this.k, v = this.v; let i = k.length; k.push(key); v.push(val); while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= k[i]) break; [k[p], k[i]] = [k[i], k[p]]; [v[p], v[i]] = [v[i], v[p]]; i = p; } }
  pop(): number {
    const k = this.k, v = this.v, top = v[0], lk = k.pop()!, lv = v.pop()!;
    if (k.length) { k[0] = lk; v[0] = lv; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < k.length && k[l] < k[m]) m = l; if (r < k.length && k[r] < k[m]) m = r; if (m === i) break; [k[m], k[i]] = [k[i], k[m]]; [v[m], v[i]] = [v[i], v[m]]; i = m; } }
    return top;
  }
}

/**
 * @param drainLines suv oqimlari (OSM waterway: ariq, kanal, soy) mahalliy metrda — drenaj kataklari sifatida
 * @param minAreaM2 oqim toʻplanishi shu maydondan oshsa — drenaj (odatiy 2 ga)
 */
export function hydrology(g: Grid, drainLines: XY[][] = [], minAreaM2 = 20000): Hydro {
  const { n, step } = g, N = n * n, h = g.h;
  const F = new Float32Array(h), done = new Uint8Array(N), q = new Heap(), eps = 1e-3;
  // 1. chuqurliklarni toʻldirish (chetdan ichkariga)
  for (let i = 0; i < n; i++) for (const c of [i, (n - 1) * n + i, i * n, i * n + n - 1]) if (!done[c]) { done[c] = 1; q.push(F[c], c); }
  while (q.size) {
    const c = q.pop(), x = c % n, y = (c / n) | 0;
    for (const [dx, dy] of D8) {
      const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= n || Y >= n) continue;
      const d = Y * n + X; if (done[d]) continue; done[d] = 1;
      if (F[d] <= F[c]) F[d] = F[c] + eps;
      q.push(F[d], d);
    }
  }
  // 2. D8 yoʻnalishi
  const down = new Int32Array(N).fill(-1);
  for (let c = 0; c < N; c++) {
    const x = c % n, y = (c / n) | 0; let best = 0, bi = -1;
    for (const [dx, dy, w] of D8) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= n || Y >= n) continue; const d = Y * n + X, s = (F[c] - F[d]) / (w * step); if (s > best) { best = s; bi = d; } }
    down[c] = bi;
  }
  // 3. oqim toʻplanishi (balanddan pastga)
  const order = Array.from({ length: N }, (_, i) => i).sort((a, b) => F[b] - F[a]);
  const acc = new Float32Array(N).fill(1);
  for (const c of order) if (down[c] >= 0) acc[down[c]] += acc[c];
  // 4. drenaj: toʻplanish chegarasi yoki suv oqimi chizigʻi
  const drain = new Uint8Array(N), thr = minAreaM2 / (step * step);
  for (let c = 0; c < N; c++) if (acc[c] >= thr) drain[c] = 1;
  const cellOf = (p: XY) => { const i = Math.round((p[0] + g.radius) / step), j = Math.round((p[1] + g.radius) / step); return i >= 0 && j >= 0 && i < n && j < n ? j * n + i : -1; };
  for (const l of drainLines) for (let k = 1; k < l.length; k++) {
    const a = l[k - 1], b = l[k], L = Math.hypot(b[0] - a[0], b[1] - a[1]), m = Math.max(1, Math.ceil(L / (step / 2)));
    for (let t = 0; t <= m; t++) { const c = cellOf([a[0] + (b[0] - a[0]) * t / m, a[1] + (b[1] - a[1]) * t / m]); if (c >= 0) drain[c] = 1; }
  }
  // 5. HAND: pastdan yuqoriga — drenaj sathini oqim yoʻli boʻylab tarqatish
  const base = new Float32Array(N), hand = new Float32Array(N);
  for (let o = N - 1; o >= 0; o--) { const c = order[o]; base[c] = drain[c] || down[c] < 0 ? h[c] : base[down[c]]; hand[c] = Math.max(0, h[c] - base[c]); }
  // 6. qiyalik va TWI
  const slope = new Float32Array(N), twi = new Float32Array(N);
  for (let c = 0; c < N; c++) {
    const x = c % n, y = (c / n) | 0, H = (X: number, Y: number) => h[Math.max(0, Math.min(n - 1, Y)) * n + Math.max(0, Math.min(n - 1, X))];
    const gx = (H(x + 1, y) - H(x - 1, y)) / (2 * step), gy = (H(x, y + 1) - H(x, y - 1)) / (2 * step), tb = Math.hypot(gx, gy);
    slope[c] = Math.atan(tb) * 180 / Math.PI;
    twi[c] = Math.log(acc[c] * step / Math.max(tb, 0.001));
  }
  return { filled: F, acc, drain, hand, twi, slope };
}

/** HAND sinflari: suv bosish xavfi */
export const HAND_BINS: { max: number; color: number; label: string }[] = [
  { max: 1, color: 0x1f5fa8, label: '< 1 m — yuqori' },
  { max: 2, color: 0x4f8fd0, label: '1–2 m — oʻrta' },
  { max: 5, color: 0xa9cbea, label: '2–5 m — past' },
];
export const TWI_BINS: { min: number; color: number; label: string }[] = [
  { min: 12, color: 0x1d6f8f, label: '≥ 12 — juda nam' },
  { min: 10, color: 0x49a3b8, label: '10–12 — nam' },
  { min: 8, color: 0xa6d6de, label: '8–10 — oʻrtacha' },
];
