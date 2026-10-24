import { describe, it, expect } from 'vitest';
import { placeOf, tzOffsetH, utcLabel, seasonMonth, summerKey } from '../../src/core/place';
import { localToUtc, localToUtcAt, daySteps, sunPosition } from '../../src/core/sun';

describe('Hudud joyi: vaqt mintaqasi, mamlakat, yarimshar', () => {
  it('koordinatadan vaqt mintaqasi va mamlakat', () => {
    expect(placeOf(69.28, 41.31)).toMatchObject({ tz: 'Asia/Tashkent', country: 'UZ', south: false, norms: 'UZ' });
    expect(placeOf(2.35, 48.85)).toMatchObject({ tz: 'Europe/Paris', country: 'FR', norms: 'intl' });
    expect(placeOf(-73.99, 40.73)).toMatchObject({ tz: 'America/New_York', country: 'US' });
    expect(placeOf(144.96, -37.81)).toMatchObject({ tz: 'Australia/Melbourne', country: 'AU', south: true });
  });
  it('yozgi vaqt bilan UTC farqi', () => {
    expect(tzOffsetH('Europe/Paris', Date.UTC(2026, 6, 15, 12))).toBe(2);
    expect(tzOffsetH('Europe/Paris', Date.UTC(2026, 0, 15, 12))).toBe(1);
    expect(tzOffsetH('Asia/Tashkent', Date.UTC(2026, 6, 15, 12))).toBe(5);
    expect(tzOffsetH('Asia/Kolkata', Date.UTC(2026, 6, 15, 12))).toBe(5.5);
    expect(utcLabel(5.5)).toBe('UTC+5:30'); expect(utcLabel(-4)).toBe('UTC−4');
  });
  it('mahalliy vaqt → UTC: Parij 15:00 yozda = 13:00 UTC; Toshkent eski xatti-harakati saqlangan', () => {
    expect(localToUtc(2026, 7, 15, 15, 'Europe/Paris').toISOString()).toBe('2026-07-15T13:00:00.000Z');
    expect(localToUtc(2026, 1, 15, 15, 'Europe/Paris').toISOString()).toBe('2026-01-15T14:00:00.000Z');
    expect(localToUtc(2026, 7, 15, 15).toISOString()).toBe('2026-07-15T10:00:00.000Z');
    expect(localToUtcAt(2026, 7, 15, 15, 41.31, 69.28).toISOString()).toBe('2026-07-15T10:00:00.000Z');
    // Parijda mahalliy 13:30 atrofida quyosh eng baland (janubda) boʻlishi kerak
    const p = sunPosition(localToUtcAt(2026, 7, 15, 13.9, 48.85, 2.35), 48.85, 2.35);
    expect(Math.abs(p.az - 180)).toBeLessThan(12);
  });
  it('Nyu-Yorkda kun oxirigacha quyosh hisobga olinadi (avval Toshkent vaqti 4–21 boʻyicha kesilardi)', () => {
    const st = daySteps(2026, 6, 21, 40.73, -73.99, 15);
    const hours = st.reduce((a, s) => a + s.dt, 0);
    expect(hours).toBeGreaterThan(14);   // 21 iyun Nyu-Yorkda ~15 soat kunduz
  });
  it('janubiy yarimsharda yoz — yanvar', () => {
    expect(seasonMonth(7, false)).toBe(7);
    expect(seasonMonth(7, true)).toBe(1);
    expect(seasonMonth(12, true)).toBe(6);
    expect(summerKey('Trotuar 15 iyul 15:30', true)).toBe('Trotuar 15 yanvar 15:30');
  });
});
