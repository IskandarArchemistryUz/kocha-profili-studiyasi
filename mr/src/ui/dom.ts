/** Kichik DOM yordamchilari — freymvorksiz, lekin bir xil uslubda */
type Attrs = Record<string, string | number | boolean | null | undefined | ((e: any) => void)>;
type Child = Node | string | number | null | undefined | false | Child[];

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...kids: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
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
  return v.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d });
}

let toastT: ReturnType<typeof setTimeout> | undefined;
export function toast(msg: string): void {
  let el = document.querySelector<HTMLDivElement>('.toast');
  if (!el) { el = h('div', { class: 'toast', role: 'status' }); document.body.appendChild(el); }
  el.textContent = msg; el.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { el!.hidden = true; }, 3500);
}

export function download(name: string, data: string | Blob, type = 'application/json'): void {
  const url = typeof data === 'string' && data.startsWith('data:') ? data : URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type }));
  const a = h('a', { href: url, download: name }); document.body.appendChild(a); a.click(); a.remove();
  if (!url.startsWith('data:')) setTimeout(() => URL.revokeObjectURL(url), 2000);
}
