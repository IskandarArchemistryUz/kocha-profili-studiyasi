import { describe, it, expect } from 'vitest';
import { passportSheets, wrap, flowCards, type RepCard, type RepInput } from '../../src/joyshunos/report';

const card = (i: number, lines = 2): RepCard => ({ id: `c${i}`, name: `Karta ${i}`, color: '#c0643a', chip: 'OSM', beta: i === 1, big: `${i} ta`, text: Array.from({ length: lines }, () => 'Uzun matn '.repeat(8)), norms: [{ k: 'Maktab', v: '367 m', lim: '≤ 500 m', ok: true }], src: 'ShNQ 2.07.01-23, 38-jadval' });
const inp = (cards: RepCard[]): RepInput => ({ kicker: 'Joy pasporti', title: 'Amir Temur <21>', meta: '41.3, 69.3 · 500 m', map: { url: 'data:image/jpeg;base64,AA', mPerMm: 5, rose: '<circle r="2"/>', ringLabel: '500 m' }, legends: [{ title: 'Xizmatlar', items: [['#2f6da8', 'maktab']] }], cards,
  stamp: { org: 'Archemistry Lab', service: 'Joyshunos', placeL: 'Hudud', place: 'Amir Temur', authorL: 'Muallif', dateL: 'Sana', date: '2026-10-18', sheetL: 'Varaq', srcL: 'Manbalar', sources: 'OSM', note: 'Avtomatik' }, labels: { north: 'Sh', more: 'Davomi', noMap: 'yoʻq' } });

describe('Joyshunos · joy pasporti hisoboti (A3)', () => {
  it('matn boʻlinadi, soʻz kesilmaydi', () => { const l = wrap('bir ikki uch toʻrt besh olti', 10, 2.5); expect(l.length).toBeGreaterThan(1); expect(l.join(' ')).toBe('bir ikki uch toʻrt besh olti'); });
  it('A3 varaq: Illustrator qatlamlari, XML xavfsiz matn, masshtab chizgʻichi', () => {
    const [p] = passportSheets(inp([card(1), card(2)]));
    expect(p).toContain('viewBox="0 0 420 297"');
    for (const l of ['00 Sarlavha', '01 Xarita', '02 Shartli belgilar', '03 Pasport', '09 Shtamp']) expect(p).toContain(`inkscape:label="${l}"`);
    expect(p).toContain('Amir Temur &lt;21&gt;'); expect(p).toContain('BETA · OSM'); expect(p).toMatch(/>\d+ m<\/text>/);
    expect((p.match(/<g\b/g) ?? []).length).toBe((p.match(/<\/g>/g) ?? []).length);
  });
  it('koʻp karta — davomi varagʻi; Chizmadon uchun shtampsiz va kesilgan', () => {
    const many = Array.from({ length: 14 }, (_, i) => card(i, 5));
    const ps = passportSheets(inp(many));
    expect(ps.length).toBeGreaterThan(1); expect(ps[0]).toContain('Davomi'); expect(ps[1]).toContain(`2 / ${ps.length}`);
    const [c] = passportSheets(inp([card(1)]), true);
    expect(c).not.toContain('09 Shtamp'); expect(c).toMatch(/viewBox="0 0 420 2[3-6]\d"/);
  });
  it('ustunlar muvozanatli', () => {
    const f = flowCards([card(1), card(2), card(3), card(4)], 0, 0, 160, 220);
    const xs = [...f.svg.matchAll(/<g data-name="Karta \d"><rect x="([\d.]+)"/g)].map(m => +m[1]);
    expect(new Set(xs).size).toBe(2); expect(f.rest.length).toBe(0);
  });
});
describe('Joyshunos · hisobot ustunlari', () => {
  it('sigʻadigan kartalar keyingi varaqqa oʻtmaydi', () => {
    const cs = [card(1, 1), card(2, 2), card(3, 4), card(4, 1), card(5, 6)];
    expect(flowCards(cs, 0, 0, 168, 225).rest.length).toBe(0);
  });
});
