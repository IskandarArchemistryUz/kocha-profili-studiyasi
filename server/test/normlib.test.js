import { describe, it, expect } from 'vitest';
import { lookup, parseClause, findDoc, loadLib } from '../src/normlib.js';

describe('band matnlari kutubxonasi', () => {
  it('ShNQ 2.07.01-23 — toʻliq, uzluksiz, 86-band soʻzma-soʻz', () => {
    const d = findDoc('SHNQ 2.07.01-23');
    const nums = Object.keys(d.clauses).filter(k => /^\d+$/.test(k)).map(Number);
    expect(Math.max(...nums)).toBe(nums.length);   // 1…N, bitta ham tushib qolmagan
    const r = lookup('ShNQ 2.07.01-23', '86-band');
    expect(r.found).toBe(true);
    expect(r.text).toContain('30 foizdan kam boʻlmasligi kerak');
    expect(r.amend[0]).toContain('01/2-15');
  });
  it('yuqori indeks, jadval, ilova', () => {
    expect(lookup('ShNQ 2.07.01-23', '6511').clause).toBe('651¹-band');
    expect(lookup('ShNQ 2.07.01-23', '2-jadval').clause).toBe('2-jadval (79-band)');
    expect(lookup('SHNQ 2.05.07-24', '171^1').text).toMatch(/^171¹\. /);
    expect(lookup('SHNQ 2.05.07-24', '1-ilova').found).toBe(true);
    expect(lookup('VM 101-son qarori (04.04.2011)', '1-ilova, 50-band').text).toContain('СҲЗ');
  });
  it('kutubxonada yoʻq — found: false', () => {
    expect(lookup('QMQ 2.01.03-19', '5')).toMatchObject({ found: false, reason: 'doc_not_in_library' });
    expect(lookup('SHNQ 2.05.07-24', '107')).toMatchObject({ found: false, reason: 'not_in_library' });   // oʻz kuchini yoʻqotgan
  });
  it('13.11: normalar papkasidan qoʻshilgan hujjatlar — uzluksiz', () => {
    for (const [doc, max] of [['SHNQ 2.05.07-24', 265], ['ShNQ 2.07.06-24', 128], ['ShNQ 2.08.01-24', 349], ['SanQvaN 0102-25', 125], ['ShNQ 2.08.02-23', 903], ['VMQ № 1050', 56]]) {
      const d = findDoc(doc), nums = new Set(Object.keys(d.clauses).filter(k => /^\d+$/.test(k)).map(Number));
      expect(Math.max(...nums), doc).toBe(max);
      // tushib qolgan raqamlar faqat «oʻz kuchini yoʻqotgan» bandlar
      expect([...Array(max).keys()].map(i => i + 1).filter(n => !nums.has(n)).every(n => [107, 165].includes(n)), doc).toBe(true);
    }
    expect(lookup('OʻRQ-1149', '36-modda')).toMatchObject({ found: true, clause: '36-modda' });
    expect(lookup('SanQvaN 0103-25', '1-ilova').text).toContain('Azot birikmalarni');
    expect(lookup('SHNQ 2.08.01-24', '142¹').found).toBe(true);
  });
  it('band yozuvini ajratish', () => {
    expect(parseClause('86')).toMatchObject({ kind: 'clause', key: '86' });
    expect(parseClause('jadval 5')).toEqual({ kind: 'table', key: '5' });
    expect(loadLib().length).toBeGreaterThanOrEqual(4);
  });
});
