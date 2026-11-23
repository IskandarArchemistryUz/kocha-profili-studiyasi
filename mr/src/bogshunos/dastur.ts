/**
 * Bogʻshunos — dastur elementlari (23.11.2026): nima, nechta, qayerda va ichida nima.
 *
 * 1) Dastur (Prog) — element turi → soni. Sukut taklif bogʻ turi, maydoni va tashrif sonidan chiqadi (suggest), foydalanuvchi oʻzgartiradi.
 *    Sport maydoni ehtiyoji: ShNQ 2.07.01-23, 33-jadval — 1 000 dam oluvchiga 3 800–4 000 m² (N); bogʻ maydonining 4 % idan oshmaydi (T).
 *    Xiyobon / skver va tarixiy makonda sport sukut boʻyicha qoʻyilmaydi (T — tranzit va sokin dam olish makoni).
 * 2) Joylash (placeBlocks) — har element burilgan toʻgʻri toʻrtburchak «blok»: yoʻlga yaqin, daraxtlarga eng kam zarar, yer ishlari kam,
 *    bir guruh (sport) yonma-yon va bir xil burchakda, shovqinli elementlar sokin zonadan uzoqda; yoʻlga ulanmagan boʻlsa — ulash yoʻlagi.
 *    Sport oʻyin oʻqi shimol–janubga yaqin: 285°–20° oraligʻi, eng maʼquli 345° (A — xalqaro sport inshootlari qoʻllanmalari).
 * 3) Ichki jihozlash (fitout) — maydon belgilari (chiziqlar) va jihozlar toʻplami. Oʻyin maydoni oʻlchamlari — xalqaro federatsiya
 *    qoidalari (A): basketbol 28 × 15 m, 3×3 — 15 × 11 m, voleybol 18 × 9 m (erkin zona 3 m), futzal 40 × 20 m, tennis 23,77 × 10,97 m.
 *    Qolgan oʻlchamlar — tipik (T), loyihada aniqlanadi. Hech qanday ishlab chiqaruvchi nomi ishlatilmaydi.
 * Binolargacha masofa (ShNQ 2.07.01-23, 4-jadval, turar joy hududi uchun — bu yerda oʻxshashlik boʻyicha, P): bolalar oʻyini 10 m,
 * jismoniy tarbiya 10–40 m, it sayr maydoni 40 m.
 */
import type { XY, Ring, MPoly, Variant, BgSite } from './types';
import type { Ctx } from './analyze';
import { Grid, fillPoly, distance, contour, simplify, len } from './grid';

export type ElKey = 'basket' | 'streetbol' | 'voleybol' | 'futbol_k' | 'futbol' | 'tennis' | 'stol_tennis' | 'workout' | 'skeyt'
  | 'bolalar_k' | 'bolalar_m' | 'suv_oyin' | 'piknik' | 'sokin_bog' | 'gulzor' | 'tadbir' | 'it_maydon';
export type ElGrp = 'sport' | 'bolalar' | 'sokin' | 'yashil' | 'tadbir';
/** w × d — egallaydigan joy (xavfsizlik chetlari bilan), pw × pd — oʻyin maydoni; noise: 0 sokin, 1 oʻrta, 2 shovqinli; trees — eng koʻp kesiladigan daraxt */
export interface ElDef { n: string; grp: ElGrp; zone: string; w: number; d: number; pw?: number; pd?: number; ns: boolean; noise: 0 | 1 | 2; edge: number; trees: number; src: 'A' | 'T'; note: string }
export const ELEM: Record<ElKey, ElDef> = {
  basket: { n: 'Basketbol maydoni', grp: 'sport', zone: 'sport_yangi', w: 32, d: 19, pw: 28, pd: 15, ns: true, noise: 2, edge: 10, trees: 4, src: 'A', note: 'oʻyin maydoni 28 × 15 m, atrofida 2 m' },
  streetbol: { n: 'Streetbol (3×3)', grp: 'sport', zone: 'sport_yangi', w: 18, d: 14, pw: 15, pd: 11, ns: true, noise: 2, edge: 10, trees: 2, src: 'A', note: 'oʻyin maydoni 15 × 11 m, bitta halqa' },
  voleybol: { n: 'Voleybol maydoni', grp: 'sport', zone: 'sport_yangi', w: 24, d: 15, pw: 18, pd: 9, ns: true, noise: 2, edge: 10, trees: 3, src: 'A', note: 'oʻyin maydoni 18 × 9 m, erkin zona 3 m' },
  futbol_k: { n: 'Kichik futbol maydoni', grp: 'sport', zone: 'sport_yangi', w: 34, d: 19, pw: 30, pd: 15, ns: true, noise: 2, edge: 12, trees: 4, src: 'T', note: 'oʻyin maydoni 30 × 15 m, toʻsiqli' },
  futbol: { n: 'Mini-futbol (futzal oʻlchami)', grp: 'sport', zone: 'sport_yangi', w: 44, d: 24, pw: 40, pd: 20, ns: true, noise: 2, edge: 12, trees: 6, src: 'A', note: 'oʻyin maydoni 40 × 20 m, toʻsiqli' },
  tennis: { n: 'Tennis korti', grp: 'sport', zone: 'sport_yangi', w: 34.8, d: 17.1, pw: 23.77, pd: 10.97, ns: true, noise: 1, edge: 10, trees: 4, src: 'A', note: 'kort 23,77 × 10,97 m, toʻsiqli' },
  stol_tennis: { n: 'Stol tennisi (2 stol)', grp: 'sport', zone: 'sport_yangi', w: 10, d: 7, ns: false, noise: 1, edge: 6, trees: 1, src: 'T', note: '2 ta stol, atrofida 2 m' },
  workout: { n: 'Workout maydonchasi', grp: 'sport', zone: 'workout', w: 15, d: 10, ns: false, noise: 1, edge: 8, trees: 1, src: 'T', note: 'turnik va trenajyorlar, rezina qoplama' },
  skeyt: { n: 'Skeyt maydoni', grp: 'sport', zone: 'skeyt', w: 30, d: 18, ns: false, noise: 2, edge: 15, trees: 3, src: 'T', note: 'beton, shovqinli — sokin zonadan uzoq' },
  bolalar_k: { n: 'Bolalar maydoni (6 yoshgacha)', grp: 'bolalar', zone: 'bolalar', w: 15, d: 12, ns: false, noise: 1, edge: 10, trees: 1, src: 'T', note: 'qumdon, mayda jihozlar, soyabon, ota-onalar oʻrindigʻi' },
  bolalar_m: { n: 'Bolalar maydoni (7–12 yosh)', grp: 'bolalar', zone: 'bolalar', w: 20, d: 15, ns: false, noise: 1, edge: 10, trees: 2, src: 'T', note: 'oʻyin majmuasi, argʻimchoq, batut' },
  suv_oyin: { n: 'Suv oʻyin maydoni', grp: 'bolalar', zone: 'suv_oyin', w: 14, d: 14, ns: false, noise: 1, edge: 10, trees: 1, src: 'T', note: 'quruq favvora, issiq mavsum uchun' },
  piknik: { n: 'Piknik joyi', grp: 'sokin', zone: 'piknik', w: 20, d: 15, ns: false, noise: 0, edge: 6, trees: 0, src: 'T', note: 'stollar daraxt soyasida, urna' },
  sokin_bog: { n: 'Sokin bogʻ', grp: 'sokin', zone: 'sokin_bog', w: 20, d: 16, ns: false, noise: 0, edge: 6, trees: 0, src: 'T', note: 'oʻrindiqlar, shaxmat stollari, pergola' },
  gulzor: { n: 'Gulzor', grp: 'yashil', zone: 'gulzor', w: 16, d: 7, ns: false, noise: 0, edge: 3, trees: 0, src: 'T', note: 'koʻp yillik oʻsimliklar, yoʻl boʻylab' },
  tadbir: { n: 'Tadbir maysasi', grp: 'tadbir', zone: 'tadbir', w: 40, d: 28, ns: false, noise: 2, edge: 15, trees: 2, src: 'T', note: 'sahna podiumi oldida ochiq maysa' },
  it_maydon: { n: 'It sayr maydoni', grp: 'sokin', zone: 'it_maydon', w: 30, d: 20, ns: false, noise: 2, edge: 15, trees: 2, src: 'T', note: 'toʻsiqli; binolardan 40 m (4-jadval, P)' },
};
export const EL_GROUPS: [string, ElKey[]][] = [
  ['Sport', ['basket', 'streetbol', 'voleybol', 'futbol_k', 'futbol', 'tennis', 'stol_tennis', 'workout', 'skeyt']],
  ['Bolalar', ['bolalar_k', 'bolalar_m', 'suv_oyin']],
  ['Sokin dam olish va tadbir', ['sokin_bog', 'piknik', 'gulzor', 'tadbir', 'it_maydon']],
];
/** Yumshoq elementlar: daraxtlar saqlanadi (soya — afzallik), shuning uchun daraxt soni cheklanmaydi; yengillari yirik daraxt ildiz zonasida ham boʻlishi mumkin */
const SOFT = new Set<ElKey>(['bolalar_k', 'bolalar_m', 'piknik', 'sokin_bog', 'gulzor', 'it_maydon']), LIGHT = new Set<ElKey>(['piknik', 'sokin_bog', 'gulzor']);
export type Prog = Partial<Record<ElKey, number>>;
export interface Block { id: string; el: ElKey; p: XY; a: number; rule: string }

/** Sukut dastur: bogʻ turi, maydoni (ga), bir vaqtdagi tashrif (N1), mavjud sport (m²) va bolalar maydonlari soni */
export function suggest(kind: BgSite['kind'], ha: number, N1: number, has: { pitch: number; play: number; tarixiy: boolean }): { prog: Prog; sportNeed: number; why: string } {
  const P: Prog = {}; const add = (k: ElKey, n = 1) => { if (n > 0) P[k] = (P[k] ?? 0) + n; };
  const norm = Math.round(3800 * N1 / 1000), cap = Math.round(ha * 10000 * 0.04), need = Math.max(0, Math.min(norm, cap) - has.pitch);
  if (has.tarixiy || kind === 'xiyobon') {
    add('sokin_bog', ha >= 2 ? 2 : 1); add('gulzor', Math.max(1, Math.min(4, Math.round(ha))));
    if (!has.tarixiy && ha >= 1.5 && !has.play) add('bolalar_k');
    return { prog: P, sportNeed: 0, why: has.tarixiy ? 'Tarixiy / rasmiy makon: mavjud kompozitsiya saqlanadi, sport va shovqinli elementlar qoʻyilmaydi (T).' : 'Xiyobon / skver: tranzit va sokin dam olish — sport maydonlari sukut boʻyicha qoʻyilmaydi (T).' };
  }
  if (kind === 'ormon') { add('piknik', Math.max(1, Math.min(6, Math.round(ha / 3)))); add('sokin_bog'); add('workout'); return { prog: P, sportNeed: 0, why: 'Oʻrmon-bogʻ: tabiiy muhit ustun, faqat yengil elementlar (T).' }; }
  if (kind === 'turarjoy') {
    add('bolalar_k', has.play ? 0 : 1); add('bolalar_m', ha >= 1 && has.play < 2 ? 1 : 0); add('workout'); add('streetbol'); add('stol_tennis'); if (ha >= 3 && need >= 600) add('basket');
    add('piknik'); add('sokin_bog'); add('gulzor'); if (ha >= 3) add('it_maydon');
    return { prog: P, sportNeed: need, why: 'Turar joy bogʻi: har yoshga yaqin masofadagi kundalik dam olish (T).' };
  }
  // tuman va shahar bogʻi: sport ehtiyoji 33-jadvaldan, aralash toʻplam bilan toʻldiriladi
  const mix: ElKey[] = kind === 'shahar' ? ['futbol', 'basket', 'voleybol', 'tennis', 'streetbol', 'tennis', 'voleybol', 'futbol_k', 'basket'] : ['futbol_k', 'basket', 'voleybol', 'streetbol', 'tennis', 'voleybol'];
  let got = 0; for (const k of mix) { const a = ELEM[k].w * ELEM[k].d; if (got + a > need * 1.1) continue; add(k); got += a; }
  add('workout'); if (ha >= 8) add('skeyt');
  add('bolalar_k', Math.max(0, 1 - Math.min(1, has.play))); add('bolalar_m', ha >= 10 ? 2 : 1); if (ha >= 6) add('suv_oyin');
  add('piknik', ha >= 10 ? 3 : 2); add('sokin_bog', 2); add('gulzor', 2); if (ha >= 8) add('tadbir'); if (ha >= 4) add('it_maydon');
  return { prog: P, sportNeed: need, why: `Sport: 33-jadval boʻyicha ${norm} m², bogʻ maydonining 4 % i — ${cap} m², mavjudi ${Math.round(has.pitch)} m² → yangi ${need} m² gacha.` };
}

/** Avtomatik taklifni variant xarakteriga moslash: A Saqlovchi — faqat sokin va yengil elementlar; B Faol — toʻliq dastur;
 *  C Tabiiy — qattiq sport maydonlari va shovqinli elementlar oʻrniga sokin bogʻ, piknik va gulzor (T) */
export function varProg(id: 'A' | 'B' | 'C', P: Prog): Prog {
  if (id === 'B') return P;
  const o: Prog = {};
  for (const k of Object.keys(P) as ElKey[]) { const E = ELEM[k], n = P[k] ?? 0; if (!n) continue;
    if (id === 'A') { if (E.noise === 2 || (E.grp === 'sport' && k !== 'workout' && k !== 'stol_tennis')) continue; o[k] = E.grp === 'sport' ? 1 : n; }
    else { if ((E.zone === 'sport_yangi' && k !== 'stol_tennis') || k === 'skeyt' || k === 'suv_oyin' || k === 'tadbir') continue; o[k] = n; } }
  if (id === 'C') { const had = (Object.keys(P) as ElKey[]).some(k => ELEM[k].zone === 'sport_yangi' && (P[k] ?? 0) > 0); if (had) { o.piknik = (o.piknik ?? 0) + 1; o.sokin_bog = (o.sokin_bog ?? 0) + 1; } o.gulzor = (o.gulzor ?? 0) + 1; }
  return o;
}

/* ---------------- geometriya ---------------- */
export const elSize = (b: Pick<Block, 'el'>): [number, number] => [ELEM[b.el].w, ELEM[b.el].d];
/** Blok ichki koordinatasi (u — uzun oʻq boʻylab, v — koʻndalang) → hudud koordinatasi */
export const toW = (b: Pick<Block, 'p' | 'a'>, u: number, v: number): XY => { const c = Math.cos(b.a), s = Math.sin(b.a); return [b.p[0] + u * c - v * s, b.p[1] + u * s + v * c]; };
export function rectRing(b: Pick<Block, 'p' | 'a'>, w: number, d: number): Ring { return [toW(b, -w / 2, -d / 2), toW(b, w / 2, -d / 2), toW(b, w / 2, d / 2), toW(b, -w / 2, d / 2)]; }
export const blockRing = (b: Block, grow = 0): Ring => rectRing(b, ELEM[b.el].w + 2 * grow, ELEM[b.el].d + 2 * grow);
/** Oʻyin oʻqining kompas burchagi (0° — shimol, soat mili boʻyicha), 0…180 */
export const bearing = (a: number): number => { let d = 90 - a * 180 / Math.PI; d = ((d % 180) + 180) % 180; return d; };
const nsDev = (a: number): number => { const b = bearing(a), x = b > 90 ? b - 180 : b; return Math.abs(x + 15); };   // 345° dan ogʻish
const nsOk = (a: number): boolean => { const b = bearing(a), x = b > 90 ? b - 180 : b; return x >= -75 && x <= 20; };
function cellsOf(G: Grid, b: Pick<Block, 'p' | 'a'>, w: number, d: number): number[] | null {
  const st = G.step * 0.8, out: number[] = [];
  for (let v = -d / 2; v <= d / 2 + 1e-6; v += st) for (let u = -w / 2; u <= w / 2 + 1e-6; u += st) { const q = toW(b, u, v), k = G.idx(q[0], q[1]); if (k < 0) return null; out.push(k); }
  return out;
}

export interface PlaceEnv { occ: Uint8Array; bigRpa: Uint8Array; hard: Uint8Array; paths: Variant['paths']; keep?: Uint8Array; keepPaths?: boolean }
export interface Placed { blocks: Block[]; masks: Record<string, Uint8Array>; spurs: Variant['paths']; earth: number; miss: { el: ElKey; why: string }[] }

/** Dastur elementlarini joylash */
export function placeBlocks(C: Ctx, prog: Prog, env: PlaceEnv): Placed {
  const G = C.G, nx = G.nx, taken = env.occ.slice(), hard = env.hard.slice();
  const out = G.u8(); for (let k = 0; k < G.n; k++) out[k] = C.site[k] ? 0 : 1;
  const dOut = distance(G, out), dWater = distance(G, C.water);
  let dPath = distance(G, hard);
  const tc = new Uint8Array(G.n); for (const t of C.trees) { const k = G.idx(t.p[0], t.p[1]); if (k >= 0 && tc[k] < 250) tc[k]++; }
  const segs: [XY, XY][] = []; for (const p of env.paths) if (p.tier !== 'soqmoq') for (let i = 1; i < p.g.length; i++) segs.push([p.g[i - 1], p.g[i]]);
  for (let i = 0; i < C.boundary.length; i++) segs.push([C.boundary[i], C.boundary[(i + 1) % C.boundary.length]]);
  const dirAt = (p: XY): number => { let best = Infinity, ang = 0; for (const [a, b] of segs) { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-9, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)), d = Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); if (d < best) { best = d; ang = Math.atan2(dy, dx); } } return ((ang % Math.PI) + Math.PI) % Math.PI; };
  let nS = 0, nG = 0; for (let k = 0; k < G.n; k++) if (C.site[k]) { nS++; if (C.grass[k] || C.crown[k]) nG++; }
  // keng ochiq qoplama (xiyobon, maydon) oʻzagi: yashil yuzadan > 4 m ichkaridagi qoplama — ustiga element qoʻyilmaydi (maysa maʼlumoti yetarli boʻlsa)
  const green = G.u8(); for (let k = 0; k < G.n; k++) green[k] = C.grass[k] || C.crown[k] || !C.site[k] ? 1 : 0;
  const dGreen = distance(G, green), core = G.u8(); if (nG > nS * 0.15) for (let k = 0; k < G.n; k++) core[k] = C.site[k] && dGreen[k] > 4 ? 1 : 0;
  const blocks: Block[] = [], spurs: Variant['paths'] = [], miss: Placed['miss'] = [], masks: Record<string, Uint8Array> = {}; let earthAll = 0;
  const NS_ANG = [105, 90, 120, 75, 135, 150].map(d => d * Math.PI / 180);
  const order = (Object.keys(prog) as ElKey[]).filter(k => ELEM[k] && (prog[k] ?? 0) > 0).sort((x, y) => { const gx = ['sport', 'tadbir', 'bolalar', 'sokin', 'yashil'].indexOf(ELEM[x].grp), gy = ['sport', 'tadbir', 'bolalar', 'sokin', 'yashil'].indexOf(ELEM[y].grp); return gx - gy || ELEM[y].w * ELEM[y].d - ELEM[x].w * ELEM[x].d; });
  let seq = 0;
  for (const el of order) for (let n = 0; n < Math.min(12, prog[el] ?? 0); n++) {
    const E = ELEM[el], same = blocks.filter(b => ELEM[b.el].grp === E.grp), loud = blocks.filter(b => ELEM[b.el].noise === 2), quiet = blocks.filter(b => ELEM[b.el].noise === 0);
    const soft = SOFT.has(el), light = LIGHT.has(el);
    const clusterA = E.grp === 'sport' && same.length ? same[0].a : null;
    let best: { p: XY; a: number; s: number; e: number; t: number; sl: number } | null = null;
    for (let j = 1; j < G.ny - 1; j += 2) for (let i = 1; i < nx - 1; i += 2) {
      const k0 = j * nx + i; if (!C.site[k0] || taken[k0] || C.water[k0] || dOut[k0] < E.edge + E.d / 2 || dPath[k0] > 70) continue;
      const p: XY = [G.cx(i), G.cy(j)], pa = dirAt(p);
      // burchaklar: sport — shimol–janub oraligʻi (klasterda — birinchi maydon burchagi); qolganlar — eng yaqin yoʻl yoki chegaraga parallel
      const angs = clusterA != null ? [clusterA, clusterA + Math.PI / 2].filter(a => !E.ns || nsOk(a)) : E.ns ? [...NS_ANG, pa, pa + Math.PI / 2].filter(nsOk) : [pa, pa + Math.PI / 2];
      const dCl = same.length ? Math.min(...same.map(b => Math.hypot(b.p[0] - p[0], b.p[1] - p[1]))) : 0;
      const dLoud = loud.length ? Math.min(...loud.map(b => Math.hypot(b.p[0] - p[0], b.p[1] - p[1]))) : 999, dQuiet = quiet.length ? Math.min(...quiet.map(b => Math.hypot(b.p[0] - p[0], b.p[1] - p[1]))) : 999;
      let base = Math.max(0, dPath[k0] - E.d / 2 - 2) * 1.2;
      if (same.length) base += E.grp === 'sport' ? dCl * 1.5 : E.grp === 'yashil' || E.grp === 'sokin' ? Math.max(0, 60 - dCl) * 0.8 : Math.max(0, 40 - dCl) * 0.5;   // sport yigʻiladi, sokin va gulzor tarqaladi
      if (E.noise === 0) base += Math.max(0, 45 - dLoud) * 2; if (E.noise === 2) base += Math.max(0, 45 - dQuiet) * 2;
      if (E.grp === 'bolalar' && loud.length) base += Math.max(0, 15 - dLoud) * 3 + Math.max(0, dLoud - 70) * 0.4;   // sportga yaqin, lekin tutashmaydi
      if (E.noise === 0 && dWater[k0] < 60) base -= 6;   // sokin elementlar suv boʻyini afzal koʻradi
      if (best && base >= best.s) continue;
      for (const a of angs) {
        const cs = cellsOf(G, { p, a }, E.w, E.d); if (!cs) continue;
        let bad = false, sum = 0, sl = 0, tr = 0, pv = 0;   // pv — mavjud yoʻl yoki ochiq qoplama ustiga tushgan qism
        for (const k of cs) { if (!C.site[k] || taken[k] || C.water[k] || (!light && env.bigRpa[k]) || env.keep?.[k] || core[k] || (env.keepPaths && C.exPath[k])) { bad = true; break; } sum += C.E[k]; sl += C.S[k]; tr += tc[k]; if (C.exPath[k] || (!C.grass[k] && !C.crown[k])) pv++; }
        if (bad) continue;
        const seen = new Set(cs); tr = 0; for (const k of seen) tr += tc[k];
        if (!soft && tr > E.trees) continue;
        const mean = sum / cs.length; let e = 0; for (const k of seen) e += Math.abs(C.E[k] - mean) * G.cellA;
        const hardEl = E.grp === 'sport' || E.grp === 'bolalar';
        const s = base + (hardEl ? e / 15 : 0) + pv / cs.length * 60 + (soft ? 0 : tr * 25) + (E.ns ? nsDev(a) * 0.15 : 0) + (clusterA != null && Math.abs(a - clusterA) > 0.01 ? 4 : 0);
        if (!best || s < best.s) best = { p, a, s, e: hardEl ? e : 0, t: tr, sl: sl / cs.length };
      }
    }
    if (!best) { miss.push({ el, why: soft ? 'boʻsh joy topilmadi' : `daraxtsiz ochiq joy topilmadi (eng koʻpi ${E.trees} daraxt koʻchirilishi mumkin)` }); continue; }
    const b: Block = { id: `b${seq++}`, el, p: best.p, a: best.a, rule: [E.ns ? `oʻq ${Math.round((360 + (bearing(best.a) > 90 ? bearing(best.a) - 180 : bearing(best.a))) % 360)}°` : clusterA != null ? 'sport guruhi bilan bir qatorda' : 'yoʻlga parallel', Number.isFinite(best.sl) ? `nishab ${best.sl.toFixed(1)} %` : '', best.e ? `yer ishlari ${Math.round(best.e)} m³` : '', best.t ? (soft ? `${best.t} daraxt saqlanadi (soyada)` : `${best.t} daraxt koʻchiriladi`) : 'daraxtga tegmaydi'].filter(Boolean).join(', ') };
    blocks.push(b); earthAll += best.e;
    fillPoly(G, taken, [blockRing(b, E.grp === 'sport' ? 1.5 : 3)]);
    const m = masks[E.zone] ?? (masks[E.zone] = G.u8()); fillPoly(G, m, [blockRing(b)]);
    // yoʻlga ulash: markazdan eng yaqin yoʻlgacha masofa maydoni boʻylab pastga
    const k0 = G.idx(b.p[0], b.p[1]);
    if (k0 >= 0 && dPath[k0] > E.d / 2 + 2.5) {
      const g: XY[] = []; let k = k0, guard = 0;
      while (dPath[k] > 0 && guard++ < 400) { const i = k % nx, j = (k / nx) | 0; let nb = -1, bv = dPath[k]; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const q = (j + dj) * nx + i + di; if (q >= 0 && q < G.n && dPath[q] < bv && !C.water[q]) { bv = dPath[q]; nb = q; } } if (nb < 0) break; k = nb; g.push([G.cx(k % nx), G.cy((k / nx) | 0)]); }
      const ring = blockRing(b), inside = (q: XY) => { let c = false; for (let a2 = 0, l = 3; a2 < 4; l = a2++) { const [x1, y1] = ring[a2], [x2, y2] = ring[l]; if ((y1 > q[1]) !== (y2 > q[1]) && q[0] < x1 + (q[1] - y1) * (x2 - x1) / (y2 - y1)) c = !c; } return c; };
      const cut = g.filter(q => !inside(q));
      if (cut.length >= 2 && len(cut) > 2) { const sp = simplify(cut, 1.5); spurs.push({ g: sp, tier: 'ikkinchi', w: 2.5 }); for (const q of cut) { const kk = G.idx(q[0], q[1]); if (kk >= 0) { hard[kk] = 1; taken[kk] = 1; } } dPath = distance(G, hard); }
    }
  }
  return { blocks, masks, spurs, earth: earthAll, miss };
}

/** Zona poligonlari: toʻr niqobidan kontur, bloklar esa aniq toʻgʻri toʻrtburchak (burilganda zinapoya boʻlmaydi) */
export function progVec(G: Grid, masks: Record<string, Uint8Array>, blocks: Block[]): Record<string, MPoly> {
  const out: Record<string, MPoly> = {};
  for (const [k, m0] of Object.entries(masks)) {
    if (k === 'hard') continue;
    const bs = blocks.filter(b => ELEM[b.el].zone === k); let m = m0;
    if (bs.length) { m = m0.slice(); for (const b of bs) fillPoly(G, m, [blockRing(b, G.step)], 0); }
    out[k] = [...contour(G, m, 2).map(r => [r]), ...bs.map(b => [blockRing(b)])] as MPoly;
  }
  return out;
}

/* ---------------- ichki jihozlash ---------------- */
const arc = (b: Block, cu: number, cv: number, r: number, a0: number, a1: number, n = 14): XY[] => Array.from({ length: n + 1 }, (_, i) => { const t = a0 + (a1 - a0) * i / n; return toW(b, cu + r * Math.cos(t), cv + r * Math.sin(t)); });
const box = (b: Block, w: number, d: number, cu = 0, cv = 0): XY[] => { const q = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2], [-w / 2, -d / 2]]; return q.map(([u, v]) => toW(b, cu + u, cv + v)); };
/** Blok ichidagi belgilar (chiziqlar) va jihozlar: joylashuv — tipik sxema (T), loyihada aniqlanadi */
export function fitout(b: Block): { furn: { id: string; p: XY; a: number }[]; marks: XY[][] } {
  const E = ELEM[b.el], F: { id: string; p: XY; a: number }[] = [], M: XY[][] = [], pw = E.pw ?? E.w, pd = E.pd ?? E.d;
  const f = (id: string, u: number, v: number, rot = 0) => F.push({ id, p: toW(b, u, v), a: b.a + rot });
  const ln = (u1: number, v1: number, u2: number, v2: number) => M.push([toW(b, u1, v1), toW(b, u2, v2)]);
  const side = pd / 2 + (E.d - pd) / 4 + 0.3;   // oʻyin maydoni va chet orasidagi tasma
  const seats = (n: number) => { for (let i = 0; i < n; i++) f('skameyka', (i - (n - 1) / 2) * Math.min(8, pw / n), side); f('urna', pw / 2 - 1, side); };
  const lamps = () => { for (const [u, v] of [[-E.w / 2 + 0.6, -E.d / 2 + 0.6], [E.w / 2 - 0.6, -E.d / 2 + 0.6], [E.w / 2 - 0.6, E.d / 2 - 0.6], [-E.w / 2 + 0.6, E.d / 2 - 0.6]]) f('ustun_4', u, v); };
  switch (b.el) {
    case 'basket': case 'streetbol': {
      M.push(box(b, pw, pd));
      const ends = b.el === 'basket' ? [-1, 1] : [1];
      if (b.el === 'basket') { ln(0, -pd / 2, 0, pd / 2); M.push(arc(b, 0, 0, 1.8, 0, 2 * Math.PI, 24)); }
      for (const s of ends) { const hu = s * (pw / 2 - 1.575); M.push(box(b, 5.8, 4.9, s * (pw / 2 - 2.9), 0)); M.push(arc(b, s * (pw / 2 - 5.8), 0, 1.8, s > 0 ? Math.PI / 2 : -Math.PI / 2, s > 0 ? 3 * Math.PI / 2 : Math.PI / 2)); M.push(arc(b, hu, 0, Math.min(6.75, pd / 2 - 0.9), s > 0 ? Math.PI / 2 : -Math.PI / 2, s > 0 ? 3 * Math.PI / 2 : Math.PI / 2, 20)); f('basket', s * (pw / 2 + 0.3), 0, Math.PI / 2); }
      seats(2); if (b.el === 'basket') lamps(); break;
    }
    case 'voleybol': M.push(box(b, pw, pd)); ln(0, -pd / 2, 0, pd / 2); ln(-3, -pd / 2, -3, pd / 2); ln(3, -pd / 2, 3, pd / 2); f('voleybol_tor', 0, 0, Math.PI / 2); seats(2); break;
    case 'futbol': case 'futbol_k': {
      M.push(box(b, pw, pd)); ln(0, -pd / 2, 0, pd / 2); M.push(arc(b, 0, 0, 3, 0, 2 * Math.PI, 24));
      for (const s of [-1, 1]) { M.push(arc(b, s * pw / 2, 0, Math.min(6, pd / 2 - 1.5), s > 0 ? Math.PI / 2 : -Math.PI / 2, s > 0 ? 3 * Math.PI / 2 : Math.PI / 2, 16)); f('darvoza', s * (pw / 2 + 0.5), 0, Math.PI / 2); }
      M.push(box(b, E.w - 0.6, E.d - 0.6)); seats(3); lamps(); break;
    }
    case 'tennis': M.push(box(b, pw, pd)); M.push(box(b, pw, 8.23)); ln(-6.4, -4.115, -6.4, 4.115); ln(6.4, -4.115, 6.4, 4.115); ln(-6.4, 0, 6.4, 0); f('tennis_tor', 0, 0, Math.PI / 2); M.push(box(b, E.w - 0.6, E.d - 0.6)); seats(2); break;
    case 'stol_tennis': f('tennis_stol', -2.4, 0); f('tennis_stol', 2.4, 0); f('skameyka', 0, E.d / 2 - 0.5); break;
    case 'workout': for (const u of [-5, -1.5]) f('turnik', u, -2); for (const [u, v] of [[2, -2.5], [5, -2.5], [2, 1], [5, 1]]) f('trenajyor', u, v); f('skameyka', -4, E.d / 2 - 0.6); f('urna', -1.5, E.d / 2 - 0.6); break;
    case 'skeyt': M.push(box(b, E.w - 2, E.d - 2)); f('skameyka_beton', -6, E.d / 2 - 0.6); f('skameyka_beton', 6, E.d / 2 - 0.6); f('urna', 0, E.d / 2 - 0.6); break;
    case 'bolalar_k': f('qumdon', -4, -1.5); f('karusel', 2, -2); f('tabiiy_oyin', 4.5, 2); f('soyabon', -4, -1.5); for (const u of [-4, 0, 4]) f('skameyka', u, E.d / 2 - 0.5); f('urna', E.w / 2 - 0.8, E.d / 2 - 0.5); break;
    case 'bolalar_m': f('majmua', -4, -1); f('arg', 4.5, -3); f('batut', 5, 3); for (const u of [-6, -2, 2]) f('skameyka', u, E.d / 2 - 0.5); f('urna', E.w / 2 - 0.8, E.d / 2 - 0.5); f('ichimlik', -E.w / 2 + 0.8, E.d / 2 - 0.5); break;
    case 'suv_oyin': f('quruq_favvora', 0, 0); for (const u of [-4, 4]) f('skameyka', u, E.d / 2 - 0.5); break;
    case 'piknik': for (const [u, v] of [[-6, -2.5], [0, 2.5], [6, -2.5]]) f('piknik_stol', u, v); f('piknik_mgn', -6, 3.5); f('urna_2', E.w / 2 - 1, 0); break;
    case 'sokin_bog': f('pergola', 0, -3); for (const u of [-6, 6]) { f('skameyka', u, 4, Math.PI); f('shaxmat', u, -4); } f('skameyka', 0, 4, Math.PI); break;
    case 'gulzor': f('skameyka', -4, E.d / 2 + 0.6, Math.PI); f('skameyka', 4, E.d / 2 + 0.6, Math.PI); break;
    case 'tadbir': f('podium', -E.w / 2 + 4, 0, Math.PI / 2); break;
    case 'it_maydon': M.push(box(b, E.w - 0.4, E.d - 0.4)); f('it_urna', E.w / 2 - 1.2, E.d / 2 - 1.2); f('ichimlik_it', -E.w / 2 + 1.2, E.d / 2 - 1.2); f('skameyka', 0, E.d / 2 - 1); break;
  }
  return { furn: F, marks: M };
}
export function fitoutAll(blocks: Block[]): { furn: { id: string; p: XY; a: number }[]; marks: XY[][] } { const furn: { id: string; p: XY; a: number }[] = [], marks: XY[][] = []; for (const b of blocks) { const r = fitout(b); furn.push(...r.furn); marks.push(...r.marks); } return { furn, marks }; }
