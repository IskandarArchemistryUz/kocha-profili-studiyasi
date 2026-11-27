import { test, expect } from 'vitest';
// @ts-ignore
import { readFileSync } from 'node:fs';
import { BASE } from '../../src/bogshunos/assort';
import { SPECIES } from '../../src/bogshunos/species';
import { DSIL } from '../../src/bogshunos/odamlar';

/* tools/bogshunos/data — Bogʻshunos manba maʼlumotlari (loyiha hujjatlaridan koʻchirildi, 27.11.2026).
   Bu sinov ishlayotgan kod (assort.ts, species.ts, odamlar.ts) shu manbalar bilan mos ekanini tekshiradi. */
const D = new URL('../../../tools/bogshunos/data/', import.meta.url);
const read = (f: string) => readFileSync(new URL(f, D), 'utf8') as string;

function csv(t: string): string[][] {
  const rows: string[][] = [];
  for (const line of t.split('\n')) {
    if (!line.trim()) continue;
    const r: string[] = []; let cur = '', q = false;
    for (const ch of line) { if (ch === '"') q = !q; else if (ch === ',' && !q) { r.push(cur); cur = ''; } else cur += ch; }
    r.push(cur); rows.push(r);
  }
  return rows;
}

test('assort.ts BASE — 1979 II-A boyitilgan jadvaldagi qatorlar bilan mos', () => {
  const [h, ...rows] = csv(read('assortiment-1979-II-A-boyitilgan.csv'));
  const c = (k: string) => h.indexOf(k);
  expect(rows.length).toBe(153);
  for (const s of BASE) {
    const r = rows.find(x => x[c('lotincha')] === s.lat && x[c('lotincha_izoh')] === '' && x[c('II-A_Toshkent')] === '+')
      ?? rows.find(x => x[c('lotincha')] === s.lat && x[c('II-A_Toshkent')] === '+');
    expect(r, s.lat).toBeTruthy();
    expect([r![c('kattalik')], r![c('namlik_talabi')], r![c('shorga')], r![c('yoruglik')], r![c('umr')], r![c('osish')]], s.lat)
      .toEqual([s.size, s.water, s.salt, s.light, s.life, s.growth]);
    expect(r![c('guruh')], s.lat).toBe(s.g);
    const reg = r![c('Toshkent_reyestr_soni')];
    if (s.reg) expect(+reg, s.lat).toBe(s.reg);
  }
  // invaziv aylant jadvalda bor, ishchi roʻyxatda yoʻq
  expect(rows.some(x => x[c('lotincha')] === 'Ailanthus altissima')).toBe(true);
  expect(BASE.some(s => s.lat === 'Ailanthus altissima')).toBe(false);
});

test('species.ts nomlari — green.tashkent.uz turlar roʻyxatida bor', () => {
  const names = new Set(read('green-tashkent-turlar-14-11.tsv').split('\n').filter(Boolean).map(l => l.split('\t')[0]));
  expect(names.size).toBe(226);
  for (const k of Object.keys(SPECIES)) expect(names.has(k), k).toBe(true);
});

test('odamlar.ts siluetlari — DWG toʻplamidagi nusxa bilan bir xil', () => {
  const all = JSON.parse(read('odamlar-siluetlar-10.json'));
  const keys = Object.keys(all).filter(k => !k.startsWith('_'));
  expect(keys).toHaveLength(10);
  for (const [k, v] of Object.entries(DSIL)) expect(all[k], k).toEqual(v);
  for (const k of keys) { const s = all[k]; expect(s.d).toMatch(/^M[-\d. ML]+$/); expect(s.hm).toBeGreaterThan(1); }
});
