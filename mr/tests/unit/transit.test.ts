import { describe, it, expect } from 'vitest';
import { cityCategory, cityOf, stopRadius, stopZone } from '../../src/core/transit';
import { analyze, buildNet, type Demand } from '../../src/core/services';
import type { XY } from '../../src/core/geo';

describe('Bekatgacha radius (ShNQ 2.07.01-23, 382–383-band)', () => {
  it('shahar toifasi — andoza chegaralari', () => {
    expect(cityCategory(3_178_100)).toBe('engyirik');
    expect(cityCategory(1_000_000)).toBe('yirik');
    expect(cityCategory(605_800)).toBe('yirik');
    expect(cityCategory(178_300)).toBe('katta');
    expect(cityCategory(66_100)).toBe('orta');
    expect(cityCategory(9_500)).toBe('kichik');
  });
  it('Toshkent tumani → butun shahar; tuman — shahar emas', () => {
    expect(cityOf('1726287')).toMatchObject({ pop: 3_178_100, city: true });
    expect(cityOf('1718401')).toMatchObject({ city: true });
    expect(cityOf('1718')!.city).toBe(false);
  });
  it('hudud turi va radius', () => {
    expect(stopZone('turar')).toBe('odatiy'); expect(stopZone('yakka')).toBe('yakka'); expect(stopZone('yashil')).toBe('dam');
    expect(stopRadius('odatiy', 'engyirik', false).r).toBe(400);
    expect(stopRadius('yakka', 'katta', false).r).toBe(600);
    expect(stopRadius('yakka', 'orta', false).r).toBe(800);
    expect(stopRadius('odatiy', 'yirik', true).r).toBe(250);
    expect(stopRadius('odatiy', 'katta', true).r).toBe(400);   // markaz qoidasi faqat eng yirik va yirik shaharda
    expect(stopRadius('dam', 'engyirik', true).r).toBe(800);
    expect(stopRadius('odatiy', 'engyirik', false, 14)).toMatchObject({ r: 330, cut: 70 });   // dizayndagi misol
  });
  it('tahlil: seksiya radiusi almashtiriladi', () => {
    const net = buildNet([[[0, 0], [1000, 0]]]);
    const demand: Demand[] = [{ p: [0, 0] as XY, w: 1, bid: 'a', r: { bekat: 600 } }, { p: [0, 0] as XY, w: 1, bid: 'b' }];
    const res = analyze(net, demand, { bekat: [{ pts: [[500, 0]] }] } as never).find(r => r.kind === 'bekat')!;
    expect(res.rd).toEqual([600, 400]);
    expect(res.share).toBeCloseTo(0.5, 5);
    expect([res.rMin, res.rMax]).toEqual([400, 600]);
  });
});
