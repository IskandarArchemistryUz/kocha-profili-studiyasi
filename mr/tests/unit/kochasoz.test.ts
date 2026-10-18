import { describe, it, expect } from 'vitest';
import { PROFILES, profileWidth } from '../../src/core/profiles';
import { profileToKs } from '../../src/kochasoz/fromMr';

describe('Master reja profili → Koʻchasoz kesimi', () => {
  it('har profil: kenglik saqlanadi, boʻlaklar soni toʻgʻri', () => {
    for (const p of PROFILES) {
      const k = profileToKs(p);
      expect(k.rl).toBeCloseTo(profileWidth(p), 1);
      const lanes = p.parts.filter(x => x.k === 'qatnov').reduce((a, x) => a + (x.lanes ?? Math.max(1, Math.round(x.w / 3.5))), 0);
      expect(k.els.filter(e => e[0] === 'qat').length).toBe(lanes);
      expect(['mh', 'tm', 'sh3', 'pd']).toContain(k.sk);
    }
  });
  it('mahalla koʻchasi: piyoda, yashil (daraxt), 2 harakat boʻlagi', () => {
    const k = profileToKs(PROFILES.find(p => p.id === 'mahalla-15')!);
    expect(k.els.map(e => e[0])).toEqual(['piy', 'yash', 'qat', 'qat', 'yash', 'piy']);
    expect(k.els[1][2].daraxt).toBe(true);
    expect(k.els[2][1]).toBeCloseTo(3.25, 2);
    expect(k.uk).toBe('M1');
  });
});
