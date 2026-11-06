import { describe, it, expect } from 'vitest';
import { szzOf, type Limit } from '../../src/core/limits';
import { limitChecks, szzVerdict } from '../../src/core/limitcheck';
import { blankProject } from '../../src/core/doc';
import { apply } from '../../src/core/commands';
import { RULES } from '../../src/norms/rules';
import { frame, type XY } from '../../src/core/geo';

const sq = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const L = (o: Partial<Limit>): Limit => ({ id: 'c1', kind: 'qabriston', status: 'saqlanadi', src: 'qolda', ...o } as Limit);
const mk = (limits: Limit[], blds: { r: XY[]; use: string }[]) => {
  let d = blankProject('t') as any; const fr = frame(d.origin), G = (p: XY) => fr.toGeo(p);
  d.site = { rings: [sq(-300, -300, 300, 300).map(G)] };
  for (const l of limits) d = apply(d, { type: 'addLimit', limit: { ...l, ...(l.rings ? { rings: l.rings.map(r => (r as unknown as XY[]).map(G)) } : {}), ...(l.axis ? { axis: (l.axis as unknown as XY[]).map(G) } : {}) } } as any);
  blds.forEach((b, i) => { d = apply(d, { type: 'addBuilding', id: `b${i}`, footprint: b.r.map(G), floors: 9, nonRes: 0, use: b.use } as any); });
  return d;
};
const rule = (id: string, d: any) => RULES.find(r => r.id === id)!.evaluate({} as any, d);

/** 06.11 (c63): qabriston SMZ — VM 101-son qarori, 1-ilova, 50-band (NORMA) */
describe('qabriston SMZ — VM 101, 50-band', () => {
  it('06.11 (c65): qishloq va kolumbariy — SMZ 50 m (100 m — alohida halqa, qab-100); yopiq 100; qoʻlda bufer', () => {
    expect(szzOf(L({ sub: { rural: true } }), 1.5)).toMatchObject({ m: 50, flag: 'NORMA' });
    expect(szzOf(L({ sub: { memorial: true } }), 3).m).toBe(50);
    expect(szzOf(L({ sub: { open: false } }), 30)).toMatchObject({ m: 100, flag: 'NORMA' });
    expect(szzOf(L({}), 4).ref).toContain('VM 101-son qarori (04.04.2011), 1-ilova, 50-band');
    expect(szzOf(L({ szz: 60 }), 4)).toMatchObject({ m: 60, table: 300 });
  });
});

describe('SMZ ichidagi funksiyalar (SanQvaN 0103-25, 12 / 14-band)', () => {
  it('verdikt', () => {
    expect(szzVerdict('turar')).toBe('deny'); expect(szzVerdict('maktab')).toBe('deny'); expect(szzVerdict('yashil')).toBe('deny');
    // 12-band: ijtimoiy soha obyektlari; 14-band roʻyxati qisqardi — ofis, avtoturargoh, savdo, muhandislik — koʻrib chiqish
    expect(szzVerdict('ijtimoiy')).toBe('deny');
    expect(szzVerdict('ofis')).toBe('review'); expect(szzVerdict('avtoturargoh')).toBe('review'); expect(szzVerdict('savdo')).toBe('review');
    expect(szzVerdict('himoya')).toBe('allow'); expect(szzVerdict('sanoat')).toBe('allow');
    // 12-band — sogʻliqni saqlash muassasasi va oziq-ovqat omborxonasi taqiqda
    expect(szzVerdict('poliklinika')).toBe('deny'); expect(szzVerdict('logistika', 'sabzavot')).toBe('deny'); expect(szzVerdict('logistika', 'tarqatish')).toBe('allow');
    expect(szzVerdict('mehmonxona')).toBe('review');
  });
  it('04.11 audit: SMZ ga tushgan park kvartali (binosiz) — taqiq', () => {
    const qab = L({ rings: [sq(-20, -20, 20, 20) as any] });
    const d = mk([qab], []);
    d.zones = [{ id: 'z1', at: frame(d.origin).toGeo([60, 0]), use: 'yashil' } as any];
    const c = limitChecks(d);
    expect(c.szzBlocks.length).toBeGreaterThan(0); expect(c.szzBlocks[0].use).toBe('yashil');
  });
  it('issiqxona 100 m SMZ ichidagi turar joy — fail, tashqaridagi — yoʻq; ofis — review', () => {
    const iss = L({ kind: 'issiqxona', rings: [sq(-20, -20, 20, 20) as any] });
    const d = mk([iss], [{ r: sq(40, -10, 70, 10), use: 'turar' }, { r: sq(200, -10, 230, 10), use: 'turar' }, { r: sq(-10, 50, 10, 80), use: 'ofis' }]);
    const c = limitChecks(d);
    expect(c.szz.map(x => [x.bid, x.verdict])).toEqual([['b0', 'deny'], ['b2', 'review']]);
    expect(rule('szz-217', d)).toMatchObject({ status: 'fail', value: 1 });
    const d2 = mk([iss], [{ r: sq(-10, 50, 10, 80), use: 'ofis' }]);
    expect(rule('szz-217', d2).status).toBe('review');
    expect(rule('szz-217', mk([], [])).status).toBe('na');
  });
  it('06.11 (c63): qabriston SMZ i ichidagi turar joy — mos emas (VM 101, 50-band: SMZ da turar joy va jamoat binolari taqiqlanadi)', () => {
    const qab = L({ rings: [sq(-20, -20, 20, 20) as any] });
    const d = mk([qab], [{ r: sq(40, -10, 70, 10), use: 'turar' }]);
    expect(limitChecks(d).szz.map(x => [x.bid, x.verdict, x.amal])).toEqual([['b0', 'deny', undefined]]);
    expect(rule('qab-szz', d).status).toBe('fail');
    expect(rule('szz-217', d).status).toBe('pass');   // 06.11 (c65): qabriston SMZ i — alohida qoida
  });
  it('buziladigan qabriston — SMZ yoʻq', () => {
    const d = mk([L({ rings: [sq(-20, -20, 20, 20) as any], status: 'buziladi' })], [{ r: sq(40, -10, 70, 10), use: 'turar' }]);
    expect(limitChecks(d).szz).toHaveLength(0);
    expect(rule('szz-217', d).status).toBe('pass');
  });
});

describe('ELU (VMQ 1050, 14 / 17; ShNQ 251)', () => {
  const elu = (o: Partial<Limit> = {}) => L({ id: 'e1', kind: 'elu', axis: [[-300, 0], [300, 0]] as any, kv: 110, elu: 'mavjud', ...o });
  it('110 kV zonasi (20 m) — bino fail; uzoqroq — pass', () => {
    expect(rule('elu-1050', mk([elu()], [{ r: sq(0, 10, 20, 30), use: 'ofis' }]))).toMatchObject({ status: 'fail', value: 1 });
    expect(rule('elu-1050', mk([elu()], [{ r: sq(0, 30, 20, 50), use: 'ofis' }])).status).toBe('pass');
    expect(rule('elu-1050', mk([], [])).status).toBe('na');
  });
  it('≥ 35 kV havo liniyasi turar joy kvartali ustidan — fail; kabel — na', () => {
    const d = mk([elu()], []);
    expect(rule('elu-251', d).status).toBe('fail');
    expect(rule('elu-251', mk([elu({ elu: 'kabel' })], [])).status).toBe('na');
    expect(rule('elu-251', mk([elu({ kv: 10 })], [])).status).toBe('na');
  });
  it('qoʻlda kamaytirilgan zona — review', () => {
    expect(rule('szz-manual', mk([elu({ szz: 10 })], []))).toMatchObject({ status: 'review', value: 1 });
    expect(rule('szz-manual', mk([elu({ szz: 25 })], [])).status).toBe('pass');
  });
});
