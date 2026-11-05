/** Egasi paneli (#/egasi): foydalanuvchilar, to'lovlar, tanga sarfi — server /owner/stats; tashriflar — GoatCounter havolasi */
import { h, fmt, icl, IC } from '../ui/dom';
import { tr, tf } from '../i18n';
import { ownerStats, ownerGrant, check, type OwnerStats } from './session';

const GOAT = 'https://archemistry.goatcounter.com';
const MERCHANT = 'https://merchant.multicard.uz';
const so = (v: number) => `${fmt(v)} ${tr('soʻm')}`;

function kpi(id: string, label: string, value: string, sub?: string): HTMLElement {
  return h('div', { class: 'own-kpi', 'data-k': id }, h('span', { class: 'k' }, label), h('b', {}, value), sub ? h('small', {}, sub) : '');
}
function table(head: string[], rows: (string | number)[][], empty: string): HTMLElement {
  if (!rows.length) return h('p', { class: 't-small own-empty' }, empty);
  return h('table', { class: 'own-t' }, h('thead', {}, h('tr', {}, ...head.map((x) => h('th', {}, x)))),
    h('tbody', {}, ...rows.map((r) => h('tr', {}, ...r.map((c) => h('td', {}, String(c)))))));
}
function bars(days: { day: string; c: number }[]): HTMLElement {
  const map = new Map(days.map((d) => [d.day, d.c]));
  const out: { day: string; c: number }[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) { const d = new Date(today.getTime() - i * 864e5); const k = d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tashkent' }); out.push({ day: k, c: map.get(k) ?? 0 }); }
  const max = Math.max(1, ...out.map((d) => d.c));
  return h('div', { class: 'own-bars', role: 'img', 'aria-label': tr('Kunlik roʻyxatdan oʻtish, 30 kun') },
    ...out.map((d) => h('span', { class: 'bar', title: `${d.day}: ${d.c}`, style: `height:${Math.max(2, (d.c / max) * 100)}%` })));
}

const GRANT_MAX = 5000;
const when = (at: string) => new Date(at).toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent', dateStyle: 'short', timeStyle: 'short' });
const newKey = () => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`);

/** Sinov kirishi: pochta boʻyicha tanga berish. Ikki bosqich (avval nima boʻlishi koʻrsatiladi, keyin «Tasdiqlash») — xato pochtaga ketmasin. */
function grantForm(reload: () => void): HTMLElement {
  let key = newKey(), armed = false, busy = false;
  const email = h('input', { class: 'input', id: 'ownGrantEmail', type: 'email', autocomplete: 'off', placeholder: tr('pochta@misol.uz'), 'aria-label': tr('Pochta manzili') }) as HTMLInputElement;
  const coins = h('input', { class: 'input', id: 'ownGrantCoins', type: 'number', min: 1, max: GRANT_MAX, step: 1, inputmode: 'numeric', placeholder: tr('Tanga soni'), 'aria-label': tr('Tanga soni') }) as HTMLInputElement;
  const note = h('input', { class: 'input', id: 'ownGrantNote', maxlength: 200, value: tr('Sinov kirishi'), 'aria-label': tr('Izoh') }) as HTMLInputElement;
  const msg = h('p', { class: 't-small own-grant-msg', id: 'ownGrantMsg', role: 'status' });
  const go = h('button', { class: 'btn btn-sm', id: 'ownGrantGo', type: 'submit' }, tr('Tanga berish'));
  const disarm = () => { if (!armed) return; armed = false; go.textContent = tr('Tanga berish'); msg.textContent = ''; };
  [email, coins, note].forEach((el) => el.addEventListener('input', disarm));
  const form = h('form', { class: 'own-grant', id: 'ownGrant', onsubmit: (e: Event) => {
    e.preventDefault(); if (busy) return;
    const em = email.value.trim().toLowerCase(), n = Number(coins.value);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em) || !Number.isInteger(n) || n < 1 || n > GRANT_MAX) { armed = false; go.textContent = tr('Tanga berish'); msg.textContent = tr('Pochta va 1 dan 5000 gacha tanga sonini kiriting.'); return; }
    if (!armed) { armed = true; go.textContent = tr('Tasdiqlash'); msg.textContent = tf('${e} hisobiga ${n} tanga beriladi. Sotuv hisoblanmaydi.', { e: em, n: fmt(n) }); return; }
    busy = true; go.disabled = true;
    void ownerGrant(em, n, note.value.trim(), key).then((r) => {
      msg.textContent = (r.applied ? tf('Berildi: ${e} — ${n} tanga, balans ${b}.', { e: em, n: fmt(r.coins), b: fmt(r.balance) }) : tr('Bu soʻrov allaqachon bajarilgan — tanga qayta yozilmadi.'))
        + (r.isNew ? ' ' + tr('Hisob hali ochilmagan edi — shu pochta bilan kirganda tanga tayyor turadi.') : '');
      key = newKey(); email.value = ''; coins.value = ''; reload();
    }, (err: Error) => { msg.textContent = err.message; }).finally(() => { busy = false; armed = false; go.disabled = false; go.textContent = tr('Tanga berish'); });
  } }, email, coins, note, go);
  return h('section', { class: 'own-sec', id: 'ownGrantSec' }, h('h2', {}, tr('Sinov kirishi')),
    h('p', { class: 't-small' }, tr('Pochta boʻyicha tanga berish — sotuv emas, statistikada «sovgʻa» qatorida koʻrinadi.')), form, msg);
}

function render(s: OwnerStats, grant: HTMLElement): HTMLElement[] {
  const u = s.users, p = s.payments, c = s.coins;
  const stateName: Record<string, string> = { paid: tr('toʻlangan'), new: tr('kutilmoqda'), cancelled: tr('bekor') };
  return [
    h('section', { class: 'own-sec' }, h('h2', {}, tr('Foydalanuvchilar')),
      h('div', { class: 'own-kpis' },
        kpi('users', tr('Jami'), fmt(u.total), tf('bugun +${a} · 7 kun +${b} · 30 kun +${c}', { a: u.d1, b: u.d7, c: u.d30 })),
        kpi('active', tr('Faol (kirgan)'), fmt(u.active7), tf('7 kunda · 30 kunda ${n}', { n: u.active30 })),
        kpi('method', tr('Kirish usuli'), `${u.google} / ${u.email} / ${u.phone}`, tr('Google / pochta / telefon'))),
      h('h3', {}, tr('Roʻyxatdan oʻtish — 30 kun')), bars(s.signups),
      h('h3', {}, tr('Oxirgi roʻyxatdan oʻtganlar')),
      h('div', { class: 'own-scroll', id: 'ownPeople' }, table([tr('Roʻyxatdan oʻtgan'), tr('Kim'), tr('Kirish usuli'), tr('Balans'), tr('Oxirgi kirish')],
        (s.people ?? []).map((r) => [r.at ? when(r.at) : '—', r.who ?? '—', r.method === 'google' ? 'Google' : tr(r.method === 'email' ? 'pochta' : 'telefon'), fmt(r.balance), r.seen ? when(r.seen) : tr('hali kirmagan')]),
        tr('Hali foydalanuvchi yoʻq')))),
    h('section', { class: 'own-sec' }, h('h2', {}, tr('Toʻlovlar')),
      h('div', { class: 'own-kpis' },
        kpi('revenue', tr('Jami tushum'), so(p.revenue), tf('30 kunda ${s}', { s: so(p.revenue30) })),
        kpi('paid', tr('Toʻlovlar'), fmt(p.paid), tf('${n} ta xaridor', { n: p.buyers })),
        kpi('open', tr('Tugallanmagan'), fmt(p.open), tf('bekor qilingan ${n}', { n: p.cancelled }))),
      h('div', { class: 'own-two' },
        h('div', {}, h('h3', {}, tr('Toʻplam boʻyicha')), table([tr('Toʻplam'), tr('Soni'), tr('Summa')], p.byPack.map((r) => [r.pack, r.c, so(r.s)]), tr('Hali toʻlov yoʻq'))),
        h('div', {}, h('h3', {}, tr('Toʻlov tizimi')), table([tr('Tizim'), tr('Soni'), tr('Summa')], p.byPs.map((r) => [r.ps, r.c, so(r.s)]), tr('Hali toʻlov yoʻq')))),
      h('h3', {}, tr('Oxirgi buyurtmalar')),
      table(['#', tr('Vaqt'), tr('Kim'), tr('Toʻplam'), tr('Summa'), tr('Tizim'), tr('Holat')],
        p.recent.map((r) => [r.id, new Date(r.at).toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent', dateStyle: 'short', timeStyle: 'short' }), r.who ?? '—', `${r.pack} (${r.coins})`, so(r.amount), r.ps, stateName[r.state] ?? r.state]),
        tr('Hali buyurtma yoʻq'))),
    h('section', { class: 'own-sec' }, h('h2', {}, tr('Tangalar va xizmatlar')),
      h('div', { class: 'own-kpis' },
        kpi('bought', tr('Sotib olingan'), fmt(c.bought), tf('sovgʻa ${n}', { n: c.granted })),
        kpi('spent', tr('Sarflangan'), fmt(c.spent)),
        kpi('projects', tr('Pullik loyihalar'), fmt(s.projects.n), tf('generatsiya ${n}', { n: s.projects.gen }))),
      h('div', { class: 'own-two' },
        h('div', {}, h('h3', {}, tr('Tanga sarfi — 30 kun')), table([tr('Turi'), tr('Nima'), tr('Soni'), tr('Tanga')], c.spend30.map((r) => [r.reason, r.item, r.c, r.coins]), tr('Hali sarf yoʻq'))),
        h('div', {}, h('h3', {}, tr('Toza yuklashlar — 30 kun')), table([tr('Nima'), tr('Soni')], c.exports30.map((r) => [r.bundle, r.c]), tr('Hali yuklash yoʻq'))))),
    grant,
    h('section', { class: 'own-sec' }, h('h3', {}, tr('Berilgan sinov kirishlari')),
      table([tr('Vaqt'), tr('Kim'), tr('Tanga'), tr('Izoh')], (c.grants ?? []).map((r) => [when(r.at), r.who ?? '—', fmt(r.coins), r.note || '—']), tr('Hali sinov kirishi berilmagan'))),
    h('section', { class: 'own-sec own-links' }, h('h2', {}, tr('Boshqa manbalar')),
      h('a', { class: 'btn', href: GOAT, target: '_blank', rel: 'noopener', id: 'ownGoat' }, tr('Tashriflar va xizmatlar — GoatCounter ↗')),
      h('a', { class: 'btn', href: MERCHANT, target: '_blank', rel: 'noopener', id: 'ownMc' }, tr('Toʻlovlar va bankka oʻtkazmalar — Multicard ↗')),
      h('p', { class: 't-small' }, tr('GoatCounter: sahifa koʻrishlar, qayerdan kelgan, mamlakat va hodisalar (ev/… — qadamlar, eksportlar, ogʻir hisoblar). Statistika anonim.'))),
  ];
}

export async function ownerPage(root: HTMLElement): Promise<void> {
  document.title = `${tr('Egasi paneli')} — Archemistry Lab`;
  const body = h('div', { class: 'own-body' }, h('p', { class: 't-small' }, tr('Yuklanmoqda…')));
  const upd = h('small', { class: 'own-at' });
  root.replaceChildren(h('main', { class: 'home own', id: 'ownerPage' },
    h('div', { class: 'home-top' }, h('a', { class: 'btn btn-ghost btn-sm', href: '#/', style: 'text-decoration:none' }, ...icl(IC.back, tr('Loyihalar'))),
      h('button', { class: 'btn btn-sm', id: 'ownRefresh', onclick: () => void load() }, tr('Yangilash'))),
    h('h1', { class: 't-display' }, tr('Egasi paneli')), upd, body));
  const grant = grantForm(() => void load());
  async function load(): Promise<void> {
    try {
      const me = await check(true);
      if (!me?.owner) { body.replaceChildren(h('p', { class: 't-small own-empty', id: 'ownDenied' }, tr('Bu sahifa faqat sayt egasi uchun.'))); return; }
      const s = await ownerStats();
      upd.textContent = tf('Yangilangan: ${t}', { t: new Date(s.at).toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent' }) });
      body.replaceChildren(...render(s, grant));
    } catch (e) { body.replaceChildren(h('p', { class: 't-small own-empty' }, (e as Error).message)); }
  }
  await load();
}
