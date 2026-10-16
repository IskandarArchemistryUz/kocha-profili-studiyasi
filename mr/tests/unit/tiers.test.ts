import { describe, it, expect } from 'vitest';
import { insetRing, tierParts, tieredGfa, pushEdge } from '../../src/core/tiers';
import { area, type XY } from '../../src/core/geo';
const rect: XY[] = [[0, 0], [30, 0], [30, 15], [0, 15]];
describe('Cheginish va itarish', () => {
  it('barcha tomondan 3 m', () => { expect(area(insetRing(rect, 3)!)).toBeCloseTo(24 * 9); });
  it('faqat janubiy devor (0-qirra) 4 m', () => { const r = insetRing(rect, 4, 0)!; expect(area(r)).toBeCloseTo(30 * 11); expect(Math.min(...r.map(p => p[1]))).toBeCloseTo(4); });
  it('soat strelkasi boʻyicha halqada ham shu qirra', () => { const cw = [...rect].reverse(); const r = insetRing(cw, 4, 2)!; /* cw: 2-qirra (30,0)→(0,0) — janub */ expect(area(r)).toBeCloseTo(30 * 11); expect(Math.min(...r.map(p => p[1]))).toBeCloseTo(4); });
  it('qavat oraliqlari va GFA', () => {
    const p = tierParts(rect, 12, [{ from: 10, inset: 3 }]);
    expect(p.map(x => [x.f0, x.f1])).toEqual([[0, 9], [9, 12]]);
    expect(tieredGfa(rect, 12, [{ from: 10, inset: 3 }])).toBeCloseTo(450 * 9 + 216 * 3);
    expect(tieredGfa(rect, 12)).toBeCloseTo(450 * 12);
    expect(insetRing(rect, 8)).toBeNull();
  });
  it('devorni tortish (+) va itarish (−)', () => { expect(area(pushEdge(rect, 1, 5)!)).toBeCloseTo(35 * 15); expect(area(pushEdge(rect, 1, -5)!)).toBeCloseTo(25 * 15); });
});
