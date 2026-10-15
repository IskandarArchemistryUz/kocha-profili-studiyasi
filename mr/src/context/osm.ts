/**
 * OpenStreetMap (Overpass API) → kontekst maʼlumoti.
 * Sof funksiyalar: tarmoqqa bogʻliq emas, shuning uchun birlik testlari bilan tekshiriladi.
 * Natija geografik koordinatalarda saqlanadi — loyiha markazi koʻchsa ham kesh yaroqli qoladi.
 */
import type { LngLat } from '../core/doc';

export interface CtxBuilding { id: number; rings: LngLat[][]; h: number; hSrc: 'height' | 'levels' | 'taxmin'; kind: string }
export interface CtxLine { id: number; pts: LngLat[]; cls: string; w: number }
export interface CtxArea { id: number; rings: LngLat[][]; kind: string }

export interface OsmData {
  buildings: CtxBuilding[];
  roads: CtxLine[];
  rails: CtxLine[];
  water: CtxArea[];
  waterways: CtxLine[];
  green: CtxArea[];
  trees: LngLat[];
}

export type BBox = [number, number, number, number]; // janub, gʻarb, shimol, sharq

/** Markaz va radius (m) boʻyicha kvadrat chegara */
export function bboxAround(c: LngLat, r: number): BBox {
  const dLat = r / 111_132, dLng = r / (111_320 * Math.cos(c[1] * Math.PI / 180));
  return [c[1] - dLat, c[0] - dLng, c[1] + dLat, c[0] + dLng];
}

export function overpassQuery(b: BBox): string {
  const bb = b.map(v => v.toFixed(6)).join(',');
  return `[out:json][timeout:90][bbox:${bb}];
(
  way["building"];
  relation["building"]["type"="multipolygon"];
  way["highway"]["tunnel"!="yes"]["area"!="yes"];
  way["railway"~"^(rail|light_rail|tram|narrow_gauge|subway)$"]["tunnel"!="yes"];
  way["natural"="water"]; relation["natural"="water"];
  way["waterway"~"^(river|canal|stream|ditch|drain)$"]["tunnel"!~"yes|culvert"];
  way["landuse"~"^(grass|forest|meadow|recreation_ground|village_green|cemetery|orchard|vineyard|allotments)$"];
  way["leisure"~"^(park|garden|pitch|playground|golf_course)$"]; relation["leisure"="park"];
  way["natural"~"^(wood|scrub|grassland)$"];
  node["natural"="tree"];
  way["natural"="tree_row"];
);
out geom qt;`;
}

/* ---------- oʻlchamlar ---------- */

/** Qatnov qismi kengligi (m) — koʻcha toifasi boʻyicha taxmin, teglar boʻlsa ular ustun */
export const ROAD_W: Record<string, number> = {
  motorway: 24, trunk: 21, primary: 17, secondary: 13, tertiary: 10,
  motorway_link: 7, trunk_link: 7, primary_link: 7, secondary_link: 6.5, tertiary_link: 6,
  residential: 7, unclassified: 6.5, living_street: 6, service: 4.5, road: 6,
  pedestrian: 6, track: 3, footway: 2.2, path: 1.8, cycleway: 2, steps: 2, bridleway: 2, corridor: 2,
};
const VEHICLE = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'living_street', 'service', 'road', 'motorway_link', 'trunk_link', 'primary_link', 'secondary_link', 'tertiary_link']);

const num = (v: unknown): number | null => {
  if (typeof v !== 'string') return null;
  const m = v.replace(',', '.').match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n * (/\bft\b|'/.test(v) ? 0.3048 : 1) : null;
};

export function roadWidth(t: Record<string, string>): number {
  const w = num(t.width); if (w && w > 1 && w < 80) return w;
  const cls = t.highway;
  const lanes = num(t.lanes);
  if (lanes && VEHICLE.has(cls) && lanes >= 1 && lanes <= 12) return Math.max(lanes * 3.5, ROAD_W[cls] ? ROAD_W[cls] * 0.6 : 3);
  return ROAD_W[cls] ?? 4;
}

const B_DEFAULT: Record<string, number> = { house: 6, detached: 6, semidetached_house: 6, bungalow: 4, garage: 3, garages: 3, shed: 3, roof: 4, kiosk: 3, hut: 3, cabin: 4, apartments: 15, residential: 12, school: 10, kindergarten: 7, hospital: 15, office: 18, commercial: 12, retail: 6, industrial: 9, warehouse: 9, mosque: 12, church: 14 };

/** Bino balandligi: height → building:levels × 3,2 m → turi boʻyicha taxmin */
export function buildingHeight(t: Record<string, string>): { h: number; src: CtxBuilding['hSrc'] } {
  const h = num(t.height); if (h && h > 1 && h < 600) return { h, src: 'height' };
  const lv = num(t['building:levels']); if (lv && lv >= 1 && lv < 150) return { h: lv * 3.2 + (num(t['roof:levels']) ?? 0) * 2.5, src: 'levels' };
  return { h: B_DEFAULT[t.building] ?? 9, src: 'taxmin' };
}

/* ---------- geometriya ---------- */

interface OsmEl { type: 'node' | 'way' | 'relation'; id: number; lat?: number; lon?: number; tags?: Record<string, string>; geometry?: ({ lat: number; lon: number } | null)[]; members?: { type: string; role: string; geometry?: ({ lat: number; lon: number } | null)[] }[] }

const toLL = (g: ({ lat: number; lon: number } | null)[] | undefined): LngLat[] => (g || []).filter((p): p is { lat: number; lon: number } => !!p).map(p => [p.lon, p.lat]);
const same = (a: LngLat, b: LngLat) => Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;

/** Yopiq halqa (oxirgi nuqta takrorlanmaydi), kamida 3 nuqta */
function ring(pts: LngLat[]): LngLat[] | null {
  const r = pts.length > 1 && same(pts[0], pts[pts.length - 1]) ? pts.slice(0, -1) : pts.slice();
  return r.length >= 3 ? r : null;
}

/** Multipoligon aʼzolarini (boʻlak-boʻlak chiziqlarni) yopiq halqalarga ulash */
export function stitch(parts: LngLat[][]): LngLat[][] {
  const left = parts.filter(p => p.length >= 2).map(p => p.slice());
  const out: LngLat[][] = [];
  while (left.length) {
    let cur = left.shift()!;
    let grew = true;
    while (!same(cur[0], cur[cur.length - 1]) && grew) {
      grew = false;
      for (let i = 0; i < left.length; i++) {
        const p = left[i], end = cur[cur.length - 1];
        if (same(end, p[0])) cur = cur.concat(p.slice(1));
        else if (same(end, p[p.length - 1])) cur = cur.concat(p.slice(0, -1).reverse());
        else if (same(cur[0], p[p.length - 1])) cur = p.slice(0, -1).concat(cur);
        else if (same(cur[0], p[0])) cur = p.slice(1).reverse().concat(cur);
        else continue;
        left.splice(i, 1); grew = true; break;
      }
    }
    const r = ring(cur); if (r) out.push(r);
  }
  return out;
}

/** Multipoligon → halqalar toʻplamlari: har bir tashqi halqa alohida; ichki halqalar (teshiklar) oʻzini oʻz ichiga olgan tashqisiga */
export function relAreas(e: { members?: OsmEl['members'] }): LngLat[][][] {
  const outers = stitch((e.members || []).filter(m => m.type === 'way' && m.role !== 'inner').map(m => toLL(m.geometry)));
  const inners = stitch((e.members || []).filter(m => m.type === 'way' && m.role === 'inner').map(m => toLL(m.geometry)));
  const sets = outers.map(o => [o]);
  for (const h of inners) { const k = outers.findIndex(o => inside(h[0], o)); if (k >= 0) sets[k].push(h); }
  return sets;
}

function inside(p: LngLat, r: LngLat[]): boolean {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c;
  }
  return c;
}

/** Yopiq yoʻl yoki multipoligon → halqalar toʻplamlari */
function areas(e: OsmEl, pts: LngLat[]): LngLat[][][] {
  if (e.type === 'way') { const r = ring(pts); return r ? [[r]] : []; }
  return relAreas(e);
}

const GREEN_LANDUSE = /^(grass|forest|meadow|recreation_ground|village_green|cemetery|orchard|vineyard|allotments)$/;
const GREEN_LEISURE = /^(park|garden|pitch|playground|golf_course)$/;

/** Overpass javobini kontekst maʼlumotiga aylantirish */
export function parseOverpass(json: { elements?: OsmEl[] }): OsmData {
  const d: OsmData = { buildings: [], roads: [], rails: [], water: [], waterways: [], green: [], trees: [] };
  for (const e of json.elements || []) {
    const t = e.tags || {};
    if (e.type === 'node') { if (t.natural === 'tree' && e.lat != null && e.lon != null) d.trees.push([e.lon, e.lat]); continue; }
    const pts = e.type === 'way' ? toLL(e.geometry) : [];
    if (t.building && t.building !== 'no') {
      const { h, src } = buildingHeight(t);
      areas(e, pts).forEach((rings, i) => d.buildings.push({ id: e.type === 'way' ? e.id : e.id * 100 + i, rings, h, hSrc: src, kind: t.building }));
      continue;
    }
    if (t.highway && e.type === 'way' && pts.length >= 2) { d.roads.push({ id: e.id, pts, cls: t.highway, w: roadWidth(t) }); continue; }
    if (t.railway && e.type === 'way' && pts.length >= 2) { d.rails.push({ id: e.id, pts, cls: t.railway, w: t.railway === 'tram' ? 2.6 : 3.2 }); continue; }
    if (t.natural === 'water') {
      areas(e, pts).forEach(rings => d.water.push({ id: e.id, rings, kind: t.water || 'water' }));
      continue;
    }
    if (t.waterway && e.type === 'way' && pts.length >= 2) {
      const w = num(t.width) ?? ({ river: 25, canal: 12, stream: 4, ditch: 2, drain: 2 } as Record<string, number>)[t.waterway] ?? 3;
      d.waterways.push({ id: e.id, pts, cls: t.waterway, w }); continue;
    }
    if (t.natural === 'tree_row' && e.type === 'way') { d.trees.push(...sampleLine(pts, 8)); continue; }
    const greenKind = (t.landuse && GREEN_LANDUSE.test(t.landuse) && t.landuse) || (t.leisure && GREEN_LEISURE.test(t.leisure) && t.leisure) || (t.natural && /^(wood|scrub|grassland)$/.test(t.natural) && t.natural);
    if (greenKind) {
      areas(e, pts).forEach(rings => d.green.push({ id: e.id, rings, kind: greenKind }));
    }
  }
  return d;
}

/** Chiziq boʻylab har `step` metrda nuqta */
export function sampleLine(pts: LngLat[], step: number): LngLat[] {
  const out: LngLat[] = [];
  if (pts.length < 2) return out;
  const kx = 111_320 * Math.cos(pts[0][1] * Math.PI / 180), ky = 111_132;
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], L = Math.hypot((b[0] - a[0]) * kx, (b[1] - a[1]) * ky);
    let s = carry;
    while (s <= L) { const k = L ? s / L : 0; out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]); s += step; }
    carry = s - L;
  }
  return out;
}

export function summary(d: OsmData): { buildings: number; roadKm: number; trees: number } {
  let L = 0;
  for (const r of d.roads) {
    const kx = 111_320 * Math.cos(r.pts[0][1] * Math.PI / 180);
    for (let i = 1; i < r.pts.length; i++) L += Math.hypot((r.pts[i][0] - r.pts[i - 1][0]) * kx, (r.pts[i][1] - r.pts[i - 1][1]) * 111_132);
  }
  return { buildings: d.buildings.length, roadKm: L / 1000, trees: d.trees.length };
}
