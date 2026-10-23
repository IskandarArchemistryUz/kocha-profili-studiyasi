/**
 * 18-band: Master rejadan boshqa xizmatga (Joyshunos, Koʻchasoz, Render) oʻtilganda — qaytish manzili.
 * Shu brauzer varagʻida (sessionStorage) saqlanadi: loyiha, qadam va kamera. Xizmat sarlavhasida «← Master reja: <loyiha>»
 * tugmasi chiqadi; bosilganda aynan shu loyiha, shu qadam va shu kamera koʻrinishi tiklanadi.
 */
import { h, svgIcon } from './dom';
import { tr } from '../i18n';

export interface MrReturn { id: string; name: string; step: string; cam: unknown; at: number }
const K = 'mr-return', KB = 'mr-back', TTL = 24 * 3600 * 1000;

export function saveMrReturn(r: Omit<MrReturn, 'at'>): void { try { sessionStorage.setItem(K, JSON.stringify({ ...r, at: Date.now() })); } catch { /* */ } }
export function getMrReturn(): MrReturn | null {
  try { const v = JSON.parse(sessionStorage.getItem(K) || 'null') as MrReturn | null; return v && typeof v.id === 'string' && Date.now() - v.at < TTL ? v : null; } catch { return null; }
}
/** Master reja loyihasi manzili (app/ ichidagi sahifalardan) */
export const mrHref = (r: MrReturn): string => `./#/p/${encodeURIComponent(r.id)}`;
/** Qaytish tugmasi bosilgan — Master reja ochilganda qadam va kamera tiklanadi (bir marta) */
export function consumeMrBack(id: string): MrReturn | null {
  try { const b = sessionStorage.getItem(KB); if (b !== id) return null; sessionStorage.removeItem(KB); const r = getMrReturn(); return r && r.id === id ? r : null; } catch { return null; }
}
/** Sarlavhadagi «← Master reja: <loyiha>» tugmasi; qaytish manzili boʻlmasa — boʻsh */
export function mrBackBtn(): HTMLElement | '' {
  const r = getMrReturn(); if (!r) return '';
  return h('a', { class: 'btn btn-sm mr-back', id: 'mrBack', href: mrHref(r), title: `${tr('Master rejaga qaytish')}: ${r.name}`, onclick: () => { try { sessionStorage.setItem(KB, r.id); } catch { /* */ } } },
    svgIcon('<path d="M15 6l-6 6 6 6"/>'), h('span', {}, tr('Master reja')), h('span', { class: 'nm' }, r.name));
}
