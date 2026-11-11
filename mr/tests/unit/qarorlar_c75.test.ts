import { describe, it, expect } from 'vitest';
import { QAB100_DENY, QAB100_BASIS, objZone, OBJ, type Limit } from '../../src/core/limits';
import { limitChecks } from '../../src/core/limitcheck';
import { blankProject, type Project } from '../../src/core/doc';
import { apply } from '../../src/core/commands';
import { derive, schoolCapacity } from '../../src/core/derive';
import { schoolVolume, SCHOOL_M2, schoolPlotPer } from '../../src/core/mtmrule';
import { tepRows } from '../../src/core/tep';
import { RULES } from '../../src/norms/rules';
import { frame, type XY } from '../../src/core/geo';

/** 11.11 (c75): egasining qarorlari — AYoQSh qatorlari, qabristondan 100 m (jamoat binolari qamrovi), maktab sigʻimi va bino hajmi */
const sq = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const rule = (id: string, d: Project) => RULES.find(r => r.id === id)!.evaluate(derive(d), d);

describe('c75-1: AYoQSh — sukut 414, sharti bilan 491 / 492', () => {
  it('414 — 4-sinf 100 m; 491 va 492 — 5-sinf 50 m (SanQvaN 0103-25, 1-ilova)', () => {
    expect(objZone({ obj: 'yoqilgi_414' })).toMatchObject({ m: 100, cls: 'IV' });
    expect(objZone({ obj: 'yoqilgi_491' })).toMatchObject({ m: 50, cls: 'V' }); expect(objZone({ obj: 'yoqilgi_491' }).ref).toContain('5-sinf, 491');
    expect(objZone({ obj: 'agtksh_492' })).toMatchObject({ m: 50, cls: 'V' }); expect(objZone({ obj: 'agtksh_492' }).ref).toContain('5-sinf, 492');
    expect(OBJ.filter(r => r.g === 'yoqilgi').map(r => r.key).slice(0, 3)).toEqual(['yoqilgi_414', 'yoqilgi_491', 'agtksh_492']);
  });
});

describe('c75-2: qabristondan 100 m — jamoat binolari ShNQ 2.08.02-23 qamrovida', () => {
  const mk = (blds: { r: XY[]; use: string }[]) => {
    let d = blankProject('t') as any; const fr = frame(d.origin), G = (p: XY) => fr.toGeo(p);
    d.site = { rings: [sq(-300, -300, 300, 300).map(G)] };
    d = apply(d, { type: 'addLimit', limit: { id: 'q1', kind: 'qabriston', status: 'saqlanadi', src: 'qolda', rings: [sq(-20, -20, 20, 20).map(G)], sub: { open: true, rural: true } } as Limit } as any);
    blds.forEach((b, i) => { d = apply(d, { type: 'addBuilding', id: `b${i}`, footprint: b.r.map(G), floors: 3, nonRes: 3, use: b.use } as any); });
    return d as Project;
  };
  it('mehmonxona, maʼmuriy, ofis — NORMA (VM 101 50-band + ShNQ 2.08.02-23: 170, 8-bob, 882)', () => {
    for (const u of ['mehmonxona', 'mamuriy', 'ofis'] as const) {
      expect(QAB100_DENY).toContain(u); expect(QAB100_BASIS[u]?.flag).toBe('NORMA');
      expect(QAB100_BASIS[u]?.ref).toContain('50-band'); expect(QAB100_BASIS[u]?.ref).toContain('882-band');
    }
    expect(QAB100_BASIS.mehmonxona?.ref).toContain('170-band'); expect(QAB100_BASIS.ofis?.ref).toContain('8-bob');
  });
  it('100 m ichida: mehmonxona va ofis — mos emas; garaj, avtoturargoh, ombor, sanoat, muhandislik — ruxsat', () => {
    const d = mk([{ r: sq(60, -10, 80, 10), use: 'mehmonxona' }, { r: sq(60, 30, 80, 50), use: 'ofis' }, { r: sq(60, -60, 80, -40), use: 'logistika' }, { r: sq(-80, -10, -60, 10), use: 'sanoat' }, { r: sq(-10, 60, 10, 80), use: 'texnik' }, { r: sq(-10, -80, 10, -60), use: 'avtoturargoh' }]);
    const c = limitChecks(d);
    expect([...new Set(c.qab.map(x => x.use))].sort()).toEqual(['mehmonxona', 'ofis']);
    for (const u of ['logistika', 'sanoat', 'kommunal', 'transport', 'texnik', 'avtoturargoh', 'himoya']) expect(QAB100_DENY).not.toContain(u);
    const r = rule('qab-100', d);
    expect(r).toMatchObject({ status: 'fail', value: 2 });
    expect(r.note).toContain('Mehmonxona: 1 ta (NORMA)'); expect(r.note).toContain('Ofis: 1 ta (NORMA)'); expect(r.note).toContain('170-band');
  });
});

describe('c75-3: maktab — bino boʻlmasa sigʻim 0; bino hajmi sigʻimdan', () => {
  const project = (bld: XY[] | null, floors = 3): Project => {
    const p = blankProject('t'); const fr = frame(p.origin);
    p.site = { rings: [sq(-90, -70, 90, 70).map(fr.toGeo)] };
    p.zones = [{ id: 'z', at: fr.toGeo([0, 0]), use: 'maktab' }] as Project['zones'];
    p.buildings = bld ? [{ id: 's', footprint: bld.map(fr.toGeo), floors, nonRes: floors, use: 'maktab' }] as Project['buildings'] : [];
    return p;
  };
  it('binosiz maktab parseli — 0 oʻrin (avval parsel maydonidan); qoida school-plot — koʻrib chiqish', () => {
    const d = derive(project(null));
    expect(d.schoolPlots).toHaveLength(1); expect(d.schoolPlots[0].bld).toBe(0); expect(d.schoolPlots[0].plot).toBe(schoolCapacity(d.schoolPlots[0].area));
    expect(d.schoolPlots[0].plot).toBeGreaterThan(500); expect(d.schoolCap).toBe(0);
    const r = rule('school-plot', project(null)); expect(r.status).toBe('review'); expect(r.note).toContain('bino yoʻq');
  });
  it('bino bor — uchastka (41-jadval) va bino (24 m²/oʻrin, 5-ilova) sigʻimining kichigi; izohda «a / b oʻrin»', () => {
    const p = project(sq(-60, 20, 60, 40)), d = derive(p), gfa = 120 * 20 * 3;
    expect(d.schoolPlots[0]).toMatchObject({ bld: 1, floors: 3, built: Math.floor(gfa / SCHOOL_M2) });
    expect(d.schoolCap).toBe(Math.min(d.schoolPlots[0].plot, Math.floor(gfa / SCHOOL_M2)));
    const r = rule('school-plot', p); expect(r.note).toContain(`${d.schoolPlots[0].built} / ${d.schoolPlots[0].plot} oʻrin`);
    const tep = tepRows(d, p).find(x => x.name.startsWith('Maktab oʻrinlari'))!;
    expect(tep.name).toBe('Maktab oʻrinlari (binosi bor parsellar)'); expect(tep.note).toContain(`${d.schoolPlots[0].built} / ${d.schoolPlots[0].plot} oʻrin`);
  });
  it('schoolVolume: GFA = oʻrin × 24 (5-ilova); qavat — QMQ 2.01.03-19 (8–9 ball ≤ 3, > 9 ≤ 2), past seysmiklikda ANDOZA 3', () => {
    expect(schoolVolume(1000, 8)).toMatchObject({ gfa: 24000, floors: 3, footprint: 8000, plot: 10000, per: 10, floorsFlag: 'NORMA' });
    expect(schoolVolume(800, 10)).toMatchObject({ gfa: 19200, floors: 2, plot: 12000, per: 15 });
    expect(schoolVolume(600, 7)).toMatchObject({ floors: 3, floorsFlag: 'ANDOZA', plot: 12000, per: 20 });
    expect(schoolVolume(600, 9, 4).floors).toBe(3); expect(schoolVolume(600, 7, 4).floors).toBe(4);
    expect([schoolPlotPer(660), schoolPlotPer(661), schoolPlotPer(989), schoolPlotPer(990)]).toEqual([20, 15, 15, 10]);
  });
});
