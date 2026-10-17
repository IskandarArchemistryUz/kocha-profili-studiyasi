import { describe, it, expect } from 'vitest';
import { generate, DEFAULT_GEN } from '../../src/core/generator';
import { landscape } from '../../src/core/landscape';
import { migrate, blankProject } from '../../src/core/doc';
import { apply } from '../../src/core/commands';
import type { XY } from '../../src/core/geo';

const rect = (w: number, h: number): XY[] => [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
describe('noturar generatorlar', () => {
  it('ofis plitalari: 18 m korpus, barcha qavatlar noturar', () => {
    const r = generate(rect(160, 120), { ...DEFAULT_GEN, typology: 'ofis_plita', maxF: 8, minF: 6 });
    expect(r.sections.length).toBeGreaterThan(2);
    expect(r.sections.every(s => s.nonRes === s.floors && s.use === 'ofis')).toBe(true);
  });
  it('ofis minoralari: stilobat + minoralar (z0 = 2)', () => {
    const r = generate(rect(160, 120), { ...DEFAULT_GEN, typology: 'ofis_minora', towerF: 16 });
    expect(r.sections[0].kind).toBe('stilobat'); expect(r.sections.filter(s => s.kind === 'minora').length).toBeGreaterThan(0);
    expect(r.sections.filter(s => s.kind === 'minora').every(s => s.z0 === 2 && s.floors === 14)).toBe(true);
  });
  it('savdo markazi: bitta blok ≤ 120 × 80, 2 qavat, yer usti parkovka', () => {
    const r = generate(rect(200, 150), { ...DEFAULT_GEN, typology: 'savdo_blok', maxF: 2, parking: 'yer_usti' });
    expect(r.sections.length).toBe(1); expect(r.sections[0].kind).toBe('savdo'); expect(r.sections[0].floors).toBe(2);
    expect(r.parking?.kind).toBe('yer_usti'); expect(r.parking!.spaces).toBeGreaterThan(50);
  });
});
describe('ochiq joylar eskizi', () => {
  const mk = (use: 'yashil' | 'maydon' | 'sport') => {
    let doc = blankProject('t'); const o = doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), g = (x: number, y: number): [number, number] => [o[0] + x / mx, o[1] + y / 111132];
    doc = apply(doc, { type: 'setSite', rings: [[g(-80, -60), g(80, -60), g(80, 60), g(-80, 60)]] });
    doc = apply(doc, { type: 'setZones', zones: [{ id: 'z1', at: g(0, 0), use }] });
    return migrate(doc);
  };
  it('park: yoʻlaklar, markaz maydoncha, daraxtlar; skver: qoplama maydon va chetki daraxtlar; sport: maydonchalar', () => {
    const park = landscape(mk('yashil'))[0]; expect(park.paths.length).toBeGreaterThan(0); expect(park.paving.length).toBe(1); expect(park.trees.length).toBeGreaterThan(40);
    const sq = landscape(mk('maydon'))[0]; expect(sq.areas.paving / sq.areas.block).toBeGreaterThan(0.3); expect(sq.trees.length).toBeGreaterThan(10);
    const sp = landscape(mk('sport'))[0]; expect(sp.play.length).toBeGreaterThanOrEqual(2);
  });
});
