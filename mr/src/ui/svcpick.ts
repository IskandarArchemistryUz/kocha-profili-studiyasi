/**
 * Xizmat eshigi (3b-2, 14.11.2026): Joyshunos, Koʻchasoz, Render bosh sahifadan alohida (manzilda ?p= yoʻq) ochilganda
 * sarlavhada «Loyihalar» tugmasi — shu xizmatning loyihalar roʻyxati. Loyiha tanlansa xizmat oʻsha loyiha ichida qayta ochiladi
 * (holat `kalit@loyiha` — boshqa loyihaga aralashmaydi); «Yangi loyiha» — boʻsh Master reja loyihasi yaratiladi.
 * Roʻyxat tepasida shu xizmatda ishlangan loyihalar (brauzerda shu xizmat kaliti bor).
 */
import { h, svgIcon } from './dom';
import { tr } from '../i18n';
import { svcHref } from '../core/projctx';

export type SvcId = 'joyshunos' | 'kochasoz' | 'render';
/** xizmat holati kalitlari boshlanishi (projctx.scoped bilan yoziladiganlar) */
export const SVC_KEYS: Record<SvcId, string[]> = {
  joyshunos: ['joy-', 'kps_site'],
  kochasoz: ['ks-'],
  render: ['render-'],
};

export interface PickItem { id: string; name: string; updated: string; used: boolean }

/** Loyihalar: shu xizmatda ishlanganlar avval, keyin oxirgi oʻzgarganlar */
export function svcList(projects: { id: string; name: string; updated: string }[], svc: SvcId, store: Pick<Storage, 'key' | 'length'> | null): PickItem[] {
  const used = new Set<string>();
  if (store) try {
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i); const at = k ? k.lastIndexOf('@') : -1; if (!k || at < 1) continue;
      if (SVC_KEYS[svc].some(pre => k.startsWith(pre))) used.add(k.slice(at + 1));
    }
  } catch { /* */ }
  return projects.map(p => ({ id: p.id, name: p.name || tr('Nomsiz loyiha'), updated: p.updated, used: used.has(p.id) }))
    .sort((a, b) => (+b.used - +a.used) || b.updated.localeCompare(a.updated));
}

/** Joriy sahifa manzili shu loyiha ichida */
export const svcIn = (id: string): string => svcHref(location.pathname.split('/').pop()! + location.search + location.hash, id);

let open: HTMLElement | null = null;
const close = () => { open?.remove(); open = null; };
if (typeof window !== 'undefined') { window.addEventListener('resize', close); document.addEventListener('pointerdown', e => { if (open && !open.contains(e.target as Node) && !(e.target as HTMLElement).closest?.('#svcProj')) close(); }); document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); }); }

export function svcPickBtn(svc: SvcId): HTMLElement {
  const b = h('button', { type: 'button', class: 'btn btn-sm btn-ghost svc-proj', id: 'svcProj', 'aria-haspopup': 'menu', title: tr('Loyiha ichida ishlash: holat shu loyihaga saqlanadi'), 'aria-label': tr('Loyihalar') },
    svgIcon('<path d="M3 7h6l2 2h10v10H3z"/>'), h('span', {}, tr('Loyihalar')));
  b.querySelector('svg')?.classList.add('ic', 'sm');
  b.addEventListener('click', () => void (async () => {
    if (open) { close(); return; }
    const db = await import('../storage/db');
    const items = svcList(await db.listProjects().catch(() => []), svc, (() => { try { return localStorage; } catch { return null; } })()).slice(0, 30);
    const r = b.getBoundingClientRect();
    const row = (it: PickItem) => h('button', { type: 'button', role: 'menuitem', 'data-pid': it.id, onclick: () => { close(); location.href = svcIn(it.id); } },
      h('span', {}, it.name), it.used ? h('i', { class: 'svc-used', title: tr('shu xizmatda ishlangan'), style: 'width:6px;height:6px;border-radius:50%;background:var(--accent,#2563eb);flex:none' }) : null);
    const m = h('div', { class: 'menu svc-pick', role: 'menu', 'aria-label': tr('Loyihalar'), style: `position:fixed;z-index:2100;top:${Math.round(r.bottom + 6)}px;left:${Math.max(8, Math.round(r.left))}px;max-height:420px;overflow-y:auto;max-width:320px` },
      h('div', { class: 'mh' }, tr('Loyiha ichida ishlash')),
      ...(items.length ? items.map(row) : [h('div', { class: 'mh' }, tr('Brauzerda loyiha yoʻq'))]),
      h('hr'),
      h('button', { type: 'button', role: 'menuitem', id: 'svcNew', onclick: () => void (async () => {
        const { blankProject } = await import('../core/doc');
        const p = blankProject(); await db.putProject(p); close(); location.href = svcIn(p.id);
      })() }, h('span', {}, `+ ${tr('Yangi loyiha')}`)));
    document.body.append(m); open = m;
  })());
  return b;
}
