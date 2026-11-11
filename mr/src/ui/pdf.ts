/** Vektor PDF: jsPDF + svg2pdf, DejaVu Sans (lotin, kirill, oʻzbek belgilari). Varaqlar va Chizmadon uchun umumiy. */
import { exportGate, asClean, needWm, svgCanvas, wmCanvas, FREE_PX } from '../core/wm';
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
  // E1 (11.11): bepul PDF — vektor emas, har sahifa bitta rasm (uzun tomoni 1600 px, belgi pishirilgan)
  return mode === 'clean' ? asClean(() => makePdf(pages, name)) : needWm() ? makeRasterPdf(pages, name) : makePdf(pages, name);
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
    const el = new DOMParser().parseFromString(r.svg.replace(/font-family="[^"]*"/g, 'font-family="DejaVuSans"'), 'image/svg+xml').documentElement;
    const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-99999px;top:0'; host.append(el); document.body.append(host);
    try { await svg2pdf(el as unknown as Element, pdf, { x: 0, y: 0, width: r.widthMm, height: r.heightMm }); } finally { host.remove(); }
  }
  pdf.save(name);
}

/** Bepul PDF: sahifa — rasm (JPEG), belgi piksellarda; matn va vektor yoʻq */
async function makeRasterPdf(pages: PdfPage[], name: string): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const first = pages[0];
  const pdf = new jsPDF({ unit: 'mm', format: [first.widthMm, first.heightMm], orientation: first.widthMm > first.heightMm ? 'landscape' : 'portrait', compress: true });
  for (let i = 0; i < pages.length; i++) {
    const r = pages[i];
    if (i) pdf.addPage([r.widthMm, r.heightMm], r.widthMm > r.heightMm ? 'landscape' : 'portrait');
    const c = wmCanvas(await svgCanvas(r.svg, FREE_PX));
    pdf.addImage(c.toDataURL('image/jpeg', 0.85), 'JPEG', 0, 0, r.widthMm, r.heightMm);
  }
  pdf.save(name);
}
