import { describe, it, expect } from 'vitest';
import { generate, DEFAULT_GEN } from '../../src/core/generator';
import { socialPlan } from '../../src/core/social';
import { obb2, type XY } from '../../src/core/geo';

const sq = (w: number, h: number): XY[] => [[0, 0], [w, 0], [w, h], [0, h]];
const dims = (r: XY[]) => { const o = obb2(r); return [o.L, o.S]; };

describe('12-band: seksiya oʻlchamlari', () => {
  it('aniq rejim: oddiy seksiyalar aynan 30 × 15 m (qisqalari ≥ 9 m), izohda statistika', () => {
    const r = generate(sq(170, 140), { ...DEFAULT_GEN, exact: true, secLen: 30, depth: 15, maxF: 9 });
    const odd = r.sections.filter(s => s.kind === 'oddiy');
    expect(odd.length).toBeGreaterThan(4);
    for (const s of odd) { const [L, S] = dims(s.ring); expect(S).toBeCloseTo(15, 0); expect(Math.abs(L - 30) < 0.05 || (L >= 9 - 1e-6 && L < 30)).toBe(true); }
    expect(odd.filter(s => Math.abs(dims(s.ring)[0] - 30) < 0.05).length).toBeGreaterThan(odd.length / 2);
    expect(r.notes.join('\n')).toMatch(/Aniq oʻlcham: \d+ seksiya 30 × 15 m/);
  });
  it('moʻljal rejimi oʻzgarmadi: uzunlik qirraga moslab choʻziladi', () => {
    const r = generate(sq(170, 140), { ...DEFAULT_GEN, secLen: 30, depth: 15, maxF: 9 });
    expect(r.notes.join()).not.toContain('Aniq oʻlcham');
    expect(r.sections.filter(s => s.kind === 'oddiy').some(s => Math.abs(dims(s.ring)[0] - 30) > 0.5)).toBe(true);
  });
  it('qatorlar: aniq rejimda qirqilgan (toʻliq boʻlmagan) boʻlak qoldirilmaydi yoki qisqa ≥ 9 m', () => {
    const r = generate([[0, 0], [200, 0], [200, 160], [20, 160]], { ...DEFAULT_GEN, typology: 'qatorlar', exact: true, secLen: 40, depth: 14, maxF: 5 });
    expect(r.sections.length).toBeGreaterThan(3);
    for (const s of r.sections) expect(dims(s.ring)[0]).toBeGreaterThanOrEqual(9 - 1e-6);
  });
  it('ijtimoiy: korpus eni va eng katta uzunligi', () => {
    const ring: XY[] = sq(160, 120), sb = ring.map(() => 6);
    const a = socialPlan(ring, 'poliklinika', 500, 'blok', 12, 3, sb, 14);
    expect(dims(a.sections[0].ring)[1]).toBeCloseTo(14, 1);
    const b = socialPlan(ring, 'poliklinika', 500, 'blok', 12, 3, sb, 18, 40);
    expect(dims(b.sections[0].ring)[0]).toBeLessThanOrEqual(40 + 1e-6);
    expect(b.notes.join()).toContain('Korpus uzunligi 40 m');
  });
});
