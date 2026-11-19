import { describe, it, expect } from 'vitest';
import { buildMrDoc, profileStrips, osmPreset } from '../../src/kochasoz/totarmoq';
import { joinNode, type OsmEl } from '../../src/kochasoz/node';
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
