import { describe, it, expect } from 'vitest';
import { trimT30, t30Need, T30 } from '../../src/core/mlpark';
import type { XY } from '../../src/core/geo';

const sq = (x: number, y: number): XY[] => [[x, y], [x + 2.5, y], [x + 2.5, y + 5], [x, y + 5]];
const house: XY[] = [[0, 0], [60, 0], [60, 15], [0, 15]];

describe('30-jadval (418-band) — ochiq avtoturargoh masofasi', () => {
  it('t30Need: turar joy — old tomoni, maktab — taʼlim, jamoat — jamoat binolari', () => {
    expect(t30Need('turar', true, 0)).toBe(12); expect(t30Need('turar', true, 3)).toBe(35);
    expect(t30Need('maktab', false, 1)).toBe(25); expect(t30Need('maktab', false, 4)).toBe(T30.school[3]);
    expect(t30Need('ofis', false, 2)).toBe(15); expect(t30Need('ombor', false, 2)).toBeNull();
  });
  it('trimT30: yaqin joylar olinadi, qolganlar soni kichrayib masofa ham kamayadi', () => {
    // 12 joy: 2 tasi uyga 5 m da (≤ 10 joy guruhi uchun ham 12 m kerak), 10 tasi 20 m da (11–50 → 15 m yetadi, ≤ 10 → 12 m)
    const st = [sq(5, 20), sq(9, 20), ...Array.from({ length: 10 }, (_, i) => sq(i * 3, 35))];
    const keep = trimT30(st, [{ ring: house, use: 'turar', res: true }]);
    expect(keep).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });
  it('trimT30: hammasi uzoqda — oʻzgarmaydi', () => {
    const st = Array.from({ length: 5 }, (_, i) => sq(i * 3, 40));
    expect(trimT30(st, [{ ring: house, use: 'turar', res: true }])).toHaveLength(5);
  });
});
