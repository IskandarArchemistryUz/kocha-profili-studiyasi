/**
 * Rang tanlash uskunasi (DS v2 umumiy komponenti): toʻyinganlik / yorqinlik maydoni, ton tasmasi, HEX maydoni,
 * namunalar va soʻnggi ranglar. Brauzerning <input type=color> i ishlatilmaydi. Prototip picker.js dan koʻchirilgan.
 *   openColor(anchor, '#c0643a', { title, swatches, onChange, onDone, onCancel })
 */
import { tr } from '../i18n';

export interface ColorOpts { title?: string; swatches?: string[]; onChange?: (hex: string) => void; onDone?: (hex: string) => void; onCancel?: (start: string) => void }
type St = { h: number; s: number; v: number; start: string; anchor: Element | null } & ColorOpts;

const RECENT_KEY = 'chz-recent-colors';
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export function hex2rgb(x: string): [number, number, number] | null {
  let s = String(x || '').trim().replace('#', ''); if (s.length === 3) s = s.split('').map(c => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(s)) return null;
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}
export const rgb2hex = (r: number, g: number, b: number): string => '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
export function rgb2hsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0;
  if (d) { h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
  return [h, mx ? d / mx : 0, mx];
}
export function hsv2rgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
const recent = (): string[] => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; } };
const pushRecent = (hx: string) => { try { localStorage.setItem(RECENT_KEY, JSON.stringify([hx, ...recent().filter(x => x !== hx)].slice(0, 8))); } catch { /* */ } };

let el: HTMLDivElement | null = null, st: St | null = null, raf = 0;
const cur = () => rgb2hex(...hsv2rgb(st!.h, st!.s, st!.v));
function paint(fromInput = false): void {
  const hx = cur(), q = <T extends HTMLElement>(s: string) => el!.querySelector(s) as T;
  q<HTMLElement>('.cp-sv').style.background = `hsl(${st!.h},100%,50%)`;
  const k = q<HTMLElement>('.cp-sv i'); k.style.left = `${st!.s * 100}%`; k.style.top = `${(1 - st!.v) * 100}%`; k.style.background = hx;
  q<HTMLElement>('.cp-hue i').style.left = `${st!.h / 360 * 100}%`;
  q<HTMLElement>('.cp-prev').style.background = hx;
  if (!fromInput) q<HTMLInputElement>('.cp-hex').value = hx;
}
function emit(): void { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; st?.onChange?.(cur()); }); }
function drag(area: HTMLElement, ev: PointerEvent, fn: (x: number, y: number) => void): void {
  const r = area.getBoundingClientRect();
  const move = (e: PointerEvent) => { fn(clamp((e.clientX - r.left) / r.width, 0, 1), clamp((e.clientY - r.top) / r.height, 0, 1)); paint(); emit(); };
  move(ev);
  const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
  addEventListener('pointermove', move); addEventListener('pointerup', up);
}
export function closeColor(ok: boolean): void {
  if (!el || el.hidden || !st) return;
  el.hidden = true;
  if (ok) { pushRecent(cur()); st.onDone?.(cur()); } else st.onCancel?.(st.start);
  document.removeEventListener('pointerdown', outside, true);
}
function outside(e: Event): void { const t = e.target as Node; if (el && !el.contains(t) && !(st?.anchor && st.anchor.contains(t))) closeColor(true); }
function build(): HTMLDivElement {
  const d = document.createElement('div'); d.className = 'cp'; d.hidden = true; d.tabIndex = -1; d.setAttribute('role', 'dialog');
  d.innerHTML = `<div class="cp-t"><b></b><span class="cp-prev"></span></div><div class="cp-sv"><div class="cp-w"></div><div class="cp-b"></div><i></i></div><div class="cp-hue"><i></i></div>`
    + `<div class="cp-row"><label class="cp-l" for="cpHex">HEX</label><input class="cp-hex" id="cpHex" spellcheck="false" maxlength="7" autocomplete="off"></div><div class="cp-rec"></div>`
    + `<div class="cp-f"><button class="cp-btn" type="button" data-cp="cancel"></button><button class="cp-btn pr" type="button" data-cp="ok"></button></div>`;
  document.body.appendChild(d); el = d;
  const sv = d.querySelector('.cp-sv') as HTMLElement, hue = d.querySelector('.cp-hue') as HTMLElement;
  sv.addEventListener('pointerdown', e => { e.preventDefault(); drag(sv, e, (x, y) => { st!.s = x; st!.v = 1 - y; }); });
  hue.addEventListener('pointerdown', e => { e.preventDefault(); drag(hue, e, x => { st!.h = x * 359.9; }); });
  d.querySelector('.cp-hex')!.addEventListener('input', e => { const c = hex2rgb((e.target as HTMLInputElement).value); if (c) { [st!.h, st!.s, st!.v] = rgb2hsv(...c); paint(true); emit(); } });
  d.addEventListener('click', e => {
    const b = (e.target as Element).closest('[data-cp],[data-cpc]') as HTMLElement | null; if (!b) return;
    if (b.dataset.cp) closeColor(b.dataset.cp === 'ok');
    else { const c = hex2rgb(b.dataset.cpc!)!; [st!.h, st!.s, st!.v] = rgb2hsv(...c); paint(true); emit(); }
  });
  d.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closeColor(false); } if (e.key === 'Enter') closeColor(true); });
  return d;
}
export function openColor(anchor: Element | null, hex: string, opts: ColorOpts = {}): void {
  const d = el ?? build();
  if (!d.hidden) closeColor(true);
  const c = hex2rgb(hex) ?? [192, 100, 58], [h, s, v] = rgb2hsv(...c);
  st = { h, s, v, start: rgb2hex(...c), anchor, ...opts };
  (d.querySelector('.cp-t b') as HTMLElement).textContent = opts.title ?? tr('Rang');
  d.setAttribute('aria-label', tr('Rang tanlash'));
  (d.querySelector('.cp-sv') as HTMLElement).setAttribute('aria-label', tr('Toʻyinganlik va yorqinlik'));
  (d.querySelector('.cp-hue') as HTMLElement).setAttribute('aria-label', tr('Ton'));
  (d.querySelector('[data-cp=cancel]') as HTMLElement).textContent = tr('Bekor');
  (d.querySelector('[data-cp=ok]') as HTMLElement).textContent = tr('Tayyor');
  d.querySelector('.cp-rec')!.innerHTML = [...(opts.swatches ?? []), ...recent()].filter((x, i, a) => a.indexOf(x) === i).slice(0, 14).map(x => `<button type="button" data-cpc="${x}" style="background:${x}" aria-label="${x}"></button>`).join('');
  d.hidden = false; paint();
  const r = anchor?.getBoundingClientRect() ?? { left: innerWidth / 2 - 124, bottom: innerHeight / 2 - 160, top: innerHeight / 2 - 160 }, W = 248, H = d.offsetHeight || 330;
  let x = r.left, y = r.bottom + 6;
  if (x + W > innerWidth - 8) x = innerWidth - W - 8;
  if (y + H > innerHeight - 8) y = Math.max(8, r.top - H - 6);
  d.style.left = `${Math.max(8, x)}px`; d.style.top = `${y}px`;
  setTimeout(() => document.addEventListener('pointerdown', outside, true), 0);
  d.focus({ preventScroll: true });
}
