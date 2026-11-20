import { describe, it, expect } from 'vitest';
import { pdfFonts } from '../../src/ui/pdf';
import { inRing, withProject, projBuildings } from '../../src/joyshunos/project';

describe('PDF shriftlari (20.11)', () => {
  it('atribut, style va ildiz — hammasi DejaVuSans, 600+ — bold', () => {
    const s = pdfFonts('<svg xmlns="http://www.w3.org/2000/svg"><g font-family="Archivo, Arial"><text font-weight="600">eʼtibor</text><text style="font-family: Georgia; font-weight: 500">x</text></g></svg>');
    expect(s).toContain('<svg xmlns="http://www.w3.org/2000/svg" font-family="DejaVuSans">');
    expect(s).not.toMatch(/Archivo|Georgia/);
    expect(s).toContain('font-weight="bold"');
    expect(s).toContain('font-weight:normal');
  });
});

describe('Joyshunos: loyiha binolari tahlilda (20.11)', () => {
  const site: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
  it('uchastka ichidagi OSM binosi olib tashlanadi, loyiha binolari qoʻshiladi', () => {
    expect(inRing([0.5, 0.5], site)).toBe(true);
    const P = projBuildings({ id: 'p', name: 'p', site: { rings: [site] }, settings: { floorHeight: 3, groundH: 0 } as never, buildings: [{ footprint: [[0.1, 0.1], [0.2, 0.1], [0.2, 0.2]], floors: 5, nonRes: 0, use: 'turar' }] });
    const b = { osm: { buildings: [{ id: 1, rings: [[[0.4, 0.4], [0.6, 0.4], [0.6, 0.6]]], h: 6, hSrc: 'taxmin', kind: 'yes' }, { id: 2, rings: [[[2, 2], [2.1, 2], [2.1, 2.1]]], h: 6, hSrc: 'taxmin', kind: 'yes' }] } } as never;
    const r = withProject(b, P) as unknown as { osm: { buildings: { id: number; h: number }[] } };
    expect(r.osm.buildings.map(x => x.id)).toEqual([2, -1]);
    expect(r.osm.buildings[1].h).toBeGreaterThanOrEqual(15);
  });
});
