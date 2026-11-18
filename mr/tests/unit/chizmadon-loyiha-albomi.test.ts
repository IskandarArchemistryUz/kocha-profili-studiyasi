import { describe, it, expect, beforeAll } from 'vitest';
import GEOJ from '../../public/chizmadon/uz-geo.json';
import { familyById, paginate, seqRank, type Material } from '../../src/chizmadon/autolayout';
import { buildAlbum } from '../../src/chizmadon/album';
import { resolve, presets, setGeo } from '../../src/chizmadon/location';
import { siteMaterials } from '../../src/chizmadon/materials';

beforeAll(() => { setGeo(JSON.parse(JSON.stringify(GEOJ))); });

const M = (o: Partial<Material> & Pick<Material, 'id' | 'role'>): Material => ({ name: o.id, title: o.id, visible: true, accent: null, scale: 1, render: () => '<g/>', ...o });
const mats = (): Material[] => [
  M({ id: 'title', role: 'title' }),
  M({ id: 'loc0', role: 'locator', level: 0, render: undefined }), M({ id: 'loc1', role: 'locator', level: 1, render: undefined }), M({ id: 'loc2', role: 'locator', level: 2, render: undefined }),
  M({ id: 'legend', role: 'legend', render: undefined }), M({ id: 'pass', role: 'table', kind: 'passport', render: undefined }),
  M({ id: 'sun', role: 'chart', kind: 'sunpath', render: undefined }), M({ id: 'izoh', role: 'text', kind: 'note', render: undefined }), M({ id: 'day', role: 'chart', kind: 'daylight', render: undefined }),
  M({ id: 'p:plan:bosh', role: 'plan' }), M({ id: 'p:plan', role: 'plan' }), M({ id: 'p:plan:figura', role: 'plan' }),
  M({ id: 'p:plan:cheklov', role: 'plan' }), M({ id: 'p:balans', role: 'table', near: 'p:plan:cheklov' }),
  M({ id: 'p:plan:insol', role: 'plan' }),
  M({ id: 'p:apt:b1', role: 'plan', kind: 'floor' }), M({ id: 'p:aptnav:b1', role: 'locator', pair: 'p:apt:b1', level: 3, minor: true }), M({ id: 'p:aptx:b1', role: 'table', pair: 'p:apt:b1' }),
  M({ id: 'p:axo:oq', role: 'axon' }), M({ id: 'p:axo:fasad', role: 'axon' }),
  M({ id: 'p:cut:c1', role: 'section' }), M({ id: 'p:sec:s1', role: 'section' }),
  M({ id: 'p:tik', role: 'table', kind: 'tik' }),
  M({ id: 'i:r1', role: 'page' }),
];

describe('Chizmadon — «Loyiha albomi» (18.11)', () => {
  const fam = familyById('la');
  it('oila mavjud, ketma-ket sahifalanadi', () => { expect(fam.id).toBe('la'); expect(fam.seq).toBe(true); });
  it('1-varaq — muqova, 2-varaq — hudud: davlat, viloyat, tuman, quyosh yoʻli bitta varaqda', () => {
    const PG = paginate(fam, mats());
    expect(PG.pages[0].page.id).toBe('la-cover');
    expect([...PG.pages[0].assign.values()].map(e => e.id)).toEqual(['p:axo:fasad']);
    const site = PG.pages[1]; expect(site.page.id).toBe('la-site');
    const ids = [...site.assign.values()].map(e => e.id);
    for (const id of ['loc0', 'loc1', 'loc2', 'sun', 'day', 'pass', 'izoh']) expect(ids).toContain(id);
  });
  it('har reja, aksonometriya va kesim — alohida varaqda; jufti shu varaqda', () => {
    const PG = paginate(fam, mats());
    const one = (id: string) => PG.pages.filter(p => [...p.assign.values()].some(e => e.id === id));
    for (const id of ['p:plan:bosh', 'p:plan', 'p:plan:figura', 'p:axo:oq', 'p:cut:c1', 'p:sec:s1', 'p:tik', 'i:r1']) {
      const ps = one(id); expect(ps, id).toHaveLength(1);
      if (id !== 'p:tik') expect(ps[0].assign.size, id).toBe(1);
    }
    const ch = one('p:plan:cheklov')[0]; expect(ch.page.id).toBe('la-plan-t'); expect([...ch.assign.values()].map(e => e.id)).toContain('p:balans');
    const apt = one('p:apt:b1')[0]; expect(apt.page.id).toBe('la-apt'); expect([...apt.assign.values()].map(e => e.id).sort()).toEqual(['p:apt:b1', 'p:aptnav:b1', 'p:aptx:b1']);
    expect(one('i:r1')[0].page.id).toBe('la-page');
    expect(PG.left.filter(e => e.role !== 'legend')).toHaveLength(0);
  });
  it('tartib: rejalar → aksonometriya → kesimlar → tahlil → kvartirografiya → TIK → tayyor varaqlar', () => {
    const PG = paginate(fam, mats()), first = PG.pages.slice(2).map(p => [...p.assign.values()][0]);
    const r = first.map(seqRank); expect([...r].sort((a, b) => a - b)).toEqual(r);
  });
  it('SVG chiziladi (hamma format), NaN yoʻq', () => {
    const p = presets()[0], R = resolve(p.lat, p.lon), site = siteMaterials(() => R, {}), all = [...mats().filter(m => !site.some(s => s.id === m.id)), ...site];
    for (const fmt of fam.formats) { const A = buildAlbum({ fam, fmt, pal: 'arch', mats: all, R }); expect(A.pages[1].fill.page.id).toBe('la-site'); for (const ap of A.pages) expect(ap.svg, fmt).not.toMatch(/NaN|undefined|Infinity/); }
  });
});
