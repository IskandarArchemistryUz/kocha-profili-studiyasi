/**
 * Render studiyasi manbalari va natijalari — umumiy IndexedDB keshida («archemistry-mr» → cache).
 * Boshqa xizmatlar `sendToRender()` bilan rasm yoki model yuboradi va render.html ochiladi.
 */
import { cacheGet, cachePut } from '../storage/db';
import type { Subject } from './providers';

export type From = 'mr' | 'joy' | 'ks' | 'chz' | 'fayl' | 'natija';
/** Kirish rasmi (asos yoki referens) — dataURL */
export interface RenderSrc { id: string; name: string; from: From; subj: Subject; t: string; img: string; w?: number; h?: number }
export interface RenderOut { id: string; srcId: string; src: string; orig: string; name: string; prompt: string; model: string; t: string; sty: string; fid: string; refs: number }
export const K_SRC = 'render-src', K_OUT = 'render-out', MAX_SRC = 30, MAX_OUT = 60;
const uid = (p: string) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export async function listSrc(): Promise<RenderSrc[]> { return (await cacheGet<RenderSrc[]>(K_SRC)) ?? []; }
export async function listOut(): Promise<RenderOut[]> { return (await cacheGet<RenderOut[]>(K_OUT)) ?? []; }
export async function addSrc(s: Omit<RenderSrc, 'id' | 't'>): Promise<RenderSrc> {
  const it: RenderSrc = { ...s, id: uid('s'), t: new Date().toISOString() };
  const all = await listSrc(); await cachePut(K_SRC, [it, ...all].slice(0, MAX_SRC)); return it;
}
export async function delSrc(id: string): Promise<void> { await cachePut(K_SRC, (await listSrc()).filter(s => s.id !== id)); }
export async function addOut(o: Omit<RenderOut, 'id' | 't'>): Promise<RenderOut> {
  const it: RenderOut = { ...o, id: uid('r'), t: new Date().toISOString() };
  await cachePut(K_OUT, [it, ...(await listOut())].slice(0, MAX_OUT)); return it;
}
export async function delOut(id: string): Promise<void> { await cachePut(K_OUT, (await listOut()).filter(s => s.id !== id)); }

/** Boshqa xizmatdan: kadrni qoʻshish va Render studiyasini ochish (render.html shu rasmni asos qilib ochadi) */
export async function sendToRender(s: Omit<RenderSrc, 'id' | 't'>, href = './render.html'): Promise<void> {
  if (!s.w && typeof Image !== 'undefined') { const im = new Image(); im.src = s.img; try { await im.decode(); s = { ...s, w: im.naturalWidth, h: im.naturalHeight }; } catch { /* oʻlchamsiz */ } }
  const it = await addSrc(s);
  location.href = `${href}#/s/${it.id}`;
}
