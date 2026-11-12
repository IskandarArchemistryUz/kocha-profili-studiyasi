import { describe, it, expect } from 'vitest';
import { parseTreesCsv, parseTreesDxf, parseTreesGeoJSON, treeStatus, mergeTrees } from '../../src/core/trees';
import { blankProject, migrate } from '../../src/core/doc';
import { frame } from '../../src/core/geo';
import { apply } from '../../src/core/commands';
import { sheetSvg, SHEET_DEFAULT, treeSum } from '../../src/core/sheet';

describe('Daraxtlar inventarizatsiyasi — fayllar', () => {
  it('CSV: lon/lat, tur, diametr; nuqta-vergul va vergulli kasr', () => {
    const r = parseTreesCsv('lon;lat;tur;diametr;holat\n69,2401;41,3111;chinor;45;yaxshi\n69.2402;41.3112;tut;;\nxato;satr;;;');
    expect(r.trees.length).toBe(2); expect(r.skipped).toBe(1);
    expect(r.trees[0]).toEqual({ at: [69.2401, 41.3111], sp: 'chinor', d: 45, st: 'yaxshi' });
  });
  it('CSV: x/y UTM 42N → WGS84 (Toshkent)', () => {
    const r = parseTreesCsv('x,y\n520000,4572000');
    expect(r.trees[0].at[0]).toBeGreaterThan(69); expect(r.trees[0].at[0]).toBeLessThan(69.5);
    expect(r.trees[0].at[1]).toBeGreaterThan(41); expect(r.trees[0].at[1]).toBeLessThan(41.5);
  });
  it('GeoJSON nuqtalar va DXF (CIRCLE, INSERT)', () => {
    expect(parseTreesGeoJSON(JSON.stringify({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [69.24, 41.31] }, properties: { tur: 'qayragʻoch' } }] })).trees[0].sp).toBe('qayragʻoch');
    const dxf = ['0', 'SECTION', '2', 'ENTITIES', '0', 'CIRCLE', '8', 'TREES', '10', '520000', '20', '4572000', '40', '2', '0', 'INSERT', '2', 'TREE', '10', '520010', '20', '4572010', '0', 'LINE', '10', '1', '20', '2', '0', 'ENDSEC', '0', 'EOF'].join('\n');
    expect(parseTreesDxf(dxf).trees.length).toBe(2);
  });
});

describe('Daraxt holati (ShNQ 2.07.01-23, 35-jadval: bino devori 5 m)', () => {
  const b = [[[0, 0], [20, 0], [20, 10], [0, 10]]] as [number, number][][];
  it('bino ostida — kesiladi; 3 m da — yaqin; 8 m da — saqlanadi', () => {
    expect(treeStatus([5, 5], b, [])).toBe('kesiladi');
    expect(treeStatus([5, 13], b, [])).toBe('yaqin');
    expect(treeStatus([5, 18], b, [])).toBe('saqlanadi');
    expect(treeStatus([50, 50], [], [[[[45, 45], [55, 45], [55, 55], [45, 55]]]])).toBe('kesiladi');
  });
  it('OSM va inventar takrori (2 m) olinmaydi', () => {
    expect(mergeTrees([[0, 0], [10, 0]], [[0.5, 0.5]]).length).toBe(2);
  });
});

describe('«Daraxtlar xaritasi» varagʻi', () => {
  it('hujjatda saqlanadi; varaqda balans jadvali va holatlar', () => {
    let d = blankProject(); const fr = frame(d.origin), g = (x: number, y: number) => fr.toGeo([x, y]);
    d = { ...d, site: { rings: [[g(-50, -50), g(50, -50), g(50, 50), g(-50, 50)]] }, buildings: [{ id: 'b1', footprint: [g(0, 0), g(20, 0), g(20, 10), g(0, 10)], floors: 5, nonRes: 0, use: 'turar' } as any] };
    d = apply(d, { type: 'setTreeInv', trees: [{ at: g(5, 5) }, { at: g(5, 13) }, { at: g(5, 30), sp: 'chinor' }, { at: g(200, 200) }] });
    expect(migrate(JSON.parse(JSON.stringify(d))).treeInv?.length).toBe(4);
    const t = treeSum(d, null, d.buildings.map(b => b.footprint.map(p => fr.toLocal(p) as [number, number])), d.site!.rings[0].map(p => fr.toLocal(p) as [number, number]), []);
    expect([t.cut.length, t.near.length, t.keep.length, t.inv]).toEqual([1, 1, 1, 3]);
    const r = sheetSvg(d, null, { ...SHEET_DEFAULT, kind: 'daraxt' }, new Date(2026, 10, 12));
    expect(r.svg).toContain('Daraxtlar balansi');
    expect(r.svg).toContain('id="Mavjud_kesiladi"');
    expect(r.svg).toContain('Mavjud — saqlanadi (1)');
  });
});
