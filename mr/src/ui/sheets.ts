/**
 * Varaqlar oynasi (oldin «Grafika») — maketlar «MR-Varaqlar» (V1 sozlama paneli), «MR-Varaqlar-V2» (varaqlar toʻplami),
 * inventar 4.3. Qobiq — Master reja bilan bir xil: suzuvchi shisha header, chapda varaqlar roʻyxati va 340 px sozlama paneli,
 * oʻrtada haqiqiy oʻlchamdagi oq varaq, pastda koʻrinish asboblari. Varaq va fayl doim oq.
 * Varaqlar loyiha faylida saqlanadi (doc.sheets), uslublar — doc.sheetStyles.
 */
import type { Project, SheetDoc } from '../core/doc';
import { uid } from '../core/doc';
import { planApartments } from '../core/apartments';
import { buildingFloorsSvg, APT_FILL } from '../core/floorplan';
import { useDef } from '../core/uses';
import { sheetLayout, type SheetInner } from '../core/sheet';
import { sheetSvg, sheetChecks, recommendScale, layerOf, SHEET_DEFAULT, SHEET_KINDS, SHEET_LAYERS, SCALES, PAPERS, FONTS, type SheetCtx, type SheetOpts, type SheetResult, type Paper, type SheetKind, type SheetLayerId } from '../core/sheet';
import { LABEL_MODES, type LabelMode } from '../core/labels';
import { h, download, toast, svgIcon, icl, IC, fmt } from './dom';
import { check, select, stepper, sw } from './controls';
import { tr, tf, trSvg } from '../i18n';
import { logoSvg } from './logo';
import { svgPdf } from './pdf';

export interface SheetsHost {
  doc: Project;
  ctx: SheetCtx | null;
  /** varaqlar va uslublarni hujjatga yozish */
  save: (sheets: SheetDoc[], styles: NonNullable<Project['sheetStyles']>) => void;
  /** reja va hajmlar DXF (mavjud eksport) */
  dxf: () => void;
  /** joriy varaqni Chizmadonga yuborish (xarita oynasi sifatida, masshtab bilan) */
  toChizmadon?: (svg: string, name: string, scale: number) => void;
  /** qaysi varaqdan boshlash (V3 ramkasidan) */
  start?: number;
  /** aksonometriya rasmi (sahnadan, tanlangan uslub va koʻrinish bilan): data URL */
  axo?: (look: NonNullable<SheetOpts['axo']>['look'], view: string | undefined, detail: boolean, ratio: number) => string;
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
const defaultSet = (): SheetDoc[] => (['bosh', 'zona', 'figura', 'landshaft', 'vaziyat'] as SheetKind[]).map(k => ({ id: uid('sh_'), opts: { ...lastOpts(), kind: k, scale: k === 'vaziyat' ? 10000 : 0 } as unknown as Record<string, unknown> }));

/** Illustrator uchun varaq (oxirgi sozlamalar bilan): har qatlam — alohida Illustrator qatlami, mm da */
export function downloadIllustrator(doc: Project, ctx: SheetCtx | null, o: SheetOpts = lastOpts()): void {
  download(`${safe(doc.name)}_${o.kind}_illustrator.svg`, sheetSvg(doc, ctx, o, new Date(), true, tr).svg, 'image/svg+xml');
}

export function openGraphics(host: SheetsHost): void {
  const doc = host.doc;
  let sheets: SheetDoc[] = doc.sheets?.length ? doc.sheets.map(s => ({ id: s.id, opts: s.opts })) : defaultSet();
  let styles = [...(doc.sheetStyles ?? [])];
  let cur = Math.max(0, Math.min(sheets.length - 1, host.start ?? 0));
  let open: string | null = null, zoom = 0, loupe = false, hand = false;
  const O = (): SheetOpts => norm(sheets[cur].opts);
  const ha = doc.site ? (() => { const r = doc.site!.rings[0]; let a = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2 * 111320 * 111132 * Math.cos(r[0][1] * Math.PI / 180) / 1e4; })() : 0;
  const plans = planApartments(doc);
  const axoCache = new Map<string, string>();
  const innerOf = (o: SheetOpts): SheetInner | undefined => {
    if (o.mode === 'qavat') {
      if (!plans.length) return { label: 'M —', body: (vx, vy, vw, vh) => `<text x="${vx + vw / 2}" y="${vy + vh / 2}" font-size="5" text-anchor="middle" fill="#6b6965">${tr('Turar joy seksiyalari yoʻq')}</text>` };
      const bi = Math.max(0, Math.min(plans.length - 1, (o.plan?.floor ?? 1) - 1)), pl = plans[bi];
      const title = `${tf('${n}-bino', { n: bi + 1 })} · ${tr(useDef(doc.buildings.find(b => b.id === pl.bid)?.use ?? 'turar').name)}`;
      const L = sheetLayout(o), probe = buildingFloorsSvg(pl, 200, title), m = probe.match(/width="([\d.]+)mm" height="([\d.]+)mm"/), W = m ? +m[1] : 400, H = m ? +m[2] : 300;
      const sc = [100, 200, 500, 1000].find(v => W * 200 / v <= L.vw && H * 200 / v <= L.vh) ?? 1000;
      let svg = buildingFloorsSvg(pl, sc, title).replace(/^<\?xml[^>]*>\s*/, '');
      if (o.plan?.look === 'bir') for (const c of Object.values(APT_FILL)) svg = svg.split(c).join('#ffffff');
      const mm = svg.match(/width="([\d.]+)mm" height="([\d.]+)mm"/), w = mm ? +mm[1] : W, hh = mm ? +mm[2] : H;
      return { label: `M 1:${sc}`, legend: o.plan?.look === 'bir' ? [] : [1, 2, 3, 4].map(k => ({ type: 'fill' as const, fill: APT_FILL[k], label: `${k} ${tr('xonali')}` })),
        body: (vx, vy, vw, vh) => { const k = Math.min(1, vw / w, vh / hh), ww = w * k, h2 = hh * k; return svg.replace(/^<svg /, `<svg x="${(vx + (vw - ww) / 2).toFixed(1)}" y="${(vy + (vh - h2) / 2).toFixed(1)}" `).replace(/width="[\d.]+mm" height="[\d.]+mm"/, `width="${ww.toFixed(1)}" height="${h2.toFixed(1)}"`); } };
    }
    if (o.mode === 'akso') {
      const L = sheetLayout(o), key = `${o.axo?.look ?? 'oq'}|${o.axo?.view ?? ''}|${o.axo?.shadow !== false}|${(L.vw / L.vh).toFixed(2)}`;
      let url = axoCache.get(key);
      if (!url && host.axo) { url = host.axo(o.axo?.look ?? 'oq', o.axo?.view, o.axo?.shadow !== false, L.vw / L.vh); axoCache.set(key, url); }
      return { label: 'M —', body: (vx, vy, vw, vh) => url ? `<image href="${url}" x="${vx}" y="${vy}" width="${vw}" height="${vh}" preserveAspectRatio="xMidYMid meet"/>` : '' };
    }
    return undefined;
  };
  const run = (o: SheetOpts, i = cur): SheetResult => { const st = o.stamp ?? {}; const r = sheetSvg(doc, host.ctx, { ...o, stamp: { ...st, num: st.num || `MR-${String(i + 1).padStart(2, '0')}`, index: i + 1, total: sheets.length } }, new Date(), false, tr, innerOf(o)); r.svg = trSvg(r.svg); return r; };
  let last = run(O());

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
  const toCh = h('button', { class: 'btn btn-primary', id: 'shToCh', disabled: !host.toChizmadon, title: host.toChizmadon ? '' : tr('Chizmadon — keyingi bosqichda'), onclick: () => { const o = O(), r = run({ ...o, show: { ...o.show, title: false, legend: false, plotTable: false, stamp: false, situation: false, frame: false } }); persist(); const nm = sheetName(cur); close(); host.toChizmadon?.(r.svg, nm, r.scale); } }, tr('Chizmadonga'));
  head.append(
    h('button', { class: 'btn btn-ghost icon-btn', 'aria-label': tr('Master rejaga qaytish'), title: tr('Master rejaga qaytish'), onclick: close }, svgIcon('<path d="M15 6l-6 6 6 6"/>')),
    h('span', { class: 'brand' }, logoSvg(18), h('b', {}, 'Archemistry Lab')), h('span', { class: 'svcbadge' }, h('i'), tr('Master reja')),
    h('span', { class: 'sh-name' }, `${doc.name} · ${tr('Varaqlar')}`), h('span', { class: 'spacer' }),
    checksBtn, h('button', { class: 'btn btn-ghost', id: 'gxClose', onclick: close }, tr('Yopish (Esc)')));

  const sheetName = (i: number) => { const o = norm(sheets[i].opts); return o.stamp?.sheet || tr(SHEET_KINDS.find(k => k.id === o.kind)!.name); };

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
    const warn = (i: number) => sheetChecks(i === cur ? last : run(norm(sheets[i].opts), i), norm(sheets[i].opts), tr).some(c => !c.ok && c.id !== 'stamp' && c.id !== 'scale');
    list.replaceChildren(
      h('div', { class: 'sh-lh' }, h('b', {}, tr('Varaqlar toʻplami')), h('span', { class: 't-small' }, tf('${n} varaq · bitta PDF albom', { n: sheets.length }))),
      h('div', { class: 'sh-items', role: 'listbox', 'aria-label': tr('Varaqlar') }, ...sheets.map((s, i) => {
        const o = norm(s.opts), num = o.stamp?.num || `MR-${String(i + 1).padStart(2, '0')}`;
        return h('div', { class: 'sh-item', role: 'option', 'aria-selected': i === cur, 'data-sheet': i, onclick: () => { cur = i; render(); } },
          h('span', { class: 'mono t-small' }, num), h('b', {}, sheetName(i)), h('span', { class: 't-small' }, `1:${(o.scale || (i === cur ? last : run(o, i)).scale).toLocaleString('ru-RU')} · ${o.paper === 'fit' ? tr('Moslash') : o.paper}`),
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

  /* ---------- oʻng: tanlangan varaq sozlamasi (V1) ---------- */
  const frow = (id: string, title: string, val: string, body: () => (Node | string)[]) => {
    const isOpen = open === id || (id === 'lay' && !!open?.startsWith('L:'));
    return h('div', { class: 'sh-sec', 'data-sec': id },
      h('button', { class: 'li frow', 'aria-expanded': isOpen, 'data-frow': id, onclick: () => { open = isOpen ? null : id; renderSide(); } }, h('span', { class: 'k' }, title), h('span', { class: 'v t-small' }, val), svgIcon(isOpen ? '<path d="M6 15l6-6 6 6"/>' : '<path d="M6 9l6 6 6-6"/>')),
      isOpen ? h('div', { class: 'frowin' }, ...body()) : '');
  };
  function renderSide(): void {
    const o = O(), S = { ...SHEET_DEFAULT.show, ...o.show }, rec = recommendScale(ha, o.kind);
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
        h('div', { class: 'seg', id: 'shMode', role: 'tablist' }, ...([['reja', 'Reja'], ['qavat', 'Qavatlar'], ['akso', 'Akso']] as const).map(([k, t]) => h('button', { role: 'tab', 'data-mode': k, 'aria-pressed': (o.mode ?? 'reja') === k, onclick: () => set({ mode: k }) }, tr(t)))),
        ...(o.mode === 'qavat' ? [
          h('div', { class: 'glabel' }, h('span', {}, tr('Namuna'))),
          h('div', { class: 'tiles c2' }, ...([['rang', 'Xonadonlar rangda', 'turi boʻyicha'], ['bir', 'Bir rang', 'oq-qora']] as const).map(([k, t, n]) => tile({ 'data-plook': k, 'aria-pressed': (o.plan?.look ?? 'rang') === k, onclick: () => set({ plan: { ...(o.plan ?? {}), look: k } }) }, tr(t), tr(n)))),
          plans.length ? h('div', { class: 'li' }, h('span', { class: 'k' }, tr('Bino'), h('span', { class: 'sub' }, `1–${plans.length}`)), stepper({ id: 'shBld', label: tr('Bino'), min: 1, max: plans.length, step: 1, value: Math.min(plans.length, o.plan?.floor ?? 1), onchange: v => set({ plan: { ...(o.plan ?? {}), floor: v } }) })) : h('div', { class: 'note' }, tr('Turar joy seksiyalari yoʻq')),
          h('span', { class: 't-small' }, tr('Tahrir — Qavat rejalari oynasida (9-qadam). Bu yerda faqat varaq: barcha qavatlar → bitta PDF albom.'))] : []),
        ...(o.mode === 'akso' ? [
          h('div', { class: 'glabel' }, h('span', {}, tr('Namuna'))),
          h('div', { class: 'tiles c2' }, ...([['oq', 'Oq maket'], ['funksiya', 'Funksiya ranglari'], ['fasad', 'Fasadlar'], ['figura', 'Figura-fon'], ['qoralama', 'Qoralama']] as const).map(([k, t]) => tile({ 'data-alook': k, 'aria-pressed': (o.axo?.look ?? 'oq') === k, onclick: () => set({ axo: { ...(o.axo ?? {}), look: k } }) }, tr(t), ''))),
          h('div', { class: 'field' }, h('label', {}, tr('Kamera')), select({ id: 'shView', 'aria-label': tr('Kamera'), onchange: v => set({ axo: { ...(o.axo ?? {}), view: v || undefined } }) }, [{ value: '', label: tr('Joriy aksonometriya'), selected: !o.axo?.view }, ...(host.views ?? []).map(v => ({ value: v.id, label: v.name, selected: o.axo?.view === v.id }))])),
          h('div', { class: 'li' }, h('span', { class: 'k' }, tr('Fasad derazalari'), h('span', { class: 'sub' }, tr('8-qadamdan'))), sw({ label: tr('Fasad derazalari'), on: o.axo?.shadow !== false, onchange: v => set({ axo: { ...(o.axo ?? {}), shadow: v } }) })),
          h('span', { class: 't-small' }, tr('Kamera — saqlangan koʻrinishlardan; rasm sahnadan olinadi (masshtabsiz).'))] : []),
        ...((o.mode ?? 'reja') === 'reja' ? [
        h('div', { class: 'glabel' }, h('span', {}, tr('Namuna')), h('span', {}, `${SHEET_KINDS.length} + ${tr('uslublar')}`)),
        h('div', { class: 'tiles c2 gx-kinds', role: 'radiogroup', 'aria-label': tr('Varaq turi') },
          ...SHEET_KINDS.map(k => tile({ 'data-kind': k.id, 'aria-pressed': o.kind === k.id && !open?.startsWith('style:'), title: tr(k.note), onclick: () => set({ kind: k.id, ...(k.id === 'vaziyat' && !o.scale ? { scale: 10000 } : {}) }) }, tr(k.name), tr(k.note))),
          ...styles.map(st => tile({ 'data-style-id': st.id, title: tr('Mening uslubim'), onclick: () => set({ ...norm(st.opts as Record<string, unknown>), title: o.title, stamp: o.stamp, center: o.center, rot: o.rot }) }, st.name, tr('Mening uslubim')))),
        ] : []),
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
            h('div', { class: 'field' }, h('label', {}, tr('Shrift')), select({ 'aria-label': tr('Shrift'), id: 'gxFont', onchange: v => set({ font: v }) }, FONTS.map(f => ({ value: f, label: f, selected: (o.font ?? 'Archivo') === f }))))]),
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
    info.replaceChildren(h('span', {}, `${o.paper === 'fit' ? tr('Moslash') : o.paper} · ${fmt(last.widthMm, 0)} × ${fmt(last.heightMm, 0)} mm · M 1:${last.scale}${host.ctx ? '' : ` · ${tr('atrof yuklanmagan')}`}`));
    const n = sheetChecks(last, o, tr).filter(c => !c.ok).length;
    checksBtn.className = `chip ${n ? 'warn' : 'ok'} sh-checks`; checksBtn.replaceChildren(h('i'), n ? tf('${n} ta eslatma', { n }) : tr('Eslatma yoʻq'));
    renderList(); renderSide(); applyZoom();
    const sc = side.querySelector('.sh-scroll'); if (sc) sc.scrollTop = keep;
  }

  document.body.append(wrap);
  document.addEventListener('keydown', onKey);
  render();
  requestAnimationFrame(applyZoom);
  new ResizeObserver(() => { if (!zoom) applyZoom(); }).observe(view);
}
