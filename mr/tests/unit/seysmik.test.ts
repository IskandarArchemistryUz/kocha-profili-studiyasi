import { describe, it, expect } from 'vitest';
import { lenLimit, blockShape, checkBlock } from '../../src/core/seysmik';
import type { XY } from '../../src/core/geo';

const R = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
describe('seysmik boʻlmalar (QMQ 2.01.03-19, 3.1-jadval, 3.1.1)', () => {
  it('uzunlik chegarasi: monolit 60/45/36, karkas 100/80/60, gʻisht 40/30/20; 6 ball — cheklanmagan', () => {
    expect(lenLimit('monolit', 7)).toBe(60); expect(lenLimit('monolit', 8)).toBe(45); expect(lenLimit('monolit', 9)).toBe(36);
    expect(lenLimit('karkas', 8)).toBe(80); expect(lenLimit('gisht', 9)).toBe(20); expect(lenLimit('monolit', 6)).toBeNull(); expect(lenLimit('toldirgich', 10)).toBe(40);
  });
  it('toʻrtburchak 48 × 15 — chiqish yoʻq; L 48 × 36 (qanot 15) — chiqish 21 m; kichik L (burchak 21 × 21) — 6 m', () => {
    expect(blockShape(R(0, 0, 48, 15))).toMatchObject({ rect: true, proj: [] });
    const L: XY[] = [[0, 0], [48, 0], [48, 15], [15, 15], [15, 36], [0, 36]];
    const s = blockShape(L); expect(s.rect).toBe(false); expect(s.proj.length).toBe(1); expect(s.proj[0]).toBeCloseTo(21, 0);
    const C: XY[] = [[0, 0], [21, 0], [21, 15], [15, 15], [15, 21], [0, 21]];
    expect(blockShape(C).proj[0]).toBeCloseTo(6, 0);
  });
  it('tekshiruv: 8 ball monolit — 48 m toʻrtburchak uzun (45), 21 × 21 L mos; gʻisht — 6 m chiqish 2 dan katta', () => {
    const a = checkBlock(R(0, 0, 48, 15), 'monolit', 8); expect(a.lenOk).toBe(false); expect(a.projOk).toBe(true); expect(a.limit).toBe(45);
    const C: XY[] = [[0, 0], [21, 0], [21, 15], [15, 15], [15, 21], [0, 21]];
    expect(checkBlock(C, 'monolit', 8)).toMatchObject({ lenOk: true, projOk: true });
    expect(checkBlock(C, 'gisht', 8).projOk).toBe(false);
  });
});
