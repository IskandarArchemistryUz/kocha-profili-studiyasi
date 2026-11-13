/* Uylar va aholi (13.11.2026, egasi: «qolganlarga 50 m, menga cheksiz»): Toshkent kadastri (2023) — hamma uchun
   faqat 50 m katakka umumlashtirilgan toʻr (ochiq «kadastr-agregat» tarmogʻi, bino darajasi yoʻq). Egasi bino darajasini
   «Ijtimoiy skaner» → shaxsiy qatlam orqali koʻradi (server, faqat oʻz hisobida). Kanvas boardlari 16 (uylar yoshi),
   17 (aholi zichligi), 18 (seysmik eʼtibor). */

export const KAD_DATA = 'https://raw.githubusercontent.com/IskandarArchemistryUz/kocha-profili-studiyasi/kadastr-agregat/data/kadastr';

export interface KadIndex { bbox: [number, number, number, number]; qadam: [number, number]; nx: number; ny: number; sana?: string; manba?: string }
export interface KadGrid { ix: KadIndex; aholi: Uint16Array; kku: Uint16Array; yil: Uint16Array; sq: Uint16Array }

async function gunzip(buf: ArrayBuffer): Promise<ArrayBuffer> {
  const ds = new DecompressionStream('gzip');
  return new Response(new Blob([buf]).stream().pipeThrough(ds)).arrayBuffer();
}

/** Toʻrni yuklash; xato boʻlsa — istisno */
export async function loadKadastr(f: typeof fetch = fetch, base = KAD_DATA): Promise<KadGrid> {
  const ix = await (await f(`${base}/toshkent_index.json`)).json() as KadIndex;
  const r = await f(`${base}/toshkent_50m.bin.gz`); if (!r.ok) throw new Error(`kadastr ${r.status}`);
  const raw = await gunzip(await r.arrayBuffer()), n = ix.nx * ix.ny;
  if (raw.byteLength < 8 * n) throw new Error('kadastr: fayl qisqa');
  const all = new Uint16Array(raw, 0, 4 * n);
  return { ix, aholi: all.subarray(0, n), kku: all.subarray(n, 2 * n), yil: all.subarray(2 * n, 3 * n), sq: all.subarray(3 * n, 4 * n) };
}

/** Nuqta (lon, lat) qaysi katakda: indeks yoki −1 */
export function kadCell(g: KadGrid, lon: number, lat: number): number {
  const [w, , , n] = g.ix.bbox, i = Math.floor((lon - w) / g.ix.qadam[0]), j = Math.floor((n - lat) / g.ix.qadam[1]);
  return i < 0 || j < 0 || i >= g.ix.nx || j >= g.ix.ny ? -1 : j * g.ix.nx + i;
}
export function kadCovers(g: KadGrid, lon: number, lat: number): boolean { return kadCell(g, lon, lat) >= 0; }

/** Kanvas 16: qurilgan davr */
export const KAD_ERA: [number, number, string, string][] = [[0, 1965, '#7a3b1c', '1966 gacha'], [1966, 1991, '#d9822b', '1966–1991'], [1992, 2009, '#9fb8ad', '1992–2009'], [2010, 9999, '#2f6f8f', '2010 dan keyin']];
/** Kanvas 18: seysmik eʼtibor toifasi (1..4) — saralash, ekspertiza emas */
export const KAD_SEI: [number, string, string][] = [[4, '#b2182b', 'A · 1966 gacha'], [3, '#ef8a62', 'B · 1966–1991, gʻisht'], [2, '#fddbc7', 'C · 1966–1991, beton'], [1, '#67a9cf', 'D · 1992 dan keyin']];
/** Kanvas 17: aholi zichligi, kishi/ga */
export const KAD_DENS: [number, string][] = [[0, '#fff3e6'], [120, '#fdd0a2'], [240, '#fd8d3c'], [360, '#d94801'], [480, '#a63603'], [600, '#7f2704']];
export const KAD_CELL_HA = 0.25;   // ≈ 50 × 50 m

export function eraCol(y: number): string | null { if (!y) return null; for (const [a, b, c] of KAD_ERA) if (y >= a && y <= b) return c; return null; }
export function seiCol(s: number): string | null { return KAD_SEI.find(x => x[0] === s)?.[1] ?? null; }
export function densCol(perHa: number): string | null { if (perHa <= 0) return null; let c = KAD_DENS[0][1]; for (const [t, col] of KAD_DENS) if (perHa >= t) c = col; return c; }

export interface KadStats { aholi: number; zich: number; kku: number; yilMed: number | null; era: number[]; sei: number[]; qavatMax: number; cells: number }
/** Doira (markaz c, radius R m) ichidagi jami: kataklar markazi doirada boʻlsa hisoblanadi */
export function kadStats(g: KadGrid, c: [number, number], R: number): KadStats {
  const kx = 111_320 * Math.cos(c[1] * Math.PI / 180), ky = 111_132, [w, , , n] = g.ix.bbox, [dx, dy] = g.ix.qadam;
  const i0 = Math.max(0, Math.floor((c[0] - R / kx - w) / dx)), i1 = Math.min(g.ix.nx - 1, Math.floor((c[0] + R / kx - w) / dx));
  const j0 = Math.max(0, Math.floor((n - (c[1] + R / ky)) / dy)), j1 = Math.min(g.ix.ny - 1, Math.floor((n - (c[1] - R / ky)) / dy));
  let aholi = 0, kku = 0, cells = 0, qavatMax = 0; const era = [0, 0, 0, 0], sei = [0, 0, 0, 0, 0], ys: number[] = [];
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const lon = w + (i + 0.5) * dx, lat = n - (j + 0.5) * dy;
    if (Math.hypot((lon - c[0]) * kx, (lat - c[1]) * ky) > R) continue;
    const o = j * g.ix.nx + i; cells++; aholi += g.aholi[o]; kku += g.kku[o];
    const y = g.yil[o]; if (y) { ys.push(y); const e = KAD_ERA.findIndex(([a, b]) => y >= a && y <= b); if (e >= 0) era[e] += g.kku[o] || 1; }
    const s = g.sq[o] >> 8; if (s) sei[s] += g.kku[o] || 1; qavatMax = Math.max(qavatMax, g.sq[o] & 255);
  }
  ys.sort((a, b) => a - b);
  const ha = Math.PI * R * R / 1e4;
  return { aholi: Math.round(aholi), zich: Math.round(aholi / ha), kku, yilMed: ys.length ? ys[ys.length >> 1] : null, era, sei, qavatMax, cells };
}
