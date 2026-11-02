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
