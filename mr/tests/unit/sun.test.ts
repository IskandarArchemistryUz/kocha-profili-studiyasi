import { describe, it, expect } from 'vitest';
import { sunPosition, localToUtc, daySteps, insolation } from '../../src/core/sun';

describe('Quyosh', () => {
  it('Toshkent, 21 iyun peshin: balandlik ≈ 72°, azimut ≈ 180°', () => {
    // quyosh peshini Toshkentda ≈ 12:25 mahalliy (69,28° uzunlik, UTC+5)
    const p = sunPosition(localToUtc(2026, 6, 21, 12 + 25 / 60), 41.31, 69.28);
    expect(p.alt).toBeGreaterThan(70); expect(p.alt).toBeLessThan(74); expect(Math.abs(p.az - 180)).toBeLessThan(6);
  });
  it('21 dekabr peshin ≈ 25°, kun uzunligi iyunda dekabrdan uzun', () => {
    expect(sunPosition(localToUtc(2026, 12, 21, 12 + 25 / 60), 41.31, 69.28).alt).toBeCloseTo(25.2, 0);
    const len = (m: number) => daySteps(2026, m, 21, 41.31, 69.28).length;
    expect(len(6)).toBeGreaterThan(len(12) + 15);
  });
  it('insolyatsiya: baland bino janubdagi nuqtani soyalaydi, shimoldagini emas', () => {
    const steps = daySteps(2026, 4, 22, 41.31, 69.28);
    const total = steps.reduce((s, x) => s + x.dt, 0);
    const bld = [{ ring: [[-20, -5], [20, -5], [20, 5], [-20, 5]] as [number, number][], top: 40 }];
    const h = insolation([[0, 15], [0, -15], [0, 300]], [0, 0, 0], bld, steps);
    expect(h[2]).toBeCloseTo(total, 3);           // ochiq joy
    expect(h[0]).toBeLessThan(total * 0.6);        // binoning shimoli — soyada
    expect(h[1]).toBeGreaterThan(h[0]);            // janubi — koʻproq quyosh
  });
});
