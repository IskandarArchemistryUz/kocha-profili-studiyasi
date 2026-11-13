import { describe, it, expect } from 'vitest';
import { planApartments } from '../../src/core/apartments';
import { shxBuilding, shxMix, shxSheet, shxInsolStats, hm } from '../../src/core/shaxmatka';
import { blankProject, type Project } from '../../src/core/doc';
import { frame, type XY } from '../../src/core/geo';

const rect = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
function proj(): Project {
  const p: Project = blankProject('t'); const fr = frame(p.origin);
  p.buildings = [
    { id: 'a', footprint: rect(0, 0, 45, 14).map(fr.toGeo), floors: 9, nonRes: 1, use: 'turar' },
    { id: 'b', footprint: rect(0, -40, 45, -26).map(fr.toGeo), floors: 6, nonRes: 0, use: 'turar' },
  ] as Project['buildings'];
  return p;
}

describe('shaxmatka (13.11)', () => {
  it('bino: qavatlar, raqamlash seksiya → qavat (pastdan), noturar 1-qavat', () => {
    const p = proj(), plans = planApartments(p), bi = plans.findIndex(x => x.bid === 'a'), B = shxBuilding(p, plans, bi);
    expect(B.floors.length).toBe(9);
    expect(B.floors[0].res).toBe(false);
    const all = B.floors.flatMap(f => f.apts);
    expect(all.length).toBeGreaterThan(8);
    expect(all.map(a => a.n).sort((x, y) => x - y)).toEqual(all.map((_, i) => i + 1));   // 1..N, takrorsiz
    // birinchi seksiyaning eng pastki turar qavati — 1 dan boshlanadi
    const s0 = B.secs[0], low = B.floors.find(f => f.res)!.apts.filter(a => a.sec === s0);
    expect(Math.min(...low.map(a => a.n))).toBe(1);
    // yuqoriga qarab oshadi
    const f2 = B.floors.find(f => f.res)!, f3 = B.floors[B.floors.indexOf(f2) + 1];
    expect(Math.min(...f3.apts.filter(a => a.sec === s0).map(a => a.n))).toBeGreaterThan(Math.max(...low.map(a => a.n)));
    const mx = shxMix([B]);
    expect(mx.reduce((s, r) => s + r.n, 0)).toBe(all.length);
  });
  it('insolyatsiya: holatlar hisobi va soat formati', () => {
    const p = proj(), plans = planApartments(p), B = shxBuilding(p, plans, 0, () => 3);
    const c = shxInsolStats([B]);
    expect(c.ok).toBe(B.floors.flatMap(f => f.apts).length);
    const B0 = shxBuilding(p, plans, 0, () => 0), c0 = shxInsolStats([B0]);
    expect(c0.bad).toBe(B0.floors.flatMap(f => f.apts).length);
    expect(hm(6.99)).toBe('6:59'); expect(hm(2.5)).toBe('2:30'); expect(hm(1.999)).toBe('2:00');
  });
  it('varaq mazmuni: bino va loyiha', () => {
    const p = proj(), plans = planApartments(p), t = (s: string) => s;
    const a = shxSheet(p, plans, { scope: 'bino', bi: 0, cell: 'toliq', insol: false }, t);
    const svg = a.body(0, 0, 300, 200);
    expect(svg).toContain('1-SEKSIYA'); expect(svg).toContain('m²'); expect(svg).toContain('<svg');   // keng varaq — tipik qavat rejasi
    expect(a.side!(0, 0, 80, 200)).toContain('KVARTIRALAR TARKIBI');
    const L = shxSheet(p, plans, { scope: 'loyiha', bi: 0, cell: 'toliq', insol: false }, t);
    expect(L.body(0, 0, 300, 200)).toContain('shxHatch');
    expect(L.side!(0, 0, 80, 200)).toContain('MIKS');
    const I = shxSheet(p, plans, { scope: 'bino', bi: 0, cell: 'toliq', insol: true }, t, () => 0.5);
    expect(I.body(0, 0, 300, 200)).toContain('#f4d3d0');
    expect(shxSheet(p, [], { scope: 'bino', bi: 0, cell: 'toliq', insol: false }, t).body(0, 0, 100, 100)).toContain('Turar joy');
  });
});
