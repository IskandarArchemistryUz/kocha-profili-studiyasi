/**
 * Grafika muharriri: toʻliq ekranli oyna — chapda varaq sozlamalari, oʻngda jonli koʻrinish.
 * Eksport: SVG (qatlamlar bilan, mm da), Illustrator uchun SVG (har qatlam — Illustrator qatlami) va PNG (150/300 dpi).
 */
import type { Project } from '../core/doc';
import { sheetSvg, SHEET_DEFAULT, SHEET_KINDS, SCALES, type SheetCtx, type SheetOpts, type Paper } from '../core/sheet';
import { h, download, toast } from './dom';
import { check, select } from './controls';
import { tr } from '../i18n';

const KEY = 'mr-sheet';
function loadOpts(): SheetOpts {
  try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o && typeof o === 'object') return { ...SHEET_DEFAULT, ...o, show: { ...SHEET_DEFAULT.show, ...(o.show ?? {}) } }; } catch { /* yoʻq */ }
  return structuredClone(SHEET_DEFAULT);
}
const saveOpts = (o: SheetOpts) => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* yoʻq */ } };
const safe = (s: string) => s.replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 60) || 'loyiha';

/** Illustrator uchun varaq (oxirgi sozlamalar bilan): har qatlam — alohida Illustrator qatlami, mm da */
export function downloadIllustrator(doc: Project, ctx: SheetCtx | null, o: SheetOpts = loadOpts()): void {
  download(`${safe(doc.name)}_${o.kind}_illustrator.svg`, sheetSvg(doc, ctx, o, new Date(), true).svg, 'image/svg+xml');
}

export function openGraphics(doc: Project, ctx: SheetCtx | null): void {
  const o = loadOpts();
  const view = h('div', { class: 'gx-view', id: 'gxView' });
  const info = h('div', { class: 'gx-info t-small' });
  const side = h('aside', { class: 'gx-side' });
  const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
  let last = sheetSvg(doc, ctx, o);

  const render = () => {
    saveOpts(o); last = sheetSvg(doc, ctx, o);
    view.innerHTML = last.svg.replace(/^<\?xml[^>]*>\s*/, '');
    const s = view.querySelector('svg')!; s.removeAttribute('width'); s.removeAttribute('height'); s.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    info.textContent = `${o.paper} · ${last.widthMm}×${last.heightMm} mm · M 1:${last.scale}${ctx ? '' : ' · atrof yuklanmagan'}`;
  };

  const seg = <T extends string | number | boolean>(items: [T, string][], get: () => T, set: (v: T) => void, id: string) => {
    const box = h('div', { class: 'seg sm', role: 'group', id });
    const sync = () => box.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(items[i][0] === get())));
    items.forEach(([v, t]) => box.append(h('button', { 'data-v': String(v), onclick: () => { set(v); sync(); render(); } }, t)));
    sync(); return box;
  };
  const chk = (k: keyof SheetOpts['show'], t: string) => h('div', { class: 'li' }, check(h('span', { class: 'k' }, tr(t)), { checked: o.show[k], 'data-show': k, onchange: v => { o.show[k] = v; render(); } }));

  const kinds = h('div', { class: 'tiles c2 gx-kinds', role: 'radiogroup', 'aria-label': tr('Varaq turi') });
  const syncKinds = () => kinds.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.kind === o.kind)));
  for (const k of SHEET_KINDS) kinds.append(h('button', { class: 'tile', 'data-kind': k.id, title: k.note, onclick: () => { o.kind = k.id; syncKinds(); render(); } }, h('b', {}, tr(k.name)), h('span', { class: 'sub' }, tr(k.note))));
  syncKinds();

  const title = h('input', { class: 'input', type: 'text', value: o.title, placeholder: doc.name, id: 'gxTitle', 'aria-label': tr('Sarlavha') }) as HTMLInputElement;
  title.oninput = () => { o.title = title.value; render(); };
  const scaleSel = select({ id: 'gxScale', 'aria-label': tr('Masshtab'), onchange: v => { o.scale = +v; render(); } }, [{ value: '0', label: tr('Avtomatik'), selected: !o.scale }, ...SCALES.map(sc => ({ value: String(sc), label: `1:${sc}`, selected: o.scale === sc }))]);

  const png = (dpi: number) => {
    const img = new Image(), url = URL.createObjectURL(new Blob([last.svg], { type: 'image/svg+xml' }));
    img.onload = () => {
      const W = Math.round(last.widthMm / 25.4 * dpi), H = Math.round(last.heightMm / 25.4 * dpi);
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d')!; g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.drawImage(img, 0, 0, W, H); URL.revokeObjectURL(url);
      c.toBlob(b => b ? download(`${safe(doc.name)}_${o.kind}_${dpi}dpi.png`, b) : toast('PNG yaratilmadi'), 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast('PNG yaratilmadi'); };
    img.src = url;
  };

  side.append(
    h('div', { class: 'gx-head' }, tr('Grafika') !== tr('Varaqlar') ? h('span', { class: 't-small' }, tr('Grafika')) : '', h('h2', { class: 't-title' }, tr('Varaqlar'))),
    h('div', { class: 'glabel' }, h('span', {}, tr('Varaq turi'))), kinds,
    h('div', { class: 'field' }, h('label', { for: 'gxTitle' }, tr('Sarlavha')), title),
    h('div', { class: 'row2' },
      h('div', { class: 'field' }, h('label', { for: 'gxScale' }, tr('Masshtab')), scaleSel),
      h('div', { class: 'field' }, h('label', {}, tr('Format')), seg((['A4', 'A3', 'A2', 'A1'] as Paper[]).map(p => [p, p] as [Paper, string]), () => o.paper, v => { o.paper = v; }, 'gxPaper'))),
    seg([[true, tr('Albom')], [false, tr('Kitob')]], () => o.landscape, v => { o.landscape = v; }, 'gxOrient'),
    h('div', { class: 'glabel' }, h('span', {}, tr('Bezaklar'))),
    h('div', { class: 'group' }, chk('title', 'Sarlavha'), chk('scaleBar', 'Masshtab chizgʻichi'), chk('north', 'Shimol'), chk('legend', 'Shartli belgilar'), chk('frame', 'Ramka'), chk('grid', 'Koordinata toʻri')),
    h('div', { class: 'glabel' }, h('span', {}, tr('Qatlamlar'))),
    h('div', { class: 'group' }, chk('context', 'Atrof (OSM)'), chk('trees', 'Daraxtlar'), chk('labels', 'Yozuvlar, qavatlar'), chk('demolished', 'Buziladigan binolar')),
    h('button', { class: 'btn btn-primary btn-sm btn-block', id: 'gxSvg', onclick: () => download(`${safe(doc.name)}_${o.kind}.svg`, last.svg, 'image/svg+xml') }, tr('SVG (qatlamlar bilan)')),
    h('button', { class: 'btn btn-sm btn-block', id: 'gxAi', onclick: () => downloadIllustrator(doc, ctx, o) }, tr('Adobe Illustrator uchun (SVG, qatlamlar)')),
    h('div', { class: 'row2' }, h('button', { class: 'btn btn-sm', id: 'gxPng', onclick: () => png(150) }, 'PNG 150 dpi'), h('button', { class: 'btn btn-sm', onclick: () => png(300) }, 'PNG 300 dpi')),
    h('span', { class: 't-small' }, tr('SVG haqiqiy oʻlchamda (mm). «Illustrator uchun» faylini Illustrator da Fayl → Ochish bilan oching: atrof, koʻchalar, binolar, yozuvlar — alohida qatlamlar (Layers). Inkscape oddiy SVG ni ham qatlam bilan ochadi. Masshtab «avtomatik» boʻlsa — uchastka sigʻadigan eng yirik standart masshtab tanlanadi.')),
  );

  const wrap = h('div', { class: 'gx', role: 'dialog', 'aria-modal': 'true', 'aria-label': tr('Grafika muharriri') },
    side,
    h('div', { class: 'gx-main' },
      h('div', { class: 'gx-bar' }, info, h('span', { class: 'spacer' }), h('button', { class: 'btn btn-sm btn-ghost', id: 'gxClose', onclick: close }, tr('Yopish (Esc)'))),
      view));
  document.body.append(wrap);
  document.addEventListener('keydown', onKey);
  render();
}
