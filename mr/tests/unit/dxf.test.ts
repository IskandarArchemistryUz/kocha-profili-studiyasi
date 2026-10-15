import { describe, it, expect } from 'vitest';
import { toDxf } from '../../src/core/dxf';
import { blankProject } from '../../src/core/doc';
import { frame, type XY } from '../../src/core/geo';

describe('DXF eksport', () => {
  it('uchastka, bino (balandlik bilan), qatlamlar va EOF', () => {
    const p = blankProject('Sinov'); const fr = frame(p.origin);
    const rect = (a: number, b: number, c: number, d: number): XY[] => [[a, b], [c, b], [c, d], [a, d]];
    p.site = { rings: [rect(-50, -50, 50, 50).map(fr.toGeo)] };
    p.buildings = [{ id: 'b', footprint: rect(-10, -5, 10, 5).map(fr.toGeo), floors: 9, nonRes: 1, use: 'turar' }];
    const s = toDxf(p), L = s.split('\r\n');
    expect(L.slice(-2)).toEqual(['EOF', '']);
    expect(s).toContain('AC1009');
    expect(L.filter(x => x === 'POLYLINE').length).toBe(4);      // uchastka + kvartal + noturar + turar
    const i = L.indexOf('BINO', L.indexOf('ENTITIES'));            // birinchi BINO qatlamli obyekt
    expect(i).toBeGreaterThan(0);
    expect(s).toContain('\r\n39\r\n26.400\r\n');                   // 8 qavat × 3,3 m
    expect(s).toMatch(/41\.31\d+, 69\.27\d+/);                      // markaz koordinatasi
  });
});
