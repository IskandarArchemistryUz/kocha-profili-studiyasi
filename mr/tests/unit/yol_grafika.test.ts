import { describe, it, expect } from 'vitest';
import { streetsGeo, osmFillets, OSM_CURB_R, clipLineToRings, inRings, type StreetIn } from '../../src/scene/streets3d';
import type { XY } from '../../src/core/geo';

const H = () => 0;
/** uchburchaklar (x, h, −y) ichida nuqta bormi */
const covered = (arr: number[], p: XY) => {
  for (let i = 0; i < arr.length; i += 9) {
    const a: XY = [arr[i], -arr[i + 2]], b: XY = [arr[i + 3], -arr[i + 5]], c: XY = [arr[i + 6], -arr[i + 8]];
    const s = (u: XY, v: XY, w: XY) => (u[0] - w[0]) * (v[1] - w[1]) - (v[0] - w[0]) * (u[1] - w[1]);
    const d1 = s(p, a, b), d2 = s(p, b, c), d3 = s(p, c, a);
    if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) return true;
  }
  return false;
};

describe('OSM koʻchalari: chorraha va burilishda 6 m bordyur yoyi (ANDOZA)', () => {
  const cross: StreetIn[] = [
    { pts: [[-100, 0], [0, 0], [100, 0]], cls: 'residential', w: 7 },
    { pts: [[0, -100], [0, 0], [0, 100]], cls: 'residential', w: 7 },
  ];
  it('X chorrahada 4 ta yoy, R = 6', () => {
    const f = osmFillets(cross);
    expect(OSM_CURB_R).toBe(6);
    expect(f.length).toBe(4);
    // yoy uchlari qatnov chetidan (3,5 m) urinadi: birinchi nuqta y = ±3,5 yoki x = ±3,5 chizigʻida
    for (const x of f) { const a = x.arc[0], b = x.arc[x.arc.length - 1]; expect(Math.min(Math.abs(Math.abs(a[0]) - 3.5), Math.abs(Math.abs(a[1]) - 3.5))).toBeLessThan(1e-6); expect(Math.min(Math.abs(Math.abs(b[0]) - 3.5), Math.abs(Math.abs(b[1]) - 3.5))).toBeLessThan(1e-6); }
  });
  it('burchakdagi nuqta asfalt bilan qoplanadi (avval — faqat trotuar)', () => {
    const g = streetsGeo(cross, H);
    expect(covered(g.asphalt, [4.3, 4.3])).toBe(true);
    expect(covered(g.asphalt, [-4.3, 4.3])).toBe(true);
    expect(covered(g.asphalt, [9, 9])).toBe(false);       // yoy markazi tomoni — asfalt emas
  });
  it('toʻgʻri yoʻl ustidagi oraliq tugunda yoy yoʻq; burilishning ichki tomonida bor', () => {
    expect(osmFillets([{ pts: [[-50, 0], [0, 0], [50, 0]], cls: 'residential', w: 7 }]).length).toBe(0);
    const b = osmFillets([{ pts: [[-50, 0], [0, 0], [0, 50]], cls: 'residential', w: 7 }]);
    expect(b.length).toBe(1);
  });
  it('qisqa boʻlakda R kichrayadi yoki yoy qoʻyilmaydi; piyoda yoʻllari hisobga olinmaydi', () => {
    const f = osmFillets([{ pts: [[-8, 0], [0, 0]], cls: 'residential', w: 7 }, { pts: [[0, 0], [0, 8]], cls: 'residential', w: 7 }]);
    for (const x of f) { const c = x.arc[0]; expect(Math.hypot(c[0], c[1])).toBeLessThan(8); }
    expect(osmFillets([{ pts: [[-50, 0], [0, 0], [50, 0]], cls: 'footway', w: 2 }, { pts: [[0, 0], [0, 50]], cls: 'footway', w: 2 }]).length).toBe(0);
  });
  it('zich toʻr: geometriya tez quriladi', () => {
    const list: StreetIn[] = [];
    for (let i = -12; i <= 12; i++) { list.push({ pts: Array.from({ length: 25 }, (_, k) => [i * 70, -840 + k * 70] as XY), cls: 'residential', w: 7 }); list.push({ pts: Array.from({ length: 25 }, (_, k) => [-840 + k * 70, i * 70] as XY), cls: 'residential', w: 7 }); }
    expect(osmFillets(list).length).toBeGreaterThan(2000);
    const t0 = performance.now(); const g = streetsGeo(list, H); const ms = performance.now() - t0;
    expect(g.asphalt.length).toBeGreaterThan(0);
    expect(ms).toBeLessThan(3000);
  });
});

describe('qizil chiziq uchastka bilan kesiladi', () => {
  const site: XY[][] = [[[0, 0], [100, 0], [100, 80], [0, 80]]];
  it('tashqariga chiqqan chiziq — faqat ichki boʻlak', () => {
    const r = clipLineToRings([[-50, 40], [150, 40]], site);
    expect(r.length).toBe(1);
    expect(r[0][0][0]).toBeCloseTo(0); expect(r[0][r[0].length - 1][0]).toBeCloseTo(100);
  });
  it('ichkariga kirib chiqib yana kiradigan chiziq — ikki boʻlak; butunlay tashqarida — yoʻq', () => {
    expect(clipLineToRings([[10, 10], [10, 120], [50, 120], [50, 10]], site).length).toBe(2);
    expect(clipLineToRings([[-10, -10], [-10, 200]], site).length).toBe(0);
    expect(inRings([50, 40], site)).toBe(true); expect(inRings([150, 40], site)).toBe(false);
  });
});

describe('chorraha yoyi qisqa boʻlakdan oshmaydi («tikan» yoʻq)', () => {
  it('loyiha koʻchasi T dan 5 m oldin mavjud yoʻlni kesib oʻtsa — asfalt T ning narigi tomoniga chiqmaydi', async () => {
    const { projectStreetsGeo } = await import('../../src/scene/streets3d');
    const { profileById } = await import('../../src/core/profiles');
    const P = profileById('mahalla-15').parts;
    const osm: StreetIn[] = [{ pts: [[35, -35], [35, 35]], cls: 'residential', w: 7 }];
    const g = projectStreetsGeo([{ id: 'a', axis: [[-100, 0], [40, 0]], parts: P }, { id: 'b', axis: [[40, 150], [40, -150]], parts: P }], H, osm, {});
    const a = g.layers.qatnov; let n = 0;
    for (let i = 0; i < a.length; i += 3) if (a[i] > 47.6 && Math.abs(a[i + 2]) < 10) n++;
    expect(n).toBe(0);
  });
});
