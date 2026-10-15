/**
 * Holat ombori: joriy hujjat + tarix (undo/redo).
 * Interfeys hujjatni faqat dispatch() orqali oʻzgartiradi; obunachilar (sahna, panel, avtosaqlash)
 * har oʻzgarishda yangi hujjatni oladi.
 */
import { apply, type Command, label } from './commands';
import type { Project } from './doc';

export interface Change { doc: Project; reason: 'dispatch' | 'undo' | 'redo' | 'load'; label?: string }
type Listener = (c: Change) => void;

interface Entry { doc: Project; label: string; key?: string; t: number }

export class Store {
  private cur: Project;
  private past: Entry[] = [];
  private future: Entry[] = [];
  private subs = new Set<Listener>();
  constructor(doc: Project, private limit = 200, private clock: () => number = () => Date.now()) { this.cur = doc; }

  get doc(): Project { return this.cur; }
  get canUndo(): boolean { return this.past.length > 0; }
  get canRedo(): boolean { return this.future.length > 0; }
  get undoLabel(): string | undefined { return this.past.at(-1)?.label; }
  get redoLabel(): string | undefined { return this.future.at(-1)?.label; }

  /**
   * mergeKey: bir xil kalit bilan 800 ms ichida kelgan buyruqlar (masalan, slayder sudralganda)
   * tarixda bitta qadam boʻlib qoladi.
   */
  dispatch(c: Command, mergeKey?: string): Project {
    const next = apply(this.cur, c);
    const now = this.clock(), last = this.past.at(-1);
    if (mergeKey && last && last.key === mergeKey && now - last.t < 800) { last.t = now; }
    else {
      this.past.push({ doc: this.cur, label: label(c), key: mergeKey, t: now });
      if (this.past.length > this.limit) this.past.shift();
    }
    this.future = [];
    this.cur = next;
    this.emit({ doc: next, reason: 'dispatch', label: label(c) });
    return next;
  }

  undo(): boolean {
    const e = this.past.pop(); if (!e) return false;
    this.future.push({ doc: this.cur, label: e.label, t: this.clock() });
    this.cur = e.doc; this.emit({ doc: this.cur, reason: 'undo', label: e.label }); return true;
  }

  redo(): boolean {
    const e = this.future.pop(); if (!e) return false;
    this.past.push({ doc: this.cur, label: e.label, t: this.clock() });
    this.cur = e.doc; this.emit({ doc: this.cur, reason: 'redo', label: e.label }); return true;
  }

  /** Boshqa loyihani ochish — tarix tozalanadi */
  load(doc: Project): void { this.cur = doc; this.past = []; this.future = []; this.emit({ doc, reason: 'load' }); }

  subscribe(fn: Listener): () => void { this.subs.add(fn); return () => this.subs.delete(fn); }
  private emit(c: Change) { this.subs.forEach(f => { try { f(c); } catch (e) { console.error(e); } }); }
}
