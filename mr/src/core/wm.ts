/* Bepul yuklashlar uchun setkasimon belgi «ARCHEMISTRY · BEPUL» (vaqtincha — hamma yuklashga, server va tarif ishga tushguncha).
   Egasi — belgisiz: akkaunt boʻyicha (server OWNER_EMAILS → /me owner) yoki «?egasi=…» havolasi bilan (kps_owner).
   SVG va PDF — vektor matnlar (svg2pdf pattern'ni qoʻllamaydi), PNG — kanvasda chiziladi, DXF — alohida qatlam.
   Loyiha fayli (.json), IFC, GLB, OBJ, Excel — oʻzgarmaydi. */
import { getLang } from '../i18n';

/** SHA-256(egasi kaliti) — js/fikr.js dagi CFG.owner bilan bir xil */
const OWNER = 'd334a182444e562a7b7793445d07de9716924308b1887db6b15452f719ab5560';

export function isOwner(): boolean { try { return localStorage.getItem('kps_owner') === '1'; } catch { return false; } }
/** Egasi faqat havola orqali (akkauntsiz) — hisob qatori yashiriladi, sessiya soʻralmaydi */
export function isLinkOwner(): boolean { try { return localStorage.getItem('kps_owner') === '1' && localStorage.getItem('kps_owner_acct') !== '1'; } catch { return false; } }
/** Akkaunt boʻyicha egalik (/me → owner): kirganda yoqiladi; chiqqanda yoki boshqa akkauntda — faqat akkauntdan kelgan belgi olib tashlanadi */
export function syncAcctOwner(owner: boolean): void {
  try {
    if (owner) { localStorage.setItem('kps_owner', '1'); localStorage.setItem('kps_owner_acct', '1'); }
    else if (localStorage.getItem('kps_owner_acct') === '1') { localStorage.removeItem('kps_owner'); localStorage.removeItem('kps_owner_acct'); }
  } catch { /* */ }
}

/** «?egasi=KALIT» — egasi rejimini yoqadi, «?egasi=off» — oʻchiradi. Kalit manzildan darhol olib tashlanadi. */
export async function initOwner(): Promise<void> {
  const m = /[?&]egasi=([^&#]+)/.exec(location.search); if (!m) return;
  const k = decodeURIComponent(m[1]);
  const clean = () => history.replaceState(null, '', location.pathname + location.hash);
  if (k === 'off') { try { localStorage.removeItem('kps_owner'); } catch { /* */ } clean(); return; }
  if (!crypto?.subtle) return;
  const h = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(k)))].map(b => b.toString(16).padStart(2, '0')).join('');
  if (h === OWNER) { try { localStorage.setItem('kps_owner', '1'); } catch { /* */ } }
  clean();
}

export function wmLabel(): string {
  const l = getLang();
  return l === 'en' ? 'ARCHEMISTRY · FREE' : l === 'ru' ? 'ARCHEMISTRY · БЕСПЛАТНО' : 'ARCHEMISTRY · BEPUL';
}

/** Belgi qoʻyiladimi (egasi uchun — yoʻq) */
export const needWm = (): boolean => !isOwner();

/** SVG oxiriga burilgan yozuvlar toʻri (viewBox boʻyicha) */
export function wmSvg(svg: string): string {
  if (!needWm() || svg.includes('id="99_Archemistry_belgi"')) return svg;
  const head = /<svg\b[^>]*>/i.exec(svg)?.[0] ?? '';
  let x0 = 0, y0 = 0, w = 0, hh = 0;
  const vb = /viewBox="\s*([-\d.e]+)[\s,]+([-\d.e]+)[\s,]+([-\d.e]+)[\s,]+([-\d.e]+)\s*"/i.exec(head);
  if (vb) { x0 = +vb[1]; y0 = +vb[2]; w = +vb[3]; hh = +vb[4]; }
  else { w = parseFloat(/\bwidth="([\d.]+)/.exec(head)?.[1] ?? '0'); hh = parseFloat(/\bheight="([\d.]+)/.exec(head)?.[1] ?? '0'); }
  if (!(w > 0 && hh > 0)) return svg;
  const step = Math.max(w, hh) / 5, fs = step / 11, t = wmLabel();
  let g = `<g id="99_Archemistry_belgi" data-name="Archemistry belgi" pointer-events="none" fill="#7a776f" fill-opacity="0.22" font-family="Archivo, DejaVu Sans, sans-serif" font-weight="600" font-size="${fs.toFixed(2)}" text-anchor="middle">`;
  for (let y = y0 + step / 2, r = 0; y < y0 + hh + step; y += step * 0.6, r++) {
    for (let x = x0 + (r % 2 ? step / 2 : 0); x < x0 + w + step; x += step) {
      g += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" transform="rotate(-30 ${x.toFixed(1)} ${y.toFixed(1)})">${t}</text>`;
    }
  }
  g += '</g>';
  const i = svg.lastIndexOf('</svg>');
  return i < 0 ? svg : svg.slice(0, i) + g + svg.slice(i);
}

/** Kanvasga toʻr chizish (joyida) */
export function wmCanvas(c: HTMLCanvasElement): HTMLCanvasElement {
  if (!needWm()) return c;
  const g = c.getContext('2d'); if (!g) return c;
  const step = Math.max(c.width, c.height) / 5, t = wmLabel();
  g.save(); g.fillStyle = 'rgba(122,119,111,.24)'; g.font = `600 ${Math.round(step / 11)}px Archivo, sans-serif`; g.textAlign = 'center';
  for (let y = step / 2, r = 0; y < c.height + step; y += step * 0.6, r++) {
    for (let x = r % 2 ? step / 2 : 0; x < c.width + step; x += step) { g.save(); g.translate(x, y); g.rotate(-Math.PI / 6); g.fillText(t, 0, 0); g.restore(); }
  }
  g.restore(); return c;
}

/** PNG/JPG (Blob yoki data: URL) → belgili PNG Blob */
export async function wmRaster(src: Blob | string): Promise<Blob> {
  const blob = typeof src === 'string' ? await (await fetch(src)).blob() : src;
  if (!needWm()) return blob;
  const bmp = await createImageBitmap(blob);
  const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
  c.getContext('2d')!.drawImage(bmp, 0, 0); bmp.close?.();
  wmCanvas(c);
  return new Promise((ok, no) => c.toBlob(b => (b ? ok(b) : no(new Error('PNG'))), 'image/png'));
}

/** DXF: ENTITIES boʻlimi oxiriga «ARCHEMISTRY_BELGI» qatlamida TEXT yozuvlari (chizma chegarasi boʻyicha) */
export function wmDxf(dxf: string): string {
  if (!needWm()) return dxf;
  const nl = dxf.includes('\r\n') ? '\r\n' : '\n';
  const L = dxf.split(/\r?\n/);
  let es = -1; for (let i = 0; i < L.length - 1; i++) if (L[i].trim() === '2' && L[i + 1].trim() === 'ENTITIES') { es = i + 1; break; }
  if (es < 0) return dxf;
  let ee = -1; for (let i = es; i < L.length - 1; i++) if (L[i].trim() === '0' && L[i + 1].trim() === 'ENDSEC') { ee = i; break; }
  if (ee < 0) return dxf;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = es + 1; i < ee - 1; i += 2) {
    const c = L[i].trim(), v = parseFloat(L[i + 1]);
    if (!Number.isFinite(v)) continue;
    if (c === '10' || c === '11') { x0 = Math.min(x0, v); x1 = Math.max(x1, v); }
    else if (c === '20' || c === '21') { y0 = Math.min(y0, v); y1 = Math.max(y1, v); }
  }
  if (!(x1 > x0 && y1 > y0)) return dxf;
  const w = x1 - x0, hh = y1 - y0, step = Math.max(w, hh) / 5, th = step / 11, t = wmLabel();
  const out: string[] = [];
  for (let y = y0 + step / 2, r = 0; y < y1; y += step * 0.6, r++) {
    for (let x = x0 + (r % 2 ? step / 2 : 0); x < x1; x += step) {
      out.push('0', 'TEXT', '8', 'ARCHEMISTRY_BELGI', '62', '8', '10', x.toFixed(2), '20', y.toFixed(2), '30', '0', '40', th.toFixed(2), '1', t, '50', '30', '72', '1', '11', x.toFixed(2), '21', y.toFixed(2), '31', '0');
    }
  }
  L.splice(ee, 0, ...out);
  return L.join(nl);
}

/** download() uchun: fayl nomi va maʼlumotga qarab belgi qoʻyish */
export async function wmFile(name: string, data: string | Blob, type: string): Promise<string | Blob> {
  if (!needWm()) return data;
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (ext === 'svg') return typeof data === 'string' ? wmSvg(data) : new Blob([wmSvg(await data.text())], { type: 'image/svg+xml' });
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') return wmRaster(data);
  if (ext === 'dxf') return typeof data === 'string' ? wmDxf(data) : new Blob([wmDxf(await data.text())], { type: type || 'application/dxf' });
  return data;
}
