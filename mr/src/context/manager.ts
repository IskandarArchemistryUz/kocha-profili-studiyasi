/**
 * Kontekst menejeri: keshdan oʻqish → boʻlmasa workerda yuklash → keshga yozish.
 * Bir vaqtda bitta soʻrov; eskirgan javoblar tashlab yuboriladi.
 */
import type { LngLat } from '../core/doc';
import { cacheGet, cachePut } from '../storage/db';
import { cacheKey, fetchContext, type ContextBundle, type Progress } from './load';

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
  async fromCache(center: LngLat, radius: number): Promise<ContextBundle | null> {
    try { const b = await cacheGet<ContextBundle>(cacheKey(center, radius)); if (b) this.current = b; return b; } catch { return null; }
  }

  async load(center: LngLat, radius: number, progress: Progress, force = false): Promise<ContextBundle> {
    const id = ++this.seq;
    if (!force) { const c = await this.fromCache(center, radius); if (c) return c; }
    const b = await this.fetch(id, center, radius, progress);
    if (id !== this.seq) throw new Error('eskirdi');
    this.current = b;
    try { await cachePut(cacheKey(center, radius), b); } catch (e) { console.warn('Kontekst keshga yozilmadi', e); }
    return b;
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
