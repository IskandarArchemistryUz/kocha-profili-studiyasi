/**
 * Chiziq boʻylab ulangan seksiyalar (05.11, egasi: «Liniya bilan seksiyalarni ulangan holda chizsa boʻlsin»).
 * Siniq chiziq — seksiyalar oʻqi. Har segment atrofida eni D boʻlgan tasma: chap va oʻng offset chiziqlari
 * burilish nuqtalarida kesishadi (miter) — qoʻshni seksiyalar umumiy devor bilan ulanadi.
 * Segment maxLen dan uzun boʻlsa — oʻqqa tik kesmalar bilan teng boʻlaklarga boʻlinadi (umumiy devorli).
 * Ichki burchak 30° dan oʻtkir boʻlsa — xato (miter haddan uzun, seksiya shakli yaroqsiz).
 */
import { signedArea, type XY } from './geo';

export interface StripResult { rings: XY[][]; err?: string }

const sub = (a: XY, b: XY): XY => [a[0] - b[0], a[1] - b[1]];
const add = (a: XY, b: XY): XY => [a[0] + b[0], a[1] + b[1]];
const mul = (a: XY, k: number): XY => [a[0] * k, a[1] * k];
const len = (a: XY) => Math.hypot(a[0], a[1]);

/** Takroriy va bir chiziqda yotgan oraliq nuqtalarni olib tashlash */
export function cleanLine(p: XY[]): XY[] {
  const a = p.filter((q, i) => i === 0 || len(sub(q, p[i - 1])) > 0.5);
  const out: XY[] = [];
  for (let i = 0; i < a.length; i++) {
    if (out.length >= 1 && i < a.length - 1) {
      const u = sub(a[i], out[out.length - 1]), v = sub(a[i + 1], a[i]), c = (u[0] * v[1] - u[1] * v[0]) / (len(u) * len(v) || 1), d = u[0] * v[0] + u[1] * v[1];
      if (Math.abs(c) < 0.01 && d > 0) continue;
    }
    out.push(a[i]);
  }
  return out;
}

export function stripSections(line0: XY[], D: number, maxLen = Infinity): StripResult {
  const P = cleanLine(line0), h = D / 2;
  if (P.length < 2) return { rings: [], err: 'Kamida 2 nuqta kerak' };
  const n = P.length, U: XY[] = [], N: XY[] = [], Ls: number[] = [];
  for (let i = 0; i < n - 1; i++) { const d = sub(P[i + 1], P[i]), l = len(d), u = mul(d, 1 / l); U.push(u); N.push([-u[1], u[0]]); Ls.push(l); }
  // har uchdagi chap (L) va oʻng (R) nuqta
  const L: XY[] = [], R: XY[] = [];
  for (let i = 0; i < n; i++) {
    if (i === 0) { L.push(add(P[0], mul(N[0], h))); R.push(sub(P[0], mul(N[0], h))); continue; }
    if (i === n - 1) { L.push(add(P[i], mul(N[i - 1], h))); R.push(sub(P[i], mul(N[i - 1], h))); continue; }
    const a = U[i - 1], b = U[i], cosI = -(a[0] * b[0] + a[1] * b[1]);   // ichki burchak kosinusi
    const inner = Math.acos(Math.max(-1, Math.min(1, cosI))) * 180 / Math.PI;
    if (inner < 30) return { rings: [], err: 'Burchak juda oʻtkir (< 30°) — seksiyalar ulanmaydi' };
    const m = add(N[i - 1], N[i]), ml = len(m), k = h / ((m[0] * N[i][0] + m[1] * N[i][1]) / ml), mu = mul(m, k / ml);
    L.push(add(P[i], mu)); R.push(sub(P[i], mu));
  }
  const rings: XY[][] = [];
  for (let i = 0; i < n - 1; i++) {
    // miter uchlari oʻq boʻylab qancha chiqadi — kesmalar ular orasiga tushishi kerak
    const proj = (q: XY) => (q[0] - P[i][0]) * U[i][0] + (q[1] - P[i][1]) * U[i][1];
    const s0 = Math.max(proj(L[i]), proj(R[i])), s1 = Math.min(proj(L[i + 1]), proj(R[i + 1]));
    if (s1 - s0 < 3) return { rings: [], err: 'Segment juda qisqa — seksiya chuqurligidan uzunroq chizing' };
    const k = Number.isFinite(maxLen) && maxLen > 0 ? Math.max(1, Math.ceil(Ls[i] / maxLen - 1e-6)) : 1;
    const cutL: XY[] = [L[i]], cutR: XY[] = [R[i]];
    for (let j = 1; j < k; j++) { const s = Ls[i] * j / k, c = add(P[i], mul(U[i], s)); if (s <= s0 + 1 || s >= s1 - 1) continue; cutL.push(add(c, mul(N[i], h))); cutR.push(sub(c, mul(N[i], h))); }
    cutL.push(L[i + 1]); cutR.push(R[i + 1]);
    for (let j = 0; j < cutL.length - 1; j++) {
      const r: XY[] = [cutR[j], cutR[j + 1], cutL[j + 1], cutL[j]];
      rings.push(signedArea(r) < 0 ? r.reverse() : r);
    }
  }
  return { rings };
}
