import { describe, it, expect } from 'vitest';
import { elevateRoads } from '../../src/scene/bridges3d';
import { splitAtJunctions, projectStreetsGeo, CURB_R, CURB_R_RECON, type ProjStreet } from '../../src/scene/streets3d';
import { profileById } from '../../src/core/profiles';
import type { XY } from '../../src/core/geo';

const P = (id: string, axis: XY[], prof: string): ProjStreet => ({ id, axis, parts: profileById(prof).parts });

/** 05.11 (egasi skrinshoti): bulvar burilish nuqtasiga boshqa koʻchalar ulangan — ajratuvchi tugungacha, tashqi burchakda trotuar «choʻqqisi» */
describe('chorraha boʻgʻinida koʻcha boʻlinadi', () => {
  const L = P('L', [[-150, 0], [0, 0], [0, 150]], 'tuman-40');
  it('boshqa koʻcha uchi burilish boʻgʻiniga yaqin — ikki boʻlak; oddiy burilish — oʻzgarmaydi', () => {
    expect(splitAtJunctions([L]).map(s => s.id)).toEqual(['L']);
    const r = splitAtJunctions([L, P('C', [[4, -4], [4, -150]], 'turar-20')]);
    expect(r.map(s => s.id)).toEqual(['L', 'L#1', 'C']);
    expect(r[0].axis).toEqual([[-150, 0], [0, 0]]); expect(r[1].axis).toEqual([[0, 0], [0, 150]]);
  });
  it('uzoqdagi koʻcha uchi (koridordan tashqarida) — boʻlinmaydi', () => {
    expect(splitAtJunctions([L, P('C', [[60, -60], [60, -150]], 'turar-20')]).map(s => s.id)).toEqual(['L', 'C']);
  });
  it('X: ikki koʻcha umumiy boʻgʻinda kesishadi — ikkalasi boʻlinadi', () => {
    const r = splitAtJunctions([P('A', [[-100, 0], [0, 0], [100, 0]], 'tuman-40'), P('B', [[0, -100], [0, 0], [0, 100]], 'turar-20')]);
    expect(r.map(s => s.id)).toEqual(['A', 'A#1', 'B', 'B#1']);
  });
  it('geometriya: chorraha markazida ajratuvchi (yashil) yoʻq, trotuar tashqi burchakda doira chiqarmaydi', () => {
    const g = projectStreetsGeo([L, P('C', [[4, -4], [4, -150]], 'turar-20'), P('D', [[4, -4], [150, -4]], 'turar-20')], () => 0);
    const tri = (arr: number[]) => { const t: XY[][] = []; for (let i = 0; i + 8 < arr.length; i += 9) t.push([[arr[i], -arr[i + 2]], [arr[i + 3], -arr[i + 5]], [arr[i + 6], -arr[i + 8]]]); return t; };
    const inTri = (p: XY, [a, b, c]: XY[]) => { const s = (u: XY, v: XY, w: XY) => (v[0] - u[0]) * (w[1] - u[1]) - (v[1] - u[1]) * (w[0] - u[0]); const d1 = s(a, b, p), d2 = s(b, c, p), d3 = s(c, a, p); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };
    const covered = (k: string, p: XY) => tri(g.layers[k] ?? []).some(t => inTri(p, t));
    // ajratuvchi 4 m (L oʻqi ustida) — chorraha markazida (tugundan 3 m) yoʻq
    expect(covered('yashil', [-3, 0])).toBe(false);
    expect(covered('yashil', [0, 3])).toBe(false);
    // chorraha markazi — asfalt
    expect(covered('qatnov', [0, 0])).toBe(true);
    // tashqi burchak: qizil chiziqlardan tashqarida (C sharqiy cheti x = 14, D janubiy cheti y = −14) — avval trotuar doirasi (r = 22, «choʻqqi») shu yerga chiqardi
    expect(covered('trotuar', [15.5, -15.5])).toBe(false);
    // chorraha burchaklari (qizil chiziqlar ichida) — boʻsh qolmaydi: trotuar yoki asfalt
    for (const p of [[-15, 15], [15, 15], [-15, -15], [10, -10]] as XY[]) expect(covered('trotuar', p) || covered('qatnov', p)).toBe(true);
  });
});

describe('kalta koʻprik (ariq) — ostidan yoʻlak oʻtsa ham koʻtarilmaydi', () => {
  it('≤ 20 m, ostidan footway — tekis; ostidan asosiy yoʻl — koʻtariladi', () => {
    const r = elevateRoads([
      { id: 1, pts: [[0, 0], [12, 0]], w: 7, cls: 'residential', lvl: 1 },
      { id: 2, pts: [[6, -50], [6, 50]], w: 2, cls: 'footway' },
    ]);
    expect(r.elevated).toHaveLength(0);
    const r2 = elevateRoads([
      { id: 1, pts: [[0, 0], [12, 0]], w: 7, cls: 'residential', lvl: 1 },
      { id: 2, pts: [[6, -50], [6, 50]], w: 7, cls: 'secondary' },
    ]);
    expect(r2.elevated.some(e => e.id === 1 && e.bridge)).toBe(true);
  });
  it('uzun koʻprik (> 20 m) ostidan yoʻlak — koʻtariladi (avvalgidek)', () => {
    const r = elevateRoads([{ id: 1, pts: [[0, 0], [40, 0]], w: 7, cls: 'residential', lvl: 1 }, { id: 2, pts: [[20, -50], [20, 50]], w: 2, cls: 'footway' }]);
    expect(r.elevated.some(e => e.id === 1 && e.bridge)).toBe(true);
  });
});

/** 05.11 (egasi chizmasi): asfalt = qatnov qismlari + burchakda R radiusli yoy (341-band: 15 m, rekonstruksiyada 5 m); trotuar burchakdan aylanadi */
describe('chorraha: bordyur yoyi va ajratuvchi uchi', () => {
  const tri = (arr: number[]) => { const t: XY[][] = []; for (let i = 0; i + 8 < arr.length; i += 9) t.push([[arr[i], -arr[i + 2]], [arr[i + 3], -arr[i + 5]], [arr[i + 6], -arr[i + 8]]]); return t; };
  const inTri = (p: XY, [a, b, c]: XY[]) => { const s = (u: XY, v: XY, w: XY) => (v[0] - u[0]) * (w[1] - u[1]) - (v[1] - u[1]) * (w[0] - u[0]); const d1 = s(a, b, p), d2 = s(b, c, p), d3 = s(c, a, p); if (!d1 && !d2 && !d3) return false; return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };
  // X chorraha: ikki bulvar (qatnov cheti ±9 m)
  const X = (r?: number) => projectStreetsGeo([P('A', [[-150, 0], [0, 0], [150, 0]], 'tuman-40'), P('B', [[0, -150], [0, 0], [0, 150]], 'tuman-40')], () => 0, [], r ? { curbR: r } : {});
  const cov = (g: ReturnType<typeof X>, k: string, p: XY) => tri(g.layers[k] ?? []).some(t => inTri(p, t));
  it('341-band: R = 15 m (rekonstruksiyada 5 m) — burchak yoy bilan, tashqarisi trotuar', () => {
    expect(CURB_R).toBe(15); expect(CURB_R_RECON).toBe(5);
    const g = X();
    // ShG burchak: qatnov chetlari x = −9, y = 9 kesishadi; yoy markazi (−24, 24)
    expect(cov(g, 'qatnov', [-10, 10])).toBe(true);    // yoy ichi (burchak asfalti)
    expect(cov(g, 'qatnov', [-14, 14])).toBe(false);   // yoydan tashqarida — trotuar
    expect(cov(g, 'trotuar', [-14, 14])).toBe(true);
    const g5 = X(5);   // rekonstruksiya: yoy markazi (−14, 14), r = 5
    expect(cov(g5, 'qatnov', [-11, 11])).toBe(false);
    expect(cov(X(), 'qatnov', [-11, 11])).toBe(true);
  });
  it('ajratuvchi kesishgan qatnov chetida (9 m) tugaydi, chorraha ichida yoʻq; uzoqda bor', () => {
    const g = X();
    expect(cov(g, 'yashil', [-5, 0.5])).toBe(false);
    expect(cov(g, 'yashil', [-30, 0.5])).toBe(true);
    expect(cov(g, 'qatnov', [-5, 0.5])).toBe(true);
  });
  it('yashil tasma yoy boshlanishidan oldin tugaydi (burchakda asfalt ham, yashil ham yoʻq)', () => {
    const g = X();
    // A ning shimoliy yashil tasmasi (y 10,5–17): yoy tegish nuqtasi x = −24 → yashil x ≤ −25
    expect(cov(g, 'yashil', [-20, 14])).toBe(false);
    expect(cov(g, 'yashil', [-40, 14])).toBe(true);
  });
});
