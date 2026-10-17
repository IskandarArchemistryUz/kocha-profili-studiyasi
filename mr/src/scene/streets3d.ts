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

/**
 * Koʻcha uchi mavjud (OSM) yoʻlga ulangan boʻlsa — oʻqni yoʻl chetigacha qisqartirish: body — trotuar/yashil/daraxtlar yoʻlning
 * tashqi (trotuar) chetida tugaydi, road — qatnov qismi OSM asfaltiga 0,3 m kirib ulanadi. Ulanmagan uch — oʻzgarmaydi.
 */
export function trimAtRoads(axis: XY[], osm: StreetIn[]): { body: XY[]; road: XY[] } {
  if (axis.length < 2 || !osm.length) return { body: axis, road: axis };
  const cut = (a: XY[], atStart: boolean, outer: boolean): XY[] => {
    const e = atStart ? a[0] : a[a.length - 1], prev = atStart ? a[1] : a[a.length - 2];
    let best: { d: number; R: number } | null = null;
    for (const r of osm) { if (FOOT.test(r.cls)) continue; const d = lineDist(e, r.pts), R = r.w / 2 + (outer ? sidewalkW(r.cls) : -0.3); if (d <= r.w / 2 + sidewalkW(r.cls) + 1 && (!best || d < best.d)) best = { d, R }; }
    if (!best) return a;
    // uchdan orqaga (prev tomon) yurib, OSM oʻqidan masofa R boʻlgan nuqta (ikkilik qidiruv)
    const dx = prev[0] - e[0], dy = prev[1] - e[1], L = Math.hypot(dx, dy); if (L < 0.5) return a;
    const dist = (t: number) => { const q: XY = [e[0] + dx * t, e[1] + dy * t]; let m = Infinity; for (const r of osm) if (!FOOT.test(r.cls)) m = Math.min(m, lineDist(q, r.pts) - (r.w / 2 + (outer ? sidewalkW(r.cls) : -0.3))); return m; };
    if (dist(1) <= 0) return a;   // butun segment yoʻl ichida — qisqartirilmaydi
    let lo = 0, hi = 1; for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (dist(m) <= 0) lo = m; else hi = m; }
    const t = Math.min(hi, 0.95), q: XY = [e[0] + dx * t, e[1] + dy * t];
    return atStart ? [q, ...a.slice(1)] : [...a.slice(0, -1), q];
  };
  return { body: cut(cut(axis, true, true), false, true), road: cut(cut(axis, true, false), false, false) };
}

export function projectStreetsGeo(list: ProjStreet[], H: HeightFn, osm: StreetIn[] = []): ProjStreetGeo {
  const L: Record<string, Buf> = {}, layer = (k: string, lift: number) => (L[k] ??= new Buf(H, lift));
  const trees: XY[] = [];
  // chorraha: oʻq nuqtasi boshqa koʻcha oʻqiga yaqin (≤ uning yarim kengligi)
  const half = (s: ProjStreet) => s.parts.reduce((a, p) => a + p.w, 0) / 2;
  const nearOther = (p: XY, self: ProjStreet) => list.some(o => o !== self && lineDist(p, o.axis) <= half(o) + 0.5) || osm.some(r => !FOOT.test(r.cls) && lineDist(p, r.pts) <= r.w / 2 + sidewalkW(r.cls) + 0.5);
  const T = new Map<ProjStreet, { body: XY[]; road: XY[] }>(); for (const s of list) T.set(s, trimAtRoads(s.axis, osm));
  // qizil chiziqlar: koridorlar birlashmasining konturi — chorrahada kesishmaydi, uchlari OSM yoʻl chetida
  const red = corridorOutlines(list.map(s => ({ axis: T.get(s)!.body, half: half(s) })));
  for (const s of list) {
    const W = half(s) * 2, body = T.get(s)!.body, road = T.get(s)!.road;
    // asos: butun kenglik — trotuar rangida (boʻgʻinlarda doira)
    layer('trotuar', 0.08).ribbon(body, W / 2, false);
    let o = -W / 2;
    for (const p of s.parts) {
      const o0 = o, o1 = o + p.w; o = o1;
      if (p.k === 'trotuar') continue;
      const b = layer(p.k === 'ajratuvchi' ? 'yashil' : p.k, p.k === 'qatnov' ? 0.12 : 0.1);
      const ax = p.k === 'qatnov' || p.k === 'avtobus' || p.k === 'tramvay' ? road : body;
      for (let i = 1; i < ax.length; i++) b.band(ax[i - 1], ax[i], o0, o1);
      if (p.k === 'qatnov') for (let i = 0; i < road.length; i++) {
        const c = road[i], end = i === 0 || i === road.length - 1;
        // ichki boʻgʻinda asfalt yaxlit; chorrahada (boshqa koʻcha ustida) — butun kenglikda asfalt
        if (!end) {
          const mid = (o0 + o1) / 2, prev = road[i - 1], next = road[i + 1], dx = next[0] - prev[0], dy = next[1] - prev[1], Ln = Math.hypot(dx, dy) || 1;
          b.disc([c[0] - dy / Ln * mid, c[1] + dx / Ln * mid], p.w / 2 + 0.3);
        }
        // loyiha koʻchalari chorrahasi — butun kenglikda asfalt; OSM yoʻlga ulangan uchda doira kerak emas (asfalt u yerda bor)
        if (list.some(o => o !== s && lineDist(c, o.axis) <= half(o) + 0.5)) layer('qatnov', 0.12).disc(c, W / 2 - 0.5);
      }
      if ((p.k === 'yashil' && p.w >= 1.4) || (p.k === 'ajratuvchi' && p.w >= 3)) {
        const mid = (o0 + o1) / 2;
        for (let i = 1; i < body.length; i++) {
          const a = body[i - 1], c = body[i], dx = c[0] - a[0], dy = c[1] - a[1], Ls = Math.hypot(dx, dy); if (Ls < 4) continue;
          for (let t = 4; t < Ls - 3; t += 8) { const q: XY = [a[0] + dx / Ls * t - dy / Ls * mid, a[1] + dy / Ls * t + dx / Ls * mid]; if (!nearOther(q, s)) trees.push(q); }
        }
      }
      if (p.k === 'qatnov' && (p.lanes ?? 1) >= 2) {
        const lanes = p.lanes!, lw = p.w / lanes, mk = layer('chiziq', 0.14);
        for (let i = 1; i < road.length; i++) {
          const a = road[i - 1], c = road[i], dx = c[0] - a[0], dy = c[1] - a[1], Ls = Math.hypot(dx, dy); if (Ls < 4) continue;
          const ux = dx / Ls, uy = dy / Ls, P = (t: number): XY => [a[0] + ux * t, a[1] + uy * t];
          const t0 = nearOther(a, s) ? W / 2 + 4 : 0, t1 = Ls - (nearOther(c, s) ? W / 2 + 4 : 0);
          for (let k = 1; k < lanes; k++) { const off = o0 + k * lw; for (let t = t0; t < t1; t += 9) { const m = P(t + 1.5); if (nearOther([m[0] - uy * off, m[1] + ux * off], s)) continue; mk.band(P(t), P(Math.min(t1, t + 3)), off - 0.07, off + 0.07); } }
        }
      }
    }
  }
  const layers: Record<string, number[]> = {}; for (const k in L) layers[k] = L[k].p;
  return { layers, trees, red };
}
