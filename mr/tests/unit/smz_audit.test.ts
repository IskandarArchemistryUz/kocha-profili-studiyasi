import { describe, it, expect } from 'vitest';
import { objOf, parseLimitsOsm, limitsQuery } from '../../src/context/limitsosm';
import { objZone, szzOf, cleanLimit, OBJ, OBJ_BY, OBJ_GROUPS, type Limit } from '../../src/core/limits';
import { limitChecks } from '../../src/core/limitcheck';
import { blankProject } from '../../src/core/doc';
import { apply } from '../../src/core/commands';
import { RULES } from '../../src/norms/rules';
import { frame, type XY } from '../../src/core/geo';
import type { LngLat } from '../../src/core/doc';

/** 07.11 (c70): SMZ obyektlari — SanQvaN 0103-25 1-ilova / 4-ilova, ShNQ 2.07.01-23 257-band, ShNQ 2.04.08-22 240-band */
const O: LngLat = [69.25, 41.27], fr = frame(O);
const G = (x: number, y: number) => { const g = fr.toGeo([x, y] as XY); return { lon: g[0], lat: g[1] }; };
const site: LngLat[] = [[-200, -200], [200, -200], [200, 200], [-200, 200]].map(p => fr.toGeo(p as XY));
const sq = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const mk = (limits: Limit[], blds: { r: XY[]; use: string }[]) => {
  let d = blankProject('t') as any; const f = frame(d.origin), g = (p: XY) => f.toGeo(p);
  d.site = { rings: [sq(-300, -300, 300, 300).map(g)] };
  for (const l of limits) d = apply(d, { type: 'addLimit', limit: { ...l, rings: l.rings!.map(r => (r as unknown as XY[]).map(g)) } } as any);
  blds.forEach((b, i) => { d = apply(d, { type: 'addBuilding', id: `b${i}`, footprint: b.r.map(g), floors: 9, nonRes: 0, use: b.use } as any); });
  return d;
};
const rule = (id: string, d: any) => RULES.find(r => r.id === id)!.evaluate({} as any, d);

describe('SMZ obyektlari katalogi', () => {
  it('1-ilova qatorlari: sinf → 7-band masofasi; manbada qator raqami', () => {
    expect(objZone({ obj: 'yoqilgi_414' })).toMatchObject({ m: 100, cls: 'IV', flag: 'NORMA' });
    expect(objZone({ obj: 'yoqilgi_414' }).ref).toContain('1-ilova, 4-sinf, 414');
    for (const k of ['yoqilgi_491', 'agtksh_492', 'kriogen_493', 'agzs_494', 'avtoservis_487', 'yuvish_489', 'bozor_488', 'otochirish_485', 'vet_458']) expect(objZone({ obj: k })).toMatchObject({ m: 50, cls: 'V' });
    expect(objZone({ obj: 'kriogen_422' }).m).toBe(100);
    expect(objZone({ obj: 'qozon_290' })).toMatchObject({ m: 300, cls: 'III' });
    expect(objZone({ obj: 'avtovokzal_308' }).m).toBe(300);
    expect(objZone({ obj: 'poligon_168' })).toMatchObject({ m: 500, cls: 'II' });
    expect(objZone({ obj: 'kremator_79' })).toMatchObject({ m: 1000, cls: 'I' });
    // har qator guruhga tegishli, har guruhda kamida bitta qator
    for (const r of OBJ) expect(OBJ_GROUPS.some(([g]) => g === r.g)).toBe(true);
    for (const [g] of OBJ_GROUPS) expect(OBJ.some(r => r.g === g)).toBe(true);
  });
  it('4-ilova: quvvat ustuni; kiritilmagan — eng kattasi (TALQIN)', () => {
    expect(objZone({ obj: 'oqova_mb', objq: 1 })).toMatchObject({ m: 150, flag: 'NORMA' });
    expect(objZone({ obj: 'oqova_mb', objq: 4 }).m).toBe(500);
    expect(objZone({ obj: 'oqova_mb' })).toMatchObject({ m: 500, flag: 'TALQIN' });
    expect(objZone({ obj: 'oqova_nasos', objq: 2 }).m).toBe(20);
    expect(objZone({ obj: 'oqova_filtr', objq: 4 })).toMatchObject({ m: 500, flag: 'TALQIN' });   // jadvalda yoʻq ustun
  });
  it('ShNQ masofalari: TP 10 m (turar joy va jamoat), GTP 10 / 15 m (barcha binolar) — SMZ emas', () => {
    expect(objZone({ obj: 'tp_257' })).toMatchObject({ m: 10, nosmz: true });
    expect(objZone({ obj: 'tp_257' }).deny).toContain('turar');
    expect(objZone({ obj: 'gtp_06' })).toMatchObject({ m: 10, deny: 'all' });
    expect(objZone({ obj: 'gtp_12' }).m).toBe(15);
  });
  it('turi kiritilmagan — 4-sinf 100 m (TAXMIN); OSM taxmini — TALQIN; qoʻlda bufer', () => {
    expect(objZone({})).toMatchObject({ m: 100, flag: 'TAXMIN' });
    expect(objZone({ obj: 'yoqilgi_414', objGuess: true })).toMatchObject({ m: 100, flag: 'TALQIN', guess: true });
    const l = { id: 'x', kind: 'obyekt', status: 'saqlanadi', src: 'qolda', obj: 'agzs_494', szz: 30 } as Limit;
    expect(szzOf(l, 0.1)).toMatchObject({ m: 30, table: 50 });
  });
  it('fayldan oʻqish: obj, objq, objGuess saqlanadi; nomaʼlum kalit tashlanadi', () => {
    const r = [[0, 0], [1, 0], [1, 1]];
    expect(cleanLimit({ id: 'a', kind: 'obyekt', rings: [r], obj: 'oqova_mb', objq: 3, objGuess: true })).toMatchObject({ obj: 'oqova_mb', objq: 3, objGuess: true });
    expect(cleanLimit({ id: 'a', kind: 'obyekt', rings: [r], obj: 'yoq' })!.obj).toBeUndefined();
  });
});

describe('OSM teglari → qator', () => {
  it('yoqilgʻi quyish: fuel:* teglari', () => {
    expect(objOf({ amenity: 'fuel', 'fuel:octane_92': 'yes', 'fuel:cng': 'yes' })).toEqual({ key: 'yoqilgi_414', guess: false });
    expect(objOf({ amenity: 'fuel', 'fuel:lpg': 'yes' })).toEqual({ key: 'agzs_494', guess: false });
    expect(objOf({ amenity: 'fuel', 'fuel:cng': 'yes' })).toEqual({ key: 'yoqilgi_414', guess: true });     // 492 sharti nomaʼlum
    expect(objOf({ amenity: 'fuel', name: 'AGNKS «Metan»' })).toEqual({ key: 'yoqilgi_414', guess: true });
    expect(objOf({ amenity: 'fuel', name: 'АГЗС' })).toEqual({ key: 'agzs_494', guess: false });
    expect(objOf({ amenity: 'fuel', 'fuel:diesel': 'yes' })).toEqual({ key: 'yoqilgi_414', guess: true });  // 491 sharti nomaʼlum
    expect(objOf({ amenity: 'fuel', 'fuel:lng': 'yes' })).toEqual({ key: 'kriogen_422', guess: true });
    expect(objOf({ amenity: 'fuel' })).toEqual({ key: 'yoqilgi_414', guess: true });
  });
  it('podstansiya, GTP, oqova, boshqalar', () => {
    expect(objOf({ power: 'substation', voltage: '10000' })).toEqual({ key: 'tp_257', guess: false });
    expect(objOf({ power: 'substation', substation: 'minor_distribution' })).toEqual({ key: 'tp_257', guess: false });
    expect(objOf({ power: 'substation' })).toEqual({ key: 'tp_257', guess: true });
    expect(objOf({ power: 'substation', voltage: '110000' })).toBeNull();
    expect(objOf({ pipeline: 'substation', substance: 'gas' })).toEqual({ key: 'gtp_12', guess: true });
    expect(objOf({ man_made: 'wastewater_plant' })!.key).toBe('oqova_mb');
    expect(objOf({ man_made: 'pumping_station', pumping_station: 'sewage' })!.key).toBe('oqova_nasos');
    expect(objOf({ man_made: 'pumping_station', substance: 'water' })).toBeNull();
    expect(objOf({ amenity: 'bus_station' })).toEqual({ key: 'avtovokzal_308', guess: false });
    expect(objOf({ amenity: 'marketplace' })).toEqual({ key: 'bozor_488', guess: false });
    expect(objOf({ amenity: 'fire_station' })!.key).toBe('otochirish_485');
    expect(objOf({ shop: 'car_repair' })!.key).toBe('avtoservis_423');
    expect(objOf({ amenity: 'cafe' })).toBeNull();
    for (const k of Object.values({ a: objOf({ amenity: 'car_wash' }), b: objOf({ leisure: 'stadium' }), c: objOf({ landuse: 'landfill' }) })) expect(OBJ_BY[k!.key]).toBeTruthy();
  });
  it('soʻrov va tahlil: nuqta obyekt — 10 m doira; radius — obyekt zonasi; ELU tayanchlari faqat power teglari', () => {
    const q = limitsQuery(site);
    for (const k of ['fuel|bus_station', 'power"="substation', 'pipeline"="substation', 'wastewater_plant|pumping_station', 'car_repair', 'landfill|depot', 'slaughterhouse', 'stadium']) expect(q).toContain(k);
    const j = { elements: [
      { type: 'node', id: 1, tags: { amenity: 'fuel', 'fuel:lpg': 'yes', name: 'Propan' }, ...G(240, 0) },            // 50 m ichida
      { type: 'node', id: 2, tags: { amenity: 'fuel', 'fuel:lpg': 'yes' }, ...G(300, 0) },                              // 100 m — 50 m dan uzoq
      { type: 'node', id: 3, tags: { amenity: 'fuel' }, ...G(290, 0) },                                                 // taxmin 414 — 100 m ichida
      { type: 'way', id: 4, tags: { amenity: 'bus_station' }, geometry: [G(400, -20), G(440, -20), G(440, 20), G(400, 20), G(400, -20)] },
      { type: 'way', id: 5, tags: { power: 'line', voltage: '10000' }, geometry: [G(-300, 0), G(300, 0)] },
    ] } as never;
    const ls = parseLimitsOsm(j, site), by = (id: number) => ls.find(l => l.osm === id);
    expect(by(1)).toMatchObject({ kind: 'obyekt', obj: 'agzs_494', name: 'Propan' }); expect(by(1)!.rings![0]).toHaveLength(12);
    expect(by(2)).toBeUndefined();
    expect(by(3)).toMatchObject({ kind: 'obyekt', obj: 'yoqilgi_414', objGuess: true });
    expect(by(4)).toMatchObject({ kind: 'obyekt', obj: 'avtovokzal_308' });
    expect(by(5)!.poles).toBeUndefined();   // yoqilgʻi tugunlari tayanch emas
  });
});

describe('Tekshiruv: SMZ obyekti va masofalar', () => {
  it('AGZS (5-sinf, 50 m) ichidagi turar joy — mos emas; OSM taxmini — koʻrib chiqish', () => {
    const lim = (o: Partial<Limit>) => ({ id: 'o1', kind: 'obyekt', status: 'saqlanadi', src: 'qolda', rings: [sq(-10, -10, 10, 10) as any], ...o } as Limit);
    const d1 = mk([lim({ obj: 'agzs_494' })], [{ r: sq(30, -10, 50, 10), use: 'turar' }]);
    expect(limitChecks(d1).szz[0]).toMatchObject({ verdict: 'deny', m: 50 });
    expect(rule('szz-217', d1).status).toBe('fail');
    const d2 = mk([lim({ obj: 'yoqilgi_414', objGuess: true })], [{ r: sq(30, -10, 50, 10), use: 'turar' }]);
    expect(limitChecks(d2).szz[0]).toMatchObject({ verdict: 'review', guess: true });
    const r2 = rule('szz-217', d2); expect(r2.status).toBe('review'); expect(r2.note).toContain('OSM teglaridan taxmin');
  });
  it('TP (257-band): 10 m ichida turar joy — taqiq, ombor — ruxsat; kvartal hududi tekshirilmaydi', () => {
    const tp = { id: 't1', kind: 'obyekt', status: 'saqlanadi', src: 'qolda', obj: 'tp_257', rings: [sq(-3, -3, 3, 3) as any] } as Limit;
    const d = mk([tp], [{ r: sq(8, -5, 20, 5), use: 'turar' }, { r: sq(-20, -5, -8, 5), use: 'logistika' }]);
    const c = limitChecks(d);
    expect(c.szz.find(x => x.bid === 'b0')!.verdict).toBe('deny');
    expect(c.szz.find(x => x.bid === 'b1')!.verdict).toBe('allow');
    expect(c.szzBlocks).toHaveLength(0);
    expect(rule('szz-217', d).note).toContain('257-band');
  });
});
