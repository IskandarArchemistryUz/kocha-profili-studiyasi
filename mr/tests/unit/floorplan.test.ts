import { describe, it, expect } from 'vitest';
import { layoutSection, type SecPlan } from '../../src/core/apartments';
import { planGeometry, floorPlanSvg, allPlansSvg } from '../../src/core/floorplan';
import type { XY } from '../../src/core/geo';

const rect: XY[] = [[0, 0], [33, 0], [33, 15], [0, 15]];
const mk = (ring: XY[]): SecPlan => ({ bid: 'b1', ring, layout: layoutSection(ring, () => false, [20, 40, 30, 10]), f0: 1, f1: 9, z0: 0, halfDepth: 7.5 });

describe('Seksiya rejasi', () => {
  it('seksiya: yadro orqa fasadga yopishgan, maydoncha oldida, kvartiralar devor ichida va maydonchaga kiradi', () => {
    const G = planGeometry(mk(rect));
    expect(G.kind).toBe('seksiya'); expect(G.core).toHaveLength(4);
    const cx = G.core.reduce((s, p) => s + p[0], 0) / 4, cy = G.core.reduce((s, p) => s + p[1], 0) / 4;
    expect(cx).toBeCloseTo(16.5, 1); expect(Math.min(Math.abs(cy - 1.8), Math.abs(cy - 13.2))).toBeLessThan(0.5);   // fasadga yopishgan (0,3 + 3/2)
    for (const a of G.apts) { expect(a.wet.length).toBeGreaterThanOrEqual(3); expect(Object.values(a.roomOf)).toContain('O'); }
    expect(G.apts.length).toBeGreaterThan(4);
    for (const a of G.apts) for (const p of a.ring) { expect(p[0]).toBeGreaterThanOrEqual(-0.01); expect(p[0]).toBeLessThanOrEqual(33.01); expect(p[1]).toBeGreaterThanOrEqual(-0.01); expect(p[1]).toBeLessThanOrEqual(15.01); }
    // kvartiralar bir-birini qoplamaydi: maydonlar yigʻindisi ≤ seksiya − yadro − koridor
    const A = (r: XY[]) => Math.abs(r.reduce((s, p, i) => { const q = r[(i + 1) % r.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);
    expect(G.apts.reduce((s, a) => s + A(a.ring), 0)).toBeLessThanOrEqual(33 * 15 - A(G.core) - A(G.lobby) + 1);
    // har kvartira kirishi maydoncha yoki koridorga tegadi
    const near = (p: XY, rr: XY[]) => Math.min(...rr.map((v, i) => { const w = rr[(i + 1) % rr.length], dx = w[0] - v[0], dy = w[1] - v[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - v[0]) * dx + (p[1] - v[1]) * dy) / L2)); return Math.hypot(v[0] + t * dx - p[0], v[1] + t * dy - p[1]); }));
    for (const a of G.apts) expect(Math.min(near(a.entry, G.lobby), ...G.corridor.map(c => near(a.entry, c)))).toBeLessThan(0.6);
  });
  it('uzun seksiya (> 42 m) — koridor turi', () => {
    const long: XY[] = [[0, 0], [60, 0], [60, 15], [0, 15]];
    const G = planGeometry(mk(long)); expect(G.kind).toBe('koridor'); expect(G.corridor[0]).toHaveLength(4);
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
