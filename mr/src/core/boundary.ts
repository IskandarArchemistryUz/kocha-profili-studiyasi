/**
 * Chegara fayli (uchastka yoki atrof hududi): GeoJSON, KML, KMZ, DXF → WGS84 halqa(lar).
 * Koordinata tizimi avtomatik: graduslar — WGS84; metrlar — UTM (42N, keyin 41N, 43N, 40N) — natija Oʻzbekiston ichida boʻlishi shart.
 * Bir nechta poligon boʻlsa — eng kattasi (teshiklari bilan). Mahalliy tekshiruvlarsiz — faqat oʻqish va tizimni aniqlash.
 */
import { unzipSync, strFromU8 } from 'fflate';
import type { LngLat } from './doc';
import { utmToLngLat, parseGeoJSON } from './userlayers';

export type BCRS = 'wgs84' | 'utm40' | 'utm41' | 'utm42' | 'utm43';
export interface Boundary { rings: LngLat[][]; crs: BCRS; polys: number; areaHa: number; bbox: [number, number, number, number] }
type Poly = number[][][];

/** Oʻzbekiston chegaralari qutisi (kichik zaxira bilan) */
const UZ: [number, number, number, number] = [55.8, 37.1, 73.3, 45.7];
const inUz = (b: number[]) => b[0] >= UZ[0] && b[2] <= UZ[2] && b[1] >= UZ[1] && b[3] <= UZ[3];
const bbOf = (pts: number[][]): [number, number, number, number] => {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const p of pts) { w = Math.min(w, p[0]); e = Math.max(e, p[0]); s = Math.min(s, p[1]); n = Math.max(n, p[1]); }
  return [w, s, e, n];
};
const openRing = (r: number[][]) => (r.length > 1 && r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1] ? r.slice(0, -1) : r);

/** Halqa maydoni (WGS84 graduslarda — mahalliy tekis proyeksiya), m² */
export function ringAreaM2(r: LngLat[]): number {
  if (r.length < 3) return 0;
  const lat0 = r.reduce((a, p) => a + p[1], 0) / r.length, kx = 111_320 * Math.cos(lat0 * Math.PI / 180), ky = 111_132;
  let s = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += (r[j][0] * kx) * (r[i][1] * ky) - (r[i][0] * kx) * (r[j][1] * ky);
  return Math.abs(s) / 2;
}

/* ---------- formatlar ---------- */
function fromGeoJSON(text: string): Poly[] {
  const p = parseGeoJSON(text), out: Poly[] = [];
  for (const f of p.features) for (const pg of f.polys ?? []) out.push(pg.map(r => r.map(q => [q[0], q[1]])));
  // chiziq sifatida berilgan yopiq chegara
  if (!out.length) for (const f of p.features) for (const l of f.lines ?? []) if (l.length >= 4) out.push([openRing(l.map(q => [q[0], q[1]]))]);
  return out;
}
const kmlCoords = (s: string): number[][] => s.trim().split(/\s+/).map(t => t.split(',').map(Number)).filter(q => q.length >= 2 && Number.isFinite(q[0]) && Number.isFinite(q[1])).map(q => [q[0], q[1]]);
function fromKML(text: string): Poly[] {
  const out: Poly[] = [];
  for (const m of text.matchAll(/<(?:\w+:)?Polygon\b[\s\S]*?<\/(?:\w+:)?Polygon>/g)) {
    const pg = m[0], outer = /<(?:\w+:)?outerBoundaryIs>[\s\S]*?<(?:\w+:)?coordinates>([\s\S]*?)<\/(?:\w+:)?coordinates>/.exec(pg);
    if (!outer) continue;
    const rings = [openRing(kmlCoords(outer[1]))];
    for (const h of pg.matchAll(/<(?:\w+:)?innerBoundaryIs>[\s\S]*?<(?:\w+:)?coordinates>([\s\S]*?)<\/(?:\w+:)?coordinates>/g)) rings.push(openRing(kmlCoords(h[1])));
    if (rings[0].length >= 3) out.push(rings);
  }
  if (!out.length) for (const m of text.matchAll(/<(?:\w+:)?LineString\b[\s\S]*?<(?:\w+:)?coordinates>([\s\S]*?)<\/(?:\w+:)?coordinates>/g)) { const r = kmlCoords(m[1]); if (r.length >= 4) out.push([openRing(r)]); }
  return out;
}
function fromKMZ(buf: Uint8Array): Poly[] {
  const files = unzipSync(buf), name = Object.keys(files).find(k => /\.kml$/i.test(k));
  if (!name) throw new Error('KMZ ichida KML topilmadi');
  return fromKML(strFromU8(files[name]));
}
/** DXF: yopiq LWPOLYLINE va POLYLINE (VERTEX) — 10/20 kodlari */
function fromDXF(text: string): Poly[] {
  const L = text.split(/\r?\n/).map(s => s.trim()), out: Poly[] = [];
  let i = 0;
  const pair = (k: number) => [L[k], L[k + 1]];
  while (i < L.length - 1) {
    const [c, v] = pair(i);
    if (c === '0' && v === 'LWPOLYLINE') {
      const pts: number[][] = []; let closed = false, x: number | null = null; i += 2;
      while (i < L.length - 1 && L[i] !== '0') {
        const [cc, vv] = pair(i);
        if (cc === '70') closed = (Number(vv) & 1) === 1;
        else if (cc === '10') x = Number(vv);
        else if (cc === '20' && x != null) { pts.push([x, Number(vv)]); x = null; }
        i += 2;
      }
      const r = openRing(pts);
      if (r.length >= 3 && (closed || pts.length > r.length)) out.push([r]);
      continue;
    }
    if (c === '0' && v === 'POLYLINE') {
      let closed = false; i += 2;
      while (i < L.length - 1 && L[i] !== '0') { if (L[i] === '70') closed = (Number(L[i + 1]) & 1) === 1; i += 2; }
      const pts: number[][] = [];
      while (i < L.length - 1 && L[i] === '0' && L[i + 1] === 'VERTEX') {
        i += 2; let x: number | null = null, y: number | null = null;
        while (i < L.length - 1 && L[i] !== '0') { if (L[i] === '10') x = Number(L[i + 1]); else if (L[i] === '20') y = Number(L[i + 1]); i += 2; }
        if (x != null && y != null) pts.push([x, y]);
      }
      const r = openRing(pts);
      if (r.length >= 3 && (closed || pts.length > r.length)) out.push([r]);
      continue;
    }
    i += 2;
  }
  return out;
}

/** Koordinata tizimini aniqlash va WGS84 ga oʻtkazish. Oʻzbekistondan tashqarida — xato. */
export function toWgs(polys: Poly[]): { polys: LngLat[][][]; crs: BCRS } {
  const all = polys.flatMap(p => p.flat()), bb = bbOf(all);
  if (bb.every(v => Number.isFinite(v)) && Math.abs(bb[0]) <= 180 && Math.abs(bb[2]) <= 180 && Math.abs(bb[1]) <= 90 && Math.abs(bb[3]) <= 90) {
    if (!inUz(bb)) throw new Error('Chegara Oʻzbekistondan tashqarida (WGS84 koordinatalari). Faylni tekshiring.');
    return { polys: polys.map(p => p.map(r => r.map(q => [q[0], q[1]] as LngLat))), crs: 'wgs84' };
  }
  for (const z of [42, 41, 43, 40] as const) {
    const T = (q: number[]): LngLat => { const r = utmToLngLat(q[0], q[1], z); return [Math.round(r[0] * 1e7) / 1e7, Math.round(r[1] * 1e7) / 1e7]; };
    const a = T([bb[0], bb[1]]), b = T([bb[2], bb[3]]);
    if (inUz([Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])])) return { polys: polys.map(p => p.map(r => r.map(T))), crs: `utm${z}` };
  }
  throw new Error('Koordinata tizimi aniqlanmadi yoki chegara Oʻzbekistondan tashqarida. Kutilgan: WGS84 (gradus) yoki UTM 42N/41N (metr).');
}

/** Fayl → chegara. name — fayl nomi (kengaytma boʻyicha format), data — matn yoki baytlar */
export function parseBoundary(name: string, data: ArrayBuffer | Uint8Array | string): Boundary {
  const ext = (name.split('.').pop() ?? '').toLowerCase();
  const bytes = typeof data === 'string' ? null : data instanceof Uint8Array ? data : new Uint8Array(data);
  const text = () => (typeof data === 'string' ? data : strFromU8(bytes!));
  let polys: Poly[];
  if (ext === 'kmz' || (bytes && bytes[0] === 0x50 && bytes[1] === 0x4b)) polys = fromKMZ(bytes ?? new TextEncoder().encode(String(data)));
  else if (ext === 'kml') polys = fromKML(text());
  else if (ext === 'dxf') polys = fromDXF(text());
  else if (ext === 'geojson' || ext === 'json') polys = fromGeoJSON(text());
  else { const t = text().trimStart(); polys = t.startsWith('{') ? fromGeoJSON(t) : t.startsWith('<') ? fromKML(t) : fromDXF(t); }
  if (!polys.length) throw new Error('Faylda yopiq chegara (poligon) topilmadi');
  const w = toWgs(polys);
  const area = (p: LngLat[][]) => ringAreaM2(p[0]) - p.slice(1).reduce((a, r) => a + ringAreaM2(r), 0);
  const best = w.polys.reduce((a, b) => (area(b) > area(a) ? b : a));
  return { rings: best, crs: w.crs, polys: w.polys.length, areaHa: area(best) / 1e4, bbox: bbOf(best[0]) };
}
export const BOUNDARY_ACCEPT = '.geojson,.json,.kml,.kmz,.dxf,application/geo+json,application/json,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz';

/* ---------- atrof hududi: chegara qutisi → markaz va radius ---------- */
/** Chegarani qoplaydigan kvadrat: markaz va radius (m), chetidan zaxira bilan */
export function areaFrame(ring: LngLat[], margin = 80): { center: LngLat; radius: number } {
  const b = bbOf(ring), c: LngLat = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2], kx = 111_320 * Math.cos(c[1] * Math.PI / 180), ky = 111_132;
  return { center: c, radius: Math.ceil(Math.max((b[2] - b[0]) * kx, (b[3] - b[1]) * ky) / 2 + margin) };
}
/** Brauzerda ishlaydigan eng katta atrof (km bo‘yicha radius) va tariflar */
export const AREA_MAX_RADIUS = 6000;
export const AREA_FREE_RADIUS = 1000;

/* ---------- atrofni chegara ichiga qirqish ---------- */
/** Chegara tekshiruvchisi (mahalliy metr proyeksiyasida): nuqta — ichida yoki `buf` m gacha; chiziq — shu nuqtalardan biri yoki chegarani kesib oʻtadi */
export function areaTester(ring: LngLat[], buf = 60): ((p: LngLat) => boolean) & { line: (pts: LngLat[]) => boolean } {
  const c = ring[0], kx = 111_320 * Math.cos(c[1] * Math.PI / 180), ky = 111_132;
  const loc = (g: LngLat) => [(g[0] - c[0]) * kx, (g[1] - c[1]) * ky];
  const P = ring.map(loc), bb = bbOf(P), b2 = buf * buf;
  const inXY = (x: number, y: number) => {
    if (x < bb[0] - buf || x > bb[2] + buf || y < bb[1] - buf || y > bb[3] + buf) return false;
    let ins = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const [xi, yi] = P[i], [xj, yj] = P[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins;
    }
    if (ins || !buf) return ins;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const [ax, ay] = P[j], dx = P[i][0] - ax, dy = P[i][1] - ay, L = dx * dx + dy * dy;
      const t = L ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L)) : 0, ex = ax + t * dx - x, ey = ay + t * dy - y;
      if (ex * ex + ey * ey <= b2) return true;
    }
    return false;
  };
  const cross = (a: number[], b: number[], p: number[], q: number[]) => {
    const d = (b[0] - a[0]) * (q[1] - p[1]) - (b[1] - a[1]) * (q[0] - p[0]); if (!d) return false;
    const t = ((p[0] - a[0]) * (q[1] - p[1]) - (p[1] - a[1]) * (q[0] - p[0])) / d, u = ((p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0])) / d;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  };
  const f = ((g: LngLat) => { const [x, y] = loc(g); return inXY(x, y); }) as ((p: LngLat) => boolean) & { line: (pts: LngLat[]) => boolean };
  f.line = (pts: LngLat[]) => {
    const L = pts.map(loc);
    if (L.some(q => inXY(q[0], q[1]))) return true;
    const lb = bbOf(L); if (lb[2] < bb[0] - buf || lb[0] > bb[2] + buf || lb[3] < bb[1] - buf || lb[1] > bb[3] + buf) return false;
    for (let k = 1; k < L.length; k++) for (let i = 0, j = P.length - 1; i < P.length; j = i++) if (cross(L[k - 1], L[k], P[j], P[i])) return true;
    return false;
  };
  return f;
}
interface ClipOsm { buildings: { rings: LngLat[][] }[]; roads: { pts: LngLat[] }[]; rails: { pts: LngLat[] }[]; water: { rings: LngLat[][] }[]; waterways: { pts: LngLat[] }[]; green: { rings: LngLat[][] }[]; trees: LngLat[] }
/** OSM maʼlumotidan faqat chegara ichidagilar yoki uni kesib oʻtuvchilar qoladi (chegarani butunlay oʻrab olgan katta maydonlar ham) */
export function clipOsmToArea<T extends ClipOsm>(osm: T, ring: LngLat[], buf = 60): T {
  const In = areaTester(ring, buf), ln = (pts: LngLat[]) => In.line(pts);
  const poly = (r: LngLat[]) => ln([...r, r[0]]) || areaTester(r, 0)(ring[0]);   // chegara poligon ichida (masalan, katta suv havzasi)
  return {
    ...osm,
    buildings: osm.buildings.filter(b => b.rings[0].some(In)),
    roads: osm.roads.filter(r => ln(r.pts)), rails: osm.rails.filter(r => ln(r.pts)), waterways: osm.waterways.filter(r => ln(r.pts)),
    water: osm.water.filter(a => poly(a.rings[0])), green: osm.green.filter(a => poly(a.rings[0])),
    trees: osm.trees.filter(In),
  };
}
