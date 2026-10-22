import { describe, it, expect } from 'vitest';
import { freeRect, pickLevel, blockSize, labelLines, screenScale, mainAngle } from '../../src/core/labels';
import type { XY } from '../../src/core/geo';

const rect = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

describe('Xarita yozuvlari (4.1)', () => {
  it('boʻsh uchastka — deyarli butun maydon', () => {
    const r = freeRect([rect(0, 0, 100, 60)], [])!;
    expect(r.w).toBeGreaterThan(95); expect(r.h).toBeGreaterThan(55);
    expect(r.c[0]).toBeCloseTo(50, 0); expect(r.c[1]).toBeCloseTo(30, 0);
  });
  it('perimetral bino — yozuv hovlida, binodan 2 m nari', () => {
    // 100 × 100 uchastka, 15 m chuqurlikdagi halqa bino → hovli 70 × 70
    const outer = rect(0, 0, 100, 100), inner = rect(15, 15, 85, 85);
    const bld: XY[][] = [rect(0, 0, 100, 15), rect(0, 85, 100, 100), rect(0, 15, 15, 85), rect(85, 15, 100, 85)];
    const r = freeRect([outer], bld)!;
    expect(r.w).toBeLessThanOrEqual(66 + 2); expect(r.w).toBeGreaterThan(60);
    expect(Math.abs(r.c[0] - 50)).toBeLessThan(2); expect(Math.abs(r.c[1] - 50)).toBeLessThan(2);
    void inner;
  });
  it('toʻliq bino bilan qoplangan — joy yoʻq', () => {
    expect(freeRect([rect(0, 0, 20, 20)], [rect(-1, -1, 21, 21)])).toBeNull();
  });
  it('darajalar: masshtab kattalashganda qisqaradi', () => {
    const r = freeRect([rect(0, 0, 100, 60)], [])!;
    const lv = (mpp: number) => pickLevel(r, 'D-1.23', 'Turar joy', '1,06 ga', mpp, 12, 11);
    expect(lv(0.3)).toBe(3);   // ≈ 1:1100
    expect(lv(1.8)).toBe(2);
    expect(lv(2.22)).toBe(1);
    expect(lv(5)).toBe(0);
    expect(pickLevel(r, 'D-1.23', 'Turar joy', '1,06 ga', 0.3, 12, 11, 1)).toBe(1);   // «Faqat kod» rejimi
  });
  it('matn bloki oʻlchami va masshtab chipi', () => {
    expect(blockSize(labelLines(1, 'D-1', '', ''), 12, 11)).toEqual([0.6 * 12 * 3, 12]);
    expect(Math.round(screenScale(0.6))).toBe(2268);
    expect(mainAngle([[0, 0], [10, 10], [0, 20], [-1, 10]])).toBeCloseTo(Math.PI / 4, 5);
  });
});

/** freeMask (tez) = oddiy usul (har katak × har qirra) — tasodifiy halqalar, teshiklar va toʻsiqlarda bit-bitigacha bir xil */
import { freeMask } from '../../src/core/labels';
describe('freeMask — oddiy usul bilan bir xil', () => {
  type P = [number, number];
  const pin = (p: P, r: P[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
  const sd = (p: P, a: P, b: P) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0; return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t); };
  const rd = (p: P, r: P[]) => { let d = Infinity; for (let i = 0; i < r.length; i++) d = Math.min(d, sd(p, r[i], r[(i + 1) % r.length])); return d; };
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const blob = (cx: number, cy: number, R: number, n: number): P[] => Array.from({ length: n }, (_, k) => { const a = k / n * Math.PI * 2, r = R * (0.6 + 0.4 * rnd()); return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as P; });
  for (let t = 0; t < 12; t++) it(`holat ${t}`, () => {
    const R: P[][] = [blob(0, 0, 100, 30 + Math.floor(rnd() * 60))]; if (t % 3 === 0) R.push(blob(10, -5, 25, 12));
    const O: P[][] = Array.from({ length: 10 + Math.floor(rnd() * 30) }, () => blob((rnd() - 0.5) * 180, (rnd() - 0.5) * 180, 3 + rnd() * 10, 4 + Math.floor(rnd() * 5)));
    const buf = 2, cell = 1.7, x0 = -110, y0 = -105, nx = 130, ny = 125;
    const ob = O.map(o => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const p of o) { a = Math.min(a, p[0]); b = Math.min(b, p[1]); c = Math.max(c, p[0]); d = Math.max(d, p[1]); } return [a - buf, b - buf, c + buf, d + buf]; });
    const fast = freeMask(R, O, ob, x0, y0, cell, nx, ny, buf), slow = new Uint8Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const p: P = [x0 + (i + 0.5) * cell, y0 + (j + 0.5) * cell]; let c = false; for (const r of R) if (pin(p, r)) c = !c; if (!c) continue;
      if (R.some(r => rd(p, r) < cell * 0.5)) continue;
      let ok = true; for (let k = 0; k < O.length && ok; k++) { const b = ob[k]; if (p[0] < b[0] || p[0] > b[2] || p[1] < b[1] || p[1] > b[3]) continue; if (pin(p, O[k]) || rd(p, O[k]) < buf + cell * 0.5) ok = false; }
      if (ok) slow[j * nx + i] = 1;
    }
    let diff = 0; for (let n = 0; n < fast.length; n++) if (fast[n] !== slow[n]) diff++;
    expect(diff).toBe(0); expect(slow.reduce((a, b) => a + b, 0)).toBeGreaterThan(100);
  });
});
