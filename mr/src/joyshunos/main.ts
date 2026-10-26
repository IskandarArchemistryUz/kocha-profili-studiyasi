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
import { h, svgIcon, fmt, toast } from '../ui/dom';
import { mrBackBtn } from '../ui/mrback';
import { logoSvg } from '../ui/logo';
import { tr, tf, getLang, setLang, onLang, LANGS, type Lang } from '../i18n';
import { mapStyle, basePrefs, setBasePrefs, PALETTES } from '../context/mapstyle';
import { initEsriKey } from '../context/esrikey';
import { geocode, type Place } from '../context/geocode';
import { bboxAround } from '../context/osm';
import { loadTerrain, TERRAIN_URL, type TerrainGrid } from '../context/tiles';
import { overpass } from '../context/load';
import { ContextManager } from '../context/manager';
import type { PoiBundle } from '../context/poi';
import { frame as geoFrame } from '../core/geo';
import { distAt, type Net } from '../core/services';
import { walkNet, reach, flow, flowAt, flowClass, noiseGrid, noiseAt, noiseShare, noiseColor, NOISE_BINS, WALK, type Reach } from './models';
import type { ContextBundle } from '../context/load';
import { loadLst, lstStats, lstTile, parseCmap, LST_CMAP, LST_DEV_BINS, devColor, lstMean, type LstGrid, type Px } from './heat';
import { SUN_DAYS_MAP, SUN_BINS, sunColor, sunPoints, sunStats, shadowOf } from './sunmap';
import { daySteps, insolation, sunPosition, localToUtcAt, type Prism } from '../core/sun';
import { placeOf, placeLabel, utcLabel, tzOffsetH } from '../core/place';
import type { XY } from '../core/geo';
import { cacheGet, cachePut, cacheDel } from '../storage/db';
import { svcDef, type Svc } from '../core/services';
import { nearestStation, type Climate } from '../core/wind';
import { windAt } from '../core/windsrc';
import { CATS, catQuery, circleRing, countPoi, dir8, distM, parseComp, slopeColor, slopeGrid, SLOPE_BINS, terrainStats, walkMin, windSummary, type Comp, type TerrainStats, type WindSum } from './analyze';
import { initStats } from '../core/stats';
import { layerIcon, GROUP_COL } from './layerIcons';
import { windFlow } from './windflow';
import { view, viewPanel, rampColor, isolines, joinSegs, VIEW, PERSONA, type LayerView } from './viewcfg';
import { contours } from './albomMap';
import { wmFile, wmRaster } from '../core/wm';
import { streetCenter, streetInit, streetLeft, streetRight, streetStrip, streetClick, streetLayers, streetPaint, streetHide, streetLegend, streetEnter, streetFinish, streetKey } from './streetui';
initStats('joy');

/* ---------------- qatlamlar ---------------- */
type Group = 'yer' | 'iqlim' | 'shahar' | 'biznes';
type LayerId = 'relyef' | 'nishab' | 'yuza' | 'issiqlik' | 'quyosh' | 'shamol' | 'shovqin' | 'xizmat' | 'piyoda' | 'oqim' | 'raqobat' | 'narx';
interface LayerDef { id: LayerId; g: Group; name: string; src: string; color: string; ready: boolean; beta?: boolean }
const LAYERS: LayerDef[] = [
  { id: 'relyef', g: 'yer', name: 'Relyef', src: 'AWS Terrain', color: '#8b7a6a', ready: true },
  { id: 'nishab', g: 'yer', name: 'Nishab', src: 'relyefdan', color: '#eaa56b', ready: true },
  { id: 'yuza', g: 'yer', name: 'Yuza tasnifi', src: 'yoʻldosh', color: '#b9cfa6', ready: false },
  { id: 'issiqlik', g: 'yer', name: 'Issiqlik oroli', src: 'MODIS', color: '#d9503f', ready: true, beta: true },
  { id: 'quyosh', g: 'iqlim', name: 'Quyosh va soya', src: 'OSM', color: '#e8a317', ready: true },
  { id: 'shamol', g: 'iqlim', name: 'Shamol', src: 'EPW · ERA5', color: '#3f8f6b', ready: true },
  { id: 'shovqin', g: 'iqlim', name: 'Shovqin', src: 'model', color: '#c2416b', ready: true, beta: true },
  { id: 'xizmat', g: 'shahar', name: 'Xizmatlar', src: 'OSM', color: '#2a9d8f', ready: true },
  { id: 'piyoda', g: 'shahar', name: 'Piyoda yetish', src: 'tarmoq', color: '#8a84d6', ready: true },
  { id: 'oqim', g: 'biznes', name: 'Odamlar oqimi', src: 'model', color: '#4c5bd4', ready: true, beta: true },
  { id: 'raqobat', g: 'biznes', name: 'Raqobatchilar', src: 'OSM', color: '#7a5a3c', ready: true },
  { id: 'narx', g: 'biznes', name: 'Uy narxlari', src: 'uybor', color: '#6b6965', ready: false },
];
const GROUPS: [Group, string][] = [['yer', 'Yer'], ['iqlim', 'Iqlim'], ['shahar', 'Shahar'], ['biznes', 'Biznes']];
const SVC_KINDS: Svc[] = ['maktab', 'mtm', 'poliklinika', 'dorixona', 'savdo', 'sport', 'bekat', 'metro'];
const SVC_COL: Record<Svc, string> = { maktab: '#2f6da8', mtm: '#e08a3c', poliklinika: '#c2416b', dorixona: '#2b7449', savdo: '#8b4a9c', sport: '#0f8a7e', mahalla: '#6b6965', bekat: '#4c5bd4', metro: '#141414' };
const SVC_SHORT: Record<Svc, string> = { maktab: 'maktab', mtm: 'bogʻcha', poliklinika: 'poliklinika', dorixona: 'dorixona', savdo: 'savdo', sport: 'sport', mahalla: 'mahalla', bekat: 'bekat', metro: 'metro' };
const RADII = [300, 500, 800, 1250];   // 1250 m ≈ 15 daqiqa piyoda
const ACC = '#c0643a';   // --svc-joy

/* ---------------- holat (brauzerda saqlanadi) ---------------- */
interface State { c: LngLat; r: number; on: LayerId[]; /** qatlam koʻrinishi: uslub, intensivlik, palitra */ v?: Record<string, LayerView>; /** faol (fokus) qatlam — xaritada toʻliq rangda, qolganlari xira */ act?: LayerId; cat: string; base: 'stil' | 'sat'; z?: number; site?: LngLat[] | null; sd?: number; sh?: number; /** tahlil turi: hudud (nuqta atrofi) yoki koʻcha (A → B) */ an?: 'hudud' | 'kocha' }
const DEF: State = { c: [69.2797, 41.3111], r: 500, on: ['relyef', 'shamol', 'xizmat', 'raqobat'], cat: 'cafe', base: 'stil' };
const S: State = (() => {
  try { const o = JSON.parse(localStorage.getItem('joy-state') || 'null'); if (o && Array.isArray(o.c)) return { ...DEF, ...o, on: (o.on as LayerId[]).filter(id => LAYERS.some(l => l.id === id && l.ready)) }; } catch { /* */ }
  return { ...DEF };
})();
const save = () => { try { localStorage.setItem('joy-state', JSON.stringify(S)); } catch { /* */ } };
const isOn = (id: LayerId) => S.on.includes(id);
/** Faol qatlam: tanlangani yoqilgan boʻlsa — u, aks holda oxirgi yoqilgani */
const actId = (): LayerId | undefined => (S.act && isOn(S.act) ? S.act : [...S.on].reverse().find(id => LAYERS.some(l => l.id === id && l.ready)));
const FOCUS_DIM = 0.3;
let viewOpen = false;
const V = (id: LayerId) => view(S.v, id);
function setView(id: LayerId, p: LayerView, live?: boolean): void {
  S.v = { ...S.v, [id]: { ...S.v?.[id], ...p } };
  heatKey = noiseKey = slopeKey = ''; isoKey = '';
  if (id === 'piyoda' && p.st) computeNet();
  paint();
  if (!live) { save(); renderRight(); }
}
let isoKey = '';
let roseK = 1;

/* ---------------- maʼlumot (har nuqta uchun) ---------------- */
type Ld<T> = { st: 'idle' | 'load' | 'ok' | 'err'; v?: T; err?: string };
const D: { addr: Ld<string>; ter: Ld<{ g: TerrainGrid; s: TerrainStats }>; poi: Ld<PoiBundle>; comp: Ld<Comp[]>; wind: Ld<{ w: WindSum; name: string; km: number; bins: number[]; far: boolean; src: 'epw' | 'era5'; pending?: boolean }>; lst: Ld<LstGrid> } =
  { addr: { st: 'idle' }, ter: { st: 'idle' }, poi: { st: 'idle' }, comp: { st: 'idle' }, wind: { st: 'idle' }, lst: { st: 'idle' } };
const ctx = new ContextManager();
/** Tarmoq modellari (piyoda, oqim, shovqin) — xizmatlar soʻrovidagi yoʻllardan, nuqta oʻzgarganda qayta */
type NetM = { pers?: string; key: string; net: Net; fr: ReturnType<typeof geoFrame>; reach?: Reach; flow?: Float32Array; noise?: { n: number; step: number; v: Float32Array; R: number }; near?: Partial<Record<Svc, number>> };
let NM: NetM | null = null, nmBusy = false;
function netModels(): NetM | null {
  const pb = D.poi.v; if (!pb) return null;
  const key = `${S.c.join()}|${S.r}`;
  if (NM?.key.startsWith(S.c.join() + '|')) { if (NM.key !== key) { NM.key = key; NM.flow = undefined; NM.noise = undefined; } }
  else { const fr = geoFrame(S.c); NM = { key, fr, net: walkNet(pb.roads.map(r => ({ cls: r.cls, pts: r.pts.map(p => fr.toLocal(p)) }))) }; }
  return NM;
}
/** Ogʻir hisoblar navbat bilan (UI qotmasin) */
function computeNet(): void {
  const m = netModels(); if (!m || nmBusy) return;
  if (m.reach && m.pers !== V('piyoda').st) m.reach = undefined;
  const job = isOn('piyoda') && !m.reach ? 'reach' : isOn('oqim') && !m.flow ? 'flow' : isOn('shovqin') && !m.noise ? 'noise' : null; if (!job) return;
  nmBusy = true;
  setTimeout(() => {
    try {
      const pb = D.poi.v!;
      if (job === 'reach') {
        const f = PERSONA[V('piyoda').st]?.v / 5 || 1; m.reach = reach(m.net, [5, 10, 15].map(x => x * f)); m.reach.mins = [5, 10, 15]; m.pers = V('piyoda').st;
        const near: Partial<Record<Svc, number>> = {};
        for (const k of ['bekat', 'metro', 'maktab', 'mtm', 'dorixona', 'savdo'] as Svc[]) { let best = Infinity; for (const p of pb.pois) if (p.kind === k) best = Math.min(best, distAt(m.net, m.reach.D, m.fr.toLocal(p.at))); if (Number.isFinite(best)) near[k] = best; }
        m.near = near;
      } else if (job === 'flow') {
        const W: Partial<Record<Svc, number>> = { metro: 14, bekat: 6, savdo: 3, maktab: 3, poliklinika: 2, mtm: 1.5, dorixona: 1.5, sport: 1.5, mahalla: 1 };
        m.flow = flow(m.net, Math.max(S.r, 500) * 1.2, pb.pois.map(p => ({ p: m.fr.toLocal(p.at), w: W[p.kind] ?? 1 })));
      } else {
        const R = S.r, roads = pb.roads.map(r => ({ cls: r.cls, pts: r.pts.map(p => m.fr.toLocal(p)) }));
        m.noise = { ...noiseGrid(roads, R, Math.max(8, R / 55)), R };
      }
    } catch (e) { console.warn('Joyshunos model', e); }
    nmBusy = false; renderRight(); paint(); computeNet();
  }, 30);
}
/* ---------- quyosh va soya (binolar — kontekst toʻplamidan, aksonometriya bilan umumiy) ---------- */
/** Sukut kun — mahalliy yoz: shimolda 22 iyun, janubiy yarimsharda 22 dekabr */
const sdIdx = () => S.sd ?? (placeOf(S.c[0], S.c[1]).south ? 2 : 1);
const sunDay = () => SUN_DAYS_MAP[sdIdx()] ?? SUN_DAYS_MAP[1];
const sunHour = () => S.sh ?? 10;
type SunM = { key: string; prisms: Prism[]; pts: XY[]; idx: number[]; n: number; step: number; hours?: Float32Array };
let SM: SunM | null = null, sunBusy = false, sunW: Worker | null = null;
function sunPrisms(): Prism[] {
  const b = axBundle?.b; if (!b) return [];
  const fr = geoFrame(S.c), lim = S.r + 350, out: Prism[] = [];
  for (const bd of b.osm.buildings) { const r = bd.rings[0]; if (!r || r.length < 3) continue; const ring = r.map(p => fr.toLocal(p)); if (Math.hypot(ring[0][0], ring[0][1]) > lim) continue; out.push({ ring, top: bd.h }); }
  return out;
}
function computeSun(): void {
  if (!isOn('quyosh') || !axBundle || sunBusy) return;
  const [m, d] = sunDay(), key = `${axBundle.key}|${S.r}|${m}-${d}`;
  if (SM?.key === key && SM.hours) return;
  if (SM?.key !== key) { const prisms = sunPrisms(), step = Math.max(6, S.r / 45); SM = { key, prisms, step, ...sunPoints(prisms, S.r, step) }; }
  const sm = SM, steps = daySteps(2026, m, d, S.c[1], S.c[0], 20), z = sm.pts.map(() => 0);
  sunBusy = true;
  const done = (hrs: Float32Array) => { sunBusy = false; if (SM !== sm) { computeSun(); return; } sm.hours = hrs; renderRight(); paint(); };
  try {
    sunW ??= new Worker(new URL('../workers/sun.worker.ts', import.meta.url), { type: 'module' });
    sunW.onmessage = e => done(e.data.hours as Float32Array);
    sunW.onerror = () => { sunW = null; setTimeout(() => done(insolation(sm.pts, z, sm.prisms, steps)), 10); };
    sunW.postMessage({ id: 1, pts: sm.pts, z, prisms: sm.prisms, steps });
  } catch { setTimeout(() => done(insolation(sm.pts, z, sm.prisms, steps)), 10); }
}
/** Binolar va relyef toʻplami (OSM) — aksonometriya va quyosh qatlami uchun bitta */
async function needCtx(): Promise<void> {
  const R = S.r + 100, key = `${S.c.join()}|${R}`;
  if (axBundle?.key === key || axBusy) return;
  axBusy = true; axMsg = tr('Binolar va relyef yuklanmoqda (OSM)…'); if (mode === 'axo') renderAxo();
  const my = seq;
  try { const b = await ctx.load(S.c, R, (m, f) => { axMsg = `${tr(m)} ${Math.round(f * 100)} %`; if (mode === 'axo') renderAxoMsg(); }); if (my === seq) axBundle = { key, b }; axMsg = ''; }
  catch (e) { axMsg = `${tr('Kontekst yuklanmadi')}: ${(e as Error).message}`; }
  axBusy = false;
  if (my !== seq) { void needCtx(); return; }
  computeSun(); renderRight(); paint();
  if (mode === 'axo') { axBuild(); renderAxo(); }
}
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
  { id: 'ren', name: 'Render', href: './render.html', color: 'var(--svc-ren)', beta: true },
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
const axoEl = h('div', { class: 'joy-axo', id: 'joyAxoView', hidden: true });
const axL = h('aside', { class: 'joy-axl panel', id: 'joyAxL' }), axN = h('aside', { class: 'joy-notes glass', id: 'joyNotes' }), axT = h('div', { class: 'joy-time glass', id: 'joyTime' });
const strip = h('section', { class: 'joy-strip glass', id: 'joyStrip', hidden: true, 'aria-label': tr('Koʻcha boʻylab') });
root.replaceChildren(mapEl, axoEl, header, left, right, ask, baseSw, legend, strip, axL, axN, axT, modeSw);
const isK = () => S.an === 'kocha';
/** Tahlil turi: Hudud · Koʻcha (chap panel tepasida) */
function anSwitch(): HTMLElement {
  return h('div', { class: 'seg joy-an', id: 'joyAn', role: 'group', 'aria-label': tr('Tahlil turi') },
    ...([['hudud', 'Hudud tahlili'], ['kocha', 'Koʻcha tahlili']] as const).map(([k, n]) => h('button', { type: 'button', 'data-an': k, 'aria-pressed': (S.an ?? 'hudud') === k, onclick: () => setAn(k) }, tr(n))));
}
function setAn(k: 'hudud' | 'kocha'): void {
  S.an = k; save(); if (k === 'kocha' && mode === 'axo') setMode('map');
  if (drawing) { drawing = null; measure = ''; }
  renderAll(); paint(); if (k === 'kocha') streetEnter(); else frame(600);
}

const ic = (d: string, cls = 'ic') => { const s = svgIcon(d); s.classList.add(cls); return s; };
function renderHeader(): void {
  header.replaceChildren(
    mrBackBtn(),
    h('a', { class: 'brand', href: '../index.html', title: tr('Bosh sahifa') }, logoSvg(20), h('span', {}, 'Archemistry Lab')),
    h('span', { class: 'vr' }),
    h('nav', { class: 'svc', 'aria-label': tr('Xizmatlar') }, ...SERVICES.map(s => h('a', { href: s.href, class: s.cur ? 'on' : '', 'aria-current': s.cur ? 'page' : null, 'data-svc': s.id }, h('i', { style: `background:${s.color}` }), tr(s.name), (s as { beta?: boolean }).beta ? h('em', { class: 'beta' }, 'beta') : null))),
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
/** Hudud joyi: mamlakat, vaqt mintaqasi va qaysi meʼyorlar qoʻllanishi — koordinatadan avtomatik */
/** Joy qaysi nuqtadan: hudud rejimida — tanlangan nuqta; koʻcha rejimida — chizilgan koʻcha, boʻlmasa xarita markazi */
function placeAt(): LngLat {
  if (isK()) { const a = streetCenter(); if (a) return a; const c = map?.getCenter(); if (c) return [c.lng, c.lat]; }
  return S.c;
}
let placeShown = '';
function placeChip(): HTMLElement {
  const at = placeAt(), p = placeOf(at[0], at[1]); placeShown = p.tz;
  return h('div', { class: 'joy-place', id: 'joyPlace', title: tr('Hudud koordinatasidan avtomatik aniqlanadi: quyosh va soya shu vaqt mintaqasida, fasllar — yarimsharga qarab') },
    h('span', { class: 'pl' }, placeLabel(p, getLang())),
    h('span', { class: `nb ${p.norms === 'UZ' ? 'uz' : 'intl'}` }, tr(p.norms === 'UZ' ? 'Meʼyorlar: Oʻzbekiston (ShNQ)' : 'Meʼyorlar: xalqaro andozalar — mahalliy meʼyor ulanmagan')));
}
function renderLeft(): void {
  if (isK()) { left.replaceChildren(anSwitch(), placeChip(), ...streetLeft()); return; }
  renderLeftH(); left.prepend(anSwitch(), placeChip());
}
function renderLeftH(): void {
  const q = h('input', { class: 'input', type: 'search', id: 'joyQ', placeholder: tr('Manzil yoki koordinata'), value: qText, 'aria-label': tr('Manzil qidirish') }) as HTMLInputElement;
  q.addEventListener('input', () => { qText = q.value; });
  q.addEventListener('keydown', e => { if (e.key === 'Enter') void search(q.value); if (e.key === 'Escape') { found = []; renderLeft(); } });
  const res = found.length ? h('div', { class: 'joy-res', role: 'listbox' }, ...found.map(p => h('button', { type: 'button', role: 'option', onclick: () => { found = []; qText = p.name; pick(p.at, true); } }, h('b', {}, p.name), h('span', {}, p.detail)))) : null;
  left.replaceChildren(...[
    h('div', { class: 'joy-search' }, ic(ICON.search), q, searching ? h('span', { class: 't-small' }, '…') : null),
    res,
    h('div', { class: 'joy-groups' }, ...GROUPS.map(([g, gn]) => h('section', { class: 'joy-g' },
      h('div', { class: 'joy-gl' }, h('i', { style: `background:${GROUP_COL[g]}` }), tr(gn)),
      ...LAYERS.filter(l => l.g === g).map(l => h('div', { class: `joy-l${l.ready ? '' : ' soon'}${isOn(l.id) ? ' on' : ''}${actId() === l.id ? ' act' : ''}`, 'data-layer': l.id, style: `--lc:${l.color}` },
        h('button', { type: 'button', class: 'lt', disabled: !l.ready, 'aria-label': tf('${n} — faol qatlam', { n: tr(l.name) }), 'aria-pressed': actId() === l.id, onclick: () => setAct(l.id) }, layerIcon(l.id)),
        h('span', { class: 'nm', onclick: l.ready ? () => setAct(l.id) : undefined }, tr(l.name)),
        h('span', { class: 'src' }, tr(l.src), l.beta ? h('em', { class: 'beta' }, 'beta') : null),
        l.ready ? sw(isOn(l.id), tr(l.name), () => toggle(l.id)) : h('em', { class: 'soon', title: tr('Manba ulanmoqda — keyingi bosqichda') }, tr('Tez orada')),
      )),
    ))),
    S.on.length > 1 ? h('div', { class: 't-small joy-fhint' }, tr('Faol qatlam rangda, qolganlari xira. Belgini bosib almashtiring.')) : null,
    h('div', { class: 'joy-tools' },
      h('button', { type: 'button', class: 'btn', id: 'tRuler', 'aria-pressed': drawing?.kind === 'ruler', title: tr('Masofani oʻlchash: nuqtalarni bosing, ikki marta bosish yoki Enter — tugatish'), onclick: () => startDraw('ruler') }, ic(ICON.ruler), tr('Lineyka')),
      h('button', { type: 'button', class: 'btn', id: 'tArea', 'aria-pressed': drawing?.kind === 'area', title: tr('Maydonni oʻlchash: burchaklarni bosing, ikki marta bosish yoki Enter — tugatish'), onclick: () => startDraw('area') }, ic(ICON.area), tr('Maydon')),
      h('button', { type: 'button', class: 'btn', disabled: true, title: `${tr('Kesim')} — ${tr('Tez orada')}` }, ic(ICON.cut), tr('Kesim'))),
    h('div', { class: 'joy-site' },
      h('div', { class: 'glabel' }, tr('Uchastka (loyiha hududi)')),
      S.site ? h('div', { class: 't-small' }, tf('${a} ga · perimetr ${p} m — xaritada va aksonometriyaning har qatlamida', { a: fmt(ringArea(S.site) / 10000, 2), p: fmt(ringPerim(S.site)) })) : h('div', { class: 't-small' }, tr('Chizilmagan. Chizing yoki 1-qadamdagi hududni oling.')),
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn btn-sm', id: 'tSite', 'aria-pressed': drawing?.kind === 'site', onclick: () => startDraw('site') }, tr(S.site ? 'Qayta chizish' : 'Chizish')),
        kpsSite() ? h('button', { type: 'button', class: 'btn btn-sm', id: 'tSiteK', title: tr('Joyshunos va Master rejaning 1-qadamida belgilangan hudud'), onclick: () => { const r = kpsSite(); if (r) setSite(r, false); } }, tr('1-qadamdan')) : null,
        S.site ? h('button', { type: 'button', class: 'btn btn-sm btn-ghost', id: 'tSiteX', onclick: () => setSite(null, false) }, tr('Tozalash')) : null)),
    measure ? h('div', { class: 'note', id: 'joyMeasure' }, measure) : null,
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
function setAct(id: LayerId): void {
  if (!isOn(id)) { toggle(id); return; }
  S.act = id; save(); renderLeft(); renderRight(); paint();
}
function toggle(id: LayerId): void {
  if (isOn(id)) { S.on = S.on.filter(x => x !== id); if (S.act === id) S.act = undefined; } else { S.on = [...S.on, id]; S.act = id; }
  save();
  renderLeft(); renderRight(); paint();
  if (isOn(id)) ensure();
  computeNet();
}

/* ---------------- chizish: lineyka, maydon, uchastka ---------------- */
type DrawKind = 'ruler' | 'area' | 'site';
let drawing: { kind: DrawKind; pts: LngLat[] } | null = null, measure = '';
const kxy = (c: LngLat) => [111_320 * Math.cos(c[1] * Math.PI / 180), 111_132] as const;
function ringArea(r: LngLat[]): number { const [kx, ky] = kxy(r[0]); let a = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += (p[0] * kx) * (q[1] * ky) - (q[0] * kx) * (p[1] * ky); } return Math.abs(a / 2); }
function lineLen(r: LngLat[]): number { let L = 0; for (let i = 1; i < r.length; i++) L += distM(r[i - 1], r[i]); return L; }
function ringPerim(r: LngLat[]): number { return lineLen([...r, r[0]]); }
/** Ekotizimdagi umumiy hudud («kps_site»: ring — [kenglik, uzunlik]) */
function kpsSite(): LngLat[] | null { try { const o = JSON.parse(localStorage.getItem('kps_site') || 'null'); if (o && Array.isArray(o.ring) && o.ring.length > 2) return o.ring.map((p: number[]) => [+p[1], +p[0]] as LngLat); } catch { /* */ } return null; }
function setSite(r: LngLat[] | null, write = true): void {
  S.site = r; save();
  if (write) try { if (r) localStorage.setItem('kps_site', JSON.stringify({ t: Date.now(), mode: 'poly', ring: r.map(p => [+p[1].toFixed(6), +p[0].toFixed(6)]), center: null, r: null, areaM2: Math.round(ringArea(r)), src: 'joyshunos' })); } catch { /* */ }
  renderLeft(); renderRight(); paintDraw(); if (mode === 'axo') axBuild();
}
function startDraw(k: DrawKind): void {
  drawing = drawing?.kind === k ? null : { kind: k, pts: [] }; measure = drawing ? tr(k === 'ruler' ? 'Nuqtalarni bosing; ikki marta bosish yoki Enter — tugatish, Esc — bekor.' : 'Burchaklarni bosing; ikki marta bosish, Enter yoki birinchi nuqta — yopish, Esc — bekor.') : '';
  if (map) { if (drawing) map.doubleClickZoom.disable(); else map.doubleClickZoom.enable(); map.getCanvas().style.cursor = drawing ? 'crosshair' : ''; }
  renderLeft(); paintDraw();
}
function finishDraw(): void {
  const d = drawing; if (!d) return;
  if (d.kind === 'ruler') { measure = d.pts.length > 1 ? tf('Uzunlik: ${l} m (${n} nuqta)', { l: fmt(lineLen(d.pts)), n: d.pts.length }) : ''; }
  else if (d.pts.length > 2) {
    if (d.kind === 'area') measure = tf('Maydon: ${a} m² (${h} ga) · perimetr ${p} m', { a: fmt(ringArea(d.pts)), h: fmt(ringArea(d.pts) / 10000, 2), p: fmt(ringPerim(d.pts)) });
    else { measure = ''; setSite(d.pts); }
  }
  lastShape = d.kind === 'site' ? null : { kind: d.kind, pts: d.pts };
  drawing = null; if (map) { map.doubleClickZoom.enable(); map.getCanvas().style.cursor = ''; }
  renderLeft(); paintDraw();
}
let lastShape: { kind: DrawKind; pts: LngLat[] } | null = null;
function drawClick(c: LngLat, px: { x: number; y: number }): void {
  const d = drawing!; 
  if (d.kind !== 'ruler' && d.pts.length > 2 && map) { const f = map.project(d.pts[0] as [number, number]); if (Math.hypot(f.x - px.x, f.y - px.y) < 10) { finishDraw(); return; } }
  d.pts.push(c);
  measure = d.kind === 'ruler' ? tf('Uzunlik: ${l} m', { l: fmt(lineLen(d.pts)) }) : d.pts.length > 2 ? tf('Maydon: ${a} m² (${h} ga)', { a: fmt(ringArea(d.pts)), h: fmt(ringArea(d.pts) / 10000, 2) }) : tr('Yana burchak bosing…');
  renderLeft(); paintDraw();
}
function paintDraw(): void {
  const m = map; if (!m || !m.getSource('joy-draw')) return;
  const feats: unknown[] = [], sh = drawing ?? lastShape;
  if (sh && sh.pts.length) {
    const closed = sh.kind !== 'ruler' && (!drawing || sh.pts.length > 2);
    feats.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: closed && !drawing ? [...sh.pts, sh.pts[0]] : sh.pts } });
    if (sh.kind !== 'ruler' && sh.pts.length > 2) feats.push({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[...sh.pts, sh.pts[0]]] } });
    sh.pts.forEach(p => feats.push(pt(p, { v: 1 })));
  }
  (m.getSource('joy-draw') as GeoJSONSource).setData(fc(feats) as never);
  (m.getSource('joy-site') as GeoJSONSource).setData(fc(S.site ? [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[...S.site, S.site[0]]] } }] : []) as never);
}

/* ---------------- oʻng ustun: joy pasporti ---------------- */
let catOpen = false;
function card(l: LayerDef, srcChip: string, big: string | Node, sub: (string | Node)[], extra?: Node | null, st?: Ld<unknown>): HTMLElement {
  const body = !st || st.st === 'ok'
    ? [h('div', { class: 'big' }, big), h('div', { class: 'sub' }, ...sub)]
    : st.st === 'err' ? [h('div', { class: 'sub err' }, tr('Yuklanmadi'), ': ', st.err ?? ''), h('button', { type: 'button', class: 'btn btn-sm', onclick: () => { retry(l.id); } }, tr('Qayta urinish'))]
      : [h('div', { class: 'big skel' }, ' '), h('div', { class: 'sub' }, tr('Yuklanmoqda…'))];
  return h('article', { class: 'joy-card', 'data-card': l.id, style: `--lc:${l.color}` },
    h('header', {}, h('button', { type: 'button', class: 'lt', style: `--lc:${l.color}`, 'aria-label': tf('${n} — faol qatlam', { n: tr(l.name) }), onclick: () => setAct(l.id) }, layerIcon(l.id)), h('span', { class: 'nm' }, tr(l.name)), extra ?? null, l.beta ? h('span', { class: 'chip beta' }, 'beta') : null, h('span', { class: 'chip' }, srcChip)),
    ...body);
}
function renderRight(): void {
  if (isK()) { right.replaceChildren(...streetRight()); streetStrip(strip); return; }
  strip.hidden = true;
  renderRightH();
}
function renderRightH(): void {
  const L = (id: LayerId) => LAYERS.find(l => l.id === id)!;
  const cards: HTMLElement[] = [];
  const addr = D.addr.st === 'ok' ? D.addr.v! : D.addr.st === 'load' ? tr('Manzil aniqlanmoqda…') : `${S.c[1].toFixed(4)}, ${S.c[0].toFixed(4)}`;
  cards.push(h('article', { class: 'joy-card head' },
    h('div', { class: 't-small' }, tr('Joy pasporti')),
    h('h1', { class: 'ttl' }, addr, h('span', { class: 'r' }, ` · ${S.r} m`)),
    h('div', { class: 'meta' },
      h('span', { class: 'chip mono' }, `${S.c[1].toFixed(5)}, ${S.c[0].toFixed(5)}`),
      h('div', { class: 'seg sm', role: 'group', 'aria-label': tr('Radius') }, ...RADII.map(r => h('button', { type: 'button', 'aria-pressed': r === S.r, onclick: () => setRadius(r) }, `${r} m`)))),
    h('div', { class: 't-small' }, tf('${r} m — taxminan ${m} daqiqa piyoda (toʻgʻri chiziqda). Xaritani bosib boshqa nuqtani tanlang.', { r: S.r, m: walkMin(S.r) })),
    S.site ? h('div', { class: 'chip site' }, tf('Uchastka: ${a} ga', { a: fmt(ringArea(S.site) / 10000, 2) })) : null,
    h('div', { class: 'joy-rep' },
      h('span', { class: 't-small' }, tr('Hisobot (A3)')),
      h('button', { type: 'button', class: 'btn btn-sm', id: 'repPdf', disabled: repBusy, onclick: () => void report('pdf') }, tr('PDF')),
      h('button', { type: 'button', class: 'btn btn-sm', id: 'repSvg', disabled: repBusy, title: tr('Illustrator uchun qatlamli SVG'), onclick: () => void report('svg') }, 'SVG'),
      h('button', { type: 'button', class: 'btn btn-sm btn-primary', id: 'repChz', disabled: repBusy, onclick: () => void report('chz') }, tr('Chizmadonga'))),
    h('button', { type: 'button', class: 'btn btn-block', id: 'albOpen', disabled: repBusy, onclick: () => albomDialog() }, ic(ICON.ext), tr('Albom, hisobot va plakat'))));

  if (isOn('relyef') || isOn('nishab')) {
    const t = D.ter.v?.s;
    cards.push(card(L('relyef'), 'AWS Terrain', t ? `${fmt(t.min)}–${fmt(t.max)} m` : '—',
      t ? [tf('Nishab oʻrtacha ${a} %, keskin joylarda (90-persentil) ${b} %', { a: fmt(t.slopeMean, 1), b: fmt(t.slopeP90, 1) }), t.downhill != null ? ` · ${tf('pasayish — ${d}ga', { d: tr(dir8(t.downhill)) })}` : ` · ${tr('deyarli tekis')}`] : [],
      null, D.ter));
  }
  if (isOn('shamol')) {
    const w0 = D.wind.v, w = windV();
    cards.push(card(L('shamol'), w?.src === 'era5' ? 'ERA5' : 'EPW', w ? tr(dir8(w.w.k * 22.5)) : '—',
      w0?.pending ? [h('span', { class: 'src', id: 'windEra' }, tr('ERA5 maʼlumoti tayyorlanmoqda (Copernicus navbati) — bir necha daqiqada oʻzi yangilanadi.'))]
      : w0?.far ? [h('span', { class: 'err', id: 'windFar' }, tf('Eng yaqin iqlim stansiyasi (${n}) ${k} km uzoqda — bu hudud uchun shamol maʼlumoti ishonchli emas.', { n: w0.name, k: fmt(w0.km) })), h('br'), h('span', { class: 'src' }, tr('Global shamol maʼlumoti (ERA5) hozir olinmadi.'))]
      : w ? [tf('Ustun yoʻnalish (qayerdan) — vaqtning ${p} %; oʻrtacha ${v} m/s; tinch ${c} %.', { p: fmt(w.w.share * 100), v: fmt(w.w.mean, 1), c: fmt(w.w.calm * 100) }), h('br'),
        h('span', { class: 'src', id: 'windSrc' }, w.src === 'era5' ? tf('ERA5 (Copernicus) · 0,25° katak, ${k} km · 2015–2024', { k: fmt(w.km, 1) }) : tf('Stansiya: ${n}, ${k} km · TMYx 2011–2025', { n: w.name, k: fmt(w.km, 1) }))] : [],
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
  const busy: Ld<unknown> = D.poi.st !== 'ok' ? D.poi : { st: 'load' };
  if (isOn('piyoda')) {
    const r = NM?.reach, nr = NM?.near ?? {}, ha = (m2: number) => fmt(m2 / 10000, 1);
    cards.push(card(L('piyoda'), tr('OSM tarmoq'), r ? tf('${h} ga · 15 daqiqa', { h: ha(r.area[2]) }) : '—',
      r ? [tf('5 daqiqa: ${a} ga · 10 daqiqa: ${b} ga · 15 daqiqa: ${c} ga (yoʻllardan 40 m)', { a: ha(r.area[0]), b: ha(r.area[1]), c: ha(r.area[2]) }), h('br'),
        r.directness != null ? tf('Tarmoq toʻgʻriligi: ${d} (1 — toʻgʻri chiziq; 0,7 dan past — aylanma yoʻllar)', { d: fmt(r.directness, 2) }) : '',
        h('ul', { class: 'joy-norm' }, ...(['bekat', 'metro', 'maktab', 'mtm', 'dorixona'] as Svc[]).map(k => { const d = nr[k], def = svcDef(k); return h('li', { class: d != null && d <= def.r ? 'ok' : 'warn' }, h('span', {}, tr(def.name)), h('b', {}, d == null ? tr('yoʻq') : tf('${m} m · ${t} daq', { m: fmt(d), t: Math.round(d / (WALK * (PERSONA[V('piyoda').st]?.v / 5 || 1))) })), h('em', {}, `≤ ${def.r} m`)); })),
        h('span', { class: 'src' }, tr('Masofa — piyoda tarmogʻi boʻylab (Dijkstra, 5 km/soat). Meʼyor: ShNQ 2.07.01-23, 38-jadval; bekat — 382-band.'), V('piyoda').st !== 'yosh' ? ` ${tf('Vaqt — ${n} uchun (tezlik taxminiy).', { n: tr(PERSONA[V('piyoda').st].note) })}` : '')] : [],
      null, r ? undefined : busy));
  }
  if (isOn('oqim')) {
    const F = NM?.flow, v = F && NM ? flowAt(NM.net, F) : null;
    cards.push(card(L('oqim'), tr('model'), v != null ? tr(flowClass(v)) : '—',
      v != null ? [tf('Oqim indeksi ${v} (0–1, hududdagi 95-persentilga nisbatan).', { v: fmt(v, 2) }), h('br'), h('span', { class: 'src' }, tr('Model: piyoda tarmogʻida 800 m gacha eng qisqa yoʻllar; manzillar vazni — bekatlar, metro, savdo va xizmatlar. Haqiqiy sanoq emas — haftaning 2 kunida 15 daqiqalik sanoq bilan tasdiqlang.'))] : [],
      null, v != null ? undefined : busy));
  }
  if (isOn('shovqin')) {
    const g = NM?.noise;
    cards.push(card(L('shovqin'), tr('model'), g ? `≈ ${fmt(noiseAt(g))} dB(A)` : '—',
      g ? [tf('Lden, markazda. Doira ichida: ≥ 65 dB — ${a} %, ≥ 53 dB (JSST tavsiyasi) — ${b} %.', { a: fmt(noiseShare(g, 65) * 100), b: fmt(noiseShare(g, 53) * 100) }), h('br'),
        h('span', { class: 'src' }, tr('Model: yoʻl toifasidan manba darajasi, chiziqli tarqalish (3 dB / ikki baravar). Binolar toʻsiqligi, tezlik va oqim hisobga olinmagan. JSST: Environmental Noise Guidelines for the European Region (2018), yoʻl transporti Lden 53 dB.'))] : [],
      null, g ? undefined : busy));
  }
  if (isOn('issiqlik')) {
    const g = D.lst.v, st = g ? lstStats(g, S.r) : null, sg = (v: number) => `${v >= 0 ? '+' : '−'}${fmt(Math.abs(v), 1)}`;
    cards.push(card(L('issiqlik'), 'NASA GIBS', st && !Number.isNaN(st.inside) ? `≈ ${fmt(st.inside, 1)} °C` : '—',
      g && st ? [tf('Yer yuzasi harorati (LST), ${y} yil iyul–avgust, kunduzi ≈ 10:30 — ${k} ta 8 kunlik kompozit oʻrtachasi.', { y: g.year, k: g.used }), h('br'),
        Number.isNaN(st.delta) ? '' : tf('Atrofdagi 6 km oʻrtachasidan farq: ${d} °C', { d: sg(st.delta) }), h('br'),
        h('span', { class: 'src' }, tr('NASA GIBS · MODIS Terra MOD11A2 (1 km). Havo harorati emas — sirt harorati; 1 km piksel — mahalla darajasi, alohida bino emas.'))] : [],
      null, D.lst));
  }
  if (isOn('quyosh')) {
    const [m, d, dn] = sunDay(), hr = sunHour(), sp = sunPosition(localToUtcAt(2026, m, d, hr, S.c[1], S.c[0]), S.c[1], S.c[0]);
    const hs = SM?.hours ? sunStats(SM.pts, SM.hours) : null, hh = (v: number) => `${String(Math.floor(v)).padStart(2, '0')}:${v % 1 ? '30' : '00'}`;
    const busySun: Ld<unknown> = axMsg && !axBusy && !axBundle ? { st: 'err', err: axMsg } : { st: 'load' };
    const el = card(L('quyosh'), tr('OSM binolar'), hs ? tf('${h} soat', { h: fmt(hs.at, 1) }) : '—',
      hs ? [tf('Markazdagi nuqtada quyosh — ${d} kuni. Doira ichidagi ochiq hudud: oʻrtacha ${m} soat; ≥ 3 soat — ${a} %.', { d: tr(dn), m: fmt(hs.mean, 1), a: fmt(hs.ge3 * 100) }), h('br'),
        m === 3 ? h('span', {}, tf('SanQvaN 0331-16, 8.3-band (22.03–22.09: hududda ≥ 0,5–1 soat): ≥ 1 soat — ${a} %, ≥ 0,5 soat — ${b} %.', { a: fmt(hs.ge1 * 100), b: fmt(hs.ge05 * 100) }), h('br')) :'',
        sp.alt > 0 ? tf('Soat ${t}: quyosh balandligi ${a}°, azimut ${z}° — soyalar xaritada.', { t: hh(hr), a: fmt(sp.alt), z: fmt(sp.az) }) : tf('Soat ${t}: quyosh ufqdan past.', { t: hh(hr) }), h('br'),
        h('span', { class: 'src' }, tr('Binolar — OSM (balandlik: height / qavatlar / taxmin). Relyef va daraxtlar hisobga olinmagan. Hisob Master rejadagi insolyatsiya bilan bir xil (20 daqiqa qadam).'))] : [],
      null, hs ? undefined : busySun);
    el.querySelector('header')!.after(h('div', { class: 'joy-sunctl' },
      h('div', { class: 'seg sm', role: 'group', 'aria-label': tr('Kun') }, ...SUN_DAYS_MAP.map(([, , n], i) => h('button', { type: 'button', 'aria-pressed': sdIdx() === i, onclick: () => { S.sd = i; save(); renderRight(); paint(); computeSun(); } }, tr(n)))),
      h('div', { class: 'joy-step', role: 'group', 'aria-label': tr('Soat') },
        h('button', { type: 'button', class: 'btn btn-sm', 'aria-label': tr('Oldingi soat'), onclick: () => { S.sh = Math.max(5, hr - 0.5); save(); renderRight(); paint(); } }, '‹'),
        h('b', { class: 'mono', id: 'sunHour' }, hh(hr)),
        h('button', { type: 'button', class: 'btn btn-sm', 'aria-label': tr('Keyingi soat'), onclick: () => { S.sh = Math.min(20, hr + 0.5); save(); renderRight(); paint(); } }, '›'))));
    cards.push(el);
  }
  // faol qatlam kartasi — pasportdan keyin birinchi, kattaroq
  const a = actId(), ai = cards.findIndex(c => c.dataset.card === (a === 'nishab' ? 'relyef' : a));
  if (ai > 1) cards.splice(1, 0, cards.splice(ai, 1)[0]);
  if (ai > 0) { cards[1].classList.add('focus'); const vp = a ? viewPanel(a, view(S.v, a), viewOpen, { toggle: () => { viewOpen = !viewOpen; renderRight(); }, set: (pp, live) => setView(a, pp, live) }) : null; if (vp) cards[1].querySelector('header')!.after(vp); }
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
  if (id === 'issiqlik') D.lst = { st: 'idle' };
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
  const P = PALETTES[palKey()];
  baseSw.replaceChildren(h('div', { class: 'seg sm', role: 'group', 'aria-label': tr('Fon xarita') },
    ...([['stil', 'Stil'], ['sat', 'Sunʼiy yoʻldosh']] as const).map(([k, n]) => h('button', { type: 'button', 'aria-pressed': S.base === k, onclick: () => { S.base = k; save(); renderBase(); restyle(); } }, tr(n)))),
    h('button', { type: 'button', class: 'joy-palbtn', id: 'palBtn', 'aria-expanded': palOpen, title: tr('Xarita uslubi'), onclick: () => { palOpen = !palOpen; renderBase(); } }, h('i', { style: `background:linear-gradient(135deg, ${P.bg} 0 45%, ${P.bld} 45% 70%, ${P.water} 70%)` }), tr(P.n), ic(ICON.chev)),
    ...(palOpen ? [palMenu(() => { palOpen = false; S.base = 'stil'; save(); renderBase(); restyle(); })] : []));
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
  D.addr = { st: 'idle' }; D.ter = { st: 'idle' }; D.poi = { st: 'idle' }; D.comp = { st: 'idle' }; D.wind = { st: 'idle' }; D.lst = { st: 'idle' }; NM = null; SM = null;
  renderLeft(); renderRight(); paint();
  if (fly) frame(900);
  ensure();
  if (mode === 'axo') void enterAxo();
}
function run<T>(k: keyof typeof D, job: () => Promise<T>): void {
  const my = seq; (D[k] as Ld<T>) = { st: 'load' };
  job().then(v => { if (my !== seq) return; (D[k] as Ld<T>) = { st: 'ok', v }; if (k === 'poi') computeNet(); renderRight(); paint(); if (mode === 'axo' && k !== 'ter') { if (k === 'addr') renderAxo(); else axBuild(); } })
    .catch(e => { if (my !== seq) return; (D[k] as Ld<T>) = { st: 'err', err: (e as Error).message || String(e) }; renderRight(); });
}
let cmap: Promise<Map<number, number>> | null = null;
async function getTile(date: string, z: number, x: number, y: number): Promise<Px | null> {
  const r = await fetch(lstTile(date, z, x, y)); if (!r.ok) return null;
  const bm = await createImageBitmap(await r.blob()), cv = document.createElement('canvas'); cv.width = bm.width; cv.height = bm.height;
  const g = cv.getContext('2d', { willReadFrequently: true })!; g.drawImage(bm, 0, 0);
  return { w: bm.width, h: bm.height, data: g.getImageData(0, 0, bm.width, bm.height).data };
}
async function lstJob(c: LngLat): Promise<LstGrid> {
  cmap ??= fetch(LST_CMAP).then(r => { if (!r.ok) throw new Error(`GIBS ${r.status}`); return r.text(); }).then(parseCmap).catch(e => { cmap = null; throw e; });
  const g = await loadLst(c, 6000, 250, await cmap, getTile);
  if (!g.used) throw new Error(tr('sunʼiy yoʻldosh maʼlumoti yoʻq'));
  return g;
}
function ensure(): void {
  const c = S.c, r = S.r;
  if (D.addr.st === 'idle') run('addr', () => reverse(c));
  if ((isOn('relyef') || isOn('nishab')) && D.ter.st === 'idle') run('ter', async () => {
    const R = Math.max(r, 500) + 100, g = await loadTerrain(c, R, bboxAround(c, R * 1.1), fetch.bind(globalThis), 10);
    if (!g) throw new Error(tr('relyef plitkalari ochilmadi')); return { g, s: terrainStats(g, r) };
  });
  if ((isOn('xizmat') || isOn('piyoda') || isOn('oqim') || isOn('shovqin')) && D.poi.st === 'idle') run('poi', () => ctx.loadPoi(c));
  computeNet();
  if (isOn('issiqlik') && D.lst.st === 'idle') run('lst', () => lstJob(c));
  if (isOn('quyosh')) { if (axBundle?.key === `${c.join()}|${r + 100}`) computeSun(); else void needCtx(); }
  if (isOn('raqobat') && D.comp.st === 'idle') run('comp', async () => {
    const cat = CATS.find(x => x.id === S.cat) ?? CATS[0], key = `joy-comp:${cat.id}:${c[0].toFixed(4)},${c[1].toFixed(4)}:${r}`;
    const hit = memo.get(key); if (hit) return hit;
    const j = await overpass(catQuery(cat, c, Math.max(r * 2, 1000)), fetch.bind(globalThis), () => {});
    const v = parseComp(j as never, c); memo.set(key, v); return v;
  });
  if (isOn('shamol') && D.wind.st === 'idle') run('wind', async () => {
    if (!climate) { const res = await fetch('./climate/uz_climate.json'); if (!res.ok) throw new Error(`${res.status}`); climate = await res.json() as Climate; }
    // 34-band: yaqin EPW stansiyasi boʻlmasa — ERA5 (server orqali); navbatda boʻlsa 20 s dan keyin qayta
    const a = await windAt(climate, c[0], c[1]);
    if (a.kind === 'ok') return { w: windSummary(a.s), name: a.src === 'era5' ? a.s.name : a.s.name.replace(/\./g, ' '), km: a.km, bins: climate.bins, far: false, src: a.src };
    if (a.kind === 'pending') { const k0 = c.join(); setTimeout(() => { if (S.c.join() === k0 && D.wind.v?.pending) { D.wind = { st: 'idle' }; ensure(); } }, 20_000); }
    const { s, km } = nearestStation(climate, c[0], c[1]);
    return { w: windSummary(s), name: s.name.replace(/\./g, ' '), km, bins: climate.bins, far: true, src: 'epw' as const, pending: a.kind === 'pending' };
  });
}
/** Shamol — faqat yaqin stansiya boʻlsa (aks holda xaritada ham, aksonometriyada ham koʻrsatilmaydi) */
const windV = () => (D.wind.v && !D.wind.v.far ? D.wind.v : undefined);
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
let MK: ((el: HTMLElement) => Marker) | null = null;
streetInit({
  map: () => map,
  rerender: () => { renderLeft(); renderRight(); if (isK()) { const lg = streetLegend(); legend.replaceChildren(...lg); legend.hidden = !lg.length; } },
  fit: b => { try { map?.fitBounds(b, { padding: { top: 90, bottom: (strip.hidden ? 0 : strip.offsetHeight) + 40, left: left.offsetWidth + 40, right: right.offsetWidth + 40 }, duration: 800, maxZoom: 17.5 }); } catch { /* tor oyna */ } },
  marker: el => MK?.(el) ?? null,
});
const fc = (features: unknown[]) => ({ type: 'FeatureCollection', features });
const pt = (c: LngLat, p: Record<string, unknown> = {}) => ({ type: 'Feature', properties: p, geometry: { type: 'Point', coordinates: c } });
/** Palitra: foydalanuvchi tanlovi; tungi rejimda sukut boʻyicha «Grafit» */
function palKey(): string { const p = basePrefs().pal; return isDark() && p === 'arch' ? 'dark' : p; }
function style(): unknown { return mapStyle(S.base, palKey(), basePrefs().labels); }
let palOpen = false;
function palMenu(onPick: () => void): HTMLElement {
  const cur = palKey();
  return h('div', { class: 'joy-pal', role: 'listbox', 'aria-label': tr('Xarita uslubi') }, ...Object.entries(PALETTES).map(([k, p]) => h('button', { type: 'button', role: 'option', 'aria-selected': k === cur, 'data-pal': k, title: tr(p.n), onclick: () => { setBasePrefs({ pal: k }); onPick(); } },
    h('i', { style: `background:linear-gradient(135deg, ${p.bg} 0 45%, ${p.bld} 45% 70%, ${p.water} 70%)` }), tr(p.n))));
}
async function initMap(): Promise<void> {
  await initEsriKey();   // sunʼiy yoʻldosh fonining kaliti (boʻlmasa — kalitsiz zaxira)
  const ml = (await import('maplibre-gl')).default;
  await import('maplibre-gl/dist/maplibre-gl.css');
  map = new ml.Map({ container: mapEl, style: style() as never, center: S.c as [number, number], zoom: S.z ?? 15, attributionControl: { compact: true }, maxPitch: 0, dragRotate: false } as never);
  map.addControl(new ml.NavigationControl({ showCompass: false }), 'bottom-right');
  let framed = false;
  map.on('style.load', () => { addOverlays(); paint(); if (!framed) { framed = true; frame(0); } });
  // fon plitkalari ochilmasa (tarmoq/xizmat ishlamasa) — oddiy fon bilan davom etiladi: qatlamlar va hisoblar baribir koʻrinadi
  setTimeout(() => { if (map && !map.getSource('joy-ring')) map.setStyle({ version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': isDark() ? '#1c1e21' : '#f3f1ec' } }] } as never); }, 7000);
  map.on('click', e => { if (catOpen) { catOpen = false; renderRight(); } const c: LngLat = [+e.lngLat.lng.toFixed(6), +e.lngLat.lat.toFixed(6)]; if (drawing) drawClick(c, e.point); else if (isK()) streetClick(c); else pick(c); });
  map.on('dblclick', e => { if (drawing) { e.preventDefault(); finishDraw(); } else if (isK()) { e.preventDefault(); streetFinish(); } });
  map.on('moveend', () => {
    S.z = +map!.getZoom().toFixed(2); save();
    // koʻcha rejimida koʻcha chizilmagan boʻlsa — joy belgisi xarita markaziga ergashadi
    if (isK()) { const at = placeAt(), tz = placeOf(at[0], at[1]).tz; if (tz !== placeShown) { const old = document.getElementById('joyPlace'); old?.replaceWith(placeChip()); } }
  });
  const roseEl = h('div', { class: 'joy-rose', 'aria-hidden': 'true' }), labEl = h('div', { class: 'joy-rlab' });
  MK = el => new ml.Marker({ element: el });
  rose = new ml.Marker({ element: roseEl }).setLngLat(S.c as [number, number]);
  rlab = new ml.Marker({ element: labEl, anchor: 'left' }).setLngLat(S.c as [number, number]).addTo(map);
  (window as unknown as { joyMap: MLMap }).joyMap = map;
  // tarmoq xatolari (plitka, shrift) — konsolga ogohlantirish; xarita ishlashda davom etadi
  map.on('error', e => { console.warn('MapLibre:', (e as { error?: Error }).error?.message ?? e); });
}
/** Uslub almashtirish: diff:false — aks holda MapLibre «style.load» chiqarmaydi va oʻz qatlamlarimiz (koʻcha chizigʻi, halqa, …) yoʻqolib qoladi */
function restyle(): void { map?.setStyle(style() as never, { diff: false }); }
function addOverlays(): void {
  if (!map) return;
  const m = map, before = m.getLayer('bld') ? 'bld' : undefined;
  m.addSource('joy-dem', { type: 'raster-dem', tiles: [TERRAIN_URL(0, 0, 0).replace('/0/0/0.png', '/{z}/{x}/{y}.png')], encoding: 'terrarium', tileSize: 256, maxzoom: 15 } as never);
  m.addLayer({ id: 'joy-hs', type: 'hillshade', source: 'joy-dem', layout: { visibility: 'none' }, paint: { 'hillshade-exaggeration': 0.55, 'hillshade-shadow-color': isDark() ? '#000000' : '#6b5a48', 'hillshade-highlight-color': '#ffffff' } } as never, before);
  m.addSource('joy-slope', { type: 'image', url: blankPng(), coordinates: [[0, 1], [1, 1], [1, 0], [0, 0]] } as never);
  m.addLayer({ id: 'joy-slope', type: 'raster', source: 'joy-slope', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.8, 'raster-fade-duration': 0 } } as never, before);
  for (const id of ['joy-ring', 'joy-poi', 'joy-comp', 'joy-c', 'joy-draw', 'joy-site', 'joy-walk', 'joy-flow']) m.addSource(id, { type: 'geojson', data: fc([]) as never });
  for (const id of ['joy-heat', 'joy-sun', 'joy-shadow']) m.addSource(id, { type: 'image', url: blankPng(), coordinates: [[0, 1], [1, 1], [1, 0], [0, 0]] } as never);
  m.addLayer({ id: 'joy-heat', type: 'raster', source: 'joy-heat', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.55, 'raster-fade-duration': 0, 'raster-resampling': 'nearest' } } as never, before);
  m.addLayer({ id: 'joy-sun', type: 'raster', source: 'joy-sun', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.75, 'raster-fade-duration': 0 } } as never, before);
  m.addLayer({ id: 'joy-shadow', type: 'raster', source: 'joy-shadow', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.4, 'raster-fade-duration': 0 } } as never, before);
  heatKey = sunKey = shadowKey = '';
  m.addSource('joy-noise', { type: 'image', url: blankPng(), coordinates: [[0, 1], [1, 1], [1, 0], [0, 0]] } as never);
  m.addLayer({ id: 'joy-noise', type: 'raster', source: 'joy-noise', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.7, 'raster-fade-duration': 0 } } as never, before);
  // izochiziqlar (relyef — topo, issiqlik — izotermalar, shovqin — izofonlar) va nishab strelkalari
  for (const id of ['joy-topo', 'joy-iso', 'joy-arr', 'joy-wind']) m.addSource(id, { type: 'geojson', data: fc([]) as never });
  m.addLayer({ id: 'joy-wind', type: 'line', source: 'joy-wind', layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'c'], 'line-width': ['get', 'w'], 'line-opacity': 0.85 } } as never);
  m.addLayer({ id: 'joy-topo', type: 'line', source: 'joy-topo', layout: { visibility: 'none', 'line-join': 'round' }, paint: { 'line-color': isDark() ? '#d8c6aa' : '#6e4f33', 'line-width': ['case', ['get', 'mj'], 1.4, 0.6], 'line-opacity': 0.8 } } as never);
  m.addLayer({ id: 'joy-topo-l', type: 'symbol', source: 'joy-topo', filter: ['get', 'mj'], layout: { visibility: 'none', 'symbol-placement': 'line', 'symbol-spacing': 320, 'text-field': ['get', 'lb'], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-keep-upright': true }, paint: { 'text-color': isDark() ? '#e8dcc6' : '#5a3f28', 'text-halo-color': isDark() ? '#16171a' : '#ffffff', 'text-halo-width': 1.6 } } as never);
  m.addLayer({ id: 'joy-iso', type: 'line', source: 'joy-iso', layout: { visibility: 'none', 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': ['get', 'c'], 'line-width': ['case', ['get', 'mj'], 2.4, 1.2], 'line-opacity': 0.9 } } as never);
  if (!m.hasImage('joy-arrow')) { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d')!; g.strokeStyle = g.fillStyle = '#fff'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(16, 28); g.lineTo(16, 8); g.stroke(); g.beginPath(); g.moveTo(16, 3); g.lineTo(23, 12); g.lineTo(9, 12); g.closePath(); g.fill(); m.addImage('joy-arrow', g.getImageData(0, 0, 32, 32), { pixelRatio: 2, sdf: true }); }
  m.addLayer({ id: 'joy-wind-a', type: 'symbol', source: 'joy-wind', filter: ['get', 'h'], layout: { visibility: 'none', 'symbol-placement': 'line', 'symbol-spacing': 260, 'icon-image': 'joy-arrow', 'icon-rotate': 90, 'icon-size': 0.7, 'icon-allow-overlap': true, 'icon-rotation-alignment': 'map' }, paint: { 'icon-color': ['get', 'c'] } } as never);
  m.addLayer({ id: 'joy-arr', type: 'symbol', source: 'joy-arr', layout: { visibility: 'none', 'icon-image': 'joy-arrow', 'icon-rotate': ['get', 'r'], 'icon-rotation-alignment': 'map', 'icon-allow-overlap': true, 'icon-size': ['get', 's'] }, paint: { 'icon-color': isDark() ? '#f4dcb4' : '#7a3a1c' } } as never);
  m.addLayer({ id: 'joy-walk', type: 'line', source: 'joy-walk', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['match', ['get', 'b'], 0, '#3f3a9e', 1, '#7b74d6', '#b9b4ef'], 'line-width': ['match', ['get', 'b'], 0, 3.5, 1, 2.6, 2] } } as never);
  m.addLayer({ id: 'joy-flow', type: 'line', source: 'joy-flow', layout: { 'line-cap': 'round' }, paint: { 'line-color': ['interpolate', ['linear'], ['get', 'f'], 0.1, '#c9d4f5', 0.5, '#6f82e0', 1, '#1f2f9e'], 'line-width': ['interpolate', ['linear'], ['get', 'f'], 0.1, 1, 1, 7], 'line-opacity': 0.9 } } as never);
  m.addLayer({ id: 'joy-site-f', type: 'fill', source: 'joy-site', paint: { 'fill-color': '#d2492f', 'fill-opacity': 0.12 } });
  m.addLayer({ id: 'joy-site', type: 'line', source: 'joy-site', paint: { 'line-color': '#d2492f', 'line-width': 2, 'line-dasharray': [3, 2] } });
  m.addLayer({ id: 'joy-draw-f', type: 'fill', source: 'joy-draw', filter: ['==', '$type', 'Polygon'], paint: { 'fill-color': '#2a6fb0', 'fill-opacity': 0.12 } });
  m.addLayer({ id: 'joy-draw-l', type: 'line', source: 'joy-draw', filter: ['==', '$type', 'LineString'], paint: { 'line-color': '#2a6fb0', 'line-width': 2 } });
  m.addLayer({ id: 'joy-draw-p', type: 'circle', source: 'joy-draw', filter: ['==', '$type', 'Point'], paint: { 'circle-radius': 4, 'circle-color': '#fff', 'circle-stroke-color': '#2a6fb0', 'circle-stroke-width': 2 } });
  m.addLayer({ id: 'joy-ring-f', type: 'fill', source: 'joy-ring', paint: { 'fill-color': ACC, 'fill-opacity': 0.05 } });
  m.addLayer({ id: 'joy-ring', type: 'line', source: 'joy-ring', paint: { 'line-color': ACC, 'line-width': 1.6, 'line-dasharray': [3, 2.2] } });
  m.addLayer({ id: 'joy-poi', type: 'circle', source: 'joy-poi', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 3, 17, 6], 'circle-color': ['get', 'col'], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.5, 'circle-opacity': ['case', ['get', 'in'], 1, 0.35], 'circle-stroke-opacity': ['case', ['get', 'in'], 1, 0.35] } } as never);
  // xizmatlar ikonkalari: rangli doira + oq piktogramma (canvas → rasm)
  for (const k of SVC_KINDS) if (!m.hasImage(`svc-${k}`)) m.addImage(`svc-${k}`, svcIcon(k), { pixelRatio: 2 });
  m.addLayer({ id: 'joy-poi-i', type: 'symbol', source: 'joy-poi', layout: { visibility: 'none', 'icon-image': ['concat', 'svc-', ['get', 'k']], 'icon-size': ['interpolate', ['linear'], ['zoom'], 13, 0.6, 16, 1], 'icon-allow-overlap': true }, paint: { 'icon-opacity': ['case', ['get', 'in'], 1, 0.45] } } as never);
  m.addLayer({ id: 'joy-comp', type: 'circle', source: 'joy-comp', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 4, 17, 8], 'circle-color': '#7a5a3c', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2, 'circle-opacity': ['case', ['get', 'in'], 1, 0.4] } } as never);
  m.addLayer({ id: 'joy-c-h', type: 'circle', source: 'joy-c', paint: { 'circle-radius': 18, 'circle-color': ACC, 'circle-opacity': 0.16 } });
  m.addLayer({ id: 'joy-c', type: 'circle', source: 'joy-c', paint: { 'circle-radius': 8, 'circle-color': ACC, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2.5 } });
  streetLayers(m);
}
let blank = '';
function blankPng(): string { if (!blank) { const c = document.createElement('canvas'); c.width = c.height = 1; blank = c.toDataURL(); } return blank; }
let slopeKey = '';
const HUD_LAYERS = ['joy-poi-i', 'joy-wind', 'joy-wind-a', 'joy-topo', 'joy-topo-l', 'joy-iso', 'joy-arr', 'joy-ring-f', 'joy-ring', 'joy-c-h', 'joy-c', 'joy-poi', 'joy-comp', 'joy-walk', 'joy-flow', 'joy-hs', 'joy-slope', 'joy-heat', 'joy-sun', 'joy-shadow', 'joy-noise', 'joy-draw-f', 'joy-draw-l', 'joy-draw-p'];
function paint(): void {
  const m = map;
  if (isK()) {
    if (m && m.getSource('joy-ring')) for (const id of HUD_LAYERS) if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', 'none');
    streetPaint(); rose?.remove(); rlab?.remove();
    const lg = streetLegend(); legend.replaceChildren(...lg); legend.hidden = !lg.length;
    return;
  }
  if (m && m.getSource('joy-ring')) { streetHide(m); for (const id of ['joy-ring-f', 'joy-ring', 'joy-c-h', 'joy-c', 'joy-poi', 'joy-comp', 'joy-walk', 'joy-flow', 'joy-draw-f', 'joy-draw-l', 'joy-draw-p']) m.setLayoutProperty(id, 'visibility', 'visible'); if (rlab) rlab.addTo(m); }
  paintH();
}
function paintH(): void {
  paintDraw();
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
  (m.getSource('joy-poi') as GeoJSONSource).setData(fc(p.filter(x => SVC_KINDS.includes(x.kind)).map(x => { const d = distM(S.c, x.at); return d > S.r * 2.2 ? null : pt(x.at, { col: SVC_COL[x.kind], in: d <= S.r, k: x.kind }); }).filter(Boolean)) as never);
  const cp = isOn('raqobat') ? D.comp.v ?? [] : [];
  (m.getSource('joy-comp') as GeoJSONSource).setData(fc(cp.map(x => pt(x.at, { in: x.d <= S.r }))) as never);
  // tarmoq modellari
  const nm = NM, toGeo = (i: number) => nm!.fr.toGeo(nm!.net.xy[i]);
  const wf: unknown[] = [], ff: unknown[] = [];
  if (nm && isOn('piyoda') && nm.reach) { const by: [number, number][][][] = [[], [], []]; nm.net.segs.forEach(([a, b], s) => { const k = nm.reach!.seg[s]; if (k >= 0) by[k].push([toGeo(a) as [number, number], toGeo(b) as [number, number]]); }); by.forEach((ls, k) => { if (ls.length) wf.push({ type: 'Feature', properties: { b: k }, geometry: { type: 'MultiLineString', coordinates: ls } }); }); }
  if (nm && isOn('oqim') && nm.flow) nm.net.segs.forEach(([a, b], s) => { const f = nm.flow![s]; if (f >= 0.1) ff.push({ type: 'Feature', properties: { f }, geometry: { type: 'LineString', coordinates: [toGeo(a), toGeo(b)] } }); });
  (m.getSource('joy-walk') as GeoJSONSource).setData(fc(wf.reverse()) as never);
  (m.getSource('joy-flow') as GeoJSONSource).setData(fc(ff.sort((x, y) => ((x as { properties: { f: number } }).properties.f - (y as { properties: { f: number } }).properties.f))) as never);
  if (nm && isOn('shovqin') && nm.noise) {
    const vn = V('shovqin'), k = `${nm.key}|n|${vn.p}|${vn.st}`; if (k !== noiseKey) { noiseKey = k; const im = gridImage(nm.noise.v, nm.noise.n, nm.noise.step, nm.noise.R, v => Number.isNaN(v) || (vn.st === '65' && v < 65) ? null : noiseCol(v), 190); (m.getSource('joy-noise') as unknown as { updateImage: (o: unknown) => void }).updateImage({ url: im.url, coordinates: im.coords }); }
    m.setLayoutProperty('joy-noise', 'visibility', 'visible');
  } else m.setLayoutProperty('joy-noise', 'visibility', 'none');
  // issiqlik oroli — yozgi LST (6 km doira)
  const upd = (id: string, im: { url: string; coords: [number, number][] }) => (m.getSource(id) as unknown as { updateImage: (o: unknown) => void }).updateImage({ url: im.url, coordinates: im.coords });
  const lg0 = D.lst.v;
  if (isOn('issiqlik') && lg0) { const vh = V('issiqlik'), k = `${S.c.join()}|${lg0.year}|${vh.p}|${vh.k.toFixed(2)}`; if (k !== heatKey) { heatKey = k; const mu = lstMean(lg0); upd('joy-heat', gridImage(lg0.v, lg0.n, lg0.step, lg0.R, v => Number.isNaN(v) ? null : heatCol(v - mu), 210, lg0.R)); } m.setLayoutProperty('joy-heat', 'visibility', 'visible'); }
  else m.setLayoutProperty('joy-heat', 'visibility', 'none');
  // quyosh: soatlar toʻri + tanlangan soatdagi soyalar
  const sm = SM;
  if (isOn('quyosh') && sm?.hours) {
    const k = `${sm.key}|h`; if (k !== sunKey) { sunKey = k; const v = new Float32Array(sm.n * sm.n).fill(NaN); sm.idx.forEach((o, i) => { v[o] = sm.hours![i]; }); upd('joy-sun', gridImage(v, sm.n, sm.step, (sm.n - 1) / 2 * sm.step, x => Number.isNaN(x) ? null : sunColor(x), 200)); }
    m.setLayoutProperty('joy-sun', 'visibility', 'visible');
  } else m.setLayoutProperty('joy-sun', 'visibility', 'none');
  if (isOn('quyosh') && sm) {
    const [mm, dd] = sunDay(), hr = sunHour(), k = `${sm.key}|${hr}`;
    if (k !== shadowKey) { shadowKey = k; const sp = sunPosition(localToUtcAt(2026, mm, dd, hr, S.c[1], S.c[0]), S.c[1], S.c[0]); upd('joy-shadow', shadowImage(sm.prisms, sp.alt, sp.az, S.r)); }
    m.setLayoutProperty('joy-shadow', 'visibility', 'visible');
  } else m.setLayoutProperty('joy-shadow', 'visibility', 'none');
  paintIso(m);
  paintWind(m);
  focusMap(m);
  // legenda: nishab va xizmatlar
  const lg: Node[] = [];
  if (lg0 && isOn('issiqlik')) lg.push(h('div', { class: 'lg' }, h('b', {}, tf('Yer yuzasi harorati: 6 km oʻrtachasidan (${t} °C) farq', { t: fmt(lstMean(lg0), 1) })), ...LST_DEV_BINS.map(([d0, , n], i) => h('span', {}, h('i', { style: `background:${heatCol(i === 0 ? -4 : i === LST_DEV_BINS.length - 1 ? 4 : (d0 + LST_DEV_BINS[i + 1][0]) / 2)}` }), n))));
  if (sm?.hours && isOn('quyosh')) lg.push(h('div', { class: 'lg' }, h('b', {}, tf('Quyoshli soatlar · ${d}', { d: tr(sunDay()[2]) })), ...SUN_BINS.map(([, c, n]) => h('span', {}, h('i', { style: `background:${c}` }), tr(n))), h('span', {}, h('i', { style: 'background:#6b6965' }), tr('soya'))));
  if (nm?.reach && isOn('piyoda')) lg.push(h('div', { class: 'lg' }, h('b', {}, tr('Piyoda yetish')), ...([['#3f3a9e', '5 daq'], ['#7b74d6', '10 daq'], ['#b9b4ef', '15 daq']] as const).map(([c, n]) => h('span', {}, h('i', { style: `background:${c}` }), tr(n)))));
  if (nm?.flow && isOn('oqim')) lg.push(h('div', { class: 'lg' }, h('b', {}, tr('Odamlar oqimi (model)')), h('span', {}, h('i', { style: 'background:linear-gradient(90deg,#c9d4f5,#1f2f9e);width:60px' }), tr('past → yuqori'))));
  if (nm?.noise && isOn('shovqin')) lg.push(h('div', { class: 'lg' }, h('b', {}, tr('Shovqin, Lden dB(A) (model)')), ...NOISE_BINS.map(([t0, , n], i) => (V('shovqin').st === '65' && t0 <= 65 ? null : h('span', {}, h('i', { style: `background:${noiseCol(i === 0 ? 45 : NOISE_BINS[i - 1][0] + 1)}` }), n)))));
  if (isOn('nishab') && t) lg.push(h('div', { class: 'lg' }, h('b', {}, tr('Nishab')), ...SLOPE_BINS.map(([, c, n]) => h('span', {}, h('i', { style: `background:${c}` }), tr(n)))));
  if (p.length) lg.push(h('div', { class: 'lg' }, h('b', {}, tr('Xizmatlar')), ...SVC_KINDS.map(k => h('span', {}, h('i', { class: 'dot', style: `background:${SVC_COL[k]}` }), tr(SVC_SHORT[k])))));
  if (cp.length) lg.push(h('div', { class: 'lg' }, h('span', {}, h('i', { class: 'dot', style: 'background:#7a5a3c' }), tr((CATS.find(c => c.id === S.cat) ?? CATS[0]).name))));
  legend.replaceChildren(...lg); legend.hidden = !lg.length;
  // shamol guli — markazda
  const w = isOn('shamol') ? windV() : undefined;
  if (rose) { if (w) { rose.getElement().innerHTML = `<div style="opacity:${roseK}">${roseSvg(w.w.petals)}</div>`; rose.setLngLat(S.c as [number, number]).addTo(m); } else rose.remove(); }
  if (rlab) {
    const e = rlab.getElement(), kx = 111_320 * Math.cos(S.c[1] * Math.PI / 180);
    e.textContent = tf('${r} m · ${m} daqiqa piyoda', { r: S.r, m: walkMin(S.r) });
    rlab.setLngLat([S.c[0] + S.r / kx, S.c[1]]);
  }
}
/** Issiqlik rangi: tanlangan shkala; intensivlik — kontrast (kichik farqlar ham koʻrinsin) */
function heatCol(d: number): string { const v = V('issiqlik'), pal = VIEW.issiqlik.pals![v.p][1]; return rampColor(pal, 0.5 + d / (2 * (4.6 - 3.4 * v.k))); }
function noiseCol(db: number): string { const v = V('shovqin'), pal = VIEW.shovqin.pals![v.p][1], i = NOISE_BINS.findIndex(([t]) => db < t); return pal[Math.min(pal.length - 1, i < 0 ? pal.length - 1 : i)]; }
/** Izochiziqlar va strelkalar: relyef (topo), nishab (pasayish), issiqlik (izotermalar), shovqin (izofonlar) */
function paintIso(m: MLMap): void {
  const vis = (id: string, on: boolean) => { if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none'); };
  const t = D.ter.v, lg0 = D.lst.v, nz = NM?.noise;
  const topoOn = isOn('relyef') && !!t && V('relyef').st === 'topo', arrOn = isOn('nishab') && !!t && V('nishab').st === 'strelka';
  const vi = V('issiqlik'), vn = V('shovqin');
  const heatIso = isOn('issiqlik') && !!lg0 && vi.st === 'izoterma', noiseIso = isOn('shovqin') && !!nz && vn.st === 'kontur';
  const key = [S.c.join(), S.r, topoOn, arrOn, heatIso && `${lg0!.year}|${vi.p}|${vi.k.toFixed(2)}`, noiseIso && `${NM!.key}|${vn.p}`, isDark()].join('|');
  vis('joy-topo', topoOn); vis('joy-topo-l', topoOn); vis('joy-arr', arrOn); vis('joy-iso', heatIso || noiseIso);
  if (key === isoKey) return; isoKey = key;
  const kx = 111_320 * Math.cos(S.c[1] * Math.PI / 180), ky = 111_132;
  const geo = (c: LngLat) => (p: [number, number]) => [c[0] + p[0] / kx, c[1] + p[1] / ky];
  const topo: unknown[] = [], iso: unknown[] = [], arr: unknown[] = [];
  if (topoOn && t) {
    const g = t.g, rng = g.max - g.min, st = [0.5, 1, 2, 5, 10, 20].find(v => rng / v <= 28) ?? 20, lv: number[] = [];
    for (let v = Math.ceil(g.min / st) * st; v <= g.max; v += st) lv.push(v);
    for (const L of isolines(g.h, g.n, g.step, lv, S.r * 1.15)) for (const line of joinSegs(L.segs)) if (line.length > 2) topo.push({ type: 'Feature', properties: { mj: Math.round(L.lv / st) % 5 === 0, lb: `${Math.round(L.lv)} m` }, geometry: { type: 'LineString', coordinates: line.map(geo(g.center)) } });
  }
  if (arrOn && t) {
    const g = t.g, n = g.n, sp = Math.max(1, Math.round((S.r / 9) / g.step)), R0 = (n - 1) / 2 * g.step;
    for (let j = sp; j < n - sp; j += sp) for (let i = sp; i < n - sp; i += sp) {
      const x = -R0 + i * g.step, y = -R0 + j * g.step; if (x * x + y * y > S.r * S.r) continue;
      const dx = (g.h[j * n + i + 1] - g.h[j * n + i - 1]) / (2 * g.step), dy = (g.h[(j + 1) * n + i] - g.h[(j - 1) * n + i]) / (2 * g.step), sl = Math.hypot(dx, dy) * 100;
      if (!(sl > 0.7)) continue;
      arr.push({ type: 'Feature', properties: { r: Math.atan2(-dx, -dy) * 180 / Math.PI, s: 0.55 + Math.min(1, sl / 8) * 0.75 }, geometry: { type: 'Point', coordinates: geo(g.center)([x, y]) } });
    }
  }
  if (heatIso && lg0) {
    const mu = lstMean(lg0); let lo = Infinity, hi = -Infinity; for (const v of lg0.v) if (!Number.isNaN(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    const lv: number[] = []; for (let v = Math.ceil((lo - mu) * 2) / 2; v <= hi - mu; v += 0.5) lv.push(mu + v);
    for (const L of isolines(lg0.v, lg0.n, lg0.step, lv, lg0.R)) for (const line of joinSegs(L.segs)) iso.push({ type: 'Feature', properties: { c: heatCol(L.lv - mu), mj: Math.abs((L.lv - mu) % 1) < 0.01 }, geometry: { type: 'LineString', coordinates: line.map(geo(S.c)) } });
  }
  if (noiseIso && nz) for (const L of isolines(nz.v, nz.n, nz.step, [50, 55, 60, 65, 70, 75])) for (const line of joinSegs(L.segs)) iso.push({ type: 'Feature', properties: { c: noiseCol(L.lv + 0.1), mj: L.lv === 65 }, geometry: { type: 'LineString', coordinates: line.map(geo(S.c)) } });
  (m.getSource('joy-topo') as GeoJSONSource).setData(fc(topo) as never);
  (m.getSource('joy-arr') as GeoJSONSource).setData(fc(arr) as never);
  (m.getSource('joy-iso') as GeoJSONSource).setData(fc(iso) as never);
}
/** Planda shamol oqimi: oqim chiziqlari binolarni aylanib oʻtadi; rang va qalinlik — nisbiy tezlik */
let windKey = '', windRaf = 0;
function paintWind(m: MLMap): void {
  const w = windV(), vw = V('shamol'), on = isOn('shamol') && !!w && vw.st === 'oqim';
  for (const id of ['joy-wind', 'joy-wind-a']) if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
  windAnim(m, on);
  if (!on || !w) return;
  if (!axBundle && !axBusy) void needCtx();
  const key = [S.c.join(), S.r, w.w.k, axBundle?.key ?? '-', vw.p, vw.k.toFixed(1)].join('|');
  if (key === windKey) return; windKey = key;
  const fr = geoFrame(S.c), R = S.r * 1.05, blds: [number, number][][] = [];
  for (const b of axBundle?.b.osm.buildings ?? []) { const r = b.rings[0]; if (!r?.length) continue; const L = r.map(p => fr.toLocal(p) as [number, number]); if (L.some(([x, y]) => Math.abs(x) < R && Math.abs(y) < R)) blds.push(L); }
  const pal = VIEW.shamol.pals![vw.p][1], lines = windFlow(blds, w.w.k * 22.5, R, 0.25 + 0.6 * vw.k), feats: unknown[] = [];
  for (const L of lines) for (let i = 0; i < L.pts.length - 1; i += 5) {
    const seg = L.pts.slice(i, i + 6), vv = L.v.slice(i, i + 6).reduce((a, b) => a + b, 0) / Math.min(6, L.v.length - i);
    if (seg.length < 2 || Math.hypot(seg[0][0], seg[0][1]) > S.r * 1.05) continue;
    feats.push({ type: 'Feature', properties: { c: rampColor(pal, 0.25 + 0.75 * vv), w: 0.8 + 2.6 * vv * (0.5 + vw.k), h: i % 40 === 0 }, geometry: { type: 'LineString', coordinates: seg.map(p => fr.toGeo(p)) } });
  }
  (m.getSource('joy-wind') as GeoJSONSource).setData(fc(feats) as never);
}
/** «Jonli» oqim: chiziq punktiri siljiydi (harakat kamaytirilgan boʻlsa — yoʻq) */
function windAnim(m: MLMap, on: boolean): void {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!on || still) { if (windRaf) { cancelAnimationFrame(windRaf); windRaf = 0; if (m.getLayer('joy-wind')) m.setPaintProperty('joy-wind', 'line-dasharray', undefined as never); } return; }
  if (windRaf) return;
  const seq = [[0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5], [2, 4, 1], [2.5, 4, 0.5], [3, 4, 0], [0, 0.5, 3, 3.5], [0, 1, 3, 3], [0, 1.5, 3, 2.5], [0, 2, 3, 2], [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, 0.5]];
  let i = 0, last = 0;
  const tick = (t: number) => { windRaf = requestAnimationFrame(tick); if (t - last < 70) return; last = t; if (!m.getLayer('joy-wind')) return; m.setPaintProperty('joy-wind', 'line-dasharray', seq[i = (i + 1) % seq.length]); };
  windRaf = requestAnimationFrame(tick);
}
/** Xizmat piktogrammasi (48 px, retina): rangli doira, oq chiziqli belgi */
const SVC_GLYPH: Partial<Record<Svc, string>> = {
  maktab: 'M-4 1h8M-4 1v-3l4-2 4 2v3M0 -4v-2M-2 1v3h4v-3', mtm: 'M-3 4v-5l3-3 3 3v5zM0 4v-3', poliklinika: 'M-1.3 -4h2.6v2.7h2.7v2.6h-2.7v2.7h-2.6v-2.7h-2.7v-2.6h2.7z',
  dorixona: 'M-3.5 1.5l5-5a2 2 0 0 1 2.8 2.8l-5 5a2 2 0 0 1-2.8-2.8zM-1 -1l2.8 2.8', savdo: 'M-4 -2h8l-1 6h-6zM-2 -2v-1.5a2 2 0 0 1 4 0v1.5', sport: 'M-4 0h8M-3 -2v4M3 -2v4M-4.5 -1v2M4.5 -1v2',
  bekat: 'M-3 -4h6v6h-6zM-3 -1h6M-2 4v-2M2 4v-2', metro: 'M-4 3.5l1.5-7 2.5 5 2.5-5 1.5 7', mahalla: 'M-4 4v-5l4-3 4 3v5zM-1 4v-3h2v3',
};
function svcIcon(k: Svc): ImageData {
  const c = document.createElement('canvas'); c.width = c.height = 48; const g = c.getContext('2d')!;
  g.fillStyle = SVC_COL[k]; g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); g.arc(24, 24, 20, 0, Math.PI * 2); g.fill(); g.stroke();
  g.save(); g.translate(24, 24); g.scale(2.4, 2.4); g.lineWidth = 1.3; g.lineCap = g.lineJoin = 'round'; g.stroke(new Path2D(SVC_GLYPH[k] ?? 'M-2 0h4')); g.restore();
  return g.getImageData(0, 0, 48, 48);
}
/** Fokus: faol boʻlmagan qatlamlar xira (bir nechta qatlam yoqilganda) */
function focusMap(m: MLMap): void {
  const a = actId(), k = (id: LayerId) => (S.on.length > 1 && a && a !== id ? FOCUS_DIM : 1);
  const set = (layer: string, prop: string, v: unknown) => { if (m.getLayer(layer)) m.setPaintProperty(layer, prop, v); };
  const q = (id: LayerId, lo: number, hi: number) => (lo + (hi - lo) * V(id).k) * k(id);
  set('joy-hs', 'hillshade-exaggeration', q('relyef', 0.2, 1));
  set('joy-topo', 'line-opacity', q('relyef', 0.35, 1)); set('joy-topo-l', 'text-opacity', k('relyef'));
  set('joy-slope', 'raster-opacity', q('nishab', 0.35, 0.95)); set('joy-arr', 'icon-opacity', q('nishab', 0.4, 1));
  set('joy-heat', 'raster-opacity', q('issiqlik', 0.3, 0.85) * (V('issiqlik').st === 'izoterma' ? 0.45 : 1));
  set('joy-iso', 'line-opacity', Math.max(q('issiqlik', 0.5, 1), q('shovqin', 0.5, 1)));
  set('joy-sun', 'raster-opacity', q('quyosh', 0.35, 0.95));
  set('joy-shadow', 'raster-opacity', q('quyosh', 0.2, 0.55));
  set('joy-noise', 'raster-opacity', q('shovqin', 0.3, 0.9) * (V('shovqin').st === 'kontur' ? 0.25 : 1));
  set('joy-walk', 'line-opacity', q('piyoda', 0.45, 1));
  set('joy-wind', 'line-opacity', q('shamol', 0.45, 1)); set('joy-wind-a', 'icon-opacity', q('shamol', 0.45, 1));
  set('joy-flow', 'line-opacity', q('oqim', 0.45, 1));
  set('joy-flow', 'line-width', ['interpolate', ['linear'], ['get', 'f'], 0.1, 0.6 + V('oqim').k, 1, 3 + 9 * V('oqim').k]);
  const x = k('xizmat'), c = k('raqobat');
  set('joy-poi', 'circle-opacity', ['case', ['get', 'in'], x, 0.35 * x]); set('joy-poi', 'circle-stroke-opacity', ['case', ['get', 'in'], x, 0.35 * x]);
  set('joy-comp', 'circle-opacity', ['case', ['get', 'in'], c, 0.4 * c]); set('joy-comp', 'circle-stroke-opacity', c);
  { const ic = isOn('xizmat') && V('xizmat').st === 'ikonka'; if (m.getLayer('joy-poi-i')) { m.setLayoutProperty('joy-poi-i', 'visibility', ic ? 'visible' : 'none'); m.setPaintProperty('joy-poi-i', 'icon-opacity', ['case', ['get', 'in'], x, 0.45 * x]); } if (ic) { set('joy-poi', 'circle-opacity', 0); set('joy-poi', 'circle-stroke-opacity', 0); } }
  roseK = k('shamol') * (isOn('shamol') && V('shamol').st === 'oqim' ? 0.45 : 1);
}
/* ---------------- Albom, hisobot va plakat (26.10) ---------------- */
type AlbKind = 'hisobot' | 'albom' | 'plakat';
const ALB = (() => { try { return JSON.parse(localStorage.getItem('joy-albom') || 'null') as { k?: AlbKind; f?: 'doira' | 'kvadrat'; t?: 'oq' | 'qora' } | null; } catch { return null; } })() ?? {};
const albSave = () => { try { localStorage.setItem('joy-albom', JSON.stringify(ALB)); } catch { /* */ } };
function cityName(): string {
  const tz = placeOf(S.c[0], S.c[1]).tz ?? '', c = tz.split('/').pop()?.replace(/_/g, ' ') ?? '', lang = getLang();
  const loc: Record<string, [string, string]> = { Tashkent: ['Toshkent', 'Ташкент'], Samarkand: ['Samarqand', 'Самарканд'] };
  return loc[c] ? (lang === 'ru' ? loc[c][1] : lang === 'uz' ? loc[c][0] : c) : c;
}
function albomDialog(): void {
  document.getElementById('albDlg')?.remove();
  const back = h('div', { class: 'alb-back' });
  const kinds: [AlbKind, string, string][] = [['hisobot', 'Qisqa hisobot', 'A4 · muqova, qisqa xulosa, har qatlamga sahifa'], ['albom', 'Albom varaqlari', 'A3 · Shveytsar toʻri, har qatlamga varaq'], ['plakat', 'Plakat · Galereya', '50 × 70 sm · faol qatlam']];
  const draw = () => {
    const k = ALB.k ?? 'hisobot', f = ALB.f ?? 'kvadrat', th = ALB.t ?? 'oq';
    const nOn = collectCards().filter(c => LAYERS.some(l => l.id === c.id)).length;
    const seg = (lab: string, id: string, opts: [string, string][], cur: string, on: (v: string) => void) => h('div', { class: 'alb-row' }, h('span', { class: 't-small' }, tr(lab)),
      h('div', { class: 'seg sm', role: 'group', 'aria-label': tr(lab), id }, ...opts.map(([v, n]) => h('button', { type: 'button', 'aria-pressed': v === cur, onclick: () => { on(v); albSave(); draw(); } }, tr(n)))));
    box.replaceChildren(
      h('h2', {}, tr('Albom, hisobot va plakat')),
      h('p', { class: 't-small' }, nOn ? tf('${n} ta qatlam natijasi kiradi. Har qatlam xaritasi alohida olinadi.', { n: nOn }) : tr('Avval kamida bitta qatlamni yoqing — natijasi tayyor boʻlsin.')),
      h('div', { class: 'alb-kinds', role: 'radiogroup', 'aria-label': tr('Hujjat turi') }, ...kinds.map(([v, n, d]) => h('button', { type: 'button', role: 'radio', 'aria-checked': v === k, 'data-k': v, class: 'alb-k', onclick: () => { ALB.k = v; albSave(); draw(); } }, h('b', {}, tr(n)), h('span', {}, tr(d))))),
      seg('Xarita ramkasi', 'albFrame', [['kvadrat', 'Kvadrat'], ['doira', 'Doira']], f, v => { ALB.f = v as 'doira' | 'kvadrat'; }),
      seg('Fon', 'albTheme', [['oq', 'Oq'], ['qora', 'Qora']], th, v => { ALB.t = v as 'oq' | 'qora'; }),
      h('div', { class: 'alb-act' },
        h('button', { type: 'button', class: 'btn', onclick: close }, tr('Bekor qilish')),
        h('button', { type: 'button', class: 'btn', id: 'albPdf', disabled: !nOn, onclick: () => { close(); void albom('pdf'); } }, 'PDF'),
        h('button', { type: 'button', class: 'btn btn-primary', id: 'albChz', disabled: !nOn, onclick: () => { close(); void albom('chz'); } }, tr('Chizmadonga'))));
  };
  const box = h('div', { class: 'alb', id: 'albDlg', role: 'dialog', 'aria-modal': 'true', 'aria-label': tr('Albom, hisobot va plakat') });
  const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
  function close(): void { document.removeEventListener('keydown', key); back.remove(); }
  back.addEventListener('click', e => { if (e.target === back) close(); });
  document.addEventListener('keydown', key);
  back.append(box); document.body.append(back); draw();
  (box.querySelector('[aria-checked=true]') as HTMLElement | null)?.focus();
}
async function albom(out: 'pdf' | 'chz'): Promise<void> {
  if (repBusy) return;
  repBusy = true; renderRight(); toast(tr('Albom tayyorlanmoqda…'));
  const keepOn = S.on.slice(), keepAct = S.act;
  try {
    const A = await import('./albom');
    const cards = collectCards().filter(c => LAYERS.some(l => l.id === c.id));
    await baseReady();
    const base0 = albomBase();
    const kind = ALB.k ?? 'hisobot', only = kind === 'plakat' ? cards.filter(c => c.id === (actId() ?? cards[0]?.id)) : cards;
    const layers: import('./albom').AlbumLayer[] = [];
    for (const c of only) {
      const L = LAYERS.find(l => l.id === c.id)!;
      const cid = c.id as LayerId; S.on = cid === 'relyef' ? keepOn.filter(x => x === 'relyef' || x === 'nishab') : [cid]; S.act = cid; paint();
      layers.push({ id: c.id, name: c.name, group: L.g, groupName: tr(GROUPS.find(g => g[0] === L.g)![1]), color: c.color, big: c.big, text: c.text, norms: c.norms, src: c.src, beta: c.beta, map: null, legend: collectLegends(), ov: albomOverlay(cid, base0) });
    }
    S.on = keepOn; S.act = keepAct; paint();
    const addr = D.addr.st === 'ok' ? D.addr.v! : `${S.c[1].toFixed(5)}, ${S.c[0].toFixed(5)}`, date = new Date().toISOString().slice(0, 10);
    const I: import('./albom').AlbumInput = {
      addr, coords: `${S.c[1].toFixed(4)}° N · ${S.c[0].toFixed(4)}° E`, radius: S.r, date, city: cityName(), layers, overview: null, base: base0,
      theme: ALB.t ?? 'oq', frame: ALB.f ?? 'kvadrat', spanM: base0.span,
      L: { kicker: tr('Hudud tahlili'), summary: tr('Qisqa xulosa'), summaryLead: tf('${r} m radiusdagi hudud — har qatlamning asosiy koʻrsatkichi va meʼyorlarga muvofiqligi.', { r: S.r }), layer: tr('Qatlam'), value: tr('Koʻrsatkich'), norm: tr('Meʼyor boʻyicha'), source: tr('Manba'), method: tr('Usul'), normsOk: tr('Meʼyorda'), north: tr('Sh'), author: tr('Muallif'), page: tr('Varaq'), layers: tr('qatlam'), org: 'Archemistry Lab', sources: '', note: tr('Avtomatik hisobot: ochiq maʼlumotlar va modellar; beta qatlamlar — taxminiy, joyida tekshiring.') },
    };
    const pages = kind === 'hisobot' ? A.shortReport(I) : kind === 'albom' ? A.swissSheets(I) : [A.galleryPoster(I, layers[0] ?? null)];
    const fname = `joy-${kind}-${S.c[1].toFixed(4)}-${S.c[0].toFixed(4)}`;
    if (out === 'pdf') { const { svgPdf } = await import('../ui/pdf'); await svgPdf(pages.map(p => ({ svg: p.svg, widthMm: p.w, heightMm: p.h })), `${fname}.pdf`); }
    else {
      const items = pages.map(p => ({ name: `${p.name} · ${addr}`, kind: 'sheet' as const, svg: p.svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, ''), vb: [0, 0, p.w, p.h] as [number, number, number, number], w: p.w, h: p.h }));
      const { sendSheet } = await import('../ui/chzsend');
      const r = await sendSheet({ ...items[0], name: `${tr(kind === 'hisobot' ? 'Qisqa hisobot' : kind === 'albom' ? 'Albom varaqlari' : 'Plakat · Galereya')} · ${addr}`, more: items.slice(1) }, S.c);
      if (r === false) toast(tr('Brauzer xotirasi toʻla — varaq uzatilmadi'));
    }
  } catch (e) { S.on = keepOn; S.act = keepAct; paint(); toast(`${tr('Albom tayyorlanmadi')}: ${(e as Error).message}`); }
  finally { repBusy = false; renderRight(); }
}
/** Albom xaritasi uchun OSM fon maʼlumoti tayyor boʻlsin (binolar, koʻchalar) */
async function baseReady(): Promise<void> {
  const key = `${S.c.join()}|${S.r + 100}`;
  for (let i = 0; i < 240 && axBundle?.key !== key; i++) { if (!axBusy) void needCtx(); await new Promise(r => setTimeout(r, 250)); }
}
function albomBase(): import('./albomMap').MapBase {
  const fr = geoFrame(S.c), span = 2 * (S.r + 100) * 0.97, H = span / 2 * 1.05, o = axBundle?.b?.osm;
  const L = (r: LngLat[]) => r.map(p => fr.toLocal(p) as XY), inBox = (pts: XY[]) => pts.some(p => Math.abs(p[0]) < H && Math.abs(p[1]) < H);
  const rings = (a: { rings: LngLat[][] }[] | undefined) => (a ?? []).flatMap(x => x.rings.slice(0, 1).map(L)).filter(inBox);
  return {
    bld: rings(o?.buildings), water: rings(o?.water), green: rings(o?.green),
    roads: (o?.roads ?? []).filter(r => r.cls !== 'footway' && r.cls !== 'path' && r.cls !== 'steps').map(r => ({ pts: L(r.pts), w: Math.max(3, r.w), major: /^(motorway|trunk|primary|secondary)/.test(r.cls) })).filter(r => inBox(r.pts)),
    site: S.site ? L(S.site) : null, R: S.r, span,
  };
}
/** Har qatlamning albomdagi grafikasi: rastr (issiqlik, shovqin, quyosh, nishab) yoki vektor (tarmoq, nuqtalar, izochiziqlar) */
function albomOverlay(id: LayerId, B: import('./albomMap').MapBase): import('./albomMap').Overlay {
  const fr = geoFrame(S.c), toL = (p: LngLat) => fr.toLocal(p) as XY;
  const ras = (im: { url: string; coords: [number, number][] }, op = 1, circle?: number) => { const nw = toL(im.coords[0] as LngLat), se = toL(im.coords[2] as LngLat); return { url: im.url, x0: nw[0], y0: se[1], x1: se[0], y1: nw[1], op, circle }; };
  const nm = NM, half = B.span / 2;
  switch (id) {
    case 'relyef': {
      const g = D.ter.v?.g; if (!g) return {};
      const cv = document.createElement('canvas'); cv.width = cv.height = g.n; const cx = cv.getContext('2d')!, img = cx.createImageData(g.n, g.n), rng = Math.max(1, g.max - g.min);
      for (let j = 0; j < g.n; j++) for (let i = 0; i < g.n; i++) { const t = (g.h[j * g.n + i] - g.min) / rng, o = ((g.n - 1 - j) * g.n + i) * 4; img.data[o] = 236 - t * 60; img.data[o + 1] = 226 - t * 80; img.data[o + 2] = 204 - t * 95; img.data[o + 3] = 170; }
      cx.putImageData(img, 0, 0);
      const R = g.radius + g.step / 2, d = rng / 12, st = [0.5, 1, 2, 5, 10, 20].find(v => v >= d) ?? 20, lv: number[] = [];
      for (let v = Math.ceil(g.min / st) * st; v <= g.max; v += st) lv.push(v);
      const cs = contours(g.h, g.n, g.step, lv);
      return { quiet: true, rasters: [{ url: cv.toDataURL(), x0: -R, y0: -R, x1: R, y1: R, op: 0.9 }],
        lines: cs.map(c => ({ pts: [], multi: c.segs.map(sg => [sg[0], sg[1]]), w: Math.round(c.lv / st) % 5 === 0 ? 0.45 : 0.2, col: '#7a5a3c', op: 0.85 })) };
    }
    case 'nishab': { const t = D.ter.v; return t ? { quiet: true, rasters: [ras(slopeImage(t.g, S.r + 100), 0.85)] } : {}; }
    case 'issiqlik': { const g = D.lst.v; if (!g) return {}; const mu = lstMean(g); return { quiet: true, rasters: [ras(gridImage(g.v, g.n, g.step, g.R, v => Number.isNaN(v) ? null : devColor(v - mu), 255, g.R), 0.72, half * 1.5)] }; }
    case 'shovqin': { const g = nm?.noise; return g ? { quiet: true, rasters: [ras(gridImage(g.v, g.n, g.step, g.R, v => Number.isNaN(v) ? null : noiseColor(v), 230), 0.8)] } : {}; }
    case 'quyosh': {
      const sm = SM; if (!sm?.hours) return {};
      const v = new Float32Array(sm.n * sm.n).fill(NaN); sm.idx.forEach((o, i) => { v[o] = sm.hours![i]; });
      const [mm, dd] = sunDay(), hr = sunHour(), sp = sunPosition(localToUtcAt(2026, mm, dd, hr, S.c[1], S.c[0]), S.c[1], S.c[0]);
      return { quiet: true, rasters: [ras(gridImage(v, sm.n, sm.step, (sm.n - 1) / 2 * sm.step, x => Number.isNaN(x) ? null : sunColor(x), 235), 0.85), ras(shadowImage(sm.prisms, sp.alt, sp.az, S.r), 0.28)] };
    }
    case 'piyoda': {
      if (!nm?.reach) return {};
      const by: XY[][][] = [[], [], []]; nm.net.segs.forEach(([a, b], s2) => { const k = nm.reach!.seg[s2]; if (k >= 0) by[k].push([nm.net.xy[a] as XY, nm.net.xy[b] as XY]); });
      return { lines: ([[2, '#c9c4f3', 0.55], [1, '#8a82e0', 0.8], [0, '#3f3a9e', 1.15]] as const).map(([k, col, w]) => ({ pts: [], multi: by[k], w, col, op: 1 })) };
    }
    case 'oqim': {
      if (!nm?.flow) return {};
      const bins: XY[][][] = [[], [], [], [], []]; nm.net.segs.forEach(([a, b], s2) => { const f = nm.flow![s2]; if (f >= 0.08) bins[Math.min(4, Math.floor(f * 5))].push([nm.net.xy[a] as XY, nm.net.xy[b] as XY]); });
      return { quiet: true, lines: bins.map((m, k) => ({ pts: [], multi: m, w: 0.3 + k * 0.45, col: ['#c9d4f5', '#9aaaf0', '#6f82e0', '#4456c4', '#1f2f9e'][k], op: 0.95 })) };
    }
    case 'xizmat': {
      const ps = (D.poi.v?.pois ?? []).filter(p => SVC_KINDS.includes(p.kind)).map(p => ({ p, xy: toL(p.at) })).filter(q => Math.abs(q.xy[0]) < half && Math.abs(q.xy[1]) < half);
      const near = new Map<Svc, { xy: XY; d: number }>(); for (const q of ps) { const d = Math.hypot(q.xy[0], q.xy[1]), c = near.get(q.p.kind); if (!c || d < c.d) near.set(q.p.kind, { xy: q.xy, d }); }
      return { quiet: true, dots: ps.map(q => ({ x: q.xy[0], y: q.xy[1], r: 1.15, col: SVC_COL[q.p.kind], op: Math.hypot(q.xy[0], q.xy[1]) <= S.r ? 1 : 0.4 })),
        lines: [...near.values()].map(n => ({ pts: [[0, 0], n.xy] as XY[], w: 0.3, col: '#16171a', op: 0.55, dash: '1 1' })),
        labels: [...near.entries()].filter(([, n]) => n.d <= S.r * 1.1).map(([k, n]) => ({ x: n.xy[0], y: n.xy[1], t: `${tr(SVC_SHORT[k])} · ${fmt(n.d)} m`, col: SVC_COL[k] })) };
    }
    case 'raqobat': return { quiet: true, dots: (D.comp.v ?? []).map(c => { const xy = toL(c.at); return { x: xy[0], y: xy[1], r: 1.4, col: '#7a5a3c', op: c.d <= S.r ? 1 : 0.4, halo: c.d <= S.r ? 60 : 0 }; }) };
    case 'shamol': {
      const w = windV(); if (!w) return {};
      const from = w.w.k * 22.5 * Math.PI / 180, dx = -Math.sin(from), dy = -Math.cos(from), nx = -dy, ny = dx, ls: XY[][] = [];
      for (let i = -5; i <= 5; i++) { const o0: XY = [nx * i * half / 5.5, ny * i * half / 5.5], pts: XY[] = []; for (let t = -1.4; t <= 1.4; t += 0.1) { const wob = Math.sin(t * 3 + i) * half * 0.03; pts.push([o0[0] + dx * t * half + nx * wob, o0[1] + dy * t * half + ny * wob]); } ls.push(pts); }
      return { quiet: true, rose: roseSvg(w.w.petals).replace(/^<svg[^>]*>|<\/svg>$/g, ''), lines: [{ pts: [], multi: ls, w: 0.45, col: '#2f8a66', op: 0.45, dash: '4 2' }] };
    }
    default: return {};
  }
}
/* ---------------- C: joy pasporti hisoboti (A3) ---------------- */
let repBusy = false;
/** Xarita surati: doira kvadratga sigʻadigan qilib, keyin kamera qaytariladi */
async function captureMap(): Promise<{ url: string; mPerMm: number; side: number } | null> {
  const m = map; if (!m) return null;
  const cam = { center: m.getCenter(), zoom: m.getZoom(), bearing: m.getBearing(), pitch: m.getPitch() };
  const cv = m.getCanvas(), dpr = cv.width / cv.clientWidth, side = Math.min(cv.clientWidth, cv.clientHeight) - 24;
  const span = S.r * 2.3, z = Math.log2(156543.03392 * Math.cos(S.c[1] * Math.PI / 180) * side / span);
  m.jumpTo({ center: S.c as [number, number], zoom: Math.min(19, z), bearing: 0, pitch: 0 });
  await new Promise<void>(res => { const t = setTimeout(res, 8000); m.once('idle', () => { clearTimeout(t); res(); }); });
  const url = await new Promise<string>(res => { m.once('render', () => {
    const W = Math.round(side * dpr), out = document.createElement('canvas'), k = Math.min(1, 1800 / W); out.width = out.height = Math.round(W * k);
    const g = out.getContext('2d')!; g.fillStyle = '#ffffff'; g.fillRect(0, 0, out.width, out.height);
    g.drawImage(cv, Math.round((cv.width - W) / 2), Math.round((cv.height - W) / 2), W, W, 0, 0, out.width, out.height);
    try { res(out.toDataURL('image/jpeg', 0.86)); } catch { res(''); }
  }); m.triggerRepaint(); });
  m.jumpTo(cam);
  const mPerPx = 156543.03392 * Math.cos(S.c[1] * Math.PI / 180) / 2 ** Math.min(19, z);
  return url ? { url, mPerMm: 0, side: side * mPerPx } : null;
}
/** Ekrandagi pasport kartalari → hisobot maʼlumoti (ekran bilan bir xil matn va til) */
function collectCards(): import('./report').RepCard[] {
  return [...right.querySelectorAll<HTMLElement>('.joy-card[data-card]')].map(el => {
    const sub = el.querySelector('.sub'), txt = (n: Element | null | undefined) => (n?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const norms = [...el.querySelectorAll('.joy-norm li')].map(li => ({ k: txt(li.querySelector('span')), v: txt(li.querySelector('b')), lim: txt(li.querySelector('em')), ok: li.classList.contains('ok') }));
    const text: string[] = [];
    if (sub) { const c = sub.cloneNode(true) as HTMLElement; c.querySelectorAll('ul, .src').forEach(x => x.remove()); c.querySelectorAll('br').forEach(b => b.replaceWith('\n')); c.textContent!.split('\n').map(t => t.replace(/\s+/g, ' ').trim()).filter(Boolean).forEach(t => text.push(t)); }
    const chips = el.querySelectorAll('header .chip:not(.beta)');
    const lc = el.style.getPropertyValue('--lc');
    return { id: el.dataset.card!, name: txt(el.querySelector('header .nm')), color: lc || ACC, chip: txt(chips[chips.length - 1]), beta: !!el.querySelector('header .chip.beta'), big: txt(el.querySelector('.big')), text, norms, src: [...(sub?.querySelectorAll('.src') ?? [])].map(txt).join(' ') };
  }).filter(c => c.big && c.big !== '—');
}
function collectLegends(): import('./report').RepLegend[] {
  return [...legend.querySelectorAll('.lg')].map(lg => ({ title: lg.querySelector('b')?.textContent ?? '', items: [...lg.querySelectorAll('span')].map(sp => {
    const i = sp.querySelector('i') as HTMLElement | null, st = i?.getAttribute('style') ?? '', m = /#[0-9a-f]{6}/i.exec(st);
    return [m ? m[0] : (i ? getComputedStyle(i).backgroundColor : '#999'), (sp.textContent ?? '').trim()] as [string, string];
  }) }));
}
async function report(kind: 'pdf' | 'svg' | 'chz'): Promise<void> {
  if (repBusy) return;
  repBusy = true; renderRight(); toast(tr('Hisobot tayyorlanmoqda…'));
  try {
    const R = await import('./report');
    const shot = await captureMap().catch(() => null);
    const S0 = R.A3, mapS = S0[1] - 10 - 30 - 20 - 6 - 4;
    const w = isOn('shamol') ? windV() : undefined;
    const date = new Date().toISOString().slice(0, 10);
    const addr = D.addr.st === 'ok' ? D.addr.v! : `${S.c[1].toFixed(5)}, ${S.c[0].toFixed(5)}`;
    const inp: import('./report').RepInput = {
      kicker: tr('Joy pasporti'), title: addr, meta: `${S.c[1].toFixed(5)}, ${S.c[0].toFixed(5)} · ${S.r} m · ${tf('${m} daqiqa piyoda', { m: walkMin(S.r) })} · ${date}`,
      map: shot ? { url: shot.url, mPerMm: shot.side / mapS, rose: w ? roseSvg(w.w.petals).replace(/^<svg[^>]*>|<\/svg>$/g, '') : null, ringLabel: tf('${r} m · ${m} daqiqa piyoda', { r: S.r, m: walkMin(S.r) }) } : null,
      legends: collectLegends(), cards: collectCards(),
      stamp: { org: 'Archemistry Lab', service: tr('Joyshunos'), placeL: tr('Hudud'), place: `${addr} · ${S.c[1].toFixed(5)}, ${S.c[0].toFixed(5)}`, authorL: tr('Muallif'), dateL: tr('Sana'), date, sheetL: tr('Varaq'), srcL: tr('Manbalar'),
        sources: tr('© OpenStreetMap hissachilari · AWS Terrain Tiles · EPW TMYx (climate.onebuilding.org) · NASA GIBS / MODIS · ShNQ 2.07.01-23 · SanQvaN 0331-16'),
        note: tr('Avtomatik hisobot: ochiq maʼlumotlar va modellar; beta qatlamlar — taxminiy, joyida tekshiring.') },
      labels: { north: tr('Sh'), more: tr('Davomi keyingi varaqda →'), noMap: tr('Xarita surati olinmadi') },
    };
    const pages = R.passportSheets(inp, kind === 'chz');
    const name = `joy-pasporti-${S.c[1].toFixed(4)}-${S.c[0].toFixed(4)}`;
    if (kind === 'pdf') { const { svgPdf } = await import('../ui/pdf'); await svgPdf(pages.map(svg => ({ svg, widthMm: S0[0], heightMm: S0[1] })), `${name}.pdf`); }
    else if (kind === 'svg') save2(`${name}.svg`, new Blob([pages[0]], { type: 'image/svg+xml' }));
    else {
      const inner = pages[0].replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
      const vh = +(/viewBox="0 0 [\d.]+ ([\d.]+)"/.exec(pages[0])?.[1] ?? S0[1]);
      const { sendSheet } = await import('../ui/chzsend');
      if (await sendSheet({ name: `${tr('Joy pasporti')} · ${addr}`, kind: 'sheet', svg: inner, vb: [0, 0, S0[0], vh], w: S0[0], h: vh }, S.c) === false) { toast(tr('Brauzer xotirasi toʻla — varaq uzatilmadi')); return; }
    }
  } catch (e) { toast(`${tr('Hisobot tayyorlanmadi')}: ${(e as Error).message}`); }
  finally { repBusy = false; renderRight(); }
}
let noiseKey = '', heatKey = '', sunKey = '', shadowKey = '';
/** Markazga nisbatan toʻr (n×n, qadam step, yarim kenglik R) → rasm; clip — shu radiusdan tashqari shaffof */
function gridImage(vals: Float32Array, n: number, step: number, R: number, col: (v: number) => string | null, alpha = 200, clip?: number): { url: string; coords: [number, number][] } {
  const cv = document.createElement('canvas'); cv.width = cv.height = n;
  const cx = cv.getContext('2d')!, img = cx.createImageData(n, n), c0 = (n - 1) / 2;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    if (clip != null && Math.hypot((i - c0) * step, (j - c0) * step) > clip) continue;
    const c = col(vals[j * n + i]); if (!c) continue; const o = ((n - 1 - j) * n + i) * 4;
    img.data[o] = parseInt(c.slice(1, 3), 16); img.data[o + 1] = parseInt(c.slice(3, 5), 16); img.data[o + 2] = parseInt(c.slice(5, 7), 16); img.data[o + 3] = alpha;
  }
  cx.putImageData(img, 0, 0);
  const kx = 111_320 * Math.cos(S.c[1] * Math.PI / 180), ky = 111_132, H = R + step / 2;
  return { url: cv.toDataURL(), coords: [[S.c[0] - H / kx, S.c[1] + H / ky], [S.c[0] + H / kx, S.c[1] + H / ky], [S.c[0] + H / kx, S.c[1] - H / ky], [S.c[0] - H / kx, S.c[1] - H / ky]] };
}
/** Soyalar rasmi: r doirasi ichida, ~1 m piksel (koʻpi bilan 2048) */
function shadowImage(prisms: Prism[], alt: number, az: number, r: number): { url: string; coords: [number, number][] } {
  const R = r, px = Math.min(2048, Math.ceil(2 * R)), k = px / (2 * R), cv = document.createElement('canvas'); cv.width = cv.height = px;
  const g = cv.getContext('2d')!;
  if (alt > 0.5) {
    g.save(); g.beginPath(); g.arc(px / 2, px / 2, R * k, 0, Math.PI * 2); g.clip();
    g.fillStyle = '#1b1b1b';
    // har koʻpburchak alohida — yoʻnalishi har xil boʻlsa ham ustma-ust tushganda teshik qolmaydi
    for (const pr of prisms) for (const poly of shadowOf(pr, alt, az)) { g.beginPath(); poly.forEach((p, i) => { const x = px / 2 + p[0] * k, y = px / 2 - p[1] * k; if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); g.fill(); }
    g.restore();
  }
  const kx = 111_320 * Math.cos(S.c[1] * Math.PI / 180), ky = 111_132;
  return { url: cv.toDataURL(), coords: [[S.c[0] - R / kx, S.c[1] + R / ky], [S.c[0] + R / kx, S.c[1] + R / ky], [S.c[0] + R / kx, S.c[1] - R / ky], [S.c[0] - R / kx, S.c[1] - R / ky]] };
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
/** 3D uslub: Master rejadagi uslublar bilan bir xil (kalit umumiy — «mr-style») yoki xarita palitrasi */
type AxSt = 'albom' | 'rangli' | 'arctic' | 'funksiya' | 'minimal' | 'palitra';
const AX_STYLES: [AxSt, string, string][] = [['albom', 'Qogʻoz', 'oq binolar, soyalar'], ['rangli', 'Shahar ranglari', 'OSM ranglari, sunʼiy yoʻldosh'], ['arctic', 'Gips maket', 'oq gil model'], ['funksiya', 'Funksional', 'funksiya ranglari'], ['minimal', 'Chizma', 'oq-qora grafika'], ['palitra', 'Xarita palitrasi', '7 ta uslubdan']];
let axStyle: AxSt = (() => { try { const v = localStorage.getItem('joy-axstyle') ?? localStorage.getItem('mr-style'); return AX_STYLES.some(x => x[0] === v) ? v as AxSt : 'albom'; } catch { return 'albom'; } })();
const AXST = (() => { try { return JSON.parse(localStorage.getItem('joy-axo') || 'null') as { view?: string; order?: string[]; vis?: Record<string, boolean>; ex?: boolean; gap?: number; day?: number; hour?: number; anim?: boolean; sun?: string } | null; } catch { return null; } })() ?? {};
function axSave(): void { if (!axo) return; try { localStorage.setItem('joy-axo', JSON.stringify({ view: axo.view, order: axo.order, vis: axo.vis, ex: axo.exploded, gap: axo.gap, day: axo.day, hour: axo.hour, anim: axo.animate, sun: axo.sunStyle, city: axo.cityLook, site: axo.siteLook })); } catch { /* */ } }
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
    if (Array.isArray(AXST.order) && !AXST.order.includes('transport')) { const i = AXST.order.indexOf('kochalar'); AXST.order.splice(i + 1, 0, 'transport'); }   // 26.10: yangi qatlam
    if (Array.isArray(AXST.order) && AXST.order.length === AX.AX_LAYERS.length) axo.order = AXST.order as typeof axo.order;
    if (AXST.sun === 'yelpigich') axo.sunStyle = 'yelpigich';
    { const A = AXST as { city?: string; site?: string }; if (A.city && ['odatiy', 'oq', 'shisha', 'kontur'].includes(A.city)) axo.cityLook = A.city as typeof axo.cityLook; if (A.site && ['punktir', 'tola', 'devor', 'shtrix'].includes(A.site)) axo.siteLook = A.site as typeof axo.siteLook; }
    if (AXST.vis) Object.assign(axo.vis, AXST.vis);
    axo.exploded = !!AXST.ex; if (AXST.gap) axo.gap = AXST.gap; if (AXST.day != null) axo.day = AXST.day; if (AXST.hour != null) axo.hour = AXST.hour; if (AXST.anim === false) axo.animate = false;
    axo.onChange = () => { renderNotes(); axSyncTime(); };
    void takeInbox().then(() => restoreModel());
    (window as unknown as { joyAxo: unknown }).joyAxo = axo;
  }
  // maʼlumot: kontekst (binolar, yoʻllar, relyef) + xizmatlar, raqobatchilar, shamol
  if (D.poi.st === 'idle') run('poi', () => ctx.loadPoi(S.c));
  if (D.comp.st === 'idle') ensureComp();
  if (D.wind.st === 'idle') ensureWind();
  await needCtx();
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
    const w = windV();
    axo.setData({ bundle: axBundle.b, center: S.c, r: S.r, pins, wind: w ? { petals: w.w.petals, rose: w.w.rose, bins: w.bins, mean: w.w.mean } : null, sat: axSat, dark: isDark(), pal: PALETTES[palKey()], site: S.site ?? null, style: axStyle });
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
      h('button', { type: 'button', 'aria-label': tr('Kamaytirish'), onclick: () => { a.setExplode(a.exploded, Math.max(60, a.gap - 40)); axSave(); renderAxo(); } }, '−'), h('span', {}, String(a.gap)),
      h('button', { type: 'button', 'aria-label': tr('Oshirish'), onclick: () => { a.setExplode(a.exploded, Math.min(600, a.gap + 40)); axSave(); renderAxo(); } }, '+'))),
    h('div', { class: 'seg sm', role: 'group', 'aria-label': tr('Fon') }, ...([[false, 'Maket'], [true, 'Sunʼiy yoʻldosh']] as const).map(([k, n]) => h('button', { type: 'button', 'aria-pressed': axSat === k, onclick: () => { axSat = k; axBuild(); renderAxo(); } }, tr(n)))),
    h('div', { class: 'seg sm', role: 'group', 'aria-label': tr('Quyosh yoʻli'), id: 'axSun' }, ...([['gumbaz', 'Quyosh gumbazi'], ['yelpigich', 'Yelpigʻich']] as const).map(([k, n]) => h('button', { type: 'button', 'aria-pressed': a.sunStyle === k, onclick: () => { a.sunStyle = k; axSave(); axBuild(); renderAxo(); } }, tr(n)))),
    h('div', { class: 't-small' }, tr('Shahar fonda')),
    h('div', { class: 'seg sm', role: 'group', 'aria-label': tr('Shahar fonda'), id: 'axCity' }, ...([['oq', 'Oq'], ['shisha', 'Shisha'], ['kontur', 'Kontur'], ['odatiy', 'Odatiy']] as const).map(([k, n]) => h('button', { type: 'button', 'aria-pressed': a.cityLook === k, onclick: () => { a.cityLook = k; axSave(); axBuild(); renderAxo(); } }, tr(n)))),
    h('div', { class: 't-small' }, tr('Uchastka')),
    h('div', { class: 'seg sm', role: 'group', 'aria-label': tr('Uchastka'), id: 'axSite' }, ...([['tola', 'Yashil'], ['devor', 'Devor'], ['shtrix', 'Shtrix'], ['punktir', 'Punktir']] as const).map(([k, n]) => h('button', { type: 'button', 'aria-pressed': a.siteLook === k, onclick: () => { a.siteLook = k; axSave(); axBuild(); renderAxo(); } }, tr(n)))),
    h('div', { class: 'glabel' }, tr('Loyiha')),
    h('div', { class: 'row wrap' },
      h('button', { type: 'button', class: 'btn btn-sm', id: 'axModel', title: tr('OBJ yoki GLB (metr, Y — yuqoriga); markaz — tanlangan nuqta'), onclick: () => pickModel() }, tr('Model yuklash')),
      a.hasModel() ? h('button', { type: 'button', class: 'btn btn-sm btn-ghost', title: tr('Modelni 15° burish'), onclick: () => { a.modelRot = (a.modelRot + 15) % 360; a.placeModel(); } }, '↻ 15°') : null,
      a.hasModel() ? h('button', { type: 'button', class: 'btn btn-sm btn-ghost', onclick: () => { a.setModel(null); void cacheDel('joy-model'); renderAxo(); } }, tr('Olib tashlash')) : null),
    S.site ? h('div', { class: 't-small' }, tf('Uchastka: ${a} ga — har qatlamda ajratib koʻrsatiladi', { a: fmt(ringArea(S.site) / 10000, 2) }))
      : h('div', { class: 'note', id: 'axNoSite' }, h('b', {}, tr('Uchastka chizilmagan')), h('br'), tr('Shuning uchun aksonometriyada uchastka koʻrinmaydi — faqat tahlil nuqtasi.'),
        h('div', { class: 'row', style: 'margin-top:8px;gap:6px;flex-wrap:wrap' },
          h('button', { type: 'button', class: 'btn btn-sm', id: 'axSiteDraw', onclick: () => { setMode('map'); startDraw('site'); } }, tr('Xaritada chizish')),
          kpsSite() ? h('button', { type: 'button', class: 'btn btn-sm', id: 'axSiteK', title: tr('Joyshunos va Master rejaning 1-qadamida belgilangan hudud'), onclick: () => { const r = kpsSite(); if (r) { setSite(r, false); axBuild(); renderAxo(); } } }, tr('1-qadamdan')) : null)),
    h('div', { class: 't-small' }, tr('Ushlab suring: quyosh — vaqtni oʻzgartiradi, shamol strelkasi — yoʻnalishni buradi, belgi — joyini koʻchiradi.')),
    h('div', { class: 'row wrap' },
      h('button', { type: 'button', class: 'btn btn-sm btn-ghost', disabled: !a.flowDeg.some(v => v != null), onclick: () => a.resetWind() }, tr('Shamolni tiklash')),
      h('button', { type: 'button', class: 'btn btn-sm btn-ghost', disabled: !a.pinMoves.size, onclick: () => { a.resetPins(); renderAxo(); } }, tr('Belgilarni tiklash'))),
    h('div', { class: 'glabel' }, tr('Uslub')),
    h('div', { class: 'joy-sty', role: 'group', 'aria-label': tr('Uslub') }, ...AX_STYLES.map(([k, n, sub]) => h('button', { type: 'button', 'data-sty': k, 'aria-pressed': axStyle === k, onclick: () => { axStyle = k; try { localStorage.setItem('joy-axstyle', k); } catch { /* */ } axBuild(); renderAxo(); } }, h('b', {}, tr(n)), h('span', {}, tr(sub))))),
    ...(axStyle === 'palitra' ? [(() => { const m = palMenu(() => { axBuild(); renderAxo(); renderBase(); }); m.classList.add('inline'); return m; })()] : []),
    h('div', { class: 'glabel' }, tr('Qatlamlar · pastdan yuqoriga')),
    h('ol', { class: 'joy-axlist' }, ...a.order.map((id, i) => {
      const L = A.AX_LAYERS.find(l => l.id === id)!;
      return h('li', { 'data-ax': id, class: a.vis[id] ? '' : 'off' },
        h('button', { type: 'button', class: `check${a.vis[id] ? ' on' : ''}`, role: 'checkbox', 'aria-checked': a.vis[id], 'aria-label': tr(L.name), onclick: () => { a.vis[id] = !a.vis[id]; re(); } }, svgIcon('<path d="M5 12l5 5 9-10"/>')),
        h('span', { class: 'n' }, String(i + 1).padStart(2, '0')), h('i', { style: `background:${L.color}` }), h('span', { class: 'nm' }, tr(L.name), a.exploded && (id === 'shamol' || id === 'quyosh') ? h('small', {}, tr('yigʻilganda koʻrinadi')) : null),
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
    h('button', { type: 'button', class: 'btn btn-sm btn-ghost', id: 'axAnim', 'aria-pressed': a.animate, title: tr('Shamol strelkalari harakati'), onclick: () => { a.animate = !a.animate; axSave(); renderAxo(); } }, a.animate ? tr('❚❚ Shamol') : tr('▶ Shamol')),
    h('button', { type: 'button', class: 'btn btn-sm btn-ghost icon-btn', title: tr('Yaqinlashtirish'), 'aria-label': tr('Yaqinlashtirish'), onclick: () => a.zoomBy(1.25) }, '+'),
    h('button', { type: 'button', class: 'btn btn-sm btn-ghost icon-btn', title: tr('Uzoqlashtirish'), 'aria-label': tr('Uzoqlashtirish'), onclick: () => a.zoomBy(0.8) }, '−'),
    h('button', { type: 'button', class: 'btn btn-sm btn-ghost', title: tr('Koʻrinishni tiklash'), onclick: () => a.reset() }, tr('Markaz')),
    (() => { const w = h('div', { class: 'joy-exw' }, h('button', { type: 'button', class: 'btn btn-sm', id: 'axExp', 'aria-expanded': expOpen, onclick: () => { expOpen = !expOpen; renderAxo(); } }, tr('Eksport'), ic(ICON.chev)));
      if (expOpen) w.append(h('div', { class: 'joy-menu up', role: 'menu' },
        h('button', { type: 'button', role: 'menuitem', id: 'exSvgL', onclick: () => doExport('svgL') }, tr('SVG · Illustrator (qatlamlar)')),
        h('button', { type: 'button', role: 'menuitem', id: 'exSvg', onclick: () => doExport('svg') }, tr('SVG · oddiy')),
        h('button', { type: 'button', role: 'menuitem', id: 'exGlb', onclick: () => doExport('glb') }, tr('Massing · GLB')),
        h('button', { type: 'button', role: 'menuitem', id: 'exObj', onclick: () => doExport('obj') }, tr('Massing · OBJ')),
        h('button', { type: 'button', role: 'menuitem', id: 'exChz', onclick: () => doExport('chz') }, tr('Chizmadonga yuborish')),
        h('button', { type: 'button', role: 'menuitem', id: 'exRen', onclick: () => void toRender() }, tr('Render studiyasiga'))));
      return w; })(),
    h('button', { type: 'button', class: 'btn btn-sm btn-primary', id: 'axPng', onclick: () => void exportPng() }, 'PNG · 4K'),
  );
  axSyncTime = renderAxoTime;
  function renderAxoTime(): void { if (!a) return; const p = (a.hour - 5) / 15 * 100; (rng.querySelector('em') as HTMLElement).style.width = `${p}%`; (rng.querySelector('i') as HTMLElement).style.left = `${p}%`; rng.setAttribute('aria-valuenow', String(a.hour)); const t = document.getElementById('axTm'); if (t) t.textContent = hh(a.hour); }
  renderNotes();
}
function renderNotes(): void {
  if (mode !== 'axo') return;
  const a = axo, A = AX, s = a?.sunInfo(), w = windV()?.w, dayName = a && A ? tr(A.SUN_DAYS[a.day][2]) : '—', hrs = a ? a.hour : null;
  const hh = (v: number) => `${Math.floor(v)}:${String(Math.round((v % 1) * 60)).padStart(2, '0')}`;
  const row = (k: string, v: string) => h('div', { class: 'kv' }, h('span', {}, k), h('b', {}, v));
  const it = (c: string, n: string, kind = 'dot') => h('li', {}, h('i', { class: kind, style: `background:${c}` }), tr(n));
  axN.replaceChildren(
    h('div', { class: 'ttl' }, 'Archemistry Lab'),
    row(tr('Joylashuv'), `${S.c[1].toFixed(4)}, ${S.c[0].toFixed(4)}`),
    row(tr('Kun'), dayName),
    row(tr('Vaqt'), hrs != null && a && A ? `${hh(hrs)} (${utcLabel(tzOffsetH(placeOf(S.c[0], S.c[1]).tz, Date.UTC(2026, A.SUN_DAYS[a.day][0] - 1, A.SUN_DAYS[a.day][1], 12)))})` : '—'),
    row(tr('Quyosh'), s ? (s.alt > 0 ? tf('balandlik ${a}°, azimut ${z}°', { a: fmt(s.alt), z: fmt(s.az) }) : tr('ufqdan past')) : '—'),
    row(tr('Shamol'), w ? `${tr(dir8(w.k * 22.5))} · ${fmt(w.share * 100)} %` : '—'),
    row(tr('Radius'), `${S.r} m`),
    h('div', { class: 'glabel' }, tr('Izohlar')),
    h('ul', {}, it('#e8a317', 'Quyosh yoʻli (soatlar)'), it('#e0532c', 'Quyosh', 'big'), it('#3f8f6b', 'Shamol guli'),
      ...(a?.flows ?? []).map((f, i) => h('li', {}, h('i', { class: 'bar', style: `background:${f.col}` }), tf('Shamol ${n}: ${d} · ${p} % · ${v} m/s', { n: i + 1, d: tr(dir8(f.deg)), p: fmt(f.share * 100), v: fmt(f.v, 1) }))),
      it('#4c5bd4', 'Xizmatlar'), it('#7a5a3c', 'Raqobatchilar'), it('#c0643a', 'Masofa halqalari', 'ring'), it('#6b6965', 'Binolar soyasi', 'sq')),
    h('p', { class: 't-small' }, tr('Binolar balandligi OSM dan; yozilmaganlari qavat soni yoki maydoniga qarab taxmin qilingan.')),
  );
}
let expOpen = false;
let axSyncTime: () => void = () => {};
function fileName(ext: string): string { return `joyshunos-${S.c[1].toFixed(4)}-${S.c[0].toFixed(4)}.${ext}`; }
function save2(name: string, b0: Blob): void { void wmFile(name, b0, b0.type).then(b => save2raw(name, b as Blob)); }
function save2raw(name: string, b: Blob): void { const u = URL.createObjectURL(b), x = document.createElement('a'); x.href = u; x.download = name; document.body.append(x); x.click(); x.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }
async function doExport(k: 'svgL' | 'svg' | 'glb' | 'obj' | 'chz'): Promise<void> {
  expOpen = false; renderAxo(); if (!axo) return;
  try {
    if (k === 'glb' || k === 'obj') { save2(fileName(k), await axo.massing(k)); return; }
    const { axoSvg } = await import('./axo-svg'), txt = axoSvg(axo, k === 'svgL');
    if (k === 'chz') {
      const { sendToChizmadon } = await import('../kochasoz/io');
      const el = new DOMParser().parseFromString(txt, 'image/svg+xml').documentElement as unknown as SVGSVGElement;
      sendToChizmadon(el, `Joyshunos · ${D.addr.v ?? S.c.join(', ')}`, S.c); return;
    }
    save2(fileName(k === 'svgL' ? 'ai.svg' : 'svg'), new Blob([txt], { type: 'image/svg+xml' }));
  } catch (e) { alert((e as Error).message); }
}
/** Model: OBJ yoki GLB (fayldan) — IndexedDB da saqlanadi va keyingi ochilishda tiklanadi */
function pickModel(): void {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.obj,.glb,.gltf,model/gltf-binary';
  inp.onchange = async () => { const f = inp.files?.[0]; if (!f) return; const buf = await f.arrayBuffer(); await loadModel(f.name, buf); void cachePut('joy-model', { name: f.name, buf: buf.slice(0), center: S.c }).catch(() => {}); };
  inp.click();
}
async function loadModel(name: string, buf: ArrayBuffer, offset: [number, number] = [0, 0], colors = false): Promise<void> {
  if (!axo) return;
  try {
    let obj: import('three').Object3D;
    if (/\.obj$/i.test(name)) { const { OBJLoader } = await import('three/addons/loaders/OBJLoader.js'); obj = new OBJLoader().parse(new TextDecoder().decode(buf)); }
    else { const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js'); obj = (await new GLTFLoader().parseAsync(buf, '')).scene; }
    axo.modelOff = offset; axo.setModel(obj, colors); renderAxo();
  } catch (e) { alert(`${tr('Model ochilmadi')}: ${(e as Error).message}`); }
}
/** Master rejadan yuborilgan model («joy-inbox»): markaz va model joyi */
async function takeInbox(): Promise<void> {
  try {
    const box = await cacheGet<{ name: string; buf: ArrayBuffer; origin: LngLat; colors?: boolean }>('joy-inbox'); if (!box) return;
    await cacheDel('joy-inbox'); await cachePut('joy-model', { name: box.name, buf: box.buf, center: box.origin, colors: !!box.colors });
    if (Math.abs(box.origin[0] - S.c[0]) > 1e-6 || Math.abs(box.origin[1] - S.c[1]) > 1e-6) pick(box.origin);
  } catch { /* */ }
}
async function restoreModel(): Promise<void> {
  try { const m = await cacheGet<{ name: string; buf: ArrayBuffer; center: LngLat; colors?: boolean }>('joy-model'); if (!m || !axo) return;
    const k = 111_320 * Math.cos(S.c[1] * Math.PI / 180), off: [number, number] = [(m.center[0] - S.c[0]) * k, (m.center[1] - S.c[1]) * 111_132];
    if (Math.hypot(off[0], off[1]) < S.r * 1.5) await loadModel(m.name, m.buf, off, !!m.colors); } catch { /* */ }
}

/** Joriy aksonometriya kadri → Render studiyasi (asos rasm) */
async function toRender(): Promise<void> {
  expOpen = false; renderAxo(); if (!axo) return;
  try {
    const blob = await axo.png(2048), img = await new Promise<string>((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => no(r.error); r.readAsDataURL(blob); });
    const { sendToRender } = await import('../render/inbox');
    await sendToRender({ name: D.addr.v ?? `${S.c[1].toFixed(4)}, ${S.c[0].toFixed(4)}`, from: 'joy', subj: 'joy', img });
  } catch (e) { toast(`Render: ${(e as Error).message}`); }
}
async function exportPng(): Promise<void> {
  if (!axo) return;
  const b = document.getElementById('axPng') as HTMLButtonElement | null; if (b) { b.disabled = true; b.textContent = '…'; }
  try {
    const blob = await wmRaster(await axo.png(3840)), u = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = u; a.download = `joyshunos-${S.c[1].toFixed(4)}-${S.c[0].toFixed(4)}.png`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
  } catch (e) { alert((e as Error).message); }
  if (b) { b.disabled = false; b.textContent = 'PNG · 4K'; }
}

function renderAll(): void { root.classList.toggle('an-kocha', isK()); renderHeader(); renderLeft(); renderRight(); renderAsk(); renderBase(); renderMode(); if (mode === 'axo') renderAxo(); document.title = `${tr('Joyshunos')} · Archemistry Lab`; }
renderAll();
onLang(() => { renderAll(); paint(); document.documentElement.lang = getLang(); });
onTheme(() => { renderHeader(); restyle(); if (mode === 'axo') axBuild(); });
document.addEventListener('keydown', e => {
  if (isK() && !(e.target as HTMLElement)?.closest?.('input,textarea') && streetKey(e)) { e.preventDefault(); return; }
  if (e.key === 'Escape' && catOpen) { catOpen = false; renderRight(); }
  const d = drawing;
  if (d && !(e.target as HTMLElement)?.closest?.('input,textarea')) {
    if (e.key === 'Escape') { drawing = null; measure = ''; if (map) { map.doubleClickZoom.enable(); map.getCanvas().style.cursor = ''; } renderLeft(); paintDraw(); }
    if (e.key === 'Enter') finishDraw();
    if (e.key === 'Backspace') { d.pts.pop(); renderLeft(); paintDraw(); }
  }
});
void initMap().catch(e => { mapEl.append(h('div', { class: 'joy-maperr note warn' }, tr('Xarita yuklanmadi'), ': ', String((e as Error).message || e))); });
ensure();
if (mode === 'axo') void enterAxo();
