import { describe, it, expect } from 'vitest';
import { blankProject, type Building, type Project } from '../../src/core/doc';
import { frame, type XY } from '../../src/core/geo';
import { spacingIssues, staleGen } from '../../src/core/spacing';
import { kyOf } from '../../src/core/setback';
import { RULES } from '../../src/norms/rules';

const O: [number, number] = [69.28, 41.31];
const fr = frame(O);
const rect = (x: number, y: number, w: number, h: number): XY[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const bld = (id: string, r: XY[], floors: number, grp?: string): Building => ({ id, footprint: r.map(fr.toGeo), floors, nonRes: 0, use: 'turar', ...(grp ? { gen: { grp, kind: 'oddiy' } } : {}) } as Building);
const doc = (bs: Building[]): Project => ({ ...blankProject('t'), origin: O, buildings: bs });

describe('binolar orasidagi masofa (79-band 2-jadval)', () => {
  it('ustma-ust tushgan binolar — buzilish', () => {
    const d = doc([bld('a', rect(0, 0, 60, 15), 12, 'g1'), bld('b', rect(20, 5, 60, 15), 12, 'g2')]);
    expect(spacingIssues(d).pairs.map(p => p.kind)).toEqual(['ustma-ust']);
    const r = RULES.find(x => x.id === 'spacing-79')!.evaluate({} as never, d);
    expect(r.status).toBe('fail');
  });
  it('parallel uzun tomonlar: 30 m < 2·H (12 qavat) — buzilish; 2·H dan ortiq — mos', () => {
    const H = 12 * blankProject('t').settings.floorHeight;
    expect(spacingIssues(doc([bld('a', rect(0, 0, 60, 15), 12), bld('b', rect(0, 45, 60, 15), 12)])).pairs[0]).toMatchObject({ kind: 'uzun', need: 2 * H });
    expect(spacingIssues(doc([bld('a', rect(0, 0, 60, 15), 12), bld('b', rect(0, 15 + 2 * H + 1, 60, 15), 12)])).pairs).toEqual([]);
  });
  it('umumiy devorli seksiyalar — bitta bino, tekshirilmaydi; generator oʻtishi (6 m) — koʻrib chiqish', () => {
    expect(spacingIssues(doc([bld('a', rect(0, 0, 30, 15), 12, 'g'), bld('b', rect(30, 0, 30, 15), 12, 'g')])).pairs).toEqual([]);
    const p = spacingIssues(doc([bld('a', rect(0, 0, 30, 15), 12, 'g'), bld('b', rect(36, 0, 30, 15), 12, 'g')])).pairs;
    expect(p.map(x => x.kind)).toEqual(['otish']);
  });
});

describe('qoʻllanish doirasi (79-band: 3+ qavatli koʻp kvartirali turar joy va yotoq oʻrinli binolar; 6, 8-izohlar) — 02.11', () => {
  const H = (f: number) => f * blankProject('t').settings.floorHeight;
  const mk = (b: Partial<Building>, r: XY[], id: string): Building => ({ ...bld(id, r, 12), ...b } as Building);
  it('noturar binolar oʻzaro va noturar ↔ turar joy — 2-jadval qoʻyilmaydi', () => {
    expect(spacingIssues(doc([mk({ use: 'ofis' }, rect(0, 0, 60, 15), 'a'), mk({ use: 'ofis' }, rect(0, 30, 60, 15), 'b')])).pairs).toEqual([]);
    expect(spacingIssues(doc([mk({ use: 'ofis' }, rect(0, 0, 60, 15), 'a'), bld('b', rect(0, 30, 60, 15), 12)])).pairs).toEqual([]);
  });
  it('mehmonxona (yotoq oʻrinli) ↔ turar joy — jadval bor, lekin 8-izoh (turar joy oʻzaro) emas: Hmax·kʏ', () => {
    const p = spacingIssues(doc([mk({ use: 'mehmonxona' }, rect(0, 0, 60, 15), 'a'), bld('b', rect(0, 30, 60, 15), 12)])).pairs[0];
    expect(p).toMatchObject({ kind: 'uzun' }); expect(p.need).toBeCloseTo(H(12) * p.ky!, 6); expect(p.need).toBeLessThan(2 * H(12) * 1.2);
  });
  it('uchastkali past uylar (taunhaus) oʻzaro — tekshirilmaydi; koʻp qavatli ↔ taunhaus — 6-izoh: ≥ H, oynasiz tomondan H/2', () => {
    const th = (id: string, r: XY[]) => ({ ...bld(id, r, 3), gen: { grp: id, kind: 'taunhaus', plot: r.map(fr.toGeo) } }) as Building;
    expect(spacingIssues(doc([th('a', rect(0, 0, 40, 10)), th('b', rect(0, 16, 40, 10))])).pairs).toEqual([]);
    const p = spacingIssues(doc([bld('m', rect(0, 0, 60, 15), 12), th('t', rect(0, 35, 40, 10))])).pairs;
    expect(p).toHaveLength(1); expect(p[0]).toMatchObject({ kind: 'yakka', need: H(12) });
    // oynasiz torets (gen.blind) — talab yarmi
    const m2 = { ...bld('m', rect(0, 0, 15, 30), 12, 'g'), gen: { grp: 'g', kind: 'oddiy', blind: [1] } } as Building;
    const q = spacingIssues(doc([m2, th('t', rect(28, 0, 10, 30))])).pairs[0];
    expect(q).toMatchObject({ kind: 'yakka', need: H(12) / 2 });
  });
});

describe('yoʻnalish koeffitsiyenti kʏ (2-ilova diagrammasi) va 45° gacha burchak — 02.11', () => {
  const H = (f: number) => f * blankProject('t').settings.floorHeight;
  const rot = (r: XY[], deg: number): XY[] => { const t = deg * Math.PI / 180, c = Math.cos(t), s2 = Math.sin(t); return r.map(([x, y]) => [x * c - y * s2, x * s2 + y * c] as XY); };
  it('diagramma: 10° li sektorlar, 90° da takrorlanadi', () => {
    expect([0, 4, 6, 14, 16, 26, 36, 45, 54, 56, 66, 76, 86, 90, 135, 180].map(kyOf)).toEqual([1.2, 1.2, 1.5, 1.5, 1.7, 1.9, 2.3, 2.3, 2.3, 1.9, 1.7, 1.5, 1.2, 1.2, 2.3, 1.2]);
  });
  it('seysmik 7: parallel uzun tomonlar — Hmax·kʏ; bino 45° ga burilsa talab 1,2 → 2,3', () => {
    const d7 = (bs: Building[]) => ({ ...doc(bs), settings: { ...blankProject('t').settings, seismic: 7 } }) as Project;
    const p0 = spacingIssues(d7([bld('a', rect(0, 0, 60, 15), 9), bld('b', rect(0, 30, 60, 15), 9)])).pairs[0];
    expect(p0).toMatchObject({ kind: 'uzun', ky: 1.2 }); expect(p0.need).toBeCloseTo(H(9) * 1.2, 6);
    const p45 = spacingIssues(d7([bld('a', rot(rect(0, 0, 60, 15), 45), 9), bld('b', rot(rect(0, 30, 60, 15), 45), 9)])).pairs[0];
    expect(p45.ky).toBe(2.3); expect(p45.need).toBeCloseTo(H(9) * 2.3, 6);
  });
  it('uzun tomonlar 30° burchakda — hali «uzun» juftlik (avval torets deb olinardi); 8-izoh (parallel) qoʻllanmaydi', () => {
    const a = bld('a', rect(0, 0, 60, 15), 9), b = bld('b', rot(rect(0, 0, 60, 15), 30).map(([x, y]) => [x + 10, y + 40] as XY), 9);
    const p = spacingIssues(doc([a, b])).pairs.find(q => q.kind === 'uzun')!;
    expect(p).toBeTruthy(); expect(p.need).toBeLessThan(2 * H(9)); expect(p.need).toBeCloseTo(H(9) * p.ky!, 6);
  });
});

describe('rekonstruksiya rejimi (79-band 2-jadval 7-izoh)', () => {
  const rec = (d: Project): Project => ({ ...d, settings: { ...d.settings, recon: true } });
  const ev = (d: Project) => RULES.find(x => x.id === 'spacing-79')!.evaluate({} as never, d);
  it('toretslar: jadvaldan kam, yarmidan koʻp — koʻrib chiqish; yarmidan kam — buzilish', () => {
    const mk = (gap: number) => doc([bld('a', rect(0, 0, 30, 15), 12, 'g1'), bld('b', rect(30 + gap, 0, 30, 15), 12, 'g2')]);
    expect(ev(mk(15)).status).toBe('fail');                         // oddiy rejim: (H1+H2)·0,3 ≈ 24 m
    expect(spacingIssues(rec(mk(15))).pairs[0]).toMatchObject({ kind: 'torets', red: true });
    const r = ev(rec(mk(15))); expect(r.status).toBe('review'); expect(r.note).toContain('7-izoh');
    expect(ev(rec(mk(10))).status).toBe('fail');                    // 10 m < 24/2
  });
  it('uzun tomonlar 2·Hmax (8-izoh) qisqarmaydi', () => {
    const d = rec(doc([bld('a', rect(0, 0, 60, 15), 12), bld('b', rect(0, 45, 60, 15), 12)]));
    expect(spacingIssues(d).pairs[0].red).toBeUndefined();
    expect(ev(d).status).toBe('fail');
  });
});

describe('qayta generatsiya: eski avtomatik binolar almashtiriladi', () => {
  it('hududdagi boshqa guruh binosi va ustma-ust tushgani olinadi, qoʻlda chizilgan qoladi', () => {
    const d = doc([bld('old1', rect(10, 10, 20, 15), 9, 'blok'), bld('old2', rect(95, 10, 20, 15), 9, 'blok'), bld('far', rect(300, 300, 20, 15), 9, 'blok'), bld('hand', rect(40, 40, 10, 10), 3)]);
    const s = staleGen(d, 'parsel1', rect(0, 0, 100, 100), [rect(90, 12, 20, 10)]);
    expect(s.bids.sort()).toEqual(['old1', 'old2']);
  });
});
