/**
 * 12.11 (egasi): «master rejaning yoʻllarini chizayotganda atrofdagi mavjud yoʻllarni davom ettiradigan funksiya yoʻq —
 * mavjud yoʻllar uchastka chegarasida toʻxtab qolgan, aslida shu yoʻllar bilan bogʻlansa mantiqan».
 *
 * Mavjud (OSM) avtomobil yoʻlining uchi uchastka chegarasiga yaqin (≤ near m) boʻlsa va yoʻl shu yoʻnalishda davom etmasa
 * (T-chorraha yoki berk uch), uning yoʻnalishi boʻyicha uchastka ichiga nur yuboriladi. Nur birinchi uchragan narsada toʻxtaydi:
 *  - loyiha koʻchasi (yoki oldin qoʻshilgan davom) — chorraha;
 *  - uchastkaning narigi chegarasi — agar u yerda qarshi tomondan kelgan boshqa uch boʻlsa, ikkalasi bitta koʻchaga ulanadi.
 * Profil — OSM sinfidan (gridgen.profileForOsm). Natija — taklif; foydalanuvchi bir bosishda qoʻshadi (Ctrl+Z bilan qaytariladi).
 * Barcha koordinatalar — mahalliy metr.
 */
import { type XY } from './geo';
import { profileForOsm } from './gridgen';

export interface RoadIn { id: number; cls: string; sub?: string; pts: XY[] }
export interface Stub { osm: number; cls: string; profile: string; axis: XY[]; hit: 'kocha' | 'chegara' | 'uch'; len: number }

const NOT = /^(footway|path|cycleway|steps|track|bridleway|corridor|pedestrian|construction|proposed|platform|raceway|bus_guideway|busway)$/;
const drivable = (r: RoadIn) => !NOT.test(r.cls) && !(r.cls === 'service' && /driveway|parking_aisle|drive-through|emergency_access/.test(r.sub ?? ''));
const RANK = (c: string) => /^(motorway|trunk|primary)/.test(c) ? 0 : /^(secondary|tertiary)/.test(c) ? 1 : /^(residential|unclassified|living_street)/.test(c) ? 2 : 3;
const sub = (a: XY, b: XY): XY => [a[0] - b[0], a[1] - b[1]];
const len = (v: XY) => Math.hypot(v[0], v[1]);
const unit = (v: XY): XY => { const l = len(v) || 1; return [v[0] / l, v[1] / l]; };

function inside(p: XY, r: XY[]): boolean {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; }
  return c;
}
function distSeg(p: XY, a: XY, b: XY): number {
  const d = sub(b, a), L2 = d[0] * d[0] + d[1] * d[1]; const t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / L2)) : 0;
  return Math.hypot(p[0] - a[0] - t * d[0], p[1] - a[1] - t * d[1]);
}
const distRing = (p: XY, r: XY[]) => r.reduce((m, a, i) => Math.min(m, distSeg(p, a, r[(i + 1) % r.length])), Infinity);
/** nur p + t·d bilan [a, b] kesmaning kesishishi: t (m) yoki null */
function raySeg(p: XY, d: XY, a: XY, b: XY): number | null {
  const e = sub(b, a), den = d[0] * e[1] - d[1] * e[0]; if (Math.abs(den) < 1e-9) return null;
  const w = sub(a, p), t = (w[0] * e[1] - w[1] * e[0]) / den, u = (w[0] * d[1] - w[1] * d[0]) / den;
  return u >= -1e-9 && u <= 1 + 1e-9 && t > 1e-6 ? t : null;
}
const raySegs = (p: XY, d: XY, line: XY[], closed: boolean): number[] => {
  const out: number[] = [], n = line.length;
  for (let i = 0; i < (closed ? n : n - 1); i++) { const t = raySeg(p, d, line[i], line[(i + 1) % n]); if (t != null) out.push(t); }
  return out;
};

/** Uchdan orqaga ≥ 10 m (yoki birinchi nuqta) — yoʻnalish barqaror boʻlsin */
function endDir(pts: XY[], atEnd: boolean): { p: XY; d: XY } {
  const seq = atEnd ? pts : pts.slice().reverse(), p = seq[seq.length - 1];
  let q = seq[seq.length - 2];
  for (let i = seq.length - 2; i >= 0; i--) { q = seq[i]; if (len(sub(p, q)) >= 10) break; }
  return { p, d: unit(sub(p, q)) };
}

export function roadStubs(site: XY[], roads: RoadIn[], streets: XY[][], opt: { near?: number; maxLen?: number; minIn?: number } = {}): Stub[] {
  const near = opt.near ?? 40, maxLen = opt.maxLen ?? 500, minIn = opt.minIn ?? 20;
  const rs = roads.filter(r => r.pts.length >= 2 && drivable(r));
  // tugunlar: yoʻl nuqtasi → shu nuqtadan chiqadigan yoʻnalishlar (davom etadimi?)
  const key = (q: XY) => `${Math.round(q[0])},${Math.round(q[1])}`, outs = new Map<string, XY[]>();
  const addOut = (q: XY, to: XY) => { const k = key(q), v = unit(sub(to, q)); for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) { const kk = `${Math.round(q[0]) + dx},${Math.round(q[1]) + dy}`; if (dx || dy) { if (!outs.has(kk)) outs.set(kk, []); outs.get(kk)!.push(v); } } if (!outs.has(k)) outs.set(k, []); outs.get(k)!.push(v); };
  for (const r of rs) for (let i = 0; i < r.pts.length; i++) { if (i > 0) addOut(r.pts[i], r.pts[i - 1]); if (i < r.pts.length - 1) addOut(r.pts[i], r.pts[i + 1]); }

  type Cand = { r: RoadIn; p: XY; d: XY; tIn: number };
  const cands: Cand[] = [];
  for (const r of rs) for (const atEnd of [false, true]) {
    const { p, d } = endDir(r.pts, atEnd);
    const pin = inside(p, site), dr = distRing(p, site);
    if (pin ? dr > 15 : dr > near) continue;                                   // uchastkadan uzoq yoki ichkarida (ichki yoʻl — buziladi)
    if ((outs.get(key(p)) ?? []).some(v => v[0] * d[0] + v[1] * d[1] > 0.87)) continue;   // shu yoʻnalishda davom etadi (≤ 30°)
    // allaqachon davom ettirilgan: uchdan ≤ 6 m da shu yoʻnalishdagi loyiha koʻchasi bor
    if (streets.some(l => l.some((a, i) => i > 0 && distSeg(p, l[i - 1], a) <= 6 && Math.abs(unit(sub(a, l[i - 1]))[0] * d[0] + unit(sub(a, l[i - 1]))[1] * d[1]) > 0.87))) continue;
    const ts = raySegs(p, d, site, true).sort((a, b) => a - b);
    const tIn = pin ? 0 : ts[0]; if (tIn == null || tIn > near + 5) continue;  // nur uchastkaga kirmaydi
    cands.push({ r, p, d, tIn });
  }
  cands.sort((a, b) => RANK(a.r.cls) - RANK(b.r.cls) || a.tIn - b.tIn);

  const out: Stub[] = [], lines: XY[][] = streets.slice(), used = new Set<Cand>();
  for (const c of cands) {
    if (used.has(c)) continue; used.add(c);
    const { p, d } = c, t0 = c.tIn + 1;
    // narigi chegara (uchastkadan chiqish)
    const exits = raySegs(p, d, site, true).filter(t => t > t0).sort((a, b) => a - b), tOut = exits[0] ?? maxLen;
    // loyiha koʻchalari va oldingi davomlar
    let tSt = Infinity; for (const l of lines) for (const t of raySegs(p, d, l, false)) if (t > t0 + 2 && t < tSt) tSt = t;
    // qarshi tomondan kelgan uch: nurga ≤ 12 m yon masofada, oldinda, qarama-qarshi yoʻnalishda
    let mate: Cand | null = null, tM = Infinity;
    for (const o of cands) {
      if (o === c || used.has(o) || o.d[0] * d[0] + o.d[1] * d[1] > -0.87) continue;
      const w = sub(o.p, p), t = w[0] * d[0] + w[1] * d[1], side = Math.abs(w[0] * d[1] - w[1] * d[0]);
      if (t > t0 && side <= 12 && t < tM && t <= tOut + near + 5) { tM = t; mate = o; }
    }
    let axis: XY[], hit: Stub['hit'];
    if (tSt < Infinity && tSt <= Math.min(tOut, tM)) { axis = [p, [p[0] + d[0] * tSt, p[1] + d[1] * tSt]]; hit = 'kocha'; }
    else if (mate) { axis = [p, mate.p]; hit = 'uch'; used.add(mate); }
    else if (exits.length) { axis = [p, [p[0] + d[0] * tOut, p[1] + d[1] * tOut]]; hit = 'chegara'; }
    else continue;
    const L = len(sub(axis[1], axis[0])); if (L - c.tIn < minIn || L > maxLen) continue;
    out.push({ osm: c.r.id, cls: c.r.cls, profile: profileForOsm(c.r.cls), axis, hit, len: L });
    lines.push(axis);
  }
  return out;
}
