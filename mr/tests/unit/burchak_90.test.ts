import { describe, it, expect } from 'vitest';
import { generateBase, DEFAULT_GEN, orthoSnap, ORTHO_TOL } from '../../src/core/generator';
import { layoutSection } from '../../src/core/apartments';
import { rulePlan, planChecks } from '../../src/core/sectionplan';
import type { XY } from '../../src/core/geo';

const rot = (r: XY[], a: number): XY[] => r.map(p => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)] as XY);
const angs = (r: XY[]) => r.map((p, i) => { const a = r[(i + r.length - 1) % r.length], c = r[(i + 1) % r.length], u = [a[0] - p[0], a[1] - p[1]], v = [c[0] - p[0], c[1] - p[1]]; return Math.acos((u[0] * v[0] + u[1] * v[1]) / Math.hypot(u[0], u[1]) / Math.hypot(v[0], v[1])) * 180 / Math.PI; });
const L = (a: number, d: number): XY[] => [[0, 0], [a, 0], [a, d], [d, d], [d, a], [0, a]];

describe('07.11 burchak seksiyalari: toʻgʻri burchak va tabiiy yorugʻlik', () => {
  it(`koʻzga toʻgʻri kvartal (burchak 90° ± ${ORTHO_TOL}°) — burchak seksiyalari 90°, kvartal ichida`, () => {
    for (const ang of [0, 0.5]) for (const dx of [4, 6]) {   // 120 m da 4–6 m — 1,9–2,9°
      const blk = rot([[0, 0], [120, 0], [120 + dx, 120], [0, 120]], ang), r = generateBase(blk, { ...DEFAULT_GEN, setback: 6 });
      const cs = r.sections.filter(s => s.kind === 'burchak'); expect(cs.length).toBe(4);
      for (const s of cs) for (const a of angs(s.ring)) expect(Math.abs(a - 90)).toBeLessThan(0.5);
    }
  });
  it('aniq qiya kvartal (≈ 4,8°) — avvalgidek kvartal burchagiga ergashadi', () => {
    const r = generateBase([[0, 0], [120, 0], [110, 120], [0, 120]], { ...DEFAULT_GEN, setback: 6 });
    expect(r.sections.filter(s => s.kind === 'burchak').some(s => angs(s.ring).some(a => Math.abs(a - 90) > 3))).toBe(true);
  });
  it('orthoSnap: natija asl koʻpburchak ichida, chegaradan oshgan ogʻishda null', () => {
    const A: XY[] = [[0, 0], [100, 0], [104, 80], [0, 80]], B = orthoSnap(A)!;
    for (const a of angs(B)) expect(Math.abs(a - 90)).toBeLessThan(0.01);
    for (const p of B) expect(p[0] <= 100 + (p[1] / 80) * 4 + 1e-6 && p[0] >= -1e-6 && p[1] >= -1e-6 && p[1] <= 80 + 1e-6).toBe(true);
    expect(orthoSnap([[0, 0], [100, 0], [115, 80], [0, 80]])).toBeNull();
  });
  it('minora 24 × 24: zina katagi fasadda (325, 168-bandlar), liftlar markazda', () => {
    const r: XY[] = [[0, 0], [24, 0], [24, 24], [0, 24]], mods = layoutSection(r, () => false).mods, pl = rulePlan(r, mods, [20, 40, 30, 10], 'M');
    expect(planChecks(pl, 20, mods).find(c => c.id === 'stairlight')!.ok).toBe(true);
  });
  it('L burchak seksiyasi: zina ichki burchakdan keyin hovli fasadida — derazali', () => {
    for (const [a, d] of [[30, 15], [40, 16], [45, 15]]) {
      const r = L(a, d), mods = layoutSection(r, () => false).mods, pl = rulePlan(r, mods, [20, 40, 30, 10], 'M'), ch = planChecks(pl, 20, mods);
      expect([a, ch.find(c => c.id === 'stairlight')!.ok]).toEqual([a, true]);
      expect([a, ch.find(c => c.id === 'corrlight')!.ok]).toEqual([a, true]);
    }
  });
  it('fasad modullari boʻlmasa — tekshiruv natijasi null', () => {
    const r: XY[] = [[0, 0], [24, 0], [24, 24], [0, 24]], pl = rulePlan(r, layoutSection(r, () => false).mods, [20, 40, 30, 10], 'M');
    expect(planChecks(pl, 20, []).find(c => c.id === 'stairlight')!.ok).toBeNull();
  });
});
