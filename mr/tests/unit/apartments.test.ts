import { describe, it, expect } from 'vitest';
import { layoutSection, windowSun, roomOk, westAllowed, roomsNeeded, planApartments, windowPoints, evaluateApts, isWest } from '../../src/core/apartments';
import { daySteps } from '../../src/core/sun';
import { blankProject, type Project } from '../../src/core/doc';
import { frame, type XY } from '../../src/core/geo';

const rect = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

describe('Kvartiralar', () => {
  it('sharq–gʻarb choʻziq seksiya: modullar, kvartiralar, oshxona shimolga', () => {
    const L = layoutSection(rect(0, 0, 40, 12), () => false);
    expect(L.mods.length).toBe(12 + 12 + 3 + 3); // 40/3,3 → 12; 12/3,3 → 3 (har tomonda)
    const used = L.apts.flatMap(a => a.mods);
    expect(new Set(used).size).toBe(used.length);           // modul ikki kvartiraga tegmaydi
    for (const a of L.apts) {
      expect(a.living.length).toBe(a.rooms);
      expect(a.mods.length).toBeGreaterThanOrEqual(a.rooms + 1);
      // janub va shimolga ochiq kvartirada yashash xonalari shimolga qaramaydi, agar janubda joy boʻlsa
      const azs = a.mods.map(m => L.mods[m].az);
      if (azs.some(z => Math.abs(z - 180) < 1) && azs.filter(z => Math.abs(z - 180) < 1).length >= a.rooms) expect(a.living.every(m => Math.abs(L.mods[m].az - 180) < 1)).toBe(true);
    }
  });
  it('qoʻshni seksiyaga tegib turgan devor — berk', () => {
    const L = layoutSection(rect(0, 0, 30, 12), p => p[0] > 30);
    expect(L.mods.filter(m => m.blind).every(m => Math.abs(m.az - 90) < 1)).toBe(true);
    expect(L.mods.filter(m => Math.abs(m.az - 90) < 1).every(m => m.blind)).toBe(true);
  });
  it('miks: 100 % ikki xonali → hammasi 2 xonali (oxirgisidan tashqari)', () => {
    const L = layoutSection(rect(0, 0, 60, 12), () => false, [0, 100, 0, 0]);
    expect(L.apts.slice(0, -1).every(a => a.rooms === 2)).toBe(true);
  });
  it('meʼyor qoidalari (8.3–8.5, 9.2)', () => {
    const n = { need: 2.5 };
    expect(roomOk(2.5, 2.5, n)).toBe(true); expect(roomOk(2.0, 3.0, n)).toBe(true); expect(roomOk(2.0, 2.9, n)).toBe(false);
    expect(roomOk(2.0, 2.4, { need: 2.0 })).toBe(true);
    expect(roomsNeeded(3)).toBe(1); expect(roomsNeeded(4)).toBe(2);
    expect(westAllowed(1)).toBe(0); expect(westAllowed(2)).toBe(1); expect(westAllowed(3)).toBe(2);
    expect(isWest(270)).toBe(true); expect(isWest(180)).toBe(false); expect(isWest(300)).toBe(false);
  });
  it('deraza: janub fasadi ochiq joyda ≥ 2,5 soat uzluksiz, shimol fasadi bahorda quyosh olmaydi, toʻsiq qisqartiradi', () => {
    const steps = daySteps(2026, 3, 22, 41.31, 69.28, 10);
    const free = windowSun([[0, -0.3], [0, 12.3]], [5, 5], [180, 0], [], steps);
    expect(free.run[0]).toBeGreaterThan(5); expect(free.total[1]).toBe(0);
    // janubda 20 m masofada 30 m balandlikdagi devor
    const wall = [{ ring: rect(-60, -30, 60, -20), top: 30 }];
    const sh = windowSun([[0, -0.3]], [5], [180], wall, steps);
    expect(sh.run[0]).toBeLessThan(free.run[0]);
  });
  it('loyiha: rejadagi kvartiralar va baholash', () => {
    const p: Project = blankProject('t'); const fr = frame(p.origin);
    p.buildings = [
      { id: 'a', footprint: rect(0, 0, 45, 14).map(fr.toGeo), floors: 9, nonRes: 1, use: 'turar' },
      { id: 'b', footprint: rect(0, -40, 45, -26).map(fr.toGeo), floors: 9, nonRes: 0, use: 'turar' },
      { id: 'c', footprint: rect(100, 0, 110, 10).map(fr.toGeo), floors: 3, nonRes: 3, use: 'savdo' },
    ];
    const plans = planApartments(p);
    expect(plans.map(x => x.bid)).toEqual(['a', 'b']);
    expect(plans[0].f0).toBe(1);
    const pts = windowPoints(plans), N = pts.length;
    const run = new Float32Array(N).fill(3), total = new Float32Array(N).fill(3);
    const st = evaluateApts(plans, pts, run, total, { need: 2.5 });
    const perFloor = plans.map(x => x.layout.apts.length);
    expect(st.apts).toBe(perFloor[0] * 8 + perFloor[1] * 9);
    expect(st.insolOk).toBe(st.apts);
    const dark = evaluateApts(plans, pts, new Float32Array(N), new Float32Array(N), { need: 2.5 });
    expect(dark.insolOk).toBe(0); expect(dark.cls.some(c => c === 2)).toBe(true);
  });
});

import { derive } from '../../src/core/derive';
describe('Hosilaviy: stilobat', () => {
  it('stilobat ustidagi seksiya dogʻi qurilish zichligiga ikki marta qoʻshilmaydi', () => {
    const p: Project = blankProject('t'); const fr = frame(p.origin);
    p.site = { rings: [rect(-50, -50, 50, 50).map(fr.toGeo)] };
    p.buildings = [
      { id: 's', footprint: rect(-40, -40, 40, 40).map(fr.toGeo), floors: 2, nonRes: 2, use: 'savdo', gen: { grp: 'g', kind: 'stilobat' } },
      { id: 't', footprint: rect(-10, -10, 10, 10).map(fr.toGeo), floors: 10, nonRes: 0, use: 'turar', z0: 2 },
    ];
    const d = derive(p);
    expect(d.gsi).toBeCloseTo(0.64, 2);
    expect(d.gfa).toBeCloseTo(6400 * 2 + 400 * 10, -1);
  });
});
