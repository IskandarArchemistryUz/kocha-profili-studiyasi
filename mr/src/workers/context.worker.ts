/// <reference lib="webworker" />
/** Kontekstni yuklash va tahlil qilish — asosiy oqim (sahna, tugmalar) qotib qolmasligi uchun */
import { fetchContext } from '../context/load';
import type { LngLat } from '../core/doc';

self.onmessage = async (e: MessageEvent<{ id: number; center: LngLat; radius: number }>) => {
  const { id, center, radius } = e.data;
  const post = (m: unknown) => (self as unknown as Worker).postMessage(m);
  try {
    const b = await fetchContext(center, radius, (msg, frac) => post({ id, progress: { msg, frac } }));
    post({ id, bundle: b });
  } catch (err) { post({ id, error: (err as Error).message || String(err) }); }
};
