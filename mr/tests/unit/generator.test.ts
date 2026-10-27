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
  it('qatorlar: sharq–gʻarb, oraliq ≥ 2·Hmax', () => {
    const r = generate(sq(120, 200), { ...DEFAULT_GEN, typology: 'qatorlar', maxF: 9 });
    expect(r.sections.length).toBeGreaterThan(2);
    const xs = [...new Set(r.sections.map(s => Math.round(Math.min(...s.ring.map(p => p[1])))))].sort((a, b) => a - b);
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
    // 27.10: qarshi qator joylashtirishda (orthoFill) yoki keyin (facingCap) tushiriladi — natijada bitta qator
    expect(new Set(r.sections.filter(x => x.face).map(x => `${Math.round(x.face!.n[0] * 10)},${Math.round(x.face!.n[1] * 10)}`)).size).toBe(1);
  });
});

import { autoTypology, TYPO_NAME, type Typology } from '../../src/core/generator';
describe('Tipologiyalar, UMN, stilobat, parkovka', () => {
  const B = sq(200, 150);
  it('har tipologiya seksiya beradi va ular kesishmaydi', () => {
    for (const t of Object.keys(TYPO_NAME) as Typology[]) {
      const r = generate(B, { ...DEFAULT_GEN, typology: t, maxF: 9, far: t === 'avto' ? 2 : 0 });
      expect(r.sections.length, t).toBeGreaterThan(0);
      const flat = r.sections.filter(s => s.kind !== 'stilobat');
      for (let i = 0; i < flat.length; i++) for (let j = i + 1; j < flat.length; j++) expect(overlap(flat[i].ring, flat[j].ring), t).toBeLessThan(1);
    }
    expect(autoTypology(0.4)).toBe('yakka'); expect(autoTypology(1)).toBe('villa'); expect(autoTypology(2.5)).toBe('perimetr'); expect(autoTypology(4)).toBe('blok_minora');
  });
  it('maqsadli UMN: natija maqsadga yaqin', () => {
    const r = generate(B, { ...DEFAULT_GEN, typology: 'perimetr', maxF: 25, minF: 3, far: 1.5, passages: false });
    expect(r.far!).toBeGreaterThan(1.2); expect(r.far!).toBeLessThan(1.8);
  });
  it('stilobat: seksiyalar uning ustida, parkovka stilobat ichida', () => {
    const r = generate(B, { ...DEFAULT_GEN, stylobate: 2, parking: 'stilobat' });
    const pod = r.sections.find(s => s.kind === 'stilobat')!;
    expect(pod.floors).toBe(2); expect(pod.use).toBe('avtoturargoh');
    expect(r.sections.filter(s => s.kind !== 'stilobat').every(s => s.z0 === 2)).toBe(true);
    expect(r.parking!.spaces).toBeGreaterThan(500);
  });
  it('yer osti parkovka sathlar bilan oʻsadi', () => {
    const a = generate(B, { ...DEFAULT_GEN, parking: 'yer_osti', parkLevels: 1, parkNorm: false }), b = generate(B, { ...DEFAULT_GEN, parking: 'yer_osti', parkLevels: 2, parkNorm: false });
    expect(b.parking!.spaces).toBe(2 * a.parking!.spaces);
  });
});

describe('botiq kvartal: burchaklar', () => {
  it('qirralar boʻylab joylashda burchak seksiyalari bitta L-shakl binoga birlashadi', () => {
    // L shakldagi kvartal (botiq) — zaxira algoritm
    const L: XY[] = [[0, 0], [200, 0], [200, 90], [90, 90], [90, 200], [0, 200]];
    const r = generate(L, { ...DEFAULT_GEN, maxF: 9, minF: 5, passages: false });
    const c = r.sections.filter(s => s.kind === 'burchak');
    expect(c.length).toBeGreaterThan(0);
    // birlashgan dogʻ toʻrtburchak emas (≥ 6 uch)
    expect(Math.max(...c.map(s => s.ring.length))).toBeGreaterThanOrEqual(6);
    expect(r.notes.join(' ')).toContain('L-shakl');
  });
});
