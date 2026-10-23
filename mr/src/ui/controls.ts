/**
 * Dizayn tizimi v2 boshqaruvlari (6-qoida: brauzerning checkbox / select / range / number elementlari koʻrinmaydi).
 * Har biri haqiqiy <input>/<select> ni ichida saqlaydi (klaviatura, ekran oʻquvchi, e2e testlar id boʻyicha ishlaydi),
 * koʻrinishi — ds2.css klasslari: .check, .switch, .select, .range, .stepper, .seg, .tiles.
 */
import { h, svgIcon } from './dom';

type Attrs = Record<string, string | number | boolean | null | undefined | ((...a: any[]) => void)>;

/** Belgilash: [✓] matn — ichida yashirin <input type=checkbox> */
export function check(label: string | Node, attrs: Attrs & { checked?: boolean; onchange?: (v: boolean) => void }): HTMLLabelElement {
  const { checked, onchange, ...rest } = attrs;
  const inp = h('input', { type: 'checkbox', class: 'vh', ...rest }) as HTMLInputElement; inp.checked = !!checked;
  const box = h('span', { class: `check${checked ? ' on' : ''}`, 'aria-hidden': 'true' }); box.append(svgIcon('<path d="M5 12l5 5 9-10"/>'));
  inp.addEventListener('change', () => { box.classList.toggle('on', inp.checked); onchange?.(inp.checked); });
  return h('label', { class: 'ck' }, inp, box, typeof label === 'string' ? h('span', {}, label) : label);
}

/** Kalit (yoqish/oʻchirish) — <button role=switch> */
export function sw(attrs: Attrs & { on?: boolean; onchange?: (v: boolean) => void; label: string }): HTMLButtonElement {
  const { on, onchange, label, ...rest } = attrs;
  const b = h('button', { class: `switch${on ? ' on' : ''}`, role: 'switch', 'aria-checked': !!on, 'aria-label': label, type: 'button', ...rest }, h('i')) as HTMLButtonElement;
  b.addEventListener('click', () => { const v = !b.classList.contains('on'); b.classList.toggle('on', v); b.setAttribute('aria-checked', String(v)); onchange?.(v); });
  return b;
}

/** Tanlash — <select class=select> (ds2 oʻz oʻqini chizadi) */
export function select(attrs: Attrs & { onchange?: (v: string) => void }, opts: { value: string; label: string; selected?: boolean; disabled?: boolean }[] | HTMLOptionElement[]): HTMLSelectElement {
  const { onchange, ...rest } = attrs;
  const s = h('select', { class: 'select', ...rest }) as HTMLSelectElement;
  for (const o of opts) s.append(o instanceof HTMLOptionElement ? o : h('option', { value: o.value, selected: !!o.selected, disabled: !!o.disabled }, o.label));
  if (onchange) s.addEventListener('change', () => onchange(s.value));
  return s;
}

/** Siljitgich — haqiqiy <input type=range> ustida ds2 koʻrinishi (.range: b — iz, em — toʻlgan qism, i — tugmacha) */
export function range(attrs: Attrs & { min: number; max: number; step?: number; value: number; oninput?: (v: number) => void; onchange?: (v: number) => void }): HTMLDivElement {
  const { oninput, onchange, ...rest } = attrs;
  const inp = h('input', { type: 'range', class: 'rin', ...rest }) as HTMLInputElement;
  const fill = h('em'), knob = h('i');
  const sync = () => { const p = (Number(inp.value) - Number(inp.min)) / (Number(inp.max) - Number(inp.min) || 1) * 100; fill.style.width = `${p}%`; knob.style.left = `${p}%`; };
  inp.addEventListener('input', () => { sync(); oninput?.(Number(inp.value)); });
  inp.addEventListener('change', () => onchange?.(Number(inp.value)));
  const box = h('div', { class: 'range' }, h('b'), fill, knob, inp); sync();
  return box;
}

/** Qadam (− qiymat +): oʻrtada tahrirlanadigan son maydoni (id shu maydonda — klaviatura va testlar uchun) */
export function stepper(attrs: Attrs & { min: number; max: number; step?: number; value: number; onchange?: (v: number) => void; label: string; unit?: string }): HTMLDivElement {
  const { onchange, label, unit, ...rest } = attrs, step = Number(rest.step ?? 1);
  const inp = h('input', { type: 'number', class: 'stp-in num', 'aria-label': label, ...rest }) as HTMLInputElement;
  const clamp = (v: number) => Math.min(Number(inp.max), Math.max(Number(inp.min), Math.round(v / step) * step));
  const sync = () => { const v = Number(inp.value); dec.disabled = v <= Number(inp.min); inc.disabled = v >= Number(inp.max); };
  const set = (v: number) => { v = clamp(v); inp.value = String(Math.round(v * 1000) / 1000); sync(); onchange?.(v); };
  const dec = h('button', { type: 'button', 'aria-label': `${label} — kamaytirish`, onclick: () => set(Number(inp.value) - step) }, '−') as HTMLButtonElement;
  const inc = h('button', { type: 'button', 'aria-label': `${label} — oshirish`, onclick: () => set(Number(inp.value) + step) }, '+') as HTMLButtonElement;
  inp.addEventListener('change', () => { const v = Number(inp.value); if (Number.isFinite(v)) set(v); else { inp.value = String(attrs.value); sync(); } });
  sync();
  return h('div', { class: 'stepper' }, dec, inp, unit ? h('span', { class: 'stp-u' }, unit) : '', inc);
}

/** Segment (2–5 variant) — tugmalar aria-pressed bilan */
export function seg<T extends string>(items: { id: T; label: string; attrs?: Attrs }[], cur: T, onpick: (v: T) => void, attrs: Attrs = {}): HTMLDivElement {
  return h('div', { class: 'seg', role: 'group', ...attrs }, ...items.map(it => h('button', { type: 'button', 'aria-pressed': it.id === cur, ...(it.attrs ?? {}), onclick: () => onpick(it.id) }, it.label)));
}

/**
 * Ochiladigan roʻyxat (brauzerning select oynasi oʻrniga — 6-qoida): koʻrinadigan tugma + oʻz menyusi (.menu.dd-menu).
 * Ichida yashirin <select> (id, aria, e2e selectOption shu orqali) — tanlov unga yoziladi va «change» chiqaradi.
 */
export function dropdown(attrs: Attrs & { onchange?: (v: string) => void }, opts: { value: string; label: string; selected?: boolean; sub?: string }[]): HTMLDivElement {
  const { onchange, ...rest } = attrs;
  const s = h('select', { class: 'vh', tabindex: -1, ...rest }) as HTMLSelectElement;
  for (const o of opts) s.append(h('option', { value: o.value, selected: !!o.selected }, o.label));
  const lab = () => opts.find(o => o.value === s.value)?.label ?? opts[0]?.label ?? '—';
  const txt = h('span', { class: 'dd-l' }, lab());
  let menu: HTMLElement | null = null;
  const close = () => { menu?.remove(); menu = null; btn.setAttribute('aria-expanded', 'false'); document.removeEventListener('pointerdown', outside, true); };
  const outside = (e: Event) => { if (menu && !menu.contains(e.target as Node) && !btn.contains(e.target as Node)) close(); };
  const choose = (v: string) => { close(); if (s.value === v) return; s.value = v; txt.textContent = lab(); s.dispatchEvent(new Event('change', { bubbles: true })); btn.focus(); };
  const open = () => {
    if (menu) { close(); return; }
    menu = h('div', { class: 'menu dd-menu', role: 'listbox', 'aria-label': String(rest['aria-label'] ?? '') },
      ...opts.map(o => h('button', { type: 'button', role: 'option', 'aria-selected': o.value === s.value, 'data-v': o.value, onclick: () => choose(o.value) },
        h('span', {}, o.label, o.sub ? h('small', {}, o.sub) : ''), o.value === s.value ? svgIcon('<path d="M5 12l5 5 9-10"/>') : '')));
    menu.addEventListener('keydown', e => {
      const items = [...menu!.querySelectorAll('button')], i = items.indexOf(document.activeElement as HTMLButtonElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); items[Math.min(items.length - 1, i + 1)]?.focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); items[Math.max(0, i - 1)]?.focus(); }
      if (e.key === 'Escape') { e.preventDefault(); close(); btn.focus(); }
    });
    document.body.append(menu);
    const r = btn.getBoundingClientRect(), mh = Math.min(menu.scrollHeight, 360);
    menu.style.left = `${Math.max(8, Math.min(r.left, innerWidth - Math.max(r.width, 240) - 8))}px`; menu.style.minWidth = `${r.width}px`;
    menu.style.top = `${r.bottom + mh + 8 > innerHeight ? Math.max(8, r.top - mh - 6) : r.bottom + 6}px`;
    btn.setAttribute('aria-expanded', 'true');
    (menu.querySelector('[aria-selected=true]') as HTMLElement | null ?? menu.querySelector('button'))?.focus();
    setTimeout(() => document.addEventListener('pointerdown', outside, true), 0);
  };
  const btn = h('button', { type: 'button', class: 'select dd-btn', 'aria-haspopup': 'listbox', 'aria-expanded': 'false', 'aria-label': String(rest['aria-label'] ?? ''), onclick: open,
    onkeydown: (e: KeyboardEvent) => { if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!menu) open(); } } }, txt) as HTMLButtonElement;
  s.addEventListener('change', () => { txt.textContent = lab(); onchange?.(s.value); });
  return h('div', { class: 'dd' }, btn, s) as HTMLDivElement;
}
