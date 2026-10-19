/**
 * Kontekstni yuklash: OSM (Overpass, zaxira serverlar bilan), relyef va sunʼiy yoʻldosh tasviri.
 * Yuklash va tahlil workerda; natija IndexedDB keshiga yoziladi va sahifa yangilanganda tarmoqsiz tiklanadi.
 */
import type { LngLat } from '../core/doc';
import { bboxAround, overpassQuery, parseOverpass, PARSER_V, type BBox, type OsmData } from './osm';
import { loadImagery, loadTerrain, type Imagery, type TerrainGrid } from './tiles';
import { fetchOfm } from './ofm';

export const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
/** urinishlar: [serverlar guruhi (parallel — birinchi javob olinadi), oldin kutish (ms)] — bepul serverlar tez-tez «band» (429/503/504) qaytaradi */
const PLAN: [number[], number][] = [[[0, 1, 2, 3], 0], [[0, 1, 2, 3], 4000], [[0, 1, 2, 3], 10000]];   // Oʻzbekistondan overpass-api.de va kumi koʻpincha ochilmaydi (CORS/429) — hammasi birdan, birinchi javob

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
    const [srv, wait] = PLAN[k];
    if (wait) { onTry(`OSM serverlari band — ${Math.round(wait / 1000)} s dan keyin qayta urinish (${k + 1}/${PLAN.length})…`); await new Promise(r => setTimeout(r, wait)); }
    else if (k) onTry('OSM: zaxira serverlar…');
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 60_000);
    const one = async (i: number): Promise<unknown> => {
      const r = await f(OVERPASS[i], { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: ctl.signal });
      if (!r.ok) throw new Error(`Overpass ${r.status}`);
      const j = await r.json() as { elements?: unknown[]; remark?: string };
      if (!Array.isArray(j.elements)) throw new Error(j.remark ? `Overpass: ${j.remark.slice(0, 80)}` : 'Overpass: boʻsh javob');
      return j;
    };
    try { const j = await Promise.any(srv.map(one)); ctl.abort(); clearTimeout(t); return j; }   // birinchi muvaffaqiyatli javob; qolganlari toʻxtatiladi
    catch (e) { last = (e as AggregateError).errors?.[0] ?? e; clearTimeout(t); }
  }
  throw new Error('OSM serverlari javob bermadi' + (last ? ` (${String((last as Error).message || last)})` : '') + '. Birozdan keyin qayta urinib koʻring.');
}

/** Overpass shuncha vaqt javob bermasa — OpenFreeMap plitkalari (tez, lekin teglari kam) */
export const OVERPASS_WAIT = 9000;
/**
 * OSM maʼlumoti: Overpass (toʻliq teglar) va OpenFreeMap (tez) parallel; Overpass `wait` ms ichida javob bersa — u,
 * aks holda tayyor boʻlgan OFM; Overpass butunlay yiqilsa — OFM; ikkalasi ham yiqilsa — Overpass xatosi.
 */
export async function osmWithFallback(bb: BBox, f: typeof fetch, onTry: (m: string) => void, wait = OVERPASS_WAIT): Promise<{ osm: OsmData; raw: unknown; src: 'overpass' | 'ofm' }> {
  const ovp = overpass(overpassQuery(bb), f, onTry).then(j => ({ osm: parseOverpass(j as never), raw: j, src: 'overpass' as const }));
  const ofm = fetchOfm(bb, f).then(osm => ({ osm, raw: null, src: 'ofm' as const }));
  ovp.catch(() => {}); ofm.catch(() => {});
  const timer = new Promise<'vaqt'>(r => setTimeout(() => r('vaqt'), wait));
  const first = await Promise.race([ovp.catch(() => 'xato' as const), timer]);
  if (first !== 'vaqt' && first !== 'xato') return first;
  if (first === 'vaqt') onTry('OSM serveri sekin — OpenFreeMap plitkalaridan…');
  try { return await ofm; } catch { /* OFM ham yoʻq — Overpassni kutamiz */ }
  return ovp;
}

/** Relyef toʻri qadami, m: katta hududda siyrakroq (toʻr ~600×600 dan oshmasin) */
export const terrainStep = (r: number) => (r <= 2000 ? 10 : r <= 4000 ? 15 : 20);

/** Tarmoqdan toʻliq yuklash (worker yoki asosiy oqimda) */
export async function fetchContext(center: LngLat, radius: number, progress: Progress = () => {}, f: typeof fetch = fetch.bind(globalThis)): Promise<ContextBundle> {
  const bb = bboxAround(center, radius), missing: string[] = [];
  progress('OSM: binolar, yoʻllar, suv, yashil hududlar…', 0.05);
  let raw: unknown = null; const srcBox = { src: 'overpass' as 'overpass' | 'ofm' };
  const osmP = osmWithFallback(bb, f, m => progress(m, 0.1), OVERPASS_WAIT).then(r => { raw = r.raw; srcBox.src = r.src; progress('OSM tahlil qilinmoqda…', 0.55); return r.osm; });
  const terrP = loadTerrain(center, radius, bb, f, terrainStep(radius)).catch(() => null);   // katta hudud — siyrakroq toʻr (xotira)
  let done = 0;
  const imgP = loadImagery(radius, bb, f, () => { done++; if (done % 8 === 0) progress(`Sunʼiy yoʻldosh tasviri: ${done} plitka…`, 0.3); }).catch(() => null);
  const [osm, terrain, imagery] = await Promise.all([osmP, terrP, imgP]);
  if (!terrain) missing.push('relyef');
  if (!imagery) missing.push('sunʼiy yoʻldosh tasviri');
  if (srcBox.src === 'ofm') missing.push('OSM teglari (Overpass javob bermadi — OpenFreeMap plitkalari: balandliklar taxminiy, daraxtlar yoʻq)');
  progress('Tayyor', 1);
  return { v: 1, center, radius, fetched: new Date().toISOString(), osm, pv: PARSER_V, raw, terrain, imagery, missing };
}

/* ---------- uzoq kontekst (gorizont): faqat binolar, kattaroq radiusda ---------- */
export interface FarBundle { center: LngLat; radius: number; outer: number; fetched: string; buildings: { rings: LngLat[][]; h: number }[] }
export const farKey = (c: LngLat, r: number) => `far1:${pos(c, r)}`;
export const farRadius = (r: number) => Math.min(2200, Math.max(1200, r * 2.6));

export async function fetchFar(center: LngLat, radius: number, f: typeof fetch = fetch.bind(globalThis)): Promise<FarBundle> {
  const outer = farRadius(radius), bb = bboxAround(center, outer), q = `[out:json][timeout:120][bbox:${bb.map(v => v.toFixed(6)).join(',')}];way["building"];out geom qt;`;
  // gorizont uchun aniq teglar shart emas — avval tez OpenFreeMap, boʻlmasa Overpass
  const osm = await fetchOfm(bb, f).catch(async () => parseOverpass(await overpass(q, f, () => {}) as never)), inner = bboxAround(center, radius);
  // asosiy kvadrat ichidagilar allaqachon batafsil chizilgan
  const inSq = (p: LngLat) => p[1] > inner[0] && p[1] < inner[2] && p[0] > inner[1] && p[0] < inner[3];
  const buildings = osm.buildings.filter(b => !inSq(b.rings[0][0])).map(b => ({ rings: [b.rings[0].map(p => [Math.round(p[0] * 1e6) / 1e6, Math.round(p[1] * 1e6) / 1e6] as LngLat)], h: b.h }));
  return { center, radius, outer, fetched: new Date().toISOString(), buildings };
}
