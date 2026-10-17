/**
 * OpenFreeMap vektor plitkalaridan (OpenMapTiles sxemasi, z14) atrof maʼlumoti — Overpass sekin yoki band boʻlganda zaxira.
 * Plitkalar tez (CDN) va kalitsiz; Overpassga nisbatan kamroq teg: bino balandligi faqat render_height, daraxtlar yoʻq,
 * koʻcha nomlari transportation_name qatlamidan ulanadi. Natija — Overpass tahlili bilan bir xil OsmData.
 */
import { PbfReader } from 'pbf';
import { VectorTile, classifyRings, type VectorTileFeature } from '@mapbox/vector-tile';
import type { LngLat } from '../core/doc';
import { heightByArea, ringAreaM2, roadWidth, type BBox, type CtxLine, type OsmData } from './osm';

export const OFM_TILEJSON = 'https://tiles.openfreemap.org/planet';
const Z = 14;
let tileUrl: string | null = null;

async function tileTemplate(f: typeof fetch): Promise<string> {
  if (tileUrl) return tileUrl;
  const j = await (await f(OFM_TILEJSON)).json() as { tiles?: string[] };
  if (!j.tiles?.[0]) throw new Error('OpenFreeMap: tilejson');
  tileUrl = j.tiles[0]; return tileUrl;
}

const lng2x = (lng: number, n: number) => (lng + 180) / 360 * n;
const lat2y = (lat: number, n: number) => { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n; };

/** bbox (janub, gʻarb, shimol, sharq) ni qoplaydigan z14 plitkalar */
export function tilesFor(bb: BBox): { x: number; y: number }[] {
  const n = 2 ** Z, x0 = Math.floor(lng2x(bb[1], n)), x1 = Math.floor(lng2x(bb[3], n)), y0 = Math.floor(lat2y(bb[2], n)), y1 = Math.floor(lat2y(bb[0], n));
  const out: { x: number; y: number }[] = [];
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) out.push({ x, y });
  return out;
}

/** OpenMapTiles transportation class/subclass → OSM highway */
function highwayOf(p: Record<string, unknown>): string | null {
  const c = String(p.class ?? ''), s = String(p.subclass ?? '');
  if (/^(motorway|trunk|primary|secondary|tertiary)$/.test(c)) return p.ramp === 1 || p.ramp === '1' ? `${c}_link` : c;
  if (c === 'minor') return /^(residential|unclassified|living_street|road)$/.test(s) ? s : 'residential';
  if (c === 'service') return 'service';
  if (c === 'track') return 'track';
  if (c === 'path') return /^(footway|path|cycleway|steps|pedestrian|bridleway|corridor)$/.test(s) ? s : 'path';
  if (c === 'raceway' || c === 'busway') return null;
  return null;
}
const PT_WAY: Record<string, number> = { river: 25, canal: 12, stream: 4, ditch: 2, drain: 2 };

/** Plitkalardan OsmData; bb — qiziqish chegarasi (undan tashqaridagi obyektlar tashlanadi) */
export async function fetchOfm(bb: BBox, f: typeof fetch): Promise<OsmData> {
  const tpl = await tileTemplate(f), n = 2 ** Z;
  const tiles = tilesFor(bb);
  if (tiles.length > 36) throw new Error('OpenFreeMap: hudud juda katta');
  const bufs = await Promise.all(tiles.map(async t => {
    const r = await f(tpl.replace('{z}', String(Z)).replace('{x}', String(t.x)).replace('{y}', String(t.y)));
    if (!r.ok) throw new Error(`OpenFreeMap ${r.status}`);
    return { t, buf: new Uint8Array(await r.arrayBuffer()) };
  }));
  const d: OsmData = { buildings: [], roads: [], rails: [], water: [], waterways: [], green: [], trees: [] };
  const inBB = (pts: LngLat[]) => pts.some(p => p[1] >= bb[0] && p[1] <= bb[2] && p[0] >= bb[1] && p[0] <= bb[3]);
  const names: { name: string; pts: LngLat[] }[] = [];
  const seen = new Set<string>();
  let auto = 1;
  for (const { t, buf } of bufs) {
    const vt = new VectorTile(new PbfReader(buf));
    const toLL = (ext: number) => (px: { x: number; y: number }): LngLat => {
      const X = (t.x + px.x / ext) / n, Y = (t.y + px.y / ext) / n;
      return [Math.round((X * 360 - 180) * 1e7) / 1e7, Math.round(Math.atan(Math.sinh(Math.PI * (1 - 2 * Y))) * 180 / Math.PI * 1e7) / 1e7];
    };
    const each = (layer: string, fn: (ft: VectorTileFeature, geom: LngLat[][], id: number) => void) => {
      const L = vt.layers[layer]; if (!L) return;
      for (let i = 0; i < L.length; i++) {
        const ft = L.feature(i), geom = ft.loadGeometry().map(r => r.map(toLL(ft.extent)));
        const id = ft.id ?? (900_000_000 + auto++);
        // plitka chegarasida boʻlingan obyekt ikki marta kelmasin (id boʻlsa)
        const key = `${layer}:${ft.id ?? `${t.x}/${t.y}/${i}`}`; if (ft.id != null && seen.has(key)) continue; seen.add(key);
        fn(ft, geom, id);
      }
    };
    const polys = (ft: VectorTileFeature): LngLat[][][] => classifyRings(ft.loadGeometry()).map(rs => rs.map(r => r.map(toLL(ft.extent)).reverse()));   // MVT: tashqi halqa soat yoʻnalishida (y pastga) → geografikda teskari
    each('building', (ft, _g, id) => {
      const p = ft.properties, rh = Number(p.render_height), given = Number.isFinite(rh) && rh > 0 && rh !== 5;   // OMT: balandlik yoʻq boʻlsa 5 qoʻyadi
      polys(ft).forEach((rings, i) => { if (rings[0].length < 4 || !inBB(rings[0])) return; const a = ringAreaM2(rings[0]); if (a < 12) return;
        d.buildings.push({ id: id * 10 + i, rings, h: given ? rh : heightByArea('yes', a, 9), hSrc: given ? 'height' : 'taxmin', kind: 'yes' }); });
    });
    each('transportation', (ft, geom, id) => {
      const p = ft.properties; if (p.brunnel === 'tunnel') return;
      const c = String(p.class ?? ''), s = String(p.subclass ?? '');
      if (c === 'rail' || c === 'transit') {
        const cls = c === 'rail' ? 'rail' : /^(tram|subway|light_rail|narrow_gauge)$/.test(s) ? s : 'rail';
        if (cls === 'subway') return;
        geom.forEach((pts, i) => { if (pts.length >= 2 && inBB(pts)) d.rails.push({ id: id * 10 + i, pts, cls, w: cls === 'tram' ? 2.6 : 3.2 }); });
        return;
      }
      const hw = highwayOf(p); if (!hw) return;
      const t2: Record<string, string> = { highway: hw }; if (hw === 'service' && p.service) t2.service = String(p.service);
      const oneway = p.oneway === 1 || p.oneway === -1 || p.oneway === '1' || p.oneway === '-1';
      geom.forEach((pts, i) => { if (pts.length < 2 || !inBB(pts)) return;
        const r: CtxLine = { id: id * 10 + i, pts, cls: hw, w: roadWidth(t2), ...(t2.service ? { sub: t2.service } : {}), ...(oneway ? { oneway } : {}) };
        d.roads.push(r); });
    });
    each('transportation_name', (ft, geom) => { const nm = ft.properties.name; if (typeof nm === 'string' && nm) geom.forEach(pts => names.push({ name: nm, pts })); });
    each('water', (ft, _g, id) => { const k = String(ft.properties.class ?? 'water'); if (k === 'ocean') return; polys(ft).forEach((rings, i) => { if (rings[0].length >= 4 && inBB(rings[0])) d.water.push({ id: id * 10 + i, rings, kind: k }); }); });
    each('waterway', (ft, geom, id) => { const p = ft.properties, k = String(p.class ?? 'stream'); if (p.brunnel === 'tunnel') return;
      geom.forEach((pts, i) => { if (pts.length >= 2 && inBB(pts)) d.waterways.push({ id: id * 10 + i, pts, cls: k, w: PT_WAY[k] ?? 3, ...(typeof p.name === 'string' && p.name ? { name: p.name } : {}) }); }); });
    each('park', (ft, _g, id) => polys(ft).forEach((rings, i) => { if (rings[0].length >= 4 && inBB(rings[0])) d.green.push({ id: id * 10 + i, rings, kind: 'park' }); }));
    each('landcover', (ft, _g, id) => { const c = String(ft.properties.class ?? ''), s = String(ft.properties.subclass ?? '');
      const kind = c === 'wood' ? (s === 'scrub' ? 'scrub' : 'wood') : c === 'grass' ? (s === 'grassland' ? 'grassland' : /^(meadow|allotments|orchard|vineyard|recreation_ground|village_green)$/.test(s) ? s : 'grass') : c === 'farmland' ? (s === 'orchard' || s === 'vineyard' ? s : '') : '';
      if (!kind) return; polys(ft).forEach((rings, i) => { if (rings[0].length >= 4 && inBB(rings[0])) d.green.push({ id: id * 10 + i, rings, kind }); }); });
    each('landuse', (ft, _g, id) => { const c = String(ft.properties.class ?? ''); const kind = /^(cemetery|pitch|playground|garden|golf_course)$/.test(c) ? c : ''; if (!kind) return;
      polys(ft).forEach((rings, i) => { if (rings[0].length >= 4 && inBB(rings[0])) d.green.push({ id: id * 10 + i, rings, kind }); }); });
  }
  // koʻcha nomlari: nom chizigʻi bilan uch nuqtasi ustma-ust tushgan yoʻllarga
  if (names.length && d.roads.length) {
    const key = (p: LngLat) => `${Math.round(p[0] * 2e5)}:${Math.round(p[1] * 2e5)}`;
    const byPt = new Map<string, string>(); for (const nmn of names) for (const p of nmn.pts) byPt.set(key(p), nmn.name);
    for (const r of d.roads) { for (const p of r.pts) { const nm = byPt.get(key(p)); if (nm) { r.name = nm; break; } } }
  }
  return d;
}
