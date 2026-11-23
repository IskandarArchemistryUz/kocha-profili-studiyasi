/**
 * Bogʻshunos — qoʻlda tahrirlar (15.11.2026): avtomat variant ustiga foydalanuvchi oʻzgarishlari.
 * Tahrirlar roʻyxat sifatida saqlanadi (bekor qilish / qaytarish oson) va har hisobda asl variantga qayta qoʻllanadi:
 * yoʻl qoʻshish / oʻchirish, zona chizish, dastur elementini surish, daraxt qoʻyish / olib tashlash.
 * Natija — yangi DesignOut (niqoblar va koʻrsatkichlar qayta hisoblangan); ekish, fauna, tarmoqlar, smeta va albom shundan olinadi.
 */
import type { XY, Variant, MPoly } from './types';
import type { Ctx } from './analyze';
import type { DesignOut } from './design';
import type { Planting, NewTree } from './planting';
import { strokeLine, fillPoly, area, len } from './grid';
import { ASSORT, crownOf } from './assort';
import { TIERS, ZONES, type Tier as CTier, type ZoneKind as CZone } from './catalog';
import { ELEM, blockRing, progVec, fitoutAll, type Block, type ElKey } from './dastur';

export type Tier = CTier;
export type ZoneKind = CZone;
export type Edit =
  | { t: 'path'; g: XY[]; tier: Tier; w?: number }
  | { t: 'path-del'; i: number }            // asl variantdagi yoʻl indeksi
  | { t: 'path-set'; ref: string; tier?: Tier; w?: number; light?: 'ustun' | 'past' | 'yoq'; style?: 'yaxlit' | 'punktir'; smooth?: boolean; pirog?: string }
  | { t: 'furn'; id: string; p: XY; a: number }
  | { t: 'zone'; kind: ZoneKind; ring: XY[]; h?: number }
  | { t: 'blk'; id: string; p?: XY; a?: number; el?: ElKey; del?: boolean }   // dastur bloki: surish, burish, turini almashtirish, olib tashlash
  | { t: 'blk-add'; el: ElKey; p: XY; a: number }
  | { t: 'move'; id: string; to: XY }       // dastur elementi (amfiteatr, terrasa, qushxona) yangi markazi
  | { t: 'tree'; p: XY; sp?: string }
  | { t: 'shrub'; p: XY; sp?: string }
  | { t: 'row'; g: XY[]; sp?: string; s?: number }   // xiyobon qatori: chiziq boʻylab har s m
  | { t: 'hedge'; g: XY[]; sp?: string }               // tirik devor: chiziq boʻylab buta
  | { t: 'mass'; ring: XY[]; sp?: string[] }           // guruh: koʻpburchak yoki doira ichiga kompozitsiya
  | { t: 'tree-del'; p: XY };

/** Yoʻl kengligi darajasi boʻyicha (design.ts dagi C varianti bilan bir xil; m) */
export const TIER_W = Object.fromEntries(Object.entries(TIERS).map(([k, d]) => [k, d.w])) as Record<Tier, number>;
export const ZONE_N = Object.fromEntries(Object.entries(ZONES).map(([k, d]) => [k, d.n])) as Record<ZoneKind, string>;
const HARD_Z = new Set<ZoneKind>(['maydon']);   // «maydon» qattiq yoʻl niqobiga qoʻshiladi; boshqa qattiq zonalar — oʻz niqobi

/** Asl variantga tahrirlarni qoʻllash */
export function applyEdits(C: Ctx, DO: DesignOut, E: Edit[]): DesignOut {
  if (!E.length) return { ...DO, V: { ...DO.V, paths: DO.V.paths.map((p, i) => ({ ...p, ref: `o${i}` })) } };
  const G = C.G, V0 = DO.V;
  const del = new Set(E.filter(e => e.t === 'path-del').map(e => (e as { i: number }).i));
  const added = E.map((e, j) => ({ e, j })).filter(x => x.e.t === 'path') as { e: Extract<Edit, { t: 'path' }>; j: number }[];
  let paths: Variant['paths'] = [...V0.paths.map((p, i) => ({ ...p, ref: `o${i}` })).filter((_, i) => !del.has(i)), ...added.map(({ e, j }) => ({ g: e.g, tier: e.tier, w: e.w ?? TIER_W[e.tier], ref: `a${j}` }))];
  // yoʻl sozlamalari: oxirgi «path-set» ustun turadi; silliq — Chaikin usuli (2 marta)
  const sets = new Map<string, Extract<Edit, { t: 'path-set' }>>(); for (const e of E) if (e.t === 'path-set') sets.set(e.ref, { ...(sets.get(e.ref) ?? {}), ...e });
  const chaikin = (g: XY[]) => { let q = g; for (let it = 0; it < 2; it++) { const o: XY[] = [q[0]]; for (let i = 0; i < q.length - 1; i++) { const a = q[i], b = q[i + 1]; o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } o.push(q[q.length - 1]); q = o; } return q; };
  const wChanged = new Set<string>();
  paths = paths.map(p => { const st = sets.get(p.ref!); if (!st) return p; const tier = st.tier ?? p.tier, w = st.w ?? (st.tier ? TIER_W[st.tier] : p.w); if (w !== p.w || st.smooth) wChanged.add(p.ref!); return { ...p, tier, w, light: st.light ?? p.light, style: st.style ?? p.style, smooth: st.smooth ?? p.smooth, pirog: st.pirog ?? p.pirog, g: st.smooth ? chaikin(p.g) : p.g }; });
  // qattiq yuza: yoʻllar + darvoza maydonchalari (design.ts 6-qadam)
  // yoʻl oʻchirilmagan boʻlsa — asl niqob aynan olinadi (koʻrsatkichlar avtomat variant bilan bir xil boshlanadi)
  let hard: Uint8Array;
  if (!del.size && !wChanged.size) hard = DO.masks.hard.slice();
  else { hard = G.u8(); for (const p of paths) strokeLine(G, hard, p.g, p.w); const gf = Math.max(1e-9, ...V0.gates.map(g => g.f)); for (const g of V0.gates) strokeLine(G, hard, [g.p, g.p], 2 * (6 + 10 * g.f / gf)); }
  const rebuild = del.size > 0 || wChanged.size > 0;
  { const t = G.u8(); for (const p of paths) if (p.ref?.startsWith('a') || rebuild) strokeLine(G, t, p.g, p.w);
    for (let k = 0; k < G.n; k++) if (t[k] && C.site[k] && !C.water[k]) hard[k] = 1; else if (rebuild && !t[k] && hard[k] && !DO.masks.hard[k]) hard[k] = 0; }
  if (rebuild) for (let k = 0; k < G.n; k++) if (!C.site[k] || C.water[k]) hard[k] = 0;
  const masks: Record<string, Uint8Array> = {}; for (const [k, m] of Object.entries(DO.masks)) masks[k] = k === 'hard' ? hard : m.slice();
  let items = V0.items.map(it => ({ ...it }));
  // dastur bloklari: tahrirlar ketma-ket qoʻllanadi; blok zonalari niqobi qayta chiziladi
  let blocks: Block[] = (V0.blocks ?? []).map(b => ({ ...b })); const B0 = V0.blocks ?? [];
  E.forEach((e, j) => {
    if (e.t === 'blk') { const b = blocks.find(x => x.id === e.id); if (!b) return; if (e.del) { blocks = blocks.filter(x => x !== b); return; } if (e.p) b.p = e.p; if (e.a != null) b.a = e.a; if (e.el && ELEM[e.el]) b.el = e.el; b.rule = 'qoʻlda oʻzgartirilgan'; }
    else if (e.t === 'blk-add' && ELEM[e.el]) blocks.push({ id: `u${j}`, el: e.el, p: e.p, a: e.a, rule: 'qoʻlda qoʻshilgan' });
  });
  if (E.some(e => e.t === 'blk' || e.t === 'blk-add')) {
    for (const b of B0) { const m = masks[ELEM[b.el].zone]; if (m) fillPoly(G, m, [blockRing(b, G.step)], 0); }
    for (const b of blocks) { const z = ELEM[b.el].zone, m = masks[z] ?? (masks[z] = G.u8()), t = G.u8(); fillPoly(G, t, [blockRing(b)]); for (let k = 0; k < G.n; k++) if (t[k] && C.site[k] && !C.water[k]) { m[k] = 1; for (const [k2, m2] of Object.entries(masks)) if (k2 !== z && k2 !== 'hard' && k2 !== 'sport_mavjud') m2[k] = 0; } }
    items = [...items.filter(it => !B0.some(b => b.id === it.id)), ...blocks.map(b => ({ id: b.id, name: ELEM[b.el].n, p: b.p, rule: b.rule }))];
  }
  // elementni surish: niqob siljiydi (toʻr qadamida)
  for (const e of E) if (e.t === 'move') {
    const it = items.find(x => x.id === e.id), m = masks[e.id]; if (!it || !m) continue;
    const di = Math.round((e.to[0] - it.p[0]) / G.step), dj = Math.round((e.to[1] - it.p[1]) / G.step), out = G.u8();
    for (let k = 0; k < G.n; k++) if (m[k]) { const i = (k % G.nx) + di, j = ((k / G.nx) | 0) + dj; if (i >= 0 && j >= 0 && i < G.nx && j < G.ny) out[j * G.nx + i] = 1; }
    masks[e.id] = out; it.p = [it.p[0] + di * G.step, it.p[1] + dj * G.step]; it.rule = `${it.rule} · qoʻlda surilgan`;
  }
  for (const e of E) if (e.t === 'zone') {
    const m = G.u8(); fillPoly(G, m, [e.ring]); for (let k = 0; k < G.n; k++) if (!C.site[k] || C.water[k]) m[k] = 0;
    if (HARD_Z.has(e.kind)) { for (let k = 0; k < G.n; k++) if (m[k]) hard[k] = 1; }
    else { const t = masks[e.kind] ?? (masks[e.kind] = G.u8()); for (let k = 0; k < G.n; k++) if (m[k]) t[k] = 1; }
    // boshqa yashil zonalardan kesib olinadi (bitta katak — bitta vazifa)
    for (const [k2, t2] of Object.entries(masks)) if (k2 !== e.kind && k2 !== 'hard' && !(HARD_Z.has(e.kind) && k2 === 'hard')) for (let k = 0; k < G.n; k++) if (m[k]) t2[k] = 0;
  }
  // koʻrsatkichlar (design.ts formulalari bilan)
  const cellA = G.cellA, siteA = area(G, C.site), HZ = (Object.keys(ZONES) as ZoneKind[]).filter(z => ZONES[z].hard && z !== 'maydon' && z !== 'sport_yangi');
  let waterA = 0, hardA = 0; for (let k = 0; k < G.n; k++) if (C.site[k]) { if (C.water[k]) waterA++; if (hard[k] || C.bld[k] || masks.sport_yangi?.[k] || masks.amfiteatr?.[k] || masks.terrasa?.[k] || HZ.some(z => masks[z]?.[k])) hardA++; }   // design.ts hardAll bilan aynan bir xil
  waterA *= cellA; hardA *= cellA;
  const meadow = masks.otloq ? area(G, masks.otloq) : 0;
  // maysa: asl qiymatdan yangi qattiq yuza va yangi zonalar egallagan maysa kataklari ayiriladi (design.ts formulasi bilan mos)
  const H0 = DO.masks.hard; let lost = 0; for (let k = 0; k < G.n; k++) if (C.grass[k] && C.site[k] && !C.water[k] && !masks.otloq?.[k] && ((hard[k] && !H0[k]) || masks.bolalar?.[k] && !DO.masks.bolalar?.[k] || masks.sport_yangi?.[k] && !DO.masks.sport_yangi?.[k])) lost++;
  const lawn = Math.max(0, V0.m.lawn - lost * cellA), other = Math.max(0, siteA - waterA - hardA - lawn - meadow);
  const lenT = (t: Tier) => Math.round(paths.filter(p => p.tier === t).reduce((s, p) => s + len(p.g), 0));
  const conflict = C.trees.filter(t => { const k = G.idx(t.p[0], t.p[1]); return k >= 0 && (hard[k] || masks.sport_yangi?.[k] || masks.amfiteatr?.[k]) && !C.exPath[k]; });
  const mgnOver = paths.filter(p => p.tier !== 'zina' && (p.grade ?? 0) > 5).reduce((s, p) => s + len(p.g), 0);
  const m = { ...V0.m,
    pathLen: Math.round(paths.reduce((s, p) => s + len(p.g), 0)), asosiy: lenT('asosiy'), ikkinchi: lenT('ikkinchi'), soqmoq: lenT('soqmoq'), sohil: lenT('sohil'), rampa: lenT('rampa'), zina: lenT('zina'),
    hard: Math.round(hardA), greenPct: Math.round((siteA - waterA - hardA) / siteA * 1000) / 10, meadow: Math.round(meadow),
    wetland: Math.round(masks.botqoq ? area(G, masks.botqoq) : 0), rain: Math.round(masks.yomgir_bogi ? area(G, masks.yomgir_bogi) : 0),
    conflict: conflict.length, conflictBig: conflict.filter(t => t.d >= 40).length, mgnOver: Math.round(mgnOver), lawn: Math.round(lawn), other: Math.round(other),
    irrLo: Math.round((lawn * 15 + meadow * 3 + other * 3) / 1000), irrHi: Math.round((lawn * 20 + meadow * 4 + other * 4) / 1000), edits: E.length };
  const prog: Record<string, MPoly> = progVec(G, masks, blocks), fit = fitoutAll(blocks);
  const furn = [...fit.furn, ...E.filter(e => e.t === 'furn').map(e => { const f = e as Extract<Edit, { t: 'furn' }>; return { id: f.id, p: f.p, a: f.a }; })];
  return { V: { ...V0, paths, items, prog, m, furn, blocks, marks: fit.marks }, masks, ods: DO.ods };
}

/** Ekish kompozitsiyasi qoidalari (T — loyiha qoidasi, manba: landshaft amaliyoti; asbob panelida oʻzgartiriladi):
 *  · xiyobon qatori — daraxtlar oraligʻi = yetuk toj diametri × 0,8 (sukut), 6 m dan kam emas;
 *  · tirik devor — har 2 m da 4 tup buta (≈ 2 tup/m);
 *  · guruh (massiv) — chetdan ≥ 6 m ichkarida yirik daraxtlar, chet tasmasida kichik daraxtlar, chegarada har 3 m da buta;
 *    nuqtalar olti burchakli toʻrda, oraliq = toj diametri × 0,9 (yopiq massiv). */
const pickSp = (lat: string | undefined, f: (s: (typeof ASSORT)[number]) => boolean) => (lat && ASSORT.find(s => s.lat === lat)) || ASSORT.find(s => s.native && f(s)) || ASSORT.find(f) || ASSORT[0];
const isBig = (s: (typeof ASSORT)[number]) => s.g === 'barg' && (s.size === 'Д1' || s.size === 'Д2');
const isSmall = (s: (typeof ASSORT)[number]) => s.g === 'barg' && (s.size === 'Д3' || s.size === 'Д4');
const isShrub = (s: (typeof ASSORT)[number]) => s.g === 'buta';
function along(g: XY[], step: number, off = step / 2): XY[] { const out: XY[] = []; let acc = off; for (let i = 1; i < g.length; i++) { const a = g[i - 1], b = g[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]); while (acc <= d) { const t = acc / d; out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]); acc += step; } acc -= d; } return out; }
function inRing(p: XY, r: XY[]): boolean { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
function edgeD(p: XY, r: XY[]): number { let m = Infinity; for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length], dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)); m = Math.min(m, Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)); } return m; }
/** Kompozitsiya natijasi: daraxtlar va butalar (tahrirlardan) */
export function plantingOf(E: Edit[]): { trees: { p: XY; lat: string }[]; shrubs: { p: XY; lat: string; n: number }[] } {
  const trees: { p: XY; lat: string }[] = [], shrubs: { p: XY; lat: string; n: number }[] = [];
  for (const e of E) {
    if (e.t === 'shrub') shrubs.push({ p: e.p, lat: pickSp(e.sp, isShrub).lat, n: 1 });
    else if (e.t === 'row') { const sp = pickSp(e.sp, isBig), s = e.s ?? Math.max(6, crownOf(sp.size) * 0.8); for (const p of along(e.g, s)) trees.push({ p, lat: sp.lat }); }
    else if (e.t === 'hedge') { const sp = pickSp(e.sp, isShrub); for (const p of along(e.g, 2, 1)) shrubs.push({ p, lat: sp.lat, n: 4 }); }
    else if (e.t === 'mass') {
      const big = pickSp(e.sp?.[0], isBig), small = pickSp(e.sp?.[1], isSmall), shr = pickSp(e.sp?.[2], isShrub), R0 = e.ring;
      const xs = R0.map(q => q[0]), ys = R0.map(q => q[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const place = (sp: typeof big, ok: (d: number) => boolean) => { const s = crownOf(sp.size) * 0.9, h = s * Math.sqrt(3) / 2; let row = 0; for (let y = y0 + h / 2; y <= y1; y += h, row++) for (let x = x0 + (row % 2 ? s / 2 : 0) + s / 2; x <= x1; x += s) { const p: XY = [x, y]; if (!inRing(p, R0)) continue; const d = edgeD(p, R0); if (ok(d) && trees.every(t => Math.hypot(t.p[0] - x, t.p[1] - y) >= s * 0.75)) trees.push({ p, lat: sp.lat }); } };
      place(big, d => d >= 6); place(small, d => d >= 2 && d < 6);
      for (const p of along([...R0, R0[0]], 3, 1.5)) shrubs.push({ p, lat: shr.lat, n: 3 });
    }
  }
  return { trees, shrubs };
}

/** Daraxt tahrirlarini ekish natijasiga qoʻllash (ekish qoidalari ustidan) */
export function applyTreeEdits(C: Ctx, PL: Planting, E: Edit[], DO?: DesignOut): Planting {
  const add = E.filter(e => e.t === 'tree') as Extract<Edit, { t: 'tree' }>[], rm = E.filter(e => e.t === 'tree-del') as Extract<Edit, { t: 'tree-del' }>[];
  const comp = plantingOf(E);
  if (!add.length && !rm.length && !comp.trees.length && !comp.shrubs.length) return PL;
  const free = (p: XY) => { const k = C.G.idx(p[0], p[1]); return k >= 0 && !!C.site[k] && !C.water[k] && !C.bld[k] && !(DO?.masks.hard?.[k]); };
  const siteA = area(C.G, C.site), d2 = (a: XY, b: XY) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  let trees = PL.trees.slice(); const shrubs = PL.shrubs.slice(); const decisions = PL.decisions.slice(); let dCan = 0;
  for (const r of rm) {
    const i = trees.findIndex(t => d2(t.p, r.p) < 3);
    if (i >= 0) { dCan -= Math.PI * (trees[i].crown / 2) ** 2; trees = trees.filter((_, j) => j !== i); continue; }
    const j = C.trees.findIndex(t => d2(t.p, r.p) < 3); if (j >= 0 && decisions[j] !== 'kesiladi') { dCan -= Math.PI * Math.max(1.5, C.trees[j].c / 2) ** 2; decisions[j] = 'kesiladi'; }
  }
  for (const a of add) {
    const near = [...trees].sort((x, y) => d2(x.p, a.p) - d2(y.p, a.p))[0];
    const sp = (a.sp && ASSORT.find(s => s.lat === a.sp)) || near?.sp || pickSp(undefined, isBig), crown = crownOf(sp.size);
    trees.push({ p: a.p, sp, crown, zone: near?.zone ?? 'ochiq' } as NewTree); dCan += Math.PI * (crown / 2) ** 2;
  }
  for (const t of comp.trees) { if (!free(t.p)) continue; const sp = ASSORT.find(s => s.lat === t.lat); if (!sp) continue; const crown = crownOf(sp.size); trees.push({ p: t.p, sp, crown, zone: 'ochiq' } as NewTree); dCan += Math.PI * (crown / 2) ** 2; }
  for (const b of comp.shrubs) { if (!free(b.p)) continue; const sp = ASSORT.find(s => s.lat === b.lat); if (!sp) continue; shrubs.push({ p: b.p, sp, n: b.n }); }
  const counts = { ...PL.counts }; (Object.keys(counts) as (keyof typeof counts)[]).forEach(k => { counts[k] = decisions.filter(d => d === k).length; });
  return { ...PL, trees, shrubs, decisions, counts, canopy1: Math.max(0, PL.canopy1 + dCan / siteA * 100) };
}
