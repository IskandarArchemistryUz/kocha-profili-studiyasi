/**
 * Loyiha oynasi: chapda qadamlar qatori, yonida qadam paneli, markazda sahna, pastda koʻrsatkichlar.
 * Qadam almashganda faqat panel almashadi — sahna, kamera va hujjat joyida qoladi.
 */
import type { LngLat, Project } from '../core/doc';
import { Store } from '../core/store';
import { CommandError } from '../core/commands';
import { frame, type XY } from '../core/geo';
import { Scene3D, type ViewMode } from '../scene/scene';
import { autosave, exportJSON, type AutoSaver } from '../storage/db';
import { Compute, type Computed } from '../workers/compute';
import type { Result } from '../norms/rules';
import { h, svgIcon, fmt, toast, download } from './dom';
import { STEPS, BUILT_PHASE, type StepDef } from './steps';
import { ClickTool, LineTool, PolygonTool, RectTool, type Tool } from './tools';
import { computePlan, pointIn, type PlanGeo } from '../core/plan';
import { CATS, checkProfile, PROFILES, profileById, profileWidth, type Profile } from '../core/profiles';
import { ZONE_COL } from '../scene/scene';
import { clipLine } from '../scene/context3d';
import type { Use, ZoneLabel } from '../core/doc';
import { DEFAULT_GEN, generate, PARK_NAME, TYPO_NAME, type GenParams, type ParkingKind, type Typology } from '../core/generator';
import { USES, useDef } from '../core/uses';
import { gridAngle, merge, split, subdivide, type GridMode } from '../core/parcels';
import { computeWhole } from '../core/plan';
import { daySteps, insolation, localToUtc, sunPosition } from '../core/sun';
import { INSOL_BINS } from '../scene/scene';
import { uid } from '../core/doc';
import { ContextManager } from '../context/manager';
import type { ContextBundle } from '../context/load';
import { summary } from '../context/osm';
import { geocode, type Place } from '../context/geocode';
import { detectBlock, type Barrier } from '../context/blocks';

const ICON = {
  undo: '<path d="M9 7 4 12l5 5"/><path d="M4 12h11a5 5 0 0 1 0 10h-2"/>',
  redo: '<path d="m15 7 5 5-5 5"/><path d="M20 12H9a5 5 0 0 0 0 10h2"/>',
  back: '<path d="M15 6 9 12l6 6"/>',
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
    this.scene.update(doc); this.scene.frameDoc(doc);
    this.saver = autosave(fn => this.store.subscribe(c => fn(c.doc)), s => { this.el.save.dataset.s = s; this.el.saveT.textContent = s === 'saved' ? 'saqlandi' : s === 'pending' ? 'saqlanmoqda…' : 'saqlanmadi!'; });
    this.off.push(this.store.subscribe(c => this.onChange(c.doc)));
    this.bindScene(); this.bindKeys();
    this.renderAll(); this.recompute();
    if (doc.context.loaded) void this.ensureContext();
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
      ...([['plan', 'Reja'], ['axo', 'Akso'], ['persp', 'Persp']] as [ViewMode, string][]).map(([k, t]) => h('button', { 'data-view': k, 'aria-pressed': k === 'axo', onclick: () => this.setView(k) }, t)));
    const top = h('div', { class: 'top' },
      ib('back', 'Loyihalar', ICON.back, () => this.onExit()),
      h('a', { class: 'brand', href: '../index.html', title: 'Archemistry Lab portali' }, 'Archemistry Lab', h('small', {}, '· Master reja')),
      name, save, h('span', { class: 'sp' }), seg,
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
    attr.innerHTML = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> hissachilari · Relyef: AWS Terrain Tiles · <span class="sat">Tasvir: Esri, Maxar, Earthstar Geographics</span>';
    const stage = h('div', { class: 'stage' }, scene, rail, panel, hint, drawer, kpi, attr, badge);
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
    if (p.origin !== doc.origin || p.context !== doc.context || p.site !== doc.site) void this.ensureContext();
    if (this.selStreet && !doc.streets.some(x => x.id === this.selStreet)) { this.selStreet = null; this.scene.selectStreet(null); }
    if (this.sel && !doc.buildings.some(b => b.id === this.sel)) this.sel = null;
    (this.el.name as HTMLInputElement).value = doc.name;
    this.scene.select(this.sel); this.scene.update(doc);
    this.renderAll(); this.recompute();
  }

  private async recompute(): Promise<void> {
    const doc = this.store.doc, c = await this.compute.run(doc);
    if (doc !== this.store.doc) return; // eskirgan natija
    this.last = c; this.renderKpi();
  }

  private renderAll(): void {
    (this.root.querySelector('#undo') as HTMLButtonElement).disabled = !this.store.canUndo;
    (this.root.querySelector('#redo') as HTMLButtonElement).disabled = !this.store.canRedo;
    (this.root.querySelector('#undo') as HTMLButtonElement).title = this.store.canUndo ? `Bekor qilish: ${this.store.undoLabel} (Ctrl+Z)` : 'Bekor qilish (Ctrl+Z)';
    this.renderRail(); this.renderPanel();
  }

  /* ---------- kontekst ---------- */
  /** Hujjatdagi holatga mos kontekstni koʻrsatish: kerak boʻlsa keshdan yoki tarmoqdan yuklash */
  private async ensureContext(force = false): Promise<void> {
    const doc = this.store.doc, cs = doc.context;
    if (!cs.loaded) { this.showContext(null); return; }
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

  private showContext(b: ContextBundle | null): void {
    const doc = this.store.doc;
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
      ...b.osm.roads.filter(ok).map(r => ({ pts: r.pts.map(fr.toLocal), w: r.w })),
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

    const radius = h('div', { class: 'seg full', role: 'group', 'aria-label': 'Radius' }, ...[300, 500, 750, 1000].map(r => h('button', { 'aria-pressed': cs.radius === r, onclick: () => this.run(() => this.store.dispatch({ type: 'setContext', patch: { radius: r } })) }, `${r} m`)));
    body.append(h('div', { class: 'field' }, h('span', { class: 'lb' }, 'Atrof radiusi'), radius));

    if (this.ctx.busy) body.append(h('div', { class: 'field' }, h('div', { class: 'prog' }, h('i', { style: `width:${Math.round(this.ctx.frac * 100)}%` })), h('span', { class: 'note', id: 'ctxMsg' }, this.ctx.msg)));
    else if (!cs.loaded) body.append(h('button', { class: 'btn primary', id: 'ctxLoad', onclick: () => this.run(() => this.store.dispatch({ type: 'setContext', patch: { loaded: true } })) }, 'Atrofni yuklash (OSM, relyef, sunʼiy yoʻldosh)'));
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
  }

  /* ---------- 3-bosqich: quyosh, soyalar, insolyatsiya ---------- */
  private sunDate = '04-22';
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

  private async runInsolation(): Promise<void> {
    const doc = this.store.doc; if (!doc.site) return;
    const fr = frame(doc.origin), site = doc.site.rings.map(r => r.map(fr.toLocal));
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const p of site[0]) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const cell = Math.max(2, Math.sqrt((x1 - x0) * (y1 - y0) / 7000));
    const b = this.ctxMgr.current, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rad = Math.hypot(x1 - x0, y1 - y0) / 2 + 300;
    const keepIds = new Set(this.scene.inSite.map(x => x.id));
    const extra = (b?.osm.buildings ?? []).map(x => ({ rings: x.rings.map(r => r.map(fr.toLocal)), h: x.h, id: x.id }))
      .filter(x => !keepIds.has(x.id) && Math.hypot(x.rings[0][0][0] - cx, x.rings[0][0][1] - cy) < rad);
    const prisms = this.scene.prisms(doc, extra);
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
    this.insol = { busy: false, stats: { mean: sum / n, ge2: ge2 / n, ge3: ge3 / n, bins: bins.map(v => v / n), n: hours.length, date: this.sunDate } };
    this.scene.setInsolation(pts, hours, cell);
    this.renderPanel();
  }

  private quyoshPanel(body: HTMLElement): void {
    const DATES: [string, string][] = [['03-21', '21 mart'], ['04-22', '22 aprel'], ['06-22', '22 iyun'], ['09-22', '22 sentabr'], ['12-22', '22 dekabr']];
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
    body.append(h('p', { class: 'note' }, 'Hisob: 15 daqiqalik qadamlar, quyosh balandligi > 3°, loyiha binolari + saqlanadigan va atrofdagi (300 m) mavjud binolar. Meʼyoriy davomiylik SanQvaN 0331-16 / ShNQ 2.08.01-19 da — bu hujjatlar normalar papkasida yoʻq, shuning uchun «mos / mos emas» baholanmadi. Xonalar (deraza) insolyatsiyasi — 4-bosqichda.'));
    queueMicrotask(() => this.applySun());
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
    const g: GenParams = ud.floors ? { ...this.gen, minF: ud.floors[0], maxF: ud.floors[1], nonRes: 0 } : this.gen;
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
    body.append(
      h('div', { class: 'field' }, h('span', { class: 'lb' }, 'Tipologiya'),
        h('div', { class: 'chips', role: 'group', 'aria-label': 'Tipologiya' }, ...(Object.keys(TYPO_NAME) as Typology[]).map(k => h('button', { class: 'zchip', 'aria-pressed': g.typology === k, 'data-typ': k, style: '--c:var(--ink)', onclick: () => { g.typology = k; this.renderPanel(); } }, TYPO_NAME[k])))),
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
    if (this.genNotes.length || this.genFar != null) body.append(h('div', { class: 'warn', id: 'genNotes' }, ...(this.genFar != null ? [h('div', {}, h('b', {}, `Parsel UMN: ${fmt(this.genFar, 2)}`))] : []), ...this.genNotes.map(n => h('div', {}, n))));
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
        h('button', { title: 'Oʻchirish', onclick: () => this.store.dispatch({ type: 'removeBuilding', id: sel.id }) }, '×'))));
    }
    // qoʻlda chizish
    const fl = h('input', { type: 'number', min: 1, max: 60, value: this.floors, id: 'fl' }) as HTMLInputElement;
    const nr = h('input', { type: 'number', min: 0, max: 10, value: this.nonRes, id: 'nr' }) as HTMLInputElement;
    fl.onchange = () => { this.floors = Math.max(1, Math.min(60, Math.round(Number(fl.value) || 1))); };
    nr.onchange = () => { this.nonRes = Math.max(0, Math.min(10, Math.round(Number(nr.value) || 0))); };
    const drawing = this.tool instanceof RectTool;
    body.append(h('details', { class: 'manual', open: drawing || !gens }, h('summary', {}, 'Qoʻlda bino chizish'),
      h('div', { class: 'row' }, h('label', { class: 'field grow' }, h('span', { class: 'lb' }, 'Qavatlar'), fl), h('label', { class: 'field grow' }, h('span', { class: 'lb' }, 'Noturar pastki'), nr)),
      h('button', { class: drawing ? 'btn primary' : 'btn', id: 'drawBld', onclick: () => drawing ? this.setTool(null) : this.setTool(new RectTool(this.scene, r => {
        this.run(() => this.store.dispatch({ type: 'addBuilding', footprint: r.map(fr.toGeo), floors: this.floors, nonRes: this.nonRes }));
        this.el.hint.textContent = this.tool?.hint ?? '';
      }, toast)) }, drawing ? 'Qoʻshishni toʻxtatish' : '＋ Bino chizish')));
  }

  /* ---------- 2-bosqich: koʻchalar, parsellar, yashil ---------- */
  private plan(): PlanGeo {
    const d = this.store.doc;
    if (this.planCache?.doc !== d) this.planCache = { doc: d, plan: computePlan(d) };
    return this.planCache.plan;
  }

  private profileBar(id: string): HTMLElement {
    const p = profileById(id), W = profileWidth(p);
    const C: Record<string, string> = { trotuar: '#d8d2c6', yashil: '#9cc77f', velo: '#c9705a', parkovka: '#8d9097', qatnov: '#585b62', ajratuvchi: '#9cc77f' };
    return h('div', { class: 'pbar', title: p.parts.map(x => `${x.k} ${fmt(x.w, 1)} m${x.lanes ? ` (${x.lanes} qator)` : ''}`).join(' · ') },
      ...p.parts.map(x => h('i', { style: `flex:${x.w};background:${C[x.k]}` })), h('span', {}, `${fmt(W, 1)} m`));
  }

  /** Koʻcha uchini mavjud koʻcha oʻqiga yopishtirish (≤ 6 m) — chorrahalar ulanishi uchun */
  private snapStreet = (p: XY): XY => {
    const fr = frame(this.store.doc.origin); let best: XY = p, bd = 6;
    for (const st of this.store.doc.streets) {
      const a = st.axis.map(fr.toLocal);
      for (const v of a) { const d = Math.hypot(v[0] - p[0], v[1] - p[1]); if (d < bd) { bd = d; best = v; } }
      for (let i = 1; i < a.length; i++) {
        const u = a[i - 1], w = a[i], dx = w[0] - u[0], dy = w[1] - u[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - u[0]) * dx + (p[1] - u[1]) * dy) / L2));
        const q: XY = [u[0] + t * dx, u[1] + t * dy], d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd - 1.5) { bd = d; best = q; }
      }
    }
    return best;
  };

  private kochaPanel(body: HTMLElement): void {
    const doc = this.store.doc, fr = frame(doc.origin), drawing = this.tool instanceof LineTool;
    body.append(h('div', { class: 'field' }, h('span', { class: 'lb' }, 'Profil (yangi koʻcha uchun)'),
      h('div', { class: 'list res', role: 'listbox', 'aria-label': 'Profillar' }, ...PROFILES.map(p => h('div', { class: 'it', role: 'option', 'aria-selected': this.profile === p.id, 'data-prof': p.id, onclick: () => { this.profile = p.id; if (this.selStreet) this.run(() => this.store.dispatch({ type: 'updateStreet', id: this.selStreet!, patch: { profile: p.id } })); else this.renderPanel(); } },
        h('b', {}, `${p.name} · ${fmt(profileWidth(p), 1)} m `, normChip(p)), h('small', {}, `${CATS[p.cat].name} · ${p.note}`), this.profileBar(p.id))))));
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
          h('button', { class: 'btn', onclick: () => { this.osmPick = null; this.scene.setPreview([]); this.renderPanel(); } }, '×')),
        h('p', { class: 'note' }, 'Mavjud koʻcha tanlangan profil bilan qayta loyihalanadi: OSM dagi koʻrinishi yashiriladi, qizil chiziqlar va kvartallar yangi kenglik boʻyicha hisoblanadi.')));
    }
    body.append(h('button', { class: drawing ? 'btn primary' : 'btn', id: 'drawStreet', onclick: () => drawing ? this.setTool(null) : this.setTool(new LineTool(this.scene, r => {
      this.run(() => this.store.dispatch({ type: 'addStreet', axis: r.map(fr.toGeo), profile: this.profile }));
      if (this.tool) this.el.hint.textContent = this.tool.hint;
    }, toast, this.snapStreet)) }, drawing ? 'Chizishni tugatish' : '＋ Koʻcha chizish'));
    if (doc.streets.length) {
      const len = (a: XY[]) => a.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - a[i][0], p[1] - a[i][1]), 0);
      body.append(h('div', { class: 'list', role: 'listbox', 'aria-label': 'Koʻchalar' }, ...doc.streets.map((st, k) => {
        const p = profileById(st.profile);
        return h('div', { class: 'it', role: 'option', 'aria-selected': st.id === this.selStreet, 'data-sid': st.id },
          h('span', { class: 'grow', style: 'cursor:pointer', onclick: () => this.pickStreet(st.id === this.selStreet ? null : st.id) }, `${k + 1}. ${p.name} · ${fmt(profileWidth(p), 0)} m · ${fmt(len(st.axis.map(fr.toLocal)))} m`),
          h('button', { title: 'Oʻchirish', 'aria-label': 'Koʻchani oʻchirish', onclick: () => this.run(() => this.store.dispatch({ type: 'removeStreet', id: st.id })) }, '×'));
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
    if (b.parcelId) { this.run(() => this.store.dispatch({ type: 'updateParcel', id: b.parcelId!, patch: { use } })); return; }
    const fr = frame(this.store.doc.origin);
    const zones = this.store.doc.zones.filter(z => !pointIn(fr.toLocal(z.at), b.rings));
    zones.push({ id: uid('z_'), at: fr.toGeo(b.centroid), use });
    this.run(() => this.store.dispatch({ type: 'setZones', zones }));
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

  /** Tanlangan birlik joylashgan kvartalni (butunini) parsellarga boʻlish */
  private subdivideSel(): void {
    const plan = this.plan(), u = this.selBlock != null ? plan.blocks[this.selBlock] : null; if (!u) return;
    const fr = frame(this.store.doc.origin), whole = computeWhole(this.store.doc, u.blockKey); if (!whole) return;
    const lab = this.store.doc.zones.find(z => z.id === u.labelId) ?? { id: uid('z_'), at: fr.toGeo(whole.centroid), use: u.use };
    const cells = subdivide(whole.rings, this.parcelSize * 1e4, gridAngle(whole.rings, this.gridMode, this.gridAngleDeg));
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
      const ang = h('input', { type: 'number', min: -90, max: 90, step: 1, value: this.gridAngleDeg, id: 'pAng', style: 'width:64px' }) as HTMLInputElement;
      ang.onchange = () => { this.gridAngleDeg = Number(ang.value) || 0; };
      const cutting = this.tool instanceof LineTool, merging = this.tool instanceof ClickTool;
      body.append(h('div', { class: 'field', id: 'parcelBox' }, h('span', { class: 'lb' }, 'Parsellar'),
        h('div', { class: 'row' }, h('span', { class: 'grow', style: 'font-size:13px' }, 'Parsel oʻlchami'), sizeT), size,
        h('div', { class: 'seg full', role: 'group', 'aria-label': 'Toʻr' }, ...([['ns', 'Shimol–janub'], ['angle', 'Burchak'], ['street', 'Koʻcha boʻylab']] as const).map(([k, t]) => h('button', { 'aria-pressed': this.gridMode === k, 'data-grid': k, onclick: () => { this.gridMode = k; this.renderPanel(); } }, t))),
        this.gridMode === 'angle' ? h('label', { class: 'row', style: 'font-size:13px' }, 'Burchak, °', ang) : '',
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
        h('p', { class: 'note' }, 'Kesish — tanlangan parsel ustida chiziq chizing (2 nuqta, Enter). Kvartalni qayta boʻlish undagi parsellar seksiyalarini oʻchiradi.')));
    } else body.append(h('p', { class: 'note' }, 'Kvartal yoki parselni roʻyxatdan yoki sahnada bosib tanlang.'));
    const dm = this.demolition();
    if (dm.all) {
      body.append(h('div', { class: 'field', id: 'demo' }, h('span', { class: 'lb' }, 'Uchastkadagi mavjud binolar'),
        h('div', { class: 'ctxst' }, h('b', {}, `${dm.all} bino`), ` · saqlanadi ${dm.kept} · `, h('b', { style: 'color:var(--bad)' }, `buziladi ${dm.gone}`),
          dm.gone ? h('div', { class: 'muted' }, `Buziladigan dogʻ ${fmt(dm.foot)} m², taxminiy maydon ~${fmt(dm.floorArea)} m² (OSM balandligi/taxmin boʻyicha). Koʻchirish hisobi — 5-bosqichda.`) : ''),
        h('div', { class: 'row' },
          h('button', { class: 'btn grow', id: 'keepAll', onclick: () => this.run(() => this.store.dispatch({ type: 'setKeep', keep: this.scene.inSite.map(x => x.id) })) }, 'Hammasini saqlash'),
          h('button', { class: 'btn grow', id: 'dropAll', onclick: () => this.run(() => this.store.dispatch({ type: 'setKeep', keep: [] })) }, 'Hammasini buzish')),
        h('p', { class: 'note' }, 'Sahnada binoni bosing — saqlash ↔ buzish. Buziladiganlar shaffof qizil.')));
    }
  }

  private yashilPanel(body: HTMLElement): void {
    const plan = this.plan(), d = this.last?.d, rule = this.last?.results.find(r => r.id === 'green-per-person');
    const green = plan.blocks.map((b, i) => ({ b, i })).filter(x => x.b.use === 'yashil');
    body.append(h('div', { class: 'ctxst', id: 'greenSt' },
      h('b', {}, `Yashil kvartallar: ${green.length} · ${fmt((d?.greenArea ?? 0) / 1e4, 2)} ga`), h('br'),
      `Uchastkaning ${fmt((d?.greenShare ?? 0) * 100, 0)} % · kishi boshiga ${d?.population ? fmt(d.greenPerPerson, 1) + ' m²' : '— (aholi yoʻq)'}`,
      rule ? h('div', {}, h('span', { class: 'chip', 'data-s': rule.status }, `meʼyor ${rule.limit} m²/kishi`)) : ''));
    body.append(h('div', { class: 'field' }, h('span', { class: 'lb' }, 'Kvartalni yashil qilish / qaytarish'),
      h('div', { class: 'list' }, ...plan.blocks.map((b, i) => {
        const c = h('input', { type: 'checkbox', checked: b.use === 'yashil', 'data-green': i }) as HTMLInputElement;
        c.onchange = () => this.setBlockUse(i, c.checked ? 'yashil' : 'turar');
        return h('label', { class: 'it' }, c, h('span', { class: 'grow' }, `${this.unitName(i)} · ${fmt(b.area / 1e4, 2)} ga`));
      }))));
    body.append(h('p', { class: 'note' }, 'Koʻchalardagi yashil tasmalar va daraxtlar bu hisobga kirmaydi. Meʼyor manbasi reyestrda — band raqami hali tekshirilmagan.'));
  }

  /* ---------- qadamlar ---------- */
  private locked(s: StepDef): string | null {
    if (s.phase > BUILT_PHASE) return `${s.phase}-bosqichda quriladi`;
    if (['hajm', 'kocha', 'parsel', 'yashil', 'quyosh'].includes(s.id) && !this.store.doc.site) return 'Avval uchastkani chizing';
    return null;
  }
  private done(s: StepDef): boolean {
    const d = this.store.doc;
    return s.id === 'uchastka' ? !!d.site : s.id === 'hajm' ? d.buildings.length > 0 : s.id === 'kocha' ? d.streets.length > 0 : s.id === 'parsel' ? d.zones.length > 0 : s.id === 'yashil' ? d.zones.some(z => z.use === 'yashil') : false;
  }

  private renderRail(): void {
    const r = this.el.rail; r.replaceChildren();
    STEPS.forEach((s, i) => {
      if (i === 2 || i === 6 || i === 10) r.append(h('hr'));
      const lk = this.locked(s);
      const b = h('button', { 'aria-label': `${s.n}. ${s.title}${lk ? ' — ' + lk : ''}`, title: `${s.n}. ${s.title}${lk ? '\n' + lk : ''}`, 'data-step': s.id, 'aria-current': s === this.step ? 'step' : null, 'data-locked': !!lk, 'data-done': this.done(s), onclick: () => this.go(s) }, h('span', { class: 'n' }, s.n));
      b.append(svgIcon(s.icon)); r.append(b);
    });
  }

  go(s: StepDef): void {
    if (this.locked(s) && s.phase > BUILT_PHASE) { toast(`«${s.title}» — ${this.locked(s)}`); }
    else if (this.locked(s)) { toast(this.locked(s)!); return; }
    this.setTool(null); this.step = s;
    if (s.id !== 'kocha' && this.selStreet) { this.selStreet = null; this.scene.selectStreet(null); }
    if (s.id !== 'kocha' && this.osmPick) { this.osmPick = null; this.scene.setPreview([]); }
    if (s.id !== 'parsel' && s.id !== 'hajm' && this.selBlock != null) { this.selBlock = null; this.scene.selectBlock(null); }
    this.renderAll();
  }

  private setTool(t: Tool | null): void {
    this.tool?.cancel(); this.tool = t;
    /* chizish rejada aniq: sharq–shimol oʻqlari ekran oʻqlari bilan mos */
    if (t && this.scene.view !== 'plan') this.setView('plan');
    this.el.hint.hidden = !t; if (t) this.el.hint.textContent = t.hint;
    this.renderPanel();
  }

  private renderPanel(): void {
    const s = this.step, i = STEPS.indexOf(s), p = this.el.panel;
    const prev = STEPS[i - 1], next = STEPS[i + 1];
    const body = h('div', { class: 'body' });
    const lk = s.phase > BUILT_PHASE ? this.locked(s) : null;
    if (lk) body.append(h('div', { class: 'locked' }, `Bu qadam ${s.phase}-bosqichda quriladi. Reja va darvoza shartlari — «Yadro arxitekturasi» hujjatida.`));
    else this.panelBody(s, body);
    p.replaceChildren(
      h('header', {}, h('span', { class: 'lb' }, `${s.n}-qadam / 12`), h('h2', {}, s.title), h('p', {}, s.lead)),
      body,
      h('footer', {},
        h('button', { class: 'btn', disabled: !prev, onclick: () => prev && this.go(prev) }, '← Oldingi'),
        h('button', { class: 'btn primary', disabled: !next, onclick: () => next && this.go(next) }, 'Keyingi →')));
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
        h('button', { class: drawing ? 'btn primary' : 'btn', id: 'drawSite', onclick: () => drawing ? this.setTool(null) : this.setTool(new PolygonTool(this.scene, r => {
          this.run(() => this.store.dispatch({ type: 'setSite', rings: [r.map(fr.toGeo)] })); this.setTool(null); this.scene.frameDoc(this.store.doc);
        }, toast)) }, drawing ? 'Chizishni toʻxtatish' : (doc.site ? '✎ Qaytadan chizish' : '✎ Sahnada chizish')),
        this.ctxMgr.current && doc.context.loaded && doc.context.layers.roads ? h('button', { class: this.tool instanceof ClickTool ? 'btn primary' : 'btn', id: 'pickBlock', onclick: () => this.tool instanceof ClickTool ? this.setTool(null) : this.setTool(new ClickTool('Yoʻllar orasidagi kvartal ichini bosing · Esc — bekor', xy => this.pickBlock(xy))) }, this.tool instanceof ClickTool ? 'Aniqlashni toʻxtatish' : '⌖ Kvartalni bosib aniqlash') : '',
        this.ctxMgr.current && doc.context.loaded ? h('div', { class: 'seg full', role: 'group', 'aria-label': 'Kvartal chegarasi' },
          ...([['mayda', 'Mayda: barcha koʻchalar'], ['yirik', 'Yirik: asosiy koʻchalar']] as const).map(([k, t]) => h('button', { 'aria-pressed': this.blockMode === k, 'data-bm': k, onclick: () => { this.blockMode = k; this.renderPanel(); } }, t))) : '',
        h('div', { class: 'lb' }, 'yoki oʻlcham bilan, markazda'),
        h('div', { class: 'row' }, h('label', { class: 'field grow' }, h('span', { class: 'lb' }, 'Eni, m'), w), h('label', { class: 'field grow' }, h('span', { class: 'lb' }, 'Boʻyi, m'), hh),
          h('button', { class: 'btn', id: 'rectSite', style: 'align-self:end', onclick: () => {
            const a = Number(w.value), b = Number(hh.value); if (!(a >= 10 && b >= 10)) { toast('Kamida 10 m'); return; }
            const r: XY[] = [[-a / 2, -b / 2], [a / 2, -b / 2], [a / 2, b / 2], [-a / 2, b / 2]];
            this.run(() => this.store.dispatch({ type: 'setSite', rings: [r.map(fr.toGeo)] })); this.scene.frameDoc(this.store.doc);
          } }, 'Qoʻyish')),
        doc.site ? h('button', { class: 'btn danger', onclick: () => this.run(() => this.store.dispatch({ type: 'clearSite' })) }, 'Uchastkani oʻchirish') : '',
        h('p', { class: 'note' }, 'Chizish: bosing — nuqta, birinchi nuqtani bosing yoki Enter — yopish. Sudrab kamerani aylantirasiz.'));
    }
    if (s.id === 'hajm') this.hajmPanel(body);
    if (s.id === 'kocha') this.kochaPanel(body);
    if (s.id === 'quyosh') this.quyoshPanel(body);
    if (s.id === 'parsel') this.parselPanel(body);
    if (s.id === 'yashil') this.yashilPanel(body);
    if (s.id === 'tekshiruv') body.append(this.register());
    if (s.id === 'eksport') {
      body.append(
        h('button', { class: 'btn', id: 'exJson', onclick: () => download(`${safe(doc.name)}.archemistry.json`, exportJSON(this.store.doc)) }, 'Loyiha fayli (.json)'),
        h('button', { class: 'btn', id: 'exPng', onclick: () => download(`${safe(doc.name)}.png`, this.scene.snapshot()) }, 'Sahna rasmi (PNG)'),
        h('p', { class: 'note' }, 'Loyiha fayli — toʻliq nusxa: boshqa kompyuterda «Fayldan ochish» bilan ochiladi. PDF, DXF, GLB va Excel TEP — 5-bosqichda.'));
    }
  }

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
      h('button', { class: 'more', id: 'kMore', 'aria-expanded': open, onclick: () => { this.el.drawer.hidden = !this.el.drawer.hidden; this.renderKpi(); } }, open ? 'Meʼyorlar ▾' : 'Meʼyorlar ▴'));
    if (open) this.el.drawer.replaceChildren(h('h3', {}, 'Meʼyoriy reyestr'), this.register());
    if (['tekshiruv', 'uchastka', 'kocha', 'yashil'].includes(this.step.id)) this.renderPanel();
  }

  private register(): HTMLElement {
    const rs = this.last?.results ?? [];
    return h('table', { class: 'reg' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Talab'), h('th', {}, 'Qiymat'), h('th', {}, 'Meʼyor'), h('th', {}, 'Natija'))),
      h('tbody', {}, ...rs.map(r => h('tr', { 'data-rule': r.id },
        h('td', {}, h('b', {}, r.title), h('br'), h('span', { class: 'muted' }, `${r.source.doc}, ${r.source.clause}${r.source.verified ? '' : ' (tekshirilsin)'}`), r.note ? h('div', { class: 'note' }, r.note) : null),
        h('td', { class: 'num' }, r.value != null ? `${fmt(r.value)} ${r.unit ?? ''}` : '—'),
        h('td', { class: 'num' }, r.limit ? `${r.limit} ${r.unit ?? ''}` : '—'),
        h('td', {}, h('span', { class: 'chip', 'data-s': r.status }, STATUS_TXT[r.status] + (r.delta ? ` ${r.delta > 0 ? '+' : ''}${fmt(r.delta)} %` : '')))))));
  }

  /* ---------- sahna bilan muloqot ---------- */
  private bindScene(): void {
    const c = this.scene.renderer.domElement;
    let down: { x: number; y: number } | null = null;
    c.addEventListener('pointerdown', e => { if (e.button === 0) down = { x: e.clientX, y: e.clientY }; });
    c.addEventListener('pointermove', e => { if (!this.tool?.move) return; const p = this.scene.pick(e.clientX, e.clientY); if (p) this.tool.move(p); });
    c.addEventListener('pointerup', e => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) { down = null; return; }
      down = null;
      if (this.tool) { const p = this.scene.pick(e.clientX, e.clientY); if (p) { this.tool.click(p, e); if (this.tool) this.el.hint.textContent = this.tool.hint; } return; }
      if (this.step.id === 'parsel') {
        const cid = this.scene.pickContextBuilding(e.clientX, e.clientY);
        if (cid != null) { const k = new Set(this.store.doc.keep); k.has(cid) ? k.delete(cid) : k.add(cid); this.run(() => this.store.dispatch({ type: 'setKeep', keep: [...k] })); return; }
        const p = this.scene.pick(e.clientX, e.clientY);
        if (p) { const i = this.plan().blocks.findIndex(b => pointIn(p, b.rings)); this.selBlock = i >= 0 ? i : null; this.scene.selectBlock(this.selBlock); this.renderPanel(); }
        return;
      }
      if (this.step.id === 'kocha') {
        const p = this.scene.pick(e.clientX, e.clientY), fr = frame(this.store.doc.origin);
        if (p) {
          const hit = this.store.doc.streets.find(st => { const a = st.axis.map(fr.toLocal), w = profileWidth(profileById(st.profile)) / 2; for (let i = 1; i < a.length; i++) { const u = a[i - 1], v = a[i], dx = v[0] - u[0], dy = v[1] - u[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - u[0]) * dx + (p[1] - u[1]) * dy) / L2)); if (Math.hypot(u[0] + t * dx - p[0], u[1] + t * dy - p[1]) <= w) return true; } return false; });
          if (hit) { this.osmPick = null; this.scene.setPreview([]); this.pickStreet(hit.id); }
          else {
            const b = this.ctxMgr.current, adopted = new Set(this.store.doc.streets.map(x => x.osm));
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
      this.sel = id; this.scene.select(id);
      if (!id && this.step.id === 'hajm') {
        const p = this.scene.pick(e.clientX, e.clientY);
        if (p) { const i = this.plan().blocks.findIndex(b => pointIn(p, b.rings)); this.selBlock = i >= 0 ? i : null; this.scene.selectBlock(this.selBlock); }
      }
      if (id && this.step.id !== 'hajm' && !this.locked(STEPS[5])) this.step = STEPS[5];
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
      else if ((e.key === 'Delete' || e.key === 'Backspace') && this.step.id === 'kocha' && this.selStreet) { e.preventDefault(); this.store.dispatch({ type: 'removeStreet', id: this.selStreet }); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && this.sel) { e.preventDefault(); this.store.dispatch({ type: 'removeBuilding', id: this.sel }); }
      else if (e.key === 'Escape' && this.sel) { this.sel = null; this.scene.select(null); this.renderPanel(); }
    };
    window.addEventListener('keydown', onKey);
    const onUnload = () => { this.saver.flush(); };
    window.addEventListener('pagehide', onUnload);
    this.off.push(() => window.removeEventListener('keydown', onKey), () => window.removeEventListener('pagehide', onUnload));
  }
}

const normChip = (p: Profile) => { const n = checkProfile(p).length; return h('span', { class: 'chip', 'data-s': p.cat === 'piyoda' ? 'review' : n ? 'fail' : 'pass', title: n ? `${n} ta chetlanish` : 'ShNQ 2.07.01-23 ga mos' }, p.cat === 'piyoda' ? 'hisob boʻyicha' : n ? `${n} chetlanish` : 'ShNQ ✓'); };
const dist = (a: LngLat, b: LngLat) => { const f = frame(a).toLocal(b); return Math.hypot(f[0], f[1]); };
const safe = (s: string) => s.replace(/[^\p{L}\p{N}_ -]+/gu, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'loyiha';
