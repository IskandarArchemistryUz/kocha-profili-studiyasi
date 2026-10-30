import { describe, it, expect } from 'vitest';
import { lenLimit, blockShape, checkBlock } from '../../src/core/seysmik';
import type { XY } from '../../src/core/geo';

const R = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
describe('seysmik boʻlmalar (QMQ 2.01.03-19, 3.1-jadval, 3.1.1)', () => {
  it('uzunlik chegarasi: monolit 60/45/36, karkas 100/80/60, gʻisht 40/30/20; 6 ball — cheklanmagan', () => {
    expect(lenLimit('monolit', 7)).toBe(60); expect(lenLimit('monolit', 8)).toBe(45); expect(lenLimit('monolit', 9)).toBe(36);
    expect(lenLimit('karkas', 8)).toBe(80); expect(lenLimit('gisht', 9)).toBe(20); expect(lenLimit('monolit', 6)).toBeNull(); expect(lenLimit('toldirgich', 10)).toBe(40);
  });
  it('toʻrtburchak 48 × 15 — chiqish yoʻq; L 48 × 36 (qanot 15) — chiqish 21 m; kichik L (burchak 21 × 21) — 6 m', () => {
    expect(blockShape(R(0, 0, 48, 15))).toMatchObject({ rect: true, proj: [] });
    const L: XY[] = [[0, 0], [48, 0], [48, 15], [15, 15], [15, 36], [0, 36]];
    const s = blockShape(L); expect(s.rect).toBe(false); expect(s.proj.length).toBe(1); expect(s.proj[0]).toBeCloseTo(21, 0);
    const C: XY[] = [[0, 0], [21, 0], [21, 15], [15, 15], [15, 21], [0, 21]];
    expect(blockShape(C).proj[0]).toBeCloseTo(6, 0);
  });
  it('tekshiruv: 8 ball monolit — 48 m toʻrtburchak uzun (45), 21 × 21 L mos; gʻisht — 6 m chiqish 2 dan katta', () => {
    const a = checkBlock(R(0, 0, 48, 15), 'monolit', 8); expect(a.lenOk).toBe(false); expect(a.projOk).toBe(true); expect(a.limit).toBe(45);
    const C: XY[] = [[0, 0], [21, 0], [21, 15], [15, 15], [15, 21], [0, 21]];
    expect(checkBlock(C, 'monolit', 8)).toMatchObject({ lenOk: true, projOk: true });
    expect(checkBlock(C, 'gisht', 8).projOk).toBe(false);
  });
});

import { generate, DEFAULT_GEN } from '../../src/core/generator';
describe('seysmik rejimda generatsiya (maxLen 45, maxProj 6)', () => {
  const g = { ...DEFAULT_GEN, secLen: 45, maxLen: 45, maxProj: 6 };
  for (const [nm, ring] of [['toʻgʻri kvartal 200 × 120', R(0, 0, 200, 120)], ['burilgan L kvartal', [[0, 0], [180, 0], [180, 70], [90, 110], [0, 110]] as XY[]], ['uchburchak', [[0, 0], [160, 0], [0, 112]] as XY[]]] as const) {
    it(`${nm}: har seksiya ≤ 45 m, chiqib turgan qism ≤ 6 m`, () => {
      const r = generate(ring as XY[], g);
      expect(r.sections.length).toBeGreaterThan(2);
      for (const s of r.sections.filter(x => x.kind !== 'arka')) { const c = checkBlock(s.ring, 'monolit', 8); expect(c.lenOk, `${s.kind} ${c.len} m`).toBe(true); expect(c.projOk, `${s.kind} chiqish ${c.proj} m`).toBe(true); }
    });
  }
  it('seysmik rejimsiz — burchak L qoʻli 8 m (eski xulq saqlanadi)', () => {
    const r = generate(R(0, 0, 200, 120), DEFAULT_GEN), corner = r.sections.find(s => s.kind === 'burchak');
    expect(corner).toBeTruthy(); expect(checkBlock(corner!.ring, 'monolit', 8).proj).toBeGreaterThan(6);
  });
});

import { layoutSection } from '../../src/core/apartments';
import { planChecks } from '../../src/core/sectionplan';
describe('seysmik burchak boʻlmasi rejasi (kichik L 21 × 21, chok sharq va shimolda)', () => {
  it('yadro ichki burchakda emas — qanotda; xoll koʻcha va hovli fasadiga chiqadi; zina bor; barcha tekshiruvlar oʻtadi', () => {
    const ring: XY[] = [[0, 0], [21, 0], [21, 15], [15, 15], [15, 21], [0, 21]];
    const L = layoutSection(ring, p => p[0] > 20.5 || p[1] > 20.5, [20, 40, 30, 10], 3.3, 'M'), pl = L.plan!;
    expect(pl.sections.length).toBe(1); expect(pl.sections[0].corner).toBe(false); expect(pl.stairs.length).toBe(1);
    const ch = planChecks(pl, 25, L.mods as never);
    for (const id of ['kirish', 'stairs', 'win', 'light']) expect([id, ch.find(c => c.id === id)!.ok]).toEqual([id, true]);
    expect(pl.apts.length).toBeGreaterThanOrEqual(4);
  });
  it('15 × 15 qanot boʻlagi (janub tomoni chok): oʻq chokka perpendikulyar, yadro sigʻadi — zina bor, xoll ikki yon fasadga chiqadi', () => {
    const L = layoutSection([[0, 21], [15, 21], [15, 36], [0, 36]], p => p[1] < 21.5, [20, 40, 30, 10], 3.3, 'M'), pl = L.plan!;
    expect(pl.stairs.length).toBe(1); expect(pl.lifts.length).toBeGreaterThan(0);
    const ch = planChecks(pl, 25, L.mods as never);
    for (const id of ['stairs', 'kirish', 'win', 'light']) expect([id, ch.find(c => c.id === id)!.ok]).toEqual([id, true]);
  });
  it('gʻisht 17 × 17 burchak boʻlmasi (sharq va shimol chok): yadro berk burchakda, kvartiralar faqat koʻcha fasadlarida — derazasiz va qorongʻi kvartira yoʻq; kirish ikki koʻcha fasadiga', () => {
    const L = layoutSection([[0, 0], [17, 0], [17, 17], [0, 17]], p => p[0] > 16.5 || p[1] > 16.5, [20, 40, 30, 10], 3.3, 'M'), pl = L.plan!;
    expect(pl.stairs.length).toBe(1); expect(pl.apts.length).toBeGreaterThanOrEqual(3);
    const ch = planChecks(pl, 25, L.mods as never);
    for (const id of ['stairs', 'win', 'light', 'mop']) expect([id, ch.find(c => c.id === id)!.ok]).toEqual([id, true]);
    expect(ch.find(c => c.id === 'kirish')!.ok).toBe(true);   // ikki koʻcha fasadiga (janub va gʻarb, 90°) chiqadi — ikki tomonlama sanaladi
  });
  it('12 × 30 qanot: ikki tomonlama koridor (5,2 m chuqurlik), yadro, kirish ikki tomonga', () => {
    const L = layoutSection([[0, 0], [12, 0], [12, 30], [0, 30]], p => p[1] < 0.5, [20, 40, 30, 10], 3.3, 'M'), pl = L.plan!;
    expect(pl.kind).toBe('ikki'); expect(pl.stairs.length).toBe(1);
    const ch = planChecks(pl, 25, L.mods as never);
    for (const id of ['stairs', 'kirish', 'win', 'light']) expect([id, ch.find(c => c.id === id)!.ok]).toEqual([id, true]);
  });
});

describe('«+», «U», «T» shakllar (30.10): markaz va tutashuvlar', () => {
  const run = (ring: XY[]) => { const L = layoutSection(ring, () => false, [20, 40, 30, 10], 3.3, 'M'), pl = L.plan!; return { pl, bad: planChecks(pl, 25, L.mods as never).filter(c => c.ok === false).map(c => c.id) }; };
  it('«+» 36 × 36 — minora rejasi: yadro markazda, qanotlarda 8 kvartira, ikkita zina (> 500 m²), tekshiruvlar oʻtadi', () => {
    const { pl, bad } = run([[12, 0], [24, 0], [24, 12], [36, 12], [36, 24], [24, 24], [24, 36], [12, 36], [12, 24], [0, 24], [0, 12], [12, 12]]);
    expect(pl.sections.length).toBe(1); expect(pl.apts.length).toBe(8); expect(pl.stairs.length).toBe(2); expect(bad).toEqual([]);
  });
  it('«U» 45 × 30 va 60 × 36 — har seksiya xolli koʻcha va hovliga chiqadi (burchakda 90°), tupik xoll yoʻq', () => {
    for (const ring of [[[0, 0], [45, 0], [45, 30], [33, 30], [33, 12], [12, 12], [12, 30], [0, 30]], [[0, 0], [60, 0], [60, 36], [45, 36], [45, 15], [15, 15], [15, 36], [0, 36]]] as XY[][]) {
      const { pl, bad } = run(ring); expect(bad).toEqual([]); for (const s of pl.sections) if (s.apts.length) expect(s.stairs.length).toBeGreaterThan(0);
    }
  });
  it('«T» 36 × 24 va «L» 45 × 45 — tekshiruvlar oʻtadi', () => {
    for (const ring of [[[0, 0], [36, 0], [36, 12], [24, 12], [24, 24], [12, 24], [12, 12], [0, 12]], [[0, 0], [45, 0], [45, 15], [15, 15], [15, 45], [0, 45]]] as XY[][]) expect(run(ring).bad).toEqual([]);
  });
});
