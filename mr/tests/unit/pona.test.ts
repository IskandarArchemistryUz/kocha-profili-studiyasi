import { describe, it, expect } from 'vitest';
import { generate, DEFAULT_GEN } from '../../src/core/generator';
import { area, type XY } from '../../src/core/geo';
import polygonClipping from 'polygon-clipping';

const P = (r: XY[]) => [[...r, r[0]].map(p => [p[0], p[1]] as [number, number])];
describe('qiya kvartal: seksiya uchlarida ponasimon kvartiralar', () => {
  it('oʻtkir burchakli trapetsiya — uch qiya chegaragacha toʻldiriladi, ustma-ust tushmaydi, kvartal ichida', () => {
    const block: XY[] = [[0, 0], [200, 0], [200, 100], [140, 100]];
    const r = generate(block, { ...DEFAULT_GEN, typology: 'perimetr', setback: 0 });
    const secs = r.sections.filter(s => s.kind !== 'arka');
    expect(secs.length).toBeGreaterThan(1);
    expect(r.notes.join(' ')).toMatch(/ponasimon/);
    const w = secs.filter(s => s.ring.length > 4 || s.ring.length === 3);
    expect(w.length).toBeGreaterThan(0);
    for (const s of secs) {
      // kvartal ichida (0,5 m² aniqlik)
      const out = polygonClipping.difference(P(s.ring) as any, P(block) as any).reduce((t, p) => t + area(p[0].slice(0, -1) as XY[]), 0);
      expect(out).toBeLessThan(0.5);
    }
    for (let i = 0; i < secs.length; i++) for (let j = i + 1; j < secs.length; j++) {
      const x = polygonClipping.intersection(P(secs[i].ring) as any, P(secs[j].ring) as any).reduce((t, p) => t + area(p[0].slice(0, -1) as XY[]), 0);
      expect(x).toBeLessThan(0.5);
    }
  });
  it('toʻgʻri burchakli kvartalda oʻzgarish yoʻq', () => {
    const r = generate([[0, 0], [200, 0], [200, 120], [0, 120]], { ...DEFAULT_GEN, typology: 'perimetr' });
    expect(r.notes.join(' ')).not.toMatch(/ponasimon/);
  });
});
