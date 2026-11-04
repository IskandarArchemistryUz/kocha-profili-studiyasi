import { describe, it, expect } from 'vitest';
import { contourStep, contourSegs, windowOf, slopeAt, type ReliefGrid } from '../../src/core/relief';
import { sheetSvg, SHEET_DEFAULT, type SheetOpts } from '../../src/core/sheet';
import { blankProject } from '../../src/core/doc';
import { frame, type XY } from '../../src/core/geo';

/** 04.11 (egasi: tahlil varaqlari — relyef): gorizontallar, qiyalik, varaq */
const grid = (f: (x: number, y: number) => number, n = 41, step = 10): ReliefGrid => { const r = (n - 1) / 2 * step, h = new Float32Array(n * n); for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) h[j * n + i] = f(-r + i * step, -r + j * step); return { n, step, radius: r, c0: [0, 0], h }; };
describe('relyef', () => {
  it('oraliq: farqqa qarab 8–25 chiziq', () => { expect(contourStep(3)).toBe(0.5); expect(contourStep(20)).toBe(1); expect(contourStep(120)).toBe(5); });
  it('qiya tekislik z = 400 + 0,05·x: gorizontallar tik chiziqlar, qiyalik 5 %', () => {
    const g = grid((x) => 400 + 0.05 * x), w = windowOf(g, [-100, -100, 100, 100])!;
    expect(w.min).toBeCloseTo(395); expect(w.max).toBeCloseTo(405);
    const [c] = contourSegs(g, w, [401]);
    expect(c.segs.length).toBeGreaterThan(10);
    for (const [a, b] of c.segs) { expect(a[0]).toBeCloseTo(20, 3); expect(b[0]).toBeCloseTo(20, 3); }
    expect(slopeAt(g, 20, 20)).toBeCloseTo(5, 3);
  });
  it('varaq: gipsometriya, gorizontallar va uchastka qiyaligi; toʻr yoʻq — izoh', () => {
    const p = blankProject('t'), fr = frame(p.origin), R = (a: number): XY[] => [[-a, -a], [a, -a], [a, a], [-a, a]];
    p.site = { rings: [R(80).map(fr.toGeo)] };
    const ctx = { buildings: [], roads: [], rails: [], water: [], waterways: [], green: [], trees: [] };
    const o = { ...SHEET_DEFAULT, kind: 'relyef', show: { ...SHEET_DEFAULT.show } } as SheetOpts;
    expect(sheetSvg(p, ctx, o).legend.some(l => /yuklanmagan/.test(l.label))).toBe(true);
    const r = sheetSvg(p, { ...ctx, terrain: grid((x, y) => 420 + 0.04 * x + 0.02 * y, 61) }, o);
    expect(r.svg).toContain('id="Gipsometriya"'); expect(r.svg).toContain('id="Gorizontallar"');
    const lab = r.legend.map(l => l.label).join('|');
    expect(lab).toMatch(/Gorizontallar: har/); expect(lab).toMatch(/Uchastka: .* oʻrtacha qiyalik 4,5 %/); expect(lab).toMatch(/AWS Terrain Tiles/);
  });
});
