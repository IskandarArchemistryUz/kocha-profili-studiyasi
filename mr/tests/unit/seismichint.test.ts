import { describe, it, expect } from 'vitest';
import { pgaToBall, SEIS_HINT } from '../../src/core/seismichint';

describe('PGA → ball (taxmin, MSK-64)', () => {
  it('0,1 g → 7, 0,2 g → 8, 0,4 g → 9; kichigi — ≤ 6, kattasi — >9', () => {
    expect(pgaToBall(0.03)).toBe(6); expect(pgaToBall(0.1)).toBe(7); expect(pgaToBall(0.2)).toBe(8);
    expect(pgaToBall(0.4)).toBe(9); expect(pgaToBall(0.8)).toBe(10); expect(pgaToBall(0)).toBe(6);
  });
  it('mamlakat izohi: Chili — NCh433 zonasi, Rossiya — ball', () => {
    expect(SEIS_HINT.CL).toMatchObject({ scale: 'zona', code: 'NCh433' });
    expect(SEIS_HINT.RU.scale).toBe('ball');
  });
});
