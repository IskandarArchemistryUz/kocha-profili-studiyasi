/**
 * Koʻcha va mavjud (OSM) yoʻlni nuqta boʻyicha tahrirlash (31.10, egasi): butun yoʻlni emas,
 * tutilgan nuqtani oʻchirish, shu nuqtagacha qisqartirish, shu yerda boʻlish yoki keyingi kesmani olib tashlash.
 * Mavjud yoʻl geometriyasi oʻzgarmaydi — Project.roadEdits da yoʻl id siga boʻlaklar (parts) yoziladi.
 */
import type { LngLat } from './doc';

export type VtxOp = 'del' | 'cutHead' | 'cutTail' | 'split' | 'dropSeg';
export interface RoadEdit { id: number; parts: LngLat[][] }

/** Siniq chiziqqa amal: natija — boʻlaklar (har biri ≥ 2 nuqta); boʻsh — hammasi olib tashlandi; null — amal mumkin emas */
export function vtxOp<T>(pts: T[], i: number, op: VtxOp): T[][] | null {
  const n = pts.length; if (i < 0 || i >= n) return null;
  const ok = (a: T[][]) => a.filter(p => p.length >= 2);
  switch (op) {
    case 'del': return n > 2 ? [pts.filter((_, k) => k !== i)] : null;
    case 'cutHead': return i > 0 ? ok([pts.slice(i)]) : null;          // boshidan shu nuqtagacha olib tashlanadi
    case 'cutTail': return i < n - 1 ? ok([pts.slice(0, i + 1)]) : null; // shu nuqtadan oxirigacha olib tashlanadi
    case 'split': return i > 0 && i < n - 1 ? [pts.slice(0, i + 1), pts.slice(i)] : null;
    case 'dropSeg': return i < n - 1 ? ok([pts.slice(0, i + 1), pts.slice(i + 1)]) : null;   // i → i+1 kesma olib tashlanadi
  }
}

/** OSM yoʻllariga tahrirlarni qoʻllash: tahrirlangan yoʻl oʻrniga uning boʻlaklari (bir xil id, part — tartib raqami) */
export function applyRoadEdits<R extends { id: number; pts: LngLat[] }>(roads: R[], edits: RoadEdit[] | undefined): (R & { part?: number })[] {
  if (!edits?.length) return roads;
  const by = new Map(edits.map(e => [e.id, e.parts]));
  return roads.flatMap(r => { const ps = by.get(r.id); return ps ? ps.map((pts, part) => ({ ...r, pts, part })) : [r]; });
}

/**
 * Oraliqni olib tashlash (31.10, egasi: yoʻlning oʻrtasidagi qismini oʻchirib boʻlmayapti): siniq chiziq ustida ikki nuqta
 * (bosilgan joylar chiziqqa proyeksiya qilinadi) orasidagi qism olib tashlanadi — natija 0, 1 yoki 2 boʻlak (≥ 2 nuqta, ≥ minLen m).
 */
export function cutBetween(pts: [number, number][], a: [number, number], b: [number, number], minLen = 3): [number, number][][] {
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const proj = (p: [number, number]) => { let bt = 0, bd = Infinity; for (let i = 0; i + 1 < pts.length; i++) { const u = pts[i], v = pts[i + 1], dx = v[0] - u[0], dy = v[1] - u[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - u[0]) * dx + (p[1] - u[1]) * dy) / L2)), d = Math.hypot(u[0] + dx * t - p[0], u[1] + dy * t - p[1]); if (d < bd) { bd = d; bt = cum[i] + t * Math.sqrt(L2); } } return bt; };
  const at = (s: number): [number, number] => { for (let i = 0; i + 1 < pts.length; i++) if (s <= cum[i + 1] || i + 2 === pts.length) { const L = cum[i + 1] - cum[i] || 1, t = Math.max(0, Math.min(1, (s - cum[i]) / L)); return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t]; } return pts[pts.length - 1]; };
  let s1 = proj(a), s2 = proj(b); if (s1 > s2) [s1, s2] = [s2, s1];
  const total = cum[cum.length - 1], out: [number, number][][] = [];
  if (s1 >= minLen) out.push([...pts.filter((_, i) => cum[i] < s1 - 1e-6), at(s1)]);
  if (total - s2 >= minLen) out.push([at(s2), ...pts.filter((_, i) => cum[i] > s2 + 1e-6)]);
  return out.filter(p => p.length >= 2);
}
