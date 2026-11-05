import { describe, it, expect } from 'vitest';
import { edgeHeights, boundaryNeed, insetVar } from '../../src/core/setback';
import { generate, DEFAULT_GEN } from '../../src/core/generator';
import { area, type XY } from '../../src/core/geo';

const sq = (w: number, h: number): XY[] => [[0, 0], [w, 0], [w, h], [0, h]];
const rect = (x: number, y: number, w: number, h: number): XY[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

describe('05.11: chekinish har qirrada shu qirradagi seksiya balandligidan (79-band, 2-jadval, 1-izoh)', () => {
  it('edgeHeights: har qirra uchun unga qaragan seksiyalarning eng balandi; qaragan seksiya yoʻq — null', () => {
    const ring = sq(100, 80);
    // janub qirrasi (y = 0) oldida 6 qavat (18 m), shimol (y = 80) oldida 12 qavat (36 m), sharq (x = 100) — hech narsa
    const secs = [{ ring: rect(10, 5, 60, 15), H: 18 }, { ring: rect(10, 60, 60, 15), H: 36 }, { ring: rect(5, 25, 15, 30), H: 27 }];
    const h = edgeHeights(ring, secs, 8);
    expect(h[0]).toBe(18);     // janub
    expect(h[1]).toBeNull();   // sharq
    expect(h[2]).toBe(36);     // shimol
    expect(h[3]).toBe(27);     // gʻarb
  });
  it('edgeHeights: faqat burchagi tegib oʻtgan seksiya (proyeksiya < 2 m) hisobga olinmaydi', () => {
    expect(edgeHeights(sq(100, 80), [{ ring: rect(-30, 2, 31, 10), H: 30 }], 8)[0]).toBeNull();   // proyeksiya 0…1 m
    expect(edgeHeights(sq(100, 80), [{ ring: rect(-30, 2, 40, 10), H: 30 }], 8)[0]).toBe(30);     // 0…10 m
  });
  it('qatorlar: janub qatori past (6 qavat), shimol 12 — janub chekinishi kichik, qurilish halqasi kattaroq', () => {
    const ring = sq(140, 160);
    const r = generate(ring, { ...DEFAULT_GEN, typology: 'qatorlar', maxF: 12, minF: 6, setback: 9, seismic: 7 });
    expect(r.sections.length).toBeGreaterThan(1);
    // janubdagi qatorni 6 qavatga tushiramiz (generator «janub pastroq» qarori yoki facingCap natijasi kabi)
    const yc = (s: XY[]) => s.reduce((t, p) => t + p[1], 0) / s.length, ymin = Math.min(...r.sections.map(s => yc(s.ring)));
    const ymax = Math.max(...r.sections.map(s => yc(s.ring))); expect(ymax - ymin).toBeGreaterThan(20);
    const secs = r.sections.map(s => ({ ring: s.ring, H: (yc(s.ring) - ymin < 1 ? 6 : 12) * 3 }));
    const h = edgeHeights(ring, secs, 9 + 1.5);
    expect(h[0]).toBe(18); expect(h[2]).toBe(36);
    const d = h.map(x => boundaryNeed('kocha', x ?? 36, true, 0));
    expect(d[0]).toBeLessThan(d[2]);
    expect(area(insetVar(ring, d)!)).toBeGreaterThan(area(insetVar(ring, h.map(() => 9))!));
  });
});
