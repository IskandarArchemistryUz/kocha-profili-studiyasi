/**
 * Koʻcha profillari katalogi: chapdan oʻngga boʻlaklar. Qizil chiziqlar orasidagi kenglik = boʻlaklar yigʻindisi.
 * Bu namunaviy profillar (taxmin) — ShNQ 2.07.01-23 dagi koʻcha toifalari jadvali bilan hali solishtirilmagan.
 */
export type PartKind = 'trotuar' | 'yashil' | 'velo' | 'parkovka' | 'qatnov' | 'ajratuvchi';
export interface Part { k: PartKind; w: number; lanes?: number }
export interface Profile { id: string; name: string; note: string; parts: Part[] }

const P = (k: PartKind, w: number, lanes?: number): Part => (lanes ? { k, w, lanes } : { k, w });

export const PROFILES: Profile[] = [
  { id: 'servis-9', name: 'Servis yoʻli', note: 'kvartal ichi, kirish', parts: [P('trotuar', 1.5), P('qatnov', 6, 2), P('trotuar', 1.5)] },
  { id: 'mahalla-12', name: 'Mahalla koʻchasi', note: 'sekin harakat, daraxtlar', parts: [P('trotuar', 2), P('yashil', 1.5), P('qatnov', 5, 2), P('yashil', 1.5), P('trotuar', 2)] },
  { id: 'piyoda-12', name: 'Piyoda koʻchasi', note: 'transportsiz', parts: [P('trotuar', 4), P('yashil', 4), P('trotuar', 4)] },
  { id: 'turar-20', name: 'Turar joy koʻchasi', note: 'parkovka va daraxtlar', parts: [P('trotuar', 2.5), P('yashil', 1.5), P('parkovka', 2.5), P('qatnov', 7, 2), P('parkovka', 2.5), P('yashil', 1.5), P('trotuar', 2.5)] },
  { id: 'tuman-30', name: 'Tuman koʻchasi', note: 'velo yoʻlak, ajratuvchi', parts: [P('trotuar', 3), P('yashil', 2.5), P('velo', 1.5), P('qatnov', 7, 2), P('ajratuvchi', 2), P('qatnov', 7, 2), P('velo', 1.5), P('yashil', 2.5), P('trotuar', 3)] },
  { id: 'magistral-45', name: 'Shahar magistrali', note: '3+3 qator, bulvar', parts: [P('trotuar', 4), P('yashil', 3), P('velo', 2), P('qatnov', 10.5, 3), P('ajratuvchi', 6), P('qatnov', 10.5, 3), P('velo', 2), P('yashil', 3), P('trotuar', 4)] },
];

export const profileById = (id: string): Profile => PROFILES.find(p => p.id === id) ?? PROFILES[1];
export const profileWidth = (p: Profile): number => p.parts.reduce((s, x) => s + x.w, 0);
