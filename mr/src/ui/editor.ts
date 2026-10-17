/**
 * Loyiha oynasi: chapda qadamlar qatori, yonida qadam paneli, markazda sahna, pastda koʻrsatkichlar.
 * Qadam almashganda faqat panel almashadi — sahna, kamera va hujjat joyida qoladi.
 */
import type { LngLat, Project } from '../core/doc';
import { Store } from '../core/store';
import { CommandError } from '../core/commands';
import { frame, type XY } from '../core/geo';
import { Scene3D, STYLES, FRAMES, LENSES, type ViewMode, type SceneStyle } from '../scene/scene';
import { autosave, exportJSON, type AutoSaver } from '../storage/db';
import { Compute, type Computed } from '../workers/compute';
import type { Result } from '../norms/rules';
import { h, IC, icl, svgIcon, fmt, toast, download } from './dom';
import { STEPS, BUILT_PHASE, type StepDef } from './steps';
import { ClickTool, LineTool, PolygonTool, RectTool, MeasureTool, SectionLineTool, type Tool } from './tools';
import { computePlan, pointIn, type PlanGeo } from '../core/plan';
import { CATS, checkProfile, PROFILES, profileById, profileWidth, type Profile } from '../core/profiles';
import { GRID_PRESETS, DEFAULT_GRID, gridStreets, gridVariants, autoAngle, type GridParams } from '../core/gridgen';
import { PRESET_PROFILES } from '../core/presets';
import { sectionSvg, PART_NAME } from './section';
import { ZONE_COL } from '../scene/scene';
import { clipLine } from '../scene/context3d';
import type { Use, ZoneLabel } from '../core/doc';
import { DEFAULT_GEN, generate, usePreset, PARK_NAME, TYPO_NAME, type GenParams, type ParkingKind, type Typology } from '../core/generator';
import { USES, useDef } from '../core/uses';
import { gridAngle, merge, split, parcelVariants, type GridMode, type ParcelMethod, type ParcelVariant } from '../core/parcels';
import { computeWhole } from '../core/plan';
import { daySteps, insolation, localToUtc, sunPosition } from '../core/sun';
import { LAWSON, PED_FACTOR, lawsonClass, nearestStation, prevailing, rumbName, sampleWind, windField, type Climate, type Station, type WindJob, type WindOut } from '../core/wind';
import { INSOL_BINS } from '../scene/scene';
import { floorPlanSvg, sectionChecks, floorGroups, floorTypeOf, FLOOR_NAME } from '../core/floorplan';
import { openAlbum, genplanSvg } from './album';
import { facadeSegs } from '../core/sectionplan';
import { planApartments, planKey, windowPoints, windowSun, evaluateApts, isWest, MOD_W, aptSummary, APT_SIZES, type AptStats, type SecPlan, type AptSize } from '../core/apartments';
import { DEMO, demoRow, demoTree, perThousand } from '../core/demography';
import { SOCIAL, isSocial, socialDemand, plotCapacity, socialPlan, type SocialUse, type Module } from '../core/social';
import { analyze, boundaryPts, buildNet, svcDef, SERVICES, WALKABLE, type Demand, type Net, type Svc, type SvcResult } from '../core/services';
import type { PoiBundle } from '../context/poi';
import { centroid, area, signedArea } from '../core/geo';
import { toDxf } from '../core/dxf';
import { toIfc } from '../core/ifc';
import { compensation, parseMonitoring, MONITORING_URL, type CompParams, type CompResult, type DemoBuilding } from '../core/compensation';
import { tepRows, buildingRows, BUILDING_HEAD } from '../core/tep';
import { toXlsx, type Sheet } from '../core/xlsx';
import { reportHtml } from './report';
import { JOBS_NOTE } from '../core/jobs';
import { landscape } from '../core/landscape';
import { MATS, PV, roofParts, pvEstimate, type Mat, type Roof } from '../core/roof';
import { winDef, type Win, type Bal } from '../core/facade';
import { facadePreview, matSwatch, roofShape, roofCover, roofOf, WIN_OPTS, BAL_OPTS, WINPAT_OPTS, BALPAT_OPTS, SHAPE_OPTS, COVER_OPTS, PARAPET_OPTS, SHADE_OPTS, USE_ICON, USE_SHORT } from './facadeui';
import type { Command } from '../core/commands';
import { pushEdge, tieredGfa } from '../core/tiers';
import type { Shade } from '../core/doc';
import { hydrology, HAND_BINS, TWI_BINS, type Hydro } from '../core/hydro';
import { coverClassifier, surfaceT, heatColor, HEAT_BINS } from '../core/heat';
import { loadBaseMap, type TerrainGrid } from '../context/tiles';
import { LiveBase, liveSize } from '../context/basemap';
import { logoSvg } from './logo';
import { PALETTES, basePrefs, setBasePrefs } from '../context/mapstyle';
import { projectStreetsGeo } from '../scene/streets3d';
import { openGraphics, downloadIllustrator } from './graphics';
import { sheetSvg, SHEET_DEFAULT, type SheetCtx, type SheetKind } from '../core/sheet';
import { uid } from '../core/doc';
import { ContextManager } from '../context/manager';
import type { ContextBundle } from '../context/load';
import { summary } from '../context/osm';
import { geocode, type Place } from '../context/geocode';
import { detectBlock, type Barrier } from '../context/blocks';

/** Ijtimoiy bino modullari piktogrammalari */
const MOD_ICON: Record<string, string> = {
  taroq: '<path d="M3 5h18v4H3z"/><path d="M5 9v10h4V9M10 9v10h4V9M15 9v10h4V9"/>',
  hovli: '<path d="M3 3h18v18H3z"/><path d="M8 8h8v8H8z"/>',
  kompakt: '<rect x="3" y="6" width="18" height="12"/><rect x="9" y="10" width="6" height="4" stroke-dasharray="2 1"/>',
  chiziq: '<rect x="2" y="9" width="5" height="6"/><rect x="8" y="10" width="5" height="6"/><rect x="14" y="9" width="5" height="6"/><path d="M2 19h20" stroke-dasharray="2 2"/>',
  u: '<path d="M3 4h5v12h8V4h5v16H3z"/>',
  blok: '<rect x="2" y="8" width="20" height="8"/>',
  l: '<path d="M3 4h6v10h12v6H3z"/>',
};
type ToolMode = 'select' | 'hand' | 'measure' | 'section' | 'pipette';
const TOOLS: [ToolMode, string, string][] = [
  ['select', 'Tanlash (V)', '<path d="M5 3l14 8-6 2-3 6z"/>'],
  ['hand', 'Qoʻl — surish (H)', '<path d="M8 11V5.5a1.5 1.5 0 0 1 3 0V11M11 10V4.5a1.5 1.5 0 0 1 3 0V11M14 10.5V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L3.6 14a1.6 1.6 0 0 1 2.6-1.8L8 14"/>'],
  ['measure', 'Chizgʻich (M)', '<path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>'],
  ['section', 'Kesim (S)', '<path d="M3 12h18" stroke-dasharray="3 2"/><path d="M6 12V6h12v6M6 12v6h12v-6" opacity=".45"/>'],
  ['pipette', 'Pipetka — uslubni nusxalash (I)', '<path d="M14 4l6 6-2 2-6-6zM12 8l-7 7v4h4l7-7"/>'],
];
/** Tipologiya piktogrammalari (yuqoridan koʻrinish, 24×24) */
const TYPO_ICON: Record<string, string> = {
  avto: '<rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="2 2"/><path d="M8 16l4-9 4 9M9.5 13h5"/>',
  yakka: '<rect x="3" y="4" width="6" height="6"/><rect x="15" y="4" width="6" height="6"/><rect x="3" y="14" width="6" height="6"/><rect x="15" y="14" width="6" height="6"/>',
  taunhaus: '<rect x="3" y="5" width="18" height="5"/><path d="M7.5 5v5M12 5v5M16.5 5v5"/><rect x="3" y="14" width="18" height="5"/><path d="M7.5 14v5M12 14v5M16.5 14v5"/>',
  villa: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  perimetr: '<path d="M3 3h18v18H3z"/><path d="M8 8h8v8H8z"/><path d="M3 3l5 5M21 3l-5 5M3 21l5-5M21 21l-5-5"/>',
  qatorlar: '<rect x="3" y="3" width="18" height="4"/><rect x="3" y="10" width="18" height="4"/><rect x="3" y="17" width="18" height="4"/>',
  minora: '<rect x="3" y="3" width="6" height="6"/><rect x="15" y="3" width="6" height="6"/><rect x="9" y="15" width="6" height="6"/>',
  blok_minora: '<path d="M3 7h14v14H3z"/><path d="M7 11h6v6H7z"/><rect x="15" y="3" width="6" height="6" fill="currentColor"/>',
  ofis_plita: '<rect x="3" y="4" width="18" height="5"/><rect x="3" y="15" width="18" height="5"/><path d="M6 4v5M9 4v5M12 4v5M15 4v5M18 4v5M6 15v5M9 15v5M12 15v5M15 15v5M18 15v5"/>',
  ofis_minora: '<path d="M3 15h18v6H3z"/><rect x="5" y="3" width="5" height="12"/><rect x="14" y="5" width="5" height="10"/>',
  savdo_blok: '<rect x="3" y="3" width="18" height="10"/><path d="M3 17h18M6 15v4M10 15v4M14 15v4M18 15v4" stroke-dasharray="1 1"/>',
  blok_villa: '<path d="M3 3h11v4H7v7H3z"/><rect x="15" y="10" width="6" height="5"/><rect x="9" y="16" width="5" height="5"/><rect x="16" y="17" width="5" height="4"/>',
};
const TYPO_SHORT: Record<string, string> = { avto: 'Avto (UMN)', yakka: 'Yakka uylar', taunhaus: 'Taunhauslar', villa: 'Villalar', perimetr: 'Perimetral', qatorlar: 'Qatorlar', minora: 'Minoralar', blok_minora: 'Blok + minora', blok_villa: 'Blok + villa', ofis_plita: 'Ofis plitalari', ofis_minora: 'Ofis minoralari', savdo_blok: 'Savdo markazi' };
const ICON = {
  undo: '<path d="M9 7 4 12l5 5"/><path d="M4 12h11a5 5 0 0 1 0 10h-2"/>',
  redo: '<path d="m15 7 5 5-5 5"/><path d="M20 12H9a5 5 0 0 0 0 10h2"/>',
  back: '<path d="M15 6 9 12l6 6"/>',
  map: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
  layers: '<path d="M4 18h16"/><path d="M4 12h16"/><path d="M4 6h16"/><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="7" cy="18" r="1.6"/>',
};

const STATUS_TXT: Record<Result['status'], string> = { pass: 'mos', fail: 'mos emas', review: 'koʻrib chiqish', na: 'baholanmadi' };

export class Editor {
  readonly store: Store;
  private scene!: Scene3D;
  private saver!: AutoSaver;
  private compute = new Compute();
  private last: Computed | null = null;
  private step: StepDef;
  private tool: Tool | null = null;
  private sel: string | null = null;
  private floors = 9;
  private nonRes = 1;
  private root: HTMLElement;
  private el: Record<string, HTMLElement> = {};
  private off: (() => void)[] = [];
  private ctxMgr = new ContextManager();
  private ctx: { busy: boolean; msg: string; frac: number; err: string } = { busy: false, msg: '', frac: 0, err: '' };
  private search: { q: string; busy: boolean; res: Place[]; err: string; pending: Place | null } = { q: '', busy: false, res: [], err: '', pending: null };
  private prevDoc: Project;
  /** kvartal chegarasi: mayda — barcha koʻchalar (mahalla ichidagi servis yoʻllari ham), yirik — faqat asosiy koʻchalar */
  private blockMode: 'mayda' | 'yirik' = 'mayda';
  private profile = 'mahalla-15';
  private selStreet: string | null = null;
  private selBlock: number | null = null;
  private planCache: { doc: Project; plan: PlanGeo } | null = null;

  constructor(host: HTMLElement, doc: Project, private onExit: () => void) {
    this.store = new Store(doc); this.prevDoc = doc;
    this.step = STEPS.find(s => s.id === (doc.site ? 'hajm' : doc.context.loaded ? 'uchastka' : 'hudud'))!;
    this.root = this.build();
    host.replaceChildren(this.root);
    this.scene = new Scene3D(this.el.scene);
    try { if (localStorage.getItem('mr-detail') === '0') this.scene.detail = false; } catch { /* */ }
    this.scene.update(doc); this.scene.frameDoc(doc);
    this.saver = autosave(fn => this.store.subscribe(c => fn(c.doc)), s => { this.el.save.dataset.s = s; this.el.saveT.textContent = s === 'saved' ? 'saqlandi' : s === 'pending' ? 'saqlanmoqda…' : 'saqlanmadi!'; });
    this.off.push(this.store.subscribe(c => this.onChange(c.doc)));
    this.bindScene(); this.bindKeys();
    { let raf = 0; this.scene.onView = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (this.el.scene.querySelector('.btools')) this.syncBTools(); this.followBase(); }); }; }
    this.renderAll(); this.recompute();
    void this.ensureContext();   // yuklanmagan boʻlsa — fon xaritasi
  }

  dispose(): void { this.saver.flush(); this.saver.dispose(); this.off.forEach(f => f()); this.scene.dispose(); }

  /* ---------- qobiq ---------- */
  private build(): HTMLElement {
    const doc = this.store.doc;
    const name = h('input', { class: 'pname', value: doc.name, 'aria-label': 'Loyiha nomi', maxlength: 120 }) as HTMLInputElement;
    name.addEventListener('change', () => this.run(() => this.store.dispatch({ type: 'rename', name: name.value }), () => { name.value = this.store.doc.name; }));
    name.addEventListener('keydown', e => { if (e.key === 'Enter') name.blur(); });
    const ib = (id: string, title: string, icon: string, fn: () => void) => { const b = h('button', { class: 'ib', id, title, 'aria-label': title, onclick: fn }); b.append(svgIcon(icon)); return b; };
    const saveT = h('span', {}, 'saqlandi');
    const save = h('span', { class: 'save', 'data-s': 'saved' }, h('i'), saveT);
    const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Koʻrinish' },
      ...([['plan', 'Reja'], ['axo', 'Akso'], ['persp', 'Persp']] as [ViewMode, string][]).map(([k, t]) => h('button', { 'data-view': k, 'aria-pressed': k === 'plan', onclick: () => this.setView(k) }, t)));
    const top = h('div', { class: 'top' },
      ib('back', 'Loyihalar', ICON.back, () => this.onExit()),
      h('a', { class: 'brand', href: '../index.html', title: 'Archemistry Lab portali' }, logoSvg(18), 'Archemistry Lab', h('small', {}, '· Master reja')),
      name, save, h('span', { class: 'sp' }),
      this.popBtn('camPop', 'Kamera', () => this.camPop()),
      h('button', { class: 'btn', id: 'gxOpen', title: 'Grafika: masshtabli varaqlar (bosh reja, zonalash, figure-ground, landshaft) — SVG/PNG', onclick: () => this.openGraphics() }, 'Grafika'),
      seg,
      ib('undo', 'Bekor qilish (Ctrl+Z)', ICON.undo, () => this.store.undo()),
      ib('redo', 'Qaytarish (Ctrl+Shift+Z)', ICON.redo, () => this.store.redo()));
    const rail = h('nav', { class: 'rail', 'aria-label': 'Qadamlar' });
    const panel = h('section', { class: 'panel', 'aria-live': 'polite' });
    const kpi = h('div', { class: 'kpi', role: 'group', 'aria-label': 'Koʻrsatkichlar' });
    const drawer = h('div', { class: 'drawer', hidden: true });
    const hint = h('div', { class: 'hint', hidden: true });
    const scene = h('div', { id: 'scene' });
    const badge = h('div', { class: 'ctxbadge', hidden: true, role: 'status' });
    const attr = h('div', { class: 'attr', hidden: true });
    attr.innerHTML = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> hissachilari · Relyef: AWS Terrain Tiles · <span class="sat">Tasvir: Esri, Maxar, Earthstar Geographics</span><span class="carto" hidden> · Fon: Esri, HERE, Garmin</span>';
    // oʻng pastki burchak: xarita (fon va uslub) va tahliliy qatlamlar
    const mapctl = h('div', { class: 'mapctl' },
      this.popBtn('stylePop', 'Xarita', () => this.stylePop(), 'up', ICON.map),
      this.popBtn('layPop', 'Qatlamlar', () => this.layPop(), 'up', ICON.layers));
    const stage = h('div', { class: 'stage' }, scene, rail, panel, hint, drawer, kpi, attr, badge, mapctl);
    Object.assign(this.el, { name, save, saveT, seg, rail, panel, kpi, drawer, hint, scene, stage, attr, badge });
    return h('div', { class: 'app' }, top, stage);
  }

  private run(fn: () => void, onErr?: () => void): void {
    try { fn(); } catch (e) { if (e instanceof CommandError) { toast(e.message); onErr?.(); } else throw e; }
  }

  private setView(m: ViewMode): void {
    this.scene.setView(m);
    this.el.seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === m)));
  }

  private onChange(doc: Project): void {
    const p = this.prevDoc; this.prevDoc = doc;
    if (p.origin !== doc.origin || p.context !== doc.context || p.site !== doc.site || p.removed !== doc.removed) void this.ensureContext();
    if (this.marked.b.length || this.marked.c.length) { const rm = new Set(doc.removed ?? []); this.setMarked(this.marked.b.filter(id => doc.buildings.some(b => b.id === id)), this.marked.c.filter(id => !rm.has(id)), doc); }
    if (this.selStreet && !doc.streets.some(x => x.id === this.selStreet)) { this.selStreet = null; this.scene.selectStreet(null); }
    if (this.sel && !doc.buildings.some(b => b.id === this.sel)) this.sel = null;
    if (p.buildings !== doc.buildings && this.apt.stats) this.clearApt();
    (this.el.name as HTMLInputElement).value = doc.name;
    this.scene.select(this.sel); this.scene.update(doc);
    this.renderAll(); this.recompute();
  }

  private async recompute(): Promise<void> {
    const doc = this.store.doc, c = await this.compute.run(doc);
    if (doc !== this.store.doc) return; // eskirgan natija
    this.last = c; this.renderKpi();
  }

  /** koʻrinish uslubi: «Albom» (taqdimot, sukut boʻyicha) yoki «Rangli» (OSM ranglari, sunʼiy yoʻldosh) */
  private stylePref: SceneStyle = (() => { try { const v = localStorage.getItem('mr-style'); return STYLES.some(x => x.id === v) ? v as SceneStyle : 'albom'; } catch { return 'albom'; } })();
  private syncFade(): void {
    this.scene.setStyle(this.stylePref);
    try { localStorage.setItem('mr-style', this.stylePref); } catch { /* */ }
    document.querySelectorAll('[data-style]').forEach(b => b.setAttribute('aria-pressed', String((b as HTMLElement).dataset.style === this.stylePref)));
  }

  /* ---------- yuqori paneldagi ochiluvchi oynalar: uslub va kamera ---------- */
  private pop: HTMLElement | null = null;
  private popBtn(id: string, label: string, body: () => HTMLElement, dir: 'down' | 'up' = 'down', icon?: string): HTMLElement {
    const b = h('button', { class: icon ? 'mapbtn popbtn' : 'btn popbtn', id, title: label, 'aria-haspopup': 'true', 'aria-expanded': false, onclick: (e: MouseEvent) => {
      e.stopPropagation();
      const was = this.pop?.dataset.for === id; this.closePop(); if (was) return;
      const p = h('div', { class: 'pop', 'data-for': id, 'data-dir': dir, role: 'dialog', 'aria-label': label }); p.append(body());
      p.addEventListener('click', ev => ev.stopPropagation());
      const r = b.getBoundingClientRect();
      if (dir === 'up') { p.style.bottom = `${window.innerHeight - r.top + 8}px`; p.style.right = `${Math.max(8, window.innerWidth - r.right)}px`; p.style.maxHeight = `${r.top - 20}px`; }
      else { p.style.top = `${r.bottom + 6}px`; p.style.left = `${Math.max(8, Math.min(window.innerWidth - 330, r.left))}px`; }
      document.body.append(p); this.pop = p; b.setAttribute('aria-expanded', 'true');
      const off = (ev: MouseEvent) => { if (!ev.isTrusted) return; this.closePop(); document.removeEventListener('click', off); }; setTimeout(() => document.addEventListener('click', off), 0);
    } });
    if (icon) b.append(svgIcon(icon), h('span', {}, label)); else b.append(h('span', {}, label), svgIcon(IC.chevDown));
    return b;
  }
  private closePop(): void { if (!this.pop) return; this.root.querySelector(`#${this.pop.dataset.for}`)?.setAttribute('aria-expanded', 'false'); this.pop.remove(); this.pop = null; }
  private refreshPop(): void { const p = this.pop; if (!p) return; const id = p.dataset.for!; p.replaceChildren(id === 'stylePop' ? this.stylePop() : id === 'layPop' ? this.layPop() : this.camPop()); }

  private stylePop(): HTMLElement {
    const gap = h('input', { type: 'range', min: '0.2', max: '1.5', step: '0.05', value: String(this.scene.explodeGap), id: 'exGap', 'aria-label': 'Qatlamlar oraligʻi' }) as HTMLInputElement;
    gap.oninput = () => this.scene.setExploded(this.scene.exploded, +gap.value);
    const ex = h('input', { type: 'checkbox', checked: this.scene.exploded, id: 'exOn' }) as HTMLInputElement;
    ex.onchange = () => { this.scene.setExploded(ex.checked, +gap.value); gap.disabled = !ex.checked; };
    gap.disabled = !ex.checked;
    const cs = this.store.doc.context, img = !!this.ctxMgr.current?.imagery;
    return h('div', { class: 'popbody' },
      h('div', { class: 'lb' }, 'Fon xaritasi'),
      h('div', { class: 'basesw', role: 'group', id: 'baseSw' }, ...([['maket', cs.loaded ? 'Maket' : 'Stilistik', cs.loaded ? 'oq relyef, OSM qatlamlari' : 'cheksiz vektor xarita'], ['sputnik', 'Sunʼiy yoʻldosh', img || !cs.loaded ? 'Esri World Imagery' : 'atrofni qayta yuklang']] as const).map(([k, t, n]) =>
        h('button', { 'data-base': k, 'aria-pressed': cs.base === k, disabled: k === 'sputnik' && !img && cs.loaded, onclick: () => { this.run(() => this.store.dispatch({ type: 'setContext', patch: { base: k } })); this.refreshPop(); } }, h('i', { class: `thumb ${k}` }), h('b', {}, t), h('small', {}, n)))),
      cs.loaded || cs.base === 'sputnik' ? '' : h('div', { class: 'palsw', role: 'group', id: 'palSw', 'aria-label': 'Xarita uslubi' }, ...Object.entries(PALETTES).map(([k, p]) =>
        h('button', { 'data-pal': k, title: p.n, 'aria-pressed': basePrefs().pal === k, onclick: () => { setBasePrefs({ pal: k }); void this.showBaseMap(); this.refreshPop(); } },
          h('i', { style: `background:linear-gradient(135deg, ${p.bg} 0 45%, ${p.bld} 45% 70%, ${p.water} 70%)` }), h('small', {}, p.n)))),
      cs.loaded || cs.base === 'sputnik' ? '' : (() => { const c = h('input', { type: 'checkbox', checked: basePrefs().labels, id: 'palLab' }) as HTMLInputElement; c.onchange = () => { setBasePrefs({ labels: c.checked }); void this.showBaseMap(); }; return h('label', { class: 'row', style: 'font-size:13px' }, c, 'Koʻcha va joy nomlari'); })(),
      h('p', { class: 'note' }, 'Fon va uslub faqat koʻrinishga taʼsir qiladi — loyiha, hisob-kitob va meʼyorlar oʻzgarmaydi.'),
      h('div', { class: 'lb' }, 'Uslub'),
      h('div', { class: 'opts' }, ...STYLES.map(x => h('button', { 'data-style': x.id, 'aria-pressed': x.id === this.stylePref, onclick: () => { this.stylePref = x.id; this.syncFade(); } }, h('b', {}, x.name), h('small', {}, x.note)))),
      (() => { const c = h('input', { type: 'checkbox', checked: this.scene.detail, id: 'detOn' }) as HTMLInputElement; c.onchange = () => { this.scene.setDetail(c.checked); try { localStorage.setItem('mr-detail', c.checked ? '1' : '0'); } catch { /* */ } }; return h('label', { class: 'row', style: 'font-size:13px' }, c, 'Batafsil fasad (derazalar, romlar, balkonlar — 3D)'); })(),
      h('label', { class: 'row', style: 'font-size:13px' }, ex, 'Portlatilgan qatlamlar'),
      h('label', { class: 'field' }, h('span', { class: 'lb' }, 'Qatlamlar oraligʻi'), gap),
      h('p', { class: 'note' }, 'Qatlamlar: 1 atrof → 2 koʻchalar → 3 kvartallar va zonalar → 4 binolar. Taqdimot uchun aksonometriyada yaxshi koʻrinadi.'));
  }

  /* ---------- tahliliy qatlamlar: qavatlar soni, yuza qizishi, suv bosish (HAND), namlik (TWI) ---------- */
  private mapKind: 'yoq' | 'issiq' | 'hand' | 'twi' = 'yoq';
  private mapInfo: { title: string; bins: { color: number; label: string }[]; stats: string[]; note: string } | null = null;
  private mapBusy = false;
  private hydroCache: { key: string; hy: Hydro; g: TerrainGrid; c0: XY } | null = null;
  private layPop(): HTMLElement {
    const fl = h('input', { type: 'checkbox', checked: this.scene.floorLabels, id: 'flOn' }) as HTMLInputElement;
    fl.onchange = () => this.scene.setFloorLabels(fl.checked);
    const opt = (k: typeof this.mapKind, t: string, note: string) => h('button', { 'data-map': k, 'aria-pressed': this.mapKind === k, disabled: this.mapBusy, onclick: () => void this.runMap(k) }, h('b', {}, t), h('small', {}, note));
    return h('div', { class: 'popbody' },
      h('div', { class: 'lb' }, 'Binolar'),
      h('label', { class: 'row', style: 'font-size:13px' }, fl, 'Qavatlar soni (raqam)'),
      h('div', { class: 'lb' }, 'Yer sathi xaritasi'),
      h('div', { class: 'opts' },
        opt('yoq', 'Yoʻq', 'xaritani olib tashlash'),
        opt('issiq', 'Yuza qizishi', 'taxmin: qoplama + soya, 15 iyul 11–17'),
        opt('hand', 'Suv bosish xavfi (HAND)', 'drenajdan balandlik, relyef boʻyicha'),
        opt('twi', 'Namlik (TWI)', 'suv yigʻiladigan pastliklar')),
      this.mapBusy ? h('p', { class: 'note', id: 'mapBusy' }, 'Hisoblanmoqda…') : '',
      h('p', { class: 'note' }, 'Xarita loyiha oʻzgarsa avtomatik yangilanmaydi — qayta tanlang. Insolyatsiya va shamol xaritalari ham shu qatlamni ishlatadi.'));
  }
  private renderMapLegend(): void {
    let el = this.el.stage.querySelector<HTMLDivElement>('.maplegend');
    if (!this.mapInfo) { el?.remove(); return; }
    if (!el) { el = h('div', { class: 'maplegend', role: 'status' }); this.el.stage.append(el); }
    const m = this.mapInfo, hex = (c: number) => '#' + c.toString(16).padStart(6, '0');
    el.replaceChildren(h('b', {}, m.title), h('div', { class: 'legend' }, ...m.bins.map(b => h('div', {}, h('i', { style: `background:${hex(b.color)}` }), b.label))),
      ...m.stats.map(t => h('div', { class: 'st' }, t)), h('div', { class: 'nt' }, m.note),
      h('button', { class: 'ib sm', title: 'Yopish', 'aria-label': 'Xaritani olib tashlash', onclick: () => void this.runMap('yoq') }, svgIcon(IC.x)));
  }
  private async runMap(k: 'yoq' | 'issiq' | 'hand' | 'twi'): Promise<void> {
    this.mapKind = k;
    if (k === 'yoq') { this.scene.setGroundMap(null); this.mapInfo = null; this.renderMapLegend(); this.refreshPop(); return; }
    this.mapBusy = true; this.refreshPop();
    try { if (k === 'issiq') await this.heatMap(); else this.hydroMap(k); }
    catch (e) { toast((e as Error).message); this.mapKind = 'yoq'; this.mapInfo = null; this.scene.setGroundMap(null); }
    finally { this.mapBusy = false; this.refreshPop(); this.renderMapLegend(); }
  }
  /** hisob oynasi: uchastka (+ chekka) yoki markaz atrofida 250 m */
  private mapWindow(margin: number): [number, number, number, number] {
    const doc = this.store.doc, fr = frame(doc.origin);
    const pts = [...(doc.site?.rings[0] ?? []), ...doc.buildings.flatMap(b => b.footprint)].map(fr.toLocal);
    if (!pts.length) return [-250, -250, 250, 250];
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    return [Math.min(...xs) - margin, Math.min(...ys) - margin, Math.max(...xs) + margin, Math.max(...ys) + margin];
  }
  private async heatMap(): Promise<void> {
    const doc = this.store.doc, fr = frame(doc.origin), sc = this.sheetCtx();
    const [x0, y0, x1, y1] = this.mapWindow(120), cell = Math.max(4, Math.sqrt((x1 - x0) * (y1 - y0) / 14000));
    const prisms = this.aroundPrisms(x0, y0, x1, y1, 150);
    const pb = prisms.map(pr => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const p of pr.ring) { a = Math.min(a, p[0]); b = Math.min(b, p[1]); c = Math.max(c, p[0]); d = Math.max(d, p[1]); } return [a, b, c, d]; });
    const inB = (p: XY) => prisms.some((pr, i) => p[0] >= pb[i][0] && p[0] <= pb[i][2] && p[1] >= pb[i][1] && p[1] <= pb[i][3] && pointIn(p, [pr.ring]));
    const pts: XY[] = [];
    for (let x = x0 + cell / 2; x < x1; x += cell) for (let y = y0 + cell / 2; y < y1; y += cell) { const p: XY = [x, y]; if (!inB(p)) pts.push(p); }
    const z = pts.map(p => this.scene.H(p[0], p[1]));
    const steps = [] as { alt: number; az: number; dt: number }[];
    for (let t = 11; t <= 17.001; t += 0.5) { const q = sunPosition(localToUtc(2026, 7, 15, t), doc.origin[1], doc.origin[0]); if (q.alt > 3) steps.push({ alt: q.alt, az: q.az, dt: 0.5 }); }
    const total = steps.reduce((a, s) => a + s.dt, 0);
    let sun: Float32Array;
    try {
      this.sunW ??= new Worker(new URL('../workers/sun.worker.ts', import.meta.url), { type: 'module' });
      sun = await new Promise<Float32Array>((ok, no) => { const w = this.sunW!; w.onmessage = e => ok(e.data.hours); w.onerror = e => no(e); w.postMessage({ id: 2, pts, z, prisms, steps }); });
    } catch { sun = insolation(pts, z, prisms, steps); }
    const plan = computePlan(doc), yardsL = doc.settings.yards ? landscape(doc) : [];
    const { cover, canopy } = coverClassifier({
      streets: doc.streets.map(s => ({ axis: s.axis.map(fr.toLocal), parts: profileById(s.profile).parts })),
      blocks: plan.blocks.map(b => ({ rings: b.rings, use: b.use })), site: doc.site?.rings.map(r => r.map(fr.toLocal)) ?? null,
      roads: (sc?.roads ?? []).filter(r => !doc.streets.some(s => s.osm === r.id) && !(doc.removedRoads ?? []).includes(r.id)), green: sc?.green ?? [], water: sc?.water ?? [],
      yards: yardsL.map(y => ({ green: y.green, hard: [...y.paving, ...y.paths, ...y.play.map(q => [q.ring])] })),
      trees: [...(sc?.trees ?? []).filter(t => !doc.site || !pointIn(t, doc.site.rings.map(r => r.map(fr.toLocal)))), ...projectStreetsGeo(doc.streets.map(s => ({ id: s.id, axis: s.axis.map(fr.toLocal), parts: profileById(s.profile).parts })), () => 0).trees, ...yardsL.flatMap(y => y.trees)],
    });
    const T = pts.map((p, i) => surfaceT(cover(p), total ? 1 - sun[i] / total : 0, canopy(p)));
    this.scene.setGroundMap(pts, T.map(heatColor), cell);
    const site = doc.site?.rings.map(r => r.map(fr.toLocal));
    const inS = site ? pts.map(p => pointIn(p, site)) : pts.map(() => true);
    const S = T.filter((_, i) => inS[i]), O = T.filter((_, i) => !inS[i]), mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
    this.mapInfo = {
      title: 'Yuza qizishi (taxmin), °C', bins: HEAT_BINS,
      stats: [`Uchastka: oʻrtacha ${fmt(mean(S), 1)} °C · ≥ 52 °C — ${fmt(S.filter(t => t >= 52).length / (S.length || 1) * 100, 0)} %`, ...(O.length ? [`Atrof (120 m): oʻrtacha ${fmt(mean(O), 1)} °C`] : [])],
      note: '15 iyul, 11:00–17:00: qoplama turi (OSM va loyiha) + binolar soyasi + daraxt toji. Sunʼiy yoʻldosh oʻlchovi emas — variantlarni solishtirish uchun.',
    };
  }
  private hydroMap(k: 'hand' | 'twi'): void {
    const b = this.ctxMgr.current, doc = this.store.doc, fr = frame(doc.origin);
    if (!b?.terrain) throw new Error('Relyef yuklanmagan: 1-qadamda atrofni yuklang (relyef qatlami bilan)');
    const key = `${b.fetched}|${doc.origin.join(',')}`;
    if (this.hydroCache?.key !== key) {
      const g = b.terrain, c0 = fr.toLocal(g.center);
      const lines = b.osm.waterways.map(w => w.pts.map(p => { const q = fr.toLocal(p); return [q[0] - c0[0], q[1] - c0[1]] as XY; }));
      this.hydroCache = { key, hy: hydrology(g, lines), g, c0 };
    }
    const { hy, g, c0 } = this.hydroCache, pts: XY[] = [], cols: number[] = [], vals: number[] = [];
    for (let j = 0; j < g.n; j++) for (let i = 0; i < g.n; i++) {
      const c = j * g.n + i, x = -g.radius + i * g.step, y = -g.radius + j * g.step; if (x * x + y * y > g.radius * g.radius) continue;
      const v = k === 'hand' ? hy.hand[c] : hy.twi[c];
      const bin = k === 'hand' ? HAND_BINS.find(q => v < q.max) : TWI_BINS.find(q => v >= q.min);
      if (!bin) continue;
      pts.push([x + c0[0], y + c0[1]]); cols.push(bin.color); vals.push(v);
    }
    this.scene.setGroundMap(pts, cols, g.step);
    const site = doc.site?.rings.map(r => r.map(fr.toLocal));
    let stats: string[] = [];
    if (site) {
      let n = 0, a = 0, bb = 0;
      for (let j = 0; j < g.n; j++) for (let i = 0; i < g.n; i++) { const p: XY = [-g.radius + i * g.step + c0[0], -g.radius + j * g.step + c0[1]]; if (!pointIn(p, site)) continue; n++; const v = k === 'hand' ? hy.hand[j * g.n + i] : hy.twi[j * g.n + i]; if (k === 'hand' ? v < 1 : v >= 12) a++; if (k === 'hand' ? v < 2 : v >= 10) bb++; }
      stats = [k === 'hand' ? `Uchastka: < 1 m — ${fmt(a / (n || 1) * 100, 0)} %, < 2 m — ${fmt(bb / (n || 1) * 100, 0)} %` : `Uchastka: TWI ≥ 12 — ${fmt(a / (n || 1) * 100, 0)} %, ≥ 10 — ${fmt(bb / (n || 1) * 100, 0)} %`];
    }
    this.mapInfo = k === 'hand'
      ? { title: 'Suv bosish xavfi — HAND', bins: HAND_BINS, stats, note: 'Drenaj (OSM soy, kanal, ariq yoki oqim ≥ 2 ga) ustidan balandlik, relyef 10 m. Skrining: yomgʻir kanalizatsiyasi hisobga olinmaydi.' }
      : { title: 'Topografik namlik indeksi — TWI', bins: TWI_BINS, stats, note: 'ln(a / tan β): yuqori qiymat — suv yigʻiladigan, yerosti suvi yaqin pastliklar. Relyef 10 m.' };
  }

  private frameId = 'erkin';
  private frameWatch = false;
  private camPop(): HTMLElement {
    const sc = this.scene, doc = this.store.doc;
    const name = h('input', { type: 'text', placeholder: `Koʻrinish ${doc.views.length + 1}`, id: 'vName' }) as HTMLInputElement;
    const tp = h('input', { type: 'checkbox', checked: sc.twoPoint, id: 'twoPt' }) as HTMLInputElement;
    tp.onchange = () => { if (tp.checked && sc.view !== 'persp') this.setView('persp'); sc.setTwoPoint(tp.checked); };
    const save = () => {
      const v = { id: uid('v'), name: name.value.trim() || `Koʻrinish ${doc.views.length + 1}`, frame: this.frameId, ...sc.getCamera() };
      this.run(() => this.store.dispatch({ type: 'addView', view: v })); this.refreshPop();
    };
    const vname = (m: string) => m === 'persp' ? 'Persp' : m === 'axo' ? 'Akso' : 'Reja';
    return h('div', { class: 'popbody' },
      h('div', { class: 'lb' }, 'Obyektiv (perspektiva)'),
      h('div', { class: 'seg wrap', id: 'lensSeg' }, ...LENSES.map(mm => h('button', { 'data-lens': mm, 'aria-pressed': sc.lens === mm, onclick: () => { sc.setLens(mm); this.refreshPop(); } }, `${mm} mm`))),
      h('div', { class: 'row' },
        h('button', { class: 'btn grow', id: 'eyeLvl', title: 'Piyoda koʻzi: yerdan 1,6 m', onclick: () => { sc.eyeLevel(); this.el.seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === 'persp'))); } }, 'Koʻz sathi (1,6 m)')),
      h('label', { class: 'row', style: 'font-size:13px' }, tp, '2 nuqtali perspektiva (vertikallar tik)'),
      h('div', { class: 'lb' }, 'Kadr'),
      h('div', { class: 'seg wrap', id: 'frameSeg' }, ...FRAMES.map(f => h('button', { 'data-frame': f.id, 'aria-pressed': this.frameId === f.id, onclick: () => { this.frameId = f.id; this.syncFrame(); this.refreshPop(); } }, f.name))),
      h('div', { class: 'lb' }, 'Saqlangan koʻrinishlar'),
      doc.views.length ? h('div', { class: 'views' }, ...doc.views.map(v => h('div', { class: 'vrow' },
        h('button', { class: 'vgo', 'data-view-id': v.id, onclick: () => { sc.setCamera(v); this.frameId = v.frame; this.syncFrame(); this.el.seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v.mode))); this.refreshPop(); } }, h('b', {}, v.name), h('small', {}, `${vname(v.mode)}${v.mode === 'persp' ? ` · ${v.lens} mm${v.twoPoint ? ' · 2 nuqta' : ''}` : ''} · ${FRAMES.find(f => f.id === v.frame)?.name ?? 'Erkin'}`)),
        h('button', { class: 'ib sm', title: 'Oʻchirish', 'aria-label': `${v.name} — oʻchirish`, onclick: () => { this.run(() => this.store.dispatch({ type: 'removeView', id: v.id })); this.refreshPop(); } }, svgIcon(IC.x))))) : h('p', { class: 'note' }, 'Hali yoʻq. Kamerani joylang va saqlang — loyiha bilan birga saqlanadi.'),
      h('div', { class: 'row' }, name, h('button', { class: 'btn primary', id: 'vSave', onclick: save }, 'Saqlash')),
      h('button', { class: 'btn', id: 'shotFrame', onclick: () => download(`${safe(doc.name)}_kadr.png`, sc.snapshot(FRAMES.find(f => f.id === this.frameId)?.r ?? 0)) }, 'Kadrdagi rasm (PNG)'));
  }
  /** kadr chegarasi sahna ustida (tashqarisi xiralashgan) */
  private syncFrame(): void {
    const r = FRAMES.find(f => f.id === this.frameId)?.r ?? 0;
    let el = this.el.scene.querySelector<HTMLDivElement>('.frame');
    if (!r) { el?.remove(); return; }
    if (!el) { el = h('div', { class: 'frame', 'aria-hidden': 'true' }); this.el.scene.append(el); if (!this.frameWatch) { this.frameWatch = true; window.addEventListener('resize', () => this.syncFrame()); } }
    const q = this.scene.frameRect(r); Object.assign(el.style, { left: `${q.x}px`, top: `${q.y}px`, width: `${q.w}px`, height: `${q.h}px` });
  }

  /* ---------- koʻp tanlov: Shift + bosish / Shift + ramka; Delete — oʻchirish ---------- */
  private marked: { b: string[]; c: number[] } = { b: [], c: [] };
  private setMarked(b: string[], c: number[], doc = this.store.doc): void {
    this.marked = { b: [...new Set(b)], c: [...new Set(c)] };
    this.scene.setMarked(doc, this.marked.b, this.marked.c);
    const n = this.marked.b.length + this.marked.c.length;
    if (!this.tool) { this.el.hint.hidden = !n; if (n) this.el.hint.textContent = `Tanlandi: ${n} ta${this.marked.c.length ? ` (atrofdagi binolar — ${this.marked.c.length})` : ''} · Delete — oʻchirish · Shift + bosish yoki Shift + ramka — qoʻshish · Esc — bekor`; }
  }
  private deleteMarked(): void {
    const { b, c } = this.marked; if (!b.length && !c.length) return;
    this.run(() => this.store.dispatch({ type: 'deleteSelection', ids: b, ctx: c }));
    this.setMarked([], []);
    if (c.length) toast(`${c.length} ta atrof binosi olib tashlandi — «Hudud» qadamida yoki oʻng tugma menyusida qaytariladi`);
  }
  private restoreRemoved(): void { this.run(() => this.store.dispatch({ type: 'setRemoved', removed: [] })); }

  /* ---------- bino muharriri (tanlangan bino; har qadamda) ---------- */
  private inspTab: 'hajm' | 'qavat' = 'hajm';
  private dragMode: 'yoq' | 'push' | 'move' | 'floor' = 'yoq';
  private tierInset = 3;
  private tierEdge: number | null = null;
  /** bino tanlangan (parsellar, fasad va kvartiralar qadamidan tashqari) — chap panel bino muharririga aylanadi */
  /** bino inspektori faqat «Hajmlar» qadamida — boshqa qadamga oʻtilsa, oʻsha qadam oynasi koʻrinadi (ustma-ust qolmaydi) */
  private inspOn(): boolean { return !!this.sel && this.step.id === 'hajm' && this.store.doc.buildings.some(x => x.id === this.sel); }
  private renderInspector(): void {
    const doc = this.store.doc, b = doc.buildings.find(x => x.id === this.sel), el = this.el.panel;
    if (!b || !this.inspOn()) { if (this.scene.selFloor != null) this.scene.setSelFloor(null); if (!b) this.dragMode = 'yoq'; this.syncBTools(); if (el.dataset.mode === 'bino') this.renderPanel(); return; }
    const fr = frame(doc.origin), r = b.footprint.map(fr.toLocal), u = useDef(b.use), s = doc.settings;
    const upd = (patch: Partial<Omit<typeof b, 'id'>>, key?: string) => this.run(() => this.store.dispatch({ type: 'updateBuilding', id: b.id, patch }, key));
    const stepper = (label: string, v: number, min: number, max: number, set: (v: number) => void, id: string) => h('div', { class: 'grow-row' }, h('span', { class: 'grow' }, label),
      h('div', { class: 'stepper' }, h('button', { 'aria-label': `${label} — kamaytirish`, disabled: v <= min, onclick: () => set(v - 1) }, '−'), h('i'), h('b', { id }, String(v)), h('i'), h('button', { 'aria-label': `${label} — oshirish`, disabled: v >= max, onclick: () => set(v + 1) }, '+')));
    const kind = b.gen ? (({ burchak: 'Burchak seksiyasi', oddiy: 'Oddiy seksiya', qator: 'Qator seksiyasi', uy: 'Yakka uy', taunhaus: 'Taunhaus', villa: 'Villa', minora: 'Minora', stilobat: 'Stilobat' } as Record<string, string>)[b.gen.kind] ?? 'Seksiya') : 'Bino';
    const tabs = h('div', { class: 'seg full', role: 'tablist' }, ...([['hajm', 'Hajm'], ['qavat', 'Qavatlar va terrasa']] as const).map(([k, t]) => h('button', { role: 'tab', 'aria-pressed': this.inspTab === k, 'data-itab': k, onclick: () => { this.inspTab = k; if (k !== 'qavat') this.scene.setSelFloor(null); this.renderInspector(); } }, t)));
    const body = h('div', { class: 'ibody' });
    const gfa = b.tiers?.length ? tieredGfa(r, b.floors, b.tiers) : area(r) * b.floors, kk = gfa / (area(r) * b.floors || 1);
    const resNet = kk * area(r) * Math.max(0, b.floors - b.nonRes) * u.res * s.netToGross;
    if (this.inspTab === 'hajm') {
      // funksiya — ikonkali plitkalar
      const fn = h('div', { class: 'ftiles', id: 'iUse', role: 'group', 'aria-label': 'Funksiya' }, ...USES.filter(x => x.build).map(x => { const bt = h('button', { class: 'ftile sm', 'data-use': x.id, 'aria-pressed': x.id === b.use, title: x.name, onclick: () => upd({ use: x.id as Use }) }); bt.append(svgIcon(`<path d="${USE_ICON[x.id] ?? USE_ICON.turar}"/>`), h('span', {}, USE_SHORT[x.id] ?? x.name)); return bt; }));
      // balandlik: stepperlar + kichik kesim (noturar — toʻq, turar — och)
      const z0 = b.z0 ?? 0, tot = z0 + b.floors, fh = 7, H = Math.max(60, Math.min(150, tot * fh + 4));
      const q = Math.min(fh, (H - 4) / Math.max(1, tot));
      const sec = Array.from({ length: tot }, (_, i) => { const y = H - 2 - (i + 1) * q, kind2 = i < z0 ? '#c9c3b8' : i - z0 < b.nonRes ? '#8d877d' : '#e3d7bd'; return `<rect x="${i < z0 ? 4 : 14}" y="${y + 0.5}" width="${i < z0 ? 56 : 36}" height="${q - 1}" rx="1.5" fill="${kind2}"/>`; }).join('');
      body.append(
        h('div', { class: 'lb' }, 'Funksiya'), fn,
        h('div', { class: 'lb' }, 'Balandlik'), h('p', { class: 'note', id: 'bldEditHint', style: 'margin:0 0 6px' }, 'Sahnada: tom ustidagi toʻq sariq tutqichni yuqori/pastga sudrang — qavatlar; burchak tutqichlari — oyoq izi.'),
        h('div', { class: 'hrow' },
          h('div', { class: 'flist grow' },
            stepper('Qavatlar', b.floors, 1, 60, v => upd({ floors: v }, 'fl-' + b.id), 'iFloors'),
            u.res > 0 ? stepper('Noturar (pastda)', b.nonRes, 0, Math.max(0, b.floors - 1), v => upd({ nonRes: v }, 'nr-' + b.id), 'iNonRes') : '',
            stepper('Stilobat ustida', z0, 0, 10, v => upd({ z0: v || undefined }, 'z0-' + b.id), 'iZ0')),
          h('div', { class: 'msec', 'aria-hidden': 'true', html: `<svg viewBox="0 0 64 ${H}" width="64" height="${H}">${sec}<path d="M0 ${H - 1}H64" stroke="#141414" stroke-width="2"/></svg>` })),
        h('div', { class: 'lb' }, 'Sichqoncha bilan'),
        h('div', { class: 'seg full', id: 'dragSeg' }, ...([['yoq', 'Tanlash'], ['push', 'Devorni itarish'], ['move', 'Siljitish']] as const).map(([k, t]) => h('button', { 'aria-pressed': this.dragMode === k, 'data-drag': k, onclick: () => { this.dragMode = k; this.renderInspector(); } }, t))),
        this.dragMode === 'push' ? h('p', { class: 'note' }, 'Binoning devorini bosib torting — devor oʻz normali boʻyicha suriladi (Ctrl+Z bilan qaytadi).') : this.dragMode === 'move' ? h('p', { class: 'note' }, 'Binoni bosib sudrang.') : h('p', { class: 'note' }, 'Siljitish, burish, nusxa va oʻchirish — sahnada bino ustidagi asboblar paneli.'),
        h('div', { class: 'lb' }, 'Natija'),
        h('div', { class: 'rtiles' },
          h('div', {}, h('small', {}, 'GFA'), h('b', {}, `${fmt(gfa)} m²`)),
          h('div', {}, h('small', {}, 'Balandlik'), h('b', {}, `${fmt(tot * s.floorHeight, 1)} m`)),
          h('div', {}, h('small', {}, 'Kvartiralar ≈'), h('b', {}, u.res > 0 && s.aptNet > 0 ? fmt(resNet / s.aptNet) : '—')),
          h('div', {}, h('small', {}, 'Aholi ≈'), h('b', {}, u.res > 0 && s.m2PerPerson > 0 ? fmt(resNet / s.m2PerPerson) : '—'))));
    } else {
      const f = Math.min(this.scene.selFloor ?? b.floors, b.floors);
      if (this.scene.selFloor !== f) this.scene.setSelFloor(f);
      const floors = h('div', { class: 'floors', id: 'iFloorList' }, ...Array.from({ length: b.floors }, (_, i) => b.floors - i).map(n => h('button', { 'aria-pressed': n === f, 'data-floor': n, class: n <= b.nonRes ? 'nr' : '', onclick: () => { this.scene.setSelFloor(n); this.renderInspector(); } }, String((b.z0 ?? 0) + n))));
      const ins = h('input', { type: 'number', min: 0.5, max: 12, step: 0.5, value: this.tierInset, id: 'tInset', style: 'width:5em' }) as HTMLInputElement;
      ins.onchange = () => { this.tierInset = Math.max(0.5, Number(ins.value) || 3); };
      const n = r.length, az = (k: number) => { const a = r[k], q = r[(k + 1) % n], ccw = signedArea(r) > 0, ox = (ccw ? 1 : -1) * (q[1] - a[1]), oy = (ccw ? -1 : 1) * (q[0] - a[0]); return ((Math.atan2(ox, oy) * 180 / Math.PI) + 360) % 360; };
      const side = (a: number) => ['shimol', 'shimoli-sharq', 'sharq', 'janubi-sharq', 'janub', 'janubi-gʻarb', 'gʻarb', 'shimoli-gʻarb'][Math.round(a / 45) % 8];
      const edgeSel = h('select', { id: 'tEdge' }, h('option', { value: '' }, 'Barcha tomondan'), ...r.map((_, k) => h('option', { value: String(k), selected: this.tierEdge === k }, `${k + 1}-devor · ${side(az(k))} (${Math.round(Math.hypot(r[(k + 1) % n][0] - r[k][0], r[(k + 1) % n][1] - r[k][1]))} m)`))) as HTMLSelectElement;
      edgeSel.onchange = () => { this.tierEdge = edgeSel.value === '' ? null : Number(edgeSel.value); };
      const tiers = b.tiers ?? [];
      body.append(
        h('div', { class: 'row', style: 'align-items:flex-start;gap:10px' }, floors,
          h('div', { class: 'col grow' },
            h('b', { id: 'iFloorT' }, `${(b.z0 ?? 0) + f}-qavat`), h('span', { class: 'muted', style: 'font-size:12px' }, f <= b.nonRes ? 'noturar' : 'turar / asosiy'),
            h('span', { class: 'muted', style: 'font-size:11.5px' }, 'PgUp / PgDn — qavat · sahnada qavatni bosing'),
            h('button', { class: this.dragMode === 'floor' ? 'btn primary' : 'btn', id: 'floorDrag', 'aria-pressed': this.dragMode === 'floor', title: 'Binoda qavat devorini bosib torting: ichkariga — terrasa, tashqariga — konsol (shu qavatdan yuqorisi)', onclick: () => { this.dragMode = this.dragMode === 'floor' ? 'yoq' : 'floor'; this.renderInspector(); } }, this.dragMode === 'floor' ? '✓ Qavat devorini sudrash' : 'Qavat devorini sudrash'),
            h('div', { class: 'lb', style: 'margin-top:6px' }, 'Shu qavatdan yuqorisi'),
            h('label', { class: 'row', style: 'font-size:12.5px' }, 'Cheginish, m', ins), edgeSel,
            h('button', { class: 'btn primary', id: 'tAdd', disabled: f < 2, onclick: () => upd({ tiers: [...tiers.filter(t => t.from !== f), { from: f, inset: this.tierInset, ...(this.tierEdge != null ? { edge: this.tierEdge } : {}) }] }) }, 'Terrasa (cheginish)'),
            h('button', { class: 'btn', id: 'tCut', disabled: f < 2, onclick: () => upd({ floors: f - 1 }) }, 'Shu qavatdan yuqorisini olib tashlash'),
            h('button', { class: 'btn', id: 'tNonRes', onclick: () => upd({ nonRes: Math.min(f, b.floors - 1) }) }, 'Shu qavatgacha — noturar'))),
        tiers.length ? h('div', { class: 'list', id: 'tierList' }, ...[...tiers].sort((x, y) => x.from - y.from).map(t => h('div', { class: 'it' }, h('span', { class: 'grow' }, `${(b.z0 ?? 0) + t.from}-qavatdan: ${t.inset > 0 ? `${fmt(t.inset, 1)} m ichkariga` : `${fmt(-t.inset, 1)} m tashqariga`} ${t.edge != null ? `(${t.edge + 1}-devor)` : '(barcha tomon)'}`), h('button', { title: 'Oʻchirish', onclick: () => upd({ tiers: tiers.filter(x => x !== t) }) }, svgIcon(IC.x))))) : '',
        h('p', { class: 'note' }, 'Terrasalar GFA va aholi hisobiga kiradi. Kvartira sxemasi pastki qavat dogʻi boʻyicha (taxmin).'));
    }
    const close = () => { this.sel = null; this.scene.select(null); this.dragMode = 'yoq'; this.renderAll(); };
    const ids = doc.buildings.map(x => x.id), at = ids.indexOf(b.id);
    const go = (d: number) => { const id = ids[(at + d + ids.length) % ids.length]; this.sel = id; this.scene.select(id); this.renderAll(); };
    const keep = el.dataset.mode === 'bino' && el.dataset.bid === b.id ? el.querySelector('.body')?.scrollTop ?? 0 : 0;
    el.dataset.mode = 'bino'; el.dataset.bid = b.id;
    const fas = STEPS.find(x => x.id === 'fasad')!;
    el.replaceChildren(
      h('header', { class: 'ihead' },
        h('div', { class: 'row' }, h('button', { class: 'back', id: 'iBack', onclick: close }, svgIcon(ICON.back), `${this.step.n}-qadam: ${this.step.title}`), h('span', { class: 'sp' }),
          h('button', { class: 'ib sm', 'aria-label': 'Yopish', title: 'Yopish (Esc)', onclick: close }, svgIcon('<path d="M6 6l12 12M18 6L6 18"/>'))),
        h('div', { class: 'row inav' }, h('span', { class: 'lb grow' }, kind),
          h('button', { class: 'ib sm', 'aria-label': 'Oldingi bino', title: 'Oldingi bino', onclick: () => go(-1) }, svgIcon('<path d="M19 12H5M11 6l-6 6 6 6"/>')), h('span', { class: 'muted num' }, `${at + 1} / ${ids.length}`),
          h('button', { class: 'ib sm', 'aria-label': 'Keyingi bino', title: 'Keyingi bino', onclick: () => go(1) }, svgIcon('<path d="M5 12h14M13 6l6 6-6 6"/>'))),
        h('h2', {}, `${u.name} · ${(b.z0 ?? 0) + b.floors} qavat`),
        h('p', {}, `Dogʻ ${fmt(area(r))} m² · GFA ≈ ${fmt(gfa)} m²`),
        tabs),
      h('div', { class: 'body' }, body),
      h('footer', {},
        h('span', { class: 'muted grow', style: 'font-size:12px' }, 'Fasad va tom — alohida qadam'),
        h('button', { class: 'btn primary', id: 'iToFasad', onclick: () => { this.lookTarget = 'sel'; this.go(fas); } }, `${fas.n} · ${fas.title}`, svgIcon('<path d="M5 12h14M13 6l6 6-6 6"/>'))));
    if (keep) el.querySelector('.body')!.scrollTop = keep;
    this.syncBTools();
  }

  /** Sahnadagi bino asboblari (dizayn «Hajm A»): siljitish, burish, nusxa, oʻchirish va qavatlar — bino tepasida */
  private syncBTools(): void {
    const doc = this.store.doc, b = this.sel ? doc.buildings.find(x => x.id === this.sel) : null, host = this.el.scene;
    let el = host.querySelector<HTMLDivElement>('.btools');
    if (!b || !this.inspOn() || this.tool) { el?.remove(); return; }
    const fr = frame(doc.origin), r = b.footprint.map(fr.toLocal), c = centroid(r), fh = doc.settings.floorHeight;
    const upd = (patch: Partial<Omit<typeof b, 'id'>>, key?: string) => this.run(() => this.store.dispatch({ type: 'updateBuilding', id: b.id, patch }, key));
    const moveBy = (dx: number, dy: number) => upd({ footprint: r.map(p => fr.toGeo([p[0] + dx, p[1] + dy])) }, 'mv-' + b.id);
    const rot = (deg: number) => { const a = deg * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a); upd({ footprint: r.map(p => fr.toGeo([c[0] + (p[0] - c[0]) * cs - (p[1] - c[1]) * sn, c[1] + (p[0] - c[0]) * sn + (p[1] - c[1]) * cs])) }, 'rot-' + b.id); };
    const dup = () => { const id = uid('b_'); this.run(() => { this.store.dispatch({ type: 'addBuilding', id, footprint: r.map(p => fr.toGeo([p[0] + 8, p[1] - 8])), floors: b.floors, nonRes: b.nonRes, use: b.use }); const { id: _i, footprint: _f, gen: _g, ...rest } = b; void _i; void _f; void _g; this.store.dispatch({ type: 'updateBuilding', id, patch: rest }); }); this.sel = id; this.scene.select(id); this.renderAll(); };
    const ib = (label: string, d: string, fn: () => void, id = '', cls = '') => h('button', { class: `ib sm ${cls}`, 'aria-label': label, title: label, ...(id ? { id } : {}), onclick: fn }, svgIcon(`<path d="${d}"/>`));
    if (!el || el.dataset.bid !== b.id || el.dataset.v !== `${b.floors}`) {
      el?.remove();
      el = h('div', { class: 'btools glass', role: 'toolbar', 'aria-label': 'Bino amallari', 'data-bid': b.id, 'data-v': String(b.floors) },
        ib('Gʻarbga 1 m', 'M19 12H5M11 6l-6 6 6 6', () => moveBy(-1, 0)), ib('Shimolga 1 m', 'M12 19V5M6 11l6-6 6 6', () => moveBy(0, 1)),
        ib('Janubga 1 m', 'M12 5v14M6 13l6 6 6-6', () => moveBy(0, -1)), ib('Sharqqa 1 m', 'M5 12h14M13 6l6 6-6 6', () => moveBy(1, 0)),
        h('i', { class: 'sep' }),
        ib('5° chapga burish', 'M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4', () => rot(5), 'rotL'), h('span', { class: 'num' }, '5°'), ib('5° oʻngga burish', 'M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4', () => rot(-5), 'rotR'),
        h('i', { class: 'sep' }),
        ib('Qavat olib tashlash', 'M5 12h14', () => upd({ floors: Math.max(1, b.floors - 1) }, 'fl-' + b.id)), h('span', { class: 'chip sel num' }, `${(b.z0 ?? 0) + b.floors} q`), ib('Qavat qoʻshish', 'M12 5v14M5 12h14', () => upd({ floors: Math.min(60, b.floors + 1) }, 'fl-' + b.id)),
        h('i', { class: 'sep' }),
        ib('Nusxa (yoniga)', 'M8 8h11v11H8zM5 15V5h10', dup, 'iDup'), ib('Oʻchirish', 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13', () => this.store.dispatch({ type: 'removeBuilding', id: b.id }), 'iDel', 'danger')) as HTMLDivElement;
      host.append(el);
    }
    // panel bino va uning tutqichlari (burchaklar, qavat tutqichi) ustiga tushmasin: ekrandagi eng yuqori nuqtadan 46 px tepada
    const base = Math.min(...r.map(p => this.scene.H(p[0], p[1]))) + (b.z0 ?? 0) * fh, top = base + b.floors * fh + 2.5, hr = host.getBoundingClientRect();
    const pts = [...r.map(p => this.scene.toScreen(p[0], p[1], base)), ...r.map(p => this.scene.toScreen(p[0], p[1], top)), this.scene.toScreen(c[0], c[1], top)];
    const minY = Math.min(...pts.map(p => p.y)), cx = this.scene.toScreen(c[0], c[1], top).x;
    Object.assign(el.style, { left: `${Math.max(150, Math.min(hr.width - 150, cx - hr.left))}px`, top: `${Math.max(64, Math.min(hr.height - 60, minY - hr.top - 46))}px` });
  }

  /** parsellar qadamida buziladiganlar foydalanuvchi tanloviga koʻra, keyingi qadamlarda — yashirin */
  private goneHidden = false;
  private syncGone(): void { const ip = STEPS.findIndex(x => x.id === 'parsel'), i = STEPS.indexOf(this.step); this.scene.setHideGone(i > ip || this.goneHidden); }
  private renderAll(): void {
    this.syncFade(); this.syncGone();
    (this.root.querySelector('#undo') as HTMLButtonElement).disabled = !this.store.canUndo;
    (this.root.querySelector('#redo') as HTMLButtonElement).disabled = !this.store.canRedo;
    (this.root.querySelector('#undo') as HTMLButtonElement).title = this.store.canUndo ? `Bekor qilish: ${this.store.undoLabel} (Ctrl+Z)` : 'Bekor qilish (Ctrl+Z)';
    this.renderRail(); this.renderPanel();
  }

  /* ---------- kontekst ---------- */
  /** Hujjatdagi holatga mos kontekstni koʻrsatish: kerak boʻlsa keshdan yoki tarmoqdan yuklash */
  private async ensureContext(force = false): Promise<void> {
    const doc = this.store.doc, cs = doc.context;
    // cheksiz xaritada uchastka loyiha markazidan uzoqda chizilgan boʻlsa — markaz uchastkaga koʻchadi (atrof shu yerda yuklanadi)
    if (doc.site?.rings[0]?.length) {
      const r = doc.site.rings[0], c: LngLat = [r.reduce((a, p) => a + p[0], 0) / r.length, r.reduce((a, p) => a + p[1], 0) / r.length];
      if (dist(doc.origin, c) > (cs.loaded ? Math.min(300, cs.radius * 0.3) : 150)) { this.run(() => this.store.dispatch({ type: 'setOrigin', origin: c })); this.scene.frameDoc(this.store.doc); return; }
    }
    if (!cs.loaded) { this.showContext(null); void this.showBaseMap(); return; }
    const cur = this.ctxMgr.current;
    const covers = (b: ContextBundle | null) => !!b && b.radius >= cs.radius && dist(b.center, doc.origin) + cs.radius <= b.radius + 60;
    if (!force && covers(cur)) { this.showContext(cur); return; }
    if (this.ctx.busy && !force) return;
    this.ctx = { busy: true, msg: 'Keshdan…', frac: 0.02, err: '' }; this.renderPanel(); this.renderBadge();
    try {
      const b = await this.ctxMgr.load(doc.origin, cs.radius, (msg, frac) => { this.ctx.msg = msg; this.ctx.frac = frac; this.renderCtxProgress(); }, force);
      this.ctx = { busy: false, msg: '', frac: 1, err: '' };
      if (this.store.doc.origin === doc.origin) this.showContext(b);
    } catch (e) {
      const m = (e as Error).message;
      if (m === 'eskirdi') return;
      this.ctx = { busy: false, msg: '', frac: 0, err: m };
    }
    this.renderPanel(); this.renderBadge();
  }

  /** Fon xaritasi — atrof yuklanguncha (joy tanlash uchun): cheksiz stilistik xarita kamera ortidan yuradi */
  private baseKey = '';
  private live: LiveBase | null = null;
  private liveAt: { c: XY; r: number; key: string } | null = null;
  private liveT = 0;
  private baseFail = false;
  private async showBaseMap(): Promise<void> {
    const doc = this.store.doc, key = `${doc.origin.join(',')}|${doc.context.base}|${basePrefs().pal}|${basePrefs().labels}`;
    if (key === this.baseKey) return; this.baseKey = key; this.liveAt = null;
    if (!navigator.webdriver && !this.baseFail) { this.followBase(true); return; }
    try {   // zaxira: Esri plitkalari, bir martalik rasm
      const sat = doc.context.base === 'sputnik';
      const img = await loadBaseMap(doc.origin, 1500, sat ? 'sputnik' : 'maket');
      if (this.baseKey !== key || this.store.doc.context.loaded) return;
      await this.scene.setBaseMap(img, doc.origin);
      this.baseAttr(sat, 'Fon: Esri, HERE, Garmin');
      if (img && !this.framedCtx && !doc.site && !doc.buildings.length) { this.framedCtx = true; this.scene.frameRadius(600); }
    } catch { this.baseKey = ''; }
  }
  private baseAttr(sat: boolean, src: string): void {
    this.el.attr.hidden = false; (this.el.attr.querySelector('.sat') as HTMLElement).hidden = !sat;
    const cb = this.el.attr.querySelector('.carto') as HTMLElement; cb.hidden = sat; cb.textContent = ` · ${src}`;
  }
  /** kamera surilsa/yaqinlashsa — fon xaritasini qayta chizish (kechiktirib) */
  private followBase(now = false): void {
    const doc = this.store.doc;
    if (doc.context.loaded || !this.baseKey || navigator.webdriver || this.baseFail) return;
    const v = this.scene.viewExtent(), r = Math.min(8000, Math.max(300, v.r)), key = this.baseKey, L = this.liveAt;
    if (L && L.key === key && Math.hypot(v.c[0] - L.c[0], v.c[1] - L.c[1]) < L.r * 0.3 && r < L.r * 1.25 && r > L.r * 0.5) return;
    clearTimeout(this.liveT);
    this.liveT = window.setTimeout(() => void this.drawLive(v.c, r, key), now ? 0 : 250);
  }
  private async drawLive(c: XY, r: number, key: string): Promise<void> {
    const doc = this.store.doc, sat = doc.context.base === 'sputnik', pr = basePrefs();
    this.live ??= new LiveBase(...liveSize(this.el.scene));
    this.liveAt = { c, r: r * 1.15, key };
    const img = await this.live.render(frame(doc.origin).toGeo(c), r * 1.15, sat ? 'sat' : 'stil', pr.pal, pr.labels).catch(() => null);
    if (this.baseKey !== key || this.store.doc.context.loaded) return;
    if (!img) { this.baseFail = true; this.baseKey = ''; this.liveAt = null; void this.showBaseMap(); return; }
    const first = !this.scene.hasBaseMap;
    await this.scene.setBaseMap({ ...img, bg: sat ? '#2b2d2f' : PALETTES[pr.pal].bg }, doc.origin);
    this.baseAttr(sat, 'Fon: © OpenMapTiles · OpenFreeMap');
    if (first && !this.framedCtx && !doc.site && !doc.buildings.length) { this.framedCtx = true; this.scene.frameRadius(600); }
  }
  private showContext(b: ContextBundle | null): void {
    const doc = this.store.doc;
    if (b) { this.baseKey = ''; this.liveAt = null; void this.scene.setBaseMap(null, doc.origin); (this.el.attr.querySelector('.carto') as HTMLElement).hidden = true; }
    void this.scene.setContext(b, doc).then(() => {
      if (b && !this.framedCtx) { this.framedCtx = true; if (!doc.site) this.scene.frameRadius(Math.min(doc.context.radius, 350)); }
      // gorizont: kattaroq radiusdagi binolar (fon rejimida, xatoda jim)
      const fk = b && doc.context.layers.buildings ? `${b.center.join(',')}|${b.radius}|${doc.origin.join(',')}` : '';
      if (fk === this.farKey) return;
      this.farKey = fk; this.scene.setFar(null, doc);
      if (b && fk) void this.ctxMgr.loadFar(b.center, b.radius).then(f => { if (this.farKey === fk && f) this.scene.setFar(f.buildings, this.store.doc); });
    });
    this.el.attr.hidden = !b;
    (this.el.attr.querySelector('.sat') as HTMLElement).hidden = doc.context.base !== 'sputnik';
  }
  private framedCtx = false;
  private farKey = '';
  /** Koʻchalar qadamida bosilgan OSM koʻchasi (loyihaga olish uchun) */
  private osmPick: { id: number; cls: string; w: number; name?: string; pts: LngLat[] } | null = null;

  private renderBadge(): void {
    const b = this.el.badge, c = this.ctx;
    b.hidden = !c.busy && !c.err;
    b.dataset.s = c.err ? 'err' : 'busy';
    b.textContent = c.err ? 'Atrof yuklanmadi — «Hudud» qadamida qayta urining' : (c.msg || 'Atrof yuklanmoqda…');
  }

  private renderCtxProgress(): void {
    this.renderBadge();
    const bar = this.el.panel.querySelector<HTMLElement>('.prog i'), t = this.el.panel.querySelector<HTMLElement>('#ctxMsg');
    if (bar) bar.style.width = `${Math.round(this.ctx.frac * 100)}%`; if (t) t.textContent = this.ctx.msg;
  }

  private async doSearch(q: string): Promise<void> {
    if (!q.trim()) return;
    this.search = { ...this.search, q, busy: true, err: '', res: [] }; this.renderPanel();
    try { this.search.res = await geocode(q, this.store.doc.origin); if (!this.search.res.length) this.search.err = 'Hech narsa topilmadi. Koʻcha, mahalla yoki «41.311, 69.279» koʻrinishida yozing.'; }
    catch (e) { this.search.err = (e as Error).message || 'Qidiruvda xato'; }
    this.search.busy = false; this.renderPanel();
  }

  private goTo(p: Place, carry: boolean | null): void {
    const doc = this.store.doc;
    if (carry === null && (doc.site || doc.buildings.length)) { this.search.pending = p; this.renderPanel(); return; }
    this.search.pending = null; this.search.res = [];
    this.framedCtx = false;
    this.run(() => this.store.dispatch({ type: 'moveProject', origin: p.at, carry: !!carry }));
    this.scene.frameRadius(doc.site && carry ? 0 : 250);
    if (doc.site && carry) this.scene.frameDoc(this.store.doc);
  }

  /** Kvartalni bosib aniqlash: yoʻllar, temir yoʻl va suv — toʻsiq */
  private pickBlock(xy: XY): void {
    const b = this.ctxMgr.current, doc = this.store.doc; if (!b) return;
    const fr = frame(doc.origin);
    const NOT = /^(footway|path|cycleway|steps|track|bridleway|corridor|construction|proposed|platform|raceway)$/;
    const MINOR = /^(service|living_street|unclassified|pedestrian)$/;
    const ok = (r: { cls: string; sub?: string }) => !NOT.test(r.cls)
      && !(r.cls === 'service' && /driveway|parking_aisle|drive-through|emergency_access/.test(r.sub ?? ''))
      && !(this.blockMode === 'yirik' && MINOR.test(r.cls));
    const bars: Barrier[] = [
      ...b.osm.roads.filter(r => ok(r) && !(doc.removedRoads ?? []).includes(r.id)).map(r => ({ pts: r.pts.map(fr.toLocal), w: r.w })),
      ...b.osm.rails.map(r => ({ pts: r.pts.map(fr.toLocal), w: r.w + 4 })),
      ...b.osm.waterways.filter(w => /river|canal/.test(w.cls)).map(w => ({ pts: w.pts.map(fr.toLocal), w: w.w })),
    ];
    const res = detectBlock(bars, b.osm.water.map(a => a.rings[0].map(fr.toLocal)), xy, { window: Math.min(1400, 2 * doc.context.radius + 200) });
    if (!res.ok) { toast(res.reason); return; }
    this.run(() => this.store.dispatch({ type: 'setSite', rings: [res.ring.map(fr.toGeo)] }));
    this.setTool(null); this.scene.frameDoc(this.store.doc);
    toast(`Kvartal aniqlandi: ${fmt(res.area / 1e4, 2)} ga. Chegarani yoʻl chetidan oladi — kerak boʻlsa qaytadan chizing.`);
  }

  private hududPanel(body: HTMLElement): void {
    const doc = this.store.doc, cs = doc.context, b = this.ctxMgr.current, S = this.search;
    const q = h('input', { type: 'search', id: 'q', placeholder: 'Manzil, mahalla yoki 41.311, 69.279', value: S.q, 'aria-label': 'Manzil qidiruvi' }) as HTMLInputElement;
    q.addEventListener('keydown', e => { if (e.key === 'Enter') void this.doSearch(q.value); });
    body.append(
      h('div', { class: 'row' }, h('label', { class: 'field grow' }, h('span', { class: 'lb' }, 'Qidirish'), q),
        h('button', { class: 'btn', id: 'qGo', style: 'align-self:end', disabled: S.busy, onclick: () => void this.doSearch(q.value) }, S.busy ? '…' : 'Topish')));
    if (S.err) body.append(h('p', { class: 'err' }, S.err));
    if (!cs.loaded && !S.pending && !S.res.length) body.append(h('p', { class: 'note' }, 'Yoki xaritada joyni oʻng tugma bilan bosing → «Loyiha markazini shu yerga koʻchirish». Fon: «Xarita» tugmasida — maket yoki sunʼiy yoʻldosh.'));
    if (S.pending) {
      const p = S.pending;
      body.append(h('div', { class: 'warn' }, `«${p.name}» ga oʻtilmoqda. Chizilgan uchastka va binolar bilan nima qilamiz?`),
        h('div', { class: 'row' },
          h('button', { class: 'btn primary grow', id: 'mvCarry', onclick: () => this.goTo(p, true) }, 'Ular ham koʻchsin'),
          h('button', { class: 'btn grow', id: 'mvOnly', onclick: () => this.goTo(p, false) }, 'Joyida qolsin')),
        h('button', { class: 'btn', onclick: () => { this.search.pending = null; this.renderPanel(); } }, 'Bekor qilish'));
    } else if (S.res.length) {
      body.append(h('div', { class: 'list res', role: 'listbox', 'aria-label': 'Qidiruv natijalari' }, ...S.res.map(p => h('div', { class: 'it', role: 'option', onclick: () => this.goTo(p, null) }, h('b', {}, p.name), h('small', {}, p.detail)))));
    }
    body.append(h('div', { class: 'row' }, h('span', { class: 'lb grow' }, 'Markaz'), h('span', { class: 'num', id: 'orig' }, `${doc.origin[1].toFixed(5)}, ${doc.origin[0].toFixed(5)}`)));

    body.append(this.districtField());
    const radius = h('div', { class: 'seg full', role: 'group', 'aria-label': 'Radius' }, ...[300, 500, 750, 1000].map(r => h('button', { 'aria-pressed': cs.radius === r, onclick: () => this.run(() => this.store.dispatch({ type: 'setContext', patch: { radius: r } })) }, `${r} m`)));
    body.append(h('div', { class: 'field' }, h('span', { class: 'lb' }, 'Atrof radiusi'), radius));

    if (this.ctx.busy) body.append(h('div', { class: 'field' }, h('div', { class: 'prog' }, h('i', { style: `width:${Math.round(this.ctx.frac * 100)}%` })), h('span', { class: 'note', id: 'ctxMsg' }, this.ctx.msg)));
    else if (!cs.loaded) body.append(h('button', { class: 'btn primary', id: 'ctxLoad', onclick: () => this.run(() => {
      // xarita surilgan boʻlsa — loyiha markazi ekran markaziga koʻchadi (atrof shu yerda yuklanadi), aks holda eski markaz (Amir Temur) qolib ketardi
      const c = this.scene.viewExtent().c;
      if (!doc.site && !doc.buildings.length && Math.hypot(c[0], c[1]) > 60) { this.framedCtx = false; this.store.dispatch({ type: 'moveProject', origin: frame(doc.origin).toGeo(c), carry: false }); }
      this.store.dispatch({ type: 'setContext', patch: { loaded: true } });
    }) }, 'Atrofni yuklash (OSM, relyef, sunʼiy yoʻldosh)'), h('p', { class: 'note' }, 'Atrof ekran markazidagi joy atrofida yuklanadi — xaritani kerakli joyga suring.'));
    if (this.ctx.err) body.append(h('p', { class: 'err', id: 'ctxErr' }, this.ctx.err), h('button', { class: 'btn', onclick: () => void this.ensureContext(true) }, 'Qayta urinish'));

    if (cs.loaded && b && !this.ctx.busy) {
      const s = summary(b.osm), est = b.osm.buildings.filter(x => x.hSrc === 'taxmin').length;
      body.append(h('div', { class: 'ctxst', id: 'ctxSt' },
        h('b', {}, `${fmt(s.buildings)} bino`), ` · ${fmt(s.roadKm, 1)} km yoʻl · ${fmt(b.osm.water.length + b.osm.waterways.length)} suv obyekti · ${fmt(b.osm.green.length)} yashil hudud`, h('br'),
        h('span', { class: 'muted' }, `OSM, ${new Date(b.fetched).toLocaleDateString('ru-RU')}. ${est ? `${fmt(est)} ta binoning balandligi OSM da yoʻq — dogʻ maydoni va turi boʻyicha taxmin qilingan (kichik uylar — 1–2 qavat).` : ''}`)));
      if (b.stale) body.append(h('p', { class: 'warn', id: 'ctxStale' }, `OSM serveri hozir javob bermadi — keshdagi ${new Date(b.fetched).toLocaleDateString('ru-RU')} nusxasi koʻrsatilmoqda. Keyinroq «OSM dan yangilash» ni bosing.`));
      if (b.missing.length) body.append(h('p', { class: 'warn' }, `Yuklanmadi: ${b.missing.join(', ')}. Qolgan qatlamlar ishlaydi.`));
      const L = cs.layers, names: [keyof typeof L, string][] = [['buildings', 'Binolar'], ['roads', 'Yoʻllar'], ['rail', 'Temir yoʻl'], ['water', 'Suv'], ['green', 'Yashil hududlar'], ['trees', 'Daraxtlar*'], ['relief', 'Relyef']];
      body.append(
        h('div', { class: 'field' }, h('span', { class: 'lb' }, 'Yer qoplami'),
          h('div', { class: 'seg full', role: 'group' }, ...([['maket', 'Maket'], ['sputnik', 'Sunʼiy yoʻldosh']] as const).map(([k, t]) => h('button', { 'aria-pressed': cs.base === k, 'data-base': k, disabled: k === 'sputnik' && !b.imagery, onclick: () => this.run(() => this.store.dispatch({ type: 'setContext', patch: { base: k } })) }, t)))),
        h('div', { class: 'field' }, h('span', { class: 'lb' }, 'Qatlamlar'),
          h('div', { class: 'chk' }, ...names.map(([k, t]) => { const c = h('input', { type: 'checkbox', checked: L[k], 'data-layer': k }) as HTMLInputElement; c.onchange = () => this.run(() => this.store.dispatch({ type: 'setContext', patch: { layers: { [k]: c.checked } } })); return h('label', {}, c, t); }))),
        h('div', { class: 'row' },
          h('button', { class: 'btn grow', onclick: () => void this.ensureContext(true) }, 'OSM dan yangilash'),
          h('button', { class: 'btn grow', onclick: () => this.run(() => this.store.dispatch({ type: 'setContext', patch: { loaded: false } })) }, 'Yashirish')),
        h('p', { class: 'note' }, '* OSM dagi daraxtlar + park va koʻchalar boʻylab taxminiy joylashuv — faqat koʻrinish uchun, hisobda ishlatilmaydi.'));
    }
    const rmN = doc.removed?.length ?? 0;
    body.append(h('div', { class: 'ctxst', id: 'rmSt' },
      rmN ? h('div', { class: 'row' }, h('span', { class: 'grow' }, `Sahnadan olib tashlangan atrof binolari: ${rmN} ta`), h('button', { class: 'btn sm', id: 'rmBack', onclick: () => this.restoreRemoved() }, 'Qaytarish')) : '',
      h('span', { class: 'muted' }, 'Atrofdagi binoni bosing (Shift — bir nechtasini, Shift + sudrash — ramka bilan) va Delete ni bosing — sahnadan olib tashlanadi. Oʻng tugma — menyu.')));
  }

  /* ---------- 3-bosqich: quyosh, soyalar, insolyatsiya ---------- */
  private sunDate = '03-22';
  private insolRule: Result | null = null;
  private sunTime = 14;
  private insol: { busy: boolean; stats: { mean: number; ge2: number; ge3: number; bins: number[]; n: number; date: string } | null } = { busy: false, stats: null };
  private sunW: Worker | null = null;

  private applySun(): void {
    const [m, d] = this.sunDate.split('-').map(Number), o = this.store.doc.origin;
    const p = sunPosition(localToUtc(2026, m, d, this.sunTime), o[1], o[0]);
    this.scene.setSun(p.alt, p.az);
    const t = this.el.panel.querySelector<HTMLElement>('#sunInfo');
    if (t) t.textContent = `${String(Math.floor(this.sunTime)).padStart(2, '0')}:${String(Math.round(this.sunTime % 1 * 60)).padStart(2, '0')} · balandlik ${fmt(p.alt, 1)}° · azimut ${fmt(p.az, 0)}°`;
  }

  /** Loyiha binolari + saqlanadigan + atrofdagi mavjud binolar (qutidan `margin` m gacha) prizmalari */
  private aroundPrisms(x0: number, y0: number, x1: number, y1: number, margin: number): { ring: XY[]; top: number }[] {
    const doc = this.store.doc, fr = frame(doc.origin), b = this.ctxMgr.current, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rad = Math.hypot(x1 - x0, y1 - y0) / 2 + margin;
    const keepIds = new Set(this.scene.inSite.map(x => x.id)), rmIds = new Set(doc.removed ?? []);
    const extra = (b?.osm.buildings ?? []).map(x => ({ rings: x.rings.map(r => r.map(fr.toLocal)), h: x.h, id: x.id }))
      .filter(x => !keepIds.has(x.id) && !rmIds.has(x.id) && Math.hypot(x.rings[0][0][0] - cx, x.rings[0][0][1] - cy) < rad);
    return this.scene.prisms(doc, extra);
  }

  private async runInsolation(): Promise<void> {
    const doc = this.store.doc; if (!doc.site) return;
    const fr = frame(doc.origin), site = doc.site.rings.map(r => r.map(fr.toLocal));
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const p of site[0]) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const cell = Math.max(2, Math.sqrt((x1 - x0) * (y1 - y0) / 7000));
    const prisms = this.aroundPrisms(x0, y0, x1, y1, 300);
    const inB = (p: XY) => prisms.some(pr => pointIn(p, [pr.ring]));
    const pts: XY[] = [];
    for (let x = x0 + cell / 2; x < x1; x += cell) for (let y = y0 + cell / 2; y < y1; y += cell) { const p: XY = [x, y]; if (pointIn(p, site) && !inB(p)) pts.push(p); }
    const z = pts.map(p => this.scene.H(p[0], p[1]));
    const [m, d] = this.sunDate.split('-').map(Number), steps = daySteps(2026, m, d, doc.origin[1], doc.origin[0]);
    this.insol = { busy: true, stats: null }; this.renderPanel();
    let hours: Float32Array;
    try {
      this.sunW ??= new Worker(new URL('../workers/sun.worker.ts', import.meta.url), { type: 'module' });
      hours = await new Promise<Float32Array>((ok, no) => { const w = this.sunW!; w.onmessage = e => ok(e.data.hours); w.onerror = e => no(e); w.postMessage({ id: 1, pts, z, prisms, steps }); });
    } catch { hours = insolation(pts, z, prisms, steps); }
    const bins = INSOL_BINS.map(() => 0); let sum = 0, ge2 = 0, ge3 = 0;
    hours.forEach(hh => { sum += hh; if (hh >= 2) ge2++; if (hh >= 3) ge3++; let k = 0; INSOL_BINS.forEach(([t], i) => { if (hh >= t) k = i; }); bins[k]++; });
    const n = hours.length || 1;
    let ge05 = 0, ge1 = 0; hours.forEach(hh => { if (hh >= 0.5) ge05++; if (hh >= 1) ge1++; });
    const inPeriod = this.sunDate === '03-22' || this.sunDate === '09-22';
    this.insolRule = {
      id: 'insol-territory', title: 'Uy atrofidagi hudud insolyatsiyasi',
      source: { doc: 'SanQvaN 0331-16', edition: '2016', clause: '8.3-band (22.03–22.09: hududda ≥ 0,5–1 soat)', verified: true },
      ...(!inPeriod ? { status: 'na' as const, note: 'Davr chegarasi — 22 mart yoki 22 sentabr sanasini tanlab hisoblang (eng qisqa kun).' }
        : { status: (ge1 === n ? 'pass' : ge05 === n ? 'review' : 'fail') as Result['status'], value: ge1 / n * 100, unit: '% ≥ 1 soat', limit: '100 %',
            note: `${fmt(ge05 / n * 100, 0)} % nuqta ≥ 0,5 soat, ${fmt(ge1 / n * 100, 0)} % — ≥ 1 soat (uchastka yer sathi, binolar dogʻidan tashqari). Xonalar uchun 2,5 soat uzluksiz — 4-bosqichda (deraza nuqtalari boʻyicha).` }),
    };
    this.insol = { busy: false, stats: { mean: sum / n, ge2: ge2 / n, ge3: ge3 / n, bins: bins.map(v => v / n), n: hours.length, date: this.sunDate } };
    this.scene.setInsolation(pts, hours, cell);
    this.renderPanel();
  }

  /* ---------- shamol ---------- */
  private climate: Climate | null = null;
  private windDir: number | null = null;
  private wind: { busy: boolean; mode: 'ratio' | 'lawson'; stats: { cls: number[]; amp: number; n: number; dir: number; p95: number } | null; pts?: XY[]; ratio?: number[]; cell?: number } = { busy: false, mode: 'lawson', stats: null };
  private windW: Worker | null = null;

  private async loadClimate(): Promise<void> {
    if (this.climate) return;
    try { const r = await fetch('./climate/uz_climate.json'); this.climate = await r.json(); } catch { toast('Iqlim maʼlumoti yuklanmadi'); }
    this.renderPanel();
  }

  private windRose(st: Station): SVGSVGElement {
    const NS = 'http://www.w3.org/2000/svg', S = 170, c = S / 2, R = 72, svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${S} ${S}`); svg.setAttribute('width', '100%'); svg.setAttribute('class', 'rose');
    const max = Math.max(...st.rose.map(r => r.reduce((a, b) => a + b, 0)));
    const COLS = ['#d6e6f2', '#a9cbe3', '#72a7cf', '#3f7fb5', '#215a8f', '#0f3460'];
    const el = (tag: string, a: Record<string, string | number>) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, String(a[k])); svg.appendChild(e); return e; };
    [0.33, 0.66, 1].forEach(f => el('circle', { cx: c, cy: c, r: R * f, fill: 'none', stroke: 'var(--line)', 'stroke-width': 0.6 }));
    st.rose.forEach((bins, k) => {
      let acc = 0; const a0 = (k * 22.5 - 9) * Math.PI / 180, a1 = (k * 22.5 + 9) * Math.PI / 180;
      bins.forEach((v, b) => {
        if (v <= 0) return; const r0 = R * Math.sqrt(acc / max), r1 = R * Math.sqrt((acc + v) / max); acc += v;
        const P = (r: number, a: number) => `${c + r * Math.sin(a)},${c - r * Math.cos(a)}`;
        el('path', { d: `M${P(r0, a0)} L${P(r1, a0)} A${r1},${r1} 0 0 1 ${P(r1, a1)} L${P(r0, a1)} A${r0},${r0} 0 0 0 ${P(r0, a0)} Z`, fill: COLS[b] });
      });
    });
    [['Sh', 0], ['Shq', 90], ['J', 180], ['G', 270]].forEach(([t, d]) => { const a = Number(d) * Math.PI / 180, e = el('text', { x: c + (R + 9) * Math.sin(a), y: c - (R + 9) * Math.cos(a) + 3.5, 'text-anchor': 'middle', 'font-size': 9, fill: 'var(--muted)' }); e.textContent = String(t); });
    if (this.windDir != null) { const a = this.windDir * Math.PI / 180; el('line', { x1: c + R * Math.sin(a), y1: c - R * Math.cos(a), x2: c, y2: c, stroke: '#d9534f', 'stroke-width': 1.6, 'marker-end': '' }); }
    return svg;
  }

  private async runWind(): Promise<void> {
    const doc = this.store.doc, st = this.climate && nearestStation(this.climate, doc.origin[0], doc.origin[1]).s; if (!doc.site || !st) return;
    const fr = frame(doc.origin), site = doc.site.rings.map(r => r.map(fr.toLocal));
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const p of site[0]) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const m = 60, box: [number, number, number, number] = [x0 - m, y0 - m, x1 + m, y1 + m];
    const ext = Math.hypot(box[2] - box[0], box[3] - box[1]) + 360, cell = Math.max(2, ext / 170);
    const b = this.ctxMgr.current, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rad = ext / 2 + 50, keepIds = new Set(this.scene.inSite.map(x => x.id)), rmIds = new Set(doc.removed ?? []);
    const extra = (b?.osm.buildings ?? []).map(x => ({ rings: x.rings.map(r => r.map(fr.toLocal)), h: x.h, id: x.id })).filter(x => !keepIds.has(x.id) && !rmIds.has(x.id) && Math.hypot(x.rings[0][0][0] - cx, x.rings[0][0][1] - cy) < rad);
    const rings = this.scene.prisms(doc, extra).map(p => p.ring);
    const dir = this.windDir ?? prevailing(st).deg;
    this.wind = { ...this.wind, busy: true, stats: null }; this.renderPanel();
    const job: WindJob = { rings, box, fromDeg: dir, cell, steps: 2200 };
    let out: WindOut;
    try {
      this.windW ??= new Worker(new URL('../workers/wind.worker.ts', import.meta.url), { type: 'module' });
      out = await new Promise<WindOut>((ok, no) => { const w = this.windW!; w.onmessage = e => ok(e.data.out); w.onerror = e => no(e); w.postMessage({ id: 1, job }); });
    } catch { out = windField(job); }
    // uchastka va 40 m atrofi boʻyicha nuqtalar
    const pts: XY[] = [], ratio: number[] = [], step = Math.max(2.5, cell), inB = (p: XY) => rings.some(r => pointIn(p, [r]));
    for (let x = x0 - 40; x < x1 + 40; x += step) for (let y = y0 - 40; y < y1 + 40; y += step) { const p: XY = [x, y]; if (inB(p)) continue; pts.push(p); ratio.push(sampleWind(out, p)); }
    const p95 = st.p95 * PED_FACTOR, cls = LAWSON.map(() => 0); let amp = 0, n = 0;
    pts.forEach((p, i) => { if (!pointIn(p, site)) return; n++; cls[lawsonClass(ratio[i] * p95)]++; if (ratio[i] > 1.2) amp++; });
    this.wind = { busy: false, mode: this.wind.mode, stats: { cls: cls.map(v => v / Math.max(1, n)), amp: amp / Math.max(1, n), n, dir, p95 }, pts, ratio, cell: step };
    this.showWind(); this.renderPanel();
  }

  private showWind(): void {
    const w = this.wind; if (!w.pts || !w.ratio || !w.stats) return;
    const ramp = (r: number) => r < 0.4 ? 0x2b3a67 : r < 0.7 ? 0x4a6fa5 : r < 0.9 ? 0x7fb3c8 : r < 1.1 ? 0xe8e4c9 : r < 1.3 ? 0xf6c86b : r < 1.5 ? 0xf29a4a : 0xd9534f;
    const cols = w.mode === 'ratio' ? w.ratio.map(ramp) : w.ratio.map(r => LAWSON[lawsonClass(r * w.stats!.p95)][1]);
    this.scene.setGroundMap(w.pts, cols, w.cell);
  }

  private windSection(body: HTMLElement): void {
    if (!this.climate) { void this.loadClimate(); body.append(h('p', { class: 'note' }, 'Iqlim maʼlumoti yuklanmoqda…')); return; }
    const doc = this.store.doc, { s: st, km } = nearestStation(this.climate, doc.origin[0], doc.origin[1]), pv = prevailing(st);
    const dir = this.windDir ?? pv.deg;
    const sel = h('select', { id: 'windDir', onchange: (e: Event) => { this.windDir = Number((e.target as HTMLSelectElement).value); this.renderPanel(); } },
      ...Array.from({ length: 16 }, (_, k) => { const o = h('option', { value: k * 22.5 }, `${rumbName(k)} (${k * 22.5}°) · ${fmt(st.rose[k].reduce((a, b) => a + b, 0) * 100, 0)} %${k === pv.k ? ' — ustun' : ''}`) as HTMLOptionElement; o.selected = Math.abs(k * 22.5 - dir) < 1; return o; }));
    body.append(h('div', { class: 'field', id: 'windBox' }, h('span', { class: 'lb' }, 'Shamol'),
      h('div', { class: 'ctxst' }, h('b', {}, `${st.name.replace(/\./g, ' ')} · ${fmt(km, 0)} km`), h('br'), `Oʻrtacha ${fmt(st.mean, 1)} m/s · 5 % vaqt ${fmt(st.p95, 1)} m/s dan oshadi · shtil ${fmt(st.calm * 100, 0)} %`, h('br'),
        h('span', { class: 'muted' }, `Ustun yoʻnalish: ${rumbName(pv.k)} (${fmt(pv.share * 100, 0)} %). Manba: EPW TMYx 2011–2025 (climate.onebuilding.org).`)),
      this.windRose(st),
      h('label', { class: 'field' }, h('span', { class: 'lb' }, 'Hisob yoʻnalishi (qayerdan esadi)'), sel),
      h('button', { class: 'btn primary', id: 'windGo', disabled: this.wind.busy, onclick: () => void this.runWind() }, this.wind.busy ? 'Hisoblanmoqda… (5–15 s)' : 'Shamol oqimi (piyoda sathi)')));
    const w = this.wind.stats;
    if (w) {
      body.append(h('div', { class: 'seg full', role: 'group' }, ...([['lawson', 'Qulaylik (Lawson)'], ['ratio', 'Tezlik nisbati']] as const).map(([k, t]) => h('button', { 'aria-pressed': this.wind.mode === k, onclick: () => { this.wind.mode = k; this.showWind(); this.renderPanel(); } }, t))),
        h('div', { class: 'ctxst', id: 'windSt' }, h('b', {}, `${rumbName(Math.round(w.dir / 22.5) % 16)} shamoli: uchastkaning ${fmt(w.amp * 100, 0)} % ida tezlik 1,2× dan oshadi`), h('br'), h('span', { class: 'muted' }, `Piyoda sathi (1,5 m) 5 % tezligi ochiq joyda ≈ ${fmt(w.p95, 1)} m/s`)),
        this.wind.mode === 'lawson'
          ? h('div', { class: 'legend' }, ...LAWSON.map(([, c, t], i) => h('div', {}, h('i', { class: 'sw', style: `background:#${c.toString(16).padStart(6, '0')}` }), h('span', { class: 'grow' }, t), h('span', { class: 'num' }, `${fmt(w.cls[i] * 100, 0)} %`))))
          : h('div', { class: 'legend' }, ...[['< 0,4 pana', 0x2b3a67], ['0,7–0,9', 0x7fb3c8], ['0,9–1,1 ochiq joydek', 0xe8e4c9], ['1,3–1,5', 0xf29a4a], ['> 1,5 tezlashish', 0xd9534f]].map(([t, c]) => h('div', {}, h('i', { class: 'sw', style: `background:#${(c as number).toString(16).padStart(6, '0')}` }), h('span', { class: 'grow' }, String(t))))),
        h('button', { class: 'btn', onclick: () => { this.wind.stats = null; this.scene.setGroundMap(null); this.renderPanel(); } }, 'Xaritani yashirish'));
    }
    body.append(h('p', { class: 'note' }, 'Usul: 2D Lattice Boltzmann, piyoda sathida, bitta yoʻnalish. Bino ustidan oqish, turbulentlik va daraxtlar hisobga olinmaydi — dastlabki loyiha uchun sifat bahosi (tunnel, pana, burchak zonalari). Qulaylik mezoni — Lawson (LDDC), xalqaro amaliyot; Oʻzbekiston meʼyori emas.'));
  }

  private quyoshPanel(body: HTMLElement): void {
    const DATES: [string, string][] = [['03-22', '22 mart'], ['04-22', '22 aprel'], ['06-22', '22 iyun'], ['09-22', '22 sentabr'], ['12-22', '22 dekabr']];
    const time = h('input', { type: 'range', min: 5, max: 20, step: 0.25, value: this.sunTime, id: 'sunTime', style: 'width:100%' }) as HTMLInputElement;
    time.oninput = () => { this.sunTime = Number(time.value); this.applySun(); };
    body.append(
      h('div', { class: 'field' }, h('span', { class: 'lb' }, 'Sana'), h('div', { class: 'seg full', role: 'group' }, ...DATES.map(([k, t]) => h('button', { 'aria-pressed': this.sunDate === k, 'data-date': k, onclick: () => { this.sunDate = k; this.applySun(); this.renderPanel(); } }, t)))),
      h('div', { class: 'field' }, h('span', { class: 'lb' }, 'Vaqt (Toshkent, UTC+5)'), time, h('span', { class: 'num', id: 'sunInfo', style: 'font-size:12px' })),
      h('button', { class: 'btn primary', id: 'insolGo', disabled: this.insol.busy, onclick: () => void this.runInsolation() }, this.insol.busy ? 'Hisoblanmoqda…' : 'Insolyatsiya xaritasi (uchastka)'));
    const st = this.insol.stats;
    if (st) {
      const dt = DATES.find(x => x[0] === st.date)?.[1] ?? st.date;
      body.append(h('div', { class: 'ctxst', id: 'insolSt' },
        h('b', {}, `${dt}: oʻrtacha ${fmt(st.mean, 1)} soat quyosh`), h('br'),
        `≥ 2 soat — uchastkaning ${fmt(st.ge2 * 100, 0)} %, ≥ 3 soat — ${fmt(st.ge3 * 100, 0)} % (${fmt(st.n)} nuqta, yer sathida)`),
        h('div', { class: 'legend' }, ...INSOL_BINS.map(([, c, t], i) => h('div', {}, h('i', { class: 'sw', style: `background:#${c.toString(16).padStart(6, '0')}` }), h('span', { class: 'grow' }, t), h('span', { class: 'num' }, `${fmt(st.bins[i] * 100, 0)} %`)))),
        h('button', { class: 'btn', onclick: () => { this.insol.stats = null; this.scene.setInsolation(null); this.renderPanel(); } }, 'Xaritani yashirish'));
    }
    body.append(h('p', { class: 'note' }, 'Hisob: 15 daqiqalik qadamlar, quyosh balandligi > 3°, loyiha binolari + saqlanadigan va atrofdagi (300 m) mavjud binolar. Meʼyor: SanQvaN 0331-16, 8.3-band — 22 mart – 22 sentabr davrida xonalarda uzluksiz 2,5 soat, uy atrofidagi hududda ≥ 0,5–1 soat. Hudud natijasi reyestrga qoʻshiladi; xonalar (derazalar) — «Kvartiralar» qadamida.'));
    this.windSection(body);
    queueMicrotask(() => this.applySun());
  }

  /* ---------- 4-bosqich: fasad va kvartiralar ---------- */
  private roomDepth = 6;
  /* ---------- 8-qadam: fasad va tom (dizayn B — sozlamalar roʻyxati) ---------- */
  private lookTarget: 'sel' | 'use' | 'all' = 'all';
  private lookUse = 'turar';
  private facOpen: string | null = 'mat';
  private fasadPanel(body: HTMLElement): void {
    const doc = this.store.doc, fr = frame(doc.origin), sel = doc.buildings.find(b => b.id === this.sel);
    const uses = [...new Set(doc.buildings.map(b => b.use))];
    if (this.lookTarget === 'sel' && !sel) this.lookTarget = 'all';
    if (!uses.includes(this.lookUse as Use) && uses.length) this.lookUse = uses[0];
    const ids = () => this.lookTarget === 'sel' && sel ? [sel.id] : this.lookTarget === 'use' ? doc.buildings.filter(b => b.use === this.lookUse).map(b => b.id) : doc.buildings.map(b => b.id);
    const list = doc.buildings.filter(b => ids().includes(b.id));
    const apply = (patch: Omit<Extract<Command, { type: 'styleBuildings' }>, 'type' | 'ids'>) => { const l = ids(); if (!l.length) { toast('Binolar yoʻq'); return; } this.run(() => this.store.dispatch({ type: 'styleBuildings', ids: l, ...patch })); };
    // joriy qiymat: hammasida bir xil boʻlsa — oʻsha, aks holda «aralash» (null); koʻrinish uchun — eng koʻp uchragani
    const pick = <T,>(f: (b: Project['buildings'][number]) => T): { v: T | null; top: T | null } => {
      const m = new Map<T, number>(); list.forEach(b => { const v = f(b); m.set(v, (m.get(v) ?? 0) + 1); });
      const top = [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null; return { v: m.size === 1 ? top : null, top };
    };
    const mat = pick(b => b.mat ?? 'suvoq'), win = pick(b => b.win ?? 'yoq'), bal = pick(b => b.bal ?? 'yoq'), shape = pick(b => roofShape(b.roof)), cover = pick(b => roofCover(b.roof)), par = pick(b => b.parapet ?? 0), shd = pick(b => b.shade ?? 'yoq'), wpat = pick(b => b.winPat ?? 'qator'), bpat = pick(b => b.balPat ?? 'har2');
    const any = list.length > 0;
    // jonli fasad koʻrinishi
    body.append(h('div', { class: 'fpv', id: 'facPreview', html: facadePreview({ mat: (mat.top ?? 'suvoq') as Mat, win: (win.top ?? 'yoq') as Win | 'yoq', bal: (bal.top ?? 'yoq') as Bal, shape: shape.top ?? 'tekis', cover: cover.top ?? 'oddiy', parapet: par.top ?? 0, shade: (shd.top ?? 'yoq') as Shade | 'yoq' }) }));
    // qaysi binolarga
    const useSel = h('select', { id: 'lookUse' }, ...uses.map(u => h('option', { value: u, selected: u === this.lookUse }, useDef(u).name))) as HTMLSelectElement;
    useSel.onchange = () => { this.lookUse = useSel.value; this.renderPanel(); };
    body.append(h('div', { class: 'seg full', role: 'group', id: 'lookSeg', 'aria-label': 'Qaysi binolarga' },
      h('button', { 'data-look': 'sel', 'aria-pressed': this.lookTarget === 'sel', disabled: !sel, title: sel ? '' : 'Sahnada binoni bosing', onclick: () => { this.lookTarget = 'sel'; this.renderPanel(); } }, 'Tanlangan'),
      h('button', { 'data-look': 'use', 'aria-pressed': this.lookTarget === 'use', onclick: () => { this.lookTarget = 'use'; this.renderPanel(); } }, 'Funksiya'),
      h('button', { 'data-look': 'all', 'aria-pressed': this.lookTarget === 'all', onclick: () => { this.lookTarget = 'all'; this.renderPanel(); } }, 'Hammasi')),
      this.lookTarget === 'use' ? useSel : '',
      h('p', { class: 'muted fsub' }, any ? `${list.length} ta bino${this.lookTarget === 'sel' && sel ? ` · ${useDef(sel.use).name}` : ''}` : 'Binolar yoʻq — 6-qadamda hajmlarni yarating'));
    // roʻyxat: har qator — joriy qiymat, bosilsa variantlar tasmasi ochiladi
    type Opt = { key: string; val: string; n: string; on: boolean; d?: string; sw?: string; dis?: boolean; set: () => void };
    const mk = (o: Opt) => { const b = h('button', { class: 'ftile', [`data-${o.key}`]: o.val, 'aria-pressed': o.on, disabled: !!o.dis || !any, title: o.n, onclick: o.set }); b.append(o.sw ? h('span', { class: 'fsw', html: o.sw }) : svgIcon(`<path d="${o.d}"/>`), h('span', {}, o.n), h('i', { class: 'ck', html: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg>' })); return b; };
    const nm = <T,>(arr: { id?: T; v?: T; n: string }[], v: T | null) => v == null ? 'aralash' : arr.find(x => (x.id ?? x.v) === v)?.n ?? '—';
    const flatOnly = shape.v != null ? shape.v !== 'tekis' : list.some(b => roofShape(b.roof) !== 'tekis');
    const rows: { id: string; k: string; v: string; icon: string | null; sw?: string; opts: Opt[]; note?: string }[] = [
      { id: 'mat', k: 'Material', v: mat.v ? MATS.find(m => m.id === mat.v)!.name : 'aralash', icon: null, sw: matSwatch((mat.top ?? 'suvoq') as Mat, 32, 32),
        opts: MATS.map(m => ({ key: 'mat', val: m.id, n: m.name, on: mat.v === m.id, sw: matSwatch(m.id), set: () => apply({ mat: m.id }) })) },
      { id: 'win', k: 'Derazalar', v: nm(WIN_OPTS, win.v), icon: WIN_OPTS.find(x => x.id === (win.top ?? 'yoq'))!.d,
        opts: WIN_OPTS.map(w => ({ key: 'win', val: w.id, n: w.n, on: win.v === w.id, d: w.d, set: () => apply({ win: w.id }) })) },
      { id: 'wpat', k: 'Derazalar joylashuvi', v: nm(WINPAT_OPTS, wpat.v), icon: WINPAT_OPTS.find(x => x.id === (wpat.top ?? 'qator'))!.d,
        note: 'Parametrik: shaxmat, juft, ritm, tasodifiy (bino boʻyicha barqaror), gradient. Tanlansa — batafsil 3D fasad shu binolarda yoqiladi.',
        opts: WINPAT_OPTS.map(x => ({ key: 'wpat', val: x.id, n: x.n, on: wpat.v === x.id, d: x.d, set: () => apply({ winPat: x.id }) })) },
      { id: 'bal', k: 'Balkonlar', v: nm(BAL_OPTS, bal.v), icon: BAL_OPTS.find(x => x.id === (bal.top ?? 'yoq'))!.d,
        opts: BAL_OPTS.map(x => ({ key: 'bal', val: x.id, n: x.n, on: bal.v === x.id, d: x.d, set: () => apply({ bal: x.id }) })) },
      { id: 'bpat', k: 'Balkonlar joylashuvi', v: nm(BALPAT_OPTS, bpat.v), icon: BALPAT_OPTS.find(x => x.id === (bpat.top ?? 'har2'))!.d,
        note: bal.top === 'yoq' ? 'Avval balkon turini tanlang.' : undefined,
        opts: BALPAT_OPTS.map(x => ({ key: 'bpat', val: x.id, n: x.n, on: bpat.v === x.id, d: x.d, dis: bal.top === 'yoq', set: () => apply({ balPat: x.id }) })) },
      { id: 'roof', k: 'Tom shakli', v: nm(SHAPE_OPTS, shape.v), icon: SHAPE_OPTS.find(x => x.id === (shape.top ?? 'tekis'))!.d,
        opts: SHAPE_OPTS.map(x => ({ key: 'roof', val: x.id, n: x.n, on: shape.v === x.id, d: x.d, set: () => apply({ roof: roofOf(x.id, x.id === 'tekis' ? (cover.v ?? 'oddiy') : 'oddiy') }) })) },
      { id: 'cover', k: 'Tom qoplamasi', v: flatOnly && shape.v != null ? '—' : nm(COVER_OPTS, cover.v), icon: COVER_OPTS.find(x => x.id === (cover.top ?? 'oddiy'))!.d,
        note: flatOnly ? 'Yashil tom va quyosh paneli tekis tomga qoʻyiladi — tanlansa tom tekis boʻladi.' : undefined,
        opts: COVER_OPTS.map(x => ({ key: 'cover', val: x.id, n: x.n, on: cover.v === x.id && !flatOnly, d: x.d, set: () => apply({ roof: roofOf('tekis', x.id) }) })) },
      { id: 'par', k: 'Parapet', v: nm(PARAPET_OPTS, par.v), icon: PARAPET_OPTS.find(x => x.v === (par.top ?? 0))?.d ?? PARAPET_OPTS[0].d,
        opts: PARAPET_OPTS.map(x => ({ key: 'par', val: String(x.v), n: x.n, on: par.v === x.v, d: x.d, set: () => apply({ parapet: x.v }) })) },
      { id: 'shade', k: 'Quyosh himoyasi', v: nm(SHADE_OPTS, shd.v), icon: SHADE_OPTS.find(x => x.id === (shd.top ?? 'yoq'))!.d,
        note: 'SanQvaN 0331-16, 9.3: 90–290° ga qaragan fasadlarda. Avtomatik — janubda naves, sharq va gʻarbda lamellar.',
        opts: SHADE_OPTS.map(x => ({ key: 'shade', val: x.id, n: x.n, on: shd.v === x.id, d: x.d, set: () => apply({ shade: x.id }) })) },
    ];
    body.append(h('div', { class: 'flist', id: 'looks' }, ...rows.map(r => {
      const open = this.facOpen === r.id;
      const head = h('button', { class: 'frow', 'data-row': r.id, 'aria-expanded': open, onclick: () => { this.facOpen = open ? null : r.id; this.renderPanel(); } },
        h('span', { class: 'fic', html: r.sw ?? '' }, ...(r.icon && !r.sw ? [svgIcon(`<path d="${r.icon}"/>`)] : [])), h('span', { class: 'grow' }, r.k), h('span', { class: 'fval' }, r.v), svgIcon('<path d="M6 9l6 6 6-6"/>'));
      return h('div', { class: open ? 'fgrp open' : 'fgrp' }, head, open ? h('div', { class: 'fstrip', id: `strip-${r.id}` }, ...r.opts.map(mk)) : '', open && r.note ? h('p', { class: 'note fnote' }, r.note) : '');
    })));
    // tekshiruv — oxirida bitta guruhda, har birida band
    const ws = win.top && win.top !== 'yoq' ? winDef(win.top as Win) : null;
    const dep = h('input', { type: 'number', min: 3, max: 9, step: 0.1, value: this.roomDepth, id: 'roomDepth', 'aria-label': 'Xona chuqurligi, m' }) as HTMLInputElement;
    dep.onchange = () => { const v = Number(dep.value); if (v >= 3 && v <= 9) { this.roomDepth = v; this.renderPanel(); } };
    const chk: HTMLElement[] = [];
    const row = (t: string, s: string, st: 'ok' | 'warn' | 'bad' | 'na', v: string, extra?: HTMLElement) => chk.push(h('div', { class: 'frow static' }, h('span', { class: 'grow col' }, h('b', {}, t), h('small', { class: 'muted' }, s)), extra ?? '', h('span', { class: 'chip', 'data-s': st === 'ok' ? 'pass' : st === 'na' ? 'na' : 'fail' }, v)));
    if (ws) {
      const k = MOD_W * this.roomDepth / (ws.w * MOD_W * (ws.head - ws.sill)), okK = k >= 4.5 - 1e-6 && k <= 8 + 1e-6;
      row(`Yorugʻlik koeffitsiyenti 1:${fmt(k, 1)}`, `${ws.name}: deraza ${fmt(ws.w * MOD_W, 1)} × ${fmt(ws.head - ws.sill, 2)} m · meʼyor 1:4,5 – 1:8 · 8.2-band`, okK ? 'ok' : 'bad', okK ? 'mos' : 'mos emas');
    }
    const okD = this.roomDepth <= 6 + 1e-6 && this.roomDepth <= 2 * MOD_W + 1e-6;
    row('Xona chuqurligi', '≤ 6 m va ≤ 2 × eni · SanQvaN 8.7', okD ? 'ok' : 'bad', okD ? 'mos' : 'mos emas', h('span', { class: 'unit' }, dep, h('small', {}, 'm')));
    const plans = planApartments(doc);
    if (plans.length) {
      let n = 0, hot = 0, west = 0;
      plans.forEach(pl => { const used = new Set(pl.layout.apts.flatMap(a => a.mods)); pl.layout.mods.forEach((m, i) => { if (!used.has(i)) return; n++; if (m.az >= 90 && m.az <= 290) hot++; if (isWest(m.az)) west++; }); });
      const shaded = doc.buildings.some(b => b.shade);
      row('Quyoshdan himoya kerak', `${fmt(hot / n * 100, 0)} % deraza 90–290° ga qaragan · 9.3, 8.10–8.11`, hot === 0 || shaded ? 'ok' : 'warn', hot === 0 ? 'kerak emas' : shaded ? 'bor' : `${fmt(hot / n * 100, 0)} %`);
      row('Gʻarbga qaragan derazalar', `${fmt(west / n * 100, 0)} % · yashash xonasi qoʻyilmaydi · 9.2 · ${fmt(n)} modul bir qavatda`, west === 0 ? 'ok' : 'warn', `${fmt(west / n * 100, 0)} %`);
    }
    const solar = doc.buildings.filter(b => b.roof === 'quyosh').reduce((t, b) => t + area(b.footprint.map(fr.toLocal)), 0), pv = pvEstimate(solar);
    const green = doc.buildings.filter(b => b.roof === 'yashil').reduce((t, b) => t + area(b.footprint.map(fr.toLocal)), 0);
    const flatFallback = doc.buildings.filter(b => (b.roof === 'ikki' || b.roof === 'tort' || b.roof === 'bir') && !roofParts(b.footprint.map(fr.toLocal), b.roof)).length;
    const roofSt: HTMLElement[] = [];
    if (solar > 0) roofSt.push(h('div', { class: 'frow static' }, h('span', { class: 'grow col' }, h('b', {}, 'Quyosh panellari'), h('small', { class: 'muted' }, `taxmin: tomning ${PV.cover * 100} %, ${PV.kwpPerM2} kWp/m², ~${PV.yield} kWh/kWp`)), h('span', { class: 'chip', 'data-s': 'pass' }, `${fmt(pv.kwp)} kWp · ~${fmt(pv.mwh)} MWh/yil`)));
    if (green > 0) roofSt.push(h('div', { class: 'frow static' }, h('span', { class: 'grow col' }, h('b', {}, 'Yashil tomlar'), h('small', { class: 'muted' }, 'yashil maydon hisobiga alohida koʻrsatiladi')), h('span', { class: 'chip', 'data-s': 'pass' }, `${fmt(green)} m²`)));
    if (flatFallback > 0) roofSt.push(h('div', { class: 'frow static' }, h('span', { class: 'grow col' }, h('b', {}, 'Qiya tom qurilmadi'), h('small', { class: 'muted' }, `${flatFallback} ta murakkab shakldagi seksiyada — tekis koʻrsatiladi`)), h('span', { class: 'chip', 'data-s': 'review' }, String(flatFallback))));
    body.append(h('div', { class: 'lb' }, 'Tekshiruv'), h('div', { class: 'flist', id: 'facCheck' }, ...chk, roofSt.length ? h('div', { id: 'roofSt' }, ...roofSt) : ''),
      h('p', { class: 'note' }, 'Fasad koʻrinishi taxminiy: bitta qavat — bitta modul qatori, pastki noturar qavatlar — vitrina. Meʼyor: SanQvaN 0331-16, 8.2, 8.7, 8.10–8.11, 9.2, 9.3-bandlar.'));
  }

  private aptMode: 'insol' | 'west' = 'insol';
  /** 3D da kvartiralar: yoʻq / turi boʻyicha / insolyatsiya boʻyicha */
  private apt3d: 'yoq' | 'tur' | 'insol' = 'tur';
  private aptFloor: number | null = null;
  /** qavat rejasi: tanlangan bino va qavat */
  private planBid: string | null = null;
  private planFloor: number | null = null;
  private planSelSeen: string | null = null;
  static readonly APT_COL: Record<number, number> = { 1: 0xf2b134, 2: 0xf08a4b, 3: 0x4fb08a, 4: 0x3f5b8a };
  /** kvartira «terisi» 3D da (turi yoki insolyatsiya natijasi boʻyicha) */
  private showAptBoxes(): void {
    if (this.step.id !== 'kvartira' || this.apt3d === 'yoq') { this.scene.setAptBoxes(null); return; }
    const doc = this.store.doc, plans = planApartments(doc), fh = doc.settings.floorHeight, st = this.apt.stats, A = this.apt;
    const idx = new Map<string, number>(); if (st) A.pts.forEach((q, i) => idx.set(`${q.sec}|${q.f}|${q.m}`, i));
    const list: { a: XY; b: XY; y0: number; y1: number; color: number; depth: number }[] = [], caps: { ring: XY[]; y: number; color: number }[] = [];
    plans.forEach((pl, sec) => {
      const base = Math.min(...pl.ring.map(q => this.scene.H(q[0], q[1])));
      for (let f = pl.f0; f < pl.f1; f++) pl.layout.apts.forEach((a, ai) => {
        let color = Editor.APT_COL[Math.min(4, a.rooms)] ?? 0x888888;
        if (this.apt3d === 'insol') {
          if (!st) color = 0xcfcac1;
          else { const ok = a.living.map(m => st.cls[idx.get(`${sec}|${f}|${m}`) ?? -1] ?? 2); const good = ok.filter(c => c === 0 || c === 1).length; color = good >= Math.min(a.living.length, a.rooms >= 4 ? 2 : 1) ? (ok.every(c => c === 0) ? 0x3fa66b : 0xb7cf4f) : 0xd9534f; }
        }
        const y = base + (pl.z0 + f) * fh, ring = pl.layout.plan?.apts[ai]?.ring;
        // kvartira rejadagi chegarasi boʻyicha — fasaddagi qismi (burchak seksiyasida ham toʻgʻri)
        if (ring) { for (const [p, q] of facadeSegs(ring, pl.ring)) list.push({ a: p, b: q, y0: y + 0.06, y1: y + fh - 0.06, color, depth: 0.25 }); caps.push({ ring, y: y + 0.08, color }); }
        else for (const m of a.mods) { const md = pl.layout.mods[m]; list.push({ a: md.a, b: md.b, y0: y + 0.06, y1: y + fh - 0.06, color, depth: pl.halfDepth }); }
      });
    });
    this.scene.setAptBoxes(list, caps);
  }
  private aptDate = '03-22';
  private aptRelief = false;
  private apt: { busy: boolean; stats: AptStats | null; plans: SecPlan[]; pts: { sec: number; f: number; m: number }[]; ms?: number; buildings?: unknown } = { busy: false, stats: null, plans: [], pts: [] };
  private aptRules: Result[] = [];

  private clearApt(): void { this.apt = { busy: false, stats: null, plans: [], pts: [] }; this.aptRules = []; this.scene.setFacadeMarks(null); }

  private async runApts(): Promise<void> {
    const doc = this.store.doc, fh = doc.settings.floorHeight;
    const plans = planApartments(doc); if (!plans.length) { toast('Turar joy seksiyalari yoʻq'); return; }
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    plans.forEach(p => p.ring.forEach(q => { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }));
    const prisms = this.aroundPrisms(x0, y0, x1, y1, 350);
    const pts = windowPoints(plans), base = plans.map(p => Math.min(...p.ring.map(q => this.scene.H(q[0], q[1]))));
    const P = pts.map(q => plans[q.sec].layout.mods[q.m].p), Z = pts.map(q => base[q.sec] + (plans[q.sec].z0 + q.f) * fh + 1.2), A = pts.map(q => plans[q.sec].layout.mods[q.m].az);
    const [m, d] = this.aptDate.split('-').map(Number), steps = daySteps(2026, m, d, doc.origin[1], doc.origin[0], 10, 3);
    this.apt = { busy: true, stats: null, plans, pts }; this.renderPanel();
    const t0 = performance.now(); let res: { run: Float32Array; total: Float32Array };
    try {
      const w = new Worker(new URL('../workers/apt.worker.ts', import.meta.url), { type: 'module' });
      res = await new Promise((ok, no) => { w.onmessage = e => { ok(e.data); w.terminate(); }; w.onerror = e => { no(e); w.terminate(); }; w.postMessage({ id: 1, pts: P, z: Z, az: A, prisms, steps }); });
    } catch { res = windowSun(P, Z, A, prisms, steps); }
    if (this.store.doc.buildings !== doc.buildings) { this.apt.busy = false; this.renderPanel(); return; }
    const norm = { need: this.aptRelief ? 2.0 : 2.5 }, stats = evaluateApts(plans, pts, res.run, res.total, norm);
    this.apt = { busy: false, stats, plans, pts, ms: performance.now() - t0, buildings: doc.buildings };
    const pct = (a: number) => stats.apts ? a / stats.apts * 100 : 0;
    const src = { doc: 'SanQvaN 0331-16', edition: '2016', verified: true };
    this.aptRules = [
      { id: 'insol-apartments', title: 'Kvartiralar insolyatsiyasi (derazalar)', source: { ...src, clause: '8.3–8.5-bandlar' },
        status: stats.insolOk === stats.apts ? 'pass' : 'fail', value: pct(stats.insolOk), unit: '% kvartira', limit: '100 %',
        note: `${fmt(stats.apts - stats.insolOk)} / ${fmt(stats.apts)} kvartira talabga javob bermaydi (${this.aptDate === '03-22' ? '22 mart' : '22 sentabr'}, uzluksiz ${fmt(norm.need, 1)} soat yoki uzlukli ${fmt(norm.need + 0.5, 1)} soat; 1–3 xonalida ≥ 1 xona, 4 xonalida ≥ 2 xona).${this.aptRelief ? ' Rekonstruksiya / murakkab sharoit: 0,5 soat qisqartirilgan (8.5).' : ''} Kvartiralar sxemasi fasad modullari boʻyicha.` },
      { id: 'west-apartments', title: 'Yashash xonalari gʻarbga (kvartira boʻyicha)', source: { ...src, clause: '9.2-band' },
        status: stats.westOk === stats.apts ? 'pass' : 'fail', value: pct(stats.westOk), unit: '% kvartira', limit: '100 %',
        note: `${fmt(stats.apts - stats.westOk)} kvartirada gʻarbga (200–290°) qaragan yashash xonalari ruxsatdan koʻp (1 xonali — 0, 2 xonali — 1, 3 xonali — 2; 4 xonali uchun meʼyorda koʻrsatilmagan, 2 deb olindi).` },
    ];
    this.showApts(); this.renderPanel(); this.renderKpi();
  }

  private showApts(): void {
    const A = this.apt, st = A.stats; if (!st) { this.scene.setFacadeMarks(null); return; }
    const fh = this.store.doc.settings.floorHeight, base = A.plans.map(p => Math.min(...p.ring.map(q => this.scene.H(q[0], q[1]))));
    const list = A.pts.map((q, i) => {
      const pl = A.plans[q.sec], md = pl.layout.mods[q.m], c = st.cls[i], y = base[q.sec] + (pl.z0 + q.f) * fh;
      const color = c === 3 ? 0xd6d2c8 : this.aptMode === 'insol' ? [0x3fa66b, 0xb7cf4f, 0xd9534f][c] : st.west[i] ? 0xd9534f : isWest(md.az) ? 0xf29a4a : 0x3fa66b;
      return { a: md.a, b: md.b, y0: y + 0.8, y1: y + fh - 0.6, color };
    });
    this.scene.setFacadeMarks(list);
  }

  private kvartiraPanel(body: HTMLElement): void {
    const doc = this.store.doc, mix = doc.settings.aptMix, plans = planApartments(doc), sm = aptSummary(plans), perFloor = sm.total;
    const sum = mix.reduce((a, b) => a + b, 0) || 1, hex = (c: number) => '#' + c.toString(16).padStart(6, '0');
    // miks: sliderlar (maqsad) va natija (amalda)
    const rows = mix.map((v, i) => {
      const e = h('input', { type: 'range', min: 0, max: 100, step: 5, value: v, 'data-mix': i + 1, 'aria-label': `${i + 1} xonali, %` }) as HTMLInputElement;
      const t = h('b', { class: 'num', style: 'width:3.2em;text-align:right' }, `${Math.round(v / sum * 100)} %`);
      e.oninput = () => { t.textContent = `${e.value} %`; };
      e.onchange = () => { const nv = [...mix] as typeof mix; nv[i] = Math.max(0, Number(e.value) || 0); this.run(() => this.store.dispatch({ type: 'setSettings', patch: { aptMix: nv } })); };
      const got = sm.byK[i];
      return h('div', { class: 'mixrow' }, h('i', { class: 'sw', style: `background:${hex(Editor.APT_COL[i + 1])}` }), h('span', { class: 'grow' }, `${i + 1} xonali`), e, t,
        h('small', { class: 'muted' }, got.n ? `${fmt(got.n)} · ${fmt(got.share * 100, 0)} % · ~${fmt(got.area, 0)} m²` : '—'));
    });
    body.append(h('div', { class: 'field' }, h('span', { class: 'lb' }, 'Kvartira miksi (maqsad → natija: soni · ulushi · oʻrtacha netto m²)'), h('div', { class: 'mix', id: 'mixRow' }, ...rows),
      h('span', { class: 'note' }, 'Ulushlar nisbat sifatida olinadi (yigʻindi 100 % boʻlishi shart emas). Maydon — rejadagi kvartira maydoni × 0,85 (devorlar), balkonsiz.')));
    const size = doc.settings.aptSize ?? 'M';
    body.append(h('div', { class: 'field' }, h('span', { class: 'lb' }, 'Kvartira oʻlchami'),
      h('div', { class: 'seg full', role: 'group', id: 'aptSize' }, ...APT_SIZES.map(x => h('button', { 'aria-pressed': size === x.id, 'data-size': x.id, title: x.note, onclick: () => this.run(() => this.store.dispatch({ type: 'setSettings', patch: { aptSize: x.id as AptSize } })) }, x.name)))));
    if (!plans.length) { body.append(h('p', { class: 'note' }, 'Turar joy seksiyalari yoʻq. «Hajmlar» qadamida generatsiya qiling (yakka uylar va taunhauslar kvartirali emas).')); return; }
    body.append(h('div', { class: 'ctxst', id: 'aptPlan' }, h('b', {}, `${fmt(perFloor)} kvartira`), ` · ${fmt(plans.length)} seksiya`, sm.forced ? h('span', { class: 'chip', 'data-s': 'review', style: 'margin-left:6px' }, `${fmt(sm.forced)} miksdan tashqari`) : '', h('br'),
      h('span', { class: 'muted' }, `Reja qoidadan: seksiya → hovlidan kirish → zina-lift → qisqa koridor → har kvartiraga eshik, fasadga deraza (modul ${fmt(MOD_W, 1)} m), qorongʻi kvartira yoʻq. Maydon oʻlchami ${size}. Shu son reyestrdagi avtoturargoh talabiga (kvartiraga 1 joy) ham olinadi.`)));
    // 3D koʻrinish va qavat slideri
    const maxF = Math.max(1, ...plans.map(p => p.z0 + p.f1)), fh = doc.settings.floorHeight;
    const fl = h('input', { type: 'range', min: 1, max: maxF, step: 1, value: this.aptFloor ?? maxF, id: 'aptFloor', style: 'flex:1' }) as HTMLInputElement, flT = h('b', { class: 'num', style: 'width:5em;text-align:right' }, this.aptFloor ? `${this.aptFloor} / ${maxF}` : 'hammasi');
    const g0 = doc.site ? Math.min(...doc.site.rings[0].map(q => { const l = frame(doc.origin).toLocal(q); return this.scene.H(l[0], l[1]); })) : 0;
    fl.oninput = () => { const v = Number(fl.value); this.aptFloor = v >= maxF ? null : v; flT.textContent = this.aptFloor ? `${v} / ${maxF}` : 'hammasi'; this.scene.setSection(this.aptFloor ? { kind: 'h', z: g0 + v * fh + 0.3 } : null); };
    fl.onchange = () => this.renderPanel();
    // blok → qavat → reja (dizayn: «Kvartiralar A»): genplanda bino, qavat ‹ › , reja eskizi; «Albomda ochish» — toʻliq ekran, tahrir
    { if (this.sel && this.sel !== this.planSelSeen && plans.some(p => p.bid === this.sel)) { this.planBid = this.sel; this.planFloor = null; } this.planSelSeen = this.sel;
      const sel = plans.find(p => p.bid === this.planBid) ?? plans[0], si = plans.indexOf(sel);
      this.planBid = sel.bid;
      const groups = floorGroups(sel), typ = groups.find(g => g.type === 'typical')?.from ?? 1, fl0 = Math.max(1, Math.min(sel.f1, this.planFloor ?? typ)), ft = floorTypeOf(sel, fl0);
      const name = (pl: SecPlan, i: number) => `${i + 1}-bino · ${useDef(doc.buildings.find(x => x.id === pl.bid)?.use ?? 'turar').name}`;
      const optOf = (pl: SecPlan) => ({ fh: doc.settings.floorHeight, bal: doc.buildings.find(x => x.id === pl.bid)?.bal ?? null });
      const res = floorPlanSvg(sel, { scale: 200, dims: false, title: name(sel, si), floor: fl0, ...optOf(sel) });
      const pick = (b: string) => { this.planBid = b; this.planFloor = null; this.scene.select(b); this.renderPanel(); };
      const setF = (f: number) => { this.planFloor = Math.max(1, Math.min(sel.f1, f)); this.renderPanel(); };
      const album = () => openAlbum({ plans, bid: sel.bid, floor: fl0, fh: doc.settings.floorHeight, size: doc.settings.aptSize ?? 'M', docName: safe(doc.name), name, opt: optOf, download,
        onSave: (b2, pl) => { const fr = frame(doc.origin), bb = this.store.doc.buildings.find(x => x.id === b2); this.run(() => this.store.dispatch({ type: 'updateBuilding', id: b2, patch: { planEdit: pl && bb ? { key: planKey(this.store.doc, bb), apts: pl.apts.map(a => ({ ring: a.ring.map(fr.toGeo), rooms: a.rooms })), rooms: pl.rooms.map(q => ({ ring: q.ring.map(fr.toGeo), kind: q.kind })) } : undefined } })); this.clearApt(); },
        onClose: (b2, f) => { this.planBid = b2; this.planFloor = f; this.renderPanel(); } });
      body.append(h('div', { class: 'field' }, h('span', { class: 'lb' }, 'Bino · genplanda yoki sahnada bosing'), h('div', { class: 'gpbox', id: 'planGp' }, genplanSvg(plans, sel.bid, name, pick)),
        h('div', { class: 'row' }, h('b', { style: 'flex:1' }, name(sel, si)), h('small', { class: 'muted' }, `${sel.f1} qavat`))));
      body.append(h('div', { class: 'field' }, h('span', { class: 'lb' }, 'Qavat'),
        h('div', { class: 'row fstep' },
          h('button', { class: 'btn ib', id: 'planDown', 'aria-label': 'Pastki qavat', disabled: fl0 <= 1, onclick: () => setF(fl0 - 1) }, '‹'),
          h('div', { class: 'fsel', id: 'planFloorLbl' }, h('b', { class: 'num' }, `${fl0}-qavat`), h('small', {}, FLOOR_NAME[ft])),
          h('button', { class: 'btn ib', id: 'planUp', 'aria-label': 'Yuqori qavat', disabled: fl0 >= sel.f1, onclick: () => setF(fl0 + 1) }, '›')),
        h('div', { class: 'planbox', id: 'planBox', title: 'Albomda ochish', onclick: album, html: res.svg.replace(/^<\?xml[^>]*>\s*/, '').replace(/width="[^"]*mm" height="[^"]*mm"/, 'width="100%"') }),
        sel.edited === 'eskirgan' ? h('p', { class: 'warn' }, 'Qoʻlda tahrirlangan reja eskirgan (bino yoki kvartira sozlamalari oʻzgardi) — generatsiya qilingan reja koʻrsatilmoqda.', h('button', { class: 'btn', id: 'planEditClear', style: 'margin-top:6px', onclick: () => { this.run(() => this.store.dispatch({ type: 'updateBuilding', id: sel.bid, patch: { planEdit: undefined } })); this.clearApt(); this.renderPanel(); } }, 'Tahrirni oʻchirish')) : sel.edited === 'ok' ? h('div', { class: 'row' }, h('small', { class: 'muted', style: 'flex:1' }, 'Reja qoʻlda tahrirlangan'), h('button', { class: 'btn', id: 'planEditClear', onclick: () => { this.run(() => this.store.dispatch({ type: 'updateBuilding', id: sel.bid, patch: { planEdit: undefined } })); this.clearApt(); this.renderPanel(); } }, 'Asl reja')) : '',
        h('div', { class: 'row' },
          h('button', { class: 'btn grow primary', id: 'planEditBtn', onclick: album }, 'Albomda ochish'),
          h('button', { class: 'btn', id: 'planSvg', onclick: () => download(`${safe(doc.name)}_bino${si + 1}_q${fl0}.svg`, floorPlanSvg(sel, { scale: 200, dims: true, title: name(sel, si), floor: fl0, ...optOf(sel) }).svg, 'image/svg+xml') }, 'SVG'))));
    }
    body.append(h('div', { class: 'field' }, h('span', { class: 'lb' }, '3D da kvartiralar'),
      h('div', { class: 'seg full', role: 'group', id: 'apt3d' }, ...([['yoq', 'Yoʻq'], ['tur', 'Turi boʻyicha'], ['insol', 'Insolyatsiya']] as const).map(([k, t]) => h('button', { 'aria-pressed': this.apt3d === k, 'data-a3d': k, onclick: () => { this.apt3d = k; this.renderPanel(); } }, t))),
      h('div', { class: 'row' }, h('span', { class: 'lb' }, 'Qavat'), fl, flT)));
    body.append(
      h('div', { class: 'field' }, h('span', { class: 'lb' }, 'Hisob sanasi (SanQvaN 8.3 davri chegarasi)'),
        h('div', { class: 'seg full', role: 'group' }, ...([['03-22', '22 mart'], ['09-22', '22 sentabr']] as const).map(([k, t]) => h('button', { 'aria-pressed': this.aptDate === k, onclick: () => { this.aptDate = k; this.renderPanel(); } }, t)))),
      (() => { const c = h('input', { type: 'checkbox', checked: this.aptRelief, id: 'aptRelief' }) as HTMLInputElement; c.onchange = () => { this.aptRelief = c.checked; this.renderPanel(); }; return h('div', { class: 'chk', style: 'grid-template-columns:1fr' }, h('label', {}, c, 'Rekonstruksiya yoki murakkab sharoit (8.5: 2,0 soat)')); })(),
      h('button', { class: 'btn primary', id: 'aptGo', disabled: this.apt.busy, onclick: () => void this.runApts() }, this.apt.busy ? 'Hisoblanmoqda…' : 'Derazalar insolyatsiyasi'));
    const st = this.apt.stats;
    if (st) {
      const pct = (a: number, b = st.apts) => fmt(b ? a / b * 100 : 0, 0) + ' %';
      body.append(
        h('div', { class: 'seg full', role: 'group' }, ...([['insol', 'Insolyatsiya'], ['west', 'Gʻarb (9.2)']] as const).map(([k, t]) => h('button', { 'aria-pressed': this.aptMode === k, 'data-am': k, onclick: () => { this.aptMode = k; this.showApts(); this.renderPanel(); } }, t))),
        h('div', { class: 'ctxst', id: 'aptSt' }, h('b', {}, `${fmt(st.bothOk)} / ${fmt(st.apts)} kvartira mos (${pct(st.bothOk)})`), h('br'),
          `Insolyatsiya: ${pct(st.insolOk)} · gʻarb qoidasi: ${pct(st.westOk)} · yashash xonalari: ${pct(st.roomsOk, st.rooms)}`, h('br'),
          h('span', { class: 'muted' }, st.byRooms.map(r => `${r.k} xonali ${fmt(r.n)} (${pct(r.ok, r.n)} mos)`).join(' · ') + (this.apt.ms ? ` · ${fmt(this.apt.pts.length)} deraza, ${fmt(this.apt.ms / 1000, 1)} s` : ''))),
        this.aptMode === 'insol'
          ? h('div', { class: 'legend' }, ...[[0x3fa66b, 'Uzluksiz ≥ talab'], [0xb7cf4f, 'Faqat uzlukli (8.5)'], [0xd9534f, 'Yetarli emas'], [0xd6d2c8, 'Oshxona / yordamchi']].map(([c, t]) => h('div', {}, h('i', { class: 'sw', style: `background:#${(c as number).toString(16).padStart(6, '0')}` }), h('span', { class: 'grow' }, String(t)))))
          : h('div', { class: 'legend' }, ...[[0x3fa66b, 'Yashash xonasi'], [0xf29a4a, 'Gʻarbga, ruxsat doirasida'], [0xd9534f, 'Gʻarbga, ruxsatdan ortiq'], [0xd6d2c8, 'Oshxona / yordamchi']].map(([c, t]) => h('div', {}, h('i', { class: 'sw', style: `background:#${(c as number).toString(16).padStart(6, '0')}` }), h('span', { class: 'grow' }, String(t))))));
      const worst = st.bySec.filter(x => x.bad > 0).sort((a, b) => b.bad / b.apts - a.bad / a.apts).slice(0, 8);
      if (worst.length) body.append(h('div', { class: 'field' }, h('span', { class: 'lb' }, 'Eng muammoli seksiyalar'),
        h('div', { class: 'list', id: 'aptWorst' }, ...worst.map(x => h('div', { class: 'it', onclick: () => { this.sel = x.bid; this.scene.select(x.bid); } },
          h('b', {}, `${fmt(x.bad)} / ${fmt(x.apts)} kvartira mos emas`), h('small', {}, x.west ? `shundan ${fmt(x.west)} — gʻarb qoidasi` : 'insolyatsiya'))))));
      body.append(h('button', { class: 'btn', onclick: () => { this.clearApt(); this.renderPanel(); this.renderKpi(); } }, 'Belgilarni yashirish'));
    }
    body.append(h('p', { class: 'note' }, 'Hisob: har qavatdagi har xona derazasi (pol + 1,2 m), 10 daqiqalik qadamlar, quyosh > 3° va fasad oldida; soya — loyiha binolari, saqlanadigan va atrofdagi (350 m) binolar. Yashash xonalari kvartiraning eng yaxshi derazalarini oladi, oshxona — gʻarbiy yoki shimoliy (optimistik sxema; aniq reja keyingi bosqichda). Balkon, lodjiya va deraza qiyaliklari soyasi hisobga olinmaydi. Meʼyor: SanQvaN 0331-16, 8.3–8.5, 9.2-bandlar (asl matndan).'));
  }

  private districtField(): HTMLElement {
    const doc = this.store.doc, cur = doc.settings.district, r = demoRow(cur);
    const sel = h('select', { id: 'district', onchange: (e: Event) => this.run(() => this.store.dispatch({ type: 'setSettings', patch: { district: (e.target as HTMLSelectElement).value } })) },
      ...demoTree().map(t => h('optgroup', { label: t.region.name }, ...[t.region, ...t.parts].map(x => { const o = h('option', { value: x.code }, x.code === t.region.code ? `${x.name} (jami)` : x.name) as HTMLOptionElement; o.selected = x.code === cur; return o; }))));
    const k = r ? perThousand(r) : null;
    return h('div', { class: 'field', id: 'demoBox' }, h('span', { class: 'lb' }, 'Aholi yosh tarkibi (stat.uz)'), sel,
      r && k ? h('span', { class: 'note' }, `${fmt(r.pop)} kishi (${DEMO.year}). 1000 kishiga: maktab yoshi (7–17) ${fmt(k.school, 0)}, maktabgacha (3–6) ${fmt(k.mtm, 0)}, 65+ — ${fmt(k.elderly, 0)}. Maktab va MTM tekshiruvida taqqoslanadi; 3–5 yosh qoldiq usulida hisoblangan.`) : '');
  }

  /* ---------- 5-bosqich: xizmatlar va piyoda ---------- */
  private svc: { busy: boolean; err: string; poi: PoiBundle | null; res: SvcResult[] | null; sel: Svc; demand: Demand[]; net: Net | null; src: Record<string, XY[]>; ms: number; buildings?: unknown } = { busy: false, err: '', poi: null, res: null, sel: 'mtm', demand: [], net: null, src: {}, ms: 0 };
  private svcRule: Result | null = null;
  private poiKind: Svc = 'mtm';
  private poiName = '';

  private async loadPoi(force = false): Promise<void> {
    if (this.svc.busy) return;
    this.svc.busy = true; this.svc.err = ''; this.renderPanel();
    try { this.svc.poi = await this.ctxMgr.loadPoi(this.store.doc.origin, force); }
    catch (e) { this.svc.err = `OSM obyektlari yuklanmadi: ${(e as Error).message}. Faqat loyiha obyektlari va kontekst yoʻllari bilan hisoblanadi.`; }
    this.svc.busy = false; this.runServices();
  }

  private runServices(): void {
    const doc = this.store.doc, fr = frame(doc.origin), t0 = performance.now();
    const roads = this.svc.poi?.roads ?? (this.ctxMgr.current?.osm.roads ?? []).map(r => ({ cls: r.cls, pts: r.pts }));
    const lines = roads.filter(r => WALKABLE(r.cls)).map(r => r.pts.map(fr.toLocal));
    const net = buildNet(lines, doc.streets.map(st => st.axis.map(fr.toLocal)));
    const demand: Demand[] = doc.buildings.filter(b => useDef(b.use).res > 0 && b.gen?.kind !== 'stilobat' && b.floors > b.nonRes).map(b => {
      const r = b.footprint.map(fr.toLocal); return { p: centroid(r), w: area(r) * (b.floors - b.nonRes) * useDef(b.use).res, bid: b.id };
    });
    const src: Record<string, { pts: XY[] }[]> = {}; const add = (k: Svc, pts: XY[]) => (src[k] ??= []).push({ pts });
    const MAP: Partial<Record<Use, Svc>> = { maktab: 'maktab', mtm: 'mtm', poliklinika: 'poliklinika', savdo: 'savdo', sport: 'sport', ijtimoiy: 'mahalla' };
    this.plan().blocks.forEach(b => { const k = MAP[b.use]; if (k) add(k, boundaryPts(b.rings[0])); });
    doc.buildings.forEach(b => { const r = b.footprint.map(fr.toLocal); const k = MAP[b.use]; if (k) add(k, boundaryPts(r)); else if (b.nonRes > 0 && useDef(b.use).res > 0) add('savdo', [centroid(r)]); });
    // OSM obyektlari: uchastka ichidagilari buziladi (saqlanadigan bino ichidagisi bundan mustasno)
    const site = doc.site?.rings.map(r => r.map(fr.toLocal)) ?? null, keep = new Set(doc.keep), kept = this.scene.inSite.filter(b => keep.has(b.id));
    let dropped = 0;
    (this.svc.poi?.pois ?? []).forEach(p => { const q = fr.toLocal(p.at); if (site && pointIn(q, site) && !kept.some(b => pointIn(q, b.rings))) { dropped++; return; } add(p.kind, [q]); });
    doc.pois.forEach(p => add(p.kind, [fr.toLocal(p.at)]));   // qoʻlda belgilangan mavjud obyektlar
    const res = analyze(net, demand, src as Record<Svc, { pts: XY[] }[]>);
    this.svc = { ...this.svc, res, demand, net, src: Object.fromEntries(Object.entries(src).map(([k, v]) => [k, v.flatMap(o => o.pts)])), ms: performance.now() - t0, buildings: doc.buildings };
    const bad = res.filter(r => r.share < 0.999), fmtR = (r: SvcResult) => `${svcDef(r.kind).name} ${r.r} m — ${fmt(r.share * 100, 0)} %`;
    this.svcRule = !demand.length ? null : {
      id: 'service-radius', title: 'Xizmat koʻrsatish radiuslari (piyoda)', source: { doc: 'ShNQ 2.07.01-23', edition: '2023', clause: '539-band, 38-jadval (shahar)', verified: true },
      status: !bad.length ? 'pass' : bad.some(r => r.share < 0.8) ? 'fail' : 'review', value: res.filter(r => r.share >= 0.999).length, unit: `/ ${res.length} tur`, limit: '7 / 7',
      note: `Aholi ulushi (turar joy maydoni boʻyicha) radius ichida: ${res.map(fmtR).join('; ')}. Masofa — piyoda tarmogʻi boʻylab (OSM + loyiha koʻchalari). Manba: loyiha parsellari va OSM obyektlari${dropped ? ` (uchastka ichidagi ${dropped} ta OSM obyekti buziladi deb chiqarildi)` : ''}. OSM toʻliq emas — natija pastki baho.`,
    };
    this.showSvc(); this.renderPanel(); this.renderKpi();
  }

  private showSvc(): void {
    const S = this.svc, r = S.res?.find(x => x.kind === S.sel); if (!r || !S.net) { this.scene.setNetMap(null); return; }
    const R = r.r, col = (d: number) => d <= R * 0.5 ? 0x1a9850 : d <= R ? 0x91cf60 : d <= R * 1.5 ? 0xfdae61 : d < Infinity ? 0xd73027 : 0xb9b5ad;
    const segs = S.net.segs.map(([a, b]) => ({ a: S.net!.xy[a], b: S.net!.xy[b], color: col(Math.min(r.D[a], r.D[b])) }));
    const dots = [...(S.src[S.sel] ?? []).map(p => ({ p, color: 0x2a6fb0, size: 9 })), ...S.demand.map((d, i) => ({ p: d.p, color: r.dist[i] <= R ? 0x1a9850 : 0xd73027, size: 12 }))];
    this.scene.setNetMap(segs, dots);
  }

  private xizmatPanel(body: HTMLElement): void {
    const S = this.svc;
    if (!S.res && !S.busy && !S.err) queueMicrotask(() => void this.loadPoi());
    if (S.busy) body.append(h('p', { class: 'note' }, 'OSM: maktab, bogʻcha, poliklinika, dorixona, doʻkonlar va 2 km piyoda yoʻllari yuklanmoqda…'));
    if (S.err) body.append(h('p', { class: 'warn' }, S.err));
    if (S.res) {
      if (S.buildings !== this.store.doc.buildings) body.append(h('p', { class: 'warn' }, 'Loyiha oʻzgardi — natija eskirgan.'), h('button', { class: 'btn', onclick: () => this.runServices() }, 'Qayta hisoblash'));
      body.append(h('table', { class: 'reg', id: 'svcTab' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Xizmat'), h('th', {}, 'Radius'), h('th', {}, 'Obyekt'), h('th', {}, 'Aholi'))),
        h('tbody', {}, ...S.res.map(r => h('tr', { 'data-svc': r.kind, 'aria-selected': r.kind === S.sel, style: `cursor:pointer;${r.kind === S.sel ? 'background:var(--sel, #eef4fa)' : ''}`, onclick: () => { this.svc.sel = r.kind; this.showSvc(); this.renderPanel(); } },
          h('td', {}, svcDef(r.kind).name), h('td', { class: 'num' }, `${r.r} m`), h('td', { class: 'num' }, String(r.sources)),
          h('td', {}, h('span', { class: 'chip', 'data-s': r.share >= 0.999 ? 'pass' : r.share >= 0.8 ? 'review' : 'fail' }, `${fmt(r.share * 100, 0)} %`)))))));
      const r = S.res.find(x => x.kind === S.sel)!, def = svcDef(S.sel), far = S.demand.map((_d, i) => r.dist[i]).filter(x => x > r.r);
      body.append(h('div', { class: 'ctxst', id: 'svcSt' }, h('b', {}, `${def.name}: ${def.note}`), h('br'),
        far.length ? `${fmt(far.length)} / ${fmt(S.demand.length)} seksiya radiusdan tashqarida, eng uzoq ${Number.isFinite(Math.max(...far)) ? fmt(Math.max(...far), 0) + ' m' : 'yetib boʻlmaydi'}` : `Barcha ${fmt(S.demand.length)} seksiya radius ichida`,
        r.far ? h('span', { class: 'muted' }, ` · ${r.far} ta obyekt tarmoqdan tashqarida (toʻgʻri masofa × 1,3)`) : ''),
        h('div', { class: 'legend' }, ...[[0x1a9850, `≤ ${r.r / 2} m`], [0x91cf60, `≤ ${r.r} m`], [0xfdae61, `≤ ${r.r * 1.5} m`], [0xd73027, `> ${r.r * 1.5} m`], [0x2a6fb0, 'Obyekt (loyiha yoki OSM)']].map(([c, t]) => h('div', {}, h('i', { class: 'sw', style: `background:#${(c as number).toString(16).padStart(6, '0')}` }), h('span', { class: 'grow' }, String(t))))),
        h('div', { class: 'row' }, h('button', { class: 'btn grow', onclick: () => void this.loadPoi(true) }, 'OSM dan yangilash'), h('button', { class: 'btn grow', onclick: () => { this.svc.res = null; this.svc.err = 'yashirildi'; this.scene.setNetMap(null); this.renderPanel(); } }, 'Yashirish')),
        h('p', { class: 'muted' }, `${fmt(S.poi?.pois.length ?? 0)} OSM obyekt, ${fmt(S.net?.segs.length ?? 0)} yoʻl boʻlagi · ${fmt(S.ms, 0)} ms`));
    } else if (S.err === 'yashirildi') { body.append(h('button', { class: 'btn primary', onclick: () => { this.svc.err = ''; void this.loadPoi(); } }, 'Xizmatlar tahlili')); }
    // qoʻlda obyekt qoʻshish (OSM da yoʻq bogʻcha, maktab…)
    const doc = this.store.doc, fr = frame(doc.origin);
    const kindSel = h('select', { id: 'poiKind' }, ...SERVICES.map(x => { const o = h('option', { value: x.id }, x.name) as HTMLOptionElement; o.selected = x.id === this.poiKind; return o; })) as HTMLSelectElement;
    kindSel.onchange = () => { this.poiKind = kindSel.value as Svc; };
    const nameIn = h('input', { id: 'poiName', placeholder: 'Nomi (ixtiyoriy), masalan 45-MTM', value: this.poiName }) as HTMLInputElement;
    nameIn.oninput = () => { this.poiName = nameIn.value; };
    const placing = this.tool instanceof ClickTool && this.tool.hint.startsWith('Obyekt');
    body.append(h('div', { class: 'field', id: 'poiBox' }, h('span', { class: 'lb' }, 'Mavjud obyektni qoʻlda qoʻshish'),
      h('div', { class: 'row' }, kindSel, nameIn),
      h('button', { class: placing ? 'btn primary' : 'btn', id: 'poiAdd', onclick: () => placing ? this.setTool(null) : this.setTool(new ClickTool('Obyekt joyini bosing (kirish yoki uchastka chegarasi) · Esc — tugatish', xy => {
        this.run(() => this.store.dispatch({ type: 'addPoi', poi: { id: uid('poi_'), kind: this.poiKind, at: fr.toGeo(xy), ...(this.poiName.trim() ? { name: this.poiName.trim() } : {}) } }));
        this.poiName = ''; if (this.svc.res) this.runServices();
      })) }, ...(placing ? ['Qoʻshishni tugatish'] : icl(IC.plus, 'Xaritada belgilash'))),
      doc.pois.length ? h('div', { class: 'list', id: 'poiList' }, ...doc.pois.map(p => h('div', { class: 'it' }, h('b', {}, svcDef(p.kind).name), h('small', {}, p.name ?? 'nomsiz'),
        h('button', { class: 'btn', 'aria-label': 'Oʻchirish', onclick: (e: Event) => { e.stopPropagation(); this.run(() => this.store.dispatch({ type: 'removePoi', id: p.id })); if (this.svc.res) this.runServices(); } }, svgIcon(IC.x))))) : ''));
    body.append(h('p', { class: 'note' }, 'Meʼyor: ShNQ 2.07.01-23, 539-band, 38-jadval (shahar; asl matndan). Masofa seksiya markazidan obyekt uchastkasi chegarasigacha piyoda yoʻllar boʻylab; past zichlikdagi hududlar uchun kattaroq radiuslar (MTM 500, dorixona 800 m) hali qoʻllanmagan. 39-jadval (qizil chiziq va turar joygacha masofalar) — keyingi qadamda. OSM Toshkentda toʻliq emas: mavjud bogʻcha yoki maktab koʻrinmasa, «Parsellar» qadamida tegishli funksiyani bering.'));
  }

  /* ---------- 5-bosqich: hisobot va TEP ---------- */
  private allRules(): Result[] { return [...(this.last?.results ?? []), ...(this.insolRule ? [this.insolRule] : []), ...this.planRules(), ...this.aptRules, ...(this.svcRule ? [this.svcRule] : [])]; }
  /** Seksiya rejalari qoidalari (barcha seksiyalar boʻyicha): koridordan kirish, zinalar soni, koridor uzunligi */
  private planRuleCache: { doc: unknown; rules: Result[] } | null = null;
  private planRules(): Result[] {
    const doc = this.store.doc; if (this.planRuleCache?.doc === doc) return this.planRuleCache.rules;
    const plans = planApartments(doc), all = plans.map(p => sectionChecks(p, doc.settings.floorHeight));
    const agg = (id: string): { bad: number; vals: string[] } => { let bad = 0; const vals: string[] = []; all.forEach((cs, i) => { const c = cs.find(x => x.id === id); if (c && c.ok === false) { bad++; vals.push(`${i + 1}-seksiya: ${c.value}`); } }); return { bad, vals }; };
    const SHNQ = { doc: 'ShNQ 2.01.02-04', edition: '2004', verified: true };
    const mk = (id: string, chk: string, title: string, source: Result['source'], okNote: string): Result => { const a = agg(chk); return { id, title, source, status: !plans.length ? 'na' : a.bad ? 'fail' : 'pass', value: plans.length - a.bad, unit: `/ ${plans.length} seksiya`, limit: 'hammasi', note: a.bad ? a.vals.join('; ') : okNote }; };
    const rules = plans.length ? [
      mk('plan-access', 'mop', 'Kvartiralarga kirish — faqat umumiy koridordan', { doc: 'Rejalash qoidasi', clause: 'zina-lift → koridor → kvartira', edition: '—', verified: true }, 'Har seksiya rejasida har kvartira eshigi MOP ga chiqadi, deraza fasadda; boshqa kvartira orqali kirish yoʻq.'),
      mk('plan-stairs', 'stairs', 'Evakuatsiya zinalari soni', { ...SHNQ, clause: '5.13' }, 'Qavatdagi kvartiralar maydoni > 500 m² boʻlgan seksiyalarda 2 ta zina.'),
      mk('plan-corridor', 'len', 'Umumiy koridor uzunligi', { ...SHNQ, clause: '5.25' }, 'Koridorlar ≤ 60 m (uzunrogʻi 2-tur toʻsiq bilan boʻlinadi).'),
    ] : [];
    this.planRuleCache = { doc, rules }; return rules;
  }
  private tep() {
    const doc = this.store.doc, d = this.last?.d; if (!d) return [];
    const demo = this.scene.inSite.length ? this.demolition() : null, st = this.apt.stats;
    const cr = this.scene.inSite.length ? this.comp() : null;
    return tepRows(d, doc, demo, { ...(cr ? { comp: cr, regime: doc.settings.comp.regime, priceSource: doc.settings.comp.priceSource } : {}), ...(st ? { apts: st.apts, aptOk: st.bothOk } : {}), ...(this.svc.res ? { svc: this.svc.res.map(r => ({ name: svcDef(r.kind).name, r: r.r, share: r.share })) } : {}) });
  }
  private reportNotes(): string[] {
    const s = this.store.doc.settings;
    return [
      `Aholi = kvartiralar netto maydoni ÷ ${s.m2PerPerson} m²/kishi; netto = turar joy GFA × ${s.netToGross}.`,
      JOBS_NOTE,
      `Avtoturargoh talabi kvartiralar soniga koʻra (${this.last?.d.aptSource === 'sxema' ? 'kvartira sxemasidan' : `oʻrtacha ${s.aptNet} m² taxmin`}), yer osti/stilobat parkovka — 30 m²/joy brutto (taxmin).`,
      'Mavjud binolar va koʻchalar — OpenStreetMap; balandligi yoʻqlari dogʻ maydoni va turi boʻyicha taxmin qilingan.',
      ...(this.apt.stats ? ['Kvartiralar — fasad modullari (3,3 m) boʻyicha sxema; yashash xonalari eng yaxshi derazalarda (optimistik), balkon soyasi hisobga olinmagan.'] : []),
      ...(this.svc.res ? ['Xizmat radiuslari piyoda yoʻllari boʻylab; OSM obyektlari toʻliq emas — qamrov pastki baho.'] : []),
      ...(this.scene.inSite.some(x => !new Set(this.store.doc.keep).has(x.id)) ? [`Koʻchirish xarajati — dastlabki baho (${this.store.doc.settings.comp.regime === 'orq1149' ? 'OʻRQ-1149, 40–42-moddalar: noqulaylik 12 %, foyda 2 yil' : 'OʻRQ-781, 23–25-moddalar: noqulaylik 5 %, foyda 1 yil'}); bozor qiymati — ${this.store.doc.settings.comp.priceSource || 'kiritilgan narx'}; baholovchi xulosasi emas (OʻRQ-781, 29-modda).`] : []),
      'Shamol (agar hisoblangan boʻlsa) — 2D LBM, Lawson mezoni xalqaro amaliyotdan; Oʻzbekiston meʼyori emas.',
    ];
  }
  private openReport(): void {
    const w = window.open('', '_blank'); if (!w) { toast('Brauzer yangi oynani bloklayapti — ruxsat bering'); return; }
    const shots = this.scene.captureViews(this.store.doc);
    const ctx = this.sheetCtx(), doc = this.store.doc, so = (kind: SheetKind) => ({ ...SHEET_DEFAULT, kind, paper: 'A4' as const, show: { ...SHEET_DEFAULT.show, title: false } });
    const sheets = doc.site || doc.buildings.length ? (['bosh', 'zona'] as SheetKind[]).map(k => { const r = sheetSvg(doc, ctx, so(k)); return { name: `${k === 'bosh' ? 'Bosh reja' : 'Zonalash'}, M 1:${r.scale}`, svg: r.svg }; }) : [];
    w.document.open(); w.document.write(reportHtml(doc, shots, this.tep(), this.allRules(), this.reportNotes(), sheets)); w.document.close();
  }
  private tepXlsx(): Uint8Array {
    const doc = this.store.doc, tep = this.tep(), rules = this.allRules();
    const ST: Record<string, string> = { pass: 'mos', fail: 'mos emas', review: 'koʻrib chiqish', na: 'baholanmadi' };
    const sheets: Sheet[] = [
      { name: 'TEP', widths: [16, 52, 12, 16, 46], rows: [['Guruh', 'Koʻrsatkich', 'Birlik', 'Qiymat', 'Izoh'], ...tep.map(r => [r.g, r.name, r.unit, typeof r.v === 'number' ? Math.round(r.v * 100) / 100 : r.v, r.note ?? ''])] },
      { name: 'Binolar', widths: [5, 26, 12, 10, 14, 18, 12, 12, 12], rows: [BUILDING_HEAD, ...buildingRows(doc)] },
      { name: 'Reyestr', widths: [44, 34, 14, 16, 14, 70], rows: [['Talab', 'Manba', 'Qiymat', 'Meʼyor', 'Natija', 'Izoh'], ...rules.map(r => [r.title, `${r.source.doc}, ${r.source.clause}`, r.value != null ? Math.round(r.value * 100) / 100 : '', r.limit ? `${r.limit} ${r.unit ?? ''}` : '', ST[r.status], r.note ?? ''])] },
      { name: 'Maʼlumot', widths: [30, 60], rows: [['Maydon', 'Qiymat'], ['Loyiha', doc.name], ['Sana', new Date().toLocaleDateString('ru-RU')], ['Markaz (kenglik, uzunlik)', `${doc.origin[1].toFixed(6)}, ${doc.origin[0].toFixed(6)}`], ['Qavat balandligi, m', doc.settings.floorHeight], ['Taʼminot, m²/kishi', doc.settings.m2PerPerson], ...this.reportNotes().map((n, i) => [`Taxmin ${i + 1}`, n])] },
    ];
    return toXlsx(sheets);
  }

  /* ---------- 3-bosqich: hajmlar va seksiya generatori ---------- */
  private gen: GenParams = { ...DEFAULT_GEN };
  private genNotes: string[] = [];
  private genFar: number | null = null;

  /** Kvartal uchun barqaror guruh id si: zona belgisi (yoʻq boʻlsa — yaratiladi) */
  private blockLabel(i: number): ZoneLabel | null {
    const b = this.plan().blocks[i]; if (!b) return null;
    const fr = frame(this.store.doc.origin);
    return this.store.doc.zones.find(z => z.id === b.labelId) ?? { id: uid('z_'), at: fr.toGeo(b.centroid), use: b.use };
  }

  private generateBlock(i: number, quiet = false): number {
    const plan = this.plan(), b = plan.blocks[i], lab = this.blockLabel(i); if (!b || !lab) return 0;
    const ud = useDef(b.use), name = this.unitName(i);
    if (!ud.build) { if (!quiet) toast(`${name} — «${ud.name}», binolar joylashtirilmaydi`); return 0; }
    if (isSocial(b.use)) return this.generateSocial(i, quiet);
    const g: GenParams = usePreset(b.use, this.gen) ?? (ud.floors ? { ...this.gen, minF: ud.floors[0], maxF: ud.floors[1], nonRes: 0 } : this.gen);
    const fr = frame(this.store.doc.origin), r = generate(b.rings[0], g, this.store.doc.settings.floorHeight);
    this.genNotes = r.notes; this.genFar = r.far ?? null;
    const use: Use = b.use;
    const grp = b.parcelId ?? lab.id;
    this.run(() => this.store.dispatch({ type: 'replaceGroup', grp, label: b.parcelId ? undefined : { ...lab, gen: { ...this.gen } },
      sections: r.sections.map(x => ({ footprint: x.ring.map(fr.toGeo), floors: x.floors, nonRes: (use === 'turar' && x.kind === 'qator') ? 0 : x.nonRes, use: (x.use as Use) ?? use, kind: x.kind, z0: x.z0 })),
      garage: r.parking ? { kind: r.parking.kind, ring: r.parking.ring.map(fr.toGeo), levels: r.parking.levels, spaces: r.parking.spaces } : null }));
    if (!quiet) toast(r.sections.length ? `${name}: ${r.sections.length} seksiya` : (r.notes[0] ?? 'Seksiya joylashmadi'));
    return r.sections.length;
  }

  /* ---------- ijtimoiy binolar (maktab, MTM, poliklinika) ---------- */
  private socMod: Record<SocialUse, Module> = { maktab: 'taroq', mtm: 'chiziq', poliklinika: 'blok' };
  private socM2: Record<SocialUse, number> = { maktab: SOCIAL.maktab.m2, mtm: SOCIAL.mtm.m2, poliklinika: SOCIAL.poliklinika.m2 };
  private socFloors: Record<SocialUse, number> = { maktab: SOCIAL.maktab.floors, mtm: SOCIAL.mtm.floors, poliklinika: SOCIAL.poliklinika.floors };
  private socCap: Record<string, number> = {};
  /** sigʻim: ehtiyoj (loyiha aholisi × stat.uz yosh tarkibi) va parsel maydoni (41-jadval / 543-band) dan kichigi */
  private socTarget(i: number): { use: SocialUse; demand: number; plot: number; cap: number } | null {
    const b = this.plan().blocks[i]; if (!b || !isSocial(b.use)) return null;
    const pop = this.last?.d.population ?? 0, demand = Math.round(socialDemand(b.use, pop, demoRow(this.store.doc.settings.district))), plot = plotCapacity(b.use, b.area);
    const key = `${b.parcelId ?? b.labelId ?? String(i)}|${b.use}`, typical = { maktab: 1000, mtm: 240, poliklinika: 500 }[b.use], auto = demand > 0 ? Math.min(demand, plot) : Math.min(plot, typical);
    return { use: b.use, demand, plot, cap: this.socCap[key] ?? Math.max(b.use === 'poliklinika' ? 50 : 40, auto) };
  }
  private generateSocial(i: number, quiet = false): number {
    const plan = this.plan(), b = plan.blocks[i], lab = this.blockLabel(i), t = this.socTarget(i); if (!b || !lab || !t) return 0;
    const doc = this.store.doc, fr = frame(doc.origin), ring = b.rings[0], n = ring.length;
    // 39-jadval: qizil chiziqqa (loyiha koʻchasi koridori yoki uchastka chegarasi) yaqin qirralardan 25 m, qolganidan 6 m
    const lines = [...plan.corridors.flatMap(mp => mp), ...(doc.site?.rings.map(r => r.map(fr.toLocal)) ?? [])];
    const near = (p: XY) => lines.some(r => { for (let k = 0; k < r.length; k++) { const a = r[k], q = r[(k + 1) % r.length], dx = q[0] - a[0], dy = q[1] - a[1], L2 = dx * dx + dy * dy || 1, u = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)); if (Math.hypot(a[0] + dx * u - p[0], a[1] + dy * u - p[1]) < 1.5) return true; } return false; });
    const red = t.use !== 'poliklinika' ? 25 : 6;
    const sb = ring.map((p, k) => near([(p[0] + ring[(k + 1) % n][0]) / 2, (p[1] + ring[(k + 1) % n][1]) / 2]) ? red : 6);
    const sp = socialPlan(ring, t.use, t.cap, this.socMod[t.use], this.socM2[t.use], this.socFloors[t.use], sb);
    this.genNotes = [`${SOCIAL[t.use].name}: ${fmt(t.cap)} ${SOCIAL[t.use].unit} · ${fmt(sp.gfa)} m² GFA · ${this.socFloors[t.use]} qavat (taxmin ${this.socM2[t.use]} m²/${SOCIAL[t.use].unit})`, ...sp.notes]; this.genFar = null;
    if (!sp.sections.length) { if (!quiet) toast(sp.notes[0] ?? 'Joylashmadi'); return 0; }
    this.run(() => this.store.dispatch({ type: 'replaceGroup', grp: b.parcelId ?? lab.id, label: b.parcelId ? undefined : lab,
      sections: sp.sections.map(x => ({ footprint: x.ring.map(fr.toGeo), floors: x.floors, nonRes: 0, use: t.use, kind: 'ijtimoiy' })), garage: null }));
    if (!quiet) toast(`${this.unitName(i)}: ${SOCIAL[t.use].name.toLowerCase()} — ${fmt(t.cap)} ${SOCIAL[t.use].unit}, ${fmt(sp.gfa)} m²`);
    return sp.sections.length;
  }
  private socialSection(i: number): HTMLElement | '' {
    const t = this.socTarget(i); if (!t) return '';
    const S = SOCIAL[t.use], b = this.plan().blocks[i], key = `${b.parcelId ?? b.labelId ?? String(i)}|${b.use}`;
    const cap = h('input', { type: 'number', min: 10, max: 5000, step: 10, value: t.cap, id: 'socCap', style: 'width:6em' }) as HTMLInputElement;
    cap.onchange = () => { this.socCap[key] = Math.max(10, Number(cap.value) || t.cap); this.renderPanel(); };
    const m2 = h('input', { type: 'number', min: 4, max: 40, step: 0.5, value: this.socM2[t.use], id: 'socM2', style: 'width:5em' }) as HTMLInputElement;
    m2.onchange = () => { this.socM2[t.use] = Math.max(4, Number(m2.value) || S.m2); this.renderPanel(); };
    return h('div', { class: 'field soc', id: 'socBox' }, h('span', { class: 'lb' }, `${S.name} — avtomat`),
      h('div', { class: 'balance' },
        h('div', { class: 'brow' }, h('span', {}, `Ehtiyoj (loyiha aholisi, stat.uz)`), h('b', { class: 'num' }, t.demand ? `${fmt(t.demand)} ${S.unit}` : '—')),
        h('div', { class: 'brow' }, h('span', {}, t.use === 'maktab' ? 'Parsel sigʻimi (41-jadval)' : t.use === 'mtm' ? 'Parsel sigʻimi (543-band)' : 'Parsel sigʻimi (45-jadval, taxmin)'), h('b', { class: 'num' }, `${fmt(t.plot)} ${S.unit}`))),
      h('label', { class: 'row', style: 'font-size:12.5px' }, h('span', { class: 'grow' }, `Sigʻim, ${S.unit}`), cap),
      h('div', { class: 'typos', role: 'group', 'aria-label': 'Modul' }, ...S.modules.map(m => { const bt = h('button', { class: 'typo', 'data-mod': m.id, 'aria-pressed': this.socMod[t.use] === m.id, title: m.note, onclick: () => { this.socMod[t.use] = m.id; this.renderPanel(); } }); bt.append(svgIcon(MOD_ICON[m.id]), h('span', {}, m.name)); return bt; })),
      h('p', { class: 'note' }, S.modules.find(m => m.id === this.socMod[t.use])!.note),
      h('div', { class: 'row' }, h('label', { class: 'row', style: 'font-size:12.5px' }, 'm²/', S.unit.split('/')[0], m2),
        h('div', { class: 'stp', style: 'grid-template-columns:auto 28px 30px 28px' }, h('span', {}, 'Qavat'), h('button', { disabled: this.socFloors[t.use] <= 1, onclick: () => { this.socFloors[t.use]--; this.renderPanel(); } }, '−'), h('b', { id: 'socFl' }, String(this.socFloors[t.use])), h('button', { disabled: this.socFloors[t.use] >= S.maxFloors, onclick: () => { this.socFloors[t.use]++; this.renderPanel(); } }, '+'))),
      h('p', { class: 'note' }, `Qizil chiziqdan ${t.use === 'poliklinika' ? '6' : '25'} m (39-jadval), qoʻshni parseldan 6 m. Bino maydoni oʻringa — taxmin (ShNQ 2.08.02-23 da maktab va MTM binosi maydoni berilmagan; xalqaro va MDH tipik loyihalari oraligʻi).`));
  }

  private hajmPanel(body: HTMLElement): void {
    const doc = this.store.doc, fr = frame(doc.origin), plan = this.plan(), g = this.gen;
    if (this.selBlock != null && !plan.blocks[this.selBlock]) this.selBlock = null;
    const num = (id: string, label: string, v: number, min: number, max: number, step: number, set: (x: number) => void) => {
      const inp = h('input', { type: 'number', id, min, max, step, value: v }) as HTMLInputElement;
      inp.onchange = () => { const x = Number(inp.value); if (Number.isFinite(x)) set(Math.max(min, Math.min(max, x))); this.renderPanel(); };
      return h('label', { class: 'field grow' }, h('span', { class: 'lb' }, label), inp);
    };
    body.append(h('div', { class: 'field' }, h('span', { class: 'lb' }, 'Kvartal'),
      h('select', { id: 'genBlock', onchange: (e: Event) => { const v = (e.target as HTMLSelectElement).value; this.selBlock = v === '' ? null : Number(v); this.scene.selectBlock(this.selBlock); this.renderPanel(); } },
        h('option', { value: '' }, '— sahnada bosing yoki tanlang —'),
        ...plan.blocks.map((b, i) => { const o = h('option', { value: i }, `${this.unitName(i)} · ${fmt(b.area / 1e4, 2)} ga · ${useDef(b.use).name}`) as HTMLOptionElement; o.selected = i === this.selBlock; return o; }))));
    const socI = this.selBlock != null && isSocial(plan.blocks[this.selBlock]?.use ?? '') ? this.selBlock : null;
    if (socI != null) {
      body.append(this.socialSection(socI),
        h('div', { class: 'row' }, h('button', { class: 'btn primary grow', id: 'genGo', onclick: () => this.generateSocial(socI) }, 'Joylashtirish'),
          h('button', { class: 'btn', id: 'genAll', title: 'Barcha kvartallar', onclick: () => { let n = 0; const cnt = plan.blocks.length; for (let i = 0; i < cnt; i++) n += this.generateBlock(i, true); toast(`${n} seksiya generatsiya qilindi`); } }, 'Hammasi'),
          h('button', { class: 'btn', id: 'genClear', onclick: () => { const u = plan.blocks[socI], lab = this.blockLabel(socI); if (u && lab) this.run(() => this.store.dispatch({ type: 'replaceGroup', grp: u.parcelId ?? lab.id, sections: [] })); } }, 'Tozalash')));
      if (this.genNotes.length) body.append(h('div', { class: 'warn', id: 'genNotes' }, ...this.genNotes.map(n => h('div', {}, n))));
    } else body.append(
      h('div', { class: 'field' }, h('span', { class: 'lb' }, 'Tipologiya'),
        h('div', { class: 'typos', role: 'group', 'aria-label': 'Tipologiya' }, ...(Object.keys(TYPO_NAME) as Typology[]).map(k => { const b = h('button', { class: 'typo', 'aria-pressed': g.typology === k, 'data-typ': k, title: TYPO_NAME[k], onclick: () => { g.typology = k; this.renderPanel(); } }); b.append(svgIcon(TYPO_ICON[k]), h('span', {}, TYPO_SHORT[k])); return b; }))),
      (() => {
        const far = h('input', { type: 'range', min: 0, max: 6, step: 0.1, value: g.far ?? 0, id: 'gFar', style: 'width:100%' }) as HTMLInputElement, ft = h('b', { class: 'num' }, (g.far ?? 0) > 0 ? fmt(g.far!, 1) : 'oʻchiq');
        far.oninput = () => { g.far = Number(far.value); ft.textContent = g.far > 0 ? fmt(g.far, 1) : 'oʻchiq'; };
        return h('div', { class: 'field' }, h('div', { class: 'row' }, h('span', { class: 'grow', style: 'font-size:13px' }, 'Maqsadli UMN (FAR)'), ft), far,
          h('span', { class: 'note' }, g.typology === 'avto' ? 'Avto: < 0,6 yakka uylar · < 1,3 villalar · < 3,5 perimetral blok · ≥ 3,5 blok + minora' : 'Berilsa — qavatlar shu qiymatga yaqinlashtiriladi (eng koʻp qavat — chegara)'));
      })(),
      h('div', { class: 'row' }, num('gMax', 'Qavat, eng koʻp', g.maxF, 1, 40, 1, x => { g.maxF = x; g.minF = Math.min(g.minF, x); }), num('gMin', 'eng kam', g.minF, 1, 40, 1, x => { g.minF = Math.min(x, g.maxF); })),
      h('div', { class: 'row' }, num('gDepth', 'Chuqurlik, m', g.depth, 9, 24, 0.5, x => { g.depth = x; }), num('gLen', 'Seksiya, m', g.secLen, 15, 60, 1, x => { g.secLen = x; }), num('gSet', 'Chekinish, m', g.setback, 0, 20, 0.5, x => { g.setback = x; })),
      ['perimetr', 'blok_minora', 'blok_villa', 'avto'].includes(g.typology) ? h('label', { class: 'row', style: 'font-size:13px' }, (() => { const c = h('input', { type: 'checkbox', checked: g.passages, id: 'gPass' }) as HTMLInputElement; c.onchange = () => { g.passages = c.checked; }; return c; })(), 'Har ~100 m da hovliga oʻtish (6 m)') : '',
      ['minora', 'blok_minora', 'avto'].includes(g.typology) ? h('div', { class: 'row' }, num('gTower', 'Minora qavati', g.towerF ?? 16, 9, 60, 1, x => { g.towerF = x; })) : '',
      h('div', { class: 'row' }, num('gSty', 'Stilobat, qavat', g.stylobate ?? 0, 0, 3, 1, x => { g.stylobate = x; }), num('gPL', 'Yer osti, sath', g.parkLevels ?? 1, 1, 4, 1, x => { g.parkLevels = x; })),
      h('div', { class: 'field' }, h('span', { class: 'lb' }, 'Parkovka'), h('div', { class: 'seg full', role: 'group' }, ...(Object.keys(PARK_NAME) as ParkingKind[]).map(k => h('button', { 'aria-pressed': (g.parking ?? 'yoq') === k, 'data-park': k, onclick: () => { g.parking = k; this.renderPanel(); } }, PARK_NAME[k])))),
      h('div', { class: 'row' },
        h('button', { class: 'btn primary grow', id: 'genGo', disabled: this.selBlock == null, onclick: () => { if (this.selBlock != null) this.generateBlock(this.selBlock); } }, 'Generatsiya'),
        h('button', { class: 'btn', id: 'genAll', title: 'Turar joy, aralash, ijtimoiy va savdo kvartallarining hammasi', onclick: () => { let n = 0; const cnt = plan.blocks.length; for (let i = 0; i < cnt; i++) n += this.generateBlock(i, true); toast(`${n} seksiya generatsiya qilindi`); } }, 'Hammasi'),
        h('button', { class: 'btn', id: 'genClear', disabled: this.selBlock == null, onclick: () => { const u = this.selBlock != null ? plan.blocks[this.selBlock] : null, lab = this.selBlock != null ? this.blockLabel(this.selBlock) : null; if (u && lab) this.run(() => this.store.dispatch({ type: 'replaceGroup', grp: u.parcelId ?? lab.id, sections: [] })); } }, 'Tozalash')));
    if (socI == null && (this.genNotes.length || this.genFar != null)) body.append(h('div', { class: 'warn', id: 'genNotes' }, ...(this.genFar != null ? [h('div', {}, h('b', {}, `Parsel UMN: ${fmt(this.genFar, 2)}`))] : []), ...this.genNotes.map(n => h('div', {}, n))));
    // tanlangan bino / seksiya
    const sel = doc.buildings.find(b => b.id === this.sel);
    const gens = doc.buildings.filter(b => b.gen).length;
    body.append(h('div', { class: 'ctxst', id: 'bldSt' }, h('b', {}, `${doc.buildings.length} bino/seksiya`), gens ? ` · shundan generatsiya ${gens}` : '', h('br'), h('span', { class: 'muted' }, 'Seksiyani sahnada bosing — qavatini oʻzgartiring yoki oʻchiring.')));
    if (sel) {
      const kind = sel.gen ? (({ burchak: 'Burchak seksiyasi', oddiy: 'Oddiy seksiya', qator: 'Qator seksiyasi', uy: 'Yakka uy', taunhaus: 'Taunhaus', villa: 'Villa', minora: 'Minora', stilobat: 'Stilobat' } as Record<string, string>)[sel.gen.kind] ?? 'Seksiya') : 'Bino';
      body.append(h('div', { class: 'list' }, h('div', { class: 'it', 'aria-selected': true, 'data-bid': sel.id },
        h('span', { class: 'grow' }, `${kind} · ${sel.floors} qavat${sel.nonRes ? ` (${sel.nonRes} noturar)` : ''}`),
        h('button', { title: 'Qavat −', id: 'flMinus', onclick: () => this.run(() => this.store.dispatch({ type: 'updateBuilding', id: sel.id, patch: { floors: sel.floors - 1 } }, 'fl-' + sel.id)) }, '−'),
        h('button', { title: 'Qavat +', id: 'flPlus', onclick: () => this.run(() => this.store.dispatch({ type: 'updateBuilding', id: sel.id, patch: { floors: sel.floors + 1 } }, 'fl-' + sel.id)) }, '+'),
        h('button', { title: 'Oʻchirish', onclick: () => this.store.dispatch({ type: 'removeBuilding', id: sel.id }) }, svgIcon(IC.x)))));
    }
    // qoʻlda chizish
    const fl = h('input', { type: 'number', min: 1, max: 60, value: this.floors, id: 'fl' }) as HTMLInputElement;
    const nr = h('input', { type: 'number', min: 0, max: 10, value: this.nonRes, id: 'nr' }) as HTMLInputElement;
    fl.onchange = () => { this.floors = Math.max(1, Math.min(60, Math.round(Number(fl.value) || 1))); };
    nr.onchange = () => { this.nonRes = Math.max(0, Math.min(10, Math.round(Number(nr.value) || 0))); };
    const drawing = this.tool instanceof RectTool, drawingP = this.tool instanceof PolygonTool && this.step.id === 'hajm';
    body.append(h('details', { class: 'manual', open: drawing || drawingP || !gens }, h('summary', {}, 'Qoʻlda bino chizish'),
      h('div', { class: 'row' }, h('label', { class: 'field grow' }, h('span', { class: 'lb' }, 'Qavatlar'), fl), h('label', { class: 'field grow' }, h('span', { class: 'lb' }, 'Noturar pastki'), nr)),
      h('div', { class: 'row' },
        h('button', { class: drawing ? 'btn primary grow' : 'btn grow', id: 'drawBld', onclick: () => drawing ? this.setTool(null) : this.setTool(new RectTool(this.scene, r => {
          this.run(() => this.store.dispatch({ type: 'addBuilding', footprint: r.map(fr.toGeo), floors: this.floors, nonRes: this.nonRes }));
          this.el.hint.textContent = this.tool?.hint ?? '';
        }, toast)) }, ...(drawing ? ['Toʻxtatish'] : icl(IC.plus, 'Toʻrtburchak'))),
        h('button', { class: drawingP ? 'btn primary grow' : 'btn grow', id: 'drawPoly', title: 'Erkin shakl: nuqtalarni bosing, birinchi nuqta yoki Enter — yopish', onclick: () => drawingP ? this.endTool() : this.setTool(new PolygonTool(this.scene, r => {
          this.run(() => this.store.dispatch({ type: 'addBuilding', footprint: r.map(fr.toGeo), floors: this.floors, nonRes: this.nonRes }));
          this.setTool(new PolygonTool(this.scene, r2 => { this.run(() => this.store.dispatch({ type: 'addBuilding', footprint: r2.map(fr.toGeo), floors: this.floors, nonRes: this.nonRes })); }, toast, 20));
        }, toast, 20)) }, ...(drawingP ? ['Toʻxtatish'] : icl(IC.plus, 'Erkin shakl')))),
      h('p', { class: 'note' }, 'Uchlar va qirralarga yopishadi (Shift — oʻchiq). Kesma uzunligi chiziqda koʻrinadi.')));
  }

  /* ---------- 2-bosqich: koʻchalar, parsellar, yashil ---------- */
  private plan(): PlanGeo {
    const d = this.store.doc;
    if (this.planCache?.doc !== d) this.planCache = { doc: d, plan: computePlan(d) };
    return this.planCache.plan;
  }

  private profItem(p: Profile): HTMLElement {
    return h('div', { class: 'it', role: 'option', 'aria-selected': this.profile === p.id, 'data-prof': p.id, onclick: () => { this.profile = p.id; if (this.selStreet) this.run(() => this.store.dispatch({ type: 'updateStreet', id: this.selStreet!, patch: { profile: p.id } })); else this.renderPanel(); } },
      h('b', {}, `${p.name} · ${fmt(profileWidth(p), 1)} m `, normChip(p)), h('small', {}, `${CATS[p.cat].name} · ${p.note}`), this.profileBar(p.id));
  }
  /** Koʻcha kesimi — katta koʻrinishda (pastdagi oyna) */
  private openSection(p: Profile): void {
    const d = this.el.drawer;
    d.replaceChildren(h('div', { class: 'dhead' }, h('h3', {}, `${p.name} · ${fmt(profileWidth(p), 1)} m`), h('button', { class: 'ib sm', 'aria-label': 'Yopish', onclick: () => { d.hidden = true; } }, svgIcon(IC.x))),
      h('p', { class: 'muted' }, `${CATS[p.cat].name} · ${p.note}`),
      h('div', { class: 'secsvg', html: sectionSvg(p.parts, 900, 0, true, false) }),
      h('div', { class: 'list' }, ...p.parts.map(x => h('div', { class: 'it' }, h('i', { class: 'sw', style: `background:${({ trotuar: '#ECE9E2', yashil: '#D9E6CC', ajratuvchi: '#D9E6CC', velo: '#CDE2D4', parkovka: '#DDDCD8', qatnov: '#DDDCD8', avtobus: '#E8DDD7', tramvay: '#E8DDD7' } as Record<string, string>)[x.k]}` }), h('span', { class: 'grow' }, `${PART_NAME[x.k]}${x.lanes && x.lanes > 1 ? ` · ${x.lanes} qator` : ''}`), h('b', { class: 'num' }, `${fmt(x.w, 2)} m`)))));
    d.hidden = false; d.dataset.kind = 'section';
  }
  private profileBar(id: string): HTMLElement {
    const p = profileById(id);
    return h('div', { class: 'psec', title: p.parts.map(x => `${x.k} ${fmt(x.w, 1)} m${x.lanes ? ` (${x.lanes} qator)` : ''}`).join(' · '), html: sectionSvg(p.parts) });
  }

  /**
   * Yopishish (privyazka): binolar va uchastka uchlariga (≤ 2 m), qirralariga (≤ 1,2 m), koʻcha qizil chiziqlari va oʻqlariga;
   * Shift bosilganda — oʻchiq. Belgisi sahnada: qizil halqa — uch, koʻk — qirra.
   */
  private shiftDown = false;
  private snapPt(p: XY, mark = false): XY {
    if (this.shiftDown) { if (mark) this.scene.setSnapMark(null); return p; }
    const doc = this.store.doc, fr = frame(doc.origin), rings: XY[][] = [];
    for (const b of doc.buildings) rings.push(b.footprint.map(fr.toLocal));
    if (doc.site) for (const r of doc.site.rings) rings.push(r.map(fr.toLocal));
    const open: XY[][] = doc.streets.map(st => st.axis.map(fr.toLocal));
    let best: XY = p, bd = 2, kind: 'uch' | 'qirra' = 'uch';
    for (const r of [...rings, ...open]) for (const v of r) { const d = Math.hypot(v[0] - p[0], v[1] - p[1]); if (d < bd) { bd = d; best = v; } }
    if (bd >= 2) {
      let ed = 1.2;
      const seg = (a: XY, b: XY) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)), q: XY = [a[0] + t * dx, a[1] + t * dy], d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < ed) { ed = d; best = q; kind = 'qirra'; } };
      for (const r of rings) for (let i = 0; i < r.length; i++) seg(r[i], r[(i + 1) % r.length]);
      for (const r of open) for (let i = 1; i < r.length; i++) seg(r[i - 1], r[i]);
      if (ed >= 1.2) { if (mark) this.scene.setSnapMark(null); return p; }
    }
    if (mark) this.scene.setSnapMark(best, kind);
    return best;
  }

  /**
   * Koʻcha uchini mavjud koʻchaga yopishtirish — chorrahalar ulanishi uchun:
   * 1) loyiha koʻchalari oʻqi (≤ 6 m); 2) atrofdagi (OSM) yoʻllar oʻqi — yoʻl qatnov qismi ichida yoki chetidan ≤ 6 m bosilsa.
   * Shift — oʻchiq. Sahnada belgi: qizil halqa — uch, koʻk — oʻqdagi nuqta.
   */
  private snapStreet = (p: XY, skip?: string): XY => {
    if (this.shiftDown) { this.scene.setSnapMark(null); return p; }
    const doc = this.store.doc, fr = frame(doc.origin); let best: XY = p, bd = Infinity, kind: 'uch' | 'qirra' = 'uch';
    /** a — oʻq; tol — oʻqqa masofa chegarasi, vTol — uchga */
    const near = (a: XY[], tol: number, vTol: number): void => {
      for (const v of a) { const d = Math.hypot(v[0] - p[0], v[1] - p[1]); if (d <= vTol && d < bd) { bd = d; best = v; kind = 'uch'; } }
      for (let i = 1; i < a.length; i++) {
        const u = a[i - 1], w = a[i], dx = w[0] - u[0], dy = w[1] - u[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - u[0]) * dx + (p[1] - u[1]) * dy) / L2));
        const q: XY = [u[0] + t * dx, u[1] + t * dy], d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d <= tol && d < bd - 1.5) { bd = d; best = q; kind = 'qirra'; }
      }
    };
    for (const st of doc.streets) if (st.id !== skip) near(st.axis.map(fr.toLocal), 6, 6);
    if (best === p) {
      const b = this.ctxMgr.current, adopted = new Set([...doc.streets.map(x => x.osm), ...(doc.removedRoads ?? [])]);
      if (b && doc.context.loaded && doc.context.layers.roads) for (const r of b.osm.roads) {
        if (adopted.has(r.id) || /^(footway|path|cycleway|steps|track|bridleway|corridor|pedestrian)$/.test(r.cls)) continue;
        near(r.pts.map(fr.toLocal), r.w / 2 + 6, 8);
      }
    }
    this.scene.setSnapMark(best === p ? null : best, kind);
    return best;
  };

  /** p nuqtadagi loyiha koʻchasi (profil kengligi ichida) */
  private streetAt(p: XY): string | null {
    const fr = frame(this.store.doc.origin);
    const hit = this.store.doc.streets.find(st => { const a = st.axis.map(fr.toLocal), w = profileWidth(profileById(st.profile)) / 2; for (let i = 1; i < a.length; i++) { const u = a[i - 1], v = a[i], dx = v[0] - u[0], dy = v[1] - u[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - u[0]) * dx + (p[1] - u[1]) * dy) / L2)); if (Math.hypot(u[0] + t * dx - p[0], u[1] + t * dy - p[1]) <= w) return true; } return false; });
    return hit?.id ?? null;
  }
  /**
   * Tutqichlar (sudrash bilan tahrirlash): qadam va tanlovga koʻra — koʻcha oʻqi (Koʻchalar), uchastka chegarasi (Uchastka),
   * parsel chegarasi (Parsellar), bino oyoq izi (Hajmlar). closed — halqa; apply — yangi nuqtalar hujjatga; floor — qavat tutqichi (bino tepasida).
   */
  private handleSet(): { id: string; pts: XY[]; closed: boolean; min: number; street?: boolean; apply: (pts: XY[], key: string) => void; floor?: { c: XY; z: number; bid: string } } | null {
    const doc = this.store.doc, fr = frame(doc.origin); if (this.tool) return null;
    const st = this.step.id;
    if (st === 'kocha') { const s = doc.streets.find(x => x.id === this.selStreet); if (!s) return null;
      return { id: s.id, pts: s.axis.map(fr.toLocal), closed: false, min: 2, street: true, apply: (pts, key) => this.run(() => this.store.dispatch({ type: 'updateStreet', id: s.id, patch: { axis: pts.map(fr.toGeo) } }, key)) }; }
    if (st === 'uchastka' && doc.site) { const r = doc.site.rings;
      return { id: 'site', pts: r[0].map(fr.toLocal), closed: true, min: 3, apply: (pts, key) => this.run(() => this.store.dispatch({ type: 'setSite', rings: [pts.map(fr.toGeo), ...r.slice(1)] }, key)) }; }
    if (st === 'parsel' && this.selBlock != null) { const b = this.plan().blocks[this.selBlock], pc = b?.parcelId ? doc.parcels.find(p => p.id === b.parcelId) : null; if (!pc) return null;
      return { id: pc.id, pts: pc.rings[0].map(fr.toLocal), closed: true, min: 3, apply: (pts, key) => this.run(() => this.store.dispatch({ type: 'updateParcel', id: pc.id, patch: { rings: [pts.map(fr.toGeo), ...pc.rings.slice(1)] } }, key)) }; }
    if (st === 'hajm' && this.sel) { const b = doc.buildings.find(x => x.id === this.sel); if (!b) return null;
      const r = b.footprint.map(fr.toLocal), fh = doc.settings.floorHeight, base = Math.min(...r.map(p => this.scene.H(p[0], p[1]))) + (b.z0 ?? 0) * fh;
      const c: XY = [r.reduce((a, p) => a + p[0], 0) / r.length, r.reduce((a, p) => a + p[1], 0) / r.length];
      return { id: b.id, pts: r, closed: true, min: 3, floor: { c, z: base + b.floors * fh + 1.5, bid: b.id }, apply: (pts, key) => this.run(() => this.store.dispatch({ type: 'updateBuilding', id: b.id, patch: { footprint: pts.map(fr.toGeo) } }, key)) }; }
    return null;
  }
  private syncHandles(): void {
    const hs = this.handleSet();
    if (!hs) { this.scene.setHandles([]); return; }
    const a = hs.pts, n = a.length, mids: XY[] = [];
    for (let i = 1; i < n + (hs.closed ? 1 : 0); i++) { const p = a[i - 1], q = a[i % n]; mids.push([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]); }
    this.scene.setHandles(a, mids, hs.floor ? { c: hs.floor.c, z: hs.floor.z } : null);
  }
  /** ekrandagi (x, y) ga eng yaqin tutqich: i — nuqta indeksi; ins — oraliqdan yangi nuqta; floor — qavat tutqichi */
  private handleAt(x: number, y: number): { i: number; ins: boolean; floor?: boolean } | null {
    const hs = this.handleSet(); if (!hs) return null;
    const a = hs.pts, n = a.length; let best: { i: number; ins: boolean; floor?: boolean } | null = null, bd = 12;
    const test = (p: XY, z: number, i: number, ins: boolean, tol: number, floor = false) => { const s2 = this.scene.toScreen(p[0], p[1], z), d = Math.hypot(s2.x - x, s2.y - y); if (d < Math.min(bd, tol)) { bd = d; best = { i, ins, floor }; } };
    if (hs.floor) test(hs.floor.c, hs.floor.z, -1, false, 14, true);
    a.forEach((p, i) => test(p, this.scene.H(p[0], p[1]) + 0.8, i, false, 12));
    for (let i = 1; i < n + (hs.closed ? 1 : 0); i++) { const p = a[i - 1], q = a[i % n], m: XY = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; test(m, this.scene.H(m[0], m[1]) + 0.8, i, true, 9); }
    return best;
  }

  /** atrofdagi (OSM) yoʻlni olib tashlash — masalan, uchastka ichidagi kichik koʻcha */
  private removeOsmRoad(id: number): void {
    this.run(() => this.store.dispatch({ type: 'setRemovedRoads', ids: [...(this.store.doc.removedRoads ?? []), id] }));
    this.osmPick = null; this.scene.setPreview([]); this.renderPanel(); toast('Yoʻl olib tashlandi · Ctrl+Z — qaytarish');
  }

  /* ---------- koʻcha toʻri generatori (uchastka → bloklar) ---------- */
  private grid: GridParams = { ...DEFAULT_GRID };
  private gridPreset = 'barselona';
  private gridVar = 0;
  private gridOpen = false;
  private gridThumb(site: XY[], g: GridParams, w = 112, hh = 80): string {
    const xs = site.map(p => p[0]), ys = site.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const k = Math.min((w - 8) / Math.max(1, x1 - x0), (hh - 8) / Math.max(1, y1 - y0)), ox = (w - (x1 - x0) * k) / 2, oy = (hh - (y1 - y0) * k) / 2;
    const P = (p: XY) => `${(ox + (p[0] - x0) * k).toFixed(1)},${(oy + (y1 - p[1]) * k).toFixed(1)}`;
    const lines = gridStreets(site, g).map(st => `<path d="M${P(st.axis[0])}L${P(st.axis[1])}" stroke="${st.main ? '#1a1c1e' : '#6f6a60'}" stroke-width="${st.main ? 1.6 : 0.9}"/>`).join('');
    return `<svg viewBox="0 0 ${w} ${hh}" width="${w}" height="${hh}"><path d="M${site.map(P).join('L')}Z" fill="#f3e3b4" stroke="#c0392b" stroke-width="0.8"/>${lines}</svg>`;
  }
  private gridPanel(): HTMLElement {
    const doc = this.store.doc, fr = frame(doc.origin), site = doc.site!.rings[0].map(fr.toLocal), g = this.grid;
    const has = doc.streets.some(s => s.gen === 'grid');
    const box = h('details', { class: 'tpl gridgen', id: 'gridBox', open: this.gridOpen || (!doc.streets.length && !this.tool) }, h('summary', {}, `Koʻcha toʻri generatsiyasi${has ? ' · qoʻllangan' : ''}`));
    (box as HTMLDetailsElement).ontoggle = () => { this.gridOpen = (box as HTMLDetailsElement).open; };
    const vars = gridVariants(site, g);
    const apply = () => {
      const v = vars[this.gridVar] ?? vars[0], sts = gridStreets(site, v.g);
      if (!sts.length) { toast('Uchastka tanlangan modul uchun kichik — modulni kichraytiring'); return; }
      this.run(() => this.store.dispatch({ type: 'setGridStreets', streets: sts.map(st => ({ axis: st.axis.map(fr.toGeo), profile: st.profile })) }));
      const n = this.connectStreetEnds(); toast(`${sts.length} ta koʻcha · ${this.plan().blocks.length} kvartal${n ? ` · ${n} uch yoʻllarga ulandi` : ''}`);
    };
    const num = (lbl: string, key: 'w' | 'h', min: number, max: number) => { const inp = h('input', { type: 'number', min, max, step: 1, value: g[key], 'aria-label': lbl }) as HTMLInputElement; inp.onchange = () => { const v = Number(inp.value); if (v >= min && v <= max) { g[key] = v; this.gridPreset = ''; this.renderPanel(); } }; return h('label', { class: 'field grow' }, h('span', { class: 'lb' }, lbl), inp); };
    const ang = h('input', { type: 'range', min: -90, max: 90, step: 5, value: g.angle == null ? 0 : Math.round(g.angle - autoAngle(site)), id: 'gridAng', 'aria-label': 'Burilish' }) as HTMLInputElement;
    ang.oninput = () => { g.angle = autoAngle(site) + Number(ang.value); this.gridVar = 0; (box.querySelector('#gridAngV') as HTMLElement).textContent = `${ang.value}°`; };
    ang.onchange = () => this.renderPanel();
    const mainSel = h('select', { id: 'gridMain' }, ...[[0, 'Hammasi ikkilamchi'], [2, 'Har 2-chisi asosiy'], [3, 'Har 3-chisi asosiy'], [4, 'Har 4-chisi asosiy']].map(([v, t]) => h('option', { value: v, selected: g.mainEvery === v }, t as string))) as HTMLSelectElement;
    mainSel.onchange = () => { g.mainEvery = Number(mainSel.value); this.renderPanel(); };
    const prof = (key: 'main' | 'minor', lbl: string) => { const sel = h('select', { 'aria-label': lbl }, ...PROFILES.map(p => h('option', { value: p.id, selected: g.profiles[key] === p.id }, `${p.name} · ${fmt(profileWidth(p), 0)} m`))) as HTMLSelectElement; sel.onchange = () => { g.profiles = { ...g.profiles, [key]: sel.value }; this.renderPanel(); }; return h('label', { class: 'field grow' }, h('span', { class: 'lb' }, lbl), sel); };
    box.append(
      h('p', { class: 'note' }, 'Tahlil qilingan shahar bloklari moduli boʻyicha uchastka ichida koʻcha toʻri; kvartallar oʻzi hosil boʻladi. Keyin koʻchalarni sudrab, keraksizini oʻchirib toʻgʻrilaysiz.'),
      h('div', { class: 'lb' }, 'Blok moduli'),
      h('div', { class: 'gridpre', role: 'listbox', 'aria-label': 'Blok modullari' }, ...GRID_PRESETS.map(p => h('button', { class: 'gtile', 'data-gpre': p.id, 'aria-pressed': this.gridPreset === p.id, title: `${p.note} · ${p.src}`, onclick: () => { this.gridPreset = p.id; g.w = p.w; g.h = p.h; this.renderPanel(); } },
        h('span', { class: 'th', html: this.gridThumb(site, { ...g, w: p.w, h: p.h, angle: autoAngle(site) }, 96, 64) }), h('b', {}, p.name), h('small', {}, `${p.w} × ${p.h} m`)))),
      h('div', { class: 'row' }, num('Eni, m', 'w', 40, 600), num('Boʻyi, m', 'h', 40, 600), h('button', { class: 'ib sm', title: 'Eni ↔ boʻyi', 'aria-label': 'Almashtirish', style: 'align-self:end', onclick: () => { const t = g.w; g.w = g.h; g.h = t; this.renderPanel(); } }, svgIcon('<path d="M7 7h11l-3-3M17 17H6l3 3"/>'))),
      h('div', { class: 'lb' }, 'Variant'),
      h('div', { class: 'gridvar', role: 'listbox', 'aria-label': 'Variantlar' }, ...vars.map((v, i) => h('button', { class: 'gtile', 'data-gvar': i, 'aria-pressed': this.gridVar === i, onclick: () => { this.gridVar = i; this.renderPanel(); } },
        h('span', { class: 'th', html: this.gridThumb(site, v.g, 96, 64) }), h('b', {}, v.name), h('small', {}, `${gridStreets(site, v.g).length} koʻcha`)))),
      h('label', { class: 'field' }, h('span', { class: 'lb' }, 'Burilish ', h('span', { id: 'gridAngV' }, `${ang.value}°`)), ang),
      h('div', { class: 'row' }, h('label', { class: 'field grow' }, h('span', { class: 'lb' }, 'Asosiy koʻchalar'), mainSel)),
      h('div', { class: 'row' }, prof('main', 'Asosiy profil'), prof('minor', 'Ikkilamchi profil')),
      h('div', { class: 'row' },
        h('button', { class: 'btn primary grow', id: 'gridApply', onclick: apply }, has ? 'Qayta qoʻllash' : 'Qoʻllash'),
        has ? h('button', { class: 'btn', id: 'gridClear', onclick: () => this.run(() => this.store.dispatch({ type: 'setGridStreets', streets: [] })) }, 'Toʻrni olib tashlash') : ''),
      h('p', { class: 'note' }, 'Qoʻllashda avvalgi toʻr koʻchalari almashtiriladi, qoʻlda chizilganlar qoladi. Uchlari 40 m ichidagi mavjud yoʻllarga ulanadi.'));
    return box;
  }

  /** Mavjud koʻchalar uchlarini davom ettirib, ≤ 40 m dagi eng yaqin yoʻl oʻqiga (OSM yoki loyiha koʻchasi) ulash */
  private connectStreetEnds(): number {
    const doc = this.store.doc, fr = frame(doc.origin), b = this.ctxMgr.current, adopted = new Set([...doc.streets.map(x => x.osm), ...(doc.removedRoads ?? [])]);
    const targets: { id: string; a: XY[] }[] = doc.streets.map(st => ({ id: st.id, a: st.axis.map(fr.toLocal) }));
    if (b && doc.context.loaded) for (const r of b.osm.roads) if (!adopted.has(r.id) && !/^(footway|path|cycleway|steps|track|bridleway|corridor|pedestrian)$/.test(r.cls)) targets.push({ id: `osm${r.id}`, a: r.pts.map(fr.toLocal) });
    /** E nuqtadan D yoʻnalishda nur — eng yaqin kesishish (t ≤ 40 m) */
    const onAxis = (E: XY, self: string): boolean => targets.some(t => t.id !== self && t.a.some((u, i) => { if (!i) return false; const v = t.a[i - 1], dx = v[0] - u[0], dy = v[1] - u[1], L2 = dx * dx + dy * dy || 1, k = Math.max(0, Math.min(1, ((E[0] - u[0]) * dx + (E[1] - u[1]) * dy) / L2)); return Math.hypot(u[0] + k * dx - E[0], u[1] + k * dy - E[1]) < 1; }));
    const ray = (E: XY, D: XY, self: string): XY | null => {
      if (onAxis(E, self)) return null;   // allaqachon ulangan
      let bt = 40, hit: XY | null = null;
      for (const t of targets) { if (t.id === self) continue; for (let i = 1; i < t.a.length; i++) {
        const u = t.a[i - 1], v = t.a[i], sx = v[0] - u[0], sy = v[1] - u[1], den = D[0] * sy - D[1] * sx; if (Math.abs(den) < 1e-9) continue;
        const wx = u[0] - E[0], wy = u[1] - E[1], tt = (wx * sy - wy * sx) / den, ss = (wx * D[1] - wy * D[0]) / den;
        if (tt > 0.3 && tt < bt && ss >= -0.02 && ss <= 1.02) { bt = tt; hit = [E[0] + D[0] * tt, E[1] + D[1] * tt]; }
      } }
      return hit;
    };
    let n = 0;
    this.run(() => { for (const st of doc.streets) {
      const a = st.axis.map(fr.toLocal); if (a.length < 2) continue;
      const dir = (p: XY, q: XY): XY => { const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1; return [(q[0] - p[0]) / L, (q[1] - p[1]) / L]; };
      const h1 = ray(a[a.length - 1], dir(a[a.length - 2], a[a.length - 1]), st.id), h0 = ray(a[0], dir(a[1], a[0]), st.id);
      if (!h0 && !h1) continue;
      const na = [...(h0 ? [h0] : []), ...a, ...(h1 ? [h1] : [])]; n += (h0 ? 1 : 0) + (h1 ? 1 : 0);
      this.store.dispatch({ type: 'updateStreet', id: st.id, patch: { axis: na.map(fr.toGeo) } });
    } });
    return n;
  }

  private kochaPanel(body: HTMLElement): void {
    const doc = this.store.doc, fr = frame(doc.origin), drawing = this.tool instanceof LineTool;
    // tanlangan koʻcha (yoki yangi koʻcha profili) — katta koʻndalang kesim
    { const st = doc.streets.find(x => x.id === this.selStreet), p = profileById(st?.profile ?? this.profile);
      body.append(h('div', { class: 'secbig', id: 'secBig', title: 'Kattalashtirish', onclick: () => this.openSection(p) },
        h('div', { class: 'row' }, h('b', { class: 'grow' }, `${st ? 'Tanlangan koʻcha' : 'Yangi koʻcha'}: ${p.name}`), h('span', { class: 'muted' }, `${fmt(profileWidth(p), 1)} m ⤢`)),
        h('div', { class: 'secsvg', html: sectionSvg(p.parts, 300, 0, true, false) }))); }
    if (this.selStreet) body.append(h('p', { class: 'note', id: 'stEditHint' }, 'Tahrirlash: nuqtalarni sudrang (uchlari yoʻllarga yopishadi) · oraliqdagi kichik nuqta — yangi burilish · nuqtani ikki marta bosish — oʻchirish · Delete — koʻchani oʻchirish.'));
    if (doc.site) body.append(this.gridPanel());
    body.append(h('button', { class: drawing ? 'btn primary' : 'btn', id: 'drawStreet', onclick: () => drawing ? this.endTool() : this.setTool(new LineTool(this.scene, r => {
      this.run(() => this.store.dispatch({ type: 'addStreet', axis: r.map(fr.toGeo), profile: this.profile }));
      if (this.tool) this.el.hint.textContent = this.tool.hint;
    }, toast, this.snapStreet)) }, ...(drawing ? icl(IC.check, 'Chizishni tugatish') : icl(IC.plus, 'Koʻcha chizish'))));
    if (doc.streets.length) body.append(h('button', { class: 'btn', id: 'connEnds', title: 'Uchi yoʻlga yetmay qolgan koʻchalarni davom ettirib, 40 m gacha yaqin yoʻl oʻqiga ulaydi', onclick: () => { const n = this.connectStreetEnds(); toast(n ? `${n} ta uch mavjud yoʻllarga ulandi` : 'Ulanadigan uch topilmadi (40 m ichida yoʻl yoʻq)'); } }, 'Uchlarini mavjud yoʻllarga ulash'));
    body.append(h('div', { class: 'field' }, h('span', { class: 'lb' }, 'Profil (yangi koʻcha uchun)'),
      h('div', { class: 'list res', role: 'listbox', 'aria-label': 'Profillar' }, ...PROFILES.map(p => this.profItem(p))),
      (() => { const groups = [...new Set(PRESET_PROFILES.map(p => p.group))], open = PRESET_PROFILES.some(p => p.id === this.profile);
        return h('details', { class: 'tpl', id: 'tplBox', open }, h('summary', {}, `Boshqa shablonlar · ${PRESET_PROFILES.length} ta (Koʻcha studiyasidan)`),
          ...groups.map(g => h('div', { class: 'tplg' }, h('div', { class: 'lb' }, g), h('div', { class: 'list res', role: 'listbox', 'aria-label': g }, ...PRESET_PROFILES.filter(p => p.group === g).map(p => this.profItem(p)))))); })()));
    if (this.osmPick) {
      const o = this.osmPick, L = o.pts.map(fr.toLocal).reduce((acc, q, i, a) => i ? acc + Math.hypot(q[0] - a[i - 1][0], q[1] - a[i - 1][1]) : 0, 0);
      body.append(h('div', { class: 'osmbox', id: 'osmPick' },
        h('b', {}, o.name ? `«${o.name}»` : 'Nomsiz koʻcha'), h('div', { class: 'muted' }, `OSM: ${o.cls} · qatnov ~${fmt(o.w, 1)} m · ${fmt(L)} m`),
        h('div', { class: 'row' },
          h('button', { class: 'btn primary grow', id: 'adoptOsm', onclick: () => {
            // kontekst kvadratiga qirqib, eng uzun boʻlagi olinadi
            const R = this.store.doc.context.radius, pieces = clipLine(o.pts.map(fr.toLocal), -R, -R, R, R).sort((a, b) => b.length - a.length);
            const axis = (pieces[0] ?? o.pts.map(fr.toLocal)).map(fr.toGeo);
            this.run(() => this.store.dispatch({ type: 'addStreet', axis, profile: this.profile, osm: o.id }));
            this.osmPick = null; this.scene.setPreview([]); this.pickStreet(this.store.doc.streets[this.store.doc.streets.length - 1]?.id ?? null);
          } }, `Loyihaga olish: ${profileById(this.profile).name}`),
          h('button', { class: 'btn', onclick: () => { this.osmPick = null; this.scene.setPreview([]); this.renderPanel(); } }, svgIcon(IC.x))),
        h('button', { class: 'btn danger', id: 'rmOsmRoad', onclick: () => this.removeOsmRoad(o.id) }, ...icl(IC.trash, 'Bu yoʻlni olib tashlash (Delete)')),
        h('p', { class: 'note' }, 'Mavjud koʻcha tanlangan profil bilan qayta loyihalanadi: OSM dagi koʻrinishi yashiriladi, qizil chiziqlar va kvartallar yangi kenglik boʻyicha hisoblanadi. Olib tashlansa — sahnada, kvartal chegarasida va chizmada boʻlmaydi.')));
    }
    if (doc.removedRoads?.length) body.append(h('button', { class: 'btn', id: 'restoreRoads', onclick: () => this.run(() => this.store.dispatch({ type: 'setRemovedRoads', ids: [] })) }, `Olib tashlangan yoʻllarni qaytarish (${doc.removedRoads.length})`));
    if (doc.streets.length) {
      const len = (a: XY[]) => a.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - a[i][0], p[1] - a[i][1]), 0);
      body.append(h('div', { class: 'list', role: 'listbox', 'aria-label': 'Koʻchalar' }, ...doc.streets.map((st, k) => {
        const p = profileById(st.profile);
        return h('div', { class: 'it', role: 'option', 'aria-selected': st.id === this.selStreet, 'data-sid': st.id },
          h('span', { class: 'grow', style: 'cursor:pointer', onclick: () => this.pickStreet(st.id === this.selStreet ? null : st.id) }, `${k + 1}. ${p.name} · ${fmt(profileWidth(p), 0)} m · ${fmt(len(st.axis.map(fr.toLocal)))} m`),
          h('button', { title: 'Oʻchirish', 'aria-label': 'Koʻchani oʻchirish', onclick: () => this.run(() => this.store.dispatch({ type: 'removeStreet', id: st.id })) }, svgIcon(IC.x)));
      })));
      const d = this.last?.d;
      if (d) body.append(h('div', { class: 'row' }, h('span', { class: 'lb grow' }, 'Koʻchalar uchastkada'), h('b', { class: 'num', id: 'stArea' }, `${fmt(d.streetArea / 1e4, 2)} ga · ${fmt(d.siteHa ? d.streetArea / 1e4 / d.siteHa * 100 : 0, 0)} %`)));
      if (this.selStreet) {
        const st = doc.streets.find(x => x.id === this.selStreet), p = st && profileById(st.profile), iss = p ? checkProfile(p) : [];
        if (p) body.append(h('div', { class: iss.length ? 'err' : 'okbox', id: 'stNorm' },
          h('b', {}, `${CATS[p.cat].name}`), h('div', { class: 'muted' }, `ShNQ 2.07.01-23, ${CATS[p.cat].clause}`),
          ...(iss.length ? iss.map(x => h('div', {}, `${x.what}: ${x.value} — meʼyor ${x.norm}`)) : [h('div', {}, 'Meʼyorga mos.')])));
        body.append(h('p', { class: 'note' }, `Tanlangan koʻcha koʻk${st?.osm != null ? ' (OSM dan olingan)' : ''}. Yuqoridan profil tanlasangiz — shu koʻchaga qoʻllanadi. Delete — oʻchirish.`));
      }
    } else body.append(h('p', { class: 'note' }, 'Koʻchalar yoʻq. Uchastkani kesib oʻtadigan oʻqni chizing — kvartallar avtomatik hosil boʻladi.'));
    body.append(h('p', { class: 'note' }, 'Mavjud koʻchani tahrirlash: sahnada OSM koʻchasini bosing → «Loyihaga olish». Qizil chiziqlar orasidagi kenglik = profil kengligi; har profil ShNQ 2.07.01-23 20-jadvali (310-band) va 1-izohi bilan tekshiriladi.'));
  }

  private pickStreet(id: string | null): void { this.selStreet = id; this.scene.selectStreet(id); const st = this.store.doc.streets.find(x => x.id === id); if (st) this.profile = st.profile; this.renderPanel(); }

  private setBlockUse(i: number, use: Use): void {
    const plan = this.plan(), b = plan.blocks[i]; if (!b) return;
    if (b.parcelId) this.run(() => this.store.dispatch({ type: 'updateParcel', id: b.parcelId!, patch: { use } }));
    else {
      const fr = frame(this.store.doc.origin);
      const old = this.store.doc.zones.find(z => z.id === b.labelId) ?? this.store.doc.zones.find(z => pointIn(fr.toLocal(z.at), b.rings));
      const zones = this.store.doc.zones.filter(z => !pointIn(fr.toLocal(z.at), b.rings));
      zones.push({ ...(old ?? {}), id: old?.id ?? uid('z_'), at: fr.toGeo(b.centroid), use });
      this.run(() => this.store.dispatch({ type: 'setZones', zones }));
    }
    // ijtimoiy funksiya berilsa — bino avtomatik joylashtiriladi
    if (isSocial(use)) { const j = this.plan().blocks.findIndex(x => pointIn(b.centroid, x.rings) && x.use === use); if (j >= 0) this.generateSocial(j); }
  }

  private demolition(): { all: number; kept: number; gone: number; foot: number; floorArea: number } {
    const doc = this.store.doc, list = this.scene.inSite;
    const keep = new Set(doc.keep); let foot = 0, fa = 0, gone = 0;
    for (const x of list) if (!keep.has(x.id)) { gone++; let a = 0; const r = x.rings[0]; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += r[j][0] * r[i][1] - r[i][0] * r[j][1]; a = Math.abs(a) / 2; foot += a; fa += a * Math.max(1, Math.round(x.h / 3.2)); }
    return { all: list.length, kept: list.length - gone, gone, foot, floorArea: fa };
  }

  /** Birlik nomi: K-2 (butun kvartal) yoki K-2.3 (parsel) */
  private unitName(i: number): string {
    const plan = this.plan(), b = plan.blocks[i]; if (!b) return '';
    if (!b.parcelId) return `K-${b.blockKey + 1}`;
    const same = plan.blocks.filter(x => x.blockKey === b.blockKey);
    return `K-${b.blockKey + 1}.${same.indexOf(b) + 1}`;
  }

  private parcelSize = 1.0;
  private gridMode: GridMode = 'street';
  private gridAngleDeg = 0;
  private parcelMethod: ParcelMethod = 'tor';

  /** Tanlangan birlikning kvartali uchun boʻlish variantlari */
  private parcelVars(): { whole: { rings: XY[][]; centroid: XY }; vars: ParcelVariant[] } | null {
    const plan = this.plan(), u = this.selBlock != null ? plan.blocks[this.selBlock] : null; if (!u) return null;
    const whole = computeWhole(this.store.doc, u.blockKey); if (!whole) return null;
    return { whole, vars: parcelVariants(whole.rings, this.parcelSize * 1e4, gridAngle(whole.rings, this.gridMode, this.gridAngleDeg)) };
  }
  private parcelThumb(whole: XY[][], cells: XY[][][], w = 96, hh = 64): string {
    const site = whole[0], xs = site.map(p => p[0]), ys = site.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const k = Math.min((w - 8) / Math.max(1, x1 - x0), (hh - 8) / Math.max(1, y1 - y0)), ox = (w - (x1 - x0) * k) / 2, oy = (hh - (y1 - y0) * k) / 2;
    const P = (p: XY) => `${(ox + (p[0] - x0) * k).toFixed(1)},${(oy + (y1 - p[1]) * k).toFixed(1)}`;
    const d = (r: XY[]) => `M${r.map(P).join('L')}Z`;
    return `<svg viewBox="0 0 ${w} ${hh}" width="${w}" height="${hh}"><path d="${d(site)}" fill="#f3e3b4"/>${cells.map(c => `<path d="${c.map(d).join('')}" fill="#f3e3b4" stroke="#6f6a60" stroke-width="0.9" fill-rule="evenodd"/>`).join('')}<path d="${d(site)}" fill="none" stroke="#c0392b" stroke-width="0.9"/></svg>`;
  }

  /** Tanlangan birlik joylashgan kvartalni (butunini) parsellarga boʻlish — tanlangan usulda */
  private subdivideSel(): void {
    const plan = this.plan(), u = this.selBlock != null ? plan.blocks[this.selBlock] : null; if (!u) return;
    const fr = frame(this.store.doc.origin), pv = this.parcelVars(); if (!pv) return;
    const { whole } = pv;
    const lab = this.store.doc.zones.find(z => z.id === u.labelId) ?? { id: uid('z_'), at: fr.toGeo(whole.centroid), use: u.use };
    const cells = (pv.vars.find(v => v.id === this.parcelMethod) ?? pv.vars[0])?.cells ?? [];
    if (cells.length < 2) { toast('Kvartal shu oʻlchamdan kichik — parsel oʻlchamini kamaytiring'); return; }
    this.run(() => this.store.dispatch({ type: 'setParcels', block: lab.id, label: lab, parcels: cells.map(r => ({ id: uid('pc_'), rings: r.map(x => x.map(fr.toGeo)), use: u.use })) }));
    this.selBlock = null; this.scene.selectBlock(null);
    toast(`${cells.length} ta parsel`);
  }

  /** Parsellar hujjatdagi koʻrinishi: tanlangan birlikning kvartali boʻyicha (yoʻq boʻlsa — butun kvartal bitta parsel) */
  private blockParcels(u: { labelId: string | null; blockKey: number; use: Use }): { lab: ZoneLabel; list: { id: string; rings: XY[][]; use: Use }[] } | null {
    const doc = this.store.doc, fr = frame(doc.origin), whole = computeWhole(doc, u.blockKey); if (!whole) return null;
    const lab = doc.zones.find(z => z.id === u.labelId) ?? { id: uid('z_'), at: fr.toGeo(whole.centroid), use: u.use };
    const ps = doc.parcels.filter(p => p.block === lab.id);
    return { lab, list: ps.length ? ps.map(p => ({ id: p.id, rings: p.rings.map(r => r.map(fr.toLocal)), use: p.use })) : [{ id: uid('pc_'), rings: whole.rings, use: u.use }] };
  }

  private commitParcels(lab: ZoneLabel, list: { id: string; rings: XY[][]; use: Use }[]): void {
    const fr = frame(this.store.doc.origin);
    this.run(() => this.store.dispatch({ type: 'setParcels', block: lab.id, label: lab, parcels: list.map(p => ({ id: p.id, rings: p.rings.map(r => r.map(fr.toGeo)), use: p.use })) }));
    this.selBlock = null; this.scene.selectBlock(null);
  }

  private parselPanel(body: HTMLElement): void {
    const plan = this.plan();
    if (this.selBlock != null && !plan.blocks[this.selBlock]) this.selBlock = null;
    body.append(h('div', { class: 'list', role: 'listbox', 'aria-label': 'Kvartallar va parsellar' }, ...plan.blocks.map((b, i) => h('div', { class: 'it', role: 'option', 'aria-selected': i === this.selBlock, 'data-block': i, style: 'cursor:pointer', onclick: () => { this.selBlock = i === this.selBlock ? null : i; this.scene.selectBlock(this.selBlock); this.renderPanel(); } },
      h('i', { class: 'sw', style: `background:#${(ZONE_COL[b.use] ?? 0xcccccc).toString(16).padStart(6, '0')}` }), h('span', { class: 'grow' }, `${this.unitName(i)} · ${fmt(b.area / 1e4, 2)} ga`), h('small', { class: 'muted' }, useDef(b.use).name)))));
    if (this.selBlock != null) {
      const i = this.selBlock, b = plan.blocks[i], groups = [...new Set(USES.map(u => u.group))];
      body.append(h('div', { class: 'field' }, h('span', { class: 'lb' }, `${this.unitName(i)} funksiyasi`),
        ...groups.map(g => h('div', { class: 'chips' }, h('span', { class: 'cg' }, g), ...USES.filter(u => u.group === g).map(u => h('button', { class: 'zchip', 'aria-pressed': b.use === u.id, 'data-use': u.id, style: `--c:#${u.color.toString(16).padStart(6, '0')}`, onclick: () => this.setBlockUse(i, u.id) }, u.name))))));
      // parsellarga boʻlish
      const size = h('input', { type: 'range', min: 0.1, max: 3, step: 0.05, value: this.parcelSize, id: 'pSize', style: 'width:100%' }) as HTMLInputElement;
      const sizeT = h('b', { class: 'num' }, `${fmt(this.parcelSize, 2)} ga`);
      size.oninput = () => { this.parcelSize = Number(size.value); sizeT.textContent = `${fmt(this.parcelSize, 2)} ga`; };
      size.onchange = () => this.renderPanel();
      const ang = h('input', { type: 'number', min: -90, max: 90, step: 1, value: this.gridAngleDeg, id: 'pAng', style: 'width:64px' }) as HTMLInputElement;
      ang.onchange = () => { this.gridAngleDeg = Number(ang.value) || 0; };
      const cutting = this.tool instanceof LineTool, merging = this.tool instanceof ClickTool;
      body.append(h('div', { class: 'field', id: 'parcelBox' }, h('span', { class: 'lb' }, 'Parsellar'),
        h('div', { class: 'row' }, h('span', { class: 'grow', style: 'font-size:13px' }, 'Parsel oʻlchami'), sizeT), size,
        h('div', { class: 'seg full', role: 'group', 'aria-label': 'Toʻr' }, ...([['ns', 'Shimol–janub'], ['angle', 'Burchak'], ['street', 'Koʻcha boʻylab']] as const).map(([k, t]) => h('button', { 'aria-pressed': this.gridMode === k, 'data-grid': k, onclick: () => { this.gridMode = k; this.renderPanel(); } }, t))),
        this.gridMode === 'angle' ? h('label', { class: 'row', style: 'font-size:13px' }, 'Burchak, °', ang) : '',
        ...(() => { const pv = this.parcelVars(); if (!pv || !pv.vars.length) return [h('p', { class: 'note' }, 'Kvartal shu oʻlchamdan kichik — parsel oʻlchamini kamaytiring.')];
          if (!pv.vars.some(v => v.id === this.parcelMethod)) this.parcelMethod = pv.vars[0].id;
          return [h('div', { class: 'lb' }, 'Boʻlish usuli'), h('div', { class: 'gridgen' }, h('div', { class: 'gridvar', role: 'listbox', 'aria-label': 'Boʻlish usullari' }, ...pv.vars.map(v => h('button', { class: 'gtile', 'data-pvar': v.id, 'aria-pressed': this.parcelMethod === v.id, title: v.note, onclick: () => { this.parcelMethod = v.id; this.renderPanel(); } },
            h('span', { class: 'th', html: this.parcelThumb(pv.whole.rings, v.cells) }), h('b', {}, v.name), h('small', {}, `${v.cells.length} parsel`)))))]; })(),
        h('button', { class: 'btn primary', id: 'pSplit', onclick: () => this.subdivideSel() }, 'Kvartalni parsellarga boʻlish'),
        h('div', { class: 'row' },
          h('button', { class: cutting ? 'btn primary grow' : 'btn grow', id: 'pCut', onclick: () => {
            if (cutting) { this.setTool(null); return; }
            this.setTool(new LineTool(this.scene, r => {
              const u = this.plan().blocks[this.selBlock ?? -1]; const bp = u && this.blockParcels(u); if (!u || !bp) return;
              const target = bp.list.find(p => (u.parcelId ? p.id === u.parcelId : true)) ?? bp.list[0];
              const parts = split(target.rings, r[0], r[r.length - 1]);
              if (parts.length < 2) { toast('Chiziq parselni kesib oʻtmadi'); return; }
              this.commitParcels(bp.lab, [...bp.list.filter(p => p !== target), ...parts.map(rr => ({ id: uid('pc_'), rings: rr, use: target.use }))]);
              this.setTool(null);
            }, toast));
          } }, cutting ? 'Kesish…' : 'Kesish'),
          h('button', { class: merging ? 'btn primary grow' : 'btn grow', id: 'pMerge', disabled: !b.parcelId, onclick: () => {
            if (merging) { this.setTool(null); return; }
            this.setTool(new ClickTool('Qoʻshni parselni bosing · Esc — bekor', xy => {
              const plan2 = this.plan(), u = plan2.blocks[this.selBlock ?? -1], o = plan2.blocks.find(x => x.parcelId && x.blockKey === u?.blockKey && x !== u && pointIn(xy, x.rings));
              const bp = u && this.blockParcels(u); if (!u || !o || !bp) { toast('Shu kvartaldagi qoʻshni parselni bosing'); return; }
              const A = bp.list.find(p => p.id === u.parcelId), B = bp.list.find(p => p.id === o.parcelId); if (!A || !B) return;
              const m = merge(A.rings, B.rings); if (!m) { toast('Parsellar qoʻshni emas'); return; }
              this.commitParcels(bp.lab, [...bp.list.filter(p => p !== A && p !== B), { id: A.id, rings: m, use: A.use }]);
              this.setTool(null);
            }));
          } }, 'Birlashtirish'),
          h('button', { class: 'btn grow', id: 'pClear', disabled: !b.parcelId, onclick: () => { const bp = this.blockParcels(b); if (bp) { this.run(() => this.store.dispatch({ type: 'setParcels', block: bp.lab.id, parcels: [] })); this.selBlock = null; this.scene.selectBlock(null); } } }, 'Butun kvartal')),
        b.parcelId ? h('p', { class: 'note', id: 'parcelEditHint' }, 'Parsel chegarasini sahnada burchaklaridan sudrab toʻgʻrilang (oraliq nuqta — yangi burchak, ikki marta bosish — oʻchirish).') : '',
        h('p', { class: 'note' }, 'Kesish — tanlangan parsel ustida chiziq chizing (2 nuqta, Enter). Kvartalni qayta boʻlish undagi parsellar seksiyalarini oʻchiradi.')));
    } else body.append(h('p', { class: 'note' }, 'Kvartal yoki parselni roʻyxatdan yoki sahnada bosib tanlang.'));
    const dm = this.demolition();
    if (dm.all) {
      body.prepend(h('div', { class: 'field', id: 'demo' }, h('span', { class: 'lb' }, 'Uchastkadagi mavjud binolar'),
        h('div', { class: 'ctxst' }, h('b', {}, `${dm.all} bino`), ` · saqlanadi ${dm.kept} · `, h('b', { style: 'color:var(--bad)' }, `buziladi ${dm.gone}`),
          dm.gone ? h('div', { class: 'muted' }, `Buziladigan dogʻ ${fmt(dm.foot)} m², taxminiy maydon ~${fmt(dm.floorArea)} m² (OSM balandligi/taxmin boʻyicha). Koʻchirish xarajati — pastda.`) : ''),
        h('div', { class: 'row' },
          h('button', { class: 'btn grow', id: 'keepAll', onclick: () => this.run(() => this.store.dispatch({ type: 'setKeep', keep: this.scene.inSite.map(x => x.id) })) }, 'Hammasini saqlash'),
          h('button', { class: 'btn grow', id: 'dropAll', onclick: () => this.run(() => this.store.dispatch({ type: 'setKeep', keep: [] })) }, 'Hammasini buzish')),
        dm.gone ? h('button', { class: this.goneHidden ? 'btn primary' : 'btn', id: 'goneHide', onclick: () => { this.goneHidden = !this.goneHidden; this.syncGone(); this.renderPanel(); } }, this.goneHidden ? `Buziladiganlar olib tashlangan (${dm.gone}) — qaytarish` : `Buziladiganlarni sahnadan olib tashlash (${dm.gone})`) : '',
        h('p', { class: 'note' }, this.goneHidden ? 'Buziladigan binolar sahnada koʻrinmaydi; hisob va koʻchirish xarajati saqlanadi. Qaytarib, binoni bosib saqlash ↔ buzishni almashtirasiz.' : 'Sahnada binoni bosing — saqlash ↔ buzish. Buziladiganlar shaffof qizil. Keyingi qadamlarda ular avtomatik olib tashlanadi.')));
      if (dm.gone) this.compSection(body);
    }
  }

  /* ---------- koʻchirish xarajati (OʻRQ-781 / OʻRQ-1149) ---------- */
  private demoList(): DemoBuilding[] {
    const keep = new Set(this.store.doc.keep);
    return this.scene.inSite.filter(x => !keep.has(x.id)).map(x => ({ id: x.id, area: area(x.rings[0]), h: x.h, kind: (x as { kind?: string }).kind }));
  }
  private comp(): CompResult | null { const l = this.demoList(); return l.length ? compensation(l, this.store.doc.settings.comp) : null; }
  private monitorMsg = '';
  private async loadMonitoring(): Promise<void> {
    this.monitorMsg = 'Yuklanmoqda…'; this.renderPanel();
    try {
      const r = await fetch(MONITORING_URL, { cache: 'no-store' }); if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const m = parseMonitoring(await r.text()); if (!m || (!m.flat && !m.house)) throw new Error('maʼlumot yoʻq');
      const c = this.store.doc.settings.comp, near = !!(m.flatNear || m.houseNear);
      this.run(() => this.store.dispatch({ type: 'setSettings', patch: { comp: { ...c, priceFlat: m.flatNear ?? m.flat ?? c.priceFlat, priceHouse: m.houseNear ?? m.house ?? c.priceHouse, priceSource: `uybor.uz, Mirobod, ${m.date}${near ? ' — Fitrat atrofi 1,5 km median' : ' — tuman median'} (soʻralgan narx)` } } }));
      this.monitorMsg = `Tuman median: kvartira ${m.flat ?? '—'}, hovli ${m.house ?? '—'} $/m²; atrof 1,5 km: ${m.flatNear ?? '—'} / ${m.houseNear ?? '—'} $/m² (${m.date}).`;
    } catch (e) { this.monitorMsg = `Monitoring maʼlumoti olinmadi: ${(e as Error).message}. Narxni qoʻlda kiriting.`; }
    this.renderPanel();
  }
  private compSection(body: HTMLElement): void {
    const c = this.store.doc.settings.comp, R = this.comp(); if (!R) return;
    const set = (patch: Partial<CompParams>) => this.run(() => this.store.dispatch({ type: 'setSettings', patch: { comp: { ...c, ...patch } } }));
    const num = (k: keyof CompParams, label: string, step = 1) => { const e = h('input', { type: 'number', min: 0, step, value: c[k] as number, 'data-comp': k, style: 'width:100%' }) as HTMLInputElement;
      e.onchange = () => { const v = Number(e.value); if (!(v >= 0)) return;
        const src = k === 'priceFlat' || k === 'priceHouse' ? 'qoʻlda' : k === 'priceNonres' && c.priceSource && !c.priceSource.includes('noturar') ? `${c.priceSource}; noturar — qoʻlda` : c.priceSource;
        set({ [k]: v, priceSource: src } as Partial<CompParams>); };
      return h('label', { class: 'field', style: 'min-width:0' }, h('span', { class: 'lb' }, label), e); };
    const grid = (...kids: HTMLElement[]) => h('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:8px' }, ...kids);
    const usd = (v: number) => fmt(Math.round(v));
    const NAME: Record<string, string> = { hovli: 'Hovli uylar', kvartira: 'Koʻp kvartirali', noturar: 'Noturar' };
    const gfa = this.last?.d.gfa ?? 0, resNet = this.last?.d.resNet ?? 0;
    body.append(h('div', { class: 'field', id: 'compBox' }, h('span', { class: 'lb' }, 'Koʻchirish xarajati (dastlabki baho)'),
      h('div', { class: 'seg full', role: 'group' }, ...([['orq781', '781: olib qoʻyish'], ['orq1149', '1149: renovatsiya']] as const).map(([k, t]) => h('button', { 'aria-pressed': c.regime === k, 'data-regime': k, onclick: () => set({ regime: k }) }, t))),
      grid(num('priceFlat', 'Kvartira, $/m²', 10), num('priceHouse', 'Hovli, $/m²', 10), num('priceNonres', 'Noturar, $/m²', 10), h('button', { class: 'btn', id: 'compMon', style: 'align-self:end', onclick: () => void this.loadMonitoring() }, 'Monitoringdan')),
      h('span', { class: 'muted', id: 'compSrc' }, c.priceSource ? `Manba: ${c.priceSource}` : 'Manba: kiritilmagan'),
      this.monitorMsg ? h('p', { class: 'note' }, this.monitorMsg) : '',
      grid(num('rentRate', 'Ijara, $/m²·oy', 0.5), num('rentMonths', 'Ijara, oy'), num('movingPerHh', 'Koʻchish, $/xonadon', 10), num('profitRate', 'Foyda, $/m²·yil', 5)),
      h('table', { class: 'reg', id: 'compTab', style: 'font-size:12px' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Toifa (bino)'), h('th', {}, 'm²'), h('th', {}, 'Xon.'), h('th', {}, '$'))),
        h('tbody', {},
          ...R.rows.map(r => h('tr', {}, h('td', {}, `${NAME[r.kind]} (${r.n})`), h('td', { class: 'num' }, fmt(Math.round(r.floorArea))), h('td', { class: 'num' }, r.households ? String(r.households) : '—'), h('td', { class: 'num' }, R.missing.includes(r.kind) ? 'narx yoʻq' : usd(r.market)))),
          h('tr', {}, h('td', { colspan: 3 }, `Noqulaylik uchun ${R.pct} % (${c.regime === 'orq1149' ? '1149: 41-modda' : '781: 23-modda'})`), h('td', { class: 'num' }, usd(R.inconvenience))),
          h('tr', {}, h('td', { colspan: 3 }, `Vaqtinchalik ijara (${c.rentMonths} oy) va koʻchish`), h('td', { class: 'num' }, c.rentRate || c.movingPerHh ? usd(R.rent + R.moving) : 'kiritilmagan')),
          h('tr', {}, h('td', { colspan: 3 }, `Noturar: boy berilgan foyda (${R.profitYears} yil)`), h('td', { class: 'num' }, c.profitRate ? usd(R.profit) : 'kiritilmagan')),
          h('tr', {}, h('td', { colspan: 3 }, h('b', {}, 'Jami')), h('td', { class: 'num' }, h('b', {}, usd(R.total)))))),
      h('div', { class: 'ctxst' }, gfa ? `Loyiha GFA ning har m² iga ${fmt(R.total / gfa, 0)} $. ` : '',
        `Qaytariladigan turar joy maydoni ≈ ${fmt(Math.round(R.resArea))} m² (${R.households} xonadon)${resNet ? ` — loyiha kvartiralarining ${fmt(R.resArea / resNet * 100, 0)} %` : ''}${c.regime === 'orq1149' ? ' (42-modda: beriladigan maydon avvalgisidan kam boʻlmasligi kerak)' : ' (25-modda: teng qiymatli, ijtimoiy normadan kam boʻlmagan)'}.`),
      R.missing.length ? h('p', { class: 'warn' }, `Narx kiritilmagan: ${R.missing.map(k => NAME[k]).join(', ')} — jami toʻliq emas.`) : '',
      h('p', { class: 'note' }, 'Bu baholovchi xulosasi emas (OʻRQ-781, 29-modda: qiymatni baholovchi tashkilot belgilaydi). Bozor qiymati — eʼlonlardagi soʻralgan narx yoki kiritilgan qiymat × maydon; maydon OSM dogʻi va balandligidan taxmin, kvartirada ×' + fmt(c.flatNet, 2) + '. Yerga boʻlgan huquq va dov-daraxtlar alohida hisoblanmagan (hovli narxida yer bor). Yangi uy 24 oydan kechiksa — kuniga 0,05 % penya (781: 24-modda; 1149: 43–44-moddalar). OʻRQ-1149 12.12.2026 dan kuchga kiradi; avariya uyi uchun 4/5 rozilik shart emas (36-modda).')));
  }

  private yashilPanel(body: HTMLElement): void {
    const plan = this.plan(), d = this.last?.d, doc = this.store.doc, R = (id: string) => this.last?.results.find(r => r.id === id);
    const chip = (id: string, t: string) => { const r = R(id); return r ? h('span', { class: 'chip', 'data-s': r.status, title: r.note ?? '' }, t) : ''; };
    const row = (k: string, v: string, c: HTMLElement | string = '') => h('div', { class: 'brow' }, h('span', {}, k), h('b', { class: 'num' }, v), c);
    const yt = h('input', { type: 'checkbox', checked: doc.settings.yards, id: 'yardsOn' }) as HTMLInputElement;
    yt.onchange = () => this.run(() => this.store.dispatch({ type: 'setSettings', patch: { yards: yt.checked } }));
    body.append(
      h('div', { class: 'field' }, h('span', { class: 'lb' }, 'Yashillik balansi'),
        h('div', { class: 'balance', id: 'greenSt' },
          row('Yashil kvartallar (park, skver)', `${fmt(d?.greenArea ?? 0)} m²`),
          row('Hovlilar maysasi', `${fmt(d?.yardGreen ?? 0)} m²`),
          row('Maydonchalar va yoʻlaklar (87-band)', `${fmt(d?.yardPlay ?? 0)} m²`),
          row('Yashillik darajasi', `${fmt((d?.greenShareTotal ?? 0) * 100, 0)} %`, chip('green-86', '86-band: ≥ 25 %')),
          row('Umumiy foydalanish, kishi boshiga', d?.population ? `${fmt(d.greenPerPerson, 1)} m²` : '—', chip('green-36', '36-jadval: ≥ 3')),
          row('Hovli maydonchalari', d?.playNeed ? `${fmt(d.playGot)} / ${fmt(d.playNeed)} m²` : '—', chip('play-89', '4-jadval')),
          row('Daraxtlar: hovlida / koʻchada', `${fmt(d?.yardTrees ?? 0)} / ${fmt(this.streetTrees())}`),
          d?.greenRoof ? row('Yashil tomlar (hisobga kirmaydi)', `${fmt(d.greenRoof)} m²`) : '')),
      h('label', { class: 'row', style: 'font-size:13px' }, yt, 'Hovlilarni avtomatik obodonlashtirish: trotuar, maysa, maydonchalar, yoʻlak, daraxtlar'),
      h('div', { class: 'field' }, h('span', { class: 'lb' }, 'Kvartalni yashil qilish / qaytarish'),
        h('div', { class: 'list' }, ...plan.blocks.map((b, i) => {
          const c = h('input', { type: 'checkbox', checked: b.use === 'yashil', 'data-green': i }) as HTMLInputElement;
          c.onchange = () => this.setBlockUse(i, c.checked ? 'yashil' : 'turar');
          return h('label', { class: 'it' }, c, h('span', { class: 'grow' }, `${this.unitName(i)} · ${fmt(b.area / 1e4, 2)} ga`), h('small', { class: 'muted' }, useDef(b.use).name));
        }))),
      h('p', { class: 'note' }, 'Hovlilar: binolar atrofida 3 m trotuar; 4-jadval maydonchalari binolardan meʼyoriy masofada (bolalar ≥ 10 m, kattalar ≥ 6, sport ≥ 10, xoʻjalik ≥ 20); qolgani maysa, daraxtlar binodan ≥ 5 m. Bu eskiz — joylashuvni loyihachi aniqlaydi.'));
  }
  private streetTrees(): number {
    const doc = this.store.doc, fr = frame(doc.origin);
    return doc.streets.length ? projectStreetsGeo(doc.streets.map(s => ({ id: s.id, axis: s.axis.map(fr.toLocal), parts: profileById(s.profile).parts })), () => 0).trees.length : 0;
  }

  /* ---------- qadamlar ---------- */
  private locked(s: StepDef): string | null {
    if (s.phase > BUILT_PHASE) return `${s.phase}-bosqichda quriladi`;
    if (['hajm', 'kocha', 'parsel', 'yashil', 'quyosh', 'fasad', 'kvartira', 'xizmat'].includes(s.id) && !this.store.doc.site) return 'Avval uchastkani chizing';
    return null;
  }
  private done(s: StepDef): boolean {
    const d = this.store.doc;
    return s.id === 'uchastka' ? !!d.site : s.id === 'hajm' ? d.buildings.length > 0 : s.id === 'kocha' ? d.streets.length > 0 : s.id === 'parsel' ? d.zones.length > 0 : s.id === 'yashil' ? (d.zones.some(z => z.use === 'yashil') || (d.settings.yards && d.buildings.length > 0)) : false;
  }

  private renderRail(): void {
    const r = this.el.rail; r.replaceChildren();
    STEPS.forEach((s, i) => {
      if (i === 2 || i === 6 || i === 10) r.append(h('hr'));
      const lk = this.locked(s);
      const b = h('button', { 'aria-label': `${s.n}. ${s.title}${lk ? ' — ' + lk : ''}`, title: `${s.n}. ${s.title}${lk ? '\n' + lk : ''}`, 'data-step': s.id, 'aria-current': s === this.step ? 'step' : null, 'aria-expanded': s === this.step ? this.panelOpen : null, 'data-locked': !!lk, 'data-done': this.done(s), onclick: () => { if (s === this.step && this.panelOpen) { this.panelOpen = false; this.renderRail(); this.renderPanel(); } else this.go(s); } }, h('span', { class: 'n' }, s.n));
      b.append(svgIcon(s.icon)); r.append(b);
    });
    r.append(h('hr'));
    for (const [k, t, ic] of TOOLS) {
      const b = h('button', { class: 'tool', 'data-tool': k, 'aria-label': t, title: t, 'aria-pressed': this.mode === k, onclick: () => this.setMode(k) }); b.append(svgIcon(ic)); r.append(b);
    }
  }

  /* ---------- asboblar: tanlash, qoʻl, chizgʻich, kesim, pipetka ---------- */
  private mode: ToolMode = 'select';
  private copied: { use: Use; floors: number; nonRes: number; mat?: Mat; roof?: Roof; parapet?: number; shade?: Shade; from: string } | null = null;
  private setMode(k: ToolMode): void {
    if (this.mode === 'measure' || this.mode === 'section') this.setTool(null);
    this.mode = this.mode === k && k !== 'select' ? 'select' : k;
    this.scene.setHand(this.mode === 'hand');
    if (this.mode === 'measure') this.setTool(new MeasureTool(this.scene, fmt));
    if (this.mode !== 'pipette') this.copied = null;
    this.renderRail(); this.renderToolPanel();
  }
  private renderToolPanel(): void {
    let el = this.el.stage.querySelector<HTMLElement>('.toolpanel');
    const S = this.scene.section;
    if (this.mode !== 'section' && this.mode !== 'pipette') { el?.remove(); return; }
    if (!el) { el = h('div', { class: 'toolpanel', role: 'toolbar' }); this.el.stage.append(el); }
    if (this.mode === 'pipette') {
      el.replaceChildren(h('b', {}, 'Pipetka'), h('span', { id: 'pipSt' }, this.copied ? `Nusxa: ${this.copied.from} — endi boshqa binolarni bosing (Esc — tugatish)` : 'Namuna binoni bosing: funksiya, qavatlar, material, tom, parapet, quyosh himoyasi nusxalanadi'));
      return;
    }
    const zIn = h('input', { type: 'range', min: 1, max: 120, step: 0.5, value: S?.kind === 'h' ? S.z : 10, id: 'secZ', 'aria-label': 'Kesim balandligi' }) as HTMLInputElement;
    const zT = h('b', { class: 'num' }, `${fmt(S?.kind === 'h' ? S.z : 10, 1)} m`);
    zIn.oninput = () => { this.scene.setSection({ kind: 'h', z: Number(zIn.value) }); zT.textContent = `${fmt(Number(zIn.value), 1)} m`; };
    el.replaceChildren(h('b', {}, 'Kesim'),
      h('div', { class: 'seg' },
        h('button', { 'aria-pressed': S?.kind === 'h', id: 'secH', onclick: () => { this.setTool(null); this.scene.setSection({ kind: 'h', z: Number(zIn.value) }); this.renderToolPanel(); } }, 'Gorizontal'),
        h('button', { 'aria-pressed': S?.kind === 'v', id: 'secV', onclick: () => { this.setTool(new SectionLineTool(this.scene, (a, b) => { this.scene.setSection({ kind: 'v', a, b }); this.setTool(null); this.renderToolPanel(); })); } }, 'Vertikal (chizish)')),
      S?.kind === 'h' ? h('span', { class: 'row' }, zIn, zT) : '',
      h('button', { class: 'btn', id: 'secOff', disabled: !S, onclick: () => { this.scene.setSection(null); this.renderToolPanel(); } }, 'Olib tashlash'));
  }
  /** pipetka: namuna → boshqa binolarga */
  private pipette(id: string): void {
    const doc = this.store.doc, b = doc.buildings.find(x => x.id === id); if (!b) return;
    if (!this.copied) { this.copied = { use: b.use, floors: b.floors, nonRes: b.nonRes, mat: b.mat, roof: b.roof, parapet: b.parapet, shade: b.shade, from: `${useDef(b.use).name}, ${b.floors} qavat` }; this.renderToolPanel(); return; }
    const { from: _f, ...patch } = this.copied; void _f;
    this.run(() => this.store.dispatch({ type: 'updateBuilding', id, patch }));
  }

  /* ---------- oʻng tugma menyusi ---------- */
  private ctxMenu(x: number, y: number): void {
    document.querySelector('.cmenu')?.remove();
    const doc = this.store.doc, id = this.scene.pickBuilding(x, y), b = id ? doc.buildings.find(q => q.id === id) : null;
    const item = (t: string, fn: () => void, kbd = '', danger = false) => h('button', { class: danger ? 'danger' : '', onclick: () => { m.remove(); fn(); } }, h('span', {}, t), kbd ? h('kbd', {}, kbd) : '');
    const m = h('div', { class: 'cmenu', role: 'menu' });
    const nM = this.marked.b.length + this.marked.c.length, rmN = doc.removed?.length ?? 0;
    const cid = !b && !this.tool ? this.scene.pickAnyContext(x, y) : null;
    if (this.tool) {
      // chizish paytida: tugatish, oxirgi nuqta, bekor qilish
      const key = (k: string) => { const t = this.tool; if (!t?.key) return; t.key(new KeyboardEvent('keydown', { key: k })); if (k === 'Escape') this.setTool(null); else if (this.tool) this.el.hint.textContent = this.tool.hint; };
      m.append(h('div', { class: 'cm-h' }, 'Chizish'),
        this.tool.commit ? item('Chizishni tugatish', () => this.endTool(), 'Enter') : '',
        item('Oxirgi nuqtani oʻchirish', () => key('Backspace'), 'Backspace'),
        h('hr'),
        item('Bekor qilish', () => key('Escape'), 'Esc', true));
    } else if (nM > 1) {
      m.append(h('div', { class: 'cm-h' }, `Tanlangan: ${nM} ta`),
        item('Tanlovni bekor qilish', () => this.setMarked([], []), 'Esc'),
        h('hr'),
        item(`Hammasini oʻchirish (${nM})`, () => this.deleteMarked(), 'Del', true));
    } else if (cid != null) {
      m.append(h('div', { class: 'cm-h' }, 'Atrofdagi bino (OSM)'),
        item('Tanlash', () => this.setMarked([], [cid])),
        item('Tanlovga qoʻshish', () => this.setMarked(this.marked.b, [...this.marked.c, cid]), 'Shift'),
        rmN ? item(`Olib tashlanganlarni qaytarish (${rmN})`, () => this.restoreRemoved()) : '',
        h('hr'),
        item('Sahnadan olib tashlash', () => { this.setMarked([], [cid]); this.deleteMarked(); }, 'Del', true));
    } else if (b) {
      const sel = () => { this.sel = b.id; this.scene.select(b.id); };
      m.append(h('div', { class: 'cm-h' }, `${useDef(b.use).name} · ${b.floors} qavat`),
        item('Tahrirlash', () => { sel(); this.inspTab = 'hajm'; this.renderAll(); }),
        item('Qavat qoʻshish', () => this.run(() => this.store.dispatch({ type: 'updateBuilding', id: b.id, patch: { floors: b.floors + 1 } })), '+'),
        item('Qavat olib tashlash', () => this.run(() => this.store.dispatch({ type: 'updateBuilding', id: b.id, patch: { floors: Math.max(1, b.floors - 1) } })), '−'),
        item('Qavatlar va terrasa…', () => { sel(); this.inspTab = 'qavat'; this.renderAll(); }, 'PgUp'),
        item('Fasad va tom…', () => { sel(); this.lookTarget = 'sel'; this.go(STEPS.find(x => x.id === 'fasad')!); }),
        h('hr'),
        item('Uslubni nusxalash (pipetka)', () => { this.mode = 'pipette'; this.copied = null; this.renderRail(); this.pipette(b.id); }, 'I'),
        this.copied ? item(`Uslubni qoʻyish (${this.copied.from})`, () => this.pipette(b.id)) : '',
        item('Nusxa (yoniga)', () => { sel(); this.renderAll(); (this.el.stage.querySelector('#iDup') as HTMLButtonElement | null)?.click(); }),
        item('Yaqinlashtirish', () => this.scene.frameBuilding(this.store.doc, b.id), 'F'),
        h('hr'),
        item('Oʻchirish', () => this.store.dispatch({ type: 'removeBuilding', id: b.id }), 'Del', true));
    } else {
      const gp = this.scene.pick(x, y);
      m.append(h('div', { class: 'cm-h' }, 'Sahna'),
        this.step.id === 'hudud' && gp ? item('Loyiha markazini shu yerga koʻchirish', () => this.goTo({ name: 'Xaritada tanlangan joy', detail: '', at: frame(doc.origin).toGeo(gp) }, null)) : '',
        item('Loyihani koʻrsatish', () => this.scene.frameDoc(this.store.doc)),
        item('Chizgʻich', () => this.setMode('measure'), 'M'),
        item('Kesim', () => this.setMode('section'), 'S'),
        rmN ? item(`Olib tashlangan atrof binolarini qaytarish (${rmN})`, () => this.restoreRemoved()) : '',
        this.scene.section ? item('Kesimni olib tashlash', () => { this.scene.setSection(null); this.renderToolPanel(); }) : '',
        item('Sahna rasmi (PNG)', () => download(`${safe(doc.name)}.png`, this.scene.snapshot())));
    }
    document.body.append(m);
    const w = m.offsetWidth, hh = m.offsetHeight; m.style.left = `${Math.min(x, innerWidth - w - 8)}px`; m.style.top = `${Math.min(y, innerHeight - hh - 8)}px`;
    const off = (e: Event) => { if (e.type === 'keydown' && (e as KeyboardEvent).key !== 'Escape') return; m.remove(); document.removeEventListener('pointerdown', off, true); document.removeEventListener('keydown', off); };
    setTimeout(() => { document.addEventListener('pointerdown', (e: PointerEvent) => { if (!m.contains(e.target as Node)) off(e); }, { capture: true, once: true }); document.addEventListener('keydown', off); }, 0);
  }

  go(s: StepDef): void {
    if (this.locked(s) && s.phase > BUILT_PHASE) { toast(`«${s.title}» — ${this.locked(s)}`); }
    else if (this.locked(s)) { toast(this.locked(s)!); return; }
    this.setTool(null); this.step = s; this.panelOpen = true;
    this.closePop(); if (this.el.drawer.dataset.kind === 'section') this.el.drawer.hidden = true;   // oldingi qadamning ochiq oynalari yopiladi
    if (s.id !== 'kocha' && this.selStreet) { this.selStreet = null; this.scene.selectStreet(null); }
    if (s.id !== 'kocha' && this.osmPick) { this.osmPick = null; this.scene.setPreview([]); }
    if (s.id !== 'xizmat') this.scene.setNetMap(null); else if (this.svc.res) this.showSvc();
    if (s.id !== 'parsel' && s.id !== 'hajm' && this.selBlock != null) { this.selBlock = null; this.scene.selectBlock(null); }
    this.renderAll();
  }

  /** «Tugatish» tugmasi: chizilgan nuqtalar saqlanadi, keyin asbob oʻchadi */
  private endTool(): void { this.tool?.commit?.(); this.setTool(null); }
  private setTool(t: Tool | null): void {
    this.tool?.cancel(); this.tool = t; this.scene.setSnapMark(null);
    /* chizish rejada aniq: sharq–shimol oʻqlari ekran oʻqlari bilan mos */
    if (t && this.scene.view !== 'plan' && !(t as { anyView?: boolean }).anyView) this.setView('plan');
    this.el.hint.hidden = !t; if (t) this.el.hint.textContent = t.hint;
    this.renderPanel();
  }

  /** chap panel: faol qadamni qayta bossa — yopiladi, yana bossa — ochiladi */
  private panelOpen = true;
  private renderPanel(): void {
    this.showAptBoxes(); this.syncBTools(); this.syncHandles();
    const shut = !this.panelOpen && !this.inspOn(); this.el.panel.classList.toggle('shut', shut); this.root?.classList.toggle('pshut', shut);
    if (this.inspOn()) { this.renderInspector(); return; }
    const s = this.step, i = STEPS.indexOf(s), p = this.el.panel;
    // shu qadam qayta chizilsa (bino tanlash, qavat) — panel aylantirish joyi saqlanadi
    const keep = p.dataset.mode === 'step' && p.dataset.step === s.id ? p.querySelector('.body')?.scrollTop ?? 0 : 0;
    p.dataset.mode = 'step'; p.dataset.step = s.id;
    if (this.scene.selFloor != null) this.scene.setSelFloor(null);
    if (!this.sel) this.dragMode = 'yoq';
    const prev = STEPS[i - 1], next = STEPS[i + 1];
    const body = h('div', { class: 'body' });
    const lk = s.phase > BUILT_PHASE ? this.locked(s) : null;
    if (lk) body.append(h('div', { class: 'locked' }, `Bu qadam ${s.phase}-bosqichda quriladi. Reja va darvoza shartlari — «Yadro arxitekturasi» hujjatida.`));
    else this.panelBody(s, body);
    p.replaceChildren(
      h('header', {}, h('span', { class: 'lb' }, `${s.n}-qadam / 12`), h('h2', {}, s.title), h('p', {}, s.lead)),
      body,
      h('footer', {},
        h('button', { class: 'btn', disabled: !prev, onclick: () => prev && this.go(prev) }, ...icl(IC.back, 'Oldingi')),
        h('button', { class: 'btn primary', disabled: !next, onclick: () => next && this.go(next) }, 'Keyingi', svgIcon(IC.next))));
    if (keep) body.scrollTop = keep;
  }

  private panelBody(s: StepDef, body: HTMLElement): void {
    const doc = this.store.doc, fr = frame(doc.origin);
    if (s.id === 'hudud') this.hududPanel(body);
    if (s.id === 'uchastka') {
      const area = this.last?.d.siteHa ?? 0;
      const w = h('input', { type: 'number', min: 10, max: 2000, value: 120, id: 'rw' }) as HTMLInputElement;
      const hh = h('input', { type: 'number', min: 10, max: 2000, value: 100, id: 'rh' }) as HTMLInputElement;
      const drawing = this.tool instanceof PolygonTool;
      body.append(
        doc.site ? h('div', { class: 'row' }, h('span', { class: 'lb grow' }, 'Uchastka maydoni'), h('b', { class: 'num', id: 'siteHa' }, `${fmt(area, 2)} ga`)) : h('p', { class: 'note' }, 'Uchastka hali chizilmagan.'),
        h('button', { class: drawing ? 'btn primary' : 'btn', id: 'drawSite', onclick: () => drawing ? this.endTool() : this.setTool(new PolygonTool(this.scene, r => {
          this.run(() => this.store.dispatch({ type: 'setSite', rings: [r.map(fr.toGeo)] })); this.setTool(null); this.scene.frameDoc(this.store.doc);
        }, toast)) }, ...(drawing ? ['Chizishni toʻxtatish'] : icl(IC.pencil, doc.site ? 'Qaytadan chizish' : 'Sahnada chizish'))),
        this.ctxMgr.current && doc.context.loaded && doc.context.layers.roads ? h('button', { class: this.tool instanceof ClickTool ? 'btn primary' : 'btn', id: 'pickBlock', onclick: () => this.tool instanceof ClickTool ? this.setTool(null) : this.setTool(new ClickTool('Yoʻllar orasidagi kvartal ichini bosing · Esc — bekor', xy => this.pickBlock(xy))) }, this.tool instanceof ClickTool ? 'Aniqlashni toʻxtatish' : '⌖ Kvartalni bosib aniqlash') : '',
        this.ctxMgr.current && doc.context.loaded ? h('div', { class: 'seg full', role: 'group', 'aria-label': 'Kvartal chegarasi' },
          ...([['mayda', 'Mayda: barcha koʻchalar'], ['yirik', 'Yirik: asosiy koʻchalar']] as const).map(([k, t]) => h('button', { 'aria-pressed': this.blockMode === k, 'data-bm': k, onclick: () => { this.blockMode = k; this.renderPanel(); } }, t))) : '',
        h('div', { class: 'lb' }, 'yoki oʻlcham bilan, markazda'),
        h('div', { class: 'row' }, h('label', { class: 'field grow' }, h('span', { class: 'lb' }, 'Eni, m'), w), h('label', { class: 'field grow' }, h('span', { class: 'lb' }, 'Boʻyi, m'), hh),
          h('button', { class: 'btn', id: 'rectSite', style: 'align-self:end', onclick: () => {
            const a = Number(w.value), b = Number(hh.value); if (!(a >= 10 && b >= 10)) { toast('Kamida 10 m'); return; }
            const m = this.scene.viewExtent().c;   // ekran markazida (xarita surilgan boʻlsa ham)
            const r: XY[] = [[-a / 2, -b / 2], [a / 2, -b / 2], [a / 2, b / 2], [-a / 2, b / 2]].map(([x, y]) => [x + m[0], y + m[1]] as XY);
            this.run(() => this.store.dispatch({ type: 'setSite', rings: [r.map(fr.toGeo)] })); this.scene.frameDoc(this.store.doc);
          } }, 'Qoʻyish')),
        doc.site ? h('button', { class: 'btn danger', onclick: () => this.run(() => this.store.dispatch({ type: 'clearSite' })) }, 'Uchastkani oʻchirish') : '',
        h('p', { class: 'note' }, 'Chizish: bosing — nuqta, birinchi nuqtani bosing yoki Enter — yopish. Sudrab kamerani aylantirasiz.'),
        doc.site ? h('p', { class: 'note', id: 'siteEditHint' }, 'Tahrirlash: burchaklarni sudrang · oraliqdagi kichik nuqta — yangi burchak · burchakni ikki marta bosish — oʻchirish.') : '');
    }
    if (s.id === 'hajm') this.hajmPanel(body);
    if (s.id === 'kocha') this.kochaPanel(body);
    if (s.id === 'quyosh') this.quyoshPanel(body);
    if (s.id === 'fasad') this.fasadPanel(body);
    if (s.id === 'kvartira') this.kvartiraPanel(body);
    if (s.id === 'xizmat') this.xizmatPanel(body);
    if (s.id === 'parsel') this.parselPanel(body);
    if (s.id === 'yashil') this.yashilPanel(body);
    if (s.id === 'tekshiruv') body.append(this.register());
    if (s.id === 'eksport') {
      body.append(
        h('button', { class: 'btn', id: 'exJson', onclick: () => download(`${safe(doc.name)}.archemistry.json`, exportJSON(this.store.doc)) }, 'Loyiha fayli (.json)'),
        h('button', { class: 'btn', id: 'exPng', onclick: () => download(`${safe(doc.name)}.png`, this.scene.snapshot()) }, 'Sahna rasmi (PNG)'),
        h('button', { class: 'btn primary', id: 'exPdf', onclick: () => this.openReport() }, 'Hisobot (PDF)'),
        h('button', { class: 'btn', id: 'exGx', onclick: () => this.openGraphics() }, 'Varaqlar: bosh reja, zonalash… (SVG/PNG)'),
        h('button', { class: 'btn', id: 'exAi', onclick: () => downloadIllustrator(this.store.doc, this.sheetCtx()) }, 'Adobe Illustrator: bosh reja (qatlamli SVG)'),
        h('button', { class: 'btn', id: 'exXlsx', onclick: () => download(`${safe(doc.name)}_TEP.xlsx`, new Blob([this.tepXlsx() as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })) }, 'TEP (Excel)'),
        h('button', { class: 'btn', id: 'exDxf', onclick: () => { const keep = new Set(doc.keep); download(`${safe(doc.name)}.dxf`, toDxf(this.store.doc, this.scene.inSite.filter(b => keep.has(b.id))), 'application/dxf'); } }, 'Reja va hajmlar (DXF)'),
        h('button', { class: 'btn', id: 'exGlb', onclick: () => void this.scene.exportGLB(false).then(b => download(`${safe(doc.name)}.glb`, b)).catch(e => toast(`GLB: ${(e as Error).message}`)) }, '3D model (GLB)'),
        h('button', { class: 'btn', id: 'exObj', onclick: () => void this.scene.exportOBJ(false).then(t => download(`${safe(doc.name)}.obj`, t, 'text/plain')).catch(e => toast(`OBJ: ${(e as Error).message}`)) }, '3D model (OBJ)'),
        h('button', { class: 'btn', id: 'exIfc', onclick: () => download(`${safe(doc.name)}.ifc`, toIfc(this.store.doc), 'application/x-step') }, 'BIM: IFC4 (ArchiCAD, Revit)'),
        this.scene.hasContext ? h('button', { class: 'btn', id: 'exGlbCtx', onclick: () => void this.scene.exportGLB(true).then(b => download(`${safe(doc.name)}_atrof.glb`, b)).catch(e => toast(`GLB: ${(e as Error).message}`)) }, '3D model atrof bilan (GLB)') : '',
        h('p', { class: 'note' }, 'Hisobot — yangi oynada: koʻrinishlar, TEP, meʼyoriy reyestr va taxminlar; «PDF saqlash» tugmasi A4 formatida saqlaydi. Excel — TEP, binolar va reyestr varaqlari. Kvartiralar va xizmatlar natijalari — tegishli qadamda hisoblangan boʻlsa qoʻshiladi. Loyiha fayli — toʻliq nusxa: boshqa kompyuterda «Fayldan ochish» bilan ochiladi. DXF — mahalliy metrda (markaz koordinatasi faylda yozilgan), qatlamlar: uchastka, qizil chiziqlar, kvartallar funksiya boʻyicha, binolar balandligi bilan (AutoCAD/ArchiCAD da 3D). GLB — Blender, SketchUp, Rhino, ArchiCAD ochadi. OBJ — har qanday 3D dastur (Rhino, SketchUp, 3ds Max). IFC4 — har seksiya IfcBuilding, har qavat IfcBuildingStorey va hajm (IfcBuildingElementProxy), «Archemistry_Bino» xususiyatlari: funksiya, qavatlar, GFA, material, tom; uchastka WGS84 koordinatasi bilan.'));
    }
  }

  /** Grafika varaqlari uchun atrof — mahalliy metrda */
  private sheetCtx(): SheetCtx | null {
    const b = this.ctxMgr.current; if (!b) return null;
    const fr = frame(this.store.doc.origin), L = (r: LngLat[]) => r.map(fr.toLocal), o = b.osm;
    return {
      buildings: o.buildings.map(x => ({ id: x.id, rings: x.rings.map(L), h: x.h })),
      roads: o.roads.map(x => ({ id: x.id, pts: L(x.pts), w: x.w, cls: x.cls })),
      rails: o.rails.map(x => L(x.pts)),
      water: o.water.map(x => x.rings.map(L)),
      waterways: o.waterways.map(x => ({ pts: L(x.pts), w: x.w })),
      green: o.green.map(x => ({ rings: x.rings.map(L), kind: x.kind })),
      trees: o.trees.map(fr.toLocal),
    };
  }
  private openGraphics(): void { openGraphics(this.store.doc, this.sheetCtx()); }

  /* ---------- koʻrsatkichlar va meʼyorlar ---------- */
  private renderKpi(): void {
    const c = this.last; if (!c) return;
    const d = c.d, dens = c.results.find(r => r.id === 'density-84');
    const k = (label: string, v: string, s?: string, id?: string) => h('div', { class: 'k', 'data-s': s, id }, h('b', {}, v), h('span', {}, label));
    const open = !this.el.drawer.hidden;
    this.el.kpi.replaceChildren(
      k('Uchastka, ga', d.siteHa ? fmt(d.siteHa, 2) : '—', undefined, 'kSite'),
      k('GFA, m²', d.gfa ? fmt(d.gfa) : '—', undefined, 'kGfa'),
      k('UMN (FAR)', d.far ? fmt(d.far, 2) : '—'),
      k('Qurilish zichligi', d.gsi ? fmt(d.gsi * 100, 0) + ' %' : '—'),
      k('Oʻrt. qavat', d.avgFloors ? fmt(d.avgFloors, 1) : '—'),
      k('Aholi', d.population ? fmt(d.population) : '—', undefined, 'kPop'),
      k('Zichlik, kishi/ga', d.density ? fmt(d.density) : '—', dens?.status, 'kDens'),
      k('Ish oʻrni', d.jobs >= 1 ? fmt(d.jobs) : '—', undefined, 'kJobs'),
      h('button', { class: 'more', id: 'kMore', 'aria-expanded': open, onclick: () => { const reg = this.el.drawer.dataset.kind !== 'section'; this.el.drawer.dataset.kind = 'reg'; this.el.drawer.hidden = reg ? !this.el.drawer.hidden : false; this.renderKpi(); } }, open && this.el.drawer.dataset.kind !== 'section' ? 'Meʼyorlar ▾' : 'Meʼyorlar ▴'));
    if (open && this.el.drawer.dataset.kind !== 'section') this.el.drawer.replaceChildren(h('div', { class: 'dhead' }, h('h3', {}, 'Meʼyoriy reyestr'), h('button', { class: 'ib sm', 'aria-label': 'Yopish', onclick: () => { this.el.drawer.hidden = true; this.renderKpi(); } }, svgIcon(IC.x))), this.register());
    if (['tekshiruv', 'uchastka', 'kocha', 'yashil'].includes(this.step.id)) this.renderPanel();
  }

  private regFilter: 'all' | 'fail' = 'all';
  private register(): HTMLElement {
    const all = this.allRules();
    const bad = all.filter(r => r.status === 'fail').length, rs = this.regFilter === 'fail' ? all.filter(r => r.status === 'fail' || r.status === 'review') : all;
    const val = (r: typeof all[number]) => r.value != null ? `${fmt(r.value)} ${r.unit ?? ''}` : '—';
    return h('div', { class: 'regw' },
      h('div', { class: 'seg', role: 'group', id: 'regSeg' },
        h('button', { 'aria-pressed': this.regFilter === 'all', onclick: () => { this.regFilter = 'all'; this.renderKpi(); } }, `Hammasi · ${all.length}`),
        h('button', { 'aria-pressed': this.regFilter === 'fail', onclick: () => { this.regFilter = 'fail'; this.renderKpi(); } }, `Mos emas · ${bad}`)),
      h('div', { class: 'reg' }, ...rs.map(r => h('div', { class: 'rrow', 'data-rule': r.id },
        h('div', { class: 'rmain' },
          h('b', {}, r.title),
          h('span', { class: 'muted' }, `${r.source.doc}, ${r.source.clause}${r.source.verified ? '' : ' (tekshirilsin)'}`),
          r.note ? h('details', { class: 'rnote' }, h('summary', {}, 'Izoh'), h('div', { class: 'note' }, r.note)) : null),
        h('div', { class: 'rval' },
          h('span', { class: 'chip', 'data-s': r.status }, STATUS_TXT[r.status] + (r.delta ? ` ${r.delta > 0 ? '+' : ''}${fmt(r.delta)} %` : '')),
          h('b', { class: 'num' }, val(r)),
          h('small', { class: 'muted' }, r.limit ? `meʼyor ${r.limit} ${r.unit ?? ''}` : '')))))); 
  }

  /* ---------- sahna bilan muloqot ---------- */
  private bindScene(): void {
    const c = this.scene.renderer.domElement;
    let down: { x: number; y: number } | null = null;
    // bino muharriri: devorni itarish / binoni siljitish (sichqoncha bilan)
    let drag: { id: string; p0: XY; r0: XY[]; edge: number; n: XY; floor: number; tiers0: { from: number; inset: number; edge?: number }[] } | null = null, raf = 0, pend: XY | null = null;
    let rdown: { x: number; y: number } | null = null;
    // koʻcha nuqtasini sudrash (uchlari yoʻllarga yopishadi)
    let hdrag: { hs: NonNullable<ReturnType<Editor['handleSet']>>; i: number; a0: XY[]; key: string } | null = null;
    let fdrag: { id: string; y0: number; floors0: number; pxPerM: number; key: string } | null = null;
    // Shift + sudrash — ramka bilan tanlash
    let box: { x: number; y: number; el: HTMLDivElement } | null = null;
    c.addEventListener('contextmenu', e => e.preventDefault());
    // koʻcha nuqtasini ikki marta bosish — nuqta oʻchadi (kamida 2 nuqta qoladi)
    c.addEventListener('dblclick', e => {
      const hd = this.handleAt(e.clientX, e.clientY), hs = this.handleSet(); if (!hd || hd.ins || hd.floor || !hs || hs.pts.length <= hs.min) return;
      hs.apply(hs.pts.filter((_, k) => k !== hd.i), `hdel-${Date.now()}`);
    });
    c.addEventListener('pointerdown', e => {
      if (e.button === 2) { rdown = { x: e.clientX, y: e.clientY }; return; }
      if (e.button !== 0) return;
      down = { x: e.clientX, y: e.clientY };
      if (e.shiftKey && !this.tool) {
        const el = h('div', { class: 'selbox', 'aria-hidden': 'true' }) as HTMLDivElement; document.body.append(el);
        box = { x: e.clientX, y: e.clientY, el }; this.scene.setOrbit(false); c.setPointerCapture(e.pointerId); return;
      }
      { const hd = this.handleAt(e.clientX, e.clientY), hs = hd && this.handleSet();
        if (hd && hs) {
          if (hd.floor && hs.floor) {
            // qavat tutqichi: vertikal sudrash — qavatlar soni (ekran piksel / metr tepaga qarab)
            const b = this.store.doc.buildings.find(x => x.id === hs.floor!.bid)!, s0 = this.scene.toScreen(hs.floor.c[0], hs.floor.c[1], hs.floor.z), s1 = this.scene.toScreen(hs.floor.c[0], hs.floor.c[1], hs.floor.z + 10);
            fdrag = { id: b.id, y0: e.clientY, floors0: b.floors, pxPerM: (s0.y - s1.y) / 10 > 0.8 ? (s0.y - s1.y) / 10 : 14 / this.store.doc.settings.floorHeight /* Rejada balandlik koʻrinmaydi — bir qavat = 14 px */, key: `fl-${b.id}-${Date.now()}` }; this.scene.setOrbit(false); c.setPointerCapture(e.pointerId); return;
          }
          const a = hs.pts.slice(), n = a.length;
          if (hd.ins) { const p = a[hd.i - 1], q = a[hd.i % n]; a.splice(hd.i, 0, [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]); }
          hdrag = { hs, i: hd.i, a0: a, key: `hv-${hs.id}-${Date.now()}` }; this.scene.setOrbit(false); c.setPointerCapture(e.pointerId); return;
        } }
      if (this.dragMode === 'yoq' || !this.sel || this.tool) return;
      const hit = this.scene.pickBuildingHit(e.clientX, e.clientY), g0 = this.scene.pick(e.clientX, e.clientY);
      if (!hit || hit.id !== this.sel || !g0 || ((this.dragMode === 'push' || this.dragMode === 'floor') && !hit.wall)) return;
      const doc = this.store.doc, fr = frame(doc.origin), b = doc.buildings.find(x => x.id === this.sel)!, r0 = b.footprint.map(fr.toLocal), n = r0.length;
      let floor = 0;
      if (this.dragMode === 'floor') {
        const fh = doc.settings.floorHeight, base = Math.min(...r0.map(p => this.scene.H(p[0], p[1]))) + (b.z0 ?? 0) * fh;
        floor = Math.max(1, Math.min(b.floors, Math.floor((hit.y - base) / fh) + 1));
        this.scene.setSelFloor(floor); this.renderInspector();
        if (floor < 2) { toast('1-qavat sudralmaydi — «Devorni itarish» dan foydalaning'); return; }
      }
      let edge = 0, bd = Infinity;
      for (let k = 0; k < n; k++) { const a = r0[k], q = r0[(k + 1) % n], dx = q[0] - a[0], dy = q[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((hit.p[0] - a[0]) * dx + (hit.p[1] - a[1]) * dy) / L2)), d = Math.hypot(a[0] + t * dx - hit.p[0], a[1] + t * dy - hit.p[1]); if (d < bd) { bd = d; edge = k; } }
      const a = r0[edge], q = r0[(edge + 1) % n], L = Math.hypot(q[0] - a[0], q[1] - a[1]) || 1, ccw = signedArea(r0) > 0;
      drag = { id: b.id, p0: g0, r0, edge, n: [(ccw ? 1 : -1) * (q[1] - a[1]) / L, (ccw ? -1 : 1) * (q[0] - a[0]) / L], floor, tiers0: b.tiers ?? [] };
      this.scene.setOrbit(false); c.setPointerCapture(e.pointerId);
    });
    const applyDrag = () => {
      raf = 0; if (!drag || !pend) return;
      const doc = this.store.doc, fr = frame(doc.origin), dx = pend[0] - drag.p0[0], dy = pend[1] - drag.p0[1];
      let r: XY[] | null;
      if (this.dragMode === 'floor') {
        // shu qavatdan yuqorisi: + tashqariga (konsol), − ichkariga (terrasa) — faqat shu devor
        const d = Math.round((dx * drag.n[0] + dy * drag.n[1]) * 2) / 2, f = drag.floor, e = drag.edge;
        const tiers = [...drag.tiers0.filter(t => !(t.from === f && t.edge === e)), ...(d ? [{ from: f, inset: Math.max(-12, Math.min(12, -d)), edge: e }] : [])];
        this.run(() => this.store.dispatch({ type: 'updateBuilding', id: drag!.id, patch: { tiers } }, `fdrag-${drag!.id}-${drag!.p0.join()}`));
        return;
      }
      if (this.dragMode === 'move') r = drag.r0.map(p => [p[0] + dx, p[1] + dy] as XY);
      else { const d = Math.round((dx * drag.n[0] + dy * drag.n[1]) * 2) / 2; r = d ? pushEdge(drag.r0, drag.edge, d) : drag.r0; }
      if (r) this.run(() => this.store.dispatch({ type: 'updateBuilding', id: drag!.id, patch: { footprint: r!.map(fr.toGeo) } }, `drag-${drag!.id}-${drag!.p0.join()}`));
    };
    c.addEventListener('pointermove', e => {
      if (box) { Object.assign(box.el.style, { left: `${Math.min(box.x, e.clientX)}px`, top: `${Math.min(box.y, e.clientY)}px`, width: `${Math.abs(e.clientX - box.x)}px`, height: `${Math.abs(e.clientY - box.y)}px` }); return; }
      if (drag) { const p = this.scene.pick(e.clientX, e.clientY); if (p) { pend = p; if (!raf) raf = requestAnimationFrame(applyDrag); } return; }
      if (fdrag) {
        const fh = this.store.doc.settings.floorHeight, fl = Math.max(1, Math.min(60, fdrag.floors0 + Math.round((fdrag.y0 - e.clientY) / fdrag.pxPerM / fh))), fd = fdrag;
        const b = this.store.doc.buildings.find(x => x.id === fd.id); if (b && b.floors !== fl) this.run(() => this.store.dispatch({ type: 'updateBuilding', id: fd.id, patch: { floors: fl, nonRes: Math.min(b.nonRes, fl) } }, fd.key));
        return;
      }
      if (hdrag) {
        const p0 = this.scene.pick(e.clientX, e.clientY); if (!p0) return;
        const hs = hdrag.hs, end = !hs.closed && (hdrag.i === 0 || hdrag.i === hdrag.a0.length - 1), p = hs.street && end ? this.snapStreet(p0, hs.id) : this.snapPt(p0, true);
        const a = hdrag.a0.map((q, k) => k === hdrag!.i ? p : q);
        hs.apply(a, hdrag.key); return;
      }
      if (!this.tool?.move) return; const p0 = this.scene.pick(e.clientX, e.clientY); if (p0) this.tool.move(this.tool.snapTo ? this.snapPt(p0, true) : p0);
    });
    c.addEventListener('pointerup', e => {
      if (e.button === 2) { if (rdown && Math.hypot(e.clientX - rdown.x, e.clientY - rdown.y) < 5) this.ctxMenu(e.clientX, e.clientY); rdown = null; return; }
      if (box) {
        const b0 = box; box = null; b0.el.remove(); this.scene.setOrbit(true); down = null;
        if (Math.hypot(e.clientX - b0.x, e.clientY - b0.y) > 5) {
          const r = this.scene.pickInRect(this.store.doc, b0.x, b0.y, e.clientX, e.clientY);
          this.setMarked([...this.marked.b, ...r.bids, ...(this.sel ? [this.sel] : [])], [...this.marked.c, ...r.cids]);
        } else {
          // Shift + bosish — tanlovga qoʻshish / olib tashlash
          const id = this.scene.pickBuilding(e.clientX, e.clientY), cid = id ? null : this.scene.pickAnyContext(e.clientX, e.clientY);
          const tg = <T,>(a: T[], v: T) => a.includes(v) ? a.filter(x => x !== v) : [...a, v];
          if (id) this.setMarked(tg([...this.marked.b, ...(this.sel && this.sel !== id ? [this.sel] : [])], id), this.marked.c);
          else if (cid != null) this.setMarked([...this.marked.b, ...(this.sel ? [this.sel] : [])], tg(this.marked.c, cid));
        }
        if (this.marked.b.length + this.marked.c.length > 1 && this.sel) { this.sel = null; this.scene.select(null); this.renderAll(); this.setMarked(this.marked.b, this.marked.c); }
        return;
      }
      if (drag) { drag = null; pend = null; down = null; this.scene.setOrbit(true); return; }
      if (hdrag || fdrag) { hdrag = null; fdrag = null; down = null; this.scene.setOrbit(true); this.scene.setSnapMark(null); this.syncHandles(); return; }
      if (this.mode === 'pipette' && down && Math.hypot(e.clientX - down.x, e.clientY - down.y) <= 5) { down = null; const id = this.scene.pickBuilding(e.clientX, e.clientY); if (id) this.pipette(id); return; }
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) { down = null; return; }
      down = null;
      if (this.tool) { const p0 = this.scene.pick(e.clientX, e.clientY); if (p0) { this.tool.click(this.tool.snapTo ? this.snapPt(p0) : p0, e); if (this.tool) this.el.hint.textContent = this.tool.hint; } return; }
      if (this.step.id === 'parsel') {
        const cid = this.scene.pickContextBuilding(e.clientX, e.clientY);
        if (cid != null) { const k = new Set(this.store.doc.keep); k.has(cid) ? k.delete(cid) : k.add(cid); this.run(() => this.store.dispatch({ type: 'setKeep', keep: [...k] })); return; }
        const oc = this.scene.pickAnyContext(e.clientX, e.clientY);
        if (oc != null) { this.setMarked([], [oc]); return; }
        const p = this.scene.pick(e.clientX, e.clientY);
        if (p) { const i = this.plan().blocks.findIndex(b => pointIn(p, b.rings)); this.selBlock = i >= 0 ? i : null; this.scene.selectBlock(this.selBlock); this.renderPanel(); }
        return;
      }
      if (this.step.id === 'kocha') {
        const p = this.scene.pick(e.clientX, e.clientY), fr = frame(this.store.doc.origin);
        if (p) {
          const hit = this.streetAt(p);
          if (hit) { this.osmPick = null; this.scene.setPreview([]); this.pickStreet(hit); }
          else {
            const b = this.ctxMgr.current, adopted = new Set([...this.store.doc.streets.map(x => x.osm), ...(this.store.doc.removedRoads ?? [])]);
            let best: typeof this.osmPick = null, bd = Infinity;
            for (const r of b?.osm.roads ?? []) {
              if (adopted.has(r.id) || /^(footway|path|cycleway|steps|track|bridleway|corridor)$/.test(r.cls)) continue;
              const a = r.pts.map(fr.toLocal);
              for (let i = 1; i < a.length; i++) { const u = a[i - 1], v = a[i], dx = v[0] - u[0], dy = v[1] - u[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - u[0]) * dx + (p[1] - u[1]) * dy) / L2)), dd = Math.hypot(u[0] + t * dx - p[0], u[1] + t * dy - p[1]); if (dd <= r.w / 2 + 3 && dd < bd) { bd = dd; best = { id: r.id, cls: r.cls, w: r.w, name: r.name, pts: r.pts }; } }
            }
            this.osmPick = best; this.scene.setPreview(best ? best.pts.map(fr.toLocal) : []);
            this.pickStreet(null);
          }
        }
        return;
      }
      const id = this.scene.pickBuilding(e.clientX, e.clientY);
      // loyiha koʻchasi bosildi — «Koʻchalar» qadamiga oʻtib, shu koʻcha tanlanadi (tutqichlar bilan tahrirlash)
      if (!id) { const p = this.scene.pick(e.clientX, e.clientY), sid = p ? this.streetAt(p) : null; if (sid && !this.locked(STEPS.find(x => x.id === 'kocha')!)) { this.go(STEPS.find(x => x.id === 'kocha')!); this.pickStreet(sid); return; } }
      // atrofdagi (OSM) bino — tanlanadi (Delete bilan olib tashlanadi)
      if (!id) { const cid = this.scene.pickAnyContext(e.clientX, e.clientY); if (cid != null) { if (this.sel) { this.sel = null; this.scene.select(null); this.renderAll(); } this.setMarked([], [cid]); return; } }
      if (this.marked.b.length || this.marked.c.length) this.setMarked([], []);
      if (id && id === this.sel && this.inspTab === 'qavat') {   // tanlangan binoda qavatni bosish — shu qavat
        const hit = this.scene.pickBuildingHit(e.clientX, e.clientY), b = this.store.doc.buildings.find(x => x.id === id);
        if (hit && b) { const fr = frame(this.store.doc.origin), r = b.footprint.map(fr.toLocal), fh = this.store.doc.settings.floorHeight, base = Math.min(...r.map(p => this.scene.H(p[0], p[1]))) + (b.z0 ?? 0) * fh; this.scene.setSelFloor(Math.max(1, Math.min(b.floors, Math.floor((hit.y - base) / fh) + 1))); this.renderInspector(); return; }
      }
      this.sel = id; this.scene.select(id);
      if (!id && this.step.id === 'hajm') {
        const p = this.scene.pick(e.clientX, e.clientY);
        if (p) { const i = this.plan().blocks.findIndex(b => pointIn(p, b.rings)); this.selBlock = i >= 0 ? i : null; this.scene.selectBlock(this.selBlock); }
      }
      if (id && this.step.id === 'fasad') this.lookTarget = 'sel';
      else if (id && ['hudud', 'uchastka', 'kocha', 'yashil'].includes(this.step.id) && !this.locked(STEPS[5])) this.step = STEPS[5];
      this.renderAll();
    });
  }

  private bindKeys(): void {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.matches?.('input,textarea,select');
      if (!typing && this.tool?.key?.(e)) { e.preventDefault(); if (this.tool) this.el.hint.textContent = this.tool.hint; if (e.key === 'Escape') this.setTool(null); return; }
      if (typing) return;
      const z = e.key.toLowerCase() === 'z' && (e.ctrlKey || e.metaKey);
      if (z && !e.shiftKey) { e.preventDefault(); this.store.undo(); }
      else if ((z && e.shiftKey) || (e.key.toLowerCase() === 'y' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); this.store.redo(); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && (this.marked.b.length || this.marked.c.length)) { e.preventDefault(); this.deleteMarked(); }
      else if (e.key === 'Escape' && (this.marked.b.length || this.marked.c.length)) this.setMarked([], []);
      else if ((e.key === 'Delete' || e.key === 'Backspace') && this.step.id === 'kocha' && this.osmPick) { e.preventDefault(); this.removeOsmRoad(this.osmPick.id); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && this.step.id === 'kocha' && this.selStreet) { e.preventDefault(); this.store.dispatch({ type: 'removeStreet', id: this.selStreet }); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && this.sel) { e.preventDefault(); this.store.dispatch({ type: 'removeBuilding', id: this.sel }); }
      else if (e.key === 'Escape' && this.sel) { this.sel = null; this.scene.select(null); this.renderAll(); }
      else if (!typing && !e.ctrlKey && !e.metaKey && ['v', 'h', 'm', 's', 'i'].includes(e.key.toLowerCase())) { this.setMode(({ v: 'select', h: 'hand', m: 'measure', s: 'section', i: 'pipette' } as Record<string, ToolMode>)[e.key.toLowerCase()]); }
      else if (!typing && e.key.toLowerCase() === 'f' && this.sel) this.scene.frameBuilding(this.store.doc, this.sel);
      else if (e.key === 'Escape' && this.mode !== 'select') this.setMode('select');
      else if ((e.key === 'PageUp' || e.key === 'PageDown') && this.sel) {
        const b = this.store.doc.buildings.find(x => x.id === this.sel); if (!b) return; e.preventDefault();
        this.inspTab = 'qavat'; const f = (this.scene.selFloor ?? b.floors) + (e.key === 'PageUp' ? 1 : -1);
        this.scene.setSelFloor(Math.max(1, Math.min(b.floors, f))); this.renderInspector();
      }
    };
    window.addEventListener('keydown', onKey);
    const onShift = (e: KeyboardEvent) => { this.shiftDown = e.shiftKey; };
    window.addEventListener('keydown', onShift); window.addEventListener('keyup', onShift);
    this.off.push(() => window.removeEventListener('keydown', onShift), () => window.removeEventListener('keyup', onShift));
    const onUnload = () => { this.saver.flush(); };
    window.addEventListener('pagehide', onUnload);
    this.off.push(() => window.removeEventListener('keydown', onKey), () => window.removeEventListener('pagehide', onUnload));
  }
}

const normChip = (p: Profile) => { const n = checkProfile(p).length; return h('span', { class: 'chip', 'data-s': p.cat === 'piyoda' ? 'review' : n ? 'fail' : 'pass', title: n ? `${n} ta chetlanish` : 'ShNQ 2.07.01-23 ga mos' }, p.cat === 'piyoda' ? 'hisob boʻyicha' : n ? `${n} chetlanish` : 'ShNQ ✓'); };
const dist = (a: LngLat, b: LngLat) => { const f = frame(a).toLocal(b); return Math.hypot(f[0], f[1]); };
const safe = (s: string) => s.replace(/[^\p{L}\p{N}_ -]+/gu, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'loyiha';
