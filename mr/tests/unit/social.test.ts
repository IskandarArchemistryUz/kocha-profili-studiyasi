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
  // 04.11: 5-ilova — maktab 24, MTM 33 m²/oʻrin; 160 × 120 parselga 600 oʻquvchi va 120 oʻrin
  for (const [use, mods] of Object.entries(SOCIAL)) for (const m of mods.modules) it(`${use}: ${m.id} parsel ichida`, () => {
    const ring = rect(0, 0, 160, 120), cap = use === 'maktab' ? 600 : use === 'mtm' ? 120 : 400;
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

describe('04.11 (Murad sinovi, 1-band): red-line-39 — maktab/MTM binosi 25 m chekinish ichida', () => {
  const minDist = (secs: { ring: XY[] }[], y: number) => Math.min(...secs.flatMap(s => s.ring.map(p => p[1] - y)));
  it('sigʻsa — hamma qism janubiy (koʻcha) qirradan ≥ 25 m', () => {
    // 140 × 120 m parsel, janubiy qirra koʻchaga (25 m), qolganlari 6 m
    const sp = socialPlan(rect(0, 0, 140, 120), 'maktab', 600, 'taroq', 24, 3, [25, 6, 6, 6]);
    expect(sp.sections.length).toBeGreaterThan(0);
    expect(minDist(sp.sections, 0)).toBeGreaterThanOrEqual(24.9);
    expect(sp.notes.join(' ')).not.toContain('39-jadval) ichiga sigʻmadi');
  });
  it('sigʻmasa — bino baribir chiziladi, izohda chetlanish', () => {
    const sp = socialPlan(rect(0, 0, 90, 40), 'mtm', 120, 'chiziq', 33, 2, [25, 25, 25, 25]);
    expect(sp.sections.length).toBeGreaterThan(0); expect(sp.notes.join(' ')).toMatch(/25 m/);
  });
});
