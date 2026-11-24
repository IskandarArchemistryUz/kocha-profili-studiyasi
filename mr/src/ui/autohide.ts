/**
 * 24.11 (egasi: ThinkPad ekranida yuqori panel va xizmat panellari bir-birini yopadi): yuqori panel avtomatik yashirinadi.
 * Sichqoncha ekranning yuqori chetiga borganda (yoki tepadagi kichik tutqich bosilganda, Tab bilan fokus kelganda) chiqadi,
 * panel ustidan ketgach biroz kutib yashirinadi; ochiq menyu (til va b.) yoki fokus ichida boʻlsa yashirinmaydi.
 * Panel ichidagi «qadash» tugmasi avvalgi koʻrinishni qaytaradi (tanlov saqlanadi, hamma xizmat uchun bitta).
 * <html> sinflari: `top-ah` — avtomatik yashirish yoqilgan (panellar yuqoriga koʻtariladi), `top-ah-show` — panel hozir koʻrinmoqda.
 * Har xizmat oʻz CSS ida panellarini `--top-y` boʻyicha joylashtiradi.
 */
import { h, svgIcon } from './dom';
import { tr } from '../i18n';

export const TOP_PIN_KEY = 'top-pin';
const PIN = '<path d="M9 4h6l-1 5 3 3v2H7v-2l3-3-1-5z"/><path d="M12 14v6"/>';
const CHEV = '<path d="M7 10l5 5 5-5"/>';
const EDGE = 10, HIDE_MS = 600;

let bar: HTMLElement | null = null, tab: HTMLButtonElement | null = null, timer = 0, bound = false;
const btns = new Set<HTMLButtonElement>();
const html = () => document.documentElement;
export const isTopPinned = (): boolean => { try { return localStorage.getItem(TOP_PIN_KEY) === '1'; } catch { return false; } };

function show(v: boolean): void {
  clearTimeout(timer); timer = 0;
  html().classList.toggle('top-ah-show', v);
  if (bar) bar.inert = !v && html().classList.contains('top-ah');
}
/** Yashirish mumkinmi: menyu ochiq yoki fokus panel ichida boʻlsa — yoʻq */
const busy = () => !!bar && (bar.matches(':focus-within') || !!bar.querySelector('[aria-expanded="true"]'));
function later(): void { if (!timer) timer = window.setTimeout(() => { timer = 0; if (!busy() && !bar?.matches(':hover')) show(false); }, HIDE_MS); }

function apply(): void {
  const on = !isTopPinned();
  html().classList.toggle('top-ah', on);
  show(!on);
  btns.forEach(b => { if (!b.isConnected) { btns.delete(b); return; } b.setAttribute('aria-pressed', String(!on)); const t = tr(on ? 'Yuqori panelni qadab qoʻyish' : 'Yuqori panelni avtomatik yashirish'); b.title = t; b.setAttribute('aria-label', t); });
  requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));   // xarita / sahna yangi joyga moslashsin
}

/** Yuqori panelni avtomatik yashiriladigan qilish (bir marta, xizmat ishga tushganda) */
export function autoHideTop(header: HTMLElement): void {
  bar = header;
  if (!bound) {
    bound = true;
    tab = h('button', { type: 'button', class: 'top-ah-tab glass', id: 'topTab', title: tr('Yuqori panel'), 'aria-label': tr('Yuqori panel'), onclick: () => show(true) }, svgIcon(CHEV)) as HTMLButtonElement;
    document.body.append(tab);
    document.addEventListener('pointermove', e => {
      if (!html().classList.contains('top-ah') || e.pointerType === 'touch') return;
      if (e.clientY <= EDGE) { show(true); return; }
      if (!html().classList.contains('top-ah-show')) return;
      const r = bar!.getBoundingClientRect();
      if (e.clientY > r.bottom + 24 || e.clientX < r.left - 24 || e.clientX > r.right + 24) later(); else { clearTimeout(timer); timer = 0; }
    }, { passive: true });
    // planshet: panel tashqarisiga tegilsa — yashirinadi
    document.addEventListener('pointerdown', e => {
      if (!html().classList.contains('top-ah-show') || !html().classList.contains('top-ah')) return;
      const t = e.target as Node;
      if (!bar!.contains(t) && !tab!.contains(t) && !(t as HTMLElement).closest?.('.lm-pop')) later();
    }, true);
    header.addEventListener('focusin', () => show(true));
    header.addEventListener('focusout', () => { if (html().classList.contains('top-ah')) later(); });
  }
  apply();
}

/** Panel ichidagi «qadash» tugmasi (sarlavha qayta chizilganda yangisi yaratiladi) */
export function topPinBtn(cls = 'btn btn-sm btn-ghost icon-btn'): HTMLButtonElement {
  const b = h('button', { class: cls, id: 'topPin', type: 'button', 'aria-pressed': String(isTopPinned()), onclick: () => { try { localStorage.setItem(TOP_PIN_KEY, isTopPinned() ? '0' : '1'); } catch { /* */ } apply(); } }, svgIcon(PIN)) as HTMLButtonElement;
  b.querySelector('svg')?.classList.add('ic', 'sm');
  const t = tr(isTopPinned() ? 'Yuqori panelni avtomatik yashirish' : 'Yuqori panelni qadab qoʻyish'); b.title = t; b.setAttribute('aria-label', t);
  btns.add(b); return b;
}
