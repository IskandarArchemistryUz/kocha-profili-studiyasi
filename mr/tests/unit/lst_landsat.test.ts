import { describe, it, expect } from 'vitest';
import { landsatGrid, loadLstLandsat, lstIndexHas, lstLatestYear, lstStats, type LstIndex } from '../../src/joyshunos/heat';
import type { LngLat } from '../../src/core/doc';

/** Kichik sintetik indeks: 0.4° × 0.3°, qadam 0.001° (Toshkent bbox bilan bir xil shakl) */
const IX: LstIndex = { hudud: 'toshkent', bbox: [69.1, 41.15, 69.5, 41.45], nx: 400, ny: 300, qadam: 0.001, piksel_m: 100, yillar: { '2024': { fayl: 'toshkent_2024.bin', N: 18 }, '2025': { fayl: 'toshkent_2025.bin', N: 21 } } };
const enc = (c: number) => Math.round((c + 50) * 100);
/** Butun maydon 40 °C, gʻarbiy yarmi 44 °C */
function grid(): Uint16Array {
  const q = new Uint16Array(IX.nx * IX.ny);
  for (let r = 0; r < IX.ny; r++) for (let c = 0; c < IX.nx; c++) q[r * IX.nx + c] = enc(c < 200 ? 44 : 40);
  return q;
}
const C: LngLat = [69.3, 41.3];

describe('Landsat issiqlik toʻri', () => {
  it('indeks: qamrov va oxirgi yil', () => {
    expect(lstIndexHas(IX, C)).toBe(true);
    expect(lstIndexHas(IX, [70, 41.3])).toBe(false);
    expect(lstLatestYear(IX)).toBe(2025);
    expect(lstLatestYear(IX, 2024)).toBe(2024);
    expect(lstLatestYear(IX, 2010)).toBe(2025);
  });

  it('dekodlash, qadam 100 m, manba belgisi', () => {
    const { g, cover } = landsatGrid(IX, 2025, grid(), C, 6000, 100);
    expect(g.n).toBe(121);
    expect(g.src).toBe('landsat');
    expect(g.px).toBe(100);
    expect(g.used).toBe(21);
    expect(cover).toBe(1);
    const mid = 60;
    expect(g.v[mid * g.n + 10]).toBeCloseTo(44, 2);   // gʻarb
    expect(g.v[mid * g.n + 110]).toBeCloseTo(40, 2);  // sharq
  });

  it('lstStats Landsat toʻrida ishlaydi (delta ishorasi)', () => {
    const { g } = landsatGrid(IX, 2025, grid(), [69.29, 41.3], 6000, 100);   // markaz gʻarbiy (issiq) qismda, 69.3 chegarasiga yaqin
    const st = lstStats(g, 500);
    expect(st.inside).toBeCloseTo(44, 1);
    expect(st.delta).toBeGreaterThan(0);
  });

  it('qamrov chetida — kam qamrov', () => {
    const { cover } = landsatGrid(IX, 2025, grid(), [69.11, 41.3], 6000, 100);
    expect(cover).toBeLessThan(0.8);
  });

  it('loadLstLandsat: qamrovda toʻr, tashqarida va xatoda null', async () => {
    const q = grid();
    const ok = (async (u: string) => u.endsWith('_index.json')
      ? new Response(JSON.stringify(IX))
      : new Response(q.slice().buffer as ArrayBuffer)) as unknown as typeof fetch;
    const g = await loadLstLandsat(C, 6000, 100, ok, ['toshkent'], 'https://t1');
    expect(g?.src).toBe('landsat');
    expect(g?.year).toBe(2025);
    expect(await loadLstLandsat([66.9, 39.6], 6000, 100, ok, ['toshkent'], 'https://t1')).toBeNull();
    const bad = (async () => new Response('', { status: 404 })) as unknown as typeof fetch;
    expect(await loadLstLandsat(C, 6000, 100, bad, ['toshkent'], 'https://t2')).toBeNull();
    const boom = (async () => { throw new Error('tarmoq'); }) as unknown as typeof fetch;
    expect(await loadLstLandsat(C, 6000, 100, boom, ['toshkent'], 'https://t3')).toBeNull();
  });
});
