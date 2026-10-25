import { describe, it, expect } from 'vitest';
import { abroadRules, isUzDoc, ABROAD_NOTE, type Result } from '../../src/norms/rules';

const r = (status: Result['status'], doc: string, note?: string): Result => ({ id: 'x', title: 't', status, source: { doc, clause: '1', edition: '2023', verified: true }, note });
describe('33-band: xorijda Oʻzbekiston meʼyorlari — andoza', () => {
  it('UZ — oʻzgarmaydi', () => { const a = [r('fail', 'ShNQ 2.07.01-23')]; expect(abroadRules(a, 'UZ')).toBe(a); });
  it('xorijda: ShNQ/SanQvaN «mos emas» → «koʻrib chiqish», izohda aytiladi; boshqa manba oʻzgarmaydi', () => {
    const [a, b, c, d] = abroadRules([r('fail', 'ShNQ 2.07.01-23', 'Zichlik yuqori'), r('pass', 'SanQvaN 0331-16'), r('fail', 'Lawson (LDDC)'), r('na', 'QMQ 2.04.03-19')], 'intl');
    expect(a.status).toBe('review'); expect(a.note).toBe(`${ABROAD_NOTE}\nZichlik yuqori`);
    expect(b.status).toBe('pass'); expect(b.note).toBe(ABROAD_NOTE);
    expect(c).toMatchObject({ status: 'fail' }); expect(c.note).toBeUndefined();
    expect(d.status).toBe('na');
    expect(isUzDoc('Toshkent dizayn-kodi 6.3')).toBe(true); expect(isUzDoc('NACTO')).toBe(false);
  });
});
