import { describe, expect, it } from 'vitest';
import { areaOf, parcelVariants, perimeterCells, rowCells } from '../../src/core/parcels';
import type { XY } from '../../src/core/geo';

const rect = (w: number, h: number): XY[] => [[0, 0], [w, 0], [w, h], [0, h]];
const sum = (cells: XY[][][]) => cells.reduce((s, c) => s + areaOf(c), 0);

describe('parsel variantlari', () => {
  it('bir qator: koʻcha boʻylab toʻliq chuqurlikda; ikki qator: orqama-orqa', () => {
    const one = rowCells([rect(200, 40)], 2000, 0, 1);
    expect(one.length).toBe(4);
    one.forEach(c => expect(areaOf(c)).toBeCloseTo(2000, 0));
    const two = rowCells([rect(200, 80)], 2000, 0, 2);
    expect(two.length).toBe(8);
    expect(sum(two)).toBeCloseTo(200 * 80, 0);
  });
  it('perimetr: frontal parsellar + ichki yadro, maydon saqlanadi', () => {
    const cells = perimeterCells([rect(200, 120)], 1500)!;
    expect(cells).not.toBeNull();
    expect(sum(cells)).toBeCloseTo(200 * 120, 0);
    // yadro — eng oxirgi; burchak parsellari (miter) oddiylaridan katta
    const core = cells[cells.length - 1][0];
    expect(areaOf([core])).toBeGreaterThan(1500);
    const front = cells.slice(0, -1).map(c => areaOf(c)).sort((a, b) => a - b);
    expect(front[front.length - 1]).toBeGreaterThan(front[0] * 1.2);
  });
  it('tor kvartalda perimetr chiqmaydi, roʻyxatda faqat ≥ 2 parsel beruvchi usullar', () => {
    expect(perimeterCells([rect(200, 30)], 1500)).toBeNull();
    const vars = parcelVariants([rect(200, 30)], 1500, 0);
    expect(vars.map(v => v.id)).not.toContain('perimetr');
    expect(vars.map(v => v.id)).toContain('bir_qator');
    vars.forEach(v => expect(v.cells.length).toBeGreaterThanOrEqual(2));
    const big = parcelVariants([rect(300, 200)], 1e4, 0);
    expect(big.map(v => v.id)).toEqual(['tor', 'bir_qator', 'ikki_qator', 'perimetr']);
  });
});
