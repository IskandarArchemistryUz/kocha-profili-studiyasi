/**
 * Varaq tekshiruvi — 7 band (eski Albomdan, inventar 3-boʻlim; maket CH-C): har band — holat, izoh va
 * «Tuzatish» (ixtiyoriy). Ranglar elementlarning stroke/fill qiymatlaridan olinadi; kulrang — nisbiy yorqinlik (WCAG).
 */
import { type ChEl, type ChPage, bbox, pageSize } from './model';
import { legendItems } from './render';
import { paletteById } from './catalog';

export interface CheckItem { id: number; title: string; ok: boolean; note: string; fix?: string }

const hexRgb = (c: string): [number, number, number] | null => {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c.trim()); if (!m) return null;
  const h = m[1].length === 3 ? m[1].split('').map(x => x + x).join('') : m[1];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
export const lum = (c: string) => { const r = hexRgb(c); if (!r) return 0.5; const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r[0]) + 0.7152 * f(r[1]) + 0.0722 * f(r[2]); };
export function hsl(c: string): [number, number, number] {
  const r = hexRgb(c); if (!r) return [0, 0, 0.5];
  const [R, G, B] = r.map(v => v / 255), mx = Math.max(R, G, B), mn = Math.min(R, G, B), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let hh = mx === R ? ((G - B) / d) % 6 : mx === G ? (B - R) / d + 2 : (R - G) / d + 4; hh *= 60; if (hh < 0) hh += 360;
  return [hh, s, l];
}
/** «rangli» ton: toʻyinganlik ≥ 0,18 (kulrang, qora, oq hisobga olinmaydi) */
export const chromatic = (c: string) => { const [, s, l] = hsl(c); return s >= 0.18 && l > 0.08 && l < 0.96; };
export const isRed = (c: string) => { const [hh, s, l] = hsl(c); return s > 0.45 && l > 0.25 && l < 0.65 && (hh < 12 || hh > 350); };
/** rang farqi (taxminiy ΔE, RGB vaznli) */
export function dist(a: string, b: string): number {
  const x = hexRgb(a), y = hexRgb(b); if (!x || !y) return 999;
  const rm = (x[0] + y[0]) / 2, dr = x[0] - y[0], dg = x[1] - y[1], db = x[2] - y[2];
  return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db) / 3;
}
const colorsOf = (e: ChEl) => [e.style.fill, e.style.stroke].filter((c): c is string => !!c && c !== 'none' && !!hexRgb(c));
const areaOf = (e: ChEl) => { const b = bbox(e); const a = (b[2] - b[0]) * (b[3] - b[1]); return e.t === 'ellipse' ? a * Math.PI / 4 : e.t === 'zone' || e.t === 'poly' ? a * 0.7 : a; };
/** tahlil elementlari (asos emas): yoʻnalish oʻqi, zona, belgi, nomlangan shakl */
const analysis = (e: ChEl) => e.t === 'flow' || e.t === 'zone' || e.t === 'icon' || (!!e.name && e.t !== 'text' && e.t !== 'legend');

export function pageChecks(page: ChPage, tr: (s: string) => string = s => s): CheckItem[] {
  const vis = new Set(page.layers.filter(l => l.visible).map(l => l.id)), els = page.els.filter(e => vis.has(e.layer));
  const tones = [...new Set(els.flatMap(colorsOf).filter(chromatic).map(c => c.toLowerCase()))];
  const [W, H] = pageSize(page), A = W * H;
  const satArea = els.filter(e => (e.t === 'rect' || e.t === 'ellipse' || e.t === 'poly' || e.t === 'zone') && e.style.fill && chromatic(e.style.fill) && (e.style.opacity ?? 1) > 0.6).reduce((s, e) => s + areaOf(e), 0);
  const cats = [...new Set(els.filter(analysis).map(e => (e.t === 'zone' ? e.style.fill : e.style.stroke ?? e.style.fill) ?? '').filter(c => c && chromatic(c)).map(c => c.toLowerCase()))];
  let minD = Infinity, minL = Infinity;
  for (let i = 0; i < cats.length; i++) for (let j = i + 1; j < cats.length; j++) { minD = Math.min(minD, dist(cats[i], cats[j])); minL = Math.min(minL, Math.abs(lum(cats[i]) - lum(cats[j]))); }
  const legend = els.find(e => e.t === 'legend'), legCols = new Set(legendItems(page).map(i => i.color.toLowerCase()));
  const unlisted = cats.filter(c => !legCols.has(c));
  const reds = els.filter(e => colorsOf(e).some(isRed) && !e.style.risk && !(e.icon && /issiqlik|suvbosish|ogoh/.test(e.icon)));
  const emph = els.filter(e => (e.t === 'flow' && (e.style.width ?? 0) >= 6) || (e.t === 'text' && (e.style.size ?? 0) >= 36));
  const P = (t: string) => tr(t);
  return [
    { id: 1, title: P('Rangli tonlar ≤ 7'), ok: tones.length <= 7, note: `${tones.length} ${P('ton')}`, fix: tones.length > 7 ? P('Palitraga keltirish') : undefined },
    { id: 2, title: P('Asos tahlildan jimroq'), ok: satArea / A <= 0.6, note: `${P('toʻyingan maydon')} ${Math.round(satArea / A * 100)} % (≤ 60 %)`, fix: satArea / A > 0.6 ? P('Fonni ochroq qilish') : undefined },
    { id: 3, title: P('Toifalar bir-biridan ajraladi'), ok: cats.length < 2 || minD >= 18, note: cats.length < 2 ? P('toifa kam') : `${P('eng yaqin farq')} ${Math.round(minD)}`, fix: cats.length >= 2 && minD < 18 ? P('Palitrani ketma-ket berish') : undefined },
    { id: 4, title: P('Legenda sahifadagi ranglarga mos'), ok: !!legend ? unlisted.length === 0 : cats.length === 0, note: !legend ? (cats.length ? P('shartli belgilar yoʻq') : P('tahlil elementi yoʻq')) : unlisted.length ? `${unlisted.length} ${P('rang legendada yoʻq — elementga nom bering')}` : P('mos'), fix: !legend && cats.length ? P('Shartli belgilar qoʻshish') : undefined },
    { id: 5, title: P('Kulrang rejimda oʻqiladi'), ok: cats.length < 2 || minL >= 0.04, note: cats.length < 2 ? P('toifa kam') : `${P('yorqinlik farqi')} ${minL.toFixed(2)} (≥ 0,04)`, fix: cats.length >= 2 && minL < 0.04 ? P('Ketma-ket palitra') : undefined },
    { id: 6, title: P('Qizil faqat haqiqiy xavf uchun'), ok: reds.length === 0, note: reds.length ? `${reds.length} ${P('ta elementda qizil')}` : P('mos'), fix: reds.length ? P('Qizilni almashtirish') : undefined },
    { id: 7, title: P('Bitta asosiy urgʻu'), ok: emph.length <= 1, note: `${emph.length} ${P('ta kuchli urgʻu')}`, fix: emph.length > 1 ? P('Ikkinchisini pasaytirish') : undefined },
  ];
}

/** Tuzatish: varaqning yangi nusxasini qaytaradi (bekor qilish tarixi UI da) */
export function applyFix(page: ChPage, id: number, paletteId: string): ChPage {
  const p: ChPage = JSON.parse(JSON.stringify(page)), pal = paletteById(paletteId).colors.filter(c => !['#ffffff', '#141414'].includes(c));
  const nearest = (c: string) => pal.reduce((b, x) => (dist(x, c) < dist(b, c) ? x : b), pal[0]);
  const vis = new Set(p.layers.filter(l => l.visible).map(l => l.id));
  const tgt = p.els.filter(e => vis.has(e.layer));
  if (id === 1) tgt.forEach(e => { for (const k of ['fill', 'stroke'] as const) { const c = e.style[k]; if (c && chromatic(c)) e.style[k] = nearest(c); } });
  if (id === 2) tgt.forEach(e => { if ((e.t === 'rect' || e.t === 'ellipse' || e.t === 'poly' || e.t === 'zone') && e.style.fill && chromatic(e.style.fill)) e.style.opacity = Math.min(e.style.opacity ?? 1, 0.45); });
  if (id === 3 || id === 5) {
    const seq = id === 5 ? paletteById('kok').colors.slice(1) : pal;
    const cats = [...new Set(tgt.filter(analysis).map(e => ((e.t === 'zone' ? e.style.fill : e.style.stroke ?? e.style.fill) ?? '').toLowerCase()).filter(c => c && chromatic(c)))];
    const map = new Map(cats.map((c, i) => [c, seq[i % seq.length]]));
    tgt.filter(analysis).forEach(e => { const k = e.t === 'zone' ? 'fill' : e.style.stroke ? 'stroke' : 'fill'; const c = (e.style[k] ?? '').toLowerCase(); if (map.has(c)) e.style[k] = map.get(c)!; });
  }
  if (id === 4) {
    const [W] = pageSize(p);
    const L = p.layers[p.layers.length - 1];
    p.els.push({ id: `lg${Date.now().toString(36)}`, t: 'legend', layer: L.id, x: W - 80, y: 30, w: 64, h: 40, text: 'Shartli belgilar', style: { size: 9 } });
    tgt.forEach(e => { if (analysis(e) && !e.name) e.name = e.preset ? e.preset : e.t === 'zone' ? 'Zona' : e.t === 'flow' ? 'Yoʻnalish' : e.t === 'icon' ? 'Belgi' : 'Element'; });
  }
  if (id === 6) tgt.forEach(e => { for (const k of ['fill', 'stroke'] as const) { const c = e.style[k]; if (c && isRed(c) && !e.style.risk) e.style[k] = '#d98a1f'; } });
  if (id === 7) {
    const emph = tgt.filter(e => e.t === 'flow' && (e.style.width ?? 0) >= 6).sort((a, b) => (b.style.width ?? 0) - (a.style.width ?? 0));
    emph.slice(1).forEach(e => { e.style.width = 4; e.style.opacity = Math.min(e.style.opacity ?? 1, 0.75); });
    const big = tgt.filter(e => e.t === 'text' && (e.style.size ?? 0) >= 36); big.slice(1).forEach(e => { e.style.size = 24; });
  }
  return p;
}

/* ---------- bitta oyna: varaq tekshiruvi — 9 band (joylashuv 2 + rang 7) ---------- */
/** CIE L*a*b* (D65) */
export function lab(c: string): [number, number, number] {
  const r = hexRgb(c) ?? [128, 128, 128];
  const f = (v: number) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const [R, G, B] = r.map(f);
  const t = (v: number) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
  const X = t((R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047), Y = t(R * 0.2126 + G * 0.7152 + B * 0.0722), Z = t((R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883);
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
}
/** ΔE (CIE76) */
export const dE = (a: [number, number, number], b: [number, number, number]): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
function hsv(c: string): [number, number, number] {
  const [r, g, b] = (hexRgb(c) ?? [0, 0, 0]).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let hu = 0;
  if (d) { hu = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hu *= 60; if (hu < 0) hu += 360; }
  return [hu, mx ? d / mx : 0, mx];
}
/** SVG dagi rangli tonlar (kulrang, qora, oq emas): #rrggbb, kichik harf */
export function svgTones(svg: string): string[] {
  return [...new Set((svg.match(/#[0-9a-fA-F]{6}\b/g) ?? []).map(x => x.toLowerCase()))].filter(x => { const [r, g, b] = hexRgb(x)!; return Math.max(r, g, b) - Math.min(r, g, b) > 40; });
}
export type CheckSt = 'o' | 'w' | 'f' | 'p';
export interface Check9 { id: number; group: 'Joylashuv' | 'Rang'; title: string; st: CheckSt; note: string; sw?: string[]; fix?: number }
export interface SheetCheckIn {
  /** varaq SVG si (maket + qoʻlda chizilganlar) */
  svg: string;
  /** boʻsh kataklar soni va joysiz materiallar nomi */
  empty: number; left: string[];
  /** varaqda xarita bor / albomda shartli belgilar bor */
  hasMap: boolean; hasLegend: boolean;
  /** varaq rasmidagi toʻyingan piksellar ulushi: null — hisoblanmoqda, < 0 — hisoblab boʻlmadi */
  share: number | null;
}
/**
 * 9 band: (1) boʻsh katak yoʻq; (2) hamma material joylandi; (3) rangli tonlar ≤ 7; (4) asos tahlildan jimroq — toʻyingan piksellar ≤ 60 %;
 * (5) toifalar ajraladi — har juft ΔE ≥ 12; (6) legenda — xarita boʻlsa albomda shartli belgilar bor; (7) kulrangda oʻqiladi — ΔL ≥ 4;
 * (8) qizil faqat xavf uchun; (9) bitta asosiy urgʻu — kuchli ranglar (C* ≥ 55) ≤ 2. fix — eski tuzatish raqami (qoʻlda chizilganlar uchun).
 */
export function sheetChecks(x: SheetCheckIn, tr: (s: string) => string = s => s): Check9[] {
  const tones = svgTones(x.svg), L = tones.map(lab);
  let close: [string, string, number] | null = null, gray: [string, string, number] | null = null;
  for (let i = 0; i < tones.length; i++) for (let j = i + 1; j < tones.length; j++) {
    const e = dE(L[i], L[j]), dl = Math.abs(L[i][0] - L[j][0]);
    if (e < 12 && (!close || e < close[2])) close = [tones[i], tones[j], e];
    if (dl < 4 && e >= 12 && (!gray || dl < gray[2])) gray = [tones[i], tones[j], dl];
  }
  const reds = tones.filter(h => { const [hu, s, v] = hsv(h); return (hu <= 14 || hu >= 346) && s >= 0.5 && v >= 0.45; });
  const strong = tones.filter((_, i) => Math.hypot(L[i][1], L[i][2]) >= 55);
  const P = tr, sh = x.share;
  return [
    { id: 1, group: 'Joylashuv', title: P('Boʻsh katak yoʻq'), st: x.empty ? 'f' : 'o', note: x.empty ? `${x.empty} ${P('ta boʻsh katak')}` : '' },
    { id: 2, group: 'Joylashuv', title: P('Hamma material joylandi'), st: x.left.length ? 'f' : 'o', note: x.left.map(P).join(', ') },
    { id: 3, group: 'Rang', title: P('Rangli tonlar ≤ 7'), st: tones.length > 7 ? 'f' : 'o', note: `${tones.length} ${P('ta ton')}`, sw: tones.slice(0, 10), fix: tones.length > 7 ? 1 : undefined },
    { id: 4, group: 'Rang', title: P('Asos tahlildan jimroq'), st: sh == null ? 'p' : sh < 0 ? 'w' : sh > 0.6 ? 'f' : 'o', note: sh == null ? P('hisoblanmoqda…') : sh < 0 ? P('hisoblab boʻlmadi') : `${P('toʻyingan maydon')} ${Math.round(sh * 100)} % (≤ 60 %)`, fix: sh != null && sh > 0.6 ? 2 : undefined },
    { id: 5, group: 'Rang', title: P('Toifalar bir-biridan ajraladi'), st: close ? 'f' : 'o', note: close ? `${P('juda yaqin')}: ΔE ${close[2].toFixed(0)}` : '', sw: close ? close.slice(0, 2) as string[] : undefined, fix: close ? 3 : undefined },
    { id: 6, group: 'Rang', title: P('Legenda sahifa ranglariga mos'), st: !x.hasMap || x.hasLegend ? 'o' : 'w', note: x.hasMap && !x.hasLegend ? P('xarita bor, shartli belgilar yoʻq') : P('shartli belgilar varaq ranglaridan tuziladi'), fix: x.hasMap && !x.hasLegend ? 4 : undefined },
    { id: 7, group: 'Rang', title: P('Kulrang rejimda oʻqiladi'), st: gray ? 'w' : 'o', note: gray ? `${P('kulrangda qoʻshiladi')}: ΔL ${gray[2].toFixed(1)}` : '', sw: gray ? gray.slice(0, 2) as string[] : undefined, fix: gray ? 5 : undefined },
    { id: 8, group: 'Rang', title: P('Qizil faqat haqiqiy xavf uchun'), st: reds.length ? 'w' : 'o', note: reds.length ? P('qizil bor — xavfni bildiradimi?') : '', sw: reds.length ? reds : undefined, fix: reds.length ? 6 : undefined },
    { id: 9, group: 'Rang', title: P('Bitta asosiy urgʻu'), st: strong.length > 2 ? 'w' : 'o', note: strong.length > 2 ? `${strong.length} ${P('ta kuchli rang')}` : '', sw: strong.length > 2 ? strong : undefined, fix: strong.length > 2 ? 7 : undefined },
  ];
}
