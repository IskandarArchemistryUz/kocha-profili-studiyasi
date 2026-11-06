import { describe, it, expect } from 'vitest';
// @ts-ignore — node modullari (faqat test)
import { readFileSync } from 'fs';

/* Tugma izohlari: har izoh matni 9 tilga tarjima qilingan (oʻzbekchasi — kalit), joy egalari saqlangan */
const src = readFileSync(new URL('../../src/ui/tips.ts', import.meta.url), 'utf8') as string;
const TX = JSON.parse(readFileSync(new URL('../../src/ui/tips.json', import.meta.url), 'utf8')) as Record<string, string[]>;

describe('tips', () => {
  const ds = [...src.matchAll(/\bd: '([^']+)'/g)].map(m => m[1]);
  const chips = [...src.matchAll(/tipText\('([^']+)'/g)].map(m => m[1]);
  it('har izoh va yorliq tarjima qilingan', () => {
    expect(ds.length).toBeGreaterThan(80);
    for (const k of [...ds, ...chips]) expect(TX[k], k).toBeDefined();
  });
  it('9 til, boʻsh qiymat yoʻq, ${n} saqlangan', () => {
    for (const [k, v] of Object.entries(TX)) {
      expect(v.length, k).toBe(9);
      for (const s of v) { expect(s.trim().length, k).toBeGreaterThan(0); if (k.includes('${n}')) expect(s, k).toContain('${n}'); }
    }
  });
});

describe('tour', () => {
  const tsrc = readFileSync(new URL('../../src/ui/tour.ts', import.meta.url), 'utf8') as string;
  const TT = JSON.parse(readFileSync(new URL('../../src/ui/tour.json', import.meta.url), 'utf8')) as Record<string, string[]>;
  it('tur matnlari 9 tilga tarjima qilingan', () => {
    const keys = [...tsrc.matchAll(/\b(?:t|b|more): '([^']+)'/g), ...tsrc.matchAll(/tourText\('([^']+)'/g)].map(m => m[1]);
    expect(keys.length).toBeGreaterThan(25);
    for (const k of keys) { expect(TT[k], k).toBeDefined(); expect(TT[k].length, k).toBe(9); }
  });
});
