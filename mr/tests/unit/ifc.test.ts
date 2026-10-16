import { describe, it, expect } from 'vitest';
import { toIfc, ifcGuid, stepStr } from '../../src/core/ifc';
import { blankProject, type Project } from '../../src/core/doc';
import { frame, type XY } from '../../src/core/geo';

const rect = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
function project(): Project {
  const p = blankProject('Fitrat koʻchasi'); const fr = frame(p.origin);
  p.buildings = [
    { id: 'a', footprint: rect(0, 0, 40, 14).map(fr.toGeo), floors: 9, nonRes: 1, use: 'turar', mat: 'gisht', roof: 'quyosh' },
    { id: 's', footprint: rect(60, 0, 100, 40).map(fr.toGeo), floors: 2, nonRes: 2, use: 'savdo', gen: { grp: 'g', kind: 'stilobat' } },
    { id: 't', footprint: rect(70, 10, 90, 30).map(fr.toGeo).reverse(), floors: 12, nonRes: 0, use: 'turar', z0: 2 },
  ];
  return p;
}

describe('IFC4 eksport', () => {
  it('GlobalId: 22 belgi, barqaror, birinchi belgi 0–3', () => {
    const g = ifcGuid('x'); expect(g).toHaveLength(22); expect(ifcGuid('x')).toBe(g); expect(ifcGuid('y')).not.toBe(g); expect('0123').toContain(g[0]);
  });
  it('STEP matni: apostrof va oʻzbek harflari', () => { expect(stepStr("O'zbek")).toBe("'O''zbek'"); expect(stepStr('oʻ')).toBe("'o\\X2\\02BB\\X0\\'"); });
  it('tuzilma: loyiha, uchastka, binolar, qavatlar, proksi hajmlar', () => {
    const s = toIfc(project(), new Date('2026-10-16T10:00:00Z'));
    expect(s.startsWith('ISO-10303-21;')).toBe(true); expect(s).toContain("FILE_SCHEMA(('IFC4'))");
    expect((s.match(/IFCBUILDING\(/g) ?? []).length).toBe(3);
    expect((s.match(/IFCBUILDINGSTOREY\(/g) ?? []).length).toBe(9 + 2 + 12);
    expect((s.match(/IFCBUILDINGELEMENTPROXY\(/g) ?? []).length).toBe(23);
    const fh = project().settings.floorHeight, m = s.match(/IFCBUILDINGSTOREY\([^;]*'14-qavat'[^;]*,([\d.]+)\);/)!;
    expect(+m[1]).toBeCloseTo(13 * fh, 3);   // stilobat (2 qavat) ustidagi seksiyaning 12-qavati
    const ids = s.match(/^#(\d+)=/gm)!.map(x => +x.slice(1, -1)); expect(new Set(ids).size).toBe(ids.length);
    // har havola mavjud yozuvga
    const max = Math.max(...ids); for (const m of s.matchAll(/#(\d+)(?!=)/g)) expect(+m[1]).toBeLessThanOrEqual(max);
  });
});
