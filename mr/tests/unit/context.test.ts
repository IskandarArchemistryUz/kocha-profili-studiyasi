import { describe, it, expect } from 'vitest';
import { parseOverpass, stitch, roadWidth, buildingHeight, bboxAround, sampleLine } from '../../src/context/osm';
import { detectBlock } from '../../src/context/blocks';
import { parseCoords } from '../../src/context/geocode';
import { terrarium, mercPx, tileRange, imageryUV, terrainSampler } from '../../src/context/tiles';
import { migrate, blankProject, type LngLat } from '../../src/core/doc';
import { apply } from '../../src/core/commands';
import { frame, area } from '../../src/core/geo';

const g = (pts: [number, number][]) => pts.map(([lon, lat]) => ({ lat, lon }));

describe('OSM tahlili', () => {
  it('bino, yoʻl, suv, yashil, daraxt', () => {
    const d = parseOverpass({ elements: [
      { type: 'way', id: 1, tags: { building: 'apartments', 'building:levels': '9' }, geometry: g([[0, 0], [0.001, 0], [0.001, 0.001], [0, 0.001], [0, 0]]) },
      { type: 'way', id: 2, tags: { building: 'yes', height: '24 m' }, geometry: g([[0, 0], [0.001, 0], [0.001, 0.001], [0, 0]]) },
      { type: 'way', id: 3, tags: { highway: 'primary', lanes: '6' }, geometry: g([[0, 0], [0.01, 0]]) },
      { type: 'way', id: 4, tags: { highway: 'residential' }, geometry: g([[0, 0], [0, 0.01]]) },
      { type: 'way', id: 5, tags: { natural: 'water' }, geometry: g([[0, 0], [0.001, 0], [0, 0.001], [0, 0]]) },
      { type: 'way', id: 6, tags: { leisure: 'park' }, geometry: g([[0, 0], [0.002, 0], [0, 0.002], [0, 0]]) },
      { type: 'node', id: 7, lat: 41, lon: 69, tags: { natural: 'tree' } },
      { type: 'way', id: 8, tags: { railway: 'rail' }, geometry: g([[0, 0], [0.01, 0.01]]) },
    ] as never });
    expect(d.buildings).toHaveLength(2);
    expect(d.buildings[0].h).toBeCloseTo(28.8); expect(d.buildings[0].hSrc).toBe('levels');
    expect(d.buildings[1].h).toBe(24); expect(d.buildings[0].rings[0]).toHaveLength(4); // takror nuqta olib tashlandi
    expect(d.roads.map(r => r.w)).toEqual([21, 7]);
    expect(d.water).toHaveLength(1); expect(d.green).toHaveLength(1); expect(d.trees).toEqual([[69, 41]]); expect(d.rails).toHaveLength(1);
  });
  it('multipoligon: boʻlaklar ulanadi, teshik tashqi halqaga biriktiriladi', () => {
    const r = stitch([[[0, 0], [1, 0]], [[1, 1], [1, 0]], [[1, 1], [0, 1], [0, 0]]]);
    expect(r).toHaveLength(1); expect(r[0]).toHaveLength(4);
    const d = parseOverpass({ elements: [{ type: 'relation', id: 9, tags: { building: 'yes', type: 'multipolygon' }, members: [
      { type: 'way', role: 'outer', geometry: g([[0, 0], [0.002, 0], [0.002, 0.002]]) }, { type: 'way', role: 'outer', geometry: g([[0.002, 0.002], [0, 0.002], [0, 0]]) },
      { type: 'way', role: 'inner', geometry: g([[0.0005, 0.0005], [0.001, 0.0005], [0.001, 0.001], [0.0005, 0.0005]]) },
    ] }] as never });
    expect(d.buildings).toHaveLength(1); expect(d.buildings[0].rings).toHaveLength(2);
  });
  it('oʻlchamlar: teg boʻlmasa taxmin', () => {
    expect(roadWidth({ highway: 'secondary' })).toBe(13);
    expect(roadWidth({ highway: 'service', width: '5.5' })).toBe(5.5);
    expect(buildingHeight({ building: 'house' })).toEqual({ h: 6, src: 'taxmin' });
  });
  it('bbox va namuna olish', () => {
    const b = bboxAround([69.28, 41.31], 500);
    expect((b[2] - b[0]) * 111_132).toBeCloseTo(1000, 0);
    expect(sampleLine([[69.28, 41.31], [69.28, 41.31 + 100 / 111_132]], 10)).toHaveLength(11);
  });
});

describe('Kvartalni aniqlash', () => {
  // 4 ta koʻcha: x = ±60, y = ±45, kengligi 10 m → ichki kvartal 110 × 80 m
  const roads = [
    { pts: [[-200, 45], [200, 45]] as [number, number][], w: 10 }, { pts: [[-200, -45], [200, -45]] as [number, number][], w: 10 },
    { pts: [[60, -200], [60, 200]] as [number, number][], w: 10 }, { pts: [[-60, -200], [-60, 200]] as [number, number][], w: 10 },
  ];
  it('yopiq kvartal topiladi va maydoni toʻgʻri', () => {
    const r = detectBlock(roads, [], [0, 0], { window: 400 });
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.area).toBeGreaterThan(110 * 80 * 0.95); expect(r.area).toBeLessThan(110 * 80 * 1.05); expect(r.ring.length).toBeLessThanOrEqual(8); }
  });
  it('yoʻl ustini bosish va ochiq joy — tushunarli xato', () => {
    const a = detectBlock(roads, [], [60, 0], { window: 400 }); expect(a.ok).toBe(false);
    const b = detectBlock(roads.slice(0, 3), [], [0, 0], { window: 400 }); expect(b.ok).toBe(false);
  });
  it('suv yuzasi ham chegara', () => {
    const r = detectBlock(roads.slice(0, 3), [[[-120, -100], [-40, -100], [-40, 100], [-120, 100]]], [0, 0], { window: 400 });
    expect(r.ok).toBe(true); if (r.ok) { expect(r.area).toBeGreaterThan(93 * 80); expect(r.area).toBeLessThan(97 * 80); }
  });
});

describe('Qidiruv va plitkalar', () => {
  it('koordinata matni', () => {
    expect(parseCoords('41.3111, 69.2797')).toEqual([69.2797, 41.3111]);
    expect(parseCoords('69,2797 41,3111')).toEqual([69.2797, 41.3111]); // oʻnlik vergul, teskari tartib
    expect(parseCoords('69.2797 41.3111')).toEqual([69.2797, 41.3111]);
    expect(parseCoords('Chilonzor')).toBeNull();
  });
  it('terrarium va mercator', () => {
    expect(terrarium(128, 0, 0)).toBe(0); expect(terrarium(130, 200, 128)).toBeCloseTo(712.5);
    const [x] = mercPx([0, 0], 0); expect(x).toBe(128);
    const t = tileRange(bboxAround([69.28, 41.31], 500), 17); expect(t.x1 - t.x0).toBeLessThanOrEqual(5);
    const uv = imageryUV({ z: 1, x0: 0, y0: 0, W: 512, H: 512 }, [0, 0]); expect(uv[0]).toBeCloseTo(0.5); expect(uv[1]).toBeCloseTo(0.5);
  });
  it('relyef namunasi markazga nisbatan', () => {
    const n = 3, h = new Float32Array([0, 0, 0, 10, 20, 30, 0, 0, 0]);
    const H = terrainSampler({ n, step: 10, radius: 10, h, center: [0, 0], min: 0, max: 30 });
    expect(H(0, 0)).toBe(0); expect(H(10, 0)).toBe(10); expect(H(-10, 0)).toBe(-10); expect(terrainSampler(null)(5, 5)).toBe(0);
  });
});

describe('Sxema 2 va koʻchirish', () => {
  it('1-sxemadagi hujjat kontekst sozlamalari bilan ochiladi', () => {
    const p = blankProject(); const old: Record<string, unknown> = { ...p, schema: 1 }; delete old.context;
    const m = migrate(old); expect(m.schema).toBe(2); expect(m.context.radius).toBe(500); expect(m.context.loaded).toBe(false);
  });
  it('moveProject: uchastka shakli va maydoni saqlanadi', () => {
    let d = blankProject(); const fr = frame(d.origin);
    d = apply(d, { type: 'setSite', rings: [[[0, 0], [100, 0], [100, 80], [0, 80]].map(p => fr.toGeo(p as [number, number]))] });
    const to: LngLat = [69.24, 41.29];
    const m = apply(d, { type: 'moveProject', origin: to, carry: true });
    const a = area(m.site!.rings[0].map(frame(to).toLocal));
    expect(a).toBeCloseTo(8000, 0); expect(frame(to).toLocal(m.site!.rings[0][0])[0]).toBeCloseTo(0, 3);
    const k = apply(d, { type: 'moveProject', origin: to, carry: false }); expect(k.site).toEqual(d.site);
  });
});

import { clipLine } from '../../src/scene/context3d';
describe('Chiziqni qirqish', () => {
  it('kvadratdan chiqib-kiruvchi chiziq boʻlaklarga ajraladi', () => {
    const r = clipLine([[-20, 0], [5, 0], [5, 20], [5, -20]], -10, -10, 10, 10);
    expect(r).toEqual([[[-10, 0], [5, 0], [5, 10]], [[5, 10], [5, -10]]]);
    expect(clipLine([[20, 20], [30, 30]], -10, -10, 10, 10)).toEqual([]);
  });
});
