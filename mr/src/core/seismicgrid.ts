/**
 * 14.11.2026 (egasi, seysmiklik 2-bosqich): joy boʻyicha taxminiy ball — GSHAP 1999 (GFZ) PGA, 10 % / 50 yil.
 * Fayl: data/seis/gshap-ball-05.bin (tools/gshap_build.py) — 720 × 360 uint8, 0,5° katak; 0 — maʼlumot yoʻq, 6 — ≤ 6, 7–9, 10 — > 9.
 * Bu — faqat taklif: milliy xarita va meʼyor ustun, qarorni foydalanuvchi qiladi.
 */
export const GRID_URL = '../data/seis/gshap-ball-05.bin';
const W = 720, H = 360, D = 0.5;
let grid: Uint8Array | null = null, p: Promise<Uint8Array | null> | null = null;

/** Toʻr baytlaridan qiymat (test va ilova uchun umumiy) */
export function cellBall(g: Uint8Array, lng: number, lat: number): number | null {
  if (g.length !== W * H || !Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  const x = ((lng + 180) % 360 + 360) % 360, c = Math.min(W - 1, Math.floor(x / D)), r = Math.min(H - 1, Math.max(0, Math.floor((90 - lat) / D)));
  const v = g[r * W + c];
  return v === 0 ? null : v;
}

/** Ball taklifi yoki null (fayl yoʻq / maʼlumot yoʻq). Fayl bir marta yuklanadi. */
export async function suggestBall(lng: number, lat: number): Promise<number | null> {
  p ??= fetch(GRID_URL).then(r => (r.ok ? r.arrayBuffer() : null)).then(b => (b ? new Uint8Array(b) : null)).catch(() => null);
  grid ??= await p;
  return grid ? cellBall(grid, lng, lat) : null;
}
