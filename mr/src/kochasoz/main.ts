/**
 * Koʻchasoz — kirish nuqtasi (app/kochasoz.html). Kanvasdagi «Koʻchasoz» sahifasi maketlari:
 *   #/a Tarmoq · #/b Kesim · #/c Chorraha · #/e Mikromodel · #/grafika Grafik kutubxona · #/varaq Albom varagʻi.
 * Qobiq: ekotizim sarlavhasi (5 xizmat), til (uz/en/ru), tungi rejim. Har rejim holati brauzerda saqlanadi;
 * B va Varaq bitta koʻcha maʼlumotini (kesim, rejadagi elementlar, tarmoqlar) birga ishlatadi.
 */
import '../ui/ds2.css';
import './ks.css';
import { toggleTheme, isDark, onTheme } from '../ui/theme';
import { h, svgIcon, toast, download } from '../ui/dom';
import { logoSvg } from '../ui/logo';
import { tr, getLang, setLang, onLang, LANGS, type Lang } from '../i18n';
import { mount, type DCLogic, type Mounted } from './dc';
import { exportSvg, exportPdf, sendToChizmadon, saveJson, openJson, svgText, cleanSvg, exportPng, safeName } from './io';
import { KESIM_OPTS_DEF, kesimDxf, type KesimOpts } from './kesimdxf';
import { initStats } from '../core/stats';
initStats('ks');

type BoardId = 'a' | 'b' | 'c' | 'e' | 'grafika' | 'varaq';
interface BoardDef { load: () => Promise<{ default: new (p?: Record<string, unknown>) => DCLogic }>; tpl: () => Promise<{ default: string }>; title: string }
const BOARDS: Record<BoardId, BoardDef> = {
  a: { load: () => import('./boards/a'), tpl: () => import('./boards/a.html?raw'), title: 'Tarmoq' },
  b: { load: () => import('./boards/b'), tpl: () => import('./boards/b.html?raw'), title: 'Kesim' },
  c: { load: () => import('./boards/c'), tpl: () => import('./boards/c.html?raw'), title: 'Chorraha' },
  e: { load: () => import('./boards/e'), tpl: () => import('./boards/e.html?raw'), title: 'Mikromodel' },
  grafika: { load: () => import('./boards/grafika'), tpl: () => import('./boards/grafika.html?raw'), title: 'Grafik kutubxona' },
  varaq: { load: () => import('./boards/varaq'), tpl: () => import('./boards/varaq.html?raw'), title: 'Albom varagʻi' },
};
const MODE_KEY: Record<string, BoardId | 'd'> = { A: 'a', B: 'b', C: 'c', D: 'd', E: 'e' };

/* ---------- tayyor qismlar (2026-10-18, Iskandar: «tayyor qismlarni chiqaramiz, tayyormaslarini yashirib — tez orada») ----------
 * Saytda: B (Kesim va Reja koʻrinishlari) va Albom varagʻi. Qolganlari — «Tez orada» belgisi bilan, bosilmaydi;
 * Grafik kutubxona — butunlay yashirin. «?beta» bilan ochilsa (brauzerda eslab qolinadi) — hammasi ochiq, ishlab chiqish uchun. */
const BETA = (() => {
  try {
    const q = new URLSearchParams(location.search);
    if (q.has('beta')) localStorage.setItem('ks-beta', q.get('beta') === '0' ? '0' : '1');
    return localStorage.getItem('ks-beta') === '1';
  } catch { return false; }
})();
const READY_BOARDS = new Set<BoardId>(['b', 'varaq']);
const READY_MODES = new Set(['B']);
const HIDDEN_MODES = new Set(['E']);
const READY_VIEWS = new Set([0, 1]);   // B: Kesim, Reja
const ready = (id: BoardId) => BETA || READY_BOARDS.has(id);
const SOON = () => tr('Tez orada');
/** Shablon qiymatlari: tayyor boʻlmagan rejim tugmalariga belgi, B koʻrinishlaridan faqat tayyorlari */
function gate(v: Record<string, unknown>): Record<string, unknown> {
  if (BETA) return v;
  const o = { ...v };
  /* Mikromodel saytda umuman koʻrinmaydi (Iskandar, 10:24: «alohida takomillashtiramiz, keyin chiqaramiz») */
  if (Array.isArray(o.modes)) o.modes = (o.modes as { k: string }[]).filter(m => !HIDDEN_MODES.has(m.k)).map(m => READY_MODES.has(m.k) ? m : { ...m, dis: 'true', soon: SOON() });
  if (Array.isArray(o.views)) o.views = (o.views as unknown[]).filter((_x, i) => READY_VIEWS.has(i));
  return o;
}

/* ---------- saqlash ---------- */
/** B va Varaq uchun umumiy koʻcha (kesim) maʼlumoti */
const STREET = ['PL', 'els', 'rl', 'tplName', 'TPL', 'sk', 'uk', 'U', 'bL', 'bR', 'eL', 'eR', 'gfx', 'showU'];
const SHARED: Partial<Record<BoardId, string[]>> = { b: STREET, varaq: STREET, c: ['TPL'] };
/** faqat oʻsha oynada kerak (saqlanmaydi): tanlangan zona/tarmoq */
const VOLATILE = new Set(['sel', 'selU', 'vw']);
const LS = { get(k: string): Record<string, unknown> | null { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } },
  set(k: string, v: unknown): void { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* toʻla */ } } };
const pick = (o: Record<string, unknown>, keys: string[]) => Object.fromEntries(keys.filter(k => k in o).map(k => [k, o[k]]));
const omit = (o: Record<string, unknown>, keys: string[]) => Object.fromEntries(Object.entries(o).filter(([k, v]) => !keys.includes(k) && typeof v !== 'function'));

/* ---------- qobiq ---------- */
const ICON = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  lib: '<path d="M5 4v16M10 4v16M15 5l4 15"/>',
  sheet: '<path d="M4 5h16v14H4zM4 15h16M12 15v4"/>',
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14"/>',
  save: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  open: '<path d="M4 7h6l2 2h8v10H4zM4 7V5h6"/>',
};
const SERVICES: { id: string; name: string; href: string; color: string; cur?: boolean; beta?: boolean }[] = [
  { id: 'mr', name: 'Master reja', href: './', color: 'var(--svc-mr)' },
  { id: 'ks', name: 'Koʻchasoz', href: './kochasoz.html', color: 'var(--svc-ks)', cur: true },
  { id: 'joy', name: 'Joyshunos', href: './joyshunos.html', color: 'var(--svc-joy)' },
  { id: 'ren', name: 'Render', href: './render.html', color: 'var(--svc-ren)', beta: true },
  { id: 'dk', name: 'Dizayn-kod', href: '../dizaynkod.html', color: 'var(--svc-dk)' },
  { id: 'chz', name: 'Chizmadon', href: './#/chizmadon', color: 'var(--svc-chz)' },
];

const app = document.getElementById('ks')!;
const header = h('header', { class: 'eko glass' });
const stage = h('div', { class: 'ks-stage', id: 'ksStage' });
app.replaceChildren(header, stage);

function ib(id: string, label: string, icon: string, on: () => void, extra = ''): HTMLButtonElement {
  const b = h('button', { class: `btn btn-sm btn-ghost icon-btn ${extra}`, id, type: 'button', title: tr(label), 'aria-label': tr(label), onclick: on }); b.append(svgIcon(icon)); b.querySelector('svg')!.classList.add('ic', 'sm'); return b;
}
function renderHeader(): void {
  const cur = route().id;
  header.replaceChildren(
    h('a', { class: 'brand', href: '../index.html', title: tr('Bosh sahifa') }, logoSvg(20), h('span', {}, 'Archemistry Lab')),
    h('span', { class: 'vr' }),
    h('nav', { class: 'svc', 'aria-label': tr('Xizmatlar') }, ...SERVICES.map(s => h('a', { href: s.href, class: s.cur ? 'on' : '', 'aria-current': s.cur ? 'page' : null, 'data-svc': s.id }, h('i', { style: `background:${s.color}` }), tr(s.name), (s as { beta?: boolean }).beta ? h('em', { class: 'beta' }, 'beta') : null))),
    h('span', { class: 'sp' }),
    ...(BETA ? [(() => { const b = ib('ksGrafika', 'Grafik kutubxona', ICON.lib, () => go('grafika')); b.setAttribute('aria-pressed', String(cur === 'grafika')); return b; })()] : []),
    (() => { const b = ib('ksVaraq', 'Albom varagʻi', ICON.sheet, () => go('varaq')); b.setAttribute('aria-pressed', String(cur === 'varaq')); return b; })(),
    ib('ksSave', 'Koʻchasoz faylini saqlash (.json)', ICON.save, () => saveJson(allState())),
    ib('ksOpen', 'Faylni ochish', ICON.open, () => openJson(o => { restoreAll(o); toast(tr('Fayl ochildi')); })),
    (() => { const a = h('a', { class: 'btn btn-sm btn-ghost icon-btn', id: 'ksOld', href: '../studio.html', title: tr('Xaritada ishlash (oldingi studiya: OSM koʻchalari, mavjud va loyiha profili, hudud tahlili)'), 'aria-label': tr('Xaritada ishlash') }); const s = svgIcon(ICON.map); s.classList.add('ic', 'sm'); a.append(s); return a; })(),
    h('div', { class: 'seg sm langsw', role: 'group', 'aria-label': tr('Til'), id: 'langSw' },
      ...LANGS.map(l => h('button', { type: 'button', 'data-lang': l.id, 'aria-pressed': l.id === getLang(), onclick: () => setLang(l.id as Lang) }, l.name))),
    ib('themeBtn', isDark() ? 'Yorugʻ rejim' : 'Tungi rejim', isDark() ? ICON.sun : ICON.moon, () => toggleTheme()),
  );
}

/* ---------- marshrut ---------- */
function route(): { id: BoardId } {
  const m = /^#\/(a|b|c|e|grafika|varaq)\b/.exec(location.hash), id = (m?.[1] as BoardId) ?? 'b';
  return { id: ready(id) ? id : 'b' };
}
function go(id: BoardId): void { location.hash = `#/${id}`; }

let current: { id: BoardId; m: Mounted } | null = null;
let seq = 0;
async function show(): Promise<void> {
  const { id } = route(), my = ++seq;
  renderHeader();
  document.title = `${tr(BOARDS[id].title)} — ${tr('Koʻchasoz')} · Archemistry Lab`;
  if (current?.id === id) return;
  const [Cls, tpl] = await Promise.all([BOARDS[id].load(), BOARDS[id].tpl()]);
  if (my !== seq) return;
  current?.m.destroy(); current = null;
  const inst = new Cls.default({});
  const shared = SHARED[id] ?? [];
  inst.state = { ...inst.state, ...(LS.get(`ks-${id}`) ?? {}), ...(shared.length ? pick(LS.get('ks-street') ?? {}, shared) : {}) };
  const street = LS.get('ks-street');
  if ((id === 'b' || id === 'varaq') && typeof street?.pendingTpl === 'string') {
    inst.state = applyTpl(inst.state, street.pendingTpl);
    const { pendingTpl: _p, ...rest } = street; LS.set('ks-street', rest);
  }
  if (id === 'varaq') inst.state = { ...inst.state, sel: -1, selU: -1 };
  if (id === 'b' && !BETA && !READY_VIEWS.has(inst.state.view as number)) inst.state = { ...inst.state, view: 0 };
  let t: ReturnType<typeof setTimeout> | undefined;
  inst.__changed = () => { clearTimeout(t); t = setTimeout(() => persist(id, inst), 200); };
  stage.dataset.board = id;
  if (location.hash !== `#/${id}`) history.replaceState(null, '', `#/${id}`);
  const m = mount(stage, tpl.default, inst, gate);
  current = { id, m };
  if (id === 'b') fitWidth(inst);
  (window as unknown as { __ks: unknown }).__ks = current;   // e2e testlar uchun
}
/** B: kesim chizmasi kartani toʻldiradi — viewBox eni karta nisbatiga qarab (pastki qator shu bilan bir vertikalda) */
let ro: ResizeObserver | null = null;
function fitWidth(inst: DCLogic): void {
  ro?.disconnect();
  const card = stage.querySelector<HTMLElement>('.ws-b main > .card');
  if (!card || typeof ResizeObserver === 'undefined') return;
  const upd = () => { const r = card.getBoundingClientRect(); if (r.width < 50 || r.height < 50) return; const vw = Math.round(680 * r.width / r.height); if (vw !== (inst.state as { vw?: number }).vw) inst.setState({ vw }); };
  ro = new ResizeObserver(upd); ro.observe(card); upd();
}
function persist(id: BoardId, inst: DCLogic): void {
  const st = inst.state as Record<string, unknown>, shared = SHARED[id] ?? [];
  LS.set(`ks-${id}`, omit(st, [...shared, ...VOLATILE]));
  if (shared.length) LS.set('ks-street', { ...(LS.get('ks-street') ?? {}), ...pick(st, shared) });
}
function allState(): Record<string, unknown> {
  if (current) persist(current.id, current.m.inst);
  const o: Record<string, unknown> = { kind: 'archemistry-kochasoz', v: 1, street: LS.get('ks-street') };
  for (const id of Object.keys(BOARDS)) o[id] = LS.get(`ks-${id}`);
  return o;
}
function restoreAll(o: Record<string, unknown>): void {
  if (o.kind !== 'archemistry-kochasoz') throw new Error(tr('Bu Koʻchasoz fayli emas'));
  if (o.street) LS.set('ks-street', o.street);
  for (const id of Object.keys(BOARDS)) if (o[id]) LS.set(`ks-${id}`, o[id]);
  const id = current?.id; current?.m.destroy(); current = null; if (id) void show();
}

/* rejim tugmalari (A–E) va «Kesimini ochish (B)» havolasi — shablon ichida, bu yerda ushlanadi */
stage.addEventListener('click', e => {
  const t = e.target as HTMLElement;
  const tab = t.closest('.mtab');
  if (tab) {
    const k = MODE_KEY[tab.querySelector('b')?.textContent?.trim() ?? ''];
    if (tab.getAttribute('aria-disabled') === 'true') { toast(tr('Tez orada — bu boʻlim hali ishlab chiqilmoqda')); return; }
    if (k === 'd') { toast(tr('D · Koʻcha muhiti — maketi hali chizilmagan')); return; }
    if (k) go(k);
    return;
  }
  const a = t.closest('a[href="#/b"]');
  if (a && current?.id === 'a') {
    e.preventDefault();
    openFromNetwork(current.m.inst.state as Record<string, unknown>);
    return;
  }
  const btn = t.closest('button');
  if (btn?.dataset.ksexp && current?.id === 'b') { toggleExportMenu(btn); return; }
  if (btn && current?.id === 'varaq') {
    const lbl = btn.textContent?.trim();
    const svg = stage.querySelector<SVGSVGElement>('.ws-varaq svg[role=img]');
    const name = `${tr('Koʻchasoz')} — ${(current.m.inst.state as { tplName?: string }).tplName ?? ''}`;
    if (!svg) return;
    if (lbl === 'SVG') exportSvg(svg, name);
    else if (lbl === 'PDF') void exportPdf(svg, name);
    else if (lbl === 'DXF') toast(tr('DXF: varaqni Chizmadonga yuboring — u yerdan DXF/PDF/PPTX eksporti bor'));
    else if (btn.dataset.ren) void varaqToRender(svg, name);
    else if (btn.classList.contains('btn-primary')) sendToChizmadon(svg, name);
  }
});

/* ---------- B · kesim: eksport menyusi (DXF · SVG · PNG 2×/4× · PDF) ---------- */
const EXP_OPTS_KEY = 'ks-exp-opts';
function toggleExportMenu(btn: HTMLElement): void {
  const wrap = btn.parentElement as HTMLElement, old = wrap.querySelector('.ks-menu');
  if (old) { old.remove(); btn.setAttribute('aria-expanded', 'false'); return; }
  const svg = stage.querySelector<SVGSVGElement>('.ws-b svg[role=img]'); if (!svg) return;
  const st = current!.m.inst.state as { els?: [string, number][]; rl?: number; tplName?: string };
  const base = `${st.tplName || tr('Koʻcha')}_${tr('kesim')}_${new Date().toISOString().slice(0, 10)}`;
  const opts: KesimOpts = { ...KESIM_OPTS_DEF, ...(LS.get(EXP_OPTS_KEY) ?? {}) };
  const close = () => { menu.remove(); btn.setAttribute('aria-expanded', 'false'); document.removeEventListener('pointerdown', outside, true); };
  const outside = (e: Event) => { if (!wrap.contains(e.target as Node)) close(); };
  const run = (f: () => unknown) => () => { close(); void f(); };
  const item = (label: string, note: string, f: () => unknown) => h('button', { type: 'button', role: 'menuitem', onclick: run(f) }, h('span', {}, label), h('span', { class: 't-foot' }, note));
  const ck = (k: keyof KesimOpts, label: string) => {
    const box = h('span', { class: `check${opts[k] ? ' on' : ''}` }); box.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10"></path></svg>';
    const b = h('button', { type: 'button', role: 'menuitemcheckbox', class: 'ks-ck', 'aria-checked': String(opts[k]), onclick: () => { opts[k] = !opts[k]; LS.set(EXP_OPTS_KEY, opts); box.classList.toggle('on', opts[k]); b.setAttribute('aria-checked', String(opts[k])); } }, box, h('span', {}, label));
    return b;
  };
  const menu = h('div', { class: 'ks-menu', role: 'menu' },
    item('DXF', tr('AutoCAD · Archicad, 1:1 m'), async () => {
      if (!svg.dataset.g) { toast(tr('DXF faqat «Kesim» koʻrinishida chiqariladi')); return; }
      const txt = await kesimDxf({ svg, widths: (st.els ?? []).map(e => e[1]), rl: st.rl ?? 0, name: base }, opts).catch(e => { toast(`DXF: ${(e as Error).message}`); return null; });
      if (txt) download(`${safeName(base)}.dxf`, txt, 'application/dxf');
    }),
    item('SVG', tr('vektor'), () => download(`${safeName(base)}.svg`, svgText(cleanSvg(svg)), 'image/svg+xml')),
    item('PNG 2×', tr('rasm'), () => exportPng(cleanSvg(svg), `${safeName(base)}.png`, 2)),
    item('PNG 4×', tr('chop etish uchun'), () => exportPng(cleanSvg(svg), `${safeName(base)}.png`, 4)),
    item('PDF', 'A3', () => exportPdf(cleanSvg(svg), base)),
    h('hr', {}),
    h('div', { class: 'ks-mh' }, tr('DXF ga kiritish')),
    ck('sil', tr('Siluetlar')), ck('util', tr('Tarmoqlar')), ck('legend', tr('Legenda')), ck('bld', tr('Binolar')), ck('title', tr('Sarlavha')));
  wrap.append(menu); btn.setAttribute('aria-expanded', 'true');
  setTimeout(() => document.addEventListener('pointerdown', outside, true));
}

/** Varaq (SVG) → PNG → Render studiyasi (asos rasm, «Koʻcha») */
async function varaqToRender(svg: SVGSVGElement, name: string): Promise<void> {
  try {
    const vb = svg.viewBox.baseVal, W = 2400, H = Math.round(W * (vb.height || 1) / (vb.width || 1));
    const c = svg.cloneNode(true) as SVGSVGElement; c.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); c.setAttribute('width', String(W)); c.setAttribute('height', String(H));
    const u = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(c)], { type: 'image/svg+xml' })), im = new Image(); im.src = u; await im.decode();
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d')!; g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.drawImage(im, 0, 0, W, H); URL.revokeObjectURL(u);
    const { sendToRender } = await import('../render/inbox');
    await sendToRender({ name, from: 'ks', subj: 'kocha', img: cv.toDataURL('image/png'), w: W, h: H });
  } catch (e) { toast(`Render: ${(e as Error).message}`); }
}

/** A (tarmoq) da tanlangan koʻcha toifasi → B dagi mos tayyor kesim (B ochilganda qoʻllanadi) */
const NET_TPL: Record<string, string> = { sh1: 'Magistral · tramvayli', sh2: 'Avtobus koridori', tm: 'Tuman koʻchasi', mh: 'Mahalla koʻchasi', pd: 'Piyoda koʻchasi' };
function openFromNetwork(st: Record<string, unknown>): void {
  const S = st.S as { k: string }[] | undefined, q = S?.[st.sel as number];
  if (q && NET_TPL[q.k]) LS.set('ks-street', { ...(LS.get('ks-street') ?? {}), pendingTpl: NET_TPL[q.k] });
  go('b');
}
type Tpl = [string, unknown, [string, number, Record<string, unknown>][], string, string, Record<string, unknown>[]?];
/** Tayyor kesimni koʻcha holatiga yuklash (B dagi «Tayyor kesimlar» tugmasi bilan bir xil) */
function applyTpl(state: Record<string, unknown>, name: string): Record<string, unknown> {
  const t = (state.TPL as Tpl[] | undefined)?.find(x => x[0] === name); if (!t) return state;
  const w = t[2].reduce((a, e) => a + e[1], 0);
  return { ...state, els: t[2].map(e => [e[0], e[1], { ...e[2] }]), rl: Math.round(w * 100) / 100, tplName: t[0], sk: t[3], uk: t[4], sel: 0, selU: -1, U: [], PL: (t[5] ?? []).map(p => ({ ...p })) };
}

window.addEventListener('hashchange', () => void show());
onLang(() => { renderHeader(); current?.m.render(); document.documentElement.lang = getLang(); });
onTheme(() => renderHeader());
document.documentElement.lang = getLang();
void show();
