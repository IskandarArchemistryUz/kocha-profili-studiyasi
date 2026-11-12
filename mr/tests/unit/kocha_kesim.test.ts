import { describe, it, expect } from 'vitest';
import { blankProject, migrate, type Project } from '../../src/core/doc';
import { frame } from '../../src/core/geo';
import { apply } from '../../src/core/commands';
import { cutGeom, along, project, nextCutLabel } from '../../src/core/streetcut';
import { cutSheet } from '../../src/core/streetcutsvg';
import { sheetSvg, SHEET_DEFAULT } from '../../src/core/sheet';

/** Sharqqa qarab 200 m koʻcha (mahalla 15 m), shimolda 9 qavatli, janubda 5 qavatli bino */
function doc(): Project {
  let d = blankProject(); const fr = frame(d.origin), g = (x: number, y: number) => fr.toGeo([x, y]);
  const box = (x0: number, y0: number, x1: number, y1: number) => [g(x0, y0), g(x1, y0), g(x1, y1), g(x0, y1)];
  d = { ...d, streets: [{ id: 's1', axis: [g(0, 0), g(200, 0)], profile: 'mahalla-15' }],
    buildings: [{ id: 'bN', footprint: box(80, 15.5, 120, 31.5), floors: 9, nonRes: 0, use: 'turar' } as any, { id: 'bS', footprint: box(80, -27.5, 120, -13.5), floors: 5, nonRes: 0, use: 'turar' } as any] };
  return d;
}

describe('Koʻcha kesimi A–A', () => {
  it('siniq chiziq: along / project', () => {
    const pts: [number, number][] = [[0, 0], [100, 0], [100, 50]];
    expect(along(pts, 120).at).toEqual([100, 20]);
    expect(project(pts, [104, 30]).t).toBeCloseTo(130, 5);
  });
  it('kesim: profil kengligi, ikki tomondagi bino masofasi va balandligi', () => {
    let d = doc(); d = apply(d, { type: 'setCuts', cuts: [{ id: 'c1', street: 's1', t: 100, label: 'A' }] });
    const g = cutGeom(d, d.cuts![0])!;
    expect(g.W).toBeCloseTo(15, 5);
    // chap (−n) — janub: oʻq yoʻnalishi sharq, chap normal shimol
    expect(g.left!.id).toBe('bS'); expect(g.left!.dist).toBeCloseTo(13.5 - 7.5, 3); expect(g.left!.floors).toBe(5);
    expect(g.right!.id).toBe('bN'); expect(g.right!.dist).toBeCloseTo(15.5 - 7.5, 3); expect(g.right!.depth).toBeCloseTo(16, 3);
    expect(g.right!.H).toBeGreaterThan(g.left!.H);
    expect(nextCutLabel(d)).toBe('B');
  });
  it('koʻcha oʻchirilsa — kesimi ham; saqlanib qayta ochiladi', () => {
    let d = apply(doc(), { type: 'setCuts', cuts: [{ id: 'c1', street: 's1', t: 50, label: 'A' }] });
    expect(migrate(JSON.parse(JSON.stringify(d))).cuts).toEqual(d.cuts);
    d = apply(d, { type: 'removeStreet', id: 's1' });
    expect(d.cuts).toBeUndefined();
  });
  it('varaq: standart masshtab, qismlar, binolar, qizil chiziq oʻlchami', () => {
    const d = apply(doc(), { type: 'setCuts', cuts: [{ id: 'c1', street: 's1', t: 100, label: 'A' }] });
    const inner = cutSheet(d, 'c1', s => s, 380, 250);
    expect(inner.label).toMatch(/^M 1:(100|200|250|400|500)$/);
    const body = inner.body(0, 0, 380, 250);
    expect((body.match(/data-cut-part=/g) ?? []).length).toBe(5);
    expect(body).toContain('data-cut-bld="l"'); expect(body).toContain('data-cut-bld="r"');
    expect(body).toContain('15,00 — qizil chiziqlar orasi');
    expect(body).toContain('9 qavat');
    const r = sheetSvg(d, null, { ...SHEET_DEFAULT, mode: 'kesim', cut: 'c1' }, new Date(2026, 10, 12), false, s => s, inner);
    expect(r.svg).toContain('Koʻcha profili A–A');
    expect(r.svg).toContain('Profil tarkibi');
  });
  it('kesim yoʻq — tushuntirish yozuvi', () => {
    expect(cutSheet(doc(), undefined, s => s, 380, 250).body(0, 0, 380, 250)).toContain('Kesim chizigʻi yoʻq');
  });
});
