import { describe, it, expect } from 'vitest';
import { landscape, greenBalance, PLAY_NORM } from '../../src/core/landscape';
import { blankProject, type Project } from '../../src/core/doc';
import { frame, type XY } from '../../src/core/geo';
const rect = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
function project(): Project {
  const p = blankProject('t'); const fr = frame(p.origin);
  p.site = { rings: [rect(-90, -80, 90, 80).map(fr.toGeo)] };
  p.buildings = [
    { id: 'n', footprint: rect(-80, 55, 80, 70).map(fr.toGeo), floors: 9, nonRes: 0, use: 'turar' },
    { id: 's', footprint: rect(-80, -70, 80, -55).map(fr.toGeo), floors: 9, nonRes: 0, use: 'turar' },
  ];
  return p;
}
describe('Hovli obodonlashtirish', () => {
  it('trotuar, maysa, maydonchalar va daraxtlar', () => {
    const y = landscape(project()); expect(y).toHaveLength(1);
    const a = y[0].areas; expect(a.paving).toBeGreaterThan(1500); expect(a.green).toBeGreaterThan(5000);
    const kinds = y[0].play.map(q => q.kind); expect(kinds).toContain('bolalar'); expect(kinds).toContain('sport');
    const pop = y[0].play.find(q => q.kind === 'bolalar')!.need / PLAY_NORM.bolalar; expect(pop).toBeGreaterThan(500);
    expect(y[0].trees.length).toBeGreaterThan(30);
  });
  it('yashillik balansi: 86-band asosi', () => {
    const p = project(), b = greenBalance(p, landscape(p));
    expect(b.share).toBeGreaterThan(0.25); expect(b.share).toBeLessThan(1); expect(b.blocksGreen).toBe(0);
  });
});

describe('yengillik: kesh', () => {
  it('bitta kvartal binosi oʻzgarsa — boshqa kvartal hovlisi qayta hisoblanmaydi (oʻsha obyekt)', () => {
    const p = project(), fr = frame(p.origin);
    // ikkinchi kvartal: koʻcha bilan ajratilgan
    p.streets = [{ id: 'k', axis: [[0, -100], [0, 100]].map(q => fr.toGeo(q as XY)), profile: 'turar-20' }];
    p.buildings = [
      { id: 'w', footprint: rect(-80, 55, -20, 70).map(fr.toGeo), floors: 9, nonRes: 0, use: 'turar' },
      { id: 'e', footprint: rect(20, 55, 80, 70).map(fr.toGeo), floors: 9, nonRes: 0, use: 'turar' },
    ];
    const y1 = landscape(p);
    const p2 = { ...p, buildings: p.buildings.map(b => b.id === 'e' ? { ...b, floors: 12 } : b) };
    const y2 = landscape(p2);
    expect(y1.length).toBe(2); expect(y2.length).toBe(2);
    const w1 = y1.find(y => y.trees.some(t => t[0] < 0))!, w2 = y2.find(y => y.trees.some(t => t[0] < 0))!;
    expect(w2.paving).toBe(w1.paving);            // gʻarbiy kvartal — keshdan (bir xil massiv)
    const e1 = y1.find(y => y !== w1)!, e2 = y2.find(y => y !== w2)!;
    expect(e2.paving).not.toBe(e1.paving);        // sharqiy — qayta hisoblandi
  });
});
