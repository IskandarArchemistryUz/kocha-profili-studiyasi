/**
 * Render studiyasi manbalari va natijalari — umumiy IndexedDB keshida («archemistry-mr» → cache).
 * Boshqa xizmatlar `sendToRender()` bilan rasm yoki model yuboradi va render.html ochiladi.
 */
import { cacheGet, cachePut } from '../storage/db';
import type { Subject } from './providers';

export type From = 'mr' | 'joy' | 'ks' | 'chz' | 'fayl' | 'natija';
/** Kirish rasmi (asos yoki referens) — dataURL */
export interface RenderSrc { id: string; name: string; from: From; subj: Subject; t: string; img: string; w?: number; h?: number }
/**
 * Natija: 13.11 dan — server tarixidagi ish (job). Keshda faqat 512 px eskiz (src) va asosning kichik nusxasi (orig);
 * toʻliq rasm har ochilganda serverdan (qisqa muddatli havola). Eski yozuvlarda (job yoʻq) src — toʻliq rasm.
 */
export interface RenderOut { id: string; srcId: string; src: string; orig: string; name: string; prompt: string; model: string; t: string; sty: string; fid: string; refs: number; job?: string; status?: string }
export const K_SRC = 'render-src', K_OUT = 'render-out', MAX_SRC = 30, MAX_OUT = 60;
const uid = (p: string) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export async function listSrc(): Promise<RenderSrc[]> { return (await cacheGet<RenderSrc[]>(K_SRC)) ?? []; }
export async function listOut(): Promise<RenderOut[]> { return (await cacheGet<RenderOut[]>(K_OUT)) ?? []; }
export async function addSrc(s: Omit<RenderSrc, 'id' | 't'>): Promise<RenderSrc> {
  const it: RenderSrc = { ...s, id: uid('s'), t: new Date().toISOString() };
  const all = await listSrc(); await cachePut(K_SRC, [it, ...all].slice(0, MAX_SRC)); return it;
}
export async function delSrc(id: string): Promise<void> { await cachePut(K_SRC, (await listSrc()).filter(s => s.id !== id)); }
export async function addOut(o: Omit<RenderOut, 'id' | 't'> & { t?: string }): Promise<RenderOut> {
  const it: RenderOut = { ...o, id: o.job ? `j${o.job}` : uid('r'), t: o.t ?? new Date().toISOString() };
  const all = (await listOut()).filter(x => x.id !== it.id);
  await cachePut(K_OUT, [it, ...all].sort((a, b) => b.t.localeCompare(a.t)).slice(0, MAX_OUT)); return it;
}
export async function delOut(id: string): Promise<void> { await cachePut(K_OUT, (await listOut()).filter(s => s.id !== id)); }

const blobUrl = (b: Blob) => new Promise<string>((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => no(r.error); r.readAsDataURL(b); });

/** Boshqa xizmatdan: kadrni qoʻshish va Render studiyasini ochish (render.html shu rasmni asos qilib ochadi) */
export async function sendToRender(s: Omit<RenderSrc, 'id' | 't'>, href = './render.html'): Promise<void> {
  // E1 (11.11, egasi: b variant): toza rasm Render studiyasiga — PNG narxida (2 tanga); oldin darvozasiz ketardi va u yerdan saqlab olinardi
  if (s.from !== 'fayl' && s.from !== 'natija') {
    const { exportGate, needWm, freeRaster } = await import('../core/wm');
    const mode = await exportGate({ name: `render-${s.from}.png`, item: 'mr.png', sample: s.img, paid: true });
    if (!mode) return;
    if (mode === 'wm' && needWm()) { const b = await freeRaster(s.img); s = { ...s, w: undefined, h: undefined, img: await new Promise<string>((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => no(r.error); r.readAsDataURL(b); }) }; }   // hisob oʻchiq (mahalliy sinov) — belgili
  }
  // Render 1-bosqich (13.11): Master reja kadri 2048 px WebP ga kichraytiriladi (serverga shu hajmda ketadi, kesh ham yengil)
  if (s.from === 'mr' && typeof document !== 'undefined') {
    try { const { toUpload } = await import('./api'); const r = await toUpload(s.img, 2048); s = { ...s, w: r.w, h: r.h, img: await blobUrl(r.blob) }; } catch { /* kichraytirilmasa — asl kadr */ }
  }
  if (!s.w && typeof Image !== 'undefined') { const im = new Image(); im.src = s.img; try { await im.decode(); s = { ...s, w: im.naturalWidth, h: im.naturalHeight }; } catch { /* oʻlchamsiz */ } }
  const it = await addSrc(s);
  location.href = `${href}#/s/${it.id}`;
}
