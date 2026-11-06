import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/* Tugma izohlari: har izoh matni 9 tilga tarjima qilingan (oʻzbekchasi — kalit), joy egalari saqlangan */
const dir = fileURLToPath(new URL('../../src/ui/', import.meta.url));
const src = readFileSync(dir + 'tips.ts', 'utf8');
const TX = JSON.parse(readFileSync(dir + 'tips.json', 'utf8')) as Record<string, string[]>;

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
