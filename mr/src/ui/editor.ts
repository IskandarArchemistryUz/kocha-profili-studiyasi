/**
 * Loyiha oynasi: chapda qadamlar qatori, yonida qadam paneli, markazda sahna, pastda koʻrsatkichlar.
 * Qadam almashganda faqat panel almashadi — sahna, kamera va hujjat joyida qoladi.
 */
import { langMenu } from './langmenu';
import type { LngLat, Project } from '../core/doc';
import { Store } from '../core/store';
import { CommandError, apply as applyCmd } from '../core/commands';
import { frame, type XY } from '../core/geo';
import { staleGen } from '../core/spacing';
import type { Obstacle3 } from '../core/genfix';
import { reconcileKeep, type KeepCand } from '../core/keep';
import { Scene3D, STYLES, FRAMES, LENSES, type ViewMode, type SceneStyle } from '../scene/scene';
import { autosave, exportJSON, cachePut, type AutoSaver } from '../storage/db';
import { Compute, type Computed } from '../workers/compute';
import { abroadRules, type Result } from '../norms/rules';
import { h, IC, icl, svgIcon, fmt, toast, download } from './dom';
import { STEPS, BUILT_PHASE, type StepDef } from './steps';
import { siteAccess, accessVerdict, type Access } from '../core/access';
const HAJM = () => STEPS.find(x => x.id === 'hajm')!;
import { tr, tf, getLang, setLang, type Lang } from '../i18n';
import { toggleTheme, isDark, onTheme } from './theme';
import { range, select, stepper, sw , dropdown } from './controls';
import { pg } from './pictos';
import { LABEL_MODES } from '../core/labels';
import { ClickTool, LineTool, PolygonTool, RectTool, AxisTool, MeasureTool, SectionLineTool, type Tool } from './tools';
import { computePlan, pointIn, offsetLine, type PlanGeo } from '../core/plan';
import { lowriseAlong, LOW, type LowKind } from '../core/lowrise';
import { housePlan, housePlanSvg, partySide } from '../core/lowplan';
import { deadEnds, junctions, nextEnd } from '../core/streetends';
import { CATS, checkProfile, PROFILES, profileById, profileWidth, type Profile } from '../core/profiles';
import { GRID_PRESETS, DEFAULT_GRID, gridStreets, gridVariants, autoAngle, gridStreetsAround, lineHitsRing, profileForOsm, perimeterAxis, type GridParams } from '../core/gridgen';
import { insolCompass, type Compass } from '../core/kompas';
import { lenLimit, SYS } from '../core/seysmik';
import { CONSTRUCT_SYS } from '../core/doc';
import { PRESET_PROFILES } from '../core/presets';
import { sectionSvg, PART_NAME } from './section';
import { ZONE_COL } from '../scene/scene';
import { clipLine } from '../scene/context3d';
import type { Use, ZoneLabel } from '../core/doc';
import { DEFAULT_GEN, generate, usePreset, PARK_NAME, TYPO_NAME, type GenParams, type ParkingKind, type Typology } from '../core/generator';
import { PARK_MOD, PARK_MODS } from '../core/parking';
import { aptRooms } from '../core/aptrooms';
import { insetRobust } from '../core/offset';
import { saveMrReturn, consumeMrBack } from './mrback';
import { USES, useDef } from '../core/uses';
import { gridAngle, merge, split, parcelVariants, type GridMode, type ParcelMethod, type ParcelVariant } from '../core/parcels';
import { computeWhole } from '../core/plan';
import { daySteps, insolation, localToUtcAt, sunPosition, type Prism } from '../core/sun';
import { placeOf, placeLabel, seasonMonth } from '../core/place';
import { LAWSON, PED_FACTOR, WIND_MAX_KM, lawsonClass, nearestStation, prevailing, rumbName, sampleWind, windField, type Climate, type Station, type WindJob, type WindOut } from '../core/wind';
import { windAt, windSrcLine, ERA5_ATTR, TMYX_ATTR, type WindAt } from '../core/windsrc';
import { INSOL_BINS } from '../scene/scene';
import { floorPlanSvg, sectionChecks, floorGroups, floorTypeOf, FLOOR_NAME, APT_FILL } from '../core/floorplan';
import { openAlbum, genplanSvg, type InsolView } from './album';
import { injectCss as injectChzCss } from './chzsend';
import { facadeSegs } from '../core/sectionplan';
import { planApartments, planKey, windowPoints, windowSun, evaluateApts, isWest, MOD_W, aptSummary, APT_SIZES, type AptStats, type SecPlan, type AptSize } from '../core/apartments';
import { DEMO, demoRow, demoTree, perThousand } from '../core/demography';
import { SOCIAL, MOD_BW, isSocial, socialDemand, plotCapacity, socialPlan, type SocialUse, type Module } from '../core/social';
import { analyze, boundaryPts, buildNet, svcDef, SERVICES, WALKABLE, type Demand, type Net, type Svc, type SvcResult } from '../core/services';
import type { PoiBundle } from '../context/poi';
import { CITY_CATS, catName, cityCategory, cityOf, stopRadius, stopZone, ZONE_NAME, type CityCat, type StopZone } from '../core/transit';
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
import { facadePreview, roofShape, roofCover, roofOf, WIN_OPTS, BAL_OPTS, WINPAT_OPTS, BALPAT_OPTS, SHAPE_OPTS, COVER_OPTS, PARAPET_OPTS, SHADE_OPTS, USE_SHORT } from './facadeui';
import type { Command } from '../core/commands';
import { pushEdge, tieredGfa } from '../core/tiers';
import type { Shade } from '../core/doc';
import { hydrology, HAND_BINS, TWI_BINS, type Hydro } from '../core/hydro';
import { UserLayersUI } from './userlayersui';
import { parseBoundary, crsLabel, areaFrame, clipOsmToArea, ringAreaM2, BOUNDARY_ACCEPT, AREA_FREE_RADIUS, type Boundary } from '../core/boundary';
import { CTX_R_MIN, CTX_R_MAX } from '../core/doc';
import { featureColor, withOverrides, UL_KINDS, type ULFeature } from '../core/userlayers';
import { openColor, closeColor } from './colorpicker';
import { coverClassifier, surfaceT, heatColor, HEAT_BINS } from '../core/heat';
import { loadBaseMap, type TerrainGrid } from '../context/tiles';
import { LiveBase, liveSize } from '../context/basemap';
import { logoSvg } from './logo';
import { openInKochasoz } from '../kochasoz/fromMr';
import { PALETTES, basePrefs, setBasePrefs } from '../context/mapstyle';
import { projectStreetsGeo } from '../scene/streets3d';
import { openGraphics, downloadIllustrator } from './graphics';
import { norm as normSheet } from './sheets';
import { openChizmadon } from '../chizmadon/ui';
import type { ChInbox } from '../chizmadon/model';
import type { PlanSrc } from '../chizmadon/materials';
import { aptSheet } from '../core/aptsheet';
import { sheetSvg, sheetLayout, recommendScale, SHEET_DEFAULT, SHEET_KINDS, SCALES, type SheetCtx, type SheetKind, type SheetOpts } from '../core/sheet';
import { uid } from '../core/doc';
import { ContextManager } from '../context/manager';
import type { ContextBundle } from '../context/load';
import { summary } from '../context/osm';
import { geocode, bboxKm, type Place } from '../context/geocode';
import { WorldMap, zoomFor } from './worldmap';
import { detectBlock, type Barrier } from '../context/blocks';
import { track } from '../core/stats';
import { authRequired } from '../account/config';
import { needsLogin, ensureLogin } from '../account/gate';
import { check as checkAuth, current as currentUser, onAuth, logout } from '../account/session';
import { loginDialog } from '../account/login';
import { isLinkOwner, setExportArea, setExportProject } from '../core/wm';
import { buyDialog } from '../account/buy';
import { coinsDialog, useHeavy, siteGate, siteOk, PAID_STEP_FROM, priceTag, onPrices, autoPayOn, autoPayOff } from '../account/pay';

type ToolMode = 'select' | 'hand' | 'measure' | 'section' | 'pipette';
const TOOLS: [ToolMode, string, string][] = [
  ['select', 'Tanlash (V)', '<path d="M5 3l14 8-6 2-3 6z"/>'],
  ['hand', 'Qoʻl — surish (H)', '<path d="M8 11V5.5a1.5 1.5 0 0 1 3 0V11M11 10V4.5a1.5 1.5 0 0 1 3 0V11M14 10.5V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L3.6 14a1.6 1.6 0 0 1 2.6-1.8L8 14"/>'],
  ['measure', 'Chizgʻich (M)', '<path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>'],
  ['section', 'Kesim (S)', '<path d="M3 12h18" stroke-dasharray="3 2"/><path d="M6 12V6h12v6M6 12v6h12v-6" opacity=".45"/>'],
  ['pipette', 'Pipetka — uslubni nusxalash (I)', '<path d="M14 4l6 6-2 2-6-6zM12 8l-7 7v4h4l7-7"/>'],
];
const TYPO_SHORT: Record<string, string> = { avto: 'Avto (UMN)', yakka: 'Yakka uylar', taunhaus: 'Taunhauslar', juft: 'Juft uylar', hovli: 'Hovli uylar', klaster: 'Klaster', villa: 'Villalar', perimetr: 'Perimetral', qatorlar: 'Qatorlar', minora: 'Minoralar', blok_minora: 'Blok + minora', blok_villa: 'Blok + villa', ofis_plita: 'Ofis plitalari', ofis_minora: 'Ofis minoralari', savdo_blok: 'Savdo markazi' };
const ICON = {
  undo: '<path d="M9 7 4 12l5 5"/><path d="M4 12h11a5 5 0 0 1 0 10h-2"/>',
  redo: '<path d="m15 7 5 5-5 5"/><path d="M20 12H9a5 5 0 0 0 0 10h2"/>',
  back: '<path d="M15 6 9 12l6 6"/>',
  map: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18Z"/>',
  layers: '<path d="M4 18h16"/><path d="M4 12h16"/><path d="M4 6h16"/><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="7" cy="18" r="1.6"/>',
};

const DL = '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', EYE = '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6"/>', SUN = '<path d="M8.5 12a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>', WALK = '<path d="M11.5 4.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M10 21l2.2-6.2 2.8 2.7V21M8.5 11.5L12 8.5l2.8 2 2.7 1M12 8.5l-1.8 6.3"/>';
const chev = () => { const s = svgIcon('<path d="M9 6l6 6-6 6"/>'); s.classList.add('chev'); return s; };
const rTxt = (r: SvcResult) => r.rMin !== r.rMax ? `${r.rMin}–${r.rMax} m` : `${r.r} m`;
const STATUS_TXT: Record<Result['status'], string> = { pass: 'mos', fail: 'mos emas', review: 'koʻrib chiqish', na: 'baholanmadi' };

/** Varaq SVG idan xarita qismi (hoshiya 10 mm, oʻng ustunsiz) — Chizmadon «Xarita oynasi» uchun */
function mapOnly(svg: string, scale: number): { svg: string; vb: [number, number, number, number]; w: number; h: number; scale: number } | null {
  const m = /<svg[^>]*\swidth="([\d.]+)mm"[^>]*\sheight="([\d.]+)mm"[^>]*>/.exec(svg); if (!m) return null;
  const W = Number(m[1]), H = Number(m[2]), inner = svg.slice(svg.indexOf(m[0]) + m[0].length).replace(/<\/svg>\s*$/, '');
  return { svg: inner, vb: [10, 10, W - 20, H - 20], w: W - 20, h: H - 20, scale };
}

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
  /** «Mening qatlamlarim»: import qilingan binolar, chegaralar, yer, chiziqlar */
  private ul!: UserLayersUI;

  constructor(host: HTMLElement, doc: Project, private onExit: () => void) {
    this.store = new Store(doc); this.prevDoc = doc;
    this.step = STEPS.find(s => s.id === (doc.site ? 'hajm' : 'uchastka'))!;
    // kirish talab qilinsa: sessiya aniqlanguncha 3-qadamdan keyingisi ochilmaydi (Uchastka koʻrsatiladi)
    if (needsLogin(this.step.id)) { const want = this.step; this.step = STEPS.find(s => s.id === 'uchastka')!; void checkAuth().then(m => { if (m && this.step.id === 'uchastka') this.go(want); }); }
    this.root = this.build();
    host.replaceChildren(this.root);
    this.scene = new Scene3D(this.el.scene);
    this.scene.onLabels = () => this.renderLblBar();
    try { if (localStorage.getItem('mr-detail') === '0') this.scene.detail = false; } catch { /* */ }
    this.scene.update(doc); this.scene.frameDoc(doc);
    this.ul = new UserLayersUI({ store: this.store, scene: this.scene, run: fn => this.run(fn), refresh: () => this.refreshPop(), bundle: () => (this.store.doc.context.loaded ? this.ctxMgr.current : null), redrawContext: () => { if (this.store.doc.context.loaded) this.showContext(this.ctxMgr.current); } });
    this.ul.sync(doc);
    this.saver = autosave(fn => this.store.subscribe(c => fn(c.doc)), s => { this.el.save.dataset.s = s; this.el.saveT.textContent = tr(s === 'saved' ? 'saqlandi' : s === 'pending' ? 'saqlanmoqda…' : 'saqlanmadi!'); });
    this.off.push(this.store.subscribe(c => this.onChange(c.doc)));
    this.bindScene(); this.bindKeys();
    this.scene.onZoomOutLimit = () => { if (!this.world.open && !document.querySelector('.gx')) void this.openWorld(); };
    { let raf = 0; this.scene.onView = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (this.el.scene.querySelector('.btools')) this.syncBTools(); this.followBase(); }); }; }
    this.renderAll(); this.recompute();
    void this.ensureContext();   // yuklanmagan boʻlsa — fon xaritasi
    // 18-band: boshqa xizmatdan «← Master reja» bilan qaytildi — oʻsha qadam va kamera
    const back = consumeMrBack(doc.id);
    if (back) {
      this.framedCtx = true;
      const st = STEPS.find(x => x.id === back.step); if (st && st.id !== this.step.id) this.go(st);
      if (back.cam) try { this.scene.setCamera(back.cam as Parameters<Scene3D['setCamera']>[0]); } catch { /* */ }
    }
    const keep = () => saveMrReturn({ id: this.store.doc.id, name: this.store.doc.name, step: this.step.id, cam: this.scene.getCamera(), origin: [this.store.doc.origin[0], this.store.doc.origin[1]], hasSite: !!this.store.doc.site?.rings[0]?.length });
    addEventListener('pagehide', keep); this.off.push(() => removeEventListener('pagehide', keep));
  }

  dispose(): void { this.world.dispose(); this.saver.flush(); this.saver.dispose(); this.off.forEach(f => f()); this.ul.dispose(); this.scene.dispose(); }

  /* ---------- qobiq ---------- */
  private build(): HTMLElement {
    const doc = this.store.doc;
    const name = h('input', { class: 'pname', value: doc.name, 'aria-label': 'Loyiha nomi', maxlength: 120 }) as HTMLInputElement;
    name.addEventListener('change', () => this.run(() => this.store.dispatch({ type: 'rename', name: name.value }), () => { name.value = this.store.doc.name; }));
    name.addEventListener('keydown', e => { if (e.key === 'Enter') name.blur(); });
    const ib = (id: string, title: string, icon: string, fn: () => void, cls = 'ib') => { const b = h('button', { class: cls, id, title, 'aria-label': title, onclick: fn }); b.append(svgIcon(icon)); return b; };
    const saveT = h('span', {}, tr('saqlandi'));
    const save = h('span', { class: 'save', 'data-s': 'saved', role: 'status' }, h('i'), saveT);
    const seg = h('div', { class: 'seg sm', role: 'group', 'aria-label': tr('Koʻrinish') },
      ...([['plan', 'Reja'], ['axo', 'Akso'], ['persp', 'Persp']] as [ViewMode, string][]).map(([k, t]) => h('button', { 'data-view': k, 'aria-pressed': k === 'plan', onclick: () => this.setView(k) }, tr(t))));
    // til: 10 til, menyu (butun interfeys qayta chiziladi)
    const lang = langMenu(l => { void this.setLang(l); });
    const theme = ib('themeBtn', isDark() ? 'Yorugʻ rejim' : 'Tungi rejim', isDark() ? ICON.sun : ICON.moon, () => toggleTheme(), 'ib sm');
    this.off.push(onTheme(() => { theme.replaceChildren(svgIcon(isDark() ? ICON.sun : ICON.moon)); theme.title = theme.ariaLabel = isDark() ? 'Yorugʻ rejim' : 'Tungi rejim'; }));
    const top = h('div', { class: 'top glassbar' },
      ib('back', tr('Loyihalar'), ICON.back, () => this.onExit(), 'ib sm'),
      h('a', { class: 'brand', href: '../index.html', title: 'Archemistry Lab portali' }, logoSvg(18), 'Archemistry Lab'),
      h('span', { class: 'svcbadge' }, h('i'), tr('Master reja')),
      name, save, h('span', { class: 'spacer' }),
      this.popBtn('camPop', tr('Kamera'), () => this.camPop()),
      h('button', { class: 'btn', id: 'gxOpen', title: tr('Grafika: masshtabli varaqlar (bosh reja, zonalash, figure-ground, landshaft) — SVG/PNG'), onclick: () => this.startFrame() }, tr('Grafika')),
      h('button', { class: 'btn', id: 'chOpen', title: tr('Chizmadon: taqdimot albomi va tahlil diagrammalari'), onclick: () => this.openCh() }, tr('Chizmadon')),
      seg, lang, theme, this.acctBtn());
    const rail = h('nav', { class: 'rail', 'aria-label': tr('Qadamlar') });
    const panel = h('section', { class: 'panel sp', 'aria-live': 'polite' });
    const kpi = h('div', { class: 'kpibar glassbar', role: 'group', 'aria-label': tr('Koʻrsatkichlar') });
    // asboblar: pastda markazda (7-qoida) — tanlash, qoʻl, chizgʻich, kesim, pipetka, bekor/qaytarish
    const tb = h('div', { class: 'tb glassbar', role: 'toolbar', 'aria-label': tr('Asboblar') });
    const drawer = h('div', { class: 'drawer', hidden: true });
    const lblbar = h('div', { class: 'lblbar', role: 'status' });
    const hint = h('div', { class: 'hint', hidden: true });
    const scene = h('div', { id: 'scene' });
    const badge = h('div', { class: 'ctxbadge', hidden: true, role: 'status' });
    const attr = h('div', { class: 'attr', hidden: true });
    attr.innerHTML = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> hissachilari · Relyef: AWS Terrain Tiles · <span class="sat">Tasvir: Esri, Maxar, Earthstar Geographics</span><span class="carto" hidden> · Fon: Esri, HERE, Garmin</span><span class="ovt" hidden> · Overture Maps Foundation</span>';
    // tepada oʻngda: xarita (fon va uslub) va tahliliy qatlamlar
    const mapctl = h('div', { class: 'mapctl' },
      this.popBtn('stylePop', tr('Xarita'), () => this.stylePop(), 'down', ICON.map),
      this.popBtn('layPop', tr('Qatlamlar'), () => this.layPop(), 'down', ICON.layers),
      h('button', { type: 'button', class: 'mapbtn glassbar', id: 'worldBtn', title: tr('Dunyo xaritasi'), onclick: () => void this.openWorld() }, svgIcon(ICON.globe), h('span', {}, tr('Dunyo'))));
    const ulcard = h('div', { class: 'ulcard glassbar', hidden: true, role: 'dialog', 'aria-label': tr('Qatlam obyekti') });
    const stage = h('div', { class: 'stage' }, scene, this.world.el, rail, panel, hint, drawer, kpi, tb, attr, badge, mapctl, lblbar, ulcard);
    Object.assign(this.el, { name, save, saveT, seg, rail, panel, kpi, tb, drawer, hint, scene, stage, attr, badge, lblbar, ulcard });
    return h('div', { class: 'app' }, top, stage);
  }

  /** Til almashtirish: barcha panellar qayta chiziladi (matnlar i18n dan) */
  private async setLang(l: Lang): Promise<void> {
    await setLang(l);   // yangi til lugʻati yuklanguncha kutiladi
    this.scene.update(this.store.doc);   // xaritadagi yozuvlar (canvas) — yangi tilda
    this.el.saveT.textContent = tr(this.el.save.dataset.s === 'saved' ? 'saqlandi' : this.el.save.dataset.s === 'pending' ? 'saqlanmoqda…' : 'saqlanmadi!');
    this.closePop(); this.renderAll(); this.renderKpi(); this.renderToolPanel();
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
    // faqat varaqlar oʻzgargan boʻlsa (Varaqlar oynasi) — sahna va panel qayta chizilmaydi
    if ((Object.keys(doc) as (keyof Project)[]).every(k => k === 'sheets' || k === 'sheetStyles' || k === 'updated' || p[k] === doc[k])) return;
    // loyiha markazi koʻchdi (uchastka chizilgach, qidiruv, bekor qilish) — kamera va fon yerda joyida qoladi, sahna «sakramaydi»
    if (p.origin !== doc.origin) { const d = frame(p.origin).toLocal(doc.origin); if (Math.hypot(d[0], d[1]) < 60000) this.scene.shiftOrigin(d); }
    if (p.origin !== doc.origin || p.context !== doc.context || p.site !== doc.site || p.removed !== doc.removed) void this.ensureContext();
    if (this.marked.b.length || this.marked.c.length || this.marked.r.length) { const rm = new Set(doc.removed ?? []), rr = new Set(doc.removedRoads ?? []), keepR = this.marked.r.filter(x => !rr.has(x)); this.setMarked(this.marked.b.filter(id => doc.buildings.some(b => b.id === id)), this.marked.c.filter(id => !rm.has(id)), doc, keepR); }
    if (this.selStreet && !doc.streets.some(x => x.id === this.selStreet)) { this.selStreet = null; this.scene.selectStreet(null); }
    if (this.sel && !doc.buildings.some(b => b.id === this.sel)) this.sel = null;
    if (p.buildings !== doc.buildings && this.apt.stats) this.clearApt();
    (this.el.name as HTMLInputElement).value = doc.name;
    this.scene.setSelection(this.sel); this.scene.update(doc);
    if (p.userLayers !== doc.userLayers || p.origin !== doc.origin || p.settings.floorHeight !== doc.settings.floorHeight) this.ul.sync(doc);
    this.renderAll(); this.recompute();
  }

  private async recompute(): Promise<void> {
    const doc = this.store.doc, c = await this.compute.run(doc);
    if (doc !== this.store.doc) return; // eskirgan natija
    this.last = c; this.renderKpi();
    { const fh = doc.settings.floorHeight; this.scene.setStreetOverlap(c.d.streetOverlap.flatMap(x => { const b = doc.buildings.find(y => y.id === x.bid); const top = b ? ((b.z0 ?? 0) + b.floors) * fh : 0; return x.polys.map(ring => ({ ring, top })); })); }
  }

  /** Binoni koʻcha koridoridan chiqarish: eng yaqin loyiha koʻchasi oʻqidan uzoqlashtirib, koridor + 0,5 m tashqarisiga suradi (30.10) */
  private pushOutOfStreet(bid: string): void {
    const doc = this.store.doc, b = doc.buildings.find(x => x.id === bid); if (!b) return;
    const fr = frame(doc.origin), r = b.footprint.map(fr.toLocal), c: XY = [r.reduce((t, p) => t + p[0], 0) / r.length, r.reduce((t, p) => t + p[1], 0) / r.length];
    let best: { d: number; n: XY; half: number; depth: number } | null = null;
    for (const s of doc.streets) {
      const ax = s.axis.map(fr.toLocal), half = profileWidth(profileById(s.profile)) / 2;
      for (let i = 0; i + 1 < ax.length; i++) {
        const A = ax[i], B = ax[i + 1], dx = B[0] - A[0], dy = B[1] - A[1], L2 = dx * dx + dy * dy || 1;
        const proj = (p: XY) => { const t = Math.max(0, Math.min(1, ((p[0] - A[0]) * dx + (p[1] - A[1]) * dy) / L2)); const q: XY = [A[0] + dx * t, A[1] + dy * t]; return { q, d: Math.hypot(p[0] - q[0], p[1] - q[1]) }; };
        const pc = proj(c), n: XY = [(c[0] - pc.q[0]) / (pc.d || 1), (c[1] - pc.q[1]) / (pc.d || 1)];
        // bino uchlarining oʻqdan masofasi — eng yaqini koridor ichida boʻlsa, chuqurlik = half − min
        const dmin = Math.min(...r.map(p => { const pp = proj(p); const sgn = (p[0] - pp.q[0]) * n[0] + (p[1] - pp.q[1]) * n[1]; return sgn * pp.d; }));
        const depth = half - dmin; if (depth <= 0) continue;
        if (!best || pc.d < best.d) best = { d: pc.d, n, half, depth };
      }
    }
    if (!best) { toast(tr('Bino koʻcha koridorida emas')); return; }
    const sh = best.depth + 0.5, moved = r.map(p => [p[0] + best!.n[0] * sh, p[1] + best!.n[1] * sh] as XY);
    this.run(() => this.store.dispatch({ type: 'updateBuilding', id: bid, patch: { footprint: moved.map(fr.toGeo) } }));
    toast(tf('Bino koʻchadan ${d} m surildi', { d: fmt(sh, 1) }));
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
  /** Hisob: kirilmagan — «Kirish», kirgan — pochta bosh harfi va menyu (pochta, balans, chiqish). Kirish talab qilinmasa — yashirin. */
  private acctBtn(): HTMLElement {
    const box = h('span', { class: 'acct', id: 'acctBox' });
    const draw = () => {
      box.hidden = !authRequired();
      const m = currentUser();
      if (!m) { box.replaceChildren(h('button', { class: 'btn btn-sm', id: 'acctIn', onclick: () => void loginDialog() }, tr('Hisobga kirish'))); return; }
      const who = m.name || m.email || m.phone || '';
      const b = this.popBtn('acctPop', who, () => h('div', { class: 'col acct-pop' },
        h('div', { class: 'li' }, h('span', { class: 'k' }, h('b', {}, who), m.email && m.email !== who ? h('span', { class: 'sub' }, m.email) : '')),
        h('div', { class: 'li' }, h('span', { class: 'k' }, tr('Tangalar')), h('span', { class: 'v mono', id: 'acctBal' }, fmt(m.balance))),
        h('button', { class: 'btn btn-sm btn-primary', id: 'acctBuy', onclick: () => { this.closePop(); void buyDialog(); } }, tr('Tanga sotib olish')),
        h('button', { class: 'btn btn-sm', id: 'acctCoins', onclick: () => { this.closePop(); void coinsDialog(); } }, tr('Mening tangalarim')),
        autoPayOn() ? h('button', { class: 'btn btn-sm btn-ghost', id: 'acctAutoOff', onclick: () => { autoPayOff(); this.closePop(); toast(tr('Bu loyihada endi har toʻlovdan oldin soʻraladi')); } }, tr('Soʻramasdan yechishni oʻchirish')) : '',
        h('button', { class: 'btn btn-sm', id: 'acctOut', onclick: () => { this.closePop(); void logout().then(() => { toast(tr('Hisobdan chiqdingiz')); if (needsLogin(this.step.id)) this.go(STEPS.find(x => x.id === 'uchastka')!); }); } }, tr('Chiqish'))));
      b.classList.add('acct-me'); b.querySelector('span')!.textContent = (who[0] ?? '?').toUpperCase(); b.title = who;
      box.replaceChildren(b);
    };
    draw(); this.off.push(onAuth(draw)); this.off.push(onPrices(() => this.root.querySelectorAll<HTMLElement>('[data-ptag]').forEach(el => { el.textContent = priceTag(el.dataset.ptag as Parameters<typeof priceTag>[0]); el.hidden = !el.textContent; })));   // faqat yozuvlar — panel qayta chizilmaydi (kiritilgan qiymatlar saqlanadi)
    if (authRequired() && !isLinkOwner()) void checkAuth();
    return box;
  }

  private popBtn(id: string, label: string, body: () => HTMLElement, dir: 'down' | 'up' = 'down', icon?: string): HTMLElement {
    const b = h('button', { class: icon ? 'mapbtn glassbar popbtn' : 'btn popbtn', id, title: label, 'aria-haspopup': 'true', 'aria-expanded': false, onclick: (e: MouseEvent) => {
      e.stopPropagation();
      const was = this.pop?.dataset.for === id; this.closePop(); if (was) return;
      const p = h('div', { class: 'pop', 'data-for': id, 'data-dir': dir, role: 'dialog', 'aria-label': label }); p.append(body());
      p.addEventListener('click', ev => ev.stopPropagation());
      const r = b.getBoundingClientRect();
      if (dir === 'up') { p.style.bottom = `${window.innerHeight - r.top + 8}px`; p.style.right = `${Math.max(8, window.innerWidth - r.right)}px`; p.style.maxHeight = `${r.top - 20}px`; }
      else if (icon) { p.style.top = `${r.bottom + 6}px`; p.style.right = `${Math.max(8, window.innerWidth - r.right)}px`; p.style.maxHeight = `${window.innerHeight - r.bottom - 20}px`; }
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
    const cs = this.store.doc.context, img = !!this.ctxMgr.current?.imagery;
    const gapR = range({ min: 0.2, max: 1.5, step: 0.05, value: this.scene.explodeGap, id: 'exGap', 'aria-label': tr('Qatlamlar oraligʻi'), disabled: !this.scene.exploded, oninput: v => this.scene.setExploded(this.scene.exploded, v) });
    const gapIn = gapR.querySelector('input')!;
    const li = (k: string, sub: string, ctl: Node) => h('div', { class: 'li' }, h('span', { class: 'k' }, k, sub ? h('span', { class: 'sub' }, sub) : ''), ctl);
    const tile = (attrs: Record<string, unknown>, t: string, sub: string) => h('button', { class: 'tile', ...attrs }, h('b', {}, t), h('span', { class: 'sub' }, sub));
    const pal = !(cs.loaded || cs.base === 'sputnik');
    return h('div', { class: 'popbody' },
      h('div', { class: 'glabel' }, h('span', {}, tr('Fon xaritasi'))),
      h('div', { class: 'tiles c2', role: 'group', id: 'baseSw' }, ...([['maket', cs.loaded ? 'Maket' : 'Stilistik', cs.loaded ? 'oq relyef, OSM qatlamlari' : 'cheksiz vektor xarita'], ['sputnik', 'Sunʼiy yoʻldosh', img || !cs.loaded ? 'Esri World Imagery' : 'atrofni qayta yuklang']] as const).map(([k, t, n]) =>
        tile({ 'data-base': k, 'aria-pressed': cs.base === k, disabled: k === 'sputnik' && !img && cs.loaded, onclick: () => { this.run(() => this.store.dispatch({ type: 'setContext', patch: { base: k } })); this.refreshPop(); } }, tr(t), tr(n)))),
      pal ? h('div', { class: 'glabel' }, h('span', {}, tr('Xarita uslubi')), h('span', {}, tf('${n} ta', { n: Object.keys(PALETTES).length }))) : '',
      pal ? h('div', { class: 'ugrp', role: 'group', id: 'palSw', 'aria-label': tr('Xarita uslubi') }, h('div', {}, ...Object.entries(PALETTES).map(([k, p]) =>
        h('button', { class: 'uchip', 'data-pal': k, title: p.n, 'aria-pressed': basePrefs().pal === k, onclick: () => { setBasePrefs({ pal: k }); void this.showBaseMap(); this.refreshPop(); } },
          h('i', { style: `background:linear-gradient(135deg, ${p.bg} 0 45%, ${p.bld} 45% 70%, ${p.water} 70%)` }), tr(p.n))))) : '',
      pal ? h('div', { class: 'group' }, li(tr('Koʻcha va joy nomlari'), '', sw({ id: 'palLab', label: tr('Koʻcha va joy nomlari'), on: basePrefs().labels, onchange: v => { setBasePrefs({ labels: v }); void this.showBaseMap(); } }))) : '',
      h('div', { class: 'glabel' }, h('span', {}, tr('Uslub')), h('span', {}, tf('${n} ta', { n: STYLES.length }))),
      h('div', { class: 'tiles c2' }, ...STYLES.map(x => tile({ 'data-style': x.id, 'aria-pressed': x.id === this.stylePref, onclick: () => { this.stylePref = x.id; this.syncFade(); } }, tr(x.name), tr(x.note)))),
      h('div', { class: 'group' },
        li(tr('Batafsil fasad (3D)'), tr('derazalar, romlar, balkonlar'), sw({ id: 'detOn', label: tr('Batafsil fasad (3D)'), on: this.scene.detail, onchange: v => { this.scene.setDetail(v); try { localStorage.setItem('mr-detail', v ? '1' : '0'); } catch { /* */ } } })),
        li(tr('Portlatilgan qatlamlar'), tr('atrof → koʻchalar → kvartallar → binolar'), sw({ id: 'exOn', label: tr('Portlatilgan qatlamlar'), on: this.scene.exploded, onchange: v => { this.scene.setExploded(v, Number(gapIn.value)); gapIn.disabled = !v; gapR.classList.toggle('off', !v); } }))),
      h('div', { class: 'row', style: 'gap:10px;align-items:center' }, h('span', { class: 't-small', style: 'white-space:nowrap' }, tr('Qatlamlar oraligʻi')), h('div', { style: 'flex:1;min-width:0' }, gapR)),
      h('span', { class: 't-small' }, tr('Fon va uslub faqat koʻrinishga taʼsir qiladi — loyiha, hisob-kitob va meʼyorlar oʻzgarmaydi. Portlatilgan qatlamlar taqdimot uchun aksonometriyada yaxshi koʻrinadi.')));
  }

  /* ---------- tahliliy qatlamlar: qavatlar soni, yuza qizishi, suv bosish (HAND), namlik (TWI) ---------- */
  private mapKind: 'yoq' | 'issiq' | 'hand' | 'twi' = 'yoq';
  private mapInfo: { title: string; bins: { color: number; label: string }[]; stats: string[]; note: string } | null = null;
  private mapBusy = false;
  private hydroCache: { key: string; hy: Hydro; g: TerrainGrid; c0: XY } | null = null;
  private layPop(): HTMLElement {
    const li2 = (k: string, sub: string, ctl: Node) => h('div', { class: 'li' }, h('span', { class: 'k' }, k, h('span', { class: 'sub' }, sub)), ctl);
    const opt = (k: typeof this.mapKind, t: string, note: string) => h('button', { class: 'tile', 'data-map': k, 'aria-pressed': this.mapKind === k, disabled: this.mapBusy, onclick: () => void this.runMap(k) }, h('b', {}, tr(t)), h('span', { class: 'sub' }, tr(note)));
    const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');
    const cs = this.store.doc.context;
    return h('div', { class: 'popbody' },
      cs.loaded && this.ctxMgr.current ? this.ctxLayerChips() : '',
      this.ul.section(),
      h('div', { class: 'glabel' }, h('span', {}, tr('Yozuvlar'))),
      h('div', { class: 'col', style: 'gap:6px' }, h('span', { class: 't-small', style: 'font-weight:600;color:var(--ink-2)' }, tr('Daha va yer uchastkasi')),
        h('div', { class: 'seg sm', id: 'lblMode', role: 'group', 'aria-label': tr('Daha va yer uchastkasi') }, ...LABEL_MODES.map(m => h('button', { 'data-lmode': m.id, 'aria-pressed': this.scene.labelMode === m.id, onclick: () => { this.scene.setLabelMode(m.id); this.refreshPop(); } }, tr(m.name)))),
        h('span', { class: 't-small' }, tr('Avtomatik — masshtab va boʻsh joyga qarab (sukut). Boshqasi — eng yuqori daraja; sigʻmasa baribir pasayadi.'))),
      h('div', { class: 'group' },
        li2(tr('Qavatlar soni'), tr('bino tomida, faqat ≥ 1:2000 da'), sw({ id: 'flOn', label: tr('Qavatlar soni (raqam)'), on: this.scene.floorLabels, onchange: v => this.scene.setFloorLabels(v) })),
        li2(tr('Koʻcha nomlari'), tr('oʻq boʻylab'), sw({ id: 'stNames', label: tr('Koʻcha nomlari'), on: this.scene.streetNames, onchange: v => this.scene.setStreetNames(v) })),
        li2(tr('Atrof binolari raqami'), 'OSM', sw({ id: 'hNums', label: tr('Atrof binolari raqami'), on: this.scene.houseNums, onchange: v => this.scene.setHouseNums(v) }))),
      h('details', { class: 'how' }, h('summary', {}, svgIcon(IC.info), tr('Qanday tanlanadi')), h('div', {}, tr('Har uchastkada binolardan 2 m nari eng katta boʻsh toʻrtburchak topiladi. 3 → 2 → 1 daraja ketma-ket sinaladi; birinchi sigʻgani chiziladi. Ekranda shrift 12/11 px, varaqda 3,5/2,5 mm (GOST 2.304-81 qatoridan). Sigʻmagan yozuvlar «Yer uchastkalari» jadvalida.'))),
      h('div', { class: 'glabel' }, h('span', {}, tr('Yer sathi xaritasi'))),
      h('div', { class: 'tiles c2' },
        opt('yoq', 'Yoʻq', 'xaritani olib tashlash'),
        opt('issiq', 'Yuza qizishi', 'taxmin: qoplama + soya, 15 iyul 11–17'),
        opt('hand', 'Suv bosish xavfi (HAND)', 'drenajdan balandlik, relyef boʻyicha'),
        opt('twi', 'Namlik (TWI)', 'suv yigʻiladigan pastliklar')),
      this.mapBusy ? h('div', { class: 'note', id: 'mapBusy' }, tr('Hisoblanmoqda…')) : '',
      h('span', { class: 't-small' }, tr('Xarita loyiha oʻzgarsa avtomatik yangilanmaydi — qayta tanlang. Insolyatsiya va shamol xaritalari ham shu qatlamni ishlatadi.')),
      this.mapInfo ? h('div', { class: 'glabel' }, h('span', {}, tr('Xarita legendasi')), h('span', {}, tr('tanlangan xarita boʻyicha'))) : '',
      this.mapInfo ? h('div', { class: 'leg' }, ...this.mapInfo.bins.map(b => h('div', {}, h('i', { style: `background:${hex(b.color)}` }), h('span', {}, tr(b.label))))) : '');
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
    const jm = seasonMonth(7, placeOf(doc.origin[0], doc.origin[1]).south);   // mahalliy yoz: shimol — iyul, janub — yanvar
    for (let t = 11; t <= 17.001; t += 0.5) { const q = sunPosition(localToUtcAt(2026, jm, 15, t, doc.origin[1], doc.origin[0]), doc.origin[1], doc.origin[0]); if (q.alt > 3) steps.push({ alt: q.alt, az: q.az, dt: 0.5 }); }
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
    const name = h('input', { class: 'input', type: 'text', placeholder: `${tr('Koʻrinish')} ${doc.views.length + 1}`, id: 'vName', 'aria-label': tr('Koʻrinish nomi') }) as HTMLInputElement;
    const save = () => {
      const v = { id: uid('v'), name: name.value.trim() || `${tr('Koʻrinish')} ${doc.views.length + 1}`, frame: this.frameId, ...sc.getCamera() };
      this.run(() => this.store.dispatch({ type: 'addView', view: v })); this.refreshPop();
    };
    name.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
    const vname = (m: string) => tr(m === 'persp' ? 'Persp' : m === 'axo' ? 'Akso' : 'Reja');
    const CAM = '<path d="M4 8h3l2-3h6l2 3h3v11H4zM12 10.5a3 3 0 1 0 0 6a3 3 0 1 0 0-6"/>';
    return h('div', { class: 'popbody' },
      h('div', { class: 'glabel' }, h('span', {}, tr('Obyektiv (perspektiva)'))),
      h('div', { class: 'seg sm', id: 'lensSeg' }, ...LENSES.map((mm, i) => h('button', { 'data-lens': mm, 'aria-pressed': sc.lens === mm, onclick: () => { sc.setLens(mm); this.refreshPop(); } }, i === LENSES.length - 1 ? `${mm} mm` : String(mm)))),
      h('button', { class: 'btn btn-sm btn-block', id: 'eyeLvl', title: tr('Piyoda koʻzi: yerdan 1,6 m'), onclick: () => { sc.eyeLevel(); this.el.seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === 'persp'))); } }, ...icl('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6"/>', tr('Koʻz sathi (1,6 m)'))),
      h('div', { class: 'group' }, h('div', { class: 'li' }, h('span', { class: 'k' }, tr('2 nuqtali perspektiva'), h('span', { class: 'sub' }, tr('vertikallar tik'))),
        sw({ id: 'twoPt', label: tr('2 nuqtali perspektiva'), on: sc.twoPoint, onchange: v => { if (v && sc.view !== 'persp') this.setView('persp'); sc.setTwoPoint(v); } }))),
      h('div', { class: 'glabel' }, h('span', {}, tr('Kadr'))),
      h('div', { class: 'tiles c4', id: 'frameSeg' }, ...FRAMES.map(f => h('button', { class: 'tile', 'data-frame': f.id, 'aria-pressed': this.frameId === f.id, onclick: () => { this.frameId = f.id; this.syncFrame(); this.refreshPop(); } }, h('span', {}, tr(f.name))))),
      h('div', { class: 'glabel' }, h('span', {}, tr('Saqlangan koʻrinishlar'))),
      doc.views.length ? h('div', { class: 'group views' }, ...doc.views.map(v => h('div', { class: 'li' },
        h('button', { class: 'vgo', 'data-view-id': v.id, onclick: () => { sc.setCamera(v); this.frameId = v.frame; this.syncFrame(); this.el.seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v.mode))); this.refreshPop(); } },
          svgIcon(CAM), h('span', { class: 'k' }, v.name, h('span', { class: 'sub' }, `${vname(v.mode)}${v.mode === 'persp' ? ` · ${v.lens} mm${v.twoPoint ? ` · ${tr('2 nuqta')}` : ''}` : ''} · ${tr(FRAMES.find(f => f.id === v.frame)?.name ?? 'Erkin')}`))),
        h('button', { class: 'btn icon-btn btn-sm btn-ghost', title: tr('Oʻchirish'), 'aria-label': `${v.name} — ${tr('oʻchirish')}`, onclick: () => { this.run(() => this.store.dispatch({ type: 'removeView', id: v.id })); this.refreshPop(); } }, svgIcon(IC.trash))))) : h('span', { class: 't-small' }, tr('Hali yoʻq. Kamerani joylang va saqlang — loyiha bilan birga saqlanadi.')),
      h('div', { class: 'row', style: 'gap:6px' }, name, h('button', { class: 'btn btn-primary', id: 'vSave', onclick: save }, tr('Saqlash'))),
      h('button', { class: 'btn btn-block', id: 'shotFrame', onclick: () => download(`${safe(doc.name)}_kadr.png`, sc.snapshot(FRAMES.find(f => f.id === this.frameId)?.r ?? 0)) }, ...icl('<path d="M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15.5 8.5h.01"/>', tr('Kadrdagi rasm (PNG)'))));
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
  /** b — loyiha binolari, c — atrofdagi (OSM) binolar, r — atrofdagi (OSM) yoʻllar va piyoda yoʻlaklari */
  private marked: { b: string[]; c: number[]; r: number[] } = { b: [], c: [], r: [] };
  private setMarked(b: string[], c: number[], doc = this.store.doc, r: number[] = []): void {
    this.marked = { b: [...new Set(b)], c: [...new Set(c)], r: [...new Set(r)] };
    const fr = frame(doc.origin), rs = new Set(this.marked.r);
    const roads = (this.ctxMgr.current?.osm.roads ?? []).filter(x => rs.has(x.id)).map(x => ({ pts: x.pts.map(fr.toLocal), w: x.w }));
    this.scene.setMarked(doc, this.marked.b, this.marked.c, roads);
    const n = this.marked.b.length + this.marked.c.length + this.marked.r.length;
    if (!this.tool) {
      this.el.hint.hidden = !n;
      if (n) {
        const parts = [...(this.marked.c.length ? [tf('atrofdagi binolar — ${c}', { c: this.marked.c.length })] : []), ...(this.marked.r.length ? [tf('yoʻllar — ${r}', { r: this.marked.r.length })] : [])];
        this.el.hint.textContent = `${tf('Tanlandi: ${n} ta', { n })}${parts.length ? ` (${parts.join(', ')})` : ''} · ${tr('Delete — oʻchirish · Shift + bosish yoki Shift + ramka — qoʻshish · Esc — bekor')}`;
      }
    }
  }
  /** Ekran nuqtasidagi atrof (OSM) yoʻli: avtomobil yoʻli, trotuar, piyoda yoʻlagi (loyihaga olingan va olib tashlanganlar — yoʻq) */
  private osmRoadAt(p: XY): number | null {
    const doc = this.store.doc, fr = frame(doc.origin), b = this.ctxMgr.current; if (!b) return null;
    const skip = new Set([...doc.streets.map(x => x.osm), ...(doc.removedRoads ?? [])]);
    const v = this.scene.viewExtent(), mpp = 2 * v.r / Math.max(1, this.el.scene.clientWidth), extra = Math.max(2, 7 * mpp);
    let best: number | null = null, bd = Infinity;
    for (const r of b.osm.roads) {
      if (skip.has(r.id)) continue;
      const a = r.pts.map(fr.toLocal);
      for (let i = 1; i < a.length; i++) {
        const u = a[i - 1], w = a[i], dx = w[0] - u[0], dy = w[1] - u[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - u[0]) * dx + (p[1] - u[1]) * dy) / L2));
        const dd = Math.hypot(u[0] + t * dx - p[0], u[1] + t * dy - p[1]) - r.w / 2;
        if (dd <= extra && dd < bd) { bd = dd; best = r.id; }
      }
    }
    return best;
  }
  private deleteMarked(): void {
    const { b, c, r } = this.marked; if (!b.length && !c.length && !r.length) return;
    if (b.length || c.length) this.run(() => this.store.dispatch({ type: 'deleteSelection', ids: b, ctx: c }));
    if (r.length) this.run(() => this.store.dispatch({ type: 'setRemovedRoads', ids: [...(this.store.doc.removedRoads ?? []), ...r] }));
    this.setMarked([], []);
    if (c.length) toast(`${c.length} ta atrof binosi olib tashlandi — «Hudud» qadamida yoki oʻng tugma menyusida qaytariladi`);
    if (r.length) toast(tf('${n} ta yoʻl olib tashlandi — «Koʻchalar» qadamida qaytariladi · Ctrl+Z — bekor qilish', { n: r.length }));
  }
  private restoreRemoved(): void { this.run(() => this.store.dispatch({ type: 'setRemoved', removed: [] })); }

  /* ---------- foydalanuvchi qatlami obyektlari: bosib tanlash va alohida rang berish ---------- */
  /** tanlangan obyektlar — bitta qatlamdan (Shift + bosish / Shift + ramka — qoʻshish) */
  private ulSel: { layer: string; fids: number[] } = { layer: '', fids: [] };
  private setUlSel(layer: string, fids: number[]): void {
    const u = [...new Set(fids)];
    this.ulSel = u.length ? { layer, fids: u } : { layer: '', fids: [] };
    this.scene.setUserSelection(this.ulSel.layer || null, this.ulSel.fids);
    this.renderUlCard();
  }
  /** Shift + bosish: tanlovga qoʻshish / olib tashlash (boshqa qatlam obyekti — yangi tanlov) */
  private toggleUlSel(hit: { layer: string; fid: number }): void {
    if (this.ulSel.layer && this.ulSel.layer !== hit.layer) { this.setUlSel(hit.layer, [hit.fid]); return; }
    const f = this.ulSel.fids; this.setUlSel(hit.layer, f.includes(hit.fid) ? f.filter(x => x !== hit.fid) : [...f, hit.fid]);
  }
  private ulColor(color: number | null): void {
    const { layer, fids } = this.ulSel; if (!layer || !fids.length) return;
    const m = this.store.doc.userLayers?.find(x => x.id === layer); if (!m) return;
    const overrides = withOverrides(m.overrides, fids, color);
    this.run(() => this.store.dispatch({ type: 'updateUserLayer', id: layer, patch: { overrides: overrides ?? {} } }));
    this.renderUlCard();
  }
  /** Tanlangan obyekt(lar) kartasi: qatlam, xususiyatlari, rang, tiklash */
  private renderUlCard(): void {
    const el = this.el.ulcard; if (!el) return;
    const { layer, fids } = this.ulSel, m = this.store.doc.userLayers?.find(x => x.id === layer), data = m ? this.ul.data.get(m.id) : undefined;
    if (!m || !data || !fids.length) { el.hidden = true; el.replaceChildren(); closeColor(true); return; }
    const one = fids.length === 1 ? data[fids[0]] : null, kind = UL_KINDS.find(k => k.id === m.kind)!;
    const col = featureColor(m, data[fids[0]], fids[0]), hx = '#' + col.toString(16).padStart(6, '0');
    const own = fids.filter(i => m.overrides?.[i] != null).length;
    const sw = h('button', { class: 'ulsw big', type: 'button', id: 'ulSelColor', title: tr('Rang tanlash'), 'aria-label': tr('Rang tanlash') }, h('i', { style: `background:${hx}` }));
    sw.addEventListener('click', () => openColor(sw, hx, { title: tr('Obyekt rangi'), onChange: v => { (sw.firstChild as HTMLElement).style.background = v; }, onDone: v => this.ulColor(parseInt(v.slice(1), 16)), onCancel: v => { (sw.firstChild as HTMLElement).style.background = v; } }));
    const props = one ? Object.entries(one.p).filter(([k, v]) => v != null && v !== '' && !/^(guid|id)$/i.test(k)).slice(0, 8) : [];
    el.replaceChildren(
      h('div', { class: 'row', style: 'justify-content:space-between;align-items:center;gap:10px' },
        h('b', {}, one ? (m.nameField && one.p[m.nameField] ? String(one.p[m.nameField]) : tf('Obyekt #${n}', { n: fids[0] + 1 })) : tf('${n} ta obyekt', { n: fids.length })),
        h('button', { class: 'ib', type: 'button', title: tr('Yopish (Esc)'), 'aria-label': tr('Yopish (Esc)'), onclick: () => this.setUlSel('', []) }, svgIcon(IC.x))),
      h('span', { class: 't-small' }, `${m.name} · ${tr(kind.name)}`),
      props.length ? h('div', { class: 'ulprops' }, ...props.map(([k, v]) => h('div', {}, h('span', { class: 'k' }, k), h('span', {}, typeof v === 'number' ? fmt(v) : String(v))))) : '',
      h('div', { class: 'row', style: 'gap:8px;align-items:center' }, sw, h('span', { class: 't-small' }, own ? (fids.length === 1 ? tr('Alohida rang') : tf('Alohida rang — ${n} ta', { n: own })) : tr('Toifa / qatlam rangi')),
        own ? h('button', { class: 'btn btn-ghost btn-sm', id: 'ulSelReset', onclick: () => this.ulColor(null) }, tr('Rangni tiklash')) : ''),
      h('span', { class: 't-small' }, tr('Shift + bosish yoki Shift + ramka — tanlovga qoʻshish · Esc — bekor')));
    el.hidden = false;
  }

  /* ---------- bino muharriri (tanlangan bino; har qadamda) ---------- */
  private inspTab: 'hajm' | 'qavat' = 'hajm';
  /** auto — devor ushlansa itariladi, tom ushlansa bino siljiydi; yoq — qulf (faqat tanlash); floor — qavat devori (terrasa/konsol) */
  private dragMode: 'auto' | 'yoq' | 'floor' = 'auto';
  private tierInset = 3;
  private tierEdge: number | null = null;
  /** bino tanlangan (parsellar, fasad va kvartiralar qadamidan tashqari) — chap panel bino muharririga aylanadi */
  /** bino inspektori faqat «Hajmlar» qadamida — boshqa qadamga oʻtilsa, oʻsha qadam oynasi koʻrinadi (ustma-ust qolmaydi) */
  private inspOn(): boolean { return !!this.sel && this.step.id === 'hajm' && this.store.doc.buildings.some(x => x.id === this.sel); }
  private renderInspector(): void {
    const doc = this.store.doc, b = doc.buildings.find(x => x.id === this.sel), el = this.el.panel;
    if (!b || !this.inspOn()) { if (this.scene.selFloor != null) this.scene.setSelFloor(null); if (!b) this.dragMode = 'auto'; this.syncBTools(); if (el.dataset.mode === 'bino') this.renderPanel(); return; }
    const fr = frame(doc.origin), r = b.footprint.map(fr.toLocal), u = useDef(b.use), s = doc.settings;
    const upd = (patch: Partial<Omit<typeof b, 'id'>>, key?: string) => this.run(() => this.store.dispatch({ type: 'updateBuilding', id: b.id, patch }, key));
    const row = (label: string, sub: string, ctl: Node) => h('div', { class: 'li' }, h('span', { class: 'k' }, label, sub ? h('span', { class: 'sub' }, sub) : ''), ctl);
    const kind = b.gen ? (({ burchak: 'Burchak seksiyasi', oddiy: 'Oddiy seksiya', qator: 'Qator seksiyasi', uy: 'Yakka uy', taunhaus: 'Taunhaus', villa: 'Villa', minora: 'Minora', stilobat: 'Stilobat' } as Record<string, string>)[b.gen.kind] ?? 'Seksiya') : 'Bino';
    const tabs = h('div', { class: 'seg', role: 'tablist' }, ...([['hajm', 'Hajm'], ['qavat', 'Qavatlar va terrasa']] as const).map(([k, t]) => h('button', { role: 'tab', 'aria-pressed': this.inspTab === k, 'data-itab': k, onclick: () => { this.inspTab = k; if (k !== 'qavat') this.scene.setSelFloor(null); this.renderInspector(); } }, tr(t))));
    const body = h('div', { class: 'body ibody' });
    const gfa = b.tiers?.length ? tieredGfa(r, b.floors, b.tiers) : area(r) * b.floors, kk = gfa / (area(r) * b.floors || 1);
    const resNet = kk * area(r) * Math.max(0, b.floors - b.nonRes) * u.res * s.netToGross;
    const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');
    { const ov = this.last?.d.streetOverlap.find(x => x.bid === b.id);
      if (ov) body.append(h('div', { class: 'note bad', id: 'ovNote' }, tf('Bino koʻcha koridoriga ${a} m² tushadi (qizil chiziqlar ichida).', { a: fmt(ov.area) }),
        h('button', { class: 'btn btn-sm', style: 'margin-top:6px;display:flex', id: 'ovPush', onclick: () => this.pushOutOfStreet(b.id) }, tr('Koʻchadan chiqarish')))); }
    if (this.inspTab === 'hajm') {
      const builds = USES.filter(x => x.build);
      const fn = h('div', { class: 'ugrp', id: 'iUse', role: 'group', 'aria-label': tr('Funksiya') }, h('div', {}, ...builds.map(x => h('button', { class: 'uchip', 'data-use': x.id, 'aria-pressed': x.id === b.use, title: x.name, onclick: () => upd({ use: x.id as Use }) }, h('i', { style: `background:${hex(x.color)}` }), tr(USE_SHORT[x.id] ?? x.name)))));
      // balandlik: qadamlar + kichik kesim (noturar — toʻq, turar — och)
      const z0 = b.z0 ?? 0, tot = z0 + b.floors, fh = 7, H = Math.max(60, Math.min(150, tot * fh + 4));
      const q = Math.min(fh, (H - 4) / Math.max(1, tot));
      const sec = Array.from({ length: tot }, (_, i) => { const y = H - 2 - (i + 1) * q, kind2 = i < z0 ? '#c9c3b8' : i - z0 < b.nonRes ? '#8d877d' : '#e3d7bd'; return `<rect x="${i < z0 ? 4 : 14}" y="${y + 0.5}" width="${i < z0 ? 56 : 36}" height="${q - 1}" rx="1.5" fill="${kind2}"/>`; }).join('');
      const kpi = (v: string, t: string) => h('div', { class: 'group flat', style: 'padding:9px 12px' }, h('div', { class: 'kpi' }, h('b', { style: 'font-size:17px' }, v), h('span', {}, tr(t))));
      body.append(
        h('div', { class: 'glabel' }, h('span', {}, tr('Funksiya')), h('span', {}, tf('${n} ta — bino boʻladiganlari', { n: builds.length }))), fn,
        h('div', { class: 'glabel' }, h('span', {}, tr('Balandlik'))),
        h('div', { class: 'hrow' },
          h('div', { class: 'group grow' },
            row(tr('Qavatlar'), '1–60', stepper({ id: 'iFloors', label: tr('Qavatlar'), min: 1, max: 60, step: 1, value: b.floors, onchange: v => upd({ floors: v }, 'fl-' + b.id) })),
            u.res > 0 ? row(tr('Noturar (pastda)'), `0–${Math.max(0, b.floors - 1)}`, stepper({ id: 'iNonRes', label: tr('Noturar (pastda)'), min: 0, max: Math.max(0, b.floors - 1), step: 1, value: b.nonRes, onchange: v => upd({ nonRes: v }, 'nr-' + b.id) })) : '',
            row(tr('Stilobat ustida'), '0–10', stepper({ id: 'iZ0', label: tr('Stilobat ustida'), min: 0, max: 10, step: 1, value: z0, onchange: v => upd({ z0: v || undefined }, 'z0-' + b.id) }))),
          h('div', { class: 'msec', 'aria-hidden': 'true', html: `<svg viewBox="0 0 64 ${H}" width="40" height="${H * 40 / 64}" preserveAspectRatio="none">${sec}<path d="M0 ${H - 1}H64" stroke="currentColor" stroke-width="2"/></svg>` })),
        h('span', { class: 't-small', id: 'bldEditHint' }, tr('Xaritada: tom ustidagi toʻq sariq tutqich — qavatlar; burchak tutqichlari — oyoq izi.')),
        h('div', { class: 'glabel' }, h('span', {}, tr('Sichqoncha bilan'))),
        h('span', { class: 't-small', id: 'dragHint' }, tr(this.dragMode === 'yoq' ? 'Tahrir qulflangan — sahnadagi asboblar panelida qulfni oching.' : 'Devorni torting — devor parallel suriladi; tomni torting — bino siljiydi; burchak nuqtasi — shaklni oʻzgartiradi; Alt + oʻrtadagi nuqta — yangi burchak.')),
        h('div', { class: 'glabel' }, h('span', {}, tr('Natija'))),
        h('div', { class: 'row2' },
          kpi(`${fmt(gfa)} m²`, 'GFA'), kpi(`${fmt(tot * s.floorHeight, 1)} m`, 'Balandlik'),
          kpi(u.res > 0 && s.aptNet > 0 ? `≈ ${fmt(resNet / s.aptNet)}` : '—', 'Kvartiralar'), kpi(u.res > 0 && s.m2PerPerson > 0 ? `≈ ${fmt(resNet / s.m2PerPerson)}` : '—', 'Aholi')));
    } else {
      const f = Math.min(this.scene.selFloor ?? b.floors, b.floors);
      if (this.scene.selFloor !== f) this.scene.setSelFloor(f);
      const floors = h('div', { class: 'floors', id: 'iFloorList' }, ...Array.from({ length: b.floors }, (_, i) => b.floors - i).map(n => h('button', { class: `btn btn-sm${n <= b.nonRes ? ' nr' : ''}`, 'aria-pressed': n === f, 'data-floor': n, onclick: () => { this.scene.setSelFloor(n); this.renderInspector(); } }, String((b.z0 ?? 0) + n))));
      const ins = h('input', { class: 'input', type: 'number', min: 0.5, max: 12, step: 0.5, value: this.tierInset, id: 'tInset', 'aria-label': tr('Cheginish') }) as HTMLInputElement;
      ins.onchange = () => { this.tierInset = Math.max(0.5, Number(ins.value) || 3); };
      const n = r.length, az = (k: number) => { const a = r[k], q = r[(k + 1) % n], ccw = signedArea(r) > 0, ox = (ccw ? 1 : -1) * (q[1] - a[1]), oy = (ccw ? -1 : 1) * (q[0] - a[0]); return ((Math.atan2(ox, oy) * 180 / Math.PI) + 360) % 360; };
      const side = (a: number) => tr(['shimol', 'shimoli-sharq', 'sharq', 'janubi-sharq', 'janub', 'janubi-gʻarb', 'gʻarb', 'shimoli-gʻarb'][Math.round(a / 45) % 8]);
      const edgeSel = select({ id: 'tEdge', 'aria-label': tr('Tomon'), onchange: v => { this.tierEdge = v === '' ? null : Number(v); } },
        [{ value: '', label: tr('Barcha tomondan'), selected: this.tierEdge == null }, ...r.map((_, k) => ({ value: String(k), label: `${k + 1}-${tr('devor')} · ${side(az(k))} (${Math.round(Math.hypot(r[(k + 1) % n][0] - r[k][0], r[(k + 1) % n][1] - r[k][1]))} m)`, selected: this.tierEdge === k }))]);
      const tiers = b.tiers ?? [];
      body.append(
        h('div', { class: 'row', style: 'align-items:flex-start;gap:10px' }, floors,
          h('div', { class: 'col grow' },
            h('div', {}, h('b', { id: 'iFloorT' }, tf('${n}-qavat', { n: (b.z0 ?? 0) + f })), h('div', { class: 't-small' }, `${tr(f <= b.nonRes ? 'noturar' : 'turar / asosiy')} · ${tr('PgUp / PgDn — qavat · sahnada qavatni bosing')}`)),
            h('button', { class: this.dragMode === 'floor' ? 'btn btn-sm btn-primary' : 'btn btn-sm', id: 'floorDrag', 'aria-pressed': this.dragMode === 'floor', title: tr('Binoda qavat devorini bosib torting: ichkariga — terrasa, tashqariga — konsol (shu qavatdan yuqorisi)'), onclick: () => { this.dragMode = this.dragMode === 'floor' ? 'auto' : 'floor'; this.renderInspector(); } }, ...icl(this.dragMode === 'floor' ? IC.check : '<path d="M8 5l-4 4 4 4M4 9h11a5 5 0 0 1 0 10h-3"/>', tr('Qavat devorini sudrash'))),
            h('div', { class: 'glabel' }, h('span', {}, tr('Shu qavatdan yuqorisi'))),
            h('div', { class: 'field' }, h('label', { for: 'tInset' }, tr('Cheginish')), h('span', { class: 'unit' }, ins, h('span', {}, 'm'))),
            h('div', { class: 'field' }, h('label', { for: 'tEdge' }, tr('Tomon')), edgeSel),
            h('button', { class: 'btn btn-primary btn-sm btn-block', id: 'tAdd', disabled: f < 2, onclick: () => upd({ tiers: [...tiers.filter(t => t.from !== f), { from: f, inset: this.tierInset, ...(this.tierEdge != null ? { edge: this.tierEdge } : {}) }] }) }, tr('Terrasa (cheginish)')),
            h('button', { class: 'btn btn-sm btn-block', id: 'tCut', disabled: f < 2, onclick: () => upd({ floors: f - 1 }) }, tr('Shu qavatdan yuqorisini olib tashlash')),
            h('button', { class: 'btn btn-sm btn-block', id: 'tNonRes', onclick: () => upd({ nonRes: Math.min(f, b.floors - 1) }) }, tr('Shu qavatgacha — noturar')))),
        tiers.length ? h('div', { class: 'group', id: 'tierList' }, ...[...tiers].sort((x, y) => x.from - y.from).map(t => h('div', { class: 'li' },
          h('span', { class: 'k' }, `${(b.z0 ?? 0) + t.from}-${tr('qavatdan')}: ${t.inset > 0 ? `${fmt(t.inset, 1)} m ${tr('ichkariga')}` : `${fmt(-t.inset, 1)} m ${tr('tashqariga')}`}`, h('span', { class: 'sub' }, t.edge != null ? `${t.edge + 1}-${tr('devor')}` : tr('barcha tomon'))),
          h('button', { class: 'btn icon-btn btn-sm btn-ghost', 'aria-label': tr('Oʻchirish'), title: tr('Oʻchirish'), onclick: () => upd({ tiers: tiers.filter(x => x !== t) }) }, svgIcon(IC.trash))))) : '',
        h('span', { class: 't-small' }, tr('Terrasalar GFA va aholi hisobiga kiradi. Kvartira sxemasi pastki qavat dogʻi boʻyicha (taxmin).')));
    }
    const close = () => { this.sel = null; this.scene.select(null); this.dragMode = 'auto'; this.renderAll(); };
    const ids = doc.buildings.map(x => x.id), at = ids.indexOf(b.id);
    const go = (d: number) => { const id = ids[(at + d + ids.length) % ids.length]; this.sel = id; this.scene.select(id); this.renderAll(); };
    const keep = el.dataset.mode === 'bino' && el.dataset.bid === b.id ? el.querySelector('.body')?.scrollTop ?? 0 : 0;
    el.dataset.mode = 'bino'; el.dataset.bid = b.id;
    const fas = STEPS.find(x => x.id === 'fasad')!;
    const ib = (label: string, icon: string, fn: () => void, id?: string) => h('button', { class: 'btn icon-btn btn-sm btn-ghost', 'aria-label': label, title: label, ...(id ? { id } : {}), onclick: fn }, svgIcon(icon));
    el.replaceChildren(
      h('header', { class: 'ihead' },
        h('div', { class: 'row inav', style: 'gap:2px' },
          h('button', { class: 'btn btn-sm btn-ghost', id: 'iBack', onclick: close }, ...icl('<path d="M15 6l-6 6 6 6"/>', `${this.step.n}-${tr('qadam')}: ${tr(this.step.title)}`)), h('span', { class: 'spacer' }),
          ib(tr('Oldingi bino'), '<path d="M15 6l-6 6 6 6"/>', () => go(-1)), h('span', { class: 't-small num' }, `${at + 1} / ${ids.length}`),
          ib(tr('Keyingi bino'), '<path d="M9 6l6 6-6 6"/>', () => go(1)),
          ib(tr('Yopish (Esc)'), IC.x, close)),
        h('div', {}, h('span', { class: 't-label' }, tr(kind)), h('h2', { class: 't-title' }, `${u.name} · ${(b.z0 ?? 0) + b.floors} ${tr('qavat')}`), h('div', { class: 't-small' }, `${tr('Dogʻ')} ${fmt(area(r))} m² · GFA ≈ ${fmt(gfa)} m²`)),
        tabs),
      body,
      h('footer', {},
        h('span', { class: 't-small grow' }, tr('Fasad va tom — alohida qadam')),
        h('button', { class: 'btn btn-primary btn-sm', id: 'iToFasad', onclick: () => { this.lookTarget = 'sel'; this.go(fas); } }, `${fas.n} · ${tr(fas.title)}`)));
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
    // tugma bosilgan paytdagi joriy oyoq izi (asboblar paneli qayta yaratilmaydi — eski nusxa ishlatilmasin)
    const live = (): { fr: ReturnType<typeof frame>; r: XY[]; c: XY } | null => { const d = this.store.doc, x = d.buildings.find(q => q.id === b.id); if (!x) return null; const f2 = frame(d.origin), r2 = x.footprint.map(f2.toLocal); return { fr: f2, r: r2, c: centroid(r2) }; };
    const moveBy = (dx: number, dy: number) => { const L = live(); if (L) upd({ footprint: L.r.map(p => L.fr.toGeo([p[0] + dx, p[1] + dy])) }, 'mv-' + b.id); };
    const rot = (deg: number) => { const L = live(); if (!L) return; const a = deg * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a), c2 = L.c; upd({ footprint: L.r.map(p => L.fr.toGeo([c2[0] + (p[0] - c2[0]) * cs - (p[1] - c2[1]) * sn, c2[1] + (p[0] - c2[0]) * sn + (p[1] - c2[1]) * cs])) }, 'rot-' + b.id); };
    const curB = () => this.store.doc.buildings.find(q => q.id === b.id) ?? b;
    const dup = () => { const id = uid('b_'); this.run(() => { this.store.dispatch({ type: 'addBuilding', id, footprint: r.map(p => fr.toGeo([p[0] + 8, p[1] - 8])), floors: b.floors, nonRes: b.nonRes, use: b.use }); const { id: _i, footprint: _f, gen: _g, ...rest } = b; void _i; void _f; void _g; this.store.dispatch({ type: 'updateBuilding', id, patch: rest }); }); this.sel = id; this.scene.select(id); this.renderAll(); };
    const ib = (label: string, d: string, fn: () => void, id = '', cls = '') => h('button', { class: `rb ${cls}`, 'aria-label': tr(label), title: tr(label), ...(id ? { id } : {}), onclick: fn }, svgIcon(`<path d="${d}"/>`));
    const lockV = `${b.floors}|${this.dragMode === 'yoq' ? 1 : 0}`;
    if (!el || el.dataset.bid !== b.id || el.dataset.v !== lockV) {
      el?.remove();
      el = h('div', { class: 'btools glassbar', role: 'toolbar', 'aria-label': tr('Bino amallari'), 'data-bid': b.id, 'data-v': lockV },
        h('button', { class: 'rb', id: 'iLock', 'aria-pressed': this.dragMode === 'yoq', 'aria-label': tr(this.dragMode === 'yoq' ? 'Sichqoncha bilan tahrirni ochish' : 'Sichqoncha bilan tahrirni qulflash'), title: tr(this.dragMode === 'yoq' ? 'Sichqoncha bilan tahrirni ochish' : 'Sichqoncha bilan tahrirni qulflash'), onclick: () => { this.dragMode = this.dragMode === 'yoq' ? 'auto' : 'yoq'; this.renderInspector(); this.syncHandles(); } }, svgIcon(this.dragMode === 'yoq' ? '<path d="M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3"/>' : '<path d="M6 11h12v9H6zM8 11V8a4 4 0 0 1 7.5-2"/>')),
        h('span', { class: 'sepv' }),
        ib('Gʻarbga 1 m', 'M19 12H5M11 6l-6 6 6 6', () => moveBy(-1, 0)), ib('Shimolga 1 m', 'M12 19V5M6 11l6-6 6 6', () => moveBy(0, 1)),
        ib('Janubga 1 m', 'M12 5v14M6 13l6 6 6-6', () => moveBy(0, -1)), ib('Sharqqa 1 m', 'M5 12h14M13 6l6 6-6 6', () => moveBy(1, 0)),
        h('span', { class: 'sepv' }),
        ib('5° chapga burish', 'M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4', () => rot(5), 'rotL'), h('span', { class: 't-small num' }, '5°'), ib('5° oʻngga burish', 'M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4', () => rot(-5), 'rotR'),
        h('span', { class: 'sepv' }),
        ib('Qavat olib tashlash', 'M5 12h14', () => upd({ floors: Math.max(1, curB().floors - 1) }, 'fl-' + b.id)), h('span', { class: 'chip num' }, `${(b.z0 ?? 0) + b.floors} q`), ib('Qavat qoʻshish', 'M12 5v14M5 12h14', () => upd({ floors: Math.min(60, curB().floors + 1) }, 'fl-' + b.id)),
        h('span', { class: 'sepv' }),
        ib('Nusxa (yoniga)', 'M8 8h11v11H8zM5 15V5h10', dup, 'iDup'), ib('Oʻchirish', 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13', () => this.store.dispatch({ type: 'removeBuilding', id: b.id }), 'iDel', 'danger')) as HTMLDivElement;
      host.append(el);
    }
    // panel bino va uning tutqichlari (burchaklar, qavat tutqichi) ustiga tushmasin: ekrandagi eng yuqori nuqtadan 58 px tepada
    const base = Math.min(...r.map(p => this.scene.H(p[0], p[1]))) + (b.z0 ?? 0) * fh, top = base + b.floors * fh + 2.5, hr = host.getBoundingClientRect();
    const pts = [...r.map(p => this.scene.toScreen(p[0], p[1], base)), ...r.map(p => this.scene.toScreen(p[0], p[1], top)), this.scene.toScreen(c[0], c[1], top)];
    const minY = Math.min(...pts.map(p => p.y)), cx = this.scene.toScreen(c[0], c[1], top).x;
    // tepada joy boʻlmasa (bino ekran tepasida) — panel bino ostiga: qavat tutqichi va burchaklar ustiga tushmasin
    const maxY = Math.max(...pts.map(p => p.y)), above = minY - hr.top - 58, ty = above >= 64 ? above : Math.min(hr.height - 60, Math.max(64, maxY - hr.top + 14));
    // chap panel ochiq boʻlsa — asboblar paneli uning ostida qolmasin (1024 px da ham)
    const pr = this.el.panel.getBoundingClientRect(), half = el.offsetWidth / 2 + 8, lo = Math.max(half, pr.width && pr.right > hr.left ? pr.right - hr.left + half : half), hi = Math.max(lo, hr.width - half);
    Object.assign(el.style, { left: `${Math.max(lo, Math.min(hi, cx - hr.left))}px`, top: `${ty}px` });
  }

  /** parsellar qadamida buziladiganlar foydalanuvchi tanloviga koʻra, keyingi qadamlarda — yashirin */
  private goneHidden = false;
  private syncGone(): void { const ip = STEPS.findIndex(x => x.id === 'parsel'), i = STEPS.indexOf(this.step); this.scene.setHideGone(i > ip || this.goneHidden); }
  private renderAll(): void {
    this.syncFade(); this.syncGone();
    this.renderRail(); this.renderPanel(); this.renderUlCard();
    const u = this.root.querySelector('#undo') as HTMLButtonElement | null; if (u) u.title = u.ariaLabel = this.store.canUndo ? tf('Bekor qilish: ${this.store.undoLabel} (Ctrl+Z)', { 'this.store.undoLabel': this.store.undoLabel }) : tr('Bekor qilish (Ctrl+Z)');
  }

  /* ---------- kontekst ---------- */
  /** Hujjatdagi holatga mos kontekstni koʻrsatish: kerak boʻlsa keshdan yoki tarmoqdan yuklash */
  private async ensureContext(force = false): Promise<void> {
    const doc = this.store.doc, cs = doc.context;
    // cheksiz xaritada uchastka loyiha markazidan uzoqda chizilgan boʻlsa — markaz uchastkaga koʻchadi (atrof shu yerda yuklanadi)
    if (doc.site?.rings[0]?.length) {
      const r = doc.site.rings[0], c: LngLat = [r.reduce((a, p) => a + p[0], 0) / r.length, r.reduce((a, p) => a + p[1], 0) / r.length];
      if (dist(doc.origin, c) > (cs.loaded ? Math.min(300, cs.radius * 0.3) : 150)) { this.run(() => this.store.dispatch({ type: 'setOrigin', origin: c })); return; }   // kamera onChange da joyida qoladi
    }
    if (!cs.loaded) { this.showContext(null); void this.showBaseMap(); return; }
    const cur = this.ctxMgr.current, C = cs.area ? areaFrame(cs.area).center : doc.origin;   // chegara boʻyicha — atrof markazi chegara qutisi markazida
    const covers = (b: ContextBundle | null) => !!b && b.radius >= cs.radius && dist(b.center, C) + cs.radius <= b.radius + 60;
    if (!force && covers(cur)) { this.showContext(cur); return; }
    track('mr/calc/area');
    if (this.ctx.busy && !force) return;
    this.ctx = { busy: true, msg: 'Keshdan…', frac: 0.02, err: '' }; this.renderPanel(); this.renderBadge();
    try {
      const b = await this.ctxMgr.load(C, cs.radius, (msg, frac) => { this.ctx.msg = msg; this.ctx.frac = frac; this.renderCtxProgress(); }, force);
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
      this.baseAttr(sat, `${tr('Fon')}: ${img?.attr ?? 'Esri'}`); this.baseDrawn();
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
    if (doc.context.loaded) { this.followCtx(now); return; }
    if (!this.baseKey || navigator.webdriver || this.baseFail) return;
    // 40 km gacha — 1:100 000 masshtabda ham xarita butun ekranni qoplaydi
    const v = this.scene.viewExtent(), r = Math.min(40000, Math.max(300, v.r)), key = this.baseKey, L = this.liveAt;
    if (L && L.key === key && Math.hypot(v.c[0] - L.c[0], v.c[1] - L.c[1]) < L.r * 0.3 && r < L.r * 1.25 && r > L.r * 0.5) return;
    clearTimeout(this.liveT);
    // koʻrinish chizish paytida olinadi: koʻchirish → kamerani moslash ketma-ketligida eski koʻrinish chizilmasin
    this.liveT = window.setTimeout(() => { const w = this.scene.viewExtent(); void this.drawLive(w.c, Math.min(40000, Math.max(300, w.r)), key); }, now ? 0 : 250);
  }
  /**
   * Atrof yuklangan: kamera yaqinlashganda — koʻrinayotgan joy uchun tiniq sunʼiy yoʻldosh qatlami (z ≤ 19, bir martalik
   * z 17 tasvir ustida); uzoqlashganda — atrof kvadratidan tashqarida fon xaritasi (qora boʻsh joy oʻrniga). Ikkisi ham
   * jonli xarita (MapLibre) orqali chiziladi, kamera toʻxtagach 250 ms kechikib.
   */
  private ctxLive: { kind: 'detail' | 'around'; c: XY; r: number; key: string } | null = null;
  private followCtx(now = false): void {
    const doc = this.store.doc, b = this.ctxMgr.current;
    if (navigator.webdriver || !b) return;   // baseFail (vektor fon zaxirasi) bunga taalluqli emas
    const v = this.scene.viewExtent(), R = doc.context.radius, sat = doc.context.base === 'sputnik', pr = basePrefs();
    const key = `${doc.origin.join(',')}|${doc.context.base}|${pr.pal}|${pr.labels}`;
    const kind: 'detail' | 'around' | null = sat && b.imagery && v.r < Math.min(700, R * 0.8) ? 'detail' : v.r > R * 0.9 ? 'around' : null;
    const L = this.ctxLive;
    if (!kind) { if (L?.kind === 'detail') { this.ctxLive = null; this.scene.setSatLayer(null, doc.origin); } clearTimeout(this.liveT); return; }
    if (L && L.kind === kind && L.key === key && Math.hypot(v.c[0] - L.c[0], v.c[1] - L.c[1]) < L.r * 0.3 && v.r < L.r * 1.25 && v.r > L.r * 0.5) return;
    clearTimeout(this.liveT);
    this.liveT = window.setTimeout(() => { const w = this.scene.viewExtent(); void this.drawCtxLive(kind, w.c, Math.max(60, w.r), key); }, now ? 0 : 250);
  }
  private async drawCtxLive(kind: 'detail' | 'around', c: XY, r: number, key: string): Promise<void> {
    // kvadrat koʻrinishdan 1,5 barobar katta: keyingi qayta chizishgacha (1,25·r yoki 0,3·r surish) keng ekranning cheti qora qolmasin
    const doc = this.store.doc, sat = doc.context.base === 'sputnik', pr = basePrefs(), R = Math.min(40000, r * 1.5);
    this.live ??= new LiveBase(...liveSize(this.el.scene));
    this.ctxLive = { kind, c, r, key };
    const img = await this.live.render(frame(doc.origin).toGeo(c), R, sat ? 'sat' : 'stil', pr.pal, pr.labels).catch(() => null);
    if (!img || this.ctxLive?.key !== key || this.ctxLive.kind !== kind || !this.store.doc.context.loaded || this.store.doc.origin !== doc.origin) return;
    if (kind === 'detail') { this.scene.setSatLayer(img, doc.origin); return; }
    this.scene.setSatLayer(null, doc.origin);
    await this.scene.setBaseMap({ ...img, bg: sat ? '#2b2d2f' : PALETTES[pr.pal].bg }, doc.origin);
  }
  private async drawLive(c: XY, r: number, key: string): Promise<void> {
    const doc = this.store.doc, sat = doc.context.base === 'sputnik', pr = basePrefs();
    this.live ??= new LiveBase(...liveSize(this.el.scene));
    this.liveAt = { c, r: r * 1.15, key };
    const img = await this.live.render(frame(doc.origin).toGeo(c), r * 1.15, sat ? 'sat' : 'stil', pr.pal, pr.labels).catch(() => null);
    if (this.baseKey !== key || this.store.doc.context.loaded) return;
    if (!img) { this.baseFail = true; this.baseKey = ''; this.liveAt = null; void this.showBaseMap(); return; }
    const first = !this.scene.hasBaseMap;
    if (this.store.doc.origin !== doc.origin) return;
    await this.scene.setBaseMap({ ...img, bg: sat ? '#2b2d2f' : PALETTES[pr.pal].bg }, doc.origin);
    this.baseAttr(sat, 'Fon: © OpenMapTiles · OpenFreeMap'); this.baseDrawn();
    if (first && !this.framedCtx && !doc.site && !doc.buildings.length) { this.framedCtx = true; this.scene.frameRadius(600); }
  }
  /** Chegara boʻyicha yuklangan atrof — poligonga qirqilgan nusxa (eslab qolinadi) */
  private clipMemo: { b: ContextBundle; a: LngLat[]; v: ContextBundle } | null = null;
  private ctxView(b: ContextBundle | null): ContextBundle | null {
    const a = this.store.doc.context.area;
    if (!b || !a) return b;
    if (this.clipMemo?.b === b && this.clipMemo.a === a) return this.clipMemo.v;
    const v = { ...b, osm: clipOsmToArea(b.osm, a) };
    this.clipMemo = { b, a, v }; return v;
  }
  private showContext(b0: ContextBundle | null): void {
    const doc = this.store.doc, b = this.ctxView(b0);
    if (b) { this.baseKey = ''; this.liveAt = null; this.ctxLive = null; void this.scene.setBaseMap(null, doc.origin); (this.el.attr.querySelector('.carto') as HTMLElement).hidden = true; }
    void this.scene.setContext(b, doc).then(() => {
      if (b) this.followCtx(true);
      this.ul.sync(this.store.doc);
      if (b) this.syncKeep();
      if (b && !this.framedCtx) { this.framedCtx = true; if (doc.context.area) this.scene.frameDoc(this.store.doc, doc.context.area); else if (!doc.site) this.scene.frameRadius(Math.min(doc.context.radius, 350)); }
      // gorizont: kattaroq radiusdagi binolar (fon rejimida, xatoda jim)
      const fk = b && doc.context.layers.buildings && !doc.context.area ? `${b.center.join(',')}|${b.radius}|${doc.origin.join(',')}` : '';
      if (fk === this.farKey) return;
      this.farKey = fk; this.scene.setFar(null, doc);
      if (b && fk) void this.ctxMgr.loadFar(b.center, b.radius).then(f => { if (this.farKey === fk && f) this.scene.setFar(f.buildings, this.store.doc); });
    });
    this.el.attr.hidden = !b;
    const ovt = this.el.attr.querySelector('.ovt') as HTMLElement | null; if (ovt) ovt.hidden = !(b?.ovm && (b.ovm.added || b.ovm.heights));
    (this.el.attr.querySelector('.sat') as HTMLElement).hidden = doc.context.base !== 'sputnik';
  }
  private framedCtx = false;
  /** uchastka ichidagi atrof binolari markazi (geo) — saqlanganlarni qayta topish uchun */
  private keepCands(): KeepCand[] { const fr = frame(this.store.doc.origin); return this.scene.inSite.map(x => ({ id: x.id, c: fr.toGeo(centroid(x.rings[0])) })); }
  private keepAt(): Record<string, LngLat> { const o: Record<string, LngLat> = {}; for (const c of this.keepCands()) o[c.id] = c.c; return o; }
  private keepRings(): Record<string, LngLat[]> { const fr = frame(this.store.doc.origin), o: Record<string, LngLat[]> = {}; for (const x of this.scene.inSite) o[x.id] = x.rings[0].map(p => fr.toGeo(p)); return o; }
  /** atrof qayta yuklangach saqlangan binolarni id yoki markaz boʻyicha qayta bogʻlash (tarixga yozilmaydi) */
  private syncKeep(): void {
    const d = this.store.doc; if (!d.keep.length || !this.scene.inSite.length) return;
    const r = reconcileKeep(d.keep, d.keepAt, this.keepCands(), d.origin), rings = this.keepRings();
    const noRing = r.keep.some(k => rings[k] && !d.keepRings?.[k]);   // eski loyiha: konturlar hali yozilmagan
    if (!r.changed && !noRing) return;
    this.store.amend({ type: 'setKeep', keep: r.keep, at: r.keepAt, rings });
  }
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
    try { this.search.res = await geocode(q, this.store.doc.origin); if (!this.search.res.length) this.search.err = 'Hech narsa topilmadi. Shahar, koʻcha, mahalla yoki «41.311, 69.279» koʻrinishida yozing.'; }
    catch (e) { this.search.err = (e as Error).message || 'Qidiruvda xato'; }
    this.search.busy = false; this.renderPanel();
  }

  /* ===== Dunyo xaritasi: 3D sahna ~16 km dan uzoqqa chiqmaydi — undan nariga MapLibre (butun dunyo) ===== */
  private world = new WorldMap({
    onArrive: (c, halfM) => this.arriveWorld(c, halfM),
    onClose: () => this.closeWorld(),
    inset: () => { const p = this.el.panel, st = this.el.stage; if (!p?.offsetWidth || !st) return 0; return Math.max(0, p.getBoundingClientRect().right - st.getBoundingClientRect().left + 12); },
  });
  private async openWorld(bbox?: [number, number, number, number], mark?: LngLat): Promise<void> {
    this.closePop();
    const o = this.store.doc.origin, v = this.scene.viewExtent(), here = frame(o).toGeo(v.c);
    // 3D dagi aynan shu markaz va masshtab bilan ochiladi — uzoqlashtirish uzilmasdan davom etadi
    await this.world.show(here, zoomFor(this.scene.viewHalfWidth(), here[1], this.el.scene.clientWidth || 1000), bbox, mark ?? o, this.store.doc.context.base === 'sputnik' ? 'sat' : 'stil');
    this.el.stage.classList.add('wm-on');
  }
  private closeWorld(): void { this.world.hide(); this.el.stage.classList.remove('wm-on'); }
  private arriving = false;
  /** Dunyo xaritasidan 3D ga: sahna xaritadagi markaz va masshtabda ochiladi; fon chizilguncha dunyo xaritasi ustida turadi, keyin soʻnadi */
  private async arriveWorld(c: LngLat, halfW: number): Promise<void> {
    if (this.arriving) return;
    const doc = this.store.doc, p = frame(doc.origin).toLocal(c), far = Math.hypot(p[0], p[1]) > 12000;
    if (far && (doc.site || doc.buildings.length)) {   // chizilgan narsalar bor — avvalgidek soʻraladi
      this.closeWorld();
      this.goTo({ name: tr('Xaritada tanlangan joy'), detail: '', at: c }, null);
      if (this.search.pending && this.step.id !== 'uchastka') { const s = STEPS.find(x => x.id === 'uchastka'); if (s) this.go(s); }
      this.renderPanel(); return;
    }
    this.arriving = true;
    try {
      const done = this.baseSettled();
      if (far) { void this.scene.setBaseMap(null, doc.origin); this.goTo({ name: tr('Xaritada tanlangan joy'), detail: '', at: c }, null, halfW); }
      else this.scene.frameView(p[0], p[1], halfW);
      await done;
    } finally { this.arriving = false; }
    this.world.fadeOut(); this.el.stage.classList.remove('wm-on');
  }
  /** Fon xaritasi navbatdagi chizilishi tugaguncha (koʻpi bilan 2,5 s) kutish */
  private baseWaiters: (() => void)[] = [];
  private baseSettled(): Promise<void> {
    return new Promise(res => { const t = setTimeout(() => res(), navigator.webdriver || this.store.doc.context.loaded || this.baseFail ? 150 : 2500); this.baseWaiters.push(() => { clearTimeout(t); res(); }); });
  }
  private baseDrawn(): void { const w = this.baseWaiters; this.baseWaiters = []; w.forEach(f => f()); }
  /** Qidiruv natijasi: davlat / viloyat / katta shahar — dunyo xaritasida chegarasiga moslab; kichik joy — darhol 3D */
  private pickPlace(p: Place): void {
    if (p.bbox && bboxKm(p.bbox) > 12) { this.search.res = []; this.renderPanel(); void this.openWorld(p.bbox, p.at); return; }
    if (this.world.open) this.closeWorld();
    this.goTo(p, null);
  }

  private goTo(p: Place, carry: boolean | null, halfW?: number): void {
    const doc = this.store.doc;
    if (carry === null && (doc.site || doc.buildings.length)) { this.search.pending = p; this.renderPanel(); return; }
    this.search.pending = null; this.search.res = [];
    this.framedCtx = false;
    this.run(() => { this.store.dispatch({ type: 'moveProject', origin: p.at, carry: !!carry }); if (doc.context.area) this.store.dispatch({ type: 'setContext', patch: { area: null, radius: 500 } }); });
    if (halfW) { this.scene.frameView(0, 0, halfW); this.framedCtx = true; }   // dunyo xaritasidan — oʻsha masshtabda, fon chizilgach qayta moslanmaydi
    else this.scene.frameRadius(doc.site && carry ? 0 : 250);
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
    void this.putSite([res.ring.map(fr.toGeo)], () => { this.setTool(null); this.scene.frameDoc(this.store.doc); });
    toast(`Kvartal aniqlandi: ${fmt(res.area / 1e4, 2)} ga. Chegarani yoʻl chetidan oladi — kerak boʻlsa qaytadan chizing.`);
  }

  /* ---------- chegara fayli (uchastka va atrof hududi) ---------- */
  /** Fayl tanlash oynasi → chegara (GeoJSON, KML/KMZ, DXF; WGS84 yoki UTM avtomatik) */
  private pickBoundary(then: (b: Boundary, file: string) => void): void {
    const inp = h('input', { type: 'file', accept: BOUNDARY_ACCEPT, hidden: true, id: 'bndFile' }) as HTMLInputElement;
    inp.addEventListener('change', async () => {
      const f = inp.files?.[0]; inp.remove(); if (!f) return;
      try { then(parseBoundary(f.name, new Uint8Array(await f.arrayBuffer()), this.store.doc.origin), f.name); }
      catch (e) { toast(tr((e as Error).message || 'Faylni oʻqib boʻlmadi')); }
    });
    this.root.append(inp); inp.click();
  }
  /** Atrofni chegara ichida yuklash: markaz — chegara qutisi markazi, radius — qutining yarmi + zaxira */
  private applyArea(ring: LngLat[]): void {
    const F = areaFrame(ring), doc = this.store.doc;
    if (F.radius > CTX_R_MAX) { toast(tf('Hudud juda katta: ${a} km. Brauzerda ${m} km gacha yuklanadi — chegarani kichikroq qismlarga boʻling.', { a: fmt(2 * F.radius / 1000, 1), m: fmt(2 * CTX_R_MAX / 1000, 0) })); return; }
    this.framedCtx = false;
    this.run(() => {
      if (!doc.site && !doc.buildings.length) this.store.dispatch({ type: 'moveProject', origin: F.center, carry: false });
      this.store.dispatch({ type: 'setContext', patch: { area: ring.map(p => [p[0], p[1]] as LngLat), radius: Math.max(CTX_R_MIN, F.radius), loaded: true } });
    });
  }
  /** Katta hudud — Pro belgisi va izoh (hozircha ochiq) */
  private proNote(id: string, text: string): HTMLElement {
    return h('div', { class: 'note', id }, h('span', { class: 'chip', style: 'margin-right:6px' }, 'Pro'), text);
  }
  /** «Hudud»: chegara ichini yuklash — fayldan, uchastkadan yoki oʻz qatlamidan */
  private areaBlock(): HTMLElement {
    const doc = this.store.doc, cs = doc.context, box = h('div', { class: 'col', id: 'areaBox' });
    box.append(h('div', { class: 'glabel' }, h('span', {}, tr('yoki chegara ichini yuklash')), h('span', { class: 'chip' }, 'Pro')));
    if (cs.area) {
      const ha = ringAreaM2(cs.area) / 1e4, side = 2 * cs.radius / 1000;
      box.append(h('div', { class: 'group' }, h('div', { class: 'li', id: 'areaSt' }, h('span', { class: 'k' }, h('b', {}, tf('Chegara: ${a} ga', { a: fmt(ha, ha < 100 ? 1 : 0) })), h('span', { class: 'sub' }, tf('Atrof ${s} × ${s} km kvadratda yuklanadi va chegaraga qirqiladi.', { s: fmt(side, 1) }))),
        h('button', { class: 'btn btn-sm btn-ghost', id: 'areaOff', onclick: () => this.run(() => this.store.dispatch({ type: 'setContext', patch: { area: null, radius: Math.min(1000, Math.max(300, Math.round(cs.radius / 250) * 250)) } })) }, tr('Olib tashlash')))));
      if (cs.radius > AREA_FREE_RADIUS) box.append(this.proNote('areaPro', tf('Katta hudud: radius ${r} m — bepul reja ${f} m gacha. Hozircha ochiq; obuna ulanganda Pro rejada boʻladi.', { r: fmt(cs.radius), f: fmt(AREA_FREE_RADIUS) })));
    }
    const polys = (doc.userLayers ?? []).filter(m => m.kind === 'chegara' || m.kind === 'yer').map(m => ({ m, ring: this.largestRing(this.ul.data.get(m.id)) })).filter(x => x.ring);
    box.append(h('div', { class: 'row', style: 'flex-wrap:wrap' },
      h('button', { class: 'btn btn-sm', id: 'areaFile', onclick: () => this.pickBoundary((b, f) => { toast(tf('«${f}»: ${a} ga, ${c}', { f, a: fmt(b.areaHa, 1), c: crsLabel(b.crs) })); this.applyArea(b.rings[0]); }) }, ...icl(IC.plus, tr('Chegara fayli'))),
      doc.site ? h('button', { class: 'btn btn-sm', id: 'areaSite', onclick: () => this.applyArea(doc.site!.rings[0]) }, tr('Uchastka chegarasi')) : '',
      ...polys.map(({ m, ring }) => h('button', { class: 'btn btn-sm', 'data-areaul': m.id, title: tr('Qatlamdagi eng katta poligon'), onclick: () => this.applyArea(ring!) }, tf('«${n}» qatlamidan', { n: m.name })))));
    box.append(h('span', { class: 't-small' }, tr('GeoJSON, KML/KMZ yoki DXF (yopiq polilayn). Koordinatalar: WGS84 yoki UTM (zona faylda yozilgan yoki loyiha hududi boʻyicha) — avtomatik aniqlanadi. 12 × 12 km gacha.')));
    return box;
  }
  private largestRing(fs: ULFeature[] | undefined): LngLat[] | null {
    let best: LngLat[] | null = null, A = 0;
    for (const f of fs ?? []) for (const p of f.polys ?? []) { const a = ringAreaM2(p[0]); if (a > A) { A = a; best = p[0]; } }
    return best;
  }

  /** Atrof (OSM) qatlamlari — ixcham chiplar. 1-qadamda va xaritadagi «Qatlamlar» oynasida bir xil holat. */
  private ctxLayerChips(): HTMLElement {
    const L = this.store.doc.context.layers, has = !!this.ctxMgr.current;
    const names: [keyof typeof L, string, string][] = [['buildings', 'Binolar', '#8a8a86'], ['roads', 'Yoʻllar', '#b9b4a8'], ['rail', 'Temir yoʻl', '#4a4a48'], ['water', 'Suv', '#5b8fc7'], ['green', 'Yashil hududlar', '#7fa865'], ['trees', 'Daraxtlar*', '#4e7d3a'], ['relief', 'Relyef', '#a08a6e']];
    return h('div', { class: 'col', id: 'ctxLayers', style: 'gap:6px' },
      h('div', { class: 'glabel' }, h('span', {}, tr('Atrof qatlamlari')), h('span', {}, 'OSM')),
      h('div', { class: 'chips', role: 'group', 'aria-label': tr('Atrof qatlamlari') }, ...names.map(([k, t, c]) => h('button', { class: 'zchip', type: 'button', style: `--c:${c}`, 'data-ctx-layer': k, 'aria-pressed': !!L[k], disabled: !has,
        onclick: () => { this.run(() => this.store.dispatch({ type: 'setContext', patch: { layers: { [k]: !this.store.doc.context.layers[k] } } })); if (this.pop?.dataset.for === 'layPop') this.refreshPop(); } }, tr(t)))),
      h('span', { class: 't-small' }, tr('* OSM dagi daraxtlar + park va koʻchalar boʻylab taxminiy joylashuv — faqat koʻrinish uchun, hisobda ishlatilmaydi.')));
  }

  /** Tugmadagi narx yozuvi (pullik hisob): «5 t» / «bepul»; egasi va hisob oʻchiq — yoʻq */
  private ptag(kind: Parameters<typeof priceTag>[0]): HTMLElement | string {
    const t = priceTag(kind);
    return h('span', { class: 'ptag', 'data-ptag': kind, hidden: !t }, t);
  }

  /** Uchastka chegarasini qoʻyish — har qanday maydon bepul (28.10); 3 ga dan kattasi 7-qadamda ochiladi (siteStepOk). */
  private async putSite(rings: LngLat[][], after?: () => void): Promise<void> {
    this.run(() => this.store.dispatch({ type: 'setSite', rings }));
    after?.();
  }
  /** Uchastka toʻliq koʻrinib tursa — kamera tegilmaydi (chizgan joyingizda qoladi); ekrandan chiqsa — moslanadi */
  private fitSiteIfOut(): void {
    const d = this.store.doc, r = d.site?.rings[0]; if (!r?.length) return;
    const f = frame(d.origin), v = this.scene.viewExtent(), hw = this.scene.viewHalfWidth();
    if (r.map(f.toLocal).some(q => Math.abs(q[0] - v.c[0]) > hw * 0.9 || Math.abs(q[1] - v.c[1]) > hw * 0.9 * ((this.el.scene.clientHeight || 1) / (this.el.scene.clientWidth || 1)))) this.scene.frameDoc(d);
  }
  /** Uchastka maydoni, ga (chizilmagan — 0) */
  private siteHa(): number { const r = this.store.doc.site?.rings[0]; return r ? ringAreaM2(r) / 1e4 : 0; }
  /** 7–11-qadamlar: katta uchastka loyihasi ochilganmi (1–6 — doim) */
  private siteStepOk(s: StepDef): boolean { return s.n < PAID_STEP_FROM || siteOk(this.store.doc.id, this.siteHa()); }

  /* ===== 1-qadam: Hudud (MR-Q1) ===== */
  private hududPanel(body: HTMLElement): void {
    // 27.10 (1+2 birlashdi): asosiy — qidiruv va «Atrofni yuklash»; markaz, radius, chegara, qatlamlar va oʻz maʼlumotlar — «Atrof sozlamalari» ichida
    const more = h('details', { class: 'how', id: 'ctxMore' }, h('summary', {}, svgIcon(IC.info), tr('Atrof sozlamalari: markaz, radius, qatlamlar')));
    const doc = this.store.doc, cs = doc.context, b = this.ctxView(this.ctxMgr.current), S = this.search;   // chegara boʻyicha — qirqilgan
    const q = h('input', { type: 'search', class: 'input', id: 'q', placeholder: tr('Davlat, shahar, manzil yoki 41.311, 69.279'), value: S.q, 'aria-label': tr('Manzil qidiruvi') }) as HTMLInputElement;
    q.addEventListener('keydown', e => { if (e.key === 'Enter') void this.doSearch(q.value); });
    body.append(h('div', { class: 'row' }, h('div', { class: 'field grow' }, h('label', {}, tr('Qidirish')), q),
      h('button', { class: 'btn btn-primary', id: 'qGo', style: 'align-self:end', disabled: S.busy, onclick: () => void this.doSearch(q.value) }, S.busy ? '…' : tr('Topish'))));
    if (S.err) body.append(h('div', { class: 'note bad' }, S.err));
    if (!cs.loaded && !S.pending && !S.res.length) body.append(h('div', { class: 'note' }, tr('Yoki xaritada joyni oʻng tugma bilan bosing → «Loyiha markazini shu yerga koʻchirish». Fon: «Xarita» tugmasida — maket yoki sunʼiy yoʻldosh.')));
    if (S.pending) {
      const p = S.pending;
      body.append(h('div', { class: 'note warn' }, tf('«${p.name}» ga oʻtilmoqda. Chizilgan uchastka va binolar bilan nima qilamiz?', { 'p.name': p.name })),
        h('div', { class: 'row' },
          h('button', { class: 'btn btn-primary btn-sm', id: 'mvCarry', onclick: () => this.goTo(p, true) }, tr('Ular ham koʻchsin')),
          h('button', { class: 'btn btn-sm', id: 'mvOnly', onclick: () => this.goTo(p, false) }, tr('Joyida qolsin')),
          h('button', { class: 'btn btn-ghost btn-sm', onclick: () => { this.search.pending = null; this.renderPanel(); } }, tr('Bekor qilish'))));
    } else if (S.res.length) {
      body.append(h('div', { class: 'group res', role: 'listbox', 'aria-label': tr('Qidiruv natijalari') }, ...S.res.map(p => h('button', { class: 'li it', role: 'option', onclick: () => this.pickPlace(p) }, h('span', { class: 'k' }, p.name, h('span', { class: 'sub' }, p.detail))))));
    }
    more.append(h('div', { class: 'group' }, h('div', { class: 'li' }, h('span', { class: 'k' }, tr('Loyiha markazi'), h('span', { class: 'sub' }, tr('Xaritada oʻng tugma → «Markazni shu yerga koʻchirish»'))), h('span', { class: 'v mono', id: 'orig' }, `${doc.origin[1].toFixed(5)}, ${doc.origin[0].toFixed(5)}`))));
    (cs.loaded ? more : body).append(h('div', { class: 'glabel' }, h('span', {}, tr('Atrof radiusi'))),
      h('div', { class: 'seg seg-wrap', role: 'group', 'aria-label': tr('Radius') }, ...[300, 500, 750, 1000, 1500, 1800, 2500, 3000, 4000].map(r => h('button', { 'aria-pressed': !cs.area && cs.radius === r, onclick: () => this.run(() => this.store.dispatch({ type: 'setContext', patch: { radius: r, area: null } })) }, r < 1000 ? `${r} m` : `${fmt(r / 1000, r % 1000 ? 1 : 0)} km`))));
    more.append(this.areaBlock());
    if (this.ctx.busy) body.append(h('div', { class: 'bar' }, h('i', { style: `width:${Math.round(this.ctx.frac * 100)}%;background:var(--svc)` })), h('span', { class: 't-small', id: 'ctxMsg' }, this.ctx.msg));
    else if (!cs.loaded) body.append(h('button', { class: 'btn btn-primary btn-block btn-lg', id: 'ctxLoad', onclick: () => this.run(() => {
      // xarita surilgan boʻlsa — loyiha markazi ekran markaziga koʻchadi (atrof shu yerda yuklanadi), aks holda eski markaz (Amir Temur) qolib ketardi
      const c = this.scene.viewExtent().c;
      if (!doc.site && !doc.buildings.length && Math.hypot(c[0], c[1]) > 60) { this.framedCtx = false; this.store.dispatch({ type: 'moveProject', origin: frame(doc.origin).toGeo(c), carry: false }); }
      this.store.dispatch({ type: 'setContext', patch: { loaded: true } });
    }) }, tr('Atrofni yuklash (OSM, relyef, sunʼiy yoʻldosh)')), h('span', { class: 't-small' }, tr('Atrof ekran markazidagi joy atrofida yuklanadi — xaritani kerakli joyga suring.')));
    if (this.ctx.err) body.append(h('div', { class: 'note bad', id: 'ctxErr' }, this.ctx.err, ' ', h('button', { class: 'btn btn-sm', onclick: () => void this.ensureContext(true) }, tr('Qayta urinish'))));
    if (cs.loaded && b && !this.ctx.busy) {
      const s = summary(b.osm), est = b.osm.buildings.filter(x => x.hSrc === 'taxmin').length;
      body.append(h('div', { class: 'group' }, h('div', { class: 'li', id: 'ctxSt' }, h('span', { class: 'k' }, h('b', {}, `${fmt(s.buildings)} ${tr('bino')}`), ` · ${fmt(s.roadKm, 1)} ${tr('km yoʻl')}`,
        h('span', { class: 'sub' }, `${fmt(b.osm.water.length + b.osm.waterways.length)} ${tr('suv obyekti')} · ${fmt(b.osm.green.length)} ${tr('yashil hudud')} · OSM, ${new Date(b.fetched).toLocaleDateString('ru-RU')}.${est ? ' ' + tf('${fmt(est)} ta binoning balandligi OSM da yoʻq — dogʻ maydoni va turi boʻyicha taxmin qilingan (kichik uylar — 1–2 qavat).', { 'fmt(est)': fmt(est) }) : ''}`)))));
      // 32-band: Overture Maps — OSM da chizilmagan binolar va taxminiy balandliklar aniqlashtirilgan
      if (b.ovm && (b.ovm.added || b.ovm.heights)) body.append(h('div', { class: 'note', id: 'ctxOv' }, tf('Overture Maps: +${a} bino (OSM da yoʻq), ${h} ta binoning balandligi aniqlashtirildi. © OpenStreetMap contributors, Overture Maps Foundation (ODbL).', { a: fmt(b.ovm.added), h: fmt(b.ovm.heights) })));
      if (b.stale) body.append(h('div', { class: 'note warn', id: 'ctxStale' }, tf('OSM serveri hozir javob bermadi — keshdagi ${new Date(b.fetched).toLocaleDateString(\'ru-RU\')} nusxasi koʻrsatilmoqda. Keyinroq «OSM dan yangilash» ni bosing.', { "new Date(b.fetched).toLocaleDateString('ru-RU')": new Date(b.fetched).toLocaleDateString('ru-RU') })));
      if (b.missing.length) body.append(h('div', { class: 'note warn' }, tf('Yuklanmadi: ${b.missing.join(\', \')}. Qolgan qatlamlar ishlaydi.', { "b.missing.join(', ')": b.missing.join(', ') })));
      body.append(this.ctxLayerChips());   // 27.10: qatlamlar yana koʻrinadigan joyda (#277 da «Atrof sozlamalari» ichida yashirinib qolgandi)
      more.append(
        h('div', { class: 'glabel' }, h('span', {}, tr('Yer qoplami'))),
        h('div', { class: 'seg sm', role: 'group' }, ...([['maket', 'Maket'], ['sputnik', 'Sunʼiy yoʻldosh']] as const).map(([k, t]) => h('button', { 'aria-pressed': cs.base === k, 'data-base': k, disabled: k === 'sputnik' && !b.imagery, onclick: () => this.run(() => this.store.dispatch({ type: 'setContext', patch: { base: k } })) }, tr(t)))),
        h('div', { class: 'row' },
          h('button', { class: 'btn btn-sm btn-ghost', onclick: () => this.run(() => this.store.dispatch({ type: 'setContext', patch: { loaded: false } })) }, tr('Yashirish'))));
      // yangilash — holat qatori ostida, koʻrinib turadi
      body.append(h('div', { class: 'row' }, h('button', { class: 'btn btn-sm', onclick: () => void this.ensureContext(true) }, tr('OSM dan yangilash'))));
    }
    { const U = doc.userLayers ?? [];
      more.append(h('div', { class: 'glabel' }, h('span', {}, tr('Oʻz maʼlumotlarim')), h('span', {}, U.length ? tf('${n} ta qatlam', { n: U.length }) : '')),
        h('button', { class: 'btn btn-sm', id: 'ulOpen', onclick: () => { const b = this.root.querySelector<HTMLElement>('#layPop'); if (this.pop?.dataset.for !== 'layPop') b?.click(); if (!U.length) this.ul.pick(); } }, tr(U.length ? 'Qatlamlarni boshqarish' : 'Fayldan qatlam qoʻshish (GeoJSON)')),
        h('span', { class: 't-small' }, tr('OSM da binolar boʻlmasa — oʻzingiznikini qoʻying: Archicad yoki QGIS dan binolar, aholi punkti va mahalla chegaralari, yer uchastkalari. Ular atrof radiusiga bogʻliq emas — butun hudud koʻrinadi.'))); }
    more.append(this.districtField());
    const rmN = doc.removed?.length ?? 0;
    more.append(h('div', { id: 'rmSt', class: 'col' },
      rmN ? h('div', { class: 'group' }, h('div', { class: 'li' }, h('span', { class: 'k' }, tr('Olib tashlangan atrof binolari')), h('span', { class: 'v' }, `${rmN} ta`), h('button', { class: 'btn btn-sm', id: 'rmBack', onclick: () => this.restoreRemoved() }, tr('Qaytarish')))) : '',
      h('details', { class: 'how' }, h('summary', {}, svgIcon(IC.info), tr('Atrofdagi binoni qanday olib tashlayman')), h('div', {}, tr('Atrofdagi binoni bosing (Shift — bir nechtasini, Shift + sudrash — ramka bilan) va Delete ni bosing — sahnadan olib tashlanadi. Oʻng tugma — menyu.')))));
    body.append(more);
  }

  /* ---------- 3-bosqich: quyosh, soyalar, insolyatsiya ---------- */
  private sunDate = '03-22';
  private insolRule: Result | null = null;
  private sunTime = 14;
  private insol: { busy: boolean; stats: { mean: number; ge2: number; ge3: number; bins: number[]; n: number; date: string } | null } = { busy: false, stats: null };
  private sunW: Worker | null = null;

  private applySun(): void {
    const [m, d] = this.sunDate.split('-').map(Number), o = this.store.doc.origin;
    const p = sunPosition(localToUtcAt(2026, m, d, this.sunTime, o[1], o[0]), o[1], o[0]);
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
    if (!await useHeavy('sun')) return;   // haftalik bepul yoki tanga
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
      source: { doc: 'SanQvaN 0102-25', edition: '2025', clause: '95-band (22.03–22.09: uy atrofidagi hududda kamida 0,5 — 1 soat uzluksiz)', verified: true },
      ...(!inPeriod ? { status: 'na' as const, note: 'Davr chegarasi — 22 mart yoki 22 sentabr sanasini tanlab hisoblang (eng qisqa kun).' }
        : { status: (ge1 === n ? 'pass' : ge05 === n ? 'review' : 'fail') as Result['status'], value: ge1 / n * 100, unit: '% ≥ 1 soat', limit: '100',
            note: `${fmt(ge05 / n * 100, 0)} % nuqta ≥ 0,5 soat, ${fmt(ge1 / n * 100, 0)} % — ≥ 1 soat (uchastka yer sathi, binolar dogʻidan tashqari). Xonalar uchun 2 soat uzluksiz (95-band) — «Kvartiralar» qadamida (deraza nuqtalari boʻyicha).` }),
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
  /** 34-band: uzoq joyda ERA5 (server orqali) — joy kaliti, natija, yuklanmoqda */
  private era: { key: string; v: WindAt | null; busy: boolean; t?: number } | null = null;
  /** Hisob uchun shamol stansiyasi: yaqin EPW yoki ERA5 (tayyor boʻlsa) */
  private windNow(): { st: Station; km: number; src: 'epw' | 'era5' } | null {
    if (!this.climate) return null;
    const o = this.store.doc.origin, n = nearestStation(this.climate, o[0], o[1]);
    if (n.km <= WIND_MAX_KM) return { st: n.s, km: n.km, src: 'epw' };
    const e = this.era; return e && e.key === `${o[0].toFixed(4)},${o[1].toFixed(4)}` && e.v?.kind === 'ok' ? { st: e.v.s, km: e.v.km, src: 'era5' } : null;
  }
  private loadEra(): void {
    const o = this.store.doc.origin, key = `${o[0].toFixed(4)},${o[1].toFixed(4)}`;
    if (!this.climate || (this.era && this.era.key === key && (this.era.busy || this.era.v?.kind !== 'pending' || Date.now() < (this.era.t ?? 0)))) return;
    this.era = { key, v: this.era?.key === key ? this.era.v : null, busy: true };
    void windAt(this.climate, o[0], o[1]).then(v => {
      if (this.era?.key !== key) return;
      this.era = { key, v, busy: false, t: Date.now() + 20_000 };
      if (v.kind === 'pending') setTimeout(() => { if (this.era?.key === key && this.step.id === 'quyosh') { this.loadEra(); } }, 20_500);
      this.renderPanel();
    });
  }

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
    track('mr/calc/wind');
    const doc = this.store.doc, st = this.windNow()?.st; if (!doc.site || !st) return;
    if (!await useHeavy('wind')) return;   // haftalik sinov yoki tanga
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
    if (!this.climate) { void this.loadClimate(); body.append(h('span', { class: 't-small' }, tr('Iqlim maʼlumoti yuklanmoqda…'))); return; }
    const doc = this.store.doc, now = this.windNow();
    if (!now) {
      // yaqin stansiya yoʻq — ERA5 (server orqali)
      this.loadEra();
      const n = nearestStation(this.climate, doc.origin[0], doc.origin[1]), e = this.era?.v;
      body.append(h('div', { class: 'col', id: 'windBox' }, h('div', { class: 'glabel' }, h('span', {}, tr('Shamol')), h('span', {}, 'ERA5')),
        !e || this.era?.busy ? h('div', { class: 'note', id: 'windEra' }, tr('Global shamol maʼlumoti (ERA5) yuklanmoqda…'))
          : e.kind === 'pending' ? h('div', { class: 'note', id: 'windEra' }, tr('ERA5 maʼlumoti tayyorlanmoqda (Copernicus navbati) — bir necha daqiqada oʻzi yangilanadi.'))
            : h('div', { class: 'note warn', id: 'windFar' }, tf('Eng yaqin iqlim stansiyasi (${n}) ${k} km uzoqda — bu hudud uchun shamol maʼlumoti ishonchli emas.', { n: n.s.name.replace(/\./g, ' '), k: fmt(n.km, 0) }), ' ', tr('Global shamol maʼlumoti (ERA5) hozir olinmadi.'))));
      return;
    }
    const { st, km, src } = now, pv = prevailing(st);
    const dir = this.windDir ?? pv.deg;
    const sel = select({ id: 'windDir', 'aria-label': tr('Hisob yoʻnalishi (qayerdan esadi)'), onchange: v => { this.windDir = Number(v); this.renderPanel(); } },
      Array.from({ length: 16 }, (_, k) => ({ value: String(k * 22.5), label: `${rumbName(k)} (${k * 22.5}°) · ${fmt(st.rose[k].reduce((a, b) => a + b, 0) * 100, 0)} %${k === pv.k ? ' — ' + tr('ustun') : ''}`, selected: Math.abs(k * 22.5 - dir) < 1 })));
    body.append(h('div', { class: 'col', id: 'windBox' },
      h('div', { class: 'glabel' }, h('span', {}, tr('Shamol')), h('span', { id: 'windStn' }, `${src === 'era5' ? st.name : st.name.replace(/\./g, ' ')} · ${fmt(km, 0)} km`)),
      h('div', { class: 'group flat', style: 'padding:10px 12px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px' },
        h('div', { class: 'kpi' }, h('b', {}, `${fmt(st.mean, 1)} m/s`), h('span', {}, `${tr('oʻrtacha')} · ${tr('shtil')} ${fmt(st.calm * 100, 0)} %`)),
        h('div', { class: 'kpi' }, h('b', {}, `${rumbName(pv.k)}`), h('span', {}, `${tr('ustun yoʻnalish')} · ${fmt(pv.share * 100, 0)} %`)),
        h('div', { class: 'kpi' }, h('b', {}, `${fmt(st.p95, 1)} m/s`), h('span', {}, tr('5 % vaqt oshadi')))),
      this.windRose(st),
      h('span', { class: 't-small', id: 'windSrc' }, tr(windSrcLine(src)), ` ${src === 'era5' ? ERA5_ATTR : TMYX_ATTR}.`),
      h('div', { class: 'field' }, h('label', {}, tr('Hisob yoʻnalishi (qayerdan esadi)')), sel),
      h('button', { class: 'btn btn-block', id: 'windGo', disabled: this.wind.busy, onclick: () => void this.runWind() }, tr(this.wind.busy ? 'Hisoblanmoqda… (5–15 s)' : 'Shamol oqimi (piyoda sathi)'), this.wind.busy ? '' : this.ptag('wind'))));
    const w = this.wind.stats;
    if (w) {
      body.append(h('div', { class: 'seg sm', role: 'group' }, ...([['lawson', 'Qulaylik (Lawson)'], ['ratio', 'Tezlik nisbati']] as const).map(([k, t]) => h('button', { 'aria-pressed': this.wind.mode === k, onclick: () => { this.wind.mode = k; this.showWind(); this.renderPanel(); } }, tr(t)))),
        h('div', { class: 'col', id: 'windSt' }, h('b', { style: 'font-size:12.5px' }, tf('${rumbName(Math.round(w.dir / 22.5) % 16)} shamoli: uchastkaning ${fmt(w.amp * 100, 0)} % ida tezlik 1,2× dan oshadi', { 'rumbName(Math.round(w.dir / 22.5) % 16)': rumbName(Math.round(w.dir / 22.5) % 16), 'fmt(w.amp * 100, 0)': fmt(w.amp * 100, 0) })), h('span', { class: 't-small' }, tf('Piyoda sathi (1,5 m) 5 % tezligi ochiq joyda ≈ ${fmt(w.p95, 1)} m/s', { 'fmt(w.p95, 1)': fmt(w.p95, 1) }))),
        this.wind.mode === 'lawson'
          ? h('div', { class: 'leg' }, ...LAWSON.map(([, c, t], i) => h('div', {}, h('i', { style: `background:#${c.toString(16).padStart(6, '0')}` }), h('span', {}, tr(t)), h('b', {}, `${fmt(w.cls[i] * 100, 0)} %`))))
          : h('div', { class: 'leg' }, ...[['< 0,4 pana', 0x2b3a67], ['0,7–0,9', 0x7fb3c8], ['0,9–1,1 ochiq joydek', 0xe8e4c9], ['1,3–1,5', 0xf29a4a], ['> 1,5 tezlashish', 0xd9534f]].map(([t, c]) => h('div', {}, h('i', { style: `background:#${(c as number).toString(16).padStart(6, '0')}` }), h('span', {}, tr(String(t)))))),
        h('button', { class: 'btn btn-sm btn-ghost', onclick: () => { this.wind.stats = null; this.scene.setGroundMap(null); this.renderPanel(); } }, tr('Xaritani yashirish')));
    }
  }

  /* ===== 7-qadam: Quyosh va shamol (MR-Q2) ===== */
  private quyoshPanel(body: HTMLElement): void {
    const DATES: [string, string, string][] = [['03-22', '22 mart', '22 mar'], ['04-22', '22 aprel', '22 apr'], ['06-22', '22 iyun', '22 iyn'], ['09-22', '22 sentabr', '22 sen'], ['12-22', '22 dekabr', '22 dek']];
    body.append(
      h('div', { class: 'glabel' }, h('span', {}, tr('Sana'))),
      h('div', { class: 'seg sm', role: 'group', 'aria-label': tr('Sana') }, ...DATES.map(([k, t, s]) => h('button', { 'aria-pressed': this.sunDate === k, 'data-date': k, title: tr(t), onclick: () => { this.sunDate = k; this.applySun(); this.renderPanel(); } }, tr(s)))),
      h('div', { class: 'group flat', style: 'padding:10px 12px;display:flex;flex-direction:column;gap:6px' },
        h('span', { class: 'num', id: 'sunInfo', style: 'font-size:13px;font-weight:600' }),
        range({ min: 5, max: 20, step: 0.25, value: this.sunTime, id: 'sunTime', 'aria-label': tf('Vaqt (${p})', { p: placeLabel(placeOf(this.store.doc.origin[0], this.store.doc.origin[1]), getLang()) }), oninput: v => { this.sunTime = v; this.applySun(); } }),
        h('div', { class: 'row t-small' }, h('span', {}, '05:00'), h('span', { class: 'grow', style: 'text-align:center' }, tf('Vaqt (${p})', { p: placeLabel(placeOf(this.store.doc.origin[0], this.store.doc.origin[1]), getLang()) })), h('span', {}, '20:00'))),
      h('button', { class: 'btn btn-primary btn-block', id: 'insolGo', disabled: this.insol.busy, onclick: () => void this.runInsolation() }, tr(this.insol.busy ? 'Hisoblanmoqda…' : 'Insolyatsiya xaritasi (uchastka)'), this.insol.busy ? '' : this.ptag('sun')));
    const st = this.insol.stats;
    if (st) {
      const dt = DATES.find(x => x[0] === st.date)?.[1] ?? st.date;
      body.append(h('div', { class: 'col', id: 'insolSt' },
        h('b', { style: 'font-size:12.5px' }, `${tr(dt)}: ${tr('oʻrtacha')} ${fmt(st.mean, 1)} ${tr('soat quyosh')}`),
        h('span', { class: 't-small' }, `≥ 2 ${tr('soat')} — ${tr('uchastkaning')} ${fmt(st.ge2 * 100, 0)} %, ≥ 3 ${tr('soat')} — ${fmt(st.ge3 * 100, 0)} % (${fmt(st.n)} ${tr('nuqta, yer sathida')})`)),
        h('div', { class: 'leg' }, ...INSOL_BINS.map(([, c, t], i) => h('div', {}, h('i', { style: `background:#${c.toString(16).padStart(6, '0')}` }), h('span', {}, tr(t)), h('b', {}, `${fmt(st.bins[i] * 100, 0)} %`)))),
        h('button', { class: 'btn btn-sm btn-ghost', onclick: () => { this.insol.stats = null; this.scene.setInsolation(null); this.renderPanel(); } }, tr('Xaritani yashirish')));
    }
    body.append(h('span', { class: 'norm' }, svgIcon(IC.book), 'SanQvaN 0102-25 · 95-band'));
    this.windSection(body);
    body.append(h('details', { class: 'how' }, h('summary', {}, svgIcon(IC.info), tr('Usul va cheklovlar')), h('div', { class: 'col' },
      h('span', {}, tr('Hisob: 15 daqiqalik qadamlar, quyosh balandligi > 3°, loyiha binolari + saqlanadigan va atrofdagi (300 m) mavjud binolar. Meʼyor: SanQvaN 0102-25, 95-band — 22 mart – 22 sentabr davrida xonada 2 soat, uy atrofidagi hududda kamida 0,5 — 1 soat uzluksiz quyosh. Hudud natijasi reyestrga qoʻshiladi; xonalar (derazalar) — «Kvartiralar» qadamida.')),
      h('span', {}, tr('Usul: 2D Lattice Boltzmann, piyoda sathida, bitta yoʻnalish. Bino ustidan oqish, turbulentlik va daraxtlar hisobga olinmaydi — dastlabki loyiha uchun sifat bahosi (tunnel, pana, burchak zonalari). Qulaylik mezoni — Lawson (LDDC), xalqaro amaliyot; Oʻzbekiston meʼyori emas.')))));
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
    const apply = (patch: Omit<Extract<Command, { type: 'styleBuildings' }>, 'type' | 'ids'>) => { const l = ids(); if (!l.length) { toast(tr('Binolar yoʻq')); return; } this.run(() => this.store.dispatch({ type: 'styleBuildings', ids: l, ...patch })); };
    // joriy qiymat: hammasida bir xil boʻlsa — oʻsha, aks holda «aralash» (null); koʻrinish uchun — eng koʻp uchragani
    const pick = <T,>(f: (b: Project['buildings'][number]) => T): { v: T | null; top: T | null } => {
      const m = new Map<T, number>(); list.forEach(b => { const v = f(b); m.set(v, (m.get(v) ?? 0) + 1); });
      const top = [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null; return { v: m.size === 1 ? top : null, top };
    };
    const mat = pick(b => b.mat ?? 'suvoq'), win = pick(b => b.win ?? 'yoq'), bal = pick(b => b.bal ?? 'yoq'), shape = pick(b => roofShape(b.roof)), cover = pick(b => roofCover(b.roof)), par = pick(b => b.parapet ?? 0), shd = pick(b => b.shade ?? 'yoq'), wpat = pick(b => b.winPat ?? 'qator'), bpat = pick(b => b.balPat ?? 'har2');
    const any = list.length > 0;
    // jonli fasad koʻrinishi
    body.append(h('div', { class: 'fpv', id: 'facPreview', role: 'img', 'aria-label': tr('Fasad koʻrinishi'), html: facadePreview({ mat: (mat.top ?? 'suvoq') as Mat, win: (win.top ?? 'yoq') as Win | 'yoq', bal: (bal.top ?? 'yoq') as Bal, shape: shape.top ?? 'tekis', cover: cover.top ?? 'oddiy', parapet: par.top ?? 0, shade: (shd.top ?? 'yoq') as Shade | 'yoq' }) }));
    // qaysi binolarga
    const useSel = select({ id: 'lookUse', 'aria-label': tr('Funksiya'), onchange: v => { this.lookUse = v; this.renderPanel(); } }, uses.map(u => ({ value: u, label: useDef(u).name, selected: u === this.lookUse })));
    body.append(h('div', { class: 'group flat', style: 'padding:8px;display:flex;flex-direction:column;gap:8px' },
      h('div', { class: 'seg', role: 'group', id: 'lookSeg', 'aria-label': tr('Qaysi binolarga') },
        h('button', { 'data-look': 'sel', 'aria-pressed': this.lookTarget === 'sel', disabled: !sel, title: sel ? '' : tr('Sahnada binoni bosing'), onclick: () => { this.lookTarget = 'sel'; this.renderPanel(); } }, tr('Tanlangan')),
        h('button', { 'data-look': 'use', 'aria-pressed': this.lookTarget === 'use', onclick: () => { this.lookTarget = 'use'; this.renderPanel(); } }, tr('Funksiya')),
        h('button', { 'data-look': 'all', 'aria-pressed': this.lookTarget === 'all', onclick: () => { this.lookTarget = 'all'; this.renderPanel(); } }, tr('Hammasi'))),
      this.lookTarget === 'use' ? useSel : '',
      any ? h('span', { class: 't-small' }, `${list.length} ${tr('ta bino')}${this.lookTarget === 'sel' && sel ? ` · ${useDef(sel.use).name}` : ''}`) : ''));
    if (!any) body.append(h('div', { class: 'empty' }, h('span', {}, tf('Binolar yoʻq — ${n}-qadamda hajmlarni yarating', { n: HAJM().n })), h('button', { class: 'btn btn-sm', onclick: () => this.go(HAJM()) }, `${HAJM().n} · ${tr('Hajmlar')}`)));
    // roʻyxat: har qator — joriy qiymat, bosilsa variant plitkalari ochiladi
    type Opt = { key: string; val: string; n: string; on: boolean; g: string; gk: string | number; html?: string; dis?: boolean; set: () => void };
    const mk = (o: Opt) => h('button', { class: 'tile', [`data-${o.key}`]: o.val, 'aria-pressed': o.on, disabled: !!o.dis || !any, title: o.n, onclick: o.set, html: (o.html ?? pg(o.g, o.gk)) + `<span>${o.n}</span>` });
    const nm = <T,>(arr: { id?: T; v?: T; n: string }[], v: T | null) => v == null ? tr('aralash') : tr(arr.find(x => (x.id ?? x.v) === v)?.n ?? '—');
    const flatOnly = shape.v != null ? shape.v !== 'tekis' : list.some(b => roofShape(b.roof) !== 'tekis');
    const rows: { id: string; k: string; v: string; ic: string; opts: Opt[]; note?: string; cols: number }[] = [
      { id: 'mat', k: 'Material', v: mat.v ? MATS.find(m => m.id === mat.v)!.name : tr('aralash'), ic: pg('mat', mat.top ?? 'suvoq', 28), cols: 4,
        opts: MATS.map(m => ({ key: 'mat', val: m.id, n: m.name, on: mat.v === m.id, g: 'mat', gk: m.id, set: () => apply({ mat: m.id }) })) },
      { id: 'win', k: 'Derazalar', v: nm(WIN_OPTS, win.v), ic: pg('win', win.top ?? 'yoq', 28), cols: 4,
        opts: WIN_OPTS.map(w => ({ key: 'win', val: w.id, n: tr(w.n), on: win.v === w.id, g: 'win', gk: w.id, set: () => apply({ win: w.id }) })) },
      { id: 'wpat', k: 'Derazalar joylashuvi', v: nm(WINPAT_OPTS, wpat.v), ic: pg('wpat', wpat.top ?? 'qator', 28), cols: 3,
        note: 'Parametrik: shaxmat, juft, ritm, tasodifiy (bino boʻyicha barqaror), gradient. Tanlansa — batafsil 3D fasad shu binolarda yoqiladi.',
        opts: WINPAT_OPTS.map(x => ({ key: 'wpat', val: x.id, n: tr(x.n), on: wpat.v === x.id, g: 'wpat', gk: x.id, set: () => apply({ winPat: x.id }) })) },
      { id: 'bal', k: 'Balkonlar', v: nm(BAL_OPTS, bal.v), ic: pg('bal', bal.top ?? 'yoq', 28), cols: 3,
        opts: BAL_OPTS.map(x => ({ key: 'bal', val: x.id, n: tr(x.n), on: bal.v === x.id, g: 'bal', gk: x.id, set: () => apply({ bal: x.id }) })) },
      { id: 'bpat', k: 'Balkonlar joylashuvi', v: nm(BALPAT_OPTS, bpat.v), ic: pg('bpat', bpat.top ?? 'har2', 28), cols: 3,
        note: bal.top === 'yoq' ? 'Avval balkon turini tanlang.' : undefined,
        opts: BALPAT_OPTS.map(x => ({ key: 'bpat', val: x.id, n: tr(x.n), on: bpat.v === x.id, g: 'bpat', gk: x.id, dis: bal.top === 'yoq', set: () => apply({ balPat: x.id }) })) },
      { id: 'roof', k: 'Tom shakli', v: nm(SHAPE_OPTS, shape.v), ic: pg('roof', shape.top ?? 'tekis', 28), cols: 4,
        opts: SHAPE_OPTS.map(x => ({ key: 'roof', val: x.id, n: tr(x.n), on: shape.v === x.id, g: 'roof', gk: x.id, set: () => apply({ roof: roofOf(x.id, x.id === 'tekis' ? (cover.v ?? 'oddiy') : 'oddiy') }) })) },
      { id: 'cover', k: 'Tom qoplamasi', v: flatOnly && shape.v != null ? '—' : nm(COVER_OPTS, cover.v), ic: pg('cover', cover.top ?? 'oddiy', 28), cols: 3,
        note: flatOnly ? 'Yashil tom va quyosh paneli tekis tomga qoʻyiladi — tanlansa tom tekis boʻladi.' : undefined,
        opts: COVER_OPTS.map(x => ({ key: 'cover', val: x.id, n: tr(x.n), on: cover.v === x.id && !flatOnly, g: 'cover', gk: x.id, set: () => apply({ roof: roofOf('tekis', x.id) }) })) },
      { id: 'par', k: 'Parapet', v: nm(PARAPET_OPTS, par.v), ic: pg('par', par.top ?? 0, 28), cols: 4,
        opts: PARAPET_OPTS.map(x => ({ key: 'par', val: String(x.v), n: tr(x.n), on: par.v === x.v, g: 'par', gk: x.v, set: () => apply({ parapet: x.v }) })) },
      { id: 'shade', k: 'Quyosh himoyasi', v: nm(SHADE_OPTS, shd.v), ic: pg('shade', shd.top ?? 'yoq', 28), cols: 3,
        note: 'SanQvaN 0102-25, 16-band: yashash xonalari derazalari 90–290° ga qaratilmasligi lozim — qaragan boʻlsa himoya. Avtomatik — janubda naves, sharq va gʻarbda lamellar.',
        opts: SHADE_OPTS.map(x => ({ key: 'shade', val: x.id, n: tr(x.n), on: shd.v === x.id, g: 'shade', gk: x.id, set: () => apply({ shade: x.id }) })) },
    ];
    body.append(h('div', { class: 'group', id: 'looks' }, ...rows.flatMap(r => {
      const open = this.facOpen === r.id;
      const head = h('button', { class: 'li frow', 'data-row': r.id, 'aria-expanded': open, onclick: () => { this.facOpen = open ? null : r.id; this.renderPanel(); } },
        h('span', { class: 'fic', html: r.ic }), h('span', { class: 'k' }, tr(r.k)), h('span', { class: 'v' }, r.v), svgIcon(open ? '<path d="M6 15l6-6 6 6"/>' : '<path d="M6 9l6 6 6-6"/>'));
      head.lastElementChild?.setAttribute('class', 'chev');
      return [head, open ? h('div', { class: 'frowin', id: `strip-${r.id}` }, h('div', { class: r.cols === 4 ? 'tiles c4' : 'tiles' }, ...r.opts.map(mk)), r.note ? h('span', { class: 't-small' }, tr(r.note)) : '') : ''];
    })));
    // tekshiruv — oxirida bitta guruhda, har birida band
    const ws = win.top && win.top !== 'yoq' ? winDef(win.top as Win) : null;
    const dep = h('input', { type: 'number', class: 'input', min: 3, max: 9, step: 0.1, value: this.roomDepth, id: 'roomDepth', 'aria-label': tr('Xona chuqurligi, m'), style: 'width:76px' }) as HTMLInputElement;
    dep.onchange = () => { const v = Number(dep.value); if (v >= 3 && v <= 9) { this.roomDepth = v; this.renderPanel(); } };
    const chk: HTMLElement[] = [];
    const ch = (st: 'ok' | 'warn' | 'bad' | 'na', v: string) => h('span', { class: `chip ${st}`, 'data-s': st === 'ok' ? 'pass' : st === 'na' ? 'na' : st === 'warn' ? 'review' : 'fail' }, h('i'), v);
    const row = (t: string, s: string, st: 'ok' | 'warn' | 'bad' | 'na', v: string, extra?: HTMLElement) => chk.push(h('div', { class: 'li' }, h('span', { class: 'k' }, t, h('span', { class: 'sub' }, s)), extra ?? '', ch(st, v)));
    if (ws) {
      const k = MOD_W * this.roomDepth / (ws.w * MOD_W * (ws.head - ws.sill)), okK = k <= 10 + 1e-6;   /* 93-band: tirqish maydoni / pol maydoni 1:10 gacha */
      row(`${tr('Yorugʻlik koeffitsiyenti')} 1:${fmt(k, 1)}`, `${tr(ws.name)}: ${tr('deraza')} ${fmt(ws.w * MOD_W, 1)} × ${fmt(ws.head - ws.sill, 2)} m · ${tr('meʼyor')} 1:10 gacha · 93-band`, okK ? 'ok' : 'bad', tr(okK ? 'mos' : 'mos emas'));
    }
    const okD = this.roomDepth <= 6 + 1e-6 && this.roomDepth <= 2 * MOD_W + 1e-6;
    row(tr('Xona chuqurligi'), `≤ 6 m va ≤ 2 × eni · SanQvaN 0102-25, 97-band`, okD ? 'ok' : 'bad', tr(okD ? 'mos' : 'mos emas'), h('span', { class: 'unit', style: 'width:76px' }, dep, h('span', {}, 'm')));
    const plans = planApartments(doc);
    if (plans.length) {
      let n = 0, hot = 0, west = 0;
      plans.forEach(pl => { const used = new Set(pl.layout.apts.flatMap(a => a.mods)); pl.layout.mods.forEach((m, i) => { if (!used.has(i)) return; n++; if (m.az >= 90 && m.az <= 290) hot++; if (isWest(m.az)) west++; }); });
      const shaded = doc.buildings.some(b => b.shade);
      row(tr('Quyoshdan himoya kerak'), `${fmt(hot / n * 100, 0)} % ${tr('deraza 90–290° ga qaragan')} · 16-band`, hot === 0 || shaded ? 'ok' : 'warn', hot === 0 ? tr('kerak emas') : shaded ? tr('bor') : `${fmt(hot / n * 100, 0)} %`);
      row(tr('Gʻarbga qaragan derazalar'), `${fmt(west / n * 100, 0)} % · ${tr('yashash xonasi qoʻyilmaydi')} · 15-band · ${fmt(n)} ${tr('modul bir qavatda')}`, west === 0 ? 'ok' : 'warn', `${fmt(west / n * 100, 0)} %`);
    }
    const solar = doc.buildings.filter(b => b.roof === 'quyosh').reduce((t, b) => t + area(b.footprint.map(fr.toLocal)), 0), pv = pvEstimate(solar);
    const green = doc.buildings.filter(b => b.roof === 'yashil').reduce((t, b) => t + area(b.footprint.map(fr.toLocal)), 0);
    const flatFallback = doc.buildings.filter(b => (b.roof === 'ikki' || b.roof === 'tort' || b.roof === 'bir') && !roofParts(b.footprint.map(fr.toLocal), b.roof)).length;
    const roofSt: HTMLElement[] = [];
    if (solar > 0) roofSt.push(h('div', { class: 'li' }, h('span', { class: 'k' }, tr('Quyosh panellari'), h('span', { class: 'sub' }, `${tr('taxmin')}: ${tr('tomning')} ${PV.cover * 100} %, ${PV.kwpPerM2} kWp/m², ~${PV.yield} kWh/kWp`)), ch('ok', `${fmt(pv.kwp)} kWp · ~${fmt(pv.mwh)} MWh/yil`)));
    if (green > 0) roofSt.push(h('div', { class: 'li' }, h('span', { class: 'k' }, tr('Yashil tomlar'), h('span', { class: 'sub' }, tr('yashil maydon hisobiga alohida koʻrsatiladi'))), ch('ok', `${fmt(green)} m²`)));
    if (flatFallback > 0) roofSt.push(h('div', { class: 'li' }, h('span', { class: 'k' }, tr('Qiya tom qurilmadi'), h('span', { class: 'sub' }, `${flatFallback} ${tr('ta murakkab shakldagi seksiyada — tekis koʻrsatiladi')}`)), ch('warn', String(flatFallback))));
    body.append(h('div', { class: 'glabel' }, h('span', {}, tr('Tekshiruv'))), h('div', { class: 'group', id: 'facCheck' }, ...chk, roofSt.length ? h('div', { id: 'roofSt', style: 'display:contents' }, ...roofSt) : ''),
      h('details', { class: 'how' }, h('summary', {}, svgIcon(IC.info), tr('Fasad koʻrinishi haqida')), h('div', {}, tr('Fasad koʻrinishi taxminiy: bitta qavat — bitta modul qatori, pastki noturar qavatlar — vitrina. Meʼyor: SanQvaN 0102-25, 93, 97, 15, 16-bandlar.'))));
  }

  private aptMode: 'insol' | 'west' = 'insol';
  /** 3D da kvartiralar: yoʻq / turi boʻyicha / insolyatsiya boʻyicha */
  private apt3d: 'yoq' | 'tur' | 'insol' = 'tur';
  private aptFloor: number | null = null;
  /** qavat rejasi: tanlangan bino va qavat */
  private planBid: string | null = null;
  /** past qavatli uy rejalari: tur, qavat, uslub (31.10) */
  private houseType = 0; private houseFloor = 1; private houseStyle: 'milliy' | 'zamonaviy' | null = null;
  private planFloor: number | null = null;
  private planSelSeen: string | null = null;
  static readonly APT_COL: Record<number, number> = { 1: 0xf2b134, 2: 0xf08a4b, 3: 0x4fb08a, 4: 0x3f5b8a };
  /** kvartira «terisi» 3D da (turi yoki insolyatsiya natijasi boʻyicha) */
  private showAptBoxes(): void {
    if (this.step.id !== 'kvartira' || this.apt3d === 'yoq') { this.scene.setAptBoxes(null); this.scene.setAptVols(null); this.scene.setAptView(null); return; }
    const doc = this.store.doc, plans = planApartments(doc), fh = doc.settings.floorHeight, st = this.apt.stats, A = this.apt;
    const idx = new Map<string, number>(); if (st) A.pts.forEach((q, i) => idx.set(`${q.sec}|${q.f}|${q.m}`, i));
    const list: { a: XY; b: XY; y0: number; y1: number; color: number; depth: number }[] = [], caps: { ring: XY[]; y: number; color: number }[] = [];
    const vols: Parameters<Scene3D['setAptVols']>[0] & object = [], view = new Map<string, { f0: number; f1: number }>();
    const lite = (c: number, k: number) => { const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255, f = (x: number) => Math.round(x + (255 - x) * k); return (f(r) << 16) | (f(g) << 8) | f(b); };
    plans.forEach((pl, sec) => {
      const base = Math.min(...pl.ring.map(q => this.scene.H(q[0], q[1]))), P = pl.layout.plan;
      // 11-band: reja boʻlsa — bino oʻrnida kvartira hajmlari (xonalar rangda), aks holda — fasad «terisi»
      if (P) { const v = view.get(pl.bid); view.set(pl.bid, v ? { f0: Math.min(v.f0, pl.f0), f1: Math.max(v.f1, pl.f1) } : { f0: pl.f0, f1: pl.f1 }); }
      const ins = P ? P.apts.map(ra => insetRobust(ra.ring, 0.06) ?? ra.ring) : [];
      const core = P ? [...P.mop, ...P.stairs, ...P.lifts] : [];
      for (let f = pl.f0; f < pl.f1; f++) {
        const y = base + (pl.z0 + f) * fh;
        if (P) for (const r of core) vols.push({ bid: pl.bid, ring: r, y0: y + 0.12, y1: y + fh - 0.12, color: 0xd6d2ca });
        pl.layout.apts.forEach((a, ai) => {
          let color = Editor.APT_COL[Math.min(4, a.rooms)] ?? 0x888888;
          if (this.apt3d === 'insol') {
            if (!st) color = 0xcfcac1;
            else { const ok = a.living.map(m => st.cls[idx.get(`${sec}|${f}|${m}`) ?? -1] ?? 2); const good = ok.filter(c => c === 0 || c === 1).length; color = good >= Math.min(a.living.length, a.rooms >= 4 ? 2 : 1) ? (ok.every(c => c === 0) ? 0x3fa66b : 0xb7cf4f) : 0xd9534f; }
          }
          const ra = P?.apts[ai];
          if (ra) {
            const R = aptRooms(ra);
            vols.push({ bid: pl.bid, ring: ins[ai], y0: y + 0.12, y1: y + fh - 0.12, color,
              rooms: [...R.rooms.map((q, k) => ({ ring: q, color: lite(color, [0.22, 0.42, 0.6][k % 3]) })), ...R.wet.map(q => ({ ring: q, color: 0xa9bfcf }))] });
            return;
          }
          const ring = pl.layout.plan?.apts[ai]?.ring;
          if (ring) { for (const [p, q] of facadeSegs(ring, pl.ring)) list.push({ a: p, b: q, y0: y + 0.06, y1: y + fh - 0.06, color, depth: 0.25 }); caps.push({ ring, y: y + 0.08, color }); }
          else for (const m of a.mods) { const md = pl.layout.mods[m]; list.push({ a: md.a, b: md.b, y0: y + 0.06, y1: y + fh - 0.06, color, depth: pl.halfDepth }); }
        });
      }
    });
    this.scene.setAptView(view.size ? view : null);
    this.scene.setAptVols(vols);
    this.scene.setAptBoxes(list, caps);
  }
  private aptDate = '03-22';
  private apt: { busy: boolean; stats: AptStats | null; plans: SecPlan[]; pts: { sec: number; f: number; m: number }[]; ms?: number; buildings?: unknown; run?: Float32Array; date?: string; prisms?: Prism[]; base?: number[] } = { busy: false, stats: null, plans: [], pts: [] };
  private aptRules: Result[] = [];

  /** V5: qavat albomi uchun derazalar insolyatsiyasi — bino, qavat (1 dan), modul → uzluksiz soat; hisob eskirgan boʻlsa null */
  private aptInsolView(): InsolView | null {
    const A = this.apt; if (!A.stats || !A.run || A.buildings !== this.store.doc.buildings) return null;
    const idx = new Map<string, number>(); A.pts.forEach((q, i) => idx.set(`${A.plans[q.sec].bid}|${q.f}|${q.m}`, i));
    const run = A.run, doc = this.store.doc, fh = doc.settings.floorHeight, [mo, dd] = (A.date ?? this.aptDate).split('-').map(Number);
    return {
      date: A.date ?? this.aptDate, at: (bid, floor, m) => { const i = idx.get(`${bid}|${floor - 1}|${m}`); return i == null ? null : run[i]; },
      // V5 real dogʻ: tanlangan soatda quyosh holati va derazaga tushishi (atrof binolari soyasi bilan)
      sun: hour => { const s = sunPosition(localToUtcAt(2026, mo, dd, hour, doc.origin[1], doc.origin[0]), doc.origin[1], doc.origin[0]); return s.alt > 3 ? s : null; },
      lit: (bid, floor, ms, st) => {
        const si = A.plans.findIndex(p => p.bid === bid), pl = A.plans[si]; if (!pl || !A.prisms || !A.base) return ms.map(() => false);
        const P = ms.map(m => pl.layout.mods[m].p), Z = ms.map(() => A.base![si] + (pl.z0 + floor - 1) * fh + 1.2), AZ = ms.map(m => pl.layout.mods[m].az);
        const r = windowSun(P, Z, AZ, A.prisms, [{ alt: st.alt, az: st.az, dt: 1 }]);
        return ms.map((_, i) => r.total[i] > 0);
      },
    };
  }
  private clearApt(): void { this.apt = { busy: false, stats: null, plans: [], pts: [] }; this.aptRules = []; this.scene.setFacadeMarks(null); }

  private async runApts(): Promise<void> {
    track('mr/calc/flats');
    const doc = this.store.doc, fh = doc.settings.floorHeight;
    const plans = planApartments(doc); if (!plans.length) { toast('Turar joy seksiyalari yoʻq'); return; }
    if (!await useHeavy('flats')) return;   // haftalik sinov yoki tanga
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
    const norm = { need: 2.0 }, stats = evaluateApts(plans, pts, res.run, res.total, norm);
    this.apt = { busy: false, stats, plans, pts, ms: performance.now() - t0, buildings: doc.buildings, run: res.run, date: this.aptDate, prisms, base };
    const pct = (a: number) => stats.apts ? a / stats.apts * 100 : 0;
    const src = { doc: 'SanQvaN 0102-25', edition: '2025', verified: true };
    this.aptRules = [
      { id: 'insol-apartments', title: 'Kvartiralar insolyatsiyasi (derazalar)', source: { ...src, clause: '94, 95-bandlar' },
        status: stats.insolOk === stats.apts ? 'pass' : 'fail', value: pct(stats.insolOk), unit: '% kvartira', limit: '100',
        note: `${fmt(stats.apts - stats.insolOk)} / ${fmt(stats.apts)} kvartira talabga javob bermaydi (${this.aptDate === '03-22' ? '22 mart' : '22 sentabr'}, xonada uzluksiz ${fmt(norm.need, 1)} soat; 1–3 xonalida ≥ 1 xona, 4–5 xonalida ≥ 2 xona). Kvartiralar sxemasi fasad modullari boʻyicha.` },
      { id: 'west-apartments', title: 'Yashash xonalari gʻarbga (kvartira boʻyicha)', source: { ...src, clause: '15-band, 1-xatboshi' },
        status: stats.westOk === stats.apts ? 'pass' : 'fail', value: pct(stats.westOk), unit: '% kvartira', limit: '100',
        note: `${fmt(stats.apts - stats.westOk)} kvartirada gʻarbga (200–290°) qaragan yashash xonasi derazasi bor — yoʻl qoʻyilmaydi (istisnosiz).` },
      { id: 'se-apartments', title: 'Yashash xonalari janub, janubi-sharq, sharqqa (kvartira boʻyicha)', source: { ...src, clause: '15-band, 2-xatboshi' },
        status: stats.seOk === stats.apts ? 'pass' : 'fail', value: pct(stats.seOk), unit: '% kvartira', limit: '100',
        note: `${fmt(stats.apts - stats.seOk)} kvartirada talab bajarilmagan (2 xonalida ≥ 1 xona, 3 xonalida ≥ 2 xona janub / janubi-sharq / sharqqa — 67,5–200°; 1 va 4–5 xonali uchun meʼyorda aytilmagan).` },
    ];
    this.showApts(); this.renderPanel(); this.renderKpi();
  }

  private showApts(): void {
    const A = this.apt, st = A.stats; if (!st) { this.scene.setFacadeMarks(null); return; }
    const fh = this.store.doc.settings.floorHeight, base = A.plans.map(p => Math.min(...p.ring.map(q => this.scene.H(q[0], q[1]))));
    const list = A.pts.map((q, i) => {
      const pl = A.plans[q.sec], md = pl.layout.mods[q.m], c = st.cls[i], y = base[q.sec] + (pl.z0 + q.f) * fh;
      const color = c === 3 ? 0xd6d2c8 : this.aptMode === 'insol' ? [0x3fa66b, 0xb7cf4f, 0xd9534f][c] : st.west[i] === 1 ? 0xd9534f : st.west[i] === 2 ? 0xf29a4a : 0x3fa66b;
      return { a: md.a, b: md.b, y0: y + 0.8, y1: y + fh - 0.6, color };
    });
    this.scene.setFacadeMarks(list);
  }

  /**
   * Past qavatli uylar rejalari (31.10): loyihadagi uy turlari (oʻlchami va turi boʻyicha), 1-, 2- (3-) qavat rejasi; hovli — milliy yoki
   * zamonaviy uslub. Qoidalar: core/lowplan (T-03, T-04, H-01 … H-11).
   */
  private housePanel(body: HTMLElement): void {
    const doc = this.store.doc, fr = frame(doc.origin);
    const lows = doc.buildings.filter(b => b.gen?.plot);
    if (!lows.length) return;
    type Ty = { key: string; name: string; b: typeof lows[number]; n: number; ring: XY[]; plot: XY[]; party: 0 | 1 };
    const types: Ty[] = [];
    for (const b of lows) {
      const ring = b.footprint.map(fr.toLocal), plot = b.gen!.plot!.map(fr.toLocal), L01 = Math.hypot(ring[1][0] - ring[0][0], ring[1][1] - ring[0][1]), L12 = Math.hypot(ring[2][0] - ring[1][0], ring[2][1] - ring[1][1]);
      const party = partySide(ring, plot), kind = ring.length === 6 ? 'Hovli uy' : b.gen!.kind === 'taunhaus' ? 'Bloklangan uy' : ring.length === 4 && plot.some(q => Math.hypot(q[0] - ring[0][0], q[1] - ring[0][1]) < 0.2 || Math.hypot(q[0] - ring[1][0], q[1] - ring[1][1]) < 0.2) ? 'Juft uy' : 'Yakka uy';
      const key = `${kind}|${L01.toFixed(0)}|${L12.toFixed(0)}|${b.floors}`, t = types.find(x => x.key === key);
      if (t) t.n++; else types.push({ key, name: kind, b, n: 1, ring, plot, party });
    }
    const ti = Math.min(this.houseType, types.length - 1), T0 = types[ti], hov = T0.ring.length === 6, fls = hov ? 1 : T0.b.floors;
    const fl = Math.max(1, Math.min(fls, this.houseFloor)), style = hov ? this.houseStyle ?? 'milliy' : 'zamonaviy';
    const P = housePlan(T0.ring, fls, fl, { style, plot: T0.plot, north: [0, 1] });
    body.append(h('div', { class: 'glabel' }, h('span', {}, tr('Uy rejalari')), h('span', {}, `${fmt(lows.length)} ${tr('uy')}`)),
      h('div', { class: 'row', role: 'group', id: 'houseType', 'aria-label': tr('Uy turi'), style: 'flex-wrap:wrap;gap:6px' }, ...types.map((t, i) => { const [, w, d] = t.key.split('|'); return h('button', { class: 'btn btn-sm', 'aria-pressed': i === ti, 'data-ht': i, title: tr(t.name), onclick: () => { this.houseType = i; this.houseFloor = 1; this.renderPanel(); } }, `${w} × ${d} m · ${t.b.floors} ${tr('qavat')} · ×${t.n}`); })),
      h('b', { style: 'font-size:13px' }, tr(T0.name)));
    if (!P) { body.append(h('div', { class: 'note' }, tr('Bu uy shakli uchun reja hali yoʻq — oʻlchami juda kichik.'))); return; }
    const title = `${tr(T0.name)} · ${tf('${n}-qavat', { n: fl })}${hov ? ` · ${tr(style === 'milliy' ? 'milliy uslub' : 'zamonaviy uslub')}` : ''}`;
    const svg = () => housePlanSvg(P, T0.ring, T0.plot, { scale: 100, title, north: [0, 1], label: tr }).svg;
    body.append(
      fls > 1 ? h('div', { class: 'seg sm', role: 'group', id: 'houseFloor' }, ...Array.from({ length: fls }, (_, i) => h('button', { 'aria-pressed': fl === i + 1, 'data-hf': i + 1, onclick: () => { this.houseFloor = i + 1; this.renderPanel(); } }, tf('${n}-qavat', { n: i + 1 })))) : '',
      hov ? h('div', { class: 'seg sm', role: 'group', id: 'houseStyle' }, ...([['milliy', 'Milliy uslub'], ['zamonaviy', 'Zamonaviy']] as const).map(([k, t]) => h('button', { 'aria-pressed': style === k, 'data-hs': k, onclick: () => { this.houseStyle = k; this.renderPanel(); } }, tr(t)))) : '',
      h('div', { class: 'planbox', id: 'houseBox', html: svg().replace(/width="[^"]*mm" height="[^"]*mm"/, 'width="100%"') }),
      h('div', { class: 'col', id: 'houseNotes', style: 'gap:4px' }, ...P.notes.map(n => h('span', { class: 't-small' }, tr(n)))),
      h('button', { class: 'btn btn-sm', id: 'houseSvg', onclick: () => download(`${safe(doc.name)}_uy${ti + 1}_q${fl}.svg`, svg(), 'image/svg+xml') }, ...icl(DL, 'SVG')));
  }

  private kvartiraPanel(body: HTMLElement): void {
    const doc = this.store.doc, mix = doc.settings.aptMix, plans = planApartments(doc), sm = aptSummary(plans), perFloor = sm.total;
    // faqat past qavatli uylar — kvartira miksi kerak emas, darhol uy rejalari
    if (!plans.length && doc.buildings.some(b => b.gen?.plot)) { this.housePanel(body); return; }
    const sum = mix.reduce((a, b) => a + b, 0) || 1, hex = (c: number) => '#' + c.toString(16).padStart(6, '0');
    const sw0 = (c: number) => h('i', { style: `width:10px;height:10px;border-radius:3px;flex:none;background:${hex(c)}` });
    // miks: siljitgichlar (maqsad) va natija (amalda)
    const rows = mix.map((v, i) => {
      const t = h('span', { class: 'v', style: 'width:40px;text-align:right' }, `${Math.round(v / sum * 100)} %`);
      const r = range({ min: 0, max: 100, step: 5, value: v, 'data-mix': i + 1, 'aria-label': `${i + 1} ${tr('xonali')}, %`, oninput: x => { t.textContent = `${x} %`; },
        onchange: x => { const nv = [...mix] as typeof mix; nv[i] = Math.max(0, x || 0); this.run(() => this.store.dispatch({ type: 'setSettings', patch: { aptMix: nv } })); } });
      const got = sm.byK[i];
      return h('div', { class: 'li', style: 'flex-wrap:wrap' }, sw0(Editor.APT_COL[i + 1]), h('span', { style: 'width:62px;flex:none' }, `${i + 1} ${tr('xonali')}`), h('div', { style: 'flex:1;min-width:0' }, r), t,
        h('span', { class: 't-small', style: 'width:100%;padding-left:20px' }, got.n ? `${fmt(got.n)} · ${fmt(got.share * 100, 0)} % · ~${fmt(got.area, 0)} m²` : '—'));
    });
    const size = doc.settings.aptSize ?? 'M';
    body.append(h('div', { class: 'glabel' }, h('span', {}, tr('Kvartira miksi')), h('span', {}, tr('maqsad → natija'))),
      h('div', { class: 'group', id: 'mixRow' }, ...rows),
      h('span', { class: 't-small' }, tr('Natija: soni · ulushi · oʻrtacha netto m². Ulushlar nisbat sifatida olinadi (yigʻindi 100 % boʻlishi shart emas). Maydon — rejadagi kvartira maydoni × 0,85 (devorlar), balkonsiz.')),
      h('div', { class: 'glabel' }, h('span', {}, tr('Kvartira oʻlchami'))),
      h('div', { class: 'seg', role: 'group', id: 'aptSize' }, ...APT_SIZES.map(x => h('button', { 'aria-pressed': size === x.id, 'data-size': x.id, title: x.note, onclick: () => this.run(() => this.store.dispatch({ type: 'setSettings', patch: { aptSize: x.id as AptSize } })) }, x.name))),
      h('div', { class: 'opts' }, ...APT_SIZES.map((x, i) => [i ? ' · ' : '', h('b', {}, `${x.name}:`), ` ${x.note}`]).flat()));
    this.housePanel(body);
    if (!plans.length) {
      if (doc.buildings.some(b => b.gen?.plot)) return;
      body.append(h('div', { class: 'empty' }, svgIcon('<path d="M4 4h16v16H4zM4 11h8V4M12 15h8M16 15v5"/>'), h('span', {}, tr('Turar joy seksiyalari yoʻq. «Hajmlar» qadamida generatsiya qiling (yakka uylar va taunhauslar kvartirali emas).')),
        h('button', { class: 'btn btn-sm', onclick: () => this.go(STEPS.find(x => x.id === 'hajm')!) }, `6 · ${tr('Hajmlar')}`)));
      return;
    }
    body.append(h('div', { class: 'group', id: 'aptPlan' }, h('div', { class: 'li' },
      h('span', { class: 'k' }, h('b', {}, `${fmt(perFloor)} ${tr('kvartira')}`), ` · ${fmt(plans.length)} ${tr('seksiya')}`,
        h('span', { class: 'sub' }, tf('Reja qoidadan: seksiya → hovlidan kirish → zina-lift → qisqa koridor → har kvartiraga eshik, fasadga deraza (modul ${fmt(MOD_W, 1)} m), qorongʻi kvartira yoʻq. Maydon oʻlchami ${size}. Shu son reyestrdagi avtoturargoh talabiga (kvartiraga 1 joy) ham olinadi.', { 'fmt(MOD_W, 1)': fmt(MOD_W, 1), size }))),
      sm.forced ? h('span', { class: 'chip warn', 'data-s': 'review' }, `${fmt(sm.forced)} ${tr('miksdan tashqari')}`) : '')));
    // blok → qavat → reja (dizayn: «Kvartiralar A»): genplanda bino, qavat ‹ › , reja eskizi; «Albomda ochish» — toʻliq ekran, tahrir
    let insolAlbum: (() => void) | null = null;
    { if (this.sel && this.sel !== this.planSelSeen && plans.some(p => p.bid === this.sel)) { this.planBid = this.sel; this.planFloor = null; } this.planSelSeen = this.sel;
      const sel = plans.find(p => p.bid === this.planBid) ?? plans[0], si = plans.indexOf(sel);
      this.planBid = sel.bid;
      const groups = floorGroups(sel), typ = groups.find(g => g.type === 'typical')?.from ?? 1, fl0 = Math.max(1, Math.min(sel.f1, this.planFloor ?? typ)), ft = floorTypeOf(sel, fl0);
      const name = (pl: SecPlan, i: number) => `${i + 1}-bino · ${useDef(doc.buildings.find(x => x.id === pl.bid)?.use ?? 'turar').name}`;
      const optOf = (pl: SecPlan) => ({ fh: doc.settings.floorHeight, bal: doc.buildings.find(x => x.id === pl.bid)?.bal ?? null });
      const res = floorPlanSvg(sel, { scale: 200, dims: false, title: name(sel, si), floor: fl0, ...optOf(sel) });
      const pick = (b: string) => { this.planBid = b; this.planFloor = null; this.scene.select(b); this.renderPanel(); };
      const setF = (f: number) => { this.planFloor = Math.max(1, Math.min(sel.f1, f)); this.renderPanel(); };
      const album = (view?: 'reja' | 'olcham' | 'insol' | 'variantlar') => openAlbum({ plans, bid: sel.bid, floor: fl0, view, mix: doc.settings.aptMix, insol: this.aptInsolView(), runInsol: async () => { await this.runApts(); return this.aptInsolView(); }, fh: doc.settings.floorHeight, size: doc.settings.aptSize ?? 'M', docName: safe(doc.name), name, opt: optOf, download,
        onSave: (b2, pl) => { const fr = frame(doc.origin), bb = this.store.doc.buildings.find(x => x.id === b2); this.run(() => this.store.dispatch({ type: 'updateBuilding', id: b2, patch: { planEdit: pl && bb ? { key: planKey(this.store.doc, bb), apts: pl.apts.map(a => ({ ring: a.ring.map(fr.toGeo), rooms: a.rooms, ...(a.inner ? { inner: a.inner } : {}) })), rooms: pl.rooms.map(q => ({ ring: q.ring.map(fr.toGeo), kind: q.kind })) } : undefined } })); this.clearApt(); },
        onClose: (b2, f) => { this.planBid = b2; this.planFloor = f; this.renderPanel(); } });
      insolAlbum = () => album('insol');
      const clearEdit = () => { this.run(() => this.store.dispatch({ type: 'updateBuilding', id: sel.bid, patch: { planEdit: undefined } })); this.clearApt(); this.renderPanel(); };
      body.append(h('div', { class: 'glabel' }, h('span', {}, tr('Bino')), h('span', {}, tr('genplanda yoki xaritada bosing'))),
        h('div', { class: 'gpbox', id: 'planGp' }, genplanSvg(plans, sel.bid, name, pick)),
        h('div', { class: 'row' }, h('b', { style: 'flex:1;font-size:13px' }, name(sel, si)), h('span', { class: 't-small' }, `${sel.f1} ${tr('qavat')}`)),
        h('div', { class: 'row', style: 'align-items:center;gap:8px' },
          h('button', { class: 'btn icon-btn btn-sm', id: 'planDown', 'aria-label': tr('Pastki qavat'), disabled: fl0 <= 1, onclick: () => setF(fl0 - 1) }, svgIcon('<path d="M15 6l-6 6 6 6"/>')),
          h('span', { id: 'planFloorLbl', style: 'flex:1;text-align:center;font-size:13px' }, h('b', {}, tf('${n}-qavat', { n: fl0 })), ` · ${tr(FLOOR_NAME[ft])}`),
          h('button', { class: 'btn icon-btn btn-sm', id: 'planUp', 'aria-label': tr('Yuqori qavat'), disabled: fl0 >= sel.f1, onclick: () => setF(fl0 + 1) }, svgIcon('<path d="M9 6l6 6-6 6"/>'))),
        h('div', { class: 'planbox', id: 'planBox', title: tr('Albomda ochish'), onclick: () => album(), html: res.svg.replace(/^<\?xml[^>]*>\s*/, '').replace(/width="[^"]*mm" height="[^"]*mm"/, 'width="100%"') }),
        h('div', { class: 'row', style: 'gap:6px' },
          h('button', { class: 'btn btn-primary', style: 'flex:1', id: 'planEditBtn', onclick: () => album() }, tr('Albomda ochish')),
          h('button', { class: 'btn', id: 'planSvg', onclick: () => download(`${safe(doc.name)}_bino${si + 1}_q${fl0}.svg`, floorPlanSvg(sel, { scale: 200, dims: true, title: name(sel, si), floor: fl0, ...optOf(sel) }).svg, 'image/svg+xml') }, ...icl(DL, 'SVG'))),
        sel.edited === 'eskirgan' ? h('div', { class: 'col' }, h('div', { class: 'note warn' }, tr('Qoʻlda tahrirlangan reja eskirgan (bino yoki kvartira sozlamalari oʻzgardi) — generatsiya qilingan reja koʻrsatilmoqda.')), h('button', { class: 'btn btn-sm', id: 'planEditClear', style: 'align-self:flex-start', onclick: clearEdit }, tr('Tahrirni oʻchirish')))
          : sel.edited === 'ok' ? h('div', { class: 'row', style: 'gap:6px' }, h('span', { class: 't-small', style: 'flex:1;align-self:center' }, tr('Reja qoʻlda tahrirlangan')), h('button', { class: 'btn btn-sm', id: 'planEditClear', onclick: clearEdit }, tr('Asl reja'))) : '');
    }
    // 3D koʻrinish va qavat siljitgichi
    const maxF = Math.max(1, ...plans.map(p => p.z0 + p.f1)), fh = doc.settings.floorHeight;
    const g0 = doc.site ? Math.min(...doc.site.rings[0].map(q => { const l = frame(doc.origin).toLocal(q); return this.scene.H(l[0], l[1]); })) : 0;
    const flT = h('b', { class: 'num', style: 'font-size:12.5px;min-width:4.5em;text-align:right' }, this.aptFloor ? `${this.aptFloor} / ${maxF}` : tr('hammasi'));
    const fl = range({ min: 1, max: maxF, step: 1, value: this.aptFloor ?? maxF, id: 'aptFloor', 'aria-label': tr('Qavat'),
      oninput: v => { this.aptFloor = v >= maxF ? null : v; flT.textContent = this.aptFloor ? `${v} / ${maxF}` : tr('hammasi'); this.scene.setSection(this.aptFloor ? { kind: 'h', z: g0 + v * fh + 0.3 } : null); },
      onchange: () => this.renderPanel() });
    body.append(h('div', { class: 'glabel' }, h('span', {}, tr('3D da kvartiralar'))),
      h('div', { class: 'seg sm', role: 'group', id: 'apt3d' }, ...([['yoq', 'Yoʻq'], ['tur', 'Turi boʻyicha'], ['insol', 'Insolyatsiya']] as const).map(([k, t]) => h('button', { 'aria-pressed': this.apt3d === k, 'data-a3d': k, onclick: () => { this.apt3d = k; this.renderPanel(); } }, tr(t)))),
      h('div', { class: 'row', style: 'align-items:center;gap:10px' }, h('span', { class: 't-small', style: 'width:50px' }, tr('Qavat')), h('div', { style: 'flex:1;min-width:0' }, fl), flT));
    body.append(
      h('div', { class: 'glabel' }, h('span', {}, tr('Hisob sanasi')), h('span', {}, 'SanQvaN 0102-25, 95')),
      h('div', { class: 'seg sm', role: 'group', title: tr('95-band davri chegarasi (22.03–22.09)') }, ...([['03-22', '22 mart'], ['09-22', '22 sentabr']] as const).map(([k, t]) => h('button', { 'aria-pressed': this.aptDate === k, onclick: () => { this.aptDate = k; this.renderPanel(); } }, tr(t)))),
      h('button', { class: 'btn btn-primary btn-block', id: 'aptGo', disabled: this.apt.busy, onclick: () => void this.runApts() }, ...icl(SUN, tr(this.apt.busy ? 'Hisoblanmoqda…' : 'Derazalar insolyatsiyasi'))));
    const st = this.apt.stats;
    if (st) {
      const pct = (a: number, b = st.apts) => fmt(b ? a / b * 100 : 0, 0) + ' %';
      const leg = (items: [number, string][]) => h('div', { class: 'leg' }, ...items.map(([c, t]) => h('div', {}, h('i', { style: `background:${hex(c)}` }), h('span', {}, tr(t)))));
      body.append(
        h('div', { class: 'seg sm', role: 'group' }, ...([['insol', 'Insolyatsiya'], ['west', 'Yoʻnalish (15)']] as const).map(([k, t]) => h('button', { 'aria-pressed': this.aptMode === k, 'data-am': k, onclick: () => { this.aptMode = k; this.showApts(); this.renderPanel(); } }, tr(t)))),
        h('div', { class: 'group', id: 'aptSt' }, h('div', { class: 'li' }, h('span', { class: 'k' }, h('b', {}, `${fmt(st.bothOk)} / ${fmt(st.apts)} ${tr('kvartira mos')}`), ` (${pct(st.bothOk)})`,
          h('span', { class: 'sub' }, `${tr('insolyatsiya')} ${pct(st.insolOk)} · ${tr('gʻarb taqiqi')} ${pct(st.westOk)} · ${tr('janub/sharq talabi')} ${pct(st.seOk)} · ${tr('yashash xonalari')} ${pct(st.roomsOk, st.rooms)}`),
          h('span', { class: 'sub' }, st.byRooms.map(r => `${r.k} ${tr('xonali')} ${fmt(r.n)} (${pct(r.ok, r.n)} ${tr('mos')})`).join(' · ') + (this.apt.ms ? ` · ${fmt(this.apt.pts.length)} ${tr('deraza')}, ${fmt(this.apt.ms / 1000, 1)} s` : ''))))),
        this.aptMode === 'insol'
          ? leg([[0x3fa66b, 'Uzluksiz ≥ 2 soat'], [0xb7cf4f, 'Faqat uzlukli (eski 8.5 — mos emas)'], [0xd9534f, 'Yetarli emas'], [0xd6d2c8, 'Oshxona / yordamchi']])
          : leg([[0x3fa66b, 'Yashash xonasi — mos'], [0xf29a4a, 'Janub/sharq talabi bajarilmagan (15-band)'], [0xd9534f, 'Gʻarbga (200–290°) — yoʻl qoʻyilmaydi'], [0xd6d2c8, 'Oshxona / yordamchi']]));
      const worst = st.bySec.filter(x => x.bad > 0).sort((a, b) => b.bad / b.apts - a.bad / a.apts).slice(0, 8);
      if (worst.length) body.append(h('div', { class: 'glabel' }, h('span', {}, tr('Eng muammoli seksiyalar'))),
        h('div', { class: 'group', id: 'aptWorst' }, ...worst.map(x => { const i = plans.findIndex(p => p.bid === x.bid);
          return h('button', { class: 'li', onclick: () => { this.sel = x.bid; this.scene.select(x.bid); } },
            h('span', { class: 'k' }, i >= 0 ? `${i + 1}-bino` : tr('Bino'), h('span', { class: 'sub' }, `${fmt(x.bad)} / ${fmt(x.apts)} ${tr('kvartira mos emas')} · ${x.west ? `${tr('shundan')} ${fmt(x.west)} — ${tr('yoʻnalish (15-band)')}` : tr('insolyatsiya')}`)),
            chev()); })));
      body.append(h('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap' },
        insolAlbum ? h('button', { class: 'btn btn-sm', id: 'aptInsolPlan', onclick: insolAlbum }, ...icl(SUN, tr('Qavat rejasida koʻrish'))) : '',
        h('button', { class: 'btn btn-sm btn-ghost', onclick: () => { this.clearApt(); this.renderPanel(); this.renderKpi(); } }, ...icl(EYE, tr('Belgilarni yashirish')))));
    }
    body.append(h('details', { class: 'how' }, h('summary', {}, svgIcon(IC.info), tr('Hisob qanday')), h('div', {}, tr('Hisob: har qavatdagi har xona derazasi (pol + 1,2 m), 10 daqiqalik qadamlar, quyosh > 3° va fasad oldida; soya — loyiha binolari, saqlanadigan va atrofdagi (350 m) binolar. Yashash xonalari kvartiraning eng yaxshi derazalarini oladi, oshxona — gʻarbiy yoki shimoliy (optimistik sxema; aniq reja keyingi bosqichda). Balkon, lodjiya va deraza qiyaliklari soyasi hisobga olinmaydi. Meʼyor: SanQvaN 0102-25, 94, 95, 15-bandlar (asl matndan).'))));
  }

  private districtField(): HTMLElement {
    const doc = this.store.doc, cur = doc.settings.district, r = demoRow(cur);
    // stat.uz — faqat Oʻzbekiston tumanlari; boshqa davlatda Toshkent raqamlari chalgʻitadi (egasi, 24.10)
    if (placeOf(doc.origin[0], doc.origin[1]).country !== 'UZ') return h('div', { class: 'col', id: 'demoBox' }, h('div', { class: 'glabel' }, h('span', {}, tr('Aholi yosh tarkibi')), h('span', {}, 'stat.uz')),
      h('span', { class: 't-small', id: 'demoAbroad' }, tr('Faqat Oʻzbekiston tumanlari uchun (stat.uz). Bu davlat uchun aholi maʼlumoti hali ulanmagan.')));
    const sel = h('select', { class: 'select', id: 'district', 'aria-label': tr('Aholi yosh tarkibi (stat.uz)'), onchange: (e: Event) => this.run(() => this.store.dispatch({ type: 'setSettings', patch: { district: (e.target as HTMLSelectElement).value } })) },
      ...demoTree().map(t => h('optgroup', { label: t.region.name }, ...[t.region, ...t.parts].map(x => { const o = h('option', { value: x.code }, x.code === t.region.code ? `${x.name} (${tr('jami')})` : x.name) as HTMLOptionElement; o.selected = x.code === cur; return o; }))));
    const k = r ? perThousand(r) : null;
    return h('div', { class: 'col', id: 'demoBox' }, h('div', { class: 'glabel' }, h('span', {}, tr('Aholi yosh tarkibi')), h('span', {}, 'stat.uz')), sel,
      r && k ? h('span', { class: 't-small' }, tf('${fmt(r.pop)} kishi (${DEMO.year}). 1000 kishiga: maktab yoshi (7–17) ${fmt(k.school, 0)}, maktabgacha (3–6) ${fmt(k.mtm, 0)}, 65+ — ${fmt(k.elderly, 0)}. Maktab va MTM tekshiruvida taqqoslanadi; 3–5 yosh qoldiq usulida hisoblangan.', { 'fmt(r.pop)': fmt(r.pop), 'DEMO.year': DEMO.year, 'fmt(k.school, 0)': fmt(k.school, 0), 'fmt(k.mtm, 0)': fmt(k.mtm, 0), 'fmt(k.elderly, 0)': fmt(k.elderly, 0) })) : '');
  }

  /* ---------- 5-bosqich: xizmatlar va piyoda ---------- */
  private svc: { busy: boolean; err: string; poi: PoiBundle | null; res: SvcResult[] | null; sel: Svc; demand: Demand[]; net: Net | null; src: Record<string, XY[]>; ms: number; buildings?: unknown } = { busy: false, err: '', poi: null, res: null, sel: 'mtm', demand: [], net: null, src: {}, ms: 0 };
  private svcRule: Result | null = null;
  /** bekatgacha radius tafsiloti (core/transit.ts) — oxirgi hisobdan */
  private svcTr: { cat: CityCat; auto: boolean; city: ReturnType<typeof cityOf>; dh: number; relief: boolean; blocks: { i: number; use: Use; zone: StopZone; r: number }[] } | null = null;
  private trCatOpen = false;
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
    const blocks = this.plan().blocks;
    const src: Record<string, { pts: XY[] }[]> = {}; const add = (k: Svc, pts: XY[]) => (src[k] ??= []).push({ pts });
    const MAP: Partial<Record<Use, Svc>> = { maktab: 'maktab', mtm: 'mtm', poliklinika: 'poliklinika', savdo: 'savdo', sport: 'sport', ijtimoiy: 'mahalla' };
    blocks.forEach(b => { const k = MAP[b.use]; if (k) add(k, boundaryPts(b.rings[0])); });
    doc.buildings.forEach(b => { const r = b.footprint.map(fr.toLocal); const k = MAP[b.use]; if (k) add(k, boundaryPts(r)); else if (b.nonRes > 0 && useDef(b.use).res > 0) add('savdo', [centroid(r)]); });
    // OSM obyektlari: uchastka ichidagilari buziladi (saqlanadigan bino ichidagisi bundan mustasno)
    const site = doc.site?.rings.map(r => r.map(fr.toLocal)) ?? null, keep = new Set(doc.keep), kept = this.scene.inSite.filter(b => keep.has(b.id));
    let dropped = 0;
    (this.svc.poi?.pois ?? []).forEach(p => { const q = fr.toLocal(p.at); if (site && pointIn(q, site) && !kept.some(b => pointIn(q, b.rings))) { dropped++; return; } add(p.kind, [q]); });
    doc.pois.forEach(p => add(p.kind, [fr.toLocal(p.at)]));   // qoʻlda belgilangan mavjud obyektlar
    // bekatgacha radius: hudud turi (kvartal funksiyasidan), shahar toifasi, markaz, relyef — ShNQ 2.07.01-23, 382–383-band
    const T = doc.settings.transit, city = cityOf(doc.settings.district), cat: CityCat = T.cat ?? cityCategory(city?.pop ?? 0);
    const relief = !!this.ctxMgr.current?.terrain && doc.context.layers.relief;
    const stops = (src.bekat ?? []).flatMap(o => o.pts);
    let dh = 0;
    if (T.relief && relief && stops.length) for (const d of demand) {
      let best: XY | null = null, bd = Infinity; for (const q of stops) { const x = Math.hypot(q[0] - d.p[0], q[1] - d.p[1]); if (x < bd) { bd = x; best = q; } }
      if (best && bd <= 1500) dh = Math.max(dh, Math.abs(this.scene.H(d.p[0], d.p[1]) - this.scene.H(best[0], best[1])));
    }
    dh = Math.round(dh);
    const blockOf = (p: XY) => blocks.find(b => pointIn(p, b.rings));
    for (const d of demand) { const b = blockOf(d.p); d.r = { bekat: stopRadius(stopZone(b?.use ?? 'turar'), cat, T.center, dh).r }; }
    this.svcTr = { cat, auto: !T.cat, city, dh, relief, blocks: blocks.map((b, i) => ({ i, use: b.use, zone: stopZone(b.use), r: stopRadius(stopZone(b.use), cat, T.center, dh).r })) };
    const res = analyze(net, demand, src as Record<Svc, { pts: XY[] }[]>);
    this.svc = { ...this.svc, res, demand, net, src: Object.fromEntries(Object.entries(src).map(([k, v]) => [k, v.flatMap(o => o.pts)])), ms: performance.now() - t0, buildings: doc.buildings };
    const bad = res.filter(r => r.share < 0.999), fmtR = (r: SvcResult) => `${svcDef(r.kind).name} ${rTxt(r)} — ${fmt(r.share * 100, 0)} %`;
    this.svcRule = !demand.length ? null : {
      id: 'service-radius', title: 'Xizmat koʻrsatish radiuslari (piyoda)', source: { doc: 'ShNQ 2.07.01-23', edition: '2023', clause: '539-band, 38-jadval (shahar); bekatlar — 382-band', verified: true },
      status: !bad.length ? 'pass' : bad.some(r => r.share < 0.8) ? 'fail' : 'review', value: res.filter(r => r.share >= 0.999).length, unit: `/ ${res.length} tur`, limit: `${res.length} / ${res.length}`,
      note: `Aholi ulushi (turar joy maydoni boʻyicha) radius ichida: ${res.map(fmtR).join('; ')}. Masofa — piyoda tarmogʻi boʻylab (OSM + loyiha koʻchalari). Manba: loyiha parsellari va OSM obyektlari${dropped ? ` (uchastka ichidagi ${dropped} ta OSM obyekti buziladi deb chiqarildi)` : ''}. Bekat radiusi: shahar toifasi «${catName(cat)}»${T.cat ? ' (qoʻlda)' : ' (andoza)'}, ${T.center ? 'umumshahar markazi, ' : ''}hudud turi kvartal funksiyasidan${dh ? `, relyef tuzatmasi −${Math.round(dh / 10 * 50)} m (farq ${dh} m)` : ''} — 382–383-band. Metro 800 m — taxmin (ShNQ da yoʻq). OSM toʻliq emas — natija pastki baho.`,
    };
    this.showSvc(); this.renderPanel(); this.renderKpi();
  }

  private showSvc(): void {
    const S = this.svc, r = S.res?.find(x => x.kind === S.sel); if (!r || !S.net) { this.scene.setNetMap(null); return; }
    const R = r.r, col = (d: number) => d <= R * 0.5 ? 0x1a9850 : d <= R ? 0x91cf60 : d <= R * 1.5 ? 0xfdae61 : d < Infinity ? 0xd73027 : 0xb9b5ad;
    const segs = S.net.segs.map(([a, b]) => ({ a: S.net!.xy[a], b: S.net!.xy[b], color: col(Math.min(r.D[a], r.D[b])) }));
    const dots = [...(S.src[S.sel] ?? []).map(p => ({ p, color: 0x2a6fb0, size: 9 })), ...S.demand.map((d, i) => ({ p: d.p, color: r.dist[i] <= r.rd[i] ? 0x1a9850 : 0xd73027, size: 12 }))];
    this.scene.setNetMap(segs, dots);
  }

  /** Bekatgacha radius (MR-Q3): shahar toifasi, hudud turlari, markaz va relyef — ShNQ 2.07.01-23, 382–383-band */
  private transitBox(): HTMLElement {
    const doc = this.store.doc, T = doc.settings.transit, X = this.svcTr;
    if (!X) return h('span');
    const set = (patch: Partial<typeof T>) => { this.run(() => this.store.dispatch({ type: 'setSettings', patch: { transit: { ...T, ...patch } } })); this.runServices(); };
    const big = X.cat === 'engyirik' || X.cat === 'yirik', base0 = stopRadius('odatiy', X.cat, T.center, 0).base;
    const tbl = (head: string[], rows: (string | Node)[][]) => h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, ...head.map(x => h('th', {}, x)))), h('tbody', {}, ...rows.map(r => h('tr', {}, ...r.map((c, i) => h('td', i === 1 ? { class: 'num' } : {}, c))))));
    const catSel = this.trCatOpen ? select({ id: 'trCat', 'aria-label': tr('Shahar toifasi'), onchange: v => { this.trCatOpen = false; set({ cat: v === '' ? null : v as CityCat }); } },
      [{ value: '', label: `${tr('Avtomatik (andoza)')}${X.city ? ` · ${catName(cityCategory(X.city.pop))}` : ''}`, selected: !T.cat }, ...CITY_CATS.map(c => ({ value: c.id, label: `${tr(c.name)} · ${c.range}`, selected: T.cat === c.id }))]) : '';
    const shown = X.blocks.filter(b => useDef(b.use).res > 0 || b.zone !== 'odatiy');
    return h('div', { class: 'group', id: 'trBox', style: 'padding:12px;display:flex;flex-direction:column;gap:10px' },
      h('div', { class: 'row', style: 'align-items:baseline;gap:8px' }, h('b', { style: 'font-size:13.5px;flex:1' }, tr('Bekatgacha radius')), h('span', { class: 'norm' }, svgIcon(IC.book), '382–383-band')),
      h('div', { class: 'group' }, h('div', { class: 'li' }, h('span', { class: 'k' }, tr('Shahar toifasi'),
        h('span', { class: 'sub' }, X.city ? `${X.city.name} · ${fmt(X.city.pop)} ${tr('kishi')} (stat.uz, ${DEMO.year})${X.city.city ? '' : ` — ${tr('shahar emas, toifani tekshiring')}`}` : tr('hudud tanlanmagan'))),
        h('span', { class: 'v', id: 'trCatV' }, tr(catName(X.cat))), h('span', { class: `chip ${X.auto ? 'warn' : 'na'}` }, X.auto ? tr('andoza') : tr('qoʻlda')))),
      tbl([tr('Toifa'), tr('Aholi')], CITY_CATS.map(c => [tr(c.name), c.range])),
      h('span', { class: 't-small' }, tr('Aholi soni stat.uz dan avtomatik (1-qadamdagi hudud). Chegaralar — SNiP 2.07.01-89 asosidagi andoza, manba tasdiqlanmagan; ShNQ 2.07.01-23 matnida berilmagan. Asl manba topilsa — almashtiriladi.')),
      this.trCatOpen ? catSel : h('button', { class: 'btn btn-sm', id: 'trCatEdit', style: 'align-self:flex-start', onclick: () => { this.trCatOpen = true; this.renderPanel(); } }, ...icl(IC.pencil, tr('Toifani qoʻlda oʻzgartirish'))),
      tbl([tr('Hudud'), tr('Radius'), tr('Band')], [
        [tr('Turar joy, ishxona (odatdagi)'), '400 m', '382'],
        [tr('Yakka tartibdagi uy-joy'), h('span', {}, '600 m', h('br'), h('span', { class: 't-small' }, `${tr('oʻrta, kichik')}: 800`)), tr('382, 2-qism')],
        [h('span', {}, tr('Umumshahar markazi'), h('br'), h('span', { class: 't-small' }, tr('eng yirik, yirik shaharlarda'))), '250 m', '383'],
        [tr('Ommaviy dam olish va sport zonasi'), '800 m', '383']]),
      shown.length ? h('div', { class: 'glabel' }, h('span', {}, tr('Kvartallar boʻyicha')), h('span', {}, tr('funksiyadan avtomatik'))) : '',
      shown.length ? h('div', { class: 'group flat', id: 'trBlocks' }, ...shown.map(b => h('div', { class: 'li' }, h('span', { class: 'k' }, `${this.unitName(b.i)} · ${useDef(b.use).name}`, h('span', { class: 'sub' }, tr(ZONE_NAME[b.zone]))), h('span', { class: 'v' }, `${b.r} m`)))) : '',
      h('div', { class: 'group' },
        h('div', { class: 'li' }, h('span', { class: 'k' }, tr('Loyiha umumshahar markazida'), h('span', { class: 'sub' }, tr('yoqilsa — 250 m (faqat eng yirik va yirik shahar)'))),
          sw({ id: 'trCenter', label: tr('Loyiha umumshahar markazida'), on: T.center, disabled: !big && !T.center, onchange: v => set({ center: v }) })),
        h('div', { class: 'li' }, h('span', { class: 'k' }, tr('Murakkab relyef tuzatmasi'), h('span', { class: 'sub' }, tr('har 10 m balandlik farqiga −50 m · relyef: 1-qadam'))),
          sw({ id: 'trRelief', label: tr('Murakkab relyef tuzatmasi'), on: T.relief, onchange: v => set({ relief: v }) }))),
      T.relief ? h('span', { class: 't-small', id: 'trDh' }, !X.relief ? tr('Relyef yuklanmagan (1-qadam, «Atrofni yuklash») — tuzatma qoʻllanmadi.')
        : X.dh ? tf('Uchastka va bekat orasidagi eng katta farq ${X.dh} m → radius −${cut} m (${base} → ${r} m).', { 'X.dh': X.dh, cut: Math.round(X.dh / 10 * 50), base: base0, r: stopRadius('odatiy', X.cat, T.center, X.dh).r })
        : tr('Uchastka va bekatlar orasida sezilarli balandlik farqi yoʻq.')) : '');
  }

  private xizmatPanel(body: HTMLElement): void {
    const S = this.svc, hex = (c: number) => '#' + c.toString(16).padStart(6, '0');
    if (!S.res && !S.busy && !S.err) queueMicrotask(() => void this.loadPoi());
    if (S.busy) body.append(h('div', { class: 'note' }, tr('OSM: maktab, bogʻcha, poliklinika, dorixona, doʻkonlar va 2 km piyoda yoʻllari yuklanmoqda…')));
    if (S.err && S.err !== 'yashirildi') body.append(h('div', { class: 'note warn' }, S.err));
    if (S.res) {
      if (S.buildings !== this.store.doc.buildings) body.append(h('div', { class: 'row', style: 'gap:8px;align-items:center' }, h('span', { class: 't-small', style: 'flex:1' }, tr('Loyiha oʻzgardi — natija eskirgan.')), h('button', { class: 'btn btn-sm', onclick: () => this.runServices() }, tr('Qayta hisoblash'))));
      const cls = (x: number) => x >= 0.999 ? ['ok', 'pass'] : x >= 0.8 ? ['warn', 'review'] : ['bad', 'fail'];
      body.append(h('div', { class: 'group' }, h('table', { class: 'tbl', id: 'svcTab' },
        h('thead', {}, h('tr', {}, h('th', {}, tr('Xizmat')), h('th', {}, tr('Radius')), h('th', {}, tr('Obyekt')), h('th', {}, tr('Aholi')))),
        h('tbody', {}, ...S.res.map(r => h('tr', { 'data-svc': r.kind, 'aria-selected': r.kind === S.sel, style: `cursor:pointer;${r.kind === S.sel ? 'background:var(--sel-soft)' : ''}`, onclick: () => { this.svc.sel = r.kind; this.showSvc(); this.renderPanel(); } },
          h('td', {}, tr(svcDef(r.kind).name)), h('td', { class: 'num', style: 'white-space:nowrap' }, rTxt(r)), h('td', { class: 'num' }, String(r.sources)),
          h('td', {}, h('span', { class: `chip ${cls(r.share)[0]}`, 'data-s': cls(r.share)[1] }, `${fmt(r.share * 100, 0)} %`))))))));
      const r = S.res.find(x => x.kind === S.sel)!, def = svcDef(S.sel), far = S.demand.map((_d, i) => r.dist[i] > r.rd[i] ? r.dist[i] : -1).filter(x => x >= 0);
      body.append(h('div', { class: 'col', id: 'svcSt' }, h('b', { style: 'font-size:12.5px' }, `${tr(def.name)}: ${tr(def.note)}`),
        h('span', { class: 't-small' }, far.length ? tf('${fmt(far.length)} / ${fmt(S.demand.length)} seksiya radiusdan tashqarida, eng uzoq ${Number.isFinite(Math.max(...far)) ? fmt(Math.max(...far), 0) + \' m\' : \'yetib boʻlmaydi\'}', { 'fmt(far.length)': fmt(far.length), 'fmt(S.demand.length)': fmt(S.demand.length), "Number.isFinite(Math.max(...far)) ? fmt(Math.max(...far), 0) + ' m' : 'yetib boʻlmaydi'": Number.isFinite(Math.max(...far)) ? fmt(Math.max(...far), 0) + ' m' : tr('yetib boʻlmaydi') }) : tf('Barcha ${fmt(S.demand.length)} seksiya radius ichida', { 'fmt(S.demand.length)': fmt(S.demand.length) }),
          r.far ? tf(' · ${r.far} ta obyekt tarmoqdan tashqarida (toʻgʻri masofa × 1,3)', { 'r.far': r.far }) : '')),
        this.transitBox(),
        h('div', { class: 'leg' }, ...([[0x1a9850, `≤ ${r.r / 2} m`], [0x91cf60, `≤ ${r.r} m`], [0xfdae61, `≤ ${r.r * 1.5} m`], [0xd73027, `> ${r.r * 1.5} m`], [0x2a6fb0, tr('Obyekt (loyiha yoki OSM)')]] as [number, string][]).map(([c, t]) => h('div', {}, h('i', { style: `background:${hex(c)}` }), h('span', {}, t)))),
        h('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap' }, h('button', { class: 'btn btn-sm', onclick: () => void this.loadPoi(true) }, ...icl(DL, tr('OSM dan yangilash'))), h('button', { class: 'btn btn-sm btn-ghost', onclick: () => { this.svc.res = null; this.svc.err = 'yashirildi'; this.scene.setNetMap(null); this.renderPanel(); } }, ...icl(EYE, tr('Yashirish')))),
        h('span', { class: 't-small' }, `${fmt(S.poi?.pois.length ?? 0)} ${tr('OSM obyekt')}, ${fmt(S.net?.segs.length ?? 0)} ${tr('yoʻl boʻlagi')} · ${fmt(S.ms, 0)} ms`));
    } else if (S.err === 'yashirildi') body.append(h('button', { class: 'btn btn-primary btn-block', onclick: () => { this.svc.err = ''; void this.loadPoi(); } }, ...icl(WALK, tr('Xizmatlar tahlili'))));
    // qoʻlda obyekt qoʻshish (OSM da yoʻq bogʻcha, maktab…)
    const doc = this.store.doc, fr = frame(doc.origin);
    const kindSel = select({ id: 'poiKind', 'aria-label': tr('Turi'), onchange: v => { this.poiKind = v as Svc; } }, SERVICES.map(x => ({ value: x.id, label: tr(x.name), selected: x.id === this.poiKind })));
    const nameIn = h('input', { class: 'input', id: 'poiName', 'aria-label': tr('Nomi'), placeholder: tr('Nomi (ixtiyoriy), masalan 45-MTM'), value: this.poiName }) as HTMLInputElement;
    nameIn.oninput = () => { this.poiName = nameIn.value; };
    const placing = this.tool instanceof ClickTool && this.tool.hint.startsWith('Obyekt');
    body.append(h('div', { class: 'col', id: 'poiBox' }, h('div', { class: 'glabel' }, h('span', {}, tr('Mavjud obyektni qoʻlda qoʻshish'))),
      h('div', { class: 'row2' }, kindSel, nameIn),
      h('div', { class: 'opts' }, h('b', {}, `${SERVICES.length} ${tr('tur')}:`), ` ${SERVICES.map(x => tr(x.name)).join(' · ')}`),
      h('button', { class: placing ? 'btn btn-primary btn-block' : 'btn btn-block', id: 'poiAdd', onclick: () => placing ? this.setTool(null) : this.setTool(new ClickTool('Obyekt joyini bosing (kirish yoki uchastka chegarasi) · Esc — tugatish', xy => {
        this.run(() => this.store.dispatch({ type: 'addPoi', poi: { id: uid('poi_'), kind: this.poiKind, at: fr.toGeo(xy), ...(this.poiName.trim() ? { name: this.poiName.trim() } : {}) } }));
        this.poiName = ''; if (this.svc.res) this.runServices();
      })) }, ...(placing ? [tr('Qoʻshishni tugatish')] : icl(IC.plus, tr('Xaritada belgilash')))),
      doc.pois.length ? h('div', { class: 'group', id: 'poiList' }, ...doc.pois.map(p => h('div', { class: 'li' }, h('span', { class: 'k' }, tr(svcDef(p.kind).name), h('span', { class: 'sub' }, p.name ?? tr('nomsiz'))),
        h('button', { class: 'btn icon-btn btn-sm btn-ghost', 'aria-label': tr('Oʻchirish'), onclick: (e: Event) => { e.stopPropagation(); this.run(() => this.store.dispatch({ type: 'removePoi', id: p.id })); if (this.svc.res) this.runServices(); } }, svgIcon(IC.trash))))) : ''));
    body.append(h('span', { class: 'norm' }, svgIcon(IC.book), 'ShNQ 2.07.01-23 · 539-band, 38-jadval'),
      h('span', { class: 'norm' }, svgIcon(IC.book), tr('ShNQ 2.07.01-23 · 382–383-band (bekat)')),
      h('details', { class: 'how' }, h('summary', {}, svgIcon(IC.info), tr('Masofa qanday oʻlchanadi')), h('div', {}, tr('Meʼyor: ShNQ 2.07.01-23, 539-band, 38-jadval (shahar; asl matndan); jamoat transporti bekati — 382-band (≤ 400 m; markazda 250, dam olish zonasida 800 — 383-band), metro kirishi 800 m — taxmin. Masofa seksiya markazidan obyekt uchastkasi chegarasigacha piyoda yoʻllar boʻylab; past zichlikdagi hududlar uchun kattaroq radiuslar (MTM 500, dorixona 800 m) hali qoʻllanmagan. 39-jadval (qizil chiziq va turar joygacha masofalar) — keyingi qadamda. OSM Toshkentda toʻliq emas: mavjud bogʻcha yoki maktab koʻrinmasa, «Parsellar» qadamida tegishli funksiyani bering.'))));
  }

  /* ---------- 5-bosqich: hisobot va TEP ---------- */
  private allRules(): Result[] { const o = this.store.doc.origin; return abroadRules([...(this.last?.results ?? []), ...(this.insolRule ? [this.insolRule] : []), ...this.planRules(), ...this.aptRules, ...(this.svcRule ? [this.svcRule] : [])], placeOf(o[0], o[1]).norms); }
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

  /**
   * Generatsiya toʻsiqlari (mahalliy metr): saqlanadigan mavjud binolar, qoʻlda chizilgan binolar va boshqa guruhlarning
   * avtomatik binolari (shu hududda almashtiriladiganlaridan tashqari) — ustiga qurilmaydi, masofa saqlanadi.
   */
  private genObstacles(grp: string, area: XY[]): Obstacle3[] {
    const doc = this.store.doc, fr = frame(doc.origin), fh = doc.settings.floorHeight, keep = new Set(doc.keep);
    const gone = new Set(staleGen(doc, grp, area, []).bids);
    const out: Obstacle3[] = this.scene.inSite.filter(x => keep.has(x.id)).map(x => ({ ring: x.rings[0], h: x.h }));
    for (const b of doc.buildings) { if (b.gen?.grp === grp || gone.has(b.id)) continue; out.push({ ring: b.footprint.map(fr.toLocal), h: ((b.z0 ?? 0) + b.floors) * fh }); }
    return out;
  }

  private generateBlock(i: number, quiet = false): number {
    const plan = this.plan(), b = plan.blocks[i], lab = this.blockLabel(i); if (!b || !lab) return 0;
    const ud = useDef(b.use), name = this.unitName(i);
    if (!ud.build) { if (!quiet) toast(`${name} — «${ud.name}», binolar joylashtirilmaydi`); return 0; }
    if (isSocial(b.use)) return this.generateSocial(i, quiet);
    // 12-band: tanlangan birlik — paneldagi parametrlar; qolganlari («Hammasi») — oʻzida saqlangan parametrlar (boʻlmasa panel)
    const sg = this.savedGen(i), base: GenParams = i === this.selBlock || !sg || sg.soc ? this.gen : { ...DEFAULT_GEN, ...(sg as Partial<GenParams>) };
    const g0: GenParams = usePreset(b.use, base) ?? (ud.floors ? { ...base, minF: ud.floors[0], maxF: ud.floors[1], nonRes: 0 } : base);
    // seysmik boʻlma (QMQ 2.01.03-19, 3.1-jadval): seksiya uzunligi chegaradan oshmaydi
    const sysK = this.store.doc.settings.construct ?? 'monolit', lim = lenLimit(sysK, this.store.doc.settings.seismic), g: GenParams = lim != null ? { ...g0, secLen: Math.min(g0.secLen, lim), maxLen: lim, maxProj: SYS[sysK].proj } : g0;
    const S = this.store.doc.settings, fr = frame(this.store.doc.origin), r = generate(b.rings[0], g, S.floorHeight, { use: b.use, aptNet: S.aptNet, netToGross: S.netToGross, avoid: this.genObstacles(b.parcelId ?? lab.id, b.rings[0]) });
    this.genNotes = r.notes; this.genFar = r.far ?? null;
    const use: Use = b.use;
    const grp = b.parcelId ?? lab.id, drop = staleGen(this.store.doc, grp, b.rings[0], r.sections.map(x => x.ring));
    if (drop.bids.length) this.genNotes = [...this.genNotes, tf('${n} ta eski avtomatik bino (oldingi generatsiyadan) almashtirildi — ustma-ust tushmasligi uchun', { n: drop.bids.length })];
    this.run(() => this.store.dispatch({ type: 'replaceGroup', grp, drop, label: b.parcelId ? undefined : { ...lab, gen: { ...base } }, ...(b.parcelId ? { parcelGen: { ...base } } : {}),
      sections: r.sections.map(x => ({ footprint: x.ring.map(fr.toGeo), floors: x.floors, nonRes: (use === 'turar' && x.kind === 'qator') ? 0 : x.nonRes, use: (x.use as Use) ?? use, kind: x.kind, z0: x.z0, blind: x.blind, ...(x.plot ? { plot: x.plot.map(fr.toGeo) } : {}) })),
      garage: r.parking ? { kind: r.parking.kind, ring: r.parking.ring.map(fr.toGeo), levels: r.parking.levels, spaces: r.parking.spaces, ...(r.parking.need != null ? { need: r.parking.need } : {}), ...(r.parking.module ? { module: r.parking.module } : {}), ...(r.parking.stalls ? { stalls: r.parking.stalls.map(q => q.map(fr.toGeo)) } : {}), ...(r.parking.aisles ? { aisles: r.parking.aisles.map(q => q.map(fr.toGeo)) } : {}) } : null }));
    if (!quiet) toast(r.sections.length ? `${name}: ${r.sections.length} seksiya` : (r.notes[0] ?? 'Seksiya joylashmadi'));
    return r.sections.length;
  }

  /* ---------- ijtimoiy binolar (maktab, MTM, poliklinika) ---------- */
  private socMod: Record<SocialUse, Module> = { maktab: 'taroq', mtm: 'chiziq', poliklinika: 'blok' };
  private socM2: Record<SocialUse, number> = { maktab: SOCIAL.maktab.m2, mtm: SOCIAL.mtm.m2, poliklinika: SOCIAL.poliklinika.m2 };
  private socFloors: Record<SocialUse, number> = { maktab: SOCIAL.maktab.floors, mtm: SOCIAL.mtm.floors, poliklinika: SOCIAL.poliklinika.floors };
  private socCap: Record<string, number> = {};
  /** 12-band: korpus eni (null — modul odatiysi) va eng katta uzunligi (0 — cheklanmagan), m */
  private socBW: Record<SocialUse, number | null> = { maktab: null, mtm: null, poliklinika: null };
  private socBL: Record<SocialUse, number> = { maktab: 0, mtm: 0, poliklinika: 0 };
  /** daha yoki yer uchastkasida saqlangan generator parametrlari */
  /**
   * Koʻcha siljitilganda / profili oʻzgarganda (egasi, 30.10): chegarasi oʻzgargan kvartal va yer uchastkalarida avtomatik binolar
   * saqlangan generator parametrlari bilan qayta generatsiya qilinadi (binolar yoʻlga moslanadi). Qoʻlda chizilgan binolar tegilmaydi
   * (replaceGroup faqat eski avtomatik binolarni almashtiradi). Sudrash paytida 400 ms kechikish bilan — oxirgi holat boʻyicha.
   */
  private regenTimer: ReturnType<typeof setTimeout> | null = null;
  private regenPrev: PlanGeo | null = null;
  private regenAfterStreets(prev: PlanGeo): void {
    if (!this.regenPrev) this.regenPrev = prev;
    if (this.regenTimer) clearTimeout(this.regenTimer);
    this.regenTimer = setTimeout(() => {
      this.regenTimer = null; const old = this.regenPrev; this.regenPrev = null; if (!old) return;
      const doc = this.store.doc, cur = this.plan(), keyOf = (r: XY[]) => r.map(p => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(';');
      const oldKey = new Map<string, string>(); old.blocks.forEach(b => oldKey.set(b.parcelId ?? b.labelId ?? '', keyOf(b.rings[0])));
      const todo: number[] = [], editedN: number[] = [];
      cur.blocks.forEach((b, i) => {
        const grp = b.parcelId ?? b.labelId; if (!grp) return;
        const auto = doc.buildings.filter(x => x.gen?.grp === grp); if (!auto.length || !this.savedGen(i)) return;
        const was = oldKey.get(grp); if (was == null || was === keyOf(b.rings[0])) return;   // chegara oʻzgarmagan
        todo.push(i); const ne = auto.filter(x => x.gen?.edited).length; if (ne) editedN.push(ne);
      });
      if (!todo.length) return;
      const go = () => { let n = 0; for (const i of todo) if (this.generateBlock(i, true) > 0) n++; if (n) { toast(tf('${n} ta kvartal yoʻlga moslab qayta generatsiya qilindi', { n })); this.renderPanel(); this.renderKpi(); } this.warnOverlap(); };
      // qoʻlda tahrirlangan avtomatik binolar bor — avval soʻraladi (egasi, 30.10): tahrir yoʻqoladi
      if (editedN.length) this.askRegen(editedN.reduce((t, v) => t + v, 0), go, () => this.warnOverlap()); else go();
    }, 400);
  }

  /** Qayta generatsiya tasdigʻi (qoʻlda tahrirlangan avtomatik binolar yangisiga almashadi) */
  /** Koʻcha koridoriga tushgan binolar haqida ogohlantirish (hisob tugagach) */
  private warnOverlap(): void {
    setTimeout(() => { const n = this.last?.d.streetOverlap.length ?? 0; if (n) toast(tf('${n} ta bino koʻcha koridoriga tushdi — reyestrda qizil; bino panelida «Koʻchadan chiqarish»', { n })); }, 900);
  }
  private askRegen(nEdited: number, go: () => void, keep?: () => void): void {
    injectChzCss(); document.getElementById('regenAsk')?.remove();
    const back = h('div', { class: 'chzs-back', id: 'regenAsk' });
    const close = () => back.remove();
    back.append(h('div', { class: 'chzs', role: 'dialog', 'aria-modal': 'true' },
      h('h2', {}, tr('Koʻcha oʻzgardi — binolar qayta generatsiya qilinsinmi?')),
      h('p', {}, tf('${n} ta avtomatik bino qoʻlda tahrirlangan (qavatlar, fasad yoki reja). Qayta generatsiyada bu tahrirlar yoʻqoladi; binolar yangi kvartal chegarasiga moslanadi.', { n: nEdited })),
      h('button', { type: 'button', class: 'chzs-o rec', id: 'regenYes', onclick: () => { close(); go(); } }, h('b', {}, tr('Qayta generatsiya qilish')), h('span', {}, tr('tahrirlar yoʻqoladi, binolar yoʻlga moslanadi'))),
      h('button', { type: 'button', class: 'chzs-o', id: 'regenNo', onclick: () => { close(); keep?.(); } }, h('b', {}, tr('Binolarni qoldirish')), h('span', {}, tr('binolar joyida qoladi — koʻcha ustiga tushgan boʻlsa qoʻlda tuzating')))));
    document.body.append(back);
  }

  private savedGen(i: number): Record<string, unknown> | null {
    const b = this.plan().blocks[i]; if (!b) return null;
    const doc = this.store.doc;
    const g = b.parcelId ? doc.parcels.find(p => p.id === b.parcelId)?.gen : doc.zones.find(z => z.id === b.labelId)?.gen;
    return g && typeof g === 'object' ? g : null;
  }
  /** tanlov oʻzgarganda — shu birlikning saqlangan parametrlari panelga yuklanadi */
  private genFor = '';
  private loadGenFor(i: number | null): void {
    const b = i != null ? this.plan().blocks[i] : null, key = b ? `${b.parcelId ?? b.labelId ?? i}|${b.use}` : '';
    if (key === this.genFor) return; this.genFor = key;
    const sg = i != null ? this.savedGen(i) : null; if (!sg || !b) return;
    const soc = sg.soc as { mod?: Module; m2?: number; floors?: number; bw?: number | null; bl?: number; cap?: number } | undefined;
    if (soc && isSocial(b.use)) {
      const u = b.use as SocialUse;
      if (soc.mod && SOCIAL[u].modules.some(m => m.id === soc.mod)) this.socMod[u] = soc.mod;
      if (typeof soc.m2 === 'number') this.socM2[u] = soc.m2;
      if (typeof soc.floors === 'number') this.socFloors[u] = soc.floors;
      this.socBW[u] = typeof soc.bw === 'number' ? soc.bw : null; this.socBL[u] = typeof soc.bl === 'number' ? soc.bl : 0;
      if (typeof soc.cap === 'number') this.socCap[key] = soc.cap;
    } else if (!soc) this.gen = { ...DEFAULT_GEN, ...(sg as Partial<GenParams>) };
  }
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
    const sp = socialPlan(ring, t.use, t.cap, this.socMod[t.use], this.socM2[t.use], this.socFloors[t.use], sb, this.socBW[t.use] ?? undefined, this.socBL[t.use] || undefined);
    const soc = { soc: { mod: this.socMod[t.use], m2: this.socM2[t.use], floors: this.socFloors[t.use], bw: this.socBW[t.use], bl: this.socBL[t.use], cap: t.cap } };
    this.genNotes = [`${SOCIAL[t.use].name}: ${fmt(t.cap)} ${SOCIAL[t.use].unit} · ${fmt(sp.gfa)} m² GFA · ${this.socFloors[t.use]} qavat (taxmin ${this.socM2[t.use]} m²/${SOCIAL[t.use].unit})`, ...sp.notes]; this.genFar = null;
    if (!sp.sections.length) { if (!quiet) toast(sp.notes[0] ?? 'Joylashmadi'); return 0; }
    const sgrp = b.parcelId ?? lab.id, drop = staleGen(this.store.doc, sgrp, b.rings[0], sp.sections.map(x => x.ring));
    this.run(() => this.store.dispatch({ type: 'replaceGroup', grp: sgrp, drop, label: b.parcelId ? undefined : { ...lab, gen: soc }, ...(b.parcelId ? { parcelGen: soc } : {}),
      sections: sp.sections.map(x => ({ footprint: x.ring.map(fr.toGeo), floors: x.floors, nonRes: 0, use: t.use, kind: 'ijtimoiy' })), garage: null }));
    if (!quiet) toast(`${this.unitName(i)}: ${SOCIAL[t.use].name.toLowerCase()} — ${fmt(t.cap)} ${SOCIAL[t.use].unit}, ${fmt(sp.gfa)} m²`);
    return sp.sections.length;
  }
  private socialSection(i: number): HTMLElement | '' {
    const t = this.socTarget(i); if (!t) return '';
    const S = SOCIAL[t.use], b = this.plan().blocks[i], key = `${b.parcelId ?? b.labelId ?? String(i)}|${b.use}`;
    const unit0 = S.unit.split('/')[0];
    return h('div', { class: 'col soc', id: 'socBox' }, h('div', { class: 'glabel' }, h('span', {}, `${S.name} — ${tr('avtomat')}`)),
      h('div', { class: 'group' },
        h('div', { class: 'li' }, h('span', { class: 'k' }, tr('Ehtiyoj'), h('span', { class: 'sub' }, tr('loyiha aholisi, stat.uz'))), h('span', { class: 'v' }, t.demand ? `${fmt(t.demand)} ${S.unit}` : '—')),
        h('div', { class: 'li' }, h('span', { class: 'k' }, tr('Parsel sigʻimi'), h('span', { class: 'sub' }, t.use === 'maktab' ? '41-jadval' : t.use === 'mtm' ? '543-band' : '45-jadval, taxmin')), h('span', { class: 'v' }, `${fmt(t.plot)} ${S.unit}`)),
        h('div', { class: 'li' }, h('span', { class: 'k' }, tr('Sigʻim'), h('span', { class: 'sub' }, S.unit)), stepper({ id: 'socCap', label: `${tr('Sigʻim')}, ${S.unit}`, min: 10, max: 5000, step: 10, value: t.cap, onchange: v => { this.socCap[key] = Math.max(10, v); this.renderPanel(); } })),
        h('div', { class: 'li' }, h('span', { class: 'k' }, `m² / ${unit0}`), stepper({ id: 'socM2', label: `m²/${unit0}`, min: 4, max: 40, step: 0.5, value: this.socM2[t.use], onchange: v => { this.socM2[t.use] = Math.max(4, v); this.renderPanel(); } })),
        h('div', { class: 'li' }, h('span', { class: 'k' }, tr('Qavat'), h('span', { class: 'sub' }, `1–${S.maxFloors}`)), stepper({ id: 'socFl', label: tr('Qavat'), min: 1, max: S.maxFloors, step: 1, value: this.socFloors[t.use], onchange: v => { this.socFloors[t.use] = v; this.renderPanel(); } })),
        // 12-band: korpus oʻlchamlari
        h('div', { class: 'li' }, h('span', { class: 'k' }, tr('Korpus eni'), h('span', { class: 'sub' }, tf('odatiy ${n} m', { n: MOD_BW[this.socMod[t.use]] }))), stepper({ id: 'socBW', label: tr('Korpus eni'), min: 9, max: 36, step: 0.5, unit: 'm', value: this.socBW[t.use] ?? MOD_BW[this.socMod[t.use]], onchange: v => { this.socBW[t.use] = v === MOD_BW[this.socMod[t.use]] ? null : v; this.renderPanel(); } })),
        h('div', { class: 'li' }, h('span', { class: 'k' }, tr('Eng uzun korpus'), h('span', { class: 'sub' }, tr('0 — cheklovsiz'))), stepper({ id: 'socBL', label: tr('Eng uzun korpus'), min: 0, max: 200, step: 1, unit: 'm', value: this.socBL[t.use], onchange: v => { this.socBL[t.use] = Math.max(0, v); this.renderPanel(); } }))),
      h('div', { class: 'glabel' }, h('span', {}, `${tr('Modul')} · ${S.name.toLowerCase()}`)),
      h('div', { class: S.modules.length > 2 ? 'tiles' : 'tiles c2', role: 'group', 'aria-label': tr('Modul') }, ...S.modules.map(m => h('button', { class: 'tile', 'data-mod': m.id, 'aria-pressed': this.socMod[t.use] === m.id, title: m.note, onclick: () => { this.socMod[t.use] = m.id; this.renderPanel(); }, html: pg('soc', m.id) + `<span>${m.name}</span>` }))),
      h('span', { class: 't-small' }, S.modules.find(m => m.id === this.socMod[t.use])!.note),
      h('span', { class: 't-small' }, tf('Qizil chiziqdan ${t.use === \'poliklinika\' ? \'6\' : \'25\'} m (39-jadval), qoʻshni parseldan 6 m. Bino maydoni oʻringa — taxmin (ShNQ 2.08.02-23 da maktab va MTM binosi maydoni berilmagan; xalqaro va MDH tipik loyihalari oraligʻi).', { "t.use === 'poliklinika' ? '6' : '25'": t.use === 'poliklinika' ? '6' : '25' })));
  }

  /* ===== 6-qadam: Hajmlar (MR-Q2) ===== */
  private hajmPanel(body: HTMLElement): void {
    const doc = this.store.doc, fr = frame(doc.origin), plan = this.plan();
    if (this.selBlock != null && !plan.blocks[this.selBlock]) this.selBlock = null;
    this.loadGenFor(this.selBlock);
    const g = this.gen;
    const stp = (id: string, k: string, sub: string, v: number, min: number, max: number, step: number, set: (x: number) => void, unit?: string) =>
      h('div', { class: 'li' }, h('span', { class: 'k' }, k, sub ? h('span', { class: 'sub' }, sub) : ''), stepper({ id, label: k, min, max, step, value: v, unit, onchange: x => { set(x); this.renderPanel(); } }));
    body.append(dropdown({ id: 'genBlock', 'aria-label': tr('Kvartal'), onchange: v => { this.selBlock = v === '' ? null : Number(v); this.scene.selectBlock(this.selBlock); this.renderPanel(); } },
        [{ value: '', label: tr('— sahnada bosing yoki tanlang —'), selected: this.selBlock == null },
          ...plan.blocks.map((b, i) => ({ value: String(i), label: `${this.unitName(i)} · ${fmt(b.area / 1e4, 2)} ga`, sub: tr(useDef(b.use).name), selected: i === this.selBlock }))]),
      h('span', { class: 't-small' }, tr('yoki xaritada kvartal ichini bosing')), this.isoBtn(this.selBlock));
    const allBtn = () => h('button', { class: 'btn btn-lg', id: 'genAll', title: tr('Turar joy, aralash, ijtimoiy va savdo kvartallarining hammasi'), onclick: () => void useHeavy('gen').then(ok => { if (!ok) return; let n = 0, bad = 0; const cnt = plan.blocks.length; for (let i = 0; i < cnt; i++) { try { n += this.generateBlock(i, true); } catch (e) { bad++; console.error(`generateBlock ${i}`, e); } } toast(bad ? tf('${n} seksiya generatsiya qilindi; ${b} kvartalda xato — oʻtkazib yuborildi', { n, b: bad }) : tf('${n} seksiya generatsiya qilindi', { n })); }) }, tr('Hammasi'));
    const clearBtn = (i: number | null) => h('button', { class: 'btn btn-lg icon-btn', id: 'genClear', title: tr('Tozalash'), 'aria-label': tr('Tozalash'), disabled: i == null, onclick: () => { const u = i != null ? plan.blocks[i] : null, lab = i != null ? this.blockLabel(i) : null; if (u && lab) { const grp = u.parcelId ?? lab.id; this.run(() => this.store.dispatch({ type: 'replaceGroup', grp, sections: [], drop: staleGen(this.store.doc, grp, u.rings[0], []) })); } } }, svgIcon(IC.trash));
    const socI = this.selBlock != null && isSocial(plan.blocks[this.selBlock]?.use ?? '') ? this.selBlock : null;
    if (socI != null) {
      body.append(this.socialSection(socI),
        h('div', { class: 'row' }, h('button', { class: 'btn btn-primary btn-lg grow', id: 'genGo', onclick: () => void useHeavy('gen').then(ok => { if (ok) this.generateSocial(socI); }) }, tr('Joylashtirish'), this.ptag('gen')), allBtn(), clearBtn(socI)));
      if (this.genNotes.length) body.append(h('div', { class: 'note warn', id: 'genNotes' }, ...this.genNotes.map(n => h('div', {}, n))));
    } else {
      const ft = h('b', { class: 'num', style: 'min-width:48px;text-align:right' }, (g.far ?? 0) > 0 ? fmt(g.far!, 1) : tr('oʻchiq'));
      body.append(
        h('div', { class: 'glabel' }, h('span', {}, tr('Tipologiya')), h('span', {}, `${Object.keys(TYPO_NAME).length} ta`)),
        h('div', { class: 'tiles', role: 'group', 'aria-label': tr('Tipologiya') }, ...(Object.keys(TYPO_NAME) as Typology[]).map(k => h('button', { class: 'tile', 'aria-pressed': g.typology === k, 'data-typ': k, title: tr(TYPO_NAME[k]), onclick: () => { g.typology = k; this.renderPanel(); }, html: pg('typo', k) + `<span>${tr(TYPO_SHORT[k])}</span>` }))),
        h('div', { class: 'row' }, h('span', { class: 't-small', style: 'flex:none' }, tr('Maqsadli UMN (FAR)')), h('div', { class: 'grow' }, range({ min: 0, max: 6, step: 0.1, value: g.far ?? 0, id: 'gFar', 'aria-label': tr('Maqsadli UMN (FAR)'), oninput: v => { g.far = v; ft.textContent = v > 0 ? fmt(v, 1) : tr('oʻchiq'); } })), ft),
        h('span', { class: 't-small' }, tr(g.typology === 'avto' ? 'Avto: < 0,6 yakka uylar · < 1,3 villalar · < 3,5 perimetral blok · ≥ 3,5 blok + minora' : 'Berilsa — qavatlar shu qiymatga yaqinlashtiriladi (eng koʻp qavat — chegara)')),
        h('div', { class: 'group' },
          stp('gMax', tr('Qavat, eng koʻp'), '1–40', g.maxF, 1, 40, 1, x => { g.maxF = x; g.minF = Math.min(g.minF, x); }),
          stp('gMin', tr('eng kam'), '1–40', g.minF, 1, 40, 1, x => { g.minF = Math.min(x, g.maxF); }),
          stp('gDepth', tr('Chuqurlik'), '9–24 m', g.depth, 9, 24, 0.5, x => { g.depth = x; }, 'm'),
          stp('gLen', tr('Seksiya uzunligi'), '15–60 m', g.secLen, 15, 60, 1, x => { g.secLen = x; }, 'm'),
          (() => { const S0 = this.store.doc.settings, lim = lenLimit(S0.construct ?? 'monolit', S0.seismic); return lim != null && g.secLen > lim ? h('div', { class: 'li', id: 'seisLenNote' }, h('span', { class: 'chip warn' }, h('i'), tf('Seysmik boʻlma ≤ ${l} m', { l: lim })), h('span', { class: 't-small' }, tf('${s} ball, ${n} — generatsiyada seksiya ${l} m bilan cheklanadi (QMQ 2.01.03-19, 3.1-jadval)', { s: S0.seismic, n: SYS[S0.construct ?? 'monolit'].name, l: lim }))) : ''; })(),
          h('div', { class: 'li' }, h('span', { class: 'k' }, tr('Aniq oʻlcham'), h('span', { class: 'sub' }, tr(g.exact ? 'har seksiya aynan uzunlik × chuqurlik; qoldiq — izohda' : 'oʻchiq: qirra teng boʻlaklarga boʻlinadi (uzunlik — moʻljal)'))), sw({ id: 'gExact', label: tr('Aniq oʻlcham'), on: !!g.exact, onchange: v => { g.exact = v; this.renderPanel(); } })),
          stp('gSet', tr('Chekinish'), '0–20 m', g.setback, 0, 20, 0.5, x => { g.setback = x; }, 'm'),
          stp('gSty', tr('Stilobat'), tr('qavat'), g.stylobate ?? 0, 0, 3, 1, x => { g.stylobate = x; }),
          ...((g.parkNorm ?? true) ? [] : [stp('gPL', tr('Yer osti'), tr('sath'), g.parkLevels ?? 1, 1, 4, 1, x => { g.parkLevels = x; })])),
        ['perimetr', 'blok_minora', 'blok_villa', 'avto'].includes(g.typology) ? h('div', { class: 'group' }, h('div', { class: 'li' }, h('span', { class: 'k' }, tr('Har ~100 m da hovliga oʻtish (6 m)')), sw({ id: 'gPass', label: tr('Har ~100 m da hovliga oʻtish (6 m)'), on: g.passages, onchange: v => { g.passages = v; } }))) : '',
        ['minora', 'blok_minora', 'avto'].includes(g.typology) ? h('div', { class: 'group' }, stp('gTower', tr('Minora qavati'), '9–60', g.towerF ?? 16, 9, 60, 1, x => { g.towerF = x; })) : '',
        h('div', { class: 'glabel' }, h('span', {}, tr('Parkovka'))),
        h('div', { class: 'tiles c4', role: 'group', 'aria-label': tr('Parkovka') }, ...(Object.keys(PARK_NAME) as ParkingKind[]).map(k => h('button', { class: 'tile', 'aria-pressed': (g.parking ?? 'yoq') === k, 'data-park': k, onclick: () => { g.parking = k; this.renderPanel(); }, html: pg('park', k) + `<span>${tr(PARK_NAME[k])}</span>` }))),
        ...((g.parking ?? 'yoq') !== 'yoq' ? [
          h('div', { class: 'glabel' }, h('span', {}, tr('Joylashtirish moduli')), h('span', {}, tr('dizayn-kod 6.3'))),
          h('div', { class: 'tiles c4', role: 'group', 'aria-label': tr('Joylashtirish moduli') }, ...PARK_MODS.map(k => h('button', { class: 'tile', 'aria-pressed': (g.parkModule ?? 'p90') === k, 'data-pmod': k, title: `${tr(PARK_MOD[k].name)}: ${tr(PARK_MOD[k].src)}`, onclick: () => { g.parkModule = k; this.renderPanel(); }, 'aria-label': tr(PARK_MOD[k].name), html: pg('pmod', k) + `<span>${tr(PARK_MOD[k].short)}</span>` }))),
          h('div', { class: 'group' }, h('div', { class: 'li' }, h('span', { class: 'k' }, tr('Joylar soni meʼyor boʻyicha'), h('span', { class: 'sub' }, tr('29-jadval talabi; yer osti sathlari avtomatik'))), sw({ id: 'gPNorm', label: tr('Joylar soni meʼyor boʻyicha'), on: g.parkNorm ?? true, onchange: v => { g.parkNorm = v; this.renderPanel(); } })))] : []),
        h('div', { class: 'row' },
          h('button', { class: 'btn btn-primary btn-lg grow', id: 'genGo', disabled: this.selBlock == null, onclick: () => { const i = this.selBlock; if (i != null) void useHeavy('gen').then(ok => { if (ok) this.generateBlock(i); }); } }, tr('Variant taklif qil'), this.ptag('gen')),
          allBtn(), clearBtn(this.selBlock)));
      if (this.genNotes.length || this.genFar != null) body.append(h('div', { class: 'note warn', id: 'genNotes' }, ...(this.genFar != null ? [h('div', {}, h('b', {}, `${tr('Parsel UMN')}: ${fmt(this.genFar, 2)}`))] : []), ...this.genNotes.map(n => h('div', {}, n))));
    }
    // binolar soni va tanlangan seksiya
    const sel = doc.buildings.find(b => b.id === this.sel), gens = doc.buildings.filter(b => b.gen).length;
    body.append(h('div', { class: 'group' }, h('div', { class: 'li', id: 'bldSt' }, h('span', { class: 'k' }, h('b', {}, `${doc.buildings.length} ${tr('bino/seksiya')}`), gens ? ` · ${tr('shundan generatsiya')} ${gens}` : '', h('span', { class: 'sub' }, tr('Seksiyani sahnada bosing — qavatini oʻzgartiring yoki oʻchiring.'))))));
    if (sel) {
      // (amalda koʻrinmaydi — bino tanlanganda inspektor panelni egallaydi; kelajakdagi «Loyiha bosqichlari» uchun saqlanadi)
      const kind = sel.gen ? (({ burchak: 'Burchak seksiyasi', oddiy: 'Oddiy seksiya', qator: 'Qator seksiyasi', uy: 'Yakka uy', taunhaus: 'Taunhaus', villa: 'Villa', minora: 'Minora', stilobat: 'Stilobat' } as Record<string, string>)[sel.gen.kind] ?? 'Seksiya') : 'Bino';
      body.append(h('div', { class: 'group' }, h('div', { class: 'li', 'aria-selected': true, 'data-bid': sel.id },
        h('span', { class: 'k' }, `${tr(kind)} · ${sel.floors} ${tr('qavat')}${sel.nonRes ? ` (${sel.nonRes} ${tr('noturar')})` : ''}`),
        h('button', { class: 'btn btn-sm icon-btn', title: tr('Qavat −'), 'aria-label': tr('Qavat −'), id: 'flMinus', onclick: () => this.run(() => this.store.dispatch({ type: 'updateBuilding', id: sel.id, patch: { floors: sel.floors - 1 } }, 'fl-' + sel.id)) }, '−'),
        h('button', { class: 'btn btn-sm icon-btn', title: tr('Qavat +'), 'aria-label': tr('Qavat +'), id: 'flPlus', onclick: () => this.run(() => this.store.dispatch({ type: 'updateBuilding', id: sel.id, patch: { floors: sel.floors + 1 } }, 'fl-' + sel.id)) }, '+'),
        h('button', { class: 'btn btn-sm icon-btn btn-ghost', title: tr('Oʻchirish'), 'aria-label': tr('Oʻchirish'), onclick: () => this.store.dispatch({ type: 'removeBuilding', id: sel.id }) }, svgIcon(IC.x)))));
    }
    // qoʻlda chizish
    const fl = h('input', { type: 'number', class: 'input', min: 1, max: 60, value: this.floors, id: 'fl', 'aria-label': tr('Qavatlar') }) as HTMLInputElement;
    const nr = h('input', { type: 'number', class: 'input', min: 0, max: 10, value: this.nonRes, id: 'nr', 'aria-label': tr('Noturar pastki') }) as HTMLInputElement;
    fl.onchange = () => { this.floors = Math.max(1, Math.min(60, Math.round(Number(fl.value) || 1))); };
    nr.onchange = () => { this.nonRes = Math.max(0, Math.min(10, Math.round(Number(nr.value) || 0))); };
    const drawing = this.tool instanceof RectTool, drawingP = this.tool instanceof PolygonTool && this.step.id === 'hajm', drawingA = this.tool instanceof AxisTool;
    const addB = (r: XY[]) => { this.run(() => this.store.dispatch({ type: 'addBuilding', footprint: r.map(fr.toGeo), floors: this.floors, nonRes: this.nonRes })); this.el.hint.textContent = this.tool?.hint ?? ''; };
    body.append(this.lowRowBox(fr));
    body.append(h('details', { class: 'how manual', open: drawing || drawingP || drawingA || !gens }, h('summary', {}, svgIcon(IC.pencil), tr('Qoʻlda bino chizish')),
      h('div', { class: 'col' },
        h('div', { class: 'row2' }, h('div', { class: 'field' }, h('label', {}, tr('Qavatlar')), fl), h('div', { class: 'field' }, h('label', {}, tr('Noturar pastki')), nr)),
        h('div', { class: 'row', style: 'flex-wrap:wrap' },
          // oʻq boʻylab (egasi, 30.10): burilgan uchastkada koʻchaga parallel bino — fasad chizigʻi + chuqurlik; keyingi binolar uchun asbob qoladi
          h('button', { class: drawingA ? 'btn btn-primary grow' : 'btn grow', style: 'min-width:118px', id: 'drawAxis', title: tr('Fasad chizigʻini chizing — toʻrtburchak shu yoʻnalishda, berilgan chuqurlikda quriladi'), onclick: () => drawingA ? this.setTool(null) : this.setTool(new AxisTool(this.scene, r => { addB(r); this.renderPanel(); }, toast, { depth: () => this.axisDepth, guide: p => this.edgeDir(p) })) }, ...(drawingA ? [tr('Toʻxtatish')] : icl(IC.plus, tr('Oʻq boʻylab')))),
          h('button', { class: drawing ? 'btn btn-primary grow' : 'btn grow', style: 'min-width:118px', id: 'drawBld', onclick: () => drawing ? this.setTool(null) : this.setTool(new RectTool(this.scene, r => {
            this.run(() => this.store.dispatch({ type: 'addBuilding', footprint: r.map(fr.toGeo), floors: this.floors, nonRes: this.nonRes }));
            this.el.hint.textContent = this.tool?.hint ?? '';
          }, toast)) }, ...(drawing ? [tr('Toʻxtatish')] : icl(IC.plus, tr('Toʻrtburchak')))),
          h('button', { class: drawingP ? 'btn btn-primary grow' : 'btn grow', style: 'min-width:118px', id: 'drawPoly', title: tr('Erkin shakl: nuqtalarni bosing, birinchi nuqta yoki Enter — yopish'), onclick: () => drawingP ? this.endTool() : this.setTool(new PolygonTool(this.scene, r => {
            this.run(() => this.store.dispatch({ type: 'addBuilding', footprint: r.map(fr.toGeo), floors: this.floors, nonRes: this.nonRes }));
            this.setTool(new PolygonTool(this.scene, r2 => { this.run(() => this.store.dispatch({ type: 'addBuilding', footprint: r2.map(fr.toGeo), floors: this.floors, nonRes: this.nonRes })); }, toast, 20));
          }, toast, 20)) }, ...(drawingP ? [tr('Toʻxtatish')] : icl(IC.plus, tr('Erkin shakl'))))),
        drawingA ? this.axisRow() : drawingP || drawing ? this.dimRow(drawing) : '',
        h('span', { class: 't-small' }, tr('Uchlar va qirralarga yopishadi (Shift — oʻchiq). Kesma uzunligi chiziqda koʻrinadi.')))));
  }
  /**
   * Past qavatli uylar qatori chiziq boʻylab (egasi, 31.10): chiziq (koʻcha oʻqi yoki qurilish chizigʻi) chiziladi — bir yoki ikki
   * tomoniga avval uchastkalar, keyin uylar (core/lowrise: 74, 75, 100, 101-band; Strelka 3-bob). Chekinish — chiziqdan uchastka
   * boshigacha (koʻcha oʻqi boʻlsa — yarim eni). Koʻcha koridori va mavjud binolar ustiga tushgan uchastkalar olinmaydi.
   */
  private lowKind: LowKind = 'taunhaus';
  private lowSide: 1 | -1 | 0 = 1;
  private lowOff = 0;
  private lowRowBox(fr: ReturnType<typeof frame>): HTMLElement {
    const drawingL = this.tool instanceof LineTool && this.step.id === 'hajm';
    const seg = <T extends string | number>(id: string, label: string, opts: [T, string][], cur: T, set: (v: T) => void) => h('div', { class: 'seg sm', id, role: 'group', 'aria-label': tr(label) }, ...opts.map(([v, n]) => h('button', { 'data-v': String(v), 'aria-pressed': cur === v, onclick: () => { set(v); this.renderPanel(); } }, tr(n))));
    const off = h('input', { type: 'number', class: 'input', id: 'lowOff', min: 0, max: 30, step: '0.5', value: this.lowOff, 'aria-label': tr('Chiziqdan chekinish, m') }) as HTMLInputElement;
    off.onchange = () => { const v = Number(String(off.value).replace(',', '.')); this.lowOff = Number.isFinite(v) ? Math.max(0, Math.min(30, v)) : 0; };
    const P = LOW[this.lowKind];
    const place = (line: XY[]) => {
      const doc = this.store.doc, plan = this.plan(), sides: (1 | -1)[] = this.lowSide === 0 ? [1, -1] : [this.lowSide];
      const blockers = [...plan.corridors.flatMap(p => p.map(r => r)), ...doc.buildings.map(b => b.footprint.map(fr.toLocal))];
      const hit = (r: XY[]) => blockers.some(q => q.length >= 3 && (r.some(p => pointIn(p, [q])) || q.some(p => pointIn(p, [r]))));
      const houses = sides.flatMap(sd => lowriseAlong(this.lowOff > 0 ? offsetLine(line, sd * this.lowOff) : line, sd, this.lowKind, doc.site ? doc.site.rings[0].map(fr.toLocal) : null)).filter(hh => !hit(hh.plot.map(p => [p[0] * 0.98 + hh.ring[0][0] * 0.02, p[1] * 0.98 + hh.ring[0][1] * 0.02] as XY)) && !hit(hh.ring));
      if (!houses.length) { toast(tr('Chiziq boʻylab uy sigʻmadi — chiziq qisqa yoki koʻcha / bino ustiga tushadi')); return; }
      this.run(() => this.store.dispatch({ type: 'replaceGroup', grp: uid('qator_'), sections: houses.map(hh => ({ footprint: hh.ring.map(fr.toGeo), floors: hh.floors, nonRes: 0, use: 'turar' as Use, kind: hh.kind, plot: hh.plot.map(fr.toGeo) })) }));
      toast(tf('${n} ta uy chiziq boʻylab qoʻyildi', { n: houses.length }));
      if (this.tool) this.el.hint.textContent = this.tool.hint;
    };
    return h('details', { class: 'how manual', id: 'lowRow', open: drawingL }, h('summary', {}, svgIcon(IC.pencil), tr('Past qavatli uylar qatori')),
      h('div', { class: 'col' },
        seg<LowKind>('lowKind', 'Uy turi', [['yakka', 'Yakka uy'], ['juft', 'Juft'], ['taunhaus', 'Taunhaus'], ['hovli', 'Hovli'], ['klaster', 'Klaster']], this.lowKind, v => { this.lowKind = v; }),
        seg<1 | -1 | 0>('lowSide', 'Tomon', [[1, 'Chapga'], [-1, 'Oʻngga'], [0, 'Ikkala tomon']], this.lowSide, v => { this.lowSide = v; }),
        h('div', { class: 'field' }, h('label', {}, tr('Chiziqdan chekinish, m')), off),
        h('span', { class: 't-small' }, this.lowKind === 'yakka'
          ? tf('Uchastka ${w} × ${d} m (≥ 400 m², 75-band), oldi ${f} m, yon 3 m (100-band), 2 qavat', { w: P.plotW, d: P.plotD, f: P.front })
          : this.lowKind === 'taunhaus' ? tf('Blok eni ${w} m, uchastka ≥ 200 m² (74-band), qator ≤ 15 uy va ≤ 100 m, oraliq ${g} m (Strelka), 3 qavat', { w: P.plotW, g: P.gap })
          : this.lowKind === 'juft' ? tf('Ikki xonadonli uy: uchastka ${w} × ${d} m, umumiy devor (101-band), tashqi yon 3 m, juftlar orasi 6 m, 2 qavat', { w: P.plotW, d: P.plotD })
          : tf('Hovli uy: uchastka ${w} × ${d} m, L shakl uy chegarada (101-band), hovli ichkarida, qoʻshnigacha 7 m, 1 qavat', { w: P.plotW, d: P.plotD })),
        h('button', { class: drawingL ? 'btn btn-primary' : 'btn', id: 'lowDraw', onclick: () => drawingL ? this.endTool() : this.setTool(new LineTool(this.scene, r => place(r), toast, p => p, 'Uylar qatori chizigʻi: nuqtalarni bosing · 2× bosish yoki Enter — qoʻyish · Esc — bekor')) }, ...(drawingL ? icl(IC.check, tr('Chizishni tugatish')) : icl(IC.plus, tr('Chiziq chizish'))))));
  }
  /** «Oʻq boʻylab» chuqurligi (m): paneldagi maydon; boshlangʻich — generator chuqurligi */
  private axisDepth = 15;
  private axisRow(): HTMLElement {
    const num = (id: string, ph: string, label: string, v = '') => h('input', { type: 'number', class: 'input', id, placeholder: ph, step: '0.5', 'aria-label': label, value: v }) as HTMLInputElement;
    const val = (i: HTMLInputElement) => { const v = Number(String(i.value).replace(',', '.')); return i.value !== '' && Number.isFinite(v) ? v : null; };
    const after = () => { if (this.tool) this.el.hint.textContent = this.tool.hint; };
    const len = num('axisLen', '32', tr('Uzunlik, m')), ang = num('axisAng', tr('kursor'), tr('Burchak, °')), dep = num('axisDepth', '15', tr('Chuqurlik, m'), String(this.axisDepth));
    dep.onchange = () => { const d = val(dep); if (d && d >= 4) this.axisDepth = d; };
    const go = () => {
      const tt = this.tool; if (!(tt instanceof AxisTool)) return;
      const d = val(dep); if (d && d >= 4) this.axisDepth = d;
      if (tt.stage === 1) { const L = val(len); if (!(L && L > 0)) { toast(tr('Uzunlikni kiriting')); return; } if (tt.placeLen(L, val(ang))) { len.value = ''; if (d) tt.placeDepth(d); } }
      else if (tt.stage === 2) { if (!d) { toast(tr('Chuqurlikni kiriting')); return; } tt.placeDepth(d); }
      else toast(tr('Avval sahnada fasad chizigʻining boshini bosing'));
      after();
    };
    for (const i of [len, ang, dep]) i.onkeydown = e => { if (e.key === 'Enter') go(); };
    return h('div', { class: 'col', id: 'dimBox' }, h('div', { class: 'row', style: 'align-items:flex-end;flex-wrap:wrap' },
      h('div', { class: 'field grow', style: 'min-width:76px' }, h('label', {}, tr('Uzunlik')), h('span', { class: 'unit' }, len, h('span', {}, 'm'))),
      h('div', { class: 'field grow', style: 'min-width:76px' }, h('label', {}, tr('Burchak')), h('span', { class: 'unit' }, ang, h('span', {}, '°'))),
      h('div', { class: 'field grow', style: 'min-width:76px' }, h('label', {}, tr('Chuqurlik')), h('span', { class: 'unit' }, dep, h('span', {}, 'm'))),
      h('button', { class: 'btn', id: 'axisPut', onclick: go }, tr('Qoʻyish'))),
      h('span', { class: 't-small' }, tr('Fasad chizigʻi: boshini bosing, oxirini bosing (yaqin qirraga parallel yopishadi) yoki uzunlikni kiriting; keyin kursor bilan tomon va chuqurlik — yoki chuqurlikni kiriting. Sahnada «32<45», «15» yoki «32x15» yozib Enter ham boʻladi.')));
  }
  /** Nuqtaga eng yaqin qirra (uchastka, bino, koʻcha oʻqi; 25 m gacha) yoʻnalishi, ° — chizish burchagi shunga yopishadi */
  private edgeDir(p: XY): number | null {
    const doc = this.store.doc, fr = frame(doc.origin);
    let best: number | null = null, bd = 25;
    const seg = (a: XY, b: XY) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy; if (L2 < 1) return; const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)), d = Math.hypot(a[0] + t * dx - p[0], a[1] + t * dy - p[1]); if (d < bd) { bd = d; best = Math.atan2(dy, dx) * 180 / Math.PI; } };
    if (doc.site) for (const r0 of doc.site.rings) { const r = r0.map(fr.toLocal); for (let i = 0; i < r.length; i++) seg(r[i], r[(i + 1) % r.length]); }
    for (const b of doc.buildings) { const r = b.footprint.map(fr.toLocal); for (let i = 0; i < r.length; i++) seg(r[i], r[(i + 1) % r.length]); }
    for (const st of doc.streets) { const r = st.axis.map(fr.toLocal); for (let i = 1; i < r.length; i++) seg(r[i - 1], r[i]); }
    for (const rd of this.ctxMgr.current?.osm.roads ?? []) { const r = rd.pts.map(fr.toLocal); for (let i = 1; i < r.length; i++) seg(r[i - 1], r[i]); }
    return best;
  }
  /**
   * Oʻlcham bilan chizish (egasi, 25.10): erkin shaklda — keyingi tomon uzunligi va ixtiyoriy burchak; toʻrtburchakda — eni × boʻyi.
   * Klaviaturada ham: sahnada yozib Enter («32», «32<90», «32x18»).
   */
  private dimRow(rect: boolean): HTMLElement {
    const num = (id: string, ph: string, label: string) => h('input', { type: 'number', class: 'input', id, placeholder: ph, step: '0.1', 'aria-label': label }) as HTMLInputElement;
    const val = (i: HTMLInputElement) => { const v = Number(String(i.value).replace(',', '.')); return i.value !== '' && Number.isFinite(v) ? v : null; };
    const after = () => { if (this.tool) this.el.hint.textContent = this.tool.hint; };
    if (rect) {
      const w = num('rectW', '32', tr('Eni, m')), hh = num('rectH', '18', tr('Boʻyi, m'));
      const go = () => { const a = val(w), b = val(hh); if (!(a && b && a > 0 && b > 0)) { toast(tr('Eni va boʻyini kiriting')); return; } const tt = this.tool; if (tt instanceof RectTool) tt.placeWH(a, b); after(); };
      hh.onkeydown = e => { if (e.key === 'Enter') go(); };
      return h('div', { class: 'col', id: 'dimBox' }, h('div', { class: 'row', style: 'align-items:flex-end' },
        h('div', { class: 'field grow' }, h('label', {}, tr('Eni')), h('span', { class: 'unit' }, w, h('span', {}, 'm'))),
        h('div', { class: 'field grow' }, h('label', {}, tr('Boʻyi')), h('span', { class: 'unit' }, hh, h('span', {}, 'm'))),
        h('button', { class: 'btn', id: 'rectPut', onclick: go }, tr('Qoʻyish'))),
        h('span', { class: 't-small' }, tr('Avval sahnada birinchi burchakni bosing — toʻrtburchak kursor tomonga shu oʻlchamda quriladi. Sahnada «32x18» yozib Enter ham boʻladi.')));
    }
    const len = num('drawLen', '32', tr('Tomon uzunligi, m')), ang = num('drawAng', tr('kursor'), tr('Burchak, °'));
    const go = () => { const L = val(len); if (!(L && L > 0)) { toast(tr('Tomon uzunligini kiriting')); return; } const tt = this.tool; if (tt instanceof PolygonTool && tt.addSide(L, val(ang))) { len.value = ''; len.focus(); } after(); };
    len.onkeydown = e => { if (e.key === 'Enter') go(); }; ang.onkeydown = e => { if (e.key === 'Enter') go(); };
    return h('div', { class: 'col', id: 'dimBox' }, h('div', { class: 'row', style: 'align-items:flex-end' },
      h('div', { class: 'field grow' }, h('label', {}, tr('Keyingi tomon')), h('span', { class: 'unit' }, len, h('span', {}, 'm'))),
      h('div', { class: 'field grow' }, h('label', {}, tr('Burchak')), h('span', { class: 'unit' }, ang, h('span', {}, '°'))),
      h('button', { class: 'btn', id: 'drawAdd', onclick: go }, tr('Qoʻshish'))),
      h('span', { class: 't-small' }, tr('Birinchi nuqtani sahnada bosing, keyin tomonlarni oʻlcham bilan qoʻshing: yoʻnalish — kursor tomon yoki burchak (0° — sharq, 90° — shimol). Sahnada «32» yoki «32<90» yozib Enter ham boʻladi. Yopish — Enter yoki birinchi nuqtani bosish.')));
  }

  /* ---------- 2-bosqich: koʻchalar, parsellar, yashil ---------- */
  private plan(): PlanGeo {
    const d = this.store.doc;
    if (this.planCache?.doc !== d) this.planCache = { doc: d, plan: computePlan(d) };
    return this.planCache.plan;
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
  private lastHint = '';
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
      return { id: s.id, pts: s.axis.map(fr.toLocal), closed: false, min: 2, street: true, apply: (pts, key) => { const prev = this.plan(); this.run(() => this.store.dispatch({ type: 'updateStreet', id: s.id, patch: { axis: pts.map(fr.toGeo) } }, key)); this.regenAfterStreets(prev); } }; }
    if (st === 'uchastka' && doc.site) { const r = doc.site.rings;
      return { id: 'site', pts: r[0].map(fr.toLocal), closed: true, min: 3, apply: (pts, key) => { const rr = [pts.map(fr.toGeo), ...r.slice(1)]; this.run(() => this.store.dispatch({ type: 'setSite', rings: rr }, key)); } }; }
    if (st === 'parsel' && this.selBlock != null) { const b = this.plan().blocks[this.selBlock], pc = b?.parcelId ? doc.parcels.find(p => p.id === b.parcelId) : null; if (!pc) return null;
      return { id: pc.id, pts: pc.rings[0].map(fr.toLocal), closed: true, min: 3, apply: (pts, key) => this.run(() => this.store.dispatch({ type: 'updateParcel', id: pc.id, patch: { rings: [pts.map(fr.toGeo), ...pc.rings.slice(1)] } }, key)) }; }
    if (st === 'hajm' && this.sel && this.dragMode !== 'yoq') { const b = doc.buildings.find(x => x.id === this.sel); if (!b) return null;
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
  /** toʻr qoʻllashda uchastkani kesib oʻtgan mavjud koʻchalar saqlanadi (loyihaga olinadi, toʻr ular orasiga) */
  private gridKeep = true;
  /** toʻr qoʻllashda uchastka perimetri boʻylab koʻcha (qizil chiziq — uchastka chegarasi) */
  private gridPerim = false;
  private gridPerimProf = 'mahalla-15';

  /** Uchastkani kesib oʻtgan mavjud (OSM) avtomobil yoʻllari: kontekst kvadratiga qirqilgan oʻq, mos profil va koridor yarmi */
  private siteRoads(): { osm: number; axis: XY[]; profile: string; half: number }[] {
    const doc = this.store.doc, b = this.ctxMgr.current; if (!b || !doc.site || !doc.context.loaded) return [];
    const fr = frame(doc.origin), site = doc.site.rings[0].map(fr.toLocal), R = doc.context.radius;
    const skip = new Set([...doc.streets.map(x => x.osm), ...(doc.removedRoads ?? [])]);
    const NOT = /^(footway|path|cycleway|steps|track|bridleway|corridor|pedestrian|construction|proposed|platform|raceway)$/;
    const out: { osm: number; axis: XY[]; profile: string; half: number }[] = [];
    for (const r of b.osm.roads) {
      if (skip.has(r.id) || NOT.test(r.cls) || (r.cls === 'service' && /driveway|parking_aisle|drive-through|emergency_access/.test(r.sub ?? ''))) continue;
      const loc = r.pts.map(fr.toLocal); if (!lineHitsRing(loc, site)) continue;
      const axis = clipLine(loc, -R, -R, R, R).sort((a, c) => c.length - a.length)[0] ?? loc; if (axis.length < 2) continue;
      const profile = profileForOsm(r.cls); out.push({ osm: r.id, axis, profile, half: profileWidth(profileById(profile)) / 2 });
    }
    return out;
  }
  private compOpen = true;
  /** Insolyatsiya kompasi (egasi, 30.10): toʻr burchagini insolyatsiya boʻyicha tanlash — SanQvaN 0102-25, 94–95 (22.03–22.09, 2 soat uzluksiz), 15-band (gʻarb 200–290°) */
  private compassMemo: { key: string; c: Compass } | null = null;
  private compassBox(site: XY[], g: GridParams): HTMLElement {
    const doc = this.store.doc, H = Math.max(6, Math.round(this.gen.maxF * doc.settings.floorHeight)), key = `${doc.origin.map(v => v.toFixed(3)).join(',')}|${H}`;
    if (this.compassMemo?.key !== key) this.compassMemo = { key, c: insolCompass(doc.origin[1], doc.origin[0], { H }) };
    const c = this.compassMemo.c, cur = (((g.angle ?? autoAngle(site)) % 90) + 90) % 90, row = c.rows.reduce((a, b) => Math.abs(b.deg - cur) < Math.abs(a.deg - cur) ? b : a);
    const col = (h0: number) => h0 >= 2 ? '#3fa66b' : h0 >= 1.5 ? '#e0a43a' : h0 > 0.3 ? '#d9534f' : 'var(--line, #c9c6bf)';
    const R = 54, C = 70, P = (az: number, r: number): [number, number] => [C + r * Math.sin(az * Math.PI / 180), C - r * Math.cos(az * Math.PI / 180)];
    const arc = (a0: number, a1: number, r0: number, r1: number) => { const [x0, y0] = P(a0, r1), [x1, y1] = P(a1, r1), [x2, y2] = P(a1, r0), [x3, y3] = P(a0, r0); return `M${x0.toFixed(1)},${y0.toFixed(1)}A${r1},${r1} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)}L${x2.toFixed(1)},${y2.toFixed(1)}A${r0},${r0} 0 0 0 ${x3.toFixed(1)},${y3.toFixed(1)}Z`; };
    let svg = '';
    for (const s of c.ring) svg += `<path d="${arc(s.az - 2.5, s.az + 2.5, R - 12, R)}" fill="${col(s.run)}" stroke="none"><title>${s.az}°: ${(Math.round(s.run * 10) / 10).toString().replace('.', ',')} h</title></path>`;
    svg += `<path d="${arc(200, 290, R + 2, R + 6)}" fill="none" stroke="#a3322a" stroke-width="1.2" stroke-dasharray="3 2"/>`;   // 15-band
    for (const f of row.facades) { const [x, y] = P(f.az, R - 14), [tx, ty] = P(f.az, R - 26); svg += `<line x1="${C}" y1="${C}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><text x="${tx.toFixed(1)}" y="${(ty + 3.5).toFixed(1)}" text-anchor="middle" font-size="9" font-weight="600" fill="currentColor">${(Math.round(f.run * 10) / 10).toString().replace('.', ',')}</text>`; }
    svg += `<text x="${C}" y="9" text-anchor="middle" font-size="9" font-weight="700" fill="currentColor">N</text>`;
    const best = c.best[0], bestOk = c.rows.find(r => r.deg === best)!;
    const bad = row.facades.filter(f => f.run < 2), west = row.facades.filter(f => f.west);
    const applyBest = () => { g.angle = best; this.gridVar = 0; this.renderPanel(); };
    return h('div', { class: 'group', id: 'insolCompass' },
      h('div', { class: 'li' }, h('span', { class: 'k' }, tr('Insolyatsiya kompasi'), h('span', { class: 'sub' }, tf('22 mart, 2-qavat derazasi, qarshida 2·H = ${d} m masofada ${h} m qator', { d: Math.round(c.D), h: H }) + ' · SanQvaN 0102-25, 94–95, 15-band'))),
      h('div', { class: 'li', style: 'gap:12px;align-items:center;overflow:visible;flex-wrap:wrap' },
        h('span', { style: 'flex:none;display:block;width:148px;height:148px', html: `<svg width="148" height="148" viewBox="-4 -4 148 148" role="img" aria-label="${tr('Insolyatsiya kompasi')}" style="display:block;overflow:visible">${svg}</svg>` }),
        h('div', { class: 'col', style: 'gap:6px;min-width:120px;flex:1' },
          h('span', { class: row.ok === 4 ? 'chip ok' : 'chip warn', style: 'align-self:flex-start' }, h('i'), tf('${n} / 4 fasad ≥ 2 soat', { n: row.ok })),
          bad.length ? h('span', { class: 't-small' }, `${tr('Kam')}: ${bad.map(f => `${f.az}° — ${(Math.round(f.run * 10) / 10).toString().replace('.', ',')} h`).join(', ')}`) : '',
          west.length ? h('span', { class: 't-small' }, tf('Gʻarbga (200–290°) qaragan fasad: ${a}° — bu tomondagi kvartiralar ikki tomonlama boʻlsin (15-band)', { a: west.map(f => f.az).join(', ') })) : '',
          Math.abs(row.deg - best) > 2 ? h('button', { class: 'btn btn-sm', id: 'gridBest', style: 'align-self:flex-start', onclick: applyBest }, tf('Mos burchak: ${a}° (${n} / 4, eng kami ${m} h)', { a: best, n: bestOk.ok, m: (Math.round(bestOk.min * 10) / 10).toString().replace('.', ',') })) : h('span', { class: 't-small' }, tr('Insolyatsiya boʻyicha eng maqbul burchak')))));
  }
  private gridThumb(site: XY[], g: GridParams, w = 112, hh = 80): string {
    const xs = site.map(p => p[0]), ys = site.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const k = Math.min((w - 8) / Math.max(1, x1 - x0), (hh - 8) / Math.max(1, y1 - y0)), ox = (w - (x1 - x0) * k) / 2, oy = (hh - (y1 - y0) * k) / 2;
    const P = (p: XY) => `${(ox + (p[0] - x0) * k).toFixed(1)},${(oy + (y1 - p[1]) * k).toFixed(1)}`;
    const lines = gridStreets(site, g).map(st => `<path d="M${P(st.axis[0])}L${P(st.axis[1])}" stroke="${st.main ? '#1a1c1e' : '#6f6a60'}" stroke-width="${st.main ? 1.6 : 0.9}"/>`).join('');
    return `<svg viewBox="0 0 ${w} ${hh}" width="${w}" height="${hh}"><path d="M${site.map(P).join('L')}Z" fill="#f3e3b4" stroke="#c0392b" stroke-width="0.8"/>${lines}</svg>`;
  }
  /** Toʻr yorligʻi: blok moduli, oʻlcham, joylashuv varianti, burilish, profillar, qoʻllash */
  private gridPanel(body: HTMLElement): void {
    const doc = this.store.doc, fr = frame(doc.origin), site = doc.site!.rings[0].map(fr.toLocal), g = this.grid;
    const has = doc.streets.some(s => s.gen === 'grid');
    const box = h('div', { class: 'col', id: 'gridBox' });
    const vars = gridVariants(site, g), pre = GRID_PRESETS.find(p => p.id === this.gridPreset);
    const roads = this.siteRoads(), keep = this.gridKeep ? roads : [];
    // saqlanadiganlar: yangi olinadigan mavjud koʻchalar + loyihadagi toʻrdan boshqa koʻchalar (avval olingan yoki qoʻlda chizilgan), uchastkani kesib oʻtsa
    const ownAll = doc.streets.filter(st => st.gen !== 'grid').map(st => ({ axis: st.axis.map(fr.toLocal), half: profileWidth(profileById(st.profile)) / 2 })).filter(st => lineHitsRing(st.axis, site));
    const pHalf = profileWidth(profileById(this.gridPerimProf)) / 2, perim = this.gridPerim ? perimeterAxis(site, pHalf) : null;
    const keepC = [...keep.map(r => ({ axis: r.axis, half: r.half })), ...(this.gridKeep ? ownAll : []), ...(perim ? [{ axis: perim, half: pHalf }] : [])], nKeep = roads.length + ownAll.length;
    const apply = () => {
      const v = vars[this.gridVar] ?? vars[0], sts = gridStreetsAround(site, keepC, v.g);
      if (!sts.length && !keepC.length) { toast(tr('Uchastka tanlangan modul uchun kichik — modulni kichraytiring')); return; }
      /* toʻr va uchlarni yoʻllarga ulash — bitta buyruq: sahna, panel va hisob bir marta qayta quriladi, tarixda bitta qadam */
      const pAx = perim ? perimeterAxis(site, pHalf, sts.flatMap(st => [st.axis[0], st.axis[st.axis.length - 1]])) : null;   // birikish — toʻr uchlaridan uzoqda
      const all = pAx ? [{ axis: pAx, profile: this.gridPerimProf }, ...sts] : sts;
      const cmd: Extract<Command, { type: 'setGridStreets' }> = { type: 'setGridStreets', streets: all.map(st => ({ id: uid('s_'), axis: st.axis.map(fr.toGeo), profile: st.profile })), adopt: keep.map(r => ({ id: uid('s_'), axis: r.axis.map(fr.toGeo), profile: r.profile, osm: r.osm })) };
      let n = 0; this.run(() => { const r = this.streetEndPatches(applyCmd(this.store.doc, cmd)); n = r.n; this.store.dispatch({ ...cmd, patches: r.patches }); }); toast(`${sts.length + (perim ? 1 : 0)} ${tr('ta koʻcha')} · ${this.plan().blocks.length} ${tr('kvartal')}${n ? ` · ${n} ${tr('uch yoʻllarga ulandi')}` : ''}`);
    };
    const num = (lbl: string, key: 'w' | 'h', min: number, max: number) => { const inp = h('input', { type: 'number', class: 'input', min, max, step: 1, value: g[key], 'aria-label': lbl }) as HTMLInputElement; inp.onchange = () => { const v = Number(inp.value); if (v >= min && v <= max) { g[key] = v; this.gridPreset = ''; this.renderPanel(); } }; return h('div', { class: 'field grow' }, h('label', {}, lbl), h('span', { class: 'unit' }, inp, h('span', {}, 'm'))); };
    const angV = g.angle == null ? 0 : Math.round(g.angle - autoAngle(site));
    const angT = h('b', { class: 'num', id: 'gridAngV', style: 'min-width:64px;text-align:right' }, `${angV}°${angV === 0 ? ' · avto' : ''}`);
    const ang = range({ min: -90, max: 90, step: 5, value: angV, id: 'gridAng', 'aria-label': tr('Burilish'), oninput: v => { g.angle = autoAngle(site) + v; this.gridVar = 0; angT.textContent = `${v}°${v === 0 ? ' · avto' : ''}`; }, onchange: () => this.renderPanel() });
    const mainSel = select({ id: 'gridMain', 'aria-label': tr('Asosiy koʻchalar'), onchange: v => { g.mainEvery = Number(v); this.renderPanel(); } }, [[0, 'Hammasi ikkilamchi'], [2, 'Har 2-chisi asosiy'], [3, 'Har 3-chisi asosiy'], [4, 'Har 4-chisi asosiy']].map(([v, t]) => ({ value: String(v), label: tr(t as string), selected: g.mainEvery === v })));
    const profRow = (key: 'main' | 'minor', lbl: string) => { const p = profileById(g.profiles[key]), iss = checkProfile(p).length;
      const sel = select({ 'aria-label': lbl, onchange: v => { g.profiles = { ...g.profiles, [key]: v }; this.renderPanel(); } }, PROFILES.map(x => ({ value: x.id, label: `${x.name} · ${fmt(profileWidth(x), 0)} m`, selected: g.profiles[key] === x.id })));
      return h('div', { class: 'li prof-row', style: 'flex-wrap:wrap' }, h('span', { class: 'chip' }, lbl), h('span', { style: 'flex:1' }), h('span', { class: iss ? 'chip warn' : 'chip ok' }, h('i'), iss ? `${iss} ${tr('chetlanish')}` : 'ShNQ ✓'), h('span', { class: 'v' }, `${fmt(profileWidth(p), 0)} m`), h('span', { class: 'k', style: 'flex-basis:100%' }, p.name, h('span', { class: 'sub' }, p.note)), h('div', { style: 'flex-basis:100%' }, sel)); };
    box.append(
      h('div', { class: 'glabel' }, h('span', {}, tr('Blok moduli')), h('span', {}, pre ? `${pre.name} · ${g.w} × ${g.h} m` : `${g.w} × ${g.h} m`)),
      h('div', { class: 'tiles c4', role: 'listbox', 'aria-label': tr('Blok modullari') }, ...GRID_PRESETS.map(p => h('button', { class: 'tile', 'data-gpre': p.id, 'aria-pressed': this.gridPreset === p.id, title: `${p.note} · ${p.src}`, onclick: () => { this.gridPreset = p.id; g.w = p.w; g.h = p.h; this.renderPanel(); } },
        h('span', { class: 'th', html: this.gridThumb(site, { ...g, w: p.w, h: p.h, angle: autoAngle(site) }, 64, 44) }), h('span', {}, p.name), h('span', { class: 'sub' }, `${p.w} × ${p.h}`)))),
      h('div', { class: 'row', style: 'align-items:flex-end' }, num(tr('Eni'), 'w', 40, 600), h('button', { class: 'btn icon-btn', title: tr('Eni ↔ boʻyi'), 'aria-label': tr('Almashtirish'), onclick: () => { const t = g.w; g.w = g.h; g.h = t; this.renderPanel(); } }, svgIcon('<path d="M7 7h11l-3-3M17 17H6l3 3"/>')), num(tr('Boʻyi'), 'h', 40, 600)),
      h('div', { class: 'glabel' }, h('span', {}, tr('Joylashuv'))),
      h('div', { class: 'tiles c4', role: 'listbox', 'aria-label': tr('Variantlar') }, ...vars.map((v, i) => h('button', { class: 'tile', 'data-gvar': i, 'aria-pressed': this.gridVar === i, onclick: () => { this.gridVar = i; this.renderPanel(); } },
        h('span', { class: 'th', html: this.gridThumb(site, v.g, 64, 44) }), h('span', {}, tr(v.name)), h('span', { class: 'sub' }, `${gridStreetsAround(site, keepC, v.g).length} ${tr('koʻcha')}`)))),
      h('div', { class: 'row' }, h('span', { class: 't-small', style: 'flex:none' }, tr('Burilish')), h('div', { class: 'grow' }, ang), angT),
      this.compassBox(site, g),
      h('div', { class: 'group' }, profRow('main', tr('Asosiy')), profRow('minor', tr('Ikkilamchi')), h('div', { class: 'li', style: 'flex-wrap:wrap' }, h('span', { class: 't-small', style: 'flex-basis:100%' }, tr('Asosiy koʻchalar')), mainSel)),
      h('div', { class: 'group' }, h('div', { class: 'li' }, h('span', { class: 'k' }, tr('Perimetr boʻylab koʻcha'), h('span', { class: 'sub' }, tr('Uchastka chegarasi boʻylab — qizil chiziq chegarada, toʻr koʻchalari unga ulanadi'))),
        sw({ id: 'gridPerim', label: tr('Perimetr boʻylab koʻcha'), on: this.gridPerim, onchange: v => { this.gridPerim = v; this.renderPanel(); } })),
        this.gridPerim ? h('div', { class: 'li', style: 'flex-wrap:wrap' }, h('div', { style: 'flex-basis:100%' }, select({ id: 'gridPerimProf', 'aria-label': tr('Perimetr koʻchasi profili'), onchange: v => { this.gridPerimProf = v; this.renderPanel(); } }, PROFILES.map(x => ({ value: x.id, label: `${x.name} · ${fmt(profileWidth(x), 0)} m`, selected: this.gridPerimProf === x.id }))))) : ''),
      nKeep ? h('div', { class: 'group' }, h('div', { class: 'li' }, h('span', { class: 'k' }, tr('Mavjud koʻchalarni saqlash'), h('span', { class: 'sub' }, tf('${n} ta mavjud koʻcha uchastkani kesib oʻtadi — loyihaga olinadi, toʻr ular orasiga joylanadi', { n: nKeep }))),
        sw({ id: 'gridKeep', label: tr('Mavjud koʻchalarni saqlash'), on: this.gridKeep, onchange: v => { this.gridKeep = v; this.renderPanel(); } }))) : '',
      h('div', { class: 'row' },
        h('button', { class: 'btn btn-primary btn-lg grow', id: 'gridApply', onclick: apply }, tr(has ? 'Qayta qoʻllash' : 'Toʻrni qoʻllash')),
        has ? h('button', { class: 'btn btn-lg icon-btn', id: 'gridClear', title: tr('Toʻrni olib tashlash'), 'aria-label': tr('Toʻrni olib tashlash'), onclick: () => this.run(() => this.store.dispatch({ type: 'setGridStreets', streets: [] })) }, svgIcon(IC.trash)) : ''),
      h('span', { class: 't-small' }, tr('Avvalgi toʻr almashtiriladi, qoʻlda chizilganlar qoladi. Uchlari 40 m ichidagi yoʻllarga ulanadi.')));
    body.append(box);
  }

  /** Mavjud koʻchalar uchlarini davom ettirib, ≤ 40 m dagi eng yaqin yoʻl oʻqiga (OSM yoki loyiha koʻchasi) ulash */
  private connectStreetEnds(): number {
    const r = this.streetEndPatches(this.store.doc), prev = this.plan();
    if (r.patches.length) { this.run(() => this.store.dispatch({ type: 'updateStreets', patches: r.patches })); this.regenAfterStreets(prev); }
    return r.n;
  }

  /** Uchlarni ulash natijasi (hujjat oʻzgarmaydi): qaysi koʻchaning oʻqi qanday uzayadi */
  private streetEndPatches(doc: Project): { n: number; patches: { id: string; patch: { axis: LngLat[] } }[] } {
    const fr = frame(doc.origin), b = this.ctxMgr.current, adopted = new Set([...doc.streets.map(x => x.osm), ...(doc.removedRoads ?? [])]);
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
    let n = 0; const patches: { id: string; patch: { axis: LngLat[] } }[] = [];
    /* hammasi bitta buyruqda: har koʻcha uchun alohida dispatch sahna, panel va hisobni N marta qayta qurardi (katta uchastkada qotish) */
    { for (const st of doc.streets) {
      const a = st.axis.map(fr.toLocal); if (a.length < 2 || (a.length > 3 && Math.hypot(a[0][0] - a[a.length - 1][0], a[0][1] - a[a.length - 1][1]) < 0.5)) continue;   // yopiq halqa (perimetr) uzaytirilmaydi
      const dir = (p: XY, q: XY): XY => { const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1; return [(q[0] - p[0]) / L, (q[1] - p[1]) / L]; };
      const h1 = ray(a[a.length - 1], dir(a[a.length - 2], a[a.length - 1]), st.id), h0 = ray(a[0], dir(a[1], a[0]), st.id);
      if (!h0 && !h1) continue;
      const na = [...(h0 ? [h0] : []), ...a, ...(h1 ? [h1] : [])]; n += (h0 ? 1 : 0) + (h1 ? 1 : 0);
      patches.push({ id: st.id, patch: { axis: na.map(fr.toGeo) } });
    } }
    return { n, patches };
  }

  /* ===== 2-qadam: Uchastka (MR-Q1) ===== */
  /** 1-qadam, 3-blok: uchastkaga tutash yoʻllar (OSM, ≤ 30 m) — toifa, bir tomonlama; batafsil ulanish nuqtalari — 2-qadam «Koʻchalar» */
  private accessMemo: { k: unknown[]; v: Access[] } | null = null;
  private accessBlock(): HTMLElement {
    const doc = this.store.doc, b = this.ctxMgr.current, box = h('div', { class: 'col', id: 'accessBox' });
    if (!doc.site || !b || !doc.context.loaded) { box.append(h('span', { class: 't-small' }, tr('Atrof yuklangach — uchastkaga tutash yoʻllar va ularning toifasi shu yerda chiqadi.'))); return box; }
    const k = [doc.site, b, doc.origin, doc.removedRoads, doc.streets];
    if (!this.accessMemo || !this.accessMemo.k.every((x, i) => x === k[i])) {
      const skip = new Set([...(doc.removedRoads ?? []), ...doc.streets.flatMap(s => s.osm != null ? [s.osm] : [])]);
      this.accessMemo = { k, v: siteAccess(doc.site.rings[0], b.osm.roads, doc.origin, 30, skip) };
    }
    const A = this.accessMemo.v, G: Record<string, string> = { magistral: 'magistral', tuman: 'tuman ahamiyatidagi', mahalliy: 'mahalliy', xizmat: 'xizmat yoʻli' };
    if (!A.length) { box.append(h('div', { class: 'note warn' }, tr('Uchastka chegarasidan 30 m ichida yoʻl yoʻq — kirish uchun koʻcha chizish kerak (2-qadam).'))); return box; }
    box.append(h('div', { class: 'group' }, ...A.slice(0, 5).map(a => h('div', { class: 'li', 'data-acc': a.group },
      h('span', { class: 'k' }, h('i', { class: `acc-dot acc-${a.group}` }), a.name || tr('nomsiz yoʻl'), h('span', { class: 'sub' }, `${tr(G[a.group])} · ${a.cls}${a.oneway ? ' · ' + tr('bir tomonlama') : ''}`),
        (() => { const v = accessVerdict(a); return h('span', { class: `acc-v acc-v-${v.s}`, 'data-accv': v.s }, tr(v.t)); })()),
      h('span', { class: 'v' }, `${fmt(a.len)} m`)))));
    if (!A.some(a => accessVerdict(a).s !== 'warn')) box.append(h('div', { class: 'note warn', id: 'accWarn' }, tr('Uchastkaga faqat magistral yoʻl tutashgan — kirish uchun yon (mahalliy) yoʻl yoki chorraha kerak (2-qadam «Koʻchalar»).')));
    box.append(h('span', { class: 't-small' }, tr('ShNQ 2.07.06-24, 1-ilova: koʻcha-yoʻllar tasnifi. Toifa OSM dan — taxminiy.')));
    box.append(h('span', { class: 't-small' }, tr('Ulanish nuqtalari va burilishlar — 2-qadam «Koʻchalar».')));
    return box;
  }

  private uchastkaPanel(body: HTMLElement): void {
    const doc = this.store.doc, fr = frame(doc.origin), area = this.last?.d.siteHa ?? 0;
    // kiritilgan oʻlcham panel qayta chizilganda (masalan, atrof yuklanib boʻlganda) yoʻqolmasin
    const w = h('input', { type: 'number', class: 'input', min: 10, max: 4000, value: this.rectWH[0], id: 'rw', 'aria-label': tr('Eni, m'), oninput: (e: Event) => { this.rectWH[0] = +(e.target as HTMLInputElement).value || 120; } }) as HTMLInputElement;
    const hh = h('input', { type: 'number', class: 'input', min: 10, max: 4000, value: this.rectWH[1], id: 'rh', 'aria-label': tr('Boʻyi, m'), oninput: (e: Event) => { this.rectWH[1] = +(e.target as HTMLInputElement).value || 100; } }) as HTMLInputElement;
    const drawing = this.tool instanceof PolygonTool, picking = this.tool instanceof ClickTool;
    body.append(doc.site
      ? h('div', { class: 'group flat', style: 'padding:10px 12px;display:flex;align-items:center;gap:10px' }, h('div', { class: 'kpi', style: 'flex:1' }, h('b', { id: 'siteHa' }, `${fmt(area, 2)} ga`), h('span', {}, tr('Uchastka maydoni'))), h('span', { class: 'chip ok' }, h('i'), tr('Yopiq')))
      : h('div', { class: 'note' }, tr('Uchastka hali chizilmagan.')));
    body.append(h('div', { class: 'glabel' }, h('span', {}, tr('Chizish'))));
    if (drawing) body.append(h('button', { class: 'btn btn-primary btn-block', id: 'drawSite', onclick: () => this.endTool() }, tr('Chizishni toʻxtatish')),
      h('span', { class: 't-small' }, tr('Bosing — nuqta qoʻying · Backspace — oxirgisini oʻchirish · Esc — bekor')));
    else body.append(h('div', { class: 'row' },
      h('button', { class: 'btn grow', id: 'drawSite', onclick: () => this.setTool(new PolygonTool(this.scene, r => {
        const f = frame(this.store.doc.origin);   // joriy markaz (panel chizilgandan beri koʻchgan boʻlishi mumkin)
        void this.putSite([r.map(f.toGeo)], () => { this.setTool(null); this.fitSiteIfOut(); });
      }, toast)) }, ...icl(IC.pencil, tr(doc.site ? 'Qaytadan chizish' : 'Sahnada chizish'))),
      doc.site ? h('button', { class: 'btn icon-btn btn-danger', 'aria-label': tr('Uchastkani oʻchirish'), title: tr('Uchastkani oʻchirish'), onclick: () => this.run(() => this.store.dispatch({ type: 'clearSite' })) }, svgIcon(IC.trash)) : ''));
    const other = h('details', { class: 'how', id: 'siteMore' }, h('summary', {}, svgIcon(IC.info), tr('Boshqa usullar: fayldan yuklash, tahrirlash')));
    if (!drawing) other.append(h('div', { class: 'glabel' }, h('span', {}, tr('yoki fayldan yuklash')), h('span', { class: 'chip' }, 'Pro')),
      h('button', { class: 'btn btn-block', id: 'siteFile', onclick: () => this.pickBoundary((b, f) => {
        this.framedCtx = false;
        void this.putSite([b.rings[0]], () => { this.scene.frameDoc(this.store.doc); toast(tf('«${f}»: uchastka ${a} ga, ${c}${x}', { f, a: fmt(b.areaHa, 2), c: crsLabel(b.crs), x: b.polys > 1 ? tf(' (${n} ta poligondan eng kattasi)', { n: b.polys }) : '' })); });
      }) }, ...icl(IC.plus, tr('Chegarani fayldan yuklash'))),
      h('span', { class: 't-small' }, tr('GeoJSON, KML/KMZ yoki DXF. Koordinatalar: WGS84 yoki UTM (zona faylda yozilgan yoki loyiha hududi boʻyicha) — avtomatik aniqlanadi. Hozircha ochiq; obuna ulanganda Pro rejada boʻladi.')));
    if (this.ctxMgr.current && doc.context.loaded) {
      body.append(h('div', { class: 'glabel' }, h('span', {}, tr('Kvartalni bosib aniqlash'))));
      if (doc.context.layers.roads) body.append(h('button', { class: picking ? 'btn btn-primary btn-block' : 'btn btn-block', id: 'pickBlock', onclick: () => picking ? this.setTool(null) : this.setTool(new ClickTool(tr('Yoʻllar orasidagi kvartal ichini bosing · Esc — bekor'), xy => this.pickBlock(xy))) }, tr(picking ? 'Aniqlashni toʻxtatish' : '⌖ Kvartalni bosib aniqlash')));
      body.append(h('div', { class: 'seg sm', role: 'group', 'aria-label': tr('Kvartal chegarasi') },
        ...([['mayda', 'Mayda: barcha koʻchalar'], ['yirik', 'Yirik: asosiy koʻchalar']] as const).map(([k, t]) => h('button', { 'aria-pressed': this.blockMode === k, 'data-bm': k, onclick: () => { this.blockMode = k; this.renderPanel(); } }, tr(t)))));
    }
    body.append(h('div', { class: 'glabel' }, h('span', {}, tr('yoki oʻlcham bilan, markazda'))),
      h('div', { class: 'row', style: 'align-items:flex-end' },
        h('div', { class: 'field grow' }, h('label', {}, tr('Eni')), h('span', { class: 'unit' }, w, h('span', {}, 'm'))),
        h('div', { class: 'field grow' }, h('label', {}, tr('Boʻyi')), h('span', { class: 'unit' }, hh, h('span', {}, 'm'))),
        h('button', { class: 'btn', id: 'rectSite', onclick: () => {
          const a = Number(w.value), b = Number(hh.value); if (!(a >= 10 && b >= 10)) { toast(tr('Kamida 10 m')); return; } if (a > 4000 || b > 4000) { toast(tr('Koʻpi bilan 4000 m')); return; }
          const m = this.scene.viewExtent().c;   // ekran markazida (xarita surilgan boʻlsa ham)
          const r: XY[] = [[-a / 2, -b / 2], [a / 2, -b / 2], [a / 2, b / 2], [-a / 2, b / 2]].map(([x, y]) => [x + m[0], y + m[1]] as XY);
          void this.putSite([r.map(fr.toGeo)], () => this.scene.frameDoc(this.store.doc));
        } }, tr('Qoʻyish'))),
      h('span', { class: 't-small' }, '10–4000 m.'));
    (doc.site ? body : other).append(h('div', { class: 'glabel' }, h('span', {}, tr('Tahrirlash'))),
      h('div', { class: 'group flat', id: doc.site ? 'siteEditHint' : undefined },
        ...([['Burchakni surish', 'sudrash'], ['Yangi burchak', 'oraliq nuqta'], ['Burchakni oʻchirish', '2× bosish'], ['Yopishishni oʻchirish', 'Shift']] as const).map(([k, v]) => h('div', { class: 'li' }, h('span', { class: 'k' }, tr(k)), h('span', { class: 'kbd' }, tr(v))))),
      h('span', { class: 't-small' }, tr('Chizish: bosing — nuqta, birinchi nuqtani bosing yoki Enter — yopish. Sudrab kamerani aylantirasiz.')));
    body.append(other);
  }

  /* ===== 3-qadam: Koʻchalar (MR-Kocha, B uslub: Toʻr · Profillar · Chizish) ===== */
  /** null — avtomatik: koʻcha yoʻq boʻlsa «Toʻr», bor boʻlsa «Chizish» (roʻyxat va meʼyor shu yerda) */
  private kochaTab: 'tor' | 'prof' | 'chiz' | null = null;
  private profQ = '';
  private profGroup = 'all';
  private kochaPanel(body: HTMLElement): void {
    const doc = this.store.doc, fr = frame(doc.origin), drawing = this.tool instanceof LineTool;
    // tanlangan koʻcha (yoki yangi koʻcha profili) — katta koʻndalang kesim
    const stSel = doc.streets.find(x => x.id === this.selStreet), p0 = profileById(stSel?.profile ?? this.profile);
    body.append(h('button', { class: 'group secbig', id: 'secBig', title: tr('Kattalashtirish'), onclick: () => this.openSection(p0) },
      h('div', { class: 'row' }, h('b', { class: 'grow' }, `${tr(stSel ? 'Tanlangan koʻcha' : 'Yangi koʻcha')}: ${p0.name}`), h('span', { class: 't-small' }, `${fmt(profileWidth(p0), 1)} m ⤢`)),
      h('div', { class: 'secsvg', html: sectionSvg(p0.parts, 300, 0, true, false) })));
    if (stSel) {
      const iss = checkProfile(p0);
      body.append(h('div', { class: 'group' }, h('div', { class: 'li' }, h('span', { class: 'k' }, `${tr('Tanlangan')}: ${p0.name} · ${fmt(profileWidth(p0), 0)} m`, h('span', { class: 'sub' }, `ShNQ 2.07.01-23, ${CATS[p0.cat].clause}${stSel.osm != null ? ' · OSM' : ''}`)), h('span', { class: iss.length ? 'chip bad' : 'chip ok' }, h('i'), iss.length ? `${iss.length} ${tr('chetlanish')}` : tr('mos')))),
        h('span', { class: 't-small', id: 'stEditHint' }, tr('Nuqtalarni sudrang · oraliq nuqta — burilish · 2× bosish — oʻchirish · Delete — oʻchirish')));
    }
    if (this.kochaTab == null) this.kochaTab = doc.streets.length ? 'chiz' : 'tor';
    if (drawing && this.kochaTab !== 'chiz') this.kochaTab = 'chiz';
    if (this.osmPick && this.kochaTab !== 'chiz') this.kochaTab = 'chiz';
    const nProf = PROFILES.length + PRESET_PROFILES.length;
    body.append(h('div', { class: 'seg', role: 'tablist', 'aria-label': tr('Boʻlimlar') }, ...([['tor', tr('Toʻr')], ['prof', `${tr('Profillar')} · ${nProf}`], ['chiz', tr('Chizish')]] as const).map(([k, t]) => h('button', { role: 'tab', 'data-ktab': k, 'aria-pressed': this.kochaTab === k, 'aria-selected': this.kochaTab === k, onclick: () => { this.kochaTab = k; this.renderPanel(); } }, t))));
    if (this.kochaTab === 'tor') { if (doc.site) this.gridPanel(body); else body.append(h('div', { class: 'note' }, tr('Avval uchastkani chizing'))); }
    if (this.kochaTab === 'prof') this.profilesTab(body, stSel?.id ?? null);
    if (this.kochaTab === 'chiz') this.drawTab(body, fr, drawing);
  }

  /** Profillar yorligʻi: qidiruv, guruh filtrlari, kartochkalar (nom, kenglik, meʼyor chipi, mini kesim) */
  private profilesTab(body: HTMLElement, selId: string | null): void {
    const all: (Profile & { group?: string })[] = [...PROFILES, ...PRESET_PROFILES];
    const groups: { id: string; name: string; list: (Profile & { group?: string })[] }[] = [{ id: 'asosiy', name: tr('Asosiy'), list: PROFILES }, ...[...new Set(PRESET_PROFILES.map(p => p.group))].map(g => ({ id: g, name: g, list: PRESET_PROFILES.filter(p => p.group === g) }))];
    const q = this.profQ.trim().toLowerCase();
    const match = (p: Profile) => !q || p.name.toLowerCase().includes(q) || p.note.toLowerCase().includes(q) || CATS[p.cat].name.toLowerCase().includes(q);
    const inp = h('input', { type: 'search', class: 'input', id: 'profQ', placeholder: tr('Profil qidirish'), value: this.profQ, 'aria-label': tr('Profil qidirish') }) as HTMLInputElement;
    inp.oninput = () => { this.profQ = inp.value; const keep = inp.selectionStart; this.renderPanel(); const n = this.el.panel.querySelector<HTMLInputElement>('#profQ'); if (n) { n.focus(); n.setSelectionRange(keep, keep); } };
    body.append(inp);
    body.append(h('div', { class: 'ugrp' }, h('div', {}, h('button', { class: 'uchip', 'aria-pressed': this.profGroup === 'all', 'data-pgrp': 'all', onclick: () => { this.profGroup = 'all'; this.renderPanel(); } }, `${tr('Hammasi')} · ${all.length}`),
      ...groups.map(g => h('button', { class: 'uchip', 'aria-pressed': this.profGroup === g.id, 'data-pgrp': g.id, onclick: () => { this.profGroup = g.id; this.renderPanel(); } }, `${g.name} · ${g.list.length}`)))));
    const pick = (p: Profile) => { this.profile = p.id; if (selId) { const prev = this.plan(); this.run(() => this.store.dispatch({ type: 'updateStreet', id: selId, patch: { profile: p.id } })); this.regenAfterStreets(prev); } else this.renderPanel(); };
    let shown = 0;
    for (const g of groups) {
      if (this.profGroup !== 'all' && this.profGroup !== g.id) continue;
      const list = g.list.filter(match); if (!list.length) continue; shown += list.length;
      body.append(h('div', { class: 'glabel' }, h('span', {}, g.name), h('span', {}, `${list.length} ta`)),
        h('div', { class: 'gc2', role: 'listbox', 'aria-label': g.name }, ...list.map(p => { const iss = checkProfile(p).length, piy = p.cat === 'piyoda';
          return h('button', { class: 'gcard2', role: 'option', 'aria-selected': this.profile === p.id, 'aria-pressed': this.profile === p.id, 'data-prof': p.id, title: `${CATS[p.cat].name} · ${p.note}`, onclick: () => pick(p) },
            h('b', {}, p.name), this.profileBar(p.id),
            h('span', { class: 'pm' }, h('span', { class: 'num' }, `${fmt(profileWidth(p), 1)} m`), h('span', { class: piy ? 'chip warn' : iss ? 'chip warn' : 'chip ok' }, piy ? tr('hisob boʻyicha') : iss ? `${iss} ${tr('chetlanish')}` : 'ShNQ ✓'))); })));
    }
    if (!shown) body.append(h('div', { class: 'empty' }, h('span', {}, tr('Hech narsa topilmadi'))));
    body.append(h('span', { class: 't-small' }, tr('Koʻcha tanlangan boʻlsa — bosilgan profil shu koʻchaga qoʻllanadi; aks holda yangi koʻcha uchun.')));
  }

  /**
   * Berk uchlar va chorrahalar (31.10): ShNQ 2.07.06-24, 57-band — berk koʻcha R ≥ 15 m aylana yoki 20 × 20 m maydoncha bilan tugaydi;
   * 106-band — berk tor koʻcha ≤ 150 m; 27-band — kesishmalarda kichik aylanmalar. Sahnada tekis disk / halqa (yengil).
   */
  private endsPanel(body: HTMLElement): void {
    const doc = this.store.doc, fr = frame(doc.origin), des = deadEnds(doc), miss = des.filter(e => !e.has), long = des.filter(e => e.len > 150), jn = junctions(doc), rounds = doc.rounds ?? [];
    const setAll = (k: 'aylana' | 'maydon') => { const by = new Map<string, { a?: 'aylana' | 'maydon'; b?: 'aylana' | 'maydon' }>(); for (const e of miss) { const st = doc.streets.find(x => x.id === e.sid)!; by.set(e.sid, { ...(by.get(e.sid) ?? st.ends ?? {}), [e.end]: k }); } this.run(() => this.store.dispatch({ type: 'updateStreets', patches: [...by].map(([id, ends]) => ({ id, patch: { ends } })) })); };
    const hasR = (p: XY) => rounds.some(r => { const c = fr.toLocal(r.at); return Math.hypot(c[0] - p[0], c[1] - p[1]) < 8; });
    const setR = (pts: XY[], on: boolean) => { const keep = rounds.filter(r => { const c = fr.toLocal(r.at); return !pts.some(p => Math.hypot(c[0] - p[0], c[1] - p[1]) < 8); }); this.run(() => this.store.dispatch({ type: 'setRounds', rounds: on ? [...keep, ...pts.map(p => ({ id: uid('r_'), at: fr.toGeo(p), r: 14 }))] : keep })); };
    body.append(h('div', { class: 'glabel' }, h('span', {}, tr('Berk uchlar va chorrahalar')), h('span', {}, 'ShNQ 2.07.06-24, 57, 106, 27')),
      h('div', { class: 'group', id: 'deadEnds' },
        h('div', { class: 'li' }, h('span', { class: 'k' }, tf('Berk uchlar: ${n} ta', { n: des.length }), h('span', { class: 'sub' }, des.length ? (miss.length ? tf('${n} tasida burilish joyi yoʻq (57-band: R ≥ 15 m aylana yoki 20 × 20 m)', { n: miss.length }) : tr('Hammasida burilish joyi bor (57-band)')) + (long.length ? ' · ' + tf('${n} tasi 150 m dan uzun (106-band)', { n: long.length }) : '') : tr('Loyiha koʻchalarida berk uch yoʻq'))),
          miss.length ? h('span', { class: 'chip warn', 'data-s': 'review' }, String(miss.length)) : h('span', { class: 'chip ok' }, '✓')),
        miss.length ? h('div', { class: 'li', style: 'gap:6px;flex-wrap:wrap' },
          h('button', { class: 'btn btn-sm', id: 'endsAylana', onclick: () => setAll('aylana') }, tr('Hammasiga aylana (R 15 m)')),
          h('button', { class: 'btn btn-sm', id: 'endsMaydon', onclick: () => setAll('maydon') }, tr('Hammasiga 20 × 20 m maydoncha'))) : '',
        h('div', { class: 'li' }, h('span', { class: 'k' }, tf('Chorrahalar: ${n} ta · aylanma: ${r}', { n: jn.length, r: rounds.length }), h('span', { class: 'sub' }, tr('Aylanma — tashqi R 14 m, markazida yashil orolcha (27-band)')))),
        h('div', { class: 'li', style: 'gap:6px;flex-wrap:wrap' },
            jn.length ? h('button', { class: 'btn btn-sm', id: 'roundsAll', onclick: () => setR(jn.filter(p => !hasR(p)), true) }, tr('Hammasiga aylanma')) : '',
            rounds.length ? h('button', { class: 'btn btn-sm btn-ghost', id: 'roundsOff', onclick: () => this.run(() => this.store.dispatch({ type: 'setRounds', rounds: [] })) }, tr('Olib tashlash')) : '')));
    const st = doc.streets.find(x => x.id === this.selStreet);
    if (st) {
      const A = st.axis.map(fr.toLocal), mine = jn.filter(p => A.some((q, k) => k + 1 < A.length && (() => { const r = A[k + 1], dx = r[0] - q[0], dy = r[1] - q[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - q[0]) * dx + (p[1] - q[1]) * dy) / L2)); return Math.hypot(q[0] + dx * t - p[0], q[1] + dy * t - p[1]) < 2.5; })()));
      const NAME = { aylana: 'aylana', maydon: '20 × 20' } as const;
      body.append(h('div', { class: 'row', id: 'stEnds', style: 'gap:6px;flex-wrap:wrap' },
        ...(['a', 'b'] as const).map(e => h('button', { class: 'btn btn-sm', 'data-end': e, 'aria-pressed': !!st.ends?.[e], title: tr('Koʻcha uchidagi burilish joyi: yoʻq → aylana → 20 × 20 m'), onclick: () => this.run(() => this.store.dispatch({ type: 'updateStreet', id: st.id, patch: nextEnd(st, e) })) },
          `${tr(e === 'a' ? 'Boshi' : 'Oxiri')}: ${st.ends?.[e] ? tr(NAME[st.ends[e]!]) : tr('yoʻq')}`)),
        mine.length ? h('button', { class: 'btn btn-sm', id: 'stRounds', 'aria-pressed': mine.every(hasR), onclick: () => setR(mine, !mine.every(hasR)) }, `${tr('Chorrahalarida aylanma')} · ${mine.length}`) : ''));
    }
  }

  /** Chizish yorligʻi: koʻcha chizish, uchlarni ulash, OSM yoʻli, koʻchalar roʻyxati, meʼyor */
  private drawTab(body: HTMLElement, fr: ReturnType<typeof frame>, drawing: boolean): void {
    const doc = this.store.doc;
    body.append(h('div', { class: 'row' },
      h('button', { class: drawing ? 'btn btn-primary grow' : 'btn btn-primary grow', id: 'drawStreet', onclick: () => drawing ? this.endTool() : this.setTool(new LineTool(this.scene, r => {
        this.run(() => this.store.dispatch({ type: 'addStreet', axis: r.map(fr.toGeo), profile: this.profile }));
        if (this.tool) this.el.hint.textContent = this.tool.hint;
      }, toast, this.snapStreet)) }, ...(drawing ? icl(IC.check, tr('Chizishni tugatish')) : icl(IC.plus, tr('Koʻcha chizish')))),
      doc.streets.length ? h('button', { class: 'btn grow', id: 'connEnds', title: tr('Uchi yoʻlga yetmay qolgan koʻchalarni davom ettirib, 40 m gacha yaqin yoʻl oʻqiga ulaydi'), onclick: () => { const n = this.connectStreetEnds(); toast(n ? tf('${n} ta uch mavjud yoʻllarga ulandi', { n }) : tr('Ulanadigan uch topilmadi (40 m ichida yoʻl yoʻq)')); } }, tr('Uchlarini yoʻllarga ulash')) : ''));
    if (drawing) body.append(h('span', { class: 't-small' }, tr('Nuqtalarni bosing · uchlar boshqa koʻchaga yopishadi · 2× bosish yoki Enter — saqlash · Backspace — oxirgisi · Esc — bekor')),
      h('div', { class: 'group flat' }, ...([['Koʻcha oʻqi', 'bosish'], ['Saqlash', 'Enter'], ['Oxirgi nuqta', 'Backspace'], ['Bekor', 'Esc']] as const).map(([k, v]) => h('div', { class: 'li' }, h('span', { class: 'k' }, tr(k)), h('span', { class: 'kbd' }, tr(v))))));
    if (this.osmPick) {
      const o = this.osmPick, L = o.pts.map(fr.toLocal).reduce((acc, q, i, a) => i ? acc + Math.hypot(q[0] - a[i - 1][0], q[1] - a[i - 1][1]) : 0, 0);
      body.append(h('div', { class: 'group', id: 'osmPick' },
        h('div', { class: 'li' }, h('span', { class: 'k' }, o.name ? `«${o.name}»` : tr('Nomsiz koʻcha'), h('span', { class: 'sub' }, `OSM: ${o.cls} · ${tr('qatnov')} ~${fmt(o.w, 1)} m · ${fmt(L)} m`))),
        h('div', { class: 'li', style: 'flex-wrap:wrap' },
          h('button', { class: 'btn btn-primary btn-block', id: 'adoptOsm', onclick: () => {
            // kontekst kvadratiga qirqib, eng uzun boʻlagi olinadi
            const R = this.store.doc.context.radius, pieces = clipLine(o.pts.map(fr.toLocal), -R, -R, R, R).sort((a, b) => b.length - a.length);
            const axis = (pieces[0] ?? o.pts.map(fr.toLocal)).map(fr.toGeo);
            this.run(() => this.store.dispatch({ type: 'addStreet', axis, profile: this.profile, osm: o.id }));
            this.osmPick = null; this.scene.setPreview([]); this.pickStreet(this.store.doc.streets[this.store.doc.streets.length - 1]?.id ?? null);
          } }, `${tr('Loyihaga olish')}: ${profileById(this.profile).name}`),
          h('button', { class: 'btn btn-danger btn-sm', id: 'rmOsmRoad', onclick: () => this.removeOsmRoad(o.id) }, ...icl(IC.trash, tr('Bu yoʻlni olib tashlash (Delete)'))),
          h('button', { class: 'btn btn-ghost btn-sm', onclick: () => { this.osmPick = null; this.scene.setPreview([]); this.renderPanel(); } }, tr('Bekor')))),
        h('span', { class: 't-small' }, tr('Mavjud koʻcha tanlangan profil bilan qayta loyihalanadi: OSM dagi koʻrinishi yashiriladi, qizil chiziqlar va kvartallar yangi kenglik boʻyicha hisoblanadi. Olib tashlansa — sahnada, kvartal chegarasida va chizmada boʻlmaydi.')));
    }
    if (doc.removedRoads?.length) body.append(h('button', { class: 'btn btn-block btn-sm', id: 'restoreRoads', onclick: () => this.run(() => this.store.dispatch({ type: 'setRemovedRoads', ids: [] })) }, tf('Olib tashlangan yoʻllarni qaytarish (${doc.removedRoads.length})', { 'doc.removedRoads.length': doc.removedRoads.length })));
    if (doc.streets.length) {
      const len = (a: XY[]) => a.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - a[i][0], p[1] - a[i][1]), 0), d = this.last?.d;
      body.append(h('div', { class: 'glabel' }, h('span', {}, tr('Koʻchalar')), d ? h('span', { id: 'stArea' }, `${fmt(d.streetArea / 1e4, 2)} ga · ${fmt(d.siteHa ? d.streetArea / 1e4 / d.siteHa * 100 : 0, 0)} %`) : ''),
        h('div', { class: 'group', role: 'listbox', 'aria-label': tr('Koʻchalar') }, ...doc.streets.map((st, k) => {
          const p = profileById(st.profile);
          return h('div', { class: 'li', role: 'option', 'aria-selected': st.id === this.selStreet, 'data-sid': st.id, style: st.id === this.selStreet ? 'background:var(--sel-soft)' : '' },
            h('span', { class: 'k', style: 'cursor:pointer', onclick: () => this.pickStreet(st.id === this.selStreet ? null : st.id) }, `${k + 1}. ${p.name} · ${fmt(profileWidth(p), 0)} m`, h('span', { class: 'sub' }, `${fmt(len(st.axis.map(fr.toLocal)))} m`)),
            h('button', { class: 'btn icon-btn btn-sm btn-ghost', title: tr('Oʻchirish'), 'aria-label': tr('Koʻchani oʻchirish'), onclick: () => this.run(() => this.store.dispatch({ type: 'removeStreet', id: st.id })) }, svgIcon(IC.x)));
        })));
      if (this.selStreet) {
        const st = doc.streets.find(x => x.id === this.selStreet), p = st && profileById(st.profile), iss = p ? checkProfile(p) : [];
        if (p) body.append(h('div', { class: iss.length ? 'note bad' : 'note ok', id: 'stNorm' }, h('b', {}, `${CATS[p.cat].name}`), ` · ShNQ 2.07.01-23, ${CATS[p.cat].clause}`, h('br'),
          ...(iss.length ? iss.map(x => h('div', {}, `${x.what}: ${x.value} — ${tr('meʼyor')} ${x.norm}`)) : [tr('Meʼyorga mos.')])));
        if (p) body.append(h('button', { class: 'btn btn-block', id: 'stKs', title: tr('Koʻchasoz: kesim muharriri — Dizayn-kod zonalari, muhandislik tarmoqlari, reja, aksonometriya, albom varagʻi'), onclick: () => openInKochasoz(p, `${doc.name} · ${p.name}`) },
          h('i', { style: 'width:8px;height:8px;border-radius:4px;background:var(--svc-ks);flex:none' }), tr('Koʻchasozda ochish (kesim)')));
      }
      this.endsPanel(body);
    } else body.append(h('div', { class: 'note' }, tr('Koʻchalar yoʻq. Uchastkani kesib oʻtadigan oʻqni chizing — kvartallar avtomatik hosil boʻladi.')));
    body.append(h('details', { class: 'how' }, h('summary', {}, svgIcon(IC.info), tr('Mavjud koʻchani tahrirlash')), h('div', {}, tr('Mavjud koʻchani tahrirlash: sahnada OSM koʻchasini bosing → «Loyihaga olish». Qizil chiziqlar orasidagi kenglik = profil kengligi; har profil ShNQ 2.07.01-23 20-jadvali (310-band) va 1-izohi bilan tekshiriladi.'))));
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
  /* ---------- 10-band: ishlanayotgan hududni izolyatsiya qilish ---------- */
  private isoName = '';
  private static ISO_IC = '<path d="M3 8V4h4M17 4h4v4M21 16v4h-4M7 20H3v-4"/><rect x="8" y="8" width="8" height="8" rx="1"/>';
  /** daha (kvartal) indeksi boʻyicha izolyatsiya; null — chiqish */
  private setIso(i: number | null): void {
    const doc = this.store.doc, plan = this.plan(), b = i != null ? plan.blocks[i] : null;
    if (!b) { this.isoName = ''; this.scene.setIsolation(null, doc); }
    else { const fr = frame(doc.origin); this.isoName = this.unitName(i!); this.scene.setIsolation([b.rings[0].map(fr.toGeo)], doc); }
    this.renderLblBar(); this.renderPanel();
  }
  private blockIndexAt(p: XY | null): number | null {
    if (!p) return null;
    const i = this.plan().blocks.findIndex(b => pointIn(p, b.rings)); return i < 0 ? null : i;
  }
  private isoBtn(i: number | null): HTMLElement | string {
    if (i == null && !this.scene.isolated) return '';
    const on = this.scene.isolated;
    return h('button', { class: 'btn btn-block', id: 'isoGo', 'aria-pressed': on, title: tr('Faqat shu daha toʻliq chiziladi, qolgani — yengil fon (katta sahnada xotira va tezlik uchun)'), onclick: () => this.setIso(on ? null : i) },
      ...icl(Editor.ISO_IC, on ? tf('Izolyatsiyadan chiqish (${n})', { n: this.isoName }) : tr('Dahani izolyatsiya qilish')));
  }

  private unitName(i: number): string {
    const plan = this.plan(), b = plan.blocks[i]; if (!b) return '';
    if (!b.parcelId) return `D-${b.blockKey + 1}`;
    const same = plan.blocks.filter(x => x.blockKey === b.blockKey);
    return `D-${b.blockKey + 1}.${same.indexOf(b) + 1}`;
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

  /* ===== 4-qadam: Parsellar va zonalar (MR-Q1) ===== */
  private parselPanel(body: HTMLElement): void {
    const plan = this.plan();
    if (this.selBlock != null && !plan.blocks[this.selBlock]) this.selBlock = null;
    const dm = this.demolition();
    if (dm.all) {
      body.append(h('div', { class: 'glabel' }, h('span', {}, tr('Uchastkadagi mavjud binolar'))),
        h('div', { class: 'group', id: 'demo' },
          h('div', { class: 'li' }, h('span', { class: 'k' }, `${dm.all} ${tr('bino')}`, h('span', { class: 'sub' }, `${tr('saqlanadi')} ${dm.kept} · ${tr('buziladi')} ${dm.gone}${dm.gone ? ` · ${tr('dogʻ')} ${fmt(dm.foot)} m² · ~${fmt(dm.floorArea)} m²` : ''}`))),
          h('div', { class: 'li', style: 'flex-wrap:wrap;gap:6px' },
            h('button', { class: 'btn btn-sm', id: 'keepAll', onclick: () => this.run(() => this.store.dispatch({ type: 'setKeep', keep: this.scene.inSite.map(x => x.id), at: this.keepAt(), rings: this.keepRings() })) }, tr('Hammasini saqlash')),
            h('button', { class: 'btn btn-sm', id: 'dropAll', onclick: () => this.run(() => this.store.dispatch({ type: 'setKeep', keep: [] })) }, tr('Hammasini buzish')),
            dm.gone ? h('button', { class: this.goneHidden ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-ghost', id: 'goneHide', 'aria-pressed': this.goneHidden, onclick: () => { this.goneHidden = !this.goneHidden; this.syncGone(); this.renderPanel(); } }, this.goneHidden ? `${tr('Buziladiganlar yashirilgan')} (${dm.gone})` : `${tr('Buziladiganlarni yashirish')} (${dm.gone})`) : '')),
        h('span', { class: 't-small' }, tr(this.goneHidden ? 'Buziladigan binolar sahnada koʻrinmaydi; hisob va koʻchirish xarajati saqlanadi. Qaytarib, binoni bosib saqlash ↔ buzishni almashtirasiz.' : 'Sahnada binoni bosing — saqlash ↔ buzish. Buziladiganlar shaffof qizil. Keyingi qadamlarda ular avtomatik olib tashlanadi.')));
    }
    const tot = plan.blocks.filter(b => !b.parcelId).length + new Set(plan.blocks.filter(b => b.parcelId).map(b => b.blockKey)).size;
    body.append(h('div', { class: 'glabel' }, h('span', {}, tr('Kvartallar va parsellar')), h('span', {}, `${tot} ta · ${fmt(plan.blocks.reduce((s, b) => s + b.area, 0) / 1e4, 2)} ga`)),
      h('div', { class: 'group', role: 'listbox', 'aria-label': tr('Kvartallar va parsellar') }, ...plan.blocks.map((b, i) => h('button', { class: 'li', role: 'option', 'aria-selected': i === this.selBlock, 'data-block': i, style: i === this.selBlock ? 'background:var(--sel-soft)' : '', onclick: () => { this.selBlock = i === this.selBlock ? null : i; this.scene.selectBlock(this.selBlock); this.renderPanel(); } },
        h('i', { class: 'sw', style: `background:#${(ZONE_COL[b.use] ?? 0xcccccc).toString(16).padStart(6, '0')}` }), h('span', { class: 'k' }, `${this.unitName(i)} · ${fmt(b.area / 1e4, 2)} ga`, h('span', { class: 'sub' }, useDef(b.use).name))))));
    if (this.selBlock == null) { body.append(h('div', { class: 'note' }, tr('Kvartal yoki parselni roʻyxatdan yoki sahnada bosib tanlang.'))); }
    else {
      const i = this.selBlock, b = plan.blocks[i], groups = [...new Set(USES.map(u => u.group))];
      body.append(h('div', { class: 'glabel' }, h('span', {}, `${this.unitName(i)} ${tr('funksiyasi')}`), h('span', {}, `${USES.length} ta · ${groups.length} ${tr('guruh')}`)),
        ...groups.map(g => h('div', { class: 'ugrp' }, h('span', {}, g), h('div', {}, ...USES.filter(u => u.group === g).map(u => h('button', { class: 'uchip', 'aria-pressed': b.use === u.id, 'data-use': u.id, onclick: () => this.setBlockUse(i, u.id) }, h('i', { style: `background:#${u.color.toString(16).padStart(6, '0')}` }), u.name))))),
        h('span', { class: 't-small' }, tr('Maktab, MTM yoki poliklinika berilsa — bino avtomatik joylashadi.')));
      // parsellarga boʻlish
      const sizeT = h('b', { class: 'num', style: 'min-width:56px;text-align:right' }, `${fmt(this.parcelSize, 2)} ga`);
      const size = range({ min: 0.1, max: 3, step: 0.05, value: this.parcelSize, id: 'pSize', 'aria-label': tr('Parsel oʻlchami'), oninput: v => { this.parcelSize = v; sizeT.textContent = `${fmt(v, 2)} ga`; }, onchange: () => this.renderPanel() });
      const ang = h('input', { type: 'number', class: 'input', min: -90, max: 90, step: 1, value: this.gridAngleDeg, id: 'pAng', 'aria-label': tr('Burchak, °') }) as HTMLInputElement;
      ang.onchange = () => { this.gridAngleDeg = Number(ang.value) || 0; this.renderPanel(); };
      const cutting = this.tool instanceof LineTool, merging = this.tool instanceof ClickTool;
      const pb = h('div', { class: 'col', id: 'parcelBox' },
        h('div', { class: 'glabel' }, h('span', {}, tr('Parsellar')), h('span', {}, tr('Oʻlchami'))),
        h('div', { class: 'row' }, h('div', { class: 'grow' }, size), sizeT),
        h('div', { class: 'glabel' }, h('span', {}, tr('Toʻr yoʻnalishi'))),
        h('div', { class: 'tiles', role: 'group', 'aria-label': tr('Toʻr') }, ...([['ns', 'Shimol–janub', '<path d="M12 4v16M8 8l4-4 4 4"/>'], ['angle', 'Burchak', '<path d="M5 19h14M5 19V5M5 19l10-10"/>'], ['street', 'Koʻcha boʻylab', '<path d="M4 8h16M4 16h16M9 4v16" stroke-dasharray="2 2"/>']] as const).map(([k, t, ic]) => h('button', { class: 'tile', 'aria-pressed': this.gridMode === k, 'data-grid': k, onclick: () => { this.gridMode = k; this.renderPanel(); } }, svgIcon(ic), h('span', {}, tr(t))))),
        this.gridMode === 'angle' ? h('div', { class: 'field' }, h('label', {}, tr('Burchak')), h('span', { class: 'unit' }, ang, h('span', {}, '°'))) : '',
        ...(() => { const pv = this.parcelVars(); if (!pv || !pv.vars.length) return [h('div', { class: 'note' }, tr('Kvartal shu oʻlchamdan kichik — parsel oʻlchamini kamaytiring.'))];
          if (!pv.vars.some(v => v.id === this.parcelMethod)) this.parcelMethod = pv.vars[0].id;
          return [h('div', { class: 'glabel' }, h('span', {}, tr('Boʻlish usuli'))), h('div', { class: 'tiles c4', role: 'listbox', 'aria-label': tr('Boʻlish usullari') }, ...pv.vars.map(v => h('button', { class: 'tile', 'data-pvar': v.id, 'aria-pressed': this.parcelMethod === v.id, title: v.note, onclick: () => { this.parcelMethod = v.id; this.renderPanel(); } },
            h('span', { class: 'th', html: this.parcelThumb(pv.whole.rings, v.cells, 64, 44) }), h('span', {}, v.name), h('span', { class: 'sub' }, `${v.cells.length} ${tr('parsel')}`))))]; })(),
        h('button', { class: 'btn btn-primary btn-block', id: 'pSplit', onclick: () => this.subdivideSel() }, tr('Kvartalni parsellarga boʻlish')),
        h('div', { class: 'row' },
          h('button', { class: cutting ? 'btn btn-sm btn-primary grow' : 'btn btn-sm grow', id: 'pCut', 'aria-pressed': cutting, onclick: () => {
            if (cutting) { this.setTool(null); return; }
            this.setTool(new LineTool(this.scene, r => {
              const u = this.plan().blocks[this.selBlock ?? -1]; const bp = u && this.blockParcels(u); if (!u || !bp) return;
              const target = bp.list.find(p => (u.parcelId ? p.id === u.parcelId : true)) ?? bp.list[0];
              const parts = split(target.rings, r[0], r[r.length - 1]);
              if (parts.length < 2) { toast(tr('Chiziq parselni kesib oʻtmadi')); return; }
              this.commitParcels(bp.lab, [...bp.list.filter(p => p !== target), ...parts.map(rr => ({ id: uid('pc_'), rings: rr, use: target.use }))]);
              this.setTool(null);
            }, toast));
          } }, tr(cutting ? 'Kesish…' : 'Kesish')),
          h('button', { class: merging ? 'btn btn-sm btn-primary grow' : 'btn btn-sm grow', id: 'pMerge', 'aria-pressed': merging, disabled: !b.parcelId, onclick: () => {
            if (merging) { this.setTool(null); return; }
            this.setTool(new ClickTool(tr('Qoʻshni parselni bosing · Esc — bekor'), xy => {
              const plan2 = this.plan(), u = plan2.blocks[this.selBlock ?? -1], o = plan2.blocks.find(x => x.parcelId && x.blockKey === u?.blockKey && x !== u && pointIn(xy, x.rings));
              const bp = u && this.blockParcels(u); if (!u || !o || !bp) { toast(tr('Shu kvartaldagi qoʻshni parselni bosing')); return; }
              const A = bp.list.find(p => p.id === u.parcelId), B = bp.list.find(p => p.id === o.parcelId); if (!A || !B) return;
              const m = merge(A.rings, B.rings); if (!m) { toast(tr('Parsellar qoʻshni emas')); return; }
              this.commitParcels(bp.lab, [...bp.list.filter(p => p !== A && p !== B), { id: A.id, rings: m, use: A.use }]);
              this.setTool(null);
            }));
          } }, tr('Birlashtirish')),
          h('button', { class: 'btn btn-sm grow', id: 'pClear', disabled: !b.parcelId, onclick: () => { const bp = this.blockParcels(b); if (bp) { this.run(() => this.store.dispatch({ type: 'setParcels', block: bp.lab.id, parcels: [] })); this.selBlock = null; this.scene.selectBlock(null); } } }, tr('Butun kvartal'))),
        b.parcelId ? h('span', { class: 't-small', id: 'parcelEditHint' }, tr('Parsel chegarasini sahnada burchaklaridan sudrab toʻgʻrilang (oraliq nuqta — yangi burchak, ikki marta bosish — oʻchirish).')) : '',
        h('span', { class: 't-small' }, tr('Kesish — tanlangan parsel ustida chiziq chizing (2 nuqta, Enter). Kvartalni qayta boʻlish undagi parsellar seksiyalarini oʻchiradi.')));
      body.append(pb);
    }
    if (dm.all && dm.gone) this.compSection(body);
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
    const num = (k: keyof CompParams, label: string, unit: string, step = 1) => { const e = h('input', { type: 'number', class: 'input', min: 0, step, value: c[k] as number, 'data-comp': k, 'aria-label': `${label}, ${unit}` }) as HTMLInputElement;
      e.onchange = () => { const v = Number(e.value); if (!(v >= 0)) return;
        const src = k === 'priceFlat' || k === 'priceHouse' ? 'qoʻlda' : k === 'priceNonres' && c.priceSource && !c.priceSource.includes('noturar') ? `${c.priceSource}; noturar — qoʻlda` : c.priceSource;
        set({ [k]: v, priceSource: src } as Partial<CompParams>); };
      return h('div', { class: 'field', style: 'min-width:0' }, h('label', {}, label), h('span', { class: 'unit' }, e, h('span', {}, unit))); };
    const usd = (v: number) => fmt(Math.round(v));
    const NAME: Record<string, string> = { hovli: tr('Hovli uylar'), kvartira: tr('Koʻp kvartirali'), noturar: tr('Noturar') };
    const gfa = this.last?.d.gfa ?? 0, resNet = this.last?.d.resNet ?? 0;
    body.append(h('details', { class: 'how', id: 'compBox', open: this.compOpen }, h('summary', { onclick: () => { this.compOpen = !this.compOpen; } }, svgIcon(IC.info), tr('Koʻchirish xarajati (dastlabki baho)')),
      h('div', { class: 'col' },
        h('div', { class: 'seg sm', role: 'group' }, ...([['orq781', '781: olib qoʻyish'], ['orq1149', '1149: renovatsiya']] as const).map(([k, t]) => h('button', { 'aria-pressed': c.regime === k, 'data-regime': k, onclick: () => set({ regime: k }) }, t))),
        h('div', { class: 'row3' }, num('priceFlat', tr('Kvartira'), '$/m²', 10), num('priceHouse', tr('Hovli'), '$/m²', 10), num('priceNonres', tr('Noturar'), '$/m²', 10)),
        h('div', { class: 'row' }, h('button', { class: 'btn btn-sm', id: 'compMon', onclick: () => void this.loadMonitoring() }, tr('Monitoringdan')), h('span', { class: 't-small', id: 'compSrc' }, c.priceSource ? `${tr('Manba')}: ${c.priceSource}` : tr('Manba: kiritilmagan'))),
        this.monitorMsg ? h('div', { class: 'note' }, this.monitorMsg) : '',
        h('div', { class: 'row2' }, num('rentRate', tr('Ijara'), '$/m²·oy', 0.5), num('rentMonths', tr('Ijara'), tr('oy')), num('movingPerHh', tr('Koʻchish'), '$/xon.', 10), num('profitRate', tr('Foyda'), '$/m²·yil', 5)),
        h('table', { class: 'tbl', id: 'compTab' },
          h('thead', {}, h('tr', {}, h('th', {}, tr('Toifa')), h('th', {}, 'm²'), h('th', {}, tr('Xon.')), h('th', {}, '$'))),
          h('tbody', {},
            ...R.rows.map(r => h('tr', {}, h('td', {}, `${NAME[r.kind]} (${r.n})`), h('td', { class: 'num' }, fmt(Math.round(r.floorArea))), h('td', { class: 'num' }, r.households ? String(r.households) : '—'), h('td', { class: 'num' }, R.missing.includes(r.kind) ? tr('narx yoʻq') : usd(r.market)))),
            h('tr', {}, h('td', { colspan: 3 }, `${tr('Noqulaylik uchun')} ${R.pct} % (${c.regime === 'orq1149' ? '1149: 41-modda' : '781: 23-modda'})`), h('td', { class: 'num' }, usd(R.inconvenience))),
            h('tr', {}, h('td', { colspan: 3 }, `${tr('Vaqtinchalik ijara')} (${c.rentMonths} ${tr('oy')}) ${tr('va koʻchish')}`), h('td', { class: 'num' }, c.rentRate || c.movingPerHh ? usd(R.rent + R.moving) : tr('kiritilmagan'))),
            h('tr', {}, h('td', { colspan: 3 }, `${tr('Noturar: boy berilgan foyda')} (${R.profitYears} ${tr('yil')})`), h('td', { class: 'num' }, c.profitRate ? usd(R.profit) : tr('kiritilmagan'))),
            h('tr', {}, h('td', { colspan: 3 }, h('b', {}, tr('Jami'))), h('td', { class: 'num' }, h('b', {}, usd(R.total)))))),
        h('span', { class: 't-small' }, gfa ? `${tr('Loyiha GFA ning har m² iga')} ${fmt(R.total / gfa, 0)} $. ` : '',
          `${tr('Qaytariladigan turar joy maydoni')} ≈ ${fmt(Math.round(R.resArea))} m² (${R.households} ${tr('xonadon')})${resNet ? ` — ${tr('loyiha kvartiralarining')} ${fmt(R.resArea / resNet * 100, 0)} %` : ''}${c.regime === 'orq1149' ? ' (42-modda: ' + tr('beriladigan maydon avvalgisidan kam boʻlmasligi kerak') + ')' : ' (25-modda: ' + tr('teng qiymatli, ijtimoiy normadan kam boʻlmagan') + ')'}.`),
        R.missing.length ? h('div', { class: 'note warn' }, `${tr('Narx kiritilmagan')}: ${R.missing.map(k => NAME[k]).join(', ')} — ${tr('jami toʻliq emas')}.`) : '',
        h('span', { class: 't-small' }, tr('Bu baholovchi xulosasi emas (OʻRQ-781, 29-modda: qiymatni baholovchi tashkilot belgilaydi).') + ' ' + tr('Bozor qiymati — eʼlonlardagi soʻralgan narx yoki kiritilgan qiymat × maydon; maydon OSM dogʻi va balandligidan taxmin') + `, ${tr('kvartirada')} ×${fmt(c.flatNet, 2)}. ` + tr('Yerga boʻlgan huquq va dov-daraxtlar alohida hisoblanmagan (hovli narxida yer bor). Yangi uy 24 oydan kechiksa — kuniga 0,05 % penya (781: 24-modda; 1149: 43–44-moddalar). OʻRQ-1149 12.12.2026 dan kuchga kiradi; avariya uyi uchun 4/5 rozilik shart emas (36-modda).')))));
  }

  /* ===== 5-qadam: Yashil karkas (MR-Q2) ===== */
  private yashilPanel(body: HTMLElement): void {
    const plan = this.plan(), d = this.last?.d, doc = this.store.doc, R = (id: string) => this.last?.results.find(r => r.id === id);
    const chip = (id: string, t: string) => { const r = R(id); if (!r) return ''; const c = r.status === 'pass' ? 'ok' : r.status === 'fail' ? 'bad' : r.status === 'review' ? 'warn' : 'na'; return h('span', { class: `chip ${c}`, 'data-s': r.status, title: r.note ?? '' }, h('i'), t); };
    const row = (k: string, sub: string, v: string, c: HTMLElement | string = '') => h('div', { class: 'li' }, h('span', { class: 'k' }, k, sub ? h('span', { class: 'sub' }, sub) : ''), h('span', { class: 'v' }, v), c);
    const share = (d?.greenShareTotal ?? 0) * 100, base = Math.max(1, d?.greenBase ?? 0), noYards = !doc.settings.yards && doc.buildings.length > 0;
    // 27.10 (A variant): bitta foiz + manbalar boʻyicha toʻplangan chiziq; qolganlari «Batafsil» ichida
    const seg = (cls: string, v: number) => v > 0 ? h('i', { class: cls, style: `width:${Math.min(100, v / base * 100).toFixed(2)}%` }) : '';
    const leg = (cls: string, name: string, v: string) => h('span', { class: 'gl' }, h('i', { class: cls }), `${tr(name)} ${v}`);
    body.append(
      h('div', { class: 'group flat', id: 'greenKpi', style: 'padding:12px;display:flex;flex-direction:column;gap:8px' },
        h('div', { class: 'row' }, h('div', { class: 'kpi', style: 'flex:1' }, h('b', {}, `${fmt(share, 0)} %`), h('span', {}, tr('Yashillik darajasi'))), chip('green-86', `${tr('meʼyor')} ≥ 25 %`)),
        h('div', { class: 'gbar', role: 'img', 'aria-label': `${tr('Yashillik darajasi')} ${fmt(share, 0)} %` },
          h('div', { class: 'gfill' }, seg('g-park', d?.greenArea ?? 0), seg('g-yard', d?.yardGreen ?? 0), seg('g-play', d?.yardPlay ?? 0)), h('b', { style: 'left:25%', title: '25 %' })),
        h('div', { class: 'glegend' },
          leg('g-park', 'Park va skverlar', `${fmt(d?.greenArea ?? 0)} m²`),
          leg('g-yard', 'Hovli maysasi', noYards ? `— ${tr('oʻchiq')}` : `${fmt(d?.yardGreen ?? 0)} m²`),
          leg('g-play', 'Maydonchalar', `${fmt(d?.yardPlay ?? 0)} m²`)),
        noYards ? h('div', { class: 'note warn row', id: 'yardsOff', style: 'align-items:center;justify-content:space-between' }, h('span', {}, tr('Hovlilar hisobga olinmayapti')),
          h('button', { class: 'btn btn-sm btn-primary', onclick: () => this.run(() => this.store.dispatch({ type: 'setSettings', patch: { yards: true } })) }, tr('Yoqish'))) : '',
        h('span', { class: 'norm' }, svgIcon(IC.book), 'ShNQ 2.07.01-23 · 86-band')),
      h('details', { class: 'how', id: 'greenMore' }, h('summary', {}, svgIcon(IC.info), tr('Batafsil: kishi boshiga, maydonchalar, daraxtlar')),
        h('div', { class: 'col' },
          h('div', { class: 'group', id: 'greenSt' },
            row(tr('Yashil kvartallar (park, skver)'), '', `${fmt(d?.greenArea ?? 0)} m²`),
            row(tr('Hovlilar maysasi'), '', `${fmt(d?.yardGreen ?? 0)} m²`),
            row(tr('Maydonchalar va yoʻlaklar (87-band)'), '', `${fmt(d?.yardPlay ?? 0)} m²`),
            row(tr('Umumiy foydalanish, kishi boshiga'), '36-jadval', d?.population ? `${fmt(d.greenPerPerson, 1)} m²` : '—', chip('green-36', '≥ 3')),
            row(tr('Hovli maydonchalari'), '4-jadval', d?.playNeed ? `${fmt(d.playGot)} / ${fmt(d.playNeed)} m²` : '—', chip('play-89', '4-jadval')),
            row(tr('Daraxtlar: hovlida / koʻchada'), '', `${fmt(d?.yardTrees ?? 0)} / ${fmt(this.streetTrees())}`),
            d?.greenRoof ? row(tr('Yashil tomlar (hisobga kirmaydi)'), '', `${fmt(d.greenRoof)} m²`) : ''),
          h('div', { class: 'group' }, h('div', { class: 'li' }, h('span', { class: 'k' }, tr('Hovlilarni avtomatik obodonlashtirish'), h('span', { class: 'sub' }, tr('trotuar, maysa, maydonchalar, yoʻlak, daraxtlar'))),
            sw({ id: 'yardsOn', label: tr('Hovlilarni avtomatik obodonlashtirish: trotuar, maysa, maydonchalar, yoʻlak, daraxtlar'), on: doc.settings.yards, onchange: v => this.run(() => this.store.dispatch({ type: 'setSettings', patch: { yards: v } })) }))),
          h('span', { class: 't-small' }, tr('Hovlilar: binolar atrofida 3 m trotuar; 4-jadval maydonchalari binolardan meʼyoriy masofada (bolalar ≥ 10 m, kattalar ≥ 6, sport ≥ 10, xoʻjalik ≥ 20); qolgani maysa, daraxtlar binodan ≥ 5 m. Bu eskiz — joylashuvni loyihachi aniqlaydi.')))),
      h('details', { class: 'how', id: 'greenBlocks' }, h('summary', {}, svgIcon(IC.info), tr('Kvartallarni park qilish')),
        h('div', { class: 'group' }, ...plan.blocks.map((b, i) => h('div', { class: 'li' }, h('span', { class: 'k' }, `${this.unitName(i)} · ${fmt(b.area / 1e4, 2)} ga`, h('span', { class: 'sub' }, useDef(b.use).name)),
          sw({ 'data-green': i, label: `${this.unitName(i)} — ${tr('Park / bogʻ')}`, on: b.use === 'yashil', onchange: v => this.setBlockUse(i, v ? 'yashil' : 'turar') }))))));
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
      const lk = this.locked(s), title = tr(s.title);
      const b = h('button', { class: `rb${lk ? ' locked' : ''}`, 'aria-label': `${s.n}. ${title}${lk ? ' — ' + lk : ''}`, title: `${s.n}. ${title}${lk ? '\n' + lk : ''}${this.siteStepOk(s) ? '' : '\n' + tr('Loyihani ochish')}`, 'data-step': s.id, 'data-paid': String(!this.siteStepOk(s)), 'aria-current': s === this.step ? 'step' : null, 'aria-expanded': s === this.step ? this.panelOpen : null, 'data-locked': !!lk, 'data-done': this.done(s), onclick: () => { if (s === this.step && this.panelOpen) { this.panelOpen = false; this.renderRail(); this.renderPanel(); } else this.go(s); } });
      b.append(svgIcon(s.icon), h('span', { class: 'n' }, s.n)); r.append(b);
    });
    this.renderToolbar();
  }
  /** pastdagi asboblar paneli: 5 asbob + bekor/qaytarish (7-qoida) */
  private renderToolbar(): void {
    const tb = this.el.tb; if (!tb) return; tb.replaceChildren();
    for (const [k, t, ic] of TOOLS) {
      const b = h('button', { class: 'rb tool', 'data-tool': k, 'aria-label': tr(t), title: tr(t), 'aria-pressed': this.mode === k, onclick: () => this.setMode(k) }); b.append(svgIcon(ic)); tb.append(b);
    }
    const canU = this.store.canUndo, canR = this.store.canRedo;
    const u = h('button', { class: 'rb', id: 'undo', disabled: !canU, 'aria-label': tr('Bekor qilish (Ctrl+Z)'), title: tr('Bekor qilish (Ctrl+Z)'), onclick: () => this.store.undo() }); u.append(svgIcon(ICON.undo));
    const rd = h('button', { class: 'rb', id: 'redo', disabled: !canR, 'aria-label': tr('Qaytarish (Ctrl+Shift+Z)'), title: tr('Qaytarish (Ctrl+Shift+Z)'), onclick: () => this.store.redo() }); rd.append(svgIcon(ICON.redo));
    tb.append(h('span', { class: 'sepv' }), u, rd);
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
    this.renderToolbar(); this.renderToolPanel();
  }
  private renderToolPanel(): void {
    let el = this.el.stage.querySelector<HTMLElement>('.toolpanel');
    const S = this.scene.section;
    if (this.mode !== 'section' && this.mode !== 'pipette') { el?.remove(); return; }
    if (!el) { el = h('div', { class: 'toolpanel glassbar', role: 'toolbar' }); this.el.stage.append(el); }
    if (this.mode === 'pipette') {
      el.replaceChildren(h('b', {}, tr('Pipetka')), h('span', { class: 't-small', id: 'pipSt' }, this.copied ? tf('Nusxa: ${this.copied.from} — endi boshqa binolarni bosing (Esc — tugatish)', { 'this.copied.from': this.copied.from }) : tr('Namuna binoni bosing: funksiya, qavatlar, material, tom, parapet, quyosh himoyasi nusxalanadi')));
      return;
    }
    const z0 = S?.kind === 'h' ? S.z : 10, zT = h('b', { class: 'num' }, `${fmt(z0, 1)} m`);
    const zIn = range({ min: 1, max: 120, step: 0.5, value: z0, id: 'secZ', 'aria-label': tr('Kesim balandligi'), oninput: v => { this.scene.setSection({ kind: 'h', z: v }); zT.textContent = `${fmt(v, 1)} m`; } });
    el.replaceChildren(h('b', {}, tr('Kesim')),
      h('div', { class: 'seg sm' },
        h('button', { 'aria-pressed': S?.kind === 'h', id: 'secH', onclick: () => { this.setTool(null); this.scene.setSection({ kind: 'h', z: z0 }); this.renderToolPanel(); } }, tr('Gorizontal')),
        h('button', { 'aria-pressed': S?.kind === 'v', id: 'secV', onclick: () => { this.setTool(new SectionLineTool(this.scene, (a, b) => { this.scene.setSection({ kind: 'v', a, b }); this.setTool(null); this.renderToolPanel(); })); } }, tr('Vertikal (chizish)'))),
      S?.kind === 'h' ? h('div', { style: 'width:160px' }, zIn) : '', S?.kind === 'h' ? zT : '',
      h('button', { class: 'btn btn-sm', id: 'secOff', disabled: !S, onclick: () => { this.scene.setSection(null); this.renderToolPanel(); } }, tr('Olib tashlash')));
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
    const item = (t: string, fn: () => void, kbd = '', danger = false) => h('button', { class: danger ? 'd' : '', role: 'menuitem', onclick: () => { m.remove(); fn(); } }, h('span', {}, t), kbd ? h('span', { class: 'kbd' }, kbd) : '');
    const m = h('div', { class: 'menu cmenu', role: 'menu' });
    const nM = this.marked.b.length + this.marked.c.length, rmN = doc.removed?.length ?? 0;
    const cid = !b && !this.tool ? this.scene.pickAnyContext(x, y) : null;
    if (this.tool) {
      // chizish paytida: tugatish, oxirgi nuqta, bekor qilish
      const key = (k: string) => { const t = this.tool; if (!t?.key) return; t.key(new KeyboardEvent('keydown', { key: k })); if (k === 'Escape') this.setTool(null); else if (this.tool) this.el.hint.textContent = this.tool.hint; };
      m.append(h('div', { class: 'mh' }, 'Chizish'),
        this.tool.commit ? item('Chizishni tugatish', () => this.endTool(), 'Enter') : '',
        item('Oxirgi nuqtani oʻchirish', () => key('Backspace'), 'Backspace'),
        h('hr'),
        item('Bekor qilish', () => key('Escape'), 'Esc', true));
    } else if (nM > 1) {
      m.append(h('div', { class: 'mh' }, `Tanlangan: ${nM} ta`),
        item('Tanlovni bekor qilish', () => this.setMarked([], []), 'Esc'),
        h('hr'),
        item(`Hammasini oʻchirish (${nM})`, () => this.deleteMarked(), 'Del', true));
    } else if (cid != null) {
      m.append(h('div', { class: 'mh' }, 'Atrofdagi bino (OSM)'),
        item('Tanlash', () => this.setMarked([], [cid])),
        item('Tanlovga qoʻshish', () => this.setMarked(this.marked.b, [...this.marked.c, cid]), 'Shift'),
        rmN ? item(`Olib tashlanganlarni qaytarish (${rmN})`, () => this.restoreRemoved()) : '',
        h('hr'),
        item('Sahnadan olib tashlash', () => { this.setMarked([], [cid]); this.deleteMarked(); }, 'Del', true));
    } else if (b) {
      const sel = () => { this.sel = b.id; this.scene.select(b.id); };
      m.append(h('div', { class: 'mh' }, `${useDef(b.use).name} · ${b.floors} qavat`),
        item('Tahrirlash', () => { sel(); this.inspTab = 'hajm'; this.renderAll(); }),
        item('Qavat qoʻshish', () => this.run(() => this.store.dispatch({ type: 'updateBuilding', id: b.id, patch: { floors: b.floors + 1 } })), '+'),
        item('Qavat olib tashlash', () => this.run(() => this.store.dispatch({ type: 'updateBuilding', id: b.id, patch: { floors: Math.max(1, b.floors - 1) } })), '−'),
        item('Qavatlar va terrasa…', () => { sel(); this.inspTab = 'qavat'; this.renderAll(); }, 'PgUp'),
        item('Fasad va tom…', () => { sel(); this.lookTarget = 'sel'; this.go(STEPS.find(x => x.id === 'fasad')!); }),
        h('hr'),
        item('Uslubni nusxalash (pipetka)', () => { this.mode = 'pipette'; this.copied = null; this.renderToolbar(); this.pipette(b.id); }, 'I'),
        this.copied ? item(`Uslubni qoʻyish (${this.copied.from})`, () => this.pipette(b.id)) : '',
        item('Nusxa (yoniga)', () => { sel(); this.renderAll(); (this.el.stage.querySelector('#iDup') as HTMLButtonElement | null)?.click(); }),
        item('Yaqinlashtirish', () => this.scene.frameBuilding(this.store.doc, b.id), 'F'),
        h('hr'),
        item('Oʻchirish', () => this.store.dispatch({ type: 'removeBuilding', id: b.id }), 'Del', true));
    } else {
      const gp = this.scene.pick(x, y);
      m.append(h('div', { class: 'mh' }, 'Sahna'),
        this.step.id === 'uchastka' && gp ? item('Loyiha markazini shu yerga koʻchirish', () => this.goTo({ name: 'Xaritada tanlangan joy', detail: '', at: frame(doc.origin).toGeo(gp) }, null)) : '',
        item('Loyihani koʻrsatish', () => this.scene.frameDoc(this.store.doc)),
        this.scene.isolated ? item('Izolyatsiyadan chiqish', () => this.setIso(null)) : this.blockIndexAt(gp) != null ? item('Dahani izolyatsiya qilish', () => this.setIso(this.blockIndexAt(gp))) : '',
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
    if (!this.siteStepOk(s)) { void siteGate(this.store.doc.id, this.siteHa()).then(ok => { if (ok) this.go(s); }); return; }
    if (needsLogin(s.id)) { void ensureLogin(s.id, tf('«${t}» va keyingi qadamlarda ishlash uchun kiring. Hisob bepul.', { t: tr(s.title) })).then(ok => { if (ok) this.go(s); }); return; }
    if (this.locked(s) && s.phase > BUILT_PHASE) { toast(`«${s.title}» — ${this.locked(s)}`); }
    else if (this.locked(s)) { toast(this.locked(s)!); return; }
    if (this.sframe) this.endFrame();
    this.setTool(null); this.step = s; this.panelOpen = true; track(`mr/step/${s.id}`, true);
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
  /** ochilgan <details> (id li) panel qayta chizilganda ham ochiq qoladi */
  private openDet = new Set<string>();
  private rectWH: [number, number] = [120, 100];
  private keepDetails(root: HTMLElement): void {
    root.querySelectorAll<HTMLDetailsElement>('details[id]').forEach(d => {
      if (this.openDet.has(d.id)) d.open = true;
      d.addEventListener('toggle', () => { if (d.open) this.openDet.add(d.id); else this.openDet.delete(d.id); });
    });
  }
  private renderPanel(): void {
    this.showAptBoxes(); this.syncBTools(); this.syncHandles();
    if (this.sframe) { this.el.panel.classList.remove('shut'); this.root?.classList.remove('pshut'); this.renderFramePanel(); return; }
    const shut = !this.panelOpen && !this.inspOn(); this.el.panel.classList.toggle('shut', shut); this.root?.classList.toggle('pshut', shut);
    if (this.inspOn()) { this.renderInspector(); return; }
    const s = this.step, i = STEPS.indexOf(s), p = this.el.panel;
    // shu qadam qayta chizilsa (bino tanlash, qavat) — panel aylantirish joyi saqlanadi
    const keep = p.dataset.mode === 'step' && p.dataset.step === s.id ? p.querySelector('.body')?.scrollTop ?? 0 : 0;
    p.dataset.mode = 'step'; p.dataset.step = s.id;
    if (this.scene.selFloor != null) this.scene.setSelFloor(null);
    if (!this.sel) this.dragMode = 'auto';
    const prev = STEPS[i - 1], next = STEPS[i + 1];
    const body = h('div', { class: 'body' });
    const lk = s.phase > BUILT_PHASE ? this.locked(s) : null;
    if (lk) body.append(h('div', { class: 'locked' }, tf('Bu qadam ${s.phase}-bosqichda quriladi. Reja va darvoza shartlari — «Yadro arxitekturasi» hujjatida.', { 's.phase': s.phase })));
    else this.panelBody(s, body);
    this.keepDetails(body);
    p.replaceChildren(
      h('header', {}, h('div', { class: 'sp-step' }, h('span', {}, tf('${s.n}-qadam / ${t}', { 's.n': s.n, t: STEPS.length })), h('span', { class: 'sp-prog' }, h('i', { style: `width:${Math.round(s.n / STEPS.length * 100)}%` }))), h('h2', {}, tr(s.title)), h('p', {}, tr(s.lead))),
      body,
      h('footer', {},
        h('button', { class: 'btn', disabled: !prev, onclick: () => prev && this.go(prev) }, ...icl(IC.back, tr('Oldingi'))),
        h('button', { class: 'btn primary', disabled: !next, onclick: () => next && this.go(next) }, tr('Keyingi'), svgIcon(IC.next))));
    if (keep) body.scrollTop = keep;
  }

  private panelBody(s: StepDef, body: HTMLElement): void {
    const doc = this.store.doc;
    if (s.id === 'uchastka') {
      // 1-qadam (27.10: «Hudud» + «Uchastka»): Joy → Chegara → Kirish va yoʻllar
      const sec = (n: number, t: string, id: string) => h('div', { class: 'stepsec', id }, h('b', {}, String(n)), h('span', {}, tr(t)));
      body.append(sec(1, 'Joy', 'secJoy')); this.hududPanel(body);
      body.append(sec(2, 'Chegara', 'secSite')); this.uchastkaPanel(body);
      if (this.store.doc.site) { body.append(sec(3, 'Kirish va yoʻllar', 'secAccess')); body.append(this.accessBlock()); }
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
      const keep = new Set(doc.keep);
      const row = (id: string, icon: string, k: string, sub: string, fmtL: string, act: () => void) => h('div', { class: 'li' }, svgIcon(icon), h('span', { class: 'k' }, k, sub ? h('span', { class: 'sub' }, sub) : ''), h('span', { class: 'norm' }, fmtL),
        h('button', { class: 'btn btn-ghost icon-btn btn-sm', id, 'aria-label': `${tr('Yuklab olish')}: ${k} (${fmtL})`, title: tr('Yuklab olish'), onclick: act }, svgIcon(DL)));
      const glb = (ctx: boolean) => () => void this.scene.exportGLB(ctx).then(b => download(`${safe(doc.name)}${ctx ? '_atrof' : ''}.glb`, b)).catch(e => toast(`GLB: ${(e as Error).message}`));
      const CUBE = '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5"/>', IMG = '<path d="M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15.5 8.5h.01"/>';
      body.append(
        h('button', { class: 'btn btn-primary btn-lg btn-block', id: 'exPdf', onclick: () => this.openReport() }, ...icl('<path d="M6 3h12v18H6zM9 8h6M9 12h6M9 16h4"/>', tr('Hisobot (PDF)'))),
        h('span', { class: 't-small' }, tr('Yangi oynada: koʻrinishlar, TEP, meʼyoriy reyestr va taxminlar; «PDF saqlash» tugmasi A4 formatida saqlaydi.')),
        h('div', { class: 'glabel' }, h('span', {}, tr('Loyiha'))),
        h('div', { class: 'group' },
          row('exJson', '<path d="M6 3h8l5 5v13H6zM14 3v5h5"/>', tr('Loyiha fayli'), tr('boshqa kompyuterda «Fayldan ochish»'), 'JSON', () => void this.ul.exportData(this.store.doc).then(L => download(`${safe(doc.name)}.archemistry.json`, exportJSON(this.store.doc, L)))),
          row('exXlsx', '<path d="M4 5h16v14H4zM4 10h16M4 15h16M10 5v14"/>', tr('TEP va reyestr'), tr('TEP · Binolar · Reyestr · Maʼlumot'), 'XLSX', () => download(`${safe(doc.name)}_TEP.xlsx`, new Blob([this.tepXlsx() as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))),
          row('exPng', IMG, tr('Sahna rasmi'), '', 'PNG', () => download(`${safe(doc.name)}.png`, this.scene.snapshot()))),
        h('div', { class: 'glabel' }, h('span', {}, tr('Chizmalar'))),
        h('div', { class: 'group' },
          row('exGx', IMG, tr('Varaqlar: bosh reja, zonalash…'), tr('Grafika oynasini ochadi'), 'SVG · PNG', () => this.openGraphics()),
          row('exCh', '<path d="M4 4h16v16H4zM8 15l3-3 2 2 3-4"/>', tr('Chizmadon: taqdimot albomi'), tr('erkin varaqlar, diagrammalar, namunalar'), 'PDF · PPTX', () => this.openCh()),
          row('exAi', '<path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5"/>', tr('Illustrator: bosh reja'), tr('qatlamli'), 'SVG', () => downloadIllustrator(this.store.doc, this.sheetCtx())),
          row('exDxf', '<path d="M4 4h16v16H4zM4 12h16M12 4v16"/>', tr('Reja va hajmlar'), tr('mahalliy metr, qatlamlar'), 'DXF', () => download(`${safe(doc.name)}.dxf`, toDxf(this.store.doc, this.scene.inSite.filter(b => keep.has(b.id))), 'application/dxf'))),
        h('div', { class: 'glabel' }, h('span', {}, tr('3D va BIM'))),
        h('div', { class: 'group' },
          row('exGlb', CUBE, tr('3D model'), 'Blender, SketchUp, Rhino', 'GLB', glb(false)),
          row('exObj', CUBE, tr('3D model'), '', 'OBJ', () => void this.scene.exportOBJ(false).then(t => download(`${safe(doc.name)}.obj`, t, 'text/plain')).catch(e => toast(`OBJ: ${(e as Error).message}`))),
          row('exIfc', '<path d="M5 21V8l7-4 7 4v13M10 21v-5h4v5M3 21h18"/>', 'BIM', 'ArchiCAD, Revit', 'IFC4', () => download(`${safe(doc.name)}.ifc`, toIfc(this.store.doc), 'application/x-step'))),
        this.scene.hasContext ? h('div', { class: 'group' }, row('exGlbCtx', CUBE, tr('3D model atrof bilan'), '', 'GLB', glb(true))) : '',
        h('button', { class: 'btn btn-block', id: 'exJoy', title: tr('Loyiha modeli Joyshunos aksonometriyasida: quyosh yoʻli, soyalar, shamol va atrof bilan'), onclick: () => void (async () => {
          // 18-band: funksiya ranglarida va soddalashtirilgan (fasad tafsilotisiz) — Joyshunosda rangli, yorugʻ
          const sc = this.scene, prevD = sc.detail;
          sc.setStyle('funksiya'); sc.setDetail(false);
          try {
            const b = await sc.exportGLB(false);
            await cachePut('joy-inbox', { name: `${safe(doc.name)}.glb`, buf: await b.arrayBuffer(), origin: doc.origin, colors: true });
            location.href = './joyshunos.html#/axo';
          } finally { sc.setStyle(this.stylePref); sc.setDetail(prevD); }
        })().catch(e => toast(`Joyshunos: ${(e as Error).message}`)) }, ...icl(CUBE, tr('Joyshunosga yuborish (diagramma)'))),
        h('button', { class: 'btn btn-block', id: 'exRen', title: tr('Joriy 3D koʻrinish (kamera, uslub, quyosh) Render studiyasida asos rasm boʻladi — AI render, referenslar bilan'), onclick: () => void (async () => {
          const img = this.scene.snapshot(); const { sendToRender } = await import('../render/inbox');
          await sendToRender({ name: doc.name, from: 'mr', subj: 'reja', img });
        })().catch(e => toast(`Render: ${(e as Error).message}`)) }, ...icl('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>', tr('Render studiyasiga (joriy kadr)'))),
        h('details', { class: 'how' }, h('summary', {}, svgIcon(IC.info), tr('Fayllar haqida')), h('div', {}, tr('Hisobot — yangi oynada: koʻrinishlar, TEP, meʼyoriy reyestr va taxminlar; «PDF saqlash» tugmasi A4 formatida saqlaydi. Excel — TEP, binolar va reyestr varaqlari. Kvartiralar va xizmatlar natijalari — tegishli qadamda hisoblangan boʻlsa qoʻshiladi. Loyiha fayli — toʻliq nusxa: boshqa kompyuterda «Fayldan ochish» bilan ochiladi. DXF — mahalliy metrda (markaz koordinatasi faylda yozilgan), qatlamlar: uchastka, qizil chiziqlar, kvartallar funksiya boʻyicha, binolar balandligi bilan (AutoCAD/ArchiCAD da 3D). GLB — Blender, SketchUp, Rhino, ArchiCAD ochadi. OBJ — har qanday 3D dastur (Rhino, SketchUp, 3ds Max). IFC4 — har seksiya IfcBuilding, har qavat IfcBuildingStorey va hajm (IfcBuildingElementProxy), «Archemistry_Bino» xususiyatlari: funksiya, qavatlar, GFA, material, tom; uchastka WGS84 koordinatasi bilan.'))));
    }
  }

  /* ---------- Varaq ramkasi (MR-Varaqlar-V3): xaritada joylash → «Varaqni ochish» ---------- */
  private sframe: { o: SheetOpts; dim: boolean; north: boolean; idx: number | null } | null = null;
  private frameDrag: { mode: 'move' | 'rot' | 'scale'; p0: XY; c0: XY; rot0: number; d0: number; s0: number } | null = null;
  private frameOff: (() => void) | null = null;
  private startFrame(idx: number | null = null): void {
    if (needsLogin()) { void ensureLogin(undefined, 'Varaqlar bilan ishlash uchun kiring. Hisob bepul.').then(ok => { if (ok) this.startFrame(idx); }); return; }
    const doc = this.store.doc, fr = frame(doc.origin);
    const base = idx != null && doc.sheets?.[idx] ? normSheet(doc.sheets[idx].opts) : normSheet({ ...(doc.sheets?.[0]?.opts ?? {}), kind: 'zona', stamp: {} });
    let c = base.center;
    if (!c) { const pts = [...(doc.site?.rings[0] ?? []), ...doc.buildings.flatMap(b => b.footprint)].map(fr.toLocal); c = pts.length ? [(Math.min(...pts.map(p => p[0])) + Math.max(...pts.map(p => p[0]))) / 2, (Math.min(...pts.map(p => p[1])) + Math.max(...pts.map(p => p[1]))) / 2] : [0, 0]; }
    if (base.paper === 'fit') base.paper = 'A1';
    if (!base.scale) { const ha = doc.site ? Math.abs(area(doc.site.rings[0].map(fr.toLocal))) / 1e4 : 1; base.scale = recommendScale(ha, base.kind).scale; }
    this.sframe = { o: { ...base, center: c, rot: base.rot ?? 0 }, dim: true, north: !(base.rot), idx };
    this.setTool(null); this.closePop();
    if (!this.frameOff) {
      const host = this.el.scene;
      const down = (e: PointerEvent) => {
        const F = this.sframe; if (!F || e.button !== 0) return;
        const p = this.scene.pick(e.clientX, e.clientY); if (!p) return;
        const g = this.frameGeom(); if (!g) return;
        const loc = (q: XY): XY => { const dx = q[0] - g.c[0], dy = q[1] - g.c[1]; return [dx * Math.cos(-g.rot) - dy * Math.sin(-g.rot), dx * Math.sin(-g.rot) + dy * Math.cos(-g.rot)]; };
        const u = loc(p), tolM = Math.max(6, g.w / 40);
        const knob: XY = [0, g.h / 2 + Math.max(10, g.h * 0.06)];
        const corner = [[-1, -1], [1, -1], [1, 1], [-1, 1]].some(([a, b]) => Math.hypot(u[0] - a * g.w / 2, u[1] - b * g.h / 2) < tolM);
        let mode: 'move' | 'rot' | 'scale' | null = null;
        if (!F.north && Math.hypot(u[0] - knob[0], u[1] - knob[1]) < tolM) mode = 'rot';
        else if (corner) mode = 'scale';
        else if (Math.abs(u[0]) <= g.w / 2 && Math.abs(u[1]) <= g.h / 2) mode = 'move';
        if (!mode) return;
        e.stopPropagation(); e.preventDefault(); host.setPointerCapture(e.pointerId); this.scene.setOrbit(false);
        this.frameDrag = { mode, p0: p, c0: [...g.c] as XY, rot0: g.rot, d0: Math.hypot(p[0] - g.c[0], p[1] - g.c[1]), s0: F.o.scale };
      };
      const move = (e: PointerEvent) => {
        const D = this.frameDrag, F = this.sframe; if (!D || !F) return;
        const p = this.scene.pick(e.clientX, e.clientY); if (!p) return;
        if (D.mode === 'move') F.o.center = [D.c0[0] + p[0] - D.p0[0], D.c0[1] + p[1] - D.p0[1]];
        else if (D.mode === 'rot') { const a = Math.atan2(p[1] - D.c0[1], p[0] - D.c0[0]) - Math.PI / 2; F.o.rot = Math.round(a * 180 / Math.PI); }
        else { const k = Math.hypot(p[0] - D.c0[0], p[1] - D.c0[1]) / (D.d0 || 1), i0 = SCALES.indexOf(D.s0); let s2 = D.s0; if (k > 1.18 && i0 >= 0 && i0 < SCALES.length - 1) s2 = SCALES[i0 + 1]; else if (k < 0.85 && i0 > 0) s2 = SCALES[i0 - 1]; F.o.scale = s2; }
        this.syncFrame3d();
      };
      const up = (e: PointerEvent) => { if (!this.frameDrag) return; this.frameDrag = null; this.scene.setOrbit(true); try { host.releasePointerCapture(e.pointerId); } catch { /* */ } this.renderFramePanel(); };
      host.addEventListener('pointerdown', down, true); host.addEventListener('pointermove', move, true); host.addEventListener('pointerup', up, true);
      this.frameOff = () => { host.removeEventListener('pointerdown', down, true); host.removeEventListener('pointermove', move, true); host.removeEventListener('pointerup', up, true); };
    }
    this.syncFrame3d(); this.renderPanel();
    const g = this.frameGeom(); if (g) this.scene.frameRings([[[g.c[0] - g.w, g.c[1] - g.h], [g.c[0] + g.w, g.c[1] + g.h]]]);
  }
  private frameGeom(): { c: XY; w: number; h: number; col: number; rot: number } | null {
    const F = this.sframe; if (!F) return null;
    const L = sheetLayout(F.o), m = F.o.scale / 1000;
    return { c: F.o.center!, w: L.vw * m, h: L.vh * m, col: L.col ? (L.col + L.gap) * m : 0, rot: (F.o.rot ?? 0) * Math.PI / 180 };
  }
  private syncFrame3d(): void { const g = this.frameGeom(); this.scene.setSheetFrame(g ? { ...g, dim: this.sframe!.dim } : null); }
  private endFrame(): void { this.sframe = null; this.frameDrag = null; this.frameOff?.(); this.frameOff = null; this.scene.setOrbit(true); this.scene.setSheetFrame(null); this.renderPanel(); }
  /** ramkani toʻplamga yozish: mavjud varaqni yangilash yoki yangisini qoʻshish → indeks */
  private commitFrame(): number {
    const F = this.sframe!, doc = this.store.doc, sheets = [...(doc.sheets?.length ? doc.sheets : [])];
    const rec = { id: F.idx != null && sheets[F.idx] ? sheets[F.idx].id : uid('sh_'), opts: JSON.parse(JSON.stringify({ ...F.o, rot: F.north ? 0 : F.o.rot })) };
    let i: number; if (F.idx != null && sheets[F.idx]) { sheets[F.idx] = rec; i = F.idx; } else { sheets.push(rec); i = sheets.length - 1; }
    this.run(() => this.store.dispatch({ type: 'setSheets', sheets }));
    return i;
  }
  private renderFramePanel(): void {
    const F = this.sframe!, o = F.o, p = this.el.panel, doc = this.store.doc;
    p.dataset.mode = 'frame';
    const n = (doc.sheets?.length ?? 0) + (F.idx == null ? 1 : 0), num = `MR-${String((F.idx ?? (doc.sheets?.length ?? 0)) + 1).padStart(2, '0')}`;
    const set = (patch: Partial<SheetOpts>) => { Object.assign(F.o, patch); this.syncFrame3d(); this.renderFramePanel(); };
    const L = sheetLayout(o), m = o.scale / 1000, r = sheetSvg(doc, this.sheetCtx(), { ...o, rot: F.north ? 0 : o.rot }, new Date(), false, tr);
    const tile = (attrs: Record<string, unknown>, t: string) => h('button', { class: 'tile', ...attrs }, h('span', {}, t));
    p.replaceChildren(
      h('header', {}, h('div', { class: 'sp-step' }, h('span', {}, `${tr('Varaq ramkasi')} · ${num}`), h('span', { class: 'sp-prog' }, h('i', { style: 'width:100%' }))), h('h2', {}, tr('Varaq ramkasi')),
        h('p', {}, tr('Varaq chegarasini toʻgʻridan-toʻgʻri xaritada joylang: ramka = format × masshtab.'))),
      h('div', { class: 'body' },
        h('div', { class: 'tiles c3', id: 'frKind' }, ...SHEET_KINDS.map(k => tile({ 'data-kind': k.id, 'aria-pressed': o.kind === k.id, onclick: () => set({ kind: k.id }) }, tr(k.name)))),
        h('div', { class: 'field' }, h('label', {}, tr('Format')), h('div', { class: 'seg sm', id: 'frPaper' }, ...(['A4', 'A3', 'A2', 'A1', 'A0'] as const).map(x => h('button', { 'aria-pressed': o.paper === x, onclick: () => set({ paper: x }) }, x)))),
        h('div', { class: 'field' }, h('label', {}, tr('Yoʻnalish')), h('div', { class: 'seg sm' }, h('button', { 'aria-pressed': o.landscape, onclick: () => set({ landscape: true }) }, tr('Yotiq')), h('button', { 'aria-pressed': !o.landscape, onclick: () => set({ landscape: false }) }, tr('Tik')))),
        h('div', { class: 'field' }, h('label', {}, tr('Masshtab')), h('div', { class: 'tiles c3', id: 'frScale' }, ...SCALES.map(v => tile({ 'data-scale': v, 'aria-pressed': o.scale === v, onclick: () => set({ scale: v }) }, `1:${v.toLocaleString('ru-RU')}`)))),
        h('div', { class: 'row', style: 'gap:6px;align-items:flex-start' }, h('span', { class: 't-small', style: 'flex:1' }, tr('Ramkani suring va aylantiring. Burchakni tortsangiz — masshtab keyingi standartga oʻtadi.')), h('span', { class: 'chip warn' }, tr('andoza'))),
        h('div', { class: 'group' },
          h('div', { class: 'li' }, h('span', { class: 'k' }, tr('Ramkadan tashqarini xiralashtirish')), sw({ id: 'frDim', label: tr('Ramkadan tashqarini xiralashtirish'), on: F.dim, onchange: v => { F.dim = v; this.syncFrame3d(); } })),
          h('div', { class: 'li' }, h('span', { class: 'k' }, tr('Shimol — varaq tepasida')), sw({ id: 'frNorth', label: tr('Shimol — varaq tepasida'), on: F.north, onchange: v => { F.north = v; if (v) F.o.rot = 0; this.syncFrame3d(); this.renderFramePanel(); } }))),
        h('div', { class: 'glabel' }, h('span', {}, tr('Oldindan koʻrish'))),
        h('div', { class: 'planbox', id: 'frPrev', html: r.svg.replace(/^<\?xml[^>]*>\s*/, '').replace(/width="[^"]*mm" height="[^"]*mm"/, 'width="100%"') }),
        h('span', { class: 't-small', id: 'frInfo' }, `${o.paper} · 1:${o.scale.toLocaleString('ru-RU')} · ${fmt(L.vw * m, 0)} × ${fmt(L.vh * m, 0)} m · ${r.labels.full} / ${r.labels.total} ${tr('yozuv')} · ${tr('matn')} ${r.minText >= 2.5 ? '≥' : '<'} 2,5 mm`)),
      h('footer', {},
        h('button', { class: 'btn', id: 'frCancel', onclick: () => this.endFrame() }, tr('Bekor')),
        h('button', { class: 'btn', id: 'frMore', title: tr('Bu ramkani toʻplamga qoʻshib, yangi ramka'), onclick: () => { this.commitFrame(); const g = this.frameGeom()!; this.sframe = { ...F, idx: null, o: { ...F.o, center: [g.c[0] + g.w * 0.6, g.c[1]], stamp: {} } }; this.syncFrame3d(); this.renderFramePanel(); } }, tr('Yana varaq')),
        h('button', { class: 'btn btn-primary', id: 'frOpen', onclick: () => { const i = this.commitFrame(); this.endFrame(); this.openGraphics(i); } }, tr('Varaqni ochish'))));
    void n;
  }

  /** Grafika varaqlari uchun atrof — mahalliy metrda */
  private sheetCtx(): SheetCtx | null {
    const b = this.ctxMgr.current; if (!b) return null;
    const fr = frame(this.store.doc.origin), L = (r: LngLat[]) => r.map(fr.toLocal), o = b.osm;
    return {
      buildings: o.buildings.map(x => ({ id: x.id, rings: x.rings.map(L), h: x.h })),
      roads: o.roads.map(x => ({ id: x.id, pts: L(x.pts), w: x.w, cls: x.cls, ...(x.name ? { name: x.name } : {}) })),
      rails: o.rails.map(x => L(x.pts)),
      water: o.water.map(x => x.rings.map(L)),
      waterways: o.waterways.map(x => ({ pts: L(x.pts), w: x.w })),
      green: o.green.map(x => ({ rings: x.rings.map(L), kind: x.kind })),
      trees: o.trees.map(fr.toLocal),
      stops: [...(this.svc.poi?.pois ?? []).filter(p => p.kind === 'bekat' || p.kind === 'metro').map(p => ({ p: fr.toLocal(p.at), kind: p.kind as 'bekat' | 'metro' })), ...this.store.doc.pois.filter(p => p.kind === 'bekat' || p.kind === 'metro').map(p => ({ p: fr.toLocal(p.at), kind: p.kind as 'bekat' | 'metro' }))],
    };
  }
  /** Chizmadon (CH-Yagona): albom loyiha bilan saqlanadi; Varaqlardan kelgan xarita — «Loyihadan» */
  openCh(incoming?: Omit<ChInbox, 'id' | 'at'>): void {
    if (needsLogin()) { void ensureLogin(undefined, 'Chizmadonda ishlash uchun kiring. Hisob bepul.').then(ok => { if (ok) this.openCh(incoming); }); return; }
    const doc = this.store.doc;
    openChizmadon({
      project: doc.name, place: demoRow(doc.settings.district)?.name.replace(/\s+/g, ' ').trim() ?? '', origin: [doc.origin[0], doc.origin[1]], data: doc.chizmadon, incoming,
      save: d => this.run(() => this.store.dispatch({ type: 'setChizmadon', data: d as unknown as Record<string, unknown> }, 'chizmadon')),
      tik: () => this.tep().filter(r => r.v != null && r.v !== '').slice(0, 14).map(r => [r.name, r.unit, typeof r.v === 'number' ? fmt(r.v, Math.abs(r.v) < 10 ? 2 : 0) : String(r.v)]),
      siteMap: () => {
        const d2 = this.store.doc; if (!d2.site && !d2.buildings.length) return undefined;
        const o: SheetOpts = { ...SHEET_DEFAULT, kind: 'zona', show: { ...SHEET_DEFAULT.show, title: false, legend: false, plotTable: false, stamp: false, situation: false, frame: false, scaleBar: false, north: false } };
        const r = sheetSvg(d2, this.sheetCtx(), o, new Date(), false, tr);
        return mapOnly(r.svg, r.scale) ?? undefined;
      },
      plans: () => this.chPlans(),
      scene: () => { try { return this.scene.snapshot(); } catch { return null; } },
      // yopilganda manzil loyihaning oʻziga qaytadi (aks holda qayta yuklashda Chizmadon yana ochiladi)
      onClose: () => { if (/\/chizmadon$/.test(location.hash)) history.replaceState(null, '', `#/p/${this.store.doc.id}`); },
    });
  }

  /**
   * 19-band: Chizmadonga Master rejaning barcha rejalari — Varaqlar namunalari (xarita qismi, shartli belgilari bilan)
   * va har bino uchun kvartirografiya (turar qavat rejasi, kvartiralar rangda). Hisob dangasa — material koʻringanda.
   */
  private chPlans(): PlanSrc[] {
    const d2 = this.store.doc; if (!d2.site && !d2.buildings.length) return [];
    let ctx: SheetCtx | null | undefined;
    const off = { title: false, legend: false, plotTable: false, stamp: false, situation: false, frame: false, scaleBar: false, north: false };
    const mk = (id: string, name: string, on: boolean, o: Partial<SheetOpts>): PlanSrc => ({ id, name, on, get: () => {
      if (ctx === undefined) ctx = this.sheetCtx();
      const r = sheetSvg(this.store.doc, ctx, { ...SHEET_DEFAULT, ...o, show: { ...SHEET_DEFAULT.show, ...off } }, new Date(), false, tr);
      const m = mapOnly(r.svg, r.scale); return m ? { ...m, north: -(o.rot ?? 0), legend: r.legend } : null;
    } });
    const out: PlanSrc[] = [
      mk('p:plan:bosh', 'Bosh reja', true, { kind: 'bosh' }),
      // eski albomlarda «p:plan» — zonalashtirish (avval «Bosh reja» nomi bilan)
      mk('p:plan', 'Zonalashtirish (land use)', true, { kind: 'zona' }),
      mk('p:plan:fn', 'Funksional reja', false, { kind: 'bosh', layers: { bld: { fill: 'use' } } }),
      mk('p:plan:qavat', 'Qavatlar soni', false, { kind: 'qavat' }),
      mk('p:plan:figura', 'Figura-fon', false, { kind: 'figura' }),
      mk('p:plan:landshaft', 'Landshaft', false, { kind: 'landshaft' }),
      mk('p:plan:vaziyat', 'Vaziyat sxemasi', false, { kind: 'vaziyat' }),
    ];
    const plans = planApartments(d2);
    plans.slice(0, 12).forEach((pl, bi) => {
      // 29-band (egasi, 25.10): xonadonlar eksplikatsiyasi — alohida jadval, shu reja bilan bitta varaqning oʻng panelida (autolayout `pair`).
      // Chizmadon tahlili (25.10, 1-bosqich): vaziyat sxemasi ham alohida kichik katakda; reja oʻz katagini toʻldiradi —
      // katakka sigʻadigan eng yirik standart masshtabda (GOST 2.302: 1:50, 1:75, 1:100, 1:200…), choʻzilmaydi.
      const sheet = () => { const doc = this.store.doc, ps = planApartments(doc), i = ps.findIndex(x => x.bid === pl.bid); return i < 0 ? null : aptSheet(doc, ps, i, undefined, 'rang', tr, pl2 => ({ fh: doc.settings.floorHeight, bal: doc.buildings.find(b => b.id === pl2.bid)?.bal ?? null })); };
      out.push({ id: `p:apt:${pl.bid}`, name: `Kvartirografiya · ${bi + 1}-bino`, on: bi === 0, get: (fit) => {
        const a = sheet(); if (!a) return null;
        const f = a.fit(fit?.w ?? 240, fit?.h ?? 200, fit?.scale);
        return { svg: f.svg, vb: f.vb, w: f.w, h: f.h, scale: f.scale, north: a.north, contain: true, sub: f.sub };
      }, nav: { id: `p:aptnav:${pl.bid}`, name: `Vaziyat sxemasi · ${bi + 1}-bino`, title: tr('Vaziyat sxemasi'), draw: (r) => {
        const a = sheet(); return a ? a.nav(r.x, r.y, r.w, r.h) : '';
      } }, table: { id: `p:aptx:${pl.bid}`, name: `Xonadonlar eksplikatsiyasi · ${bi + 1}-bino`, title: tr('Kvartiralar eksplikatsiyasi'), rows: () => {
        const a = sheet(); if (!a) return null;
        if (!a.rows.length) return [[tr('Bu qavatda xona maʼlumoti yoʻq')]];
        const tot = a.rows.reduce((t, r) => t + r.area, 0), f1 = (v: number) => v.toFixed(1).replace('.', ',');
        return [['№', tr('Turi'), tr('Maydoni, m²')], ...a.rows.map(r => [String(r.n), `{${APT_FILL[Math.min(4, Math.max(1, r.rooms))]}}${r.rooms} ${tr('xonali')}`, f1(r.area)]), [tr('Jami'), `${a.rows.length}`, f1(tot)]];
      } } });
    });
    return out;
  }

  private openGraphics(start?: number): void {
    const doc = this.store.doc;
    openGraphics({ doc, ctx: this.sheetCtx(), start, views: doc.views.map(v => ({ id: v.id, name: v.name })),
      axo: (look, viewId, detail, ratio) => {
        const sc = this.scene, cam = sc.getCamera(), prevD = sc.detail, map: Record<string, SceneStyle> = { oq: 'arctic', funksiya: 'funksiya', fasad: 'albom', figura: 'minimal', qoralama: 'arctic' };
        sc.setStyle(map[look ?? 'oq']); sc.setDetail(look === 'qoralama' ? false : detail);
        const v = doc.views.find(x => x.id === viewId); if (v) sc.setCamera(v); else { if (sc.view !== 'axo') sc.setView('axo'); sc.frameDoc(this.store.doc); }
        const url = sc.snapshot(ratio);
        sc.setStyle(this.stylePref); sc.setDetail(prevD); sc.setCamera(cam);
        return url;
      },
      save: (sheets, styles) => this.run(() => this.store.dispatch({ type: 'setSheets', sheets, styles }, 'sheets')),
      toChizmadon: (svg, name, scale, north) => { const m = mapOnly(svg, scale); if (!m) return; this.openCh({ name, kind: 'sheet', svg: m.svg, vb: m.vb, w: m.w, h: m.h, scale: m.scale, north }); },
      dxf: () => { const keep = new Set(doc.keep); download(`${safe(doc.name)}.dxf`, toDxf(this.store.doc, this.scene.inSite.filter(b => keep.has(b.id))), 'application/dxf'); } });
  }

  /* ---------- xarita yozuvlari: masshtab chipi, qisqargan yozuvlar, «Yer uchastkalari» jadvali (4.1) ---------- */
  private plotFilter: 'all' | 'short' = 'all';
  private renderLblBar(): void {
    const st = this.scene.labelStats, el = this.el.lblbar; if (!el) return;
    const n = Math.round(st.scale), r = n >= 10000 ? Math.round(n / 1000) * 1000 : n >= 1000 ? Math.round(n / 100) * 100 : Math.round(n / 10) * 10;
    el.replaceChildren(
      this.scene.isolated ? h('button', { class: 'btn btn-sm', id: 'isoExit', title: tr('Izolyatsiyadan chiqish'), onclick: () => this.setIso(null) }, ...icl(Editor.ISO_IC, tf('Izolyatsiya: ${n}', { n: this.isoName })), svgIcon(IC.x)) : '',
      h('span', { class: 'chip', id: 'scaleChip', title: tr('Ekran masshtabi (96 dpi hisobida)') }, `≈ 1:${r.toLocaleString('ru-RU')}`),
      st.short ? h('button', { class: 'btn btn-sm', id: 'lblShort', onclick: () => { this.plotFilter = 'short'; this.plotsReq = true; this.openPlots(); } }, ...icl('<path d="M4 5h16v14H4zM4 10h16M10 5v14"/>', tf('${n} ta yozuv qisqargan — jadval', { n: st.short }))) : '');
    if (this.el.drawer.dataset.kind === 'plots' && !this.el.drawer.hidden) this.openPlots(true);
  }
  private openPlots(keep = false): void {
    const d = this.el.drawer, plan = this.plan(), st = this.scene.labelStats, hex = (c: number) => '#' + c.toString(16).padStart(6, '0');
    if (!keep && d.dataset.kind === 'plots' && !d.hidden && !this.plotsReq) { d.hidden = true; return; }
    this.plotsReq = false;
    d.dataset.kind = 'plots'; d.hidden = false;
    const idx = new Map<number, number>();
    const rows = plan.blocks.map((b, i) => { const n = (idx.get(b.blockKey) ?? 0) + 1; idx.set(b.blockKey, n); return { i, b, code: b.parcelId ? `D-${b.blockKey + 1}.${n}` : `D-${b.blockKey + 1}`, lv: st.levels[i] ?? 3 }; });
    const short = rows.filter(r => r.lv < 3).length, list = this.plotFilter === 'short' ? rows.filter(r => r.lv < 3) : rows;
    const cnt = new Map<string, number>(); plan.blocks.forEach(b => cnt.set(b.use, (cnt.get(b.use) ?? 0) + 1));
    const daha = new Set(plan.blocks.map(b => b.blockKey)).size, ha = plan.blocks.reduce((a, b) => a + b.area, 0) / 1e4;
    d.replaceChildren(
      h('div', { class: 'dhead' }, h('h3', {}, tr('Yer uchastkalari')), h('span', { class: 'chip' }, String(rows.length)), h('button', { class: 'ib sm', 'aria-label': tr('Yopish'), onclick: () => { d.hidden = true; } }, svgIcon(IC.x))),
      h('div', { class: 'regw' },
        h('div', { class: 'seg sm', role: 'group', id: 'plotSeg' },
          h('button', { 'aria-pressed': this.plotFilter === 'all', onclick: () => { this.plotFilter = 'all'; this.openPlots(true); } }, tr('Hammasi')),
          h('button', { 'aria-pressed': this.plotFilter === 'short', onclick: () => { this.plotFilter = 'short'; this.openPlots(true); } }, `${tr('Yozuvi qisqargan')} · ${short}`)),
        h('span', { class: 't-small' }, tr('Kod · funksiya · maydon, ga. Qatorni bosing — xarita shu uchastkaga boradi.')),
        h('div', { class: 'group', id: 'plotList' }, ...list.map(r => h('button', { class: 'li', 'data-plot': r.i, 'aria-pressed': r.i === this.selBlock, style: r.i === this.selBlock ? 'background:var(--sel-soft)' : '', onclick: () => { this.selBlock = r.i; this.scene.selectBlock(r.i); this.scene.frameRings(r.b.rings); this.openPlots(true); if (this.step.id === 'parsel' || this.step.id === 'hajm') this.renderPanel(); } },
          h('i', { style: `width:12px;height:12px;border-radius:3px;flex:none;background:${hex(ZONE_COL[r.b.use] ?? 0xdddddd)}` }),
          h('span', { class: 'mono', style: 'min-width:64px' }, r.code), h('span', { class: 'k' }, tr(useDef(r.b.use).name)), h('span', { class: 'v num' }, fmt(r.b.area / 1e4, 2))))),
        h('div', { class: 'glabel' }, h('span', {}, tr('Shartli belgilar'))),
        h('div', { class: 'leg' }, ...[...cnt].sort((a, b) => b[1] - a[1]).map(([u, n]) => h('div', {}, h('i', { style: `background:${hex(ZONE_COL[u] ?? 0xdddddd)}` }), h('span', {}, tr(useDef(u as Use).name)), h('b', {}, String(n))))),
        h('span', { class: 't-small' }, `${tr('Daha')} ${daha} · ${tr('uchastka')} ${rows.length} · ${fmt(ha, 1)} ga`)));
  }
  private plotsReq = false;

  /* ---------- koʻrsatkichlar va meʼyorlar ---------- */
  /** koʻrsatkichlar: 4 asosiy koʻrinadi, «Barcha koʻrsatkichlar» — 8 ta; «Meʼyorlar» — pastki oyna (reyestr) */
  private kpiAll = false;
  private renderKpi(): void {
    const c = this.last; if (!c) return;
    setExportArea(c.d.siteHa ?? 0); setExportProject(this.store.doc.id);   // narx × k = √(ga/3), loyiha shifti
    const d = c.d, dens = abroadRules(c.results.filter(r => r.id === 'density-84'), placeOf(this.store.doc.origin[0], this.store.doc.origin[1]).norms)[0];
    const k = (label: string, v: string, s?: string, id?: string, x = false, x2 = false) => h('div', { class: `kpi${x ? ' x' : ''}${x2 ? ' x2' : ''}`, 'data-s': s, id }, h('b', {}, v), h('span', {}, tr(label)));
    const open = !this.el.drawer.hidden;
    this.el.kpi.classList.toggle('all', this.kpiAll);
    this.el.kpi.replaceChildren(
      k('Uchastka, ga', d.siteHa ? fmt(d.siteHa, 2) : '—', undefined, 'kSite'),
      k('GFA, m²', d.gfa ? fmt(d.gfa) : '—', undefined, 'kGfa'),
      k('UMN (FAR)', d.far ? fmt(d.far, 2) : '—', undefined, undefined, false, true),
      k('Qurilish zichligi', d.gsi ? fmt(d.gsi * 100, 0) + ' %' : '—', undefined, undefined, true),
      k('Oʻrt. qavat', d.avgFloors ? fmt(d.avgFloors, 1) : '—', undefined, undefined, true),
      k('Aholi', d.population ? fmt(d.population) : '—', undefined, 'kPop', false, true),
      k('Zichlik, kishi/ga', d.density ? fmt(d.density) : '—', dens?.status, 'kDens', true),
      k('Ish oʻrni', d.jobs >= 1 ? fmt(d.jobs) : '—', undefined, 'kJobs', true),
      h('button', { class: 'ib sm', id: 'kAll', 'aria-label': tr(this.kpiAll ? 'Asosiy koʻrsatkichlar' : 'Barcha koʻrsatkichlar'), title: tr(this.kpiAll ? 'Asosiy koʻrsatkichlar' : 'Barcha koʻrsatkichlar'), 'aria-pressed': this.kpiAll, onclick: () => { this.kpiAll = !this.kpiAll; this.renderKpi(); } }, svgIcon(this.kpiAll ? '<path d="M15 6l-6 6 6 6"/>' : '<path d="M9 6l6 6-6 6"/>')),
      h('button', { class: `btn more${open && this.el.drawer.dataset.kind === 'reg' ? ' on' : ''}`, id: 'kMore', 'aria-expanded': open && this.el.drawer.dataset.kind === 'reg', onclick: () => { const reg = this.el.drawer.dataset.kind === 'reg'; this.el.drawer.dataset.kind = 'reg'; this.el.drawer.hidden = reg ? !this.el.drawer.hidden : false; this.renderKpi(); } }, tr('Meʼyorlar')));
    if (!this.el.drawer.hidden && this.el.drawer.dataset.kind === 'reg') this.el.drawer.replaceChildren(h('div', { class: 'dhead' }, h('h3', {}, tr('Meʼyoriy reyestr')), h('button', { class: 'ib sm', 'aria-label': tr('Yopish'), onclick: () => { this.el.drawer.hidden = true; this.renderKpi(); } }, svgIcon(IC.x))), this.register());
    if (['tekshiruv', 'uchastka', 'kocha', 'yashil'].includes(this.step.id)) this.renderPanel();
  }

  /** Seysmik boʻlmalar sozlamasi (QMQ 2.01.03-19): maydon balli (SMT xaritasi yoki grunt toifasi, 1.6-band) va yuk koʻtaruvchi tizim (3.1-jadval) */
  private seismicRow(): HTMLElement {
    const S0 = this.store.doc.settings, sys = S0.construct ?? 'monolit', lim = lenLimit(sys, S0.seismic);
    const set = (patch: Partial<typeof S0>) => this.run(() => this.store.dispatch({ type: 'setSettings', patch }));
    return h('div', { class: 'group', id: 'seisRow' },
      h('div', { class: 'li', style: 'flex-wrap:wrap;gap:8px' },
        h('span', { class: 'k' }, tr('Seysmik boʻlmalar'), h('span', { class: 'sub' }, tr('Maydon seysmikligi — SMT xaritasi yoki grunt toifasi boʻyicha (1.6-band, 1.1-jadval); Toshkent hududi — 8 ball (1-ilova). Boʻlma uzunligi — 3.1-jadval.'))),
        h('div', { class: 'seg sm', role: 'group', id: 'seisBall', 'aria-label': tr('Seysmiklik, ball') }, ...[7, 8, 9].map(b => h('button', { 'aria-pressed': S0.seismic === b, 'data-ball': b, onclick: () => set({ seismic: b }) }, `${b}`)))),
      h('div', { class: 'li', style: 'flex-wrap:wrap;gap:8px' },
        h('div', { class: 'seg sm', role: 'group', id: 'seisSys', 'aria-label': tr('Yuk koʻtaruvchi tizim'), style: 'flex-wrap:wrap' }, ...CONSTRUCT_SYS.map(k => h('button', { 'aria-pressed': sys === k, 'data-sys': k, title: `${SYS[k].name} · ${SYS[k].row}`, onclick: () => set({ construct: k }) }, tr({ monolit: 'Monolit devor', karkas: 'Karkas', toldirgich: 'Toʻldiruvchili', gisht: 'Gʻisht' }[k])))),
        h('span', { class: 'chip', id: 'seisLim' }, lim == null ? tr('NSTT — cheklanmagan') : tf('boʻlma ≤ ${l} m · chiqish ≤ ${p} m', { l: lim, p: SYS[sys].proj }))));
  }
  private regFilter: 'all' | 'fail' = 'all';
  private regOpen: string | null = null;
  private register(): HTMLElement {
    const all = this.allRules();
    const bad = all.filter(r => r.status === 'fail').length, rs = this.regFilter === 'fail' ? all.filter(r => r.status === 'fail' || r.status === 'review') : all;
    const CLS: Record<Result['status'], string> = { pass: 'ok', fail: 'bad', review: 'warn', na: 'na' };
    const slash = (u?: string) => !!u && u.startsWith('/');
    const o = this.store.doc.origin, abroad = placeOf(o[0], o[1]).norms !== 'UZ';
    return h('div', { class: 'regw' },
      abroad ? h('div', { class: 'note', id: 'regAbroad' }, tr('Loyiha Oʻzbekistondan tashqarida: Oʻzbekiston meʼyorlari andoza sifatida koʻrsatiladi — «mos emas» oʻrniga «koʻrib chiqish». Mahalliy meʼyorlar profili hali ulanmagan.')) : '',
      h('div', { class: 'group', id: 'reconRow' }, h('div', { class: 'li' },
        h('span', { class: 'k' }, tr('Rekonstruksiya / renovatsiya'), h('span', { class: 'sub' }, tr('79-band, 2-jadval, 7-izoh: insolyatsiya taʼminlansa jadval masofalari ikki barobargacha qisqaradi (≥ 6 m). 2·Hmax (8-izoh) va yongʻin masofalari qisqarmaydi.'))),
        sw({ id: 'reconOn', label: tr('Rekonstruksiya / renovatsiya'), on: this.store.doc.settings.recon === true, onchange: v => this.run(() => this.store.dispatch({ type: 'setSettings', patch: { recon: v } })) }))),
      this.seismicRow(),
      h('div', { class: 'seg sm', role: 'group', id: 'regSeg' },
        h('button', { 'aria-pressed': this.regFilter === 'all', onclick: () => { this.regFilter = 'all'; this.renderKpi(); } }, `${tr('Hammasi')} · ${all.length}`),
        h('button', { 'aria-pressed': this.regFilter === 'fail', onclick: () => { this.regFilter = 'fail'; this.renderKpi(); } }, `${tr('Mos emas')} · ${bad}`)),
      h('div', { class: 'group reg' }, ...rs.map(r => {
        const open = this.regOpen === r.id, st = tr(STATUS_TXT[r.status]);
        const lim = r.limit ? `${r.limit}${r.unit && !slash(r.unit) ? ' ' + r.unit : ''}` : '', dl = r.delta ? `${r.delta > 0 ? '+' : ''}${fmt(r.delta)} %` : '';
        return h('div', { class: 'rrow', 'data-rule': r.id },
          h('button', { class: 'li', 'aria-expanded': r.note ? open : null, onclick: () => { if (!r.note) return; this.regOpen = open ? null : r.id; this.renderKpi(); } },
            h('span', { class: 'k' }, h('span', {}, tr(r.title)), h('span', { class: 'sub mono' }, `${tr(`${r.source.doc} · ${r.source.clause}`)}${r.source.verified ? '' : ` (${tr('tekshirilsin')})`}`)),
            h('span', { class: 'rval' },
              h('span', { class: `chip ${CLS[r.status]}`, 'data-s': r.status, title: st, 'aria-label': st }, h('i'), r.value != null ? h('span', { class: 'num' }, `${fmt(r.value)}${slash(r.unit) ? ' ' + r.unit : ''}`) : st),
              lim ? h('span', { class: 't-small' }, tr(lim)) : '', dl ? h('span', { class: 't-small' }, dl) : '')),
          r.note ? h('div', { class: 'rnote', hidden: !open }, tr(r.note)) : '');
      })),
      h('span', { class: 't-small' }, tr('Har qatorda «Izoh» ochiladi. Shartli qatorlar tegishli hisobdan keyin chiqadi.')));
  }

  /* ---------- sahna bilan muloqot ---------- */
  private bindScene(): void {
    const c = this.scene.renderer.domElement;
    let down: { x: number; y: number } | null = null;
    // bino muharriri: devorni itarish / binoni siljitish (sichqoncha bilan)
    let drag: { mode: 'push' | 'move' | 'floor'; id: string; p0: XY; r0: XY[]; edge: number; n: XY; floor: number; tiers0: { from: number; inset: number; edge?: number }[] } | null = null, raf = 0, pend: XY | null = null;
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
          if (hd.ins && hs.floor && !e.altKey) {
            // bino oʻrtasidagi nuqta: devor parallel suriladi (geometriya qiyshaymaydi); yangi burchak — Alt bilan
            const g1 = this.scene.pick(e.clientX, e.clientY), b = this.store.doc.buildings.find(x => x.id === hs.floor!.bid);
            if (g1 && b) { const r0 = hs.pts, n0 = r0.length, ed = (hd.i - 1 + n0) % n0, a0 = r0[ed], q0 = r0[(ed + 1) % n0], L0 = Math.hypot(q0[0] - a0[0], q0[1] - a0[1]) || 1, ccw0 = signedArea(r0) > 0;
              drag = { mode: 'push', id: b.id, p0: g1, r0, edge: ed, n: [(ccw0 ? 1 : -1) * (q0[1] - a0[1]) / L0, (ccw0 ? -1 : 1) * (q0[0] - a0[0]) / L0], floor: 0, tiers0: b.tiers ?? [] };
              this.scene.setOrbit(false); c.setPointerCapture(e.pointerId); return; }
          }
          const a = hs.pts.slice(), n = a.length;
          if (hd.ins) { const p = a[hd.i - 1], q = a[hd.i % n]; a.splice(hd.i, 0, [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]); }
          hdrag = { hs, i: hd.i, a0: a, key: `hv-${hs.id}-${Date.now()}` }; this.scene.setOrbit(false); c.setPointerCapture(e.pointerId); return;
        } }
      if (this.dragMode === 'yoq' || !this.sel || this.tool) return;
      const hit = this.scene.pickBuildingHit(e.clientX, e.clientY), g0 = this.scene.pick(e.clientX, e.clientY);
      if (!hit || hit.id !== this.sel || !g0 || (this.dragMode === 'floor' && !hit.wall)) return;
      // avto: devor — itarish, tom — siljitish
      const mode: 'push' | 'move' | 'floor' = this.dragMode === 'floor' ? 'floor' : hit.wall ? 'push' : 'move';
      const doc = this.store.doc, fr = frame(doc.origin), b = doc.buildings.find(x => x.id === this.sel)!, r0 = b.footprint.map(fr.toLocal), n = r0.length;
      let floor = 0;
      if (this.dragMode === 'floor') {
        const fh = doc.settings.floorHeight, base = Math.min(...r0.map(p => this.scene.H(p[0], p[1]))) + (b.z0 ?? 0) * fh;
        floor = Math.max(1, Math.min(b.floors, Math.floor((hit.y - base) / fh) + 1));
        this.scene.setSelFloor(floor); this.renderInspector();
        if (floor < 2) { toast('1-qavat sudralmaydi — «Qavat devori» rejimini oʻchirib, devorni torting'); return; }
      }
      let edge = 0, bd = Infinity;
      for (let k = 0; k < n; k++) { const a = r0[k], q = r0[(k + 1) % n], dx = q[0] - a[0], dy = q[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((hit.p[0] - a[0]) * dx + (hit.p[1] - a[1]) * dy) / L2)), d = Math.hypot(a[0] + t * dx - hit.p[0], a[1] + t * dy - hit.p[1]); if (d < bd) { bd = d; edge = k; } }
      const a = r0[edge], q = r0[(edge + 1) % n], L = Math.hypot(q[0] - a[0], q[1] - a[1]) || 1, ccw = signedArea(r0) > 0;
      drag = { mode, id: b.id, p0: g0, r0, edge, n: [(ccw ? 1 : -1) * (q[1] - a[1]) / L, (ccw ? -1 : 1) * (q[0] - a[0]) / L], floor, tiers0: b.tiers ?? [] };
      this.scene.setOrbit(false); c.setPointerCapture(e.pointerId);
    });
    const applyDrag = () => {
      raf = 0; if (!drag || !pend) return;
      const doc = this.store.doc, fr = frame(doc.origin), dx = pend[0] - drag.p0[0], dy = pend[1] - drag.p0[1];
      let r: XY[] | null;
      if (drag.mode === 'floor') {
        // shu qavatdan yuqorisi: + tashqariga (konsol), − ichkariga (terrasa) — faqat shu devor
        const d = Math.round((dx * drag.n[0] + dy * drag.n[1]) * 2) / 2, f = drag.floor, e = drag.edge;
        const tiers = [...drag.tiers0.filter(t => !(t.from === f && t.edge === e)), ...(d ? [{ from: f, inset: Math.max(-12, Math.min(12, -d)), edge: e }] : [])];
        this.run(() => this.store.dispatch({ type: 'updateBuilding', id: drag!.id, patch: { tiers } }, `fdrag-${drag!.id}-${drag!.p0.join()}`));
        return;
      }
      if (drag.mode === 'move') r = Math.hypot(dx, dy) < 0.3 ? drag.r0 : drag.r0.map(p => [p[0] + dx, p[1] + dy] as XY);
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
      if (!this.tool?.move) return; const p0 = this.scene.pick(e.clientX, e.clientY); if (p0) { this.tool.move(this.tool.snapTo ? this.snapPt(p0, true) : p0); const hh = this.tool.hint; if (hh !== this.lastHint) { this.lastHint = hh; this.el.hint.textContent = hh; } }
    });
    c.addEventListener('pointerup', e => {
      if (e.button === 2) { if (rdown && Math.hypot(e.clientX - rdown.x, e.clientY - rdown.y) < 5) this.ctxMenu(e.clientX, e.clientY); rdown = null; return; }
      if (box) {
        const b0 = box; box = null; b0.el.remove(); this.scene.setOrbit(true); down = null;
        if (Math.hypot(e.clientX - b0.x, e.clientY - b0.y) > 5) {
          const r = this.scene.pickInRect(this.store.doc, b0.x, b0.y, e.clientX, e.clientY);
          this.setMarked([...this.marked.b, ...r.bids, ...(this.sel ? [this.sel] : [])], [...this.marked.c, ...r.cids], this.store.doc, this.marked.r);
          // foydalanuvchi qatlami obyektlari: joriy tanlov qatlamidan, yoʻq boʻlsa — ramkada eng koʻp tushgan qatlamdan
          const ur = this.scene.pickUserInRect(b0.x, b0.y, e.clientX, e.clientY);
          if (ur.length) { const g = ur.find(x => x.layer === this.ulSel.layer) ?? ur.sort((a, b) => b.fids.length - a.fids.length)[0]; this.setUlSel(g.layer, [...(g.layer === this.ulSel.layer ? this.ulSel.fids : []), ...g.fids]); }
        } else {
          // Shift + bosish — tanlovga qoʻshish / olib tashlash
          const id = this.scene.pickBuilding(e.clientX, e.clientY), cid = id ? null : this.scene.pickAnyContext(e.clientX, e.clientY);
          const tg = <T,>(a: T[], v: T) => a.includes(v) ? a.filter(x => x !== v) : [...a, v];
          const p = id || cid != null ? null : this.scene.pick(e.clientX, e.clientY), rid = p ? this.osmRoadAt(p) : null;
          const uh = id || cid != null ? null : this.scene.pickUserFeature(e.clientX, e.clientY);
          if (id) this.setMarked(tg([...this.marked.b, ...(this.sel && this.sel !== id ? [this.sel] : [])], id), this.marked.c, this.store.doc, this.marked.r);
          else if (cid != null) this.setMarked([...this.marked.b, ...(this.sel ? [this.sel] : [])], tg(this.marked.c, cid), this.store.doc, this.marked.r);
          else if (uh) this.toggleUlSel(uh);
          else if (rid != null) this.setMarked([...this.marked.b, ...(this.sel ? [this.sel] : [])], this.marked.c, this.store.doc, tg(this.marked.r, rid));
        }
        if (this.marked.b.length + this.marked.c.length + this.marked.r.length > 1 && this.sel) { this.sel = null; this.scene.select(null); this.renderAll(); this.setMarked(this.marked.b, this.marked.c, this.store.doc, this.marked.r); }
        return;
      }
      if (drag) { drag = null; pend = null; down = null; this.scene.setOrbit(true); return; }
      if (hdrag || fdrag) { hdrag = null; fdrag = null; down = null; this.scene.setOrbit(true); this.scene.setSnapMark(null); this.syncHandles(); return; }
      if (this.mode === 'pipette' && down && Math.hypot(e.clientX - down.x, e.clientY - down.y) <= 5) { down = null; const id = this.scene.pickBuilding(e.clientX, e.clientY); if (id) this.pipette(id); return; }
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) { down = null; return; }
      down = null;
      if (this.tool) { const p0 = this.scene.pick(e.clientX, e.clientY); if (p0) { this.tool.click(this.tool.snapTo ? this.snapPt(p0) : p0, e); if (this.tool) this.el.hint.textContent = this.tool.hint; } return; }
      // foydalanuvchi qatlami obyekti (import qilingan bino, uchastka, chegara) — HAR QADAMDA tanlanadi, rangi oʻzgartiriladi.
      // Loyiha binosi va loyiha koʻchasi ustun (ular ustida boʻlsa — oʻz qadamidagi odatiy tanlov)
      {
        const uh = this.scene.pickBuilding(e.clientX, e.clientY) ? null : this.scene.pickUserFeature(e.clientX, e.clientY);
        const gp = uh ? this.scene.pick(e.clientX, e.clientY) : null;
        if (uh && !(gp && this.streetAt(gp))) {
          if (this.sel) { this.sel = null; this.scene.select(null); this.renderAll(); }
          if (this.marked.b.length || this.marked.c.length || this.marked.r.length) this.setMarked([], []);
          if (this.osmPick) { this.osmPick = null; this.scene.setPreview([]); }
          e.shiftKey ? this.toggleUlSel(uh) : this.setUlSel(uh.layer, [uh.fid]);
          return;
        }
        if (this.ulSel.fids.length) this.setUlSel('', []);
      }
      if (this.step.id === 'parsel') {
        const cid = this.scene.pickContextBuilding(e.clientX, e.clientY);
        if (cid != null) { const k = new Set(this.store.doc.keep); k.has(cid) ? k.delete(cid) : k.add(cid); this.run(() => this.store.dispatch({ type: 'setKeep', keep: [...k], at: this.keepAt(), rings: this.keepRings() })); return; }
        const oc = this.scene.pickAnyContext(e.clientX, e.clientY);
        if (oc != null) { this.setMarked([], [oc]); return; }
        const p = this.scene.pick(e.clientX, e.clientY);
        { const rid = p ? this.osmRoadAt(p) : null; if (rid != null && !(p && this.plan().blocks.some(b => pointIn(p, b.rings)))) { this.setMarked([], [], this.store.doc, [rid]); return; } }
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
      // atrofdagi (OSM) yoʻl yoki trotuar — tanlanadi (Delete bilan olib tashlanadi; Shift — tanlovga qoʻshish)
      if (!id) { const p = this.scene.pick(e.clientX, e.clientY), rid = p ? this.osmRoadAt(p) : null; if (rid != null) { if (this.sel) { this.sel = null; this.scene.select(null); this.renderAll(); } this.setMarked(e.shiftKey ? this.marked.b : [], e.shiftKey ? this.marked.c : [], this.store.doc, e.shiftKey ? (this.marked.r.includes(rid) ? this.marked.r.filter(x => x !== rid) : [...this.marked.r, rid]) : [rid]); return; } }
      if (this.marked.b.length || this.marked.c.length || this.marked.r.length) this.setMarked([], []);
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
      else if (id && ['uchastka', 'kocha', 'yashil'].includes(this.step.id) && !this.locked(HAJM()) && !needsLogin(HAJM().id)) this.step = HAJM();
      this.renderAll();
    });
  }

  private bindKeys(): void {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('.gx')) return;
      if (this.world.open) { if (e.key === 'Escape' && !(e.target as HTMLElement)?.matches?.('input,textarea')) { e.preventDefault(); this.closeWorld(); } return; }   // Varaqlar / Chizmadon oynasi ochiq — oʻz klaviaturasi bor
      const typing = (e.target as HTMLElement)?.matches?.('input,textarea,select');
      // oʻlcham yozilayotgan boʻlsa Esc faqat yozuvni oʻchiradi, asbob qoladi
      const hadBuf = !!(this.tool as { buf?: string } | null)?.buf;
      if (!typing && this.tool?.key?.(e)) { e.preventDefault(); if (this.tool) this.el.hint.textContent = this.tool.hint; if (e.key === 'Escape' && !hadBuf) this.setTool(null); return; }
      if (typing) return;
      if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey && !(document.activeElement && document.activeElement !== document.body && this.root.contains(document.activeElement) && document.activeElement.closest('.panel,.pop,.drawer'))) { e.preventDefault(); this.panelOpen = !this.panelOpen; this.closePop(); this.renderRail(); this.renderPanel(); return; }
      const z = e.key.toLowerCase() === 'z' && (e.ctrlKey || e.metaKey);
      if (z && !e.shiftKey) { e.preventDefault(); this.store.undo(); }
      else if ((z && e.shiftKey) || (e.key.toLowerCase() === 'y' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); this.store.redo(); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && (this.marked.b.length || this.marked.c.length || this.marked.r.length)) { e.preventDefault(); this.deleteMarked(); }
      else if (e.key === 'Escape' && this.sframe && !document.querySelector('.gx')) this.endFrame();
      else if (e.key === 'Escape' && (this.marked.b.length || this.marked.c.length || this.marked.r.length)) this.setMarked([], []);
      else if (e.key === 'Escape' && this.ulSel.fids.length) this.setUlSel('', []);
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

const dist = (a: LngLat, b: LngLat) => { const f = frame(a).toLocal(b); return Math.hypot(f[0], f[1]); };
const safe = (s: string) => s.replace(/[^\p{L}\p{N}_ -]+/gu, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'loyiha';
