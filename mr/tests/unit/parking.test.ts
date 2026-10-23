import { describe, it, expect } from 'vitest';
import polygonClipping from 'polygon-clipping';
import { layoutStalls, trimStalls, PARK_MOD, parkingNeed, sumNeed } from '../../src/core/parking';
import { generate, DEFAULT_GEN } from '../../src/core/generator';
import { area, type XY } from '../../src/core/geo';

const sq = (w: number, h: number, x = 0, y = 0): XY[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const ov = (a: XY[], b: XY[]) => { try { return polygonClipping.intersection([[...a, a[0]]] as never, [[...b, b[0]]] as never).reduce((s, p) => s + area(p[0].slice(0, -1) as XY[]), 0); } catch { return 0; } };

describe('Avtoturargoh: modul boʻyicha joylar (dizayn-kod 6.3)', () => {
  it('90°: 60 × 40 m maydonda joylar oʻlchami 2,5 × 5,3, ustma-ust tushmaydi, maydon ichida', () => {
    const A = sq(60, 40), L = layoutStalls(A, [], 'p90');
    expect(L.n).toBeGreaterThan(70);   // ≈ 2 400 m² / ~25 m²
    for (const q of L.stalls) { expect(area(q)).toBeCloseTo(2.5 * 5.3, 1); for (const p of q) { expect(p[0]).toBeGreaterThanOrEqual(-1e-6); expect(p[0]).toBeLessThanOrEqual(60 + 1e-6); expect(p[1]).toBeLessThanOrEqual(40 + 1e-6); } }
    for (let i = 0; i < L.stalls.length; i++) for (let j = i + 1; j < L.stalls.length; j++) expect(ov(L.stalls[i], L.stalls[j])).toBeLessThan(0.01);
    for (const a of L.aisles) for (const q of L.stalls) expect(ov(a, q)).toBeLessThan(0.01);
  });
  it('har modulda joy maydoni dizayn-kod oʻlchamida; burchakli moduldan kamroq joy chiqadi', () => {
    const A = sq(80, 50), n: Record<string, number> = {};
    for (const m of ['p90', 'p60', 'p45', 'par'] as const) {
      const L = layoutStalls(A, [], m); n[m] = L.n;
      for (const q of L.stalls) expect(area(q)).toBeCloseTo(PARK_MOD[m].W * PARK_MOD[m].L, 1);
    }
    expect(n.p90).toBeGreaterThan(n.p45); expect(n.p60).toBeGreaterThan(n.par);
  });
  it('toʻsiq (bino) va bufer: joylar binoga tegmaydi, 10 m dan yaqin emas', () => {
    const A = sq(100, 60), bld = sq(20, 20, 40, 20), L = layoutStalls(A, [{ ring: bld, buf: 10 }], 'p90');
    expect(L.n).toBeGreaterThan(0);
    for (const q of L.stalls) for (const p of q) { const dx = Math.max(40 - p[0], 0, p[0] - 60), dy = Math.max(20 - p[1], 0, p[1] - 40); expect(Math.hypot(dx, dy)).toBeGreaterThanOrEqual(10 - 1e-6); }
  });
  it('talabgacha qisqartirish: koʻchaga yaqin joylar qoladi', () => {
    const A = sq(60, 40), L = layoutStalls(A, [], 'p90'), K = trimStalls(L, 20, A);
    expect(K.n).toBe(20); expect(K.aisles.length).toBeGreaterThan(0);
  });
  it('29-jadval: xonadonga 1, ofis 10 m² ga 1, savdo > 200 m² da 10 m² ga 1', () => {
    expect(parkingNeed({ apartments: 120.2, ofisGfa: 1000, tradeArea: 150 })).toMatchObject({ kvartiralar: 121, ofis: 100, savdo: 0 });
    expect(sumNeed(parkingNeed({ tradeArea: 700 }))).toBe(70);
  });
});

describe('Generator: avtoturargoh meʼyor boʻyicha', () => {
  const B = sq(150, 130);
  it('yer osti: sathlar talabga qarab tanlanadi, talab izohda', () => {
    const r = generate(B, { ...DEFAULT_GEN, parking: 'yer_osti', parkNorm: true }, 3, { aptNet: 65, netToGross: 0.75 });
    const p = r.parking!; expect(p.need).toBeGreaterThan(0);
    const per = p.spaces / p.levels;
    expect(p.levels).toBe(Math.max(1, Math.min(4, Math.ceil(p.need! / per))));
    expect(r.notes.join('\n')).toMatch(/Talab: \d+ joy \(29-jadval/);
  });
  it('yer usti: joylar binolardan tashqarida, soni talabdan va hovli 35 % idan oshmaydi; yetishmasa izoh', () => {
    const r = generate(B, { ...DEFAULT_GEN, parking: 'yer_usti', parkNorm: true }, 3, {});
    const p = r.parking!; expect(p.stalls!.length).toBe(p.spaces); expect(p.spaces).toBeLessThanOrEqual(p.need!);
    for (const q of p.stalls!) for (const s of r.sections) expect(ov(q, s.ring)).toBeLessThan(0.01);
    if (p.spaces < p.need!) expect(r.notes.join('\n')).toContain('Yetishmaydi');
  });
  it('savdo markazi: hovli toʻliq joylar bilan, talab savdo maydonidan', () => {
    const r = generate(sq(200, 160), { ...DEFAULT_GEN, typology: 'savdo_blok', maxF: 2, parking: 'yer_usti' }, 3, { use: 'savdo' });
    expect(r.parking!.spaces).toBeGreaterThan(100);
    expect(r.parking!.need).toBeGreaterThan(0);
  });
});
