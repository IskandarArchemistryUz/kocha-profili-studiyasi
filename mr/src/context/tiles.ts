/**
 * Plitkali manbalar: relyef (Terrarium balandlik plitkalari) va sunʼiy yoʻldosh tasviri (Esri World Imagery).
 * Web Mercator matematikasi sof funksiyalar; yuklash va dekodlash brauzer API (fetch, createImageBitmap, OffscreenCanvas)
 * bilan — asosiy oqimda ham, workerda ham ishlaydi.
 */
import type { LngLat } from '../core/doc';
import type { BBox } from './osm';

export const TERRAIN_URL = (z: number, x: number, y: number) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
export const IMAGERY_URL = (z: number, x: number, y: number) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
/** Fon xaritasi (atrof yuklanmaganda joy tanlash uchun): Esri Light Gray Canvas — asos va yozuvlar (kalitsiz) */
export const GRAY_URL = (z: number, x: number, y: number) => `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/${z}/${y}/${x}`;
export const GRAY_REF_URL = (z: number, x: number, y: number) => `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/${z}/${y}/${x}`;

/** Global Mercator piksel koordinatasi (256 px plitka) */
export function mercPx(p: LngLat, z: number): [number, number] {
  const n = 256 * 2 ** z, lat = Math.max(-85.0511, Math.min(85.0511, p[1])) * Math.PI / 180;
  return [(p[0] + 180) / 360 * n, (1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2 * n];
}

export function tileRange(b: BBox, z: number): { x0: number; y0: number; x1: number; y1: number } {
  const [s, w, n, e] = b, a = mercPx([w, n], z), c = mercPx([e, s], z);
  return { x0: Math.floor(a[0] / 256), y0: Math.floor(a[1] / 256), x1: Math.floor(c[0] / 256), y1: Math.floor(c[1] / 256) };
}

/** Terrarium kodlashi: balandlik = R·256 + G + B/256 − 32768 (m) */
export const terrarium = (r: number, g: number, b: number) => r * 256 + g + b / 256 - 32768;

/** Balandlik toʻri: mahalliy kvadrat [-R, R]², qadam `step` m; qiymatlar mutlaq (dengiz sathidan) */
export interface TerrainGrid { n: number; step: number; radius: number; h: Float32Array; center: LngLat; min: number; max: number }

async function bitmap(url: string, f: typeof fetch): Promise<ImageBitmap> {
  const r = await f(url, { mode: 'cors' });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return createImageBitmap(await r.blob());
}

function canvas(w: number, h: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}

/** Plitkalarni bitta tasvirga tikish */
async function mosaic(b: BBox, z: number, url: (z: number, x: number, y: number) => string, f: typeof fetch, onTile?: () => void) {
  const t = tileRange(b, z), W = (t.x1 - t.x0 + 1) * 256, H = (t.y1 - t.y0 + 1) * 256;
  const cv = canvas(W, H), cx = cv.getContext('2d') as OffscreenCanvasRenderingContext2D;
  let ok = 0;
  const jobs: Promise<void>[] = [];
  for (let x = t.x0; x <= t.x1; x++) for (let y = t.y0; y <= t.y1; y++) {
    jobs.push(bitmap(url(z, x, y), f).then(bm => { cx.drawImage(bm, (x - t.x0) * 256, (y - t.y0) * 256); bm.close?.(); ok++; onTile?.(); }).catch(() => { onTile?.(); }));
  }
  await Promise.all(jobs);
  return { cv, cx, x0: t.x0 * 256, y0: t.y0 * 256, W, H, ok, total: jobs.length };
}

const latK = (lat: number) => 111_320 * Math.cos(lat * Math.PI / 180);

/** Relyef: z=14 plitkalar (Toshkentda ≈7 m/px), mahalliy toʻrga bilinear namuna */
export async function loadTerrain(center: LngLat, radius: number, bb: BBox, f: typeof fetch = fetch, step = 10): Promise<TerrainGrid | null> {
  const z = 14, m = await mosaic(bb, z, TERRAIN_URL, f);
  if (!m.ok) return null;
  const img = m.cx.getImageData(0, 0, m.W, m.H).data;
  const at = (px: number, py: number) => {
    const x = Math.max(0, Math.min(m.W - 1, Math.round(px))), y = Math.max(0, Math.min(m.H - 1, Math.round(py))), i = (y * m.W + x) * 4;
    return terrarium(img[i], img[i + 1], img[i + 2]);
  };
  const samp = (px: number, py: number) => {
    const x = Math.floor(px), y = Math.floor(py), fx = px - x, fy = py - y;
    return at(x, y) * (1 - fx) * (1 - fy) + at(x + 1, y) * fx * (1 - fy) + at(x, y + 1) * (1 - fx) * fy + at(x + 1, y + 1) * fx * fy;
  };
  const n = Math.round(2 * radius / step) + 1, h = new Float32Array(n * n), kx = latK(center[1]), ky = 111_132;
  let min = Infinity, max = -Infinity;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = -radius + i * step, y = -radius + j * step;
    const [px, py] = mercPx([center[0] + x / kx, center[1] + y / ky], z);
    const v = samp(px - m.x0 - 0.5, py - m.y0 - 0.5);
    h[j * n + i] = v; if (v < min) min = v; if (v > max) max = v;
  }
  // Terrarium dengiz/boʻsh joyda −32768 beradi — bunday toʻr yaroqsiz
  if (!(min > -500 && max < 9000)) return null;
  return { n, step, radius, h, center, min, max };
}

/** Toʻrdan mahalliy (x, y) nuqta balandligi — markaz balandligiga nisbatan */
export function terrainSampler(g: TerrainGrid | null): (x: number, y: number) => number {
  if (!g) return () => 0;
  const c = g.h[((g.n - 1) >> 1) * g.n + ((g.n - 1) >> 1)];
  return (x, y) => {
    const fx = Math.max(0, Math.min(g.n - 1, (x + g.radius) / g.step)), fy = Math.max(0, Math.min(g.n - 1, (y + g.radius) / g.step));
    const i = Math.min(g.n - 2, Math.floor(fx)), j = Math.min(g.n - 2, Math.floor(fy)), u = fx - i, v = fy - j, H = g.h, n = g.n;
    return H[j * n + i] * (1 - u) * (1 - v) + H[j * n + i + 1] * u * (1 - v) + H[(j + 1) * n + i] * (1 - u) * v + H[(j + 1) * n + i + 1] * u * v - c;
  };
}

/** Sunʼiy yoʻldosh tasviri: tikilgan tasvir + uning Mercator joylashuvi (UV hisoblash uchun) */
export interface Imagery { image: Blob; z: number; x0: number; y0: number; W: number; H: number }

export async function loadImagery(radius: number, bb: BBox, f: typeof fetch = fetch, onTile?: () => void): Promise<Imagery | null> {
  const z = radius <= 450 ? 18 : radius <= 900 ? 17 : 16;
  const m = await mosaic(bb, z, IMAGERY_URL, f, onTile);
  if (!m.ok) return null;
  const image = 'convertToBlob' in m.cv ? await (m.cv as OffscreenCanvas).convertToBlob({ type: 'image/jpeg', quality: 0.86 })
    : await new Promise<Blob>((ok, no) => (m.cv as HTMLCanvasElement).toBlob(b => b ? ok(b) : no(new Error('toBlob')), 'image/jpeg', 0.86));
  return { image, z, x0: m.x0, y0: m.y0, W: m.W, H: m.H };
}

/** Fon xaritasi: atrof yuklanguncha sahna ostida (maket — CARTO, sunʼiy yoʻldosh — Esri) */
export async function loadBaseMap(center: LngLat, radius: number, kind: 'maket' | 'sputnik', f: typeof fetch = fetch): Promise<{ image: Blob; nw: LngLat; se: LngLat } | null> {
  const dLat = radius / 110_540, dLng = radius / latK(center[1]);
  const bb: BBox = [center[1] - dLat, center[0] - dLng, center[1] + dLat, center[0] + dLng];   // janub, gʻarb, shimol, sharq
  const z = radius <= 1200 ? 16 : 15;
  const m = await mosaic(bb, z, kind === 'sputnik' ? IMAGERY_URL : GRAY_URL, f);
  if (!m.ok) return null;
  if (kind === 'maket') { const r = await mosaic(bb, z, GRAY_REF_URL, f); if (r.ok) m.cx.drawImage(r.cv as OffscreenCanvas, 0, 0); }   // joy nomlari
  // yuklanmagan plitkalar qora emas — fon rangida
  const out = canvas(m.W, m.H), oc = out.getContext('2d') as OffscreenCanvasRenderingContext2D;
  oc.fillStyle = kind === 'sputnik' ? '#8a8f86' : '#f2efe9'; oc.fillRect(0, 0, m.W, m.H); oc.drawImage(m.cv as OffscreenCanvas, 0, 0);
  const image = 'convertToBlob' in out ? await (out as OffscreenCanvas).convertToBlob({ type: 'image/jpeg', quality: 0.88 })
    : await new Promise<Blob>((ok, no) => (out as HTMLCanvasElement).toBlob(b => b ? ok(b) : no(new Error('toBlob')), 'image/jpeg', 0.88));
  return { image, nw: pxToLngLat(m.x0, m.y0, z), se: pxToLngLat(m.x0 + m.W, m.y0 + m.H, z) };
}
/** Mercator piksel → geografik nuqta */
export function pxToLngLat(px: number, py: number, z: number): LngLat {
  const n = 256 * 2 ** z;
  return [px / n * 360 - 180, Math.atan(Math.sinh(Math.PI * (1 - 2 * py / n))) * 180 / Math.PI];
}

/** Tasvirdagi UV (0..1) — geografik nuqta uchun */
export function imageryUV(im: Pick<Imagery, 'z' | 'x0' | 'y0' | 'W' | 'H'>, p: LngLat): [number, number] {
  const [px, py] = mercPx(p, im.z);
  return [(px - im.x0) / im.W, 1 - (py - im.y0) / im.H];
}
