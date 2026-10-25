import { describe, it, expect } from 'vitest';
import { LAYOUTS } from '../../src/chizmadon/layouts';
import { renderLayoutPage, LAYOUT_LIB, LAYOUT_PAL } from '../../src/chizmadon/render';
import { frame, rect } from '../../src/chizmadon/sheet';
import { layoutFrame, slotRect } from '../../src/chizmadon/layouts';

describe('Chizmadon — varaq dvigateli (7 oila)', () => {
  it('7 oila × hamma format × hamma varaq: SVG xatosiz, NaN yoʻq, oʻlcham mm da', () => {
    let n = 0;
    for (const f of LAYOUTS.families) for (const fmt of f.formats) for (const [i, p] of f.pages.entries()) {
      const { svg, fr } = renderLayoutPage(LAYOUT_LIB, f, p, fmt, { pal: f.pal ?? 'arch', idx: i, total: f.pages.length });
      expect(svg, `${f.id}/${p.id}/${fmt}`).not.toMatch(/NaN|undefined|Infinity/);
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg).toContain(`width="${Math.round(LAYOUTS.formats[fmt].w * 100) / 100}mm"`);
      expect(fr.W).toBe(LAYOUTS.formats[fmt].w); n++;
    }
    expect(n).toBeGreaterThan(150);
  });
  it('belgi rejimi (kirish oynasi): namuna oʻrniga rol nomi va piktogramma', () => {
    const f = LAYOUTS.families.find(x => x.id === 'mr')!, p = f.pages.find(x => x.id === 'mr-map-l')!;
    const { svg } = renderLayoutPage(LAYOUT_LIB, f, p, 'A3L', { mode: 'icon' });
    expect(svg).toContain('Asosiy xarita'); expect(svg).not.toContain('kesim A–A');
  });
  it('fill: material yoʻq katak chizilmaydi; bezak kataklari (rang maydoni, shifr) har doim chiziladi', () => {
    const f = LAYOUTS.families.find(x => x.id === 'kp')!, p = f.pages[0];
    const seen: number[] = [];
    const { svg } = renderLayoutPage(LAYOUT_LIB, f, p, 'A1P', { fill: (_s, k) => { seen.push(k); return null; } });
    expect(seen).not.toContain(p.slots.findIndex(s => s.role === 'shifr'));
    expect(svg).toContain('SHIFR');
    expect(svg).not.toMatch(/data-slot="2"/);
  });
  it('kataklar rejimi: rol yorligʻi va boʻsh belgisi', () => {
    const f = LAYOUTS.families[1], p = f.pages[3];
    const { svg, ui } = renderLayoutPage(LAYOUT_LIB, f, p, f.formats[0], { slots: true, empty: new Set([1]) });
    // 5-bosqich (25.10): yorliqlar — faqat ekran qatlamida, eksportga (svg) kirmaydi
    expect(ui).toContain("bo'sh");
    expect(svg).not.toContain("bo'sh");
  });
  it('dvigatel va avto-joylashtirish bir xil toʻrni ishlatadi (iu dan tashqari)', () => {
    for (const f of LAYOUTS.families) { if (f.frame) continue; for (const p of f.pages) for (const s of p.slots) {
      const a = rect(frame(f.formats[0], f.chrome, p, LAYOUT_LIB, f.orient, f), s), b = slotRect(layoutFrame(f, p, f.formats[0]), s);
      expect(a.x).toBeCloseTo(b.x, 6); expect(a.w).toBeCloseTo(b.w, 6); expect(a.h).toBeCloseTo(b.h, 6);
    } }
  });
  it('palitralar: varaq doim oq, 4 uslub', () => {
    expect(Object.keys(LAYOUT_PAL)).toEqual(['arch', 'navy', 'moviy', 'teal']);
  });
});
