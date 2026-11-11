import { describe, it, expect, beforeAll } from 'vitest';

/** 11.11 (L7, video yozishda): ingliz interfeysida tarjimasiz qolgan qatorlar */
let I: typeof import('../../src/i18n');
beforeAll(async () => { (globalThis as any).document = { documentElement: {} }; I = await import('../../src/i18n'); });
describe('L7 tarjimalar', () => {
  it('en: 3-qadam kompensatsiya, KPI, maktab/MTM, meʼyorga moslash', () => {
    I.setLang('en');
    expect(I.tr('1149: renovatsiya')).toBe('1149: renovation');
    expect(I.tr('$/m²·oy')).toBe('$/m²·month');
    expect(I.tr('$/xon.')).toBe('$/household');
    expect(I.tr('Asosiy koʻrsatkichlar')).toBe('Key indicators');
    expect(I.tr('uybor.uz, Toshkent, 2026-11-11 — shahar median (soʻralgan narx)')).toBe('uybor.uz, Tashkent, 2026-11-11 — city median (asking price)');
    expect(I.tr('oʻquvchi')).toBe('students');
    expect(I.tr('UMN')).toBe('FAR');
    expect(I.tr('Meʼyorga moslash: 3 ta seksiyaning qavati pasaytirildi (79-band 2-jadval: binolar orasi ≥ 2·Hmax, qizil chiziqqacha H × 0,25; QMQ 2.01.03-19, 3.1-jadval)')).toMatch(/^Code fit: floors lowered in 3 sections/);
    I.setLang('ru');
    expect(I.tr('$/m²·yil')).toBe('$/м²·год');
    I.setLang('uz');
  });
});
