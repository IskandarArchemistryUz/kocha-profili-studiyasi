/**
 * Loyihalar oynasi (14.11.2026, egasi): xizmat alohida ochilganda «Loyihalar» — Master reja loyihalar sahifasidek
 * (shisha sarlavha, nuqtali fon, eskizli kartalar), lekin faqat shu xizmatning oʻz loyihalari.
 */
import './naqsh/naqsh.css';
import { h, svgIcon } from './dom';
import { tr, tf } from '../i18n';
import { NAQSH, type NaqshId } from './backdrop';

export interface PwItem { id: string; name: string; updated?: string; cur?: boolean }
export interface PwCfg {
  svc: NaqshId; name: string; lead?: string;
  list: () => Promise<PwItem[]> | PwItem[];
  create: () => void | Promise<void>;
  open: (id: string) => void;
  remove?: (id: string) => void | Promise<void>;
}
const TRASH = '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>';
const fmtT = (t?: string) => (t ? new Date(t).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : '—');

export async function openProjects(cfg: PwCfg): Promise<void> {
  document.getElementById('projWin')?.remove();
  const close = () => { w.classList.add('out'); setTimeout(() => w.remove(), 180); document.removeEventListener('keydown', esc); };
  const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
  const w = h('div', { class: 'pw', id: 'projWin', role: 'dialog', 'aria-modal': 'true', 'aria-label': `${tr(cfg.name)} · ${tr('loyihalar')}`, style: `--acc:${NAQSH[cfg.svc].acc}` });
  const draw = async () => {
    const items = await cfg.list();
    w.replaceChildren(h('main', { class: 'pw-in' },
      h('header', { class: 'pw-bar glassbar' },
        h('span', { class: 'svcbadge' }, h('i', { style: 'background:rgb(var(--acc))' }), tr(cfg.name)),
        h('span', { class: 'sp' }),
        h('button', { type: 'button', class: 'btn btn-sm btn-ghost icon-btn', id: 'pwClose', 'aria-label': tr('Yopish'), title: tr('Yopish'), onclick: close }, svgIcon('<path d="M6 6l12 12M18 6L6 18"/>'))),
      h('h1', {}, tr(cfg.name), h('span', { class: 'sub' }, ` · ${tr('loyihalar')}`)),
      cfg.lead ? h('p', { class: 'lead' }, tr(cfg.lead)) : '',
      h('div', { class: 'pw-act' }, h('button', { type: 'button', class: 'btn btn-primary', id: 'pwNew', onclick: () => void cfg.create() }, svgIcon('<path d="M12 5v14M5 12h14"/>'), tr('Yangi loyiha'))),
      h('div', { class: 'pw-grid', id: 'pwList' }, ...items.map((it, i) => h('a', { class: `pw-card${it.cur ? ' cur' : ''}`, href: '#', 'data-pw': it.id, style: `--i:${Math.min(i, 12)}`, onclick: (e: Event) => { e.preventDefault(); if (it.cur) close(); else cfg.open(it.id); } },
        h('span', { class: `pw-th pt-${cfg.svc}`, 'aria-hidden': 'true' }, it.cur ? h('em', {}, tr('ochiq')) : ''),
        h('b', {}, it.name),
        h('span', { class: 'meta' }, `${tr('oʻzgargan')}: ${fmtT(it.updated)}`),
        cfg.remove && !it.cur && it.id ? h('button', { type: 'button', class: 'btn btn-sm pw-del', 'data-del': it.id, onclick: (e: Event) => {
          e.preventDefault(); e.stopPropagation();
          if (!confirm(tf('«${n}» oʻchirilsinmi? Buni qaytarib boʻlmaydi.', { n: it.name }))) return;
          void Promise.resolve(cfg.remove!(it.id)).then(draw);
        } }, svgIcon(TRASH), tr('Oʻchirish')) : ''))),
      h('p', { class: 'note' }, tr('Bu loyihalar shu xizmatniki va shu brauzerda saqlanadi. Master reja loyihasi ichida ishlash uchun — Master rejadan oching.'))));
  };
  await draw();
  document.body.append(w); document.addEventListener('keydown', esc);
  (w.querySelector('#pwNew') as HTMLElement | null)?.focus({ preventScroll: true });
}
