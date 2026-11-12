import { describe, it, expect } from 'vitest';
import { sheetSvg, parkingRows, SHEET_DEFAULT, type SheetOpts } from '../../src/core/sheet';
import { blankProject, type Project } from '../../src/core/doc';
import { frame, type XY } from '../../src/core/geo';

/** 12.11 (eski navbat, 3-band): «Avtoturargohlar sxemasi» varagʻi */
const rect = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
function project(gx: number): Project {
  const p = blankProject('Sinov'); const fr = frame(p.origin);
  p.site = { rings: [rect(-500, -100, 500, 100).map(fr.toGeo)] };
  p.buildings = [
    { id: 'near', footprint: rect(-480, 20, -420, 35).map(fr.toGeo), floors: 9, nonRes: 0, use: 'turar' },
    { id: 'far', footprint: rect(420, 20, 480, 35).map(fr.toGeo), floors: 9, nonRes: 0, use: 'turar' },
  ];
  p.garages = [{ id: 'g', grp: 'x', kind: 'yer_osti', ring: rect(gx, -60, gx + 60, -20).map(fr.toGeo), levels: 2, spaces: 120, entries: [{ at: fr.toGeo([gx, -40]), kind: 'rampa', dir: Math.PI }] }];
  return p;
}
const opts = (o: Partial<SheetOpts> = {}): SheetOpts => ({ ...SHEET_DEFAULT, kind: 'parkovka', ...o, show: { ...SHEET_DEFAULT.show, ...(o.show ?? {}) } });

describe('Avtoturargohlar sxemasi', () => {
  it('turlar, joylar soni, pandus, 300 m; uzoqdagi turar joy belgilanadi; talab/taʼminot jadvali', () => {
    const r = sheetSvg(project(-480), null, opts());
    for (const id of ['Avtoturargohlar', 'Avtoturargoh_yozuvlari', 'Avtoturargoh_kirishlari', 'Radius_300m', 'Avtoturargoh_balansi']) expect(r.svg).toContain(`id="${id}"`);
    expect(r.svg).toContain('120 joy'); expect(r.svg).toContain('2 sath');
    expect(r.legend.some(l => l.label === 'Turar joy — 300 m dan uzoq (1)')).toBe(true);
    const rows = parkingRows(project(-480));
    expect(rows.find(x => x.t === 'Yer osti avtoturargohi')?.v).toBe(120);
    expect(rows.some(x => x.t === 'Talab (29-jadval), joy')).toBe(true);
  });
  it('hamma turar joy 300 m ichida; avtoturargoh yoʻq — yoʻl-yoʻriq', () => {
    const q = project(-480); q.buildings = q.buildings.filter(b => b.id === 'near');
    expect(sheetSvg(q, null, opts()).legend.some(l => l.label === 'Turar joy — hammasi 300 m ichida')).toBe(true);
    const p = project(0); p.garages = [];
    expect(sheetSvg(p, null, opts()).legend.some(l => /Avtoturargoh yoʻq/.test(l.label))).toBe(true);
  });
});
