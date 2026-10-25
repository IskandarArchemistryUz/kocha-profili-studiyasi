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
  it('avtoturargoh izohlari (generator)', () => {
    I.setLang('en');
    expect(I.tr('Avtoturargoh (Yer usti): 166 joy (Perpendikulyar 90°, 2,5 × 5,3 m, boʻlak 6 m)')).toBe('Parking (Surface): 166 spaces (Perpendicular 90°, 2.5 × 5.3 m, aisle 6 m)');
    expect(I.tr('Talab: 1221 joy (29-jadval: xonadonlar 771 · savdo 450)')).toBe('Demand: 1221 spaces (table 29: apartments 771 · retail 450)');
    I.setLang('ru');
    expect(I.tr('Avtoturargoh (Yer osti): 1232 joy — 2 sath × 616 joy (Perpendikulyar 90°, 2,5 × 5,3 m, boʻlak 6 m; rampa, tugunlar va ustunlar −20 %)')).toBe('Автостоянка (Подземная): 1232 машино-мест — 2 ур. × 616 мест (Перпендикулярная 90°, 2,5 × 5,3 м, проезд 6 м; рампы, узлы и колонны −20 %)');
    I.setLang('uz');
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

describe('Chizmadon material nomlari (sayt, 25.10: «Building Apartment mix · 1» chiqardi)', () => {
  it('Kvartirografiya · N-bino — toʻgʻri tartibda', () => {
    I.setLang('en'); expect(I.tr('Kvartirografiya · 3-bino')).toBe('Apartment mix · Building 3'); expect(I.tr('Xonadonlar eksplikatsiyasi · 12-bino')).toBe('Apartment schedule · Building 12');
    I.setLang('ru'); expect(I.tr('Kvartirografiya · 3-bino')).toBe('Квартирография · Здание 3');
    I.setLang('uz');
  });
});
