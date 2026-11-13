/**
 * Varaqlar oynasi (oldin «Grafika») — maketlar «MR-Varaqlar» (V1 sozlama paneli), «MR-Varaqlar-V2» (varaqlar toʻplami),
 * inventar 4.3. Qobiq — Master reja bilan bir xil: suzuvchi shisha header, chapda varaqlar roʻyxati va 340 px sozlama paneli,
 * oʻrtada haqiqiy oʻlchamdagi oq varaq, pastda koʻrinish asboblari. Varaq va fayl doim oq.
 * Varaqlar loyiha faylida saqlanadi (doc.sheets), uslublar — doc.sheetStyles.
 */
import type { Project, SheetDoc } from '../core/doc';
import { cutSheet } from '../core/streetcutsvg';
import { silSheet, SIL_STYLES } from '../core/siluetsvg';
import { stageSheet } from '../core/stagesheet';
import { parseTrees } from '../core/trees';
import { bLevels, hasAntresol, ANTRESOL_SHARE } from '../core/levels';
import { area as areaOf, frame as frameOf } from '../core/geo';
import { uid } from '../core/doc';
import { planApartments } from '../core/apartments';
import { floorGroups, groupName } from '../core/floorplan';
import { aptSheet, sheetGroup } from '../core/aptsheet';
import { aptPicks, houseTypes } from '../core/albumset';
import { SERVICES } from '../core/services';
import { housePlan, housePlanSvg } from '../core/lowplan';
import { sheetLayout, stageOf, type SheetInner } from '../core/sheet';
import { sheetSvg, sheetChecks, recommendScale, layerOf, SHEET_DEFAULT, SHEET_KINDS, SHEET_LAYERS, SCALES, PAPERS, FONTS, type SheetCtx, type SheetSvc, type SheetOpts, type SheetResult, type Paper, type SheetLayerId } from '../core/sheet';
import { LABEL_MODES, type LabelMode } from '../core/labels';
import { h, download, toast, svgIcon, icl, IC, fmt } from './dom';
import { check, dropdown, stepper, sw } from './controls';
import { tr, tf, trSvg } from '../i18n';
import { logoSvg } from './logo';
import { gstylePicker } from './gstylepick';
import { gstyleById, PARCEL_GREY, PARCEL_GREYS, parcelGrey } from '../core/gstyle';
import { openColor } from './colorpicker';
import { svgPdf } from './pdf';
import { AXO_LAYERS, AXO_LAYER_IDS, AXO_MATS, normAxoEdit, axoEditKey, axoEditCount, copyAxoEdit, hitPick, type AxoEdit, type AxoLayerId, type AxoMatId, type AxoPick } from '../core/axoedit';
import { useDef } from '../core/uses';

export interface SheetsHost {
  doc: Project;
  ctx: SheetCtx | null;
  /** 02.11: xizmat radiuslari tahlili (9-qadam) — «Xizmat radiusi» varaqlari uchun */
  svc?: () => SheetSvc[];
  /** 02.11: oxirgi insolyatsiya xaritasi (6-qadam) */
  insol?: () => SheetCtx['insol'];
  /** 04.11: shamol guli va oxirgi oqim xaritasi (6-qadam) */
  wind?: () => SheetCtx['wind'];
  /** 06.11: yer sathi xaritalari (yuza qizishi, HAND, TWI) — Qatlamlar paneli bilan bir xil hisob */
  gmap?: (k: 'issiq' | 'hand' | 'twi') => SheetCtx['gmap'];
  /** 12.11: daraxtlar inventarizatsiyasini hujjatga yozish (yangi hujjatni qaytaradi) */
  treeInv?: (trees: NonNullable<Project['treeInv']>) => Project;
  /** varaqlar va uslublarni hujjatga yozish */
  save: (sheets: SheetDoc[], styles: NonNullable<Project['sheetStyles']>) => void;
  /** reja va hajmlar DXF (mavjud eksport) */
  dxf: () => void;
  /** joriy varaqni Chizmadonga yuborish (xarita oynasi sifatida, masshtab bilan) */
  toChizmadon?: (svg: string, name: string, scale: number, north?: number) => void;
  /** qaysi varaqdan boshlash (V3 ramkasidan) */
  start?: number;
  /** aksonometriya rasmi (sahnadan, tanlangan uslub va koʻrinish bilan): data URL */
  axo?: (look: NonNullable<SheetOpts['axo']>['look'], view: string | undefined, detail: boolean, ratio: number, labels?: boolean, gstyle?: string, edit?: AxoEdit) => string;
  /** c77: oxirgi akso rasmidagi binolar (rasmda bosib tanlash) va sahnada maʼlumoti bor qatlamlar */
  axoPicks?: () => AxoPick[];
  axoLayers?: () => AxoLayerId[];
  /** 06.11: akso uslublari 4–6 legendasi (faqat sahnada bor toifalar) */
  axoLegend?: (look: NonNullable<SheetOpts['axo']>['look']) => { color: number; label: string; hatch?: boolean }[];
  /** saqlangan koʻrinishlar (Kamera) */
  views?: { id: string; name: string }[];
}

const safe = (s: string) => s.replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 60) || 'loyiha';
const KEY = 'mr-sheet';
function lastOpts(): SheetOpts {
  try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o && typeof o === 'object') return norm(o); } catch { /* */ }
  return norm({});
}
/** saqlangan obyektni toʻliq SheetOpts ga keltirish (yangi maydonlar sukut bilan) */
export function norm(o: Record<string, unknown>): SheetOpts {
  const d = structuredClone(SHEET_DEFAULT), x = o as Partial<SheetOpts>;
  const kinds = SHEET_KINDS.map(k => k.id) as string[], papers = ['fit', ...Object.keys(PAPERS)];
  return {
    ...d, ...x,
    kind: kinds.includes(x.kind as string) ? x.kind! : d.kind,
    paper: papers.includes(x.paper as string) ? x.paper! : d.paper,
    scale: typeof x.scale === 'number' && x.scale >= 0 && x.scale <= 100000 ? x.scale : 0,
    landscape: x.landscape !== false,
    title: typeof x.title === 'string' ? x.title : '',
    show: { ...d.show, ...(x.show ?? {}) },
    layers: { ...(x.layers ?? {}) },
    stamp: { ...(x.stamp ?? {}) },
  };
}
/**
 * Sukut toʻplami (02.11, egasi: «albom uchun varaqlarga sukut boʻyicha … varaqlar oʻtmadi»): barcha reja namunalari (bosh reja, funksional,
 * zonalashtirish, figura-fon, landshaft, qavatlar soni, vaziyat sxemasi); har bino turidan 1-qavat va tipik qavat; har past qavatli uy
 * turidan har qavat rejasi (core/albumset).
 */
const SET_V = 10;   // 04.11: shamol, relyef va qurilish navbati; 06.11: yuza qizishi, HAND, TWI varaqlari
function defaultSheets(doc: Project): SheetDoc[] {
  const base = lastOpts(), mk = (o: Partial<SheetOpts>): SheetDoc => ({ id: uid('sh_'), opts: { ...base, mode: 'reja', title: '', stamp: {}, ...o } as unknown as Record<string, unknown> });
  const out: SheetDoc[] = [
    mk({ kind: 'bosh', scale: 0 }),
    mk({ kind: 'bosh', scale: 0, layers: { bld: { fill: 'use' } } as SheetOpts['layers'], stamp: { sheet: 'Funksional reja' } }),
    mk({ kind: 'zona', scale: 0 }), mk({ kind: 'parsel', scale: 0 }),   // 06.11: parsellar rejasi (sukut toʻplamiga; SET_V oshirilmadi — mavjud albomlarga oʻzi qoʻshilmaydi)
    mk({ kind: 'figura', scale: 0 }), mk({ kind: 'landshaft', scale: 0 }), mk({ kind: 'qavat', scale: 0 }),
    mk({ kind: 'vaziyat', scale: 10000 }),
    mk({ kind: 'ijtimoiy', scale: 0 }),   // 12.11: ijtimoiy infratuzilma (eski navbat, 2-band)
    mk({ kind: 'cheklov', scale: 0 }),   // 02.11: tahlil — cheklovlar rejasi va yer balansi
    mk({ kind: 'yashil', scale: 0 }), mk({ kind: 'insol', scale: 0 }),   // 02.11: tahlil — yashil balans, insolyatsiya
    mk({ kind: 'transport', scale: 0 }),
    mk({ kind: 'parkovka', scale: 0 }),   // 12.11: avtoturargohlar sxemasi (eski navbat, 3-band)
    mk({ kind: 'parkstrat', scale: 0 }),   // 12.11: parkovka strategiyasi (3-band davomi)
    mk({ kind: 'yongin', scale: 0 }),   // 12.11: yongʻin marshrutlari (5-band)   // 02.11: tahlil 4 — transport sxemasi
    mk({ kind: 'daraxt', scale: 0 }),   // 12.11: daraxtlar xaritasi (eski navbat, 7-band)
    mk({ kind: 'relyef', scale: 0 }),   // 04.11: tahlil — relyef
    mk({ kind: 'navbat', scale: 0 }),   // 04.11: tahlil — qurilish navbati
    mk({ kind: 'shamol', scale: 0 }),   // 04.11: tahlil — shamol guli va oqim
    mk({ kind: 'issiq', scale: 0 }), mk({ kind: 'hand', scale: 0 }), mk({ kind: 'twi', scale: 0 }),   // 06.11: tahlil — yer sathi xaritalari
  ];
  for (const sv of ['mtm', 'maktab', 'poliklinika', 'bekat']) out.push(mk({ kind: 'xizmat', svc: sv, scale: 0 }));   // 02.11: tahlil — xizmat radiuslari (editor SVC_ON)
  for (const p of aptPicks(planApartments(doc))) out.push(mk({ mode: 'qavat', plan: { look: 'rang', floor: p.bi + 1, grp: p.gi } }));
  houseTypes(doc).forEach((t, i) => { for (let f = 1; f <= t.floors; f++) out.push(mk({ mode: 'uy', plan: { floor: i + 1, grp: f } })); });
  for (const c of doc.cuts ?? []) out.push(mk({ mode: 'kesim', cut: c.id }));
  for (const c of doc.sections ?? []) out.push(mk({ mode: 'siluet', sec: c.id }));
  if (multiStage(doc)) out.push(mk({ mode: 'fazalar' }));
  return out;
}
/** 12.11: har kesim chizigʻiga «Koʻcha profili» varagʻi — yangi kesim qoʻyilsa varaqlarga oʻzi qoʻshiladi (oʻchirilgan kesimniki qoladi: «kesim yoʻq» yozuvi bilan) */
function syncCutSheets(doc: Project, sheets: SheetDoc[]): SheetDoc[] {
  const have = new Set(sheets.map(s => (s.opts as Partial<SheetOpts>).mode === 'kesim' ? (s.opts as Partial<SheetOpts>).cut : null));
  const base = lastOpts(), add = (doc.cuts ?? []).filter(c => !have.has(c.id)).map(c => ({ id: uid('sh_'), opts: { ...base, mode: 'kesim', cut: c.id, title: '', stamp: {}, scale: 0 } as unknown as Record<string, unknown> }));
  return add.length ? [...sheets, ...add] : sheets;
}
/** 13.11: har «Kesim va fasad» chizigʻiga varaq (yangisi qoʻyilsa oʻzi qoʻshiladi) */
function syncSecSheets(doc: Project, sheets: SheetDoc[]): SheetDoc[] {
  const have = new Set(sheets.map(s => (s.opts as Partial<SheetOpts>).mode === 'siluet' ? (s.opts as Partial<SheetOpts>).sec : null));
  const base = lastOpts(), add = (doc.sections ?? []).filter(c => !have.has(c.id)).map(c => ({ id: uid('sh_'), opts: { ...base, mode: 'siluet', sec: c.id, landscape: true, title: '', stamp: {}, scale: 0 } as unknown as Record<string, unknown> }));
  return add.length ? [...sheets, ...add] : sheets;
}
/** 12.11: binolar bir nechta navbatga boʻlingan — albomga «Qurilish navbatlari ketma-ketligi» varagʻi (bitta, bor boʻlsa qoʻshilmaydi) */
const multiStage = (doc: Project) => new Set(doc.buildings.filter(b => b.floors > 0).map(stageOf)).size > 1;
function syncStageSheet(doc: Project, sheets: SheetDoc[]): SheetDoc[] {
  if (!multiStage(doc) || sheets.some(s => (s.opts as Partial<SheetOpts>).mode === 'fazalar')) return sheets;
  return [...sheets, { id: uid('sh_'), opts: { ...lastOpts(), mode: 'fazalar', title: '', stamp: {}, scale: 0 } as unknown as Record<string, unknown> }];
}
/** Avvalgi loyihalar (eski sukut toʻplami bilan): yangi namunalar va rejalar bir marta qoʻshiladi — mavjud varaqlar tegilmaydi */
function upgradeSheets(doc: Project, sheets: SheetDoc[]): SheetDoc[] {
  const k = `mr-sheets-v${SET_V}:${doc.id}`;
  try { if (localStorage.getItem(k)) return sheets; localStorage.setItem(k, '1'); } catch { return sheets; }
  const sig = (o: Record<string, unknown>) => { const x = o as Partial<SheetOpts>; return `${x.mode ?? 'reja'}|${x.mode === 'siluet' ? x.sec : x.mode === 'kesim' ? x.cut : x.mode === 'qavat' || x.mode === 'uy' ? `${x.plan?.floor ?? 1}:${x.plan?.grp ?? ''}` : `${x.kind}|${x.stamp?.sheet ?? ''}|${x.svc ?? ''}`}`; };
  const have = new Set(sheets.map(s => sig(s.opts)));
  return [...sheets, ...defaultSheets(doc).filter(s => !have.has(sig(s.opts)))];
}

/** Illustrator uchun varaq (oxirgi sozlamalar bilan): har qatlam — alohida Illustrator qatlami, mm da */
export function downloadIllustrator(doc: Project, ctx: SheetCtx | null, o: SheetOpts = lastOpts()): void {
  download(`${safe(doc.name)}_${o.kind}_illustrator.svg`, sheetSvg(doc, ctx, o, new Date(), true, tr).svg, 'image/svg+xml');
}

export function openGraphics(host: SheetsHost): void {
  let doc = host.doc;
  let sheets: SheetDoc[] = syncStageSheet(doc, syncSecSheets(doc, syncCutSheets(doc, doc.sheets?.length ? upgradeSheets(doc, doc.sheets.map(s => ({ id: s.id, opts: s.opts }))) : defaultSheets(doc))));
  try { localStorage.setItem(`mr-sheets-v${SET_V}:${doc.id}`, '1'); } catch { /* */ }
  let styles = [...(doc.sheetStyles ?? [])];
  let cur = Math.max(0, Math.min(sheets.length - 1, host.start ?? 0));
  let open: string | null = null, zoom = 0, loupe = false, hand = false;
  const O = (): SheetOpts => norm(sheets[cur].opts);
  const ha = doc.site ? (() => { const r = doc.site!.rings[0]; let a = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2 * 111320 * 111132 * Math.cos(r[0][1] * Math.PI / 180) / 1e4; })() : 0;
  const plans = planApartments(doc), houses = houseTypes(doc);
  const axoCache = new Map<string, { url: string; picks: AxoPick[] }>();
  /** c77: akso rasmi kaliti (namuna, kamera, soya, yozuvlar, nisbat, shablon va muharrir sozlamasi) */
  const axoKey = (o: SheetOpts) => { const L = sheetLayout(o); return `${o.axo?.look ?? 'oq'}|${o.axo?.view ?? ''}|${o.axo?.shadow !== false}|${o.axo?.labels === true}|${(L.vw / L.vh).toFixed(2)}|${o.gstyle ?? ''}|${axoEditKey(normAxoEdit(o.axo?.edit))}`; };
  /** c77: muharrirda tanlangan bino (faqat panel holati) va sahnadagi qatlamlar */
  let axSel: string | null = null;
  const axLayers = new Set<AxoLayerId>(host.axoLayers?.() ?? AXO_LAYER_IDS);
  const innerOf = (o: SheetOpts): SheetInner | undefined => {
    if (o.mode === 'qavat') {
      if (!plans.length) return { label: 'M —', body: (vx, vy, vw, vh) => `<text x="${vx + vw / 2}" y="${vy + vh / 2}" font-size="5" text-anchor="middle" fill="#6b6965">${tr('Turar joy seksiyalari yoʻq')}</text>` };
      // 20-band: bitta qavat rejasi + navigatsiya sxemalari + eksplikatsiya (ish chizmalaridagidek)
      const bi = Math.max(0, Math.min(plans.length - 1, (o.plan?.floor ?? 1) - 1));
      return aptSheet(doc, plans, bi, o.plan?.grp, o.plan?.look ?? 'rang', tr, pl => { const bb = doc.buildings.find(b => b.id === pl.bid); return { tr, fh: doc.settings.floorHeight, fh1: bb ? bLevels(doc.settings, bb).fh1 : undefined, ant: bb && hasAntresol(doc.settings, bb) ? areaOf(bb.footprint.map(frameOf(doc.origin).toLocal)) * ANTRESOL_SHARE : undefined, bal: bb?.bal ?? null }; });
    }
    if (o.mode === 'uy') {
      // 02.11: past qavatli uy rejasi (core/lowplan) — tur va qavat; katakka sigʻdiriladi
      const T = houses[Math.max(0, Math.min(houses.length - 1, (o.plan?.floor ?? 1) - 1))];
      if (!T) return { label: 'M —', body: (vx, vy, vw, vh) => `<text x="${vx + vw / 2}" y="${vy + vh / 2}" font-size="5" text-anchor="middle" fill="#6b6965">${tr('Past qavatli uylar yoʻq')}</text>` };
      const fl = Math.max(1, Math.min(T.floors, o.plan?.grp ?? 1)), name = `${tr(T.name)} · ${tf('${n}-qavat', { n: fl })}`;
      const P = housePlan(T.ring, T.floors, fl, { style: T.hovli ? 'milliy' : 'zamonaviy', plot: T.plot, north: [0, 1], edit: doc.buildings.find(b => b.id === T.bid)?.house ?? {} });
      if (!P) return { label: 'M —', name, body: () => '' };
      const r = housePlanSvg(P, T.ring, T.plot, { scale: 100, title: name, north: [0, 1], label: tr, joint: T.joint }), inner = r.svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
      return { label: `${T.n} ${tr('uy')}`, name, body: (vx, vy, vw, vh) => `<svg x="${vx}" y="${vy}" width="${vw}" height="${vh}" viewBox="0 0 ${r.widthMm.toFixed(1)} ${r.heightMm.toFixed(1)}" preserveAspectRatio="xMidYMid meet">${inner}</svg>` };
    }
    if (o.mode === 'kesim') { const L = sheetLayout(o); return cutSheet(doc, o.cut, tr, L.vw, L.vh); }
    if (o.mode === 'siluet') { const L = sheetLayout(o); return silSheet(doc, host.ctx, o.sec, tr, L.vw, L.vh, o.silStyle ?? 'kesim'); }
    if (o.mode === 'fazalar') return stageSheet(doc, tr);
    if (o.mode === 'akso') {
      const L = sheetLayout(o), key = axoKey(o), ed = normAxoEdit(o.axo?.edit);
      let shot = axoCache.get(key);
      if (!shot && host.axo) { const url = host.axo(o.axo?.look ?? 'oq', o.axo?.view, o.axo?.shadow !== false, L.vw / L.vh, o.axo?.labels === true, o.gstyle, ed); shot = { url, picks: host.axoPicks?.() ?? [] }; axoCache.set(key, shot); }
      const url = shot?.url;
      // c77: loyiha binolariga aniq rang berilgan boʻlsa — uslub 4–6 legendasi (sinf ranglari) notoʻgʻri boʻlib qoladi, koʻrsatilmaydi
      const lg = ed?.col?.loyiha ? [] : host.axoLegend?.(o.axo?.look ?? 'oq') ?? [];
      return { label: 'M —', body: (vx, vy, vw, vh) => (url ? `<image data-axo-img="1" href="${url}" x="${vx}" y="${vy}" width="${vw}" height="${vh}" preserveAspectRatio="xMidYMid meet"/>` : '') + axoLegendSvg(o.axo?.look, lg, vx, vy, vh) };
    }
    return undefined;
  };
  let lastInner: SheetInner | undefined; const innerLabel = new WeakMap<SheetResult, string>();
  // 02.11 (egasi: «Varaqlarda qotish juda kuchli»): varaq natijasi kesh — sozlamasi, oʻrni va soni oʻzgarmaguncha qayta chizilmaydi
  // (avval roʻyxat har bosishda barcha varaqlarni toʻliq qayta chizardi — masshtab va ogohlantirish belgisi uchun)
  let svcData: SheetSvc[] | undefined;
  const svcs = (): SheetSvc[] => (svcData ??= host.svc?.() ?? []);
  const ctxOf = (o: SheetOpts): SheetCtx | null => {
    const GM = o.kind === 'issiq' || o.kind === 'hand' || o.kind === 'twi';
    if (o.kind !== 'xizmat' && o.kind !== 'ijtimoiy' && o.kind !== 'insol' && o.kind !== 'shamol' && !GM) return host.ctx;
    const base = host.ctx ?? { buildings: [], roads: [], rails: [], water: [], waterways: [], green: [], trees: [] };
    if (GM) return { ...base, gmap: host.gmap?.(o.kind as 'issiq' | 'hand' | 'twi') ?? null };
    return o.kind === 'insol' ? { ...base, insol: host.insol?.() ?? null } : o.kind === 'shamol' ? { ...base, wind: host.wind?.() ?? null } : { ...base, svc: svcs() };
  };
  const memo = new Map<string, { r: SheetResult; inner: SheetInner | undefined }>();
  const mkey = (o: SheetOpts, i: number) => `${i}|${sheets.length}|${JSON.stringify(o)}`;
  const run = (o: SheetOpts, i = cur): SheetResult => {
    const k = mkey(o, i), c = memo.get(k); if (c) { lastInner = c.inner; return c.r; }
    const st = o.stamp ?? {}; const r = sheetSvg(doc, ctxOf(o), { ...o, stamp: { ...st, num: st.num || `MR-${String(i + 1).padStart(2, '0')}`, index: i + 1, total: sheets.length } }, new Date(), false, tr, (lastInner = innerOf(o))); r.svg = trSvg(r.svg); innerLabel.set(r, lastInner?.label ?? '');
    if (memo.size > 200) memo.clear(); memo.set(k, { r, inner: lastInner }); return r; };
  const peek = (i: number): SheetResult | null => memo.get(mkey(norm(sheets[i].opts), i))?.r ?? null;
  // roʻyxatdagi boshqa varaqlar — boʻsh vaqtda bittadan hisoblanadi, tayyor boʻlganda roʻyxat yangilanadi
  let idleQ: number[] = [], idleT: ReturnType<typeof setTimeout> | null = null; const failed = new Set<string>();
  const idle = () => { idleT = null; if (!list.isConnected) { idleQ = []; return; } const i = idleQ.shift(); if (i == null || i >= sheets.length) { if (!idleQ.length) renderList(); else idleT = setTimeout(idle, 0); return; }
    const keep = lastInner, o = norm(sheets[i].opts); try { run(o, i); } catch { failed.add(mkey(o, i)); } lastInner = keep; idleT = setTimeout(idle, idleQ.length ? 16 : 0); };
  const later = (i: number) => { if (failed.has(mkey(norm(sheets[i].opts), i))) return; if (!idleQ.includes(i)) idleQ.push(i); if (!idleT) idleT = setTimeout(idle, 120); };
  let last = run(O());

  /** 11.11: «Bir xil kulrang» tusi — tayyor namunalar (och → toʻq) va istalgan HEX (ilovaning rang tanlash oynasi; native input yoʻq) */
  /**
   * Rang namunalari qatori (11.11 «Kulrang tusi» komponenti, c77 da umumlashtirildi): tayyor namunalar va istalgan HEX —
   * ilovaning rang tanlash oynasi (native input yoʻq). cur — joriy rang (null — andoza, hech biri tanlanmagan).
   */
  const swRow = (a: { id: string; attr: string; hexId: string; title: string; cp?: string; sw: string[]; cur: string | null; put: (c: string) => void; live?: (c: string) => void }): HTMLElement => {
    const prev = h('i', { style: `background:${a.cur ?? 'transparent'}` });
    const anyB: HTMLElement = h('button', { class: 'pg-any', id: a.hexId, type: 'button', 'aria-pressed': !!a.cur && !a.sw.includes(a.cur), title: tr('Istalgan rang (HEX)'),
      onclick: () => openColor(anyB, a.cur ?? a.sw[0], { title: a.cp ?? a.title, swatches: a.sw, onChange: v => { prev.style.background = v; a.live?.(v); }, onDone: v => a.put(v), onCancel: v => { prev.style.background = a.cur ?? 'transparent'; a.live?.(v); } }) }, prev, 'HEX');
    return h('div', { class: 'pg', id: a.id, role: 'radiogroup', 'aria-label': a.title },
      ...a.sw.map(c => h('button', { class: 'pg-sw', type: 'button', role: 'radio', [`data-${a.attr}`]: c, 'aria-checked': c === a.cur, 'aria-pressed': c === a.cur, 'aria-label': c, title: c, style: `background:${c}`, onclick: () => a.put(c) })),
      anyB);
  };
  const greyPick = (o: SheetOpts): HTMLElement => {
    const cur = parcelGrey(o.parcelGrey), put = (c: string) => set({ parcelGrey: c === PARCEL_GREY ? undefined : c });
    const val = h('code', { id: 'shPGreyV' }, cur);
    return h('div', { class: 'field pg-field' }, h('label', {}, tr('Kulrang tusi')),
      swRow({ id: 'shPGrey', attr: 'grey', hexId: 'shPGreyHex', title: tr('Kulrang tusi'), cp: tr('Parsellar rangi'), sw: PARCEL_GREYS, cur, put, live: v => { val.textContent = v; } }),
      h('span', { class: 't-small' }, tr('och → toʻq'), ' · ', val));
  };
  const set = (patch: Partial<SheetOpts>) => { const o = { ...O(), ...patch }; sheets[cur] = { ...sheets[cur], opts: o as unknown as Record<string, unknown> }; persist(); render(); };
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(O())); } catch { /* */ } host.save(sheets, styles); };

  /* ---------- karkas ---------- */
  const wrap = h('div', { class: 'gx sh', role: 'dialog', 'aria-modal': 'true', 'aria-label': tr('Varaqlar') });
  const head = h('header', { class: 'sh-top glassbar' });
  const list = h('aside', { class: 'sh-list' });
  const side = h('aside', { class: 'gx-side sh-side' });
  const info = h('div', { class: 'gx-info sh-info' });
  const view = h('div', { class: 'gx-view sh-view', id: 'gxView' });
  const tools = h('div', { class: 'sh-tools glassbar', role: 'toolbar', 'aria-label': tr('Koʻrinish') });
  const lens = h('div', { class: 'sh-loupe', hidden: true });
  wrap.append(head, h('div', { class: 'sh-body' }, list, side, h('main', { class: 'gx-main sh-main' }, info, view, lens, tools)));
  const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !(e.target as HTMLElement)?.closest?.('input,select')) { const m = wrap.querySelector('.sh-menu'); if (m) m.remove(); else close(); } };

  /* ---------- koʻrinish (zoom) ---------- */
  const PX = 96 / 25.4;
  const fitZ = () => { const r = view.getBoundingClientRect(); return Math.max(0.05, Math.min((r.width - 48) / (last.widthMm * PX), (r.height - 48) / (last.heightMm * PX))); };
  const applyZoom = () => {
    const z = zoom || fitZ(), s = view.querySelector('svg') as SVGSVGElement | null; if (!s) return;
    s.style.width = `${last.widthMm * PX * z}px`; s.style.height = `${last.heightMm * PX * z}px`;
    zT.textContent = `${Math.round(z * 100)} %`;
  };
  const zT = h('span', { class: 't-small num', style: 'min-width:46px;text-align:center' });
  const tb = (label: string, icon: string, fn: () => void, attrs: Record<string, unknown> = {}) => h('button', { class: 'rb', 'aria-label': label, title: label, onclick: fn, ...attrs }, svgIcon(icon));
  tools.append(
    tb(tr('Kichraytirish'), '<path d="M5 12h14"/>', () => { zoom = (zoom || fitZ()) / 1.25; applyZoom(); }),
    zT,
    tb(tr('Kattalashtirish'), IC.plus, () => { zoom = (zoom || fitZ()) * 1.25; applyZoom(); }),
    h('span', { class: 'sepv' }),
    h('button', { class: 'btn btn-sm btn-ghost', id: 'z100', onclick: () => { zoom = 1; applyZoom(); } }, '100 %'),
    h('button', { class: 'btn btn-sm btn-ghost', id: 'zFit', onclick: () => { zoom = 0; applyZoom(); } }, tr('Moslash')),
    h('span', { class: 'sepv' }),
    tb(tr('Lupa (100 %)'), '<path d="M10.5 4a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13M15.5 15.5L20 20"/>', () => { loupe = !loupe; lens.hidden = !loupe; syncTools(); }, { id: 'zLoupe' }),
    tb(tr('Qoʻl — surish'), '<path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V12M11 11V5a1.5 1.5 0 0 1 3 0v6M14 11V6.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L3 14.5a1.5 1.5 0 0 1 2.4-1.8L8 15"/>', () => { hand = !hand; syncTools(); }, { id: 'zHand' }));
  const syncTools = () => { tools.querySelector('#zLoupe')?.setAttribute('aria-pressed', String(loupe)); tools.querySelector('#zHand')?.setAttribute('aria-pressed', String(hand)); view.classList.toggle('hand', hand); };
  // qoʻl bilan surish
  let drag: { x: number; y: number; l: number; t: number } | null = null;
  view.addEventListener('pointerdown', e => { if (!hand) return; drag = { x: e.clientX, y: e.clientY, l: view.scrollLeft, t: view.scrollTop }; view.setPointerCapture(e.pointerId); });
  view.addEventListener('pointermove', e => {
    if (drag) { view.scrollLeft = drag.l - (e.clientX - drag.x); view.scrollTop = drag.t - (e.clientY - drag.y); }
    if (loupe) {
      const s = view.querySelector('svg'); if (!s) return; const r = s.getBoundingClientRect(), mr = wrap.querySelector('.sh-main')!.getBoundingClientRect();
      const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height; if (fx < 0 || fx > 1 || fy < 0 || fy > 1) { lens.style.opacity = '0'; return; }
      lens.style.opacity = '1'; lens.style.left = `${e.clientX - mr.left - 90}px`; lens.style.top = `${e.clientY - mr.top - 90}px`;
      const W = last.widthMm * PX, H = last.heightMm * PX, c = lens.firstElementChild as HTMLElement | null;
      if (c) { c.style.width = `${W}px`; c.style.height = `${H}px`; c.style.transform = `translate(${90 - fx * W}px, ${90 - fy * H}px)`; }
    }
  });
  view.addEventListener('pointerup', () => { drag = null; });

  /* ---------- header ---------- */
  const checksBtn = h('button', { class: 'chip sh-checks', id: 'shChecks', onclick: (e: Event) => { e.stopPropagation(); showChecks(); } });
  const dl = h('button', { class: 'btn', id: 'gxDl', onclick: (e: Event) => { e.stopPropagation(); menu(); } }, ...icl('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', tr('Yuklab olish')));
  const toCh = h('button', { class: 'btn btn-primary', id: 'shToCh', disabled: !host.toChizmadon, title: host.toChizmadon ? '' : tr('Chizmadon — keyingi bosqichda'), onclick: () => { const o = O(), r = run({ ...o, show: { ...o.show, title: false, legend: false, plotTable: false, stamp: false, situation: false, frame: false } }); persist(); const nm = sheetName(cur); close(); host.toChizmadon?.(r.svg, nm, o.mode === 'akso' ? 0 : r.scale, o.mode === 'qavat' ? (lastInner as { north?: number } | undefined)?.north : -(o.rot ?? 0)); } }, tr('Chizmadonga'));
  head.append(
    h('button', { class: 'btn btn-ghost icon-btn', 'aria-label': tr('Master rejaga qaytish'), title: tr('Master rejaga qaytish'), onclick: close }, svgIcon('<path d="M15 6l-6 6 6 6"/>')),
    h('span', { class: 'brand' }, logoSvg(18), h('b', {}, 'Archemistry Lab')), h('span', { class: 'svcbadge' }, h('i'), tr('Master reja')),
    h('span', { class: 'sh-name' }, `${doc.name} · ${tr('Varaqlar')}`), h('span', { class: 'spacer' }),
    checksBtn, h('button', { class: 'btn btn-ghost', id: 'gxClose', onclick: close }, tr('Yopish (Esc)')));

  const sheetName = (i: number) => { const o = norm(sheets[i].opts); if (o.stamp?.sheet) return tr(o.stamp.sheet); if (o.mode === 'fazalar') return tr('Qurilish navbatlari ketma-ketligi'); if (o.mode === 'kesim') { const c = doc.cuts?.find(x => x.id === o.cut) ?? doc.cuts?.[0]; return `${tr('Koʻcha profili')} ${c ? `${c.label}–${c.label}` : '—'}`; } if (o.mode === 'siluet') { const c = doc.sections?.find(x => x.id === o.sec) ?? doc.sections?.[0]; return `${tr('Kesim va fasad')} ${c ? `${c.label}–${c.label}` : '—'}`; } if ((o.mode ?? 'reja') === 'reja' && o.kind === 'xizmat') return `${tr('Xizmat radiusi')} · ${tr(SERVICES.find(x => x.id === (o.svc ?? 'mtm'))?.name ?? '')}`; if (o.mode === 'uy' && houses.length) { const T = houses[Math.max(0, Math.min(houses.length - 1, (o.plan?.floor ?? 1) - 1))]; return `${tr(T.name)} · ${tf('${n}-qavat', { n: Math.max(1, Math.min(T.floors, o.plan?.grp ?? 1)) })}`; } if (o.mode === 'qavat' && plans.length) { const bi = Math.max(0, Math.min(plans.length - 1, (o.plan?.floor ?? 1) - 1)), g = sheetGroup(plans[bi], o.plan?.grp); return `${tr(`${bi + 1}-bino`)} · ${tr(groupName(g))}`; } return tr(SHEET_KINDS.find(k => k.id === o.kind)!.name); };

  /* ---------- menyular ---------- */
  function popMenu(anchor: HTMLElement, items: (HTMLElement | string)[]): void {
    wrap.querySelector('.sh-menu')?.remove();
    const m = h('div', { class: 'menu sh-menu', role: 'menu' }, ...items);
    m.addEventListener('click', e => e.stopPropagation());
    wrap.append(m);
    const r = anchor.getBoundingClientRect(), mh = m.offsetHeight;
    m.style.left = `${Math.min(r.left, innerWidth - m.offsetWidth - 8)}px`; m.style.top = `${r.top - mh - 6 > 8 ? r.top - mh - 6 : r.bottom + 6}px`;
    setTimeout(() => document.addEventListener('click', () => m.remove(), { once: true }), 0);
  }
  const mi = (id: string, t: string, fn: () => void, tag = '') => h('button', { id, role: 'menuitem', onclick: () => { wrap.querySelector('.sh-menu')?.remove(); fn(); } }, h('span', {}, t), tag ? h('span', { class: 'chip ok', style: 'height:18px;font-size:10px' }, tag) : '');
  const png = (dpi: number) => {
    const img = new Image(), url = URL.createObjectURL(new Blob([last.svg], { type: 'image/svg+xml' })), o = O();
    img.onload = () => {
      const W = Math.round(last.widthMm / 25.4 * dpi), H = Math.round(last.heightMm / 25.4 * dpi);
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d')!; g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.drawImage(img, 0, 0, W, H); URL.revokeObjectURL(url);
      c.toBlob(b => b ? download(`${safe(doc.name)}_${o.kind}_${dpi}dpi.png`, b) : toast(tr('PNG yaratilmadi')), 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast(tr('PNG yaratilmadi')); };
    img.src = url;
  };
  const pdfOne = () => { toast(tr('PDF tayyorlanmoqda…')); svgPdf([last], `${safe(doc.name)}_${O().kind}.pdf`).catch(e => toast(`PDF: ${(e as Error).message}`)); };
  const pdfAll = () => { toast(tr('Albom tayyorlanmoqda…')); svgPdf(sheets.map((s, i) => run(norm(s.opts), i)), `${safe(doc.name)}_albom.pdf`).catch(e => toast(`PDF: ${(e as Error).message}`)); };
  function menu(): void {
    popMenu(dl, [h('div', { class: 'mh' }, tr('Yuklab olish · joriy varaq')),
      mi('gxPdf', tr('PDF — vektor'), pdfOne),
      mi('gxSvg', tr('SVG — qatlamlar bilan'), () => download(`${safe(doc.name)}_${O().kind}.svg`, last.svg, 'image/svg+xml')),
      mi('gxAi', tr('Adobe Illustrator uchun (SVG)'), () => downloadIllustrator(doc, host.ctx, O())),
      mi('gxPng', 'PNG 150 dpi', () => png(150)), mi('gxPng3', 'PNG 300 dpi', () => png(300)),
      mi('gxDxf', tr('DXF — chiziqlar'), () => host.dxf()),
      h('hr'), h('div', { class: 'mh' }, tr('Hamma varaqlar')),
      mi('gxAlbum', tf('Albom — PDF (${n} varaq)', { n: sheets.length }), pdfAll)]);
  }
  function showChecks(): void {
    const ch = sheetChecks(last, O(), tr);
    popMenu(checksBtn, [h('div', { class: 'mh' }, tr('Varaq tekshiruvi')),
      ...ch.map(c => h('button', { role: 'menuitem', 'data-check': c.id, onclick: () => { wrap.querySelector('.sh-menu')?.remove(); open = c.id === 'labels' ? 'lbl' : c.id === 'stamp' ? 'stamp' : c.id === 'text' ? 'deco' : null; renderSide(); side.querySelector(`[data-sec=${c.id === 'scale' || c.id === 'fit' ? 'sheet' : c.id === 'labels' ? 'lbl' : c.id === 'stamp' ? 'stamp' : 'deco'}]`)?.scrollIntoView({ block: 'start' }); } },
        h('span', {}, c.text), h('span', { class: `chip ${c.ok ? 'ok' : 'warn'}`, style: 'height:18px' }, c.ok ? '✓' : '!'))),
      h('div', { class: 't-small', style: 'padding:4px 10px 6px' }, tr('Qatorni bosish — tegishli sozlamani ochadi.'))]);
  }

  /* ---------- chap: varaqlar toʻplami (V2) ---------- */
  function renderList(): void {
    const res = (i: number): SheetResult | null => { if (i === cur) return last; const r = peek(i); if (!r) later(i); return r; };
    const warn = (i: number) => { const r = res(i); return !!r && sheetChecks(r, norm(sheets[i].opts), tr).some(c => !c.ok && c.id !== 'stamp' && c.id !== 'scale'); };
    list.replaceChildren(
      h('div', { class: 'sh-lh' }, h('b', {}, tr('Varaqlar toʻplami')), h('span', { class: 't-small' }, tf('${n} varaq · bitta PDF albom', { n: sheets.length }))),
      h('div', { class: 'sh-items', role: 'listbox', 'aria-label': tr('Varaqlar') }, ...sheets.map((s, i) => {
        const o = norm(s.opts), num = o.stamp?.num || `MR-${String(i + 1).padStart(2, '0')}`;
        return h('div', { class: 'sh-item', role: 'option', 'aria-selected': i === cur, 'data-sheet': i, onclick: () => { cur = i; render(); } },
          h('span', { class: 'mono t-small' }, num), h('b', {}, sheetName(i)), h('span', { class: 't-small' }, `1:${o.scale ? o.scale.toLocaleString('ru-RU') : (res(i)?.scale.toLocaleString('ru-RU') ?? '…')} · ${o.paper === 'fit' ? tr('Moslash') : o.paper}`),
          warn(i) ? h('span', { class: 'chip warn', title: tr('Eslatma bor') }, '!') : '',
          h('span', { class: 'sh-acts' },
            h('button', { class: 'btn icon-btn btn-sm btn-ghost', 'aria-label': tr('Yuqoriga'), disabled: !i, onclick: (e: Event) => { e.stopPropagation(); [sheets[i - 1], sheets[i]] = [sheets[i], sheets[i - 1]]; if (cur === i) cur--; else if (cur === i - 1) cur++; persist(); render(); } }, svgIcon('<path d="M6 15l6-6 6 6"/>')),
            h('button', { class: 'btn icon-btn btn-sm btn-ghost', 'aria-label': tr('Pastga'), disabled: i === sheets.length - 1, onclick: (e: Event) => { e.stopPropagation(); [sheets[i + 1], sheets[i]] = [sheets[i], sheets[i + 1]]; if (cur === i) cur++; else if (cur === i + 1) cur--; persist(); render(); } }, svgIcon('<path d="M6 9l6 6 6-6"/>')),
            h('button', { class: 'btn icon-btn btn-sm btn-ghost', 'aria-label': tr('Nusxa'), onclick: (e: Event) => { e.stopPropagation(); sheets.splice(i + 1, 0, { id: uid('sh_'), opts: JSON.parse(JSON.stringify(s.opts)) }); cur = i + 1; persist(); render(); } }, svgIcon('<path d="M8 8h11v11H8zM5 15V5h10"/>')),
            h('button', { class: 'btn icon-btn btn-sm btn-ghost', 'aria-label': tr('Oʻchirish'), disabled: sheets.length < 2, onclick: (e: Event) => { e.stopPropagation(); sheets.splice(i, 1); cur = Math.min(cur, sheets.length - 1); persist(); render(); } }, svgIcon(IC.trash))));
      })),
      h('button', { class: 'btn btn-sm btn-block', id: 'shAdd', onclick: () => { sheets.push({ id: uid('sh_'), opts: { ...O(), stamp: { ...(O().stamp ?? {}), num: '', sheet: '' } } as unknown as Record<string, unknown> }); cur = sheets.length - 1; persist(); render(); } }, ...icl(IC.plus, tr('Varaq qoʻshish'))),
      h('span', { class: 't-small' }, tr('Har varaq oʻz namunasi, masshtabi va formatini saqlaydi.')),
      h('span', { class: 'spacer' }),
      h('button', { class: 'btn btn-primary btn-block', id: 'shAlbum', onclick: pdfAll }, ...icl('<path d="M6 3h12v18H6zM9 8h6M9 12h6M9 16h4"/>', tr('Albom — PDF'))));
  }


  /* ---------- c77: aksonometriya muharriri («Qatlamlar va ranglar», sukut — yopiq) ---------- */
  const edOf = (o: SheetOpts): AxoEdit => structuredClone(normAxoEdit(o.axo?.edit) ?? {});
  const setEd = (f: (e: AxoEdit) => void) => { const o = O(), e = edOf(o); f(e); set({ axo: { ...(o.axo ?? {}), edit: normAxoEdit(e) } }); };
  const bldName = (i: number) => { const b = doc.buildings[i]; return `№ ${i + 1} · ${tr(useDef(b.use).name)} · ${tf('${n} qavat', { n: (b.z0 ?? 0) + b.floors })}`; };
  function axoSection(o: SheetOpts): HTMLElement {
    const e = edOf(o), hid = new Set(e.hide ?? []), n = axoEditCount(e);
    const layerRow = (L: (typeof AXO_LAYERS)[number]) => {
      const id = L.id, isO = open === `A:${id}`, c = e.col?.[id] ?? null, tree = id === 'daraxt';
      const chip = tree && !c ? (e.trees === 'xira' ? tr('xira') : tr('shablon')) : c ?? tr('andoza');
      const put = (v: string) => setEd(x => { x.col = { ...(x.col ?? {}), [id]: v }; if (tree) delete x.trees; });
      return h('div', { class: 'sh-lay', 'data-axrow': id },
        h('div', { class: 'li' },
          check(h('span', { class: 'k' }, tr(L.name)), { checked: !hid.has(id), 'data-axl': id, onchange: v => setEd(x => { const s2 = new Set(x.hide ?? []); if (v) s2.delete(id); else s2.add(id); x.hide = [...s2]; }) }),
          h('button', { class: 'ax-chip', type: 'button', 'data-axc': id, 'data-v': c ?? '', 'aria-expanded': isO, title: `${tr('Rang')}: ${chip}`, 'aria-label': `${tr(L.name)} — ${tr('Rang')}: ${chip}`, onclick: () => { open = isO ? 'axo' : `A:${id}`; renderSide(); } },
            h('i', { class: c ? '' : 'auto', style: c ? `background:${c}` : '' }), svgIcon(isO ? '<path d="M6 15l6-6 6 6"/>' : '<path d="M6 9l6 6 6-6"/>'))),
        isO ? h('div', { class: 'sh-layin' },
          tree ? h('div', { class: 'seg sm', id: 'shAxTree', role: 'group', 'aria-label': tr('Daraxtlar') }, ...([['shablon', 'Shablon'], ['xira', 'Xira'], ['rang', 'Rang']] as const).map(([k, t]) =>
            h('button', { type: 'button', 'data-axtree': k, 'aria-pressed': (c ? 'rang' : e.trees === 'xira' ? 'xira' : 'shablon') === k, onclick: () => setEd(x => {
              if (x.col) delete x.col.daraxt; delete x.trees;
              if (k === 'xira') x.trees = 'xira'; if (k === 'rang') x.col = { ...(x.col ?? {}), daraxt: L.sw[3] }; }) }, tr(t)))) : '',
          swRow({ id: `shAxSw-${id}`, attr: 'axsw', hexId: `shAxHex-${id}`, title: tr(L.name), sw: L.sw, cur: c, put }),
          h('div', { class: 'row', style: 'gap:6px;align-items:center' },
            h('span', { class: 't-small', style: 'flex:1' }, c ? h('code', {}, c) : tr(tree ? 'Shablonning yorqin ranglari (varaq uchun)' : 'Namuna va grafika shabloni rangi')),
            h('button', { class: 'btn btn-sm btn-ghost', type: 'button', 'data-axreset': id, disabled: !c && !(tree && e.trees), onclick: () => setEd(x => { if (x.col) delete x.col[id]; if (tree) delete x.trees; }) }, tr('Andoza')))) : '');
    };
    // alohida bino: rasmda bosib yoki roʻyxatdan
    const bi = axSel ? doc.buildings.findIndex(b => b.id === axSel) : -1, B = bi >= 0 ? e.bld?.[axSel!] ?? {} : null;
    const setB = (f: (b: NonNullable<AxoEdit['bld']>[string]) => void) => setEd(x => { const bb = { ...(x.bld?.[axSel!] ?? {}) }; f(bb); x.bld = { ...(x.bld ?? {}), [axSel!]: bb }; });
    const txt = h('input', { class: 'input', type: 'text', id: 'shAxBldTxt', maxlength: 60, value: B?.text ?? '', placeholder: bi >= 0 ? tr(useDef(doc.buildings[bi].use).name) : '', 'aria-label': tr('Tom yozuvi') }) as HTMLInputElement;
    txt.onchange = () => setB(b => { b.text = txt.value.trim() || undefined; });
    const nB = Object.keys(e.bld ?? {}).length;
    return h('div', { class: 'group sh-frows', 'data-sec': 'axo' }, frow('axo', tr('Qatlamlar va ranglar'), n ? tf('${n} oʻzgarish', { n }) : tr('andoza'), () => [
      h('div', { class: 'glabel' }, h('span', {}, tr('Qatlamlar'))),
      h('div', { class: 'group flat', id: 'shAxLayers' }, ...AXO_LAYERS.filter(L => axLayers.has(L.id)).map(layerRow)),
      h('div', { class: 'glabel' }, h('span', {}, tr('Binolar materiali'))),
      h('div', { class: 'tiles c3 ax-mats', id: 'shAxMat', role: 'group', 'aria-label': tr('Binolar materiali') },
        h('button', { class: 'tile', type: 'button', 'data-axmat': '', 'aria-pressed': !e.mat, onclick: () => setEd(x => { delete x.mat; }) }, h('b', {}, tr('Namuna'))),
        ...AXO_MATS.map(m => h('button', { class: 'tile', type: 'button', 'data-axmat': m.id, 'aria-pressed': e.mat === m.id, onclick: () => setEd(x => { x.mat = m.id; }) }, h('i', { class: 'ax-mat', style: `background:#${m.color.toString(16).padStart(6, '0')}${m.opacity < 1 ? ';opacity:.7' : ''}` }), h('b', {}, tr(m.name))))),
      h('div', { class: 'glabel' }, h('span', {}, tr('Alohida bino')), nB ? h('span', {}, `${nB}`) : ''),
      dropdown({ id: 'shAxBld', 'aria-label': tr('Alohida bino'), onchange: v => { axSel = v || null; renderSide(); drawSel(); } },
        [{ value: '', label: tr('— rasmda bosing yoki tanlang —'), selected: !axSel }, ...doc.buildings.map((b, i) => ({ value: b.id, label: bldName(i), selected: b.id === axSel, sub: e.bld?.[b.id] ? tr('oʻzgartirilgan') : undefined })).filter((_, i) => doc.buildings[i].floors > 0)]),
      ...(B ? [
        swRow({ id: 'shAxBldSw', attr: 'axbc', hexId: 'shAxBldHex', title: tr('Fasad rangi'), sw: AXO_LAYERS[0].sw, cur: B.col ?? null, put: v => setB(b => { b.col = v; }) }),
        h('div', { class: 'tiles c3 ax-mats', id: 'shAxBldMat', role: 'group', 'aria-label': tr('Material') },
          h('button', { class: 'tile', type: 'button', 'data-axbm': '', 'aria-pressed': !B.mat, onclick: () => setB(b => { delete b.mat; }) }, h('b', {}, tr('Umumiy'))),
          ...AXO_MATS.map(m => h('button', { class: 'tile', type: 'button', 'data-axbm': m.id, 'aria-pressed': B.mat === m.id, onclick: () => setB(b => { b.mat = m.id as AxoMatId; }) }, h('i', { class: 'ax-mat', style: `background:#${m.color.toString(16).padStart(6, '0')}${m.opacity < 1 ? ';opacity:.7' : ''}` }), h('b', {}, tr(m.name))))),
        h('div', { class: 'field' }, h('label', { for: 'shAxBldTxt' }, tr('Tom yozuvi'), h('span', { class: 'sub' }, ` · ${tr('nom oʻrniga')}`)), txt),
        h('button', { class: 'btn btn-sm btn-block', id: 'shAxBldClr', type: 'button', disabled: !Object.keys(B).length, onclick: () => setEd(x => { if (x.bld) delete x.bld[axSel!]; }) }, tr('Tozalash'))] :
        [h('span', { class: 't-small' }, tr('Rasmda binoni bosing — fasad rangi, materiali va tom yozuvi shu binoga beriladi.'))]),
      h('div', { class: 'glabel' }, h('span', {}, tr('Tom yozuvlari'))),
      ...([['floors', 'Qavatlar soni', 'shAxRFl'], ['num', 'Bino raqami', 'shAxRNum'], ['name', 'Bino nomi', 'shAxRName']] as const).map(([k, t, id]) =>
        h('div', { class: 'li' }, h('span', { class: 'k' }, tr(t)), sw({ id, label: tr(t), on: e.roof?.[k] === true, onchange: v => setEd(x => { x.roof = { ...(x.roof ?? {}), [k]: v }; }) }))),
      h('button', { class: 'btn btn-sm btn-block', id: 'shAxAll', type: 'button', onclick: () => { const r = copyAxoEdit(sheets, edOf(O())); sheets = r.sheets; persist(); render(); toast(tf('Sozlama ${n} ta akso varaqqa qoʻllandi', { n: r.n })); } }, tr('Barcha varaqlarga qoʻllash')),
      h('span', { class: 't-small' }, tr('Faqat koʻrinish — hisob-kitob oʻzgarmaydi. «Andoza» — namuna va grafika shabloni rangi. Funksiya, qavatlilik, kontekst va demontaj namunalarida bino rangi faqat aniq tanlanganda almashadi (material — faqat yuzasi). «Barcha varaqlarga» — butun muharrir sozlamasi (alohida binolar bilan) loyihaning barcha akso varaqlariga koʻchiriladi; namuna va kamera har varaqda oʻziniki.'))]));
  }
  /** Tanlangan bino — koʻrinishda koʻk kontur (faqat ekranda; varaq SVG/PDF ga tushmaydi) */
  function drawSel(): void {
    view.querySelector('[data-axsel]')?.remove();
    const o = O(); if (o.mode !== 'akso' || !axSel) return;
    const img = view.querySelector('image[data-axo-img]') as SVGImageElement | null, p = axoCache.get(axoKey(o))?.picks.find(q => q.id === axSel); if (!img || !p) return;
    const ix = +img.getAttribute('x')!, iy = +img.getAttribute('y')!, iw = +img.getAttribute('width')!, ih = +img.getAttribute('height')!;
    const pt = (a: number[], i: number) => `${(ix + a[i] * iw).toFixed(2)},${(iy + a[i + 1] * ih).toFixed(2)}`;
    const ring = (a: number[]) => `M${a.filter((_, i) => i % 2 === 0).map((_, k) => pt(a, k * 2)).join('L')}Z`;
    let d = ring(p.top); const n = p.top.length / 2;
    for (let i = 0; i < n; i++) { const k = (i + 1) % n; d += `M${pt(p.bot, i * 2)}L${pt(p.bot, k * 2)}L${pt(p.top, k * 2)}L${pt(p.top, i * 2)}Z`; }
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    g.setAttribute('d', d); g.setAttribute('data-axsel', '1'); g.setAttribute('fill', '#2a6fb0'); g.setAttribute('fill-opacity', '.16'); g.setAttribute('stroke', '#2a6fb0'); g.setAttribute('stroke-width', '.35'); g.setAttribute('stroke-linejoin', 'round'); g.setAttribute('pointer-events', 'none');
    img.parentNode!.insertBefore(g, img.nextSibling);
  }
  // rasmda binoni bosib tanlash (muharrir ochiq boʻlganda; «Qoʻl» rejimida — yoʻq)
  view.addEventListener('click', ev => {
    const o = O(); if (hand || o.mode !== 'akso' || !(open === 'axo' || open?.startsWith('A:'))) return;
    const img = view.querySelector('image[data-axo-img]') as SVGImageElement | null; if (!img) return;
    const r = img.getBoundingClientRect(); if (!r.width || !r.height) return;
    const id = hitPick(axoCache.get(axoKey(o))?.picks ?? [], (ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height);
    axSel = id; renderSide(); drawSel();
  });

  /* ---------- oʻng: tanlangan varaq sozlamasi (V1) ---------- */
  const frow = (id: string, title: string, val: string, body: () => (Node | string)[]) => {
    const isOpen = open === id || (id === 'lay' && !!open?.startsWith('L:')) || (id === 'axo' && !!open?.startsWith('A:'));
    return h('div', { class: 'sh-sec', 'data-sec': id },
      h('button', { class: 'li frow', 'aria-expanded': isOpen, 'data-frow': id, onclick: () => { open = isOpen ? null : id; renderSide(); } }, h('span', { class: 'k' }, title), h('span', { class: 'v t-small' }, val), svgIcon(isOpen ? '<path d="M6 15l6-6 6 6"/>' : '<path d="M6 9l6 6 6-6"/>')),
      isOpen ? h('div', { class: 'frowin' }, ...body()) : '');
  };
  function renderSide(): void {
    const o = O(), S = { ...SHEET_DEFAULT.show, ...o.show }, rec = recommendScale(ha, o.kind);
    view.classList.toggle('axpick', o.mode === 'akso' && (open === 'axo' || !!open?.startsWith('A:')));
    const decos: [keyof SheetOpts['show'], string][] = [['title', 'Sarlavha'], ['scaleBar', 'Masshtab chizgʻichi'], ['north', 'Shimol'], ['legend', 'Shartli belgilar'], ['frame', 'Ramka'], ['grid', 'Koordinata toʻri'], ['stamp', 'Shtamp'], ['plotTable', 'Yer uchastkalari jadvali'], ['situation', 'Vaziyat sxemasi']];
    const nDeco = decos.filter(([k]) => S[k]).length;
    const nLay = SHEET_LAYERS.filter(l => layerOf(o, l.id).on).length;
    const tile = (attrs: Record<string, unknown>, t: string, sub: string) => h('button', { class: 'tile', ...attrs }, h('b', {}, t), sub ? h('span', { class: 'sub' }, sub) : '');
    const custom = h('input', { class: 'input', type: 'number', min: 50, max: 100000, step: 50, id: 'gxScaleN', placeholder: '1:—', 'aria-label': tr('Ixtiyoriy masshtab'), value: o.scale && !SCALES.includes(o.scale) ? o.scale : '' }) as HTMLInputElement;
    custom.onchange = () => { const v = Math.round(Number(custom.value)); if (v >= 50) set({ scale: v }); };
    const layerRow = (id: SheetLayerId) => {
      const L = layerOf(o, id), meta = SHEET_LAYERS.find(l => l.id === id)!, isO = open === `L:${id}`;
      const upd = (p: Partial<typeof L>) => set({ layers: { ...(o.layers ?? {}), [id]: { ...(o.layers?.[id] ?? {}), ...p } } });
      return h('div', { class: 'sh-lay' },
        h('div', { class: 'li' }, check(h('span', { class: 'k' }, tr(meta.name), meta.note ? h('span', { class: 'sub' }, tr(meta.note)) : ''), { checked: L.on, 'data-layer': id, onchange: v => upd({ on: v }) }),
          h('button', { class: 'btn icon-btn btn-sm btn-ghost', 'aria-label': tr('Uslub'), 'aria-expanded': isO, onclick: () => { open = isO ? 'lay' : `L:${id}`; renderSide(); } }, svgIcon(isO ? '<path d="M6 15l6-6 6 6"/>' : '<path d="M6 9l6 6 6-6"/>'))),
        isO ? h('div', { class: 'sh-layin' },
          h('div', { class: 'field' }, h('label', {}, tr('Toʻldirish')), h('div', { class: 'seg sm' }, ...([['use', 'Funksiya'], ['one', 'Bir rang'], ['none', 'Yoʻq']] as const).map(([k, t]) => h('button', { 'aria-pressed': L.fill === k, onclick: () => upd({ fill: k }) }, tr(t))))),
          h('div', { class: 'li' }, h('span', { class: 'k' }, tr('Ochroq')), sw({ label: tr('Ochroq'), on: L.light, onchange: v => upd({ light: v }) })),
          h('div', { class: 'li' }, h('span', { class: 'k' }, tr('Kontur')), sw({ label: tr('Kontur'), on: L.outline, onchange: v => upd({ outline: v }) })),
          h('div', { class: 'li' }, h('span', { class: 'k' }, tr('Chiziq'), h('span', { class: 'sub' }, 'mm')), stepper({ label: tr('Chiziq qalinligi'), min: 0.05, max: 2, step: 0.05, value: L.mm, unit: 'mm', onchange: v => upd({ mm: v }) }))) : '');
    };
    const styleName = h('input', { class: 'input', type: 'text', id: 'shStyleName', placeholder: tr('Uslub nomi'), 'aria-label': tr('Uslub nomi') }) as HTMLInputElement;
    side.replaceChildren(
      h('div', { class: 'sh-head' },
        h('div', { class: 'sp-step' }, h('span', {}, `${tr('Varaq')} ${cur + 1} / ${sheets.length}`), h('span', { class: 'sp-prog' }, h('i', { style: `width:${Math.round((cur + 1) / sheets.length * 100)}%` }))),
        h('h2', { class: 't-title' }, tr('Varaqlar')),
        h('p', { class: 't-small' }, tr('Masshtabli chizma: namunani tanlang, varaqni sozlang, yuklab oling yoki Chizmadonga yuboring.'))),
      h('div', { class: 'sh-scroll' },
        h('div', { class: 'seg', id: 'shMode', role: 'tablist' }, ...([['reja', 'Reja'], ['qavat', 'Qavatlar'], ...(houses.length || o.mode === 'uy' ? [['uy', 'Uylar'] as const] : []), ['akso', 'Akso'], ...(multiStage(doc) || o.mode === 'fazalar' ? [['fazalar', 'Navbatlar'] as const] : []), ...(doc.cuts?.length || o.mode === 'kesim' ? [['kesim', 'Kesim'] as const] : []), ...(doc.sections?.length || o.mode === 'siluet' ? [['siluet', 'Fasad'] as const] : [])] as const).map(([k, t]) => h('button', { role: 'tab', 'data-mode': k, 'aria-pressed': (o.mode ?? 'reja') === k, onclick: () => set({ mode: k }) }, tr(t)))),
        ...(o.mode === 'qavat' ? [
          h('div', { class: 'glabel' }, h('span', {}, tr('Namuna'))),
          h('div', { class: 'tiles c2' }, ...([['rang', 'Xonadonlar rangda', 'turi boʻyicha'], ['bir', 'Bir rang', 'oq-qora']] as const).map(([k, t, n]) => tile({ 'data-plook': k, 'aria-pressed': (o.plan?.look ?? 'rang') === k, onclick: () => set({ plan: { ...(o.plan ?? {}), look: k } }) }, tr(t), tr(n)))),
          plans.length ? h('div', { class: 'li' }, h('span', { class: 'k' }, tr('Bino'), h('span', { class: 'sub' }, `1–${plans.length}`)), stepper({ id: 'shBld', label: tr('Bino'), min: 1, max: plans.length, step: 1, value: Math.min(plans.length, o.plan?.floor ?? 1), onchange: v => set({ plan: { ...(o.plan ?? {}), floor: v, grp: undefined } }) })) : h('div', { class: 'note' }, tr('Turar joy seksiyalari yoʻq')),
          ...(plans.length ? (() => { const pl = plans[Math.max(0, Math.min(plans.length - 1, (o.plan?.floor ?? 1) - 1))], gs = floorGroups(pl), cur0 = sheetGroup(pl, o.plan?.grp).gi;
            return [h('div', { class: 'glabel' }, h('span', {}, tr('Qavat'))),
              h('div', { class: 'seg sm wrap', id: 'shGrp', role: 'group', 'aria-label': tr('Qavat') }, ...gs.map((g, i) => h('button', { 'data-grp': i, 'aria-pressed': i === cur0, onclick: () => set({ plan: { ...(o.plan ?? {}), grp: i } }) }, tr(groupName(g))))),
              h('button', { class: 'btn btn-block', id: 'shAllFl', title: tr('Har bino va har qavat (guruh) uchun alohida varaq — bitta PDF albomga'), onclick: () => {
                const add: SheetDoc[] = []; plans.forEach((p2, bi) => floorGroups(p2).forEach((_, gi) => { if (bi === Math.max(0, (o.plan?.floor ?? 1) - 1) && gi === cur0) return; add.push({ id: uid('sh_'), opts: { ...o, plan: { ...(o.plan ?? {}), floor: bi + 1, grp: gi }, stamp: { ...(o.stamp ?? {}), num: '', sheet: '' } } as unknown as Record<string, unknown> }); }));
                sheets.splice(cur + 1, 0, ...add); persist(); render(); toast(tf('${n} ta varaq qoʻshildi', { n: add.length })); } }, tr('Barcha binolar va qavatlar — varaqlar'))]; })() : []),
          h('span', { class: 't-small' }, tr('Varaqda: qavat rejasi nomi va masshtabi bilan (kvartiralar raqamli), vaziyat sxemasi (uchastka, blok, seksiya), oʻng ustunda kvartiralar eksplikatsiyasi. Tahrir — Qavat rejalari oynasida (9-qadam).'))] : []),
        ...(o.mode === 'uy' ? (() => {
          // 02.11: past qavatli uy rejalari — tur (oʻlchami, qavati) va qavat
          const ti = Math.max(0, Math.min(houses.length - 1, (o.plan?.floor ?? 1) - 1)), T = houses[ti];
          return [h('div', { class: 'glabel' }, h('span', {}, tr('Uy turi')), h('span', {}, `${houses.length}`)),
            h('div', { class: 'seg sm wrap', id: 'shHouse', role: 'group', 'aria-label': tr('Uy turi') }, ...houses.map((t, i) => { const [, w, d] = t.key.split('|'); return h('button', { 'data-house': i + 1, 'aria-pressed': i === ti, onclick: () => set({ plan: { ...(o.plan ?? {}), floor: i + 1, grp: 1 } }) }, `${tr(t.name)} ${w}×${d} · ${t.n}`); })),
            ...(T && T.floors > 1 ? [h('div', { class: 'seg sm', id: 'shHouseFl', role: 'group', 'aria-label': tr('Qavat') }, ...Array.from({ length: T.floors }, (_, i) => h('button', { 'data-hfl': i + 1, 'aria-pressed': (o.plan?.grp ?? 1) === i + 1, onclick: () => set({ plan: { ...(o.plan ?? {}), grp: i + 1 } }) }, tf('${n}-qavat', { n: i + 1 }))))] : []),
            h('span', { class: 't-small' }, tr('Uy rejasi — Hajmlar qadamidagi «Uy rejalari» bilan bir xil (tahrir oʻsha yerda).'))];
        })() : []),
        ...(o.mode === 'kesim' ? [
          h('div', { class: 'glabel' }, h('span', {}, tr('Kesim chizigʻi'))),
          (doc.cuts ?? []).length ? h('div', { class: 'tiles c2' }, ...(doc.cuts ?? []).map((c, i) => tile({ 'data-cut': c.id, 'aria-pressed': (o.cut ?? doc.cuts![0].id) === c.id || (!doc.cuts!.some(x => x.id === o.cut) && i === 0), onclick: () => set({ cut: c.id }) }, `${c.label}–${c.label}`, `${tr('Koʻcha')} ${doc.streets.findIndex(x => x.id === c.street) + 1}`)))
            : h('p', { class: 't-small' }, tr('Kesim chizigʻi yoʻq: Koʻchalar → koʻchani tanlang → «Kesim chizigʻini qoʻyish»'))] : []),
        ...(o.mode === 'siluet' ? [
          h('div', { class: 'glabel' }, h('span', {}, tr('Kesim va fasad'))),
          (doc.sections ?? []).length ? h('div', { class: 'tiles c2' }, ...(doc.sections ?? []).map((c, i) => tile({ 'data-sec': c.id, 'aria-pressed': (o.sec ?? doc.sections![0].id) === c.id || (!doc.sections!.some(x => x.id === o.sec) && i === 0), onclick: () => set({ sec: c.id }) }, `${c.label}–${c.label}`, `${tr('chuqurlik')} ${c.depth} m`)))
            : h('p', { class: 't-small' }, tr('Kesim chizigʻi yoʻq: Hajmlar → «Kesim va fasad» → «Chiziq chizish»')),
          h('div', { class: 'glabel' }, h('span', {}, tr('Uslub')), h('span', {}, `${SIL_STYLES.length}`)),
          h('div', { class: 'tiles c2', id: 'shSilStyle', role: 'radiogroup', 'aria-label': tr('Uslub') }, ...SIL_STYLES.map(x => tile({ 'data-silstyle': x.id, role: 'radio', 'aria-pressed': (o.silStyle ?? 'kesim') === x.id, onclick: () => set({ silStyle: x.id }) }, tr(x.name), tr(x.sub))))] : []),
        ...(o.mode === 'akso' ? [
          h('div', { class: 'glabel' }, h('span', {}, tr('Namuna'))),
          h('div', { class: 'tiles c2' }, ...([['oq', 'Oq maket'], ['funksiya', 'Funksiya ranglari'], ['fasad', 'Fasadlar'], ['figura', 'Figura-fon'], ['qoralama', 'Qoralama'], ['qavatlilik', 'Qavatlilik'], ['kontekst', 'Loyiha va kontekst'], ['demontaj', 'Saqlanadi va buziladi']] as const).map(([k, t]) => tile({ 'data-alook': k, 'aria-pressed': (o.axo?.look ?? 'oq') === k, onclick: () => set({ axo: { ...(o.axo ?? {}), look: k } }) }, tr(t), ''))),
          h('div', { class: 'field' }, h('label', {}, tr('Kamera')), dropdown({ id: 'shView', 'aria-label': tr('Kamera'), onchange: v => set({ axo: { ...(o.axo ?? {}), view: v || undefined } }) }, [{ value: '', label: tr('Joriy aksonometriya'), selected: !o.axo?.view }, ...(host.views ?? []).map(v => ({ value: v.id, label: v.name, selected: o.axo?.view === v.id }))])),
          h('div', { class: 'li' }, h('span', { class: 'k' }, tr('Fasad derazalari'), h('span', { class: 'sub' }, tr('7-qadamdan'))), sw({ label: tr('Fasad derazalari'), on: o.axo?.shadow !== false, onchange: v => set({ axo: { ...(o.axo ?? {}), shadow: v } }) })),
          h('div', { class: 'li' }, h('span', { class: 'k' }, tr('Yozuvlar'), h('span', { class: 'sub' }, tr('daha nomi va maydoni, UMN, koʻcha nomlari'))), sw({ id: 'shAxoLab', label: tr('Yozuvlar'), on: o.axo?.labels === true, onchange: v => set({ axo: { ...(o.axo ?? {}), labels: v } }) })),
          h('span', { class: 't-small' }, tr('Kamera — saqlangan koʻrinishlardan; rasm sahnadan olinadi (masshtabsiz).')),
          axoSection(o)] : []),
        ...((o.mode ?? 'reja') === 'reja' ? [
        h('div', { class: 'glabel' }, h('span', {}, tr('Namuna')), h('span', {}, `${SHEET_KINDS.length} + ${tr('uslublar')}`)),
        h('div', { class: 'tiles c2 gx-kinds', role: 'radiogroup', 'aria-label': tr('Varaq turi') },
          ...SHEET_KINDS.map(k => tile({ 'data-kind': k.id, 'aria-pressed': o.kind === k.id && !open?.startsWith('style:'), title: tr(k.note), onclick: () => set({ kind: k.id, ...(k.id === 'vaziyat' && !o.scale ? { scale: 10000 } : {}) }) }, tr(k.name), tr(k.note))),
          ...styles.map(st => tile({ 'data-style-id': st.id, title: tr('Mening uslubim'), onclick: () => set({ ...norm(st.opts as Record<string, unknown>), title: o.title, stamp: o.stamp, center: o.center, rot: o.rot }) }, st.name, tr('Mening uslubim')))),
          // 02.11: «Xizmat radiusi» — xizmat turi (9-qadam tahlili)
          ...(o.kind === 'daraxt' ? [h('div', { class: 'glabel' }, h('span', {}, tr('Daraxtlar inventarizatsiyasi')), h('span', {}, (doc.treeInv?.length ?? 0) ? `${doc.treeInv!.length}` : tr('yoʻq'))),
            h('div', { class: 'row', style: 'gap:6px' },
              h('button', { class: 'btn btn-sm', id: 'trInvBtn', disabled: !host.treeInv, onclick: () => (document.getElementById('trInvFile') as HTMLInputElement | null)?.click() }, tr('Fayl yuklash')),
              ...(doc.treeInv?.length ? [h('button', { class: 'btn btn-sm btn-ghost', id: 'trInvDel', onclick: () => { if (host.treeInv) { doc = host.treeInv([]); memo.clear(); render(); } } }, tr('Tozalash'))] : []),
              h('input', { type: 'file', id: 'trInvFile', accept: '.csv,.txt,.geojson,.json,.dxf', hidden: true, onchange: (e: Event) => { const f = (e.target as HTMLInputElement).files?.[0]; if (!f || !host.treeInv) return; void f.text().then(t => { try { const r = parseTrees(f.name, t); if (!r.trees.length) { toast(tr('Fayldan daraxt topilmadi: ustunlar lon/lat yoki x/y (UTM 42N) boʻlishi kerak')); return; } doc = host.treeInv!(r.trees); memo.clear(); render(); toast(tf('${n} ta daraxt yuklandi', { n: r.trees.length }) + (r.skipped ? ` · ${tf('${n} ta qator oʻtkazildi', { n: r.skipped })}` : '')); } catch { toast(tr('Faylni oʻqib boʻlmadi')); } }); } })),
            h('span', { class: 't-small' }, tr('CSV (lon, lat yoki x, y — UTM 42N; tur, diametr, holat), GeoJSON nuqtalar yoki DXF (POINT, CIRCLE, blok). DWG ni DXF ga saqlab yuklang. OSM daraxtlari bilan birlashtiriladi.'))] : []),
          ...(o.kind === 'xizmat' ? [h('div', { class: 'glabel' }, h('span', {}, tr('Xizmat turi'))), h('div', { class: 'tiles c2', id: 'shSvc', role: 'group', 'aria-label': tr('Xizmat turi') }, ...SERVICES.map(sv => tile({ 'data-svc': sv.id, 'aria-pressed': (o.svc ?? 'mtm') === sv.id, title: tr(sv.note), onclick: () => set({ svc: sv.id }) }, tr(sv.name), `${sv.r} m`)))] : []),
        ] : []),
        // c74: grafika shabloni (ranglar, chiziq, atrof, daraxtlar) — varaq sozlamasi; «Barcha varaqlarga» — butun albomga
        ...((o.mode ?? 'reja') === 'reja' || o.mode === 'akso' ? [
          h('div', { class: 'glabel', 'data-sec': 'gstyle' }, h('span', {}, tr('Grafika shabloni')), h('span', {}, tr(gstyleById(o.gstyle).name))),
          gstylePicker('shGStyle', o.gstyle, v => set({ gstyle: v === 'joriy' ? undefined : v })),
          ...(o.kind === 'parsel' && (o.mode ?? 'reja') === 'reja' ? [h('div', { class: 'field' }, h('label', {}, tr('Yer uchastkalari')), h('div', { class: 'seg sm', id: 'shParcel' }, ...([['rang', 'Funksiya rangida'], ['kulrang', 'Bir xil kulrang']] as const).map(([k, t]) => h('button', { 'data-parcel': k, 'aria-pressed': (o.parcel ?? 'rang') === k, onclick: () => set({ parcel: k === 'rang' ? undefined : k }) }, tr(t))))),
            ...(o.parcel === 'kulrang' ? [greyPick(o)] : [])] : []),
          h('button', { class: 'btn btn-sm btn-block', id: 'shGStyleAll', onclick: () => { const g = O().gstyle; sheets = sheets.map(x => ({ ...x, opts: { ...x.opts, gstyle: g } })); persist(); render(); toast(tf('Shablon ${n} varaqqa qoʻllandi', { n: sheets.length })); } }, tr('Barcha varaqlarga qoʻllash')),
          h('span', { class: 't-small' }, tr('Shablon funksiyalar ranglarini, atrof (och fon xarita), chiziq qalinligini va daraxtlarni almashtiradi. Shartli belgilar tuzilishi oʻzgarmaydi.'))] : []),
        h('div', { class: 'glabel', 'data-sec': 'sheet' }, h('span', {}, tr('Varaq'))),
        h('div', { class: 'field' }, h('label', {}, tr('Format')), h('div', { class: 'seg sm', id: 'gxPaper' }, ...(['fit', 'A4', 'A3', 'A2', 'A1', 'A0'] as Paper[]).map(p => h('button', { 'data-v': p, 'aria-pressed': o.paper === p, onclick: () => set({ paper: p }) }, p === 'fit' ? tr('Moslash') : p)))),
        h('div', { class: 'field' }, h('label', {}, tr('Yoʻnalish')), h('div', { class: 'seg sm', id: 'gxOrient' }, h('button', { 'data-v': 'true', 'aria-pressed': o.landscape, disabled: o.paper === 'fit', onclick: () => set({ landscape: true }) }, tr('Yotiq')), h('button', { 'data-v': 'false', 'aria-pressed': !o.landscape, disabled: o.paper === 'fit', onclick: () => set({ landscape: false }) }, tr('Tik')))),
        h('div', { class: 'field' }, h('label', {}, tr('Masshtab')),
          h('div', { class: 'tiles c3', id: 'gxScale' }, tile({ 'data-scale': 0, 'aria-pressed': !o.scale, onclick: () => set({ scale: 0 }) }, tr('Avto'), ''), ...SCALES.map(v => tile({ 'data-scale': v, 'aria-pressed': o.scale === v, onclick: () => set({ scale: v }) }, `1:${v.toLocaleString('ru-RU')}`, ''))),
          h('div', { class: 'row', style: 'gap:6px;align-items:center' }, h('span', { class: 't-small', style: 'white-space:nowrap' }, tr('Ixtiyoriy') + ' 1:'), custom)),
        h('div', { class: 'row', style: 'gap:6px;align-items:flex-start' }, h('span', { class: 't-small', style: 'flex:1' }, tf('Tavsiya: 1:${s} — hudud ${ha} ga.', { s: rec.scale.toLocaleString('ru-RU'), ha: fmt(ha, 1) })), h('span', { class: 'chip warn', title: tr('VM 497-son qarori va ShNQ 2.07.01-23 masshtabni koʻrsatmaydi — amaliyotdagi odat, tasdiqlanmagan') }, tr('andoza')),
          o.scale !== rec.scale ? h('button', { class: 'btn btn-sm', id: 'gxRec', onclick: () => set({ scale: rec.scale }) }, tr('Qoʻllash')) : ''),
        ...((o.mode ?? 'reja') === 'reja' ? [
        h('div', { class: 'glabel', 'data-sec': 'lbl' }, h('span', {}, tr('Yozuvlar')), h('span', {}, `${last.labels.full} / ${last.labels.total} ${tr('toʻliq')}`)),
        h('div', { class: 'seg sm', id: 'gxLabels' }, ...LABEL_MODES.map(m => h('button', { 'data-lmode': m.id, title: tr(m.name), 'aria-pressed': (o.labelMode ?? 'auto') === m.id, onclick: () => set({ labelMode: m.id as LabelMode }) }, tr(({ auto: 'Avto', full: 'Toʻliq', codeArea: 'Kod + ga', code: 'Kod', off: 'Yoʻq' } as Record<string, string>)[m.id])))),
        h('span', { class: 't-small' }, tr('Kod 3,5 mm, qolgani 2,5 mm (GOST 2.304-81). Sigʻmagani «Yer uchastkalari» jadvalida.'))] : []),
        h('div', { class: 'group sh-frows' },
          frow('deco', tr('Bezaklar'), `${nDeco} / 9`, () => [
            h('div', { class: 'group flat' }, ...decos.map(([k, t]) => h('div', { class: 'li' }, check(h('span', { class: 'k' }, tr(t)), { checked: !!S[k], 'data-show': k, onchange: v => set({ show: { ...S, [k]: v } }) })))),
            S.grid ? h('div', { class: 'li' }, h('span', { class: 'k' }, tr('Toʻr qadami'), h('span', { class: 'sub' }, tr('0 — avtomatik'))), stepper({ label: tr('Toʻr qadami'), min: 0, max: 2000, step: 50, value: o.gridStep ?? 0, unit: 'm', onchange: v => set({ gridStep: v }) })) : '',
            h('div', { class: 'field' }, h('label', {}, tr('Shrift')), dropdown({ 'aria-label': tr('Shrift'), id: 'gxFont', onchange: v => set({ font: v }) }, FONTS.map(f => ({ value: f, label: f, selected: (o.font ?? 'Archivo') === f }))))]),
          frow('lay', tr('Qatlamlar'), `${nLay} / ${SHEET_LAYERS.length}`, () => SHEET_LAYERS.map(l => layerRow(l.id))),
          frow('stamp', tr('Sarlavha va shtamp'), o.title || doc.name, () => {
            const inp = (id: string, label: string, val: string, on: (v: string) => void, ph = '') => { const e = h('input', { class: 'input', type: 'text', id, value: val, placeholder: ph, 'aria-label': label }) as HTMLInputElement; e.onchange = () => on(e.value); return h('div', { class: 'field' }, h('label', { for: id }, label), e); };
            const st = o.stamp ?? {};
            return [inp('gxTitle', tr('Sarlavha'), o.title, v => set({ title: v }), doc.name),
              inp('gxSheet', tr('Varaq nomi'), st.sheet ?? '', v => set({ stamp: { ...st, sheet: v } }), tr(SHEET_KINDS.find(k => k.id === o.kind)!.name)),
              inp('gxAuthor', tr('Muallif'), st.author ?? '', v => set({ stamp: { ...st, author: v } })),
              inp('gxNum', tr('Varaq raqami'), st.num ?? '', v => set({ stamp: { ...st, num: v } }), `MR-${String(cur + 1).padStart(2, '0')} · ${cur + 1} / ${sheets.length}`),
              h('span', { class: 't-small' }, `${tr('Sana')}: ${new Date().toLocaleDateString('ru-RU')}`)];
          }),
          frow('style', tr('Uslub'), styles.length ? `${styles.length}` : '', () => [
            h('div', { class: 'row', style: 'gap:6px' }, styleName, h('button', { class: 'btn btn-sm', id: 'shStyleSave', onclick: () => { const n = styleName.value.trim() || `${tr('Uslub')} ${styles.length + 1}`; const { title: _t, stamp: _s, center: _c, rot: _r, ...rest } = O(); void _t; void _s; void _c; void _r; styles = [...styles, { id: uid('st_'), name: n, opts: rest as unknown as Record<string, unknown> }]; persist(); render(); } }, tr('Saqlash'))),
            h('button', { class: 'btn btn-sm btn-block', id: 'shStyleReset', onclick: () => set({ ...norm({ kind: O().kind }), title: O().title, stamp: O().stamp, center: O().center, rot: O().rot }) }, tr('Asliga')),
            styles.length ? h('div', { class: 'group' }, ...styles.map(st => h('div', { class: 'li' }, h('span', { class: 'k' }, st.name), h('button', { class: 'btn icon-btn btn-sm btn-ghost', 'aria-label': tr('Oʻchirish'), onclick: () => { styles = styles.filter(x => x !== st); persist(); render(); } }, svgIcon(IC.trash))))) : '',
            h('span', { class: 't-small' }, tr('Uslub loyiha faylida saqlanadi va «Namuna» qatoriga qoʻshiladi.'))])),
        h('details', { class: 'how' }, h('summary', {}, svgIcon(IC.info), tr('Qanday ishlaydi')), h('div', {}, tr('SVG va PDF haqiqiy oʻlchamda (mm), har qatlam alohida nomli guruh — Illustrator va Inkscape qatlamlarni koʻradi. Masshtab «Avto» — hudud tanlangan formatga hoshiyalar va oʻng ustun bilan sigʻadigan eng yirik standart masshtab. Master reja uchun masshtab meʼyorda yoʻq (VM 497-son qarori, ShNQ 2.07.01-23) — tavsiya «andoza». Varaq doim oq.')))),
      h('div', { class: 'sh-foot' }, dl, toCh));
  }

  function render(): void {
    const keep = side.querySelector('.sh-scroll')?.scrollTop ?? 0;
    last = run(O());
    view.innerHTML = last.svg.replace(/^<\?xml[^>]*>\s*/, '');
    const s = view.querySelector('svg')!; s.removeAttribute('width'); s.removeAttribute('height');
    lens.replaceChildren(h('div', { class: 'sh-lensin', html: last.svg.replace(/^<\?xml[^>]*>\s*/, '').replace(/width="[^"]*mm" height="[^"]*mm"/, 'width="100%" height="100%"') }));
    const o = O();
    info.replaceChildren(h('span', {}, `${o.paper === 'fit' ? tr('Moslash') : o.paper} · ${fmt(last.widthMm, 0)} × ${fmt(last.heightMm, 0)} mm · ${o.mode === 'qavat' || o.mode === 'akso' || o.mode === 'uy' ? (innerLabel.get(last) ?? '') : `M 1:${last.scale}`}${host.ctx || o.mode === 'qavat' || o.mode === 'uy' ? '' : ` · ${tr('atrof yuklanmagan')}`}`));
    const n = sheetChecks(last, o, tr).filter(c => !c.ok).length;
    checksBtn.className = `chip ${n ? 'warn' : 'ok'} sh-checks`; checksBtn.replaceChildren(h('i'), n ? tf('${n} ta eslatma', { n }) : tr('Eslatma yoʻq'));
    renderList(); renderSide(); applyZoom(); drawSel();
    const sc = side.querySelector('.sh-scroll'); if (sc) sc.scrollTop = keep;
  }

  document.body.append(wrap);
  document.addEventListener('keydown', onKey);
  render();
  requestAnimationFrame(applyZoom);
  new ResizeObserver(() => { if (!zoom) applyZoom(); }).observe(view);
}

/** Akso varagʻi legendasi (mm): chap pastki burchakda, faqat bor toifalar; legenda boʻsh boʻlsa — hech narsa */
function axoLegendSvg(look: string | undefined, items: { color: number; label: string; hatch?: boolean }[], vx: number, vy: number, vh: number): string {
  if (!items.length) return '';
  const title = look === 'qavatlilik' ? tr('Qavatlar soni') : look === 'kontekst' ? tr('Loyiha va kontekst') : tr('Saqlanadi va buziladi');
  const hex = (c: number) => '#' + c.toString(16).padStart(6, '0'), lh = 5, w = 46, h = 8 + items.length * lh, x = vx + 4, y = vy + vh - h - 4;
  const esc = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
  return `<g data-axo-legend="1"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff" fill-opacity=".92" stroke="#d7d4cd" stroke-width=".2"/>`
    + `<text x="${x + 3}" y="${y + 5}" font-size="2.8" font-weight="600" fill="#1d1d1b">${esc(title)}</text>`
    + items.map((it, i) => { const yy = y + 8 + i * lh; return `<rect x="${x + 3}" y="${yy}" width="6" height="3.4" fill="${hex(it.color)}"${it.hatch ? ' fill-opacity=".35" stroke="#c0392b" stroke-width=".3" stroke-dasharray=".8 .6"' : ' stroke="#8f8a80" stroke-width=".15"'}/><text x="${x + 11}" y="${yy + 2.8}" font-size="2.6" fill="#3a3936">${esc(tr(it.label))}</text>`; }).join('')
    + '</g>';
}
