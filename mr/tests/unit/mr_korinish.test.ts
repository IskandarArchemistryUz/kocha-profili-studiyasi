import { describe, it, expect } from 'vitest';
import { korinishVga, korStat, korColor, KOR_COLS } from '../../src/core/korinish';

describe('Koʻrinish tekshiruvi (VGA)', () => {
  const sq = (x: number, y: number, s: number): [number, number][] => [[x, y], [x + s, y], [x + s, y + s], [x, y + s]];
  it('loyihada qoʻshilgan bino koʻrinishni kamaytiradi, ichidagi nuqta NaN', () => {
    const pts: [number, number][] = [[0, 0], [30, 0], [50, 50]];
    const o = korinishVga({ pts, hozir: [], loyiha: [sq(10, -10, 15), sq(45, 45, 10)], R: 100 });
    expect(o.hozir[0]).toBeCloseTo(Math.PI * 100 * 100, -2);
    expect(o.loyiha[0]).toBeLessThan(o.hozir[0]);
    expect(Number.isNaN(o.loyiha[2])).toBe(true);
  });
  it('statistika faqat uchastka ichida, shkala chetlari', () => {
    const v = Float32Array.from([500, 2000, 3000, NaN, 9000]);
    const s = korStat(v, [true, true, true, true, false], 5);
    expect(s.n).toBe(3); expect(s.med).toBe(2000); expect(s.low).toBeCloseTo(1 / 3); expect(s.freeHa).toBeCloseTo(3 * 25 / 10_000);
    expect(korColor(0, 100)).toBe(KOR_COLS[0]); expect(korColor(500, 100)).toBe(KOR_COLS[4]);
  });
});
