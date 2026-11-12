import { describe, it, expect } from 'vitest';
import { placeOf, placeLabel } from '../../src/core/place';
import { COUNTRY_UZ } from '../../src/core/countries-uz';

/** 12.11 (egasi): davlat nomi interfeys tiliga qarab — oʻzbekchada «Oʻzbekiston», «Fransiya» (brauzerda uz-Latn boʻlmasa ham) */
describe('davlat nomlari', () => {
  it('oʻzbekcha jadval toʻliq va toʻgʻri tutuq belgisi bilan', () => {
    expect(Object.keys(COUNTRY_UZ).length).toBeGreaterThan(240);
    expect(COUNTRY_UZ.UZ).toBe('Oʻzbekiston');
    expect(COUNTRY_UZ.FR).toBe('Fransiya');
    expect(COUNTRY_UZ.US).toBe('Amerika Qoʻshma Shtatlari');
    expect(Object.values(COUNTRY_UZ).some(v => /[‘’']/.test(v))).toBe(false);
  });
  it('placeLabel: uz — jadvaldan, boshqa tillar — Intl', () => {
    const tash = placeOf(69.2797, 41.3111), paris = placeOf(2.3522, 48.8566);
    expect(placeLabel(tash, 'uz').split(' · ')[0]).toBe('Oʻzbekiston');
    expect(placeLabel(paris, 'uz').split(' · ')[0]).toBe('Fransiya');
    expect(placeLabel(paris, 'en').split(' · ')[0]).toBe('France');
    expect(placeLabel(tash, 'ru').split(' · ')[0]).toBe('Узбекистан');
  });
});
