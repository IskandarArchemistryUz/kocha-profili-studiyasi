import { describe, it, expect } from 'vitest';
import { proposeStages } from '../../src/core/phasing';
import { blankProject, type Project } from '../../src/core/doc';
import { frame, type XY } from '../../src/core/geo';

/** 12.11 (eski navbat, 6-band): navbatlarni taklif qilish — chegaradan ichkariga, ijtimoiy 1-navbatda, GFA teng */
const rect = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
function project(): Project {
  const p = blankProject('Sinov'); const fr = frame(p.origin);
  p.site = { rings: [rect(-300, -100, 300, 100).map(fr.toGeo)] };
  // 6 ta turar joy binosi chapdan oʻngga (chegaraga yaqinlik bir xil — tartib GFA boʻyicha) + chuqurroq ichkarida ikkitasi, markazda maktab
  p.buildings = [
    ...[-260, -160, 60, 160].map((x, i) => ({ id: 'e' + i, footprint: rect(x, 70, x + 60, 85).map(fr.toGeo), floors: 9, nonRes: 0, use: 'turar' as const })),
    ...[-120, 80].map((x, i) => ({ id: 'i' + i, footprint: rect(x, -10, x + 60, 5).map(fr.toGeo), floors: 9, nonRes: 0, use: 'turar' as const })),
    { id: 's', footprint: rect(-20, -40, 20, -20).map(fr.toGeo), floors: 3, nonRes: 0, use: 'maktab' as const },
  ];
  return p;
}
describe('navbatlarni taklif qilish', () => {
  it('chegaraga yaqin binolar oldin, ichkaridagilar keyin; maktab 1-navbatda; navbatlar soni ≤ n', () => {
    const P = proposeStages(project(), 3);
    expect(P.stage.get('s')).toBe(1);
    const st = (id: string) => P.stage.get(id)!;
    expect(Math.max(st('i0'), st('i1'))).toBeGreaterThanOrEqual(Math.max(st('e0'), st('e1'), st('e2'), st('e3')));
    expect(new Set(P.stage.values()).size).toBeLessThanOrEqual(3);
    expect([...P.stage.values()].every(v => v >= 1 && v <= 3)).toBe(true);
  });
  it('GFA navbatlar boʻyicha taxminan teng (2 navbat — 6 bir xil bino: 3 + 3)', () => {
    const P = proposeStages(project(), 2), res = [...P.stage].filter(([id]) => id !== 's').map(([, v]) => v);
    expect(res.filter(v => v === 1).length).toBe(3); expect(res.filter(v => v === 2).length).toBe(3);
  });
});
