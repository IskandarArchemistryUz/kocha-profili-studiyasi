import { describe, it, expect } from 'vitest';
import { szzOf, eluZone, bufferLocal, limitZones, landBalance, cleanLimit, hatchSegs, type Limit } from '../../src/core/limits';
import { blankProject, migrate } from '../../src/core/doc';
import { apply } from '../../src/core/commands';
import { computePlan } from '../../src/core/plan';
import { frame, area, type XY } from '../../src/core/geo';
import { sheetSvg, SHEET_DEFAULT, balanceRows, balanceTable } from '../../src/core/sheet';

const sq = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const mpA = (mp: XY[][][]) => mp.reduce((t, p) => t + area(p[0]) - p.slice(1).reduce((s, h) => s + area(h), 0), 0);
const L = (o: Partial<Limit>): Limit => ({ id: 'c1', kind: 'qabriston', status: 'saqlanadi', src: 'qolda', ...o } as Limit);

describe('cheklovlar: SMZ jadvali (SanQvaN 0350-17, 6.3 / 6.4)', () => {
  it('qabriston maydoni va holatiga koʻra', () => {
    expect(szzOf(L({}), 25)).toMatchObject({ m: 500, cls: 'II', flag: 'NORMA' });
    expect(szzOf(L({}), 15)).toMatchObject({ m: 300, cls: 'III' });
    expect(szzOf(L({}), 4)).toMatchObject({ m: 100, cls: 'IV', ref: 'SanQvaN 0350-17, 6.4' });
    expect(szzOf(L({ sub: { open: false, memorial: true } }), 4)).toMatchObject({ m: 50, cls: 'V', flag: 'NORMA' });
    expect(szzOf(L({ sub: { open: false, rural: true } }), 1.5)).toMatchObject({ m: 50, cls: 'V' });
    expect(szzOf(L({ sub: { open: false } }), 4)).toMatchObject({ m: 100, cls: 'IV', flag: 'TALQIN' });
  });
  it('issiqxona, ombor, temir yoʻl; qoʻlda bufer ustun', () => {
    expect(szzOf(L({ kind: 'issiqxona' }), 3)).toMatchObject({ m: 100, cls: 'IV', ref: 'SanQvaN 0350-17, 6.3' });
    expect(szzOf(L({ kind: 'ombor' }), 1)).toMatchObject({ m: 50, cls: 'V' });
    expect(szzOf(L({ kind: 'temiryol' }), 1)).toMatchObject({ m: 100, ref: 'ShNQ 2.07.01-23, 359' });
    expect(szzOf(L({ kind: 'temiryol', szz: 50 }), 1).m).toBe(50);
    expect(szzOf(L({ kind: 'meros' }), 1).m).toBe(0);
  });
});

describe('ELU zonasi (VMQ № 1050, 14-band; SanQvaN 0350-17, 2.23.4)', () => {
  it('kuchlanish boʻyicha, ikki normaning kattasi', () => {
    expect(eluZone({ kv: 0.4 }).m).toBe(2);
    expect(eluZone({ kv: 10 }).m).toBe(10);
    expect(eluZone({ kv: 35 }).m).toBe(15);
    expect(eluZone({ kv: 110 })).toMatchObject({ m: 20, ref: 'VMQ № 1050, 14', flag: 'NORMA' });
    expect(eluZone({ kv: 220 }).m).toBe(25);
    expect(eluZone({ kv: 500 }).m).toBe(30);
    expect(eluZone({ kv: 750 })).toMatchObject({ m: 40, ref: 'SanQvaN 0350-17, 2.23.4' });
    expect(eluZone({ kv: 1150 }).m).toBe(55);
    expect(eluZone({ kv: 330 }).m).toBe(30);   // VMQ da 330 yoʻq — 500 sinfi (30) va SanQvaN 20 dan kattasi
    expect(eluZone({ kv: 150 }).flag).toBe('TAXMIN');
    expect(eluZone({ kv: 110, elu: 'kabel' }).m).toBe(1);
    expect(eluZone({ kv: 110, elu: 'demontaj' }).m).toBe(0);
  });
});

describe('bufer geometriyasi', () => {
  it('kvadrat atrofida m bufer ≈ a² + 4am + πm²', () => {
    const mp = bufferLocal(sq(0, 0, 100, 100), 100, true);
    const A = mpA(mp.map(p => p.map(r => r.slice(0, -1) as XY[])));
    expect(A).toBeGreaterThan(10000 + 40000 + 0.97 * Math.PI * 1e4);
    expect(A).toBeLessThan(10000 + 40000 + Math.PI * 1e4 + 1);
  });
  it('chiziq atrofida (ELU): uzunlik × 2m + uchlarida doira', () => {
    const mp = bufferLocal([[0, 0], [200, 0]], 20, false);
    const A = mpA(mp.map(p => p.map(r => r.slice(0, -1) as XY[])));
    expect(A).toBeGreaterThan(200 * 40 + 0.97 * Math.PI * 400);
    expect(A).toBeLessThan(200 * 40 + Math.PI * 400 + 1);
  });
});

describe('hujjat: kvartallar va yer balansi', () => {
  const mk = (limits: Limit[]) => {
    let d = blankProject('t') as any; const fr = frame(d.origin), G = (p: XY) => fr.toGeo(p);
    d.site = { rings: [sq(-150, -150, 150, 150).map(G)] };
    for (const l of limits) d = apply(d, { type: 'addLimit', limit: { ...l, ...(l.rings ? { rings: l.rings.map(r => (r as unknown as XY[]).map(G)) } : {}), ...(l.axis ? { axis: (l.axis as unknown as XY[]).map(G) } : {}) } } as any);
    return d;
  };
  it('saqlanadigan qabriston konturi kvartaldan ayiriladi, 100 m SMZ — balansda', () => {
    const d0 = mk([]), d = mk([L({ rings: [sq(-20, -20, 20, 20) as any] })]);
    const a0 = computePlan(d0).blocks.reduce((t, b) => t + b.area, 0), a1 = computePlan(d).blocks.reduce((t, b) => t + b.area, 0);
    expect(a0 - a1).toBeCloseTo(1600, -1);
    const z = limitZones(d); expect(z.soft).toHaveLength(1); expect(z.soft[0]).toMatchObject({ m: 100, cls: 'IV' });
    const b = landBalance(d)!;
    expect(b.siteHa).toBeCloseTo(9, 2); expect(b.hardHa).toBeCloseTo(0.16, 2);
    // SMZ: 40 × 40 kvadrat atrofida 100 m — uchastka (300 × 300) ichida toʻliq: 240² dan burchaklar yumaloq ayirmasi, kontur ayirilgan
    expect(b.szzHa).toBeGreaterThan(4.6); expect(b.szzHa).toBeLessThan(5.6);
    expect(b.usableHa).toBeCloseTo(b.siteHa - b.hardHa - b.szzHa, 6);
  });
  it('buziladigan obyekt — hisobga olinmaydi; ELU 110 kV — 40 m koridor qurib boʻlmaydi', () => {
    expect(landBalance(mk([L({ kind: 'issiqxona', status: 'buziladi', rings: [sq(-20, -20, 20, 20) as any] })]))!.hardHa).toBe(0);
    const b = landBalance(mk([L({ kind: 'elu', kv: 110, elu: 'mavjud', axis: [[-200, 0], [200, 0]] as any })]))!;
    expect(b.hardHa).toBeCloseTo(300 * 40 / 1e4, 2);
    expect(b.szzHa).toBe(0);
  });
  it('cheklovlar varagʻi: shtrix, SMZ, ELU qatlamlari va yer balansi jadvali (02.11)', () => {
    const d = mk([L({ rings: [sq(-20, -20, 20, 20) as any] }), L({ id: 'e', kind: 'elu', kv: 110, elu: 'mavjud', axis: [[-200, 120], [200, 120]] as any })]);
    const r = sheetSvg(d, null, { ...SHEET_DEFAULT, kind: 'cheklov' }, new Date(0));
    for (const id of ['Qurib_bolmaydigan', 'SMZ_cheklovlar', 'ELU', 'Yer_balansi']) expect(r.svg).toContain(`id="${id}"`);
    const t = balanceTable(d)!, b = landBalance(d)!;
    expect(t[0]).toEqual(['Yer balansi', 'ga', '%']);
    expect(t[1][1]).toBe(b.siteHa.toFixed(2).replace('.', ',')); expect(t[1][2]).toBe('100,0');
    // hudud = qurib boʻlmaydigan + SMZ + yaroqli
    const rows = balanceRows(d); expect(rows[1].v + rows[2].v + rows[3].v).toBeCloseTo(rows[0].v, 6);
    // funksiyalar + koʻchalar = hudud
    expect(rows.slice(4).reduce((a, x) => a + x.v, 0)).toBeCloseTo(rows[0].v, 2);
    expect(r.legend.some(x => x.type === 'hatch')).toBe(true);
  });
  it('fayldan: buzilgan cheklov tashlanadi, eski loyiha (limits yoʻq) ochiladi', () => {
    expect(cleanLimit({ id: 'a', kind: 'qabriston' })).toBeNull();
    expect(cleanLimit({ id: 'a', kind: 'elu', axis: [[69, 41], [69.01, 41]], kv: 110 })).toMatchObject({ kind: 'elu', kv: 110, status: 'saqlanadi', src: 'qolda' });
    const d = mk([L({ rings: [sq(-20, -20, 20, 20) as any] })]);
    const back = migrate(JSON.parse(JSON.stringify(d)));
    expect(back.limits).toHaveLength(1);
    const old = { ...JSON.parse(JSON.stringify(d)) }; delete old.limits;
    expect(migrate(old).limits).toBeUndefined();
  });
});

describe('hatchSegs', () => {
  it('kvadrat ichida — har chiziq kvadrat ichida, uzunliklar yigʻindisi ≈ maydon / qadam', () => {
    const sq: [number, number][] = [[0, 0], [100, 0], [100, 100], [0, 100]];
    const segs = hatchSegs([[sq]], 5, 45);
    const L = segs.reduce((t, [a, b]) => t + Math.hypot(b[0] - a[0], b[1] - a[1]), 0);
    expect(Math.abs(L - 10000 / 5) / 2000).toBeLessThan(0.05);
    for (const [a, b] of segs) for (const p of [a, b]) { expect(p[0]).toBeGreaterThan(-0.01); expect(p[0]).toBeLessThan(100.01); expect(p[1]).toBeGreaterThan(-0.01); expect(p[1]).toBeLessThan(100.01); }
  });
  it('teshik chiqarib tashlanadi', () => {
    const sq: [number, number][] = [[0, 0], [100, 0], [100, 100], [0, 100]], hole: [number, number][] = [[25, 25], [75, 25], [75, 75], [25, 75]];
    const L = (s: [[number, number], [number, number]][]) => s.reduce((t, [a, b]) => t + Math.hypot(b[0] - a[0], b[1] - a[1]), 0);
    expect(Math.abs(L(hatchSegs([[sq, hole]], 5, 0)) - (10000 - 2500) / 5)).toBeLessThan(60);
  });
});
