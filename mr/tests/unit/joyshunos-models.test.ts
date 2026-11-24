import { describe, it, expect } from 'vitest';
import { walkNet, reach, flow, flowAt, noiseGrid, noiseAt, noiseShare, WALK, type Road } from '../../src/joyshunos/models';

/** 100 m qadamli toʻgʻri toʻr, ±L */
function gridRoads(L = 1000, step = 100, cls = 'residential'): Road[] {
  const r: Road[] = [];
  for (let v = -L; v <= L; v += step) { r.push({ cls, pts: [[-L, v], [L, v]] }); r.push({ cls, pts: [[v, -L], [v, L]] }); }
  // har kesishmada tugun boʻlishi uchun qirralarni boʻlamiz
  return r.flatMap(x => { const out: Road[] = []; const [a, b] = x.pts; const n = Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step); for (let i = 0; i < n; i++) out.push({ cls: x.cls, pts: [[a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n], [a[0] + (b[0] - a[0]) * (i + 1) / n, a[1] + (b[1] - a[1]) * (i + 1) / n]] }); return out; });
}

describe('Joyshunos · tarmoq modellari', () => {
  it('piyoda yetish: oraliqlar oʻsadi, toʻrda toʻgʻrilik ≈ 0,7–0,85', () => {
    const net = walkNet(gridRoads()), R = reach(net);
    expect(R.area[0]).toBeLessThan(R.area[1]); expect(R.area[1]).toBeLessThan(R.area[2]);
    expect(R.km[2]).toBeGreaterThan(R.km[0]);
    // 5 daqiqa (415 m) — toʻr boʻylab «olmos» shakl: maydon 2·(415+40)² atrofida
    expect(R.area[0]).toBeGreaterThan(2 * 415 * 415 * 0.8); expect(R.area[0]).toBeLessThan(2 * 460 * 460 * 1.3);
    expect(R.directness!).toBeGreaterThan(0.65); expect(R.directness!).toBeLessThan(0.9);
    expect(Math.max(...Array.from(R.D).filter(Number.isFinite))).toBeLessThanOrEqual(15 * WALK + 50 + 100);
  });
  it('avtomagistral piyoda tarmogʻiga kirmaydi', () => {
    const net = walkNet([{ cls: 'motorway', pts: [[0, 0], [500, 0]] }, { cls: 'footway', pts: [[0, 0], [0, 300]] }]);
    expect(net.segs.length).toBe(1);
  });
  it('odamlar oqimi: markaziy qirralar chetdagilardan kuchliroq, qiymatlar 0..1', () => {
    const net = walkNet(gridRoads(600)), F = flow(net, 500, [{ p: [0, 0], w: 30 }], 80, 700);
    expect(Math.max(...F)).toBeLessThanOrEqual(1); expect(Math.min(...F)).toBeGreaterThanOrEqual(0);
    const at = (x: number, y: number) => { let best = 0, bd = Infinity; net.segs.forEach(([a, b], s) => { const m = [(net.xy[a][0] + net.xy[b][0]) / 2, (net.xy[a][1] + net.xy[b][1]) / 2]; const d = Math.hypot(m[0] - x, m[1] - y); if (d < bd) { bd = d; best = F[s]; } }); return best; };
    expect(at(50, 0)).toBeGreaterThan(at(550, 550));
    expect(flowAt(net, F)).toBeGreaterThan(0.3);
  });
  it('shovqin: yoʻl yonida baland, uzoqlashganda pasayadi (≈ 3 dB / ikki baravar)', () => {
    const road: Road[] = [{ cls: 'primary', pts: [[-2000, 0], [2000, 0]] }];
    const g = noiseGrid(road, 400, 10), at = (y: number) => g.v[Math.round((y + 400) / 10) * g.n + 40];
    expect(at(10)).toBeGreaterThan(69); expect(at(10)).toBeLessThan(72);   // 71 dB(A) 10 m da (qirra 300 m bilan cheklangan)
    expect(at(20) - at(40)).toBeGreaterThan(2.3); expect(at(20) - at(40)).toBeLessThan(3.7);
    expect(noiseAt(g)).toBeGreaterThan(70);
    expect(noiseShare(g, 65)).toBeGreaterThan(0); expect(noiseShare(g, 65)).toBeLessThan(0.3);
  });
  it('shovqin: magistraldan 300 m narida ham kesilmaydi (24.11) — 3 dB / ikki baravar davom etadi', () => {
    const at = (d: number, cls = 'trunk') => noiseAt(noiseGrid([{ cls, pts: [[-d, -3000], [-d, 3000]] }], 100, 50));
    expect(at(200)).toBeGreaterThan(60); expect(at(200)).toBeLessThan(62);
    expect(at(200) - at(400)).toBeGreaterThan(2.5); expect(at(200) - at(400)).toBeLessThan(3.5);   // avval: 60,8 → 35
    expect(at(800)).toBeGreaterThan(53);
    expect(at(600, 'motorway')).toBeGreaterThan(at(600));   // avtomagistral — eng kuchli manba
    expect(at(600, 'residential')).toBe(35);
    // uzoq maydon (katakka jamlangan) aniq formulaga mos: 6 km lik toʻgʻri yoʻl uchun analitik qiymat (2·atan(3000/d)/π · P/d)
    const exact = (d: number) => 10 * Math.log10(2 * Math.atan(3000 / d) / Math.PI * Math.pow(10, 7.4) * 10 / d);
    for (const d of [200, 450, 900, 1500]) expect(Math.abs(at(d) - exact(d))).toBeLessThan(0.15);
  });
});
