/**
 * Chizmadon (oldin «Albom», maket.html) — erkin taqdimot va diagramma muharriri. Qaror 2026-10-17: CH-Yagona —
 * Muharrir (A) + Albom (B) + Diagramma (C) bitta oynada. Hujjat loyiha bilan birga saqlanadi (Project.chizmadon).
 * Birliklar: koordinata, oʻlcham, chiziq qalinligi — mm (varaq tizimida, chap-yuqori burchak 0,0); shrift — pt.
 * Bu modul faqat maʼlumot tuzilmasi va tozalash (ochilganda yaroqsiz maydonlar sukut bilan toʻldiriladi).
 */

export type ChPaper = 'A4' | 'A3' | 'A2' | 'A1' | 'A0' | 'A0+' | 'custom';
export const PAPER_MM: Record<Exclude<ChPaper, 'custom'>, [number, number]> = { A4: [297, 210], A3: [420, 297], A2: [594, 420], A1: [841, 594], A0: [1189, 841], 'A0+': [1609, 1189] };

export type ElType = 'text' | 'line' | 'arrow' | 'pen' | 'rect' | 'ellipse' | 'poly' | 'flow' | 'zone' | 'icon' | 'row' | 'image' | 'map' | 'legend' | 'table';
export type Dash = 'solid' | 'dash' | 'long' | 'dot' | 'dashdot' | 'dash2dot';
export type FlowBand = 'lenta' | 'toliq' | 'kontur' | 'nuqta' | 'punktir';
export type IconLook = 'doira' | 'pin' | 'belgi' | 'tolqin';
export type Head = 'none' | 'end' | 'both';

export interface ChStyle {
  stroke?: string; fill?: string; width?: number; dash?: Dash; opacity?: number;
  /** zona: yumshoq chegara kengligi, mm */
  halo?: number;
  /** oʻq / yoʻnalish oʻqi */
  head?: Head; smooth?: boolean; band?: FlowBand;
  /** matn */
  font?: string; size?: number; bold?: boolean; italic?: boolean; align?: 'start' | 'middle' | 'end'; lh?: number; kind?: 'sarlavha' | 'matn' | 'izoh' | 'raqam';
  /** harakatlanish ierarxiyasi bezagi */
  deco?: 'none' | 'rail' | 'stations' | 'casing';
  /** xavf belgisi (qizil rang faqat shunday elementlarda — tekshiruv 6) */
  risk?: boolean;
}

export interface ChEl {
  id: string; t: ElType; layer: string;
  /** chiziqli shakllar: nuqtalar (mm) */
  pts?: [number, number][];
  /** toʻrtburchakli shakllar: chap-yuqori va oʻlcham (mm) */
  x?: number; y?: number; w?: number; h?: number;
  rot?: number; flipX?: boolean; flipY?: boolean;
  text?: string;
  /** belgi (icon) id si va koʻrinishi; qator (row) turi */
  icon?: string; look?: IconLook;
  row?: { kind: 'tree' | 'people' | 'dot' | 'icon'; gap: number; size: number; tree?: string; icon?: string };
  /** rasm: data URL; xarita oynasi: ichki SVG (mm) va uning koʻrinadigan qismi */
  src?: string; svg?: string; vb?: [number, number, number, number];
  /** xarita oynasi masshtabi: 1:N (asl oʻlchamda); oʻlcham oʻzgarsa — N × asl / joriy */
  scale?: number; natW?: number;
  /** jadval: qatorlar (birinchisi — sarlavha) */
  rows?: string[][];
  /** nom (shartli belgilar va qatlamlar uchun) va namuna (preset) id si */
  name?: string; preset?: string;
  group?: string;
  style: ChStyle;
}

export interface ChLayer { id: string; name: string; visible: boolean; locked: boolean }
export interface ChPage { id: string; name: string; paper: ChPaper; landscape: boolean; w?: number; h?: number; layers: ChLayer[]; els: ChEl[]; tpl?: string }
/** «Loyihadan» — boshqa oynalardan yuborilgan xarita, varaq va rasmlar (bir marta bosish — varaqqa qoʻyiladi) */
export interface ChInbox { id: string; name: string; kind: 'sheet' | 'scene' | 'plan'; svg?: string; vb?: [number, number, number, number]; src?: string; w: number; h: number; scale?: number; at: string }
export interface ChUi { left: boolean; right: boolean; leftTab: 'varaq' | 'qatlam' | 'kutubxona'; rightTab: 'element' | 'tekshiruv'; libTab: 'belgi' | 'daraxt' | 'yol' | 'rang'; lockL: boolean; lockR: boolean }
export interface ChDoc {
  v: 1; title: string; pages: ChPage[]; cur: number;
  palette: string;
  album: { stamp: boolean; numbering: boolean; toc: boolean; author: string };
  inbox: ChInbox[];
  ui: ChUi;
}

let seq = 0;
export const cid = (p = 'e') => `${p}${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export const pageSize = (p: Pick<ChPage, 'paper' | 'landscape' | 'w' | 'h'>): [number, number] => {
  if (p.paper === 'custom') return [Math.max(50, p.w ?? 420), Math.max(50, p.h ?? 297)];
  const [a, b] = PAPER_MM[p.paper]; return p.landscape ? [a, b] : [b, a];
};

export const defaultLayers = (): ChLayer[] => [
  { id: cid('l'), name: 'Asos', visible: true, locked: false },
  { id: cid('l'), name: 'Tahlil', visible: true, locked: false },
  { id: cid('l'), name: 'Yozuvlar', visible: true, locked: false },
];
export function blankPage(name = 'Varaq', paper: ChPaper = 'A3', landscape = true): ChPage {
  return { id: cid('p'), name, paper, landscape, layers: defaultLayers(), els: [] };
}
export function blankDoc(title = ''): ChDoc {
  return {
    v: 1, title, pages: [blankPage('Varaq 1')], cur: 0, palette: 'asosiy',
    album: { stamp: true, numbering: true, toc: false, author: '' }, inbox: [],
    ui: { left: true, right: true, leftTab: 'varaq', rightTab: 'element', libTab: 'belgi', lockL: false, lockR: false },
  };
}

const num = (v: unknown, d: number, lo = -1e6, hi = 1e6) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const str = (v: unknown, d = '', max = 20000) => (typeof v === 'string' ? v.slice(0, max) : d);
const pt = (p: unknown): [number, number] | null => (Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]) ? [Number(p[0]), Number(p[1])] : null);
const TYPES: ElType[] = ['text', 'line', 'arrow', 'pen', 'rect', 'ellipse', 'poly', 'flow', 'zone', 'icon', 'row', 'image', 'map', 'legend', 'table'];

/** Saqlangan (yoki tashqaridan ochilgan) obyektni toʻliq ChDoc ga keltirish */
export function normDoc(o: unknown, title = ''): ChDoc {
  const d = blankDoc(title);
  if (!o || typeof o !== 'object') return d;
  const x = o as Record<string, any>;
  const pages: ChPage[] = (Array.isArray(x.pages) ? x.pages : []).slice(0, 200).map((p: any): ChPage | null => {
    if (!p || typeof p !== 'object') return null;
    const layers: ChLayer[] = (Array.isArray(p.layers) ? p.layers : []).filter((l: any) => l && typeof l.id === 'string').slice(0, 50)
      .map((l: any) => ({ id: l.id, name: str(l.name, 'Qatlam', 80), visible: l.visible !== false, locked: !!l.locked }));
    if (!layers.length) layers.push(...defaultLayers());
    const lids = new Set(layers.map(l => l.id));
    const els: ChEl[] = (Array.isArray(p.els) ? p.els : []).slice(0, 5000).map((e: any): ChEl | null => {
      if (!e || typeof e !== 'object' || !TYPES.includes(e.t)) return null;
      const el: ChEl = { id: typeof e.id === 'string' ? e.id : cid(), t: e.t, layer: lids.has(e.layer) ? e.layer : layers[0].id, style: typeof e.style === 'object' && e.style ? { ...e.style } : {} };
      if (Array.isArray(e.pts)) el.pts = e.pts.map(pt).filter(Boolean).slice(0, 4000) as [number, number][];
      for (const k of ['x', 'y', 'w', 'h', 'rot', 'scale', 'natW'] as const) if (typeof e[k] === 'number' && Number.isFinite(e[k])) el[k] = e[k];
      for (const k of ['text', 'icon', 'src', 'svg', 'name', 'preset', 'group'] as const) if (typeof e[k] === 'string') el[k] = e[k];
      if (e.look) el.look = e.look; if (e.flipX) el.flipX = true; if (e.flipY) el.flipY = true;
      if (e.row && typeof e.row === 'object') el.row = { kind: e.row.kind ?? 'tree', gap: num(e.row.gap, 8, 0.5, 500), size: num(e.row.size, 5, 0.5, 200), tree: e.row.tree, icon: e.row.icon };
      if (Array.isArray(e.vb) && e.vb.length === 4) el.vb = e.vb.map(Number) as ChEl['vb'];
      if (Array.isArray(e.rows)) el.rows = e.rows.slice(0, 200).map((r: any) => (Array.isArray(r) ? r.slice(0, 20).map((c: any) => String(c ?? '')) : []));
      return el;
    }).filter(Boolean) as ChEl[];
    const paper = (['A4', 'A3', 'A2', 'A1', 'A0', 'A0+', 'custom'] as ChPaper[]).includes(p.paper) ? p.paper : 'A3';
    return { id: typeof p.id === 'string' ? p.id : cid('p'), name: str(p.name, 'Varaq', 120), paper, landscape: p.landscape !== false, ...(paper === 'custom' ? { w: num(p.w, 420, 50, 5000), h: num(p.h, 297, 50, 5000) } : {}), layers, els, ...(typeof p.tpl === 'string' ? { tpl: p.tpl } : {}) };
  }).filter(Boolean) as ChPage[];
  if (pages.length) d.pages = pages;
  d.cur = Math.round(num(x.cur, 0, 0, d.pages.length - 1));
  d.title = str(x.title, title, 200);
  d.palette = str(x.palette, 'asosiy', 40);
  if (x.album && typeof x.album === 'object') d.album = { stamp: x.album.stamp !== false, numbering: x.album.numbering !== false, toc: !!x.album.toc, author: str(x.album.author, '', 120) };
  if (Array.isArray(x.inbox)) d.inbox = x.inbox.filter((i: any) => i && typeof i.id === 'string').slice(-30).map((i: any) => ({ id: i.id, name: str(i.name, '', 120), kind: i.kind === 'scene' || i.kind === 'plan' ? i.kind : 'sheet', ...(typeof i.svg === 'string' ? { svg: i.svg } : {}), ...(Array.isArray(i.vb) ? { vb: i.vb.map(Number) } : {}), ...(typeof i.src === 'string' ? { src: i.src } : {}), w: num(i.w, 200, 1, 5000), h: num(i.h, 150, 1, 5000), ...(typeof i.scale === 'number' ? { scale: i.scale } : {}), at: str(i.at, new Date().toISOString(), 40) }));
  if (x.ui && typeof x.ui === 'object') d.ui = { ...d.ui, ...x.ui };
  return d;
}

/** Element chegarasi (mm): [x0, y0, x1, y1] — burilishsiz */
export function bbox(e: ChEl): [number, number, number, number] {
  if (e.pts?.length && e.x == null) {
    let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
    for (const [x, y] of e.pts) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); }
    const pad = e.t === 'flow' || e.t === 'zone' ? (e.style.width ?? 4) / 2 + (e.style.halo ?? 0) : e.t === 'row' ? (e.row?.size ?? 4) / 2 : (e.style.width ?? 0.5) / 2;
    return [a - pad, b - pad, c + pad, d + pad];
  }
  const x = e.x ?? 0, y = e.y ?? 0, w = e.w ?? 10, h = e.h ?? 10;
  return [Math.min(x, x + w), Math.min(y, y + h), Math.max(x, x + w), Math.max(y, y + h)];
}
export const center = (e: ChEl): [number, number] => { const b = bbox(e); return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; };

/** Elementni siljitish (nusxa qaytaradi) */
export function moved(e: ChEl, dx: number, dy: number): ChEl {
  const n: ChEl = { ...e, style: { ...e.style } };
  if (e.pts) n.pts = e.pts.map(([x, y]) => [x + dx, y + dy]);
  if (e.x != null) n.x = e.x + dx; if (e.y != null) n.y = e.y + dy;
  return n;
}
/** Chegarani yangi qutiga moslash (oʻlcham oʻzgartirish) */
export function fitTo(e: ChEl, from: [number, number, number, number], to: [number, number, number, number]): ChEl {
  const sx = (to[2] - to[0]) / ((from[2] - from[0]) || 1), sy = (to[3] - to[1]) / ((from[3] - from[1]) || 1);
  const f = (x: number, y: number): [number, number] => [to[0] + (x - from[0]) * sx, to[1] + (y - from[1]) * sy];
  const n: ChEl = { ...e, style: { ...e.style } };
  if (e.pts) n.pts = e.pts.map(([x, y]) => f(x, y));
  if (e.x != null && e.w != null) { const [x, y] = f(e.x, e.y ?? 0); n.x = x; n.y = y; n.w = e.w * sx; n.h = (e.h ?? 0) * sy; }
  if (e.t === 'text' && e.style.size) n.style.size = Math.max(4, e.style.size * Math.sqrt(Math.abs(sx * sy)));
  if (e.t === 'icon' && e.w) { /* belgi — kvadrat */ const s = Math.max(n.w!, n.h!); n.w = s; n.h = s; }
  return n;
}
/** Xarita oynasi joriy masshtabi: asl 1:N × (asl kenglik / joriy kenglik) */
export const mapScale = (e: ChEl): number | null => (e.t === 'map' && e.scale && e.natW && e.w ? Math.round(e.scale * e.natW / Math.abs(e.w)) : null);
