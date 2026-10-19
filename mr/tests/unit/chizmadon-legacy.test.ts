import { describe, it, expect } from 'vitest';
import { convertMaketDoc, convertItem, matToInbox } from '../../src/chizmadon/legacy';
import { pageSvg } from '../../src/chizmadon/render';

/** Eski Albom (maket.html) hujjati — barcha element turlari */
const OLD = {
  id: 'main', name: 'Eski albom', meta: { author: 'I', proj: 'Fitrat' }, layers: [{ id: 'L0', name: 'Asosiy', vis: true }, { id: 'L1', name: 'Tahlil', vis: false }],
  pages: [
    { id: 'a', fmt: 'A3', orient: 'L', tb: true, items: [
      { id: '1', t: 'rect', x: 10, y: 10, w: 50, h: 30, fill: '#8cc37a', stroke: '#141414', sw: 0.5, ls: 'dash', fop: 0.5 },
      { id: '2', t: 'ellipse', x: 70, y: 10, w: 20, h: 20, fill: '#e9a3c9', layer: 'L1' },
      { id: '3', t: 'poly', pts: [[0, 0], [10, 0], [10, 10]], fill: '#ccc', closed: true, smooth: true },
      { id: '4', t: 'poly', pts: [[0, 0], [10, 10]], closed: false, stroke: '#333', sw: 1 },
      { id: '5', t: 'arrow', pts: [[0, 0], [50, 50]], stroke: '#c0392b', sw: 0.8, deco: 'rail' },
      { id: '6', t: 'text', x: 20, y: 200, w: 100, h: 10, text: 'Salom\nDunyo', fs: 18, ff: 'Archivo', col: '#141414', al: 'c', b: true, bg: '#ffffff' },
      { id: '7', t: 'flow', pts: [[0, 100], [100, 120], [200, 90]], col: '#f0a35e', w: 7, style: 'dots' },
      { id: '8', t: 'icon', x: 300, y: 20, w: 12, h: 12, g: 'metro', style: 'pin', col: '#2f6da8' },
      { id: '9', t: 'row', pts: [[0, 250], [200, 250]], g: 'person', sz: 4, sp: 6, col: '#333' },
      { id: '10', t: 'mat', x: 200, y: 150, w: 80, h: 60, src: 'data:image/png;base64,AA', frame: true },
      { id: '11', t: 'map', x: 300, y: 150, w: 80, h: 60 },
      { id: '12', t: 'legend', x: 330, y: 40, w: 60, h: 30, title: 'Belgilar', fs: 9, entries: [{ label: 'Yashil', col: '#8cc37a' }, { label: 'Yoʻl', col: '#333', kind: 'line' }, { label: 'Bekat', col: '#c00', kind: 'dot' }, { label: 'Yashirin', col: '#000', on: false }] },
      { id: '13', t: 'nomaʼlum' },
    ] },
    { id: 'b', fmt: 'A0+', orient: 'P', items: [] },
  ],
};

describe('Chizmadon — eski Albomdan oʻtkazish', () => {
  it('varaqlar, qatlamlar va elementlar', () => {
    const r = convertMaketDoc(OLD);
    expect(r.pages).toHaveLength(2); expect(r.skipped).toBe(1);
    const [p, q] = r.pages;
    expect(p.paper).toBe('A3'); expect(p.landscape).toBe(true); expect(p.layers.map(l => l.name)).toEqual(['Asosiy', 'Tahlil']); expect(p.layers[1].visible).toBe(false);
    expect(q.paper).toBe('custom'); expect([q.w, q.h]).toEqual([900, 1300]);
    const T = (t: string) => p.els.filter(e => e.t === t);
    expect(T('rect')[0].style).toMatchObject({ fill: '#8cc37a', dash: 'dash', opacity: 0.5 });
    expect(T('ellipse')[0].layer).toBe(p.layers[1].id);
    expect(T('poly')).toHaveLength(1); expect(T('line').length).toBeGreaterThanOrEqual(2);   // ochiq poly + legenda chizigʻi
    expect(T('arrow')[0].style).toMatchObject({ head: 'end', deco: 'rail' });
    expect(T('flow')[0].style.band).toBe('nuqta');
    expect(T('icon')[0]).toMatchObject({ icon: 'metro', look: 'pin' });
    expect(T('row')[0].row).toMatchObject({ kind: 'people', gap: 6, size: 4 });
    expect(T('image')).toHaveLength(2); expect(T('image')[0].style.stroke).toBe('#141414');
    const texts = T('text').map(e => e.text);
    expect(texts).toContain('Salom\nDunyo'); expect(texts).toContain('Belgilar'); expect(texts).toContain('Bekat'); expect(texts).not.toContain('Yashirin');
    const svg = pageSvg(p).svg; expect(svg).not.toMatch(/NaN|undefined/); expect(svg).toContain('Salom');
  });
  it('yaroqsiz kirish — boʻsh natija, xato yoʻq', () => {
    expect(convertMaketDoc(null).pages).toEqual([]); expect(convertItem({ t: 'line', pts: [] }, 'l')).toEqual([]);
  });
  it('yuborilgan materiallar → «Loyihadan»', () => {
    expect(matToInbox({ id: 'x', kind: 'svg', name: 'Kesim', src: 'data:image/svg+xml,<svg/>', aspect: 2 })).toMatchObject({ name: 'Kesim', w: 200, h: 100, kind: 'sheet' });
    expect(matToInbox({ id: 'design', kind: 'design', geojson: {} })).toBeNull();
  });
});
