import { describe, it, expect } from 'vitest';
import { generate, DEFAULT_GEN } from '../../src/core/generator';
import { layoutSection } from '../../src/core/apartments';
import { aptInterior } from '../../src/core/aptplan';
import type { XY } from '../../src/core/geo';

/** 01.11 (egasi: «baʼzi kvartiralar plansiz qolyapti»): generatsiya qilingan seksiyalarda ichki reja qamrovi */
describe('kvartira ichki rejasi qamrovi', () => {
  it('toʻrtburchak, parallelogramm, L va burilgan kvartallar (chuqurlik 12/15/18) — ≥ 97 % kvartirada reja', () => {
    const blocks: XY[][] = [[[0, 0], [200, 0], [200, 160], [0, 160]], [[-120, -50], [80, -50], [120, 50], [-80, 50]], [[0, 0], [180, 0], [180, 80], [90, 80], [90, 180], [0, 180]], [[0, 0], [150, 60], [100, 185], [-50, 125]]];
    let tot = 0, ok = 0, fit = 0;
    for (const b of blocks) for (const depth of [12, 15, 18]) {
      for (const s of generate(b, { ...DEFAULT_GEN, typology: 'perimetr', depth }, 3.3).sections) {
        if (!['oddiy', 'burchak'].includes(s.kind)) continue;
        const lay = layoutSection(s.ring, () => false, [20, 40, 30, 10], 3.3, 'M', null);
        for (const a of lay.plan?.apts ?? []) { if (!a.mods.length) continue; tot++; const I = aptInterior(a, lay.mods); if (I) { ok++; if (I.kFit) fit++; } }
      }
    }
    expect(tot).toBeGreaterThan(300);
    expect(ok / tot).toBeGreaterThanOrEqual(0.97);
    expect(fit / tot).toBeLessThan(0.1);   // xonalar soni kamaytirilgan rejalar — kam
  }, 300_000);
});
