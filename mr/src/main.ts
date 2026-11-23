/**
 * Kirish nuqtasi: marshrutlash (#/ — loyihalar roʻyxati, #/p/<id> — loyiha oynasi).
 */
import './ui/ds2.css';
import './ui/style.css';
import { isDark, toggleTheme, onTheme } from './ui/theme';
import { blankProject, uid, type Project } from './core/doc';
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
import { cleanThumb, thumbSvg, type ThumbData } from './core/projthumb';
import { listSvc, createSvc, removeSvc, type SvcKind } from './storage/svcprojects';
import { getSvcThumb } from './storage/svcthumb';
import { otishEnter, otishTo } from './ui/otish';
import { kolbaOverlay } from './ui/kolba';
// 14.11: boʻlimga oʻtish — boshqa xizmatdan kelinsa Master reja foni bir lahza; loyiha kartasi ekranga kengayib ochiladi
otishEnter(/chizmadon/.test(location.hash) ? 'chz' : 'mr');
document.addEventListener('click', ev => {
  const e = ev as MouseEvent; if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
  const a = (e.target as Element)?.closest?.('a.card[href^="#/p/"]') as HTMLAnchorElement | null; if (!a) return;
  if ((e.target as Element).closest('button,input,label,.check')) return;
  e.preventDefault(); otishTo('mr', a.getAttribute('href')!, a);
});
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
    // 14.11 audit: namuna har bosilganda yangi nusxa yaratmaydi — shu brauzerdagi nusxa ochiladi
    let keep: string | null = null; try { keep = localStorage.getItem('mr-namuna-id'); } catch { /* */ }
    if (keep && (await listProjects().catch(() => [])).some(x => x.id === keep)) { location.replace(`#/p/${keep}`); return; }
    try { const r = await fetch('../data/namuna-mahalla.archemistry.json'); if (!r.ok) throw new Error(String(r.status)); const p = importJSON(await r.text(), () => uid('p_')); await putProject(p); try { localStorage.setItem('mr-namuna-id', p.id); } catch { /* */ } location.replace(`#/p/${p.id}`); }
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
      const p: Project = { ...blankProject(String(t.newName || tr('Yangi loyiha')).slice(0, 120)), svc: 'chz' };   // alohida albom — Chizmadonning oʻz loyihasi
      if (t.center && t.center.every(Number.isFinite)) p.origin = [t.center[0], t.center[1]];
      await putProject(p); location.replace(`#/p/${p.id}/chizmadon`); return;
    }
    if (t?.target) { let ok = null; try { ok = await getProject(t.target); } catch { /* */ } if (ok) { location.replace(`#/p/${encodeURIComponent(t.target)}/chizmadon`); return; } }
    // 22.11 (egasi: «qaysi servisni ochsa ham — avval loyihalar oynasi, bir-biriga aralashmasin»): alohida kirilgan Chizmadon
    // oxirgi albomni oʻzi ochmaydi — Chizmadonning oʻz loyihalari paneli (eshik); tanlangani yoki yangisi ochiladi
    document.title = 'Archemistry Lab · Chizmadon'; root.replaceChildren();
    const { openChzProjects } = await import('./ui/chzprojects'); await openChzProjects(undefined, true); return;
  }
  const m = location.hash.match(/^#\/p\/([\w-]+)(\/chizmadon)?$/);
  if (m) {
    // 14.11: loyiha sekin ochilsa (0,3 s+) — markazda Archemistry kolbasi
    const kb = kolbaOverlay(tr('Loyiha ochilmoqda…'), '20,20,20');
    try { await openRoute(m); } finally { kb(); }
    return;
  }
  document.title = 'Archemistry Lab · Master reja';
  await home();
}
async function openRoute(m: RegExpMatchArray): Promise<void> {
  {
    let doc = null;
    try { doc = await getProject(m[1]); } catch (e) { console.error(e); toast('Loyihani ochib boʻlmadi: ' + (e as Error).message); }
    // boshqa qurilmada: brauzerda yoʻq — bulutdan (hisobga kirilgan boʻlsa)
    if (!doc && (currentUser() ?? await checkAuth().catch(() => null))) { try { toast(tr('Bulutdan yuklanmoqda…')); doc = await cloud.download(m[1]); } catch { /* bulutda ham yoʻq */ } }
    if (!doc) { toast('Loyiha topilmadi'); location.hash = '#/'; return; }
    document.title = `${doc.name} — Archemistry Lab · Master reja`;
    editor = new Editor(root, doc, () => { location.hash = '#/'; });
    (window as any).__mr = editor; // e2e testlar uchun
    if (m[2]) editor.openCh(takeKsInbox());
  }
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
let offThemeHome: (() => void) | null = null;
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
      h('button', { class: 'btn btn-sm btn-ghost', id: 'homeCoins', onclick: () => void coinsDialog() }, tr('Tanga tarixi')),
      m.owner ? h('a', { class: 'btn btn-sm btn-ghost', id: 'homeOwner', href: '#/egasi', style: 'text-decoration:none' }, tr('Panel')) : '',
      h('button', { class: 'btn btn-sm btn-ghost', id: 'homeOut', onclick: () => void logout().then(() => toast(tr('Hisobdan chiqdingiz'))) }, tr('Chiqish')));
  };
  offAcct?.(); draw(); offAcct = onAuth(draw);
  if (authRequired() && !isLinkOwner()) void checkAuth();
  return box;
}

/** 14.11 audit (Loyihalar): qidiruv va saralash — 6 tadan koʻp loyihada */
let projQ = '';
let projF: 'all' | 'cloud' | 'local' | 'empty' = 'all';
const WEEK = 7 * 864e5;
const isEmptyOld = (p: ProjectMeta): boolean => !p.buildings && !p.hasSite && Date.now() - new Date(p.updated).getTime() > WEEK;

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

/** Kartaning eskizi: loyihaning oʻz kichik rejasi (uchastka, koʻchalar, binolar — core/projthumb); hali chizilmagan boʻlsa — sxematik bezak */
function thumb(n: number, site: boolean, inCloud: boolean, data?: ThumbData | null): HTMLElement {
  const el = h('span', { class: `thumb${data ? ' real' : ''}`, 'aria-hidden': 'true' });
  if (data) el.innerHTML = thumbSvg(data);
  else {
    const k = Math.min(n, 9), boxes: string[] = [];
    for (let i = 0; i < k; i++) { const c = i % 3, r = Math.floor(i / 3); boxes.push(`<rect x="${62 + c * 34}" y="${16 + r * 22}" width="${22 + (i * 7) % 9}" height="${14 + (i * 5) % 6}" rx="2"/>`); }
    el.innerHTML = `<svg viewBox="0 0 240 92" preserveAspectRatio="xMidYMid slice">${site ? '<path class="st" d="M50 8L196 12L188 84L44 80Z"/>' : ''}<g class="bl">${boxes.join('')}</g></svg>`;
  }
  if (inCloud) el.append(h('em', { class: 'cl' }, tr('bulutda')));
  return el;
}

/**
 * 23.11 (egasi: «bosh sahifadan ish boshlaganda doim loyihalar paneli; yangi loyiha — xohlagan servis, boʻsh sahna»):
 * «Loyihalarim» — barcha xizmatlar loyihalari bitta roʻyxatda (servis belgisi va filtri); «Yangi loyiha» → servis tanlanadi.
 */
type SvcF = 'all' | 'mr' | SvcKind | 'chz';
const SVC: { k: Exclude<SvcF, 'all'>; name: string; c: string; ic: string }[] = [
  { k: 'mr', name: 'Master reja', c: 'var(--ink)', ic: '<path d="M10 22h50l-6 34H4z" class="st"/><path d="M18 30h10v8H18zM32 30h12v8H32zM16 42h12v8H16zM32 42h10v8H32z"/>' },
  { k: 'ks', name: 'Koʻchasoz', c: '#4c5bd4', ic: '<path d="M2 50h60M2 46h12v4M62 46H50v4M32 50v-4M32 42v-4M10 46V28M10 28c-6 0-6-10 0-11c6 1 6 11 0 11M54 46V28M54 28c-6 0-6-10 0-11c6 1 6 11 0 11M22 46v-7h7v7M38 46v-5h9v5"/>' },
  { k: 'joy', name: 'Joyshunos', c: '#c0643a', ic: '<path d="M32 38l26 7-26 7-26-7zM32 26l26 7-26 7-26-7zM32 14l26 7-26 7-26-7z"/>' },
  { k: 'ren', name: 'Render', c: '#c08a1e', ic: '<path d="M4 8h56v44H4zM32 8v44M8 46l10-8 10 8M18 38V24l-7 4v16M36 46l10-8 10 8M46 38V24l-7 4v16"/>' },
  { k: 'dk', name: 'Dizayn-kod', c: '#025E69', ic: '<path d="M10 52V8h30v44M18 20h6v8h-6zM28 20h6v8h-6zM20 52V40h10v12M6 52h52M8 30h34v6H8z"/>' },
  { k: 'chz', name: 'Chizmadon', c: '#8b4a9c', ic: '<path d="M8 6h48v46H8zM12 10h30v38H12zM46 10v38M16 40c6-14 14-4 22-18M48 16h6M48 22h4M48 44h6"/>' },
];
let svcF: SvcF = (() => { try { return (sessionStorage.getItem('home-svcF') as SvcF) || 'all'; } catch { return 'all'; } })();
const svcHrefOf = (k: SvcKind, id: string) => k === 'dk' ? `../dizaynkod.html?p=${encodeURIComponent(id)}` : `./${k === 'ks' ? 'kochasoz' : k === 'joy' ? 'joyshunos' : 'render'}.html?p=${encodeURIComponent(id)}`;
/** Yangi loyiha — tanlangan servisda boʻsh sahna */
async function newIn(k: Exclude<SvcF, 'all'>): Promise<void> {
  if (k === 'mr') { const p = blankProject(tr('Yangi loyiha')); await putProject(p); location.hash = `#/p/${p.id}`; return; }
  if (k === 'chz') { const p: Project = { ...blankProject(tr('Taqdimot albomi')), svc: 'chz' }; await putProject(p); location.hash = `#/p/${p.id}/chizmadon`; return; }
  const p = createSvc(k, `${tr(k === 'dk' ? 'Peshlavha' : 'Yangi loyiha')} ${listSvc(k).length + 1}`); location.href = svcHrefOf(k, p.id);
}
function newMenu(): HTMLElement {
  const menu = h('div', { class: 'newmenu', id: 'newMenu', role: 'menu', hidden: true },
    h('span', { class: 't-small' }, tr('Qaysi servisda?')),
    ...SVC.map(s => h('button', { type: 'button', role: 'menuitem', id: `newP-${s.k}`, style: `--svc:${s.c}`, onclick: () => void newIn(s.k) },
      h('i'), h('b', {}, tr(s.name)))));
  const btn = h('button', { class: 'btn btn-primary btn-lg', id: 'newP', 'aria-haspopup': 'menu', 'aria-expanded': 'false', onclick: (e: Event) => {
    e.stopPropagation(); menu.hidden = !menu.hidden; btn.setAttribute('aria-expanded', String(!menu.hidden));
    if (!menu.hidden) { const off = (ev: Event) => { if (!(ev.target as Element).closest?.('#newMenu')) { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); document.removeEventListener('click', off); } }; setTimeout(() => document.addEventListener('click', off)); }
  } }, ...icl(IC.plus, tr('Yangi loyiha')));
  return h('span', { class: 'newwrap' }, btn, menu);
}
/** Servis loyihasi kartasi (Koʻchasoz, Joyshunos, Render, Chizmadon) */
function svcCard(k: Exclude<SvcF, 'all' | 'mr'>, id: string, name: string, updated: string, href: string, del: () => Promise<void> | void, i: number): HTMLElement {
  const m = SVC.find(s => s.k === k)!;
  const img = k === 'chz' ? null : getSvcThumb(id);   // 23.11: servis loyihasining oʻz kichik rasmi (storage/svcthumb)
  const th = h('span', { class: `thumb svc${img ? ' pic' : ''}`, 'aria-hidden': 'true', style: `--svc:${m.c}` });
  if (img) th.append(h('img', { src: img, alt: '', loading: 'lazy', decoding: 'async' }));
  else th.innerHTML = `<svg viewBox="-60 -2 184 60" preserveAspectRatio="xMidYMid meet">${m.ic}</svg>`;
  return h('a', { class: 'card group', href, 'data-sid': id, 'data-svc': k, 'data-t': updated, style: `--i:${Math.min(i, 12)}` },
    th, h('b', {}, name),
    h('span', { class: 'svcbadge', style: `--svc:${m.c}` }, h('i'), tr(m.name)),
    h('span', { class: 't-small' }, updated ? `${tr('oʻzgargan')}: ${new Date(updated).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}` : ''),
    h('button', { class: 'btn btn-ghost btn-sm icon-btn card-more', type: 'button', 'aria-label': tr('Amallar'), title: tr('Amallar'), onclick: (e: Event) => { e.preventDefault(); e.stopPropagation(); (e.currentTarget as HTMLElement).closest('.card')?.classList.toggle('more-on'); } },
      svgIcon('<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>')),
    h('button', { class: 'btn btn-danger btn-sm card-del', 'data-del': id, onclick: async (e: Event) => {
      e.preventDefault(); e.stopPropagation();
      if (!confirm(`«${name}» oʻchirilsinmi? Buni qaytarib boʻlmaydi.`)) return;
      await del(); void home();
    } }, ...icl('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', tr('Oʻchirish'))));
}

/** Qidiruv, saralash (Hammasi · Bulutda · Brauzerda · Boʻsh) va eski boʻsh loyihalar haqida eslatma */
function projTools(list: ProjectMeta[], links: Map<string, unknown> | null): HTMLElement {
  const nEmpty = list.filter(isEmptyOld).length;
  const inp = h('input', { type: 'search', class: 'input', id: 'projQ', placeholder: tr('Loyiha nomi'), 'aria-label': tr('Loyiha qidirish'), value: projQ, style: 'flex:1 1 220px;max-width:360px' }) as HTMLInputElement;
  inp.oninput = () => { projQ = inp.value; const at = inp.selectionStart; void home().then(() => { const n = document.getElementById('projQ') as HTMLInputElement | null; if (n) { n.focus(); n.setSelectionRange(at, at); } }); };
  const F: [typeof projF, string][] = [['all', tr('Hammasi')], ...(links ? [['cloud', tr('Bulutda')], ['local', tr('Brauzerda')]] as [typeof projF, string][] : []), ...(nEmpty ? [['empty', tf('Boʻsh · ${n}', { n: nEmpty })]] as [typeof projF, string][] : [])];
  if (!F.some(f => f[0] === projF)) projF = 'all';
  return h('div', { class: 'row', id: 'projTools', style: 'gap:10px;flex-wrap:wrap;align-items:center;margin-top:16px' }, inp,
    h('div', { class: 'seg sm', role: 'group', 'aria-label': tr('Saralash'), id: 'projF' }, ...F.map(([k, t]) => h('button', { type: 'button', 'data-f': k, 'aria-pressed': projF === k, onclick: () => { projF = k; void home(); } }, t))),
    nEmpty && projF !== 'empty' ? h('span', { class: 't-small', id: 'projEmptyNote' }, tf('${n} ta boʻsh loyiha (bino ham, uchastka ham yoʻq, 7 kundan eski)', { n: nEmpty })) : '');
}

async function home(): Promise<void> {
  let list: ProjectMeta[] = [];
  let chz: ProjectMeta[] = [];
  try { const all = await listProjects(); list = all.filter(p => !p.svc); chz = all.filter(p => p.svc === 'chz'); } catch (e) { toast('Saqlash ishlamayapti: ' + (e as Error).message); }
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
  // 14.11 (egasi): loyihalar sahifasi — kanvas «Oʻtish: boʻlim → loyihalar» dagi loyihalar ekrani: shisha sarlavha, nuqtali fon, eskizli kartalar
  let first = false; try { first = !sessionStorage.getItem('home-in'); sessionStorage.setItem('home-in', '1'); } catch { /* */ }
  const themeB = h('button', { class: 'btn btn-sm btn-ghost icon-btn', id: 'homeTheme', type: 'button', 'aria-label': tr(isDark() ? 'Yorugʻ rejim' : 'Tungi rejim'), title: tr(isDark() ? 'Yorugʻ rejim' : 'Tungi rejim'), onclick: () => toggleTheme() },
    svgIcon(isDark() ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>' : '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'));
  offThemeHome?.(); offThemeHome = onTheme(() => { if (location.hash === '' || location.hash === '#/' || location.hash === '#') void home(); });
  const q = projQ.trim().toLowerCase();
  // 23.11: boshqa servislar loyihalari (filtr va qidiruv bilan)
  const others: { k: Exclude<SvcF, 'all' | 'mr'>; id: string; name: string; updated: string; href: string; del: () => Promise<void> | void }[] = [
    ...(['ks', 'joy', 'ren', 'dk'] as SvcKind[]).flatMap(k => listSvc(k).map(p => ({ k, id: p.id, name: p.name, updated: p.updated, href: svcHrefOf(k, p.id), del: () => {
      removeSvc(k, p.id);
      if (k === 'dk') try { const r = indexedDB.open('archemistry-dk', 1); r.onupgradeneeded = () => r.result.createObjectStore('st'); r.onsuccess = () => { try { r.result.transaction('st', 'readwrite').objectStore('st').delete(p.id); } catch { /* */ } }; } catch { /* */ }
    } }))),
    ...chz.map(p => ({ k: 'chz' as const, id: p.id, name: p.name, updated: p.updated, href: `#/p/${p.id}/chizmadon`, del: () => deleteProject(p.id) })),
  ].filter(o => (svcF === 'all' || svcF === o.k) && (!q || o.name.toLowerCase().includes(q))).sort((a, b) => String(b.updated).localeCompare(String(a.updated)));
  const counts = new Map<SvcF, number>([['mr', list.length], ['ks', listSvc('ks').length], ['joy', listSvc('joy').length], ['ren', listSvc('ren').length], ['dk', listSvc('dk').length], ['chz', chz.length]]);
  if (svcF !== 'all' && !counts.get(svcF)) svcF = 'all';
  const mrOn = svcF === 'all' || svcF === 'mr';
  const svcSeg = h('div', { class: 'seg sm', role: 'group', id: 'svcF', 'aria-label': tr('Servis'), style: 'margin-top:16px' },
    ...([['all', tr('Hammasi')] as [SvcF, string], ...SVC.filter(m => counts.get(m.k)).map(m => [m.k, `${tr(m.name)} · ${counts.get(m.k)}`] as [SvcF, string])]).map(([k, t]) =>
      h('button', { type: 'button', 'data-s': k, 'aria-pressed': svcF === k, onclick: () => { svcF = k; try { sessionStorage.setItem('home-svcF', k); } catch { /* */ } void home(); } }, t)));
  const shown = !mrOn ? [] : list.length > 5 ? list.filter(p => (!q || p.name.toLowerCase().includes(q)) && (projF === 'all' || (projF === 'cloud' ? cs.links.has(p.id) : projF === 'local' ? !cs.links.has(p.id) : isEmptyOld(p)))) : list;
  root.replaceChildren(h('main', { class: `home home2${first ? ' enter' : ''}` },
    h('header', { class: 'home-top home-bar glassbar' },
      h('a', { class: 'btn btn-ghost btn-sm', href: '../index.html', style: 'text-decoration:none' }, ...icl(IC.back, 'Archemistry Lab')),
      h('span', { class: 'svcbadge home-svc' }, h('i'), tr('Loyihalarim')),
      h('span', { class: 'sp' }),
      homeAcct(), themeB),
    h('h1', { class: 't-display' }, tr('Loyihalarim')),
    h('p', { class: 't-small lead' }, tr('Barcha servislardagi loyihalaringiz. Yangi loyiha har doim boʻsh sahnadan boshlanadi — servisni tanlang.')),
    h('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap' },
      newMenu(),
      h('a', { class: 'btn btn-lg', id: 'sampleP', href: '#/namuna', style: 'text-decoration:none' }, ...icl(OPEN, tourText('Namuna loyihani ochish'))),
      h('button', { class: 'btn btn-lg', id: 'openFile', onclick: () => file.click() }, ...icl(OPEN, tr('Fayldan ochish'))), file),
    cs.on ? h('div', { class: 'row', id: 'cloudBar', style: 'gap:10px;flex-wrap:wrap;align-items:center;margin-top:12px' },
      h('span', { class: 't-small' }, cs.usage ? tf('Bulutda: ${n} ta loyiha · ${u} MB', { n: cs.usage.count, u: mb(cs.usage.bytes) }) + (cs.usage.quota ? tf(' / ${q} MB', { q: mb(cs.usage.quota) }) : '') : ''),
      list.some(p => !cs.links.has(p.id)) ? moveBtn : '') : '',
    (list.length + others.length > 0 && [...counts.values()].filter(Boolean).length > 1) ? svcSeg : '',
    mrOn && list.length > 5 ? projTools(list, cs.on ? cs.links : null) : '',
    shown.length ? h('div', { class: 'row3 cards', id: 'cards' }, ...shown.map((p, i) => h('a', { class: 'card group', href: `#/p/${p.id}`, 'data-pid': p.id, 'data-t': p.updated, style: `--i:${Math.min(i, 12)}` },
      thumb(p.buildings, p.hasSite, cs.links.has(p.id), p.thumb),
      h('b', {}, p.name),
      others.length || svcF === 'mr' && [...counts.entries()].some(([k, n]) => k !== 'mr' && n) ? h('span', { class: 'svcbadge', style: '--svc:var(--ink)' }, h('i'), tr('Master reja')) : '',
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
      h('button', { class: 'btn btn-ghost btn-sm icon-btn card-more', type: 'button', 'data-more': p.id, 'aria-label': tr('Amallar'), title: tr('Amallar'), onclick: (e: Event) => {
        // 14.11 audit: «Oʻchirish» har kartada koʻrinmaydi — «⋯» bosilganda chiqadi
        e.preventDefault(); e.stopPropagation(); (e.currentTarget as HTMLElement).closest('.card')?.classList.toggle('more-on');
      } }, svgIcon('<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>')),
      h('button', { class: 'btn btn-danger btn-sm card-del', 'data-del': p.id, onclick: async (e: Event) => {
        e.preventDefault(); e.stopPropagation();
        const inCloud = cs.links.has(p.id);
        if (!confirm(inCloud ? tf('«${n}» oʻchirilsinmi? Bulutdagi nusxa 30 kun savatda turadi.', { n: p.name }) : `«${p.name}» oʻchirilsinmi? Buni qaytarib boʻlmaydi.`)) return;
        if (inCloud) { try { await cloud.remove(p.id); await cloud.dropLink(p.id); } catch (er) { toast((er as Error).message); return; } }
        await deleteProject(p.id); home();
      } }, ...icl(TRASH, tr('Oʻchirish'))))))
      : !mrOn || others.length ? ''
      : list.length ? h('div', { class: 'empty', id: 'projNone', style: 'margin-top:16px' }, h('span', {}, tr('Hech narsa topilmadi')))
      : h('div', { class: 'empty', style: 'margin-top:16px' }, svgIcon('<path d="M4 4h16v16H4zM4 11h8V4M12 15h8M16 15v5"/>'), h('span', {}, tr('Hali loyiha yoʻq. «Yangi loyiha» bilan boshlang.'))),
    others.length ? h('div', { class: 'row3 cards', id: 'svcCards', style: shown.length ? 'margin-top:12px' : '' }, ...others.map((o, i) => svcCard(o.k, o.id, o.name, o.updated, o.href, o.del, shown.length + i))) : '',
    mrOn && cs.remote.length ? h('h2', { class: 't-title', style: 'margin-top:28px' }, tr('Bulutda, shu brauzerda yoʻq')) : '',
    mrOn && cs.remote.length ? h('div', { class: 'row3 cards', id: 'cloudCards' }, ...cs.remote.map(p => h('a', { class: 'card group', href: `#/p/${p.id}`, 'data-cid': p.id },
      thumb(Number(p.meta?.buildings ?? 0), !!p.meta?.hasSite, true, cleanThumb(p.meta?.thumb)),
      h('b', {}, p.name),
      h('span', { class: 't-small' }, `${tr('oʻzgargan')}: ${created(p.updated)} · ${tr('bulutda')}`)))) : '',
    h('p', { class: 't-small', style: 'margin-top:24px' }, cs.on
      ? tr('Bulutga koʻchirilgan loyihalar hisobingizda saqlanadi va istalgan qurilmadan ochiladi; qolganlari faqat shu brauzerda.')
      : tr('Loyihalar shu brauzerda saqlanadi; muhim loyihani «Taqdimot va eksport» qadamida faylga saqlang.'))));
  // 23.11: Master reja va boshqa servis kartalari — bitta panjarada, oxirgi oʻzgarganidan boshlab
  const cards = document.getElementById('cards'), sc = document.getElementById('svcCards');
  if (sc && cards) { cards.append(...sc.children); [...cards.children].sort((a, b) => String((b as HTMLElement).dataset.t).localeCompare(String((a as HTMLElement).dataset.t))).forEach(c => cards.append(c)); sc.remove(); }
  else if (sc) sc.id = 'cards';
}

window.addEventListener('hashchange', route);
route();
