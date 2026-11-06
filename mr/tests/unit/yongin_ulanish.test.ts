import { describe, it, expect } from 'vitest';
import { fireMouths, reachCarriage, crossing, openOnEdge, carriageOf, inMP, pip, FIRE_LINK_R } from '../../src/core/firelink';
import { corridor, offsetLine } from '../../src/core/plan';
import type { XY } from '../../src/core/geo';

/** 07.11 (c69): hovli yongʻin yoʻlagi kvartal chetidan qatnov qismigacha ulanadi (pasaytirilgan bordyur, tutashish yoyi) */
const toMP = (m: [number, number][][][]): XY[][][] => m.map(p => p.map(r => r.slice(0, -1).map(q => [q[0], q[1]] as XY)));
// kvartal: 0..100 × 0..80; koʻcha shimolda — qizil chiziq y = 80, qatnov qismi y = 86..92.5 (mahalla-15: 2,25 + 2 trotuar/yashil)
const edge: XY[] = [[0, 0], [100, 0], [100, 80], [0, 80]];
const lane: XY[][][] = [[[[48, 40], [52, 40], [52, 80], [48, 80]]]];   // binolar oraligʻidan koʻchaga chiqqan yoʻlak (eni 4 m)
const carr = carriageOf([{ axis: [[-50, 87.5], [150, 87.5]], parts: [{ k: 'trotuar', w: 2.25 }, { k: 'yashil', w: 2 }, { k: 'qatnov', w: 6.5 }, { k: 'yashil', w: 2 }, { k: 'trotuar', w: 2.25 }] }], (a, h) => toMP(corridor(a, h)), offsetLine);

describe('yongʻin yoʻlagining koʻchaga ulanishi', () => {
  it('ogʻiz kvartal chetida topiladi, normal — tashqariga', () => {
    const m = fireMouths(lane, edge);
    expect(m.length).toBe(1);
    expect(m[0].p[1]).toBeCloseTo(80, 0);
    expect(m[0].n[1]).toBeGreaterThan(0.9);
    expect(m[0].w).toBeGreaterThan(3);
  });
  it('qatnov qismi profildan: faqat qatnov tasmasi (trotuar va yashil emas)', () => {
    expect(inMP([50, 87.5], carr)).toBe(true);
    expect(inMP([50, 81.5], carr)).toBe(false);   // trotuar
    expect(inMP([50, 83.5], carr)).toBe(false);   // yashil tasma
  });
  it('ogʻizdan qatnov chetigacha masofa ≈ trotuar + yashil (4,25 m)', () => {
    const [m] = fireMouths(lane, edge);
    const t = reachCarriage(m, carr)!;
    expect(t).toBeGreaterThanOrEqual(3.5); expect(t).toBeLessThanOrEqual(5);
  });
  it('oʻtish trotuar va yashil tasmani qoplaydi, qatnov chetida yoy bilan kengayadi', () => {
    const [m] = fireMouths(lane, edge), t = reachCarriage(m, carr)!, c = crossing(m, t, FIRE_LINK_R, { half: 2.1 });
    expect(pip([50, 82], c.poly)).toBe(true);           // trotuar ustida
    expect(pip([50, 84], c.poly)).toBe(true);           // yashil tasma ustida
    expect(pip([45.5, 84.2], c.poly)).toBe(true);       // qatnov cheti yonida — yoy kengaytmasi
    expect(pip([45.5, 81], c.poly)).toBe(false);        // ogʻiz yonidagi trotuar — yoʻl emas
    expect(Math.abs(c.curb[0][1] - (80 + t))).toBeLessThan(0.01);   // pasaytirilgan bordyur — qatnov chetida
  });
  it('qatnov qismi uzoq boʻlsa — topilmaydi (koʻrib chiqish)', () => {
    const far = carriageOf([{ axis: [[-50, 140], [150, 140]], parts: [{ k: 'qatnov', w: 7 }] }], (a, h) => toMP(corridor(a, h)), offsetLine);
    const [m] = fireMouths(lane, edge);
    expect(reachCarriage(m, far)).toBeUndefined();
  });
  it('uchastka chegarasidagi ogʻiz «site» belgisi bilan (mavjud koʻcha tomoni — sahnada OSM bilan)', () => {
    const m = fireMouths(lane, edge, [[-10, -10], [110, -10], [110, 80], [-10, 80]]);
    expect(m[0].site).toBe(true);
  });
  it('kontur ogʻizda ochiq: kvartal chetidagi qirra chizilmaydi', () => {
    const parts = openOnEdge(lane[0][0], [edge]);
    expect(parts.length).toBe(1);
    expect(parts[0].some(p => p[1] === 40)).toBe(true);
    // chetdagi qirraning oʻrtasi (50, 80) hech bir chiziqda yoʻq
    const onTop = parts.some(pl => pl.some((p, i) => i > 0 && p[1] === 80 && pl[i - 1][1] === 80));
    expect(onTop).toBe(false);
  });
});
