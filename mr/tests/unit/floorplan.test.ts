import { describe, it, expect } from 'vitest';
import { layoutSection, type SecPlan } from '../../src/core/apartments';
import { floorPlanSvg, allPlansSvg, sectionPlan, sectionChecks, buildingFloorsSvg, floorGroups } from '../../src/core/floorplan';
import type { XY } from '../../src/core/geo';

const rect: XY[] = [[0, 0], [33, 0], [33, 15], [0, 15]];
const mk = (ring: XY[]): SecPlan => ({ bid: 'b1', ring, layout: layoutSection(ring, () => false, [20, 40, 30, 10]), f0: 1, f1: 9, z0: 0, halfDepth: 7.5 });

describe('Seksiya rejasi (chizma)', () => {
  it('kvartiralar roʻyxati rejadan: har kvartira fasad modullariga ega, rejadagi maydon', () => {
    const s = mk(rect), P = sectionPlan(s);
    expect(s.layout.apts.length).toBe(P.apts.length);
    s.layout.apts.forEach((a, i) => { expect(a.mods).toEqual(P.apts[i].mods); expect(a.living.length).toBe(a.rooms); expect(a.area).toBeGreaterThan(20); });
    const ch = sectionChecks(s); expect(ch.filter(c => c.ok === false)).toEqual([]);
  });
  it('burilgan seksiya — chizma OBB ga tekislanadi, SVG mm da, oʻlcham, eshik va zina bor', () => {
    const a = Math.PI / 6, rot = rect.map(p => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)] as XY);
    const r = floorPlanSvg(mk(rot), { scale: 200, dims: true, title: 'Sinov', floor: 3 });
    expect(r.svg).toContain('mm"'); expect(r.svg).toContain('33 m'); expect(r.svg).toContain('15 m'); expect(r.svg).toContain('3-qavat'); expect(r.svg).toContain('qoidalar bajarilgan');
    expect(r.widthMm).toBeGreaterThan(33 * 5); expect(r.widthMm).toBeLessThan(33 * 5 + 80);
    expect(r.apts.length).toBeGreaterThan(4); expect(r.plan.stairs.length).toBeGreaterThanOrEqual(1);
  });
  it('barcha seksiyalar — bitta SVG', () => {
    const s = allPlansSvg([mk(rect), mk(rect.map(p => [p[0] + 50, p[1]] as XY))], 2, 200, (_, i) => `S${i + 1}`);
    expect(s).toContain('S1'); expect(s).toContain('S2'); expect(s).toContain('Rejalar');
  });
  it('qavatlar: 1-qavat noturar — savdo va yashovchilar xonalari, turar qavatda balkonlar', () => {
    const s = mk([[0, 0], [33, 0], [33, 15], [0, 15]]);   // f0 = 1 (1-qavat noturar), f1 = 9
    expect(floorGroups(s).map(g => [g.from, g.to, g.type])).toEqual([[1, 1, 'ground'], [2, 9, 'typical']]);
    const g = floorPlanSvg(s, { scale: 200, dims: true, title: 'S', floor: 1 });
    expect(g.plan.apts.length).toBe(0); expect(g.plan.rooms.some(q => q.kind === 'savdo')).toBe(true); expect(g.plan.rooms.some(q => q.kind === 'tozalash')).toBe(true);
    expect(g.svg).toContain('savdo / xizmat'); expect(g.svg).toContain('tozalash anjomlari');
    const t = floorPlanSvg(s, { scale: 200, dims: true, title: 'S', floor: 5, bal: 'ochiq' });
    expect(t.plan.apts.length).toBeGreaterThan(3); expect(t.svg).toContain('balkon ×0,3');
    const all = buildingFloorsSvg(s, 200, 'B1'); expect(all).toContain('1-qavat'); expect(all).toContain('2–9-qavatlar');
  });
});
