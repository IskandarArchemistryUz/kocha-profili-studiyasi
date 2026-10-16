/**
 * Grafika varaqlari: bosh reja, zonalash, figure-ground, landshaft, qavatlar — masshtabli SVG.
 * Koordinatalar millimetrda (varaq), shuning uchun SVG Illustrator/Inkscape da haqiqiy oʻlchamda ochiladi;
 * har qatlam — alohida nomlangan <g> (Illustrator «qatlam» sifatida oʻqiydi).
 * Sof funksiya: DOM ga bogʻliq emas — birlik testlari bilan tekshiriladi.
 */
import type { Project } from './doc';
import { frame, centroid, area, type XY } from './geo';
import { computePlan } from './plan';
import { useDef, USES } from './uses';
import { profileById, profileWidth, type PartKind } from './profiles';
import { offsetLine, projectStreetsGeo } from '../scene/streets3d';

export type SheetKind = 'bosh' | 'zona' | 'figura' | 'landshaft' | 'qavat';
export type Paper = 'A4' | 'A3' | 'A2' | 'A1';

export const SHEET_KINDS: { id: SheetKind; name: string; note: string }[] = [
  { id: 'bosh', name: 'Bosh reja', note: 'chiziqli reja: binolar, koʻchalar, daraxtlar, qavatlar soni' },
  { id: 'zona', name: 'Zonalash', note: 'kvartal va parsellar funksiya rangida' },
  { id: 'figura', name: 'Figure-ground', note: 'binolar qora, boʻsh joy oq — shahar toʻqimasi' },
  { id: 'landshaft', name: 'Landshaft', note: 'yashil hududlar, daraxtlar, suv' },
  { id: 'qavat', name: 'Qavatlar', note: 'binolar qavatlar soni boʻyicha rangda' },
];

/** Atrof (mahalliy metrda) — editor ContextBundle dan tayyorlab beradi */
export interface SheetCtx {
  buildings: { id: number; rings: XY[][]; h: number }[];
  roads: { id: number; pts: XY[]; w: number; cls: string }[];
  rails: XY[][];
  water: XY[][][];
  waterways: { pts: XY[]; w: number }[];
  green: { rings: XY[][]; kind: string }[];
  trees: XY[];
}

export interface SheetOpts {
  kind: SheetKind;
  paper: Paper;
  landscape: boolean;
  /** 0 — avtomatik (uchastka sigʻadigan eng yirik standart masshtab) */
  scale: number;
  title: string;
  show: { title: boolean; scaleBar: boolean; north: boolean; legend: boolean; frame: boolean; grid: boolean; context: boolean; trees: boolean; labels: boolean; demolished: boolean };
}

export const SHEET_DEFAULT: SheetOpts = {
  kind: 'bosh', paper: 'A3', landscape: true, scale: 0, title: '',
  show: { title: true, scaleBar: true, north: true, legend: true, frame: true, grid: false, context: true, trees: true, labels: true, demolished: true },
};

const PAPERS: Record<Paper, [number, number]> = { A4: [297, 210], A3: [420, 297], A2: [594, 420], A1: [841, 594] };
export const SCALES = [200, 500, 1000, 2000, 5000];

export interface LegendItem { type: 'fill' | 'line' | 'dash' | 'tree' | 'swatch'; fill?: string; stroke?: string; label: string }
export interface SheetResult { svg: string; scale: number; widthMm: number; heightMm: number; legend: LegendItem[] }

const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');
/** rangni oqga aralashtirish (0 — oʻzi, 1 — oq) */
const mix = (c: number, t: number) => { const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255, f = (v: number) => Math.round(v + (255 - v) * t); return hex((f(r) << 16) | (f(g) << 8) | f(b)); };
const darker = (c: number, t: number) => { const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255, f = (v: number) => Math.round(v * (1 - t)); return hex((f(r) << 16) | (f(g) << 8) | f(b)); };
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n2 = (v: number) => (Math.round(v * 100) / 100).toString();

/** Qavatlar shkalasi */
export const FLOOR_RAMP: { max: number; color: string; label: string }[] = [
  { max: 3, color: '#f3e7c6', label: '1–3 qavat' },
  { max: 5, color: '#f1c98a', label: '4–5 qavat' },
  { max: 9, color: '#e59a5b', label: '6–9 qavat' },
  { max: 16, color: '#c8603c', label: '10–16 qavat' },
  { max: 999, color: '#8e3226', label: '17 va undan yuqori' },
];
const floorColor = (f: number) => FLOOR_RAMP.find(r => f <= r.max)!.color;

const PART_COL: Record<PartKind, string> = { trotuar: '#ffffff', yashil: '#dfe9d3', velo: '#f2d9cf', parkovka: '#ecebe7', qatnov: '#e4e2dd', ajratuvchi: '#dfe9d3' };

const pip = (p: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };

/** Masshtab chizgʻichi uchun «chiroyli» uzunlik, m */
export function niceLen(maxM: number): number {
  const steps = [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000];
  return [...steps].reverse().find(s => s <= maxM) ?? 10;
}

export function sheetSvg(doc: Project, ctx: SheetCtx | null, o: SheetOpts, date = new Date()): SheetResult {
  const fr = frame(doc.origin), fh = doc.settings.floorHeight;
  const [pw, ph] = o.landscape ? PAPERS[o.paper] : [PAPERS[o.paper][1], PAPERS[o.paper][0]];
  const M = 10, TB = o.show.title ? 22 : 0; // chekka va pastki sarlavha boʻlagi, mm
  const vx = M, vy = M, vw = pw - 2 * M, vh = ph - 2 * M - TB;
  const site = doc.site?.rings.map(r => r.map(fr.toLocal)) ?? null;
  const plan = computePlan(doc);
  const nb = doc.buildings.map(b => ({ b, r: b.footprint.map(fr.toLocal) }));

  // chizma markazi va oʻlchami: uchastka (yoʻq boʻlsa — binolar va koʻchalar)
  const pts: XY[] = [...(site?.[0] ?? []), ...nb.flatMap(x => x.r), ...doc.streets.flatMap(s => s.axis.map(fr.toLocal))];
  if (!pts.length) pts.push([-100, -100], [100, 100]);
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const bx0 = Math.min(...xs), bx1 = Math.max(...xs), by0 = Math.min(...ys), by1 = Math.max(...ys);
  const cx = (bx0 + bx1) / 2, cy = (by0 + by1) / 2;
  const need = Math.max((bx1 - bx0) * 1.25 / vw, (by1 - by0) * 1.25 / vh) * 1000; // 1 mm ga necha mm (masshtab maxraji)
  const scale = o.scale > 0 ? o.scale : (SCALES.find(s => s >= need) ?? Math.ceil(need / 1000) * 1000);
  const k = 1000 / scale; // 1 m → mm
  const X = (p: XY) => n2(vx + vw / 2 + (p[0] - cx) * k), Y = (p: XY) => n2(vy + vh / 2 - (p[1] - cy) * k);
  const P = (p: XY) => `${X(p)},${Y(p)}`;
  const ringD = (r: XY[]) => r.length ? 'M' + r.map(P).join('L') + 'Z' : '';
  const polyD = (rings: XY[][]) => rings.map(ringD).join('');
  const lineD = (l: XY[]) => l.length ? 'M' + l.map(P).join('L') : '';
  // koʻrinadigan oyna (metrda) — undan tashqaridagi atrof chizilmaydi
  const hw = vw / 2 / k + 20, hh = vh / 2 / k + 20;
  const vis = (r: XY[]) => { let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const p of r) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; } return x1 > cx - hw && x0 < cx + hw && y1 > cy - hh && y0 < cy + hh; };
  const lw = (mm: number) => n2(mm); // chiziq qalinligi, mm (masshtabga bogʻliq emas)

  const K = o.kind, L: string[] = [], legend: LegendItem[] = [];
  const g = (id: string, body: string, attrs = '') => { if (body) L.push(`<g id="${id}" inkscape:groupmode="layer" inkscape:label="${id}"${attrs}>${body}</g>`); };

  // ranglar
  const C = {
    bg: '#ffffff',
    ctxB: K === 'figura' ? '#1d1d1b' : K === 'qavat' ? '#e4e2dd' : '#e7e5e0',
    ctxStroke: K === 'figura' ? 'none' : '#cfccc5',
    road: K === 'figura' ? '#ffffff' : '#ffffff', roadEdge: K === 'figura' ? 'none' : '#d6d3cc',
    green: K === 'landshaft' ? '#cfe3bc' : K === 'figura' ? '#ffffff' : '#e6eedd',
    wood: K === 'landshaft' ? '#b5d39c' : '#dde8d2',
    water: K === 'figura' ? '#ffffff' : '#d3e4ee',
    tree: K === 'landshaft' ? '#9cc27f' : 'none', treeStroke: K === 'landshaft' ? '#6f9f4c' : '#9a9a92',
  };
  const site0 = site?.[0] ?? null;
  const inSite = (p: XY) => !!site0 && pip(p, site0);

  // 1. atrof (yoʻllar va yashil hududlar uchastka ichida chizilmaydi — u yer qayta loyihalanadi)
  const outside = site ? ' mask="url(#tashqari)"' : '';
  const keep = new Set(doc.keep), adopted = new Set(doc.streets.filter(s => s.osm != null).map(s => s.osm!));
  if (ctx && o.show.context) {
    if (K !== 'figura') {
      g('Atrof_yashil', ctx.green.filter(a => a.rings[0] && vis(a.rings[0])).map(a => `<path d="${polyD(a.rings)}" fill="${/wood|forest|scrub/.test(a.kind) ? C.wood : C.green}" fill-rule="evenodd"/>`).join(''), outside);
      g('Atrof_suv', ctx.water.filter(a => a[0] && vis(a[0])).map(a => `<path d="${polyD(a)}" fill="${C.water}" fill-rule="evenodd"/>`).join('')
        + ctx.waterways.filter(w => vis(w.pts)).map(w => `<path d="${lineD(w.pts)}" fill="none" stroke="${C.water}" stroke-width="${n2(Math.max(0.4, w.w * k))}" stroke-linecap="round" stroke-linejoin="round"/>`).join(''));
    }
    const roads = ctx.roads.filter(r => !adopted.has(r.id) && vis(r.pts) && !/^(footway|path|steps|track|bridleway|corridor|cycleway)$/.test(r.cls));
    if (K !== 'figura' && roads.length) {
      const sw = (c: string) => /^(motorway|trunk|primary|secondary)/.test(c) ? 4 : /^tertiary/.test(c) ? 3 : /^service/.test(c) ? 0 : 2.2;
      g('Atrof_yollar', roads.map(r => `<path d="${lineD(r.pts)}" fill="none" stroke="${C.roadEdge}" stroke-width="${n2((r.w + 2 * sw(r.cls)) * k + 0.25)}" stroke-linecap="round" stroke-linejoin="round"/>`).join('')
        + roads.map(r => `<path d="${lineD(r.pts)}" fill="none" stroke="#f6f5f2" stroke-width="${n2((r.w + 2 * sw(r.cls)) * k)}" stroke-linecap="round" stroke-linejoin="round"/>`).join('')
        + roads.filter(r => sw(r.cls) > 0).map(r => `<path d="${lineD(r.pts)}" fill="none" stroke="#e9e7e2" stroke-width="${n2(r.w * k)}" stroke-linecap="round" stroke-linejoin="round"/>`).join(''), outside);
    }
    if (K !== 'figura' && ctx.rails.length) g('Atrof_temir_yol', ctx.rails.filter(vis).map(l => `<path d="${lineD(l)}" fill="none" stroke="#9a978f" stroke-width="${lw(0.35)}" stroke-dasharray="3 1.2"/>`).join(''), outside);
    const cb = ctx.buildings.filter(b => b.rings[0] && vis(b.rings[0]));
    const kept = cb.filter(b => !inSite(centroid(b.rings[0])) || keep.has(b.id));
    const gone = cb.filter(b => inSite(centroid(b.rings[0])) && !keep.has(b.id));
    g('Atrof_binolar', kept.map(b => {
      const fill = K === 'qavat' ? floorColor(Math.max(1, Math.round(b.h / 3.2))) : C.ctxB;
      return `<path d="${polyD(b.rings)}" fill="${fill}" fill-rule="evenodd"${C.ctxStroke !== 'none' ? ` stroke="${C.ctxStroke}" stroke-width="${lw(0.1)}"` : ''}/>`;
    }).join(''));
    if (o.show.demolished && K !== 'figura' && gone.length) {
      g('Buziladigan_binolar', gone.map(b => `<path d="${polyD(b.rings)}" fill="none" stroke="#c0392b" stroke-width="${lw(0.25)}" stroke-dasharray="1.2 0.8"/>`).join(''));
      legend.push({ type: 'dash', stroke: '#c0392b', label: `Buziladigan binolar (${gone.length})` });
    }
    if (o.show.trees && K !== 'figura') {
      const tr = ctx.trees.filter(t => !inSite(t) && Math.abs(t[0] - cx) < hw && Math.abs(t[1] - cy) < hh);
      g('Atrof_daraxtlar', tr.map(t => `<circle cx="${X(t)}" cy="${Y(t)}" r="${n2(Math.max(0.5, 2.5 * k))}" fill="${C.tree === 'none' ? 'none' : mix(0x9cc27f, 0.35)}" stroke="${C.treeStroke}" stroke-width="${lw(0.08)}"/>`).join(''));
    }
  }

  // 2. kvartallar va parsellar
  if (K === 'zona') {
    g('Zonalar', plan.blocks.map(b => `<path d="${polyD(b.rings)}" fill="${mix(useDef(b.use).color, 0.15)}" stroke="#ffffff" stroke-width="${lw(0.35)}" fill-rule="evenodd"/>`).join(''));
    for (const u of USES) if (plan.blocks.some(b => b.use === u.id)) legend.push({ type: 'fill', fill: mix(u.color, 0.15), label: u.name });
  } else if (K === 'landshaft') {
    g('Yashil_kvartallar', plan.blocks.filter(b => b.use === 'yashil' || b.use === 'sport' || b.use === 'maydon').map(b => `<path d="${polyD(b.rings)}" fill="${b.use === 'yashil' ? '#bcd9a3' : b.use === 'sport' ? '#cfe6ef' : '#efe9dc'}" fill-rule="evenodd"/>`).join(''));
    g('Kvartal_chegaralari', plan.blocks.map(b => `<path d="${polyD(b.rings)}" fill="none" stroke="#b9b5ab" stroke-width="${lw(0.12)}"/>`).join(''));
  } else if (K !== 'figura') {
    g('Kvartal_chegaralari', plan.blocks.map(b => `<path d="${polyD(b.rings)}" fill="none" stroke="#b9b5ab" stroke-width="${lw(0.13)}"/>`).join(''));
  }

  // 3. loyiha koʻchalari: har tasma — oʻqdan siljigan siniq chiziq, kengligi tasma kengligida
  const ps = doc.streets.map(s => ({ s, axis: s.axis.map(fr.toLocal), prof: profileById(s.profile) }));
  if (ps.length && K !== 'figura') {
    const out: string[] = [];
    for (const { axis, prof } of ps) { const W = profileWidth(prof); out.push(`<path d="${lineD(axis)}" fill="none" stroke="${PART_COL.trotuar}" stroke-width="${n2(W * k)}" stroke-linejoin="round"/>`); }
    for (const { axis, prof } of ps) {
      const W = profileWidth(prof); let off = -W / 2;
      for (const p of prof.parts) {
        const mid = off + p.w / 2; off += p.w; if (p.k === 'trotuar') continue;
        const col = K === 'landshaft' && (p.k === 'yashil' || p.k === 'ajratuvchi') ? '#bcd9a3' : PART_COL[p.k];
        out.push(`<path d="${lineD(offsetLine(axis, mid))}" fill="none" stroke="${col}" stroke-width="${n2(p.w * k)}" stroke-linejoin="round"/>`);
      }
    }
    g('Loyiha_kochalari', out.join(''));
    g('Qizil_chiziqlar', ps.map(({ axis, prof }) => { const W = profileWidth(prof); return [W / 2, -W / 2].map(d => `<path d="${lineD(offsetLine(axis, d))}" fill="none" stroke="#d0342c" stroke-width="${lw(0.3)}"/>`).join(''); }).join(''));
    legend.push({ type: 'line', stroke: '#d0342c', label: 'Qizil chiziqlar' });
    if (o.show.trees) {
      const tr = projectStreetsGeo(ps.map(x => ({ id: x.s.id, axis: x.axis, parts: x.prof.parts })), () => 0).trees;
      g('Kocha_daraxtlari', tr.map(t => `<circle cx="${X(t)}" cy="${Y(t)}" r="${n2(Math.max(0.6, 3 * k))}" fill="${K === 'landshaft' ? '#9cc27f' : '#ffffff'}" stroke="${K === 'landshaft' ? '#5f8f3e' : '#7d8a6a'}" stroke-width="${lw(0.12)}"/>`).join(''));
      if (tr.length) legend.push({ type: 'tree', label: 'Daraxtlar' });
    }
  }

  // 4. yangi binolar
  if (nb.length) {
    const order = [...nb].sort((a, b) => ((a.b.z0 ?? 0) + a.b.floors) - ((b.b.z0 ?? 0) + b.b.floors));
    const fill = (b: Project['buildings'][number]) => K === 'figura' ? '#1d1d1b' : K === 'zona' ? darker(useDef(b.use).color, 0.12) : K === 'qavat' ? floorColor((b.z0 ?? 0) + b.floors) : '#ffffff';
    const stroke = K === 'figura' ? 'none' : '#1d1d1b';
    g('Yangi_binolar', order.map(({ b, r }) => `<path d="${ringD(r)}" fill="${fill(b)}"${stroke !== 'none' ? ` stroke="${stroke}" stroke-width="${lw(K === 'bosh' ? 0.4 : 0.3)}" stroke-linejoin="round"` : ''}/>`).join(''));
    if (K === 'bosh') legend.push({ type: 'fill', fill: '#ffffff', stroke: '#1d1d1b', label: 'Loyihalanayotgan binolar' });
    if (K === 'figura') legend.push({ type: 'fill', fill: '#1d1d1b', label: 'Binolar (mavjud va loyiha)' });
    if (o.show.labels && K !== 'figura') {
      const fs = Math.min(3.2, Math.max(1.6, 10 * k));
      g('Qavatlar_soni', order.filter(x => area(x.r) * k * k > 30).map(({ b, r }) => { const c = centroid(r); return `<text x="${X(c)}" y="${n2(+Y(c) + fs * 0.35)}" font-size="${n2(fs)}" text-anchor="middle" fill="#1d1d1b">${(b.z0 ?? 0) + b.floors}</text>`; }).join(''), ' font-family="Helvetica, Arial, sans-serif"');
    }
  }
  if (K === 'qavat') for (const r of FLOOR_RAMP) legend.push({ type: 'fill', fill: r.color, label: r.label });
  if (ctx && o.show.context && K !== 'figura') {
    if (K === 'bosh' || K === 'landshaft') legend.push({ type: 'fill', fill: C.ctxB, stroke: C.ctxStroke, label: 'Mavjud binolar' });
    if (ctx.green.length) legend.push({ type: 'fill', fill: C.green, label: 'Yashil hududlar' });
    if (ctx.water.length || ctx.waterways.length) legend.push({ type: 'fill', fill: C.water, label: 'Suv' });
  }

  // 5. zona nomlari
  if (o.show.labels && K === 'zona') {
    g('Zona_nomlari', plan.blocks.filter(b => b.area * k * k > 250).map(b => `<text x="${X(b.centroid)}" y="${Y(b.centroid)}" font-size="2.4" text-anchor="middle" fill="#3b3a36">${esc(useDef(b.use).name)}</text><text x="${X(b.centroid)}" y="${n2(+Y(b.centroid) + 3)}" font-size="2" text-anchor="middle" fill="#6b6860">${(b.area / 10000).toFixed(2).replace('.', ',')} ga</text>`).join(''), ' font-family="Helvetica, Arial, sans-serif"');
  }

  // 6. uchastka chegarasi
  if (site) {
    g('Uchastka_chegarasi', `<path d="${polyD(site)}" fill="none" stroke="#d0342c" stroke-width="${lw(0.5)}" stroke-dasharray="4 1.2 0.8 1.2"/>`);
    legend.push({ type: 'dash', stroke: '#d0342c', label: 'Loyihalash chegarasi' });
  }

  // 7. koordinata toʻri (har 100 m; 1:2000 dan mayda boʻlsa 200 m)
  if (o.show.grid) {
    const step = scale >= 2000 ? 200 : 100, out: string[] = [];
    for (let x = Math.ceil((cx - vw / 2 / k) / step) * step; x <= cx + vw / 2 / k; x += step) out.push(`<path d="M${X([x, 0])},${vy}V${vy + vh}" stroke="#9fb5c9" stroke-width="${lw(0.1)}"/><text x="${n2(+X([x, 0]) + 0.8)}" y="${vy + 3}" font-size="1.8" fill="#6f8aa3">${x}</text>`);
    for (let y = Math.ceil((cy - vh / 2 / k) / step) * step; y <= cy + vh / 2 / k; y += step) out.push(`<path d="M${vx},${Y([0, y])}H${vx + vw}" stroke="#9fb5c9" stroke-width="${lw(0.1)}"/><text x="${vx + 0.8}" y="${n2(+Y([0, y]) - 0.8)}" font-size="1.8" fill="#6f8aa3">${y}</text>`);
    g('Koordinata_tori', out.join(''), ' font-family="Helvetica, Arial, sans-serif"');
  }

  // varaq bezaklari (kesilmaydi)
  const A: string[] = [];
  if (o.show.frame) A.push(`<g id="Ramka" inkscape:groupmode="layer" inkscape:label="Ramka"><rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="none" stroke="#1d1d1b" stroke-width="0.35"/></g>`);
  if (o.show.north) {
    const nx = vx + vw - 12, ny = vy + 14;
    A.push(`<g id="Shimol" inkscape:groupmode="layer" inkscape:label="Shimol"><circle cx="${nx}" cy="${ny}" r="7" fill="#ffffff" stroke="#1d1d1b" stroke-width="0.3"/><path d="M${nx},${ny - 6}L${nx + 2.6},${ny + 4}L${nx},${ny + 2.4}Z" fill="#1d1d1b"/><path d="M${nx},${ny - 6}L${nx - 2.6},${ny + 4}L${nx},${ny + 2.4}Z" fill="#ffffff" stroke="#1d1d1b" stroke-width="0.25"/><text x="${nx}" y="${ny - 7.8}" font-size="3" font-weight="700" text-anchor="middle" fill="#1d1d1b">N</text></g>`);
  }
  if (o.show.scaleBar) {
    const len = niceLen(Math.min(vw * 0.3, 80) / k), seg = len / 4, bx = vx + 6, by = vy + vh - 8, out: string[] = [];
    for (let i = 0; i < 4; i++) out.push(`<rect x="${n2(bx + i * seg * k)}" y="${by}" width="${n2(seg * k)}" height="1.4" fill="${i % 2 ? '#ffffff' : '#1d1d1b'}" stroke="#1d1d1b" stroke-width="0.2"/>`);
    for (let i = 0; i <= 4; i += 2) out.push(`<text x="${n2(bx + i * seg * k)}" y="${by - 1.2}" font-size="2.2" text-anchor="middle" fill="#1d1d1b">${i * seg}</text>`);
    out.push(`<text x="${n2(bx + len * k + 2)}" y="${by + 1.3}" font-size="2.2" fill="#1d1d1b">m · M 1:${scale}</text>`);
    A.push(`<g id="Masshtab" inkscape:groupmode="layer" inkscape:label="Masshtab"><rect x="${bx - 3}" y="${by - 5}" width="${n2(len * k + 26)}" height="8" fill="#ffffff" fill-opacity="0.85"/>${out.join('')}</g>`);
  }
  if (o.show.legend && legend.length) {
    const rowH = 4.6, w = 56, hgt = 7 + legend.length * rowH, lx = vx + vw - w - 4, ly = vy + vh - hgt - 4, out: string[] = [];
    out.push(`<rect x="${lx}" y="${ly}" width="${w}" height="${n2(hgt)}" fill="#ffffff" stroke="#1d1d1b" stroke-width="0.2"/><text x="${lx + 3}" y="${ly + 4.6}" font-size="2.6" font-weight="700" fill="#1d1d1b">Shartli belgilar</text>`);
    legend.forEach((it, i) => {
      const y = ly + 7.5 + i * rowH, sx = lx + 3;
      if (it.type === 'fill' || it.type === 'swatch') out.push(`<rect x="${sx}" y="${n2(y - 0.2)}" width="6" height="3" fill="${it.fill}" stroke="${it.stroke ?? '#9a978f'}" stroke-width="0.15"/>`);
      if (it.type === 'line') out.push(`<path d="M${sx},${n2(y + 1.3)}h6" stroke="${it.stroke}" stroke-width="0.4"/>`);
      if (it.type === 'dash') out.push(`<rect x="${sx}" y="${n2(y - 0.2)}" width="6" height="3" fill="none" stroke="${it.stroke}" stroke-width="0.3" stroke-dasharray="1.2 0.6"/>`);
      if (it.type === 'tree') out.push(`<circle cx="${sx + 3}" cy="${n2(y + 1.3)}" r="1.4" fill="#ffffff" stroke="#7d8a6a" stroke-width="0.15"/>`);
      out.push(`<text x="${sx + 8}" y="${n2(y + 2.3)}" font-size="2.3" fill="#1d1d1b">${esc(it.label)}</text>`);
    });
    A.push(`<g id="Shartli_belgilar" inkscape:groupmode="layer" inkscape:label="Shartli belgilar">${out.join('')}</g>`);
  }
  if (o.show.title) {
    const ty = ph - M - TB + 4, kindName = SHEET_KINDS.find(s => s.id === K)!.name;
    const d = date.toLocaleDateString('ru-RU');
    A.push(`<g id="Sarlavha" inkscape:groupmode="layer" inkscape:label="Sarlavha"><path d="M${vx},${ty - 1}H${vx + vw}" stroke="#1d1d1b" stroke-width="0.35"/>`
      + `<text x="${vx}" y="${ty + 6}" font-size="5.2" font-weight="700" fill="#1d1d1b">${esc(o.title || doc.name)}</text>`
      + `<text x="${vx}" y="${ty + 12}" font-size="3" fill="#55524b">${esc(kindName)} · M 1:${scale} · ${d}</text>`
      + `<text x="${vx + vw}" y="${ty + 6}" font-size="2.6" text-anchor="end" fill="#55524b">Archemistry Lab · Master reja</text>`
      + `<text x="${vx + vw}" y="${ty + 11}" font-size="2.2" text-anchor="end" fill="#8a857c">Asos: OpenStreetMap · meʼyorlar: ShNQ 2.07.01-23 · qavat ${fh} m</text></g>`);
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${pw}mm" height="${ph}mm" viewBox="0 0 ${pw} ${ph}" font-family="Helvetica, Arial, sans-serif">
<title>${esc((o.title || doc.name) + ' — ' + SHEET_KINDS.find(s => s.id === K)!.name)}</title>
<defs><clipPath id="vp"><rect x="${vx}" y="${vy}" width="${vw}" height="${vh}"/></clipPath>${site ? `<mask id="tashqari" maskUnits="userSpaceOnUse" x="0" y="0" width="${pw}" height="${ph}"><rect width="${pw}" height="${ph}" fill="#fff"/><path d="${polyD(site)}" fill="#000" fill-rule="evenodd"/></mask>` : ''}</defs>
<rect width="${pw}" height="${ph}" fill="${C.bg}"/>
<g clip-path="url(#vp)">${L.join('\n')}</g>
${A.join('\n')}
</svg>`;
  return { svg, scale, widthMm: pw, heightMm: ph, legend };
}
