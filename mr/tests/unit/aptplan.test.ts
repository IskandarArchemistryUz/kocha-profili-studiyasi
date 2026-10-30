import { describe, it, expect } from 'vitest';
import { layoutSection } from '../../src/core/apartments';
import { rulePlan } from '../../src/core/sectionplan';
import { aptInterior, doorClashes } from '../../src/core/aptplan';
import { area, type XY } from '../../src/core/geo';

const rect = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const RINGS: XY[][] = [rect(0, 0, 48, 16), rect(0, 0, 60, 18), rect(0, 0, 33, 15), [[0, 0], [50, 0], [50, 16], [16, 16], [16, 45], [0, 45]], rect(0, 0, 40, 12), rect(0, 0, 24, 24), rect(0, 0, 72, 17), rect(0, 0, 36, 14)];
const MIXES = [[20, 40, 30, 10], [10, 30, 40, 20], [40, 40, 20, 0], [0, 20, 40, 40]];
const LIVING = new Set(['umumiy', 'xona', 'oshxona', 'yotoq', 'master']);
const segD = (p: XY, a: XY, b: XY) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)); return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t); };

describe('Kvartira ichki rejasi (31.10)', () => {
  const all: { k: number; net: number; x: NonNullable<ReturnType<typeof aptInterior>>; ring: XY[]; win: XY[] }[] = [];
  let tot = 0;
  for (const r of RINGS) for (const mix of MIXES) {
    const mods = layoutSection(r, () => false).mods, pl = rulePlan(r, mods, mix, 'M');
    for (const a of pl.apts) { tot++; const x = aptInterior(a, mods); if (x) all.push({ k: a.rooms, net: a.area * 0.85, x, ring: a.ring, win: a.mods.map(i => mods[i]).filter(m => !m.blind).map(m => [(m.a[0] + m.b[0]) / 2, (m.a[1] + m.b[1]) / 2] as XY) }); }
  }
  it('koʻpchilik kvartiralar (≥ 85 %) ichki rejaga ega', () => { expect(all.length / tot).toBeGreaterThan(0.85); });
  it('xonalar kvartirani qoplaydi, ustma-ust emas', () => {
    for (const { x, ring } of all) { const s = x.rooms.reduce((t, q) => t + area(q.ring), 0); expect(s).toBeLessThanOrEqual(area(ring) * 1.02); expect(s).toBeGreaterThan(area(ring) * 0.88); }
  });
  it('har yashash xonasi va oshxona derazali; prixojaya bor', () => {
    for (const { x, win } of all) {
      expect(x.rooms.some(q => q.kind === 'prixojaya')).toBe(true);
      for (const q of x.rooms.filter(q => LIVING.has(q.kind))) expect(win.some(w => q.ring.some((p, i) => segD(w, p, q.ring[(i + 1) % q.ring.length]) < 0.4))).toBe(true);
    }
  });
  it('eshik yoylari devorga ham, bir-biriga ham urilmaydi', () => {
    for (const { x, ring } of all) expect(doorClashes(x.doors, x.walls, ring)).toEqual([]);
  });
  it('oshxona-mehmonxona: 2–4 xonalida 19–31 m²; 4 xonalida master-blok (oʻz sanuzeli)', () => {
    for (const { k, x } of all) {
      const u = x.rooms.find(q => q.kind === 'umumiy');
      if (k >= 2) { expect(u).toBeTruthy(); expect(u!.area).toBeGreaterThan(18.5); expect(u!.area).toBeLessThan(31); }
      if (k >= 4) { expect(x.master).toBe(true); expect(x.rooms.some(q => q.kind === 'master')).toBe(true); }
      if (x.master && k >= 3) expect(x.rooms.filter(q => q.wet).length).toBeGreaterThanOrEqual(2);   // master sanuzeli + umumiy
    }
  });
});
