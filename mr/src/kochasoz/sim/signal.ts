/* Svetofor: fazalar rejasi, joriy faza, harakat va piyoda uchun yashil.
   4 faza: Shim–Jan toʻgʻri/oʻng · Shim–Jan chap · Shar–Gʻar toʻgʻri/oʻng · Shar–Gʻar chap.
   2 faza (chapga taqiq + razvorot): Shim–Jan · Shar–Gʻar. Har fazadan keyin 3 s hammaga qizil. */

export const ALL_RED = 3;
/** 4 fazali rejada yashil ulushlari (andoza). */
export const SPLIT4 = [0.36, 0.14, 0.36, 0.14];

export interface Phase { p: number; red: boolean; left: number; n: number }

export function plan(cycle: number, twoPhase: boolean): number[] {
  if (twoPhase) { const e = cycle - 2 * ALL_RED; return [0.5 * e, 0.5 * e]; }
  const e = cycle - 4 * ALL_RED;
  return SPLIT4.map(x => x * e);
}

export function phaseAt(t: number, cycle: number, greens: number[]): Phase {
  const tc = ((t % cycle) + cycle) % cycle;
  let acc = 0;
  for (let p = 0; p < greens.length; p++) {
    if (tc < acc + greens[p]) return { p, red: false, left: acc + greens[p] - tc, n: greens.length };
    acc += greens[p];
    if (tc < acc + ALL_RED) return { p, red: true, left: acc + ALL_RED - tc, n: greens.length };
    acc += ALL_RED;
  }
  return { p: greens.length - 1, red: true, left: 0, n: greens.length };
}

/** Tarmoq k dan m harakati uchun yashilmi. extra — qoʻshimcha seksiya (oʻngga strelka). */
export function isGreen(ph: Phase, k: number, m: 'L' | 'T' | 'R', extra: boolean): boolean {
  if (ph.red) return false;
  const ns = k % 2 === 0;
  if (ph.n === 2) return m !== 'L' && ((ph.p === 0 && ns) || (ph.p === 1 && !ns));
  const lt = m === 'L';
  if (extra && m === 'R' && ((ns && ph.p === 3) || (!ns && ph.p === 1))) return true;
  return (ph.p === 0 && ns && !lt) || (ph.p === 1 && ns && lt) || (ph.p === 2 && !ns && !lt) || (ph.p === 3 && !ns && lt);
}

/** j-tarmoq oʻtish joyida piyodaga yashilmi (parallel yoʻnalishdagi toʻgʻri faza bilan). */
export function pedGreen(ph: Phase, j: number): boolean {
  if (ph.red) return false;
  const ns = j % 2 === 0;
  if (ph.n === 2) return ns ? ph.p === 1 : ph.p === 0;
  return ns ? ph.p === 2 : ph.p === 0;
}

/** Webster boʻyicha optimal sikl: C₀ = (1,5·L + 5) / (1 − Y). */
export function webster(lostTime: number, Y: number): number {
  return Y >= 1 ? Infinity : (1.5 * lostTime + 5) / (1 - Y);
}
