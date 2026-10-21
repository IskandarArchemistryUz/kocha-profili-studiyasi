/**
 * Bogʻlash modeli (bitta oyna): qoʻlda chizilgan shakl material katagiga yoki varaqqa bogʻlanadi.
 *   a = { el: materialId | null, pi: varaq, r0: chizilgan paytdagi katak / varaq toʻrtburchagi (mm), lock? }
 * Koʻrsatishda F — materialning hozirgi katagi (yoki varaq ramkasi):
 *   sc = min(F.w / r0.w, F.h / r0.h),  p → F markazi + (p − r0 markazi) · sc   (keyin shaklning oʻz burilishi).
 * Material boshqa katak, varaq yoki maketga koʻchsa — shakl ham koʻchadi va mutanosib oʻzgaradi;
 * varaqqa bogʻlangani format almashganda (A3 → A1) nisbatini saqlaydi.
 * rebase — geometriyani joriy koordinataga oʻtkazib r0 = F qiladi (tahrir va koʻrsatishdan oldin);
 * anchorFor — shakl markazi qaysi material katagida (eng kichigi) boʻlsa, oʻshanga, aks holda varaqqa.
 */
import { type ChBind, type ChEl, type ChRect, bbox } from './model';

export type Pt = [number, number];
export interface Xf { sc: number; c0: Pt; c1: Pt; F: ChRect; id: boolean }
export interface Cell { el: string; r: ChRect }

const ctr = (r: ChRect): Pt => [r.x + r.w / 2, r.y + r.h / 2];
const eq = (a: number, b: number) => Math.abs(a - b) < 1e-6;

/** r0 → F oʻtkazish parametrlari (r0 yoʻq boʻlsa — F ning oʻzi, oʻzgarishsiz) */
export function bindXf(r0: ChRect | null, F: ChRect): Xf {
  const R = r0 && r0.w > 0 && r0.h > 0 ? r0 : F;
  const sc = Math.min(F.w / R.w, F.h / R.h), c0 = ctr(R), c1 = ctr(F);
  return { sc, c0, c1, F, id: eq(sc, 1) && eq(c0[0], c1[0]) && eq(c0[1], c1[1]) };
}
/** SVG transform satri (ekran uchun; tahrirda rebase ishlatiladi) */
export const xfAttr = (t: Xf): string => (t.id ? '' : `translate(${t.c1[0]} ${t.c1[1]}) scale(${t.sc}) translate(${-t.c0[0]} ${-t.c0[1]})`);

/** Shakl geometriyasini oʻtkazish (joyida): nuqtalar, quti, chiziq qalinligi, shrift, qator va zona oʻlchamlari */
export function xformEl(e: ChEl, t: Xf): void {
  if (t.id) return;
  const m = (p: Pt): Pt => [t.c1[0] + (p[0] - t.c0[0]) * t.sc, t.c1[1] + (p[1] - t.c0[1]) * t.sc];
  if (e.pts) e.pts = e.pts.map(m);
  if (e.x != null && e.y != null) { const a = m([e.x, e.y]); e.x = a[0]; e.y = a[1]; }
  if (e.w != null) e.w *= t.sc; if (e.h != null) e.h *= t.sc;
  const s = e.style;
  if (s.width != null) s.width *= t.sc;
  if (s.size != null) s.size *= t.sc;
  if (s.halo != null) s.halo *= t.sc;
  if (e.row) e.row = { ...e.row, gap: e.row.gap * t.sc, size: e.row.size * t.sc };
}

/** Joriy katak F boʻyicha geometriyani yangilab r0 = F (bogʻlanish turi oʻzgarmaydi) */
export function rebase(e: ChEl, F: ChRect): void {
  if (!e.a) return;
  xformEl(e, bindXf(e.a.r0, F));
  e.a.r0 = { ...F };
}

/** Shakl markazi (burilish markaz atrofida — markaz oʻzgarmaydi) */
export const centerOf = (e: ChEl): Pt => { const b = bbox(e); return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; };
const inside = (p: Pt, r: ChRect) => p[0] >= r.x && p[0] <= r.x + r.w && p[1] >= r.y && p[1] <= r.y + r.h;

/** Yangi bogʻlanish: markaz tushgan eng kichik material katagi, aks holda varaq */
export function anchorFor(e: ChEl, pi: number, cells: Cell[], page: ChRect): ChBind {
  const c = centerOf(e); let best: Cell | null = null;
  for (const q of cells) if (inside(c, q.r) && (!best || q.r.w * q.r.h < best.r.w * best.r.h)) best = q;
  return best ? { el: best.el, pi, r0: { ...best.r } } : { el: null, pi, r0: { ...page } };
}
/** Tahrirdan keyin: qulflangan boʻlsa — turi saqlanadi (r0 = joriy F), aks holda qayta bogʻlanadi */
export function reanchor(e: ChEl, pi: number, cells: Cell[], page: ChRect): void {
  if (e.a?.lock) {
    const F = e.a.el ? cells.find(q => q.el === e.a!.el)?.r ?? page : page;
    e.a = { ...e.a, pi: e.a.el ? e.a.pi : pi, r0: { ...F } }; return;
  }
  e.a = anchorFor(e, pi, cells, page);
}
/** Oʻng paneldagi «Varaqqa» (qulflangan — maket almashsa ham shu varaqda) / «Elementga» (ostidagi material) */
export function bindTo(e: ChEl, pi: number, cells: Cell[], page: ChRect, to: 'page' | 'el'): boolean {
  if (to === 'page') { e.a = { el: null, pi, r0: { ...page }, lock: true }; return true; }
  const a = anchorFor(e, pi, cells, page); if (!a.el) return false;
  e.a = a; return true;
}
