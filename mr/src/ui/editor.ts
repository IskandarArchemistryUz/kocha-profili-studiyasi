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
import { ClickTool, PolygonTool, RectTool, type Tool } from './tools';
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
    if (p.origin !== doc.origin || p.context !== doc.context) void this.ensureContext();
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
    void this.scene.setContext(b, doc).then(() => { if (b && !this.framedCtx) { this.framedCtx = true; if (!doc.site) this.scene.frameRadius(Math.min(doc.context.radius, 350)); } });
    this.el.attr.hidden = !b;
    (this.el.attr.querySelector('.sat') as HTMLElement).hidden = doc.context.base !== 'sputnik';
  }
  private framedCtx = false;

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

  /* ---------- qadamlar ---------- */
  private locked(s: StepDef): string | null {
    if (s.phase > BUILT_PHASE) return `${s.phase}-bosqichda quriladi`;
    if (s.id === 'hajm' && !this.store.doc.site) return 'Avval uchastkani chizing';
    return null;
  }
  private done(s: StepDef): boolean {
    const d = this.store.doc;
    return s.id === 'uchastka' ? !!d.site : s.id === 'hajm' ? d.buildings.length > 0 : false;
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
    this.setTool(null); this.step = s; this.renderAll();
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
    if (this.step.id === 'tekshiruv' || this.step.id === 'uchastka') this.renderPanel();
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
      else if ((e.key === 'Delete' || e.key === 'Backspace') && this.sel) { e.preventDefault(); this.store.dispatch({ type: 'removeBuilding', id: this.sel }); }
      else if (e.key === 'Escape' && this.sel) { this.sel = null; this.scene.select(null); this.renderPanel(); }
    };
    window.addEventListener('keydown', onKey);
    const onUnload = () => { this.saver.flush(); };
    window.addEventListener('pagehide', onUnload);
    this.off.push(() => window.removeEventListener('keydown', onKey), () => window.removeEventListener('pagehide', onUnload));
  }
}

const dist = (a: LngLat, b: LngLat) => { const f = frame(a).toLocal(b); return Math.hypot(f[0], f[1]); };
const safe = (s: string) => s.replace(/[^\p{L}\p{N}_ -]+/gu, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'loyiha';
