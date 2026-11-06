import { describe, it, expect } from 'vitest';
import { kvOf, parseLimitsOsm, newOnes, limitsQuery } from '../../src/context/limitsosm';
import { frame, type XY } from '../../src/core/geo';
import type { LngLat } from '../../src/core/doc';
import type { Limit } from '../../src/core/limits';

const O: LngLat = [69.25, 41.27], fr = frame(O);
const G = (x: number, y: number) => { const g = fr.toGeo([x, y] as XY); return { lon: g[0], lat: g[1] }; };
const sqG = (x0: number, y0: number, x1: number, y1: number) => [G(x0, y0), G(x1, y0), G(x1, y1), G(x0, y1), G(x0, y0)];
const site: LngLat[] = [[-200, -200], [200, -200], [200, 200], [-200, 200]].map(p => fr.toGeo(p as XY));

describe('OSM dan cheklovlar (4-bosqich)', () => {
  it('kuchlanish tegi → kV', () => {
    expect(kvOf('110000')).toBe(110); expect(kvOf('10000;400')).toBe(10); expect(kvOf('400')).toBe(0.4); expect(kvOf('35')).toBe(35); expect(kvOf(undefined)).toBeUndefined(); expect(kvOf('abc')).toBeUndefined();
  });
  it('soʻrov: qabriston, issiqxona, ombor, temir yoʻl, ELU va tayanchlar, bogʻ/ekin', () => {
    const q = limitsQuery(site);
    for (const k of ['cemetery', 'grave_yard', 'greenhouse_horticulture', 'warehouse', 'railway"="rail', 'line|minor_line|cable', 'tower|pole', 'orchard|vineyard|farmland']) expect(q).toContain(k);
  });
  it('tahlil: masofa boʻyicha saralash, ELU tayanchlari, kabel, bogʻ — buziladi', () => {
    const j = { elements: [
      { type: 'way', id: 1, tags: { landuse: 'cemetery', name: 'Eski qabriston' }, geometry: sqG(-50, -50, 50, 50) },
      { type: 'way', id: 2, tags: { landuse: 'cemetery' }, geometry: sqG(600, 600, 700, 700) },            // 500 m dan uzoq — yoʻq
      { type: 'way', id: 3, tags: { power: 'line', voltage: '110000' }, geometry: [G(-400, 100), G(0, 100), G(400, 100)] },
      { type: 'node', id: 30, tags: { power: 'tower' }, lat: G(0, 102).lat, lon: G(0, 102).lon },
      { type: 'node', id: 31, tags: { power: 'tower' }, lat: G(0, 300).lat, lon: G(0, 300).lon },        // liniyadan uzoq
      { type: 'way', id: 4, tags: { power: 'cable', voltage: '10000' }, geometry: [G(-100, -150), G(100, -150)] },
      { type: 'way', id: 5, tags: { landuse: 'orchard' }, geometry: sqG(100, 100, 180, 180) },
      { type: 'way', id: 6, tags: { landuse: 'farmland' }, geometry: sqG(300, 300, 400, 400) },           // uchastka bilan kesishmaydi — yoʻq
      { type: 'way', id: 7, tags: { building: 'greenhouse' }, geometry: sqG(250, -50, 280, 0) },           // 100 m ichida
      { type: 'way', id: 8, tags: { railway: 'rail' }, geometry: [G(-300, -260), G(300, -260)] },         // 60 m tashqarida — 110 m ichida
    ] } as never;
    const ls = parseLimitsOsm(j, site);
    const by = (id: number) => ls.find(l => l.osm === id);
    expect(by(1)).toMatchObject({ kind: 'qabriston', status: 'saqlanadi', src: 'osm', name: 'Eski qabriston' });
    expect(by(2)).toBeUndefined();
    expect(by(3)).toMatchObject({ kind: 'elu', kv: 110, elu: 'mavjud' }); expect(by(3)!.poles).toHaveLength(1);
    expect(by(4)).toMatchObject({ kind: 'elu', kv: 10, elu: 'kabel' });
    expect(by(5)).toMatchObject({ kind: 'boshqa', status: 'buziladi', name: 'Bogʻ' });
    expect(by(6)).toBeUndefined();
    expect(by(7)).toMatchObject({ kind: 'issiqxona' });
    expect(by(8)?.kind).toBe('temiryol'); expect(by(8)!.rings![0].length).toBe(4);
  });
  it('takrorlanmaydi: bor OSM id va bir xil turdagi qoʻlda chizilgan obyekt ichidagilar', () => {
    const f: Limit[] = [
      { id: 'a', kind: 'qabriston', status: 'saqlanadi', src: 'osm', osm: 1, rings: [[[-50, -50], [50, -50], [50, 50], [-50, 50]].map(p => fr.toGeo(p as XY))] },
      { id: 'b', kind: 'qabriston', status: 'saqlanadi', src: 'osm', osm: 9, rings: [[[100, 100], [120, 100], [120, 120], [100, 120]].map(p => fr.toGeo(p as XY))] },
      { id: 'c', kind: 'issiqxona', status: 'saqlanadi', src: 'osm', osm: 10, rings: [[[-150, -150], [-140, -150], [-140, -140], [-150, -140]].map(p => fr.toGeo(p as XY))] },
    ];
    const have: Limit[] = [{ id: 'q', kind: 'qabriston', status: 'saqlanadi', src: 'qolda', rings: [[[90, 90], [130, 90], [130, 130], [90, 130]].map(p => fr.toGeo(p as XY))] }, { id: 'x', kind: 'qabriston', status: 'saqlanadi', src: 'osm', osm: 1 } as Limit];
    expect(newOnes(f, have, O).map(l => l.id)).toEqual(['c']);
  });
});

import { splitPath, splitByZones } from '../../src/core/parcels';
describe('parselni kesish (02.11)', () => {
  const sq: [number, number][] = [[0, 0], [100, 0], [100, 100], [0, 100]];
  const A = (rs: [number, number][][]) => { let a = 0; const r = rs[0]; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2; };
  it('siniq chiziq (L) — ikki qism, maydonlar yigʻindisi saqlanadi', () => {
    const parts = splitPath([sq], [[30, 120], [30, 40], [80, 40]]);
    expect(parts).toHaveLength(2);
    expect(parts.reduce((t, p) => t + A(p as never), 0)).toBeCloseTo(10000, -1);
    expect(Math.min(...parts.map(p => A(p as never)))).toBeCloseTo(70 * 60, -1);   // x > 30, y > 40 qismi (1 sm tasma ayirilgan)
  });
  it('ikki nuqta — eski toʻgʻri kesish', () => { expect(splitPath([sq], [[50, -10], [50, 110]])).toHaveLength(2); });
  it('zona boʻyicha', () => {
    const r = splitByZones([sq], [[[[60, -20], [140, -20], [140, 120], [60, 120]]]]);
    expect(r?.inside).toHaveLength(1); expect(r?.outside).toHaveLength(1);
    expect(splitByZones([sq], [[[[200, 200], [210, 200], [210, 210]]]])).toBeNull();
  });
});

/** 04.11 (Murad Buildings sinovi, 7-band): zavod ichki temir yoʻl shoxobchalari — «buziladi» taklifi */
describe('ichki temir yoʻl shoxobchasi', () => {
  it('uchastka ichida toʻliq va tashqi tarmoqqa ulanmagan izlar guruhi — buziladi; tashqi tarmoqqa ulangan — saqlanadi', () => {
    const j = { elements: [
      { type: 'way', id: 11, tags: { railway: 'rail' }, geometry: [G(-150, 0), G(0, 0)] },          // ichida
      { type: 'way', id: 12, tags: { railway: 'rail', service: 'spur' }, geometry: [G(0, 0), G(100, 50)] },   // 11 ga ulangan, ichida
      { type: 'way', id: 13, tags: { railway: 'rail' }, geometry: [G(-150, -150), G(-50, -150)] },   // ichida, lekin 14 ga ulangan
      { type: 'way', id: 14, tags: { railway: 'rail' }, geometry: [G(-50, -150), G(-50, -400)] },    // tashqariga chiqadi
    ] };
    const L = parseLimitsOsm(j as never, site), st = (id: number) => L.find(l => l.osm === id)?.status;
    expect(st(11)).toBe('buziladi'); expect(st(12)).toBe('buziladi');
    expect(st(13)).toBe('saqlanadi'); expect(st(14)).toBe('saqlanadi');
    expect(L.find(l => l.osm === 11)?.name).toContain('zavod bilan birga buziladi');
  });
});

/** 04.11 (Murad Buildings sinovi, 8-band): sanoat korxonasi — OSM dan aniqlanadi, SMZ sinf boʻyicha (SanQvaN 0350-17, 2.9) */
import { szzOf } from '../../src/core/limits';
describe('sanoat korxonasi', () => {
  it('soʻrovda landuse=industrial, building=industrial|manufacture, man_made=works; radius 1000 m', () => {
    const q = limitsQuery(site);
    for (const k of ['"landuse"="industrial"', 'industrial|manufacture', '"man_made"="works"']) expect(q).toContain(k);
  });
  it('uchastka yonidagi zavod — saqlanadi; uchastka ichidagisi — buziladi; 1000 m dan uzoq — yoʻq', () => {
    const j = { elements: [
      { type: 'way', id: 21, tags: { landuse: 'industrial' }, geometry: sqG(300, -100, 600, 100) },
      { type: 'way', id: 22, tags: { building: 'industrial' }, geometry: sqG(-50, -50, 50, 50) },
      { type: 'way', id: 23, tags: { man_made: 'works' }, geometry: sqG(1500, 1500, 1600, 1600) },
    ] };
    const L = parseLimitsOsm(j as never, site);
    expect(L.find(l => l.osm === 21)?.kind).toBe('sanoat'); expect(L.find(l => l.osm === 21)?.status).toBe('saqlanadi');
    expect(L.find(l => l.osm === 22)?.status).toBe('buziladi');
    expect(L.find(l => l.osm === 23)).toBeUndefined();
  });
  it('SMZ: I–V sinf 1000 / 500 / 300 / 100 / 50 m (NORMA); sinf yoʻq — IV, 100 m (TAXMIN)', () => {
    const base = { id: 's', kind: 'sanoat' as const, rings: [], status: 'saqlanadi' as const, src: 'osm' as const };
    expect([1, 2, 3, 4, 5].map(c => szzOf({ ...base, cls: c as 1 }, 1).m)).toEqual([1000, 500, 300, 100, 50]);
    expect(szzOf({ ...base, cls: 1 }, 1).flag).toBe('NORMA');
    const u = szzOf(base, 1); expect(u.m).toBe(100); expect(u.flag).toBe('TAXMIN');
  });
});

describe('04.11 (Murad sinovi, 8-band): Overpass javob bermasa — xarita qatlamidan zaxira', () => {
  it('bino turi, qabriston, suv, temir yoʻl; tegsiz katta binolar — soni', async () => {
    const { limitsFromContext } = await import('../../src/context/limitsosm');
    const R = (x0: number, y0: number, x1: number, y1: number) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(p => fr.toGeo(p as XY));
    const L = (pts: number[][]) => pts.map(p => fr.toGeo(p as XY));
    const r = limitsFromContext({
      buildings: [{ id: 1, rings: [R(260, -50, 360, 50)], kind: 'industrial' }, { id: 2, rings: [R(-260, -50, -230, -20)], kind: 'warehouse' }, { id: 3, rings: [R(400, 300, 480, 380)], kind: 'yes' }, { id: 4, rings: [R(0, 0, 10, 10)], kind: 'apartments' }],
      green: [{ id: 5, rings: [R(-150, 250, -50, 330)], kind: 'cemetery' }, { id: 6, rings: [R(0, 250, 50, 300)], kind: 'park' }],
      water: [{ id: 7, rings: [R(220, -300, 260, -250)], kind: 'pond' }],
      waterways: [{ id: 8, pts: L([[-500, 260], [500, 260]]), cls: 'river', name: 'Bozsuv' }],
      rails: [{ id: 9, pts: L([[-300, -260], [300, -260]]), cls: 'rail' }, { id: 10, pts: L([[-300, 0], [300, 0]]), cls: 'tram' }],
    }, site);
    const k = (id: number) => r.limits.find(l => l.osm === id)?.kind;
    // 06.11 (c63): 7 — uchastkadan tashqaridagi kichik hovuz (pond) — bezak suvi, olinmaydi
    expect([k(1), k(2), k(4), k(5), k(6), k(7), k(8), k(9), k(10)]).toEqual(['sanoat', 'ombor', undefined, 'qabriston', undefined, undefined, 'suv', 'temiryol', undefined]);
    expect(r.bigUnknown).toBe(1);
  });
});

describe('06.11 (c63): bezak suvi — fontan, hovuz, basseyn (suvni muhofaza zonasisiz)', () => {
  it('amenity=fountain, water=pond, < 0,5 ga tegsiz suv — bezak; katta yoki lake/reservoir — koʻl', async () => {
    const { isDecor } = await import('../../src/context/limitsosm');
    const loc = (w: number) => [[0, 0], [w, 0], [w, w], [0, w]] as XY[];
    expect(isDecor({ water: 'pond' }, loc(200))).toBe(true);
    expect(isDecor({}, loc(60))).toBe(true);
    expect(isDecor({}, loc(80))).toBe(false);
    expect(isDecor({ water: 'reservoir' }, loc(30))).toBe(false);
    const r = parseLimitsOsm({ elements: [
      { type: 'way', id: 1, tags: { amenity: 'fountain' }, geometry: sqG(-10, -10, 10, 10) },
      { type: 'way', id: 2, tags: { natural: 'water' }, geometry: sqG(50, 50, 100, 100) },
      { type: 'way', id: 3, tags: { natural: 'water', water: 'lake' }, geometry: sqG(-150, -150, -120, -120) },
      { type: 'way', id: 4, tags: { leisure: 'swimming_pool' }, geometry: sqG(400, 400, 420, 420) },
    ] } as any, site);
    const by = (id: number) => r.find(l => l.osm === id);
    expect(by(1)?.suv?.t).toBe('bezak'); expect(by(2)?.suv?.t).toBe('bezak'); expect(by(3)?.suv?.t).toBe('kol'); expect(by(4)).toBeUndefined();
    const { suvZones } = await import('../../src/core/limits');
    expect(suvZones(by(1)!).zone.m).toBe(0); expect(suvZones(by(1)!).shore.m).toBe(0);
    expect(limitsQuery(site)).toContain('"amenity"="fountain"');
  });
});
