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
