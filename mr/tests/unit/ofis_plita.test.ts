import { describe, it, expect } from 'vitest';
import { generate, DEFAULT_GEN } from '../../src/core/generator';
import { area, obb2 } from '../../src/core/geo';
import polygonClipping from 'polygon-clipping';
describe('Ofis plitalari (31.10): qiya parselda faqat toʻgʻri toʻrtburchak, kesishmasiz', () => {
  it('trapetsiya va beshburchak', () => {
    for (const B of [[[0, 0], [160, 0], [120, 110], [-10, 90]], [[0, 0], [140, 20], [150, 120], [60, 150], [-20, 80]]] as [number, number][][]) {
      const r = generate(B, { ...DEFAULT_GEN, typology: 'ofis_plita', maxF: 9, minF: 5 });
      expect(r.sections.length).toBeGreaterThan(1);
      for (const s of r.sections) { const o = obb2(s.ring); expect(area(s.ring) / (o.L * o.S)).toBeGreaterThan(0.97); }
      for (let i = 0; i < r.sections.length; i++) for (let j = i + 1; j < r.sections.length; j++) {
        const x = polygonClipping.intersection([[...r.sections[i].ring, r.sections[i].ring[0]]] as any, [[...r.sections[j].ring, r.sections[j].ring[0]]] as any);
        expect(x.length).toBe(0);
      }
    }
  });
});
