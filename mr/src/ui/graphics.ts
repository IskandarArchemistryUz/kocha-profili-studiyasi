/**
 * Grafika muharriri: toʻliq ekranli oyna — chapda varaq sozlamalari, oʻngda jonli koʻrinish.
 * Eksport: SVG (qatlamlar bilan, mm da), Illustrator uchun SVG (har qatlam — Illustrator qatlami) va PNG (150/300 dpi).
 */
import type { Project } from '../core/doc';
import { sheetSvg, SHEET_DEFAULT, SHEET_KINDS, SCALES, type SheetCtx, type SheetOpts, type Paper } from '../core/sheet';
import { h, download, toast } from './dom';

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
  const info = h('div', { class: 'gx-info lb' });
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
    const box = h('div', { class: 'seg', role: 'group', id });
    const sync = () => box.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(items[i][0] === get())));
    items.forEach(([v, t]) => box.append(h('button', { 'data-v': String(v), onclick: () => { set(v); sync(); render(); } }, t)));
    sync(); return box;
  };
  const chk = (k: keyof SheetOpts['show'], t: string) => { const c = h('input', { type: 'checkbox', checked: o.show[k], 'data-show': k }) as HTMLInputElement; c.onchange = () => { o.show[k] = c.checked; render(); }; return h('label', {}, c, t); };

  const kinds = h('div', { class: 'gx-kinds', role: 'radiogroup', 'aria-label': 'Varaq turi' });
  const syncKinds = () => kinds.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.kind === o.kind)));
  for (const k of SHEET_KINDS) kinds.append(h('button', { 'data-kind': k.id, title: k.note, onclick: () => { o.kind = k.id; syncKinds(); render(); } }, h('b', {}, k.name), h('small', {}, k.note)));
  syncKinds();

  const title = h('input', { type: 'text', value: o.title, placeholder: doc.name, id: 'gxTitle' }) as HTMLInputElement;
  title.oninput = () => { o.title = title.value; render(); };
  const scaleSel = h('select', { id: 'gxScale' }, h('option', { value: '0' }, 'Avtomatik'), ...SCALES.map(s => h('option', { value: String(s) }, `1:${s}`))) as HTMLSelectElement;
  scaleSel.value = String(o.scale); scaleSel.onchange = () => { o.scale = +scaleSel.value; render(); };

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
    h('div', { class: 'gx-head' }, h('div', { class: 'lb' }, 'Grafika'), h('h2', {}, 'Varaqlar')),
    h('div', { class: 'lb' }, 'Varaq turi'), kinds,
    h('label', { class: 'field' }, h('span', { class: 'lb' }, 'Sarlavha'), title),
    h('div', { class: 'gx-two' },
      h('label', { class: 'field' }, h('span', { class: 'lb' }, 'Masshtab'), scaleSel),
      h('div', { class: 'field' }, h('span', { class: 'lb' }, 'Format'), seg((['A4', 'A3', 'A2', 'A1'] as Paper[]).map(p => [p, p] as [Paper, string]), () => o.paper, v => { o.paper = v; }, 'gxPaper'))),
    seg([[true, 'Albom'], [false, 'Kitob']], () => o.landscape, v => { o.landscape = v; }, 'gxOrient'),
    h('div', { class: 'lb' }, 'Bezaklar'),
    h('div', { class: 'chk' }, chk('title', 'Sarlavha'), chk('scaleBar', 'Masshtab chizgʻichi'), chk('north', 'Shimol'), chk('legend', 'Shartli belgilar'), chk('frame', 'Ramka'), chk('grid', 'Koordinata toʻri')),
    h('div', { class: 'lb' }, 'Qatlamlar'),
    h('div', { class: 'chk' }, chk('context', 'Atrof (OSM)'), chk('trees', 'Daraxtlar'), chk('labels', 'Yozuvlar, qavatlar'), chk('demolished', 'Buziladigan binolar')),
    h('div', { class: 'gx-actions' },
      h('button', { class: 'btn primary', id: 'gxSvg', onclick: () => download(`${safe(doc.name)}_${o.kind}.svg`, last.svg, 'image/svg+xml') }, 'SVG (qatlamlar bilan)'),
      h('button', { class: 'btn', id: 'gxAi', onclick: () => downloadIllustrator(doc, ctx, o) }, 'Adobe Illustrator uchun (SVG, qatlamlar)'),
      h('div', { class: 'row' }, h('button', { class: 'btn grow', id: 'gxPng', onclick: () => png(150) }, 'PNG 150 dpi'), h('button', { class: 'btn grow', onclick: () => png(300) }, 'PNG 300 dpi'))),
    h('p', { class: 'note' }, 'SVG haqiqiy oʻlchamda (mm). «Illustrator uchun» faylini Illustrator da Fayl → Ochish bilan oching: atrof, koʻchalar, binolar, yozuvlar — alohida qatlamlar (Layers). Inkscape oddiy SVG ni ham qatlam bilan ochadi. Masshtab «avtomatik» boʻlsa — uchastka sigʻadigan eng yirik standart masshtab tanlanadi.'),
  );

  const wrap = h('div', { class: 'gx', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Grafika muharriri' },
    side,
    h('div', { class: 'gx-main' },
      h('div', { class: 'gx-bar' }, info, h('span', { class: 'spacer' }), h('button', { class: 'btn', id: 'gxClose', onclick: close }, 'Yopish (Esc)')),
      view));
  document.body.append(wrap);
  document.addEventListener('keydown', onKey);
  render();
}
