/**
 * Hisob yadrosi mijozi: hujjatni workerga yuboradi va faqat eng soʻnggi natijani qaytaradi
 * (tez-tez oʻzgarishda eski natija yangisining ustiga yozilmaydi).
 */
import type { Project } from '../core/doc';
import type { Derived } from '../core/derive';
import { derive } from '../core/derive';
import { evaluateAll, type Result } from '../norms/rules';

export interface Computed { d: Derived; results: Result[] }

export class Compute {
  private w: Worker | null = null;
  private seq = 0;
  private wait = new Map<number, (c: Computed) => void>();
  constructor() {
    try {
      this.w = new Worker(new URL('./compute.worker.ts', import.meta.url), { type: 'module' });
      this.w.onmessage = (e: MessageEvent<{ id: number; d?: Derived; results?: Result[]; error?: string }>) => {
        const f = this.wait.get(e.data.id); this.wait.delete(e.data.id);
        if (f && e.data.d) f({ d: e.data.d, results: e.data.results! });
        else if (e.data.error) console.error('Hisob xatosi:', e.data.error);
      };
      this.w.onerror = e => { console.error('Worker ishlamadi, asosiy oqimda hisoblanadi', e); this.w = null; };
    } catch { this.w = null; }
  }

  /** Natija faqat eng oxirgi soʻrov uchun keladi; oldingilari tashlab yuboriladi */
  run(doc: Project): Promise<Computed> {
    const id = ++this.seq;
    if (!this.w) { const d = derive(doc); return Promise.resolve({ d, results: evaluateAll(d, doc) }); }
    return new Promise(ok => {
      this.wait.forEach((_, k) => { if (k < id) this.wait.delete(k); });
      this.wait.set(id, ok); this.w!.postMessage({ id, doc });
    });
  }
}
