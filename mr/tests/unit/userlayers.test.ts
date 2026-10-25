import { describe, it, expect } from 'vitest';
import { parseGeoJSON, planImport, utmToLngLat, categoriesOf, zoneStats, isSliver, haOf, heightOf, floorsOf, tierFor, extentKm2, type ULFeature } from '../../src/core/userlayers';
import { apply } from '../../src/core/commands';
import { blankProject, migrate } from '../../src/core/doc';
import { exportJSON, importJSONWithLayers } from '../../src/storage/db';

/** Qorashina atrofidagi kvadrat (≈ m da yon) — [lon, lat] */
const sq = (lon: number, lat: number, m: number): number[][] => {
  const dx = m / (111320 * Math.cos(lat * Math.PI / 180)), dy = m / 110574;
  return [[lon, lat], [lon + dx, lat], [lon + dx, lat + dy], [lon, lat + dy], [lon, lat]];
};
const fc = (features: unknown[]) => JSON.stringify({ type: 'FeatureCollection', features });
const poly = (coords: number[][], properties: Record<string, unknown>) => ({ type: 'Feature', properties, geometry: { type: 'Polygon', coordinates: [coords] } });

describe('foydalanuvchi qatlamlari — import', () => {
  it('UTM 42N → WGS84 (Qorashina Archicad markazi E 286000, N 4246000)', () => {
    const [lon, lat] = utmToLngLat(286000, 4246000, 42);
    // eksport skriptidagi natija bilan bir xil (Microsoft konturlari bilan 0 m mos kelgan)
    expect(lon).toBeCloseTo(66.5515071, 6);
    expect(lat).toBeCloseTo(38.3366018, 6);
  });

  it('binolar: tur, balandlik, toifa ranglari aniqlanadi', () => {
    const bl = Array.from({ length: 40 }, (_, i) => poly(sq(66.57 + i * 0.0003, 38.33, 12), { floors: i % 2 ? 2 : 1, height_m: i % 2 ? 6.7 : 3.35, landuse: i < 30 ? 'NOP' : 'RES', mahalla: 'Nodira MFY' }));
    const p = parseGeoJSON(fc(bl));
    expect(p.crs).toBe('wgs84');
    const plan = planImport('QOR_buildings_archicad_WGS84.geojson', p, 'wgs84');
    expect(plan.meta.kind).toBe('bino');
    expect(plan.meta.heightField).toBe('height_m');
    expect(plan.meta.catField).toBe('landuse');
    expect(plan.meta.cats.map(c => c.label)).toEqual(['Aniqlanmagan', 'Turar joy']);
    expect(plan.meta.name).toBe('QOR_buildings_archicad_WGS84');
    expect(heightOf(plan.features[1], plan.meta, 3.3)).toBeCloseTo(6.7);
    expect(floorsOf(plan.features[1], plan.meta, 3.3)).toBe(2);
    expect(plan.warn).toEqual([]);
  });

  it('chegaralar: nomsiz mayda boʻlaklar (< 10 ga) tashlanadi, nomlilari qoladi', () => {
    const z = [poly(sq(66.55, 38.32, 1500), { name: 'Boʻston MFY' }), poly(sq(66.60, 38.32, 60), { name: null }), poly(sq(66.62, 38.32, 80), { name: 'Yashnobod MFY' })];
    const p = parseGeoJSON(fc(z)), plan = planImport('mahalla.geojson', p, 'wgs84', 'chegara');
    expect(plan.slivers).toBe(1);
    expect(plan.features.map(f => f.p.name)).toEqual(['Boʻston MFY', 'Yashnobod MFY']);
    expect(plan.meta.labels).toBe(true);
    expect(isSliver(plan.features[1], 'name')).toBe(false);   // nomi bor — 0,64 ga boʻlsa ham
    expect(Math.abs(haOf(plan.features[0]) / 225 - 1)).toBeLessThan(0.01);   // testdagi oddiy gradus→metr formulasi ±0,5 %
  });

  it('UTM metrdagi fayl: tizim taxmin qilinadi, zona tanlanmasa ogohlantiriladi', () => {
    const z = [poly([[286000, 4246000], [286100, 4246000], [286100, 4246100], [286000, 4246100], [286000, 4246000]], { LU: 'Residential' })];
    const p = parseGeoJSON(fc(z));
    expect(p.crs).toBe('metr');
    expect(planImport('x.geojson', p, 'utm42').warn).toEqual([]);
    expect(planImport('x.geojson', p, 'wgs84').warn[0]).toMatch(/koordinata tizimini/);
  });

  it('chiziqlar va yaroqsiz obyektlar', () => {
    const p = parseGeoJSON(fc([{ type: 'Feature', properties: { class: 'ROAD_TRUNK' }, geometry: { type: 'LineString', coordinates: [[66.5, 38.3], [66.6, 38.3]] } }, { type: 'Feature', properties: {}, geometry: null }]));
    expect(p.skipped).toBe(1);
    const plan = planImport('roads.geojson', p, 'wgs84');
    expect(plan.meta.kind).toBe('chiziq');
    expect(plan.meta.catField).toBe('class');
  });

  it('toifalar: maʼlum kodlar oʻzbekcha nom va rang oladi, nomaʼlumlari — navbatdagi rang', () => {
    const fs: ULFeature[] = ['Residential', 'Agricultural', 'Facilities/Infrastructure', 'Xyz', 'Residential'].map(v => ({ p: { lu: v }, polys: [] }));
    const c = categoriesOf(fs, 'lu');
    expect(c[0]).toMatchObject({ v: 'Residential', label: 'Turar joy', n: 2 });
    expect(c.find(x => x.v === 'Agricultural')!.label).toBe('Qishloq xoʻjaligi');
    expect(c.find(x => x.v === 'Xyz')!.label).toBe('Xyz');
  });

  it('katta hudud: chegaralar boʻyicha reja darajasi', () => {
    expect(tierFor(1500, 1.5)).toBe('free');
    expect(tierFor(12077, 7)).toBe('pro');
    expect(tierFor(60000, 120)).toBe('max');
    expect(extentKm2([66.49, 38.30, 66.63, 38.37])).toBeGreaterThan(80);
  });
});

describe('mahalla koʻrsatkichlari', () => {
  it('binolar markazi boʻyicha; maydon — toʻliq va aholi punkti ichidagi qismi', () => {
    // mahalla 1000×1000 m; aholi punkti uning chap yarmini qoplaydi (500×1000 m)
    const lon = 66.55, lat = 38.32, dx = 1 / (111320 * Math.cos(lat * Math.PI / 180)), dy = 1 / 110574;
    const zone: ULFeature = { p: { name: 'Nodira MFY' }, polys: [[sq(lon, lat, 1000).slice(0, -1) as [number, number][]]] };
    const settle: ULFeature = { p: {}, polys: [[[[lon - 10 * dx, lat - 10 * dy], [lon + 500 * dx, lat - 10 * dy], [lon + 500 * dx, lat + 1010 * dy], [lon - 10 * dx, lat + 1010 * dy]]]] };
    const b = (x: number, y: number, fl: number) => ({ f: { p: {}, polys: [[sq(lon + x * dx, lat + y * dy, 10).slice(0, -1) as [number, number][]]] } as ULFeature, floors: fl });
    const s = zoneStats([zone], 'name', [b(100, 100, 1), b(700, 700, 2), b(1500, 100, 3)], [settle]);
    expect(s[0].name).toBe('Nodira MFY');
    expect(Math.abs(s[0].ha / 100 - 1)).toBeLessThan(0.01);
    expect(Math.abs(s[0].haIn! / s[0].ha - 0.5)).toBeLessThan(0.01);
    expect(s[0].buildings).toBe(2);
    expect(s[0].footprintM2).toBeCloseTo(200, -1);
    expect(s[0].gfaM2).toBeCloseTo(300, -1);
  });
});

describe('hujjat va fayl', () => {
  const meta = { id: 'ul_1', name: 'Binolar', kind: 'bino' as const, file: 'b.geojson', added: '2026-10-19T00:00:00Z', count: 2, bbox: [66.5, 38.3, 66.6, 38.4] as [number, number, number, number], visible: true, opacity: 1, catField: 'landuse', cats: [{ v: 'RES', label: 'Turar joy', color: 0xf2cf7c, on: true, n: 2 }], nameField: null, heightField: 'height_m', floorsField: 'floors', colorBy: 'toifa' as const, color: 0xffffff, labels: false };
  it('buyruqlar: qoʻshish, toifani oʻchirish, olib tashlash; migratsiyadan oʻtadi', () => {
    let d = apply(blankProject(), { type: 'addUserLayer', meta });
    d = apply(d, { type: 'updateUserLayer', id: 'ul_1', patch: { cats: [{ ...meta.cats[0], on: false }], opacity: 3 } });
    expect(d.userLayers![0].cats[0].on).toBe(false);
    expect(d.userLayers![0].opacity).toBe(1);
    const m = migrate(JSON.parse(JSON.stringify(d)));
    expect(m.userLayers![0]).toMatchObject({ id: 'ul_1', kind: 'bino', catField: 'landuse' });
    expect(() => apply(d, { type: 'addUserLayer', meta })).toThrow();
    expect(apply(d, { type: 'removeUserLayer', id: 'ul_1' }).userLayers).toBeUndefined();
  });
  it('loyiha fayli qatlam obyektlarini ham olib yuradi', () => {
    const d = apply(blankProject(), { type: 'addUserLayer', meta });
    const txt = exportJSON(d, { ul_1: [{ p: { landuse: 'RES' } }], begona: [] });
    const r = importJSONWithLayers(txt, () => 'p_new');
    expect(r.project.id).toBe('p_new');
    expect(Object.keys(r.layers)).toEqual(['ul_1']);
  });
});

describe('OSM dublikatlari', async () => {
  const { osmDuplicates } = await import('../../src/core/userlayers');
  it('import qilingan bino ostidagi OSM binosi yashiriladi, yonidagisi qoladi', () => {
    const imp: ULFeature[] = [{ p: {}, polys: [[sq(66.57, 38.33, 20).slice(0, -1) as [number, number][]]] }];
    const osm = [{ id: 1, rings: [sq(66.57001, 38.33001, 15).slice(0, -1) as [number, number][]] }, { id: 2, rings: [sq(66.5704, 38.33, 10).slice(0, -1) as [number, number][]] }];
    expect(osmDuplicates(osm, imp)).toEqual([1]);
  });
});

describe('alohida obyekt rangi (overrides)', async () => {
  const { featureColor, withOverrides } = await import('../../src/core/userlayers');
  const meta = { id: 'ul_2', name: 'Binolar', kind: 'bino' as const, file: 'b.geojson', added: '2026-10-25T00:00:00Z', count: 3, bbox: [66.5, 38.3, 66.6, 38.4] as [number, number, number, number], visible: true, opacity: 1, catField: 'landuse', cats: [{ v: 'RES', label: 'Turar joy', color: 0xf2cf7c, on: true, n: 2 }], nameField: null, heightField: null, floorsField: null, colorBy: 'toifa' as const, color: 0xffffff, labels: false };
  const fs: ULFeature[] = [{ p: { landuse: 'RES' } }, { p: { landuse: 'RES' } }, { p: { landuse: 'NOP' } }];
  it('rang tartibi: alohida → toifa → qatlam; tiklash — toifa rangiga qaytadi', () => {
    expect(featureColor(meta, fs[0], 0)).toBe(0xf2cf7c);
    expect(featureColor(meta, fs[2], 2)).toBe(0xffffff);                     // toifa roʻyxatida yoʻq — qatlam rangi
    expect(featureColor({ ...meta, colorBy: 'bir' }, fs[0], 0)).toBe(0xffffff);
    const o = withOverrides(undefined, [0, 2], 0xc0643a);
    expect(o).toEqual({ 0: 0xc0643a, 2: 0xc0643a });
    expect(featureColor({ ...meta, overrides: o }, fs[0], 0)).toBe(0xc0643a);
    expect(featureColor({ ...meta, overrides: o }, fs[1], 1)).toBe(0xf2cf7c);
    expect(withOverrides(o, [0], null)).toEqual({ 2: 0xc0643a });
    expect(withOverrides(o, [0, 2], null)).toBeUndefined();
  });
  it('buyruq va migratsiya: ranglar saqlanadi, boʻsh patch hammasini tiklaydi, yaroqsiz qiymatlar tashlanadi', () => {
    let d = apply(blankProject(), { type: 'addUserLayer', meta });
    d = apply(d, { type: 'updateUserLayer', id: 'ul_2', patch: { overrides: { 1: 0x112233 } } });
    expect(d.userLayers![0].overrides).toEqual({ 1: 0x112233 });
    const m = migrate(JSON.parse(JSON.stringify(d)));
    expect(m.userLayers![0].overrides).toEqual({ 1: 0x112233 });
    const bad = JSON.parse(JSON.stringify(d)); bad.userLayers[0].overrides = { 1: 0x112233, x: 5, 2: -1, 3: 'q' };
    expect(migrate(bad).userLayers![0].overrides).toEqual({ 1: 0x112233 });
    d = apply(d, { type: 'updateUserLayer', id: 'ul_2', patch: { overrides: {} } });
    expect(d.userLayers![0].overrides).toBeUndefined();
  });
});
