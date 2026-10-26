/** Hudud tahlili qatlam belgilari (26.10): 24 px toʻr, chiziq qalinligi CSS da (.lic).
 *  «piyoda» — Lucide «footprints» belgisi (ISC litsenziyasi, lucide.dev). Qolganlari — Archemistry chizmasi. */
import { svgIcon } from '../ui/dom';

export const LAYER_ICON: Record<string, string> = {
  relyef: '<path d="M2 19l6-9 4 5 3-4 7 8z"/><path d="M8 10l2 3"/>',
  nishab: '<path d="M3 20h18L3 6z"/><path d="M7 20a5 5 0 0 0-1.3-3.4"/>',
  yuza: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><path d="M13 17h8M17 13v8"/>',
  issiqlik: '<path d="M10 14V5a2 2 0 1 1 4 0v9a4 4 0 1 1-4 0z"/><path d="M12 10v6"/><path d="M18 6h3M18 10h2"/>',
  quyosh: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  shamol: '<path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 12h16a3 3 0 1 1-3 3"/><path d="M3 16h7"/>',
  shovqin: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11"/>',
  xizmat: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  piyoda: '<path d="M4 16v-2.4C4 11.5 3 10.5 3 8c0-2.7 1.5-6 4.5-6C9.4 2 10 3.8 10 5.5c0 3.1-2 5.7-2 8.7V16a2 2 0 1 1-4 0z"/><path d="M20 20v-2.4c0-2.1 1-3.1 1-5.6 0-2.7-1.5-6-4.5-6C14.6 6 14 7.8 14 9.5c0 3.1 2 5.7 2 8.7V20a2 2 0 1 0 4 0z"/><path d="M16 17h4M4 13h4"/>',
  oqim: '<path d="M3 7c4 0 6 4 9 4s5-4 9-4"/><path d="M3 13c4 0 6 4 9 4s5-4 9-4"/><path d="M18 5l3 2-3 2M18 11l3 2-3 2"/>',
  raqobat: '<circle cx="8" cy="12" r="5"/><circle cx="16" cy="12" r="5"/>',
  narx: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M12 13v5M10.5 14.2c0-.8.7-1.2 1.5-1.2s1.5.4 1.5 1.1c0 1.5-3 .9-3 2.4 0 .7.7 1.1 1.5 1.1s1.5-.4 1.5-1.2"/>',
};
/** Guruh ranglari: Yer, Iqlim, Shahar, Biznes */
export const GROUP_COL: Record<string, string> = { yer: '#9a6b45', iqlim: '#d08a12', shahar: '#2a8a7e', biznes: '#4c5bd4' };

export function layerIcon(id: string): SVGSVGElement { const s = svgIcon(LAYER_ICON[id] ?? ''); s.classList.add('lic'); return s; }
