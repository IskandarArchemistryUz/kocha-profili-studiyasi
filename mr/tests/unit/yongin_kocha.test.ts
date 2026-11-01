import { describe, it, expect } from 'vitest';
import { landscape } from '../../src/core/landscape';
import { blankProject } from '../../src/core/doc';
import { frame, type XY } from '../../src/core/geo';

const rect = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const segD = (p: XY, a: XY, b: XY) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)); return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t); };
const pin = (p: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };

/** 01.11 (egasi): yongʻin-qutqaruv yoʻlagi doim koʻchaga ulanadi (koʻcha tomondan), koʻkalam yoki daraxtlarga borib tugamaydi */
describe('yongʻin yoʻlagi koʻchaga ulanadi', () => {
  const site = rect(0, 0, 200, 160);
  const mk = () => {
    const d = blankProject('t') as any, fr = frame(d.origin), G = (p: XY) => fr.toGeo(p);
    d.site = { rings: [site.map(G)] };
    // shimoliy va janubiy qatorlar, gʻarbiy va sharqiy qanotlar; burchaklarda 14 m oraliq
    const rs = [rect(8, 136, 100, 152), rect(102, 136, 192, 152), rect(8, 8, 100, 24), rect(102, 8, 192, 24), rect(8, 38, 24, 122), rect(176, 38, 192, 122)];
    d.buildings = rs.map((r, i) => ({ id: `b${i}`, footprint: r.map(G), floors: 12, nonRes: 0, use: 'turar' }));
    return d;
  };
  const y = landscape(mk()).find(q => q.fire);
  it('yoʻlak bor va har bir boʻlagi kvartal chetiga (koʻchaga) yetadi', () => {
    expect(y?.fire?.lane.length).toBeGreaterThan(0);
    for (const p of y!.fire!.lane) expect(Math.min(...p[0].map(q => Math.min(...site.map((a, i) => segD(q, a, site[(i + 1) % 4])))))).toBeLessThan(1.5);
  });
  it('burchak oraliqlaridan koʻchaga chiqish bor (gʻarb va sharq)', () => {
    const inLane = (q: XY) => y!.fire!.lane.some(p => pin(q, p[0]) && !p.slice(1).some(h => pin(q, h)));
    expect(inLane([4, 129]) || inLane([4, 15]) || inLane([16, 129]) || inLane([16, 31])).toBe(true);
    expect(inLane([196, 129]) || inLane([196, 31]) || inLane([184, 129]) || inLane([184, 31])).toBe(true);
  });
});
