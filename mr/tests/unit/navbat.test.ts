import { describe, it, expect } from 'vitest';
import { sheetSvg, stageRows, stageOf, SHEET_DEFAULT, STAGE_COL, type SheetOpts } from '../../src/core/sheet';
import { blankProject } from '../../src/core/doc';
import { apply } from '../../src/core/commands';
import { frame, type XY } from '../../src/core/geo';

/** 04.11 (egasi: tahlil varaqlari — qurilish navbati) */
describe('qurilish navbati', () => {
  const mk = () => { const p = blankProject('t'), fr = frame(p.origin), R = (x: number): XY[] => [[x, 0], [x + 20, 0], [x + 20, 12], [x, 12]];
    p.site = { rings: [[[-50, -50], [150, -50], [150, 60], [-50, 60]].map(q => fr.toGeo(q as XY))] };
    p.buildings = [{ id: 'a', footprint: R(0).map(fr.toGeo), floors: 9, nonRes: 0, use: 'turar' }, { id: 'b', footprint: R(40).map(fr.toGeo), floors: 5, nonRes: 0, use: 'turar', stage: 2 }, { id: 'c', footprint: R(80).map(fr.toGeo), floors: 2, nonRes: 0, use: 'ofis', stage: 2 }] as any;
    return p; };
  it('navbat: yoʻq — 1; jadval har navbat boʻyicha (GFA = dogʻ × qavat)', () => {
    expect(stageOf({})).toBe(1); expect(stageOf({ stage: 9 })).toBe(5);
    const r = stageRows(mk());
    const t = r.map(x => `${x.t}=${x.vt}`).join('|');
    expect(t).toMatch(/1-navbat=\|Binolar soni=1\|Umumiy maydon \(GFA\), m²=2 160/);
    expect(t).toMatch(/2-navbat=\|Binolar soni=2\|Umumiy maydon \(GFA\), m²=1 680/);
    expect(t).toMatch(/Jami, m²=3 840/);
  });
  it('varaq: binolar navbat rangida, oʻng ustunda jadval', () => {
    const o = { ...SHEET_DEFAULT, kind: 'navbat', show: { ...SHEET_DEFAULT.show } } as SheetOpts, r = sheetSvg(mk(), null, o);
    expect(r.svg).toContain(`fill="${STAGE_COL[0]}"`); expect(r.svg).toContain(`fill="${STAGE_COL[1]}"`);
    expect(r.svg).toContain('id="Navbatlar"');
    expect(r.legend.map(l => l.label)).toEqual(expect.arrayContaining(['1-navbat', '2-navbat']));
  });
  it('navbat — tahrir emas (qayta generatsiyada soʻralmaydi) va qayta generatsiyada saqlanadi', () => {
    let p = mk(); p.buildings = p.buildings.map(b => ({ ...b, gen: { grp: 'g1', kind: 'oddiy' } })) as any;
    p = apply(p, { type: 'updateBuilding', id: 'a', patch: { stage: 3 } });
    expect(p.buildings.find(b => b.id === 'a')!.gen!.edited).toBeUndefined();
    p = apply(p, { type: 'replaceGroup', grp: 'g1', sections: [{ footprint: p.buildings[0].footprint, floors: 4, nonRes: 0, use: 'turar', kind: 'oddiy' }] } as any);
    expect(p.buildings.every(b => (b.stage ?? 1) > 1)).toBe(true);
  });
});
