import { describe, it, expect } from 'vitest';
import { pdfChunks } from '../../src/ui/pdf';

const pg = (n: number) => ({ svg: 'x'.repeat(n) });
describe('PDF boʻlaklari (katta albom xotirasi)', () => {
  it('kichik albom — bitta boʻlak', () => {
    expect(pdfChunks([pg(10), pg(20), pg(30)], 100)).toHaveLength(1);
  });
  it('chegaradan oshsa — yangi boʻlak; tartib va varaqlar soni saqlanadi', () => {
    const pages = Array.from({ length: 10 }, (_, i) => ({ svg: 'x'.repeat(40), i }));
    const g = pdfChunks(pages, 100);
    expect(g.map(x => x.length)).toEqual([2, 2, 2, 2, 2]);
    expect(g.flat().map(p => p.i)).toEqual(pages.map(p => p.i));
    for (const x of g) expect(x.reduce((a, p) => a + p.svg.length, 0)).toBeLessThanOrEqual(100);
  });
  it('chegaradan katta bitta varaq — oʻzi alohida boʻlak, boʻsh boʻlak yoʻq', () => {
    const g = pdfChunks([pg(10), pg(500), pg(10)], 100);
    expect(g.map(x => x.length)).toEqual([1, 1, 1]);
  });
  it('boʻsh roʻyxat — boʻlak yoʻq', () => { expect(pdfChunks([], 100)).toEqual([]); });
});
