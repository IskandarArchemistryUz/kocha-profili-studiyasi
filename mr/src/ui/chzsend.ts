/**
 * Boshqa xizmatdan (Joyshunos, Koʻchasoz, Render) Chizmadonga varaq yuborish — qaysi loyihaga tushishini aniq belgilaydi.
 * Avval «#/chizmadon» oxirgi oʻzgartirilgan Master reja loyihasini ochardi va varaq begona loyiha albomiga qoʻshilib ketardi
 * (egasi, 24.10.2026). Endi: xizmatga Master reja loyihasidan oʻtilgan boʻlsa (mr-return) va tahlil shu loyiha hududida
 * (markazdan ≤ 3 km) — shu loyihaga; aks holda — tahlil nomi bilan yangi alohida loyiha.
 */
import { getMrReturn } from './mrback';
import type { LngLat } from '../core/doc';

export const CHZ_INBOX = 'ks-chz-inbox';
export interface ChzItem { name: string; kind: 'sheet'; svg: string; vb: [number, number, number, number]; w: number; h: number }
export interface ChzTarget { target: string | 'new'; newName?: string; center?: LngLat }
/** Bir loyihaga tegishli deb hisoblanadigan masofa, m */
export const SAME_SITE_M = 3000;

const distM = (a: LngLat, b: LngLat) => { const k = Math.cos(((a[1] + b[1]) / 2) * Math.PI / 180) * 111_320; return Math.hypot((a[0] - b[0]) * k, (a[1] - b[1]) * 110_540); };

/** Qaysi loyihaga: mr-return loyihasi (hudud mos boʻlsa) yoki yangi */
export function chzTarget(name: string, center?: LngLat | null): ChzTarget {
  const r = getMrReturn();
  if (r && (!center || !r.origin || distM(center, r.origin) <= SAME_SITE_M)) return { target: r.id };
  return { target: 'new', newName: name, center: center ?? undefined };
}
/** Varaqni navbatga qoʻyib, Chizmadonni ochadi. false — brauzer xotirasi toʻla */
export function sendSheet(item: ChzItem, center?: LngLat | null, base = './'): boolean {
  try { localStorage.setItem(CHZ_INBOX, JSON.stringify({ ...item, ...chzTarget(item.name, center) })); } catch { return false; }
  location.href = `${base}#/chizmadon`;
  return true;
}
