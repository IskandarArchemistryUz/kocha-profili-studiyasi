import { describe, it, expect } from 'vitest';
import { lstDates, parseCmap, tileXY, loadLst, lstStats, type Px } from '../../src/joyshunos/heat';
import { shadowOf, shadowHull, sunPoints, sunStats, hull } from '../../src/joyshunos/sunmap';
import { daySteps, insolation, type Prism } from '../../src/core/sun';

const XML = `<ColorMaps><ColorMap><Entries>
<ColorMapEntry rgb="64,64,64" transparent="true" sourceValue="0" label="No Data"/>
<ColorMapEntry rgb="201,0,255" transparent="false" value="[0.02,200.00)"/>
<ColorMapEntry rgb="255,190,0" transparent="false" value="[312.80,313.40)"/>
<ColorMapEntry rgb="255,127,0" transparent="false" value="[324.80,325.40)"/>
</Entries></ColorMap></ColorMaps>`;

describe('Joyshunos · issiqlik oroli (MODIS LST)', () => {
  it('yozgi kompozit sanalari: yil kuni 1 + 8k, iyul–avgust', () => {
    const a = lstDates(new Date(Date.UTC(2026, 9, 18)));
    expect(a.year).toBe(2026); expect(a.dates[0]).toBe('2026-07-04'); expect(a.dates).toContain('2026-07-12'); expect(a.dates.length).toBe(6);
    expect(lstDates(new Date(Date.UTC(2026, 3, 1))).year).toBe(2025);
  });
  it('rang xaritasi: shaffof va chetki oraliqlar tashlanadi', () => {
    const m = parseCmap(XML);
    expect(m.size).toBe(2); expect(m.get((255 << 16) | (190 << 8))).toBeCloseTo(313.1, 1);
  });
  it('Toshkent z7 plitkasi 88/47', () => { const [x, y] = tileXY([69.28, 41.31], 7); expect(Math.floor(x)).toBe(88); expect(Math.floor(y)).toBe(47); });
  it('toʻr: plitka rangi → °C, markaz va atrof farqi', async () => {
    const m = parseCmap(XML);
    // chap yarmi 325 K (51,9 °C), oʻng yarmi 313 K (39,9 °C)
    const tile = (): Px => { const w = 256, d = new Uint8ClampedArray(w * w * 4); for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) { const o = (j * w + i) * 4, hot = i < 154; d[o] = 255; d[o + 1] = hot ? 127 : 190; d[o + 2] = 0; d[o + 3] = 255; } return { w, h: w, data: d }; };
    const g = await loadLst([69.28, 41.31], 3000, 250, m, async () => tile(), new Date(Date.UTC(2026, 9, 1)));
    expect(g.used).toBe(6); expect(g.n).toBe(25);
    const s = lstStats(g, 500);
    expect(s.inside).toBeGreaterThan(39); expect(s.inside).toBeLessThan(53);
    expect(Number.isFinite(s.delta)).toBe(true);
  });
});

describe('Joyshunos · quyosh va soya', () => {
  const box = (x: number, y: number, w: number, d: number, h: number): Prism => ({ ring: [[x, y], [x + w, y], [x + w, y + d], [x, y + d]], top: h });
  it('soya quyoshga teskari: janubdan (az 180°, 45°) — shimolga h uzunlikda', () => {
    const hl = shadowHull(box(0, 0, 10, 10, 20), 45, 180);
    expect(Math.max(...hl.map(p => p[1]))).toBeCloseTo(30, 5);
    expect(Math.min(...hl.map(p => p[1]))).toBeCloseTo(0, 5);
    expect(shadowOf(box(0, 0, 10, 10, 20), 45, 180).length).toBe(5);
    expect(shadowOf(box(0, 0, 10, 10, 20), -2, 180).length).toBe(0);
    expect(hull([[0, 0], [1, 0], [0.5, 0.2], [1, 1], [0, 1]]).length).toBe(4);
  });
  it('bino ichidagi nuqtalar chiqariladi; baland bino shimolida quyosh kam', () => {
    const pr = [box(-20, -20, 40, 40, 60)];
    const sp = sunPoints(pr, 150, 10);
    expect(sp.pts.some(p => Math.abs(p[0]) < 15 && Math.abs(p[1]) < 15)).toBe(false);
    const steps = daySteps(2026, 3, 22, 41.31, 69.28, 20), hrs = insolation(sp.pts, sp.pts.map(() => 0), pr, steps);
    const at = (x: number, y: number) => { let b = 0, bd = Infinity; sp.pts.forEach((p, i) => { const d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; b = i; } }); return hrs[b]; };
    expect(at(0, 30)).toBeLessThan(at(0, -30));
    const st = sunStats(sp.pts, hrs);
    expect(st.ge05).toBeGreaterThanOrEqual(st.ge1); expect(st.mean).toBeGreaterThan(5);
  });
});
