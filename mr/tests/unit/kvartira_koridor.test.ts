import { describe, it, expect } from 'vitest';
import { generate, DEFAULT_GEN } from '../../src/core/generator';
import { layoutSection } from '../../src/core/apartments';
import { structGrid } from '../../src/core/axes';
import { aptInterior, passWidths, NORM, type AptInterior } from '../../src/core/aptplan';
import type { RuleApt } from '../../src/core/sectionplan';
import type { XY } from '../../src/core/geo';

/**
 * 11.11 (egasi, 14-bino 4-qavat: «koridor eni juda tor»): kvartira ichki yoʻlaklari eni. Asl matn — ShNQ 2.08.01-24, 40-band:
 * «Dahlizning eni 1,4 m dan, kvartiraning yashash xonalariga olib boradigan ichki yoʻlaklari — 1,1 m dan, yordamchi xonalarga
 * olib boradiganlari — 0,9 m dan kam boʻlmasligi kerak». ANDOZA (c79): yashash xonalariga yoʻlak sof eni 1,3 m (devor oʻqlari
 * orasida 1,4 m); 1,1 m gacha faqat xona meʼyoriy minimumga tushib qolsa.
 * Oʻlchov: generatsiya qilingan seksiyalar (toʻrtburchak, parallelogramm, L, burilgan kvartal; chuqurlik 12, 13, 15, 18 m; perimetr —
 * burchak seksiyalari bilan; devorli toʻr — #468 oʻq qoidasi) × har kvartira rejasidagi yoʻlaklar sof eni (passWidths).
 */
type Bin = '≥1,3' | '1,2–1,3' | '1,1–1,2' | '<1,1';
const BINS: Bin[] = ['≥1,3', '1,2–1,3', '1,1–1,2', '<1,1'];
const bin = (w: number): Bin => w >= 1.3 - 0.015 ? '≥1,3' : w >= 1.2 - 0.015 ? '1,2–1,3' : w >= 1.1 - 0.015 ? '1,1–1,2' : '<1,1';
const rect = (w: number, h: number): XY[] => [[0, 0], [w, 0], [w, h], [0, h]];

export function measure(): { rows: Record<string, Record<Bin, number>>; apts: number; plans: number; below: string[] } {
  const blocks: XY[][] = [rect(200, 160), [[-120, -50], [80, -50], [120, 50], [-80, 50]], [[0, 0], [180, 0], [180, 80], [90, 80], [90, 180], [0, 180]], [[0, 0], [150, 60], [100, 185], [-50, 125]]];
  const rows: Record<string, Record<Bin, number>> = {};
  const add = (key: string, w: number) => { const r = rows[key] ??= { '≥1,3': 0, '1,2–1,3': 0, '1,1–1,2': 0, '<1,1': 0 }; r[bin(w)]++; };
  let apts = 0, plans = 0; const below: string[] = [];
  const take = (a: RuleApt, I: AptInterior | null, tag: string) => {
    apts++; if (!I) return; plans++;
    const k = Math.min(4, I.kFit ?? a.rooms), grp = a.torets ? 'P/C' : `${k}x`;
    for (const p of passWidths(I)) {
      if (p.kind === 'dahliz') continue;
      add(`${p.kind === 'live' ? 'yashash' : 'yordamchi'} · ${grp}`, p.w);
      add(p.kind === 'live' ? 'JAMI yashash' : 'JAMI yordamchi', p.w);
      if (p.w < (p.kind === 'live' ? NORM.corrW : NORM.auxW) - 0.015) below.push(`${tag} ${grp} ${p.kind} ${p.w.toFixed(2)}`);
    }
  };
  for (const b of blocks) for (const depth of [12, 13, 15, 18]) for (const gridOn of [false, true]) {
    for (const s of generate(b, { ...DEFAULT_GEN, typology: 'perimetr', depth }, 3.3).sections) {
      if (!['oddiy', 'burchak'].includes(s.kind)) continue;
      const gs = gridOn ? { system: 'wall' as const, seismic: 8 } : undefined;
      const j = gridOn ? structGrid(s.ring, null, { sys: 'monolit', seismic: 8, H: 27 }).joints : [];
      const lay = layoutSection(s.ring, () => false, [20, 40, 30, 10], 3.3, 'M', null, j, gs);
      for (const a of lay.plan?.apts ?? []) { if (!a.mods.length) continue; take(a, aptInterior(a, lay.mods), `d${depth}${gridOn ? 'g' : ''}`); }
    }
  }
  return { rows, apts, plans, below };
}

const fmtTable = (r: ReturnType<typeof measure>) => ['| guruh | ' + BINS.join(' | ') + ' |', '|---|' + BINS.map(() => '---').join('|') + '|', ...Object.keys(r.rows).sort().map(k => `| ${k} | ${BINS.map(b => r.rows[k][b]).join(' | ')} |`)].join('\n');

describe('kvartira ichki yoʻlaklari eni (ShNQ 2.08.01-24, 40-band; c79)', () => {
  it('yoʻlaklar sof eni: meʼyordan kam yoʻq, 1,1–1,2 m holatlar kam', () => {
    const r = measure();
    console.log(`kvartiralar ${r.apts}, rejali ${r.plans}\n` + fmtTable(r));
    if (r.below.length) console.log('meʼyordan kam:', r.below.slice(0, 20).join('; '));
    expect(r.plans).toBeGreaterThan(500);
    const L = r.rows['JAMI yashash'], tot = BINS.reduce((t, b) => t + L[b], 0);
    expect(tot).toBeGreaterThan(200);
    expect(L['<1,1']).toBe(0);
    // c79 oʻlchovi (11.11): ≥ 1,3 m ulushi 56 % → 87 %; 1,1–1,2 m: 389 → 93. Qolganlari geometrik: 4,4 m sayoz kvartiralar, kirish eshigi
    // joyi, SanQvaN 97-band (sayozroq yotoq kengligi > 2 × chuqurlik) — u yerda yoʻlak kengaysa xona meʼyordan tushadi
    expect(L['≥1,3'] / tot).toBeGreaterThanOrEqual(0.85);
    expect(L['1,1–1,2']).toBeLessThanOrEqual(110);
    expect(r.rows['JAMI yordamchi']?.['<1,1'] ?? 0).toBe(0);
  }, 600_000);
});
