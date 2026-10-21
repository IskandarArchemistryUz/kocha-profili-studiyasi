import { describe, it, expect, beforeAll } from 'vitest';
import GEOJ from '../../public/chizmadon/uz-geo.json';
import WORLDJ from '../../public/chizmadon/world.json';
import { setGeo, setWorld, resolve, locSearch, parseCoord, norm, interiorPt, autoNote, uzMini, worldMini, countryName, setLocLang, type Area } from '../../src/chizmadon/location';

beforeAll(() => { setGeo(JSON.parse(JSON.stringify(GEOJ))); setWorld(JSON.parse(JSON.stringify(WORLDJ)) as Area[]); });

describe('Chizmadon — loyiha hududi', () => {
  it('maʼlumot: 14 viloyat, tumanlar, 241 davlat', () => {
    const w = WORLDJ as unknown as Area[];
    expect((GEOJ as { r: unknown[] }).r).toHaveLength(14); expect((GEOJ as { d: unknown[] }).d.length).toBeGreaterThan(150); expect(w).toHaveLength(241);
  });
  it('qabul mezoni: «chilon» → Chilonzor tumani; «germ» → Germaniya', () => {
    expect(locSearch('chilon')[0].t).toBe('Chilonzor tumani');
    expect(locSearch('germ')[0].t).toBe('Germaniya');
    expect(locSearch('CHILON')[0].t).toBe('Chilonzor tumani');
    expect(locSearch("farg'ona").some(h => h.t === 'Fargʻona viloyati')).toBe(true);
    expect(locSearch('')).toEqual([]);
    expect(norm("Oʻzbekiston O'zbekiston")).toBe('ozbekiston ozbekiston');
  });
  it('qidiruv natijasi ichidagi nuqta oʻsha hududga tushadi', () => {
    const h = locSearch('chilon')[0], p = interiorPt(h.g), R = resolve(p[1], p[0]);
    expect(R.dis?.n).toBe('Chilanzar');
    const g = locSearch('germ')[0], q = interiorPt(g.g); expect(resolve(q[1], q[0]).country?.n).toBe('Germany');
  });
  it('koordinata: «41.31, 69.28», «-33.87, 151.21», «33.87 S, 151.21 E»', () => {
    expect(parseCoord('41.31, 69.28')).toEqual({ lat: 41.31, lon: 69.28 });
    expect(parseCoord('41,31 69,28')).toEqual({ lat: 41.31, lon: 69.28 });
    expect(parseCoord('33.87 S, 151.21 E')).toEqual({ lat: -33.87, lon: 151.21 });
    expect(parseCoord('-33.87, 151.21')).toEqual({ lat: -33.87, lon: 151.21 });
    expect(parseCoord('Toshkent')).toBeNull(); expect(parseCoord('95, 10')).toBeNull();
  });
  it('qabul mezoni: «-33.87, 151.21» → Avstraliya, janubiy yarim shar hisobi', () => {
    const R = resolve(-33.87, 151.21);
    expect(R.inside).toBe(false); expect(R.country?.n).toBe('Australia'); expect(R.cn).toBe('Avstraliya'); expect(R.south).toBe(true);
    expect(R.sumAlt).toBeCloseTo(90 - Math.abs(-33.87 + 23.44), 6);   // mahalliy yoz — 22-dekabr
    expect(R.sumLen).toBeGreaterThan(R.winLen);
    expect(autoNote(R)).toContain('Shimoliy fasadda');
    const T = resolve(41.31, 69.28); expect(T.south).toBe(false); expect(autoNote(T)).toContain('Janubiy fasadda');
  });
  it('mini xaritalar: bosilgan nuqta → koordinata (teskari proyeksiya)', () => {
    const R = resolve(41.31, 69.28);
    const u = uzMini(R); expect(u.svg).toContain('<circle');
    const back = u.pick(0.5, 0.5); expect(resolve(back.lat, back.lon).inside).toBe(true);
    const w = worldMini(R); expect(w.svg.length).toBeGreaterThan(10000);
    const s = w.pick((151.21 + 180) / 360, (84 + 33.87) / 142); expect(s.lat).toBeCloseTo(-33.87, 1); expect(s.lon).toBeCloseTo(151.21, 1);
  });
  it('davlat nomi tilga qarab', () => {
    expect(countryName('Germany', 'uz')).toBe('Germaniya'); expect(countryName('Germany', 'en')).toBe('Germany'); expect(countryName('Germany', 'ru')).toBe('Германия');
    setLocLang('ru'); expect(resolve(-33.87, 151.21).cn).toBe('Австралия'); expect(locSearch('герм')[0].t).toBe('Германия'); setLocLang('uz');
  });
});
