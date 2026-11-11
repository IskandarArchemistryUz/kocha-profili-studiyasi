import { describe, it, expect } from 'vitest';
import { normAxoEdit, resolveAxo, bldPaint, placeLabels, hitPick, copyAxoEdit, axoEditKey, axoEditCount, AXO_LAYERS, AXO_MATS, axoMat, type AxoEdit } from '../../src/core/axoedit';

/** c77 (11.11): varaqdagi aksonometriya muharriri — sozlama modeli, sukut va eski varaqlar bilan moslik */
const tf = (s: string, v: Record<string, string | number>) => s.replace(/\$\{(\w+)\}/g, (_m, k) => String(v[k]));
const B = [{ id: 'a', floors: 9, use: 'turar' }, { id: 'b', floors: 3, z0: 1, use: 'maktab' }, { id: 'c', floors: 0, use: 'yashil' }];
const name = (u: string) => ({ turar: 'Turar joy', maktab: 'Maktab' } as Record<string, string>)[u] ?? u;

describe('aksonometriya muharriri — model', () => {
  it('eski varaq (edit yoʻq yoki boʻsh) — hech narsa oʻzgarmaydi', () => {
    expect(normAxoEdit(undefined)).toBeUndefined();
    expect(normAxoEdit({})).toBeUndefined();
    expect(normAxoEdit({ hide: [], col: {}, bld: {}, roof: { floors: false } })).toBeUndefined();
    expect(resolveAxo(undefined, 'oq', B, name, tf)).toBeNull();
    expect(resolveAxo({}, 'qavatlilik', B, name, tf)).toBeNull();
    expect(axoEditKey(undefined)).toBe('');
    expect(axoEditCount(undefined)).toBe(0);
  });
  it('notoʻgʻri qiymatlar tashlanadi, HEX kichik harfga', () => {
    const e = normAxoEdit({ hide: ['suv', 'xato', 'suv', 'loyiha'], col: { loyiha: '#C0643A', atrof: 'red', zzz: '#ffffff' }, trees: 'boshqa', mat: 'oltin', bld: { x: { col: '#ABCDEF', mat: 'shisha', text: '  Maktab № 5  ' }, y: { col: 'no' } }, roof: { num: true, name: 'ha' } });
    expect(e).toEqual({ hide: ['loyiha', 'suv'], col: { loyiha: '#c0643a' }, bld: { x: { col: '#abcdef', mat: 'shisha', text: 'Maktab № 5' } }, roof: { num: true } });
    expect(axoEditCount(e)).toBe(5);
  });
  it('har qatlamda 7 ta namuna; 5 ta material', () => {
    expect(AXO_LAYERS.map(l => l.id)).toEqual(['loyiha', 'atrof', 'daraxt', 'yol', 'suv', 'relyef', 'uchastka', 'fon']);
    for (const l of AXO_LAYERS) { expect(l.sw).toHaveLength(7); l.sw.forEach(c => expect(c).toMatch(/^#[0-9a-f]{6}$/)); }
    expect(AXO_MATS.map(m => m.id)).toEqual(['maket', 'gips', 'yogoch', 'beton', 'shisha']);
    expect(axoMat('shisha')!.opacity).toBeLessThan(1);
  });
  it('bino rangi: alohida → qatlam → material (semantik namunada — yoʻq)', () => {
    const e: AxoEdit = { mat: 'yogoch', col: { atrof: '#d7d4cd' }, bld: { b: { col: '#5f6b7a' } } };
    const A = resolveAxo(e, 'oq', B, name, tf)!;
    expect(bldPaint(A, 'b')).toEqual({ color: 0x5f6b7a, mat: axoMat('yogoch') });
    expect(bldPaint(A, 'a').color).toBe(axoMat('yogoch')!.color);
    // qavatlilik — sinf ranglari saqlanadi, material faqat yuza
    const Q = resolveAxo(e, 'qavatlilik', B, name, tf)!;
    expect(bldPaint(Q, 'a')).toEqual({ color: null, mat: axoMat('yogoch') });
    expect(bldPaint(Q, 'b').color).toBe(0x5f6b7a);   // aniq tanlangan — ustun
    // qatlam rangi aniq berilsa — semantik namunada ham
    const K = resolveAxo({ col: { loyiha: '#ffffff' } }, 'kontekst', B, name, tf)!;
    expect(bldPaint(K, 'a').color).toBe(0xffffff);
    expect(K.col).toEqual({ loyiha: 0xffffff });
  });
  it('daraxtlar: shablon (sukut), xira yoki rang', () => {
    expect(resolveAxo({ hide: ['suv'] }, 'oq', B, name, tf)!.trees).toBeNull();
    expect(resolveAxo({ trees: 'xira' }, 'oq', B, name, tf)!.trees).toBe('xira');
    expect(resolveAxo({ trees: 'xira', col: { daraxt: '#7fa65a' } }, 'oq', B, name, tf)!.trees).toBe('rang');
  });
  it('tom yozuvlari: raqam, nom (yoki foydalanuvchi matni), qavatlar; 0 qavatli — yoʻq', () => {
    const A = resolveAxo({ roof: { num: true, name: true, floors: true }, bld: { b: { text: 'Maktab № 5' } } }, 'oq', B, name, tf)!;
    expect(A.labels.map(l => l.text)).toEqual(['№ 1 · Turar joy · 9 qavat', '№ 2 · Maktab № 5 · 4 qavat']);
    expect(A.labels[1].prio).toBeGreaterThan(A.labels[0].prio);   // foydalanuvchi matni ustun
    const F = resolveAxo({ roof: { floors: true } }, 'oq', B, name, tf)!;
    expect(F.labels.map(l => [l.text, l.badge])).toEqual([['9', true], ['4', true]]);
    // matn — toggle oʻchiq boʻlsa ham chiqadi; loyiha qatlami yashirin boʻlsa — yozuv yoʻq
    expect(resolveAxo({ bld: { a: { text: 'A blok' } } }, 'oq', B, name, tf)!.labels.map(l => l.text)).toEqual(['A blok']);
    expect(resolveAxo({ hide: ['loyiha'], roof: { num: true } }, 'oq', B, name, tf)!.labels).toEqual([]);
  });
  it('yozuvlar toʻqnashmaydi: ustuni joyida, keyingisi yuqoriga suriladi yoki yashiriladi', () => {
    const r = (x: number, y: number, prio: number) => ({ x, y, w: 60, h: 14, prio });
    expect(placeLabels([r(0, 100, 1), r(300, 100, 1)])).toEqual([0, 0]);
    const k = placeLabels([r(0, 100, 1), r(10, 102, 5)]);
    expect(k[1]).toBe(0); expect(k[0]).toBeGreaterThan(0);
    const many = placeLabels(Array.from({ length: 8 }, (_, i) => r(i, 100, i)));
    expect(many.filter(x => x < 0).length).toBe(4);
  });
  it('rasmda tanlash: tom yoki devor ichida, eng yaqini', () => {
    const sq = (x0: number, y0: number, s: number) => [x0, y0, x0 + s, y0, x0 + s, y0 + s, x0, y0 + s];
    const P = [{ id: 'far', top: sq(0.4, 0.4, 0.2), bot: sq(0.4, 0.5, 0.2), d: 200 }, { id: 'near', top: sq(0.45, 0.45, 0.2), bot: sq(0.45, 0.55, 0.2), d: 100 }];
    expect(hitPick(P, 0.42, 0.42)).toBe('far');
    expect(hitPick(P, 0.5, 0.5)).toBe('near');
    expect(hitPick(P, 0.42, 0.65)).toBe('far');   // devor (asos va tom orasida)
    expect(hitPick(P, 0.9, 0.9)).toBeNull();
  });
  it('«Barcha varaqlarga»: faqat akso varaqlari, namuna va kamera oʻzida qoladi', () => {
    const sh = [
      { id: '1', opts: { mode: 'akso', axo: { look: 'oq', view: 'v1', edit: { mat: 'beton' } } } },
      { id: '2', opts: { mode: 'akso', axo: { look: 'qavatlilik' } } },
      { id: '3', opts: { mode: 'reja', kind: 'bosh' } },
      { id: '4', opts: { mode: 'akso' } },
    ];
    const e: AxoEdit = { hide: ['suv'], bld: { a: { col: '#c0643a', text: 'A' } } };
    const r = copyAxoEdit(sh, e);
    expect(r.n).toBe(3);
    expect(r.sheets[0].opts.axo).toEqual({ look: 'oq', view: 'v1', edit: e });
    expect(r.sheets[1].opts.axo).toEqual({ look: 'qavatlilik', edit: e });
    expect(r.sheets[2]).toBe(sh[2]);
    expect((r.sheets[3].opts.axo as { edit: AxoEdit }).edit).not.toBe((r.sheets[1].opts.axo as { edit: AxoEdit }).edit);   // alohida nusxa
    // boʻsh sozlama — edit olib tashlanadi (eski koʻrinish)
    expect(copyAxoEdit(sh, undefined).sheets[0].opts.axo).toEqual({ look: 'oq', view: 'v1' });
  });
});
