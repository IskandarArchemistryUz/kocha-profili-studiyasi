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
  it('eshik tirqishi qoʻshni devor yuzasidan ≥ 0,15 m, kvartira chegarasidan ham', () => {
    let bad = 0, n = 0;
    for (const { x, ring } of all) for (const d of x.doors) {
      n++;
      const segs: [XY, XY, number][] = [...x.walls.map(([p, q]) => [p, q, 0.1] as [XY, XY, number]), ...ring.map((p, i) => [p, ring[(i + 1) % ring.length], 0.1] as [XY, XY, number])];
      // eshik jambalari (h va a) — oʻz devoridan boshqa, unga perpendikulyar devorlargacha masofa
      const u: XY = [(d.a[0] - d.h[0]) / d.w, (d.a[1] - d.h[1]) / d.w];
      for (const [p, q, t] of segs) {
        const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1; if (Math.abs((dx * u[0] + dy * u[1]) / l) > 0.1) continue;
        for (const j of [d.h, d.a]) if (segD(j, p, q) < t / 2 + 0.149) { bad++; break; }
      }
    }
    expect(n).toBeGreaterThan(100); expect(bad).toBe(0);
    // kirish eshigi (0,9 m, markazi entry) — ichki devorlardan ham ≥ 0,15 m
    let eb = 0;
    for (const { x } of all) for (const [p, q] of x.walls) if (segD(x.entry, p, q) < 0.45 + 0.05 + 0.149) eb++;
    expect(eb).toBe(0);
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

describe('Ichki rejani qoʻlda sozlash (V2, 31.10)', () => {
  const r: XY[] = [[0, 0], [60, 0], [60, 18], [0, 18]], mods = layoutSection(r, () => false).mods, pl = rulePlan(r, mods, [0, 20, 40, 40], 'M');
  const i = pl.apts.findIndex(a => a.rooms >= 3 && aptInterior(a, mods));
  it('flip — umumiy xona boshqa tomonda; dK — devor siljiydi; master yoʻq/ha; surma eshiklar', async () => {
    const { editInner } = await import('../../src/core/sectionplan');
    expect(i).toBeGreaterThanOrEqual(0);
    const base = aptInterior(pl.apts[i], mods)!, cK = (x: typeof base) => { const u = x.rooms.find(q => q.kind === 'umumiy')!; return u.ring.reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4], [0, 0]); };
    const f = editInner(pl, i, { flip: true }); expect(f.ok).toBe(true);
    const fl = aptInterior((f as any).plan.apts[i], mods)!;
    expect(Math.hypot(cK(fl)[0] - cK(base)[0], cK(fl)[1] - cK(base)[1])).toBeGreaterThan(3);
    const k1 = editInner(pl, i, { dK: 0.3 }), kk = aptInterior((k1 as any).plan.apts[i], mods)!;
    const aU = (x: typeof base) => x.rooms.find(q => q.kind === 'umumiy')!.area;
    expect(Math.abs(aU(kk) - aU(base))).toBeLessThan(4);
    const m0 = editInner(pl, i, { master: false }), mm = aptInterior((m0 as any).plan.apts[i], mods)!;
    expect(mm.master).toBe(false); expect(mm.rooms.some(q => q.kind === 'master')).toBe(false);
    const sl = editInner(pl, i, { slide: true }), ss = aptInterior((sl as any).plan.apts[i], mods)!;
    expect(ss.doors.filter(d => d.kind === 'slide').length).toBeGreaterThan(base.doors.filter(d => d.kind === 'slide').length);
    expect(doorClashes(ss.doors, ss.walls, pl.apts[i].ring)).toEqual([]);
  });
});

describe('Burchak va L shakl seksiyalar (31.10): kemtik, eshik uzoqda, yon eshik', async () => {
  const { layoutSection: ls } = await import('../../src/core/apartments');
  const { sectionPlan } = await import('../../src/core/floorplan');
  const Lr = (a: number, b: number, d: number): XY[] => [[0, 0], [a, 0], [a, d], [d, d], [d, b], [0, b]];
  const rows: { a: any; x: ReturnType<typeof aptInterior> }[] = [];
  for (const r of [Lr(30, 30, 15), Lr(33, 27, 15), Lr(36, 36, 16), Lr(27, 33, 14), Lr(40, 25, 17)]) for (const mix of MIXES) {
    const s = { bid: 'b', ring: r, layout: ls(r, () => false, mix), f0: 2, f1: 9, z0: 0, halfDepth: 7.5 }, P = sectionPlan(s);
    for (const a of P.apts) rows.push({ a, x: aptInterior(a, s.layout.mods) });
  }
  it('≥ 85 % kvartiralar ichki rejali (L shakl kemtikli ham)', () => {
    expect(rows.filter(r => r.x).length / rows.length).toBeGreaterThan(0.85);
    expect(rows.some(r => r.x && r.x.rooms.some(q => q.ring.length === 6))).toBe(true);   // kemtik — L shakl xona
  });
  it('kirish eshigi koridor bilan umumiy kesmada (qoʻshni kvartira yoki zina devoriga koʻchmaydi)', () => {
    for (const { a, x } of rows) if (x) expect(Math.hypot(x.entry[0] - a.door[0], x.entry[1] - a.door[1])).toBeLessThanOrEqual(Math.max(0, (a.doorLen ?? 1.2) / 2 - 0.45) + 0.02);
  });
  it('xonalar ustma-ust emas, eshik yoylari urilmaydi', () => {
    for (const { a, x } of rows) if (x) { const s = x.rooms.reduce((t, q) => t + area(q.ring), 0); expect(s).toBeLessThanOrEqual(area(a.ring) * 1.02); expect(doorClashes(x.doors, x.walls, a.ring)).toEqual([]); }
  });
});
