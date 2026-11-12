import { describe, it, expect } from 'vitest';
import { blankProject } from '../../src/core/doc';
import { normLine } from '../../src/core/sheet';

describe('Shtampdagi meʼyorlar qatori (Varaqlar va Chizmadon)', () => {
  it('Toshkent — Oʻzbekiston · ShNQ; konsepsiya rejimi; xorij — xalqaro andoza', () => {
    const d = blankProject();
    expect(normLine(d)).toBe('Meʼyorlar: Oʻzbekiston · ShNQ');
    expect(normLine({ ...d, settings: { ...d.settings, concept: true } })).toContain('konsepsiya rejimi');
    expect(normLine({ ...d, settings: { ...d.settings, normSet: 'INTL' as never } })).toContain('NSW ADG 3F-1');
  });
});
