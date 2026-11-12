import { describe, it, expect } from 'vitest';
import { layoutSection } from '../../src/core/apartments';
import { rulePlan, planChecks, sharedAny } from '../../src/core/sectionplan';
import { area, type XY } from '../../src/core/geo';

const rect = (w: number, h: number): XY[] => [[0, 0], [w, 0], [w, h], [0, h]];

/** 12.11 (eski navbat, 8-band 2-qismi): yoʻlakli seksiyada koridor uchi P/C kvartira bilan yopilganda — yadro yonida «yorugʻlik choʻntagi» (328-band) */
describe('Yorugʻlik choʻntagi (ShNQ 2.08.01-24, 325, 328-bandlar)', () => {
  for (const [w, h] of [[60, 16], [48, 16], [72, 18]] as const) it(`${w} × ${h}: umumiy yoʻlak derazasi ≥ pol yuzasining 1/16`, () => {
    const r = rect(w, h), mods = layoutSection(r, () => false).mods, pl = rulePlan(r, mods, [20, 40, 30, 10], 'M');
    const ch = planChecks(pl, 40, mods), cl = ch.find(c => c.id === 'corrlight')!;
    expect([cl.ok, cl.value]).toEqual([true, cl.value]);
    // choʻntak boʻlsa — kvartiralar hali ham MOP ga tegadi, ≥ 28 m²
    for (const a of pl.apts) { expect(sharedAny(a.ring, pl.mop).len).toBeGreaterThanOrEqual(1.15); expect(area(a.ring)).toBeGreaterThanOrEqual(27.9); }
  });
});
