/**
 * Joyshunos — kirish nuqtasi (app/joyshunos.html). Kanvasdagi «Joy-A» maketi:
 *   toʻliq ekranli xarita · chapda qatlamlar paneli (Yer, Iqlim, Shahar, Biznes) · oʻngda joy pasporti kartalari ·
 *   markazda tanlangan nuqta va piyoda doirasi · pastda soʻrov qatori.
 * Maʼlumot manbalari brauzerdan: AWS Terrain (relyef), EPW TMYx (shamol), OpenStreetMap / Overpass (xizmatlar, raqobatchilar).
 * Manbasi hali ulanmagan qatlamlar «Tez orada» (Iskandar, 2026-10-18: «birlamchi maʼlumot ololsak — beta, ololmasak — ishlab chiqib qoʻshamiz»).
 * Eski toʻliq asboblar (gis, shamol, posadka, ai) — panel pastidagi havolalar orqali ochiq qoladi (0-qoida).
 */
import '../ui/ds2.css';
import './joy.css';
import type { Map as MLMap, GeoJSONSource, Marker } from 'maplibre-gl';
import type { LngLat } from '../core/doc';
import { toggleTheme, isDark, onTheme } from '../ui/theme';
import { h, svgIcon, fmt } from '../ui/dom';
import { logoSvg } from '../ui/logo';
import { tr, tf, getLang, setLang, onLang, LANGS, type Lang } from '../i18n';
import { mapStyle, basePrefs } from '../context/mapstyle';
import { geocode, type Place } from '../context/geocode';
import { bboxAround } from '../context/osm';
import { loadTerrain, TERRAIN_URL, type TerrainGrid } from '../context/tiles';
import { overpass } from '../context/load';
import { ContextManager } from '../context/manager';
import type { PoiBundle } from '../context/poi';
import type { ContextBundle } from '../context/load';
import { svcDef, type Svc } from '../core/services';
import { nearestStation, type Climate } from '../core/wind';
import { CATS, catQuery, circleRing, countPoi, dir8, distM, parseComp, slopeColor, slopeGrid, SLOPE_BINS, terrainStats, walkMin, windSummary, type Comp, type TerrainStats, type WindSum } from './analyze';

/* ---------------- qatlamlar ---------------- */
type Group = 'yer' | 'iqlim' | 'shahar' | 'biznes';
type LayerId = 'relyef' | 'nishab' | 'yuza' | 'issiqlik' | 'quyosh' | 'shamol' | 'shovqin' | 'xizmat' | 'piyoda' | 'oqim' | 'raqobat' | 'narx';
interface LayerDef { id: LayerId; g: Group; name: string; src: string; color: string; ready: boolean }
const LAYERS: LayerDef[] = [
  { id: 'relyef', g: 'yer', name: 'Relyef', src: 'AWS Terrain', color: '#8b7a6a', ready: true },
  { id: 'nishab', g: 'yer', name: 'Nishab', src: 'relyefdan', color: '#eaa56b', ready: true },
  { id: 'yuza', g: 'yer', name: 'Yuza tasnifi', src: 'yoʻldosh', color: '#b9cfa6', ready: false },
  { id: 'issiqlik', g: 'yer', name: 'Issiqlik oroli', src: 'Landsat', color: '#d9503f', ready: false },
  { id: 'quyosh', g: 'iqlim', name: 'Quyosh va soya', src: 'brauzer', color: '#e8a317', ready: false },
  { id: 'shamol', g: 'iqlim', name: 'Shamol', src: 'EPW', color: '#3f8f6b', ready: true },
  { id: 'shovqin', g: 'iqlim', name: 'Shovqin', src: 'model', color: '#c2416b', ready: false },
  { id: 'xizmat', g: 'shahar', name: 'Xizmatlar', src: 'OSM', color: '#2a9d8f', ready: true },
  { id: 'piyoda', g: 'shahar', name: 'Piyoda yetish', src: 'tarmoq', color: '#8a84d6', ready: false },
  { id: 'oqim', g: 'biznes', name: 'Odamlar oqimi', src: 'model', color: '#4c5bd4', ready: false },
  { id: 'raqobat', g: 'biznes', name: 'Raqobatchilar', src: 'OSM', color: '#7a5a3c', ready: true },
  { id: 'narx', g: 'biznes', name: 'Uy narxlari', src: 'uybor', color: '#6b6965', ready: false },
];
const GROUPS: [Group, string][] = [['yer', 'Yer'], ['iqlim', 'Iqlim'], ['shahar', 'Shahar'], ['biznes', 'Biznes']];
const SVC_KINDS: Svc[] = ['maktab', 'mtm', 'poliklinika', 'dorixona', 'savdo', 'sport', 'bekat', 'metro'];
const SVC_COL: Record<Svc, string> = { maktab: '#2f6da8', mtm: '#e08a3c', poliklinika: '#c2416b', dorixona: '#2b7449', savdo: '#8b4a9c', sport: '#0f8a7e', mahalla: '#6b6965', bekat: '#4c5bd4', metro: '#141414' };
const SVC_SHORT: Record<Svc, string> = { maktab: 'maktab', mtm: 'bogʻcha', poliklinika: 'poliklinika', dorixona: 'dorixona', savdo: 'savdo', sport: 'sport', mahalla: 'mahalla', bekat: 'bekat', metro: 'metro' };
const RADII = [300, 500, 800];
const ACC = '#c0643a';   // --svc-joy

/* ---------------- holat (brauzerda saqlanadi) ---------------- */
interface State { c: LngLat; r: number; on: LayerId[]; cat: string; base: 'stil' | 'sat'; z?: number }
const DEF: State = { c: [69.2797, 41.3111], r: 500, on: ['relyef', 'shamol', 'xizmat', 'raqobat'], cat: 'cafe', base: 'stil' };
const S: State = (() => {
  try { const o = JSON.parse(localStorage.getItem('joy-state') || 'null'); if (o && Array.isArray(o.c)) return { ...DEF, ...o, on: (o.on as LayerId[]).filter(id => LAYERS.some(l => l.id === id && l.ready)) }; } catch { /* */ }
  return { ...DEF };
})();
const save = () => { try { localStorage.setItem('joy-state', JSON.stringify(S)); } catch { /* */ } };
const isOn = (id: LayerId) => S.on.includes(id);

/* ---------------- maʼlumot (har nuqta uchun) ---------------- */
type Ld<T> = { st: 'idle' | 'load' | 'ok' | 'err'; v?: T; err?: string };
const D: { addr: Ld<string>; ter: Ld<{ g: TerrainGrid; s: TerrainStats }>; poi: Ld<PoiBundle>; comp: Ld<Comp[]>; wind: Ld<{ w: WindSum; name: string; km: number }> } =
  { addr: { st: 'idle' }, ter: { st: 'idle' }, poi: { st: 'idle' }, comp: { st: 'idle' }, wind: { st: 'idle' } };
const ctx = new ContextManager();
let climate: Climate | null = null;
let seq = 0;

/* ---------------- qobiq ---------------- */
const ICON = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  chev: '<path d="M6 9l6 6 6-6"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
  ruler: '<path d="M3 17L17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2"/>',
  area: '<path d="M4 7l6-3 10 4-2 11-12 1z"/>',
  cut: '<path d="M3 12h18M7 8v8M17 8v8"/>',
};
const SERVICES = [
  { id: 'mr', name: 'Master reja', href: './', color: 'var(--svc-mr)' },
  { id: 'ks', name: 'Koʻchasoz', href: './kochasoz.html', color: 'var(--svc-ks)' },
  { id: 'joy', name: 'Joyshunos', href: './joyshunos.html', color: 'var(--svc-joy)', cur: true },
  { id: 'dk', name: 'Dizayn-kod', href: '../dizaynkod.html', color: 'var(--svc-dk)' },
  { id: 'chz', name: 'Chizmadon', href: './#/chizmadon', color: 'var(--svc-chz)' },
];
const OLD = [['GIS tahlil', '../gis.html'], ['Shamol tahlili', '../shamol.html'], ['Joylashtirish', '../posadka.html'], ['Hudud bahosi va AI', '../ai.html']];

const root = document.getElementById('joy')!;
const mapEl = h('div', { class: 'joy-map', id: 'joyMap' });
const header = h('header', { class: 'eko glass' });
const left = h('aside', { class: 'joy-lp panel', id: 'joyLeft', 'aria-label': tr('Qatlamlar') });
const right = h('aside', { class: 'joy-rp', id: 'joyRight', 'aria-label': tr('Joy pasporti') });
const ask = h('div', { class: 'joy-ask glass', id: 'joyAsk' });
const baseSw = h('div', { class: 'joy-base glass', id: 'joyBase' });
const legend = h('div', { class: 'joy-legend glass', id: 'joyLegend', hidden: true });
const modeSw = h('div', { class: 'joy-mode glass', id: 'joyMode' });
const axoEl = h('div', { class: 'joy-axo', id: 'joyAxo', hidden: true });
const axL = h('aside', { class: 'joy-axl panel', id: 'joyAxL' }), axN = h('aside', { class: 'joy-notes glass', id: 'joyNotes' }), axT = h('div', { class: 'joy-time glass', id: 'joyTime' });
root.replaceChildren(mapEl, axoEl, header, left, right, ask, baseSw, legend, axL, axN, axT, modeSw);

const ic = (d: string, cls = 'ic') => { const s = svgIcon(d); s.classList.add(cls); return s; };
function renderHeader(): void {
  header.replaceChildren(
    h('a', { class: 'brand', href: '../index.html', title: tr('Bosh sahifa') }, logoSvg(20), h('span', {}, 'Archemistry Lab')),
    h('span', { class: 'vr' }),
    h('nav', { class: 'svc', 'aria-label': tr('Xizmatlar') }, ...SERVICES.map(s => h('a', { href: s.href, class: s.cur ? 'on' : '', 'aria-current': s.cur ? 'page' : null, 'data-svc': s.id }, h('i', { style: `background:${s.color}` }), tr(s.name)))),
    h('span', { class: 'sp' }),
    h('div', { class: 'seg sm langsw', role: 'group', 'aria-label': tr('Til'), id: 'langSw' },
      ...LANGS.map(l => h('button', { type: 'button', 'data-lang': l.id, 'aria-pressed': l.id === getLang(), onclick: () => setLang(l.id as Lang) }, l.name))),
    (() => { const b = h('button', { class: 'btn btn-sm btn-ghost icon-btn', id: 'themeBtn', type: 'button', title: tr(isDark() ? 'Yorugʻ rejim' : 'Tungi rejim'), 'aria-label': tr(isDark() ? 'Yorugʻ rejim' : 'Tungi rejim'), onclick: () => toggleTheme() }); b.append(ic(isDark() ? ICON.sun : ICON.moon)); return b; })(),
  );
}

/* ---------------- chap panel: qidiruv va qatlamlar ---------------- */
let found: Place[] = [], searching = false, qText = '';
function sw(on: boolean, label: string, f: () => void): HTMLButtonElement {
  return h('button', { type: 'button', class: `switch${on ? ' on' : ''}`, role: 'switch', 'aria-checked': on, 'aria-label': label, onclick: f }, h('i'));
}
function renderLeft(): void {
  const q = h('input', { class: 'input', type: 'search', id: 'joyQ', placeholder: tr('Manzil yoki koordinata'), value: qText, 'aria-label': tr('Manzil qidirish') }) as HTMLInputElement;
  q.addEventListener('input', () => { qText = q.value; });
  q.addEventListener('keydown', e => { if (e.key === 'Enter') void search(q.value); if (e.key === 'Escape') { found = []; renderLeft(); } });
  const res = found.length ? h('div', { class: 'joy-res', role: 'listbox' }, ...found.map(p => h('button', { type: 'button', role: 'option', onclick: () => { found = []; qText = p.name; pick(p.at, true); } }, h('b', {}, p.name), h('span', {}, p.detail)))) : null;
  left.replaceChildren(...[
    h('div', { class: 'joy-search' }, ic(ICON.search), q, searching ? h('span', { class: 't-small' }, '…') : null),
    res,
    h('div', { class: 'joy-groups' }, ...GROUPS.map(([g, gn]) => h('section', { class: 'joy-g' },
      h('div', { class: 'joy-gl' }, tr(gn)),
      ...LAYERS.filter(l => l.g === g).map(l => h('div', { class: `joy-l${l.ready ? '' : ' soon'}`, 'data-layer': l.id },
        h('i', { class: 'sq', style: `background:${l.color}` }),
        h('span', { class: 'nm' }, tr(l.name)),
        h('span', { class: 'src' }, tr(l.src)),
        l.ready ? sw(isOn(l.id), tr(l.name), () => toggle(l.id)) : h('em', { class: 'soon', title: tr('Manba ulanmoqda — keyingi bosqichda') }, tr('Tez orada')),
      )),
    ))),
    h('div', { class: 'joy-tools' }, ...([['Lineyka', ICON.ruler], ['Maydon', ICON.area], ['Kesim', ICON.cut]] as const).map(([n, d]) => { const b = h('button', { type: 'button', class: 'btn', disabled: true, title: `${tr(n)} — ${tr('Tez orada')}` }, ic(d), tr(n)); return b; })),
    h('details', { class: 'joy-old' },
      h('summary', {}, tr('Toʻliq asboblar (avvalgi koʻrinish)'), ic(ICON.chev)),
      h('div', {}, ...OLD.map(([n, u]) => h('a', { href: u }, tr(n), ic(ICON.ext))))),
  ].filter((x): x is NonNullable<typeof x> => !!x));
}
async function search(q: string): Promise<void> {
  if (!q.trim()) return;
  searching = true; renderLeft();
  try { found = await geocode(q, S.c); if (!found.length) found = [{ name: tr('Hech narsa topilmadi'), detail: '', at: S.c }]; }
  catch (e) { found = [{ name: tr('Qidiruv ishlamadi'), detail: (e as Error).message, at: S.c }]; }
  searching = false; renderLeft();
  (document.getElementById('joyQ') as HTMLInputElement | null)?.focus();
}
function toggle(id: LayerId): void {
  S.on = isOn(id) ? S.on.filter(x => x !== id) : [...S.on, id]; save();
  renderLeft(); renderRight(); paint();
  if (isOn(id)) ensure();
}

/* ---------------- oʻng ustun: joy pasporti ---------------- */
let catOpen = false;
function card(l: LayerDef, srcChip: string, big: string | Node, sub: (string | Node)[], extra?: Node | null, st?: Ld<unknown>): HTMLElement {
  const body = !st || st.st === 'ok'
    ? [h('div', { class: 'big' }, big), h('div', { class: 'sub' }, ...sub)]
    : st.st === 'err' ? [h('div', { class: 'sub err' }, tr('Yuklanmadi'), ': ', st.err ?? ''), h('button', { type: 'button', class: 'btn btn-sm', onclick: () => { retry(l.id); } }, tr('Qayta urinish'))]
      : [h('div', { class: 'big skel' }, ' '), h('div', { class: 'sub' }, tr('Yuklanmoqda…'))];
  return h('article', { class: 'joy-card', 'data-card': l.id },
    h('header', {}, h('i', { class: 'sq', style: `background:${l.color}` }), h('span', { class: 'nm' }, tr(l.name)), extra ?? null, h('span', { class: 'chip' }, srcChip)),
    ...body);
}
function renderRight(): void {
  const L = (id: LayerId) => LAYERS.find(l => l.id === id)!;
  const cards: HTMLElement[] = [];
  const addr = D.addr.st === 'ok' ? D.addr.v! : D.addr.st === 'load' ? tr('Manzil aniqlanmoqda…') : `${S.c[1].toFixed(4)}, ${S.c[0].toFixed(4)}`;
  cards.push(h('article', { class: 'joy-card head' },
    h('div', { class: 't-small' }, tr('Joy pasporti')),
    h('h1', { class: 'ttl' }, addr, h('span', { class: 'r' }, ` · ${S.r} m`)),
    h('div', { class: 'meta' },
      h('span', { class: 'chip mono' }, `${S.c[1].toFixed(5)}, ${S.c[0].toFixed(5)}`),
      h('div', { class: 'seg sm', role: 'group', 'aria-label': tr('Radius') }, ...RADII.map(r => h('button', { type: 'button', 'aria-pressed': r === S.r, onclick: () => setRadius(r) }, `${r} m`)))),
    h('div', { class: 't-small' }, tf('${r} m — taxminan ${m} daqiqa piyoda (toʻgʻri chiziqda). Xaritani bosib boshqa nuqtani tanlang.', { r: S.r, m: walkMin(S.r) }))));

  if (isOn('relyef') || isOn('nishab')) {
    const t = D.ter.v?.s;
    cards.push(card(L('relyef'), 'AWS Terrain', t ? `${fmt(t.min)}–${fmt(t.max)} m` : '—',
      t ? [tf('Nishab oʻrtacha ${a} %, eng katta ${b} %', { a: fmt(t.slopeMean, 1), b: fmt(t.slopeMax, 1) }), t.downhill != null ? ` · ${tf('pasayish — ${d}ga', { d: tr(dir8(t.downhill)) })}` : ` · ${tr('deyarli tekis')}`] : [],
      null, D.ter));
  }
  if (isOn('shamol')) {
    const w = D.wind.v;
    cards.push(card(L('shamol'), 'EPW', w ? tr(dir8(w.w.k * 22.5)) : '—',
      w ? [tf('Ustun yoʻnalish (qayerdan) — vaqtning ${p} %; oʻrtacha ${v} m/s; tinch ${c} %.', { p: fmt(w.w.share * 100), v: fmt(w.w.mean, 1), c: fmt(w.w.calm * 100) }), h('br'), h('span', { class: 'src' }, tf('Stansiya: ${n}, ${k} km · TMYx 2011–2025', { n: w.name, k: fmt(w.km, 1) }))] : [],
      null, D.wind));
  }
  if (isOn('xizmat')) {
    const p = D.poi.v, cnt = p ? countPoi(p.pois, S.c, S.r, SVC_KINDS) : [];
    const tot = cnt.reduce((a, c) => a + c.n, 0);
    const chk = (k: Svc) => { const c = cnt.find(x => x.kind === k); if (!c) return null; const def = svcDef(k), ok = c.nearest != null && c.nearest <= def.r;
      return h('li', { class: ok ? 'ok' : 'warn' }, h('span', {}, tr(def.name)), h('b', {}, c.nearest == null ? tr('topilmadi') : `${fmt(c.nearest)} m`), h('em', {}, `≤ ${def.r} m`)); };
    cards.push(card(L('xizmat'), 'OSM', p ? tf('${n} obyekt', { n: tot }) : '—',
      p ? [cnt.filter(c => c.n).map(c => `${tr(SVC_SHORT[c.kind])} ${c.n}`).join(' · ') || tr('Doira ichida obyekt yoʻq'),
        h('ul', { class: 'joy-norm' }, chk('bekat'), chk('maktab'), chk('mtm'), chk('dorixona')),
        h('span', { class: 'src' }, tr('Eng yaqini (toʻgʻri chiziq) va meʼyor: ShNQ 2.07.01-23, 38-jadval; bekat — 382-band. OSM toʻliq emas: «kamida shuncha».'))] : [],
      null, D.poi));
  }
  if (isOn('raqobat')) {
    const cat = CATS.find(c => c.id === S.cat) ?? CATS[0], list = D.comp.v ?? [], inR = list.filter(c => c.d <= S.r);
    const pickBtn = h('button', { type: 'button', class: 'joy-cat', 'aria-expanded': catOpen, 'aria-haspopup': 'listbox', onclick: () => { catOpen = !catOpen; renderRight(); } }, tr(cat.name), ic(ICON.chev));
    const menu = catOpen ? h('div', { class: 'joy-menu', role: 'listbox' }, ...CATS.map(c => h('button', { type: 'button', role: 'option', 'aria-selected': c.id === S.cat, onclick: () => { catOpen = false; S.cat = c.id; save(); D.comp = { st: 'idle' }; renderRight(); ensure(); } }, tr(c.name)))) : null;
    const el = card(L('raqobat'), 'OSM', D.comp.st === 'ok' ? tf('${n} ta', { n: inR.length }) : '—',
      D.comp.st === 'ok' ? [inR.length ? tf('Eng yaqini ${d} m · ${r} m ichida', { d: fmt(inR[0].d), r: S.r }) : list.length ? tf('${r} m ichida yoʻq; eng yaqini ${d} m', { r: S.r, d: fmt(list[0].d) }) : tr('Yaqin atrofda topilmadi')] : [],
      null, D.comp);
    el.querySelector('header')!.after(h('div', { class: 'joy-catw' }, pickBtn, menu));
    cards.push(el);
  }
  const soonOn = LAYERS.filter(l => !l.ready);
  cards.push(h('article', { class: 'joy-card soonc' }, h('div', { class: 't-small' }, tr('Keyingi bosqichda')),
    h('div', { class: 'chips' }, ...soonOn.map(l => h('span', { class: 'chip' }, h('i', { style: `background:${l.color}` }), tr(l.name))))));
  right.replaceChildren(...cards);
}
function retry(id: LayerId): void {
  if (id === 'relyef' || id === 'nishab') D.ter = { st: 'idle' };
  if (id === 'xizmat') D.poi = { st: 'idle' };
  if (id === 'raqobat') D.comp = { st: 'idle' };
  if (id === 'shamol') D.wind = { st: 'idle' };
  ensure();
}

/* ---------------- soʻrov qatori va fon ---------------- */
function renderAsk(): void {
  ask.replaceChildren(ic(ICON.spark),
    h('input', { class: 'q', type: 'text', disabled: true, placeholder: tr('Bu yerda qahvaxona ochsam boʻladimi?'), 'aria-label': tr('Joy haqida savol') }),
    h('em', { class: 'soon' }, tr('Tez orada')),
    h('button', { type: 'button', class: 'btn btn-primary btn-sm', disabled: true, title: tr('Server ishga tushgach') }, tr('Soʻrash')));
}
function renderBase(): void {
  baseSw.replaceChildren(h('div', { class: 'seg sm', role: 'group', 'aria-label': tr('Fon xarita') },
    ...([['stil', 'Stil'], ['sat', 'Sunʼiy yoʻldosh']] as const).map(([k, n]) => h('button', { type: 'button', 'aria-pressed': S.base === k, onclick: () => { S.base = k; save(); renderBase(); restyle(); } }, tr(n)))));
}

/* ---------------- maʼlumot yuklash ---------------- */
function setRadius(r: number): void { S.r = r; save(); D.comp = { st: 'idle' }; D.ter = { st: 'idle' }; renderRight(); paint(); frame(600); ensure(); if (mode === 'axo') void enterAxo(); }
/** Doirani panellar orasidagi boʻsh joyga sigʻdirish */
function frame(duration = 0): void {
  if (!map) return;
  const r = circleRing(S.c, S.r * 1.08, 32), xs = r.map(p => p[0]), ys = r.map(p => p[1]);
  const pad = { top: 84, bottom: 92, left: left.offsetWidth + 36, right: right.offsetWidth + 36 };
  try { map.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], { padding: pad, duration, maxZoom: 17 }); } catch { /* juda tor oyna */ }
}
function pick(c: LngLat, fly = false): void {
  S.c = c; save(); seq++;
  D.addr = { st: 'idle' }; D.ter = { st: 'idle' }; D.poi = { st: 'idle' }; D.comp = { st: 'idle' }; D.wind = { st: 'idle' };
  renderLeft(); renderRight(); paint();
  if (fly) frame(900);
  ensure();
  if (mode === 'axo') void enterAxo();
}
function run<T>(k: keyof typeof D, job: () => Promise<T>): void {
  const my = seq; (D[k] as Ld<T>) = { st: 'load' };
  job().then(v => { if (my !== seq) return; (D[k] as Ld<T>) = { st: 'ok', v }; renderRight(); paint(); if (mode === 'axo' && k !== 'ter') { if (k === 'addr') renderAxo(); else axBuild(); } })
    .catch(e => { if (my !== seq) return; (D[k] as Ld<T>) = { st: 'err', err: (e as Error).message || String(e) }; renderRight(); });
}
function ensure(): void {
  const c = S.c, r = S.r;
  if (D.addr.st === 'idle') run('addr', () => reverse(c));
  if ((isOn('relyef') || isOn('nishab')) && D.ter.st === 'idle') run('ter', async () => {
    const R = Math.max(r, 500) + 100, g = await loadTerrain(c, R, bboxAround(c, R * 1.1), fetch.bind(globalThis), 10);
    if (!g) throw new Error(tr('relyef plitkalari ochilmadi')); return { g, s: terrainStats(g, r) };
  });
  if (isOn('xizmat') && D.poi.st === 'idle') run('poi', () => ctx.loadPoi(c));
  if (isOn('raqobat') && D.comp.st === 'idle') run('comp', async () => {
    const cat = CATS.find(x => x.id === S.cat) ?? CATS[0], key = `joy-comp:${cat.id}:${c[0].toFixed(4)},${c[1].toFixed(4)}:${r}`;
    const hit = memo.get(key); if (hit) return hit;
    const j = await overpass(catQuery(cat, c, Math.max(r * 2, 1000)), fetch.bind(globalThis), () => {});
    const v = parseComp(j as never, c); memo.set(key, v); return v;
  });
  if (isOn('shamol') && D.wind.st === 'idle') run('wind', async () => {
    if (!climate) { const res = await fetch('./climate/uz_climate.json'); if (!res.ok) throw new Error(`${res.status}`); climate = await res.json() as Climate; }
    const { s, km } = nearestStation(climate, c[0], c[1]); return { w: windSummary(s), name: s.name.replace(/\./g, ' '), km };
  });
}
const memo = new Map<string, Comp[]>();
async function reverse(c: LngLat): Promise<string> {
  const u = new URL('https://nominatim.openstreetmap.org/reverse');
  u.search = new URLSearchParams({ lat: String(c[1]), lon: String(c[0]), format: 'jsonv2', zoom: '18', 'accept-language': 'uz,ru,en' }).toString();
  const r = await fetch(u.toString()); if (!r.ok) throw new Error(String(r.status));
  const j = await r.json() as { name?: string; address?: Record<string, string>; display_name?: string };
  const a = j.address ?? {}, road = a.road || a.pedestrian || a.neighbourhood || a.suburb;
  return road ? `${road}${a.house_number ? `, ${a.house_number}` : ''}` : (j.name || j.display_name?.split(',')[0] || `${c[1].toFixed(4)}, ${c[0].toFixed(4)}`);
}

/* ---------------- xarita ---------------- */
let map: MLMap | null = null;
let rose: Marker | null = null, rlab: Marker | null = null;
const fc = (features: unknown[]) => ({ type: 'FeatureCollection', features });
const pt = (c: LngLat, p: Record<string, unknown> = {}) => ({ type: 'Feature', properties: p, geometry: { type: 'Point', coordinates: c } });
function style(): unknown {
  const pal = isDark() ? 'dark' : basePrefs().pal;
  return mapStyle(S.base, pal === 'dark' && !isDark() ? 'arch' : pal, basePrefs().labels);
}
async function initMap(): Promise<void> {
  const ml = (await import('maplibre-gl')).default;
  await import('maplibre-gl/dist/maplibre-gl.css');
  map = new ml.Map({ container: mapEl, style: style() as never, center: S.c as [number, number], zoom: S.z ?? 15, attributionControl: { compact: true }, maxPitch: 0, dragRotate: false } as never);
  map.addControl(new ml.NavigationControl({ showCompass: false }), 'bottom-right');
  let framed = false;
  map.on('style.load', () => { addOverlays(); paint(); if (!framed) { framed = true; frame(0); } });
  // fon plitkalari ochilmasa (tarmoq/xizmat ishlamasa) — oddiy fon bilan davom etiladi: qatlamlar va hisoblar baribir koʻrinadi
  setTimeout(() => { if (map && !map.getSource('joy-ring')) map.setStyle({ version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': isDark() ? '#1c1e21' : '#f3f1ec' } }] } as never); }, 7000);
  map.on('click', e => { if (catOpen) { catOpen = false; renderRight(); } pick([+e.lngLat.lng.toFixed(6), +e.lngLat.lat.toFixed(6)]); });
  map.on('moveend', () => { S.z = +map!.getZoom().toFixed(2); save(); });
  const roseEl = h('div', { class: 'joy-rose', 'aria-hidden': 'true' }), labEl = h('div', { class: 'joy-rlab' });
  rose = new ml.Marker({ element: roseEl }).setLngLat(S.c as [number, number]);
  rlab = new ml.Marker({ element: labEl, anchor: 'left' }).setLngLat(S.c as [number, number]).addTo(map);
  (window as unknown as { joyMap: MLMap }).joyMap = map;
}
function restyle(): void { map?.setStyle(style() as never); }
function addOverlays(): void {
  if (!map) return;
  const m = map, before = m.getLayer('bld') ? 'bld' : undefined;
  m.addSource('joy-dem', { type: 'raster-dem', tiles: [TERRAIN_URL(0, 0, 0).replace('/0/0/0.png', '/{z}/{x}/{y}.png')], encoding: 'terrarium', tileSize: 256, maxzoom: 15 } as never);
  m.addLayer({ id: 'joy-hs', type: 'hillshade', source: 'joy-dem', layout: { visibility: 'none' }, paint: { 'hillshade-exaggeration': 0.55, 'hillshade-shadow-color': isDark() ? '#000000' : '#6b5a48', 'hillshade-highlight-color': '#ffffff' } } as never, before);
  m.addSource('joy-slope', { type: 'image', url: blankPng(), coordinates: [[0, 1], [1, 1], [1, 0], [0, 0]] } as never);
  m.addLayer({ id: 'joy-slope', type: 'raster', source: 'joy-slope', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.8, 'raster-fade-duration': 0 } } as never, before);
  for (const id of ['joy-ring', 'joy-poi', 'joy-comp', 'joy-c']) m.addSource(id, { type: 'geojson', data: fc([]) as never });
  m.addLayer({ id: 'joy-ring-f', type: 'fill', source: 'joy-ring', paint: { 'fill-color': ACC, 'fill-opacity': 0.05 } });
  m.addLayer({ id: 'joy-ring', type: 'line', source: 'joy-ring', paint: { 'line-color': ACC, 'line-width': 1.6, 'line-dasharray': [3, 2.2] } });
  m.addLayer({ id: 'joy-poi', type: 'circle', source: 'joy-poi', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 3, 17, 6], 'circle-color': ['get', 'col'], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.5, 'circle-opacity': ['case', ['get', 'in'], 1, 0.35], 'circle-stroke-opacity': ['case', ['get', 'in'], 1, 0.35] } } as never);
  m.addLayer({ id: 'joy-comp', type: 'circle', source: 'joy-comp', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 4, 17, 8], 'circle-color': '#7a5a3c', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2, 'circle-opacity': ['case', ['get', 'in'], 1, 0.4] } } as never);
  m.addLayer({ id: 'joy-c-h', type: 'circle', source: 'joy-c', paint: { 'circle-radius': 18, 'circle-color': ACC, 'circle-opacity': 0.16 } });
  m.addLayer({ id: 'joy-c', type: 'circle', source: 'joy-c', paint: { 'circle-radius': 8, 'circle-color': ACC, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2.5 } });
}
let blank = '';
function blankPng(): string { if (!blank) { const c = document.createElement('canvas'); c.width = c.height = 1; blank = c.toDataURL(); } return blank; }
let slopeKey = '';
function paint(): void {
  const m = map; if (!m || !m.getSource('joy-ring')) return;
  (m.getSource('joy-ring') as GeoJSONSource).setData({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [circleRing(S.c, S.r)] } } as never);
  (m.getSource('joy-c') as GeoJSONSource).setData(fc([pt(S.c)]) as never);
  m.setLayoutProperty('joy-hs', 'visibility', isOn('relyef') ? 'visible' : 'none');
  // nishab — doira ichida rangli toʻr
  const t = D.ter.v;
  if (isOn('nishab') && t) {
    const k = `${t.g.center.join()}|${t.g.radius}|${S.r}`;
    if (k !== slopeKey) { slopeKey = k; const s = slopeImage(t.g, S.r); (m.getSource('joy-slope') as unknown as { updateImage: (o: unknown) => void }).updateImage({ url: s.url, coordinates: s.coords }); }
    m.setLayoutProperty('joy-slope', 'visibility', 'visible');
  } else m.setLayoutProperty('joy-slope', 'visibility', 'none');
  const p = isOn('xizmat') ? D.poi.v?.pois ?? [] : [];
  (m.getSource('joy-poi') as GeoJSONSource).setData(fc(p.filter(x => SVC_KINDS.includes(x.kind)).map(x => { const d = distM(S.c, x.at); return d > S.r * 2.2 ? null : pt(x.at, { col: SVC_COL[x.kind], in: d <= S.r }); }).filter(Boolean)) as never);
  const cp = isOn('raqobat') ? D.comp.v ?? [] : [];
  (m.getSource('joy-comp') as GeoJSONSource).setData(fc(cp.map(x => pt(x.at, { in: x.d <= S.r }))) as never);
  // legenda: nishab va xizmatlar
  const lg: Node[] = [];
  if (isOn('nishab') && t) lg.push(h('div', { class: 'lg' }, h('b', {}, tr('Nishab')), ...SLOPE_BINS.map(([, c, n]) => h('span', {}, h('i', { style: `background:${c}` }), tr(n)))));
  if (p.length) lg.push(h('div', { class: 'lg' }, h('b', {}, tr('Xizmatlar')), ...SVC_KINDS.map(k => h('span', {}, h('i', { class: 'dot', style: `background:${SVC_COL[k]}` }), tr(SVC_SHORT[k])))));
  if (cp.length) lg.push(h('div', { class: 'lg' }, h('span', {}, h('i', { class: 'dot', style: 'background:#7a5a3c' }), tr((CATS.find(c => c.id === S.cat) ?? CATS[0]).name))));
  legend.replaceChildren(...lg); legend.hidden = !lg.length;
  // shamol guli — markazda
  const w = isOn('shamol') ? D.wind.v : undefined;
  if (rose) { if (w) { rose.getElement().innerHTML = roseSvg(w.w.petals); rose.setLngLat(S.c as [number, number]).addTo(m); } else rose.remove(); }
  if (rlab) {
    const e = rlab.getElement(), kx = 111_320 * Math.cos(S.c[1] * Math.PI / 180);
    e.textContent = tf('${r} m · ${m} daqiqa piyoda', { r: S.r, m: walkMin(S.r) });
    rlab.setLngLat([S.c[0] + S.r / kx, S.c[1]]);
  }
}
function slopeImage(g: TerrainGrid, r: number): { url: string; coords: [number, number][] } {
  const sl = slopeGrid(g), n = g.n, cv = document.createElement('canvas'); cv.width = cv.height = n;
  const cx = cv.getContext('2d')!, img = cx.createImageData(n, n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = -g.radius + i * g.step, y = -g.radius + j * g.step, o = ((n - 1 - j) * n + i) * 4;   // rasm — yuqoridan pastga (shimol tepada)
    if (x * x + y * y > r * r) continue;
    const c = slopeColor(sl[j * n + i]);
    img.data[o] = parseInt(c.slice(1, 3), 16); img.data[o + 1] = parseInt(c.slice(3, 5), 16); img.data[o + 2] = parseInt(c.slice(5, 7), 16); img.data[o + 3] = sl[j * n + i] <= 2 ? 70 : 215;
  }
  cx.putImageData(img, 0, 0);
  const kx = 111_320 * Math.cos(g.center[1] * Math.PI / 180), ky = 111_132, R = g.radius + g.step / 2;
  const W = g.center[0] - R / kx, E = g.center[0] + R / kx, N = g.center[1] + R / ky, So = g.center[1] - R / ky;
  return { url: cv.toDataURL(), coords: [[W, N], [E, N], [E, So], [W, So]] };
}
function roseSvg(p: number[]): string {
  const mx = Math.max(...p, 1e-6), R = 78, c = 90;
  const petals = p.map((v, i) => {
    const a0 = ((i * 22.5 - 9) - 90) * Math.PI / 180, a1 = ((i * 22.5 + 9) - 90) * Math.PI / 180, r0 = 15, r = r0 + 4 + (v / mx) * (R - r0 - 4);
    const P = (rr: number, a: number) => `${(c + rr * Math.cos(a)).toFixed(1)} ${(c + rr * Math.sin(a)).toFixed(1)}`;
    return `<path d="M${P(r0, a0)}L${P(r, a0)}A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${P(r, a1)}L${P(r0, a1)}A${r0} ${r0} 0 0 0 ${P(r0, a0)}Z"/>`;
  }).join('');
  return `<svg viewBox="0 0 180 180" width="180" height="180"><circle cx="90" cy="90" r="${R}" fill="none" stroke="#3f8f6b" stroke-opacity=".45" stroke-dasharray="2 3"/><g fill="#3f8f6b" fill-opacity=".72" stroke="#ffffff" stroke-width="1">${petals}</g><text x="90" y="9" text-anchor="middle" font-size="10" font-weight="700" fill="#3f8f6b">N</text></svg>`;
}

/* ---------------- ishga tushirish ---------------- */
/* ================= Aksonometriya («Joy-B» + «Joy-D») ================= */
type Mode = 'map' | 'axo';
let mode: Mode = location.hash.startsWith('#/axo') ? 'axo' : 'map';
type AxoMod = typeof import('./axo');
let AX: AxoMod | null = null;
let axo: InstanceType<AxoMod['Axo']> | null = null;
let axBundle: { key: string; b: ContextBundle } | null = null, axMsg = '', axSat = false, axBusy = false;
const AXST = (() => { try { return JSON.parse(localStorage.getItem('joy-axo') || 'null') as { view?: string; order?: string[]; vis?: Record<string, boolean>; ex?: boolean; gap?: number; day?: number; hour?: number } | null; } catch { return null; } })() ?? {};
function axSave(): void { if (!axo) return; try { localStorage.setItem('joy-axo', JSON.stringify({ view: axo.view, order: axo.order, vis: axo.vis, ex: axo.exploded, gap: axo.gap, day: axo.day, hour: axo.hour })); } catch { /* */ } }
function renderMode(): void {
  modeSw.replaceChildren(h('div', { class: 'seg', role: 'group', 'aria-label': tr('Koʻrinish') },
    ...([['map', 'Xarita'], ['axo', 'Aksonometriya']] as const).map(([k, n]) => h('button', { type: 'button', 'data-mode': k, 'aria-pressed': mode === k, onclick: () => setMode(k) }, tr(n)))));
  root.classList.toggle('mode-axo', mode === 'axo'); axoEl.hidden = mode !== 'axo';
}
function setMode(m: Mode): void {
  mode = m; history.replaceState(null, '', m === 'axo' ? '#/axo' : location.pathname + location.search);
  renderMode();
  if (m === 'axo') void enterAxo(); else { map?.resize(); }
}
async function enterAxo(): Promise<void> {
  renderAxo();
  if (!AX) { axMsg = tr('3D sahna yuklanmoqda…'); renderAxo(); AX = await import('./axo'); }
  if (!axo) {
    axo = new AX.Axo(axoEl);
    if (AXST.view === 'plan' || AXST.view === 'axo' || AXST.view === 'persp') axo.view = AXST.view;
    if (Array.isArray(AXST.order) && AXST.order.length === AX.AX_LAYERS.length) axo.order = AXST.order as typeof axo.order;
    if (AXST.vis) Object.assign(axo.vis, AXST.vis);
    axo.exploded = !!AXST.ex; if (AXST.gap) axo.gap = AXST.gap; if (AXST.day != null) axo.day = AXST.day; if (AXST.hour != null) axo.hour = AXST.hour;
    axo.onChange = () => renderNotes();
    (window as unknown as { joyAxo: unknown }).joyAxo = axo;
  }
  // maʼlumot: kontekst (binolar, yoʻllar, relyef) + xizmatlar, raqobatchilar, shamol
  if (D.poi.st === 'idle') run('poi', () => ctx.loadPoi(S.c));
  if (D.comp.st === 'idle') ensureComp();
  if (D.wind.st === 'idle') ensureWind();
  const R = S.r + 100, key = `${S.c.join()}|${R}`;
  if (axBundle?.key !== key && !axBusy) {
    axBusy = true; axMsg = tr('Binolar va relyef yuklanmoqda (OSM)…'); renderAxo();
    const my = seq;
    try { const b = await ctx.load(S.c, R, (m, f) => { axMsg = `${tr(m)} ${Math.round(f * 100)} %`; renderAxoMsg(); }); if (my === seq) axBundle = { key, b }; axMsg = ''; }
    catch (e) { axMsg = `${tr('Kontekst yuklanmadi')}: ${(e as Error).message}`; }
    axBusy = false;
  }
  axBuild(); renderAxo();
}
let axT0: ReturnType<typeof setTimeout> | undefined;
function axBuild(): void {
  clearTimeout(axT0);
  axT0 = setTimeout(() => {
    if (!axo || !axBundle || mode !== 'axo') return;
    const pins: { at: LngLat; label: string; col: string }[] = [];
    for (const p of D.poi.v?.pois ?? []) if (SVC_KINDS.includes(p.kind) && distM(S.c, p.at) <= S.r) pins.push({ at: p.at, label: p.name || tr(SVC_SHORT[p.kind]), col: SVC_COL[p.kind] });
    const cat = CATS.find(c => c.id === S.cat) ?? CATS[0];
    for (const c of D.comp.v ?? []) if (c.d <= S.r) pins.push({ at: c.at, label: c.name || tr(cat.name), col: '#7a5a3c' });
    const w = D.wind.v?.w;
    axo.setData({ bundle: axBundle.b, center: S.c, r: S.r, pins, petals: w?.petals ?? null, prevailing: w ? w.k * 22.5 : null, sat: axSat, dark: isDark() });
    renderNotes();
  }, 150);
}
function ensureComp(): void { const keep = S.on; if (!isOn('raqobat')) S.on = [...S.on, 'raqobat']; ensure(); S.on = keep; }
function ensureWind(): void { const keep = S.on; if (!isOn('shamol')) S.on = [...S.on, 'shamol']; ensure(); S.on = keep; }
const axMsgEl = h('div', { class: 'joy-axmsg' });
function renderAxoMsg(): void { axMsgEl.textContent = axMsg; axMsgEl.hidden = !axMsg; if (!axMsgEl.isConnected) axoEl.append(axMsgEl); }
function renderAxo(): void {
  renderAxoMsg();
  const A = AX, a = axo;
  if (!A || !a) { axL.replaceChildren(h('div', { class: 't-small' }, tr('Yuklanmoqda…'))); axT.replaceChildren(); renderNotes(); return; }
  const re = () => { a.applyLayers(); axSave(); renderAxo(); };
  axL.replaceChildren(
    h('div', { class: 't-small' }, tr('Joyshunos · diagramma')),
    h('div', { class: 'ttl' }, D.addr.v ?? `${S.c[1].toFixed(4)}, ${S.c[0].toFixed(4)}`),
    h('div', { class: 'seg vw', role: 'group', 'aria-label': tr('Koʻrinish') }, ...([['plan', 'Reja'], ['axo', 'Aksonometriya'], ['persp', '3D']] as const).map(([k, n]) => h('button', { type: 'button', 'aria-pressed': a.view === k, onclick: () => { a.setView(k); axSave(); renderAxo(); } }, tr(n)))),
    h('div', { class: 'seg', role: 'group', 'aria-label': tr('Qatlamlar') }, ...([[false, 'Yigʻilgan'], [true, 'Yoyilgan']] as const).map(([k, n]) => h('button', { type: 'button', 'aria-pressed': a.exploded === k, onclick: () => { a.setExplode(k); axSave(); renderAxo(); } }, tr(n)))),
    h('div', { class: 'row' }, h('span', { class: 't-small' }, tr('Oraliq')), h('div', { class: 'stepper' },
      h('button', { type: 'button', 'aria-label': tr('Kamaytirish'), onclick: () => { a.setExplode(a.exploded, Math.max(20, a.gap - 10)); axSave(); renderAxo(); } }, '−'), h('span', {}, String(a.gap)),
      h('button', { type: 'button', 'aria-label': tr('Oshirish'), onclick: () => { a.setExplode(a.exploded, Math.min(160, a.gap + 10)); axSave(); renderAxo(); } }, '+'))),
    h('div', { class: 'seg sm', role: 'group', 'aria-label': tr('Fon') }, ...([[false, 'Maket'], [true, 'Sunʼiy yoʻldosh']] as const).map(([k, n]) => h('button', { type: 'button', 'aria-pressed': axSat === k, onclick: () => { axSat = k; axBuild(); renderAxo(); } }, tr(n)))),
    h('div', { class: 'glabel' }, tr('Qatlamlar · pastdan yuqoriga')),
    h('ol', { class: 'joy-axlist' }, ...a.order.map((id, i) => {
      const L = A.AX_LAYERS.find(l => l.id === id)!;
      return h('li', { 'data-ax': id, class: a.vis[id] ? '' : 'off' },
        h('button', { type: 'button', class: `check${a.vis[id] ? ' on' : ''}`, role: 'checkbox', 'aria-checked': a.vis[id], 'aria-label': tr(L.name), onclick: () => { a.vis[id] = !a.vis[id]; re(); } }, svgIcon('<path d="M5 12l5 5 9-10"/>')),
        h('span', { class: 'n' }, String(i + 1).padStart(2, '0')), h('i', { style: `background:${L.color}` }), h('span', { class: 'nm' }, tr(L.name)),
        h('button', { type: 'button', class: 'mv', title: tr('Pastga'), 'aria-label': tr('Pastga'), disabled: i === 0, onclick: () => { [a.order[i - 1], a.order[i]] = [a.order[i], a.order[i - 1]]; re(); } }, '↓'),
        h('button', { type: 'button', class: 'mv', title: tr('Yuqoriga'), 'aria-label': tr('Yuqoriga'), disabled: i === a.order.length - 1, onclick: () => { [a.order[i + 1], a.order[i]] = [a.order[i], a.order[i + 1]]; re(); } }, '↑'));
    })),
    h('p', { class: 't-small' }, tr('Yoyilgan rejimda qatlamlar bir-biridan koʻtariladi; tartibini oʻqlar bilan almashtiring. Sichqoncha: chap — aylantirish, oʻng — surish, gʻildirak — masshtab.')),
  );
  // vaqt qatori
  const hr = a.hour, pct = (hr - 5) / 15 * 100;
  const rng = h('div', { class: 'range', role: 'slider', tabindex: 0, 'aria-label': tr('Soat'), 'aria-valuemin': 5, 'aria-valuemax': 20, 'aria-valuenow': hr }, h('b'), h('em', { style: `width:${pct}%` }), h('i', { style: `left:${pct}%` }));
  const setH = (v: number) => { a.setTime(a.day, Math.round(Math.min(20, Math.max(5, v)) * 4) / 4); axSave(); renderAxoTime(); };
  rng.addEventListener('pointerdown', e => {
    const box = rng.getBoundingClientRect(), mv = (ev: PointerEvent) => setH(5 + (ev.clientX - box.left) / box.width * 15);
    mv(e as PointerEvent); rng.setPointerCapture((e as PointerEvent).pointerId);
    const up = () => { rng.removeEventListener('pointermove', mv as EventListener); rng.removeEventListener('pointerup', up); };
    rng.addEventListener('pointermove', mv as EventListener); rng.addEventListener('pointerup', up);
  });
  rng.addEventListener('keydown', e => { if (e.key === 'ArrowRight') setH(a.hour + 0.25); if (e.key === 'ArrowLeft') setH(a.hour - 0.25); });
  const hh = (v: number) => `${Math.floor(v)}:${String(Math.round((v % 1) * 60)).padStart(2, '0')}`;
  axT.replaceChildren(
    h('span', { class: 't-small' }, tr('Vaqt')),
    h('div', { class: 'seg sm', role: 'group', 'aria-label': tr('Kun') }, ...A.SUN_DAYS.map(([, , n], k) => h('button', { type: 'button', 'aria-pressed': a.day === k, onclick: () => { a.setTime(k, a.hour); axSave(); renderAxo(); } }, tr(n)))),
    rng, h('b', { class: 'tm', id: 'axTm' }, hh(hr)),
    h('span', { class: 'vr' }),
    h('button', { type: 'button', class: 'btn btn-sm btn-ghost icon-btn', title: tr('Yaqinlashtirish'), 'aria-label': tr('Yaqinlashtirish'), onclick: () => a.zoomBy(1.25) }, '+'),
    h('button', { type: 'button', class: 'btn btn-sm btn-ghost icon-btn', title: tr('Uzoqlashtirish'), 'aria-label': tr('Uzoqlashtirish'), onclick: () => a.zoomBy(0.8) }, '−'),
    h('button', { type: 'button', class: 'btn btn-sm btn-ghost', title: tr('Koʻrinishni tiklash'), onclick: () => a.reset() }, tr('Markaz')),
    h('button', { type: 'button', class: 'btn btn-sm', disabled: true, title: tr('Tez orada') }, 'SVG'),
    h('button', { type: 'button', class: 'btn btn-sm', disabled: true, title: tr('Tez orada') }, tr('Chizmadonga')),
    h('button', { type: 'button', class: 'btn btn-sm btn-primary', id: 'axPng', onclick: () => void exportPng() }, 'PNG · 4K'),
  );
  function renderAxoTime(): void { if (!a) return; const p = (a.hour - 5) / 15 * 100; (rng.querySelector('em') as HTMLElement).style.width = `${p}%`; (rng.querySelector('i') as HTMLElement).style.left = `${p}%`; rng.setAttribute('aria-valuenow', String(a.hour)); const t = document.getElementById('axTm'); if (t) t.textContent = hh(a.hour); }
  renderNotes();
}
function renderNotes(): void {
  if (mode !== 'axo') return;
  const a = axo, A = AX, s = a?.sunInfo(), w = D.wind.v?.w, dayName = a && A ? tr(A.SUN_DAYS[a.day][2]) : '—', hrs = a ? a.hour : null;
  const hh = (v: number) => `${Math.floor(v)}:${String(Math.round((v % 1) * 60)).padStart(2, '0')}`;
  const row = (k: string, v: string) => h('div', { class: 'kv' }, h('span', {}, k), h('b', {}, v));
  const it = (c: string, n: string, kind = 'dot') => h('li', {}, h('i', { class: kind, style: `background:${c}` }), tr(n));
  axN.replaceChildren(
    h('div', { class: 'ttl' }, 'Archemistry Lab'),
    row(tr('Joylashuv'), `${S.c[1].toFixed(4)}, ${S.c[0].toFixed(4)}`),
    row(tr('Kun'), dayName),
    row(tr('Vaqt'), hrs != null ? `${hh(hrs)} (UTC+5)` : '—'),
    row(tr('Quyosh'), s ? (s.alt > 0 ? tf('balandlik ${a}°, azimut ${z}°', { a: fmt(s.alt), z: fmt(s.az) }) : tr('ufqdan past')) : '—'),
    row(tr('Shamol'), w ? `${tr(dir8(w.k * 22.5))} · ${fmt(w.share * 100)} %` : '—'),
    row(tr('Radius'), `${S.r} m`),
    h('div', { class: 'glabel' }, tr('Izohlar')),
    h('ul', {}, it('#e8a317', 'Quyosh yoʻli (soatlar)'), it('#e8a317', 'Quyosh', 'big'), it('#3f8f6b', 'Shamol guli'), it('#3f8f6b', 'Ustun shamol yoʻnalishi', 'bar'),
      it('#4c5bd4', 'Xizmatlar'), it('#7a5a3c', 'Raqobatchilar'), it('#c0643a', 'Masofa halqalari', 'ring'), it('#6b6965', 'Binolar soyasi', 'sq')),
    h('p', { class: 't-small' }, tr('Binolar balandligi OSM dan; yozilmaganlari qavat soni yoki maydoniga qarab taxmin qilingan.')),
  );
}
async function exportPng(): Promise<void> {
  if (!axo) return;
  const b = document.getElementById('axPng') as HTMLButtonElement | null; if (b) { b.disabled = true; b.textContent = '…'; }
  try {
    const blob = await axo.png(3840), u = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = u; a.download = `joyshunos-${S.c[1].toFixed(4)}-${S.c[0].toFixed(4)}.png`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
  } catch (e) { alert((e as Error).message); }
  if (b) { b.disabled = false; b.textContent = 'PNG · 4K'; }
}

function renderAll(): void { renderHeader(); renderLeft(); renderRight(); renderAsk(); renderBase(); renderMode(); if (mode === 'axo') renderAxo(); document.title = `${tr('Joyshunos')} · Archemistry Lab`; }
renderAll();
onLang(() => { renderAll(); paint(); document.documentElement.lang = getLang(); });
onTheme(() => { renderHeader(); restyle(); if (mode === 'axo') axBuild(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && catOpen) { catOpen = false; renderRight(); } });
void initMap().catch(e => { mapEl.append(h('div', { class: 'joy-maperr note warn' }, tr('Xarita yuklanmadi'), ': ', String((e as Error).message || e))); });
ensure();
if (mode === 'axo') void enterAxo();
