import { describe, it, expect } from 'vitest';
import { hydrology } from '../../src/core/hydro';
import { coverClassifier, surfaceT, heatColor } from '../../src/core/heat';
import { jobsFrom } from '../../src/core/jobs';
import type { XY } from '../../src/core/geo';

/** V shaklidagi vodiy: x = 0 da soy, ikki tomonga 5 % qiyalik, shimolga 1 % pasayish; markazda 2 m chuqurcha */
function valley(n = 61, step = 10) {
  const h = new Float32Array(n * n), R = (n - 1) / 2 * step;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x = -R + i * step, y = -R + j * step; h[j * n + i] = 100 + Math.abs(x) * 0.05 - y * 0.01 - (Math.hypot(x - 150, y) < 15 ? 2 : 0); }
  return { n, step, radius: R, h };
}

describe('Gidrologiya (HAND, TWI)', () => {
  it('soy boʻyida HAND ≈ 0, yon bagʻirda oshadi; TWI vodiy tubida yuqori', () => {
    const g = valley(), hy = hydrology(g), n = g.n, at = (x: number, y: number) => Math.round((y + g.radius) / g.step) * n + Math.round((x + g.radius) / g.step);
    expect(hy.drain[at(0, 0)]).toBe(1);
    expect(hy.hand[at(0, 100)]).toBeLessThan(0.5);
    expect(hy.hand[at(200, 0)]).toBeGreaterThan(hy.hand[at(50, 0)]);
    expect(hy.hand[at(200, 0)]).toBeCloseTo(10, 0);       // 200 m × 5 %
    expect(hy.twi[at(0, -100)]).toBeGreaterThan(hy.twi[at(250, -100)]);
    // chuqurcha toʻldirildi: undan oqim chiqadi (toʻldirilgan sath ≥ asl sath)
    expect(hy.filled[at(150, 0)]).toBeGreaterThan(g.h[at(150, 0)]);
  });
  it('OSM suv oqimi chizigʻi drenaj sifatida', () => {
    const g = valley(), line: XY[] = [[200, -300], [200, 300]];
    const hy = hydrology(g, [line]), at = (x: number, y: number) => Math.round((y + g.radius) / g.step) * g.n + Math.round((x + g.radius) / g.step);
    expect(hy.drain[at(200, 0)]).toBe(1);
    expect(hy.hand[at(220, 0)]).toBeLessThan(hy.hand[at(260, 0)]);
  });
});

describe('Yuza qizishi (taxmin)', () => {
  const sq = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const { cover, canopy } = coverClassifier({
    streets: [{ axis: [[-100, 0], [100, 0]], parts: [{ k: 'trotuar', w: 2 }, { k: 'yashil', w: 2 }, { k: 'qatnov', w: 7 }, { k: 'yashil', w: 2 }, { k: 'trotuar', w: 2 }] }],
    blocks: [{ rings: [sq(-100, 7.5, 100, 100)], use: 'yashil' }, { rings: [sq(-100, -100, 100, -7.5)], use: 'turar' }],
    site: [sq(-100, -100, 100, 100)],
    roads: [{ pts: [[150, -200], [150, 200]], w: 7, cls: 'residential' }],
    green: [{ rings: [sq(200, 0, 260, 60)], kind: 'wood' }], water: [[sq(200, -80, 260, -20)]], trees: [[180, 100]],
  });
  it('qoplama turlari', () => {
    expect(cover([0, 0])).toBe('asfalt'); expect(cover([0, 6.5])).toBe('trotuar'); expect(cover([0, 4.5])).toBe('maysa');
    expect(cover([0, 50])).toBe('maysa'); expect(cover([0, -50])).toBe('hovli');
    expect(cover([150, 0])).toBe('asfalt'); expect(cover([155, 0])).toBe('trotuar');
    expect(cover([230, 30])).toBe('daraxtzor'); expect(cover([230, -50])).toBe('suv'); expect(cover([300, 300])).toBe('ochiq');
    expect(canopy([182, 101])).toBe(true); expect(canopy([190, 100])).toBe(false);
  });
  it('soya va daraxt sovitadi', () => {
    expect(surfaceT('asfalt', 0, false)).toBe(62); expect(surfaceT('asfalt', 1, false)).toBe(41);
    expect(surfaceT('asfalt', 0, true)).toBeLessThan(46);
    expect(surfaceT('maysa', 0, false)).toBeLessThan(surfaceT('hovli', 0, false));
    expect(heatColor(62)).not.toBe(heatColor(33));
  });
});

describe('Ish oʻrinlari', () => {
  it('noturar GFA ÷ bandlik zichligi', () => {
    expect(jobsFrom({ ofis: 1500, savdo: 600 })).toBeCloseTo(100 + 20);
    expect(jobsFrom({ avtoturargoh: 5000 })).toBe(0);
  });
});
