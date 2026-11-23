/**
 * Bogʻshunos — konsepsiya generatori (6-qadam), nishabni hisobga oladi. 3 variant (23.11 — xarakter boʻyicha, koʻlga bogʻliq emas): A Saqlovchi, B Faol, C Tabiiy; suv boʻlsa B va C ga sohil yoʻli, koʻprik, amfiteatr, botqoq qirgʻoq qoʻshiladi.
 *
 * Yoʻl tarmogʻi: manba–manzil (OD) → 3 m toʻrda eng arzon yoʻl → birlashtirish (bundling) → oqim boʻyicha ierarxiya → qamrov (≤ 35 m).
 * Narx: qirra uzunligi × nishab koeffitsiyenti (qirra boʻylab: ≤ 5 % — 1; 5–8 % — 1,6; 8–12 % — 3; > 12 % — 8) — yoʻllar gorizontallar
 * boʻylab yotadi. 5 % — ShNQ 2.07.02-24 (MGN); 494-band 8 ‰ — ziddiyat (asl matndan tekshirilsin).
 * Dastur elementlari qoidalar bilan topiladi (qoʻlda koordinata yoʻq):
 *  · amfiteatr — suvga qaragan 8–25 % qiyalik, suvdan 8–40 m, katta daraxtlarsiz;
 *  · terrasa — suv boʻyidagi mavjud ovqatlanish binosi (amenity cafe/restaurant) yoki suvga eng yaqin bino oldida, tekis;
 *  · koʻpriklar — qirgʻoq ↔ orol, suv oraligʻi ≤ 30 m, bir-biridan ≥ 40 m, uchlari asosiy tarmoqqa ≤ 25 m;
 *  · qushxona — orolda koʻprik va yoʻllardan eng uzoq, suv chetidan ≤ 8 m;
 *  · sport, bolalar, sokin dam olish va boshqa bloklar — dastur.ts (soni dasturdan; yoʻlga yaqin, daraxtga eng kam zarar, klaster, oʻq);
 *  · yomgʻir bogʻi — oqim toʻplanadigan past joylar (D8) yoʻl yonida;
 *  · oʻtloq — yoʻldan ichkari va avvalo > 8 % qiyaliklarda (oʻrish qiyin, eroziyaga qarshi — T).
 */
import type { XY, Variant } from './types';
import type { Ctx, Analysis } from './analyze';
import { Grid, fillMPoly, strokeLine, distance, contour, chaikin, simplify, len, area, andNot, interp } from './grid';
import { placeBlocks, progVec, fitoutAll, suggest, varProg, ELEM, type Prog } from './dastur';

type Tier = Variant['paths'][number]['tier'];
export interface VarDef { id: 'A' | 'B' | 'C'; name: string; desc: string; exist: number; tree: number; rpaK: number; beta: number; keepExist: boolean; meadow: number; promenade: boolean; bridges: number; wMain: number; wSec: number; wTrail: number }
export const VARS: VarDef[] = [
  { id: 'A', name: 'A · Saqlovchi', desc: 'Mavjud yoʻl tarmogʻi va daraxtlar deyarli toʻliq qoladi; yangi yoʻl faqat yetishmagan bogʻlanishlarda, faqat sokin elementlar. Eng arzon va eng ehtiyotkor.', exist: 0.15, tree: 2.5, rpaK: 0.7, beta: 0.6, keepExist: true, meadow: 0, promenade: false, bridges: 0, wMain: 4, wSec: 3, wTrail: 2 },
  { id: 'B', name: 'B · Faol', desc: 'Yoʻl tarmogʻi oqim boʻyicha qayta quriladi, turar joy tomonidan yangi darvozalar; dastur toʻliq: sport, bolalar, tadbir. Shahar bogʻi xarakteri.', exist: 0.45, tree: 4, rpaK: 1, beta: 0.55, keepExist: false, meadow: 0.25, promenade: true, bridges: 2, wMain: 5, wSec: 3, wTrail: 2 },
  { id: 'C', name: 'C · Tabiiy', desc: 'Qattiq qoplama minimal: tor yoʻllar va soʻqmoqlar, maysaning yarmi — oʻtloq, yomgʻir bogʻlari; sport maydonlari oʻrniga sokin va tabiiy elementlar. Suv va bioxilma-xillikka ustuvorlik.', exist: 0.55, tree: 8, rpaK: 1.2, beta: 0.7, keepExist: false, meadow: 0.5, promenade: true, bridges: 2, wMain: 4, wSec: 2.4, wTrail: 1.6 },
];
export const gradeK = (g: number) => (g <= 5 ? 1 : g <= 8 ? 1.6 : g <= 12 ? 3 : 8);

/** Tashqi tortish nuqtalari (OSM + aholi) va ichki manzillar */
export interface Attr { name: string; p: XY; w: number }

class Heap { k: number[] = []; v: number[] = []; push(n: number, d: number) { const k = this.k, v = this.v; k.push(n); v.push(d); let i = k.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (v[p] <= v[i]) break; [k[p], k[i]] = [k[i], k[p]]; [v[p], v[i]] = [v[i], v[p]]; i = p; } } pop(): [number, number] { const k = this.k, v = this.v, r: [number, number] = [k[0], v[0]]; const lk = k.pop()!, lv = v.pop()!; if (k.length) { k[0] = lk; v[0] = lv; let i = 0; for (;;) { const l = 2 * i + 1, rr = l + 1; let m = i; if (l < k.length && v[l] < v[m]) m = l; if (rr < k.length && v[rr] < v[m]) m = rr; if (m === i) break; [k[m], k[i]] = [k[i], k[m]]; [v[m], v[i]] = [v[i], v[m]]; i = m; } } return r; } get size() { return this.k.length; } }
const MOV: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1], [2, 1], [1, 2], [-2, 1], [-1, 2], [2, -1], [1, -2], [-2, -1], [-1, -2]];

export interface DesignOut { V: Variant; masks: Record<string, Uint8Array>; ods: { a: XY; b: XY; f: number; path: XY[]; prd: number }[] }

/** opt.prog — dastur (boʻlmasa bogʻ turidan sukut taklif); opt.tarixiy — mavjud yoʻl tarmogʻi saqlanadi, yangi darvoza ochilmaydi */
export function design(C: Ctx, A: Analysis, attr: Attr[], inner: Attr[], vd0: VarDef, opt: { prog?: Prog; progUser?: boolean; kind?: import('./types').BgSite['kind']; tarixiy?: boolean } = {}): DesignOut {
  const vd: VarDef = opt.tarixiy ? { ...vd0, keepExist: true, exist: Math.min(vd0.exist, 0.12), bridges: 0, promenade: false } : vd0;
  const G = C.G, nx = G.nx;
  const dW = distance(G, C.water), dCanal = distance(G, C.canal);
  // ---- 1. darvozalar: mavjud yoʻllar chegarani kesgan joylar (+ B, C: turar joy tomonida yangi darvozalar) ----
  const B = [...C.boundary];
  const gatesRaw: XY[] = [];
  for (const p of C.paths) for (let k = 1; k < p.g.length; k++) { const a = p.g[k - 1], b = p.g[k]; const x = segRing(a, b, B); if (x) gatesRaw.push(x); }
  if (vd.id !== 'A' && !opt.tarixiy) for (const at of attr.filter(t => t.name.startsWith('Turar joy'))) { const q = nearestOnRing(at.p, B); if (!gatesRaw.some(g => Math.hypot(g[0] - q[0], g[1] - q[1]) < 60)) gatesRaw.push(q); }
  const gates = clusterGates(gatesRaw, B, 18);
  // ---- 2. narx toʻri ----
  const ok = new Uint8Array(G.n), pen = new Float32Array(G.n).fill(1);
  const crossMask = G.u8(); for (const p of C.paths) for (let k = 1; k < p.g.length; k++) if (C.canals.some(c => segHitsLine(p.g[k - 1], p.g[k], c))) strokeLine(G, crossMask, [p.g[k - 1], p.g[k]], 8);
  const bridgeMask = G.u8();
  const bridges = vd.bridges ? findBridges(C, vd.bridges) : [];
  for (const b of bridges) strokeLine(G, bridgeMask, b.g, 3);
  const isl = G.u8(); for (const r of C.island) fillRing(G, isl, r);
  const rpaV = G.u8(); for (const t of C.trees) if (t.d >= 20) strokeLine(G, rpaV, [t.p, t.p], 2 * t.rpa * vd.rpaK);
  const fixCore = G.u8(); for (const f of C.fixed ?? []) strokeLine(G, fixCore, [f.p, f.p], 2 * Math.min(6, f.r));
  for (let k = 0; k < G.n; k++) {
    const inSite = C.site[k] === 1;
    let o = inSite && !C.bld[k] && (!C.water[k] || bridgeMask[k] === 1 || isl[k] === 1) && (dCanal[k] > 4 || crossMask[k] === 1);
    if (C.water[k] && isl[k] !== 1 && bridgeMask[k] !== 1) o = false;
    if (fixCore[k] && !C.exPath[k]) o = false;   // haykal va yodgorlik oʻrni: yangi yoʻl ustidan oʻtmaydi
    ok[k] = o ? 1 : 0;
    let m = 1; if (C.exPath[k]) m *= vd.exist; if (rpaV[k]) m *= vd.tree; pen[k] = m;
  }
  // ---- 3. OD juftlari ----
  const gateOf = (p: XY) => gates.reduce((b, g, i) => (Math.hypot(g[0] - p[0], g[1] - p[1]) < Math.hypot(gates[b][0] - p[0], gates[b][1] - p[1]) ? i : b), 0);
  const ods: { a: XY; b: XY; f: number; path: XY[]; prd: number }[] = [];
  for (const t of attr) { const g = gates[gateOf(t.p)]; for (const d of inner) ods.push({ a: g, b: d.p, f: t.w * d.w / (Math.hypot(t.p[0] - d.p[0], t.p[1] - d.p[1]) + 50) * 100, path: [], prd: 1 }); }
  for (let i = 0; i < attr.length; i++) for (let j = i + 1; j < attr.length; j++) { const ga = gateOf(attr[i].p), gb = gateOf(attr[j].p); if (ga !== gb && Math.hypot(gates[ga][0] - gates[gb][0], gates[ga][1] - gates[gb][1]) > 120) ods.push({ a: gates[ga], b: gates[gb], f: attr[i].w * attr[j].w / (Math.hypot(attr[i].p[0] - attr[j].p[0], attr[i].p[1] - attr[j].p[1]) + 50) * 100, path: [], prd: 1 }); }
  // ---- 4. marshrutlash (Dijkstra, qirra narxi nishab bilan) va bundling ----
  const flow = new Map<number, number>();   // qirra kaliti → oqim
  const snap = (p: XY) => { let best = -1, bd = Infinity; const i0 = Math.floor((p[0] - G.x0) / G.step), j0 = Math.floor((p[1] - G.y0) / G.step); for (let r = 0; r < 12 && best < 0; r++) for (let j = j0 - r; j <= j0 + r; j++) for (let i = i0 - r; i <= i0 + r; i++) { if (i < 0 || j < 0 || i >= nx || j >= G.ny) continue; const k = j * nx + i; if (!ok[k]) continue; const d = Math.hypot(G.cx(i) - p[0], G.cy(j) - p[1]); if (d < bd) { bd = d; best = k; } } return best; };
  const ekey = (a: number, b: number) => (a < b ? a * G.n + b : b * G.n + a);
  const edgeCost = (a: number, b: number, d: number) => { const g = Math.abs(C.E[a] - C.E[b]) / d * 100; const base = d * (pen[a] + pen[b]) / 2 * gradeK(Number.isFinite(g) ? g : 0); return flow.has(ekey(a, b)) ? base * (1 - vd.beta) : base; };
  const dist = new Float64Array(G.n), prev = new Int32Array(G.n);
  for (const od of ods.sort((p, q) => q.f - p.f)) {
    const s = snap(od.a), t = snap(od.b); if (s < 0 || t < 0) continue;
    dist.fill(Infinity); prev.fill(-1); dist[s] = 0; const H = new Heap(); H.push(s, 0);
    while (H.size) { const [u, du] = H.pop(); if (u === t) break; if (du > dist[u]) continue; const ui = u % nx, uj = (u / nx) | 0;
      for (const [di, dj] of MOV) { const vi = ui + di, vj = uj + dj; if (vi < 0 || vj < 0 || vi >= nx || vj >= G.ny) continue; const v = vj * nx + vi; if (!ok[v]) continue; if (Math.abs(di) === 2 || Math.abs(dj) === 2) { const m1 = (uj + Math.sign(dj) * (Math.abs(dj) === 2 ? 1 : 0)) * nx + ui + Math.sign(di) * (Math.abs(di) === 2 ? 1 : 0); if (!ok[m1]) continue; }
        const nd = du + edgeCost(u, v, G.step * Math.hypot(di, dj)); if (nd < dist[v]) { dist[v] = nd; prev[v] = u; H.push(v, nd); } } }
    if (!Number.isFinite(dist[t])) continue;
    const path: number[] = []; for (let x = t; x >= 0; x = prev[x]) path.push(x); path.reverse();
    for (let k = 1; k < path.length; k++) { const e = ekey(path[k - 1], path[k]); flow.set(e, (flow.get(e) ?? 0) + od.f); }
    od.path = path.map(k => [G.cx(k % nx), G.cy((k / nx) | 0)] as XY);
    od.prd = len(od.path) / Math.max(10, Math.hypot(od.a[0] - od.b[0], od.a[1] - od.b[1]));
  }
  // ---- 5. zanjirlarga ajratish, ierarxiya va nishab boʻyicha tur ----
  const adj = new Map<number, Set<number>>(); for (const e of flow.keys()) { const a = Math.floor(e / G.n), b = e % G.n; (adj.get(a) ?? adj.set(a, new Set()).get(a)!).add(b); (adj.get(b) ?? adj.set(b, new Set()).get(b)!).add(a); }
  const ends = [...adj.keys()].filter(n => adj.get(n)!.size !== 2), seen = new Set<number>(), chains: { n: number[]; f: number }[] = [];
  for (const s of ends) for (const nb of adj.get(s)!) { const e0 = ekey(s, nb); if (seen.has(e0)) continue; const ch = [s, nb]; seen.add(e0);
    while (adj.get(ch[ch.length - 1])!.size === 2) { const c = ch[ch.length - 1], nxt = [...adj.get(c)!].find(m => m !== ch[ch.length - 2])!; const e = ekey(c, nxt); if (seen.has(e)) break; seen.add(e); ch.push(nxt); }
    let f = 0; for (let k = 1; k < ch.length; k++) f = Math.max(f, flow.get(ekey(ch[k - 1], ch[k]))!); chains.push({ n: ch, f }); }
  const fmax = Math.max(1e-9, ...chains.map(c => c.f));
  const paths: Variant['paths'] = [];
  const xy = (k: number): XY => [G.cx(k % nx), G.cy((k / nx) | 0)];
  for (const c of chains) {
    const r = c.f / fmax, tier: Tier = r >= 0.35 ? 'asosiy' : r >= 0.1 ? 'ikkinchi' : 'soqmoq';
    const w = tier === 'asosiy' ? vd.wMain : tier === 'ikkinchi' ? vd.wSec : vd.wTrail;
    const pts = chaikin(simplify(c.n.map(xy), 2.2), 3, false);
    // nishab boʻyicha boʻlaklash: > 8 % — zina (+ rampa), 5–8 % — rampa (maydonchalar bilan)
    pushGraded(paths, pts, C, tier, w);
  }
  if (vd.keepExist) for (const p of C.paths) { const keep = p.g.filter(q => !paths.some(n => near(q, n.g, 5))); if (keep.length > 1 && len(keep) > 8) { if (opt.tarixiy) pushGraded(paths, keep, C, p.h === 'pedestrian' ? 'asosiy' : 'ikkinchi', p.h === 'pedestrian' ? vd.wMain : 2.5); else pushGraded(paths, keep, C, 'soqmoq', 2.5); } }
  else { // qamrov: har nuqta yoʻldan ≤ 35 m (T) — yetmagan joyda mavjud yoʻl soʻqmoq boʻlib qoladi
    for (const p of C.paths) { const seg: XY[] = []; for (const q of p.g) { if (!paths.some(n => near(q, n.g, 18))) seg.push(q); else if (seg.length) { if (seg.length > 1 && len(seg) > 6) pushGraded(paths, seg.splice(0), C, 'soqmoq', vd.wTrail); else seg.length = 0; } } if (seg.length > 1 && len(seg) > 6) pushGraded(paths, seg, C, 'soqmoq', vd.wTrail); }
  }
  if (vd.promenade) for (const mp of C.lakes) for (const poly of mp) { // sohil yoʻli: koʻl chetidan 6–9 m, kanal buferidan tashqarida
    const off = vd.id === 'B' ? 6 : 9, m = G.u8(); for (let k = 0; k < G.n; k++) m[k] = C.site[k] && dW[k] <= off && !C.water[k] ? 1 : 0;
    for (const r of contour(G, m, 2)) { const segs = splitBy(r, q => { const k = G.idx(q[0], q[1]); return k >= 0 && dCanal[k] > 7 && C.site[k] === 1 && dW[k] > off - 3; }); for (const s of segs) if (len(s) > 15) paths.push({ g: s, tier: 'sohil', w: vd.id === 'B' ? 4 : 2.4 }); }
    void poly;
  }
  // ---- 6. qattiq yuza niqobi ----
  const hard = G.u8(); for (const p of paths) strokeLine(G, hard, p.g, p.w);
  const gateF = gates.map(g => ods.filter(o => Math.hypot(o.a[0] - g[0], o.a[1] - g[1]) < 1 || Math.hypot(o.b[0] - g[0], o.b[1] - g[1]) < 1).reduce((s, o) => s + o.f, 0));
  const gf = Math.max(1e-9, ...gateF);
  gates.forEach((g, i) => strokeLine(G, hard, [g, g], 2 * (6 + 10 * gateF[i] / gf)));
  for (let k = 0; k < G.n; k++) if (!C.site[k] || C.water[k]) hard[k] = 0;
  // ---- 7. dastur elementlari (qoidalar) ----
  const items: Variant['items'] = []; const prog: Record<string, Uint8Array> = {};
  const bigRpa = G.u8(); for (const t of C.trees) if (t.d >= 40) strokeLine(G, bigRpa, [t.p, t.p], 2 * t.rpa);
  if (vd.id !== 'A') { const am = amphitheatre(C, dW, bigRpa, hard); if (am) { prog.amfiteatr = am.m; items.push({ id: 'amfiteatr', name: 'Amfiteatr (suvga qaragan)', p: am.c, rule: `qiyalik ${am.slope.toFixed(0)} %, suvdan ${am.dw.toFixed(0)} m, ${am.rows} qator` }); } }
  const ter = terrace(C, dW); if (ter && vd.id !== 'A') { prog.terrasa = ter.m; items.push({ id: 'terrasa', name: 'Kafe terrasasi', p: ter.c, rule: ter.why }); }
  if (bridges.length) { const hide = birdHide(C, bridges, paths); if (hide) { prog.qushxona = hide.m; items.push({ id: 'qushxona', name: 'Kuzatish joyi (qushxona)', p: hide.c, rule: hide.why }); } }
  const occ = G.u8(); for (let k = 0; k < G.n; k++) occ[k] = hard[k] || C.bld[k] || (prog.amfiteatr?.[k] ?? 0) || C.water[k] ? 1 : 0;
  const exSport = G.u8(); for (const p of C.pitches) fillMPoly(G, exSport, p);
  prog.sport_mavjud = exSport;
  const play = G.u8(); for (const p of C.playgrounds) fillMPoly(G, play, p);
  // dastur bloklari (dastur.ts): soni dasturdan, joyi qoidalardan; mavjud sport va bolalar maydonlari band joy hisoblanadi
  // foydalanuvchi sonlarni oʻzi kiritgan boʻlsa — uchala variantda bir xil; avtomatik taklifda har variant oʻz xarakteriga moslaydi
  const PR: Prog = opt.prog && opt.progUser ? opt.prog : varProg(vd.id, opt.prog ?? suggest(opt.kind ?? 'tuman', area(G, C.site) / 10000, A.visitors.N1, { pitch: area(G, exSport), play: C.playgrounds.length, tarixiy: !!opt.tarixiy }).prog);
  for (let k = 0; k < G.n; k++) if (exSport[k] || play[k] || (prog.terrasa?.[k] ?? 0) || (prog.qushxona?.[k] ?? 0)) occ[k] = 1;
  // mavjud yoʻllar saqlanadigan variantda (A, tarixiy) ular ustiga element qoʻyilmaydi; boshqalarida — jarima bilan (yoʻl buziladi)
  const placed = placeBlocks(C, PR, { gates: gates.map((p, i) => ({ p, f: gateF[i], main: gateF[i] >= 0.5 * gf })), occ, bigRpa, hard, paths, keep: C.keep, keepPaths: vd.keepExist });
  for (const sp of placed.spurs) { paths.push(sp); strokeLine(G, hard, sp.g, sp.w); }
  for (let k = 0; k < G.n; k++) if (!C.site[k] || C.water[k]) hard[k] = 0;
  const courts = { m: placed.masks.sport_yangi ?? G.u8(), earth: placed.earth };
  prog.sport_yangi = courts.m;
  for (const [z, m] of Object.entries(placed.masks)) if (z === 'bolalar') { for (let k = 0; k < G.n; k++) if (m[k]) play[k] = 1; } else if (z !== 'sport_yangi') prog[z] = m;
  for (const b of placed.blocks) items.push({ id: b.id, name: ELEM[b.el].n, p: b.p, rule: b.rule });
  for (let k = 0; k < G.n; k++) if (Object.values(placed.masks).some(m => m[k])) occ[k] = 1;
  prog.bolalar = play;
  if (vd.id === 'C') { const w = G.u8(); for (let k = 0; k < G.n; k++) w[k] = C.site[k] && !C.water[k] && dW[k] <= 5 && !hard[k] && dCanal[k] > 4 ? 1 : 0; prog.botqoq = w; }
  if (vd.id !== 'A') prog.yomgir_bogi = rainGardens(C, paths, dW, occ);
  // oʻtloq: maysa ichida, yoʻldan ≥ 8 m; avval qiya joylar
  const dHard = distance(G, hard), cand: number[] = [];
  for (let k = 0; k < G.n; k++) if (C.grass[k] && C.site[k] && !C.water[k] && dHard[k] >= 8 && !occ[k] && !play[k] && !courts.m[k] && !(opt.tarixiy && C.rpa[k])) cand.push(k);
  cand.sort((a, b) => C.S[b] - C.S[a]);
  const grassA = area(G, C.grass), meadow = G.u8(); for (let i = 0; i < Math.min(cand.length, Math.floor(vd.meadow * grassA / G.cellA)); i++) meadow[cand[i]] = 1;
  tidy(G, meadow, C.grass, 250);   // oʻtloq: tarqoq kataklar emas, yaxlit maydonlar (≥ 250 m²)
  prog.otloq = meadow;
  // ---- 8. metrikalar ----
  const cellA = G.cellA, siteA = area(G, C.site), waterA = countAnd(C.site, C.water) * cellA;
  const hardAll = G.u8(); for (let k = 0; k < G.n; k++) hardAll[k] = hard[k] || C.bld[k] || courts.m[k] || (prog.amfiteatr?.[k] ?? 0) || (prog.terrasa?.[k] ?? 0) || (prog.workout?.[k] ?? 0) || (prog.xizmat?.[k] ?? 0) || (prog.maydon?.[k] ?? 0) || (prog.skeyt?.[k] ?? 0) || (prog.suv_oyin?.[k] ?? 0) ? 1 : 0;
  const hardA = countAnd(C.site, hardAll) * cellA;
  const conflict = C.trees.filter(t => { const k = G.idx(t.p[0], t.p[1]); return k >= 0 && (hard[k] || courts.m[k] || (prog.amfiteatr?.[k] ?? 0)) && !C.exPath[k]; });
  const lawnLeft = area(G, andNot(C.grass, meadow)), other = siteA - waterA - hardA - grassA;
  const lenT = (t: Tier) => paths.filter(p => p.tier === t).reduce((s, p) => s + len(p.g), 0);
  const prd = ods.filter(o => o.path.length).map(o => o.prd);
  const mgnOver = paths.filter(p => p.tier !== 'zina' && (p.grade ?? 0) > 5).reduce((s, p) => s + len(p.g), 0);
  const V: Variant = {
    id: vd.id, name: vd.name, desc: vd.desc + (paths.some(p => p.tier === 'sohil') ? (vd.id === 'B' ? ` Suv boʻyida: sohil promenadasi${bridges.length ? ', koʻpriklar' : ''}${prog.amfiteatr ? ', amfiteatr' : ''}.` : ' Suv boʻyida: tabiiy sohil yoʻli va botqoq qirgʻoq.') : ''), paths, bridges, items,
    gates: gates.map((p, i) => ({ p, f: gateF[i], main: gateF[i] >= 0.5 * gf })),
    prog: progVec(G, prog, placed.blocks), blocks: placed.blocks, ...fitoutAll(placed.blocks), miss: placed.miss, fixed: C.fixed,
    m: { gates: gates.length, pathLen: Math.round(paths.reduce((s, p) => s + len(p.g), 0)), asosiy: Math.round(lenT('asosiy')), ikkinchi: Math.round(lenT('ikkinchi')), soqmoq: Math.round(lenT('soqmoq')), sohil: Math.round(lenT('sohil')), rampa: Math.round(lenT('rampa')), zina: Math.round(lenT('zina')),
      hard: Math.round(hardA), greenPct: Math.round((siteA - waterA - hardA) / siteA * 1000) / 10, prd: avg(prd), prdP90: pct(prd, 0.9), sport: Math.round(area(G, exSport) + area(G, courts.m)), meadow: Math.round(area(G, meadow)),
      wetland: Math.round(prog.botqoq ? area(G, prog.botqoq) : 0), rain: Math.round(prog.yomgir_bogi ? area(G, prog.yomgir_bogi) : 0), conflict: conflict.length, conflictBig: conflict.filter(t => t.d >= 40).length,
      irrLo: Math.round((lawnLeft * 15 + area(G, meadow) * 3 + other * 3) / 1000), irrHi: Math.round((lawnLeft * 20 + area(G, meadow) * 4 + other * 4) / 1000), earth: Math.round(courts.earth), mgnOver: Math.round(mgnOver), lawn: Math.round(lawnLeft), other: Math.round(other) },
    earth: { cut: Math.round(courts.earth / 2), fill: Math.round(courts.earth / 2) },
  };
  void A;
  return { V, masks: { hard, ...prog }, ods };
}

/* ---------------- yordamchilar ---------------- */
/** Niqobni tartibga solish: koʻpchilik filtri (2 marta, faqat ruxsat etilgan kataklarda) va kichik boʻlaklarni olib tashlash */
function tidy(G: Grid, m: Uint8Array, allow: Uint8Array, minA: number): void {
  const nx = G.nx;
  for (let it = 0; it < 2; it++) { const src = m.slice(); for (let j = 1; j < G.ny - 1; j++) for (let i = 1; i < nx - 1; i++) { const k = j * nx + i; let n = 0; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) n += src[k + b * nx + a]; m[k] = n >= 5 && (src[k] || allow[k]) ? 1 : n <= 3 ? 0 : src[k]; } }
  const seen = new Uint8Array(G.n);
  for (let k0 = 0; k0 < G.n; k0++) if (m[k0] && !seen[k0]) { const comp = [k0]; seen[k0] = 1; for (let q = 0; q < comp.length; q++) { const k = comp[q], i = k % nx; for (const d of [1, -1, nx, -nx]) { const t = k + d; if (t < 0 || t >= G.n || seen[t] || !m[t] || (d === 1 && i === nx - 1) || (d === -1 && i === 0)) continue; seen[t] = 1; comp.push(t); } } if (comp.length * G.cellA < minA) for (const k of comp) m[k] = 0; }
}
const avg = (a: number[]) => (a.length ? Math.round(a.reduce((s, v) => s + v, 0) / a.length * 100) / 100 : 0);
const pct = (a: number[], p: number) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return Math.round(s[Math.min(s.length - 1, Math.floor(p * s.length))] * 100) / 100; };
const countAnd = (a: Uint8Array, b: Uint8Array) => { let n = 0; for (let k = 0; k < a.length; k++) if (a[k] && b[k]) n++; return n; };
function fillRing(G: Grid, m: Uint8Array, r: XY[]): void { // bitta halqa
  for (let j = 0; j < G.ny; j++) { const y = G.cy(j), xs: number[] = []; for (let k = 0, l = r.length - 1; k < r.length; l = k++) { const [x1, y1] = r[k], [x2, y2] = r[l]; if ((y1 > y) !== (y2 > y)) xs.push(x1 + (y - y1) * (x2 - x1) / (y2 - y1)); } xs.sort((a, b) => a - b); for (let q = 0; q + 1 < xs.length; q += 2) for (let i = Math.max(0, Math.ceil((xs[q] - G.x0) / G.step - 0.5)); i <= Math.min(G.nx - 1, Math.floor((xs[q + 1] - G.x0) / G.step - 0.5)); i++) m[j * G.nx + i] = 1; }
}
function near(p: XY, l: XY[], d: number): boolean { for (let k = 1; k < l.length; k++) { const a = l[k - 1], b = l[k], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-9, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)); if (Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy) < d) return true; } return false; }
function segRing(a: XY, b: XY, R: XY[]): XY | null { for (let k = 0; k < R.length; k++) { const c = R[k], d = R[(k + 1) % R.length]; const x = segX(a, b, c, d); if (x) return x; } return null; }
function segX(a: XY, b: XY, c: XY, d: XY): XY | null { const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]], den = r[0] * s[1] - r[1] * s[0]; if (Math.abs(den) < 1e-9) return null; const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den, u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den; return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [a[0] + t * r[0], a[1] + t * r[1]] : null; }
function segHitsLine(a: XY, b: XY, l: XY[]): boolean { for (let k = 1; k < l.length; k++) if (segX(a, b, l[k - 1], l[k])) return true; return false; }
function nearestOnRing(p: XY, R: XY[]): XY { let best: XY = R[0], bd = Infinity; for (let k = 0; k < R.length; k++) { const a = R[k], b = R[(k + 1) % R.length], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-9, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)), q: XY = [a[0] + t * dx, a[1] + t * dy], d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; best = q; } } return best; }
function ringPos(p: XY, R: XY[]): number { let s = 0, best = 0, bd = Infinity; for (let k = 0; k < R.length; k++) { const a = R[k], b = R[(k + 1) % R.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (L * L || 1e-9))), d = Math.hypot(a[0] + t * dx - p[0], a[1] + t * dy - p[1]); if (d < bd) { bd = d; best = s + t * L; } s += L; } return best; }
function clusterGates(pts: XY[], R: XY[], tol: number): XY[] { const s = pts.map(p => ({ p, t: ringPos(p, R) })).sort((a, b) => a.t - b.t); const out: { p: XY; t: number }[][] = []; for (const q of s) { const l = out[out.length - 1]; if (l && q.t - l[l.length - 1].t < tol) l.push(q); else out.push([q]); } return out.map(g => { const x = g.reduce((a, q) => a + q.p[0], 0) / g.length, y = g.reduce((a, q) => a + q.p[1], 0) / g.length; return nearestOnRing([x, y], R); }); }
function splitBy(r: XY[], keep: (p: XY) => boolean): XY[][] { const out: XY[][] = []; let cur: XY[] = []; for (const p of r) { if (keep(p)) cur.push(p); else if (cur.length) { out.push(cur); cur = []; } } if (cur.length) out.push(cur); return out; }

/** Nishab boʻyicha boʻlaklash: ≤ 5 % — oddiy yoʻl; 5–8 % — rampa (har 9–12 m maydoncha); > 8 % — zina (yonida rampa yoki aylanma) */
function pushGraded(out: Variant['paths'], pts: XY[], C: Ctx, tier: Tier, w: number): void {
  const z = (p: XY) => { const k = C.G.idx(p[0], p[1]); return k >= 0 && Number.isFinite(C.E[k]) ? C.E[k] : NaN; };
  let cur: XY[] = [pts[0]], curT: Tier = tier, curG = 0;
  const kind = (g: number): Tier => (tier === 'soqmoq' || tier === 'sohil' ? tier : g > 8 ? 'zina' : g > 5 ? 'rampa' : tier);
  // zina / rampa faqat ishonchli balandlik farqida: qoʻpol relyefda ≥ 1,5 m, syomkada ≥ 0,45 m (3 pogʻona) — aks holda oddiy yoʻl (T)
  const sure = (g: XY[], t: Tier): Tier => { if (t !== 'zina' && t !== 'rampa') return t; const dz = Math.abs(z(g[g.length - 1]) - z(g[0])); return Number.isFinite(dz) && dz >= (C.rough ? 1.5 : 0.45) ? t : tier; };
  for (let k = 1; k < pts.length; k++) {
    const d = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]) || 1e-6, g = Math.abs(z(pts[k]) - z(pts[k - 1])) / d * 100, t = kind(Number.isFinite(g) ? g : 0);
    if (t !== curT && cur.length > 1 && len(cur) > 6) { const tt = sure(cur, curT); out.push({ g: cur, tier: tt, w: tt === 'zina' ? Math.max(w, 2) : w, grade: tt === curT ? curG : Math.min(curG, 5) }); cur = [pts[k - 1]]; curG = 0; }
    curT = t; cur.push(pts[k]); curG = Math.max(curG, Number.isFinite(g) ? g : 0);
  }
  if (cur.length > 1) { const tt = sure(cur, curT); out.push({ g: cur, tier: tt, w, grade: tt === curT ? curG : Math.min(curG, 5) }); }
}

/** Amfiteatr: suvga qaragan qiyalik (gradient yoʻnalishi suv tomonga), 8–25 %, suvdan 8–40 m, katta daraxtlarsiz */
export function amphitheatre(C: Ctx, dW: Float32Array, bigRpa: Uint8Array, hard: Uint8Array): { m: Uint8Array; c: XY; slope: number; dw: number; rows: number } | null {
  const G = C.G, nx = G.nx; let best = -1, bs = -Infinity;
  for (let j = 2; j < G.ny - 2; j++) for (let i = 2; i < nx - 2; i++) {
    const k = j * nx + i; if (!C.site[k] || C.water[k] || dW[k] < 8 || dW[k] > 40 || bigRpa[k] || C.bld[k]) continue;
    const s = C.S[k]; if (s < 8 || s > 25) continue;
    const gx = (C.E[k + 1] - C.E[k - 1]) / 2, gy = (C.E[k + nx] - C.E[k - nx]) / 2, wx = dW[k + 1] - dW[k - 1], wy = dW[k + nx] - dW[k - nx];
    const cos = (gx * wx + gy * wy) / ((Math.hypot(gx, gy) * Math.hypot(wx, wy)) || 1e9);   // yuqoriga = suvdan uzoqqa → yon bagʻir suvga qaragan
    if (cos < 0.6) continue;
    let free = 0; for (let dj = -5; dj <= 5; dj++) for (let di = -5; di <= 5; di++) { const q = (j + dj) * nx + i + di; if (C.site[q] && !bigRpa[q] && !C.water[q] && !C.bld[q]) free++; }
    const score = cos * 2 + free / 121 * 2 - Math.abs(s - 15) / 15 - (hard[k] ? 0.3 : 0);
    if (score > bs) { bs = score; best = k; }
  }
  if (best < 0) return null;
  const bi = best % nx, bj = (best / nx) | 0, c: XY = [G.cx(bi), G.cy(bj)];
  // markaz — suv tomonda (sahna), qatorlar qiyalik boʻylab yuqoriga
  const gx = dW[best + 1] - dW[best - 1], gy = dW[best + nx] - dW[best - nx], L = Math.hypot(gx, gy) || 1, ux = -gx / L, uy = -gy / L;
  const stage: XY = [c[0] + ux * 8, c[1] + uy * 8], m = G.u8(); let rows = 0;
  for (let k = 0; k < G.n; k++) { const x = G.cx(k % nx) - stage[0], y = G.cy((k / nx) | 0) - stage[1], r = Math.hypot(x, y); if (r < 5 || r > 17) continue; const cs = -(x * ux + y * uy) / r; if (cs > Math.cos(55 * Math.PI / 180) && C.site[k] && !C.water[k] && !bigRpa[k]) m[k] = 1; }
  rows = 5;
  return { m, c, slope: C.S[best], dw: dW[best], rows };
}
/** Terrasa: suvga ≤ 40 m dagi ovqatlanish binosi yoki suvga eng yaqin bino oldida, suv tomonda 14 × 6 m */
export function terrace(C: Ctx, dW: Float32Array): { m: Uint8Array; c: XY; why: string } | null {
  const G = C.G; let best: { c: XY; d: number } | null = null;
  for (const b of C.blds) { const r = b[0][0]; let x = 0, y = 0; for (const p of r) { x += p[0]; y += p[1]; } const c: XY = [x / r.length, y / r.length], k = G.idx(c[0], c[1]); if (k < 0) continue; const d = dW[k]; if (d <= 40 && (!best || d < best.d)) best = { c, d }; }
  if (!best) return null;
  // suvga qarab siljish
  let p = best.c; for (let s = 0; s < 40; s++) { const k = G.idx(p[0], p[1]); if (k < 0 || dW[k] <= 1) break; const gx = dW[k + 1] - dW[k - 1], gy = dW[k + G.nx] - dW[k - G.nx], L = Math.hypot(gx, gy) || 1; p = [p[0] - gx / L * G.step, p[1] - gy / L * G.step]; }
  const m = G.u8(); strokeLine(G, m, [p, p], 12); for (let k = 0; k < G.n; k++) if (dW[k] > 8 && !C.water[k]) m[k] = 0;
  return { m, c: p, why: `suv boʻyidagi bino oldida (suvdan ${best.d.toFixed(0)} m), suvga 6 m konsol` };
}
/** Koʻpriklar orolga: qirgʻoq–orol juftlari, suv oraligʻi ≤ 30 m, oraliq ≥ 40 m */
function findBridges(C: Ctx, n: number): Variant['bridges'] {
  if (!C.island.length) return [];
  const out: Variant['bridges'] = [];
  const shore = C.lakes.flatMap(mp => mp.map(p => p[0]));
  const big = C.trees.filter(t => t.d >= 40);
  const cands: { a: XY; b: XY; d: number }[] = [];
  for (const isl of C.island) for (let k = 0; k < isl.length; k += 2) { const b = isl[k]; for (const r of shore) { const a = nearestOnRing(b, r), d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (d >= 6 && d <= 30 && !big.some(t => Math.hypot(t.p[0] - a[0], t.p[1] - a[1]) < t.rpa) && !C.canals.some(c => c.some(q => Math.hypot(q[0] - a[0], q[1] - a[1]) < 12))) cands.push({ a, b, d }); } }
  cands.sort((p, q) => p.d - q.d);
  for (const c of cands) { if (out.length >= n) break; if (out.some(o => Math.hypot(o.g[1][0] - c.b[0], o.g[1][1] - c.b[1]) < 40)) continue; out.push({ g: [c.a, c.b], w: 2.4, why: `suv oraligʻi ${c.d.toFixed(0)} m — eng qisqa` }); }
  return out;
}
/** Qushxona: orolda koʻprik uchlari va yoʻllardan eng uzoq, suv chetidan ≤ 8 m */
function birdHide(C: Ctx, br: Variant['bridges'], paths: Variant['paths']): { m: Uint8Array; c: XY; why: string } | null {
  const G = C.G; let best: XY | null = null, bd = -1;
  for (const r of C.island) for (const q of r) { const d = Math.min(...br.map(b => Math.hypot(b.g[1][0] - q[0], b.g[1][1] - q[1])), ...paths.filter(p => p.tier !== 'soqmoq').map(p => minD(q, p.g))); if (d > bd) { bd = d; best = q; } }
  if (!best) return null;
  const m = G.u8(); strokeLine(G, m, [best, best], 7);
  return { m, c: best, why: `orolda, koʻprik va yoʻllardan ${bd.toFixed(0)} m uzoqda` };
}
const minD = (p: XY, l: XY[]) => { let m = Infinity; for (const q of l) m = Math.min(m, Math.hypot(q[0] - p[0], q[1] - p[1])); return m; };
/** Yomgʻir bogʻlari: D8 oqim toʻplanishi eng katta, suvdan ≤ 90 m, yoʻldan ≤ 10 m, band boʻlmagan kataklar → 5 m doiralar */
function rainGardens(C: Ctx, paths: Variant['paths'], dW: Float32Array, occ: Uint8Array): Uint8Array {
  const G = C.G, nx = G.nx, acc = new Float32Array(G.n).fill(1), order = [...Array(G.n).keys()].filter(k => C.site[k] && Number.isFinite(C.E[k])).sort((a, b) => C.E[b] - C.E[a]);
  for (const k of order) { const i = k % nx, j = (k / nx) | 0; let best = -1, bz = C.E[k]; for (const [di, dj] of MOV.slice(0, 8)) { const q = (j + dj) * nx + i + di; if (q >= 0 && q < G.n && C.E[q] < bz) { bz = C.E[q]; best = q; } } if (best >= 0) acc[best] += acc[k]; }
  const pm = G.u8(); for (const p of paths) if (p.tier === 'asosiy' || p.tier === 'ikkinchi') strokeLine(G, pm, p.g, p.w + 20);
  const cand = order.filter(k => pm[k] && !occ[k] && !C.water[k] && dW[k] <= 90 && dW[k] > 6 && !C.rpa[k]).sort((a, b) => acc[b] - acc[a]);
  const m = G.u8(), picked: XY[] = [];
  for (const k of cand) { const p: XY = [G.cx(k % nx), G.cy((k / nx) | 0)]; if (picked.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < 35)) continue; picked.push(p); strokeLine(G, m, [p, p], 9); if (picked.length >= 8) break; }
  for (let k = 0; k < G.n; k++) if (occ[k]) m[k] = 0;
  return m;
}
export { interp };
