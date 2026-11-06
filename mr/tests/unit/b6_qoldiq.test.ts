import { describe, it, expect } from 'vitest';
import { blankProject, type Building, type Garage, type Project } from '../../src/core/doc';
import { frame, type XY } from '../../src/core/geo';
import { RULES } from '../../src/norms/rules';
import { derive } from '../../src/core/derive';

/** 06.11 (B6 qoldiqlari): 30-jadval ochiq (yer usti) avtoturargohga ham; 411-band barcha avtoturargohlarga; velo-88, tp-257 — izoh */
const O: [number, number] = [69.28, 41.31], fr = frame(O);
const sq = (x: number, y: number, w: number, d: number): XY[] => [[x, y], [x + w, y], [x + w, y + d], [x, y + d]];
const ev = (id: string, d: Project) => RULES.find(r => r.id === id)!.evaluate(derive(d), d);
const lot = (sp: number, kind: Garage['kind'] = 'yer_usti', x = 0): Garage => ({ id: 'g' + kind + x, grp: 'b1', kind, ring: sq(x, 0, 40, 20).map(fr.toGeo), levels: 1, spaces: sp });
const house = (y: number, grp = 'b1'): Building => ({ id: 'h' + y, footprint: sq(0, y, 60, 15).map(fr.toGeo), floors: 9, nonRes: 0, use: 'turar', gen: { grp } } as Building);
const doc = (gs: Garage[], bs: Building[]): Project => ({ ...blankProject('t'), origin: O, buildings: bs, garages: gs, streets: [], site: { rings: [sq(-50, -50, 200, 200).map(fr.toGeo)] } as Project['site'] });

describe('B6: avtoturargoh masofalari, nogironlar joylari, velo, TP', () => {
  it('30-jadval va 3-ilova: ochiq avtoturargoh (30 joy → 11–50: 15 m) — bir guruhdagi uy ham tekshiriladi', () => {
    expect(ev('park-30', doc([lot(30)], [house(28)])).status).toBe('fail');     // 8 m < 10 (derazasiz) va 15
    // 06.11 (c61): ShNQ 30-jadval va SanQvaN 0103-25, 3-ilova kattasi — derazasiz tomon ham 15 m (3-ilova, 11–50) → 12 m mos emas
    expect(ev('park-30', doc([lot(30)], [house(32)])).status).toBe('fail');
    expect(ev('park-30', doc([lot(30)], [house(32)])).note).toContain('3-ilova');
    expect(ev('park-30', doc([lot(30)], [house(40)])).status).toBe('pass');
    expect(ev('park-30', doc([], [house(40)])).status).toBe('na');
    expect(ev('park-30', doc([lot(30, 'yer_osti')], [house(28)])).status).toBe('na');   // yer osti — 415-band (ug-park-415)
  });
  it('411-band: barcha avtoturargohlar joylari yigʻiladi', () => {
    const r = ev('park-411', doc([lot(30), lot(70, 'yer_osti', 100)], [house(60)]));
    expect(r.value).toBe(5); expect(r.note).toContain('100');
    expect(ev('park-411', doc([], [house(60)])).status).toBe('na');
  });
  it('velo-88 va tp-257 — normada oʻlcham/model yoʻq: baholanmadi, izoh band bilan', () => {
    const d = doc([], [house(60)]);
    const v = ev('velo-88', d), t = ev('tp-257', d);
    expect(v.status).toBe('na'); expect(t.status).toBe('na');
    expect(t.note).toContain('10 m'); expect(t.note).toContain('25 m'); expect(t.note).toContain('258-band');
  });
});
