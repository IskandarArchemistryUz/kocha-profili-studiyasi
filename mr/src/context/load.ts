/**
 * Kontekstni yuklash: OSM (Overpass, zaxira serverlar bilan), relyef va sunʼiy yoʻldosh tasviri.
 * Yuklash va tahlil workerda; natija IndexedDB keshiga yoziladi va sahifa yangilanganda tarmoqsiz tiklanadi.
 */
import type { LngLat } from '../core/doc';
import { bboxAround, overpassQuery, parseOverpass, type OsmData } from './osm';
import { loadImagery, loadTerrain, type Imagery, type TerrainGrid } from './tiles';

export const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

export interface ContextBundle {
  v: 1;
  center: LngLat;
  radius: number;
  fetched: string;
  osm: OsmData;
  terrain: TerrainGrid | null;
  imagery: Imagery | null;
  /** qaysi qism yuklanmadi (foydalanuvchiga aytiladi) */
  missing: string[];
}

export const cacheKey = (c: LngLat, r: number) => `ctx2:${c[0].toFixed(4)},${c[1].toFixed(4)},${Math.round(r)}`;

export type Progress = (msg: string, frac: number) => void;

async function overpass(q: string, f: typeof fetch, onTry: (i: number) => void): Promise<unknown> {
  let last: unknown = null;
  for (let i = 0; i < OVERPASS.length; i++) {
    onTry(i);
    try {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 60_000);
      const r = await f(OVERPASS[i], { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: ctl.signal });
      clearTimeout(t);
      if (!r.ok) { last = new Error(`Overpass ${r.status}`); continue; }
      return await r.json();
    } catch (e) { last = e; }
  }
  throw new Error('OSM serverlari javob bermadi' + (last ? ` (${String((last as Error).message || last)})` : '') + '. Birozdan keyin qayta urinib koʻring.');
}

/** Tarmoqdan toʻliq yuklash (worker yoki asosiy oqimda) */
export async function fetchContext(center: LngLat, radius: number, progress: Progress = () => {}, f: typeof fetch = fetch.bind(globalThis)): Promise<ContextBundle> {
  const bb = bboxAround(center, radius), missing: string[] = [];
  progress('OSM: binolar, yoʻllar, suv, yashil hududlar…', 0.05);
  const osmP = overpass(overpassQuery(bb), f, i => i && progress(`OSM: zaxira server ${i + 1}…`, 0.1)).then(j => { progress('OSM tahlil qilinmoqda…', 0.55); return parseOverpass(j as never); });
  const terrP = loadTerrain(center, radius, bb, f).catch(() => null);
  let done = 0;
  const imgP = loadImagery(radius, bb, f, () => { done++; if (done % 8 === 0) progress(`Sunʼiy yoʻldosh tasviri: ${done} plitka…`, 0.3); }).catch(() => null);
  const [osm, terrain, imagery] = await Promise.all([osmP, terrP, imgP]);
  if (!terrain) missing.push('relyef');
  if (!imagery) missing.push('sunʼiy yoʻldosh tasviri');
  progress('Tayyor', 1);
  return { v: 1, center, radius, fetched: new Date().toISOString(), osm, terrain, imagery, missing };
}
