/**
 * Bogʻshunos — landshaft master reja xizmati (app/bogshunos.html), 14.11.2026.
 * Bosqichlar (chap panel): 1 Hudud → 2 Maʼlumot → 3 Tahlil → 4 Dastur → 5 Variantlar → 6 Varaqlar.
 * Xarita toʻliq ekranda; ogʻir hisob — worker.ts (tahlil, uch variant, albom). Albom — Bogʻshunosning oʻz varaqlari (albom.ts), PDF — ui/pdf.
 * Holat: IndexedDB (cachePut), loyiha ichida — loyiha kaliti bilan (core/projctx scoped). Maʼlumot manbalari har bosqichda koʻrsatiladi.
 */
import '../ui/ds2.css';
import './bg.css';
import type { Map as MLMap, GeoJSONSource } from 'maplibre-gl';
import type { LngLat } from '../core/doc';
import { scoped, ctxProject } from '../core/projctx';
import { svcPickBtn } from '../ui/svcpick';
import { setSvcThumb, ringSvg } from '../storage/svcthumb';
import { frame } from '../core/geo';
import { h, svgIcon, toast } from '../ui/dom';
import { tr, tf, setLang } from '../i18n';
import { langMenu } from '../ui/langmenu';
import { logoSvg } from '../ui/logo';
import { toggleTheme, isDark, onTheme } from '../ui/theme';
import { mrBackBtn } from '../ui/mrback';
import { mapStyle, basePrefs } from '../context/mapstyle';
import { geocode, type Place } from '../context/geocode';
import { cacheGet, cachePut } from '../storage/db';
import { svgPdf } from '../ui/pdf';
import { osmQuery, parseOsm, overpass, loadTrees, loadDem, loadPop, REGISTRY_CITE } from './load';
import { parksAt, ringAreaHa, type ParkCand } from './pick';
import { fmt } from './albom';
import type { BgData, BgSite, Variant } from './types';
import type { Analysis } from './analyze';
import type { AnOpt, WIn, WOut, ModOut, VSum } from './worker';
import { HILL_H, STEP_RISE } from './vertikal';
import type { BgTu, NetKind, XY } from './types';
import { TIER_W, ZONE_N, type Edit, type Tier, type ZoneKind } from './edits';
import { TIERS, TIER_ORD, ZONES, ZONE_GROUPS } from './catalog';
import { ELEM, EL_GROUPS, type Prog, type ElKey } from './dastur';
import { PRICE0 } from './cost';
import { ASSORT, BASE, setUserAssort, type UserAssort, type UserSp, type Grp } from './assort';
import { FURN, FCATS, PIROG, PIROG_OF, furnById, type FCat } from './library';
import { VARS } from './design';
import { aksoPass, type AksoReq } from './akso';

/* ---------------- holat ---------------- */
type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
type Mod = 'reja' | 'kesim' | 'ekish' | 'assort' | 'fauna' | 'tarmoq' | 'narx';
/** Topshiriq (15.11): maqsad, byudjet chegarasi, asosiy foydalanuvchilar, saqlanishi shart obyektlar */
interface Brief { goal: string; budget: number | null; users: string[]; keep: string }
type Kind = BgSite['kind'];
interface St { v: 2; prog?: Prog; assort?: UserAssort; akso?: (AksoReq & { title: string })[]; edits?: Edit[]; brief?: Brief; modBy?: Partial<Record<number, Mod>>; c: LngLat; z: number; step: Step; site: (BgSite & { src?: string }) | null; opt: AnOpt; chosen: 'A' | 'B' | 'C'; author: string; layer: 'cls' | 'slope' | 'trees'; dataKey: string | null; mod?: Mod; tu?: BgTu[]; prices?: Record<string, { p: number | null; src: string }> }
const KEY = scoped('bg:state');
const DEF_OPT: AnOpt = { canalStrip: 12, shore: 10, noise: 40, s: [0.35, 0.45], k: 2 };
let S: St = { v: 2, c: [69.2797, 41.3111], z: 14, step: 1, site: null, opt: { ...DEF_OPT }, chosen: 'C', author: '', layer: 'cls', dataKey: null };
let data: BgData | null = null, A: Analysis | null = null, V: Record<string, Variant> | null = null;
let geo: { trees?: unknown; classes?: unknown; slope?: unknown; v?: Record<string, unknown>; plant?: unknown } = {};
let PLT: Extract<WOut, { t: 'planted' }>['P'] | null = null;
/** dastur taklifi (tahlildan): bogʻ turi, maydon va tashrif sonidan */
let SUG: { prog: Prog; sportNeed: number; why: string } | null = null;
const guessTarixiy = (name: string): boolean => /skver|xiyobon|сквер|аллея|square|memorial|мемориал|yodgorlik|xotira/i.test(name);
const guessKind = (name: string, ha: number): BgSite['kind'] => (guessTarixiy(name) || ha < 3 ? 'xiyobon' : ha >= 15 ? 'shahar' : ha >= 10 ? 'tuman' : 'turarjoy');
let MODR: ModOut | null = null, modGeo: Record<string, unknown> = {}, placing: NetKind | null = null, tuCap = 0;
let sheets: { id: string; title: string; svg: string; w: number; h: number }[] = [];
let busy = '', found: Place[] = [], cands: ParkCand[] = [], drawing: LngLat[] | null = null, showVar: 'A' | 'B' | 'C' = 'C';
const src: Record<string, { st: 'wait' | 'run' | 'ok' | 'err'; n?: string }> = { osm: { st: 'wait' }, trees: { st: 'wait' }, dem: { st: 'wait' }, pop: { st: 'wait' } };
const save = () => { void cachePut(KEY, S); };

/* ---------------- worker ---------------- */
const W = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
let waiter: ((m: WOut) => void) | null = null;
W.onmessage = (e: MessageEvent<WOut>) => { const m = e.data; if (m.t === 'progress') { busy = m.msg; renderStatus(); return; } const f = waiter; waiter = null; f?.(m); };
/** Worker soʻrovlari navbat bilan (bir vaqtda bitta javob kutiladi — aralashib ketmasin) */
let chain: Promise<unknown> = Promise.resolve();
const ask = (m: WIn): Promise<WOut> => { const r = chain.then(() => new Promise<WOut>(res => { waiter = res; W.postMessage(m); })); chain = r.catch(() => undefined); return r; };

/* ---------------- qobiq (Master reja tuzilishi: .top · .rail · .panel.sp · .mapctl · .kpibar) ---------------- */
const root = document.getElementById('bg')!;
const mapEl = h('div', { class: 'bg-map', id: 'bgMap' });
const header = h('header', { class: 'top glassbar', id: 'bgTop' });
const rail = h('nav', { class: 'rail', id: 'bgRail', 'aria-label': tr('Bosqichlar') });
const left = h('section', { class: 'panel sp', id: 'bgLeft', 'aria-label': tr('Bosqich') });
const mapctl = h('div', { class: 'mapctl', id: 'bgCtl' });
const legendEl = h('div', { class: 'maplegend bg-legend', id: 'bgLegend', hidden: true });
const kpiEl = h('div', { class: 'kpibar glassbar', id: 'bgKpi', hidden: true });
const statusEl = h('div', { class: 'bg-status glassbar', id: 'bgStatus', hidden: true });
const sheetsEl = h('section', { class: 'bg-sheets', id: 'bgSheets', hidden: true, 'aria-label': tr('Varaqlar') });
const toolsEl = h('div', { class: 'bg-toolsw', id: 'bgTools', hidden: true });
const aksoEl = h('section', { class: 'bg-akso', id: 'bgAkso', hidden: true, 'aria-label': tr('Aksonometriya') });
root.replaceChildren(mapEl, header, rail, left, mapctl, legendEl, kpiEl, statusEl, toolsEl, sheetsEl, aksoEl);
/** svgIcon ichki SVG belgisini kutadi — yoʻl (d) <path> ga oʻraladi */
const pth = (d: string) => svgIcon(`<path d="${d}"/>`);
const ic = (d: string) => { const s = pth(d); s.classList.add('ic'); return s; };
const CHEV = 'M6 9l6 6 6-6';
const SERVICES = [
  { id: 'mr', name: 'Master reja', href: './', note: 'Uchastka, bino hajmi, meʼyorlar' }, { id: 'ks', name: 'Koʻchasoz', href: './kochasoz.html', note: 'Koʻcha kesimi va YHQ tekshiruvi' },
  { id: 'joy', name: 'Joyshunos', href: './joyshunos.html', note: 'Hudud tahlili: issiqlik, shamol, piyoda' }, { id: 'chz', name: 'Chizmadon', href: './#/chizmadon', note: 'Taqdimot albomi' },
];
let svcOpen = false;
function renderHeader(): void {
  const svc = h('button', { type: 'button', class: 'svcbadge svcbtn', id: 'bgSvc', 'aria-haspopup': 'menu', 'aria-expanded': String(svcOpen), title: tr('Boshqa xizmat'), onclick: (e: Event) => { e.stopPropagation(); svcOpen = !svcOpen; renderHeader(); } }, h('i'), h('span', {}, tr('Bogʻshunos')), ic(CHEV));
  const menu = svcOpen ? h('div', { class: 'bg-pop', id: 'bgSvcPop', role: 'menu' }, ...SERVICES.map(x => h('a', { class: 'mi', role: 'menuitem', href: x.href }, h('b', {}, tr(x.name)), h('span', {}, tr(x.note))))) : '';
  const vseg = V && S.step >= 5 ? h('div', { class: 'seg', id: 'bgVarSeg', role: 'group', 'aria-label': tr('Variant') }, ...(['A', 'B', 'C'] as const).filter(k => V![k]).map(k => h('button', { type: 'button', 'aria-pressed': showVar === k, title: V![k].name, onclick: () => { showVar = k; render(); paint(); } }, k))) : '';
  header.replaceChildren(
    mrBackBtn(),
    h('a', { class: 'brand', href: '../index.html', title: 'Archemistry Lab', 'aria-label': 'Archemistry Lab' }, logoSvg(22)),
    h('span', { class: 'bg-svcw' }, svc, menu),
    S.site ? h('input', { class: 'pname', id: 'bgPname', value: S.site.name, 'aria-label': tr('Loyiha nomi'), onchange: (e: Event) => { S.site!.name = (e.target as HTMLInputElement).value.trim() || S.site!.name; sheets = []; save(); } }) : '',
    svcPickBtn('bogshunos'),
    h('span', { class: 'sp' }),
    vseg,
    langMenu(l => { void setLang(l); }),
    h('button', { class: 'btn btn-sm btn-ghost icon-btn', id: 'themeBtn', type: 'button', 'aria-label': tr(isDark() ? 'Yorugʻ rejim' : 'Tungi rejim'), onclick: () => toggleTheme() }, ic(isDark() ? 'M12 4v2M12 18v2M4 12h2M18 12h2M6 6l1.4 1.4M16.6 16.6L18 18M6 18l1.4-1.4M16.6 7.4L18 6M12 8a4 4 0 100 8 4 4 0 000-8z' : 'M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z')),
  );
}
document.addEventListener('click', () => { if (svcOpen) { svcOpen = false; renderHeader(); } });

/* ---------------- bosqichlar: rail + panel ---------------- */
const IC_PIN = 'M12 21s-7-6.2-7-11.5a7 7 0 0114 0C19 14.8 12 21 12 21zM12 7.5a2 2 0 100 4 2 2 0 000-4z';
const STEPS: [Step, string, string, string][] = [
  [1, 'Topshiriq', IC_PIN, 'Hudud, bogʻ turi, maqsad, byudjet va asosiy foydalanuvchilar.'],
  [2, 'Mavjud holat', 'M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3', 'Manbalar yuklanadi va keshlanadi: OSM, daraxtlar reyestri, relyef, aholi.'],
  [3, 'Tahlil', 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5', 'Imkoniyat va cheklovlar, relyef, mavjud daraxtlar.'],
  [4, 'Dastur', 'M16 19v-1.5a3.5 3.5 0 00-3.5-3.5h-5A3.5 3.5 0 004 17.5V19M10 10.5a3 3 0 100-6 3 3 0 000 6zM20 19v-1.5a3.5 3.5 0 00-2.5-3.3M15.5 4.6a3 3 0 010 5.8', 'Tashrif modeli va xizmatlar dasturi — ShNQ 2.07.01-23.'],
  [5, 'Konsepsiya', 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', 'Uch variant: yoʻllar oqimdan, dastur elementlari qoidalar bilan. Birini tanlang.'],
  [6, 'Master reja', 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3', 'Tanlangan variantni tahrirlang: yoʻllar, zonalar, elementlar. Kesimlar shu rejadan olinadi.'],
  [7, 'Koʻkalamzorlashtirish', 'M12 22v-6M12 16c-3.9 0-7-2.7-7-6.5C5 6 8 3 12 2c4 1 7 4 7 7.5 0 3.8-3.1 6.5-7 6.5zM12 16l-3-3M12 13l3-3', 'Ekish rejasi, fasllar, yashash muhitlari va fauna.'],
  [8, 'Jihozlash va tarmoqlar', 'M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M12 8a4 4 0 100 8 4 4 0 000-8z', 'Yoritish, muhandislik tarmoqlari, texnik shartlar.'],
  [9, 'Iqtisod', 'M4 19h16M7 16V9M12 16V5M17 16v-4', 'Narx kitobi va yiriklashtirilgan smeta.'],
  [10, 'Albom', 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6', 'A3 loyiha albomi: ramka va shtamp bilan, PDF.'],
];
/** Har bosqichdagi yigʻiladigan boʻlimlar (Master reja «acc») */
const STEP_MODS: Partial<Record<Step, [Mod, string][]>> = {
  6: [['reja', 'Reja va elementlar'], ['kesim', 'Kesimlar va qirgʻoqlar']],
  7: [['ekish', 'Ekish va fasllar'], ['assort', 'Assortiment (oʻz turlaringiz)'], ['fauna', 'Yashash muhitlari va fauna']],
  8: [['tarmoq', 'Yoritish va tarmoqlar']],
  9: [['narx', 'Narx kitobi va smeta']],
};
const mod = (st: Step = S.step): Mod | null => S.modBy?.[st] ?? STEP_MODS[st]?.[0]?.[0] ?? null;
const NEED_MODR = (m: Mod | null) => !!m && m !== 'ekish' && m !== 'reja' && m !== 'assort';
const can = (s: Step): boolean => s === 1 || (s === 2 && !!S.site) || (s >= 3 && s <= 5 && !!A) || (s >= 6 && !!V);
const LAST = 10 as Step;
const done = (s: Step): boolean => (s === 1 && !!S.site) || (s === 2 && !!data) || (s >= 3 && s <= 4 && !!A) || (s === 5 && !!V) || (s === 6 && !!V) || (s === 7 && !!PLT) || (s >= 8 && s <= 9 && !!MODR) || (s === 10 && sheets.length > 0);
function go(s: Step): void { if (!can(s)) return; sheetsEl.hidden = true; aksoEl.hidden = true; aksoCur = null; S.step = s; save(); render(); paint(); if (s === 5 && !V) void runDesign(); if (s >= 6 && s <= 9) void ensureMods(); }
async function ensureMods(): Promise<void> { if (!PLT) await runPlant(); if (NEED_MODR(mod()) && !MODR) await runModul(); }
function render(): void {
  rail.replaceChildren(...STEPS.map(([n, name, d]) => h('button', { type: 'button', class: `rb${can(n) ? '' : ' locked'}`, 'data-step': n, title: tr(name), 'aria-label': tr(name), 'aria-current': S.step === n ? 'step' : null, disabled: !can(n), onclick: () => go(n) },
    pth(d), done(n) ? h('span', { class: 'dn' }) : '', h('span', { class: 'n' }, String(n)))));
  const [n, name, , lead] = STEPS[S.step - 1];
  const body = [stepHudud, stepData, stepTahlil, stepDastur, stepVariant, stepMods, stepMods, stepMods, stepMods, stepVaraq][S.step - 1]();
  const prev = (n - 1) as Step, next = (n + 1) as Step;
  left.replaceChildren(
    h('header', {}, h('div', { class: 'sp-step' }, h('span', {}, tf('Bosqich ${n} / ${t}', { n, t: LAST })), h('div', { class: 'sp-prog' }, h('i', { style: `width:${Math.round(n / LAST * 100)}%` }))),
      h('h2', { class: 'sp-title' }, tr(name)), h('p', { class: 'sp-lead' }, tr(lead))),
    h('div', { class: 'sp-body bg-body', id: 'bgBody' }, ...body),
    h('footer', { class: 'sp-foot' },
      h('button', { type: 'button', class: 'btn', id: 'bgPrev', disabled: n === 1 || !!busy, onclick: () => go(prev) }, '← ', tr('Oldingi')),
      n < LAST ? h('button', { type: 'button', class: 'btn btn-primary', id: `bgNext${next}`, disabled: !can(next) || !!busy, onclick: () => go(next) }, tr('Keyingi'), ' →') : h('button', { type: 'button', class: 'btn btn-primary', id: 'bgOpenSheets2', disabled: !!busy || !V, onclick: () => void openSheets() }, tr('Albomni ochish'))));
  renderHeader(); renderCtl(); renderKpi(); renderStatus(); renderLegend(); renderTools();
}
/** xarita boshqaruvi — tepada oʻngda (Master reja .mapctl): Tahlil qatlamlari */
function renderCtl(): void {
  mapctl.replaceChildren(...(S.step === 3 && A ? [h('div', { class: 'seg glassbar bg-layseg', id: 'bgLayer', role: 'group', 'aria-label': tr('Qatlam') }, ...([['cls', 'Cheklovlar'], ['slope', 'Nishab'], ['trees', 'Daraxtlar']] as const).map(([k, n]) => h('button', { type: 'button', 'aria-pressed': S.layer === k, onclick: () => { S.layer = k; save(); render(); paint(); } }, tr(n))))] : []));
}
/** koʻrsatkichlar — pastda oʻngda (Master reja .kpibar) */
function renderKpi(): void {
  const K: [string, string, string?][] = [];
  if (A) K.push([`${fmt(A.areaHa, 2)}`, tr('Maydon, ga'), A.minOk ? 'pass' : 'fail'], [fmt(A.visitors.N1), tr('Bir vaqtda, kishi')], [fmt(A.trees.n), tr('Mavjud daraxt')]);
  const v = V?.[showVar]; if (v) K.push([`${fmt(v.m.greenPct, 1)} %`, tr('Koʻkalamzor'), v.m.greenPct >= 70 ? 'pass' : 'fail']);
  if (PLT) K.push([`${fmt(PLT.canopy1, 1)} %`, tr('Toj qoplami'), PLT.canopy1 >= 29.5 ? 'pass' : undefined]);
  if (MODR) K.push([`${fmt(MODR.smeta.tot / 1e6)}${MODR.smeta.unpriced ? '*' : ''}`, tr('Smeta, mln soʻm')]);
  kpiEl.hidden = !K.length;
  kpiEl.replaceChildren(...K.map(([b, s, st]) => h('div', { class: 'kpi', 'data-s': st ?? null }, h('b', {}, b), h('span', {}, s))));
}
const row = (k: string, v: string, tag = '') => h('div', { class: 'bg-row' }, h('span', {}, k), h('b', {}, v, tag ? h('em', { class: 'tag' }, tag) : ''));
const sec = (t: string) => h('div', { class: 'bg-sec' }, tr(t));
const note = (t: string) => h('p', { class: 'bg-note' }, t);
/** «Keyingi» endi panel pastida (sp-foot); bosqich ichida tugma yoʻq */
const nextBtn = (_s: Step, _label: string, _en?: boolean): Node => document.createTextNode('');
function renderStatus(): void { statusEl.hidden = !busy; statusEl.replaceChildren(h('i', { class: 'spin' }), h('span', {}, busy)); }

/* 1. Hudud */
function stepHudud(): Node[] {
  const q = h('input', { class: 'input', id: 'bgQ', type: 'search', placeholder: tr('Manzil yoki bogʻ nomi'), onkeydown: async (e: KeyboardEvent) => { if (e.key !== 'Enter') return; const v = (e.target as HTMLInputElement).value.trim(); if (!v) return; try { found = await geocode(v, S.c); } catch { found = []; toast(tr('Qidiruv ishlamadi')); } render(); } });
  const out: Node[] = [h('div', { class: 'bg-search' }, ic('M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4'), q)];
  if (found.length) out.push(h('div', { class: 'bg-res' }, ...found.slice(0, 6).map(p => h('button', { type: 'button', onclick: () => { found = []; S.c = p.at; map?.flyTo({ center: p.at as [number, number], zoom: 16 }); save(); render(); } }, h('b', {}, p.name), h('span', {}, p.detail)))));
  out.push(note(drawing ? tr('Burchaklarni bosing; tugatish — ikki marta bosish yoki Enter. Esc — bekor.') : tr('Xaritada bogʻ ichini bosing — OSM dagi chegarasi taklif qilinadi.')));
  if (cands.length) out.push(sec('Topilgan bogʻlar'), h('div', { class: 'bg-res', id: 'bgCands' }, ...cands.map(c => h('button', { type: 'button', 'data-id': c.id, onclick: () => setSite(c.ring, c.name, c.id) }, h('b', {}, c.name), h('span', {}, `${fmt(c.areaHa, 2)} ga · OSM ${c.id}`)))));
  out.push(h('button', { type: 'button', class: 'btn btn-block', id: 'bgDraw', onclick: () => { drawing = drawing ? null : []; cands = []; render(); paint(); } }, drawing ? tr('Chizishni bekor qilish') : tr('Chegarani qoʻlda chizish')));
  if (S.site) {
    const s = S.site;
    out.push(sec('Tanlangan hudud'), row(tr('Nomi'), s.name), row(tr('Maydoni'), `${fmt(ringAreaHa(s.boundary.map(p => frame(s.origin).toGeo(p))), 2)} ga`), row(tr('Manba'), s.src ?? tr('qoʻlda chizilgan')));
    const name = h('input', { class: 'input', id: 'bgName', value: s.name, onchange: (e: Event) => { s.name = (e.target as HTMLInputElement).value.trim() || s.name; save(); } });
    const KINDS: [Kind, string][] = [['shahar', 'Shahar bogʻi'], ['tuman', 'Tuman bogʻi'], ['turarjoy', 'Turar joy bogʻi'], ['xiyobon', 'Xiyobon / skver'], ['ormon', 'Oʻrmon-bogʻ']];
    out.push(h('label', { class: 'bg-lbl' }, tr('Loyiha nomi'), name),
      h('label', { class: 'bg-lbl' }, tr('Bogʻ turi (ShNQ 2.07.01-23, 481/490)'), h('select', { class: 'input', id: 'bgKind', onchange: (e: Event) => { s.kind = (e.target as HTMLSelectElement).value as Kind; S.prog = undefined; A = null; V = null; save(); render(); } }, ...KINDS.map(([k, n]) => h('option', { value: k, selected: s.kind === k }, tr(n))))),
      h('label', { class: 'bg-chk' }, h('input', { type: 'checkbox', id: 'bgRek', checked: s.rekonstruksiya, onchange: (e: Event) => { s.rekonstruksiya = (e.target as HTMLInputElement).checked; A = null; V = null; save(); render(); } }), tr('Rekonstruksiya (minimal maydon −20 %)')),
      h('label', { class: 'bg-chk' }, h('input', { type: 'checkbox', id: 'bgTar', checked: !!s.tarixiy, onchange: (e: Event) => { s.tarixiy = (e.target as HTMLInputElement).checked; S.prog = undefined; A = null; V = null; save(); render(); } }), tr('Tarixiy yoki rasmiy makon (mavjud kompozitsiya saqlanadi)')),
      nextBtn(2, 'Maʼlumotga oʻtish'));
    // Topshiriq (15.11): maqsad, byudjet, foydalanuvchilar, saqlanadigan obyektlar
    const B: Brief = S.brief ?? { goal: '', budget: null, users: [], keep: '' }, setB = (p: Partial<Brief>) => { S.brief = { ...(S.brief ?? B), ...p }; sheets = []; save(); };
    const USERS: [string, string][] = [['bolalar', 'Bolalar'], ['oila', 'Oilalar'], ['yoshlar', 'Yoshlar'], ['keksalar', 'Keksalar'], ['sport', 'Sport bilan shugʻullanuvchilar'], ['mgn', 'Harakati cheklanganlar'], ['sayyoh', 'Sayyohlar'], ['ishchi', 'Atrofdagi ishchilar']];
    out.push(sec('Topshiriq'),
      h('label', { class: 'bg-lbl' }, tr('Maqsad'), h('textarea', { class: 'input bg-ta', id: 'bgGoal', rows: 3, placeholder: tr('Masalan: mahalla uchun soyali sayr bogʻi, koʻl qirgʻogʻini ekologik tiklash'), onchange: (e: Event) => setB({ goal: (e.target as HTMLTextAreaElement).value.trim() }) }, B.goal)),
      h('label', { class: 'bg-num' }, h('span', {}, tr('Byudjet chegarasi')), h('input', { class: 'input', id: 'bgBudget', type: 'number', min: 0, step: 100, value: B.budget != null ? String(B.budget) : '', placeholder: '—', onchange: (e: Event) => { const v = (e.target as HTMLInputElement).value; setB({ budget: v === '' ? null : Math.max(0, +v) }); } }), h('em', {}, tr('mln'))),
      h('div', { class: 'bg-lbl' }, tr('Asosiy foydalanuvchilar'), h('div', { class: 'bg-chips', id: 'bgUsers' }, ...USERS.map(([k, n]) => h('button', { type: 'button', class: 'uchip', 'aria-pressed': B.users.includes(k), onclick: () => { const U = S.brief?.users ?? []; setB({ users: U.includes(k) ? U.filter(x => x !== k) : [...U, k] }); render(); } }, tr(n))))),
      h('label', { class: 'bg-lbl' }, tr('Saqlanishi shart obyektlar'), h('textarea', { class: 'input bg-ta', id: 'bgKeep', rows: 2, placeholder: tr('Masalan: yodgorlik, eski chinorlar xiyoboni, favvora'), onchange: (e: Event) => setB({ keep: (e.target as HTMLTextAreaElement).value.trim() }) }, B.keep)));
  }
  return out;
}
function setSite(ring: LngLat[], name: string, srcId?: string): void {
  setSvcThumb(ctxProject(), ringSvg(ring as [number, number][], '#d62828'));   // 23.11: Loyihalarim kartasi — bogʻ chegarasi (doim qizil)
  const o: LngLat = [ring.reduce((a, p) => a + p[0], 0) / ring.length, ring.reduce((a, p) => a + p[1], 0) / ring.length], F = frame(o);
  S.site = { name, place: 'Toshkent', origin: [+o[0].toFixed(7), +o[1].toFixed(7)], boundary: ring.map(F.toLocal), kind: guessKind(name, ringAreaHa(ring)), tarixiy: guessTarixiy(name), rekonstruksiya: S.site?.rekonstruksiya ?? true, src: srcId ? `OSM ${srcId}` : undefined };
  S.prog = undefined; SUG = null;
  data = null; A = null; V = null; S.dataKey = null; sheets = []; cands = []; drawing = null; for (const k in src) src[k] = { st: 'wait' };
  save(); render(); paint(); fit();
}

/* 2. Maʼlumot */
const SRC_NAMES: [string, string, string][] = [['osm', 'OpenStreetMap', 'binolar, yoʻllar, suv, bogʻlar, bekatlar (ODbL)'], ['trees', 'Daraxtlar reyestri', REGISTRY_CITE], ['dem', 'Relyef', 'AWS Terrain Tiles (Terrarium, SRTM ~30 m) — P'], ['pop', 'Aholi', 'GHS-POP R2023A, JRC (A)']];
function stepData(): Node[] {
  const st = (k: string) => { const s = src[k]; return h('span', { class: `chip ${s.st === 'ok' ? 'ok' : s.st === 'err' ? 'bad' : s.st === 'run' ? 'warn' : 'na'}` }, s.st === 'ok' ? (s.n ?? '✓') : s.st === 'err' ? tr('xato') : s.st === 'run' ? tr('yuklanmoqda') : tr('kutilmoqda')); };
  return [sec('Manbalar'), h('div', { class: 'bg-srcs' }, ...SRC_NAMES.map(([k, n, d]) => h('div', { class: 'bg-src', 'data-src': k }, h('div', {}, h('b', {}, tr(n)), st(k)), h('span', {}, d)))),
    note(tr('Atrof radiusi — chegaradan 1,2 km (OSM), daraxtlar va relyef — chegaradan 60 m. Topo-syomka (DXF) boʻlsa — relyef undan olinadi.')),
    h('button', { type: 'button', class: 'btn btn-primary btn-block', id: 'bgLoad', disabled: !!busy, onclick: () => void loadData() }, data ? tr('Qayta yuklash') : tr('Maʼlumotni yuklash')),
    ...(A ? [nextBtn(3, 'Tahlilga oʻtish')] : [])];
}
async function loadData(): Promise<void> {
  if (!S.site) return;
  const s = S.site, F = frame(s.origin), xs = s.boundary.map(p => p[0]), ys = s.boundary.map(p => p[1]);
  const g0 = F.toGeo([Math.min(...xs) - 1200, Math.min(...ys) - 1200]), g1 = F.toGeo([Math.max(...xs) + 1200, Math.max(...ys) + 1200]);
  const s0 = F.toGeo([Math.min(...xs) - 60, Math.min(...ys) - 60]), s1 = F.toGeo([Math.max(...xs) + 60, Math.max(...ys) + 60]);
  const d: BgData = { at: new Date().toISOString(), osm: [], trees: [], dem: null, pop: [], popSrc: '', nets: [], tu: [] };
  const run = async (k: string, f: () => Promise<string>) => { src[k] = { st: 'run' }; render(); try { src[k] = { st: 'ok', n: await f() }; } catch (e) { console.warn(k, e); src[k] = { st: 'err' }; } render(); };
  busy = tr('Maʼlumot yuklanmoqda…'); render();
  await Promise.all([
    run('osm', async () => { d.osm = parseOsm(await overpass(osmQuery([g0[0], g0[1], g1[0], g1[1]]), fetch, m => { busy = m; renderStatus(); }), F); return tf('${n} obyekt', { n: fmt(d.osm.length) }); }),
    run('trees', async () => { d.trees = await loadTrees([s0[0], s0[1], s1[0], s1[1]], F); return tf('${n} daraxt', { n: fmt(d.trees.length) }); }),
    run('dem', async () => { d.dem = await loadDem([s0[0], s0[1], s1[0], s1[1]], F, 5); return d.dem ? `${d.dem.nx}×${d.dem.ny}` : '—'; }),
    run('pop', async () => { const r = await loadPop(s.origin, 1500, F); d.pop = r.pop; d.popSrc = r.src; return tf('${n} katak', { n: fmt(d.pop.length) }); }),
  ]);
  busy = '';
  if (src.osm.st !== 'ok') { toast(tr('OSM yuklanmadi — qayta urinib koʻring')); render(); return; }
  data = d; S.dataKey = scoped(`bg:data:${s.origin.join(',')}:${s.boundary.length}`); await cachePut(S.dataKey, d); save();
  await runAnalyze(); if (A) go(3);
}
async function runAnalyze(): Promise<void> {
  if (!S.site || !data) return;
  busy = tr('Tahlil…'); V = null; MODR = null; sheets = []; render();
  const m = await ask({ t: 'analyze', site: S.site, data, opt: S.opt });
  busy = '';
  if (m.t === 'analyzed') { SUG = m.sug ?? null; A = m.A; geo = { trees: m.geo.trees, classes: m.geo.classes, slope: m.geo.slope }; } else if (m.t === 'error') toast(m.msg);
  render(); paint();
}

/* 3. Tahlil */
function stepTahlil(): Node[] {
  if (!A) return [note(tr('Avval maʼlumotni yuklang.'))];
  const K = A.constraints, num = (k: keyof AnOpt, label: string, min: number, max: number) => h('label', { class: 'bg-num' }, h('span', {}, tr(label)), h('input', { class: 'input', type: 'number', min, max, step: 1, value: String(S.opt[k]), 'data-opt': k, onchange: (e: Event) => { const v = +(e.target as HTMLInputElement).value; if (Number.isFinite(v)) { (S.opt as unknown as Record<string, unknown>)[k] = Math.max(min, Math.min(max, v)); save(); } } }), h('em', {}, 'm'));
  return [
    sec('Hudud'), row(tr('Maydon'), `${fmt(A.areaHa, 2)} ga`), row(tr('Min. maydon (481/490)'), `≥ ${fmt(A.minHa, 1)} ga ${A.minOk ? '✓' : '✗'}`, 'N'),
    row(tr('Aholi 300 m / 1 km'), `${fmt(A.pop.r300)} / ${fmt(A.pop.r1000)}`, 'A'), row(tr('Metro'), A.metro ? `${fmt(A.metro.d)} m` : '—'),
    sec('Relyef va daraxtlar'), row(tr('Nishab median'), `${fmt(A.relief.slopeMed, 1)} %`, 'P'), row(tr('> 8 % nishab'), `${fmt(A.relief.over8 * 100)} %`), row(tr('Daraxtlar'), `${fmt(A.trees.n)} · ${A.trees.species} ${tr('tur')}`), row(tr('≥ 40 sm'), fmt(A.trees.big40)), row(tr('Toj soyasi'), `${fmt(A.trees.canopy, 1)} %`),
    sec('Cheklovlar'), row(tr('Erkin'), `${fmt(K.green / 1e4, 2)} ga`), row(tr('Cheklangan'), `${fmt(K.yellow / 1e4, 2)} ga`), row(tr('Mumkin emas'), `${fmt(K.red / 1e4, 2)} ga`),
    num('canalStrip', 'Kanal sohil mintaqasi', 0, 60), num('shore', 'Koʻl qirgʻogʻi', 0, 40), num('noise', 'Magistral shovqini', 0, 120),
    note(tr('Mintaqa kengliklari — foydalanuvchi qiymati (P): nizom matni bilan tekshirilsin.')),
    h('button', { type: 'button', class: 'btn btn-block', id: 'bgReAn', disabled: !!busy, onclick: () => void runAnalyze() }, tr('Qayta hisoblash')),
    nextBtn(4, 'Dasturga oʻtish'),
  ];
}

/* 4. Dastur */
function stepDastur(): Node[] {
  if (!A) return [];
  const v = A.visitors;
  const sIn = h('input', { class: 'input', type: 'number', id: 'bgS', min: 0.1, max: 0.6, step: 0.05, value: String(S.opt.s[0]), onchange: (e: Event) => { const x = +(e.target as HTMLInputElement).value; if (Number.isFinite(x)) { S.opt.s = [x, Math.max(x, S.opt.s[1])]; save(); void runAnalyze(); } } });
  const kIn = h('input', { class: 'input', type: 'number', id: 'bgK', min: 1, max: 6, step: 0.5, value: String(S.opt.k), onchange: (e: Event) => { const x = +(e.target as HTMLInputElement).value; if (Number.isFinite(x)) { S.opt.k = x; save(); void runAnalyze(); } } });
  return [
    sec('Tashrif modeli'), h('div', { class: 'bg-formula' }, `N₁ = min(A·q; P·s/k) = min(${fmt(v.capacity)}; ${fmt(v.demand)}) = `, h('b', {}, `${fmt(v.N1)} ${tr('kishi')}`)),
    row(tr('Kunlik'), `${fmt(v.Nday)} ${tr('kishi')}`), row(tr('Zichlik'), `${fmt(v.perHa)} / ${v.q} ${tr('kishi/ga')}`, 'N'), row(tr('Hojatxonalar'), `${A.toilets}`, 'T'),
    h('label', { class: 'bg-num' }, h('span', {}, tr('Tashrif ulushi s (34-jadval)')), sIn, h('em', {}, '')), h('label', { class: 'bg-num' }, h('span', {}, tr('Aylanma k')), kIn, h('em', {}, '')),
    sec('Xizmatlar (33-jadval)'), h('table', { class: 'bg-tab' }, h('tr', {}, h('th', {}, tr('Xizmat')), h('th', {}, tr('Kerak'))), ...A.program.map(p => h('tr', {}, h('td', {}, tr(p.k)), h('td', {}, p.need)))),
    ...progEditor(),
    nextBtn(5, 'Variantlarga oʻtish'),
  ] as Node[];
}

/** Dastur elementlari: nima va nechta — taklifdan boshlanadi, foydalanuvchi oʻzgartiradi; joyini generator qoidalar bilan topadi */
function progEditor(): Node[] {
  const P: Prog = S.prog ?? SUG?.prog ?? {};
  const set = (k: ElKey, n: number) => { S.prog = { ...P, [k]: Math.max(0, Math.min(12, n)) }; V = null; PLT = null; MODR = null; sheets = []; save(); render(); };
  const sportA = (Object.keys(P) as ElKey[]).filter(k => ELEM[k]?.zone === 'sport_yangi').reduce((s, k) => s + (P[k] ?? 0) * ELEM[k].w * ELEM[k].d, 0);
  return [
    sec('Dastur elementlari'),
    note(tr(SUG?.why ?? 'Elementlar soni bogʻ turi va maydonidan taklif qilinadi.')),
    row(tr('Yangi sport maydonlari'), `${fmt(sportA)} m²${SUG ? ` · ${tr('ehtiyoj')} ${fmt(SUG.sportNeed)} m²` : ''}`, 'N'),
    ...EL_GROUPS.flatMap(([g, ks]) => [h('div', { class: 'bg-elg' }, tr(g)), ...ks.map(k => h('div', { class: 'bg-el', 'data-el': k, title: `${String(ELEM[k].w).replace('.', ',')} × ${String(ELEM[k].d).replace('.', ',')} m · ${tr(ELEM[k].note)} (${ELEM[k].src})` },
      h('span', {}, tr(ELEM[k].n)),
      h('button', { type: 'button', class: 'btn btn-sm btn-ghost', 'aria-label': tr('Kamaytirish'), disabled: !(P[k] ?? 0), onclick: () => set(k, (P[k] ?? 0) - 1) }, '−'),
      h('b', {}, String(P[k] ?? 0)),
      h('button', { type: 'button', class: 'btn btn-sm btn-ghost', 'aria-label': tr('Koʻpaytirish'), onclick: () => set(k, (P[k] ?? 0) + 1) }, '+')))]),
    S.prog ? h('button', { type: 'button', class: 'btn btn-sm btn-block', id: 'bgProgReset', onclick: () => { S.prog = undefined; V = null; PLT = null; MODR = null; sheets = []; save(); render(); } }, tr('Taklifga qaytarish')) : '',
    note(tr('Joyni generator tanlaydi: yoʻlga yaqin, daraxtlarga eng kam zarar, sport maydonlari yonma-yon va shimol–janub oʻqida. Master reja bosqichida har elementni surish, burish, almashtirish va olib tashlash mumkin.')),
  ] as Node[];
}

/* 5. Variantlar */
async function runDesign(): Promise<void> {
  if (!A) return;
  busy = tr('Uch variant hisoblanmoqda…'); render();
  const m = await ask({ t: 'design', ...(S.prog ? { prog: S.prog } : {}) }); busy = '';
  if (m.t === 'designed') { MODR = null; V = m.V; VO = { ...m.V }; geo.v = m.geo; showVar = S.chosen; if (S.edits?.length) await sendEdits(); } else if (m.t === 'error') toast(m.msg);
  render(); paint();
}
function stepVariant(): Node[] {
  if (!V) return [note(busy || tr('Variantlar hisoblanmoqda…'))];
  return [
    note(tr('Yoʻllar manba–manzil oqimidan, nishab va daraxtlarni hisobga olib quriladi; amfiteatr, terrasa, koʻpriklar, qushxona — qoidalar bilan.')),
    ...VARS.filter(vd => V![vd.id]).map(vd => { const v = V![vd.id]; return h('div', { class: `bg-var${showVar === vd.id ? ' on' : ''}${S.chosen === vd.id ? ' chosen' : ''}`, 'data-var': vd.id },
      h('button', { type: 'button', class: 'hd', onclick: () => { showVar = vd.id; render(); paint(); } }, h('b', {}, v.name), S.chosen === vd.id ? h('span', { class: 'chip ok' }, tr('tanlangan')) : ''),
      h('div', { class: 'mx' }, h('span', {}, `${tr('Yashil')} ${fmt(v.m.greenPct, 1)} %`), h('span', {}, `${tr('Qattiq')} ${fmt(v.m.hard)} m²`), h('span', {}, `${v.m.gates} ${tr('darvoza')}`), h('span', {}, `${tr('Zina/rampa')} ${fmt(v.m.zina)}/${fmt(v.m.rampa)} m`), h('span', {}, `${tr('Ziddiyat')} ${v.m.conflict} (${v.m.conflictBig})`)),
      showVar === vd.id ? h('ol', { class: 'bg-items' }, ...v.items.map(it => h('li', {}, h('b', {}, tr(it.name)), h('span', {}, it.rule)))) : '',
      showVar === vd.id && v.miss?.length ? note(`${tr('Joylanmadi')}: ${v.miss.map(x => tr(ELEM[x.el as ElKey]?.n ?? x.el)).join(', ')} — ${tr(v.miss[0].why)}`) : '',
      S.chosen !== vd.id ? h('button', { type: 'button', class: 'btn btn-sm', onclick: () => { if (S.edits?.length && !confirm(tr('Boshqa variant tanlansa, qoʻlda kiritilgan tahrirlar oʻchadi. Davom etilsinmi?'))) return; S.edits = []; redo = []; S.chosen = vd.id; showVar = vd.id; sheets = []; PLT = null; MODR = null; geo.plant = undefined; save(); render(); paint(); } }, tr('Shu variantni tanlash')) : ''); }),
    nextBtn(6, 'Loyihaga oʻtish', !!V),
  ] as Node[];
}

/* 6. Loyiha: modullar */
let assortSent = '', assortWarn: string[] = [];
/** Assortimentni worker'ga yuborish (oʻzgargan boʻlsa) */
async function syncAssort(): Promise<void> { const k = JSON.stringify(S.assort ?? null); if (k === assortSent) return; const m = await ask({ t: 'assort', u: S.assort ?? null }); if (m.t === 'assorted') { assortWarn = m.warn; assortSent = k; } }
async function runPlant(): Promise<void> {
  if (!V) return; await syncAssort(); busy = tr('Ekish rejasi…'); render();
  const m = await ask({ t: 'plant', chosen: S.chosen }); busy = '';
  if (m.t === 'planted') { PLT = m.P; geo.plant = m.geo; } else if (m.t === 'error') toast(m.msg);
  render(); paint();
}
async function runModul(): Promise<void> {
  if (!V || busy) return; await syncAssort(); busy = tr('Modullar hisoblanmoqda…'); render();
  const m = await ask({ t: 'modul', chosen: S.chosen, tu: S.tu ?? [], prices: S.prices ?? {} }); busy = '';
  if (m.t === 'modul') { MODR = m.M; modGeo = m.geo; } else if (m.t === 'error') toast(m.msg);
  render(); paint();
}
const tbl = (head: string[], rows: (string | Node)[][]) => h('table', { class: 'bg-tab' }, h('tr', {}, ...head.map(x => h('th', {}, tr(x)))), ...rows.map(r => h('tr', {}, ...r.map(c => h('td', {}, c)))));
const NETK: [NetKind, string][] = [['suv', 'Suv'], ['kanal', 'Kanalizatsiya'], ['elektr', 'Elektr'], ['sugorish', 'Sugʻorish'], ['aloqa', 'Aloqa']];
function stepMods(): Node[] {
  const MODS = STEP_MODS[S.step] ?? [], cur = mod()!;
  const body: Node[] = [];
  if (cur === 'reja') body.push(...stepReja());
  else if (cur === 'ekish') {
    if (!PLT) body.push(note(busy || tr('Ekish rejasi hisoblanmoqda…')));
    else { const P = PLT; body.push(
      sec('Mavjud daraxtlar'), row(tr('Saqlanadi'), fmt(P.counts.saqlanadi)), row(tr('Yoʻl suriladi — qimmatbaho tur (moratoriy)'), fmt(P.counts.yol_suriladi), 'N'), row(tr('Koʻchiriladi (d ≤ 15 sm)'), fmt(P.counts.kochiriladi), 'N'), row(tr('Kesiladi — kam qimmatli tur'), fmt(P.counts.kesiladi), 'N'),
      ...(P.lawBal ? [row(tr('Ruxsatnoma toʻlovi'), `${fmt(P.lawBal.feeSom)} soʻm`, 'N'), row(tr('Kompensatsiya koʻchatlari (5 yillik)'), fmt(P.lawBal.compSaplings), 'N'), ...(P.lawBal.review ? [row(tr('Tur yoki diametr nomaʼlum'), fmt(P.lawBal.review), 'REVIEW')] : [])] : []),
      sec('Yangi ekish'), row(tr('Daraxtlar / buta guruhlari'), `${P.nTrees} / ${P.nShrubs}`), row(tr('Toj qoplami'), `${fmt(P.canopy0, 1)} → ${fmt(P.canopy1, 1)} %`, 'A'), row(tr('Mahalliy turlar'), `${fmt(P.native)} %`), row(tr('Kam suv talab qiladigan'), `${fmt(P.lowWater)} %`),
      row(tr('R22: eng koʻp tur'), `${P.r22.sp[0]} ${fmt(P.r22.sp[1], 1)} %`, P.r22.ok ? '✓' : '✗'),
      sec('Turlar'), h('table', { class: 'bg-tab' }, ...P.mix.slice(0, 12).map(x => h('tr', {}, h('td', {}, h('i', {}, x.lat)), h('td', {}, String(x.nNew))))),
      note(tr('Belgilar — AUTOCAD_Library.dwg kutubxonasidan; assortiment — 1979 II-A + POWO. Toj — yetuk holatda (P).'))); }
  } else if (cur === 'assort') body.push(...stepAssort());
  else if (!MODR) body.push(note(busy || tr('Modullar hisoblanmoqda…')));
  else if (cur === 'kesim') {
    const M = MODR;
    body.push(sec('Kesimlar'), tbl(['Kesim', 'Uzunlik', 'Balandlik', 'Daraxt'], M.kesim.map(k => [k.name, `${fmt(k.len)} m`, `${fmt(k.z0, 1)}…${fmt(k.z1, 1)}`, String(k.trees)])),
      note(tr('Chiziqlar qoidalar bilan: A–A amfiteatrdan koʻl markazi orqali, B–B — unga perpendikulyar. Relyef 1 m qadamda, vertikal masshtab buzilmagan; koʻl chuqurligi 1,4 m (P).')));
    if (M.shore.length) body.push(sec('Qirgʻoq tipologiyalari'), tbl(['Tipologiya', 'm', '%'], M.shore.map(x => [h('span', {}, h('i', { class: 'sw', style: `background:${x.c}` }), x.n), fmt(x.len), fmt(x.len / Math.max(1, M.perim) * 100)])), note(tr('Tipologiya qirgʻoqning har 6 m boʻlagiga qoidalar bilan beriladi: qiyalik, yoʻl, dastur elementi, kanal.')));
  } else if (cur === 'fauna') {
    const F = MODR.fauna, mx = Math.max(1, ...F.fruit, ...F.flower), M0 = 'I II III IV V VI VII VIII IX X XI XII'.split(' ');
    body.push(sec('Yashash muhitlari'), tbl(['Muhit', 'm²'], F.areas.map(a => [h('span', {}, h('i', { class: 'sw', style: `background:${a.c}` }), a.n), fmt(a.m2)])),
      row(tr('Shennon H′ / J'), `${fmt(F.H, 2)} / ${fmt(F.J, 2)}`, 'T'), row(tr('Sokin hudud (≥ 30 m)'), `${fmt(F.quiet)} m²`, 'T'), row(tr('Yoʻldan ≥ 100 m'), F.quiet100 ? `${fmt(F.quiet100)} m²` : `${tr('yoʻq')} (max ${fmt(F.maxQuiet)} m)`, 'A'),
      row(tr('Keksa daraxtlar ≥ 40 sm'), fmt(F.old), 'T'), row(tr('Uya qutilari: qush / koʻrshapalak'), `${F.qush} / ${F.kshap}`, 'T'), row(tr('Yumshoq qirgʻoq'), `${fmt(F.soft)} %`, 'T'),
      sec('Ozuqa kalendari'), h('div', { class: 'bg-cal', id: 'bgCal' }, ...M0.map((m, i) => h('div', {}, h('i', { class: 'fl', style: `height:${Math.round(28 * F.flower[i] / mx)}px` }), h('i', { class: 'fr', style: `height:${Math.round(28 * F.fruit[i] / mx)}px` }), h('span', {}, m)))),
      note(tr('Pushti — gullash, toʻq qizil — meva (daraxt va buta soni, fenologiya — P).')),
      sec('Fauna guruhlari va choralar'), ...F.guilds.map(g => h('div', { class: 'bg-guild' }, h('b', {}, g.n), h('span', {}, `${fmt(g.m2)} m² · ${g.act}`))),
      note(tr('Turlar soni bashorat qilinmaydi — faqat muhit sharoitlari. Manbalar albomning «Yashash muhitlari va fauna» varagʻida.')));
  } else if (cur === 'tarmoq') {
    const N = MODR.nets, tu = S.tu ?? [];
    body.push(sec('Texnik shartlar (TU)'),
      h('div', { class: 'bg-tu' }, h('select', { class: 'input', id: 'bgTuKind', onchange: (e: Event) => { placing = null; (e.target as HTMLSelectElement).dataset.v = (e.target as HTMLSelectElement).value; } }, ...NETK.map(([k, n]) => h('option', { value: k }, tr(n)))),
        h('input', { class: 'input', id: 'bgTuCap', type: 'number', min: 0, step: 1, placeholder: tr('Quvvat'), value: tuCap ? String(tuCap) : '', onchange: (e: Event) => { tuCap = +(e.target as HTMLInputElement).value || 0; } }),
        h('button', { type: 'button', class: `btn btn-sm${placing ? ' btn-primary' : ''}`, id: 'bgTuAdd', onclick: () => { placing = placing ? null : ((document.getElementById('bgTuKind') as HTMLSelectElement).value as NetKind); render(); } }, placing ? tr('Xaritani bosing…') : tr('Nuqta qoʻyish'))),
      ...(tu.length ? [tbl(['Tarmoq', 'Quvvat', ''], tu.map((t, i) => [tr(NETK.find(x => x[0] === t.kind)?.[1] ?? t.kind), `${fmt(t.cap)} ${t.unit}`, h('button', { type: 'button', class: 'btn btn-sm btn-ghost', 'aria-label': tr('Oʻchirish'), onclick: () => { S.tu = tu.filter((_, j) => j !== i); save(); MODR = null; sheets = []; void runModul(); } }, '×')]))] : [note(tr('TU kiritilmagan — ulanish nuqtalari taxminiy (eng yaqin katta koʻcha tomonidan, P).'))]),
      sec('Trassalar'), tbl(['Tarmoq', 'm', 'Ulanish', 'Daraxt ✗'], N.routes.map(r => [h('span', {}, h('i', { class: 'sw', style: `background:${r.c}` }), r.n), fmt(r.len), r.tu ? 'TU' : 'P', String(r.tree)])),
      sec('Yoritish'), tbl(['Yoʻl', 'lk', 's, m', 'Soni'], N.light.map(l => [({ asosiy: 'Asosiy yoʻl', ikkinchi: 'Ikkinchi darajali', sohil: 'Sohil yoʻli (past)', rampa: 'Rampa', zina: 'Zina (past)' } as Record<string, string>)[l.tier] ?? l.tier, fmt(l.lux), fmt(l.s, 1), String(l.n)])), row(tr('Ustun daraxtga < 4 m'), String(N.lampConf), N.lampConf ? '✗' : '✓'),
      sec('Yuklama'), row(tr('Elektr jami'), `${fmt(N.kw.total, 1)} kVt`, 'P'), row(tr('Ichimlik suvi'), `${fmt(N.water.day, 1)} m³/sut`, 'P'), row(tr('Sugʻorish'), `${fmt(N.water.irr[0])}–${fmt(N.water.irr[1])} m³/sut`, 'P'), row(tr('Yomgʻir: oqim / sigʻim'), `${fmt(N.storm.V)} / ${fmt(N.storm.cap)} m³`, 'P'),
      sec('Isteʼmolchilar'), ...N.cons.map(c => h('div', { class: 'bg-guild' }, h('b', {}, c.n), h('span', {}, c.why))),
      note(tr('Masofalar — ShNQ 2.07.01-23, 35- va 8-jadval (N); yoritilganlik — SNiP 23-05-95 (A). Trassa yoʻl boʻyidan, ildiz zonasi va binolardan qochib topiladi.')));
  } else if (cur === 'narx') {
    const SM = MODR.smeta, pr = S.prices ?? {};
    const recalc = () => { for (const l of SM.lines) { const u = (S.prices ?? {})[l.k]; if (u) { l.p = u.p; l.src = u.src || l.src; } l.sum = l.p != null ? l.p * l.q : null; } SM.tot = SM.lines.reduce((a, l) => a + (l.sum ?? 0), 0); SM.priced = SM.lines.filter(l => l.sum != null).length; SM.unpriced = SM.lines.length - SM.priced; };
    body.push(row(tr('Jami (narxlangan)'), `${fmt(SM.tot / 1e6, 1)} ${tr('mln soʻm')}`), ...(S.brief?.budget != null ? [row(tr('Byudjet chegarasi (topshiriq)'), `${fmt(S.brief.budget)} ${tr('mln soʻm')}`, SM.tot / 1e6 <= S.brief.budget ? '✓' : '✗')] : []), row(tr('Narxsiz bandlar'), String(SM.unpriced), SM.unpriced ? '✗' : '✓'),
      note(tr('Narx — bozor kuzatuvi yoki taklif; manbasini yozing. Narxsiz band smetada «—», jami «toʻliq emas».')),
      h('div', { class: 'bg-price', id: 'bgPrice' }, ...SM.lines.map(l => h('div', { class: 'pr' },
        h('b', {}, l.n), h('span', {}, `${fmt(l.q)} ${l.u}${l.sum != null ? ` · ${fmt(l.sum / 1e6, 1)} mln` : ''}`),
        h('input', { class: 'input', type: 'number', min: 0, step: 100, 'data-k': l.k, placeholder: (() => { const p0 = PRICE0.find(p => p.k === l.k); return p0?.lo ? `${fmt(p0.lo)}–${fmt(p0.hi ?? p0.lo)}` : tr('soʻm'); })(), value: l.p != null ? String(l.p) : '', onchange: (e: Event) => { const v = (e.target as HTMLInputElement).value; S.prices = { ...pr, [l.k]: { p: v === '' ? null : Math.max(0, +v), src: pr[l.k]?.src ?? '' } }; save(); recalc(); sheets = []; render(); } }),
        h('input', { class: 'input', type: 'text', placeholder: tr('Manba, sana'), value: pr[l.k]?.src ?? (l.src || ''), onchange: (e: Event) => { const v = (e.target as HTMLInputElement).value; S.prices = { ...(S.prices ?? {}), [l.k]: { p: (S.prices ?? {})[l.k]?.p ?? l.p, src: v } }; save(); sheets = []; } })))));
  }
  // Master reja «acc» boʻlimlari: bitta ochiq modul, qolganlari — qisqa xulosa bilan
  const M = MODR, sum: Record<Mod, string> = {
    reja: V?.[S.chosen] ? `${V[S.chosen].items.length} ${tr('element')} · ${(S.edits ?? []).length} ${tr('tahrir')}` : '',
    ekish: PLT ? `${PLT.nTrees} ${tr('daraxt')} · ${fmt(PLT.canopy1, 1)} %` : '',
    assort: `${ASSORT.length} ${tr('tur')}${(S.assort?.add.length ?? 0) ? ` · ${S.assort!.add.length} ${tr('oʻz')}` : ''}`,
    kesim: M ? `${M.kesim.length} ${tr('kesim')} · ${M.shore.length} ${tr('tipologiya')}` : '',
    fauna: M ? `H′ ${fmt(M.fauna.H, 2)} · ${M.fauna.qush + M.fauna.kshap} ${tr('quti')}` : '',
    tarmoq: M ? `${M.nets.routes.length} ${tr('tarmoq')} · ${fmt(M.nets.kw.total, 1)} kVt` : '',
    narx: M ? `${fmt(M.smeta.tot / 1e6)} ${tr('mln')}${M.smeta.unpriced ? ` · ${M.smeta.unpriced} ${tr('narxsiz')}` : ''}` : '',
  };
  const CHK = 'M5 12.5l4.5 4.5L19 7.5', CHV = 'M9 6l6 6-6 6';
  return [h('div', { class: 'acc-list', id: 'bgMods' }, ...MODS.map(([k, n], i) => {
    const open = cur === k, ok = !!sum[k];
    return h('div', { class: `acc${open ? ' open' : ''}`, 'data-mod': k },
      h('button', { type: 'button', class: 'acc-h', 'aria-expanded': open, 'data-mod': k, onclick: () => { S.modBy = { ...(S.modBy ?? {}), [S.step]: k }; placing = null; save(); render(); paint(); void ensureMods(); } },
        h('b', { class: open ? 'cur' : ok ? 'done' : '' }, ...(ok && !open ? [pth(CHK)] : [String(i + 1)])), h('span', { class: 'acc-t' }, tr(n)), h('span', { class: 'acc-s' }, sum[k]), h('span', { class: `acc-c${open ? ' up' : ''}`, 'aria-hidden': 'true' }, pth(CHV))),
      open ? h('div', { class: 'acc-b' }, ...body) : '');
  }))];
}


/* ---------------- qoʻlda tahrir (15.11): pastki asboblar paneli ---------------- */
let addEl: ElKey | '' = '';
type Tool = 'sel' | 'olch' | 'yol' | 'zona' | 'daraxt' | 'jihoz' | 'akso' | 'ochir';
type PMode = 'dona' | 'buta' | 'qator' | 'devor' | 'guruh' | 'doira';
let pmode: PMode = 'dona', psp = '', toolW: number | null = null, selPath: string | null = null, fcat: FCat = 'orindiq', fid = 'skameyka';
let tool: Tool = 'sel', draft: XY[] = [], selItem: string | null = null, redo: Edit[] = [], toolTier: Tier = 'ikkinchi', toolZone: ZoneKind = 'maydon', measure = '';
let VO: Record<string, Variant> | null = null, VERT: VSum | null = null, toolH = HILL_H;   // asl (tahrirsiz) variantlar — oʻchirish indekslari uchun
const TOOLS: [Tool, string, string, string][] = [
  ['sel', 'Tanlash va surish', 'M5 3l14 8-6 2-2 6z', 'Elementni bosing (amfiteatr, terrasa, qushxona), soʻng yangi joyni bosing'],
  ['yol', 'Yoʻl chizish', 'M4 20C8 14 9 8 20 4M4 20l2-5M20 4l-5 2', 'Nuqtalarni bosing; tugatish — ikki marta bosish yoki Enter'],
  ['zona', 'Zona chizish', 'M4 6l7-3 9 5-2 10-10 3-4-8z', 'Burchaklarni bosing; tugatish — ikki marta bosish yoki Enter'],
  ['daraxt', 'Koʻkalamzorlashtirish', 'M12 22v-6M12 16c-3.9 0-7-2.7-7-6.5C5 6 8 3 12 2c4 1 7 4 7 7.5 0 3.8-3.1 6.5-7 6.5z', 'Usulni tanlang: dona daraxt, buta, xiyobon qatori, tirik devor yoki guruh'],
  ['jihoz', 'Jihoz qoʻyish', 'M4 14h16M6 14v5M18 14v5M5 10h14v4H5zM7 10V7h10v3', 'Jihozni tanlang va joyini bosing — yoʻl yoʻnalishiga burilib qoʻyiladi'],
  ['akso', 'Aksonometriya', 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5', 'Hududning ikki qarama-qarshi burchagini bosing — shu qism aksonometriyasi chiziladi'],
  ['olch', 'Oʻlchash', 'M3 17L17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2', 'Nuqtalarni bosing: uzunlik; yopiq shakl — maydon'],
  ['ochir', 'Oʻchirish', 'M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3', 'Yoʻl, zona yoki daraxtni bosing'],
];
const L2 = (c: LngLat): XY => frame(S.site!.origin).toLocal(c) as XY;
const G2 = (p: XY): LngLat => frame(S.site!.origin).toGeo(p) as LngLat;
const dist = (a: XY, b: XY) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const segD = (p: XY, g: XY[]) => { let m = Infinity; for (let i = 1; i < g.length; i++) { const a = g[i - 1], b = g[i], dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)); m = Math.min(m, Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)); } return m; };
const lenOf = (g: XY[]) => g.reduce((s, q, i) => (i ? s + dist(q, g[i - 1]) : 0), 0);
const areaOf = (g: XY[]) => Math.abs(g.reduce((s, q, i) => { const r = g[(i + 1) % g.length]; return s + q[0] * r[1] - r[0] * q[1]; }, 0)) / 2;
const toolsOn = () => !!V && (S.step === 6 || S.step === 7);
async function sendEdits(): Promise<void> {
  if (!V) return; await syncAssort();
  const m = await ask({ t: 'edits', chosen: S.chosen, edits: S.edits ?? [] });
  if (m.t === 'edited') { VERT = m.vert; V = { ...V, [S.chosen]: m.V }; geo.v = { ...(geo.v ?? {}), [S.chosen]: m.geo }; } else if (m.t === 'error') toast(m.msg);
  PLT = null; MODR = null; sheets = []; geo.plant = undefined;
  if (S.step >= 7 && S.step <= 9) await ensureMods(); else if (S.step === 6 && mod() !== 'reja') await ensureMods();
  render(); paint();
}
function pushEdit(e: Edit): void { S.edits = [...(S.edits ?? []), e]; redo = []; save(); void sendEdits(); }
function undo(): void { const E = S.edits ?? []; if (!E.length) return; redo.push(E[E.length - 1]); S.edits = E.slice(0, -1); save(); void sendEdits(); }
function redoE(): void { const e = redo.pop(); if (!e) return; S.edits = [...(S.edits ?? []), e]; save(); void sendEdits(); }
function finishDraft(): void {
  const g = draft.slice(); draft = [];
  if (tool === 'yol' && g.length >= 2) pushEdit({ t: 'path', g, tier: toolTier, ...(toolW ? { w: toolW } : {}) });
  else if (tool === 'daraxt' && pmode === 'qator' && g.length >= 2) pushEdit({ t: 'row', g, ...(psp ? { sp: psp } : {}) });
  else if (tool === 'daraxt' && pmode === 'devor' && g.length >= 2) pushEdit({ t: 'hedge', g, ...(psp ? { sp: psp } : {}) });
  else if (tool === 'daraxt' && pmode === 'guruh' && g.length >= 3) pushEdit({ t: 'mass', ring: g });
  else if (tool === 'zona' && g.length >= 3) pushEdit({ t: 'zone', kind: toolZone, ring: g, ...(toolZone === 'tepalik' ? { h: toolH } : {}) });
  else if (tool === 'olch' && g.length >= 2) { measure = `${tr('Uzunlik')} ${fmt(lenOf(g))} m${g.length >= 3 ? ` · ${tr('maydon')} ${fmt(areaOf(g))} m²` : ''}`; }
  renderTools(); paint();
}
function toolClick(p: XY): void {
  const v = V?.[S.chosen]; if (!v) return;
  if (tool === 'akso') {
    draft.push(p); if (draft.length < 2) { measure = tr('Endi qarama-qarshi burchakni bosing'); renderTools(); paint(); return; }
    const [a, b] = draft; draft = []; measure = ''; const w = Math.abs(b[0] - a[0]), d = Math.abs(b[1] - a[1]);
    if (w < 15 || d < 15) { toast(tr('Hudud juda kichik — kamida 15 × 15 m')); renderTools(); paint(); return; }
    if (w > 600 || d > 600) { toast(tr('Hudud juda katta — 600 m gacha')); renderTools(); paint(); return; }
    aksoCur = { c: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], w, d, view: 0, ex: 1.5, labels: true, title: '' }; aksoIdx = -1; void openAkso(); renderTools(); paint(); return;
  }
  if (tool === 'yol' || tool === 'zona' || tool === 'olch') { draft.push(p); if (tool === 'olch' && draft.length >= 2) measure = `${tr('Uzunlik')} ${fmt(lenOf(draft))} m`; renderTools(); paint(); return; }
  if (tool === 'daraxt') {
    if (pmode === 'dona') { pushEdit({ t: 'tree', p, ...(psp ? { sp: psp } : {}) }); return; }
    if (pmode === 'buta') { pushEdit({ t: 'shrub', p, ...(psp ? { sp: psp } : {}) }); return; }
    if (pmode === 'doira') { if (!draft.length) { draft = [p]; measure = tr('Endi doira chetini bosing'); renderTools(); paint(); return; } const c = draft[0], r = dist(c, p); draft = []; measure = ''; if (r < 3) return; pushEdit({ t: 'mass', ring: Array.from({ length: 28 }, (_, i) => [c[0] + r * Math.cos(i / 28 * 2 * Math.PI), c[1] + r * Math.sin(i / 28 * 2 * Math.PI)] as XY) }); return; }
    draft.push(p); renderTools(); paint(); return;
  }
  if (tool === 'sel') {
    if (addEl) { pushEdit({ t: 'blk-add', el: addEl, p, a: ELEM[addEl].ns ? 105 * Math.PI / 180 : 0 }); addEl = ''; measure = ''; renderTools(); return; }
    if (selItem && v.blocks?.some(b => b.id === selItem)) { const near = v.blocks.find(b => b.id === selItem)!; if (dist(near.p, p) > 1) { pushEdit({ t: 'blk', id: selItem, p }); renderTools(); return; } }
    else if (selItem) { pushEdit({ t: 'move', id: selItem, to: p }); selItem = null; renderTools(); return; }
    const it = v.items.filter(x => ['amfiteatr', 'terrasa', 'qushxona'].includes(x.id) || v.blocks?.some(b => b.id === x.id)).sort((a, b) => dist(a.p, p) - dist(b.p, p))[0];
    selPath = null;
    if (it && dist(it.p, p) < 25) { selItem = it.id; measure = tf('«${n}» tanlandi — yangi joyni bosing', { n: tr(it.name) }); }
    else { const pq = v.paths.map(q => ({ q, d: segD(p, q.g) })).sort((a, b) => a.d - b.d)[0]; if (pq && pq.d < Math.max(4, pq.q.w)) { selPath = pq.q.ref ?? null; selItem = null; measure = ''; } else { selItem = null; measure = tr('Element yoki yoʻl topilmadi — markazini yoki chizigʻini bosing'); } }
    renderTools(); return;
  }
  if (tool === 'jihoz') {
    const pq = v.paths.map(q => { let bi = 1, bd = Infinity; for (let i = 1; i < q.g.length; i++) { const d = segD(p, [q.g[i - 1], q.g[i]]); if (d < bd) { bd = d; bi = i; } } return { a: Math.atan2(q.g[bi][1] - q.g[bi - 1][1], q.g[bi][0] - q.g[bi - 1][0]), d: bd }; }).sort((x, y) => x.d - y.d)[0];
    pushEdit({ t: 'furn', id: fid, p, a: pq && pq.d < 15 ? pq.a : 0 }); return;
  }
  if (tool === 'ochir') {
    const E = S.edits ?? [];
    // 1) qoʻlda qoʻshilgan yoʻl yoki zona — tahrirning oʻzi olib tashlanadi
    const ai = E.findIndex(e => (e.t === 'furn' && dist(e.p, p) < 2.5) || (e.t === 'path' && segD(p, e.g) < 4) || ((e.t === 'row' || e.t === 'hedge') && segD(p, e.g) < 4) || ((e.t === 'zone' || e.t === 'mass') && segD(p, [...e.ring, e.ring[0]]) < 4) || ((e.t === 'tree' || e.t === 'shrub') && dist(e.p, p) < 3));
    if (ai >= 0) { S.edits = E.filter((_, i) => i !== ai); redo = []; save(); void sendEdits(); return; }
    // 2) yangi yoki mavjud daraxt
    const nearTree = (geo.plant as { features?: { geometry: { coordinates: LngLat } }[] } | undefined)?.features?.some(f => dist(L2(f.geometry.coordinates), p) < 3);
    if (nearTree || (S.step === 7)) { pushEdit({ t: 'tree-del', p }); return; }
    // 3) asl variant yoʻli
    const vo = VO?.[S.chosen]; if (!vo) return;
    const dels = new Set(E.filter(e => e.t === 'path-del').map(e => (e as { i: number }).i));
    let bi = -1, bd = 6; vo.paths.forEach((q, i) => { if (dels.has(i)) return; const d = segD(p, q.g); if (d < bd) { bd = d; bi = i; } });
    if (bi >= 0) pushEdit({ t: 'path-del', i: bi }); else { measure = tr('Bu yerda oʻchiriladigan narsa topilmadi'); renderTools(); }
  }
}
function renderTools(): void {
  toolsEl.hidden = !toolsOn() || !sheetsEl.hidden || !aksoEl.hidden;
  if (toolsEl.hidden) return;
  const T = TOOLS.filter(t => S.step === 6 || t[0] === 'daraxt' || t[0] === 'ochir' || t[0] === 'olch' || t[0] === 'akso');
  if (!T.some(t => t[0] === tool)) { tool = T[0][0]; draft = []; selItem = null; selPath = null; }
  const cur = TOOLS.find(t => t[0] === tool) ?? TOOLS[0];
  const spOpts = (f: (x: (typeof ASSORT)[number]) => boolean) => h('select', { class: 'input', id: 'bgSp', title: tr('Tur'), onchange: (e: Event) => { psp = (e.target as HTMLSelectElement).value; } }, h('option', { value: '' }, tr('Tur: avto')), ...ASSORT.filter(f).map(x => h('option', { value: x.lat, selected: psp === x.lat }, `${x.lat}${x.native ? ' *' : ''}`)));
  const PM: [PMode, string][] = [['dona', 'Dona'], ['buta', 'Buta'], ['qator', 'Xiyobon qatori'], ['devor', 'Tirik devor'], ['guruh', 'Guruh (koʻpburchak)'], ['doira', 'Guruh (doira)']];
  const selP = selPath ? V?.[S.chosen]?.paths.find(q => q.ref === selPath) : null;
  const setP = (patch: Omit<Extract<Edit, { t: 'path-set' }>, 't' | 'ref'>) => { if (!selPath) return; const E = (S.edits ?? []).filter(e => !(e.t === 'path-set' && e.ref === selPath)); const prev = (S.edits ?? []).find(e => e.t === 'path-set' && e.ref === selPath) as Extract<Edit, { t: 'path-set' }> | undefined; S.edits = [...E, { ...(prev ?? {}), ...patch, t: 'path-set', ref: selPath }]; redo = []; save(); void sendEdits(); };
  const pathProps: Node[] = tool === 'sel' && selP ? [
    h('select', { class: 'input', id: 'bgPTier', title: tr('Yoʻl turi'), onchange: (e: Event) => setP({ tier: (e.target as HTMLSelectElement).value as Tier, w: undefined }) }, ...(Object.keys(TIERS) as Tier[]).map(k => h('option', { value: k, selected: selP.tier === k }, tr(TIERS[k].n)))),
    h('label', { class: 'bg-w' }, h('input', { class: 'input', id: 'bgPW', type: 'number', min: 0.8, max: 30, step: 0.1, value: String(selP.w), onchange: (e: Event) => { const x = +(e.target as HTMLInputElement).value; if (x > 0) setP({ w: x }); } }), h('em', {}, 'm')),
    h('select', { class: 'input', id: 'bgPLight', title: tr('Yoritish'), onchange: (e: Event) => setP({ light: (e.target as HTMLSelectElement).value as 'ustun' }) }, ...([['', `${tr('Yoritish')}: ${tr(TIERS[selP.tier]?.light === 'ustun' ? 'ustun' : TIERS[selP.tier]?.light === 'past' ? 'past' : 'yoʻq')} (${tr('sukut')})`], ['ustun', tr('Ustun 4 m')], ['past', tr('Past yoritkich')], ['yoq', tr('Yoritilmaydi')]] as [string, string][]).map(([k, n]) => h('option', { value: k, selected: (selP.light ?? '') === k }, n))),
    h('div', { class: 'seg', role: 'group' }, ...([['yaxlit', 'Yaxlit'], ['punktir', 'Punktir']] as const).map(([k, n]) => h('button', { type: 'button', 'aria-pressed': (selP.style ?? 'yaxlit') === k, onclick: () => setP({ style: k }) }, tr(n)))),
    h('button', { type: 'button', class: 'btn btn-sm', id: 'bgPSmooth', 'aria-pressed': !!selP.smooth, onclick: () => setP({ smooth: !selP.smooth }) }, tr(selP.smooth ? 'Silliq ✓' : 'Silliqlash')),
    h('select', { class: 'input', id: 'bgPirog', title: tr('Qoplama konstruksiyasi'), onchange: (e: Event) => setP({ pirog: (e.target as HTMLSelectElement).value }) }, ...PIROG.map(pg => h('option', { value: pg.id, selected: (selP.pirog ?? PIROG_OF[selP.tier]) === pg.id }, tr(pg.n)))),
    h('span', { class: 'bg-thint-s' }, (PIROG.find(pg => pg.id === (selP.pirog ?? PIROG_OF[selP.tier]))?.layers ?? []).filter(l => l[1]).map(l => `${tr(l[0])} ${l[1]}`).join(' · ') + ' mm (T)'),
    ...(selP.tier === 'servis' ? [h('span', { class: 'bg-thint-s' }, tr('ShNQ 2.07.01-23, 667-band: bino ≤ 13 m — 3,5 m; 13–46 m — 4,2 m; > 46 m — 6,0 m; 676-band: bino oldida qator daraxt ekilmaydi'))] : []),
  ] : [];
  // dastur bloki tanlangan: burish, turini almashtirish, olib tashlash; hech narsa tanlanmagan — yangi element qoʻshish
  const selB = tool === 'sel' && selItem ? V?.[S.chosen]?.blocks?.find(b => b.id === selItem) ?? null : null;
  const blkProps: Node[] = selB ? [
    h('button', { type: 'button', class: 'btn btn-sm', id: 'bgBlkL', title: tr('Chapga 15° burish'), onclick: () => pushEdit({ t: 'blk', id: selB.id, a: selB.a + Math.PI / 12 }) }, '↺ 15°'),
    h('button', { type: 'button', class: 'btn btn-sm', id: 'bgBlkR', title: tr('Oʻngga 15° burish'), onclick: () => pushEdit({ t: 'blk', id: selB.id, a: selB.a - Math.PI / 12 }) }, '↻ 15°'),
    h('select', { class: 'input', id: 'bgBlkEl', onchange: (e: Event) => pushEdit({ t: 'blk', id: selB.id, el: (e.target as HTMLSelectElement).value as ElKey }) }, ...EL_GROUPS.map(([g, ks]) => h('optgroup', { label: tr(g) }, ...ks.map(k => h('option', { value: k, selected: selB.el === k }, tr(ELEM[k].n)))))),
    h('button', { type: 'button', class: 'btn btn-sm btn-ghost', id: 'bgBlkDel', onclick: () => { pushEdit({ t: 'blk', id: selB.id, del: true }); selItem = null; measure = ''; renderTools(); } }, tr('Olib tashlash')),
    h('button', { type: 'button', class: 'btn btn-sm btn-ghost', onclick: () => { selItem = null; measure = ''; renderTools(); } }, tr('Tayyor')),
  ] : tool === 'sel' && !selPath && S.step === 6 ? [
    h('select', { class: 'input', id: 'bgBlkAdd', onchange: (e: Event) => { addEl = (e.target as HTMLSelectElement).value as ElKey | ''; measure = addEl ? tf('«${n}» — joyini xaritada bosing', { n: tr(ELEM[addEl].n) }) : ''; renderTools(); } }, h('option', { value: '', selected: !addEl }, tr('+ Element qoʻshish…')), ...EL_GROUPS.map(([g, ks]) => h('optgroup', { label: tr(g) }, ...ks.map(k => h('option', { value: k, selected: addEl === k }, tr(ELEM[k].n)))))),
  ] : [];
  const furnOpt: Node[] = tool === 'jihoz' ? [
    h('select', { class: 'input', id: 'bgFCat', onchange: (e: Event) => { fcat = (e.target as HTMLSelectElement).value as FCat; fid = FURN.find(f => f.cat === fcat)!.id; renderTools(); } }, ...(Object.keys(FCATS) as FCat[]).map(k => h('option', { value: k, selected: fcat === k }, tr(FCATS[k].n)))),
    h('select', { class: 'input', id: 'bgFId', onchange: (e: Event) => { fid = (e.target as HTMLSelectElement).value; renderTools(); } }, ...FURN.filter(f => f.cat === fcat).map(f => h('option', { value: f.id, selected: fid === f.id }, `${tr(f.n)}${f.mgn ? ' ♿' : ''}`))),
    h('span', { class: 'bg-thint-s' }, (() => { const f = furnById(fid); return f ? `${String(f.w).replace('.', ',')} × ${String(f.d).replace('.', ',')} × ${String(f.h).replace('.', ',')} m · ${tr(f.mat)}${f.note ? ' · ' + tr(f.note) : ''}${f.note?.includes('(A)') ? '' : ` (${f.src ?? 'T'})`}` : ''; })()),
  ] : [];
  const opt: Node[] = tool === 'sel' ? (selP ? pathProps : blkProps) : tool === 'jihoz' ? furnOpt : tool === 'yol' ? [h('select', { class: 'input', id: 'bgTier', onchange: (e: Event) => { toolTier = (e.target as HTMLSelectElement).value as Tier; toolW = null; renderTools(); } }, ...(Object.keys(TIERS) as Tier[]).filter(k => TIERS[k].draw).map(k => h('option', { value: k, selected: toolTier === k }, tr(TIERS[k].n)))),
      h('label', { class: 'bg-w' }, h('input', { class: 'input', id: 'bgTierW', type: 'number', min: 0.8, max: 20, step: 0.1, value: String(toolW ?? TIER_W[toolTier]), onchange: (e: Event) => { const v = +(e.target as HTMLInputElement).value; toolW = Number.isFinite(v) && v > 0 ? v : null; } }), h('em', {}, 'm'))]
    : tool === 'zona' ? [h('select', { class: 'input', id: 'bgZone', onchange: (e: Event) => { toolZone = (e.target as HTMLSelectElement).value as ZoneKind; renderTools(); } }, ...ZONE_GROUPS.map(([g, ks]) => h('optgroup', { label: tr(g) }, ...ks.map(k => h('option', { value: k, selected: toolZone === k }, tr(ZONE_N[k])))))), toolZone === 'tepalik' ? h('label', { class: 'bg-w', title: tr('Tepalik balandligi') }, h('input', { class: 'input', id: 'bgHillH', type: 'number', min: 0.5, max: 12, step: 0.5, value: String(toolH), onchange: (e: Event) => { const x = +(e.target as HTMLInputElement).value; if (x > 0) toolH = x; } }), h('em', {}, 'm')) : document.createTextNode(''), ZONES[toolZone].d ? h('span', { class: 'bg-thint-s' }, tr(ZONES[toolZone].d!)) : document.createTextNode('')]
    : tool === 'daraxt' ? [h('select', { class: 'input', id: 'bgPMode', onchange: (e: Event) => { pmode = (e.target as HTMLSelectElement).value as PMode; psp = ''; draft = []; measure = ''; renderTools(); paint(); } }, ...PM.map(([k, n]) => h('option', { value: k, selected: pmode === k }, tr(n)))),
      pmode === 'guruh' || pmode === 'doira' ? h('span', { class: 'bg-thint-s' }, tr('yirik daraxt markazda, kichigi chetda, buta chegarada')) : spOpts(x => (pmode === 'buta' || pmode === 'devor' ? x.g === 'buta' : x.g !== 'buta'))] : [];
  toolsEl.replaceChildren(
    h('div', { class: 'bg-thint glassbar', id: 'bgHint' }, h('b', {}, tr(selP && tool === 'sel' ? TIERS[selP.tier]?.n ?? cur[1] : cur[1])), h('span', {}, measure || (selP && tool === 'sel' ? tr('Yoʻl sozlamalari:') : tr(cur[3]))), ...opt,
      draft.length ? h('button', { type: 'button', class: 'btn btn-sm', onclick: () => finishDraft() }, tr('Tugatish')) : '',
      draft.length ? h('button', { type: 'button', class: 'btn btn-sm btn-ghost', onclick: () => { draft = []; measure = ''; renderTools(); paint(); } }, tr('Bekor')) : ''),
    h('div', { class: 'tb glassbar', id: 'bgTb', role: 'toolbar', 'aria-label': tr('Tahrir asboblari') },
      ...T.map(([k, n, d]) => h('button', { type: 'button', class: 'rb', 'data-tool': k, title: tr(n), 'aria-label': tr(n), 'aria-pressed': tool === k, onclick: () => { tool = k; draft = []; selItem = null; selPath = null; measure = ''; renderTools(); paint(); } }, pth(d))),
      h('span', { class: 'sepv' }),
      h('button', { type: 'button', class: 'rb', id: 'bgUndo', title: tr('Bekor qilish (Ctrl+Z)'), 'aria-label': tr('Bekor qilish'), disabled: !(S.edits ?? []).length || !!busy, onclick: () => undo() }, pth('M9 14L4 9l5-5M4 9h11a5 5 0 010 10h-3')),
      h('button', { type: 'button', class: 'rb', id: 'bgRedo', title: tr('Qaytarish (Ctrl+Shift+Z)'), 'aria-label': tr('Qaytarish'), disabled: !redo.length || !!busy, onclick: () => redoE() }, pth('M15 14l5-5-5-5M20 9H9a5 5 0 000 10h3'))));
}
document.addEventListener('keydown', e => {
  if (!toolsOn() || (e.target as HTMLElement)?.tagName === 'INPUT') return;
  if (draft.length && e.key === 'Enter') finishDraft();
  if (e.key === 'Escape') { draft = []; selItem = null; measure = ''; renderTools(); paint(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redoE(); else undo(); }
});
/* ---------- aksonometriya oynasi ---------- */
let aksoCur: (AksoReq & { title: string }) | null = null, aksoIdx = -1, aksoSvg = '', aksoHint = '';
const VIEWS = ['Janubi-gʻarbdan', 'Janubi-sharqdan', 'Shimoli-sharqdan', 'Shimoli-gʻarbdan'];
async function openAkso(): Promise<void> {
  if (!aksoCur || !V) return; await syncAssort();
  aksoEl.hidden = false; aksoSvg = ''; renderAkso(); renderTools();
  const req = aksoCur, m = await ask({ t: 'akso', chosen: S.chosen, req });
  if (req !== aksoCur) return;   // keyingi soʻrov bor — eskisi tashlanadi
  if (m.t === 'akso') { aksoSvg = m.svg; aksoHint = m.hint; } else if (m.t === 'error') toast(m.msg);
  renderAkso();
}
function dl(name: string, blob: Blob): void { const u = URL.createObjectURL(blob), a = h('a', { href: u, download: name }) as HTMLAnchorElement; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 2000); }
/** SVG → PNG (dataURL); maxSide — uzun tomon, px */
async function svgPng(svg: string, maxSide = 3000): Promise<{ url: string; w: number; h: number }> {
  const img = new Image(), u = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })); img.src = u; await img.decode();
  const sc = maxSide / Math.max(img.naturalWidth, img.naturalHeight), cv = document.createElement('canvas'); cv.width = Math.round(img.naturalWidth * sc); cv.height = Math.round(img.naturalHeight * sc);
  const cx = cv.getContext('2d')!; cx.drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(u);
  return { url: cv.toDataURL('image/png'), w: cv.width, h: cv.height };
}
async function aksoPng(kind: 'art' | 'mask' | 'depth' = 'art'): Promise<void> {
  const r = await svgPng(kind === 'art' ? aksoSvg : aksoPass(aksoSvg, kind)), b = await (await fetch(r.url)).blob();
  dl(`${aksoCur?.title || 'aksonometriya'}${kind === 'art' ? '' : kind === 'mask' ? '-maska' : '-chuqurlik'}.png`, b);
}
/** Render studiyasiga: rasm + chuqurlik + ID-maska (bir xil oʻlchamda) + sahna tavsifi */
async function aksoToRender(): Promise<void> {
  if (!aksoSvg) return; busy = tr('Render studiyasiga tayyorlanmoqda…'); renderStatus();
  try {
    const [img, depth, mask] = await Promise.all([svgPng(aksoSvg, 2048), svgPng(aksoPass(aksoSvg, 'depth'), 2048), svgPng(aksoPass(aksoSvg, 'mask'), 2048)]);
    const { sendToRender } = await import('../render/inbox');
    await sendToRender({ name: `${S.site?.name ?? 'Bogʻshunos'} — ${aksoCur?.title || tr('Aksonometriya')}`, from: 'bg', subj: 'joy', img: img.url, w: img.w, h: img.h, depth: depth.url, mask: mask.url, hint: aksoHint });
  } catch (e) { toast(String((e as Error).message ?? e)); } finally { busy = ''; renderStatus(); }
}
function renderAkso(): void {
  const q = aksoCur; if (!q) { aksoEl.hidden = true; return; }
  const set = (p: Partial<AksoReq & { title: string }>, redraw = true) => { aksoCur = { ...q, ...p }; if (aksoIdx >= 0 && S.akso) { S.akso[aksoIdx] = aksoCur; sheets = []; save(); } if (redraw) void openAkso(); else renderAkso(); };
  aksoEl.replaceChildren(
    h('div', { class: 'bg-sh-top glass' },
      h('button', { type: 'button', class: 'btn btn-sm', id: 'bgAksoClose', onclick: () => { aksoEl.hidden = true; aksoCur = null; renderTools(); } }, '← ', tr('Xaritaga')),
      h('input', { class: 'input', id: 'bgAksoTitle', value: q.title, placeholder: tr('Nomi (masalan, Amfiteatr va qirgʻoq)'), onchange: (e: Event) => set({ title: (e.target as HTMLInputElement).value.trim() }) }),
      h('div', { class: 'seg', role: 'group', 'aria-label': tr('Koʻrinish') }, ...VIEWS.map((n, i) => h('button', { type: 'button', 'aria-pressed': q.view === i, title: tr(n), onclick: () => set({ view: i as AksoReq['view'] }) }, ['JG', 'JSh', 'ShSh', 'ShG'][i]))),
      h('select', { class: 'input', id: 'bgAksoEx', title: tr('Vertikal masshtab'), onchange: (e: Event) => set({ ex: +(e.target as HTMLSelectElement).value }) }, ...[1, 1.5, 2, 3].map(x => h('option', { value: String(x), selected: (q.ex ?? 1.5) === x }, `${tr('Vertikal')} ×${String(x).replace('.', ',')}`))),
      h('label', { class: 'bg-chk' }, h('input', { type: 'checkbox', checked: q.labels !== false, onchange: (e: Event) => set({ labels: (e.target as HTMLInputElement).checked }) }), tr('Yorliqlar')),
      h('span', { class: 'sp' }),
      h('button', { type: 'button', class: 'btn btn-sm', disabled: !aksoSvg, onclick: () => dl(`${q.title || 'aksonometriya'}.svg`, new Blob([aksoSvg], { type: 'image/svg+xml' })) }, 'SVG'),
      h('button', { type: 'button', class: 'btn btn-sm', disabled: !aksoSvg, onclick: () => void aksoPng() }, 'PNG'),
      h('button', { type: 'button', class: 'btn btn-sm', disabled: !aksoSvg, title: tr('Chuqurlik xaritasi — yaqin oq, uzoq qora'), onclick: () => void aksoPng('depth') }, tr('Chuqurlik')),
      h('button', { type: 'button', class: 'btn btn-sm', disabled: !aksoSvg, title: tr('ID-maska — har obyekt turi oʻz rangida'), onclick: () => void aksoPng('mask') }, tr('Maska')),
      h('button', { type: 'button', class: 'btn btn-sm', id: 'bgAksoRender', disabled: !aksoSvg, title: tr('AI render: joylashuv saqlanadi, uslub va material qoʻshiladi'), onclick: () => void aksoToRender() }, tr('Render studiyasiga')),
      aksoIdx < 0 ? h('button', { type: 'button', class: 'btn btn-sm btn-primary', id: 'bgAksoSave', disabled: !aksoSvg, onclick: () => { S.akso = [...(S.akso ?? []), { ...q, title: q.title || tf('Aksonometriya ${n}', { n: (S.akso?.length ?? 0) + 1 }) }]; aksoIdx = S.akso.length - 1; aksoCur = S.akso[aksoIdx]; sheets = []; save(); toast(tr('Albomga qoʻshildi')); render(); renderAkso(); } }, tr('Albomga qoʻshish')) : h('span', { class: 'chip ok' }, tr('albomda'))),
    h('div', { class: 'bg-akso-view' }, aksoSvg ? h('img', { id: 'bgAksoImg', alt: q.title || tr('Aksonometriya'), src: URL.createObjectURL(new Blob([aksoSvg], { type: 'image/svg+xml' })) }) : h('p', { class: 'bg-note' }, busy || tr('Chizilmoqda…'))),
  );
}
/* ---------- 7-bosqich: Assortiment (oʻz turlaringiz) ---------- */
const SIZES: [string, string][] = [['Д1', 'Д1 — daraxt > 20 m'], ['Д2', 'Д2 — daraxt 15–20 m'], ['Д3', 'Д3 — daraxt 10–15 m'], ['Д4', 'Д4 — daraxt < 10 m'], ['Д1К', 'Д1К — kolonnasimon, baland'], ['Д4К', 'Д4К — kolonnasimon, past'], ['Кв', 'Кв — baland buta'], ['Кс', 'Кс — oʻrta buta'], ['Кн', 'Кн — past buta']];
const GRPN: Record<Grp, string> = { barg: 'Bargli daraxt', igna: 'Ignabargli', buta: 'Buta' };
let aq = '', draftSp: UserSp & { fm: number[]; fc: string; ac: string; useA: boolean; ev: boolean } = { lat: '', ru: '', g: 'barg', size: 'Д3', water: 'НТ', native: false, fam: '', fm: [], fc: '#f29bb8', ac: '#e0b040', useA: false, ev: false };
function setAssort(u: UserAssort): void {
  S.assort = u; save(); assortWarn = setUserAssort(u).warn;
  PLT = null; MODR = null; sheets = []; geo.plant = undefined; render(); paint();
}
function stepAssort(): Node[] {
  const U: UserAssort = S.assort ?? { add: [], off: [] }, off = new Set(U.off), q = aq.trim().toLowerCase();
  const tog = (lat: string) => setAssort({ ...U, off: off.has(lat) ? U.off.filter(x => x !== lat) : [...U.off, lat] });
  const groups = (['barg', 'igna', 'buta'] as Grp[]).map(g => { const L = BASE.filter(x => x.g === g && (!q || x.lat.toLowerCase().includes(q) || x.ru.toLowerCase().includes(q)));
    return L.length ? h('div', {}, h('div', { class: 'bg-lbl' }, `${tr(GRPN[g])} · ${L.filter(x => !off.has(x.lat)).length} / ${L.length}`),
      h('div', { class: 'bg-chips' }, ...L.map(x => h('button', { type: 'button', class: 'uchip', 'aria-pressed': !off.has(x.lat), title: `${x.ru} · ${x.size} · ${x.water}${x.native ? ' · mahalliy' : ''}`, onclick: () => tog(x.lat) }, h('span', { class: 'lat' }, x.lat), x.native ? ' *' : '')))) : document.createTextNode(''); });
  const D = draftSp, setD = (p: Partial<typeof D>) => { draftSp = { ...draftSp, ...p }; };
  const addOne = () => {
    const lat = draftSp.lat.trim(); if (!/^[A-Z][a-z-]+ [a-z×-]+/.test(lat)) { toast(tr('Lotincha nomni kiriting: Turkum tur (masalan, Celtis caucasica)')); return; }
    if (BASE.some(x => x.lat === lat) || U.add.some(x => x.lat === lat)) { toast(tr('Bu tur roʻyxatda bor')); return; }
    const ph = { ...(draftSp.fm.length ? { f: draftSp.fm.slice().sort((a, b) => a - b), fc: draftSp.fc } : {}), ...(draftSp.useA ? { a: draftSp.ac } : {}), ...(draftSp.ev ? { e: true } : {}) };
    const sp: UserSp = { lat, ru: draftSp.ru.trim() || lat, g: draftSp.g, size: draftSp.g === 'buta' && !/^К/.test(draftSp.size) ? 'Кс' : draftSp.size, water: draftSp.water, native: draftSp.native, ...(draftSp.fam?.trim() ? { fam: draftSp.fam.trim() } : {}), ...(Object.keys(ph).length ? { ph } : {}) };
    draftSp = { ...draftSp, lat: '', ru: '', fam: '', fm: [] }; setAssort({ ...U, add: [...U.add, sp] });
  };
  const csv = () => { const t = (document.getElementById('bgCsv') as HTMLTextAreaElement | null)?.value ?? ''; const add: UserSp[] = [];
    for (const ln of t.split(/\r?\n/)) { const c = ln.split(/[;\t,]/).map(x => x.trim()); if (!c[0] || !/^[A-Z][a-z-]+ [a-z×-]+/.test(c[0]) || BASE.some(x => x.lat === c[0]) || U.add.some(x => x.lat === c[0]) || add.some(x => x.lat === c[0])) continue;
      const g = (['barg', 'igna', 'buta'] as Grp[]).find(x => x === (c[2] || '').toLowerCase()) ?? 'barg';
      add.push({ lat: c[0], ru: c[1] || c[0], g, size: SIZES.some(s => s[0] === c[3]) ? c[3] : g === 'buta' ? 'Кс' : 'Д3', water: c[4] === 'Т' || c[4]?.toLowerCase() === 't' ? 'Т' : 'НТ', native: /^(1|ha|yes|\+)$/i.test(c[5] || '') }); }
    if (!add.length) { toast(tr('Yangi tur topilmadi')); return; } toast(tf('${n} tur qoʻshildi', { n: add.length })); setAssort({ ...U, add: [...U.add, ...add] }); };
  const M0 = 'I II III IV V VI VII VIII IX X XI XII'.split(' ');
  return [
    note(tr('Loyihada ishlatiladigan turlarni tanlang: oʻchirilgan tur avtomat ekishda va qoʻlda ekishda taklif qilinmaydi. Oʻz pitomnigingiz yoki buyurtmachi roʻyxatidagi turlarni qoʻshing — ekish, fasllar, fauna, smeta va albom yangilanadi.')),
    ...assortWarn.map(w => h('p', { class: 'bg-note', style: 'color:var(--danger,#c0392b)' }, tr(w))),
    sec('Asosiy roʻyxat (1979, II-A zona)'),
    h('input', { class: 'input', id: 'bgAq', type: 'search', placeholder: tr('Tur qidirish (lotincha yoki ruscha)'), value: aq, oninput: (e: Event) => { aq = (e.target as HTMLInputElement).value; const b = document.getElementById('bgAqList'); if (b) b.replaceChildren(...stepAssortList()); } }),
    h('div', { id: 'bgAqList' }, ...groups),
    h('div', { class: 'bg-chips' }, h('button', { type: 'button', class: 'btn btn-sm', onclick: () => setAssort({ ...U, off: [] }) }, tr('Hammasini yoqish')), h('button', { type: 'button', class: 'btn btn-sm', onclick: () => setAssort({ ...U, off: BASE.filter(x => !x.native).map(x => x.lat) }) }, tr('Faqat mahalliy turlar'))),
    sec('Oʻz turlaringiz'),
    ...(U.add.length ? [tbl(['Tur', 'Guruh', 'Kattalik', ''], U.add.map(x => [h('span', {}, h('i', {}, x.lat), x.ru !== x.lat ? ` · ${x.ru}` : ''), tr(GRPN[x.g]), x.size, h('button', { type: 'button', class: 'btn btn-sm btn-ghost', 'aria-label': tr('Oʻchirish'), onclick: () => setAssort({ ...U, add: U.add.filter(y => y.lat !== x.lat) }) }, '×')]))] : [note(tr('Hali qoʻshilmagan.'))]),
    h('label', { class: 'bg-lbl' }, tr('Lotincha nomi'), h('input', { class: 'input', id: 'bgSpLat', value: D.lat, placeholder: 'Celtis caucasica', onchange: (e: Event) => setD({ lat: (e.target as HTMLInputElement).value }) })),
    h('label', { class: 'bg-lbl' }, tr('Mahalliy nomi'), h('input', { class: 'input', id: 'bgSpRu', value: D.ru, placeholder: tr('Kavkaz qayragʻochi'), onchange: (e: Event) => setD({ ru: (e.target as HTMLInputElement).value }) })),
    h('div', { class: 'bg-row2' },
      h('select', { class: 'input', id: 'bgSpG', onchange: (e: Event) => { setD({ g: (e.target as HTMLSelectElement).value as Grp }); render(); } }, ...(['barg', 'igna', 'buta'] as Grp[]).map(g => h('option', { value: g, selected: D.g === g }, tr(GRPN[g])))),
      h('select', { class: 'input', id: 'bgSpSize', onchange: (e: Event) => setD({ size: (e.target as HTMLSelectElement).value }) }, ...SIZES.filter(([k]) => (D.g === 'buta') === /^К/.test(k)).map(([k, n]) => h('option', { value: k, selected: D.size === k }, tr(n))))),
    h('div', { class: 'bg-row2' },
      h('select', { class: 'input', id: 'bgSpW', onchange: (e: Event) => setD({ water: (e.target as HTMLSelectElement).value as 'Т' }) }, h('option', { value: 'НТ', selected: D.water === 'НТ' }, tr('Suvga talabchan emas (НТ)')), h('option', { value: 'Т', selected: D.water === 'Т' }, tr('Suvga talabchan (Т)'))),
      h('input', { class: 'input', id: 'bgSpFam', value: D.fam ?? '', placeholder: tr('Oila (ixtiyoriy), masalan Ulmaceae'), onchange: (e: Event) => setD({ fam: (e.target as HTMLInputElement).value }) })),
    h('label', { class: 'bg-chk' }, h('input', { type: 'checkbox', checked: D.native, onchange: (e: Event) => setD({ native: (e.target as HTMLInputElement).checked }) }), tr('Mahalliy tur (Oʻzbekiston florasi)')),
    h('label', { class: 'bg-chk' }, h('input', { type: 'checkbox', checked: D.ev, onchange: (e: Event) => setD({ ev: (e.target as HTMLInputElement).checked }) }), tr('Doim yashil')),
    h('div', { class: 'bg-lbl' }, tr('Gullash oylari'), h('div', { class: 'bg-chips', id: 'bgSpFm' }, ...M0.map((m, i) => h('button', { type: 'button', class: 'uchip', 'aria-pressed': D.fm.includes(i + 1), onclick: (e: Event) => { const fm = draftSp.fm.includes(i + 1) ? draftSp.fm.filter(x => x !== i + 1) : [...draftSp.fm, i + 1]; setD({ fm }); (e.currentTarget as HTMLElement).setAttribute('aria-pressed', String(fm.includes(i + 1))); } }, m)))),
    h('div', { class: 'bg-row2' },
      h('label', { class: 'bg-chk' }, tr('Gul rangi'), h('input', { type: 'color', value: D.fc, onchange: (e: Event) => setD({ fc: (e.target as HTMLInputElement).value }) })),
      h('label', { class: 'bg-chk' }, h('input', { type: 'checkbox', checked: D.useA, onchange: (e: Event) => setD({ useA: (e.target as HTMLInputElement).checked }) }), tr('Kuzgi rang'), h('input', { type: 'color', value: D.ac, onchange: (e: Event) => setD({ ac: (e.target as HTMLInputElement).value }) }))),
    h('button', { type: 'button', class: 'btn btn-primary btn-block', id: 'bgSpAdd', onclick: addOne }, tr('Turni qoʻshish')),
    sec('Roʻyxatdan qoʻshish (CSV)'),
    note(tr('Har qatorda: lotincha nomi; mahalliy nomi; guruh (barg / igna / buta); kattalik (Д1…Д4, Кв, Кс, Кн); namlik (Т / НТ); mahalliy (ha / yoʻq).')),
    h('textarea', { class: 'input bg-ta', id: 'bgCsv', rows: 4, placeholder: 'Celtis caucasica; Kavkaz qayragʻochi; barg; Д2; НТ; ha' }),
    h('button', { type: 'button', class: 'btn btn-block', onclick: csv }, tr('Roʻyxatni qoʻshish')),
    note(tr('Qoʻshilgan turlar maʼlumoti — foydalanuvchi kiritgan (P); albomda «†» bilan belgilanadi.')),
  ];
}
/** qidiruvda faqat roʻyxat qayta chiziladi (fokus yoʻqolmasin) */
function stepAssortList(): Node[] { const n = stepAssort(); const box = n.find(x => (x as HTMLElement).id === 'bgAqList') as HTMLElement | undefined; return box ? [...box.childNodes] : []; }
/** 6-bosqich «Reja va elementlar» boʻlimi */
function stepReja(): Node[] {
  const v = V?.[S.chosen]; if (!v) return [note(tr('Avval variant tanlang.'))];
  const E = S.edits ?? [], cnt = (t: Edit['t']) => E.filter(e => e.t === t).length;
  return [
    note(tr('Pastdagi asboblar bilan rejani tahrirlang: yoʻl va zona chizish, elementni surish, daraxt qoʻyish, oʻchirish. Har oʻzgarish ekish, tarmoqlar, smeta va albomga oʻtadi.')),
    sec('Tahrirlar'), row(tr('Yoʻl qoʻshildi / oʻchirildi'), `${cnt('path')} / ${cnt('path-del')}`), row(tr('Zona chizildi'), String(cnt('zone'))), row(tr('Element surildi'), String(cnt('move'))), row(tr('Daraxt qoʻyildi / olib tashlandi'), `${cnt('tree')} / ${cnt('tree-del')}`), row(tr('Jihozlar qoʻyildi'), String(cnt('furn'))), row(tr('Yoʻl sozlamalari oʻzgartirildi'), String(cnt('path-set'))), row(tr('Buta, qator, tirik devor, guruh'), `${cnt('shrub')} · ${cnt('row')} · ${cnt('hedge')} · ${cnt('mass')}`),
    ...(E.length ? [h('button', { type: 'button', class: 'btn btn-sm', id: 'bgEditsClear', onclick: () => { if (!confirm(tr('Barcha qoʻlda tahrirlar oʻchirilsinmi?'))) return; redo = [...E].reverse(); S.edits = []; save(); void sendEdits(); } }, tr('Avtomat variantga qaytish'))] : []),
    sec('Koʻrsatkichlar'), row(tr('Yoʻllar jami'), `${fmt(v.m.pathLen)} m`), row(tr('Qattiq yuza'), `${fmt(v.m.hard)} m²`), row(tr('Koʻkalamzor'), `${fmt(v.m.greenPct, 1)} %`, v.m.greenPct >= 70 ? '✓' : '✗'), row(tr('Daraxt bilan ziddiyat (kesish taqiqlangan)'), `${v.m.conflict} (${v.m.conflictBig})`, v.m.conflictBig ? '✗' : '✓'),
    ...stepVert(),
    sec('Aksonometriyalar'), ...((S.akso ?? []).length ? (S.akso ?? []).map((q, i) => h('div', { class: 'bg-row' }, h('span', {}, `${q.title} · ${Math.round(q.w)} × ${Math.round(q.d)} m`), h('b', {}, h('button', { type: 'button', class: 'btn btn-sm', onclick: () => { aksoCur = q; aksoIdx = i; void openAkso(); } }, tr('Ochish')), h('button', { type: 'button', class: 'btn btn-sm btn-ghost', 'aria-label': tr('Oʻchirish'), onclick: () => { S.akso = (S.akso ?? []).filter((_, j) => j !== i); sheets = []; save(); render(); } }, '×')))) : [note(tr('Pastdagi «Aksonometriya» asbobi bilan rejaning istalgan qismini tanlang — illyustratsiya albomga qoʻshiladi.'))]),
    sec('Eksplikatsiya'), h('ol', { class: 'bg-items' }, ...v.items.map(it => h('li', {}, h('b', {}, tr(it.name)), h('span', {}, it.rule)))),
  ];
}

/** Vertikal rejalash: tepaliklar, pogʻonalar, yer balansi */
function stepVert(): Node[] {
  const VS = VERT, E = S.edits ?? [];
  if (!VS?.parts.length) return [sec('Vertikal rejalash'), note(tr('«Zona chizish» asbobida «Manzara tepaligi» yoki «Suvga tushuvchi pogʻonalar»ni chizing — relyef oʻzgaradi, qazish va toʻkish hajmi hisoblanadi.'))];
  const setH = (i: number, x: number) => { const e = E[i]; if (!e || e.t !== 'zone') return; S.edits = E.map((q, j) => (j === i ? { ...e, h: x } : q)); redo = []; save(); void sendEdits(); };
  const bal = VS.cut - VS.fill;
  return [sec('Vertikal rejalash'),
    ...VS.parts.map(p => p.kind === 'tepalik'
      ? h('div', { class: 'bg-row' }, h('span', {}, `${tr('Tepalik')} ${p.n} · ${fmt(p.area)} m² · ${tr('toʻkish')} ${fmt(p.fill)} m³`), h('b', {}, h('label', { class: 'bg-w' }, h('input', { class: 'input', type: 'number', min: 0.5, max: 12, step: 0.5, value: String(p.h), 'data-vi': p.i ?? -1, title: tf('Qiyalik ≤ 1:3 boʻlishi uchun eng koʻpi ${h} m', { h: fmt(p.hMax, 1) }), onchange: (e: Event) => { const x = +(e.target as HTMLInputElement).value; if (x > 0 && p.i != null) setH(p.i, x); } }), h('em', {}, 'm')), p.h < (E[p.i ?? -1] as { h?: number } | undefined)?.h! ? h('em', { class: 'tag' }, '1:3') : ''))
      : row(`${tr('Pogʻonalar')} ${p.n} · ${fmt(p.area)} m²`, `${tr('qazish')} ${fmt(p.cut)} m³`, `${Math.max(1, Math.round((p.h - 0.3) / STEP_RISE))} × ${String(STEP_RISE).replace('.', ',')} m`)),
    row(tr('Qazish / toʻkish'), `${fmt(VS.cut)} / ${fmt(VS.fill)} m³`, 'P'),
    row(tr('Yer balansi'), `${bal >= 0 ? '+' : '−'}${fmt(Math.abs(bal))} m³`, Math.abs(bal) <= Math.max(VS.cut, VS.fill) * 0.15 ? '✓' : ''),
    note(bal > 0 ? tr('Ortiqcha tuproq — tepalikka ishlatish yoki olib chiqib ketish kerak.') : bal < 0 ? tr('Tuproq yetmaydi — tashqaridan keltiriladi yoki tepalik pasaytiriladi.') : tr('Qazilgan tuproq toʻliq joyida ishlatiladi.')),
    note(tr('Taxminiy hisob (P): relyef 3 m toʻrda, maysa qiyaligi ≤ 1:3, pogʻona 0,45 m. Ishchi loyihada geodezik syomka bilan aniqlanadi.')),
  ];
}

/* 10. Albom */
function stepVaraq(): Node[] {
  return [
    h('label', { class: 'bg-lbl' }, tr('Ishlab chiqdi (shtamp)'), h('input', { class: 'input', id: 'bgAuthor', value: S.author, placeholder: tr('Ism Familiya'), onchange: (e: Event) => { S.author = (e.target as HTMLInputElement).value; sheets = []; save(); } })),
    note(tf('Albom: A3, ${n} varaq — ramka va shtamp bilan. Varaq faqat hisoblangan bosqichdan chiqadi.', { n: sheets.length || '…' })),
    h('button', { type: 'button', class: 'btn btn-primary btn-block', id: 'bgOpenSheets', disabled: !!busy, onclick: () => void openSheets() }, tr('Albomni ochish')),
  ];
}
async function buildSheets(): Promise<boolean> {
  if (!V) { await runDesign(); if (!V) return false; }
  if (sheets.length) return true;
  await syncAssort(); busy = tr('Varaqlar yigʻilmoqda…'); render();
  const m = await ask({ t: 'albom', chosen: S.chosen, author: S.author || undefined, brief: S.brief, akso: S.akso, tu: S.tu ?? [], prices: S.prices ?? {} }); busy = '';
  if (m.t === 'albom') sheets = m.sheets; else if (m.t === 'error') toast(m.msg);
  render(); return sheets.length > 0;
}
let cur = 0;
const urls: string[] = [];
async function openSheets(): Promise<void> {
  if (!(await buildSheets())) return;
  for (const u of urls.splice(0)) URL.revokeObjectURL(u);
  for (const s of sheets) urls.push(URL.createObjectURL(new Blob([s.svg], { type: 'image/svg+xml' })));
  sheetsEl.hidden = false; renderSheets();
}
function renderSheets(): void {
  cur = Math.max(0, Math.min(cur, sheets.length - 1));
  const pdf = async () => { const b = document.getElementById('bgPdf') as HTMLButtonElement | null; if (b) b.disabled = true; try { await svgPdf(sheets.map(s => ({ svg: s.svg, widthMm: s.w, heightMm: s.h })), `${S.site?.name ?? 'Bogshunos'} — albom`); } finally { if (b) b.disabled = false; } };
  sheetsEl.replaceChildren(
    h('div', { class: 'bg-sh-top glass' }, h('button', { type: 'button', class: 'btn btn-sm', id: 'bgShClose', onclick: () => { sheetsEl.hidden = true; } }, '← ', tr('Xaritaga')), h('b', {}, `${S.site?.name ?? ''} — ${tr('Loyiha albomi')}`), h('span', { class: 'sp' }), h('span', { class: 'chip' }, tf('${n} varaq · A3', { n: sheets.length })), h('button', { type: 'button', class: 'btn btn-sm btn-primary', id: 'bgPdf', onclick: () => void pdf() }, 'PDF')),
    h('nav', { class: 'bg-sh-list panel' }, ...sheets.map((s, i) => h('button', { type: 'button', class: i === cur ? 'on' : '', 'data-sheet': s.id, onclick: () => { cur = i; renderSheets(); } }, h('img', { src: urls[i], alt: '', loading: 'lazy' }), h('span', {}, `${i + 1}. ${tr(s.title)}`)))),
    h('div', { class: 'bg-sh-view' }, h('img', { src: urls[cur], alt: sheets[cur]?.title ?? '', id: 'bgShImg' })),
  );
}
document.addEventListener('keydown', e => {
  if (!sheetsEl.hidden) { if (e.key === 'ArrowRight' || e.key === 'PageDown') { cur++; renderSheets(); } if (e.key === 'ArrowLeft' || e.key === 'PageUp') { cur--; renderSheets(); } if (e.key === 'Escape') sheetsEl.hidden = true; return; }
  if (drawing) { if (e.key === 'Escape') { drawing = null; render(); paint(); } if (e.key === 'Enter') finishDraw(); }
});

/* ---------------- xarita ---------------- */
let map: MLMap | null = null;
const empty = { type: 'FeatureCollection', features: [] };
const CLS_COL = ['#cfe3bf', '#f2d98f', '#e7a39a'], SLOPE_COL = ['#e9efe1', '#f3e0a8', '#eba86a', '#c9573a'];
const PROG_COL: Record<string, string> = { otloq: '#e3ecc4', botqoq: '#b9d9cf', yomgir_bogi: '#a9cdb9', bolalar: '#f4c98f', sport_mavjud: '#c9b8e0', sport_yangi: '#a891cf', amfiteatr: '#e7b98e', terrasa: '#d9a77a', qushxona: '#8e7a5a', ...Object.fromEntries(Object.entries(ZONES).filter(([k]) => !['otloq', 'botqoq', 'yomgir_bogi', 'bolalar', 'sport_yangi'].includes(k)).map(([k, d]) => [k, d.c])) };
for (const [k, d] of Object.entries(ZONES)) PROG_COL[k] ??= d.c;
const TIER_COL: Record<string, string> = { asosiy: '#d8c7a4', ikkinchi: '#e2d4ba', soqmoq: '#ece2cf', sohil: '#d3c3a3', rampa: '#e0bb7a', zina: '#c99a55', kopri: '#ffffff' };
for (const [k, d] of Object.entries(TIERS)) TIER_COL[k] ??= d.c;
/** metr → piksel (Toshkent kengligi): px = m · 2^z / 118 146 */
/** metrdagi ifoda → piksel; zoom interpolatsiyasi ifodaning eng yuqorisida boʻlishi shart (MapLibre talabi) */
const mpxE = (e: unknown, f: (v: unknown) => unknown = v => v) => ['interpolate', ['exponential', 2], ['zoom'], 13, f(['*', e, 0.0693]), 21, f(['*', e, 17.75])];
function style(): unknown { const p = basePrefs(); return mapStyle('stil', isDark() ? 'dark' : p.pal, p.labels, p.custom); }
async function initMap(): Promise<void> {
  const ml = (await import('maplibre-gl')).default;
  await import('maplibre-gl/dist/maplibre-gl.css');
  map = new ml.Map({ container: mapEl, style: style() as never, center: S.c as [number, number], zoom: S.z, attributionControl: { compact: true }, maxPitch: 0, dragRotate: false, doubleClickZoom: false } as never);
  map.on('style.load', () => { addLayers(); paint(); });
  map.on('click', e => void onClick([+e.lngLat.lng.toFixed(7), +e.lngLat.lat.toFixed(7)]));
  map.on('dblclick', () => { if (drawing) finishDraw(); else if (toolsOn() && draft.length) finishDraft(); });
  map.on('moveend', () => { const c = map!.getCenter(); S.c = [+c.lng.toFixed(6), +c.lat.toFixed(6)]; S.z = +map!.getZoom().toFixed(2); save(); });
  map.on('error', e => console.warn('MapLibre:', (e as { error?: Error }).error?.message ?? e));
  (window as unknown as { bgMap: MLMap }).bgMap = map;
}
function addLayers(): void {
  const m = map!; const add = (id: string) => m.addSource(id, { type: 'geojson', data: empty as never });
  ['bg-cls', 'bg-slope', 'bg-trees', 'bg-vprog', 'bg-vpath', 'bg-vmark', 'bg-vfurn', 'bg-vpts', 'bg-new', 'bg-mod', 'bg-site', 'bg-draw'].forEach(add);
  m.addLayer({ id: 'bg-cls', type: 'fill', source: 'bg-cls', paint: { 'fill-color': ['match', ['get', 'c'], 0, CLS_COL[0], 1, CLS_COL[1], CLS_COL[2]], 'fill-opacity': 0.72 } } as never);
  m.addLayer({ id: 'bg-slope', type: 'fill', source: 'bg-slope', paint: { 'fill-color': ['match', ['get', 'c'], 0, SLOPE_COL[0], 1, SLOPE_COL[1], 2, SLOPE_COL[2], SLOPE_COL[3]], 'fill-opacity': 0.8 } } as never);
  m.addLayer({ id: 'bg-vprog', type: 'fill', source: 'bg-vprog', paint: { 'fill-color': ['match', ['get', 'k'], ...Object.entries(PROG_COL).flat(), '#ddd'], 'fill-opacity': 0.9, 'fill-outline-color': '#8c7f6e' } } as never);
  m.addLayer({ id: 'bg-vpath-c', type: 'line', source: 'bg-vpath', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#8c7f6e', 'line-width': mpxE(['get', 'w'], v => ['+', 1, v]) } } as never);
  m.addLayer({ id: 'bg-vpath', type: 'line', source: 'bg-vpath', filter: ['!=', ['get', 'st'], 'punktir'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['match', ['get', 'tier'], ...Object.entries(TIER_COL).flat(), '#eee'], 'line-width': mpxE(['get', 'w']) } } as never);
  m.addLayer({ id: 'bg-vpath-d', type: 'line', source: 'bg-vpath', filter: ['==', ['get', 'st'], 'punktir'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-dasharray': [1.2, 0.8], 'line-color': ['match', ['get', 'tier'], ...Object.entries(TIER_COL).flat(), '#eee'], 'line-width': mpxE(['get', 'w']) } } as never);
  m.addLayer({ id: 'bg-vmark', type: 'line', source: 'bg-vmark', minzoom: 15, paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 15, 0.5, 19, 1.8], 'line-opacity': 0.95 } } as never);
  m.addLayer({ id: 'bg-vfurn', type: 'fill', source: 'bg-vfurn', paint: { 'fill-color': ['get', 'c'], 'fill-outline-color': '#ffffff', 'fill-opacity': 0.95 } } as never);
  m.addLayer({ id: 'bg-trees', type: 'circle', source: 'bg-trees', paint: { 'circle-color': ['case', ['==', ['get', 'inv'], 1], '#d62828', ['==', ['get', 'q'], 1], '#3f7a3c', '#8db77a'], 'circle-opacity': 0.7, 'circle-radius': mpxE(['max', 1.5, ['/', ['get', 'c'], 2]], v => ['max', 1.5, v]) } } as never);
  m.addLayer({ id: 'bg-new', type: 'circle', source: 'bg-new', paint: { 'circle-color': ['coalesce', ['get', 'col'], '#9fcf86'], 'circle-opacity': 0.9, 'circle-stroke-color': ['coalesce', ['get', 'ed'], '#2f5e33'], 'circle-stroke-width': 1, 'circle-radius': mpxE(['/', ['get', 'c'], 2], v => ['max', 2, v]) } } as never);
  m.addLayer({ id: 'bg-newf', type: 'circle', source: 'bg-new', filter: ['!=', ['get', 'fc'], ''], paint: { 'circle-color': ['get', 'fc'], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 0.8, 'circle-radius': mpxE(['/', ['get', 'c'], 6], v => ['max', 1.5, v]) } } as never);
  m.addLayer({ id: 'bg-vpts', type: 'circle', source: 'bg-vpts', paint: { 'circle-color': ['case', ['==', ['get', 't'], 'item'], '#151413', '#ffffff'], 'circle-stroke-color': '#151413', 'circle-stroke-width': 1.5, 'circle-radius': ['case', ['==', ['get', 't'], 'item'], 7, ['==', ['get', 'main'], 1], 6, 4] } } as never);
  m.addLayer({ id: 'bg-mod-f', type: 'fill', source: 'bg-mod', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': ['get', 'c'], 'fill-opacity': 0.85 } } as never);
  m.addLayer({ id: 'bg-mod-l', type: 'line', source: 'bg-mod', filter: ['==', ['geometry-type'], 'LineString'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'c'], 'line-width': ['coalesce', ['get', 'w'], 2] } } as never);
  m.addLayer({ id: 'bg-mod-p', type: 'circle', source: 'bg-mod', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-color': ['get', 'c'], 'circle-radius': ['coalesce', ['get', 'r'], 3], 'circle-stroke-color': '#151413', 'circle-stroke-width': 1 } } as never);
  m.addLayer({ id: 'bg-site', type: 'line', source: 'bg-site', paint: { 'line-color': '#d62828', 'line-width': 2.6 } } as never);
  m.addLayer({ id: 'bg-draw', type: 'line', source: 'bg-draw', paint: { 'line-color': '#d62828', 'line-width': 2, 'line-dasharray': [2, 1.5] } } as never);
}
const setData = (id: string, d: unknown) => (map?.getSource(id) as GeoJSONSource | undefined)?.setData((d ?? empty) as never);
function paint(): void {
  if (!map?.getSource('bg-site')) return;
  const site = S.site, F = site ? frame(site.origin) : null;
  setData('bg-site', site && F ? { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [...site.boundary, site.boundary[0]].map(p => F.toGeo(p)) } }] } : empty);
  setData('bg-draw', !drawing && draft.length && S.site ? { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: ((tool === 'zona' || (tool === 'daraxt' && pmode === 'guruh')) && draft.length > 2 ? [...draft, draft[0]] : draft.length > 1 ? draft : [draft[0], draft[0]]).map(G2) } }] } : drawing && drawing.length ? { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: drawing.length > 1 ? drawing : [drawing[0], drawing[0]] } }] } : empty);
  const st = S.step, an = st === 3, vv = st >= 5 && geo.v?.[showVar] as { paths: unknown; prog: unknown; pts: unknown } | undefined;
  setData('bg-cls', an && S.layer === 'cls' ? geo.classes : empty);
  setData('bg-slope', an && S.layer === 'slope' ? geo.slope : empty);
  setData('bg-trees', (an && S.layer === 'trees') || st === 4 || st >= 5 ? geo.trees : empty);
  const md = st >= 6 && st <= 9 ? mod() : null;
  setData('bg-new', st === 6 || (st === 7 && md === 'ekish') || st === 8 ? geo.plant : empty);
  setData('bg-mod', md && (md === 'kesim' || md === 'fauna' || md === 'tarmoq') ? modGeo[md] : empty);
  map.setPaintProperty('bg-vprog', 'fill-opacity', md === 'fauna' ? 0.25 : 0.9);
  map.setPaintProperty('bg-trees', 'circle-opacity', st >= 5 ? 0.35 : 0.7);
  setData('bg-vprog', vv ? vv.prog : empty); setData('bg-vpath', vv ? vv.paths : empty); setData('bg-vfurn', vv ? (vv as unknown as { furn: unknown }).furn : empty); setData('bg-vmark', vv ? (vv as unknown as { marks?: unknown }).marks ?? empty : empty); setData('bg-vpts', vv ? vv.pts : empty);
  renderLegend();
}
function renderLegend(): void {
  const L: [string, string][] = S.step === 3 ? (S.layer === 'cls' ? [[CLS_COL[0], 'Erkin'], [CLS_COL[1], 'Cheklangan'], [CLS_COL[2], 'Qurilish mumkin emas']] : S.layer === 'slope' ? [[SLOPE_COL[0], '≤ 5 %'], [SLOPE_COL[1], '5–8 % — rampa'], [SLOPE_COL[2], '8–12 % — zina'], [SLOPE_COL[3], '> 12 %']] : [['#3f7a3c', 'Qimmatbaho tur (moratoriy)'], ['#8db77a', 'Kam qimmatli yoki nomaʼlum tur'], ['#d62828', 'Ailanthus (invaziv)']])
    : S.step >= 5 && V ? [...TIER_ORD.slice().reverse().filter(t => V![showVar]?.paths.some(q => q.tier === t)).map(t => [TIER_COL[t], TIERS[t].n] as [string, string]), ...Object.entries(PROG_COL).filter(([k]) => V![showVar]?.prog[k]?.length).map(([k, c]) => [c, ({ otloq: 'Oʻtloq', botqoq: 'Botqoq qirgʻoq', yomgir_bogi: 'Yomgʻir bogʻi', bolalar: 'Bolalar', sport_mavjud: 'Sport (mavjud)', sport_yangi: 'Sport (yangi)', amfiteatr: 'Amfiteatr', terrasa: 'Terrasa', qushxona: 'Qushlarni kuzatish joyi' } as Record<string, string>)[k] ?? (ZONES as Record<string, { n: string }>)[k]?.n ?? k] as [string, string])] : [];
  if (MODR && S.step >= 6 && mod() === 'fauna') L.splice(0, L.length, ...MODR.fauna.areas.map(x => [x.c, x.n] as [string, string]), ['#ffffff', 'Qush uya qutisi'], ['#3b2f4a', 'Koʻrshapalak qutisi']);
  if (MODR && S.step >= 6 && mod() === 'tarmoq') L.splice(0, L.length, ...MODR.nets.routes.map(r => [r.c, r.n] as [string, string]), ['#f2c230', 'Yoritkich'], ['#d62828', 'Yoritkich daraxtga < 4 m']);
  if (MODR && S.step >= 6 && mod() === 'kesim') L.splice(0, L.length, ['#151413', 'Kesim chizigʻi'], ...MODR.shore.map(x => [x.c, x.n] as [string, string]));
  legendEl.hidden = !L.length || !S.site;
  const raw = S.step >= 6 && !!MODR && ['fauna', 'tarmoq', 'kesim'].includes(mod() ?? '');
  legendEl.replaceChildren(...L.map(([c, n]) => h('div', {}, h('i', { style: `background:${c}` }), raw ? n : tr(n))), h('div', { class: 'src' }, h('i', { style: 'background:#d62828;height:3px' }), tr('Loyiha chegarasi')));
}
function fit(): void {
  if (!map || !S.site) return; const F = frame(S.site.origin), g = S.site.boundary.map(p => F.toGeo(p));
  const xs = g.map(p => p[0]), ys = g.map(p => p[1]);
  map.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], { padding: { top: 90, bottom: 40, left: 360, right: 40 }, duration: 600 });
}
async function onClick(c: LngLat): Promise<void> {
  if (toolsOn() && S.site) { toolClick(L2(c)); return; }
  if (S.step === 8 && placing && S.site) { const F = frame(S.site.origin), p = F.toLocal(c); S.tu = [...(S.tu ?? []), { kind: placing, p, cap: tuCap, unit: placing === 'elektr' ? 'kVt' : placing === 'aloqa' ? 'port' : 'm³/sut' }]; placing = null; save(); MODR = null; sheets = []; render(); void runModul(); return; }
  if (S.step !== 1) return;
  if (drawing) { drawing.push(c); paint(); return; }
  busy = tr('OSM: shu nuqtadagi bogʻlar…'); render();
  try { cands = await parksAt(c, fetch, m => { busy = m; renderStatus(); }); if (!cands.length) toast(tr('Bu nuqtada OSM bogʻi topilmadi — chegarani qoʻlda chizing.')); }
  catch { cands = []; toast(tr('OSM javob bermadi')); }
  busy = ''; render();
  if (cands.length === 1) setSite(cands[0].ring, cands[0].name, cands[0].id);
}
function finishDraw(): void {
  if (!drawing) return;
  const r = drawing.filter((p, i) => i === 0 || p[0] !== drawing![i - 1][0] || p[1] !== drawing![i - 1][1]);
  drawing = null;
  if (r.length < 3) { toast(tr('Kamida 3 nuqta kerak')); render(); paint(); return; }
  setSite(r, tr('Yangi bogʻ'));
}

/* ---------------- ishga tushirish ---------------- */
onTheme(() => { renderHeader(); map?.setStyle(style() as never, { diff: false }); });
async function boot(): Promise<void> {
  renderHeader();
  const saved = await cacheGet<St>(KEY).catch(() => null);
  if ((saved?.v as number | undefined) === 1 || saved?.v === 2) { const old = saved as St & { mod?: Mod }; S = { ...S, ...saved!, v: 2, opt: { ...DEF_OPT, ...saved!.opt } };
    if ((old.v as unknown as number) === 1) { S.step = (old.step === 7 ? 10 : old.step === 6 ? ({ ekish: 7, fauna: 7, kesim: 6, tarmoq: 8, narx: 9 } as Record<string, Step>)[old.mod ?? 'ekish'] ?? 7 : old.step) as Step; if (old.mod) S.modBy = { [S.step]: old.mod }; } }
  assortWarn = setUserAssort(S.assort).warn;
  if (S.dataKey) data = await cacheGet<BgData>(S.dataKey).catch(() => null);
  const want = S.step; S.step = data ? 2 : 1; render();
  await initMap();
  if (S.site) fit();
  if (data && S.site) { await runAnalyze(); if (A) { if (want >= 5) { await runDesign(); } if (want >= 6 && V) { S.step = want; await ensureMods(); } S.step = (want >= 3 ? want : 3) as Step; render(); paint(); } }
}
void boot();
