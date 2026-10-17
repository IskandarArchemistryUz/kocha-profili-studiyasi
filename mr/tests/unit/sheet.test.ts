import { describe, it, expect } from 'vitest';
import { sheetSvg, sheetChecks, recommendScale, niceLen, SHEET_DEFAULT, type SheetCtx, type SheetOpts } from '../../src/core/sheet';
import { blankProject, type Project } from '../../src/core/doc';
import { frame, type XY } from '../../src/core/geo';

const rect = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

function project(): Project {
  const p = blankProject('Sinov'); const fr = frame(p.origin);
  p.site = { rings: [rect(-100, -80, 100, 80).map(fr.toGeo)] };
  p.streets = [{ id: 's', axis: [[-100, 0], [100, 0]].map(q => fr.toGeo(q as XY)), profile: 'mahalla-15' }];
  p.zones = [{ id: 'z1', at: fr.toGeo([0, 40]), use: 'turar' }, { id: 'z2', at: fr.toGeo([0, -40]), use: 'yashil' }];
  p.buildings = [{ id: 'b', footprint: rect(-30, 20, 30, 34).map(fr.toGeo), floors: 9, nonRes: 1, use: 'turar' }];
  return p;
}
const ctx: SheetCtx = {
  buildings: [{ id: 1, rings: [rect(-60, -60, -45, -50)], h: 6 }, { id: 2, rings: [rect(150, 0, 170, 20)], h: 30 }],
  roads: [{ id: 9, pts: [[-300, 100], [300, 100]], w: 7, cls: 'residential' }],
  rails: [], water: [], waterways: [], green: [{ rings: [rect(120, -100, 200, -40)], kind: 'park' }], trees: [[130, -60], [0, -70]],
};
const opts = (o: Partial<SheetOpts> = {}): SheetOpts => ({ ...SHEET_DEFAULT, ...o, show: { ...SHEET_DEFAULT.show, ...(o.show ?? {}) } });

describe('Grafika varaqlari', () => {
  it('masshtab: uchastka sigʻadigan eng yirik standart', () => {
    const r = sheetSvg(project(), ctx, opts());
    expect(r.scale).toBe(1000);                       // 200 m × 1,25 = 250 m → A3 (400 mm) ga 1:1000 da sigʻadi, 1:500 da yoʻq
    expect(r.widthMm).toBe(420); expect(r.heightMm).toBe(297);
    expect(sheetSvg(project(), ctx, opts({ scale: 500 })).scale).toBe(500);
    expect(sheetSvg(project(), ctx, opts({ paper: 'A4', landscape: false })).widthMm).toBe(210);
  });
  it('qatlamlar nomlangan, mm oʻlchamda, uchastka va qizil chiziqlar bor', () => {
    const { svg } = sheetSvg(project(), ctx, opts());
    expect(svg).toContain('width="420mm"');
    for (const id of ['Atrof_binolar', 'Loyiha_kochalari', 'Qizil_chiziqlar', 'Yangi_binolar', 'Uchastka_chegarasi', 'Shartli_belgilar', 'Masshtab', 'Shimol', 'Sarlavha']) expect(svg).toContain(`id="${id}"`);
    expect(svg).toContain('M 1:1000');
    expect(svg).toMatch(/>9<\/text>/);                // qavatlar soni
  });
  it('Illustrator uchun: har qatlam yuqori darajadagi i:layer guruhi, kesish qatlam ichida; olib tashlangan atrof binosi yoʻq', () => {
    const { svg } = sheetSvg(project(), ctx, opts(), new Date(), true);
    expect(svg).toContain('xmlns:i="http://ns.adobe.com/AdobeIllustrator/10.0/"');
    for (const id of ['Fon', 'Atrof_binolar', 'Yangi_binolar', 'Sarlavha']) expect(svg).toMatch(new RegExp(`<g id="${id}" i:layer="yes"`));
    expect(svg).not.toMatch(/<g clip-path="url\(#vp\)"><g id=/);
    const n = (x: string) => (x.match(/<path/g) ?? []).length;
    const p = project(); p.removed = [2];
    expect(n(sheetSvg(p, ctx, opts()).svg)).toBeLessThan(n(sheetSvg(project(), ctx, opts()).svg));
  });
  it('uchastka ichidagi saqlanmagan mavjud bino — buziladigan qatlamida', () => {
    const p = project(), { svg } = sheetSvg(p, ctx, opts());
    expect(svg).toContain('Buziladigan binolar (1)');
    const kept = sheetSvg({ ...p, keep: [1] }, ctx, opts()).svg;
    expect(kept).not.toContain('id="Buziladigan_binolar"');
  });
  it('figure-ground: binolar qora, koʻchalar chizilmaydi; zonalash — funksiya legendasi', () => {
    const f = sheetSvg(project(), ctx, opts({ kind: 'figura' })).svg;
    expect(f).toContain('fill="#1d1d1b"'); expect(f).not.toContain('id="Loyiha_kochalari"'); expect(f).not.toContain('id="Atrof_yollar"');
    const z = sheetSvg(project(), ctx, opts({ kind: 'zona' }));
    expect(z.legend.map(l => l.label)).toEqual(expect.arrayContaining(['Koʻp qavatli turar joy', 'Park / bogʻ']));
    expect(z.svg).toContain('id="Yer_uchastkalari_yozuvlari"');
  });
  it('atrofsiz ham ishlaydi; bezaklar oʻchiriladi', () => {
    const { svg } = sheetSvg(project(), null, opts({ show: { ...SHEET_DEFAULT.show, legend: false, north: false, title: false } }));
    expect(svg).not.toContain('id="Shimol"'); expect(svg).not.toContain('id="Sarlavha"'); expect(svg).toContain('id="Yangi_binolar"');
  });
  it('masshtab chizgʻichi uzunligi', () => { expect(niceLen(95)).toBe(50); expect(niceLen(130)).toBe(100); expect(niceLen(3)).toBe(10); });
  it('MR-Varaqlar: oʻng ustun (shartli belgilar, jadval, shtamp), yozuvlar mm da, tekshiruv', () => {
    const r = sheetSvg(project(), ctx, opts({ kind: 'zona', stamp: { author: 'I. Soliyev', num: 'MR-02', index: 2, total: 5 } }));
    for (const id of ['Shartli_belgilar', 'Yer_uchastkalari_jadvali', 'Shtamp', 'Yer_uchastkalari_yozuvlari']) expect(r.svg).toContain(`id="${id}"`);
    expect(r.svg).toContain('I. Soliyev'); expect(r.svg).toContain('2 / 5');
    expect(r.plots.length).toBe(2); expect(r.labels.total).toBe(2);
    expect(r.minText).toBeGreaterThanOrEqual(2.5);
    const ch = sheetChecks(r, opts({ kind: 'zona', stamp: { author: 'x' } }));
    expect(ch.find(c => c.id === 'scale')!.ok).toBe(false);   // avto — «andoza»
    expect(ch.find(c => c.id === 'text')!.ok).toBe(true);
    expect(ch.find(c => c.id === 'fit')!.ok).toBe(true);
  });
  it('format A0 va «Moslash», burilish, qatlamni oʻchirish, vaziyat sxemasi', () => {
    expect(sheetSvg(project(), ctx, opts({ paper: 'A0' })).widthMm).toBe(1189);
    const f = sheetSvg(project(), ctx, opts({ paper: 'fit', scale: 1000 }));
    expect(f.scale).toBe(1000); expect(f.widthMm).toBeLessThan(420);
    expect(sheetSvg(project(), ctx, opts({ rot: 30 })).svg).toContain('rotate(-30');
    expect(sheetSvg(project(), ctx, opts({ layers: { ctx: { on: false } } })).svg).not.toContain('id="Atrof_binolar"');
    const v = sheetSvg(project(), ctx, opts({ kind: 'vaziyat' }));
    expect(v.scale).toBeGreaterThanOrEqual(2000); expect(v.svg).not.toContain('id="Qizil_chiziqlar"');
    expect(recommendScale(10, 'bosh').scale).toBe(1000); expect(recommendScale(34.5, 'zona').scale).toBe(2000); expect(recommendScale(80, 'bosh').scale).toBe(5000); expect(recommendScale(5, 'vaziyat').scale).toBe(10000);
  });
});
