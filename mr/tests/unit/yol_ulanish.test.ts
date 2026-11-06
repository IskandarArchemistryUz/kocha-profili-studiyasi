import { describe, it, expect } from 'vitest';
import { buildNet, projectStreetsGeo, asTargets, CURB_R, type ProjStreet } from '../../src/scene/streets3d';
import { profileById } from '../../src/core/profiles';
import type { XY } from '../../src/core/geo';

/** 06.11 (egasi skrinshotlari): T tugunsiz, X umumiy nuqtasiz, mavjud koʻchaga ulanishda bordyur yoyi yoʻq, qizil chiziq ogʻizni yopadi */
const P = (id: string, axis: XY[], prof = 'mahalla-15'): ProjStreet => ({ id, axis, parts: profileById(prof).parts });
const tri = (arr: number[] = []) => { const t: XY[][] = []; for (let i = 0; i + 8 < arr.length; i += 9) t.push([[arr[i], -arr[i + 2]], [arr[i + 3], -arr[i + 5]], [arr[i + 6], -arr[i + 8]]]); return t; };
const inTri = (p: XY, [a, b, c]: XY[]) => { const s = (u: XY, v: XY, w: XY) => (v[0] - u[0]) * (w[1] - u[1]) - (v[1] - u[1]) * (w[0] - u[0]); const d1 = s(a, b, p), d2 = s(b, c, p), d3 = s(c, a, p); if (!d1 && !d2 && !d3) return false; return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };
const cov = (g: ReturnType<typeof projectStreetsGeo>, k: string, p: XY) => tri(g.layers[k]).some(t => inTri(p, t));
const segD = (p: XY, a: XY, b: XY) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)); return Math.hypot(a[0] + dx * t - p[0], a[1] + dy * t - p[1]); };
const nearRed = (g: ReturnType<typeof projectStreetsGeo>, p: XY, tol = 0.3) => g.red.some(r => r.some((q, i) => i > 0 && segD(p, r[i - 1], q) < tol));

describe('tugun modeli (buildNet)', () => {
  it('qizil chiziqqacha chizilgan uch — oʻtuvchi koʻcha oʻqigacha choʻziladi, oʻtuvchi koʻcha tugunda boʻlinadi', () => {
    const n = buildNet([P('A', [[0, 0], [100, 0]]), P('B', [[50, -60], [50, -7.5]])], []);
    expect(n.list.map(s => s.id)).toEqual(['A', 'A#1', 'B']);
    expect(n.list[2].axis[1]).toEqual([50, 0]);
    expect(n.list[0].axis[1]).toEqual([50, 0]);
  });
  it('oʻtib ketgan uch (4 m) — oʻqqa qaytariladi', () => {
    const n = buildNet([P('A', [[0, 0], [100, 0]]), P('B', [[50, -60], [50, 4]])], []);
    expect(n.list.find(s => s.id === 'B')!.axis[1][1]).toBeCloseTo(0, 6);
  });
  it('oʻrtasidan kesishgan koʻchalar — umumiy boʻgʻin, toʻrt boʻlak', () => {
    const n = buildNet([P('A', [[-60, 0], [60, 0]]), P('B', [[-30, -50], [30, 50]])], []);
    expect(n.list).toHaveLength(4);
    const ends = n.list.flatMap(s => [s.axis[0], s.axis[s.axis.length - 1]]).filter(p => Math.hypot(p[0], p[1]) < 0.01);
    expect(ends).toHaveLength(4);
  });
  it('mavjud yoʻl: yetmagan uch oʻqqa choʻziladi; kesib oʻtgan joyda boʻlinadi; yoʻl tugunida ikki virtual boʻlak', () => {
    const osm = asTargets([{ pts: [[-80, 0], [80, 0]], cls: 'primary', w: 14 }]);
    const t = buildNet([P('A', [[0, -60], [0, -9]])], osm);
    expect(t.list[0].axis[1][1]).toBeCloseTo(0, 6);
    expect(t.virt).toHaveLength(2);
    const x = buildNet([P('A', [[0, -60], [0, 60]])], osm);
    expect(x.list).toHaveLength(2);
    expect(x.virt).toHaveLength(2);
  });
  it('uzoqdagi yoʻl — oʻzgarmaydi', () => {
    const n = buildNet([P('A', [[0, -60], [0, -30]])], asTargets([{ pts: [[-80, 0], [80, 0]], cls: 'residential', w: 7 }]));
    expect(n.list[0].axis).toEqual([[0, -60], [0, -30]]); expect(n.virt).toHaveLength(0);
  });
});

describe('chorraha geometriyasi', () => {
  it('T (qizil chiziqqacha): asfalt ulanadi, ogʻizda trotuar/yashil yoʻq, bordyur yoyi R = 15 m (108-band)', () => {
    expect(CURB_R).toBe(15);
    const g = projectStreetsGeo([P('A', [[0, 0], [100, 0]]), P('B', [[50, -60], [50, -7.5]])], () => 0);
    expect(cov(g, 'qatnov', [50, -5])).toBe(true);     // kirish ogʻzi — asfalt (avval trotuar tasmasi kesib oʻtardi)
    expect(cov(g, 'yashil', [50, -4])).toBe(false);
    // burchak: qatnov chetlari (46,75; −3,25) — yoy ichida asfalt
    expect(cov(g, 'qatnov', [45.5, -4.5])).toBe(true);
  });
  it('qizil chiziq: ogʻizni yopmaydi, berk uchda koʻndalang chiziq yoʻq, burchak yoy bilan', () => {
    const g = projectStreetsGeo([P('A', [[0, 0], [100, 0]]), P('B', [[50, -60], [50, -7.5]])], () => 0);
    expect(nearRed(g, [50, -7.5])).toBe(false);      // ogʻiz
    expect(nearRed(g, [50, 7.5])).toBe(true);        // oʻtuvchi koʻchaning qarama-qarshi chizigʻi uzluksiz
    expect(nearRed(g, [50, -60])).toBe(false);       // berk uch
    expect(nearRed(g, [0, 0])).toBe(false);
    expect(nearRed(g, [42.5, -7.5], 0.2)).toBe(false);  // keskin burchak yoʻq — yoy
  });
  it('mavjud yoʻlni kesib oʻtish (X): toʻrt burchakda yoy, yoʻl ustida loyiha trotuari yoʻq', () => {
    const osm = [{ pts: [[-80, 0], [80, 0]] as XY[], cls: 'residential', w: 7 }];
    const g = projectStreetsGeo([P('A', [[0, -60], [0, 60]])], () => 0, osm);
    for (const s of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) expect(cov(g, 'qatnov', [s[0] * 4, s[1] * 4.3])).toBe(true);
    expect(cov(g, 'trotuar', [0, 0])).toBe(false);
    expect(cov(g, 'qatnov', [0, 0])).toBe(false);    // yoʻl asfalti ustiga boshqa rangdagi loyiha asfalti chizilmaydi
  });
  it('yoʻl tugunida ogʻiz ochiq (qizil chiziq yoʻl chetida kesishmaydi)', () => {
    const g = projectStreetsGeo([P('A', [[0, -60], [0, -9]])], () => 0, [{ pts: [[-80, 0], [80, 0]], cls: 'primary', w: 14 }]);
    expect(nearRed(g, [0, -11])).toBe(false);
    expect(g.red.length).toBe(2);
  });
});
