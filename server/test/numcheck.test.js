import { describe, it, expect } from 'vitest';
import { numbersIn, sourceNumbers, unsourced } from '../src/numcheck.js';

const src = (o) => sourceNumbers([{ role: 'user', content: [{ type: 'tool_result', tool_use_id: 't', content: JSON.stringify(o) }] }]);

describe('manbasiz raqam filtri', () => {
  it('hujjat, band, jadval, ilova, roʻyxat raqamlari va kichik butun sonlar tekshirilmaydi', () => {
    const t = '1. ShNQ 2.07.01-23, 84-band, 3-jadval, 5-ilova, № 376 (30.10.2025): 3 ta bino.\n2) VMQ № 1050';
    expect(numbersIn(t)).toEqual([]);
  });
  it('oʻzbekcha yozuv: boʻshliq bilan minglik, vergul bilan kasr', () => {
    expect(numbersIn('13 984,45 m², 5 349–6 485').map((n) => n.v)).toEqual([13984.45, 5349, 6485]);
  });
  it('yaxlitlash: 499,4412 → 499,44 va 499 mos', () => {
    expect(unsourced('499,44 va 499', src({ a: 499.4412 }))).toEqual([]);
    expect(unsourced('499,5', src({ a: 499.4412 }))).toEqual(['499,5']);
  });
  it('javobdagi manbali sonlardan hisob (ogʻish %, farq) qabul qilinadi', () => {
    expect(unsourced('499,44, talab 400, ogʻish 24,9 %, ortiqcha 99,44', src({ a: 499.4412, b: 400 }))).toEqual([]);
  });
  it('manbada yoʻq son — roʻyxatda', () => {
    expect(unsourced('326 oʻrin, 777 yetmaydi', src({ need: 326 }))).toEqual(['777']);
  });
  it('rang kodlari tekshirilmaydi', () => {
    expect(numbersIn('fon #1a3d61, binolar #e5e0d6')).toEqual([]);
  });
  it('foydalanuvchi savolidagi son ham manba', () => {
    const s = sourceNumbers([{ role: 'user', content: [{ type: 'text', text: '12 qavatli boʻlsa?' }] }]);
    expect(unsourced('12 qavat', s)).toEqual([]);
  });
  it('harfga yopishgan raqam — identifikator (W12, O15, M200), tekshirilmaydi', () => {
    expect(unsourced('W12 devoriga O15 deraza, M200 devor turi', [])).toEqual([]);
    expect(unsourced('15 ta deraza', [])).toEqual(['15']);
  });
  it('Binokor: AI ning binokor_try taklifidagi oʻlchamlar manba (m va mm), boshqa buyruq kiritmasi emas', () => {
    const msgs = [{ role: 'user', content: [{ type: 'text', text: 'uy koʻtar' }] },
      { role: 'assistant', content: [{ type: 'tool_use', id: 'a', name: 'binokor_try', input: { lines: ['levels 5 3.3', 'window O15 W1 1.8 L1'] } }, { type: 'tool_use', id: 'b', name: 'highlight', input: { ids: ['77'] } }] },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'a', content: '{"ok":true}' }] }];
    const s = sourceNumbers(msgs, new Set(['binokor_try']));
    expect(unsourced('Qavat 3,3 m, deraza 1,8 m dan, 3300 mm', s)).toEqual([]);
    expect(unsourced('77 ta', s)).toEqual(['77']);
    expect(unsourced('Qavat 3,3 m', sourceNumbers(msgs))).toEqual(['3,3']);
  });
});
