import { describe, it, expect } from 'vitest';
import { attachLeft, placements, type Paginated, type Material, type Fill } from '../../src/chizmadon/autolayout';
import { legendStrip } from '../../src/chizmadon/album';

const M = (id: string, role: Material['role']): Material => ({ id, role, name: id, title: id, visible: true, accent: null, scale: 1 });
const page = (slots: number) => ({ id: 'p', title: 'p', slots: Array.from({ length: slots }, () => ({ role: 'figure', c: 1, r: 1, cs: 4, rs: 4 })) }) as never;

describe('06.11: «Shartli belgilar» joy topmasa — tushuntiradigan materialga biriktiriladi', () => {
  it('joysiz legenda joylashuv xaritasi katagiga biriktiriladi va «N-varaqda» boʻladi', () => {
    const loc = M('loc0', 'locator'), plan = M('p:plan', 'plan'), leg = M('legend', 'legend');
    const f1: Fill = { page: page(1), assign: new Map([[0, plan]]), empty: new Set(), used: new Set(), score: 0 };
    const f2: Fill = { page: page(1), assign: new Map([[0, loc]]), empty: new Set(), used: new Set(), score: 0 };
    const PG: Paginated = { pages: [f1, f2], left: [leg], titleEl: null };
    attachLeft(PG);
    expect(PG.left).toHaveLength(0); expect(f2.att?.get(0)?.id).toBe('legend'); expect(placements(PG).legend).toEqual({ pi: 1, k: 0 });
  });
  it('mos material yoʻq — joysiz qoladi', () => {
    const PG: Paginated = { pages: [{ page: page(1), assign: new Map([[0, M('t', 'table')]]), empty: new Set(), used: new Set(), score: 0 }], left: [M('legend', 'legend')], titleEl: null };
    attachLeft(PG); expect(PG.left).toHaveLength(1);
  });
  it('tasma katak ichida, material bilan kesishmaydi', () => {
    for (const r of [{ x: 0, y: 0, w: 200, h: 100 }, { x: 5, y: 5, w: 80, h: 160 }]) {
      const { rest, leg } = legendStrip(r, 1);
      const ix = Math.max(0, Math.min(rest.x + rest.w, leg.x + leg.w) - Math.max(rest.x, leg.x)) * Math.max(0, Math.min(rest.y + rest.h, leg.y + leg.h) - Math.max(rest.y, leg.y));
      expect(ix).toBe(0); expect(leg.x + leg.w).toBeLessThanOrEqual(r.x + r.w + 1e-9); expect(leg.y + leg.h).toBeLessThanOrEqual(r.y + r.h + 1e-9);
    }
  });
});
