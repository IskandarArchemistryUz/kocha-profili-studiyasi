import { describe, it, expect } from 'vitest';
import { projectNodes } from '../../src/kochasoz/projnode';

const lat0 = 41.3110, lon0 = 69.2797, dLon = 1 / (111320 * Math.cos(lat0 * Math.PI / 180)), dLat = 1 / 110574;
const P = (x: number, y: number): [number, number] => [lon0 + x * dLon, lat0 + y * dLat];

describe('Koʻchasoz C: loyiha ichidagi chorrahalar (25.11)', () => {
  it('ikki koʻcha kesishuvi: 4 tarmoq, asosiy — magistral, burchak ≈ 90°', () => {
    const r = projectNodes([
      { id: 'mah', axis: [P(0, -90), P(0, 90)], cat: 'mahalliy' },
      { id: 'mag', axis: [P(-120, 0), P(120, 0)], cat: 'tuman-magistral' }]);
    expect(r).toHaveLength(1);
    expect(r[0].main).toBe('mag'); expect(r[0].cross).toBe('mah');
    expect(r[0].r.arms).toHaveLength(4); expect(r[0].r.tee).toBe(false); expect(r[0].r.miss).toBeNull();
    expect(Math.abs(r[0].r.ang - 90)).toBeLessThan(3);
  });
  it('T-tutashuv (uch boshqa koʻcha oʻrtasiga 1 m yetmagan): 3 tarmoq, yoʻq tomoni aniqlanadi', () => {
    const r = projectNodes([
      { id: 'b', axis: [P(0, -100), P(120, -100)], cat: 'mahalliy' },
      { id: 'c', axis: [P(60, -160), P(60, -101)], cat: 'mahalliy' }]);
    expect(r).toHaveLength(1);
    expect(r[0].main).toBe('b'); expect(r[0].cross).toBe('c');
    expect(r[0].r.tee).toBe(true); expect(['N', 'S']).toContain(r[0].r.miss);
  });
  it('qiya kesishuv: burchak geometriyadan; bir nechta chorraha — koʻp tarmoqlisi birinchi', () => {
    const r = projectNodes([
      { id: 'h', axis: [P(-150, 0), P(150, 0)], cat: 'mahalliy' },
      { id: 'q', axis: [P(-60, -60), P(60, 60)], cat: 'mahalliy' },
      { id: 't', axis: [P(100, 0.5), P(100, 80)], cat: 'otish' }]);
    expect(r).toHaveLength(2);
    expect(r[0].r.arms).toHaveLength(4); expect(r[1].r.arms).toHaveLength(3);
    expect([45, 135]).toContain(Math.round(r[0].r.ang / 5) * 5);
    expect(r[1].cross).toBe('t');
  });
  it('kesishmagan koʻchalar — chorraha yoʻq', () => {
    expect(projectNodes([{ id: 'a', axis: [P(0, 0), P(100, 0)], cat: 'mahalliy' }, { id: 'b', axis: [P(0, 30), P(100, 30)], cat: 'mahalliy' }])).toEqual([]);
  });
});
