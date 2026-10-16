import { describe, it, expect } from 'vitest';
import { blankProject, migrate } from '../../src/core/doc';
import { apply } from '../../src/core/commands';
import { frame } from '../../src/core/geo';
import { computePlan, corridor } from '../../src/core/plan';
import { derive } from '../../src/core/derive';
import { evaluateAll } from '../../src/norms/rules';
import { checkProfile, profileById, profileWidth, PROFILES } from '../../src/core/profiles';
import { offsetLine, projectStreetsGeo } from '../../src/scene/streets3d';

function withSite() {
  let d = blankProject(); const fr = frame(d.origin);
  d = apply(d, { type: 'setSite', rings: [[[-100, -50], [100, -50], [100, 50], [-100, 50]].map(p => fr.toGeo(p as [number, number]))] });
  return { d, fr };
}

describe('Reja: koʻchalar va kvartallar', () => {
  it('koʻcha uchastkani ikki kvartalga boʻladi, maydonlar toʻgʻri', () => {
    let { d, fr } = withSite();
    d = apply(d, { type: 'addStreet', axis: [[0, -80], [0, 80]].map(p => fr.toGeo(p as [number, number])), profile: 'mahalla-15' });
    const p = computePlan(d);
    expect(p.blocks).toHaveLength(2);
    p.blocks.forEach(b => expect(b.area).toBeCloseTo(92.5 * 100, -1));
    expect(p.corridorArea).toBeCloseTo(15 * 100, -1);
    const dd = derive(d); expect(dd.blocks).toBe(2); expect(dd.streetArea).toBeCloseTo(1500, -1);
  });
  it('zona belgisi kvartalga tegishli; yashil — kishi boshiga hisob', () => {
    let { d, fr } = withSite();
    d = apply(d, { type: 'addStreet', axis: [[0, -80], [0, 80]].map(p => fr.toGeo(p as [number, number])), profile: 'mahalla-15' });
    d = apply(d, { type: 'setZones', zones: [{ id: 'z1', at: fr.toGeo([50, 0]), use: 'yashil' }] });
    d = apply(d, { type: 'addBuilding', footprint: [[-80, -30], [-20, -30], [-20, -10], [-80, -10]].map(p => fr.toGeo(p as [number, number])), floors: 9, nonRes: 0 });
    const p = computePlan(d);
    expect(p.blocks.find(b => b.use === 'yashil')!.centroid[0]).toBeGreaterThan(0);
    const dd = derive(d);
    expect(dd.greenArea).toBeCloseTo(9250, -1);
    expect(dd.greenPerPerson).toBeCloseTo(9250 / dd.population, 3);
    expect(evaluateAll(dd, d).find(r => r.id === 'green-36')!.status).toBe('pass');
    expect(evaluateAll(dd, d).find(r => r.id === 'green-86')!.status).toBe('pass');
  });
  it('kesishgan koʻchalar — toʻrt kvartal; koridor uchlari toʻgʻri', () => {
    let { d, fr } = withSite();
    d = apply(d, { type: 'addStreet', axis: [[0, -80], [0, 80]].map(p => fr.toGeo(p as [number, number])), profile: 'mahalla-15' });
    d = apply(d, { type: 'addStreet', axis: [[-150, 0], [150, 0]].map(p => fr.toGeo(p as [number, number])), profile: 'turar-20' });
    expect(computePlan(d).blocks).toHaveLength(4);
    const c = corridor([[0, 0], [10, 0], [10, 10]], 2);
    expect(c.length).toBe(1);
  });
  it('profil kengliklari va qizil chiziq ofseti', () => {
    expect(PROFILES.map(profileWidth)).toEqual([8.5, 15, 12, 20, 40, 45]);
    PROFILES.forEach(p => expect(checkProfile(p), p.id).toEqual([]));
    const bad = { ...PROFILES[1], parts: [{ k: 'trotuar' as const, w: 1.5 }, { k: 'qatnov' as const, w: 5, lanes: 2 }, { k: 'trotuar' as const, w: 1.5 }] };
    expect(checkProfile(bad).map(i => i.what)).toEqual(['Qizil chiziqlardagi kenglik', 'Tasma kengligi', 'Piyoda yoʻlagi', 'Piyoda yoʻlagi']);
    const o = offsetLine([[0, 0], [10, 0], [10, 10]], 2);
    expect(o[0]).toEqual([0, 2]); expect(o[1][0]).toBeCloseTo(8); expect(o[1][1]).toBeCloseTo(2);
    const g = projectStreetsGeo([{ id: 'a', axis: [[0, 0], [100, 0]], parts: PROFILES[3].parts }], () => 0);
    expect(g.layers.qatnov.length).toBeGreaterThan(0); expect(g.red).toHaveLength(2); expect(g.trees.length).toBeGreaterThan(10);
  });
  it('3-sxema: koʻchalar, zonalar, keep fayldan qayta oʻqiladi', () => {
    let { d, fr } = withSite();
    d = apply(d, { type: 'addStreet', axis: [[0, -80], [0, 80]].map(p => fr.toGeo(p as [number, number])), profile: 'tuman-30' });
    d = apply(d, { type: 'setKeep', keep: [5, 5, 7] });
    const m = migrate(JSON.parse(JSON.stringify(d)));
    expect(m.streets[0].profile).toBe('tuman-30'); expect(profileById('tuman-30').id).toBe('tuman-40'); expect(m.keep).toEqual([5, 7]);
  });
});
