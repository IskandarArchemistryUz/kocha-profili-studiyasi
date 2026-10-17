import { describe, it, expect } from 'vitest';
import { freeRect, pickLevel, blockSize, labelLines, screenScale, mainAngle } from '../../src/core/labels';
import type { XY } from '../../src/core/geo';

const rect = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

describe('Xarita yozuvlari (4.1)', () => {
  it('boʻsh uchastka — deyarli butun maydon', () => {
    const r = freeRect([rect(0, 0, 100, 60)], [])!;
    expect(r.w).toBeGreaterThan(95); expect(r.h).toBeGreaterThan(55);
    expect(r.c[0]).toBeCloseTo(50, 0); expect(r.c[1]).toBeCloseTo(30, 0);
  });
  it('perimetral bino — yozuv hovlida, binodan 2 m nari', () => {
    // 100 × 100 uchastka, 15 m chuqurlikdagi halqa bino → hovli 70 × 70
    const outer = rect(0, 0, 100, 100), inner = rect(15, 15, 85, 85);
    const bld: XY[][] = [rect(0, 0, 100, 15), rect(0, 85, 100, 100), rect(0, 15, 15, 85), rect(85, 15, 100, 85)];
    const r = freeRect([outer], bld)!;
    expect(r.w).toBeLessThanOrEqual(66 + 2); expect(r.w).toBeGreaterThan(60);
    expect(Math.abs(r.c[0] - 50)).toBeLessThan(2); expect(Math.abs(r.c[1] - 50)).toBeLessThan(2);
    void inner;
  });
  it('toʻliq bino bilan qoplangan — joy yoʻq', () => {
    expect(freeRect([rect(0, 0, 20, 20)], [rect(-1, -1, 21, 21)])).toBeNull();
  });
  it('darajalar: masshtab kattalashganda qisqaradi', () => {
    const r = freeRect([rect(0, 0, 100, 60)], [])!;
    const lv = (mpp: number) => pickLevel(r, 'D-1.23', 'Turar joy', '1,06 ga', mpp, 12, 11);
    expect(lv(0.3)).toBe(3);   // ≈ 1:1100
    expect(lv(1.8)).toBe(2);
    expect(lv(2.22)).toBe(1);
    expect(lv(5)).toBe(0);
    expect(pickLevel(r, 'D-1.23', 'Turar joy', '1,06 ga', 0.3, 12, 11, 1)).toBe(1);   // «Faqat kod» rejimi
  });
  it('matn bloki oʻlchami va masshtab chipi', () => {
    expect(blockSize(labelLines(1, 'D-1', '', ''), 12, 11)).toEqual([0.6 * 12 * 3, 12]);
    expect(Math.round(screenScale(0.6))).toBe(2268);
    expect(mainAngle([[0, 0], [10, 10], [0, 20], [-1, 10]])).toBeCloseTo(Math.PI / 4, 5);
  });
});
