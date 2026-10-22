import { describe, it, expect } from 'vitest';
import { projectStreetsGeo } from '../../src/scene/streets3d';
import type { XY } from '../../src/core/geo';

/** Katta uchastka + atrofdagi minglab OSM yoʻl: uzoq yoʻllar natijani oʻzgartirmaydi va hisobni sekinlashtirmaydi */
describe('koʻcha geometriyasi — atrof yoʻllari koʻp boʻlganda', () => {
  const parts = [{ k: 'trotuar', w: 2.25 }, { k: 'yashil', w: 2 }, { k: 'qatnov', w: 7, lanes: 2 }, { k: 'yashil', w: 2 }, { k: 'trotuar', w: 2.25 }] as never;
  const list: { id: string; axis: XY[]; parts: never }[] = [];
  for (let i = 0; i <= 6; i++) { list.push({ id: 'v' + i, axis: [[i * 120, -10], [i * 120, 730]], parts }); list.push({ id: 'h' + i, axis: [[-10, i * 120], [730, i * 120]], parts }); }
  // yaqin: uchastka atrofidagi 4 yoʻl; uzoq: 3 km doirada 3000 ta qisqa yoʻl (uchastkadan 200 m dan nari)
  const near = [[[-40, -40], [760, -40]], [[760, -40], [760, 760]], [[760, 760], [-40, 760]], [[-40, 760], [-40, -40]]].map(p => ({ pts: p as XY[], cls: 'secondary', w: 12 }));
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const far: typeof near = [];
  while (far.length < 3000) { const x = -1500 + rnd() * 3700, y = -1500 + rnd() * 3700; if (x > -260 && x < 980 && y > -260 && y < 980) continue; const a = rnd() * Math.PI; far.push({ pts: [[x, y], [x + Math.cos(a) * 80, y + Math.sin(a) * 80], [x + Math.cos(a) * 160, y + 20]], cls: 'residential', w: 7 }); }
  it('uzoq yoʻllar qoʻshilsa natija aynan bir xil va tez', () => {
    const a = projectStreetsGeo(list, () => 0, near);
    const t0 = performance.now(); const b = projectStreetsGeo(list, () => 0, [...near, ...far]); const ms = performance.now() - t0;
    expect(b.trees).toEqual(a.trees);
    expect(b.red).toEqual(a.red);
    expect(Object.keys(b.layers).sort()).toEqual(Object.keys(a.layers).sort());
    for (const k in a.layers) expect(b.layers[k]).toEqual(a.layers[k]);
    expect(ms).toBeLessThan(3000);
  });
});
