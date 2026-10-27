import { describe, it, expect, beforeAll } from 'vitest';
// @ts-ignore — node modullari (faqat test)
import { readFileSync } from 'fs';

/** 10 til: yangi 7 til lugʻati strings.json dagi har kalitni qamraydi, ${…} joy egalari aynan saqlangan */
const EXT = ['es', 'pt', 'fr', 'az', 'uk', 'tr', 'kk'] as const;
const S = JSON.parse(readFileSync(new URL('../../src/i18n/strings.json', import.meta.url), 'utf8')).strings as Record<string, [string, string, string]>;
const PH = (s: string) => (s.match(/\$\{[^}]*\}/g) ?? []).sort();

describe('yangi tillar lugʻati', () => {
  for (const l of EXT) {
    it(`${l}: barcha kalitlar, boʻsh emas, joy egalari mos`, () => {
      const D = JSON.parse(readFileSync(new URL(`../../src/i18n/lang/${l}.json`, import.meta.url), 'utf8')) as Record<string, string>;
      const miss = Object.keys(S).filter(k => !(k in D) || !String(D[k]).trim());
      expect(miss.slice(0, 5), `${l}: yetishmaydi ${miss.length}`).toEqual([]);
      const bad = Object.keys(S).filter(k => { const ref = S[k][1] || k; return JSON.stringify(PH(ref)) !== JSON.stringify(PH(D[k])); });
      expect(bad.slice(0, 5), `${l}: joy egasi farqi ${bad.length}`).toEqual([]);
    });
  }
});

describe('tr() yangi tilda', () => {
  let I: typeof import('../../src/i18n');
  beforeAll(async () => { (globalThis as any).document = { documentElement: {} }; I = await import('../../src/i18n'); });
  it('es: tayyor kalit, birlik va brend', async () => {
    await I.setLang('es');
    expect(I.getLang()).toBe('es');
    expect(I.tr('Oldingi')).not.toBe('Oldingi');
    expect(I.tr('12 kishi/ga')).toContain('hab./ha');
    expect(I.tr('84-band')).toBe('apdo. 84');
    expect(I.brand('Koʻchasoz')).toBe('Diseñador de calles');
  });
  it('kk: kirill birliklar va norma kodi', async () => {
    await I.setLang('kk');
    expect(I.tr('5-jadval')).toBe('5-кесте');
    expect(I.tr('Toshkent tumani')).toContain('ауданы');
    await I.setLang('en');
  });
});
