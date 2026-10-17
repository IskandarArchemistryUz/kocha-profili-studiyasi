/**
 * Fon xaritasi (atrof yuklanguncha joy tanlash uchun): OpenFreeMap «Liberty» vektor uslubi — kalitsiz,
 * MapLibre bilan ekrandan tashqarida chiziladi va bitta tasvir sifatida sahnaga qoʻyiladi.
 * © OpenMapTiles, © OpenStreetMap hissachilari. MapLibre faqat shu yerda va kerak boʻlganda yuklanadi.
 */
import type { LngLat } from '../core/doc';

export const OFM_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
export interface BaseImage { image: Blob; nw: LngLat; se: LngLat }

/** center atrofida 2·radius metrli kvadrat — W piksellik tasvir */
export async function renderVectorBase(center: LngLat, radius: number, W = 2048, timeout = 20000): Promise<BaseImage | null> {
  const ml = (await import('maplibre-gl')).default;
  const mPerPx = (2 * radius) / W, z = Math.log2(156543.034 * Math.cos(center[1] * Math.PI / 180) / mPerPx);
  const box = document.createElement('div');
  Object.assign(box.style, { position: 'fixed', left: '-99999px', top: '0', width: `${W}px`, height: `${W}px`, pointerEvents: 'none' });
  document.body.append(box);
  const map = new ml.Map({ container: box, style: OFM_STYLE, center: center as [number, number], zoom: z, interactive: false, attributionControl: false, pixelRatio: 1, fadeDuration: 0, canvasContextAttributes: { preserveDrawingBuffer: true } } as never);
  try {
    // yozuvlar: avval oʻzbekcha, keyin lotin, keyin asl nomi
    map.once('styledata', () => {
      for (const l of map.getStyle().layers ?? []) if (l.type === 'symbol' && (l.layout as Record<string, unknown> | undefined)?.['text-field'])
        map.setLayoutProperty(l.id, 'text-field', ['coalesce', ['get', 'name:uz'], ['get', 'name:latin'], ['get', 'name']]);
    });
    const ok = await new Promise<boolean>(res => { const t = setTimeout(() => res(false), timeout); map.once('idle', () => { clearTimeout(t); res(true); }); map.once('error', () => { /* bitta plitka xatosi — idle kutiladi */ }); });
    if (!ok) return null;
    const b = map.getBounds(), cv = map.getCanvas();
    const image = await new Promise<Blob | null>(r => cv.toBlob(r, 'image/jpeg', 0.9));
    return image ? { image, nw: [b.getWest(), b.getNorth()], se: [b.getEast(), b.getSouth()] } : null;
  } finally { map.remove(); box.remove(); }
}
