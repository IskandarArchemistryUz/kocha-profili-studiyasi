/**
 * Varaq namunalari — 24 ta, 5 guruh (eski js/shablonlar.js dan; atamalar yangilangan: Situatsion reja → Vaziyat sxemasi,
 * TEP → TIK). Loyihadan maʼlumot berilsa (nom, TIK jadvali, bosh reja xaritasi) — namuna shular bilan toʻladi.
 */
import { type ChEl, type ChPage, type ChPaper, blankPage, cid, pageSize } from './model';

export interface TplCtx {
  title: string; place: string; date: string; author: string;
  /** TIK: [koʻrsatkich, birlik, qiymat] */
  tik?: string[][];
  /** bosh reja (Varaqlardan, mm SVG) */
  map?: { svg: string; vb: [number, number, number, number]; w: number; h: number; scale?: number };
}
export interface Template { id: string; group: string; name: string; paper: ChPaper; landscape: boolean; build: (c: TplCtx) => ChPage }
export const TPL_GROUPS = ['Master reja albomi', 'APZ', 'Planshet', 'Portfolio', 'Xalqaro fond hisoboti'];

type B = { p: ChPage; L: string[] };
const page = (name: string, paper: ChPaper, land: boolean, tpl: string): B => { const p = blankPage(name, paper, land); p.tpl = tpl; return { p, L: p.layers.map(l => l.id) }; };
const T = (b: B, x: number, y: number, w: number, text: string, kind: 'sarlavha' | 'matn' | 'izoh' | 'raqam' | 'kichik' = 'matn', extra: Partial<ChEl['style']> = {}): ChEl => {
  const S = { sarlavha: { size: 28, bold: true, font: 'Archivo' }, matn: { size: 11, bold: false, font: 'Archivo' }, izoh: { size: 8, bold: false, font: 'IBM Plex Mono' }, raqam: { size: 96, bold: true, font: 'Archivo' }, kichik: { size: 14, bold: true, font: 'Archivo' } }[kind];
  const size = extra.size ?? S.size, lines = text.split('\n').length;
  const e: ChEl = { id: cid(), t: 'text', layer: b.L[2], x, y, w, h: size * 0.3528 * (1.25 * lines + 0.2), text, style: { ...S, kind: kind === 'kichik' ? 'sarlavha' : kind, fill: '#141414', ...extra } };
  b.p.els.push(e); return e;
};
const R = (b: B, x: number, y: number, w: number, h: number, fill = '#ecebe7', extra: Partial<ChEl> = {}): ChEl => { const e: ChEl = { id: cid(), t: 'rect', layer: b.L[0], x, y, w, h, style: { fill, stroke: 'none' }, ...extra }; b.p.els.push(e); return e; };
const IMG = (b: B, x: number, y: number, w: number, h: number, name = 'Rasm'): ChEl => { const e: ChEl = { id: cid(), t: 'image', layer: b.L[0], x, y, w, h, name, style: {} }; b.p.els.push(e); return e; };
const MAP = (b: B, c: TplCtx, x: number, y: number, w: number, h: number, name = 'Xarita oynasi'): ChEl => {
  const e: ChEl = { id: cid(), t: 'map', layer: b.L[0], x, y, w, h, name, style: { width: 0.25 } };
  if (c.map) { // nisbatni saqlab, koʻrinadigan qismni markazdan
    const k = Math.max(w / c.map.vb[2], h / c.map.vb[3]), vw = w / k, vh = h / k, [vx, vy, VW, VH] = c.map.vb;
    e.svg = c.map.svg; e.vb = [vx + (VW - vw) / 2, vy + (VH - vh) / 2, vw, vh];
    if (c.map.scale) { e.scale = Math.round(c.map.scale / k); e.natW = w; }
  }
  b.p.els.push(e); return e;
};
const LINE = (b: B, x0: number, y0: number, x1: number, y1: number, w = 0.35, stroke = '#141414'): ChEl => { const e: ChEl = { id: cid(), t: 'line', layer: b.L[0], pts: [[x0, y0], [x1, y1]], style: { stroke, width: w } }; b.p.els.push(e); return e; };
const LEG = (b: B, x: number, y: number): ChEl => { const e: ChEl = { id: cid(), t: 'legend', layer: b.L[2], x, y, w: 70, h: 40, text: 'Shartli belgilar', style: { size: 9 } }; b.p.els.push(e); return e; };
const TAB = (b: B, x: number, y: number, w: number, rows: string[][], size = 9): ChEl => { const e: ChEl = { id: cid(), t: 'table', layer: b.L[2], x, y, w, h: rows.length * size * 0.3528 * 1.9, rows, style: { size } }; b.p.els.push(e); return e; };
const ZONE = (b: B, pts: [number, number][], fill: string, name: string): ChEl => { const e: ChEl = { id: cid(), t: 'zone', layer: b.L[1], pts, name, preset: name, style: { fill, opacity: 0.5, halo: 5 } }; b.p.els.push(e); return e; };
const FLOW = (b: B, pts: [number, number][], stroke: string, w: number, name: string, band: 'lenta' | 'toliq' = 'toliq'): ChEl => { const e: ChEl = { id: cid(), t: 'flow', layer: b.L[1], pts, name, preset: name, style: { stroke, width: w, band, head: 'end', smooth: true, opacity: 0.85 } }; b.p.els.push(e); return e; };
const tikRows = (c: TplCtx): string[][] => [['Koʻrsatkich', 'Birlik', 'Qiymat'], ...(c.tik?.length ? c.tik.slice(0, 14) : [['Uchastka maydoni', 'ga', '—'], ['Umumiy maydon (GFA)', 'm²', '—'], ['UMN', '', '—'], ['Aholi', 'kishi', '—'], ['Aholi zichligi', 'kishi/ga', '—']])];
const head = (b: B, c: TplCtx, title: string, sub = `${c.place} · ${c.date}`) => { T(b, 20, 16, 300, title, 'sarlavha', { size: 22 }); T(b, 20, 28, 300, sub, 'izoh'); };

export const TEMPLATES: Template[] = [
  /* Master reja albomi (7) */
  { id: 'mr-muqova', group: TPL_GROUPS[0], name: 'Muqova', paper: 'A3', landscape: true, build: c => { const b = page('Muqova', 'A3', true, 'mr-muqova'); MAP(b, c, 200, 0, 220, 297, 'Bosh reja'); R(b, 0, 0, 200, 297, '#ffffff'); T(b, 24, 40, 170, 'MASTER REJA', 'izoh', { size: 10 }); T(b, 24, 60, 170, c.title || 'Loyiha nomi', 'sarlavha', { size: 34 }); T(b, 24, 92, 170, c.place, 'matn', { size: 13 }); T(b, 24, 262, 170, `${c.author || 'Muallif'}\n${c.date}`, 'izoh', { size: 9 }); return b.p; } },
  { id: 'mr-mundarija', group: TPL_GROUPS[0], name: 'Mundarija', paper: 'A3', landscape: true, build: c => { const b = page('Mundarija', 'A3', true, 'mr-mundarija'); head(b, c, 'Mundarija'); T(b, 20, 50, 240, '01  Muqova\n02  Mundarija\n03  Bosh reja\n04  Tahlil\n05  Texnik-iqtisodiy koʻrsatkichlar\n06  Bosqichlar', 'matn', { size: 16, lh: 1.8 }); T(b, 280, 50, 120, 'Mundarija albom sozlamasida «Mundarija avtomatik» yoqilsa varaq nomlaridan yangilanadi.', 'izoh'); return b.p; } },
  { id: 'mr-bolim', group: TPL_GROUPS[0], name: 'Boʻlim ajratgichi', paper: 'A3', landscape: true, build: c => { const b = page('Boʻlim', 'A3', true, 'mr-bolim'); R(b, 0, 0, 420, 297, '#141414'); T(b, 24, 70, 300, '02', 'raqam', { fill: '#f4f3f1' }); T(b, 24, 120, 300, 'Tahlil', 'sarlavha', { fill: '#f4f3f1', size: 40 }); T(b, 24, 145, 300, c.place, 'izoh', { fill: '#cfccc5' }); return b.p; } },
  { id: 'mr-bosh', group: TPL_GROUPS[0], name: 'Bosh reja + shartli belgilar', paper: 'A3', landscape: true, build: c => { const b = page('Bosh reja', 'A3', true, 'mr-bosh'); head(b, c, 'Bosh reja'); MAP(b, c, 20, 36, 290, 245, 'Bosh reja'); LEG(b, 325, 40); T(b, 325, 240, 80, 'Masshtab va shimol — xarita oynasida.', 'izoh'); return b.p; } },
  { id: 'mr-tahlil4', group: TPL_GROUPS[0], name: 'Tahlil: 4 xarita', paper: 'A3', landscape: true, build: c => { const b = page('Tahlil', 'A3', true, 'mr-tahlil4'); head(b, c, 'Tahlil'); const names = ['Funksiyalar', 'Yashil karkas', 'Harakatlanish', 'Xizmatlar']; names.forEach((n, i) => { const x = 20 + (i % 2) * 195, y = 38 + Math.floor(i / 2) * 128; MAP(b, c, x, y, 185, 112, n); T(b, x, y + 114, 185, `${String(i + 1).padStart(2, '0')}  ${n}`, 'izoh', { size: 9 }); }); return b.p; } },
  { id: 'mr-tik', group: TPL_GROUPS[0], name: 'TIK jadvali + diagramma', paper: 'A3', landscape: true, build: c => {
    const b = page('TIK', 'A3', true, 'mr-tik'); head(b, c, 'Texnik-iqtisodiy koʻrsatkichlar'); TAB(b, 20, 40, 200, tikRows(c), 10);
    const vals = (c.tik ?? []).map(r => Number(String(r[2]).replace(/\s/g, '').replace(',', '.'))).filter(v => Number.isFinite(v) && v > 0).slice(0, 6), mx = Math.max(1, ...vals);
    T(b, 240, 40, 160, 'Diagramma', 'kichik'); (vals.length ? vals : [3, 5, 2, 6]).forEach((v, i) => R(b, 240 + i * 26, 220 - 150 * v / (vals.length ? mx : 6), 18, 150 * v / (vals.length ? mx : 6), ['#f0a35e', '#6fae8e', '#2f6da8', '#e9a3c9', '#8cc47a', '#8fb5d6'][i % 6]));
    LINE(b, 236, 220, 400, 220, 0.3); return b.p; } },
  { id: 'mr-bosqich', group: TPL_GROUPS[0], name: 'Bosqichlar (3 bosqich)', paper: 'A3', landscape: true, build: c => { const b = page('Bosqichlar', 'A3', true, 'mr-bosqich'); head(b, c, 'Amalga oshirish bosqichlari'); ['1-bosqich · 2026–2028', '2-bosqich · 2028–2031', '3-bosqich · 2031–2035'].forEach((n, i) => { const x = 20 + i * 132; MAP(b, c, x, 40, 124, 150, n); T(b, x, 196, 124, n, 'kichik'); T(b, x, 210, 124, 'Bosqich tarkibi: binolar, koʻchalar, ijtimoiy obyektlar.', 'matn', { size: 9 }); }); return b.p; } },
  /* APZ (3) */
  { id: 'apz-vaziyat', group: TPL_GROUPS[1], name: 'Vaziyat sxemasi', paper: 'A3', landscape: false, build: c => { const b = page('Vaziyat sxemasi', 'A3', false, 'apz-vaziyat'); head(b, c, 'Vaziyat sxemasi'); MAP(b, c, 20, 40, 257, 300, 'Vaziyat sxemasi'); T(b, 20, 350, 257, 'Uchastka shahar tuzilmasida: atrof, yoʻllar, uchastka chegarasi. M 1:10 000 – 1:25 000.', 'matn', { size: 10 }); return b.p; } },
  { id: 'apz-shartlar', group: TPL_GROUPS[1], name: 'Topshiriq shartlari', paper: 'A4', landscape: false, build: c => { const b = page('Topshiriq shartlari', 'A4', false, 'apz-shartlar'); head(b, c, 'Arxitektura-rejalash topshirigʻi'); TAB(b, 20, 40, 170, [['Shart', 'Qiymat'], ['Uchastka maydoni', '— ga'], ['Ruxsat etilgan funksiya', '—'], ['Eng koʻp qavat', '—'], ['UMN, eng koʻp', '—'], ['Qizil chiziqdan chekinish', '— m'], ['Avtoturargoh', '— joy'], ['Yashillik', '≥ 25 %']], 10); return b.p; } },
  { id: 'apz-uchastka', group: TPL_GROUPS[1], name: 'Uchastka rejasi (qizil chiziqlar)', paper: 'A3', landscape: true, build: c => { const b = page('Uchastka rejasi', 'A3', true, 'apz-uchastka'); head(b, c, 'Uchastka rejasi'); MAP(b, c, 20, 36, 290, 245, 'Uchastka rejasi'); const e: ChEl = { id: cid(), t: 'line', layer: b.L[1], pts: [[30, 60], [300, 60]], name: 'Qizil chiziq', style: { stroke: '#b3261e', width: 0.6, dash: 'dashdot', risk: true } }; b.p.els.push(e); LEG(b, 325, 40); return b.p; } },
  /* Planshet (3) */
  { id: 'pl-a1', group: TPL_GROUPS[2], name: 'A1 albom: render + diagrammalar', paper: 'A1', landscape: true, build: c => { const b = page('Planshet A1', 'A1', true, 'pl-a1'); T(b, 30, 30, 600, c.title || 'Loyiha nomi', 'sarlavha', { size: 60 }); IMG(b, 30, 70, 520, 330, 'Render'); [0, 1, 2].forEach(i => MAP(b, c, 570 + 0, 70 + i * 112, 240, 104, ['Funksiyalar', 'Harakat', 'Yashil karkas'][i])); T(b, 30, 420, 520, 'Konsepsiya: qisqa matn — gʻoya, ijtimoiy foyda, shahar bilan bogʻlanish.', 'matn', { size: 18 }); TAB(b, 570, 420, 240, tikRows(c), 14); return b.p; } },
  { id: 'pl-a0', group: TPL_GROUPS[2], name: 'A0 portret: master reja', paper: 'A0', landscape: false, build: c => { const b = page('Planshet A0', 'A0', false, 'pl-a0'); T(b, 40, 40, 700, c.title || 'Master reja', 'sarlavha', { size: 80 }); T(b, 40, 80, 700, c.place, 'matn', { size: 24 }); MAP(b, c, 40, 110, 761, 760, 'Bosh reja'); LEG(b, 40, 900); TAB(b, 400, 900, 400, tikRows(c), 18); return b.p; } },
  { id: 'pl-konkurs', group: TPL_GROUPS[2], name: 'Konkurs plansheti A1 (shifr bilan)', paper: 'A1', landscape: false, build: c => { const b = page('Konkurs', 'A1', false, 'pl-konkurs'); R(b, 474, 20, 100, 40, '#141414'); T(b, 480, 30, 90, 'SHIFR\n000000', 'izoh', { fill: '#ffffff', size: 14 }); T(b, 20, 40, 430, c.title || 'Konkurs loyihasi', 'sarlavha', { size: 44 }); MAP(b, c, 20, 80, 554, 420, 'Bosh reja'); IMG(b, 20, 515, 270, 200, 'Render'); IMG(b, 304, 515, 270, 200, 'Render'); T(b, 20, 730, 554, 'Izohlovchi matn (muallif nomi koʻrsatilmaydi).', 'matn', { size: 14 }); return b.p; } },
  /* Portfolio (5) */
  { id: 'pf-muqova', group: TPL_GROUPS[3], name: 'Muqova', paper: 'A4', landscape: true, build: c => { const b = page('Portfolio', 'A4', true, 'pf-muqova'); IMG(b, 0, 0, 297, 150, 'Muqova rasmi'); T(b, 16, 165, 260, c.author || 'Ism Familiya', 'sarlavha', { size: 26 }); T(b, 16, 182, 260, `Portfolio · ${c.date.slice(-4)}`, 'izoh', { size: 10 }); return b.p; } },
  { id: 'pf-katta', group: TPL_GROUPS[3], name: 'Katta rasm + matn', paper: 'A4', landscape: true, build: c => { const b = page('Loyiha', 'A4', true, 'pf-katta'); IMG(b, 0, 0, 190, 210, 'Rasm'); T(b, 202, 20, 82, c.title || 'Loyiha nomi', 'sarlavha', { size: 18 }); T(b, 202, 42, 82, `${c.place}\n${c.date}`, 'izoh'); T(b, 202, 62, 82, 'Loyiha haqida qisqa matn: vazifa, yechim, natija.', 'matn', { size: 10 }); return b.p; } },
  { id: 'pf-tor', group: TPL_GROUPS[3], name: '4 rasm toʻri', paper: 'A4', landscape: true, build: () => { const b = page('4 rasm', 'A4', true, 'pf-tor'); [0, 1, 2, 3].forEach(i => IMG(b, 12 + (i % 2) * 140, 12 + Math.floor(i / 2) * 96, 133, 89, `Rasm ${i + 1}`)); return b.p; } },
  { id: 'pf-yoyma', group: TPL_GROUPS[3], name: 'Toʻliq rasm (yoyma)', paper: 'A4', landscape: true, build: () => { const b = page('Yoyma', 'A4', true, 'pf-yoyma'); IMG(b, 0, 0, 297, 210, 'Toʻliq rasm'); return b.p; } },
  { id: 'pf-men', group: TPL_GROUPS[3], name: 'Men haqimda', paper: 'A4', landscape: true, build: c => { const b = page('Men haqimda', 'A4', true, 'pf-men'); IMG(b, 16, 16, 80, 100, 'Portret'); T(b, 110, 20, 170, c.author || 'Ism Familiya', 'sarlavha', { size: 22 }); T(b, 110, 40, 170, 'Urbanist · arxitektor', 'izoh', { size: 10 }); T(b, 110, 56, 170, 'Taʼlim, tajriba, loyihalar va mukofotlar.', 'matn', { size: 10 }); return b.p; } },
  /* Xalqaro fond hisoboti (6) */
  { id: 'xf-muqova', group: TPL_GROUPS[4], name: 'Muqova', paper: 'A4', landscape: false, build: c => { const b = page('Muqova', 'A4', false, 'xf-muqova'); R(b, 0, 0, 210, 120, '#2f6da8'); T(b, 16, 40, 180, c.title || 'Report title', 'sarlavha', { fill: '#ffffff', size: 28 }); T(b, 16, 100, 180, c.place, 'matn', { fill: '#ffffff' }); IMG(b, 0, 120, 210, 130, 'Rasm'); T(b, 16, 270, 180, c.date, 'izoh'); return b.p; } },
  { id: 'xf-mundarija', group: TPL_GROUPS[4], name: 'Mundarija va qisqartmalar', paper: 'A4', landscape: false, build: c => { const b = page('Mundarija', 'A4', false, 'xf-mundarija'); head(b, c, 'Mundarija', ''); T(b, 20, 44, 170, '1. Asosiy xulosa\n2. Kontekst\n3. Tahlil\n4. Takliflar\n5. Ilovalar', 'matn', { size: 12, lh: 1.8 }); T(b, 20, 140, 170, 'Qisqartmalar', 'kichik'); TAB(b, 20, 152, 170, [['Qisqartma', 'Maʼnosi'], ['ShNQ', 'Shaharsozlik normalari va qoidalari'], ['UMN', 'Umumiy maydon nisbati'], ['TIK', 'Texnik-iqtisodiy koʻrsatkichlar']], 9); return b.p; } },
  { id: 'xf-xulosa', group: TPL_GROUPS[4], name: 'Asosiy xulosa', paper: 'A4', landscape: false, build: c => { const b = page('Asosiy xulosa', 'A4', false, 'xf-xulosa'); head(b, c, 'Asosiy xulosa', ''); R(b, 20, 40, 170, 40, '#eef3f9'); T(b, 26, 48, 158, 'Asosiy fikr: bitta jumlada loyihaning ahamiyati.', 'matn', { size: 13, bold: true }); T(b, 20, 92, 170, '• Birinchi xulosa\n• Ikkinchi xulosa\n• Uchinchi xulosa', 'matn', { size: 11, lh: 1.7 }); return b.p; } },
  { id: 'xf-bob', group: TPL_GROUPS[4], name: 'Bob boshlanishi + rasm', paper: 'A4', landscape: false, build: () => { const b = page('Bob', 'A4', false, 'xf-bob'); IMG(b, 0, 0, 210, 150, 'Rasm'); T(b, 16, 166, 180, '2', 'raqam', { size: 60 }); T(b, 16, 196, 180, 'Kontekst', 'sarlavha', { size: 26 }); return b.p; } },
  { id: 'xf-jadval', group: TPL_GROUPS[4], name: 'Jadval sahifasi', paper: 'A4', landscape: false, build: c => { const b = page('Jadval', 'A4', false, 'xf-jadval'); head(b, c, 'Jadval', ''); TAB(b, 20, 40, 170, tikRows(c), 9); return b.p; } },
  { id: 'xf-xarita', group: TPL_GROUPS[4], name: 'Xarita sahifasi', paper: 'A4', landscape: false, build: c => { const b = page('Xarita', 'A4', false, 'xf-xarita'); head(b, c, 'Xarita', ''); MAP(b, c, 20, 40, 170, 190, 'Xarita'); LEG(b, 20, 240); return b.p; } },
];

/** Tahlil diagrammasi namunasi (yangi boʻsh varaqqa emas — «Harakat va yashil karkas» misoli, testlar va namuna uchun) */
export function demoDiagram(p: ChPage): ChPage {
  const [W, H] = pageSize(p), L = p.layers.map(l => l.id), b: B = { p, L };
  ZONE(b, [[W * 0.2, H * 0.4], [W * 0.35, H * 0.3], [W * 0.42, H * 0.5], [W * 0.3, H * 0.62]], '#8cc47a', 'Yashil zona');
  ZONE(b, [[W * 0.5, H * 0.55], [W * 0.62, H * 0.5], [W * 0.66, H * 0.66], [W * 0.54, H * 0.7]], '#e9a3c9', 'Markaz');
  FLOW(b, [[W * 0.1, H * 0.8], [W * 0.4, H * 0.6], [W * 0.75, H * 0.35]], '#f0a35e', 7, 'Asosiy oqim', 'lenta');
  FLOW(b, [[W * 0.3, H * 0.15], [W * 0.33, H * 0.5], [W * 0.4, H * 0.85]], '#6fae8e', 5, 'Yashil koridor');
  LEG(b, W * 0.8, H * 0.2);
  return p;
}
