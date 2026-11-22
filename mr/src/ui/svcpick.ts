/**
 * Xizmat eshigi (3b-2 → 14.11 egasi): Koʻchasoz, Joyshunos, Render alohida ochilganda sarlavhada «Loyihalar» —
 * shu xizmatning OʻZ loyihalari (Master reja loyihalari emas): storage/svcprojects.ts, oyna — ui/projwin.ts.
 * Master reja ichida esa xizmat oʻsha loyihada ishlaydi («← Master reja»).
 */
import { h, svgIcon } from './dom';
import { tr } from '../i18n';
import { ctxProject, svcHref } from '../core/projctx';
import { listSvc, createSvc, removeSvc, touchSvc, type SvcKind } from '../storage/svcprojects';
import { openProjects } from './projwin';

export type SvcId = 'joyshunos' | 'kochasoz' | 'render';
const KIND: Record<SvcId, SvcKind> = { joyshunos: 'joy', kochasoz: 'ks', render: 'ren' };
const NAME: Record<SvcId, string> = { joyshunos: 'Joyshunos', kochasoz: 'Koʻchasoz', render: 'Render' };
const LEAD: Record<SvcId, string> = {
  joyshunos: 'Hudud tahlili: har loyiha — oʻz hududi, qatlamlari va hisoboti.',
  kochasoz: 'Koʻcha kesimi, tarmoq va chorraha: har loyiha — oʻz koʻchasi.',
  render: 'Render: har loyiha — oʻz asos rasmlari va natijalari.',
};
/** xizmat holati kalitlari boshlanishi (eski nom bilan ham ishlatiladi) */
export const SVC_KEYS: Record<SvcId, string[]> = { joyshunos: ['joy-', 'kps_site'], kochasoz: ['ks-'], render: ['render-'] };

const page = () => location.pathname.split('/').pop() || '';
/** 22.11: loyihasiz eski ish («Avvalgi ish») tanlanganini bildiruvchi belgi — busiz xizmat avval loyihalar panelini koʻrsatadi */
const OLD = 'asosiy';
/** Joriy sahifa shu loyiha bilan ('' — avvalgi umumiy ish, ?p siz) */
export function svcIn(id: string): string {
  if (id) { const s = new URLSearchParams(location.search); s.delete(OLD); return svcHref(`${page()}${s.toString() ? `?${s}` : ''}${location.hash}`, id); }
  const s = new URLSearchParams(location.search); s.delete('p'); s.set(OLD, '1');
  return `${page()}?${s.toString()}${location.hash}`;
}
/** Brauzerda loyihasiz (umumiy kalitlardagi) eski ish bormi */
export function hasOldWork(svc: SvcId, store: Pick<Storage, 'key' | 'length'> | null = (() => { try { return localStorage; } catch { return null; } })()): boolean {
  if (!store) return false;
  for (let i = 0; i < store.length; i++) { const k = store.key(i); if (k && !k.includes('@') && SVC_KEYS[svc].some(pf => k.startsWith(pf))) return true; }
  return false;
}
/** Xizmat ishlashi mumkinmi: loyiha (?p=) yoki eski ish tanlangan boʻlsa — ha; aks holda loyihalar paneli koʻrsatiladi */
export function svcReady(search = location.search): boolean {
  const q = new URLSearchParams(search);
  // embed — Master reja oynasi ichidagi ramka (ui/kswin): eshiksiz
  return !!ctxProject(search) || q.get(OLD) === '1' || q.has('embed');
}

export function openSvcProjects(svc: SvcId, gate = false): Promise<void> {
  const k = KIND[svc], cur = gate ? null : (ctxProject() ?? (new URLSearchParams(location.search).get(OLD) === '1' ? '' : null));
  return openProjects({
    svc: k, name: NAME[svc], gate,
    lead: gate && /^#\/s\//.test(location.hash) ? 'Yuborilgan rasm qaysi loyihada ochilsin? Loyihani tanlang yoki yangisini oching.' : LEAD[svc],
    list: () => [
      ...listSvc(k).map(p => ({ id: p.id, name: p.name, updated: p.updated, cur: p.id === cur })),
      ...(hasOldWork(svc) || cur === '' ? [{ id: '', name: tr('Avvalgi ish (loyihasiz)'), cur: cur === '' }] : []),
    ],
    create: () => { const p = createSvc(k, `${tr('Yangi loyiha')} ${listSvc(k).length + 1}`); location.href = svcIn(p.id); },
    open: id => { location.href = svcIn(id); },
    remove: id => removeSvc(k, id),
  });
}

/** Kirish eshigi (22.11, egasi): xizmat loyihasiz ochilsa — xizmat yuklanmaydi, avval oʻz loyihalari paneli */
export function svcGate(svc: SvcId, start: () => unknown): void {
  if (svcReady()) { void start(); return; }
  // asosiy uslub (ds2): ildizdagi tayyor nusxa (postbuild → css/ds2.css) — bundlerga import qilinsa Master reja CSS tartibi oʻzgarardi
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '../css/ds2.css?v=4';
  const go = () => void openSvcProjects(svc, true);
  l.onload = go; l.onerror = go; document.head.append(l);
}

export function svcPickBtn(svc: SvcId): HTMLElement {
  const cur = ctxProject(); if (cur) touchSvc(KIND[svc], cur);
  const nm = cur ? listSvc(KIND[svc]).find(p => p.id === cur)?.name : tr('Avvalgi ish (loyihasiz)');
  const b = h('button', { type: 'button', class: 'btn btn-sm btn-ghost svc-proj', id: 'svcProj', 'aria-haspopup': 'dialog', title: `${tr('Loyihalar')}${nm ? ` · ${nm}` : ''}`, 'aria-label': tr('Loyihalar'), onclick: () => void openSvcProjects(svc) },
    svgIcon('<path d="M3 7h6l2 2h10v10H3z"/>'), h('span', {}, tr('Loyihalar')));
  b.querySelector('svg')?.classList.add('ic', 'sm');
  return b;
}
