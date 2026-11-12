import { describe, it, expect } from 'vitest';
import { clipLine } from '../../src/joyshunos/windflow';

describe('clipLine — shamol chiziqlari doiradan chiqmaydi', () => {
  it('toʻliq ichkarida — oʻzgarmaydi', () => { expect(clipLine([[0, 0], [10, 0]], 100)).toEqual([[[0, 0], [10, 0]]]); });
  it('tashqariga chiqqanda chegarada kesiladi', () => {
    const r = clipLine([[0, 0], [200, 0]], 100);
    expect(r.length).toBe(1); expect(r[0][1][0]).toBeCloseTo(100); expect(r[0][1][1]).toBeCloseTo(0);
  });
  it('doirani kesib oʻtgan chiziq — ichki boʻlak', () => {
    const r = clipLine([[-200, 0], [200, 0]], 100);
    expect(r.length).toBe(1); expect(r[0][0][0]).toBeCloseTo(-100); expect(r[0][r[0].length - 1][0]).toBeCloseTo(100);
  });
  it('kirib-chiqib qaytgan chiziq — ikki boʻlak', () => {
    const r = clipLine([[0, 0], [150, 0], [150, 50], [0, 50]], 100);
    expect(r.length).toBe(2);
    for (const part of r) for (const p of part) expect(Math.hypot(p[0], p[1])).toBeLessThanOrEqual(100 + 1e-6);
  });
  it('butunlay tashqarida — boʻsh', () => { expect(clipLine([[200, 0], [300, 0]], 100)).toEqual([]); });
});
