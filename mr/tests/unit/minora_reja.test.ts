import { describe, it, expect } from 'vitest';
import { layoutSection } from '../../src/core/apartments';
import { rulePlan, planChecks, sharedAny, type RulePlan } from '../../src/core/sectionplan';
import { area, type XY } from '../../src/core/geo';
import polygonClipping from 'polygon-clipping';

const rect = (w: number, h: number): XY[] => [[0, 0], [w, 0], [w, h], [0, h]];
const rot = (r: XY[], a: number): XY[] => r.map(p => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)] as XY);
const modsOf = (ring: XY[]) => layoutSection(ring, () => false).mods;
const cl = (r: XY[]) => [[...r, r[0]].map(p => [Math.round(p[0] * 1000) / 1000, Math.round(p[1] * 1000) / 1000] as [number, number])];
const ov = (a: XY[], b: XY[]) => polygonClipping.intersection(cl(a) as never, cl(b) as never).reduce((s, p) => s + area(p[0] as XY[]), 0);

/** 13-band: minora — markaziy yadro, halqa koridor, har kvartira MOP ga eshik va derazali, ustma-ust emas */
function tower(ring: XY[], mix = [20, 40, 30, 10]): RulePlan {
  const mods = modsOf(ring), pl = rulePlan(ring, mods, mix, 'M');
  const ch = planChecks(pl, 40, mods);
  for (const id of ['mop', 'win', 'light', 'stairs', 'lift']) expect([id, ch.find(c => c.id === id)!.ok]).toEqual([id, true]);
  expect(pl.sections).toHaveLength(1); expect(pl.fireWalls).toHaveLength(0);
  for (const a of pl.apts) { expect(sharedAny(a.ring, pl.mop).len).toBeGreaterThanOrEqual(1.15); expect(a.mods.length).toBeGreaterThan(0); expect(a.area).toBeGreaterThanOrEqual(28); }
  for (let i = 0; i < pl.apts.length; i++) {
    for (let j = i + 1; j < pl.apts.length; j++) expect(ov(pl.apts[i].ring, pl.apts[j].ring)).toBeLessThan(0.3);
    for (const m of [...pl.mop, ...pl.stairs, ...pl.lifts]) expect(ov(pl.apts[i].ring, m)).toBeLessThan(0.3);
  }
  // yadro markazda: zina va liftlar fasadga tegmaydi
  for (const q of [...pl.stairs, ...pl.lifts]) for (const p of q) expect(Math.min(...ring.map((_, k) => { const a = ring[k], b = ring[(k + 1) % ring.length], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); return Math.abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / L; }))).toBeGreaterThan(3);
  const sum = [...pl.apts.map(a => a.ring), ...pl.mop, ...pl.stairs, ...pl.lifts, ...pl.rest, ...pl.rooms.map(q => q.ring)].reduce((s, q) => s + area(q), 0);
  expect(Math.abs(sum - area(ring))).toBeLessThan(area(ring) * 0.03);
  return pl;
}

describe('Minora qavat rejasi (13-band)', () => {
  it('24 × 24: 6–10 kvartira, burchaklarda ikki fasadli', () => {
    const r = rect(24, 24), pl = tower(r);
    expect(pl.apts.length).toBeGreaterThanOrEqual(6); expect(pl.apts.length).toBeLessThanOrEqual(10);
    // har burchakda kvartira (texnik emas)
    for (const c of r) expect(pl.apts.some(a => a.ring.some(p => Math.hypot(p[0] - c[0], p[1] - c[1]) < 0.1))).toBe(true);
    expect(pl.rest.reduce((t, q) => t + area(q), 0)).toBeLessThan(15);
  });
  it('28 × 24 va burilgan minora', () => { tower(rect(28, 24)); tower(rot(rect(24, 24), 0.6)); });
  it('faqat 1 xonali miks — kvartiralar koʻpayadi', () => {
    const a = tower(rect(24, 24)).apts.length, b = tower(rect(24, 24), [100, 0, 0, 0]).apts.length;
    expect(b).toBeGreaterThan(a);
  });
  it('choʻziq bino (40 × 16) minora emas — oddiy seksiya', () => {
    const r = rect(40, 16), pl = rulePlan(r, modsOf(r), [20, 40, 30, 10], 'M');
    expect(pl.sections.every(s => s.mop.length === 1)).toBe(true);
  });
});
