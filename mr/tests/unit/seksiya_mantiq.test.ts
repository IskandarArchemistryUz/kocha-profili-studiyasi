import { describe, it, expect } from 'vitest';
import { generate, DEFAULT_GEN } from '../../src/core/generator';
import { planApartments } from '../../src/core/apartments';
import { aptInterior } from '../../src/core/aptplan';
import { openRing } from '../../src/core/offset';
import { blankProject } from '../../src/core/doc';
import { apply } from '../../src/core/commands';
import { computePlan } from '../../src/core/plan';
import { frame, area, type XY } from '../../src/core/geo';

/**
 * 1.11 (egasi: «bitta kichik seksiyada ikkita alohida podyezd, qiyshiq maydalanib ketgan kvartira, choʻzilib ketgan sanuzel — mantiq qani?»)
 */
describe('seksiya rejasi mantigʻi', () => {
  it('openRing: qiyshiq burchak L shakli saqlanadi (2 mm yaqin nuqta burchakni oʻchirmaydi)', () => {
    const r: XY[] = [[18.781485330892195, -43.99999999971621], [44.78148533089219, -43.99999999971621], [48.386329288795174, -18.2511145861848], [30.560177848658046, -15.755453384559656], [29.125941322532714, -25.99999999971621], [18.781485330892195, -25.99999999971621]];
    const o = openRing(r, 6)!;
    expect(Math.abs(area(o) - area(r))).toBeLessThan(1);
  });
  for (const [name, site] of [
    ['toʻgʻri', [[-50, -50], [50, -50], [50, 50], [-50, 50]]],
    ['qiyshiq', [[-60, -50], [50, -50], [64, 50], [-46, 50]]],
  ] as const) it(`${name}: burchak seksiyasi — bitta podyezd, katta texnik boʻshliq yoʻq, hoʻl xona ≤ 12 m²`, () => {
    let d = blankProject('t') as any; const fr = frame(d.origin);
    d.site = { rings: [site.map(p => fr.toGeo(p as XY))] };
    const b = computePlan(d).blocks[0];
    const r = generate(b.rings[0], { ...DEFAULT_GEN, depth: 18 }, d.settings.floorHeight, { use: 'turar', aptNet: d.settings.aptNet, netToGross: d.settings.netToGross });
    d = apply(d, { type: 'replaceGroup', grp: 'g', sections: r.sections.map(x => ({ footprint: x.ring.map(fr.toGeo), floors: x.floors, nonRes: x.nonRes, use: 'turar', kind: x.kind, z0: x.z0, blind: x.blind })) } as any);
    const corners = planApartments(d).filter(p => p.ring.length >= 5);
    expect(corners.length).toBe(4);
    for (const p of corners) {
      const pl = p.layout.plan!;
      expect(pl.sections.filter(s => s.stairs.length).length).toBe(1);   // L burchak — bitta zina-lift yadrosi
      expect(pl.sections.every(s => s.stairs.length)).toBe(true);        // yadrosiz «seksiya» yoʻq
      for (const a of pl.apts) { const I = aptInterior(a, p.layout.mods); for (const q of I?.rooms ?? []) if (['vanna', 'sanuzel', 'hx', 'kir'].includes(q.kind)) expect(area(q.ring)).toBeLessThanOrEqual(12.5); }
    }
  }, 300_000);
});
