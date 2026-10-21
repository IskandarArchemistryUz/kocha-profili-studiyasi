/**
 * «Kirish» oynasi: Google tugmasi (server sozlamasida yoqilgan boʻlsa) va pochtaga bir martalik kod.
 * Parol yoʻq. Muvaffaqiyatli kirishda — resolve(true), yopilsa — resolve(false).
 */
import { h, svgIcon, IC } from '../ui/dom';
import { tr, tf, getLang } from '../i18n';
import { config, requestCode, verifyCode, google, ApiError, type AuthCfg } from './session';

let open: HTMLElement | null = null;
const GSI = 'https://accounts.google.com/gsi/client';
interface GsiId { initialize(o: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: string }): void; renderButton(el: HTMLElement, o: Record<string, unknown>): void }
const gsi = (): GsiId | undefined => (window as unknown as { google?: { accounts?: { id?: GsiId } } }).google?.accounts?.id;
function loadGsi(): Promise<void> {
  if (gsi()) return Promise.resolve();
  return new Promise((ok, no) => { const s = document.createElement('script'); s.src = GSI; s.async = true; s.onload = () => ok(); s.onerror = () => no(new Error('gsi')); document.head.append(s); });
}

export function loginDialog(reason?: string): Promise<boolean> {
  open?.remove();
  return new Promise(resolve => {
    let target = '', stage: 'email' | 'code' = 'email', busy = false, done = false;
    const close = (ok: boolean) => { if (done) return; done = true; wrap.remove(); open = null; removeEventListener('keydown', onKey, true); resolve(ok); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close(false); } };
    const msg = h('div', { class: 'kd-msg', role: 'alert', hidden: true });
    const err = (e: unknown) => { msg.hidden = false; msg.textContent = tr(e instanceof ApiError ? e.message : 'Xato yuz berdi — qayta urinib koʻring'); };
    const gbox = h('div', { class: 'kd-google', id: 'kdGoogle' });
    const or = h('div', { class: 'kd-or', hidden: true }, h('span', {}, tr('yoki'))) as HTMLElement;
    const email = h('input', { class: 'input', id: 'kdEmail', type: 'email', autocomplete: 'email', inputmode: 'email', placeholder: tr('pochta@misol.uz'), 'aria-label': tr('Pochta manzili') }) as HTMLInputElement;
    const code = h('input', { class: 'input kd-code', id: 'kdCode', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: 6, placeholder: '••••••', 'aria-label': tr('Kod') }) as HTMLInputElement;
    const go = h('button', { class: 'btn btn-primary btn-block', id: 'kdGo', type: 'submit' }, tr('Kod yuborish')) as HTMLButtonElement;
    const back = h('button', { class: 'btn btn-ghost btn-sm', id: 'kdBack', type: 'button', hidden: true, onclick: () => { stage = 'email'; sync(); } }, tr('Boshqa pochta')) as HTMLButtonElement;
    const hint = h('p', { class: 't-small kd-hint' });
    const sync = () => {
      email.hidden = stage !== 'email'; code.hidden = stage !== 'code'; back.hidden = stage !== 'code';
      go.textContent = tr(busy ? '…' : stage === 'email' ? 'Kod yuborish' : 'Kirish'); go.disabled = busy;
      hint.textContent = stage === 'email' ? tr('Parol kerak emas: pochtangizga 6 xonali kod yuboramiz.') : tf('Kod ${t} manziliga yuborildi. 10 daqiqa amal qiladi.', { t: target });
      (stage === 'email' ? email : code).focus();
    };
    const form = h('form', { class: 'kd-form', onsubmit: async (e: Event) => {
      e.preventDefault(); if (busy) return; msg.hidden = true; busy = true; sync();
      try {
        if (stage === 'email') { target = email.value.trim(); await requestCode(target); stage = 'code'; code.value = ''; }
        else { const m = await verifyCode(target, code.value.trim()); if (m) { close(true); return; } throw new ApiError('auth', 'Kirish tasdiqlanmadi — qayta urinib koʻring'); }
      } catch (x) { err(x); }
      busy = false; sync();
    } }, email, code, go, back);
    const wrap = h('div', { class: 'kd', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'kdT', id: 'kirish', onclick: (e: Event) => { if (e.target === wrap) close(false); } },
      h('div', { class: 'kd-box' },
        h('button', { class: 'ib sm kd-x', type: 'button', 'aria-label': tr('Yopish'), title: tr('Yopish'), onclick: () => close(false) }, svgIcon(IC.x)),
        h('h2', { id: 'kdT' }, tr('Kirish')),
        h('p', { class: 'kd-lead' }, tr(reason ?? 'Davom etish uchun kiring. Hisob bepul.')),
        gbox, or, form, hint, msg,
        h('p', { class: 't-small kd-legal' }, tr('Kirib, siz foydalanish shartlari va maxfiylik siyosatiga rozilik bildirasiz.'), ' ', h('a', { href: '../oferta.html', target: '_blank', rel: 'noopener' }, tr('Oferta')), ' · ', h('a', { href: '../maxfiylik.html', target: '_blank', rel: 'noopener' }, tr('Maxfiylik')))));
    document.body.append(wrap); open = wrap; addEventListener('keydown', onKey, true); sync();
    // Google tugmasi — server sozlamasida mijoz identifikatori boʻlsa
    void config().then(async (c: AuthCfg) => {
      if (!c.google || done) return;
      await loadGsi(); const id = gsi(); if (!id || done) return;
      id.initialize({ client_id: c.google, callback: async r => { msg.hidden = true; try { if (await google(r.credential)) close(true); } catch (x) { err(x); } } });
      id.renderButton(gbox, { theme: document.documentElement.dataset.theme === 'dark' ? 'filled_black' : 'outline', size: 'large', width: 300, text: 'continue_with', locale: getLang() });
      or.hidden = false;
    }).catch(x => { if (x instanceof ApiError && x.code === 'offline') err(x); });
  });
}
