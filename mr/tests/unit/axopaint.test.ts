import { describe, it, expect } from 'vitest';
import { floorClass, paintColor, paintEdge, paintLegend, FLOOR_CLASSES, ACCENT, NEW_COL } from '../../src/core/axopaint';

/** 06.11: aksonometriya varagʻi uslublari 4–6 (claude/aksonometriya-uslublar-tahlil.md) */
describe('akso uslublari 4–6', () => {
  it('qavatlilik sinflari ketma-ket', () => {
    expect([1, 3, 4, 5, 6, 9, 10, 16, 17, 40].map(floorClass)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
    expect(paintColor('qavatlilik', 12)).toBe(FLOOR_CLASSES[3][1]);
  });
  it('kontekst — oq bino, urgʻu kontur; demontaj — yangi urgʻu rangida', () => {
    expect(paintColor('kontekst', 9)).toBe(0xffffff); expect(paintEdge('kontekst')?.color).toBe(ACCENT);
    expect(paintColor('demontaj', 9)).toBe(NEW_COL); expect(paintEdge('demontaj')).toBeNull();
  });
  it('legendada faqat bor toifalar', () => {
    expect(paintLegend('qavatlilik', [{ floors: 5 }, { floors: 12 }], 0, 0).map(x => x.label)).toEqual(['4–5', '10–16']);
    expect(paintLegend('demontaj', [{ floors: 5 }], 0, 3).map(x => x.label)).toEqual(['Yangi', 'Buziladi']);
    expect(paintLegend('kontekst', [], 0, 0).map(x => x.label)).toEqual(['Atrof (mavjud)']);
  });
});
