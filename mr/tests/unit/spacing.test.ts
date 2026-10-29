import { describe, it, expect } from 'vitest';
import { blankProject, type Building, type Project } from '../../src/core/doc';
import { frame, type XY } from '../../src/core/geo';
import { spacingIssues, staleGen } from '../../src/core/spacing';
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
