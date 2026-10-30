import { describe, it, expect } from 'vitest';
import { layoutSection } from '../../src/core/apartments';
import { floorInsol } from '../../src/core/insolplan';
import type { XY } from '../../src/core/geo';

describe('qavat rejasida insolyatsiya (V5)', () => {
  // 60 × 12 seksiya: shimoliy va janubiy fasad
  const ring: XY[] = [[0, 0], [60, 0], [60, 12], [0, 12]];
  const L = layoutSection(ring, () => false, [30, 40, 30, 0], 3.3, 'M'), P = L.plan!, mods = L.mods;
  it('janub — 3 soat, shimol — 0: shimoliy bir tomonlama kvartiralar mos emas va «shimoliy» deb belgilanadi', () => {
    const r = floorInsol(P, mods, m => (Math.cos(mods[m].az * Math.PI / 180) < -0.5 ? 3 : 0));
    expect(r.total).toBe(P.apts.length);
    for (const a of r.apts) {
      const south = P.apts[a.i].mods.some(m => Math.cos(mods[m].az * Math.PI / 180) < -0.5);
      expect(a.status).toBe(south ? 'ok' : 'bad');
      if (!south && P.apts[a.i].mods.every(m => Math.cos(mods[m].az * Math.PI / 180) > 0.5)) expect(a.north).toBe(true);
    }
    expect(r.ok).toBe(r.apts.filter(a => a.status === 'ok').length);
  });
  it('chegarada (1,5–2 soat) va hisoblanmagan derazalar', () => {
    expect(floorInsol(P, mods, () => 1.7).apts.every(a => a.status === 'edge')).toBe(true);
    expect(floorInsol(P, mods, () => 1.2).apts.every(a => a.status === 'bad')).toBe(true);
    const na = floorInsol(P, mods, () => null); expect(na.total).toBe(0); expect(na.apts.every(a => a.status === 'na')).toBe(true);
  });
  it('94-band: 4 xonalida 2 ta xona kerak', () => {
    const L4 = layoutSection(ring, () => false, [0, 0, 0, 100], 3.3, 'M'), P4 = L4.plan!;
    const r = floorInsol(P4, L4.mods, () => 2.5);
    for (const a of r.apts) expect(a.need).toBe(a.rooms >= 4 ? 2 : 1);
  });
});
