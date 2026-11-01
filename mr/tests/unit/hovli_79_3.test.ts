import { describe, it, expect } from 'vitest';
import { RULES } from '../../src/norms/rules';
import { derive } from '../../src/core/derive';
import { blankProject } from '../../src/core/doc';
import { frame, type XY } from '../../src/core/geo';

const rect = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
/** ShNQ 2.07.01-23, 79-band, 2-jadval, 3-izoh: yopiq ichki hovlida ichki fasadlar orasi Hmax × 2,3 */
describe('yopiq ichki hovli (3-izoh)', () => {
  const mk = (floors: number, gap = 0.2) => {
    const d = blankProject('t') as any, fr = frame(d.origin), G = (p: XY) => fr.toGeo(p);
    d.site = { rings: [rect(-10, -10, 130, 110).map(G)] };
    // 120 × 100 m perimetr: toʻrt tomon, burchaklarda choklar (gap m); hovli ichi 88 × 68 m
    const rs = [rect(0, 0, 120, 16), rect(0, 84 + gap, 120, 100), rect(0, 16 + gap, 16, 84), rect(104, 16 + gap, 120, 84)];
    d.buildings = rs.map((r, i) => ({ id: `b${i}`, footprint: r.map(G), floors, nonRes: 0, use: 'turar' }));
    return d;
  };
  const run = (d: any) => RULES.find(r => r.id === 'hovli-79-3')!.evaluate(derive(d), d);
  it('9 qavat (H ≈ 29,7 m, talab ≈ 68 m) — hovli 68 m: mos', () => { const r = run(mk(9)); expect(r.status).toBe('pass'); expect(r.value!).toBeGreaterThan(66); });
  it('16 qavat (talab ≈ 121 m) — mos emas, sahnada kerakli masofa', () => { const r = run(mk(16)); expect(r.status).toBe('fail'); expect(r.where?.need?.segs?.length).toBe(1); });
  it('burchakda 10 m oraliq — hovli ochiq: qoʻllanmaydi', () => { expect(run(mk(16, 10)).status).toBe('na'); });
});
