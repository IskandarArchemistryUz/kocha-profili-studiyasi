/**
 * Kvartalni avtomatik aniqlash: foydalanuvchi yoʻllar orasidagi joyni bosadi →
 * yoʻllar (kengligi bilan), temir yoʻl va suv rastrga «toʻsiq» qilib chiziladi, bosilgan nuqtadan
 * toʻldiriladi va toʻldirilgan sohaning chegarasi koʻpburchakka aylantiriladi.
 * Graf-topologiya (yuzalar)ga nisbatan sekinroq, lekin OSM dagi uzilgan, ustma-ust tushgan
 * yoki tugunsiz kesishgan yoʻllarga chidamli.
 */
import type { XY } from '../core/geo';
import { signedArea } from '../core/geo';

export interface Barrier { pts: XY[]; w: number }

export type BlockResult = { ok: true; ring: XY[]; area: number } | { ok: false; reason: string };

export function detectBlock(barriers: Barrier[], areas: XY[][], click: XY, opts: { window?: number; res?: number; simplify?: number } = {}): BlockResult {
  const win = opts.window ?? 900, res = opts.res ?? 1, tol = opts.simplify ?? 1.2;
  const N = Math.ceil(win / res), x0 = click[0] - win / 2, y0 = click[1] - win / 2;
  const g = new Uint8Array(N * N); // 1 — toʻsiq, 2 — toʻldirilgan
  const ci = (x: number) => Math.floor((x - x0) / res), cj = (y: number) => Math.floor((y - y0) / res);

  // yoʻllar: segmentgacha masofa ≤ w/2 boʻlgan kataklar
  for (const b of barriers) {
    const r = Math.max(b.w / 2, res * 0.75);
    for (let k = 1; k < b.pts.length; k++) {
      const a = b.pts[k - 1], c = b.pts[k];
      const i0 = Math.max(0, ci(Math.min(a[0], c[0]) - r)), i1 = Math.min(N - 1, ci(Math.max(a[0], c[0]) + r));
      const j0 = Math.max(0, cj(Math.min(a[1], c[1]) - r)), j1 = Math.min(N - 1, cj(Math.max(a[1], c[1]) + r));
      if (i0 > i1 || j0 > j1) continue;
      const dx = c[0] - a[0], dy = c[1] - a[1], L2 = dx * dx + dy * dy || 1e-9;
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const px = x0 + (i + 0.5) * res, py = y0 + (j + 0.5) * res;
        const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / L2));
        const ex = a[0] + t * dx - px, ey = a[1] + t * dy - py;
        if (ex * ex + ey * ey <= r * r) g[j * N + i] = 1;
      }
    }
  }
  // suv yuzalari: koʻpburchak ichidagi kataklar (qator boʻyicha skanerlash)
  for (const poly of areas) {
    let ymin = Infinity, ymax = -Infinity; for (const p of poly) { ymin = Math.min(ymin, p[1]); ymax = Math.max(ymax, p[1]); }
    for (let j = Math.max(0, cj(ymin)); j <= Math.min(N - 1, cj(ymax)); j++) {
      const py = y0 + (j + 0.5) * res, xs: number[] = [];
      for (let k = 0, m = poly.length - 1; k < poly.length; m = k++) {
        const a = poly[m], c = poly[k];
        if ((a[1] > py) !== (c[1] > py)) xs.push(a[0] + (py - a[1]) / (c[1] - a[1]) * (c[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let i = Math.max(0, ci(xs[k])); i <= Math.min(N - 1, ci(xs[k + 1])); i++) g[j * N + i] = 1;
    }
  }

  const si = ci(click[0]), sj = cj(click[1]);
  if (g[sj * N + si] === 1) return { ok: false, reason: 'Yoʻl yoki suv ustini bosdingiz — kvartal ichini bosing' };

  // toʻldirish (4-qoʻshni); chegaraga yetsa — kvartal yopiq emas
  const st = new Int32Array(N * N); let sp = 0, cnt = 0, open = false;
  st[sp++] = sj * N + si; g[sj * N + si] = 2;
  while (sp) {
    const q = st[--sp], i = q % N, j = (q - i) / N; cnt++;
    if (i === 0 || j === 0 || i === N - 1 || j === N - 1) { open = true; break; }
    const nb = [q - 1, q + 1, q - N, q + N];
    for (const k of nb) if (g[k] === 0) { g[k] = 2; st[sp++] = k; }
  }
  if (open) return { ok: false, reason: `Kvartal yopiq emas yoki ${Math.round(win / 2)} m dan katta — yoʻllar ulanmagan boʻlishi mumkin. Uchastkani qoʻlda chizing` };
  if (cnt * res * res < 100) return { ok: false, reason: 'Juda kichik joy (< 100 m²) — kvartal ichini bosing' };

  const loop = outline(g, N);
  if (!loop) return { ok: false, reason: 'Chegara topilmadi' };
  const ring = dropCollinear(simplifyClosed(loop.map(([i, j]) => [x0 + i * res, y0 + j * res] as XY), tol));
  if (ring.length < 3) return { ok: false, reason: 'Chegara topilmadi' };
  return { ok: true, ring, area: signedArea(ring) };
}

/** Toʻldirilgan (2) sohaning tashqi chegarasi — katak qirralari boʻylab, soat millariga teskari */
function outline(g: Uint8Array, N: number): [number, number][] | null {
  const F = (i: number, j: number) => i >= 0 && j >= 0 && i < N && j < N && g[j * N + i] === 2;
  const next = new Map<number, number[]>(), K = (i: number, j: number) => j * (N + 1) + i;
  const add = (a: number, b: number) => { const l = next.get(a); if (l) l.push(b); else next.set(a, [b]); };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    if (!F(i, j)) continue;
    if (!F(i, j - 1)) add(K(i, j), K(i + 1, j));
    if (!F(i + 1, j)) add(K(i + 1, j), K(i + 1, j + 1));
    if (!F(i, j + 1)) add(K(i + 1, j + 1), K(i, j + 1));
    if (!F(i - 1, j)) add(K(i, j + 1), K(i, j));
  }
  const xy = (k: number): [number, number] => [k % (N + 1), Math.floor(k / (N + 1))];
  let best: [number, number][] | null = null, bestA = 0;
  const seen = new Set<string>();
  for (const [s, outs] of next) for (const first of outs) {
    if (seen.has(s + '>' + first)) continue;
    const pts: [number, number][] = [xy(s)];
    let prev = s, cur = first; seen.add(s + '>' + first);
    let guard = 0;
    while (cur !== s && guard++ < 4 * N * N) {
      pts.push(xy(cur));
      const cand = next.get(cur)!;
      let nx = cand[0];
      if (cand.length > 1) { // egar nuqta: chapga eng keskin burilish
        const [px, py] = xy(prev), [cx, cy] = xy(cur), dIn = [cx - px, cy - py];
        nx = cand.reduce((b, k) => { const [kx, ky] = xy(k); const cr = dIn[0] * (ky - cy) - dIn[1] * (kx - cx); const [bx, by] = xy(b); const cb = dIn[0] * (by - cy) - dIn[1] * (bx - cx); return cr > cb ? k : b; }, cand[0]);
      }
      seen.add(cur + '>' + nx); prev = cur; cur = nx;
    }
    let a = 0; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
    if (a > bestA) { bestA = a; best = pts; }
  }
  return best;
}

/** Douglas–Peucker, yopiq halqa uchun */
export function simplifyClosed(r: XY[], tol: number): XY[] {
  if (r.length < 4) return r;
  // eng uzoq ikki nuqtadan ikkiga boʻlib, har yarmini soddalashtirish
  let a = 0, b = 0, best = -1;
  for (let i = 0; i < r.length; i++) { const d = (r[i][0] - r[0][0]) ** 2 + (r[i][1] - r[0][1]) ** 2; if (d > best) { best = d; b = i; } }
  const half1 = dp(r.slice(a, b + 1), tol), half2 = dp([...r.slice(b), r[0]], tol);
  return [...half1.slice(0, -1), ...half2.slice(0, -1)];
}

function dp(p: XY[], tol: number): XY[] {
  if (p.length < 3) return p;
  const a = p[0], b = p[p.length - 1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1e-9;
  let k = -1, md = 0;
  for (let i = 1; i < p.length - 1; i++) { const d = Math.abs(dy * p[i][0] - dx * p[i][1] + b[0] * a[1] - b[1] * a[0]) / L; if (d > md) { md = d; k = i; } }
  if (md <= tol) return [a, b];
  return [...dp(p.slice(0, k + 1), tol).slice(0, -1), ...dp(p.slice(k), tol)];
}

function dropCollinear(r: XY[]): XY[] {
  const out: XY[] = [];
  for (let i = 0; i < r.length; i++) {
    const p = r[(i - 1 + r.length) % r.length], c = r[i], n = r[(i + 1) % r.length];
    const cr = (c[0] - p[0]) * (n[1] - c[1]) - (c[1] - p[1]) * (n[0] - c[0]);
    if (Math.abs(cr) > 1e-6) out.push(c);
  }
  return out;
}
