import { describe, it, expect } from 'vitest';
import polygonClipping from 'polygon-clipping';
import { generate, usePreset, DEFAULT_GEN, inset } from '../../src/core/generator';
import { socialPlan, plotCapacity, SOCIAL } from '../../src/core/social';
import { insetRobust } from '../../src/core/offset';
import { area, type XY } from '../../src/core/geo';

/** 6-band: joy yetarli, lekin shakli oʻtkir burchakli yoki egri burchakli kvartal/parsel — generatsiya ishlashi kerak */
const wedge: XY[] = [[0, 0], [160, 0], [0, 55]];                                   // ~19° oʻtkir burchak (qiya koʻcha kesgan)
const fillet: XY[] = [[0, 0], [100, 0], [100, 60]];                                // burchagi yoy (koʻcha burilishi)
for (let j = 0; j <= 10; j++) { const t = j / 10 * Math.PI / 2; fillet.push([70 + 30 * Math.cos(t), 60 + 30 * Math.sin(t)]); }
fillet.push([0, 90]);
const tri: XY[] = [[0, 0], [140, 0], [20, 110]];

describe('chekinish: oʻtkir burchak va egri qirralar', () => {
  it('insetRobust — har nuqta chegaradan ≥ d, maydon oqilona', () => {
    const r = insetRobust(wedge, 6)!; expect(r).not.toBeNull();
    expect(area(r)).toBeGreaterThan(1500); expect(area(r)).toBeLessThan(area(wedge));
    expect(inset(wedge, 6)).not.toBeNull();   // generator chekinishi endi null emas
  });
  for (const [nm, ring] of [['oʻtkir burchak', wedge], ['egri burchak', fillet], ['uchburchak', tri]] as const)
    for (const u of ['ofis', 'savdo', 'mehmonxona']) it(`${nm}: ${u} joylashadi`, () => {
      const r = generate(ring as XY[], usePreset(u, DEFAULT_GEN) ?? DEFAULT_GEN);
      expect(r.sections.length, r.notes.join(' | ')).toBeGreaterThan(0);
    });
  for (const [nm, ring] of [['egri burchak', fillet], ['uchburchak', tri]] as const)
    for (const u of ['maktab', 'mtm', 'poliklinika'] as const) it(`${nm}: ${u} joylashadi`, () => {
      const a = area(ring as XY[]), cap = Math.max(40, Math.min(plotCapacity(u, a), 300));
      const sp = socialPlan(ring as XY[], u, cap, SOCIAL[u].modules[0].id, SOCIAL[u].m2, SOCIAL[u].floors, (ring as XY[]).map(() => 25));
      expect(sp.sections.length, sp.notes.join(' | ')).toBeGreaterThan(0);
    });
  it('ingichka uchburchak kvartal (190 × 71 m): maktab joylashadi', () => {
    const ring: XY[] = [[-150, -110], [40, -110], [40, -39], [-150, -105]];
    const sp = socialPlan(ring, 'maktab', 359, 'taroq', SOCIAL.maktab.m2, SOCIAL.maktab.floors, ring.map(() => 25));
    expect(sp.sections.length, sp.notes.join(' | ')).toBeGreaterThan(0);
  });
});

describe('24-band: oʻtkir burchakli kvartal — ustma-ust va uzilgan boʻlaklar yoʻq', () => {
  const overlap = (a: XY[], b: XY[]) => { try { return polygonClipping.intersection([[...a, a[0]]] as never, [[...b, b[0]]] as never).reduce((s, p) => s + area((p[0] as XY[]).slice(0, -1)), 0); } catch { return 0; } };
  const near = (a: XY[], b: XY[]) => a.some(p => b.some(q => Math.hypot(p[0] - q[0], p[1] - q[1]) < 1.5)) || overlap(a, b) > 0;
  for (const [nm, ring] of [['35°', [[0, 0], [160, 0], [0, 112]]], ['25°', [[0, 0], [180, 0], [0, 84]]], ['19°', [[0, 0], [220, 0], [0, 76]]], ['15°', [[0, 0], [250, 0], [0, 67]]]] as const)
    it(`${nm}: seksiyalar ustma-ust emas, uchida yakka orolcha qolmaydi`, () => {
      const r = generate(ring as unknown as XY[], DEFAULT_GEN), S = r.sections.map(s => s.ring);
      expect(S.length).toBeGreaterThan(3);
      for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) expect(overlap(S[i], S[j]), `${i}×${j}`).toBeLessThan(2);
      // har seksiya kamida bitta boshqasiga tegib turadi (bitta yoki ikkita uzluksiz qanot)
      for (let i = 0; i < S.length; i++) expect(S.some((o, j) => j !== i && near(S[i], o)), `seksiya ${i} yakka`).toBe(true);
    });
  it('35° uchburchak: qirralar boʻylab yopiq qurilish (avval uchida ikki seksiya ustma-ust tushardi)', () => {
    const r = generate([[0, 0], [160, 0], [0, 112]], DEFAULT_GEN);
    expect(r.sections.length).toBeGreaterThanOrEqual(8);
  });
});

describe('saytdagi qulash (25.10): egri qirrali kvartal — perimetr «inner[i] undefined»', () => {
  // haqiqiy Toshkent kvartali (Barselona toʻri + OSM yoʻli egri chetlari): insetRobust uchlarni tashlab yuborardi
  const curved: XY[] = [[64.22,7.5],[132.43,7.5],[132.43,8.39],[132.14,13.53],[131.76,18.73],[131.05,24.76],[130.23,31.13],[129.38,37.2],[128.36,42.81],[127.18,47.87],[125.64,53.03],[123.84,58.32],[122.03,63.02],[119.81,67.57],[117.33,72.01],[114.88,75.64],[112.08,79.02],[108.58,82.56],[104.39,86.33],[100.54,89.55],[64.98,113.68],[69.21,119.92],[64.22,119.92]];
  const slant: XY[] = [[-117.07,7.5],[-49.28,7.5],[-49.28,119.92],[-74.82,119.92],[-98.48,56.95],[-102.14,47.22]];
  for (const [nm, ring] of [['egri chet', curved], ['qiya', slant]] as const) it(`${nm}: qulamaydi, seksiyalar bor`, () => {
    for (const ty of ['perimetr', 'blok_minora', 'qatorlar'] as const) { const r = generate(ring as XY[], { ...DEFAULT_GEN, typology: ty, parking: 'yer_usti' }); expect(r.sections.length, ty).toBeGreaterThan(0); }
  });
});
