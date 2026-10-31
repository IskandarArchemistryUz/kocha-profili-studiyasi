import { describe, it, expect } from 'vitest';
import { landscape, RAMP_SLOPE } from '../../src/core/landscape';
import { blankProject, type Project } from '../../src/core/doc';
import { frame, type XY } from '../../src/core/geo';
const rect = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
function project(towerFloors = 16): Project {
  const p = blankProject('t'); const fr = frame(p.origin);
  p.site = { rings: [rect(-90, -70, 90, 70).map(fr.toGeo)] };
  const gen = (kind: string) => ({ grp: 'g', kind });
  p.buildings = [
    { id: 'pod', footprint: rect(-84, -64, 84, 64).map(fr.toGeo), floors: 1, nonRes: 1, use: 'savdo', gen: gen('stilobat') },
    { id: 'n', footprint: rect(-80, 46, 80, 62).map(fr.toGeo), floors: towerFloors, nonRes: 0, use: 'turar', z0: 1, gen: gen('oddiy') },
    { id: 's', footprint: rect(-80, -62, 80, -46).map(fr.toGeo), floors: towerFloors, nonRes: 0, use: 'turar', z0: 1, gen: gen('oddiy') },
  ] as Project['buildings'];
  return p;
}
describe('stilobat tomi (31.10)', () => {
  it('tomda landshaft, yongʻin yoʻlagi va yerdan rampa (H ≥ 28 m)', () => {
    const p = project(), ys = landscape(p), roof = ys.find(y => y.roofOf === 'pod');
    expect(roof).toBeTruthy();
    expect(roof!.z).toBeCloseTo(p.settings.floorHeight, 5);
    expect(roof!.areas.green).toBeGreaterThan(1000);
    expect(roof!.fire?.area ?? 0).toBeGreaterThan(100);
    expect(roof!.ramp).toBeTruthy();
    expect(roof!.ramp!.len).toBe(Math.ceil(p.settings.floorHeight / RAMP_SLOPE));
  });
  it('past binolar (H < 28 m) — tomda yoʻlak va rampa yoʻq', () => {
    const roof = landscape(project(5)).find(y => y.roofOf === 'pod');
    expect(roof?.fire).toBeFalsy(); expect(roof?.ramp).toBeFalsy();
  });
});
