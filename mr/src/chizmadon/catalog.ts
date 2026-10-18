/**
 * Chizmadon kutubxonasi — eski Albomdan (maket.html, js/shablonlar.js; inventar claude/chizmadon-eski-albom.md):
 * yoʻnalish oʻqi (7), zona (7), harakatlanish ierarxiyasi (8), chiziq turlari (6), belgilar (6 guruh, 45),
 * Toshkent daraxtlari (12), kartografik palitralar (8), shriftlar (6). Belgilar — 24 × 24, chiziq 1,75 (DS-05 uslubi).
 */
import type { ChStyle, Dash, FlowBand } from './model';

export interface FlowPreset { id: string; name: string; style: ChStyle }
export const FLOWS: FlowPreset[] = [
  { id: 'asosiy', name: 'Asosiy oqim', style: { stroke: '#f0a35e', width: 7, band: 'lenta', head: 'end', smooth: true, opacity: 0.85 } },
  { id: 'yashil', name: 'Yashil koridor', style: { stroke: '#6fae8e', width: 6, band: 'toliq', head: 'none', smooth: true, opacity: 0.85 } },
  { id: 'transport', name: 'Transport', style: { stroke: '#2f6da8', width: 5, band: 'toliq', head: 'end', smooth: true, opacity: 0.9 } },
  { id: 'piyoda', name: 'Piyoda', style: { stroke: '#e0574f', width: 3, band: 'toliq', head: 'end', smooth: true, opacity: 0.9 } },
  { id: 'aloqa', name: 'Aloqa', style: { stroke: '#2f7a5a', width: 2.2, band: 'nuqta', head: 'both', smooth: true, opacity: 1 } },
  { id: 'velo', name: 'Velo', style: { stroke: '#d0502a', width: 2, band: 'punktir', head: 'end', smooth: true, opacity: 1 } },
  { id: 'kontur', name: 'Kontur oʻq', style: { stroke: '#1d1d1b', width: 3, band: 'kontur', head: 'end', smooth: true, opacity: 1 } },
];
export const BANDS: { id: FlowBand; name: string }[] = [
  { id: 'lenta', name: 'Lenta' }, { id: 'toliq', name: 'Toʻliq' }, { id: 'kontur', name: 'Kontur' }, { id: 'nuqta', name: 'Nuqta' }, { id: 'punktir', name: 'Punktir' },
];

export interface ZonePreset { id: string; name: string; fill: string }
export const ZONES: ZonePreset[] = [
  { id: 'yashil', name: 'Yashil zona', fill: '#8cc47a' }, { id: 'markaz', name: 'Markaz', fill: '#e9a3c9' }, { id: 'ish', name: 'Ish / innovatsiya', fill: '#8fb5d6' },
  { id: 'talim', name: 'Taʼlim', fill: '#f2c96d' }, { id: 'suv', name: 'Suv', fill: '#7fc4e0' }, { id: 'turar', name: 'Turar joy', fill: '#f3d9a4' }, { id: 'fon', name: 'Kulrang fon', fill: '#c8c6c1' },
];

export interface MobPreset { id: string; name: string; style: ChStyle }
export const MOBILITY: MobPreset[] = [
  { id: 'asosiy', name: 'Asosiy yoʻl', style: { stroke: '#1f4e79', width: 2.2, dash: 'solid', deco: 'casing' } },
  { id: 'ikkinchi', name: 'Ikkinchi darajali yoʻl', style: { stroke: '#2f7a5a', width: 1.4, dash: 'solid' } },
  { id: 'mahalliy', name: 'Mahalliy koʻcha', style: { stroke: '#b9b5ad', width: 0.8, dash: 'solid' } },
  { id: 'temir', name: 'Temir yoʻl', style: { stroke: '#4a4a48', width: 0.6, dash: 'solid', deco: 'rail' } },
  { id: 'metro', name: 'Metro liniyasi', style: { stroke: '#2f6da8', width: 1.2, dash: 'dash', deco: 'stations' } },
  { id: 'avtobus', name: 'Avtobus yoʻnalishi', style: { stroke: '#d98a1f', width: 1, dash: 'long' } },
  { id: 'velo', name: 'Velo yoʻlak', style: { stroke: '#2fa36b', width: 0.8, dash: 'dash' } },
  { id: 'piyoda', name: 'Piyoda yoʻlak', style: { stroke: '#e0574f', width: 0.7, dash: 'dot' } },
];

export const DASHES: { id: Dash; name: string }[] = [
  { id: 'solid', name: 'Uzluksiz' }, { id: 'dash', name: 'Shtrix' }, { id: 'long', name: 'Uzun shtrix' }, { id: 'dot', name: 'Nuqta' }, { id: 'dashdot', name: 'Shtrix-punktir' }, { id: 'dash2dot', name: 'Shtrix-2 punktir' },
];
/** chiziq turi → stroke-dasharray (qalinlikka nisbatan) */
export function dashArray(d: Dash | undefined, w: number): string {
  const u = Math.max(0.3, w);
  switch (d) {
    case 'dash': return `${3 * u} ${2 * u}`;
    case 'long': return `${7 * u} ${2.5 * u}`;
    case 'dot': return `0 ${2.2 * u}`;
    case 'dashdot': return `${5 * u} ${1.6 * u} 0 ${1.6 * u}`;
    case 'dash2dot': return `${5 * u} ${1.5 * u} 0 ${1.5 * u} 0 ${1.5 * u}`;
    default: return '';
  }
}

/* ---------- belgilar: 6 guruh, 45 ---------- */
export interface Icon { id: string; name: string; d: string; risk?: boolean }
export const ICON_GROUPS: { id: string; name: string; icons: Icon[] }[] = [
  { id: 'transport', name: 'Transport', icons: [
    { id: 'avtobus', name: 'Avtobus', d: 'M6 4h12a2 2 0 0 1 2 2v10H4V6a2 2 0 0 1 2-2zM4 11h16M7 19v-3M17 19v-3M8 14h.01M16 14h.01' },
    { id: 'metro', name: 'Metro', d: 'M5 19V6l7 8 7-8v13' },
    { id: 'tramvay', name: 'Tramvay', d: 'M7 7h10v10H7zM9 4h6M12 4v3M8 20l2-3M16 20l-2-3M7 12h10' },
    { id: 'velo', name: 'Velo', d: 'M6 13a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7M18 13a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7M6 16.5l4-7h5l3 7M10 9.5L8.5 6H7M14 6h2' },
    { id: 'turargoh', name: 'Avtoturargoh', d: 'M5 3h14v18H5zM10 17V7h3a3 3 0 0 1 0 6h-3' },
    { id: 'piyoda', name: 'Piyoda', d: 'M12 3.5a1.5 1.5 0 1 0 0 3a1.5 1.5 0 1 0 0-3M10 21l2-6 3 3v3M9 12l3-4 4 3M12 8l-1 5' },
    { id: 'zaryad', name: 'Zaryadlash', d: 'M6 4h8v16H6zM14 9h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V8l-2-2M11 8l-2 4h3l-2 4' },
    { id: 'taksi', name: 'Taksi', d: 'M5 11l2-5h10l2 5M4 11h16v6H4zM7 17v2M17 17v2M7.5 14h.01M16.5 14h.01M10 4h4' },
  ] },
  { id: 'ijtimoiy', name: 'Ijtimoiy', icons: [
    { id: 'maktab', name: 'Maktab', d: 'M3 9l9-5 9 5-9 5zM7 11v5c3 2 7 2 10 0v-5M21 9v6' },
    { id: 'bogcha', name: 'Bogʻcha', d: 'M12 4a2 2 0 1 0 0 4a2 2 0 1 0 0-4M8 21v-6l-3-3 3-3h8l3 3-3 3v6M12 9v12' },
    { id: 'poliklinika', name: 'Poliklinika', d: 'M4 4h16v16H4zM12 8v8M8 12h8' },
    { id: 'kasalxona', name: 'Kasalxona', d: 'M3 21V9l9-5 9 5v12zM12 10v6M9 13h6M9 21v-3h6v3' },
    { id: 'kutubxona', name: 'Kutubxona', d: 'M4 5h5v15H4zM9 5h5v15H9zM15 6l4-1 3 14-4 1z' },
    { id: 'masjid', name: 'Masjid', d: 'M6 21v-8a6 6 0 0 1 12 0v8zM3 21h18M12 4v3M4 21V9M20 21V9M10 21v-4a2 2 0 0 1 4 0v4' },
    { id: 'sport', name: 'Sport', d: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M5 6c3 3 3 9 0 12M19 6c-3 3-3 9 0 12' },
    { id: 'madaniyat', name: 'Madaniyat', d: 'M3 9l9-5 9 5M5 9v9M9 9v9M15 9v9M19 9v9M3 21h18M3 18h18' },
  ] },
  { id: 'tijorat', name: 'Tijorat va ish', icons: [
    { id: 'dokon', name: 'Doʻkon', d: 'M5 8h14l-1 12H6zM9 8a3 3 0 0 1 6 0' },
    { id: 'bozor', name: 'Bozor', d: 'M3 9l2-5h14l2 5zM3 9a3 3 0 0 0 6 0a3 3 0 0 0 6 0a3 3 0 0 0 6 0M5 12v8h14v-8M10 20v-4h4v4' },
    { id: 'ofis', name: 'Ofis', d: 'M5 21V4h10v17M15 9h4v12M3 21h18M8 8h4M8 12h4M8 16h4' },
    { id: 'kafe', name: 'Kafe', d: 'M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3v3M11 3v3M14 3v3' },
    { id: 'mehmonxona', name: 'Mehmonxona', d: 'M3 19V8M3 15h18v4M21 15v-3a3 3 0 0 0-3-3h-7v6M7 12a1.5 1.5 0 1 0 0-.1' },
    { id: 'sanoat', name: 'Sanoat', d: 'M3 21V11l5 3V11l5 3V11l5 3V4h3v17zM7 18h2M12 18h2' },
    { id: 'bank', name: 'Bank', d: 'M3 9l9-5 9 5zM5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18' },
  ] },
  { id: 'tabiat', name: 'Tabiat va iqlim', icons: [
    { id: 'daraxt', name: 'Daraxt', d: 'M12 3a6 6 0 0 0-4 10.5A4 4 0 0 0 12 17a4 4 0 0 0 4-3.5A6 6 0 0 0 12 3zM12 12v9' },
    { id: 'park', name: 'Park', d: 'M8 4a4 4 0 0 0-2 7.5V13h4v-1.5A4 4 0 0 0 8 4zM8 13v7M16 8a3 3 0 0 0-1.5 5.6V15h3v-1.4A3 3 0 0 0 16 8zM16 15v5M3 20h18' },
    { id: 'suv', name: 'Suv', d: 'M3 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 14c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 19c2-2 4-2 6 0s4 2 6 0 4-2 6 0' },
    { id: 'issiqlik', name: 'Issiqlik oroli', d: 'M12 3v11a3.5 3.5 0 1 0 .1 0M12 3a2 2 0 0 1 2 2v9M17 6h3M17 9h3M17 12h2', risk: true },
    { id: 'suvbosish', name: 'Suv bosish xavfi', d: 'M12 3l7 11a7 7 0 1 1-14 0zM9 15c1-1 2-1 3 0s2 1 3 0', risk: true },
    { id: 'shamol', name: 'Shamol', d: 'M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h7' },
    { id: 'quyosh', name: 'Quyosh', d: 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4' },
  ] },
  { id: 'odamlar', name: 'Odamlar va jamoat joyi', icons: [
    { id: 'odamlar', name: 'Odamlar', d: 'M9 4a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5M4 20v-4a5 5 0 0 1 10 0v4M16 5a2.5 2.5 0 0 1 0 5M17 13a4 4 0 0 1 3 4v3' },
    { id: 'oila', name: 'Oila', d: 'M7 4a2 2 0 1 0 0 4a2 2 0 1 0 0-4M17 4a2 2 0 1 0 0 4a2 2 0 1 0 0-4M12 11a1.5 1.5 0 1 0 0 3a1.5 1.5 0 1 0 0-3M4 20v-7a3 3 0 0 1 6 0v7M14 20v-7a3 3 0 0 1 6 0v7M10.5 20v-3h3v3' },
    { id: 'bolalar', name: 'Bolalar maydonchasi', d: 'M4 21V7l4-3 4 3v14M4 11h8M12 9l8 8M18 21h3M14 21h2' },
    { id: 'maydon', name: 'Maydon', d: 'M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10' },
    { id: 'tadbir', name: 'Tadbir', d: 'M4 20V9l8-5 8 5v11M4 13h16M9 20v-4h6v4M12 4v3' },
    { id: 'xavfsizlik', name: 'Xavfsizlik', d: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4' },
    { id: 'imkoniyat', name: 'Imkoniyati cheklangan', d: 'M11 3.5a1.5 1.5 0 1 0 0 3a1.5 1.5 0 1 0 0-3M11 8v6h5l2 5M11 11h5M8 12a5 5 0 1 0 7 6' },
  ] },
  { id: 'sxema', name: 'Sxema belgilari', icons: [
    { id: 'meros', name: 'Tarixiy meros', d: 'M4 21h16M6 21V10M10 21V10M14 21V10M18 21V10M3 10h18M12 3l9 5H3z' },
    { id: 'diqqat', name: 'Diqqat nuqtasi', d: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8M12 11.5v1' },
    { id: 'yulduz', name: 'Yulduz', d: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z' },
    { id: 'nuqta', name: 'Nuqta', d: 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8' },
    { id: 'kirish', name: 'Kirish', d: 'M14 4h5v16h-5M3 12h11M10 8l4 4-4 4' },
    { id: 'chiqish', name: 'Chiqish', d: 'M10 4H5v16h5M10 12h11M17 8l4 4-4 4' },
    { id: 'shimol', name: 'Shimol', d: 'M12 3l6 18-6-5-6 5zM12 3v13' },
    { id: 'ogoh', name: 'Ogohlantirish', d: 'M12 3l10 18H2zM12 10v5M12 18h.01', risk: true },
  ] },
];
export const ICONS: Icon[] = ICON_GROUPS.flatMap(g => g.icons);
export const iconById = (id?: string) => ICONS.find(i => i.id === id) ?? ICONS[0];
export const LOOKS: { id: 'doira' | 'pin' | 'belgi' | 'tolqin'; name: string }[] = [
  { id: 'doira', name: 'Kontur doira' }, { id: 'pin', name: 'Xarita belgisi' }, { id: 'belgi', name: 'Faqat belgi' }, { id: 'tolqin', name: 'Toʻlqin' },
];

/* ---------- Toshkent daraxtlari (12) ---------- */
export type Crown = 'round' | 'oval' | 'column' | 'umbrella' | 'cone' | 'spread';
export interface Tree { id: string; name: string; latin: string; h: string; role: string; crown: Crown; color: string }
export const TREES: Tree[] = [
  { id: 'chinor', name: 'Chinor', latin: 'Platanus orientalis', h: '≤ 30 m', role: 'soya, belgi daraxti', crown: 'spread', color: '#6d9a5b' },
  { id: 'qayragoch', name: 'Qayragʻoch', latin: 'Ulmus pumila', h: '≤ 25 m', role: 'koʻcha qatori', crown: 'round', color: '#7aa363' },
  { id: 'gledichiya', name: 'Gledichiya', latin: 'Gleditsia triacanthos', h: '20–30 m', role: 'yengil soya', crown: 'umbrella', color: '#9cbf86' },
  { id: 'bolle', name: 'Bolle teragi', latin: 'Populus alba ‘Pyramidalis’', h: '15–30 m', role: 'vertikal chegara', crown: 'column', color: '#7f9f6a' },
  { id: 'shumtol', name: 'Shumtol', latin: 'Fraxinus pennsylvanica', h: '12–25 m', role: 'koʻcha qatori', crown: 'oval', color: '#6f9a5e' },
  { id: 'sofora', name: 'Sofora', latin: 'Styphnolobium japonicum', h: '10–20 m', role: 'koʻcha, hovli', crown: 'round', color: '#83a96d' },
  { id: 'biota', name: 'Sharq biotasi', latin: 'Platycladus orientalis', h: '5–15 m', role: 'doimiy yashil', crown: 'cone', color: '#4f7d52' },
  { id: 'tut', name: 'Tut', latin: 'Morus alba', h: '8–15 m', role: 'soya, hovli', crown: 'round', color: '#7da567' },
  { id: 'yahudo', name: 'Yahudo daraxti', latin: 'Cercis siliquastrum', h: '6–10 m', role: 'manzarali', crown: 'umbrella', color: '#b98aa6' },
  { id: 'katalpa', name: 'Katalpa', latin: 'Catalpa bignonioides', h: '10–15 m', role: 'soya', crown: 'spread', color: '#8cb072' },
  { id: 'jiyda', name: 'Jiyda', latin: 'Elaeagnus angustifolia', h: '5–10 m', role: 'shoʻrga chidamli', crown: 'spread', color: '#a7b79a' },
  { id: 'orik', name: 'Oʻrik', latin: 'Prunus armeniaca', h: '5–10 m', role: 'mevali, hovli', crown: 'round', color: '#8fb36f' },
];
export const treeById = (id?: string) => TREES.find(t => t.id === id) ?? TREES[0];

/* ---------- palitralar (8) ---------- */
export interface Palette { id: string; name: string; colors: string[] }
export const PALETTES: Palette[] = [
  { id: 'asosiy', name: 'Asosiy', colors: ['#f0a35e', '#6fae8e', '#2f6da8', '#e0574f', '#8cc47a', '#e9a3c9', '#8fb5d6'] },
  { id: 'neytral', name: 'Neytral asos', colors: ['#3c3b38', '#6b6965', '#8f8c86', '#b3b0a9', '#cfccc5', '#e2e0db', '#f2f1ee'] },
  { id: 'kok', name: 'Ketma-ket · koʻk', colors: ['#eff6fc', '#cfe3f3', '#a5c9e6', '#73a8d4', '#4a86bd', '#2c66a0', '#174679'] },
  { id: 'yashil', name: 'Ketma-ket · yashil', colors: ['#f1f8ec', '#d6ebc9', '#b2d9a0', '#86c178', '#5ea45a', '#3f8442', '#25622e'] },
  { id: 'divergent', name: 'Divergent', colors: ['#2c66a0', '#73a8d4', '#cfe3f3', '#f2f1ee', '#f6d3b5', '#e8955b', '#b8502a'] },
  { id: 'issiqlik', name: 'Issiqlik / xavf', colors: ['#fff3c4', '#ffd98a', '#fbb15b', '#f2823a', '#dd5128', '#b3261e', '#7a1712'] },
  { id: 'yer', name: 'Yer foydalanish', colors: ['#f3d9a4', '#e9b98f', '#e9a3c9', '#8fb5d6', '#8cc47a', '#c9b8e3', '#b9b5ad'] },
  { id: 'figura', name: 'Figura-fon', colors: ['#141414', '#3c3b38', '#ffffff', '#e7e6e2', '#b3b0a9', '#e0574f', '#2f6da8'] },
];
export const paletteById = (id?: string) => PALETTES.find(p => p.id === id) ?? PALETTES[0];

export const FONTS = ['Archivo', 'IBM Plex Sans', 'IBM Plex Mono', 'Instrument Serif', 'Golos Text', 'PT Serif'];
export const TEXT_KINDS: { id: NonNullable<ChStyle['kind']>; name: string; size: number; bold: boolean; font: string }[] = [
  { id: 'sarlavha', name: 'Sarlavha', size: 28, bold: true, font: 'Archivo' },
  { id: 'matn', name: 'Matn', size: 11, bold: false, font: 'Archivo' },
  { id: 'izoh', name: 'Izoh', size: 8, bold: false, font: 'IBM Plex Mono' },
  { id: 'raqam', name: 'Raqam', size: 40, bold: true, font: 'Archivo' },
];

/* ---------- asboblar (14) ---------- */
export type Tool = 'select' | 'text' | 'line' | 'arrow' | 'pen' | 'rect' | 'ellipse' | 'poly' | 'flow' | 'zone' | 'icon' | 'row' | 'image' | 'map';
export const TOOLS: { id: Tool; name: string; key: string; d: string }[] = [
  { id: 'select', name: 'Tanlash', key: 'V', d: 'M5 3l14 8-6 2-3 6z' },
  { id: 'text', name: 'Matn', key: 'T', d: 'M5 5h14M12 5v14M9 19h6' },
  { id: 'line', name: 'Chiziq', key: 'L', d: 'M5 19L19 5' },
  { id: 'arrow', name: 'Oʻq chiziq', key: 'A', d: 'M5 19L19 5M11 5h8v8' },
  { id: 'pen', name: 'Erkin chizish', key: 'P', d: 'M4 17c3-6 5 2 8-4s4-7 8-6' },
  { id: 'rect', name: 'Toʻrtburchak', key: 'R', d: 'M4 6h16v12H4z' },
  { id: 'ellipse', name: 'Ellips', key: 'E', d: 'M12 6c5 0 9 2.7 9 6s-4 6-9 6-9-2.7-9-6 4-6 9-6z' },
  { id: 'poly', name: 'Koʻpburchak', key: 'G', d: 'M12 3l8 6-3 10H7L4 9z' },
  { id: 'flow', name: 'Yoʻnalish oʻqi', key: 'F', d: 'M3 18c5-1 8-6 13-8M13 6l5 3-3 5' },
  { id: 'zone', name: 'Zona — yumshoq dogʻ', key: 'Z', d: 'M6 8c3-4 9-4 12 0s2 9-3 10-12-1-11-5 0-3 2-5z' },
  { id: 'icon', name: 'Belgi / piktogramma', key: 'K', d: 'M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11zM12 7.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5' },
  { id: 'row', name: 'Daraxtlar / odamlar qatori', key: 'Q', d: 'M5 9a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5M12 9a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5M19 9a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5M5 14v4M12 14v4M19 14v4' },
  { id: 'image', name: 'Rasm', key: 'I', d: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 8.5h.01' },
  { id: 'map', name: 'Xarita oynasi', key: 'M', d: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14' },
];
