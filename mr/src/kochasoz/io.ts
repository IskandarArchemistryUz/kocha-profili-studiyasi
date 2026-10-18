/** Koʻchasoz: varaq eksporti (SVG, vektor PDF), Chizmadonga uzatish, holatni faylga saqlash / ochish */
import { download, toast } from '../ui/dom';
import { svgPdf } from '../ui/pdf';
import { tr } from '../i18n';

/** fayl nomi: lotin harflari, raqam va chiziqcha (brauzerlar yuklab olishda notoʻgʻri belgili nomni rad etadi) */
const safe = (s: string) => s.normalize('NFKD').replace(/[ʻʼ'`’]/g, '').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'kochasoz';

/** Ekrandagi SVG → mustaqil SVG matni (viewBox, oʻlcham mm da) */
export function svgText(svg: SVGSVGElement, wMm?: number, hMm?: number): string {
  const c = svg.cloneNode(true) as SVGSVGElement;
  c.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  c.removeAttribute('style'); c.removeAttribute('role');
  const vb = svg.viewBox.baseVal;
  if (wMm && hMm) { c.setAttribute('width', `${wMm}mm`); c.setAttribute('height', `${hMm}mm`); }
  else { c.setAttribute('width', String(vb.width)); c.setAttribute('height', String(vb.height)); }
  return new XMLSerializer().serializeToString(c);
}

/** Varaq — A3 albom (420 × 297 mm) */
const A3: [number, number] = [420, 297];

export function exportSvg(svg: SVGSVGElement, name: string): void {
  download(`${safe(name)}.svg`, svgText(svg, ...A3), 'image/svg+xml');
}
export async function exportPdf(svg: SVGSVGElement, name: string): Promise<void> {
  toast(tr('PDF tayyorlanmoqda…'));
  try { await svgPdf([{ svg: svgText(svg, ...A3), widthMm: A3[0], heightMm: A3[1] }], `${safe(name)}.pdf`); }
  catch (e) { toast(tr('PDF tayyorlanmadi') + ': ' + (e as Error).message); }
}

/** Chizmadon kiruvchi varagʻi: Master reja ilovasi (#/chizmadon) uni oxirgi loyihaning Chizmadoniga qoʻyadi */
export const CHZ_INBOX = 'ks-chz-inbox';
export function sendToChizmadon(svg: SVGSVGElement, name: string): void {
  /* Chizmadon kiruvchi varaq birligini mm deb oladi (Master reja varaqlari kabi): 1188 × 840 → 420 × 297 mm */
  const vb = svg.viewBox.baseVal, full = svgText(svg), k = A3[0] / vb.width;
  const inner = `<g transform="scale(${k.toFixed(6)})">${full.slice(full.indexOf('>') + 1).replace(/<\/svg>\s*$/, '')}</g>`;
  try { localStorage.setItem(CHZ_INBOX, JSON.stringify({ name, kind: 'sheet', svg: inner, vb: [0, 0, A3[0], A3[1]], w: A3[0], h: A3[1] })); }
  catch { toast(tr('Brauzer xotirasi toʻla — varaq uzatilmadi')); return; }
  location.href = './#/chizmadon';
}
export function saveJson(o: Record<string, unknown>): void {
  download(`kochasoz-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(o, null, 1), 'application/json');
}
export function openJson(onload: (o: Record<string, unknown>) => void): void {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
  inp.onchange = async () => { const f = inp.files?.[0]; if (!f) return; try { onload(JSON.parse(await f.text())); } catch (e) { toast((e as Error).message); } };
  inp.click();
}
