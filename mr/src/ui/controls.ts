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
