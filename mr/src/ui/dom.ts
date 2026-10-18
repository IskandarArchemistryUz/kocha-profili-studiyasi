/** Kichik DOM yordamchilari — freymvorksiz, lekin bir xil uslubda */
import { trSvg, getLang } from '../i18n';
import { needWm, wmFile } from '../core/wm';
type Attrs = Record<string, string | number | boolean | null | undefined | ((e: any) => void)>;
type Child = Node | string | number | null | undefined | false | Child[];

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...kids: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    // aria-* qiymati matn boʻlishi shart («true»/«false») — CSS va ekran oʻquvchilar shunga qaraydi
    if (k.startsWith('aria-') && typeof v === 'boolean') { el.setAttribute(k, String(v)); continue; }
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else if (k === 'class') el.className = String(v);
    else if (k === 'html') el.innerHTML = String(v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  append(el, kids);
  return el;
}

function append(el: Node, kids: Child[]): void {
  for (const c of kids) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
  }
}

export function svgIcon(d: string): SVGSVGElement {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = d; return s;
}

/** Sonlar oʻzbek/rus odatida: 12 345,6 */
export function fmt(v: number, d = 0): string {
  if (!Number.isFinite(v)) return '—';
  return v.toLocaleString(getLang() === 'en' ? 'en-US' : 'ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d });
}

let toastT: ReturnType<typeof setTimeout> | undefined;
export function toast(msg: string): void {
  let el = document.querySelector<HTMLDivElement>('.toast');
  if (!el) { el = h('div', { class: 'toast', role: 'status' }); document.body.appendChild(el); }
  el.textContent = msg; el.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { el!.hidden = true; }, 3500);
}

export function download(name: string, data: string | Blob, type = 'application/json'): void {
  if (typeof data === 'string' && type.includes('svg')) data = trSvg(data);   // chizma ichidagi yozuvlar — tanlangan tilda
  // bepul yuklash — setkasimon belgi (SVG, PNG, DXF); egasi uchun — belgisiz
  if (needWm() && /\.(svg|png|jpe?g|dxf)$/i.test(name)) { void wmFile(name, data, type).then(d => save(name, d, type)).catch(() => save(name, data, type)); return; }
  save(name, data, type);
}
function save(name: string, data: string | Blob, type: string): void {
  const url = typeof data === 'string' && data.startsWith('data:') ? data : URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type }));
  const a = h('a', { href: url, download: name }); document.body.appendChild(a); a.click(); a.remove();
  if (!url.startsWith('data:')) setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Yagona ikonka tili (dizayn «Ikonkalar»): 24 × 24, chiziq 1,75, uchlar yumaloq, rang — matn rangi */
export const IC = {
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  pencil: '<path d="M4 20l4-1 11-11-3-3L5 16zM14 6l3 3"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  next: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  chevDown: '<path d="M6 9l6 6 6-6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11"/>',
  info: '<path d="M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 11v5M12 7.5v.5"/>',
};
/** ikonka + matn (tugma ichida) */
export function icl(icon: string, label: string): (Node | string)[] { const s = svgIcon(icon); s.classList.add('ic'); return [s, label]; }
