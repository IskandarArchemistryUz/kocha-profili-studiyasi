import { describe, it, expect, beforeAll } from 'vitest';
let I: typeof import('../../src/i18n');
beforeAll(async () => { (globalThis as any).document = { documentElement: {} }; I = await import('../../src/i18n'); });

describe('i18n — tayyor satrlar', () => {
  it('aniq kalit, boʻlaklar, birliklar', () => {
    I.setLang('en');
    expect(I.tr('Koʻp qavatli turar joy')).toBe('Multi-story residential');
    expect(I.tr('D-1 · 0,86 ga · Koʻp qavatli turar joy')).toBe('D-1 · 0.86 ha · Multi-story residential');
    expect(I.tr('gʻarb–shimoli-gʻarb (292.5°) · 6 %')).toBe('west–northwest (292.5°) · 6 %');
    expect(I.tr('Undo: Seksiyalar generatsiyasi (Ctrl+Z)')).toBe('Undo: Section auto-generation (Ctrl+Z)');
    I.setLang('ru');
    expect(I.tr('D-1 · 0,86 ga')).toBe('D-1 · 0,86 га');
    I.setLang('uz');
    expect(I.tr('D-1 · 0,86 ga')).toBe('D-1 · 0,86 ga');
  });
  it('${…} li kalit namunasi', () => {
    I.setLang('en');
    expect(I.tr('Savdo markazi 40 × 30 m, 2 qavat; hovli — yer usti parkovka (413-band, 25 m²/joy)')).toBe('Shopping center 40 × 30 m, 2 floors; courtyard — surface parking (clause 413, 25 m²/space)');
    I.setLang('uz');
  });
  it('oʻzbekcha atamalar lugʻati', () => {
    I.setLang('uz');
    const u = I.uzTerms;
    expect(u('Kvartira miksi')).toBe('Xonadonlar tarkibi');
    expect(u('12 kvartira mos emas')).toBe('12 xonadon mos emas');
    expect(u('kvartirasi')).toBe('xonadoni');
    expect(u('Kvartallar boʻyicha')).toBe('Dahalar boʻyicha');
    expect(u('yoki xaritada kvartal ichini bosing')).toBe('yoki xaritada daha ichini bosing');
    expect(u('TEP va reyestr')).toBe('TIK va meʼyorlar roʻyxati');
    expect(u('Parsellar va zonalar')).toBe('Yer uchastkalari va zonalar');
    expect(u('6 parsel')).toBe('6 yer uchastkasi');
    expect(u('yer usti parkovka')).toBe('yer usti avtoturargoh');
    expect(u('Uslubni nusxalash (pipetka)')).toBe('Uslubni nusxalash');
    expect(I.tr('Kvartiralar')).toBe('Xonadonlar');
  });
});
