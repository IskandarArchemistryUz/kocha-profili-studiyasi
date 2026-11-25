/**
 * Kontekst menejeri: keshdan oʻqish → boʻlmasa workerda yuklash → keshga yozish.
 * Bir vaqtda bitta soʻrov; eskirgan javoblar tashlab yuboriladi.
 */
import type { LngLat } from '../core/doc';
import { cacheGet, cachePut } from '../storage/db';
import { cacheKey, liteKey, farKey, fetchContext, fetchFar, legacyKeys, refresh, type ContextBundle, type FarBundle, type Progress } from './load';
import { PARSER_V } from './osm';
import { fetchPoi, poiKey, type PoiBundle, joyRoadR, joyObjR, joyRoadKey, joyObjKey, fetchPoiObjs, fetchRoadsOverpass, POI_R } from './poi';
import { fetchOfmRoads } from './ofm';
import { bboxAround } from './osm';

/** Joyshunos: Overpass yoʻllarini shuncha kutib, keyin OpenFreeMap plitkalariga oʻtiladi */
export const JOY_OVP_WAIT = 12_000;

export class ContextManager {
  private w: Worker | null = null;
  private seq = 0;
  current: ContextBundle | null = null;
  /** lite — koʻcha tahlili: relyef va sunʼiy yoʻldosh tasviri yuklanmaydi (tezroq); toʻliq keshdagi nusxa boʻlsa — oʻsha ishlatiladi */
  constructor(private lite = false) {}

  private worker(): Worker | null {
    if (this.w) return this.w;
    try { this.w = new Worker(new URL('../workers/context.worker.ts', import.meta.url), { type: 'module' }); } catch { this.w = null; }
    return this.w;
  }

  /** Faqat keshdan (sahifa yangilanganda) */
  /** Keshdan: joriy kalit (xom maʼlumot boʻlsa qayta tahlil qilinadi), boʻlmasa — oldingi versiya kalitlari (legacy=true) */
  async fromCache(center: LngLat, radius: number, legacy = false): Promise<ContextBundle | null> {
    try {
      let b = await cacheGet<ContextBundle>(cacheKey(center, radius));
      if (b) { const f = refresh(b); if (f !== b) { b = f; void cachePut(cacheKey(center, radius), b).catch(() => {}); } this.current = b; return b; }
      if (legacy) for (const k of legacyKeys(center, radius)) { const o = await cacheGet<ContextBundle>(k); if (o) return o; }
    } catch { /* kesh ochilmadi */ }
    return null;
  }

  async load(center: LngLat, radius: number, progress: Progress, force = false): Promise<ContextBundle> {
    const id = ++this.seq;
    if (this.lite && !force) {
      // avval toʻliq kontekst (Joyshunos sahnasi yuklagan), keyin yengil kesh
      const full = await this.fromCache(center, radius);
      if (full && full.pv === PARSER_V) return full;
      try { const l = await cacheGet<ContextBundle>(liteKey(center, radius)); if (l && l.pv === PARSER_V && l.ov !== undefined && Date.now() - Date.parse(l.fetched) < 30 * 86_400_000) { this.current = l; return l; } } catch { /* kesh */ }
    }
    if (!force && !this.lite) {
      const c = await this.fromCache(center, radius);
      // keshdagi nusxa yaroqli, lekin Overture qoʻshilmasdan oldingi (yoki 30 kundan eski) — tarmoqdan yangilab olinadi; tarmoq boʻlmasa quyida shu nusxa qaytadi
      const old = c && (c.ov === undefined || Date.now() - Date.parse(c.fetched) > 30 * 86_400_000);
      if (c && c.pv === PARSER_V && !old) return c;
    }
    let b: ContextBundle;
    try { b = await this.fetch(id, center, radius, progress); }
    catch (e) {
      // tarmoq ishlamadi: keshdagi har qanday nusxa — ogohlantirish bilan
      const old = (await this.fromCache(center, radius)) ?? (await this.fromCache(center, radius, true));
      if (id !== this.seq) throw new Error('eskirdi');
      if (old) { this.current = { ...old, stale: (e as Error).message }; return this.current; }
      throw e;
    }
    if (id !== this.seq) throw new Error('eskirdi');
    this.current = b;
    try { await cachePut((this.lite ? liteKey : cacheKey)(center, radius), b); } catch (e) { console.warn('Kontekst keshga yozilmadi', e); }
    return b;
  }

  /** Gorizontgacha binolar: keshdan yoki tarmoqdan (xato boʻlsa — jim, null) */
  async loadFar(center: LngLat, radius: number): Promise<FarBundle | null> {
    const k = farKey(center, radius);
    try { const c = await cacheGet<FarBundle>(k); if (c) return c; } catch { /* kesh */ }
    try { const b = await fetchFar(center, radius); void cachePut(k, b).catch(() => {}); return b; } catch (e) { console.warn('Uzoq kontekst yuklanmadi', e); return null; }
  }

  /** Ijtimoiy obyektlar (OSM): keshdan yoki tarmoqdan; force — kesh eʼtiborsiz */
  async loadPoi(center: LngLat, force = false): Promise<PoiBundle> {
    const k = poiKey(center);
    if (!force) try { const c = await cacheGet<PoiBundle>(k); if (c) return c; } catch { /* kesh */ }
    const b = await fetchPoi(center); void cachePut(k, b).catch(() => {}); return b;
  }

  /** 25.11 (Joyshunos): yoʻllar — ≤ 2 km da avval Overpass (JOY_OVP_WAIT), keyin — OpenFreeMap plitkalari (boʻlmasa Overpass), obyektlar — alohida yengil Overpass soʻrovi.
   *  Har biri oʻz keshida: obyektlar yuklanmasa yoʻllar baribir qaytadi (pErr bilan), keyingi safar faqat obyektlar qayta soʻraladi. */
  async loadJoyPoi(center: LngLat, r: number, force = false): Promise<PoiBundle & { pErr?: string; rSrc?: 'ofm' | 'overpass' }> {
    const RR = joyRoadR(r), RO = joyObjR(r), kr = joyRoadKey(center, RR), ko = joyObjKey(center, RO);
    const get = async <T,>(k: string): Promise<T | null> => { if (force) return null; try { return await cacheGet<T>(k); } catch { return null; } };
    type Rd = { roads: PoiBundle['roads']; src: 'ofm' | 'overpass' }; type Ob = { pois: PoiBundle['pois']; attr: NonNullable<PoiBundle['attr']> };
    const roadsP = (async (): Promise<Rd> => {
      const c = await get<Rd>(kr); if (c) return c;
      let v: Rd | null = null;
      // ≤ 2 km tarmoq: avval Overpass (OSM tugunlari bilan toʻliq bogʻlangan, Toshkent markazida 99,7 %), JOY_OVP_WAIT ichida javob bermasa — plitkalar
      if (RR <= POI_R) v = await Promise.race([fetchRoadsOverpass(center, RR).then(roads => (roads.length ? { roads, src: 'overpass' as const } : null)).catch(() => null), new Promise<null>(r => setTimeout(() => r(null), JOY_OVP_WAIT))]);
      if (!v) try { const roads = await fetchOfmRoads(bboxAround(center, RR), fetch.bind(globalThis)); if (roads.length) v = { roads, src: 'ofm' }; } catch { /* plitkalar ochilmadi */ }
      if (!v) { const b = await fetchPoi(center); v = { roads: b.roads, src: 'overpass' }; }   // oxirgi zaxira — avvalgi yoʻl (2 km)
      void cachePut(kr, v).catch(() => {}); return v;
    })();
    const objP = (async (): Promise<Ob> => { const c = await get<Ob>(ko); if (c) return c; const v = await fetchPoiObjs(center, RO); void cachePut(ko, v).catch(() => {}); return v; })();
    const [rd, ob] = await Promise.allSettled([roadsP, objP]);
    if (rd.status === 'rejected') throw rd.reason;
    const base = { center, radius: RR, fetched: new Date().toISOString(), roads: rd.value.roads, rSrc: rd.value.src };
    return ob.status === 'fulfilled' ? { ...base, pois: ob.value.pois, attr: ob.value.attr } : { ...base, pois: [], attr: [], pErr: (ob.reason as Error)?.message || String(ob.reason) };
  }

  private fetch(id: number, center: LngLat, radius: number, progress: Progress): Promise<ContextBundle> {
    const w = this.worker();
    if (!w) return fetchContext(center, radius, progress, fetch.bind(globalThis), this.lite);
    return new Promise((ok, no) => {
      const on = (e: MessageEvent<{ id: number; progress?: { msg: string; frac: number }; bundle?: ContextBundle; error?: string }>) => {
        if (e.data.id !== id) return;
        if (e.data.progress) { progress(e.data.progress.msg, e.data.progress.frac); return; }
        w.removeEventListener('message', on);
        if (e.data.bundle) ok(e.data.bundle); else no(new Error(e.data.error || 'Nomaʼlum xato'));
      };
      w.addEventListener('message', on);
      w.postMessage({ id, center, radius, lite: this.lite });
    });
  }
}
