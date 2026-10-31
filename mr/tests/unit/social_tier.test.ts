import { describe, it, expect } from 'vitest';
import { nextTier, schoolCapacity, mtmCapacity, builtInMtm } from '../../src/core/derive';

describe('41-jadval / 543-band pogʻonalari', () => {
  it('maktab: 9 900 m² dan kichik uchastka — 20 m² pogʻonasi', () => {
    expect(schoolCapacity(8857)).toBe(442);
    expect(nextTier('maktab', 8857)).toEqual({ area: 9900, cap: 990 });
    expect(schoolCapacity(9900)).toBe(990);
    expect(nextTier('maktab', 9900)).toBeNull();
  });
  it('MTM: 3 535 m² dan katta — 35 m²/oʻrin', () => {
    expect(mtmCapacity(3261)).toBe(81);
    expect(nextTier('mtm', 3261)).toEqual({ area: 3535, cap: 101 });
    expect(mtmCapacity(3535)).toBe(101);
  });
  it('1-qavatdagi MTM: 12 m²/oʻrin (taxmin), oyoq izining 80 %', () => {
    expect(builtInMtm(900)).toBe(60);
  });
});

import { checkBlock } from '../../src/core/seysmik';
describe('QMQ 2.01.03-19, 3.1.1 / 3.1.3: L uylar', () => {
  const hov: [number, number][] = [[0, 0], [15, 0], [15, 6.5], [6.5, 6.5], [6.5, 18], [0, 18]];
  const kl: [number, number][] = [[0, 0], [11, 0], [11, 5.5], [5.5, 5.5], [5.5, 11.5], [0, 11.5]];
  it('klaster uy: yon qanot 11,5 m — chiqib turgan qism 6 m, monolitda oʻtadi', () => {
    expect(checkBlock(kl, 'monolit', 8).proj).toBeCloseTo(6, 1);
    expect(checkBlock(kl, 'monolit', 8).projOk).toBe(true);
  });
  it('hovli uy: chok boʻlmasa 11,5 m, chok bilan — ikki toʻgʻri toʻrtburchak', () => {
    expect(checkBlock(hov, 'gisht', 8).projOk).toBe(false);
    const c = checkBlock(hov, 'gisht', 8, true);
    expect(c.projOk).toBe(true); expect(c.lenOk).toBe(true);
  });
});
