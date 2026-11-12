import { describe, it, expect } from 'vitest';
import { roadStubs, type RoadIn } from '../../src/core/roadstubs';
import type { XY } from '../../src/core/geo';

const site: XY[] = [[0, 0], [200, 0], [200, 200], [0, 200]];
const ns = (x: number, id: number): RoadIn => ({ id, cls: 'residential', pts: [[x, -300], [x, 0], [x, 100], [x, 200], [x, 500]] });

describe('roadStubs (egasi 12.11: mavjud yoʻllarni uchastka ichiga davom ettirish)', () => {
  it('T-chorrahada toʻxtagan yoʻl uchastka orqali qarshi tomondagi uch bilan ulanadi', () => {
    const roads: RoadIn[] = [ns(-10, 1), ns(210, 2), { id: 3, cls: 'residential', pts: [[-300, 100], [-10, 100]] }, { id: 4, cls: 'tertiary', pts: [[500, 104], [210, 104]] }];
    const s = roadStubs(site, roads, []);
    expect(s).toHaveLength(1);
    expect(s[0].hit).toBe('uch');
    expect(s[0].profile).toBe('tuman-40');                     // muhimrog‘i (tertiary) birinchi
  });
  it('loyiha koʻchasida toʻxtaydi (chorraha)', () => {
    const roads: RoadIn[] = [ns(-10, 1), { id: 3, cls: 'residential', pts: [[-300, 100], [-10, 100]] }];
    const s = roadStubs(site, roads, [[[120, -50], [120, 250]]]);
    expect(s).toHaveLength(1); expect(s[0].hit).toBe('kocha');
    expect(s[0].axis[1][0]).toBeCloseTo(120, 3);
  });
  it('davom etayotgan yoʻl va piyoda yoʻlakka taklif yoʻq; uzoqdagi uchga ham yoʻq', () => {
    const roads: RoadIn[] = [ns(-10, 1), { id: 5, cls: 'residential', pts: [[-300, 50], [-10, 50], [300, 50]] }, { id: 6, cls: 'footway', pts: [[-300, 150], [-10, 150]] }, { id: 7, cls: 'residential', pts: [[-300, 120], [-100, 120]] }];
    expect(roadStubs(site, roads, [])).toHaveLength(0);
  });
  it('qarshi uch boʻlmasa — narigi chegaragacha', () => {
    const s = roadStubs(site, [{ id: 3, cls: 'residential', pts: [[-300, 100], [-5, 100]] }], []);
    expect(s).toHaveLength(1); expect(s[0].hit).toBe('chegara'); expect(s[0].axis[1][0]).toBeCloseTo(200, 3);
  });
  it('ikkinchi davom birinchisida toʻxtaydi (perpendikulyar)', () => {
    const s = roadStubs(site, [{ id: 3, cls: 'tertiary', pts: [[-300, 100], [-5, 100]] }, { id: 8, cls: 'residential', pts: [[60, 400], [60, 205]] }], []);
    expect(s).toHaveLength(2); expect(s[1].hit).toBe('kocha'); expect(s[1].axis[1][1]).toBeCloseTo(100, 3);
  });
});
describe('roadStubs: takror yoʻq', () => {
  it('davom ettirilgan uchga qayta taklif berilmaydi', () => {
    const roads: RoadIn[] = [{ id: 3, cls: 'residential', pts: [[-300, 100], [-5, 100]] }];
    const s = roadStubs(site, roads, []); expect(s).toHaveLength(1);
    expect(roadStubs(site, roads, [s[0].axis])).toHaveLength(0);
  });
});
