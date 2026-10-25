import { describe, it, expect } from 'vitest';
import { ovTiles, fetchOverture, mergeOverture, type OvResult } from '../../src/context/overture';
import { heightByArea, type OsmData } from '../../src/context/osm';
import type { LngLat } from '../../src/core/doc';

const sq = (x: number, y: number, d = 0.0002): LngLat[] => [[x, y], [x + d, y], [x + d, y + d], [x, y + d]];
const osm = (): OsmData => ({ buildings: [
  { id: 1, rings: [sq(69.270, 41.310)], h: 6, hSrc: 'taxmin', kind: 'yes' },
  { id: 2, rings: [sq(69.272, 41.310)], h: 30, hSrc: 'height', kind: 'apartments' },
], roads: [], rails: [], water: [], waterways: [], green: [], trees: [] });

describe('Overture: OSM ni toʻldirish', () => {
  it('boʻlaklar: ≤ 0,05° li toʻr; juda katta hudud — null', () => {
    expect(ovTiles([41.30, 69.27, 41.32, 69.29])).toHaveLength(1);
    expect(ovTiles([41.25, 69.20, 41.35, 69.30])).toHaveLength(4);
    expect(ovTiles([41.0, 69.0, 41.5, 69.5])).toBeNull();
  });
  it('taxminiy balandlik aniqlashtiriladi, OSM balandligi oʻzgarmaydi, yangi bino qoʻshiladi, mayda shovqin — yoʻq', () => {
    const d = osm();
    const ov: OvResult = { release: '2026-10-21.0', buildings: [
      { rings: [sq(69.27005, 41.31005, 0.0001)], h: 18.4, f: null },   // 1-bino ichida → balandlik
      { rings: [sq(69.27205, 41.31005, 0.0001)], h: 50, f: null },     // 2-bino (OSM height) → oʻzgarmaydi
      { rings: [sq(69.274, 41.310)], h: null, f: 4 },                   // OSM da yoʻq → qoʻshiladi, 4 × 3,2
      { rings: [sq(69.276, 41.310)], h: null, f: null },                // OSM da yoʻq, balandlik nomaʼlum → taxmin
      { rings: [sq(69.278, 41.310, 0.00002)], h: null, f: null },       // ~4 m² — shovqin
    ] };
    const m = mergeOverture(d, ov, heightByArea);
    expect(m).toEqual({ added: 2, heights: 1, release: '2026-10-21.0' });
    expect(d.buildings[0]).toMatchObject({ h: 18.4, hSrc: 'overture' });
    expect(d.buildings[1]).toMatchObject({ h: 30, hSrc: 'height' });
    expect(d.buildings[2]).toMatchObject({ h: 12.8, hSrc: 'overture', kind: 'yes' });
    expect(d.buildings[3].hSrc).toBe('taxmin'); expect(d.buildings[3].id).toBeLessThan(0);
  });
  it('server: boʻlaklar birlashtiriladi, takror olib tashlanadi; xato — null (OSM oʻzi qoladi)', async () => {
    const urls: string[] = [];
    const f = (async (u: string) => { urls.push(u); return new Response(JSON.stringify({ release: 'R', buildings: [{ rings: [sq(69.274, 41.31)], h: 9, f: null }] }), { status: 200 }); }) as unknown as typeof fetch;
    const r = await fetchOverture([41.25, 69.20, 41.35, 69.30], f, 'https://api.test');
    expect(urls).toHaveLength(4); expect(urls[0]).toMatch(/^https:\/\/api\.test\/data\/overture\/buildings\?bbox=/);
    expect(r?.buildings).toHaveLength(1); expect(r?.release).toBe('R');
    expect(await fetchOverture([41.30, 69.27, 41.32, 69.29], (async () => new Response('', { status: 502 })) as unknown as typeof fetch, 'https://api.test')).toBeNull();
  });
});
