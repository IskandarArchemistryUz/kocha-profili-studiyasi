/**
 * «Fasad va tom» paneli (dizayn: «Fasad va tom · B — Sozlamalar roʻyxati»):
 * bitta ikonka tili (fasad koʻrinishi, 24 × 24, pastda pol chizigʻi), jonli fasad koʻrinishi va tanlov roʻyxatlari.
 */
import type { Win, Bal } from '../core/facade';
import type { Mat, Roof } from '../core/roof';
import type { Shade } from '../core/doc';

const F = 'M3 21h18M5 21V5h14v16';
export type RoofShape = 'tekis' | 'ikki' | 'tort' | 'bir';
export type RoofCover = 'oddiy' | 'yashil' | 'quyosh';

export const MAT_LOOK: Record<Mat, { c: string; pat: string }> = {
  suvoq: { c: '#efe9df', pat: '' }, gisht: { c: '#c4704f', pat: 'brick' }, beton: { c: '#cfcdc7', pat: 'panel' }, tosh: { c: '#e3d4b8', pat: 'stone' },
  yogoch: { c: '#c69a6a', pat: 'wood' }, metall: { c: '#a6adb4', pat: 'metal' }, shisha: { c: '#b9d3e0', pat: 'glass' }, terrakota: { c: '#d9845a', pat: 'terra' },
};
export const WIN_OPTS: { id: Win | 'yoq'; n: string; d: string }[] = [
  { id: 'yoq', n: 'Koʻrsatilmaydi', d: F },
  { id: 'klassik', n: 'Klassik', d: F + 'M7 8h4v6H7zM13 8h4v6h-4z' },
  { id: 'kvadrat', n: 'Kichik kvadrat', d: F + 'M7.5 9h3v3h-3zM13.5 9h3v3h-3z' },
  { id: 'fransuz', n: 'Fransuz', d: F + 'M8 7h3v14H8zM13 7h3v14h-3z' },
  { id: 'ravoq', n: 'Ravoqli', d: F + 'M9 17v-5a3 3 0 0 1 6 0v5z' },
  { id: 'lenta', n: 'Lenta', d: F + 'M5 10h14v4H5z' },
  { id: 'panorama', n: 'Panorama', d: F + 'M6 7h12v11H6zM12 7v11' },
];
export const BAL_OPTS: { id: Bal; n: string; d: string }[] = [
  { id: 'yoq', n: 'Yoʻq', d: F + 'M9 8h6v8H9z' },
  { id: 'ochiq', n: 'Ochiq', d: F + 'M9 6h6v7H9zM3 15h18M3 15v4M21 15v4M8 15v4M12 15v4M16 15v4' },
  { id: 'shisha', n: 'Shisha toʻsiqli', d: F + 'M9 6h6v7H9zM3 15h18v4H3zM6 18l2-2' },
  { id: 'lodjiya', n: 'Lodjiya', d: F + 'M8 21V8h8v13M8 16h8' },
  { id: 'fransuz', n: 'Fransuz balkoni', d: F + 'M9 6h6v15M12 6v15M8 14h8v4H8z' },
  { id: 'uzluksiz', n: 'Uzluksiz terrasa', d: 'M1 21h22M5 21V5h14v16M9 6h6v7H9zM1 15h22M1 15v4M23 15v4M6 15v4M11 15v4M16 15v4' },
];
export const SHAPE_OPTS: { id: RoofShape; n: string; d: string }[] = [
  { id: 'tekis', n: 'Tekis', d: 'M3 21h18M5 21V9h14v12M4 9h16' },
  { id: 'ikki', n: 'Ikki nishabli', d: 'M3 21h18M5 21V11l7-6 7 6v10' },
  { id: 'tort', n: 'Toʻrt nishabli', d: 'M3 21h18M5 21V12l4-5h6l4 5v9' },
  { id: 'bir', n: 'Bir nishabli', d: 'M3 21h18M5 21V12l14-6v15' },
];
export const COVER_OPTS: { id: RoofCover; n: string; d: string }[] = [
  { id: 'oddiy', n: 'Oddiy', d: 'M4 15l8-7 8 7M6 13v6h12v-6' },
  { id: 'yashil', n: 'Yashil', d: 'M12 21v-6M12 15c-4 0-6-3-6-6a6 6 0 0 1 12 0c0 3-2 6-6 6z' },
  { id: 'quyosh', n: 'Quyosh paneli', d: 'M4 17l3-8h14l-3 8zM9.5 9l-2 8M14.5 9l-2 8M5.5 13h14' },
];
export const PARAPET_OPTS: { v: number; n: string; d: string }[] = [
  { v: 0, n: 'Yoʻq', d: 'M3 21h18M5 21V9h14v12' },
  { v: 0.6, n: '0,6 m', d: 'M3 21h18M5 21V10h14v11M4 10V8.5h16V10' },
  { v: 1, n: '1,0 m', d: 'M3 21h18M5 21V10h14v11M4 10V7.5h16V10' },
  { v: 1.2, n: '1,2 m', d: 'M3 21h18M5 21V10h14v11M4 10V6.5h16V10' },
];
export const SHADE_OPTS: { id: Shade | 'yoq'; n: string; note: string; d: string }[] = [
  { id: 'yoq', n: 'Yoʻq', note: '', d: F + 'M8 8h3v4H8zM13 8h3v4h-3z' },
  { id: 'avto', n: 'Avtomatik', note: 'janub — naves, sharq/gʻarb — lamellar', d: F + 'M8 8h3v4H8zM13 8h3v4h-3zM7 7h5M12 7h5M8 13v3M16 13v3' },
  { id: 'gorizontal', n: 'Naves', note: 'har qavat ustida, 0,7 m', d: F + 'M8 9h3v4H8zM13 9h3v4h-3zM3 8h18' },
  { id: 'vertikal', n: 'Lamellar', note: '1,65 m qadam, 0,55 m', d: F + 'M8 5v16M12 5v16M16 5v16' },
  { id: 'panjara', n: 'Panjara', note: 'mashrabiya, fasaddan 0,35 m', d: F + 'M7 7h10v12H7zM7 11h10M7 15h10M10.5 7v12M13.5 7v12' },
];

export const roofShape = (r: Roof | undefined): RoofShape => r === 'ikki' || r === 'tort' || r === 'bir' ? r : 'tekis';
export const roofCover = (r: Roof | undefined): RoofCover => r === 'yashil' || r === 'quyosh' ? r : 'oddiy';
/** shakl + qoplama → hujjatdagi tom turi (qoplama faqat tekis tomda) */
export const roofOf = (s: RoofShape, c: RoofCover): Roof => s !== 'tekis' ? s : c === 'oddiy' ? 'tekis' : c;

/** Material namunasi (kichik SVG) */
export function matSwatch(m: Mat, w = 40, h = 26): string {
  const L = MAT_LOOK[m];
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${PATTERNS}<rect width="${w}" height="${h}" fill="${L.c}"/>${L.pat ? `<rect width="${w}" height="${h}" fill="url(#fp-${L.pat})"/>` : ''}</svg>`;
}

const PATTERNS = `<defs>
<pattern id="fp-brick" width="12" height="8" patternUnits="userSpaceOnUse"><path d="M0 .5H12M0 4.5H12M3 .5V4.5M9 4.5V8.5" stroke="rgba(0,0,0,.2)" stroke-width=".7" fill="none"/></pattern>
<pattern id="fp-panel" width="30" height="24" patternUnits="userSpaceOnUse"><path d="M.5 0V24M0 .5H30" stroke="rgba(0,0,0,.14)" stroke-width=".8" fill="none"/></pattern>
<pattern id="fp-stone" width="18" height="10" patternUnits="userSpaceOnUse"><path d="M0 .5H18M0 5.5H18M6 .5V5.5M13 5.5V10.5" stroke="rgba(0,0,0,.16)" stroke-width=".7" fill="none"/></pattern>
<pattern id="fp-wood" width="6" height="10" patternUnits="userSpaceOnUse"><path d="M.5 0V10" stroke="rgba(0,0,0,.18)" stroke-width=".8" fill="none"/></pattern>
<pattern id="fp-metal" width="4" height="10" patternUnits="userSpaceOnUse"><path d="M.5 0V10" stroke="rgba(255,255,255,.45)" stroke-width=".8" fill="none"/></pattern>
<pattern id="fp-glass" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M0 14L14 0" stroke="rgba(255,255,255,.7)" stroke-width="1" fill="none"/></pattern>
<pattern id="fp-terra" width="20" height="7" patternUnits="userSpaceOnUse"><path d="M0 .5H20" stroke="rgba(0,0,0,.18)" stroke-width=".8" fill="none"/></pattern>
</defs>`;

/** Jonli fasad koʻrinishi: 3 qavatli namunaviy fasad (material, deraza, balkon, tom, qoplama, parapet) */
export function facadePreview(o: { mat: Mat; win: Win | 'yoq'; bal: Bal; shape: RoofShape; cover: RoofCover; parapet: number; shade: Shade | 'yoq' }): string {
  const R = (x: number, y: number, w: number, h: number) => `M${x} ${y}h${w}v${h}h${-w}z`;
  let win = '', mull = '', back = '', slab = '', glass = '', rail = '', shade = '';
  for (let k = 0; k < 3; k++) {
    const T = 160 - 50 * k, B = T + 50;
    switch (o.win) {
      case 'klassik': win += R(58, T + 10, 28, 30) + R(114, T + 10, 28, 30); mull += `M72 ${T + 10}v30M128 ${T + 10}v30`; break;
      case 'kvadrat': win += R(62, T + 14, 20, 20) + R(118, T + 14, 20, 20); break;
      case 'fransuz': win += R(58, T + 6, 26, 44) + R(116, T + 6, 26, 44); mull += `M71 ${T + 6}v44M129 ${T + 6}v44`; break;
      case 'ravoq': win += `M58 ${B - 6}v-22a14 14 0 0 1 28 0v22zM114 ${B - 6}v-22a14 14 0 0 1 28 0v22z`; break;
      case 'lenta': win += R(46, T + 14, 108, 18); mull += `M73 ${T + 14}v18M100 ${T + 14}v18M127 ${T + 14}v18`; break;
      case 'panorama': win += R(44, T + 5, 112, 42); mull += `M100 ${T + 5}v42`; break;
    }
    if (o.shade === 'gorizontal' || (o.shade === 'avto' && k > 0)) shade += R(44, T + 4, 112, 3);
    if (o.shade === 'vertikal') for (const x of [52, 68, 84, 100, 116, 132, 148]) shade += R(x, T + 6, 2, 40);
    if (o.shade === 'panjara') shade += `M46 ${T + 8}h108M46 ${T + 18}h108M46 ${T + 28}h108M46 ${T + 38}h108`;
    if (k === 0) continue;
    switch (o.bal) {
      case 'ochiq': slab += R(40, B - 1, 120, 3); rail += `M42 ${B - 14}h116M42 ${B - 14}v13M158 ${B - 14}v13M70 ${B - 14}v13M100 ${B - 14}v13M130 ${B - 14}v13`; break;
      case 'shisha': slab += R(40, B - 1, 120, 3); glass += R(42, B - 15, 116, 14); break;
      case 'lodjiya': back += R(50, T + 3, 100, 47); rail += `M50 ${B - 14}h100`; break;
      case 'fransuz': for (const x0 of [56, 112]) { rail += `M${x0} ${B - 12}h32`; for (const dx of [0, 8, 16, 24, 32]) rail += `M${x0 + dx} ${B - 12}v12`; } break;
      case 'uzluksiz': slab += R(26, B - 1, 148, 4); rail += `M28 ${B - 14}h144M28 ${B - 14}v13M172 ${B - 14}v13M64 ${B - 14}v13M100 ${B - 14}v13M136 ${B - 14}v13`; break;
    }
  }
  const coverC = o.cover === 'yashil' ? '#8fbf72' : o.cover === 'quyosh' ? '#2b3a67' : '#8d877d';
  const flat = o.shape === 'tekis', par = flat && o.parapet > 0;
  let roof = '', cover = '';
  if (flat) roof = par ? R(36, 60 - 4 - o.parapet * 8, 128, 4 + o.parapet * 8) : R(37, 56, 126, 4);
  if (o.shape === 'ikki') roof = 'M34 60L100 20L166 60z';
  if (o.shape === 'tort') roof = 'M34 60L66 30H134L166 60z';
  if (o.shape === 'bir') roof = 'M34 60H166V24z';
  const top = par ? 60 - 4 - o.parapet * 8 : 56;
  if (flat && o.cover === 'yashil') cover = R(44, top - 6, 112, 6);
  if (flat && o.cover === 'quyosh') { const y0 = top - 1; cover = `M48 ${y0}l8-9h22l-8 9zM84 ${y0}l8-9h22l-8 9zM120 ${y0}l8-9h22l-8 9z`; }
  const L = MAT_LOOK[o.mat];
  const p = (d: string, a: string) => d ? `<path d="${d}" ${a}/>` : '';
  return `<svg viewBox="0 0 200 222" role="img" aria-label="Fasad koʻrinishi">${PATTERNS}
<path d="M14 211h172" stroke="#c9c6bf" stroke-width="1"/>
${p(roof, `fill="${flat ? '#8d877d' : coverC}" stroke="#5e5850" stroke-width=".8"`)}${p(cover, `fill="${coverC}"`)}
<rect x="40" y="60" width="120" height="150" fill="${L.c}" stroke="#7d776d" stroke-width=".8"/>${L.pat ? `<rect x="40" y="60" width="120" height="150" fill="url(#fp-${L.pat})"/>` : ''}
${p(back, 'fill="rgba(0,0,0,.14)"')}${p(win, 'fill="#a9bccb" stroke="#5e6670" stroke-width=".9"')}${p(mull, 'fill="none" stroke="#5e6670" stroke-width=".9"')}
${p(shade, o.shade === 'panjara' ? 'fill="none" stroke="#6b5f4e" stroke-width="1.2" opacity=".8"' : 'fill="#6b5f4e" opacity=".75"')}
${p(slab, 'fill="#8d877d"')}${p(glass, 'fill="rgba(185,211,224,.6)" stroke="#5e6670" stroke-width=".7"')}${p(rail, 'fill="none" stroke="#3a3936" stroke-width="1"')}</svg>`;
}

/** Funksiya plitkalari: bitta ikonka tili */
export const USE_ICON: Record<string, string> = {
  turar: 'M5 21V8l7-4 7 4v13M10 21v-5h4v5M3 21h18',
  yakka: 'M4 21V11l8-6 8 6v10M10 21v-6h4v6M2 21h20',
  aralash: 'M5 21V4h14v17M3 21h18M5 16h14M9 8h2M13 8h2M9 12h2M13 12h2',
  maktab: 'M3 9l9-5 9 5-9 5zM7 11.5v4c3 2 7 2 10 0v-4',
  mtm: 'M12 4a3 3 0 1 0 0 6a3 3 0 1 0 0-6zM6 21v-4a6 6 0 0 1 12 0v4',
  poliklinika: 'M4 4h16v16H4zM12 8v8M8 12h8',
  ijtimoiy: 'M3 9l9-5 9 5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18',
  savdo: 'M5 9h14l-1.5 10h-11zM9 9l3-5 3 5',
  ofis: 'M6 21V3h12v18M3 21h18M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2',
  mehmonxona: 'M3 19V7M3 14h18v5M21 14v-2a3 3 0 0 0-3-3h-7v5M7 10.5h.01',
};
export const USE_SHORT: Record<string, string> = { turar: 'Turar joy', yakka: 'Yakka uy', aralash: 'Aralash', maktab: 'Maktab', mtm: 'MTM', poliklinika: 'Poliklinika', ijtimoiy: 'Ijtimoiy', savdo: 'Savdo', ofis: 'Ofis', mehmonxona: 'Mehmonxona' };
