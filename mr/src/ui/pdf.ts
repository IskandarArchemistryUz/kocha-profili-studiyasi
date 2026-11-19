/** Vektor PDF: jsPDF + svg2pdf, DejaVu Sans (lotin, kirill, oʻzbek belgilari). Varaqlar va Chizmadon uchun umumiy. */
import { exportGate, asClean, needWm, svgCanvas, wmCanvas, FREE_PX, withNs } from '../core/wm';
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
const PDF_FALLBACK_PX = 3300;
/* 19.11 (egasi: «46 varaqli albom PDF da qulaydi»): jsPDF sahifa oqimlarini saqlashgacha siqilmagan satrlarda ushlaydi —
   SVG ning har belgisiga ~18 bayt xotira (17 mln belgi → +300 MB, saqlashda yana +110 MB). Katta albom shu sababli tab xotirasidan oshardi.
   Endi varaqlar SVG hajmi boʻyicha boʻlaklarga boʻlinadi: har boʻlak alohida jsPDF da yasalib, siqilgan holda (ArrayBuffer) olinadi va
   jsPDF tashlab yuboriladi; oxirida boʻlaklar pdf-lib bilan bitta faylga birlashtiriladi. Kichik albom — bitta boʻlak, avvalgidek.
   Oʻlchov (150 varaq, 100 mln belgi, GC dan keyin): eski +1026 MB, yangi +124 MB; vaqt 66 → 78 s. Har varaqdan keyin setTimeout qoʻyilmaydi —
   fon tabida u 1 s gacha choʻziladi (vaqt 2 barobar oshgan edi); faqat boʻlaklar orasida. */
const PDF_CHUNK_CHARS = 8e6;
/** varaqlar → boʻlaklar (har biri ≤ lim belgi; bitta katta varaq — oʻzi bir boʻlak) */
export function pdfChunks<T extends { svg: string }>(pages: T[], lim = PDF_CHUNK_CHARS): T[][] {
  const out: T[][] = []; let g: T[] = [], acc = 0;
  for (const p of pages) { if (g.length && acc + p.svg.length > lim) { out.push(g); g = []; acc = 0; } g.push(p); acc += p.svg.length; }
  if (g.length) out.push(g);
  return out;
}
const tick = () => new Promise<void>(r => setTimeout(r, 0));
async function renderPdf(pages: PdfPage[]): Promise<import('jspdf').jsPDF> {
  const { jsPDF, svg2pdf, fonts } = await loadPdf();
  const first = pages[0];
  const pdf = new jsPDF({ unit: 'mm', format: [first.widthMm, first.heightMm], orientation: first.widthMm > first.heightMm ? 'landscape' : 'portrait', compress: true });
  pdf.addFileToVFS('DejaVuSans.ttf', fonts[0]); pdf.addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal');
  pdf.addFileToVFS('DejaVuSans-Bold.ttf', fonts[1]); pdf.addFont('DejaVuSans-Bold.ttf', 'DejaVuSans', 'bold');
  for (let i = 0; i < pages.length; i++) {
    const r = pages[i];
    if (i) pdf.addPage([r.widthMm, r.heightMm], r.widthMm > r.heightMm ? 'landscape' : 'portrait');
    // 18.11 (egasi: «PDF da xaritali varaqlar boʻsh»): Varaqlar rejalaridagi Illustrator qatlamlari (inkscape:groupmode) — ildizda
    // xmlns:inkscape boʻlmasa XML tahlili yiqiladi va svg2pdf boʻsh sahifa chizadi. Nomlar maydoni qoʻshiladi; baribir xato boʻlsa — sahifa rasm sifatida
    const src = withNs(r.svg.replace(/font-family="[^"]*"/g, 'font-family="DejaVuSans"'));
    const xd = new DOMParser().parseFromString(src, 'image/svg+xml');
    if (xd.getElementsByTagName('parsererror').length) { const c = await svgCanvas(r.svg, PDF_FALLBACK_PX); pdf.addImage(c.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, r.widthMm, r.heightMm); continue; }
    const el = xd.documentElement;
    const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-99999px;top:0'; host.append(el); document.body.append(host);
    try { await svg2pdf(el as unknown as Element, pdf, { x: 0, y: 0, width: r.widthMm, height: r.heightMm }); } finally { host.remove(); }
  }
  return pdf;
}
async function makePdf(pages: PdfPage[], name: string): Promise<void> {
  const groups = pdfChunks(pages);
  if (groups.length === 1) { (await renderPdf(pages)).save(name); return; }
  const parts: ArrayBuffer[] = [];
  for (const g of groups) { parts.push((await renderPdf(g)).output('arraybuffer')); await tick(); }
  const { PDFDocument } = await import('pdf-lib');
  const out = await PDFDocument.create();
  for (let i = 0; i < parts.length; i++) {
    const src = await PDFDocument.load(parts[i]); parts[i] = new ArrayBuffer(0);
    for (const pg of await out.copyPages(src, src.getPageIndices())) out.addPage(pg);
  }
  const bytes = await out.save({ useObjectStreams: true });
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
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
