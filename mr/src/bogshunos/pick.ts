/**
 * Bogʻshunos — bogʻ chegarasini tanlash: xaritada bosilgan nuqtani oʻz ichiga olgan OSM bogʻlari (leisure=park|garden,
 * landuse=recreation_ground) — Overpass is_in. Bir nechta boʻlsa — kichigidan kattasiga roʻyxat. Koʻp qismli (relation) bogʻda eng katta tashqi halqa olinadi.
 */
import type { LngLat } from '../core/doc';
import { overpass } from './load';

export interface ParkCand { id: string; name: string; ring: LngLat[]; areaHa: number }
const area = (r: LngLat[]) => { const lat = r[0][1] * Math.PI / 180, kx = 111320 * Math.cos(lat), ky = 110574; let a = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * kx * q[1] * ky - q[0] * kx * p[1] * ky; } return Math.abs(a / 2) / 1e4; };

export const parkQuery = (c: LngLat) => `[out:json][timeout:40];is_in(${c[1].toFixed(6)},${c[0].toFixed(6)})->.a;(way(pivot.a)[leisure~"^(park|garden|nature_reserve)$"];relation(pivot.a)[leisure~"^(park|garden|nature_reserve)$"];way(pivot.a)[landuse=recreation_ground];);out geom tags;`;

/** Overpass javobidan nomzodlar (sof funksiya — test qilinadi) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseParks(j: any): ParkCand[] {
  const out: ParkCand[] = [];
  for (const e of j?.elements ?? []) {
    let ring: LngLat[] | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (e.type === 'way' && e.geometry?.length > 3) ring = e.geometry.map((p: any) => [p.lon, p.lat] as LngLat);
    if (e.type === 'relation' && e.members) {
      // tashqi aʼzolarni halqaga yigʻish (uchma-uch)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const segs: LngLat[][] = e.members.filter((m: any) => (m.role || 'outer') === 'outer' && m.geometry?.length).map((m: any) => m.geometry.map((p: any) => [p.lon, p.lat] as LngLat));
      const rings: LngLat[][] = []; const eq = (a: LngLat, b: LngLat) => Math.abs(a[0] - b[0]) < 1e-7 && Math.abs(a[1] - b[1]) < 1e-7;
      while (segs.length) { let cur = segs.shift()!; for (let g = 0; g < 500 && !eq(cur[0], cur[cur.length - 1]); g++) { const k = segs.findIndex(s => eq(s[0], cur[cur.length - 1]) || eq(s[s.length - 1], cur[cur.length - 1])); if (k < 0) break; const s = segs.splice(k, 1)[0]; cur = cur.concat(eq(s[0], cur[cur.length - 1]) ? s.slice(1) : [...s].reverse().slice(1)); } if (cur.length > 3) rings.push(cur); }
      ring = rings.sort((a, b) => area(b) - area(a))[0] ?? null;
    }
    if (!ring) continue;
    if (eq2(ring[0], ring[ring.length - 1])) ring = ring.slice(0, -1);
    out.push({ id: `${e.type}/${e.id}`, name: e.tags?.name ?? e.tags?.['name:uz'] ?? e.tags?.['name:ru'] ?? 'Nomsiz bogʻ', ring, areaHa: area(ring) });
  }
  return out.filter(p => p.areaHa >= 0.1).sort((a, b) => a.areaHa - b.areaHa);
}
const eq2 = (a: LngLat, b: LngLat) => a[0] === b[0] && a[1] === b[1];

export async function parksAt(c: LngLat, f: typeof fetch = fetch, onTry: (m: string) => void = () => {}): Promise<ParkCand[]> {
  return parseParks(await overpass(parkQuery(c), f, onTry));
}
export { area as ringAreaHa };
