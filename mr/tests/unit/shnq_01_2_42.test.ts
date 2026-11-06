import { describe, it, expect } from 'vitest';
import { parkingNeed } from '../../src/core/parking';

/** 06.11 — ShNQ 2.07.01-23 ga 01/2-42 buyrugʻi (09.12.2025): 29-jadval 1-pozitsiya «10 ta kvartiraga — 7 ta» */
describe('01/2-42: avtoturargoh talabi', () => {
  it('Toshkent: 10 kvartiraga 7 joy (yuqoriga yaxlitlanadi)', () => {
    expect(parkingNeed({ apartments: 100, tashkent: true }).kvartiralar).toBe(70);
    expect(parkingNeed({ apartments: 10, tashkent: true }).kvartiralar).toBe(7);
    expect(parkingNeed({ apartments: 11, tashkent: true }).kvartiralar).toBe(8);
    expect(parkingNeed({ apartments: 1, tashkent: true }).kvartiralar).toBe(1);
  });
  it('boshqa viloyatlar oʻzgarmaydi: 2 kvartiraga 1', () => {
    expect(parkingNeed({ apartments: 100, tashkent: false }).kvartiralar).toBe(50);
    expect(parkingNeed({ apartments: 3, tashkent: false }).kvartiralar).toBe(2);
  });
});

import { firePairs } from '../../src/core/firedist';
import { blankProject } from '../../src/core/doc';
import { frame, type XY } from '../../src/core/geo';
/** 652-band qoʻshimchasi (01/2-42): bitta yer uchastkasidagi turar joy va xoʻjalik imoratlari orasi normalanmaydi */
describe('01/2-42: 652-band — bitta uchastka ichida', () => {
  const sq = (x: number, y: number, w: number, h: number): XY[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const mk = (samePlot: boolean) => {
    const d = blankProject(), fr = frame(d.origin), g = (r: XY[]) => r.map(p => fr.toGeo(p));
    const plotA = sq(0, 0, 20, 12), plotB = sq(0, 12, 20, 18);
    d.buildings.push({ id: 'a', footprint: g(sq(2, 2, 8, 8)), floors: 1, use: 'yakka', gen: { grp: 'g', kind: 'uy', plot: g(samePlot ? sq(0, 0, 20, 30) : plotA) } } as never);
    d.buildings.push({ id: 'b', footprint: g(sq(2, 14, 8, 6)), floors: 1, use: 'yakka', gen: { grp: 'g', kind: 'uy', plot: g(samePlot ? sq(0, 0, 20, 30) : plotB) } } as never);
    return d;
  };
  it('bir uchastkada 4 m — juft tekshirilmaydi', () => { expect(firePairs(mk(true)).pairs.length).toBe(0); });
  it('har xil uchastkada 4 m — 56-jadval talabi qoladi', () => { expect(firePairs(mk(false)).pairs.length).toBe(1); });
});
