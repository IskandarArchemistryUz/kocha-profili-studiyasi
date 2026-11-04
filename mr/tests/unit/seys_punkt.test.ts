import { describe, it, expect } from 'vitest';
import { SEIS_PLACES, seisForDistrict, seisByKey, seisKey } from '../../src/core/seysmik';
import { demoTree } from '../../src/core/demography';

/** 04.11 (egasi): seysmiklik shahar boʻyicha — QMQ 2.01.03-19, 1-ilova */
describe('1-ilova: aholi punktlari seysmikligi', () => {
  const by = (n: string) => SEIS_PLACES.find(p => p.n === n)!;
  it('asl jadvaldan namunalar', () => {
    expect(SEIS_PLACES.length).toBeGreaterThan(350);
    expect(by('Toshkent').b).toBe(8); expect(by('Toshkent').m).toBe(1);   // 301: 25 / 100
    expect(by('Samarqand').b).toBe(9);                                   // 218: 150 / 500 / 1000
    expect(by('Andijon').b).toBe(9);                                     // 4: 50 / 100 / 500
    expect(by('Nukus').b).toBe(6);                                       // 90: «6 бал.»
    expect(by('Buxoro').b).toBe(7); expect(by('Fargʻona').b).toBe(8);
    expect(by('Tayloq').z).toBe(1);                                      // 221: >1000 — 9*
  });
  it('tumandan: Toshkent shahri va uning tumanlari — 8 ball; shahar nomi bilan', () => {
    expect(seisForDistrict('1726')!.n).toBe('Toshkent');
    expect(seisForDistrict('1726262')?.b ?? seisForDistrict('1726')!.b).toBe(8);
    const tree = demoTree(), sam = tree.find(t => t.region.code === '1718')!.parts.find(x => /Samarqand shahri/.test(x.name))!;
    expect(seisForDistrict(sam.code)!.b).toBe(9);
    expect(seisForDistrict('1718')).toBeNull();   // viloyat jami — punkt aniq emas
  });
  it('kalit', () => { const p = by('Qoʻqon'); expect(seisByKey(seisKey(p))).toBe(p); expect(seisByKey('x')).toBeNull(); });
});
