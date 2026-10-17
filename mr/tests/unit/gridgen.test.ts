import { describe, it, expect } from 'vitest';
import { gridStreets, gridVariants, autoAngle, DEFAULT_GRID, GRID_PRESETS } from '../../src/core/gridgen';
import type { XY } from '../../src/core/geo';

const rect = (w: number, h: number): XY[] => [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
describe('koʻcha toʻri generatori', () => {
  it('400 × 300 uchastka, Barselona 113 — 2 + 1 ichki chiziq (chetlari birlashgan), uchlari uchastka chegarasida', () => {
    const sts = gridStreets(rect(400, 300), { ...DEFAULT_GRID, w: 113, h: 113, angle: 0 });
    const horiz = sts.filter(s => Math.abs(s.axis[0][1] - s.axis[1][1]) < 1e-6), vert = sts.filter(s => Math.abs(s.axis[0][0] - s.axis[1][0]) < 1e-6);
    expect(vert.length).toBe(3); expect(horiz.length).toBe(2);   // 400/113 → 4 ta 100 m blok, 300/113 → 3 ta 100 m
    for (const s of horiz) { expect(Math.min(s.axis[0][0], s.axis[1][0])).toBeCloseTo(-200, 3); expect(Math.max(s.axis[0][0], s.axis[1][0])).toBeCloseTo(200, 3); }
    // har 3-chisi asosiy
    expect(sts.some(s => s.main)).toBe(true);
  });
  it('bloklar tenglashtiriladi: 330 m / 200 m modul → 2 ta 165 m blok (1 chiziq); 130 m — chiziq yoʻq', () => {
    const one = gridStreets(rect(600, 330), { ...DEFAULT_GRID, w: 100, h: 200, angle: 0 });
    expect(one.filter(s => Math.abs(s.axis[0][1] - s.axis[1][1]) < 1e-6).length).toBe(1);
    expect(gridStreets(rect(130, 130), { ...DEFAULT_GRID, w: 113, h: 113, angle: 0 }).length).toBe(0);
  });
  it('avtomatik burchak — uzun tomon boʻylab; variantlar 4 ta', () => {
    const site: XY[] = [[0, 0], [300, 100], [250, 250], [-50, 150]];
    const a = autoAngle(site); expect(Math.abs(a - 18.4) < 1 || Math.abs(a + 161.6) < 1).toBe(true);
    const v = gridVariants(site, DEFAULT_GRID); expect(v.length).toBe(4);
    expect(gridStreets(site, v[0].g).length).toBeGreaterThan(0);
  });
  it('presetlar: hujjatdagi modullar', () => {
    expect(GRID_PRESETS.find(p => p.id === 'barselona')!.w).toBe(113);
    expect(GRID_PRESETS.find(p => p.id === 'manhattan')!.h).toBe(274);
  });
});
