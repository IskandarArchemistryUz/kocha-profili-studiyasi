import { describe, it, expect } from 'vitest';
import { sheetSvg, SHEET_DEFAULT, type SheetOpts } from '../../src/core/sheet';
import { fireLowAccess } from '../../src/core/fireaccess';
import { blankProject, type Project } from '../../src/core/doc';
import { frame, type XY } from '../../src/core/geo';

/** 12.11 (eski navbat, 5-band): «Yongʻin marshrutlari» varagʻi — fire-666-low hisobi ustida */
const rect = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
function project(): Project {
  const p = blankProject('Sinov'); const fr = frame(p.origin);
  p.site = { rings: [rect(-150, -120, 150, 120).map(fr.toGeo)] };
  p.streets = [{ id: 's', axis: [[-160, 0], [160, 0]].map(q => fr.toGeo(q as XY)), profile: 'mahalla-15' }];
  p.buildings = [
    { id: 'near', footprint: rect(-60, -24, 60, -11).map(fr.toGeo), floors: 6, nonRes: 0, use: 'turar' },
    { id: 'far', footprint: rect(-60, 60, 60, 74).map(fr.toGeo), floors: 6, nonRes: 0, use: 'turar' },
    { id: 'tall', footprint: rect(-60, -100, 60, -86).map(fr.toGeo), floors: 12, nonRes: 0, use: 'turar' },
  ];
  return p;
}
const opts = (o: Partial<SheetOpts> = {}): SheetOpts => ({ ...SHEET_DEFAULT, kind: 'yongin', ...o, show: { ...SHEET_DEFAULT.show, ...(o.show ?? {}) } });

describe('Yongʻin marshrutlari', () => {
  it('kelish tomoni va 5–8 m zona — koʻchaga yaqin binoda; uzoqdagi — yetmaydi; H ≥ 28 m alohida', () => {
    const F = fireLowAccess(project());
    expect(F.side.has('near')).toBe(true); expect(F.bad).toEqual(['far']); expect(F.ids).not.toContain('tall');
    const r = sheetSvg(project(), null, opts());
    for (const id of ['Kochalar_qatnov_qismi', 'Kelish_zonasi', 'Kelish_tomoni']) expect(r.svg).toContain(`id="${id}"`);
    const L = r.legend.map(l => l.label);
    expect(L).toEqual(expect.arrayContaining(['H < 28 m — bitta uzun tomondan yetib keladi (1)', 'H < 28 m — uzun tomon 8 m ichida yetmaydi (1)', 'H ≥ 28 m — ikkala uzun tomondan (666-band; hovli yoʻlagi) (1)']));
  });
});
