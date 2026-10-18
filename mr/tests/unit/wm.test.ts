import { describe, it, expect } from 'vitest';
import { wmSvg, wmDxf } from '../../src/core/wm';

describe('setkasimon belgi', () => {
  it('SVG: viewBox boʻyicha yozuvlar toʻri, ikki marta qoʻyilmaydi', () => {
    const s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 297"><rect width="10" height="10"/></svg>';
    const w = wmSvg(s);
    expect(w).toContain('id="99_Archemistry_belgi"');
    expect((w.match(/<text /g) ?? []).length).toBeGreaterThan(10);
    expect(w.endsWith('</svg>')).toBe(true);
    expect(wmSvg(w)).toBe(w);
  });
  it('SVG: oʻlchami yoʻq boʻlsa — oʻzgarmaydi', () => { expect(wmSvg('<svg></svg>')).toBe('<svg></svg>'); });
  it('DXF: ENTITIES oxiriga ARCHEMISTRY_BELGI qatlamida TEXT', () => {
    const d = ['0', 'SECTION', '2', 'ENTITIES', '0', 'LINE', '8', 'A', '10', '0', '20', '0', '30', '0', '11', '500', '21', '300', '31', '0', '0', 'ENDSEC', '0', 'EOF'].join('\n');
    const w = wmDxf(d);
    expect(w).toContain('ARCHEMISTRY_BELGI');
    const L = w.split('\n');
    expect(L.indexOf('ENDSEC')).toBeGreaterThan(L.lastIndexOf('ARCHEMISTRY_BELGI'));
    expect(L.at(-1)).toBe('EOF');
  });
});
