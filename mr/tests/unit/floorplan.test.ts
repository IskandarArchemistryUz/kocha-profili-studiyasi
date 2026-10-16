import { describe, it, expect } from 'vitest';
import { layoutSection, type SecPlan } from '../../src/core/apartments';
import { planGeometry, floorPlanSvg, allPlansSvg } from '../../src/core/floorplan';
import type { XY } from '../../src/core/geo';

const rect: XY[] = [[0, 0], [33, 0], [33, 15], [0, 15]];
const mk = (ring: XY[]): SecPlan => ({ bid: 'b1', ring, layout: layoutSection(ring, () => false, [20, 40, 30, 10]), f0: 1, f1: 9, z0: 0, halfDepth: 7.5 });

describe('Seksiya rejasi', () => {
  it('yadro markazda, koridor uzun oʻq boʻylab, kvartiralar devor ichida', () => {
    const G = planGeometry(mk(rect));
    expect(G.core).toHaveLength(4); expect(G.corridor).toHaveLength(4);
    const cx = G.core.reduce((s, p) => s + p[0], 0) / 4, cy = G.core.reduce((s, p) => s + p[1], 0) / 4;
    expect(cx).toBeCloseTo(16.5, 1); expect(cy).toBeCloseTo(7.5, 1);
    expect(G.apts.length).toBeGreaterThan(4);
    for (const a of G.apts) for (const p of a.ring) { expect(p[0]).toBeGreaterThanOrEqual(-0.01); expect(p[0]).toBeLessThanOrEqual(33.01); expect(p[1]).toBeGreaterThanOrEqual(-0.01); expect(p[1]).toBeLessThanOrEqual(15.01); }
    // kvartiralar bir-birini qoplamaydi: maydonlar yigʻindisi ≤ seksiya − yadro − koridor
    const A = (r: XY[]) => Math.abs(r.reduce((s, p, i) => { const q = r[(i + 1) % r.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);
    expect(G.apts.reduce((s, a) => s + A(a.ring), 0)).toBeLessThanOrEqual(33 * 15 - A(G.core) - A(G.corridor) + 6.6 * 1.6 + 1);   // yadro va koridor kesishadi
  });
  it('burilgan seksiya — chizma OBB ga tekislanadi, SVG mm da, oʻlcham va oʻqlar bor', () => {
    const a = Math.PI / 6, rot = rect.map(p => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)] as XY);
    const r = floorPlanSvg(mk(rot), { scale: 200, dims: true, title: 'Sinov', floor: 3 });
    expect(r.svg).toContain('mm"'); expect(r.svg).toContain('33 m'); expect(r.svg).toContain('15 m'); expect(r.svg).toContain('3-qavat');
    expect(r.widthMm).toBeGreaterThan(33 * 5); expect(r.widthMm).toBeLessThan(33 * 5 + 80);
    expect(r.apts.length).toBeGreaterThan(4);
  });
  it('barcha seksiyalar — bitta SVG', () => {
    const s = allPlansSvg([mk(rect), mk(rect.map(p => [p[0] + 50, p[1]] as XY))], 2, 200, (_, i) => `S${i + 1}`);
    expect(s).toContain('S1'); expect(s).toContain('S2'); expect(s).toContain('Seksiyalar rejalari');
  });
});
