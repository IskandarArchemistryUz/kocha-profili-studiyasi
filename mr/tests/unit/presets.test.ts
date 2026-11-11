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
  it('07.11: burchakli avtoturargoh chuqurligi — SHNQ 2.05.07-24, 1-ilova 4-izoh (5,5 × 2,5 m): 90° → 5,5; 45° → 5,7; 30° → 4,9 m', () => {
    const pw = (id: string) => profileById(id).parts.filter(x => x.k === 'parkovka').map(x => x.w);
    expect(pw('s-res90')).toEqual([5.5]); expect(pw('s-res45')).toEqual([5.7, 5.7]); expect(pw('s-r4p30')).toEqual([4.9, 4.9]);
  });
  it('11.11 (c75): parallel avtoturargoh eni 2,5 m — SHNQ 2.05.07-24, 1-ilova 4-izoh (avval 2,3 / 2,2)', () => {
    const pw = (id: string) => profileById(id).parts.filter(x => x.k === 'parkovka').map(x => x.w);
    expect(pw('s-r2pb')).toEqual([2.5, 2.5]); expect(pw('s-res')).toEqual([2.5, 2.5]); expect(pw('s-resp1')).toEqual([2.5]); expect(pw('s-resOne')).toEqual([2.5]);
    expect(PRESET_PROFILES.flatMap(p => p.parts.filter(x => x.k === 'parkovka').map(x => x.w)).every(w => w >= 2.5)).toBe(true);
  });
  it('mavjud asosiy profillar oʻzgarmadi', () => { expect(profileById('mahalla-15').name).toBe('Mahalla koʻchasi'); expect(toParts([['lane', 3], ['lane', 3]])[0].lanes).toBe(2); });
});
