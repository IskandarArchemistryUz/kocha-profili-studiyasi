/**
 * Bogʻshunos — ekish moduli (9-qadam): mavjud daraxtlar boʻyicha qaror + yangi daraxt va butalar + xilma-xillik.
 *
 * Qoidalar (teg bilan):
 *  · Mavjud daraxt: yangi qattiq qoplama / sport / amfiteatr ostida va mavjud yoʻlda emas → ziddiyat. dbh < 40 sm — koʻchiriladi (T),
 *    ≥ 40 sm — saqlanadi, yoʻl suriladi (480-band, N). Ailanthus altissima — invaziv, kesiladi (T). Qolgani saqlanadi.
 *  · Yangi daraxt joyi: hudud ichida, suv, bino, kanal sohili (cheklov «qizil») va dastur elementlaridan tashqarida;
 *    bino devoridan ≥ 5 m, yoʻl chetidan ≥ 1,5 m (35-jadval: 5,0 m / 0,7 m — N; yoʻl uchun zaxira T); mavjud toj chetidan ≥ 0,6 r.
 *  · Ustuvorlik: asosiy/sohil yoʻl chetidan 2–6 m (soya, T) → bolalar maydonidan ≤ 15 m → suv boʻyi ≤ 20 m → > 12 % qiyalik (eroziya, T) → maysa cheti.
 *  · Maqsad: toj qoplami ≥ 30 % (3-30-300, Konijnendijk 2023 — A); yetuk toj diametri — kattalik sinfidan (assort.CROWN, P).
 *  · Tur: zona boʻyicha filtr (soya — Д1; suv — namlikka talabchan; bolalar — tikonsiz, gullaydigan; qiyalik — chuqur ildizli, kam suv),
 *    keyin R22 xilma-xillik (tur ≤ 5 %, turkum ≤ 10 %, oila ≤ 20 % — loyiha qoidasi; Santamour 10-20-30 asosida, A) eng kam buziladigan tur;
 *    teng boʻlsa — mahalliy, kam suv talab qiladigan, reyestrda kam uchraydigan.
 *  · Butalar: darvozalar va bolalar maydonlari atrofida 3–6 m halqada guruhlar (5 tup, T).
 */
import type { XY } from './types';
import type { Ctx, Analysis } from './analyze';
import type { DesignOut } from './design';
import { distance, strokeLine, area, andNot } from './grid';
import { ASSORT, FAMILY, genus, crownOf, type Sp } from './assort';
import { SPECIES } from './species';

export type Zone = 'soya' | 'bolalar' | 'suv' | 'qiyalik' | 'ochiq';
export interface NewTree { p: XY; sp: Sp; crown: number; zone: Zone }
export interface ShrubGroup { p: XY; sp: Sp; n: number }
export type Decision = 'saqlanadi' | 'kochiriladi' | 'yol_suriladi' | 'kesiladi';
export interface Planting {
  decisions: Decision[]; counts: Record<Decision, number>;
  trees: NewTree[]; shrubs: ShrubGroup[];
  canopy0: number; canopy1: number; target: number;
  mix: { lat: string; ru: string; n: number; nNew: number; share: number }[];
  r22: { sp: [string, number]; genus: [string, number]; family: [string, number]; ok: boolean }; r22_0: { sp: [string, number]; genus: [string, number]; family: [string, number] };
  native: number; lowWater: number; zones: Record<Zone, number>;
}

const THORNY = new Set(['Gleditsia triacanthos', 'Elaeagnus angustifolia', 'Berberis vulgaris', 'Hippophae rhamnoides', 'Rosa canina', 'Crataegus turkestanica', 'Crataegus pontica', 'Ziziphus jujuba', 'Prunus bucharica']);
const isTree = (s: Sp) => s.g !== 'buta';
/** Reyestr nomi (oʻzbekcha) → lotincha */
const latOfReg = (sp: string) => SPECIES[sp]?.[0] ?? sp;

/** Deterministik tasodif (bir xil kirish → bir xil reja) */
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function plant(C: Ctx, A: Analysis, DO: DesignOut, cls: Uint8Array, opt: { target?: number; maxNew?: number } = {}): Planting {
  const G = C.G, M = DO.masks, V = DO.V, target = opt.target ?? 30, maxNew = opt.maxNew ?? 600;
  void A;
  // ---- 1. mavjud daraxtlar ----
  const hit = (k: number) => !!(M.hard?.[k] || M.sport_yangi?.[k] || M.amfiteatr?.[k]) && !C.exPath[k];
  const decisions: Decision[] = C.trees.map(t => { const k = G.idx(t.p[0], t.p[1]); if (latOfReg(t.sp) === 'Ailanthus altissima') return 'kesiladi'; if (k >= 0 && hit(k)) return t.d >= 40 ? 'yol_suriladi' : 'kochiriladi'; return 'saqlanadi'; });
  const counts = { saqlanadi: 0, kochiriladi: 0, yol_suriladi: 0, kesiladi: 0 } as Record<Decision, number>; for (const d of decisions) counts[d]++;
  // ---- 2. toj niqobi (saqlanadigan + koʻchirilgan daraxtlar oʻz joyida emas — hisobga olinmaydi) ----
  const crown = G.u8(); C.trees.forEach((t, i) => { if (decisions[i] === 'saqlanadi' || decisions[i] === 'yol_suriladi') strokeLine(G, crown, [t.p, t.p], Math.max(2, t.c)); });
  const land = andNot(C.site, C.water), siteA = area(G, C.site), canopyOf = (m: Uint8Array) => { let n = 0; for (let k = 0; k < G.n; k++) if (m[k] && land[k]) n++; return n * G.cellA / siteA * 100; };
  const canopy0 = canopyOf(crown);
  // ---- 3. nomzod kataklar ----
  const block = G.u8(); for (let k = 0; k < G.n; k++) block[k] = !C.site[k] || C.water[k] || C.bld[k] || cls[k] === 2 || M.hard?.[k] || M.sport_yangi?.[k] || M.sport_mavjud?.[k] || M.bolalar?.[k] || M.amfiteatr?.[k] || M.terrasa?.[k] || M.qushxona?.[k] || M.botqoq?.[k] ? 1 : 0;
  const dBld = distance(G, C.bld), dHard = distance(G, M.hard ?? G.u8()), dCrown = distance(G, crown), dW = distance(G, C.water), dPlay = distance(G, M.bolalar ?? G.u8());
  const main = G.u8(); for (const p of V.paths) if (p.tier === 'asosiy' || p.tier === 'sohil' || p.tier === 'ikkinchi') strokeLine(G, main, p.g, p.w); const dMain = distance(G, main);
  const R = rng(17), cand: { k: number; s: number; z: Zone }[] = [];
  for (let k = 0; k < G.n; k++) {
    if (block[k] || dBld[k] < 5 || dHard[k] < 1.5) continue;
    let z: Zone = 'ochiq', s = C.grass[k] ? 1 : 0.6;
    if (dMain[k] >= 2 && dMain[k] <= 6) { z = 'soya'; s = 4; }
    else if (dPlay[k] <= 15) { z = 'bolalar'; s = 3; }
    else if (dW[k] <= 20) { z = 'suv'; s = 2.5; }
    else if (C.S[k] > 12) { z = 'qiyalik'; s = 2; }
    if (M.otloq?.[k]) s *= 0.5;   // oʻtloqlar asosan ochiq qoladi (T)
    cand.push({ k, s: s + R() * 0.5, z });
  }
  cand.sort((a, b) => b.s - a.s);
  // zonalar navbat bilan (vazn: soya 3, bolalar 2, suv 2, qiyalik 1, ochiq 1 — T): bitta zona hammasini olib qoʻymaydi
  const Z: Zone[] = ['soya', 'bolalar', 'suv', 'qiyalik', 'ochiq'], WZ: Record<Zone, number> = { soya: 3, bolalar: 2, suv: 2, qiyalik: 1, ochiq: 1 };
  const byZ = Object.fromEntries(Z.map(z => [z, cand.filter(c => c.z === z)])) as Record<Zone, typeof cand>;
  const order: typeof cand = []; const idx = Object.fromEntries(Z.map(z => [z, 0])) as Record<Zone, number>;
  for (let more = true; more;) { more = false; for (const z of Z) for (let w = 0; w < WZ[z]; w++) { const q = byZ[z][idx[z]++]; if (q) { order.push(q); more = true; } } }
  // ---- 4. tur tanlash (R22) ----
  const comp = { sp: new Map<string, number>(), ge: new Map<string, number>(), fa: new Map<string, number>() }; let N = 0;
  const addC = (lat: string) => { const g = genus(lat), f = FAMILY[g] ?? g; comp.sp.set(lat, (comp.sp.get(lat) ?? 0) + 1); comp.ge.set(g, (comp.ge.get(g) ?? 0) + 1); comp.fa.set(f, (comp.fa.get(f) ?? 0) + 1); N++; };
  C.trees.forEach((t, i) => { if (decisions[i] !== 'kesiladi') addC(latOfReg(t.sp)); });
  const top0 = (m: Map<string, number>): [string, number] => { let b: [string, number] = ['', 0]; for (const [k, v] of m) if (v > b[1]) b = [k, v]; return [b[0], b[1] / Math.max(1, N) * 100]; };
  const r22_0 = { sp: top0(comp.sp), genus: top0(comp.ge), family: top0(comp.fa) };
  const viol = (lat: string) => { const g = genus(lat), f = FAMILY[g] ?? g, n = N + 1; return Math.max(((comp.sp.get(lat) ?? 0) + 1) / n / 0.05, ((comp.ge.get(g) ?? 0) + 1) / n / 0.10, ((comp.fa.get(f) ?? 0) + 1) / n / 0.20); };
  const POOL: Record<Zone, (s: Sp) => boolean> = {
    soya: s => isTree(s) && (s.size === 'Д1' || s.size === 'Д2') && s.g === 'barg',
    bolalar: s => isTree(s) && !THORNY.has(s.lat) && (s.size === 'Д3' || s.size === 'Д2' || s.size === 'Д4'),
    suv: s => isTree(s) && s.water === 'Т' && s.g === 'barg',
    qiyalik: s => isTree(s) && s.water === 'НТ' && (s.size !== 'Д1К'),
    ochiq: s => isTree(s),
  };
  const pick = (z: Zone, igna: number, total: number): Sp => {
    let pool = ASSORT.filter(POOL[z]); if (!pool.length) pool = ASSORT.filter(isTree); if (!pool.length) pool = ASSORT.filter(s => s.g !== 'buta'); if (igna / Math.max(1, total) >= 0.15) { const p2 = pool.filter(s => s.g !== 'igna'); if (p2.length) pool = p2; }   // igna bargli ≤ 15 % (T)
    return pool.map(s => ({ s, v: viol(s.lat) - (s.native ? 0.15 : 0) - (s.water === 'НТ' ? 0.08 : 0) + Math.min(0.1, s.reg / 2e6) })).sort((a, b) => a.v - b.v)[0].s;
  };
  // ---- 5. joylashtirish (ochkoʻz, toʻqnashuvsiz) ----
  const trees: NewTree[] = [], cur = crown.slice(); let canopy = canopy0, igna = 0;
  const near = (p: XY, r: number) => trees.some(t => Math.hypot(t.p[0] - p[0], t.p[1] - p[1]) < (t.crown / 2 + r) * 0.85);
  for (const c of order) {
    if (canopy >= target || trees.length >= maxNew) break;
    const p: XY = [G.cx(c.k % G.nx), G.cy((c.k / G.nx) | 0)];
    const sp = pick(c.z, igna, trees.length), cr = crownOf(sp.size), r = cr / 2;
    if (dCrown[c.k] < 0.6 * r || near(p, r) || dBld[c.k] < Math.max(5, r * 0.8)) continue;
    trees.push({ p, sp, crown: cr, zone: c.z }); addC(sp.lat); if (sp.g === 'igna') igna++;
    strokeLine(G, cur, [p, p], cr); canopy = canopyOf(cur);
  }
  // ---- 6. butalar ----
  const shrubs: ShrubGroup[] = [], SH = ASSORT.filter(s => s.g === 'buta');
  const ring: XY[] = []; for (const g of V.gates) ring.push(g.p);
  for (let k = 0; k < G.n; k += 7) if (dPlay[k] >= 3 && dPlay[k] <= 6 && !block[k]) ring.push([G.cx(k % G.nx), G.cy((k / G.nx) | 0)]);
  let si = 0;
  for (const p of ring) {
    const k = G.idx(p[0], p[1]); if (k < 0 || block[k] && !V.gates.some(g => g.p === p)) continue;
    if (shrubs.some(s => Math.hypot(s.p[0] - p[0], s.p[1] - p[1]) < 14) || trees.some(t => Math.hypot(t.p[0] - p[0], t.p[1] - p[1]) < t.crown / 2)) continue;
    const okSp = SH.filter(s => dPlay[k] > 8 || !THORNY.has(s.lat)); if (!okSp.length) break; const sp = okSp[si++ % okSp.length];
    shrubs.push({ p, sp, n: 5 });
  }
  // ---- 7. koʻrsatkichlar ----
  const top = (m: Map<string, number>): [string, number] => { let b: [string, number] = ['', 0]; for (const [k, v] of m) if (v > b[1]) b = [k, v]; return [b[0], b[1] / Math.max(1, N) * 100]; };
  const r22 = { sp: top(comp.sp), genus: top(comp.ge), family: top(comp.fa), ok: false }; r22.ok = r22.sp[1] <= 5 && r22.genus[1] <= 10 && r22.family[1] <= 20;
  const mixM = new Map<string, { lat: string; ru: string; n: number; nNew: number }>();
  for (const t of trees) { const m = mixM.get(t.sp.lat) ?? { lat: t.sp.lat, ru: t.sp.ru, n: 0, nNew: 0 }; m.nNew++; mixM.set(t.sp.lat, m); }
  for (const m of mixM.values()) m.n = comp.sp.get(m.lat) ?? m.nNew;
  const zones = { soya: 0, bolalar: 0, suv: 0, qiyalik: 0, ochiq: 0 } as Record<Zone, number>; for (const t of trees) zones[t.zone]++;
  return {
    decisions, counts, trees, shrubs, canopy0, canopy1: canopy, target,
    mix: [...mixM.values()].sort((a, b) => b.nNew - a.nNew).map(m => ({ ...m, share: m.n / Math.max(1, N) * 100 })),
    r22, r22_0, native: trees.filter(t => t.sp.native).length / Math.max(1, trees.length) * 100, lowWater: trees.filter(t => t.sp.water === 'НТ').length / Math.max(1, trees.length) * 100, zones,
  };
}
