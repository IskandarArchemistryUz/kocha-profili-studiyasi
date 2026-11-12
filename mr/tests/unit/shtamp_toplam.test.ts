import { describe, it, expect } from 'vitest';
// @ts-ignore — node modullari (faqat test)
import { readFileSync } from 'fs';
import { importJSON } from '../../src/storage/db';
import { sheetSvg, SHEET_DEFAULT, type SheetOpts } from '../../src/core/sheet';

/** 12.11 (meʼyorlar toʻplami, 3-bosqich, 4-band): varaq shtampida qoʻllangan toʻplam qatori va konsepsiya belgisi */
const load = () => importJSON(readFileSync('../data/namuna-mahalla.archemistry.json', 'utf8'), () => 'p_x');
const o = { ...SHEET_DEFAULT, kind: 'zona', show: { ...SHEET_DEFAULT.show, stamp: true } } as SheetOpts;
describe('shtampda meʼyorlar toʻplami', () => {
  it('Oʻzbekiston · ShNQ; konsepsiya rejimida — belgi', () => {
    const p = load();
    const a = sheetSvg(p, null, o).svg;
    expect(a).toContain('data-norms="UZ"');
    expect(a.replace(/<\/tspan><tspan[^>]*>/g, ' ')).toContain('Meʼyorlar: Oʻzbekiston · ShNQ');
    expect(a).not.toContain('data-concept');
    const b = sheetSvg({ ...p, settings: { ...p.settings, concept: true } }, null, o).svg;
    expect(b.replace(/<\/tspan><tspan[^>]*>/g, ' ')).toContain('(konsepsiya rejimi)');
    expect(b).toContain('ShNQ TEKSHIRUVIDAN OʻTMAGAN — KONSEPSIYA');
  });
  it('xalqaro andoza + uchastka shartlari manbasi', () => {
    const p = load(), q = { ...p, settings: { ...p.settings, normSet: 'intl' as const, concept: true, siteCond: { far: 3, src: 'Zona R4' } } };
    const s = sheetSvg(q, null, o).svg;
    expect(s).toContain('data-norms="intl"');
    expect(s.replace(/<\/tspan><tspan[^>]*>/g, ' ')).toContain('Xalqaro andoza (NSW ADG 3F-1) + uchastka shartlari — manba: Zona R4');
    expect(s).not.toContain('data-concept');   // konsepsiya rejimi faqat ShNQ toʻplamida
  });
});
