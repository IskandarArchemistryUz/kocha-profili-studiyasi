import { describe, it, expect } from 'vitest';
import { ctxProject, scoped, svcHref, projectHref, seedSite } from '../../src/core/projctx';

describe('loyiha konteksti (?p=)', () => {
  it('manzildan loyiha id; notoʻgʻri qiymat — yoʻq', () => {
    expect(ctxProject('?p=p_abc123def456')).toBe('p_abc123def456');
    expect(ctxProject('?embed=1&p=p_x1y2')).toBe('p_x1y2');
    expect(ctxProject('')).toBe(null);
    expect(ctxProject('?p=<script>')).toBe(null);
  });
  it('kalitlar loyihaga ajratiladi; alohida xizmatda — avvalgidek', () => {
    expect(scoped('joy-state', 'p_1234')).toBe('joy-state@p_1234');
    expect(scoped('joy-state', null)).toBe('joy-state');
  });
  it('xizmat manzili ?p= ni saqlaydi (hash va boshqa parametrlar bilan)', () => {
    expect(svcHref('./joyshunos.html', 'p_1234')).toBe('./joyshunos.html?p=p_1234');
    expect(svcHref('./kochasoz.html#/b', 'p_1234')).toBe('./kochasoz.html?p=p_1234#/b');
    expect(svcHref('./kochasoz.html?embed=1#/b', 'p_1234')).toBe('./kochasoz.html?embed=1&p=p_1234#/b');
    expect(svcHref('./render.html', null)).toBe('./render.html');
    expect(projectHref('p_1234')).toBe('./#/p/p_1234');
  });
  it('Joyshunos hududi loyiha uchastkasidan — faqat birinchi marta, [kenglik, uzunlik]', () => {
    const m = new Map<string, string>(); const st = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } };
    const ring: [number, number][] = [[69.2, 41.3], [69.21, 41.3], [69.21, 41.31]];
    expect(seedSite('p_1234', ring, st)).toBe(true);
    expect(JSON.parse(m.get('kps_site@p_1234')!).ring[0]).toEqual([41.3, 69.2]);
    expect(seedSite('p_1234', [[1, 1], [2, 2], [3, 3]], st)).toBe(false);   // foydalanuvchi oʻzgartirgani ustiga yozilmaydi
    expect(seedSite('p_9999', null, st)).toBe(false);
  });
});
