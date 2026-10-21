/**
 * Chizmadon varagʻi → SVG (mm). Bitta funksiya ekranda, SVG/PDF/PNG eksportda va albom miniatyuralarida ishlaydi.
 * PDF (svg2pdf) bilan mos boʻlishi uchun: filtr va pattern ishlatilmaydi — yumshoq chegara konsentrik shaffof
 * chiziqlar bilan, lenta — ikki chiziq bilan, oʻq uchi — koʻpburchak bilan chiziladi.
 * Har qatlam — alohida nomli guruh (Illustrator / Inkscape qatlam sifatida koʻradi).
 */
import { type ChEl, type ChPage, pageSize, bbox, mapScale } from './model';
import { dashArray, iconById, treeById, type Crown } from './catalog';

const PT = 0.3528;   // 1 pt = 0,3528 mm
/** shrift + zaxira (SVG da shrift yuklanmagan boʻlsa ham oʻqiladigan boʻlsin) */
export const ff = (f = 'Archivo') => `${f}, ${/Mono/.test(f) ? 'monospace' : /Serif/.test(f) ? 'serif' : 'sans-serif'}`;
const n = (v: number) => (Math.round(v * 100) / 100).toString();
export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
type P = [number, number];

/** Silliq egri: Catmull-Rom → kubik Bezye */
export function smoothD(pts: P[], closed = false): string {
  if (pts.length < 2) return '';
  if (pts.length === 2 && !closed) return `M${n(pts[0][0])} ${n(pts[0][1])}L${n(pts[1][0])} ${n(pts[1][1])}`;
  const P = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
  let d = `M${n(P[1][0])} ${n(P[1][1])}`;
  const last = closed ? pts.length + 1 : pts.length;
  for (let i = 1; i < last; i++) {
    const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] ?? p2;
    const c1: P = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2: P = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${n(c1[0])} ${n(c1[1])} ${n(c2[0])} ${n(c2[1])} ${n(p2[0])} ${n(p2[1])}`;
  }
  return d + (closed ? 'Z' : '');
}
const polyD = (pts: P[], closed = false) => pts.map((p, i) => `${i ? 'L' : 'M'}${n(p[0])} ${n(p[1])}`).join('') + (closed ? 'Z' : '');

/** Chiziq boʻylab teng oraliqdagi nuqtalar (qator, bekatlar, shpallar) — [nuqta, burchak] */
export function along(pts: P[], gap: number, offset = 0): [P, number][] {
  const out: [P, number][] = []; if (pts.length < 2 || gap <= 0) return out;
  let rest = offset;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    let t = rest;
    while (t <= L + 1e-9) { const f = L ? t / L : 0; out.push([[a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], ang]); t += gap; if (out.length > 4000) return out; }
    rest = t - L;
  }
  return out;
}
/** Silliq egrini koʻp nuqtali siniq chiziqqa aylantirish (qator va oʻq uchi uchun) */
export function sampleSmooth(pts: P[], smooth: boolean): P[] {
  if (!smooth || pts.length < 3) return pts;
  const P = [pts[0], ...pts, pts[pts.length - 1]], out: P[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] ?? p2;
    for (let k = 1; k <= 12; k++) {
      const t = k / 12, t2 = t * t, t3 = t2 * t;
      out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
    }
  }
  return out;
}
/** Oʻq uchi: uch burchak (a — oxirgidan oldingi, b — uch nuqta) */
function headPoly(a: P, b: P, w: number, fill: string, op: number): string {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), L = w * 2.4, W = w * 1.9;
  const tip: P = [b[0] + Math.cos(ang) * w * 0.6, b[1] + Math.sin(ang) * w * 0.6];
  const back: P = [tip[0] - Math.cos(ang) * L, tip[1] - Math.sin(ang) * L];
  const l: P = [back[0] + Math.cos(ang + Math.PI / 2) * W / 2 * 1.15, back[1] + Math.sin(ang + Math.PI / 2) * W / 2 * 1.15];
  const r: P = [back[0] - Math.cos(ang + Math.PI / 2) * W / 2 * 1.15, back[1] - Math.sin(ang + Math.PI / 2) * W / 2 * 1.15];
  return `<path d="${polyD([tip, l, r], true)}" fill="${fill}"${op < 1 ? ` fill-opacity="${op}"` : ''}/>`;
}
/** uchidan biroz oldingi nuqta (silliq egrida yoʻnalish toʻgʻri boʻlishi uchun) */
const before = (pts: P[], end: boolean): [P, P] => { const s = end ? pts : [...pts].reverse(); const b = s[s.length - 1]; let a = s[s.length - 2] ?? b; for (let i = s.length - 2; i >= 0; i--) { a = s[i]; if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 0.5) break; } return [a, b]; };
/** chiziqni uchidan qisqartirish (oʻq uchi chiziq ustiga chiqmasligi uchun) */
function trim(pts: P[], d: number, end: boolean): P[] {
  const s = end ? [...pts] : [...pts].reverse();
  let rest = d;
  while (s.length > 1 && rest > 0) {
    const b = s[s.length - 1], a = s[s.length - 2], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L > rest) { const f = (L - rest) / L; s[s.length - 1] = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; rest = 0; } else { s.pop(); rest -= L; }
  }
  return end ? s : s.reverse();
}

/* ---------- glyphlar ---------- */
function treeGlyph(c: P, r: number, crown: Crown, color: string): string {
  const [x, y] = c, s = `stroke="#3f5f39" stroke-width="${n(r * 0.08)}"`;
  switch (crown) {
    case 'column': return `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(r * 0.45)}" ry="${n(r)}" fill="${color}" ${s}/>`;
    case 'cone': return `<path d="${polyD([[x, y - r], [x + r * 0.7, y + r * 0.8], [x - r * 0.7, y + r * 0.8]], true)}" fill="${color}" ${s}/>`;
    case 'umbrella': return `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${color}" fill-opacity="0.75" ${s}/><circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 0.18)}" fill="#3f5f39"/>`;
    case 'spread': { let d = ''; for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; d += `<circle cx="${n(x + Math.cos(a) * r * 0.45)}" cy="${n(y + Math.sin(a) * r * 0.45)}" r="${n(r * 0.55)}" fill="${color}"/>`; } return d + `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 0.95)}" fill="none" ${s}/>`; }
    case 'oval': return `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(r * 0.8)}" ry="${n(r)}" fill="${color}" ${s}/>`;
    default: return `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${color}" ${s}/>`;
  }
}
function personGlyph(c: P, h: number, color: string): string {
  const [x, y] = c, r = h * 0.13;
  return `<circle cx="${n(x)}" cy="${n(y - h * 0.36)}" r="${n(r)}" fill="${color}"/><path d="M${n(x - h * 0.17)} ${n(y + h * 0.5)}L${n(x - h * 0.12)} ${n(y - h * 0.18)}Q${n(x)} ${n(y - h * 0.26)} ${n(x + h * 0.12)} ${n(y - h * 0.18)}L${n(x + h * 0.17)} ${n(y + h * 0.5)}Z" fill="${color}"/>`;
}
/** 24 × 24 belgisini (x, y) markazga s mm oʻlchamda */
export function iconGlyph(id: string, cx: number, cy: number, s: number, color: string, sw = 1.75): string {
  const k = s / 24;
  return `<g transform="translate(${n(cx - s / 2)} ${n(cy - s / 2)}) scale(${(Math.round(k * 10000) / 10000)})"><path d="${iconById(id).d}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
}

/* ---------- elementlar ---------- */
export interface RenderCtx { idp: string; tr: (s: string) => string }
const opa = (o?: number) => (o != null && o < 1 ? ` opacity="${n(o)}"` : '');

function textEl(e: ChEl, R: RenderCtx): string {
  const st = e.style, size = (st.size ?? 11) * PT, lh = (st.lh ?? 1.25) * size, lines = (e.text ?? '').split('\n');
  const al = st.align ?? 'start', w = e.w ?? 0, x = al === 'middle' ? (e.x ?? 0) + w / 2 : al === 'end' ? (e.x ?? 0) + w : (e.x ?? 0);
  const y0 = (e.y ?? 0) + size * 0.82;
  const attrs = `font-family="${esc(ff(st.font))}" font-size="${n(size)}"${st.bold ? ' font-weight="700"' : ''}${st.italic ? ' font-style="italic"' : ''} fill="${st.fill ?? '#141414'}" text-anchor="${al}"`;
  return `<text ${attrs}${opa(st.opacity)}>${lines.map((t, i) => `<tspan x="${n(x)}" y="${n(y0 + i * lh)}">${esc(R.tr(t)) || ' '}</tspan>`).join('')}</text>`;
}
/** matn bloki balandligi (mm) — tanlov qutisi uchun */
export const textHeight = (e: ChEl) => { const size = (e.style.size ?? 11) * PT; return size + ((e.text ?? '').split('\n').length - 1) * (e.style.lh ?? 1.25) * size + size * 0.25; };

function lineEl(e: ChEl): string {
  const st = e.style, pts = e.pts ?? []; if (pts.length < 2) return '';
  const w = st.width ?? 0.5, col = st.stroke ?? '#141414', head: string = e.t === 'arrow' ? (st.head && st.head !== 'none' ? st.head : 'end') : (st.head ?? 'none');
  const smooth = e.t === 'pen' || !!st.smooth;
  const dense = smooth ? sampleSmooth(pts, e.t !== 'pen' && smooth) : pts;
  let body = dense;
  if (head === 'end' || head === 'both') body = trim(body, w * 1.6, true);
  if (head === 'both') body = trim(body, w * 1.6, false);
  const dash = dashArray(st.dash, w), d = smooth && e.t !== 'pen' ? polyD(body) : e.t === 'pen' ? smoothD(body) : polyD(body);
  let out = '';
  if (st.deco === 'casing') out += `<path d="${d}" fill="none" stroke="#ffffff" stroke-width="${n(w + 0.8)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  out += `<path d="${d}" fill="none" stroke="${col}" stroke-width="${n(w)}" stroke-linecap="${st.dash === 'dot' ? 'round' : 'round'}" stroke-linejoin="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
  if (st.deco === 'rail') out += along(dense, w * 4, w * 2).map(([p, a]) => { const dx = Math.cos(a + Math.PI / 2) * w * 2.2, dy = Math.sin(a + Math.PI / 2) * w * 2.2; return `<path d="M${n(p[0] - dx)} ${n(p[1] - dy)}L${n(p[0] + dx)} ${n(p[1] + dy)}" stroke="${col}" stroke-width="${n(w * 0.7)}"/>`; }).join('');
  if (st.deco === 'stations') out += along(dense, Math.max(20, w * 30), 0).map(([p]) => `<circle cx="${n(p[0])}" cy="${n(p[1])}" r="${n(w * 1.6)}" fill="#ffffff" stroke="${col}" stroke-width="${n(w * 0.8)}"/>`).join('');
  if (head === 'end' || head === 'both') { const [a, b] = before(dense, true); out += headPoly(a, b, w, col, 1); }
  if (head === 'both') { const [a, b] = before(dense, false); out += headPoly(a, b, w, col, 1); }
  return `<g${opa(st.opacity)}>${out}</g>`;
}

function flowEl(e: ChEl): string {
  const st = e.style, pts = e.pts ?? []; if (pts.length < 2) return '';
  const w = st.width ?? 5, col = st.stroke ?? '#f0a35e', op = st.opacity ?? 0.9, band = st.band ?? 'toliq', head = st.head ?? 'end';
  const dense = sampleSmooth(pts, st.smooth !== false);
  let body = dense; const hl = w * 1.8;
  if (head !== 'none') body = trim(body, hl, true); if (head === 'both') body = trim(body, hl, false);
  const d = polyD(body); let out = '';
  const base = (sw: number, c: string, extra = '') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${n(sw)}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
  if (band === 'lenta') out += base(w, col) + base(w, '#ffffff', ` stroke-dasharray="${n(w * 0.22)} ${n(w * 0.5)}" stroke-linecap="butt" stroke-opacity="0.55"`);
  else if (band === 'kontur') out += base(w, col) + base(Math.max(0.2, w - Math.min(1, w * 0.3)), '#ffffff');
  else if (band === 'nuqta') out += base(w, col, ` stroke-dasharray="0 ${n(w * 2)}"`);
  else if (band === 'punktir') out += base(w, col, ` stroke-dasharray="${n(w * 3)} ${n(w * 2)}" stroke-linecap="butt"`);
  else out += base(w, col);
  const hw = band === 'nuqta' || band === 'punktir' ? w * 1.6 : w;
  if (head !== 'none') { const [a, b] = before(dense, true); out += band === 'kontur' ? headPoly(a, b, hw, col, 1) : headPoly(a, b, hw, col, 1); }
  if (head === 'both') { const [a, b] = before(dense, false); out += headPoly(a, b, hw, col, 1); }
  return `<g opacity="${n(op)}">${out}</g>`;
}

function zoneEl(e: ChEl): string {
  const st = e.style, pts = e.pts ?? []; if (pts.length < 3) return '';
  const col = st.fill ?? '#8cc47a', op = st.opacity ?? 0.55, halo = st.halo ?? 6, d = smoothD(pts, true);
  let out = '';
  // yumshoq chegara: tashqariga qarab xiralashadigan halqalar (filtrsiz)
  const k = 5; for (let i = k; i >= 1; i--) out += `<path d="${d}" fill="none" stroke="${col}" stroke-width="${n(halo * 2 * i / k)}" stroke-opacity="${n(op * 0.22)}" stroke-linejoin="round"/>`;
  out += `<path d="${d}" fill="${col}" fill-opacity="${n(op)}"${st.stroke ? ` stroke="${st.stroke}" stroke-width="${n(st.width ?? 0.3)}"` : ''}/>`;
  return `<g>${out}</g>`;
}

function shapeEl(e: ChEl): string {
  const st = e.style, w = st.width ?? 0.4, fill = st.fill ?? 'none', stroke = st.stroke ?? (fill === 'none' ? '#141414' : 'none');
  const dash = dashArray(st.dash, w), s = `fill="${fill}" stroke="${stroke}" stroke-width="${n(w)}"${dash ? ` stroke-dasharray="${dash}"` : ''}${opa(st.opacity)}`;
  if (e.t === 'rect') { const [x0, y0, x1, y1] = bbox(e); return `<rect x="${n(x0)}" y="${n(y0)}" width="${n(x1 - x0)}" height="${n(y1 - y0)}" ${s}/>`; }
  if (e.t === 'ellipse') { const [x0, y0, x1, y1] = bbox(e); return `<ellipse cx="${n((x0 + x1) / 2)}" cy="${n((y0 + y1) / 2)}" rx="${n((x1 - x0) / 2)}" ry="${n((y1 - y0) / 2)}" ${s}/>`; }
  if (e.t === 'poly') return (e.pts?.length ?? 0) >= 2 ? `<path d="${polyD(e.pts!, true)}" ${s} stroke-linejoin="round"/>` : '';
  return '';
}

function iconEl(e: ChEl): string {
  const st = e.style, s = Math.abs(e.w ?? 10), cx = (e.x ?? 0) + (e.w ?? 10) / 2, cy = (e.y ?? 0) + (e.h ?? 10) / 2, col = st.stroke ?? '#2f6da8', look = e.look ?? 'doira';
  const ic = e.icon ?? 'nuqta';
  if (look === 'belgi') return `<g${opa(st.opacity)}>${iconGlyph(ic, cx, cy, s, col)}</g>`;
  if (look === 'tolqin') return `<g${opa(st.opacity)}>${[1, 0.72, 0.46].map((f, i) => `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(s / 2 * f)}" fill="${col}" fill-opacity="${n(0.12 + i * 0.14)}"/>`).join('')}<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(s * 0.12)}" fill="${col}"/></g>`;
  if (look === 'pin') {
    const r = s * 0.36, top = cy - s * 0.5 + r;
    return `<g${opa(st.opacity)}><path d="M${n(cx)} ${n(cy + s / 2)}C${n(cx - r * 0.4)} ${n(top + r * 1.3)} ${n(cx - r)} ${n(top + r * 0.6)} ${n(cx - r)} ${n(top)}A${n(r)} ${n(r)} 0 1 1 ${n(cx + r)} ${n(top)}C${n(cx + r)} ${n(top + r * 0.6)} ${n(cx + r * 0.4)} ${n(top + r * 1.3)} ${n(cx)} ${n(cy + s / 2)}Z" fill="${col}"/>${iconGlyph(ic, cx, top, r * 1.25, '#ffffff', 2.2)}</g>`;
  }
  return `<g${opa(st.opacity)}><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(s / 2 - s * 0.05)}" fill="#ffffff" stroke="${col}" stroke-width="${n(s * 0.09)}"/>${iconGlyph(ic, cx, cy, s * 0.56, col, 2)}</g>`;
}

function rowEl(e: ChEl): string {
  const r = e.row ?? { kind: 'tree', gap: 8, size: 5 }, pts = e.pts ?? []; if (pts.length < 2) return '';
  const col = e.style.fill ?? e.style.stroke, items = along(sampleSmooth(pts, !!e.style.smooth), r.gap, 0);
  const t = treeById(r.tree);
  return `<g${opa(e.style.opacity)}>${items.map(([p]) => r.kind === 'tree' ? treeGlyph(p, r.size / 2, t.crown, col ?? t.color)
    : r.kind === 'people' ? personGlyph(p, r.size, col ?? '#3c3b38')
      : r.kind === 'icon' ? iconGlyph(r.icon ?? 'nuqta', p[0], p[1], r.size, col ?? '#2f6da8')
        : `<circle cx="${n(p[0])}" cy="${n(p[1])}" r="${n(r.size / 2)}" fill="${col ?? '#6fae8e'}"/>`).join('')}</g>`;
}

function imageEl(e: ChEl, R: RenderCtx): string {
  const [x0, y0, x1, y1] = bbox(e); if (!e.src) return placeholder(e, R, 'Rasm');
  const id = `${R.idp}c${e.id}`;
  return `<clipPath id="${id}"><rect x="${n(x0)}" y="${n(y0)}" width="${n(x1 - x0)}" height="${n(y1 - y0)}"/></clipPath><image x="${n(x0)}" y="${n(y0)}" width="${n(x1 - x0)}" height="${n(y1 - y0)}" preserveAspectRatio="xMidYMid slice" href="${e.src}" clip-path="url(#${id})"${opa(e.style.opacity)}/>`
    + (e.style.stroke ? `<rect x="${n(x0)}" y="${n(y0)}" width="${n(x1 - x0)}" height="${n(y1 - y0)}" fill="none" stroke="${e.style.stroke}" stroke-width="${n(e.style.width ?? 0.3)}"/>` : '');
}
function placeholder(e: ChEl, R: RenderCtx, label: string): string {
  const [x0, y0, x1, y1] = bbox(e), w = x1 - x0, h = y1 - y0;
  return `<rect x="${n(x0)}" y="${n(y0)}" width="${n(w)}" height="${n(h)}" fill="#ecebe7"/><path d="M${n(x0)} ${n(y0)}L${n(x1)} ${n(y1)}M${n(x1)} ${n(y0)}L${n(x0)} ${n(y1)}" stroke="#d3d0c9" stroke-width="0.3"/>`
    + `<text x="${n(x0 + w / 2)}" y="${n(y0 + h / 2 + 1.5)}" font-family="${ff()}" font-size="${n(Math.max(2.5, Math.min(6, w / 14)))}" fill="#8f8c86" text-anchor="middle">${esc(R.tr(e.name || label))}</text>`;
}
/** ichki SVG dagi id larni noyob qilish (bir varaqda bir nechta xarita oynasi) */
const prefixIds = (svg: string, p: string) => svg.replace(/\bid="([^"]+)"/g, `id="${p}$1"`).replace(/url\(#([^)]+)\)/g, `url(#${p}$1)`).replace(/href="#([^"]+)"/g, `href="#${p}$1"`);
function mapEl(e: ChEl, R: RenderCtx): string {
  const [x0, y0, x1, y1] = bbox(e), w = x1 - x0, h = y1 - y0;
  if (!e.svg && !e.src) return placeholder(e, R, 'Xarita oynasi');
  const id = `${R.idp}m${e.id}`;
  const frame = `<rect x="${n(x0)}" y="${n(y0)}" width="${n(w)}" height="${n(h)}" fill="none" stroke="${e.style.stroke ?? '#141414'}" stroke-width="${n(e.style.width ?? 0.25)}"/>`;
  const sc = mapScale(e), lbl = sc && e.style.kind !== 'izoh' ? `<text x="${n(x1 - 2)}" y="${n(y1 - 2)}" font-family="${ff('IBM Plex Mono')}" font-size="2.5" fill="#3c3b38" text-anchor="end">M 1:${sc.toLocaleString('ru-RU')}</text>` : '';
  if (e.src) return `<clipPath id="${id}"><rect x="${n(x0)}" y="${n(y0)}" width="${n(w)}" height="${n(h)}"/></clipPath><image x="${n(x0)}" y="${n(y0)}" width="${n(w)}" height="${n(h)}" preserveAspectRatio="xMidYMid slice" href="${e.src}" clip-path="url(#${id})"/>${frame}${lbl}`;
  const vb = e.vb ?? [0, 0, w, h];
  return `<svg x="${n(x0)}" y="${n(y0)}" width="${n(w)}" height="${n(h)}" viewBox="${vb.map(n).join(' ')}" preserveAspectRatio="xMidYMid slice" overflow="hidden">${prefixIds(e.svg!, id)}</svg>${frame}${lbl}`;
}

function tableEl(e: ChEl, R: RenderCtx): string {
  const rows = e.rows ?? [], [x0, y0, x1] = bbox(e), w = x1 - x0, size = (e.style.size ?? 8) * PT, rh = size * 1.9;
  if (!rows.length) return placeholder(e, R, 'Jadval');
  const cols = Math.max(...rows.map(r => r.length)), cw = rows[0].length > 1 ? [w * 0.55, ...Array(cols - 1).fill(w * 0.45 / (cols - 1))] : [w];
  let out = '';
  rows.forEach((r, i) => {
    const y = y0 + i * rh;
    if (i === 0) out += `<rect x="${n(x0)}" y="${n(y)}" width="${n(w)}" height="${n(rh)}" fill="#f2f1ee"/>`;
    let x = x0;
    r.forEach((c, j) => { const right = j > 0; out += `<text x="${n(right ? x + cw[j] - 1.5 : x + 1.5)}" y="${n(y + rh * 0.66)}" font-family="${ff(j ? 'IBM Plex Mono' : 'Archivo')}" font-size="${n(size)}"${i === 0 ? ' font-weight="700"' : ''} fill="#141414" text-anchor="${right ? 'end' : 'start'}">${esc(R.tr(c))}</text>`; x += cw[j]; });
    out += `<path d="M${n(x0)} ${n(y + rh)}H${n(x1)}" stroke="#cfccc5" stroke-width="0.2"/>`;
  });
  return out;
}
/** Shartli belgilar: varaqdagi nomlangan elementlar ranglaridan (tekshiruv 4 — legenda sahifadagi ranglarga mos) */
export function legendItems(page: ChPage): { label: string; color: string; kind: 'line' | 'fill' | 'icon'; icon?: string }[] {
  const seen = new Map<string, { label: string; color: string; kind: 'line' | 'fill' | 'icon'; icon?: string }>();
  for (const e of page.els) {
    if (!e.name || e.t === 'legend' || e.t === 'text' || e.t === 'table' || e.t === 'map' || e.t === 'image') continue;
    const color = e.t === 'zone' || e.t === 'rect' || e.t === 'ellipse' || e.t === 'poly' ? e.style.fill ?? e.style.stroke : e.style.stroke ?? e.style.fill;
    if (!color) continue;
    const kind = e.t === 'zone' || e.t === 'rect' || e.t === 'ellipse' || e.t === 'poly' ? 'fill' : e.t === 'icon' ? 'icon' : 'line';
    const k = `${e.name}|${color}`; if (!seen.has(k)) seen.set(k, { label: e.name, color, kind, ...(e.icon ? { icon: e.icon } : {}) });
  }
  return [...seen.values()];
}
function legendEl(e: ChEl, page: ChPage, R: RenderCtx): string {
  const items = legendItems(page), x = e.x ?? 0, y = e.y ?? 0, size = (e.style.size ?? 9) * PT, rh = size * 2;
  let out = `<text x="${n(x)}" y="${n(y + size)}" font-family="${ff()}" font-size="${n(size * 1.15)}" font-weight="700" fill="#141414">${esc(R.tr(e.text || 'Shartli belgilar'))}</text>`;
  items.forEach((it, i) => {
    const yy = y + size * 2.2 + i * rh, s = size * 1.2;
    out += it.kind === 'fill' ? `<rect x="${n(x)}" y="${n(yy)}" width="${n(s * 1.4)}" height="${n(s)}" fill="${it.color}" fill-opacity="0.75"/>`
      : it.kind === 'icon' ? `<circle cx="${n(x + s * 0.7)}" cy="${n(yy + s / 2)}" r="${n(s / 2)}" fill="${it.color}"/>`
        : `<path d="M${n(x)} ${n(yy + s / 2)}h${n(s * 1.4)}" stroke="${it.color}" stroke-width="${n(s * 0.45)}" stroke-linecap="round"/>`;
    out += `<text x="${n(x + s * 2)}" y="${n(yy + s * 0.85)}" font-family="${ff()}" font-size="${n(size)}" fill="#3c3b38">${esc(R.tr(it.label))}</text>`;
  });
  if (!items.length) out += `<text x="${n(x)}" y="${n(y + size * 3.2)}" font-family="${ff()}" font-size="${n(size * 0.9)}" fill="#8f8c86">${esc(R.tr('Nomlangan element yoʻq'))}</text>`;
  return out;
}
/** shartli belgilar bloki balandligi (mm) */
export const legendHeight = (e: ChEl, page: ChPage) => { const size = (e.style.size ?? 9) * PT; return size * 2.2 + Math.max(1, legendItems(page).length) * size * 2; };

export function elSvg(e: ChEl, page: ChPage, R: RenderCtx): string {
  let s: string;
  switch (e.t) {
    case 'text': s = textEl(e, R); break;
    case 'line': case 'arrow': case 'pen': s = lineEl(e); break;
    case 'flow': s = flowEl(e); break;
    case 'zone': s = zoneEl(e); break;
    case 'rect': case 'ellipse': case 'poly': s = shapeEl(e); break;
    case 'icon': s = iconEl(e); break;
    case 'row': s = rowEl(e); break;
    case 'image': s = imageEl(e, R); break;
    case 'map': s = mapEl(e, R); break;
    case 'table': s = tableEl(e, R); break;
    case 'legend': s = legendEl(e, page, R); break;
    default: s = '';
  }
  const [cx, cy] = (() => { const b = bbox(e); return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; })();
  const tf: string[] = [];
  if (e.rot) tf.push(`rotate(${n(e.rot)} ${n(cx)} ${n(cy)})`);
  if (e.flipX || e.flipY) tf.push(`translate(${n(cx)} ${n(cy)}) scale(${e.flipX ? -1 : 1} ${e.flipY ? -1 : 1}) translate(${n(-cx)} ${n(-cy)})`);
  return `<g data-id="${e.id}"${tf.length ? ` transform="${tf.join(' ')}"` : ''}>${s}</g>`;
}

export interface PageOpts {
  tr?: (s: string) => string;
  /** ekranda: yashirin qatlamlar ham koʻrinmaydi; eksportda — xuddi shunday */
  grid?: boolean;
  /** albom: varaq raqami va shtamp */
  num?: { i: number; total: number };
  stamp?: { title: string; author: string; date: string } | null;
  /** id prefiksi (bir sahifada bir nechta varaq) */
  idp?: string;
  /** Illustrator qatlam belgilari */
  ai?: boolean;
  /** maket varagʻi (sheet.ts) — oq fon oʻrniga, qoʻlda chizilganlar ostida */
  bg?: string;
}
export function pageSvg(page: ChPage, o: PageOpts = {}): { svg: string; w: number; h: number } {
  const [W, H] = pageSize(page), R: RenderCtx = { idp: o.idp ?? 'c', tr: o.tr ?? (s => s) };
  let body = o.bg ? `<g id="${esc(R.idp + 'Maket')}" data-bg="1"${o.ai ? ' inkscape:groupmode="layer" inkscape:label="Maket"' : ''}>${o.bg}</g>` : `<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`;
  if (o.grid) { let g = ''; for (let x = 5; x < W; x += 5) g += `M${x} 0V${H}`; for (let y = 5; y < H; y += 5) g += `M0 ${y}H${W}`; body += `<path d="${g}" stroke="#e7e6e2" stroke-width="0.12"/>`; }
  for (const L of page.layers) {
    if (!L.visible) continue;
    const els = page.els.filter(e => e.layer === L.id); if (!els.length) continue;
    body += `<g id="${esc(R.idp + 'L-' + L.name.replace(/\s+/g, '_'))}" data-layer="${L.id}"${o.ai ? ` inkscape:groupmode="layer" inkscape:label="${esc(L.name)}"` : ''}>${els.map(e => elSvg(e, page, R)).join('')}</g>`;
  }
  if (o.stamp) {
    const sw = Math.min(110, W * 0.3), sh = 14, x = W - 8 - sw, y = H - 8 - sh;
    body += `<g id="${R.idp}Shtamp"><rect x="${n(x)}" y="${n(y)}" width="${n(sw)}" height="${sh}" fill="#ffffff" stroke="#141414" stroke-width="0.25"/><path d="M${n(x)} ${n(y + 7)}H${n(x + sw)}M${n(x + sw * 0.7)} ${n(y)}V${n(y + sh)}" stroke="#141414" stroke-width="0.18"/>`
      + `<text x="${n(x + 2)}" y="${n(y + 4.8)}" font-family="${ff()}" font-size="2.8" font-weight="700" fill="#141414">${esc(R.tr(o.stamp.title))}</text>`
      + `<text x="${n(x + 2)}" y="${n(y + 11.8)}" font-family="${ff()}" font-size="2.5" fill="#3c3b38">${esc(R.tr(page.name))}</text>`
      + `<text x="${n(x + sw * 0.7 + 2)}" y="${n(y + 4.8)}" font-family="${ff('IBM Plex Mono')}" font-size="2.5" fill="#3c3b38">${esc(o.stamp.author || '—')}</text>`
      + `<text x="${n(x + sw * 0.7 + 2)}" y="${n(y + 11.8)}" font-family="${ff('IBM Plex Mono')}" font-size="2.5" fill="#3c3b38">${esc(o.stamp.date)}${o.num ? ` · ${o.num.i}/${o.num.total}` : ''}</text></g>`;
  } else if (o.num) body += `<text x="${n(W - 8)}" y="${n(H - 6)}" font-family="${ff('IBM Plex Mono')}" font-size="3" fill="#6b6965" text-anchor="end">${String(o.num.i).padStart(2, '0')} / ${String(o.num.total).padStart(2, '0')}</text>`;
  const ns = `xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"${o.ai ? ' xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"' : ''}`;
  return { svg: `<svg ${ns} width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">${body}</svg>`, w: W, h: H };
}

/** Maket oilalari (bitta oyna): varaq dvigateli — sheet.ts */
export { renderPage as renderLayoutPage, PAL as LAYOUT_PAL, LIB as LAYOUT_LIB } from './sheet';
