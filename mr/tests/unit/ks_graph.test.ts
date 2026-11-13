import { describe, it, expect } from 'vitest';
import { GraphSim, autoPhases, type Net, type Arm, type Conn, type XY } from '../../../js/kssim-graph.js';

/* Sinov tarmogʻi: n qoʻlli chorraha, har qoʻlda 2 kiruvchi + 2 chiquvchi boʻlak (o'ng tomonda harakat). */
function net(angles: number[], sig: boolean): Net {
  const R0 = 14, LEN = 120, W = 3.5;
  const arms: Arm[] = angles.map((deg, i) => {
    const a = (deg * Math.PI) / 180, u: XY = [Math.cos(a), Math.sin(a)], rin: XY = [u[1], -u[0]];
    const P = (s: number, off: number): XY => [u[0] * s + rin[0] * off, u[1] * s + rin[1] * off];
    return {
      id: 'a' + i, hin: [-u[0], -u[1]],
      lanes: [W / 2, W * 1.5].map((off, k) => ({ id: `a${i}i${k}`, pts: [P(R0 + LEN, off), P(R0, off)], codes: k === 0 ? 'LS' : 'SR' })),
      exits: [W / 2, W * 1.5].map((off, k) => ({ id: `a${i}o${k}`, pts: [P(R0, -off), P(R0 + LEN, -off)] })),
    };
  });
  const conns: Conn[] = [];
  const quad = (A: XY, C: XY, B: XY): XY[] => Array.from({ length: 17 }, (_, k) => { const t = k / 16, m = 1 - t; return [m * m * A[0] + 2 * m * t * C[0] + t * t * B[0], m * m * A[1] + 2 * m * t * C[1] + t * t * B[1]] as XY; });
  arms.forEach((A) => arms.forEach((B) => {
    if (A === B) return;
    const h = A.hin, o: XY = [-B.hin[0], -B.hin[1]], th = Math.atan2(h[0] * o[1] - h[1] * o[0], h[0] * o[0] + h[1] * o[1]);
    const m = Math.abs(th) <= 0.61 ? 'S' : th > 0 ? 'L' : 'R';
    const pairs: [number, number][] = m === 'S' ? [[0, 0], [1, 1]] : m === 'L' ? [[0, 0]] : [[1, 1]];
    pairs.forEach(([i, j]) => {
      const s = A.lanes[i].pts[1], e = B.exits[j].pts[0];
      const ctrl: XY = m === 'S' ? [(s[0] + e[0]) / 2, (s[1] + e[1]) / 2] : [s[0] + h[0] * 9, s[1] + h[1] * 9];
      conns.push({ id: `${A.lanes[i].id}>${B.exits[j].id}`, from: A.lanes[i].id, to: B.exits[j].id, m, pts: quad(s, ctrl, e) });
    });
  }));
  return { arms, conns, signal: sig ? { cycle: 80, phases: autoPhases(arms) } : null };
}
const minGap = (sim: GraphSim) => { const S = sim.snapshot(); let g = 1e9; for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) g = Math.min(g, Math.hypot(S[i].x - S[j].x, S[i].y - S[j].y)); return g; };

describe('Koʻchasoz graf modeli (istalgan geometriya)', () => {
  it('4 qoʻlli svetoforli: fazalar qarama-qarshi juftlar, mashinalar oʻtadi', () => {
    const N = net([0, 90, 180, 270], true);
    expect(autoPhases(N.arms).map((p) => p.length)).toEqual([2, 2]);
    const sim = new GraphSim(N, { demand: { a0: 500, a1: 500, a2: 500, a3: 500 }, seed: 3 }).run(900);
    const r = sim.result(120);
    expect(r.total.flow).toBeGreaterThan(1500);
    expect(r.total.delay).toBeGreaterThan(5);
    expect(r.total.delay).toBeLessThan(80);
  }, 60_000);
  it('qiya (60°) 4 qoʻlli va T-chorraha: tiqilib qolmaydi', () => {
    for (const ang of [[0, 60, 180, 240], [0, 90, 180]]) {
      const sim = new GraphSim(net(ang, true), { demand: Object.fromEntries(ang.map((_, i) => ['a' + i, 400])), seed: 5 }).run(900);
      const r = sim.result(120);
      expect(r.total.flow).toBeGreaterThan(400 * ang.length * 0.8);
    }
  }, 60_000);
  it('svetoforsiz: oʻngdan kelayotganga yoʻl beriladi, chorrahada mashinalar ustma-ust tushmaydi', () => {
    const sim = new GraphSim(net([0, 90, 180, 270], false), { demand: { a0: 250, a1: 250, a2: 250, a3: 250 }, seed: 7 });
    let g = 1e9;
    for (let k = 0; k < 6000; k++) { sim.step(0.1); if (k % 5 === 0) g = Math.min(g, minGap(sim)); }
    expect(g).toBeGreaterThan(1.5);
    expect(sim.result(120).total.flow).toBeGreaterThan(800);
  }, 60_000);
  it('svetoforli: qizilda toʻxtash chizigʻidan oʻtmaydi', () => {
    const N = net([0, 90, 180, 270], true), sim = new GraphSim(N, { demand: { a0: 600, a1: 600, a2: 600, a3: 600 }, seed: 2 });
    let bad = 0;
    for (let k = 0; k < 4000; k++) {
      const before = new Map(sim.V.map((v) => [v.id, v.li]));
      sim.step(0.1);
      sim.V.forEach((v) => { if (before.get(v.id) === 0 && v.li === 1 && sim.light(v.arm) === 'R') bad++; });
    }
    expect(bad).toBe(0);
  }, 60_000);
});
