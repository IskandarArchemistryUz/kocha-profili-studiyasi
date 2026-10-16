import { describe, it, expect } from 'vitest';
import { layoutSection } from '../../src/core/apartments';
import { rulePlan, planChecks, sharedAny, type RulePlan } from '../../src/core/sectionplan';
import { area, type XY } from '../../src/core/geo';
import polygonClipping from 'polygon-clipping';

const rect = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const plan = (ring: XY[], mix = [20, 40, 30, 10]) => rulePlan(ring, layoutSection(ring, () => false).mods, mix, 'M');
const cl = (r: XY[]) => [[...r, r[0]].map(p => [Math.round(p[0] * 1000) / 1000, Math.round(p[1] * 1000) / 1000] as [number, number])];

function rules(pl: RulePlan, ring: XY[]) {
  expect(pl.apts.length).toBeGreaterThan(0);
  for (const a of pl.apts) {
    expect(sharedAny(a.ring, pl.mop).len).toBeGreaterThanOrEqual(0.9);   // eshik MOP dan
    expect(a.mods.length).toBeGreaterThan(0);                             // deraza
    expect(a.area).toBeGreaterThanOrEqual(22);
  }
  // kvartiralar bir-birini qoplamaydi va MOP / zina / liftga kirmaydi
  for (let i = 0; i < pl.apts.length; i++) {
    for (let j = i + 1; j < pl.apts.length; j++) expect(polygonClipping.intersection(cl(pl.apts[i].ring) as any, cl(pl.apts[j].ring) as any).reduce((s, p) => s + area(p[0] as XY[]), 0)).toBeLessThan(0.3);
    for (const m of [...pl.mop, ...pl.stairs, ...pl.lifts]) expect(polygonClipping.intersection(cl(pl.apts[i].ring) as any, cl(m) as any).reduce((s, p) => s + area(p[0] as XY[]), 0)).toBeLessThan(0.3);
  }
  // MOP — bitta bogʻlangan boʻlak, zina unga tegadi
  expect(pl.mop.length).toBe(1);
  for (const s of pl.stairs) expect(sharedAny(s, pl.mop).len).toBeGreaterThanOrEqual(0.9);
  // qoplash: kvartiralar + MOP + yadro + qoldiq ≈ seksiya
  const sum = [...pl.apts.map(a => a.ring), ...pl.mop, ...pl.stairs, ...pl.lifts, ...pl.rest].reduce((s, q) => s + area(q), 0);
  expect(Math.abs(sum - area(ring))).toBeLessThan(area(ring) * 0.02);
  const ch = planChecks(pl, 25); expect(ch.find(c => c.id === 'mop')!.ok).toBe(true); expect(ch.find(c => c.id === 'win')!.ok).toBe(true);
  return pl;
}
const info = (_n: string, pl: RulePlan, r: XY[]) => { rules(pl, r); };

describe('Qoida boʻyicha seksiya rejasi', () => {
  it('33 × 15 — ikki tomonlama, bitta zina', () => { const r = rect(0, 0, 33, 15), pl = plan(r); info('33x15', pl, r); expect(pl.kind).toBe('ikki'); });
  it('24 × 12 — bir tomonlama', () => { const r = rect(0, 0, 24, 12), pl = plan(r); info('24x12', pl, r); expect(pl.kind).toBe('bir'); });
  it('72 × 15 — uzun: > 500 m² → 2 zina', () => { const r = rect(0, 0, 72, 15), pl = plan(r); info('72x15', pl, r); expect(pl.stairs.length).toBe(2); expect(planChecks(pl, 25).find(c => c.id === 'stairs')!.ok).toBe(true); });
  it('L shakl', () => { const r: XY[] = [[0, 0], [45, 0], [45, 15], [15, 15], [15, 40], [0, 40]], pl = plan(r); info('L', pl, r); });
  it('T shakl', () => { const r: XY[] = [[0, 0], [50, 0], [50, 15], [32, 15], [32, 38], [18, 38], [18, 15], [0, 15]], pl = plan(r); info('T', pl, r); });
  it('burilgan 40 × 16', () => { const a = 0.5, r = rect(0, 0, 40, 16).map(p => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)] as XY), pl = plan(r); info('rot', pl, r); });
});

