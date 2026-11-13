import { describe, it, expect } from 'vitest';
import { gridStreets, DEFAULT_GRID, anchorAligned, anchorAngle, type GridAnchor } from '../../src/core/gridgen';
import type { XY } from '../../src/core/geo';

/* 13.11 (egasi): koʻcha toʻri mavjud yoʻllar davomiga moslashadi — langar chiziqlar ustidan oʻtadi, qolganlari ular orasida teng */
const site: XY[] = [[0, 0], [400, 0], [400, 400], [0, 400]];
const g = { ...DEFAULT_GRID, w: 113, h: 113, angle: 0, mainEvery: 0 };
const horiz = (sts: ReturnType<typeof gridStreets>) => sts.filter(s => Math.abs(s.axis[0][1] - s.axis[1][1]) < 1e-6).map(s => Math.round(s.axis[0][1] * 10) / 10).sort((a, b) => a - b);

describe('gridStreets: langarlar (mavjud yoʻl davomi)', () => {
  it('langarsiz — oddiy toʻr', () => { expect(horiz(gridStreets(site, g))).toEqual([100, 200, 300]); });
  it('gorizontal langar y = 137 dan oʻtadi, qolgan oraliq teng boʻlinadi, profil — langarniki', () => {
    const an: GridAnchor[] = [{ p: [-20, 137], d: [1, 0], profile: 'tuman-40' }];
    const sts = gridStreets(site, { ...g, anchors: an });
    expect(horiz(sts)).toEqual([137, 268.5]);
    expect(sts.find(s => Math.abs(s.axis[0][1] - 137) < 1e-6)!.profile).toBe('tuman-40');
    expect(sts.filter(s => Math.abs(s.axis[0][0] - s.axis[1][0]) < 1e-6)).toHaveLength(3);   // vertikallar oʻzgarmaydi
  });
  it('ikki langar orasidagi oraliq ham modulga boʻlinadi', () => {
    const an: GridAnchor[] = [{ p: [-20, 60], d: [1, 0], profile: 'mahalla-15' }, { p: [-20, 350], d: [1, 0], profile: 'mahalla-15' }];
    expect(horiz(gridStreets(site, { ...g, anchors: an }))).toEqual([60, 156.7, 253.3, 350]);
  });
  it('mos kelmaydigan (qiya) langar hisobga olinmaydi', () => {
    const an: GridAnchor[] = [{ p: [-20, 137], d: [Math.SQRT1_2, Math.SQRT1_2], profile: 'tuman-40' }];
    expect(horiz(gridStreets(site, { ...g, anchors: an }))).toEqual([100, 200, 300]);
    expect(anchorAligned(an[0].d, 0)).toBe(false);
    expect(anchorAligned([0, 1], 0)).toBe(true);
    expect(anchorAligned([Math.cos(0.1), Math.sin(0.1)], 0)).toBe(true);    // ≈ 5,7°
  });
  it('burchak eng muhim (birinchi) langardan', () => {
    expect(anchorAngle([{ p: [0, 0], d: [0, 1], profile: 'x' }])).toBeCloseTo(90, 6);
    expect(anchorAngle([])).toBeNull();
  });
});
