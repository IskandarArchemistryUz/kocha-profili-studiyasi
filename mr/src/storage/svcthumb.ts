/**
 * Servis loyihasi kartasining kichik rasmi (23.11.2026, egasi: «loyiha rasmlarini kichik qilib koʻrsatsin»).
 * `svcthumb@<id>` (localStorage) — data:image URL; Loyihalarim kartasida <img> sifatida koʻrsatiladi.
 * Faqat servis loyihasi (s_…) uchun yoziladi; servis loyihasi oʻchirilganda `…@id` bilan birga oʻchadi (removeSvc).
 */
import { isSvcId } from './svcprojects';

export const TH_W = 480, TH_H = 236, MAX_LEN = 90_000;
const key = (id: string) => `svcthumb@${id}`;
const OK = /^data:image\/(png|jpeg|webp|svg\+xml)[;,]/;

export function getSvcThumb(id: string): string | null {
  try { const v = localStorage.getItem(key(id)); return v && OK.test(v) && v.length <= MAX_LEN ? v : null; } catch { return null; }
}
export function setSvcThumb(id: string | null, url: string | null | undefined): void {
  if (!id || !isSvcId(id) || !url || !OK.test(url) || url.length > MAX_LEN) return;
  try { localStorage.setItem(key(id), url); } catch { /* joy yoʻq — eskizsiz */ }
}
/** Rasm (URL/data URL) yoki SVG → kichik JPEG (TH_W×TH_H ichiga, «contain», fon bilan) */
export async function shrink(src: string | SVGSVGElement, bg = '#ffffff'): Promise<string | null> {
  let u = '', revoke = false;
  if (typeof src === 'string') u = src;
  else {
    const c = src.cloneNode(true) as SVGSVGElement, vb = src.viewBox?.baseVal;
    const w = vb?.width || src.clientWidth || 800, h = vb?.height || src.clientHeight || 400;
    c.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); c.setAttribute('width', String(w)); c.setAttribute('height', String(h)); c.removeAttribute('style');
    u = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(c)], { type: 'image/svg+xml' })); revoke = true;
  }
  try {
    const im = new Image(); im.crossOrigin = 'anonymous'; im.src = u; await im.decode();
    const k = Math.min(TH_W / (im.naturalWidth || 1), TH_H / (im.naturalHeight || 1)), w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
    const cv = document.createElement('canvas'); cv.width = TH_W; cv.height = TH_H; const g = cv.getContext('2d')!;
    g.fillStyle = bg; g.fillRect(0, 0, TH_W, TH_H); g.drawImage(im, (TH_W - w) / 2, (TH_H - h) / 2, w, h);
    return cv.toDataURL('image/jpeg', 0.72);
  } catch { return null; } finally { if (revoke) URL.revokeObjectURL(u); }
}
/** Hudud halqasi ([uzunlik, kenglik]) → kichik SVG (Joyshunos) */
export function ringSvg(ring: [number, number][], color = '#c0643a'): string | null {
  if (ring.length < 3) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of ring) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const kx = Math.cos(((y0 + y1) / 2) * Math.PI / 180), w = Math.max((x1 - x0) * kx, 1e-7), hh = Math.max(y1 - y0, 1e-7), P = 14;
  const s = Math.min((TH_W - 2 * P) / w, (TH_H - 2 * P) / hh), ox = (TH_W - w * s) / 2, oy = (TH_H - hh * s) / 2;
  const pts = ring.map(([x, y]) => `${(ox + (x - x0) * kx * s).toFixed(1)},${(oy + (y1 - y) * s).toFixed(1)}`).join(' ');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TH_W} ${TH_H}"><polygon points="${pts}" fill="${color}" fill-opacity=".12" stroke="${color}" stroke-width="3" stroke-linejoin="round" stroke-dasharray="10 6"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
