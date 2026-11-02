import { describe, it, expect } from 'vitest';
import { blankProject } from '../../src/core/doc';
import { apply } from '../../src/core/commands';
import { prodChecks } from '../../src/core/prodcheck';
import { prodSzz, logiType } from '../../src/core/logistics';
import { typoAllowed, generate, usePreset, DEFAULT_GEN } from '../../src/core/generator';
import { RULES } from '../../src/norms/rules';
import { frame, type XY } from '../../src/core/geo';

const sq = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const rule = (id: string, d: any) => RULES.find(r => r.id === id)!.evaluate({} as any, d);
const mk = (sub?: string, house = true) => {
  let d = blankProject('t') as any; const fr = frame(d.origin), G = (p: XY) => fr.toGeo(p);
  d.site = { rings: [sq(-200, -100, 200, 100).map(G)] };
  d = apply(d, { type: 'setZones', zones: [{ id: 'z1', at: G([0, 0]), use: 'turar' }] } as any);
  d = apply(d, { type: 'setParcels', block: 'z1', parcels: [
    { id: 'p1', rings: [sq(-200, -100, 0, 100).map(G)], use: 'turar' },
    { id: 'p2', rings: [sq(0, -100, 200, 100).map(G)], use: 'logistika' },
  ] } as any);
  if (sub) d = apply(d, { type: 'setZones', zones: d.zones.map((z: any) => ({ ...z, sub })) } as any);
  if (house) d = apply(d, { type: 'addBuilding', footprint: sq(-40, -10, -20, 10).map(G), floors: 9, nonRes: 0, use: 'turar' } as any);
  return d;
};

describe('logistika turlari (02.11)', () => {
  it('SMZ va manba', () => {
    expect(prodSzz('logistika', 'sabzavot')).toMatchObject({ szz: 50, flag: 'NORMA' });
    expect(prodSzz('logistika', 'yoqilgi')).toMatchObject({ szz: 100, flag: 'NORMA' });
    expect(prodSzz('logistika', 'sovutgich')).toMatchObject({ szz: 50, flag: 'ANDOZA' });
    expect(logiType('terminal').rail).toBe(true); expect(logiType(undefined).id).toBe('tarqatish');
    expect(prodSzz('sanoat')?.flag).toBe('ANDOZA'); expect(prodSzz('turar')).toBeNull();
  });
  it('generator: ishlab chiqarish — faqat «Ombor bloki», 1 qavat; maʼmuriy — ofis', () => {
    expect(typoAllowed('logistika')).toEqual(['ombor']); expect(typoAllowed('mamuriy')).toContain('ofis_plita');
    const g = usePreset('logistika', DEFAULT_GEN)!, r = generate(sq(0, 0, 200, 120), g);
    expect(r.sections).toHaveLength(1); expect(r.sections[0].floors).toBe(1);
  });
});

describe('ishlab chiqarish tekshiruvlari (ShNQ 2.07.01-23, 146, 147, 174)', () => {
  it('146: turar joy logistika SMZ (50 m) ichida — fail; 147: tutash — fail; 174 — review', () => {
    const d = mk();
    const c = prodChecks(d);
    expect(c.zones).toHaveLength(1); expect(c.zones[0].szz).toBe(50);
    expect(c.p146).toHaveLength(1); expect(c.p147.length).toBeGreaterThan(0); expect(c.p174).toHaveLength(1);
    expect(rule('prod-146', d).status).toBe('fail'); expect(rule('prod-147', d).status).toBe('fail'); expect(rule('logi-174', d).status).toBe('review');
  });
  it('bino SMZ dan tashqarida — 146 pass; ishlab chiqarish yoʻq — na', () => {
    let d = mk(undefined, false); const fr = frame(d.origin);
    d = apply(d, { type: 'addBuilding', footprint: sq(-190, -10, -170, 10).map(p => fr.toGeo(p)), floors: 9, nonRes: 0, use: 'turar' } as any);
    expect(rule('prod-146', d).status).toBe('pass');
    expect(rule('prod-146', blankProject('x') as any).status).toBe('na');
  });
  it('yoqilgʻi ombori — 100 m SMZ', () => { expect(prodChecks(mk('yoqilgi')).zones[0].szz).toBe(100); });
});
