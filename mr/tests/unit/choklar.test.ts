import { describe, it, expect } from 'vitest';
import { jointScheme, checkBlock, FIRE_COMP_ANDOZA } from '../../src/core/seysmik';
import { area, obb2, type XY } from '../../src/core/geo';

const rect = (x0: number, y0: number, w: number, h: number): XY[] => [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]];

describe('avtomatik choklar sxemasi (31.10)', () => {
  it('stilobat 120 × 60: ikki yoʻnalishda uzunlik (45 m) va maydon (andoza) boʻyicha 3 × 2 boʻlma', () => {
    const s = jointScheme(rect(0, 0, 120, 60), 45, FIRE_COMP_ANDOZA);
    expect(s.parts.length).toBe(6); expect(s.cuts.length).toBe(3);
    for (const p of s.parts) { expect(obb2(p).L).toBeLessThanOrEqual(45.05); expect(area(p)).toBeLessThanOrEqual(FIRE_COMP_ANDOZA + 1); }
    expect(s.parts.reduce((t, p) => t + area(p), 0)).toBeCloseTo(7200, 0);
  });
  it('chok minora ostidan oʻtmaydi (6.16–6.17), boʻlma uzunligi chegarada qoladi', () => {
    const tower = rect(36, 20, 14, 14), s = jointScheme(rect(0, 0, 120, 60), 45, FIRE_COMP_ANDOZA, [tower]);
    for (const [a] of s.cuts) expect(a[0] <= 36.6 - 0.5 || a[0] >= 50 + 0.4).toBe(true);
    for (const p of s.parts) { const xs = p.map(q => q[0]); expect(Math.max(...xs) - Math.min(...xs)).toBeLessThanOrEqual(45.05); }
  });
  it('katta stilobat 208 × 148: toʻr, har boʻlma ≤ 45 m va ≤ andoza', () => {
    const s = jointScheme(rect(0, 0, 208, 148), 45, FIRE_COMP_ANDOZA);
    for (const p of s.parts) { expect(obb2(p).L).toBeLessThanOrEqual(45.05); expect(area(p)).toBeLessThanOrEqual(FIRE_COMP_ANDOZA + 1); }
    expect(s.parts.reduce((t, p) => t + area(p), 0)).toBeCloseTo(208 * 148, 0);
  });
  it('uzun toʻgʻri toʻrtburchak bino chok bilan seysmik tekshiruvdan oʻtadi', () => {
    const r = rect(0, 0, 100, 16);
    expect(checkBlock(r, 'monolit', 8).lenOk).toBe(false);
    expect(checkBlock(r, 'monolit', 8, true).lenOk).toBe(true);
  });
  it('L shakl: ichki burchakdan boʻlish saqlanadi (cheklovsiz)', () => {
    const L: XY[] = [[0, 0], [30, 0], [30, 12], [12, 12], [12, 30], [0, 30]];
    const s = jointScheme(L); expect(s.parts.length).toBe(2); expect(s.cuts.length).toBe(1);
  });
});
