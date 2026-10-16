import { describe, it, expect } from 'vitest';
import { pitchedRoof, pvEstimate } from '../../src/core/roof';
import type { XY } from '../../src/core/geo';
import { styleTestDoc } from './roofdoc';

const rect: XY[] = [[0, 0], [30, 0], [30, 12], [0, 12]];
describe('Tom', () => {
  it('ikki nishabli: tizma uzun oʻq boʻylab, balandligi S/2·tan30°', () => {
    const r = pitchedRoof(rect, 'ikki')!; expect(r.h).toBeCloseTo(6 * Math.tan(Math.PI / 6), 5);
    const zs = r.tris.filter((_, i) => i % 3 === 2); expect(Math.max(...zs)).toBeCloseTo(r.h, 5);
    expect((r.tris.length + r.walls.length) / 9).toBe(6);
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

import { roofParts, splitAtReflex } from '../../src/core/roof';
describe('murakkab shakl tomi', () => {
  const L: [number, number][] = [[0, 0], [30, 0], [30, 10], [10, 10], [10, 30], [0, 30]];
  it('L shakl ikki toʻrtburchakka boʻlinadi', () => {
    const p = splitAtReflex(L)!; expect(p).toHaveLength(2);
    const a = (r: [number, number][]) => Math.abs(r.reduce((s, q, i) => { const n = r[(i + 1) % r.length]; return s + q[0] * n[1] - n[0] * q[1]; }, 0) / 2);
    expect(a(p[0]) + a(p[1])).toBeCloseTo(500, 5);
  });
  it('L shaklga har qanotda tom', () => { expect(roofParts(L, 'ikki')).toHaveLength(2); expect(roofParts(L, 'bir')).toHaveLength(2); });
  it('bir nishabli: baland tomonda devor bor (teshik yoʻq)', () => {
    const r = roofParts([[0, 0], [20, 0], [20, 12], [0, 12]], 'bir')![0];
    expect(r.walls.length / 9).toBe(4);   // 2 yon + 2 orqa uchburchak
  });
});
