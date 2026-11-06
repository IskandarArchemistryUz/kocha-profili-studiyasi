import { describe, it, expect } from 'vitest';
import type { Limit } from '../../src/core/limits';
import { szzBelt } from '../../src/core/szzgen';
import { blankProject } from '../../src/core/doc';
import { apply } from '../../src/core/commands';
import { RULES } from '../../src/norms/rules';
import { frame, type XY } from '../../src/core/geo';

/** 06.11 — bekor qilingan SanPiN RUz № 0350-17, 2.19 (AMALIYOT; c61 — sozlama, sukut oʻchiq): daraxt-buta tasmasi ≥ 50 m (zona ≤ 100 m — ≥ 20 m) */
const sq = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const rule = RULES.find(r => r.id === 'szz-belt')!;
/** qabriston 40 × 40 (IV sinf, SMZ 100 m) markazda; uchastka 600 × 600; turar joy kvartali; ixtiyoriy himoya parseli (halqa eni w) */
const mk = (use = 'turar', w = 0) => {
  let d = blankProject('t') as any; const fr = frame(d.origin), G = (p: XY) => fr.toGeo(p);
  d.site = { rings: [sq(-300, -300, 300, 300).map(G)] };
  d = apply(d, { type: 'addLimit', limit: { id: 'q1', kind: 'qabriston', status: 'saqlanadi', src: 'qolda', rings: [sq(-20, -20, 20, 20).map(G)], sub: { open: false } } as Limit } as any);   // yopiq — 100 m (VM 101)
  d = apply(d, { type: 'setZones', zones: [{ id: 'z0', at: G([250, 250]), use }] } as any);
  if (w > 0) {
    // kvartal parsellari: kvadrat halqa (120 − w … 120 m) — himoya; SMZ burchaklari dumaloq, shuning uchun 20 m tasmani toʻliq qoplash uchun w ≈ 46
    const R = 120, r0 = R - w, outer = sq(-R, -R, R, R), inner = sq(-r0, -r0, r0, r0);
    d = apply(d, { type: 'setParcels', block: 'z0', label: d.zones[0], parcels: [
      { id: 'p1', rings: [outer.map(G), inner.map(G)], use: 'himoya' },
      { id: 'p2', rings: [inner.map(G)], use: 'turar' },
      { id: 'p3', rings: [sq(-300, -300, 300, 300).map(G), [...outer].reverse().map(G)], use: 'turar' },
    ] } as any);
  }
  d.settings = { ...d.settings, szzBelt: true };
  return d;
};

describe('szzBelt — 2.19 daraxt-buta tasmasi', () => {
  it('SMZ 100 m → kerakli en 20 m; koʻkalam yoʻq — fail, Tuzat bor', () => {
    const b = szzBelt(mk()); expect(b).toHaveLength(1); expect(b[0].need).toBe(20); expect(b[0].width).toBe(0);
    const r = rule.evaluate({} as any, mk()); expect(r.status).toBe('review'); expect(r.fix?.id).toBe('szz-belt'); expect(r.note).toContain('AMALIYOT');
  });
  it('sozlama oʻchiq (sukut) — baholanmaydi, izohda 0103-25', () => {
    const d = mk(); d.settings = { ...d.settings, szzBelt: undefined };
    const r = rule.evaluate({} as any, d); expect(r.status).toBe('na'); expect(r.note).toContain('0103-25'); expect(r.fix).toBeUndefined();
  });
  it('turar joy yoʻq (ofis) — na', () => {
    expect(rule.evaluate({} as any, mk('ofis')).status).toBe('na');
  });
  it('SMZ tashqi qismi (dumaloq burchaklar bilan) himoya — pass; 10 m — fail, eng tor eni < 20 m', () => {
    const ok = mk('turar', 46); expect(rule.evaluate({} as any, ok).status).toBe('pass'); expect(szzBelt(ok)[0].width).toBe(20);
    const half = mk('turar', 10), b = szzBelt(half)[0];
    expect(rule.evaluate({} as any, half).status).toBe('review'); expect(b.width).toBeLessThan(20); expect(b.miss).toBeGreaterThan(100);
  });
});
