import { describe, it, expect } from 'vitest';
import { distM, circleRing, walkMin, slopeGrid, terrainStats, dir8, countPoi, catQuery, CATS, parseComp, windSummary } from '../../src/joyshunos/analyze';
import type { TerrainGrid } from '../../src/context/tiles';

/** Sunʼiy relyef: sharqqa 2 % koʻtariladi (pasayish — gʻarbga) */
function grid(slopeX = 0.02, R = 200, step = 10): TerrainGrid {
  const n = Math.round(2 * R / step) + 1, h = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) h[j * n + i] = 450 + (-R + i * step) * slopeX;
  return { n, step, radius: R, h, center: [69.28, 41.31], min: 450 - R * slopeX, max: 450 + R * slopeX };
}

describe('Joyshunos · joy pasporti hisoblari', () => {
  it('masofa: 0,01° kenglik ≈ 1112 m', () => {
    expect(distM([69.28, 41.31], [69.28, 41.32])).toBeGreaterThan(1105);
    expect(distM([69.28, 41.31], [69.28, 41.32])).toBeLessThan(1118);
  });
  it('doira: yopiq va radius saqlanadi', () => {
    const r = circleRing([69.28, 41.31], 500, 32);
    expect(r[0]).toEqual(r[32]);
    for (const p of r) expect(Math.abs(distM([69.28, 41.31], p) - 500)).toBeLessThan(3);
  });
  it('piyoda vaqti: 500 m ≈ 6 daqiqa', () => expect(walkMin(500)).toBe(6));
  it('nishab: 2 % qiyalik toʻgʻri topiladi, pasayish gʻarbga', () => {
    const g = grid(0.02), sl = slopeGrid(g);
    expect(sl[Math.floor(sl.length / 2)]).toBeCloseTo(2, 3);
    const s = terrainStats(g, 150);
    expect(s.slopeMean).toBeCloseTo(2, 2);
    expect(s.max - s.min).toBeGreaterThan(5);
    expect(dir8(s.downhill!)).toBe('gʻarb');
  });
  it('tekis joyda pasayish yoʻnalishi yoʻq', () => expect(terrainStats(grid(0), 150).downhill).toBeNull());
  it('xizmatlar: doira ichidagilar va eng yaqini', () => {
    const c: [number, number] = [69.28, 41.31];
    const pois = [{ id: 'a', kind: 'maktab' as const, at: [69.28, 41.312] as [number, number] }, { id: 'b', kind: 'maktab' as const, at: [69.28, 41.33] as [number, number] }, { id: 'c', kind: 'bekat' as const, at: [69.281, 41.31] as [number, number] }];
    const r = countPoi(pois, c, 500, ['maktab', 'bekat', 'mtm']);
    expect(r[0]).toMatchObject({ kind: 'maktab', n: 1 }); expect(r[0].nearest!).toBeCloseTo(222, -1);
    expect(r[1].n).toBe(1); expect(r[2]).toEqual({ kind: 'mtm', n: 0, nearest: null });
  });
  it('raqobatchilar: Overpass soʻrovi va javob tahlili (masofa boʻyicha tartib)', () => {
    const q = catQuery(CATS[0], [69.28, 41.31], 1000);
    expect(q).toContain('nwr["amenity"="cafe"](around:1000,41.310000,69.280000);');
    const r = parseComp({ elements: [{ type: 'node', id: 1, lat: 41.315, lon: 69.28, tags: { name: 'Uzoq' } }, { type: 'way', id: 2, center: { lat: 41.311, lon: 69.28 } }] }, [69.28, 41.31]);
    expect(r.map(x => x.id)).toEqual(['w2', 'n1']); expect(r[1].name).toBe('Uzoq');
  });
  it('shamol: ustun yoʻnalish va ulush', () => {
    const rose = Array.from({ length: 16 }, (_, i) => [i === 4 ? 0.2 : 0.02, 0.01, 0, 0, 0, 0]);
    const w = windSummary({ name: 'T', file: '', lat: 0, lon: 0, elev: 0, hours: 8760, calm: 0.1, rose, mean: 2, p95: 5, monthT: [], monthV: [] });
    expect(w.k).toBe(4); expect(w.share).toBeCloseTo(0.21); expect(dir8(w.k * 22.5)).toBe('sharq');
  });
});
