/* Overture Maps binolari — GeoParquet (S3, ochiq) dan to'g'ridan-to'g'ri, bbox bo'yicha (32-band, 25.10.2026).
   Nega serverda: Overture PMTiles «faqat ko'zdan kechirish uchun, production emas» (docs.overturemaps.org/getting-data/cloud-sources),
   eski relizlar o'chiriladi — shuning uchun natija o'z keshimizda (90 kun) saqlanadi.
   Yo'l: STAC katalog → oxirgi reliz → buildings/building kolleksiyasi → har fayl (item) bbox i → kesishgan fayllar →
   har faylda faqat bbox statistikasi kesishgan qator guruhlari (row group) HTTP Range bilan o'qiladi (hyparquet, MIT).
   Litsenziya: ODbL 1.0 — «© OpenStreetMap contributors, Overture Maps Foundation». */
import { asyncBufferFromUrl, cachedAsyncBuffer, parquetMetadataAsync, parquetReadObjects } from 'hyparquet';
import { compressors } from 'hyparquet-compressors';

export const STAC_ROOT = 'https://stac.overturemaps.org';
/** bbox — [g'arb, janub, sharq, shimol]; ≤ 0,06° (~5–6 km) — bir so'rovda */
export const MAX_SPAN = 0.06;
const COLS = ['id', 'geometry', 'height', 'num_floors', 'bbox'];

const inter = (a, b) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
const r6 = (v) => Math.round(v * 1e6) / 1e6;

/** GeoJSON Polygon/MultiPolygon → halqalar ro'yxati (har biri: tashqi + teshiklar), koordinatalar 6 xona */
export function polysOf(g) {
  if (!g) return [];
  const one = (rings) => rings.map((r) => { const o = r.map((p) => [r6(p[0]), r6(p[1])]); if (o.length > 1 && o[0][0] === o[o.length - 1][0] && o[0][1] === o[o.length - 1][1]) o.pop(); return o; }).filter((r) => r.length >= 3);
  if (g.type === 'Polygon') return [one(g.coordinates)].filter((p) => p.length);
  if (g.type === 'MultiPolygon') return g.coordinates.map(one).filter((p) => p.length);
  return [];
}

/** Qator guruhi bbox statistikasi: [xmin.min, ymin.min, xmax.max, ymax.max] yoki null (statistika yo'q) */
export function groupBox(rg) {
  const st = (name, k) => { const c = rg.columns.find((x) => x.meta_data?.path_in_schema?.join('.') === `bbox.${name}`); const v = c?.meta_data?.statistics?.[k]; return typeof v === 'number' ? v : typeof v === 'bigint' ? Number(v) : null; };
  const b = [st('xmin', 'min_value'), st('ymin', 'min_value'), st('xmax', 'max_value'), st('ymax', 'max_value')];
  return b.every((v) => v != null) ? b : null;
}

/**
 * Overture o'qigichi. fetchImpl — test uchun; now — kesh vaqti.
 * Reliz va fayllar ro'yxati xotirada (1 kun), fayl metama'lumoti — LRU (16 ta).
 */
export function makeOverture({ fetchImpl = fetch, stac = STAC_ROOT, now = () => Date.now(), log = () => {} } = {}) {
  let rel = null, relAt = 0, items = null, itemsRel = '';
  const meta = new Map();
  const getJson = async (url) => { const r = await fetchImpl(url, { headers: { 'User-Agent': 'ArchemistryLab/1.0 (+https://archemistry.uz)' } }); if (!r.ok) throw new Error(`${r.status} ${url}`); return r.json(); };

  async function release() {
    if (rel && now() - relAt < 86_400_000) return rel;
    const c = await getJson(`${stac}/catalog.json`);
    if (typeof c.latest !== 'string' || !/^\d{4}-\d{2}-\d{2}\.\d+$/.test(c.latest)) throw new Error('Overture: reliz aniqlanmadi');
    rel = c.latest; relAt = now(); return rel;
  }
  /** Fayllar: [{ bbox, href }] — STAC item lari (bir marta, parallel 8 tadan) */
  async function files() {
    const R = await release();
    if (items && itemsRel === R) return items;
    const base = `${stac}/${R}/buildings/building/`, col = await getJson(`${base}collection.json`);
    const links = (col.links ?? []).filter((l) => l.rel === 'item').map((l) => new URL(l.href, base).href);
    const out = [];
    for (let i = 0; i < links.length; i += 8) {
      const part = await Promise.all(links.slice(i, i + 8).map(async (u) => {
        const it = await getJson(u), a = it.assets ?? {};
        const href = Object.values(a).map((x) => x?.href).find((h) => typeof h === 'string' && /^https:\/\/.*amazonaws\.com\/.*\.parquet$/.test(h))
          ?? Object.values(a).map((x) => x?.href).find((h) => typeof h === 'string' && /^https:\/\/.*\.parquet$/.test(h));
        return Array.isArray(it.bbox) && href ? { bbox: it.bbox.slice(0, 4).map(Number), href } : null;
      }));
      for (const p of part) if (p) out.push(p);
    }
    if (!out.length) throw new Error('Overture: fayllar ro‘yxati bo‘sh');
    items = out; itemsRel = R; log(`overture ${R}: ${out.length} fayl`);
    return out;
  }
  async function fileOf(href) {
    let m = meta.get(href);
    if (!m) {
      const file = cachedAsyncBuffer(await asyncBufferFromUrl({ url: href, fetch: fetchImpl }));
      m = { file, md: await parquetMetadataAsync(file) };
      meta.set(href, m); if (meta.size > 16) meta.delete(meta.keys().next().value);
    }
    return m;
  }

  /** bbox [w, s, e, n] dagi binolar: [{ rings, h, f, id }] */
  async function buildings(bb) {
    const fs = (await files()).filter((f) => inter(f.bbox, bb));
    const out = [], seen = new Set();
    for (const f of fs) {
      const { file, md } = await fileOf(f.href);
      let start = 0;
      for (const rg of md.row_groups) {
        const n = Number(rg.num_rows), gb = groupBox(rg), s0 = start; start += n;
        if (gb && !inter(gb, bb)) continue;
        const rows = await parquetReadObjects({ file, metadata: md, columns: COLS, rowStart: s0, rowEnd: s0 + n, compressors });
        for (const r of rows) {
          const b = r.bbox; if (b && !inter([b.xmin, b.ymin, b.xmax, b.ymax], bb)) continue;
          if (r.id && seen.has(r.id)) continue; if (r.id) seen.add(r.id);
          const h = Number.isFinite(r.height) ? Math.round(r.height * 10) / 10 : null, fl = Number.isFinite(r.num_floors) ? r.num_floors : null;
          for (const rings of polysOf(r.geometry)) {
            // bbox tekshiruvi bo'lmasa — birinchi nuqta bo'yicha
            if (!b && !inter([rings[0][0][0], rings[0][0][1], rings[0][0][0], rings[0][0][1]], bb)) continue;
            out.push({ rings, h, f: fl });
          }
        }
      }
    }
    return { release: await release(), buildings: out };
  }
  return { release, files, buildings };
}
