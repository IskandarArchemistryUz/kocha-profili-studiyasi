import { describe, it, expect } from 'vitest';
import { joinNode, type OsmEl } from '../../src/kochasoz/node';

// Sharq–gʻarb yoʻnalishidagi OSM yoʻl (tertiary) va unga janubdan tutashgan loyiha koʻchasi
const lat = 41.37, lon = 69.29, dLon = 1 / (111_320 * Math.cos(lat * Math.PI / 180)), dLat = 1 / 110_540;
const P = (x: number, y: number): [number, number] => [lon + x * dLon, lat + y * dLat];
const els: OsmEl[] = [
  { type: 'node', id: 1, lon: P(-100, 0)[0], lat: P(-100, 0)[1] }, { type: 'node', id: 2, lon: P(100, 0)[0], lat: P(100, 0)[1] },
  { type: 'way', id: 10, nodes: [1, 2], tags: { highway: 'tertiary', name: 'Ahmad Donish koʻchasi', lanes: '4' } },
  { type: 'way', id: 11, nodes: [1, 2], tags: { highway: 'footway' } },
];

describe('joinNode — loyiha koʻchasi uchi OSM yoʻliga tutashuvi (18.11)', () => {
  it('T-chorraha: asosiy — OSM yoʻli, kesishuvchi loyiha koʻchasi 90°, qarshi tarmoq yoʻq', () => {
    const r = joinNode(els, P(5, -12), P(5, -120))!;
    expect(r).toBeTruthy();
    expect(r.dist).toBeGreaterThan(10); expect(r.dist).toBeLessThan(14);
    expect(r.main[0].name).toBe('Ahmad Donish koʻchasi'); expect(r.main[1]).toBeTruthy();
    expect(Math.abs(r.ang - 90)).toBeLessThanOrEqual(2);
    expect(['N', 'S']).toContain(r.miss);
  });
  it('uzoq (> 45 m) boʻlsa — null; piyoda yoʻlagi hisobga olinmaydi', () => {
    expect(joinNode(els, P(5, -60), P(5, -160))).toBeNull();
    expect(joinNode([els[0], els[1], els[3]], P(5, -12), P(5, -120))).toBeNull();
  });
});
