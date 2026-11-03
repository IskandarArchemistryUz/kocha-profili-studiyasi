import { describe, it, expect } from 'vitest';
import { aptInterior, normViol, roomWidth, NORM } from '../../src/core/aptplan';
import { rulePlan, TORETS_MIN, type RuleApt, type FacadeMod } from '../../src/core/sectionplan';
import { layoutSection } from '../../src/core/apartments';
import { obb2 } from '../../src/core/geo';
import { area, type XY } from '../../src/core/geo';

/**
 * 3.11 (egasi, 3-bino 2-qavat skrinshoti: «odatda yashash xonalarida bunday boʻlishi kerak emas»): 3,66 m enli, butun bino
 * chuqurligi boʻylab (12,6 m) torets kvartirasi uzunasiga ikki tasmaga boʻlinib, 1,6 m enli 11 m uzun «xona», 10 m² kiyimxona
 * va 9 m² sanuzel chiqardi. Meʼyorlar: ShNQ 2.08.01-24, 35-band (maydonlar), 36-band (yotoqxona eni ≥ 2,4 m, umumiy xona ≥ 3 m);
 * SanQvaN 0102-25, 97-band (bir tomonlama yoritilgan xona chuqurligi ≤ 6 m).
 */
const LIVE = new Set(['umumiy', 'xona', 'yotoq', 'master']);
/** to'g'ri to'rtburchak kvartira: W (x bo'ylab) × D (y bo'ylab); fasadlar — derazali modullar */
function apt(W: number, D: number, rooms: number, facades: ('S' | 'N' | 'W')[], door: XY, mw = 3.3): { a: RuleApt; mods: FacadeMod[] } {
  const mods: FacadeMod[] = [];
  const line = (p: XY, q: XY, az: number) => { const L = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.max(1, Math.round(L / mw)); for (let i = 0; i < n; i++) mods.push({ a: [p[0] + (q[0] - p[0]) * i / n, p[1] + (q[1] - p[1]) * i / n], b: [p[0] + (q[0] - p[0]) * (i + 1) / n, p[1] + (q[1] - p[1]) * (i + 1) / n], az, blind: false }); };
  if (facades.includes('S')) line([0, 0], [W, 0], 180);
  if (facades.includes('N')) line([W, D], [0, D], 0);
  if (facades.includes('W')) line([0, D], [0, 0], 270);
  const ring: XY[] = [[0, 0], [W, 0], [W, D], [0, D]];
  return { a: { rooms, ring, area: W * D, door, doorLen: 1.6, mods: mods.map((_, i) => i), wet: [], walls: [], wing: 0, sec: 0 }, mods };
}
function check(a: RuleApt, mods: FacadeMod[]) {
  const I = aptInterior(a, mods);
  expect(I).not.toBeNull();
  const v = normViol(I!, a, mods);
  // qatʼiy bandlar (ogʻirligi ≥ 4): yashash xonasi eni / maydoni / chuqurligi, dahliz, oshxona, sanuzel va kiyimxona oʻlchami
  expect(v.filter(x => x[0] >= 4).map(x => x[1])).toEqual([]);
  for (const q of I!.rooms) {
    const w = roomWidth(q.ring);
    if (q.kind === 'umumiy' || q.kind === 'xona') expect(w).toBeGreaterThanOrEqual(NORM.liveW - 0.02);
    if (q.kind === 'yotoq' || q.kind === 'master') expect(w).toBeGreaterThanOrEqual(NORM.bedW - 0.02);
    if (q.kind === 'sanuzel') expect(area(q.ring)).toBeLessThanOrEqual(7.5);
    if (q.kind === 'garderob') expect(area(q.ring)).toBeLessThanOrEqual(6.5);
  }
  expect(I!.rooms.some(q => LIVE.has(q.kind))).toBe(true);
  return I!;
}

describe('kvartira rejasi meʼyorlarga mos (3.11)', () => {
  it('3,66 m enli torets kvartirasi (uch fasad, eshik yon devorda): xona butun eni boʻylab fasadda, chuqurligi ≤ 6 m', () => {
    for (const rooms of [1, 2]) {
      const { a, mods } = apt(3.66, 12.6, rooms, ['S', 'N', 'W'], [3.66, 6.3]);
      const I = check(a, mods);
      const liv = I.rooms.filter(q => LIVE.has(q.kind));
      // xona fasadga tik emas — eni kvartira eni (3,66 m) boʻylab
      for (const q of liv) expect(roomWidth(q.ring)).toBeGreaterThan(3.3);
    }
  });
  it('3,66 m enli ikki fasadli (oʻrta) kvartira ham', () => {
    const { a, mods } = apt(3.66, 12.6, 1, ['S', 'N'], [3.66, 6.3]);
    check(a, mods);
  });
  it('bir fasadli chuqur (8 m) kvartiralar: umumiy xona va yotoqlar chuqurligi ≤ 6 m', () => {
    for (const [W, rooms] of [[7.2, 1], [9.9, 2], [13.2, 3], [16.5, 4]] as [number, number][]) {
      const { a, mods } = apt(W, 8.0, rooms, ['S'], [W * 0.45, 8.0]);
      const I = check(a, mods);
      expect(I.kFit ?? rooms).toBe(rooms);
    }
  });
  it('normViol: 1,6 m enli 11 m uzun «xona» — 36-band buzilishi aniqlanadi', () => {
    const { a, mods } = apt(3.66, 12.6, 1, ['S', 'N', 'W'], [3.66, 6.3]);
    const bad = { rooms: [{ ring: [[0, 0.8], [1.66, 0.8], [1.66, 12.6], [0, 12.6]] as XY[], kind: 'xona' as const, area: 18.7, wet: false }], walls: [], doors: [], entry: [3.66, 6.3] as XY, master: false };
    expect(normViol(bad, a, mods).some(x => x[1].startsWith('36-band'))).toBe(true);
  });
  it('qisqa seksiya (L < 24 m, ikki tomonlama): torets kvartirasi eni ≥ TORETS_MIN, yashash xonalari ≥ 3,0 / 2,4 m', () => {
    let n = 0, tor = 0;
    for (const L of [18, 20.5, 22.7, 23.5]) for (const S of [12.6, 14, 15]) for (const mix of [[40, 40, 20, 0], [20, 40, 30, 10]]) {
      const r: XY[] = [[0, 0], [L, 0], [L, S], [0, S]], mods = layoutSection(r, () => false).mods, pl = rulePlan(r, mods, mix, 'M');
      for (const a of pl.apts) {
        const ys = a.ring.map(p => p[1]);
        if (Math.min(...ys) < 0.3 && Math.max(...ys) > S - 0.3) { tor++; expect(obb2(a.ring).S).toBeGreaterThanOrEqual(Math.min(TORETS_MIN, (S - 1.6) / 2) - 0.25); }
        const I = aptInterior(a, mods); if (!I) continue; n++;
        for (const q of I.rooms) {
          if (q.kind === 'umumiy' || q.kind === 'xona') expect(roomWidth(q.ring)).toBeGreaterThanOrEqual(NORM.liveW - 0.02);
          if (q.kind === 'yotoq' || q.kind === 'master') expect(roomWidth(q.ring)).toBeGreaterThanOrEqual(NORM.bedW - 0.02);
        }
      }
    }
    expect(tor).toBeGreaterThan(10); expect(n).toBeGreaterThan(50);
  }, 120_000);
});
