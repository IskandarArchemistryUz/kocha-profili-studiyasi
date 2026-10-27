/**
 * «Tanga sotib olish»: toʻplam va toʻlov usulini tanlash → Payme yoki Click sahifasiga oʻtish.
 * Narx va tanga soni serverdagi buyurtmadan olinadi; qaytishda (?tolov=<id>) holat tekshiriladi va balans yangilanadi.
 */
import './account.css';
import { h, svgIcon, IC, fmt, toast } from '../ui/dom';
import { tr, tf } from '../i18n';
import { payConfig, createOrder, orderStatus, check, ApiError, type Pack } from './session';
import { ensureLogin } from './gate';

let open: HTMLElement | null = null;
/** multicard — bitta sahifada Visa, Mastercard, Uzcard, Humo (xorijiy mijozlar uchun) */
const PROVIDERS = [{ id: 'payme', name: 'Payme', sub: '' }, { id: 'click', name: 'Click', sub: '' }, { id: 'multicard', name: 'Visa / Mastercard', sub: 'Uzcard, Humo' }] as const;
type Prov = typeof PROVIDERS[number]['id'];

export async function buyDialog(): Promise<void> {
  if (!await ensureLogin(undefined, 'Tanga sotib olish uchun kiring.')) return;
  open?.remove();
  let pack = 'p30', prov: Prov | null = null, busy = false;
  const close = () => { wrap.remove(); open = null; removeEventListener('keydown', onKey, true); };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  const msg = h('div', { class: 'kd-msg', role: 'alert', hidden: true });
  const err = (e: unknown) => { msg.hidden = false; msg.textContent = tr(e instanceof ApiError ? e.message : 'Xato yuz berdi — qayta urinib koʻring'); };
  const packs = h('div', { class: 'tb-packs', role: 'group', 'aria-label': tr('Toʻplam') });
  const provs = h('div', { class: 'tb-provs', role: 'group', 'aria-label': tr('Toʻlov usuli') });
  const go = h('button', { class: 'btn btn-primary btn-block', id: 'tbGo', type: 'button' }, tr('Toʻlovga oʻtish')) as HTMLButtonElement;
  const note = h('p', { class: 't-small kd-hint' }, tr('Toʻlov Payme, Click yoki Multicard sahifasida amalga oshiriladi. Karta maʼlumotlari bizga kelmaydi.'));
  let list: Pack[] = [], enabled: Prov[] = [];
  /** Multicard yolgʻiz boʻlsa — uning sahifasida Payme va Click ham borligini aytamiz */
  const label = (p: typeof PROVIDERS[number]) => p.id === 'multicard' && enabled.length === 1
    ? [h('b', {}, tr('Karta, Payme yoki Click')), h('span', { class: 'sub' }, 'Uzcard, Humo, Visa, Mastercard')]
    : [h('b', {}, p.name), p.sub ? h('span', { class: 'sub' }, p.sub) : ''];
  const sync = () => {
    packs.replaceChildren(...list.map(p => h('button', { class: 'tb-pack', type: 'button', 'data-pack': p.id, 'aria-pressed': String(p.id === pack), onclick: () => { pack = p.id; sync(); } },
      h('b', { class: 'mono' }, fmt(p.coins)), h('span', { class: 'sub' }, tr('tanga')), h('span', { class: 'tb-price mono' }, tf('${s} soʻm', { s: fmt(p.uzs) })))));
    provs.replaceChildren(...PROVIDERS.filter(p => enabled.includes(p.id)).map(p => h('button', { class: 'tb-prov', type: 'button', 'data-prov': p.id, 'aria-pressed': String(p.id === prov), onclick: () => { prov = p.id; sync(); } }, ...label(p))));
    go.disabled = busy || !prov || !list.length; go.textContent = tr(busy ? '…' : 'Toʻlovga oʻtish');
  };
  go.onclick = async () => {
    if (!prov || busy) return; busy = true; msg.hidden = true; sync();
    try { const o = await createOrder(pack, prov); location.href = o.url; return; } catch (x) { err(x); }
    busy = false; sync();
  };
  const wrap = h('div', { class: 'kd', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'tbT', id: 'tanga', onclick: (e: Event) => { if (e.target === wrap) close(); } },
    h('div', { class: 'kd-box' },
      h('button', { class: 'ib sm kd-x', type: 'button', 'aria-label': tr('Yopish'), title: tr('Yopish'), onclick: close }, svgIcon(IC.x)),
      h('h2', { id: 'tbT' }, tr('Tanga sotib olish')),
      h('p', { class: 'kd-lead' }, tr('Tangalar eksport va qoʻmitaga topshirish fayllari uchun sarflanadi. Muddati tugamaydi.')),
      packs, provs, go, note, msg));
  document.body.append(wrap); open = wrap; addEventListener('keydown', onKey, true); sync();
  try {
    const c = await payConfig();
    list = c.packs; enabled = PROVIDERS.map(p => p.id).filter(id => !!c[id]);
    prov = enabled[0] ?? null;
    if (!enabled.length) { msg.hidden = false; msg.textContent = tr('Onlayn toʻlov tez orada ulanadi.'); }
  } catch (x) { err(x); }
  sync();
}

/** Toʻlov sahifasidan qaytish: ?tolov=<id> — holatni bir necha marta tekshiradi (Payme/Click xabari kechikishi mumkin) */
export async function handlePayReturn(): Promise<void> {
  const u = new URL(location.href), id = Number(u.searchParams.get('tolov'));
  if (!id) return;
  u.searchParams.delete('tolov'); history.replaceState(history.state, '', u.pathname + u.search + u.hash);
  for (let i = 0; i < 6; i++) {
    try {
      const o = await orderStatus(id);
      if (o.state === 'paid') { await check(true); toast(tf('${n} tanga qoʻshildi. Balans: ${b}', { n: fmt(o.coins), b: fmt(o.balance) })); return; }
      if (o.state !== 'new') { toast(tr('Toʻlov bekor qilindi')); return; }
    } catch (x) { if (x instanceof ApiError && x.status === 401) return; }
    await new Promise(r => setTimeout(r, 2000));
  }
  toast(tr('Toʻlov hali tasdiqlanmadi. Bir necha daqiqadan keyin balansni tekshiring.'));
}
