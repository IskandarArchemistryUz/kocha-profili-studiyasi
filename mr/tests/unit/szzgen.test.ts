import { describe, it, expect } from 'vitest';
import type { Limit } from '../../src/core/limits';
import { denyZone, clipToSzz, szzGreen, mpArea } from '../../src/core/szzgen';
import { blankProject } from '../../src/core/doc';
import { apply } from '../../src/core/commands';
import { RULES } from '../../src/norms/rules';
import { frame, type XY } from '../../src/core/geo';
import type { GenSection } from '../../src/core/generator';

/** Cheklovlar 3b (02.11): SanPiN 0350-17, 2.17 (generator SMZ ga taqiqlangan funksiyani qoʻymaydi), 2.19 (koʻkalamzorlik) */
const sq = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const mk = (zones: { at: XY; use: string }[] = []) => {
  let d = blankProject('t') as any; const fr = frame(d.origin), G = (p: XY) => fr.toGeo(p);
  d.site = { rings: [sq(-300, -300, 300, 300).map(G)] };
  // qabriston 40 × 40 m (< 10 ga, amaldagi) — IV sinf, 100 m
  d = apply(d, { type: 'addLimit', limit: { id: 'q1', kind: 'qabriston', status: 'saqlanadi', src: 'qolda', rings: [sq(-20, -20, 20, 20).map(G)] } as Limit } as any);
  if (zones.length) d = apply(d, { type: 'setZones', zones: zones.map((z, i) => ({ id: `z${i}`, at: G(z.at), use: z.use })) } as any);
  return d;
};
const sec = (r: XY[], extra: Partial<GenSection> = {}): GenSection => ({ ring: r, floors: 9, kind: 'oddiy', nonRes: 0, ...extra });

describe('denyZone / clipToSzz', () => {
  it('turar joy uchun — qabriston SMZ (100 m); ofis uchun — boʻsh', () => {
    const d = mk();
    expect(mpArea(denyZone(d, 'turar'))).toBeGreaterThan(30000);
    expect(denyZone(d, 'ofis')).toHaveLength(0);
  });
  it('SMZ ichidagi uy olinadi, chetidagi seksiya qisqartiriladi, tashqaridagi qoladi', () => {
    const dz = denyZone(mk(), 'turar'), notes: string[] = [];
    const out = clipToSzz([
      sec(sq(40, -5, 50, 5), { plot: sq(35, -10, 55, 10), kind: 'uy' }),           // SMZ ichida — olinadi
      sec(sq(100, -8, 180, 8), { blind: [1] }),                                      // 120 m chegaradan oʻtadi — qisqaradi
      sec(sq(200, -8, 260, 8)),                                                      // tashqarida — qoladi
      sec(sq(30, 40, 60, 56)),                                                       // toʻliq ichida — olinadi
    ], dz, notes);
    expect(out).toHaveLength(2);
    const xs = out[0].ring.map(p => p[0]);
    expect(Math.min(...xs)).toBeGreaterThan(115); expect(out[0].blind).toBeUndefined();
    expect(notes.join(' ')).toMatch(/2 ta bino SMZ ichiga/); expect(notes.join(' ')).toMatch(/1 ta seksiya/);
  });
});

describe('szzGreen — 2.19', () => {
  it('koʻkalam yoʻq — fail (IV sinf, ≥ 60 %)', () => {
    const d = mk([{ at: [150, 150], use: 'turar' }]);
    const g = szzGreen(d); expect(g).toHaveLength(1); expect(g[0]).toMatchObject({ cls: 'IV', need: 0.6 });
    expect(g[0].share).toBeLessThan(0.01);
    expect(RULES.find(r => r.id === 'szz-219')!.evaluate({} as any, d)).toMatchObject({ status: 'fail' });
  });
  it('butun uchastka himoya koʻkalamzorligi — pass', () => {
    const d = mk([{ at: [150, 150], use: 'himoya' }]);
    expect(szzGreen(d)[0].share).toBeGreaterThan(0.95);
    expect(RULES.find(r => r.id === 'szz-219')!.evaluate({} as any, d)).toMatchObject({ status: 'pass' });
  });
  it('SMZ yoʻq — na', () => {
    let d = blankProject('t') as any; const fr = frame(d.origin); d.site = { rings: [sq(-100, -100, 100, 100).map(p => fr.toGeo(p))] };
    expect(RULES.find(r => r.id === 'szz-219')!.evaluate({} as any, d)).toMatchObject({ status: 'na' });
  });
});
