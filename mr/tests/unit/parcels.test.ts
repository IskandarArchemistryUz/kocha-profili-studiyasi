import { describe, it, expect } from 'vitest';
import { subdivide, split, merge, gridAngle, areaOf } from '../../src/core/parcels';
import { blankProject } from '../../src/core/doc';
import { apply } from '../../src/core/commands';
import { frame, type XY } from '../../src/core/geo';
import { computePlan } from '../../src/core/plan';
import { derive, schoolCapacity, mtmCapacity } from '../../src/core/derive';
import { evaluateAll } from '../../src/norms/rules';

const sq = (w: number, h: number): XY[] => [[0, 0], [w, 0], [w, h], [0, h]];

describe('Parsellar', () => {
  it('boʻlish: maydon saqlanadi, parsellar ~maqsad oʻlchamida', () => {
    const cells = subdivide([sq(300, 200)], 1e4, 0);
    expect(cells.length).toBe(6);
    expect(cells.reduce((s, c) => s + areaOf(c), 0)).toBeCloseTo(60000, -1);
  });
  it('notekis kvartal: kichik qoldiqlar qoʻshiladi', () => {
    const tri: XY[] = [[0, 0], [260, 0], [0, 180]];
    const cells = subdivide([tri], 6000, 0);
    expect(cells.reduce((s, c) => s + areaOf(c), 0)).toBeCloseTo(260 * 180 / 2, -1);
    cells.forEach(c => expect(areaOf(c)).toBeGreaterThan(0.3 * 6000 * 0.9));
  });
  it('kesish va birlashtirish', () => {
    const parts = split([sq(100, 50)], [40, -10], [40, 60]);
    expect(parts).toHaveLength(2);
    expect(parts.map(areaOf).sort((a, b) => a - b)).toEqual([2000, 3000]);
    const m = merge(parts[0], parts[1]); expect(m && areaOf(m)).toBeCloseTo(5000, 3);
    expect(merge([sq(10, 10)], [[[20, 20], [30, 20], [30, 30], [20, 30]]])).toBeNull();
    expect(gridAngle([[[0, 0], [100, 100], [90, 110], [0, 10]]], 'street')).toBeCloseTo(Math.PI / 4, 3);
  });
  it('hujjatda: parsellar kvartal oʻrniga birlik boʻladi, funksiyasi alohida', () => {
    let d = blankProject(); const fr = frame(d.origin);
    d = apply(d, { type: 'setSite', rings: [sq(200, 100).map(p => fr.toGeo([p[0] - 100, p[1] - 50]))] });
    const g = (r: XY[]) => r.map(p => fr.toGeo([p[0] - 100, p[1] - 50]));
    d = apply(d, { type: 'setParcels', block: 'z1', label: { id: 'z1', at: fr.toGeo([0, 0]), use: 'turar' }, parcels: [
      { id: 'a', rings: [g([[0, 0], [100, 0], [100, 100], [0, 100]])], use: 'maktab' }, { id: 'b', rings: [g([[100, 0], [200, 0], [200, 100], [100, 100]])], use: 'turar' }] });
    const p = computePlan(d);
    expect(p.blocks).toHaveLength(2); expect(p.blocks.map(b => b.use).sort()).toEqual(['maktab', 'turar']);
    d = apply(d, { type: 'updateParcel', id: 'a', patch: { use: 'mtm' } });
    expect(computePlan(d).blocks.find(b => b.parcelId === 'a')!.use).toBe('mtm');
  });
});

describe('Xizmatlar va avtoturargoh (ShNQ 2.07.01-23)', () => {
  it('maktab sigʻimi 41-jadval, MTM 543-band', () => {
    // jadval monoton emas: 989 dan ortiq oʻquvchiga 10 m² — shuning uchun ~9 900 m² dan sigʻim sakraydi
    expect(schoolCapacity(9000)).toBe(450);           // 20 m² → 450
    expect(schoolCapacity(10500)).toBe(1050);         // > 989 → 10 m²
    expect(schoolCapacity(9800)).toBe(490);
    expect(mtmCapacity(3000)).toBe(75); expect(mtmCapacity(7000)).toBe(200);
  });
  it('reyestr: maktab, MTM, parkovka talablari aholi va kvartiralardan', () => {
    let d = blankProject(); const fr = frame(d.origin);
    d = apply(d, { type: 'setSite', rings: [sq(200, 100).map(p => fr.toGeo([p[0] - 100, p[1] - 50]))] });
    d = apply(d, { type: 'addBuilding', footprint: sq(60, 15).map(p => fr.toGeo(p)), floors: 10, nonRes: 0 });
    const dd = derive(d), rs = evaluateAll(dd, d);
    expect(dd.apartments).toBeCloseTo(60 * 15 * 10 * 0.75 / 65, 3);
    expect(dd.parkingReq).toBe(Math.ceil(dd.apartments));
    expect(rs.find(r => r.id === 'parking')!.status).toBe('fail');
    expect(rs.find(r => r.id === 'school')!.status).toBe('fail');
  });
});
