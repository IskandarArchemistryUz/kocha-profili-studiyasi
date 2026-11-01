import { describe, it, expect } from 'vitest';
import { levelZ, bLevels, floorAt, groundH } from '../../src/core/levels';
import { buildingSection } from '../../src/core/bldsection';
import type { XY } from '../../src/core/geo';

const S = { floorHeight: 3.3, groundH: 5.7 };
describe('1-qavat balandligi (core/levels)', () => {
  it('noturar 1-qavatli bino: 1-qavat 5,7 m, keyingilari 3,3 m', () => {
    const b = { floors: 10, nonRes: 1 };
    expect(levelZ(S, b, 1)).toBeCloseTo(5.7); expect(levelZ(S, b, 2)).toBeCloseTo(9.0);
    expect(bLevels(S, b).top).toBeCloseTo(5.7 + 9 * 3.3); expect(bLevels(S, b).fh1).toBeCloseTo(5.7);
  });
  it('turar joy (1-qavat turar) va groundH yoʻq — oʻzgarmaydi', () => {
    expect(bLevels(S, { floors: 9, nonRes: 0 }).top).toBeCloseTo(29.7);
    expect(bLevels({ floorHeight: 3.3 }, { floors: 9, nonRes: 1 }).top).toBeCloseTo(29.7);
    expect(groundH({ floorHeight: 3 })).toBe(3);
  });
  it('stilobat ustidagi minora: pasti stilobat tepasida', () => {
    const pod = bLevels(S, { floors: 2, nonRes: 2 }), tw = bLevels(S, { floors: 12, nonRes: 12, z0: 2 });
    expect(tw.z0).toBeCloseTo(pod.top); expect(tw.fh1).toBeCloseTo(3.3);
  });
  it('balandlikdan qavat', () => {
    const b = { floors: 5, nonRes: 1 };
    expect(floorAt(S, b, 1)).toBe(1); expect(floorAt(S, b, 5.6)).toBe(1); expect(floorAt(S, b, 5.8)).toBe(2); expect(floorAt(S, b, 99)).toBe(5);
  });
  it('kesimda baland 1-qavat chiziladi', () => {
    const R = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    const r = buildingSection({ ring: R(0, 0, 60, 15), h: 5.7 + 8 * 3.3, floors: 9, nonRes: 1, fh: 3.3, fh1: 5.7 }, [], { lat: 41.3, title: 'T' });
    expect(r.svg).toContain(`height="${(5.7 * 5).toFixed(2)}"`);   // 1:200 → 5 mm/m
  });
});

import { antresolSplit, hasAntresol, ANTRESOL_MIN_H } from '../../src/core/levels';
import { DEFAULT_SETTINGS, blankProject } from '../../src/core/doc';
import { derive } from '../../src/core/derive';
describe('antresol (01.11, egasi)', () => {
  it('sathlar: 5,7 m → 2,7 + 0,3 + 2,7; 4,9 m — chegarada; 4,5 m — sigʻmaydi', () => {
    const a = antresolSplit(5.7)!; expect(a.lo).toBeCloseTo(2.7); expect(a.hi).toBeCloseTo(2.7);
    expect(ANTRESOL_MIN_H).toBeCloseTo(4.9); expect(antresolSplit(4.9)).not.toBeNull(); expect(antresolSplit(4.5)).toBeNull();
    const b = antresolSplit(5.2)!; expect(b.lo).toBeGreaterThanOrEqual(2.5 - 1e-9); expect(b.hi).toBeGreaterThanOrEqual(2.1 - 1e-9);
  });
  it('faqat belgilangan, noturar 1-qavatli, stilobat ustida boʻlmagan va balandligi yetadigan binoda', () => {
    expect(hasAntresol(S, { floors: 9, nonRes: 1, antresol: true })).toBe(true);
    expect(hasAntresol(S, { floors: 9, nonRes: 0, antresol: true })).toBe(false);
    expect(hasAntresol({ floorHeight: 3.3 }, { floors: 9, nonRes: 1, antresol: true })).toBe(false);
    expect(hasAntresol(S, { floors: 9, nonRes: 1, z0: 2, antresol: true })).toBe(false);
  });
  it('derive: antresol maydoni = 1-qavatning 40 % i, GFA oʻzgarmaydi', () => {
    const p = blankProject('T'); const [lng, lat] = p.origin, k = 1 / 111320, kx = k / Math.cos(lat * Math.PI / 180), g = (x: number, y: number) => [lng + x * kx, lat + y * k] as [number, number];
    p.settings = { ...DEFAULT_SETTINGS, groundH: 5.7 };
    p.buildings = [{ id: 'a', footprint: [g(0, 0), g(50, 0), g(50, 15), g(0, 15)], floors: 9, nonRes: 1, use: 'turar' } as any];
    const d0 = derive(p); expect(d0.antresol).toBe(0);
    p.buildings = [{ ...p.buildings[0], antresol: true } as any];
    const d1 = derive(p); expect(d1.antresol).toBeCloseTo(750 * 0.4, -1); expect(d1.gfa).toBeCloseTo(d0.gfa, 3);
  });
});
