import { describe, it, expect } from 'vitest';
import { landscape, mtmZones, canopyOf } from '../../src/core/landscape';
import { derive } from '../../src/core/derive';
import { RULES } from '../../src/norms/rules';
import { socialPlan, MTM, mtmGroups, MTM_M2, SOCIAL } from '../../src/core/social';
import { blankProject, type Project } from '../../src/core/doc';
import { frame, area, type XY } from '../../src/core/geo';
import { pointIn } from '../../src/core/plan';
const rect = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
function project(withBld: boolean): Project {
  const p = blankProject('t'); const fr = frame(p.origin);
  p.site = { rings: [rect(-90, -70, 90, 70).map(fr.toGeo)] };
  p.zones = [{ id: 'z', at: fr.toGeo([0, 0]), use: 'mtm' }] as Project['zones'];
  p.buildings = withBld ? [{ id: 'm', footprint: rect(-60, 30, 60, 45).map(fr.toGeo), floors: 2, nonRes: 2, use: 'mtm' }] as Project['buildings'] : [];
  return p;
}
const sharesEdge = (a: XY[], b: XY[]) => a.some(p => b.some(q => Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.01)) || a.some(p => pointIn(p, [b])) || b.some(p => pointIn(p, [a]));
describe('06.11 (c62): MTM binosi va uchastkasi', () => {
  it('binosiz MTM parseli sigʻimga kirmaydi (egasi: «bino boʻlmasa ham hisoblayverar ekan»)', () => {
    const d = derive(project(false));
    expect(d.mtmPlots).toHaveLength(1); expect(d.mtmPlots[0].bld).toBe(0); expect(d.mtmPlots[0].plot).toBeGreaterThan(300);
    expect(d.mtmCap).toBe(0);
  });
  it('bino bor — uchastka va bino sigʻimining kichigi (543-band, 5-ilova)', () => {
    const d = derive(project(true)), gfa = 120 * 15 * 2;
    expect(d.mtmCap).toBe(Math.min(d.mtmPlots[0].plot, Math.floor(gfa / MTM_M2)));
    expect(d.mtmPlots[0].floors).toBe(2);
  });
  it('binosiz MTM uchastkasi — landshaft zonalari chizilmaydi; bino bor — har guruhga maydoncha soyabon bilan', () => {
    expect(landscape(project(false)).find(q => q.social === 'mtm')).toBeFalsy();
    const y = landscape(project(true)).find(q => q.social === 'mtm')!, g = mtmGroups(Math.floor(120 * 15 * 2 / MTM_M2));
    const pl = y.play.filter(q => q.kind === 'bolalar');
    expect(pl.length).toBe(g); expect(pl.every(q => q.canopy && q.canopy.length === 4)).toBe(true);
    expect(y.play.some(q => q.kind === 'sport')).toBe(true); expect(y.play.some(q => q.kind === 'xojalik')).toBe(true);
  });
  it('mtmZones: guruhlar soni bino GFA dan (20 bola — ANDOZA)', () => {
    const z = mtmZones(240 * MTM_M2); expect(z.find(q => q.kind === 'bolalar')!.n).toBe(12); expect(z.find(q => q.kind === 'bolalar')!.a).toBe(MTM.play);
  });
  it('soyabon maydoncha ichida', () => { const r = rect(0, 0, 15, 10), c = canopyOf(r); expect(c.every(p => pointIn(p, [r]))).toBe(true); expect(area(c)).toBeCloseTo(24, 0); });
  it('qoida mtm-plot: binosiz — koʻrib chiqish, bino bor — natija va izoh', () => {
    const rule = RULES.find(r => r.id === 'mtm-plot')!;
    const p0 = project(false), r0 = rule.evaluate(derive(p0), p0); expect(r0.status).toBe('review'); expect(r0.note).toMatch(/bino yoʻq/);
    const p1 = project(true), r1 = rule.evaluate(derive(p1), p1); expect(r1.note).toMatch(/543-band/); expect(r1.note).toMatch(/2 qavat/); expect(r1.note).toMatch(/guruh maydonchalari/);
  });
  it('socialPlan MTM: bitta yaxlit bino (qismlar bir-biriga tegadi), shimoliy chetda', () => {
    const ring = rect(0, 0, 200, 150), sp = socialPlan(ring, 'mtm', 240, 'chiziq', SOCIAL.mtm.m2, 2, ring.map(() => 25));
    expect(sp.sections.length).toBeGreaterThan(0); expect(sp.sections.length).toBeLessThanOrEqual(6);
    const [s0, ...rest] = sp.sections.map(s => s.ring); for (const r of rest) expect(sharesEdge(s0, r)).toBe(true);
    const ys = s0.map(p => p[1]); expect(Math.max(...ys)).toBeGreaterThan(110);   // shimoliy chekinish chizigʻiga (150 − 25) yaqin
    expect(sp.gfa).toBeGreaterThan(240 * 33 * 0.9);
  });
});
