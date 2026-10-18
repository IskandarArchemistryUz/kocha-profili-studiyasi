/**
 * Koʻchasoz uchun kichik shablon dvigateli — kanvas maketlaridagi (x-dc) shablon va mantiqni oʻzgarishsiz ishlatadi.
 *
 *  Shablon: oddiy HTML, ichida {{ifoda}} bogʻlanishlari, <sc-for list="{{…}}" as="x"> va <sc-if value="{{…}}">,
 *  hodisalar onClick="{{funksiya}}". Mantiq: DCLogic dan meros klass — state + renderVals() (bogʻlanish qiymatlari).
 *
 *  Har setState da renderVals qayta hisoblanadi va DOM joyida yangilanadi (morph): panel aylantirish holati,
 *  fokus va bosilgan tugma saqlanadi. Matnlar tr() orqali joriy tilga, HTML qismdagi xom ranglar tokenlarga
 *  (tungi rejim) oʻtkaziladi; SVG chizma «qogʻoz» boʻlib qoladi.
 */
import { tr } from '../i18n';

export class DCLogic<S extends Record<string, any> = Record<string, any>> {
  props: Record<string, unknown>;
  state: S = {} as S;
  /** @internal qobiq bogʻlaydi */
  __r?: () => void;
  /** @internal har oʻzgarishdan keyin (saqlash) */
  __changed?: (patch: Partial<S>) => void;
  constructor(p?: Record<string, unknown>) { this.props = p ?? {}; }
  setState(p: Partial<S> | ((s: S) => Partial<S>)): void {
    const patch = typeof p === 'function' ? p(this.state) : p;
    this.state = { ...this.state, ...patch };
    this.__changed?.(patch);
    this.__r?.();
  }
  renderVals(): Record<string, unknown> { return {}; }
  componentDidMount?(): void;
  componentWillUnmount?(): void;
}

type Scope = Record<string, unknown>[];
const SVG_NS = 'http://www.w3.org/2000/svg';
const ATTR_TR = new Set(['title', 'aria-label', 'placeholder', 'alt']);

function get(scope: Scope, expr: string): unknown {
  expr = expr.trim();
  if (expr === 'true') return true; if (expr === 'false') return false;
  const ps = expr.split('.');
  let v: unknown;
  for (let i = scope.length - 1; i >= 0; i--) if (ps[0] in scope[i]) { v = scope[i][ps[0]]; break; }
  for (let j = 1; j < ps.length; j++) { if (v == null) return undefined; v = (v as Record<string, unknown>)[ps[j]]; }
  return v;
}
const unbrace = (s: string | null) => (s ?? '').replace(/^\s*\{\{|\}\}\s*$/g, '');
const str = (v: unknown) => (v == null || v === false ? '' : String(v));
function interp(s: string, scope: Scope): string { return s.replace(/\{\{([^}]*)\}\}/g, (_m, e) => str(get(scope, e))); }

/* ---------- tungi rejim: HTML qismidagi xom ranglar → ds2 tokenlari ---------- */
const TOK: [RegExp, string][] = [
  [/#141414\b/gi, 'var(--ink)'], [/#3a3936\b/gi, 'var(--ink-2)'], [/#6b6965\b/gi, 'var(--muted)'], [/#8f8a80\b/gi, 'var(--muted)'],
  [/#f2f1ee\b/gi, 'var(--bg)'], [/#ecebe8\b/gi, 'var(--fill)'], [/#f7f6f3\b/gi, 'var(--grouped)'], [/#f0efec\b/gi, 'var(--hairline)'],
  [/#ffffff\b|#fff\b/gi, 'var(--surface)'],
  [/rgba\(236,\s*235,\s*232,\s*[.\d]+\)/gi, 'var(--fill)'], [/rgba\(255,\s*255,\s*255,\s*[.\d]+\)/gi, 'var(--glass)'],
];
const NEUTRAL_BG = /^\s*(#fff|#ffffff|#f2f1ee|#f7f6f3|#ecebe8|transparent|none|var\([^)]*\)|rgba\(236,\s*235,\s*232[^)]*\)|rgba\(255,\s*255,\s*255[^)]*\))\s*$/i;
/** style matnini tokenlashtirish. Fon maʼno rangi (pastel) boʻlsa, matn rangi qora qoladi — oʻqiladi. */
function tokStyle(s: string): { style: string; paper: boolean } {
  const bg = /background(?:-color)?\s*:\s*([^;]+)/i.exec(s)?.[1] ?? '';
  /* maʼno rangi (pastel) fonli element — «qogʻoz»: ichidagi matn va ikonka qora qoladi */
  if (bg && !NEUTRAL_BG.test(bg)) return { style: /(^|;)\s*color\s*:/i.test(s) ? s : `${s};color:#141414`, paper: true };
  if (!/#[0-9a-f]{3,6}\b|rgba\(/i.test(s)) return { style: s, paper: false };
  let o = s;
  for (const [re, to] of TOK) o = o.replace(re, to);
  return { style: o, paper: false };
}

/* ---------- qurish ---------- */
interface DcEl extends Element { __dc?: Record<string, (e: Event) => void>; __on?: Set<string> }
const hasLetters = /\p{L}/u;

function build(src: Node, scope: Scope, out: Node, inSvg: boolean, paper = false): void {
  src.childNodes.forEach(n => {
    if (n.nodeType === 3) {
      const v = interp(n.nodeValue ?? '', scope);
      const t = hasLetters.test(v) ? trText(v) : v;
      out.appendChild(document.createTextNode(t)); return;
    }
    if (n.nodeType !== 1) return;
    const e = n as Element, tag = e.localName.toLowerCase();
    if (tag === 'sc-for') {
      const list = get(scope, unbrace(e.getAttribute('list'))) as unknown[] | undefined, as = e.getAttribute('as') || 'item';
      (list ?? []).forEach((it, ix) => build(e, [...scope, { [as]: it, index: ix }], out, inSvg, paper)); return;
    }
    if (tag === 'sc-if') { if (get(scope, unbrace(e.getAttribute('value')))) build(e, scope, out, inSvg, paper); return; }
    const svg = inSvg || tag === 'svg';
    /* .blk (kesim bloklari), .ub (tarmoq belgisi) — rangli «qogʻoz» plitkalar */
    let onPaper = paper || /\b(blk|ub)\b/.test(e.getAttribute('class') ?? '');
    const el = (svg ? document.createElementNS(SVG_NS, e.localName) : document.createElement(e.localName)) as DcEl;
    for (const a of Array.from(e.attributes)) {
      const name = a.name;
      if (/^on/i.test(name)) {
        const f = get(scope, unbrace(a.value));
        if (typeof f === 'function') (el.__dc ??= {})[name.slice(2).toLowerCase()] = f as (e: Event) => void;
        continue;
      }
      let v = a.value.includes('{{') ? interp(a.value, scope) : a.value;
      if (name === 'aria-pressed' || name === 'aria-checked') v = v === 'true' ? 'true' : 'false';
      if (ATTR_TR.has(name) && hasLetters.test(v)) v = trText(v);
      if (!svg && name === 'style' && !onPaper) { const r = tokStyle(v); v = r.style; onPaper = r.paper; }
      try { el.setAttribute(name, v); } catch { /* notoʻgʻri nom */ }
    }
    build(e, scope, el, svg, onPaper);
    out.appendChild(el);
  });
}

/** Matnni tarjima qilish: boʻsh joylari saqlanadi */
function trText(v: string): string {
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(v)!;
  if (!m[2]) return v;
  const t = tr(m[2]);
  return t === m[2] ? v : m[1] + t + m[3];
}

/* ---------- morph (joyida yangilash) ---------- */
function bindEvents(live: DcEl, next: DcEl): void {
  live.__dc = next.__dc;
  if (!next.__dc) return;
  for (const ev of Object.keys(next.__dc)) {
    if (live.__on?.has(ev)) continue;
    (live.__on ??= new Set()).add(ev);
    live.addEventListener(ev, e => { const f = (live as DcEl).__dc?.[ev]; if (f) f(e); });
  }
}
function same(a: Node, b: Node): boolean {
  if (a.nodeType !== b.nodeType) return false;
  if (a.nodeType === 1) return (a as Element).namespaceURI === (b as Element).namespaceURI && (a as Element).localName === (b as Element).localName;
  return true;
}
function adopt(n: Node): Node {
  /* yangi tugun: hodisalar haqiqiy tinglovchiga aylantiriladi */
  if (n.nodeType === 1) { const el = n as DcEl; if (el.__dc) { const h = el.__dc; el.__dc = undefined; bindEvents(el, { __dc: h } as DcEl); } n.childNodes.forEach(adopt); }
  return n;
}
function morph(live: Node, next: Node): void {
  const lc = live.childNodes, nc = Array.from(next.childNodes);
  for (let i = 0; i < nc.length; i++) {
    const a = lc[i], b = nc[i];
    if (!a) { live.appendChild(adopt(b)); continue; }
    if (!same(a, b)) { live.replaceChild(adopt(b), a); continue; }
    if (a.nodeType === 3) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; continue; }
    const ae = a as DcEl, be = b as DcEl;
    for (const at of Array.from(ae.attributes)) if (!be.hasAttribute(at.name)) ae.removeAttribute(at.name);
    for (const at of Array.from(be.attributes)) if (ae.getAttribute(at.name) !== at.value) ae.setAttribute(at.name, at.value);
    bindEvents(ae, be);
    morph(ae, be);
  }
  while (lc.length > nc.length) live.removeChild(live.lastChild!);
}

/** «…txt» / «…T» roʻyxatlarini text-anchor boʻyicha ajratish (maketlarda renderVals oʻzi ham qiladi) */
export interface Mounted { inst: DCLogic; root: HTMLElement; render: () => void; destroy: () => void }

/** Shablonni host ichiga oʻrnatish */
export function mount(host: HTMLElement, template: string, inst: DCLogic): Mounted {
  const tpl = document.createElement('template');
  tpl.innerHTML = template;
  const src = tpl.content;
  const root = document.createElement('div');
  root.className = 'dc-root';
  host.replaceChildren(root);
  let raf = 0;
  const render = () => {
    raf = 0;
    let vals: Record<string, unknown>;
    try { vals = inst.renderVals(); } catch (e) { console.error(e); return; }
    const frag = document.createElement('div');
    build(src, [{ props: inst.props }, vals], frag, false);
    if (!root.firstChild) { frag.childNodes.forEach(adopt); root.append(...Array.from(frag.childNodes)); }
    else morph(root, frag);
  };
  inst.__r = () => { if (!raf) raf = requestAnimationFrame(render); };
  render();
  inst.componentDidMount?.();
  return { inst, root, render, destroy: () => { if (raf) cancelAnimationFrame(raf); inst.__r = undefined; inst.componentWillUnmount?.(); root.remove(); } };
}
