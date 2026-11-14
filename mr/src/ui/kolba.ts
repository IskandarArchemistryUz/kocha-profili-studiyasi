/**
 * Archemistry yuklanish belgisi (14.11.2026, kanvas «Fon naqshlari va yuklanish»): sirkul + kolba = A.
 * - «kolba» — kolba xizmat rangida toʻladi (uzoq jarayon: Render, loyiha ochilishi);
 * - «sirkul» — belgi atrofida yoy aylanadi (qisqa kutish, tugma ichida kichik).
 * Faqat kutish davom etayotganda koʻrinadi; uzun boʻlmasa (0,3 s) umuman chiqmaydi. «Harakatni kamaytirish»da — harakatsiz.
 */
import './naqsh/naqsh.css';
import { LOGO_D } from './logo';

const NS = 'http://www.w3.org/2000/svg';
const CLIP = 'M84.67 98.63C86.09 97.94 86.73 96.21 86.07 94.85C85.63 93.94 49.16 34.17 48.84 33.84C47.73 32.69 45.86 32.72 44.74 33.91C44.40 34.26 7.73 94.44 7.50 95.02C7.38 95.30 7.34 95.60 7.34 96.04L7.34 96.67L7.55 97.13C7.93 97.97 8.55 98.54 9.35 98.79L9.68 98.89L46.94 98.88L84.21 98.86L84.67 98.63Z';
let n = 0;

/** Katta belgi: kolba toʻladi (acc — xizmat rangi «r,g,b») */
export function kolba(acc = '240,179,35', size = 84): SVGSVGElement {
  const id = `kb${++n}`;
  const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '-2 -2 108 104'); s.setAttribute('width', String(size)); s.setAttribute('height', String(Math.round(size * .963)));
  s.setAttribute('class', 'kolba'); s.setAttribute('aria-hidden', 'true'); s.style.setProperty('--kb', acc);
  s.innerHTML = `<defs><clipPath id="${id}"><path d="${CLIP}"/></clipPath></defs><path class="kb-o" d="${LOGO_D}" fill-rule="evenodd"/>`
    + `<g clip-path="url(#${id})"><g class="kb-f"><path class="kb-w" d="M-110 0 Q-97 -6 -83 0 T-55 0 T-28 0 T0 0 T28 0 T55 0 T83 0 T110 0 T138 0 T166 0 T194 0 V120 H-110 Z"/></g>`
    + `<circle class="kb-b" cx="40" cy="96" r="2.2"/><circle class="kb-b b2" cx="55" cy="96" r="1.6"/><circle class="kb-b b3" cx="64" cy="96" r="2"/></g>`;
  return s;
}

/** Kichik belgi: sirkul yoyi aylanadi (tugma ichida) */
export function sirkul(size = 16): SVGSVGElement {
  const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 104 104'); s.setAttribute('width', String(size)); s.setAttribute('height', String(size));
  s.setAttribute('class', 'sirkul'); s.setAttribute('aria-hidden', 'true');
  s.innerHTML = `<g transform="translate(14 16) scale(.74)"><path d="${LOGO_D}" fill="currentColor" fill-rule="evenodd" opacity=".85"/></g><circle class="sk-a" cx="52" cy="52" r="48" pathLength="1"/>`;
  return s;
}

/** Tugma band: ichida kichik sirkul, bosib boʻlmaydi; qaytaradi — tiklash */
export function btnBusy(b: HTMLElement): () => void {
  if (b.querySelector(':scope > .sirkul')) return () => {};
  const was = (b as HTMLButtonElement).disabled, sk = sirkul(15);
  b.classList.add('kb-busy'); b.prepend(sk); (b as HTMLButtonElement).disabled = true; b.setAttribute('aria-busy', 'true');
  return () => { sk.remove(); b.classList.remove('kb-busy'); (b as HTMLButtonElement).disabled = was; b.removeAttribute('aria-busy'); };
}

/** Ekran oʻrtasida kolba (uzoq yuklanish): 0,3 s dan keyin chiqadi; qaytaradi — yopish */
export function kolbaOverlay(label = '', acc?: string, host: HTMLElement = document.body): () => void {
  const el = document.createElement('div'); el.className = 'kb-ov'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
  el.append(kolba(acc)); if (label) { const t = document.createElement('span'); t.textContent = label; el.append(t); }
  const t = setTimeout(() => host.append(el), 300);
  return () => { clearTimeout(t); el.classList.add('out'); setTimeout(() => el.remove(), 200); };
}
