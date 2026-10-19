/**
 * «Mening qatlamlarim» — «Qatlamlar» oynasidagi boʻlim: fayldan import (GeoJSON), roʻyxat (yoqish/oʻchirish, toifalar,
 * rang, shaffoflik, yozuvlar) va chegara (mahalla) koʻrsatkichlari jadvali. Obyektlar IndexedDB da, hujjatda — tavsif.
 */
import type { Project } from '../core/doc';
import { uid } from '../core/doc';
import { frame } from '../core/geo';
import type { Store } from '../core/store';
import type { Scene3D } from '../scene/scene';
import type { ContextBundle } from '../context/load';
import { CRS_LIST, UL_KINDS, UL_LIMITS, categoriesOf, extentKm2, floorsOf, guessFields, osmDuplicates, parseGeoJSON, planImport, tierFor, zoneStats, type CRS, type ParsedFile, type ULFeature, type ULKind, type UserLayerMeta } from '../core/userlayers';
import { deleteLayerData, getLayerData, putLayerData } from '../storage/db';
import { h, svgIcon, toast, fmt } from './dom';
import { range, select, seg, sw } from './controls';
import { tr, tf } from '../i18n';

const IC = {
  add: '<path d="M12 5v14M5 12h14"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  target: '<circle cx="12" cy="12" r="8"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
  gear: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  table: '<path d="M4 5h16v14H4zM4 10h16M10 10v9"/>',
};
const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');

interface Pending { file: string; parsed: ParsedFile; crs: CRS; kind: ULKind; cat: string | null; name: string | null; height: string | null; floors: string | null; drop: boolean }

export interface ULHost {
  store: Store;
  scene: Scene3D;
  run(fn: () => void): void;
  refresh(): void;
  bundle(): ContextBundle | null;
  /** OSM dublikatlari yashirilganda kontekstni qayta chizish */
  redrawContext(): void;
}

export class UserLayersUI {
  /** qatlam id → obyektlar (yuklanganlari) */
  readonly data = new Map<string, ULFeature[]>();
  private loading = new Set<string>();
  private pending: Pending | null = null;
  private busy = '';
  private open = new Set<string>();
  private statsFor: string | null = null;
  private statsSel: { bld: string | null; clip: string | null } = { bld: null, clip: null };
  private input: HTMLInputElement;

  constructor(private host: ULHost) {
    this.input = h('input', { type: 'file', accept: '.geojson,.json,application/geo+json,application/json', hidden: true, id: 'ulFile' }) as HTMLInputElement;
    this.input.addEventListener('change', () => { const f = this.input.files?.[0]; this.input.value = ''; if (f) void this.read(f); });
    document.body.append(this.input);
  }
  dispose(): void { this.input.remove(); }

  /** Hujjat oʻzgarganda: yangi qatlamlar obyektlarini yuklash, sahnani yangilash */
  sync(doc: Project): void {
    for (const m of doc.userLayers ?? []) if (!this.data.has(m.id) && !this.loading.has(m.id)) {
      this.loading.add(m.id);
      void getLayerData<ULFeature>(doc.id, m.id).then(fs => { this.loading.delete(m.id); if (fs) { this.data.set(m.id, fs); this.sync(this.host.store.doc); this.host.refresh(); } })
        .catch(() => this.loading.delete(m.id));
    }
    this.host.scene.setUserLayers(doc, this.data);
    this.dedupe(doc);
  }

  /** import qilingan binolar ostidagi OSM binolari yashiriladi */
  dedupe(doc: Project): void {
    const b = this.host.bundle();
    const imp = (doc.userLayers ?? []).filter(m => m.kind === 'bino' && m.visible).flatMap(m => this.data.get(m.id) ?? []);
    const ids = b && imp.length ? osmDuplicates(b.osm.buildings, imp) : [];
    if (this.host.scene.setHiddenOsm(ids)) this.host.redrawContext();
  }

  pick(): void { this.input.click(); }

  private async read(f: File): Promise<void> {
    if (f.size > 120 * 1024 * 1024) { toast(tr('Fayl juda katta (120 MB dan ortiq)')); return; }
    this.busy = tr('Fayl oʻqilmoqda…'); this.host.refresh();
    try {
      const parsed = parseGeoJSON(await f.text());
      const g = guessFields(parsed.fields), crs: CRS = parsed.crs === 'metr' ? 'utm42' : parsed.crs;
      const pl = planImport(f.name, parsed, crs);
      this.pending = { file: f.name, parsed, crs, kind: pl.meta.kind, cat: pl.meta.catField, name: g.name, height: g.height, floors: g.floors, drop: true };
    } catch (e) { toast((e as Error).message); this.pending = null; }
    this.busy = ''; this.host.refresh();
  }

  private async commit(): Promise<void> {
    const P = this.pending; if (!P) return;
    const doc = this.host.store.doc;
    const pl = planImport(P.file, P.parsed, P.crs, P.kind, P.drop);
    const catField = P.kind === 'chegara' ? null : P.cat;
    const meta: UserLayerMeta = { ...pl.meta, id: uid('ul_'), added: new Date().toISOString(), catField, cats: categoriesOf(pl.features, catField), colorBy: catField ? 'toifa' : 'bir', nameField: P.name, heightField: P.height, floorsField: P.floors, labels: P.kind === 'chegara' && !!P.name };
    this.busy = tr('Saqlanmoqda…'); this.host.refresh();
    try {
      await putLayerData(doc.id, meta.id, pl.features);
      this.data.set(meta.id, pl.features);
      if (this.pending === P) this.pending = null;   // shu orada boshqa fayl tanlangan boʻlsa — uning shakli qoladi
      this.busy = '';
      // boʻsh loyiha boshqa joyda (masalan, Toshkent markazida) boʻlsa — loyiha markazi qatlam markaziga koʻchadi:
      // mahalliy metr tizimi markazdan uzoqda buziladi (yuzlab km da — metrlab xato)
      const cur = this.host.store.doc, c: [number, number] = [(meta.bbox[0] + meta.bbox[2]) / 2, (meta.bbox[1] + meta.bbox[3]) / 2], fr = frame(cur.origin), d = fr.toLocal(c);
      const empty = !cur.site && !cur.buildings.length && !cur.streets.length && !(cur.userLayers ?? []).length;
      if (empty && Math.hypot(d[0], d[1]) > 2000) this.host.run(() => this.host.store.dispatch({ type: 'moveProject', origin: c, carry: false }));
      else if (!empty && Math.hypot(d[0], d[1]) > 30000) toast(tr('Qatlam loyiha markazidan 30 km dan uzoqda — joyini tekshiring'));
      this.host.run(() => this.host.store.dispatch({ type: 'addUserLayer', meta }));
      this.host.scene.frameBBox(this.host.store.doc.origin, meta.bbox);
      toast(tf('Qatlam qoʻshildi: ${n} ta obyekt', { n: fmt(meta.count) }));
    } catch (e) { this.busy = ''; toast((e as Error).message || tr('Saqlanmadi')); }
    this.host.refresh();
  }

  private upd(id: string, patch: Partial<UserLayerMeta>): void { this.host.run(() => this.host.store.dispatch({ type: 'updateUserLayer', id, patch })); }

  /** «Qatlamlar» oynasidagi boʻlim */
  section(): HTMLElement {
    const doc = this.host.store.doc, L = doc.userLayers ?? [];
    return h('div', { class: 'col ulsec', id: 'ulSec', style: 'gap:9px' },
      h('div', { class: 'glabel' }, h('span', {}, tr('Mening qatlamlarim')), h('span', {}, L.length ? tf('${n} ta', { n: L.length }) : '')),
      this.pending ? this.form(this.pending) : h('button', { class: 'btn btn-sm', id: 'ulAdd', disabled: !!this.busy, onclick: () => this.pick() }, svgIcon(IC.add), h('span', {}, this.busy || tr('Fayldan qoʻshish (GeoJSON)'))),
      !L.length && !this.pending ? h('span', { class: 't-small' }, tr('Oʻz binolaringiz (Archicad, QGIS eksporti), aholi punkti va mahalla chegaralari, yer uchastkalari, yoʻllar. Koordinatalar: WGS84 yoki UTM 41/42N.')) : '',
      L.length ? h('div', { class: 'group', id: 'ulList' }, ...L.slice().reverse().map(m => this.row(m))) : '');
  }

  private row(m: UserLayerMeta): HTMLElement {
    const loaded = this.data.has(m.id), opened = this.open.has(m.id), kind = UL_KINDS.find(k => k.id === m.kind)!;
    const ib = (icon: string, title: string, on: () => void, attrs: Record<string, unknown> = {}) => h('button', { class: 'ib', type: 'button', title, 'aria-label': title, onclick: on, ...attrs }, svgIcon(icon));
    const head = h('div', { class: 'li', 'data-ul': m.id },
      sw({ label: tf('${n} — koʻrsatish', { n: m.name }), on: m.visible, onchange: v => this.upd(m.id, { visible: v }) }),
      h('span', { class: 'k' }, m.name, h('span', { class: 'sub' }, `${tr(kind.name)} · ${fmt(m.count)}${loaded ? '' : ` · ${tr('yuklanmoqda…')}`}`)),
      ib(IC.target, tr('Xaritada koʻrsatish'), () => this.host.scene.frameBBox(this.host.store.doc.origin, m.bbox)),
      ib(IC.gear, tr('Sozlash'), () => { opened ? this.open.delete(m.id) : this.open.add(m.id); this.host.refresh(); }, { 'aria-expanded': opened }),
      ib(IC.trash, tr('Olib tashlash'), () => {
        if (!confirm(tf('«${n}» qatlami olib tashlansinmi?', { n: m.name }))) return;
        this.host.run(() => this.host.store.dispatch({ type: 'removeUserLayer', id: m.id }));
        // obyektlar bazada qoladi (bekor qilish — Ctrl+Z — ishlashi uchun); faqat hujjatda yoʻq qatlamlar sahnadan ketadi
      }));
    if (!opened) return head;
    return h('div', { class: 'ulrow' }, head, this.settings(m));
  }

  private settings(m: UserLayerMeta): HTMLElement {
    const out = h('div', { class: 'col ulset', style: 'gap:8px;padding:4px 12px 12px' });
    if (m.catField) out.append(seg([{ id: 'toifa', label: tr('Toifa rangida') }, { id: 'bir', label: tr('Bir rangda') }], m.colorBy, v => this.upd(m.id, { colorBy: v }), { 'aria-label': tr('Rang') }));
    if (m.colorBy === 'bir' || !m.catField) out.append(h('label', { class: 'row ulcol', style: 'gap:8px;align-items:center' }, this.swatch(m.color, c => this.upd(m.id, { color: c }), tr('Rang')), h('span', { class: 't-small' }, tr('Qatlam rangi'))));
    if (m.kind === 'yer' || m.kind === 'chegara') out.append(h('div', { class: 'row', style: 'gap:10px;align-items:center' }, h('span', { class: 't-small', style: 'white-space:nowrap' }, tr('Toʻldirish')), h('div', { style: 'flex:1;min-width:0' }, range({ min: 0, max: 1, step: 0.05, value: m.opacity, 'aria-label': tr('Toʻldirish shaffofligi'), onchange: v => this.upd(m.id, { opacity: v }) }))));
    if (m.kind === 'chegara' && m.nameField) out.append(h('div', { class: 'row', style: 'gap:8px;align-items:center;justify-content:space-between' }, h('span', { class: 't-small' }, tr('Nomlar xaritada')), sw({ label: tr('Nomlar xaritada'), on: m.labels, onchange: v => this.upd(m.id, { labels: v }) })));
    if (m.cats.length) {
      const all = m.cats.every(c => c.on);
      out.append(h('div', { class: 'row', style: 'justify-content:space-between;align-items:center' }, h('span', { class: 't-small', style: 'font-weight:600' }, tf('Toifalar (${f})', { f: m.catField ?? '' })),
        h('button', { class: 'btn btn-ghost btn-sm', onclick: () => this.upd(m.id, { cats: m.cats.map(c => ({ ...c, on: !all })) }) }, tr(all ? 'Hammasini oʻchirish' : 'Hammasini yoqish'))));
      out.append(h('div', { class: 'leg ulcats' }, ...m.cats.map((c, i) => h('div', { 'data-cat': c.v },
        this.swatch(c.color, col => this.upd(m.id, { cats: m.cats.map((x, j) => j === i ? { ...x, color: col } : x) }), c.label),
        h('span', { style: c.on ? '' : 'opacity:.45;text-decoration:line-through' }, tr(c.label)), h('b', {}, fmt(c.n)),
        sw({ label: tf('${c} — koʻrsatish', { c: c.label }), on: c.on, onchange: v => this.upd(m.id, { cats: m.cats.map((x, j) => j === i ? { ...x, on: v } : x) }) })))));
    }
    if (m.kind === 'chegara') {
      const shown = this.statsFor === m.id;
      out.append(h('button', { class: 'btn btn-sm', 'data-ulstats': m.id, onclick: () => { this.statsFor = shown ? null : m.id; this.host.refresh(); } }, svgIcon(IC.table), h('span', {}, tr(shown ? 'Koʻrsatkichlarni yopish' : 'Mahalla koʻrsatkichlari'))));
      if (shown) out.append(this.stats(m));
    }
    out.append(h('span', { class: 't-small' }, `${tr('Fayl')}: ${m.file}`));
    return out;
  }

  private swatch(color: number, on: (c: number) => void, label: string): HTMLElement {
    const inp = h('input', { type: 'color', value: hex(color), 'aria-label': label, class: 'vh' }) as HTMLInputElement;
    inp.addEventListener('change', () => on(parseInt(inp.value.slice(1), 16)));
    return h('label', { class: 'ulsw', title: label }, h('i', { style: `background:${hex(color)}` }), inp);
  }

  /** Mahalla jadvali: binolar markazi boʻyicha; maydon — toʻliq va aholi punkti chegarasi ichida; zichlik — ichidagi qismi boʻyicha */
  private stats(m: UserLayerMeta): HTMLElement {
    const doc = this.host.store.doc, L = doc.userLayers ?? [], fh = doc.settings.floorHeight;
    const blds = L.filter(x => x.kind === 'bino'), clips = L.filter(x => x.kind === 'chegara' && x.id !== m.id);
    if (this.statsSel.bld && !blds.some(x => x.id === this.statsSel.bld)) this.statsSel.bld = null;
    if (this.statsSel.clip && !clips.some(x => x.id === this.statsSel.clip)) this.statsSel.clip = null;
    const bld = this.statsSel.bld ?? blds[0]?.id ?? null, clip = this.statsSel.clip;
    const zones = this.data.get(m.id);
    const box = h('div', { class: 'col', style: 'gap:6px' },
      h('div', { class: 'row2' },
        select({ 'aria-label': tr('Binolar qatlami'), onchange: v => { this.statsSel.bld = v || null; this.host.refresh(); } }, [{ value: '', label: tr('— binolarsiz —'), selected: !bld }, ...blds.map(x => ({ value: x.id, label: x.name, selected: x.id === bld }))]),
        select({ 'aria-label': tr('Aholi punkti chegarasi'), onchange: v => { this.statsSel.clip = v || null; this.host.refresh(); } }, [{ value: '', label: tr('— chegara tanlanmagan —'), selected: !clip }, ...clips.map(x => ({ value: x.id, label: x.name, selected: x.id === clip }))])));
    if (!zones) { box.append(h('span', { class: 't-small' }, tr('yuklanmoqda…'))); return box; }
    const bm = bld ? L.find(x => x.id === bld)! : null, bf = bld ? this.data.get(bld) ?? [] : [];
    const S = zoneStats(zones, m.nameField, bm ? bf.map(f => ({ f, floors: floorsOf(f, bm, fh) })) : [], clip ? this.data.get(clip) ?? [] : []);
    const dens = (s: (typeof S)[number]) => { const a = s.haIn ?? s.ha; return s.buildings && a > 0 ? fmt(s.gfaM2 / a, 0) : '—'; };
    box.append(h('table', { class: 'tbl ultbl', id: 'ulStats' },
      h('thead', {}, h('tr', {}, h('th', {}, tr('Mahalla')), h('th', {}, tr('ga')), h('th', {}, tr('ichida, ga')), h('th', {}, tr('binolar')), h('th', {}, tr('GFA/ga')))),
      h('tbody', {}, ...S.map(s => h('tr', {}, h('td', {}, s.name), h('td', { class: 'num' }, fmt(s.ha, 1)), h('td', { class: 'num' }, s.haIn == null ? '—' : fmt(s.haIn, 1)), h('td', { class: 'num' }, s.buildings ? fmt(s.buildings) : tr('maʼlumot yoʻq')), h('td', { class: 'num' }, dens(s)))))));
    box.append(h('span', { class: 't-small' }, tr('Bino — markazi tushgan mahallaga. «Ichida» — aholi punkti chegarasi ichidagi qismi; zichlik (umumiy maydon, m² / ga) shu qism boʻyicha, chegara tanlanmasa — toʻliq maydon boʻyicha. Umumiy maydon = oyoq izi × qavatlar (taxmin).')));
    return box;
  }

  private form(P: Pending): HTMLElement {
    const pl = planImport(P.file, P.parsed, P.crs, P.kind, P.drop), fields = P.parsed.fields;
    const opt = (cur: string | null, none: string) => [{ value: '', label: none, selected: !cur }, ...fields.map(f => ({ value: f, label: f, selected: f === cur }))];
    const set = (patch: Partial<Pending>) => { Object.assign(P, patch); this.host.refresh(); };
    const km2 = extentKm2(pl.meta.bbox), tier = tierFor(pl.features.length, km2);
    const tierNote = tier === 'free' ? '' : tier === 'server'
      ? tf('Juda katta: ${n} obyekt, ${a} km². Brauzerda sekin ishlashi mumkin; bunday hududlar server bosqichida Max obunada plitkalar bilan beriladi.', { n: fmt(pl.features.length), a: fmt(km2, 0) })
      : tf('Katta hudud: ${n} obyekt, ${a} km² — bepul rejadan katta (${f} obyekt, ${k} km²). Hozircha ochiq; obuna ulanganda ${t} rejada boʻladi.', { n: fmt(pl.features.length), a: fmt(km2, 0), f: fmt(UL_LIMITS.free.features), k: UL_LIMITS.free.km2, t: tier === 'pro' ? 'Pro' : 'Max' });
    return h('div', { class: 'card col ulform', id: 'ulForm', style: 'gap:8px;padding:12px' },
      h('b', {}, P.file), h('span', { class: 't-small' }, tf('${n} ta obyekt · ${f} ta maydon', { n: fmt(P.parsed.features.length), f: fields.length })),
      h('span', { class: 't-small', style: 'font-weight:600' }, tr('Qatlam turi')),
      seg(UL_KINDS.map(k => ({ id: k.id, label: tr(k.name) })), P.kind, v => set({ kind: v }), { id: 'ulKind', class: 'seg sm', 'aria-label': tr('Qatlam turi') }),
      h('span', { class: 't-small' }, tr(UL_KINDS.find(k => k.id === P.kind)!.note)),
      h('label', { class: 'field' }, h('span', { class: 't-small' }, tr('Koordinata tizimi')), select({ id: 'ulCrs', onchange: v => set({ crs: v as CRS }) }, CRS_LIST.map(c => ({ value: c.id, label: tr(c.name), selected: c.id === P.crs })))),
      P.kind !== 'chegara' ? h('label', { class: 'field' }, h('span', { class: 't-small' }, tr('Toifa maydoni (rang va alohida yoqish)')), select({ id: 'ulCat', onchange: v => set({ cat: v || null }) }, opt(P.cat, tr('— bitta rang —')))) : '',
      P.kind === 'chegara' || P.kind === 'yer' ? h('label', { class: 'field' }, h('span', { class: 't-small' }, tr('Nom maydoni')), select({ id: 'ulName', onchange: v => set({ name: v || null }) }, opt(P.name, tr('— nomsiz —')))) : '',
      P.kind === 'bino' ? h('div', { class: 'row2' },
        h('label', { class: 'field' }, h('span', { class: 't-small' }, tr('Balandlik, m')), select({ id: 'ulH', onchange: v => set({ height: v || null }) }, opt(P.height, '—'))),
        h('label', { class: 'field' }, h('span', { class: 't-small' }, tr('Qavatlar')), select({ id: 'ulFl', onchange: v => set({ floors: v || null }) }, opt(P.floors, '—')))) : '',
      P.kind === 'chegara' && pl.slivers ? h('div', { class: 'row', style: 'gap:8px;align-items:center;justify-content:space-between' },
        h('span', { class: 't-small' }, tf('Nomsiz mayda boʻlaklar (< 10 ga): ${n} ta — tashlash', { n: pl.slivers })), sw({ id: 'ulDrop', label: tr('Mayda boʻlaklarni tashlash'), on: P.drop, onchange: v => set({ drop: v }) })) : '',
      ...pl.warn.map(w => h('div', { class: 'note warn' }, tr(w))),
      tierNote ? h('div', { class: 'note' }, tierNote) : '',
      h('div', { class: 'row', style: 'gap:8px;justify-content:flex-end' },
        h('button', { class: 'btn btn-ghost btn-sm', onclick: () => { this.pending = null; this.host.refresh(); } }, tr('Bekor qilish')),
        h('button', { class: 'btn btn-primary btn-sm', id: 'ulOk', disabled: !!this.busy || !pl.features.length, onclick: () => void this.commit() }, this.busy || tf('Qoʻshish (${n})', { n: fmt(pl.features.length) }))));
  }

  /** Loyiha fayliga eksport uchun: hujjatdagi qatlamlar obyektlari */
  async exportData(doc: Project): Promise<Record<string, unknown[]>> {
    const out: Record<string, unknown[]> = {};
    for (const m of doc.userLayers ?? []) { const d = this.data.get(m.id) ?? await getLayerData<ULFeature>(doc.id, m.id); if (d) out[m.id] = d; }
    return out;
  }
  /** loyiha oʻchirilganda (ishlatilmayapti — obyektlar undo uchun qoladi) */
  async purge(doc: Project, id: string): Promise<void> { await deleteLayerData(doc.id, id); this.data.delete(id); }
}
