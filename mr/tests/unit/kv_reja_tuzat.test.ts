import { describe, it, expect } from 'vitest';
import { structGrid } from '../../src/core/axes';
import { layoutSection } from '../../src/core/apartments';
import { aptInterior, normViol, roomWidth, CORR_H } from '../../src/core/aptplan';
import { floorPlanSvg } from '../../src/core/floorplan';
import { generate, DEFAULT_GEN } from '../../src/core/generator';
import type { XY } from '../../src/core/geo';

/**
 * 07.11 (egasi, 06.11 17:36 — 6 ta skrinshot): kvartira rejalari tuzatishlari — ichki yoʻlaklar kengroq (1,4 m oʻqlarda),
 * P/C torets kvartirasi 14–17 m chuqur qanotlarda, kontur boʻyicha kesilgan rejada eshik kvartiradan tashqarida qolmaydi,
 * sayoz kiyimxona tasmasi — devor shkafi, kirish eshigi dahliz ichiga ochiladi.
 */
const rect = (a: number, b: number): XY[] => [[0, 0], [a, 0], [a, b], [0, b]];
const sec = (r: XY[]) => { const j = structGrid(r, null, { sys: 'monolit', seismic: 8, H: 27 }).joints; return layoutSection(r, () => false, [20, 40, 30, 10], 3.3, 'M', null, j, { system: 'wall', seismic: 8 } as never); };
const T = 0.1;

describe('kvartira rejalari tuzatishlari (07.11)', () => {
  it('ichki yoʻlak: 40-band (sof ≥ 1,1 m) buzilmaydi, koʻpchiligi 1,3 m (CORR_H = 1,4 m oʻqlarda)', () => {
    let n = 0, wide = 0;
    for (const S of [14, 15, 16, 17, 18]) {
      const L = sec(rect(45, S));
      for (const a of L.plan!.apts) {
        const I = aptInterior(a, L.mods); if (!I) continue;
        for (const q of I.rooms) if (q.kind === 'xoll') { const w = roomWidth(q.ring) - T; n++; expect(w).toBeGreaterThanOrEqual(1.08); if (w >= CORR_H - T - 0.02) wide++; }
      }
    }
    expect(n).toBeGreaterThan(5);
    expect(wide / n).toBeGreaterThanOrEqual(0.6);
  }, 120_000);
  it('P/C torets kvartirasi 14–17 m chuqur qanotda; reja zaxira emas, qatʼiy buzilish yoʻq (16, 17 m — xona ≤ 6 m)', () => {
    for (const S of [14, 15, 16, 17]) {
      const L = sec(rect(33, S)), tor = L.plan!.apts.filter(a => a.torets);
      expect(tor.length, `${S} m`).toBe(2);
      for (const a of tor) {
        const I = aptInterior(a, L.mods)!; expect(I, `${S} m`).toBeTruthy(); expect(I.simple ?? false).toBe(false);
        expect(normViol(I, a, L.mods).filter(v => v[0] >= 4).map(v => v[1]), `${S} m`).toEqual([]);
      }
    }
  }, 120_000);
  it('har eshik kvartira ichida yoki chegarasida (kesilgan zaxira rejalarda «osilgan» eshik yoʻq)', () => {
    const inP = (p: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi || 1e-12) + xi) c = !c; } return c; };
    const onR = (p: XY, r: XY[]) => r.some((e0, i) => { const e1 = r[(i + 1) % r.length], dx = e1[0] - e0[0], dy = e1[1] - e0[1], L2 = dx * dx + dy * dy || 1e-12, t = Math.max(0, Math.min(1, ((p[0] - e0[0]) * dx + (p[1] - e0[1]) * dy) / L2)); return Math.hypot(p[0] - e0[0] - t * dx, p[1] - e0[1] - t * dy) < 0.1; });
    let n = 0;
    for (const b of [[[0, 0], [150, 60], [100, 185], [-50, 125]], [[0, 0], [120, 0], [120, 100], [0, 100]]] as XY[][]) for (const depth of [12, 15, 18]) {
      for (const s of generate(b, { ...DEFAULT_GEN, typology: 'perimetr', depth }, 3.3).sections) {
        const L = layoutSection(s.ring, () => false, [20, 40, 30, 10], 3.3, 'M', null);
        for (const a of L.plan?.apts ?? []) { const I = aptInterior(a, L.mods); if (!I) continue; for (const d of I.doors) { const m: XY = [(d.h[0] + d.a[0]) / 2, (d.h[1] + d.a[1]) / 2]; n++; expect(inP(m, a.ring) || onR(m, a.ring)).toBe(true); } }
      }
    }
    expect(n).toBeGreaterThan(500);
  }, 300_000);
  it('chizma: sayoz kiyimxona — devor shkafi belgisi; kirish eshigi yoyi kvartira ichida', () => {
    const L = sec(rect(45, 15)), pl = { bid: 'x', ring: rect(45, 15), layout: L, f0: 0, f1: 9, z0: 0, halfDepth: 7.5 } as never;
    const svg = (floorPlanSvg(pl, { scale: 60, dims: false, title: 't', floor: 4 } as never) as unknown as { svg: string }).svg;
    expect(svg).toContain('data-shkaf');
  }, 60_000);
});
