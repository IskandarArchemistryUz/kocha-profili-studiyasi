import { describe, it, expect } from 'vitest';
import { gridStreets, gridStreetsAround, lineHitsRing, profileForOsm, DEFAULT_GRID } from '../../src/core/gridgen';
import type { XY } from '../../src/core/geo';

const segDist = (p: XY, a: XY, b: XY) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)); return Math.hypot(a[0] + t * dx - p[0], a[1] + t * dy - p[1]); };
describe('toʻr mavjud koʻchalar orasida', () => {
  const site: XY[] = [[0, 0], [600, 0], [600, 600], [0, 600]];
  const road: XY[] = [[-100, 290], [700, 330]];   // uchastkani kesib oʻtadi (biroz qiya)
  const g = { ...DEFAULT_GRID, w: 113, h: 113, angle: 0 };
  it('toʻr koʻchalari mavjud koʻcha koridoriga kirmaydi, ikki tomonda ham bor', () => {
    const half = 20, sts = gridStreetsAround(site, [{ axis: road, half }], g);
    expect(sts.length).toBeGreaterThan(4);
    for (const s of sts) for (let k = 0; k <= 10; k++) { const p: XY = [s.axis[0][0] + (s.axis[1][0] - s.axis[0][0]) * k / 10, s.axis[0][1] + (s.axis[1][1] - s.axis[0][1]) * k / 10]; expect(segDist(p, road[0], road[1])).toBeGreaterThan(half - 0.5); }
    const above = sts.some(s => s.axis[0][1] > 340 && s.axis[1][1] > 340), below = sts.some(s => s.axis[0][1] < 280 && s.axis[1][1] < 280);
    expect(above && below).toBe(true);
  });
  it('saqlanadigan koʻcha boʻlmasa — oddiy toʻr bilan bir xil', () => {
    expect(gridStreetsAround(site, [], g)).toEqual(gridStreets(site, g));
  });
  it('chiziq uchastkani kesadimi; OSM sinfi → profil', () => {
    expect(lineHitsRing(road, site)).toBe(true);
    expect(lineHitsRing([[-50, -50], [-10, 700]], site)).toBe(false);
    expect([profileForOsm('primary'), profileForOsm('tertiary'), profileForOsm('residential'), profileForOsm('service')]).toEqual(['magistral-45', 'tuman-40', 'mahalla-15', 'otish-8']);
  });
});
