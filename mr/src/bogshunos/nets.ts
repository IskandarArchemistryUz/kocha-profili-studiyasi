/**
 * Bogʻshunos — muhandislik tarmoqlari moduli (14.11.2026): suv, kanalizatsiya, yomgʻir suvi, sugʻorish, elektr va yoritish, aloqa.
 *
 * Konsepsiya bosqichi: tarmoq trassasi qoidalar bilan topiladi (qoʻlda chizilmaydi) — ulanish nuqtasi (TU) dan isteʼmolchilarga
 * 3 m toʻrda eng arzon yoʻl (Dijkstra): yoʻl boʻyi arzon, yashil yuza qimmatroq, ildiz zonasi (RPA) juda qimmat, suv va bino — oʻtib boʻlmaydi
 * (koʻprik ustidan oʻtadi). Natija — trassa uzunligi, isteʼmolchilar, normativ masofa tekshiruvi.
 *
 * Manbalar va teglar:
 *  · ShNQ 2.07.01-23, 485-band, 35-jadval (N) — daraxt oʻqigacha: suv, drenaj, issiqlik, kabellar 2,0 m; gaz, kanalizatsiya 1,5 m;
 *    yoritish ustuni 4,0 m; bino devori 5,0 m.
 *  · ShNQ 2.07.01-23, 209-band, 8-jadval (N) — bino poydevorigacha: suv quvuri 5 m, oʻzi oqar kanalizatsiya 3 m, kabellar 0,6 m.
 *  · ShNQ 2.07.01-23, 199-band (N) — piyoda yoʻllari texnik zonada boʻlishi mumkin; quduq va kameralardan ≥ 3 m.
 *  · Yoritilganlik (A): SNiP 23-05-95, 7-jadval — shahar bogʻi: bosh kirish 6, yordamchi 2, markaziy xiyobon 4, yon xiyobon 2 lk;
 *    tuman bogʻi: 4 / 1 / 2 / 1 lk. Oʻzbekiston meʼyori (KMK 2.01.05) bilan solishtirilsin — P.
 *  · Ustun oraligʻi s = min(Φ·η·MF / (E·w), 5·h) — yorugʻlik oqimi usuli; Φ, η, MF, h — P (tanlangan yoritkichdan aniqlanadi).
 *  · Soʻqmoqlar yoritilmaydi — qorongʻi ekologik yoʻlak (fauna moduli, T).
 *  · Yomgʻir: V = ψ · h · A; ψ = 0,9 qattiq qoplama (A), hisobiy yomgʻir h = 20 mm (P); yomgʻir bogʻi sigʻimi = maydon × 0,15 m (T).
 *  · TU berilmagan boʻlsa — ulanish nuqtasi hudud chegarasining eng katta koʻchaga yaqin nuqtasi (P, «TU olinsin»).
 */
import type { XY, BgData, NetKind, BgTu } from './types';
import type { Ctx, Analysis } from './analyze';
import type { DesignOut } from './design';
import type { Planting } from './planting';
import { distance, strokeLine, distLine } from './grid';
import { TIERS } from './catalog';

export const NET: Record<Exclude<NetKind, 'gaz' | 'issiqlik'>, { n: string; c: string; tree: number; bld: number; dash?: string }> = {
  suv: { n: 'Suv quvuri (ichimlik)', c: '#2f6db5', tree: 2.0, bld: 5 },
  kanal: { n: 'Kanalizatsiya (oʻzi oqar)', c: '#8a5a2b', tree: 1.5, bld: 3 },
  sugorish: { n: 'Sugʻorish magistrali', c: '#2aa3a3', tree: 2.0, bld: 5, dash: '1.6 .8' },
  elektr: { n: 'Elektr kabeli 0,4 kV (yoritish)', c: '#d4a017', tree: 2.0, bld: 0.6 },
  aloqa: { n: 'Aloqa (optika: kamera, Wi-Fi)', c: '#7a4fb0', tree: 2.0, bld: 0.6, dash: '.6 .6' },
  yomgir: { n: 'Yomgʻir suvi (yuza oqim → yomgʻir bogʻi)', c: '#5f9e8c', tree: 1.5, bld: 3, dash: '.4 .9' },
};
export type NK = keyof typeof NET;
export const NKS = Object.keys(NET) as NK[];

export interface Consumer { id: string; n: string; p: XY; nets: NK[]; why: string }
export interface Route { kind: NK; src: XY; srcTu: boolean; lines: XY[][]; len: number; to: string[]; treeHits: { p: XY; isNew: boolean; d: number }[]; bldHits: number }
export interface Lamp { p: XY; kind: 'ustun' | 'past'; tier: string; lux: number; conflict: boolean }
export interface Nets {
  cons: Consumer[]; routes: Route[]; lamps: Lamp[];
  light: { tier: string; lux: number; s: number; n: number; len: number }[];
  kw: { light: number; pump: number; kafe: number; total: number };
  storm: { hard: number; V: number; cap: number; ratio: number };
  water: { day: number; irr: [number, number] };
  exist: number; tuN: number;
}

/* ---- parametrlar (P — yoritkich tanlangach aniqlanadi) ---- */
const LUM = { ustun: { phi: 4000, w: 40, h: 4 }, past: { phi: 700, w: 10, h: 1 } }, ETA = 0.4, MF = 0.8;
const LUX: Record<string, { bosh: number; yord: number; mark: number; yon: number }> = { shahar: { bosh: 6, yord: 2, mark: 4, yon: 2 }, tuman: { bosh: 4, yord: 1, mark: 2, yon: 1 } };

/** Toʻrda bir manbadan eng arzon yoʻllar daraxti (ikkilik uyum) */
function dijkstra(nx: number, ny: number, cost: Float32Array, src: number): { d: Float64Array; prev: Int32Array } {
  const n = nx * ny, d = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1), H: number[] = [], P: number[] = [];
  const push = (k: number, v: number) => { H.push(v); P.push(k); let i = H.length - 1; while (i > 0) { const j = (i - 1) >> 1; if (H[j] <= H[i]) break; [H[i], H[j]] = [H[j], H[i]]; [P[i], P[j]] = [P[j], P[i]]; i = j; } };
  const pop = (): [number, number] => { const v = H[0], k = P[0], lv = H.pop()!, lk = P.pop()!; if (H.length) { H[0] = lv; P[0] = lk; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < H.length && H[l] < H[m]) m = l; if (r < H.length && H[r] < H[m]) m = r; if (m === i) break; [H[i], H[m]] = [H[m], H[i]]; [P[i], P[m]] = [P[m], P[i]]; i = m; } } return [k, v]; };
  d[src] = 0; push(src, 0);
  const DX = [1, -1, 0, 0, 1, 1, -1, -1], DY = [0, 0, 1, -1, 1, -1, 1, -1], DL = [1, 1, 1, 1, Math.SQRT2, Math.SQRT2, Math.SQRT2, Math.SQRT2];
  while (H.length) {
    const [k, v] = pop(); if (v > d[k]) continue; const i = k % nx, j = (k / nx) | 0;
    for (let q = 0; q < 8; q++) { const a = i + DX[q], b = j + DY[q]; if (a < 0 || b < 0 || a >= nx || b >= ny) continue; const kk = b * nx + a, c = cost[kk]; if (!Number.isFinite(c)) continue; const nv = v + DL[q] * (c + cost[k]) / 2; if (nv < d[kk]) { d[kk] = nv; prev[kk] = k; push(kk, nv); } }
  }
  return { d, prev };
}

export function nets(C: Ctx, A: Analysis, DO: DesignOut, PL: Planting | null, data: BgData, kind: 'shahar' | 'tuman' | 'turarjoy' | 'xiyobon' | 'ormon'): Nets {
  const G = C.G, M = DO.masks, V = DO.V;
  const ptOf = (k: number): XY => [G.cx(k % G.nx), G.cy((k / G.nx) | 0)];
  // ---- 1. isteʼmolchilar (qoidalar bilan) ----
  const cons: Consumer[] = [];
  const pathPts = (tiers: string[]) => V.paths.filter(p => tiers.includes(p.tier)).flatMap(p => p.g);
  const mainPts = pathPts(['asosiy', 'ikkinchi', 'sohil']);
  const nearestOn = (p: XY, pts: XY[]) => pts.reduce((b, q) => (Math.hypot(q[0] - p[0], q[1] - p[1]) < Math.hypot(b[0] - p[0], b[1] - p[1]) ? q : b), pts[0] ?? p);
  const inward = (g: XY, d: number): XY => { const pts = mainPts.filter(q => Math.hypot(q[0] - g[0], q[1] - g[1]) >= d); return pts.length ? nearestOn(g, pts) : g; };
  const gates = [...V.gates].sort((a, b) => b.f - a.f);
  const nWc = Math.max(1, A.toilets);   // 1 hojatxona / 500 bir vaqtdagi tashrifchi — analyze (T)
  const bWc = (V.blocks ?? []).filter(b => b.el === 'wc'); bWc.forEach((b, i) => cons.push({ id: `wc${i}`, n: 'Hojatxona', p: b.p, nets: ['suv', 'kanal', 'elektr'], why: 'dastur elementi (master reja)' }));
  (V.blocks ?? []).filter(b => b.el === 'kafe').forEach((b, i) => cons.push({ id: `kafeb${i}`, n: 'Kafe paviloni', p: b.p, nets: ['suv', 'kanal', 'elektr', 'aloqa'], why: 'dastur elementi (master reja)' }));
  if (!bWc.length) for (const g of gates) { if (cons.filter(c => c.id.startsWith('wc')).length >= nWc) break; const p = inward(g.p, 15); if (cons.some(c => c.id.startsWith('wc') && Math.hypot(c.p[0] - p[0], c.p[1] - p[1]) < 150)) continue; cons.push({ id: `wc${cons.length}`, n: 'Hojatxona', p, nets: ['suv', 'kanal', 'elektr'], why: `darvoza (oqim ${Math.round(g.f)}) yonida, ichkariga 15 m; oraliq ≥ 150 m (T)` }); }
  const it = (id: string) => V.items.find(x => x.id === id);
  const ter = it('terrasa'); if (ter) cons.push({ id: 'kafe', n: 'Kafe terrasasi', p: ter.p, nets: ['suv', 'kanal', 'elektr', 'aloqa'], why: ter.rule });
  const amf = it('amfiteatr'); if (amf) cons.push({ id: 'sahna', n: 'Amfiteatr sahnasi', p: amf.p, nets: ['elektr', 'aloqa'], why: 'ovoz va yoritish' });
  const playC = (m?: Uint8Array) => { if (!m) return [] as XY[]; const seen = G.u8(), out: XY[] = []; for (let k = 0; k < G.n; k++) if (m[k] && !seen[k]) { const st = [k]; seen[k] = 1; let sx = 0, sy = 0, n = 0; while (st.length) { const c = st.pop()!, i = c % G.nx, j = (c / G.nx) | 0; const p = ptOf(c); sx += p[0]; sy += p[1]; n++; for (const [a, b] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]]) { if (a < 0 || b < 0 || a >= G.nx || b >= G.ny) continue; const kk = b * G.nx + a; if (m[kk] && !seen[kk]) { seen[kk] = 1; st.push(kk); } } } if (n * G.cellA > 30) out.push([sx / n, sy / n]); } return out; };
  playC(M.bolalar).forEach((p, i) => cons.push({ id: `fav${i}`, n: 'Ichimlik favvorasi (bolalar maydoni)', p, nets: ['suv'], why: 'bolalar maydoni markazi (T)' }));
  [...playC(M.sport_yangi), ...playC(M.sport_mavjud)].forEach((p, i) => cons.push({ id: `sfav${i}`, n: 'Ichimlik favvorasi (sport)', p, nets: ['suv', 'elektr'], why: 'sport maydoni — yoritish va suv (T)' }));
  gates.filter(g => g.main).slice(0, 4).forEach((g, i) => cons.push({ id: `cam${i}`, n: 'Kamera va Wi-Fi (bosh darvoza)', p: g.p, nets: ['aloqa', 'elektr'], why: 'bosh darvoza (T)' }));
  // sugʻorish: maysa kataklari boʻyicha 40 m qadamli nuqtalar (T)
  const lawnK: number[] = []; for (let k = 0; k < G.n; k++) if (C.site[k] && C.grass[k] && !C.water[k] && !M.hard?.[k] && !M.otloq?.[k]) lawnK.push(k);
  const irr: XY[] = []; for (const k of lawnK) { const p = ptOf(k); if (irr.every(q => Math.hypot(q[0] - p[0], q[1] - p[1]) >= 40)) irr.push(p); }
  irr.forEach((p, i) => cons.push({ id: `irr${i}`, n: 'Sugʻorish klapan quduqchasi', p, nets: ['sugorish'], why: 'maysa gidrozonasi, 40 m qadam (T)' }));
  // ---- 2. narx toʻri ----
  const onPath = G.u8(); for (const p of V.paths) strokeLine(G, onPath, p.g, p.w + 2);
  const bridge = G.u8(); for (const b of V.bridges) strokeLine(G, bridge, b.g, b.w + 1);
  const cost = G.f32(Infinity);
  for (let k = 0; k < G.n; k++) {
    if (C.bld[k] || (C.water[k] && !bridge[k])) continue;
    const inS = C.site[k]; cost[k] = !inS ? 4 : onPath[k] || bridge[k] ? 1 : C.rpa[k] ? 12 : 3;
  }
  const dBld = distance(G, C.bld);
  // ---- 3. ulanish nuqtalari ----
  const tu = (data.tu ?? []) as BgTu[];
  const B = C.boundary, roads = C.roads.filter(r => r.h === 'primary' || r.h === 'secondary' || r.h === 'trunk');
  const defSrc: XY = (() => { if (!roads.length) return gates[0]?.p ?? B[0]; let best = B[0], bd = Infinity; for (const q of B) { const d = Math.min(...roads.map(r => distLine(q, r.g))); if (d < bd) { bd = d; best = q; } } return best; })();
  const water = (() => { if (!C.lakes.length) return defSrc; const pts = C.lakes.flat(3) as unknown as XY[]; return nearestOn(nearestOn(defSrc, mainPts), pts); })();
  // ---- 4. trassalar ----
  const kept = C.trees.filter((_, i) => !PL || PL.decisions[i] === 'saqlanadi' || PL.decisions[i] === 'yol_suriladi').map(t => ({ p: t.p, isNew: false }));
  const allTrees = [...kept, ...(PL?.trees ?? []).map(t => ({ p: t.p, isNew: true }))];
  const routes: Route[] = [];
  for (const nk of NKS) {
    if (nk === 'yomgir') continue;
    const tg = cons.filter(c => c.nets.includes(nk)); if (!tg.length && nk !== 'elektr') continue;
    const t0 = tu.find(t => t.kind === nk || (nk === 'sugorish' && t.kind === 'suv')), src = t0 ? t0.p : nk === 'sugorish' ? water : defSrc;
    let sk = G.idx(src[0], src[1]); if (sk < 0 || !Number.isFinite(cost[sk])) { let bd = Infinity; for (let k = 0; k < G.n; k++) if (Number.isFinite(cost[k])) { const p = ptOf(k), d = Math.hypot(p[0] - src[0], p[1] - src[1]); if (d < bd) { bd = d; sk = k; } } }
    const ck = cost.slice(), lb = NET[nk].bld; for (let k = 0; k < G.n; k++) if (Number.isFinite(ck[k]) && dBld[k] < lb) ck[k] += 20;   // 8-jadval masofasi buzilmasin
    const { prev } = dijkstra(G.nx, G.ny, ck, sk);
    const used = G.u8(), lines: XY[][] = [], to: string[] = [];
    const targetsK = tg.map(c => ({ id: c.id, k: G.idx(c.p[0], c.p[1]) }));
    if (nk === 'elektr') for (const p of V.paths.filter(p => !!TIERS[p.tier]?.light)) { const e = [p.g[0], p.g[p.g.length - 1]]; for (const q of e) targetsK.push({ id: 'yoritish', k: G.idx(q[0], q[1]) }); }
    for (const t of targetsK) {
      if (t.k < 0) continue; let k = t.k; const ln: XY[] = []; let guard = 0;
      while (k >= 0 && guard++ < G.n) { ln.push(ptOf(k)); if (used[k] || k === sk) break; used[k] = 1; k = prev[k]; }
      if (ln.length > 1) lines.push(ln); if (!to.includes(t.id)) to.push(t.id);
    }
    used[sk] = 1;
    let L = 0; for (const l of lines) for (let i = 1; i < l.length; i++) L += Math.hypot(l[i][0] - l[i - 1][0], l[i][1] - l[i - 1][1]);
    if (nk === 'elektr') for (const p of V.paths.filter(p => !!TIERS[p.tier]?.light)) { lines.push(p.g); for (let i = 1; i < p.g.length; i++) L += Math.hypot(p.g[i][0] - p.g[i - 1][0], p.g[i][1] - p.g[i - 1][1]); }
    const lim = NET[nk].tree, treeHits = allTrees.filter(t => lines.some(l => distLine(t.p, l) < lim)).map(t => ({ ...t, d: lim }));
    let bldHits = 0; for (let k = 0; k < G.n; k++) if (used[k] && dBld[k] < NET[nk].bld) bldHits++;
    routes.push({ kind: nk, src: ptOf(sk), srcTu: !!t0, lines, len: Math.round(L), to, treeHits, bldHits });
  }
  // ---- 5. yoritish ----
  const nrm = LUX[kind === 'shahar' ? 'shahar' : 'tuman'];
  // yoritish turi va meʼyor roli — yoʻl turlari katalogidan (catalog.ts); yoritkichsiz turlar — qorongʻi yoʻlak (T)
  const TIERL: Record<string, { lux: number; lum: 'ustun' | 'past'; w: number } | null> = Object.fromEntries(Object.entries(TIERS).map(([k, d]) => [k, d.light ? { lux: d.role === 'mark' ? nrm.mark : nrm.yon, lum: d.light, w: 0 } : null]));
  const lamps: Lamp[] = [], light: Nets['light'] = [];
  // yoʻl boʻyicha foydalanuvchi tanlovi (light: ustun / past / yoq) katalog qiymatidan ustun turadi
  const effL = (p: (typeof V.paths)[number]) => p.light === 'yoq' ? null : p.light ? { lux: TIERS[p.tier]?.role === 'mark' ? nrm.mark : nrm.yon, lum: p.light, w: 0 } : TIERL[p.tier];
  const groups = new Map<string, { tier: string; cfg: { lux: number; lum: 'ustun' | 'past'; w: number }; ps: (typeof V.paths)[number][] }>();
  for (const p of V.paths) { const c = effL(p); if (!c) continue; const k = `${p.tier}|${c.lum}`; if (!groups.has(k)) groups.set(k, { tier: p.tier, cfg: c, ps: [] }); groups.get(k)!.ps.push(p); }
  for (const { tier, cfg, ps } of groups.values()) {
    const Lm = LUM[cfg.lum], w = ps[0].w, s = Math.min(Lm.phi * ETA * MF / (cfg.lux * w), 5 * Lm.h * (cfg.lum === 'past' ? 1.6 : 1));
    let n = 0, len = 0;
    for (const p of ps) {
      let acc = s / 2; for (let i = 1; i < p.g.length; i++) {
        const a = p.g[i - 1], b = p.g[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]); len += d;
        while (acc <= d) { const t = acc / d, q: XY = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]; if (lamps.every(l => Math.hypot(l.p[0] - q[0], l.p[1] - q[1]) > s * 0.6)) { lamps.push({ p: q, kind: cfg.lum, tier, lux: cfg.lux, conflict: allTrees.some(t => Math.hypot(t.p[0] - q[0], t.p[1] - q[1]) < 4) }); n++; } acc += s; }
        acc -= d;
      }
    }
    light.push({ tier, lux: cfg.lux, s: Math.round(s * 10) / 10, n, len: Math.round(len) });
  }
  // bosh darvozalar — bosh kirish yoritilganligi
  for (const g of V.gates) lamps.push({ p: g.p, kind: 'ustun', tier: g.main ? 'bosh kirish' : 'yordamchi kirish', lux: g.main ? nrm.bosh : nrm.yord, conflict: allTrees.some(t => Math.hypot(t.p[0] - g.p[0], t.p[1] - g.p[1]) < 4) });
  // ---- 6. yuklama, suv, yomgʻir ----
  const kLight = lamps.reduce((s, l) => s + LUM[l.kind].w, 0) / 1000;
  const irrHi = V.m.irrHi, pump = irrHi > 0 ? 1000 * 9.81 * (irrHi / (8 * 3600)) * 30 / 0.6 / 1000 : 0;   // 8 soatda, napor 30 m, FIK 0,6 (P)
  const kafe = ter ? 15 : 0;   // P
  const hard = V.m.hard, Vst = 0.9 * 0.02 * hard, cap = (V.m.rain + V.m.wetland * 0.5) * 0.15;
  return {
    cons, routes, lamps, light,
    kw: { light: Math.round(kLight * 10) / 10, pump: Math.round(pump * 10) / 10, kafe, total: Math.round((kLight + pump + kafe) * 10) / 10 },
    storm: { hard, V: Math.round(Vst), cap: Math.round(cap), ratio: Vst > 0 ? cap / Vst : 0 },
    water: { day: Math.round(A.visitors.Nday * 3 / 1000 * 10) / 10, irr: [V.m.irrLo, V.m.irrHi] },
    exist: (data.nets ?? []).length, tuN: tu.length,
  };
}
