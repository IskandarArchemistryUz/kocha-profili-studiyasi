import { describe, it, expect } from 'vitest';
import { autoSetback, blockStreetWidth, SB_W_DEF, kyOf, azOf, boundaryNeed, edgeKinds, insetVar } from '../../src/core/setback';
import type { XY } from '../../src/core/geo';

describe('avto chekinish (andoza H/W)', () => {
  it('balandroq fasad — kattaroq chekinish', () => {
    const a = autoSetback(39.6, 15, false, 1), b = autoSetback(19.8, 15, false, 1);
    expect(a.d).toBe(12.5); expect(b.d).toBe(6);  // (39,6 − 15)/2 = 12,3 → 12,5; past — eng kami 6 m
  });
  it('keng koʻcha — chekinish kamayadi, noturar 1-qavat — eng kami 3 m', () => {
    expect(autoSetback(39.6, 30, true, 1).d).toBe(5);
    expect(autoSetback(30, 40, true, 1).d).toBe(3);
  });
  it('H/W chegarasi va yuqori chegara 20 m', () => {
    expect(autoSetback(39.6, 15, false, 2).d).toBe(6);
    expect(autoSetback(120, 15, false, 1).d).toBe(20);
  });
  it('koʻcha nomaʼlum — 15 m andoza', () => { const a = autoSetback(39.6, null, false, 1); expect(a.W).toBe(SB_W_DEF); expect(a.wFound).toBe(false); });
  it('tutash koʻcha kengligi: eng torini oladi, uzoqdagini emas', () => {
    const ring: XY[] = [[0, 0], [100, 0], [100, 80], [0, 80]];
    const st = [{ axis: [[-50, -10], [150, -10]] as XY[], w: 20 }, { axis: [[107.5, -50], [107.5, 150]] as XY[], w: 15 }, { axis: [[-50, 300], [150, 300]] as XY[], w: 10 }];
    expect(blockStreetWidth(ring, st)).toBe(15);
    expect(blockStreetWidth(ring, [st[2]])).toBeNull();
  });
});

import { areaForCap } from '../../src/norms/rules';
import { schoolCapacity, mtmCapacity } from '../../src/core/derive';
describe('kerakli uchastka maydoni (10-band)', () => {
  it('sigʻim funksiyasining teskarisi', () => {
    for (const n of [50, 300, 495, 700, 1200]) { const a = areaForCap(schoolCapacity, n); expect(schoolCapacity(a)).toBeGreaterThanOrEqual(n); expect(schoolCapacity(a - 1)).toBeLessThan(n); }
    for (const n of [40, 100, 150]) { const a = areaForCap(mtmCapacity, n); expect(mtmCapacity(a)).toBeGreaterThanOrEqual(n); expect(mtmCapacity(a - 1)).toBeLessThan(n); }
  });
});

describe('2-jadval: hudud chegarasigacha (79-band) va kʏ', () => {
  it('kʏ diagrammasi: 0° 1,2; 30° 1,9; 45° 2,3; 60° 1,9; 90° 1,2', () => {
    expect(kyOf(0)).toBe(1.2); expect(kyOf(30)).toBe(1.9); expect(kyOf(45)).toBe(2.3); expect(kyOf(60)).toBe(1.9); expect(kyOf(90)).toBe(1.2); expect(kyOf(240)).toBe(1.9);
    expect(azOf([0, 1])).toBeCloseTo(0); expect(azOf([1, 0])).toBeCloseTo(90); expect(azOf([1, 1])).toBeCloseTo(45);
  });
  it('koʻcha — H × 0,25; qoʻshni: uzun tarz H × kʏ / 2, yon tarz H × 0,25, ≥ 6 m', () => {
    expect(boundaryNeed('kocha', 40, true, 0)).toBe(10);
    expect(boundaryNeed('qoshni', 40, true, 0)).toBeCloseTo(24); expect(boundaryNeed('qoshni', 40, true, 45)).toBeCloseTo(46);
    expect(boundaryNeed('qoshni', 16, false, 0)).toBe(6);
  });
  it('qirra turi va har qirra boʻyicha chekinish', () => {
    const ring: XY[] = [[0, 0], [100, 0], [100, 80], [0, 80]];
    const k = edgeKinds(ring, [{ axis: [[-50, -10], [150, -10]], w: 20 }], 'qoshni');
    expect(k).toEqual(['kocha', 'qoshni', 'qoshni', 'qoshni']);
    const r = insetVar(ring, [10, 5, 20, 5])!;
    const xs = r.map(p => p[0]), ys = r.map(p => p[1]);
    expect(Math.min(...ys)).toBeCloseTo(10); expect(Math.max(...ys)).toBeCloseTo(60); expect(Math.min(...xs)).toBeCloseTo(5); expect(Math.max(...xs)).toBeCloseTo(95);
    const rc = insetVar([...ring].reverse(), [5, 20, 5, 10].reverse().map((_, i, a) => a[i]))!;   // CW tartibda ham ishlaydi
    expect(rc.length).toBeGreaterThan(3);
  });
});

import { blankProject } from '../../src/core/doc';
import { frame } from '../../src/core/geo';
import { RULES } from '../../src/norms/rules';
describe('redline-79 qoidasi: binodan qizil chiziqqacha ≥ H × 0,25', () => {
  it('9 qavatli turar joy (29,7 m) qizil chiziqdan 5 m — fail (talab 7,4 m); 10 m — pass', () => {
    const d = blankProject(), fr = frame(d.origin), g = (p: XY) => fr.toGeo(p);
    d.site = { rings: [[[-100, -80], [100, -80], [100, 80], [-100, 80]].map(p => g(p as XY))] } as any;
    d.streets = [{ id: 's1', axis: [g([-110, 0]), g([110, 0])], profile: 'mahalla-15' }] as any;
    const W = 15 / 2;   // mahalla-15 kengligi 15 m — qizil chiziq oʻqdan 7,5 m
    const bld = (y0: number) => ({ id: 'b', footprint: [[-30, y0], [30, y0], [30, y0 + 15], [-30, y0 + 15]].map(p => g(p as XY)), floors: 9, nonRes: 0, use: 'turar' } as any);
    const r = RULES.find(x => x.id === 'redline-79')!;
    d.buildings = [bld(W + 5)]; const a = r.evaluate({} as any, d);
    d.buildings = [bld(W + 12)]; const b = r.evaluate({} as any, d);
    expect(a.status).toBe('fail'); expect(b.status).toBe('pass');
    expect(a.where?.need?.labels?.[0].text).toMatch(/→ 7,4 m/);
  });
});
