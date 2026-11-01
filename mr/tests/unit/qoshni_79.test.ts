import { describe, it, expect } from 'vitest';
import { RULES } from '../../src/norms/rules';
import { derive } from '../../src/core/derive';
import { blankProject, migrate } from '../../src/core/doc';

import { frame, type XY } from '../../src/core/geo';

const rect = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
/** ShNQ 2.07.01-23, 79-band, 2-jadval: qoʻshni taraf hudud chegarasigacha — derazali uzun tarz H × kʏ / 2, yon tarz H × 0,25 (≥ 6 m) */
describe('qoʻshni chegara (79-band)', () => {
  const mk = (edges?: 'kocha' | 'qoshni', x0 = 80) => {
    const d = blankProject('t') as any, fr = frame(d.origin), G = (p: XY) => fr.toGeo(p);
    d.site = { rings: [rect(-100, -60, 100, 60).map(G)] };
    d.buildings = [{ id: 'a', footprint: rect(x0, -25, x0 + 15, 25).map(G), floors: 16, nonRes: 0, use: 'turar' }];
    if (edges) d.siteEdges = edges;
    return d;
  };
  const run = (d: any) => RULES.find(r => r.id === 'qoshni-79')!.evaluate(derive(d), d);
  it('chetlar «koʻcha» — qoʻllanmaydi', () => { expect(run(mk()).status).toBe('na'); expect(run(mk('kocha')).status).toBe('na'); });
  it('16 qavat, uzun tarz chegaraga 5 m — mos emas (H × 1,2 / 2 ≈ 31,7 m)', () => { const r = run(mk('qoshni')); expect(r.status).toBe('fail'); expect(r.where?.need?.labels?.[0].text).toMatch(/^5 → 31,7 m$/); });
  it('chegaradan 35 m — mos', () => { expect(run(mk('qoshni', 50)).status).toBe('pass'); });
  it('siteEdges va ctxUse saqlanadi (migrate)', () => {
    const d = migrate({ ...mk('qoshni'), ctxUse: { 12: 'noturar', 13: 'xato' } });
    expect(d.siteEdges).toBe('qoshni'); expect(d.ctxUse).toEqual({ 12: 'noturar' });
  });
});
