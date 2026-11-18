import { describe, it, expect } from 'vitest';
import { socialPlan, socialVary } from '../../src/core/social';
import type { XY } from '../../src/core/geo';

/** 18.11 (egasi): maktab, MTM, poliklinika uchun ham «Boshqa variant» */
const rect = (w: number, h: number): XY[] => [[0, 0], [w, 0], [w, h], [0, h]];
const sig = (p: ReturnType<typeof socialPlan>) => p.sections.map(s => s.ring.map(q => q.map(x => Math.round(x)).join(',')).join(';')).sort().join('|');
const cy = (p: ReturnType<typeof socialPlan>) => { const pts = p.sections.flatMap(s => s.ring); return pts.reduce((a, q) => a + q[1], 0) / pts.length; };

describe('ijtimoiy obyekt variantlari', () => {
  it('variant 0 — oldingi natija (variantsiz bilan bir xil)', () => {
    const r = rect(160, 120), sb = r.map(() => 25);
    expect(sig(socialPlan(r, 'maktab', 600, 'taroq', 24, 3, sb, undefined, undefined, 0))).toBe(sig(socialPlan(r, 'maktab', 600, 'taroq', 24, 3, sb)));
  });
  for (const [use, mod, cap, m2, f] of [['maktab', 'taroq', 600, 24, 3], ['maktab', 'blok', 600, 24, 3], ['poliklinika', 'blok', 300, 12, 3], ['poliklinika', 'l', 300, 12, 3]] as const) {
    it(`${use} · ${mod}: 8 variantdan kamida 3 tasi farqli, sigʻim saqlanadi`, () => {
      const r = rect(170, 130), sb = r.map(() => (use === 'poliklinika' ? 6 : 25)), seen = new Set<string>();
      const g0 = socialPlan(r, use, cap, mod, m2, f, sb).gfa;
      for (let v = 0; v < 8; v++) { const p = socialPlan(r, use, cap, mod, m2, f, sb, undefined, undefined, v); expect(p.sections.length).toBeGreaterThan(0); expect(Math.abs(p.gfa - g0) / g0).toBeLessThan(0.15); seen.add(sig(p)); }
      expect(seen.size).toBeGreaterThanOrEqual(3);
    });
  }
  it('MTM: bino doim shimolda (guruh maydonchalari janubda), faqat chap/oʻng koʻzgu', () => {
    expect(socialVary('mtm', 3)).toEqual({ swap: false, mu: -1, mv: 1 });
    const r = rect(200, 150), sb = r.map(() => 25);
    for (let v = 0; v < 4; v++) { const p = socialPlan(r, 'mtm', 240, 'chiziq', 33, 2, sb, undefined, undefined, v); expect(cy(p)).toBeGreaterThan(75); }
  });
});
