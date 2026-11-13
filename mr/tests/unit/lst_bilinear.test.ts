import { describe, it, expect } from 'vitest';
import { bilinear, heatSpots } from '../../src/joyshunos/heat';

describe('bilinear — issiqlik sirti silliq', () => {
  // 3×3 toʻr, qadam 100 m: markaz (0,0) — v[4]
  const v = new Float32Array([0, 0, 0, 0, 10, 0, 0, 0, 0]);
  it('katak markazida aynan qiymat', () => { expect(bilinear(v, 3, 100, 0, 0)).toBeCloseTo(10); });
  it('oraliqda chiziqli', () => { expect(bilinear(v, 3, 100, 50, 0)).toBeCloseTo(5); expect(bilinear(v, 3, 100, 50, 50)).toBeCloseTo(2.5); });
  it('NaN qoʻshni ogʻirlikdan chiqariladi', () => {
    const w = new Float32Array([NaN, NaN, NaN, NaN, 10, 20, NaN, NaN, NaN]);
    expect(bilinear(w, 3, 100, 50, 0)).toBeCloseTo(15);
    expect(bilinear(w, 3, 100, -50, 0)).toBeCloseTo(10);
  });
  it('toʻrdan tashqarida NaN', () => { expect(Number.isNaN(bilinear(v, 3, 100, 500, 500))).toBe(true); });
});

describe('heatSpots (13.11)', () => {
  it('eng issiq va eng salqin joylar, bir-biridan uzoq', () => {
    const n = 21, step = 50, v = new Float32Array(n * n).fill(40);
    v[10 * n + 15] = 44; v[10 * n + 16] = 43.5; v[3 * n + 10] = 36; v[17 * n + 4] = 42;
    const s = heatSpots(v, n, step, 40, 500, 3);
    expect(s[0]).toMatchObject({ x: 250, y: 0, d: 4 });
    expect(s.some(p => p.x === 300)).toBe(false);   // 50 m yaqin ikkinchi issiq nuqta tashlanadi
    expect(s.find(p => p.d < 0)).toMatchObject({ x: 0, y: -350, d: -4 });
  });
});
