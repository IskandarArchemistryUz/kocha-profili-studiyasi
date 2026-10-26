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
  lines?: { pts: XY[]; multi?: XY[][]; w: number; col: string; op?: number; dash?: string; cap?: string }[];
  dots?: { x: number; y: number; r: number; col: string; op?: number; halo?: number }[];
  labels?: { x: number; y: number; t: string; col: string }[];
  rose?: string | null;
  /** fonni yanada xiralashtirish (rangli rastr qatlamlar uchun) */
  quiet?: boolean;
}
export interface MapTheme { dark: boolean; frame: 'doira' | 'kvadrat' }

const n2 = (v: number) => (Math.round(v * 100) / 100).toString();
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
let uid = 0;

export function mapSvg(B: MapBase, O: Overlay, T: MapTheme, x: number, y: number, s: number): string {
  const k = s / B.span, cx = x + s / 2, cy = y + s / 2, X = (p: XY) => n2(cx + p[0] * k), Y = (p: XY) => n2(cy - p[1] * k);
  const path = (pts: XY[], close: boolean) => pts.length ? `M${pts.map(p => `${X(p)} ${Y(p)}`).join('L')}${close ? 'Z' : ''}` : '';
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
  o.push(`<path d="${B.bld.map(r => path(r, true)).join('')}" fill="${C.bld}" stroke="${C.bldS}" stroke-width="0.08"/>`);
  // rastrlar
  for (const r of O.rasters ?? []) {
    const rid = r.circle ? `mr${++uid}` : '';
    if (rid) o.push(`<clipPath id="${rid}"><circle cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(r.circle! * k)}"/></clipPath>`);
    o.push(`<image x="${n2(cx + r.x0 * k)}" y="${n2(cy - r.y1 * k)}" width="${n2((r.x1 - r.x0) * k)}" height="${n2((r.y1 - r.y0) * k)}" preserveAspectRatio="none" opacity="${r.op ?? 1}" href="${r.url}" xlink:href="${r.url}"${rid ? ` clip-path="url(#${rid})"` : ''}/>`);
  }
  if (O.rasters?.length) o.push(`<path d="${B.bld.map(r => path(r, true)).join('')}" fill="none" stroke="${T.dark ? '#000000' : '#ffffff'}" stroke-opacity="0.5" stroke-width="0.1"/>`);
  for (const l of O.lines ?? []) o.push(`<path d="${l.multi ? l.multi.map(m => path(m, false)).join('') : path(l.pts, false)}" fill="none" stroke="${l.col}" stroke-width="${n2(l.w)}" stroke-opacity="${l.op ?? 1}" stroke-linecap="${l.cap ?? 'round'}" stroke-linejoin="round"${l.dash ? ` stroke-dasharray="${l.dash}"` : ''}/>`);
  for (const d of O.dots ?? []) {
    if (d.halo) o.push(`<circle cx="${X([d.x, d.y])}" cy="${Y([d.x, d.y])}" r="${n2(d.halo * k)}" fill="${d.col}" fill-opacity="0.12"/>`);
    o.push(`<circle cx="${X([d.x, d.y])}" cy="${Y([d.x, d.y])}" r="${n2(d.r)}" fill="${d.col}" fill-opacity="${d.op ?? 1}" stroke="${C.bg}" stroke-width="${n2(d.r * 0.35)}"/>`);
  }
  // radius halqasi, uchastka, markaz
  o.push(`<circle cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(B.R * k)}" fill="none" stroke="${C.ring}" stroke-width="0.3" stroke-dasharray="1.6 1.2"/>`);
  if (B.site && B.site.length > 2) o.push(`<path d="${path(B.site, true)}" fill="${C.siteF}" fill-opacity="0.85" stroke="${C.site}" stroke-width="0.7" stroke-linejoin="round"/>`);
  if (O.rose) { const kk = s * 0.3 / 180; o.push(`<g transform="translate(${n2(cx - 90 * kk)} ${n2(cy - 90 * kk)}) scale(${n2(kk)})">${O.rose}</g>`); }
  o.push(`<circle cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(Math.max(1, s * 0.006))}" fill="#c0643a" stroke="${C.bg}" stroke-width="0.5"/>`);
  for (const l of O.labels ?? []) { const lx = cx + l.x * k, ly = cy - l.y * k, w = l.t.length * 1.25 + 3; o.push(`<rect x="${n2(lx + 2)}" y="${n2(ly - 2.4)}" width="${n2(w)}" height="4" rx="1" fill="${C.bg}" fill-opacity="0.92"/>`, `<text x="${n2(lx + 3.5)}" y="${n2(ly + 0.6)}" font-size="2.4" font-weight="700" fill="${l.col}">${esc(l.t)}</text>`); }
  o.push('</g>');
  o.push(shape.replace('/>', ` fill="none" stroke="${C.ink}" stroke-width="0.3"/>`));
  return o.join('');
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
