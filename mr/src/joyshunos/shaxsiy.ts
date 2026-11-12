/**
 * Shaxsiy maʼlumot qatlami (12.11.2026) — server: /private/* (server/src/private.js). Hozircha faqat egasi hisobi.
 * Foydalanuvchi oʻz binolar maʼlumotini GeoJSON (WGS84) koʻrinishida yuklaydi: qavat, xonadon, qurilgan yil, devor, manzil.
 * Maʼlumot faqat shu hisobga koʻrinadi; «Ijtimoiy skaner» uni OSM binolariga avtomatik ulaydi (bino markazi poligon ichida).
 * Server ham, brauzer ham faqat ruxsat etilgan maydonlarni oladi — F.I.Sh., STIR, kadastr raqami kabi ustunlar yuborilmaydi.
 */
import type { LngLat } from '../core/doc';
import { apiBase } from '../account/config';

/** Bir xonadonda oʻrtacha kishi — mahalla pasportlari oʻrtachasi (Master rejadagi sukut bilan bir xil) */
export const HH = 3.54;

export interface PrivProps { qavat?: number; xonadon?: number; yil?: number; devor?: string; manzil?: string; turi?: string }
export interface PrivLayer { id: number; name: string; source: string; n?: number }
export interface PrivFeature { l: number; p: PrivProps; g: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] } }
export interface PrivData { layers: PrivLayer[]; features: PrivFeature[] }

const api = async <T>(path: string, body?: unknown): Promise<T> => {
  const r = await fetch(apiBase() + path, { method: body === undefined ? 'GET' : 'POST', credentials: 'include', headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { message?: string }).message || `${r.status}`);
  return j as T;
};
export const privLayers = () => api<{ layers: PrivLayer[] }>('/private/layers').then(j => j.layers);
export const privDelete = (id: number) => api<{ ok: boolean }>(`/private/layers/${id}/delete`, {});
export const privFeatures = (bb: [number, number, number, number]) => api<PrivData>(`/private/features?bbox=${bb.map(v => v.toFixed(5)).join(',')}`);

/** Ustun nomlari (katta-kichik harf farqsiz) → ruxsat etilgan maydon. Qolgan ustunlar tashlab yuboriladi. */
const ALIAS: Record<string, keyof PrivProps> = {
  qavat: 'qavat', qavatlar: 'qavat', floors: 'qavat', levels: 'qavat', 'building:levels': 'qavat', etazh: 'qavat', этажей: 'qavat', этаж: 'qavat',
  xonadon: 'xonadon', kv_soni: 'xonadon', flats: 'xonadon', apartments: 'xonadon', квартир: 'xonadon',
  yil: 'yil', qurilgan_y: 'yil', year: 'yil', built: 'yil', год: 'yil',
  devor: 'devor', material: 'devor', стены: 'devor',
  manzil: 'manzil', address: 'manzil', адрес: 'manzil',
  turi: 'turi', tur: 'turi', type: 'turi',
};
export function pickProps(p: Record<string, unknown> | null | undefined): PrivProps {
  const o: PrivProps = {};
  for (const [k, v] of Object.entries(p ?? {})) { const f = ALIAS[k.toLowerCase()]; if (f && v != null && v !== '' && o[f] === undefined) (o as Record<string, unknown>)[f] = v; }
  return o;
}

/** GeoJSON matni → yuklashga tayyor obyektlar; xato boʻlsa — tushunarli xabar */
export function parseUpload(text: string): { features: { type: 'Feature'; properties: PrivProps; geometry: unknown }[]; dropped: string[] } {
  let j: { type?: string; features?: { properties?: Record<string, unknown>; geometry?: { type?: string; coordinates?: unknown } }[] };
  try { j = JSON.parse(text); } catch { throw new Error('GeoJSON oʻqilmadi'); }
  if (j?.type !== 'FeatureCollection' || !Array.isArray(j.features)) throw new Error('GeoJSON FeatureCollection kerak');
  const dropped = new Set<string>(), out: { type: 'Feature'; properties: PrivProps; geometry: unknown }[] = [];
  for (const f of j.features) {
    const g = f?.geometry; if (!g || (g.type !== 'Polygon' && g.type !== 'MultiPolygon')) continue;
    const first = JSON.stringify(g.coordinates).match(/-?\d+(\.\d+)?/g)?.slice(0, 2).map(Number) ?? [];
    if (first.length < 2 || Math.abs(first[0]) > 180 || Math.abs(first[1]) > 90) throw new Error('Koordinatalar WGS84 (gradus) da boʻlishi kerak — QGIS da EPSG:4326 ga eksport qiling');
    for (const k of Object.keys(f.properties ?? {})) if (!ALIAS[k.toLowerCase()]) dropped.add(k);
    out.push({ type: 'Feature', properties: pickProps(f.properties), geometry: g });
  }
  if (!out.length) throw new Error('Faylda poligon topilmadi');
  return { features: out, dropped: [...dropped] };
}

/** Yuklash: qatlam yaratiladi, obyektlar ≤ ~90 KB boʻlaklarda yuboriladi (nginx chegarasi 128 KB) */
export async function privUpload(name: string, source: string, features: unknown[], onProgress: (done: number, all: number) => void): Promise<{ id: number; added: number; skipped: number }> {
  const { id } = await api<{ id: number }>('/private/layers', { name, source });
  let added = 0, skipped = 0, i = 0;
  while (i < features.length) {
    const part: unknown[] = []; let size = 0;
    while (i < features.length && part.length < 400) { const s = JSON.stringify(features[i]).length; if (part.length && size + s > 90_000) break; part.push(features[i]); size += s; i++; }
    const r = await api<{ added: number; skipped: number }>(`/private/layers/${id}/features`, { features: part });
    added += r.added; skipped += r.skipped; onProgress(i, features.length);
  }
  return { id, added, skipped };
}

const inRing = (x: number, y: number, r: number[][]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
const polys = (f: PrivFeature): number[][][][] => (f.g.type === 'Polygon' ? [f.g.coordinates as number[][][]] : f.g.coordinates as number[][][][]);
const inFeat = (x: number, y: number, f: PrivFeature) => polys(f).some(p => inRing(x, y, p[0]) && !p.slice(1).some(h => inRing(x, y, h)));
const ctr = (r: LngLat[]): LngLat => [r.reduce((a, p) => a + p[0], 0) / r.length, r.reduce((a, p) => a + p[1], 0) / r.length];

/**
 * OSM binolariga ulash: bino markazi shaxsiy poligon ichida → oʻsha obyekt. Bir obyekt bir necha OSM boʻlakka tushsa,
 * xonadonlar maydon ulushi boʻyicha boʻlinadi (share). Natija — har bino uchun { f, share } yoki null.
 */
export function attachPriv(rings: LngLat[][], areas: number[], d: PrivData): ({ f: PrivFeature; share: number } | null)[] {
  const bb = d.features.map(f => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of polys(f)) for (const [x, y] of p[0]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return [x0, y0, x1, y1]; });
  const hit = rings.map(r => { const [x, y] = ctr(r); const i = d.features.findIndex((f, k) => x >= bb[k][0] && x <= bb[k][2] && y >= bb[k][1] && y <= bb[k][3] && inFeat(x, y, f)); return i >= 0 ? d.features[i] : null; });
  const tot = new Map<PrivFeature, number>();
  hit.forEach((f, i) => { if (f) tot.set(f, (tot.get(f) ?? 0) + areas[i]); });
  return hit.map((f, i) => (f ? { f, share: areas[i] / (tot.get(f) || 1) } : null));
}
