/**
 * Hudud tahlili albomi (26.10): hisobot sahifalari, Shveytsar albom varagʻi va «Galereya» plakati — SVG, birlik mm.
 * Har qatlam uchun xarita surati alohida olinadi (faqat shu qatlam yoqilgan holda), matnlar — ekrandagi kartalardan.
 * Raqamlar faqat tahlil natijalaridan; ball yoki baho oʻylab topilmaydi.
 */
import { esc, wrap, type RepLegend, type RepNorm } from './report';
import { LAYER_ICON, GROUP_COL } from './layerIcons';
import { mapSvg, type MapBase, type Overlay } from './albomMap';

export type Theme = 'oq' | 'qora';
export type Frame = 'doira' | 'kvadrat';
export interface AlbumLayer { id: string; name: string; group: string; groupName: string; color: string; big: string; text: string[]; norms: RepNorm[]; src: string; beta: boolean; map: string | null; legend: RepLegend[]; /** shamol guli (180 × 180 birlik, ichki SVG) — xarita markazida */ rose?: string | null; ov?: Overlay }
export interface AlbumInput {
  addr: string; coords: string; radius: number; date: string; city: string;
  layers: AlbumLayer[]; overview: string | null; base?: MapBase; theme: Theme; frame: Frame;
  /** xarita surati qamrovi, m (kvadrat tomoni) */
  spanM: number;
  L: { kicker: string; summary: string; summaryLead: string; layer: string; value: string; norm: string; source: string; method: string; normsOk: string; north: string; author: string; page: string; layers: string; org: string; sources: string; note: string };
}
export interface Page { svg: string; w: number; h: number; name: string }

const FONT = 'Archivo, IBM Plex Sans, Arial, sans-serif', MONO = 'IBM Plex Mono, Menlo, monospace';
const n2 = (v: number) => (Math.round(v * 100) / 100).toString();
interface Pal { bg: string; ink: string; sub: string; mut: string; line: string; track: string }
const PAL: Record<Theme, Pal> = {
  oq: { bg: '#ffffff', ink: '#16171a', sub: '#3c3b38', mut: '#76736c', line: '#e4e1da', track: '#f1efea' },
  qora: { bg: '#0e0f11', ink: '#f2f0eb', sub: '#c4c0b8', mut: '#8d8a84', line: '#26282d', track: '#1b1d20' },
};
let uid = 0;
const doc = (w: number, h: number, p: Pal, body: string) => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}" font-family="${FONT}"><rect width="${w}" height="${h}" fill="${p.bg}"/>${body}</svg>`;
const t = (x: number, y: number, s: string, fs: number, fill: string, extra = '') => `<text x="${n2(x)}" y="${n2(y)}" font-size="${fs}" fill="${fill}"${extra}>${esc(s)}</text>`;
const lines = (x: number, y: number, s: string[], fs: number, lh: number, fill: string, w: number, max = 99, extra = '', kk = 0.52) => {
  const out: string[] = []; let k = 0;
  for (const para of s) for (const l of wrap(para, w, fs, kk)) { if (k >= max) break; out.push(t(x, y + k * lh, l, fs, fill, extra)); k++; }
  return { svg: out.join(''), h: k * lh };
};
export const icon = (id: string, x: number, y: number, size: number, color: string, sw = 1.6) => `<g transform="translate(${n2(x)} ${n2(y)}) scale(${n2(size / 24)})" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${LAYER_ICON[id] ?? ''}</g>`;

/** Xarita: kvadrat yoki doira ramkada, shimol va masshtab chizigʻi bilan */
function mapBox(I: AlbumInput, p: Pal, url: string | null, x: number, y: number, s: number, opt: { north?: boolean; scale?: boolean; border?: boolean; rose?: string | null; ov?: Overlay } = {}): string {
  if (I.base) return mapSvg(I.base, opt.ov ?? {}, { dark: I.theme === 'qora', frame: I.frame }, x, y, s) + mapMarks(I, p, x, y, s, opt);
  const id = `am${++uid}`, circ = I.frame === 'doira', o: string[] = [];
  return mapImg(I, p, url, x, y, s, opt, id, circ, o);
}
function mapImg(I: AlbumInput, p: Pal, url: string | null, x: number, y: number, s: number, opt: { north?: boolean; scale?: boolean; border?: boolean; rose?: string | null }, id: string, circ: boolean, o: string[]): string {
  const shape = circ ? `<circle cx="${n2(x + s / 2)}" cy="${n2(y + s / 2)}" r="${n2(s / 2)}"/>` : `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(s)}" height="${n2(s)}"/>`;
  o.push(`<defs><clipPath id="${id}">${shape}</clipPath></defs>`);
  if (url) o.push(`<image x="${n2(x)}" y="${n2(y)}" width="${n2(s)}" height="${n2(s)}" preserveAspectRatio="xMidYMid slice" href="${url}" xlink:href="${url}" clip-path="url(#${id})"/>`);
  else o.push(`<g clip-path="url(#${id})"><rect x="${n2(x)}" y="${n2(y)}" width="${n2(s)}" height="${n2(s)}" fill="${p.track}"/></g>`);
  if (opt.rose) { const k = s * 0.36 / 180; o.push(`<g transform="translate(${n2(x + s / 2 - 90 * k)} ${n2(y + s / 2 - 90 * k)}) scale(${n2(k)})">${opt.rose}</g>`); }
  if (opt.border !== false) o.push(shape.replace('/>', ` fill="none" stroke="${p.ink}" stroke-width="0.3"/>`));
  return o.join('') + mapMarks(I, p, x, y, s, opt);
}
function mapMarks(I: AlbumInput, p: Pal, x: number, y: number, s: number, opt: { north?: boolean; scale?: boolean }): string {
  const o: string[] = [];
  if (opt.north !== false) { const nx = x + s - 7, ny = y + 5; o.push(`<path d="M${n2(nx)} ${n2(ny)}l2.2 6.4-2.2-1.6-2.2 1.6z" fill="${p.ink}"/>`, t(nx, ny + 10.5, I.L.north, 2.6, p.ink, ' text-anchor="middle" font-weight="700"')); }
  if (opt.scale !== false && I.spanM > 0) {
    const mPerMm = I.spanM / s, steps = [50, 100, 200, 250, 500, 1000], m = steps.find(v => v / mPerMm > s * 0.16) ?? 1000, w = m / mPerMm, sx = x + 3, sy = y + s + 5;
    o.push(`<rect x="${n2(sx)}" y="${n2(sy)}" width="${n2(w / 2)}" height="1.2" fill="${p.ink}"/><rect x="${n2(sx + w / 2)}" y="${n2(sy)}" width="${n2(w / 2)}" height="1.2" fill="none" stroke="${p.ink}" stroke-width="0.2"/>`,
      t(sx, sy + 4.2, '0', 2, p.mut), t(sx + w, sy + 4.2, `${m} m`, 2, p.mut, ' text-anchor="end"'));
  }
  return o.join('');
}
function legendSvg(p: Pal, L: RepLegend[], x: number, y: number, w: number): { svg: string; h: number } {
  const o: string[] = []; let cy = y;
  for (const g of L) {
    if (g.title) { o.push(...wrap(g.title, w, 2.5).slice(0, 2).map((l, i) => t(x, cy + 2.5 + i * 3.2, l, 2.5, p.ink, ' font-weight="700"'))); cy += 2.5 + Math.min(2, wrap(g.title, w, 2.5).length) * 3.2; }
    for (const [c, s] of g.items) { o.push(`<rect x="${n2(x)}" y="${n2(cy)}" width="5" height="2.4" rx="0.5" fill="${c}"/>`, t(x + 7, cy + 2.3, s, 2.8, p.sub)); cy += 4.4; }
    cy += 2;
  }
  return { svg: o.join(''), h: cy - y };
}
const foot = (p: Pal, I: AlbumInput, W: number, H: number, M: number, right: string, no: string) => `<line x1="${M}" x2="${W - M}" y1="${H - M - 5}" y2="${H - M - 5}" stroke="${p.line}" stroke-width="0.25"/>`
  + t(M, H - M, I.L.org, 2.3, p.ink, ' font-weight="700"') + t(M + 30, H - M, `${I.L.kicker} · ${I.addr}`, 2.3, p.mut)
  + t(W - M - 16, H - M, right, 2.3, p.mut, ' text-anchor="end"') + t(W - M, H - M, no, 2.3, p.ink, ` text-anchor="end" font-family="${MONO}"`);
const normsOk = (l: AlbumLayer) => l.norms.length ? `${l.norms.filter(n => n.ok).length} / ${l.norms.length}` : '—';

/* ============ Qisqa hisobot: A4 (muqova · qisqa xulosa · har qatlam sahifasi) ============ */
export function shortReport(I: AlbumInput): Page[] {
  const W = 210, H = 297, M = 16, p = PAL[I.theme], out: Page[] = [], tot = 2 + I.layers.length, no = (i: number) => String(i).padStart(2, '0');
  // muqova
  {
    const b: string[] = [t(M, M + 4, I.L.org.toUpperCase(), 3, p.ink, ' font-weight="700" letter-spacing="0.5"')];
    b.push(mapBox(I, p, I.overview, M, 40, W - 2 * M, { north: true, scale: true }));
    const y0 = 40 + W - 2 * M + 22;
    b.push(t(M, y0, `${I.L.kicker} · ${I.layers.length} ${I.L.layers} · ${I.radius} m`.toUpperCase(), 2.8, p.mut, ' letter-spacing="0.3"'));
    const tl = wrap(I.addr, W - 2 * M, 11, 0.64).slice(0, 2); tl.forEach((l, i) => b.push(t(M, y0 + 13 + i * 12, l, 11, p.ink, ' font-weight="700" letter-spacing="-0.2"')));
    b.push(t(M, y0 + 16 + tl.length * 12, `${I.city ? I.city + ' · ' : ''}${I.coords} · ${I.date}`, 3, p.mut));
    I.layers.forEach((l, i) => b.push(icon(l.id, M + i * 9, H - M - 14, 6, p.mut, 1.4)));
    out.push({ svg: doc(W, H, p, b.join('')), w: W, h: H, name: I.L.kicker });
  }
  // qisqa xulosa
  {
    const b: string[] = [t(M, M + 6, I.L.summary.toUpperCase(), 3, p.ink, ' font-weight="700" letter-spacing="0.5"')];
    const tl = lines(M, M + 22, [I.addr], 9, 10, p.ink, W - 2 * M, 2, ' font-weight="700"'); b.push(tl.svg);
    const ld = lines(M, M + 26 + tl.h, [I.L.summaryLead], 3.6, 5.2, p.sub, W - 2 * M, 4); b.push(ld.svg);
    let y = M + 40 + tl.h + ld.h;
    const cols = [M, M + 12, M + 70, W - M - 22, W - M];
    b.push(t(cols[1], y, I.L.layer.toUpperCase(), 2.3, p.mut, ' letter-spacing="0.3"'), t(cols[2], y, I.L.value.toUpperCase(), 2.3, p.mut, ' letter-spacing="0.3"'), t(cols[4], y, I.L.normsOk.toUpperCase(), 2.3, p.mut, ' text-anchor="end" letter-spacing="0.3"'));
    y += 3;
    for (const l of I.layers) {
      b.push(`<line x1="${M}" x2="${W - M}" y1="${n2(y)}" y2="${n2(y)}" stroke="${p.line}" stroke-width="0.25"/>`);
      b.push(`<rect x="${M}" y="${n2(y + 3)}" width="8" height="8" rx="2" fill="${l.color}" fill-opacity="0.14"/>`, icon(l.id, M + 1.3, y + 4.3, 5.4, l.color, 1.7));
      b.push(t(cols[1], y + 6.2, l.name, 3.3, p.ink, ' font-weight="700"'), t(cols[1], y + 10.2, l.groupName, 2.4, GROUP_COL[l.group] ?? p.mut));
      const bg = wrap(l.big, cols[3] - cols[2] - 4, 4.2, 0.64).slice(0, 1)[0] ?? ''; b.push(t(cols[2], y + 7, bg, 4.2, p.ink, ' font-weight="700"'));
      const tx = wrap(l.text[0] ?? '', cols[3] - cols[2] - 4, 2.5, 0.52).slice(0, 2); tx.forEach((s, i) => b.push(t(cols[2], y + 11 + i * 3.2, s, 2.5, p.mut)));
      b.push(t(cols[4], y + 7, normsOk(l), 3.4, p.ink, ` text-anchor="end" font-family="${MONO}"`));
      y += 16 + Math.max(0, tx.length - 1) * 3.2;
      if (y > H - M - 30) break;
    }
    b.push(`<line x1="${M}" x2="${W - M}" y1="${n2(y)}" y2="${n2(y)}" stroke="${p.line}" stroke-width="0.25"/>`);
    b.push(lines(M, H - M - 18, [I.L.note], 2.3, 3.2, p.mut, W - 2 * M, 3).svg);
    b.push(foot(p, I, W, H, M, I.L.summary, `${no(2)} / ${no(tot)}`));
    out.push({ svg: doc(W, H, p, b.join('')), w: W, h: H, name: I.L.summary });
  }
  // har qatlam — konsalting sahifasi
  I.layers.forEach((l, i) => {
    const b: string[] = [], gc = GROUP_COL[l.group] ?? p.mut;
    b.push(t(M, M + 6, `${no(i + 1)} · ${l.groupName}`.toUpperCase(), 2.8, gc, ' font-weight="700" letter-spacing="0.5"'), t(W - M, M + 6, I.date, 2.6, p.mut, ' text-anchor="end"'));
    b.push(`<rect x="${M}" y="${M + 12}" width="13" height="13" rx="3.5" fill="${l.color}"/>`, icon(l.id, M + 2.5, M + 14.5, 8, '#ffffff', 1.8));
    const nm = wrap(l.name + (l.beta ? ' · beta' : ''), W - 2 * M - 18, 8, 0.64).slice(0, 2); nm.forEach((s, k) => b.push(t(M + 18, M + 21 + k * 9, s, 8, p.ink, ' font-weight="700"')));
    const y0 = M + 21 + (nm.length - 1) * 9 + 20;
    const big = wrap(l.big, W - 2 * M, 13, 0.64).slice(0, 2); big.forEach((s, k) => b.push(t(M, y0 + k * 14, s, 13, l.color, ' font-weight="700"')));
    let y = y0 + (big.length - 1) * 14 + 9;
    const tx = lines(M, y, l.text, 3.3, 4.8, p.sub, W - 2 * M, 6); b.push(tx.svg); y += tx.h + 4;
    const ms = Math.min(W - 2 * M - 52, H - M - 40 - y); b.push(mapBox(I, p, l.map, M, y, ms, { ov: l.ov, rose: l.rose }));
    const lg = legendSvg(p, l.legend, M + ms + 6, y, W - M - (M + ms + 6)); b.push(lg.svg);
    y += ms + 12;
    if (l.norms.length) {
      b.push(t(M, y, I.L.norm.toUpperCase(), 2.4, p.mut, ' letter-spacing="0.3"')); y += 2;
      for (const n of l.norms.slice(0, 6)) { y += 5; b.push(`<line x1="${M}" x2="${W - M}" y1="${n2(y - 3.6)}" y2="${n2(y - 3.6)}" stroke="${p.line}" stroke-width="0.2"/>`, t(M, y, n.k, 2.8, p.ink), t(W - M - 30, y, n.v, 2.8, n.ok ? '#2b7449' : '#b4620e', ' text-anchor="end" font-weight="700"'), t(W - M, y, n.lim, 2.6, p.mut, ' text-anchor="end"')); if (y > H - M - 16) break; }
      y += 6;
    }
    if (l.src) b.push(lines(M, Math.min(y + 2, H - M - 12), [`${I.L.source}: ${l.src}`], 2.3, 3.1, p.mut, W - 2 * M, 3).svg);
    b.push(foot(p, I, W, H, M, l.name, `${no(i + 3)} / ${no(tot)}`));
    out.push({ svg: doc(W, H, p, b.join('')), w: W, h: H, name: l.name });
  });
  return out;
}

/* ============ Shveytsar toʻri: A3 albom varagʻi, har qatlam ============ */
export function swissSheets(I: AlbumInput): Page[] {
  const W = 420, H = 297, M = 16, p = PAL[I.theme];
  return I.layers.map((l, i) => {
    const b: string[] = [];
    for (let k = 0; k <= 12; k++) b.push(`<line x1="${n2(M + k * (W - 2 * M) / 12)}" x2="${n2(M + k * (W - 2 * M) / 12)}" y1="0" y2="${H}" stroke="${p.line}" stroke-width="0.15" stroke-opacity="0.7"/>`);
    b.push(t(M, M + 3, I.L.kicker.toUpperCase(), 3, p.ink, ' font-weight="700" letter-spacing="0.6"'));
    b.push(t(M - 1.5, M + 52, String(i + 1).padStart(2, '0'), 62, p.ink, ' letter-spacing="-3"'));
    let y = M + 72;
    b.push(`<rect x="${M}" y="${y}" width="17" height="1.6" fill="${l.color}"/>`); y += 13;
    { const nmL = lines(M, y, [l.name], 10, 11.5, p.ink, 118, 3, ' font-weight="700"', 0.64); b.push(nmL.svg); y += nmL.h - 3.5; }
    const tx = lines(M, y + 4, l.text, 3.3, 5, p.sub, 118, 5); b.push(tx.svg); y += tx.h + 18;
    { const bg = wrap(l.big, 118, 12, 0.64).slice(0, 2); bg.forEach((s, k) => b.push(t(M, y + k * 13, s, 12, p.ink, ' font-weight="700"'))); y += 9 + bg.length * 13; }
    const lg = legendSvg(p, l.legend, M, y, 118); if (y + lg.h < H - M - 16) b.push(lg.svg);
    b.push(icon(l.id, M, H - M - 12, 4.5, p.mut, 1.6), t(M + 6.5, H - M - 8.4, l.src.slice(0, 80), 2.3, p.mut));
    const ms = H - 2 * M - 10; b.push(mapBox(I, p, l.map, W - M - ms, M, ms, { ov: l.ov, rose: l.rose }));
    b.push(t(M, H - M + 2, `${I.L.org} · ${I.addr} · ${I.coords}`, 2.3, p.mut), t(W - M, H - M + 2, `${String(i + 1).padStart(2, '0')} / ${String(I.layers.length).padStart(2, '0')}`, 2.4, p.ink, ` text-anchor="end" font-family="${MONO}"`));
    return { svg: doc(W, H, p, b.join('')), w: W, h: H, name: `${String(i + 1).padStart(2, '0')} ${l.name}` };
  });
}

/* ============ Galereya plakati: 50 × 70 sm ============ */
export function galleryPoster(I: AlbumInput, l: AlbumLayer | null): Page {
  const W = 500, H = 700, p = PAL[I.theme], s = 380, x = (W - s) / 2, y = 80, b: string[] = [];
  b.push(mapBox(I, p, l?.map ?? I.overview, x, y, s, { north: false, scale: false, border: false, rose: l?.rose, ov: l?.ov }));
  const city = (I.city || I.addr).toUpperCase(), sp = 9;
  b.push(t(W / 2, y + s + 62, city, 30, p.ink, ` text-anchor="middle" letter-spacing="${sp}"`));
  b.push(`<line x1="${W / 2 - 14}" x2="${W / 2 + 14}" y1="${y + s + 80}" y2="${y + s + 80}" stroke="${p.ink}" stroke-width="0.5"/>`);
  b.push(t(W / 2, y + s + 96, I.addr, 8, p.ink, ' text-anchor="middle"'));
  b.push(t(W / 2, y + s + 108, I.coords, 5, p.mut, ` text-anchor="middle" font-family="${MONO}" letter-spacing="1"`));
  if (l) { const lab = `${l.name.toUpperCase()} · ${I.radius} M`, tw = lab.length * 4.6 * 0.62 + 10; b.push(icon(l.id, W / 2 - tw / 2 - 2, y + s + 126, 7, l.color, 1.7), t(W / 2 + 4, y + s + 131.5, lab, 4.6, l.color, ' text-anchor="middle" letter-spacing="2"')); }
  b.push(t(W / 2, H - 26, I.L.org.toUpperCase(), 4, p.mut, ' text-anchor="middle" letter-spacing="3"'));
  return { svg: doc(W, H, p, b.join('')), w: W, h: H, name: l ? l.name : I.L.kicker };
}
