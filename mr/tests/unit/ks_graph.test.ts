import { describe, it, expect } from 'vitest';
import { GraphSim, autoPhases, autoConnect, ringConnect, type Net, type Arm, type Conn, type XY } from '../../../js/kssim-graph.js';

/* Sinov tarmogʻi: n qoʻlli chorraha, har qoʻlda 2 kiruvchi + 2 chiquvchi boʻlak (oʻng tomonda harakat; y pastga — SVG/maket kabi). */
function net(angles: number[], sig: boolean): Net {
  const R0 = 14, LEN = 120, W = 3.5;
  const arms: Arm[] = angles.map((deg, i) => {
    const a = (deg * Math.PI) / 180, u: XY = [Math.cos(a), Math.sin(a)], rin: XY = [u[1], -u[0]];
    const P = (s: number, off: number): XY => [u[0] * s + rin[0] * off, u[1] * s + rin[1] * off];
    return {
      id: 'a' + i, hin: [-u[0], -u[1]],
      lanes: [W / 2, W * 1.5].map((off, k) => ({ id: `a${i}i${k}`, mid: off, pts: [P(R0 + LEN, off), P(R0, off)], codes: k === 0 ? 'LS' : 'SR' })),
      exits: [W / 2, W * 1.5].map((off, k) => ({ id: `a${i}o${k}`, mid: off, pts: [P(R0, -off), P(R0 + LEN, -off)] })),
    };
  });
  const conns: Conn[] = autoConnect(arms, false);
  return { arms, conns, yUp: false, signal: sig ? { cycle: 80, phases: autoPhases(arms) } : null };
}
const minGap = (sim: GraphSim) => { const S = sim.snapshot(); let g = 1e9; for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) g = Math.min(g, Math.hypot(S[i].x - S[j].x, S[i].y - S[j].y)); return g; };

describe('Koʻchasoz graf modeli (istalgan geometriya)', () => {
  it('4 qoʻlli svetoforli: fazalar qarama-qarshi juftlar, mashinalar oʻtadi', () => {
    const N = net([0, 90, 180, 270], true);
    expect(autoPhases(N.arms).map((p) => (Array.isArray(p) ? p : p.arms).length)).toEqual([2, 2]);
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
  it('svetoforsiz teng chorraha: 4×200 avt/soat — talab bajariladi (oʻtkazuvchanlik ~1000 avt/soat atrofida)', () => {
    const r = new GraphSim(net([0, 90, 180, 270], false), { demand: { a0: 200, a1: 200, a2: 200, a3: 200 }, seed: 1 }).run(1020).result(120);
    expect(r.total.flow).toBeGreaterThan(700);
    expect(r.total.los).not.toBe('F');
  }, 60_000);
  it('imtiyoz belgilari: asosiy yoʻl (2.1) tezroq, «Stop» (2.5) kirishda kechikish ortadi, ustma-ust tushmaydi', () => {
    const run = (stop: boolean) => { const N = net([0, 90, 180, 270], false); N.juncs = [{ id: 'J', main: ['a1', 'a3'], ...(stop ? { stop: ['a0', 'a2'] } : {}) } as never];
      for (const a of N.arms) (a as { j?: string }).j = 'J';
      const sim = new GraphSim(N, { demand: { a0: 150, a1: 350, a2: 150, a3: 350 }, seed: 2 }).run(1020);
      return { r: sim.result(120), g: minGap(sim) }; };
    const y = run(false), s = run(true);
    expect(y.r.arms.a1.delay).toBeLessThan(y.r.arms.a0.delay);          // asosiy yoʻl kamroq kutadi
    expect(s.r.arms.a0.delay).toBeGreaterThan(y.r.arms.a0.delay);       // Stop — har mashina toʻxtaydi
    expect(s.r.total.flow).toBeGreaterThan(700);
  }, 60_000);

  it('avtobus: avtobus boʻlagi avtobus boʻlagiga ulanadi, umumiy boʻlak unga tushmaydi; odam-kechikish hisoblanadi', () => {
    const N = net([0, 90, 180, 270], true);
    const A = N.arms.map((a) => ({ ...a, lanes: [...a.lanes, { id: a.id + 'b', mid: 8.75, bus: true, codes: 'S', pts: a.lanes[1].pts.map((p) => [p[0] + (a.lanes[1].pts[0][0] - a.lanes[0].pts[0][0]) * 2, p[1] + (a.lanes[1].pts[0][1] - a.lanes[0].pts[0][1]) * 2] as XY) }],
      exits: [...a.exits, { id: a.id + 'B', mid: 8.75, bus: true, pts: a.exits[1].pts.map((p) => [p[0] + (a.exits[1].pts[0][0] - a.exits[0].pts[0][0]) * 2, p[1] + (a.exits[1].pts[0][1] - a.exits[0].pts[0][1]) * 2] as XY) }] }));
    const C = autoConnect(A, false);
    expect(C.filter((c) => c.from.endsWith('b')).every((c) => c.to.endsWith('B') && c.m === 'S')).toBe(true);
    expect(C.filter((c) => !c.from.endsWith('b')).some((c) => c.to.endsWith('B'))).toBe(false);
    const r = new GraphSim({ ...N, arms: A, conns: C }, { demand: { a0: 400, a1: 400, a2: 400, a3: 400 }, bus: { a0: 40, a2: 40 }, seed: 2 }).run(1020).result(120);
    expect(r.bus.n).toBeGreaterThan(10);
    expect(r.person).toBeGreaterThan(0);
  }, 60_000);
  it('aylanma halqa: kiruvchi halqadagilarga yoʻl beradi; 4×250 — talab bajariladi, ustma-ust tushmaydi', () => {
    const N = net([0, 90, 180, 270], false), ring = { c: [0, 0] as XY, r: 9 };
    const arms = N.arms.map((a) => ({ ...a, lanes: [{ ...a.lanes[0], codes: 'LSR' }], exits: [a.exits[0]] }));
    const sim = new GraphSim({ arms, conns: ringConnect(arms, ring, false), yUp: false, ring }, { demand: { a0: 250, a1: 250, a2: 250, a3: 250 }, seed: 4 });
    let g = 1e9;
    for (let k = 0; k < 10200; k++) { sim.step(0.1); if (k % 5 === 0) g = Math.min(g, minGap(sim)); }
    const r = sim.result(120);
    expect(r.total.flow).toBeGreaterThan(850);
    expect(r.total.los).not.toBe('F');
    expect(g).toBeGreaterThan(0.6);
  }, 60_000);
  it('tarmoq: ikki svetoforli chorraha koʻcha bilan ulangan — mashina biridan ikkinchisiga oʻtadi, natija tugun boʻyicha', () => {
    const J = (jid: string, cx: number, Ls: number[]) => {
      const R0 = 14, W = 3.5;
      const arms: Arm[] = [0, 90, 180, 270].map((deg, i) => {
        const a = (deg * Math.PI) / 180, u: XY = [Math.cos(a), Math.sin(a)], rin: XY = [u[1], -u[0]];
        const P = (s: number, off: number): XY => [cx + u[0] * s + rin[0] * off, u[1] * s + rin[1] * off];
        return { id: jid + i, j: jid, hin: [-u[0], -u[1]] as XY,
          lanes: [W / 2, W * 1.5].map((off, k) => ({ id: `${jid}${i}i${k}`, mid: off, pts: [P(R0 + Ls[i], off), P(R0, off)], codes: k === 0 ? 'LS' : 'SR' })),
          exits: [W / 2, W * 1.5].map((off, k) => ({ id: `${jid}${i}o${k}`, mid: off, pts: [P(R0, -off), P(R0 + Ls[i], -off)] })) };
      });
      return { arms, conns: autoConnect(arms, false).map((c) => ({ ...c, id: jid + c.id })), j: { id: jid, signal: { cycle: 80, phases: autoPhases(arms), offset: 0 } } };
    };
    const A = J('A', 0, [80, 120, 120, 120]), B = J('B', 200, [120, 120, 80, 120]);
    const links = [0, 1].flatMap((k) => [{ from: `A0o${k}`, to: ['B2i0', 'B2i1'] }, { from: `B2o${k}`, to: ['A0i0', 'A0i1'] }]);
    const sim = new GraphSim({ arms: [...A.arms, ...B.arms], conns: [...A.conns, ...B.conns], juncs: [A.j, B.j], links, yUp: false },
      { demand: { A2: 500, A1: 300, A3: 300, B0: 500, B1: 300, B3: 300 }, seed: 2 }).run(1020);
    const r = sim.result(120);
    expect(r.arms.A0.flow).toBeGreaterThan(200);   // Bdan Aga oʻtgan
    expect(r.arms.B2.flow).toBeGreaterThan(200);   // Adan Bga oʻtgan
    expect(r.juncs.A.los).not.toBe('F');
    expect(r.total.flow).toBeGreaterThan(1800);
  }, 60_000);
});

describe('svetofor: Webster va himoyalangan chap', () => {
  it('Webster sikli talab oshganda uzayadi, split yigʻindisi 1', async () => {
    const M = await import('../../../js/kssim-graph.js');
    const W = 3.5, arms = [0, 90, 180, 270].map((deg, i) => { const a = deg * Math.PI / 180, u = [Math.cos(a), Math.sin(a)], r = [u[1], -u[0]], P = (s: number, o: number) => [u[0] * s + r[0] * o, u[1] * s + r[1] * o];
      return { id: 'a' + i, hin: [-u[0], -u[1]], lanes: ['L', 'S', 'SR'].map((c, k) => ({ id: `a${i}i${k}`, pts: [P(160, W / 2 + W * k), P(16, W / 2 + W * k)], codes: c })), exits: [0, 1].map(k => ({ id: `a${i}o${k}`, pts: [P(16, -(W / 2 + W * k)), P(160, -(W / 2 + W * k))] })) }; }) as any;
    const sh = { L: .2, S: .65, R: .15 }, ph = M.autoPhases(arms), f = (q: number) => ({ a0: q, a1: q, a2: q, a3: q });
    const lo = M.webster(arms, ph, f(300), sh), hi = M.webster(arms, ph, f(900), sh);
    expect(hi.cycle).toBeGreaterThan(lo.cycle);
    expect(hi.split.reduce((s: number, x: number) => s + x, 0)).toBeCloseTo(1, 5);
    const pp = M.autoPhases(arms, { protLeft: true });
    expect(pp.length).toBe(4);
    const sim = new M.GraphSim({ arms, conns: M.autoConnect(arms, false), yUp: false, signal: { cycle: 90, phases: pp } } as any, { demand: f(400) });
    const lp = (sim as any).plan[0];
    expect(sim.light('a0', lp.t0 + 1, 'L')).toBe('G');
    expect(sim.light('a0', lp.t0 + 1, 'S')).toBe('R');
  });
});
