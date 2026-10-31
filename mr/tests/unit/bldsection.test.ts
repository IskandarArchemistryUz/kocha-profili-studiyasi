import { describe, it, expect } from 'vitest';
import { buildingSection } from '../../src/core/bldsection';
import type { XY } from '../../src/core/geo';
const R = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

describe('Bino kesimi va tush payti quyoshi (31.10)', () => {
  it('Toshkent (41,3°): 22.03 balandlik ≈ 48,7°, 22.12 ≈ 25,3°; janubdagi binodan soya balandligi; 2·H masofa', () => {
    // seksiya sharq–gʻarb boʻylab (uzun oʻq x), janubida 30 m balandlikdagi bino 40 m uzoqda
    const sel = { ring: R(0, 0, 60, 15), h: 27, floors: 9, fh: 3 }, south = { ring: R(0, -55, 60, -40), h: 30 }, north = { ring: R(0, 45, 60, 60), h: 9 };
    const r = buildingSection(sel, [south, north], { lat: 41.3, title: 'T' });
    const mar = r.suns.find(s => s.date.startsWith('22.03'))!, dec = r.suns.find(s => s.date === '22.12')!;
    expect(mar.alt).toBeCloseTo(48.7, 1); expect(dec.alt).toBeCloseTo(25.26, 1);
    expect(mar.app).toBeCloseTo(48.7, 1);   // kesim aynan janub–shimol
    // soya: 30 − 40·tan(48,7°) < 0 → 0; dekabrda 30 − 40·tan(25,3°) ≈ 11,1 m
    expect(mar.shadeZ).toBe(0); expect(dec.shadeZ!).toBeCloseTo(11.1, 0);
    const s = r.gaps.find(g => g.side < 0)!, n = r.gaps.find(g => g.side > 0)!;
    expect(s.d).toBeCloseTo(40, 3); expect(s.ok).toBe(false);   // 2 · 27 = 54 > 40
    expect(n.d).toBeCloseTo(30, 3); expect(n.need).toBe(18); expect(n.ok).toBe(true);
    expect(r.svg).toContain('H 27 m');
  });
  it('yopishgan seksiya qarama-qarshi bino emas: masofa zanjir chetidan oʻlchanadi', () => {
    // tanlangan seksiya 0..15 (shimolga), unga yopishgan davomi 15..30, keyin 25 m hovli, qarshida bino 55..70
    const sel = { ring: R(0, 0, 40, 15), h: 24, floors: 8, fh: 3 }, att = { ring: R(0, 15, 40, 30), h: 24, floors: 8, fh: 3 }, opp = { ring: R(0, 55, 40, 70), h: 24 };
    // burchak: sharqqa ham 40 m qanot yopishgan — kesim qisqa zanjir (shimol) boʻylab qoladi
    const east = { ring: R(40, 0, 80, 15), h: 24 };
    const r = buildingSection(sel, [att, opp, east], { lat: 41.3, title: 'T' });
    const n = r.gaps.find(g => g.side > 0)!;
    expect(r.gaps.length).toBe(1); expect(n.d).toBeCloseTo(25, 3); expect(n.need).toBe(48); expect(n.ok).toBe(false);
    // yakka yopishgan qism uzun oʻq boʻylab boʻlmasa — kesim boshqa oʻqqa oʻtadi va qarama-qarshi bino koʻrinmaydi
    expect(buildingSection(sel, [att, opp], { lat: 41.3, title: 'T' }).gaps.length).toBe(0);
  });
});
