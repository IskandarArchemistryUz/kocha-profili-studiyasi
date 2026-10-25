import { describe, it, expect } from 'vitest';
import { fitMap } from '../../src/chizmadon/materials';
import { clampView, normDoc } from '../../src/chizmadon/model';

const vbOf = (svg: string) => (/viewBox="([^"]+)"/.exec(svg)?.[1] ?? '').split(' ').map(Number);
describe('Chizmadon tahlili (25.10, 3-bosqich): katak ichida kadrlash', () => {
  const src = { svg: '<rect width="200" height="100"/>', vb: [0, 0, 200, 100] as [number, number, number, number], w: 200, h: 100, scale: 1000 };
  const r = { x: 10, y: 10, w: 100, h: 50 };
  it('kattalashtirish koʻrinishni toraytiradi, masshtab yozuvi mos oʻzgaradi; siljish markazni suradi', () => {
    const a = fitMap('t', src, r, 'T'), b = fitMap('t', src, r, 'T', { z: 2, cx: 0, cy: 0 }), c = fitMap('t', src, r, 'T', { z: 2, cx: 0.25, cy: 0 });
    expect(vbOf(a)).toEqual([0, 0, 200, 100]);
    expect(vbOf(b)).toEqual([50, 25, 100, 50]);
    expect(vbOf(c)[0]).toBeCloseTo(100);
    expect(a).toMatch(/M 1:2.?000/); expect(b).toMatch(/M 1:1.?000/);
  });
  it('rasm kadrlansa — SVG ichidagi rasm (viewBox bilan); oddiy holatda — avvalgidek', () => {
    const img = { src: 'data:image/png;base64,AA', w: 100, h: 50 };
    expect(fitMap('i', img, r, 'I')).not.toMatch(/viewBox/);
    expect(vbOf(fitMap('i', img, r, 'I', { z: 2, cx: 0, cy: 0 }))).toEqual([25, 12.5, 50, 25]);
  });
  it('chegaralar va saqlash: z 1…8, siljish ±0,5; notoʻgʻri qiymatlar tashlanadi', () => {
    expect(clampView({ z: 20, cx: 3, cy: -3 })).toEqual({ z: 8, cx: 0.5, cy: -0.5 });
    const d = normDoc({ auto: { mats: { a: { view: { z: 2, cx: 0.1, cy: 0 } }, b: { view: { z: 'x' } } } } } as never);
    expect(d.auto.mats.a.view).toEqual({ z: 2, cx: 0.1, cy: 0 });
    expect(d.auto.mats.b?.view).toBeUndefined();
  });
});
