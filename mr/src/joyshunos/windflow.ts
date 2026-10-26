/**
 * Planda shamol oqimi (27.10): ustun yoʻnalish boʻyicha oqim chiziqlari, binolar atrofida aylanib oʻtadi.
 * Sxematik model (CFD emas): bino masofa maydoni gradiyenti boʻyicha ogʻish, bino orqasida «shamol soyasi» — sekinlashish,
 * ochiq joyda tezlashish. Chiqish — mahalliy metrdagi chiziqlar va nisbiy tezlik (0–1).
 */
export type XY = [number, number];
export interface FlowLine { pts: XY[]; v: number[] }

/** blds — mahalliy metrdagi bino konturlari; fromDeg — shamol qayerdan esadi (0 — shimol, soat yoʻnalishida); R — yarim kenglik */
export function windFlow(blds: XY[][], fromDeg: number, R: number, density = 0.5): FlowLine[] {
  const G = Math.max(6, R / 160), N = Math.ceil(2 * R / G) + 1, idx = (i: number, j: number) => j * N + i;
  const mask = new Uint8Array(N * N);
  for (const P of blds) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const [x, y] of P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const i0 = Math.max(0, Math.floor((x0 + R) / G)), i1 = Math.min(N - 1, Math.ceil((x1 + R) / G)), j0 = Math.max(0, Math.floor((y0 + R) / G)), j1 = Math.min(N - 1, Math.ceil((y1 + R) / G));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (inPoly(-R + i * G, -R + j * G, P)) mask[idx(i, j)] = 1;
  }
  // masofa maydoni (2 oʻtishli chamfer)
  const D = new Float32Array(N * N).fill(1e6); for (let q = 0; q < N * N; q++) if (mask[q]) D[q] = 0;
  const d2 = G * Math.SQRT2;
  for (let j = 1; j < N; j++) for (let i = 1; i < N - 1; i++) { const q = idx(i, j); D[q] = Math.min(D[q], D[q - 1] + G, D[q - N] + G, D[q - N - 1] + d2, D[q - N + 1] + d2); }
  for (let j = N - 2; j >= 0; j--) for (let i = N - 2; i >= 1; i--) { const q = idx(i, j); D[q] = Math.min(D[q], D[q + 1] + G, D[q + N] + G, D[q + N + 1] + d2, D[q + N - 1] + d2); }
  for (let k = 0; k < N; k++) { D[idx(0, k)] = D[idx(1, k)]; D[idx(N - 1, k)] = D[idx(N - 2, k)]; D[idx(k, 0)] = D[idx(k, 1)]; D[idx(k, N - 1)] = D[idx(k, N - 2)]; }
  const S = (x: number, y: number) => { const fi = Math.min(N - 1.001, Math.max(0, (x + R) / G)), fj = Math.min(N - 1.001, Math.max(0, (y + R) / G)); const i = Math.floor(fi), j = Math.floor(fj), a = fi - i, b = fj - j; return (D[idx(i, j)] * (1 - a) + D[idx(i + 1, j)] * a) * (1 - b) + (D[idx(i, j + 1)] * (1 - a) + D[idx(i + 1, j + 1)] * a) * b; };
  const th = (fromDeg + 180) * Math.PI / 180, wx = Math.sin(th), wy = Math.cos(th);   // qayerga esadi
  /** devorga urinma: shamol tomonga qaragan yoʻnalish */
  const tang = (gx: number, gy: number): XY => { const a: XY = [-gy, gx]; return a[0] * wx + a[1] * wy >= 0 ? a : [gy, -gx]; };
  const vel = (x: number, y: number): XY | null => {
    const d = S(x, y); if (!(d > 0)) return null;
    const e = G, gx = (S(x + e, y) - S(x - e, y)) / (2 * e), gy = (S(x, y + e) - S(x, y - e)) / (2 * e);
    if (Number.isNaN(gx) || Number.isNaN(gy)) return [wx * 0.6, wy * 0.6];
    const near = Math.exp(-d / 16); let vx = wx, vy = wy; const dot = vx * gx + vy * gy;
    if (dot < 0) { const tg = tang(gx, gy); vx -= dot * gx * near * 1.8; vy -= dot * gy * near * 1.8; vx += tg[0] * near * 0.7 * -dot; vy += tg[1] * near * 0.7 * -dot; }
    const back = S(x - wx * 30, y - wy * 30), shade = back < 4 ? 0.45 : 1, open = Math.max(0.35, Math.min(1.25, d / 40));
    const m = Math.hypot(vx, vy) || 1, v = 0.55 * open * shade; return [vx / m * v, vy / m * v];
  };
  const out: FlowLine[] = [], nx = -wy, ny = wx, sp = R / (8 + 22 * density), step = G;
  for (let s = -R * 1.45; s < R * 1.45; s += sp) {
    let x = -wx * R * 1.45 + nx * s, y = -wy * R * 1.45 + ny * s, L: XY[] = [], V: number[] = [];
    for (let t = 0; t < 1200; t++) {
      if (Math.abs(x) > R || Math.abs(y) > R) { if (L.length > 6) out.push({ pts: L, v: V }); L = []; V = []; x += wx * step; y += wy * step; if (t > 50 && Math.abs(x) > R * 1.5) break; continue; }
      const v = vel(x, y);
      if (!v) { const gx = S(x + step, y) - S(x - step, y), gy = S(x, y + step) - S(x, y - step), m0 = Math.hypot(gx, gy) || 1, tg = tang(gx / m0, gy / m0); x += (gx / m0 * 0.8 + tg[0] * 0.8) * step; y += (gy / m0 * 0.8 + tg[1] * 0.8) * step; if (L.length > 6) { out.push({ pts: L, v: V }); } L = []; V = []; continue; }
      L.push([x, y]); V.push(Math.min(1, Math.hypot(v[0], v[1]) / 0.69));
      const m = Math.hypot(v[0], v[1]) || 1; x += v[0] / m * step; y += v[1] / m * step;
      if (L.length > 140) { out.push({ pts: L, v: V }); L = [L[L.length - 1]]; V = [V[V.length - 1]]; }
    }
    if (L.length > 6) out.push({ pts: L, v: V });
  }
  return out;
}
function inPoly(x: number, y: number, P: XY[]): boolean { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [a, b] = P[i], [e, f] = P[j]; if ((b > y) !== (f > y) && x < (e - a) * (y - b) / (f - b) + a) c = !c; } return c; }
