import { describe, it, expect } from 'vitest';
import { autoSetback, blockStreetWidth, SB_W_DEF } from '../../src/core/setback';
import type { XY } from '../../src/core/geo';

describe('avto chekinish (andoza H/W)', () => {
  it('balandroq fasad — kattaroq chekinish', () => {
    const a = autoSetback(39.6, 15, false), b = autoSetback(19.8, 15, false);
    expect(a.d).toBe(12.5); expect(b.d).toBe(6);  // (39,6 − 15)/2 = 12,3 → 12,5; past — eng kami 6 m
  });
  it('keng koʻcha — chekinish kamayadi, noturar 1-qavat — eng kami 3 m', () => {
    expect(autoSetback(39.6, 30, true).d).toBe(5);
    expect(autoSetback(30, 40, true).d).toBe(3);
  });
  it('H/W chegarasi va yuqori chegara 20 m', () => {
    expect(autoSetback(39.6, 15, false, 2).d).toBe(6);
    expect(autoSetback(120, 15, false).d).toBe(20);
  });
  it('koʻcha nomaʼlum — 15 m andoza', () => { const a = autoSetback(39.6, null, false); expect(a.W).toBe(SB_W_DEF); expect(a.wFound).toBe(false); });
  it('tutash koʻcha kengligi: eng torini oladi, uzoqdagini emas', () => {
    const ring: XY[] = [[0, 0], [100, 0], [100, 80], [0, 80]];
    const st = [{ axis: [[-50, -10], [150, -10]] as XY[], w: 20 }, { axis: [[107.5, -50], [107.5, 150]] as XY[], w: 15 }, { axis: [[-50, 300], [150, 300]] as XY[], w: 10 }];
    expect(blockStreetWidth(ring, st)).toBe(15);
    expect(blockStreetWidth(ring, [st[2]])).toBeNull();
  });
});

import { areaForCap } from '../../src/norms/rules';
import { schoolCapacity, mtmCapacity } from '../../src/core/derive';
describe('kerakli uchastka maydoni (10-band)', () => {
  it('sigʻim funksiyasining teskarisi', () => {
    for (const n of [50, 300, 495, 700, 1200]) { const a = areaForCap(schoolCapacity, n); expect(schoolCapacity(a)).toBeGreaterThanOrEqual(n); expect(schoolCapacity(a - 1)).toBeLessThan(n); }
    for (const n of [40, 100, 150]) { const a = areaForCap(mtmCapacity, n); expect(mtmCapacity(a)).toBeGreaterThanOrEqual(n); expect(mtmCapacity(a - 1)).toBeLessThan(n); }
  });
});
