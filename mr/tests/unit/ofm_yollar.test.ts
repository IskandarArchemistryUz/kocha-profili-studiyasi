import { describe, it, expect } from 'vitest';
// @ts-expect-error — turlarsiz CommonJS (maplibre bogʻliqligi)
import vtpbf from 'vt-pbf';
import geojsonvt from 'geojson-vt';
import { clipToTile, weldEnds, fetchOfmRoads } from '../../src/context/ofm';
import { walkNet } from '../../src/joyshunos/models';
import { frame as geoFrame } from '../../src/core/geo';
import type { LngLat } from '../../src/core/doc';

/** 25.11: Joyshunos yoʻllari OpenFreeMap plitkalaridan — chok (plitka chegarasi) tarmoqni uzmasligi kerak */
const Z = 14, n = 2 ** Z;
const tileOf = (lng: number, lat: number) => { const r = lat * Math.PI / 180; return { x: Math.floor((lng + 180) / 360 * n), y: Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n) }; };
const tileLng = (x: number) => x / n * 360 - 180;

/** GeoJSON → z14 MVT plitkalari (OpenMapTiles «transportation» qatlami) */
function fakeTiles(fc: GeoJSON.FeatureCollection) {
  const idx = geojsonvt(fc, { maxZoom: 14, indexMaxZoom: 14, buffer: 64, tolerance: 0 });
  return (async (u: string) => {
    if (u.endsWith('/planet')) return new Response(JSON.stringify({ tiles: ['https://t.test/{z}/{x}/{y}.pbf'] }));
    const m = /\/(\d+)\/(\d+)\/(\d+)\.pbf$/.exec(u)!; const t = idx.getTile(+m[1], +m[2], +m[3]);
    const buf = vtpbf.fromGeojsonVt({ transportation: t ?? { features: [] } }, { version: 2 });
    return new Response(buf);
  }) as unknown as typeof fetch;
}

describe('OpenFreeMap yoʻllari (25.11)', () => {
  it('clipToTile: bufer qismi kesiladi, chiqib-kirgan chiziq ikki boʻlak', () => {
    expect(clipToTile([[-100, 50], [200, 50]], 4096)).toEqual([[[0, 50], [200, 50]]]);
    const p = clipToTile([[100, 100], [100, -200], [300, -200], [300, 100]], 4096);
    expect(p).toEqual([[[100, 100], [100, 0]], [[300, 0], [300, 100]]]);
    expect(clipToTile([[-10, -10], [-5, -20]], 4096)).toEqual([]);
  });
  it('weldEnds: 1 m ichidagi uchlar bitta nuqtaga', () => {
    const a = { pts: [[69.0, 41.0], [69.001, 41.0]] as LngLat[] }, b = { pts: [[69.001005, 41.000004], [69.002, 41.0]] as LngLat[] };
    weldEnds([a, b]); expect(b.pts[0]).toEqual(a.pts[1]);
  });
  it('plitka chokidan oʻtgan koʻcha — tarmoq uzilmaydi; koʻprik bayrogʻi; temir yoʻl olinmaydi', async () => {
    const t = tileOf(69.2797, 41.3111), edge = tileLng(t.x + 1), lat = 41.3111;
    const fc: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [
      { type: 'Feature', id: 1, properties: { class: 'minor', subclass: 'residential' }, geometry: { type: 'LineString', coordinates: [[edge - 0.004, lat], [edge + 0.004, lat]] } },
      { type: 'Feature', id: 2, properties: { class: 'primary', brunnel: 'bridge', layer: 1 }, geometry: { type: 'LineString', coordinates: [[edge - 0.003, lat + 0.002], [edge - 0.003, lat - 0.002]] } },
      { type: 'Feature', id: 3, properties: { class: 'rail', subclass: 'rail' }, geometry: { type: 'LineString', coordinates: [[edge - 0.004, lat - 0.001], [edge + 0.004, lat - 0.001]] } },
    ] };
    const roads = await fetchOfmRoads([lat - 0.01, edge - 0.01, lat + 0.01, edge + 0.01], fakeTiles(fc));
    expect(roads.some(r => r.cls === 'rail')).toBe(false);
    expect(roads.filter(r => r.cls === 'residential').length).toBe(2);   // chokda ikki boʻlak
    expect(roads.find(r => r.cls === 'primary')?.f).toBe('b');
    // tarmoq: chokning ikki tomonidagi uchlar ulangan
    const fr = geoFrame([edge, lat]), net = walkNet(roads.filter(r => r.cls === 'residential').map(r => ({ cls: r.cls, pts: r.pts.map(p => fr.toLocal(p)) })));
    const seen = new Set([0]), st = [0];
    while (st.length) { const v = st.pop()!; for (const e of net.adj[v]) if (!seen.has(e.to)) { seen.add(e.to); st.push(e.to); } }
    expect(seen.size).toBe(net.xy.length);
    const xs = net.xy.map(p => p[0]); expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(600);
  });
});
