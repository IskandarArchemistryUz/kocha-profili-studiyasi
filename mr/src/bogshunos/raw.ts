/**
 * Bogʻshunos — brauzerda yuklangan xom paketni (Chrome orqali saqlangan JSON) BgSite + BgData ga oʻtkazish.
 * Paket: { site: OSM way (geometry lat/lon), trees: [lon, lat, tur, dbh_sm, toj_m, h_m, tasdiq], dem: Terrarium z15 piksel toʻri,
 *          osm: [{ t: 'w'|'n'|'r', id, g: teglar, c: [[lon, lat]…] }] }, + relation aʼzolari ({ id: { tags, m: [{ r, c }] } }), + aholi [[lon, lat, n]].
 * Reyestrdan shaxsiy identifikatorlar (volunteer_id, dendrologist_id) bu paketda yoʻq va olinmaydi.
 */
import { frame } from '../core/geo';
import type { LngLat } from '../core/doc';
import { GHS_POP_CITE } from '../joyshunos/population';
import { parseOsm } from './load';
import type { BgData, BgSite, XY } from './types';

export interface RawPack {
  site: { geometry: { lat: number; lon: number }[]; tags?: Record<string, string> };
  trees: [number, number, string, number, number, number, number][];
  dem: { z: number; x0: number; y0: number; W: number; H: number; step?: number; v: number[] } | null;
  osm: { t: 'w' | 'n' | 'r'; id: number; g: Record<string, string>; c?: [number, number][] }[];
  meta?: { osm?: string; date?: string };
}
export type RawRels = Record<string, { tags: Record<string, string>; m: { r: string; c: [number, number][] }[] }>;

export function fromRaw(raw: RawPack, rels: RawRels = {}, pop: [number, number, number][] = [], opt: Partial<Pick<BgSite, 'kind' | 'rekonstruksiya' | 'place'>> = {}): { site: BgSite; data: BgData } {
  const ring = raw.site.geometry.map(p => [p.lon, p.lat] as LngLat);
  if (ring.length > 3 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]) ring.pop();
  const origin: LngLat = [ring.reduce((s, p) => s + p[0], 0) / ring.length, ring.reduce((s, p) => s + p[1], 0) / ring.length];
  const F = frame(origin);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const elements: any[] = [];
  for (const e of raw.osm) {
    if (e.t === 'n' && e.c?.length) elements.push({ type: 'node', id: e.id, tags: e.g, lon: e.c[0][0], lat: e.c[0][1] });
    else if (e.t === 'w' && e.c?.length) elements.push({ type: 'way', id: e.id, tags: e.g, geometry: e.c.map(([lon, lat]) => ({ lon, lat })) });
  }
  for (const [id, r] of Object.entries(rels)) elements.push({ type: 'relation', id: +id, tags: r.tags, members: r.m.map(m => ({ role: m.r, geometry: m.c.map(([lon, lat]) => ({ lon, lat })) })) });
  const osm = parseOsm({ elements }, F);
  const trees = raw.trees.map(t => ({ p: F.toLocal([t[0], t[1]]) as XY, sp: t[2] ?? '—', d: +t[3] || 0, c: +t[4] || 0, h: +t[5] || 0, ok: !!t[6] }));
  let dem: BgData['dem'] = null;
  if (raw.dem) {
    // Terrarium piksel toʻrini 5 m mahalliy toʻrga (bilinear) — loadDem bilan bir xil natija
    const { z, x0, y0, W, H, v } = raw.dem, n = 2 ** z, step = 5, ps = 256 / (raw.dem.step ?? 1); // ps — plitkadagi saqlangan piksel soni
    const elev = (lon: number, lat: number) => {
      const px = ((lon + 180) / 360 * n - x0) * ps, r = lat * Math.PI / 180, py = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n - y0) * ps;
      const i = Math.max(0, Math.min(W - 2, Math.floor(px))), j = Math.max(0, Math.min(H - 2, Math.floor(py))), fx = px - i, fy = py - j;
      const V = (a: number, b: number) => v[b * W + a];
      return V(i, j) * (1 - fx) * (1 - fy) + V(i + 1, j) * fx * (1 - fy) + V(i, j + 1) * (1 - fx) * fy + V(i + 1, j + 1) * fx * fy;
    };
    const B = ring.map(F.toLocal), xs = B.map(p => p[0]), ys = B.map(p => p[1]);
    const a: XY = [Math.min(...xs) - 60, Math.min(...ys) - 60], b: XY = [Math.max(...xs) + 60, Math.max(...ys) + 60];
    const nx = Math.ceil((b[0] - a[0]) / step) + 1, ny = Math.ceil((b[1] - a[1]) / step) + 1, zz: number[] = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const g = F.toGeo([a[0] + i * step, a[1] + j * step]); zz.push(Math.round(elev(g[0], g[1]) * 10) / 10); }
    dem = { x0: a[0], y0: a[1], step, nx, ny, z: zz, src: 'AWS Terrain Tiles (Terrarium, SRTM ~30 m) — sirt modeli, P' };
  }
  const site: BgSite = { name: raw.site.tags?.name ?? 'Bogʻ', place: opt.place ?? 'Toshkent', origin, boundary: ring.map(F.toLocal) as XY[], kind: opt.kind ?? 'tuman', rekonstruksiya: opt.rekonstruksiya ?? true };
  const data: BgData = { at: raw.meta?.date ?? '', osm, trees, dem, pop: pop.map(([lon, lat, n]) => ({ p: F.toLocal([lon, lat]) as XY, n })), popSrc: GHS_POP_CITE, nets: [], tu: [] };
  return { site, data };
}
