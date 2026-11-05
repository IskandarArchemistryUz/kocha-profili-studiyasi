import { describe, it, expect } from 'vitest';
import { structGrid, fillSpan, stepSet, jointWidthMm, gridChecks, gridWindows, snapMarks } from '../../src/core/axes';
import { rulePlan, type FacadeMod } from '../../src/core/sectionplan';
import type { XY } from '../../src/core/geo';
import { layoutSection } from '../../src/core/apartments';
import { liftAdj, liftChecks } from '../../src/core/liftadj';

const rect = (w: number, h: number, x = 0, y = 0): XY[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
/** fasad modullari — ~3,3 m, CCW halqa boʻylab (ichki normal chapda) */
function modsOf(r: XY[], blind: (a: XY, b: XY) => boolean = () => false): FacadeMod[] {
  const out: FacadeMod[] = [];
  for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 3.3)); for (let k = 0; k < n; k++) { const p: XY = [a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n], q: XY = [a[0] + (b[0] - a[0]) * (k + 1) / n, a[1] + (b[1] - a[1]) * (k + 1) / n]; out.push({ a: p, b: q, az: (Math.atan2(q[0] - p[0], -(q[1] - p[1])) * 180 / Math.PI + 360) % 360, blind: blind(p, q) }); } }
  return out;
}

describe('konstruktiv oʻqlar (05.11)', () => {
  it('qadamlar toʻplami: devorli 3,0–4,2, karkas 9 ballda ≤ 6', () => {
    expect(stepSet('wall', 8).set).toEqual([3.0, 3.3, 3.6, 4.2]);
    expect(stepSet('frame', 9).set).toEqual([6.0]);
    expect(stepSet('frame', 7).set).toContain(8.4);
    expect(fillSpan(10, stepSet('wall', 8))).toEqual([3.35, 3.35, 3.3]);
    expect(fillSpan(3.3, stepSet('wall', 8))).toEqual([3.3]);
    expect(fillSpan(13.2, stepSet('frame', 8)).every(s => s <= 7.2 && s >= 5.4)).toBe(true);
  });
  it('chok eni: QMQ 3.1.4 (30 mm + har 5 m ga 20 mm) va ShNQ 2.01.06-25 172-band — kattasi', () => {
    expect(jointWidthMm(5)).toBe(30);
    expect(jointWidthMm(30)).toBe(130);     // QMQ: 30 + 5·20; ShNQ: 30 + 8·10 = 110
    expect(jointWidthMm(75)).toBe(310);     // QMQ: 30 + 14·20 = 310; ShNQ: 30 + 23·10 = 260
  });
  it('20 × 14 m devorli bino: oʻqlar yadroga simmetrik, langarsiz', () => {
    const g = structGrid(rect(20, 14), null, { sys: 'monolit', seismic: 8, H: 30 });
    expect(g.blocks).toHaveLength(1);
    const b = g.blocks[0], main = b.x.filter(a => a.kind === 'main');
    expect(main[0].pos).toBeCloseTo(0, 1); expect(main[main.length - 1].pos).toBeCloseTo(20, 1);
    expect(b.core).toEqual({ from: 7.15, to: 12.85 });
    const L = b.steps.slice(0, 2), R = [...b.steps].reverse().slice(0, 2);
    expect(L).toEqual(R);                                   // simmetrik
    expect(b.steps.every(s => s <= 5.75)).toBe(true);
    expect(b.y.map(a => a.id)).toEqual(['А', 'Б']);         // plansiz — faqat fasadlar
  });
  it('50 m, 8 ball, devorli → 2 boʻlma + chok (3.1-jadval: 45 m); 70 m dan baland — boʻlinmaydi', () => {
    const g = structGrid(rect(50, 14), null, { sys: 'monolit', seismic: 8, H: 30 });
    expect(g.blocks).toHaveLength(2);
    expect(g.joints).toHaveLength(1);
    expect(g.blocks.some(b => b.joint0 || b.joint1)).toBe(true);
    expect(g.blocks.flatMap(b => b.x).some(a => a.kind === 'joint' && a.id.endsWith('с'))).toBe(true);
    const t = structGrid(rect(50, 14), null, { sys: 'monolit', seismic: 8, H: 75 });
    expect(t.blocks).toHaveLength(1);
    expect(t.notes.join()).toContain('39-band');
  });
  it('karkas 9 ballda qadam ≤ 6 m', () => {
    const g = structGrid(rect(36, 15), null, { sys: 'karkas', seismic: 9, H: 30 });
    expect(g.blocks[0].steps.every(s => s <= 6.05)).toBe(true);
    expect(g.blocks[0].x.some(a => a.kind === 'sub')).toBe(true);
  });
  it('oʻq nomlari bino boʻyicha yagona: raqamlar davomli va oʻsib boradi, harflar takrorlanmaydi (parallel boʻlmalarda bir chiziq — bir harf)', () => {
    const L: XY[] = [[0, 0], [40, 0], [40, 14], [14, 14], [14, 40], [0, 40]];
    const g = structGrid(L, null, { sys: 'monolit', seismic: 8, H: 30 });
    const nums = g.blocks.flatMap(b => b.x.filter(a => a.kind !== 'sub').sort((p, q) => p.pos - q.pos).map(a => parseInt(a.id, 10)));
    expect(nums).toEqual(nums.map((_, i) => i + 1));
    const lets = g.blocks.flatMap(b => b.y.map(a => a.id));
    expect(new Set(lets).size).toBe(lets.length);
    const r2 = structGrid(rect(50, 14), null, { sys: 'monolit', seismic: 8, H: 30 });
    expect(r2.blocks[0].y.map(a => a.id)).toEqual(r2.blocks[1].y.map(a => a.id));     // bir chiziq — bir harf
    expect(r2.blocks[0].x.find(a => a.kind === 'joint')?.id).toMatch(/^\d+с$/);
  });
  it('L shakl → qanotlar alohida toʻr, har qanot oʻz uzun oʻqi boʻylab', () => {
    const L: XY[] = [[0, 0], [40, 0], [40, 14], [14, 14], [14, 40], [0, 40]];
    const g = structGrid(L, null, { sys: 'monolit', seismic: 8, H: 30 });
    expect(g.blocks.length).toBeGreaterThanOrEqual(2);
    const dirs = g.blocks.map(b => Math.abs(b.U[0]) > 0.7 ? 'x' : 'y');
    expect(new Set(dirs).size).toBe(2);
  });
  it('reja bilan: kvartira devorlari va yadro oʻqda (T1), deraza oraliq ichida (T2), har boʻlmada zina', () => {
    const r = rect(30, 14), mods = modsOf(r), pl = rulePlan(r, mods, [20, 40, 30, 10]);
    const g = structGrid(r, pl, { sys: 'monolit', seismic: 8, H: 30 });
    expect(g.blocks).toHaveLength(1);
    expect(g.blocks[0].core).not.toBeNull();
    expect(g.blocks[0].y.length).toBeGreaterThanOrEqual(3);   // fasad – koridor devori – fasad
    const ch = gridChecks(g, pl, mods, 9);
    // asosiy oʻqlar — faqat qadam toʻplami chegarasida (2,7–4,2 m) + yadro oraligʻi; ogʻishlar T1 da koʻrinadi
    const b0 = g.blocks[0], core = b0.cores.map(c => c.to - c.from);
    expect(b0.steps.every(st => (st >= 2.65 && st <= 4.25) || core.some(c => Math.abs(c - st) < 0.06))).toBe(true);
    expect(ch.find(c => c.id === 'ax-T1')?.value).toMatch(/devor/);
    expect(ch.find(c => c.id === 'ax-T2')).toBeTruthy();
    expect(ch.find(c => c.id === 'ax-T4b')?.ok).toBe(true);
    expect(ch.find(c => c.id === 'ax-T7')?.ok).toBeNull();     // < 70 m: ShNQ 2.01.06-25 — konstruktor tasdigʻi
    const w = gridWindows(g, mods); expect(w.length).toBe(mods.length);
    expect(snapMarks(g, pl.apts[0].ring, [1, 0]).length).toBeGreaterThan(0);
  });
});

describe('toʻr birinchi: reja oʻqlarga quriladi (05.11, egasi: «devorlar oynaga borib urilyapti»)', () => {
  const gsW = { system: 'wall' as const, seismic: 8 };
  const run = (r: XY[], sys: 'monolit' | 'karkas' = 'monolit') => {
    const gs = { system: sys === 'karkas' ? 'frame' as const : 'wall' as const, seismic: 8 };
    const j = structGrid(r, null, { sys, seismic: 8, H: 27 }).joints;
    const L = layoutSection(r, () => false, [20, 40, 30, 10], 3.3, 'M', null, j, gs);
    const g = structGrid(r, L.plan!, { sys, seismic: 8, H: 27 });
    return { L, g, ch: gridChecks(g, L.plan!, L.mods, 9) };
  };
  it('50 × 15 m devorli: T1 = 0 (kvartiralararo devor oʻqda), T2 = 0 (deraza oʻqda emas), qadamlar 2,7–4,2 yoki yadro', () => {
    const { L, g, ch } = run(rect(50, 15));
    expect(L.plan!.axisLines!.length).toBeGreaterThan(6);
    expect(ch.find(c => c.id === 'ax-T1')?.ok).toBe(true);
    expect(ch.find(c => c.id === 'ax-T2')?.ok).toBe(true);
    for (const b of g.blocks) { const core = b.cores.map(c => c.to - c.from); expect(b.steps.every(st => (st >= 2.65 && st <= 4.25) || core.some(c => Math.abs(c - st) < 0.06))).toBe(true); }
    // har modul (deraza) bitta oraliq ichida — modul chegaralari oʻqlarda yoki ularning orasida, oʻqni kesib oʻtmaydi
    expect(gridWindows(g, L.mods).every(w => !w.moved && !w.onAxis)).toBe(true);
  });
  it('L shakl va 30 × 14: kvartira chegaralari oʻqlarda; lift shaxtasi yashash xonasiga tegmaydi (ShNQ 2.08.01-24, 230-band)', () => {
    for (const r of [rect(30, 14), [[0, 0], [40, 0], [40, 15], [15, 15], [15, 40], [0, 40]] as XY[]]) {
      const { L, ch } = run(r);
      expect(ch.find(c => c.id === 'ax-T1')?.ok).toBe(true);
      expect(liftAdj(L.plan!, L.mods).lift).toHaveLength(0);
      expect(liftChecks(L.plan!, L.mods).find(c => c.id === 'lift-230')?.ok).toBe(true);
    }
  });
  it('karkas: tor oraliq (< 5,4 m) — «koʻrib chiqish» (T5min), qadam chegarasi 7,5 m dan oshmaydi', () => {
    const { ch } = run(rect(50, 15), 'karkas');
    expect(ch.find(c => c.id === 'ax-T5')?.ok).toBe(true);
    expect(ch.find(c => c.id === 'ax-T5min')).toBeTruthy();
    expect(ch.find(c => c.id === 'ax-T1')?.ok).toBe(true);
  });
  it('lift-230: yotoqxona lift shaxtasiga tutashsa — mos emas; oshxona — mumkin', () => {
    const lift: XY[] = [[0, 0], [2.2, 0], [2.2, 2.2], [0, 2.2]], apt: XY[] = [[2.2, 0], [8, 0], [8, 6], [2.2, 6]];
    const P = { kind: 'ikki', stairs: [], lifts: [lift], mop: [], apts: [{ rooms: 2, ring: apt, area: 34.8, door: [5, 6] as XY, mods: [], wet: [], walls: [], wing: 0, sec: 0 }], sections: [], fireWalls: [], rest: [], rooms: [], corridorLen: 0, corridorW: 1.6 } as unknown as Parameters<typeof liftAdj>[0];
    const room = (kind: string) => () => ({ rooms: [{ ring: [[2.2, 0], [5, 0], [5, 3], [2.2, 3]] as XY[], kind, area: 8.4, wet: false }], walls: [], doors: [] }) as never;
    expect(liftAdj(P, [], room('yotoq')).lift).toHaveLength(1);
    expect(liftAdj(P, [], room('oshxona')).lift).toHaveLength(0);
    void gsW;
  });
});
