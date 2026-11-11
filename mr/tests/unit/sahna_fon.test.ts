import { describe, it, expect } from 'vitest';
import { sheetSvg, SHEET_DEFAULT, type SheetCtx, type SheetOpts } from '../../src/core/sheet';
import { blankProject, migrate, type Project } from '../../src/core/doc';
import { apply } from '../../src/core/commands';
import { frame, type XY } from '../../src/core/geo';
import { GSTYLES, gstyleById, sceneBase, gsScenePal, gsMapPalette, sceneTreeCols, muteTree, gsKerb, SCENE_TREE, parcelGrey, inkOn, contrast, PARCEL_GREY, PARCEL_GREYS, PARCEL_GREY_OLD } from '../../src/core/gstyle';
import { palOf, PALETTES, mapStyle } from '../../src/context/mapstyle';
import { streetsGeo, KERB_W, type StreetIn } from '../../src/scene/streets3d';

/** c76 (egasi 11.11): sahna foni shablonga ergashadi (sputnik — qoʻlda), och kulrang parsellar va rang tanlash */
const rect = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
function project(): Project {
  const p = blankProject('Sinov'); const fr = frame(p.origin);
  p.site = { rings: [rect(-100, -80, 100, 80).map(fr.toGeo)] };
  p.streets = [{ id: 's', axis: [[-100, 0], [100, 0]].map(q => fr.toGeo(q as XY)), profile: 'mahalla-15' }];
  p.zones = [{ id: 'z1', at: fr.toGeo([0, 40]), use: 'turar' }, { id: 'z2', at: fr.toGeo([0, -40]), use: 'maktab' }];
  return p;
}
const ctx: SheetCtx = { buildings: [], roads: [], rails: [], water: [], waterways: [], green: [], trees: [] };
const opts = (o: Partial<SheetOpts> = {}): SheetOpts => ({ ...SHEET_DEFAULT, ...o, show: { ...SHEET_DEFAULT.show, ...(o.show ?? {}) } });
const D = new Date('2026-11-11T10:00:00Z');

describe('Sahna foni (shablon)', () => {
  it('«Asl uslub»da — context.base; shablonda — och vektor fon, sputnik faqat gsSat bilan', () => {
    expect(sceneBase(undefined, { base: 'sputnik' })).toBe('sputnik');
    expect(sceneBase('joriy', { base: 'sputnik', gsSat: true })).toBe('sputnik');
    expect(sceneBase(undefined, { base: 'maket', gsSat: true })).toBe('maket');   // asl uslubda gsSat ishlatilmaydi
    expect(sceneBase('pastel', { base: 'sputnik' })).toBe('maket');
    expect(sceneBase('pastel', { base: 'maket', gsSat: true })).toBe('sputnik');
    expect(sceneBase('nomaʼlum', { base: 'sputnik' })).toBe('sputnik');
  });
  it('gsSat: buyruq va saqlash — faqat true saqlanadi, base oʻzgarmaydi', () => {
    let p = project(); p = apply(p, { type: 'setContext', patch: { base: 'sputnik' } });
    p = apply(p, { type: 'setGStyle', id: 'yorqin' });
    p = apply(p, { type: 'setContext', patch: { gsSat: true } });
    expect(p.context).toMatchObject({ base: 'sputnik', gsSat: true });
    expect(migrate(JSON.parse(JSON.stringify(p))).context.gsSat).toBe(true);
    p = apply(p, { type: 'setContext', patch: { gsSat: false } });
    expect('gsSat' in p.context).toBe(false);
    expect(migrate({ ...JSON.parse(JSON.stringify(p)), context: { ...p.context, gsSat: 'ha' } }).context.gsSat).toBeUndefined();
  });
  it('3D palitra va xarita palitrasi — varaqdagi atrof ranglaridan', () => {
    expect(gsScenePal(gstyleById('joriy'))).toBeNull();
    for (const g of GSTYLES.slice(1)) {
      const S = gsScenePal(g)!, M = gsMapPalette(g)!, c = g.ctx!;
      const n = (h: string) => parseInt(h.slice(1), 16);
      expect(S.pal.binolar).toBe(n(c.bld)); expect(S.pal.yashil).toBe(n(c.green)); expect(S.pal.suv).toBe(n(c.water)); expect(S.pal['yoʻllar']).toBe(n(c.road));
      expect(S.bg).toBe(S.pal.relyef);
      // yer juda och: oq bilan kontrast < 1,25
      expect(contrast(M.bg, '#ffffff')).toBeLessThan(1.25);
      expect(M).toMatchObject({ bld: c.bld, water: c.water, park: c.green, road: c.road, rc: c.roadEdge });
      expect(palOf(`gs:${g.id}`).bg).toBe(M.bg);
      const st = mapStyle('stil', `gs:${g.id}`, false) as { layers: { id: string; paint: Record<string, unknown> }[] };
      expect(st.layers.find(l => l.id === 'bg')!.paint['background-color']).toBe(M.bg);
    }
    expect(palOf('arch')).toBe(PALETTES.arch); expect(palOf('gs:yoq')).toBe(PALETTES.arch);
    expect(Object.keys(PALETTES).some(k => k.startsWith('gs:'))).toBe(false);   // foydalanuvchi palitralari roʻyxati oʻzgarmaydi
  });
});

/** HSL (0..1) — sinov uchun */
const hslOf = (n: number) => { const r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  return { s: d ? d / (1 - Math.abs(2 * l - 1)) : 0, l }; };
const hx = (n: number) => '#' + n.toString(16).padStart(6, '0');

describe('Sahna daraxtlari — xira ranglar (11.11)', () => {
  it('har shablonda sahna daraxtlari xira: toʻyinganlik ≤ sMax, yorqinlik [lMin, lMax]; varaq ranglari oʻzgarmaydi', () => {
    expect(sceneTreeCols(gstyleById('joriy'))).toBeNull(); expect(sceneTreeCols(null)).toBeNull();
    for (const g of GSTYLES.filter(x => x.trees3d)) {
      const C = sceneTreeCols(g)!;
      expect(C).toHaveLength(g.trees3d!.length);
      for (const c of C) { const { s, l } = hslOf(c); expect(s).toBeLessThanOrEqual(SCENE_TREE.sMax + 0.01); expect(l).toBeGreaterThanOrEqual(SCENE_TREE.lMin - 0.01); expect(l).toBeLessThanOrEqual(SCENE_TREE.lMax + 0.01); }
      expect(gsScenePal(g)!.pal.daraxtlar).toBe(C[0]);
    }
    // yorqin shablonlar sahnada xiralashadi, Pastel deyarli oʻzgarmaydi (u — «xira» namuna)
    const k = gstyleById('kontrast'), y = gstyleById('yorqin'), p = gstyleById('pastel');
    expect(hslOf(sceneTreeCols(k)![0]).s).toBeLessThan(hslOf(k.trees3d![0]).s - 0.1);
    expect(hslOf(sceneTreeCols(y)![0]).s).toBeLessThan(hslOf(y.trees3d![0]).s - 0.1);
    for (let i = 0; i < p.trees3d!.length; i++) { const a = p.trees3d![i], b = sceneTreeCols(p)![i];
      for (const sh of [16, 8, 0]) expect(Math.abs((a >> sh & 255) - (b >> sh & 255))).toBeLessThan(20); }
    // varaq ranglari (2D va varaq aksonometriyasi) — shablonniki, oʻzgarmagan
    expect(k.trees3d).toEqual([0x9fd286, 0x8cc874, 0xb0dc98, 0x96cd7e]);
    expect(k.trees!.fills[0]).toBe('#8fcb78');
    // kulrang (mono) ton saqlanadi — yashilga boʻyalmaydi
    expect(hslOf(muteTree(0xd0d0d0)).s).toBe(0);
    expect(hx(muteTree(0x9fd286))).not.toBe('#9fd286');
  });
});

describe('Yoʻllar vektor fonida — bordyur (11.11)', () => {
  it('bordyur rangi: shablon chiziq rangidan, oq yoʻl va yer fonidan aniq ajraladi, lekin keskin emas', () => {
    for (const g of GSTYLES.filter(x => x.ctx)) {
      const K = gsKerb(g), S = gsScenePal(g)!, gr = hx(S.bg), road = g.ctx!.road;
      expect(S.pal.bordyurlar).toBe(parseInt(K.slice(1), 16));
      expect(contrast(K, road)).toBeGreaterThan(contrast(g.ctx!.roadEdge, road) + 0.15);   // avvalgi yoʻl chetidan aniqroq
      expect(contrast(K, gr)).toBeGreaterThan(1.3);
      expect(contrast(K, road)).toBeLessThan(3.6);                                          // qora chiziq emas
    }
  });
  it('geometriya: asfaltdan KERB_W kengroq tasma (chorraha yoylari bilan)', () => {
    const H = () => 0;
    const cross: StreetIn[] = [{ pts: [[-100, 0], [0, 0], [100, 0]], cls: 'residential', w: 7 }, { pts: [[0, -100], [0, 0], [0, 100]], cls: 'residential', w: 7 }];
    const g = streetsGeo(cross, H);
    expect(g.kerb.length).toBeGreaterThan(0);
    const maxY = (a: number[], x0: number, x1: number) => { let m = 0; for (let i = 0; i < a.length; i += 3) if (a[i] > x0 && a[i] < x1) m = Math.max(m, Math.abs(a[i + 2])); return m; };
    expect(maxY(g.kerb, 30, 70)).toBeCloseTo(3.5 + KERB_W, 3);
    expect(maxY(g.asphalt, 30, 70)).toBeCloseTo(3.5, 3);
    // chorraha yoyi: bordyur yelpigʻichi asfalt yelpigʻichidan biroz kattaroq (diagonal boʻyicha uzoqroq)
    const diag = (a: number[]) => { let m = 0; for (let i = 0; i < a.length; i += 3) { const x = a[i], y = -a[i + 2]; if (x > 3 && y > 3 && Math.abs(x - y) < 0.5) m = Math.max(m, x); } return m; };
    expect(diag(g.kerb)).toBeGreaterThan(diag(g.asphalt));
  });
});

describe('Kulrang parsellar (11.11)', () => {
  it('sukut — och #8c8a85; namunalar och → toʻq, oxirgisi avvalgi #4f4e4a', () => {
    expect(PARCEL_GREY).toBe('#8c8a85');
    expect(PARCEL_GREYS).toContain(PARCEL_GREY); expect(PARCEL_GREYS.at(-1)).toBe(PARCEL_GREY_OLD);
    const L = PARCEL_GREYS.map(c => contrast(c, '#ffffff')); expect(L.every((x, i) => !i || x > L[i - 1])).toBe(true);
    expect(parcelGrey(undefined)).toBe(PARCEL_GREY); expect(parcelGrey('qizil')).toBe(PARCEL_GREY); expect(parcelGrey('#ABCDEF')).toBe('#abcdef');
  });
  it('yozuv rangi kontrastli: och kulrangda qora, toʻqda oq (≥ 4,5:1)', () => {
    expect(inkOn('#8c8a85')).toBe('#1d1d1b'); expect(inkOn('#4f4e4a')).toBe('#ffffff');
    for (const c of PARCEL_GREYS) expect(contrast(c, inkOn(c))).toBeGreaterThanOrEqual(4.5);
  });
  it('varaq: tanlangan rang — parsellar, legend va jadvalda; asl uslubdagi funksiya rejimi oʻzgarmaydi', () => {
    const r = sheetSvg(project(), ctx, opts({ kind: 'parsel', parcel: 'kulrang', parcelGrey: '#a4a29c' }), D);
    const par = r.svg.match(/id="Parsellar"[^]*?<\/g>/)![0];
    expect(par.match(/fill="#[0-9a-f]{6}"/g)!.every(x => x === 'fill="#a4a29c"')).toBe(true);
    expect(r.legend.filter(l => l.label === 'Yer uchastkalari' && l.fill === '#a4a29c')).toHaveLength(1);
    expect(r.plots.every(p => p.full === '#a4a29c')).toBe(true);
    const d = sheetSvg(project(), ctx, opts({ kind: 'parsel', parcel: 'kulrang' }), D);
    expect(d.legend.some(l => l.fill === PARCEL_GREY)).toBe(true);
    const f0 = sheetSvg(project(), ctx, opts({ kind: 'parsel' }), D), f1 = sheetSvg(project(), ctx, opts({ kind: 'parsel', parcelGrey: '#a4a29c' }), D);
    expect(f1.svg).toBe(f0.svg);   // funksiya rangida — kulrang tanlovi taʼsir qilmaydi
  });
});
