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
 * c78: disabled (kulrang, bosilmaydi), group (sarlavha + yashirin <optgroup>), harf bilan qidirish; menyu ekranga sigʻadigan
 * tomonga ochiladi va sahifa/panel aylantirilsa yopiladi (position:fixed menyu tugmadan ajralib qolmasin).
 */
export type DdOpt = { value: string; label: string; selected?: boolean; disabled?: boolean; sub?: string; group?: string };
export function dropdown(attrs: Attrs & { onchange?: (v: string) => void }, opts: DdOpt[]): HTMLDivElement {
  const { onchange, ...rest } = attrs;
  const aria = rest['aria-label'] != null ? String(rest['aria-label']) : null;
  const s = h('select', { class: 'vh', tabindex: -1, ...rest }) as HTMLSelectElement;
  let og: HTMLOptGroupElement | null = null;
  for (const o of opts) {
    const el = h('option', { value: o.value, selected: !!o.selected, disabled: !!o.disabled }, o.label);
    if (o.group != null) { if (og?.label !== o.group) { og = h('optgroup', { label: o.group }) as HTMLOptGroupElement; s.append(og); } og.append(el); }
    else { og = null; s.append(el); }
  }
  const lab = () => s.selectedOptions[0]?.textContent || '—';
  const txt = h('span', { class: 'dd-l' }, lab());
  let menu: HTMLElement | null = null, typed = '', typedAt = 0;
  const close = () => { menu?.remove(); menu = null; btn.setAttribute('aria-expanded', 'false'); document.removeEventListener('pointerdown', outside, true); removeEventListener('scroll', onScroll, true); removeEventListener('resize', close); };
  const outside = (e: Event) => { if (menu && !menu.contains(e.target as Node) && !btn.contains(e.target as Node)) close(); };
  const onScroll = (e: Event) => { if (menu && !menu.contains(e.target as Node)) close(); };
  const choose = (v: string) => { close(); if (s.value === v) return; s.value = v; txt.textContent = lab(); s.dispatchEvent(new Event('change', { bubbles: true })); btn.focus(); };
  const open = () => {
    if (menu) { close(); return; }
    let g: string | undefined;
    const kids: HTMLElement[] = [];
    for (const o of opts) {
      if (o.group != null && o.group !== g) kids.push(h('div', { class: 'mh dd-g', role: 'presentation' }, o.group));
      g = o.group;
      kids.push(h('button', { type: 'button', role: 'option', 'aria-selected': o.value === s.value, 'aria-disabled': !!o.disabled, disabled: !!o.disabled, 'data-v': o.value, onclick: () => { if (!o.disabled) choose(o.value); } },
        h('span', {}, o.label, o.sub ? h('small', {}, o.sub) : ''), o.value === s.value && !o.disabled ? svgIcon('<path d="M5 12l5 5 9-10"/>') : ''));
    }
    menu = h('div', { class: 'menu dd-menu', role: 'listbox', 'aria-label': aria ?? '' }, ...kids);
    const items = () => [...menu!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
    menu.addEventListener('keydown', e => {
      if (e.key !== 'Tab') e.stopPropagation();   // menyu ichidagi tugmalar ilova tezkor tugmalariga (V, H, S…, Esc) oʻtmasin
      const it = items(), i = it.indexOf(document.activeElement as HTMLButtonElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); it[Math.min(it.length - 1, i + 1)]?.focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); it[Math.max(0, i - 1)]?.focus(); }
      else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); it[e.key === 'Home' ? 0 : it.length - 1]?.focus(); }
      else if (e.key === 'Escape' || e.key === 'Tab') { if (e.key === 'Escape') e.preventDefault(); close(); btn.focus(); }
      else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {   // harf bilan qidirish (uzun roʻyxatlar: aholi punktlari, tumanlar)
        const now = performance.now(); typed = (now - typedAt < 700 ? typed : '') + e.key.toLowerCase(); typedAt = now;
        const hit = it.find((b, k) => k > (typed.length === 1 ? i : i - 1) && b.textContent!.toLowerCase().startsWith(typed)) ?? it.find(b => b.textContent!.toLowerCase().startsWith(typed));
        hit?.focus();
      }
    });
    document.body.append(menu);
    // joylash: pastda sigʻsa — pastga, aks holda kengroq tomonga (balandlik shu joyga qisqaradi, ichi aylanadi)
    const r = btn.getBoundingClientRect(), gap = 6, pad = 8, want = Math.min(menu.scrollHeight, 360);
    const below = innerHeight - r.bottom - gap - pad, above = r.top - gap - pad;
    const down = want <= below || below >= above, mh = Math.max(120, Math.min(want, down ? below : above));
    menu.style.maxHeight = `${mh}px`; menu.style.minWidth = `${r.width}px`; menu.style.maxWidth = `${Math.min(480, innerWidth - 2 * pad)}px`;
    const w = menu.offsetWidth, hh = menu.offsetHeight;
    menu.style.left = `${Math.max(pad, Math.min(r.left, innerWidth - w - pad))}px`;
    menu.style.top = `${down ? Math.min(r.bottom + gap, innerHeight - hh - pad) : Math.max(pad, r.top - gap - hh)}px`;
    btn.setAttribute('aria-expanded', 'true');
    const f = menu.querySelector<HTMLElement>('[aria-selected=true]:not(:disabled)') ?? items()[0];
    f?.focus({ preventScroll: true }); f?.scrollIntoView({ block: 'nearest' });
    setTimeout(() => { if (!menu) return; document.addEventListener('pointerdown', outside, true); addEventListener('scroll', onScroll, true); addEventListener('resize', close); }, 0);
  };
  const btn = h('button', { type: 'button', class: 'select dd-btn', 'aria-haspopup': 'listbox', 'aria-expanded': 'false', 'aria-label': aria, onclick: open,
    onkeydown: (e: KeyboardEvent) => { if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!menu) open(); } } }, txt) as HTMLButtonElement;
  s.addEventListener('change', () => { txt.textContent = lab(); onchange?.(s.value); });
  return h('div', { class: 'dd' }, btn, s) as HTMLDivElement;
}
