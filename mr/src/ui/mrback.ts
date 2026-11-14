/**
 * 18-band: Master rejadan boshqa xizmatga (Joyshunos, Koʻchasoz, Render) oʻtilganda — qaytish manzili.
 * Shu brauzer varagʻida (sessionStorage) saqlanadi: loyiha, qadam va kamera. Xizmat sarlavhasida «← Master reja: <loyiha>»
 * tugmasi chiqadi; bosilganda aynan shu loyiha, shu qadam va shu kamera koʻrinishi tiklanadi.
 */
import { h, svgIcon } from './dom';
import { tr } from '../i18n';
import { ctxProject, projectHref } from '../core/projctx';
import { svcPickBtn, type SvcId } from './svcpick';

export interface MrReturn { id: string; name: string; step: string; cam: unknown; at: number; /** loyiha markazi — boshqa xizmatdagi tahlil shu hududdami (chzsend.ts) */ origin?: [number, number]; /** loyihada uchastka chizilganmi — boʻlmasa markaz sukut, ishonchsiz */ hasSite?: boolean }
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
/**
 * Sarlavhadagi «← Master reja: <loyiha>» tugmasi.
 * 3-PR (14.11): loyiha manzilda (?p=) boʻlsa — shundan (nomi brauzer bazasidan); boʻlmasa — eski sessionStorage qaytish manzili.
 */
export function mrBackBtn(svc?: SvcId): HTMLElement | '' {
  const p = ctxProject(), r = getMrReturn();
  const id = p ?? r?.id; if (!id) return svc ? svcPickBtn(svc) : '';   // 3b-2: alohida ochilgan — shu xizmatning loyihalari
  const nm = h('span', { class: 'nm' }, r && r.id === id ? r.name : '');
  const a = h('a', { class: 'btn btn-sm mr-back', id: 'mrBack', href: projectHref(id), title: tr('Master rejaga qaytish'), onclick: () => { try { sessionStorage.setItem(KB, id); } catch { /* */ } } },
    svgIcon('<path d="M15 6l-6 6 6 6"/>'), h('span', {}, tr('Master reja')), nm);
  if (p && !(r && r.id === p)) void import('../storage/db').then(m => m.getProject(p)).then(d => { if (d) { nm.textContent = d.name; a.title = `${tr('Master rejaga qaytish')}: ${d.name}`; } }).catch(() => {});
  else if (r) a.title = `${tr('Master rejaga qaytish')}: ${r.name}`;
  return a;
}
