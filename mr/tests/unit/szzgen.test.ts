import { describe, it, expect } from 'vitest';
import type { Limit } from '../../src/core/limits';
import { denyZone, clipToSzz, szzGreen, mpArea } from '../../src/core/szzgen';
import { blankProject } from '../../src/core/doc';
import { apply } from '../../src/core/commands';
import { RULES } from '../../src/norms/rules';
import { frame, type XY } from '../../src/core/geo';
import type { GenSection } from '../../src/core/generator';

/** Cheklovlar 3b (02.11); 06.11 (c61): SanQvaN 0103-25, 12-band (generator SMZ ga taqiqlangan funksiyani qoʻymaydi), 13-band (koʻkalamzorlik) */
const sq = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const mk = (zones: { at: XY; use: string }[] = [], kind: Limit['kind'] = 'qabriston') => {
  let d = blankProject('t') as any; const fr = frame(d.origin), G = (p: XY) => fr.toGeo(p);
  d.site = { rings: [sq(-300, -300, 300, 300).map(G)] };
  // qabriston 40 × 40 m, yopiq — 100 m (VM 101, 50-band; 06.11 c63)
  d = apply(d, { type: 'addLimit', limit: { id: 'q1', kind, status: 'saqlanadi', src: 'qolda', rings: [sq(-20, -20, 20, 20).map(G)], ...(kind === 'qabriston' ? { sub: { open: false } } : {}) } as Limit } as any);
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

describe('szzGreen — 0103-25, 13-band', () => {
  it('koʻkalam yoʻq — issiqxona (4-sinf, ≥ 60 %) fail; qabriston (VM 101 — 13-band qoʻllanmaydi) — koʻrib chiqish', () => {
    const d = mk([{ at: [150, 150], use: 'turar' }], 'issiqxona');
    const g = szzGreen(d); expect(g).toHaveLength(1); expect(g[0]).toMatchObject({ cls: 'IV', need: 0.6 });
    expect(g[0].share).toBeLessThan(0.01); expect(g[0].amal).toBeUndefined();
    expect(RULES.find(r => r.id === 'szz-219')!.evaluate({} as any, d)).toMatchObject({ status: 'fail' });
    const q = mk([{ at: [150, 150], use: 'turar' }]);
    expect(szzGreen(q)[0].amal).toBe(true);
    const r = RULES.find(r => r.id === 'szz-219')!.evaluate({} as any, q); expect(r.status).toBe('review'); expect(r.note).toContain('VM 101');
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
