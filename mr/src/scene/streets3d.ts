/**
 * Koʻcha modeli: trotuar → asfalt → yoʻl chiziqlari (bir-biri ustidan, chorrahada tabiiy qoʻshiladi).
 * Chiziqlar chorraha ichida chizilmaydi; asosiy koʻchalarda chorraha oldida piyoda oʻtish joyi (zebra).
 * Kenglik va qator soni OSM teglaridan (lanes, oneway, sidewalk); yoʻq boʻlsa — koʻcha toifasi boʻyicha taxmin.
 */
import type { XY } from '../core/geo';
import type { HeightFn } from './context3d';

export interface StreetIn { pts: XY[]; cls: string; w: number; lanes?: number; oneway?: boolean }

const FOOT = /^(footway|path|cycleway|steps|pedestrian|track|bridleway|corridor)$/;
const MAJOR = /^(motorway|trunk|primary|secondary)(_link)?$/;

/** Trotuar kengligi (bir tomon), m */
export function sidewalkW(cls: string): number {
  if (FOOT.test(cls) || /^(service|track)$/.test(cls)) return 0;
  if (/^(motorway|trunk)/.test(cls)) return 3;
  if (/^(primary|secondary)/.test(cls)) return 4;
  if (/^tertiary/.test(cls)) return 3;
  return 2.2;
}

export class Buf {
  p: number[] = [];
  constructor(private H: HeightFn, private lift: number) {}
  tri(a: XY, b: XY, c: XY) { for (const v of [a, b, c]) this.p.push(v[0], this.H(v[0], v[1]) + this.lift, -v[1]); }
  quad(a: XY, b: XY, c: XY, d: XY) { this.tri(a, b, c); this.tri(a, c, d); }
  /** segment boʻylab kenglikdagi toʻrtburchak; uzun boʻlsa relyef uchun boʻlinadi */
  band(a: XY, b: XY, off0: number, off1: number) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); if (L < 0.01) return;
    const nx = -dy / L, ny = dx / L, n = Math.max(1, Math.ceil(L / 20));
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n, p0: XY = [a[0] + dx * t0, a[1] + dy * t0], p1: XY = [a[0] + dx * t1, a[1] + dy * t1];
      this.quad([p0[0] + nx * off0, p0[1] + ny * off0], [p1[0] + nx * off0, p1[1] + ny * off0], [p1[0] + nx * off1, p1[1] + ny * off1], [p0[0] + nx * off1, p0[1] + ny * off1]);
    }
  }
  disc(c: XY, r: number) { const n = r > 5 ? 16 : 10; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, b = (i + 1) / n * Math.PI * 2; this.tri(c, [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r], [c[0] + Math.cos(b) * r, c[1] + Math.sin(b) * r]); } }
  /** caps=false — uchlar toʻgʻri kesilgan (loyiha koʻchalari), true — yumaloq (OSM: uzilgan boʻlaklar ulansin) */
  ribbon(pts: XY[], r: number, caps = true) {
    for (let i = 1; i < pts.length; i++) { this.band(pts[i - 1], pts[i], -r, r); if (caps || i < pts.length - 1) this.disc(pts[i], r); }
    if (pts.length && caps) this.disc(pts[0], r);
  }
}

export interface StreetGeo { sidewalk: number[]; asphalt: number[]; major: number[]; foot: number[]; marks: number[] }

const key = (p: XY) => `${Math.round(p[0] * 2)},${Math.round(p[1] * 2)}`;

export function streetsGeo(list: StreetIn[], H: HeightFn): StreetGeo {
  const sw = new Buf(H, 0.08), as = new Buf(H, 0.1), mj = new Buf(H, 0.11), ft = new Buf(H, 0.09), mk = new Buf(H, 0.13);
  // chorrahalar: bir nechta koʻcha uchrashgan nuqta → u yerdagi eng keng yarim kenglik
  const nodes = new Map<string, { n: number; r: number; p: XY }>();
  for (const s of list) {
    if (FOOT.test(s.cls)) continue;
    const seen = new Set<string>();
    s.pts.forEach((p, i) => {
      const k = key(p); if (seen.has(k)) return; seen.add(k);
      const end = i === 0 || i === s.pts.length - 1;
      const e = nodes.get(k) || { n: 0, r: 0, p };
      e.n += end ? 1 : 2; e.r = Math.max(e.r, s.w / 2 + sidewalkW(s.cls)); nodes.set(k, e);
    });
  }
  const junction = (p: XY) => { const e = nodes.get(key(p)); return e && e.n >= 3 ? e : null; };

  for (const s of list) {
    const r = s.w / 2;
    if (FOOT.test(s.cls)) { ft.ribbon(s.pts, Math.max(0.9, r)); continue; }
    const swW = sidewalkW(s.cls);
    if (swW) sw.ribbon(s.pts, r + swW);
    (MAJOR.test(s.cls) ? mj : as).ribbon(s.pts, r);
  }

  // chiziqlar (alohida sikl — trotuar/asfalt hammasi chizilgandan keyin)
  for (const s of list) {
    if (FOOT.test(s.cls) || /^(service|track|living_street)$/.test(s.cls)) continue;
    const lanes = Math.max(1, Math.min(8, s.lanes ?? Math.round(s.w / 3.5)));
    const r = s.w / 2, lw = s.w / lanes;
    for (let i = 1; i < s.pts.length; i++) {
      const a = s.pts[i - 1], b = s.pts[i], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); if (L < 2) continue;
      const ux = dx / L, uy = dy / L;
      const ja = junction(a), jb = junction(b);
      const t0 = ja ? ja.r + 5 : 0, t1 = L - (jb ? jb.r + 5 : 0);
      if (t1 - t0 < 3) continue;
      const P = (t: number): XY => [a[0] + ux * t, a[1] + uy * t];
      // qatorlar orasidagi chiziqlar: markaz (ikki tomonlama) — uzluksiz, qolganlari — uzuq
      for (let k = 1; k < lanes; k++) {
        const off = -r + k * lw, center = !s.oneway && k * 2 === lanes;
        if (center) { mk.band(P(t0), P(t1), off - 0.08, off + 0.08); if (lanes >= 4) mk.band(P(t0), P(t1), off + 0.18, off + 0.34); }
        else for (let t = t0; t < t1; t += 9) mk.band(P(t), P(Math.min(t1, t + 3)), off - 0.07, off + 0.07);
      }
      // magistralda chekka chiziqlar
      if (MAJOR.test(s.cls)) { mk.band(P(t0), P(t1), r - 0.45, r - 0.3); mk.band(P(t0), P(t1), -r + 0.3, -r + 0.45); }
      // zebra: asosiy koʻchada chorraha oldida
      if (MAJOR.test(s.cls) || /^tertiary/.test(s.cls)) {
        // zebra chorraha bilan chiziqlar boshlanishi orasida: markazi tugundan j.r + 2,6 m
        const zs: number[] = [];
        if (ja && L > ja.r + 8) zs.push(ja.r + 2.6);
        if (jb && L > jb.r + 8) zs.push(L - jb.r - 2.6);
        for (const tz of zs) for (let o = -r + 0.4; o < r - 0.4; o += 1.1) mk.band(P(tz - 1.5), P(tz + 1.5), o, o + 0.55);
      }
    }
  }
  return { sidewalk: sw.p, asphalt: as.p, major: mj.p, foot: ft.p, marks: mk.p };
}

/* ---------- loyiha koʻchalari (profil boʻyicha) ---------- */
import type { Part } from '../core/profiles';
import { corridorOutlines, offsetLine } from '../core/plan';
export { offsetLine };

export interface ProjStreet { id: string; axis: XY[]; parts: Part[] }
export interface ProjStreetGeo { layers: Record<string, number[]>; trees: XY[]; red: XY[][] }

const segDist = (p: XY, a: XY, b: XY) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-9; const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)); return Math.hypot(a[0] + t * dx - p[0], a[1] + t * dy - p[1]); };
const lineDist = (p: XY, l: XY[]) => { let m = Infinity; for (let i = 1; i < l.length; i++) m = Math.min(m, segDist(p, l[i - 1], l[i])); return m; };

/** Ulanish nishoni: boshqa yoʻl (OSM yoki loyiha koʻchasi) — oʻqi, qatnov kengligi w, qatnovdan qizil chiziqgacha sw */
export interface RoadTarget { pts: XY[]; w: number; sw: number; bb?: number[] }
/** Qamrov qutisi (w/2 + sw + 1 m zaxira bilan): uzoqdagi nuqta uchun lineDist hisoblanmaydi */
const withBB = (r: RoadTarget): RoadTarget => { const m = r.w / 2 + r.sw + 1; let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const p of r.pts) { if (p[0] < a) a = p[0]; if (p[1] < b) b = p[1]; if (p[0] > c) c = p[0]; if (p[1] > d) d = p[1]; } return { ...r, bb: [a - m, b - m, c + m, d + m] }; };
const outBB = (p: XY, r: RoadTarget) => !!r.bb && (p[0] < r.bb[0] || p[1] < r.bb[1] || p[0] > r.bb[2] || p[1] > r.bb[3]);
const ASPH = /^(qatnov|avtobus|tramvay|parkovka|velo)$/;
/** qatnov qismi (chorrahada asfalt — faqat shu) */
const CARR = /^(qatnov|avtobus|tramvay)$/;
/** ShNQ 2.07.01-23, 341-band: qatnov qismi burilish radiusi trotuar va ajratuvchi chetidan ≥ 15 m; rekonstruksiya va qurilgan hududda 5 m gacha */
export const CURB_R = 15, CURB_R_RECON = 5;
export const asTargets = (osm: StreetIn[]): RoadTarget[] => osm.filter(r => !FOOT.test(r.cls)).map(r => ({ pts: r.pts, w: r.w, sw: sidewalkW(r.cls) }));

/**
 * Koʻcha uchi boshqa yoʻlga ulangan boʻlsa — oʻqni yoʻl chetigacha qisqartirish: body — trotuar/yashil/daraxtlar yoʻlning tashqi
 * (qizil chiziq) chetida tugaydi, road — qatnov qismi uning asfaltiga 0,3 m kirib ulanadi. Ulanmagan uch — oʻzgarmaydi.
 * hit — har uch uchun ulangan yoʻl (bordyur kesigi uchun).
 */
export function trimAtRoads(axis: XY[], tg: RoadTarget[]): { body: XY[]; road: XY[]; hit: [RoadTarget | null, RoadTarget | null] } {
  const hit: [RoadTarget | null, RoadTarget | null] = [null, null];
  if (axis.length < 2 || !tg.length) return { body: axis, road: axis, hit };
  const cut = (a: XY[], atStart: boolean, outer: boolean): XY[] => {
    const e = atStart ? a[0] : a[a.length - 1], prev = atStart ? a[1] : a[a.length - 2];
    let best: { d: number; r: RoadTarget } | null = null;
    for (const r of tg) { if (outBB(e, r)) continue; const d = lineDist(e, r.pts); if (d <= r.w / 2 + r.sw + 1 && (!best || d < best.d)) best = { d, r }; }
    if (!best) return a;
    const R = (r: RoadTarget) => r.w / 2 + (outer ? r.sw : -0.3);
    // uchdan orqaga (prev tomon) yurib, yoʻl oʻqidan masofa R boʻlgan nuqta (ikkilik qidiruv)
    const dx = prev[0] - e[0], dy = prev[1] - e[1], L = Math.hypot(dx, dy); if (L < 0.5) return a;
    const dist = (t: number) => { const q: XY = [e[0] + dx * t, e[1] + dy * t]; let m = Infinity; for (const r of tg) m = Math.min(m, lineDist(q, r.pts) - R(r)); return m; };
    if (dist(1) <= 0) return a;   // butun segment yoʻl ichida — qisqartirilmaydi
    let lo = 0, hi = 1; for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (dist(m) <= 0) lo = m; else hi = m; }
    const t = Math.min(hi, 0.95), q: XY = [e[0] + dx * t, e[1] + dy * t];
    hit[atStart ? 0 : 1] = best.r;
    return atStart ? [q, ...a.slice(1)] : [...a.slice(0, -1), q];
  };
  return { body: cut(cut(axis, true, true), false, true), road: cut(cut(axis, true, false), false, false), hit };
}

/** Yoʻl oʻqining nuqtaga eng yaqin segmenti */
function nearestSeg(p: XY, pts: XY[]): [XY, XY] {
  let best: [XY, XY] = [pts[0], pts[1]], bd = Infinity;
  for (let i = 1; i < pts.length; i++) { const d = segDist(p, pts[i - 1], pts[i]); if (d < bd) { bd = d; best = [pts[i - 1], pts[i]]; } }
  return best;
}

/**
 * Bordyur kesigi (chorraha burchagi): kiruvchi koʻcha asfalti cheti bilan ulanadigan yoʻl asfalti cheti orasidagi burchak
 * R radiusli yoy bilan toʻldiriladi — natijada trotuar kirish joyida uziladi, asfalt silliq ulanadi (Rejada ham, Aksoda ham).
 * end — kiruvchi oʻqning yoʻl ichidagi uchi, prev — undan oldingi nuqta, eL/eR — kiruvchi asfalt chetlari (oʻqdan siljish, chap/oʻng).
 */
export function curbFillets(end: XY, prev: XY, eL: number, eR: number, tg: RoadTarget, R = 6): XY[][] {
  const [a, b] = nearestSeg(end, tg.pts), dx = end[0] - prev[0], dy = end[1] - prev[1], L = Math.hypot(dx, dy); if (L < 0.5) return [];
  const u: XY = [dx / L, dy / L], n: XY = [-u[1], u[0]];               // kiruvchi: yoʻnalish va chap normal
  const vx = b[0] - a[0], vy = b[1] - a[1], VL = Math.hypot(vx, vy) || 1, v: XY = [vx / VL, vy / VL], m: XY = [-v[1], v[0]];
  // yoʻl asfalt cheti — loyiha tomonida (prev tomon)
  const side = Math.sign((prev[0] - a[0]) * m[0] + (prev[1] - a[1]) * m[1]) || 1;
  const E: XY = [a[0] + m[0] * side * tg.w / 2, a[1] + m[1] * side * tg.w / 2];   // chet chizigʻi nuqtasi (yoʻnalishi v)
  const out: XY[][] = [];
  const den = u[0] * v[1] - u[1] * v[0]; if (Math.abs(den) < 1e-6) return [];
  const isect = (P: XY): XY => { const s2 = ((E[0] - P[0]) * v[1] - (E[1] - P[1]) * v[0]) / den; return [P[0] + u[0] * s2, P[1] + u[1] * s2]; };
  const X = isect(prev);                                                 // oʻqning yoʻl cheti bilan kesishmasi
  for (const off of [eL, eR]) {
    const C = isect([prev[0] + n[0] * off, prev[1] + n[1] * off]);      // asfalt cheti bilan kesishmasi (burchak)
    const back: XY = [-u[0], -u[1]];                                     // burchakdan loyiha tomon
    const sg = Math.sign((C[0] - X[0]) * v[0] + (C[1] - X[1]) * v[1]) || 1, w2: XY = [v[0] * sg, v[1] * sg];   // yoʻl cheti boʻylab, oʻqdan uzoqlashib
    const cos = back[0] * w2[0] + back[1] * w2[1], th = Math.acos(Math.max(-1, Math.min(1, cos)));
    if (th < 0.3 || th > Math.PI - 0.3) continue;
    const t = Math.min(14, R / Math.tan(th / 2)), bis: XY = [back[0] + w2[0], back[1] + w2[1]], bl = Math.hypot(bis[0], bis[1]) || 1;
    const O: XY = [C[0] + bis[0] / bl * R / Math.sin(th / 2), C[1] + bis[1] / bl * R / Math.sin(th / 2)];
    const T1: XY = [C[0] + back[0] * t, C[1] + back[1] * t], T2: XY = [C[0] + w2[0] * t, C[1] + w2[1] * t];
    let a1 = Math.atan2(T2[1] - O[1], T2[0] - O[0]), a2 = Math.atan2(T1[1] - O[1], T1[0] - O[0]);
    if (a2 - a1 > Math.PI) a2 -= 2 * Math.PI; if (a1 - a2 > Math.PI) a2 += 2 * Math.PI;
    const poly: XY[] = [C, T2];
    for (let k = 1; k < 8; k++) { const ang = a1 + (a2 - a1) * k / 8; poly.push([O[0] + Math.cos(ang) * R, O[1] + Math.sin(ang) * R]); }
    poly.push(T1); out.push(poly);
  }
  return out;
}

/** Siniq chiziqni yoʻl zonalaridan (oʻq ± R) tashqaridagi boʻlaklarga ajratish — koʻcha yoʻlni kesib oʻtsa, trotuar/yashil u yerda chizilmaydi */
export function splitOutside(axis: XY[], tg: RoadTarget[]): XY[][] {
  if (axis.length < 2 || !tg.length) return [axis];
  const inside = (p: XY) => tg.some(r => !outBB(p, r) && lineDist(p, r.pts) < r.w / 2 + r.sw - 0.05);
  const out: XY[][] = []; let cur: XY[] = [];
  let was = inside(axis[0]); if (!was) cur.push(axis[0]);
  for (let i = 1; i < axis.length; i++) {
    const a = axis[i - 1], b = axis[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 0.5));
    let prev: XY = a;
    for (let k = 1; k <= n; k++) {
      const q: XY = [a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n], now = inside(q);
      if (now && !was) { cur.push(prev); if (cur.length >= 2) out.push(cur); cur = []; }   // zonaga kirdi — chegara nuqtasi bilan yopiladi
      else if (!now && was) cur = [q];                                                    // zonadan chiqdi
      was = now; prev = q;
    }
    if (!was) cur.push(b);   // segment oxiri tashqarida — asl uch
  }
  if (cur.length >= 2) out.push(cur);
  return out;
}

/**
 * 05.11 (egasi skrinshoti: bulvar burilish nuqtasida boshqa koʻchalar ulangan — ajratuvchi tugungacha borardi, tashqi burchakda
 * trotuar doirasi «choʻqqi» boʻlib chiqardi): chorraha boʻlgan ichki boʻgʻinda koʻcha ikki boʻlakka ajratiladi — shunda har boʻlak
 * uchi oddiy chorraha kabi qisqartiriladi (trimAtRoads, curbFillets), ajratuvchi/yashil/trotuar chorraha chetida tugaydi.
 * Chorraha boʻgʻini: (1) boshqa loyiha koʻchasining uchi shu boʻgʻindan koridor yarim kengligi ichida; yoki
 * (2) boshqa koʻcha boʻgʻini bilan ustma-ust (≤ 1 m) — X chorraha. Oddiy burilish (boshqa koʻcha yoʻq) — oʻzgarmaydi.
 */
export function splitAtJunctions(list: ProjStreet[]): ProjStreet[] {
  const halfW = (s: ProjStreet) => s.parts.reduce((a, p) => a + p.w, 0) / 2;
  const d = (a: XY, b: XY) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const out: ProjStreet[] = [];
  for (const s of list) {
    const n = s.axis.length; if (n < 3) { out.push(s); continue; }
    const hs = halfW(s), cut: number[] = [];
    for (let i = 1; i < n - 1; i++) {
      const v = s.axis[i];
      const hit = list.some(t => t !== s && t.axis.length >= 2 && (
        [t.axis[0], t.axis[t.axis.length - 1]].some(e => d(e, v) <= Math.max(hs, 1)) ||
        t.axis.slice(1, -1).some(q => d(q, v) <= 1)));
      if (hit) cut.push(i);
    }
    if (!cut.length) { out.push(s); continue; }
    let a = 0;
    for (const [k, i] of [...cut, n - 1].entries()) { out.push({ ...s, id: k ? `${s.id}#${k}` : s.id, axis: s.axis.slice(a, i + 1) }); a = i; }
  }
  return out;
}

export function projectStreetsGeo(list0: ProjStreet[], H: HeightFn, osm: StreetIn[] = [], opt: { curbR?: number } = {}): ProjStreetGeo {
  const list = splitAtJunctions(list0), R = opt.curbR ?? CURB_R;
  const L: Record<string, Buf> = {}, layer = (k: string, lift: number) => (L[k] ??= new Buf(H, lift));
  const trees: XY[] = [];
  const half = (s: ProjStreet) => s.parts.reduce((a, p) => a + p.w, 0) / 2;
  const asph = (s: ProjStreet) => s.parts.filter(p => ASPH.test(p.k)).reduce((a, p) => a + p.w, 0);
  /** s uchun ulanish nishonlari: OSM yoʻllari + boshqa loyiha koʻchalari (qatnov kengligi va qizil chiziqgacha masofa bilan) */
  /* OSM: faqat loyiha koʻchalari qamroviga yetadigan yoʻllar (atrof 1,8 km gacha — minglab yoʻl; har nuqtada hammasini
     tekshirish katta uchastkada sahnani daqiqalab qotirardi). Har yoʻlda qamrov qutisi — uzoq nuqtalar darhol oʻtkaziladi. */
  let X0 = Infinity, Y0 = Infinity, X1 = -Infinity, Y1 = -Infinity, hm = 0;
  for (const s of list) { hm = Math.max(hm, half(s)); for (const p of s.axis) { if (p[0] < X0) X0 = p[0]; if (p[1] < Y0) Y0 = p[1]; if (p[0] > X1) X1 = p[0]; if (p[1] > Y1) Y1 = p[1]; } }
  const osmT = asTargets(osm).map(withBB).filter(r => !(r.bb![2] < X0 - hm || r.bb![0] > X1 + hm || r.bb![3] < Y0 - hm || r.bb![1] > Y1 + hm));
  const own = new Map(list.map(o => [o, withBB({ pts: o.axis, w: asph(o), sw: half(o) - asph(o) / 2 })]));
  const TG = new Map(list.map(s => [s, [...osmT, ...list.filter(o => o !== s).map(o => own.get(o)!)]]));
  const targets = (s: ProjStreet): RoadTarget[] => TG.get(s)!;
  // chorraha: nuqta boshqa koʻcha/yoʻl koridori ichida
  const nearOther = (p: XY, self: ProjStreet) => targets(self).some(r => !outBB(p, r) && lineDist(p, r.pts) <= r.w / 2 + r.sw + 0.5);
  const T = new Map<ProjStreet, ReturnType<typeof trimAtRoads>>(); for (const s of list) T.set(s, trimAtRoads(s.axis, targets(s)));
  // qizil chiziqlar: koridorlar birlashmasining konturi — chorrahada kesishmaydi, uchlari yoʻl chetida
  const red = corridorOutlines(list.map(s => ({ axis: T.get(s)!.body, half: half(s) })), osmT.map(r => ({ axis: r.pts, half: r.w / 2 + r.sw })));

  /* ---- 05.11 (egasi chizmasi): chorraha = qatnov qismlari birlashmasi; har burchakda ikki qatnov cheti R radiusli yoy bilan
     (ShNQ 2.07.01-23, 341-band: trotuar va ajratuvchi chetidan ≥ 15 m, rekonstruksiyada 5 m gacha); trotuar burchakdan aylanib
     qizil chiziq burchagigacha; yashil tasma, velo, parkovka va daraxtlar yoy boshlanishidan oldin tugaydi; ajratuvchi kesishgan
     qatnovlar chetida yumaloq uch bilan tugaydi. Faqat ≥ 2 loyiha koʻchasi uchi uchrashgan tugunda (T — oʻrtaga ulangan — avvalgidek). */
  interface JEnd { s: ProjStreet; k: 0 | 1; e: XY; o: XY; n: XY; sg: number; cmin: number; cmax: number; bd: number; sCw: number; sCcw: number; sCore: number; jc?: XY }
  const jends: JEnd[] = [];
  for (const s of list) {
    const { body, hit } = T.get(s)!; if (s.axis.length < 2) continue;
    const W = half(s) * 2; let o = -W / 2, cmin = Infinity, cmax = -Infinity;
    for (const p of s.parts) { const o0 = o, o1 = o + p.w; o = o1; if (CARR.test(p.k)) { cmin = Math.min(cmin, o0); cmax = Math.max(cmax, o1); } }
    if (!(cmin < cmax)) continue;
    for (const k of [0, 1] as const) {
      if (!hit[k]) continue;
      const e = k === 0 ? s.axis[0] : s.axis[s.axis.length - 1], pv = k === 0 ? s.axis[1] : s.axis[s.axis.length - 2], dl = Math.hypot(pv[0] - e[0], pv[1] - e[1]); if (dl < 0.5) continue;
      const ov: XY = [(pv[0] - e[0]) / dl, (pv[1] - e[1]) / dl], sg = k === 0 ? 1 : -1, be = k === 0 ? body[0] : body[body.length - 1];
      // tashqi (koʻcha ichiga) yoʻnalish oʻqida: chap normal — soat miliga teskari tomon; profil siljishlari koʻcha yoʻnalishiga nisbatan → sg
      jends.push({ s, k, e, o: ov, n: [-ov[1], ov[0]], sg, cmin: sg > 0 ? cmin : -cmax, cmax: sg > 0 ? cmax : -cmin, bd: (be[0] - e[0]) * ov[0] + (be[1] - e[1]) * ov[1], sCw: NaN, sCcw: NaN, sCore: 0 });
    }
  }
  const at = (j: JEnd, sd: number, off: number): XY => [j.e[0] + j.o[0] * sd + j.n[0] * off, j.e[1] + j.o[1] * sd + j.n[1] * off];
  const q = layer('qatnov', 0.12), used = new Set<JEnd>();
  for (const j0 of jends) {
    if (used.has(j0)) continue;
    const grp = jends.filter(j => !used.has(j) && Math.hypot(j.e[0] - j0.e[0], j.e[1] - j0.e[1]) <= 10);
    if (grp.length < 2) continue;
    grp.forEach(j => used.add(j));
    const c: XY = [grp.reduce((t, j) => t + j.e[0], 0) / grp.length, grp.reduce((t, j) => t + j.e[1], 0) / grp.length];
    grp.forEach(j => { j.jc = c; });
    const ord = [...grp].sort((a, b) => Math.atan2(a.o[1], a.o[0]) - Math.atan2(b.o[1], b.o[0]));
    const core: XY[] = [];
    for (let i = 0; i < ord.length; i++) {
      const A = ord[i], B = ord[(i + 1) % ord.length];
      core.push(at(A, 0, A.cmin), at(A, 0, A.cmax));
      let ang = Math.atan2(B.o[1], B.o[0]) - Math.atan2(A.o[1], A.o[0]); while (ang <= 1e-6) ang += 2 * Math.PI;
      const PA = at(A, 0, A.cmax), PB = at(B, 0, B.cmin), den = A.o[0] * B.o[1] - A.o[1] * B.o[0];
      const tA = ((PB[0] - PA[0]) * B.o[1] - (PB[1] - PA[1]) * B.o[0]) / den, X: XY = [PA[0] + A.o[0] * tA, PA[1] + A.o[1] * tA];
      if (ang > Math.PI * 0.95 || !Number.isFinite(tA) || Math.hypot(X[0] - c[0], X[1] - c[1]) > 60) {
        // deyarli toʻgʻri davom (yoki burchak juda katta) — yoysiz: chetlar uchidan qoʻshiladi
        A.sCcw = Math.max(isNaN(A.sCcw) ? 0 : A.sCcw, 0); B.sCw = Math.max(isNaN(B.sCw) ? 0 : B.sCw, 0); continue;
      }
      // burchak: ikki qatnov cheti X da kesishadi; R radiusli yoy (tashqi burchak — trotuar tomoni) bilan aylantiriladi
      const tau = R / Math.tan(ang / 2), bl = Math.hypot(A.o[0] + B.o[0], A.o[1] + B.o[1]) || 1, bis: XY = [(A.o[0] + B.o[0]) / bl, (A.o[1] + B.o[1]) / bl];
      const TA: XY = [X[0] + A.o[0] * tau, X[1] + A.o[1] * tau], TB: XY = [X[0] + B.o[0] * tau, X[1] + B.o[1] * tau];
      const O: XY = [X[0] + bis[0] * R / Math.sin(ang / 2), X[1] + bis[1] * R / Math.sin(ang / 2)];
      let a1 = Math.atan2(TA[1] - O[1], TA[0] - O[0]), a2 = Math.atan2(TB[1] - O[1], TB[0] - O[0]);
      if (a2 - a1 > Math.PI) a2 -= 2 * Math.PI; if (a1 - a2 > Math.PI) a2 += 2 * Math.PI;
      const arc: XY[] = [TA]; for (let m = 1; m < 12; m++) { const g = a1 + (a2 - a1) * m / 12; arc.push([O[0] + Math.cos(g) * R, O[1] + Math.sin(g) * R]); } arc.push(TB);
      for (let m = 1; m < arc.length; m++) q.tri(X, arc[m - 1], arc[m]);
      core.push(X);
      const dA = (TA[0] - A.e[0]) * A.o[0] + (TA[1] - A.e[1]) * A.o[1], dB = (TB[0] - B.e[0]) * B.o[0] + (TB[1] - B.e[1]) * B.o[1];
      A.sCcw = Math.max(isNaN(A.sCcw) ? 0 : A.sCcw, dA); B.sCw = Math.max(isNaN(B.sCw) ? 0 : B.sCw, dB);
      const xA = (X[0] - A.e[0]) * A.o[0] + (X[1] - A.e[1]) * A.o[1], xB = (X[0] - B.e[0]) * B.o[0] + (X[1] - B.e[1]) * B.o[1];
      A.sCore = Math.max(A.sCore, xA); B.sCore = Math.max(B.sCore, xB);
    }
    // markaz: c dan yelpigʻich (bir-birini qoplashi zarar qilmaydi — bitta rang)
    for (let i = 0; i < core.length; i++) q.tri(c, core[i], core[(i + 1) % core.length]);
    // har uch: qatnov qismi (butun eni, ajratuvchi oraligʻi bilan) uchdan kesishgan qatnovlar chetigacha (undan nari — oʻz qatnovi va yoylar)
    for (const j of grp) {
      const rd = T.get(j.s)!.road, re = j.k === 0 ? rd[0] : rd[rd.length - 1], r0 = (re[0] - j.e[0]) * j.o[0] + (re[1] - j.e[1]) * j.o[1];
      q.band(j.e, at(j, Math.max(j.sCore, r0) + 0.5, 0), j.cmin, j.cmax);
    }
  }
  const jOf = (s: ProjStreet, k: 0 | 1) => jends.find(j => j.s === s && j.k === k && j.jc);
  /** chiziqni uchidan d masofagacha qisqartirish (k = 0 — boshi, 1 — oxiri) */
  const cutEnd = (ax: XY[], k: 0 | 1, d: number): XY[] => {
    const a = k === 0 ? ax : [...ax].reverse(); let acc = 0;
    for (let i = 1; i < a.length; i++) { const L0 = Math.hypot(a[i][0] - a[i - 1][0], a[i][1] - a[i - 1][1]); if (acc + L0 > d) { const t = (d - acc) / L0, p: XY = [a[i - 1][0] + (a[i][0] - a[i - 1][0]) * t, a[i - 1][1] + (a[i][1] - a[i - 1][1]) * t], r = [p, ...a.slice(i)]; return k === 0 ? r : r.reverse(); } acc += L0; }
    return [];
  };
  for (const s of list) {
    const W = half(s) * 2, { body, road, hit } = T.get(s)!;
    const J: [JEnd | undefined, JEnd | undefined] = [jOf(s, 0), jOf(s, 1)];
    // oʻrtasi OSM yoʻlni kesib oʻtsa — yoʻl zonasida trotuar/yashil yoʻq (uchlari allaqachon qisqartirilgan)
    const bodies = splitOutside(body, osmT);
    // asos: butun kenglik — trotuar rangida (boʻgʻinlarda doira); chorraha uchida qizil chiziqqacha (burchakdan aylanib davom etadi)
    for (const bp of bodies) layer('trotuar', 0.08).ribbon(bp, W / 2, false);
    /** chorraha uchida qism qayergacha: tomonga qarab (yoy boshlanishi); yoʻq boʻlsa — tana (qizil chiziq) */
    const partAxis = (o0: number, o1: number, med: boolean): XY[][] => {
      let ax = s.axis;
      for (const k of [1, 0] as const) {
        const j = J[k];
        if (!j) { if (hit[k]) { const be = k === 0 ? body[0] : body[body.length - 1], d = Math.hypot(be[0] - ax[k === 0 ? 0 : ax.length - 1][0], be[1] - ax[k === 0 ? 0 : ax.length - 1][1]); ax = cutEnd(ax, k, d); } continue; }
        const lo = j.sg * o0, hi = j.sg * o1, mid = (lo + hi) / 2;
        const d = med ? j.sCore + Math.abs(hi - lo) / 2 + 0.5 : mid > j.cmax - 0.01 ? (isNaN(j.sCcw) ? j.bd : j.sCcw + 1) : mid < j.cmin + 0.01 ? (isNaN(j.sCw) ? j.bd : j.sCw + 1) : j.sCore;
        ax = cutEnd(ax, k, Math.max(0, d));
      }
      return ax.length >= 2 ? splitOutside(ax, osmT) : [];
    };
    let o = -W / 2, aL = Infinity, aR = -Infinity;
    for (const p of s.parts) { const o0 = o, o1 = o + p.w; o = o1; if (ASPH.test(p.k)) { aL = Math.min(aL, o0); aR = Math.max(aR, o1); } }
    o = -W / 2;
    for (const p of s.parts) {
      const o0 = o, o1 = o + p.w; o = o1;
      if (p.k === 'trotuar') continue;
      const b = layer(p.k === 'ajratuvchi' ? 'yashil' : p.k, p.k === 'qatnov' ? 0.12 : 0.1);
      const med = p.k === 'ajratuvchi', axs = CARR.test(p.k) ? [road] : (J[0] || J[1]) ? partAxis(o0, o1, med) : (ASPH.test(p.k) ? [road] : bodies);
      for (const ax of axs) for (let i = 1; i < ax.length; i++) b.band(ax[i - 1], ax[i], o0, o1);
      // ajratuvchi chorraha kirishida yumaloq uch bilan tugaydi
      if (med) for (const k of [0, 1] as const) { const j = J[k]; if (!j) continue; const ax = axs.flat(); if (!ax.length) continue; const pe = k === 0 ? axs[0][0] : axs[axs.length - 1][axs[axs.length - 1].length - 1], m = (o0 + o1) / 2 * j.sg;
        const cc: XY = [pe[0] + j.n[0] * m, pe[1] + j.n[1] * m]; b.disc(cc, p.w / 2); }
      if (p.k === 'qatnov') for (let i = 1; i < road.length - 1; i++) {
        // ichki boʻgʻinda asfalt yaxlit
        const c = road[i], mid = (o0 + o1) / 2, prev = road[i - 1], next = road[i + 1], dx = next[0] - prev[0], dy = next[1] - prev[1], Ln = Math.hypot(dx, dy) || 1;
        b.disc([c[0] - dy / Ln * mid, c[1] + dx / Ln * mid], p.w / 2 + 0.3);
      }
      if ((p.k === 'yashil' && p.w >= 1.4) || (p.k === 'ajratuvchi' && p.w >= 3)) {
        const mid = (o0 + o1) / 2;
        // chorraha uchida daraxtlar yashil tasma tugashidan 2 m oldin (koʻrinish uchburchagi)
        const tax = (J[0] || J[1]) ? partAxis(o0, o1, med).map(a => a.length >= 2 ? (J[0] ? cutEnd(a, 0, 2) : a) : a).map(a => a.length >= 2 && J[1] ? cutEnd(a, 1, 2) : a).filter(a => a.length >= 2) : [body];
        for (const tb of tax) for (let i = 1; i < tb.length; i++) {
          const a = tb[i - 1], c = tb[i], dx = c[0] - a[0], dy = c[1] - a[1], Ls = Math.hypot(dx, dy); if (Ls < 4) continue;
          for (let t = 4; t < Ls - 3; t += 8) { const q2: XY = [a[0] + dx / Ls * t - dy / Ls * mid, a[1] + dy / Ls * t + dx / Ls * mid]; if (!(J[0] || J[1]) && nearOther(q2, s)) continue; trees.push(q2); }
        }
      }
      if (p.k === 'qatnov' && (p.lanes ?? 1) >= 2) {
        const lanes = p.lanes!, lw = p.w / lanes, mk = layer('chiziq', 0.14);
        for (let i = 1; i < road.length; i++) {
          const a = road[i - 1], c = road[i], dx = c[0] - a[0], dy = c[1] - a[1], Ls = Math.hypot(dx, dy); if (Ls < 4) continue;
          const ux = dx / Ls, uy = dy / Ls, P = (t: number): XY => [a[0] + ux * t, a[1] + uy * t];
          const t0 = i === 1 && hit[0] ? 4 : 0, t1 = Ls - (i === road.length - 1 && hit[1] ? 4 : 0);
          for (let k = 1; k < lanes; k++) { const off = o0 + k * lw; for (let t = t0; t < t1; t += 9) { const m = P(t + 1.5); if (nearOther([m[0] - uy * off, m[1] + ux * off], s)) continue; mk.band(P(t), P(Math.min(t1, t + 3)), off - 0.07, off + 0.07); } }
        }
      }
    }
    // bordyur kesigi (T — boshqa koʻcha oʻrtasiga yoki OSM yoʻlga ulangan uch): asfalt burchaklari yoy bilan toʻldiriladi
    if (aL < aR) for (const [k, tgt] of hit.entries()) {
      if (!tgt || s.axis.length < 2 || J[k as 0 | 1]) continue;
      const end = k === 0 ? s.axis[0] : s.axis[s.axis.length - 1], prev = k === 0 ? s.axis[1] : s.axis[s.axis.length - 2];
      for (const poly of curbFillets(end, prev, aL, aR, tgt)) for (let i = 1; i < poly.length - 1; i++) q.tri(poly[0], poly[i], poly[i + 1]);
    }
  }
  // chorraha burchaklari — qoʻshni ikki koʻcha tanasi chetlari orasidagi joy trotuar bilan (qizil chiziqlar burchagigacha); asfalt ostida qoladi
  const tw = layer('trotuar', 0.08);
  const done = new Set<XY>();
  for (const j0 of jends) {
    if (!j0.jc || done.has(j0.jc)) continue; const c = j0.jc; done.add(c);
    const ord = jends.filter(j => j.jc === c).sort((a, b) => Math.atan2(a.o[1], a.o[0]) - Math.atan2(b.o[1], b.o[0]));
    for (let i = 0; i < ord.length; i++) {
      const A = ord[i], B = ord[(i + 1) % ord.length], hA = half(A.s), hB = half(B.s);
      const EA = at(A, A.bd, hA), EB = at(B, B.bd, -hB);
      tw.tri(c, at(A, A.bd, -hA), EA);
      let ang = Math.atan2(B.o[1], B.o[0]) - Math.atan2(A.o[1], A.o[0]); while (ang <= 1e-6) ang += 2 * Math.PI;
      if (ang > Math.PI * 0.95) { tw.tri(c, EA, EB); continue; }
      const den = A.o[0] * B.o[1] - A.o[1] * B.o[0], t = ((EB[0] - EA[0]) * B.o[1] - (EB[1] - EA[1]) * B.o[0]) / den, X: XY = [EA[0] + A.o[0] * t, EA[1] + A.o[1] * t];
      if (!Number.isFinite(t) || Math.hypot(X[0] - c[0], X[1] - c[1]) > 3 * Math.max(hA, hB)) { tw.tri(c, EA, EB); continue; }
      tw.tri(c, EA, X); tw.tri(c, X, EB);
    }
  }
  const layers: Record<string, number[]> = {}; for (const k in L) layers[k] = L[k].p;
  return { layers, trees, red };
}
