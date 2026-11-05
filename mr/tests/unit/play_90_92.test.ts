import { describe, it, expect } from 'vitest';
import { RULES } from '../../src/norms/rules';
import { derive } from '../../src/core/derive';
import { landscape } from '../../src/core/landscape';
import { blankProject } from '../../src/core/doc';
import { apply as applyCommand } from '../../src/core/commands';
import { frame, type XY } from '../../src/core/geo';

const rect = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
/** ShNQ 2.07.01-23, 89–92-bandlar: 4-jadval maydonchalari, 90-band qisqartirish, 91-band ≥ 150 m², 92-band tomlar */
const mk = (floors: number) => {
  const d = blankProject('t') as any, fr = frame(d.origin), G = (p: XY) => fr.toGeo(p);
  d.site = { rings: [rect(-90, -80, 90, 80).map(G)] };
  d.buildings = [
    { id: 'n', footprint: rect(-80, 55, 80, 70).map(G), floors, nonRes: 0, use: 'turar' },
    { id: 's', footprint: rect(-80, -70, 80, -55).map(G), floors, nonRes: 0, use: 'turar' },
  ];
  return d;
};
const rule = (id: string, d: any) => RULES.find(r => r.id === id)!.evaluate(derive(d), d);

describe('play-89: 90-band qisqartirish', () => {
  it('sukut — oʻchiq, talab 3,1 m²/kishi', () => {
    const d = mk(9), x = derive(d);
    expect(x.playNeed).toBeCloseTo(x.population * 3.1, 3); expect(x.playNeed0).toBeCloseTo(x.playNeed, 6);
    expect(rule('play-89', d).note).toContain('90-band: chang');
  });
  it('sport majmuasi — bolalar, kattalar, sport ×0,5; chang — xoʻjalik ×0,5', () => {
    const d = mk(9); d.settings.play90 = { sport: true };
    let x = derive(d); expect(x.playNeed).toBeCloseTo(x.population * (2.8 / 2 + 0.3), 3);
    expect(rule('play-89', d).note).toContain('90-band qoʻllandi'); expect(rule('play-89', d).note).toContain('Mavze sport');
    d.settings.play90 = { sport: true, dust: true }; x = derive(d);
    expect(x.playNeed).toBeCloseTo(x.population * 1.55, 3);
  });
  it('zich hovlida qisqartirish holatni yaxshilaydi', () => {
    const d = mk(16), a = rule('play-89', d); d.settings.play90 = { sport: true, dust: true };
    const b = rule('play-89', d);
    const rank = { fail: 0, review: 1, pass: 2 } as Record<string, number>;
    expect(rank[b.status]).toBeGreaterThanOrEqual(rank[a.status]);
  });
});

describe('play-91: birlashtirilgan maydoncha ≥ 150 m²', () => {
  it('hovlida bolalar + kattalar birlashtirilgan va ≥ 150 m²', () => {
    const d = mk(9), y = landscape(d), c = y.flatMap(q => q.play.filter(p => p.comb));
    expect(c.length).toBeGreaterThan(0); for (const p of c) expect(p.area).toBeGreaterThanOrEqual(149.5);
    expect(rule('play-91', d).status).toBe('pass');
  });
  it('kichik uy (aholi < 190) — baribir ≥ 150 m² yoki alohida', () => {
    const d = mk(1); d.buildings = [d.buildings[0]];
    const y = landscape(d); for (const p of y.flatMap(q => q.play.filter(p => p.comb))) expect(p.area).toBeGreaterThanOrEqual(149.5);
    expect(['pass', 'na']).toContain(rule('play-91', d).status);
  });
});

describe('play-89: 92-band va Tuzat', () => {
  it('yer usti avtoturargoh hovlida — «yer ostiga» taklifi; buyruq joylar sxemasini olib tashlaydi', () => {
    const d = mk(16), fr = frame(d.origin), G = (p: XY) => fr.toGeo(p);
    d.garages = [{ id: 'g1', grp: 'x', kind: 'yer_usti', ring: rect(-60, -40, 60, 40).map(G), levels: 1, spaces: 200,
      stalls: [rect(-60, -40, 60, -35).map(G), rect(-60, 35, 60, 40).map(G)], aisles: [rect(-60, -35, 60, -29).map(G)] }];
    d.buildings = d.buildings.map((b: any) => ({ ...b, gen: { grp: 'x', kind: 'qator' } }));
    const r = rule('play-89', d);
    if (r.status !== 'pass') expect(r.fix?.id).toBe('play-ug');
    const d2 = applyCommand(d, { type: 'updateGarage', id: 'g1', patch: { kind: 'yer_osti' } });
    expect(d2.garages[0].kind).toBe('yer_osti'); expect(d2.garages[0].stalls).toBeUndefined(); expect(d2.garages[0].aisles).toBeUndefined();
    expect(derive(d2).playGot).toBeGreaterThanOrEqual(derive(d).playGot);
  });
});
