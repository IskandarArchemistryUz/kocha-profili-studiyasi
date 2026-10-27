import { describe, it, expect } from 'vitest';
import { squareSections, avoidObstacles, thickness } from '../../src/core/genfix';
import { generate, DEFAULT_GEN, type GenSection } from '../../src/core/generator';
type XY = [number, number];
const ang = (r: XY[]) => Math.min(...r.map((c, i) => { const p = r[(i - 1 + r.length) % r.length], q = r[(i + 1) % r.length]; const a = Math.atan2(p[1] - c[1], p[0] - c[0]), b = Math.atan2(q[1] - c[1], q[0] - c[0]); let d = Math.abs(a - b) * 180 / Math.PI; return d > 180 ? 360 - d : d; }));

describe('generatsiyadan keyingi ishlov', () => {
  it('oʻtkir uchli tasma seksiya — uchi tik qirqiladi, burchaklar ≥ 60°', () => {
    const s: GenSection = { ring: [[0, 0], [60, 0], [60, 15], [25, 15]], floors: 9, kind: 'oddiy', nonRes: 1 };
    const notes: string[] = [], [r] = squareSections([s], 15, notes);
    expect(ang(r.ring)).toBeGreaterThanOrEqual(59);
    expect(notes.join(' ')).toContain('tik qirqildi');
  });
  it('tor boʻlak (qalinligi < 0,6·D) olib tashlanadi', () => {
    const s: GenSection = { ring: [[0, 0], [40, 0], [40, 5], [0, 5]], floors: 9, kind: 'oddiy', nonRes: 1 };
    expect(squareSections([s], 15, [])).toHaveLength(0);
    expect(thickness([[0, 0], [40, 0], [40, 15], [0, 15]])).toBeGreaterThan(13);
  });
  it('toʻsiq: ustiga tushgan seksiya qirqiladi, qarshidagi baland bino boʻyicha qavat cheklanadi', () => {
    const S: GenSection[] = [{ ring: [[0, 0], [60, 0], [60, 15], [0, 15]], floors: 12, kind: 'oddiy', nonRes: 1, face: { p: [30, 15], n: [0, 1] } }];
    const r = avoidObstacles(S, [{ ring: [[10, 45], [50, 45], [50, 60], [10, 60]], h: 15 }], 3, 3.3, []);
    expect(r[0].floors).toBe(Math.floor(30 / 2 / 3.3));
    const r2 = avoidObstacles(S, [{ ring: [[40, 5], [70, 5], [70, 30], [40, 30]], h: 15 }], 3, 3.3, []);
    expect(r2.length === 0 || Math.max(...r2[0].ring.map(p => p[0])) <= 38).toBe(true);   // 6 m bufer (burchakda faska)
  });
  it('generate: toʻsiq bilan kesishmaydi', () => {
    const blk: XY[] = [[-80, -60], [80, -60], [80, 60], [-80, 60]], ob: XY[] = [[-20, -52], [20, -52], [20, -38], [-20, -38]];
    const r = generate(blk, { ...DEFAULT_GEN }, 3.3, { use: 'turar', avoid: [{ ring: ob, h: 16.5 }] });
    for (const s of r.sections) for (const p of s.ring) expect(p[0] > -20 && p[0] < 20 && p[1] > -52 && p[1] < -38).toBe(false);
  });
});

import { assignEnds } from '../../src/core/genfix';
import { blankProject, type Building } from '../../src/core/doc';
import { frame } from '../../src/core/geo';
import { spacingIssues } from '../../src/core/spacing';
describe('toretslar: derazali / derazasiz', () => {
  it('tutashgan torets — derazasiz; oldida (H1+H2)·0,3 joy boʻlsa — derazali; tor oraliq — derazasiz', () => {
    const S: GenSection[] = [
      { ring: [[0, 0], [30, 0], [30, 15], [0, 15]], floors: 9, kind: 'oddiy', nonRes: 0 },
      { ring: [[30, 0], [60, 0], [60, 15], [30, 15]], floors: 9, kind: 'oddiy', nonRes: 0 },
      { ring: [[70, 0], [100, 0], [100, 15], [70, 15]], floors: 9, kind: 'oddiy', nonRes: 0 },
    ];
    assignEnds(S, [], 15, 3.3);
    expect(S[0].blind).toEqual([1]);           // oʻng torets — 2-seksiyaga tutash; chap torets ochiq (uzoqda hech narsa yoʻq)
    expect(S[1].blind?.sort()).toEqual([1, 3]); // chap — tutash; oʻng — 10 m < (29,7+29,7)·0,3 = 17,8 m → derazasiz
    expect(S[2].blind).toEqual([3]);
  });
  it('spacing: ikkala torets derazasiz — 0,15·(H1+H2) va ≥ 6 m yetarli', () => {
    const O: [number, number] = [69.28, 41.31], fr = frame(O);
    const mk = (id: string, r: [number, number][], blind: number[]): Building => ({ id, footprint: r.map(fr.toGeo), floors: 9, nonRes: 0, use: 'turar', gen: { grp: id, kind: 'oddiy', blind } } as Building);
    const d = { ...blankProject('t'), origin: O, buildings: [mk('a', [[0, 0], [30, 0], [30, 15], [0, 15]], [1]), mk('b', [[40, 0], [70, 0], [70, 15], [40, 15]], [3])] };
    expect(spacingIssues(d).pairs).toEqual([]);   // 10 m ≥ max(6, 59,4·0,15 = 8,9)
    const d2 = { ...d, buildings: [mk('a', [[0, 0], [30, 0], [30, 15], [0, 15]], []), mk('b', [[40, 0], [70, 0], [70, 15], [40, 15]], [])] };
    expect(spacingIssues(d2).pairs[0]).toMatchObject({ kind: 'torets', k: 0.3 });
  });
});
