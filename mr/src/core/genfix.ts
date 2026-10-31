/**
 * Generatsiyadan keyingi ishlov (27.10, tester izohi: «bino shakli tor va gʻalati», «saqlangan bino ustiga qurildi»).
 * 1) squareSections: notekis parselda seksiya qirralari parsel chegarasini takrorlab oʻtkir uchli boʻlib qolardi.
 *    Tasma seksiyalarning uchlari oʻq boʻylab ENI ≥ 0,75·D boʻlgan joydan tik qirqiladi; boshqa shakllarda < 60° burchak
 *    uchi qirqiladi. Qalinligi < 0,6·D yoki juda kichik qolgan boʻlak olib tashlanadi (qolgan joy — hovli).
 * 2) avoidObstacles: saqlanadigan mavjud binolar, qoʻlda chizilgan va boshqa guruhlarning binolari — toʻsiq.
 *    Toʻsiqdan ≥ 6 m (ShNQ 2.07.01-23, 79-band 2-jadval: hisoblangan masofa 6 m dan kam boʻlmasin) ichidagi qism kesiladi;
 *    qarshidagi toʻsiqqacha masofa boʻyicha qavat cheklanadi: parallel uzun tomonlar orasi ≥ 2·Hmax (8-izoh).
 */
import polygonClipping, { type Polygon, type MultiPolygon } from 'polygon-clipping';
import type { XY } from './geo';
import { signedArea, obb2 } from './geo';
import { openRing } from './offset';
import type { GenSection } from './generator';

export interface Obstacle3 { ring: XY[]; h: number }

const P = (r: XY[]): Polygon => [[...r, r[0]].map(p => [p[0], p[1]] as [number, number])];
const ringsOf = (mp: MultiPolygon): XY[][] => mp.map(pp => { const r = pp[0].slice(0, -1).map(q => [q[0], q[1]] as XY); return signedArea(r) < 0 ? r.reverse() : r; });
const aOf = (r: XY[]) => Math.abs(signedArea(r));
const STRIP_KINDS = new Set(['oddiy', 'burchak', 'qator', 'minora']);

function pin(p: XY, r: XY[]): boolean { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; }
function pd(p: XY, a: XY, b: XY): number { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy, k = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0; return Math.hypot(p[0] - a[0] - dx * k, p[1] - a[1] - dy * k); }
/** Yozilgan eng katta aylana diametri (taxminan, 1 m toʻr) — seksiya «qalinligi» */
export function thickness(r: XY[]): number {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of r) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const st = Math.max(0.5, Math.min(x1 - x0, y1 - y0) / 30); let best = 0;
  for (let x = x0 + st / 2; x < x1; x += st) for (let y = y0 + st / 2; y < y1; y += st) {
    const p: XY = [x, y]; if (!pin(p, r)) continue;
    let d = Infinity; for (let i = 0; i < r.length; i++) d = Math.min(d, pd(p, r[i], r[(i + 1) % r.length]));
    if (d > best) best = d;
  }
  return 2 * best;
}
function angleAt(r: XY[], i: number): number {
  const p = r[(i - 1 + r.length) % r.length], c = r[i], q = r[(i + 1) % r.length];
  const a = Math.atan2(p[1] - c[1], p[0] - c[0]), b = Math.atan2(q[1] - c[1], q[0] - c[0]);
  let d = Math.abs(a - b) * 180 / Math.PI; if (d > 180) d = 360 - d; return d;
}
function convexAt(r: XY[], i: number): boolean { const p = r[(i - 1 + r.length) % r.length], c = r[i], q = r[(i + 1) % r.length]; return (c[0] - p[0]) * (q[1] - c[1]) - (c[1] - p[1]) * (q[0] - c[0]) > 0; }
function largest(mp: MultiPolygon): XY[] | null { let best: XY[] | null = null, ba = 0; for (const r of ringsOf(mp)) { const a = aOf(r); if (a > ba) { ba = a; best = r; } } return best; }
const clip = (r: XY[], by: XY[]): XY[] | null => { try { return largest(polygonClipping.intersection(P(r), P(by))); } catch { return r; } };
const cut = (r: XY[], by: Polygon[]): XY[] | null => { if (!by.length) return r; try { return largest(polygonClipping.difference(P(r), ...by)); } catch { return r; } };

/** Perpendikulyar chiziq boʻylab koʻpburchak ichidagi kesma uzunligi (t — U oʻqi boʻylab, U birlik vektor) */
function widthAt(r: XY[], U: XY, t: number): number {
  const V: XY = [-U[1], U[0]], xs: number[] = [];
  for (let i = 0; i < r.length; i++) {
    const a = r[i], b = r[(i + 1) % r.length], ta = a[0] * U[0] + a[1] * U[1], tb = b[0] * U[0] + b[1] * U[1];
    if ((ta > t) === (tb > t) || ta === tb) continue;
    const k = (t - ta) / (tb - ta), pa = a[0] * V[0] + a[1] * V[1], pb = b[0] * V[0] + b[1] * V[1]; xs.push(pa + (pb - pa) * k);
  }
  xs.sort((x, y) => x - y); let w = 0; for (let i = 0; i + 1 < xs.length; i += 2) w += xs[i + 1] - xs[i]; return w;
}

export function squareSections(S: GenSection[], D: number, notes: string[]): GenSection[] {
  let trimmed = 0, dropped = 0; const out: GenSection[] = [];
  for (const s0 of S) {
    if (!STRIP_KINDS.has(s0.kind)) { out.push(s0); continue; }
    // takror nuqtalar va nol eni «tikan»lar (birlashtirishdan qolgan) — polygon-clipping bilan tozalanadi
    let r: XY[] | null = s0.ring;
    try { r = largest(polygonClipping.union(P(r))) ?? r; } catch { /* asl halqa */ }
    r = r.filter((p, i, a) => Math.hypot(p[0] - a[(i + 1) % a.length][0], p[1] - a[(i + 1) % a.length][1]) > 0.05);
    const o = obb2(r), strip = o.L >= 1.3 * o.S && aOf(r) >= 0.7 * o.L * o.S;
    if (strip) {
      // oʻq boʻylab eni ≥ 0,75·D boʻlgan oraliq — uchlari tik qirqiladi
      const U = o.U, ts = r.map(p => p[0] * U[0] + p[1] * U[1]), t0 = Math.min(...ts), t1 = Math.max(...ts), need = Math.min(0.75 * D, 0.75 * o.S);
      let a = t0, b = t1; for (let t = t0 + 0.25; t < t1; t += 0.5) if (widthAt(r, U, t) >= need) { a = t - 0.25; break; }
      for (let t = t1 - 0.25; t > t0; t -= 0.5) if (widthAt(r, U, t) >= need) { b = t + 0.25; break; }
      if (a > t0 + 0.6 || b < t1 - 0.6) {
        const V: XY = [-U[1], U[0]], vs = r.map(p => p[0] * V[0] + p[1] * V[1]), v0 = Math.min(...vs) - 1, v1 = Math.max(...vs) + 1;
        const at = (t: number, v: number): XY => [U[0] * t + V[0] * v, U[1] * t + V[1] * v];
        const nr = clip(r, [at(a, v0), at(b, v0), at(b, v1), at(a, v1)]); if (nr && nr !== r) { r = nr; trimmed++; }
      }
    }
    // qolgan oʻtkir (< 60°) qavariq uchlar: bissektrisaga tik, kesma eni 0,8·D boʻladigan joydan
    for (let guard = 0; r && guard < 6; guard++) {
      const i = r.findIndex((_, k) => convexAt(r!, k) && angleAt(r!, k) < 60); if (i < 0) break;
      const c = r[i], p = r[(i - 1 + r.length) % r.length], q = r[(i + 1) % r.length];
      const u1 = [p[0] - c[0], p[1] - c[1]], u2 = [q[0] - c[0], q[1] - c[1]], l1 = Math.hypot(u1[0], u1[1]), l2 = Math.hypot(u2[0], u2[1]);
      const bis: XY = [u1[0] / l1 + u2[0] / l2, u1[1] / l1 + u2[1] / l2], bl = Math.hypot(bis[0], bis[1]) || 1, B: XY = [bis[0] / bl, bis[1] / bl], N: XY = [-B[1], B[0]];
      const th = angleAt(r, i) * Math.PI / 360, dcut = Math.min(0.4 * D / Math.tan(th), 0.45 * Math.min(l1, l2) / Math.cos(th)), F = 200;
      const m: XY = [c[0] + B[0] * dcut, c[1] + B[1] * dcut];
      const tri: XY[] = [[m[0] + N[0] * F, m[1] + N[1] * F], [m[0] - N[0] * F, m[1] - N[1] * F], [c[0] - B[0] * F - N[0] * F, c[1] - B[1] * F - N[1] * F], [c[0] - B[0] * F + N[0] * F, c[1] - B[1] * F + N[1] * F]];
      const nr = cut(r, [P(tri)]); if (!nr || aOf(nr) >= aOf(r) - 0.5) break; r = nr; trimmed++;
    }
    if (!r || aOf(r) < 0.35 * D * D || thickness(r) < 0.6 * D) { dropped++; continue; }
    out.push({ ...s0, ring: r });
  }
  if (trimmed) notes.push(`${trimmed} ta seksiyaning oʻtkir uchi tik qirqildi (notekis parsel; uch — hovliga)`);
  if (dropped) notes.push(`${dropped} ta juda tor boʻlak olib tashlandi (qalinligi < 0,6·chuqurlik)`);
  return out;
}

/**
 * Toʻsiqlar: ulardan 6 m ichidagi qism kesiladi; seksiya fasadidan qarshidagi toʻsiqqacha masofa d boʻyicha:
 * 2·Hmax ≤ d boʻlishi uchun qavat kamaytiriladi; toʻsiqning oʻzi d/2 dan baland boʻlsa yoki minF sigʻmasa — seksiya olinadi.
 */
export function avoidObstacles(S: GenSection[], obs: Obstacle3[], minF: number, floorH: number, notes: string[], gap = 6): GenSection[] {
  if (!obs.length) return S;
  const bufs: Polygon[] = obs.map(o => P(buffer(o.ring, gap)));
  let clipped = 0, removed = 0, capped = 0; const out: GenSection[] = [];
  for (const s0 of S) {
    let r: XY[] | null = s0.ring;
    const hit = bufs.some(b => { try { return polygonClipping.intersection(P(r!), b).length > 0; } catch { return false; } });
    if (hit) { const a0 = aOf(r); r = cut(r, bufs); if (r) r = openRing(r, 6) ?? null; if (!r || aOf(r) < 0.5 * a0 || aOf(r) < 120) { removed++; continue; } clipped++; }
    const s: GenSection = { ...s0, ring: r };
    if (s.face) {
      let d = Infinity, ho = 0;
      for (const o of obs) { const t = rayHitPar(s.face.p, s.face.n, o.ring); if (t < d) { d = t; ho = o.h; } }
      if (Number.isFinite(d) && d < 200) {
        if (2 * ho > d + 0.5) { removed++; continue; }
        const cap = Math.floor(d / 2 / floorH);
        if (cap < minF) { removed++; continue; }
        if (s.floors > cap) { s.floors = cap; capped++; }
      }
    }
    out.push(s);
  }
  if (clipped) notes.push(`${clipped} ta seksiya mavjud/saqlanadigan binolardan ≥ ${gap} m qilib qirqildi (79-band 2-jadval: ≥ 6 m)`);
  if (removed) notes.push(`${removed} ta seksiya olib tashlandi: mavjud binoga juda yaqin (≥ 2·Hmax, 8-izoh)`);
  if (capped) notes.push(`${capped} ta seksiyaning qavati qarshidagi mavjud binogacha masofa boʻyicha kamaytirildi (≥ 2·Hmax)`);
  return out;
}

/** Halqani tashqariga d ga kengaytirish (qavariq qobiq + miter; toʻsiq uchun yetarli) */
function buffer(r: XY[], d: number): XY[] {
  const p = [...r].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o: XY, a: XY, b: XY) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: XY[] = [], up: XY[] = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  const h = [...lo.slice(0, -1), ...up.slice(0, -1)], out: XY[] = [];
  for (let i = 0; i < h.length; i++) {
    const a = h[(i - 1 + h.length) % h.length], c = h[i], b = h[(i + 1) % h.length];
    const n1 = norm([c[1] - a[1], a[0] - c[0]]), n2 = norm([b[1] - c[1], c[0] - b[0]]);
    // yumaloq burchak oʻrniga 3 nuqta (miter juda uzun boʻlmasin)
    out.push([c[0] + n1[0] * d, c[1] + n1[1] * d]);
    const m = norm([n1[0] + n2[0], n1[1] + n2[1]]); out.push([c[0] + m[0] * d, c[1] + m[1] * d]);
    out.push([c[0] + n2[0] * d, c[1] + n2[1] * d]);
  }
  return out;
}
function norm(v: [number, number]): XY { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; }
function rayHitPar(p: XY, d: XY, r: XY[]): number {
  let best = Infinity;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const a = r[j], b = r[i], ex = b[0] - a[0], ey = b[1] - a[1], den = d[0] * ey - d[1] * ex; if (Math.abs(den) < 1e-12) continue;
    const el = Math.hypot(ex, ey) || 1; if (Math.abs((ex * d[0] + ey * d[1]) / el) > 0.5) continue;
    const t = ((a[0] - p[0]) * ey - (a[1] - p[1]) * ex) / den, s = ((a[0] - p[0]) * d[1] - (a[1] - p[1]) * d[0]) / den;
    if (t > 0.5 && s >= 0 && s <= 1 && t < best) best = t;
  }
  return best;
}

/**
 * Toretslar (27.10): har seksiyaning qisqa (torets) devorlari derazali yoki derazasiz — generatsiyada belgilanadi.
 * ShNQ 2.07.01-23, 79-band 2-jadval: derazali ↔ derazali torets (H1+H2)·0,3; derazali ↔ derazasiz (H1+H2)·0,25;
 * derazasiz ↔ derazasiz (H1+H2)·0,15; I–II darajada ≥ 6 m. Qoida: boshqa seksiyaga tutashgan torets — derazasiz (umumiy devor);
 * oldida (H1+H2)·0,3 dan kam joy qolgan erkin torets — derazasiz; qolganlari — derazali.
 * Natija: GenSection.blind — derazasiz qirralar indekslari (ring[i] → ring[i+1]).
 */
export function assignEnds(S: GenSection[], obs: Obstacle3[], D: number, floorH: number): void {
  const H = (s: GenSection) => ((s.z0 ?? 0) + s.floors) * floorH;
  const others = (k: number) => [...S.map((s, i) => ({ ring: s.ring, h: H(s), i })).filter(x => x.i !== k), ...obs.map(o => ({ ring: o.ring, h: o.h, i: -1 }))];
  S.forEach((s, k) => {
    if (s.kind === 'stilobat') return;
    const r = s.ring, blind: number[] = [];
    for (let i = 0; i < r.length; i++) {
      const a = r[i], b = r[(i + 1) % r.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1) continue;
      const u: XY = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], n: XY = [u[1], -u[0]];   // CCW halqa: tashqi normal — oʻngda
      if (!isEnd(r, i, D)) continue;
      const m: XY = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], p: XY = [m[0] + n[0] * 0.3, m[1] + n[1] * 0.3];
      let best = Infinity, hb = 0;
      for (const o of others(k)) {
        if (pin(p, o.ring) || edgeShared(a, b, o.ring)) { best = 0; break; }
        const t = rayAny(m, n, o.ring); if (t < best) { best = t; hb = o.h; }
      }
      if (best < Math.max(6, (H(s) + hb) * 0.3)) blind.push(i);
    }
    if (blind.length) s.blind = blind; else delete s.blind;
  });
}
/** Qirra torets (qisqa) devormi: uzunligi ≤ 1,3·D yoki qirra oʻrtasidan ichkariga qalinlik ≥ 0,7·uzunlik */
function isEnd(r: XY[], i: number, D: number): boolean {
  const a = r[i], b = r[(i + 1) % r.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (L <= 1.3 * D) return true;
  return false;
}
function edgeShared(a: XY, b: XY, r: XY[]): boolean {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), u: XY = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
  for (let i = 0; i < r.length; i++) {
    const c = r[i], d = r[(i + 1) % r.length];
    if (pd(c, a, b) > 0.6 || pd(d, a, b) > 0.6) continue;   // shu chiziq ustida emas
    const t0 = (c[0] - a[0]) * u[0] + (c[1] - a[1]) * u[1], t1 = (d[0] - a[0]) * u[0] + (d[1] - a[1]) * u[1];
    if (Math.min(L, Math.max(t0, t1)) - Math.max(0, Math.min(t0, t1)) > 2) return true;
  }
  return false;
}
function rayAny(p: XY, d: XY, r: XY[]): number {
  let best = Infinity;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const a = r[j], b = r[i], ex = b[0] - a[0], ey = b[1] - a[1], den = d[0] * ey - d[1] * ex; if (Math.abs(den) < 1e-12) continue;
    const t = ((a[0] - p[0]) * ey - (a[1] - p[1]) * ex) / den, s = ((a[0] - p[0]) * d[1] - (a[1] - p[1]) * d[0]) / den;
    if (t > 0.05 && s >= 0 && s <= 1 && t < best) best = t;
  }
  return best;
}
