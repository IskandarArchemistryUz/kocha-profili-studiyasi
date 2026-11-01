import { describe, it, expect } from 'vitest';
import { generate, DEFAULT_GEN } from '../../src/core/generator';
import { planApartments } from '../../src/core/apartments';
import { aptInterior } from '../../src/core/aptplan';
import { blankProject } from '../../src/core/doc';
import { apply } from '../../src/core/commands';
import { computePlan } from '../../src/core/plan';
import { frame, type XY } from '../../src/core/geo';

/**
 * 01.11 (egasi: «planda kvartira plani bittasi yoʻq»): ilovadagi kabi (qoʻshni seksiya devorlari, hovli tomoni) generatsiya qilingan
 * perimetr kvartallarda deyarli har kvartirada ichki reja; asosiy shablonlar mos kelmasa — oddiy «ustunli» zaxira reja.
 */
describe('kvartira ichki rejasi — ilova yoʻli bilan qamrov', () => {
  it('≥ 98,5 % kvartirada reja; zaxira rejada dahliz va sanuzel bor', () => {
    let tot = 0, ok = 0, simple = 0;
    for (const [W, H] of [[120, 100], [160, 140], [200, 160], [100, 100]]) for (const depth of [12, 15, 18]) {
      let d = blankProject('t') as any; const fr = frame(d.origin);
      d.site = { rings: [[[-W / 2, -H / 2], [W / 2, -H / 2], [W / 2, H / 2], [-W / 2, H / 2]].map(p => fr.toGeo(p as XY))] };
      const b = computePlan(d).blocks[0];
      const r = generate(b.rings[0], { ...DEFAULT_GEN, depth }, d.settings.floorHeight, { use: 'turar', aptNet: d.settings.aptNet, netToGross: d.settings.netToGross });
      d = apply(d, { type: 'replaceGroup', grp: 'g', sections: r.sections.map(x => ({ footprint: x.ring.map(fr.toGeo), floors: x.floors, nonRes: x.nonRes, use: 'turar', kind: x.kind, z0: x.z0, blind: x.blind })) } as any);
      for (const p of planApartments(d)) for (const a of p.layout.plan?.apts ?? []) {
        tot++; const I = aptInterior(a, p.layout.mods); if (!I) continue; ok++;
        if (I.simple) { simple++; expect(I.rooms.some(q => q.kind === 'prixojaya')).toBe(true); expect(I.rooms.some(q => q.kind === 'sanuzel')).toBe(true); }
      }
    }
    expect(tot).toBeGreaterThan(600);
    expect(ok / tot).toBeGreaterThanOrEqual(0.985);
    expect(simple / tot).toBeLessThan(0.08);
  }, 600_000);
});
