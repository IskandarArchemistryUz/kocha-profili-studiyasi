/**
 * Qavat rejasi — SEKSIYALAR va QOIDA boʻyicha:
 *   1) bino seksiyalarga boʻlinadi: L tutashuvi — burchak seksiyasi, T tutashuvi — tanasi alohida, uzun qanot tutashuvda
 *      boʻlinadi, toʻgʻri qismlar ≤ 36 m (TAXMIN). Seksiyalar orasida yongʻin devori, koridorlar uzilgan — har seksiyaning
 *      oʻz zina-lift yadrosi va kirishi bor; uzun umumiy koridor yoʻq;
 *   2) yadro seksiyaning eng «foydasiz» joyida: burchak seksiyasida — ichki burchakda (zina hovli fasadida, kirish hovlidan),
 *      boshqalarida — hovli tomonda, avvalo derazasiz (boshqa qanotga tegib turgan) fasad qismida;
 *   3) yadro → koridor (MOP) → qolgan maydon koridorga perpendikulyar, fasad modullari toʻrida kesiladi: har kvartira
 *      koridorga eshik va fasadga deraza bilan;
 *   4) tekshiruv: eshik oʻz seksiyasi MOP idan (≥ 0,9 m); deraza bor; kvartira chuqurligi (maydon / deraza fasadi eni) ≤ 10,5 m
 *      — «qorongʻi» kvartira boʻlmasin (TAXMIN; xona chuqurligi ≤ 6 m — SanQvaN 0331-16, 8.7); shart bajarilmasa qoʻshni
 *      kvartiraga qoʻshiladi, boʻlmasa — texnik.
 *
 * Qanot chuqurligi ≥ 13 m — ikki tomonlama (oʻrta koridor), < 13 m — bir tomonlama (koridor hovli fasadi boʻylab).
 * Meʼyorlar (ShNQ 2.01.02-04, asl matn): 5.13 — seksiya qavatidagi kvartiralar > 500 m² boʻlsa ≥ 2 evakuatsiya chiqishi;
 * 5.27 — koridor eni ≥ 1,2 m; 5.31 — lift oldi ≥ 1,6 m; 5.25 — koridor > 60 m boʻlinadi; 5.40 — > 28 m da tutunsiz zina.
 * Yadro oʻlchami, lift soni, kvartira maydonlari, seksiya uzunligi — TAXMIN (ShNQ 2.08.01-19 matni kerak).
 */
import polygonClipping, { type Polygon, type MultiPolygon } from 'polygon-clipping';
import { area, obb2, signedArea, type XY } from './geo';
import { splitAtReflex } from './roof';

export interface FacadeMod { a: XY; b: XY; az: number; blind: boolean }
export interface RuleApt {
  rooms: number; ring: XY[]; area: number;
  /** eshik: MOP bilan umumiy chegara oʻrtasi */ door: XY;
  /** fasad modullari (derazalar) */ mods: number[];
  /** sanuzel + dahliz — eshik yonida */ wet: XY[];
  /** xona boʻlinmalari */ walls: [XY, XY][];
  /** qanot va seksiya */ wing: number; sec: number;
  /** hovli tomonidagi tasmada (1-qavatda — yashovchilar xonalari) */ court?: boolean;
}
/** Kvartira boʻlmagan xona: texnik / ombor, 1-qavatda — savdo, velo-kolyaska, zal, tozalash anjomlari ombori (ShNQ 2.08.01-19, 3.14) */
export type RoomKind = 'texnik' | 'ombor' | 'savdo' | 'velo' | 'zal' | 'tozalash';
export interface PlanRoom { ring: XY[]; kind: RoomKind; sec: number; door: XY }
export interface RuleSection { mop: XY[][]; stairs: XY[][]; lifts: XY[][]; apts: number[]; corridorLen: number; corner: boolean; /** 1-qavatda koʻcha tomondan kirish (skvoznoy kirish xolli) */ entry?: XY[][] }
export interface RulePlan {
  kind: 'ikki' | 'bir' | 'aralash';
  stairs: XY[][]; lifts: XY[][];
  /** koridor + lift oldi (MOP), barcha seksiyalar */ mop: XY[][];
  apts: RuleApt[];
  sections: RuleSection[];
  /** seksiyalar orasidagi yongʻin devorlari */ fireWalls: XY[][];
  /** kvartiraga aylanmagan qism — texnik / ombor */ rest: XY[][];
  /** kvartira boʻlmagan xonalar */ rooms: PlanRoom[];
  corridorLen: number; corridorW: number;
}

export const CORR_W = 1.6;                 // TAXMIN: umumiy koridor 1,6 m (5.27 — ≥ 1,2 m; lift oldi 5.31 — ≥ 1,6 m)
const STAIR_D = 2.8, STAIR_W = 2.8, LIFT = 2.2;   // TAXMIN: yadro 6 m; zina 2,8 m; lift 2,2 × 2,2 m
const MOD = 3.3, SEC_MAX = 32, MAX_DEPTH = 10.5; // seksiya uzunligi 25–30 m (Strelka katalogi, «Seksiyali uy»; ≤ 32 m qabul qilindi); kvartira chuqurligi ≤ 10,5 m — TAXMIN
/** kvartira yalpi maydoni (m²) — TAXMIN: S / M / L */
const AREA: Record<'S' | 'M' | 'L', number[]> = { S: [0, 36, 52, 70, 88], M: [0, 42, 60, 80, 100], L: [0, 50, 72, 95, 118] };

/** koordinatalar 1 mm ga yaxlitlanadi — polygon-clipping suzuvchi nuqta xatolarida yiqilmasin */
const q3 = (v: number) => Math.round(v * 1000) / 1000;
const close = (r: XY[]): [number, number][] => [...r, r[0]].map(p => [q3(p[0]), q3(p[1])]);
const openR = (r: [number, number][]): XY[] => r.slice(0, -1).map(p => [p[0], p[1]]);
const perim = (q: XY[]) => q.reduce((s, p, i) => { const n = q[(i + 1) % q.length]; return s + Math.hypot(n[0] - p[0], n[1] - p[1]); }, 0);
/** tashqi halqalar; teshikli boʻlak (yon-atrofi suzuvchi xatodan qolgan ingichka «ramka») va ingichka tasmalar tashlanadi */
const pieces = (mp: MultiPolygon): XY[][] => mp.filter(pp => pp.slice(1).reduce((s, h) => s + area(openR(h)), 0) < 0.5).map(pp => openR(pp[0])).filter(q => q.length >= 3 && area(q) > 0.3 && area(q) / perim(q) > 0.12);
const MP = (a: XY[][]): MultiPolygon => a.map(q => [close(q)] as Polygon);
const diff = (a: XY[][], subs: XY[][], onErr: 'a' | 'none' = 'a'): XY[][] => { if (!a.length) return []; if (!subs.length) return a; try { return pieces(polygonClipping.difference(MP(a), ...subs.map(q => [close(q)] as Polygon))); } catch { return onErr === 'a' ? a : []; } };
const inter = (a: XY[][], b: XY[][]): XY[][] => { if (!a.length || !b.length) return []; try { return pieces(polygonClipping.intersection(MP(a), MP(b))); } catch { return []; } };
const union = (a: XY[][]): XY[][] => { if (a.length < 2) return a; try { return pieces(polygonClipping.union(MP(a))); } catch { return a; } };
const cen = (r: XY[]): XY => { const n = r.length || 1; return [r.reduce((s, p) => s + p[0], 0) / n, r.reduce((s, p) => s + p[1], 0) / n]; };
const pointIn = (p: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };

/** Ikki koʻpburchak umumiy chegarasi uzunligi va oʻrtasi */
export function sharedEdge(a: XY[], b: XY[], tol = 0.12): { len: number; mid: XY } {
  let len = 0, sx = 0, sy = 0, bl = 0;   // mid — eng uzun umumiy kesma oʻrtasi (eshik)
  for (let i = 0; i < a.length; i++) {
    const p = a[i], q = a[(i + 1) % a.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]); if (L < 1e-6) continue;
    const ux = (q[0] - p[0]) / L, uy = (q[1] - p[1]) / L;
    for (let j = 0; j < b.length; j++) {
      const r = b[j], s = b[(j + 1) % b.length];
      const d1 = Math.abs((r[0] - p[0]) * uy - (r[1] - p[1]) * ux), d2 = Math.abs((s[0] - p[0]) * uy - (s[1] - p[1]) * ux); if (d1 > tol || d2 > tol) continue;
      const t1 = (r[0] - p[0]) * ux + (r[1] - p[1]) * uy, t2 = (s[0] - p[0]) * ux + (s[1] - p[1]) * uy;
      const lo = Math.max(0, Math.min(t1, t2)), hi = Math.min(L, Math.max(t1, t2)); if (hi - lo < 0.05) continue;
      len += hi - lo; const m = (lo + hi) / 2;
      if (hi - lo > bl) { bl = hi - lo; sx = p[0] + ux * m; sy = p[1] + uy * m; }
    }
  }
  return { len, mid: [sx, sy] };
}
export function sharedAny(a: XY[], list: XY[][]): { len: number; mid: XY } { let best = { len: 0, mid: [0, 0] as XY }; for (const m of list) { const s = sharedEdge(a, m); if (s.len > best.len) best = s; } return best; }

interface Wing { ring: XY[]; U: XY; V: XY; u0: number; u1: number; v0: number; v1: number; S: number; L: number; double: boolean; court: 1 | -1; mw: number }
type EndKind = 'free' | 'wall' | 'corner' | 'base';
interface LJoint { A: number; B: number; endA: 0 | 1; baseB: 0 | 1; uX: number; uAx: number; bu0: number; bu1: number; sB: 1 | -1 }
interface Part { wing: number; sec: number; ua: number; ub: number; k0: EndKind; k1: EndKind; t0: number; t1: number }

const acen = (r: XY[]): XY => { let a = 0, x = 0, y = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length], c = p[0] * q[1] - q[0] * p[1]; a += c; x += (p[0] + q[0]) * c; y += (p[1] + q[1]) * c; } return a ? [x / (3 * a), y / (3 * a)] : cen(r); };
/** a ning b ga tegib turgan eng uzun qirrasi yoʻnalishi */
function edgeDir(a: XY[], b: XY[]): XY | null {
  let best: XY | null = null, bl = 1;
  for (let i = 0; i < a.length; i++) { const p = a[i], q = a[(i + 1) % a.length], l = Math.hypot(q[0] - p[0], q[1] - p[1]); if (l < 1) continue; const s = sharedEdge([p, q], b).len / 2; if (s > bl) { bl = s; best = [(q[0] - p[0]) / l, (q[1] - p[1]) / l]; } }
  return best;
}

/**
 * court — hovli (xususiy hudud) tomonidagi nuqta (kvartal markazi); berilmasa — bino ogʻirlik markazi (L/T da ichki tomon),
 * u ham aniq boʻlmasa — qoʻshni bino tegib turgan yoki shimoliy tomon.
 */
export function rulePlan(ring0: XY[], mods: FacadeMod[], mix: number[], size: 'S' | 'M' | 'L' = 'M', court: XY | null = null): RulePlan {
  const r = signedArea(ring0) < 0 ? [...ring0].reverse() : ring0, W = CORR_W;
  const target = (k: number) => AREA[size][Math.max(1, Math.min(4, k))];
  const wantK = mixPicker(mix);
  // 1) qanotlar (toʻgʻri toʻrtburchaklar)
  const wingsR: XY[][] = [];
  const rec = (q: XY[], d: number) => { const o = obb2(q); if (area(q) / (o.L * o.S) >= 0.9 || d > 3) { wingsR.push(q); return; } const sp = splitAtReflex(q); if (!sp || sp.some(x => area(x) < 60 || obb2(x).S < 4)) { wingsR.push(q); return; }   /* mayda qanot (< 60 m² yoki eni < 4 m) — alohida seksiya emas, butun shakl bitta qanot */ sp.forEach(x => rec(x, d + 1)); };
  rec(r, 0);
  const rc = acen(r);
  const blindNear = (p: XY) => mods.some(m => m.blind && Math.hypot((m.a[0] + m.b[0]) / 2 - p[0], (m.a[1] + m.b[1]) / 2 - p[1]) < 2.5);
  const wings: Wing[] = wingsR.map((q, qi) => {
    const o = obb2(q); let U = o.U;
    // boshqa qanotga UZUN tomoni bilan tegib turgan qisqa «qoʻl» — oʻqi tutashuvga perpendikulyar
    if (wingsR.length > 1) { const others = wingsR.filter((_, j) => j !== qi); for (const ob of others) { const d = edgeDir(q, ob); if (!d) continue; const sl = sharedEdge(q, ob).len; if (sl >= o.L * 0.8 && Math.abs(d[0] * U[0] + d[1] * U[1]) > 0.7) U = [-d[1], d[0]]; } }
    const V: XY = [-U[1], U[0]];
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const p of q) { const u = p[0] * U[0] + p[1] * U[1], v = p[0] * V[0] + p[1] * V[1]; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const P = (u: number, v: number): XY => [U[0] * u + V[0] * v, U[1] * u + V[1] * v], vm = (v0 + v1) / 2;
    const sd = (p: XY | null) => { if (!p) return 0; const d = p[0] * V[0] + p[1] * V[1] - vm; return Math.abs(d) > 1 ? Math.sign(d) : 0; };
    const score = (v: number, out: number) => { let s = 0; for (const t of [0.25, 0.5, 0.75]) if (blindNear(P(u0 + (u1 - u0) * t, v))) s += 3; const az = ((Math.atan2(V[0] * out, V[1] * out) * 180 / Math.PI) + 360) % 360; if (az >= 300 || az <= 60) s += 1; return s; };
    const court1 = (sd(court) || (wingsR.length > 1 ? sd(rc) : 0) || (score(v1, 1) >= score(v0, -1) ? 1 : -1)) as 1 | -1;
    const L = u1 - u0;
    return { ring: q, U, V, u0, u1, v0, v1, S: v1 - v0, L, double: v1 - v0 >= 13, court: court1, mw: L / Math.max(1, Math.floor(L / MOD + 0.2)) };
  });
  const P = (w: Wing, u: number, v: number): XY => [w.U[0] * u + w.V[0] * v, w.U[1] * u + w.V[1] * v];
  const uOf = (w: Wing, p: XY) => p[0] * w.U[0] + p[1] * w.U[1], vOf = (w: Wing, p: XY) => p[0] * w.V[0] + p[1] * w.V[1];
  const box = (w: Wing, ua: number, ub: number, va: number, vb: number): XY[] => { const a = Math.min(ua, ub), b = Math.max(ua, ub), c = Math.min(va, vb), d = Math.max(va, vb); return [P(w, a, c), P(w, b, c), P(w, b, d), P(w, a, d)]; };
  const axisV = (w: Wing) => w.double ? (w.v0 + w.v1) / 2 : (w.court > 0 ? w.v1 - W / 2 : w.v0 + W / 2);
  const grid = (w: Wing, u: number) => w.u0 + Math.round((u - w.u0) / w.mw) * w.mw;

  // 2) tutashuvlar: L (burchak), T (tana), devor (davomi)
  const Ls: LJoint[] = [], tWalls: { w: number; u: number }[] = [], endKind: EndKind[][] = wings.map(() => ['free', 'free']);
  for (let i = 0; i < wings.length; i++) for (let j = i + 1; j < wings.length; j++) {
    const s = sharedEdge(wings[i].ring, wings[j].ring); if (s.len < 2) continue;
    const d = edgeDir(wings[i].ring, wings[j].ring); if (!d) continue;
    const pi = Math.abs(d[0] * wings[i].U[0] + d[1] * wings[i].U[1]) > 0.7, pj = Math.abs(d[0] * wings[j].U[0] + d[1] * wings[j].U[1]) > 0.7;
    if (pi === pj) {   // bir chiziqda davom — seksiya devori
      for (const k of [i, j]) { const w = wings[k], u = uOf(w, s.mid); if (u - w.u0 < 1) endKind[k][0] = 'wall'; else if (w.u1 - u < 1) endKind[k][1] = 'wall'; else tWalls.push({ w: k, u }); }
      continue;
    }
    const A = pi ? i : j, B = pi ? j : i, wa = wings[A], wb = wings[B];
    let bu0 = Infinity, bu1 = -Infinity; for (const p of wb.ring) { const u = uOf(wa, p); bu0 = Math.min(bu0, u); bu1 = Math.max(bu1, u); }
    const uX = uOf(wa, P(wb, (wb.u0 + wb.u1) / 2, axisV(wb))), uAx = uOf(wb, P(wa, (wa.u0 + wa.u1) / 2, axisV(wa)));
    const um = uOf(wb, s.mid), baseB: 0 | 1 = Math.abs(um - wb.u0) < Math.abs(um - wb.u1) ? 0 : 1;
    const sB = (vOf(wa, cen(wb.ring)) > (wa.v0 + wa.v1) / 2 ? 1 : -1) as 1 | -1;
    if (bu0 - wa.u0 < 1.5 || wa.u1 - bu1 < 1.5) {
      const endA: 0 | 1 = bu0 - wa.u0 < 1.5 ? 0 : 1;
      Ls.push({ A, B, endA, baseB, uX, uAx, bu0, bu1, sB }); endKind[A][endA] = 'corner'; endKind[B][baseB] = 'base';
    } else { tWalls.push({ w: A, u: uX }); endKind[B][baseB] = 'wall'; }
  }

  // 3) seksiyalar: burchak seksiyalari (L), qolgan uzunlik — ≤ 36 m boʻlaklar
  const corners: LJoint[] = [], claims: { w: number; a: number; b: number; sec: number }[] = [];
  let nSec = 0;
  for (const J of Ls) {
    const sec = nSec++, wa = wings[J.A], wb = wings[J.B]; corners[sec] = J;
    const remA = J.endA === 0 ? wa.u1 - J.bu1 : J.bu0 - wa.u0, eA = remA < 21 ? remA : 9;
    claims.push(J.endA === 0 ? { w: J.A, a: wa.u0, b: Math.min(wa.u1, grid(wa, J.bu1 + eA)), sec } : { w: J.A, a: Math.max(wa.u0, grid(wa, J.bu0 - eA)), b: wa.u1, sec });
    const eB = wb.L < 21 ? wb.L : 9;
    claims.push(J.baseB === 0 ? { w: J.B, a: wb.u0, b: Math.min(wb.u1, grid(wb, wb.u0 + eB)), sec } : { w: J.B, a: Math.max(wb.u0, grid(wb, wb.u1 - eB)), b: wb.u1, sec });
  }
  const parts: Part[] = [];
  wings.forEach((w, wi) => {
    const cl = claims.filter(c => c.w === wi).sort((x, y) => x.a - y.a);
    for (let k = 0; k + 1 < cl.length; k++) if (cl[k + 1].a - cl[k].b < 12) { const m = grid(w, (cl[k].b + cl[k + 1].a) / 2); cl[k].b = m; cl[k + 1].a = m; }
    let runs: [number, number][] = [], u = w.u0;
    for (const c of cl) { if (c.a - u > 0.3) runs.push([u, c.a]); u = Math.max(u, c.b); }
    if (w.u1 - u > 0.3) runs.push([u, w.u1]);
    // qisqa qoldiq (< 10 m) — qoʻshni burchak seksiyasiga
    runs = runs.filter(([a, b]) => { if (b - a >= 10) return true; const L = cl.find(c => Math.abs(c.b - a) < 0.05), R = cl.find(c => Math.abs(c.a - b) < 0.05); if (L) { L.b = b; return false; } if (R) { R.a = a; return false; } return true; });
    for (const c of cl) parts.push({ wing: wi, sec: c.sec, ua: c.a, ub: c.b, k0: 'free', k1: 'free', t0: 0, t1: 0 });
    for (const [a, b] of runs) {
      const cuts = [a, ...tWalls.filter(t => t.w === wi && t.u > a + 8 && t.u < b - 8).map(t => t.u).sort((x, y) => x - y), b];
      for (let k = 0; k + 1 < cuts.length; k++) {
        const ra = cuts[k], rb = cuts[k + 1];
        // boʻlaklar soni: uzunlik ≤ SEC_MAX; har boʻlakda kamida ~250 m² (qiyshiq uchli qismlar yadrosiz qolmasin)
        let n = Math.max(1, Math.ceil((rb - ra - 2) / SEC_MAX));
        while (n > 1 && Array.from({ length: n }, (_, q) => inter([w.ring], [box(w, ra + (rb - ra) * q / n, ra + (rb - ra) * (q + 1) / n, w.v0 - 1, w.v1 + 1)]).reduce((t, z) => t + area(z), 0)).some(A => A < 250)) n--;
        let prev = ra;
        for (let q = 1; q <= n; q++) { const nx = q === n ? rb : grid(w, ra + (rb - ra) * q / n); parts.push({ wing: wi, sec: nSec++, ua: prev, ub: nx, k0: 'free', k1: 'free', t0: 0, t1: 0 }); prev = nx; }
      }
    }
  });
  // uch turlari va koridor oraligʻi
  const capW = (w: Wing) => w.double ? Math.min((w.S - W) / 2, Math.max(1, Math.min(w.L >= 36 ? 2 : 1, Math.round(target(wantK()) / w.S / w.mw))) * w.mw) : 0;
  for (const p of parts) {
    const w = wings[p.wing];
    p.k0 = Math.abs(p.ua - w.u0) < 0.05 ? endKind[p.wing][0] : 'wall';
    p.k1 = Math.abs(p.ub - w.u1) < 0.05 ? endKind[p.wing][1] : 'wall';
    const J0 = Ls.find(J => (J.A === p.wing && J.endA === 0) || (J.B === p.wing && J.baseB === 0)), J1 = Ls.find(J => (J.A === p.wing && J.endA === 1) || (J.B === p.wing && J.baseB === 1));
    // tutashuv boshqa seksiyaga tushib qolsa — devor
    if (p.k0 === 'corner' || p.k0 === 'base') { if (!J0 || corners.indexOf(J0) !== p.sec) p.k0 = 'wall'; }
    if (p.k1 === 'corner' || p.k1 === 'base') { if (!J1 || corners.indexOf(J1) !== p.sec) p.k1 = 'wall'; }
    p.t0 = p.k0 === 'free' ? p.ua + capW(w) : p.k0 === 'wall' ? p.ua + 0.1 : p.k0 === 'corner' ? J0!.uX - W / 2 : J0!.uAx - W / 2;
    p.t1 = p.k1 === 'free' ? p.ub - capW(w) : p.k1 === 'wall' ? p.ub - 0.1 : p.k1 === 'corner' ? J1!.uX + W / 2 : J1!.uAx + W / 2;
  }
  const secParts = (s: number) => parts.filter(p => p.sec === s);
  const corrOf = (p: Part): XY[][] => { if (p.t1 - p.t0 < 0.5) return []; const w = wings[p.wing], ax = axisV(w); return inter([box(w, p.t0, p.t1, ax - W / 2, ax + W / 2)], [r]); };

  // 4) yadrolar
  const SECS: { corr: XY[][]; stairs: XY[][]; lifts: XY[][]; halls: XY[][]; rooms: XY[][]; corner: boolean; entry?: XY[][] }[] = [];
  for (let s = 0; s < nSec; s++) {
    const ps = secParts(s), S: (typeof SECS)[number] = { corr: ps.flatMap(corrOf), stairs: [], lifts: [], halls: [], rooms: [], corner: false };
    SECS.push(S); if (!ps.length) continue;
    const J = corners[s];
    if (J && wings[J.A].double && wings[J.B].double) {
      // burchak seksiyasi: yadro ichki burchakda — ikki koridor orasidagi chorakda; zina B qanotning hovli fasadida (kirish hovlidan)
      const A = wings[J.A], uR = J.endA === 0 ? J.bu1 : J.bu0, vR = J.sB > 0 ? A.v1 : A.v0, dirU = Math.sign(uR - J.uX) || 1;
      const qu0 = J.uX + dirU * W / 2, qv0 = axisV(A) + J.sB * W / 2;
      if (Math.abs(uR - qu0) >= 4.6 && Math.abs(vR - qv0) >= 4.0) {
        const nL = Math.abs(uR - qu0) >= 2 * LIFT + 1.2 ? 2 : 1;
        S.stairs.push(...inter([box(A, qu0, uR, vR, vR + J.sB * STAIR_D)], [r]));
        for (let k = 0; k < nL; k++) S.lifts.push(box(A, uR - dirU * (k + 1) * LIFT, uR - dirU * k * LIFT, vR - J.sB * LIFT, vR));
        // lift oldi (1,8 m) va zinaga oʻtish; chorakning qolgani — texnik xona (1-qavatda velo / kolyaska)
        const vH = vR - J.sB * (LIFT + 2.4);   // lift oldi ≥ lift chuqurligi
        S.halls.push(box(A, qu0 - dirU * 0.02, uR, vH, vR - J.sB * LIFT + J.sB * 0.02));
        if (nL * LIFT < Math.abs(uR - qu0) - 0.3) S.halls.push(box(A, qu0 - dirU * 0.02, uR - dirU * nL * LIFT, vR - J.sB * LIFT, vR));
        if (Math.abs(vH - qv0) >= 1.5) S.rooms.push(box(A, qu0, uR, qv0 - J.sB * 0.02, vH)); else S.halls.push(box(A, qu0 - dirU * 0.02, uR, qv0 - J.sB * 0.02, vH));
        S.entry = inter([box(A, J.uX - 1.2, J.uX + 1.2, axisV(A) - J.sB * W / 2 + J.sB * 0.02, J.sB > 0 ? A.v0 : A.v1)], [r]);
        if (S.stairs.length) { S.corner = true; continue; }
      }
    }
    // oddiy yadro: koridori eng uzun qism, hovli tomonida; derazasiz fasad qismi birinchi navbatda
    const p = [...ps].sort((a, b) => (b.t1 - b.t0) - (a.t1 - a.t0))[0], w = wings[p.wing];
    const lo = Math.max(p.t0, p.ua), hi = Math.min(p.t1, p.ub); if (hi - lo < 3) continue;
    const side = (w.double ? w.court : -w.court) as 1 | -1, ax = axisV(w), vIn = ax + side * W / 2;
    // haqiqiy fasad: u chizigʻi bilan bino konturi kesishuvi (trapetsiya va qiyshiq shakllarda yadro tashqariga chiqmasin)
    const facadeAt = (uu: number): number => { if (!pointIn(P(w, uu, vIn - side * 0.05), r)) return vIn; let best = side > 0 ? w.v1 + 1e3 : w.v0 - 1e3; for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length], ua = uOf(w, a), ub = uOf(w, b); if ((ua - uu) * (ub - uu) > 0 || Math.abs(ub - ua) < 1e-9) continue; const v = vOf(w, a) + (vOf(w, b) - vOf(w, a)) * (uu - ua) / (ub - ua); if ((v - vIn) * side > 0.01 && Math.abs(v - vIn) < Math.abs(best - vIn)) best = v; } return Math.abs(best - vIn) > 500 ? vIn : best; };
    const cw = Math.min(hi - lo, LIFT + 2.4 + STAIR_W);   // liftlar | lift oldi (≥ lift chuqurligi) | zina
    const depthAt = (u: number) => Math.min(Math.abs(facadeAt(u + 0.15) - vIn), Math.abs(facadeAt(u + cw - 0.15) - vIn));
    const cand = new Set<number>([lo, hi - cw]); for (let u = grid(w, lo); u + cw <= hi + 0.01; u += w.mw) if (u >= lo - 0.01) cand.add(u);
    for (const u of [...cand]) if (depthAt(u) < LIFT + 2.4) cand.delete(u);   // yadro sigʻmaydi
    if (!cand.size) continue;
    let vOut = vIn, d = 0;
    const lost = (u: number) => mods.filter(m => { if (m.blind) return false; const c: XY = [(m.a[0] + m.b[0]) / 2, (m.a[1] + m.b[1]) / 2], dx = m.b[0] - m.a[0], dy = m.b[1] - m.a[1], l = Math.hypot(dx, dy) || 1, q: XY = [c[0] - dy / l * 0.4, c[1] + dx / l * 0.4], qu = uOf(w, q), qv = vOf(w, q); return qu > u && qu < u + cw && (qv - vIn) * side > 0 && (qv - vOut) * side < 0.5; }).length;
    // yadro bilan devor / koridor uchi orasida kvartira sigʻmaydigan tor boʻlak qolmasin
    // devor yonidagi tor boʻlak (qoʻshni kvartira yoʻq) torets yonidagidan yomonroq
    const gap = (g: number, k: EndKind) => g > 0.3 && g < 4.5 ? (k === 'wall' ? 60 : 50) : 0, cost = (u: number) => lost(u) * 10 + gap(u - lo, p.k0) + gap(hi - u - cw, p.k1) + Math.abs(u + cw / 2 - mid) * 0.05;
    const mid = (p.ua + p.ub) / 2;
    { const d0 = depthAt(lo); vOut = vIn + side * Math.min(d0, LIFT + 1.4 + STAIR_D + MOD); }
    const uc0 = [...cand].sort((a, b) => cost(a) - cost(b))[0], uc1 = uc0 + cw;
    { const dd = depthAt(uc0); d = dd > LIFT + 1.4 + STAIR_D + MOD ? LIFT + 1.4 + STAIR_D : dd; vOut = vIn + side * d; }
    // yadro (koridordan fasadga): liftlar ustuni | lift oldi xolli (eni ≥ lift chuqurligi, fasadgacha — tabiiy yorugʻlik va kirish) | zina (marshlar fasadga perpendikulyar, derazali)
    const nL = d >= 2 * LIFT + 0.3 ? 2 : 1, uh0 = uc0 + LIFT, uh1 = Math.max(uh0 + 1.6, uc1 - STAIR_W);
    S.stairs.push(box(w, uh1, uc1, vIn, vOut));
    for (let k = 0; k < nL; k++) S.lifts.push(box(w, uc0, uh0, vIn + side * k * LIFT, vIn + side * (k + 1) * LIFT));
    const vLe = vIn + side * nL * LIFT;
    if (Math.abs(vOut - vLe) >= 1.2) S.rooms.push(box(w, uc0, uh0, vLe, vOut)); else if (Math.abs(vOut - vLe) > 0.05) S.lifts[S.lifts.length - 1] = box(w, uc0, uh0, vIn + side * (nL - 1) * LIFT, vOut);
    S.halls.push(box(w, uh0 - 0.02, uh1 + 0.02, vIn - side * 0.02, vOut));
    // skvoznoy kirish (1-qavat): koridorning narigi tomonidan koʻcha fasadigacha, xoll enida
    if (w.double) { const vo = side > 0 ? w.v0 : w.v1; S.entry = inter([box(w, uh0, uh1, ax - side * W / 2 + side * 0.02, vo)], [r]); }
  }
  const blockers = SECS.flatMap(S => [...S.corr, ...S.stairs, ...S.lifts, ...S.halls, ...S.rooms]);
  const secMop = SECS.map(S => union([...S.corr, ...S.halls]));
  // yadro egallagan oraliqlar (qanot, tomon) — tasmani uzadi
  const coreIv = (w: Wing, side: number): [number, number][] => SECS.flatMap(S => [...S.stairs, ...S.lifts, ...S.halls, ...S.rooms]).flatMap(q => inter([q], [w.ring])).filter(q => area(q) > 0.5 && (vOf(w, cen(q)) - axisV(w)) * side > 0).map(q => { const us = q.map(p => uOf(w, p)); return [Math.min(...us), Math.max(...us)] as [number, number]; });

  // 5) kvartiralar: har qism — torets va tomon tasmalari, modul toʻrida
  const apts: RuleApt[] = [];
  const mk = (ring: XY[], k: number, wi: number, sec: number, court?: boolean): RuleApt => ({ rooms: k, ring, area: area(ring), door: cen(ring), mods: [], wet: [], walls: [], wing: wi, sec, court: court ?? (vOf(wings[wi], cen(ring)) - axisV(wings[wi])) * wings[wi].court > 1.5 });
  for (const p of parts) {
    const w = wings[p.wing], wi = p.wing, cut = (bx: XY[]) => diff(inter([w.ring], [bx]), blockers);
    const a = Math.min(p.ub, Math.max(p.ua, p.t0)), b = Math.max(p.ua, Math.min(p.ub, p.t1));
    if (a > p.ua + 0.5) for (const z of cut(box(w, p.ua, a, w.v0 - 1, w.v1 + 1))) if (area(z) > 2) apts.push(mk(z, 0, wi, p.sec, false));
    if (b < p.ub - 0.5) for (const z of cut(box(w, b, p.ub, w.v0 - 1, w.v1 + 1))) if (area(z) > 2) apts.push(mk(z, 0, wi, p.sec, false));
    const ax = axisV(w), sides: (1 | -1)[] = w.double ? [1, -1] : [(-w.court) as 1 | -1];
    for (const side of sides) {
      const vIn = ax + side * W / 2, vOut = side > 0 ? w.v1 : w.v0, depth = Math.abs(vOut - vIn); if (depth < 3 || b - a < 0.5) continue;
      // tasma oraligʻi minus yadrolar
      let ivs: [number, number][] = [[a, b]];
      for (const [c0, c1] of coreIv(w, side)) ivs = ivs.flatMap(([x, y]) => c1 <= x + 0.05 || c0 >= y - 0.05 ? [[x, y] as [number, number]] : [[x, c0], [c1, y]].filter(([m, n]) => n - m > 0.3) as [number, number][]);
      for (const [ia, ib] of ivs) {
        const Lb = ib - ia, m = Math.round(Lb / w.mw); if (m < 1) continue;
        const pk: { k: number; n: number }[] = []; let used = 0;
        while (used < m) { const k = wantK(), nk = Math.max(1, Math.round(target(k) / (w.mw * depth))); const t = Math.min(nk, m - used); pk.push({ k, n: t }); used += t; }
        if (pk.length > 1) { const l = pk[pk.length - 1]; if (l.n * w.mw * depth < 28 / 0.85) { pk[pk.length - 2].n += l.n; pk.pop(); } }
        let u = ia, acc = 0;
        pk.forEach((q, i) => { acc += q.n; const nx = i === pk.length - 1 ? ib : ia + acc * Lb / m; for (const z of cut(box(w, u, nx, Math.min(vIn, vOut) - 0.01, Math.max(vIn, vOut) + 0.01))) if (area(z) > 2) apts.push(mk(z, q.k, wi, p.sec, side === w.court)); u = nx; });
      }
    }
    for (const z of cut(box(w, p.ua, p.ub, w.v0 - 1, w.v1 + 1)).flatMap(z => diff([z], apts.filter(x => x.sec === p.sec).map(x => x.ring)))) if (area(z) > 2) apts.push(mk(z, 0, wi, p.sec));
  }

  // 6) tekshiruv va tuzatish (seksiya ichida)
  const winOf = (ring: XY[]) => mods.map((m, i) => ({ m, i })).filter(({ m }) => { if (m.blind) return false; const c: XY = [(m.a[0] + m.b[0]) / 2, (m.a[1] + m.b[1]) / 2], dx = m.b[0] - m.a[0], dy = m.b[1] - m.a[1], l = Math.hypot(dx, dy) || 1; return pointIn([c[0] - dy / l * 0.4, c[1] + dx / l * 0.4], ring); }).map(x => x.i);
  const front = (ring: XY[]) => winOf(ring).reduce((t, i) => t + Math.hypot(mods[i].b[0] - mods[i].a[0], mods[i].b[1] - mods[i].a[1]), 0);
  const door = (a: RuleApt) => sharedAny(a.ring, secMop[a.sec] ?? []).len >= 0.9;
  const lit = (ring: XY[]) => { const f = front(ring); return f > 0 && area(ring) / f <= MAX_DEPTH; };
  const ok = (a: RuleApt) => door(a) && lit(a.ring) && area(a.ring) >= 28;
  for (let g = 0; g < 6; g++) {
    let changed = false;
    for (let i = apts.length - 1; i >= 0; i--) {
      const a = apts[i]; if (ok(a)) continue;
      // shu seksiyadagi, eshigi bor, birlashganda yorugʻ qoladigan eng uzun chegarali qoʻshni
      const cands = apts.map((o, j) => ({ j, s: j === i || o.sec !== a.sec || !door(o) ? 0 : sharedEdge(a.ring, o.ring).len })).filter(c => c.s > 0.8).sort((x, y) => y.s - x.s);
      for (const c of cands) {
        const u = union([apts[c.j].ring, a.ring]); if (u.length !== 1 || area(u[0]) > target(4) * 1.35 || !lit(u[0])) continue;
        apts[c.j].ring = u[0]; apts[c.j].area = area(u[0]); apts[c.j].rooms = 0; apts.splice(i, 1); changed = true; break;
      }
    }
    if (!changed) break;
  }
  const rest: XY[][] = [];
  for (let i = apts.length - 1; i >= 0; i--) if (!ok(apts[i])) { rest.push(apts[i].ring); apts.splice(i, 1); }
  // yongʻin devorlari (seksiyalar orasida)
  const fireWalls: XY[][] = [];
  for (const p of parts) { const w = wings[p.wing]; if (p.k0 === 'wall') fireWalls.push(box(w, p.ua, p.ua + 0.1, w.v0, w.v1)); if (p.k1 === 'wall') fireWalls.push(box(w, p.ub - 0.1, p.ub, w.v0, w.v1)); }
  const sections: RuleSection[] = SECS.map((S, s) => ({ mop: secMop[s], stairs: S.stairs, lifts: S.lifts, apts: apts.map((a, i) => a.sec === s ? i : -1).filter(i => i >= 0), corridorLen: S.corr.reduce((t, q) => t + area(q), 0) / W, corner: S.corner, ...(S.entry?.length ? { entry: S.entry } : {}) }));
  const mop = secMop.flat(), stairs = SECS.flatMap(S => S.stairs), lifts = SECS.flatMap(S => S.lifts);
  const rooms: PlanRoom[] = SECS.flatMap((S, s) => S.rooms.map(q => ({ ring: q, kind: 'texnik' as RoomKind, sec: s, door: cen(q) })));
  const plan: RulePlan = { kind: wings.every(w => w.double) ? 'ikki' : wings.every(w => !w.double) ? 'bir' : 'aralash', stairs, lifts, mop, apts, sections, fireWalls, rest, rooms, corridorLen: Math.max(0, ...sections.map(s => s.corridorLen)), corridorW: W };
  plan.rest.push(...diff([r], [...mop, ...stairs, ...lifts, ...apts.map(a => a.ring), ...rest, ...fireWalls, ...rooms.map(q => q.ring)], 'none').filter(q => area(q) > 1.5));
  finishPlan(plan, mods, size);
  return plan;
}

/** kvartiralar umumiy maydoni ≈ yalpi × 0,85 (TAXMIN: devorlar) */
export const totalArea = (pl: RulePlan, idx?: number[]) => (idx ? idx.map(i => pl.apts[i]) : pl.apts).reduce((s, a) => s + a.area, 0) * 0.85;

const winsIn = (ring: XY[], mods: FacadeMod[]) => mods.map((m, i) => ({ m, i })).filter(({ m }) => { if (m.blind) return false; const c: XY = [(m.a[0] + m.b[0]) / 2, (m.a[1] + m.b[1]) / 2], dx = m.b[0] - m.a[0], dy = m.b[1] - m.a[1], l = Math.hypot(dx, dy) || 1; return pointIn([c[0] - dy / l * 0.4, c[1] + dx / l * 0.4], ring); }).map(x => x.i);
const secOfRing = (pl: RulePlan, ring: XY[], fallback: number) => { let bs = fallback, bl = -1; pl.sections.forEach((s, k) => { const l = sharedAny(ring, s.mop).len; if (l > bl + 0.01) { bl = l; bs = k; } }); return bs; };
/**
 * Kvartiralarning hosila maydonlari: maydon, derazalar, xonalar soni (maydonga koʻra, derazalardan koʻp emas), eshik
 * (oʻz seksiyasi MOP i bilan eng uzun umumiy chegara), sanuzel, xona boʻlinmalari; seksiyalar roʻyxati. Tahrirdan keyin ham chaqiriladi.
 */
export function finishPlan(plan: RulePlan, mods: FacadeMod[], size: 'S' | 'M' | 'L' = 'M', keepRooms = false): RulePlan {
  const target = (k: number) => AREA[size][Math.max(1, Math.min(4, k))];
  for (const a of plan.apts) {
    a.sec = secOfRing(plan, a.ring, a.sec);
    a.area = area(a.ring); a.mods = winsIn(a.ring, mods);
    const byArea = a.area <= (target(1) + target(2)) / 2 ? 1 : a.area <= (target(2) + target(3)) / 2 ? 2 : a.area <= (target(3) + target(4)) / 2 ? 3 : 4;
    if (!a.rooms || (!keepRooms && Math.abs(target(a.rooms) - a.area) > 0.2 * target(a.rooms))) a.rooms = byArea;
    a.rooms = Math.max(1, Math.min(a.rooms, a.mods.length));   // har yashash xonasi derazali
    a.door = sharedAny(a.ring, plan.sections[a.sec]?.mop ?? plan.mop).mid;
    a.wet = wetZone(a.ring, a.door);
    a.walls = roomWalls(a, mods);
  }
  for (const q of plan.rooms) { q.sec = secOfRing(plan, q.ring, q.sec); q.door = sharedAny(q.ring, plan.sections[q.sec]?.mop ?? plan.mop).mid; }
  plan.sections.forEach((s, k) => { s.apts = plan.apts.map((a, i) => a.sec === k ? i : -1).filter(i => i >= 0); });
  return plan;
}

/* ---------------- qavat turlari ---------------- */
/**
 * 'ground' — 1-qavat noturar: koʻcha tomoni savdo / xizmat, hovli tomoni yashovchilar xonalari (zal, velo-kolyaska, omborlar,
 *   tozalash anjomlari ombori — ShNQ 2.08.01-19, 3.14, 2022-y. 22-son buyruq tahririda); 'nonres' — 2-qavat va yuqori noturar;
 * 'first' — 1-qavat turar (kvartiralar, texnik xona — velo / kolyaska); 'typical' — turar qavat.
 */
export type FloorType = 'ground' | 'nonres' | 'first' | 'typical';
export function floorVariant(pl: RulePlan, t: FloorType, mods: FacadeMod[] = [], size: 'S' | 'M' | 'L' = 'M'): RulePlan {
  if (t === 'typical') return pl;
  // skvoznoy kirish (Strelka katalogi, «Входная группа»: chiziqli uylarda ikki tomonlama kirish — koʻcha va hovli): koʻcha tomondagi xoll
  const entries = pl.sections.flatMap(s => s.entry ?? []);
  const frags: { ring: XY[]; sec: number }[] = [];
  /** kirish xolli kesib oʻtgan xona: eng katta boʻlagi qoladi, qolganlari — alohida (keyin xona yoki qoʻshniga) */
  const cutE = (ring: XY[], sec = 0): XY[] | null => { if (!entries.length) return ring; const ps = diff([ring], entries, 'none').sort((x, y) => area(y) - area(x)); for (const f of ps.slice(1)) if (area(f) > 1.5) frags.push({ ring: f, sec }); return ps[0] ?? null; };
  const placeFrags = (rooms: PlanRoom[], mop: XY[][], sections: RuleSection[]) => { for (const f of frags) {
    if (sharedAny(f.ring, sections[f.sec]?.mop ?? mop).len >= 0.9) { rooms.push({ ring: f.ring, kind: 'ombor', sec: f.sec, door: cen(f.ring) }); continue; }
    const nb = rooms.map((q, i) => ({ i, l: sharedEdge(f.ring, q.ring).len })).sort((a, b) => b.l - a.l)[0];
    if (nb && nb.l > 0.5) { const u = union([rooms[nb.i].ring, f.ring]); if (u.length === 1) { rooms[nb.i].ring = u[0]; continue; } }
    rooms.push({ ring: f.ring, kind: 'texnik', sec: f.sec, door: cen(f.ring) }); } };
  const sections = pl.sections.map(s => ({ ...s, mop: s.entry?.length ? union([...s.mop, ...s.entry]) : s.mop }));
  const mop = sections.flatMap(s => s.mop);
  const rooms: PlanRoom[] = pl.rooms.map(q => ({ ...q, ring: cutE(q.ring, q.sec) ?? q.ring, kind: (t === 'nonres' ? 'savdo' : 'velo') as RoomKind }));
  if (t === 'first') {
    const apts: RuleApt[] = [];
    for (const a of pl.apts) { const r2 = cutE(a.ring, a.sec); if (!r2) continue; if (area(r2) >= 28 && sharedAny(r2, sections[a.sec]?.mop ?? mop).len >= 0.9 && winsIn(r2, mods).length) apts.push({ ...a, ring: r2 }); else rooms.push({ ring: r2, kind: 'velo', sec: a.sec, door: a.door }); }
    placeFrags(rooms, mop, sections);
    return finishPlan({ ...pl, apts, rooms, mop, sections }, mods, size, true);
  }
  const amen: RuleApt[] = [];
  for (const a of pl.apts) { const r2 = cutE(a.ring, a.sec); if (!r2 || area(r2) < 3) continue; if (t === 'ground' && a.court) amen.push({ ...a, ring: r2, area: area(r2) }); else rooms.push({ ring: r2, kind: 'savdo', sec: a.sec, door: a.door }); }
  // hovli tomoni: eng kattasi — zal, eng kichigi — tozalash anjomlari ombori (3.14), qolganlari — velo / kolyaska va omborlar navbat bilan
  amen.sort((x, y) => y.area - x.area).forEach((a, i, arr) => rooms.push({ ring: a.ring, kind: i === arr.length - 1 && arr.length > 1 ? 'tozalash' : i === 0 ? 'zal' : i % 2 ? 'velo' : 'ombor', sec: a.sec, door: a.door }));
  if (t === 'ground' && amen.length < 2) { const sm = rooms.filter(q => q.kind === 'velo' || q.kind === 'savdo').sort((x, y) => area(x.ring) - area(y.ring))[0]; if (sm) sm.kind = 'tozalash'; }
  placeFrags(rooms, mop, sections);
  const n: RulePlan = { ...pl, apts: [], rooms, mop, sections: sections.map(s => ({ ...s, apts: [] })) };
  for (const q of n.rooms) q.door = sharedAny(q.ring, n.sections[q.sec]?.mop ?? mop).mid;
  return n;
}

/* ---------------- qoʻlda tahrir ---------------- */
const clone = (pl: RulePlan): RulePlan => ({ ...pl, apts: pl.apts.map(a => ({ ...a, ring: a.ring.map(p => [p[0], p[1]] as XY) })), rooms: pl.rooms.map(q => ({ ...q })), sections: pl.sections.map(s => ({ ...s })) });
export type EditResult = { ok: true; plan: RulePlan } | { ok: false; why: string };
/** i va j kvartiralarni birlashtirish */
export function editMerge(pl: RulePlan, i: number, j: number, mods: FacadeMod[], size: 'S' | 'M' | 'L' = 'M'): EditResult {
  const a = pl.apts[i], b = pl.apts[j]; if (!a || !b || i === j) return { ok: false, why: 'ikki kvartira tanlang' };
  if (sharedEdge(a.ring, b.ring).len < 0.9) return { ok: false, why: 'kvartiralar yonma-yon emas' };
  const u = union([a.ring, b.ring]); if (u.length !== 1) return { ok: false, why: 'birlashma bitta xona boʻlmadi' };
  const n = clone(pl); n.apts[i].ring = u[0]; n.apts[i].rooms = 0; n.apts.splice(j, 1); return { ok: true, plan: finishPlan(n, mods, size) };
}
/** Kvartirani ikkiga boʻlish: koridor devoriga perpendikulyar, oʻrtaga eng yaqin modul chegarasidan; har yarmiga eshik va deraza shart */
export function editSplit(pl: RulePlan, i: number, mods: FacadeMod[], size: 'S' | 'M' | 'L' = 'M'): EditResult {
  const a = pl.apts[i]; if (!a) return { ok: false, why: 'kvartira tanlang' };
  const mop = pl.sections[a.sec]?.mop ?? pl.mop;
  let d: XY | null = null, bl = 0;
  for (let k = 0; k < a.ring.length; k++) { const p = a.ring[k], q = a.ring[(k + 1) % a.ring.length], l = Math.hypot(q[0] - p[0], q[1] - p[1]); if (l < 1) continue; const s = sharedAny([p, q], mop).len / 2; if (s > bl) { bl = s; d = [(q[0] - p[0]) / l, (q[1] - p[1]) / l]; } }
  if (!d) return { ok: false, why: 'kvartiraning koridorga chegarasi yoʻq' };
  const D = d, t = (p: XY) => p[0] * D[0] + p[1] * D[1], ts = a.ring.map(t), t0 = Math.min(...ts), t1 = Math.max(...ts);
  const marks = a.mods.flatMap(m => [mods[m].a, mods[m].b]).map(t).filter(x => x > t0 + 2 && x < t1 - 2);
  const mid = (t0 + t1) / 2, tc = marks.length ? marks.sort((x, y) => Math.abs(x - mid) - Math.abs(y - mid))[0] : mid;
  return editSplitAt(pl, i, D, tc, mods, size);
}
/** Kvartirani U yoʻnalishi boʻyicha t nuqtadan perpendikulyar devor bilan ikkiga boʻlish */
export function editSplitAt(pl: RulePlan, i: number, U: XY, tc: number, mods: FacadeMod[], size: 'S' | 'M' | 'L' = 'M'): EditResult {
  const a = pl.apts[i]; if (!a) return { ok: false, why: 'kvartira tanlang' };
  const mop = pl.sections[a.sec]?.mop ?? pl.mop;
  const N: XY = [-U[1], U[0]], c = cen(a.ring), n0 = c[0] * N[0] + c[1] * N[1], ts = a.ring.map(p => p[0] * U[0] + p[1] * U[1]), t0 = Math.min(...ts), t1 = Math.max(...ts);
  const P = (tt: number, nn: number): XY => [U[0] * tt + N[0] * nn, U[1] * tt + N[1] * nn];
  const half = (s0: number, s1: number): XY[] => [P(s0, n0 - 200), P(s1, n0 - 200), P(s1, n0 + 200), P(s0, n0 + 200)];
  const A = inter([a.ring], [half(t0 - 1, tc)]).sort((x, y) => area(y) - area(x)), B = inter([a.ring], [half(tc, t1 + 1)]).sort((x, y) => area(y) - area(x));
  if (!A.length || !B.length) return { ok: false, why: 'chiziq kvartirani kesmaydi' };
  if (A.length > 1 || B.length > 1) return { ok: false, why: 'chiziq kvartirani ikkidan koʻp boʻlakka boʻladi' };
  for (const h of [A[0], B[0]]) { if (area(h) < 12) return { ok: false, why: 'boʻlaklardan biri juda kichik' }; if (sharedAny(h, mop).len < 0.9) return { ok: false, why: 'boʻlaklardan biri koridorga tegmaydi (eshik yoʻq)' }; if (!winsIn(h, mods).length) return { ok: false, why: 'boʻlaklardan birida deraza yoʻq' }; }
  const n = clone(pl); n.apts[i] = { ...n.apts[i], ring: A[0], rooms: 0 }; n.apts.splice(i + 1, 0, { ...n.apts[i], ring: B[0], rooms: 0 });
  return { ok: true, plan: finishPlan(n, mods, size) };
}
/**
 * Devor chizish (magnitli): kursorga eng yaqin kvartira qirrasi yoʻnalishida, perpendikulyar devor; oʻrni modul chegarasiga
 * (0,6 m gacha) yoki 0,1 m qadamga tortiladi. Qaytaradi: devor chizigʻi va ikki tomondagi masofalar.
 */
export function wallPreview(pl: RulePlan, i: number, cur: XY, mods: FacadeMod[]): { U: XY; t: number; line: [XY, XY]; w1: number; w2: number; snapped: boolean } | null {
  const a = pl.apts[i]; if (!a) return null;
  let U: XY | null = null, bd = Infinity;
  for (let k = 0; k < a.ring.length; k++) { const p = a.ring[k], q = a.ring[(k + 1) % a.ring.length], l = Math.hypot(q[0] - p[0], q[1] - p[1]); if (l < 2) continue; const ux = (q[0] - p[0]) / l, uy = (q[1] - p[1]) / l, tt = Math.max(0, Math.min(l, (cur[0] - p[0]) * ux + (cur[1] - p[1]) * uy)), d = Math.hypot(p[0] + ux * tt - cur[0], p[1] + uy * tt - cur[1]); if (d < bd) { bd = d; U = [ux, uy]; } }
  if (!U) return null;
  const T = (p: XY) => p[0] * U![0] + p[1] * U![1], N: XY = [-U[1], U[0]], ts = a.ring.map(T), t0 = Math.min(...ts), t1 = Math.max(...ts);
  let t = T(cur), snapped = false;
  const marks = mods.flatMap(m => [m.a, m.b]).filter(p => pointIn(p, a.ring) || a.ring.some((q, k) => { const r2 = a.ring[(k + 1) % a.ring.length]; return Math.abs((p[0] - q[0]) * (r2[1] - q[1]) - (p[1] - q[1]) * (r2[0] - q[0])) < 0.05 * Math.hypot(r2[0] - q[0], r2[1] - q[1]); })).map(T);
  const near = marks.sort((x, y) => Math.abs(x - t) - Math.abs(y - t))[0];
  if (near != null && Math.abs(near - t) < 0.6) { t = near; snapped = true; } else t = Math.round(t * 10) / 10;
  t = Math.max(t0 + 1.2, Math.min(t1 - 1.2, t));
  const ns = a.ring.map(p => p[0] * N[0] + p[1] * N[1]), n0 = Math.min(...ns), n1 = Math.max(...ns), P = (nn: number): XY => [U![0] * t + N[0] * nn, U![1] * t + N[1] * nn];
  return { U, t, line: [P(n0), P(n1)], w1: t - t0, w2: t1 - t, snapped };
}
/** i va j orasidagi devorni j tomonga step metrga surish (i kattalashadi) */
export function editShift(pl: RulePlan, i: number, j: number, step: number, mods: FacadeMod[], size: 'S' | 'M' | 'L' = 'M'): EditResult {
  const a = pl.apts[i], b = pl.apts[j]; if (!a || !b || i === j) return { ok: false, why: 'ikki kvartira tanlang' };
  const se = sharedEdge(a.ring, b.ring); if (se.len < 0.9) return { ok: false, why: 'kvartiralar yonma-yon emas' };
  let d: XY | null = null, bl = 0;
  for (let k = 0; k < a.ring.length; k++) { const p = a.ring[k], q = a.ring[(k + 1) % a.ring.length], l = Math.hypot(q[0] - p[0], q[1] - p[1]); if (l < 0.5) continue; const s = sharedEdge([p, q], b.ring).len / 2; if (s > bl) { bl = s; d = [(q[0] - p[0]) / l, (q[1] - p[1]) / l]; } }
  if (!d) return { ok: false, why: 'chegara topilmadi' };
  let N: XY = [-d[1], d[0]]; const cb = cen(b.ring); if ((cb[0] - se.mid[0]) * N[0] + (cb[1] - se.mid[1]) * N[1] < 0) N = [-N[0], -N[1]];
  const m = se.mid, slab: XY[] = [[m[0] - d[0] * 200, m[1] - d[1] * 200], [m[0] + d[0] * 200, m[1] + d[1] * 200], [m[0] + d[0] * 200 + N[0] * step, m[1] + d[1] * 200 + N[1] * step], [m[0] - d[0] * 200 + N[0] * step, m[1] - d[1] * 200 + N[1] * step]];
  const strip = inter([b.ring], [slab]); if (!strip.length) return { ok: false, why: 'surib boʻlmadi' };
  const na = union([a.ring, ...strip]), nb = diff([b.ring], strip).sort((x, y) => area(y) - area(x));
  if (na.length !== 1 || !nb.length || area(nb[0]) < 20) return { ok: false, why: 'qoʻshni kvartira juda kichrayadi' };
  const mop = pl.sections[b.sec]?.mop ?? pl.mop;
  if (sharedAny(nb[0], mop).len < 0.9) return { ok: false, why: 'qoʻshni kvartira koridordan uziladi' };
  if (!winsIn(nb[0], mods).length) return { ok: false, why: 'qoʻshni kvartira derazasiz qoladi' };
  const n = clone(pl); n.apts[i].ring = na[0]; n.apts[i].rooms = 0; n.apts[j].ring = nb[0]; n.apts[j].rooms = 0;
  return { ok: true, plan: finishPlan(n, mods, size) };
}
/** xonalar soni (derazalar sonidan koʻp emas) */
export function editRooms(pl: RulePlan, i: number, k: number, mods: FacadeMod[]): EditResult {
  const a = pl.apts[i]; if (!a) return { ok: false, why: 'kvartira tanlang' };
  if (k > a.mods.length) return { ok: false, why: `${a.mods.length} ta deraza — ${k} xona sigʻmaydi (har xona derazali)` };
  const n = clone(pl); n.apts[i].rooms = k; n.apts[i].walls = roomWalls(n.apts[i], mods); return { ok: true, plan: n };
}
/** kvartirani texnik / ombor xonasiga aylantirish */
export function editKind(pl: RulePlan, i: number, kind: RoomKind, mods: FacadeMod[], size: 'S' | 'M' | 'L' = 'M'): EditResult {
  const a = pl.apts[i]; if (!a) return { ok: false, why: 'kvartira tanlang' };
  const n = clone(pl); n.apts.splice(i, 1); n.rooms.push({ ring: a.ring, kind, sec: a.sec, door: a.door }); return { ok: true, plan: finishPlan(n, mods, size) };
}
/** xonani kvartiraga qaytarish (derazasi boʻlsa) */
export function editRoomToApt(pl: RulePlan, r: number, mods: FacadeMod[], size: 'S' | 'M' | 'L' = 'M'): EditResult {
  const q = pl.rooms[r]; if (!q) return { ok: false, why: 'xona tanlang' };
  if (!winsIn(q.ring, mods).length) return { ok: false, why: 'derazasiz xona kvartira boʻla olmaydi' };
  const n = clone(pl); n.rooms.splice(r, 1); n.apts.push({ rooms: 0, ring: q.ring, area: area(q.ring), door: q.door, mods: [], wet: [], walls: [], wing: 0, sec: q.sec }); return { ok: true, plan: finishPlan(n, mods, size) };
}
/** Saqlangan tahrir: kvartiralar va xonalar halqalari bilan generatsiya qilingan rejaga qoʻllash */
export interface PlanEditLocal { apts: { ring: XY[]; rooms: number }[]; rooms: { ring: XY[]; kind: RoomKind }[] }
export function applyEdit(pl: RulePlan, e: PlanEditLocal, mods: FacadeMod[], size: 'S' | 'M' | 'L' = 'M'): RulePlan {
  const n: RulePlan = { ...pl, apts: e.apts.map(a => ({ rooms: a.rooms, ring: a.ring, area: area(a.ring), door: cen(a.ring), mods: [], wet: [], walls: [], wing: 0, sec: 0 })), rooms: e.rooms.map(q => ({ ring: q.ring, kind: q.kind, sec: 0, door: cen(q.ring) })), sections: pl.sections.map(s => ({ ...s })) };
  const all = [...n.apts.map(a => a.ring), ...n.rooms.map(q => q.ring)];
  n.rest = diff(diff(pl.rest, all, 'none'), [], 'none');
  return finishPlan(n, mods, size, true);
}

/** Sanuzel + dahliz: eshik yonida, eshik devoriga parallel 3 × 2,2 m, kvartira ichida */
function wetZone(ring: XY[], door: XY): XY[] {
  let ei = 0, bd = Infinity;
  for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((door[0] - a[0]) * dx + (door[1] - a[1]) * dy) / L2)), d = Math.hypot(a[0] + t * dx - door[0], a[1] + t * dy - door[1]); if (d < bd) { bd = d; ei = i; } }
  const a = ring[ei], b = ring[(ei + 1) % ring.length], tl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, tx = (b[0] - a[0]) / tl, ty = (b[1] - a[1]) / tl;
  let nx = -ty, ny = tx; if (!pointIn([door[0] + nx * 0.3, door[1] + ny * 0.3], ring)) { nx = -nx; ny = -ny; }
  const w = 1.5, d = 2.2, z: XY[] = [[door[0] - tx * w, door[1] - ty * w], [door[0] + tx * w, door[1] + ty * w], [door[0] + tx * w + nx * d, door[1] + ty * w + ny * d], [door[0] - tx * w + nx * d, door[1] - ty * w + ny * d]];
  return inter([z], [ring]).sort((x, y) => area(y) - area(x))[0] ?? [];
}

/** Xona boʻlinmalari: qoʻshni fasad modullari orasidan ichkariga (kvartira chuqurligining ~55 %) */
function roomWalls(a: RuleApt, mods: FacadeMod[]): [XY, XY][] {
  const out: [XY, XY][] = [], ms = [...a.mods].sort((x, y) => x - y).map(i => mods[i]), c = cen(a.ring);
  for (let j = 1; j < ms.length; j++) {
    const m = ms[j], pm = ms[j - 1]; if (Math.hypot(m.a[0] - pm.b[0], m.a[1] - pm.b[1]) > 0.05) continue;
    const dx = m.b[0] - m.a[0], dy = m.b[1] - m.a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, dep = Math.abs((c[0] - m.a[0]) * nx + (c[1] - m.a[1]) * ny) * 1.1;
    out.push([m.a, [m.a[0] + nx * dep, m.a[1] + ny * dep]]);
  }
  return out;
}

/** Kvartira turlari ketma-ketligi: har qadamda ulushidan eng koʻp orqada qolgan tur */
function mixPicker(mix: number[]): () => number {
  const tot = mix.reduce((a, b) => a + b, 0) || 1, w = mix.map(v => v / tot), placed = mix.map(() => 0); let n = 0;
  return () => { n++; let k = 0, best = -Infinity; w.forEach((s, i) => { const d = s * n - placed[i]; if (s > 0 && d > best) { best = d; k = i; } }); placed[k]++; return k + 1; };
}

/* ---------------- qoidalar tekshiruvi ---------------- */
export interface PlanCheck { id: string; title: string; ok: boolean | null; value: string; norm: string; source: string }
const f1 = (v: number) => v.toFixed(1).replace('.', ',');
/** h — yuqori turar qavat poli sathi (m); mods — fasad modullari (yorugʻlik tekshiruvi uchun) */
export function planChecks(pl: RulePlan, h: number, mods: FacadeMod[] = []): PlanCheck[] {
  const secs = pl.sections.length ? pl.sections : [{ mop: pl.mop, stairs: pl.stairs, lifts: pl.lifts, apts: pl.apts.map((_, i) => i), corridorLen: pl.corridorLen, corner: false }];
  const secOf = (i: number) => secs.find(s => s.apts.includes(i));
  const noDoor = pl.apts.filter((a, i) => sharedAny(a.ring, secOf(i)?.mop ?? []).len < 0.9).length;
  const noWin = pl.apts.filter(a => !a.mods.length).length;
  const fr = (a: RuleApt) => a.mods.reduce((t, i) => t + (mods[i] ? Math.hypot(mods[i].b[0] - mods[i].a[0], mods[i].b[1] - mods[i].a[1]) : MOD), 0);
  const deep = pl.apts.map(a => a.area / Math.max(0.1, fr(a))), maxDeep = Math.max(0, ...deep), dark = deep.filter(d => d > MAX_DEPTH + 0.05).length;
  let overlap = 0; for (let i = 0; i < pl.apts.length; i++) for (let j = i + 1; j < pl.apts.length; j++) overlap += inter([pl.apts[i].ring], [pl.apts[j].ring]).reduce((s, q) => s + area(q), 0);
  const big = secs.map(s => totalArea(pl, s.apts)), over = big.filter((A, k) => A > 500 && secs[k].stairs.length < 2).length;
  const perSec = secs.map(s => s.apts.length), maxPer = Math.max(0, ...perSec);
  const far = Math.max(0, ...pl.apts.map((a, i) => { const s = secOf(i); const sc = (s?.stairs ?? pl.stairs).map(cen); return sc.length ? Math.min(...sc.map(c => Math.abs(a.door[0] - c[0]) + Math.abs(a.door[1] - c[1]))) : 0; }));
  const rest = pl.rest.reduce((t, q) => t + area(q), 0);
  return [
    { id: 'mop', title: 'Har kvartiraga eshik oʻz seksiyasi koridoridan', ok: noDoor === 0 && overlap < 0.5, value: noDoor ? `${noDoor} ta kvartiraga MOP dan kirish yoʻq` : `${pl.apts.length} / ${pl.apts.length}, boshqa kvartira orqali kirish yoʻq`, norm: 'kirish → zina-lift → koridor → kvartira', source: 'Rejalash qoidasi (evakuatsiya yoʻli faqat umumiy joylar orqali)' },
    { id: 'win', title: 'Har kvartirada deraza', ok: noWin === 0, value: noWin ? `${noWin} ta derazasiz` : 'hammasida', norm: 'har yashash xonasi fasadda', source: 'Rejalash qoidasi; insolyatsiya — SanQvaN 0331-16, 8.3' },
    { id: 'light', title: 'Kvartira chuqurligi (maydon / deraza fasadi)', ok: dark === 0, value: dark ? `${dark} ta qorongʻi kvartira` : `eng chuquri ≈ ${f1(maxDeep)} m`, norm: `≤ ${f1(MAX_DEPTH)} m (TAXMIN)`, source: 'Rejalash qoidasi; xona chuqurligi ≤ 6 m — SanQvaN 0331-16, 8.7' },
    { id: 'sec', title: 'Seksiyalar va kvartiralar soni seksiyada', ok: maxPer <= 8 ? true : null, value: `${secs.length} seksiya; seksiyada ${perSec.join(' / ')} kvartira`, norm: 'bitta zina-liftga ≤ 8 kvartira, uzun umumiy koridor yoʻq (TAXMIN)', source: 'Rejalash qoidasi — seksiyali uy' },
    { id: 'corr', title: 'Umumiy koridor eni', ok: pl.corridorW >= 1.2, value: `${f1(pl.corridorW)} m`, norm: '≥ 1,2 m', source: 'ShNQ 2.01.02-04, 5.27' },
    { id: 'lift', title: 'Lift oldi maydonchasi eni', ok: pl.corridorW >= 1.6, value: `${f1(pl.corridorW)} m`, norm: '≥ 1,6 m', source: 'ShNQ 2.01.02-04, 5.31' },
    { id: 'stairs', title: 'Evakuatsiya zinalari (seksiya boʻyicha)', ok: over === 0, value: `seksiya qavatida kvartiralar ≈ ${big.map(A => Math.round(A)).join(' / ')} m²`, norm: '> 500 m² — kamida 2 ta zina; ≤ 500 m² — 1 ta (> 15 m da kvartirada avariya chiqishi, 5.20)', source: 'ShNQ 2.01.02-04, 5.13' },
    { id: 'len', title: 'Umumiy koridor uzunligi', ok: pl.corridorLen <= 60, value: `eng uzuni ≈ ${Math.round(pl.corridorLen)} m`, norm: '> 60 m — 2-tur yongʻinga qarshi toʻsiq bilan boʻlinadi', source: 'ShNQ 2.01.02-04, 5.25' },
    { id: 'h28', title: 'Tutunsiz zina', ok: h > 28 ? null : true, value: `yuqori qavat ≈ ${Math.round(h)} m`, norm: h > 28 ? '> 28 m — tutunsiz zina (Н1) kerak' : '≤ 28 m — oddiy zina', source: 'ShNQ 2.01.02-04, 5.40' },
    { id: 'evac', title: 'Eng uzoq eshikdan zinagacha', ok: null, value: `≈ ${Math.round(far)} m`, norm: 'chegara ShNQ 2.08.01-19 da (5.23 havola qiladi) — matni kerak', source: 'ShNQ 2.01.02-04, 5.23' },
    ...(rest > 3 ? [{ id: 'rest', title: 'Kvartiraga aylanmagan maydon (texnik)', ok: rest < 15 ? true : null, value: `≈ ${Math.round(rest)} m²`, norm: 'kam boʻlsin', source: 'Rejalash qoidasi' } as PlanCheck] : []),
  ];
}

/** Kvartira halqasining tashqi devor (bino konturi) ustidagi qismlari — bino konturi yoʻnalishida (CCW, tashqi normal oʻngda) */
export function facadeSegs(ring: XY[], outer0: XY[], tol = 0.12): [XY, XY][] {
  const outer = signedArea(outer0) < 0 ? [...outer0].reverse() : outer0, out: [XY, XY][] = [];
  for (let i = 0; i < outer.length; i++) {
    const p = outer[i], q = outer[(i + 1) % outer.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]); if (L < 1e-6) continue;
    const ux = (q[0] - p[0]) / L, uy = (q[1] - p[1]) / L, iv: [number, number][] = [];
    for (let j = 0; j < ring.length; j++) {
      const r = ring[j], s = ring[(j + 1) % ring.length];
      if (Math.abs((r[0] - p[0]) * uy - (r[1] - p[1]) * ux) > tol || Math.abs((s[0] - p[0]) * uy - (s[1] - p[1]) * ux) > tol) continue;
      const t1 = (r[0] - p[0]) * ux + (r[1] - p[1]) * uy, t2 = (s[0] - p[0]) * ux + (s[1] - p[1]) * uy, lo = Math.max(0, Math.min(t1, t2)), hi = Math.min(L, Math.max(t1, t2));
      if (hi - lo > 0.05) iv.push([lo, hi]);
    }
    iv.sort((a, b) => a[0] - b[0]);
    for (const [lo, hi] of iv) out.push([[p[0] + ux * lo, p[1] + uy * lo], [p[0] + ux * hi, p[1] + uy * hi]]);
  }
  return out;
}
