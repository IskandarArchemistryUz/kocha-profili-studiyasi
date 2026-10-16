import { describe, it, expect } from 'vitest';
import { blankProject, migrate, SchemaError, type Ring, type LngLat } from '../../src/core/doc';
import { apply, CommandError } from '../../src/core/commands';
import { Store } from '../../src/core/store';
import { frame, polyArea, ringLocal, isSimple, centroid } from '../../src/core/geo';
import { derive } from '../../src/core/derive';
import { evaluateAll } from '../../src/norms/rules';

/** origin atrofida w×h metrli toʻrtburchak (WGS84) */
function rect(o: LngLat, x0: number, y0: number, w: number, h: number): Ring {
  const f = frame(o);
  return [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]].map(p => f.toGeo(p as [number, number]));
}

describe('geo', () => {
  it('lokal ↔ geo qaytariladi', () => {
    const f = frame([69.28, 41.31]);
    const p: [number, number] = [123.4, -56.7];
    const q = f.toLocal(f.toGeo(p));
    expect(q[0]).toBeCloseTo(p[0], 6); expect(q[1]).toBeCloseTo(p[1], 6);
  });
  it('41° kenglikda 1° uzunlik ≈ 84 km, kenglik ≈ 111 km', () => {
    const f = frame([69.28, 41.31]);
    expect(f.mx).toBeGreaterThan(83500); expect(f.mx).toBeLessThan(84200);
    expect(f.my).toBeGreaterThan(111000); expect(f.my).toBeLessThan(111100);
  });
  it('100×50 m toʻrtburchak maydoni 5000 m², teshik ayiriladi', () => {
    const o: LngLat = [69.28, 41.31], f = frame(o);
    const outer = ringLocal(f, rect(o, 0, 0, 100, 50)), hole = ringLocal(f, rect(o, 10, 10, 10, 10));
    expect(polyArea([outer])).toBeCloseTo(5000, 3);
    expect(polyArea([outer, hole])).toBeCloseTo(4900, 3);
  });
  it('oʻzini kesuvchi halqa aniqlanadi', () => {
    expect(isSimple([[0, 0], [10, 0], [10, 10], [0, 10]])).toBe(true);
    expect(isSimple([[0, 0], [10, 10], [10, 0], [0, 10]])).toBe(false);
    expect(centroid([[0, 0], [10, 0], [10, 10], [0, 10]])).toEqual([5, 5]);
  });
});

describe('buyruqlar va tarix', () => {
  it('buyruq eski hujjatni oʻzgartirmaydi', () => {
    const d = blankProject('A');
    const d2 = apply(d, { type: 'rename', name: 'B' });
    expect(d.name).toBe('A'); expect(d2.name).toBe('B');
  });
  it('tanlanganlarni oʻchirish: loyiha binolari va atrof binolari bitta qadamda; qaytarish', () => {
    let d = blankProject();
    d = apply(d, { type: 'addBuilding', id: 'b1', footprint: [[0, 0], [0.0002, 0], [0.0002, 0.0002], [0, 0.0002]], floors: 3 });
    d = apply(d, { type: 'setKeep', keep: [7, 9] });
    const d2 = apply(d, { type: 'deleteSelection', ids: ['b1'], ctx: [7, 11] });
    expect(d2.buildings.length).toBe(0); expect(d2.removed).toEqual([7, 11]); expect(d2.keep).toEqual([9]);
    expect(migrate(JSON.parse(JSON.stringify(d2))).removed).toEqual([7, 11]);
    expect(apply(d2, { type: 'setRemoved', removed: [] }).removed).toBeUndefined();
  });
  it('notoʻgʻri buyruq rad etiladi', () => {
    const d = blankProject();
    expect(() => apply(d, { type: 'rename', name: '  ' })).toThrow(CommandError);
    expect(() => apply(d, { type: 'setSite', rings: [[[0, 0], [1, 1]]] })).toThrow(CommandError);
  });
  it('undo/redo va yangi buyruq redo ni tozalaydi', () => {
    const s = new Store(blankProject('A'));
    s.dispatch({ type: 'rename', name: 'B' }); s.dispatch({ type: 'rename', name: 'C' });
    expect(s.undo()).toBe(true); expect(s.doc.name).toBe('B');
    expect(s.redo()).toBe(true); expect(s.doc.name).toBe('C');
    s.undo(); s.dispatch({ type: 'rename', name: 'D' });
    expect(s.canRedo).toBe(false); s.undo(); expect(s.doc.name).toBe('B');
  });
  it('bir xil kalitli tez buyruqlar bitta qadam', () => {
    let t = 0; const s = new Store(blankProject('A'), 200, () => t);
    for (const n of ['A1', 'A2', 'A3']) { t += 100; s.dispatch({ type: 'rename', name: n }, 'nom'); }
    s.undo(); expect(s.doc.name).toBe('A');
    t += 5000; s.redo(); s.dispatch({ type: 'rename', name: 'X' }, 'nom'); s.undo(); expect(s.doc.name).toBe('A3');
  });
  it('bino qavati chegaralanadi', () => {
    const d = blankProject(), o = d.origin;
    const d2 = apply(d, { type: 'addBuilding', footprint: rect(o, 0, 0, 10, 10), floors: 5, nonRes: 9, id: 'b1' });
    expect(d2.buildings[0].nonRes).toBe(4);
    const d3 = apply(d2, { type: 'updateBuilding', id: 'b1', patch: { floors: 0 } });
    expect(d3.buildings[0].floors).toBe(1); expect(d3.buildings[0].nonRes).toBe(0);
  });
});

describe('hosilalar va meʼyorlar', () => {
  /* 1 ga uchastka, 60×12 m, 9 qavatli, 1-qavat tijorat → 720×8 = 5760 m² turar GFA; ×0,75 = 4320; /18 = 240 kishi */
  function sample() {
    let d = blankProject(); const o = d.origin;
    d = apply(d, { type: 'setSite', rings: [rect(o, 0, 0, 100, 100)] });
    d = apply(d, { type: 'addBuilding', footprint: rect(o, 10, 10, 60, 12), floors: 9, nonRes: 1 });
    return d;
  }
  it('aholi bitta formula boʻyicha', () => {
    const r = derive(sample());
    expect(r.siteHa).toBeCloseTo(1, 4);
    expect(r.gfa).toBeCloseTo(6480, 1); expect(r.resGfa).toBeCloseTo(5760, 1);
    expect(r.population).toBeCloseTo(240, 1); expect(r.density).toBeCloseTo(240, 1);
    expect(r.far).toBeCloseTo(0.648, 3); expect(r.gsi).toBeCloseTo(0.072, 3); expect(r.avgFloors).toBeCloseTo(9, 6);
  });
  it('§84: 240 kishi/ga — mos; 2 baravar zichroq — mos emas', () => {
    let d = sample();
    let res = evaluateAll(derive(d), d);
    expect(res.find(x => x.id === 'density-84')!.status).toBe('pass');
    d = apply(d, { type: 'setSettings', patch: { m2PerPerson: 9 } });
    res = evaluateAll(derive(d), d);
    const r = res.find(x => x.id === 'density-84')!;
    expect(r.status).toBe('fail'); expect(r.delta).toBeCloseTo(20, 1);
  });
  it('maʼlumot boʻlmasa — baholanmaydi', () => {
    const d = blankProject();
    expect(evaluateAll(derive(d), d).every(r => r.status === 'na')).toBe(true);
  });
});

describe('sxema', () => {
  it('toʻgʻri hujjat oʻtadi, notoʻgʻrisi rad etiladi', () => {
    const d = blankProject();
    expect(migrate(JSON.parse(JSON.stringify(d)))).toEqual(d);
    expect(() => migrate({ ...d, schema: 99 })).toThrow(SchemaError);
    expect(() => migrate({ ...d, origin: [500, 0] })).toThrow(SchemaError);
    expect(() => migrate({ ...d, buildings: [{ id: 'x', footprint: [], floors: 3 }] })).toThrow(SchemaError);
  });
});
