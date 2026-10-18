/**
 * Chizmadon oynasi — maket «CH-Yagona» (qaror 2026-10-17): bitta muharrir, yigʻiladigan panellar.
 *  - Header: orqaga, logotip, «Chizmadon», loyiha · albom nomi, saqlash holati, Muharrir · Albom, Tab (panellarni yashirish), Yuklab olish.
 *  - Chap panel: Varaqlar · Qatlamlar · Kutubxona (Belgilar · Daraxtlar · Yoʻllar · Ranglar); oʻng: Element · Tekshiruv (7 band).
 *  - Har panel 48 px tasmaga yigʻiladi; tasmadagi ikonka — panel varaq ustida suzib ochiladi (varaq siljimaydi),
 *    Esc / tashqarini bosish — yigʻiladi, qulf — doim ochiq. Tab — ikkala panel birdan. Holat loyiha bilan saqlanadi.
 *  - Pastda 14 asbob + magnit, 5 mm toʻr, bekor qilish / qaytarish. Albom koʻrinishi: namunalar · varaqlar toʻri · albom sozlamasi.
 * Hujjat — chizmadon/model.ts; chizish — render.ts; tekshiruv — check.ts; namunalar — templates.ts.
 */
import { h, svgIcon, icl, IC, toast, download } from '../ui/dom';
import { sw, select, range, stepper, seg } from '../ui/controls';
import { tr, tf, trSvg } from '../i18n';
import { logoSvg } from '../ui/logo';
import { svgPdf } from '../ui/pdf';
import { type ChDoc, type ChEl, type ChPage, type ChInbox, type ChPaper, type ElType, PAPER_MM, normDoc, blankPage, cid, pageSize, bbox, moved, fitTo, mapScale } from './model';
import { pageSvg, textHeight, legendHeight, iconGlyph, esc } from './render';
import { pageChecks, applyFix } from './check';
import { TEMPLATES, TPL_GROUPS, type TplCtx } from './templates';
import { TOOLS, type Tool, FLOWS, BANDS, ZONES, MOBILITY, DASHES, ICON_GROUPS, iconById, LOOKS, TREES, PALETTES, paletteById, FONTS, TEXT_KINDS } from './catalog';

export interface ChHost {
  /** loyiha nomi va joyi (sarlavha, namunalar) */
  project: string; place: string;
  /** saqlangan albom (Project.chizmadon) */
  data: Record<string, unknown> | undefined;
  save: (d: ChDoc) => void;
  /** TIK jadvali: [koʻrsatkich, birlik, qiymat] */
  tik: () => string[][];
  /** loyiha bosh rejasi (Varaqlar, xarita qismi, mm) */
  siteMap: () => TplCtx['map'] | undefined;
  /** joriy 3D sahna rasmi (data URL) */
  scene: () => string | null;
  /** ochilganda «Loyihadan» ga qoʻshiladigan va varaqqa qoʻyiladigan narsa */
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
  dl: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', more: '<path d="M5 12h.01M12 12h.01M19 12h.01"/>', front: '<path d="M8 8h12v12H8zM4 4h12v4"/>', back2: '<path d="M4 4h12v12H4zM8 16v4h12V8h-4"/>',
  flipH: '<path d="M12 3v18M8 7L3 12l5 5zM16 7l5 5-5 5"/>', flipV: '<path d="M3 12h18M7 8l5-5 5 5zM7 16l5 5 5-5"/>', grp: '<path d="M3 3h8v8H3zM13 13h8v8h-8zM7 11v6h6M17 13V7h-6"/>',
  distH: '<path d="M4 4v16M20 4v16M9 8h6v8H9z"/>', distV: '<path d="M4 4h16M4 20h16M8 9h8v6H8z"/>', trash: IC.trash,
};
const TOOL_KEYS: Record<string, Tool> = Object.fromEntries(TOOLS.map(t => [t.key.toLowerCase(), t.id]));

export function openChizmadon(host: ChHost): void {
  document.querySelector('.gx.ch')?.remove();
  let d: ChDoc = normDoc(host.data, '');
  if (!d.title) d.title = tr('Taqdimot albomi');
  let mode: 'muharrir' | 'albom' = 'muharrir';
  let tool: Tool = 'select';
  let sel = new Set<string>();
  let zoom = 0, panX = 0, panY = 0;
  let magnet = true, gridOn = false, gray = false;
  let float: 'left' | 'right' | null = null;
  let saved = true, saveT: ReturnType<typeof setTimeout> | undefined;
  const opt = { flow: FLOWS[0].id, zone: ZONES[0].id, icon: 'avtobus', look: 'doira' as ChEl['look'], rowKind: 'tree' as NonNullable<ChEl['row']>['kind'], tree: TREES[0].id, mob: '' as string, textKind: 'matn' as NonNullable<ChEl['style']['kind']>, activeLayer: '' };
  const hist: string[] = [], fut: string[] = []; let lastMerge = '', lastT = 0;
  const P = (): ChPage => d.pages[d.cur];
  const L = () => { const p = P(); return p.layers.find(l => l.id === opt.activeLayer && !l.locked) ?? [...p.layers].reverse().find(l => !l.locked && l.visible) ?? p.layers[p.layers.length - 1]; };
  const layerOf = (e: ChEl) => P().layers.find(l => l.id === e.layer);
  const editable = (e: ChEl) => { const l = layerOf(e); return !!l && l.visible && !l.locked; };
  const selected = () => P().els.filter(e => sel.has(e.id));
  const tablet = () => innerWidth <= 1180;
  if (tablet()) { d.ui.right = false; }

  /* ---------- tarix va saqlash ---------- */
  const snap = () => JSON.stringify({ pages: d.pages, cur: d.cur });
  function commit(merge = ''): void {
    const now = Date.now();
    if (!(merge && merge === lastMerge && now - lastT < 1200)) { hist.push(snap()); if (hist.length > 80) hist.shift(); fut.length = 0; }
    lastMerge = merge; lastT = now; dirty();
  }
  function dirty(): void { saved = false; syncSave(); clearTimeout(saveT); saveT = setTimeout(flush, 700); }
  function flush(): void { clearTimeout(saveT); if (saved) return; host.save(JSON.parse(JSON.stringify(d))); saved = true; syncSave(); }
  function undo(): void { const s = hist.pop(); if (!s) return; fut.push(snap()); const o = JSON.parse(s); d.pages = o.pages; d.cur = Math.min(o.cur, d.pages.length - 1); sel.clear(); lastMerge = ''; dirty(); renderAll(); }
  function redo(): void { const s = fut.pop(); if (!s) return; hist.push(snap()); const o = JSON.parse(s); d.pages = o.pages; d.cur = Math.min(o.cur, d.pages.length - 1); sel.clear(); lastMerge = ''; dirty(); renderAll(); }
  /** joriy varaqni oʻzgartirish (tarix bilan) */
  function mut(fn: (p: ChPage) => void, merge = '', quiet = false): void { commit(merge); fn(P()); renderCanvas(); if (!quiet) { renderRight(); renderLeft(); } }
  /** quiet — matn maydonlari: oʻng panel qayta chizilmaydi (kursor va fokus saqlanadi) */
  const upd = (id: string, f: (e: ChEl) => void, merge = '', quiet = false) => mut(p => { const e = p.els.find(x => x.id === id); if (e) { f(e); fixSize(e); } }, merge || id, quiet);

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

  /* ---------- qobiq ---------- */
  const wrap = h('div', { class: 'gx ch', role: 'dialog', 'aria-label': 'Chizmadon' });
  const head = h('header', { class: 'sh-top glassbar ch-top' });
  const body = h('div', { class: 'ch-body' });
  wrap.append(head, body);
  document.body.append(wrap);

  const saveChip = h('span', { class: 'chip ok', id: 'chSave' });
  const syncSave = () => { saveChip.className = `chip ${saved ? 'ok' : 'warn'}`; saveChip.replaceChildren(h('i'), tr(saved ? 'Saqlandi' : 'Saqlanmoqda…')); };
  const modeSeg = h('div', { class: 'seg', id: 'chMode', role: 'tablist' });
  const syncMode = () => modeSeg.replaceChildren(...(['muharrir', 'albom'] as const).map(m => h('button', { role: 'tab', 'data-cmode': m, 'aria-pressed': mode === m, onclick: () => { mode = m; sel.clear(); renderAll(); } }, tr(m === 'muharrir' ? 'Muharrir' : 'Albom'))));
  const tabBtn = h('button', { class: 'btn btn-ghost', id: 'chTab', title: tr('Panellarni yashirish · Tab'), onclick: () => togglePanels() }, svgIcon(I.panel), h('span', { class: 'kbd' }, 'Tab'));
  const dlBtn = h('button', { class: 'btn btn-primary', id: 'chDl', onclick: (e: Event) => { e.stopPropagation(); exportMenu(dlBtn); } }, ...icl(I.dl, tr('Yuklab olish')));
  head.append(
    h('button', { class: 'btn btn-ghost icon-btn', id: 'chBack', 'aria-label': tr('Master rejaga qaytish'), title: tr('Master rejaga qaytish'), onclick: close }, svgIcon('<path d="M15 6l-6 6 6 6"/>')),
    h('span', { class: 'brand' }, logoSvg(18), h('b', {}, 'Archemistry Lab')), h('span', { class: 'svcbadge ch-badge' }, h('i'), 'Chizmadon'),
    h('span', { class: 'sh-name' }, `${host.project} · `, (() => { const i = h('input', { class: 'ch-title', id: 'chTitle', value: d.title, 'aria-label': tr('Albom nomi'), maxlength: 120 }) as HTMLInputElement; i.addEventListener('change', () => { d.title = i.value.trim() || d.title; dirty(); }); return i; })()),
    saveChip, h('span', { class: 'spacer' }), modeSeg, tabBtn, dlBtn);

  /* ---------- muharrir: panellar, varaq, asboblar ---------- */
  const left = h('aside', { class: 'ch-panel ch-left' });
  const right = h('aside', { class: 'ch-panel ch-right' });
  const stripL = h('nav', { class: 'ch-strip ch-strip-l', 'aria-label': tr('Chap panel') });
  const stripR = h('nav', { class: 'ch-strip ch-strip-r', 'aria-label': tr('Oʻng panel') });
  const vwrap = h('div', { class: 'ch-vwrap' });
  const view = h('div', { class: 'ch-view', tabindex: '0' });
  const stage = h('div', { class: 'ch-stage' });
  const pageHost = h('div', { class: 'ch-page' });
  const grayHost = h('div', { class: 'ch-gray', hidden: true });
  const ovNS = 'http://www.w3.org/2000/svg';
  const over = document.createElementNS(ovNS, 'svg') as SVGSVGElement; over.classList.add('ch-over');
  stage.append(pageHost, grayHost, over); view.append(stage);
  const zoomBox = h('div', { class: 'ch-zoom glassbar' });
  const tools = h('div', { class: 'ch-tools glassbar', role: 'toolbar', 'aria-label': tr('Asboblar') });
  const hint = h('div', { class: 'ch-hint', hidden: true });
  const fileIn = h('input', { type: 'file', accept: 'image/*', hidden: true }) as HTMLInputElement;
  const jsonIn = h('input', { type: 'file', accept: '.json,application/json', hidden: true }) as HTMLInputElement;
  const albumEl = h('div', { class: 'ch-album', hidden: true });

  function renderAll(): void {
    syncMode(); syncSave();
    wrap.classList.toggle('albom', mode === 'albom');
    if (mode === 'albom') { body.replaceChildren(albumEl, fileIn, jsonIn); albumEl.hidden = false; renderAlbum(); return; }
    vwrap.replaceChildren(view, zoomBox, tools, hint);
    body.replaceChildren(vwrap, stripL, stripR, left, right, fileIn, jsonIn);
    syncPanels(); renderLeft(); renderRight(); renderTools(); renderCanvas(); requestAnimationFrame(() => { if (!zoom) fit(); else applyView(); renderTools(); });
  }

  /* ---------- panellar: ochiq / yigʻiq / suzuvchi ---------- */
  function syncPanels(): void {
    const lOpen = d.ui.left || d.ui.lockL, rOpen = d.ui.right || d.ui.lockR;
    wrap.classList.toggle('l-open', lOpen); wrap.classList.toggle('r-open', rOpen);
    left.hidden = !(lOpen || float === 'left'); right.hidden = !(rOpen || float === 'right');
    left.classList.toggle('float', !lOpen && float === 'left'); right.classList.toggle('float', !rOpen && float === 'right');
    stripL.hidden = lOpen; stripR.hidden = rOpen;
    const warn = pageChecks(P(), tr).filter(c => !c.ok).length;
    stripL.replaceChildren(...([['varaq', I.pages, 'Varaqlar'], ['qatlam', I.layers, 'Qatlamlar'], ['kutubxona', I.lib, 'Kutubxona']] as const).map(([k, ic, n]) =>
      h('button', { class: 'rb', 'data-strip': k, title: tr(n), 'aria-label': tr(n), 'aria-pressed': float === 'left' && d.ui.leftTab === k, onclick: (e: Event) => { e.stopPropagation(); d.ui.leftTab = k; float = float === 'left' ? null : 'left'; if (tablet() && float) { /* bittasi */ } syncPanels(); renderLeft(); } }, svgIcon(ic))));
    stripR.replaceChildren(...([['element', I.el, 'Element'], ['tekshiruv', I.check, 'Tekshiruv']] as const).map(([k, ic, n]) =>
      h('button', { class: 'rb', 'data-strip': k, title: tr(n), 'aria-label': tr(n), 'aria-pressed': float === 'right' && d.ui.rightTab === k, onclick: (e: Event) => { e.stopPropagation(); d.ui.rightTab = k; float = float === 'right' ? null : 'right'; syncPanels(); renderRight(); } }, svgIcon(ic), k === 'tekshiruv' && warn ? h('em', { class: 'ch-dot' }, String(warn)) : '')));
  }
  function collapse(side: 'left' | 'right', open: boolean): void {
    if (side === 'left') d.ui.left = open; else d.ui.right = open;
    if (open && tablet()) { if (side === 'left') d.ui.right = false; else d.ui.left = false; }
    float = null; dirty(); syncPanels(); renderLeft(); renderRight(); requestAnimationFrame(() => { applyView(); renderTools(); });
  }
  function togglePanels(): void {
    const any = d.ui.left || d.ui.right; d.ui.left = !any; d.ui.right = !any && !tablet(); float = null; dirty(); syncPanels(); renderLeft(); renderRight(); requestAnimationFrame(() => { fit(); renderTools(); });
  }
  const panelHead = (side: 'left' | 'right', tabs: HTMLElement) => h('div', { class: 'ch-ph' }, tabs,
    h('button', { class: 'btn btn-ghost icon-btn ch-lock', title: tr('Qulf — doim ochiq'), 'aria-pressed': side === 'left' ? d.ui.lockL : d.ui.lockR, onclick: () => { if (side === 'left') d.ui.lockL = !d.ui.lockL; else d.ui.lockR = !d.ui.lockR; float = null; dirty(); syncPanels(); renderLeft(); renderRight(); } }, svgIcon((side === 'left' ? d.ui.lockL : d.ui.lockR) ? I.lock : I.unlock)),
    h('button', { class: 'btn btn-ghost icon-btn', 'data-collapse': side, title: tr('Panelni yigʻish'), 'aria-label': tr('Panelni yigʻish'), onclick: () => collapse(side, !(side === 'left' ? d.ui.left : d.ui.right) && float === side) }, svgIcon(I.panel)));

  /* ---------- chap panel ---------- */
  function renderLeft(): void {
    if (left.hidden) return;
    const tabs = h('div', { class: 'seg', role: 'tablist', id: 'chLTabs' }, ...([['varaq', 'Varaqlar'], ['qatlam', 'Qatlamlar'], ['kutubxona', 'Kutubxona']] as const).map(([k, n]) => h('button', { role: 'tab', 'data-ltab': k, 'aria-pressed': d.ui.leftTab === k, onclick: () => { d.ui.leftTab = k; renderLeft(); } }, tr(n))));
    const sc = h('div', { class: 'ch-scroll' });
    if (d.ui.leftTab === 'varaq') sc.append(...pagesTab()); else if (d.ui.leftTab === 'qatlam') sc.append(...layersTab()); else sc.append(...libTab());
    left.replaceChildren(panelHead('left', tabs), sc);
  }
  function pagesTab(): HTMLElement[] {
    const list = h('div', { class: 'sh-items', id: 'chPages' }, ...d.pages.map((p, i) => h('div', { class: 'sh-item', 'data-page': i, 'aria-selected': i === d.cur, onclick: () => { if (d.cur !== i) { d.cur = i; sel.clear(); dirty(); renderAll(); } } },
      h('span', { class: 't-small mono' }, String(i + 1).padStart(2, '0')), h('b', {}, tr(p.name)), h('span', { class: 't-small' }, `${p.paper === 'custom' ? `${p.w}×${p.h}` : p.paper} · ${tr(p.landscape ? 'yotiq' : 'tik')} · ${p.els.length} ${tr('element')}`),
      h('div', { class: 'sh-acts' },
        h('button', { class: 'btn btn-ghost icon-btn btn-sm', title: tr('Yuqoriga'), disabled: i === 0, onclick: (e: Event) => { e.stopPropagation(); movePage(i, -1); } }, svgIcon(I.up)),
        h('button', { class: 'btn btn-ghost icon-btn btn-sm', title: tr('Pastga'), disabled: i === d.pages.length - 1, onclick: (e: Event) => { e.stopPropagation(); movePage(i, 1); } }, svgIcon(I.down)),
        h('button', { class: 'btn btn-ghost icon-btn btn-sm', title: tr('Nusxa'), onclick: (e: Event) => { e.stopPropagation(); dupPage(i); } }, svgIcon(I.copy)),
        h('button', { class: 'btn btn-ghost icon-btn btn-sm', title: tr('Oʻchirish'), disabled: d.pages.length < 2, onclick: (e: Event) => { e.stopPropagation(); delPage(i); } }, svgIcon(I.trash))))));
    const inbox = d.inbox.length ? [h('div', { class: 'glabel' }, h('span', {}, tr('Loyihadan')), h('span', {}, String(d.inbox.length))),
      h('div', { class: 'group', id: 'chInbox' }, ...[...d.inbox].reverse().map(it => h('div', { class: 'li' }, h('span', { class: 'k' }, it.name, h('span', { class: 'sub' }, `${tr(it.kind === 'sheet' ? 'Varaqlardan' : it.kind === 'scene' ? 'Sahna rasmi' : 'Reja')}${it.scale ? ` · M 1:${it.scale.toLocaleString('ru-RU')}` : ''}`)),
        h('button', { class: 'btn btn-sm', 'data-place': it.id, onclick: () => placeInbox(it) }, tr('Qoʻyish')))))] : [h('span', { class: 't-small' }, tr('«Loyihadan»: Varaqlar oynasida «Chizmadonga» bosilgan xaritalar shu yerda turadi.'))];
    return [list, h('button', { class: 'btn btn-block', id: 'chAddPage', onclick: () => addPage(blankPage(`${tr('Varaq')} ${d.pages.length + 1}`, P().paper, P().landscape)) }, ...icl(IC.plus, tr('Varaq qoʻshish'))), ...inbox];
  }
  function layersTab(): HTMLElement[] {
    const p = P(), act = L();
    const rows = [...p.layers].reverse().map(l => {
      const i = p.layers.indexOf(l), n = p.els.filter(e => e.layer === l.id).length;
      const name = h('span', { class: 'k' }, l.name, h('span', { class: 'sub' }, `${n} ${tr('element')}`));
      name.addEventListener('dblclick', () => { const inp = h('input', { class: 'input', value: l.name }) as HTMLInputElement; name.replaceWith(inp); inp.focus(); inp.select(); const ok = () => mut(pp => { pp.layers[i].name = inp.value.trim() || l.name; }); inp.addEventListener('change', ok); inp.addEventListener('blur', () => renderLeft()); });
      return h('div', { class: 'li ch-layer', 'data-layer': l.id, 'aria-selected': act.id === l.id, onclick: () => { opt.activeLayer = l.id; renderLeft(); } },
        h('button', { class: 'btn btn-ghost icon-btn btn-sm', title: tr(l.visible ? 'Yashirish' : 'Koʻrsatish'), 'data-vis': l.id, onclick: (e: Event) => { e.stopPropagation(); mut(pp => { pp.layers[i].visible = !l.visible; }); } }, svgIcon(l.visible ? I.eye : I.eyeOff)),
        name,
        h('button', { class: 'btn btn-ghost icon-btn btn-sm', title: tr(l.locked ? 'Qulfdan chiqarish' : 'Qulflash'), 'data-lock': l.id, onclick: (e: Event) => { e.stopPropagation(); mut(pp => { pp.layers[i].locked = !l.locked; }); sel.clear(); } }, svgIcon(l.locked ? I.lock : I.unlock)),
        h('button', { class: 'btn btn-ghost icon-btn btn-sm', title: tr('Yuqoriga'), disabled: i === p.layers.length - 1, onclick: (e: Event) => { e.stopPropagation(); mut(pp => { const [x] = pp.layers.splice(i, 1); pp.layers.splice(i + 1, 0, x); }); } }, svgIcon(I.up)),
        h('button', { class: 'btn btn-ghost icon-btn btn-sm', title: tr('Pastga'), disabled: i === 0, onclick: (e: Event) => { e.stopPropagation(); mut(pp => { const [x] = pp.layers.splice(i, 1); pp.layers.splice(i - 1, 0, x); }); } }, svgIcon(I.down)),
        h('button', { class: 'btn btn-ghost icon-btn btn-sm', title: tr('Oʻchirish'), disabled: p.layers.length < 2, onclick: (e: Event) => { e.stopPropagation(); mut(pp => { const to = pp.layers[i === 0 ? 1 : i - 1].id; pp.els.forEach(x => { if (x.layer === l.id) x.layer = to; }); pp.layers.splice(i, 1); }); } }, svgIcon(I.trash)));
    });
    return [h('div', { class: 'glabel' }, h('span', {}, tr('Qatlamlar')), h('span', {}, tr('faol: ') + act.name)), h('div', { class: 'group', id: 'chLayers' }, ...rows),
      h('button', { class: 'btn btn-block', id: 'chAddLayer', onclick: () => mut(pp => { const l = { id: cid('l'), name: `${tr('Qatlam')} ${pp.layers.length + 1}`, visible: true, locked: false }; pp.layers.push(l); opt.activeLayer = l.id; }) }, ...icl(IC.plus, tr('Qatlam'))),
      h('span', { class: 't-small' }, tr('Ikki marta bosing — nomini oʻzgartirish. Yangi element faol qatlamga tushadi.'))];
  }
  function libTab(): HTMLElement[] {
    const sub = h('div', { class: 'seg sm', role: 'tablist', id: 'chLib' }, ...([['belgi', 'Belgilar'], ['daraxt', 'Daraxtlar'], ['yol', 'Yoʻllar'], ['rang', 'Ranglar']] as const).map(([k, n]) => h('button', { role: 'tab', 'data-lib': k, 'aria-pressed': d.ui.libTab === k, onclick: () => { d.ui.libTab = k; renderLeft(); } }, tr(n))));
    const out: HTMLElement[] = [sub];
    const one = selected().length === 1 ? selected()[0] : null;
    if (d.ui.libTab === 'belgi') {
      out.push(h('div', { class: 'seg sm', id: 'chLook' }, ...LOOKS.map(l => h('button', { 'aria-pressed': opt.look === l.id, onclick: () => { opt.look = l.id; if (one?.t === 'icon') upd(one.id, e => { e.look = l.id; }); renderLeft(); } }, tr(l.name)))));
      for (const g of ICON_GROUPS) out.push(h('div', { class: 'glabel' }, h('span', {}, tr(g.name)), h('span', {}, String(g.icons.length))),
        h('div', { class: 'ch-icons' }, ...g.icons.map(ic => h('button', { class: 'ch-ic', 'data-icon': ic.id, title: tr(ic.name), 'aria-label': tr(ic.name), 'aria-pressed': opt.icon === ic.id, onclick: () => { opt.icon = ic.id; if (one?.t === 'icon') upd(one.id, e => { e.icon = ic.id; e.name = ic.name; if (ic.risk) e.style.risk = true; }); else setTool('icon'); renderLeft(); } }, svgIcon(`<path d="${ic.d}"/>`)))));
    } else if (d.ui.libTab === 'daraxt') {
      out.push(h('div', { class: 'glabel' }, h('span', {}, tr('Toshkent daraxtlari')), h('span', {}, tf('${n} tur', { n: TREES.length }))),
        h('div', { class: 'group', id: 'chTrees' }, ...TREES.map(t => h('button', { class: 'li', 'data-tree': t.id, 'aria-pressed': opt.tree === t.id && opt.rowKind === 'tree', onclick: () => { opt.tree = t.id; opt.rowKind = 'tree'; if (one?.t === 'row') upd(one.id, e => { e.row = { ...e.row!, kind: 'tree', tree: t.id }; e.name = t.name; }); else setTool('row'); renderLeft(); } },
          h('span', { class: 'ch-tg', html: `<svg viewBox="0 0 20 20" width="22" height="22">${treeIcon(t.id)}</svg>` }), h('span', { class: 'k' }, t.name, h('span', { class: 'sub', style: 'font-style:italic' }, t.latin)), h('span', { class: 'v' }, h('b', {}, t.h), h('span', { class: 'sub' }, tr(t.role)))))),
        h('div', { class: 'glabel' }, h('span', {}, tr('Qator'))),
        seg([{ id: 'tree', label: tr('Daraxtlar') }, { id: 'people', label: tr('Odamlar') }, { id: 'dot', label: tr('Nuqtalar') }, { id: 'icon', label: tr('Belgi') }], opt.rowKind, v => { opt.rowKind = v; if (one?.t === 'row') upd(one.id, e => { e.row = { ...e.row!, kind: v }; }); setTool('row'); renderLeft(); }, { id: 'chRowKind' }));
    } else if (d.ui.libTab === 'yol') {
      out.push(h('div', { class: 'glabel' }, h('span', {}, tr('Harakatlanish ierarxiyasi')), h('span', {}, String(MOBILITY.length))),
        h('div', { class: 'group', id: 'chMob' }, ...MOBILITY.map(m => h('button', { class: 'li', 'data-mob': m.id, 'aria-pressed': opt.mob === m.id, onclick: () => { opt.mob = m.id; if (one && (one.t === 'line' || one.t === 'arrow' || one.t === 'pen')) upd(one.id, e => { e.style = { ...e.style, ...m.style }; e.name = m.name; e.preset = m.id; }); else setTool('line'); renderLeft(); } },
          h('span', { class: 'ch-sw', html: `<svg viewBox="0 0 40 10" width="44" height="12">${lineSample(m.style)}</svg>` }), h('span', { class: 'k' }, tr(m.name))))),
        h('div', { class: 'glabel' }, h('span', {}, tr('Yoʻnalish oʻqi')), h('span', {}, String(FLOWS.length))),
        h('div', { class: 'group' }, ...FLOWS.map(f => h('button', { class: 'li', 'data-flowlib': f.id, onclick: () => { opt.flow = f.id; setTool('flow'); } }, h('span', { class: 'ch-sw', html: `<svg viewBox="0 0 40 10" width="44" height="12">${flowSample(f.style)}</svg>` }), h('span', { class: 'k' }, tr(f.name))))),
        h('div', { class: 'glabel' }, h('span', {}, tr('Chiziq turlari')), h('span', {}, String(DASHES.length))),
        h('div', { class: 'group' }, ...DASHES.map(x => h('button', { class: 'li', 'data-dash': x.id, onclick: () => { if (one) upd(one.id, e => { e.style.dash = x.id; }); } }, h('span', { class: 'ch-sw', html: `<svg viewBox="0 0 40 10" width="44" height="12">${lineSample({ stroke: '#141414', width: 0.8, dash: x.id })}</svg>` }), h('span', { class: 'k' }, tr(x.name))))));
    } else {
      out.push(h('div', { class: 'glabel' }, h('span', {}, tr('Kartografik palitralar')), h('span', {}, String(PALETTES.length))),
        h('div', { class: 'group', id: 'chPal' }, ...PALETTES.map(pl => h('button', { class: 'li', 'data-pal': pl.id, 'aria-pressed': d.palette === pl.id, onclick: () => { d.palette = pl.id; dirty(); renderLeft(); renderRight(); } },
          h('span', { class: 'k' }, tr(pl.name)), h('span', { class: 'ch-swatches' }, ...pl.colors.map(c => h('i', { style: `background:${c}` })))))),
        h('button', { class: 'btn btn-block', id: 'chPalSeq', disabled: sel.size < 1, onclick: () => paletteSeq() }, tr('Tanlanganlarga palitrani ketma-ket berish')),
        h('div', { class: 'glabel' }, h('span', {}, tr('Zona namunalari')), h('span', {}, String(ZONES.length))),
        h('div', { class: 'group' }, ...ZONES.map(z => h('button', { class: 'li', 'data-zonelib': z.id, onclick: () => { opt.zone = z.id; if (one?.t === 'zone') upd(one.id, e => { e.style.fill = z.fill; e.name = z.name; e.preset = z.id; }); else setTool('zone'); } }, h('i', { class: 'ch-zs', style: `background:${z.fill}` }), h('span', { class: 'k' }, tr(z.name))))));
    }
    return out;
  }
  const treeIcon = (id: string) => { const t = TREES.find(x => x.id === id)!; return `<g transform="translate(10 10)">${t.crown === 'column' ? `<ellipse rx="4" ry="8" fill="${t.color}"/>` : t.crown === 'cone' ? `<path d="M0-8L6 7H-6z" fill="${t.color}"/>` : t.crown === 'oval' ? `<ellipse rx="6" ry="8" fill="${t.color}"/>` : `<circle r="${t.crown === 'spread' ? 9 : 7.5}" fill="${t.color}"/>`}</g>`; };
  const lineSample = (s: ChEl['style']) => `<path d="M2 5H38" stroke="${s.stroke}" stroke-width="${Math.max(1, (s.width ?? 1) * 1.6)}" stroke-linecap="round"${s.dash && s.dash !== 'solid' ? ` stroke-dasharray="${s.dash === 'dot' ? '0 4' : s.dash === 'long' ? '9 3' : s.dash === 'dashdot' ? '6 2 0 2' : s.dash === 'dash2dot' ? '6 2 0 2 0 2' : '4 3'}"` : ''}/>${s.deco === 'rail' ? '<path d="M6 2v6M12 2v6M18 2v6M24 2v6M30 2v6" stroke="#4a4a48"/>' : ''}`;
  const flowSample = (s: ChEl['style']) => `<path d="M2 7C14 7 22 3 34 3" fill="none" stroke="${s.stroke}" stroke-width="${s.band === 'nuqta' ? 2.5 : 4}" stroke-linecap="round"${s.band === 'nuqta' ? ' stroke-dasharray="0 4"' : s.band === 'punktir' ? ' stroke-dasharray="5 3"' : ''}/>`;

  /* ---------- oʻng panel ---------- */
  function renderRight(): void {
    if (right.hidden) return;
    const warn = pageChecks(P(), tr).filter(c => !c.ok).length;
    const tabs = h('div', { class: 'seg', role: 'tablist', id: 'chRTabs' },
      h('button', { role: 'tab', 'data-rtab': 'element', 'aria-pressed': d.ui.rightTab === 'element', onclick: () => { d.ui.rightTab = 'element'; renderRight(); } }, tr('Element')),
      h('button', { role: 'tab', 'data-rtab': 'tekshiruv', 'aria-pressed': d.ui.rightTab === 'tekshiruv', onclick: () => { d.ui.rightTab = 'tekshiruv'; renderRight(); } }, `${tr('Tekshiruv')} · ${7 - warn}/7`));
    const sc = h('div', { class: 'ch-scroll' });
    let foot: HTMLElement | string = '';
    if (d.ui.rightTab === 'tekshiruv') sc.append(...checkTab());
    else { const els = selected(); if (!els.length) sc.append(...pageProps()); else if (els.length === 1) { sc.append(...elProps(els[0])); foot = elFoot(); } else { sc.append(...multiProps(els)); foot = elFoot(); } }
    right.replaceChildren(panelHead('right', tabs), sc, foot);
  }
  const lbl = (t: string, v?: string) => h('div', { class: 'glabel' }, h('span', {}, tr(t)), v != null ? h('span', {}, v) : '');
  const colorRow = (cur: string | undefined, set: (c: string) => void, allowNone = false, id = '') => h('div', { class: 'ch-colors', ...(id ? { id } : {}) },
    ...(allowNone ? [h('button', { class: 'ch-c none', title: tr('Yoʻq'), 'aria-pressed': !cur || cur === 'none', onclick: () => set('none') })] : []),
    ...[...paletteById(d.palette).colors, '#141414', '#ffffff'].filter((c, i, a) => a.indexOf(c) === i).map(c => h('button', { class: 'ch-c', style: `background:${c}`, title: c, 'data-color': c, 'aria-pressed': (cur ?? '').toLowerCase() === c.toLowerCase(), onclick: () => set(c) })),
    (() => { const i = h('input', { type: 'color', class: 'ch-cpick', value: cur && cur.startsWith('#') && cur.length === 7 ? cur : '#808080', title: tr('Boshqa rang') }) as HTMLInputElement; i.addEventListener('input', () => set(i.value)); return i; })());
  const field = (label: string, ctrl: HTMLElement) => h('div', { class: 'li' }, h('span', { class: 'k' }, tr(label)), ctrl);

  function pageProps(): HTMLElement[] {
    const p = P(), [W, H] = pageSize(p);
    const name = h('input', { class: 'input', id: 'chPageName', value: p.name, 'aria-label': tr('Varaq nomi') }) as HTMLInputElement;
    name.addEventListener('change', () => mut(pp => { pp.name = name.value.trim() || pp.name; }));
    const toolHelp = TOOLS.find(t => t.id === tool)!;
    return [
      h('div', { class: 'ch-eh' }, h('b', { class: 't-title' }, tr('Varaq')), h('span', { class: 't-small' }, `${p.paper === 'custom' ? '' : p.paper + ' · '}${W} × ${H} mm`)),
      name,
      lbl('Format'),
      h('div', { class: 'seg sm', id: 'chPaper' }, ...(['A4', 'A3', 'A2', 'A1', 'A0', 'A0+', 'custom'] as ChPaper[]).map(x => h('button', { 'data-paper': x, 'aria-pressed': p.paper === x, onclick: () => mut(pp => { pp.paper = x; if (x === 'custom') { pp.w = W; pp.h = H; } }) }, x === 'custom' ? tr('Ixtiyoriy') : x))),
      h('div', { class: 'row2', hidden: p.paper !== 'custom' }, stepper({ min: 50, max: 5000, step: 1, value: W, label: tr('Eni, mm'), onchange: v => mut(pp => { pp.w = v; }, 'pw') }), stepper({ min: 50, max: 5000, step: 1, value: H, label: tr('Boʻyi, mm'), onchange: v => mut(pp => { pp.h = v; }, 'ph') })),
      seg([{ id: 'land', label: tr('Gorizontal') }, { id: 'port', label: tr('Portret') }], p.landscape ? 'land' : 'port', v => mut(pp => { pp.landscape = v === 'land'; }), { id: 'chOrient' }),
      lbl('Asbob', tr(toolHelp.name)),
      ...toolOpts(),
      h('span', { class: 't-small' }, tr('Elementni tanlang yoki chizing. Shift — bir nechtasini, Alt + sudrash — xarita ichini surish, ikki marta bosish — chizishni tugatish.')),
    ];
  }
  function toolOpts(): HTMLElement[] {
    if (tool === 'flow') return [h('div', { class: 'group', id: 'chFlowPre' }, ...FLOWS.map(f => h('button', { class: 'li', 'data-flow': f.id, 'aria-pressed': opt.flow === f.id, onclick: () => { opt.flow = f.id; renderRight(); } }, h('span', { class: 'ch-sw', html: `<svg viewBox="0 0 40 10" width="44" height="12">${flowSample(f.style)}</svg>` }), h('span', { class: 'k' }, tr(f.name)))))];
    if (tool === 'zone') return [h('div', { class: 'group', id: 'chZonePre' }, ...ZONES.map(z => h('button', { class: 'li', 'data-zone': z.id, 'aria-pressed': opt.zone === z.id, onclick: () => { opt.zone = z.id; renderRight(); } }, h('i', { class: 'ch-zs', style: `background:${z.fill}` }), h('span', { class: 'k' }, tr(z.name)))))];
    if (tool === 'text') return [seg(TEXT_KINDS.map(k => ({ id: k.id, label: tr(k.name) })), opt.textKind, v => { opt.textKind = v; renderRight(); }, { id: 'chTextKind' })];
    if (tool === 'icon') return [h('span', { class: 't-small' }, `${tr('Belgi')}: ${tr(iconById(opt.icon).name)} · ${tr('Kutubxona → Belgilar')}`)];
    if (tool === 'row') return [h('span', { class: 't-small' }, `${tr('Qator')}: ${tr(opt.rowKind === 'tree' ? TREES.find(t => t.id === opt.tree)!.name : opt.rowKind === 'people' ? 'Odamlar' : opt.rowKind === 'dot' ? 'Nuqtalar' : 'Belgi')} · ${tr('Kutubxona → Daraxtlar')}`)];
    if (tool === 'line' || tool === 'arrow') return [h('span', { class: 't-small' }, opt.mob ? `${tr('Namuna')}: ${tr(MOBILITY.find(m => m.id === opt.mob)!.name)}` : tr('Kutubxona → Yoʻllar: harakatlanish ierarxiyasi'))];
    if (tool === 'map') return [h('span', { class: 't-small' }, tr('Ramka chizing; manbani oʻng panelda tanlang: loyiha bosh rejasi, sahna rasmi yoki «Loyihadan».'))];
    return [];
  }
  function elFoot(): HTMLElement {
    return h('div', { class: 'ch-foot' },
      h('button', { class: 'btn icon-btn', id: 'chDup', title: tr('Nusxa (Ctrl+D)'), onclick: () => duplicate() }, svgIcon(I.copy)),
      h('button', { class: 'btn', id: 'chFront', onclick: () => order(1) }, tr('Oldinga')),
      h('button', { class: 'btn', id: 'chBackw', onclick: () => order(-1) }, tr('Orqaga')),
      h('button', { class: 'btn icon-btn danger', id: 'chDel', title: tr('Oʻchirish (Del)'), onclick: () => remove() }, svgIcon(I.trash)));
  }
  function elProps(e: ChEl): HTMLElement[] {
    const b = bbox(e), out: HTMLElement[] = [];
    const lay = layerOf(e);
    out.push(h('div', { class: 'ch-eh' }, h('b', { class: 't-title', id: 'chElT' }, tr(e.preset ? (FLOWS.find(f => f.id === e.preset)?.name ?? e.name ?? TYPE_NAME[e.t]) : TYPE_NAME[e.t])), h('span', { class: 't-small' }, `«${lay?.name ?? ''}» ${tr('qatlami')} · ${Math.round(b[2] - b[0])} × ${Math.round(b[3] - b[1])} mm`)));
    const S = (f: (s: ChEl['style']) => void, m = '') => upd(e.id, x => f(x.style), m);
    const nameIn = h('input', { class: 'input', id: 'chElName', value: e.name ?? '', placeholder: tr('Nomi (shartli belgilar uchun)') }) as HTMLInputElement;
    nameIn.addEventListener('input', () => upd(e.id, x => { x.name = nameIn.value || undefined; }, 'name', true));
    const opacity = (def: number) => field('Shaffoflik', h('div', { class: 'ch-rng' }, range({ min: 10, max: 100, step: 5, value: Math.round((e.style.opacity ?? def) * 100), oninput: v => S(s => { s.opacity = v / 100; }, 'op'), 'aria-label': tr('Shaffoflik') }), h('span', { class: 'num' }, `${Math.round((e.style.opacity ?? def) * 100)} %`)));
    const width = (label = 'Qalinlik, mm', min = 0.1, max = 20, step = 0.1) => field(label, stepper({ min, max, step, value: e.style.width ?? 1, label: tr(label), onchange: v => S(s => { s.width = v; }, 'w') }));
    const headSeg = () => field('Uchi', seg([{ id: 'none', label: '—' }, { id: 'end', label: '→' }, { id: 'both', label: '↔' }], (e.style.head ?? (e.t === 'arrow' ? 'end' : 'none')) as 'none' | 'end' | 'both', v => S(s => { s.head = v; }), { id: 'chHead' }));
    switch (e.t) {
      case 'flow':
        out.push(lbl('Namuna', String(FLOWS.length)), h('div', { class: 'group', id: 'chFlowSet' }, ...FLOWS.map(f => h('button', { class: 'li', 'data-flow': f.id, 'aria-pressed': e.preset === f.id, onclick: () => upd(e.id, x => { x.style = { ...x.style, ...f.style }; x.preset = f.id; x.name = f.name; }) }, h('span', { class: 'ch-sw', html: `<svg viewBox="0 0 40 10" width="44" height="12">${flowSample(f.style)}</svg>` }), h('span', { class: 'k' }, tr(f.name))))),
          lbl('Uslub'), seg(BANDS.map(x => ({ id: x.id, label: tr(x.name) })), e.style.band ?? 'toliq', v => S(s => { s.band = v; }), { id: 'chBand' }),
          h('div', { class: 'row2' }, width('Qalinlik, mm', 0.5, 30, 0.5), headSeg()),
          h('div', { class: 'group' }, field('Silliq egri', sw({ id: 'chSmooth', label: tr('Silliq egri'), on: e.style.smooth !== false, onchange: v => S(s => { s.smooth = v; }) })), opacity(0.85)),
          lbl('Rang'), colorRow(e.style.stroke, c => S(s => { s.stroke = c; }), false, 'chColor'), nameIn);
        break;
      case 'zone':
        out.push(lbl('Namuna', String(ZONES.length)), h('div', { class: 'group' }, ...ZONES.map(z => h('button', { class: 'li', 'data-zone': z.id, 'aria-pressed': e.preset === z.id, onclick: () => upd(e.id, x => { x.style.fill = z.fill; x.preset = z.id; x.name = z.name; }) }, h('i', { class: 'ch-zs', style: `background:${z.fill}` }), h('span', { class: 'k' }, tr(z.name))))),
          h('div', { class: 'group' }, field('Yumshoq chegara, mm', stepper({ min: 0, max: 40, step: 1, value: e.style.halo ?? 6, label: tr('Yumshoq chegara'), onchange: v => S(s => { s.halo = v; }, 'halo') })), opacity(0.55)),
          lbl('Rang'), colorRow(e.style.fill, c => S(s => { s.fill = c; }), false, 'chColor'), nameIn);
        break;
      case 'line': case 'arrow': case 'pen':
        out.push(lbl('Harakatlanish ierarxiyasi'), select({ id: 'chMobSel', onchange: v => { const m = MOBILITY.find(x => x.id === v); if (m) upd(e.id, x => { x.style = { ...x.style, ...m.style }; x.preset = m.id; x.name = m.name; }); } }, [{ value: '', label: '—', selected: !e.preset }, ...MOBILITY.map(m => ({ value: m.id, label: tr(m.name), selected: e.preset === m.id }))]),
          lbl('Chiziq turi'), select({ id: 'chDash', onchange: v => S(s => { s.dash = v as ChEl['style']['dash']; }) }, DASHES.map(x => ({ value: x.id, label: tr(x.name), selected: (e.style.dash ?? 'solid') === x.id }))),
          h('div', { class: 'row2' }, width(), headSeg()),
          e.t !== 'pen' ? h('div', { class: 'group' }, field('Silliq egri', sw({ id: 'chSmooth', label: tr('Silliq egri'), on: !!e.style.smooth, onchange: v => S(s => { s.smooth = v; }) })), opacity(1)) : h('div', { class: 'group' }, opacity(1)),
          lbl('Rang'), colorRow(e.style.stroke, c => S(s => { s.stroke = c; }), false, 'chColor'), nameIn);
        break;
      case 'rect': case 'ellipse': case 'poly':
        out.push(lbl('Toʻldirish'), colorRow(e.style.fill, c => S(s => { s.fill = c; }), true, 'chFill'), lbl('Kontur'), colorRow(e.style.stroke, c => S(s => { s.stroke = c; }), true, 'chStroke'),
          h('div', { class: 'row2' }, width('Kontur, mm', 0, 10, 0.1), field('Chiziq', select({ onchange: v => S(s => { s.dash = v as ChEl['style']['dash']; }) }, DASHES.map(x => ({ value: x.id, label: tr(x.name), selected: (e.style.dash ?? 'solid') === x.id }))))),
          h('div', { class: 'group' }, opacity(1)), nameIn);
        break;
      case 'text': {
        const ta = h('textarea', { class: 'input ch-ta', id: 'chText', rows: 3 }, e.text ?? '') as HTMLTextAreaElement;
        ta.addEventListener('input', () => upd(e.id, x => { x.text = ta.value; }, 'txt', true));
        out.push(ta, lbl('Yozuv turi'), seg(TEXT_KINDS.map(k => ({ id: k.id, label: tr(k.name) })), e.style.kind ?? 'matn', v => { const k = TEXT_KINDS.find(x => x.id === v)!; S(s => { s.kind = v; s.size = k.size; s.bold = k.bold; s.font = k.font; }); }, { id: 'chKind' }),
          lbl('Shrift'), select({ id: 'chFont', onchange: v => S(s => { s.font = v; }) }, FONTS.map(f => ({ value: f, label: f, selected: (e.style.font ?? 'Archivo') === f }))),
          h('div', { class: 'row2' }, field('Oʻlcham, pt', stepper({ min: 4, max: 300, step: 1, value: e.style.size ?? 11, label: tr('Oʻlcham, pt'), onchange: v => S(s => { s.size = v; }, 'sz') })), field('Qator oraligʻi', stepper({ min: 0.8, max: 3, step: 0.05, value: e.style.lh ?? 1.25, label: tr('Qator oraligʻi'), onchange: v => S(s => { s.lh = v; }, 'lh') }))),
          h('div', { class: 'row2' },
            h('div', { class: 'seg sm', id: 'chBI' }, h('button', { 'aria-pressed': !!e.style.bold, onclick: () => S(s => { s.bold = !s.bold; }), style: 'font-weight:700' }, 'B'), h('button', { 'aria-pressed': !!e.style.italic, onclick: () => S(s => { s.italic = !s.italic; }), style: 'font-style:italic' }, 'I')),
            seg([{ id: 'start', label: '⟸' }, { id: 'middle', label: '≡' }, { id: 'end', label: '⟹' }], e.style.align ?? 'start', v => S(s => { s.align = v; }), { id: 'chAlign' })),
          lbl('Rang'), colorRow(e.style.fill, c => S(s => { s.fill = c; }), false, 'chColor'));
        break;
      }
      case 'icon':
        out.push(h('div', { class: 'li' }, h('span', { class: 'ch-ic big', html: `<svg viewBox="0 0 24 24" width="28" height="28"><path d="${iconById(e.icon).d}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>` }), h('span', { class: 'k' }, tr(iconById(e.icon).name), h('span', { class: 'sub' }, tr('Kutubxona → Belgilar: almashtirish')))),
          lbl('Koʻrinish'), seg(LOOKS.map(l => ({ id: l.id, label: tr(l.name) })), e.look ?? 'doira', v => upd(e.id, x => { x.look = v; }), { id: 'chLookEl' }),
          field('Oʻlcham, mm', stepper({ min: 3, max: 200, step: 1, value: Math.round(e.w ?? 10), label: tr('Oʻlcham, mm'), onchange: v => upd(e.id, x => { const c = [(x.x ?? 0) + (x.w ?? 0) / 2, (x.y ?? 0) + (x.h ?? 0) / 2]; x.w = v; x.h = v; x.x = c[0] - v / 2; x.y = c[1] - v / 2; }, 'isz') })),
          h('div', { class: 'group' }, field('Xavf belgisi', sw({ label: tr('Xavf belgisi'), on: !!e.style.risk, onchange: v => S(s => { s.risk = v; }) })), opacity(1)),
          lbl('Rang'), colorRow(e.style.stroke, c => S(s => { s.stroke = c; }), false, 'chColor'), nameIn);
        break;
      case 'row': {
        const r = e.row ?? { kind: 'tree', gap: 8, size: 5 };
        out.push(lbl('Qator'), seg([{ id: 'tree', label: tr('Daraxtlar') }, { id: 'people', label: tr('Odamlar') }, { id: 'dot', label: tr('Nuqtalar') }, { id: 'icon', label: tr('Belgi') }], r.kind, v => upd(e.id, x => { x.row = { ...r, kind: v }; }), { id: 'chRowK' }),
          r.kind !== 'tree' ? h('span') : select({ id: 'chTreeSel', onchange: v => upd(e.id, x => { x.row = { ...r, tree: v }; x.name = TREES.find(t => t.id === v)!.name; }) }, TREES.map(t => ({ value: t.id, label: `${t.name} — ${t.latin}`, selected: (r.tree ?? 'chinor') === t.id }))),
          h('div', { class: 'row2' }, field('Oraliq, mm', stepper({ min: 1, max: 200, step: 0.5, value: r.gap, label: tr('Oraliq, mm'), onchange: v => upd(e.id, x => { x.row = { ...x.row!, gap: v }; }, 'gap') })), field('Oʻlcham, mm', stepper({ min: 1, max: 100, step: 0.5, value: r.size, label: tr('Oʻlcham, mm'), onchange: v => upd(e.id, x => { x.row = { ...x.row!, size: v }; }, 'rsz') }))),
          lbl('Rang'), colorRow(e.style.fill, c => S(s => { s.fill = c; }), true, 'chColor'), nameIn);
        break;
      }
      case 'image':
        out.push(h('button', { class: 'btn btn-block', id: 'chImgPick', onclick: () => pickImage(e.id) }, ...icl(I.dl, tr(e.src ? 'Rasmni almashtirish' : 'Rasm tanlash'))),
          h('div', { class: 'group' }, opacity(1), field('Ramka', sw({ label: tr('Ramka'), on: !!e.style.stroke, onchange: v => S(s => { s.stroke = v ? '#141414' : undefined; }) }))), nameIn);
        break;
      case 'map': {
        const sc = mapScale(e);
        const scIn = h('input', { class: 'input num', id: 'chMapScale', type: 'number', min: 50, max: 1000000, value: sc ?? '', placeholder: tr('masshtabsiz') }) as HTMLInputElement;
        scIn.addEventListener('change', () => { const N = Number(scIn.value); if (!(N > 0) || !e.scale || !e.vb) return; upd(e.id, x => { const vb = x.vb!, cx = vb[0] + vb[2] / 2, cy = vb[1] + vb[3] / 2, w = Math.abs(x.w ?? 100), hh = Math.abs(x.h ?? 100), vw = N * w / x.scale!, vh = vw * hh / w; x.vb = [cx - vw / 2, cy - vh / 2, vw, vh]; x.natW = vw; }); });
        out.push(lbl('Manba'),
          h('div', { class: 'group', id: 'chMapSrc' },
            h('button', { class: 'li', 'data-src': 'site', onclick: () => setMapSource(e.id, 'site') }, h('span', { class: 'k' }, tr('Loyiha bosh rejasi'), h('span', { class: 'sub' }, tr('Varaqlar · vektor, masshtab bilan')))),
            h('button', { class: 'li', 'data-src': 'scene', onclick: () => setMapSource(e.id, 'scene') }, h('span', { class: 'k' }, tr('Sahna rasmi'), h('span', { class: 'sub' }, tr('joriy 3D koʻrinish (fon: sxematik yoki sunʼiy yoʻldosh)')))),
            ...d.inbox.map(it => h('button', { class: 'li', 'data-src': it.id, onclick: () => setMapSource(e.id, it) }, h('span', { class: 'k' }, it.name, h('span', { class: 'sub' }, tr('Loyihadan')))))),
          field('Masshtab 1:', scIn),
          h('span', { class: 't-small' }, tr('Xarita ichini surish — Alt + sudrash. Ramka oʻlchami oʻzgarsa masshtab qayta hisoblanadi.')),
          h('div', { class: 'group' }, field('Masshtab yozuvi', sw({ label: tr('Masshtab yozuvi'), on: e.style.kind !== 'izoh', onchange: v => S(s => { s.kind = v ? undefined : 'izoh'; }) }))), nameIn);
        break;
      }
      case 'legend':
        out.push(field('Sarlavha', (() => { const i = h('input', { class: 'input', value: e.text ?? '' }) as HTMLInputElement; i.addEventListener('input', () => upd(e.id, x => { x.text = i.value; }, 'lt', true)); return i; })()),
          field('Oʻlcham, pt', stepper({ min: 5, max: 40, step: 0.5, value: e.style.size ?? 9, label: tr('Oʻlcham, pt'), onchange: v => S(s => { s.size = v; }, 'ls') })),
          h('span', { class: 't-small' }, tr('Shartli belgilar varaqdagi nomlangan elementlar ranglaridan avtomatik tuziladi.')));
        break;
      case 'table': {
        const ta = h('textarea', { class: 'input ch-ta', id: 'chTable', rows: 8 }, (e.rows ?? []).map(r => r.join('\t')).join('\n')) as HTMLTextAreaElement;
        ta.addEventListener('input', () => upd(e.id, x => { x.rows = ta.value.split('\n').map(r => r.split('\t')); }, 'tab', true));
        out.push(lbl('Qatorlar (Tab bilan ajrating)'), ta, field('Oʻlcham, pt', stepper({ min: 5, max: 40, step: 0.5, value: e.style.size ?? 8, label: tr('Oʻlcham, pt'), onchange: v => S(s => { s.size = v; }, 'ts') })));
        break;
      }
    }
    out.push(lbl('Joylashuv'), h('div', { class: 'row2' },
      field('Burish, °', stepper({ min: -180, max: 180, step: 1, value: e.rot ?? 0, label: tr('Burish'), onchange: v => upd(e.id, x => { x.rot = v || undefined; }, 'rot') })),
      h('div', { class: 'seg sm' }, h('button', { title: tr('Gorizontal akslantirish'), 'aria-label': tr('Gorizontal akslantirish'), onclick: () => flip('x') }, svgIcon(I.flipH)), h('button', { title: tr('Vertikal akslantirish'), 'aria-label': tr('Vertikal akslantirish'), onclick: () => flip('y') }, svgIcon(I.flipV)))),
      field('Qatlam', select({ id: 'chElLayer', onchange: v => upd(e.id, x => { x.layer = v; }) }, P().layers.map(l => ({ value: l.id, label: l.name, selected: l.id === e.layer })))));
    return out;
  }
  function multiProps(els: ChEl[]): HTMLElement[] {
    const grouped = els.every(e => e.group && e.group === els[0].group);
    return [h('div', { class: 'ch-eh' }, h('b', { class: 't-title' }, tf('${n} ta element', { n: els.length })), h('span', { class: 't-small' }, tr(grouped ? 'guruh' : 'tanlov'))),
      h('div', { class: 'row2' },
        h('button', { class: 'btn', id: 'chGroup', onclick: () => group(!grouped) }, ...icl(I.grp, tr(grouped ? 'Ajratish' : 'Guruhlash'))),
        h('button', { class: 'btn', id: 'chSeq', onclick: () => paletteSeq() }, tr('Palitra ketma-ket'))),
      lbl('Taqsimlash'), h('div', { class: 'row2' }, h('button', { class: 'btn', id: 'chDistH', disabled: els.length < 3, onclick: () => distribute('x') }, ...icl(I.distH, tr('Gorizontal'))), h('button', { class: 'btn', id: 'chDistV', disabled: els.length < 3, onclick: () => distribute('y') }, ...icl(I.distV, tr('Vertikal')))),
      lbl('Tekislash'), h('div', { class: 'seg sm', id: 'chAlignEls' }, ...([['l', 'Chap'], ['cx', 'Markaz'], ['r', 'Oʻng'], ['t', 'Tepa'], ['cy', 'Oʻrta'], ['b', 'Past']] as const).map(([k, n]) => h('button', { onclick: () => alignEls(k) }, tr(n))))];
  }
  function checkTab(): HTMLElement[] {
    const cs = pageChecks(P(), tr);
    return [h('div', { class: 'ch-eh' }, h('b', { class: 't-title' }, tr('Varaq tekshiruvi')), h('span', { class: 't-small' }, `${cs.filter(c => c.ok).length} / 7 · ${tr(P().name)}`)),
      h('div', { class: 'group', id: 'chChecks' }, ...cs.map(c => h('div', { class: 'li', 'data-check': c.id },
        h('span', { class: `chip ${c.ok ? 'ok' : 'warn'}`, 'aria-label': tr(c.ok ? 'mos' : 'ogohlantirish') }, h('i'), String(c.id)),
        h('span', { class: 'k' }, c.title, h('span', { class: 'sub' }, c.note)),
        c.fix ? h('button', { class: 'btn btn-sm', 'data-fix': c.id, onclick: () => { mut(p => { const f = applyFix(p, c.id, d.palette); p.els = f.els; p.layers = f.layers; }); toast(tr('Tuzatildi')); } }, c.fix) : ''))),
      h('div', { class: 'group' }, field('Kulrang sinov', sw({ id: 'chGray', label: tr('Kulrang sinov'), on: gray, onchange: v => { gray = v; renderCanvas(); renderRight(); } }))),
      h('span', { class: 't-small' }, tr('Kulrang sinov varaqning oʻng yarmini kulrangda koʻrsatadi — toifalar yorqinlik boʻyicha ham ajralishi kerak.'))];
  }

  /* ---------- varaq, koʻrinish ---------- */
  const PXMM = 96 / 25.4;
  function stageSize(): [number, number] { const [W, H] = pageSize(P()); return [W * PXMM * zoom, H * PXMM * zoom]; }
  function fit(): void { const r = view.getBoundingClientRect(), [W, H] = pageSize(P()); if (!r.width) return; const padL = d.ui.left || d.ui.lockL ? 0 : 0; zoom = Math.min((r.width - 80 - padL) / (W * PXMM), (r.height - 140) / (H * PXMM)); const [sw2, sh2] = stageSize(); panX = (r.width - sw2) / 2; panY = (r.height - sh2) / 2 - 20; applyView(); }
  function applyView(): void {
    if (!zoom) { fit(); return; }
    const [sw2, sh2] = stageSize();
    stage.style.width = `${sw2}px`; stage.style.height = `${sh2}px`; stage.style.transform = `translate(${panX}px, ${panY}px)`;
    zoomBox.replaceChildren(
      h('button', { class: 'btn btn-ghost icon-btn btn-sm', 'aria-label': tr('Kichraytirish'), onclick: () => zoomAt(1 / 1.25) }, svgIcon('<path d="M5 12h14"/>')),
      h('span', { class: 'num t-small', id: 'chZoom' }, `${Math.round(zoom * 100)} %`),
      h('button', { class: 'btn btn-ghost icon-btn btn-sm', 'aria-label': tr('Kattalashtirish'), onclick: () => zoomAt(1.25) }, svgIcon(IC.plus)),
      h('button', { class: 'btn btn-ghost btn-sm', id: 'chFit', onclick: () => fit() }, tr('Sigʻdirish')),
      h('button', { class: 'btn btn-ghost btn-sm', id: 'ch100', onclick: () => { const r = view.getBoundingClientRect(); zoomAt(1 / zoom, r.width / 2, r.height / 2); } }, '100 %'));
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
    cancelAnimationFrame(renderQ);
    renderQ = requestAnimationFrame(() => {
      const p = withToc(P());
      const { svg, w, h: H } = pageSvg(p, { tr, grid: gridOn, idp: 'v', ...albumDeco(d.cur) });
      pageHost.innerHTML = svg;
      const s = pageHost.firstElementChild as SVGSVGElement; s.removeAttribute('width'); s.removeAttribute('height');
      grayHost.hidden = !gray; if (gray) { grayHost.innerHTML = svg.replace(/id="v/g, 'id="g'); const g = grayHost.firstElementChild as SVGSVGElement; g.removeAttribute('width'); g.removeAttribute('height'); }
      over.setAttribute('viewBox', `0 0 ${w} ${H}`);
      renderOverlay(); syncPanels();
    });
  }
  const albumDeco = (i: number) => ({ num: d.album.numbering && d.pages.length > 1 ? { i: i + 1, total: d.pages.length } : undefined, stamp: d.album.stamp ? { title: d.title, author: d.album.author, date: today() } : null });
  /** «Mundarija» namunasi: albom sozlamasida yoqilgan boʻlsa — varaq nomlaridan */
  function withToc(p: ChPage): ChPage {
    if (!d.album.toc || p.tpl !== 'mr-mundarija' && p.tpl !== 'xf-mundarija') return p;
    const q: ChPage = { ...p, els: p.els.map(e => ({ ...e })) }, list = q.els.filter(e => e.t === 'text').sort((a, b) => (a.y ?? 0) - (b.y ?? 0))[2] ?? q.els.filter(e => e.t === 'text')[1];
    if (list) list.text = d.pages.map((x, i) => `${String(i + 1).padStart(2, '0')}  ${tr(x.name)}`).join('\n');
    return q;
  }

  /* ---------- ustqatlam: tanlov, tutqichlar, qoralama, yoʻnaltiruvchi chiziqlar ---------- */
  let draft: ChEl | null = null, guides: [number, number, number, number][] = [], marquee: [number, number, number, number] | null = null;
  function renderOverlay(): void {
    const k = pxMm(), s: string[] = [];
    if (draft) s.push(`<g opacity="0.85">${pageSvg({ ...P(), layers: [{ id: 'd', name: 'd', visible: true, locked: false }], els: [{ ...draft, layer: 'd' }] }, { tr }).svg.replace(/^<svg[^>]*>|<\/svg>$/g, '').replace(/<rect x="0" y="0"[^>]*\/>/, '')}</g>`);
    if (draft?.pts) s.push(`<path d="${draft.pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join('')}" fill="none" stroke="#2f6feb" stroke-width="${k}" stroke-dasharray="${4 * k} ${3 * k}"/>`, ...draft.pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="${3 * k}" fill="#fff" stroke="#2f6feb" stroke-width="${k}"/>`));
    const els = selected();
    if (els.length) {
      const B = unionBox(els);
      for (const e of els) { const b = bbox(e); s.push(`<rect x="${b[0]}" y="${b[1]}" width="${b[2] - b[0]}" height="${b[3] - b[1]}" fill="none" stroke="#2f6feb" stroke-width="${k}" stroke-dasharray="${3 * k} ${2 * k}"/>`); }
      if (els.length > 1) s.push(`<rect x="${B[0]}" y="${B[1]}" width="${B[2] - B[0]}" height="${B[3] - B[1]}" fill="none" stroke="#2f6feb" stroke-width="${k}"/>`);
      const one = els.length === 1 ? els[0] : null;
      if (one?.pts && one.t !== 'pen' && editable(one)) one.pts.forEach((p, i) => s.push(`<circle class="hv" data-vx="${i}" cx="${p[0]}" cy="${p[1]}" r="${4 * k}" fill="#fff" stroke="#2f6feb" stroke-width="${1.2 * k}"/>`));
      else if (els.every(editable)) handles(B).forEach(([x, y, c]) => s.push(`<rect class="hr" data-h="${c}" x="${x - 3.5 * k}" y="${y - 3.5 * k}" width="${7 * k}" height="${7 * k}" fill="#fff" stroke="#2f6feb" stroke-width="${1.2 * k}"/>`));
    }
    guides.forEach(([x0, y0, x1, y1]) => s.push(`<path d="M${x0} ${y0}L${x1} ${y1}" stroke="#e0574f" stroke-width="${k}"/>`));
    if (marquee) { const [a, b, c, dd] = marquee; s.push(`<rect x="${Math.min(a, c)}" y="${Math.min(b, dd)}" width="${Math.abs(c - a)}" height="${Math.abs(dd - b)}" fill="#2f6feb" fill-opacity="0.06" stroke="#2f6feb" stroke-width="${k}"/>`); }
    over.innerHTML = s.join('');
  }
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
    const mine = (o: number, a: number, c: number) => [a + o, (a + c) / 2 + o, c + o];
    let bx = dx, by = dy, best = tol, bestY = tol, gx: number | null = null, gy: number | null = null;
    for (const m of mine(dx, B[0], B[2])) for (const x of xs) { const dd = Math.abs(m - x); if (dd < best) { best = dd; bx = dx + (x - m); gx = x; } }
    for (const m of mine(dy, B[1], B[3])) for (const y of ys) { const dd = Math.abs(m - y); if (dd < bestY) { bestY = dd; by = dy + (y - m); gy = y; } }
    if (gx != null) guides.push([gx, 0, gx, H]); if (gy != null) guides.push([0, gy, W, gy]);
    return [bx, by];
  }
  const snapPt = (p: [number, number]): [number, number] => (gridOn ? [Math.round(p[0] / 5) * 5, Math.round(p[1] / 5) * 5] : p);

  /* ---------- sichqoncha ---------- */
  type Drag = { kind: 'move'; start: [number, number]; orig: ChEl[]; B: [number, number, number, number] } | { kind: 'resize'; h: string; orig: ChEl[]; B: [number, number, number, number] } | { kind: 'vertex'; id: string; i: number } | { kind: 'marquee'; start: [number, number] } | { kind: 'pan'; x: number; y: number; px: number; py: number } | { kind: 'draw'; start: [number, number] } | { kind: 'mappan'; id: string; start: [number, number]; vb: [number, number, number, number] };
  let drag: Drag | null = null, space = false;
  view.addEventListener('wheel', ev => { ev.preventDefault(); const r = view.getBoundingClientRect(); if (ev.ctrlKey || ev.metaKey || Math.abs(ev.deltaY) > 0 && !ev.shiftKey && Math.abs(ev.deltaX) < 1 && ev.deltaMode === 0 && ev.ctrlKey) zoomAt(ev.deltaY < 0 ? 1.1 : 1 / 1.1, ev.clientX - r.left, ev.clientY - r.top); else if (ev.ctrlKey) zoomAt(ev.deltaY < 0 ? 1.1 : 1 / 1.1, ev.clientX - r.left, ev.clientY - r.top); else { panX -= ev.deltaX; panY -= ev.deltaY; applyView(); } }, { passive: false });
  view.addEventListener('pointerdown', ev => {
    if (float) { float = null; syncPanels(); }
    view.focus({ preventScroll: true });
    if (ev.button === 1 || space) { drag = { kind: 'pan', x: ev.clientX, y: ev.clientY, px: panX, py: panY }; view.setPointerCapture(ev.pointerId); return; }
    if (ev.button !== 0) return;
    const m = toMm(ev), t = ev.target as Element;
    if (tool === 'select') {
      const hv = t.closest('.hv') as SVGElement | null, hr = t.closest('.hr') as SVGElement | null;
      if (hv) { const one = selected()[0]; commit(); drag = { kind: 'vertex', id: one.id, i: Number(hv.dataset.vx) }; view.setPointerCapture(ev.pointerId); return; }
      if (hr) { const els = selected(); commit(); drag = { kind: 'resize', h: hr.dataset.h!, orig: els.map(e => JSON.parse(JSON.stringify(e))), B: unionBox(els) }; view.setPointerCapture(ev.pointerId); return; }
      const hit = (t.closest('[data-id]') as SVGElement | null)?.dataset.id;
      const e = hit ? P().els.find(x => x.id === hit) : undefined;
      if (e && editable(e)) {
        const ids = e.group ? P().els.filter(x => x.group === e.group).map(x => x.id) : [e.id];
        if (ev.shiftKey) ids.forEach(id => (sel.has(id) ? sel.delete(id) : sel.add(id))); else if (!sel.has(e.id)) sel = new Set(ids);
        if (ev.altKey && e.t === 'map' && e.vb) { commit(); drag = { kind: 'mappan', id: e.id, start: m, vb: [...e.vb] as [number, number, number, number] }; }
        else { const els = selected(); commit(); drag = { kind: 'move', start: m, orig: els.map(x => JSON.parse(JSON.stringify(x))), B: unionBox(els) }; }
        view.setPointerCapture(ev.pointerId); renderOverlay(); renderRight(); return;
      }
      if (!ev.shiftKey) sel.clear();
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
    if (drag.kind === 'mappan') { const dm = drag; const e = p.els.find(x => x.id === dm.id && x.t === 'map'); if (e?.vb) { const k = dm.vb[2] / Math.abs(e.w ?? 1); e.vb = [dm.vb[0] - (m[0] - dm.start[0]) * k, dm.vb[1] - (m[1] - dm.start[1]) * k, dm.vb[2], dm.vb[3]]; renderCanvas(); } return; }
    if (drag.kind === 'vertex') { const dv = drag; const e = p.els.find(x => x.id === dv.id); if (e?.pts) { e.pts[dv.i] = snapPt(m); renderCanvas(); } return; }
    if (drag.kind === 'resize') {
      const B = drag.B, hh = drag.h; let [x0, y0, x1, y1] = B;
      if (hh.includes('w')) x0 = Math.min(m[0], x1 - 1); if (hh.includes('e')) x1 = Math.max(m[0], x0 + 1);
      if (hh.includes('n')) y0 = Math.min(m[1], y1 - 1); if (hh.includes('s')) y1 = Math.max(m[1], y0 + 1);
      if (ev.shiftKey || drag.orig.some(o => o.t === 'icon' || o.t === 'image')) { const k = Math.max((x1 - x0) / (B[2] - B[0]), (y1 - y0) / (B[3] - B[1])); if (hh.includes('w')) x0 = x1 - (B[2] - B[0]) * k; else x1 = x0 + (B[2] - B[0]) * k; if (hh.includes('n')) y0 = y1 - (B[3] - B[1]) * k; else y1 = y0 + (B[3] - B[1]) * k; }
      for (const o of drag.orig) { const i = p.els.findIndex(x => x.id === o.id); if (i < 0) continue; const ob = bbox(o), f = (v: number, a: number, b: number, A: number, Bb: number) => A + (v - a) / ((b - a) || 1) * (Bb - A); const to: [number, number, number, number] = [f(ob[0], B[0], B[2], x0, x1), f(ob[1], B[1], B[3], y0, y1), f(ob[2], B[0], B[2], x0, x1), f(ob[3], B[1], B[3], y0, y1)]; p.els[i] = fitTo(o, ob, to); if (p.els[i].t === 'text') fixSize(p.els[i]); }
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
    if (dr.kind === 'move' || dr.kind === 'resize' || dr.kind === 'vertex' || dr.kind === 'mappan') { lastMerge = ''; dirty(); renderCanvas(); renderRight(); }
  });
  view.addEventListener('dblclick', ev => {
    if (tool !== 'select') return;
    const hit = ((ev.target as Element).closest('[data-id]') as SVGElement | null)?.dataset.id, e = hit ? P().els.find(x => x.id === hit) : undefined;
    if (e?.t === 'text' || e?.t === 'table') { d.ui.rightTab = 'element'; if (!d.ui.right && !d.ui.lockR) float = 'right'; syncPanels(); renderRight(); setTimeout(() => (right.querySelector('#chText, #chTable') as HTMLTextAreaElement | null)?.focus(), 0); }
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
      case 'row': { const tr0 = TREES.find(x => x.id === opt.tree)!; return { ...base, t: 'row', pts, row: { kind: opt.rowKind, gap: opt.rowKind === 'people' ? 6 : 8, size: opt.rowKind === 'people' ? 6 : 6, tree: opt.tree, icon: opt.icon }, name: opt.rowKind === 'tree' ? tr0.name : undefined, style: {} }; }
      case 'image': return { ...base, t: 'image', x: 0, y: 0, w: 0, h: 0, style: {} };
      case 'map': return { ...base, t: 'map', x: 0, y: 0, w: 0, h: 0, name: 'Xarita oynasi', style: { width: 0.25 } };
      default: return { ...base, t: 'rect', x: 0, y: 0, w: 10, h: 10, style: {} };
    }
  }
  function addEl(e: ChEl, keepTool = false): void {
    if (e.t === 'text' && !e.text) e.text = tr('Matn');
    mut(p => { fixSize(e); p.els.push(e); });
    sel = new Set([e.id]); if (!keepTool) setTool('select', false);
    d.ui.rightTab = 'element'; if (e.t === 'text' && !d.ui.right && !d.ui.lockR) float = 'right'; syncPanels(); renderRight(); renderOverlay(); setHint();
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
  const narrow = () => (vwrap.getBoundingClientRect().width || innerWidth) < 720;
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
  function duplicate(off = 5): void { const els = selected(); if (!els.length) return; const map = new Map<string, string>(); const cp = els.map(e => { const n = moved(JSON.parse(JSON.stringify(e)), off, off); n.id = cid(); if (e.group) { if (!map.has(e.group)) map.set(e.group, cid('g')); n.group = map.get(e.group); } return n; }); mut(p => { p.els.push(...cp); }); sel = new Set(cp.map(e => e.id)); renderOverlay(); renderRight(); }
  function order(dir: 1 | -1): void { mut(p => { const ids = sel; const keep = p.els.filter(e => !ids.has(e.id)), mv = p.els.filter(e => ids.has(e.id)); p.els = dir > 0 ? [...keep, ...mv] : [...mv, ...keep]; }); }
  function flip(ax: 'x' | 'y'): void { mut(p => p.els.forEach(e => { if (sel.has(e.id)) { if (ax === 'x') e.flipX = !e.flipX; else e.flipY = !e.flipY; } })); }
  function group(on: boolean): void { const g = cid('g'); mut(p => p.els.forEach(e => { if (sel.has(e.id)) e.group = on ? g : undefined; })); renderRight(); }
  function distribute(ax: 'x' | 'y'): void {
    const els = selected().sort((a, b) => bbox(a)[ax === 'x' ? 0 : 1] - bbox(b)[ax === 'x' ? 0 : 1]); if (els.length < 3) return;
    const i0 = ax === 'x' ? 0 : 1, i1 = ax === 'x' ? 2 : 3, first = bbox(els[0]), last = bbox(els[els.length - 1]);
    const total = els.reduce((s, e) => { const b = bbox(e); return s + b[i1] - b[i0]; }, 0), gap = (last[i1] - first[i0] - total) / (els.length - 1);
    mut(p => { let pos = first[i0]; for (const e of els) { const b = bbox(e), dd = pos - b[i0]; const i = p.els.findIndex(x => x.id === e.id); p.els[i] = moved(p.els[i], ax === 'x' ? dd : 0, ax === 'y' ? dd : 0); pos += b[i1] - b[i0] + gap; } });
  }
  function alignEls(k: 'l' | 'cx' | 'r' | 't' | 'cy' | 'b'): void {
    const els = selected(), B = unionBox(els);
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
      e.svg = trSvg(m.svg); e.src = undefined; e.vb = [m.vb[0] + (m.vb[2] - vw) / 2, m.vb[1] + (m.vb[3] - vh) / 2, vw, vh]; e.natW = vw; e.scale = m.scale; e.name = src === 'site' ? tr('Bosh reja') : src.name;
    });
  }
  function placeInbox(it: ChInbox): void {
    const [W, H] = pageSize(P()), k = Math.min(1, (W - 40) / it.w, (H - 40) / it.h), w = it.w * k, hh = it.h * k;
    const e: ChEl = { id: cid(), t: it.svg || it.src ? 'map' : 'image', layer: P().layers[0].id, x: (W - w) / 2, y: (H - hh) / 2, w, h: hh, name: it.name, style: { width: 0.25 } };
    if (it.svg) { e.svg = it.svg; e.vb = it.vb ?? [0, 0, it.w, it.h]; e.natW = e.vb[2]; e.scale = it.scale; } else if (it.src) e.src = it.src;
    addEl(e);
  }

  /* ---------- varaqlar ---------- */
  function addPage(p: ChPage, at = d.cur + 1): void { commit(); d.pages.splice(at, 0, p); d.cur = at; sel.clear(); zoom = 0; renderAll(); }
  function dupPage(i: number): void { const p: ChPage = JSON.parse(JSON.stringify(d.pages[i])); p.id = cid('p'); p.name = `${p.name} (${tr('nusxa')})`; p.els.forEach(e => { e.id = cid(); }); addPage(p, i + 1); }
  function delPage(i: number): void { if (d.pages.length < 2) return; commit(); d.pages.splice(i, 1); d.cur = Math.min(d.cur, d.pages.length - 1); sel.clear(); renderAll(); }
  function movePage(i: number, dir: number): void { const j = i + dir; if (j < 0 || j >= d.pages.length) return; commit(); const [p] = d.pages.splice(i, 1); d.pages.splice(j, 0, p); d.cur = j; renderAll(); }
  const tplCtx = (): TplCtx => ({ title: d.title, place: host.place, date: today(), author: d.album.author, tik: host.tik(), map: host.siteMap() });

  /* ---------- albom koʻrinishi ---------- */
  let tplQ = '', tplG = TPL_GROUPS[0], dragI = -1;
  function renderAlbum(): void {
    const ctx0 = tplCtx();
    const q = h('input', { class: 'input', id: 'chTplQ', type: 'search', placeholder: tr('Qidirish: muqova, jadval, xarita…'), value: tplQ }) as HTMLInputElement;
    q.addEventListener('input', () => { tplQ = q.value; renderAlbum(); const n = albumEl.querySelector('#chTplQ') as HTMLInputElement | null; n?.focus(); n?.setSelectionRange(tplQ.length, tplQ.length); });
    const list = TEMPLATES.filter(t => (tplQ ? `${tr(t.name)} ${t.name} ${tr(t.group)}`.toLowerCase().includes(tplQ.toLowerCase()) : t.group === tplG));
    const leftA = h('aside', { class: 'ch-panel ch-aleft' },
      h('div', { class: 'ch-eh' }, h('b', { class: 't-title' }, tr('Namunalar')), h('span', { class: 't-small' }, tr('24 ta varaq maketi · bosing — albomga qoʻshiladi'))), q,
      h('div', { class: 'ch-chips' }, ...TPL_GROUPS.map(g => h('button', { class: 'chip', 'data-tg': g, 'aria-pressed': !tplQ && tplG === g, onclick: () => { tplG = g; tplQ = ''; renderAlbum(); } }, `${tr(g)} ${TEMPLATES.filter(t => t.group === g).length}`))),
      h('div', { class: 'ch-scroll' }, h('div', { class: 'ch-tpls', id: 'chTpls' }, ...list.map(t => h('button', { class: 'ch-tpl', 'data-tpl': t.id, title: tr(t.name), onclick: () => { const p = t.build(ctx0); p.name = tr(t.name); d.pages.splice(d.cur + 1, 0, p); commit(); d.cur = d.cur + 1; dirty(); renderAlbum(); toast(tf('«${n}» qoʻshildi', { n: tr(t.name) })); } },
        h('span', { class: 'ch-thumb', html: thumb(t.build({ ...ctx0, map: undefined })) }), h('b', {}, tr(t.name)), h('span', { class: 't-small' }, `${t.paper} · ${tr(t.landscape ? 'yotiq' : 'tik')}`))))));
    const grid = h('div', { class: 'ch-grid', id: 'chGridPages' }, ...d.pages.map((p, i) => {
      const card = h('div', { class: 'ch-card', 'data-page': i, draggable: 'true', 'aria-selected': i === d.cur, onclick: () => { d.cur = i; renderAlbum(); }, ondblclick: () => { d.cur = i; mode = 'muharrir'; zoom = 0; renderAll(); } },
        h('span', { class: 'ch-thumb', html: thumb(withToc(p), i) }), h('span', { class: 'ch-cap' }, h('b', { class: 'mono' }, String(i + 1).padStart(2, '0')), ` ${tr(p.name)}`));
      card.addEventListener('dragstart', () => { dragI = i; card.classList.add('drag'); });
      card.addEventListener('dragover', e => { e.preventDefault(); card.classList.add('over'); });
      card.addEventListener('dragleave', () => card.classList.remove('over'));
      card.addEventListener('drop', e => { e.preventDefault(); if (dragI >= 0 && dragI !== i) { commit(); const [x] = d.pages.splice(dragI, 1); d.pages.splice(i, 0, x); d.cur = i; dirty(); } dragI = -1; renderAlbum(); });
      return card;
    }));
    const center = h('div', { class: 'ch-acenter' },
      h('div', { class: 'ch-ah' }, h('b', {}, `${tr('Albom')} · ${tf('${n} varaq', { n: d.pages.length })}`), h('span', { class: 't-small' }, tr('sudrab tartiblang · ikki marta bosish — tahrirga'))),
      grid,
      h('div', { class: 'ch-abar glassbar' },
        h('button', { class: 'btn btn-ghost', id: 'chAPlus', onclick: () => { d.pages.splice(d.cur + 1, 0, blankPage(`${tr('Varaq')} ${d.pages.length + 1}`, P().paper, P().landscape)); commit(); d.cur++; dirty(); renderAlbum(); } }, ...icl(IC.plus, tr('Varaq'))),
        h('button', { class: 'btn btn-ghost', id: 'chADup', onclick: () => { dupPage(d.cur); mode = 'albom'; renderAll(); } }, ...icl(I.copy, tr('Nusxa'))),
        h('button', { class: 'btn btn-ghost', id: 'chADel', disabled: d.pages.length < 2, onclick: () => { delPage(d.cur); mode = 'albom'; renderAll(); } }, ...icl(I.trash, tr('Oʻchirish'))),
        h('button', { class: 'btn btn-primary', id: 'chAEdit', onclick: () => { mode = 'muharrir'; zoom = 0; renderAll(); } }, tr('Muharrirda ochish'))));
    const all = d.pages.map(p => pageChecks(p, tr)), okAll = all.reduce((s, c) => s + c.filter(x => x.ok).length, 0);
    const rightA = h('aside', { class: 'ch-panel ch-aright' },
      h('div', { class: 'ch-eh' }, h('b', { class: 't-title' }, tr('Albom')), h('span', { class: 't-small' }, tr('Hamma varaqlarga umumiy'))),
      h('div', { class: 'ch-scroll' },
        h('div', { class: 'row2' },
          h('div', {}, lbl('Format'), select({ id: 'chAPaper', onchange: v => { commit(); d.pages.forEach(p => { p.paper = v as ChPaper; }); dirty(); renderAlbum(); } }, (['A4', 'A3', 'A2', 'A1', 'A0', 'A0+'] as const).map(x => ({ value: x, label: `${x} · ${PAPER_MM[x][0]} × ${PAPER_MM[x][1]}`, selected: P().paper === x })))),
          h('div', {}, lbl('Yoʻnalish'), seg([{ id: 'land', label: tr('Yotiq') }, { id: 'port', label: tr('Tik') }], P().landscape ? 'land' : 'port', v => { commit(); d.pages.forEach(p => { p.landscape = v === 'land'; }); dirty(); renderAlbum(); }, { id: 'chAOrient' }))),
        lbl('Shtamp va raqamlash'),
        h('div', { class: 'group' },
          field('Shtamp', sw({ id: 'chStamp', label: tr('Shtamp'), on: d.album.stamp, onchange: v => { d.album.stamp = v; dirty(); renderAlbum(); } })),
          field('Varaq raqami', sw({ id: 'chNum', label: tr('Varaq raqami'), on: d.album.numbering, onchange: v => { d.album.numbering = v; dirty(); renderAlbum(); } })),
          field('Mundarija avtomatik', sw({ id: 'chToc', label: tr('Mundarija avtomatik'), on: d.album.toc, onchange: v => { d.album.toc = v; dirty(); renderAlbum(); } })),
          field('Muallif', (() => { const i = h('input', { class: 'input', id: 'chAuthor', value: d.album.author, placeholder: tr('Ism Familiya') }) as HTMLInputElement; i.addEventListener('change', () => { d.album.author = i.value.trim(); dirty(); renderAlbum(); }); return i; })())),
        lbl('Palitra'), h('div', { class: 'ch-palrow', id: 'chAPal' }, ...PALETTES.map(pl => h('button', { class: 'ch-palb', title: tr(pl.name), 'aria-pressed': d.palette === pl.id, onclick: () => { d.palette = pl.id; dirty(); renderAlbum(); } }, ...pl.colors.slice(0, 5).map(c => h('i', { style: `background:${c}` }))))),
        lbl('Yuklab olish'),
        h('div', { class: 'group', id: 'chAExp' },
          h('button', { class: 'li', 'data-exp': 'pdf', onclick: () => void exportPdf() }, h('span', { class: 'k' }, tr('PDF — vektor, qatlamli')), h('span', { class: 'v' }, tf('${n} varaq', { n: d.pages.length }))),
          h('button', { class: 'li', 'data-exp': 'pptx', onclick: () => void exportPptx() }, h('span', { class: 'k' }, 'PowerPoint (.pptx)'), h('span', { class: 'v' }, tr('har varaq — slayd'))),
          h('button', { class: 'li', 'data-exp': 'svg', onclick: () => exportSvg() }, h('span', { class: 'k' }, tr('SVG — Illustrator uchun')), h('span', { class: 'v' }, tr('joriy varaq'))),
          h('button', { class: 'li', 'data-exp': 'png', onclick: () => void exportPng(150) }, h('span', { class: 'k' }, 'PNG'), h('span', { class: 'v' }, '150 / 300 dpi')))),
      h('div', { class: 'ch-foot' }, h('span', { class: `chip ${okAll === all.length * 7 ? 'ok' : 'warn'}`, id: 'chACheck' }, h('i'), `${tr('Tekshiruv')} · ${okAll}/${all.length * 7}`), h('button', { class: 'btn btn-primary', id: 'chAPdf', onclick: () => void exportPdf() }, ...icl(I.dl, tr('PDF yuklab olish')))));
    albumEl.replaceChildren(leftA, center, rightA);
  }
  function thumb(p: ChPage, i = 0): string {
    const { svg } = pageSvg(p, { tr, idp: `t${i}${p.id.slice(-4)}`, ...(d.pages.includes(p) ? albumDeco(i) : {}) });
    return svg.replace(/ width="[\d.]+mm" height="[\d.]+mm"/, '');
  }

  /* ---------- eksport ---------- */
  const pagesOut = () => d.pages.map((p, i) => { const r = pageSvg(withToc(p), { tr, idp: `x${i}`, ...albumDeco(i) }); return { svg: r.svg, widthMm: r.w, heightMm: r.h }; });
  async function exportPdf(): Promise<void> { toast(tr('PDF tayyorlanmoqda…')); try { await svgPdf(pagesOut(), `${safe(d.title)}.pdf`); } catch (e) { toast(`PDF: ${(e as Error).message}`); } }
  function exportSvg(): void { const r = pageSvg(withToc(P()), { tr, idp: 'a', ai: true, ...albumDeco(d.cur) }); download(`${safe(d.title)}_${String(d.cur + 1).padStart(2, '0')}.svg`, r.svg, 'image/svg+xml'); }
  async function rasterize(svg: string, wMm: number, hMm: number, dpi: number): Promise<HTMLCanvasElement> {
    const k = dpi / 25.4, c = document.createElement('canvas'); c.width = Math.round(wMm * k); c.height = Math.round(hMm * k);
    const img = new Image(); img.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    await img.decode(); const g = c.getContext('2d')!; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src);
    return c;
  }
  async function exportPng(dpi: number): Promise<void> {
    const r = pageSvg(withToc(P()), { tr, idp: 'p', ...albumDeco(d.cur) });
    try { const c = await rasterize(r.svg, r.w, r.h, dpi); c.toBlob(b => b ? download(`${safe(d.title)}_${String(d.cur + 1).padStart(2, '0')}_${dpi}dpi.png`, b) : toast(tr('PNG yaratilmadi')), 'image/png'); } catch { toast(tr('PNG yaratilmadi')); }
  }
  async function exportPptx(): Promise<void> {
    toast(tr('PowerPoint tayyorlanmoqda…'));
    try {
      const { default: PptxGen } = await import('pptxgenjs');
      const pp = new PptxGen(), out = pagesOut(), f = out[0];
      pp.defineLayout({ name: 'CH', width: f.widthMm / 25.4, height: f.heightMm / 25.4 }); pp.layout = 'CH'; pp.title = d.title;
      for (const p of out) {
        const c = await rasterize(p.svg, p.widthMm, p.heightMm, 150), s = pp.addSlide();
        const k = Math.min(f.widthMm / p.widthMm, f.heightMm / p.heightMm), w = p.widthMm * k / 25.4, hh = p.heightMm * k / 25.4;
        s.addImage({ data: c.toDataURL('image/png'), x: (f.widthMm / 25.4 - w) / 2, y: (f.heightMm / 25.4 - hh) / 2, w, h: hh });
      }
      const blob = await pp.write({ outputType: 'blob' }) as Blob; download(`${safe(d.title)}.pptx`, blob);
    } catch (e) { toast(`PowerPoint: ${(e as Error).message}`); }
  }
  function exportMenu(anchor: HTMLElement): void {
    wrap.querySelector('.ch-menu')?.remove();
    const it = (id: string, label: string, sub: string, fn: () => void) => h('button', { class: 'mi', id, onclick: () => { m.remove(); fn(); } }, h('span', {}, label), h('span', { class: 'd' }, sub));
    const m = h('div', { class: 'menu ch-menu', role: 'menu' },
      h('div', { class: 'mh' }, tr('Yuklab olish')),
      it('chExPdf', tr('PDF — vektor, qatlamli'), tf('${n} varaq', { n: d.pages.length }), () => void exportPdf()),
      it('chExPptx', 'PowerPoint (.pptx)', tr('har varaq — slayd'), () => void exportPptx()),
      it('chExSvg', tr('SVG — Illustrator uchun'), tr('joriy varaq'), exportSvg),
      it('chExPng', 'PNG 150 dpi', tr('joriy varaq'), () => void exportPng(150)),
      it('chExPng3', 'PNG 300 dpi', tr('joriy varaq'), () => void exportPng(300)),
      h('hr'),
      it('chExJson', tr('Albomni faylga saqlash (.json)'), '', () => download(`${safe(d.title)}.chizmadon.json`, JSON.stringify(d), 'application/json')),
      it('chImJson', tr('Albomni fayldan ochish'), '', () => { jsonIn.value = ''; jsonIn.onchange = async () => { const f = jsonIn.files?.[0]; if (!f) return; try { commit(); d = normDoc(JSON.parse(await f.text()), d.title); dirty(); sel.clear(); zoom = 0; renderAll(); toast(tr('Albom ochildi')); } catch { toast(tr('Fayl oʻqilmadi')); } }; jsonIn.click(); }));
    m.addEventListener('click', e => e.stopPropagation());
    wrap.append(m);
    const r = anchor.getBoundingClientRect(); m.style.left = `${Math.min(r.right - m.offsetWidth, innerWidth - m.offsetWidth - 8)}px`; m.style.top = `${r.bottom + 6}px`;
    setTimeout(() => document.addEventListener('click', () => m.remove(), { once: true }), 0);
  }

  /* ---------- klaviatura ---------- */
  function onKey(e: KeyboardEvent): void {
    if (!document.body.contains(wrap)) { removeEventListener('keydown', onKey, true); return; }
    const tg = e.target as HTMLElement, typing = tg.closest('input, textarea, select, [contenteditable]');
    if (e.key === ' ' && !typing) { space = true; view.classList.add('pan'); e.preventDefault(); return; }
    if (e.key === 'Escape') {
      e.stopPropagation(); e.preventDefault();
      if (wrap.querySelector('.ch-menu')) { wrap.querySelector('.ch-menu')!.remove(); return; }
      if (draft) { draft = null; renderOverlay(); return; }
      if (float) { float = null; syncPanels(); return; }
      if (tool !== 'select') { setTool('select'); return; }
      if (sel.size) { sel.clear(); renderOverlay(); renderRight(); return; }
      close(); return;
    }
    if (typing) return;
    if (mode === 'albom') return;
    const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (e.key === 'Tab') { e.preventDefault(); togglePanels(); return; }
    if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
    if (mod && k === 'y') { e.preventDefault(); redo(); return; }
    if (mod && k === 'd') { e.preventDefault(); duplicate(); return; }
    if (mod && k === 'c') { clip = selected().map(x => JSON.parse(JSON.stringify(x))); return; }
    if (mod && k === 'x') { clip = selected().map(x => JSON.parse(JSON.stringify(x))); remove(); return; }
    if (mod && k === 'v') { if (!clip.length) return; e.preventDefault(); const cp = clip.map(x => { const n = moved(x, 5, 5); n.id = cid(); if (!P().layers.some(l => l.id === n.layer)) n.layer = L().id; return n; }); mut(p => p.els.push(...cp)); sel = new Set(cp.map(x => x.id)); clip = cp.map(x => JSON.parse(JSON.stringify(x))); renderOverlay(); renderRight(); return; }
    if (mod && k === 'g') { e.preventDefault(); if (sel.size > 1) group(!e.shiftKey); return; }
    if (mod && k === 'a') { e.preventDefault(); sel = new Set(P().els.filter(editable).map(x => x.id)); renderOverlay(); renderRight(); return; }
    if (e.key === 'Enter') { if (draft) { e.preventDefault(); finishDraft(); } return; }
    if (e.key === 'Backspace' && draft?.pts) { e.preventDefault(); draft.pts.pop(); if (!draft.pts.length) draft = null; renderOverlay(); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(); return; }
    if (e.key.startsWith('Arrow') && sel.size) { e.preventDefault(); const s = e.shiftKey ? 10 : 1, dx = e.key === 'ArrowLeft' ? -s : e.key === 'ArrowRight' ? s : 0, dy = e.key === 'ArrowUp' ? -s : e.key === 'ArrowDown' ? s : 0; mut(p => { p.els = p.els.map(x => (sel.has(x.id) ? moved(x, dx, dy) : x)); }, 'nudge'); return; }
    if (e.key === ']') { order(1); return; } if (e.key === '[') { order(-1); return; }
    if (e.key === '+' || e.key === '=') { zoomAt(1.25); return; } if (e.key === '-') { zoomAt(1 / 1.25); return; } if (e.key === '0') { fit(); return; }
    if (!mod && !e.altKey && TOOL_KEYS[k]) { setTool(TOOL_KEYS[k]); }
  }
  const onKeyUp = (e: KeyboardEvent) => { if (e.key === ' ') { space = false; view.classList.remove('pan'); } };
  addEventListener('keydown', onKey, true); addEventListener('keyup', onKeyUp, true);
  const onDoc = (e: MouseEvent) => { if (!float) return; const t = e.target as Node; if (!left.contains(t) && !right.contains(t) && !stripL.contains(t) && !stripR.contains(t)) { float = null; syncPanels(); } };
  document.addEventListener('pointerdown', onDoc, true);
  const onResize = () => { if (mode === 'muharrir') { applyView(); renderTools(); } };
  addEventListener('resize', onResize);

  function close(): void { flush(); removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKeyUp, true); removeEventListener('resize', onResize); document.removeEventListener('pointerdown', onDoc, true); wrap.remove(); host.onClose?.(); }

  /* ---------- kirish ---------- */
  if (host.incoming) {
    const it: ChInbox = { ...host.incoming, id: cid('i'), at: new Date().toISOString() };
    d.inbox.push(it); if (d.inbox.length > 30) d.inbox.shift();
    const p = blankPage(it.name, P().paper, P().landscape); d.pages.push(p); d.cur = d.pages.length - 1; saved = false;
    setTimeout(() => placeInbox(it), 0);
  }
  renderAll();
  if (!saved) dirty();
  setHint();
  void esc; void iconGlyph;
}
