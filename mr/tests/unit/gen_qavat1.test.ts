import { describe, it, expect } from 'vitest';
import { generate, DEFAULT_GEN } from '../../src/core/generator';
import type { XY } from '../../src/core/geo';

/** 01.11: generator baland 1-qavatni hisobga oladi — masofa boʻyicha qavat chegarasi va toretslar (core/levels bilan bir xil) */
describe('generator va 1-qavat balandligi', () => {
  it('kenglik qatorlari: groundH 5,7 m — qavat chegarasi (capFloors) kamayadi yoki teng', () => {
    const block: XY[] = [[0, 0], [120, 0], [120, 160], [0, 160]];
    const a = generate(block, { ...DEFAULT_GEN, typology: 'qatorlar', maxF: 12, nonRes: 1 }, 3.3);
    const b = generate(block, { ...DEFAULT_GEN, typology: 'qatorlar', maxF: 12, nonRes: 1, groundH: 5.7 }, 3.3);
    expect(a.capFloors).not.toBeNull(); expect(b.capFloors!).toBeLessThanOrEqual(a.capFloors!);
  });
  it('1-qavati turar (nonRes 0) — groundH taʼsir qilmaydi', () => {
    const block: XY[] = [[0, 0], [120, 0], [120, 160], [0, 160]];
    const a = generate(block, { ...DEFAULT_GEN, typology: 'qatorlar', maxF: 12, nonRes: 0 }, 3.3);
    const b = generate(block, { ...DEFAULT_GEN, typology: 'qatorlar', maxF: 12, nonRes: 0, groundH: 5.7 }, 3.3);
    expect(b.capFloors).toBe(a.capFloors); expect(b.sections.length).toBe(a.sections.length);
  });
});
