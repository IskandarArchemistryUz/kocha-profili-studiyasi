import { describe, it, expect } from 'vitest';
import { blankProject, type Project } from '../../src/core/doc';
import { frame } from '../../src/core/geo';
import { stageSheet, stageSums } from '../../src/core/stagesheet';
import { sheetSvg, SHEET_DEFAULT } from '../../src/core/sheet';

function doc(): Project {
  const d = blankProject(), fr = frame(d.origin), g = (x: number, y: number) => fr.toGeo([x, y]);
  const box = (x0: number, y0: number) => [g(x0, y0), g(x0 + 20, y0), g(x0 + 20, y0 + 12), g(x0, y0 + 12)];
  return { ...d, site: { rings: [[g(-10, -10), g(110, -10), g(110, 60), g(-10, 60)]] },
    buildings: [0, 1, 2, 3].map(i => ({ id: `b${i}`, footprint: box(i * 25, 0), floors: 5 + i, nonRes: 0, use: 'turar', stage: i < 2 ? 1 : i === 2 ? 2 : 3 } as any)) };
}

describe('Qurilish navbatlari ketma-ketligi (KCAP uslubi)', () => {
  it('jamlanma: navbatlar, GFA ortib boradi', () => {
    const s = stageSums(doc());
    expect(s.map(x => [x.st, x.n])).toEqual([[1, 2], [2, 1], [3, 1]]);
    expect(s[0].gfa).toBeCloseTo(240 * 5 + 240 * 6, 0);
    expect(s[2].cumGfa).toBeCloseTo(240 * (5 + 6 + 7 + 8), 0);
  });
  it('har navbat — alohida katak; joriy navbat binolari rangda, oldingilari qurilgan', () => {
    const inner = stageSheet(doc(), s => s), body = inner.body(0, 0, 300, 250);
    expect((body.match(/data-stage-panel=/g) ?? []).length).toBe(3);
    const p2 = body.split('data-stage-panel="2"')[1].split('</g>')[0];
    expect((p2.match(/data-stage-cur/g) ?? []).length).toBe(1);
    expect((p2.match(/fill="#4a4844"/g) ?? []).length).toBe(2);
    expect(body).toContain('100 %');
    const r = sheetSvg(doc(), null, { ...SHEET_DEFAULT, mode: 'fazalar' }, new Date(2026, 10, 12), false, s => s, inner);
    expect(r.svg).toContain('Qurilish navbatlari ketma-ketligi');
  });
  it('binolar yoʻq — yozuv', () => {
    expect(stageSheet(blankProject(), s => s).body(0, 0, 300, 200)).toContain('Binolar yoʻq');
  });
});
