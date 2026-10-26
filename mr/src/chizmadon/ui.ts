/**
 * Chizmadon — «bitta oyna» (qaror 2026-10-19, Project: claude/chizmadon-bitta-oyna.md). Alohida «Muharrir / Albom» rejimi yoʻq:
 *  - Kirish oynasi: loyiha hududi + «Loyihadan tayyor» materiallar + maket oilasi (kichik rasm) + format → «Albomni tuzish».
 *  - Header: maket menyusi, format, bitta / hamma varaq, «Kataklar», «Yuklab olish».
 *  - Chap «Albom» paneli (akkordeon, tasmaga yigʻiladi): Loyihadan · Varaqlar · Qatlamlar · Uslub · Kutubxona · Loyiha hududi.
 *  - Markaz: bitta varaq (sigʻdirilgan), pastda 14 asbob + magnit (5 mm toʻr), bekor qilish / qaytarish; tepada oʻngda varaq raqami.
 *  - Oʻng: Element · Varaq (shablon muqobillari ball bilan + tekshiruv).
 *  - Tor ekran: < 1180 px — bir vaqtda bitta panel; < 900 px — panellar varaq ustida suzadi.
 * Varaqlar: avtomatik maket varaqlari (album.ts) + erkin varaqlar (eski albom va namunalar). Maket varagʻidagi qoʻlda chizilganlar
 * material katagiga yoki varaqqa bogʻlanadi (bind.ts) — material koʻchsa, birga koʻchadi.
 */
import { h, svgIcon, icl, IC, toast, download } from '../ui/dom';
import { sw, stepper, seg } from '../ui/controls';
import { tr, tf, trSvg, getLang } from '../i18n';
import { logoSvg } from '../ui/logo';
import { svgPdf } from '../ui/pdf';
import { openColor } from '../ui/colorpicker';
import { type ChDoc, type ChEl, type ChPage, type ChInbox, type ChPaper, type ElType, type ChMatSet, type ChView, clampView, PLAN_SCALES, normDoc, blankPage, cid, pageSize, bbox, moved, fitTo, mapScale, mapNorth } from './model';
import { pageSvg, textHeight, legendHeight } from './render';
import { pageChecks, applyFix, sheetChecks, type Check9 } from './check';
import { LAYOUTS, buildLayoutPage, type LFamily, type TplCtx } from './layouts';
import { legacyPending, legacyTaken, convertMaketDoc, matToInbox } from './legacy';
import { TOOLS, type Tool, FLOWS, BANDS, ZONES, MOBILITY, DASHES, ICON_GROUPS, iconById, LOOKS, TREES, PALETTES, paletteById, FONTS, TEXT_KINDS } from './catalog';
import { wmCanvas } from '../core/wm';

import { familyById, accepts, placements, type Material } from './autolayout';
import { buildAlbum, inner, slotAt, setCustomPal, type Album } from './album';
import { renderPage, LIB, PAL, setSheetTr, slotRectOf } from './sheet';
import { siteMaterials, projectMaterials, captureEls, type PlanSrc } from './materials';
import { loadGeo, loadWorld, world, resolve, presets, placeName, rName, dName, autoNote, setLocLang, locSearch, parseCoord, interiorPt, uzMini, worldMini, type Resolved, type LocHit } from './location';
import { rebase, reanchor, bindTo } from './bind';

export interface ChHost {
  /** loyiha nomi va joyi (sarlavha, namunalar) */
  project: string; place: string;
  /** loyiha nuqtasi [uzunlik, kenglik] — «Loyiha hududi» sukuti */
  origin?: [number, number];
  /** saqlangan albom (Project.chizmadon) */
  data: Record<string, unknown> | undefined;
  save: (d: ChDoc) => void;
  /** TIK jadvali: [koʻrsatkich, birlik, qiymat] */
  tik: () => string[][];
  /** loyiha bosh rejasi (Varaqlar, xarita qismi, mm) */
  siteMap: () => TplCtx['map'] | undefined;
  /** 19-band: Master rejaning barcha rejalari (bosh reja, land use, funksional, qavatlilik, kvartirografiya…) — «Loyihadan» materiallari */
  plans?: () => PlanSrc[];
  /** joriy 3D sahna rasmi (data URL) */
  scene: () => string | null;
  /** ochilganda «Loyihadan» ga qoʻshiladigan narsa */
  incoming?: Omit<ChInbox, 'id' | 'at'>;
  onClose?: () => void;
}

const PT = 0.3528;
const safe = (s: string) => s.replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 60) || 'chizmadon';
const today = () => new Date().toLocaleDateString('ru-RU');
const TYPE_NAME: Record<ElType, string> = { text: 'Matn', line: 'Chiziq', arrow: 'Oʻq chiziq', pen: 'Erkin chiziq', rect: 'Toʻrtburchak', ellipse: 'Ellips', poly: 'Koʻpburchak', flow: 'Yoʻnalish oʻqi', zone: 'Zona', icon: 'Belgi', row: 'Qator', image: 'Rasm', map: 'Xarita oynasi', legend: 'Shartli belgilar', table: 'Jadval' };
const I = {
  panel: '<path d="M4 5h16v14H4zM9 5v14"/>', pages: '<path d="M7 3h10v14H7zM4 7v14h10"/>', layers: '<path d="M12 4l9 5-9 5-9-5zM3 14l9 5 9-5"/>', lib: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>',
  el: '<path d="M5 3l14 8-6 2-3 6z"/>', check: '<path d="M4 4h16v16H4zM8 12l3 3 5-6"/>', lock: '<path d="M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4"/>', unlock: '<path d="M6 11h12v10H6zM8 11V7a4 4 0 0 1 7.5-2"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6"/>', eyeOff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3 3.6M6.6 6.6C3.9 8.4 2 12 2 12s4 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/>',
  up: '<path d="M6 15l6-6 6 6"/>', down: '<path d="M6 9l6 6 6-6"/>', copy: '<path d="M8 8h12v12H8zM4 16V4h12"/>', magnet: '<path d="M6 4v8a6 6 0 0 0 12 0V4h-4v8a2 2 0 0 1-4 0V4zM6 8h4M14 8h4"/>',
  grid: '<path d="M4 4h16v16H4zM4 9.3h16M4 14.6h16M9.3 4v16M14.6 4v16"/>', undo: '<path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3"/>', redo: '<path d="M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3"/>',
  dl: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', more: '<path d="M5 12h.01M12 12h.01M19 12h.01"/>',
  flipH: '<path d="M12 3v18M8 7L3 12l5 5zM16 7l5 5-5 5"/>', flipV: '<path d="M3 12h18M7 8l5-5 5 5zM7 16l5 5 5-5"/>', grp: '<path d="M3 3h8v8H3zM13 13h8v8h-8zM7 11v6h6M17 13V7h-6"/>',
  distH: '<path d="M4 4v16M20 4v16M9 8h6v8H9z"/>', distV: '<path d="M4 4h16M4 20h16M8 9h8v6H8z"/>', trash: IC.trash,
  pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"/>', tpl: '<path d="M4 4h16v16H4zM4 9h16M9 9v11"/>',
  pal: '<path d="M12 3a9 9 0 100 18c1 0 1.5-.8 1.5-1.6 0-1.2-1-1.4-1-2.4 0-.8.7-1.5 1.6-1.5H17a4 4 0 004-4c0-4.7-4-8.5-9-8.5z"/>', slots: '<path d="M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z"/>',
  imp: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>', one: '<path d="M6 4h12v16H6z"/>', all: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
  drag: '<path d="M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01"/>', chev: '<path d="M6 9l6 6 6-6"/>', warn: '<path d="M12 4l9 16H3zM12 10v4M12 17v.5"/>',
  swap: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>', crop: '<path d="M6 2v14a2 2 0 002 2h14M2 6h14a2 2 0 012 2v14"/>', free: '<path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/>',
  left: '<path d="M15 18l-6-6 6-6"/>', right: '<path d="M9 6l6 6-6 6"/>', pen: '<path d="M4 16c3-8 6 3 9-3s4-7 7-8"/>', x: IC.x,
};
const TOOL_KEYS: Record<string, Tool> = Object.fromEntries(TOOLS.map(t => [t.key.toLowerCase(), t.id]));
/** Uslub muharriri: maket palitrasidagi oʻzgartiriladigan ranglar */
const PKEYS: [string, string][] = [['acc', 'Asosiy'], ['acc2', '2-rang'], ['acc3', '3-rang'], ['acc4', '4-rang'], ['green2', 'Yashil'], ['water', 'Suv'], ['land', 'Fon'], ['ink', 'Matn']];
const SW = ['#c0643a', '#e08a3a', '#8b4a9c', '#0f8a7e', '#4f9a6e', '#3f6fa8', '#c9a227', '#d0473b', '#141414'];
const SECS = [['loyiha', 'Loyihadan', I.imp], ['varaq', 'Varaqlar', I.pages], ['qatlam', 'Qatlamlar', I.layers], ['uslub', 'Uslub', I.pal], ['kutubxona', 'Kutubxona', I.lib], ['hudud', 'Loyiha hududi', I.pin]] as const;
type SecId = typeof SECS[number][0];
const fmtName = (k: string) => (LAYOUTS.formats[k]?.name ?? k).replace(' landshaft', '').replace(' portret', '');

export function openChizmadon(host: ChHost): void {
  document.querySelector('.gx.ch')?.remove();
  setSheetTr(tr, tf); setLocLang(getLang());
  let d: ChDoc = normDoc(host.data, '');
  if (!d.title) d.title = tr('Taqdimot albomi');
  let tool: Tool = 'select';
  let sel = new Set<string>();
  /** tanlangan material (Loyihadan) */
  let matSel: string | null = null;
  /** kesish rejimidagi material (3-bosqich): katak ichida sudrash — surish, gʻildirak — kattalashtirish */
  let crop: string | null = null;
  /** «Loyihadan» roʻyxatida ochilgan guruhlar (bino kvartirografiyasi) */
  const openGrp = new Set<string>();
  /** 4-bosqich: varaqning oʻzida tahrirlash (material sarlavhasi yoki matni) */
  let editing: { id: string; what: 'title' | 'text'; cancel: () => void } | null = null;
  let zoom = 0, panX = 0, panY = 0;
  let magnet = true, gridOn = false, gray = false;
  let float: 'left' | 'right' | null = null;
  let saved = true, saveT: ReturnType<typeof setTimeout> | undefined;
  const opt = { flow: FLOWS[0].id, zone: ZONES[0].id, icon: 'avtobus', look: 'doira' as ChEl['look'], rowKind: 'tree' as NonNullable<ChEl['row']>['kind'], tree: TREES[0].id, mob: '' as string, textKind: 'matn' as NonNullable<ChEl['style']['kind']>, activeLayer: '' };
  const hist: string[] = [], fut: string[] = []; let lastMerge = '', lastT = 0;
  const tablet = () => innerWidth < 1180;
  const phone = () => innerWidth < 900;
  if (tablet()) d.ui.right = false;
  if (phone()) d.ui.left = false;

  /* ---------- avtomatik albom: materiallar, maket varaqlari, bogʻlanish ---------- */
  let LAST: Album | null = null, VP: ChPage[] = [], BG: string[] = [], UIX: string[] = [], nAuto = 0, MATS: Material[] = [], R: Resolved | null = null;
  let PLACE: Record<string, { pi: number; k: number }> = {};
  const fam = (): LFamily => familyById(d.auto.fam);
  const fmtOf = (f: LFamily = fam()) => (f.formats.includes(d.auto.fmt[f.id]) ? d.auto.fmt[f.id] : f.formats[0]);
  const site = (): { lat: number; lon: number } => d.auto.site ?? (host.origin ? { lat: host.origin[1], lon: host.origin[0] } : presets()[0] ?? { lat: 41.2995, lon: 69.2401 });
  const matSet = (id: string): ChMatSet => (d.auto.mats[id] ??= {});
  const allPages = (): ChPage[] => [...VP, ...d.pages];
  const isAuto = (i = d.cur) => i < nAuto;
  const EMPTY: ChPage = blankPage('—');
  const P = (): ChPage => allPages()[d.cur] ?? EMPTY;
  const handPage = (e: ChEl): number => { if (!e.a) return -1; if (e.a.el) { const p = PLACE[e.a.el]; return p ? p.pi : -1; } return e.a.pi < nAuto ? e.a.pi : -1; };
  const hiddenHand = () => d.hand.filter(e => handPage(e) < 0);
  const cellsOf = (pi: number) => LAST?.pages[pi]?.cells ?? [];
  const pageRect = (pi: number) => LAST?.pages[pi]?.page ?? { x: 0, y: 0, w: 420, h: 297 };
  /** Loyiha bosh rejasi va TIK — oyna ochiq turganda loyiha oʻzgarmaydi: bir marta olinadi */
  let PLAN: TplCtx['map'] | null | undefined, TIK: string[][] | undefined;
  const planOnce = () => { if (PLAN === undefined) { const m = host.siteMap(); PLAN = m ? { ...m, svg: trSvg(m.svg) } : null; } return PLAN; };
  const tikOnce = () => (TIK ??= host.tik());
  let PLANS: PlanSrc[] | undefined;
  const plansOnce = (): PlanSrc[] | undefined => {
    if (!host.plans) return undefined;
    // fit (katak oʻlchami) — har oʻlcham uchun alohida kesh (qavat rejalari katakka mos masshtabda chiziladi)
    return (PLANS ??= host.plans().map(p => { const C = new Map<string, ReturnType<PlanSrc['get']>>(); return { ...p, get: (fit?: { w: number; h: number; scale?: number }) => {
      const key = fit ? `${fit.w.toFixed(1)}x${fit.h.toFixed(1)}:${fit.scale ?? 0}` : '';
      if (!C.has(key)) { const m = p.get(fit); C.set(key, m ? { ...m, svg: trSvg(m.svg), legend: m.legend?.map(q => ({ ...q, label: tr(q.label) })) } : m); if (C.size > 24) C.delete(C.keys().next().value!); }
      return C.get(key); } }; }));
  };
  /* ---------- 19-band (3): maket varaqlari matnlari — sukut loyiha maʼlumotidan (namuna matnlari oʻrniga) ---------- */
  const YEAR = new Date().getFullYear();
  const TXT_DEF = {
    proj: () => [d.title || host.project, R ? tr(placeName(R)) : host.place].filter(Boolean).join(' · '),
    stamp: () => `Archemistry Lab  ·  ${d.album.author || '—'}  ·  ${YEAR}`,
    shifr: () => '—',
    tik: () => tikOnce().filter(r => r[2] && r[2] !== '0' && r[2] !== '0,00').slice(0, 4).map(r => `${tr(r[0])} ${r[2]}${r[1] ? ' ' + tr(r[1]) : ''}`).join('  ·  '),
    src: () => `${tr('Manba: loyiha maʼlumoti')}, ${YEAR}`,
  };
  const albumTxt = () => { const t = d.auto.txt; return { proj: t.proj ?? TXT_DEF.proj(), stamp: t.stamp ?? TXT_DEF.stamp(), shifr: t.shifr ?? TXT_DEF.shifr(), tik: t.tik ?? TXT_DEF.tik(), src: t.src ?? TXT_DEF.src(), hide: d.auto.hide }; };
  /** Rasm faylini oʻqish va kichraytirish (eng uzun tomoni ≤ 1800 px, JPEG 0,85) — loyiha hujjati yengil qolsin */
  function pickPhoto(done: (url: string, name: string) => void): void {
    fileIn.value = ''; fileIn.onchange = () => {
      const f = fileIn.files?.[0]; if (!f) return; const r = new FileReader();
      r.onload = () => {
        const url = String(r.result), img = new Image();
        img.onload = () => {
          const k = Math.min(1, 1800 / Math.max(img.width, img.height));
          if (k === 1 && url.length < 900_000) { done(url, f.name.replace(/\.[^.]+$/, '')); return; }
          const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          const g = c.getContext('2d')!; g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
          done(c.toDataURL('image/jpeg', 0.85), f.name.replace(/\.[^.]+$/, ''));
        };
        img.onerror = () => toast(tr('Rasm oʻqilmadi'));
        img.src = url;
      };
      r.readAsDataURL(f);
    };
    fileIn.click();
  }
  /** Maket varaqlaridagi tahrirlarni d.hand ga yozish va bogʻlanishni yangilash (reanchor) */
  function writeBack(): void {
    if (!LAST) return;
    const shown = VP.flatMap((p, pi) => { p.els.forEach(e => reanchor(e, pi, cellsOf(pi), pageRect(pi))); return p.els; });
    const ids = new Set(shown.map(e => e.id));
    d.hand = [...d.hand.filter(e => !ids.has(e.id) && handPage(e) < 0), ...shown];
  }
  /** Materiallar va maketni qayta hisoblash; bogʻlangan shakllar yangi katakka moslanadi (rebase) */
  function relayout(wb = true): void {
    if (wb) writeBack();
    const s = site(); R = resolve(s.lat, s.lon);
    MATS = [...projectMaterials({ plan: host.plans ? null : planOnce(), plans: plansOnce(), tik: tikOnce(), scene: null, inbox: d.inbox }, d.auto.mats), ...siteMaterials(() => R!, d.auto.mats)];
    setCustomPal(d.auto.custom); if (d.auto.pal === 'custom' && !d.auto.custom) d.auto.pal = 'arch';
    const f = fam(), fmt = fmtOf(f);
    LAST = buildAlbum({ fam: f, fmt, pal: d.auto.pal, mats: MATS, force: d.auto.force, ov: d.auto.ov, slots: d.auto.slots, R, sel: matSel, place: R ? placeName(R) : host.place, txt: albumTxt(), ttl: d.auto.ttl, chap: d.auto.chap });
    d.auto.ov = LAST.ov; nAuto = LAST.pages.length; PLACE = placements(LAST.PG);
    BG = LAST.pages.map(ap => inner(ap.svg)); UIX = LAST.pages.map(ap => ap.ui);
    for (const e of d.hand) { const pi = handPage(e); if (pi < 0) continue; const F = e.a!.el ? cellsOf(pi).find(c => c.el === e.a!.el)?.r ?? pageRect(pi) : pageRect(pi); if (!e.a!.r0) e.a!.r0 = { ...F }; else rebase(e, F); }
    VP = LAST.pages.map((ap, pi) => ({ id: `auto${pi}`, name: ap.title, paper: 'custom' as ChPaper, landscape: ap.fr.W >= ap.fr.H, w: ap.fr.W, h: ap.fr.H, layers: d.handLayers, els: d.hand.filter(e => handPage(e) === pi), tpl: `L:${f.id}/${ap.fill.page.id}` }));
    if (d.v === 1) { d.cur += nAuto; d.v = 2; }
    d.cur = Math.max(0, Math.min(d.cur, allPages().length - 1));
  }
  const L = () => { const p = P(); return p.layers.find(l => l.id === opt.activeLayer && !l.locked) ?? [...p.layers].reverse().find(l => !l.locked && l.visible) ?? p.layers[p.layers.length - 1]; };
  const layerOf = (e: ChEl) => P().layers.find(l => l.id === e.layer);
  const editable = (e: ChEl) => { const l = layerOf(e); return !!l && l.visible && !l.locked; };
  const selected = () => P().els.filter(e => sel.has(e.id));

  /* ---------- tarix va saqlash ---------- */
  const snap = () => JSON.stringify({ pages: d.pages, hand: d.hand, handLayers: d.handLayers, auto: d.auto, inbox: d.inbox, cur: d.cur });
  function commit(merge = ''): void {
    const now = Date.now();
    if (!(merge && merge === lastMerge && now - lastT < 1200)) { writeBack(); hist.push(snap()); if (hist.length > 80) hist.shift(); fut.length = 0; }
    lastMerge = merge; lastT = now; dirty();
  }
  function dirty(): void { writeBack(); saved = false; syncSave(); clearTimeout(saveT); saveT = setTimeout(flush, 700); }
  function flush(): void { clearTimeout(saveT); if (saved) return; writeBack(); host.save(JSON.parse(JSON.stringify(d))); saved = true; syncSave(); }
  function restore(s: string): void { const o = JSON.parse(s); d.pages = o.pages; d.hand = o.hand; d.handLayers = o.handLayers; d.auto = o.auto; d.inbox = o.inbox; d.cur = o.cur; sel.clear(); lastMerge = ''; relayout(false); saved = false; syncSave(); clearTimeout(saveT); saveT = setTimeout(flush, 700); renderAll(); }
  function undo(): void { const s = hist.pop(); if (!s) return; writeBack(); fut.push(snap()); restore(s); }
  function redo(): void { const s = fut.pop(); if (!s) return; writeBack(); hist.push(snap()); restore(s); }
  /** joriy varaqni oʻzgartirish (tarix bilan) */
  function mut(fn: (p: ChPage) => void, merge = '', quiet = false): void { commit(merge); fn(P()); dirty(); renderCanvas(); if (!quiet) { renderRight(); renderLeft(); } }
  /** quiet — matn maydonlari: oʻng panel qayta chizilmaydi (kursor va fokus saqlanadi) */
  const upd = (id: string, f: (e: ChEl) => void, merge = '', quiet = false) => mut(p => { const e = p.els.find(x => x.id === id); if (e) { f(e); fixSize(e); } }, merge || id, quiet);
  /** maket holatini oʻzgartirish (oila, format, material, hudud…) — qayta joylash bilan */
  function autoMut(fn: () => void, merge = ''): void { commit(merge); fn(); relayout(); dirty(); renderAll(); }

  /* ---------- matn oʻlchami (shrift metrikasi) ---------- */
  const cv = document.createElement('canvas').getContext('2d')!;
  function fixSize(e: ChEl): void {
    if (e.t === 'text') {
      const st = e.style, size = (st.size ?? 11) * PT;
      cv.font = `${st.italic ? 'italic ' : ''}${st.bold ? 700 : 400} 100px "${st.font ?? 'Archivo'}", Archivo, sans-serif`;
      const w = Math.max(...(e.text ?? '').split('\n').map(t => cv.measureText(tr(t) || ' ').width)) / 100 * size;
      if (!e.w || st.align !== 'start' || e.w < w) e.w = Math.max(e.w && st.align !== 'start' ? e.w : 0, w + 0.5);
      e.h = textHeight(e);
    }
    if (e.t === 'legend') { e.h = legendHeight(e, P()); e.w = Math.max(e.w ?? 60, 40); }
    if (e.t === 'table') { const size = (e.style.size ?? 8) * PT; e.h = (e.rows?.length ?? 1) * size * 1.9; }
  }

  /* ---------- tanlov ro'yxati (brauzer select o'rniga) ---------- */
  function pick<T extends string>(id: string, items: { value: T; label: string }[], cur: T, on: (v: T) => void, label = ''): HTMLButtonElement {
    const curL = items.find(i => i.value === cur)?.label ?? '—';
    const b = h('button', { class: 'btn btn-sm ch-pick', id, type: 'button', 'aria-haspopup': 'menu', 'aria-label': label || curL, onclick: (ev: Event) => {
      ev.stopPropagation(); wrap.querySelector('.ch-menu')?.remove();
      const m = h('div', { class: 'menu ch-menu', role: 'menu' }, ...items.map(it => h('button', { class: 'mi', role: 'menuitemradio', 'aria-checked': it.value === cur, onclick: () => { m.remove(); on(it.value); } }, h('span', {}, it.label), h('span', { class: 'd' }, it.value === cur ? '✓' : ''))));
      m.addEventListener('click', e => e.stopPropagation()); wrap.append(m);
      const r = b.getBoundingClientRect(); m.style.left = `${Math.max(8, Math.min(r.left, innerWidth - m.offsetWidth - 8))}px`; m.style.top = `${r.bottom + m.offsetHeight + 8 > innerHeight ? Math.max(8, r.top - m.offsetHeight - 6) : r.bottom + 6}px`;
      setTimeout(() => document.addEventListener('click', () => m.remove(), { once: true }), 0);
    } }, h('span', { class: 'pk' }, curL), svgIcon(I.chev)) as HTMLButtonElement;
    return b;
  }

  /* ---------- qobiq ---------- */
  const wrap = h('div', { class: 'gx ch', role: 'dialog', 'aria-label': tr('Chizmadon') });
  const head = h('header', { class: 'sh-top glassbar ch-top' });
  const body = h('div', { class: 'ch-body' });
  const startEl = h('div', { class: 'ch-start', hidden: true });
  wrap.append(head, body, startEl);
  document.body.append(wrap);

  const saveChip = h('span', { class: 'chip ok', id: 'chSave' });
  const syncSave = () => { saveChip.className = `chip ${saved ? 'ok' : 'warn'}`; saveChip.replaceChildren(h('i'), tr(saved ? 'Saqlandi' : 'Saqlanmoqda…')); };
  const famBtn = h('button', { class: 'btn ch-fam', id: 'chFam', 'aria-haspopup': 'menu', onclick: (e: Event) => { e.stopPropagation(); famMenu(famBtn); } });
  const fmtSeg = h('div', { class: 'seg hide-s', id: 'chFmt', role: 'group', 'aria-label': tr('Format') });
  const viewSeg = h('div', { class: 'seg', id: 'chView', role: 'group', 'aria-label': tr('Koʻrinish') });
  const slotsBtn = h('button', { class: 'btn btn-ghost icon-btn tog', id: 'chSlots', title: tr('Kataklar'), 'aria-label': tr('Kataklarni koʻrsatish'), onclick: () => autoMut(() => { d.auto.slots = !d.auto.slots; }) }, svgIcon(I.slots));
  const tabBtn = h('button', { class: 'btn btn-ghost icon-btn', id: 'chTab', title: tr('Panellarni yashirish · Tab'), 'aria-label': tr('Panellarni yashirish'), onclick: () => togglePanels() }, svgIcon(I.panel));
  const dlBtn = h('button', { class: 'btn btn-primary', id: 'chDl', onclick: (e: Event) => { e.stopPropagation(); exportMenu(dlBtn); } }, ...icl(I.dl, tr('Yuklab olish')));
  head.append(
    // 18-band: koʻrinadigan matnli tugma — «← Master reja» (avval faqat belgi edi, sezilmasdi)
    h('button', { class: 'btn btn-sm mr-back', id: 'chBack', title: tr('Master rejaga qaytish'), onclick: close }, svgIcon('<path d="M15 6l-6 6 6 6"/>'), h('span', {}, tr('Master reja'))),
    h('span', { class: 'brand' }, logoSvg(18), h('b', {}, 'Archemistry Lab')), h('span', { class: 'svcbadge ch-badge' }, h('i'), tr('Chizmadon')),
    h('span', { class: 'sh-name' }, (() => { const i = h('input', { class: 'ch-title', id: 'chTitle', value: d.title, 'aria-label': tr('Albom nomi'), maxlength: 120 }) as HTMLInputElement; i.addEventListener('change', () => { d.title = i.value.trim() || d.title; dirty(); }); return i; })()),
    saveChip, h('span', { class: 'spacer' }), famBtn, fmtSeg, viewSeg, slotsBtn, tabBtn, dlBtn);
  function syncHead(): void {
    const f = fam(), fk = fmtOf(f);
    famBtn.replaceChildren(svgIcon(I.tpl), h('span', { class: 'fn' }, tr(f.name)), svgIcon(I.chev));
    fmtSeg.replaceChildren(...f.formats.map(k => h('button', { 'data-fmt': k, 'aria-pressed': k === fk, onclick: () => autoMut(() => { d.auto.fmt[f.id] = k; }) }, tr(fmtName(k)))));
    viewSeg.replaceChildren(...([['one', I.one, 'Bitta varaq'], ['all', I.all, 'Hamma varaqlar']] as const).map(([k, ic, n]) => h('button', { 'data-view': k, 'aria-pressed': d.auto.view === k, title: tr(n), 'aria-label': tr(n), onclick: () => { d.auto.view = k; dirty(); zoom = 0; renderAll(); } }, svgIcon(ic))));
    slotsBtn.setAttribute('aria-pressed', String(d.auto.slots));
  }
  function famMenu(anchor: HTMLElement): void {
    wrap.querySelector('.ch-menu')?.remove();
    const m = h('div', { class: 'menu ch-menu', role: 'menu', id: 'chFamMenu' }, h('div', { class: 'mh' }, tr('Maket')),
      ...LAYOUTS.families.map(x => h('button', { class: 'mi', 'data-fam': x.id, role: 'menuitemradio', 'aria-checked': x.id === d.auto.fam, onclick: () => { m.remove(); setFam(x.id); } }, h('span', {}, tr(x.name), h('small', {}, tf('${n} varaq turi', { n: x.pages.length }))), h('span', { class: 'd' }, x.id === d.auto.fam ? '✓' : ''))));
    m.addEventListener('click', e => e.stopPropagation()); wrap.append(m);
    const r = anchor.getBoundingClientRect(); m.style.left = `${Math.max(8, Math.min(r.left, innerWidth - m.offsetWidth - 8))}px`; m.style.top = `${r.bottom + 6}px`;
    setTimeout(() => document.addEventListener('click', () => m.remove(), { once: true }), 0);
  }
  function setFam(id: string): void {
    autoMut(() => { d.auto.fam = id; d.auto.force = {}; d.auto.ov = []; const f = familyById(id); if (f.pal) d.auto.pal = f.pal; else if (d.auto.pal === 'moviy') d.auto.pal = 'arch'; d.cur = 0; });
  }

  /* ---------- panellar va sahna ---------- */
  const left = h('aside', { class: 'ch-panel ch-left' });
  const right = h('aside', { class: 'ch-panel ch-right' });
  const stripL = h('nav', { class: 'ch-strip ch-strip-l', 'aria-label': tr('Chap panel') });
  const stripR = h('nav', { class: 'ch-strip ch-strip-r', 'aria-label': tr('Oʻng panel') });
  const vwrap = h('div', { class: 'ch-vwrap' });
  const banner = h('div', { class: 'ch-banner', hidden: true, role: 'status' });
  const view = h('div', { class: 'ch-view', tabindex: '0' });
  const allView = h('div', { class: 'ch-allv', id: 'chAll' });
  const stage = h('div', { class: 'ch-stage' });
  const pageHost = h('div', { class: 'ch-page' });
  const grayHost = h('div', { class: 'ch-gray', hidden: true });
  const ovNS = 'http://www.w3.org/2000/svg';
  const over = document.createElementNS(ovNS, 'svg') as SVGSVGElement; over.classList.add('ch-over');
  /** Chizmadon tahlili (25.10, 2-bosqich): maket katagi ustidagi panel (almashtirish, oʻchirish) va boʻsh kataklardagi «+» */
  const slotUi = h('div', { class: 'ch-slotui', id: 'chSlotUi' });
  slotUi.addEventListener('pointerdown', e => e.stopPropagation());
  stage.append(pageHost, grayHost, over, slotUi); view.append(stage);
  const zoomBox = h('div', { class: 'ch-zoom glassbar' });
  const pnav = h('div', { class: 'ch-pnav glassbar', id: 'chPnav' });
  const tools = h('div', { class: 'ch-tools glassbar', role: 'toolbar', 'aria-label': tr('Asboblar') });
  const hint = h('div', { class: 'ch-hint', hidden: true });
  const fileIn = h('input', { type: 'file', accept: 'image/*', hidden: true }) as HTMLInputElement;
  const jsonIn = h('input', { type: 'file', accept: '.json,application/json', hidden: true }) as HTMLInputElement;

  function renderAll(): void {
    syncSave(); syncHead();
    if (d.auto.view === 'all') { vwrap.replaceChildren(banner, allView); renderAllView(); }
    else vwrap.replaceChildren(banner, view, zoomBox, pnav, tools, hint);
    body.replaceChildren(vwrap, stripL, stripR, left, right, fileIn, jsonIn);
    renderBanner(); syncPanels(); renderLeft(); renderRight();
    if (d.auto.view === 'one') { renderTools(); renderPnav(); renderCanvas(); requestAnimationFrame(() => { if (!zoom) fit(); else applyView(); renderTools(); }); }
    renderStart();
  }
  function renderBanner(): void {
    const left0 = LAST?.PG.left ?? [];
    banner.hidden = !left0.length;
    banner.replaceChildren(svgIcon(I.warn), h('span', {}, `${tr('Joy topilmadi')}: `, h('b', {}, left0.map(m => tr(m.name)).join(', ')), `. ${tr('Boshqa maket tanlang yoki materialni boshqa katakka sudrang.')}`));
  }
  function renderPnav(): void {
    const n = allPages().length;
    pnav.replaceChildren(
      h('button', { class: 'btn btn-ghost icon-btn btn-sm', 'aria-label': tr('Oldingi varaq'), disabled: d.cur <= 0, onclick: () => goPage(d.cur - 1) }, svgIcon(I.left)),
      h('span', { class: 'num t-small', id: 'chPageNo' }, `${d.cur + 1} / ${n}`),
      h('button', { class: 'btn btn-ghost icon-btn btn-sm', 'aria-label': tr('Keyingi varaq'), disabled: d.cur >= n - 1, onclick: () => goPage(d.cur + 1) }, svgIcon(I.right)));
  }
  function goPage(i: number): void {
    const n = allPages().length; if (!n) return; i = Math.max(0, Math.min(n - 1, i));
    if (i !== d.cur) { writeBack(); d.cur = i; sel.clear(); zoom = 0; dirty(); }
    if (d.auto.view === 'all') d.auto.view = 'one';
    renderAll();
  }

  /* ---------- panellar: ochiq / yigʻiq / suzuvchi ---------- */
  const lOpen = () => (d.ui.left || d.ui.lockL) && !phone(), rOpen = () => (d.ui.right || d.ui.lockR) && !phone();
  function syncPanels(): void {
    // panel ochilib-yopilganda varaq ekranda joyida qolsin (koʻrinish chap cheti siljisa — pan bilan qoplaymiz):
    // avval material tanlanganda oʻng panel ochilib, chap panel yigʻilardi va varaq sakrardi — ikki marta bosish adashardi
    const x0 = view.isConnected && d.auto.view === 'one' && zoom ? view.getBoundingClientRect().left : null;
    wrap.classList.toggle('l-open', lOpen()); wrap.classList.toggle('r-open', rOpen());
    left.hidden = !(lOpen() || float === 'left'); right.hidden = !(rOpen() || float === 'right');
    left.classList.toggle('float', !lOpen() && float === 'left'); right.classList.toggle('float', !rOpen() && float === 'right');
    stripL.hidden = lOpen(); stripR.hidden = rOpen();
    stripL.replaceChildren(h('button', { class: 'rb', 'data-open': 'L', title: tr('Panelni ochish'), 'aria-label': tr('Panelni ochish'), onclick: (e: Event) => { e.stopPropagation(); openSide('left'); } }, svgIcon(I.right)), h('hr'),
      ...SECS.map(([k, n, ic]) => h('button', { class: 'rb', 'data-strip': k, title: tr(n), 'aria-label': tr(n), 'aria-pressed': float === 'left' && d.auto.sec[k], onclick: (e: Event) => { e.stopPropagation(); for (const [s] of SECS) d.auto.sec[s] = s === k; openSide('left'); } }, svgIcon(ic))));
    const warn = isAuto() ? 0 : pageChecks(P(), tr).filter(c => !c.ok).length;
    stripR.replaceChildren(h('button', { class: 'rb', 'data-open': 'R', title: tr('Panelni ochish'), 'aria-label': tr('Panelni ochish'), onclick: (e: Event) => { e.stopPropagation(); openSide('right'); } }, svgIcon(I.left)), h('hr'),
      ...([['element', I.el, 'Element'], ['tekshiruv', I.tpl, 'Varaq']] as const).map(([k, ic, n]) =>
        h('button', { class: 'rb', 'data-strip': k, title: tr(n), 'aria-label': tr(n), 'aria-pressed': float === 'right' && d.ui.rightTab === k, onclick: (e: Event) => { e.stopPropagation(); d.ui.rightTab = k; openSide('right'); } }, svgIcon(ic), k === 'tekshiruv' && warn ? h('em', { class: 'ch-dot' }, String(warn)) : '')));
    if (x0 != null) { const dx = view.getBoundingClientRect().left - x0; if (Math.abs(dx) > 0.5) { panX -= dx; applyView(); renderOverlay(); } }
  }
  /** Panelni ochish: keng ekranda — joyida (tor ekranda ikkinchisi yigʻiladi), < 900 px — varaq ustida suzadi */
  function openSide(side: 'left' | 'right'): void {
    if (phone()) float = side;
    else { if (side === 'left') d.ui.left = true; else d.ui.right = true; if (tablet()) { if (side === 'left') d.ui.right = false; else d.ui.left = false; } float = null; }
    syncPanels(); renderLeft(); renderRight(); requestAnimationFrame(() => { applyView(); renderTools(); });
  }
  function collapse(side: 'left' | 'right'): void {
    if (side === 'left') d.ui.left = false; else d.ui.right = false;
    float = null; dirty(); syncPanels(); renderLeft(); renderRight(); requestAnimationFrame(() => { applyView(); renderTools(); });
  }
  function togglePanels(): void {
    const any = d.ui.left || d.ui.right; d.ui.left = !any; d.ui.right = !any && !tablet(); float = null; dirty(); syncPanels(); renderLeft(); renderRight(); requestAnimationFrame(() => { fit(); renderTools(); });
  }
  const panelHead = (side: 'left' | 'right', title: HTMLElement) => h('div', { class: 'ch-ph' }, title,
    phone() ? '' : h('button', { class: 'btn btn-ghost icon-btn ch-lock', title: tr('Qulf — doim ochiq'), 'aria-label': tr('Qulf — doim ochiq'), 'aria-pressed': side === 'left' ? d.ui.lockL : d.ui.lockR, onclick: () => { if (side === 'left') d.ui.lockL = !d.ui.lockL; else d.ui.lockR = !d.ui.lockR; float = null; dirty(); syncPanels(); renderLeft(); renderRight(); } }, svgIcon((side === 'left' ? d.ui.lockL : d.ui.lockR) ? I.lock : I.unlock)),
    h('button', { class: 'btn btn-ghost icon-btn', 'data-collapse': side, title: tr('Panelni yigʻish'), 'aria-label': tr('Panelni yigʻish'), onclick: () => { if (float === side) { float = null; syncPanels(); } else collapse(side); } }, svgIcon(side === 'left' ? I.left : I.right)));

  /* ---------- chap panel: akkordeon ---------- */
  function renderLeft(): void {
    if (left.hidden) return;
    const sc = h('div', { class: 'ch-scroll ch-acc', id: 'chLeft' });
    const placed = MATS.filter(m => m.role !== 'title' && PLACE[m.id]).length, total = MATS.filter(m => m.role !== 'title').length;
    const counts: Record<SecId, string> = { loyiha: `${placed}/${total}`, varaq: String(allPages().length), qatlam: String(P().els.length), uslub: '', kutubxona: '', hudud: R ? (R.inside ? 'UZ' : R.country ? tr('dunyo') : '—') : '' };
    for (const [k, n, ic] of SECS) {
      const open = !!d.auto.sec[k];
      const sec = h('section', { class: `ch-sec${open ? ' open' : ''}`, 'data-sec': k },
        h('button', { class: 'ch-sh', 'aria-expanded': open, onclick: () => { d.auto.sec[k] = !open; dirty(); renderLeft(); } }, svgIcon(ic), h('span', {}, tr(n)), counts[k] ? h('em', {}, counts[k]) : '', svgIcon(I.chev)));
      if (open) sec.append(h('div', { class: 'ch-sb' }, ...secBody(k)));
      sc.append(sec);
    }
    left.replaceChildren(panelHead('left', h('b', { class: 'ch-pt' }, tr('Albom'))), sc);
  }
  function secBody(k: SecId): (HTMLElement | string)[] {
    if (k === 'loyiha') return matsSec();
    if (k === 'varaq') return pagesSec();
    if (k === 'qatlam') return layersSec();
    if (k === 'uslub') return styleSec();
    if (k === 'kutubxona') return libSec();
    return placeSec();
  }
  function matsSec(): (HTMLElement | string)[] {
    // 5-bosqich (25.10): bitta binoning kvartirografiya materiallari (reja, vaziyat sxemasi, eksplikatsiya) — bitta guruh
    const all = MATS.filter(m => m.role !== 'title'), grpOf = (id: string) => /^p:apt(?:nav|x)?:(.+)$/.exec(id)?.[1] ?? null;
    const rows: HTMLElement[] = [], seen = new Set<string>();
    for (const m of all) {
      const g = grpOf(m.id);
      if (!g) { rows.push(matRow(m)); continue; }
      if (seen.has(g)) continue; seen.add(g);
      const mem = all.filter(x => grpOf(x.id) === g), head = mem.find(x => x.id === `p:apt:${g}`) ?? mem[0], on = mem.some(x => x.visible), open = openGrp.has(g) || mem.some(x => x.id === matSel);
      const p = PLACE[head.id];
      rows.push(h('div', { class: `li ch-mat ch-grp${on ? '' : ' off'}`, 'data-grp': g, 'aria-expanded': String(open), onclick: (e: Event) => { if ((e.target as Element).closest('.sw')) return; if (openGrp.has(g)) openGrp.delete(g); else openGrp.add(g); renderLeft(); } },
        h('span', { class: 'ch-grip' }, svgIcon(open ? I.down : I.right)), h('span', { class: 'k' }, tr(head.name), h('span', { class: 'sub' }, !on ? tr('oʻchiq') : `${p ? tf('${n}-varaqda', { n: p.pi + 1 }) : tr('joy topilmadi')} · ${tf('${n} ta material', { n: mem.length })}`)),
        sw({ label: tr(head.name), on, 'data-vis': `grp:${g}`, onchange: v => autoMut(() => { mem.forEach(x => { matSet(x.id).visible = v; }); d.auto.force = {}; }) })));
      if (open) mem.forEach(x => { const r = matRow(x); r.classList.add('ch-sub'); rows.push(r); });
    }
    const list = h('div', { class: 'group', id: 'chMats' }, ...rows);
    function matRow(m: Material): HTMLElement {
      const p = PLACE[m.id];
      const row = h('div', { class: `li ch-mat${matSel === m.id ? ' sel' : ''}${m.visible ? '' : ' off'}`, draggable: 'true', 'data-mat': m.id, onclick: (e: Event) => { if ((e.target as Element).closest('button')) return; selectMat(m.id); } },
        h('span', { class: 'ch-grip' }, svgIcon(I.drag)), h('span', { class: 'k' }, tr(m.name), h('span', { class: 'sub' }, !m.visible ? tr('oʻchiq') : p ? tf('${n}-varaqda', { n: p.pi + 1 }) : tr('joy topilmadi'))),
        sw({ label: tr(m.name), on: m.visible, 'data-vis': m.id, onchange: v => autoMut(() => { matSet(m.id).visible = v; d.auto.force = {}; }) }));
      row.addEventListener('dragstart', ev => { DRAG = m.id; ev.dataTransfer?.setData('text/plain', m.id); if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move'; view.classList.add('dropping'); });
      row.addEventListener('dragend', () => { DRAG = null; view.classList.remove('dropping'); dropHint = null; renderOverlay(); });
      return row;
    }
    return [list, h('span', { class: 't-small' }, tr('Loyihada tayyor material. Varaqdagi katakka sudrang — joy almashadi. Ustiga chizilgan belgilar u bilan birga koʻchadi.')),
      h('button', { class: 'btn btn-sm', id: 'chRestart', onclick: () => { d.auto.started = false; renderStart(); } }, ...icl(I.imp, tr('Kirish oynasi')))];
  }
  const thumbOf = (i: number): string => {
    const p = allPages()[i]; if (!p) return '';
    const { svg } = pageSvg(withToc(p), { tr, idp: `t${i}`, ...(isAuto(i) ? { bg: BG[i].replace(/\bid="([^"]+)"/g, `id="t${i}$1"`).replace(/url\(#([^)]+)\)/g, `url(#t${i}$1)`) } : albumDeco(i)) });
    return svg.replace(/ width="[\d.]+mm" height="[\d.]+mm"/, '').replace(/ data-(el|k|id|layer|bg)="[^"]*"/g, '');
  };
  function pagesSec(): (HTMLElement | string)[] {
    const grid = h('div', { class: 'ch-pgrid', id: 'chPages' }, ...allPages().map((p, i) => h('button', { class: `ch-pg${i === d.cur ? ' cur' : ''}`, 'data-page': i, 'aria-label': `${i + 1}. ${tr(p.name)}`, title: tr(p.name), onclick: () => goPage(i) },
      h('span', { class: 'ch-thumb', html: thumbOf(i) }), h('span', { class: 'n' }, String(i + 1)), p.els.length && isAuto(i) ? h('em', { title: tr('Qoʻlda chizilgan') }, svgIcon(I.pen)) : '')));
    const fi = d.cur - nAuto, free = !isAuto();
    return [grid,
      free ? h('div', { class: 'row2', id: 'chFreeActs' },
        h('button', { class: 'btn btn-sm icon-btn', title: tr('Yuqoriga'), 'aria-label': tr('Yuqoriga'), disabled: fi <= 0, onclick: () => movePage(fi, -1) }, svgIcon(I.up)),
        h('button', { class: 'btn btn-sm icon-btn', title: tr('Pastga'), 'aria-label': tr('Pastga'), disabled: fi >= d.pages.length - 1, onclick: () => movePage(fi, 1) }, svgIcon(I.down)),
        h('button', { class: 'btn btn-sm icon-btn', title: tr('Nusxa'), 'aria-label': tr('Nusxa'), onclick: () => dupPage(fi) }, svgIcon(I.copy)),
        h('button', { class: 'btn btn-sm icon-btn danger', title: tr('Oʻchirish'), 'aria-label': tr('Oʻchirish'), onclick: () => delPage(fi) }, svgIcon(I.trash))) : '',
      h('div', { class: 'row2' },
        h('button', { class: 'btn btn-sm', id: 'chAddPage', onclick: () => addPage(blankPage(`${tr('Varaq')} ${allPages().length + 1}`, 'A3', true)) }, ...icl(IC.plus, tr('Boʻsh varaq'))),
        h('button', { class: 'btn btn-sm', id: 'chAddTpl', onclick: (e: Event) => { e.stopPropagation(); tplMenu(e.currentTarget as HTMLElement); } }, ...icl(IC.plus, tr('Namuna')))),
      h('span', { class: 't-small' }, tr('Maket varaqlari loyihadan avtomatik tuziladi; boʻsh varaq va namunalar albom oxiriga qoʻshiladi.')),
      LEG && (LEG.doc || LEG.mats.length) ? h('div', { class: 'note', id: 'chLegacy' },
        h('b', {}, tr('Eski Albomdan')), ' ', tf('${p} varaq, ${m} material — Chizmadonga oʻtkazish mumkin.', { p: LEG.doc ? LEG.doc.pages.length : 0, m: LEG.mats.length }), ' ',
        h('button', { class: 'btn btn-sm', id: 'chLegacyGo', onclick: () => void takeLegacy() }, tr('Oʻtkazish'))) : ''];
  }
  /** Eski Albom (maket.html): varaqlar — erkin varaq, yuborilgan materiallar — «Loyihadan» */
  let LEG: Awaited<ReturnType<typeof legacyPending>> | null = null;
  async function takeLegacy(): Promise<void> {
    const L = LEG; if (!L) return;
    commit();
    const conv = L.doc ? convertMaketDoc(L.doc) : { pages: [], skipped: 0, name: '' };
    d.pages.push(...conv.pages);
    for (const m of L.mats) { const it = matToInbox(m); if (!it) continue; const x: ChInbox = { ...it, id: cid('i'), at: new Date().toISOString() }; d.inbox.push(x); d.auto.mats[`i:${x.id}`] = { visible: false }; }
    if (d.inbox.length > 30) d.inbox.splice(0, d.inbox.length - 30);
    await legacyTaken(L.doc, L.mats); LEG = null;
    if (conv.pages.length) { d.cur = nAuto + d.pages.length - conv.pages.length; if (d.auto.view === 'all') d.auto.view = 'one'; }
    sel.clear(); dirty(); relayout(false); renderAll();
    toast(tf('Oʻtkazildi: ${p} varaq, ${m} material', { p: conv.pages.length, m: L.mats.length }) + (conv.skipped ? ' · ' + tf('${n} ta element tanilmadi', { n: conv.skipped }) : ''));
  }
  function tplMenu(anchor: HTMLElement): void {
    wrap.querySelector('.ch-menu')?.remove();
    const ctx0 = tplCtx();
    // namunalar — maket oilalarining varaq turlari (layouts.ts); varaq oilaning birinchi formatida, erkin varaq boʻlib qoʻshiladi
    const m = h('div', { class: 'menu ch-menu ch-tplmenu', role: 'menu', id: 'chTplMenu' }, ...LAYOUTS.families.flatMap(f => [h('div', { class: 'mh' }, tr(f.name)),
      ...f.pages.map(pg => h('button', { class: 'mi', 'data-tpl': pg.id, 'data-fam': f.id, title: tr(pg.desc), onclick: () => { m.remove(); const p = buildLayoutPage(f.id, pg.id, f.formats[0], ctx0); p.name = tr(pg.title); addPage(p); toast(tf('«${n}» qoʻshildi', { n: tr(pg.title) })); } }, h('span', {}, tr(pg.title)), h('span', { class: 'd' }, tr(LAYOUTS.formats[f.formats[0]].name))))]));
    m.addEventListener('click', e => e.stopPropagation()); wrap.append(m);
    const r = anchor.getBoundingClientRect(); m.style.left = `${Math.min(r.left, innerWidth - m.offsetWidth - 8)}px`; m.style.top = `${Math.max(8, Math.min(r.bottom + 6, innerHeight - m.offsetHeight - 8))}px`;
    setTimeout(() => document.addEventListener('click', () => m.remove(), { once: true }), 0);
  }
  function layersSec(): (HTMLElement | string)[] {
    const p = P(), act = L();
    const rows = [...p.layers].reverse().map(l => {
      const i = p.layers.indexOf(l), n = p.els.filter(e => e.layer === l.id).length;
      const name = h('span', { class: 'k' }, l.name, h('span', { class: 'sub' }, `${n} ${tr('element')}`));
      name.addEventListener('dblclick', () => { const inp = h('input', { class: 'input', value: l.name }) as HTMLInputElement; name.replaceWith(inp); inp.focus(); inp.select(); const ok = () => mut(pp => { pp.layers[i].name = inp.value.trim() || l.name; }); inp.addEventListener('change', ok); inp.addEventListener('blur', () => renderLeft()); });
      return h('div', { class: 'li ch-layer', 'data-layer': l.id, 'aria-selected': act.id === l.id, onclick: () => { opt.activeLayer = l.id; renderLeft(); } },
        h('button', { class: 'btn btn-ghost icon-btn btn-sm', title: tr(l.visible ? 'Yashirish' : 'Koʻrsatish'), 'aria-label': tr(l.visible ? 'Yashirish' : 'Koʻrsatish'), 'data-lvis': l.id, onclick: (e: Event) => { e.stopPropagation(); mut(pp => { pp.layers[i].visible = !l.visible; }); } }, svgIcon(l.visible ? I.eye : I.eyeOff)),
        name,
        h('button', { class: 'btn btn-ghost icon-btn btn-sm', title: tr(l.locked ? 'Qulfdan chiqarish' : 'Qulflash'), 'aria-label': tr(l.locked ? 'Qulfdan chiqarish' : 'Qulflash'), 'data-lock': l.id, onclick: (e: Event) => { e.stopPropagation(); mut(pp => { pp.layers[i].locked = !l.locked; }); sel.clear(); } }, svgIcon(l.locked ? I.lock : I.unlock)),
        h('button', { class: 'btn btn-ghost icon-btn btn-sm', title: tr('Yuqoriga'), 'aria-label': tr('Yuqoriga'), disabled: i === p.layers.length - 1, onclick: (e: Event) => { e.stopPropagation(); mut(pp => { const [x] = pp.layers.splice(i, 1); pp.layers.splice(i + 1, 0, x); }); } }, svgIcon(I.up)),
        h('button', { class: 'btn btn-ghost icon-btn btn-sm', title: tr('Pastga'), 'aria-label': tr('Pastga'), disabled: i === 0, onclick: (e: Event) => { e.stopPropagation(); mut(pp => { const [x] = pp.layers.splice(i, 1); pp.layers.splice(i - 1, 0, x); }); } }, svgIcon(I.down)),
        h('button', { class: 'btn btn-ghost icon-btn btn-sm', title: tr('Oʻchirish'), 'aria-label': tr('Oʻchirish'), disabled: p.layers.length < 2, onclick: (e: Event) => { e.stopPropagation(); mut(pp => { const to = pp.layers[i === 0 ? 1 : i - 1].id; pp.els.forEach(x => { if (x.layer === l.id) x.layer = to; }); if (isAuto()) d.hand.forEach(x => { if (x.layer === l.id) x.layer = to; }); pp.layers.splice(i, 1); }); } }, svgIcon(I.trash)));
    });
    const elName = (id: string) => tr(MATS.find(m => m.id === id)?.name ?? 'element');
    const shapes = [...p.els].reverse().map(e => h('div', { class: `li ch-shape${sel.has(e.id) ? ' sel' : ''}`, 'data-hsel': e.id, onclick: (ev: Event) => { if ((ev.target as Element).closest('button')) return; if ((ev as MouseEvent).shiftKey) { if (sel.has(e.id)) sel.delete(e.id); else sel.add(e.id); } else sel = new Set([e.id]); matSel = null; setTool('select', false); d.ui.rightTab = 'element'; renderOverlay(); renderRight(); renderLeft(); } },
      h('span', { class: 'ch-swc', style: `background:${e.style.stroke && e.style.stroke !== 'none' ? e.style.stroke : e.style.fill ?? '#141414'}` }),
      h('span', { class: 'k' }, `${tr(e.name ?? TYPE_NAME[e.t])}${e.group ? ` · ${tr('guruh')}` : ''}`, h('span', { class: 'sub' }, isAuto() ? (e.a?.el ? `↳ ${elName(e.a.el)}` : tr('varaqqa bogʻlangan')) : tr(TYPE_NAME[e.t]))),
      h('button', { class: 'btn btn-ghost icon-btn btn-sm', 'data-hdel': e.id, title: tr('Oʻchirish'), 'aria-label': tr('Oʻchirish'), onclick: () => { mut(pp => { pp.els = pp.els.filter(x => x.id !== e.id); }); sel.delete(e.id); renderOverlay(); } }, svgIcon(I.trash))));
    const hid = isAuto() ? hiddenHand() : [];
    return [h('div', { class: 'glabel' }, h('span', {}, tr('Qatlamlar')), h('span', {}, tr('faol: ') + act.name)), h('div', { class: 'group', id: 'chLayers' }, ...rows),
      h('button', { class: 'btn btn-sm', id: 'chAddLayer', onclick: () => mut(pp => { const l = { id: cid('l'), name: `${tr('Qatlam')} ${pp.layers.length + 1}`, visible: true, locked: false }; pp.layers.push(l); opt.activeLayer = l.id; }) }, ...icl(IC.plus, tr('Qatlam'))),
      h('div', { class: 'glabel' }, h('span', {}, tr('Qoʻlda chizilgan')), h('span', {}, tf('${n} ta · ${p}-varaq', { n: p.els.length, p: d.cur + 1 }))),
      p.els.length ? h('div', { class: 'group', id: 'chShapes' }, ...shapes) : h('span', { class: 't-small' }, tr('Bu varaqda qoʻlda chizilgan shakl yoʻq.')),
      hid.length ? h('div', { class: 'li ch-hidden' }, h('span', { class: 'k' }, tf('${n} ta shakl yashirin', { n: hid.length }), h('span', { class: 'sub' }, tr('bogʻlangan materiali oʻchiq yoki joysiz'))), h('button', { class: 'btn btn-sm', id: 'chRescue', onclick: () => rescue() }, tr('Shu varaqqa'))) : '',
      isAuto() ? h('div', { class: 'li' }, h('span', { class: 'k' }, tr('Loyihadan (avto)'), h('span', { class: 'sub' }, tf('${n} ta material · katakka bogʻlangan', { n: LAST?.pages[d.cur]?.fill.assign.size ?? 0 })))) : '',
      h('span', { class: 't-small' }, tr('Ikki marta bosing — nomini oʻzgartirish. Yangi element faol qatlamga tushadi.'))];
  }
  function rescue(): void {
    if (!isAuto()) return; commit();
    const pr = pageRect(d.cur);
    for (const e of hiddenHand()) e.a = { el: null, pi: d.cur, r0: { ...pr } }; // geometriya oxirgi koʻrsatilgan joyida qoladi
    relayout(false); dirty(); renderAll(); toast(tr('Yashirin shakllar shu varaqqa koʻchirildi'));
  }
  function styleSec(): (HTMLElement | string)[] {
    const P0 = PAL[d.auto.pal] ?? PAL.arch;
    return [h('div', { class: 'glabel' }, h('span', {}, tr('Maket uslubi'))),
      h('div', { class: 'ch-chips', id: 'chSheetPal' }, ...Object.keys(PAL).map(k => h('button', { class: 'chip', 'data-spal': k, 'aria-pressed': d.auto.pal === k, onclick: () => autoMut(() => { d.auto.pal = k; }) }, h('i', { style: `background:${PAL[k].acc}` }), tr(PAL[k].name)))),
      h('div', { class: 'ch-paled', id: 'chPalEd' }, ...PKEYS.map(([key, n]) => h('button', { 'data-cpick': key, 'aria-label': tf('${n} rangini tanlash', { n: tr(n) }), onclick: (e: Event) => {
        const was = JSON.stringify(d.auto.custom), wasPal = d.auto.pal;
        openColor(e.currentTarget as HTMLElement, P0[key], { title: `${tr('Uslub')} · ${tr(n)}`, swatches: [P0.acc, P0.acc2, P0.acc3, P0.acc4, P0.green2, P0.ink],
          onChange: hx => { if (!d.auto.custom || d.auto.pal !== 'custom') d.auto.custom = { base: d.auto.pal === 'custom' ? d.auto.custom?.base ?? 'arch' : d.auto.pal, over: d.auto.pal === 'custom' && d.auto.custom ? d.auto.custom.over : {} }; d.auto.custom.over[key] = hx; d.auto.pal = 'custom'; relayout(); renderCanvas(); },
          onDone: () => { hist.push(JSON.stringify({ ...JSON.parse(snap()), auto: { ...d.auto, custom: JSON.parse(was), pal: wasPal } })); dirty(); renderAll(); },
          onCancel: () => { d.auto.custom = JSON.parse(was); d.auto.pal = wasPal; relayout(); renderAll(); } });
      } }, h('i', { style: `background:${P0[key]}` }), tr(n)))),
      h('span', { class: 't-small' }, tr('Rangni bosing — tanlash uskunasi ochiladi. Oʻzgarish «Mening uslubim» boʻlib saqlanadi.')),
      d.auto.custom ? h('button', { class: 'btn btn-sm', id: 'chCusReset', onclick: () => autoMut(() => { d.auto.custom = null; if (d.auto.pal === 'custom') d.auto.pal = 'arch'; }) }, tr('Mening uslubimni oʻchirish')) : '',
      h('div', { class: 'glabel' }, h('span', {}, tr('Kartografik palitralar')), h('span', {}, String(PALETTES.length))),
      h('div', { class: 'group', id: 'chPal' }, ...PALETTES.map(pl => h('button', { class: 'li', 'data-pal': pl.id, 'aria-pressed': d.palette === pl.id, onclick: () => { d.palette = pl.id; dirty(); renderLeft(); renderRight(); } },
        h('span', { class: 'k' }, tr(pl.name)), h('span', { class: 'ch-swatches' }, ...pl.colors.map(c => h('i', { style: `background:${c}` })))))),
      h('button', { class: 'btn btn-sm', id: 'chPalSeq', disabled: sel.size < 1, onclick: () => paletteSeq() }, tr('Tanlanganlarga palitrani ketma-ket berish')),
      h('div', { class: 'glabel' }, h('span', {}, tr('Erkin varaqlar: shtamp va raqamlash'))),
      h('div', { class: 'group' },
        field('Shtamp', sw({ id: 'chStamp', label: tr('Shtamp'), on: d.album.stamp, onchange: v => { d.album.stamp = v; dirty(); renderCanvas(); } })),
        field('Varaq raqami', sw({ id: 'chNum', label: tr('Varaq raqami'), on: d.album.numbering, onchange: v => { d.album.numbering = v; dirty(); renderCanvas(); } })),
        field('Mundarija avtomatik', sw({ id: 'chToc', label: tr('Mundarija avtomatik'), on: d.album.toc, onchange: v => { d.album.toc = v; dirty(); renderCanvas(); } })),
        field('Muallif', (() => { const i = h('input', { class: 'input', id: 'chAuthor', value: d.album.author, placeholder: tr('Ism Familiya') }) as HTMLInputElement; i.addEventListener('change', () => { d.album.author = i.value.trim(); dirty(); renderCanvas(); }); return i; })()))];
  }
  function libSec(): (HTMLElement | string)[] {
    const sub = h('div', { class: 'seg sm', role: 'tablist', id: 'chLib' }, ...([['belgi', 'Belgilar'], ['daraxt', 'Qator'], ['yol', 'Yoʻllar'], ['rang', 'Zonalar']] as const).map(([k, n]) => h('button', { role: 'tab', 'data-lib': k, 'aria-pressed': d.ui.libTab === k, onclick: () => { d.ui.libTab = k; renderLeft(); } }, tr(n))));
    const out: HTMLElement[] = [sub];
    const one = selected().length === 1 ? selected()[0] : null;
    if (d.ui.libTab === 'belgi') {
      out.push(seg(LOOKS.map(l => ({ id: l.id, label: tr(l.name) })), opt.look ?? 'doira', v => { opt.look = v; if (one?.t === 'icon') upd(one.id, e => { e.look = v; }); renderLeft(); }, { id: 'chLook', class: 'seg sm' }));
      for (const g of ICON_GROUPS) out.push(h('div', { class: 'glabel' }, h('span', {}, tr(g.name)), h('span', {}, String(g.icons.length))),
        h('div', { class: 'ch-icons' }, ...g.icons.map(ic => h('button', { class: 'ch-ic', 'data-icon': ic.id, title: tr(ic.name), 'aria-label': tr(ic.name), 'aria-pressed': opt.icon === ic.id, onclick: () => { opt.icon = ic.id; if (one?.t === 'icon') upd(one.id, e => { e.icon = ic.id; e.name = ic.name; if (ic.risk) e.style.risk = true; }); else setTool('icon'); renderLeft(); } }, svgIcon(`<path d="${ic.d}"/>`)))));
    } else if (d.ui.libTab === 'daraxt') {
      out.push(h('div', { class: 'glabel' }, h('span', {}, tr('Qator'))),
        seg([{ id: 'tree', label: tr('Daraxtlar') }, { id: 'people', label: tr('Odamlar') }, { id: 'dot', label: tr('Nuqtalar') }, { id: 'icon', label: tr('Belgi') }], opt.rowKind, v => { opt.rowKind = v; if (one?.t === 'row') upd(one.id, e => { e.row = { ...e.row!, kind: v }; }); setTool('row'); renderLeft(); }, { id: 'chRowKind' }),
        h('span', { class: 't-small' }, tr('Qator asbobi: chiziq boʻylab teng oraliqda daraxt, odam, nuqta yoki belgi. Oraliq va oʻlcham — oʻng panelda.')));
    } else if (d.ui.libTab === 'yol') {
      out.push(h('div', { class: 'glabel' }, h('span', {}, tr('Harakatlanish ierarxiyasi')), h('span', {}, String(MOBILITY.length))),
        h('div', { class: 'group', id: 'chMob' }, ...MOBILITY.map(m => h('button', { class: 'li', 'data-mob': m.id, 'aria-pressed': opt.mob === m.id, onclick: () => { opt.mob = m.id; if (one && (one.t === 'line' || one.t === 'arrow' || one.t === 'pen')) upd(one.id, e => { e.style = { ...e.style, ...m.style }; e.name = m.name; e.preset = m.id; }); else setTool('line'); renderLeft(); } },
          h('span', { class: 'ch-sw', html: `<svg viewBox="0 0 40 10" width="44" height="12">${lineSample(m.style)}</svg>` }), h('span', { class: 'k' }, tr(m.name))))),
        h('div', { class: 'glabel' }, h('span', {}, tr('Yoʻnalish oʻqi')), h('span', {}, String(FLOWS.length))),
        h('div', { class: 'group' }, ...FLOWS.map(f => h('button', { class: 'li', 'data-flowlib': f.id, onclick: () => { opt.flow = f.id; setTool('flow'); } }, h('span', { class: 'ch-sw', html: `<svg viewBox="0 0 40 10" width="44" height="12">${flowSample(f.style)}</svg>` }), h('span', { class: 'k' }, tr(f.name))))),
        h('div', { class: 'glabel' }, h('span', {}, tr('Chiziq turlari')), h('span', {}, String(DASHES.length))),
        h('div', { class: 'group' }, ...DASHES.map(x => h('button', { class: 'li', 'data-dash': x.id, onclick: () => { if (one) upd(one.id, e => { e.style.dash = x.id; }); } }, h('span', { class: 'ch-sw', html: `<svg viewBox="0 0 40 10" width="44" height="12">${lineSample({ stroke: '#141414', width: 0.8, dash: x.id })}</svg>` }), h('span', { class: 'k' }, tr(x.name))))));
    } else {
      out.push(h('div', { class: 'glabel' }, h('span', {}, tr('Zona namunalari')), h('span', {}, String(ZONES.length))),
        h('div', { class: 'group' }, ...ZONES.map(z => h('button', { class: 'li', 'data-zonelib': z.id, onclick: () => { opt.zone = z.id; if (one?.t === 'zone') upd(one.id, e => { e.style.fill = z.fill; e.name = z.name; e.preset = z.id; }); else setTool('zone'); } }, h('i', { class: 'ch-zs', style: `background:${z.fill}` }), h('span', { class: 'k' }, tr(z.name))))));
    }
    return out;
  }
  function placeSec(): (HTMLElement | string)[] {
    const s = site();
    return [locBox('L'), miniMap(), whereBox(),
      h('div', { class: 'ch-chips', id: 'chPresets' }, ...presets().map(p => h('button', { class: 'chip', 'data-preset': p.label, 'aria-pressed': p.lat === s.lat && p.lon === s.lon, onclick: () => setSite(p.lat, p.lon) }, tr(p.label)))),
      host.origin ? h('button', { class: 'btn btn-sm', id: 'chSiteProj', onclick: () => setSite(Math.round(host.origin![1] * 1e4) / 1e4, Math.round(host.origin![0] * 1e4) / 1e4) }, ...icl(I.pin, tr('Loyiha nuqtasi'))) : ''];
  }
  /* joy qidirish: viloyat, tuman, davlat (tarmoqsiz) yoki koordinata */
  const LOCQ: Record<'L' | 'S', string> = { L: '', S: '' };
  let mapk: 'uz' | 'w' | null = null;
  function locBox(sfx: 'L' | 'S'): HTMLElement {
    const inp = h('input', { class: 'input', id: `chLocQ${sfx}`, value: LOCQ[sfx], placeholder: tr('Shahar, tuman, davlat yoki 41.31, 69.28'), autocomplete: 'off', spellcheck: 'false', 'aria-label': tr('Joy qidirish') }) as HTMLInputElement;
    const res = h('div', { class: 'group ch-locres', id: `chLocR${sfx}`, role: 'listbox' });
    let hits: LocHit[] = [];
    const fill = () => {
      const q = inp.value; LOCQ[sfx] = q; const c = parseCoord(q);
      if (c) { hits = []; res.replaceChildren(h('button', { class: 'li', 'data-coord': `${c.lat},${c.lon}`, onclick: () => setSite(c.lat, c.lon) }, h('span', { class: 'k' }, `${c.lat}°, ${c.lon}°`, h('span', { class: 'sub' }, tr('koordinata'))), svgIcon(I.right))); return; }
      hits = locSearch(q);
      if (!q.trim()) { res.replaceChildren(); return; }
      if (!hits.length) { res.replaceChildren(h('div', { class: 'li' }, h('span', { class: 'k' }, h('span', { class: 'sub' }, tr('Topilmadi. Koordinata kiriting: 41.31, 69.28'))))); return; }
      res.replaceChildren(...hits.map((e, i) => h('button', { class: 'li', 'data-loc': i, onclick: () => pickHit(e) }, h('span', { class: 'k' }, tr(e.t), h('span', { class: 'sub' }, e.kind === 'c' ? tr('davlat') : tr(e.s))), svgIcon(I.right))));
    };
    inp.addEventListener('input', () => { fill(); if (!world()) void loadWorld().then(w => { if (w && document.body.contains(inp)) fill(); }); });
    inp.addEventListener('keydown', ev => { if (ev.key !== 'Enter') return; ev.preventDefault(); const c = parseCoord(inp.value); if (c) setSite(c.lat, c.lon); else if (hits[0]) pickHit(hits[0]); });
    if (LOCQ[sfx]) queueMicrotask(fill);
    return h('div', { class: 'ch-locq' }, inp, res);
  }
  function pickHit(e: LocHit): void { const p = interiorPt(e.g); LOCQ.L = LOCQ.S = ''; setSite(Math.round(p[1] * 1e4) / 1e4, Math.round(p[0] * 1e4) / 1e4); }
  function miniMap(): HTMLElement {
    const k = mapk ?? (R && !R.inside ? 'w' : 'uz');
    if (k === 'w' && !world()) void loadWorld().then(w => { if (w) renderLeft(); });
    const m = k === 'uz' ? uzMini(R) : worldMini(R);
    const box = h('div', { class: 'ch-mini', id: 'chMini', title: tr('Bosib nuqta tanlang'), html: m.svg });
    box.addEventListener('click', ev => { const svg = box.querySelector('svg'); if (!svg) return; const r = svg.getBoundingClientRect(); const q = m.pick((ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height); setSite(q.lat, q.lon); });
    return h('div', { class: 'ch-minibox' }, seg([{ id: 'uz', label: tr('Oʻzbekiston') }, { id: 'w', label: tr('Dunyo') }], k, v => { mapk = v; renderLeft(); }, { id: 'chMapK', class: 'seg sm wide' }), box);
  }
  function whereBox(): HTMLElement {
    const s = site();
    return h('div', { class: 'ch-where', id: 'chWhere' }, h('b', {}, R ? (R.inside ? (R.reg ? rName(R.reg.n) : '—') : R.cn) : '—'),
      h('span', {}, R ? (R.inside ? (R.dis ? dName(R.dis.n) : tr('tuman topilmadi')) : (R.country ? tr('viloyat va tuman chegaralari bu davlat uchun ulanmagan') : tr('davlat chegarasidan tashqarida'))) : ''),
      h('span', { class: 'mono' }, `${Math.abs(s.lat).toFixed(4)}° ${s.lat >= 0 ? 'N' : 'S'} · ${Math.abs(s.lon).toFixed(4)}° ${s.lon >= 0 ? 'E' : 'W'}`));
  }
  function setSite(lat: number, lon: number): void {
    mapk = null;
    autoMut(() => { d.auto.site = { lat, lon }; });
    if (R && !R.inside && !world()) void loadWorld().then(w => { if (w && document.body.contains(wrap)) { relayout(false); renderAll(); if (R) toast(tr(placeName(R))); } });
    else if (R) toast(tr(placeName(R)) || tr('Nuqta tanlandi'));
  }
  const lineSample = (s: ChEl['style']) => `<path d="M2 5H38" stroke="${s.stroke}" stroke-width="${Math.max(1, (s.width ?? 1) * 1.6)}" stroke-linecap="round"${s.dash && s.dash !== 'solid' ? ` stroke-dasharray="${s.dash === 'dot' ? '0 4' : s.dash === 'long' ? '9 3' : s.dash === 'dashdot' ? '6 2 0 2' : s.dash === 'dash2dot' ? '6 2 0 2 0 2' : '4 3'}"` : ''}/>${s.deco === 'rail' ? '<path d="M6 2v6M12 2v6M18 2v6M24 2v6M30 2v6" stroke="#4a4a48"/>' : ''}`;
  const flowSample = (s: ChEl['style']) => `<path d="M2 7C14 7 22 3 34 3" fill="none" stroke="${s.stroke}" stroke-width="${s.band === 'nuqta' ? 2.5 : 4}" stroke-linecap="round"${s.band === 'nuqta' ? ' stroke-dasharray="0 4"' : s.band === 'punktir' ? ' stroke-dasharray="5 3"' : ''}/>`;
  const lbl = (t: string, v?: string) => h('div', { class: 'glabel' }, h('span', {}, tr(t)), v != null ? h('span', {}, v) : '');
  const field = (label: string, ctrl: HTMLElement) => h('div', { class: 'li' }, h('span', { class: 'k' }, tr(label)), ctrl);
  /** Rang qatori: palitra + qora/oq + boshqa rang (tanlash uskunasi) */
  const colorRow = (cur: string | undefined, set: (c: string) => void, allowNone = false, id = '', title = 'Rang') => h('div', { class: 'ch-colors', ...(id ? { id } : {}) },
    ...(allowNone ? [h('button', { class: 'ch-c none', title: tr('Yoʻq'), 'aria-label': tr('Yoʻq'), 'aria-pressed': !cur || cur === 'none', onclick: () => set('none') })] : []),
    ...[...paletteById(d.palette).colors, '#141414', '#ffffff'].filter((c, i, a) => a.indexOf(c) === i).map(c => h('button', { class: 'ch-c', style: `background:${c}`, title: c, 'aria-label': c, 'data-color': c, 'aria-pressed': (cur ?? '').toLowerCase() === c.toLowerCase(), onclick: () => set(c) })),
    h('button', { class: 'ch-c plus', title: tr('Boshqa rang'), 'aria-label': tr('Boshqa rang'), 'data-cpick': 'el', onclick: (e: Event) => { const was = cur; openColor(e.currentTarget as HTMLElement, cur && /^#[0-9a-f]{6}$/i.test(cur) ? cur : '#808080', { title: tr(title), swatches: SW, onChange: hx => set(hx), onCancel: () => { if (was) set(was); } }); } }, svgIcon(IC.plus)));

  /* ---------- oʻng panel: Element · Varaq ---------- */
  function renderRight(): void {
    if (right.hidden) return;
    const tabs = h('div', { class: 'seg', role: 'tablist', id: 'chRTabs' },
      h('button', { role: 'tab', 'data-rtab': 'element', 'aria-pressed': d.ui.rightTab === 'element', onclick: () => { d.ui.rightTab = 'element'; renderRight(); } }, tr('Element')),
      h('button', { role: 'tab', 'data-rtab': 'tekshiruv', 'aria-pressed': d.ui.rightTab === 'tekshiruv', onclick: () => { d.ui.rightTab = 'tekshiruv'; renderRight(); } }, tr('Varaq')));
    const sc = h('div', { class: 'ch-scroll', id: 'chRight' });
    let foot: HTMLElement | string = '';
    if (d.ui.rightTab === 'tekshiruv') sc.append(...varaqTab());
    else {
      const els = selected();
      if (!els.length && matSel && MATS.some(m => m.id === matSel)) sc.append(...matPanel(MATS.find(m => m.id === matSel)!));
      else if (!els.length) sc.append(...pageProps());
      else if (els.length === 1) { sc.append(...elProps(els[0])); foot = elFoot(); }
      else { sc.append(...multiProps(els)); foot = elFoot(); }
    }
    right.replaceChildren(panelHead('right', tabs), sc, foot);
  }
  function selectMat(id: string): void {
    if (crop && crop !== id) crop = null;
    matSel = id; sel.clear(); setTool('select', false); d.ui.rightTab = 'element';
    if (!rOpen() && float !== 'right') { if (phone()) float = 'right'; else { d.ui.right = true; if (tablet()) d.ui.left = false; } }
    relayout(); renderAll(); revealCell(id);
  }
  /** Tanlangan katak panel ostida qolmasin: koʻrinadigan maydonga minimal surish */
  function revealCell(id: string): void {
    const c = cellsOf(d.cur).find(x => x.el === id); if (!c || d.auto.view !== 'one' || !zoom) return;
    const vr = view.getBoundingClientRect(), sr = stage.getBoundingClientRect(), sc = PXMM * zoom, pad = 24;
    const x0 = sr.left + c.r.x * sc, x1 = x0 + c.r.w * sc, y0 = sr.top + c.r.y * sc, y1 = y0 + c.r.h * sc;
    let dx = 0, dy = 0;
    if (x1 > vr.right - pad) dx = vr.right - pad - x1; if (x0 + dx < vr.left + pad) dx = vr.left + pad - x0;
    if (y1 > vr.bottom - 90) dy = vr.bottom - 90 - y1; if (y0 + dy < vr.top + 70) dy = vr.top + 70 - y0;
    if (dx || dy) { panX += dx; panY += dy; applyView(); renderOverlay(); }
  }
  function matPanel(m: Material): HTMLElement[] {
    const where = Object.entries(PLACE).filter(([id]) => id === m.id).map(([, p]) => p);
    const att = d.hand.filter(e => e.a?.el === m.id).length, s = matSet(m.id);
    const title = h('input', { class: 'input', id: 'chMatTitle', value: m.title, 'aria-label': tr('Sarlavha') }) as HTMLInputElement;
    title.addEventListener('change', () => autoMut(() => { s.title = title.value.trim() || undefined; if (!s.title) delete s.title; }, 'mt'));
    const out: HTMLElement[] = [h('div', { class: 'ch-eh' }, h('b', { class: 't-title' }, tr(m.name)), h('span', { class: 'chip' }, tr('loyihadan'))), field('Sarlavha', title)];
    if (m.kind === 'note') {
      const ta = h('textarea', { class: 'input ch-ta', id: 'chMatText', rows: 6 }, m.text ?? (R ? tr(autoNote(R)) : '')) as HTMLTextAreaElement;
      ta.addEventListener('change', () => autoMut(() => { s.text = ta.value; }, 'mx'));
      out.push(lbl('Matn'), ta);
      if (m.text != null) out.push(h('button', { class: 'btn btn-sm', id: 'chMatAuto', onclick: () => autoMut(() => { s.text = null; }) }, tr('Avtomatik matnga qaytarish')));
    }
    out.push(lbl('Asosiy rang'), h('div', { class: 'ch-colors', id: 'chMatColor' },
      h('button', { class: 'btn btn-sm', 'aria-pressed': !m.accent, onclick: () => autoMut(() => { s.accent = null; }) }, tr('uslubdan')),
      ...SW.map(c => h('button', { class: 'ch-c', style: `background:${c}`, 'aria-label': c, 'aria-pressed': m.accent === c, onclick: () => autoMut(() => { s.accent = c; }) })),
      h('button', { class: 'ch-c plus', 'aria-label': tr('Boshqa rang'), title: tr('Boshqa rang'), onclick: (e: Event) => { const was = s.accent ?? null; commit('mc'); openColor(e.currentTarget as HTMLElement, m.accent ?? (PAL[d.auto.pal] ?? PAL.arch).acc, { title: `${tr(m.name)} · ${tr('rang')}`, swatches: SW, onChange: hx => { s.accent = hx; relayout(); renderCanvas(); }, onDone: () => { dirty(); renderAll(); }, onCancel: () => { s.accent = was; relayout(); renderAll(); } }); } }, svgIcon(IC.plus))),
      field('Matn va chiziq oʻlchami', stepper({ id: 'chMatScale', min: 70, max: 150, step: 10, value: Math.round(m.scale * 100), unit: '%', label: tr('Matn va chiziq oʻlchami'), onchange: v => autoMut(() => { s.scale = v / 100; }, 'ms') })),
      lbl('Varaqda'), where.length ? h('div', { class: 'group' }, ...where.map(w => h('button', { class: 'li', onclick: () => goPage(w.pi) }, h('span', { class: 'k' }, `${tf('${n}-varaq', { n: w.pi + 1 })} · ${tr(LAYOUTS.roles[LAST!.PG.pages[w.pi].page.slots[w.k].role][0]).toLowerCase()}`), svgIcon(I.right)))) : h('div', { class: 'note warn' }, tr('Bu maketda joy topilmadi.')),
      h('div', { class: 'note' }, tr('Loyiha oʻzgarsa bu element oʻzi yangilanadi.') + (att ? ` ${tf('Ustida ${n} ta qoʻlda chizilgan belgi bor — element boshqa katak yoki maketga koʻchsa, ular ham birga koʻchadi.', { n: att })}` : '')));
    if (m.kind === 'floor') {
      // qavat rejasi masshtabi: avtomatik (katakka sigʻadigan eng yirigi) yoki qoʻlda (GOST 2.302)
      out.push(lbl('Masshtab'), h('div', { class: 'seg sm seg-wrap ch-ms', id: 'chMatMs' },
        h('button', { 'aria-pressed': !m.ms, onclick: () => autoMut(() => { delete matSet(m.id).ms; }) }, tr('Avtomatik')),
        ...PLAN_SCALES.map(k => h('button', { 'data-ms': String(k), 'aria-pressed': m.ms === k, onclick: () => autoMut(() => { matSet(m.id).ms = k; }) }, `1:${k}`))),
);
      if (m.ms) out.push(h('div', { class: 'note' }, tr('Reja katakka sigʻmasa, chetlari kesiladi — «Kadrlash» bilan suring.')));
    }
    if (croppable(m)) {
      const v = viewOf(m.id);
      out.push(lbl('Kadrlash'), field('Kattalashtirish', stepper({ id: 'chMatZoom', min: 100, max: 800, step: 25, value: Math.round(v.z * 100), unit: '%', label: tr('Kattalashtirish'), onchange: z => autoMut(() => setView(m.id, { ...viewOf(m.id), z: z / 100 }), 'mz') })),
        h('div', { class: 'ch-chips' },
          h('button', { class: 'btn btn-sm', id: 'chMatCrop', 'aria-pressed': crop === m.id, onclick: () => cropOn(crop === m.id ? null : m.id) }, ...icl(I.crop, tr(crop === m.id ? 'Tayyor' : 'Katakda surish'))),
          matSet(m.id).view ? h('button', { class: 'btn btn-sm', id: 'chMatCropReset', onclick: () => autoMut(() => setView(m.id, { z: 1, cx: 0, cy: 0 })) }, tr('Asliga qaytarish')) : ''),
        h('div', { class: 'note' }, tr('Katakni ikki marta bosing: sudrab surish, gʻildirak bilan kattalashtirish.')));
    }
    if (m.role !== 'title') out.push(lbl('Rasm'), h('div', { class: 'ch-chips' },
      h('button', { class: 'btn btn-sm', id: 'chMatImg', onclick: () => pickPhoto(url => autoMut(() => { s.src = url; })) }, tr(m.own ? 'Boshqa rasm tanlash' : 'Oʻz rasmingiz bilan almashtirish')),
      m.own ? h('button', { class: 'btn btn-sm', id: 'chMatImgReset', onclick: () => autoMut(() => { delete s.src; }) }, tr('Asl holiga qaytarish')) : ''));
    const inb = m.id.startsWith('i:') ? d.inbox.find(i => `i:${i.id}` === m.id) : null;
    if (inb) out.push(h('button', { class: 'btn btn-sm', id: 'chPlaceFree', onclick: () => placeInbox(inb) }, tr('Joriy varaqqa erkin element sifatida qoʻyish')));
    return out;
  }
  function varaqTab(): HTMLElement[] {
    const out: HTMLElement[] = [];
    if (isAuto() && LAST) {
      const pi = d.cur, pk = LAST.PG.pages[pi], f = fam(), fk = fmtOf(f);
      out.push(lbl('Format'), h('div', { class: 'seg sm', id: 'chFmtR' }, ...f.formats.map(k => h('button', { 'data-fmt': k, 'aria-pressed': k === fk, onclick: () => autoMut(() => { d.auto.fmt[f.id] = k; }) }, tr(fmtName(k))))));
      out.push(h('div', { class: 'ch-eh' }, h('b', { class: 't-title' }, `${tf('${n}-varaq', { n: pi + 1 })} · ${tr('shablon')}`), h('span', { class: 't-small' }, tr('ball · tanlangani ✓'))),
        h('div', { class: 'group', id: 'chAlts' }, ...(pk.alts ?? [pk]).map(a => h('button', { class: 'li', 'data-force': `${pi}:${a.page.id}`, 'aria-pressed': a.page.id === pk.page.id, onclick: () => autoMut(() => { d.auto.force[pi] = a.page.id; for (const k of Object.keys(d.auto.force)) if (+k > pi) delete d.auto.force[+k]; d.auto.ov = d.auto.ov.filter(o => o.pi < pi); }) },
          h('span', { class: 'k' }, tr(a.page.title), h('span', { class: 'sub' }, tf('${a}/${b} katak', { a: a.assign.size, b: a.assign.size + a.empty.size }))), h('span', { class: 'num t-small' }, String(Math.round(a.score))), a.page.id === pk.page.id ? svgIcon(I.check) : h('span', { class: 'ch-w16' })))),
        h('div', { class: 'row2' },
          d.auto.force[pi] ? h('button', { class: 'btn btn-sm', id: 'chUnforce', onclick: () => autoMut(() => { delete d.auto.force[pi]; }) }, tr('Avtomatikka qaytarish')) : '',
          d.auto.ov.length ? h('button', { class: 'btn btn-sm', id: 'chOvReset', onclick: () => autoMut(() => { d.auto.ov = []; }) }, tr('Sudrab almashtirganlarni bekor qilish')) : ''));
    }
    out.push(...checkTab());
    return out;
  }
  /** 19-band (3): maket varagʻi matnlari (sarlavha, boʻlim) va albom matnlari (loyiha satri, shtamp, shifr, TIK, manba) + yashirish */
  function pageTexts(): HTMLElement[] {
    if (!LAST) return [];
    const pi = d.cur, ap = LAST.pages[pi], f = fam(), roles = new Set(ap.fill.page.slots.map(q => q.role)), A = d.auto;
    const inp = (id: string, val: string | undefined, ph: string, set: (v: string | undefined) => void, area = false) => {
      const el = (area ? h('textarea', { class: 'input ch-ta', id, rows: 3, placeholder: ph }, val ?? '') : h('input', { class: 'input', id, value: val ?? '', placeholder: ph })) as HTMLInputElement;
      el.addEventListener('change', () => autoMut(() => { const v = el.value.trim(); set(v ? v : undefined); }, id));
      return el;
    };
    const tog = (k: 'stamp' | 'shifr' | 'head' | 'foot', label: string) => field(label, sw({ id: `chHide_${k}`, label: tr(label), on: !A.hide[k], onchange: v => autoMut(() => { if (v) delete A.hide[k]; else A.hide[k] = true; }) }));
    const C = A.chap[pi] ?? {}, setC = (k: 'n' | 't' | 'note', v: string | undefined) => { const c = { ...(A.chap[pi] ?? {}) }; if (v == null) delete c[k]; else c[k] = v; if (Object.keys(c).length) A.chap[pi] = c; else delete A.chap[pi]; };
    const out: HTMLElement[] = [lbl('Varaq matnlari'),
      lbl('Sarlavha'), inp('chPgTitle', A.ttl[pi], ap.title, v => { if (v) A.ttl[pi] = v; else delete A.ttl[pi]; })];
    if (roles.has('chapter')) out.push(lbl('Boʻlim raqami'), inp('chChapN', C.n, '02', v => setC('n', v)), lbl('Boʻlim nomi'), inp('chChapT', C.t, tr('Tahlil'), v => setC('t', v)), lbl('Izoh'), inp('chChapNote', C.note, tr('Qisqa izoh'), v => setC('note', v), true));
    out.push(lbl('Albom matnlari va shtamp'),
      h('span', { class: 't-small' }, tr('Barcha maket varaqlariga taalluqli. Boʻsh qoldirilsa — loyiha maʼlumotidan avtomatik.')),
      lbl('Loyiha satri'), inp('chTxtProj', A.txt.proj, TXT_DEF.proj(), v => { A.txt.proj = v; }),
      lbl('Shtamp matni'), inp('chTxtStamp', A.txt.stamp, TXT_DEF.stamp(), v => { A.txt.stamp = v; }),
      lbl('Shifr'), inp('chTxtShifr', A.txt.shifr, TXT_DEF.shifr(), v => { A.txt.shifr = v; }));
    if (f.chrome === 'kz') out.push(lbl('TIK satri'), inp('chTxtTik', A.txt.tik, TXT_DEF.tik(), v => { A.txt.tik = v; }, true), lbl('Manba'), inp('chTxtSrc', A.txt.src, TXT_DEF.src(), v => { A.txt.src = v; }));
    out.push(h('div', { class: 'group', id: 'chHide' }, tog('stamp', 'Shtamp'), tog('shifr', 'Shifr'), tog('head', 'Yuqori kolontitul'), tog('foot', 'Pastki kolontitul')));
    for (const k of Object.keys(A.txt) as (keyof typeof A.txt)[]) if (A.txt[k] === undefined) delete A.txt[k];
    return out;
  }
  function pageProps(): HTMLElement[] {
    const p = P(), [W, H] = pageSize(p), toolHelp = TOOLS.find(t => t.id === tool)!;
    const out: HTMLElement[] = [];
    if (isAuto()) {
      const f = fam();
      out.push(h('div', { class: 'ch-eh' }, h('b', { class: 't-title' }, tr(p.name)), h('span', { class: 't-small' }, `${tr(f.name)} · ${tr(fmtName(fmtOf(f)))} · ${Math.round(W)} × ${Math.round(H)} mm`)),
        h('div', { class: 'empty ch-empty' }, svgIcon(I.el), h('b', {}, tr('Hech narsa tanlanmagan')), h('span', {}, tr('Varaqdagi elementni bosing yoki pastdagi asbob bilan chizing. Shift — bir nechtasini tanlash.'))),
        ...pageTexts());
    } else {
      const name = h('input', { class: 'input', id: 'chPageName', value: p.name, 'aria-label': tr('Varaq nomi') }) as HTMLInputElement;
      name.addEventListener('change', () => mut(pp => { pp.name = name.value.trim() || pp.name; }));
      out.push(h('div', { class: 'ch-eh' }, h('b', { class: 't-title' }, tr('Erkin varaq')), h('span', { class: 't-small' }, `${p.paper === 'custom' ? '' : p.paper + ' · '}${W} × ${H} mm`)), name, lbl('Format'),
        h('div', { class: 'seg sm', id: 'chPaper' }, ...(['A4', 'A3', 'A2', 'A1', 'A0', 'A0+', 'custom'] as ChPaper[]).map(x => h('button', { 'data-paper': x, 'aria-pressed': p.paper === x, onclick: () => mut(pp => { pp.paper = x; if (x === 'custom') { pp.w = W; pp.h = H; } }) }, x === 'custom' ? tr('Ixtiyoriy') : x))),
        h('div', { class: 'row2', hidden: p.paper !== 'custom' }, stepper({ min: 50, max: 5000, step: 1, value: W, label: tr('Eni, mm'), onchange: v => mut(pp => { pp.w = v; }, 'pw') }), stepper({ min: 50, max: 5000, step: 1, value: H, label: tr('Boʻyi, mm'), onchange: v => mut(pp => { pp.h = v; }, 'ph') })),
        seg([{ id: 'land', label: tr('Gorizontal') }, { id: 'port', label: tr('Portret') }], p.landscape ? 'land' : 'port', v => mut(pp => { pp.landscape = v === 'land'; }), { id: 'chOrient' }));
    }
    out.push(lbl('Asbob', tr(toolHelp.name)), ...toolOpts(),
      h('span', { class: 't-small' }, tr('Elementni tanlang yoki chizing. Shift — bir nechtasini, Alt + sudrash — xarita ichini surish, ikki marta bosish — chizishni tugatish.')));
    return out;
  }
  function toolOpts(): HTMLElement[] {
    if (tool === 'flow') return [h('div', { class: 'group', id: 'chFlowPre' }, ...FLOWS.map(f => h('button', { class: 'li', 'data-flow': f.id, 'aria-pressed': opt.flow === f.id, onclick: () => { opt.flow = f.id; renderRight(); } }, h('span', { class: 'ch-sw', html: `<svg viewBox="0 0 40 10" width="44" height="12">${flowSample(f.style)}</svg>` }), h('span', { class: 'k' }, tr(f.name)))))];
    if (tool === 'zone') return [h('div', { class: 'group', id: 'chZonePre' }, ...ZONES.map(z => h('button', { class: 'li', 'data-zone': z.id, 'aria-pressed': opt.zone === z.id, onclick: () => { opt.zone = z.id; renderRight(); } }, h('i', { class: 'ch-zs', style: `background:${z.fill}` }), h('span', { class: 'k' }, tr(z.name)))))];
    if (tool === 'text') return [seg(TEXT_KINDS.map(k => ({ id: k.id, label: tr(k.name) })), opt.textKind, v => { opt.textKind = v; renderRight(); }, { id: 'chTextKind' })];
    if (tool === 'icon') return [h('span', { class: 't-small' }, `${tr('Belgi')}: ${tr(iconById(opt.icon).name)} · ${tr('Kutubxona → Belgilar')}`)];
    if (tool === 'row') return [h('span', { class: 't-small' }, `${tr('Qator')}: ${tr(opt.rowKind === 'tree' ? 'Daraxtlar' : opt.rowKind === 'people' ? 'Odamlar' : opt.rowKind === 'dot' ? 'Nuqtalar' : 'Belgi')} · ${tr('Kutubxona → Qator')}`)];
    if (tool === 'line' || tool === 'arrow') return [h('span', { class: 't-small' }, opt.mob ? `${tr('Namuna')}: ${tr(MOBILITY.find(m => m.id === opt.mob)!.name)}` : tr('Kutubxona → Yoʻllar: harakatlanish ierarxiyasi'))];
    if (tool === 'map') return [h('span', { class: 't-small' }, tr('Ramka chizing; manbani oʻng panelda tanlang: loyiha bosh rejasi, sahna rasmi yoki «Loyihadan».'))];
    return [];
  }
  function elFoot(): HTMLElement {
    return h('div', { class: 'ch-foot' },
      h('button', { class: 'btn icon-btn', id: 'chDup', title: tr('Nusxa (Ctrl+D)'), 'aria-label': tr('Nusxa (Ctrl+D)'), onclick: () => duplicate() }, svgIcon(I.copy)),
      h('button', { class: 'btn', id: 'chFront', onclick: () => order(1) }, tr('Oldinga')),
      h('button', { class: 'btn', id: 'chBackw', onclick: () => order(-1) }, tr('Orqaga')),
      h('button', { class: 'btn icon-btn danger', id: 'chDel', title: tr('Oʻchirish (Del)'), 'aria-label': tr('Oʻchirish (Del)'), onclick: () => remove() }, svgIcon(I.trash)));
  }
  const pct = (label: string, v: number, on: (v: number) => void) => field(label, stepper({ min: 10, max: 100, step: 5, value: Math.round(v * 100), unit: '%', label: tr(label), onchange: x => on(x / 100) }));
  function bindField(e: ChEl): HTMLElement {
    if (!isAuto() || !e.a) return h('span');
    const m = e.a.el ? MATS.find(x => x.id === e.a!.el) : null;
    return h('div', { class: 'group', id: 'chBind' }, h('div', { class: 'li' },
      h('span', { class: 'k' }, m ? tr(m.name) : tf('Varaq ${n}', { n: d.cur + 1 }), h('span', { class: 'sub' }, tr(m ? 'element koʻchsa, belgi ham birga koʻchadi' : 'maket almashsa ham shu varaqda, nisbati saqlanadi'))),
      m ? h('button', { class: 'btn btn-sm', id: 'chBindPage', onclick: () => bindSel('page') }, tr('Varaqqa')) : h('button', { class: 'btn btn-sm', id: 'chBindEl', onclick: () => bindSel('el') }, tr('Elementga'))));
  }
  function bindSel(to: 'page' | 'el'): void {
    const e = selected()[0]; if (!e || !isAuto()) return;
    commit(); const ok = bindTo(e, d.cur, cellsOf(d.cur), pageRect(d.cur), to);
    if (!ok) toast(tr('Ostida material yoʻq — shaklni elementning ustiga suring'));
    d.hand = d.hand.map(x => (x.id === e.id ? e : x)); saved = false; syncSave(); clearTimeout(saveT); saveT = setTimeout(flush, 700); renderLeft(); renderRight();
  }
  function elProps(e: ChEl): HTMLElement[] {
    const b = bbox(e), out: HTMLElement[] = [];
    const lay = layerOf(e);
    out.push(h('div', { class: 'ch-eh' }, h('b', { class: 't-title', id: 'chElT' }, tr(e.preset ? (FLOWS.find(f => f.id === e.preset)?.name ?? e.name ?? TYPE_NAME[e.t]) : TYPE_NAME[e.t])), h('span', { class: 't-small' }, `«${lay?.name ?? ''}» ${tr('qatlami')} · ${Math.round(b[2] - b[0])} × ${Math.round(b[3] - b[1])} mm`)));
    const S = (f: (s: ChEl['style']) => void, m = '') => upd(e.id, x => f(x.style), m);
    const nameIn = h('input', { class: 'input', id: 'chElName', value: e.name ?? '', placeholder: tr('Nomi (shartli belgilar uchun)') }) as HTMLInputElement;
    nameIn.addEventListener('input', () => upd(e.id, x => { x.name = nameIn.value || undefined; }, 'name', true));
    const opacity = (def: number) => pct('Shaffoflik', e.style.opacity ?? def, v => S(s => { s.opacity = v; }, 'op'));
    const width = (label = 'Qalinlik, mm', min = 0.1, max = 20, step = 0.1) => field(label, stepper({ min, max, step, value: Math.round((e.style.width ?? 1) * 100) / 100, label: tr(label), onchange: v => S(s => { s.width = v; }, 'w') }));
    const headSeg = () => field('Uchi', seg([{ id: 'none', label: '—' }, { id: 'end', label: '→' }, { id: 'both', label: '↔' }], (e.style.head ?? (e.t === 'arrow' ? 'end' : 'none')) as 'none' | 'end' | 'both', v => S(s => { s.head = v; }), { id: 'chHead' }));
    const dashPick = (id: string) => pick(id, DASHES.map(x => ({ value: x.id, label: tr(x.name) })), e.style.dash ?? 'solid', v => S(s => { s.dash = v; }), tr('Chiziq turi'));
    switch (e.t) {
      case 'flow':
        out.push(lbl('Namuna', String(FLOWS.length)), h('div', { class: 'group', id: 'chFlowSet' }, ...FLOWS.map(f => h('button', { class: 'li', 'data-flow': f.id, 'aria-pressed': e.preset === f.id, onclick: () => upd(e.id, x => { x.style = { ...x.style, ...f.style }; x.preset = f.id; x.name = f.name; }) }, h('span', { class: 'ch-sw', html: `<svg viewBox="0 0 40 10" width="44" height="12">${flowSample(f.style)}</svg>` }), h('span', { class: 'k' }, tr(f.name))))),
          lbl('Uslub'), seg(BANDS.map(x => ({ id: x.id, label: tr(x.name) })), e.style.band ?? 'toliq', v => S(s => { s.band = v; }), { id: 'chBand' }),
          h('div', { class: 'group' }, width('Qalinlik, mm', 0.5, 30, 0.5), headSeg(), field('Silliq egri', sw({ id: 'chSmooth', label: tr('Silliq egri'), on: e.style.smooth !== false, onchange: v => S(s => { s.smooth = v; }) })), opacity(0.85)),
          lbl('Rang'), colorRow(e.style.stroke, c => S(s => { s.stroke = c; }, 'c'), false, 'chColor'), nameIn);
        break;
      case 'zone':
        out.push(lbl('Namuna', String(ZONES.length)), h('div', { class: 'group' }, ...ZONES.map(z => h('button', { class: 'li', 'data-zone': z.id, 'aria-pressed': e.preset === z.id, onclick: () => upd(e.id, x => { x.style.fill = z.fill; x.preset = z.id; x.name = z.name; }) }, h('i', { class: 'ch-zs', style: `background:${z.fill}` }), h('span', { class: 'k' }, tr(z.name))))),
          h('div', { class: 'group' }, field('Yumshoq chegara, mm', stepper({ min: 0, max: 40, step: 1, value: Math.round(e.style.halo ?? 6), label: tr('Yumshoq chegara'), onchange: v => S(s => { s.halo = v; }, 'halo') })), opacity(0.55)),
          lbl('Rang'), colorRow(e.style.fill, c => S(s => { s.fill = c; }, 'c'), false, 'chColor'), nameIn);
        break;
      case 'line': case 'arrow': case 'pen':
        out.push(lbl('Harakatlanish ierarxiyasi'), pick('chMobSel', [{ value: '', label: '—' }, ...MOBILITY.map(m => ({ value: m.id, label: tr(m.name) }))], e.preset && MOBILITY.some(m => m.id === e.preset) ? e.preset : '', v => { const m = MOBILITY.find(x => x.id === v); if (m) upd(e.id, x => { x.style = { ...x.style, ...m.style }; x.preset = m.id; x.name = m.name; }); }, tr('Harakatlanish ierarxiyasi')),
          h('div', { class: 'group' }, field('Chiziq turi', dashPick('chDash')), width(), headSeg(), ...(e.t !== 'pen' ? [field('Silliq egri', sw({ id: 'chSmooth', label: tr('Silliq egri'), on: !!e.style.smooth, onchange: v => S(s => { s.smooth = v; }) }))] : []), opacity(1)),
          lbl('Rang'), colorRow(e.style.stroke, c => S(s => { s.stroke = c; }, 'c'), false, 'chColor'), nameIn);
        break;
      case 'rect': case 'ellipse': case 'poly':
        out.push(lbl('Toʻldirish'), colorRow(e.style.fill, c => S(s => { s.fill = c; }, 'c'), true, 'chFill'), lbl('Kontur'), colorRow(e.style.stroke, c => S(s => { s.stroke = c; }, 'c2'), true, 'chStroke'),
          h('div', { class: 'group' }, width('Kontur, mm', 0, 10, 0.1), field('Chiziq', dashPick('chDash')), opacity(1)), nameIn);
        break;
      case 'text': {
        const ta = h('textarea', { class: 'input ch-ta', id: 'chText', rows: 3 }, e.text ?? '') as HTMLTextAreaElement;
        ta.addEventListener('input', () => upd(e.id, x => { x.text = ta.value; }, 'txt', true));
        out.push(ta, lbl('Yozuv turi'), seg(TEXT_KINDS.map(k => ({ id: k.id, label: tr(k.name) })), e.style.kind ?? 'matn', v => { const k = TEXT_KINDS.find(x => x.id === v)!; S(s => { s.kind = v; s.size = k.size; s.bold = k.bold; s.font = k.font; }); }, { id: 'chKind' }),
          h('div', { class: 'group' }, field('Shrift', pick('chFont', FONTS.map(f => ({ value: f, label: f })), e.style.font ?? 'Archivo', v => S(s => { s.font = v; }), tr('Shrift'))),
            field('Oʻlcham, pt', stepper({ min: 1, max: 300, step: 1, value: Math.round(e.style.size ?? 11), label: tr('Oʻlcham, pt'), onchange: v => S(s => { s.size = v; }, 'sz') })), field('Qator oraligʻi', stepper({ min: 0.8, max: 3, step: 0.05, value: e.style.lh ?? 1.25, label: tr('Qator oraligʻi'), onchange: v => S(s => { s.lh = v; }, 'lh') }))),
          h('div', { class: 'row2' },
            h('div', { class: 'seg sm', id: 'chBI' }, h('button', { 'aria-pressed': !!e.style.bold, 'aria-label': tr('Qalin'), onclick: () => S(s => { s.bold = !s.bold; }), style: 'font-weight:700' }, 'B'), h('button', { 'aria-pressed': !!e.style.italic, 'aria-label': tr('Kursiv'), onclick: () => S(s => { s.italic = !s.italic; }), style: 'font-style:italic' }, 'I')),
            seg([{ id: 'start', label: '⟸' }, { id: 'middle', label: '≡' }, { id: 'end', label: '⟹' }], e.style.align ?? 'start', v => S(s => { s.align = v; }), { id: 'chAlign' })),
          lbl('Rang'), colorRow(e.style.fill, c => S(s => { s.fill = c; }, 'c'), false, 'chColor'));
        break;
      }
      case 'icon':
        out.push(h('div', { class: 'li' }, h('span', { class: 'ch-ic big', html: `<svg viewBox="0 0 24 24" width="28" height="28"><path d="${iconById(e.icon).d}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>` }), h('span', { class: 'k' }, tr(iconById(e.icon).name), h('span', { class: 'sub' }, tr('Kutubxona → Belgilar: almashtirish')))),
          lbl('Koʻrinish'), seg(LOOKS.map(l => ({ id: l.id, label: tr(l.name) })), e.look ?? 'doira', v => upd(e.id, x => { x.look = v; }), { id: 'chLookEl' }),
          h('div', { class: 'group' }, field('Oʻlcham, mm', stepper({ min: 1, max: 200, step: 1, value: Math.round(e.w ?? 10), label: tr('Oʻlcham, mm'), onchange: v => upd(e.id, x => { const c = [(x.x ?? 0) + (x.w ?? 0) / 2, (x.y ?? 0) + (x.h ?? 0) / 2]; x.w = v; x.h = v; x.x = c[0] - v / 2; x.y = c[1] - v / 2; }, 'isz') })),
            field('Xavf belgisi', sw({ label: tr('Xavf belgisi'), on: !!e.style.risk, onchange: v => S(s => { s.risk = v; }) })), opacity(1)),
          lbl('Rang'), colorRow(e.style.stroke, c => S(s => { s.stroke = c; }, 'c'), false, 'chColor'), nameIn);
        break;
      case 'row': {
        const r = e.row ?? { kind: 'tree', gap: 8, size: 5 };
        out.push(lbl('Qator'), seg([{ id: 'tree', label: tr('Daraxtlar') }, { id: 'people', label: tr('Odamlar') }, { id: 'dot', label: tr('Nuqtalar') }, { id: 'icon', label: tr('Belgi') }], r.kind, v => upd(e.id, x => { x.row = { ...r, kind: v }; }), { id: 'chRowK' }),
          h('div', { class: 'group' }, field('Oraliq, mm', stepper({ min: 0.5, max: 200, step: 0.5, value: Math.round(r.gap * 2) / 2, label: tr('Oraliq, mm'), onchange: v => upd(e.id, x => { x.row = { ...x.row!, gap: v }; }, 'gap') })), field('Oʻlcham, mm', stepper({ min: 0.5, max: 100, step: 0.5, value: Math.round(r.size * 2) / 2, label: tr('Oʻlcham, mm'), onchange: v => upd(e.id, x => { x.row = { ...x.row!, size: v }; }, 'rsz') }))),
          lbl('Rang'), colorRow(e.style.fill, c => S(s => { s.fill = c; }, 'c'), true, 'chColor'), nameIn);
        break;
      }
      case 'image':
        out.push(h('button', { class: 'btn btn-block', id: 'chImgPick', onclick: () => pickImage(e.id) }, ...icl(I.dl, tr(e.src ? 'Rasmni almashtirish' : 'Rasm tanlash'))),
          h('div', { class: 'group' }, opacity(1), field('Ramka', sw({ label: tr('Ramka'), on: !!e.style.stroke, onchange: v => S(s => { s.stroke = v ? '#141414' : undefined; }) }))), nameIn);
        break;
      case 'map': {
        const sc = mapScale(e);
        const northIn = h('input', { class: 'input num', id: 'chMapNorth', inputmode: 'numeric', value: mapNorth(e) != null ? String(Math.round(mapNorth(e)!)) : '', placeholder: '0' }) as HTMLInputElement;
        northIn.addEventListener('change', () => { const v = Number(northIn.value.replace(',', '.')); if (!Number.isFinite(v)) return; upd(e.id, x => { x.north = ((v % 360) + 360) % 360; }); });
        const scIn = h('input', { class: 'input num', id: 'chMapScale', inputmode: 'numeric', value: sc ?? '', placeholder: tr('masshtabsiz') }) as HTMLInputElement;
        scIn.addEventListener('change', () => { const N = Number(scIn.value.replace(/\s/g, '')); if (!(N > 0) || !e.scale || !e.vb) return; upd(e.id, x => { const vb = x.vb!, cx = vb[0] + vb[2] / 2, cy = vb[1] + vb[3] / 2, w = Math.abs(x.w ?? 100), hh = Math.abs(x.h ?? 100), vw = N * w / x.scale!, vh = vw * hh / w; x.vb = [cx - vw / 2, cy - vh / 2, vw, vh]; x.natW = vw; }); });
        out.push(lbl('Manba'),
          h('div', { class: 'group', id: 'chMapSrc' },
            h('button', { class: 'li', 'data-src': 'site', onclick: () => setMapSource(e.id, 'site') }, h('span', { class: 'k' }, tr('Loyiha bosh rejasi'), h('span', { class: 'sub' }, tr('Varaqlar · vektor, masshtab bilan')))),
            h('button', { class: 'li', 'data-src': 'scene', onclick: () => setMapSource(e.id, 'scene') }, h('span', { class: 'k' }, tr('Sahna rasmi'), h('span', { class: 'sub' }, tr('joriy 3D koʻrinish (fon: sxematik yoki sunʼiy yoʻldosh)')))),
            ...(plansOnce() ?? []).filter(p => p.id !== 'p:plan').map(p => h('button', { class: 'li', 'data-src': p.id, onclick: () => { const m = p.get(); if (!m) { toast(tr('Bu reja uchun maʼlumot yoʻq')); return; } setMapSource(e.id, { id: p.id, name: tr(p.name), kind: 'plan', svg: m.svg, vb: m.vb, w: m.w, h: m.h, scale: m.scale, north: m.north ?? 0, at: '' }); } }, h('span', { class: 'k' }, tr(p.name), h('span', { class: 'sub' }, tr('Master reja · vektor'))))),
            ...d.inbox.map(it => h('button', { class: 'li', 'data-src': it.id, onclick: () => setMapSource(e.id, it) }, h('span', { class: 'k' }, it.name, h('span', { class: 'sub' }, tr('Loyihadan')))))),
          field('Masshtab 1:', scIn),
          h('span', { class: 't-small' }, tr('Xarita ichini surish — Alt + sudrash. Ramka oʻlchami oʻzgarsa masshtab qayta hisoblanadi.')),
          h('div', { class: 'group' },
            field('Shimol belgisi', sw({ label: tr('Shimol belgisi'), on: mapNorth(e) != null && e.style.north !== false, onchange: v => { upd(e.id, x => { if (v && mapNorth(x) == null) x.north = 0; x.style.north = v ? undefined : false; }); } })),
            field('Masshtab chizgʻichi', sw({ label: tr('Masshtab chizgʻichi'), on: e.style.bar !== false, onchange: v => S(s => { s.bar = v ? undefined : false; }) })),
            field('Masshtab yozuvi', sw({ label: tr('Masshtab yozuvi'), on: e.style.kind !== 'izoh', onchange: v => S(s => { s.kind = v ? undefined : 'izoh'; }) }))),
          field('Shimol, °', northIn), nameIn);
        break;
      }
      case 'legend':
        out.push(field('Sarlavha', (() => { const i = h('input', { class: 'input', value: e.text ?? '' }) as HTMLInputElement; i.addEventListener('input', () => upd(e.id, x => { x.text = i.value; }, 'lt', true)); return i; })()),
          field('Oʻlcham, pt', stepper({ min: 1, max: 40, step: 0.5, value: Math.round((e.style.size ?? 9) * 2) / 2, label: tr('Oʻlcham, pt'), onchange: v => S(s => { s.size = v; }, 'ls') })),
          h('span', { class: 't-small' }, tr('Shartli belgilar varaqdagi nomlangan elementlar ranglaridan avtomatik tuziladi.')));
        break;
      case 'table': {
        const ta = h('textarea', { class: 'input ch-ta', id: 'chTable', rows: 8 }, (e.rows ?? []).map(r => r.join('\t')).join('\n')) as HTMLTextAreaElement;
        ta.addEventListener('input', () => upd(e.id, x => { x.rows = ta.value.split('\n').map(r => r.split('\t')); }, 'tab', true));
        out.push(lbl('Qatorlar (Tab bilan ajrating)'), ta, field('Oʻlcham, pt', stepper({ min: 1, max: 40, step: 0.5, value: Math.round((e.style.size ?? 8) * 2) / 2, label: tr('Oʻlcham, pt'), onchange: v => S(s => { s.size = v; }, 'ts') })));
        break;
      }
    }
    out.push(lbl('Joylashuv'), h('div', { class: 'group' },
      field('Burish, °', stepper({ min: -180, max: 180, step: 1, value: Math.round(e.rot ?? 0), label: tr('Burish'), onchange: v => upd(e.id, x => { x.rot = v || undefined; }, 'rot') })),
      field('Akslantirish', h('div', { class: 'seg sm' }, h('button', { title: tr('Gorizontal akslantirish'), 'aria-label': tr('Gorizontal akslantirish'), onclick: () => flip('x') }, svgIcon(I.flipH)), h('button', { title: tr('Vertikal akslantirish'), 'aria-label': tr('Vertikal akslantirish'), onclick: () => flip('y') }, svgIcon(I.flipV)))),
      field('Qatlam', pick('chElLayer', P().layers.map(l => ({ value: l.id, label: l.name })), e.layer, v => upd(e.id, x => { x.layer = v; }), tr('Qatlam')))));
    if (isAuto()) out.push(lbl('Bogʻlanish'), bindField(e));
    if (e.group) out.push(h('button', { class: 'btn btn-sm', id: 'chUngroup', onclick: () => group(false) }, tr('Guruhni ajratish')));
    return out;
  }
  function multiProps(els: ChEl[]): HTMLElement[] {
    const grouped = els.every(e => e.group && e.group === els[0].group);
    return [h('div', { class: 'ch-eh' }, h('b', { class: 't-title' }, tf('${n} ta element', { n: els.length })), h('span', { class: 't-small' }, tr(grouped ? 'guruh' : 'tanlov'))),
      lbl('Tekislash'), h('div', { class: 'ch-algrid', id: 'chAlignEls' }, ...([['l', 'Chapga', 'M4 4v16M8 7h12v4H8zM8 13h8v4H8z'], ['cx', 'Markazga', 'M12 4v16M6 7h12v4H6zM8 13h8v4H8z'], ['r', 'Oʻngga', 'M20 4v16M4 7h12v4H4zM8 13h8v4H8z'], ['t', 'Tepaga', 'M4 4h16M7 8v12h4V8zM13 8v8h4V8z'], ['cy', 'Oʻrtaga', 'M4 12h16M7 6v12h4V6zM13 8v8h4V8z'], ['b', 'Pastga', 'M4 20h16M7 4v12h4V4zM13 8v8h4V8z']] as const).map(([k, n, ic]) => h('button', { class: 'btn btn-sm icon-btn', 'data-align': k, title: tr(n), 'aria-label': tr(n), onclick: () => alignEls(k) }, svgIcon(`<path d="${ic}"/>`)))),
      lbl('Taqsimlash'), h('div', { class: 'row2' }, h('button', { class: 'btn btn-sm', id: 'chDistH', disabled: els.length < 3, onclick: () => distribute('x') }, ...icl(I.distH, tr('Gorizontal'))), h('button', { class: 'btn btn-sm', id: 'chDistV', disabled: els.length < 3, onclick: () => distribute('y') }, ...icl(I.distV, tr('Vertikal')))),
      lbl('Rang — hammasiga'), colorRow(undefined, c => mut(p => p.els.forEach(e => { if (!sel.has(e.id)) return; if (e.t === 'zone' || e.t === 'rect' || e.t === 'ellipse' || e.t === 'poly' || e.t === 'row' || e.t === 'text') e.style.fill = c; else e.style.stroke = c; }), 'mc'), false, 'chMultiColor'),
      h('div', { class: 'row2' },
        h('button', { class: 'btn btn-sm', id: 'chGroup', onclick: () => group(!grouped) }, ...icl(I.grp, tr(grouped ? 'Guruhni ajratish' : 'Guruhlash'))),
        h('button', { class: 'btn btn-sm', id: 'chSeq', onclick: () => paletteSeq() }, tr('Palitra ketma-ket'))),
      h('div', { class: 'note' }, tr('Burchakdagi tutqich — hammasini birga kattalashtirish, tepadagi doira — burish. Ctrl+G guruhlash, Ctrl+Shift+G ajratish.'))];
  }
  /** Varaq rasmidagi toʻyingan piksellar ulushi (4-band): 360 px rasm, oq fon hisobga olinmaydi; natija keshda */
  const RC = new Map<string, number | null>();
  function rasterShare(key: string, svg: string, W: number, H: number): number | null {
    if (RC.has(key)) return RC.get(key)!;
    RC.set(key, null); if (RC.size > 60) RC.delete(RC.keys().next().value!);
    const cw = 360, ch = Math.max(1, Math.round(360 * H / W)), img = new Image(), url = URL.createObjectURL(new Blob([svg.replace(/ width="[\d.]+mm" height="[\d.]+mm"/, ` width="${cw}" height="${ch}"`)], { type: 'image/svg+xml' }));
    img.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = cw; c.height = ch; const g = c.getContext('2d')!; g.fillStyle = '#fff'; g.fillRect(0, 0, cw, ch); g.drawImage(img, 0, 0, cw, ch);
        const px = g.getImageData(0, 0, cw, ch).data; let ink = 0, sat = 0;
        for (let i = 0; i < px.length; i += 4) { const r = px[i], gg = px[i + 1], b = px[i + 2], mx = Math.max(r, gg, b), mn = Math.min(r, gg, b); if (mx > 244 && mn > 236) continue; ink++; if ((mx - mn) / Math.max(1, mx) > 0.3 && mx > 60) sat++; }
        RC.set(key, ink ? sat / ink : 0);
      } catch { RC.set(key, -1); }
      URL.revokeObjectURL(url); if (d.ui.rightTab === 'tekshiruv') renderRight();
    };
    img.onerror = () => { RC.set(key, -1); URL.revokeObjectURL(url); if (d.ui.rightTab === 'tekshiruv') renderRight(); };
    img.src = url; return null;
  }
  function checkTab(): HTMLElement[] {
    if (!allPages().length) return [];
    const o = pageOut(d.cur, 'k'), p = P(), auto = isAuto(), pk = auto ? LAST!.PG.pages[d.cur] : null;
    const key = `${d.cur}:${o.svg.length}:${o.svg.slice(-160)}`;
    const mapRoles = new Set(['locator', 'plan']);
    const hasMap = (pk ? [...pk.assign.values()].some(m => mapRoles.has(m.role)) : false) || p.els.some(e => e.t === 'map');
    const hasLegend = (LAST?.PG.pages ?? []).some(q => [...q.assign.values()].some(m => m.role === 'legend')) || allPages().some(q => q.els.some(e => e.t === 'legend'));
    const cs = sheetChecks({ svg: o.svg, empty: pk ? pk.empty.size : 0, left: auto ? (LAST?.PG.left ?? []).map(m => m.name) : [], hasMap, hasLegend, share: rasterShare(key, o.svg, o.widthMm, o.heightMm) }, tr);
    const ok = cs.filter(c => c.st === 'o').length;
    const old = pageChecks(p, tr);
    const mark = (s: string) => s === 'o' ? h('span', { class: 'ch-okm', 'aria-label': tr('bajarildi') }, svgIcon('<path d="M5 12l5 5 9-10"/>')) : s === 'f' ? h('span', { class: 'ch-fm', 'aria-label': tr('xato') }, svgIcon(I.x)) : s === 'p' ? h('span', { class: 'ch-pm', 'aria-label': tr('hisoblanmoqda…') }) : h('span', { class: 'ch-wm', 'aria-label': tr('ogohlantirish') }, svgIcon(I.warn));
    const row = (c: Check9) => h('div', { class: 'li', 'data-check': c.id, 'data-st': c.st },
      h('span', { class: 'k' }, c.title, h('span', { class: 'sub' }, c.note, ...(c.sw ?? []).map(x => h('i', { class: 'ch-dotc', style: `background:${x}`, title: x })))),
      c.fix && old.some(q => q.id === c.fix && q.fix) && p.els.length ? h('button', { class: 'btn btn-sm', 'data-fix': c.fix, onclick: () => { mut(pp => { const f = applyFix(pp, c.fix!, d.palette); pp.els = f.els; }); toast(tr('Tuzatildi')); } }, old.find(q => q.id === c.fix)!.fix!) : '',
      mark(c.st));
    const grp = (g: Check9['group']) => h('div', { class: 'group', 'data-cgroup': g }, ...cs.filter(c => c.group === g).map(row));
    return [h('div', { class: 'ch-eh ch-eh-row' }, h('b', { class: 't-title' }, tr('Tekshiruv')), h('span', { class: `chip ${ok === cs.length ? 'ok' : 'warn'}`, id: 'chCheckSum' }, h('i'), `${ok} / ${cs.length}`)),
      lbl('Joylashuv'), grp('Joylashuv'),
      h('div', { class: 'glabel' }, h('span', {}, tr('Rang · 7 band')), h('button', { class: 'btn btn-sm', id: 'chGray', 'aria-pressed': gray, onclick: () => { gray = !gray; renderCanvas(); renderRight(); } }, tr(gray ? 'Kulrang sinov ✓' : 'Kulrang sinov'))),
      h('div', { id: 'chChecks' }, grp('Rang')),
      h('details', { class: 'ch-how' }, h('summary', {}, tr('Qanday tanlanadi')), h('div', {}, tr('Dvigatel maketdagi hamma varaq turini sinaydi: toʻlgan katak ball qoʻshadi, boʻsh katak ball ayiradi. Kam varaq, boʻsh katak yoʻq va joysiz material qolmagan ketma-ketlik tanlanadi. Rang bandlari varaqdagi hamma rangdan (qoʻlda chizilganlar ham) hisoblanadi; «asos jimroq» — varaq rasmidagi toʻyingan piksellar ulushi.'))),
      h('span', { class: 't-small' }, tr('Kulrang sinov varaqni kulrangda koʻrsatadi — toifalar yorqinlik boʻyicha ham ajralishi kerak.'))];
  }

  /* ---------- varaq, koʻrinish ---------- */
  const PXMM = 96 / 25.4;
  function stageSize(): [number, number] { const [W, H] = pageSize(P()); return [W * PXMM * zoom, H * PXMM * zoom]; }
  function fit(): void { const r = view.getBoundingClientRect(), [W, H] = pageSize(P()); if (!r.width) return; zoom = Math.min((r.width - 60) / (W * PXMM), (r.height - 130) / (H * PXMM)); const [sw2, sh2] = stageSize(); panX = (r.width - sw2) / 2; panY = (r.height - sh2) / 2 - 22; applyView(); }
  function applyView(): void {
    if (d.auto.view !== 'one') return;
    if (!zoom) { fit(); return; }
    const [sw2, sh2] = stageSize();
    stage.style.width = `${sw2}px`; stage.style.height = `${sh2}px`; stage.style.transform = `translate(${panX}px, ${panY}px)`;
    zoomBox.replaceChildren(
      h('button', { class: 'btn btn-ghost icon-btn btn-sm', 'aria-label': tr('Kichraytirish'), onclick: () => zoomAt(1 / 1.25) }, svgIcon('<path d="M5 12h14"/>')),
      h('span', { class: 'num t-small', id: 'chZoom' }, `${Math.round(zoom * 100)} %`),
      h('button', { class: 'btn btn-ghost icon-btn btn-sm', 'aria-label': tr('Kattalashtirish'), onclick: () => zoomAt(1.25) }, svgIcon(IC.plus)),
      h('button', { class: 'btn btn-ghost btn-sm', id: 'chFit', onclick: () => fit() }, tr('Sigʻdirish')),
      h('button', { class: 'btn btn-ghost btn-sm hide-n', id: 'ch100', onclick: () => { const r = view.getBoundingClientRect(); zoomAt(1 / zoom, r.width / 2, r.height / 2); } }, '100 %'));
  }
  function zoomAt(f: number, cx?: number, cy?: number): void {
    const r = view.getBoundingClientRect(); cx ??= r.width / 2; cy ??= r.height / 2;
    const nz = Math.max(0.05, Math.min(20, zoom * f)), k = nz / zoom;
    panX = cx - (cx - panX) * k; panY = cy - (cy - panY) * k; zoom = nz; applyView(); renderOverlay();
  }
  /** ekran → varaq (mm) */
  const toMm = (ev: { clientX: number; clientY: number }): [number, number] => { const r = stage.getBoundingClientRect(), [W, H] = pageSize(P()); return [(ev.clientX - r.left) / r.width * W, (ev.clientY - r.top) / r.height * H]; };
  const pxMm = () => 1 / (PXMM * zoom);

  let renderQ = 0;
  function renderCanvas(): void {
    if (d.auto.view !== 'one') return;
    cancelAnimationFrame(renderQ);
    renderQ = requestAnimationFrame(() => {
      const p = withToc(P()), auto = isAuto();
      const { svg, w, h: H } = pageSvg(p, { tr, grid: gridOn, idp: 'v', ...(auto ? { bg: BG[d.cur] + (UIX[d.cur] ?? '') } : albumDeco(d.cur)) });
      pageHost.innerHTML = svg;
      const s = pageHost.firstElementChild as SVGSVGElement; s.removeAttribute('width'); s.removeAttribute('height');
      grayHost.hidden = !gray; if (gray) { grayHost.innerHTML = svg.replace(/\bid="/g, 'id="g').replace(/url\(#/g, 'url(#g'); const g = grayHost.firstElementChild as SVGSVGElement; g.removeAttribute('width'); g.removeAttribute('height'); }
      over.setAttribute('viewBox', `0 0 ${w} ${H}`);
      renderOverlay(); syncPanels(); renderPnav();
    });
  }
  const albumDeco = (i: number) => ({ num: d.album.numbering && allPages().length > 1 ? { i: i + 1, total: allPages().length } : undefined, stamp: d.album.stamp ? { title: d.title, author: d.album.author, date: today() } : null });
  /** «Mundarija» namunasi: albom sozlamasida yoqilgan boʻlsa — varaq nomlaridan */
  function withToc(p: ChPage): ChPage {
    if (!d.album.toc || p.tpl !== 'mr-mundarija' && p.tpl !== 'xf-mundarija') return p;
    const q: ChPage = { ...p, els: p.els.map(e => ({ ...e })) }, list = q.els.filter(e => e.t === 'text').sort((a, b) => (a.y ?? 0) - (b.y ?? 0))[2] ?? q.els.filter(e => e.t === 'text')[1];
    if (list) list.text = allPages().map((x, i) => `${String(i + 1).padStart(2, '0')}  ${tr(x.name)}`).join('\n');
    return q;
  }
  function renderAllView(): void {
    allView.replaceChildren(...allPages().map((p, i) => h('button', { class: `ch-card${i === d.cur ? ' cur' : ''}`, 'data-card': i, onclick: () => goPage(i) },
      h('span', { class: 'ch-thumb', html: thumbOf(i) }),
      h('span', { class: 'ch-cap' }, h('b', { class: 'mono' }, String(i + 1).padStart(2, '0')), ` ${tr(p.name)}`, isAuto(i) && LAST ? h('em', { class: 'mono' }, `${LAST.PG.pages[i].assign.size}/${LAST.PG.pages[i].assign.size + LAST.PG.pages[i].empty.size}`) : h('em', {}, tr('erkin'))))));
    if (!allPages().length) allView.append(h('div', { class: 'empty' }, svgIcon(I.layers), h('b', {}, tr('Varaq yoʻq')), h('span', {}, tr('Chapdagi «Loyihadan» boʻlimida kamida bitta materialni yoqing.'))));
  }

  /* ---------- ustqatlam: tanlov, tutqichlar, qoralama, yoʻnaltiruvchi chiziqlar, sudrash koʻrsatkichi ---------- */
  let draft: ChEl | null = null, guides: [number, number, number, number][] = [], marquee: [number, number, number, number] | null = null;
  let dropHint: { r: { x: number; y: number; w: number; h: number }; ok: boolean; label: string } | null = null;
  function renderOverlay(): void {
    const k = pxMm(), s: string[] = [];
    if (draft) s.push(`<g opacity="0.85">${pageSvg({ ...P(), layers: [{ id: 'd', name: 'd', visible: true, locked: false }], els: [{ ...draft, layer: 'd' }] }, { tr }).svg.replace(/^<svg[^>]*>|<\/svg>$/g, '').replace(/<rect x="0" y="0"[^>]*\/>/, '')}</g>`);
    if (draft?.pts) s.push(`<path d="${draft.pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join('')}" fill="none" stroke="#2f6feb" stroke-width="${k}" stroke-dasharray="${4 * k} ${3 * k}"/>`, ...draft.pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="${3 * k}" fill="#fff" stroke="#2f6feb" stroke-width="${k}"/>`));
    const els = selected();
    if (els.length) {
      const B = unionBox(els);
      for (const e of els) { const b = bbox(e); s.push(`<rect x="${b[0]}" y="${b[1]}" width="${b[2] - b[0]}" height="${b[3] - b[1]}" fill="none" stroke="#2f6feb" stroke-width="${k}" stroke-dasharray="${3 * k} ${2 * k}"${e.rot ? ` transform="rotate(${e.rot} ${(b[0] + b[2]) / 2} ${(b[1] + b[3]) / 2})"` : ''}/>`); }
      if (els.length > 1) s.push(`<rect x="${B[0]}" y="${B[1]}" width="${B[2] - B[0]}" height="${B[3] - B[1]}" fill="none" stroke="#2f6feb" stroke-width="${k}"/>`);
      const one = els.length === 1 ? els[0] : null;
      if (one?.pts && one.t !== 'pen' && editable(one) && !one.rot) one.pts.forEach((p, i) => s.push(`<circle class="hv" data-vx="${i}" cx="${p[0]}" cy="${p[1]}" r="${4 * k}" fill="#fff" stroke="#2f6feb" stroke-width="${1.2 * k}"/>`));
      else if (els.every(editable)) handles(B).map(([x, y, c]): [number, number, string] => (one?.rot ? [...rotP([x, y], one.rot, [(B[0] + B[2]) / 2, (B[1] + B[3]) / 2]), c] : [x, y, c])).forEach(([x, y, c]) => s.push(`<rect class="hr" data-h="${c}" x="${x - 3.5 * k}" y="${y - 3.5 * k}" width="${7 * k}" height="${7 * k}" fill="#fff" stroke="#2f6feb" stroke-width="${1.2 * k}"/>`));
      if (els.every(editable)) { const c0: [number, number] = [(B[0] + B[2]) / 2, (B[1] + B[3]) / 2], r = one?.rot ?? 0, a = rotP([c0[0], B[1]], r, c0), q = rotP([c0[0], B[1] - 22 * k], r, c0); s.push(`<path d="M${a[0]} ${a[1]}L${q[0]} ${q[1]}" stroke="#2f6feb" stroke-width="${k}"/><circle class="hrot" data-rot="1" cx="${q[0]}" cy="${q[1]}" r="${5 * k}" fill="#fff" stroke="#2f6feb" stroke-width="${1.2 * k}"/>`); }
    }
    guides.forEach(([x0, y0, x1, y1]) => s.push(`<path d="M${x0} ${y0}L${x1} ${y1}" stroke="#e0574f" stroke-width="${k}"/>`));
    if (marquee) { const [a, b, c, dd] = marquee; s.push(`<rect x="${Math.min(a, c)}" y="${Math.min(b, dd)}" width="${Math.abs(c - a)}" height="${Math.abs(dd - b)}" fill="#2f6feb" fill-opacity="0.06" stroke="#2f6feb" stroke-width="${k}"/>`); }
    if (dropHint) { const { r, ok, label } = dropHint, c = ok ? '#2a6fb0' : '#b23a2e', fs = 12 * k; s.push(`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${c}" fill-opacity=".1" stroke="${c}" stroke-width="${2 * k}"/><rect x="${r.x}" y="${r.y}" width="${label.length * fs * 0.56 + 10 * k}" height="${fs * 1.6}" fill="${c}"/><text x="${r.x + 5 * k}" y="${r.y + fs * 1.15}" font-size="${fs}" font-family="Archivo, sans-serif" font-weight="600" fill="#fff">${label.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`); }
    over.innerHTML = s.join('');
    renderSlotUi();
  }
  /** Joriy varaqdagi tanlangan material katagi ustida panel; boʻsh kataklarda «+» (katakka material qoʻyish) */
  function renderSlotUi(): void {
    renderSlotUi0();
    // panel va izoh koʻrinadigan maydondan chiqmasin (katak oʻng chetda boʻlsa)
    const vr = view.getBoundingClientRect();
    slotUi.querySelectorAll<HTMLElement>('.ch-slotbar, .ch-crophint').forEach(el => {
      const br = el.getBoundingClientRect(); let dx = 0;
      if (br.right > vr.right - 8) dx = vr.right - 8 - br.right;
      if (br.left + dx < vr.left + 8) dx = vr.left + 8 - br.left;
      if (dx) el.style.left = `${parseFloat(el.style.left) + dx}px`;
    });
  }
  function renderSlotUi0(): void {
    if (editing) return;
    slotUi.replaceChildren();
    if (!isAuto() || !LAST || d.auto.view !== 'one' || tool !== 'select' || draft || dropHint) return;
    const ap = LAST.pages[d.cur]; if (!ap) return;
    const sc = PXMM * zoom, f = fam(), fmt = fmtOf(f);
    ap.fill.empty.forEach(k => {
      const sl = ap.fill.page.slots[k], r = slotRectOf(f, ap.fill.page, fmt, sl);
      if (r.w * sc < 44 || r.h * sc < 44) return;
      // katak markazida erkin element boʻlsa — «+» uni toʻsmasin
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      if (P().els.some(e => { const b = bbox(e); return cx >= b[0] && cx <= b[2] && cy >= b[1] && cy <= b[3]; })) return;
      const role = tr(LAYOUTS.roles[sl.role][0]);
      const b = h('button', { class: 'ch-slotadd', 'data-k': String(k), title: `${tr('Katakka material qoʻyish')} · ${role}`, 'aria-label': `${tr('Katakka material qoʻyish')} · ${role}`,
        style: `left:${(r.x + r.w / 2) * sc}px;top:${(r.y + r.h / 2) * sc}px`, onclick: (e: Event) => slotPick(e.currentTarget as HTMLElement, d.cur, k, null) }, svgIcon(IC.plus));
      slotUi.append(b);
    });
    const c = matSel ? cellsOf(d.cur).find(x => x.el === matSel) : null, m = c ? MATS.find(x => x.id === c.el) : null;
    if (!c || !m) return;
    const k = [...ap.fill.assign.entries()].find(([, e]) => e.id === m.id)?.[0];
    const pos = `left:${c.r.x * sc}px;top:${Math.max(0, c.r.y * sc - 44)}px`;
    if (crop === m.id) {
      // kesish rejimi: kattalashtirish, asliga qaytarish, tayyor
      const v = viewOf(m.id), zz = (f: number) => autoMut(() => setView(m.id, { ...viewOf(m.id), z: viewOf(m.id).z * f }), 'cz');
      slotUi.append(h('div', { class: 'ch-slotbar glassbar crop', id: 'chCropBar', role: 'toolbar', 'aria-label': tr('Kadrlash'), style: pos },
        h('button', { class: 'btn btn-ghost icon-btn btn-sm', id: 'chCropOut', 'aria-label': tr('Kichraytirish'), disabled: v.z <= 1, onclick: () => zz(1 / 1.25) }, svgIcon('<path d="M5 12h14"/>')),
        h('span', { class: 'num t-small', id: 'chCropZ' }, `${Math.round(v.z * 100)} %`),
        h('button', { class: 'btn btn-ghost icon-btn btn-sm', id: 'chCropIn', 'aria-label': tr('Kattalashtirish'), disabled: v.z >= 8, onclick: () => zz(1.25) }, svgIcon(IC.plus)),
        h('button', { class: 'btn btn-ghost btn-sm', id: 'chCropReset', disabled: !matSet(m.id).view, onclick: () => autoMut(() => setView(m.id, { z: 1, cx: 0, cy: 0 })) }, tr('Asliga')),
        h('button', { class: 'btn btn-sm btn-primary', id: 'chCropDone', onclick: () => cropOn(null) }, tr('Tayyor'))));
      slotUi.append(h('div', { class: 'ch-crophint', style: `left:${(c.r.x + c.r.w / 2) * sc}px;top:${(c.r.y + c.r.h) * sc + 8}px` }, tr('Sudrang — surish · gʻildirak — kattalashtirish · Esc — tayyor')));
      return;
    }
    const bar = h('div', { class: 'ch-slotbar glassbar', id: 'chSlotBar', role: 'toolbar', 'aria-label': tr(m.name), style: pos },
      c.r.w * sc >= 360 ? h('span', { class: 'nm', title: tr('Sarlavhani ikki marta bosing — tahrirlash') }, tr(m.name)) : '',
      k != null ? h('button', { class: 'btn btn-ghost btn-sm', id: 'chSlotSwap', onclick: (e: Event) => slotPick(e.currentTarget as HTMLElement, d.cur, k, m.id) }, ...icl(I.swap, tr('Almashtirish'))) : '',
      m.kind === 'note' ? h('button', { class: 'btn btn-ghost btn-sm', id: 'chSlotText', onclick: () => editInline(m.id, 'text') }, ...icl(I.pen, tr('Matnni tahrirlash'))) : '',
      croppable(m) ? h('button', { class: 'btn btn-ghost btn-sm', id: 'chSlotCrop', title: tr('Ikki marta bosish — ham'), onclick: () => cropOn(m.id) }, ...icl(I.crop, tr('Kadrlash'))) : '',
      croppable(m) ? h('button', { class: 'btn btn-ghost btn-sm', id: 'chSlotFree', title: tr('Maketdan ajratib, erkin surish va oʻlchamini oʻzgartirish'), onclick: () => detachMat(m.id) }, ...icl(I.free, tr('Erkin'))) : '',
      h('button', { class: 'btn btn-ghost btn-sm', id: 'chSlotHide', onclick: () => hideMat(m.id) }, ...icl(I.trash, tr('Oʻchirish'))));
    slotUi.append(bar);
  }
  /** Katakka qoʻyish mumkin boʻlgan materiallar menyusi (rol mos keladiganlar): joysiz / oʻchiqlar — birinchi */
  function slotPick(anchor: HTMLElement, pi: number, k: number, cur: string | null): void {
    wrap.querySelector('.ch-menu')?.remove();
    const pk = LAST?.PG.pages[pi]; if (!pk) return;
    const onPage = new Set([...pk.assign.values()].map(x => x.id));
    // juft material (vaziyat sxemasi, eksplikatsiya) — faqat oʻz rejasi shu varaqda boʻlsa
    const sl = pk.page.slots[k], ok = MATS.filter(x => x.role !== 'title' && x.id !== cur && accepts(sl.role, x.role) && (!x.pair || onPage.has(x.pair)));
    const st = (x: Material) => (!x.visible ? tr('oʻchiq') : PLACE[x.id] ? tf('${n}-varaqda', { n: PLACE[x.id].pi + 1 }) : tr('joysiz'));
    const free = ok.filter(x => !x.visible || !PLACE[x.id]), busy = ok.filter(x => x.visible && PLACE[x.id]);
    const item = (x: Material) => h('button', { class: 'mi', 'data-pick': x.id, onclick: () => { m.remove(); placeMat(x.id, pi, k); } }, h('span', {}, tr(x.name), h('small', {}, st(x))));
    const m = h('div', { class: 'menu ch-menu ch-tplmenu', role: 'menu', id: 'chSlotPick' },
      h('div', { class: 'mh' }, `${tr('Katakka')}: ${tr(LAYOUTS.roles[sl.role][0]).toLowerCase()}`),
      ...(ok.length ? [...(free.length ? [h('div', { class: 'mh' }, tr('Varaqlarda yoʻq')), ...free.map(item)] : []), ...(busy.length ? [h('div', { class: 'mh' }, tr('Boshqa katakdan koʻchirish')), ...busy.map(item)] : [])]
        : [h('div', { class: 'mi d' }, tr('Bu katakka mos material yoʻq'))]));
    m.addEventListener('click', e => e.stopPropagation()); m.addEventListener('pointerdown', e => e.stopPropagation()); wrap.append(m);
    const r = anchor.getBoundingClientRect(); m.style.left = `${Math.max(8, Math.min(r.left, innerWidth - m.offsetWidth - 8))}px`; m.style.top = `${Math.max(8, Math.min(r.bottom + 6, innerHeight - m.offsetHeight - 8))}px`;
    (m.querySelector('button') as HTMLElement | null)?.focus();
    m.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); m.remove(); anchor.focus(); } });
    setTimeout(() => document.addEventListener('click', () => m.remove(), { once: true }), 0);
  }
  /** Materialni katakka qoʻyish (sudrab qoʻyish bilan bir xil) */
  function placeMat(id: string, pi: number, k: number): void {
    const a = MATS.find(x => x.id === id); if (!a) return;
    autoMut(() => { pin(pi); matSet(id).visible = true; d.auto.ov = d.auto.ov.filter(o => o.a !== id && !(o.pi === pi && o.k === k)); d.auto.ov.push({ a: id, pi, k }); matSel = id; });
    toast(`${tr(a.name)} — ${tf('${n}-varaqqa qoʻyildi', { n: pi + 1 })}`);
  }
  /** Material qoʻshilsa/olinsa sahifalash qayta hisoblanadi — shu varaqgacha varaq turlari saqlanadi (katak raqami oʻzgarmasin) */
  function pin(pi: number): void { LAST?.PG.pages.slice(0, pi + 1).forEach((pk, i) => { d.auto.force[i] ??= pk.page.id; }); }
  /** Kesiladigan materiallar: xarita (reja) va rasmlar */
  const croppable = (m: Material | undefined) => !!m && (m.role === 'plan' || m.role === 'image' || !!m.own);
  const viewOf = (id: string): ChView => matSet(id).view ?? { z: 1, cx: 0, cy: 0 };
  function setView(id: string, v: ChView): void { const s2 = matSet(id), c = clampView(v); if (c.z === 1 && Math.abs(c.cx) < 1e-4 && Math.abs(c.cy) < 1e-4) delete s2.view; else s2.view = c; }
  function cropOn(id: string | null): void { crop = id; if (id && matSel !== id) { selectMat(id); return; } renderOverlay(); renderRight(); }
  /** Varaqning oʻzida tahrirlash: katak ustida maydon; Enter (sarlavha) yoki Ctrl+Enter / tashqariga bosish — saqlash, Esc — bekor */
  function editInline(id: string, what: 'title' | 'text'): void {
    const m = MATS.find(x => x.id === id), c = cellsOf(d.cur).find(x => x.el === id); if (!m || !c) return;
    if (matSel !== id) { matSel = id; d.ui.rightTab = 'element'; relayout(); renderAll(); }
    crop = null; editing = null; renderSlotUi();
    const sc = PXMM * zoom, u = (LAST?.pages[d.cur]?.fr.u ?? 1) * m.scale, r = c.r;
    const val = what === 'title' ? m.title : (m.text ?? (R ? tr(autoNote(R)) : ''));
    const box = what === 'title'
      ? h('input', { class: 'input ch-inedit', id: 'chInEdit', value: val, 'aria-label': tr('Sarlavha'), style: `left:${r.x * sc}px;top:${r.y * sc}px;width:${Math.max(160, r.w * sc)}px;height:${Math.max(32, 8 * u * sc)}px` }) as HTMLInputElement
      : h('textarea', { class: 'input ch-inedit', id: 'chInEdit', 'aria-label': tr('Matn'), style: `left:${r.x * sc}px;top:${(r.y + 8 * u) * sc}px;width:${Math.max(200, r.w * sc)}px;height:${Math.max(120, (r.h - 8 * u) * sc)}px` }, val) as HTMLTextAreaElement;
    let done = false;
    const finish = (save: boolean) => {
      if (done) return; done = true; editing = null; box.remove();
      const v = box.value;
      if (save && v !== val) autoMut(() => { const s2 = matSet(id); if (what === 'title') { if (v.trim()) s2.title = v.trim(); else delete s2.title; } else s2.text = v; }, `in${what}`);
      else renderOverlay();
      view.focus({ preventScroll: true });
    };
    editing = { id, what, cancel: () => finish(false) };
    box.addEventListener('keydown', e => { const ke = e as KeyboardEvent; if (ke.key === 'Enter' && (what === 'title' || ke.ctrlKey || ke.metaKey)) { ke.preventDefault(); finish(true); } });
    slotUi.append(box);
    // sichqoncha bosilishining odatiy fokusi (view) dan keyin — aks holda maydon darrov fokusni yoʻqotadi
    setTimeout(() => { if (done) return; box.focus(); if (what === 'title') (box as HTMLInputElement).select(); box.addEventListener('blur', () => finish(true)); }, 0);
  }
  /** Katakdagi xarita yoki rasmni maketdan ajratish: shu joyda erkin element (surish, oʻlcham, burish), material albomdan olinadi */
  function detachMat(id: string): void {
    const m = MATS.find(x => x.id === id), c = cellsOf(d.cur).find(x => x.el === id), ap = LAST?.pages[d.cur]; if (!m || !c || !ap || !m.render) return;
    const els = captureEls(() => m.render!(c.r, { u: ap.fr.u, P: PAL[d.auto.pal] ?? PAL.arch }, false));
    const src = els[0]; if (!src) { toast(tr('Bu materialni erkin elementga aylantirib boʻlmaydi')); return; }
    const pi = d.cur;
    autoMut(() => { pin(pi); matSet(id).visible = false; d.auto.ov = d.auto.ov.filter(o => o.a !== id); matSel = null; crop = null; });
    // varaqqa qulflangan bogʻlanish — ostidagi katakka keyin boshqa material tushsa ham u bilan koʻchmaydi
    const e: ChEl = { ...src, id: cid(), layer: L().id, name: tr(m.name), a: { el: null, pi, r0: { ...pageRect(pi) }, lock: true } };
    addEl(e);
    toast(tf('«${n}» endi erkin element: surish, oʻlcham va burish mumkin. Qaytarish — Ctrl+Z', { n: tr(m.name) }));
  }
  /** Materialni albomdan olish: varaq turi saqlanadi, katakni maket boshqa material bilan toʻldirishi yoki boʻsh («+») qoldirishi mumkin */
  function hideMat(id: string): void {
    const a = MATS.find(x => x.id === id), pi = d.cur, pg = LAST?.PG.pages[pi]?.page.id; if (!a) return;
    autoMut(() => { matSet(id).visible = false; d.auto.ov = d.auto.ov.filter(o => o.a !== id); if (pg && isAuto(pi)) pin(pi); matSel = null; });
    toast(tf('«${n}» albomdan olindi. Qaytarish — Ctrl+Z yoki chapdagi roʻyxat', { n: tr(a.name) }));
  }
  const rotP = (p: [number, number], deg: number, c: [number, number]): [number, number] => { const a = deg * Math.PI / 180, co = Math.cos(a), si = Math.sin(a), dx = p[0] - c[0], dy = p[1] - c[1]; return [c[0] + dx * co - dy * si, c[1] + dx * si + dy * co]; };
  const unionBox = (els: ChEl[]): [number, number, number, number] => els.map(bbox).reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]);
  const handles = (B: number[]): [number, number, string][] => { const [a, b, c, dd] = B, mx = (a + c) / 2, my = (b + dd) / 2; return [[a, b, 'nw'], [mx, b, 'n'], [c, b, 'ne'], [c, my, 'e'], [c, dd, 'se'], [mx, dd, 's'], [a, dd, 'sw'], [a, my, 'w']]; };

  /* ---------- yopishish (magnit, 5 mm toʻr) ---------- */
  function snapMove(B: [number, number, number, number], dx: number, dy: number, skip: Set<string>): [number, number] {
    guides = [];
    if (gridOn) { const gx = Math.round((B[0] + dx) / 5) * 5 - B[0], gy = Math.round((B[1] + dy) / 5) * 5 - B[1]; return [gx, gy]; }
    if (!magnet) return [dx, dy];
    const tol = 6 * pxMm(), [W, H] = pageSize(P());
    const xs: number[] = [0, W / 2, W], ys: number[] = [0, H / 2, H];
    P().els.forEach(e => { if (skip.has(e.id)) return; const b = bbox(e); xs.push(b[0], (b[0] + b[2]) / 2, b[2]); ys.push(b[1], (b[1] + b[3]) / 2, b[3]); });
    if (isAuto()) cellsOf(d.cur).forEach(c => { xs.push(c.r.x, c.r.x + c.r.w / 2, c.r.x + c.r.w); ys.push(c.r.y, c.r.y + c.r.h / 2, c.r.y + c.r.h); });
    const mine = (o: number, a: number, c: number) => [a + o, (a + c) / 2 + o, c + o];
    let bx = dx, by = dy, best = tol, bestY = tol, gx: number | null = null, gy: number | null = null;
    for (const m of mine(dx, B[0], B[2])) for (const x of xs) { const dd = Math.abs(m - x); if (dd < best) { best = dd; bx = dx + (x - m); gx = x; } }
    for (const m of mine(dy, B[1], B[3])) for (const y of ys) { const dd = Math.abs(m - y); if (dd < bestY) { bestY = dd; by = dy + (y - m); gy = y; } }
    if (gx != null) guides.push([gx, 0, gx, H]); if (gy != null) guides.push([0, gy, W, gy]);
    return [bx, by];
  }
  const snapPt = (p: [number, number]): [number, number] => (gridOn ? [Math.round(p[0] / 5) * 5, Math.round(p[1] / 5) * 5] : p);

  /* ---------- sichqoncha ---------- */
  type Box = [number, number, number, number];
  type Drag = { kind: 'move'; start: [number, number]; orig: ChEl[]; B: Box } | { kind: 'resize'; h: string; orig: ChEl[]; B: Box } | { kind: 'rotate'; orig: ChEl[]; c: [number, number]; a0: number }
    | { kind: 'vertex'; id: string; i: number } | { kind: 'marquee'; start: [number, number] } | { kind: 'pan'; x: number; y: number; px: number; py: number } | { kind: 'draw'; start: [number, number] } | { kind: 'mappan'; id: string; start: [number, number]; vb: Box } | { kind: 'croppan'; id: string; start: [number, number]; v0: ChView; w: number; h: number };
  let drag: Drag | null = null, space = false, DRAG: string | null = null, cropRaf = 0, lastTap = { id: '', t: -1e9 };
  const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o));
  view.addEventListener('wheel', ev => {
    ev.preventDefault();
    if (crop && isAuto() && !(ev.ctrlKey || ev.metaKey)) {
      const c = cellsOf(d.cur).find(x => x.el === crop), p = toMm(ev);
      if (c && p[0] >= c.r.x && p[0] <= c.r.x + c.r.w && p[1] >= c.r.y && p[1] <= c.r.y + c.r.h) { const id = crop; commit('cw'); setView(id, { ...viewOf(id), z: viewOf(id).z * (ev.deltaY < 0 ? 1.1 : 1 / 1.1) }); relayout(); dirty(); renderCanvas(); renderOverlay(); return; }
    }
    const r = view.getBoundingClientRect(); if (ev.ctrlKey || ev.metaKey) zoomAt(ev.deltaY < 0 ? 1.1 : 1 / 1.1, ev.clientX - r.left, ev.clientY - r.top); else { panX -= ev.deltaX; panY -= ev.deltaY; applyView(); } }, { passive: false });
  view.addEventListener('pointerdown', ev => {
    if (float) { float = null; syncPanels(); }
    view.focus({ preventScroll: true });
    if (ev.button === 1 || space) { drag = { kind: 'pan', x: ev.clientX, y: ev.clientY, px: panX, py: panY }; view.setPointerCapture(ev.pointerId); return; }
    if (ev.button !== 0) return;
    const m = toMm(ev), t = ev.target as Element;
    if (tool === 'select') {
      const hv = t.closest('.hv') as SVGElement | null, hr = t.closest('.hr') as SVGElement | null, hrot = t.closest('.hrot');
      if (hv) { const one = selected()[0]; commit(); drag = { kind: 'vertex', id: one.id, i: Number(hv.dataset.vx) }; view.setPointerCapture(ev.pointerId); return; }
      if (hr) { const els = selected(); commit(); drag = { kind: 'resize', h: hr.dataset.h!, orig: els.map(clone), B: unionBox(els) }; view.setPointerCapture(ev.pointerId); return; }
      if (hrot) { const els = selected(), B = unionBox(els), c: [number, number] = [(B[0] + B[2]) / 2, (B[1] + B[3]) / 2]; commit(); drag = { kind: 'rotate', orig: els.map(clone), c, a0: Math.atan2(m[1] - c[1], m[0] - c[0]) }; view.setPointerCapture(ev.pointerId); return; }
      const hit = (t.closest('[data-id]') as SVGElement | null)?.dataset.id;
      const e = hit ? P().els.find(x => x.id === hit) : undefined;
      if (e && editable(e)) {
        const ids = e.group ? P().els.filter(x => x.group === e.group).map(x => x.id) : [e.id];
        if (ev.shiftKey) ids.forEach(id => (sel.has(id) ? sel.delete(id) : sel.add(id))); else if (!sel.has(e.id)) sel = new Set(ids);
        if (matSel) { matSel = null; relayout(); renderCanvas(); }
        d.ui.rightTab = 'element';
        if (ev.altKey && e.t === 'map' && e.vb) { commit(); drag = { kind: 'mappan', id: e.id, start: m, vb: [...e.vb] as Box }; }
        else { const els = selected(); commit(); drag = { kind: 'move', start: m, orig: els.map(clone), B: unionBox(els) }; }
        view.setPointerCapture(ev.pointerId); renderOverlay(); renderRight(); renderLeft(); return;
      }
      const me = (t.closest('[data-el]') as SVGElement | null)?.dataset.el;
      if (crop && isAuto()) {
        const c = cellsOf(d.cur).find(x => x.el === crop);
        if (me === crop && c) { commit('crop' + Date.now()); drag = { kind: 'croppan', id: crop, start: m, v0: viewOf(crop), w: c.r.w, h: c.r.h }; view.setPointerCapture(ev.pointerId); view.classList.add('cropping'); return; }
        crop = null;
      }
      // ikki marta bosish (katak qayta chizilgani uchun dblclick hodisasi kelmasligi mumkin — vaqt boʻyicha)
      const dbl = !!me && lastTap.id === me && ev.timeStamp - lastTap.t < 450; lastTap = { id: me ?? '', t: ev.timeStamp };
      if (me && !ev.shiftKey && isAuto() && dbl) {
        const mm = MATS.find(x => x.id === me), c = cellsOf(d.cur).find(x => x.el === me), u = (LAST?.pages[d.cur]?.fr.u ?? 1) * (mm?.scale ?? 1);
        // sarlavha qatori (katak tepasi) — sarlavhani, xulosa matni — matnni, xarita/rasm — kadrlash
        if (mm && c && mm.role !== 'title' && m[1] <= c.r.y + 8 * u && mm.kind !== 'aptnav') { editInline(me, 'title'); return; }
        if (mm?.kind === 'note') { editInline(me, 'text'); return; }
        if (croppable(mm)) { cropOn(me); return; }
      }
      if (me && !ev.shiftKey && isAuto()) { selectMat(me); return; }
      if (!ev.shiftKey) { sel.clear(); if (matSel) { matSel = null; relayout(); renderCanvas(); } }
      drag = { kind: 'marquee', start: m }; marquee = [m[0], m[1], m[0], m[1]]; view.setPointerCapture(ev.pointerId); renderOverlay(); renderRight(); return;
    }
    const p = snapPt(m);
    if (tool === 'poly' || tool === 'flow' || tool === 'zone' || tool === 'row') {
      if (!draft) draft = newEl(tool, [p]);
      if (ev.detail >= 2) { finishDraft(); return; }
      draft.pts!.push(p); renderOverlay(); setHint(); return;
    }
    if (tool === 'icon') { const s = 14; addEl({ ...newEl('icon', []), x: p[0] - s / 2, y: p[1] - s / 2, w: s, h: s }); return; }
    draft = newEl(tool, [p, p]); if (tool === 'pen') draft.pts = [p];
    if (draft.x != null) { draft.x = p[0]; draft.y = p[1]; draft.w = 0; draft.h = 0; }
    drag = { kind: 'draw', start: p }; view.setPointerCapture(ev.pointerId);
  });
  view.addEventListener('pointermove', ev => {
    const m = toMm(ev);
    if (draft && !drag && draft.pts && (tool === 'poly' || tool === 'flow' || tool === 'zone' || tool === 'row')) { const pts = draft.pts; const ghost = { ...draft, pts: [...pts, snapPt(m)] }; const keep = draft; draft = ghost; renderOverlay(); draft = keep; return; }
    if (!drag) return;
    if (drag.kind === 'croppan') {
      const dc = drag, v = dc.v0;
      setView(dc.id, { z: v.z, cx: v.cx - (m[0] - dc.start[0]) / (dc.w * v.z), cy: v.cy - (m[1] - dc.start[1]) / (dc.h * v.z) });
      if (!cropRaf) cropRaf = requestAnimationFrame(() => { cropRaf = 0; relayout(); renderCanvas(); });
      return;
    }
    if (drag.kind === 'pan') { panX = drag.px + ev.clientX - drag.x; panY = drag.py + ev.clientY - drag.y; applyView(); return; }
    if (drag.kind === 'marquee') { marquee = [drag.start[0], drag.start[1], m[0], m[1]]; renderOverlay(); return; }
    if (drag.kind === 'draw' && draft) {
      const p = snapPt(m), s = drag.start;
      if (draft.t === 'pen') { const last = draft.pts![draft.pts!.length - 1]; if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 1.2 * pxMm() * 3) draft.pts!.push(p); }
      else if (draft.pts) draft.pts = [s, ev.shiftKey ? ortho(s, p) : p];
      else { let w = p[0] - s[0], hh = p[1] - s[1]; if (ev.shiftKey) { const q = Math.max(Math.abs(w), Math.abs(hh)); w = Math.sign(w || 1) * q; hh = Math.sign(hh || 1) * q; } draft.x = Math.min(s[0], s[0] + w); draft.y = Math.min(s[1], s[1] + hh); draft.w = Math.abs(w); draft.h = Math.abs(hh); }
      renderOverlay(); return;
    }
    const p = P();
    if (drag.kind === 'move') {
      let dx = m[0] - drag.start[0], dy = m[1] - drag.start[1];
      [dx, dy] = snapMove(drag.B, dx, dy, new Set(drag.orig.map(o => o.id)));
      for (const o of drag.orig) { const i = p.els.findIndex(x => x.id === o.id); if (i >= 0) p.els[i] = moved(o, dx, dy); }
      renderCanvas(); return;
    }
    if (drag.kind === 'rotate') {
      const dr = drag; let deg = (Math.atan2(m[1] - dr.c[1], m[0] - dr.c[0]) - dr.a0) * 180 / Math.PI;
      for (const o of dr.orig) {
        const i = p.els.findIndex(x => x.id === o.id); if (i < 0) continue;
        let dd = deg; if (ev.shiftKey) dd = Math.round(((o.rot ?? 0) + deg) / 15) * 15 - (o.rot ?? 0);
        const b = bbox(o), oc: [number, number] = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2], nc = rotP(oc, dd, dr.c);
        const n = moved(o, nc[0] - oc[0], nc[1] - oc[1]); const r = (((o.rot ?? 0) + dd) % 360 + 540) % 360 - 180; n.rot = Math.abs(r) < 0.01 ? undefined : Math.round(r * 10) / 10; p.els[i] = n;
      }
      renderCanvas(); return;
    }
    if (drag.kind === 'mappan') { const dm = drag; const e = p.els.find(x => x.id === dm.id && x.t === 'map'); if (e?.vb) { const k = dm.vb[2] / Math.abs(e.w ?? 1); e.vb = [dm.vb[0] - (m[0] - dm.start[0]) * k, dm.vb[1] - (m[1] - dm.start[1]) * k, dm.vb[2], dm.vb[3]]; renderCanvas(); } return; }
    if (drag.kind === 'vertex') { const dv = drag; const e = p.els.find(x => x.id === dv.id); if (e?.pts) { e.pts[dv.i] = snapPt(m); renderCanvas(); } return; }
    if (drag.kind === 'resize') {
      const B = drag.B, hh = drag.h, single = drag.orig.length === 1 ? drag.orig[0] : null, rot = single?.rot ?? 0, c0: [number, number] = [(B[0] + B[2]) / 2, (B[1] + B[3]) / 2];
      const q = rot ? rotP(m, -rot, c0) : m; // aylantirilgan shakl: koʻrsatkich shaklning oʻz koordinatasida
      let [x0, y0, x1, y1] = B;
      if (hh.includes('w')) x0 = Math.min(q[0], x1 - 1); if (hh.includes('e')) x1 = Math.max(q[0], x0 + 1);
      if (hh.includes('n')) y0 = Math.min(q[1], y1 - 1); if (hh.includes('s')) y1 = Math.max(q[1], y0 + 1);
      if (ev.shiftKey || drag.orig.some(o => o.t === 'icon' || o.t === 'image' || o.t === 'text' || o.t === 'map')) { const k = Math.max((x1 - x0) / (B[2] - B[0]), (y1 - y0) / (B[3] - B[1])); if (hh.includes('w')) x0 = x1 - (B[2] - B[0]) * k; else x1 = x0 + (B[2] - B[0]) * k; if (hh.includes('n')) y0 = y1 - (B[3] - B[1]) * k; else y1 = y0 + (B[3] - B[1]) * k; }
      for (const o of drag.orig) {
        const i = p.els.findIndex(x => x.id === o.id); if (i < 0) continue;
        const ob = bbox(o), f = (v: number, a: number, b: number, A: number, Bb: number) => A + (v - a) / ((b - a) || 1) * (Bb - A);
        const to: Box = [f(ob[0], B[0], B[2], x0, x1), f(ob[1], B[1], B[3], y0, y1), f(ob[2], B[0], B[2], x0, x1), f(ob[3], B[1], B[3], y0, y1)];
        let n = fitTo(o, ob, to); if (n.t === 'text') fixSize(n);
        if (rot) { // qarama-qarshi burchak joyida qoladi
          const opp: [number, number] = [hh.includes('w') ? B[2] : hh.includes('e') ? B[0] : c0[0], hh.includes('n') ? B[3] : hh.includes('s') ? B[1] : c0[1]];
          const nb = bbox(n), c2: [number, number] = [(nb[0] + nb[2]) / 2, (nb[1] + nb[3]) / 2], oppN: [number, number] = [hh.includes('w') ? nb[2] : hh.includes('e') ? nb[0] : c2[0], hh.includes('n') ? nb[3] : hh.includes('s') ? nb[1] : c2[1]];
          const w0 = rotP(opp, rot, c0), w1 = rotP(oppN, rot, c2); n = moved(n, w0[0] - w1[0], w0[1] - w1[1]);
        }
        p.els[i] = n;
      }
      renderCanvas();
    }
  });
  const ortho = (a: [number, number], b: [number, number]): [number, number] => { const ang = Math.round(Math.atan2(b[1] - a[1], b[0] - a[0]) / (Math.PI / 4)) * Math.PI / 4, L = Math.hypot(b[0] - a[0], b[1] - a[1]); return [a[0] + Math.cos(ang) * L, a[1] + Math.sin(ang) * L]; };
  view.addEventListener('pointerup', () => {
    const dr = drag; drag = null; guides = [];
    if (!dr) return;
    if (dr.kind === 'marquee' && marquee) {
      const [a, b, c, dd] = marquee, x0 = Math.min(a, c), x1 = Math.max(a, c), y0 = Math.min(b, dd), y1 = Math.max(b, dd);
      if (x1 - x0 > 0.5 || y1 - y0 > 0.5) P().els.forEach(e => { if (!editable(e)) return; const bb = bbox(e); if (bb[0] < x1 && bb[2] > x0 && bb[1] < y1 && bb[3] > y0) sel.add(e.id); });
      if (sel.size) { const g = new Set(P().els.filter(e => sel.has(e.id) && e.group).map(e => e.group)); P().els.forEach(e => { if (e.group && g.has(e.group)) sel.add(e.id); }); }
      marquee = null; renderOverlay(); renderRight(); renderLeft(); return;
    }
    if (dr.kind === 'draw' && draft) {
      const e = draft; draft = null;
      if (e.t === 'pen') { if ((e.pts?.length ?? 0) > 2) addEl({ ...e, pts: simplify(e.pts!, 0.4) }); else renderOverlay(); return; }
      if (e.pts) { const [a, b] = e.pts; if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 1) { e.pts = [a, [a[0] + 40, a[1]]]; } addEl(e); return; }
      if ((e.w ?? 0) < 2 || (e.h ?? 0) < 2) { const def: Partial<Record<ElType, [number, number]>> = { rect: [40, 25], ellipse: [30, 30], map: [160, 110], image: [80, 60], text: [0, 0] }; const [w, hh] = def[e.t] ?? [30, 20]; e.w = w; e.h = hh; }
      addEl(e); if (e.t === 'image') pickImage(e.id); if (e.t === 'map') { const m2 = host.siteMap(); if (m2) setMapSource(e.id, 'site'); }
      return;
    }
    if (dr.kind === 'croppan') { view.classList.remove('cropping'); if (cropRaf) { cancelAnimationFrame(cropRaf); cropRaf = 0; } relayout(); dirty(); renderCanvas(); renderRight(); return; }
    if (dr.kind === 'move' || dr.kind === 'resize' || dr.kind === 'vertex' || dr.kind === 'mappan' || dr.kind === 'rotate') { lastMerge = ''; dirty(); renderCanvas(); renderRight(); renderLeft(); }
  });
  view.addEventListener('dblclick', ev => {
    if (tool !== 'select') return;
    const me = ((ev.target as Element).closest('[data-el]') as SVGElement | null)?.dataset.el;
    if (me && isAuto() && !((ev.target as Element).closest('[data-id]')) && croppable(MATS.find(x => x.id === me))) { cropOn(me); return; }
    const hit = ((ev.target as Element).closest('[data-id]') as SVGElement | null)?.dataset.id, e = hit ? P().els.find(x => x.id === hit) : undefined;
    if (e?.t === 'text' || e?.t === 'table') { d.ui.rightTab = 'element'; if (!rOpen()) float = 'right'; syncPanels(); renderRight(); setTimeout(() => (right.querySelector('#chText, #chTable') as HTMLTextAreaElement | null)?.focus(), 0); }
  });
  /* materialni katakka sudrash (Loyihadan → varaq) */
  view.addEventListener('dragover', ev => {
    if (!DRAG || !isAuto() || !LAST) return; ev.preventDefault();
    const hit = slotAt(LAST.pages[d.cur], fam(), fmtOf(), toMm(ev)), a = MATS.find(x => x.id === DRAG);
    if (!hit || !a) { dropHint = null; renderOverlay(); return; }
    const ok = accepts(hit.role as never, a.role);
    dropHint = { r: hit.r, ok, label: ok ? `${tr('Bu yerga')}: ${tr(a.name)}` : `${tr('Mos emas')}: ${tr(LAYOUTS.roles[hit.role as keyof typeof LAYOUTS.roles][0])}` };
    renderOverlay();
  });
  view.addEventListener('dragleave', () => { dropHint = null; renderOverlay(); });
  view.addEventListener('drop', ev => {
    if (!DRAG || !isAuto() || !LAST) return; ev.preventDefault();
    const id = DRAG, hit = slotAt(LAST.pages[d.cur], fam(), fmtOf(), toMm(ev)), a = MATS.find(x => x.id === id);
    DRAG = null; dropHint = null; view.classList.remove('dropping'); renderOverlay();
    if (!hit || !a) return;
    if (!accepts(hit.role as never, a.role)) { toast(`${tr('Bu katakka mos emas')}: ${tr(LAYOUTS.roles[hit.role as keyof typeof LAYOUTS.roles][0]).toLowerCase()}`); return; }
    const pi = d.cur;
    autoMut(() => { pin(pi); matSet(id).visible = true; d.auto.ov = d.auto.ov.filter(o => o.a !== id && !(o.pi === pi && o.k === hit.k)); d.auto.ov.push({ a: id, pi, k: hit.k }); matSel = id; });
    toast(`${tr(a.name)} — ${tf('${n}-varaqqa qoʻyildi', { n: pi + 1 })}`);
  });
  /** Ramer–Douglas–Peucker */
  function simplify(pts: [number, number][], eps: number): [number, number][] {
    if (pts.length < 3) return pts;
    const [a, b] = [pts[0], pts[pts.length - 1]]; let mx = 0, idx = 0;
    for (let i = 1; i < pts.length - 1; i++) { const p = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, dd = Math.abs((b[1] - a[1]) * p[0] - (b[0] - a[0]) * p[1] + b[0] * a[1] - b[1] * a[0]) / L; if (dd > mx) { mx = dd; idx = i; } }
    return mx > eps ? [...simplify(pts.slice(0, idx + 1), eps).slice(0, -1), ...simplify(pts.slice(idx), eps)] : [a, b];
  }

  /* ---------- elementlar ---------- */
  function newEl(t: Tool, pts: [number, number][]): ChEl {
    const lay = L().id, base = { id: cid(), layer: lay };
    switch (t) {
      case 'text': { const k = TEXT_KINDS.find(x => x.id === opt.textKind)!; return { ...base, t: 'text', x: 0, y: 0, w: 0, h: 0, text: '', style: { size: k.size, bold: k.bold, font: k.font, kind: k.id, fill: '#141414', align: 'start' } }; }
      case 'line': case 'arrow': { const m = MOBILITY.find(x => x.id === opt.mob); return { ...base, t, pts, ...(m && t === 'line' ? { name: m.name, preset: m.id } : {}), style: m && t === 'line' ? { ...m.style } : { stroke: '#141414', width: 0.5, ...(t === 'arrow' ? { head: 'end' as const } : {}) } }; }
      case 'pen': return { ...base, t: 'pen', pts, style: { stroke: '#141414', width: 0.6 } };
      case 'rect': return { ...base, t: 'rect', x: 0, y: 0, w: 0, h: 0, style: { fill: paletteById(d.palette).colors[4] ?? '#8cc47a', stroke: 'none', opacity: 0.8 } };
      case 'ellipse': return { ...base, t: 'ellipse', x: 0, y: 0, w: 0, h: 0, style: { fill: 'none', stroke: '#141414', width: 0.5 } };
      case 'poly': return { ...base, t: 'poly', pts, style: { fill: paletteById(d.palette).colors[1], stroke: 'none', opacity: 0.7 } };
      case 'flow': { const f = FLOWS.find(x => x.id === opt.flow)!; return { ...base, t: 'flow', pts, name: f.name, preset: f.id, style: { ...f.style } }; }
      case 'zone': { const z = ZONES.find(x => x.id === opt.zone)!; return { ...base, t: 'zone', pts, name: z.name, preset: z.id, style: { fill: z.fill, opacity: 0.55, halo: 6 } }; }
      case 'icon': { const ic = iconById(opt.icon); return { ...base, t: 'icon', x: 0, y: 0, w: 14, h: 14, icon: ic.id, look: opt.look, name: ic.name, style: { stroke: paletteById(d.palette).colors[2] ?? '#2f6da8', ...(ic.risk ? { risk: true } : {}) } }; }
      case 'row': return { ...base, t: 'row', pts, row: { kind: opt.rowKind, gap: opt.rowKind === 'people' ? 6 : 8, size: 6, tree: opt.tree, icon: opt.icon }, style: {} };
      case 'image': return { ...base, t: 'image', x: 0, y: 0, w: 0, h: 0, style: {} };
      case 'map': return { ...base, t: 'map', x: 0, y: 0, w: 0, h: 0, name: 'Xarita oynasi', style: { width: 0.25 } };
      default: return { ...base, t: 'rect', x: 0, y: 0, w: 10, h: 10, style: {} };
    }
  }
  function addEl(e: ChEl, keepTool = false): void {
    if (!allPages().length) { toast(tr('Avval varaq qoʻshing')); return; }
    if (e.t === 'text' && !e.text) e.text = tr('Matn');
    mut(p => { fixSize(e); p.els.push(e); });
    sel = new Set([e.id]); matSel = null; if (!keepTool) setTool('select', false);
    d.ui.rightTab = 'element'; if (e.t === 'text' && !rOpen()) float = 'right'; syncPanels(); renderRight(); renderOverlay(); setHint();
    if (e.t === 'text') { const ta = right.querySelector('#chText') as HTMLTextAreaElement | null; ta?.focus(); ta?.select(); }
  }
  function finishDraft(): void {
    if (!draft) return; const e = draft; draft = null;
    const min = e.t === 'zone' || e.t === 'poly' ? 3 : 2;
    const pts = (e.pts ?? []).filter((p, i, a) => !i || Math.hypot(p[0] - a[i - 1][0], p[1] - a[i - 1][1]) > 0.3);
    if (pts.length >= min) addEl({ ...e, pts }); else { renderOverlay(); toast(tf('Kamida ${n} nuqta kerak', { n: min })); }
    setHint();
  }
  function setTool(t: Tool, rerender = true): void {
    if (draft && t !== tool) { draft = null; }
    tool = t; if (t !== 'select') sel.clear();
    view.dataset.tool = t; setHint();
    if (rerender) { renderTools(); renderOverlay(); renderRight(); } else renderTools();
  }
  function setHint(): void {
    const m: Partial<Record<Tool, string>> = { poly: 'Nuqtalarni bosing · ikki marta bosish yoki Enter — tugatish · Backspace — oxirgisi · Esc — bekor', flow: 'Yoʻnalish oʻqi: nuqtalarni bosing · ikki marta bosish yoki Enter — tugatish', zone: 'Zona: chegaraning nuqtalarini bosing · Enter — yopish', row: 'Qator chizigʻi: nuqtalarni bosing · Enter — tugatish', pen: 'Sudrab chizing', line: 'Sudrang · Shift — 45°', arrow: 'Sudrang · Shift — 45°', rect: 'Sudrang · Shift — kvadrat', ellipse: 'Sudrang · Shift — doira', text: 'Bosing yoki ramka chizing', icon: 'Belgi joyini bosing', image: 'Ramka chizing — rasm tanlanadi', map: 'Xarita oynasi ramkasini chizing' };
    const t = m[tool]; hint.hidden = !t; hint.textContent = t ? tr(t) : '';
  }
  function renderTools(): void {
    tools.replaceChildren(...TOOLS.map(t => h('button', { class: 'rb', 'data-tool': t.id, title: `${tr(t.name)} (${t.key})`, 'aria-label': tr(t.name), 'aria-pressed': tool === t.id, onclick: () => setTool(t.id) }, svgIcon(`<path d="${t.d}"/>`))),
      h('span', { class: 'sepv' }),
      ...(narrow() ? [h('button', { class: 'rb', id: 'chMore', title: tr('Yana'), 'aria-label': tr('Yana'), onclick: (e: Event) => { e.stopPropagation(); moreMenu(e.currentTarget as HTMLElement); } }, svgIcon(I.more))] : extraTools()));
  }
  const narrow = () => (vwrap.getBoundingClientRect().width || innerWidth) < 760;
  function moreMenu(anchor: HTMLElement): void {
    wrap.querySelector('.ch-menu')?.remove();
    const it = (id: string, label: string, on: boolean | null, fn: () => void, dis = false) => h('button', { class: 'mi', id, disabled: dis, onclick: () => { m.remove(); fn(); } }, h('span', {}, label), on == null ? '' : h('span', { class: 'd' }, on ? '✓' : ''));
    const m = h('div', { class: 'menu ch-menu', role: 'menu' },
      it('chMagnetM', tr('Magnit (yopishish)'), magnet, () => { magnet = !magnet; renderTools(); }),
      it('chGridM', tr('5 mm toʻr'), gridOn, () => { gridOn = !gridOn; renderTools(); renderCanvas(); }),
      it('chUndoM', tr('Bekor qilish (Ctrl+Z)'), null, undo, !hist.length),
      it('chRedoM', tr('Qaytarish (Ctrl+Shift+Z)'), null, redo, !fut.length));
    m.addEventListener('click', e => e.stopPropagation()); wrap.append(m);
    const r = anchor.getBoundingClientRect(); m.style.left = `${Math.min(r.left, innerWidth - m.offsetWidth - 8)}px`; m.style.top = `${r.top - m.offsetHeight - 8}px`;
    setTimeout(() => document.addEventListener('click', () => m.remove(), { once: true }), 0);
  }
  function extraTools(): HTMLElement[] {
    return [
      h('button', { class: 'rb', id: 'chMagnet', title: tr('Magnit (yopishish)'), 'aria-label': tr('Magnit (yopishish)'), 'aria-pressed': magnet, onclick: () => { magnet = !magnet; renderTools(); } }, svgIcon(I.magnet)),
      h('button', { class: 'rb', id: 'chGrid', title: tr('5 mm toʻr'), 'aria-label': tr('5 mm toʻr'), 'aria-pressed': gridOn, onclick: () => { gridOn = !gridOn; renderTools(); renderCanvas(); } }, svgIcon(I.grid)),
      h('button', { class: 'rb', id: 'chUndo', title: tr('Bekor qilish (Ctrl+Z)'), 'aria-label': tr('Bekor qilish'), disabled: !hist.length, onclick: undo }, svgIcon(I.undo)),
      h('button', { class: 'rb', id: 'chRedo', title: tr('Qaytarish (Ctrl+Shift+Z)'), 'aria-label': tr('Qaytarish'), disabled: !fut.length, onclick: redo }, svgIcon(I.redo))];
  }

  /* ---------- amallar ---------- */
  let clip: ChEl[] = [];
  function remove(): void { if (!sel.size) return; mut(p => { p.els = p.els.filter(e => !sel.has(e.id) || !editable(e)); }); sel.clear(); renderRight(); renderOverlay(); }
  function duplicate(off = 5): void { const els = selected(); if (!els.length) return; const map = new Map<string, string>(); const cp = els.map(e => { const n = moved(clone(e), off, off); n.id = cid(); delete n.a; if (e.group) { if (!map.has(e.group)) map.set(e.group, cid('g')); n.group = map.get(e.group); } return n; }); mut(p => { p.els.push(...cp); }); sel = new Set(cp.map(e => e.id)); renderOverlay(); renderRight(); }
  function order(dir: 1 | -1): void { mut(p => { const ids = sel; const keep = p.els.filter(e => !ids.has(e.id)), mv = p.els.filter(e => ids.has(e.id)); p.els = dir > 0 ? [...keep, ...mv] : [...mv, ...keep]; }); }
  function flip(ax: 'x' | 'y'): void { mut(p => p.els.forEach(e => { if (sel.has(e.id)) { if (ax === 'x') e.flipX = !e.flipX; else e.flipY = !e.flipY; } })); }
  function group(on: boolean): void { const g = cid('g'); mut(p => p.els.forEach(e => { if (sel.has(e.id)) e.group = on ? g : undefined; })); renderRight(); toast(on ? tf('${n} ta shakl guruhlandi', { n: sel.size }) : tr('Guruh ajratildi')); }
  function distribute(ax: 'x' | 'y'): void {
    const els = selected().sort((a, b) => bbox(a)[ax === 'x' ? 0 : 1] - bbox(b)[ax === 'x' ? 0 : 1]); if (els.length < 3) return;
    const i0 = ax === 'x' ? 0 : 1, i1 = ax === 'x' ? 2 : 3, first = bbox(els[0]), last = bbox(els[els.length - 1]);
    const total = els.reduce((s, e) => { const b = bbox(e); return s + b[i1] - b[i0]; }, 0), gap = (last[i1] - first[i0] - total) / (els.length - 1);
    mut(p => { let pos = first[i0]; for (const e of els) { const b = bbox(e), dd = pos - b[i0]; const i = p.els.findIndex(x => x.id === e.id); p.els[i] = moved(p.els[i], ax === 'x' ? dd : 0, ax === 'y' ? dd : 0); pos += b[i1] - b[i0] + gap; } });
  }
  function alignEls(k: 'l' | 'cx' | 'r' | 't' | 'cy' | 'b'): void {
    const els = selected(); if (els.length < 2) return; const B = unionBox(els);
    mut(p => { for (const e of els) { const b = bbox(e); const dx = k === 'l' ? B[0] - b[0] : k === 'r' ? B[2] - b[2] : k === 'cx' ? (B[0] + B[2]) / 2 - (b[0] + b[2]) / 2 : 0, dy = k === 't' ? B[1] - b[1] : k === 'b' ? B[3] - b[3] : k === 'cy' ? (B[1] + B[3]) / 2 - (b[1] + b[3]) / 2 : 0; const i = p.els.findIndex(x => x.id === e.id); p.els[i] = moved(p.els[i], dx, dy); } });
  }
  function paletteSeq(): void {
    const cols = paletteById(d.palette).colors; let i = 0;
    mut(p => p.els.forEach(e => { if (!sel.has(e.id)) return; const c = cols[i++ % cols.length]; if (e.t === 'zone' || e.t === 'rect' || e.t === 'ellipse' || e.t === 'poly' || e.t === 'row') e.style.fill = c; else if (e.t === 'text') e.style.fill = c; else e.style.stroke = c; }));
  }
  function pickImage(id: string): void {
    fileIn.value = ''; fileIn.onchange = () => {
      const f = fileIn.files?.[0]; if (!f) return; const r = new FileReader();
      r.onload = () => { const url = String(r.result), img = new Image(); img.onload = () => upd(id, e => { e.src = url; e.name = f.name.replace(/\.[^.]+$/, ''); if ((e.w ?? 0) > 0 && img.width) { e.h = (e.w ?? 80) * img.height / img.width; } }); img.src = url; };
      r.readAsDataURL(f);
    };
    fileIn.click();
  }
  function setMapSource(id: string, src: 'site' | 'scene' | ChInbox): void {
    if (src === 'scene') { const url = host.scene(); if (!url) { toast(tr('Sahna rasmi olinmadi')); return; } upd(id, e => { e.src = url; e.svg = undefined; e.vb = undefined; e.scale = undefined; e.name = tr('Sahna rasmi'); }); return; }
    const m = src === 'site' ? host.siteMap() : src.svg ? { svg: src.svg, vb: src.vb ?? [0, 0, src.w, src.h], w: src.w, h: src.h, scale: src.scale } : null;
    if (!m) { if (src !== 'site' && src.src) upd(id, e => { e.src = src.src; e.svg = undefined; }); else toast(tr('Loyihada bosh reja yoʻq — avval uchastka chizing')); return; }
    upd(id, e => {
      const w = Math.abs(e.w ?? 100), hh = Math.abs(e.h ?? 100), k = Math.max(w / m.vb[2], hh / m.vb[3]), vw = w / k, vh = hh / k;
      e.svg = trSvg(m.svg); e.src = undefined; e.vb = [m.vb[0] + (m.vb[2] - vw) / 2, m.vb[1] + (m.vb[3] - vh) / 2, vw, vh]; e.natW = vw; e.scale = m.scale; e.north = src === 'site' ? 0 : src.north; e.name = src === 'site' ? tr('Bosh reja') : src.name;
    });
  }
  function placeInbox(it: ChInbox): void {
    const [W, H] = pageSize(P()), k = Math.min(1, (W - 40) / it.w, (H - 40) / it.h), w = it.w * k, hh = it.h * k;
    const e: ChEl = { id: cid(), t: it.svg || it.src ? 'map' : 'image', layer: P().layers[0].id, x: (W - w) / 2, y: (H - hh) / 2, w, h: hh, name: it.name, style: { width: 0.25 } };
    if (it.svg) { e.svg = it.svg; e.vb = it.vb ?? [0, 0, it.w, it.h]; e.natW = e.vb[2]; e.scale = it.scale; e.north = it.north; } else if (it.src) e.src = it.src;
    matSel = null; addEl(e);
  }

  /* ---------- erkin varaqlar ---------- */
  function addPage(p: ChPage): void { commit(); d.pages.push(p); d.cur = nAuto + d.pages.length - 1; sel.clear(); matSel = null; zoom = 0; dirty(); if (d.auto.view === 'all') d.auto.view = 'one'; renderAll(); }
  function dupPage(i: number): void { const p: ChPage = clone(d.pages[i]); p.id = cid('p'); p.name = `${p.name} (${tr('nusxa')})`; p.els.forEach(e => { e.id = cid(); }); commit(); d.pages.splice(i + 1, 0, p); d.cur = nAuto + i + 1; sel.clear(); dirty(); renderAll(); }
  function delPage(i: number): void { commit(); d.pages.splice(i, 1); d.cur = Math.min(d.cur, allPages().length - 1); sel.clear(); dirty(); renderAll(); }
  function movePage(i: number, dir: number): void { const j = i + dir; if (j < 0 || j >= d.pages.length) return; commit(); const [p] = d.pages.splice(i, 1); d.pages.splice(j, 0, p); d.cur = nAuto + j; dirty(); renderAll(); }
  const tplCtx = (): TplCtx => ({ title: d.title, place: R ? tr(placeName(R)) : host.place, date: today(), author: d.album.author, tik: host.tik(), map: host.siteMap() });

  /* ---------- kirish oynasi ---------- */
  const THUMBS: Record<string, string> = {};
  function famThumb(f: LFamily): string {
    if (THUMBS[f.id]) return THUMBS[f.id];
    const pg = f.pages.find(p => !p.slots.some(q => q.role === 'toc' || q.role === 'chapter')) ?? f.pages[0];
    return (THUMBS[f.id] = renderPage(LIB, f, pg, f.formats[0], { pal: f.pal ?? 'arch', mode: 'icon', idx: 0, total: 1 }).svg.replace(/ width="[\d.]+mm" height="[\d.]+mm"/, ''));
  }
  function renderStart(): void {
    startEl.hidden = d.auto.started;
    if (d.auto.started) { startEl.replaceChildren(); return; }
    const f = fam(), fk = fmtOf(f), mats = MATS.filter(m => m.role !== 'title'), s = site();
    const box = h('div', { class: 'ch-stbox', role: 'dialog', 'aria-modal': 'true', 'aria-label': tr('Albomni tuzish') },
      h('div', { class: 'ch-sttop' }, h('b', {}, tr('Chizmadon')), h('span', { class: 't-small' }, tr('Kirdingiz — tayyor materiallar tanlangan maketga oʻzi joylanadi. Yoqmasa, keyin shu oynada tahrirlaysiz.')),
        h('button', { class: 'btn btn-sm mr-back', id: 'chStBack', title: tr('Master rejaga qaytish'), onclick: close }, svgIcon('<path d="M15 6l-6 6 6 6"/>'), h('span', {}, tr('Master reja'))),
        h('button', { class: 'btn btn-ghost icon-btn', id: 'chStClose', 'aria-label': tr('Yopish'), onclick: () => startGo() }, svgIcon(I.x))),
      h('div', { class: 'ch-stbody' },
        h('div', { class: 'ch-stl' }, h('b', { class: 'ch-sth' }, tr('Loyiha hududi')), locBox('S'), whereBox(),
          h('div', { class: 'ch-chips' }, ...presets().map(p => h('button', { class: 'chip', 'aria-pressed': p.lat === s.lat && p.lon === s.lon, onclick: () => setSite(p.lat, p.lon) }, tr(p.label)))),
          h('b', { class: 'ch-sth' }, tr('Loyihadan tayyor')),
          h('div', { class: 'group', id: 'chStMats' }, ...mats.map(m => h('button', { class: 'li ch-ck', 'data-vis': m.id, 'aria-pressed': m.visible, onclick: () => autoMut(() => { matSet(m.id).visible = !m.visible; d.auto.force = {}; }) }, h('span', { class: 'cb' }, m.visible ? svgIcon('<path d="M5 12l5 5 9-10"/>') : ''), h('span', { class: 'k' }, tr(m.name)))))),
        h('div', { class: 'ch-str' }, h('b', { class: 'ch-sth' }, tr('Maket')), h('span', { class: 't-small' }, tr('Keyin istalgan vaqtda almashtiriladi')),
          h('div', { class: 'ch-fams', id: 'chStFams' }, ...LAYOUTS.families.map(x => h('button', { class: 'ch-famt', 'data-fam': x.id, 'aria-pressed': x.id === d.auto.fam, onclick: () => setFam(x.id) }, h('span', { class: 'ft', html: famThumb(x) }), h('b', {}, tr(x.name))))),
          h('div', { class: 'ch-stf' }, h('div', { class: 'seg' }, ...f.formats.map(k => h('button', { 'data-fmt': k, 'aria-pressed': k === fk, onclick: () => autoMut(() => { d.auto.fmt[f.id] = k; }) }, tr(fmtName(k))))), h('span', { class: 'spacer' }),
            h('span', { class: 't-small', id: 'chStSum' }, tf('${a} material → ${b} varaq', { a: mats.filter(m => m.visible).length, b: nAuto })),
            h('button', { class: 'btn btn-primary', id: 'chStGo', onclick: () => startGo() }, tr('Albomni tuzish'))))));
    startEl.replaceChildren(box);
  }
  function startGo(): void { d.auto.started = true; d.cur = 0; zoom = 0; dirty(); renderAll(); }

  /* ---------- eksport ---------- */
  const pageOut = (i: number, idp: string, ai = false) => { const p = allPages()[i]; const r = pageSvg(withToc(p), { tr, idp, ai, ...(isAuto(i) ? { bg: BG[i].replace(/\bid="([^"]+)"/g, `id="${idp}$1"`).replace(/url\(#([^)]+)\)/g, `url(#${idp}$1)`) } : albumDeco(i)) }); return { svg: r.svg.replace(/ data-(el|k|bg|slot)="[^"]*"/g, ''), widthMm: r.w, heightMm: r.h }; };
  const pagesOut = () => allPages().map((_, i) => pageOut(i, `x${i}`));
  async function exportPdf(): Promise<void> { writeBack(); toast(tr('PDF tayyorlanmoqda…')); try { await svgPdf(pagesOut(), `${safe(d.title)}.pdf`); } catch (e) { toast(`PDF: ${(e as Error).message}`); } }
  function exportSvg(): void { writeBack(); const r = pageOut(d.cur, 'a', true); download(`${safe(d.title)}_${String(d.cur + 1).padStart(2, '0')}.svg`, r.svg, 'image/svg+xml'); }
  async function rasterize(svg: string, wMm: number, hMm: number, dpi: number): Promise<HTMLCanvasElement> {
    const k = dpi / 25.4, c = document.createElement('canvas'); c.width = Math.round(wMm * k); c.height = Math.round(hMm * k);
    const img = new Image(); img.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    await img.decode(); const g = c.getContext('2d')!; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src);
    return c;
  }
  async function exportPng(dpi: number): Promise<void> {
    writeBack(); const r = pageOut(d.cur, 'p');
    try { const c = await rasterize(r.svg, r.widthMm, r.heightMm, dpi); c.toBlob(b => b ? download(`${safe(d.title)}_${String(d.cur + 1).padStart(2, '0')}_${dpi}dpi.png`, b) : toast(tr('PNG yaratilmadi')), 'image/png'); } catch { toast(tr('PNG yaratilmadi')); }
  }
  async function exportPptx(): Promise<void> {
    writeBack(); toast(tr('PowerPoint tayyorlanmoqda…'));
    try {
      const { default: PptxGen } = await import('pptxgenjs');
      const pp = new PptxGen(), out = pagesOut(), f = out[0];
      pp.defineLayout({ name: 'CH', width: f.widthMm / 25.4, height: f.heightMm / 25.4 }); pp.layout = 'CH'; pp.title = d.title;
      for (const p of out) {
        const c = wmCanvas(await rasterize(p.svg, p.widthMm, p.heightMm, 150)), s = pp.addSlide();
        const k = Math.min(f.widthMm / p.widthMm, f.heightMm / p.heightMm), w = p.widthMm * k / 25.4, hh = p.heightMm * k / 25.4;
        s.addImage({ data: c.toDataURL('image/png'), x: (f.widthMm / 25.4 - w) / 2, y: (f.heightMm / 25.4 - hh) / 2, w, h: hh });
      }
      const blob = await pp.write({ outputType: 'blob' }) as Blob; download(`${safe(d.title)}.pptx`, blob);
    } catch (e) { toast(`PowerPoint: ${(e as Error).message}`); }
  }
  function exportMenu(anchor: HTMLElement): void {
    wrap.querySelector('.ch-menu')?.remove();
    const n = allPages().length;
    const it = (id: string, label: string, sub: string, fn: () => void) => h('button', { class: 'mi', id, disabled: !n && id !== 'chImJson', onclick: () => { m.remove(); fn(); } }, h('span', {}, label), h('span', { class: 'd' }, sub));
    const m = h('div', { class: 'menu ch-menu', role: 'menu', id: 'chDlMenu' },
      h('div', { class: 'mh' }, tr('Yuklab olish')),
      it('chExPdf', tr('PDF — vektor, qatlamli'), tf('${n} varaq', { n }), () => void exportPdf()),
      it('chExPptx', 'PowerPoint (.pptx)', tr('har varaq — slayd'), () => void exportPptx()),
      it('chExSvg', tr('SVG — Illustrator uchun'), tr('joriy varaq'), exportSvg),
      it('chExPng', 'PNG 150 dpi', tr('joriy varaq'), () => void exportPng(150)),
      it('chExPng3', 'PNG 300 dpi', tr('joriy varaq'), () => void exportPng(300)),
      h('hr'),
      it('chExJson', tr('Albomni faylga saqlash (.json)'), '', () => { writeBack(); download(`${safe(d.title)}.chizmadon.json`, JSON.stringify(d), 'application/json'); }),
      it('chImJson', tr('Albomni fayldan ochish'), '', () => { jsonIn.value = ''; jsonIn.onchange = async () => { const f = jsonIn.files?.[0]; if (!f) return; try { commit(); d = normDoc(JSON.parse(await f.text()), d.title); d.auto.started = true; sel.clear(); matSel = null; zoom = 0; relayout(false); dirty(); renderAll(); toast(tr('Albom ochildi')); } catch { toast(tr('Fayl oʻqilmadi')); } }; jsonIn.click(); }));
    m.addEventListener('click', e => e.stopPropagation());
    wrap.append(m);
    const r = anchor.getBoundingClientRect(); m.style.left = `${Math.max(8, Math.min(r.right - m.offsetWidth, innerWidth - m.offsetWidth - 8))}px`; m.style.top = `${r.bottom + 6}px`;
    setTimeout(() => document.addEventListener('click', () => m.remove(), { once: true }), 0);
  }

  /* ---------- klaviatura ---------- */
  function onKey(e: KeyboardEvent): void {
    if (!document.body.contains(wrap)) { removeEventListener('keydown', onKey, true); return; }
    const tg = e.target as HTMLElement, typing = tg.closest('input, textarea, select, [contenteditable]');
    if (e.key === ' ' && !typing) { space = true; view.classList.add('pan'); e.preventDefault(); return; }
    if (e.key === 'Escape') {
      if (document.querySelector('.cp:not([hidden])')) return;
      e.stopPropagation(); e.preventDefault();
      if (wrap.querySelector('.ch-menu')) { wrap.querySelector('.ch-menu')!.remove(); return; }
      if (!d.auto.started) { startGo(); return; }
      if (draft) { draft = null; renderOverlay(); return; }
      if (editing) { editing.cancel(); return; }
      if (crop) { cropOn(null); return; }
      if (float) { float = null; syncPanels(); return; }
      if (tool !== 'select') { setTool('select'); return; }
      if (sel.size || matSel) { sel.clear(); if (matSel) { matSel = null; relayout(); renderCanvas(); } renderOverlay(); renderRight(); renderLeft(); return; }
      close(); return;
    }
    if (typing || !d.auto.started) return;
    const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (e.key === 'Tab') { e.preventDefault(); togglePanels(); return; }
    if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
    if (mod && k === 'y') { e.preventDefault(); redo(); return; }
    if (d.auto.view !== 'one') return;
    if (mod && k === 'd') { e.preventDefault(); duplicate(); return; }
    if (mod && k === 'c') { clip = selected().map(clone); return; }
    if (mod && k === 'x') { clip = selected().map(clone); remove(); return; }
    if (mod && k === 'v') { if (!clip.length) return; e.preventDefault(); const cp = clip.map(x => { const n = moved(x, 5, 5); n.id = cid(); delete n.a; if (!P().layers.some(l => l.id === n.layer)) n.layer = L().id; return n; }); mut(p => p.els.push(...cp)); sel = new Set(cp.map(x => x.id)); clip = cp.map(clone); renderOverlay(); renderRight(); return; }
    if (mod && k === 'g') { e.preventDefault(); if (e.shiftKey) { if (sel.size) group(false); } else if (sel.size > 1) group(true); return; }
    if (mod && k === 'a') { e.preventDefault(); sel = new Set(P().els.filter(editable).map(x => x.id)); matSel = null; setTool('select', false); renderOverlay(); renderRight(); return; }
    if (e.key === 'Enter') { if (draft) { e.preventDefault(); finishDraft(); } return; }
    if (e.key === 'Backspace' && draft?.pts) { e.preventDefault(); draft.pts.pop(); if (!draft.pts.length) draft = null; renderOverlay(); return; }
    if ((e.key === 'Delete' || e.key === 'Backspace') && !sel.size && matSel && isAuto()) { e.preventDefault(); hideMat(matSel); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(); return; }
    if (e.key.startsWith('Arrow') && sel.size) { e.preventDefault(); const s = e.shiftKey ? 5 : 1, dx = e.key === 'ArrowLeft' ? -s : e.key === 'ArrowRight' ? s : 0, dy = e.key === 'ArrowUp' ? -s : e.key === 'ArrowDown' ? s : 0; mut(p => { p.els = p.els.map(x => (sel.has(x.id) ? moved(x, dx, dy) : x)); }, 'nudge'); return; }
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'PageDown' || e.key === 'PageUp') && !sel.size) { e.preventDefault(); goPage(d.cur + (e.key === 'ArrowRight' || e.key === 'PageDown' ? 1 : -1)); return; }
    if (e.key === ']') { order(1); return; } if (e.key === '[') { order(-1); return; }
    if (e.key === '+' || e.key === '=') { zoomAt(1.25); return; } if (e.key === '-') { zoomAt(1 / 1.25); return; } if (e.key === '0') { fit(); return; }
    if (!mod && !e.altKey && TOOL_KEYS[k]) { setTool(TOOL_KEYS[k]); }
  }
  const onKeyUp = (e: KeyboardEvent) => { if (e.key === ' ') { space = false; view.classList.remove('pan'); } };
  addEventListener('keydown', onKey, true); addEventListener('keyup', onKeyUp, true);
  const onDoc = (e: MouseEvent) => { if (!float) return; const t = e.target as Node; if (!left.contains(t) && !right.contains(t) && !stripL.contains(t) && !stripR.contains(t) && !(t as Element).closest?.('.ch-menu,.cp')) { float = null; syncPanels(); } };
  document.addEventListener('pointerdown', onDoc, true);
  let RW = innerWidth;
  const onResize = () => { const w = innerWidth; if (w < 900 && RW >= 900) { float = null; syncPanels(); renderLeft(); renderRight(); } else if (w < 1180 && d.ui.left && d.ui.right && !d.ui.lockR) { d.ui.right = false; syncPanels(); } RW = w; applyView(); renderTools(); };
  addEventListener('resize', onResize);

  function close(): void { flush(); removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKeyUp, true); removeEventListener('resize', onResize); document.removeEventListener('pointerdown', onDoc, true); wrap.remove(); host.onClose?.(); }

  /* ---------- kirish ---------- */
  if (host.incoming) {
    const { more, ...first } = host.incoming;
    for (const src of [first, ...(more ?? [])]) {
      const it: ChInbox = { ...src, id: cid('i'), at: new Date().toISOString() };
      d.inbox.push(it); if (d.inbox.length > 30) d.inbox.shift();
      d.auto.mats[`i:${it.id}`] = { visible: true };
    }
    saved = false;
  }
  relayout(false);
  renderAll();
  setHint();
  void legacyPending().then(L => { if (!document.body.contains(wrap) || (!L.doc && !L.mats.length)) return; LEG = L; renderLeft(); });
  if (!saved) dirty();
  // Oʻzbekiston chegaralari kelgach — hudud materiallari va qidiruv (tarmoqsiz fayl)
  void loadGeo().then(g => { if (!g || !document.body.contains(wrap)) return; relayout(false); if (host.incoming) { const id = `i:${d.inbox[Math.max(0, d.inbox.length - 1 - (host.incoming.more?.length ?? 0))].id}`; const p = PLACE[id]; if (p) d.cur = p.pi; } renderAll(); });
}
