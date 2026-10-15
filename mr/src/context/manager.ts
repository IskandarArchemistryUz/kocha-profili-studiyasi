/**
 * Kontekst menejeri: keshdan oʻqish → boʻlmasa workerda yuklash → keshga yozish.
 * Bir vaqtda bitta soʻrov; eskirgan javoblar tashlab yuboriladi.
 */
import type { LngLat } from '../core/doc';
import { cacheGet, cachePut } from '../storage/db';
import { cacheKey, farKey, fetchContext, fetchFar, legacyKeys, refresh, type ContextBundle, type FarBundle, type Progress } from './load';
import { PARSER_V } from './osm';
import { fetchPoi, poiKey, type PoiBundle } from './poi';

export class ContextManager {
  private w: Worker | null = null;
  private seq = 0;
  current: ContextBundle | null = null;

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
    if (!force) { const c = await this.fromCache(center, radius); if (c && c.pv === PARSER_V) return c; }
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
    try { await cachePut(cacheKey(center, radius), b); } catch (e) { console.warn('Kontekst keshga yozilmadi', e); }
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

  private fetch(id: number, center: LngLat, radius: number, progress: Progress): Promise<ContextBundle> {
    const w = this.worker();
    if (!w) return fetchContext(center, radius, progress);
    return new Promise((ok, no) => {
      const on = (e: MessageEvent<{ id: number; progress?: { msg: string; frac: number }; bundle?: ContextBundle; error?: string }>) => {
        if (e.data.id !== id) return;
        if (e.data.progress) { progress(e.data.progress.msg, e.data.progress.frac); return; }
        w.removeEventListener('message', on);
        if (e.data.bundle) ok(e.data.bundle); else no(new Error(e.data.error || 'Nomaʼlum xato'));
      };
      w.addEventListener('message', on);
      w.postMessage({ id, center, radius });
    });
  }
}
