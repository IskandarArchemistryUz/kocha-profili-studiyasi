/**
 * Albom xaritasi (26.10, 2-tahrir): ekran surati emas — OSM maʼlumotidan vektor SVG.
 * Fon (binolar, koʻchalar, yashil, suv) — ochiq «maket» uslubida; ustida faqat bitta tahlil qatlami toʻliq rangda.
 * Mahalliy koordinatalar: x — sharq, y — shimol, metr (markaz — tahlil nuqtasi).
 */
export type XY = [number, number];
export interface MapBase { bld: XY[][]; roads: { pts: XY[]; w: number; major: boolean }[]; water: XY[][]; green: XY[][]; site: XY[] | null; R: number; span: number }
export interface Raster { url: string; x0: number; y0: number; x1: number; y1: number; op?: number; circle?: number }
export interface Overlay {
  rasters?: Raster[];
  /** toʻldirilgan koʻpburchaklar (bino, izovist, katak) — mahalliy metr */
  polys?: { rings: XY[][]; fill: string; op?: number; stroke?: string; sw?: number }[];
  /** w — mm; halo — chiziq ostida oq/qora yoʻlak (mm) */
  lines?: { pts: XY[]; multi?: XY[][]; w: number; col: string; op?: number; dash?: string; cap?: string; halo?: number }[];
  dots?: { x: number; y: number; r: number; col: string; op?: number; halo?: number }[];
  labels?: { x: number; y: number; t: string; col: string }[];
  /** katta yoʻnalish strelkasi (shamol): egri chiziq + uchi */
  arrows?: { pts: XY[]; col: string; w: number }[];
  /** shamol guli — xarita kvadratining pastki oʻng burchagida (uchastkani yopmaydi) */
  rose?: string | null;
  /** fonni yanada xiralashtirish (rangli rastr qatlamlar uchun) */
  quiet?: boolean;
  /** binolar tahlil ustidan chiziladi (quyosh, shamol): bino va ochiq joy aniq ajraladi */
  bldTop?: boolean;
  /** 16.11 (egasi, issiqlik): bino konturi tahlil ustidan — ingichka chiziq, yengil oq fon (rang yopilmaydi) */
  bldLine?: boolean;
  /** tahlil doirasi boʻyicha kesilmasin (faqat yozuvlar uchun emas — butun qatlam) */
  noClip?: boolean;
}
export interface MapTheme { dark: boolean; frame: 'doira' | 'kvadrat' }

const n2 = (v: number) => (Math.round(v * 100) / 100).toString();
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
let uid = 0;

export function mapSvg(B: MapBase, O: Overlay, T: MapTheme, x: number, y: number, s: number): string {
  const k = s / B.span, cx = x + s / 2, cy = y + s / 2, X = (p: XY) => n2(cx + p[0] * k), Y = (p: XY) => n2(cy - p[1] * k);
  // 16.11 (egasi: PDF juda katta): nisbiy buyruqlar, 0,1 mm aniqlik — fayl hajmi ~2 marta kichik, chop etishda farq yoʻq
  const r1 = (v: number) => Math.round(v * 10), f1 = (v: number) => { const s = (v / 10).toString(); return s.startsWith('0.') ? s.slice(1) : s.startsWith('-0.') ? `-${s.slice(2)}` : s; };
  const path = (pts: XY[], close: boolean) => {
    if (!pts.length) return '';
    let px = r1(cx + pts[0][0] * k), py = r1(cy - pts[0][1] * k), out = `M${f1(px)} ${f1(py)}`, seg = '';
    for (let i = 1; i < pts.length; i++) { const qx = r1(cx + pts[i][0] * k), qy = r1(cy - pts[i][1] * k), dx = qx - px, dy = qy - py; if (!dx && !dy) continue; seg += `${f1(dx)}${dy < 0 ? '' : ' '}${f1(dy)} `; px = qx; py = qy; }
    return `${out}${seg ? `l${seg.trim()}` : ''}${close ? 'Z' : ''}`;
  };
  const id = `mp${++uid}`, circ = T.frame === 'doira';
  const shape = circ ? `<circle cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(s / 2)}"/>` : `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(s)}" height="${n2(s)}"/>`;
  const C = T.dark
    ? { bg: '#111215', green: '#17211a', water: '#13232e', road: '#1d1f23', roadM: '#24272c', bld: O.quiet ? '#1f2125' : '#2a2d32', bldS: '#3a3d43', ring: '#6a6d73', ink: '#f2f0eb', site: '#e0462a', siteF: '#2f5a28' }
    : { bg: '#ffffff', green: '#e3ead9', water: '#d6e5ee', road: '#ffffff', roadM: '#ffffff', bld: O.quiet ? '#e4e1db' : '#dcd8d0', bldS: '#c2bcb1', ring: '#8d8a84', ink: '#16171a', site: '#e0462a', siteF: '#a9d98f' };
  const o: string[] = [`<defs><clipPath id="${id}">${shape}</clipPath></defs>`, `<g clip-path="url(#${id})">`];
  o.push(circ ? shape.replace('/>', ` fill="${T.dark ? '#16171a' : '#eeece7'}"/>`) : `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(s)}" height="${n2(s)}" fill="${T.dark ? '#16171a' : '#eeece7'}"/>`);
  // fon: koʻcha boʻshligʻi och kulrang, yoʻllar oq lenta
  o.push(`<path d="${B.green.map(r => path(r, true)).join('')}" fill="${C.green}"/>`);
  o.push(`<path d="${B.water.map(r => path(r, true)).join('')}" fill="${C.water}"/>`);
  for (const major of [false, true]) {
    const rs = B.roads.filter(r => r.major === major); if (!rs.length) continue;
    const byW = new Map<number, string[]>(); for (const r of rs) { const w = Math.max(0.25, Math.min(3, r.w * k)); const kk = Math.round(w * 10) / 10; (byW.get(kk) ?? byW.set(kk, []).get(kk)!).push(path(r.pts, false)); }
    for (const [w, ds] of byW) o.push(`<path d="${ds.join('')}" fill="none" stroke="${major ? C.roadM : C.road}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`);
  }
  const bldD = B.bld.map(r => path(r, true)).join('');
  if (!O.bldTop) o.push(`<path d="${bldD}" fill="${C.bld}" stroke="${C.bldS}" stroke-width="0.08"/>`);
  // 16.11 (egasi): tahlil grafikasi faqat tahlil doirasi ichida — chetiga aniq yetadi, tashqariga chiqmaydi
  const rc = `rc${++uid}`;
  if (!O.noClip) o.push(`<clipPath id="${rc}"><circle cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(B.R * k)}"/></clipPath><g clip-path="url(#${rc})">`); else o.push('<g>');
  // rastrlar
  for (const r of O.rasters ?? []) {
    const rid = r.circle ? `mr${++uid}` : '';
    if (rid) o.push(`<clipPath id="${rid}"><circle cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(r.circle! * k)}"/></clipPath>`);
    o.push(`<image x="${n2(cx + r.x0 * k)}" y="${n2(cy - r.y1 * k)}" width="${n2((r.x1 - r.x0) * k)}" height="${n2((r.y1 - r.y0) * k)}" preserveAspectRatio="none" opacity="${r.op ?? 1}" xlink:href="${r.url}"${rid ? ` clip-path="url(#${rid})"` : ''}/>`);
  }
  if (O.rasters?.length && !O.bldTop && !O.bldLine) o.push(`<path d="${bldD}" fill="none" stroke="${T.dark ? '#000000' : '#ffffff'}" stroke-opacity="0.5" stroke-width="0.1"/>`);
  for (const p of O.polys ?? []) o.push(`<path d="${p.rings.map(r => path(r, true)).join('')}" fill="${p.fill}" fill-opacity="${p.op ?? 1}" fill-rule="evenodd"${p.stroke ? ` stroke="${p.stroke}" stroke-width="${n2(p.sw ?? 0.1)}" stroke-linejoin="round"` : ''}/>`);
  for (const l of O.lines ?? []) {
    const d = l.multi ? l.multi.map(m => path(m, false)).join('') : path(l.pts, false); if (!d) continue;
    if (l.halo) o.push(`<path d="${d}" fill="none" stroke="${C.bg}" stroke-width="${n2(l.w + 2 * l.halo)}" stroke-opacity="0.9" stroke-linecap="round" stroke-linejoin="round"/>`);
    o.push(`<path d="${d}" fill="none" stroke="${l.col}" stroke-width="${n2(l.w)}" stroke-opacity="${l.op ?? 1}" stroke-linecap="${l.cap ?? 'round'}" stroke-linejoin="round"${l.dash ? ` stroke-dasharray="${l.dash}"` : ''}/>`);
  }
  if (O.bldTop) o.push(`<path d="${bldD}" fill="${T.dark ? '#3a3d43' : '#c9c6bf'}" stroke="${T.dark ? '#111215' : '#ffffff'}" stroke-width="0.12"/>`);
  else if (O.bldLine) o.push(`<path d="${bldD}" fill="${T.dark ? '#000000' : '#ffffff'}" fill-opacity="0.22" stroke="${T.dark ? '#e8e6e1' : '#2a2a2c'}" stroke-opacity="0.75" stroke-width="0.13" stroke-linejoin="round"/>`);
  for (const d of O.dots ?? []) {
    if (d.halo) o.push(`<circle cx="${X([d.x, d.y])}" cy="${Y([d.x, d.y])}" r="${n2(d.halo * k)}" fill="${d.col}" fill-opacity="0.12"/>`);
    o.push(`<circle cx="${X([d.x, d.y])}" cy="${Y([d.x, d.y])}" r="${n2(d.r)}" fill="${d.col}" fill-opacity="${d.op ?? 1}" stroke="${C.bg}" stroke-width="${n2(d.r * 0.35)}"/>`);
  }
  for (const a of O.arrows ?? []) o.push(arrowSvg(a.pts.map(p => [cx + p[0] * k, cy - p[1] * k] as XY), a.col, a.w, C.bg));
  o.push('</g>');
  // masofa halqalari (16.11, egasi): ingichka, yozuvli — doira kattaligiga qarab 100 m … 2 km
  o.push(ringsSvg(B.R, k, cx, cy, C));
  if (B.site && B.site.length > 2) o.push(`<path d="${path(B.site, true)}" fill="${C.siteF}" fill-opacity="${O.bldTop ? 0.35 : 0.85}" stroke="${C.site}" stroke-width="0.7" stroke-linejoin="round"/>`);
  // markaz nuqtasi — faqat uchastka chizilmagan boʻlsa (16.11, egasi: uchastka bor boʻlsa nuqta ortiqcha)
  if (!(B.site && B.site.length > 2)) o.push(`<circle cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(Math.max(1, s * 0.006))}" fill="#c0643a" stroke="${C.bg}" stroke-width="0.5"/>`);
  const placed: [number, number, number][] = [];
  for (const l of O.labels ?? []) { const lx = cx + l.x * k, w = l.t.length * 1.25 + 3; let ly = cy - l.y * k;
    for (let g = 0; g < 8 && placed.some(([px, py, pw]) => lx + 2 < px + pw && px < lx + 2 + w && Math.abs(py - ly) < 4.4); g++) ly += 4.6;   // yozuvlar bir-birini bosmasin
    placed.push([lx + 2, ly, w]); o.push(`<rect x="${n2(lx + 2)}" y="${n2(ly - 2.4)}" width="${n2(w)}" height="4" rx="1" fill="${C.bg}" fill-opacity="0.92"/>`, `<text x="${n2(lx + 3.5)}" y="${n2(ly + 0.6)}" font-size="2.4" font-weight="700" fill="${l.col}">${esc(l.t)}</text>`); }
  o.push('</g>');
  o.push(shape.replace('/>', ` fill="none" stroke="${C.ink}" stroke-width="0.3"/>`));
  // shamol guli — kvadratning pastki oʻng burchagida, doiradan tashqarida
  if (O.rose) { const sz = s * 0.17, kk = sz / 180; o.push(`<g transform="translate(${n2(x + s - sz)} ${n2(y + s - sz)}) scale(${n2(kk)})">${O.rose}</g>`); }
  return o.join('');
}
/** Masofa halqalari: qadam doira radiusiga qarab (2–4 halqa), yozuv — halqaning shimoli-sharqiy nuqtasida */
export function ringSteps(R: number): number[] {
  const step = [100, 250, 500, 1000, 2000, 5000].find(v => R / v <= 4) ?? 5000, out: number[] = [];
  for (let d = step; d < R - step * 0.35; d += step) out.push(d);
  return [...out, R];
}
const dist = (m: number) => (m >= 1000 ? `${(m / 1000).toString().replace('.', ',')} km` : `${Math.round(m)} m`);
function ringsSvg(R: number, k: number, cx: number, cy: number, C: { ring: string; ink: string; bg: string }): string {
  const o: string[] = [], a = -Math.PI / 4;
  for (const d of ringSteps(R)) {
    const r = d * k, last = d === R;
    o.push(`<circle cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(r)}" fill="none" stroke="${C.ring}" stroke-width="${last ? 0.3 : 0.15}" stroke-opacity="${last ? 1 : 0.7}" stroke-dasharray="${last ? '1.6 1.2' : '0.6 0.9'}"/>`);
    const lx = cx + r * Math.cos(a), ly = cy + r * Math.sin(a), t = dist(d);
    o.push(`<text x="${n2(lx + 0.8)}" y="${n2(ly - 0.6)}" font-size="1.9" fill="${C.ink}" fill-opacity="0.75" stroke="${C.bg}" stroke-width="0.6" stroke-opacity="0.9" paint-order="stroke" letter-spacing="0.1">${t}</text>`);
  }
  return o.join('');
}
/** Silliq egri strelka: tana — chiziq, uchi — toʻldirilgan uchburchak */
function arrowSvg(P: XY[], col: string, w: number, bg: string): string {
  if (P.length < 2) return '';
  const d = `M${P.map(p => `${n2(p[0])} ${n2(p[1])}`).join('L')}`, a = P[P.length - 2], b = P[P.length - 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, h = w * 4.2, hw = w * 2.6;
  const tip: XY = [b[0] + ux * h * 0.6, b[1] + uy * h * 0.6], l: XY = [b[0] - uy * hw, b[1] + ux * hw], r: XY = [b[0] + uy * hw, b[1] - ux * hw];
  return `<path d="${d}" fill="none" stroke="${bg}" stroke-width="${n2(w * 2.4)}" stroke-opacity="0.85" stroke-linecap="round" stroke-linejoin="round"/>`
    + `<path d="${d}" fill="none" stroke="${col}" stroke-width="${n2(w)}" stroke-linecap="round" stroke-linejoin="round"/>`
    + `<path d="M${n2(tip[0])} ${n2(tip[1])}L${n2(l[0])} ${n2(l[1])}L${n2(r[0])} ${n2(r[1])}Z" fill="${col}" stroke="${bg}" stroke-width="${n2(w * 0.5)}" stroke-linejoin="round"/>`;
}

/** Marching squares: n×n toʻr (qator — janubdan shimolga), qadam step, markaz (0,0) → izochiziqlar (mahalliy metr) */
export function contours(h: Float32Array, n: number, step: number, levels: number[]): { lv: number; segs: [XY, XY][] }[] {
  const R = (n - 1) / 2 * step, P = (i: number, j: number): XY => [-R + i * step, -R + j * step];
  return levels.map(lv => {
    const segs: [XY, XY][] = [];
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
      const v = [h[j * n + i], h[j * n + i + 1], h[(j + 1) * n + i + 1], h[(j + 1) * n + i]];
      if (v.some(Number.isNaN)) continue;
      const c = [P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)], e: XY[] = [];
      for (let a = 0; a < 4; a++) { const b = (a + 1) % 4; if ((v[a] - lv) * (v[b] - lv) < 0) { const t = (lv - v[a]) / (v[b] - v[a]); e.push([c[a][0] + (c[b][0] - c[a][0]) * t, c[a][1] + (c[b][1] - c[a][1]) * t]); } }
      if (e.length >= 2) segs.push([e[0], e[1]]); if (e.length === 4) segs.push([e[2], e[3]]);
    }
    return { lv, segs };
  });
}
