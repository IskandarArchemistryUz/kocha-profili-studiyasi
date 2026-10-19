import { describe, it, expect, beforeAll } from 'vitest';
import GEOJ from '../../public/chizmadon/uz-geo.json';
import { LAYOUTS } from '../../src/chizmadon/layouts';
import { buildAlbum, slotAt, setCustomPal } from '../../src/chizmadon/album';
import { siteMaterials, projectMaterials } from '../../src/chizmadon/materials';
import { setGeo, resolve, presets, autoNote, placeName } from '../../src/chizmadon/location';
import { PAL } from '../../src/chizmadon/sheet';

beforeAll(() => { setGeo(JSON.parse(JSON.stringify(GEOJ))); });

describe('Chizmadon — avtomatik albom', () => {
  it('Toshkent nuqtasi: viloyat va tuman topiladi, janubiy fasad tavsiyasi', () => {
    const P = presets(); expect(P.map(p => p.label)).toEqual(['Toshkent', 'Samarqand', 'Nukus', 'Jizzax', 'Chirchiq']);
    const R = resolve(P[0].lat, P[0].lon);
    expect(R.inside).toBe(true); expect(R.reg?.n).toBe('Tashkent'); expect(placeName(R)).toBe('Yakkasaroy tumani');
    expect(autoNote(R)).toMatch(/^Tush paytida quyosh yozda 72,\d°/); expect(autoNote(R)).toContain('Janubiy');
  });
  it('8 oila × hamma format: hudud materiallari bilan SVG xatosiz, chegaralar chiziladi', () => {
    const p = presets()[0], R = resolve(p.lat, p.lon), mats = siteMaterials(() => R, {});
    for (const f of LAYOUTS.families) for (const fmt of f.formats) {
      const A = buildAlbum({ fam: f, fmt, pal: f.pal ?? 'arch', mats, R });
      expect(A.pages.length, f.id).toBeGreaterThan(0);
      for (const ap of A.pages) { expect(ap.svg, `${f.id}/${fmt}`).not.toMatch(/NaN|undefined|Infinity/); expect(ap.cells.length).toBe(ap.fill.assign.size); }
      expect(A.pages.map(x => x.svg).join('')).toContain('data-el="loc0"');
    }
  });
  it('loyiha materiallari: bosh reja xarita katagiga, TIK jadvalga, sahna — renderga', () => {
    const p = presets()[0], R = resolve(p.lat, p.lon);
    const mats = [...siteMaterials(() => R, { temp: { visible: false } }), ...projectMaterials({ plan: { svg: '<rect width="100" height="80" fill="#cde"/>', vb: [0, 0, 100, 80], w: 100, h: 80, scale: 2000 }, tik: [['Maydon', 'ga', '12,9']], scene: 'data:image/png;base64,AA' }, {})];
    const A = buildAlbum({ fam: LAYOUTS.families.find(f => f.id === 'mr')!, fmt: 'A3L', pal: 'arch', mats, R });
    expect(A.PG.left.filter(m => m.role !== 'legend' && m.role !== 'text')).toEqual([]); // kichiklar (legenda, matn) joysiz qolishi mumkin — banner
    const where = (id: string) => A.pages.flatMap(ap => [...ap.fill.assign.entries()].filter(([, m]) => m.id === id).map(([k]) => ap.fill.page.slots[k].role))[0];
    expect(['map', 'map_small', 'figure', 'module']).toContain(where('p:plan')); expect(['table', 'kpi', 'checklist']).toContain(where('p:tik')); expect(['render', 'photo', 'figure']).toContain(where('p:scene'));
    expect(where('temp')).toBeUndefined();
  });
  it('slotAt: nuqta ostidagi katak; uslub: «Mening uslubim»', () => {
    const p = presets()[0], R = resolve(p.lat, p.lon), f = LAYOUTS.families.find(x => x.id === 'mr')!;
    const A = buildAlbum({ fam: f, fmt: 'A3L', pal: 'arch', mats: siteMaterials(() => R, {}), R });
    const c = A.pages[0].cells[0], hit = slotAt(A.pages[0], f, 'A3L', [c.r.x + c.r.w / 2, c.r.y + c.r.h / 2])!;
    expect(hit.r).toEqual(c.r);
    setCustomPal({ base: 'teal', over: { acc: '#123456' } }); expect(PAL.custom.acc).toBe('#123456'); expect(PAL.custom.ink).toBe(PAL.teal.ink);
    setCustomPal(null); expect(PAL.custom).toBeUndefined();
  });
});
