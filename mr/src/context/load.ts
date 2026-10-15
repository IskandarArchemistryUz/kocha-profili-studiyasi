/**
 * Kontekstni yuklash: OSM (Overpass, zaxira serverlar bilan), relyef va sunʼiy yoʻldosh tasviri.
 * Yuklash va tahlil workerda; natija IndexedDB keshiga yoziladi va sahifa yangilanganda tarmoqsiz tiklanadi.
 */
import type { LngLat } from '../core/doc';
import { bboxAround, overpassQuery, parseOverpass, PARSER_V, type OsmData } from './osm';
import { loadImagery, loadTerrain, type Imagery, type TerrainGrid } from './tiles';

export const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'];
/** urinishlar: [server, oldin kutish (ms)] — bepul serverlar tez-tez «band» (429/503/504) qaytaradi */
const PLAN: [number, number][] = [[0, 0], [1, 0], [0, 4000], [1, 4000], [0, 12000]];

export interface ContextBundle {
  v: 1;
  center: LngLat;
  radius: number;
  fetched: string;
  osm: OsmData;
  /** tahlilchi versiyasi — oʻzgarsa, xom maʼlumotdan qayta tahlil qilinadi (tarmoqsiz) */
  pv?: number;
  /** Overpass xom javobi */
  raw?: unknown;
  /** tarmoq ishlamadi — eski nusxa koʻrsatilmoqda */
  stale?: string;
  terrain: TerrainGrid | null;
  imagery: Imagery | null;
  /** qaysi qism yuklanmadi (foydalanuvchiga aytiladi) */
  missing: string[];
}

const pos = (c: LngLat, r: number) => `${c[0].toFixed(4)},${c[1].toFixed(4)},${Math.round(r)}`;
export const cacheKey = (c: LngLat, r: number) => `ctx:${pos(c, r)}`;
/** oldingi versiyalar kaliti — tarmoq ishlamasa zaxira sifatida */
export const legacyKeys = (c: LngLat, r: number) => ['ctx4', 'ctx3', 'ctx2', 'ctx1'].map(v => `${v}:${pos(c, r)}`);

/** Keshdagi toʻplamni joriy tahlilchiga keltirish (xom maʼlumot boʻlsa — qayta tahlil) */
export function refresh(b: ContextBundle): ContextBundle {
  if (b.pv === PARSER_V || !b.raw) return b;
  return { ...b, osm: parseOverpass(b.raw as never), pv: PARSER_V };
}

export type Progress = (msg: string, frac: number) => void;

export async function overpass(q: string, f: typeof fetch, onTry: (msg: string) => void): Promise<unknown> {
  let last: unknown = null;
  for (let k = 0; k < PLAN.length; k++) {
    const [i, wait] = PLAN[k];
    if (wait) { onTry(`OSM server band — ${Math.round(wait / 1000)} s dan keyin qayta urinish (${k + 1}/${PLAN.length})…`); await new Promise(r => setTimeout(r, wait)); }
    else if (k) onTry(`OSM: zaxira server…`);
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
  let raw: unknown = null;
  const osmP = overpass(overpassQuery(bb), f, m => progress(m, 0.1)).then(j => { raw = j; progress('OSM tahlil qilinmoqda…', 0.55); return parseOverpass(j as never); });
  const terrP = loadTerrain(center, radius, bb, f).catch(() => null);
  let done = 0;
  const imgP = loadImagery(radius, bb, f, () => { done++; if (done % 8 === 0) progress(`Sunʼiy yoʻldosh tasviri: ${done} plitka…`, 0.3); }).catch(() => null);
  const [osm, terrain, imagery] = await Promise.all([osmP, terrP, imgP]);
  if (!terrain) missing.push('relyef');
  if (!imagery) missing.push('sunʼiy yoʻldosh tasviri');
  progress('Tayyor', 1);
  return { v: 1, center, radius, fetched: new Date().toISOString(), osm, pv: PARSER_V, raw, terrain, imagery, missing };
}

/* ---------- uzoq kontekst (gorizont): faqat binolar, kattaroq radiusda ---------- */
export interface FarBundle { center: LngLat; radius: number; outer: number; fetched: string; buildings: { rings: LngLat[][]; h: number }[] }
export const farKey = (c: LngLat, r: number) => `far1:${pos(c, r)}`;
export const farRadius = (r: number) => Math.min(2200, Math.max(1200, r * 2.6));

export async function fetchFar(center: LngLat, radius: number, f: typeof fetch = fetch.bind(globalThis)): Promise<FarBundle> {
  const outer = farRadius(radius), bb = bboxAround(center, outer), q = `[out:json][timeout:120][bbox:${bb.map(v => v.toFixed(6)).join(',')}];way["building"];out geom qt;`;
  const j = await overpass(q, f, () => {});
  const osm = parseOverpass(j as never), inner = bboxAround(center, radius);
  // asosiy kvadrat ichidagilar allaqachon batafsil chizilgan
  const inSq = (p: LngLat) => p[1] > inner[0] && p[1] < inner[2] && p[0] > inner[1] && p[0] < inner[3];
  const buildings = osm.buildings.filter(b => !inSq(b.rings[0][0])).map(b => ({ rings: [b.rings[0].map(p => [Math.round(p[0] * 1e6) / 1e6, Math.round(p[1] * 1e6) / 1e6] as LngLat)], h: b.h }));
  return { center, radius, outer, fetched: new Date().toISOString(), buildings };
}
