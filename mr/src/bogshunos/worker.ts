/**
 * Bogʻshunos — hisob worker'i: tahlil (context + analyze), uch variant (targets + design), albom (buildAlbom).
 * Holat worker ichida saqlanadi (Ctx toʻrlari katta — asosiy oqimga faqat natija va GeoJSON qaytadi).
 */
import type { BgData, BgSite, Variant, XY } from './types';
import { context, analyze, type Ctx, type Analysis } from './analyze';
import { design, VARS, type DesignOut } from './design';
import { targets } from './od';
import { buildAlbom, type AlbomSrc } from './albom';
import { toGeo } from './geojson';
import { plant, type Planting } from './planting';
import { TPAL, symOf } from './symbols';
import { PHEN, setUserAssort, type UserAssort } from './assort';
import { frame } from '../core/geo';
import { sectionLines, setUserLines, profile, shores, drawSection, SHORE, type ShoreT } from './kesim';
import { fauna, habRings, HAB } from './fauna';
import { nets, NET } from './nets';
import { smeta, PRICE0, type Price, type Smeta } from './cost';
import { area, fillMPoly } from './grid';
import { suggest, type Prog } from './dastur';
import { qc } from './nazorat';
import type { BgTu } from './types';
import { applyEdits, applyTreeEdits, type Edit } from './edits';
import { akso, type AksoReq } from './akso';
import { grade, type VOut, type VKind } from './vertikal';

export type VSum = Pick<VOut, 'cut' | 'fill' | 'parts'>;
export type AnOpt = { canalStrip: number; shore: number; noise: number; s: [number, number]; k: number };
export type WIn =
  | { t: 'analyze'; site: BgSite; data: BgData; opt: AnOpt }
  | { t: 'design'; prog?: Prog }
  | { t: 'albom'; chosen: 'A' | 'B' | 'C'; lines?: { name: string; a: XY; b: XY }[]; author?: string; akso?: AksoReq[]; brief?: AlbomSrc['brief']; tu?: BgTu[]; prices?: Record<string, { p: number | null; src: string }> }
  | { t: 'plant'; chosen: 'A' | 'B' | 'C' }
  | { t: 'assort'; u: UserAssort | null }
  | { t: 'akso'; chosen: 'A' | 'B' | 'C'; req: AksoReq }
  | { t: 'kesimlar'; chosen: 'A' | 'B' | 'C'; lines?: { name: string; a: XY; b: XY }[] }
  | { t: 'edits'; chosen: 'A' | 'B' | 'C'; edits: Edit[] }
  | { t: 'modul'; chosen: 'A' | 'B' | 'C'; lines?: { name: string; a: XY; b: XY }[]; tu: BgTu[]; prices: Record<string, { p: number | null; src: string }> };
export interface ModOut {
  kesim: { name: string; len: number; z0: number; z1: number; wl: number | null; trees: number }[]; shore: { t: string; n: string; len: number; c: string }[]; perim: number;
  fauna: { areas: { n: string; m2: number; c: string }[]; H: number; J: number; quiet: number; quiet100: number; maxQuiet: number; old: number; qush: number; kshap: number; fruit: number[]; flower: number[]; soft: number; guilds: { n: string; m2: number; act: string }[] };
  nets: { routes: { kind: string; n: string; c: string; len: number; tu: boolean; tree: number; bld: number }[]; light: { tier: string; lux: number; s: number; n: number }[]; lampConf: number; kw: { light: number; pump: number; kafe: number; total: number }; storm: { V: number; cap: number; ratio: number }; water: { day: number; irr: [number, number] }; cons: { n: string; why: string }[] };
  smeta: Smeta;
}
export type WOut =
  | { t: 'analyzed'; A: Analysis; geo: { trees: unknown; classes: unknown; slope: unknown }; fixed?: { name: string; t: string }[]; sug?: { prog: Prog; sportNeed: number; why: string } }
  | { t: 'designed'; V: Record<string, Variant>; geo: Record<string, unknown>; why: string[] }
  | { t: 'albom'; sheets: { id: string; title: string; svg: string; w: number; h: number }[] }
  | { t: 'planted'; P: Omit<Planting, 'decisions' | 'trees' | 'shrubs'> & { nTrees: number; nShrubs: number }; geo: unknown }
  | { t: 'modul'; M: ModOut; geo: { kesim: unknown; fauna: unknown; tarmoq: unknown } }
  | { t: 'edited'; V: Variant; geo: unknown; vert: VSum }
  | { t: 'assorted'; warn: string[] }
  | { t: 'akso'; svg: string; w: number; h: number; legend: { n: string; c: string }[]; hint: string }
  | { t: 'kesimlar'; items: { name: string; svg: string; len: number; N: number }[] }
  | { t: 'progress'; msg: string }
  | { t: 'error'; msg: string };

/** Narx kitobi: boshlangʻich + foydalanuvchi tahriri */
export function mergePrices(u: Record<string, { p: number | null; src: string }>): Price[] { return PRICE0.map(p => (u[p.k] ? { ...p, p: u[p.k].p, src: u[p.k].src || p.src, at: u[p.k].p != null && u[p.k].src ? new Date().toISOString().slice(0, 10) : p.at } : p)); }
let site: BgSite | null = null, data: BgData | null = null, C: Ctx | null = null, A: Analysis | null = null, cls: Uint8Array | null = null;
const D: Partial<Record<'A' | 'B' | 'C', DesignOut>> = {};
/** qoʻlda tahrirlar (tanlangan variant uchun) — har hisobda asl variantga qayta qoʻllanadi */
let EDITS: Edit[] = [];
const ed = (k: 'A' | 'B' | 'C'): DesignOut | undefined => { const DO = D[k] && C ? applyEdits(C, D[k]!, EDITS) : D[k]; if (DO && C && A) DO.V.qc = qc(C, A, DO); return DO; };
const plantE = (DO: DesignOut) => applyTreeEdits(C!, plant(C!, A!, DO, cls!), EDITS, DO);
/** vertikal rejalash: tepalik va pogʻona zonalari (qoʻlda chizilgan) → yangi relyef; Ctx nusxasi E2 bilan */
const vert = (): VOut | null => { if (!C) return null; const ins = EDITS.flatMap((e, i) => (e.t === 'zone' && (e.kind === 'tepalik' || e.kind === 'sohil_pogona') ? [{ kind: e.kind as VKind, ring: e.ring, h: e.h, i }] : [])); return ins.length ? grade(C, ins) : null; };
const vsum = (g: VOut | null): VSum => ({ cut: g?.cut ?? 0, fill: g?.fill ?? 0, parts: g?.parts ?? [] });
const CG = (g: VOut | null): Ctx => (g ? { ...C!, E: g.E2 } : C!);
const post = (m: WOut) => (self as unknown as Worker).postMessage(m);

export function handle(m: WIn, out: (m: WOut) => void = post): void {
  try {
    if (m.t === 'assort') { const r = setUserAssort(m.u); out({ t: 'assorted', warn: r.warn }); }
    else if (m.t === 'kesimlar') { const DO = ed(m.chosen); if (!site || !C || !A || !DO) throw new Error('Avval variantlar');
      // kesimlar: avtomatik chiziqlar (A–A, B–B) + foydalanuvchi chizgan chiziqlar; har biri alohida SVG (mm oʻlchamda)
      const CE = CG(vert()), P = plantE(DO), lines = (setUserLines(m.lines), sectionLines(C, DO)), W = 400, H = 95;
      const items = lines.map(l => profile(CE, DO, P, site!, l)).filter(p => p.pts.length > 2).map(p => { const d = drawSection(p, { x: 0, y: 0, w: W, h: H });
        const w = Math.min(W, Math.max(160, 4 + p.len * 1000 / d.N + 14));   // keng boʻsh joy kesib tashlanadi; sarlavha va masshtab kesimning oʻzida
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${(w + 4).toFixed(1)}mm" height="${H}mm" viewBox="-4 0 ${(w + 4).toFixed(1)} ${H}"><rect x="-4" width="${(w + 4).toFixed(1)}" height="${H}" fill="#fff"/>${d.g}</svg>`;
        return { name: p.name, svg, len: Math.round(p.len), N: d.N }; });
      out({ t: 'kesimlar', items }); }
    else if (m.t === 'akso') { const DO = ed(m.chosen); if (!C || !A || !cls || !DO || !data) throw new Error('Avval variantlar'); const r = akso(CG(vert()), data, DO, plantE(DO), m.req); out({ t: 'akso', ...r }); }
    else if (m.t === 'analyze') {
      site = m.site; data = m.data; for (const k of Object.keys(D)) delete D[k as 'A'];
      out({ t: 'progress', msg: 'Toʻr va niqoblar…' });
      C = context(site, data); const r = analyze(site, data, C, m.opt); A = r.A; cls = r.cls;
      const G = toGeo(site);
      const ex = C.G.u8(); for (const p of C.pitches) fillMPoly(C.G, ex, p);
      const sug = suggest(site.kind, A.areaHa, A.visitors.N1, { pitch: area(C.G, ex), play: C.playgrounds.length, tarixiy: !!site.tarixiy });
      out({ t: 'analyzed', A, geo: { trees: G.trees(C), classes: G.classes(C, cls), slope: G.slope(C) }, sug, fixed: (C.fixed ?? []).map(f => ({ name: f.name, t: f.t })) });
    } else if (m.t === 'design') {
      if (!site || !data || !C || !A) throw new Error('Avval tahlil');
      const T = targets(C, data), G = toGeo(site), V: Record<string, Variant> = {}, geo: Record<string, unknown> = {};
      for (const vd of VARS) { out({ t: 'progress', msg: `${vd.name}…` }); const R = design(C, A, T.attr, T.inner, vd, { prog: m.prog, progUser: !!m.prog, kind: site.kind, tarixiy: !!site.tarixiy }); R.V.qc = qc(C, A, R); D[vd.id] = R; V[vd.id] = R.V; geo[vd.id] = G.variant(R.V); }
      out({ t: 'designed', V, geo, why: T.why });
    } else if (m.t === 'plant') {
      const DO = ed(m.chosen); if (!site || !C || !A || !cls || !DO) throw new Error('Avval variantlar');
      const P = plantE(DO), F = frame(site.origin);
      const { decisions, trees, shrubs, ...rest } = P; void decisions;
      out({ t: 'planted', P: { ...rest, nTrees: trees.length, nShrubs: shrubs.length }, geo: { type: 'FeatureCollection', features: [...trees.map(t => ({ type: 'Feature', properties: { c: t.crown, lat: t.sp.lat, g: t.sp.g, z: t.zone, col: TPAL[symOf(t.sp)][0], ed: TPAL[symOf(t.sp)][1], fc: PHEN[t.sp.lat]?.fc ?? '' }, geometry: { type: 'Point', coordinates: F.toGeo(t.p) } })), ...shrubs.map(s => ({ type: 'Feature', properties: { c: 6, lat: s.sp.lat, g: 'buta', z: 'buta', col: TPAL.butaGuruh[0], ed: TPAL.butaGuruh[1], fc: PHEN[s.sp.lat]?.fc ?? '' }, geometry: { type: 'Point', coordinates: F.toGeo(s.p) } }))] } });
    } else if (m.t === 'edits') {
      if (!site || !C || !D[m.chosen]) throw new Error('Avval variantlar');
      EDITS = m.edits; const DO = ed(m.chosen)!;
      out({ t: 'edited', V: DO.V, geo: toGeo(site).variant(DO.V), vert: vsum(vert()) });
    } else if (m.t === 'modul') {
      setUserLines(m.lines);
      const DO = ed(m.chosen); if (!site || !data || !C || !A || !cls || !DO) throw new Error('Avval variantlar');
      data.tu = m.tu; const book = mergePrices(m.prices), F = frame(site.origin), G = C.G;
      out({ t: 'progress', msg: 'Kesimlar…' });
      const VG = vert(), CE = CG(VG), P = plantE(DO), lines = sectionLines(C, DO), prof = lines.map(l => profile(CE, DO, P, site!, l)).filter(p => p.pts.length > 2);
      const SH = C.lakes.length ? shores(C, DO) : null;
      out({ t: 'progress', msg: 'Fauna…' });
      const FA = fauna(C, DO, P);
      out({ t: 'progress', msg: 'Tarmoqlar…' });
      const NT = nets(C, A, DO, P, data, site.kind);
      const progA: Record<string, number> = {}; for (const [k, mk] of Object.entries(DO.masks)) progA[k] = area(G, mk);
      const SM = smeta({ V: DO.V, PL: P, N: NT, uya: FA.boxes.length, prog: progA, earth: VG ? VG.cut + VG.fill : 0 }, book);
      const pt = (p: [number, number], pr: Record<string, unknown>) => ({ type: 'Feature', properties: pr, geometry: { type: 'Point', coordinates: F.toGeo(p) } });
      const ln = (g: [number, number][], pr: Record<string, unknown>) => ({ type: 'Feature', properties: pr, geometry: { type: 'LineString', coordinates: g.map(q => F.toGeo(q)) } });
      const fc = (f: unknown[]) => ({ type: 'FeatureCollection', features: f });
      const M: ModOut = {
        kesim: prof.map(p => ({ name: p.name, len: Math.round(p.len), z0: Math.min(...p.pts.map(q => q.z)), z1: Math.max(...p.pts.map(q => q.z)), wl: p.wl, trees: p.trees.length })),
        shore: SH ? (Object.keys(SHORE) as ShoreT[]).filter(t => SH.tot[t] > 1).map(t => ({ t, n: SHORE[t].n, len: Math.round(SH.tot[t]), c: SHORE[t].c })) : [], perim: SH ? Math.round(SH.perim) : 0,
        fauna: { areas: (Object.keys(HAB) as (keyof typeof HAB)[]).filter(h => FA.areas[h] > 0).map(h => ({ n: HAB[h].n, m2: Math.round(FA.areas[h]), c: HAB[h].c })), H: FA.H, J: FA.J, quiet: Math.round(FA.quietM2), quiet100: Math.round(FA.quiet100M2), maxQuiet: Math.round(FA.maxQuiet), old: FA.old, qush: FA.boxes.filter(b => b.kind === 'qush').length, kshap: FA.boxes.filter(b => b.kind === 'kshap').length, fruit: FA.fruit, flower: FA.flower, soft: FA.perim ? FA.softShore / FA.perim * 100 : 0, guilds: FA.guilds.map(x => ({ n: x.g.n, m2: Math.round(x.m2), act: x.g.act })) },
        nets: { routes: NT.routes.map(r => ({ kind: r.kind, n: NET[r.kind].n, c: NET[r.kind].c, len: r.len, tu: r.srcTu, tree: r.treeHits.length, bld: r.bldHits })), light: NT.light, lampConf: NT.lamps.filter(l => l.conflict).length, kw: NT.kw, storm: NT.storm, water: NT.water, cons: NT.cons.filter(c => !c.id.startsWith('irr')).map(c => ({ n: c.n, why: c.why })) },
        smeta: SM,
      };
      const geoK = fc([...prof.map(p => ln([p.a, p.b], { c: '#151413', w: 2, n: p.name })), ...(SH?.segs ?? []).map(s => ln(s.pts, { c: SHORE[s.t].c, w: 5 }))]);
      const geoF = fc([...habRings(C!, FA).flatMap(hr => hr.rings.map(r => ({ type: 'Feature', properties: { c: HAB[hr.h].c }, geometry: { type: 'Polygon', coordinates: [[...r, r[0]].map(q => F.toGeo(q))] } }))), ...FA.boxes.map(b => pt(b.p, { c: b.kind === 'qush' ? '#ffffff' : '#3b2f4a', r: 4 }))]);
      const geoT = fc([...NT.routes.flatMap(r => r.lines.map(l => ln(l, { c: NET[r.kind].c, w: 2 }))), ...NT.lamps.map(l => pt(l.p, { c: l.conflict ? '#d62828' : '#f2c230', r: l.kind === 'ustun' ? 3.5 : 2.5 })), ...NT.cons.filter(c => !c.id.startsWith('irr')).map(c => pt(c.p, { c: '#ffffff', r: 6, n: c.n })), ...NT.routes.map(r => pt(r.src, { c: r.srcTu ? '#151413' : '#ffffff', r: 6, n: `${NET[r.kind].n}: ${r.srcTu ? 'TU' : 'taxminiy ulanish'}` }))]);
      out({ t: 'modul', M, geo: { kesim: geoK, fauna: geoF, tarmoq: geoT } });
    } else if (m.t === 'albom') { setUserLines(m.lines);
      if (!site || !data || !C || !A || !cls) throw new Error('Avval tahlil');
      if (m.tu) data.tu = m.tu;
      out({ t: 'progress', msg: 'Varaqlar…' });
      out({ t: 'albom', sheets: buildAlbom({ site, data, C, A, cls, D: { ...D, [m.chosen]: ed(m.chosen) }, edits: EDITS, CG: (() => { const g = vert(); return g ? { C: CG(g), ...vsum(g) } : undefined; })(), brief: m.brief, akso: m.akso, chosen: m.chosen, author: m.author, prices: m.prices ? mergePrices(m.prices) : undefined, date: new Date().toLocaleDateString('ru-RU') }) });
    }
  } catch (e) { out({ t: 'error', msg: String((e as Error).message ?? e) }); }
}
if (typeof WorkerGlobalScope !== 'undefined' && self instanceof (WorkerGlobalScope as unknown as typeof Object)) self.onmessage = (e: MessageEvent<WIn>) => handle(e.data);
