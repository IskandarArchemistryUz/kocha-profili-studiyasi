import { describe, it, expect } from 'vitest';
import { thumbData, thumbSvg, cleanThumb, TW, TH } from '../../src/core/projthumb';

const sq = (x: number, y: number, d: number): [number, number][] => [[x, y], [x + d, y], [x + d, y + d], [x, y + d]];

describe('loyiha eskizi (22.11)', () => {
  it('boʻsh loyiha — eskiz yoʻq', () => {
    expect(thumbData({ site: null, buildings: [], streets: [] })).toBeNull();
  });
  it('uchastka va binolar oynaga sigʻadi, qavat saqlanadi', () => {
    const t = thumbData({
      site: { rings: [sq(69.27, 41.31, 0.004)] },
      buildings: [{ footprint: sq(69.271, 41.311, 0.0005), floors: 12 } as any, { footprint: sq(69.273, 41.312, 0.0004), floors: 2 } as any],
      streets: [{ axis: [[69.27, 41.312], [69.274, 41.312]] } as any],
    })!;
    expect(t.s?.length).toBe(1); expect(t.b?.length).toBe(2); expect(t.r?.length).toBe(1);
    expect(t.b![0][0]).toBe(12);
    for (const a of [...t.s!, ...t.r!, ...t.b!.map(b => b.slice(1))]) for (let i = 0; i < a.length; i += 2) {
      expect(a[i]).toBeGreaterThanOrEqual(0); expect(a[i]).toBeLessThanOrEqual(TW);
      expect(a[i + 1]).toBeGreaterThanOrEqual(0); expect(a[i + 1]).toBeLessThanOrEqual(TH);
    }
    const svg = thumbSvg(t);
    expect(svg).toContain('class="f3"'); expect(svg).toContain('class="f1"'); expect(svg).toContain('class="st"');
  });
  it('bulutdan kelgan qiymat tozalanadi — matn/HTML oʻtmaydi', () => {
    expect(cleanThumb('<svg onload=x>')).toBeNull();
    expect(cleanThumb({ b: [['<img>', 1, 2, 3, 4]] })).toBeNull();
    const c = cleanThumb({ s: [[1, 2, 3, 4, 5, 6]], x: 'y' })!;
    expect(c.s).toEqual([[1, 2, 3, 4, 5, 6]]);
    expect(thumbSvg(c)).not.toContain('undefined');
  });
});
