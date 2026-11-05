import { describe, it, expect } from 'vitest';
import { stripSections } from '../../src/core/stripline';
import { signedArea, type XY } from '../../src/core/geo';

const A = (r: XY[]) => Math.abs(signedArea(r));
const near = (a: XY, b: XY) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6;
/** ikki halqa umumiy qirraga egami (ikkala uchi mos) */
const shares = (a: XY[], b: XY[]) => a.some((p, i) => { const q = a[(i + 1) % a.length]; return b.some((x, j) => { const y = b[(j + 1) % b.length]; return (near(p, x) && near(q, y)) || (near(p, y) && near(q, x)); }); });

describe('chiziq boʻylab seksiyalar (stripline)', () => {
  it('toʻgʻri chiziq — bitta toʻrtburchak D × L', () => {
    const r = stripSections([[0, 0], [40, 0]], 15);
    expect(r.err).toBeUndefined(); expect(r.rings).toHaveLength(1); expect(A(r.rings[0])).toBeCloseTo(600, 3);
  });
  it('L-chiziq — ikki seksiya miter burchak bilan, umumiy devor', () => {
    const r = stripSections([[0, 0], [40, 0], [40, 30]], 15);
    expect(r.rings).toHaveLength(2);
    expect(shares(r.rings[0], r.rings[1])).toBe(true);
    // umumiy maydon = oʻq uzunligi × D (miter burchakda yoʻqotishsiz)
    expect(A(r.rings[0]) + A(r.rings[1])).toBeCloseTo(70 * 15, 3);
  });
  it('uzun segment maxLen boʻyicha teng boʻlaklarga, umumiy devorli', () => {
    const r = stripSections([[0, 0], [90, 0]], 15, 30);
    expect(r.rings).toHaveLength(3);
    expect(shares(r.rings[0], r.rings[1]) && shares(r.rings[1], r.rings[2])).toBe(true);
    r.rings.forEach(x => expect(A(x)).toBeCloseTo(450, 3));
  });
  it('oʻtkir burchak (< 30°) — xato', () => {
    const r = stripSections([[0, 0], [40, 0], [0, 5]], 15);
    expect(r.err).toContain('30');
  });
  it('bir chiziqdagi oraliq nuqta olib tashlanadi', () => {
    expect(stripSections([[0, 0], [20, 0], [40, 0]], 15).rings).toHaveLength(1);
  });
});
