/**
 * Berk koʻcha oxiri va chorraha aylanmalari (31.10).
 *  ShNQ 2.07.06-24, 57-band: berk koʻcha radiusi ≥ 15 m aylanish maydonchasi yoki 20 × 20 m maydoncha bilan tugaydi;
 *  ShNQ 2.07.06-24, 106-band: berk tor koʻcha ≤ 150 m;
 *  ShNQ 2.07.06-24, 27-band: kesishmalarda kichik aylanmalar (halqa) qilish mumkin.
 * Koʻcha uchidagi belgi — Street.ends (a — oʻqning boshi, b — oxiri); aylanma — Project.rounds (chorraha markazi).
 * Sahnada bitta tekis disk / halqa (yengil), kvartal chegarasidan (qizil chiziq) ayriladi.
 */
import type { Project, Street } from './doc';
import { frame, type XY } from './geo';

export type EndKind = 'aylana' | 'maydon';
export const TURN_R = 15, TURN_SQ = 20, WALK = 2.5;
export interface DeadEnd { sid: string; end: 'a' | 'b'; p: XY; dir: XY; len: number; has?: EndKind }
export interface EndShape { kind: EndKind | 'halqa'; outer: XY[]; carriage: XY[]; island?: XY[]; at: XY }

const segD = (p: XY, a: XY, b: XY) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)); return Math.hypot(a[0] + dx * t - p[0], a[1] + dy * t - p[1]); };
const circle = (c: XY, r: number, n = 28): XY[] => Array.from({ length: n }, (_, i) => [c[0] + r * Math.cos(2 * Math.PI * i / n), c[1] + r * Math.sin(2 * Math.PI * i / n)] as XY);
const pin = (p: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1] || 1e-12) + r[i][0]) c = !c; return c; };

/**
 * Berk uchlar: boshqa loyiha koʻchasiga (≤ 2 m) tegmaydigan va uchastka ichida (chegaradan ≥ 5 m) tugaydigan oʻq uchlari.
 * len — uchdan eng yaqin chorrahagacha (oʻq boʻylab), chorraha boʻlmasa — butun uzunlik.
 */
export function deadEnds(doc: Project): DeadEnd[] {
  const fr = frame(doc.origin), ax = doc.streets.map(s => s.axis.map(fr.toLocal));
  const site = doc.site ? doc.site.rings[0].map(fr.toLocal) : null;
  const out: DeadEnd[] = [];
  doc.streets.forEach((s, i) => {
    const A = ax[i]; if (A.length < 2) return;
    const near = (p: XY) => ax.some((B, j) => j !== i && B.some((q, k) => k + 1 < B.length && segD(p, q, B[k + 1]) <= 2));
    // oʻqdagi chorrahalar (boshqa koʻcha shu oʻqqa tegadigan joylar): uzunlik boʻyicha parametr
    const cum = [0]; for (let k = 1; k < A.length; k++) cum.push(cum[k - 1] + Math.hypot(A[k][0] - A[k - 1][0], A[k][1] - A[k - 1][1]));
    const Ltot = cum[cum.length - 1];
    const tOf = (p: XY) => { let bt = 0, bd = Infinity; for (let k = 0; k + 1 < A.length; k++) { const a = A[k], b = A[k + 1], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)), d = Math.hypot(a[0] + dx * t - p[0], a[1] + dy * t - p[1]); if (d < bd) { bd = d; bt = cum[k] + t * Math.sqrt(L2); } } return { t: bt, d: bd }; };
    const js: number[] = [];
    ax.forEach((B, j) => { if (j === i) return; for (const q of B) { const r = tOf(q); if (r.d <= 2) js.push(r.t); } });
    for (const [end, p, q] of [['a', A[0], A[1]], ['b', A[A.length - 1], A[A.length - 2]]] as ['a' | 'b', XY, XY][]) {
      if (near(p)) continue;
      if (!site || !pin(p, site) || site.some((a, k) => segD(p, a, site[(k + 1) % site.length]) < 5)) continue;
      const l = Math.hypot(p[0] - q[0], p[1] - q[1]) || 1, t0 = end === 'a' ? 0 : Ltot;
      const ds = js.map(t => Math.abs(t - t0)), len = ds.length ? Math.min(...ds) : Ltot;
      out.push({ sid: s.id, end, p, dir: [(p[0] - q[0]) / l, (p[1] - q[1]) / l], len, has: s.ends?.[end] });
    }
  });
  return out;
}

/** Koʻcha uchlari va aylanmalar geometriyasi (mahalliy metr): tashqi chegara (piyoda yoʻlagi bilan), qatnov qismi, orolcha */
export function endShapes(doc: Project): EndShape[] {
  const fr = frame(doc.origin), out: EndShape[] = [];
  for (const s of doc.streets) {
    if (!s.ends) continue;
    const A = s.axis.map(fr.toLocal); if (A.length < 2) continue;
    for (const end of ['a', 'b'] as const) {
      const k = s.ends[end]; if (!k) continue;
      const p = end === 'a' ? A[0] : A[A.length - 1], q = end === 'a' ? A[1] : A[A.length - 2], l = Math.hypot(p[0] - q[0], p[1] - q[1]) || 1, d: XY = [(p[0] - q[0]) / l, (p[1] - q[1]) / l], n: XY = [-d[1], d[0]];
      if (k === 'aylana') { /* markaz koʻcha uchidan 6 m ichkarida — aylana uchdan ~11 m chiqadi */ const c: XY = [p[0] - d[0] * 6, p[1] - d[1] * 6]; out.push({ kind: k, at: c, carriage: circle(c, TURN_R), outer: circle(c, TURN_R + WALK) }); }
      else {
        const sq = (h: number, f: number): XY[] => { const c: XY = [p[0] + d[0] * (TURN_SQ / 2 - 3), p[1] + d[1] * (TURN_SQ / 2 - 3)]; return [[-h, -h], [h, -h], [h, h], [-h, h]].map(([x, y]) => [c[0] + d[0] * x * f + n[0] * y, c[1] + d[1] * x * f + n[1] * y] as XY); };
        out.push({ kind: k, at: p, carriage: sq(TURN_SQ / 2, 1), outer: sq(TURN_SQ / 2 + WALK, 1) });
      }
    }
  }
  for (const r of doc.rounds ?? []) {
    const c = fr.toLocal(r.at), R = r.r;
    out.push({ kind: 'halqa', at: c, carriage: circle(c, R, 40), island: circle(c, Math.max(2, R - 7), 32), outer: circle(c, R + WALK, 40) });
  }
  return out;
}

/** Koʻcha uchini almashtirish (yoʻq → aylana → maydon → yoʻq) uchun patch */
export function nextEnd(s: Street, end: 'a' | 'b'): Partial<Street> {
  const cur = s.ends?.[end], nx: EndKind | undefined = cur === undefined ? 'aylana' : cur === 'aylana' ? 'maydon' : undefined;
  const ends = { ...(s.ends ?? {}), [end]: nx }; if (!nx) delete ends[end];
  return { ends: Object.keys(ends).length ? ends : undefined };
}

/** Chorrahalar: ≥ 2 loyiha koʻchasi oʻqlari uchrashadigan nuqtalar (aylanma qoʻyish uchun nomzodlar) */
export function junctions(doc: Project): XY[] {
  const fr = frame(doc.origin), ax = doc.streets.map(s => s.axis.map(fr.toLocal)), out: XY[] = [];
  const add = (p: XY) => { if (!out.some(o => Math.hypot(o[0] - p[0], o[1] - p[1]) < 8)) out.push(p); };
  ax.forEach((A, i) => [A[0], A[A.length - 1]].forEach(p => { if (ax.some((B, j) => j !== i && B.some((q, k) => k + 1 < B.length && segD(p, q, B[k + 1]) <= 2))) add(p); }));
  // oʻqlar kesishuvi (X chorraha)
  for (let i = 0; i < ax.length; i++) for (let j = i + 1; j < ax.length; j++) for (let k = 0; k + 1 < ax[i].length; k++) for (let m = 0; m + 1 < ax[j].length; m++) {
    const a = ax[i][k], b = ax[i][k + 1], c = ax[j][m], d = ax[j][m + 1], den = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0]); if (Math.abs(den) < 1e-9) continue;
    const t = ((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0])) / den, u = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / den;
    if (t > 0 && t < 1 && u > 0 && u < 1) add([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}
