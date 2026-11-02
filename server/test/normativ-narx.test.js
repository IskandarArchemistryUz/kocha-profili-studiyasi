import { describe, it, expect } from 'vitest';
import { abOf, combineK, normativeCost, supervisionCost, catalog, NormError } from '../src/normativ-narx.js';

describe('normativ narx — jadvallar', () => {
  it('BRL / master reja: chegaralar shu jumladan', () => {
    expect(abOf('brl', 3)).toBe(633);
    expect(abOf('brl', 30)).toBe(633);
    expect(abOf('brl', 30.01)).toBe(778);
    expect(abOf('brl', 100)).toBe(1115);
    expect(abOf('brl', 600)).toBe(2921);
  });
  it('qishloq BRL 20 ga dan past — jadvalda yoʻq', () => {
    expect(abOf('qishloqBrl', 15)).toBeNull();
    expect(abOf('qishloqBrl', 25)).toBe(343);
  });
  it('bosh reja aholi boʻyicha', () => {
    expect(abOf('boshReja', 0.8)).toBe(368);
    expect(abOf('boshReja', 120)).toBe(3223);
  });
});

describe('normativ narx — koeffitsiyentlar (6-band)', () => {
  it('faqat kasr qismlari qoʻshiladi', () => {
    expect(combineK([1.3, 1.15, 1.25])).toBe(1.7);
    expect(combineK([])).toBe(1);
  });
  it('bir guruhdan ikkitasi — xato', () => {
    expect(() => normativeCost({ type: 'brl', value: 10, factors: ['toshkent', 'viloyat'] })).toThrow(NormError);
    expect(() => normativeCost({ type: 'brl', value: 10, factors: ['m500', 'm1000'] })).toThrow(NormError);
  });
  it('turga tegishli boʻlmagan koeffitsiyent — xato', () => {
    expect(() => normativeCost({ type: 'brl', value: 10, factors: ['qisqartirilgan'] })).toThrow(NormError);
  });
});

describe('normativ narx — hisob', () => {
  it('10 ga master reja, koeffitsiyentsiz: 633 × 440 000 × 1,12', () => {
    const r = normativeCost({ type: 'brl', value: 10 });
    expect(r.base).toBe(311942400);
    expect(r.main).toBe(311942400);
    expect(r.qqs).toBe(Math.round(311942400 * 0.12));
  });
  it('10 ga Toshkent: ×1,3', () => {
    expect(normativeCost({ type: 'brl', value: 10, factors: ['toshkent'] }).main).toBe(Math.round(311942400 * 1.3));
  });
  it('Toshkent + seysmik + M 1:1000 → K = 1,70', () => {
    const r = normativeCost({ type: 'brl', value: 16, factors: ['toshkent', 'seysmik', 'm1000'] });
    expect(r.K).toBe(1.7);
    expect(r.main).toBe(Math.round(311942400 * 1.7));
    expect(r.flags.some(f => f.what === 'K')).toBe(true);
  });
  it('ikki bosqich: ×1,25, 32 / 68 %', () => {
    const r = normativeCost({ type: 'brl', value: 10, twoStage: true });
    expect(r.main).toBe(Math.round(311942400 * 1.25));
    expect(r.stages.konsepsiya + r.stages.asosiy).toBeCloseTo(r.main, -1);
  });
  it('qoʻshimcha ishlar — ulush sifatida', () => {
    const r = normativeCost({ type: 'brl', value: 10, extras: ['ekologiyaBrl', 'taqdimot'] });
    expect(r.extras.map(e => e.uzs)).toEqual([Math.round(311942400 * 0.15), Math.round(311942400 * 0.1)]);
    expect(r.net).toBe(Math.round(311942400 * 1.25));
  });
  it('BHM va KIS ni chaqiruvchi beradi', () => {
    const r = normativeCost({ type: 'brl', value: 10, bhm: 412000, kis: 1 });
    expect(r.main).toBe(633 * 412000);
    expect(r.flags[0].flag).toBe('FOYDALANUVCHI');
  });
  it('notoʻgʻri kirish', () => {
    expect(() => normativeCost({ type: 'xyz', value: 1 })).toThrow(NormError);
    expect(() => normativeCost({ type: 'brl', value: -1 })).toThrow(NormError);
    expect(() => normativeCost({ type: 'qishloqBrl', value: 10 })).toThrow(NormError);
  });
});

describe('mualliflik nazorati va katalog', () => {
  it('50 ming kishigacha, 4 marta', () => {
    expect(supervisionCost({ population: 30000, times: 4 }).uzs).toBe(Math.round(120 * 440000 * 1.12 * 4));
  });
  it('katalog — hamma turlar', () => {
    const c = catalog();
    expect(Object.keys(c.types)).toEqual(['brl', 'shaharTarhi', 'qishloqBrl', 'boshReja', 'qishloqSxema', 'sanoat']);
    expect(c.types.brl.factors.toshkent.k).toBe(1.3);
  });
});
