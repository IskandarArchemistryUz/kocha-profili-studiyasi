/**
 * Bogʻshunos — I blok (tahlil) va 5-qadam (tashrif modeli, dastur). Metodika: claude/bogshunos-metodika-bosqichlar-14-11.md.
 * Normalar (ShNQ 2.07.01-23 joriy tahriri, asl matndan): 481/490 (minimal maydon, rekonstruksiyada −20 %), 491 (koʻkalamzor ≥ 70 %),
 * 501 (bir vaqtdagi tashrifchilar, kishi/ga), 502, 34-jadval (s, k), 33-jadval (1 000 dam oluvchiga xizmatlar), 480 (daraxt va suv saqlanadi).
 */
import type { BgData, BgFeat, BgSite, MPoly, XY, Ring } from './types';
import { Grid, bbox, fillPoly, fillMPoly, strokeLine, distance, area, andNot, or, ptInPoly, len, distLine } from './grid';
import { SPECIES } from './species';

export const Q501: Record<BgSite['kind'], number> = { shahar: 100, tuman: 100, turarjoy: 100, xiyobon: 100, ormon: 10 };
export const MIN_HA: Record<BgSite['kind'], number> = { shahar: 15, tuman: 10, turarjoy: 3, xiyobon: 0.5, ormon: 3 };
/** 33-jadval, 1 000 dam oluvchiga (N) */
export const T33: { k: string; v: number; v2?: number; u: string }[] = [
  { k: 'Kafe va tamaddixona', v: 28, u: 'oʻrin' }, { k: 'Sport maydonchalari', v: 3800, v2: 4000, u: 'm²' }, { k: 'Raqs maydonchasi', v: 20, v2: 25, u: 'm²' },
  { k: 'Ijara (prokat) punkti', v: 0.2, u: 'ish joyi' }, { k: 'Hovuzlar, suv sathi', v: 300, u: 'm²' }, { k: 'Velo stansiyalari', v: 200, u: 'joy' },
];

export interface Ctx {
  G: Grid; site: Uint8Array; water: Uint8Array; canal: Uint8Array; bld: Uint8Array; grass: Uint8Array; exPath: Uint8Array;
  E: Float32Array; S: Float32Array; rpa: Uint8Array; crown: Uint8Array;
  lakes: MPoly[]; canals: XY[][]; blds: MPoly[]; paths: { g: XY[]; h: string }[]; pitches: MPoly[]; playgrounds: MPoly[]; island: Ring[]; boundary: XY[];
  /** tegilmaydigan joylar (23.11): yodgorlik, haykal, favvora atrofi — dastur elementlari qoʻyilmaydi */
  keep?: Uint8Array;
  /** saqlanadigan obyektlar roʻyxati (OSM historic / artwork / favvora + qoʻlda belgilangan); r — tegilmaydigan radius, m (T) */
  fixed?: { p: XY; name: string; r: number; t: string }[];
  /** relyef topografik syomkadan emas (ochiq maʼlumot, qoʻpol) — zina va rampa faqat ishonchli balandlik farqida */
  rough?: boolean;
  trees: (BgData['trees'][number] & { rpa: number })[]; roads: { g: XY[]; h: string }[];
}

const gpoly = (f: BgFeat) => f.g as MPoly;
const centroidOf = (f: BgFeat): XY => { const g = f.kind === 'pg' ? (f.g as MPoly)[0][0] : (f.g as XY[]); let x = 0, y = 0; for (const p of g) { x += p[0]; y += p[1]; } return [x / g.length, y / g.length]; };
const inside = (p: XY, b: Ring) => ptInPoly(p, [b]);

/** Toʻr va niqoblar */
export function context(site: BgSite, data: BgData, step = 3): Ctx {
  const B = site.boundary, bb = bbox(B), G = Grid.around(bb, step, 30);
  const m = G.u8(); fillPoly(G, m, [B]);
  const near = (f: BgFeat, d = 80) => { const c = centroidOf(f); return c[0] > bb[0] - d && c[0] < bb[2] + d && c[1] > bb[1] - d && c[1] < bb[3] + d; };
  const lakes = data.osm.filter(f => f.kind === 'pg' && (f.v === 'water' || f.k === 'water') && f.tags?.amenity !== 'fountain' && near(f, 200)).map(gpoly);
  const water = G.u8(); for (const p of lakes) fillMPoly(G, water, p);
  const canals = data.osm.filter(f => f.k === 'waterway' && f.kind === 'ln' && f.tags?.tunnel == null && near(f, 300)).map(f => f.g as XY[]);
  const canal = G.u8(); for (const c of canals) strokeLine(G, canal, c, 6);
  const blds = data.osm.filter(f => f.k === 'building' && f.kind === 'pg' && inside(centroidOf(f), B)).map(gpoly);
  const bld = G.u8(); for (const p of blds) fillMPoly(G, bld, p);
  const grass = G.u8(); for (const f of data.osm) if (f.kind === 'pg' && f.k === 'landuse' && f.v === 'grass') fillMPoly(G, grass, gpoly(f));
  const paths = data.osm.filter(f => f.k === 'highway' && f.kind === 'ln' && ['footway', 'path', 'cycleway', 'pedestrian', 'steps', 'service', 'track'].includes(f.v)).map(f => ({ g: f.g as XY[], h: f.v })).filter(p => p.g.some(q => inside(q, B)));
  const exPath = G.u8(); for (const p of paths) strokeLine(G, exPath, p.g, p.h === 'service' ? 4 : 3);
  const roads = data.osm.filter(f => f.k === 'highway' && f.kind === 'ln' && ['trunk', 'primary', 'secondary', 'tertiary'].includes(f.v)).map(f => ({ g: f.g as XY[], h: f.v }));
  const pitches = data.osm.filter(f => f.k === 'leisure' && ['pitch', 'fitness_station', 'track'].includes(f.v) && f.kind === 'pg' && inside(centroidOf(f), B)).map(gpoly);
  const playgrounds = data.osm.filter(f => f.k === 'leisure' && f.v === 'playground' && f.kind === 'pg' && inside(centroidOf(f), B)).map(gpoly);
  const island: Ring[] = []; for (const mp of lakes) for (const poly of mp) for (const r of poly.slice(1)) island.push(r);
  // relyef → toʻr
  const E = G.f32(NaN), S = G.f32(0);
  const dem = data.dem;
  if (data.topo?.pts.length) idwTopo(G, E, data.topo.pts);
  else if (dem) for (let j = 0; j < G.ny; j++) for (let i = 0; i < G.nx; i++) {
    const x = G.cx(i), y = G.cy(j), fi = (x - dem.x0) / dem.step, fj = (y - dem.y0) / dem.step;
    const i0 = Math.max(0, Math.min(dem.nx - 2, Math.floor(fi))), j0 = Math.max(0, Math.min(dem.ny - 2, Math.floor(fj))), u = fi - i0, v = fj - j0, Z = (a: number, b: number) => dem.z[b * dem.nx + a];
    E[j * G.nx + i] = Z(i0, j0) * (1 - u) * (1 - v) + Z(i0 + 1, j0) * u * (1 - v) + Z(i0, j0 + 1) * (1 - u) * v + Z(i0 + 1, j0 + 1) * u * v;
  }
  // ochiq relyef (≈ 30 m, bino va daraxt shovqini bilan) kuchliroq tekislanadi (σ ≈ 15 m); topografik syomka — yengil
  const rough = !data.topo?.pts.length;
  smoothField(G, E, rough ? Math.max(2, Math.min(60, Math.round(1.5 * (15 / step) ** 2))) : 2);
  for (let j = 1; j < G.ny - 1; j++) for (let i = 1; i < G.nx - 1; i++) { const k = j * G.nx + i; S[k] = Math.hypot((E[k + 1] - E[k - 1]) / (2 * step), (E[k + G.nx] - E[k - G.nx]) / (2 * step)) * 100; }
  const trees = data.trees.filter(t => inside(t.p, B)).map(t => ({ ...t, rpa: Math.min(15, Math.max(2, 12 * t.d / 100)) }));
  const rpa = G.u8(), crown = G.u8();
  for (const t of trees) { if (t.d >= 20) strokeLine(G, rpa, [t.p, t.p], 2 * t.rpa); strokeLine(G, crown, [t.p, t.p], Math.max(1, t.c)); }
  // yodgorlik va favvora atrofi: nuqta — 18 m doira, poligon — 12 m chet (T); butun bogʻni qamragan yirik poligon (> 1 500 m²) hisobga olinmaydi
  const keep = G.u8(), kp = G.u8(); let nKeep = 0; const fixed: NonNullable<Ctx['fixed']> = [];
  const addFix = (p: XY, name: string, t: string, r: number) => { if (!fixed.some(q => Math.hypot(q.p[0] - p[0], q.p[1] - p[1]) < 4)) fixed.push({ p, name, t, r }); };
  for (const f of data.osm) {
    const hv = f.k === 'historic' ? f.v : f.tags?.historic, isF = f.tags?.amenity === 'fountain' || (f.k === 'amenity' && f.v === 'fountain'), isA = f.tags?.tourism === 'artwork' || (f.k === 'tourism' && f.v === 'artwork');
    if (!(hv != null || isF || isA) || f.kind === 'ln' || !inside(centroidOf(f), B)) continue;
    const t = hv != null ? (['memorial', 'monument', 'statue'].includes(hv) ? 'haykal' : 'tarixiy') : isF ? 'favvora' : 'sanat', r = t === 'haykal' ? 18 : t === 'sanat' ? 6 : 12, c = centroidOf(f);
    if (f.kind === 'pg') { const tm = G.u8(); fillMPoly(G, tm, f.g as MPoly); if (area(G, tm) > 1500) continue; for (let k = 0; k < G.n; k++) if (tm[k]) kp[k] = 1; nKeep++; }
    strokeLine(G, keep, [c, c], 2 * r);   // kichik koʻpburchak (favvora kosasi) birorta katakni toʻldirmasligi mumkin — markaz atrofi doim band
    addFix(c, f.name ?? (t === 'favvora' ? 'Favvora' : t === 'sanat' ? 'Sanʼat obyekti' : 'Yodgorlik'), t, r);
  }
  for (const q of site.keepPts ?? []) { strokeLine(G, keep, [q.p, q.p], 36); addFix(q.p, q.name || 'Haykal', 'haykal', 18); }
  if (nKeep) { const d = distance(G, kp); for (let k = 0; k < G.n; k++) if (d[k] <= 12) keep[k] = 1; }
  return { boundary: B, G, site: m, water, canal, bld, grass, exPath, E, S, rpa, crown, lakes, canals, blds, paths, pitches, playgrounds, island, trees, roads, keep, fixed, rough };
}
function smoothField(G: Grid, E: Float32Array, it: number): void {
  for (let n = 0; n < it; n++) { const c = E.slice(); for (let j = 1; j < G.ny - 1; j++) for (let i = 1; i < G.nx - 1; i++) { const k = j * G.nx + i; let s = 0, w = 0; for (const d of [0, -1, 1, -G.nx, G.nx]) if (Number.isFinite(c[k + d])) { s += c[k + d]; w++; } if (w) E[k] = s / w; } }
}
/** Topo-syomka nuqtalaridan (x, y, z) IDW interpolyatsiya */
function idwTopo(G: Grid, E: Float32Array, pts: [number, number, number][]): void {
  for (let j = 0; j < G.ny; j++) for (let i = 0; i < G.nx; i++) {
    const x = G.cx(i), y = G.cy(j); let s = 0, w = 0;
    for (const [px, py, pz] of pts) { const d2 = (px - x) ** 2 + (py - y) ** 2; if (d2 > 3600) continue; const q = 1 / (d2 + 1); s += pz * q; w += q; }
    E[j * G.nx + i] = w ? s / w : NaN;
  }
}

export interface Analysis {
  areaHa: number; perim: number; minHa: number; minOk: boolean;
  pop: { r300: number; r1000: number }; stops: { name: string; d: number }[]; metro: { name: string; d: number } | null;
  kinder: number; schools: number; parks: { name: string; ha: number; d: number }[];
  relief: { min: number; max: number; slopeMed: number; over8: number; over5: number; src: string };
  trees: { n: number; verified: number; species: number; dbhMed: number; dbhP90: number; big40: number; big60: number; canopy: number; top: [string, number][]; genus: [string, number][]; family: [string, number][]; unmapped: number };
  water: { lakeM2: number; canalM: number };
  constraints: { red: number; yellow: number; green: number; water: number; canalStrip: number; shore: number; noise: number };
  visitors: { A: number; q: number; P: number; s: [number, number]; k: number; capacity: number; demand: number; N1: number; Nday: number; perHa: number };
  program: { k: string; norm: string; need: string }[];
  toilets: number;
}

/** Tahlil: 1–5-qadamlar. canalStrip — kanal sohil mintaqasi (foydalanuvchi kengligi; nizom yoʻq — P) */
export function analyze(site: BgSite, data: BgData, C: Ctx, opt = { canalStrip: 12, shore: 10, noise: 40, s: [0.35, 0.45] as [number, number], k: 2 }): { A: Analysis; cls: Uint8Array } {
  const { G } = C, B = site.boundary;
  const areaM2 = area(G, C.site), areaHa = areaM2 / 1e4;
  let perim = 0; for (let k = 0; k < B.length; k++) { const a = B[k], b = B[(k + 1) % B.length]; perim += Math.hypot(b[0] - a[0], b[1] - a[1]); }
  const minHa = MIN_HA[site.kind] * (site.rekonstruksiya ? 0.8 : 1);
  // aholi: chegara masofasi boʻyicha
  const dB = (p: XY) => (inside(p, B) ? 0 : distLine(p, [...B, B[0]]));
  let r300 = 0, r1000 = 0; for (const c of data.pop) { const d = dB(c.p); if (d <= 300) r300 += c.n; if (d <= 1000) r1000 += c.n; }
  const pts = (pred: (f: BgFeat) => boolean, R: number) => data.osm.filter(pred).map(f => ({ name: f.name ?? '', d: dB(centroidOf(f)) })).filter(x => x.d <= R).sort((a, b) => a.d - b.d);
  const stops = pts(f => f.v === 'bus_stop' || f.tags?.public_transport === 'platform', 300);
  const metro = pts(f => f.v === 'subway_entrance' || (f.k === 'railway' && f.v === 'station'), 1200)[0] ?? null;
  const kinder = pts(f => f.v === 'kindergarten', 500).length, schools = pts(f => f.v === 'school', 500).length;
  const parks = data.osm.filter(f => f.k === 'leisure' && (f.v === 'park' || f.v === 'garden') && f.kind === 'pg').map(f => { const g = gpoly(f); let a = 0; for (const p of g) { const r = p[0]; for (let k = 0; k < r.length; k++) { const q = r[k], w = r[(k + 1) % r.length]; a += q[0] * w[1] - w[0] * q[1]; } } return { name: f.name ?? '', ha: Math.abs(a / 2) / 1e4, d: dB(centroidOf(f)) }; }).filter(p => p.d > 5 && p.d <= 1000 && p.ha > 0.2).sort((a, b) => b.ha - a.ha);
  // relyef
  const sv: number[] = [], ev: number[] = []; for (let k = 0; k < G.n; k++) if (C.site[k] && !C.water[k] && Number.isFinite(C.E[k])) { sv.push(C.S[k]); ev.push(C.E[k]); }
  sv.sort((a, b) => a - b);
  const relief = { min: Math.min(...ev), max: Math.max(...ev), slopeMed: sv[sv.length >> 1] ?? 0, over8: sv.filter(v => v > 8).length / (sv.length || 1), over5: sv.filter(v => v > 5).length / (sv.length || 1), src: data.topo?.pts.length ? `Topo-syomka: ${data.topo.name}` : (data.dem?.src ?? '—') };
  // daraxtlar va R22
  const T = C.trees, dbh = T.map(t => t.d).sort((a, b) => a - b), q = (p: number) => dbh[Math.min(dbh.length - 1, Math.floor(p * dbh.length))] ?? 0;
  const cnt = <K extends string>(f: (t: typeof T[number]) => K) => { const m = new Map<K, number>(); for (const t of T) m.set(f(t), (m.get(f(t)) ?? 0) + 1); return [...m].sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, v / (T.length || 1) * 100] as [string, number]); };
  const lat = (t: typeof T[number]) => SPECIES[t.sp];
  const trees = { n: T.length, verified: T.filter(t => t.ok).length, species: new Set(T.map(t => t.sp)).size, dbhMed: q(0.5), dbhP90: q(0.9), big40: T.filter(t => t.d >= 40).length, big60: T.filter(t => t.d >= 60).length,
    canopy: area(G, andNot(C.crown, C.water)) / areaM2 * 100, top: cnt(t => t.sp), genus: cnt(t => lat(t)?.[0].split(' ')[0] ?? '?'), family: cnt(t => lat(t)?.[1] || '?'), unmapped: T.filter(t => !lat(t)).length / (T.length || 1) * 100 };
  const lakeM2 = countIn(C.site, C.water) * G.cellA;
  const canalM = C.canals.reduce((s, c) => s + len(c.filter(p => inside(p, B))), 0);
  // cheklovlar: 2 — qizil, 1 — sariq, 0 — yashil, 3 — suv
  const dC = distance(G, C.canal), dW = distance(G, C.water), roadM = G.u8(); for (const r of C.roads) strokeLine(G, roadM, r.g, 12);
  const dR = distance(G, roadM), cls = new Uint8Array(G.n).fill(255);
  let red = 0, yel = 0, grn = 0, wat = 0;
  for (let k = 0; k < G.n; k++) {
    if (!C.site[k]) continue;
    let c = 0;
    if (C.water[k]) c = 3;
    else if (dC[k] <= opt.canalStrip || C.bld[k]) c = 2;
    else if (C.rpa[k] || C.S[k] > 8 || dR[k] <= opt.noise || dW[k] <= opt.shore) c = 1;
    cls[k] = c; if (c === 2) red++; else if (c === 1) yel++; else if (c === 0) grn++; else wat++;
  }
  const A0 = G.cellA;
  // tashrif modeli: N₁ = min(A·q; P·s/k), N_kun = min(P·s; A·q·k)
  const q501 = Q501[site.kind], cap = areaHa * q501, dem = r1000 * opt.s[0] / opt.k;
  const N1 = Math.min(cap, dem), Nday = Math.min(r1000 * opt.s[0], cap * opt.k);
  const th = N1 / 1000, f0 = (v: number) => (v >= 100 ? Math.round(v).toLocaleString('ru-RU') : v < 1 ? v.toFixed(2).replace('.', ',') : String(Math.round(v)));
  const program = T33.map(r => ({ k: r.k, norm: `${r.v2 ? `${f0(r.v)}–${f0(r.v2)}` : f0(r.v)} ${r.u}`, need: `${r.v2 ? `${f0(r.v * th)}–${f0(r.v2 * th)}` : f0(r.v * th)} ${r.u}` }));
  return {
    A: { areaHa, perim, minHa, minOk: areaHa >= minHa, pop: { r300: Math.round(r300), r1000: Math.round(r1000) }, stops, metro, kinder, schools, parks, relief, trees,
      water: { lakeM2, canalM }, constraints: { red: red * A0, yellow: yel * A0, green: grn * A0, water: wat * A0, canalStrip: opt.canalStrip, shore: opt.shore, noise: opt.noise },
      visitors: { A: areaHa, q: q501, P: Math.round(r1000), s: opt.s, k: opt.k, capacity: Math.round(cap), demand: Math.round(dem), N1: Math.round(N1), Nday: Math.round(Nday), perHa: N1 / areaHa },
      program, toilets: Math.ceil(N1 / 500) },
    cls,
  };
}
const countIn = (a: Uint8Array, b: Uint8Array) => { let n = 0; for (let k = 0; k < a.length; k++) if (a[k] && b[k]) n++; return n; };
export { or };
