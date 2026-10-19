import { describe, it, expect } from 'vitest';
import { blankDoc, normDoc, blankPage, bbox, fitTo, mapScale, cid } from '../../src/chizmadon/model';
import { pageSvg, smoothD, along } from '../../src/chizmadon/render';
import { pageChecks, applyFix, isRed, chromatic } from '../../src/chizmadon/check';
import { LAYOUTS, buildLayoutPage } from '../../src/chizmadon/layouts';
import { pageSize, type ChPage, type ChEl } from '../../src/chizmadon/model';

/** Tahlil diagrammasi misoli (zona, oqim, shartli belgilar) — SVG testi uchun */
function demoDiagram(p: ChPage): ChPage {
  const [W, H] = pageSize(p), L = p.layers.map(l => l.id), add = (e: Omit<ChEl, 'id'>) => p.els.push({ id: cid(), ...e } as ChEl);
  const zone = (pts: [number, number][], fill: string, name: string) => add({ t: 'zone', layer: L[1], pts, name, preset: name, style: { fill, opacity: 0.5, halo: 5 } });
  const flow = (pts: [number, number][], stroke: string, w: number, name: string, band: 'lenta' | 'toliq' = 'toliq') => add({ t: 'flow', layer: L[1], pts, name, preset: name, style: { stroke, width: w, band, head: 'end', smooth: true, opacity: 0.85 } });
  zone([[W * 0.2, H * 0.4], [W * 0.35, H * 0.3], [W * 0.42, H * 0.5], [W * 0.3, H * 0.62]], '#8cc47a', 'Yashil zona');
  zone([[W * 0.5, H * 0.55], [W * 0.62, H * 0.5], [W * 0.66, H * 0.66], [W * 0.54, H * 0.7]], '#e9a3c9', 'Markaz');
  flow([[W * 0.1, H * 0.8], [W * 0.4, H * 0.6], [W * 0.75, H * 0.35]], '#f0a35e', 7, 'Asosiy oqim', 'lenta');
  flow([[W * 0.3, H * 0.15], [W * 0.33, H * 0.5], [W * 0.4, H * 0.85]], '#6fae8e', 5, 'Yashil koridor');
  add({ t: 'legend', layer: L[2], x: W * 0.8, y: H * 0.2, w: 70, h: 40, text: 'Shartli belgilar', style: { size: 9 } });
  return p;
}
import { ICONS, ICON_GROUPS, TREES, FLOWS, ZONES, MOBILITY, DASHES, PALETTES, FONTS, TOOLS } from '../../src/chizmadon/catalog';

describe('Chizmadon — kutubxona (eski Albom inventari)', () => {
  it('sonlar inventarga mos', () => {
    expect(TOOLS).toHaveLength(14); expect(FLOWS).toHaveLength(7); expect(ZONES).toHaveLength(7); expect(MOBILITY).toHaveLength(8);
    expect(DASHES).toHaveLength(6); expect(ICON_GROUPS).toHaveLength(6); expect(ICONS.length).toBeGreaterThanOrEqual(45);
    expect(TREES).toHaveLength(12); expect(PALETTES).toHaveLength(8); expect(FONTS).toHaveLength(6);
    // namunalar — maket oilalari (eski 24 namuna oʻrnida): 8 oila, shu jumladan Portfolio
    expect(LAYOUTS.families.map(f => f.id)).toEqual(['kz', 'mr', 'tq', 'st', 'kp', 'kl', 'iu', 'pf']);
  });
});

describe('Chizmadon — hujjat', () => {
  it('normDoc: yaroqsiz kirish → sukut; elementlar saqlanadi', () => {
    expect(normDoc(null).pages).toHaveLength(0); expect(normDoc(null).v).toBe(2); expect(normDoc(null).auto.fam).toBe('mr');
    const d = blankDoc('X'); d.pages.push(blankPage('Varaq 1')); d.pages[0].els.push({ id: 'a', t: 'rect', layer: d.pages[0].layers[0].id, x: 1, y: 2, w: 3, h: 4, style: { fill: '#ff0000' } });
    const n = normDoc(JSON.parse(JSON.stringify(d)));
    expect(n.pages[0].els[0]).toMatchObject({ id: 'a', t: 'rect', x: 1, w: 3 });
    expect(normDoc({ pages: [{ els: [{ t: 'nope' }, { t: 'text', text: 'a' }] }] }).pages[0].els).toHaveLength(1);
  });
  it('normDoc: eski (v1) albom — varaqlari erkin varaq, kirish oynasisiz; bogʻlanish va avto holat saqlanadi', () => {
    const v1 = normDoc({ v: 1, pages: [{ els: [] }, { els: [] }], cur: 1 });
    expect(v1.v).toBe(1); expect(v1.auto.started).toBe(true); expect(v1.pages).toHaveLength(2); expect(v1.cur).toBe(1);
    const d = blankDoc(); d.auto.fam = 'kz'; d.auto.force = { 1: 'kz-swot' }; d.auto.mats.loc1 = { visible: false, accent: '#123456' };
    d.hand.push({ id: 'h', t: 'rect', layer: d.handLayers[0].id, x: 1, y: 1, w: 2, h: 2, style: {}, a: { el: 'loc1', pi: 0, r0: { x: 0, y: 0, w: 10, h: 10 } } });
    const n = normDoc(JSON.parse(JSON.stringify(d)));
    expect(n.auto.fam).toBe('kz'); expect(n.auto.force[1]).toBe('kz-swot'); expect(n.auto.mats.loc1).toEqual({ visible: false, accent: '#123456' });
    expect(n.hand[0].a).toEqual({ el: 'loc1', pi: 0, r0: { x: 0, y: 0, w: 10, h: 10 } });
    expect(normDoc({ v: 2, hand: [{ t: 'rect', a: { el: 5, pi: -3, r0: { x: 0, y: 0, w: 0, h: 1 } } }] }).hand[0].a).toEqual({ el: null, pi: 0, r0: null });
  });
  it('fitTo va xarita masshtabi', () => {
    const e = { id: cid(), t: 'map' as const, layer: 'l', x: 0, y: 0, w: 100, h: 50, scale: 2000, natW: 100, style: {} };
    const f = fitTo(e, bbox(e), [0, 0, 50, 25]);
    expect(f.w).toBe(50); expect(mapScale(f)).toBe(4000);
  });
});

describe('Chizmadon — SVG', () => {
  it('varaq mm da, har qatlam guruh, barcha element turlari chiziladi', () => {
    const p = demoDiagram(blankPage('T'));
    const L = p.layers[2].id;
    p.els.push({ id: 't1', t: 'text', layer: L, x: 10, y: 10, w: 50, h: 10, text: 'Salom\nDunyo', style: { size: 12 } });
    p.els.push({ id: 'i1', t: 'icon', layer: L, x: 100, y: 100, w: 10, h: 10, icon: 'metro', look: 'pin', style: { stroke: '#2f6da8' } });
    p.els.push({ id: 'r1', t: 'row', layer: L, pts: [[10, 200], [200, 200]], row: { kind: 'tree', gap: 10, size: 6, tree: 'chinor' }, style: {} });
    p.els.push({ id: 'm1', t: 'map', layer: L, x: 200, y: 20, w: 80, h: 60, svg: '<rect id="a" x="0" y="0" width="10" height="10" fill="url(#a)"/>', vb: [0, 0, 10, 10], style: {} });
    p.els.push({ id: 'l1', t: 'line', layer: L, pts: [[0, 0], [50, 50]], style: { deco: 'rail', head: 'both' } });
    const { svg, w, h } = pageSvg(p, { num: { i: 1, total: 3 }, stamp: { title: 'Loyiha', author: 'I', date: '18.10.2026' } });
    expect([w, h]).toEqual([420, 297]);
    expect(svg).toContain('width="420mm"');
    expect((svg.match(/data-layer=/g) ?? []).length).toBe(2);
    expect(svg).toContain('<tspan'); expect(svg).toContain('Shtamp'); expect(svg).toContain('id="cmm1a"');
    expect(svg).not.toContain('<filter'); expect(svg).not.toContain('<pattern');
    expect(() => new DOMParserLike(svg)).not.toThrow();
  });
  it('silliq egri va teng oraliq', () => {
    expect(smoothD([[0, 0], [10, 0], [20, 10]])).toMatch(/^M0 0C/);
    expect(along([[0, 0], [100, 0]], 25)).toHaveLength(5);
  });
});

describe('Chizmadon — 7 bandli tekshiruv', () => {
  it('qizil faqat xavf uchun; tuzatish ishlaydi', () => {
    const p = blankPage('T'); const L = p.layers[1].id;
    p.els.push({ id: 'z', t: 'zone', layer: L, pts: [[0, 0], [10, 0], [10, 10]], style: { fill: '#e0261e' } });
    expect(isRed('#e0261e')).toBe(true); expect(chromatic('#808080')).toBe(false);
    const c = pageChecks(p); expect(c).toHaveLength(7); expect(c.find(x => x.id === 6)!.ok).toBe(false);
    const f = applyFix(p, 6, 'asosiy'); expect(pageChecks(f).find(x => x.id === 6)!.ok).toBe(true);
    const g = applyFix(f, 4, 'asosiy'); expect(g.els.some(e => e.t === 'legend')).toBe(true);
    expect(pageChecks(g).find(x => x.id === 4)!.ok).toBe(true);
  });
  it('namunalar quriladi (loyiha xaritasi bilan)', () => {
    const ctx = { title: 'Fitrat', place: 'Toshkent', date: '18.10.2026', author: 'I', map: { svg: '<rect width="10" height="10"/>', vb: [0, 0, 400, 300] as [number, number, number, number], w: 400, h: 300, scale: 2000 } };
    for (const f of LAYOUTS.families) for (const pg of f.pages) for (const fmt of f.formats) { const p = buildLayoutPage(f.id, pg.id, fmt, ctx); expect(p.els.length, `${pg.id} ${fmt}`).toBeGreaterThan(0); expect(pageSvg(p).svg.length).toBeGreaterThan(100); }
  });
});

class DOMParserLike { constructor(s: string) { let d = 0; for (const m of s.matchAll(/<(\/?)([a-zA-Z]+)[^>]*?(\/?)>/g)) { if (m[3]) continue; d += m[1] ? -1 : 1; if (d < 0) throw new Error('teg'); } if (d !== 0) throw new Error('yopilmagan: ' + d); } }

import { sheetChecks, lab, dE, svgTones } from '../../src/chizmadon/check';
describe('Chizmadon — tekshiruv, 9 band', () => {
  const base = { empty: 0, left: [] as string[], hasMap: false, hasLegend: false, share: 0.2 };
  const svg = (...c: string[]) => `<svg>${c.map(x => `<rect fill="${x}"/>`).join('')}<rect fill="#ffffff"/><rect fill="#141414"/></svg>`;
  it('9 band, toza varaq — hammasi bajarildi', () => {
    const r = sheetChecks({ ...base, svg: svg('#c0643a', '#3f6fa8', '#4f9a6e') });
    expect(r).toHaveLength(9); expect(r.map(c => c.group)).toEqual(['Joylashuv', 'Joylashuv', 'Rang', 'Rang', 'Rang', 'Rang', 'Rang', 'Rang', 'Rang']);
    expect(r.filter(c => c.st !== 'o').map(c => c.id)).toEqual([]);
  });
  it('ataylab yaqin ikki rang — «Toifalar ajraladi» xato (ΔE CIE76 < 12)', () => {
    expect(dE(lab('#3f6fa8'), lab('#4472ab'))).toBeLessThan(12);
    const r = sheetChecks({ ...base, svg: svg('#3f6fa8', '#4472ab') });
    expect(r.find(c => c.id === 5)).toMatchObject({ st: 'f', fix: 3 });
  });
  it('joylashuv, tonlar, toʻyingan maydon, legenda, qizil, urgʻu, kulrang', () => {
    const r = sheetChecks({ empty: 2, left: ['Harorat'], hasMap: true, hasLegend: false, share: 0.75, svg: svg('#e61919', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6') });
    const st = Object.fromEntries(r.map(c => [c.id, c.st]));
    expect(st).toMatchObject({ 1: 'f', 2: 'f', 3: 'f', 4: 'f', 6: 'w', 8: 'w', 9: 'w' });
    expect(sheetChecks({ ...base, share: null, svg: '' }).find(c => c.id === 4)!.st).toBe('p');
    // bir xil yorqinlik, turli ton → kulrangda qoʻshiladi
    const g = sheetChecks({ ...base, svg: svg('#c0643a', '#4f8a9a') }).find(c => c.id === 7)!;
    expect(Math.abs(lab('#c0643a')[0] - lab('#4f8a9a')[0])).toBeLessThan(4); expect(g.st).toBe('w');
    expect(svgTones('<rect fill="#808080"/><rect fill="#C0643A"/>')).toEqual(['#c0643a']);
  });
});
