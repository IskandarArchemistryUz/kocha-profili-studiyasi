import { describe, it, expect } from 'vitest';
import { lowriseBlock, lowriseAlong } from '../../src/core/lowrise';
import { area, type XY } from '../../src/core/geo';
import polygonClipping from 'polygon-clipping';

const rect = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const cl = (r: XY[]) => [[...r, r[0]].map(p => [Math.round(p[0] * 1000) / 1000, Math.round(p[1] * 1000) / 1000] as [number, number])];
const ov = (a: XY[], b: XY[]) => polygonClipping.intersection(cl(a) as never, cl(b) as never).reduce((s, p) => s + area(p[0] as XY[]), 0);
const pin = (p: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
const segD = (p: XY, a: XY, b: XY) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)); return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t); };

describe('Past qavatli uylar (31.10): avval uchastka, keyin uy', () => {
  const blocks: XY[][] = [rect(0, 0, 120, 100), rect(0, 0, 200, 60), [[0, 0], [150, 0], [130, 90], [10, 70]]];
  it('yakka: uchastka ≥ 400 m² (75-band), uy uchastka ichida, yon chegaradan ≥ 3 m (100-band), ustma-ust emas', () => {
    for (const B of blocks) {
      const { houses } = lowriseBlock(B, 'yakka');
      expect(houses.length).toBeGreaterThan(6);
      for (const h of houses) {
        expect(area(h.plot)).toBeGreaterThanOrEqual(392);
        for (const p of h.ring) expect(pin(p, h.plot)).toBe(true);
        // devordan uchastka chegarasigacha (oldidan tashqari) ≥ 3 m: uy burchaklaridan kvartal ichidagi chegaralargacha
        const inner = h.plot.map((p, i) => [p, h.plot[(i + 1) % h.plot.length]] as [XY, XY]).filter(([a, b]) => { const m: XY = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; return B.every((q, j) => segD(m, q, B[(j + 1) % B.length]) > 0.3); });
        for (const [a, b] of inner) for (const p of h.ring) expect(segD(p, a, b)).toBeGreaterThan(2.9);
        expect(h.green).toBeGreaterThan(0.3);   // 96-band
      }
      for (let i = 0; i < houses.length; i++) for (let j = i + 1; j < houses.length; j++) expect(ov(houses[i].plot, houses[j].plot)).toBeLessThan(0.5);
    }
  });
  it('taunhaus: uchastka ≥ 200 m² (74-band), qator ≤ 15 uy va ≤ 100 m, qatorlar orasi ≥ 6 m', () => {
    const { houses } = lowriseBlock(rect(0, 0, 260, 80), 'taunhaus');
    expect(houses.length).toBeGreaterThan(20);
    for (const h of houses) { expect(area(h.plot)).toBeGreaterThanOrEqual(196); expect(h.kind).toBe('taunhaus'); }
    // qatorlar: bir-biriga tegib turgan uylar guruhi
    const touch = (a: XY[], b: XY[]) => a.some(p => b.some(q => Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.05));
    const seen = new Set<number>(), rows: number[][] = [];
    houses.forEach((_, i) => { if (seen.has(i)) return; const st = [i], row: number[] = []; seen.add(i); while (st.length) { const k = st.pop()!; row.push(k); houses.forEach((h, j) => { if (!seen.has(j) && touch(houses[k].ring, h.ring)) { seen.add(j); st.push(j); } }); } rows.push(row); });
    for (const r of rows) {
      expect(r.length).toBeLessThanOrEqual(15);
      const pts = r.flatMap(i => houses[i].ring); let L = 0; for (const p of pts) for (const q of pts) L = Math.max(L, Math.hypot(p[0] - q[0], p[1] - q[1]));
      expect(L).toBeLessThan(100 + 12);   // diagonal bilan
    }
    for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
      let m = Infinity; for (const a of rows[i]) for (const b of rows[j]) for (const p of houses[a].ring) for (const q of houses[b].ring) m = Math.min(m, Math.hypot(p[0] - q[0], p[1] - q[1]));
      expect(m).toBeGreaterThanOrEqual(6);
    }
  });
  it('chiziq boʻylab: siniq chiziqning chap tomoniga uylar, ustma-ust emas', () => {
    const hs = lowriseAlong([[0, 0], [80, 0], [140, 30]], 1, 'taunhaus', null);
    expect(hs.length).toBeGreaterThan(14);
    for (let i = 0; i < hs.length; i++) for (let j = i + 1; j < hs.length; j++) expect(ov(hs[i].ring, hs[j].ring)).toBeLessThan(0.2);
    for (const h of hs) expect(h.ring.every(p => p[1] > -0.1 || p[0] > 79)).toBe(true);
  });
});

describe('Juft va hovli uylar (31.10)', () => {
  it('juft: uylar juft-juft umumiy devor bilan, juftlar orasi ≥ 6 m, uchastka ≥ 200 m²', () => {
    const { houses } = lowriseBlock(rect(0, 0, 200, 70), 'juft');
    expect(houses.length).toBeGreaterThan(10); expect(houses.length % 2).toBe(0);
    const touch = (a: XY[], b: XY[]) => a.filter(p => b.some(q => Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.05)).length >= 2;
    for (const h of houses) { expect(area(h.plot)).toBeGreaterThanOrEqual(196); expect(houses.filter(q => q !== h && touch(h.ring, q.ring)).length).toBe(1); }
    for (let i = 0; i < houses.length; i++) for (let j = i + 1; j < houses.length; j++) {
      if (touch(houses[i].ring, houses[j].ring)) continue;
      let m = Infinity; for (const p of houses[i].ring) for (const q of houses[j].ring) m = Math.min(m, Math.hypot(p[0] - q[0], p[1] - q[1]));
      expect(m).toBeGreaterThanOrEqual(5.99);
    }
  });
  it('hovli: L shakl uy (6 uch), uchastka ≥ 400 m², qoʻshni uygacha ≥ 6 m', () => {
    const { houses } = lowriseBlock(rect(0, 0, 180, 80), 'hovli');
    expect(houses.length).toBeGreaterThan(8);
    for (const h of houses) { expect(h.ring.length).toBe(6); expect(area(h.plot)).toBeGreaterThanOrEqual(392); for (const p of h.ring) expect(pin(p, h.plot) || h.plot.some((a, i) => segD(p, a, h.plot[(i + 1) % h.plot.length]) < 0.05)).toBe(true); }
    for (let i = 0; i < houses.length; i++) for (let j = i + 1; j < houses.length; j++) { let m = Infinity; for (const p of houses[i].ring) for (const q of houses[j].ring) m = Math.min(m, Math.hypot(p[0] - q[0], p[1] - q[1])); expect(m).toBeGreaterThanOrEqual(5.99); }
  });
});

describe('Klaster (31.10): berk koʻcha atrofida hovlilar', () => {
  it('uchastkalar 15 × 15, ustma-ust emas, uy uchastka ichida va L shakl; berk koʻcha 6 m', async () => {
    const { lowriseBlock: lb } = await import('../../src/core/lowrise');
    const { houses, notes } = lb([[0, 0], [150, 0], [150, 90], [0, 90]], 'klaster');
    expect(houses.length).toBeGreaterThanOrEqual(16);
    expect(notes[0]).toContain('Klaster');
    const pa = (r: [number, number][]) => Math.abs(r.reduce((s, p, i) => s + p[0] * r[(i + 1) % r.length][1] - r[(i + 1) % r.length][0] * p[1], 0) / 2);
    for (const h of houses) { expect(pa(h.plot as any)).toBeCloseTo(225, 0); expect(h.ring.length).toBe(6); }
    // uchastkalar ustma-ust tushmaydi: markazlar orasi ≥ 15 m (bir qatorda) yoki boshqa qatorda
    const cs = houses.map(h => h.plot.reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4], [0, 0]));
    for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) expect(Math.hypot(cs[i][0] - cs[j][0], cs[i][1] - cs[j][1])).toBeGreaterThan(14.9);
  });
});

describe('Past qavatli: tanlangan qavat (31.10)', () => {
  it('qavat 1–3 tanlanadi (kam qavatli — ShNQ 2.07.01-23, 2-band); berilmasa — odatiy; 3 dan oshmaydi', () => {
    const B: [number, number][] = [[0, 0], [180, 0], [180, 80], [0, 80]];
    expect(new Set(lowriseBlock(B, 'hovli').houses.map(h => h.floors))).toEqual(new Set([1]));
    expect(new Set(lowriseBlock(B, 'hovli', 2).houses.map(h => h.floors))).toEqual(new Set([2]));
    expect(new Set(lowriseBlock(B, 'yakka', 9).houses.map(h => h.floors))).toEqual(new Set([3]));
  });
});
