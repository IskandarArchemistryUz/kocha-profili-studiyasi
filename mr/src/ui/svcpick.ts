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
/** Joriy sahifa shu loyiha bilan ('' — asosiy, ?p siz) */
export function svcIn(id: string): string {
  if (id) return svcHref(page() + location.search + location.hash, id);
  const s = new URLSearchParams(location.search); s.delete('p'); const q = s.toString();
  return `${page()}${q ? `?${q}` : ''}${location.hash}`;
}

export function openSvcProjects(svc: SvcId): Promise<void> {
  const k = KIND[svc], cur = ctxProject() ?? '';
  return openProjects({
    svc: k, name: NAME[svc], lead: LEAD[svc],
    list: () => [{ id: '', name: tr('Asosiy loyiha'), cur: cur === '' }, ...listSvc(k).map(p => ({ id: p.id, name: p.name, updated: p.updated, cur: p.id === cur }))],
    create: () => { const p = createSvc(k, `${tr('Yangi loyiha')} ${listSvc(k).length + 1}`); location.href = svcIn(p.id); },
    open: id => { location.href = svcIn(id); },
    remove: id => removeSvc(k, id),
  });
}

export function svcPickBtn(svc: SvcId): HTMLElement {
  const cur = ctxProject(); if (cur) touchSvc(KIND[svc], cur);
  const nm = cur ? listSvc(KIND[svc]).find(p => p.id === cur)?.name : tr('Asosiy loyiha');
  const b = h('button', { type: 'button', class: 'btn btn-sm btn-ghost svc-proj', id: 'svcProj', 'aria-haspopup': 'dialog', title: `${tr('Loyihalar')}${nm ? ` · ${nm}` : ''}`, 'aria-label': tr('Loyihalar'), onclick: () => void openSvcProjects(svc) },
    svgIcon('<path d="M3 7h6l2 2h10v10H3z"/>'), h('span', {}, tr('Loyihalar')));
  b.querySelector('svg')?.classList.add('ic', 'sm');
  return b;
}
