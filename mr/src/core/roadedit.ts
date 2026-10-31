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
