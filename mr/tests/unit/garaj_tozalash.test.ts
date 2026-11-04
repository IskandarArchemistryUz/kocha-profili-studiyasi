import { describe, it, expect } from 'vitest';
import { blankProject } from '../../src/core/doc';
import { apply } from '../../src/core/commands';
import { frame, type XY } from '../../src/core/geo';

/** 04.11 (Murad Buildings sinovi, 9-band): guruhida bino qolmagan yer osti avtoturargohi avtomatik olib tashlanadi */
describe('binolarsiz qolgan avtoturargoh', () => {
  const mk = () => {
    let d = blankProject('t'); const fr = frame(d.origin), ring = (r: XY[]) => r.map(fr.toGeo);
    d = apply(d, { type: 'replaceGroup', grp: 'g1', sections: [{ footprint: ring([[0, 0], [30, 0], [30, 15], [0, 15]]), floors: 9, nonRes: 1, use: 'turar', kind: 'oddiy' }],
      garage: { kind: 'yer_osti', ring: ring([[-10, -10], [60, -10], [60, 40], [-10, 40]]), levels: 1, spaces: 80 } } as any);
    d = apply(d, { type: 'replaceGroup', grp: 'g2', sections: [{ footprint: ring([[100, 0], [130, 0], [130, 15], [100, 15]]), floors: 9, nonRes: 1, use: 'turar', kind: 'oddiy' }],
      garage: { kind: 'yer_osti', ring: ring([[90, -10], [160, -10], [160, 40], [90, 40]]), levels: 1, spaces: 80 } } as any);
    return d;
  };
  it('daha generatsiyasi → binolarni oʻchirish → garaj yoʻq; boshqa guruh garaji qoladi', () => {
    let d = mk(); expect(d.garages.length).toBe(2);
    const b = d.buildings.find(x => x.gen?.grp === 'g1')!;
    d = apply(d, { type: 'removeBuilding', id: b.id });
    expect(d.garages.map(g => g.grp)).toEqual(['g2']);
  });
  it('tanlovni oʻchirish (deleteSelection) — garaj ham ketadi', () => {
    let d = mk(); const ids = d.buildings.map(b => b.id);
    d = apply(d, { type: 'deleteSelection', ids, ctx: [] } as any);
    expect(d.garages).toEqual([]);
  });
  it('binosi bor garajga tegilmaydi (obyekt oʻsha)', () => {
    const d = mk(), e = apply(d, { type: 'rename', name: 'x' });
    expect(e.garages).toBe(d.garages);
  });
});
