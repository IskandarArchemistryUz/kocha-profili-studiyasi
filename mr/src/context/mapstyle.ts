/**
 * Stilistik fon xaritasi — portaldagi eski sahifalar bilan bir xil palitralar (js/basemap.js, «kps_base»).
 * OpenFreeMap vektor plitkalari (kalitsiz) + Esri sunʼiy yoʻldosh; yozuvlar avval oʻzbekcha.
 */
export const OFM = 'https://tiles.openfreemap.org/planet';
const GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
import { imageryTemplate, ESRI_IMAGERY_ATTR } from './esrikey';

export interface Palette { n: string; bg: string; water: string; park: string; road: string; rc: string; bld: string; bl: string; bw: number; rail: string; label: string }
export const PALETTES: Record<string, Palette> = {
  arch: { n: 'Archemistry', bg: '#f3f1ec', water: '#cddbe4', park: '#dfe6d3', road: '#ffffff', rc: '#dcd6ca', bld: '#e5e0d6', bl: '#b9b1a2', bw: .5, rail: '#cbc4b6', label: '#6f6a60' },
  line: { n: 'Chizma', bg: '#ffffff', water: '#e3ecf2', park: '#eef2e8', road: '#ffffff', rc: '#b9bcc1', bld: '#ffffff', bl: '#1a1c1e', bw: .7, rail: '#c9ccd1', label: '#5b5f66' },
  fig: { n: 'Figura-fon', bg: '#efece4', water: '#cfdbe2', park: '#d7dfcb', road: '#efece4', rc: '#efece4', bld: '#1a1c1e', bl: '#1a1c1e', bw: 0, rail: '#d6d2c8', label: '#7a756b' },
  dark: { n: 'Grafit', bg: '#1c1e21', water: '#18252f', park: '#22302a', road: '#2b2e33', rc: '#2b2e33', bld: '#3a3e44', bl: '#4a4f56', bw: .5, rail: '#33363b', label: '#9aa0a8' },
  pastel: { n: 'Pastel', bg: '#f8f4ed', water: '#cde2f1', park: '#d8ead0', road: '#ffffff', rc: '#e6ddcc', bld: '#e7ddf6', bl: '#c9b8f0', bw: .6, rail: '#e6ddcc', label: '#7d7488' },
  beton: { n: 'Beton', bg: '#e9e8e4', water: '#c3cdd2', park: '#d2d8c9', road: '#f7f7f5', rc: '#cfccc4', bld: '#bdbab3', bl: '#8f8b83', bw: .4, rail: '#b5b1a8', label: '#5d5a54' },
  gisht: { n: 'Gʻisht', bg: '#f4ede4', water: '#c9d6dc', park: '#dbe0c9', road: '#fffaf3', rc: '#e2d3c1', bld: '#e2b9a0', bl: '#b07a5c', bw: .4, rail: '#d6c3ae', label: '#7a5a48' },
  qum: { n: 'Qum', bg: '#efe6d6', water: '#c9dbe0', park: '#dfe5c8', road: '#fffaf0', rc: '#e2d3bb', bld: '#e3d4bb', bl: '#c9b391', bw: .4, rail: '#d6c6a8', label: '#6e5c44' },
  oq: { n: 'Oq maket', bg: '#f6f6f5', water: '#e4eef2', park: '#eef3ea', road: '#ffffff', rc: '#dcdcd9', bld: '#ffffff', bl: '#9a978f', bw: .6, rail: '#dcdcd9', label: '#6f6d68' },
  kok: { n: 'Koʻk chizma', bg: '#0f2740', water: '#0b1f33', park: '#163b4a', road: '#1a3d61', rc: '#1a3d61', bld: '#1d4670', bl: '#5d8fc2', bw: .6, rail: '#24507e', label: '#a9c4e2' },
};

/** portal boʻylab umumiy tanlov (eski sahifalar ham shu kalitni oʻqiydi) */
/** Qoʻlda tanlangan ranglar (palitra ustidan): fon, binolar, koʻchalar, yashil, suv */
export type CustomKey = 'bg' | 'bld' | 'road' | 'park' | 'water';
export type Custom = Partial<Record<CustomKey, string>>;
const HEX = /^#[0-9a-f]{6}$/i;
export function basePrefs(): { pal: string; labels: boolean; custom: Custom } {
  try {
    const b = JSON.parse(localStorage.getItem('kps_base') || '{}'), c: Custom = {};
    for (const k of ['bg', 'bld', 'road', 'park', 'water'] as CustomKey[]) if (typeof b.custom?.[k] === 'string' && HEX.test(b.custom[k])) c[k] = b.custom[k];
    return { pal: PALETTES[b.pal] ? b.pal : 'arch', labels: b.labels !== false, custom: c };
  } catch { return { pal: 'arch', labels: true, custom: {} }; }
}
export function setBasePrefs(p: { pal?: string; labels?: boolean; custom?: Custom }): void {
  try { const b = JSON.parse(localStorage.getItem('kps_base') || '{}'); localStorage.setItem('kps_base', JSON.stringify({ mode: 'stil', ...b, ...p })); } catch { /* saqlanmadi — faqat shu seans */ }
}

const W = (a: number, b: number) => ['interpolate', ['exponential', 1.6], ['zoom'], 12, a, 19, b];
const cls = (c: string[]) => ['match', ['get', 'class'], c, true, false];
const NAME = ['coalesce', ['get', 'name:uz'], ['get', 'name:latin'], ['get', 'name']];

/** MapLibre uslubi: «stil» palitrasi yoki sunʼiy yoʻldosh */
export function mapStyle(kind: 'stil' | 'sat', palKey = 'arch', labels = true, custom: Custom = {}): unknown {
  const p0 = PALETTES[palKey] ?? PALETTES.arch, p = { ...p0, ...custom, ...(custom.road ? { rc: custom.road } : {}) }, L: unknown[] = [];
  if (kind === 'sat') {
    return { version: 8, glyphs: GLYPHS, sources: { s: { type: 'raster', tiles: [imageryTemplate()], tileSize: 256, maxzoom: 19, attribution: `Powered by Esri · ${ESRI_IMAGERY_ATTR}` } }, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#2b2d2f' } }, { id: 'sat', type: 'raster', source: 's' }] };
  }
  L.push({ id: 'bg', type: 'background', paint: { 'background-color': p.bg } });
  L.push({ id: 'park', type: 'fill', source: 'kb', 'source-layer': 'park', paint: { 'fill-color': p.park } });
  L.push({ id: 'green', type: 'fill', source: 'kb', 'source-layer': 'landcover', filter: cls(['grass', 'wood', 'farmland']), paint: { 'fill-color': p.park } });
  L.push({ id: 'water', type: 'fill', source: 'kb', 'source-layer': 'water', paint: { 'fill-color': p.water } });
  L.push({ id: 'wway', type: 'line', source: 'kb', 'source-layer': 'waterway', paint: { 'line-color': p.water, 'line-width': W(.5, 8) } });
  L.push({ id: 'rail', type: 'line', source: 'kb', 'source-layer': 'transportation', filter: cls(['rail', 'transit']), paint: { 'line-color': p.rail, 'line-width': W(.5, 3), 'line-dasharray': [3, 2] } });
  const R: [string, string[], number, number][] = [['min', ['minor', 'service', 'track'], .4, 14], ['ter', ['tertiary', 'secondary'], .8, 30], ['maj', ['primary', 'trunk', 'motorway'], 1.2, 44]];
  for (const [k, c, a, b] of R) L.push({ id: `r${k}-c`, type: 'line', source: 'kb', 'source-layer': 'transportation', filter: cls(c), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': p.rc, 'line-width': W(a + 1, b + 2) } });
  for (const [k, c, a, b] of R) L.push({ id: `r${k}`, type: 'line', source: 'kb', 'source-layer': 'transportation', filter: cls(c), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': p.road, 'line-width': W(a, b) } });
  L.push({ id: 'bld', type: 'fill', source: 'kb', 'source-layer': 'building', minzoom: 13, paint: { 'fill-color': p.bld, 'fill-outline-color': p.bl } });
  L.push({ id: 'bldl', type: 'line', source: 'kb', 'source-layer': 'building', minzoom: 15, paint: { 'line-color': p.bl, 'line-width': ['interpolate', ['linear'], ['zoom'], 15, .3, 19, Math.max(p.bw || 0, .3) * 1.6] } });
  if (labels) {
    const lab = { 'text-color': p.label, 'text-halo-color': p.bg, 'text-halo-width': 1.2 };
    L.push({ id: 'lab-road', type: 'symbol', source: 'kb', 'source-layer': 'transportation_name', minzoom: 14, layout: { 'symbol-placement': 'line', 'text-field': NAME, 'text-font': ['Noto Sans Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], 14, 10, 19, 13] }, paint: lab });
    L.push({ id: 'lab-place', type: 'symbol', source: 'kb', 'source-layer': 'place', filter: ['match', ['get', 'class'], ['city', 'town', 'suburb', 'neighbourhood', 'quarter', 'village'], true, false], layout: { 'text-field': NAME, 'text-font': ['Noto Sans Regular'], 'text-size': ['match', ['get', 'class'], 'city', 15, 'town', 13, 11.5], 'text-letter-spacing': .06, 'text-transform': 'uppercase', 'text-max-width': 8 }, paint: lab });
  }
  return { version: 8, glyphs: GLYPHS, sources: { kb: { type: 'vector', url: OFM } }, layers: L };
}
