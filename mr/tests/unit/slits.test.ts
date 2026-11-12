import { describe, it, expect } from 'vitest';
// @ts-ignore
import * as fs from 'node:fs';
import { closeSlits } from '../../src/core/slits';
import { frame } from '../../src/core/geo';
import { signedArea, type XY } from '../../src/core/geo';

const load = (nm: string) => { const p = JSON.parse(fs.readFileSync(`tests/fixtures/g1-${nm}.json`, 'utf8')).project; const fr = frame(p.origin); return p.site.rings[0].map((q: XY) => fr.toLocal(q)) as XY[]; };

describe('closeSlits (G1)', () => {
  it('toʻrtburchak oʻzgarmaydi', () => {
    const r: XY[] = [[0, 0], [100, 0], [100, 60], [0, 60]];
    expect(closeSlits(r).n).toBe(0);
  });
  it('L-shakl: botiq burchak oʻzgarmaydi', () => {
    const r: XY[] = [[0, 0], [100, 0], [100, 40], [40, 40], [40, 100], [0, 100]];
    expect(closeSlits(r).n).toBe(0);
  });
  it('bitta 4 m × 40 m tirqish yopiladi', () => {
    const r: XY[] = [[0, 0], [48, 0], [48, 40], [52, 40], [52, 0], [100, 0], [100, 80], [0, 80]];
    const f = closeSlits(r);
    expect(f.n).toBe(1);
    expect(Math.abs(signedArea(f.ring))).toBeCloseTo(8000, -1);
  });
  it('keng (20 m) oʻyiq yopilmaydi', () => {
    const r: XY[] = [[0, 0], [40, 0], [40, 40], [60, 40], [60, 0], [100, 0], [100, 80], [0, 80]];
    expect(closeSlits(r).n).toBe(0);
  });
  for (const nm of ['olmazor', 'yunusobod']) it(`${nm}: tirqishlar yopiladi`, () => {
    const r = load(nm), f = closeSlits(r);
    expect(f.n).toBeGreaterThanOrEqual(5);                                        // Olmazor 5, Yunusobod 6 ta tirqish
    expect(Math.abs(signedArea(f.ring))).toBeGreaterThan(Math.abs(signedArea(r)));   // faqat qoʻshiladi
  });
});
