import { describe, it, expect } from 'vitest';
import { fitScale, STD_SCALES } from '../../src/core/aptsheet';

describe('Kvartirografiya: katakka mos standart masshtab (GOST 2.302)', () => {
  it('sigʻadigan eng yirik masshtab; 1:150 kabi nostandart yoʻq', () => {
    // 1:100 da 300 × 150 mm reja
    expect(fitScale(300, 150, 320, 200)).toBe(100);
    expect(fitScale(300, 150, 420, 250)).toBe(75);
    expect(fitScale(300, 150, 650, 400)).toBe(50);
    expect(fitScale(300, 150, 220, 250)).toBe(200);
    expect(fitScale(300, 150, 40, 30)).toBe(800);
    expect(STD_SCALES).not.toContain(150);
  });
});
