import { describe, it, expect } from 'vitest';
import { generate, DEFAULT_GEN } from '../../src/core/generator';
import { planApartments } from '../../src/core/apartments';
import { aptInterior } from '../../src/core/aptplan';
import { blankProject } from '../../src/core/doc';
import { apply } from '../../src/core/commands';
import { computePlan } from '../../src/core/plan';
import { frame, type XY } from '../../src/core/geo';

/** 04.11 (egasi): «1 xonali uchun studiya formati» — sozlama yoqilsa 1 xonalilar oshxonasiz (oshxona qatori umumiy xonada) */
describe('1 xonali — studiya', () => {
  it('studio1: 1 xonalilarning koʻpchiligi studiya (alohida oshxona yoʻq), koʻp xonalilar oʻzgarmaydi', () => {
    let d = blankProject('t') as any; const fr = frame(d.origin), W = 160, H = 140;
    d.site = { rings: [[[-W / 2, -H / 2], [W / 2, -H / 2], [W / 2, H / 2], [-W / 2, H / 2]].map(p => fr.toGeo(p as XY))] };
    d.settings = { ...d.settings, aptMix: [60, 30, 10, 0] };
    const b = computePlan(d).blocks[0];
    const r = generate(b.rings[0], { ...DEFAULT_GEN, depth: 15 }, d.settings.floorHeight, { use: 'turar', aptNet: d.settings.aptNet, netToGross: d.settings.netToGross });
    d = apply(d, { type: 'replaceGroup', grp: 'g', sections: r.sections.map(x => ({ footprint: x.ring.map(fr.toGeo), floors: x.floors, nonRes: x.nonRes, use: 'turar', kind: x.kind, z0: x.z0, blind: x.blind })) } as any);
    const count = (doc: any) => { let one = 0, kit = 0, multi = 0, multiKit = 0; for (const p of planApartments(doc)) for (const a of p.layout.plan?.apts ?? []) { const I = aptInterior(a, p.layout.mods); if (!I) continue; const k = I.rooms.some(q => q.kind === 'oshxona'); if ((a.rooms || 1) <= 1) { one++; if (k) kit++; } else { multi++; if (k) multiKit++; } } return { one, kit, multi, multiKit }; };
    const a = count(d), s = count({ ...d, settings: { ...d.settings, studio1: true } });
    expect(a.one).toBeGreaterThan(10);
    expect(s.one).toBe(a.one);
    expect(s.kit).toBeLessThan(a.kit);
    expect(s.kit / s.one).toBeLessThan(0.3);
    expect(s.multiKit).toBe(a.multiKit);
  }, 300_000);
});
