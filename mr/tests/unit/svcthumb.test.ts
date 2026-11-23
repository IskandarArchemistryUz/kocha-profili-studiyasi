import { describe, it, expect } from 'vitest';
import { ringSvg } from '../../src/storage/svcthumb';

describe('servis eskizi (23.11)', () => {
  it('hudud halqasi → SVG data URL, oyna ichida', () => {
    const u = ringSvg([[69.27, 41.31], [69.28, 41.31], [69.28, 41.32], [69.27, 41.32]])!;
    expect(u.startsWith('data:image/svg+xml,')).toBe(true);
    const pts = decodeURIComponent(u).match(/points="([^"]+)"/)![1].split(' ').map(p => p.split(',').map(Number));
    for (const [x, y] of pts) { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(480); expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(236); }
  });
  it('2 nuqtali halqa — eskiz yoʻq', () => { expect(ringSvg([[1, 1], [2, 2]])).toBeNull(); });
});
