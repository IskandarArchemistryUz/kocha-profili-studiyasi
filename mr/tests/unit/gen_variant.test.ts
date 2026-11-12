import { describe, it, expect } from 'vitest';
import { generate, DEFAULT_GEN, varyGen } from '../../src/core/generator';
import type { XY } from '../../src/core/geo';

/** 12.11 (egasi): «Boshqa variant» — har raqam boshqa joylashuv, 0 — avvalgi natija (oʻzgarmaydi) */
describe('generatsiya variantlari', () => {
  const blk: XY[] = [[0, 0], [140, 0], [150, 95], [10, 110]];
  const sig = (r: ReturnType<typeof generate>) => r.sections.map(s => s.floors + ':' + s.ring.map(p => p.map(v => v.toFixed(1)).join(',')).join(';')).sort().join('|');
  it('variant 0 = variantsiz; 1…6 — kamida 4 xil joylashuv, hammasida seksiyalar bor', () => {
    for (const typology of ['perimetr', 'qatorlar'] as const) {
      const g = { ...DEFAULT_GEN, typology };
      expect(sig(generate(blk, { ...g, variant: 0 }))).toBe(sig(generate(blk, g)));
      const seen = new Set<string>();
      for (let v = 1; v <= 6; v++) { const r = generate(blk, { ...g, variant: v }); expect(r.sections.length).toBeGreaterThan(0); seen.add(sig(r)); }
      expect(seen.size).toBeGreaterThanOrEqual(4);
    }
  });
  it('aniq oʻlcham rejimida seksiya uzunligi oʻzgarmaydi; uzunlik seysmik chegaradan oshmaydi', () => {
    for (let v = 1; v < 20; v++) {
      expect(varyGen(blk, { ...DEFAULT_GEN, exact: true, variant: v }).g.secLen).toBe(DEFAULT_GEN.secLen);
      expect(varyGen(blk, { ...DEFAULT_GEN, maxLen: 30, variant: v }).g.secLen).toBeLessThanOrEqual(30);
    }
  });
});
