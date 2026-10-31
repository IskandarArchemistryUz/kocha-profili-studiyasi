import { describe, it, expect } from 'vitest';
import { landscape, greenBalance } from '../../src/core/landscape';
import { blankProject, type Project } from '../../src/core/doc';
import { frame, type XY } from '../../src/core/geo';
const rect = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
function project(use: 'maktab' | 'mtm'): Project {
  const p = blankProject('t'); const fr = frame(p.origin);
  p.site = { rings: [rect(-90, -70, 90, 70).map(fr.toGeo)] };
  p.zones = [{ id: 'z', at: fr.toGeo([0, 0]), use }] as Project['zones'];
  p.buildings = [{ id: 'm', footprint: rect(-70, 30, 10, 55).map(fr.toGeo), floors: 3, nonRes: 3, use }] as Project['buildings'];
  return p;
}
describe('maktab va MTM uchastkasi landshafti (31.10)', () => {
  it('maktab: sport zonasi, oʻquv-tajriba bogʻi, maydonchalar; turar joy hisoblariga kirmaydi', () => {
    const p = project('maktab'), ys = landscape(p), y = ys.find(q => q.social === 'maktab');
    expect(y).toBeTruthy();
    const kinds = y!.play.map(q => q.kind);
    expect(kinds).toContain('sport'); expect(kinds).toContain('tajriba');
    expect(y!.trees.length).toBeGreaterThan(10);
    expect(greenBalance(p, ys).yardGreen).toBe(0);
  });
  it('MTM: guruh maydonchalari ustun', () => {
    const y = landscape(project('mtm')).find(q => q.social === 'mtm')!;
    const a = (k: string) => y.play.filter(q => q.kind === k).reduce((t, q) => t + q.area, 0);
    expect(a('bolalar')).toBeGreaterThan(a('sport'));
  });
});
