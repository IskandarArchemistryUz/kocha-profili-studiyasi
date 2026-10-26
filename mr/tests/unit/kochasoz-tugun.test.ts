import { describe, it, expect } from 'vitest';
import { parseLatLon, findNode, tplFromArm, nodeQuery, type OsmEl } from '../../src/kochasoz/node';

/* Sunʼiy OSM: markaz (69.28, 41.31), 1e-4° ≈ 8–11 m */
const C = [69.28, 41.31];
const nd = (id: number, dx: number, dy: number): OsmEl => ({ type: 'node', id, lon: C[0] + dx * 1e-4, lat: C[1] + dy * 1e-4 });
const way = (id: number, nodes: number[], tags: Record<string, string>): OsmEl => ({ type: 'way', id, nodes, tags });
const pts = [nd(1, 0, 0), nd(2, -6, 0), nd(3, 6, 0), nd(4, 0, 6), nd(5, 0, -6), nd(6, -12, 0), nd(7, 12, 0)];

describe('Koʻchasoz C1: haqiqiy tugun (OSM)', () => {
  it('koordinata va havolalar: «lat, lon», Yandex ll, OSM, Google', () => {
    expect(parseLatLon('41.311, 69.279')).toEqual([69.279, 41.311]);
    expect(parseLatLon('41,311; 69,279')).toEqual([69.279, 41.311]);
    expect(parseLatLon('https://yandex.uz/maps/?ll=69.279%2C41.311&z=17')).toEqual([69.279, 41.311]);
    expect(parseLatLon('https://www.openstreetmap.org/#map=18/41.311/69.279')).toEqual([69.279, 41.311]);
    expect(parseLatLon('https://www.google.com/maps/@41.311,69.279,17z')).toEqual([69.279, 41.311]);
    expect(parseLatLon('salom')).toBeNull();
    expect(nodeQuery([69.28, 41.31])).toMatch(/around:80,41\.310000,69\.280000/);
  });
  it('X-chorraha: asosiy — yuqori toifa (primary, 4 boʻlak), kesishuvchi — mahalliy; burchak ≈ 90°', () => {
    const els = [...pts, way(10, [6, 2, 1, 3, 7], { highway: 'primary', lanes: '4', maxspeed: '60', name: 'Amir Temur' }), way(11, [4, 1, 5], { highway: 'residential', name: 'Mahalla' })];
    const r = findNode(els, [C[0] + 2e-5, C[1]])!;
    expect(r).toBeTruthy(); expect(r.arms).toHaveLength(4); expect(r.tee).toBe(false);
    expect(r.main[0].cls).toBe('primary'); expect(r.cross[0].cls).toBe('residential');
    expect(Math.abs(r.ang - 90)).toBeLessThan(3);
    const A = tplFromArm(r.main[0], r.main[1]);
    expect(A.tpl[0]).toBe('OSM · Amir Temur'); expect(A.tpl[3]).toBe('sh2'); expect(A.v).toBe(60);
    expect(A.tpl[2].filter(e => e[0] === 'qat')).toHaveLength(4);
    expect(A.src.join(' ')).toMatch(/boʻlaklar — OSM/);
    const B = tplFromArm(r.cross[0], r.cross[1]);
    expect(B.tpl[3]).toBe('mh'); expect(B.v).toBe(40); expect(B.src.join(' ')).toMatch(/andoza/);
  });
  it('T-chorraha va qiya burchak: ogohlantirish; 60–120° dan tashqari — chegaraga keltiriladi', () => {
    const els = [...pts, nd(8, 6, 3), way(10, [6, 2, 1, 3, 7], { highway: 'secondary' }), way(12, [1, 8], { highway: 'tertiary' })];
    const r = findNode(els, C as [number, number])!;
    expect(r.tee).toBe(true); expect(r.notes.join(' ')).toMatch(/T-chorraha/);
    expect(r.ang).toBeGreaterThanOrEqual(60); expect(r.notes.join(' ')).toMatch(/burchagi/);
  });
  it('ikki bir tomonlama yoʻl (dual carriageway): boʻlaklar yigʻindisi va ajratuvchi; servis yoʻli chorraha emas', () => {
    const els = [...pts, way(20, [6, 2, 1], { highway: 'primary', oneway: 'yes', lanes: '3' }), way(21, [7, 3, 1], { highway: 'primary', oneway: 'yes', lanes: '3' }), way(22, [4, 1, 5], { highway: 'tertiary' })];
    const r = findNode(els, C as [number, number])!;
    const A = tplFromArm(r.main[0], r.main[1]);
    expect(A.tpl[2].filter(e => e[0] === 'qat')).toHaveLength(6);
    expect(A.tpl[2].some(e => e[0] === 'med')).toBe(true);
    expect(findNode([...pts, way(30, [6, 2, 1, 3, 7], { highway: 'residential' }), way(31, [4, 1, 5], { highway: 'service' })], C as [number, number])).toBeNull();
  });
});
