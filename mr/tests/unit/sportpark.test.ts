import { describe, it, expect } from 'vitest';
import { sportPark } from '../../src/core/sportpark';
import type { XY } from '../../src/core/geo';

const box = (w: number, h: number): XY[] => [[0, 0], [w, 0], [w, h], [0, h]];
const pin = (p: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
describe('Sport hududi (31.10): stadion, basseyn, kortlar — parkdan farqli', () => {
  it('katta hudud (4,4 ga): stadion + yugurish yoʻlkasi, yopiq majmua, basseyn, kortlar; hammasi kvartal ichida', () => {
    const B = box(260, 170), S = sportPark(B, 260 * 170), ks = S.map(s => s.k);
    expect(ks).toContain('stadion'); expect(ks).toContain('yolka'); expect(ks).toContain('yopiq'); expect(ks).toContain('basseyn');
    expect(ks.some(k => k === 'tennis' || k === 'basket')).toBe(true);
    for (const s of S) for (const p of s.ring) expect(pin(p, B)).toBe(true);
  });
  it('kichik hudud (0,6 ga): stadion yoʻq, basseyn va maydonchalar; juda kichik — workout', () => {
    const ks = sportPark(box(100, 60), 6000).map(s => s.k);
    expect(ks).not.toContain('stadion'); expect(ks).toContain('basseyn'); expect(ks.length).toBeGreaterThan(2);
    expect(sportPark(box(30, 22), 660).map(s => s.k)).toEqual(['workout']);
  });
});
