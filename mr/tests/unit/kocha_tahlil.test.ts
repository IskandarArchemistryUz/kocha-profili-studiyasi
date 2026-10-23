import { describe, it, expect } from 'vitest';
import { routeAB, analyzeSlices, summarize, findings, along, maxGap, catOf, type SRoad, type SBld } from '../../src/joyshunos/street';
import { daySteps, sunPosition, localToUtc } from '../../src/core/sun';
import type { XY } from '../../src/core/geo';

/** Toʻr: sharq-gʻarb koʻchasi (y = 0) 0…400 m, uni x = 0, 200, 400 da shimol-janub koʻchalari kesadi; aylanma yoʻl y = 300 da */
const roads: SRoad[] = [
  { id: 1, pts: [[0, 0], [200, 0], [400, 0]], cls: 'tertiary', w: 14, name: 'Navoiy', lanes: 4 },
  { id: 2, pts: [[0, -150], [0, 0], [0, 300]], cls: 'residential', w: 7 },
  { id: 3, pts: [[200, -150], [200, 0], [200, 300]], cls: 'residential', w: 7 },
  { id: 4, pts: [[400, -150], [400, 0], [400, 300]], cls: 'residential', w: 7 },
  { id: 5, pts: [[0, 300], [400, 300]], cls: 'residential', w: 7 },
];
/** Koʻchaning ikki tomonida 18 m baland binolar: fasad oʻqdan 17 m da, 40 m li bloklar, 10 m oraliq */
const blds: SBld[] = [];
for (let x = 5; x < 395; x += 50) for (const sg of [1, -1]) { const y0 = sg * 17, y1 = sg * 37; blds.push({ ring: [[x, y0], [x + 40, y0], [x + 40, y1], [x, y1]] as XY[], h: 18 }); }

describe('Koʻcha tahlili (Joyshunos)', () => {
  it('A → B: eng qisqa yoʻl koʻcha boʻylab, chorrahalar topiladi', () => {
    const rt = routeAB(roads, [10, 5], [390, -4])!;
    expect(rt).not.toBeNull();
    expect(rt.len).toBeGreaterThan(375); expect(rt.len).toBeLessThan(385);
    expect(rt.road.every(r => r.id === 1)).toBe(true);
    expect(rt.junctions.map(Math.round)).toEqual([190]);
  });
  it('yoʻldan uzoq nuqta — null', () => {
    expect(routeAB(roads, [100, 120], [390, 0])).toBeNull();
  });
  it('fasad, H/W, fasad uzluksizligi, soya', () => {
    const rt = routeAB(roads, [10, 0], [390, 0])!;
    const c = { lat: 41.31, lng: 69.28 }, sp = sunPosition(localToUtc(2026, 6, 22, 14), c.lat, c.lng);
    // soyani aniq tekshirish uchun: quyosh janubda, 30° (soya 31 m — ikkala trotuar ham bino ortida)
    const sl = analyzeSlices(rt, blds, [[100, 10], [110, -10]], { step14: { alt: 30, az: 180, dt: 1 }, day: daySteps(2026, 6, 22, c.lat, c.lng, 30) });
    expect(sp.alt).toBeGreaterThan(55);
    expect(sl.length).toBe(19);
    const hit = sl.filter(s => s.L.d != null && s.R.d != null);
    expect(hit.length).toBeGreaterThan(10);
    for (const s of hit) { expect(s.L.d!).toBeCloseTo(17, 0); expect(s.R.d!).toBeCloseTo(17, 0); }
    const S = summarize(rt, sl, [], true);
    expect(S.name).toBe('Navoiy');
    expect(S.cat.id).toBe('tuman');
    expect(S.corridor).toBeCloseTo(34, 0);
    expect(S.hw!).toBeCloseTo(18 / 34, 1);
    expect(S.freeL!).toBeCloseTo(10, 0);
    expect(S.wall).toBeGreaterThan(0.6);
    expect(S.treesPer100).toBeGreaterThan(0.4);
    expect(S.shade14!).toBeGreaterThan(0.5);
    expect(S.sunHours!).toBeGreaterThan(0);
  });
  it('piyoda oʻtish joylari oraligʻi va xulosa manbalari', () => {
    const rt = routeAB(roads, [0, 0], [400, 0])!;
    const p = along(rt, [{ p: [50, 6], kind: 'crossing' }, { p: [60, 2], kind: 'signals' }, { p: [300, -100], kind: 'crossing' }]);
    expect(p.length).toBe(2);
    expect(maxGap(p.map(x => x.s), rt.len)!.len).toBeCloseTo(340, 0);
    const sl = analyzeSlices(rt, blds, [], null);
    const S = summarize(rt, sl, p, false);
    expect(S.crossings).toBe(1);   // 50 va 60 m — bitta oʻtish joyi
    const F = findings(S);
    expect(F.every(f => f.src.length > 0)).toBe(true);
    expect(F.some(f => /ShNQ 2\.07\.06-24, 2-ilova 1-jadval/.test(f.src))).toBe(true);
    expect(catOf('primary').sidewalk).toEqual([3.0, 4.5]);
  });
});
