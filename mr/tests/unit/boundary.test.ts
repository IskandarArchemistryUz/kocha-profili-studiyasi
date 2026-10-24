import { describe, it, expect } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { crsLabel, utmFromText, utmZoneOf, parseBoundary, areaFrame, areaTester, clipOsmToArea, ringAreaM2 } from '../../src/core/boundary';
import { utmToLngLat } from '../../src/core/userlayers';

// Qorashina atrofi (~66.55, 38.33): 1 km × 0.8 km toʻgʻri toʻrtburchak
const W = 66.545, S = 38.330, dLng = 1000 / (111_320 * Math.cos(38.334 * Math.PI / 180)), dLat = 800 / 111_132;
const RECT: [number, number][] = [[W, S], [W + dLng, S], [W + dLng, S + dLat], [W, S + dLat]];
const closed = [...RECT, RECT[0]];

describe('chegara fayli', () => {
  it('GeoJSON (WGS84): eng katta poligon, maydon', () => {
    const small = [[W, S], [W + 0.001, S], [W + 0.001, S + 0.001], [W, S]];
    const gj = { type: 'FeatureCollection', features: [
      { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [small] } },
      { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [closed] } },
    ] };
    const b = parseBoundary('chegara.geojson', JSON.stringify(gj));
    expect(b.crs).toBe('wgs84');
    expect(b.polys).toBe(2);
    expect(b.rings[0].length).toBe(4);
    expect(b.areaHa).toBeGreaterThan(78); expect(b.areaHa).toBeLessThan(82);
  });
  it('KML va KMZ', () => {
    const kml = `<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><Polygon><outerBoundaryIs><LinearRing><coordinates>
      ${closed.map(p => `${p[0]},${p[1]},0`).join(' ')}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></Document></kml>`;
    const a = parseBoundary('x.kml', kml);
    expect(a.rings[0].length).toBe(4); expect(a.crs).toBe('wgs84');
    const kmz = zipSync({ 'doc.kml': strToU8(kml) });
    const b = parseBoundary('x.kmz', kmz);
    expect(b.areaHa).toBeCloseTo(a.areaHa, 3);
  });
  it('DXF (UTM 42N metrlarda) — avtomatik aniqlanadi', () => {
    const pts = [[286000, 4245000], [287000, 4245000], [287000, 4246000], [286000, 4246000]];
    const dxf = ['0', 'SECTION', '2', 'ENTITIES', '0', 'LWPOLYLINE', '8', 'chegara', '90', '4', '70', '1', ...pts.flatMap(p => ['10', String(p[0]), '20', String(p[1])]), '0', 'ENDSEC', '0', 'EOF'].join('\n');
    const b = parseBoundary('qorashina.dxf', dxf);
    expect(b.crs).toBe('utm42');
    const ref = utmToLngLat(286000, 4245000, 42);
    expect(b.rings[0][0][0]).toBeCloseTo(ref[0], 5);
    expect(b.areaHa).toBeGreaterThan(98); expect(b.areaHa).toBeLessThan(102);   // 1 km² ≈ 100 ga
  });
  it('DXF POLYLINE + VERTEX', () => {
    const v = (x: number, y: number) => ['0', 'VERTEX', '8', '0', '10', String(x), '20', String(y)];
    const dxf = ['0', 'POLYLINE', '8', '0', '66', '1', '70', '1', ...v(W, S), ...v(W + dLng, S), ...v(W + dLng, S + dLat), ...v(W, S + dLat), '0', 'SEQEND', '0', 'EOF'].join('\n');
    expect(parseBoundary('p.dxf', dxf).rings[0].length).toBe(4);
  });
  it('dunyoning istalgan joyi: WGS84 (Parij) qabul qilinadi; boʻsh fayl — xato', () => {
    const far = [[2.35, 48.85], [2.36, 48.85], [2.36, 48.86], [2.35, 48.85]];
    const p = parseBoundary('paris.geojson', JSON.stringify({ type: 'Polygon', coordinates: [far] }));
    expect(p.crs).toBe('wgs84'); expect(crsLabel(p.crs)).toBe('WGS84'); expect(p.areaHa).toBeGreaterThan(30);
    expect(() => parseBoundary('bosh.kml', '<kml></kml>')).toThrow(/topilmadi/);
  });
  it('UTM: faylda EPSG yozilgan (Nyu-York, 18N) va loyiha markazi zonasi (Rotterdam, 31N; Melburn, 55S)', () => {
    const sq = (x: number, y: number, d = 200) => [[x, y], [x + d, y], [x + d, y + d], [x, y + d], [x, y]];
    // Manhetten ~ 585000, 4511000 (18N)
    const ny = parseBoundary('ny.geojson', JSON.stringify({ type: 'Polygon', crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:EPSG::32618' } }, coordinates: [sq(585000, 4511000)] }));
    expect(ny.crs).toBe('utm18'); expect(crsLabel(ny.crs)).toBe('UTM 18N');
    expect(ny.rings[0][0][0]).toBeCloseTo(-73.99, 1); expect(ny.rings[0][0][1]).toBeCloseTo(40.74, 1);
    expect(ny.areaHa).toBeGreaterThan(3.9); expect(ny.areaHa).toBeLessThan(4.1);
    // zona yozilmagan DXF — loyiha markazi Rotterdamda (31N): ~ 593000, 5754000
    const v = (x: number, y: number) => ['0', 'VERTEX', '8', '0', '10', String(x), '20', String(y)];
    const dxf = ['0', 'POLYLINE', '8', '0', '66', '1', '70', '1', ...sq(593000, 5754000).slice(0, 4).flatMap(q => v(q[0], q[1])), '0', 'SEQEND', '0', 'EOF'].join('\n');
    const rt = parseBoundary('r.dxf', dxf, [4.48, 51.92]);
    expect(rt.crs).toBe('utm31'); expect(rt.rings[0][0][0]).toBeCloseTo(4.35, 0); expect(rt.rings[0][0][1]).toBeCloseTo(51.92, 1);
    // markaz koʻrsatilmasa (Toshkent loyihasi) — bu raqamlar Oʻzbekistonga tushmaydi → xato
    expect(() => parseBoundary('r.dxf', dxf, [69.28, 41.31])).toThrow(/aniqlanmadi/);
    // janubiy yarimshar: Melburn ~ 320000, 5812000 (55S)
    const mel = parseBoundary('m.geojson', JSON.stringify({ type: 'Polygon', coordinates: [sq(320000, 5812000)] }), [144.96, -37.81]);
    expect(mel.crs).toBe('utm55s'); expect(crsLabel(mel.crs)).toBe('UTM 55S'); expect(mel.rings[0][0][1]).toBeCloseTo(-37.8, 0);
    expect(utmFromText('PROJCS["WGS 84 / UTM zone 33N"')).toEqual({ zone: 33, south: false });
    expect(utmZoneOf(69.28)).toBe(42); expect(utmZoneOf(-73.99)).toBe(18);
  });
});

describe('chegara ichini yuklash', () => {
  it('areaFrame: markaz va radius (zaxira bilan)', () => {
    const f = areaFrame(RECT as never, 80);
    expect(f.radius).toBeGreaterThan(575); expect(f.radius).toBeLessThan(585);   // 1000/2 + 80
    expect(f.center[0]).toBeCloseTo(W + dLng / 2, 6);
  });
  it('qirqish: ichidagi va buferdagi qoladi', () => {
    const In = areaTester(RECT as never, 60), c: [number, number] = [W + dLng / 2, S + dLat / 2];
    expect(In(c)).toBe(true);
    expect(In([W - 40 / (111_320 * 0.786), c[1]])).toBe(true);    // 40 m tashqarida — buferda
    expect(In([W - 200 / (111_320 * 0.786), c[1]])).toBe(false);
    const sq = (x: number, y: number) => [[[x, y], [x + 0.0002, y], [x + 0.0002, y + 0.0002], [x, y + 0.0002]]];
    const osm = { buildings: [{ rings: sq(c[0], c[1]) }, { rings: sq(W - 0.01, S) }], roads: [{ pts: [[W - 0.01, c[1]], [c[0], c[1]]] }, { pts: [[W - 0.01, c[1]], [W + 0.03, c[1]]] }, { pts: [[W - 0.01, S - 0.01], [W + 0.03, S - 0.01]] }], rails: [], water: [], waterways: [], green: [{ rings: [[[W - 0.1, S - 0.1], [W + 0.1, S - 0.1], [W + 0.1, S + 0.1], [W - 0.1, S + 0.1]]] }], trees: [c, [W - 0.02, S]] } as never;
    const o = clipOsmToArea(osm, RECT as never) as { buildings: unknown[]; roads: unknown[]; trees: unknown[]; green: unknown[] };
    expect(o.green.length).toBe(1);   // chegarani butunlay oʻrab olgan maydon
    expect(o.buildings.length).toBe(1); expect(o.roads.length).toBe(2);   // vertex ichida; uchlari tashqarida, lekin kesib oʻtadi; uzoqdagi — yoʻq expect(o.trees.length).toBe(1);
    expect(ringAreaM2(RECT as never)).toBeGreaterThan(7.9e5);
  });
});
