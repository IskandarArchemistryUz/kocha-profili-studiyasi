import { describe, it, expect } from 'vitest';
import polygonClipping from 'polygon-clipping';
import { generate, DEFAULT_GEN, inset, clean } from '../../src/core/generator';
import { area, type XY } from '../../src/core/geo';

const sq = (w: number, h: number): XY[] => [[0, 0], [w, 0], [w, h], [0, h]];
const overlap = (a: XY[], b: XY[]) => { try { return polygonClipping.intersection([[...a, a[0]]] as never, [[...b, b[0]]] as never).reduce((s, p) => s + area(p[0].slice(0, -1) as XY[]), 0); } catch { return 0; } };

describe('Seksiya generatori', () => {
  it('perimetr: 4 burchak seksiyasi, ustma-ust tushmaydi, chekinish saqlanadi', () => {
    const r = generate(sq(150, 130), { ...DEFAULT_GEN, maxF: 9, minF: 5 });
    const corners = r.sections.filter(s => s.kind === 'burchak');
    expect(corners).toHaveLength(4);
    corners.forEach(c => expect(c.ring).toHaveLength(6));
    expect(r.sections.length).toBeGreaterThan(8);
    for (let i = 0; i < r.sections.length; i++) for (let j = i + 1; j < r.sections.length; j++) expect(overlap(r.sections[i].ring, r.sections[j].ring)).toBeLessThan(0.5);
    for (const s of r.sections) for (const p of s.ring) { expect(p[0]).toBeGreaterThanOrEqual(6 - 1e-6); expect(p[1]).toBeGreaterThanOrEqual(6 - 1e-6); expect(p[0]).toBeLessThanOrEqual(144 + 1e-6); }
    // burchaklar eng baland, janub qirrasi pastroq
    expect(Math.max(...corners.map(c => c.floors))).toBe(9);
    const south = r.sections.filter(s => s.kind === 'oddiy' && s.ring.every(p => p[1] < 30));
    expect(Math.max(...south.map(s => s.floors))).toBeLessThan(9);
  });
  it('hovli tor boʻlsa qavat cheklanadi va izoh beriladi', () => {
    const r = generate(sq(90, 90), { ...DEFAULT_GEN, maxF: 20 });
    expect(r.capFloors).toBeLessThan(20);
    expect(Math.max(...r.sections.map(s => s.floors))).toBeLessThanOrEqual(r.capFloors!);
    expect(r.notes.join()).toContain('79-band');
  });
  it('oʻtishlar: uzun qirrada 6 m arka qoladi', () => {
    const a = generate(sq(260, 120), { ...DEFAULT_GEN, passages: true }), b = generate(sq(260, 120), { ...DEFAULT_GEN, passages: false });
    const tot = (r: typeof a) => r.sections.reduce((s, x) => s + area(x.ring), 0);
    expect(tot(a)).toBeLessThan(tot(b));
  });
  it('qatorlar: oraliq ≥ 2·Hmax, kvartal ichida', () => {
    const r = generate(sq(200, 120), { ...DEFAULT_GEN, typology: 'qatorlar', maxF: 9 });
    expect(r.sections.length).toBeGreaterThan(2);
    const xs = [...new Set(r.sections.map(s => Math.round(Math.min(...s.ring.map(p => p[0])))))].sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(15 + 2 * 9 * 3.3 - 0.5);
  });
  it('yordamchilar: inset va clean', () => {
    expect(area(inset(sq(100, 50), 5)!)).toBeCloseTo(90 * 40, 3);
    expect(clean([[0, 0], [50, 0], [100, 0.1], [100, 50], [0, 50]])).toHaveLength(4);
    expect(generate(sq(20, 20), DEFAULT_GEN).sections).toHaveLength(0);
  });
});

describe('Generator: real (notekis) kvartallar', () => {
  it('uchburchakka yaqin tor kvartal — zaxira algoritm seksiyalar beradi, kesishmaydi', () => {
    const tri: XY[] = [[0, 0], [170, 10], [150, 60], [20, 70]];
    const r = generate(tri, { ...DEFAULT_GEN, maxF: 12 });
    expect(r.sections.length).toBeGreaterThan(3);
    for (let i = 0; i < r.sections.length; i++) for (let j = i + 1; j < r.sections.length; j++) expect(overlap(r.sections[i].ring, r.sections[j].ring)).toBeLessThan(0.5);
  });
  it('qarshidagi seksiyagacha masofa qavatni cheklaydi (≥ 2·H)', () => {
    const r = generate(sq(140, 64), { ...DEFAULT_GEN, maxF: 16, minF: 3 });
    // shimol va janub qatorlari orasi ≈ 64 − 2·6 − 2·15 = 22 m → H ≤ 11 m → ≤ 3 qavat
    const longs = r.sections.filter(s => s.kind === 'oddiy');
    expect(Math.max(...longs.map(s => s.floors))).toBeLessThanOrEqual(3);
    expect(r.notes.join(' ')).toContain('izoh 8');
  });
  it('tor kvartal: minimal qavatga sigʻmaydigan qarshi qator olib tashlanadi', () => {
    const r = generate(sq(160, 58), { ...DEFAULT_GEN, maxF: 9, minF: 5 });
    // qatorlar orasi 58 − 12 − 30 = 16 m < 2·5·3,3 → bitta qator qoladi, qavatlar ≥ 5
    expect(r.sections.length).toBeGreaterThan(2);
    expect(Math.min(...r.sections.map(s => s.floors))).toBeGreaterThanOrEqual(5);
    expect(r.notes.join(' ')).toContain('olib tashlandi');
  });
});
