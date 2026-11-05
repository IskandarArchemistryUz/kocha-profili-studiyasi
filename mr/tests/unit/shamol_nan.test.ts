import { describe, it, expect } from 'vitest';
import { windField, lawsonClass } from '../../src/core/wind';

/** 06.11 (egasi: shamol «kutishda cheksiz davom etyapti»): koʻp atrof binosi chiqish ustuniga tushganda LBM NaN berardi */
describe('shamol oqimi — katta sahnada NaN yoʻq', () => {
  it('chiqish chegarasidagi binolar bilan ham maydon chekli', () => {
    let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const rings: [number, number][][] = [];
    for (let i = 0; i < 400; i++) { const x = (rnd() - 0.5) * 1000, y = (rnd() - 0.5) * 1000, w = 8 + rnd() * 30, d = 8 + rnd() * 15; rings.push([[x, y], [x + w, y], [x + w, y + d], [x, y + d]]); }
    const box: [number, number, number, number] = [-210, -210, 210, 210], cell = Math.max(2, (Math.hypot(420, 420) + 360) / 170);
    const o = windField({ rings, box, fromDeg: 45, cell, steps: 600 });
    let bad = 0; for (const v of o.ratio) if (!Number.isFinite(v)) bad++;
    expect(bad).toBe(0);
  }, 120_000);
  it('lawsonClass NaN da yiqilmaydi', () => { expect(lawsonClass(NaN)).toBe(0); expect(lawsonClass(3)).toBe(0); expect(lawsonClass(99)).toBeGreaterThan(0); });
});
