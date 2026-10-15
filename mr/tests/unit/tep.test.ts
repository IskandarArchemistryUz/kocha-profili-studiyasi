import { describe, it, expect } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { toXlsx } from '../../src/core/xlsx';
import { tepRows, buildingRows } from '../../src/core/tep';
import { derive } from '../../src/core/derive';
import { blankProject } from '../../src/core/doc';
import { frame, type XY } from '../../src/core/geo';

describe('TEP va Excel', () => {
  const p = blankProject('t'); const fr = frame(p.origin);
  const rect = (a: number, b: number, c: number, d: number): XY[] => [[a, b], [c, b], [c, d], [a, d]];
  p.site = { rings: [rect(-50, -50, 50, 50).map(fr.toGeo)] };
  p.buildings = [{ id: 'b', footprint: rect(-10, -5, 10, 5).map(fr.toGeo), floors: 9, nonRes: 1, use: 'turar' }];
  it('TEP: aholi va GFA derive bilan bir xil', () => {
    const d = derive(p), rows = tepRows(d, p, { gone: 3, kept: 1, foot: 500, floorArea: 900 });
    const v = (n: string) => rows.find(r => r.name === n)!.v as number;
    expect(v('Umumiy qavatlar maydoni (GFA, yer usti)')).toBeCloseTo(1800, 0);
    expect(v('Aholi')).toBe(Math.round(d.population));
    expect(v('Buziladigan mavjud binolar')).toBe(3);
    expect(buildingRows(p)[0][3]).toBe(9);
  });
  it('XLSX: toʻgʻri ZIP tuzilmasi, varaqlar, oʻzbekcha matn', () => {
    const z = unzipSync(toXlsx([{ name: 'TEP', rows: [['Koʻrsatkich', 'Qiymat'], ['Aholi', 779], ['<&>', null]] }, { name: 'Binolar/2', rows: [['a']] }]));
    expect(Object.keys(z)).toContain('xl/worksheets/sheet2.xml');
    const wb = strFromU8(z['xl/workbook.xml']), s1 = strFromU8(z['xl/worksheets/sheet1.xml']);
    expect(wb).toContain('name="Binolar 2"');
    expect(s1).toContain('Koʻrsatkich'); expect(s1).toContain('<v>779</v>'); expect(s1).toContain('&lt;&amp;&gt;');
  });
});
