import { describe, it, expect } from 'vitest';
import { sheetSvg, SHEET_DEFAULT, type SheetCtx, type SheetOpts } from '../../src/core/sheet';
import { blankProject, migrate, type Project } from '../../src/core/doc';
import { apply } from '../../src/core/commands';
import { frame, type XY } from '../../src/core/geo';
import { GSTYLES, gstyleById, useColorOf, PARCEL_GREY, treeAt } from '../../src/core/gstyle';
import { USES } from '../../src/core/uses';
import { TREES } from '../../src/chizmadon/catalog';
import { normDoc } from '../../src/chizmadon/model';

/** c74 (egasi 06.11): grafika shablonlari — sukut (joriy) koʻrinish oʻzgarmaydi, palitra barcha varaqlarda, kulrang parsellar, daraxt belgilari */
const rect = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
function project(): Project {
  const p = blankProject('Sinov'); const fr = frame(p.origin);
  p.site = { rings: [rect(-100, -80, 100, 80).map(fr.toGeo)] };
  p.streets = [{ id: 's', axis: [[-100, 0], [100, 0]].map(q => fr.toGeo(q as XY)), profile: 'mahalla-15' }];
  p.zones = [{ id: 'z1', at: fr.toGeo([0, 40]), use: 'turar' }, { id: 'z2', at: fr.toGeo([0, -40]), use: 'maktab' }];
  p.buildings = [{ id: 'b', footprint: rect(-30, 20, 30, 34).map(fr.toGeo), floors: 9, nonRes: 1, use: 'turar' }];
  return p;
}
const ctx: SheetCtx = { buildings: [{ id: 1, rings: [rect(150, 0, 170, 20)], h: 30 }], roads: [{ id: 7, pts: [[-300, 120], [300, 120]], w: 12, cls: 'secondary' }], rails: [], water: [], waterways: [], green: [], trees: [[130, -60], [140, -70]] };
const opts = (o: Partial<SheetOpts> = {}): SheetOpts => ({ ...SHEET_DEFAULT, ...o, show: { ...SHEET_DEFAULT.show, ...(o.show ?? {}) } });
const D = new Date('2026-11-07T10:00:00Z');
const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');

describe('Grafika shablonlari', () => {
  it('kamida 5 ta shablon + asl; firma nomi yoʻq; har shablonda 21 funksiya rangi', () => {
    expect(GSTYLES[0].id).toBe('joriy');
    expect(GSTYLES.length).toBeGreaterThanOrEqual(6);
    for (const g of GSTYLES.slice(1)) {
      expect(Object.keys(g.uses!).sort()).toEqual(USES.map(u => u.id).sort());
      for (const c of Object.values(g.uses!)) expect(c).toMatch(/^#[0-9a-f]{6}$/);
      expect(g.trees!.fills.length).toBeGreaterThan(2); expect(g.trees3d!.length).toBeGreaterThan(2);
    }
    const names = GSTYLES.map(g => `${g.name} ${g.note}`).join(' ');
    expect(names).not.toMatch(/KCAP|OMA|MVRDV|BIG|Gehl|West 8|SOM|Foster|Zaha|Snøhetta|Arup|Sasaki/i);
  });
  it('sukut (shablonsiz) va «joriy» — bir xil SVG (mavjud loyihalar koʻrinishi oʻzgarmaydi)', () => {
    for (const kind of ['bosh', 'zona', 'parsel', 'transport', 'landshaft'] as const) {
      const a = sheetSvg(project(), ctx, opts({ kind }), D).svg, b = sheetSvg(project(), ctx, opts({ kind, gstyle: 'joriy' }), D).svg;
      expect(b).toBe(a);
    }
  });
  it('shablon palitrasi zonalashtirish, parsellar, funksional reja varaqlarida; legend tuzilishi oʻzgarmaydi', () => {
    for (const g of GSTYLES.slice(1)) {
      const z0 = sheetSvg(project(), ctx, opts({ kind: 'zona' }), D), z = sheetSvg(project(), ctx, opts({ kind: 'zona', gstyle: g.id }), D);
      expect(z.legend.map(l => [l.type, l.label])).toEqual(z0.legend.map(l => [l.type, l.label]));
      const p = sheetSvg(project(), ctx, opts({ kind: 'parsel', gstyle: g.id }), D);
      expect(p.svg).toContain(`fill="${g.uses!.maktab}"`);
      expect(p.legend.find(l => /Maktab/.test(l.label))!.fill).toBe(g.uses!.maktab);
      const f = sheetSvg(project(), ctx, opts({ kind: 'bosh', gstyle: g.id, layers: { bld: { fill: 'use' } } }), D);
      expect(f.svg).toContain(`fill="${g.uses!.turar}"`);
      // atrof — shablonning och rangi va kontur
      expect(f.svg).toMatch(new RegExp(`id="Atrof_binolar"[^]*?fill="${g.ctx!.bld}"`));
    }
  });
  it('parsellar: «bir xil kulrang» varianti — bitta rang, bitta shartli belgi', () => {
    const r = sheetSvg(project(), ctx, opts({ kind: 'parsel', parcel: 'kulrang' }), D);
    const par = r.svg.match(/id="Parsellar"[^]*?<\/g>/)![0];
    expect(par.match(/fill="#[0-9a-f]{6}"/g)!.every(x => x === `fill="${PARCEL_GREY}"`)).toBe(true);
    expect(r.legend.filter(l => l.fill === PARCEL_GREY)).toHaveLength(1);
    expect(r.plots.every(p => p.full === PARCEL_GREY)).toBe(true);
  });
  it('2D daraxtlar: katalog toj shakllari, och yashil ranglar (shablonda); sukutda — doiralar', () => {
    const p = project(); p.settings.yards = true;
    const g = gstyleById('pastel'), s = sheetSvg(p, ctx, opts({ kind: 'bosh', gstyle: 'pastel' }), D).svg;
    const at = s.match(/id="Atrof_daraxtlar"[^]*?<\/g>/)![0];
    expect(g.trees!.fills.some(c => at.includes(`fill="${c}"`))).toBe(true);
    expect(at).toContain(`stroke="${g.trees!.stroke}"`);
    // tur barqaror va katalogdan
    expect(TREES[treeAt(130, -60)]).toBeDefined(); expect(treeAt(130, -60)).toBe(treeAt(130, -60));
    const s0 = sheetSvg(p, ctx, opts({ kind: 'bosh' }), D).svg.match(/id="Atrof_daraxtlar"[^]*?<\/g>/)![0];
    expect(s0).toMatch(/^id="Atrof_daraxtlar"[^>]*><circle/); expect(s0).not.toContain("<ellipse");
  });
  it('chiziq qalinligi: «Grafik kontrast» binolar konturi qalinroq', () => {
    const w = (gs?: string) => Number(sheetSvg(project(), ctx, opts({ kind: 'bosh', gstyle: gs }), D).svg.match(/id="Yangi_binolar"[^]*?stroke-width="([\d.]+)"/)![1]);
    expect(w('kontrast')).toBeGreaterThan(w());
    expect(w('pastel')).toBeLessThan(w());
  });
  it('tanlov loyihada saqlanadi: sahna shabloni (doc.gstyle), varaq (opts), albom (auto.gstyle)', () => {
    const p = apply(project(), { type: 'setGStyle', id: 'mono' });
    expect(p.gstyle).toBe('mono');
    expect(migrate(JSON.parse(JSON.stringify(p))).gstyle).toBe('mono');
    expect(apply(p, { type: 'setGStyle', id: 'joriy' }).gstyle).toBeUndefined();
    expect(migrate(JSON.parse(JSON.stringify({ ...p, gstyle: 'yoq' }))).gstyle).toBeUndefined();
    const ch = normDoc({ v: 2, auto: { gstyle: 'pastel' } });
    expect(ch.auto.gstyle).toBe('pastel');
    expect(normDoc({ v: 2, auto: {} }).auto.gstyle).toBeUndefined();
    expect(hex(useColorOf(null, 'turar'))).toBe(hex(USES[0].color));
  });
});
