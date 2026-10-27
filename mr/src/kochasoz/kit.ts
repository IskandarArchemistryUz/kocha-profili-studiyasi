/**
 * Koʻchasoz umumiy toʻplami: zona piktogrammalari va tarmoq belgilari (tilga qarab).
 * Piktogrammalar — «Bitta ikonka tili» (kanvas, Ikonkalar): 24 × 24, chiziq 1,75, uchlar yumaloq, rang — matn rangi.
 * Piyoda, Daraxt, Velo, Avtoturargoh, Bekat, Hajmlar — oʻsha doskadan aynan; qolganlari shu qoidada chizildi.
 */
import { getLang } from '../i18n';

const c = (x: number, y: number, r: number) => `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;

export const PK: Record<string, string> = {
  bino: 'M5 21V8l7-4 7 4v13M10 21v-5h4v5M3 21h18',
  front: 'M4 9h16l-1.6-4H5.6zM5 9v11h14V9M9.5 20v-5.5h5V20M4 9c0 1.4 1.8 2.2 4 2.2S12 10.4 12 9c0 1.4 1.8 2.2 4 2.2S20 10.4 20 9',
  piy: c(13, 4.5, 1.5) + 'M10 21l2.2-6.2 2.8 2.7V21M8.5 11.5L12 8.5l2.8 2 2.7 1M12 8.5l-1.8 6.3',
  mebel: 'M9 21h6M12 21V5h5M17 5v2.5M15.5 7.5h3M12 13l-4-2.5',
  yash: 'M12 21v-6M12 15c-4 0-6-3-6-6a6 6 0 0 1 12 0c0 3-2 6-6 6z',
  velo: c(6, 16, 3.5) + c(18, 16, 3.5) + 'M6 16l4-7h5l3 7M10 9l2 7h-6M14 6h2',
  park: 'M4 4h16v16H4zM10 16V8h3a2.5 2.5 0 0 1 0 5h-3',
  qat: 'M6 17v-4.5L8 7h8l2 5.5V17M6 12.5h12M7.5 17v2.5M16.5 17v2.5M8.5 14.6h.01M15.5 14.6h.01',
  bus: 'M6.5 3h11A1.5 1.5 0 0 1 19 4.5V18H5V4.5A1.5 1.5 0 0 1 6.5 3zM5 11h14M5 7h14M8 18v2.5M16 18v2.5M8 14.5h.01M16 14.5h.01',
  tram: 'M7.5 7h9A1.5 1.5 0 0 1 18 8.5V18H6V8.5A1.5 1.5 0 0 1 7.5 7zM6 13h12M10 7l2-3 2 3M9 2.5h6M8.5 18l-1.5 3M15.5 18l1.5 3',
  med: 'M5 3v18M19 3v18M12 18v-3M12 15c-2.2 0-3.3-1.6-3.3-3.3a3.3 3.3 0 0 1 6.6 0c0 1.7-1.1 3.3-3.3 3.3z',
};

/**
 * Tarmoq belgilari. Ichki kalit (u.k) oʻzgarmaydi — saqlangan loyihalar shu bilan; faqat koʻrinadigan belgi tilga qarab.
 * en — xalqaro qisqartmalar (water, sanitary sewer …). uz — oʻzbekcha soʻzlarning bosh harflari.
 * ru — rus tilidagi chizmalarda keng tarqalgan belgilar (В1, К1, К2, Т, Г1); standart jadvali bilan solishtirilmagan — andoza.
 */
const UL: Record<'uz' | 'en' | 'ru', Record<string, string>> = {
  en: { T: 'T', E: 'E', HV: 'HV', DH: 'DH', DC: 'DC', G: 'G', W: 'W', SS: 'SS', SD: 'SD', UD: 'UD', SL: 'SL', UT: 'UT' },
  uz: { T: 'Al', E: 'E', HV: 'EY', DH: 'Is', DC: 'So', G: 'Gz', W: 'Sv', SS: 'Kn', SD: 'Yk', UD: 'Dr', SL: 'Yo', UT: 'KT' },
  ru: { T: 'Св', E: 'Эл', HV: 'ЭВ', DH: 'Т', DC: 'Х', G: 'Г1', W: 'В1', SS: 'К1', SD: 'К2', UD: 'Др', SL: 'Осв', UT: 'Кол' },
};
export function ulbl(k: string): string { const l = getLang(); const m = l === 'uz' || l === 'en' || l === 'ru' ? UL[l] : l === 'uk' || l === 'kk' ? UL.ru : UL.en; return m[k] ?? k; }   // yangi tillar: kirill — ruscha, lotin — xalqaro belgilar

/**
 * Sudrash: ekrandagi siljishni metrga aylantiradi. mpp — 1 px necha metr. onMove(dm, ev) har harakatda; onEnd — qoʻyib yuborilganda.
 */
export function drag(ev: PointerEvent, mpp: number, onMove: (dm: number, e: PointerEvent) => void, onEnd?: () => void): void {
  ev.preventDefault(); ev.stopPropagation();
  const x0 = ev.clientX, y0 = ev.clientY;
  const tgt = ev.currentTarget as Element | null;
  try { (tgt as Element & { setPointerCapture?: (id: number) => void })?.setPointerCapture?.(ev.pointerId); } catch { /* */ }
  document.body.classList.add('ks-dragging');
  const mv = (e: PointerEvent) => onMove((e.clientX - x0) * mpp, Object.assign(e, { dy: (e.clientY - y0) * mpp }));
  const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); document.body.classList.remove('ks-dragging'); onEnd?.(); };
  addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
}
/** asosiy chizma SVG si boʻyicha 1 ekran pikseli = necha viewBox birligi */
export function svgUnitsPerPx(): number {
  const svg = document.querySelector<SVGSVGElement>('.ws-b main svg[role=img]');
  if (!svg) return 1;
  const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
  return Math.max(vb.width / r.width, vb.height / r.height);
}
