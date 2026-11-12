import { describe, it, expect } from 'vitest';
import { buildNet } from '../../src/core/services';
import { skScan, skScore, skColor, SK_DIMS } from '../../src/joyshunos/skaner';

const sq = (x: number, y: number, s = 10) => [[x, y], [x + s, y], [x + s, y + s], [x, y + s]] as [number, number][];

describe('Joyshunos · ijtimoiy skaner', () => {
  it('ball: radius ichida 100, 3 × radiusda 0, oraligʻi chiziqli', () => {
    expect(skScore(200, 300)).toBe(100);
    expect(skScore(300, 300)).toBe(100);
    expect(skScore(600, 300)).toBe(50);
    expect(skScore(900, 300)).toBe(0);
    expect(skScore(Infinity, 300)).toBe(0);
  });
  it('rang sinflari past → yuqori', () => {
    expect(skColor(10)).toBe('#b4552e');
    expect(skColor(100)).toBe('#dedbd4');
  });
  it('masofa tarmoq boʻylab: aylanma yoʻl toʻgʻri chiziqdan uzun', () => {
    // U shaklidagi koʻcha: bino (0,20) yonida, maktab (200,20) yonida, lekin ular orasida yoʻl faqat pastdan (y = -400) aylanadi
    const net = buildNet([[[0, 0], [0, -400], [200, -400], [200, 0]]]);
    const r = skScan(net, [sq(-5, 5)], { maktab: [[205, 10]] });
    const d = r.b[0].d.maktab!;
    expect(d).toBeGreaterThan(900);   // ~ 400 + 200 + 400 + bogʻlanish
    expect(r.b[0].s[SK_DIMS.findIndex(x => x.id === 'maktab')]).toBeLessThan(100);
  });
  it('transport — bekat va metro ballarining kattasi; topilmagan xizmat 0', () => {
    const net = buildNet([[[0, 0], [2000, 0]]]);
    const r = skScan(net, [sq(0, 5)], { metro: [[600, 0]], bekat: [[1900, 0]] });
    const t = SK_DIMS.findIndex(x => x.id === 'transport'), m = SK_DIMS.findIndex(x => x.id === 'maktab');
    expect(r.b[0].s[t]).toBe(100);       // metro 600 m ≤ 800 m
    expect(r.b[0].s[m]).toBe(0);         // maktab yoʻq
    expect(r.b[0].weak).not.toBe(t);
    expect(r.bins.reduce((a, b) => a + b, 0)).toBe(1);
  });
});

describe('Joyshunos · ijtimoiy skaner — uzilgan tarmoq', () => {
  it('manba tarmoqning boshqa boʻlagida — toʻgʻri masofa × 1,3', () => {
    const net = buildNet([[[0, 0], [100, 0]], [[0, 500], [100, 500]]]);   // ikki alohida koʻcha
    const r = skScan(net, [sq(40, 5)], { maktab: [[50, 495]] });
    expect(r.b[0].d.maktab).toBeCloseTo(Math.hypot(50 - 45, 495 - 10) * 1.3, 0);
  });
});
