import { describe, it, expect } from 'vitest';
import { aptRooms } from '../../src/core/aptrooms';
import { area, type XY } from '../../src/core/geo';

describe('Kvartira xonalari (11-band)', () => {
  it('boʻlinma devorlari kvartirani tasmalarga boʻladi, hoʻl zona alohida', () => {
    // 9,9 × 7 m kvartira, fasad pastda (y = 0), uchta modul — ikkita devor
    const ring: XY[] = [[0, 0], [9.9, 0], [9.9, 7], [0, 7]];
    const a = { rooms: 2, ring, area: area(ring), door: [5, 7] as XY, mods: [0, 1, 2], wet: [[3.5, 5], [6.5, 5], [6.5, 7], [3.5, 7]] as XY[], walls: [[[3.3, 0], [3.3, 3.85]], [[6.6, 0], [6.6, 3.85]]] as [XY, XY][], wing: 0, sec: 0 };
    const r = aptRooms(a);
    expect(r.wet).toHaveLength(1); expect(area(r.wet[0])).toBeCloseTo(6, 0);
    expect(r.rooms.length).toBeGreaterThanOrEqual(3);
    const sum = r.rooms.reduce((t, q) => t + area(q), 0) + area(r.wet[0]);
    expect(sum).toBeGreaterThan(area(ring) * 0.9); expect(sum).toBeLessThanOrEqual(area(ring) + 1e-6);
  });
  it('devor yoʻq — butun kvartira bitta xona', () => {
    const ring: XY[] = [[0, 0], [6, 0], [6, 6], [0, 6]];
    const r = aptRooms({ rooms: 1, ring, area: 36, door: [3, 6], mods: [0], wet: [], walls: [], wing: 0, sec: 0 });
    expect(r.rooms).toHaveLength(1); expect(r.wet).toHaveLength(0);
  });
});
