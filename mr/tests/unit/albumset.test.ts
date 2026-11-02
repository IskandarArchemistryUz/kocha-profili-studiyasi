import { describe, it, expect } from 'vitest';
import { aptPicks, houseTypes } from '../../src/core/albumset';
import { blankProject } from '../../src/core/doc';
import { frame, type XY } from '../../src/core/geo';
import type { SecPlan } from '../../src/core/apartments';

/** 02.11 (egasi): albomga har bino turidan 1-qavat va tipik qavat; uy turlari */
const rect = (x: number, y: number, w: number, d: number): XY[] => [[x, y], [x + w, y], [x + w, y + d], [x, y + d]];
const plan = (r: XY[], f1: number): SecPlan => ({ ring: r, f1, f0: 0, bid: `b${r[0][0]}` } as unknown as SecPlan);

describe('aptPicks', () => {
  it('bir xil binolar — bitta tur; 1-qavat va tipik', () => {
    const ps = [plan(rect(0, 0, 60, 15), 9), plan(rect(100, 0, 60, 15), 9), plan(rect(200, 0, 45, 15), 12)];
    const p = aptPicks(ps);
    expect(p.map(x => [x.bi, x.kind])).toEqual([[0, 'first'], [0, 'typical'], [2, 'first'], [2, 'typical']]);
    expect(p[0].n).toBe(2);
  });
  it('turlar soni chegarasi', () => {
    const ps = Array.from({ length: 10 }, (_, i) => plan(rect(i * 100, 0, 40 + i * 3, 15), 9));
    expect(new Set(aptPicks(ps, 3).map(x => x.bi)).size).toBe(3);
  });
});

describe('houseTypes', () => {
  it('bir xil uylar — bitta tur, soni bilan', () => {
    const d = blankProject('t') as any, fr = frame(d.origin), G = (r: XY[]) => r.map(p => fr.toGeo(p));
    d.buildings = [0, 30, 60].map((x, i) => ({ id: `u${i}`, footprint: G(rect(x + 5, 5, 10, 10)), floors: 2, nonRes: 0, use: 'turar', gen: { grp: 'g', kind: 'uy', plot: G(rect(x, 0, 20, 22)) } }));
    d.buildings.push({ id: 'u9', footprint: G(rect(200, 5, 12, 10)), floors: 1, nonRes: 0, use: 'turar', gen: { grp: 'g', kind: 'uy', plot: G(rect(195, 0, 22, 22)) } });
    const t = houseTypes(d);
    expect(t.map(x => [x.name, x.n, x.floors])).toEqual([['Yakka uy', 3, 2], ['Yakka uy', 1, 1]]);
  });
});
