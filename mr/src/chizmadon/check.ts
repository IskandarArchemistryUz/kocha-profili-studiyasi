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
