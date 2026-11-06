import { describe, it, expect } from 'vitest';
import { limitZones, QAB100_DENY, type Limit } from '../../src/core/limits';
import { limitChecks } from '../../src/core/limitcheck';
import { denyZone, mpArea } from '../../src/core/szzgen';
import { blankProject } from '../../src/core/doc';
import { apply } from '../../src/core/commands';
import { RULES } from '../../src/norms/rules';
import { frame, type XY } from '../../src/core/geo';

/** 06.11 (c65, egasi): VM 101-son qarori, 1-ilova, 50-band — SMZ va «turar joy, jamoat binolari, dam olish zonalari devoridan ≥ 100 m» alohida */
const sq = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const mk = (sub: Limit['sub'], blds: { r: XY[]; use: string }[]) => {
  let d = blankProject('t') as any; const fr = frame(d.origin), G = (p: XY) => fr.toGeo(p);
  d.site = { rings: [sq(-300, -300, 300, 300).map(G)] };
  d = apply(d, { type: 'addLimit', limit: { id: 'q1', kind: 'qabriston', status: 'saqlanadi', src: 'qolda', rings: [sq(-20, -20, 20, 20).map(G)], sub } } as any);
  blds.forEach((b, i) => { d = apply(d, { type: 'addBuilding', id: `b${i}`, footprint: b.r.map(G), floors: 5, nonRes: 0, use: b.use } as any); });
  return d;
};
const rule = (id: string, d: any) => RULES.find(r => r.id === id)!.evaluate({} as any, d);

describe('qabriston: SMZ va 100 m alohida (VM 101, 50-band)', () => {
  it('qishloq qabristoni: SMZ 50 m, 100 m halqa alohida', () => {
    const z = limitZones(mk({ open: true, rural: true }, []));
    expect(z.soft.find(s => s.kind === 'qabriston')?.m).toBe(50);
    expect(z.qab).toHaveLength(1); expect(z.qab[0]).toMatchObject({ m: 100, smz: 50, flag: 'NORMA' });
    expect(z.qab[0].ref).toContain('100 метрдан кам бўлмаслиги керак');
  });
  it('50–100 m oraligʻida: turar joy, ofis — mos emas; avtoturargoh, ombor — mumkin', () => {
    // qabriston chegarasi x = 20 dan: 70 m masofadagi binolar
    const d = mk({ open: true, rural: true }, [
      { r: sq(90, -10, 110, 10), use: 'turar' }, { r: sq(90, 30, 110, 50), use: 'ofis' },
      { r: sq(90, -50, 110, -30), use: 'avtoturargoh' }, { r: sq(-110, -10, -90, 10), use: 'logistika' },
      { r: sq(200, -10, 230, 10), use: 'turar' },
    ]);
    const c = limitChecks(d);
    expect(c.szz).toHaveLength(0);                                   // SMZ (50 m) ichida bino yoʻq
    expect(c.qab.map(x => x.bid).sort()).toEqual(['b0', 'b1']);
    expect(rule('qab-100', d)).toMatchObject({ status: 'fail', value: 2 });
    expect(rule('qab-szz', d).status).toBe('pass');
  });
  it('kamaytirish 100 m ga qoʻllanmaydi: yopiq qabriston SMZ i qoʻlda 50 m — 100 m halqa qoladi', () => {
    const d = mk({ open: false }, [{ r: sq(90, -10, 110, 10), use: 'turar' }]);
    d.limits = d.limits.map((l: Limit) => ({ ...l, szz: 50 }));
    expect(limitZones(d).qab[0].smz).toBe(50);
    expect(rule('qab-100', d).status).toBe('fail');
  });
  it('SMZ ≥ 100 m (shahar, 300 m): halqa hisoblanadi, SMZ ichidagi jamoat binosi — taqiq', () => {
    const d = mk({ open: true }, [{ r: sq(150, -10, 170, 10), use: 'savdo' }, { r: sq(60, -10, 80, 10), use: 'texnik' }]);
    const z = limitZones(d);
    expect(z.soft[0].m).toBe(300); expect(z.qab[0].smz).toBe(300);
    expect(limitChecks(d).szz.find(x => x.bid === 'b0')?.verdict).toBe('deny');
    expect(rule('qab-szz', d).status).toBe('fail');
    expect(rule('qab-100', d).status).toBe('pass');
  });
  it('dam olish zonasi (park kvartali) 100 m ichida — mos emas', () => {
    const d = mk({ open: true, memorial: true }, []);
    d.zones = [{ id: 'z1', at: frame(d.origin).toGeo([80, 0]), use: 'yashil' } as any];
    const c = limitChecks(d);
    expect(c.qabBlocks.length).toBeGreaterThan(0);
    expect(rule('qab-100', d).status).toBe('fail');
  });
  it('generator: 100 m halqa turar joy va jamoat funksiyalari uchun taqiq, avtoturargoh uchun yoʻq', () => {
    const d = mk({ open: true, rural: true }, []);
    expect(mpArea(denyZone(d, 'turar'))).toBeGreaterThan(Math.PI * 100 * 100);
    expect(denyZone(d, 'avtoturargoh')).toHaveLength(0);
    expect(QAB100_DENY).toEqual(expect.arrayContaining(['turar', 'maktab', 'mtm', 'savdo', 'ofis', 'yashil', 'sport']));
    expect(QAB100_DENY).not.toContain('avtoturargoh');
  });
  it('qabriston yoʻq — na', () => {
    let d = blankProject('t') as any; d.site = { rings: [sq(-300, -300, 300, 300).map(frame(d.origin).toGeo)] };
    expect(rule('qab-100', d).status).toBe('na'); expect(rule('qab-szz', d).status).toBe('na');
  });
});
