import { describe, it, expect } from 'vitest';
import { PRESET_PROFILES, toParts } from '../../src/core/presets';
import { profileById, profileWidth } from '../../src/core/profiles';
describe('Koʻcha shablonlari', () => {
  it('Koʻcha studiyasidagi 49 modul (konstruktorsiz)', () => { expect(PRESET_PROFILES.length).toBe(49); expect(new Set(PRESET_PROFILES.map(p => p.id)).size).toBe(49); });
  it('4 boʻlak (2+2): qatorlar birlashtiriladi', () => {
    const p = profileById('s-r4'); expect(profileWidth(p)).toBeCloseTo(24);
    expect(p.parts.map(x => x.k)).toEqual(['trotuar', 'yashil', 'qatnov', 'yashil', 'trotuar']); expect(p.parts[2].lanes).toBe(4); expect(p.cat).toBe('tuman-magistral');
  });
  it('BRT va tramvay tasmalari', () => {
    expect(profileById('s-r4brt').parts.some(x => x.k === 'avtobus')).toBe(true);
    expect(profileById('s-tramm').parts.some(x => x.k === 'tramvay')).toBe(true);
    expect(profileById('s-ped').cat).toBe('piyoda');
  });
  it('mavjud asosiy profillar oʻzgarmadi', () => { expect(profileById('mahalla-15').name).toBe('Mahalla koʻchasi'); expect(toParts([['lane', 3], ['lane', 3]])[0].lanes).toBe(2); });
});
