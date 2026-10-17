/**
 * Cheksiz fon xaritasi: bitta yashirin MapLibre xaritasi kamera koʻrayotgan joyni chizadi,
 * natija (2D nusxa) sahnada yer tekisligiga qoʻyiladi. Kamera surilsa yoki yaqinlashsa — qayta chiziladi.
 * MapLibre faqat shu yerda va kerak boʻlganda yuklanadi.
 */
import type { LngLat } from '../core/doc';
import { mapStyle } from './mapstyle';

export interface BaseImage { canvas: HTMLCanvasElement; nw: LngLat; se: LngLat }
type ML = typeof import('maplibre-gl');

export class LiveBase {
  private ml: ML | null = null;
  private map: import('maplibre-gl').Map | null = null;
  private box: HTMLDivElement | null = null;
  private styleKey = '';
  private busy: Promise<BaseImage | null> | null = null;
  private next: { center: LngLat; radius: number; style: string; pal: string; labels: boolean } | null = null;
  constructor(private W = 2048) {}

  /** center atrofida 2·radius metrli kvadrat; parallel soʻrovlardan faqat oxirgisi bajariladi */
  async render(center: LngLat, radius: number, style: 'stil' | 'sat', pal: string, labels: boolean): Promise<BaseImage | null> {
    this.next = { center, radius, style, pal, labels };
    while (this.busy) { await this.busy.catch(() => null); }
    const job = this.next; this.next = null; if (!job) return null;
    this.busy = this.draw(job).finally(() => { this.busy = null; });
    return this.busy;
  }

  private async draw(j: { center: LngLat; radius: number; style: string; pal: string; labels: boolean }): Promise<BaseImage | null> {
    if (!this.ml) this.ml = (await import('maplibre-gl')).default as unknown as ML;
    const W = this.W, mPerPx = (2 * j.radius) / W, z = Math.log2(78271.517 * Math.cos(j.center[1] * Math.PI / 180) / mPerPx);
    const key = `${j.style}|${j.pal}|${j.labels}`;
    if (!this.map) {
      this.box = document.createElement('div');
      Object.assign(this.box.style, { position: 'fixed', left: '-99999px', top: '0', width: `${W}px`, height: `${W}px`, pointerEvents: 'none' });
      document.body.append(this.box);
      this.map = new this.ml.Map({ container: this.box, style: mapStyle(j.style as 'stil' | 'sat', j.pal, j.labels) as never, center: j.center as [number, number], zoom: z, interactive: false, attributionControl: false, pixelRatio: 1, fadeDuration: 0, canvasContextAttributes: { preserveDrawingBuffer: true, antialias: true } } as never);
      this.styleKey = key;
    } else {
      if (key !== this.styleKey) { this.map.setStyle(mapStyle(j.style as 'stil' | 'sat', j.pal, j.labels) as never); this.styleKey = key; }
      this.map.jumpTo({ center: j.center as [number, number], zoom: z });
    }
    const map = this.map;
    const ok = await new Promise<boolean>(res => { const t = setTimeout(() => res(false), 15000); map.once('idle', () => { clearTimeout(t); res(true); }); map.triggerRepaint(); });
    if (!ok) return null;
    const src = map.getCanvas(), cv = document.createElement('canvas'); cv.width = src.width; cv.height = src.height;
    cv.getContext('2d')!.drawImage(src, 0, 0);
    const b = map.getBounds();
    return { canvas: cv, nw: [b.getWest(), b.getNorth()], se: [b.getEast(), b.getSouth()] };
  }

  dispose(): void { this.map?.remove(); this.box?.remove(); this.map = null; this.box = null; }
}
