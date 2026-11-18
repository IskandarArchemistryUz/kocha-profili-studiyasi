import { describe, it, expect } from 'vitest';
import { generate, DEFAULT_GEN, varyGen, type Typology } from '../../src/core/generator';
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

/** 18.11 (T0, egasi: «qayta generatsiya yangi variant taklif qilmaydi»): 8 ta variantdan nechtasi farqli — UMN maqsadi bilan ham */
const rect = (w: number, h: number) => [[0, 0], [w, 0], [w, h], [0, h]] as XY[];
const L: XY[] = [[0, 0], [160, 0], [160, 60], [70, 60], [70, 140], [0, 140]];
const sig2 = (r: ReturnType<typeof generate>) => r.sections.map(s => s.kind[0] + s.floors + ':' + s.ring.map(p => p.map(x => Math.round(x)).join(',')).join(';')).sort().join('|');
const distinct = (blk: XY[], t: Typology, far: number) => {
  const seen = new Set<string>();
  for (let v = 0; v < 8; v++) seen.add(sig2(generate(blk, { ...DEFAULT_GEN, typology: t, far, variant: v, maxLen: 48 }, 3.3, {})));
  return seen.size;
};
describe('variantlar xilma-xilligi (18.11)', () => {
  const cases: [string, XY[]][] = [['120x90', rect(120, 90)], ['200x120', rect(200, 120)], ['L', L]];
  for (const [nm, blk] of cases) for (const t of ['perimetr', 'qatorlar', 'minora', 'blok_minora', 'avto'] as Typology[]) for (const far of [0, 2.5]) {
    it(`${nm} ${t} UMN ${far}: 8 tadan kamida 5 tasi farqli`, () => { expect(distinct(blk, t, far)).toBeGreaterThanOrEqual(5); });
  }
});
