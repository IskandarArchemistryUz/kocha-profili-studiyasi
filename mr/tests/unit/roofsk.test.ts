import { describe, it, expect } from 'vitest';
import { skeletonRoof, groupRoof, roofGroups } from '../../src/core/roofsk';
import type { XY } from '../../src/core/geo';

const area2 = (t: number[]) => { let s = 0; for (let i = 0; i < t.length; i += 9) s += Math.abs((t[i + 3] - t[i]) * (t[i + 7] - t[i + 1]) - (t[i + 4] - t[i + 1]) * (t[i + 6] - t[i])) / 2; return s; };
/** tom yuzasi balandligi (x, y) nuqtada — uni oʻz ichiga olgan uchburchakdan */
const zAt = (t: number[], x: number, y: number) => { for (let i = 0; i < t.length; i += 9) { const [ax, ay, az, bx, by, bz, cx, cy, cz] = t.slice(i, i + 9); const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (Math.abs(d) < 1e-9) continue; const l1 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / d, l2 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / d, l3 = 1 - l1 - l2; if (l1 > -1e-6 && l2 > -1e-6 && l3 > -1e-6) return l1 * az + l2 * bz + l3 * cz; } return NaN; };

describe('skelet tom (bir xil nishab, endova)', () => {
  const L: XY[] = [[0, 0], [30, 0], [30, 10], [10, 10], [10, 30], [0, 30]];
  it('L shakl: bitta yaxlit tom, tarhi butun dogʻni qoplaydi, tizma 5·tan30°', () => {
    const r = skeletonRoof([L], 'tort')!;
    expect(area2(r.tris)).toBeCloseTo(500, 3);
    expect(r.h).toBeCloseTo(5 * Math.tan(Math.PI / 6), 3);
    // ichki burchak (10, 10) dan endova: diagonal boʻyicha balandlik chiziqli oshadi
    expect(zAt(r.tris, 8, 8)).toBeCloseTo(2 * Math.tan(Math.PI / 6), 3);
  });
  it('ikki nishabli L: qanot uchlarida tik fronton (devor), tarh yuzasi saqlanadi', () => {
    const r = skeletonRoof([L], 'ikki')!;
    expect(r.walls.length / 9).toBe(2);
    expect(area2(r.tris)).toBeCloseTo(500, 3);
    expect(zAt(r.tris, 29.99, 5)).toBeCloseTo(5 * Math.tan(Math.PI / 6), 2);   // fronton yonida tizma balandligi
  });
  it('hovlili halqa (teshik) va keng bino — tizma ≤ maxRise', () => {
    const outer: XY[] = [[0, 0], [60, 0], [60, 60], [0, 60]], hole: XY[] = [[15, 15], [15, 45], [45, 45], [45, 15]];
    const r = skeletonRoof([outer, hole], 'tort')!; expect(area2(r.tris)).toBeCloseTo(3600 - 900, 2);
    expect(skeletonRoof([[[0, 0], [120, 0], [120, 80], [40, 80], [40, 100], [0, 100]]], 'tort', 30, 6)!.h).toBeLessThanOrEqual(6 + 1e-9);
  });
});

describe('tutash seksiyalar — yaxlit tom', () => {
  const A: XY[] = [[0, 0], [30, 0], [30, 12], [0, 12]], B: XY[] = [[30, 0], [60, 0], [60, 12], [30, 12]];
  it('ikki seksiya: umumiy devor ustida balandliklar teng (uzluksiz tizma), frontonlar faqat chetlarda', () => {
    const g = groupRoof([A, B], 'ikki')!; expect(g[0] && g[1]).toBeTruthy();
    expect(zAt(g[0]!.tris, 29.99, 6)).toBeCloseTo(zAt(g[1]!.tris, 30.01, 6), 2);
    expect(zAt(g[0]!.tris, 29.99, 6)).toBeCloseTo(6 * Math.tan(Math.PI / 6), 2);
    expect(g[0]!.walls.length / 9 + g[1]!.walls.length / 9).toBe(2);
    expect(area2(g[0]!.tris)).toBeCloseTo(360, 2); expect(area2(g[1]!.tris)).toBeCloseTo(360, 2);
  });
  it('guruhlash: faqat tegib turgan va bir xil qavatli', () => {
    const C: XY[] = [[100, 0], [130, 0], [130, 12], [100, 12]];
    const m = roofGroups([{ id: 'a', ring: A, kind: 'ikki', key: '9' }, { id: 'b', ring: B, kind: 'ikki', key: '9' }, { id: 'c', ring: C, kind: 'ikki', key: '9' }]);
    expect([...m.keys()].sort()).toEqual(['a', 'b']);
    expect(roofGroups([{ id: 'a', ring: A, kind: 'ikki', key: '9' }, { id: 'b', ring: B, kind: 'ikki', key: '12' }]).size).toBe(0);
  });
});
