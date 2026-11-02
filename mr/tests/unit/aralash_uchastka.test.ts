import { describe, it, expect } from 'vitest';
import { blankProject } from '../../src/core/doc';
import { apply } from '../../src/core/commands';
import { landscape } from '../../src/core/landscape';
import { frame, type XY } from '../../src/core/geo';

const sq = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

/** 02.11 (egasi): kvartalda uchastkali uylar va boshqa bino birga boʻlsa ham uylar uchastkasi (panjara) chiziladi */
describe('aralash kvartal: uchastkali uylar + boshqa bino', () => {
  const mk = (withOther: boolean) => {
    let d = blankProject('t') as any; const fr = frame(d.origin), G = (p: XY) => fr.toGeo(p);
    d.site = { rings: [sq(-100, -60, 100, 60).map(G)] }; d.settings = { ...d.settings, yards: true };
    d = apply(d, { type: 'replaceGroup', grp: 'qator_1', drop: [], sections: [
      { footprint: sq(-80, -40, -70, -30).map(G), floors: 2, nonRes: 0, use: 'turar', kind: 'uy', plot: sq(-85, -50, -65, -20).map(G) },
      { footprint: sq(-60, -40, -50, -30).map(G), floors: 2, nonRes: 0, use: 'turar', kind: 'uy', plot: sq(-65, -50, -45, -20).map(G) },
    ] } as any);
    if (withOther) d = apply(d, { type: 'addBuilding', footprint: sq(20, 0, 50, 15).map(G), floors: 5, nonRes: 0, use: 'turar' } as any);
    return d;
  };
  it('faqat uylar — uchastka panjaralari bor', () => {
    expect(landscape(mk(false)).some(y => (y.fences?.length ?? 0) >= 2)).toBe(true);
  });
  it('uylar + boshqa bino — panjaralar ham, umumiy hovli ham', () => {
    const ys = landscape(mk(true));
    expect(ys.some(y => (y.fences?.length ?? 0) >= 2)).toBe(true);
    expect(ys.length).toBeGreaterThanOrEqual(2);
  });
});
