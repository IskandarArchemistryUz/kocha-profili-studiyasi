/**
 * Kvartira ichki rejasi (31.10): kvartira konturi xonalarga boʻlinadi — prixojaya, umumiy xona (oshxona-mehmonxona), xoll,
 * yotoqlar, master-blok (yotoq + oʻz sanuzeli + garderob), hoʻl xonalar tasmasi. Qoidalar — loyiha hujjati
 * «kvartira-reja-qoidalari» (Strelka katalogi 21–28-boblar; SP 54.13330.2022 5.6, 5.11, 7.20; egasi qarorlari 30.10).
 *
 * Mahalliy koordinatalar: u — fasad boʻylab (0…W), v — fasaddan ichkariga (0 — derazalar, D — koridor devori, kirish eshigi).
 * Toʻgʻri toʻrtburchakka yaqin bitta fasadli kvartiralar uchun; boshqalari (burchak, L shakl) — null (eski sxema chiziladi).
 */
import { area, type XY } from './geo';
import type { RuleApt, FacadeMod } from './sectionplan';

export type InKind = 'umumiy' | 'xona' | 'oshxona' | 'yotoq' | 'master' | 'prixojaya' | 'xoll' | 'sanuzel' | 'vanna' | 'hx' | 'garderob' | 'kir';
export interface InRoom { ring: XY[]; kind: InKind; area: number; wet: boolean }
/** eshik: h — ilgak, a — yopiq tabaqa uchi (devor boʻylab), n — ochilish yoʻnalishi (birlik), w — eni; slide — surma */
export interface InDoor { kind: 'swing' | 'slide' | 'entry'; h: XY; a: XY; n: XY; w: number }
export interface AptInterior {
  rooms: InRoom[];
  /** ichki devor boʻlaklari (0,1 m) — uchlari yopiq burchak uchun uzaytirilgan */
  walls: [XY, XY][];
  doors: InDoor[];
  /** kirish eshigi oʻrtasi (koridor devorida) */
  entry: XY;
  /** oshxona qatori (umumiy xonada punktir) */
  kitchen?: [XY, XY];
  master: boolean;
}

export const IN_LABEL: Record<InKind, string> = { umumiy: 'oshxona-mehmonxona', xona: 'xona', oshxona: 'oshxona', yotoq: 'yotoqxona', master: 'master yotoq', prixojaya: 'prixojaya', xoll: 'xoll', sanuzel: 'sanuzel', vanna: 'vanna', hx: 'h/x', garderob: 'garderob', kir: 'kir yuvish' };
const WET: InKind[] = ['sanuzel', 'vanna', 'hx', 'kir'];
const T = 0.1;   // ichki devor qalinligi

type Cut = { k: 'door' | 'open' | 'slide'; s: number; w: number; side?: 1 | -1; hinge?: 0 | 1 };
interface Local { rooms: { r: [number, number, number, number]; kind: InKind }[]; walls: { a: XY; b: XY; cuts: Cut[] }[]; entry: [number, number]; kitchen?: [XY, XY]; master: boolean }

/** Kvartiraning fasad tizimi: U — fasad yoʻnalishi, N — ichkariga; O — (0,0) nuqta; W, D */
function frameOf(a: RuleApt, mods: FacadeMod[]): { O: XY; U: XY; N: XY; W: number; D: number; ring: XY[] } | null {
  const ms = a.mods.map(i => mods[i]).filter(Boolean);
  if (!ms.length) return null;
  // eng uzun bir yoʻnalishli fasad guruhi
  const groups: { U: XY; len: number; m: FacadeMod[] }[] = [];
  for (const m of ms) {
    const dx = m.b[0] - m.a[0], dy = m.b[1] - m.a[1], l = Math.hypot(dx, dy); if (l < 0.3) continue;
    const U: XY = [dx / l, dy / l], g = groups.find(q => q.U[0] * U[0] + q.U[1] * U[1] > 0.995);
    if (g) { g.len += l; g.m.push(m); } else groups.push({ U, len: l, m: [m] });
  }
  if (!groups.length) return null;
  // asosiy fasad: kirish eshigi qarshi tomonda (koridor devorida) boʻlgan eng uzun fasad guruhi; qolganlari — qoʻshimcha derazalar
  const c = a.ring.reduce((s, p) => [s[0] + p[0] / a.ring.length, s[1] + p[1] / a.ring.length], [0, 0] as XY);
  for (const g of groups.sort((p, q) => q.len - p.len)) {
    let N: XY = [-g.U[1], g.U[0]];
    const m0 = g.m[0];
    if ((c[0] - m0.a[0]) * N[0] + (c[1] - m0.a[1]) * N[1] < 0) N = [-N[0], -N[1]];
    const loc = (p: XY): XY => [(p[0] - m0.a[0]) * g.U[0] + (p[1] - m0.a[1]) * g.U[1], (p[0] - m0.a[0]) * N[0] + (p[1] - m0.a[1]) * N[1]];
    const L = a.ring.map(loc);
    const u0 = Math.min(...L.map(p => p[0])), u1 = Math.max(...L.map(p => p[0])), v0 = Math.min(...L.map(p => p[1])), v1 = Math.max(...L.map(p => p[1]));
    if (Math.abs(v0) > 0.35) continue;
    const W = u1 - u0, D = v1 - v0;
    if (area(a.ring) / (W * D) < 0.9) continue;
    const dv = loc(a.door)[1] - v0, du = loc(a.door)[0] - u0;
    if (dv < D - 0.45 || du < 0.4 || du > W - 0.4) continue;
    // eshik turgan qirra koridor devori boʻlishi kerak (fasadga parallel)
    const onPar = a.ring.some((p, i) => { const q = a.ring[(i + 1) % a.ring.length], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy); if (l < 0.5) return false; const t = ((a.door[0] - p[0]) * dx + (a.door[1] - p[1]) * dy) / (l * l), d = Math.hypot(p[0] + dx * t - a.door[0], p[1] + dy * t - a.door[1]); return t > -0.01 && t < 1.01 && d < 0.08 && Math.abs((dx * g.U[0] + dy * g.U[1]) / l) > 0.9; });
    if (!onPar) continue;
    const O: XY = [m0.a[0] + g.U[0] * u0 + N[0] * v0, m0.a[1] + g.U[1] * u0 + N[1] * v0];
    return { O, U: g.U, N, W, D, ring: a.ring };
  }
  return null;
}

/** fasad modullari chegaralari va derazalar (mahalliy u) */
function facadeOf(a: RuleApt, mods: FacadeMod[], O: XY, U: XY, W: number): { bounds: number[]; wins: [number, number][] } {
  const lu = (p: XY) => (p[0] - O[0]) * U[0] + (p[1] - O[1]) * U[1];
  const bounds = new Set<number>([0, W]), wins: [number, number][] = [];
  for (const i of a.mods) {
    const m = mods[i]; if (!m) continue;
    const x0 = lu(m.a), x1 = lu(m.b), lo = Math.min(x0, x1), hi = Math.max(x0, x1);
    if (lo > -0.2 && lo < W + 0.2) bounds.add(Math.max(0, Math.min(W, Math.round(lo * 100) / 100)));
    if (hi > -0.2 && hi < W + 0.2) bounds.add(Math.max(0, Math.min(W, Math.round(hi * 100) / 100)));
    if (m.blind) continue;
    // modul kvartiradan chiqib ketsa (qoʻshni bilan boʻlingan) — deraza kvartira ichidagi qismida, ≥ 0,6 m boʻlsa
    const c0 = (lo + hi) / 2, hw0 = Math.min(1.6, (hi - lo) * 0.5) / 2, a0 = Math.max(0, c0 - hw0), b0 = Math.min(W, c0 + hw0);
    if (b0 - a0 >= 0.6) wins.push([a0, b0]);
    else { const p0 = Math.max(0, lo), p1 = Math.min(W, hi); if (p1 - p0 >= 1.2) { const c = (p0 + p1) / 2, hw = Math.min(1.6, (p1 - p0) * 0.5) / 2; wins.push([c - hw, c + hw]); } }
  }
  return { bounds: [...bounds].sort((p, q) => p - q), wins };
}

/** Devor u nuqtada derazani kesmasin (±0,15 m) */
const freeAt = (u: number, wins: [number, number][]) => wins.every(([a, b]) => u < a - 0.15 || u > b + 0.15);
/** Oraliq [a, b] da deraza bormi */
const hasWin = (a: number, b: number, wins: [number, number][]) => wins.some(([p, q]) => (p + q) / 2 > a + 0.2 && (p + q) / 2 < b - 0.2);

/** Kesish nuqtasini tanlash: modul chegarasi (± tol) yoki derazasiz eng yaqin joy */
function pickCut(target: number, lo: number, hi: number, bounds: number[], wins: [number, number][]): number | null {
  const cand = bounds.filter(b => b >= lo && b <= hi).sort((p, q) => Math.abs(p - target) - Math.abs(q - target));
  if (cand.length && Math.abs(cand[0] - target) <= 0.9) return cand[0];
  for (let d = 0; d <= 1.6; d += 0.05) for (const s of [1, -1]) { const u = Math.round((target + s * d) * 100) / 100; if (u >= lo && u <= hi && freeAt(u, wins)) return u; }
  return cand.length ? cand[0] : null;
}

/** Xonalar dasturi mahalliy koordinatalarda (umumiy xona chapda, u = 0 tomonda) */
function layoutLocal(W: number, D: number, k: number, net: number, bounds: number[], wins: [number, number][], studio = false): Local | string {
  const s0 = D <= 5.6 ? 2.0 : D <= 6.4 ? 2.2 : D <= 7.2 ? 2.4 : D <= 9 ? 2.6 : 2.8;
  const L: Local = { rooms: [], walls: [], entry: [0, D], master: false };
  const room = (u0: number, v0: number, u1: number, v1: number, kind: InKind) => L.rooms.push({ r: [u0, v0, u1, v1], kind });
  const wall = (u0: number, v0: number, u1: number, v1: number, cuts: Cut[] = []) => L.walls.push({ a: [u0, v0], b: [u1, v1], cuts });
  // studiya: tor yoki kichik 1 xonali
  if (k <= 1 && (W < 5.2 || net < 30 || studio)) {
    if (W < 3.0) return 'tor';
    const s = s0, f = D - s, ws = Math.min(2.0, W - 1.5);
    if (ws < 1.5) return 'tor';
    room(0, 0, W, f, 'xona'); room(0, f, ws, D, 'sanuzel'); room(ws, f, W, D, 'prixojaya');
    wall(0, f, ws, f); wall(ws, f, W, f, [{ k: 'open', s: 0.15, w: W - ws - 0.3 }]);
    wall(ws, f, ws, D, [{ k: 'door', s: 0.2, w: 0.7, side: -1, hinge: 0 }]);
    L.entry = [ws + (W - ws) / 2, D];
    L.kitchen = [[0.15, f - 0.65], [Math.min(W - 0.15, ws + 0.6), f - 0.65]];   // oshxona qatori sanuzel devori boʻylab (hoʻl zona yonida)
    return L;
  }
  const bed = Math.max(1, k - 1);
  const master = k >= 4 || (k === 3 && net >= 62) || (k === 2 && net >= 52);
  const needHall = k >= 3;
  const s = needHall ? Math.max(s0, D < 6 ? 2.3 : 2.5) : s0, f = D - s;
  if (f < 2.8) return 'sayoz';
  // umumiy xona eni: maqsad maydon / chuqurlik (Strelka 28-bob: 70–100 m² da 23–28 m²)
  const aK = k <= 1 ? 17 : k === 2 ? 22 : k === 3 ? 25 : 27;
  const wMinBed = k <= 1 ? 2.3 : 2.6;
  // yotoqlar ≤ 4,4 m (master ≤ 4,8): ortiqcha en umumiy xonaga
  const wantK = Math.max(3.0, Math.min(5.2, Math.max(aK / D, W - bed * 4.4 - (master ? 0.4 : 0))));
  // 1 xonali: oshxona uyasi ~ 9–11 m² (ostida prixojaya + sanuzel ≥ 3,0 m), qolgani — xona
  const wKit = k <= 1 ? Math.max(3.0, Math.min(3.6, 10 / f)) : 0;
  const loK = 2.9, hiK = k <= 1 ? W - 3.0 : Math.min(5.4, W - bed * wMinBed);
  if (hiK < loK) return 'tor';
  const wK = pickCut(k <= 1 ? Math.max(loK, Math.min(hiK, W - wKit)) : Math.min(wantK, hiK), loK, hiK, bounds, wins);
  if (wK === null || !hasWin(0, wK, wins)) return 'deraza';
  // yotoq (yoki oshxona) uyalari
  const cuts: number[] = [wK];
  const R = W - wK;
  // master uyasi ≥ 4,0 m (ostida xoll uchi 1,05 + garderob ≥ 1,1 + sanuzel ≥ 1,8), qolgan yotoqlar ≥ 2,7 m
  const mW = master && bed >= 2 ? Math.min(R - (bed - 1) * 2.7, Math.max(R / bed + 0.5, 4.0)) : R / bed;
  for (let i = 1; i < bed; i++) {
    const base = master && bed >= 2 ? (R - mW) / (bed - 1) : R / bed, prev = cuts[cuts.length - 1], target = prev + base;
    const c = pickCut(target, prev + wMinBed, W - (bed - i) * wMinBed - (master && i === bed - 1 ? Math.max(0, mW - wMinBed) : 0), bounds, wins);
    if (c === null) return 'tor';
    cuts.push(c);
  }
  cuts.push(W);
  for (let i = 0; i + 1 < cuts.length; i++) if (cuts[i + 1] - cuts[i] < wMinBed - 0.05 || !hasWin(cuts[i], cuts[i + 1], wins)) return 'deraza';
  // umumiy xona — butun chuqurlik
  room(0, 0, wK, D, k <= 1 ? 'xona' : 'umumiy');
  if (k >= 2) { const kv = D - Math.min(2.4, D * 0.33); L.kitchen = [[0.15, kv], [wK - 0.15, kv]]; }
  // prixojaya
  const wp = needHall ? 1.8 : k <= 1 ? Math.min(2.0, Math.max(1.5, W - wK - 1.4)) : 2.0;
  const p0 = wK, p1 = wK + wp;
  if (p1 > W - 1.2 + 1e-6) return 'tor';
  room(p0, f, p1, D, 'prixojaya');
  L.entry = [p0 + wp / 2 + 0.1, D];
  // umumiy xonaga ochiq oʻtish (k = 1 — eshik)
  wall(wK, 0, wK, D, k <= 1 ? [{ k: 'door', s: f + 0.25, w: 0.8, side: 1, hinge: 1 }] : [{ k: 'open', s: f + 0.15, w: s - 0.3 }]);
  // uyalar (yotoqlar / oshxona)
  const slotKind = (i: number): InKind => k <= 1 ? 'oshxona' : master && i === bed - 1 ? 'master' : 'yotoq';
  for (let i = 0; i < bed; i++) { room(cuts[i], 0, cuts[i + 1], f, slotKind(i)); if (i > 0) wall(cuts[i], 0, cuts[i], f); }
  const doorsF: Cut[] = [];   // v = f devoridagi eshiklar (u boʻylab, s — wK dan emas, 0 dan)
  if (!needHall) {
    // 1 uya: prixojayadan kiriladi; tasma: prixojaya | sanuzel (| garderob)
    doorsF.push({ k: 'door', s: p0 + 0.15, w: 0.8, side: -1, hinge: 0 });
    if (master && W - p1 >= 3.0) {
      L.master = true;
      const g0 = W - Math.min(1.5, (W - p1) * 0.42);
      room(p1, f, g0, D, 'sanuzel'); room(g0, f, W, D, 'garderob');
      wall(p1, f, p1, D); wall(g0, f, g0, D);
      doorsF.push({ k: 'door', s: p1 + 0.15, w: 0.7, side: -1, hinge: 0 }, { k: 'door', s: W - 0.85, w: 0.7, side: 1, hinge: 1 });
    } else {
      room(p1, f, W, D, 'sanuzel');
      wall(p1, f, p1, D, [{ k: 'door', s: 0.2, w: 0.7, side: 1, hinge: 0 }]);
    }
    wall(wK, f, W, f, doorsF.map(c => ({ ...c, s: c.s - wK })));
    return L;
  }
  // xoll + hoʻl xonalar tasmasi; master — oxirgi uya, tasmasi ostida garderob va sanuzel
  const hd = s < 2.5 ? 1.1 : 1.2, fh = f + hd;
  let hallEnd = W;
  if (master) {
    // xoll master eshigigacha; garderob ≤ 1,5 + sanuzel ≤ 2,7 m — ortigʻi xollga (sanuzel haddan katta boʻlmasin)
    const um0 = cuts[bed - 1], he = Math.max(um0 + 1.05, W - 4.2);
    if (W - he >= 2.9) {
      L.master = true; hallEnd = he;
      const gw = Math.min(1.5, (W - he) - 1.8), g1 = he + gw;
      room(he, f, g1, D, 'garderob'); room(g1, f, W, D, 'sanuzel');
      wall(he, f, he, D); wall(g1, f, g1, D);
      doorsF.push({ k: 'door', s: he + 0.1, w: Math.min(0.7, gw - 0.2), side: 1, hinge: 0 }, { k: 'door', s: W - 0.85, w: 0.7, side: -1, hinge: 1 });
    } else if (W - he >= 1.7) {
      // tor master: faqat oʻz sanuzeli (garderob — yotoq ichidagi shkaf)
      L.master = true; hallEnd = he;
      room(he, f, W, D, 'sanuzel'); wall(he, f, he, D);
      doorsF.push({ k: 'door', s: W - 0.85, w: 0.7, side: -1, hinge: 1 });
    } else { const i = L.rooms.findIndex(q => q.kind === 'master'); if (i >= 0) L.rooms[i].kind = 'yotoq'; }
  }
  room(p1, f, hallEnd, fh, 'xoll');
  wall(p1, f, p1, D, [{ k: 'open', s: 0.05, w: hd - 0.1 }]);
  // yotoq eshiklari — har uyaning chap burchagida (xoll yoki prixojayadan)
  for (let i = 0; i < bed; i++) {
    const u0 = cuts[i], u1 = cuts[i + 1];
    const s1 = Math.max(u0 + 0.12, Math.min(u1 - 0.92, i === 0 ? p0 + 0.15 : u0 + 0.12));
    if (s1 + 0.8 > hallEnd + 0.01 && !(i === 0)) return 'xoll';
    doorsF.push({ k: 'door', s: s1, w: 0.8, side: -1, hinge: 0 });
  }
  // hoʻl xonalar: vanna, h/x, kir yuvish — xoll ostida
  const Lw = hallEnd - p1, wetCuts: Cut[] = [];
  const parts: [number, InKind][] = Lw >= 4.4 ? [[2.0, 'vanna'], [1.2, 'hx'], [Lw - 3.2, 'kir']] : Lw >= 3.2 ? [[Lw - 1.2, 'vanna'], [1.2, 'hx']] : [[Lw, 'sanuzel']];
  let u = p1;
  parts.forEach(([w, kind], i) => {
    const u1 = i === parts.length - 1 ? hallEnd : u + w;
    room(u, fh, u1, D, kind);
    if (u > p1) wall(u, fh, u, D);
    const dw = Math.min(kind === 'hx' ? 0.6 : 0.7, u1 - u - 0.25);
    wetCuts.push({ k: 'door', s: u - p1 + 0.12, w: dw, side: -1, hinge: 0 });
    u = u1;
  });
  wall(p1, fh, hallEnd, fh, wetCuts);
  if (hallEnd < W) wall(hallEnd, f, hallEnd, D);
  wall(wK, f, W, f, doorsF.map(c => ({ ...c, s: c.s - wK })));
  return L;
}

/** Devorlarni kesib boʻlaklarga ajratish va eshiklarni yaratish (mahalliy) */
function build(L: Local): { walls: [XY, XY][]; doors: InDoor[] } {
  const walls: [XY, XY][] = [], doors: InDoor[] = [];
  for (const wl of L.walls) {
    const dx = wl.b[0] - wl.a[0], dy = wl.b[1] - wl.a[1], len = Math.hypot(dx, dy); if (len < 1e-6) continue;
    const ux = dx / len, uy = dy / len, nx = -uy, ny = ux, P = (d: number): XY => [wl.a[0] + ux * d, wl.a[1] + uy * d];
    let pos = 0;
    const piece = (d0: number, d1: number, e0: boolean, e1: boolean) => { if (d1 - d0 < 1e-3) return; walls.push([P(d0 - (e0 ? T / 2 : 0)), P(d1 + (e1 ? T / 2 : 0))]); };
    for (const c of [...wl.cuts].sort((p, q) => p.s - q.s)) {
      piece(pos, c.s, pos === 0, false);
      if (c.k === 'door' || c.k === 'slide') {
        const hinge = c.hinge ?? 0, side = c.side ?? 1, h = P(hinge === 0 ? c.s : c.s + c.w), a = P(hinge === 0 ? c.s + c.w : c.s);
        doors.push({ kind: c.k === 'slide' ? 'slide' : 'swing', h, a, n: [nx * side, ny * side], w: c.w });
      }
      pos = c.s + c.w;
    }
    piece(pos, len, pos === 0, true);
  }
  return { walls, doors };
}

/** Eshik yoylari toʻqnashuvi: boshqa yoyga yoki devorga (V10d dagi tekshiruv) — toʻqnashgan hoʻl xona eshigi surmaga aylanadi */
export function doorClashes(doors: InDoor[], walls: [XY, XY][], ring?: XY[]): number[] {
  const pts = (d: InDoor) => { const out: XY[] = []; const u: XY = [(d.a[0] - d.h[0]) / d.w, (d.a[1] - d.h[1]) / d.w]; for (let i = 1; i < 9; i++) for (let j = 1; j < 9; j++) { const r = d.w * i / 9, th = Math.PI / 2 * j / 9.5; out.push([d.h[0] + r * (Math.cos(th) * u[0] + Math.sin(th) * d.n[0]), d.h[1] + r * (Math.cos(th) * u[1] + Math.sin(th) * d.n[1])]); } return out.filter(p => (p[0] - d.h[0]) * d.n[0] + (p[1] - d.h[1]) * d.n[1] > 0.08); };
  const inside = (p: XY, d: InDoor) => { const vx = p[0] - d.h[0], vy = p[1] - d.h[1], u: XY = [(d.a[0] - d.h[0]) / d.w, (d.a[1] - d.h[1]) / d.w], a = vx * u[0] + vy * u[1], b = vx * d.n[0] + vy * d.n[1]; return a > 0.02 && b > 0.02 && a * a + b * b < d.w * d.w; };
  const segs: [XY, XY, number][] = walls.map(([a, b]) => [a, b, T]);
  if (ring) for (let i = 0; i < ring.length; i++) segs.push([ring[i], ring[(i + 1) % ring.length], 0.1]);
  const inWall = (p: XY) => segs.some(([a, b, t]) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, vx = p[0] - a[0], vy = p[1] - a[1], s = (vx * dx + vy * dy) / L, q = (-vx * dy + vy * dx) / L; return s > 0.001 && s < L - 0.001 && Math.abs(q) < t / 2 - 0.001; });
  const bad = new Set<number>();
  doors.forEach((d, i) => {
    if (d.kind === 'slide') return;
    const P = pts(d);
    if (d.kind === 'swing' && P.some(inWall)) bad.add(i);
    doors.forEach((e, j) => { if (j > i && e.kind !== 'slide' && P.some(p => inside(p, e))) { bad.add(i); bad.add(j); } });
  });
  return [...bad];
}

/** oxirgi rad etish sababi (testlar va tahlil uchun) */
export let lastWhy = '';
/** Kvartira ichki rejasi; mos kelmasa (burchak, L shakl, juda tor) — null */
export function aptInterior(a: RuleApt, mods: FacadeMod[]): AptInterior | null {
  lastWhy = 'frame'; const fr = frameOf(a, mods); if (!fr) return null;
  const { O, U, N, W, D } = fr;
  lastWhy = `WD ${W.toFixed(1)}x${D.toFixed(1)}`; if (D < 5.2 || D > 11.5 || W < 3) return null;
  const { bounds, wins } = facadeOf(a, mods, O, U, W);
  const lv = (p: XY) => (p[0] - O[0]) * N[0] + (p[1] - O[1]) * N[1], lu = (p: XY) => (p[0] - O[0]) * U[0] + (p[1] - O[1]) * U[1];
  // kirish eshigi koridor devorida boʻlishi kerak
  lastWhy = `door v ${lv(a.door).toFixed(1)}/${D.toFixed(1)}`; if (lv(a.door) < D - 0.45) return null;
  const net = a.area * 0.85, k = Math.max(1, Math.min(4, a.rooms || 1));
  // ikki yoʻnalish: umumiy xona chapda yoki oʻngda — kirish eshigi (generator joyi) ga yaqinroq prixojayali variant
  const flipB = (b: number[]) => b.map(x => Math.round((W - x) * 100) / 100).sort((p, q) => p - q), flipW = (w: [number, number][]) => w.map(([p, q]) => [W - q, W - p] as [number, number]);
  let opts = [false, true].map(fl => ({ fl, L: layoutLocal(W, D, k, net, fl ? flipB(bounds) : bounds, fl ? flipW(wins) : wins) }));
  // 1 xonali: oshxona alohida sigʻmasa — studiya (xona + oshxona qatori, tasmada sanuzel va prixojaya)
  if (k <= 1 && opts.every(o => typeof o.L === 'string')) opts = [false, true].map(fl => ({ fl, L: layoutLocal(W, D, k, net, fl ? flipB(bounds) : bounds, fl ? flipW(wins) : wins, true) }));
  const ok = opts.filter(o => typeof o.L !== 'string') as { fl: boolean; L: Local }[];
  lastWhy = opts.map(o => typeof o.L === 'string' ? o.L : 'ok').join('|') + ` W${W.toFixed(1)} D${D.toFixed(1)} k${k}`; if (!ok.length) return null;
  const ud = lu(a.door);
  ok.sort((p, q) => Math.abs((p.fl ? W - p.L.entry[0] : p.L.entry[0]) - ud) - Math.abs((q.fl ? W - q.L.entry[0] : q.L.entry[0]) - ud));
  const { fl, L } = ok[0];
  const toW = (p: XY): XY => { const u = fl ? W - p[0] : p[0]; return [O[0] + U[0] * u + N[0] * p[1], O[1] + U[1] * u + N[1] * p[1]]; };
  const dirW = (n: XY): XY => { const u = fl ? -n[0] : n[0]; return [U[0] * u + N[0] * n[1], U[1] * u + N[1] * n[1]]; };
  const b = build(L);
  const walls = b.walls.map(([p, q]) => [toW(p), toW(q)] as [XY, XY]);
  const doors: InDoor[] = b.doors.map(d => ({ ...d, h: toW(d.h), a: toW(d.a), n: dirW(d.n) }));
  // toʻqnashgan eshiklar: hoʻl xona / garderob eshigi — surma
  for (const i of doorClashes(doors, walls, a.ring)) doors[i] = { ...doors[i], kind: 'slide' };
  const rooms: InRoom[] = L.rooms.map(q => { const [u0, v0, u1, v1] = q.r, ring = [toW([u0, v0]), toW([u1, v0]), toW([u1, v1]), toW([u0, v1])]; return { ring, kind: q.kind, area: Math.max(0, (u1 - u0 - T) * (v1 - v0 - T)), wet: WET.includes(q.kind) }; });
  const ent = toW(L.entry);
  return { rooms, walls, doors, entry: ent, kitchen: L.kitchen ? [toW(L.kitchen[0]), toW(L.kitchen[1])] : undefined, master: L.master };
}
