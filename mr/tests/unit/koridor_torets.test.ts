import { describe, it, expect } from 'vitest';
import { structGrid, gridChecks } from '../../src/core/axes';
import { layoutSection } from '../../src/core/apartments';
import { planChecks, TORETS } from '../../src/core/sectionplan';
import { liftAdj } from '../../src/core/liftadj';
import { aptInterior } from '../../src/core/aptplan';
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
  // 12.11 (eski navbat, 1-band: «P/C torets 12–13 m va 18 m+ qanotlar uchun»): sayoz qanotda uch kvartirasi ikki oraliqli
  // (bir oraliq × chuqurlik < 25 m²), chuqur (≤ 18,5 m) qanotda tor oyoqda xona ≤ 6 m (orqada sanuzel, yoʻlak, kiyimxona)
  for (const [L, D] of [[60, 12], [33, 13], [33, 18], [60, 18]] as const) it(`${L} × ${D} m qanot: uchlarida P/C kvartira, koridor uchigacha bormaydi, ichki reja meʼyorga mos`, () => {
    const { L: lay, pl, ch } = run(rect(L, D));
    const ends = pl.apts.filter(a => a.torets);
    expect(ends.length).toBe(2);
    expect(pl.sections.reduce((t, s) => t + s.corridorLen, 0)).toBeLessThan(L - 6);
    for (const a of ends) {
      const ys = a.ring.map(p => p[1]); expect(Math.min(...ys)).toBeLessThan(0.1); expect(Math.max(...ys)).toBeGreaterThan(D - 0.1);   // ikki fasad
      const I = aptInterior(a, lay.mods)!;
      expect(I).toBeTruthy(); expect(I.simple).toBeFalsy(); expect(I.norm ?? []).toEqual([]);
    }
    expect(planChecks(pl, 25, lay.mods).filter(c => c.ok === false).map(c => c.id)).toEqual([]);
    expect(ch.filter(c => c.ok === false).map(c => c.id)).toEqual([]);
  }, 30_000);   // 12.11: reja tanlovida torets seksiyasi kvartiralarining ichki rejasi tekshiriladi (sekinroq)
  it('juda chuqur (20 m) qanot — avvalgi tartib (uch kvartirasi ichki rejasi sigʻmaydi)', () => {
    const { pl } = run(rect(60, 20));
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
