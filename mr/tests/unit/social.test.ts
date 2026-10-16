import { describe, it, expect } from 'vitest';
import { socialPlan, socialDemand, plotCapacity, SOCIAL } from '../../src/core/social';
import { demoRow } from '../../src/core/demography';
import { area, type XY } from '../../src/core/geo';
import { pointIn } from '../../src/core/plan';
const rect = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
describe('Ijtimoiy binolar', () => {
  it('ehtiyoj va uchastka sigʻimi', () => {
    const r = demoRow('1726');
    const s = socialDemand('maktab', 10000, r); expect(s).toBeGreaterThan(1000); expect(s).toBeLessThan(2500);
    expect(socialDemand('poliklinika', 10000, r)).toBeCloseTo(260);
    expect(plotCapacity('maktab', 16000)).toBe(1600); expect(plotCapacity('maktab', 9000)).toBe(450); expect(plotCapacity('mtm', 7000)).toBe(200);
  });
  for (const [use, mods] of Object.entries(SOCIAL)) for (const m of mods.modules) it(`${use}: ${m.id} parsel ichida`, () => {
    const ring = rect(0, 0, 160, 120), cap = use === 'maktab' ? 900 : use === 'mtm' ? 240 : 400;
    const p = socialPlan(ring, use as 'maktab', cap, m.id, mods.m2, mods.floors, ring.map(() => 25));
    expect(p.sections.length).toBeGreaterThan(0);
    for (const s of p.sections) for (const q of s.ring) expect(pointIn(q, [ring])).toBe(true);
    expect(p.gfa).toBeGreaterThan(cap * mods.m2 * 0.5); expect(p.gfa).toBeLessThan(cap * mods.m2 * 1.6);
    expect(p.sections.every(s => area(s.ring) > 20)).toBe(true);
  });
  it('kichik parsel — 6 m chekinish va ogohlantirish', () => {
    const p = socialPlan(rect(0, 0, 50, 40), 'mtm', 80, 'chiziq', 12, 2, [25, 25, 25, 25]);
    expect(p.notes.join(' ')).toMatch(/39-jadval/);
  });
});
