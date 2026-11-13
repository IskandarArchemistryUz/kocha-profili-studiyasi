import { describe, it, expect } from 'vitest';
import { loadKadastr, kadCell, kadStats, eraCol, seiCol, densCol, type KadIndex } from '../../src/joyshunos/kadastr';

// 4 × 3 toʻr, 50 m atrofida
const IX: KadIndex = { bbox: [69.0, 41.0 - 3 * 0.00045, 69.0 + 4 * 0.0006, 41.0], qadam: [0.0006, 0.00045], nx: 4, ny: 3 };
async function gz(b: ArrayBuffer): Promise<ArrayBuffer> { return new Response(new Blob([b]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer(); }
async function bin(): Promise<ArrayBuffer> {
  const n = 12, a = new Uint16Array(4 * n);
  a[5] = 100; a[6] = 40;                      // aholi
  a[n + 5] = 2;                                // kku
  a[2 * n + 5] = 1962; a[2 * n + 6] = 2015;    // yil
  a[3 * n + 5] = (4 << 8) | 9; a[3 * n + 6] = (1 << 8) | 16;   // seysmik << 8 | qavat
  return gz(a.buffer);
}
const fakeFetch = (async (u: string) => u.endsWith('.json') ? new Response(JSON.stringify(IX)) : new Response(await bin())) as unknown as typeof fetch;

describe('kadastr 50 m toʻri', () => {
  it('yuklash (gzip) va katak', async () => {
    const g = await loadKadastr(fakeFetch, 'x');
    expect(g.aholi[5]).toBe(100); expect(g.kku[5]).toBe(2); expect(g.yil[6]).toBe(2015); expect(g.sq[5] >> 8).toBe(4);
    expect(kadCell(g, 69.0 + 1.5 * 0.0006, 41.0 - 1.5 * 0.00045)).toBe(5);
    expect(kadCell(g, 68.9, 41.0)).toBe(-1);
  });
  it('doira ichidagi jami', async () => {
    const g = await loadKadastr(fakeFetch, 'x');
    const c: [number, number] = [69.0 + 2 * 0.0006, 41.0 - 1.5 * 0.00045];
    const s = kadStats(g, c, 60);
    expect(s.aholi).toBe(140); expect(s.kku).toBe(2); expect(s.qavatMax).toBe(16);
    expect(s.era[0]).toBe(2); expect(s.era[3]).toBe(1); expect(s.sei[4]).toBe(2); expect(s.sei[1]).toBe(1);
    expect(kadStats(g, c, 10).aholi).toBe(0);   // kichik doirada katak markazi yoʻq
  });
  it('ranglar', () => {
    expect(eraCol(0)).toBeNull(); expect(eraCol(1950)).toBe('#7a3b1c'); expect(eraCol(2020)).toBe('#2f6f8f');
    expect(seiCol(0)).toBeNull(); expect(seiCol(4)).toBe('#b2182b');
    expect(densCol(0)).toBeNull(); expect(densCol(700)).toBe('#7f2704'); expect(densCol(50)).toBe('#fff3e6');
  });
});
