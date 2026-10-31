import { describe, it, expect } from 'vitest';
import { generate, DEFAULT_GEN, typoAllowed, useCompatible, type Typology } from '../../src/core/generator';
import { openRing } from '../../src/core/offset';
import polygonClipping from 'polygon-clipping';
import type { XY } from '../../src/core/geo';

const P = (r: XY[]) => [[...r, r[0]].map(p => [p[0], p[1]] as [number, number])];
const ar = (r: XY[]) => { let s = 0; for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s / 2); };
const SH: XY[][] = [[[0, 0], [140, 0], [140, 100], [0, 100]], [[0, 0], [150, 10], [170, 110], [-10, 90]], [[0, 0], [160, 0], [40, 120]], [[0, 0], [120, -20], [180, 60], [90, 130], [-20, 80]]];

describe('Ofis, mehmonxona, savdo variantlari va generatsiya xatolari (31.10)', () => {
  it('parsel funksiyasiga mos tipologiyalar; turar joy ↔ ofis / mehmonxona mos emas', () => {
    expect(typoAllowed('ofis')).toEqual(['ofis_plita', 'ofis_minora', 'ofis_hovli']);
    expect(typoAllowed('mehmonxona')).toContain('meh_plita'); expect(typoAllowed('savdo')).toContain('savdo_minora');
    expect(typoAllowed('turar')).not.toContain('ofis_plita'); expect(typoAllowed('yakka')).not.toContain('perimetr');
    expect(useCompatible('turar', 'ofis')).toBe(false); expect(useCompatible('ofis', 'turar')).toBe(false); expect(useCompatible('aralash', 'ofis')).toBe(true);
  });
  for (const t of ['ofis_plita', 'ofis_minora', 'ofis_hovli', 'meh_plita', 'meh_minora', 'savdo_blok', 'savdo_minora', 'savdo_qator', 'perimetr', 'blok_minora'] as Typology[]) it(`${t}: bir sathda kesishmaydi, eni 6 m dan tor qism yoʻq`, () => {
    const use = t.startsWith('ofis') ? 'ofis' : t.startsWith('meh') ? 'mehmonxona' : t.startsWith('savdo') ? 'savdo' : 'turar';
    for (const s of SH) {
      const r = generate(s, { ...DEFAULT_GEN, typology: t, maxF: 9, minF: 3 }, 3.3, { use });
      expect(r.sections.length).toBeGreaterThan(0);
      const S = r.sections;
      for (let i = 0; i < S.length; i++) {
        if (!['stilobat', 'arka', 'savdo'].includes(S[i].kind)) { const o = openRing(S[i].ring, 6); if (o) expect(ar(S[i].ring) - ar(o)).toBeLessThan(25); }
        for (let j = i + 1; j < S.length; j++) {
          const a = [S[i].z0 ?? 0, (S[i].z0 ?? 0) + S[i].floors], b = [S[j].z0 ?? 0, (S[j].z0 ?? 0) + S[j].floors]; if (a[1] <= b[0] || b[1] <= a[0]) continue;
          const x = polygonClipping.intersection(P(S[i].ring), P(S[j].ring)); expect(x.reduce((q, p) => q + ar(p[0].slice(0, -1) as XY[]), 0)).toBeLessThan(2);
        }
      }
      if (t === 'savdo_minora' || t === 'meh_minora') expect(S.some(x => x.kind === 'minora' && (x.z0 ?? 0) > 0)).toBe(true);
    }
  });
});
