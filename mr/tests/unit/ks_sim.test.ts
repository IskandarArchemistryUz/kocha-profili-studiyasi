import { describe, it, expect } from 'vitest';
import { buildGeometry, DEFAULT_SCENARIO, Sim, replicate, summarize, phaseAt, plan, isGreen, pedGreen, webster, losVehicle, losPed, type Scenario, type Result } from '../../src/kochasoz/sim';

/** Koʻchasoz · Harakat modeli — 0-bosqich: geometriya, svetofor, urugʻ, saqlanish va 4 ta sxema regressiyasi.
 *  Raqamlar andoza parametrlarda (kalibrlanmagan); testlar faqat yoʻnalishni (qaysi sxema yaxshi) tekshiradi. */

const SEEDS = [1, 2, 3, 4];
const T = 600;
const sc = (o: Partial<Scenario> = {}): Scenario => ({ ...DEFAULT_SCENARIO, ...o });
const mean = (rs: Result[], f: (r: Result) => number | null) => summarize(rs.map(r => f(r) ?? NaN)).mean;

describe('geometriya', () => {
  it('4 tarmoq, har birida L/T/R va velo; tramvay faqat Shimol–Janub', () => {
    const g = buildGeometry();
    const keys = Object.keys(g.paths);
    for (let k = 0; k < 4; k++) for (const m of ['LA', 'TA', 'TB', 'RB', 'VV']) expect(keys).toContain(`${k}${m}`);
    expect(keys.filter(x => x.endsWith('MM')).sort()).toEqual(['0MM', '2MM']);
  });
  it('toʻxtash chizigʻi har yoʻlda bir xil masofada, oʻtish joyidan oldin', () => {
    const g = buildGeometry({ pocket: 0 });
    const p = g.paths['0TA'];
    expect(p.zones[0].stopS).toBeCloseTo(120 - (3 * 3.5 + 6), 6);
    expect(p.cross[0].j).toBe(0);
    expect(p.cross[0].s).toBeGreaterThan(p.zones[0].stopS);
  });
  it('choʻntak: chapga ketuvchi choʻntakka oʻtadi', () => {
    const z = buildGeometry({ pocket: 60 }).paths['0LA'].zones[0];
    expect(z.pocketS).not.toBeNull();
    expect(z.stopS - (z.pocketS as number)).toBeGreaterThan(55);
  });
  it('razvorot: ikki zona, ikkinchisi qarama-qarshi tarmoqda oʻngga', () => {
    const p = buildGeometry({ ban: true }).paths['0UA'];
    expect(p.zones.map(z => [z.k, z.lane, z.m])).toEqual([[0, 'A', 'T'], [2, 'B', 'R']]);
    expect(p.exit).toBe(1);
  });
  it('trotuardagi samokat yoʻli oʻtish joyini toʻliq kesib oʻtadi', () => {
    const s = buildGeometry().side[0];
    expect(s.j).toBe(3);
    expect(s.s2 - s.s1).toBeGreaterThan(18);
  });
});

describe('svetofor', () => {
  it('4 faza: yashillar + 4 × 3 s = sikl', () => {
    const g = plan(90, false);
    expect(g.reduce((a, b) => a + b, 0) + 12).toBeCloseTo(90, 9);
  });
  it('bir vaqtda ziddiyatli harakatlarga yashil yoʻq', () => {
    const g = plan(90, false);
    for (let t = 0; t < 90; t += 0.5) {
      const ph = phaseAt(t, 90, g);
      const nsT = isGreen(ph, 0, 'T', false), ewT = isGreen(ph, 1, 'T', false);
      expect(nsT && ewT).toBe(false);
      if (pedGreen(ph, 0)) expect(isGreen(ph, 1, 'L', false) || isGreen(ph, 3, 'L', false)).toBe(false);
    }
  });
  it('Webster: L = 12 s, Y = 0,675 → ≈ 71 s', () => {
    expect(webster(12, 0.675)).toBeCloseTo(70.77, 1);
  });
  it('LOS chegaralari', () => {
    expect([10, 20, 35, 55, 80, 81].map(losVehicle).join('')).toBe('ABCDEF');
    expect([10, 20, 30, 40, 60, 61].map(losPed).join('')).toBe('ABCDEF');
  });
});

describe('urugʻ va saqlanish', () => {
  it('bir xil urugʻ → bir xil natija; boshqa urugʻ → boshqa', () => {
    const a = new Sim(sc({ seed: 7 })).run(300).result();
    const b = new Sim(sc({ seed: 7 })).run(300).result();
    const c = new Sim(sc({ seed: 8 })).run(300).result();
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(c));
  });
  it('kelganlar = oʻtganlar + yoʻlda + kirishni kutayotganlar', () => {
    const r = new Sim(sc({ seed: 3, tram: true, ban: true, scoot: 'lane' })).run(900).result();
    const passed = (['car', 'bus', 'mini', 'tram', 'bike', 'scoot'] as const).reduce((a, m) => a + r.modes[m].n, 0);
    expect(passed + r.onNet + r.pending).toBe(r.arrived);
    expect(r.modes.tram.n).toBeGreaterThan(0);
    expect(r.modes.bus.n).toBeGreaterThan(0);
  });
  it('samokat (xavf qatlami) odam-kechikishga kirmaydi', () => {
    const r = new Sim(sc({ seed: 5, scoot: 'side' })).run(400).result();
    expect(r.modes.scoot.n).toBeGreaterThan(0);
    let pn = 0, pd = 0;
    for (const m of ['car', 'bus', 'mini', 'tram', 'bike', 'ped'] as const) { const x = r.modes[m]; if (x.delay !== null) { pn += x.people; pd += x.delay * x.people; } }
    expect(r.personDelay).toBeCloseTo(pd / pn, 9);
    expect(r.risk.scootTotal).toBeGreaterThan(0);
  });
});

describe('sxemalar regressiyasi (yoʻnalish, andoza parametrlar)', () => {
  it('choʻntaksiz chap burilish toʻgʻri harakatni toʻsadi va mashina kechikishini oshiradi', () => {
    const p60 = replicate(sc({ pocket: 60 }), SEEDS, T), p0 = replicate(sc({ pocket: 0 }), SEEDS, T);
    expect(mean(p0, r => r.modes.car.delay)).toBeGreaterThan(mean(p60, r => r.modes.car.delay));
    expect(mean(p0, r => r.blocked)).toBeGreaterThan(mean(p60, r => r.blocked));
  }, 120_000);
  it('avtobus boʻlagi avtobus kechikishini va odam-kechikishni kamaytiradi', () => {
    const mix = replicate(sc({ bus: 'mixed' }), SEEDS, T), lane = replicate(sc({ bus: 'lane' }), SEEDS, T);
    expect(mean(lane, r => r.modes.bus.delay)).toBeLessThan(mean(mix, r => r.modes.bus.delay));
    expect(mean(lane, r => r.personDelay)).toBeLessThan(mean(mix, r => r.personDelay));
  }, 120_000);
  it('velo aralash oqimda alohida yoʻlakdagidan sekinroq', () => {
    const mix = replicate(sc({ bike: 'mixed' }), SEEDS, T), lane = replicate(sc({ bike: 'lane' }), SEEDS, T);
    expect(mean(mix, r => r.modes.bike.delay)).toBeGreaterThan(mean(lane, r => r.modes.bike.delay));
  }, 120_000);
  it('razvorot: piyoda yutadi, chapga ketuvchi yutqazadi', () => {
    const base = sc({ bus: 'off', mini: false });
    const ph = replicate({ ...base, ban: false }, SEEDS, T), ban = replicate({ ...base, ban: true }, SEEDS, T);
    expect(mean(ban, r => r.modes.ped.delay)).toBeLessThan(mean(ph, r => r.modes.ped.delay));
    expect(mean(ban, r => r.leftDelay)).toBeGreaterThan(mean(ph, r => r.leftDelay));
  }, 120_000);
});
