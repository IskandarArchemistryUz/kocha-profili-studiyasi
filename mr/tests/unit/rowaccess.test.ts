import { describe, it, expect } from 'vitest';
import { accessStreet } from '../../src/core/rowaccess';

describe('uylar qatori kirish koʻchasi (02.11)', () => {
  const corr = [[[[-200, -10], [200, -10], [200, 10], [-200, 10]]]] as [number, number][][][];   // y=0 boʻylab koʻcha koridori
  const axes = [[[-200, 0], [200, 0]]] as [number, number][][];
  it('chiziq mavjud koʻcha ustida — koʻcha kerak emas', () => { expect(accessStreet([[-50, 0], [50, 0]], corr, axes, 8)).toBeNull(); });
  it('koʻchaga perpendikulyar qator — eng yaqin uchi koʻchaga ulanadi', () => {
    const a = accessStreet([[0, 40], [0, 140]], corr, axes, 8)!;
    expect(a.linked).toBe(true); expect(a.half).toBe(4);
    expect(a.axis[0]).toEqual([0, 0]); expect(a.axis).toHaveLength(3);
  });
  it('uzoq (> 120 m) — ulanmaydi, lekin koʻcha quriladi', () => {
    const a = accessStreet([[0, 200], [0, 300]], corr, axes, 8)!;
    expect(a.linked).toBe(false); expect(a.axis).toHaveLength(2);
  });
});

import { innerStreets } from '../../src/core/rowaccess';
describe('ichki koʻchalar (chuqur past qavatli kvartal)', () => {
  const sq = (w: number, h: number): [number, number][] => [[0, 0], [w, 0], [w, h], [0, h]];
  it('200 × 200 m, uchastka 22 m, koʻcha 8.5 m — 3 ta ichki koʻcha, uzun qirraga parallel', () => {
    const s = innerStreets(sq(200, 200), 22, 8.5, []);
    expect(s.length).toBe(3);
    for (const l of s) expect(Math.abs(l[0][1] - l[1][1]) < 1e-6 || Math.abs(l[0][0] - l[1][0]) < 1e-6).toBe(true);
  });
  it('sayoz kvartal (60 m) — ichki koʻcha yoʻq', () => { expect(innerStreets(sq(300, 60), 22, 8.5, [])).toHaveLength(0); });
  it('uchlari kvartal tashqarisidagi koʻcha oʻqiga ulanadi', () => {
    const axes: [number, number][][] = [[[-6, -50], [-6, 300]], [[206, -50], [206, 300]]];
    const s = innerStreets(sq(200, 120), 22, 8.5, axes);
    expect(s.length).toBe(1);
    expect(s[0].length).toBe(4);
    expect(s[0][0][0]).toBeCloseTo(-6); expect(s[0][3][0]).toBeCloseTo(206);
  });
});
