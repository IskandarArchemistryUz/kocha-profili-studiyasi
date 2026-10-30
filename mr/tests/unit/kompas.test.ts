import { describe, it, expect } from 'vitest';
import { insolCompass, toAz } from '../../src/core/kompas';

describe('insolyatsiya kompasi (30.10)', () => {
  it('azimut: sharq 0° → 90°, shimol 90° → 0°, gʻarb 180° → 270°', () => { expect(toAz(0)).toBe(90); expect(toAz(90)).toBe(0); expect(toAz(180)).toBe(270); expect(toAz(-45)).toBe(135); });
  it('Toshkent, 22 mart, 2·H: shimol fasadi quyoshsiz, janub ≥ 2 soat; diagonal toʻrda 4 fasad ham ≥ 2 soat', () => {
    const c = insolCompass(41.31, 69.28, { H: 27 });
    const r0 = c.rows.find(r => r.deg === 0)!;      // sharq–gʻarb va shimol–janub fasadlar
    const n = r0.facades.find(f => f.az === 0)!, s = r0.facades.find(f => f.az === 180)!;
    expect(n.run).toBeLessThan(0.5); expect(s.run).toBeGreaterThanOrEqual(2);
    expect(r0.ok).toBeLessThan(4);
    const r45 = c.rows.find(r => r.deg === 45)!;
    expect(r45.ok).toBe(4);
    expect(c.best.length).toBeGreaterThan(0); for (const d of c.best) expect(c.rows.find(r => r.deg === d)!.ok).toBe(4);
    // 15-band: har 90° toʻrda roppa-rosa bitta fasad 200–290° ga tushadi (chegaralarda 0 yoki 2 boʻlishi mumkin)
    expect(r45.west).toBe(1);
  });
});
