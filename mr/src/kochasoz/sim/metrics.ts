/* Natija koʻrsatkichlari: LOS (HCM chegaralari), odam-kechikish, takrorlar boʻyicha oraliq. */
import type { AgentType } from './types';

/** Signalli chorrahada transport LOS (HCM): A ≤ 10, B ≤ 20, C ≤ 35, D ≤ 55, E ≤ 80 s. */
export function losVehicle(d: number): string {
  return d <= 10 ? 'A' : d <= 20 ? 'B' : d <= 35 ? 'C' : d <= 55 ? 'D' : d <= 80 ? 'E' : 'F';
}
/** Signalli chorrahada piyoda va velo LOS (HCM): A ≤ 10, B ≤ 20, C ≤ 30, D ≤ 40, E ≤ 60 s. */
export function losPed(d: number): string {
  return d <= 10 ? 'A' : d <= 20 ? 'B' : d <= 30 ? 'C' : d <= 40 ? 'D' : d <= 60 ? 'E' : 'F';
}

export type ModeKey = AgentType | 'ped';
export interface ModeStat { n: number; delaySum: number }

export interface Result {
  /** simulyatsiya vaqti, s */ t: number;
  /** har tur: oʻtganlar va oʻrtacha kechikish */
  modes: Record<ModeKey, { n: number; delay: number | null; people: number }>;
  /** odam-kechikish, s/odam (samokat — xavf qatlami — kirmaydi) */ personDelay: number | null;
  /** chapga ketuvchi (razvorot bilan ham) oʻrtacha kechikishi */ leftDelay: number | null;
  /** chap burilish toʻsgan toʻgʻri harakat, mash.·s */ blocked: number;
  /** har tarmoq maksimal navbati */ qmax: number[];
  pedRedFinish: number;
  yieldsToPed: number;
  rightHook: number;
  risk: { scootRed: number; scootNear: number; hardBrake: number; scootTotal: number };
  /** kelganlar = oʻtganlar + yoʻlda + kirishni kutayotganlar */
  arrived: number; onNet: number; pending: number;
}

/** Bir nechta takror natijasidan oʻrtacha va oraliq (min–max). */
export function summarize(vals: number[]): { mean: number; min: number; max: number } {
  const v = vals.filter(x => Number.isFinite(x));
  if (!v.length) return { mean: NaN, min: NaN, max: NaN };
  return { mean: v.reduce((a, b) => a + b, 0) / v.length, min: Math.min(...v), max: Math.max(...v) };
}
