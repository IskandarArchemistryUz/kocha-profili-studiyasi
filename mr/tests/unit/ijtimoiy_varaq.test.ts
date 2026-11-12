import { describe, it, expect } from 'vitest';
import { sheetSvg, SHEET_DEFAULT, type SheetCtx, type SheetOpts } from '../../src/core/sheet';
import { blankProject, type Project } from '../../src/core/doc';
import { frame, type XY } from '../../src/core/geo';

/** 12.11 (eski navbat, 2-band; egasi 06.11: «yengil footprint, land-use rang, akso doira-namunalar») */
const rect = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
function project(soc = true): Project {
  const p = blankProject('Sinov'); const fr = frame(p.origin);
  p.site = { rings: [rect(-120, -90, 120, 90).map(fr.toGeo)] };
  p.buildings = [
    { id: 'b1', footprint: rect(-90, 30, -30, 45).map(fr.toGeo), floors: 9, nonRes: 1, use: 'turar' },
    ...(soc ? [{ id: 'b2', footprint: rect(20, -60, 80, -20).map(fr.toGeo), floors: 3, nonRes: 0, use: 'maktab' as const }, { id: 'b3', footprint: rect(-80, -60, -40, -30).map(fr.toGeo), floors: 2, nonRes: 0, use: 'mtm' as const }] : []),
  ];
  return p;
}
const svc = [{ id: 'maktab', name: 'Maktab', r: 500, rTxt: '500 m', share: 1, segs: [], src: [[100, 70]] as XY[], dem: [] }, { id: 'mtm', name: 'MTM', r: 300, rTxt: '300 m', share: 1, segs: [], src: [] as XY[], dem: [] }];
const ctx: SheetCtx = { buildings: [], roads: [], rails: [], water: [], waterways: [], green: [], trees: [], svc };
const opts = (o: Partial<SheetOpts> = {}): SheetOpts => ({ ...SHEET_DEFAULT, kind: 'ijtimoiy', ...o, show: { ...SHEET_DEFAULT.show, ...(o.show ?? {}) } });

describe('Ijtimoiy infratuzilma varagʻi', () => {
  it('ijtimoiy binolar raqamli, meʼyoriy radius, aksonometrik doira-namunalar; legenda', () => {
    const r = sheetSvg(project(), ctx, opts());
    for (const id of ['Yangi_binolar', 'Xizmat_radiuslari', 'Ijtimoiy_raqamlar', 'Aksonometrik_namunalar', 'Mavjud_ijtimoiy_obyektlar']) expect(r.svg).toContain(`id="${id}"`);
    const ax = r.svg.slice(r.svg.indexOf('id="Aksonometrik_namunalar"'));
    expect((ax.match(/<circle [^>]*r="1[0-5](\.\d+)?" fill="#ffffff"/g) ?? []).length).toBe(2);   // ikki doira
    expect(ax).toContain('3 qavat'); expect(ax).toContain('Maktab');
    expect(r.legend.map(l => l.label)).toEqual(expect.arrayContaining(['Maktab', 'MTM (bogʻcha)', 'Maktab — xizmat radiusi 500 m', 'MTM (bogʻcha) — xizmat radiusi 300 m']));
    expect(r.minText).toBeGreaterThanOrEqual(2.5);
  });
  it('ijtimoiy bino yoʻq — doiralar yoʻq, legendada yoʻl-yoʻriq', () => {
    const r = sheetSvg(project(false), ctx, opts());
    expect(r.svg).not.toContain('id="Aksonometrik_namunalar"');
    expect(r.legend.some(l => /ijtimoiy bino yoʻq/.test(l.label))).toBe(true);
  });
});
