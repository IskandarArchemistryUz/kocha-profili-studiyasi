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
  /** 12.11: worker band boʻlsa — faqat eng oxirgi hujjat navbatda turadi (oraliq tahrirlar hisoblanmaydi).
   *  Avval har tahrir workerga yuborilardi va ketma-ket hisoblanardi: 26 ta tez tahrirda KPI va qoidalar ~40 s kechikardi. */
  private busy = false;
  private pending: { id: number; doc: Project } | null = null;
  private send(id: number, doc: Project): void { this.busy = true; this.w!.postMessage({ id, doc }); }
  private next(): void { this.busy = false; const p = this.pending; this.pending = null; if (p && this.wait.has(p.id)) this.send(p.id, p.doc); }
  constructor() {
    try {
      this.w = new Worker(new URL('./compute.worker.ts', import.meta.url), { type: 'module' });
      this.w.onmessage = (e: MessageEvent<{ id: number; d?: Derived; results?: Result[]; error?: string }>) => {
        const f = this.wait.get(e.data.id); this.wait.delete(e.data.id);
        if (f && e.data.d) f({ d: e.data.d, results: e.data.results! });
        else if (e.data.error) console.error('Hisob xatosi:', e.data.error);
        this.next();
      };
      this.w.onerror = e => { console.error('Worker ishlamadi, asosiy oqimda hisoblanadi', e); this.w = null; this.busy = false; const p = this.pending; this.pending = null; const f = p && this.wait.get(p.id); if (p && f) { this.wait.delete(p.id); const d = derive(p.doc); f({ d, results: evaluateAll(d, p.doc) }); } };
    } catch { this.w = null; }
  }

  /** Natija faqat eng oxirgi soʻrov uchun keladi; oldingilari tashlab yuboriladi */
  run(doc: Project): Promise<Computed> {
    const id = ++this.seq;
    if (!this.w) { const d = derive(doc); return Promise.resolve({ d, results: evaluateAll(d, doc) }); }
    return new Promise(ok => {
      this.wait.forEach((_, k) => { if (k < id) this.wait.delete(k); });
      this.wait.set(id, ok);
      if (this.busy) this.pending = { id, doc }; else this.send(id, doc);
    });
  }
}
