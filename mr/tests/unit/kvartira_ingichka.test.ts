import { describe, it, expect } from 'vitest';
import { generate, DEFAULT_GEN } from '../../src/core/generator';
import { planApartments } from '../../src/core/apartments';
import { blankProject } from '../../src/core/doc';
import { apply } from '../../src/core/commands';
import { computePlan } from '../../src/core/plan';
import { frame, type XY } from '../../src/core/geo';

const pin = (p: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
/** ochilish (eroziya + dilatatsiya, doira R) dan keyin yoʻqolgan maydon, m²: toʻrtburchakda ~0,5 (burchaklar), tasmada — tasma maydoni */
function thinLoss(r: XY[], R = 0.6, s = 0.1): { loss: number; parts: number } {
  const xs = r.map(p => p[0]), ys = r.map(p => p[1]), x0 = Math.min(...xs) - 1, y0 = Math.min(...ys) - 1;
  const nx = Math.ceil((Math.max(...xs) + 1 - x0) / s), ny = Math.ceil((Math.max(...ys) + 1 - y0) / s);
  const A = new Uint8Array(nx * ny); for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) A[j * nx + i] = pin([x0 + (i + .5) * s, y0 + (j + .5) * s], r) ? 1 : 0;
  const k = Math.round(R / s), off: number[][] = []; for (let a = -k; a <= k; a++) for (let b = -k; b <= k; b++) if (a * a + b * b <= k * k) off.push([a, b]);
  const E = new Uint8Array(nx * ny); for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { if (!A[j * nx + i]) continue; let ok = 1; for (const [a, b] of off) { const ii = i + a, jj = j + b; if (ii < 0 || jj < 0 || ii >= nx || jj >= ny || !A[jj * nx + ii]) { ok = 0; break; } } E[j * nx + i] = ok; }
  const D = new Uint8Array(nx * ny); for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if (E[j * nx + i]) for (const [a, b] of off) { const ii = i + a, jj = j + b; if (ii >= 0 && jj >= 0 && ii < nx && jj < ny) D[jj * nx + ii] = 1; }
  let lost = 0; for (let q = 0; q < A.length; q++) if (A[q] && !D[q]) lost++;
  // ochilgandan keyingi bogʻlangan boʻlaklar (≥ 1 m²): bittadan koʻp — kvartira ingichka «koʻprik» bilan ulangan ikki boʻlak
  const seen = new Uint8Array(nx * ny); let parts = 0;
  for (let q0 = 0; q0 < D.length; q0++) { if (!D[q0] || seen[q0]) continue; let n = 0; const st = [q0]; seen[q0] = 1;
    while (st.length) { const q = st.pop()!; n++; const i = q % nx, j = (q - i) / nx; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + a, jj = j + b; if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue; const w = jj * nx + ii; if (D[w] && !seen[w]) { seen[w] = 1; st.push(w); } } }
    if (n * s * s >= 1) parts++; }
  return { loss: lost * s * s, parts };
}

/**
 * 1.11 (egasi: «bunday kolbasalar aslida xato»): burchak seksiyada kvartiraga ingichka tasma yopishib qolmasin; kvartira
 * ingichka koʻprik bilan ulangan ikki boʻlakdan iborat boʻlmasin. Qiyshiq uchastkada fasad boʻyidagi ponasimon
 * lodjiyalar oʻtkir burchakli — ular tasma emas, shuning uchun u yerda faqat boʻlaklar soni tekshiriladi.
 */
describe('kvartira konturida ingichka tasma yoʻq', () => {
  for (const [name, site, skew] of [
    ['toʻgʻri 100×100, chuqurlik 18', [[-50, -50], [50, -50], [50, 50], [-50, 50]], false],
    ['qiyshiq parallelogramm', [[-60, -50], [50, -50], [64, 50], [-46, 50]], true],
  ] as const) it(name, () => {
    let d = blankProject('t') as any; const fr = frame(d.origin);
    d.site = { rings: [site.map(p => fr.toGeo(p as XY))] };
    const b = computePlan(d).blocks[0];
    const r = generate(b.rings[0], { ...DEFAULT_GEN, depth: 18 }, d.settings.floorHeight, { use: 'turar', aptNet: d.settings.aptNet, netToGross: d.settings.netToGross });
    d = apply(d, { type: 'replaceGroup', grp: 'g', sections: r.sections.map(x => ({ footprint: x.ring.map(fr.toGeo), floors: x.floors, nonRes: x.nonRes, use: 'turar', kind: x.kind, z0: x.z0, blind: x.blind })) } as any);
    let n = 0; const bad: number[] = [];
    for (const p of planApartments(d)) for (const a of p.layout.plan?.apts ?? []) { n++; const t = thinLoss(a.ring); if (t.parts > 1 || (!skew && t.loss > 1.5)) bad.push(+t.loss.toFixed(1)); }
    expect(n).toBeGreaterThan(20);
    expect(bad).toEqual([]);
  }, 300_000);
});
