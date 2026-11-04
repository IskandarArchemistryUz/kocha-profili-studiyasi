import { describe, it, expect } from 'vitest';
import { fireNeed, firePairs, fClassOf } from '../../src/core/firedist';
import { lowriseBlock, type LowKind } from '../../src/core/lowrise';
import { ringDist } from '../../src/core/derive';
import { blankProject } from '../../src/core/doc';
import { frame, type XY } from '../../src/core/geo';

/** 04.11 (egasi): ShNQ 2.07.01-23, 56-jadval — binolar, ayniqsa past uylar orasidagi yongʻinga qarshi masofa */
describe('56-jadval', () => {
  it('jadval qiymatlari (asl matn) va 649-band', () => {
    const F1 = (c: 0 | 1 | 2 | 3) => ({ f: 'F1' as const, c }), F5 = (c: 0 | 1 | 2 | 3) => ({ f: 'F5' as const, c });
    expect(fireNeed(F1(0), F1(0), 8)!.need).toBe(6);
    expect(fireNeed(F1(0), F1(3), 8)!.need).toBe(10);
    expect(fireNeed(F1(3), F1(3), 8)!.need).toBe(15);
    expect(fireNeed(F1(1), F1(2), 8)!.need).toBe(10);
    expect(fireNeed(F5(0), F1(0), 8)!.need).toBe(10);
    expect(fireNeed(F1(3), F5(3), 8)!.need).toBe(18);
    expect(fireNeed(F5(0), F5(0), 8)).toBeNull();                 // 644-band — boshqa meʼyor
    expect(fireNeed(F1(0), F1(0), 9)!.need).toBeCloseTo(7.2);     // 649-band: +20 %
    expect(fireNeed({ f: 'F34', c: 0 }, F1(0), 9)!.need).toBe(6);  // Ф1 emas, I–III — oshmaydi
    expect(fClassOf('yakka')).toBe('F1'); expect(fClassOf('ofis')).toBe('F34'); expect(fClassOf('sanoat')).toBe('F5');
  });
  it('juftlar: 4 m — yetmaydi, tegib turgan — bitta blok, 7 m — mos', () => {
    const d = blankProject('t'), fr = frame(d.origin), R = (x: number): XY[] => [[x, 0], [x + 10, 0], [x + 10, 10], [x, 10]];
    const mk = (id: string, x: number) => ({ id, footprint: R(x).map(fr.toGeo), floors: 2, use: 'yakka' } as any);
    d.buildings = [mk('a', 0), mk('b', 14), mk('c', 24), mk('d', 41)];   // a–b 4 m, b–c 0 m, c–d 7 m
    const { pairs } = firePairs(d);
    expect(pairs.map(p => [p.a, p.b].sort().join())).toEqual(['a,b']);
    expect(pairs[0].d).toBeCloseTo(4); expect(pairs[0].need).toBe(6);
    d.settings = { ...d.settings, fireLow: 3 }; expect(firePairs(d).pairs.length).toBe(3);   // IV–V: 15 m — a–b, a–c (14 m), c–d
  });
  it('past uylar generatori: qoʻshni uylar orasi talabdan kam emas (6 m va 15 m)', () => {
    const blk: XY[] = [[0, 0], [180, 0], [180, 120], [0, 120]];
    for (const fire of [6, 7.2, 15]) for (const k of ['yakka', 'juft', 'hovli', 'taunhaus', 'klaster'] as LowKind[]) {
      const h = lowriseBlock(blk, k, undefined, fire).houses;
      expect(h.length, `${k} ${fire}`).toBeGreaterThan(0);
      // bloklangan qatordagi uylar (tegib turgan zanjir) — bitta bino
      const par = h.map((_, i) => i), root = (i: number): number => (par[i] === i ? i : (par[i] = root(par[i]))), D: [number, number, number][] = [];
      for (let i = 0; i < h.length; i++) for (let j = i + 1; j < h.length; j++) { const dd = ringDist(h[i].ring, h[j].ring); if (dd < 0.5) par[root(i)] = root(j); else if (dd < 20) D.push([i, j, dd]); }
      let worst = Infinity; for (const [i, j, dd] of D) if (root(i) !== root(j)) worst = Math.min(worst, dd);
      expect(worst, `${k} ${fire}`).toBeGreaterThanOrEqual(fire - 0.05);
    }
  });
});
