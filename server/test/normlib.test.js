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
    expect(lookup('ShNQ 2.08.01-24', '5')).toMatchObject({ found: false, reason: 'doc_not_in_library' });
    expect(lookup('SHNQ 2.05.07-24', '30')).toMatchObject({ found: false, reason: 'not_in_library', coverage: 'partial' });
  });
  it('band yozuvini ajratish', () => {
    expect(parseClause('86')).toMatchObject({ kind: 'clause', key: '86' });
    expect(parseClause('jadval 5')).toEqual({ kind: 'table', key: '5' });
    expect(loadLib().length).toBeGreaterThanOrEqual(4);
  });
});
