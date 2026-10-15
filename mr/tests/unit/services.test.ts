import { describe, it, expect } from 'vitest';
import { buildNet, distances, distAt, snap, analyze, SERVICES, boundaryPts, type Svc } from '../../src/core/services';
import { classify, parsePoi, parseRoads } from '../../src/context/poi';
import type { XY } from '../../src/core/geo';

/** 100 m li koʻcha toʻri, 0..400 */
const gridLines = (): XY[][] => { const L: XY[][] = []; for (let k = 0; k <= 400; k += 100) { L.push([[k, 0], [k, 400]]); L.push([[0, k], [400, k]]); } return L; };
// toʻr chiziqlari kesishmada umumiy tugun boʻlishi uchun har 100 m da boʻlamiz
const split = (ls: XY[][]) => ls.map(l => { const out: XY[] = []; const [a, b] = l; const n = 4; for (let i = 0; i <= n; i++) out.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]); return out; });

describe('Xizmatlar: piyoda tarmogʻi', () => {
  it('38-jadval radiuslari (shahar)', () => {
    const r = Object.fromEntries(SERVICES.map(s => [s.id, s.r]));
    expect(r).toMatchObject({ mtm: 300, maktab: 500, poliklinika: 1500, dorixona: 500 });
  });
  it('toʻrda masofa — Manhetten, toʻgʻri chiziq emas', () => {
    const net = buildNet(split(gridLines()));
    const D = distances(net, [[0, 0]]);
    const d = distAt(net, D, [300, 300]);
    expect(d).toBeCloseTo(600, 0);
    expect(snap(net, [150, 30])!.d).toBeCloseTo(30, 5);
  });
  it('loyiha koʻchasi tarmoqqa ulanadi va yoʻlni qisqartiradi', () => {
    const lines = split(gridLines());
    const diag: XY[][] = [[[0, 0], [400, 400]]];
    const n0 = buildNet(lines), n1 = buildNet(lines, diag);
    const a = distAt(n0, distances(n0, [[0, 0]]), [400, 400]), b = distAt(n1, distances(n1, [[0, 0]]), [400, 400]);
    expect(b).toBeLessThan(a * 0.8);
  });
  it('tahlil: aholi ulushi radius ichida', () => {
    const net = buildNet(split(gridLines()));
    const demand = [{ p: [100, 100] as XY, w: 1, bid: 'a' }, { p: [400, 400] as XY, w: 3, bid: 'b' }];
    const src = { mtm: [{ pts: boundaryPts([[0, 0], [20, 0], [20, 20], [0, 20]] as XY[]) }] } as Record<Svc, { pts: XY[] }[]>;
    const res = analyze(net, demand, src), m = res.find(r => r.kind === 'mtm')!;
    expect(m.share).toBeCloseTo(0.25, 5);   // faqat a (200 m) ichida, b (≈ 780 m) — yoʻq
    expect(res.find(r => r.kind === 'maktab')!.share).toBe(0);
  });
  it('OSM teglari → xizmat turi; yoʻllar', () => {
    expect(classify({ amenity: 'kindergarten' })).toBe('mtm');
    expect(classify({ building: 'school' })).toBe('maktab');
    expect(classify({ shop: 'supermarket' })).toBe('savdo');
    expect(classify({ shop: 'car' })).toBeNull();
    const j: Parameters<typeof parsePoi>[0] = { elements: [{ type: 'node', id: 1, lat: 41.3, lon: 69.2, tags: { amenity: 'pharmacy' } }, { type: 'way', id: 2, center: { lat: 41.31, lon: 69.21 }, tags: { amenity: 'school', name: '110-maktab' } }, { type: 'way', id: 3, tags: { highway: 'residential' }, geometry: [{ lat: 41.3, lon: 69.2 }, { lat: 41.301, lon: 69.2 }] }] };
    expect(parsePoi(j).map(p => p.kind)).toEqual(['dorixona', 'maktab']);
    expect(parseRoads(j)).toHaveLength(1);
  });
});
