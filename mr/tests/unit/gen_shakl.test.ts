import { describe, it, expect } from 'vitest';
import { generate, usePreset, DEFAULT_GEN, inset } from '../../src/core/generator';
import { socialPlan, plotCapacity, SOCIAL } from '../../src/core/social';
import { insetRobust } from '../../src/core/offset';
import { area, type XY } from '../../src/core/geo';

/** 6-band: joy yetarli, lekin shakli oʻtkir burchakli yoki egri burchakli kvartal/parsel — generatsiya ishlashi kerak */
const wedge: XY[] = [[0, 0], [160, 0], [0, 55]];                                   // ~19° oʻtkir burchak (qiya koʻcha kesgan)
const fillet: XY[] = [[0, 0], [100, 0], [100, 60]];                                // burchagi yoy (koʻcha burilishi)
for (let j = 0; j <= 10; j++) { const t = j / 10 * Math.PI / 2; fillet.push([70 + 30 * Math.cos(t), 60 + 30 * Math.sin(t)]); }
fillet.push([0, 90]);
const tri: XY[] = [[0, 0], [140, 0], [20, 110]];

describe('chekinish: oʻtkir burchak va egri qirralar', () => {
  it('insetRobust — har nuqta chegaradan ≥ d, maydon oqilona', () => {
    const r = insetRobust(wedge, 6)!; expect(r).not.toBeNull();
    expect(area(r)).toBeGreaterThan(1500); expect(area(r)).toBeLessThan(area(wedge));
    expect(inset(wedge, 6)).not.toBeNull();   // generator chekinishi endi null emas
  });
  for (const [nm, ring] of [['oʻtkir burchak', wedge], ['egri burchak', fillet], ['uchburchak', tri]] as const)
    for (const u of ['ofis', 'savdo', 'mehmonxona']) it(`${nm}: ${u} joylashadi`, () => {
      const r = generate(ring as XY[], usePreset(u, DEFAULT_GEN) ?? DEFAULT_GEN);
      expect(r.sections.length, r.notes.join(' | ')).toBeGreaterThan(0);
    });
  for (const [nm, ring] of [['egri burchak', fillet], ['uchburchak', tri]] as const)
    for (const u of ['maktab', 'mtm', 'poliklinika'] as const) it(`${nm}: ${u} joylashadi`, () => {
      const a = area(ring as XY[]), cap = Math.max(40, Math.min(plotCapacity(u, a), 300));
      const sp = socialPlan(ring as XY[], u, cap, SOCIAL[u].modules[0].id, SOCIAL[u].m2, SOCIAL[u].floors, (ring as XY[]).map(() => 25));
      expect(sp.sections.length, sp.notes.join(' | ')).toBeGreaterThan(0);
    });
  it('ingichka uchburchak kvartal (190 × 71 m): maktab joylashadi', () => {
    const ring: XY[] = [[-150, -110], [40, -110], [40, -39], [-150, -105]];
    const sp = socialPlan(ring, 'maktab', 359, 'taroq', SOCIAL.maktab.m2, SOCIAL.maktab.floors, ring.map(() => 25));
    expect(sp.sections.length, sp.notes.join(' | ')).toBeGreaterThan(0);
  });
});
