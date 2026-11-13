import { describe, it, expect } from 'vitest';
import { buildIndex, isovist, inBuilding, walk, walkSum, polyline, type P2 } from '../../src/joyshunos/izovist';

const sq = (x: number, y: number, w: number, h = w): P2[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

describe('izovist (koʻrinadigan joy)', () => {
  it('boʻsh joyda maydon = π R² · burchak/360', () => {
    const ix = buildIndex([]);
    for (const fov of [360, 200, 120]) {
      const r = isovist(ix, [0, 0], 0, { R: 100, fov });
      const ref = Math.PI * 100 * 100 * fov / 360;
      expect(Math.abs(r.area - ref) / ref).toBeLessThan(0.005);
      expect(r.open).toBeGreaterThan(0.99);
    }
  });
  it('yopiq xona ichida maydon = xona maydoni', () => {
    // 40 × 30 m xona: toʻrt devor — yupqa binolar (ichki chegara 0..40 × 0..30)
    const ix = buildIndex([sq(-1, -1, 42, 1), sq(-1, 30, 42, 1), sq(-1, 0, 1, 30), sq(40, 0, 1, 30)]);
    const r = isovist(ix, [20, 15], 0, { R: 200, fov: 360 });
    expect(Math.abs(r.area - 1200) / 1200).toBeLessThan(0.01);
    expect(r.comp).toBeGreaterThan(0.6);
  });
  it('bino ichidagi nuqta — boʻsh natija', () => {
    const ix = buildIndex([sq(0, 0, 20)]);
    expect(inBuilding(ix, [10, 10])).toBe(true);
    const r = isovist(ix, [10, 10], 0, { R: 100, fov: 360 });
    expect(r.inside).toBe(true); expect(r.poly.length).toBe(0); expect(r.area).toBe(0);
  });
  it('tahlil doirasidan chiqmaydi', () => {
    const r = isovist(buildIndex([]), [50, 0], 0, { R: 300, fov: 360, clip: 100 });
    expect(Math.abs(r.area - Math.PI * 100 * 100) / (Math.PI * 1e4)).toBeLessThan(0.01);
    for (const p of r.poly) expect(Math.hypot(p[0], p[1])).toBeLessThan(100.01);
  });
  it('ochiqlik va ixchamlik 0–1 oraligʻida; tor koʻchada ixchamlik past', () => {
    // 6 m eni koʻcha: ikki tomonida uzun binolar
    const ix = buildIndex([sq(-200, 3, 400, 20), sq(-200, -23, 400, 20)]);
    const r = isovist(ix, [0, 0], 0, { R: 100, fov: 360 });
    expect(r.open).toBeGreaterThanOrEqual(0); expect(r.open).toBeLessThanOrEqual(1);
    expect(r.comp).toBeGreaterThanOrEqual(0); expect(r.comp).toBeLessThan(0.2);
    expect(Math.abs(r.area - 1200) / 1200).toBeLessThan(0.02);   // 200 m × 6 m
  });
  it('marshrut: namunalar soni, masofa oʻsadi, eng ochiq va eng tor', () => {
    // yoʻl: ochiq maydondan (x < 0) tor koʻchaga (x > 0)
    const ix = buildIndex([sq(0, 3, 300, 20), sq(0, -23, 300, 20)]);
    const route: P2[] = [[-80, 0], [0, 0], [150, 0]];
    expect(polyline(route).L).toBeCloseTo(230, 6);
    const w = walk(ix, route, { R: 60, fov: 200 }, 47);
    expect(w.d.length).toBe(47);
    for (let i = 1; i < w.d.length; i++) expect(w.d[i]).toBeGreaterThan(w.d[i - 1]);
    const s = walkSum(w, 1000);
    expect(w.d[s.iMax]).toBeLessThan(w.d[s.iMin]);   // ochiq joy boshida, tor — oxirida
    expect(s.low).toBeGreaterThan(0.3); expect(s.low).toBeLessThan(0.9);
  });
});
