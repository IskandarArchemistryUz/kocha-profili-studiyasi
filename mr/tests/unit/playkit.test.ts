import { describe, it, expect } from 'vitest';
import { playKit } from '../../src/core/playkit';
import { roundRing } from '../../src/core/landscape';
import type { XY } from '../../src/core/geo';

const sq = (w: number, h: number): XY[] => [[0, 0], [w, 0], [w, h], [0, h]];
const inside = (p: XY, w: number, h: number) => p[0] >= -1e-6 && p[1] >= -1e-6 && p[0] <= w + 1e-6 && p[1] <= h + 1e-6;

describe('playKit', () => {
  for (const k of ['bolalar', 'kattalar', 'sport', 'xojalik'] as const) it(`${k}: jihozlar maydoncha ichida`, () => {
    for (const [w, h] of [[12, 9], [9, 14], [30, 18], [5, 4]]) {
      const parts = playKit(k, sq(w, h));
      if (w * h >= 100) expect(parts.length).toBeGreaterThan(2);
      for (const p of parts) for (const q of p.f ?? p.l ?? []) expect(inside(q, w, h)).toBe(true);
    }
  });
});

describe('roundRing', () => {
  it('kvadrat burchaklari yoy bilan, maydon kamayadi, radius qisqa qirrada cheklanadi', () => {
    const r = roundRing(sq(40, 40), 8, 6);
    expect(r.length).toBeGreaterThan(12);
    const A = Math.abs(r.reduce((s, p, i) => { const q = r[(i + 1) % r.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);
    expect(A).toBeLessThan(1600); expect(A).toBeGreaterThan(1600 - 4 * 64 * (1 - Math.PI / 4) - 5);
    const t = roundRing(sq(4, 40), 8, 6); for (const p of t) expect(inside(p, 4, 40)).toBe(true);
  });
});
