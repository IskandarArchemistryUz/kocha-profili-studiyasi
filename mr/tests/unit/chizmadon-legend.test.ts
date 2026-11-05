import { describe, it, expect } from 'vitest';
import { planWithLegend } from '../../src/chizmadon/materials';

const items = [{ type: 'fill', fill: '#f00', label: 'Aralash (pastki savdo)' }, { type: 'fill', fill: '#0f0', label: 'Park / bogʻ' }, { type: 'fill', fill: '#00f', label: 'Maktab' }];
const inter = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

describe('28-band: reja katagida shartli belgilar rejaning ustiga tushmaydi', () => {
  it('keng katak — reja chapda, belgilar oʻngda, kesishmaydi', () => {
    const r = { x: 10, y: 10, w: 200, h: 120 }, L = planWithLegend(items as never, r, 1);
    expect(L.legend).not.toBeNull(); expect(inter(L.plan, L.legend!)).toBe(0);
    expect(L.plan.w).toBeGreaterThan(0.55 * r.w - 1e-9);
  });
  it('baland tor katak — belgilar pastda', () => {
    const L = planWithLegend(items as never, { x: 0, y: 0, w: 70, h: 160 }, 1);
    expect(L.legend).not.toBeNull(); expect(inter(L.plan, L.legend!)).toBe(0); expect(L.legend!.y).toBeGreaterThan(L.plan.y + L.plan.h - 1e-9);
  });
  it('kichik katak — belgilar rejaning ustiga tushmaydi, reja ≥ 40 % (06.11: avval belgilar butunlay yoʻqolardi)', () => {
    const r = { x: 0, y: 0, w: 60, h: 40 }, L = planWithLegend(items as never, r, 1);
    expect(L.legend).not.toBeNull(); expect(inter(L.plan, L.legend!)).toBe(0); expect(L.plan.w * L.plan.h).toBeGreaterThan(0.4 * r.w * r.h - 1e-9);
  });
  it('juda kichik katak — faqat reja', () => {
    const r = { x: 0, y: 0, w: 24, h: 16 }, L = planWithLegend(items as never, r, 1);
    expect(L.legend).toBeNull(); expect(L.plan).toEqual(r);
  });
  it('uzun yozuv oʻraladi — quti katakdan chiqmaydi (06.11: «Relyef yuklanmagan…» belgisi joy topmasdi)', () => {
    const long = [{ type: 'fill', fill: '#fff', label: 'Relyef yuklanmagan — 1-qadamda atrofni yuklang (relyef qatlami bilan)' }];
    const r = { x: 0, y: 0, w: 120, h: 90 }, L = planWithLegend(long as never, r, 1);
    expect(L.legend).not.toBeNull(); expect(inter(L.plan, L.legend!)).toBe(0);
    expect(L.legend!.x + L.legend!.w).toBeLessThanOrEqual(r.x + r.w + 1e-9); expect(L.lay!.lines[0].length).toBeGreaterThan(1);
  });
});
