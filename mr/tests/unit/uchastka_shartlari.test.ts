import { describe, it, expect, beforeAll } from 'vitest';
// @ts-ignore — node modullari (faqat test)
import { readFileSync } from 'fs';
import { importJSON } from '../../src/storage/db';
import { derive } from '../../src/core/derive';
import { siteCondResults } from '../../src/norms/sitecond';
import { cleanSiteCond, siteCondCount } from '../../src/norms/sets';
import { bLevels } from '../../src/core/levels';

/** 12.11 (meʼyorlar toʻplami, 3-bosqich, 1-band): «Uchastka shartlari» — kiritilgan raqam majburiy tekshiruvga aylanadi */
let I: typeof import('../../src/i18n');
beforeAll(async () => { (globalThis as any).document = { documentElement: {} }; I = await import('../../src/i18n'); });
const load = () => importJSON(readFileSync('../data/namuna-mahalla.archemistry.json', 'utf8'), () => 'p_x');
describe('uchastka shartlari', () => {
  it('cleanSiteCond: notoʻgʻri qiymatlar tashlanadi, boʻsh — undefined', () => {
    expect(cleanSiteCond(undefined)).toBeUndefined();
    expect(cleanSiteCond({ far: -1, cover: 'x' })).toBeUndefined();
    expect(cleanSiteCond({ far: 2.5, hMax: 1e6, parkMin: 1, parkMax: 0.5, src: '  Zona R4, 12-modda ' })).toEqual({ far: 2.5, parkMin: 1, src: 'Zona R4, 12-modda' });
    expect(siteCondCount({ far: 2, gap: 10, src: 'x' })).toBe(2);
  });
  it('shart yoʻq — natija yoʻq; har shart — alohida qoida', () => {
    const p = load();
    expect(siteCondResults(derive(p), p)).toEqual([]);
    const q = { ...p, settings: { ...p.settings, siteCond: { far: 99, cover: 99, hMax: 400, gap: 0, parkMin: 0, green: 0, src: 'Brif 1-ilova' } } };
    const rs = siteCondResults(derive(q), q);
    expect(rs.map(r => r.id).sort()).toEqual(['site-cover', 'site-far', 'site-gap', 'site-green', 'site-h', 'site-park']);
    expect(rs.every(r => r.status === 'pass')).toBe(true);
    expect(rs[0].source.doc).toBe('Brif 1-ilova');
  });
  it('qattiq shartlar — mos emas, binolar koʻrsatiladi', () => {
    const p = load(), d0 = derive(p);
    const hi = Math.max(...p.buildings.map(b => bLevels(p.settings, b).top));
    const q = { ...p, settings: { ...p.settings, siteCond: { far: Math.max(0.05, d0.far / 2), hMax: Math.max(3, hi - 6), gap: 200, sbStreet: 60 } } };
    const rs = siteCondResults(derive(q), q), R = (id: string) => rs.find(r => r.id === id)!;
    expect(R('site-far').status).toBe('fail');
    expect(R('site-h').status).toBe('fail');
    expect(R('site-h').where?.bids?.length).toBeGreaterThan(0);
    expect(R('site-gap').status).toBe('fail');
    expect(['fail', 'na']).toContain(R('site-sb-street').status);
    I.setLang('en');
    expect(I.tr(R('site-h').title)).toBe('Height — site condition');
    expect(I.tr(R('site-gap').note!)).toMatch(/^Close pairs checked: \d+; attached buildings/);
    I.setLang('uz');
  });
});
