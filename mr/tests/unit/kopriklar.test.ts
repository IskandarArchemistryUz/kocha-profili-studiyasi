import { describe, it, expect } from 'vitest';
import { parseOverpass } from '../../src/context/osm';
import { elevateRoads, LEVEL_H, RAMP } from '../../src/scene/bridges3d';
import type { XY } from '../../src/core/geo';

/** 02.11 (egasi: «koʻprik bor joyda tekis yoʻl boʻlib qolyapti»): OSM koʻprik qavati, tunnel alohida, pandus */
describe('OSM koʻprik va tunnel', () => {
  const g = (pts: [number, number][]) => pts.map(([lon, lat]) => ({ lon, lat }));
  it('bridge + layer → lvl; tunnel — alohida roʻyxat, yoʻllarda yoʻq', () => {
    const d = parseOverpass({ elements: [
      { type: 'way', id: 1, tags: { highway: 'primary', bridge: 'yes', layer: '2' }, geometry: g([[69.2, 41.3], [69.201, 41.3]]) },
      { type: 'way', id: 2, tags: { highway: 'primary', bridge: 'viaduct' }, geometry: g([[69.2, 41.301], [69.201, 41.301]]) },
      { type: 'way', id: 3, tags: { highway: 'secondary', tunnel: 'yes', layer: '-1' }, geometry: g([[69.2, 41.302], [69.201, 41.302]]) },
      { type: 'way', id: 4, tags: { highway: 'residential' }, geometry: g([[69.2, 41.303], [69.201, 41.303]]) },
    ] as any });
    expect(d.roads.map(r => [r.id, r.lvl])).toEqual([[1, 2], [2, 1], [4, undefined]]);
    expect(d.tunnels?.map(r => [r.id, r.lvl])).toEqual([[3, -1]]);
  });
});

describe('koʻprik balandligi va pandus', () => {
  it('koʻprik LEVEL_H × qavat; ulangan yoʻl pandus boʻlib tushadi, qolgani tekis', () => {
    const br: XY[] = [[0, 0], [100, 0]], left: XY[] = [[-400, 0], [0, 0]], right: XY[] = [[100, 0], [500, 0]], under: XY[] = [[50, -200], [50, 200]];
    const r = elevateRoads([
      { id: 1, pts: br, w: 14, cls: 'primary', lvl: 1 },
      { id: 2, pts: left, w: 14, cls: 'primary' }, { id: 3, pts: right, w: 14, cls: 'primary' },
      { id: 4, pts: under, w: 10, cls: 'secondary' },
    ]);
    const b = r.elevated.find(e => e.id === 1)!; expect(b.bridge).toBe(true); expect(b.z).toEqual([LEVEL_H, LEVEL_H]);
    const rampL = LEVEL_H / RAMP;   // 130 m
    const l = r.elevated.find(e => e.id === 2)!;
    expect(l.bridge).toBe(false); expect(l.z[0]).toBeCloseTo(LEVEL_H, 6); expect(l.z[l.z.length - 1]).toBeCloseTo(0, 6);
    const lenL = Math.hypot(l.pts[0][0] - l.pts[l.pts.length - 1][0], l.pts[0][1] - l.pts[l.pts.length - 1][1]); expect(lenL).toBeCloseTo(rampL, 3);
    // tekis qism: chap yoʻlning qolgan 270 m, oʻng yoʻlning qolgan 270 m, ostidagi yoʻl butunligicha
    const fl = (id: number) => r.flat.find(f => f.id === id)!;
    expect(fl(4).pts).toEqual(under);
    expect(Math.abs(fl(2).pts[0][0] - fl(2).pts[fl(2).pts.length - 1][0])).toBeCloseTo(400 - rampL, 3);
    expect(Math.abs(fl(3).pts[0][0] - fl(3).pts[fl(3).pts.length - 1][0])).toBeCloseTo(400 - rampL, 3);
  });
  it('koʻprik yoʻq — hammasi tekis', () => {
    const r = elevateRoads([{ id: 1, pts: [[0, 0], [10, 0]], w: 7, cls: 'residential' }]);
    expect(r.elevated).toEqual([]); expect(r.flat).toHaveLength(1);
  });
});

/** 02.11 (2) (egasi: «hudud oʻrtasida koʻprik chiqib qoldi, uni na oʻchirib boʻladi na ushlab»): ariq ustidagi koʻprik koʻtarilmaydi */
describe('faqat sath kesishmasidagi koʻprik koʻtariladi', () => {
  it('ariq ustidagi yoʻlak koʻprigi (ostida yoʻl yoʻq) — tekis, pandussiz', () => {
    const r = elevateRoads([
      { id: 1, pts: [[0, 0], [8, 0]], w: 3, cls: 'footway', lvl: 1 },
      { id: 2, pts: [[-300, 0], [0, 0]], w: 3, cls: 'footway' }, { id: 3, pts: [[8, 0], [300, 0]], w: 3, cls: 'footway' },
    ]);
    expect(r.elevated).toHaveLength(0);
    expect(r.flat.map(f => f.id).sort()).toEqual([1, 2, 3]);
    expect(r.flat.find(f => f.id === 1)!.lvl).toBe(0);
  });
  it('temir yoʻl ustidagi koʻprik va unga ulangan koʻprik boʻlagi — koʻtariladi', () => {
    const r = elevateRoads([
      { id: 1, pts: [[0, 0], [60, 0]], w: 12, cls: 'primary', lvl: 1 },
      { id: 5, pts: [[60, 0], [90, 0]], w: 12, cls: 'primary', lvl: 1 },
    ], [[[30, -100], [30, 100]]]);
    expect(r.elevated.filter(e => e.bridge).map(e => e.id).sort()).toEqual([1, 5]);
  });
});
