/** Tarjima lugʻatlari «bitta kalit — bitta qator» (26.11.2026): parallel PR lar toʻqnashmasligi uchun. Buzilsa: cd mr && node scripts/i18n-format.mjs */
import { describe, it, expect } from 'vitest';
// @ts-ignore
import * as fs from 'node:fs';
// @ts-ignore
import { format, FILES } from '../../scripts/i18n-format.mjs';

describe('tarjima lugʻatlari formati', () => {
  for (const f of FILES as string[]) it(`${f} — bitta kalit, bitta qator (tuzatish: cd mr && node scripts/i18n-format.mjs)`, () => {
    const raw = fs.readFileSync(`src/i18n/${f}`, 'utf8');
    expect(raw === format(f, JSON.parse(raw))).toBe(true);
  });
});
