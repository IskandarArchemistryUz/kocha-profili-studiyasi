import { describe, it, expect } from 'vitest';
import { compensation, classify, parseMonitoring, COMP_DEFAULT } from '../../src/core/compensation';

describe('Koʻchirish xarajati (OʻRQ-781 / OʻRQ-1149)', () => {
  const list = [
    { id: 1, area: 120, h: 4, kind: 'house' },        // hovli, 1 qavat, 120 m²
    { id: 2, area: 400, h: 16, kind: 'apartments' },  // 5 qavat × 400 = 2000 m², netto 1600
    { id: 3, area: 100, h: 3.2, kind: 'retail' },     // noturar 100 m²
  ];
  const p = { ...COMP_DEFAULT, priceFlat: 2000, priceHouse: 1300, priceNonres: 1500, rentRate: 5, rentMonths: 24, movingPerHh: 300, profitRate: 100 };
  it('turlarga ajratish', () => {
    expect(list.map(classify)).toEqual(['hovli', 'kvartira', 'noturar']);
    expect(classify({ id: 9, area: 90, h: 4 })).toBe('hovli');
    expect(classify({ id: 9, area: 600, h: 15 })).toBe('kvartira');
  });
  it('781: 5 % bozor qiymatidan, foyda 1 yil', () => {
    const r = compensation(list, p);
    const market = 120 * 1300 + 1600 * 2000 + 100 * 1500;
    expect(r.market).toBeCloseTo(market, 3);
    expect(r.inconvenience).toBeCloseTo(market * 0.05, 3);
    expect(r.profit).toBeCloseTo(100 * 100 * 1, 3);
    expect(r.households).toBe(1 + Math.round(1600 / 60));
    expect(r.resArea).toBeCloseTo(120 + 1600, 3);
    expect(r.total).toBeCloseTo(r.market + r.inconvenience + r.rent + r.moving + r.profit, 3);
  });
  it('1149: 12 % aniqlangan kompensatsiyadan, foyda 2 yil', () => {
    const r = compensation(list, { ...p, regime: 'orq1149' });
    expect(r.profit).toBeCloseTo(100 * 100 * 2, 3);
    expect(r.inconvenience).toBeCloseTo((r.market + r.rent + r.moving + r.profit) * 0.12, 3);
  });
  it('narx kiritilmagan toifa belgilanadi', () => {
    expect(compensation(list, { ...COMP_DEFAULT }).missing).toEqual(['hovli', 'kvartira', 'noturar']);
  });
  it('monitoring CSV — oxirgi sana', () => {
    const csv = 'sana,manba,hudud,kategoriya,api_jami,oqildi,yaroqli,median_usd_m2,p25_usd_m2,p75_usd_m2,atrof_1500m_soni,atrof_1500m_median_usd_m2\n2026-10-15,u,M,kvartira,1,1,1,1900,,,,1600\n2026-10-16,u,M,hovli,1,1,1,1295,,,,1281\n2026-10-16,u,M,kvartira,1,1,1,2071,,,,1739\n';
    expect(parseMonitoring(csv)).toEqual({ date: '2026-10-16', flat: 2071, house: 1295, flatNear: 1739, houseNear: 1281 });
  });
});
