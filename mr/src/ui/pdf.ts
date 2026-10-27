/** Vektor PDF: jsPDF + svg2pdf, DejaVu Sans (lotin, kirill, oʻzbek belgilari). Varaqlar va Chizmadon uchun umumiy. */
import { wmSvg, exportGate, asClean } from '../core/wm';
export interface PdfPage { svg: string; widthMm: number; heightMm: number }
/* ---------- PDF (vektor): jsPDF + svg2pdf, DejaVu Sans (lotin, kirill, oʻzbek belgilari) ---------- */
let pdfLib: Promise<{ jsPDF: typeof import('jspdf').jsPDF; svg2pdf: typeof import('svg2pdf.js').svg2pdf; fonts: [string, string] }> | null = null;
const b64 = (buf: ArrayBuffer) => { let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
function loadPdf() {
  pdfLib ??= (async () => {
    const [{ jsPDF }, { svg2pdf }, reg, bold] = await Promise.all([import('jspdf'), import('svg2pdf.js'), import('dejavu-fonts-ttf/ttf/DejaVuSans.ttf?url'), import('dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf?url')]);
    const f = await Promise.all([reg.default, bold.default].map(u => fetch(u).then(r => r.arrayBuffer()).then(b64)));
    return { jsPDF, svg2pdf, fonts: f as [string, string] };
  })();
  return pdfLib;
}
/** Vektor PDF. Bepul — belgili; toza — tanga bilan (darvoza). item — narx id (boʻlmasa xizmat va sahifalar soni boʻyicha). */
export async function svgPdf(pages: PdfPage[], name: string, item?: string): Promise<void> {
  if (!pages.length) return;
  const mode = await exportGate({ name, item: item ?? (pages.length === 1 && !/chizmadon|kochasoz|joyshunos/.test(location.pathname + location.hash) ? 'mr.sheet' : undefined), sample: pages.map(p => p.svg).join('\n') });
  if (!mode) return;
  return mode === 'clean' ? asClean(() => makePdf(pages, name)) : makePdf(pages, name);
}
async function makePdf(pages: PdfPage[], name: string): Promise<void> {
  const { jsPDF, svg2pdf, fonts } = await loadPdf();
  const first = pages[0];
  const pdf = new jsPDF({ unit: 'mm', format: [first.widthMm, first.heightMm], orientation: first.widthMm > first.heightMm ? 'landscape' : 'portrait', compress: true });
  pdf.addFileToVFS('DejaVuSans.ttf', fonts[0]); pdf.addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal');
  pdf.addFileToVFS('DejaVuSans-Bold.ttf', fonts[1]); pdf.addFont('DejaVuSans-Bold.ttf', 'DejaVuSans', 'bold');
  for (let i = 0; i < pages.length; i++) {
    const r = pages[i];
    if (i) pdf.addPage([r.widthMm, r.heightMm], r.widthMm > r.heightMm ? 'landscape' : 'portrait');
    const el = new DOMParser().parseFromString(wmSvg(r.svg).replace(/font-family="[^"]*"/g, 'font-family="DejaVuSans"'), 'image/svg+xml').documentElement;
    const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-99999px;top:0'; host.append(el); document.body.append(host);
    try { await svg2pdf(el as unknown as Element, pdf, { x: 0, y: 0, width: r.widthMm, height: r.heightMm }); } finally { host.remove(); }
  }
  pdf.save(name);
}

