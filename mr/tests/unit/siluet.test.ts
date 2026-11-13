import { describe, it, expect } from 'vitest';
import { blankProject, migrate, type Project } from '../../src/core/doc';
import { frame } from '../../src/core/geo';
import { apply } from '../../src/core/commands';
import { silhouette, heightAt, nextSecLabel } from '../../src/core/siluet';
import { silSheet, silStats, SIL_STYLES } from '../../src/core/siluetsvg';
import type { SheetCtx } from '../../src/core/sheet';

/* 13.11 (egasi): master reja kesimi va fasadi atrof bilan */
function doc(): Project {
  let d = blankProject(); const fr = frame(d.origin), g = (x: number, y: number) => fr.toGeo([x, y]);
  const box = (x0: number, y0: number, x1: number, y1: number) => [g(x0, y0), g(x1, y0), g(x1, y1), g(x0, y1)];
  d = { ...d, site: { rings: [box(0, -50, 200, 100)] },
    buildings: [
      { id: 'kes', footprint: box(40, -10, 80, 10), floors: 9, nonRes: 0, use: 'turar' } as any,        // chiziq (y = 0) kesadi
      { id: 'ort', footprint: box(120, 30, 160, 45), floors: 16, nonRes: 0, use: 'turar' } as any,      // 30 m ortda
      { id: 'old', footprint: box(100, -40, 130, -20), floors: 5, nonRes: 0, use: 'turar' } as any,     // chiziq oldida — koʻrinmaydi
    ] };
  return apply(d, { type: 'setSections', sections: [{ id: 's1', a: g(-50, 0), b: g(250, 0), label: '1', look: 1, depth: 200 }] });
}
const ctx = (): SheetCtx => ({ buildings: [{ id: 7, rings: [[[180, 60], [240, 60], [240, 90], [180, 90]]], h: 12 }, { id: 8, rings: [[[0, 400], [20, 400], [20, 420], [0, 420]]], h: 30 }], roads: [], rails: [], water: [], waterways: [], green: [], trees: [[200, 50]] });

describe('Kesim va fasad (atrof bilan)', () => {
  it('kesilgan, ortdagi va atrof binolari; oldidagi va uzoqdagi kirmaydi', () => {
    const g = silhouette(doc(), ctx(), doc().sections![0])!;
    expect(g.L).toBeCloseTo(300, 3);
    const cut = g.items.filter(i => i.cut);
    expect(cut.map(i => i.id)).toEqual(['kes']);
    expect(cut[0].s0).toBeCloseTo(90, 3); expect(cut[0].s1).toBeCloseTo(130, 3);
    const ids = new Set(g.items.map(i => i.id));
    expect(ids.has('ort')).toBe(true); expect(ids.has('osm7')).toBe(true);
    expect(ids.has('old')).toBe(false); expect(ids.has('osm8')).toBe(false);     // oldida / 200 m dan uzoq
    expect(g.items.find(i => i.id === 'ort')!.d).toBeCloseTo(30, 3);
    expect(g.items.some(i => i.kind === 'daraxt')).toBe(true);
    expect(g.site.map(s => Math.round(s))).toEqual([50, 250]);                 // uchastka chegarasi
    // chizish tartibi: uzoqdan yaqinga, kesimlar oxirida
    const nc = g.items.filter(i => !i.cut); for (let i = 1; i < nc.length; i++) expect(nc[i - 1].d).toBeGreaterThanOrEqual(nc[i].d);
    expect(g.items[g.items.length - 1].cut).toBe(true);
  });
  it('koʻrish tomoni almashsa — oldidagi bino koʻrinadi, ortdagisi yoʻq', () => {
    const d = doc(), s = { ...d.sections![0], look: -1 as const };
    const ids = new Set(silhouette(d, ctx(), s)!.items.map(i => i.id));
    expect(ids.has('old')).toBe(true); expect(ids.has('ort')).toBe(false);
  });
  it('statistika va varaq', () => {
    const d = doc(), g = silhouette(d, ctx(), d.sections![0])!, st = silStats(g);
    expect(st.loyiha.n).toBe(2); expect(st.loyiha.fl).toBe(16); expect(st.atrof.max).toBe(12);
    const inner = silSheet(d, ctx(), 's1', s => s, 380, 220);
    expect(inner.name).toBe('Kesim va fasad 1–1');
    const svg = inner.body(0, 0, 380, 220);
    expect(svg).toContain('data-sil="loyiha-kesim"'); expect(svg).toContain('data-sil="atrof"'); expect(svg).toContain('data-sil-site');
    expect(inner.label).toMatch(/^M 1:\d+$/);
  });
  it('relyef: bilinear balandlik; hujjatda saqlanadi; raqamlash', () => {
    const g = { n: 2, step: 100, radius: 50, c0: [0, 0] as [number, number], h: [0, 10, 20, 30] };
    expect(heightAt(g, [0, 0])).toBeCloseTo(15, 6); expect(heightAt(g, [500, 0])).toBeNull();
    const d = doc(), m = migrate(JSON.parse(JSON.stringify(d)));
    expect(m.sections?.[0].depth).toBe(200); expect(m.sections?.[0].look).toBe(1);
    expect(nextSecLabel(d)).toBe('2');
  });
  it('orqa relyef (ufq), yerga oʻtirgan binolar, odamlar kesim ichida emas, shtaffaj siluetlari', () => {
    // relyef: chiziq (y = 0) da 0 m, ortda (y ≥ 30) 10 m — uzoqdagi bino ufq ustida turadi
    const n = 21, h: number[] = [];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) h.push(-200 + j * 20 >= 30 ? 110 : 100);
    const c = { ...ctx(), terrain: { n, step: 20, radius: 200, c0: [100, 0] as [number, number], h } };
    const d = doc(), g = silhouette(d, c, d.sections![0])!;
    expect(g.horizon.length).toBe(g.ground.length);
    g.horizon.forEach((p, i) => expect(p[1]).toBeGreaterThanOrEqual(g.ground[i][1] - 1e-9));
    expect(Math.max(...g.horizon.map(p => p[1]))).toBeCloseTo(10, 1);
    const ort = g.items.find(i => i.id === 'ort')!;
    expect(ort.z0).toBeGreaterThan(5);                                           // ortdagi bino tepalikda
    expect(g.people.length).toBeGreaterThan(0);
    const cut = g.items.filter(i => i.cut);
    for (const p of g.people) expect(cut.some(k => p.s > k.s0 && p.s < k.s1)).toBe(false);
    expect(g.items.filter(i => i.kind === 'daraxt').every(t => !!t.sp && t.h >= 7 && t.h <= 13)).toBe(true);
    const svg = silSheet(d, c, 's1', s => s, 380, 220).body(0, 0, 380, 220);
    expect(svg).toContain('data-sil="relyef-orqa"'); expect(svg).toContain('data-sil="daraxt"'); expect(svg).toContain('data-sil="odam"');
    // bir xil kirish — bir xil natija (barqaror tasodif)
    expect(silhouette(d, c, d.sections![0])!.people).toEqual(g.people);
  });
  it('uslublar (kanvas K-01…K-05): har biri chiziladi, oʻziga xos belgilar bilan', () => {
    const d = doc(), body = (st: any) => silSheet(d, ctx(), 's1', s => s, 380, 220, st).body(0, 0, 380, 220);
    expect(SIL_STYLES.map(x => x.id)).toEqual(['kesim', 'siluet', 'rangli', 'juft', 'aksent', 'shahar']);
    for (const x of SIL_STYLES) { const svg = body(x.id); expect(svg).toContain('data-sil-site'); expect(svg).toContain('data-sil="loyiha'); }
    expect(body('rangli')).toContain('data-sil="deraza"');                       // deraza ritmi
    expect(body('rangli')).not.toContain('data-sil="loyiha-kesim"');            // rangli fasadda kesim yoʻq
    expect(body('kesim')).toContain('data-sil="loyiha-kesim"');
    const j = body('juft'); expect(j).toContain('FASAD 1'); expect(j).toContain('KESIM 1–1'); expect(j).toContain('data-sil="deraza"'); expect(j).toContain('data-sil="loyiha-kesim"');
    expect(body('shahar')).toContain('data-sil="dominanta"');                    // 12 m atrof binosi
    expect(body('aksent')).toContain('#d4483b');
    expect(silSheet(d, ctx(), 's1', s => s, 380, 220, 'siluet').legend!.length).toBeGreaterThan(2);
  });
  it('relyef (×N) va tahlil qatlami (kanvas K-06, K-07)', () => {
    const n = 21, h: number[] = [];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) h.push(400 + (-100 + i * 20) * 0.05);   // sharqqa 5 % koʻtarilish
    const c = { ...ctx(), terrain: { n, step: 20, radius: 200, c0: [100, 0] as [number, number], h }, waterways: [{ pts: [[20, -30], [20, 30]] as [number, number][], w: 2 }] };
    const d = doc(), g = silhouette(d, c, d.sections![0])!;
    expect(g.zAbs).not.toBeNull(); expect(g.water.map(Math.round)).toEqual([70]);   // A = (−50, 0): 20 − (−50)
    const r = silSheet(d, c, 's1', s => s, 380, 220, 'kesim', { vex: 5 });
    expect(r.label).toMatch(/×5$/);
    const svg = r.body(0, 0, 380, 220);
    expect(svg).toContain('data-sil="relyef"'); expect(svg).toContain('data-sil="ariq"'); expect(svg).toContain('data-sil="nishab"'); expect(svg).toContain('+5 %');
    expect(svg).not.toContain('data-sil="loyiha-kesim"');                              // binolar faqat izi bilan
    // tahlil: chiziq sharq–gʻarb (azimut 90°) — quyosh proeksiyasi yoʻq, ogohlantirish bor; shamol yoʻq — xabar
    const t = silSheet(d, c, 's1', s => s, 380, 220, 'kesim', { tahlil: true }).body(0, 0, 380, 220);
    expect(t).not.toContain('data-sil="quyosh"'); expect(t).toContain('quyosh proeksiyasi koʻrsatilmaydi'); expect(t).toContain('iqlim maʼlumoti yuklanmagan'); expect(t).toContain('data-sil="suv"');
    // shimol–janub chizigʻi: quyosh, qishki soya, shamol
    const fr = frame(d.origin), G = (x: number, y: number) => fr.toGeo([x, y]);
    const d2 = apply(d, { type: 'setSections', sections: [{ id: 's2', a: G(60, -150), b: G(60, 150), label: '2', look: 1, depth: 200 }] });
    const t2 = silSheet(d2, c, 's2', s => s, 380, 220, 'kesim', { tahlil: true, wind: { dir: 90, prevailing: 'sharq', mean: 2.3 } }).body(0, 0, 380, 220);
    expect((t2.match(/data-sil="quyosh"/g) ?? []).length).toBe(3); expect(t2).toContain('data-sil="soya"'); expect(t2).toContain('data-sil="shamol"'); expect(t2).toContain('22.12 · 25,');
  });
});
