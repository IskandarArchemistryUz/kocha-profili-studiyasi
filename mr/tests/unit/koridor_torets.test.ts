import { describe, it, expect } from 'vitest';
import { structGrid, gridChecks } from '../../src/core/axes';
import { layoutSection } from '../../src/core/apartments';
import { planChecks, TORETS } from '../../src/core/sectionplan';
import { liftAdj } from '../../src/core/liftadj';
import type { XY } from '../../src/core/geo';

const rect = (a: number, b: number): XY[] => [[0, 0], [a, 0], [a, b], [0, b]];
const run = (r: XY[]) => {
  const gs = { system: 'wall' as const, seismic: 8 }, j = structGrid(r, null, { sys: 'monolit', seismic: 8, H: 27 }).joints;
  const L = layoutSection(r, () => false, [45, 35, 15, 5], 3.3, 'M', null, j, gs), pl = L.plan!;
  return { L, pl, ch: gridChecks(structGrid(r, pl, { sys: 'monolit', seismic: 8, H: 27 }), pl, L.mods, 9) };
};

describe('koridor uchi va torets kvartiralari (05.11, egasi chizmasi)', () => {
  it('33 × 15 (S1): koridor seksiya uchigacha bormaydi; har uchida BITTA P/C kvartira (egasi, 05.11 20:30), oʻrtada asosan 1x', () => {
    const { L, pl, ch } = run(rect(33, 15));
    const corr = pl.sections.reduce((t, s) => t + s.corridorLen, 0);
    expect(corr).toBeLessThan(33 - 2 * 3);   // avval 33 m
    // egasi tartibi: P (chap) · 1x · 1x · 2x + 1x · 1x · C (oʻng) — 7 xonadon
    expect(pl.apts.length).toBe(7);
    const ends = pl.apts.filter(a => a.torets);
    expect(ends.length).toBe(2);
    for (const a of ends) {
      expect(a.rooms).toBeGreaterThanOrEqual(2); expect(a.rooms).toBeLessThanOrEqual(3);
      const ys = a.ring.map(p => p[1]); expect(Math.min(...ys)).toBeLessThan(0.1); expect(Math.max(...ys)).toBeGreaterThan(14.9);   // ikki fasad
    }
    expect(pl.apts.filter(a => !a.torets && a.rooms === 1).length).toBeGreaterThanOrEqual(4);
    // har kvartiraga eshik koridordan, ustma-ust emas; konstruktiv oʻqlar (T1, T2) va lift-230 buzilmaydi
    expect(planChecks(pl, 25, L.mods).find(c => c.id === 'mop')?.ok).toBe(true);
    expect(ch.find(c => c.id === 'ax-T1')?.ok).toBe(true);
    expect(ch.find(c => c.id === 'ax-T2')?.ok).toBe(true);
    expect(liftAdj(pl, L.mods).lift).toHaveLength(0);
  });
  it('sayoz (12 m) qanot — avvalgi tartib: koridor uchigacha, torets studiyasi yoʻq', () => {
    const { pl } = run(rect(60, 12));
    expect(pl.apts.some(a => a.torets)).toBe(false);
  });
  it('evakuatsiya: eng uzoq kvartira eshigidan zinagacha — ShNQ 2.08.01-24, 173–175-band', () => {
    const { L, pl } = run(rect(33, 15));
    const lo = planChecks(pl, 25, L.mods).find(c => c.id === 'evac')!, hi = planChecks(pl, 40, L.mods).find(c => c.id === 'evac')!;
    expect(lo.source).toMatch(/172–175/);
    const d = parseFloat(lo.value.replace(/[^\d,]/g, '').replace(',', '.'));
    expect(lo.ok).toBe(d <= 12.05 ? true : d <= 25.05 ? null : false);
    expect(hi.ok).toBe(d <= 12.05 ? true : false);   // 28 m dan baland — 12 m (175-band)
  });
  it('TORETS.split (saqlangan funksiya, sukut oʻchiq): uch ikki kvartiraga — narigi tomon + koridor qoldigʻi studiya', () => {
    TORETS.split = true;
    try {
      const { L, pl } = run(rect(33, 15.01));   // boshqa oyoq izi — layoutSection keshidan emas
      expect(pl.apts.filter(a => a.torets).every(a => a.rooms === 1)).toBe(true);
      expect(pl.apts.length).toBeGreaterThan(7);
      expect(planChecks(pl, 25, L.mods).find(c => c.id === 'mop')?.ok).toBe(true);
    } finally { TORETS.split = false; }
  });
});
