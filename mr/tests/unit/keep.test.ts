import { describe, it, expect } from 'vitest';
import { reconcileKeep } from '../../src/core/keep';
import { apply } from '../../src/core/commands';
import { migrate, blankProject } from '../../src/core/doc';

const O: [number, number] = [69.24, 41.31];
const dx = 1 / 84000, dy = 1 / 111000;   // ≈ 1 m
describe('saqlanadigan binolar barqarorligi', () => {
  it('id mos kelsa — oʻzgarmaydi, markaz toʻldiriladi', () => {
    const r = reconcileKeep([5], undefined, [{ id: 5, c: O }, { id: 6, c: [O[0] + 30 * dx, O[1]] }], O);
    expect(r.keep).toEqual([5]); expect(r.keepAt['5']).toEqual(O); expect(r.changed).toBe(true);
  });
  it('id oʻzgarsa — markaz boʻyicha qayta bogʻlanadi', () => {
    const at = { 5: O, 7: [O[0] + 40 * dx, O[1]] as [number, number] };
    const r = reconcileKeep([5, 7], at, [{ id: -101, c: [O[0] + 2 * dx, O[1] + 1 * dy] }, { id: -102, c: [O[0] + 41 * dx, O[1]] }, { id: -103, c: [O[0] + 80 * dx, O[1]] }], O);
    expect(r.keep.sort()).toEqual([-102, -101].sort()); expect(r.changed).toBe(true);
  });
  it('uzoqdagi bino bilan almashtirmaydi; markazsiz id saqlanadi', () => {
    const r = reconcileKeep([5, 9], { 5: O }, [{ id: 1, c: [O[0] + 20 * dx, O[1]] }], O);
    expect(r.keep).toEqual([5, 9]); expect(r.changed).toBe(false);
  });
  it('setKeep markazlarni saqlaydi va hujjatda yoʻqolmaydi', () => {
    let d = { ...blankProject('t'), origin: O };
    d = apply(d, { type: 'setKeep', keep: [3, 4], at: { 3: O, 4: O, 8: O } });
    expect(Object.keys(d.keepAt ?? {}).sort()).toEqual(['3', '4']);
    const p = migrate(JSON.parse(JSON.stringify(d)));
    expect(p.keepAt?.['3']).toEqual(O);
    d = apply(d, { type: 'setKeep', keep: [] }); expect(d.keepAt).toBeUndefined();
  });
});
