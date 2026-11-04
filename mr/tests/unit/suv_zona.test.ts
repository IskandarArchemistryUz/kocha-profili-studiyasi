/**
 * 04.11 (Murad Buildings sinovi, 6-band; egasi: «981-ni qoʻlla»): suvni muhofaza qilish zonasi va qirgʻoq boʻyi mintaqasi —
 * VM 981-son nizomi (18, 21, 29, 30, 31, 32, 35-bandlar). Hujjat LexUz da kuchini yoʻqotgan — flag doim TALQIN.
 */
import { describe, it, expect } from 'vitest';
import { suvZones, szzOf, limitZones, cleanLimit, type Limit } from '../../src/core/limits';
import { limitChecks } from '../../src/core/limitcheck';
import { parseLimitsOsm, limitsQuery } from '../../src/context/limitsosm';
import { blankProject, type LngLat } from '../../src/core/doc';
import { apply } from '../../src/core/commands';
import { RULES } from '../../src/norms/rules';
import { frame, type XY } from '../../src/core/geo';

const sq = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const S = (o: Partial<Limit>): Limit => ({ id: 'w1', kind: 'suv', status: 'saqlanadi', src: 'qolda', ...o } as Limit);
const mk = (limits: Limit[], blds: XY[][]) => {
  let d = blankProject('t') as any; const fr = frame(d.origin), G = (p: XY) => fr.toGeo(p);
  d.site = { rings: [sq(-300, -300, 300, 300).map(G)] };
  for (const l of limits) d = apply(d, { type: 'addLimit', limit: { ...l, ...(l.rings ? { rings: l.rings.map(r => (r as unknown as XY[]).map(G)) } : {}), ...(l.axis ? { axis: (l.axis as unknown as XY[]).map(G) } : {}) } } as any);
  blds.forEach((r, i) => { d = apply(d, { type: 'addBuilding', id: `b${i}`, footprint: r.map(G), floors: 9, nonRes: 0, use: 'turar' } as any); });
  return d;
};
const rule = (d: any) => RULES.find(r => r.id === 'water-981')!.evaluate({} as any, d);

describe('suv obyekti zonalari (981-son nizom)', () => {
  it('kengliklar — oraliqning quyi chegarasi, doim TALQIN', () => {
    expect(suvZones(S({ suv: { t: 'daryo', q: 1 } })).zone.m).toBe(300);
    expect(suvZones(S({ suv: { t: 'daryo', q: 3 } })).zone.m).toBe(50);
    expect(suvZones(S({ suv: { t: 'daryo' } })).zone.m).toBe(100);   // toifa yoʻq — oʻrta
    expect(suvZones(S({ suv: { t: 'daryo', q: 4 } })).shore.m).toBe(25);
    expect(suvZones(S({ suv: { t: 'kol' } }))).toMatchObject({ zone: { m: 50 }, shore: { m: 35 } });
    expect(suvZones(S({ suv: { t: 'kanal', q: 2 } }))).toMatchObject({ zone: { m: 0 }, shore: { m: 4.5 } });
    expect(suvZones(S({ suv: { t: 'kanal', q: 1 } }))).toMatchObject({ zone: { m: 50 }, shore: { m: 0 } });
    expect(suvZones(S({ suv: { t: 'kanal' } }))).toMatchObject({ zone: { m: 50 }, shore: { m: 4.5 } });
    const z = suvZones(S({ suv: { t: 'kol' } }));
    expect(z.zone.flag).toBe('TALQIN'); expect(z.zone.ref).toContain('981'); expect(z.zone.ref).toContain('kuchini yoʻqotgan');
    expect(suvZones(S({ suv: { t: 'kol' }, szz: 120, qir: 50 }))).toMatchObject({ zone: { m: 120, table: 50 }, shore: { m: 50, table: 35 } });
    expect(szzOf(S({ suv: { t: 'kol' } }), 1).m).toBe(50);
  });
  it('koʻl: qirgʻoq boʻyi — qurib boʻlmaydi, zona — SMZ emas (water roʻyxati)', () => {
    const d = mk([S({ suv: { t: 'kol' }, rings: [sq(-40, -40, 40, 40) as any] })], [sq(60, -10, 70, 10), sq(80, -10, 88, 10), sq(200, -10, 210, 10)]);
    const z = limitZones(d);
    expect(z.soft).toHaveLength(0); expect(z.water).toHaveLength(1); expect(z.water[0].m).toBe(50); expect(z.hard.length).toBeGreaterThan(0);
    const c = limitChecks(d);
    expect(c.suv.filter(x => x.shore).map(x => x.bid)).toEqual(['b0']);       // 20–30 m — qirgʻoq boʻyi (35 m)
    expect(c.suv.filter(x => !x.shore).map(x => x.bid)).toEqual(['b1']);   // suv chetidan 40–48 m — zona (35–50 m)
    expect(c.szz).toHaveLength(0); expect(c.manual).toHaveLength(0);
    const r = rule(d); expect(r.status).toBe('fail'); expect(r.value).toBe(1);
  });
  it('daryo oʻqi: zonadagi bino — koʻrib chiqish; suv yoʻq — na', () => {
    const d = mk([S({ suv: { t: 'daryo', q: 3 }, axis: [[-300, -150], [300, -150]] as any })], [sq(-10, -110, 10, -100)]);
    const r = rule(d); expect(r.status).toBe('review'); expect(r.value).toBe(1);
    expect(rule(mk([], [])).status).toBe('na');
    expect(rule(mk([S({ suv: { t: 'daryo', q: 3 }, axis: [[-300, -150], [300, -150]] as any })], [sq(0, 100, 10, 110)])).status).toBe('review');
  });
  it('fayldan oʻqish: oʻq bilan suv obyekti saqlanadi, notoʻgʻri toifa tashlanadi', () => {
    const l = cleanLimit({ id: 'x', kind: 'suv', axis: [[69.2, 41.2], [69.21, 41.2]], suv: { t: 'daryo', q: 9 }, qir: 30 });
    expect(l).toMatchObject({ kind: 'suv', suv: { t: 'daryo' }, qir: 30 }); expect(l!.suv!.q).toBeUndefined();
    expect(cleanLimit({ id: 'y', kind: 'suv' })).toBeNull();
  });
  it('OSM: waterway va natural=water', () => {
    const O: LngLat = [69.25, 41.27], fr = frame(O), G = (x: number, y: number) => { const g = fr.toGeo([x, y] as XY); return { lon: g[0], lat: g[1] }; };
    const site: LngLat[] = [[-200, -200], [200, -200], [200, 200], [-200, 200]].map(p => fr.toGeo(p as XY));
    expect(limitsQuery(site)).toContain('waterway'); expect(limitsQuery(site)).toContain('"natural"="water"');
    const ls = parseLimitsOsm({ elements: [
      { type: 'way', id: 1, tags: { waterway: 'river', name: 'Chirchiq' }, geometry: [G(-500, 300), G(500, 300)] },
      { type: 'way', id: 2, tags: { waterway: 'canal' }, geometry: [G(-500, 230), G(500, 230)] },
      { type: 'way', id: 3, tags: { natural: 'water' }, geometry: [G(250, -50), G(300, -50), G(300, 0), G(250, 0), G(250, -50)] },
      { type: 'way', id: 4, tags: { waterway: 'ditch' }, geometry: [G(-500, 900), G(500, 900)] },   // uzoq
    ] } as never, site);
    const by = (id: number) => ls.find(l => l.osm === id);
    expect(by(1)).toMatchObject({ kind: 'suv', suv: { t: 'daryo', q: 2 }, name: 'Chirchiq' }); expect(by(1)!.axis).toHaveLength(2);
    expect(by(2)).toMatchObject({ kind: 'suv', suv: { t: 'kanal' } }); expect(by(2)!.suv!.q).toBeUndefined();
    expect(by(3)).toMatchObject({ kind: 'suv', suv: { t: 'kol' } });
    expect(by(4)).toBeUndefined();
  });
});
