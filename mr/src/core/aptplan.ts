/**
 * Kvartira ichki rejasi (31.10): kvartira konturi xonalarga boʻlinadi — prixojaya, umumiy xona (oshxona-mehmonxona), xoll,
 * yotoqlar, master-blok (yotoq + oʻz sanuzeli + garderob), hoʻl xonalar tasmasi. Qoidalar — loyiha hujjati
 * «kvartira-reja-qoidalari» (Strelka katalogi 21–28-boblar; SP 54.13330.2022 5.6, 5.11, 7.20; egasi qarorlari 30.10).
 *
 * Mahalliy koordinatalar: u — fasad boʻylab (0…W), v — fasaddan ichkariga (0 — derazalar, D — koridor devori, kirish eshigi).
 * Shablonlar: bitta fasadli toʻrtburchak; orqa burchagi kemtik (L shakl, zina / koridor burchagi); eshik umumiy xonadan
 * uzoqda (dahliz eshik yonida, yoʻlak orqali); yon devordan kiriladigan 1 xonali; ikki fasadli (skvoznoy).
 * Kirish eshigi doim koridor bilan umumiy kesmada (doorLen), ichki eshiklar qoʻshni devordan ≥ 0,15 m (DOOR_GAP).
 * Mos kelmasa — null (eski sxema chiziladi): masalan, eshigi kemtik qirrasidagi katta burchak kvartirasi.
 */
import { area, type XY } from './geo';
import type { RuleApt, FacadeMod, InnerOv } from './sectionplan';

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

export const IN_LABEL: Record<InKind, string> = { umumiy: 'oshxona-mehmonxona', xona: 'xona', oshxona: 'oshxona', yotoq: 'yotoqxona', master: 'asosiy yotoqxona', prixojaya: 'dahliz', xoll: 'yoʻlak', sanuzel: 'sanitariya xonasi', vanna: 'vannaxona', hx: 'h/x', garderob: 'kiyimxona', kir: 'kir yuvish xonasi' };
const WET: InKind[] = ['sanuzel', 'vanna', 'hx', 'kir'];
const T = 0.1;   // ichki devor qalinligi

type Cut = { k: 'door' | 'open' | 'slide'; s: number; w: number; side?: 1 | -1; hinge?: 0 | 1 };
/** orqa burchakdagi kemtik (zina / koridor burchagi): u boʻyicha [W − w, W] (R) yoki [0, w] (L), v boʻyicha [Dn, D] */
export interface Notch { side: 'L' | 'R'; w: number; Dn: number }
interface Local { rooms: { r: [number, number, number, number]; kind: InKind; poly?: XY[] }[]; walls: { a: XY; b: XY; cuts: Cut[] }[]; entry: [number, number]; kitchen?: [XY, XY]; master: boolean }

/** Kvartiraning fasad tizimi: U — fasad yoʻnalishi, N — ichkariga; O — (0,0) nuqta; W, D */
function frameOf(a: RuleApt, mods: FacadeMod[]): { O: XY; U: XY; N: XY; W: number; D: number; ring: XY[]; notch?: Notch } | null {
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
    const dv = loc(a.door)[1] - v0, du = loc(a.door)[0] - u0;
    let notch: Notch | undefined;
    if (area(a.ring) / (W * D) < 0.985) {
      // L shakl (burchak): orqa burchakda bitta toʻgʻri burchakli kemtik — zina yoki koridor burchagi
      notch = notchOf(L.map(p => [p[0] - u0, p[1] - v0] as XY), W, D, area(a.ring)) ?? undefined;
      if (!notch) continue;
    }
    if (notch) {
      const nu0 = notch.side === 'R' ? W - notch.w : 0, nu1 = notch.side === 'R' ? W : notch.w;
      if (du > nu0 - 0.4 && du < nu1 + 0.4) continue;   // eshik kemtik qirrasida — bu shablon emas
    }
    if (dv < D - 0.45 || du < 0.4 || du > W - 0.4) continue;
    // eshik turgan qirra koridor devori boʻlishi kerak (fasadga parallel)
    const onPar = a.ring.some((p, i) => { const q = a.ring[(i + 1) % a.ring.length], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy); if (l < 0.5) return false; const t = ((a.door[0] - p[0]) * dx + (a.door[1] - p[1]) * dy) / (l * l), d = Math.hypot(p[0] + dx * t - a.door[0], p[1] + dy * t - a.door[1]); return t > -0.01 && t < 1.01 && d < 0.08 && Math.abs((dx * g.U[0] + dy * g.U[1]) / l) > 0.9; });
    if (!onPar) continue;
    const O: XY = [m0.a[0] + g.U[0] * u0 + N[0] * v0, m0.a[1] + g.U[1] * u0 + N[1] * v0];
    return { O, U: g.U, N, W, D, ring: a.ring, notch };
  }
  return null;
}

/** nuqta koʻpburchak ichidami */
const inPoly = (p: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi || 1e-12) + xi) c = !c; } return c; };
/** Orqa burchakdagi kemtik: mahalliy kontur (0…W × 0…D), fasad v = 0 da. Faqat bitta burchak, chuqurligi ≥ 1,2 m, old qism ≥ 3,0 m */
function notchOf(R: XY[], W: number, D: number, A: number): Notch | null {
  const e = 0.06, inR = inPoly([W - e, D - e], R), inL = inPoly([e, D - e], R);
  if (inR === inL || !inPoly([W / 2, e], R)) return null;
  const side: 'L' | 'R' = inR ? 'L' : 'R';
  const midV = R.map(p => p[1]).filter(v => v > 0.2 && v < D - 0.2), midU = R.map(p => p[0]).filter(u => u > 0.2 && u < W - 0.2);
  if (!midV.length || !midU.length) return null;
  const Dn = Math.min(...midV), cu = side === 'R' ? Math.min(...midU) : Math.max(...midU), w = side === 'R' ? W - cu : cu;
  if (Math.abs(W * D - w * (D - Dn) - A) > 0.6 || Dn < 3.0 || D - Dn < 1.2 || w < 0.8 || w > W * 0.6) return null;
  return { side, w: Math.round(w * 100) / 100, Dn: Math.round(Dn * 100) / 100 };
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
function layoutLocal(W: number, D: number, k: number, net: number, bounds: number[], wins: [number, number][], studio = false, ov: InnerOv = {}, nt?: Notch, cr?: [number, number]): Local | string {
  const L0 = layoutCore(W, D, k, net, bounds, wins, studio, ov, nt, cr);
  return typeof L0 === 'string' || !nt ? L0 : cutNotch(L0, W, nt);
}

function layoutCore(W: number, D: number, k: number, net: number, bounds: number[], wins: [number, number][], studio: boolean, ov: InnerOv, nt?: Notch, cr?: [number, number]): Local | string {
  // cr — kirish eshigi markazi turishi mumkin boʻlgan oraliq (koridor bilan umumiy kesma, chetlaridan 0,6 m ichkarida)
  const s0 = D <= 5.6 ? 2.0 : D <= 6.4 ? 2.2 : D <= 7.2 ? 2.4 : D <= 9 ? 2.6 : 2.8;
  const L: Local = { rooms: [], walls: [], entry: [0, D], master: false };
  const room = (u0: number, v0: number, u1: number, v1: number, kind: InKind) => L.rooms.push({ r: [u0, v0, u1, v1], kind });
  const wall = (u0: number, v0: number, u1: number, v1: number, cuts: Cut[] = []) => L.walls.push({ a: [u0, v0], b: [u1, v1], cuts });
  // studiya: tor yoki kichik 1 xonali
  // kemtik: oʻng (R) — xizmat tasmasi We gacha; chap (L) — umumiy xona kemtiladi
  const We = nt?.side === 'R' ? W - nt.w : W;
  if (k <= 1 && (W < 5.2 || net < 30 || studio)) {
    if (W < 3.0 || nt?.side === 'L') return nt ? 'kemtik' : 'tor';
    const s = s0, f = D - s;
    let ws = Math.min(2.0, We - 1.5);
    if (cr) { const e = ws + Math.min(2.0, We - ws) / 2; if (e < cr[0] || e > cr[1]) ws = Math.round(((cr[0] + cr[1]) / 2 - Math.min(2.0, We - ws) / 2) * 100) / 100; }
    if (ws < 1.5) return 'tor';
    if (nt && nt.Dn > f + 0.05) return 'kemtik';
    // Strelka (studiya): kirish tasmada — bir tomonda sanuzel, ikkinchisida garderob; prixojaya ≤ 2,0 m (kemtik boʻlsa tasma We gacha)
    const wpS = Math.min(2.0, We - ws), g0 = ws + wpS, hasG = We - g0 >= 0.9;
    room(0, 0, W, f, 'xona'); room(0, f, ws, D, 'sanuzel'); room(ws, f, hasG ? g0 : We, D, 'prixojaya');
    if (hasG) { room(g0, f, We, D, 'garderob'); wall(g0, f, g0, D, [{ k: 'open', s: 0.15, w: Math.min(0.9, s - 0.3) }]); }
    wall(0, f, ws, f); wall(ws, f, hasG ? g0 : We, f, [{ k: 'open', s: 0.15, w: (hasG ? g0 : We) - ws - 0.3 }]); if (hasG) wall(g0, f, We, f);
    wall(ws, f, ws, D, [{ k: 'door', s: 0.2, w: 0.7, side: -1, hinge: 0 }]);
    L.entry = [ws + wpS / 2, D];
    if (cr && (L.entry[0] < cr[0] || L.entry[0] > cr[1] || ws < 1.5)) return 'eshik';
    L.kitchen = [[0.15, f - 0.65], [Math.min(W - 0.15, ws + 0.6), f - 0.65]];   // oshxona qatori sanuzel devori boʻylab (hoʻl zona yonida)
    return L;
  }
  const bed = Math.max(1, k - 1);
  const master = k >= 2 && (ov.master ?? (k >= 4 || (k === 3 && net >= 62) || (k === 2 && net >= 52)));
  const needHall = k >= 3;
  const s = needHall ? Math.max(s0, D < 6 ? 2.3 : 2.5) : s0, f = D - s;
  if (f < 2.8) return 'sayoz';
  // umumiy xona eni: maqsad maydon / chuqurlik (Strelka 28-bob: 70–100 m² da 23–28 m²)
  // umumiy xona maqsadi; chap kemtik uning maydonidan yeydi — oʻrnini toʻldirish uchun kengroq
  const aK = (k <= 1 ? 17 : k === 2 ? 22 : k === 3 ? 25 : 27) + (nt?.side === 'L' ? nt.w * (D - nt.Dn) : 0);
  const wMinBed = k <= 1 ? 2.3 : 2.6;
  // yotoqlar ≤ 4,4 m (master ≤ 4,8): ortiqcha en umumiy xonaga
  // yotoq ≤ 4,4 m va ≤ 17 m² (bolalar 10–14, Strelka): ortiqcha en umumiy xonaga
  const bwMax = Math.min(4.4, 17 / f);
  const mwMax = Math.max(4.0, Math.min(4.8, 19 / f));   // asosiy yotoqxona 14–19 m² (Strelka)
  const wantK = Math.max(3.0, Math.min(nt?.side === 'L' ? 6.4 : 5.2, (aK + 6) / D, Math.max(aK / D, W - (master && bed >= 2 ? (bed - 1) * bwMax + mwMax : bed * bwMax))));
  // 1 xonali: oshxona uyasi ~ 9–11 m² (ostida prixojaya + sanuzel ≥ 3,0 m), qolgani — xona
  const wKit = k <= 1 ? Math.max(3.0, Math.min(3.6, 10 / f)) : 0;
  const loK = 2.9, hiK = k <= 1 ? W - 3.0 : Math.min(nt?.side === 'L' ? 6.6 : 5.4, W - bed * wMinBed);
  if (hiK < loK) return 'tor';
  const wK0 = pickCut(k <= 1 ? Math.max(loK, Math.min(hiK, W - wKit)) : Math.min(wantK, hiK), loK, hiK, bounds, wins);
  if (wK0 === null || !hasWin(0, wK0, wins)) return 'deraza';
  // V2: umumiy xona devori qoʻlda siljitilgan (derazani kesmasa va chegaralar ichida boʻlsa)
  const wK1 = ov.dK ? Math.round((wK0 + ov.dK) * 100) / 100 : wK0;
  let wK = wK1 !== wK0 && wK1 >= loK && wK1 <= hiK && freeAt(wK1, wins) && hasWin(0, wK1, wins) ? wK1 : wK0;
  const wpOf = (x: number) => needHall ? 1.8 : k <= 1 ? Math.min(2.0, Math.max(1.5, W - x - 1.4)) : 2.0;
  // kirish eshigi koridor bilan umumiy kesmada boʻlishi shart (qoʻshni kvartira yoki zina devoriga koʻchmasin)
  const eOf = (x: number) => x + wpOf(x) / 2 + 0.1, inC = (e: number) => !cr || (e >= cr[0] && e <= cr[1]);
  if (cr && !inC(eOf(wK))) {
    const t = (cr[0] + cr[1]) / 2, c = [t - wpOf(t) / 2 - 0.1, cr[0] - wpOf(cr[0]) / 2 - 0.1, cr[1] - wpOf(cr[1]) / 2 - 0.1].map(x => Math.round(x * 100) / 100).find(x => x >= loK && x <= hiK && freeAt(x, wins) && hasWin(0, x, wins) && inC(eOf(x)));
    if (c == null) return 'eshik';
    wK = c;
  }
  // yotoq (yoki oshxona) uyalari
  const cuts: number[] = [wK];
  const R = W - wK;
  // master uyasi ≥ 4,0 m (ostida xoll uchi 1,05 + garderob ≥ 1,1 + sanuzel ≥ 1,8), qolgan yotoqlar ≥ 2,7 m
  const mW = master && bed >= 2 ? Math.min(R - (bed - 1) * 2.7, mwMax, Math.max(R / bed + 0.5, 4.0)) : R / bed;
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
  if (p1 > We - 1.2 + 1e-6) return 'tor';
  if (nt?.side === 'R' && nt.Dn > f + 0.05) return 'kemtik';
  if (nt?.side === 'L' && nt.w > wK - 1.0) return 'kemtik';
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
    if (master && We - p1 >= 3.0) {
      L.master = true;
      const g0 = We - Math.min(1.5, (We - p1) * 0.42);
      room(p1, f, g0, D, 'sanuzel'); room(g0, f, We, D, 'garderob');
      wall(p1, f, p1, D); wall(g0, f, g0, D);
      doorsF.push({ k: 'door', s: p1 + 0.15, w: 0.7, side: -1, hinge: 0 }, { k: 'door', s: We - 0.85, w: 0.7, side: 1, hinge: 1 });
    } else {
      room(p1, f, We, D, 'sanuzel');
      wall(p1, f, p1, D, [{ k: 'door', s: 0.2, w: 0.7, side: 1, hinge: 0 }]);
    }
    if (doorsF.some(c => c.s + c.w > We - 0.1)) return 'kemtik';
    wall(wK, f, We, f, doorsF.map(c => ({ ...c, s: c.s - wK })));
    return L;
  }
  // xoll + hoʻl xonalar tasmasi; master — oxirgi uya, tasmasi ostida garderob va sanuzel
  const hd = s < 2.5 ? 1.1 : 1.2, fh = f + hd;
  let hallEnd = We;
  if (master) {
    // xoll master eshigigacha; garderob ≤ 1,5 + sanuzel ≤ 2,7 m — ortigʻi xollga (sanuzel haddan katta boʻlmasin)
    const um0 = cuts[bed - 1], he = Math.max(um0 + 1.05, We - 4.2);
    if (We - he >= 2.9) {
      L.master = true; hallEnd = he;
      const gw = Math.min(1.5, (We - he) - 1.8), g1 = he + gw;
      room(he, f, g1, D, 'garderob'); room(g1, f, We, D, 'sanuzel');
      wall(he, f, he, D); wall(g1, f, g1, D);
      doorsF.push({ k: 'door', s: he + 0.1, w: Math.min(0.7, gw - 0.2), side: 1, hinge: 0 }, { k: 'door', s: We - 0.85, w: 0.7, side: -1, hinge: 1 });
    } else if (We - he >= 1.7) {
      // tor master: faqat oʻz sanuzeli (garderob — yotoq ichidagi shkaf)
      L.master = true; hallEnd = he;
      room(he, f, We, D, 'sanuzel'); wall(he, f, he, D);
      doorsF.push({ k: 'door', s: We - 0.85, w: 0.7, side: -1, hinge: 1 });
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
  if (hallEnd < We) wall(hallEnd, f, hallEnd, D);
  if (doorsF.some(c => c.s + c.w > We - 0.1)) return 'kemtik';
  wall(wK, f, We, f, doorsF.map(c => ({ ...c, s: c.s - wK })));
  return L;
}

/**
 * Kirish eshigi umumiy xonadan uzoq uchida (burchak kvartiralari, 31.10): umumiy xona burchakda (u = 0), yotoqlar oʻrtada,
 * dahliz eshik yonida (u = W tomonda), undan umumiy xonagacha yoʻlak, yoʻlak ostida hoʻl xonalar. 2–4 xonali (master-bloksiz).
 */
function layoutEnd(W: number, D: number, k: number, bounds: number[], wins: [number, number][], cr: [number, number]): Local | string {
  if (k < 2) return 'uch';
  const bed = k - 1, s = D <= 6.4 ? 2.4 : 2.6, f = D - s, hd = 1.1;
  if (f < 2.8 || s - hd < 1.29) return 'sayoz';
  const aK = k === 2 ? 22 : k === 3 ? 25 : 27, loK = 2.9, hiK = Math.min(5.4, W - bed * 2.6);
  if (hiK < loK) return 'tor';
  const wK = pickCut(Math.min(hiK, Math.max(loK, aK / D)), loK, hiK, bounds, wins);
  if (wK === null || !hasWin(0, wK, wins)) return 'deraza';
  // dahliz 1,8 m: markazi eshik oraligʻida; chetidagi < 1,2 m boʻlak dahlizga qoʻshiladi
  const c = Math.max(cr[0], Math.min(cr[1], Math.max(wK + 0.9, Math.min(W - 0.9, (cr[0] + cr[1]) / 2))));
  if (c < cr[0] - 0.01 || c > cr[1] + 0.01) return 'eshik';
  let d0 = c - 0.9, d1 = c + 0.9;
  if (d0 < wK + 1.2) d0 = wK; if (d1 > W - 1.2) d1 = W;
  const cuts = [wK];
  for (let i = 1; i < bed; i++) { const t = pickCut(wK + (W - wK) * i / bed, cuts[i - 1] + 2.6, W - (bed - i) * 2.6, bounds, wins); if (t === null) return 'tor'; cuts.push(t); }
  cuts.push(W);
  for (let i = 0; i < bed; i++) if (cuts[i + 1] - cuts[i] < 2.55 || !hasWin(cuts[i], cuts[i + 1], wins)) return 'deraza';
  const L: Local = { rooms: [], walls: [], entry: [c, D], master: false };
  const room = (u0: number, v0: number, u1: number, v1: number, kind: InKind) => L.rooms.push({ r: [u0, v0, u1, v1], kind });
  const wall = (u0: number, v0: number, u1: number, v1: number, cuts2: Cut[] = []) => L.walls.push({ a: [u0, v0], b: [u1, v1], cuts: cuts2 });
  room(0, 0, wK, D, 'umumiy');
  { const kv = D - Math.min(2.4, D * 0.33); L.kitchen = [[0.15, kv], [wK - 0.15, kv]]; }
  for (let i = 0; i < bed; i++) { room(cuts[i], 0, cuts[i + 1], f, 'yotoq'); if (i > 0) wall(cuts[i], 0, cuts[i], f); }
  room(d0, f, d1, D, 'prixojaya');
  // yoʻlak + hoʻl xonalar dahlizning ikki tomonida
  let wet = 0;
  for (const [a0, a1] of [[wK, d0], [d1, W]] as [number, number][]) {
    if (a1 - a0 < 1.15) continue;
    room(a0, f, a1, f + hd, 'xoll');
    const Lw = a1 - a0, parts: [number, InKind][] = Lw >= 3.4 ? [[Lw - 1.2, 'vanna'], [1.2, 'hx']] : [[Lw, wet ? 'hx' : 'sanuzel']];
    let u = a0; const wc: Cut[] = [];
    parts.forEach(([w, kind], i) => { const u1 = i === parts.length - 1 ? a1 : u + w; room(u, f + hd, u1, D, kind); wet++; if (u > a0) wall(u, f + hd, u, D); wc.push({ k: 'door', s: u - a0 + 0.15, w: Math.min(kind === 'hx' ? 0.6 : 0.7, u1 - u - 0.4), side: -1, hinge: 0 }); u = u1; });
    if (wc.some(d => d.w < 0.55)) return 'tor';
    wall(a0, f + hd, a1, f + hd, wc);
  }
  if (!wet) return 'tor';
  if (d0 > wK + 0.01) wall(d0, f + hd, d0, D);
  if (d1 < W - 0.01) wall(d1, f + hd, d1, D);
  wall(wK, 0, wK, D, [d0 <= wK + 0.01 ? { k: 'open', s: f + 0.15, w: s - 0.3 } : { k: 'open', s: f + 0.05, w: hd - 0.1 }]);
  // yotoq eshiklari — yoʻlak yoki dahlizdan (uyaning chap burchagida)
  const df: Cut[] = cuts.slice(0, bed).map(u0 => ({ k: 'door' as const, s: u0 + 0.15 - wK, w: 0.8, side: -1 as const, hinge: 0 as const }));
  wall(wK, f, W, f, df);
  return L;
}

/** Kemtik qismini xonalar va devorlardan olib tashlash (xona L shaklga keladi); oshxona qatori kemtikdan chiqariladi */
function cutNotch(L: Local, W: number, nt: Notch): Local | string {
  const nu0 = nt.side === 'R' ? W - nt.w : 0, nu1 = nt.side === 'R' ? W : nt.w, Dn = nt.Dn, e = 0.01;
  for (const q of L.rooms) {
    const [x0, y0, x1, y1] = q.r;
    if (x1 <= nu0 + e || x0 >= nu1 - e || y1 <= Dn + e) continue;
    if (x0 >= nu0 - e && x1 <= nu1 + e) { if (y0 >= Dn - e) return 'kemtik'; q.r = [x0, y0, x1, Dn]; continue; }   // butunlay kemtik ostida — qisqaradi
    const a = Math.max(x0, nu0), b = Math.min(x1, nu1), c = Math.max(y0, Dn);
    // toʻgʻri burchakdan burchak kesiladi (kemtik xona chetiga tegadi)
    q.poly = nt.side === 'R'
      ? [[x0, y0], [x1, y0], [x1, c], [a, c], [a, y1], [x0, y1]]
      : [[x0, y0], [x1, y0], [x1, y1], [b, y1], [b, c], [x0, c]];
  }
  for (const w of L.walls) {
    const vert = Math.abs(w.a[0] - w.b[0]) < e, hor = Math.abs(w.a[1] - w.b[1]) < e;
    if (vert && w.a[0] > nu0 + e && w.a[0] < nu1 - e) { w.a = [w.a[0], Math.min(w.a[1], Dn)]; w.b = [w.b[0], Math.min(w.b[1], Dn)]; }
    if (hor && w.a[1] > Dn + e) { const cl = (u: number) => nt.side === 'R' ? Math.min(u, nu0) : Math.max(u, nu1); w.a = [cl(w.a[0]), w.a[1]]; w.b = [cl(w.b[0]), w.b[1]]; }
  }
  L.walls = L.walls.filter(w => Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]) > 0.05);
  if (L.kitchen && L.kitchen[0][1] > Dn) {
    // oshxona qatori: kemtik yonida qolgan qismda yoki kemtik devori (v = Dn) boʻylab — qaysi biri uzun boʻlsa
    const k0 = Math.max(L.kitchen[0][0], nu1 + 0.15), lA = L.kitchen[1][0] - k0, lB = nt.side === 'L' ? nu1 - 0.3 : 0;
    if (Math.max(lA, lB) < 1.8) return 'kemtik';
    L.kitchen = lA >= lB ? [[k0, L.kitchen[0][1]], L.kitchen[1]] : [[0.15, Dn - 0.65], [nu1 - 0.15, Dn - 0.65]];
  }
  if (L.entry[0] > nu0 - 0.6 && L.entry[0] < nu1 + 0.6) return 'kemtik';
  return L;
}

/** Eshik tirqishi qoʻshni (perpendikulyar) devor yuzasidan kamida shuncha qochadi (egasi, 31.10) */
export const DOOR_GAP = 0.15;
/**
 * Eshiklarni devorlardan qochirish: har eshik tirqishi oʻz devoridagi ikki «toʻsiq» (devor uchi yoki unga tegib turgan
 * boshqa devor) orasida, har biridan T/2 + 0,15 m uzoqda boʻladi. Sigʻmasa — eni 0,6 m gacha toraytiriladi.
 */
function fixDoors(L: Local): void {
  for (const wl of L.walls) {
    const dx = wl.b[0] - wl.a[0], dy = wl.b[1] - wl.a[1], len = Math.hypot(dx, dy); if (len < 1e-6 || !wl.cuts.some(c => c.k !== 'open')) continue;
    const ux = dx / len, uy = dy / len, stops = [0, len];
    for (const o of L.walls) {
      if (o === wl) continue;
      const ox = o.b[0] - o.a[0], oy = o.b[1] - o.a[1], ol = Math.hypot(ox, oy); if (ol < 1e-6 || Math.abs((ox * ux + oy * uy) / ol) > 0.1) continue;
      // o — perpendikulyar; wl chizigʻiga tegadimi (uchi yoki kesib oʻtadi)
      const va = (o.a[0] - wl.a[0]) * -uy + (o.a[1] - wl.a[1]) * ux, vb = (o.b[0] - wl.a[0]) * -uy + (o.b[1] - wl.a[1]) * ux;
      if (Math.min(va, vb) > T || Math.max(va, vb) < -T) continue;
      const t = (o.a[0] - wl.a[0]) * ux + (o.a[1] - wl.a[1]) * uy;
      if (t > -T && t < len + T) stops.push(Math.max(0, Math.min(len, t)));
    }
    stops.sort((p, q) => p - q);
    const m = T / 2 + DOOR_GAP;
    for (const c of wl.cuts) {
      if (c.k === 'open') continue;
      const mid = c.s + c.w / 2;
      let lo = 0, hi = len; for (const t of stops) { if (t <= mid) lo = t; else { hi = t; break; } }
      const a0 = lo + m, b0 = hi - m;
      if (b0 - a0 < 0.6) continue;
      if (c.w > b0 - a0) c.w = Math.round((b0 - a0) * 100) / 100;
      c.s = Math.max(a0, Math.min(b0 - c.w, c.s));
    }
  }
}

/** Devorlarni kesib boʻlaklarga ajratish va eshiklarni yaratish (mahalliy) */
function build(L: Local): { walls: [XY, XY][]; doors: InDoor[] } {
  fixDoors(L);
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

/** Devorlar (kesiklar bilan) → devor boʻlaklari va eshiklar; past qavatli uy rejalari (lowplan) ham shundan foydalanadi */
export type WallCut = Cut;
export function buildWalls(walls: { a: XY; b: XY; cuts: Cut[] }[]): { walls: [XY, XY][]; doors: InDoor[] } { return build({ rooms: [], walls, entry: [0, 0], master: false }); }

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
/**
 * Ikki fasadli (skvoznoy) kvartira (31.10, V10d 8-reja): bir fasadda umumiy xona butun eni boʻylab, ikkinchisida yotoqlar;
 * oʻrtada kirish (yon devordan) — prixojaya, hoʻl xonalar va xoll. Mahalliy: u — fasad boʻylab, v — A fasaddan B fasadgacha.
 */
function throughInterior(a: RuleApt, mods: FacadeMod[]): AptInterior | null {
  const ms = a.mods.map(i => mods[i]).filter(Boolean);
  const dirs: { U: XY; m: FacadeMod[] }[] = [];
  for (const m of ms) { const dx = m.b[0] - m.a[0], dy = m.b[1] - m.a[1], l = Math.hypot(dx, dy); if (l < 0.3) continue; const U: XY = [dx / l, dy / l], g = dirs.find(q => Math.abs(q.U[0] * U[0] + q.U[1] * U[1]) > 0.995); if (g) g.m.push(m); else dirs.push({ U, m: [m] }); }
  const g = dirs.find(q => q.m.length >= 2); if (!g) return null;
  const U = g.U, N0: XY = [-U[1], U[0]], m0 = g.m[0];
  const lu0 = (p: XY) => (p[0] - m0.a[0]) * U[0] + (p[1] - m0.a[1]) * U[1], lv0 = (p: XY) => (p[0] - m0.a[0]) * N0[0] + (p[1] - m0.a[1]) * N0[1];
  const L = a.ring.map(p => [lu0(p), lv0(p)] as XY), u0 = Math.min(...L.map(p => p[0])), u1 = Math.max(...L.map(p => p[0])), v0 = Math.min(...L.map(p => p[1])), v1 = Math.max(...L.map(p => p[1]));
  const W = u1 - u0, D = v1 - v0;
  if (area(a.ring) / (W * D) < 0.9 || D < 9 || D > 18 || W < 4.5 || W > 12) return null;
  // ikki qarama-qarshi fasad: modullar v0 va v1 chiziqlarida
  const onA = g.m.filter(m => Math.abs(lv0(m.a) - v0) < 0.35), onB = g.m.filter(m => Math.abs(lv0(m.a) - v1) < 0.35);
  if (!onA.length || !onB.length) return null;
  // kirish — yon devorda (u0 yoki u1), oʻrta qismda
  const du = lu0(a.door) - u0, dv = lv0(a.door) - v0;
  const side = du < 0.35 ? 0 : du > W - 0.35 ? 1 : -1; if (side < 0) return null;
  const k = Math.max(1, Math.min(4, a.rooms || 1)), bed = Math.max(1, k - 1), net = a.area * 0.85;
  const winsOf = (list: FacadeMod[]) => list.filter(m => !m.blind).map(m => { const x0 = lu0(m.a) - u0, x1 = lu0(m.b) - u0, lo = Math.max(0, Math.min(x0, x1)), hi = Math.min(W, Math.max(x0, x1)), c = (lo + hi) / 2, hw = Math.min(1.6, (hi - lo) * 0.5) / 2; return [c - hw, c + hw] as [number, number]; }).filter(([p, q]) => q - p > 0.5);
  // umumiy xona qaysi fasadda: kirish oʻrta qismga tushadigan tomon (A — v kichik)
  const aK = k <= 1 ? 18 : k === 2 ? 22 : k === 3 ? 25 : 27, dK = Math.max(3.6, Math.min(5.5, aK / W)), dB = Math.max(3.3, Math.min(4.4, D - dK - 2.8));
  const midOk = (vd: number) => vd > dK + 0.6 && vd < D - dB - 0.6;
  let flipV = false;
  if (!midOk(dv)) { if (midOk(D - dv)) flipV = true; else return null; }
  const vd = flipV ? D - dv : dv, winsK = winsOf(flipV ? onB : onA), winsBd = winsOf(flipV ? onA : onB);
  if (!winsK.length || !winsBd.length) return null;
  const m1 = D - dB, wp = Math.min(2.2, W * 0.32);
  const Lc: Local = { rooms: [], walls: [], entry: [0, vd], master: false };
  const room = (x0: number, y0: number, x1: number, y1: number, kind: InKind) => Lc.rooms.push({ r: [x0, y0, x1, y1], kind });
  const wall = (x0: number, y0: number, x1: number, y1: number, cuts: Cut[] = []) => Lc.walls.push({ a: [x0, y0], b: [x1, y1], cuts });
  room(0, 0, W, dK, k <= 1 ? 'xona' : 'umumiy');
  Lc.kitchen = [[W - 0.6, 0.6], [W - 0.6, dK - 0.2]];
  room(0, dK, wp, m1, 'prixojaya');
  wall(0, dK, W, dK, [{ k: 'open', s: 0.2, w: wp - 0.4 }]);
  // yotoqlar (B fasad)
  const cuts = [0]; for (let i = 1; i < bed; i++) { const t = pickCut(W * i / bed, cuts[i - 1] + 2.6, W - (bed - i) * 2.6, [], winsBd); if (t === null) return null; cuts.push(t); } cuts.push(W);
  for (let i = 0; i < bed; i++) { if (cuts[i + 1] - cuts[i] < 2.55 || !hasWin(cuts[i], cuts[i + 1], winsBd)) return null; room(cuts[i], m1, cuts[i + 1], D, k <= 1 ? 'oshxona' : 'yotoq'); if (i > 0) wall(cuts[i], m1, cuts[i], D); }
  const doorsM: Cut[] = [];
  if (bed >= 2 || W - wp > 3.4) {
    // xoll — yotoqlar oldida, hoʻl xonalar umumiy xona tomonida
    const hd = 1.2, h0 = m1 - hd;
    if (h0 - dK < 1.4) return null;
    room(wp, h0, W, m1, 'xoll');
    wall(wp, dK, wp, m1, [{ k: 'open', s: h0 - dK + 0.05, w: hd - 0.1 }]);
    const Lw = W - wp, parts: [number, InKind][] = Lw >= 4.4 ? [[Lw - 1.2, 'vanna'], [1.2, 'hx']] : [[Lw, 'sanuzel']];
    let x = wp; const wc: Cut[] = [];
    parts.forEach(([w, kind], i) => { const x1 = i === parts.length - 1 ? W : x + w; room(x, dK, x1, h0, kind); if (x > wp) wall(x, dK, x, h0); wc.push({ k: 'door', s: x - wp + 0.12, w: Math.min(kind === 'hx' ? 0.6 : 0.7, x1 - x - 0.25), side: 1, hinge: 0 }); x = x1; });
    wall(wp, h0, W, h0, wc);
    for (let i = 0; i < bed; i++) { const s1 = Math.max(cuts[i] + 0.12, i === 0 ? wp + 0.12 : cuts[i] + 0.12); if (s1 + 0.8 > (i + 1 < bed ? cuts[i + 1] : W) - 0.05) return null; doorsM.push({ k: 'door', s: s1, w: 0.8, side: -1, hinge: 0 }); }
  } else {
    room(wp, dK, W, m1, 'sanuzel');
    wall(wp, dK, wp, m1, [{ k: 'door', s: 0.25, w: 0.7, side: 1, hinge: 0 }]);   // sanuzel eshigi prixojayaga
    doorsM.push({ k: 'door', s: 0.15, w: 0.8, side: -1, hinge: 0 });
  }
  // v = m1 devori: yotoq eshiklari (yo‘nalish +v → side −1 bilan u boʻylab chizilgan devor: n = (0, 1)·(−1)? — devor W → 0 yoʻnalishida)
  wall(W, m1, 0, m1, doorsM.map(c => ({ ...c, s: W - c.s - c.w, hinge: (1 - (c.hinge ?? 0)) as 0 | 1 })));
  const b = build(Lc);
  // dunyo: side = 1 boʻlsa u teskari (kirish u = 0 da boʻlsin); flipV — v teskari
  const toW = (p: XY): XY => { const u = side === 1 ? W - p[0] : p[0], v = flipV ? D - p[1] : p[1]; const uu = u + u0, vv = v + v0; return [m0.a[0] + U[0] * uu + N0[0] * vv, m0.a[1] + U[1] * uu + N0[1] * vv]; };
  const dirW = (n: XY): XY => { const u = side === 1 ? -n[0] : n[0], v = flipV ? -n[1] : n[1]; return [U[0] * u + N0[0] * v, U[1] * u + N0[1] * v]; };
  const walls = b.walls.map(([p, q]) => [toW(p), toW(q)] as [XY, XY]);
  const doors: InDoor[] = b.doors.map(d => ({ ...d, h: toW(d.h), a: toW(d.a), n: dirW(d.n) }));
  if (a.inner?.slide) doors.forEach((d, i) => { if (d.kind === 'swing' && d.w <= 0.71) doors[i] = { ...d, kind: 'slide' }; });
  for (const i of doorClashes(doors, walls, a.ring)) doors[i] = { ...doors[i], kind: 'slide' };
  const rooms: InRoom[] = Lc.rooms.map(q => { const [x0, y0, x1, y1] = q.r, ring = [toW([x0, y0]), toW([x1, y0]), toW([x1, y1]), toW([x0, y1])]; return { ring, kind: q.kind, area: Math.max(0, (x1 - x0 - T) * (y1 - y0 - T)), wet: WET.includes(q.kind) }; });
  void net;
  return { rooms, walls, doors, entry: toW([0, vd]), kitchen: Lc.kitchen ? [toW(Lc.kitchen[0]), toW(Lc.kitchen[1])] : undefined, master: false };
}

/**
 * Yon devordan kiriladigan bir xonali kvartira (31.10): fasad — torets yoki qisqa tomon, kirish eshigi fasadga perpendikulyar
 * devorda. Eshik tomonida dahliz (orqa devorgacha), orqada sanitariya xonasi, qolgani — xona (L shakl), oshxona qatori sanitariya devori boʻylab.
 */
function sideInterior(a: RuleApt, mods: FacadeMod[]): AptInterior | null {
  if ((a.rooms || 1) > 1) return null;
  const ms = a.mods.map(i => mods[i]).filter(Boolean);
  const dirs: { U: XY; len: number; m: FacadeMod[] }[] = [];
  for (const m of ms) { const dx = m.b[0] - m.a[0], dy = m.b[1] - m.a[1], l = Math.hypot(dx, dy); if (l < 0.3) continue; const U: XY = [dx / l, dy / l], g = dirs.find(q => q.U[0] * U[0] + q.U[1] * U[1] > 0.995); if (g) { g.len += l; g.m.push(m); } else dirs.push({ U, len: l, m: [m] }); }
  const c = a.ring.reduce((t, p) => [t[0] + p[0] / a.ring.length, t[1] + p[1] / a.ring.length], [0, 0] as XY);
  for (const g of dirs.sort((p, q) => q.len - p.len)) {
    let N: XY = [-g.U[1], g.U[0]]; const m0 = g.m[0];
    if ((c[0] - m0.a[0]) * N[0] + (c[1] - m0.a[1]) * N[1] < 0) N = [-N[0], -N[1]];
    const lu0 = (p: XY) => (p[0] - m0.a[0]) * g.U[0] + (p[1] - m0.a[1]) * g.U[1], lv0 = (p: XY) => (p[0] - m0.a[0]) * N[0] + (p[1] - m0.a[1]) * N[1];
    const u0 = Math.min(...a.ring.map(lu0)), u1 = Math.max(...a.ring.map(lu0)), v0 = Math.min(...a.ring.map(lv0)), v1 = Math.max(...a.ring.map(lv0));
    const W = u1 - u0, D = v1 - v0;
    if (Math.abs(v0) > 0.35 || area(a.ring) / (W * D) < 0.95 || W < 3.7 || D < 5.0 || D > 9) continue;
    const du = lu0(a.door) - u0, vd = lv0(a.door) - v0, at = du < 0.15 ? 0 : du > W - 0.15 ? 1 : -1;
    if (at < 0) continue;
    const s = 2.0, b = D - s, wp = Math.min(1.6, W * 0.35), aa = vd - 0.75;
    if (b < 2.8 || aa < 1.2 || vd + 0.45 > D - 0.2 || W - wp < 2.1) continue;
    // mahalliy: eshik u = W tomonda (at = 0 boʻlsa u teskari)
    const Lc: Local = { rooms: [], walls: [], entry: [W, vd], master: false };
    Lc.rooms.push({ r: [0, 0, W, Math.max(aa, b)], kind: 'xona', poly: [[0, 0], [W, 0], [W, aa], [W - wp, aa], [W - wp, b], [0, b]] });
    Lc.rooms.push({ r: [W - wp, aa, W, D], kind: 'prixojaya' }, { r: [0, b, W - wp, D], kind: 'sanuzel' });
    Lc.walls.push({ a: [0, b], b: [W - wp, b], cuts: [] }, { a: [W - wp, b], b: [W - wp, D], cuts: [{ k: 'door', s: 0.2, w: Math.min(0.7, s - 0.5), side: -1, hinge: 0 }] });
    Lc.kitchen = [[0.15, b - 0.65], [W - wp - 0.15, b - 0.65]];
    const bl = build(Lc);
    const toW = (p: XY): XY => { const u = (at === 0 ? W - p[0] : p[0]) + u0, v = p[1] + v0; return [m0.a[0] + g.U[0] * u + N[0] * v, m0.a[1] + g.U[1] * u + N[1] * v]; };
    const dirW = (n: XY): XY => { const u = at === 0 ? -n[0] : n[0]; return [g.U[0] * u + N[0] * n[1], g.U[1] * u + N[1] * n[1]]; };
    const walls = bl.walls.map(([p, q]) => [toW(p), toW(q)] as [XY, XY]);
    const doors: InDoor[] = bl.doors.map(d => ({ ...d, h: toW(d.h), a: toW(d.a), n: dirW(d.n) }));
    if (a.inner?.slide) doors.forEach((d, i) => { if (d.kind === 'swing' && d.w <= 0.71) doors[i] = { ...d, kind: 'slide' }; });
    for (const i of doorClashes(doors, walls, a.ring)) doors[i] = { ...doors[i], kind: 'slide' };
    const rooms: InRoom[] = Lc.rooms.map(q => { const [x0, y0, x1, y1] = q.r, pr: XY[] = q.poly ?? [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; return { ring: pr.map(toW), kind: q.kind, area: Math.max(0, area(pr) * (x1 - x0 - T) * (y1 - y0 - T) / ((x1 - x0) * (y1 - y0))), wet: WET.includes(q.kind) }; });
    return { rooms, walls, doors, entry: toW(Lc.entry), kitchen: [toW(Lc.kitchen[0]), toW(Lc.kitchen[1])], master: false };
  }
  return null;
}

export function aptInterior(a: RuleApt, mods: FacadeMod[]): AptInterior | null {
  lastWhy = 'frame'; const fr = frameOf(a, mods); if (!fr) return sideInterior(a, mods) ?? throughInterior(a, mods);
  const { O, U, N, W, D, notch } = fr;
  lastWhy = `WD ${W.toFixed(1)}x${D.toFixed(1)}`; if (D < 4.8 || D > 11.5 || W < 3) return null;
  const ntOf = (fl: boolean): Notch | undefined => notch && (fl ? { ...notch, side: notch.side === 'R' ? 'L' : 'R' } : notch);
  const { bounds, wins } = facadeOf(a, mods, O, U, W);
  const lv = (p: XY) => (p[0] - O[0]) * N[0] + (p[1] - O[1]) * N[1], lu = (p: XY) => (p[0] - O[0]) * U[0] + (p[1] - O[1]) * U[1];
  // kirish eshigi koridor devorida boʻlishi kerak
  lastWhy = `door v ${lv(a.door).toFixed(1)}/${D.toFixed(1)}`; if (lv(a.door) < D - 0.45) return null;
  const net = a.area * 0.85, k = Math.max(1, Math.min(4, a.rooms || 1));
  // ikki yoʻnalish: umumiy xona chapda yoki oʻngda — kirish eshigi (generator joyi) ga yaqinroq prixojayali variant
  const flipB = (b: number[]) => b.map(x => Math.round((W - x) * 100) / 100).sort((p, q) => p - q), flipW = (w: [number, number][]) => w.map(([p, q]) => [W - q, W - p] as [number, number]);
  const ov = a.inner ?? {};
  // koridor bilan umumiy kesma: eshik markazi undan chetlardan ≥ 0,6 m ichkarida (0,45 + 0,15)
  const ud0 = lu(a.door), h0 = Math.max(0.05, (a.doorLen ?? 1.8) / 2 - 0.6), udOf = (fl: boolean): [number, number] => fl ? [W - ud0 - h0, W - ud0 + h0] : [ud0 - h0, ud0 + h0];
  let opts = [false, true].map(fl => ({ fl, L: layoutLocal(W, D, k, net, fl ? flipB(bounds) : bounds, fl ? flipW(wins) : wins, false, ov, ntOf(fl), udOf(fl)) }));
  // 1 xonali: oshxona alohida sigʻmasa — studiya (xona + oshxona qatori, tasmada sanuzel va prixojaya)
  if (k <= 1 && opts.every(o => typeof o.L === 'string')) opts = [false, true].map(fl => ({ fl, L: layoutLocal(W, D, k, net, fl ? flipB(bounds) : bounds, fl ? flipW(wins) : wins, true, ov, ntOf(fl), udOf(fl)) }));
  // eshik umumiy xonadan uzoq uchida — dahliz eshik yonida, yoʻlak orqali umumiy xonaga
  if (!notch && opts.every(o => typeof o.L === 'string') && opts.some(o => o.L === 'eshik')) opts = [false, true].map(fl => ({ fl, L: layoutEnd(W, D, k, fl ? flipB(bounds) : bounds, fl ? flipW(wins) : wins, udOf(fl)) }));
  const ok = opts.filter(o => typeof o.L !== 'string') as { fl: boolean; L: Local }[];
  lastWhy = opts.map(o => typeof o.L === 'string' ? o.L : 'ok').join('|') + ` W${W.toFixed(1)} D${D.toFixed(1)} k${k}`; if (!ok.length) return null;
  const ud = lu(a.door);
  ok.sort((p, q) => Math.abs((p.fl ? W - p.L.entry[0] : p.L.entry[0]) - ud) - Math.abs((q.fl ? W - q.L.entry[0] : q.L.entry[0]) - ud));
  const { fl, L } = ov.flip && ok.length > 1 ? ok[1] : ok[0];
  const toW = (p: XY): XY => { const u = fl ? W - p[0] : p[0]; return [O[0] + U[0] * u + N[0] * p[1], O[1] + U[1] * u + N[1] * p[1]]; };
  const dirW = (n: XY): XY => { const u = fl ? -n[0] : n[0]; return [U[0] * u + N[0] * n[1], U[1] * u + N[1] * n[1]]; };
  const b = build(L);
  const walls = b.walls.map(([p, q]) => [toW(p), toW(q)] as [XY, XY]);
  const doors: InDoor[] = b.doors.map(d => ({ ...d, h: toW(d.h), a: toW(d.a), n: dirW(d.n) }));
  // toʻqnashgan eshiklar: hoʻl xona / garderob eshigi — surma
  if (ov.slide) doors.forEach((d, i) => { if (d.kind === 'swing' && d.w <= 0.71) doors[i] = { ...d, kind: 'slide' }; });   // V2: hoʻl xona va garderob eshiklari — surma
  for (const i of doorClashes(doors, walls, a.ring)) doors[i] = { ...doors[i], kind: 'slide' };
  const rooms: InRoom[] = L.rooms.map(q => { const [u0, v0, u1, v1] = q.r, pr: XY[] = q.poly ?? [[u0, v0], [u1, v0], [u1, v1], [u0, v1]], gross = (u1 - u0) * (v1 - v0); return { ring: pr.map(toW), kind: q.kind, area: Math.max(0, area(pr) * (u1 - u0 - T) * (v1 - v0 - T) / gross), wet: WET.includes(q.kind) }; });
  const ent = toW(L.entry);
  return { rooms, walls, doors, entry: ent, kitchen: L.kitchen ? [toW(L.kitchen[0]), toW(L.kitchen[1])] : undefined, master: L.master };
}
