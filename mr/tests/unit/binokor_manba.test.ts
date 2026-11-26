/**
 * Binokor manbasi — repo (26.11.2026). Sahifa artifaktdan qayta yigʻilsa (ichki 1 MB skript bilan) yoki skriptlar tartibi buzilsa,
 * bu sinov yiqiladi. Qoida: CLAUDE.md, 7-boʻlim.
 */
import { describe, it, expect } from 'vitest';
// @ts-ignore
import * as fs from 'node:fs';

const ORDER = ['binokor-ikon.js', 'binokor-yadro.js', 'binokor-korinish.js', 'binokor-ifc-gl.js', 'binokor-muharrir.js', 'binokor-param.js',
  'binokor-i18n.js', 'binokor-lab.js', 'binokor-ai.js', 'binokor-loyiha.js', 'binokor-safe.js'];

describe('Binokor sahifasi', () => {
  for (const dir of ['public', '../app']) it(`${dir}/binokor.html: ichki katta skript yoʻq, skriptlar tartibi saqlangan`, () => {
    const html: string = fs.readFileSync(`${dir}/binokor.html`, 'utf8');
    const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1].length);
    expect(Math.max(0, ...inline)).toBeLessThan(2000);
    const src = [...html.matchAll(/<script[^>]*\bsrc="\.\/([^"?]+)/g)].map(m => m[1]);
    expect(src).toEqual(ORDER);
    for (const f of ORDER) expect(fs.existsSync(`${dir}/${f}`)).toBe(true);
  });
});
