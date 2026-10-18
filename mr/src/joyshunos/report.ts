/**
 * Joy pasporti hisoboti («Joy-C») — A3 albom varagʻi (420 × 297 mm), SVG birligi — mm.
 * Bir xil varaq: PDF (vektor matn + xarita surati) va Chizmadon (kiruvchi varaq, masshtab 1).
 * Illustrator uchun: har boʻlim nomli qatlam-guruh («01 Xarita» …), matn — matn (egri chiziq emas).
 */
export interface RepNorm { k: string; v: string; lim: string; ok: boolean }
export interface RepCard { id: string; name: string; color: string; chip: string; beta: boolean; big: string; text: string[]; norms: RepNorm[]; src: string }
export interface RepLegend { title: string; items: [string, string][] }
export interface RepInput {
  kicker: string; title: string; meta: string;
  map: { url: string; mPerMm: number; rose?: string | null; ringLabel: string } | null;
  legends: RepLegend[]; cards: RepCard[];
  stamp: { org: string; service: string; placeL: string; place: string; authorL: string; dateL: string; date: string; sheetL: string; srcL: string; sources: string; note: string };
  labels: { north: string; more: string; noMap: string };
}
export const A3: [number, number] = [420, 297];
const FONT = 'Archivo, IBM Plex Sans, Arial, sans-serif', MONO = 'IBM Plex Mono, Menlo, monospace';
const INK = '#1d1d1b', MUTED = '#6b6965', LINE = '#d8d5cf', OK = '#2b7449', WARN = '#b4620e', ACC = '#c0643a';
export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n2 = (v: number) => (Math.round(v * 100) / 100).toString();
/** Matnni kenglikka boʻlish (oʻrtacha belgi kengligi ≈ 0,5 · shrift) */
export function wrap(t: string, w: number, fs: number, k = 0.5): string[] {
  const max = Math.max(4, Math.floor(w / (fs * k))), out: string[] = [];
  let line = '';
  for (const word of t.split(/\s+/).filter(Boolean)) {
    if (!line) line = word; else if ((line + ' ' + word).length <= max) line += ' ' + word; else { out.push(line); line = word; }
    while (line.length > max) { out.push(line.slice(0, max)); line = line.slice(max); }
  }
  if (line) out.push(line);
  return out;
}
const layer = (id: string, label: string, body: string) => `<g id="${id}" data-name="${esc(label)}" inkscape:groupmode="layer" inkscape:label="${esc(label)}">${body}</g>`;

/** Bitta karta: balandligi va SVG (x, y — chap yuqori burchak; w — kenglik) */
export function cardSvg(c: RepCard, x: number, y: number, w: number): { h: number; svg: string } {
  const o: string[] = [], pad = 3; let cy = y + pad + 3.2;
  o.push(`<rect x="${n2(x + pad)}" y="${n2(cy - 2.6)}" width="2.8" height="2.8" rx="0.6" fill="${c.color}"/>`);
  o.push(`<text x="${n2(x + pad + 4.4)}" y="${n2(cy)}" font-size="3.1" font-weight="700" fill="${INK}">${esc(c.name)}</text>`);
  o.push(`<text x="${n2(x + w - pad)}" y="${n2(cy)}" font-size="2.3" text-anchor="end" font-family="${MONO}" fill="${MUTED}">${esc((c.beta ? 'BETA · ' : '') + c.chip)}</text>`);
  cy += 7.4;
  o.push(`<text x="${n2(x + pad)}" y="${n2(cy)}" font-size="6" font-weight="700" fill="${INK}">${esc(c.big)}</text>`);
  cy += 2.2;
  for (const t of c.text) for (const l of wrap(t, w - 2 * pad, 2.5)) { cy += 3.4; o.push(`<text x="${n2(x + pad)}" y="${n2(cy)}" font-size="2.5" fill="${INK}">${esc(l)}</text>`); }
  if (c.norms.length) {
    cy += 1.2;
    for (const r of c.norms) {
      cy += 3.6;
      o.push(`<line x1="${n2(x + pad)}" x2="${n2(x + w - pad)}" y1="${n2(cy - 2.8)}" y2="${n2(cy - 2.8)}" stroke="${LINE}" stroke-width="0.15"/>`);
      o.push(`<text x="${n2(x + pad)}" y="${n2(cy)}" font-size="2.4" fill="${INK}">${esc(r.k)}</text>`);
      o.push(`<text x="${n2(x + w - pad - 15)}" y="${n2(cy)}" font-size="2.4" font-weight="700" text-anchor="end" font-family="${MONO}" fill="${r.ok ? OK : WARN}">${esc(r.v)}</text>`);
      o.push(`<text x="${n2(x + w - pad)}" y="${n2(cy)}" font-size="2.2" text-anchor="end" font-family="${MONO}" fill="${MUTED}">${esc(r.lim)}</text>`);
    }
  }
  if (c.src) { cy += 1; for (const l of wrap(c.src, w - 2 * pad, 2.1)) { cy += 2.9; o.push(`<text x="${n2(x + pad)}" y="${n2(cy)}" font-size="2.1" fill="${MUTED}">${esc(l)}</text>`); } }
  const h = cy - y + pad;
  o.unshift(`<rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" rx="2" fill="#ffffff" stroke="${LINE}" stroke-width="0.25"/>`);
  return { h, svg: `<g data-name="${esc(c.name)}">${o.join('')}</g>` };
}

/** Kartalarni ikki ustunga joylash; sigʻmaganlari — keyingi varaqqa */
export function flowCards(cards: RepCard[], x: number, y: number, w: number, h: number, cols = 2, gap = 4): { svg: string; rest: RepCard[] } {
  const cw = (w - gap * (cols - 1)) / cols, out: string[] = [], rest: RepCard[] = [];
  // ustunlar boʻyi teng boʻlsin: hammasi sigʻsa — umumiy boʻyning 1/cols qismidan oshganda keyingi ustunga
  const hs = cards.map(c => cardSvg(c, 0, 0, cw).h + gap), tot = hs.reduce((a, b) => a + b, 0), lim = tot <= cols * h ? Math.max(...hs, tot / cols) : h;
  let col = 0, cy = y;
  for (const c of cards) {
    if (col >= cols) { rest.push(c); continue; }
    let r = cardSvg(c, x + col * (cw + gap), cy, cw);
    if ((cy + r.h > y + h || (col < cols - 1 && cy - y + r.h > lim + 0.01)) && cy > y) { col++; cy = y; if (col >= cols) { rest.push(c); continue; } r = cardSvg(c, x + col * (cw + gap), cy, cw); }
    out.push(r.svg); cy += r.h + gap;
  }
  return { svg: out.join(''), rest };
}

function scaleBar(x: number, y: number, mPerMm: number): string {
  const nice = [10, 20, 25, 50, 100, 200, 250, 500, 1000], target = 40 * mPerMm, m = nice.reduce((a, b) => Math.abs(b - target) < Math.abs(a - target) ? b : a), L = m / mPerMm;
  return `<g data-name="Masshtab"><rect x="${n2(x - 2)}" y="${n2(y - 5.5)}" width="${n2(L + 14)}" height="8.5" rx="1.2" fill="#ffffff" fill-opacity="0.9"/>`
    + `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(L / 2)}" height="1.1" fill="${INK}"/><rect x="${n2(x + L / 2)}" y="${n2(y)}" width="${n2(L / 2)}" height="1.1" fill="#ffffff" stroke="${INK}" stroke-width="0.2"/>`
    + `<text x="${n2(x)}" y="${n2(y - 1.4)}" font-size="2.2" font-family="${MONO}" fill="${INK}">0</text><text x="${n2(x + L)}" y="${n2(y - 1.4)}" font-size="2.2" text-anchor="middle" font-family="${MONO}" fill="${INK}">${m} m</text></g>`;
}
function north(x: number, y: number, label: string): string {
  return `<g data-name="Shimol"><circle cx="${x}" cy="${y}" r="6" fill="#ffffff" fill-opacity="0.9" stroke="${LINE}" stroke-width="0.25"/><path d="M${x} ${y - 4.4}L${x + 2.2} ${y + 2.6}L${x} ${y + 1.3}L${x - 2.2} ${y + 2.6}Z" fill="${INK}"/><text x="${x}" y="${y + 5.1}" font-size="2" text-anchor="middle" font-weight="700" fill="${INK}">${esc(label)}</text></g>`;
}

/** Varaq(lar): birinchisi — xarita + kartalar + shtamp; sigʻmagan kartalar — davomi varaqlari */
export function passportSheets(I: RepInput, chz = false): string[] {
  const [W, H] = A3, M = 10, head = 30, stampH = 20, mapS = H - M - head - stampH - 6 - 4;   // xarita kvadrati
  const top = M + head, mx = M, colX = mx + mapS + 8, colW = W - M - colX, bodyH = H - M - stampH - 4 - top;
  const pages: string[] = [];
  const header = (pg: number, of: number) => layer('00_Sarlavha', '00 Sarlavha',
    `<text x="${M}" y="${M + 5}" font-size="2.6" font-family="${MONO}" letter-spacing="0.4" fill="${ACC}">${esc(I.kicker.toUpperCase())}</text>`
    + `<text x="${M}" y="${M + 15}" font-size="8.5" font-weight="700" fill="${INK}">${esc(I.title)}</text>`
    + `<text x="${M}" y="${M + 22}" font-size="3" font-family="${MONO}" fill="${MUTED}">${esc(I.meta)}</text>`
    + `<circle cx="${W - M - 46}" cy="${M + 4.2}" r="1.6" fill="${ACC}"/><text x="${W - M}" y="${M + 5}" font-size="3" text-anchor="end" fill="${INK}"><tspan font-weight="700">${esc(I.stamp.org)}</tspan> · ${esc(I.stamp.service)}</text>`
    + (of > 1 ? `<text x="${W - M}" y="${M + 11}" font-size="2.4" text-anchor="end" font-family="${MONO}" fill="${MUTED}">${pg} / ${of}</text>` : '')
    + `<line x1="${M}" x2="${W - M}" y1="${M + head - 4}" y2="${M + head - 4}" stroke="${INK}" stroke-width="0.35"/>`);
  const stamp = (pg: number, of: number) => {
    const y = H - M - stampH, cells: [number, string, string][] = [[70, I.stamp.org, I.stamp.service], [120, I.stamp.placeL, I.stamp.place], [55, I.stamp.authorL, ''], [35, I.stamp.dateL, I.stamp.date], [25, I.stamp.sheetL, `${pg} / ${of}`], [W - 2 * M - 305, I.stamp.srcL, I.stamp.sources]];
    let x = M; const o: string[] = [`<rect x="${M}" y="${y}" width="${W - 2 * M}" height="${stampH}" fill="#ffffff" stroke="${INK}" stroke-width="0.35"/>`];
    for (const [w, k, v] of cells) {
      if (x > M) o.push(`<line x1="${n2(x)}" x2="${n2(x)}" y1="${y}" y2="${y + stampH}" stroke="${INK}" stroke-width="0.2"/>`);
      o.push(`<text x="${n2(x + 2.5)}" y="${y + 4.6}" font-size="2" font-family="${MONO}" fill="${MUTED}">${esc(k.toUpperCase())}</text>`);
      wrap(v, w - 5, 2.5).slice(0, 4).forEach((l, i) => o.push(`<text x="${n2(x + 2.5)}" y="${n2(y + 9 + i * 3.2)}" font-size="2.5"${i === 0 && w < 80 ? ' font-weight="700"' : ''} fill="${INK}">${esc(l)}</text>`));
      if (!v && k === I.stamp.authorL) o.push(`<line x1="${n2(x + 2.5)}" x2="${n2(x + w - 3)}" y1="${y + 14}" y2="${y + 14}" stroke="${LINE}" stroke-width="0.25"/>`);
      x += w;
    }
    o.push(`<text x="${W - M}" y="${H - M + 4}" font-size="2" text-anchor="end" fill="${MUTED}">${esc(I.stamp.note)}</text>`);
    return layer('09_Shtamp', '09 Shtamp', o.join(''));
  };
  // 1-varaq: xarita
  const mapO: string[] = [];
  if (I.map) {
    const m = I.map, c = mx + mapS / 2, cy = top + mapS / 2;
    mapO.push(`<defs><clipPath id="joyMapClip"><rect x="${mx}" y="${top}" width="${mapS}" height="${mapS}" rx="2"/></clipPath></defs>`);
    mapO.push(`<image x="${mx}" y="${top}" width="${mapS}" height="${mapS}" preserveAspectRatio="xMidYMid slice" href="${m.url}" xlink:href="${m.url}" clip-path="url(#joyMapClip)"/>`);
    if (m.rose) mapO.push(`<g data-name="Shamol guli" transform="translate(${n2(c - 18)} ${n2(cy - 18)}) scale(0.2)">${m.rose}</g>`);
    mapO.push(`<text x="${n2(mx + mapS - 3)}" y="${n2(top + mapS - 4)}" font-size="2.4" text-anchor="end" font-family="${MONO}" fill="${ACC}" stroke="#ffffff" stroke-width="0.6" paint-order="stroke">${esc(m.ringLabel)}</text>`);
    mapO.push(north(mx + mapS - 9, top + 9, I.labels.north), scaleBar(mx + mapS - 64, top + mapS - 12, m.mPerMm));
  } else mapO.push(`<rect x="${mx}" y="${top}" width="${mapS}" height="${mapS}" rx="2" fill="#f3f1ec"/><text x="${mx + mapS / 2}" y="${top + mapS / 2}" font-size="3" text-anchor="middle" fill="${MUTED}">${esc(I.labels.noMap)}</text>`);
  mapO.push(`<rect x="${mx}" y="${top}" width="${mapS}" height="${mapS}" rx="2" fill="none" stroke="${INK}" stroke-width="0.3"/>`);
  // legenda — xarita ichida, chap pastda
  const lg: string[] = []; let ly = 0; const lw = 92;
  for (const L of I.legends) {
    if (L.title) { ly += 4.2; lg.push(`<text x="3" y="${n2(ly)}" font-size="2.3" font-weight="700" fill="${INK}">${esc(L.title)}</text>`); }
    let lx = 3; ly += L.title ? 3.6 : 4.4;
    for (const [col, t] of L.items) { const tw = 4.2 + t.length * 1.1 + 3; if (lx + tw > lw - 2) { lx = 3; ly += 3.4; } lg.push(`<rect x="${n2(lx)}" y="${n2(ly - 2.2)}" width="2.6" height="2.6" rx="0.5" fill="${col}"/><text x="${n2(lx + 3.6)}" y="${n2(ly)}" font-size="2.2" fill="${INK}">${esc(t)}</text>`); lx += tw; }
  }
  const legend = lg.length ? `<g data-name="Shartli belgilar" transform="translate(${mx + 4} ${n2(top + mapS - 4 - ly - 3)})"><rect width="${lw}" height="${n2(ly + 3)}" rx="1.5" fill="#ffffff" fill-opacity="0.94" stroke="${LINE}" stroke-width="0.2"/>${lg.join('')}</g>` : '';
  const f1 = flowCards(I.cards, colX, top, colW, bodyH);
  // davomi: toʻliq kenglikda 4 ustun
  const more: string[] = []; let rest = f1.rest;
  while (rest.length && more.length < 4) { const f = flowCards(rest, M, top, W - 2 * M, bodyH, 4); if (f.rest.length === rest.length) break; more.push(f.svg); rest = f.rest; }
  const of = 1 + more.length;
  // Chizmadon uchun: shtamp va oq fon yoʻq (Chizmadon varagʻining oʻz shtampi bor), pastki qismi kesiladi
  const VH = chz ? H - M - stampH - 2 : H;
  const wrapSvg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${W}mm" height="${VH}mm" viewBox="0 0 ${W} ${VH}" font-family="${FONT}">${chz ? '' : `<rect width="${W}" height="${H}" fill="#ffffff"/>`}${body}</svg>`;
  const st = (pg: number, of: number) => chz ? '' : stamp(pg, of);
  pages.push(wrapSvg(header(1, of) + layer('01_Xarita', '01 Xarita', mapO.join('')) + layer('02_Shartli_belgilar', '02 Shartli belgilar', legend) + layer('03_Pasport', '03 Pasport', f1.svg + (more.length ? `<text x="${W - M}" y="${n2(H - M - stampH - 1.5)}" font-size="2.2" text-anchor="end" fill="${MUTED}">${esc(I.labels.more)}</text>` : '')) + st(1, of)));
  more.forEach((s, i) => pages.push(wrapSvg(header(i + 2, of) + layer('03_Pasport', '03 Pasport', s) + st(i + 2, of))));
  return pages;
}
