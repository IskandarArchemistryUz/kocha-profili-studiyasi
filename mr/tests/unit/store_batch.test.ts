import { describe, it, expect } from 'vitest';
import { Store } from '../../src/core/store';
import { blankProject } from '../../src/core/doc';

/** 18.11 (T0): Store.batch — bir nechta buyruq bitta tarix qadami va bitta xabar */
describe('Store.batch', () => {
  const mk = () => new Store(blankProject('Sinov'));
  it('ichidagi dispatch lar — bitta emit, bitta undo', () => {
    const s = mk(); let n = 0; s.subscribe(() => n++);
    const r = s.batch(() => { s.dispatch({ type: 'rename', name: 'A' }); s.dispatch({ type: 'rename', name: 'B' }); s.dispatch({ type: 'rename', name: 'C' }); return 7; });
    expect(r).toBe(7); expect(n).toBe(1); expect(s.doc.name).toBe('C');
    s.undo(); expect(s.doc.name).toBe('Sinov'); expect(s.canUndo).toBe(false);
  });
  it('ichma-ich paket — tashqisiga qoʻshiladi', () => {
    const s = mk(); let n = 0; s.subscribe(() => n++);
    s.batch(() => { s.dispatch({ type: 'rename', name: 'A' }); s.batch(() => s.dispatch({ type: 'rename', name: 'B' })); });
    expect(n).toBe(1); s.undo(); expect(s.doc.name).toBe('Sinov');
  });
  it('oʻzgarish boʻlmasa — xabar yoʻq; xato boʻlsa ham qoʻllangani koʻrsatiladi', () => {
    const s = mk(); let n = 0; s.subscribe(() => n++);
    s.batch(() => {}); expect(n).toBe(0);
    expect(() => s.batch(() => { s.dispatch({ type: 'rename', name: 'A' }); throw new Error('x'); })).toThrow('x');
    expect(n).toBe(1); expect(s.doc.name).toBe('A');
  });
});
