import { describe, it, expect } from 'vitest';
import { fireComp, FIRE_COMP_ANDOZA } from '../../src/core/seysmik';
import { RAMP_SLOPE } from '../../src/core/landscape';

/** ShNQ 2.08.02-23, 44-band, 2-ilova: 2-jadval (jamoat) va 3-jadval (savdo) */
describe('yongʻinga qarshi devorlar orasidagi qavat maydoni', () => {
  it('savdo — 3-jadval (I, II): 1 / 2 / 3–5 qavat', () => {
    expect(fireComp('savdo', 1, 'monolit').area).toBe(3500);
    expect(fireComp('savdo', 2, 'karkas').area).toBe(3000);
    expect(fireComp('savdo', 4, 'gisht').area).toBe(2500);
  });
  it('jamoat — 2-jadval: I CO va II CO', () => {
    expect(fireComp('ofis', 1, 'monolit').area).toBe(6000);
    expect(fireComp('mehmonxona', 3, 'monolit').area).toBe(5000);
    expect(fireComp('mehmonxona', 3, 'toldirgich').area).toBe(4000);
    expect(fireComp('ofis', 12, 'monolit').area).toBe(2500);
    expect(fireComp('ofis', 12, 'gisht').area).toBe(2200);
  });
  it('avtoturargoh — andoza', () => { const f = fireComp('avtoturargoh', 2, 'monolit'); expect(f.area).toBe(FIRE_COMP_ANDOZA); expect(f.norm).toBe(false); });
  it('rampa nishabi — 20-jadval: 80 ‰', () => expect(RAMP_SLOPE).toBe(0.08));
});
