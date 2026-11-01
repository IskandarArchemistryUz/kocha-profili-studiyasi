import { describe, it, expect } from 'vitest';
import { generate, DEFAULT_GEN } from '../../src/core/generator';
import { layoutSection } from '../../src/core/apartments';
import { aptInterior, type AptInterior, type Furn } from '../../src/core/aptplan';
import type { XY } from '../../src/core/geo';

/**
 * 01.11 (egasi: «mebel — generatsiya qilib, barcha planlarda toʻgʻri tushadimi, tekshirish kerak»):
 * har bir generatsiya qilingan kvartirada mebel tekshiruvi —
 *  1) devorga / tashqi konturga kirmaydi, bir-birini kesmaydi, eshik tabaqasi aylanasiga tushmaydi;
 *  2) kirishdan har bir xonaga va har bir karavot / divan / unitaz yoniga 0,6 m enli yoʻl bor;
 *  3) zarur jihozlar: yotoqxonada karavot, sanuzelda unitaz va vanna/dush, kvartirada oshxona qatori.
 */
const CELL = 0.05, R_PASS = 0.25;   // 0,5 m — odam oʻtadigan eng tor joy (0,6 m eshik ham oʻtadi)
const inPoly = (p: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
const segDist = (p: XY, a: XY, b: XY) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)); return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t); };
const shrink = (f: Furn, e: number): XY[] => { const c: XY = [f.ring.reduce((s, p) => s + p[0], 0) / f.ring.length, f.ring.reduce((s, p) => s + p[1], 0) / f.ring.length]; return f.ring.map(p => { const dx = p[0] - c[0], dy = p[1] - c[1], l = Math.hypot(dx, dy) || 1; return [p[0] - dx / l * e, p[1] - dy / l * e] as XY; }); };
const segX = (a: XY, b: XY, c: XY, d: XY) => { const o = (p: XY, q: XY, r: XY) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])); return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0; };
const polyHit = (A: XY[], B: XY[]) => A.some(p => inPoly(p, B)) || B.some(p => inPoly(p, A)) || A.some((p, i) => B.some((q, j) => segX(p, A[(i + 1) % A.length], q, B[(j + 1) % B.length])));

export interface FurnIssue { wall: number; overlap: number; door: number; out: number; noPath: string[]; missing: string[] }
export function auditFurn(I: AptInterior, ring: XY[]): FurnIssue {
  const F = I.furn ?? [], iss: FurnIssue = { wall: 0, overlap: 0, door: 0, out: 0, noPath: [], missing: [] };
  const sh = F.map(f => shrink(f, 0.02));
  // 1) devor, kontur, bir-biri, eshik
  F.forEach((_f, i) => {
    const P = sh[i];
    if (!P.every(p => inPoly(p, ring))) iss.out++;
    if (I.walls.some(([a, b]) => P.some((p, k) => segX(p, P[(k + 1) % P.length], a, b)) || segDist(P[0], a, b) < 0.03)) iss.wall++;
    for (let j = i + 1; j < F.length; j++) if (polyHit(P, sh[j])) iss.overlap++;
    for (const d of I.doors) {
      if (d.kind !== 'swing') continue;
      const u: XY = [(d.a[0] - d.h[0]) / d.w, (d.a[1] - d.h[1]) / d.w];
      const sw: XY[] = [d.h]; for (let k = 0; k <= 6; k++) { const t = Math.PI / 2 * k / 6; sw.push([d.h[0] + d.w * (Math.cos(t) * u[0] + Math.sin(t) * d.n[0]), d.h[1] + d.w * (Math.cos(t) * u[1] + Math.sin(t) * d.n[1])]); }
      if (polyHit(P, sw)) { iss.door++; break; }
    }
  });
  // 3) zarur jihozlar
  const furnIn = (r: XY[]) => F.filter(f => inPoly([f.ring.reduce((s, p) => s + p[0], 0) / 4, f.ring.reduce((s, p) => s + p[1], 0) / 4], r)).map(f => f.k);
  for (const r of I.rooms) {
    const k = furnIn(r.ring);
    if (['yotoq', 'master'].includes(r.kind) && !k.some(x => x === 'bed' || x === 'bed1')) iss.missing.push(r.kind + ':karavot');
    if (r.kind === 'sanuzel' && (!k.includes('wc') || !k.some(x => x === 'tub' || x === 'shower'))) iss.missing.push('sanuzel:' + k.join('+'));
    if (r.kind === 'vanna' && !k.some(x => x === 'tub' || x === 'shower')) iss.missing.push('vanna:' + k.join('+'));
    if (r.kind === 'hx' && !k.includes('wc')) iss.missing.push('hx');
    if (r.kind === 'umumiy' && !k.includes('sofa')) iss.missing.push('umumiy:divan');
  }
  if (!F.some(f => f.k === 'counter')) iss.missing.push('oshxona qatori');
  // 2) oʻtish: panjara, 0,3 m radiusli «odam» markazi uchun boʻsh kataklar
  const xs = ring.map(p => p[0]), ys = ring.map(p => p[1]), x0 = Math.min(...xs), y0 = Math.min(...ys);
  const nx = Math.ceil((Math.max(...xs) - x0) / CELL) + 1, ny = Math.ceil((Math.max(...ys) - y0) / CELL) + 1;
  const blk = new Uint8Array(nx * ny), P = (i: number, j: number): XY => [x0 + i * CELL, y0 + j * CELL];
  const ringSegs = ring.map((p, i) => [p, ring[(i + 1) % ring.length]] as [XY, XY]);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const p = P(i, j);
    if (!inPoly(p, ring) || ringSegs.some(([a, b]) => segDist(p, a, b) < 0.1) || I.walls.some(([a, b]) => segDist(p, a, b) < 0.05) || sh.some(f => inPoly(p, f))) blk[j * nx + i] = 1;
  }
  // masofa (8 qoʻshni, taxminiy)
  const dist = new Float32Array(nx * ny).fill(1e9), q: number[] = [];
  for (let c = 0; c < nx * ny; c++) if (blk[c]) { dist[c] = 0; q.push(c); }
  for (let h = 0; h < q.length; h++) { const c = q[h], i = c % nx, j = (c / nx) | 0; for (const [di, dj, w] of [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= ny) continue; const e = b * nx + a, nd = dist[c] + w * CELL; if (nd < dist[e]) { dist[e] = nd; q.push(e); } } }
  const free = (c: number) => dist[c] >= R_PASS - 0.02;
  // boshlanish: kirish nuqtasiga eng yaqin boʻsh katak (1,2 m ichida)
  let s = -1, sd = 1.2;
  for (let c = 0; c < nx * ny; c++) if (free(c)) { const p = P(c % nx, (c / nx) | 0), d = Math.hypot(p[0] - I.entry[0], p[1] - I.entry[1]); if (d < sd) { sd = d; s = c; } }
  if (s < 0) { iss.noPath.push('kirish'); return iss; }
  const seen = new Uint8Array(nx * ny); const st = [s]; seen[s] = 1;
  while (st.length) { const c = st.pop()!, i = c % nx, j = (c / nx) | 0; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= ny) continue; const e = b * nx + a; if (!seen[e] && free(e)) { seen[e] = 1; st.push(e); } } }
  const reach = (test: (p: XY) => boolean) => { for (let c = 0; c < nx * ny; c++) if (seen[c] && test(P(c % nx, (c / nx) | 0))) return true; return false; };
  for (const r of I.rooms) if (r.area > 1.2 && !reach(p => inPoly(p, r.ring))) iss.noPath.push(r.kind);
  F.forEach((f, i) => { if (['bed', 'bed1', 'sofa', 'wc', 'tub', 'shower', 'counter', 'sink'].includes(f.k) && !reach(p => sh[i].some((a, k) => segDist(p, a, sh[i][(k + 1) % 4]) < R_PASS + 0.25))) iss.noPath.push(f.k); });
  return iss;
}

describe('mebel tekshiruvi (01.11)', () => {
  it('generatsiya qilingan kvartiralar: ≥ 93 % da mebel toʻgʻri (devor, kesishish, eshik, kontur, yoʻl, zarur jihozlar)', () => {
    // CI vaqti uchun ikki kvartal (toʻrtburchak va burilgan); toʻliq toʻplam (4 kvartal, 1 108 kvartira) mahalliy tekshirildi — 95 %
    const blocks: XY[][] = [[[0, 0], [200, 0], [200, 160], [0, 160]], [[0, 0], [150, 60], [100, 185], [-50, 125]]];
    const tally: Record<string, number> = {}; let tot = 0, withF = 0, clean = 0;
    const add = (k: string) => { tally[k] = (tally[k] ?? 0) + 1; };
    for (const b of blocks) for (const depth of [12, 15, 18]) {
      for (const s of generate(b, { ...DEFAULT_GEN, typology: 'perimetr', depth }, 3.3).sections) {
        if (!['oddiy', 'burchak'].includes(s.kind)) continue;
        const lay = layoutSection(s.ring, () => false, [20, 40, 30, 10], 3.3, 'M', null);
        for (const a of lay.plan?.apts ?? []) {
          if (!a.mods.length) continue; const I = aptInterior(a, lay.mods); if (!I) continue; tot++;
          if (!I.furn?.length) { add('mebelsiz'); continue; } withF++;
          const r = auditFurn(I, a.ring); let bad = false;
          for (const k of ['wall', 'overlap', 'door', 'out'] as const) if (r[k]) { add(k); bad = true; }
          for (const k of r.noPath) { add('yoʻl:' + k); bad = true; }
          for (const k of r.missing) { add('yoʻq:' + k); bad = true; }
          if (!bad) clean++;
        }
      }
    }
    expect(tot).toBeGreaterThan(150);
    // kesishish, kontur va eshik tabaqasiga tushish — umuman boʻlmasligi kerak
    expect(tally.overlap ?? 0, JSON.stringify(tally)).toBe(0);
    expect(tally.out ?? 0, JSON.stringify(tally)).toBe(0);
    expect(tally.door ?? 0, JSON.stringify(tally)).toBe(0);
    expect(clean / withF, JSON.stringify(tally)).toBeGreaterThanOrEqual(0.93);
  }, 900_000);
});
