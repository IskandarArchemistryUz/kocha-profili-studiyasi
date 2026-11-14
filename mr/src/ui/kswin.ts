/**
 * Master reja ichidagi Koʻchasoz oynasi (12.11, egasi maketni maʼqulladi: «Master reja ↔ Koʻchasoz: koʻcha profili oynasi»).
 * Oʻrtada Koʻchasoz B (Kesim · Reja · 3D) — `kochasoz.html?embed` ramkada; oʻngda tekshiruv (ShNQ 2.07.01-23, checkProfile)
 * va qoʻllanadigan joy; pastda «Bekor qilish» / «Master rejaga qoʻllash». Koʻchasoz har oʻzgarishni postMessage bilan yuboradi.
 */
import { h, IC, svgIcon, fmt } from './dom';
import { tr, tf } from '../i18n';
import { CATS, checkProfile, profileWidth, type Profile } from '../core/profiles';
import { ksToProfile, prepKochasoz, openInKochasoz, type KsEl } from '../kochasoz/fromMr';
import { uid } from '../core/doc';

export type KsScope = 'one' | 'all' | 'tpl';
export interface KsWinOpts {
  base: Profile;
  /** koʻcha nomi (sarlavha va «Faqat …» tugmasi) */
  label: string;
  /** shu koʻcha id si va shu profildagi barcha koʻchalar id lari */
  street: string; same: string[];
  /** foydalanuvchi profili (doc.profiles) boʻlsa — «barcha koʻchalar» uni oʻz joyida yangilaydi */
  isUser: boolean;
  /** xorijiy loyiha (meʼyor toʻplami ≠ UZ) — belgi «andoza» */
  intl?: boolean;
  /** profil faqat shu koʻchaga tegishli boʻlsa — «Faqat shu koʻcha» ham oʻz joyida yangilaydi */
  onApply: (p: Profile, streets: string[], scope: KsScope) => void;
  /** Koʻchasozni toʻliq oynada ochish (eski yoʻl — saqlanadi) */
  name: string;
}

interface KsSt { els: KsEl[]; sk?: string; uk?: string; rl?: number }

let open: HTMLElement | null = null;

/** Doiradagi profil id va nomi (sof: test qilinadi) */
export function scopeTarget(o: Pick<KsWinOpts, 'base' | 'label' | 'street' | 'same' | 'isUser'>, scope: KsScope, mkId: () => string = () => uid('u_')): { id: string; name: string; streets: string[] } {
  if (scope === 'tpl') return { id: mkId(), name: `${o.base.name} · ${tr('andoza')}`, streets: [] };
  if (scope === 'all') return { id: o.isUser ? o.base.id : mkId(), name: o.isUser ? o.base.name : `${o.base.name} · ${tr('Koʻchasoz')}`, streets: o.same };
  const solo = o.isUser && o.same.length === 1 && o.same[0] === o.street;
  return { id: solo ? o.base.id : mkId(), name: solo ? o.base.name : `${o.base.name} — ${o.label}`, streets: [o.street] };
}

export function openKsWindow(o: KsWinOpts): void {
  open?.remove();
  prepKochasoz(o.base, `${o.label} · ${o.base.name}`);
  const W0 = profileWidth(o.base);
  let st: KsSt | null = null, dirty = false, first = '', scope: KsScope = 'one';
  const prev = document.activeElement as HTMLElement | null;

  const checks = h('div', { class: 'ksw-chk', id: 'kswChk' });
  const status = h('span', { class: 'ksw-st', id: 'kswSt' });
  const applyBtn = h('button', { class: 'btn btn-primary ksw-go', id: 'kswApply', type: 'button', disabled: true }, tr('Master rejaga qoʻllash')) as HTMLButtonElement;
  const scopeBox = h('div', { class: 'ksw-scope', role: 'radiogroup', 'aria-label': tr('Qoʻllanadigan joy') });
  const conv = (): Profile | null => (st?.els?.length ? ksToProfile(st, o.base, 'tmp', o.base.name) : null);

  const row = (ok: boolean | 'warn', text: string, tag: string) => h('div', { class: 'ksw-r' }, h('i', { class: ok === true ? 'ok' : ok === 'warn' ? 'warn' : 'bad' }), h('span', {}, text), h('span', { class: 'num' }, tag));
  function renderChecks(): void {
    const p = conv() ?? o.base, iss = checkProfile(p), W = profileWidth(p), cat = CATS[p.cat];
    checks.replaceChildren(
      row(true, cat.name, o.intl ? tr('andoza') : 'ShNQ'),
      ...(iss.length ? iss.map(x => row(false, `${x.what}: ${x.value}`, x.norm)) : [row(true, tr('Meʼyorga mos.'), /\d+-jadval/.exec(cat.clause)?.[0] ?? '2.07.01-23')]),
      row(Math.abs(W - W0) < 0.01 ? true : 'warn', tr('Jami = qizil chiziqlar orasi'), `${fmt(W, 1)} / ${fmt(W0, 1)}`));
    status.textContent = dirty ? tr('Oʻzgarishlar Master rejaga qoʻllanmagan') : tr('Oʻzgarish yoʻq');
    applyBtn.disabled = !st?.els?.length;
  }
  function renderScope(): void {
    const opts: [KsScope, string][] = [['one', tf('Faqat ${name}', { name: o.label })], ['all', tf('Shu profildagi barcha koʻchalar (${n})', { n: o.same.length })], ['tpl', tr('Yangi andoza sifatida saqlash')]];
    scopeBox.replaceChildren(...opts.map(([k, t]) => h('button', { type: 'button', role: 'radio', class: 'ksw-opt', 'data-scope': k, 'aria-checked': String(scope === k), onclick: () => { scope = k; renderScope(); } }, t)));
  }

  const frame = h('iframe', { class: 'ksw-frame', id: 'kswFrame', src: './kochasoz.html?embed=1#/b', title: tr('Koʻchasoz: kesim muharriri') }) as HTMLIFrameElement;
  function onMsg(e: MessageEvent): void {
    if (e.source !== frame.contentWindow || e.origin !== location.origin) return;
    const d = e.data as { type?: string; st?: KsSt };
    if (d?.type !== 'ks-street' || !Array.isArray(d.st?.els)) return;
    const sig = JSON.stringify(d.st!.els);
    if (!st) first = sig;
    dirty = sig !== first;
    st = d.st!; renderChecks();
  }
  function close(): void { window.removeEventListener('message', onMsg); document.removeEventListener('keydown', onKey, true); ov.remove(); if (open === ov) open = null; prev?.focus?.(); }
  function onKey(e: KeyboardEvent): void { if (e.key === 'Escape' && document.activeElement !== frame) { e.stopPropagation(); close(); } }
  applyBtn.onclick = () => {
    const p = conv(); if (!p) return;
    const t = scopeTarget(o, scope);
    o.onApply({ ...p, id: t.id, name: t.name }, t.streets, scope); close();
  };

  const card = h('div', { class: 'ksw-card', role: 'dialog', 'aria-modal': 'true', 'aria-label': tr('Koʻchasoz') },
    h('div', { class: 'ksw-hd' },
      h('span', { class: 'ksw-chip' }, h('i'), tr('Koʻchasoz')),
      h('b', {}, `${o.label} · ${tr('profil')}`),
      h('span', { class: 'ksw-sub' }, tr('Master rejadan ochildi · qizil chiziqlar orasi'), ' ', h('span', { class: 'num' }, `${fmt(W0, 1)} m`)),
      h('span', { class: 'sp' }),
      h('button', { type: 'button', class: 'btn btn-sm btn-ghost', id: 'kswFull', title: tr('Koʻchasozni toʻliq oynada ochish (Master rejadan chiqiladi)'), onclick: () => openInKochasoz(o.base, o.name) }, tr('Toʻliq oyna')),
      h('button', { type: 'button', class: 'btn icon-btn', id: 'kswX', 'aria-label': tr('Yopish'), onclick: () => close() }, svgIcon(IC.x))),
    h('div', { class: 'ksw-bd' }, frame,
      h('aside', { class: 'ksw-side' },
        h('div', { class: 'ksw-h' }, tr('Tekshiruv')), checks,
        h('div', { class: 'ksw-lbl' }, tr('Qoʻllanadigan joy')), scopeBox,
        h('div', { class: 't-small' }, tr('Qoʻllangach: sahnadagi koʻcha, yongʻin va transport tekshiruvlari, «Koʻcha profili» varagʻi yangilanadi.')))),
    h('div', { class: 'ksw-ft' }, status,
      h('button', { type: 'button', class: 'btn ksw-no', id: 'kswCancel', onclick: () => close() }, tr('Bekor qilish')), applyBtn));
  const ov = h('div', { class: 'ksw', id: 'ksWin', onclick: (e: Event) => { if (e.target === ov) close(); } }, card);
  window.addEventListener('message', onMsg);
  document.addEventListener('keydown', onKey, true);
  renderScope(); renderChecks();
  document.body.append(ov); open = ov;
  (card.querySelector('#kswX') as HTMLElement).focus();
}
