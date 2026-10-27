import { describe, it, expect } from 'vitest';
import { entriesOf } from '../../src/core/landscape';
import type { XY } from '../../src/core/geo';

const rect = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const B = (r: XY[], extra: Record<string, unknown> = {}) => ({ b: { id: 'x', footprint: [], floors: 9, nonRes: 0, use: 'turar', ...extra } as never, r });

describe('hovliga kirishlar', () => {
  const outer = rect(0, 0, 120, 100);
  // janubiy qator: ikki seksiya, oraligʻi 10 m; shimolda — arka bilan ajralgan ikki seksiya
  const own = [B(rect(6, 6, 50, 21)), B(rect(60, 6, 114, 21)), B(rect(6, 79, 54, 94)), B(rect(60, 79, 114, 94))];
  const arch = [B(rect(54, 79, 60, 94), { gen: { grp: 'g', kind: 'arka' }, z0: 2 })];
  const E = entriesOf(outer, own, arch);
  it('arka, oraliq va podyezdlar topiladi', () => {
    expect(E.filter(e => e.kind === 'arka')).toHaveLength(1);
    const o = E.filter(e => e.kind === 'oraliq');
    expect(o.length).toBeGreaterThanOrEqual(1);
    expect(o.some(e => Math.abs(e.p[0] - 55) < 2 && e.p[1] < 25 && e.w === 10)).toBe(true);
    expect(E.filter(e => e.kind === 'podyezd')).toHaveLength(4);
  });
  it('podyezd hovli tomonida (kvartal chetidan uzoq tomon)', () => {
    for (const e of E.filter(x => x.kind === 'podyezd')) {
      const south = e.p[1] < 50; expect(south ? e.p[1] > 21 : e.p[1] < 79).toBe(true);
    }
  });
  it('arka yoʻnalishi hovli tomon', () => {
    const a = E.find(e => e.kind === 'arka')!; expect(a.d[1]).toBeLessThan(-0.9);   // shimoldan hovliga — janubga
  });
});

describe('ichki burchak — oʻtish emas', () => {
  it('perpendikulyar seksiyalar orasidagi ichki burchak boʻshligʻi kirish deb hisoblanmaydi', () => {
    const outer = rect(0, 0, 200, 150);
    const own = [B([[6, 6], [29, 6], [29, 21], [21, 21], [21, 29], [6, 29]]), B(rect(29, 6, 63, 21)), B(rect(6, 29, 21, 72))];
    // (29,21)–(21,29) diagonali: binolar ichki burchakda, koʻchaga chiqmaydi
    expect(entriesOf(outer, own, []).filter(e => e.kind === 'oraliq')).toHaveLength(0);
  });
});
