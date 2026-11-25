import { describe, it, expect } from 'vitest';
import { buildMrDoc, profileStrips, osmPreset, innerEnds, outerEnds, weld } from '../../src/kochasoz/totarmoq';
import { joinNode, nodesQuery, type OsmEl } from '../../src/kochasoz/node';
import type { Profile } from '../../src/core/profiles';

const prof = { id: 'p15', name: 'Mahalla koʻchasi', cat: 'mahalliy', parts: [{ k: 'trotuar', w: 2.25 }, { k: 'yashil', w: 2 }, { k: 'qatnov', w: 6.5, lanes: 2 }, { k: 'yashil', w: 2 }, { k: 'trotuar', w: 2.25 }] } as unknown as Profile;
// OSM: sharq–gʻarb yoʻli (lat 41.3110), loyiha koʻchasi janubdan kelib 6 m yetmay tugaydi
const lat0 = 41.3110, lon0 = 69.2797, dLon = 1 / (111320 * Math.cos(lat0 * Math.PI / 180)), dLat = 1 / 110574;
const els: OsmEl[] = [
  { type: 'node', id: 1, lat: lat0, lon: lon0 - 150 * dLon }, { type: 'node', id: 2, lat: lat0, lon: lon0 }, { type: 'node', id: 3, lat: lat0, lon: lon0 + 150 * dLon },
  { type: 'way', id: 77, nodes: [1, 2, 3], tags: { highway: 'tertiary', lanes: '2', name: 'Test yoʻli' } },
];
describe('Koʻchasoz → Tarmoq: loyiha koʻchalari va OSM tutashuvi (19.11)', () => {
  it('profil → kesim: boʻlaklar boʻlinadi, yoʻnalish chap/oʻng', () => {
    const st = profileStrips(prof);
    expect(st.map(x => x[0])).toEqual(['walk', 'green', 'lane', 'lane', 'green', 'walk']);
    expect(st.filter(x => x[0] === 'lane').map(x => x[2])).toEqual([-1, 1]);
    expect(st.reduce((a, x) => a + x[1], 0)).toBeCloseTo(15, 5);
  });
  it('OSM andozasi', () => { expect(osmPreset({ highway: 'living_street', oneway: 'yes' })).toBe('one1'); expect(osmPreset({ highway: 'primary' })).toBe('r4'); expect(osmPreset({ highway: 'residential' })).toBe('res1'); expect(osmPreset({ highway: 'living_street' })).toBe('res1'); });
  it('uch OSM yoʻl oʻqiga koʻchadi, yoʻl ikki tarmoqqa boʻlinadi — T-chorraha', () => {
    const axis: [number, number][] = [[lon0, lat0 - 120 * dLat], [lon0 + 10 * dLon, lat0 - 60 * dLat], [lon0, lat0 - 6 * dLat]];
    const M = buildMrDoc('p_test', 'Test', [{ id: 's1', axis, profile: prof, name: 'Koʻcha 1' }], e => (Math.abs(e[1] - lat0) < 20 * dLat ? els : null), (a, e, i) => joinNode(a, e, i));
    expect(M.edges.filter(e => e.osm).length).toBe(2);
    const proj = M.edges.find(e => e.id === 's_s1')!;
    expect(proj.preset).toBe('custom'); expect(proj.pts!.length).toBe(1);
    const c = M.nodes.find(n => n.id === proj.b)!;
    expect(Math.abs(c.ll[1] - lat0)).toBeLessThan(1e-6);   // uch yoʻl oʻqida
    const deg = M.edges.filter(e => e.a === c.id || e.b === c.id).length; expect(deg).toBe(3);
  });
});

describe('Master reja → Tarmoq: koʻp koʻchali loyiha (22.11)', () => {
  // + shaklidagi ikki koʻcha va L shaklidagi tutashuv: ichki uchlar OSM ga ulanmaydi
  const P = (x: number, y: number): [number, number] => [lon0 + x * dLon, lat0 + y * dLat];
  const s1 = { id: 'a', axis: [P(0, -200), P(0, -100)] }, s2 = { id: 'b', axis: [P(0, -100), P(120, -100)] }, s3 = { id: 'c', axis: [P(60, -160), P(60, -101)] };
  it('ichki uchlar: tutashgan uchlar va boshqa koʻcha oʻrtasiga tushgan uch', () => {
    const inn = innerEnds([s1, s2, s3]);
    expect(inn.has(P(0, -100).join(','))).toBe(true);          // a ↔ b uchi
    expect(inn.has(P(60, -101).join(','))).toBe(true);         // c — b ning oʻrtasiga (1 m)
    expect(inn.has(P(0, -200).join(','))).toBe(false);
    expect(outerEnds([s1, s2, s3]).length).toBe(3);            // a boshi, b oxiri, c boshi
  });
  it('bitta soʻrov: barcha uchlar bir Overpass soʻrovida', () => {
    const q = nodesQuery(outerEnds([s1, s2, s3]), 50);
    expect(q.match(/way\(around:50,/g)!.length).toBe(3);
    expect(q.startsWith('[out:json]')).toBe(true);
  });
});

describe('Master reja → Tarmoq: koʻchalar bir-biriga ulanadi (25.11)', () => {
  const P = (x: number, y: number): [number, number] => [lon0 + x * dLon, lat0 + y * dLat];
  const deg = (M: { edges: { a: string; b: string }[] }, id: string) => M.edges.filter(e => e.a === id || e.b === id).length;
  const at = (M: { nodes: { id: string; ll: [number, number] }[] }, p: [number, number]) => M.nodes.find(n => Math.hypot((n.ll[0] - p[0]) / dLon, (n.ll[1] - p[1]) / dLat) < 2.5);
  const none = () => null, nj = () => null;
  it('T-tutashuv: boshqa koʻcha oʻrtasiga tushgan uch — tugun, koʻcha ikkiga boʻlinadi', () => {
    const M = buildMrDoc('p', 'T', [
      { id: 'b', axis: [P(0, -100), P(120, -100)], profile: prof, name: 'B' },
      { id: 'c', axis: [P(60, -160), P(60, -101)], profile: prof, name: 'C' }], none, nj);
    expect(M.edges.map(e => e.id).sort()).toEqual(['s_b', 's_b~1', 's_c']);
    const n = at(M, P(60, -100))!; expect(n).toBeTruthy(); expect(deg(M, n.id)).toBe(3);
    expect(Math.abs(n.ll[1] - P(60, -100)[1]) / dLat).toBeLessThan(0.01);   // tugun B oʻqida — B toʻgʻri qoladi
  });
  it('kesishuv: ikki koʻcha bir-birini kesib oʻtsa — 4 tarmoqli chorraha', () => {
    const M = buildMrDoc('p', 'X', [
      { id: 'h', axis: [P(-100, 0), P(100, 0)], profile: prof, name: 'H' },
      { id: 'v', axis: [P(0, -80), P(5, -20), P(0, 90)], profile: prof, name: 'V' }], none, nj);
    expect(M.edges.length).toBe(4);
    const n = at(M, P(1.7, 0))!; expect(deg(M, n.id)).toBe(4);
    expect(M.edges.find(e => e.id === 's_v')!.pts!.length).toBe(1);   // siniq nuqta saqlanadi
    expect(M.edges.every(e => e.st && e.preset === 'custom')).toBe(true);
  });
  it('bir nechta chorraha: panjara 2 × 2 — 4 tugun 4 tarmoqli', () => {
    const M = buildMrDoc('p', 'G', [
      { id: 'h1', axis: [P(-50, 0), P(150, 0)], profile: prof, name: '' }, { id: 'h2', axis: [P(-50, 100), P(150, 100)], profile: prof, name: '' },
      { id: 'v1', axis: [P(0, -50), P(0, 150)], profile: prof, name: '' }, { id: 'v2', axis: [P(100, -50), P(100, 150)], profile: prof, name: '' }], none, nj);
    expect(M.edges.length).toBe(12);
    expect(M.nodes.filter(n => deg(M, n.id) === 4).length).toBe(4);
  });
  it('bitta OSM yoʻliga ikki koʻcha: ikkalasi ham ulanadi, yoʻl uch boʻlakka boʻlinadi', () => {
    const M = buildMrDoc('p', 'O', [
      { id: 'a', axis: [P(-40, -120), P(-40, -6)], profile: prof, name: 'A' },
      { id: 'b', axis: [P(50, -120), P(50, -6)], profile: prof, name: 'B' }], e => (Math.abs(e[1] - lat0) < 20 * dLat ? els : null), (a, e, i) => joinNode(a, e, i));
    expect(M.edges.filter(e => e.osm).length).toBe(3);
    expect(deg(M, at(M, P(-40, 0))!.id)).toBe(3); expect(deg(M, at(M, P(50, 0))!.id)).toBe(3);
  });
  it('deyarli parallel va koʻprik: ulanmaydi', () => {
    const a = { id: 'o1', line: [P(-100, 0), P(100, 0)], preset: 'r2', osm: true as const }, b = { id: 'o2', line: [P(0, -100), P(0, 100)], preset: 'r2', osm: true as const };
    expect(weld([a, b]).edges.length).toBe(2);                 // OSM da umumiy tugun yoʻq — estakada
    expect(weld([a, b], [P(0, 0)]).edges.length).toBe(4);      // umumiy tugun bor — chorraha
    expect(weld([{ id: 's1', line: [P(-100, -2), P(100, 6)], preset: 'custom' }, { id: 's2', line: [P(-100, 1), P(100, 1)], preset: 'custom' }]).edges.length).toBe(2);
  });
  it('tugun id si koordinatadan: koʻcha qoʻshilsa ham avvalgi tugunlar id si oʻzgarmaydi', () => {
    const s1 = { id: 'h', axis: [P(-100, 0), P(100, 0)], profile: prof, name: '' }, s2 = { id: 'v', axis: [P(0, -80), P(0, 90)], profile: prof, name: '' };
    const A = buildMrDoc('p', '', [s1], none, nj), B = buildMrDoc('p', '', [s2, s1], none, nj);
    for (const n of A.nodes) expect(B.nodes.some(m => m.id === n.id)).toBe(true);
  });
  it('koʻcha boshqa koʻchaning CHETIgacha chizilgan (oʻqdan 6 m): baribir ulanadi, oʻz yoʻnalishida oʻqqa yetkaziladi', () => {
    // prof eni 15 m → yarim eni 7,5: uch oʻqdan 6 m narida, qiya (45°) keladi
    const M = buildMrDoc('p', 'E', [
      { id: 'b', axis: [P(-100, 0), P(120, 0)], profile: prof, name: 'B' },
      { id: 'c', axis: [P(-40, -60), P(14, -6)], profile: prof, name: 'C' }], none, nj);
    const n = at(M, P(20, 0))!; expect(n).toBeTruthy(); expect(deg(M, n.id)).toBe(3);   // (14,−6) dan 45° boʻylab → (20, 0)
    expect(M.edges.length).toBe(3);
  });
  it('oʻqdan oshib ketgan uch (4 m): ortiqchasi kesiladi — soxta 4-tarmoq va «dum» yoʻq', () => {
    const M = buildMrDoc('p', 'O', [
      { id: 'b', axis: [P(-100, 0), P(120, 0)], profile: prof, name: 'B' },
      { id: 'c', axis: [P(30, -80), P(30, 4)], profile: prof, name: 'C' }], none, nj);
    expect(M.edges.length).toBe(3); expect(deg(M, at(M, P(30, 0))!.id)).toBe(3);
  });
  it('burchak: ikki koʻcha uchi bir-birining koridorida (5 m oraliq) — bitta tugun, dumsiz', () => {
    const M = buildMrDoc('p', 'L', [
      { id: 'a', axis: [P(0, -100), P(0, -5)], profile: prof, name: 'A' },
      { id: 'b', axis: [P(4, 0), P(120, 0)], profile: prof, name: 'B' }], none, nj);
    expect(M.edges.length).toBe(2); expect(M.nodes.length).toBe(3);
    expect(M.nodes.filter(n => deg(M, n.id) === 2).length).toBe(1);
  });
  it('ichki uch: koridor ichidagi uch OSM ga ulanmaydi', () => {
    const inn = innerEnds([{ id: 'b', axis: [P(-100, 0), P(120, 0)], half: 7.5 }, { id: 'c', axis: [P(30, -80), P(30, -6)], half: 7.5 }]);
    expect(inn.has(P(30, -6).join(','))).toBe(true); expect(inn.size).toBe(1);
    expect(innerEnds([{ id: 'b', axis: [P(-100, 0), P(120, 0)] }, { id: 'c', axis: [P(30, -80), P(30, -6)] }]).size).toBe(0);   // eni nomaʼlum — 3 m
  });
  it('zanjir: uchi surilgan koʻchaga tutashgan boshqa koʻcha ham oʻz joyida ulanadi', () => {
    // a ning boshi b koridorida (oʻqqa 6 m yetmagan) → b oʻqigacha uzayadi; c esa a ning oʻrtasiga tutashgan
    const M = buildMrDoc('p', 'Z', [
      { id: 'c', axis: [P(-80, 60), P(-1, 60)], profile: prof, name: 'C' },
      { id: 'a', axis: [P(0, 6), P(0, 150)], profile: prof, name: 'A' },
      { id: 'b', axis: [P(-100, 0), P(120, 0)], profile: prof, name: 'B' }], none, nj);
    expect(deg(M, at(M, P(0, 0))!.id)).toBe(3);
    expect(deg(M, at(M, P(0, 60))!.id)).toBe(3);
    expect(M.edges.length).toBe(5);
  });
});
