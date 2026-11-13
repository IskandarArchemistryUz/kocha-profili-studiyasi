/**
 * Kirish nuqtasi: marshrutlash (#/ — loyihalar roʻyxati, #/p/<id> — loyiha oynasi).
 */
import './ui/ds2.css';
import './ui/style.css';
import './ui/theme';
import { blankProject, uid } from './core/doc';
import { listProjects, getProject, putProject, deleteProject, importJSON, importJSONWithLayers, putLayerData, type ProjectMeta } from './storage/db';
import * as cloud from './storage/cloud';
import { check } from './ui/controls';
import { Editor } from './ui/editor';
import { h, toast, icl, IC, svgIcon } from './ui/dom';
import { tr, tf, autoTranslate } from './i18n';
import { initTips } from './ui/tips';   // tugma izohlari (tanishtiruv, A qism)
import { initTour, tourText } from './ui/tour';   // yoʻlboshlovchi tur (tanishtiruv, B qism)
import { initStats } from './core/stats';
import { coinsDialog } from './account/pay';   // + yuklash darvozasi: bepul (belgili) / toza (tanga)
import { handlePayReturn, buyDialog } from './account/buy';
import { authRequired } from './account/config';
import { check as checkAuth, current as currentUser, onAuth, logout } from './account/session';
import { loginDialog } from './account/login';
import { ownerPage } from './account/owner';
import { isLinkOwner } from './core/wm';
import { fmt } from './ui/dom';
initStats('mr', /chizmadon/.test(location.hash) ? 'chizmadon' : '');
autoTranslate();
initTips();
initTour();
// Payme / Click sahifasidan qaytish (?tolov=<id>) — toʻlov holati va balans
if (new URLSearchParams(location.search).has('tolov')) void handlePayReturn();

const root = document.getElementById('root')!;
let editor: Editor | null = null;

async function route(): Promise<void> {
  editor?.dispose(); editor = null;
  // bosh sahifadan: #/yangi — yangi loyiha, #/namuna — namuna loyiha (data/ dan nusxa)
  if (location.hash === '#/yangi') { const p = blankProject(); await putProject(p); location.replace(`#/p/${p.id}`); return; }
  if (location.hash === '#/namuna') {
    try { const r = await fetch('../data/namuna-mahalla.archemistry.json'); if (!r.ok) throw new Error(String(r.status)); const p = importJSON(await r.text(), () => uid('p_')); await putProject(p); location.replace(`#/p/${p.id}`); }
    catch (e) { toast('Namuna loyiha yuklanmadi: ' + (e as Error).message); location.replace('#/'); }
    return;
  }
  // egasi paneli (faqat OWNER_EMAILS dagi hisob — server ham tekshiradi)
  if (location.hash === '#/egasi') { await ownerPage(root); return; }
  // narxlar sahifasidan: #/tanga — loyihalar sahifasi va «Tanga sotib olish» oynasi (kirmagan boʻlsa — avval kirish)
  if (location.hash === '#/tanga') { history.replaceState(null, '', '#/'); document.title = 'Archemistry Lab · Master reja'; await home(); void buyDialog(); return; }
  // bosh sahifadan: #/chizmadon — oxirgi loyiha Chizmadon oynasi bilan (loyiha boʻlmasa — yangi)
  if (location.hash === '#/chizmadon') {
    // boshqa xizmatdan yuborilgan varaq — oʻz loyihasiga yoki yangi alohida loyihaga (ui/chzsend.ts)
    const t = peekInboxTarget();
    if (t?.target === 'new') {
      const p = blankProject(String(t.newName || tr('Yangi loyiha')).slice(0, 120));
      if (t.center && t.center.every(Number.isFinite)) p.origin = [t.center[0], t.center[1]];
      await putProject(p); location.replace(`#/p/${p.id}/chizmadon`); return;
    }
    if (t?.target) { let ok = null; try { ok = await getProject(t.target); } catch { /* */ } if (ok) { location.replace(`#/p/${encodeURIComponent(t.target)}/chizmadon`); return; } }
    let list: ProjectMeta[] = []; try { list = await listProjects(); } catch { /* */ }
    const last = [...list].sort((a, b) => String(b.updated).localeCompare(String(a.updated)))[0];
    if (last) { location.replace(`#/p/${last.id}/chizmadon`); return; }
    const p = blankProject(); await putProject(p); location.replace(`#/p/${p.id}/chizmadon`); return;
  }
  const m = location.hash.match(/^#\/p\/([\w-]+)(\/chizmadon)?$/);
  if (m) {
    let doc = null;
    try { doc = await getProject(m[1]); } catch (e) { console.error(e); toast('Loyihani ochib boʻlmadi: ' + (e as Error).message); }
    // boshqa qurilmada: brauzerda yoʻq — bulutdan (hisobga kirilgan boʻlsa)
    if (!doc && (currentUser() ?? await checkAuth().catch(() => null))) { try { toast(tr('Bulutdan yuklanmoqda…')); doc = await cloud.download(m[1]); } catch { /* bulutda ham yoʻq */ } }
    if (!doc) { toast('Loyiha topilmadi'); location.hash = '#/'; return; }
    document.title = `${doc.name} — Archemistry Lab · Master reja`;
    editor = new Editor(root, doc, () => { location.hash = '#/'; });
    (window as any).__mr = editor; // e2e testlar uchun
    if (m[2]) editor.openCh(takeKsInbox());
    return;
  }
  document.title = 'Archemistry Lab · Master reja';
  await home();
}

/** Koʻchasozdan kelgan varaq (app/kochasoz.html → «Chizmadonga yuborish») — bir marta olinadi */
function peekInboxTarget(): { target?: string; newName?: string; center?: [number, number] } | null {
  try { const v = JSON.parse(localStorage.getItem('ks-chz-inbox') || 'null'); return v && typeof v === 'object' ? v : null; } catch { return null; }
}
function takeKsInbox(): Parameters<Editor['openCh']>[0] {
  try { const v = localStorage.getItem('ks-chz-inbox'); if (!v) return undefined; localStorage.removeItem('ks-chz-inbox'); const { target: _t, newName: _n, center: _c, ...it } = JSON.parse(v); return it; } catch { return undefined; }
}

/** Loyihalar sahifasidagi hisob qatori: kirilmagan — «Kirish», kirgan — ism, tangalar, sotib olish, chiqish. Kirish talab qilinmasa yoki egasi rejimida — yoʻq */
let offAcct: (() => void) | null = null;
function homeAcct(): HTMLElement {
  const box = h('div', { class: 'home-acct', id: 'homeAcct' });
  const draw = () => {
    box.hidden = !authRequired() || isLinkOwner();
    const m = currentUser();
    if (!m) { box.replaceChildren(h('button', { class: 'btn btn-primary btn-sm', id: 'homeIn', onclick: () => void loginDialog() }, tr('Hisobga kirish'))); return; }
    const who = m.name || m.email || m.phone || '';
    box.replaceChildren(
      h('span', { class: 't-small who', title: who }, who),
      h('span', { class: 't-small mono', id: 'homeBal' }, `${tr('Tangalar')}: ${fmt(m.balance)}`),
      h('button', { class: 'btn btn-sm', id: 'homeBuy', onclick: () => void buyDialog() }, tr('Tanga sotib olish')),
      h('button', { class: 'btn btn-sm btn-ghost', id: 'homeCoins', onclick: () => void coinsDialog() }, tr('Tarix')),
      m.owner ? h('a', { class: 'btn btn-sm btn-ghost', id: 'homeOwner', href: '#/egasi', style: 'text-decoration:none' }, tr('Panel')) : '',
      h('button', { class: 'btn btn-sm btn-ghost', id: 'homeOut', onclick: () => void logout().then(() => toast(tr('Hisobdan chiqdingiz'))) }, tr('Chiqish')));
  };
  offAcct?.(); draw(); offAcct = onAuth(draw);
  if (authRequired() && !isLinkOwner()) void checkAuth();
  return box;
}

/** Bulut (14.11): brauzerdagi loyihalarning bogʻlanishi, bulutdagi (shu brauzerda yoʻq) loyihalar, tanlab koʻchirish */
const picked = new Set<string>();
async function cloudState(list: ProjectMeta[]): Promise<{ on: boolean; links: Map<string, cloud.CloudLink>; remote: cloud.CloudItem[]; usage: cloud.CloudUsage | null }> {
  const links = new Map<string, cloud.CloudLink>();
  for (const p of list) { const l = await cloud.getLink(p.id); if (l) links.set(p.id, l); }
  if (!(currentUser() ?? await checkAuth().catch(() => null))) return { on: false, links, remote: [], usage: null };
  try {
    const r = await cloud.list('master');
    const local = new Set(list.map(p => p.id));
    return { on: true, links, remote: r.items.filter(x => !local.has(x.id)), usage: r.usage };
  } catch { return { on: false, links, remote: [], usage: null }; }
}
async function moveSelected(btn: HTMLButtonElement): Promise<void> {
  const ids = [...picked]; if (!ids.length) return;
  btn.disabled = true; let ok = 0;
  for (const id of ids) {
    btn.textContent = tf('Koʻchirilmoqda… ${i}/${n}', { i: ok + 1, n: ids.length });
    try { await cloud.moveToCloud(id); ok++; picked.delete(id); }
    catch (e) { toast((e as Error).message); break; }
  }
  if (ok) toast(tf('${n} ta loyiha bulutga koʻchirildi', { n: ok }));
  void home();
}

async function home(): Promise<void> {
  let list: ProjectMeta[] = [];
  try { list = await listProjects(); } catch (e) { toast('Saqlash ishlamayapti: ' + (e as Error).message); }
  const cs = await cloudState(list);
  for (const id of [...picked]) if (!list.some(p => p.id === id) || cs.links.has(id)) picked.delete(id);
  const moveBtn = h('button', { class: 'btn btn-primary btn-sm', id: 'cloudMove', disabled: !picked.size, onclick: (e: Event) => void moveSelected(e.currentTarget as HTMLButtonElement) }, picked.size ? tf('Tanlanganlarni bulutga koʻchirish (${n})', { n: picked.size }) : tr('Tanlanganlarni bulutga koʻchirish')) as HTMLButtonElement;
  const mb = (b: number) => (b / 2 ** 20).toFixed(1).replace('.', ',');
  const file = h('input', { type: 'file', accept: '.json,application/json', hidden: true, id: 'file' }) as HTMLInputElement;
  file.onchange = async () => {
    const f = file.files?.[0]; if (!f) return;
    try {
      const { project: p, layers } = importJSONWithLayers(await f.text(), () => uid('p_'));
      for (const [lid, fs] of Object.entries(layers)) await putLayerData(p.id, lid, fs);
      await putProject(p); location.hash = `#/p/${p.id}`;
    }
    catch (e) { toast((e as Error).message); }
  };
  const created = (t: string) => new Date(t).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
  const TRASH = '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', OPEN = '<path d="M4 7h6l2 2h8v10H4zM4 7V5h6"/>';
  root.replaceChildren(h('main', { class: 'home' },
    h('div', { class: 'home-top' },
      h('a', { class: 'btn btn-ghost btn-sm', href: '../index.html', style: 'text-decoration:none' }, ...icl(IC.back, 'Archemistry Lab')),
      homeAcct()),
    h('h1', { class: 't-display' }, tr('Master reja')),
    h('p', { class: 't-small lead' }, tr('Uchastkadan meʼyoriy tekshiruvgacha — bitta 3D oynada. Har bir koʻrsatkich bitta modeldan hisoblanadi va ShNQ bandiga bogʻlanadi.')),
    h('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap' },
      h('button', { class: 'btn btn-primary btn-lg', id: 'newP', onclick: async () => { const p = blankProject(tr('Yangi loyiha')); await putProject(p); location.hash = `#/p/${p.id}`; } }, ...icl(IC.plus, tr('Yangi loyiha'))),
      h('a', { class: 'btn btn-lg', id: 'sampleP', href: '#/namuna', style: 'text-decoration:none' }, ...icl(OPEN, tourText('Namuna loyihani ochish'))),
      h('button', { class: 'btn btn-lg', id: 'openFile', onclick: () => file.click() }, ...icl(OPEN, tr('Fayldan ochish'))), file),
    cs.on ? h('div', { class: 'row', id: 'cloudBar', style: 'gap:10px;flex-wrap:wrap;align-items:center;margin-top:12px' },
      h('span', { class: 't-small' }, cs.usage ? tf('Bulutda: ${n} ta loyiha · ${u} MB', { n: cs.usage.count, u: mb(cs.usage.bytes) }) + (cs.usage.quota ? tf(' / ${q} MB', { q: mb(cs.usage.quota) }) : '') : ''),
      list.some(p => !cs.links.has(p.id)) ? moveBtn : '') : '',
    list.length ? h('div', { class: 'row3 cards', id: 'cards' }, ...list.map(p => h('a', { class: 'card group', href: `#/p/${p.id}`, 'data-pid': p.id },
      h('b', {}, p.name),
      cs.links.has(p.id) ? h('span', { class: 't-small', 'data-cloud': 'on', style: 'color:var(--ok)' }, tr('bulutda'))
        : cs.on ? (() => {
          const c = check(tr('bulutga koʻchirish uchun tanlash'), { 'data-pick': p.id, checked: picked.has(p.id), onchange: (v: boolean) => {
            if (v) picked.add(p.id); else picked.delete(p.id);
            moveBtn.disabled = !picked.size; moveBtn.textContent = picked.size ? tf('Tanlanganlarni bulutga koʻchirish (${n})', { n: picked.size }) : tr('Tanlanganlarni bulutga koʻchirish');
          } });
          c.classList.add('t-small');
          // kartochka — havola: belgilash bosilganda loyiha ochilmasin
          c.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); const i = c.querySelector('input')!; i.checked = !i.checked; i.dispatchEvent(new Event('change')); });
          return c;
        })() : '',
      h('span', { class: 't-small' }, `${tr('oʻzgargan')}: ${created(p.updated)} · ${tr(p.hasSite ? 'uchastka bor' : 'uchastka yoʻq')} · ${p.buildings} ${tr('bino')}`),
      h('button', { class: 'btn btn-danger btn-sm', 'data-del': p.id, onclick: async (e: Event) => {
        e.preventDefault(); e.stopPropagation();
        const inCloud = cs.links.has(p.id);
        if (!confirm(inCloud ? tf('«${n}» oʻchirilsinmi? Bulutdagi nusxa 30 kun savatda turadi.', { n: p.name }) : `«${p.name}» oʻchirilsinmi? Buni qaytarib boʻlmaydi.`)) return;
        if (inCloud) { try { await cloud.remove(p.id); await cloud.dropLink(p.id); } catch (er) { toast((er as Error).message); return; } }
        await deleteProject(p.id); home();
      } }, ...icl(TRASH, tr('Oʻchirish'))))))
      : h('div', { class: 'empty', style: 'margin-top:16px' }, svgIcon('<path d="M4 4h16v16H4zM4 11h8V4M12 15h8M16 15v5"/>'), h('span', {}, tr('Hali loyiha yoʻq. «Yangi loyiha» bilan boshlang.'))),
    cs.remote.length ? h('h2', { class: 't-title', style: 'margin-top:28px' }, tr('Bulutda, shu brauzerda yoʻq')) : '',
    cs.remote.length ? h('div', { class: 'row3 cards', id: 'cloudCards' }, ...cs.remote.map(p => h('a', { class: 'card group', href: `#/p/${p.id}`, 'data-cid': p.id },
      h('b', {}, p.name),
      h('span', { class: 't-small' }, `${tr('oʻzgargan')}: ${created(p.updated)} · ${tr('bulutda')}`)))) : '',
    h('p', { class: 't-small', style: 'margin-top:24px' }, cs.on
      ? tr('Bulutga koʻchirilgan loyihalar hisobingizda saqlanadi va istalgan qurilmadan ochiladi; qolganlari faqat shu brauzerda.')
      : tr('Loyihalar shu brauzerda saqlanadi; muhim loyihani «Taqdimot va eksport» qadamida faylga saqlang.'))));
}

window.addEventListener('hashchange', route);
route();
