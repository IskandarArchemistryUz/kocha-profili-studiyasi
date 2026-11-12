/* Tasodif urugʻi bilan generator (mulberry32) — E Mikromodel bilan bir xil.
   «Hozir» va «loyiha» bir xil urugʻ bilan hisoblanadi, shunda farq sxemadan keladi, tasodifdan emas. */
export type Rng = () => number;

export function rng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Puasson oqimi: keyingi kelishgacha vaqt, s. rate — soatiga. */
export function expo(r: Rng, rate: number): number {
  return rate > 0 ? (-Math.log(1 - r()) * 3600) / rate : Infinity;
}
