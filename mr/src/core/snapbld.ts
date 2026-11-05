/**
 * Binoni sudrashda yopishish va aniq oʻlcham (05.11, egasi: «seksiyani bir-biriga yaqin olib borganda yopishadigan qilsa,
 * devorini ushlab tortganda maʼlum razmer qoʻysa, razmer surilayotganda qanchaga oʻzgarayotgani koʻrinsin»).
 *
 * Hamma geometriya mahalliy metrda (XY). Sof funksiyalar — muharrir (editor.ts) sudrash paytida chaqiradi.
 *  - snapMove: koʻchirilayotgan bino qirrasi qoʻshni binoning parallel qirrasiga tol (sukut 1,5 m) ichida boʻlsa —
 *    shu qirra tekisligiga suriladi (roʻpara — umumiy devor, bir tomonga qaragan — fasad chizigʻi bir tekis);
 *    keyin shu qirra boʻylab burchaklar (uchlar) tol ichida boʻlsa — tekislanadi. Parallel qirra topilmasa — uch uchga.
 *  - snapPush: devor surilayotganda yangi holati qoʻshni binoning parallel qirrasi tekisligiga tol ichida boʻlsa — yopishadi.
 *  - edgeSize / pushForSize: devor normali yoʻnalishidagi bino oʻlchami va kerakli oʻlchamga surish masofasi.
 */
export type XY = [number, number];

const sub = (a: XY, b: XY): XY => [a[0] - b[0], a[1] - b[1]];
const dot = (a: XY, b: XY) => a[0] * b[0] + a[1] * b[1];
const crs = (a: XY, b: XY) => a[0] * b[1] - a[1] * b[0];
const sArea = (r: XY[]) => { let s = 0; for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };

/** i-qirra: boshi, oxiri, birlik yoʻnalish, tashqi normal, uzunlik */
export function edgeOf(r: XY[], i: number): { a: XY; b: XY; u: XY; n: XY; L: number } {
  const a = r[i], b = r[(i + 1) % r.length], d = sub(b, a), L = Math.hypot(d[0], d[1]) || 1, u: XY = [d[0] / L, d[1] / L];
  const ccw = sArea(r) > 0, n: XY = ccw ? [u[1], -u[0]] : [-u[1], u[0]];
  return { a, b, u, n, L };
}

/** Devor (edge) normali yoʻnalishidagi bino oʻlchami: devor tekisligidan qarama-qarshi eng uzoq nuqtagacha, m */
export function edgeSize(r: XY[], edge: number): number {
  const { a, n } = edgeOf(r, edge), base = dot(a, n);
  return base - Math.min(...r.map(p => dot(p, n)));
}
/** Oʻlchamni target ga keltirish uchun devorni tashqariga surish masofasi (manfiy — ichkariga) */
export const pushForSize = (r: XY[], edge: number, target: number): number => target - edgeSize(r, edge);

const PAR = Math.sin(2 * Math.PI / 180);   // 2° gacha — parallel

export interface SnapRes { dx: number; dy: number; at: XY | null; kind: 'qirra' | 'uch' | null }

/** Koʻchirilayotgan halqa r (allaqachon siljitilgan) uchun yopishish siljishi */
export function snapMove(r: XY[], others: XY[][], tol = 1.5): SnapRes {
  let best: { s: number; n: XY; i: number; o: XY[]; j: number } | null = null;
  for (let i = 0; i < r.length; i++) {
    const e = edgeOf(r, i); if (e.L < 1) continue;
    for (const o of others) for (let j = 0; j < o.length; j++) {
      const c = o[j], d = o[(j + 1) % o.length], v = sub(d, c), Lv = Math.hypot(v[0], v[1]); if (Lv < 1) continue;
      if (Math.abs(crs(e.u, [v[0] / Lv, v[1] / Lv])) > PAR) continue;
      const t0 = dot(sub(c, e.a), e.u), t1 = dot(sub(d, e.a), e.u), lo = Math.max(0, Math.min(t0, t1)), hi = Math.min(e.L, Math.max(t0, t1));
      // roʻpara qirralar bir-birining qarshisida boʻlishi kerak; bir tomonga qaragan (fasad chizigʻi) — 20 m gacha uzoqda ham
      const same = dot(e.n, [v[1] / Lv, -v[0] / Lv]) * (sArea(o) > 0 ? 1 : -1) > 0;
      if (same ? lo - hi > 20 : hi - lo < 0.5) continue;
      const s = dot(sub(c, e.a), e.n);                               // + — qirra oldida (tashqarida), − — orqasida
      if (Math.abs(s) > tol || (best && Math.abs(s) >= Math.abs(best.s))) continue;
      best = { s, n: e.n, i, o, j };
    }
  }
  if (best) {
    let dx = best.s * best.n[0], dy = best.s * best.n[1];
    // shu qirra boʻylab burchaklarni tekislash
    const e = edgeOf(r, best.i), a: XY = [e.a[0] + dx, e.a[1] + dy], b: XY = [e.b[0] + dx, e.b[1] + dy], c = best.o[best.j], d = best.o[(best.j + 1) % best.o.length];
    let k = Infinity; for (const p of [a, b]) for (const q of [c, d]) { const t = dot(sub(q, p), e.u); if (Math.abs(t) < Math.abs(k)) k = t; }
    if (Math.abs(k) <= tol) { dx += k * e.u[0]; dy += k * e.u[1]; }
    const t0 = dot(sub(c, a), e.u) - (Math.abs(k) <= tol ? k : 0), t1 = dot(sub(d, a), e.u) - (Math.abs(k) <= tol ? k : 0), m = (Math.max(0, Math.min(t0, t1)) + Math.min(e.L, Math.max(t0, t1))) / 2;
    return { dx, dy, at: [a[0] + (Math.abs(k) <= tol ? k : 0) * e.u[0] + m * e.u[0], a[1] + (Math.abs(k) <= tol ? k : 0) * e.u[1] + m * e.u[1]], kind: 'qirra' };
  }
  // parallel qirra yoʻq — uch uchga
  let bp: { d: XY; q: XY } | null = null, bd = tol;
  for (const p of r) for (const o of others) for (const q of o) { const dd = Math.hypot(q[0] - p[0], q[1] - p[1]); if (dd <= bd) { bd = dd; bp = { d: sub(q, p), q }; } }
  return bp ? { dx: bp.d[0], dy: bp.d[1], at: bp.q, kind: 'uch' } : { dx: 0, dy: 0, at: null, kind: null };
}

/** Devor d m ga surilganda (r0 — boshlangʻich halqa) qoʻshni parallel qirra tekisligiga yopishish: yangi d va belgi nuqtasi */
export function snapPush(r0: XY[], edge: number, d: number, others: XY[][], tol = 1.5): { d: number; at: XY | null } {
  const e = edgeOf(r0, edge); let best: { d: number; at: XY } | null = null;
  for (const o of others) for (let j = 0; j < o.length; j++) {
    const c = o[j], q = o[(j + 1) % o.length], v = sub(q, c), Lv = Math.hypot(v[0], v[1]); if (Lv < 1) continue;
    if (Math.abs(crs(e.u, [v[0] / Lv, v[1] / Lv])) > PAR) continue;
    const t0 = dot(sub(c, e.a), e.u), t1 = dot(sub(q, e.a), e.u), lo = Math.max(0, Math.min(t0, t1)), hi = Math.min(e.L, Math.max(t0, t1));
    if (hi - lo < 0.5) continue;
    const s = dot(sub(c, e.a), e.n);
    if (Math.abs(s - d) > tol || (best && Math.abs(s - d) >= Math.abs(best.d - d))) continue;
    const m = (lo + hi) / 2; best = { d: s, at: [e.a[0] + e.u[0] * m + e.n[0] * s, e.a[1] + e.u[1] * m + e.n[1] * s] };
  }
  return best ?? { d, at: null };
}

/** Halqalar orasidagi eng qisqa masofa (ustma-ust boʻlsa 0) */
export function ringGap(a: XY[], b: XY[]): number {
  const seg = (p: XY, c: XY, d: XY) => { const v = sub(d, c), L2 = dot(v, v) || 1, t = Math.max(0, Math.min(1, dot(sub(p, c), v) / L2)); return Math.hypot(p[0] - c[0] - v[0] * t, p[1] - c[1] - v[1] * t); };
  let m = Infinity;
  for (const p of a) for (let j = 0; j < b.length; j++) m = Math.min(m, seg(p, b[j], b[(j + 1) % b.length]));
  for (const p of b) for (let j = 0; j < a.length; j++) m = Math.min(m, seg(p, a[j], a[(j + 1) % a.length]));
  return m;
}
