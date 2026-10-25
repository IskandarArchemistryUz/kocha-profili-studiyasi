import { describe, it, expect, beforeEach } from 'vitest';
import { initEsriKey, imageryTile, imageryTemplate, esriKey, grayTile512, _resetEsriKey } from '../../src/context/esrikey';

describe('Esri kaliti', () => {
  beforeEach(() => _resetEsriKey());
  it('kalit kelsa — ArcGIS Location Platform manzili, token bilan', async () => {
    const f = (async () => new Response(JSON.stringify({ arcgis: 'AAPTabcdefghijklmnopqrstuvwxyz' }), { status: 200 })) as typeof fetch;
    expect(await initEsriKey(f, 'https://api.test')).toBe('AAPTabcdefghijklmnopqrstuvwxyz');
    expect(imageryTile(16, 10, 20)).toBe('https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/16/20/10?token=AAPTabcdefghijklmnopqrstuvwxyz');
    expect(imageryTemplate()).toContain('/{z}/{y}/{x}?token=');
    // kulrang fon — Static Basemap Tiles, 512 px sxema (daraja, qator, ustun)
    expect(grayTile512(15, 10, 20)).toBe('https://static-map-tiles-api.arcgis.com/arcgis/rest/services/static-basemap-tiles-service/v1/arcgis/light-gray/static/tile/15/20/10?token=AAPTabcdefghijklmnopqrstuvwxyz');
  });
  it('kalit yoʻq yoki server ishlamasa — eski kalitsiz manzil', async () => {
    const f = (async () => { throw new Error('net'); }) as typeof fetch;
    expect(await initEsriKey(f, 'https://api.test')).toBeNull();
    expect(esriKey()).toBeNull();
    expect(grayTile512(15, 10, 20)).toBeNull();
    expect(imageryTile(16, 10, 20)).toBe('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/16/20/10');
  });
  it('notoʻgʻri qiymat qabul qilinmaydi', async () => {
    const f = (async () => new Response(JSON.stringify({ arcgis: 'x"><script>' }), { status: 200 })) as typeof fetch;
    expect(await initEsriKey(f, 'https://api.test')).toBeNull();
  });
});
