import { describe, it, expect } from 'vitest';
import { lbm, windField, sampleWind, nearestStation, prevailing, lawsonClass, rumbName, type Climate } from '../../src/core/wind';
import climate from '../../public/climate/uz_climate.json';

describe('Shamol', () => {
  it('LBM: toʻsiq yonida tezlashish, orqasida pana', () => {
    const nx = 120, ny = 60, solid = new Uint8Array(nx * ny);
    for (let y = 22; y < 38; y++) for (let x = 40; x < 50; x++) solid[y * nx + x] = 1;
    const t0 = performance.now(); const r = lbm(nx, ny, solid, 1500); const dt = performance.now() - t0;
    const at = (x: number, y: number) => r[y * nx + x];
    expect(at(45, 18)).toBeGreaterThan(1.05);   // yon tomonda tezlashish
    expect(at(56, 30)).toBeLessThan(0.5);       // orqasida pana
    expect(at(5, 5)).toBeCloseTo(1, 0);
    expect(dt).toBeLessThan(8000);
  });
  it('windField: yoʻnalish aylantiriladi, bino ichida 0', () => {
    const w = windField({ rings: [[[-10, -10], [10, -10], [10, 10], [-10, 10]]], box: [-60, -60, 60, 60], fromDeg: 270, cell: 3, steps: 800 });
    expect(sampleWind(w, [0, 0])).toBe(0);
    expect(sampleWind(w, [30, 0])).toBeLessThan(sampleWind(w, [-40, 0]) + 0.01); // gʻarbdan esadi → sharqi pana
  });
  it('iqlim: Toshkent stansiyasi, ustun yoʻnalish', () => {
    const c = climate as Climate, { s, km } = nearestStation(c, 69.28, 41.31);
    expect(s.name).toContain('Tashkent'); expect(km).toBeLessThan(15);
    expect(prevailing(s).share).toBeGreaterThan(0.08);
    expect(c.stations.length).toBeGreaterThan(40);
    expect(lawsonClass(3)).toBe(0); expect(lawsonClass(12)).toBe(4); expect(rumbName(3)).toBe('shimoli-sharq–sharq');
  });
});
