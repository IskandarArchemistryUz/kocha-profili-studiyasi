/**
 * Loyiha kartasining eskizi (22.11.2026, egasi: «hammasida bir xil illyustratsiya turibdi — loyiha rasmini kichik qilib koʻrsatsin»).
 * Hujjatdan kichik reja olinadi: uchastka, koʻchalar, binolar (qavatiga qarab toʻqroq). Maʼlumot — faqat sonlar
 * (bulut meta sida ham shu koʻrinishda saqlanadi), SVG brauzerda shu sonlardan chiziladi — serverdan kelgan matn HTML ga qoʻyilmaydi.
 */
import type { LngLat, Project } from './doc';

/** Eskiz koʻrinish oynasi (kartadagi .thumb nisbati) */
export const TW = 240, TH = 118;
const PAD = 6, MAX_B = 700, MAX_S = 160;

/** s — uchastka halqalari, r — koʻcha oʻqlari, b — binolar: [qavat, x0, y0, x1, y1, …]; nuqtalar TW×TH oynasida, butun son */
export interface ThumbData { s?: number[][]; r?: number[][]; b?: number[][] }

type Doc = Pick<Project, 'site' | 'buildings' | 'streets'> & { keepRings?: Project['keepRings'] };

export function thumbData(doc: Doc): ThumbData | null {
  const site = doc.site?.rings?.filter(r => r?.length >= 3) ?? [];
  const blds = (doc.buildings ?? []).filter(b => b?.footprint?.length >= 3);
  const sts = (doc.streets ?? []).filter(s => s?.axis?.length >= 2);
  // chegaralar: uchastka bor boʻlsa — shu (eskiz loyiha hududiga qaraydi), boʻlmasa — binolar va koʻchalar
  const pts: LngLat[] = site.length ? site[0] : [...blds.flatMap(b => b.footprint), ...sts.flatMap(s => s.axis)];
  if (!pts.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { if (!Number.isFinite(x) || !Number.isFinite(y)) continue; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  if (!Number.isFinite(x0)) return null;
  const kx = Math.cos(((y0 + y1) / 2) * Math.PI / 180);   // uzunlik darajasi qisqarishi
  const w = Math.max((x1 - x0) * kx, 1e-7), hgt = Math.max(y1 - y0, 1e-7);
  const sc = Math.min((TW - 2 * PAD) / w, (TH - 2 * PAD) / hgt);
  const ox = (TW - w * sc) / 2, oy = (TH - hgt * sc) / 2;
  const P = (r: LngLat[]): number[] => {
    const o: number[] = [];
    for (const [x, y] of r) {
      const px = Math.round(ox + (x - x0) * kx * sc), py = Math.round(oy + (y1 - y) * sc);
      if (o.length >= 2 && o[o.length - 2] === px && o[o.length - 1] === py) continue;   // bir pikselga tushgan nuqtalar
      o.push(px, py);
    }
    return o;
  };
  const out: ThumbData = {};
  if (site.length) out.s = site.slice(0, 8).map(P).filter(a => a.length >= 6);
  if (sts.length) out.r = sts.slice(0, MAX_S).map(s => P(s.axis)).filter(a => a.length >= 4);
  if (blds.length) {
    // juda koʻp boʻlsa — kattalari (eskizda maydalari baribir nuqta)
    const pick = blds.length > MAX_B ? [...blds].sort((a, b) => area(b.footprint) - area(a.footprint)).slice(0, MAX_B) : blds;
    out.b = pick.map(b => { const a = P(b.footprint); return a.length >= 4 ? [Math.max(1, Math.min(99, Math.round(b.floors || 1))), ...a] : []; }).filter(a => a.length);
  }
  return out.s?.length || out.r?.length || out.b?.length ? out : null;
}

function area(r: LngLat[]): number { let s = 0; for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s); }

/** Bulutdan kelgan qiymatni tekshirish: faqat chekli sonlar massivlari */
export function cleanThumb(v: unknown): ThumbData | null {
  if (!v || typeof v !== 'object') return null;
  const arr = (x: unknown, min: number): number[][] | undefined => Array.isArray(x)
    ? x.filter((a): a is number[] => Array.isArray(a) && a.length >= min && a.length <= 4000 && a.every(n => typeof n === 'number' && Number.isFinite(n))).slice(0, 2000)
    : undefined;
  const o = v as Record<string, unknown>, t: ThumbData = { s: arr(o.s, 6), r: arr(o.r, 4), b: arr(o.b, 5) };
  return t.s?.length || t.r?.length || t.b?.length ? t : null;
}

const pts = (a: number[], from = 0): string => { let s = ''; for (let i = from; i + 1 < a.length; i += 2) s += `${i > from ? ' ' : ''}${a[i] | 0},${a[i + 1] | 0}`; return s; };

/** SVG ichki qismi (viewBox 0 0 TW TH) — faqat sonlardan quriladi */
export function thumbSvg(t: ThumbData): string {
  const s = (t.s ?? []).map(a => `<polygon class="st" points="${pts(a)}"/>`).join('');
  const r = t.r?.length ? `<g class="rd">${t.r.map(a => `<polyline points="${pts(a)}"/>`).join('')}</g>` : '';
  // qavatlilik: 1–3 · 4–9 · 10–16 · 17+ — toʻrt ton
  const tone = (f: number) => (f >= 17 ? 4 : f >= 10 ? 3 : f >= 4 ? 2 : 1);
  const b = t.b?.length ? `<g class="bp">${t.b.map(a => `<polygon class="f${tone(a[0])}" points="${pts(a, 1)}"/>`).join('')}</g>` : '';
  return `<svg viewBox="0 0 ${TW} ${TH}" preserveAspectRatio="xMidYMid meet">${s}${r}${b}</svg>`;
}
