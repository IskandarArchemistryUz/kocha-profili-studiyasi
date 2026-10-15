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
import type { Use } from '../core/doc';
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

  private parselPanel(body: HTMLElement): void {
    const plan = this.plan();
    const USES: [Use, string][] = [['turar', 'Turar joy'], ['aralash', 'Aralash'], ['ijtimoiy', 'Ijtimoiy'], ['savdo', 'Savdo / ofis'], ['yashil', 'Yashil'], ['texnik', 'Texnik']];
    const name = (u: Use) => USES.find(x => x[0] === u)?.[1] ?? u;
    if (this.selBlock != null && !plan.blocks[this.selBlock]) this.selBlock = null;
    body.append(h('div', { class: 'list', role: 'listbox', 'aria-label': 'Kvartallar' }, ...plan.blocks.map((b, i) => h('div', { class: 'it', role: 'option', 'aria-selected': i === this.selBlock, 'data-block': i, style: 'cursor:pointer', onclick: () => { this.selBlock = i === this.selBlock ? null : i; this.scene.selectBlock(this.selBlock); this.renderPanel(); } },
      h('i', { class: 'sw', style: `background:#${(ZONE_COL[b.use] ?? 0xcccccc).toString(16).padStart(6, '0')}` }), h('span', { class: 'grow' }, `K-${i + 1} · ${fmt(b.area / 1e4, 2)} ga`), h('small', { class: 'muted' }, name(b.use))))));
    if (this.selBlock != null) {
      const i = this.selBlock, b = plan.blocks[i];
      body.append(h('div', { class: 'field' }, h('span', { class: 'lb' }, `K-${i + 1} funksiyasi`),
        h('div', { class: 'chips' }, ...USES.map(([u, t]) => h('button', { class: 'zchip', 'aria-pressed': b.use === u, 'data-use': u, style: `--c:#${ZONE_COL[u].toString(16).padStart(6, '0')}`, onclick: () => this.setBlockUse(i, u) }, t)))));
    } else body.append(h('p', { class: 'note' }, 'Kvartalni roʻyxatdan yoki sahnada bosib tanlang.'));
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
        return h('label', { class: 'it' }, c, h('span', { class: 'grow' }, `K-${i + 1} · ${fmt(b.area / 1e4, 2)} ga`));
      }))));
    body.append(h('p', { class: 'note' }, 'Koʻchalardagi yashil tasmalar va daraxtlar bu hisobga kirmaydi. Meʼyor manbasi reyestrda — band raqami hali tekshirilmagan.'));
  }

  /* ---------- qadamlar ---------- */
  private locked(s: StepDef): string | null {
    if (s.phase > BUILT_PHASE) return `${s.phase}-bosqichda quriladi`;
    if (['hajm', 'kocha', 'parsel', 'yashil'].includes(s.id) && !this.store.doc.site) return 'Avval uchastkani chizing';
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
    if (s.id !== 'parsel' && this.selBlock != null) { this.selBlock = null; this.scene.selectBlock(null); }
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
    if (s.id === 'hajm') {
      const fl = h('input', { type: 'number', min: 1, max: 60, value: this.floors, id: 'fl' }) as HTMLInputElement;
      const nr = h('input', { type: 'number', min: 0, max: 10, value: this.nonRes, id: 'nr' }) as HTMLInputElement;
      fl.onchange = () => { this.floors = Math.max(1, Math.min(60, Math.round(Number(fl.value) || 1))); };
      nr.onchange = () => { this.nonRes = Math.max(0, Math.min(10, Math.round(Number(nr.value) || 0))); };
      const drawing = this.tool instanceof RectTool;
      const sel = doc.buildings.find(b => b.id === this.sel);
      body.append(
        h('div', { class: 'row' }, h('label', { class: 'field grow' }, h('span', { class: 'lb' }, 'Qavatlar'), fl), h('label', { class: 'field grow' }, h('span', { class: 'lb' }, 'Noturar pastki'), nr)),
        h('button', { class: drawing ? 'btn primary' : 'btn', id: 'drawBld', onclick: () => drawing ? this.setTool(null) : this.setTool(new RectTool(this.scene, r => {
          this.run(() => this.store.dispatch({ type: 'addBuilding', footprint: r.map(fr.toGeo), floors: this.floors, nonRes: this.nonRes }));
          this.el.hint.textContent = this.tool?.hint ?? '';
        }, toast)) }, drawing ? 'Qoʻshishni toʻxtatish' : '＋ Bino chizish'),
        doc.buildings.length ? h('div', { class: 'list', role: 'listbox', 'aria-label': 'Binolar' }, ...doc.buildings.map((b, k) => h('div', { class: 'it', role: 'option', 'aria-selected': b.id === this.sel, 'data-bid': b.id },
          h('span', { class: 'grow', style: 'cursor:pointer', onclick: () => { this.sel = b.id === this.sel ? null : b.id; this.scene.select(this.sel); this.renderPanel(); } }, `${k + 1}-bino · ${b.floors} qavat`),
          h('button', { title: 'Qavat −', 'aria-label': 'Qavat kamaytirish', onclick: () => this.run(() => this.store.dispatch({ type: 'updateBuilding', id: b.id, patch: { floors: b.floors - 1 } }, 'fl-' + b.id)) }, '−'),
          h('button', { title: 'Qavat +', 'aria-label': 'Qavat oshirish', onclick: () => this.run(() => this.store.dispatch({ type: 'updateBuilding', id: b.id, patch: { floors: b.floors + 1 } }, 'fl-' + b.id)) }, '+'),
          h('button', { title: 'Oʻchirish', 'aria-label': 'Binoni oʻchirish', onclick: () => this.store.dispatch({ type: 'removeBuilding', id: b.id }) }, '×')))) : h('p', { class: 'note' }, 'Binolar yoʻq.'),
        sel ? h('p', { class: 'note' }, 'Tanlangan bino sahnada koʻk. Delete — oʻchirish.') : '',
        h('p', { class: 'note' }, 'Bu qadam hozircha qoʻlda. 3-bosqichda ShNQ boʻyicha generator (tipologiyalar, masofalar, insolyatsiya) koʻchiriladi.'));
    }
    if (s.id === 'kocha') this.kochaPanel(body);
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
        h('td', {}, h('span', { class: 'chip', 'data-s': r.status }, STATUS_TXT[r.status] + (r.delta ? ` +${fmt(r.delta)} %` : '')))))));
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
