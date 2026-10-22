/** Koʻchasoz: varaq eksporti (SVG, vektor PDF), Chizmadonga uzatish, holatni faylga saqlash / ochish */
import { download, toast } from '../ui/dom';
import { svgPdf } from '../ui/pdf';
import { tr } from '../i18n';

/** fayl nomi: lotin harflari, raqam va chiziqcha (brauzerlar yuklab olishda notoʻgʻri belgili nomni rad etadi) */
export const safeName = (s: string) => s.normalize('NFKD').replace(/[ʻʼ'`’]/g, '').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'kochasoz';

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
  download(`${safeName(name)}.svg`, svgText(svg, ...A3), 'image/svg+xml');
}
export async function exportPdf(svg: SVGSVGElement, name: string): Promise<void> {
  toast(tr('PDF tayyorlanmoqda…'));
  try { await svgPdf([{ svg: svgText(svg, ...A3), widthMm: A3[0], heightMm: A3[1] }], `${safeName(name)}.pdf`); }
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

/** Eksport uchun SVG nusxasi: UI qismlari (tanlov belgisi, tutqichlar, bosish maydonlari, −/+ tugmalari) olib tashlanadi */
export function cleanSvg(svg: SVGSVGElement): SVGSVGElement {
  const c = svg.cloneNode(true) as SVGSVGElement;
  c.querySelectorAll('[data-ly="UI"], .ks-hnd, .ks-uh, .ks-bb, rect[style*="cursor"]').forEach(e => e.remove());
  c.querySelectorAll('[data-ly], [data-bk]').forEach(e => { e.removeAttribute('data-ly'); e.removeAttribute('data-bk'); });
  return c;
}
/** SVG → PNG (k × viewBox, oq fon) */
export async function exportPng(svg: SVGSVGElement, name: string, k: number): Promise<void> {
  try {
    const vb = svg.viewBox.baseVal, W = Math.round(vb.width * k), H = Math.round(vb.height * k);
    const c = svg.cloneNode(true) as SVGSVGElement; c.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); c.setAttribute('width', String(W)); c.setAttribute('height', String(H)); c.removeAttribute('style');
    const u = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(c)], { type: 'image/svg+xml' })), im = new Image(); im.src = u; await im.decode();
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d')!; g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.drawImage(im, 0, 0, W, H); URL.revokeObjectURL(u);
    const blob = await new Promise<Blob | null>(r => cv.toBlob(r, 'image/png')); if (blob) download(name, blob, 'image/png');
  } catch (e) { toast('PNG: ' + (e as Error).message); }
}
