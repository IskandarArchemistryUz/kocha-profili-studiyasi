import { describe, it, expect } from 'vitest';
import { derive } from '../../src/core/derive';
import { RULES, GREEN_86, GREEN_474 } from '../../src/norms/rules';
import { blankProject, type Project } from '../../src/core/doc';
import { frame, type XY } from '../../src/core/geo';

const rect = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const run = (id: string, p: Project) => { const r = RULES.find(x => x.id === id)!; return { ...r.evaluate(derive(p), p), title: r.title, source: r.source }; };

function office(district: string, floors: number, use = 'ofis'): Project {
  const p = blankProject('t'); const fr = frame(p.origin);
  p.settings = { ...p.settings, district };
  p.site = { rings: [rect(-60, -60, 60, 60).map(fr.toGeo)] };
  p.zones = [{ id: 'z', at: fr.toGeo([0, 0]), use }] as Project['zones'];
  p.buildings = [{ id: 'o', footprint: rect(-20, -10, 20, 10).map(fr.toGeo), floors, nonRes: floors, use }] as Project['buildings'];
  return p;
}

describe('06.11 (c68): ShNQ 2.07.01-23 joriy tahrir', () => {
  it('86-band (01/2-15): koʻp kvartirali turar joy zonasi yashil hududi ≥ 30 %; 474-band umumiy — 25 %', () => {
    expect(GREEN_86).toBe(30); expect(GREEN_474).toBe(25);
    const g = RULES.find(r => r.id === 'green-86')!;
    expect(g.title).toContain('≥ 30 %'); expect(g.source.clause).toContain('01/2-15');
    expect(RULES.find(r => r.id === 'green-474')!.source.clause).toBe('474-band, 1-xatboshi');
  });
  it('green-474: hisob asosi — butun mavze (maktab/MTM bilan); 86-band asosi undan katta emas', () => {
    const p = office('1726', 2, 'turar'), d = derive(p), r = run('green-474', p);
    if (r.status !== 'na') { expect(r.limit).toBe('≥ 25'); expect(r.value!).toBeLessThanOrEqual(d.greenShareTotal * 100 + 1e-6); }
  });
  it('trees-474: Toshkent shahridan tashqarida — qoʻllanmaydi', () => {
    expect(run('trees-474', office('1727', 3)).status).toBe('na');
  });
  it('trees-474: Toshkentda noturar bino ≥ 300 m³ — har 100 m² ga 1 daraxt, 2 buta', () => {
    const r = run('trees-474', office('1726', 3)), gfa = 40 * 20 * 3;
    expect(r.status).not.toBe('na');
    expect(r.limit).toBe(`≥ ${Math.ceil(gfa / 100)}`);
    expect(r.note).toContain(`${Math.ceil(gfa / 100) * 2} buta`);
    expect(r.where?.bids).toEqual(['o']);
  });
  it('trees-474: sanoat va koʻp kvartirali uylar kirmaydi', () => {
    expect(run('trees-474', office('1726', 2, 'sanoat')).status).toBe('na');
    expect(run('trees-474', office('1726', 9, 'turar')).status).toBe('na');
  });
  it('mtm-plot izohi: 544-band ShNQ 2.08.02-23 ga (01/2-42), 2.08.02-09 emas', () => {
    const src = RULES.find(r => r.id === 'mtm-plot')!.evaluate.toString();
    expect(src).toContain('2.08.02-23'); expect(src).not.toContain('2.08.02-09');
  });
});
