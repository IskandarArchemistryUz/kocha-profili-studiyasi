import { describe, it, expect } from 'vitest';
import { sheetSvg, parcelRows, SHEET_DEFAULT, SHEET_KINDS, type SheetCtx, type SheetOpts } from '../../src/core/sheet';
import { blankProject, type Project } from '../../src/core/doc';
import { frame, type XY } from '../../src/core/geo';

/** 06.11: «Parsellar rejasi» varagʻi — parsellar toʻliq rangda, binolarsiz; koʻcha hududi; parsellar jadvali (ga, %) */
const rect = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
function project(): Project {
  const p = blankProject('Sinov'); const fr = frame(p.origin);
  p.site = { rings: [rect(-100, -80, 100, 80).map(fr.toGeo)] };
  p.streets = [{ id: 's', axis: [[-100, 0], [100, 0]].map(q => fr.toGeo(q as XY)), profile: 'mahalla-15' }];
  p.zones = [{ id: 'z1', at: fr.toGeo([0, 40]), use: 'turar' }, { id: 'z2', at: fr.toGeo([0, -40]), use: 'yashil' }];
  p.buildings = [{ id: 'b', footprint: rect(-30, 20, 30, 34).map(fr.toGeo), floors: 9, nonRes: 1, use: 'turar' }];
  return p;
}
const ctx: SheetCtx = { buildings: [{ id: 1, rings: [rect(150, 0, 170, 20)], h: 30 }], roads: [], rails: [], water: [], waterways: [], green: [], trees: [[130, -60]] };
const opts = (o: Partial<SheetOpts> = {}): SheetOpts => ({ ...SHEET_DEFAULT, ...o, show: { ...SHEET_DEFAULT.show, ...(o.show ?? {}) } });

describe('Parsellar rejasi varagʻi', () => {
  it('namuna roʻyxatida Zonalashtirishdan keyin', () => {
    const ids = SHEET_KINDS.map(k => k.id);
    expect(ids.indexOf('parsel')).toBe(ids.indexOf('zona') + 1);
  });
  it('parsellar toʻliq rangda, binolar va daraxtlarsiz; koʻcha hududi, qizil chiziq, jadval', () => {
    const svg = sheetSvg(project(), ctx, opts({ kind: 'parsel' })).svg;
    expect(svg).toContain('id="Parsellar"');
    expect((svg.match(/id="Parsellar"[^]*?<\/g>/)?.[0].match(/<path/g) ?? []).length).toBe(2);
    for (const id of ['Yangi_binolar', 'Hovlilar', 'Kocha_daraxtlari', 'Atrof_daraxtlar', 'Qavatlar_soni']) expect(svg).not.toContain(`id="${id}"`);
    expect(svg).toContain('id="Qizil_chiziqlar"');
    expect(svg).toContain('fill="#f6dcd8"');
    expect(svg).toContain('id="Parsellar_jadvali"');
    expect(svg).toMatch(/id="Atrof_binolar"[^>]*opacity="0.45"/);
    // zonalashtirishda binolar qoladi (oʻzgarmagan)
    expect(sheetSvg(project(), ctx, opts({ kind: 'zona' })).svg).toContain('id="Yangi_binolar"');
  });
  it('jadval: parsellar ulushi, koʻchalar va loyihalash hududi 100 %', () => {
    const p = project();
    const rows = parcelRows(p, [{ code: 'D-1', use: 'Turar joy', color: '#fff', ha: 0.6, level: 3 }, { code: 'D-2', use: 'Park', color: '#fff', ha: 0.6, level: 3 }]);
    const tot = rows.find(r => r.t === 'Parsellar jami')!;
    expect(tot.v).toBeCloseTo(1.2, 5);
    expect(rows.at(-1)!.p).toBe('100,0 %');
    expect(rows.at(-1)!.v).toBeCloseTo(3.2, 1);   // 200 × 160 m
    expect(rows.find(r => r.t === 'Koʻchalar va boshqa')!.v).toBeCloseTo(2.0, 1);
    expect(rows[0].p).toMatch(/^18,[78] %$/);
    expect(parcelRows(p, [])).toEqual([]);
  });
});
