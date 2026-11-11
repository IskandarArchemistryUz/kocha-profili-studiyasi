/**
 * Grafika shablonlari (c74, egasi 06.11): varaqlar, Chizmadon albomi va 3D sahna uchun umumiy uslub —
 * funksiyalar (zonalar) palitrasi, atrof (juda och stilistik xarita), chiziq qalinligi, 2D va 3D daraxtlar.
 * Yirik byurolar taqdimot grafikasidan ilhomlangan, lekin nomlari umumiy. «joriy» — hozirgi koʻrinish (hech narsa almashmaydi):
 * mavjud loyihalar shu bilan ochiladi. Sof maʼlumot — DOM ga bogʻliq emas.
 */
import { USES, useDef, type Use } from './uses';
import { TREES, type Crown } from '../chizmadon/catalog';

export type GStyleId = 'joriy' | 'pastel' | 'kontrast' | 'mono' | 'yorqin' | 'tuproq';
/** Atrof (fon xarita) ranglari: binolar, ularning chizigʻi, yoʻllar, yashil, suv */
export interface GCtx { bld: string; bldStroke: string; road: string; roadEdge: string; green: string; wood: string; water: string }
export interface GStyle {
  id: GStyleId; name: string; note: string;
  /** funksiyalar palitrasi (null — USES ranglari) */
  uses: Record<Use, string> | null;
  /** atrof (null — hozirgi) */
  ctx: GCtx | null;
  /** kontur qalinligi koeffitsienti (loyiha binolari, zona va parsel chegaralari) */
  line: number;
  /** loyiha binolari konturi */
  ink: string;
  /** 2D daraxtlar: och yashil ranglar (tur boʻyicha navbat bilan) va kontur; null — hozirgi doiralar */
  trees: { fills: string[]; stroke: string } | null;
  /** 3D daraxtlar: och ranglar; null — hozirgi (dumaloq) */
  trees3d: number[] | null;
}

const U = (a: string[]): Record<Use, string> => Object.fromEntries(USES.map((u, i) => [u.id, a[i]])) as Record<Use, string>;
// tartib — USES bilan bir xil: turar, yakka, aralash, maktab, mtm, poliklinika, ijtimoiy, mamuriy, savdo, ofis, mehmonxona,
// sport, yashil, himoya, maydon, logistika, sanoat, kommunal, transport, avtoturargoh, texnik
export const GSTYLES: GStyle[] = [
  { id: 'joriy', name: 'Asl uslub', note: 'hozirgi ranglar va chiziqlar', uses: null, ctx: null, line: 1, ink: '#1d1d1b', trees: null, trees3d: null },
  { id: 'pastel', name: 'Pastel landshaft', note: 'yumshoq ranglar, ingichka chiziq, oq atrof',
    uses: U(['#f6e3c3', '#f9ecd2', '#f4cdb4', '#f7dca0', '#fae6a6', '#bfe3da', '#cddff2', '#cfd8e3', '#f3c3c8', '#c7d3ef', '#dccbec', '#c3e4ee', '#cfe6bf', '#c2dcb3', '#eee7da', '#e4d3bf', '#ddd2e2', '#e1dccb', '#d6d9e0', '#dfe0e4', '#e3dfd8']),
    ctx: { bld: '#ffffff', bldStroke: '#d8d5cf', road: '#ffffff', roadEdge: '#e6e3dd', green: '#eef4e6', wood: '#e4eedb', water: '#e1edf3' },
    line: 0.75, ink: '#6b6964', trees: { fills: ['#cfe5b8', '#bfdcae', '#d8ebc4', '#c6e0b9', '#b9d8a6'], stroke: '#9bbd86' }, trees3d: [0xd3e6bf, 0xc4ddb0, 0xdcebc9, 0xbfd9a8] },
  { id: 'kontrast', name: 'Grafik kontrast', note: 'toʻyingan ranglar, qalin qora kontur',
    uses: U(['#f2c14e', '#f6d77a', '#f08a4b', '#ffb000', '#ffd23f', '#2bb3a3', '#3d8bd9', '#5b6f8f', '#e5484d', '#2f5fd0', '#8e4ec6', '#00a3c4', '#5cb85c', '#3f8f4f', '#d9cbb0', '#a0703c', '#7a5c99', '#8f8a5a', '#5f6b7a', '#9aa0a8', '#a9a39a']),
    ctx: { bld: '#ececec', bldStroke: 'none', road: '#ffffff', roadEdge: '#d2d2d2', green: '#e3ecd9', wood: '#d6e4c8', water: '#d6e6f0' },
    line: 1.6, ink: '#111111', trees: { fills: ['#8fcb78', '#7cc36a', '#a3d58c', '#86c770'], stroke: '#2f6b2f' }, trees3d: [0x9fd286, 0x8cc874, 0xb0dc98, 0x96cd7e] },
  { id: 'mono', name: 'Monoxrom + aksent', note: 'kulrang shkala, ijtimoiy obyektlar bitta urgʻu rangda',
    uses: U(['#d9d7d2', '#e6e4df', '#c9c6c0', '#e4572e', '#ee8059', '#d9472b', '#f2a385', '#b8b5ae', '#a8a59f', '#9a978f', '#b0ada6', '#cfd6cf', '#c3cfbf', '#b4c2b0', '#ecebe7', '#8f8c86', '#807d78', '#a3a09a', '#96938d', '#bdbbb6', '#c9c7c2']),
    ctx: { bld: '#ffffff', bldStroke: '#d0d0d0', road: '#ffffff', roadEdge: '#e0e0e0', green: '#f1f2f0', wood: '#e9ebe7', water: '#eaeff2' },
    line: 1, ink: '#2b2b2b', trees: { fills: ['#dde2da', '#d0d8cc', '#e5e9e2'], stroke: '#a3ad9f' }, trees3d: [0xdfe4dc, 0xd3dacf, 0xe8ebe5] },
  { id: 'yorqin', name: 'Oq atrof + yorqin funksiya', note: 'atrof oq, yengil kontur; loyiha hududi toza yorqin ranglarda',
    uses: U(['#f3eee2', '#f6f1e6', '#f7c9d6', '#a8dcc0', '#e3e46a', '#c4e8ee', '#f0a59a', '#8fb7bb', '#cdb3e0', '#a9c4e8', '#f2b77e', '#b5d8e8', '#a6d27a', '#8fc06a', '#f5d77f', '#d9c1a0', '#c3b2cc', '#d6d0bc', '#c3c8d0', '#d5d8dc', '#dcd8d0']),
    ctx: { bld: '#ffffff', bldStroke: '#dcdcdc', road: '#fbfbfb', roadEdge: '#e8e8e8', green: '#eef3e8', wood: '#e6eedf', water: '#e3eef3' },
    line: 0.9, ink: '#55534e', trees: { fills: ['#a8d47e', '#9ccc65', '#b8dc8f', '#8fc46a', '#c2e19c'], stroke: '#6c9c4a' }, trees3d: [0xb2da8a, 0xa3d275, 0xc1e19e, 0x98cb72] },
  { id: 'tuproq', name: 'Tabiiy tuproq', note: 'oxra, terrakota va zaytun ranglari',
    uses: U(['#e8d2a8', '#efdcb8', '#d99a6c', '#d9a441', '#e6c167', '#8fb3a0', '#c4a484', '#9c8b78', '#c0603f', '#7f8f9a', '#a0627a', '#9fbfa8', '#a9b878', '#7f945a', '#e3d3b5', '#b58b5e', '#9a7f8a', '#b0a582', '#8f8f86', '#b9b3a6', '#c7bfae']),
    ctx: { bld: '#f8f5ef', bldStroke: '#e2d9ca', road: '#fffdf9', roadEdge: '#e8dfcf', green: '#edf0e1', wood: '#e3e8d3', water: '#dfe8ea' },
    line: 1, ink: '#4a3f33', trees: { fills: ['#c3cd98', '#b4c288', '#cfd8a8', '#a9b878'], stroke: '#7d8a50' }, trees3d: [0xc7d09e, 0xb9c58f, 0xd3dbae] },
];
export const GSTYLE_IDS = GSTYLES.map(s => s.id);
export const gstyleById = (id?: string | null): GStyle => GSTYLES.find(s => s.id === id) ?? GSTYLES[0];
export const isGStyle = (v: unknown): v is GStyleId => typeof v === 'string' && (GSTYLE_IDS as string[]).includes(v);

const hexN = (s: string) => parseInt(s.slice(1), 16);
/** Funksiya rangi (son): shablon palitrasi yoki USES */
export const useColorOf = (g: GStyle | null | undefined, u: string): number => { const c = g?.uses?.[u as Use]; return c ? hexN(c) : useDef(u).color; };

/** «Bir xil quyuq kulrang» parsellar (06.11, egasi) */
export const PARCEL_GREY = '#4f4e4a';

/* ---------- 2D daraxt belgilari (Chizmadon katalogidagi 12 Toshkent daraxti) ---------- */
const n2 = (v: number) => (Math.round(v * 100) / 100).toString();
/** Nuqta boʻyicha barqaror tur (har chizishda bir xil) */
export const treeAt = (x: number, y: number): number => { let h = (Math.round(x * 10) * 73856093) ^ (Math.round(y * 10) * 19349663); h = Math.imul(h ^ (h >>> 13), 0x5bd1e995); return ((h ^ (h >>> 15)) >>> 0) % TREES.length; };
/** Toj belgisi (mm): catalog.ts dagi toj shakli (round, oval, column, umbrella, cone, spread); rang — shablonning och yashili */
export function treeGlyph2d(x: number, y: number, r: number, crown: Crown, fill: string, stroke: string, sw: number): string {
  const s = `stroke="${stroke}" stroke-width="${n2(sw)}"`;
  switch (crown) {
    case 'column': return `<ellipse cx="${n2(x)}" cy="${n2(y)}" rx="${n2(r * 0.55)}" ry="${n2(r)}" fill="${fill}" ${s}/>`;
    case 'cone': return `<path d="M${n2(x)},${n2(y - r)}L${n2(x + r * 0.8)},${n2(y + r * 0.75)}L${n2(x - r * 0.8)},${n2(y + r * 0.75)}Z" fill="${fill}" ${s} stroke-linejoin="round"/>`;
    case 'umbrella': return `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(r)}" fill="${fill}" ${s}/><circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(r * 0.16)}" fill="${stroke}"/>`;
    case 'spread': { let d = ''; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; d += `<circle cx="${n2(x + Math.cos(a) * r * 0.42)}" cy="${n2(y + Math.sin(a) * r * 0.42)}" r="${n2(r * 0.55)}" fill="${fill}"/>`; } return d + `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(r * 0.95)}" fill="none" ${s}/>`; }
    case 'oval': return `<ellipse cx="${n2(x)}" cy="${n2(y)}" rx="${n2(r * 0.8)}" ry="${n2(r)}" fill="${fill}" ${s}/>`;
    default: return `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(r)}" fill="${fill}" ${s}/>`;
  }
}
/** Shablon daraxti: nuqta (mm), radius (mm), joy nuqtasi (m — tur tanlash uchun) */
export function styledTree(g: GStyle, x: number, y: number, r: number, at: [number, number]): string {
  const T = g.trees!, i = treeAt(at[0], at[1]), t = TREES[i];
  return treeGlyph2d(x, y, r, t.crown, T.fills[i % T.fills.length], T.stroke, Math.max(0.06, r * 0.06));
}
