/**
 * Past qavatli uy rejalari (31.10): bloklangan (taunhaus), juft, yakka va hovli uylar uchun 1-, 2- (3-) qavat rejalari.
 * Qoidalar — loyiha hujjatlari «past-qavatli-uylar-qoidalari» va «hovli-va-past-qavatli-tahlil»:
 *  T-03: kirish, zina va h/x qoʻshni uy bilan umumiy devor boʻylab bitta tasmada; yashash xonasi koʻcha tomonda, oshxona-ovqatlanish bogʻ tomonda;
 *  T-04: 2-qavatda yotoqxonalar va hammom (hoʻl xonalar ustma-ust); T-05: yashash xonasi eni ≥ 3,8 m, yotoq ≥ 2,55 m;
 *  T-08: zina bir marshli, umumiy devor boʻylab (≈ 3,8 m, 0,25 m qadam).
 *  Hovli (milliy uslub): H-01 tashqari → ichkari, H-02 darvozaxonadan hovli koʻrinmaydi (toʻsiq devor), H-03 koʻcha devori derazasiz,
 *  H-04 xonalar bir qatorda hovliga ochiladi, H-05 xona moduli 3,2–3,5 × 4,5–5 m, H-06 mehmonxona eng katta, H-07 ayvon,
 *  H-08 yozgi xona shimolga, qishki — janubga (Toshkent / Buxoro / Xiva), H-10 oshxona ichkarida, H-11 hojatxona alohida.
 * Mahalliy koordinatalar: u — koʻcha boʻylab (uy halqasining 0→1 qirrasi), v — koʻchadan ichkariga.
 */
import { buildWalls, type InDoor, type WallCut } from './aptplan';
import { area, signedArea, type XY } from './geo';

export type HKind = 'dahliz' | 'mehmonxona' | 'oshxona' | 'xona' | 'yotoq' | 'asosiy' | 'hammom' | 'hx' | 'zina' | 'xoll' | 'kiyimxona' | 'ombor' | 'ayvon' | 'darvozaxona' | 'yozgi' | 'qishki';
export const H_LABEL: Record<HKind, string> = {
  dahliz: 'dahliz', mehmonxona: 'mehmonxona', oshxona: 'oshxona-ovqatlanish', xona: 'xona', yotoq: 'yotoqxona', asosiy: 'asosiy yotoqxona', hammom: 'hammom', hx: 'h/x',
  zina: 'zina', xoll: 'yoʻlak', kiyimxona: 'kiyimxona', ombor: 'ombor', ayvon: 'ayvon', darvozaxona: 'darvozaxona', yozgi: 'yozgi xona', qishki: 'qishki xona',
};
const WET: HKind[] = ['hammom', 'hx'];
export interface HRoom { ring: XY[]; kind: HKind; area: number; wet: boolean }
export interface HousePlan {
  floor: number; floors: number; style: 'zamonaviy' | 'milliy';
  /** koʻcha qirrasi (chizmada pastda) */ street: [XY, XY];
  rooms: HRoom[]; walls: [XY, XY][]; doors: InDoor[];
  /** tashqi eshiklar (koʻcha, bogʻ, hovli): oʻrta nuqta, ichkariga yoʻnalish, eni */ ext: { p: XY; n: XY; w: number }[];
  /** zina: marsh toʻrtburchagi va koʻtarilish yoʻnalishi (birlik) */ stairs: { ring: XY[]; up: XY }[];
  /** ayvon ustunlari */ posts: XY[];
  /** ayvonning hovliga ochiq qirralari (tashqi devor yoʻq) */ open: [XY, XY][];
  /** hovlidagi toʻsiq devor (H-02) */ screen?: [XY, XY];
  /** derazalar (tashqi devorda): kesma */ wins: [XY, XY][];
  notes: string[];
}

type R = [number, number, number, number];
interface Lp { rooms: { r: R; kind: HKind; poly?: XY[] }[]; walls: { a: XY; b: XY; cuts: WallCut[] }[]; ext: { p: XY; n: XY; w: number }[]; stairs: { r: R; up: XY }[]; posts: XY[]; screen?: [XY, XY]; wins: [XY, XY][]; open: [XY, XY][]; notes: string[] }
const lp = (): Lp => ({ rooms: [], walls: [], ext: [], stairs: [], posts: [], wins: [], open: [], notes: [] });

/** Uyning mahalliy tizimi: halqaning 0→1 qirrasi — koʻcha tomoni */
/** nuqtadan dir yoʻnalishidagi nur koʻpburchak chegarasiga qancha masofada (topilmasa — Infinity) */
function rayDist(p: XY, d: XY, poly: XY[]): number {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], ex = b[0] - a[0], ey = b[1] - a[1], den = d[0] * ey - d[1] * ex; if (Math.abs(den) < 1e-9) continue;
    const t = ((a[0] - p[0]) * ey - (a[1] - p[1]) * ex) / den, s2 = ((a[0] - p[0]) * d[1] - (a[1] - p[1]) * d[0]) / den;
    if (t > 1e-6 && s2 >= -1e-6 && s2 <= 1 + 1e-6) best = Math.min(best, t);
  }
  return best;
}
/**
 * Koʻcha tomoni uchastkadan: uy qirralari normallari juftlari (n, −n) ichida uchastka chegarasigacha masofalari eng farqli boʻlgani;
 * qisqarogʻi — koʻcha (oldi chekinish), uzunrogʻi — bogʻ. Natija: koʻcha qirrasi uchlari (halqa tartibida, uy chap qoʻlda).
 */
function streetEdge(ring: XY[], plot: XY[]): [XY, XY] | null {
  const ccw = signedArea(ring) > 0, edges = ring.map((a, i) => { const b = ring[(i + 1) % ring.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, n: XY = ccw ? [(b[1] - a[1]) / l, -(b[0] - a[0]) / l] : [-(b[1] - a[1]) / l, (b[0] - a[0]) / l]; return { a, b, l, n, d: rayDist([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], n, plot) }; }).filter(e => e.l >= 2 && isFinite(e.d));
  let best: { e: typeof edges[number]; g: number } | null = null;
  for (const e of edges) for (const f of edges) if (e.n[0] * f.n[0] + e.n[1] * f.n[1] < -0.99) { const g = f.d - e.d; if (g > 0.5 && (!best || g > best.g + 0.01 || (Math.abs(g - best.g) < 0.01 && e.l > best.e.l))) best = { e, g }; }
  if (!best) return null;
  // halqa ichkarisi chap tomonda boʻlsin (frameOf: N = ichkariga)
  return [best.e.a, best.e.b];
}

function frameOf(ring: XY[], edge?: [XY, XY]): { O: XY; U: XY; N: XY; loc: (p: XY) => XY } {
  const r = signedArea(ring) < 0 ? ring.slice().reverse() : ring.slice();
  // birinchi qirra koʻcha tomoni boʻlishi uchun asl tartibdagi 0→1 qirra olinadi
  const [a, b] = edge ?? [ring[0], ring[1]], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, U: XY = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  let N: XY = [-U[1], U[0]];
  const c = r.reduce((s, p) => [s[0] + p[0] / r.length, s[1] + p[1] / r.length], [0, 0] as XY);
  if ((c[0] - a[0]) * N[0] + (c[1] - a[1]) * N[1] < 0) N = [-N[0], -N[1]];
  const loc = (p: XY): XY => [(p[0] - a[0]) * U[0] + (p[1] - a[1]) * U[1], (p[0] - a[0]) * N[0] + (p[1] - a[1]) * N[1]];
  return { O: a, U, N, loc };
}

/**
 * Toʻgʻri toʻrtburchak uy (taunhaus, juft, yakka): chap tomonda (u = 0) 1,2 m tasma — dahliz, h/x, zina; oʻngda yashash zonasi.
 * Uy eni > 7,8 m boʻlsa — ikki ustun (ikkinchisida mehmon xonasi / yotoqxona).
 */
function rowHouse(W: number, D: number, floor: number, floors: number, ed: { m?: number; two?: boolean } = {}): Lp | string {
  const c = 1.2, L = lp();
  if (W < 4.95 || D < 9.0) return 'kichik';
  const z0 = 4.4, z1 = Math.min(8.2, D - 2.6);
  if (z1 - z0 < 3.0) return 'kichik';
  const two = ed.two !== false && W - c > 6.6, b1 = two ? c + Math.max(3.8, Math.min(5.2, (W - c) * 0.58)) : W;   // T-05: yashash xonasi ≥ 3,8 m
  const room = (r: R, kind: HKind, poly?: XY[]) => L.rooms.push({ r, kind, poly });
  const wall = (a: XY, b: XY, cuts: WallCut[] = []) => L.walls.push({ a, b, cuts });
  L.stairs.push({ r: [0, z0, c, z1], up: floor === 1 ? [0, -1] : [0, -1] });
  if (floor === 1) {
    const m = Math.max(3.6, Math.min(z1 - 1.0, ed.m ?? D * 0.45));   // tahrir: mehmonxona chuqurligi
    room([0, 0, c, 3.0], 'dahliz'); room([0, 3.0, c, z0], 'hx'); room([0, z0, c, z1], 'zina');
    room([c, 0, b1, m], 'mehmonxona');
    room([0, m, W, D], 'oshxona', [[c, m], [b1, m], [b1, D], [0, D], [0, z1], [c, z1]]);
    if (two) { room([b1, 0, W, m], 'xona'); room([b1, m, W, D], 'xona'); }
    wall([c, 0], [c, z1], [{ k: 'door', s: 1.0, w: 0.8, side: -1, hinge: 0 }]);                   // dahliz → mehmonxona
    wall([0, 3.0], [c, 3.0], [{ k: 'door', s: 0.25, w: 0.6, side: -1, hinge: 0 }]);               // h/x eshigi dahlizga ochiladi
    wall([0, z0], [c, z0]);
    wall([c, m], [b1, m], [{ k: 'open', s: 0.3, w: b1 - c - 0.6 }]);                              // yashash va oshxona — ochiq
    if (two) {
      wall([b1, 0], [b1, D], [{ k: 'door', s: 0.6, w: 0.8, side: -1, hinge: 0 }, { k: 'door', s: m + 0.4, w: 0.8, side: -1, hinge: 0 }]);
      wall([b1, m], [W, m]);
    }
    L.ext.push({ p: [c / 2, 0], n: [0, 1], w: 0.9 }, { p: [(c + b1) / 2 + 0.6, D], n: [0, -1], w: 0.9 });   // koʻcha va bogʻ eshiklari
    L.wins.push([c + 0.6, b1 - 0.6].map(u => [u, 0]) as [XY, XY]);
    L.notes.push('1-qavat: kirish, h/x va zina umumiy devor boʻylab; mehmonxona koʻcha tomonda, oshxona-ovqatlanish bogʻ tomonda (T-03)');
  } else {
    // yuqori qavat: zina maydonchasi → yoʻlak (koʻndalang) → old va orqa xonalar; hammom zina yonida (T-04)
    const fz = z0 - 1.0, hz = Math.min(D, z0 + 2.6), hw = c + 2.4;
    if (W - c < 5.0) {
      // tor uy (≤ 6,2 m): yoʻlak zina yonidan orqa yotoqxonagacha davom etadi, hammom yoʻlak va tashqi devor orasida
      const cw = 1.1, hb = Math.min(z1, z0 + 2.4);
      room([0, 0, c, fz], 'kiyimxona'); room([0, fz, c, z0], 'xoll'); room([0, z0, c, z1], 'zina');
      room([c, 0, W, fz], floor === 2 ? 'asosiy' : 'yotoq');
      room([c, fz, W, hb], 'xoll', [[c, fz], [W, fz], [W, z0], [c + cw, z0], [c + cw, hb], [c, hb]]);
      room([c + cw, z0, W, hb], 'hammom');
      room([0, hb, W, D], 'yotoq', [[c, hb], [W, hb], [W, D], [0, D], [0, z1], [c, z1]]);
      wall([0, fz], [c, fz], [{ k: 'door', s: 0.25, w: 0.7, side: -1, hinge: 0 }]);
      wall([c, 0], [c, fz]); wall([c, z0], [c, z1]);
      wall([c, fz], [W, fz], [{ k: 'door', s: 0.3, w: 0.8, side: -1, hinge: 0 }]);
      wall([c + cw, z0], [W, z0]);
      wall([c + cw, z0], [c + cw, hb], [{ k: 'door', s: 0.3, w: 0.7, side: -1, hinge: 0 }]);
      wall([c, hb], [W, hb], [{ k: 'door', s: 0.15, w: 0.8, side: 1, hinge: 0 }]);
      if (z1 > hb + 0.05) wall([0, z1], [c, z1]);
      L.wins.push([c + 0.6, W - 0.6].map(u => [u, 0]) as [XY, XY]);
      L.notes.push(`${floor}-qavat: yotoqxonalar va hammom; hammom zina yonida, 1-qavatdagi hoʻl zona ustida (T-04)`);
      return L;
    }
    room([0, 0, c, fz], 'kiyimxona'); room([0, fz, c, z0], 'xoll'); room([0, z0, c, z1], 'zina');
    room([c, fz, W, z0], 'xoll');
    room([c, 0, b1, fz], floor === 2 ? 'asosiy' : 'yotoq'); if (two) room([b1, 0, W, fz], 'yotoq');
    const back2 = two && b1 - hw >= 2.8;
    const hamPoly: XY[] | undefined = hz >= D - 0.05 ? [[c, z0], [hw, z0], [hw, D], [0, D], [0, z1], [c, z1]] : undefined;
    room([c, z0, hw, hz], 'hammom', hamPoly);
    room([hw, z0, back2 ? b1 : W, D], 'yotoq'); if (back2) room([b1, z0, W, D], 'yotoq');
    const pRoom = hz < D - 0.05;
    if (pRoom) { const P: XY[] = [[0, z1], [c, z1], [c, hz], [hw, hz], [hw, D], [0, D]], a = area(P); room([0, z1, hw, D], a <= 7 ? 'kiyimxona' : 'xona', P); }
    wall([0, fz], [c, fz], [{ k: 'door', s: 0.25, w: 0.7, side: -1, hinge: 0 }]);
    wall([c, 0], [c, fz]); wall([c, z0], [c, z1]);
    wall([c, fz], [W, fz], [{ k: 'door', s: 0.3, w: 0.8, side: -1, hinge: 0 }, ...(two ? [{ k: 'door' as const, s: b1 - c + 0.3, w: 0.8, side: -1 as const, hinge: 0 as const }] : [])]);
    wall([c, z0], [W, z0], [{ k: 'door', s: 0.25, w: 0.7, side: 1, hinge: 0 }, { k: 'door', s: hw - c + 0.3, w: 0.8, side: 1, hinge: 0 }, ...(back2 ? [{ k: 'door' as const, s: b1 - c + 0.3, w: 0.8, side: 1 as const, hinge: 0 as const }] : [])]);
    wall([hw, z0], [hw, D], pRoom ? [{ k: 'door', s: hz - z0 + 0.25, w: 0.7, side: 1, hinge: 0 }] : []);
    if (pRoom) { wall([c, hz], [hw, hz]); wall([0, z1], [c, z1]); }
    if (two) wall([b1, 0], [b1, fz]);
    if (back2) wall([b1, z0], [b1, D]);
    L.wins.push([c + 0.6, b1 - 0.6].map(u => [u, 0]) as [XY, XY]);
    L.notes.push(`${floor}-qavat: yotoqxonalar va hammom; hammom zina yonida, 1-qavatdagi hoʻl zona ustida (T-04)`);
  }
  void floors;
  return L;
}

/**
 * Hovli uy — L shakl: koʻcha qanoti (u: 0…A, v: 0…B) va yon qanot (u: 0…B, v: 0…C); hovli ichkarida.
 * Milliy: koʻcha qanotida mehmonxona va darvozaxona (tashqari), yon qanotda yozgi / qishki xonalar, oshxona, sanitariya (ichkari);
 * hovli tomonda ayvon; darvozaxona qarshisida toʻsiq devor. Zamonaviy: oshxona-mehmonxona, yotoqxonalar, yoʻlak.
 */
function hovliHouse(A: number, B: number, C: number, style: 'zamonaviy' | 'milliy', northU: number): Lp | string {
  if (A < 10 || C < 11 || B < 5.0) return 'kichik';
  const L = lp(), ay = Math.min(2.2, B - 4.3), rd = B - ay;   // ayvon chuqurligi 2,0–2,2 m (talqin: H-07), xona chuqurligi ≈ 4,3–4,5 m
  const room = (r: R, kind: HKind, poly?: XY[]) => L.rooms.push({ r, kind, poly });
  const wall = (a: XY, b: XY, cuts: WallCut[] = []) => L.walls.push({ a, b, cuts });
  const gw = 3.0, g0 = A - gw;   // darvozaxona — koʻcha qanoti uchida (hovliga ochiladi)
  if (style === 'milliy') {
    // tashqari: mehmonxona (eng katta, H-06), [xona], darvozaxona; ichkari: yon qanot. Burchak [rd, B]² — ayvon
    const mx0 = Math.min(g0, 6.4), mx = g0 - mx0 < 2.8 ? g0 : mx0;
    room([0, 0, mx, rd], 'mehmonxona'); if (mx < g0) room([mx, 0, g0, rd], 'xona');
    room([g0, 0, A, B], 'darvozaxona');
    room([rd, rd, g0, B], 'ayvon');
    if (mx < g0) wall([mx, 0], [mx, rd]);
    wall([g0, 0], [g0, B]);
    wall([0, rd], [g0, rd], [{ k: 'door', s: rd + 0.5, w: 0.9, side: -1, hinge: 0 }, ...(mx < g0 ? [{ k: 'door' as const, s: mx + 0.5, w: 0.8, side: -1 as const, hinge: 0 as const }] : [])]);
    // yon qanot: xonalar ≈ 3,4 m modul (H-05), oxirida oshxona va hojatxona/hammom (H-10, H-11); hammasi ayvonga ochiladi (H-04)
    const n = Math.max(2, Math.round((C - rd) / 3.3)), cuts: number[] = [rd];
    for (let i = 1; i < n; i++) cuts.push(rd + (C - rd) * i / n);
    cuts.push(C);
    const kinds: HKind[] = cuts.slice(0, -1).map((_, i, arr) => i === arr.length - 1 ? 'hammom' : i === arr.length - 2 ? 'oshxona' : 'xona');
    // H-08: yon qanot xonalari hovliga (+u) qaraydi — shimolga qarasa yozgi, janubga qarasa qishki, sharq / gʻarbga — oddiy xona
    const face: HKind = northU > 0.5 ? 'yozgi' : northU < -0.5 ? 'qishki' : 'xona';
    kinds.forEach((k, i) => {
      const a0 = cuts[i], a1 = cuts[i + 1];
      if (k === 'hammom') { const hm = Math.min(a1, a0 + 2.1); room([0, a0, rd, hm], 'hammom'); if (a1 - hm >= 1.1) { room([0, hm, rd, a1], 'hx'); wall([0, hm], [rd, hm]); } }   // H-11: hojatxona alohida
      else room([0, a0, rd, a1], k === 'xona' ? face : k);
      if (i > 0) wall([0, a0], [rd, a0]);
    });
    room([rd, B, B, C], 'ayvon');
    const hmEnd = Math.min(C, cuts[cuts.length - 2] + 2.1);
    wall([rd, rd], [rd, C], [...kinds.map((k, i) => ({ k: 'door' as const, s: cuts[i] - rd + (k === 'hammom' ? 0.3 : 0.5), w: k === 'hammom' ? 0.7 : 0.9, side: 1 as const, hinge: 0 as const })), ...(C - hmEnd >= 1.1 ? [{ k: 'door' as const, s: hmEnd - rd + 0.25, w: 0.6, side: 1 as const, hinge: 0 as const }] : [])]);
    // ayvon ustunlari hovli qirrasida (~ 3 m oraliq)
    const step = (a0: number, a1: number) => (a1 - a0) / Math.max(1, Math.round((a1 - a0) / 3));
    L.open.push([[B, B], [g0, B]], [[B, B], [B, C]]);
    for (let u = B; u <= g0 + 1e-6; u += step(B, g0)) L.posts.push([u, B]);
    for (let w = B + step(B, C); w <= C + 1e-6; w += step(B, C)) L.posts.push([B, w]);
    // darvozaxona: koʻchadan kirish, hovliga chiqish; qarshisida toʻsiq devor (H-02)
    L.ext.push({ p: [g0 + gw / 2, 0], n: [0, 1], w: 2.4 });
    L.screen = [[g0 - 0.4, B + 1.5], [A + 0.4, B + 1.5]];
    L.notes.push('Milliy uslub: koʻcha qanoti — tashqari (mehmonxona, darvozaxona), yon qanot — ichkari; koʻcha devori derazasiz (H-03), hovli tomonda ayvon (H-07), darvozaxona qarshisida toʻsiq devor (H-02)');
    L.notes.push(face === 'yozgi' ? 'Yon qanot xonalari shimolga qaraydi — yozgi xonalar (H-08)' : face === 'qishki' ? 'Yon qanot xonalari janubga qaraydi — qishki xonalar (H-08)' : 'Yon qanot sharq yoki gʻarbga qaraydi (H-08: yozgi xona — shimolga, qishki — janubga; uchastkani burish mumkin)');
    L.ext.push({ p: [g0 + gw / 2, B], n: [0, -1], w: 2.4 });
  } else {
    room([0, 0, B, B], 'mehmonxona');
    room([B, 0, A, rd], 'oshxona');
    room([B, rd, A, B], 'ayvon');
    wall([B, 0], [B, B], [{ k: 'open', s: 0.5, w: rd - 1.0 }, { k: 'door', s: rd + 0.4, w: 0.9, side: -1, hinge: 0 }]);
    wall([B, rd], [A, rd], [{ k: 'door', s: 0.8, w: 0.9, side: -1, hinge: 0 }]);
    const yl = Math.min(1.2, B * 0.2), x0 = rd - yl;   // yon qanot: yoʻlak hovli tomonda, xonalar tashqi devorda
    room([x0, B, rd, C], 'xoll');
    const n = Math.max(2, Math.floor((C - B) / 3.4)), cuts = [B];
    for (let i = 1; i < n; i++) cuts.push(B + (C - B) * i / n);
    cuts.push(C);
    cuts.slice(0, -1).forEach((a0, i) => { const a1 = cuts[i + 1], k: HKind = i === n - 1 ? 'hammom' : i === 0 ? 'asosiy' : 'yotoq'; if (k === 'hammom' && a1 - a0 >= 3.2) { room([0, a0, x0, a0 + 2.1], 'hammom'); room([0, a0 + 2.1, x0, a1], 'hx'); wall([0, a0 + 2.1], [x0, a0 + 2.1]); } else room([0, a0, x0, a1], k); if (i > 0) wall([0, a0], [x0, a0]); });
    room([rd, B, B, C], 'ayvon');
    const hx2 = C - cuts[n - 1] >= 3.2;
    wall([x0, B], [x0, C], [...cuts.slice(0, -1).map((a0, i) => ({ k: 'door' as const, s: a0 - B + 0.4, w: i === n - 1 ? 0.7 : 0.8, side: -1 as const, hinge: 0 as const })), ...(hx2 ? [{ k: 'door' as const, s: cuts[n - 1] + 2.1 - B + 0.25, w: 0.6, side: -1 as const, hinge: 0 as const }] : [])]);
    wall([0, B], [rd, B], [{ k: 'open', s: x0 + 0.05, w: yl - 0.1 }]);
    wall([rd, B], [rd, C], [{ k: 'door', s: 0.4, w: 0.9, side: 1, hinge: 0 }]);
    L.ext.push({ p: [B / 2, 0], n: [0, 1], w: 0.9 });
    L.open.push([[B, B], [A, B]], [[B, B], [B, C]]);
    for (const t of [0, 0.5, 1]) L.posts.push([B + (A - B) * t, B]);
    for (const t of [0.5, 1]) L.posts.push([B, B + (C - B) * t]);
    L.wins.push([[0.8, 0], [B - 0.8, 0]]);
    L.notes.push('Zamonaviy uslub: mehmonxona va oshxona koʻcha qanotida, yotoqxonalar yon qanotda yoʻlak orqali, hovli tomonda ayvon');
  }
  return L;
}

/** Uy halqasidan reja: kind — 'taunhaus' | 'uy' (gen.kind); halqa L shakl (6 nuqta) boʻlsa — hovli uy */
export function housePlan(ring: XY[], floors: number, floor: number, opts: { style?: 'zamonaviy' | 'milliy'; party?: 0 | 1; north?: XY; plot?: XY[]; edit?: { mirror?: boolean; m?: number; two?: boolean } } = {}): HousePlan | null {
  if (ring.length < 4) return null;
  const se = opts.plot ? streetEdge(ring, opts.plot) : null, { O, U, N, loc } = frameOf(ring, se ?? undefined);
  const Lr = ring.map(loc), u0 = Math.min(...Lr.map(p => p[0])), u1 = Math.max(...Lr.map(p => p[0])), v0 = Math.min(...Lr.map(p => p[1])), v1 = Math.max(...Lr.map(p => p[1]));
  const W = u1 - u0, D = v1 - v0, style = opts.style ?? (ring.length === 6 ? 'milliy' : 'zamonaviy');
  let L: Lp | string, mirror = false;
  if (ring.length === 6) {
    // hovli: koʻcha qanoti A × B, yon qanot B × C; yon qanot u = 0 tomonida boʻlmasa — oyna
    const inside = (p: XY) => { let c = false; for (let i = 0, j = Lr.length - 1; i < Lr.length; j = i++) { const [xi, yi] = Lr[i], [xj, yj] = Lr[j]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi || 1e-12) + xi) c = !c; } return c; };
    mirror = !inside([u0 + 0.3, v1 - 0.3]);
    const vs = Lr.map(p => p[1] - v0).filter(v => v > 0.3 && v < D - 0.3), us = Lr.map(p => p[0] - u0).filter(u => u > 0.3 && u < W - 0.3);
    if (!vs.length || !us.length) return null;
    const B = Math.min(...vs), Bu = mirror ? W - Math.max(...us) : Math.min(...us);
    const nu = opts.north ? (opts.north[0] * U[0] + opts.north[1] * U[1]) * (mirror ? -1 : 1) / (Math.hypot(opts.north[0], opts.north[1]) || 1) : 0;   // yon qanot xonalari qaragan tomon (+u) va shimol
    L = hovliHouse(W, (B + Bu) / 2, D, style, nu);
  } else {
    // qoʻshni (uchastka chegarasidagi) yon tomon — zina va kirish tasmasi shu devor boʻylab (T-03)
    const onPlot = (u: number) => !!opts.plot && opts.plot.some((a2, i) => { const b2 = opts.plot![(i + 1) % opts.plot!.length], la = loc(a2), lb = loc(b2); return Math.abs(la[0] - u) < 0.2 && Math.abs(lb[0] - u) < 0.2; });
    const party = opts.plot ? (onPlot(u1) && !onPlot(u0) ? 1 : 0) : opts.party ?? 0; mirror = (party === 1) !== !!opts.edit?.mirror;
    L = rowHouse(W, D, Math.min(floor, floors), floors, { m: opts.edit?.m, two: opts.edit?.two });
  }
  if (typeof L === 'string') return null;
  const toW = (p: XY): XY => { const u = (mirror ? W - p[0] : p[0]) + u0, v = p[1] + v0; return [O[0] + U[0] * u + N[0] * v, O[1] + U[1] * u + N[1] * v]; };
  const dirW = (n: XY): XY => { const u = mirror ? -n[0] : n[0]; return [U[0] * u + N[0] * n[1], U[1] * u + N[1] * n[1]]; };
  const b = buildWalls(L.walls);
  const rooms: HRoom[] = L.rooms.map(q => { const [x0, y0, x1, y1] = q.r, pr: XY[] = q.poly ?? [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; return { ring: pr.map(toW), kind: q.kind, area: Math.max(0, area(pr) - 0.05 * pr.reduce((s, p, i) => s + Math.hypot(pr[(i + 1) % pr.length][0] - p[0], pr[(i + 1) % pr.length][1] - p[1]), 0)), wet: WET.includes(q.kind) }; });
  return {
    floor, floors, style, rooms, street: [toW([0, 0]), toW([mirror ? -1 : 1, 0])],
    walls: b.walls.map(([p, q]) => [toW(p), toW(q)] as [XY, XY]),
    doors: b.doors.map(d => ({ ...d, h: toW(d.h), a: toW(d.a), n: dirW(d.n) })),
    ext: L.ext.map(e => ({ p: toW(e.p), n: dirW(e.n), w: e.w })),
    stairs: L.stairs.map(s => { const [x0, y0, x1, y1] = s.r; return { ring: [toW([x0, y0]), toW([x1, y0]), toW([x1, y1]), toW([x0, y1])], up: dirW(s.up) }; }),
    posts: L.posts.map(toW), open: L.open.map(([p, q]) => [toW(p), toW(q)] as [XY, XY]), screen: L.screen && [toW(L.screen[0]), toW(L.screen[1])], wins: L.wins.map(([p, q]) => [toW(p), toW(q)] as [XY, XY]), notes: L.notes,
  };
}

/** Uy qaysi yon tomoni bilan qoʻshniga (uchastka chegarasiga) yopishgan: 0 — chap (halqa 0-nuqtasi tomoni), 1 — oʻng */
export function partySide(ring: XY[], plot: XY[] | undefined): 0 | 1 {
  if (!plot || ring.length !== 4) return 0;
  const onPlot = (p: XY) => plot.some((a, i) => { const b = plot[(i + 1) % plot.length], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)); return Math.hypot(a[0] + dx * t - p[0], a[1] + dy * t - p[1]) < 0.15; });
  const left = onPlot(ring[0]) && onPlot(ring[3]), right = onPlot(ring[1]) && onPlot(ring[2]);
  return right && !left ? 1 : 0;
}

/** Uy rejasi chizmasi (SVG, mm, masshtab 1:scale): xonalar, devorlar, eshiklar, zina, ayvon ustunlari, uchastka chegarasi */
const H_FILL: Partial<Record<HKind, string>> = { mehmonxona: '#f3d38f', oshxona: '#f3d38f', xona: '#9fd3b8', yotoq: '#a9c1e6', asosiy: '#a9c1e6', yozgi: '#9fd3b8', qishki: '#f4b08a', dahliz: '#e9e5dc', xoll: '#e9e5dc', zina: '#f1efe9', kiyimxona: '#d9d4c8', ombor: '#d9d4c8', ayvon: '#f7f3ea', darvozaxona: '#e4e1da' };
export function housePlanSvg(P: HousePlan, house: XY[], plot: XY[] | undefined, o: { scale: number; title: string; north?: XY; label?: (s: string) => string }): { svg: string; widthMm: number; heightMm: number } {
  const T = o.label ?? ((s: string) => s);
  // chizma tizimi: uy halqasining 0→1 qirrasi gorizontal (koʻcha pastda)
  const [a, b] = P.street, l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, U: XY = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  let N: XY = [-U[1], U[0]]; const cc = house.reduce((s2, p) => [s2[0] + p[0] / house.length, s2[1] + p[1] / house.length], [0, 0] as XY);
  if ((cc[0] - a[0]) * N[0] + (cc[1] - a[1]) * N[1] < 0) N = [-N[0], -N[1]];
  const loc = (p: XY): XY => [(p[0] - a[0]) * U[0] + (p[1] - a[1]) * U[1], (p[0] - a[0]) * N[0] + (p[1] - a[1]) * N[1]];
  // chizma chegarasi: uy ± 4 m (uzun uchastka — kesiladi), uchastka shu ichida
  const hs = house.map(loc), pl = (plot ?? []).map(loc), cl = (v: number, a2: number, b2: number) => Math.max(a2, Math.min(b2, v));
  const hx0 = Math.min(...hs.map(p => p[0])), hx1 = Math.max(...hs.map(p => p[0])), hy0 = Math.min(...hs.map(p => p[1])), hy1 = Math.max(...hs.map(p => p[1]));
  const x0 = cl(Math.min(hx0, ...pl.map(p => p[0])), hx0 - 4, hx0) - 1, x1 = cl(Math.max(hx1, ...pl.map(p => p[0])), hx1, hx1 + 4) + 1, y0 = cl(Math.min(hy0, ...pl.map(p => p[1])), hy0 - 4, hy0) - 1, y1 = cl(Math.max(hy1, ...pl.map(p => p[1])), hy1, hy1 + 4) + 1;
  const k = 1000 / o.scale, M = 12, Wm = (x1 - x0) * k + 2 * M, Hm = (y1 - y0) * k + 2 * M + 10;
  // v (koʻchadan ichkariga) — chizmada yuqoriga: koʻcha pastda
  const X = (p: XY) => (M + (loc(p)[0] - x0) * k).toFixed(2), Y = (p: XY) => (M + 8 + (y1 - loc(p)[1]) * k).toFixed(2);
  const path = (r: XY[]) => 'M' + r.map(p => `${X(p)} ${Y(p)}`).join('L') + 'Z';
  const seg = (p: XY, q: XY, st: string) => `<line x1="${X(p)}" y1="${Y(p)}" x2="${X(q)}" y2="${Y(q)}" ${st}/>`;
  const out: string[] = [`<rect x="0" y="0" width="${Wm.toFixed(1)}" height="${Hm.toFixed(1)}" fill="#fff"/>`,
    `<defs><pattern id="htile" width="${(0.3 * k).toFixed(2)}" height="${(0.3 * k).toFixed(2)}" patternUnits="userSpaceOnUse"><path d="M0 0H${(0.3 * k).toFixed(2)}M0 0V${(0.3 * k).toFixed(2)}" stroke="#a9a59c" stroke-width="0.12"/></pattern></defs>`,
    `<text x="${M}" y="9" font-size="4.2" font-weight="600" fill="#141414">${o.title}</text>`];
  if (plot) out.push(`<clipPath id="hclip"><rect x="${M}" y="${M + 8}" width="${((x1 - x0) * k).toFixed(1)}" height="${((y1 - y0) * k).toFixed(1)}"/></clipPath><path d="${path(plot)}" clip-path="url(#hclip)" fill="#eef3e6" stroke="#6b6965" stroke-width="0.35" stroke-dasharray="2 1"/>`);
  for (const q of P.rooms) out.push(`<path d="${path(q.ring)}" fill="${q.wet ? '#fff' : H_FILL[q.kind] ?? '#eee'}" stroke="none"/>${q.wet ? `<path d="${path(q.ring)}" fill="url(#htile)" stroke="none"/>` : ''}`);
  // zina: pogʻonalar 0,25 m, koʻtarilish strelkasi
  for (const s2 of P.stairs) {
    const r = s2.ring, ax = r[1][0] - r[0][0], ay = r[1][1] - r[0][1], bw = Math.hypot(ax, ay), lv: XY = [r[3][0] - r[0][0], r[3][1] - r[0][1]], ln = Math.hypot(lv[0], lv[1]);
    out.push(`<path d="${path(r)}" fill="#f6f4ef" stroke="#141414" stroke-width="0.25"/>`);
    for (let t = 0.25; t < ln - 0.05; t += 0.25) { const p: XY = [r[0][0] + lv[0] / ln * t, r[0][1] + lv[1] / ln * t]; out.push(seg(p, [p[0] + ax, p[1] + ay], 'stroke="#141414" stroke-width="0.12"')); }
    const m0: XY = [r[0][0] + ax / 2 + lv[0] * 0.15, r[0][1] + ay / 2 + lv[1] * 0.15], m1: XY = [r[0][0] + ax / 2 + lv[0] * 0.85, r[0][1] + ay / 2 + lv[1] * 0.85];
    const [st, en] = (s2.up[0] * lv[0] + s2.up[1] * lv[1]) > 0 ? [m0, m1] : [m1, m0];
    out.push(seg(st, en, 'stroke="#141414" stroke-width="0.25"'), `<circle cx="${X(st)}" cy="${Y(st)}" r="0.6" fill="#141414"/>`);
    void bw;
  }
  for (const [p, q] of P.walls) out.push(seg(p, q, `stroke="#141414" stroke-width="${(0.1 * k).toFixed(2)}" stroke-linecap="square"`));
  out.push(`<path d="${path(house)}" fill="none" stroke="#141414" stroke-width="${(0.3 * k).toFixed(2)}" stroke-linejoin="miter"/>`);
  // ayvon: hovli tomoni ochiq (tashqi devor yoʻq) — tom chizigʻi shtrix, ustunlar
  for (const [p, r] of P.open) out.push(seg(p, r, `stroke="#fff" stroke-width="${(0.3 * k + 0.5).toFixed(2)}"`), seg(p, r, 'stroke="#141414" stroke-width="0.2" stroke-dasharray="1.2 0.8"'));
  // derazalar va tashqi eshiklar (devorda oq tirqish)
  for (const [p, q] of P.wins) out.push(seg(p, q, `stroke="#fff" stroke-width="${(0.3 * k + 0.4).toFixed(2)}"`), seg(p, q, 'stroke="#141414" stroke-width="0.25"'));
  for (const e of P.ext) { const t: XY = [-e.n[1], e.n[0]], p0: XY = [e.p[0] - t[0] * e.w / 2, e.p[1] - t[1] * e.w / 2], p1: XY = [e.p[0] + t[0] * e.w / 2, e.p[1] + t[1] * e.w / 2]; out.push(seg(p0, p1, `stroke="#fff" stroke-width="${(0.3 * k + 0.6).toFixed(2)}" stroke-linecap="butt"`)); }
  for (const d of P.doors) {
    const tip: XY = [d.h[0] + d.n[0] * d.w, d.h[1] + d.n[1] * d.w];
    const cr = (Number(X(tip)) - Number(X(d.h))) * (Number(Y(d.a)) - Number(Y(d.h))) - (Number(Y(tip)) - Number(Y(d.h))) * (Number(X(d.a)) - Number(X(d.h)));
    out.push(seg(d.h, tip, 'stroke="#141414" stroke-width="0.25"'), `<path d="M${X(tip)} ${Y(tip)}A${(d.w * k).toFixed(2)} ${(d.w * k).toFixed(2)} 0 0 ${cr > 0 ? 1 : 0} ${X(d.a)} ${Y(d.a)}" fill="none" stroke="#141414" stroke-width="0.15" stroke-dasharray="0.6 0.4"/>`);
  }
  for (const p of P.posts) out.push(`<rect x="${(Number(X(p)) - 0.12 * k).toFixed(2)}" y="${(Number(Y(p)) - 0.12 * k).toFixed(2)}" width="${(0.24 * k).toFixed(2)}" height="${(0.24 * k).toFixed(2)}" fill="#141414"/>`);
  if (P.screen) out.push(seg(P.screen[0], P.screen[1], `stroke="#6b6965" stroke-width="${(0.2 * k).toFixed(2)}"`));
  // yozuvlar
  for (const q of P.rooms) {
    const lp2 = q.ring.map(loc);
    // yozuv nuqtasi: xona ichida devorlardan eng uzoq nuqta (L shakl xonalar uchun ham)
    let cx = lp2.reduce((s2, p) => s2 + p[0], 0) / lp2.length, cy = lp2.reduce((s2, p) => s2 + p[1], 0) / lp2.length;
    if (lp2.length > 4) {
      const bx0 = Math.min(...lp2.map(p => p[0])), bx1 = Math.max(...lp2.map(p => p[0])), by0 = Math.min(...lp2.map(p => p[1])), by1 = Math.max(...lp2.map(p => p[1]));
      const inP = (x: number, y: number) => { let c2 = false; for (let i = 0, j = lp2.length - 1; i < lp2.length; j = i++) { const [xi, yi] = lp2[i], [xj, yj] = lp2[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi || 1e-12) + xi) c2 = !c2; } return c2; };
      const dE = (x: number, y: number) => Math.min(...lp2.map((p, i) => { const r = lp2[(i + 1) % lp2.length], dx = r[0] - p[0], dy = r[1] - p[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - p[0]) * dx + (y - p[1]) * dy) / L2)); return Math.hypot(p[0] + dx * t - x, p[1] + dy * t - y); }));
      let bd = -1;
      for (let i = 1; i < 16; i++) for (let j = 1; j < 16; j++) { const x = bx0 + (bx1 - bx0) * i / 16, y = by0 + (by1 - by0) * j / 16; if (!inP(x, y)) continue; const d2 = dE(x, y); if (d2 > bd) { bd = d2; cx = x; cy = y; } }
    }
    const w = Math.min(Math.max(...lp2.map(p => p[0])) - Math.min(...lp2.map(p => p[0])), Math.max(...lp2.map(p => p[1])) - Math.min(...lp2.map(p => p[1])));
    if (w < 0.9 || q.kind === 'zina') continue;
    const nm = T(H_LABEL[q.kind]), fs = Math.max(1.3, Math.min(2.2, (w - 0.2) * k / (nm.length * 0.55))), px = M + (cx - x0) * k, py = M + 8 + (y1 - cy) * k;
    out.push(`<text x="${px.toFixed(2)}" y="${py.toFixed(2)}" font-size="${fs.toFixed(2)}" text-anchor="middle" fill="#3a3936">${nm}</text><text x="${px.toFixed(2)}" y="${(py + fs * 1.1).toFixed(2)}" font-size="${(fs * 0.85).toFixed(2)}" text-anchor="middle" fill="#6b6965">${(Math.round(q.area * 10) / 10).toString().replace('.', ',')} m²</text>`);
  }
  // koʻcha belgisi va shimol
  out.push(`<text x="${(Wm / 2).toFixed(1)}" y="${(Hm - 3).toFixed(1)}" font-size="2" text-anchor="middle" fill="#6b6965">${T('koʻcha tomoni')}</text>`);
  if (o.north) { const nl = loc([a[0] + o.north[0], a[1] + o.north[1]]), n0 = loc(a), ang = Math.atan2(-(nl[1] - n0[1]), nl[0] - n0[0]) * 180 / Math.PI + 90; out.push(`<g transform="translate(${(Wm - 9).toFixed(1)} 10) rotate(${ang.toFixed(1)})"><circle r="4" fill="#fff" stroke="#141414" stroke-width="0.25"/><path d="M0,-3.4L1.5,2.3L0,1.4Z" fill="#141414"/><text y="-4.7" font-size="2.2" font-weight="700" text-anchor="middle">N</text></g>`); }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Wm.toFixed(1)}mm" height="${Hm.toFixed(1)}mm" viewBox="0 0 ${Wm.toFixed(1)} ${Hm.toFixed(1)}" font-family="Archivo, system-ui, sans-serif">${out.join('')}</svg>`;
  return { svg, widthMm: Wm, heightMm: Hm };
}
