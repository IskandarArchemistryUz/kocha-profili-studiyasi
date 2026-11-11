/**
 * c74: grafika shabloni tanlovi — Varaqlar, Chizmadon albomi va 3D sahna uchun bitta koʻrinish:
 * har shablon — plita (nomi, izohi) va funksiyalar palitrasidan 6 rang tasmasi. Mavjud .tile komponenti (native kontrol yoʻq).
 */
import { GSTYLES, useColorOf, type GStyle } from '../core/gstyle';
import { h } from './dom';
import { tr } from '../i18n';

const SW_USES = ['turar', 'aralash', 'maktab', 'ofis', 'savdo', 'yashil'];
const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');
export const gstyleSwatch = (g: GStyle): HTMLElement => h('span', { class: 'gs-sw', 'aria-hidden': 'true' }, ...SW_USES.map(u => h('i', { style: `background:${hex(useColorOf(g.id === 'joriy' ? null : g, u))}` })));

/** Shablon plitalari: id — joriy tanlov (yoʻq — «joriy»), pick — tanlanganda */
export function gstylePicker(id: string, cur: string | undefined, pick: (v: string) => void): HTMLElement {
  const sel = cur && GSTYLES.some(g => g.id === cur) ? cur : 'joriy';
  return h('div', { class: 'tiles c2 gs-tiles', id, role: 'radiogroup', 'aria-label': tr('Grafika shabloni') },
    ...GSTYLES.map(g => h('button', { class: 'tile', role: 'radio', 'data-gstyle': g.id, 'aria-pressed': g.id === sel, 'aria-checked': g.id === sel, title: tr(g.note), onclick: () => pick(g.id) },
      h('b', {}, tr(g.name)), gstyleSwatch(g), h('span', { class: 'sub' }, tr(g.note)))));
}
