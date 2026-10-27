/**
 * Til tanlash menyusi (10 til): tugma — joriy til kodi, ochilganda — tillar roʻyxati oʻz nomi bilan.
 * Barcha ilovalarda bitta komponent (Master reja, Koʻchasoz, Joyshunos, Render, Transport). Native select yoʻq (ds2 qoidasi).
 * Tugmalar [data-lang] — testlar va eski sahifalar bilan bir xil belgi.
 */
import { h } from './dom';
import { LANGS, getLang, onLang, tr, type Lang } from '../i18n';

const CHEV = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
let openMenu: HTMLElement | null = null, openPop: HTMLElement | null = null;
/* menyu ochilganda body ga koʻchiriladi: sarlavhadagi backdrop-filter / overflow uni kesmasin */
const closeAll = () => { if (!openMenu) return; openPop?.setAttribute('hidden', ''); if (openPop) openMenu.append(openPop); openMenu.querySelector('.lm-btn')?.setAttribute('aria-expanded', 'false'); openMenu = null; openPop = null; };
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', e => { if (openMenu && !openMenu.contains(e.target as Node) && !openPop?.contains(e.target as Node)) closeAll(); }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });
}

export function langMenu(onPick: (l: Lang) => void, id = 'langSw', cls = ''): HTMLElement {
  const code = h('span', { class: 'lm-code' }, getLang().toUpperCase());
  const btn = h('button', { type: 'button', class: 'lm-btn', 'aria-haspopup': 'menu', 'aria-expanded': 'false', title: tr('Til'), 'aria-label': tr('Til') }, code);
  btn.insertAdjacentHTML('beforeend', CHEV);
  const items = LANGS.map(l => h('button', { type: 'button', role: 'menuitemradio', 'data-lang': l.id, lang: l.id, 'aria-checked': String(l.id === getLang()), 'aria-pressed': String(l.id === getLang()) },
    h('span', { class: 'lm-n' }, l.native), h('span', { class: 'lm-id' }, l.id)));
  const pop = h('div', { class: 'lm-pop', role: 'menu', 'aria-label': tr('Til'), hidden: true, 'data-notr': '' }, ...items);
  const root = h('div', { class: ('langmenu ' + cls).trim(), id, 'data-notr': '' }, btn, pop);
  const sync = () => {
    const cur = getLang(); code.textContent = cur.toUpperCase();
    for (const b of items) { const on = b.dataset.lang === cur; b.setAttribute('aria-checked', String(on)); b.setAttribute('aria-pressed', String(on)); }
  };
  btn.onclick = e => { e.stopPropagation(); const o = pop.hasAttribute('hidden'); closeAll(); if (o) { const r = btn.getBoundingClientRect(); pop.style.top = `${Math.round(r.bottom + 6)}px`; pop.style.right = `${Math.max(8, Math.round(window.innerWidth - r.right))}px`; document.body.append(pop); pop.removeAttribute('hidden'); btn.setAttribute('aria-expanded', 'true'); openMenu = root; openPop = pop; (items.find(b => b.dataset.lang === getLang()) ?? items[0]).focus({ preventScroll: true }); } };
  pop.addEventListener('keydown', e => {
    const i = items.indexOf(document.activeElement as HTMLButtonElement); if (i < 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus({ preventScroll: true }); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus({ preventScroll: true }); }
  });
  for (const b of items) b.onclick = () => { const l = b.dataset.lang as Lang; closeAll(); btn.focus({ preventScroll: true }); if (l !== getLang()) onPick(l); sync(); };
  onLang(sync);
  return root;
}

if (typeof window !== 'undefined') { window.addEventListener('resize', closeAll); window.addEventListener('scroll', e => { if (!openPop?.contains(e.target as Node)) closeAll(); }, true); }   // menyu fixed — oyna oʻzgarsa yopiladi
