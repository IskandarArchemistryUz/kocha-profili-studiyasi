import { describe, it, expect, beforeAll } from 'vitest';
// @ts-ignore — node modullari (faqat test)
import { readFileSync } from 'fs';
import { importJSON } from '../../src/storage/db';
import { derive } from '../../src/core/derive';
import { RULES } from '../../src/norms/rules';

/** 11.11 (L5, video yozishda): namunada 10-qadamda yongʻin-qutqaruv texnikasi yoʻli qatori yoʻq edi (fire-666 faqat H ≥ 28 m) */
let I: typeof import('../../src/i18n');
beforeAll(async () => { (globalThis as any).document = { documentElement: {} }; I = await import('../../src/i18n'); });
describe('fire-666-low', () => {
  it('namuna: 28 m dan past binolar tekshiriladi, natija na emas; izoh 10 tilda', () => {
    const p = importJSON(readFileSync('../data/namuna-mahalla.archemistry.json', 'utf8'), () => 'p_x');
    const r = RULES.find(x => x.id === 'fire-666-low')!, v = r.evaluate(derive(p), p);
    expect(v.status).not.toBe('na');
    expect(['pass', 'review']).toContain(v.status);
    expect(Number(v.limit)).toBeGreaterThan(0);
    if (v.status === 'review') expect(v.where?.bids?.length).toBeGreaterThan(0);
    I.setLang('en');
    expect(I.tr(r.title)).toBe('Fire and rescue vehicle access (one long side, H < 28 m)');
    const en = I.tr(v.note!);
    expect(en).toMatch(/^A multi-apartment building lower than 28 m must be reachable/);
    expect(en).not.toMatch(/Tekshiruv|binoning|TALQIN|Uchastka/);
    I.setLang('uz');
  });
  it('koʻchasiz loyiha: bino yetib borilmaydi — koʻrib chiqish', () => {
    const p = importJSON(readFileSync('../data/namuna-mahalla.archemistry.json', 'utf8'), () => 'p_x');
    const q = { ...p, streets: [] }, v = RULES.find(x => x.id === 'fire-666-low')!.evaluate(derive(q), q);
    expect(v.status).toBe('review');
  });
});
