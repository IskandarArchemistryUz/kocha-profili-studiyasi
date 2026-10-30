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
  it('15 × 15 qanot boʻlagi: zina sigʻmaydi — «stairs» tekshiruvi mos emas (yashirin qolmaydi)', () => {
    const L = layoutSection([[0, 21], [15, 21], [15, 36], [0, 36]], p => p[1] < 21.5, [20, 40, 30, 10], 3.3, 'M');
    expect(planChecks(L.plan!, 25, L.mods as never).find(c => c.id === 'stairs')!.ok).toBe(false);
  });
});
