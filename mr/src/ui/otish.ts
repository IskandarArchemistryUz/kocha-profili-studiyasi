/**
 * Boʻlimga oʻtish (14.11.2026, kanvas «Oʻtish: boʻlim → loyihalar»):
 * - chiqish: bosilgan karta/tugma joyidan xizmat rangidagi qatlam ekranga kengayadi (0,42 s), keyin sahifa ochiladi;
 * - kirish: ochilgan sahifada xizmat foni va jonli naqsh bir lahza koʻrinib soʻnadi.
 * Animatsiya faqat oʻtishda (egasi: «ishga xalaqit bermasin»); «harakatni kamaytirish»da — yoʻq.
 */
import './naqsh/naqsh.css';
import { SRC, NAQSH, type NaqshId } from './backdrop';
import { kolba } from './kolba';

export type OtId = NaqshId | 'mr';
/** fon (kunduz, tun), sukut tungi xizmatmi */
const PAL: Record<OtId, { day: string; night: string; dark: boolean; acc: string }> = {
  mr: { day: '#ffffff', night: '#141414', dark: false, acc: '20,20,20' },
  ks: { day: '#f1f3f8', night: '#0f1220', dark: false, acc: NAQSH.ks.acc },
  joy: { day: '#f7f1ec', night: '#15100d', dark: true, acc: NAQSH.joy.acc },
  dk: { day: '#eaf3f3', night: '#05272b', dark: true, acc: NAQSH.dk.acc },
  chz: { day: '#eee9df', night: '#17121a', dark: false, acc: NAQSH.chz.acc },
  ren: { day: '#f4f1ea', night: '#0b0b0b', dark: true, acc: NAQSH.ren.acc },
  bin: { day: '#f6eef1', night: '#120d0f', dark: true, acc: NAQSH.bin.acc },
};
const KEY = 'otish';
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
function isDarkFor(id: OtId): boolean {
  let t: string | null = null; try { t = localStorage.getItem('mr-theme'); } catch { /* */ }
  if (t === 'dark') return true; if (t === 'light') return false;
  return PAL[id].dark || (typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches);
}
function layer(id: OtId, cls: 'out' | 'in'): HTMLElement {
  const d = isDarkFor(id), p = PAL[id];
  const el = document.createElement('div'); el.className = `otish ${cls}`; el.setAttribute('aria-hidden', 'true');
  el.style.setProperty('--ot-bg', d ? p.night : p.day); el.style.setProperty('--ot-fg', d ? '#f2f1ee' : '#141414');
  el.style.setProperty('--acc', p.acc); el.style.setProperty('--ot-op', String(id === 'mr' ? 1 : NAQSH[id as NaqshId].op[d ? 1 : 0] + .15));
  if (id === 'mr') el.append(Object.assign(document.createElement('div'), { className: 'ot-dots' }));
  else void SRC[id as NaqshId]().then(m => { el.insertAdjacentHTML('afterbegin', m.default); }).catch(() => {});
  el.append(Object.assign(document.createElement('div'), { className: 'ot-line' }));
  // sahifa sekin ochilsa (0,6 s dan keyin) — Archemistry kolbasi xizmat rangida toʻladi
  if (cls === 'out') el.append(kolba(p.acc, 84));
  return el;
}

/** Xizmatga oʻtish: from — bosilgan element (kengayish shu joydan). href — '#...' boʻlsa sahifa ichida (qatlam oʻzi soʻnadi). */
export function otishTo(id: OtId, href: string, from?: Element | null): void {
  if (reduced()) { location.href = href; return; }
  const r = from?.getBoundingClientRect(), W = innerWidth, H = innerHeight;
  const el = layer(id, 'out');
  el.style.setProperty('--ot-from', r ? `${Math.max(0, r.top)}px ${Math.max(0, W - r.right)}px ${Math.max(0, H - r.bottom)}px ${Math.max(0, r.left)}px` : '40% 40% 40% 40%');
  document.body.append(el);
  try { sessionStorage.setItem(KEY, JSON.stringify({ id, t: Date.now() })); } catch { /* */ }
  setTimeout(() => {
    location.href = href;
    if (href.startsWith('#')) { el.classList.replace('out', 'in'); setTimeout(() => el.remove(), 1200); try { sessionStorage.removeItem(KEY); } catch { /* */ } }
  }, 430);
}

/** Ochilgan sahifada: oʻtish bilan kelingan boʻlsa — xizmat foni va naqsh bir lahza koʻrinib soʻnadi */
export function otishEnter(id: OtId): void {
  let o: { id: string; t: number } | null = null;
  try { o = JSON.parse(sessionStorage.getItem(KEY) || 'null'); sessionStorage.removeItem(KEY); } catch { /* */ }
  if (!o || Date.now() - o.t > 5000 || reduced()) return;
  const el = layer(id, 'in');
  (document.body ?? document.documentElement).append(el);
  setTimeout(() => el.remove(), 1300);
}

/** Sarlavhadagi xizmatlar menyusi (a[data-svc]) bosilganda — oʻtish bilan */
const SVC_OF: Record<string, OtId> = { mr: 'mr', ks: 'ks', joy: 'joy', ren: 'ren', dk: 'dk', chz: 'chz' };
export function otishLinks(root: ParentNode = document): void {
  root.addEventListener('click', ev => {
    const e = ev as MouseEvent; if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element)?.closest?.('a[data-svc]') as HTMLAnchorElement | null;
    if (!a || a.getAttribute('aria-current') === 'page' || a.target === '_blank') return;
    const id = SVC_OF[a.dataset.svc ?? '']; if (!id) return;
    e.preventDefault(); otishTo(id, a.getAttribute('href') || a.href, a);
  });
}

/** Sahifa ichidagi oʻtish (masalan, Master reja → Chizmadon): qatlam kengayadi, fn bajariladi, qatlam soʻnadi */
export function otishRun(id: OtId, fn: () => void, from?: Element | null): void {
  if (reduced()) { fn(); return; }
  const r = from?.getBoundingClientRect(), W = innerWidth, H = innerHeight;
  const el = layer(id, 'out');
  el.style.setProperty('--ot-from', r ? `${Math.max(0, r.top)}px ${Math.max(0, W - r.right)}px ${Math.max(0, H - r.bottom)}px ${Math.max(0, r.left)}px` : '40% 40% 40% 40%');
  document.body.append(el);
  setTimeout(() => { try { fn(); } finally { el.classList.replace('out', 'in'); setTimeout(() => el.remove(), 1200); } }, 430);
}
