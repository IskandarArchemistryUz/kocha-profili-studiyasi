import { describe, it, expect } from 'vitest';
import { mlParking, rampLen, need413, capCol, T30, pct5, ML } from '../../src/core/mlpark';
import { blankProject, type Building, type Garage, type Project } from '../../src/core/doc';
import { frame, area, type XY } from '../../src/core/geo';
import { RULES } from '../../src/norms/rules';
import { derive } from '../../src/core/derive';

const sq = (x: number, y: number, w: number, h: number): XY[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const O: [number, number] = [69.28, 41.31];
const fr = frame(O);

describe('koʻp qavatli avtoturargoh (05.11)', () => {
  it('pandus uzunligi: 3 m / 15 % + 3,6 m oʻtish ≈ 23,6 m (ANDOZA; misol kesimi 23,6 m)', () => {
    expect(rampLen()).toBeCloseTo(23.6, 1);
    expect(rampLen(1.5)).toBeCloseTo(13.6, 1);   // yarim qavatli
    expect(rampLen(3, 0.13)).toBeCloseTo(26.7, 1);
  });
  it('413-band qiymatlari', () => {
    expect([2, 3, 4, 5].map(need413)).toEqual([20, 14, 12, 10]);
    expect(need413(1)).toBe(25);
    expect(need413(7)).toBe(10);   // 5 dan koʻp — matnda yoʻq, 5 qavat qiymati (TALQIN)
  });
  it('30-jadval sigʻim ustunlari va qiymatlari', () => {
    expect([10, 11, 50, 51, 100, 101, 300, 301].map(capCol)).toEqual([0, 1, 1, 2, 2, 3, 3, 4]);
    expect(T30.front).toEqual([12, 15, 25, 35, 50]);
    expect(T30.blind).toEqual([12, 10, 15, 25, 35]);
    expect(T30.school[4]).toBeNull();
    expect([0, 1, 20, 21, 200].map(pct5)).toEqual([0, 1, 1, 2, 10]);
  });
  it('100 × 60 m parsel, 3 qavat: sigʻim har qavat yigʻindisi, 1-qavatda nazorat punkti', () => {
    const m = mlParking(sq(0, 0, 100, 60), 3, { ramp: 'togri', mod: 'p90' })!;
    expect(m).not.toBeNull();
    expect(m.ramp).toBe('togri');
    expect(m.levels).toBe(3);
    expect(m.perFloor[0]).toBe(m.perFloor[1] - ML.gateStalls);
    expect(m.spaces).toBe(m.perFloor.reduce((a, b) => a + b, 0));
    expect(m.ramps).toHaveLength(2);
    expect(m.nCores).toBeGreaterThanOrEqual(2);
    expect(m.cores.length).toBeGreaterThan(m.nCores);   // + ustunlar
    // har joy 2,5 × 5,3 m, bino ichida, bir-biriga tushmaydi
    const A = area(m.ring);
    expect(m.stalls.length * 2.5 * 5.3).toBeLessThan(A);
    expect(m.stalls.every(s => Math.abs(area(s) - 2.5 * 5.3) < 0.05)).toBe(true);
    // brutto ≈ 25–40 m² bir joyga (pandus, yoʻlak, tugunlar bilan)
    const gross = A / m.perFloor[1]; expect(gross).toBeGreaterThan(22); expect(gross).toBeLessThan(40);
    // chekinish 3 m — parsel ichida
    expect(m.ring.every(p => p[0] >= 2.9 && p[0] <= 97.1 && p[1] >= 2.9 && p[1] <= 57.1)).toBe(true);
  });
  it('kichik parsel — sigʻmaydi', () => {
    expect(mlParking(sq(0, 0, 40, 30), 3)).toBeNull();
  });
  it('qoidalar: 413 (zich — mos emas), 30-jadval (turar joy yaqin), taʼminot ikki marta hisoblanmaydi', () => {
    const m = mlParking(sq(0, 0, 100, 60), 5)!;
    const g = (lv: number, sp: number): Garage => ({ id: 'g1', grp: 'p1', kind: 'kop_qavatli', ring: m.ring.map(fr.toGeo), levels: lv, spaces: sp, stalls: m.stalls.map(r => r.map(fr.toGeo)), perFloor: [sp] });
    const park: Building = { id: 'pk', footprint: m.ring.map(fr.toGeo), floors: 5, nonRes: 5, use: 'avtoturargoh', gen: { grp: 'p1', kind: 'parking' } } as Building;
    const house: Building = { id: 'h', footprint: sq(0, 70, 60, 15).map(fr.toGeo), floors: 9, nonRes: 0, use: 'turar' } as Building;
    const base = blankProject('t');
    const doc = (lv: number, sp: number, bs: Building[]): Project => ({ ...base, origin: O, buildings: bs, garages: [g(lv, sp)],
      zones: [{ id: 'z1', at: fr.toGeo([50, 30]), use: 'avtoturargoh' }], streets: [] });
    const ev = (id: string, d: Project) => RULES.find(r => r.id === id)!.evaluate(derive(d), d);
    // 6000 m² parsel (koʻchasiz — butun hudud) / 700 joy < 10 m² → mos emas; 300 joy → mos
    const site = (d: Project): Project => ({ ...d, site: { rings: [sq(0, 0, 100, 60).map(fr.toGeo)] } as Project['site'] });
    expect(ev('park-413', site(doc(5, 300, [park]))).status).toBe('pass');
    expect(ev('park-30', site(doc(5, 300, [park, house]))).status).toBe('fail');   // > 300 emas: 101–300 → old tomoni 35 m; uy ~13 m
    expect(ev('park-411', site(doc(5, 300, [park]))).value).toBe(15);
    expect(ev('park-414', site(doc(5, 300, [park]))).status).toBe('review');
    expect(ev('park-413', site({ ...doc(5, 300, [park]), garages: [] })).status).toBe('na');
    expect(ev('park-413', site(doc(5, 700, [park]))).status).toBe('fail');
    expect(derive(site(doc(5, 300, [park]))).parkingProv).toBe(300);
  });
  it('pandus tizimlari (05.11, misollar papkasi): har biri joylashadi; qiya qavatda pandus yoʻq, pol ≤ 5 %', () => {
    const r = sq(0, 0, 160, 60);
    const t = mlParking(r, 4, { ramp: 'togri', mod: 'p90' })!, y = mlParking(r, 4, { ramp: 'yarim', mod: 'p90' })!, q = mlParking(r, 4, { ramp: 'qiya', mod: 'p90' })!, s2 = mlParking(r, 4, { ramp: 'spiral', mod: 'p90' })!;
    for (const m of [t, y, q, s2]) expect(m.spaces).toBeGreaterThan(400);
    expect(y.ramps).toHaveLength(4);
    expect(q.ramps).toHaveLength(0); expect(q.slope!).toBeLessThanOrEqual(0.05);
    expect(s2.ramps.length).toBeGreaterThan(10);
    const auto = mlParking(r, 4)!; expect(auto.spaces).toBe(Math.max(t.spaces, y.spaces, q.spaces, s2.spaces, auto.spaces));
  });
  it('60° modul — bir yoʻnalishli, joy 2,5 × 5 m (aylantirilgan)', () => {
    const m = mlParking(sq(0, 0, 160, 60), 4, { ramp: 'qiya', mod: 'p60' })!;
    expect(m.mod).toBe('p60'); expect(m.stalls.every(s => Math.abs(area(s) - 2.5 * 5.0) < 0.05)).toBe(true);
  });
  it('413-band: land berilsa joylar ≤ land / need413', () => {
    const m = mlParking(sq(0, 0, 160, 90), 5, { land: 9000 })!;
    expect(m.spaces).toBeLessThanOrEqual(900);
  });
  it('zina tugunlari: eng uzoq nuqtadan ≤ 40 m; oʻralgan variant — 4 ta savdo lentasi', () => {
    const m = mlParking(sq(0, 0, 160, 90), 4, { liner: true })!;
    expect(m.liner).toHaveLength(4);
    const cs = m.cores.slice(0, m.nCores).map(c => [c.reduce((a, p) => a + p[0], 0) / 4, c.reduce((a, p) => a + p[1], 0) / 4]);
    for (const p of m.ring) expect(Math.min(...cs.map(c => Math.hypot(p[0] - c[0], p[1] - c[1])))).toBeLessThanOrEqual(ML.evac + 0.5);
  });
});
