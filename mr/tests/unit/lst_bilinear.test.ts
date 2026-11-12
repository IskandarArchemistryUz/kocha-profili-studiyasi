import { describe, it, expect } from 'vitest';
import { bilinear } from '../../src/joyshunos/heat';

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
