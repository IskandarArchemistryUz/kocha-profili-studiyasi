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
  it('foydalanuvchi savolidagi son ham manba', () => {
    const s = sourceNumbers([{ role: 'user', content: [{ type: 'text', text: '12 qavatli boʻlsa?' }] }]);
    expect(unsourced('12 qavat', s)).toEqual([]);
  });
});
