import { describe, it, expect } from 'vitest';
import { blankProject, type Building, type Garage, type Project } from '../../src/core/doc';
import { frame, type XY } from '../../src/core/geo';
import { RULES } from '../../src/norms/rules';
import { derive } from '../../src/core/derive';
import { PARK_MOD } from '../../src/core/parking';
import { rampNeed, rampOk, liftNeed, evLoss, ML, mlParking } from '../../src/core/mlpark';

/** 07.11 (c73): SHNQ 2.05.07-24 — joy 5,5 × 2,5 m, 29, 34, 37, 41, 171¹, 180, 255-bandlar */
const O: [number, number] = [69.28, 41.31], fr = frame(O);
const sq = (x: number, y: number, w: number, d: number): XY[] => [[x, y], [x + w, y], [x + w, y + d], [x, y + d]];
const ev = (id: string, d: Project) => RULES.find(r => r.id === id)!.evaluate(derive(d), d);
const doc = (gs: Garage[], bs: Building[] = []): Project => ({ ...blankProject('t'), origin: O, buildings: bs, garages: gs, streets: [], site: { rings: [sq(-50, -50, 300, 300).map(fr.toGeo)] } as Project['site'] });
const lot = (L: number, n = 4): Garage => ({ id: 'g' + L, grp: 'b1', kind: 'yer_usti', ring: sq(0, 0, 40, 20).map(fr.toGeo), levels: 1, spaces: n, module: 'p90', stalls: Array.from({ length: n }, (_, i) => sq(i * 2.5, 0, 2.5, L).map(fr.toGeo)) });

describe('SHNQ 2.05.07-24 (c73)', () => {
  it('1-ilova 4-izoh: 90°, 60°, 45° modullarda joy ≥ 5,5 × 2,5 m', () => {
    for (const m of ['p90', 'p60', 'p45', 'par'] as const) { expect(PARK_MOD[m].L).toBeGreaterThanOrEqual(5.5); expect(PARK_MOD[m].W).toBeGreaterThanOrEqual(2.5); }
    expect(ML.stallL).toBe(5.5);
  });
  it('41-band: rampa 18 / 13 / < 10 %, eni 3,5 m, tashqi radius 7,4 m; 29-band: gabarit ≥ 2 m', () => {
    expect(ML.slope).toBe(0.18); expect(ML.slopeCurve).toBe(0.13); expect(ML.slopeOpen).toBe(0.10);
    expect(ML.lane).toBe(3.5); expect(ML.rOuter).toBe(7.4); expect(ML.clear).toBeGreaterThanOrEqual(ML.minClear);
  });
  it('37-band: rampalar soni', () => {
    expect(rampNeed(80).one).toBe(1); expect(rampNeed(500).two).toBe(1); expect(rampNeed(1500).two).toBe(2);
    expect(rampOk(900, 1)).toBe(true); expect(rampOk(1200, 1)).toBe(false); expect(rampOk(1200, 2)).toBe(true);
    expect(rampOk(500, 0, 2)).toBe(true); expect(rampOk(500, 0, 1)).toBe(false);
  });
  it('34-band: har 100 joyga lift; 180-band: EV 3,0 m — oddiy joylar yoʻqotilishi', () => {
    expect(liftNeed(250)).toBe(3); expect(liftNeed(0)).toBe(0);
    expect(evLoss(5)).toBe(1); expect(evLoss(0)).toBe(0);
  });
  it('mlParking: joylar 5,5 m', () => {
    const m = mlParking(sq(0, 0, 100, 60), 3)!;
    expect(m.stalls.every(s => { const a = Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]), b = Math.hypot(s[2][0] - s[1][0], s[2][1] - s[1][1]); return Math.max(a, b) >= 5.49; })).toBe(true);
  });
  it('park-20507: eski 5,3 m joylar — mos emas; 5,5 m — oʻtadi; yoʻq — baholanmadi', () => {
    expect(ev('park-20507', doc([])).status).toBe('na');
    const bad = ev('park-20507', doc([lot(5.3)]));
    expect(bad.status).toBe('fail'); expect(bad.note).toContain('5,3');
    const ok = ev('park-20507', doc([lot(5.5)]));
    expect(ok.status).toBe('pass'); expect(ok.note).toContain('5,5 × 2,5'); expect(ok.note).toContain('255-band');
  });
  it('park-20507: 37-band — yer ostida 1000 dan ortiq joy, bitta rampa — mos emas', () => {
    const ug = (n: number): Garage => ({ id: 'u' + n, grp: 'b1', kind: 'yer_osti', ring: sq(0, 0, 100, 100).map(fr.toGeo), levels: 2, spaces: n });
    expect(ev('park-20507', doc([ug(800)])).status).toBe('pass');
    const r = ev('park-20507', doc([ug(1200)])); expect(r.status).toBe('fail'); expect(r.note).toContain('37-band');
  });
  it('park-20507: savdo bor — EV 3,0 × 6,0 m, faqat −1 / +1 (171¹, 180)', () => {
    const shop: Building = { id: 's', footprint: sq(60, 0, 20, 20).map(fr.toGeo), floors: 2, nonRes: 2, use: 'savdo', gen: { grp: 'b1' } } as Building;
    const r = ev('park-20507', doc([lot(5.5, 40)], [shop]));
    expect(r.note).toContain('3,0 × 6,0'); expect(r.note).toContain('171¹');
  });
});
