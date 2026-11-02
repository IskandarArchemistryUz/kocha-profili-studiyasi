import { describe, it, expect } from 'vitest';
import { logiLayout, LOGI_PROFILE, DOCK_PITCH } from '../../src/core/logigen';
import { generate, DEFAULT_GEN } from '../../src/core/generator';
import type { XY } from '../../src/core/geo';

const rect = (w: number, h: number): XY[] => [[0, 0], [w, 0], [w, h], [0, h]];
const area = (r: XY[]) => Math.abs(r.reduce((s, p, i) => { const q = r[(i + 1) % r.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
const inR = (p: XY, w: number, h: number) => p[0] >= -0.01 && p[0] <= w + 0.01 && p[1] >= -0.01 && p[1] <= h + 0.01;

describe('logistika generatori (02.11)', () => {
  it('tarqatish markazi: bino + apron + doklar + tirkamalar kvartal ichida', () => {
    const o = logiLayout(rect(300, 200), 'tarqatish')!;
    expect(o).not.toBeNull();
    expect(o.sections).toHaveLength(1);
    const s = o.sections[0];
    expect(s.docks).toHaveLength(1);
    expect(s.docks[0].n).toBeGreaterThan(30);
    const L = Math.hypot(s.ring[1][0] - s.ring[0][0], s.ring[1][1] - s.ring[0][1]);
    expect(L).toBeLessThanOrEqual(LOGI_PROFILE.tarqatish.maxL + 0.01);
    expect(s.docks[0].n).toBe(Math.floor((L - 12) / DOCK_PITCH));
    expect(o.apron).toHaveLength(1);
    expect(o.trailers.length).toBeGreaterThan(20);
    for (const r of [s.ring, ...o.apron, ...o.trailers]) for (const p of r) expect(inR(p, 300, 200)).toBe(true);
    // apron — dok qirrasiga tutash
    const e = s.docks[0].edge, a = s.ring[e], b = s.ring[(e + 1) % 4];
    const touch = o.apron[0].some(p => Math.abs((p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0])) / Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.01);
    expect(touch).toBe(true);
  });
  it('kross-dok: doklar ikki tomonda, ikki apron, tor korpus', () => {
    const o = logiLayout(rect(220, 140), 'krossdok')!;
    expect(o.sections[0].docks.map(d => d.edge).sort()).toEqual([0, 2]);
    expect(o.apron).toHaveLength(2);
    const D = Math.hypot(o.sections[0].ring[2][0] - o.sections[0].ring[1][0], o.sections[0].ring[2][1] - o.sections[0].ring[1][1]);
    expect(D).toBeLessThanOrEqual(36.01);
  });
  it('yuk terminali: temir yoʻl tomonda shoxobcha, doklar qarama-qarshi tomonda', () => {
    const rail: XY[][] = [[[-50, 215], [400, 215]]];   // kvartal shimolida
    const o = logiLayout(rect(300, 200), 'terminal', rail)!;
    expect(o.spur).toBeDefined();
    const ySpur = (o.spur![0][1] + o.spur![1][1]) / 2, ring = o.sections[0].ring, yB = ring.map(p => p[1]);
    expect(ySpur).toBeGreaterThan(Math.max(...yB));            // shoxobcha bino va temir yoʻl orasida
    const e = o.sections[0].docks[0].edge, ye = (ring[e][1] + ring[(e + 1) % 4][1]) / 2;
    expect(ye).toBeCloseTo(Math.min(...yB), 3);                // doklar janubiy (avtomobil) tomonda
    // temir yoʻl yoʻq — shoxobchasiz, izoh bilan
    const n = logiLayout(rect(300, 200), 'terminal')!;
    expect(n.spur).toBeUndefined();
    expect(n.notes.join(' ')).toMatch(/temir yoʻl topilmadi/);
  });
  it('yoqilgʻi ombori: kichik bino, doksiz; tor kvartal — null', () => {
    const o = logiLayout(rect(120, 80), 'yoqilgi')!;
    expect(o.sections[0].docks).toHaveLength(0);
    expect(area(o.sections[0].ring)).toBeLessThanOrEqual(30 * 15 + 0.1);
    expect(logiLayout(rect(200, 40), 'tarqatish')).toBeNull();
  });
  it('generate(): logistika kvartali — yuk hovlisi (truck), yengil avtomobil turargohi emas', () => {
    const r = generate(rect(300, 200), { ...DEFAULT_GEN, typology: 'ombor', minF: 1, maxF: 1, nonRes: 0, setback: 6, parking: 'yer_usti' }, 3, { use: 'logistika', logi: 'sovutgich' });
    expect(r.sections).toHaveLength(1);
    expect(r.sections[0].docks?.[0].n).toBeGreaterThan(10);
    expect(r.parking?.truck).toBe(true);
    expect(r.parking?.stalls?.length).toBe(r.parking?.spaces);
    expect(r.notes.join(' ')).toMatch(/Sovutgichli ombor/);
    // boshqa ishlab chiqarish (sanoat) — oddiy ombor bloki
    const s = generate(rect(300, 200), { ...DEFAULT_GEN, typology: 'ombor', minF: 1, maxF: 1, nonRes: 0, setback: 6 }, 3, { use: 'sanoat' });
    expect(s.parking?.truck).toBeUndefined();
    expect(s.sections[0].docks).toBeUndefined();
  });
});

describe('yuk terminali yoʻnalishi', () => {
  it('temir yoʻl kvartalning qisqa tomoni yonida — bino va shoxobcha temir yoʻlga parallel', () => {
    const rail: XY[][] = [[[-60, 245], [170, 245], [170, 251], [-60, 251]]];   // 110 × 230 kvartalning shimolida, sharq–gʻarb
    const o = logiLayout(rect(110, 230), 'terminal', rail)!;
    expect(o.spur).toBeDefined();
    expect(Math.abs(o.spur![0][1] - o.spur![1][1])).toBeLessThan(0.01);   // shoxobcha sharq–gʻarb
    const ys = o.sections[0].ring.map(p => p[1]);
    expect(o.spur![0][1]).toBeGreaterThan(Math.max(...ys));
  });
});
