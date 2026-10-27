import { describe, it, expect } from 'vitest';
import polygonClipping from 'polygon-clipping';
import { generateBase, DEFAULT_GEN } from '../../src/core/generator';
import type { XY } from '../../src/core/geo';

/** 8-band: seksiyalar ulanishida uzilish boʻlmasin — botiq (L, T) kvartalda qirralar boʻylab binolar uzluksiz zanjir */
const comps = (rings: XY[][]) => polygonClipping.union(...rings.map(r => [[...r, r[0]].map(p => [p[0], p[1]] as [number, number])]) as [[[number, number][]]]).length;
describe('seksiyalar ulanishi', () => {
  it('L-shakl kvartal: barcha seksiyalar bitta uzluksiz bino zanjiri, burchaklar boʻsh emas', () => {
    const L: XY[] = [[0, 0], [170, 0], [170, 80], [90, 80], [90, 160], [0, 160]];
    const r = generateBase(L, DEFAULT_GEN);
    expect(r.sections.length).toBeGreaterThan(8);
    expect(comps(r.sections.map(s => s.ring))).toBe(1);
  });
  it('T-shakl kvartal ham uzluksiz', () => {
    const T: XY[] = [[0, 0], [260, 0], [260, 110], [170, 110], [170, 220], [90, 220], [90, 110], [0, 110]];
    const r = generateBase(T, DEFAULT_GEN);
    expect(r.sections.length).toBeGreaterThan(6);
    expect(comps(r.sections.map(s => s.ring))).toBe(1);
  });
  it('qavariq kvartal (perimetr) — avvalgidek', () => {
    const R: XY[] = [[0, 0], [140, 0], [140, 110], [0, 110]];
    expect(generateBase(R, DEFAULT_GEN).sections.filter(s => s.kind !== 'arka').length).toBe(12);
  });
});
