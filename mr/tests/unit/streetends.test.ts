import { describe, it, expect } from 'vitest';
import { blankProject, migrate, type Project } from '../../src/core/doc';
import { frame, type XY } from '../../src/core/geo';
import { deadEnds, endShapes, junctions, nextEnd } from '../../src/core/streetends';
import { computePlan } from '../../src/core/plan';
import { RULES } from '../../src/norms/rules';

/** 200 × 160 m uchastka; T shakl: koʻndalang koʻcha (chegaradan chegaraga) va undan ichkariga berk koʻcha */
function mk(deadLen = 70): Project {
  const d = blankProject(), fr = frame(d.origin), g = (p: XY) => fr.toGeo(p);
  d.site = { rings: [[[-100, -80], [100, -80], [100, 80], [-100, 80]].map(p => g(p as XY))] } as any;
  d.streets = [
    { id: 's1', axis: [g([-110, 0]), g([110, 0])], profile: 'mahalla-15' },
    { id: 's2', axis: [g([0, 0]), g([0, deadLen])], profile: 'mahalla-15' },
  ];
  return d;
}

describe('Berk koʻcha oxiri va aylanmalar (31.10)', () => {
  it('berk uch topiladi: chorrahadan uzunlik, chegaraga tegmaydi', () => {
    const des = deadEnds(mk());
    expect(des.length).toBe(1); expect(des[0].sid).toBe('s2'); expect(des[0].end).toBe('b'); expect(des[0].len).toBeCloseTo(70, 0);
  });
  it('57-band: burilish joyi yoʻq — fail; aylana qoʻyilsa — pass; 106-band: > 150 m — fail', () => {
    const r = RULES.find(x => x.id === 'dead-end-57')!, d = mk();
    expect(r.evaluate({} as any, d).status).toBe('fail');
    d.streets[1] = { ...d.streets[1], ...nextEnd(d.streets[1], 'b') };
    expect(d.streets[1].ends?.b).toBe('aylana');
    expect(r.evaluate({} as any, d).status).toBe('pass');
    const long = mk(160); long.site = { rings: [[[-100, -80], [100, -80], [100, 200], [-100, 200]].map(p => frame(long.origin).toGeo(p as XY))] } as any;
    long.streets[1] = { ...long.streets[1], ends: { b: 'maydon' } };
    expect(r.evaluate({} as any, long).status).toBe('fail');
  });
  it('aylana va aylanma qizil chiziq ichida — kvartal maydoni kamayadi; hujjatda saqlanadi', () => {
    const d = mk(), a0 = computePlan(d).blocks.reduce((s, b) => s + b.area, 0);
    const d2: Project = { ...d, streets: [d.streets[0], { ...d.streets[1], ends: { b: 'aylana' } }], rounds: [{ id: 'r1', at: frame(d.origin).toGeo([0, 0]), r: 14 }] };
    const a1 = computePlan(d2).blocks.reduce((s, b) => s + b.area, 0);
    expect(a0 - a1).toBeGreaterThan(400);
    expect(endShapes(d2).map(e => e.kind).sort()).toEqual(['aylana', 'halqa']);
    const back = migrate(JSON.parse(JSON.stringify(d2)));
    expect(back.streets[1].ends).toEqual({ b: 'aylana' }); expect(back.rounds?.length).toBe(1);
  });
  it('chorrahalar: T va X kesishuv', () => {
    const d = mk(); expect(junctions(d).length).toBe(1);
    const fr = frame(d.origin); d.streets.push({ id: 's3', axis: [fr.toGeo([50, -90]), fr.toGeo([50, 90])], profile: 'mahalla-15' });
    expect(junctions(d).length).toBe(2);
  });
});

describe('96-band: past qavatli uy uchastkasi ≥ 30 % yashil', () => {
  it('katta uy kichik uchastkada — fail, oddiy — pass', () => {
    const r = RULES.find(x => x.id === 'low-green-96')!, d = blankProject(), fr = frame(d.origin), g = (p: number[]) => fr.toGeo(p as XY);
    const b = (fp: number[][], pl: number[][]) => ({ id: 'b' + Math.random(), footprint: fp.map(g), floors: 2, nonRes: 0, use: 'turar', gen: { grp: 'g', kind: 'uy', plot: pl.map(g) } }) as any;
    d.buildings = [b([[0, 5], [12, 5], [12, 15], [0, 15]], [[-4, 0], [16, 0], [16, 22], [-4, 22]])];
    expect(r.evaluate({} as any, d).status).toBe('pass');
    d.buildings.push(b([[0, 1], [12, 1], [12, 13], [0, 13]], [[0, 0], [13, 0], [13, 14], [0, 14]]));
    expect(r.evaluate({} as any, d).status).toBe('fail');
  });
});
