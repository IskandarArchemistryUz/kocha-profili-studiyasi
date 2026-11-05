import { describe, it, expect } from 'vitest';
import { blankProject, type Ring, type LngLat } from '../../src/core/doc';
import { apply } from '../../src/core/commands';
import { frame, area, type XY } from '../../src/core/geo';
import { derive } from '../../src/core/derive';
import { evaluateAll } from '../../src/norms/rules';
import { sb79Applies } from '../../src/core/setback';
import { generate, DEFAULT_GEN, UG_STREET } from '../../src/core/generator';

const rect = (o: LngLat, x0: number, y0: number, w: number, h: number): Ring => { const f = frame(o); return [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]].map(p => f.toGeo(p as [number, number])); };
const sq = (w: number, h: number): XY[] => [[0, 0], [w, 0], [w, h], [0, h]];

describe('05.11: 79-band 2-jadval faqat 3+ qavatli turar joy va yotoq oʻrinli binolarga', () => {
  it('turar, aralash, mehmonxona (3+ qavat) — ha; ofis, savdo, logistika, 2 qavatli turar — yoʻq', () => {
    expect(sb79Applies('turar', 12)).toBe(true); expect(sb79Applies('aralash', 5)).toBe(true); expect(sb79Applies('mehmonxona', 9)).toBe(true);
    for (const u of ['ofis', 'savdo', 'mamuriy', 'logistika', 'avtoturargoh']) expect(sb79Applies(u, 12)).toBe(false);
    expect(sb79Applies('turar', 2)).toBe(false);
  });
});

describe('05.11: yer osti avtoturargoh — kvartal chegarasidan, chekinishdan emas', () => {
  it('chekinish 15 m boʻlsa ham yer osti halqasi kvartal chegarasidan 3 m', () => {
    const r = generate(sq(150, 130), { ...DEFAULT_GEN, maxF: 12, setback: 15, parking: 'yer_osti', parkNorm: false, parkLevels: 1 });
    expect(r.parking?.kind).toBe('yer_osti');
    const a = area(r.parking!.ring);
    expect(a).toBeGreaterThan((150 - 2 * UG_STREET - 1) * (130 - 2 * UG_STREET - 1));   // chekinish 15 m da ≈ 120 × 100
    expect(r.notes.join(' ')).toContain('209-band');
  });
  it('ugRing berilsa — aynan shu halqa', () => {
    const ug: XY[] = [[1, 1], [149, 1], [149, 127], [1, 127]];
    const r = generate(sq(150, 130), { ...DEFAULT_GEN, maxF: 12, parking: 'yer_osti', parkNorm: false, ugRing: ug });
    expect(area(r.parking!.ring)).toBeCloseTo(148 * 126, -1);
  });
  it('ug-park-415: yer osti boʻlsa — koʻrib chiqish, yoʻq boʻlsa — na', () => {
    let d = blankProject(); const o = d.origin;
    d = apply(d, { type: 'setSite', rings: [rect(o, 0, 0, 100, 100)] });
    const ev = (x: typeof d) => evaluateAll(derive(x), x).find(q => q.id === 'ug-park-415')!;
    expect(ev(d).status).toBe('na');
    d = { ...d, garages: [{ id: 'g1', grp: 'p', kind: 'yer_osti', ring: rect(o, 5, 5, 80, 80), levels: 1, spaces: 200 }] };
    expect(ev(d).status).toBe('review');
  });
});

describe('05.11: UMN (66-band) — faqat turar joy binosi', () => {
  it('shu uchastkadagi alohida ofis va koʻp qavatli avtoturargoh UMN ga qoʻshilmaydi', () => {
    let d = blankProject(); const o = d.origin;
    d = apply(d, { type: 'setSite', rings: [rect(o, 0, 0, 100, 100)] });
    d = apply(d, { type: 'addBuilding', footprint: rect(o, 10, 10, 60, 12), floors: 9, nonRes: 1 });
    const base = derive(d).umn;
    d = apply(d, { type: 'addBuilding', footprint: rect(o, 10, 60, 30, 30), floors: 4, nonRes: 4 });
    d = { ...d, buildings: d.buildings.map((b, i) => (i === 1 ? { ...b, use: 'avtoturargoh' as const } : b)) };
    d = apply(d, { type: 'addBuilding', footprint: rect(o, 60, 60, 20, 20), floors: 6, nonRes: 6 });
    d = { ...d, buildings: d.buildings.map((b, i) => (i === 2 ? { ...b, use: 'ofis' as const } : b)) };
    const r = derive(d);
    expect(r.umn).toBeCloseTo(base, 6);
    expect(r.gfa).toBeGreaterThan(6480 + 3000);   // umumiy GFA da ular bor
  });
});
