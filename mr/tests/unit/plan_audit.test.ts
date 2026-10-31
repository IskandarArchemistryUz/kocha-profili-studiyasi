import { describe, it, expect } from 'vitest';
import { generate, DEFAULT_GEN } from '../../src/core/generator';
import { blankProject } from '../../src/core/doc';
import { frame, area, obb2 } from '../../src/core/geo';
import { planApartments } from '../../src/core/apartments';
import { sectionPlan } from '../../src/core/floorplan';
import { aptInterior } from '../../src/core/aptplan';

describe('Audit 31.10', () => {
  it('openRing: deyarli bir chiziqdagi qirralar polygon-clipping ni cheksiz siklga tushirmaydi', () => {
    const B: [number, number][] = [[-3.9402798236586216, 0.8998531419104003], [100.62984401184728, 131.46228241014356], [-16.348014300375638, 251.7007536542119], [-122.81741954593461, 118.13805468364735]];
    const t = Date.now(); const r = generate(B, { ...DEFAULT_GEN, typology: 'blok_minora', maxF: 18, minF: 5 });
    expect(r.sections.length).toBeGreaterThan(5); expect(Date.now() - t).toBeLessThan(5000);
  }, 20000);
  it('qiya kvartal: trapetsiya kvartiralar ham xonalarga boʻlinadi (≥ 85 %; L shakllar hali yoʻq)', () => {
    const B: [number, number][] = [[0, 0], [120, 0], [135, 90], [-12, 85]];
    const r = generate(B, { ...DEFAULT_GEN, typology: 'perimetr', maxF: 9, minF: 5 });
    const doc = blankProject('a'); const fr = frame(doc.origin);
    doc.buildings = r.sections.filter(s => s.kind !== 'stilobat').map((s, i) => ({ id: 'b' + i, footprint: s.ring.map(fr.toGeo), floors: s.floors, nonRes: s.nonRes, use: 'turar' as const, gen: { grp: 'g', kind: s.kind, ...(s.blind ? { blind: s.blind } : {}) } }));
    let n = 0, ok = 0, skew = 0, skewOk = 0;
    for (const pl of planApartments(doc)) for (const a of sectionPlan(pl).apts) { const o = obb2(a.ring), f = area(a.ring) / (o.L * o.S), has = !!aptInterior(a, pl.layout.mods); n++; if (has) ok++; if (f < 0.97 && f > 0.85) { skew++; if (has) skewOk++; } }
    expect(ok / n).toBeGreaterThan(0.85);
    if (skew) expect(skewOk / skew).toBeGreaterThanOrEqual(0.5);
  }, 30000);
});

import type { FacadeMod, RuleApt } from '../../src/core/sectionplan';
const mk = (a: [number, number], b: [number, number], n: number, az: number): FacadeMod[] => Array.from({ length: n }, (_, i) => ({ a: [a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n], b: [a[0] + (b[0] - a[0]) * (i + 1) / n, a[1] + (b[1] - a[1]) * (i + 1) / n], az, blind: false }));
describe('Chuqur va L kvartiralar (31.10)', () => {
  it('chuqur (13,5 m): orqa tasmada xoll va kiyimxonalar', () => {
    const I = aptInterior({ rooms: 2, ring: [[0, 0], [6.6, 0], [6.6, 13.5], [0, 13.5]], area: 89, door: [3.3, 13.5], doorLen: 1.8, mods: [0, 1] } as unknown as RuleApt, mk([0, 0], [6.6, 0], 2, 180));
    expect(I).not.toBeNull();
    expect(I!.rooms.filter(r => r.kind === 'garderob').length).toBe(2);
  });
  it('L shakl: qanot — derazali yotoqxona, umumiy devorda eshik', () => {
    const I = aptInterior({ rooms: 3, ring: [[0, 0], [9, 0], [9, 6.5], [4, 6.5], [4, 11.5], [0, 11.5]], area: 78.5, door: [6.5, 6.5], doorLen: 1.8, mods: [0, 1, 2, 3] } as unknown as RuleApt, [...mk([0, 0], [9, 0], 3, 180), ...mk([0, 11.5], [0, 6.5], 1, 270)]);
    expect(I).not.toBeNull();
    expect(I!.rooms.some(r => r.kind === 'yotoq' && r.ring.some(p => p[1] > 11))).toBe(true);
  });
});

describe('Devorni sudrash (31.10)', () => {
  const base = { rooms: 2, ring: [[0, 0], [9.9, 0], [9.9, 7.2], [0, 7.2]], area: 71, door: [5, 7.2], doorLen: 1.8, mods: [0, 1, 2] } as unknown as RuleApt;
  const M = mk([0, 0], [9.9, 0], 3, 180);
  it('sudraladigan devorlar bor; surilsa — xona maydoni oʻzgaradi, deraza ichiga tushmaydi', () => {
    const I0 = aptInterior(base, M)!; expect(I0.handles?.length).toBeGreaterThan(0);
    const h = I0.handles!.find(x => x.max - x.min > 0.5)!; expect(h).toBeTruthy();
    const d = Math.max(h.min, Math.min(h.max, h.max > 0.3 ? 0.3 : -0.3));
    const I1 = aptInterior({ ...base, inner: { mv: [[...h.key, d]] } } as RuleApt, M)!;
    const sum = (I: typeof I0) => I.rooms.map(r => r.area.toFixed(2)).join();
    expect(sum(I1)).not.toBe(sum(I0));
    const h1 = I1.handles!.find(x => x.key.join() === h.key.join())!; expect(h1.d0).toBeCloseTo(d, 3);
  });
});
