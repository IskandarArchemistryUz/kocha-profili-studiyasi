import { describe, it, expect } from 'vitest';
import { pitchedRoof, pvEstimate } from '../../src/core/roof';
import type { XY } from '../../src/core/geo';
import { styleTestDoc } from './roofdoc';

const rect: XY[] = [[0, 0], [30, 0], [30, 12], [0, 12]];
describe('Tom', () => {
  it('ikki nishabli: tizma uzun oʻq boʻylab, balandligi S/2·tan30°', () => {
    const r = pitchedRoof(rect, 'ikki')!; expect(r.h).toBeCloseTo(6 * Math.tan(Math.PI / 6), 5);
    const zs = r.tris.filter((_, i) => i % 3 === 2); expect(Math.max(...zs)).toBeCloseTo(r.h, 5);
    expect(r.tris.length / 9).toBe(6);
  });
  it('toʻrt nishabli va bir nishabli', () => {
    const t = pitchedRoof(rect, 'tort')!; const ridge = t.tris.reduce<number[][]>((a, _, i) => (i % 3 === 0 && t.tris[i + 2] > 0.1 ? [...a, [t.tris[i], t.tris[i + 1]]] : a), []);
    expect(Math.max(...ridge.map(p => p[0])) - Math.min(...ridge.map(p => p[0]))).toBeCloseTo(18, 1);   // 30 − 2·6
    expect(pitchedRoof(rect, 'bir')!.h).toBeCloseTo(12 * Math.tan(Math.PI / 18), 5);
  });
  it('L shakl — qiya tom qurilmaydi', () => { expect(pitchedRoof([[0, 0], [30, 0], [30, 10], [10, 10], [10, 30], [0, 30]], 'ikki')).toBeNull(); });
  it('quyosh panellari taxmini', () => { const p = pvEstimate(1000); expect(p.kwp).toBeCloseTo(120); expect(p.mwh).toBeCloseTo(180); });
  it('buyruq: material va tom bir nechta binoga; migratsiya saqlaydi', () => { const { after, migrated } = styleTestDoc(); expect(after.buildings.map(b => b.roof)).toEqual(['quyosh', 'quyosh', undefined]); expect(migrated.buildings[0].mat).toBe('gisht'); });
});
