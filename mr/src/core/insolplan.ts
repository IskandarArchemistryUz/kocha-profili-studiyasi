/**
 * Qavat rejasida insolyatsiya (dizayn V5): har kvartira — 94–95-band holati, har deraza — uzluksiz quyosh soati.
 * Deraza soatlari «Kvartiralar» qadamidagi hisobdan (windowSun) olinadi; reja tahrir qilinsa ham derazalar (fasad modullari)
 * oʻzgarmaydi — yangi kvartira chegaralari boʻyicha qayta baholanadi.
 * Yashash xonalari — kvartiraning eng yaxshi yoʻnalishdagi derazalari (evaluateApts bilan bir xil «optimistik» sxema).
 */
import type { Module } from './apartments';
import { badness, roomsNeeded, isWest } from './apartments';
import type { RulePlan } from './sectionplan';

export type InsolStatus = 'ok' | 'edge' | 'bad' | 'na';
export interface AptInsol {
  /** RulePlan.apts indeksi */ i: number; rooms: number;
  /** 94-band: kerakli xonalar soni */ need: number; /** talabga yetgan yashash xonalari */ ok: number;
  /** yashash xonalaridagi eng uzun uzluksiz davr, soat */ best: number;
  status: InsolStatus; living: number[];
  /** barcha derazalari shimoliy sektorda (> 290° yoki < 67,5°) — bir tomonlama shimoliy kvartira */ north: boolean;
}
/** chegarada: talabga yetmagan, lekin eng yaxshi xona ≥ 1,5 soat (V5 legendasi) */
export const EDGE_H = 1.5;

export function floorInsol(P: RulePlan, mods: Module[], hours: (m: number) => number | null, need = 2): { apts: AptInsol[]; ok: number; total: number } {
  const apts = P.apts.map((a, i): AptInsol => {
    const living = [...a.mods].sort((x, y) => badness(mods[x].az) - badness(mods[y].az)).slice(0, a.rooms);
    const hs = living.map(hours), known = hs.filter((x): x is number => x != null);
    const nd = roomsNeeded(a.rooms), ok = known.filter(x => x >= need - 1e-6).length, best = known.length ? Math.max(...known) : 0;
    const north = a.mods.length > 0 && a.mods.every(m => { const z = mods[m].az; return (z > 290 || z < 67.5) && !isWest(z); });
    const status: InsolStatus = !known.length ? 'na' : ok >= nd ? 'ok' : best >= EDGE_H - 1e-6 ? 'edge' : 'bad';
    return { i, rooms: a.rooms, need: nd, ok, best, status, living, north };
  });
  return { apts, ok: apts.filter(a => a.status === 'ok').length, total: apts.filter(a => a.status !== 'na').length };
}
