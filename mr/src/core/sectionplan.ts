/**
 * Seksiya qavat rejasi — QOIDADAN boshlab:
 *   1) kommunikatsiya: zina-lift yadrosi → umumiy koridor (MOP);
 *   2) qolgan maydon koridorga PERPENDIKULYAR kesiladi → har kvartira bir tomoni bilan koridorga (eshik),
 *      ikkinchi tomoni bilan fasadga (deraza) tegadi; kesish chiziqlari fasad modullari toʻrida;
 *   3) tekshiruv: har kvartiraga MOP dan eshik (≥ 0,9 m umumiy chegara) va kamida bitta deraza.
 *      Shart bajarilmasa — qoʻshni kvartiraga qoʻshiladi; qoʻshib boʻlmasa — kvartira emas (texnik / ombor).
 *      Natijada hech bir kvartiraga boshqa kvartira orqali kirilmaydi.
 *
 * Qanotlar: shakl toʻgʻri toʻrtburchak qanotlarga boʻlinadi (botiq uchlardan). Qanot chuqurligi ≥ 13 m — ikki tomonlama
 * (oʻrta koridor), < 13 m — bir tomonlama (koridor orqa fasad boʻylab, kvartiralar oldi fasadga). Koridorlar qanotlar
 * tugunida tutashadi; erkin uchida torets kvartirasi (koridor uchiga eshik).
 *
 * Meʼyorlar (ShNQ 2.01.02-04, asl matn): 5.13 — seksiya qavatidagi kvartiralar umumiy maydoni > 500 m² boʻlsa ≥ 2 evakuatsiya
 * chiqishi (zina); 5.27 — umumiy koridor eni ≥ 1,2 m; 5.31 — lift oldi maydonchasi ≥ 1,6 m; 5.25 — koridor > 60 m boʻlinadi;
 * 5.40 — > 28 m binoda tutunsiz zina (Н1). Yadro, lift soni, kvartira maydonlari — TAXMIN (ShNQ 2.08.01-19 matni kerak).
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
  /** qanot indeksi */ wing: number;
}
export interface RulePlan {
  kind: 'ikki' | 'bir' | 'aralash';
  stairs: XY[][]; lifts: XY[][];
  /** koridor + lift oldi (MOP) */ mop: XY[][];
  apts: RuleApt[];
  /** kvartiraga aylanmagan qism — texnik / ombor */ rest: XY[][];
  corridorLen: number; corridorW: number;
}

export const CORR_W = 1.6;                 // TAXMIN: umumiy koridor 1,6 m (5.27 — ≥ 1,2 m; lift oldi 5.31 — ≥ 1,6 m)
const CORE_W = 6.0, STAIR_D = 2.8, LIFT = 2.2, STAIR2_W = 3.0;   // TAXMIN: yadro 6 m; zina 2,8 m chuqur; lift 2,2 × 2,2 m
const MOD = 3.3;
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

interface Wing { ring: XY[]; U: XY; V: XY; u0: number; u1: number; v0: number; v1: number; S: number; L: number; double: boolean; back: 1 | -1 }
type Seg = { w: Wing; t0: number; t1: number; v: number };
type Box = (w: Wing, ua: number, ub: number, va: number, vb: number) => XY[];

export function rulePlan(ring0: XY[], mods: FacadeMod[], mix: number[], size: 'S' | 'M' | 'L' = 'M'): RulePlan {
  const r = signedArea(ring0) < 0 ? [...ring0].reverse() : ring0, W = CORR_W;
  const target = (k: number) => AREA[size][Math.max(1, Math.min(4, k))];
  // 1) qanotlar
  const wingsR: XY[][] = [];
  const rec = (q: XY[], d: number) => { const o = obb2(q); if (area(q) / (o.L * o.S) >= 0.9 || d > 3) { wingsR.push(q); return; } const sp = splitAtReflex(q); if (!sp) { wingsR.push(q); return; } sp.forEach(x => rec(x, d + 1)); };
  rec(r, 0);
  const blindNear = (p: XY) => mods.some(m => m.blind && Math.hypot((m.a[0] + m.b[0]) / 2 - p[0], (m.a[1] + m.b[1]) / 2 - p[1]) < 2.5);
  // qanot yoʻnalishi: odatda OBB uzun oʻqi; lekin boshqa qanotga UZUN tomoni bilan butunlay tegib turgan qisqa «qoʻl»
  // (L burchagidan qolgan boʻlak) — oʻqi tutashuv chizigʻiga perpendikulyar (koridor asosiy koridordan davom etadi)
  const cutDir = (q: XY[], others: XY[][]): { d: XY; len: number } | null => {
    let best: { d: XY; len: number } | null = null;
    for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 1) continue; const s2 = others.reduce((t, o) => t + sharedEdge([a, b], o).len / 2, 0);   /* [a, b] — ikki qirra */ if (s2 > l * 0.8 && (!best || l > best.len)) best = { d: [(b[0] - a[0]) / l, (b[1] - a[1]) / l], len: l }; }
    return best;
  };
  const wings: Wing[] = wingsR.map((q, qi) => {
    const o = obb2(q); let U = o.U;
    const cd = wingsR.length > 1 ? cutDir(q, wingsR.filter((_, j) => j !== qi)) : null;
    if (cd && cd.len >= o.L * 0.8 && Math.abs(cd.d[0] * U[0] + cd.d[1] * U[1]) > 0.7) U = [-cd.d[1], cd.d[0]];
    const V: XY = [-U[1], U[0]];
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const p of q) { const u = p[0] * U[0] + p[1] * U[1], v = p[0] * V[0] + p[1] * V[1]; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const P = (u: number, v: number): XY => [U[0] * u + V[0] * v, U[1] * u + V[1] * v];
    // orqa tomon: qoʻshni bino tegib turgan (berk) yoki shimolga qaragan
    const score = (v: number, out: number) => { let s = 0; for (const t of [0.25, 0.5, 0.75]) if (blindNear(P(u0 + (u1 - u0) * t, v))) s += 3; const az = ((Math.atan2(V[0] * out, V[1] * out) * 180 / Math.PI) + 360) % 360; if (az >= 300 || az <= 60) s += 1; return s; };
    const back: 1 | -1 = score(v1, 1) >= score(v0, -1) ? 1 : -1;
    return { ring: q, U, V, u0, u1, v0, v1, S: v1 - v0, L: u1 - u0, double: v1 - v0 >= 13, back };
  });
  const P = (w: Wing, u: number, v: number): XY => [w.U[0] * u + w.V[0] * v, w.U[1] * u + w.V[1] * v];
  const box: Box = (w, ua, ub, va, vb) => [P(w, ua, va), P(w, ub, va), P(w, ub, vb), P(w, ua, vb)];
  // 2) koridor oʻqlari: ikki tomonlama — oʻrtada; bir tomonlama — orqa fasad boʻylab (derazali koridor)
  const axisV = (w: Wing) => w.double ? (w.v0 + w.v1) / 2 : (w.back > 0 ? w.v1 - W / 2 : w.v0 + W / 2);
  // torets kvartirasi eni — miksdagi navbatdagi tur maydoni / chuqurlik, modul toʻriga
  const wantK = mixPicker(mix);
  const endW = (w: Wing) => { if (!w.double) return 0; const mw = w.L / Math.max(1, Math.floor(w.L / MOD + 0.2)); return Math.min((w.S - W) / 2, Math.max(1, Math.min(w.L >= 36 ? 2 : 1, Math.round(target(wantK()) / w.S / mw))) * mw); };
  const segs: Seg[] = wings.filter(w => w.L > 4 && w.S > 5).map(w => ({ w, t0: w.u0 + endW(w), t1: w.u1 - endW(w), v: axisV(w) }));
  for (const sg of segs) {
    for (const o of segs) {
      if (o === sg) continue;
      const a = P(o.w, o.w.u0, o.v), b = P(o.w, o.w.u1, o.v);
      const ua = a[0] * sg.w.U[0] + a[1] * sg.w.U[1], ub = b[0] * sg.w.U[0] + b[1] * sg.w.U[1], va = a[0] * sg.w.V[0] + a[1] * sg.w.V[1], vb = b[0] * sg.w.V[0] + b[1] * sg.w.V[1];
      if (Math.abs(vb - va) < 1e-6) continue;   // parallel
      const t = (sg.v - va) / (vb - va); if (t < -0.15 || t > 1.15) continue;
      const u = ua + (ub - ua) * t; if (u < sg.w.u0 - 20 || u > sg.w.u1 + 20) continue;
      if (u < (sg.w.u0 + sg.w.u1) / 2) sg.t0 = Math.min(sg.t0, u - W / 2); else sg.t1 = Math.max(sg.t1, u + W / 2);
    }
  }
  let corr: XY[][] = inter(union(segs.filter(s => s.t1 - s.t0 > 1).map(s => box(s.w, s.t0, s.t1, s.v - W / 2, s.v + W / 2))), [r]);
  for (let g = 0; g < 4 && corr.length > 1; g++) {   // bogʻlanmagan boʻlaklar — toʻgʻri yoʻlak bilan ulash
    const ca = cen(corr[0]); let bi = 1, bd = Infinity;
    for (let i = 1; i < corr.length; i++) { const c = cen(corr[i]), d = Math.hypot(c[0] - ca[0], c[1] - ca[1]); if (d < bd) { bd = d; bi = i; } }
    // toʻgʻri burchakli ulash (asosiy qanot oʻqlari boʻyicha): ikki variantdan bino ichida koʻproq qolgani
    const w0 = wings.slice().sort((a, b) => b.L - a.L)[0], cb = cen(corr[bi]);
    const leg = (p: XY, q: XY): XY[] => { const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy * W / 2, ny = ux * W / 2, e = W / 2; return [[p[0] - ux * e + nx, p[1] - uy * e + ny], [q[0] + ux * e + nx, q[1] + uy * e + ny], [q[0] + ux * e - nx, q[1] + uy * e - ny], [p[0] - ux * e - nx, p[1] - uy * e - ny]]; };
    const uvA = [ca[0] * w0.U[0] + ca[1] * w0.U[1], ca[0] * w0.V[0] + ca[1] * w0.V[1]], uvB = [cb[0] * w0.U[0] + cb[1] * w0.U[1], cb[0] * w0.V[0] + cb[1] * w0.V[1]];
    const routes = [P(w0, uvB[0], uvA[1]), P(w0, uvA[0], uvB[1])].map(m => [leg(ca, m), leg(m, cb)]);
    const inside = (rt: XY[][]) => inter(rt, [r]).reduce((t, q) => t + area(q), 0) - rt.reduce((t, q) => t + area(q), 0);
    const best = routes.sort((a, b) => inside(b) - inside(a))[0];
    corr = inter(union([...corr, ...best]), [r]);
  }
  // 3) yadro: eng uzun qanot oʻrtasida; ikki tomonlamada — orqa tasmada, bir tomonlamada — kvartiralar tasmasida.
  //    Koridordan fasadga: liftlar (eshigi koridorga), yonida zinaga oʻtish (MOP), fasadda zina (derazali).
  const stairs: XY[][] = [], lifts: XY[][] = [], halls: XY[][] = [], coreU = new Map<Wing, [number, number, number]>();
  const sideOf = (w: Wing, seg: Seg | undefined, side: 1 | -1): [number, number] => { const v = seg ? seg.v : axisV(w); return side > 0 ? [v + W / 2, w.v1] : [v - W / 2, w.v0]; };
  const main = wings.filter(w => segs.some(s => s.w === w)).sort((a, b) => b.L - a.L)[0];
  if (main) {
    const seg = segs.find(s => s.w === main)!, pref = (main.double ? main.back : -main.back) as 1 | -1;
    const modW = main.L / Math.max(1, Math.floor(main.L / MOD + 0.2)), mid = (Math.max(seg.t0, main.u0) + Math.min(seg.t1, main.u1)) / 2;
    const cw = Math.max(CORE_W, Math.round(CORE_W / modW) * modW);
    // yadro oʻrni: oʻrtaga eng yaqin, zina tashqi fasadga chiqadigan joy (afzal tomon, keyin ikkinchisi)
    let side = pref, uc0 = main.u0 + Math.round((mid - CORE_W / 2 - main.u0) / modW) * modW;
    found: for (const sd0 of (main.double ? [pref, -pref] : [pref]) as (1 | -1)[]) for (const k of [0, 1, -1, 2, -2, 3, -3, 4, -4]) {
      const u = main.u0 + Math.round((mid - CORE_W / 2 - main.u0) / modW + k) * modW; if (u < Math.max(seg.t0, main.u0) - 0.01 || u + cw > Math.min(seg.t1, main.u1) + 0.01) continue;
      const vo = sideOf(main, seg, sd0)[1], sg = sd0;
      if ([0.2, 0.5, 0.8].every(t => !pointIn(P(main, u + cw * t, vo + sg * 0.4), r))) { side = sd0; uc0 = u; break found; }
    }
    const uc1 = uc0 + cw;
    const [vIn, vOut0] = sideOf(main, seg, side), sgn = Math.sign(vOut0 - vIn);
    // chuqur tasmada (bir tomonlama) yadro qisqaradi: lift + 1,4 m oʻtish + zina; fasad tomondagi qismi kvartiraga
    const vOut = Math.abs(vOut0 - vIn) > LIFT + 1.4 + STAIR_D + MOD ? vIn + sgn * (LIFT + 1.4 + STAIR_D) : vOut0, d = Math.abs(vOut - vIn);
    const sd = Math.min(STAIR_D, Math.max(2.4, d - LIFT)), vS = vOut - sgn * sd, vL = vIn + sgn * Math.min(LIFT, Math.max(0.5, d - sd));
    stairs.push(box(main, uc0, uc1, vS, vOut));
    lifts.push(box(main, uc0, uc0 + LIFT, vIn, vL), box(main, uc0 + LIFT, uc0 + 2 * LIFT, vIn, vL));
    // lift oldi va zinaga oʻtish — koridorga 2 sm kirib turadi (birlashma uzilmasin)
    halls.push(box(main, uc0 + 2 * LIFT, uc1, vIn - sgn * 0.02, vS));
    if (Math.abs(vS - vL) > 0.05) halls.push(box(main, uc0, uc0 + 2 * LIFT, vL, vS));
    coreU.set(main, [uc0, uc1, side]);
  }
  const mop = union([...corr, ...halls]);
  // 4) kvartiralar: har qanot, har tomon tasmasi — modul toʻri boʻyicha koridorga perpendikulyar kesiladi
  // (teshikli koʻpburchak bilan ishlamaslik uchun har kesim alohida: qanot ∩ kesim − kommunikatsiya)
  const blockers = [...corr, ...stairs, ...lifts, ...halls];
  const apts: RuleApt[] = [];
  const mk = (ring: XY[], k: number, wi: number): RuleApt => ({ rooms: k, ring, area: area(ring), door: cen(ring), mods: [], wet: [], walls: [], wing: wi });
  wings.forEach((w, wi) => {
    const seg = segs.find(s => s.w === w), cut = (bx: XY[]) => diff(inter([w.ring], [bx]), blockers);
    if (!seg) { for (const z of diff([w.ring], blockers)) if (area(z) > 2) apts.push(mk(z, 0, wi)); return; }
    const modW = w.L / Math.max(1, Math.floor(w.L / MOD + 0.2));
    const a = Math.max(w.u0, seg.t0), b = Math.min(w.u1, seg.t1);
    // torets (erkin uch) — butun chuqurlik, koridor uchiga eshik
    if (a > w.u0 + 2) for (const z of cut(box(w, w.u0 - 1, a, w.v0 - 1, w.v1 + 1))) if (area(z) > 2) apts.push(mk(z, 0, wi));
    if (b < w.u1 - 2) for (const z of cut(box(w, b, w.u1 + 1, w.v0 - 1, w.v1 + 1))) if (area(z) > 2) apts.push(mk(z, 0, wi));
    // tomon tasmalari (yadro oraligʻi tasmani uzadi)
    const sides: (1 | -1)[] = w.double ? [1, -1] : [(-w.back) as 1 | -1];
    for (const side of sides) {
      const [vIn, vOut] = sideOf(w, seg, side), depth = Math.abs(vOut - vIn); if (depth < 3) continue;
      const cu = coreU.get(w), ivs: [number, number][] = cu && cu[2] === side ? [[a, cu[0]], [cu[1], b]] : [[a, b]];
      for (const [ia, ib] of ivs) {
        // tasma modul toʻrida butunlay toʻldiriladi: k xonali kvartira = round(maydon(k) / (modul × chuqurlik)) modul;
        // oxirgisi qolgan modullarni oladi (maydoni boʻyicha tur aniqlanadi)
        const Lb = ib - ia, m = Math.round(Lb / modW); if (m < 1) continue;
        const parts: { k: number; n: number }[] = []; let used = 0;
        while (used < m) { const k = wantK(), nk = Math.max(1, Math.round(target(k) / (modW * depth))); const take = Math.min(nk, m - used); parts.push({ k, n: take }); used += take; }
        // oxirgi qisqa boʻlak (< kerakli) — oldingisiga qoʻshiladi, agar 1 modul boʻlsa va u kichik kvartira chiqarsa
        if (parts.length > 1) { const l = parts[parts.length - 1]; if (l.n * modW * depth < 28 / 0.85) { parts[parts.length - 2].n += l.n; parts.pop(); } }
        let u = ia, acc = 0;
        parts.forEach((p, i) => {
          acc += p.n; const nx = i === parts.length - 1 ? ib : ia + acc * modW * (Lb / (m * modW));
          for (const z of cut(box(w, u, nx, Math.min(vIn, vOut) - 0.01, Math.max(vIn, vOut) + 0.01))) if (area(z) > 2) apts.push(mk(z, p.k, wi));
          u = nx;
        });
      }
    }
    // kesimlarga tushmagan qism (tugun burchagi va h.k.) — alohida boʻlak (keyin qoʻshiladi)
    for (const z of diff([w.ring], [...blockers, ...apts.filter(x => x.wing === wi).map(x => x.ring)])) if (area(z) > 2) apts.push(mk(z, 0, wi));
  });
  // 5) tekshiruv va tuzatish
  const facadeOf = (ring: XY[]) => mods.map((m, i) => ({ m, i })).filter(({ m }) => { if (m.blind) return false; const c: XY = [(m.a[0] + m.b[0]) / 2, (m.a[1] + m.b[1]) / 2], dx = m.b[0] - m.a[0], dy = m.b[1] - m.a[1], l = Math.hypot(dx, dy) || 1; return pointIn([c[0] - dy / l * 0.4, c[1] + dx / l * 0.4], ring); }).map(x => x.i);
  const hasDoor = (ring: XY[]) => sharedAny(ring, mop).len >= 0.9;
  const ok = (a: RuleApt) => hasDoor(a.ring) && facadeOf(a.ring).length > 0 && area(a.ring) >= 28;
  for (let g = 0; g < 5; g++) {
    let changed = false;
    for (let i = apts.length - 1; i >= 0; i--) {
      const a = apts[i]; if (ok(a)) continue;
      // eshigi bor eng uzun chegarali qoʻshni
      let bj = -1, bl = 0.8;
      for (let j = 0; j < apts.length; j++) { if (j === i) continue; const s = sharedEdge(a.ring, apts[j].ring); if (s.len > bl && hasDoor(apts[j].ring)) { bl = s.len; bj = j; } }
      if (bj < 0) continue;
      const u = union([apts[bj].ring, a.ring]); if (u.length !== 1) continue;
      apts[bj].ring = u[0]; apts[bj].area = area(u[0]); apts[bj].rooms = 0; apts.splice(i, 1); changed = true;
    }
    if (!changed) break;
  }
  const rest: XY[][] = [];
  for (let i = apts.length - 1; i >= 0; i--) if (!ok(apts[i])) { rest.push(apts[i].ring); apts.splice(i, 1); }   // kvartira boʻla olmaydi → texnik / ombor
  const plan: RulePlan = { kind: wings.every(w => w.double) ? 'ikki' : wings.every(w => !w.double) ? 'bir' : 'aralash', stairs, lifts, mop, apts, rest, corridorLen: corr.reduce((s, q) => s + area(q), 0) / W, corridorW: W };
  for (const a of apts) a.area = area(a.ring);
  // ikkinchi zina (5.13): kvartiralar umumiy maydoni > 500 m² — yadrodan eng uzoq kvartiradan toʻliq chuqurlikdagi tasma
  if (stairs.length && totalArea(plan) > 500) addSecondStair(plan, wings, box);
  for (const a of apts) {
    a.area = area(a.ring); a.mods = facadeOf(a.ring);
    const byArea = a.area <= (target(1) + target(2)) / 2 ? 1 : a.area <= (target(2) + target(3)) / 2 ? 2 : a.area <= (target(3) + target(4)) / 2 ? 3 : 4;
    if (!a.rooms || Math.abs(target(a.rooms) - a.area) > 0.2 * target(a.rooms)) a.rooms = byArea;   // tur maydonga mos kelmasa — maydon boʻyicha
    a.rooms = Math.max(1, Math.min(a.rooms, a.mods.length));   // har yashash xonasi derazali (oshxona-mehmonxona birga boʻlishi mumkin)
    a.door = sharedAny(a.ring, mop).mid;
    a.wet = wetZone(a.ring, a.door);
    a.walls = roomWalls(a, mods);
  }
  plan.rest.push(...diff([r], [...mop, ...plan.stairs, ...lifts, ...apts.map(a => a.ring), ...plan.rest], 'none').filter(q => area(q) > 1.5));
  return plan;
}

/** kvartiralar umumiy maydoni ≈ yalpi × 0,85 (TAXMIN: devorlar) */
export const totalArea = (pl: RulePlan) => pl.apts.reduce((s, a) => s + a.area, 0) * 0.85;

function addSecondStair(pl: RulePlan, wings: Wing[], box: Box): void {
  const c0 = cen(pl.stairs[0]);
  const far = [...pl.apts].sort((a, b) => { const ca = cen(a.ring), cb = cen(b.ring); return Math.hypot(cb[0] - c0[0], cb[1] - c0[1]) - Math.hypot(ca[0] - c0[0], ca[1] - c0[1]); });
  for (const a of far) {
    const w = wings[a.wing]; let u0 = Infinity, u1 = -Infinity;
    for (const p of a.ring) { const u = p[0] * w.U[0] + p[1] * w.U[1]; u0 = Math.min(u0, u); u1 = Math.max(u1, u); }
    if (u1 - u0 < STAIR2_W + MOD) continue;           // tor kvartira — keyingisi
    const uc = c0[0] * w.U[0] + c0[1] * w.U[1], outer = Math.abs(u1 - uc) > Math.abs(u0 - uc);
    const strip = outer ? box(w, u1 - STAIR2_W, u1 + 0.01, w.v0 - 1, w.v1 + 1) : box(w, u0 - 0.01, u0 + STAIR2_W, w.v0 - 1, w.v1 + 1);
    const st = inter([a.ring], [strip]).sort((x, y) => area(y) - area(x))[0];
    if (!st || sharedAny(st, pl.mop).len < 0.9) continue;      // zina koridorga chiqishi shart
    const rem = diff([a.ring], [st]).sort((x, y) => area(y) - area(x));
    if (!rem.length || sharedAny(rem[0], pl.mop).len < 0.9 || area(rem[0]) < 30) continue;
    pl.stairs.push(st); a.ring = rem[0]; a.area = area(rem[0]); a.rooms = 0;
    pl.rest.push(...rem.slice(1).filter(q => area(q) > 1.5));
    return;
  }
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
/** h — yuqori turar qavat poli sathi (m) */
export function planChecks(pl: RulePlan, h: number): PlanCheck[] {
  const noDoor = pl.apts.filter(a => sharedAny(a.ring, pl.mop).len < 0.9).length;
  const noWin = pl.apts.filter(a => !a.mods.length).length;
  let overlap = 0; for (let i = 0; i < pl.apts.length; i++) for (let j = i + 1; j < pl.apts.length; j++) overlap += inter([pl.apts[i].ring], [pl.apts[j].ring]).reduce((s, q) => s + area(q), 0);
  const A = totalArea(pl), need2 = A > 500;
  const sc = pl.stairs.map(cen);
  const far = Math.max(0, ...pl.apts.map(a => Math.min(...sc.map(c => Math.abs(a.door[0] - c[0]) + Math.abs(a.door[1] - c[1])))));
  return [
    { id: 'mop', title: 'Har kvartiraga eshik umumiy koridordan', ok: noDoor === 0 && overlap < 0.5, value: noDoor ? `${noDoor} ta kvartiraga MOP dan kirish yoʻq` : `${pl.apts.length} / ${pl.apts.length}, boshqa kvartira orqali kirish yoʻq`, norm: 'kirish → zina-lift → koridor → kvartira', source: 'Rejalash qoidasi (evakuatsiya yoʻli faqat umumiy joylar orqali)' },
    { id: 'win', title: 'Har kvartirada deraza', ok: noWin === 0, value: noWin ? `${noWin} ta derazasiz` : 'hammasida', norm: 'yashash xonalari va oshxona fasadda', source: 'Rejalash qoidasi; insolyatsiya — SanQvaN 0331-16, 8.3' },
    { id: 'corr', title: 'Umumiy koridor eni', ok: pl.corridorW >= 1.2, value: `${f1(pl.corridorW)} m`, norm: '≥ 1,2 m', source: 'ShNQ 2.01.02-04, 5.27' },
    { id: 'lift', title: 'Lift oldi maydonchasi eni', ok: pl.corridorW >= 1.6, value: `${f1(pl.corridorW)} m`, norm: '≥ 1,6 m', source: 'ShNQ 2.01.02-04, 5.31' },
    { id: 'stairs', title: 'Evakuatsiya zinalari soni', ok: need2 ? pl.stairs.length >= 2 : true, value: `${pl.stairs.length} ta; kvartiralar ≈ ${Math.round(A)} m²`, norm: need2 ? '> 500 m² — kamida 2 ta' : '≤ 500 m² — 1 ta ruxsat (> 15 m da kvartirada avariya chiqishi, 5.20)', source: 'ShNQ 2.01.02-04, 5.13' },
    { id: 'len', title: 'Umumiy koridor uzunligi', ok: pl.corridorLen <= 60, value: `≈ ${Math.round(pl.corridorLen)} m`, norm: '> 60 m — 2-tur yongʻinga qarshi toʻsiq bilan boʻlinadi', source: 'ShNQ 2.01.02-04, 5.25' },
    { id: 'h28', title: 'Tutunsiz zina', ok: h > 28 ? null : true, value: `yuqori qavat ≈ ${Math.round(h)} m`, norm: h > 28 ? '> 28 m — tutunsiz zina (Н1) kerak' : '≤ 28 m — oddiy zina', source: 'ShNQ 2.01.02-04, 5.40' },
    { id: 'evac', title: 'Eng uzoq eshikdan zinagacha', ok: null, value: `≈ ${Math.round(far)} m`, norm: 'chegara ShNQ 2.08.01-19 da (5.23 havola qiladi) — matni kerak', source: 'ShNQ 2.01.02-04, 5.23' },
  ];
}
