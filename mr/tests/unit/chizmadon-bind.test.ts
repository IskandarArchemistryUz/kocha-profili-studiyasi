import { describe, it, expect } from 'vitest';
import { bindXf, xformEl, rebase, anchorFor, reanchor, bindTo, xfAttr, centerOf } from '../../src/chizmadon/bind';
import type { ChEl } from '../../src/chizmadon/model';
import { bbox } from '../../src/chizmadon/model';

const big = { x: 100, y: 50, w: 200, h: 150 }, small = { x: 10, y: 10, w: 50, h: 40 }, page = { x: 0, y: 0, w: 420, h: 297 };
const arrow = (): ChEl => ({ id: 'a', t: 'arrow', layer: 'l', pts: [[150, 100], [250, 160]], style: { stroke: '#000', width: 0.8, head: 'end' } });
const icon = (): ChEl => ({ id: 'i', t: 'icon', layer: 'l', x: 190, y: 115, w: 20, h: 20, icon: 'bekat', style: { stroke: '#2f6da8' } });
const rect = (): ChEl => ({ id: 'r', t: 'rect', layer: 'l', x: 120, y: 60, w: 40, h: 30, rot: 30, style: { fill: '#8cc47a', width: 0.5 } });
const text = (): ChEl => ({ id: 't', t: 'text', layer: 'l', x: 200, y: 180, w: 30, h: 6, text: 'A', style: { size: 12 } });

describe('Chizmadon — bogʻlash matematikasi', () => {
  it('bindXf: r0 = F — oʻzgarishsiz; kichik katakka — sc = min(F.w/r0.w, F.h/r0.h)', () => {
    expect(bindXf(big, big).id).toBe(true); expect(xfAttr(bindXf(big, big))).toBe('');
    const t = bindXf(big, small);
    expect(t.sc).toBeCloseTo(Math.min(50 / 200, 40 / 150)); expect(t.c0).toEqual([200, 125]); expect(t.c1).toEqual([35, 30]);
    expect(xfAttr(t)).toMatch(/^translate\(35 30\) scale\(0\.25\) translate\(-200 -125\)$/);
  });
  it('xformEl: markaz F markaziga, oʻlcham, qalinlik va shrift mutanosib', () => {
    const t = bindXf(big, small), a = arrow(), i = icon(), x = text();
    [a, i, x].forEach(e => xformEl(e, t));
    expect(a.pts![0]).toEqual([35 + (150 - 200) * 0.25, 30 + (100 - 125) * 0.25]); expect(a.style.width).toBeCloseTo(0.2);
    expect(i.w).toBeCloseTo(5); expect(centerOf(i)[0]).toBeCloseTo(35); expect(centerOf(i)[1]).toBeCloseTo(30);
    expect(x.style.size).toBeCloseTo(3);
  });
  it('anchorFor: markaz tushgan eng kichik katak; tashqarida — varaq', () => {
    const cells = [{ el: 'map', r: big }, { el: 'leg', r: { x: 180, y: 100, w: 40, h: 40 } }];
    expect(anchorFor(icon(), 2, cells, page)).toEqual({ el: 'leg', pi: 2, r0: { x: 180, y: 100, w: 40, h: 40 } });
    expect(anchorFor(arrow(), 0, cells, page).el).toBe('leg'); // markaz (200;130) kichik katakda
    expect(anchorFor(rect(), 0, cells, page).el).toBe('map');
    const far: ChEl = { ...icon(), x: 380, y: 260 };
    expect(anchorFor(far, 1, cells, page)).toEqual({ el: null, pi: 1, r0: page });
  });
  it('qabul mezoni: xarita ustidagi oʻq, belgi va toʻrtburchak — xarita boshqa varaqning kichik katagiga koʻchsa, birga koʻchadi va kichrayadi', () => {
    const cells = [{ el: 'loc1', r: big }];
    const els = [arrow(), icon(), rect()];
    els.forEach(e => { e.a = anchorFor(e, 0, cells, page); });
    expect(els.every(e => e.a!.el === 'loc1')).toBe(true);
    const rel0 = els.map(e => { const c = centerOf(e); return [(c[0] - big.x) / big.w, (c[1] - big.y) / big.h]; });
    // xarita 3-varaqdagi kichik katakka koʻchdi
    els.forEach(e => rebase(e, small));
    els.forEach((e, k) => {
      const c = centerOf(e);
      // katak ichida, nisbiy joyi (uzun tomon boʻyicha sigʻdirilgan) saqlanadi
      expect(c[0]).toBeGreaterThanOrEqual(small.x); expect(c[0]).toBeLessThanOrEqual(small.x + small.w);
      expect(c[1]).toBeGreaterThanOrEqual(small.y); expect(c[1]).toBeLessThanOrEqual(small.y + small.h);
      const sc = 0.25, ex = 35 + (rel0[k][0] * big.w + big.x - 200) * sc, ey = 30 + (rel0[k][1] * big.h + big.y - 125) * sc;
      expect(c[0]).toBeCloseTo(ex); expect(c[1]).toBeCloseTo(ey);
      expect(e.a!.r0).toEqual(small);
    });
    expect(els[2].rot).toBe(30); // burilish saqlanadi
    const b = bbox(els[2]); expect(b[2] - b[0]).toBeCloseTo(10); // 40 × 0,25
  });
  it('qabul mezoni: varaqqa bogʻlangan shakl A3 → A1 da nisbiy joyini saqlaydi; qaytsa — aslidek', () => {
    const e = icon(); e.a = { el: null, pi: 0, r0: page };
    const A1 = { x: 0, y: 0, w: 841, h: 594 };
    rebase(e, A1);
    const c = centerOf(e); expect(c[0] / A1.w).toBeCloseTo(200 / 420, 2); expect(c[1] / A1.h).toBeCloseTo(125 / 297, 2);
    rebase(e, page); expect(e.x).toBeCloseTo(190, 1); expect(e.w).toBeCloseTo(20, 1); // A1 nisbati 1,416 — A3 1,414: ±0,03 mm
  });
  it('reanchor: qulflangan — turi saqlanadi; qulfsiz — yangi joyga qayta bogʻlanadi', () => {
    const cells = [{ el: 'map', r: big }];
    const e = icon(); bindTo(e, 0, cells, page, 'page'); expect(e.a).toMatchObject({ el: null, lock: true });
    reanchor(e, 0, cells, page); expect(e.a!.el).toBeNull();
    const f = icon(); f.a = anchorFor(f, 0, cells, page); f.x = 400; f.y = 280; reanchor(f, 0, cells, page); expect(f.a!.el).toBeNull();
    const g: ChEl = { ...icon(), x: 380, y: 260 }; expect(bindTo(g, 0, cells, page, 'el')).toBe(false);
  });
  it('qator va zona oʻlchamlari ham mutanosib', () => {
    const row: ChEl = { id: 'q', t: 'row', layer: 'l', pts: [[110, 60], [290, 60]], row: { kind: 'tree', gap: 8, size: 6 }, style: {} };
    const zone: ChEl = { id: 'z', t: 'zone', layer: 'l', pts: [[110, 60], [200, 60], [150, 120]], style: { halo: 6 } };
    const t = bindXf(big, small); xformEl(row, t); xformEl(zone, t);
    expect(row.row).toMatchObject({ gap: 2, size: 1.5 }); expect(zone.style.halo).toBeCloseTo(1.5);
  });
});
