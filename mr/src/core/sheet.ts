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
import { landscape } from './landscape';
import { freeRect, pickLevel, labelLines, modeMax, type LabelMode } from './labels';

export type SheetKind = 'bosh' | 'zona' | 'figura' | 'landshaft' | 'qavat' | 'vaziyat';
export type Paper = 'fit' | 'A4' | 'A3' | 'A2' | 'A1' | 'A0';

/** Varaq namunalari (MR-Varaqlar «Namuna»): atamalar lugʻati boʻyicha */
export const SHEET_KINDS: { id: SheetKind; name: string; note: string }[] = [
  { id: 'bosh', name: 'Bosh reja', note: 'chiziqli reja: binolar, koʻchalar, daraxtlar, qavatlar soni' },
  { id: 'zona', name: 'Zonalashtirish', note: 'daha va yer uchastkalari funksiya rangida' },
  { id: 'figura', name: 'Figura-fon', note: 'binolar qora, boʻsh joy oq — shahar toʻqimasi' },
  { id: 'landshaft', name: 'Landshaft', note: 'yashil hududlar, daraxtlar, suv' },
  { id: 'qavat', name: 'Qavatlar soni', note: 'binolar qavatlar soni boʻyicha rangda' },
  { id: 'vaziyat', name: 'Vaziyat sxemasi', note: 'hudud shaharda: atrof, yoʻllar, uchastka' },
];

/** Atrof (mahalliy metrda) — editor ContextBundle dan tayyorlab beradi */
export interface SheetCtx {
  buildings: { id: number; rings: XY[][]; h: number }[];
  roads: { id: number; pts: XY[]; w: number; cls: string; name?: string }[];
  rails: XY[][];
  water: XY[][][];
  waterways: { pts: XY[]; w: number }[];
  green: { rings: XY[][]; kind: string }[];
  trees: XY[];
  /** jamoat transporti bekatlari va metro kirishlari (10-qadam OSM obyektlari) */
  stops?: { p: XY; kind: 'bekat' | 'metro' }[];
}

/** Qatlamlar (MR-Varaqlar «Qatlamlar», 10 ta): har biriga yoqish, toʻldirish, ochroq, kontur, chiziq mm */
export type SheetLayerId = 'plots' | 'bld' | 'ctx' | 'streets' | 'green' | 'water' | 'yards' | 'site' | 'demo' | 'stops';
export interface SheetLayer { on: boolean; fill: 'use' | 'one' | 'none'; light: boolean; outline: boolean; mm: number }
export const SHEET_LAYERS: { id: SheetLayerId; name: string; note: string; def: SheetLayer }[] = [
  { id: 'plots', name: 'Yer uchastkalari', note: 'funksiya rangida', def: { on: true, fill: 'use', light: false, outline: true, mm: 0.13 } },
  { id: 'bld', name: 'Loyiha binolari', note: 'oq, kontur 0,5 mm', def: { on: true, fill: 'one', light: false, outline: true, mm: 0.4 } },
  { id: 'ctx', name: 'Atrof binolari (OSM)', note: 'kulrang', def: { on: true, fill: 'one', light: false, outline: true, mm: 0.1 } },
  { id: 'streets', name: 'Koʻchalar', note: 'qizil chiziq, qatnov, trotuar', def: { on: true, fill: 'use', light: false, outline: true, mm: 0.3 } },
  { id: 'green', name: 'Yashil hududlar va daraxtlar', note: '', def: { on: true, fill: 'use', light: false, outline: false, mm: 0.12 } },
  { id: 'water', name: 'Suv', note: '', def: { on: true, fill: 'use', light: false, outline: false, mm: 0.1 } },
  { id: 'yards', name: 'Hovlilar', note: '', def: { on: true, fill: 'use', light: false, outline: true, mm: 0.1 } },
  { id: 'site', name: 'Uchastka chegarasi', note: 'qizil, 0,6 mm, uzuq', def: { on: true, fill: 'none', light: false, outline: true, mm: 0.6 } },
  { id: 'demo', name: 'Buziladigan binolar', note: 'qizil uzuq chiziq', def: { on: true, fill: 'none', light: false, outline: true, mm: 0.25 } },
  { id: 'stops', name: 'Bekatlar', note: 'avtobus, metro', def: { on: true, fill: 'one', light: false, outline: true, mm: 0.2 } },
];

export interface SheetOpts {
  kind: SheetKind;
  paper: Paper;
  landscape: boolean;
  /** 0 — avtomatik (standart qatordan hudud sigʻadigan eng yirik masshtab) */
  scale: number;
  title: string;
  show: { title: boolean; scaleBar: boolean; north: boolean; legend: boolean; frame: boolean; grid: boolean; context: boolean; trees: boolean; labels: boolean; demolished: boolean; stamp?: boolean; plotTable?: boolean; situation?: boolean };
  /** yer uchastkasi yozuvlari (4.1): avtomatik yoki eng yuqori daraja */
  labelMode?: LabelMode;
  /** koordinata toʻri qadami, m (0 — avtomatik) */
  gridStep?: number;
  font?: string;
  layers?: Partial<Record<SheetLayerId, Partial<SheetLayer>>>;
  /** varaq ramkasi (V3): markaz (mahalliy m) va burilish, ° (soat strelkasiga qarshi) */
  center?: XY; rot?: number;
  /** shtamp */
  stamp?: { sheet?: string; author?: string; num?: string; index?: number; total?: number };
  /** rejim (MR-Varaqlar): reja · qavat rejalari · aksonometriya; oxirgi ikkisida chizma maydoniga tayyor mazmun qoʻyiladi */
  mode?: 'reja' | 'qavat' | 'akso';
  /** qavat rejalari: namuna va qavat; aksonometriya: namuna va saqlangan koʻrinish */
  plan?: { look?: 'rang' | 'bir'; floor?: number };
  axo?: { look?: 'oq' | 'funksiya' | 'fasad' | 'figura' | 'qoralama'; view?: string; shadow?: boolean };
}
/** Tayyor mazmun (qavat rejalari yoki aksonometriya): chizma maydoniga (mm) joylanadi; masshtab yozuvi — label */
export interface SheetInner { body: (vx: number, vy: number, vw: number, vh: number) => string; label: string; legend?: LegendItem[] }

export const SHEET_DEFAULT: SheetOpts = {
  kind: 'bosh', paper: 'A3', landscape: true, scale: 0, title: '',
  show: { title: true, scaleBar: true, north: true, legend: true, frame: true, grid: false, context: true, trees: true, labels: true, demolished: true, stamp: true, plotTable: true, situation: false },
  labelMode: 'auto', gridStep: 0, font: 'Archivo',
};

export const PAPERS: Record<Exclude<Paper, 'fit'>, [number, number]> = { A4: [297, 210], A3: [420, 297], A2: [594, 420], A1: [841, 594], A0: [1189, 841] };
/** Standart masshtablar qatori (MR-Varaqlar): 1:200 — «ixtiyoriy» ichida */
export const SCALES = [500, 1000, 2000, 5000, 10000];
export const FONTS = ['Archivo', 'IBM Plex Sans', 'Helvetica', 'PT Serif'];

/**
 * Masshtab tavsiyasi (inventar 4.2): VM 497-son qarori va ShNQ 2.07.01-23 masshtabni koʻrsatmaydi — «andoza».
 * Vaziyat sxemasi 1:10 000; master reja ≤ 15 ga — 1:1000, ≤ 60 ga — 1:2000, kattasi — 1:5000.
 */
export function recommendScale(ha: number, kind: SheetKind): { scale: number; src: string } {
  if (kind === 'vaziyat') return { scale: 10000, src: 'andoza' };
  return { scale: ha <= 15 ? 1000 : ha <= 60 ? 2000 : 5000, src: 'andoza' };
}
/** Varaq turi boʻyicha masshtab oraligʻi (cheklovdan tashqarisi — eslatma, taqiq emas) */
export const scaleRange = (k: SheetKind): [number, number] => k === 'vaziyat' ? [10000, 25000] : [500, 5000];

export interface LegendItem { type: 'fill' | 'line' | 'dash' | 'tree' | 'swatch' | 'stop'; fill?: string; stroke?: string; label: string }
export interface PlotRow { code: string; use: string; color: string; ha: number; level: number }
export interface SheetResult { svg: string; scale: number; widthMm: number; heightMm: number; legend: LegendItem[]; plots: PlotRow[]; labels: { full: number; total: number }; minText: number; fits: boolean; auto: boolean }

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

const PART_COL: Record<PartKind, string> = { trotuar: '#ffffff', yashil: '#dfe9d3', velo: '#f2d9cf', parkovka: '#ecebe7', qatnov: '#e4e2dd', ajratuvchi: '#dfe9d3', avtobus: '#f0d9d3', tramvay: '#e2dfd8' };

const pip = (p: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };

/** Masshtab chizgʻichi uchun «chiroyli» uzunlik, m */
export function niceLen(maxM: number): number {
  const steps = [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000];
  return [...steps].reverse().find(s => s <= maxM) ?? 10;
}

/** Varaq tuzilishi (mm): chizma maydoni va oʻng ustun — V3 ramkasi uchun (sheetSvg dagi bilan bir xil) */
export function sheetLayout(o: SheetOpts): { pw: number; ph: number; vw: number; vh: number; col: number; gap: number } {
  const S = { ...SHEET_DEFAULT.show, ...o.show }, paper = o.paper === 'fit' ? 'A3' : o.paper;
  const [pw, ph] = o.landscape ? PAPERS[paper] : [PAPERS[paper][1], PAPERS[paper][0]];
  const hasCol = S.legend || !!S.plotTable || !!S.stamp || !!S.situation, M = 10, gap = 6;
  const col = hasCol ? Math.max(70, Math.min(220, pw * 0.26)) : 0, TB = !hasCol && S.title ? 22 : 0;
  return { pw, ph, vw: pw - 2 * M - (col ? col + gap : 0), vh: ph - 2 * M - TB, col, gap };
}

/** Joriy sozlamalar bilan qatlam (sukut + foydalanuvchi) */
export const layerOf = (o: SheetOpts, id: SheetLayerId): SheetLayer => ({ ...SHEET_LAYERS.find(l => l.id === id)!.def, ...(o.layers?.[id] ?? {}) });

const SHORT: Record<string, string> = { turar: 'Turar joy', yakka: 'Yakka uylar', aralash: 'Aralash', maktab: 'Maktab', mtm: 'MTM', poliklinika: 'Poliklinika', ijtimoiy: 'Ijtimoiy', savdo: 'Savdo', ofis: 'Ofis', mehmonxona: 'Mehmonxona', sport: 'Sport', yashil: 'Park', maydon: 'Skver', avtoturargoh: 'Avtoturargoh', texnik: 'Muhandislik' };

export function sheetSvg(doc: Project, ctx: SheetCtx | null, o: SheetOpts, date = new Date(), ai = false, tr: (s: string) => string = s => s, inner?: SheetInner): SheetResult {
  const fr = frame(doc.origin), fh = doc.settings.floorHeight, S = { ...SHEET_DEFAULT.show, ...o.show };
  const font = o.font ?? 'Archivo', fam = `${font}, Helvetica, Arial, sans-serif`;
  const site = doc.site?.rings.map(r => r.map(fr.toLocal)) ?? null;
  const plan = computePlan(doc);
  const nb = doc.buildings.map(b => ({ b, r: b.footprint.map(fr.toLocal) }));
  const K = o.kind;
  const Ly = (id: SheetLayerId) => layerOf(o, id);

  // chizma oʻlchami: uchastka (yoʻq boʻlsa — binolar va koʻchalar); vaziyat sxemasida — atrof ham
  const pts: XY[] = [...(site?.[0] ?? []), ...nb.flatMap(x => x.r), ...doc.streets.flatMap(s => s.axis.map(fr.toLocal))];
  if (!pts.length) pts.push([-100, -100], [100, 100]);
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  let bx0 = Math.min(...xs), bx1 = Math.max(...xs), by0 = Math.min(...ys), by1 = Math.max(...ys);
  if (K === 'vaziyat') { const c0 = [(bx0 + bx1) / 2, (by0 + by1) / 2], r = Math.max(600, (bx1 - bx0), (by1 - by0)) * 1.2; bx0 = c0[0] - r; bx1 = c0[0] + r; by0 = c0[1] - r; by1 = c0[1] + r; }
  const cx = o.center?.[0] ?? (bx0 + bx1) / 2, cy = o.center?.[1] ?? (by0 + by1) / 2;
  const rot = (o.rot ?? 0) * Math.PI / 180, cr = Math.cos(rot), sr = Math.sin(rot);
  // varaq oʻlchami: oʻng ustun (sarlavha, shartli belgilar, jadval, shtamp) — 26 %, 70…220 mm
  const hasCol = S.legend || !!S.plotTable || !!S.stamp || !!S.situation;
  const M = 10, gap = 6;
  const layout = (pw: number, ph: number) => { const col = hasCol ? Math.max(70, Math.min(220, pw * 0.26)) : 0, TB = !hasCol && S.title ? 22 : 0; return { col, TB, vw: pw - 2 * M - (col ? col + gap : 0), vh: ph - 2 * M - TB }; };
  // rotatsiyadagi kenglik/balandlik (m)
  const ext = (() => { let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity; for (const p of [[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1]] as XY[]) { const u = (p[0] - cx) * cr + (p[1] - cy) * sr, v = -(p[0] - cx) * sr + (p[1] - cy) * cr; a = Math.min(a, u); b = Math.max(b, u); c = Math.min(c, v); d = Math.max(d, v); } return [Math.max(b, -a) * 2, Math.max(d, -c) * 2]; })();
  let pw: number, ph: number, scale: number, auto = false;
  if (o.paper === 'fit') {
    scale = o.scale > 0 ? o.scale : recommendScale(site ? Math.abs(area(site[0])) / 1e4 : 1, K).scale; auto = !(o.scale > 0);
    const kk = 1000 / scale, w = ext[0] * 1.15 * kk, h = ext[1] * 1.15 * kk, col = hasCol ? 120 : 0;
    pw = Math.ceil(w + 2 * M + (col ? col + gap : 0)); ph = Math.ceil(Math.max(h + 2 * M + (!hasCol && S.title ? 22 : 0), col ? 200 : 0));
  } else {
    [pw, ph] = o.landscape ? PAPERS[o.paper] : [PAPERS[o.paper][1], PAPERS[o.paper][0]];
    const L0 = layout(pw, ph), need = Math.max(ext[0] * 1.15 / L0.vw, ext[1] * 1.15 / L0.vh) * 1000;
    auto = !(o.scale > 0);
    scale = o.scale > 0 ? o.scale : (SCALES.find(v => v >= need) ?? Math.ceil(need / 10000) * 10000);
  }
  const { col, TB, vw, vh } = o.paper === 'fit' ? (() => { const c2 = hasCol ? 120 : 0; return { col: c2, TB: !hasCol && S.title ? 22 : 0, vw: pw - 2 * M - (c2 ? c2 + gap : 0), vh: ph - 2 * M - (!hasCol && S.title ? 22 : 0) }; })() : layout(pw, ph);
  const vx = M, vy = M;
  const k = 1000 / scale; // 1 m → mm
  const fits = ext[0] * k <= vw + 0.5 && ext[1] * k <= vh + 0.5;
  const toV = (p: XY): [number, number] => { const dx = p[0] - cx, dy = p[1] - cy; return [vx + vw / 2 + (dx * cr + dy * sr) * k, vy + vh / 2 - (-dx * sr + dy * cr) * k]; };
  const X = (p: XY) => n2(toV(p)[0]), Y = (p: XY) => n2(toV(p)[1]);
  const P = (p: XY) => { const v = toV(p); return `${n2(v[0])},${n2(v[1])}`; };
  const ringD = (r: XY[]) => r.length ? 'M' + r.map(P).join('L') + 'Z' : '';
  const polyD = (rings: XY[][]) => rings.map(ringD).join('');
  const lineD = (l: XY[]) => l.length ? 'M' + l.map(P).join('L') : '';
  // koʻrinadigan oyna (metrda, burilishni hisobga olib) — undan tashqaridagi atrof chizilmaydi
  const R = Math.hypot(vw, vh) / 2 / k + 20;
  const vis = (r: XY[]) => { let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const p of r) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; } return x1 > cx - R && x0 < cx + R && y1 > cy - R && y0 < cy + R; };
  const lw = (mm: number) => n2(mm);
  let minText = 99; const T = (mm: number) => { minText = Math.min(minText, mm); return n2(mm); };

  const L: string[] = [], legend: LegendItem[] = [];
  const g = (id: string, body: string, attrs = '') => { if (body) L.push(ai ? `<g id="${id}" i:layer="yes" inkscape:groupmode="layer" inkscape:label="${id}"><g clip-path="url(#vp)"${attrs}>${body}</g></g>` : `<g id="${id}" inkscape:groupmode="layer" inkscape:label="${id}"${attrs}>${body}</g>`); };
  const VZ = K === 'vaziyat';
  const C = {
    bg: '#ffffff',
    ctxB: K === 'figura' ? '#1d1d1b' : K === 'qavat' ? '#e4e2dd' : VZ ? '#d9d6cf' : '#e7e5e0',
    ctxStroke: K === 'figura' || VZ ? 'none' : '#cfccc5',
    roadEdge: K === 'figura' ? 'none' : '#d6d3cc',
    green: K === 'landshaft' ? '#cfe3bc' : K === 'figura' ? '#ffffff' : '#e6eedd',
    wood: K === 'landshaft' ? '#b5d39c' : '#dde8d2',
    water: K === 'figura' ? '#ffffff' : '#d3e4ee',
    tree: K === 'landshaft' ? '#9cc27f' : 'none', treeStroke: K === 'landshaft' ? '#6f9f4c' : '#9a9a92',
  };
  const lite = (c: string, on: boolean) => on ? mix(parseInt(c.slice(1), 16), 0.45) : c;
  const site0 = site?.[0] ?? null;
  const inSite = (p: XY) => !!site0 && pip(p, site0);

  // 1. atrof (yoʻllar va yashil hududlar uchastka ichida chizilmaydi — u yer qayta loyihalanadi)
  const outside = site ? ' mask="url(#tashqari)"' : '';
  const keep = new Set(doc.keep), adopted = new Set([...doc.streets.filter(s => s.osm != null).map(s => s.osm!), ...(doc.removedRoads ?? [])]);
  const lG = Ly('green'), lW = Ly('water'), lC = Ly('ctx'), lD = Ly('demo');
  if (ctx && S.context) {
    if (K !== 'figura') {
      if (lG.on && lG.fill !== 'none') g('Atrof_yashil', ctx.green.filter(a => a.rings[0] && vis(a.rings[0])).map(a => `<path d="${polyD(a.rings)}" fill="${lite(/wood|forest|scrub/.test(a.kind) ? C.wood : C.green, lG.light)}" fill-rule="evenodd"/>`).join(''), outside);
      if (lW.on) g('Atrof_suv', ctx.water.filter(a => a[0] && vis(a[0])).map(a => `<path d="${polyD(a)}" fill="${lite(C.water, lW.light)}" fill-rule="evenodd"/>`).join('')
        + ctx.waterways.filter(w => vis(w.pts)).map(w => `<path d="${lineD(w.pts)}" fill="none" stroke="${C.water}" stroke-width="${n2(Math.max(0.4, w.w * k))}" stroke-linecap="round" stroke-linejoin="round"/>`).join(''));
    }
    const roads = ctx.roads.filter(r => !adopted.has(r.id) && vis(r.pts) && !/^(footway|path|steps|track|bridleway|corridor|cycleway)$/.test(r.cls));
    if (K !== 'figura' && roads.length && Ly('streets').on) {
      const sw = (c: string) => /^(motorway|trunk|primary|secondary)/.test(c) ? 4 : /^tertiary/.test(c) ? 3 : /^service/.test(c) ? 0 : 2.2;
      const minW = VZ ? 0.35 : 0;
      g('Atrof_yollar', roads.map(r => `<path d="${lineD(r.pts)}" fill="none" stroke="${C.roadEdge}" stroke-width="${n2(Math.max(minW + 0.2, (r.w + 2 * sw(r.cls)) * k + 0.25))}" stroke-linecap="round" stroke-linejoin="round"/>`).join('')
        + roads.map(r => `<path d="${lineD(r.pts)}" fill="none" stroke="#f6f5f2" stroke-width="${n2(Math.max(minW, (r.w + 2 * sw(r.cls)) * k))}" stroke-linecap="round" stroke-linejoin="round"/>`).join('')
        + roads.filter(r => sw(r.cls) > 0).map(r => `<path d="${lineD(r.pts)}" fill="none" stroke="#e9e7e2" stroke-width="${n2(r.w * k)}" stroke-linecap="round" stroke-linejoin="round"/>`).join(''), VZ ? '' : outside);
    }
    if (K !== 'figura' && ctx.rails.length) g('Atrof_temir_yol', ctx.rails.filter(vis).map(l => `<path d="${lineD(l)}" fill="none" stroke="#9a978f" stroke-width="${lw(0.35)}" stroke-dasharray="3 1.2"/>`).join(''), outside);
    const rmv = new Set(doc.removed ?? []), cb = ctx.buildings.filter(b => b.rings[0] && vis(b.rings[0]) && !rmv.has(b.id));
    const kept = cb.filter(b => !inSite(centroid(b.rings[0])) || keep.has(b.id));
    const gone = cb.filter(b => inSite(centroid(b.rings[0])) && !keep.has(b.id));
    if (lC.on) g('Atrof_binolar', kept.map(b => {
      const fill = lC.fill === 'none' ? 'none' : K === 'qavat' ? floorColor(Math.max(1, Math.round(b.h / 3.2))) : lite(C.ctxB, lC.light);
      return `<path d="${polyD(b.rings)}" fill="${fill}" fill-rule="evenodd"${C.ctxStroke !== 'none' && lC.outline ? ` stroke="${C.ctxStroke}" stroke-width="${lw(lC.mm)}"` : ''}/>`;
    }).join(''));
    if (S.demolished && lD.on && K !== 'figura' && !VZ && gone.length) {
      g('Buziladigan_binolar', gone.map(b => `<path d="${polyD(b.rings)}" fill="none" stroke="#c0392b" stroke-width="${lw(lD.mm)}" stroke-dasharray="1.2 0.8"/>`).join(''));
      legend.push({ type: 'dash', stroke: '#c0392b', label: `${tr('Buziladigan binolar')} (${gone.length})` });
    }
    if (S.trees && lG.on && K !== 'figura' && !VZ) {
      const tr2 = ctx.trees.filter(t => !inSite(t) && Math.abs(t[0] - cx) < R && Math.abs(t[1] - cy) < R);
      g('Atrof_daraxtlar', tr2.map(t => `<circle cx="${X(t)}" cy="${Y(t)}" r="${n2(Math.max(0.5, 2.5 * k))}" fill="${C.tree === 'none' ? 'none' : mix(0x9cc27f, 0.35)}" stroke="${C.treeStroke}" stroke-width="${lw(0.08)}"/>`).join(''));
    }
  }

  // 2. daha va yer uchastkalari
  const lP = Ly('plots');
  const plotFill = (u: string) => lP.fill === 'none' ? 'none' : lP.fill === 'one' ? (lP.light ? '#f4f3f0' : '#ecebe7') : mix(useDef(u as never).color, lP.light ? 0.45 : 0.15);
  if (lP.on && !VZ) {
    if (K === 'zona') {
      g('Zonalar', plan.blocks.map(b => `<path d="${polyD(b.rings)}" fill="${plotFill(b.use)}"${lP.outline ? ` stroke="#ffffff" stroke-width="${lw(Math.max(lP.mm, 0.35))}"` : ''} fill-rule="evenodd"/>`).join(''));
      for (const u of USES) if (plan.blocks.some(b => b.use === u.id)) legend.push({ type: 'fill', fill: plotFill(u.id), label: tr(u.name) });
    } else if (K === 'landshaft') {
      g('Yashil_kvartallar', plan.blocks.filter(b => b.use === 'yashil' || b.use === 'sport' || b.use === 'maydon').map(b => `<path d="${polyD(b.rings)}" fill="${b.use === 'yashil' ? '#bcd9a3' : b.use === 'sport' ? '#cfe6ef' : '#efe9dc'}" fill-rule="evenodd"/>`).join(''));
      if (lP.outline) g('Kvartal_chegaralari', plan.blocks.map(b => `<path d="${polyD(b.rings)}" fill="none" stroke="#b9b5ab" stroke-width="${lw(lP.mm)}"/>`).join(''));
    } else if (K !== 'figura' && lP.outline) {
      g('Kvartal_chegaralari', plan.blocks.map(b => `<path d="${polyD(b.rings)}" fill="none" stroke="#b9b5ab" stroke-width="${lw(lP.mm)}"/>`).join(''));
    }
  }

  // 2b. hovlilar (obodonlashtirish)
  const lY = Ly('yards');
  if (doc.settings.yards && lY.on && (K === 'bosh' || K === 'landshaft')) {
    const yards = landscape(doc), L2 = K === 'landshaft';
    const out: string[] = [];
    for (const y of yards) {
      if (lY.fill !== 'none') y.green.forEach(p => out.push(`<path d="${polyD(p)}" fill="${lite(L2 ? '#cfe3bc' : '#eef3e8', lY.light)}" fill-rule="evenodd"/>`));
      y.paths.forEach(p => out.push(`<path d="${polyD(p)}" fill="#ffffff"${lY.outline ? ` stroke="#c9c4b9" stroke-width="${lw(lY.mm)}"` : ''} fill-rule="evenodd"/>`));
      y.play.forEach(q => out.push(`<path d="${ringD(q.ring)}" fill="${L2 ? ({ bolalar: '#f6dcae', kattalar: '#efe6d3', sport: '#bcd9c2', xojalik: '#e2ded6' } as Record<string, string>)[q.kind] : '#ffffff'}" stroke="#8f8676" stroke-width="${lw(Math.max(lY.mm, 0.15))}"/>`));
    }
    g('Hovlilar', out.join(''));
    if (S.trees && lG.on) g('Hovli_daraxtlari', yards.flatMap(y => y.trees).map(t => `<circle cx="${X(t)}" cy="${Y(t)}" r="${n2(Math.max(0.6, 2.8 * k))}" fill="${L2 ? '#9cc27f' : '#ffffff'}" stroke="${L2 ? '#5f8f3e' : '#7d8a6a'}" stroke-width="${lw(0.12)}"/>`).join(''));
    if (yards.some(y => y.play.length)) legend.push({ type: 'fill', fill: L2 ? '#f6dcae' : '#ffffff', stroke: '#8f8676', label: tr('Hovli maydonchalari (4-jadval)') });
  }

  // 3. loyiha koʻchalari: har tasma — oʻqdan siljigan siniq chiziq, kengligi tasma kengligida
  const lS = Ly('streets');
  const ps = doc.streets.map(s => ({ s, axis: s.axis.map(fr.toLocal), prof: profileById(s.profile) }));
  if (ps.length && K !== 'figura' && lS.on) {
    const out: string[] = [];
    if (!VZ) {
      for (const { axis, prof } of ps) { const W = profileWidth(prof); out.push(`<path d="${lineD(axis)}" fill="none" stroke="${PART_COL.trotuar}" stroke-width="${n2(W * k)}" stroke-linejoin="round"/>`); }
      if (lS.fill !== 'none') for (const { axis, prof } of ps) {
        const W = profileWidth(prof); let off = -W / 2;
        for (const p of prof.parts) {
          const mid = off + p.w / 2; off += p.w; if (p.k === 'trotuar') continue;
          const col2 = K === 'landshaft' && (p.k === 'yashil' || p.k === 'ajratuvchi') ? '#bcd9a3' : lS.fill === 'one' ? '#ecebe7' : PART_COL[p.k];
          out.push(`<path d="${lineD(offsetLine(axis, mid))}" fill="none" stroke="${lite(col2, lS.light)}" stroke-width="${n2(p.w * k)}" stroke-linejoin="round"/>`);
        }
      }
    } else out.push(...ps.map(({ axis, prof }) => `<path d="${lineD(axis)}" fill="none" stroke="#f6f5f2" stroke-width="${n2(Math.max(0.5, profileWidth(prof) * k))}"/>`));
    g('Loyiha_kochalari', out.join(''));
    if (lS.outline && !VZ) {
      g('Qizil_chiziqlar', ps.map(({ axis, prof }) => { const W = profileWidth(prof); return [W / 2, -W / 2].map(d => `<path d="${lineD(offsetLine(axis, d))}" fill="none" stroke="#d0342c" stroke-width="${lw(lS.mm)}"/>`).join(''); }).join(''));
      legend.push({ type: 'line', stroke: '#d0342c', label: tr('Qizil chiziqlar') });
    }
    if (S.trees && lG.on && !VZ) {
      const tr2 = projectStreetsGeo(ps.map(x => ({ id: x.s.id, axis: x.axis, parts: x.prof.parts })), () => 0).trees;
      g('Kocha_daraxtlari', tr2.map(t => `<circle cx="${X(t)}" cy="${Y(t)}" r="${n2(Math.max(0.6, 3 * k))}" fill="${K === 'landshaft' ? '#9cc27f' : '#ffffff'}" stroke="${K === 'landshaft' ? '#5f8f3e' : '#7d8a6a'}" stroke-width="${lw(0.12)}"/>`).join(''));
      if (tr2.length) legend.push({ type: 'tree', label: tr('Daraxtlar') });
    }
  }

  // 4. yangi binolar
  const lB = Ly('bld');
  if (nb.length && lB.on) {
    const order = [...nb].sort((a, b) => ((a.b.z0 ?? 0) + a.b.floors) - ((b.b.z0 ?? 0) + b.b.floors));
    const fill = (b: Project['buildings'][number]) => K === 'figura' || VZ ? '#1d1d1b' : K === 'zona' ? darker(useDef(b.use).color, 0.12) : K === 'qavat' ? floorColor((b.z0 ?? 0) + b.floors) : lB.fill === 'none' ? 'none' : lB.fill === 'use' ? lite(mix(useDef(b.use).color, 0.1), lB.light) : '#ffffff';
    const stroke = K === 'figura' || VZ || !lB.outline ? 'none' : '#1d1d1b';
    g('Yangi_binolar', order.map(({ b, r }) => `<path d="${ringD(r)}" fill="${fill(b)}"${stroke !== 'none' ? ` stroke="${stroke}" stroke-width="${lw(K === 'bosh' ? lB.mm : Math.min(lB.mm, 0.3))}" stroke-linejoin="round"` : ''}/>`).join(''));
    if (K === 'bosh') legend.push({ type: 'fill', fill: '#ffffff', stroke: '#1d1d1b', label: tr('Loyihalanayotgan binolar') });
    if (K === 'figura') legend.push({ type: 'fill', fill: '#1d1d1b', label: tr('Binolar (mavjud va loyiha)') });
    if (S.labels && K !== 'figura' && !VZ) {
      const fs = 2.5;
      g('Qavatlar_soni', order.filter(x => area(x.r) * k * k > 30).map(({ b, r }) => { const c = centroid(r); return `<text x="${X(c)}" y="${n2(+Y(c) + fs * 0.35)}" font-size="${T(fs)}" text-anchor="middle" fill="#1d1d1b">${(b.z0 ?? 0) + b.floors}</text>`; }).join(''));
    }
  }
  if (K === 'qavat') for (const r of FLOOR_RAMP) legend.push({ type: 'fill', fill: r.color, label: tr(r.label) });
  if (ctx && S.context && K !== 'figura') {
    if (K === 'bosh' || K === 'landshaft' || VZ) legend.push({ type: 'fill', fill: C.ctxB, stroke: C.ctxStroke === 'none' ? undefined : C.ctxStroke, label: tr('Mavjud binolar') });
    if (ctx.green.length && lG.on && !VZ) legend.push({ type: 'fill', fill: C.green, label: tr('Yashil hududlar') });
    if ((ctx.water.length || ctx.waterways.length) && lW.on) legend.push({ type: 'fill', fill: C.water, label: tr('Suv') });
  }

  // 4b. bekatlar
  const lT = Ly('stops');
  if (ctx?.stops?.length && lT.on && K !== 'figura') {
    const st = ctx.stops.filter(q => Math.abs(q.p[0] - cx) < R && Math.abs(q.p[1] - cy) < R), r0 = 1.6;
    g('Bekatlar', st.map(q => `<circle cx="${X(q.p)}" cy="${Y(q.p)}" r="${r0}" fill="${q.kind === 'metro' ? '#c0392b' : '#2a6fb0'}" stroke="#ffffff" stroke-width="${lw(lT.mm)}"/><text x="${X(q.p)}" y="${n2(+Y(q.p) + 0.9)}" font-size="${T(2.5)}" font-weight="700" text-anchor="middle" fill="#ffffff">${q.kind === 'metro' ? 'M' : 'A'}</text>`).join(''));
    if (st.length) legend.push({ type: 'stop', fill: '#2a6fb0', label: tr('Bekatlar (A — avtobus, M — metro)') });
  }

  // 5. yer uchastkasi yozuvlari (4.1): boʻsh joyda, varaqda kod 3,5 mm, qolgani 2,5 mm
  const plots: PlotRow[] = [];
  let full = 0;
  {
    const idx = new Map<number, number>(), obst = nb.map(x => x.r), kM = scale / 1000, max = S.labels ? modeMax(o.labelMode ?? 'auto') : 0, out: string[] = [];
    const angDeg = (a: number) => -(a - rot) * 180 / Math.PI;
    plan.blocks.forEach(b => {
      const n = (idx.get(b.blockKey) ?? 0) + 1; idx.set(b.blockKey, n);
      const code = b.parcelId ? `D-${b.blockKey + 1}.${n}` : `D-${b.blockKey + 1}`, use = tr(SHORT[b.use] ?? useDef(b.use).name), ar = `${(b.area / 1e4).toFixed(2).replace('.', ',')} ga`;
      const rect = VZ || K === 'figura' ? null : freeRect(b.rings, obst);
      const lv = max ? pickLevel(rect, code, use, ar, kM, 3.5, 2.5, max as 0 | 1 | 2 | 3) : 0;
      plots.push({ code, use: tr(useDef(b.use).name), color: mix(useDef(b.use).color, 0.15), ha: b.area / 1e4, level: lv });
      if (lv === 3) full++;
      if (!lv || !rect) return;
      const lines = labelLines(lv, code, use, ar), halo = K === 'zona' ? plotFill(b.use) : '#ffffff';
      const v = toV(rect.c), fsz = lines.map((_t, i) => i ? 2.5 : 3.5), gapL = 0.35 * 2.5, H = fsz.reduce((a2, b2) => a2 + b2, 0) + gapL * (lines.length - 1);
      let acc = -H / 2;
      const body = lines.map((t, i) => { acc += fsz[i]; const yy = acc - fsz[i] * 0.18; acc += gapL; return `<text y="${n2(yy)}" font-size="${T(fsz[i])}"${i === 0 ? ' font-weight="700"' : ''}${i === 0 || (i === lines.length - 1 && lines.length > 1) ? ' font-family="IBM Plex Mono, Menlo, monospace"' : ''}>${esc(t)}</text>`; }).join('');
      out.push(`<g transform="translate(${n2(v[0])} ${n2(v[1])}) rotate(${n2(angDeg(rect.ang))})" text-anchor="middle" fill="#1d1d1b" stroke="${halo}" stroke-width="0.6" stroke-linejoin="round" paint-order="stroke">${body}</g>`);
    });
    g('Yer_uchastkalari_yozuvlari', out.join(''));
  }

  // 6. uchastka chegarasi
  const lSi = Ly('site');
  if (site && lSi.on) {
    g('Uchastka_chegarasi', `<path d="${polyD(site)}" fill="${VZ ? '#f5c7c3' : 'none'}" fill-opacity="${VZ ? 0.6 : 1}" stroke="#d0342c" stroke-width="${lw(lSi.mm)}" stroke-dasharray="4 1.2 0.8 1.2"/>`);
    legend.push({ type: 'dash', stroke: '#d0342c', label: tr('Loyihalash chegarasi') });
  }

  // 7. koordinata toʻri
  if (S.grid) {
    const step = o.gridStep && o.gridStep > 0 ? o.gridStep : scale >= 5000 ? 500 : scale >= 2000 ? 200 : 100, out: string[] = [];
    const lim = R;
    for (let x = Math.ceil((cx - lim) / step) * step; x <= cx + lim; x += step) out.push(`<path d="${lineD([[x, cy - lim], [x, cy + lim]])}" stroke="#9fb5c9" stroke-width="${lw(0.1)}"/>`);
    for (let y = Math.ceil((cy - lim) / step) * step; y <= cy + lim; y += step) out.push(`<path d="${lineD([[cx - lim, y], [cx + lim, y]])}" stroke="#9fb5c9" stroke-width="${lw(0.1)}"/>`);
    // yorliqlar chekkada (burilmagan varaqda)
    if (!rot) {
      for (let x = Math.ceil((cx - vw / 2 / k) / step) * step; x <= cx + vw / 2 / k; x += step) out.push(`<text x="${n2(+X([x, 0]) + 0.8)}" y="${vy + 3.4}" font-size="${T(2.5)}" fill="#6f8aa3">${x}</text>`);
      for (let y = Math.ceil((cy - vh / 2 / k) / step) * step; y <= cy + vh / 2 / k; y += step) out.push(`<text x="${vx + 0.8}" y="${n2(+Y([0, y]) - 0.8)}" font-size="${T(2.5)}" fill="#6f8aa3">${y}</text>`);
    }
    g('Koordinata_tori', out.join(''));
  }

  if (inner) { L.length = 0; legend.length = 0; legend.push(...(inner.legend ?? [])); L.push(`<g id="Mazmun" inkscape:groupmode="layer" inkscape:label="Mazmun">${inner.body(vx, vy, vw, vh)}</g>`); }
  const scaleTxt = inner ? inner.label : `M 1:${scale}`;
  // varaq bezaklari (kesilmaydi)
  const A: string[] = [];
  const lay = (id: string, label: string, body: string) => A.push(`<g id="${id}" ${ai ? 'i:layer="yes" ' : ''}inkscape:groupmode="layer" inkscape:label="${label}">${body}</g>`);
  if (S.frame) lay('Ramka', 'Ramka', `<rect x="${vx}" y="${vy}" width="${n2(vw)}" height="${n2(vh)}" fill="none" stroke="#1d1d1b" stroke-width="0.35"/>${col ? `<rect x="${n2(vx + vw + gap)}" y="${vy}" width="${n2(col)}" height="${n2(vh)}" fill="none" stroke="#1d1d1b" stroke-width="0.25"/>` : ''}`);
  if (S.north && !inner) {
    const nx = vx + vw - 12, ny = vy + 14, a = n2(-rot * 180 / Math.PI);
    lay('Shimol', 'Shimol', `<g transform="rotate(${a} ${nx} ${ny})"><circle cx="${nx}" cy="${ny}" r="7" fill="#ffffff" stroke="#1d1d1b" stroke-width="0.3"/><path d="M${nx},${ny - 6}L${nx + 2.6},${ny + 4}L${nx},${ny + 2.4}Z" fill="#1d1d1b"/><path d="M${nx},${ny - 6}L${nx - 2.6},${ny + 4}L${nx},${ny + 2.4}Z" fill="#ffffff" stroke="#1d1d1b" stroke-width="0.25"/><text x="${nx}" y="${ny - 7.8}" font-size="${T(3)}" font-weight="700" text-anchor="middle" fill="#1d1d1b">N</text></g>`);
  }
  if (S.scaleBar && !inner) {
    const len = niceLen(Math.min(vw * 0.3, 80) / k), seg = len / 4, bx = vx + 6, by = vy + vh - 8, out: string[] = [];
    for (let i = 0; i < 4; i++) out.push(`<rect x="${n2(bx + i * seg * k)}" y="${by}" width="${n2(seg * k)}" height="1.4" fill="${i % 2 ? '#ffffff' : '#1d1d1b'}" stroke="#1d1d1b" stroke-width="0.2"/>`);
    for (let i = 0; i <= 4; i += 2) out.push(`<text x="${n2(bx + i * seg * k)}" y="${by - 1.2}" font-size="${T(2.5)}" text-anchor="middle" fill="#1d1d1b">${i * seg}</text>`);
    out.push(`<text x="${n2(bx + len * k + 2)}" y="${by + 1.3}" font-size="${T(2.5)}" fill="#1d1d1b">m · M 1:${scale}</text>`);
    lay('Masshtab', 'Masshtab', `<rect x="${bx - 3}" y="${by - 5.4}" width="${n2(len * k + 30)}" height="8.4" fill="#ffffff" fill-opacity="0.85"/>${out.join('')}`);
  }
  const kindName = tr(SHEET_KINDS.find(s2 => s2.id === K)!.name), d = date.toLocaleDateString('ru-RU'), ttl = esc(o.title || doc.name);
  // oʻng ustun: sarlavha → shartli belgilar → yer uchastkalari jadvali → vaziyat sxemasi → shtamp
  if (col) {
    const x0 = vx + vw + gap + 4, w = col - 8;
    let y = vy + 4;
    const yEnd = vy + vh - 4;
    if (S.title) { lay('Sarlavha', 'Sarlavha', `<text x="${x0}" y="${n2(y + 5)}" font-size="${T(Math.min(6, w / 14))}" font-weight="700" fill="#1d1d1b">${ttl}</text><text x="${x0}" y="${n2(y + 10)}" font-size="${T(2.8)}" fill="#55524b">${esc(kindName)} · ${scaleTxt} · ${d}</text>`); y += 15; }
    const stampH = S.stamp ? 30 : 0, sitH = S.situation ? Math.min(55, w * 0.7) + 6 : 0;
    if (S.legend && legend.length) {
      const rowH = 4.6, out: string[] = [`<text x="${x0}" y="${n2(y + 3.5)}" font-size="${T(3)}" font-weight="700" fill="#1d1d1b">${esc(tr('Shartli belgilar'))}</text>`];
      legend.forEach((it, i) => { const yy = y + 7 + i * rowH; out.push(legendSym(it, x0, yy), `<text x="${x0 + 8}" y="${n2(yy + 2.3)}" font-size="${T(2.5)}" fill="#1d1d1b">${esc(it.label)}</text>`); });
      lay('Shartli_belgilar', 'Shartli belgilar', out.join('')); y += 9 + legend.length * rowH;
    }
    if (S.plotTable && plots.length && !inner) {
      const rowH = 3.8, avail = yEnd - stampH - sitH - y - 10, nRows = Math.max(0, Math.floor(avail / rowH) - 1), shown = plots.slice(0, Math.max(0, plots.length > nRows ? nRows - 1 : nRows)), out: string[] = [];
      if (nRows > 1) {
        out.push(`<text x="${x0}" y="${n2(y + 3.5)}" font-size="${T(3)}" font-weight="700" fill="#1d1d1b">${esc(tr('Yer uchastkalari'))}</text>`);
        const yh = y + 7.5; out.push(`<text x="${x0}" y="${n2(yh)}" font-size="${T(2.5)}" fill="#6b6965">${esc(tr('kod'))}</text><text x="${x0 + 18}" y="${n2(yh)}" font-size="${T(2.5)}" fill="#6b6965">${esc(tr('funksiya'))}</text><text x="${x0 + w}" y="${n2(yh)}" font-size="${T(2.5)}" text-anchor="end" fill="#6b6965">ga</text>`);
        shown.forEach((r, i) => { const yy = yh + (i + 1) * rowH; out.push(`<rect x="${x0}" y="${n2(yy - 2.4)}" width="2.6" height="2.6" fill="${r.color}" stroke="#9a978f" stroke-width="0.1"/><text x="${x0 + 3.6}" y="${n2(yy)}" font-size="${T(2.5)}" font-family="IBM Plex Mono, Menlo, monospace" fill="#1d1d1b">${esc(r.code)}</text><text x="${x0 + 18}" y="${n2(yy)}" font-size="${T(2.5)}" fill="#1d1d1b">${esc(r.use)}</text><text x="${x0 + w}" y="${n2(yy)}" font-size="${T(2.5)}" text-anchor="end" font-family="IBM Plex Mono, Menlo, monospace" fill="#1d1d1b">${r.ha.toFixed(2).replace('.', ',')}</text>`); });
        if (shown.length < plots.length) out.push(`<text x="${x0}" y="${n2(yh + (shown.length + 1) * rowH)}" font-size="${T(2.5)}" fill="#6b6965">… ${esc(tr(`${plots.length} ta`))}</text>`);
        lay('Yer_uchastkalari_jadvali', 'Yer uchastkalari jadvali', out.join(''));
      }
    }
    if (S.situation) {
      const sh = sitH - 6, sy = yEnd - stampH - sitH, out: string[] = [`<text x="${x0}" y="${n2(sy + 3)}" font-size="${T(2.8)}" font-weight="700" fill="#1d1d1b">${esc(tr('Vaziyat sxemasi'))}</text>`, `<rect x="${x0}" y="${n2(sy + 5)}" width="${n2(w)}" height="${n2(sh - 4)}" fill="#f4f3f0" stroke="#1d1d1b" stroke-width="0.2"/>`];
      if (ctx) {
        const rr = Math.max(500, (bx1 - bx0), (by1 - by0)) * 2.2, kk = Math.min(w, sh - 4) / rr, ox = x0 + w / 2, oy = sy + 5 + (sh - 4) / 2;
        const q = (p: XY) => `${n2(ox + (p[0] - (bx0 + bx1) / 2) * kk)},${n2(oy - (p[1] - (by0 + by1) / 2) * kk)}`;
        const inB = (p: XY) => Math.abs(p[0] - (bx0 + bx1) / 2) < rr / 2 && Math.abs(p[1] - (by0 + by1) / 2) < rr / 2;
        out.push(`<clipPath id="vzClip"><rect x="${x0}" y="${n2(sy + 5)}" width="${n2(w)}" height="${n2(sh - 4)}"/></clipPath><g clip-path="url(#vzClip)">`);
        ctx.roads.filter(r => r.pts.some(inB) && /^(motorway|trunk|primary|secondary|tertiary|residential)/.test(r.cls)).forEach(r => out.push(`<path d="M${r.pts.map(q).join('L')}" fill="none" stroke="#bcb8b0" stroke-width="0.25"/>`));
        if (site0) out.push(`<path d="M${site0.map(q).join('L')}Z" fill="#d0342c" fill-opacity="0.5" stroke="#d0342c" stroke-width="0.3"/>`);
        out.push('</g>');
      }
      lay('Vaziyat_sxemasi', 'Vaziyat sxemasi', out.join(''));
    }
    if (S.stamp) {
      const sy = yEnd - stampH + 2, st = o.stamp ?? {}, rows: [string, string][] = [[tr('Loyiha'), o.title || doc.name], [tr('Varaq'), `${st.num ? st.num + ' · ' : ''}${st.sheet || kindName}`], [tr('Muallif'), st.author || ''], [tr('Masshtab'), inner ? inner.label.replace(/^M /, '') : `1:${scale}`], [tr('Sana'), d], [tr('Varaq'), `${st.index ?? 1} / ${st.total ?? 1}`]];
      const out = [`<rect x="${x0}" y="${n2(sy)}" width="${n2(w)}" height="${stampH - 2}" fill="#ffffff" stroke="#1d1d1b" stroke-width="0.3"/>`];
      rows.forEach(([a, b], i) => { const yy = sy + 4.3 + i * 4.6; if (i) out.push(`<path d="M${x0},${n2(yy - 3.4)}h${n2(w)}" stroke="#1d1d1b" stroke-width="0.12"/>`); out.push(`<text x="${x0 + 1.5}" y="${n2(yy)}" font-size="${T(2.5)}" fill="#6b6965">${esc(a)}</text><text x="${x0 + 22}" y="${n2(yy)}" font-size="${T(2.5)}" fill="#1d1d1b">${esc(b)}</text>`); });
      out.push(`<path d="M${x0 + 20},${n2(sy)}v${stampH - 2}" stroke="#1d1d1b" stroke-width="0.12"/>`);
      lay('Shtamp', 'Shtamp', out.join(''));
    }
    lay('Muallif', 'Muallif', `<text x="${n2(x0 + w)}" y="${n2(vy + vh + 4.5)}" font-size="${T(2.5)}" text-anchor="end" fill="#8a857c">Archemistry Lab · Master reja · ${esc(tr('Asos'))}: OpenStreetMap · ShNQ 2.07.01-23 · ${esc(tr('qavat'))} ${fh} m</text>`);
  } else {
    if (S.legend && legend.length) {
      const rowH = 4.6, w = 60, hgt = 7 + legend.length * rowH, lx = vx + vw - w - 4, ly = vy + vh - hgt - 4, out: string[] = [];
      out.push(`<rect x="${lx}" y="${ly}" width="${w}" height="${n2(hgt)}" fill="#ffffff" stroke="#1d1d1b" stroke-width="0.2"/><text x="${lx + 3}" y="${ly + 4.6}" font-size="${T(2.8)}" font-weight="700" fill="#1d1d1b">${esc(tr('Shartli belgilar'))}</text>`);
      legend.forEach((it, i) => { const y = ly + 7.5 + i * rowH; out.push(legendSym(it, lx + 3, y), `<text x="${lx + 11}" y="${n2(y + 2.3)}" font-size="${T(2.5)}" fill="#1d1d1b">${esc(it.label)}</text>`); });
      lay('Shartli_belgilar', 'Shartli belgilar', out.join(''));
    }
    if (S.title) {
      const ty = ph - M - TB + 4;
      lay('Sarlavha', 'Sarlavha', `<path d="M${vx},${ty - 1}H${vx + vw}" stroke="#1d1d1b" stroke-width="0.35"/>`
        + `<text x="${vx}" y="${ty + 6}" font-size="${T(5.2)}" font-weight="700" fill="#1d1d1b">${ttl}</text>`
        + `<text x="${vx}" y="${ty + 12}" font-size="${T(3)}" fill="#55524b">${esc(kindName)} · ${scaleTxt} · ${d}</text>`
        + `<text x="${vx + vw}" y="${ty + 6}" font-size="${T(2.6)}" text-anchor="end" fill="#55524b">Archemistry Lab · Master reja</text>`
        + `<text x="${vx + vw}" y="${ty + 11}" font-size="${T(2.5)}" text-anchor="end" fill="#8a857c">${esc(tr('Asos'))}: OpenStreetMap · ${esc(tr('meʼyorlar'))}: ShNQ 2.07.01-23 · ${esc(tr('qavat'))} ${fh} m</text>`);
    }
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"${ai ? ' xmlns:i="http://ns.adobe.com/AdobeIllustrator/10.0/"' : ''} width="${pw}mm" height="${ph}mm" viewBox="0 0 ${pw} ${ph}" font-family="${esc(fam)}">
<title>${esc((o.title || doc.name) + ' — ' + kindName)}</title>
<defs><clipPath id="vp"><rect x="${vx}" y="${vy}" width="${n2(vw)}" height="${n2(vh)}"/></clipPath>${site ? `<mask id="tashqari" maskUnits="userSpaceOnUse" x="0" y="0" width="${pw}" height="${ph}"><rect width="${pw}" height="${ph}" fill="#fff"/><path d="${polyD(site)}" fill="#000" fill-rule="evenodd"/></mask>` : ''}</defs>
${ai ? `<g id="Fon" i:layer="yes" inkscape:groupmode="layer" inkscape:label="Fon"><rect width="${pw}" height="${ph}" fill="${C.bg}"/></g>` : `<rect width="${pw}" height="${ph}" fill="${C.bg}"/>`}
${ai ? L.join('\n') : `<g clip-path="url(#vp)">${L.join('\n')}</g>`}
${A.join('\n')}
</svg>`;
  return { svg, scale, widthMm: pw, heightMm: ph, legend, plots, labels: { full, total: plots.length }, minText, fits, auto };
}

function legendSym(it: LegendItem, sx: number, y: number): string {
  if (it.type === 'fill' || it.type === 'swatch') return `<rect x="${sx}" y="${n2(y - 0.2)}" width="6" height="3" fill="${it.fill}" stroke="${it.stroke ?? '#9a978f'}" stroke-width="0.15"/>`;
  if (it.type === 'line') return `<path d="M${sx},${n2(y + 1.3)}h6" stroke="${it.stroke}" stroke-width="0.4"/>`;
  if (it.type === 'dash') return `<rect x="${sx}" y="${n2(y - 0.2)}" width="6" height="3" fill="none" stroke="${it.stroke}" stroke-width="0.3" stroke-dasharray="1.2 0.6"/>`;
  if (it.type === 'stop') return `<circle cx="${sx + 3}" cy="${n2(y + 1.3)}" r="1.4" fill="${it.fill}"/>`;
  return `<circle cx="${sx + 3}" cy="${n2(y + 1.3)}" r="1.4" fill="#ffffff" stroke="#7d8a6a" stroke-width="0.15"/>`;
}

/** Varaq tekshiruvi (MR-Varaqlar): qisqargan yozuvlar, < 2,5 mm matn, varaqdan chiqqan hudud, andoza/nostandart masshtab, boʻsh shtamp */
export interface SheetCheck { id: 'scale' | 'labels' | 'text' | 'fit' | 'stamp'; ok: boolean; text: string }
export function sheetChecks(r: SheetResult, o: SheetOpts, tr: (s: string) => string = s => s): SheetCheck[] {
  const [lo, hi] = scaleRange(o.kind), std = SCALES.includes(r.scale);
  const sc: SheetCheck = r.auto ? { id: 'scale', ok: false, text: tr('Masshtab «andoza» qoidadan — tasdiqlang yoki oʻzgartiring') }
    : !std || r.scale < lo || r.scale > hi ? { id: 'scale', ok: false, text: `${tr('Nostandart yoki tavsiyadan tashqari masshtab')} 1:${r.scale}` } : { id: 'scale', ok: true, text: `${tr('Masshtab')} 1:${r.scale}` };
  return [
    sc,
    { id: 'labels', ok: r.labels.full === r.labels.total, text: `${r.labels.full} / ${r.labels.total} ${tr('yozuv toʻliq sigʻdi')}` },
    { id: 'text', ok: r.minText >= 2.5, text: r.minText >= 2.5 ? tr('Matn ≥ 2,5 mm') : `${tr('Matn')} ${String(r.minText).replace('.', ',')} mm < 2,5 mm` },
    { id: 'fit', ok: r.fits, text: r.fits ? tr('Hudud varaqqa sigʻdi') : tr('Hudud varaqdan chiqib ketgan') },
    { id: 'stamp', ok: !(o.show.stamp ?? true) || !!(o.stamp?.author), text: !(o.show.stamp ?? true) || o.stamp?.author ? tr('Shtamp toʻldirilgan') : tr('Shtampda muallif yoʻq') },
  ];
}
