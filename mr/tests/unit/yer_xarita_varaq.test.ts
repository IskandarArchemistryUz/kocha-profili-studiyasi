import { describe, it, expect } from 'vitest';
import { sheetSvg, SHEET_DEFAULT, SHEET_KINDS, type SheetCtx, type SheetOpts } from '../../src/core/sheet';
import { blankProject } from '../../src/core/doc';
import { frame, type XY } from '../../src/core/geo';

/** 06.11 (egasi: «mana bu analizlar nega varaqlarga bormaydi?»): yuza qizishi, HAND, TWI varaqlari */
const rect = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const doc = () => { const p = blankProject('Sinov'); const fr = frame(p.origin); p.site = { rings: [rect(-100, -80, 100, 80).map(fr.toGeo)] }; return p; };
const base: SheetCtx = { buildings: [], roads: [], rails: [], water: [], waterways: [], green: [], trees: [] } as unknown as SheetCtx;
const opts = (kind: SheetOpts['kind']): SheetOpts => ({ ...SHEET_DEFAULT, kind, show: { ...SHEET_DEFAULT.show } });

describe('Yer sathi xaritalari varaqda', () => {
  it('uch tur namunalar roʻyxatida', () => { for (const k of ['issiq', 'hand', 'twi']) expect(SHEET_KINDS.some(s => s.id === k)).toBe(true); });
  it('katakchalar, legenda, statistika va uzun izoh qatorlarga boʻlinadi', () => {
    const pts: XY[] = []; const cols: string[] = [];
    for (let x = -90; x <= 90; x += 10) for (let y = -70; y <= 70; y += 10) { pts.push([x, y]); cols.push(x < 0 ? '#1f5fa8' : '#a9cbea'); }
    const note = 'Drenaj (OSM soy, kanal, ariq yoki oqim ≥ 2 ga) ustidan balandlik, relyef 10 m. Skrining: yomgʻir kanalizatsiyasi hisobga olinmaydi.';
    const r = sheetSvg(doc(), { ...base, gmap: { pts, cols, cell: 10, title: 'Suv bosish xavfi — HAND', legend: [['#1f5fa8', '< 1 m — yuqori'], ['#a9cbea', '2–5 m — past']], stats: ['Uchastka: < 1 m — 50 %, < 2 m — 50 %'], note } }, opts('hand'));
    expect(r.svg).toContain('id="Suv_bosish_HAND"');
    expect(r.legend.some(l => l.label === '< 1 m — yuqori')).toBe(true);
    expect(r.legend.filter(l => l.type === 'text').length).toBeGreaterThan(0);
    expect(r.legend.every(l => l.label.length <= 60)).toBe(true);
  });
  it('maʼlumot yoʻq — izoh, yiqilmaydi', () => {
    const r = sheetSvg(doc(), { ...base, gmap: { err: 'Relyef yuklanmagan — 1-qadamda atrofni yuklang (relyef qatlami bilan)' } }, opts('twi'));
    expect(r.svg).toContain('Relyef yuklanmagan');
    expect(sheetSvg(doc(), null, opts('issiq')).svg).toContain('Maʼlumot yoʻq');
  });
});
