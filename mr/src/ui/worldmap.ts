/**
 * Dunyo xaritasi — Master rejada joy tanlash uchun. 3D sahna mahalliy (metrli) tekislikda ishlaydi va
 * ~16 km dan uzoqqa chiqmaydi; undan nariga uzoqlashtirilganda (yoki «Dunyo» tugmasi, yoki qidiruvda
 * davlat / viloyat / shahar tanlanganda) shu interaktiv MapLibre xaritasi ochiladi: butun dunyogacha
 * surish va yaqinlashtirish mumkin. Yetarlicha yaqinlashtirilganda (z ≥ ARRIVE) — 3D sahnaga qaytiladi.
 */
import { h } from './dom';
import { tr, getLang } from '../i18n';
import { worldStyle, basePrefs } from '../context/mapstyle';
import type { LngLat } from '../core/doc';

type ML = typeof import('maplibre-gl');
/** Shu zoomdan yaqinroq — 3D sahna (koʻrinish ≈ 3–4 km) */
export const ARRIVE = 13.2;
/** MapLibre (512 px plitka): z = 0 da ekvatorda 1 px necha metr */
const M0 = 78271.517;
/** Ekran yarim eni (m) → MapLibre zoom (shu enli xaritada) */
export function zoomFor(halfM: number, lat: number, widthPx: number): number {
  const mpp = (2 * halfM) / Math.max(320, widthPx);
  return Math.log2((M0 * Math.cos(lat * Math.PI / 180)) / mpp);
}

export interface WorldOpts {
  onArrive: (c: LngLat, halfM: number) => void;   // yaqinlashtirildi yoki «Shu yerda ochish»
  onClose: () => void;                             // «3D ga qaytish» (joy oʻzgarmaydi)
  inset?: () => number;                            // chap panel eni (px): markaz koʻrinadigan qismda boʻlsin
}

export class WorldMap {
  readonly el: HTMLDivElement;
  private ml: ML | null = null;
  private map: import('maplibre-gl').Map | null = null;
  private box: HTMLDivElement;
  private marker: import('maplibre-gl').Marker | null = null;
  private silent = false;
  private css = false;
  constructor(private o: WorldOpts) {
    this.box = h('div', { class: 'wm-map' });
    const here = h('button', { type: 'button', class: 'btn btn-primary btn-sm', id: 'wmHere', onclick: () => this.arrive() }, tr('Shu yerda ochish'));
    const back = h('button', { type: 'button', class: 'btn btn-sm', id: 'wmBack', onclick: () => this.o.onClose() }, tr('3D ga qaytish'));
    const bar = h('div', { class: 'wm-bar glassbar', role: 'group', 'aria-label': tr('Dunyo xaritasi') },
      h('b', {}, tr('Dunyo xaritasi')), h('span', { class: 't-small' }, tr('Joyni toping va yaqinlashtiring — 3D sahna shu yerda ochiladi')), here, back);
    this.el = h('div', { class: 'worldmap', id: 'worldMap', hidden: true }, this.box, bar);
  }
  get open(): boolean { return !this.el.hidden; }

  /** Ochish: markaz va zoom (yoki chegara qutisi [gʻarb, janub, sharq, shimol]) */
  async show(center: LngLat, zoom: number, bbox?: [number, number, number, number], mark?: LngLat): Promise<void> {
    this.el.hidden = false;
    if (!this.ml) this.ml = (await import('maplibre-gl')).default as unknown as ML;
    if (!this.css) { this.css = true; await import('maplibre-gl/dist/maplibre-gl.css'); }
    const pr = basePrefs();
    if (!this.map) {
      this.map = new this.ml.Map({
        container: this.box, style: worldStyle('stil', pr.pal, getLang()) as never, center: center as [number, number], zoom: Math.min(zoom, ARRIVE - 0.4),
        minZoom: 0, maxZoom: 18, renderWorldCopies: true, attributionControl: { compact: true, customAttribution: '© OpenMapTiles · OpenFreeMap · © OpenStreetMap' } as never,
        dragRotate: false, pitchWithRotate: false, touchPitch: false,
      });
      this.map.touchZoomRotate.disableRotation();
      this.map.addControl(new this.ml.NavigationControl({ showCompass: false }), 'bottom-right');
      this.map.on('zoomend', () => { if (!this.silent && this.open && this.map!.getZoom() >= ARRIVE) this.arrive(); });
    } else {
      this.map.resize();
      this.silent = true; this.map.jumpTo({ center: center as [number, number], zoom: Math.min(zoom, ARRIVE - 0.4) }); this.silent = false;
    }
    if (bbox) this.fit(bbox);
    this.setMark(mark ?? null);
  }
  /** Qidiruv natijasi: katta hudud — chegarasiga moslab; kichik joy — yaqinlashtirib (3D ga oʻtadi) */
  fit(bbox: [number, number, number, number]): void {
    if (!this.map) return;
    this.silent = true;
    const l = Math.min(this.o.inset?.() ?? 0, (this.box.clientWidth || 1000) * 0.5);
    this.map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: { left: l + 40, top: 130, right: 60, bottom: 60 }, maxZoom: ARRIVE - 0.4, duration: 900 });
    this.map.once('moveend', () => { this.silent = false; });
  }
  flyTo(c: LngLat, zoom: number): void { this.map?.flyTo({ center: c as [number, number], zoom, duration: 1200 }); }
  private setMark(c: LngLat | null): void {
    this.marker?.remove(); this.marker = null;
    if (c && this.ml && this.map) { const d = h('div', { class: 'wm-pin', title: tr('Loyiha') }); this.marker = new this.ml.Marker({ element: d }).setLngLat(c as [number, number]).addTo(this.map); }
  }
  private arrive(): void {
    if (!this.map) return;
    // ekran markazi va ekran yarim eni — 3D sahna aynan shu koʻrinish bilan ochiladi (sakrashsiz)
    const c = this.map.getCenter(), z = this.map.getZoom(), w = this.box.clientWidth || 1000;
    this.o.onArrive([c.lng, c.lat], (M0 * Math.cos(c.lat * Math.PI / 180) / 2 ** z) * w / 2);
  }
  hide(): void { this.el.hidden = true; this.el.classList.remove('wm-fade'); }
  /** 3D tayyor boʻlgach — yumshoq soʻnib yopiladi */
  fadeOut(): void { if (!this.open) return; this.el.classList.add('wm-fade'); setTimeout(() => { if (this.el.classList.contains('wm-fade')) this.hide(); }, 260); }
  dispose(): void { this.map?.remove(); this.map = null; this.el.remove(); }
}
