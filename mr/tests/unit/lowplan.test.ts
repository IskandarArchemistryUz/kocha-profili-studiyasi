import { describe, it, expect } from 'vitest';
import { housePlan, housePlanSvg, partySide } from '../../src/core/lowplan';
import { doorClashes } from '../../src/core/aptplan';
import { area, type XY } from '../../src/core/geo';

const R = (w: number, d: number): XY[] => [[0, 5], [w, 5], [w, 5 + d], [0, 5 + d]];
const HOV: XY[] = [[0, 2], [15, 2], [15, 8.5], [6.5, 8.5], [6.5, 20], [0, 20]];

describe('Past qavatli uy rejalari (31.10, lowplan)', () => {
  it('taunhaus, juft, yakka: har qavat rejasi; xonalar uy ichida, eshiklar urilmaydi; zina har qavatda bir joyda', () => {
    for (const [w, d, fl] of [[6.5, 11.5, 3], [5.0, 11.5, 3], [8, 11, 2], [12, 10, 2]] as const) {
      const ring = R(w, d), st: string[] = [];
      for (let f = 1; f <= fl; f++) {
        const P = housePlan(ring, fl, f)!; expect(P).toBeTruthy();
        const s = P.rooms.reduce((t, q) => t + area(q.ring), 0);
        expect(s).toBeLessThanOrEqual(area(ring) * 1.01); expect(s).toBeGreaterThan(area(ring) * 0.97);
        expect(doorClashes(P.doors, P.walls, ring)).toEqual([]);
        expect(P.stairs.length).toBe(1); st.push(JSON.stringify(P.stairs[0].ring));
        if (f === 1) { expect(P.rooms.some(q => q.kind === 'mehmonxona')).toBe(true); expect(P.rooms.some(q => q.kind === 'hx')).toBe(true); expect(P.ext.length).toBe(2); }
        else { expect(P.rooms.some(q => q.kind === 'hammom')).toBe(true); expect(P.rooms.filter(q => q.kind === 'yotoq' || q.kind === 'asosiy').length).toBeGreaterThanOrEqual(2); }
      }
      expect(new Set(st).size).toBe(1);
    }
  });
  it('mehmonxona eni ≥ 3,8 m (T-05)', () => {
    const P = housePlan(R(5.0, 11.5), 3, 1)!, m = P.rooms.find(q => q.kind === 'mehmonxona')!;
    expect(Math.max(...m.ring.map(p => p[0])) - Math.min(...m.ring.map(p => p[0]))).toBeGreaterThanOrEqual(3.8);
  });
  it('hovli — milliy: darvozaxona, toʻsiq devor, ayvon ustunlari, koʻchaga deraza yoʻq; mehmonxona eng katta yashash xonasi', () => {
    const P = housePlan(HOV, 1, 1, { style: 'milliy', north: [0, 1] })!;
    expect(P.rooms.some(q => q.kind === 'darvozaxona')).toBe(true); expect(P.screen).toBeTruthy(); expect(P.posts.length).toBeGreaterThan(4);
    expect(P.wins).toEqual([]); expect(P.rooms.some(q => q.kind === 'hx')).toBe(true);
    const liv = P.rooms.filter(q => ['mehmonxona', 'xona', 'yozgi', 'qishki'].includes(q.kind)), mx = liv.reduce((a, b) => (b.area > a.area ? b : a));
    expect(mx.kind).toBe('mehmonxona');
    expect(doorClashes(P.doors, P.walls, HOV)).toEqual([]);
    // shimol yon qanot xonalari tomonida (+x) — yozgi xonalar (H-08)
    const Pn = housePlan(HOV, 1, 1, { style: 'milliy', north: [1, 0] })!; expect(Pn.rooms.some(q => q.kind === 'yozgi')).toBe(true);
    const Ps = housePlan(HOV, 1, 1, { style: 'milliy', north: [-1, 0] })!; expect(Ps.rooms.some(q => q.kind === 'qishki')).toBe(true);
  });
  it('hovli — zamonaviy uslub va SVG', () => {
    const P = housePlan(HOV, 1, 1, { style: 'zamonaviy' })!;
    expect(P.rooms.some(q => q.kind === 'darvozaxona')).toBe(false); expect(P.rooms.some(q => q.kind === 'ayvon')).toBe(true);
    const s = housePlanSvg(P, HOV, [[0, 0], [22, 0], [22, 25], [0, 25]], { scale: 100, title: 'T', north: [0, 1] });
    expect(s.svg).toContain('ayvon'); expect(s.svg).toContain('mehmonxona'); expect(s.widthMm).toBeGreaterThan(200);
  });
  it('qoʻshni devor tomoni uchastkadan aniqlanadi', () => {
    expect(partySide(R(8, 11), [[0, 0], [11, 0], [11, 28], [0, 28]])).toBe(0);
    expect(partySide(R(8, 11), [[-3, 0], [8, 0], [8, 28], [-3, 28]])).toBe(1);
  });
});
