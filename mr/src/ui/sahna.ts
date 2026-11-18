/**
 * 18.11 (T1, egasi: noutbukdan taqdimotda oynalar sahnani yopdi): Koʻchasoz, Joyshunos va boshqa xizmatlar uchun umumiy sahna rejimi.
 * <html> ga `sahna` sinfi qoʻyiladi — har xizmat oʻz CSS ida nimani yashirishini yozadi. P — yoqish/oʻchirish, Esc — chiqish
 * (yozuv maydonida emas). Yoqilganda pastda chapda «Sahna rejimidan chiqish (Esc)» tugmasi. Saqlanmaydi.
 * Master reja oʻz sahna rejimiga ega (ui/editor.ts: setSahna) — qadamlar bilan.
 */
import { h, svgIcon } from './dom';
import { tr } from '../i18n';

const ICON = '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>';
let on = false, bar: HTMLElement | null = null, bound = false;
const btns = new Set<HTMLButtonElement>();

export function isSahna(): boolean { return on; }

export function setSahna(v: boolean): void {
  on = v; document.documentElement.classList.toggle('sahna', v);
  btns.forEach(b => { if (b.isConnected) b.setAttribute('aria-pressed', String(v)); else btns.delete(b); });
  if (v && !bar) {
    bar = h('button', { class: 'btn btn-sm sahna-exit glass', id: 'sahnaExit', type: 'button', onclick: () => setSahna(false) }, svgIcon(ICON), h('span', {}, tr('Sahna rejimidan chiqish (Esc)')));
    document.body.append(bar);
  } else if (!v && bar) { bar.remove(); bar = null; }
  // sahna oʻlchami oʻzgardi — xarita, SVG va 3D koʻrinishlar qayta moslashsin
  requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
}

/** Klaviatura (P / Esc) — bir marta ulanadi */
export function bindSahnaKeys(): void {
  if (bound) return; bound = true;
  document.addEventListener('keydown', e => {
    const t = e.target as HTMLElement | null;
    if (t?.closest?.('input,textarea,select,[contenteditable=true]') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Escape' && on) { e.preventDefault(); e.stopPropagation(); setSahna(false); }
    else if (e.key.toLowerCase() === 'p' && !e.repeat) { e.preventDefault(); setSahna(!on); }
  }, true);
}

/** Yuqori panel tugmasi (sarlavha qayta chizilganda yangisi yaratiladi) */
export function sahnaBtn(cls = 'btn btn-sm btn-ghost icon-btn'): HTMLButtonElement {
  bindSahnaKeys();
  const b = h('button', { class: cls, id: 'sahnaBtn', type: 'button', title: tr('Sahna rejimi (P)'), 'aria-label': tr('Sahna rejimi (P)'), 'aria-pressed': String(on), onclick: () => setSahna(!on) }, svgIcon(ICON)) as HTMLButtonElement;
  b.querySelector('svg')?.classList.add('ic', 'sm');
  btns.add(b); return b;
}
