import { describe, it, expect, beforeAll } from 'vitest';
import { generate, DEFAULT_GEN } from '../../src/core/generator';
import type { XY } from '../../src/core/geo';

/** 11.11 (L3, video yozishda): NYC da «Target FAR» 1,0 / 1,5 / 1,9 → hammasida 1,67 — pastga yetmaganda xabar yoʻq edi */
let I: typeof import('../../src/i18n');
beforeAll(async () => { (globalThis as any).document = { documentElement: {} }; I = await import('../../src/i18n'); });
const sq: XY[] = [[0, 0], [113, 0], [113, 113], [0, 113]];
describe('UMN maqsadi', () => {
  it('eng kam qavatda ham oshib ketsa — xabar va erishiladigan oraliq', () => {
    const r = generate(sq, { ...DEFAULT_GEN, typology: 'perimetr', minF: 5, maxF: 12, far: 0.5 }, 3.3);
    expect(r.far!).toBeGreaterThan(0.65);
    const n = r.notes.find(x => x.includes('dan oshdi'));
    expect(n).toContain('eng kam qavat 5');
    const rng = r.notes.find(x => x.startsWith('Shu daha uchun erishiladigan UMN'));
    expect(rng).toMatch(/\d,\d\d–\d,\d\d \(qavat 5–12\)/);
    I.setLang('en');
    expect(I.tr(n!)).toMatch(/^FAR target 0.5 exceeded \(\d\.\d\d\): minimum floors is 5/);
    expect(I.tr(rng!)).toMatch(/^Achievable FAR for this block/);
    I.setLang('uz');
  });
  it('maqsadga yetganda — xabar yoʻq', () => {
    const r0 = generate(sq, { ...DEFAULT_GEN, typology: 'perimetr', minF: 5, maxF: 12, far: 0 }, 3.3);
    const r = generate(sq, { ...DEFAULT_GEN, typology: 'perimetr', minF: 5, maxF: 12, far: Math.round(r0.far! * 10) / 10 }, 3.3);
    expect(r.notes.some(x => x.includes('dan oshdi') || x.includes('erishiladigan UMN'))).toBe(false);
  });
});
