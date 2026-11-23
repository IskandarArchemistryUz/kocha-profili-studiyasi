/**
 * Bogʻshunos — maʼlumot yuklovchilar (1-bosqich):
 *  · OSM (Overpass): binolar, yoʻllar, suv (way VA relation — koʻp qismli koʻl/kanal), ELU, bekatlar, metro, maktab, bogʻcha, bogʻlar, maysa;
 *  · Toshkent daraxtlar reyestri (green.tashkent.uz WFS, Zamin fondi) — shaxsiy identifikatorlarsiz (volunteer_id, dendrologist_id olinmaydi);
 *  · relyef: AWS Terrain Tiles (Terrarium, SRTM ~30 m asosida — sirt modeli, daraxt va binolar ichida; P) yoki foydalanuvchi topo-syomkasi;
 *  · aholi: GHS-POP R2023A (joyshunos/population, A).
 * Hammasi mahalliy metrga (core/geo frame) oʻtkaziladi.
 */
import { frame, type Frame } from '../core/geo';
import type { LngLat } from '../core/doc';
import { readCogWindow, GHS_POP_URL, GHS_POP_CITE } from '../joyshunos/population';
import { overpass as ctxOverpass } from '../context/load';
import { apiBase } from '../account/config';
import type { BgData, BgFeat, BgTree, XY, MPoly } from './types';

export const WFS = 'https://maps.tashkent.uz/greentashkent/geoserver/greentashkent_db/wfs';
export const TERRARIUM = (z: number, x: number, y: number) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
export const REGISTRY_CITE = 'Toshkent shahri daraxtlar reyestri — green.tashkent.uz (Zamin fondi, Ekologiya vazirligi, Toshkent shahar hokimligi)';

type Fetch = typeof fetch;
const KEEP = ['building', 'building:levels', 'highway', 'waterway', 'natural', 'water', 'landuse', 'leisure', 'amenity', 'power', 'voltage', 'railway', 'public_transport', 'man_made', 'name', 'tunnel', 'bridge', 'width', 'surface', 'barrier'];

/** Overpass — Lab API keshi (/data/overpass) orqali, keyin ochiq serverlar (context/load bilan bir xil) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function overpass(q: string, f: Fetch = fetch, onTry: (m: string) => void = () => {}): Promise<any> {
  return ctxOverpass(q, f, onTry);
}

/** relation aʼzolaridan halqalarni yigʻish (outer/inner) */
function assemble(members: { role: string; geometry?: { lat: number; lon: number }[] }[], F: Frame): MPoly {
  const take = (role: string) => {
    const segs = members.filter(m => (m.role || 'outer') === role && m.geometry?.length).map(m => m.geometry!.map(p => F.toLocal([p.lon, p.lat]) as XY));
    const rings: XY[][] = []; const near = (a: XY, b: XY) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.05;
    while (segs.length) {
      let cur = segs.shift()!;
      for (let guard = 0; guard < 500 && !near(cur[0], cur[cur.length - 1]); guard++) {
        const k = segs.findIndex(s => near(s[0], cur[cur.length - 1]) || near(s[s.length - 1], cur[cur.length - 1]));
        if (k < 0) break;
        const s = segs.splice(k, 1)[0]; cur = cur.concat(near(s[0], cur[cur.length - 1]) ? s.slice(1) : s.reverse().slice(1));
      }
      if (cur.length > 3) rings.push(cur);
    }
    return rings;
  };
  const outer = take('outer'), inner = take('inner');
  return outer.map(o => [o, ...inner.filter(i => ringIn(i[0], o))]);
}
function ringIn(p: XY, r: XY[]): boolean { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) c = !c; } return c; }

export function osmQuery(bb: [number, number, number, number]): string {
  const b = `${bb[1]},${bb[0]},${bb[3]},${bb[2]}`;
  return `[out:json][timeout:120];(way["building"](${b});way["highway"](${b});way["waterway"](${b});relation["waterway"](${b});way["natural"](${b});relation["natural"](${b});way["water"](${b});relation["water"](${b});way["landuse"](${b});relation["landuse"](${b});way["leisure"](${b});relation["leisure"](${b});way["power"](${b});node["power"](${b});nwr["amenity"~"school|kindergarten|toilets|cafe|restaurant|clinic|hospital|fountain"](${b});node["highway"="bus_stop"](${b});node["public_transport"="platform"](${b});nwr["railway"~"station|subway_entrance"](${b});way["man_made"](${b}););out geom tags qt;`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseOsm(j: any, F: Frame): BgFeat[] {
  const out: BgFeat[] = [];
  for (const e of j.elements ?? []) {
    const t: Record<string, string> = {}; for (const k of KEEP) if (e.tags?.[k] != null) t[k] = e.tags[k];
    const key = ['building', 'highway', 'waterway', 'natural', 'water', 'landuse', 'leisure', 'amenity', 'power', 'railway', 'public_transport', 'man_made'].find(k => t[k] != null);
    if (!key) continue;
    if (e.type === 'node') { out.push({ k: key, v: t[key], name: t.name, kind: 'pt', g: [F.toLocal([e.lon, e.lat]) as XY], tags: t }); continue; }
    if (e.type === 'way' && e.geometry) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pts = e.geometry.filter(Boolean).map((p: any) => F.toLocal([p.lon, p.lat]) as XY);
      const closed = pts.length > 3 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1];
      const area = closed && key !== 'highway' && key !== 'waterway' && t.barrier == null;
      out.push({ k: key, v: t[key], name: t.name, kind: area ? 'pg' : 'ln', g: area ? [[pts]] : pts, tags: t });
      continue;
    }
    if (e.type === 'relation' && e.members) {
      const mp = assemble(e.members, F);
      if (mp.length) out.push({ k: key, v: t[key], name: t.name, kind: 'pg', g: mp, tags: { ...t, rel: String(e.id) } });
    }
  }
  return out;
}

/** Reyestr: bbox ≤ 0,02° boʻlaklarga boʻlinadi; har boʻlak — Lab API proksisi (/data/trees, kesh), boʻlmasa toʻgʻridan-toʻgʻri WFS.
 *  Ikkala yoʻlda ham faqat ruxsat etilgan maydonlar soʻraladi (volunteer_id, dendrologist_id yoʻq). */
export async function loadTrees(bb: [number, number, number, number], F: Frame, f: Fetch = fetch): Promise<BgTree[]> {
  const S = 0.0199, out: BgTree[] = [], seen = new Set<string>();
  for (let x = bb[0]; x < bb[2]; x += S) for (let y = bb[1]; y < bb[3]; y += S) {
    const b = [x, y, Math.min(bb[2], x + S), Math.min(bb[3], y + S)].map(v => +v.toFixed(6));
    let rows: [number, number, string, number, number, number, number][] = [];
    try { const r = await f(`${apiBase()}/data/trees?bbox=${b.join(',')}`); if (!r.ok) throw new Error(String(r.status)); rows = (await r.json()).trees ?? []; }
    catch {
      const u = `${WFS}?service=WFS&version=1.1.0&request=GetFeature&typeName=greentashkent_db:vw_tree_locations&outputFormat=application/json&srsName=EPSG:4326&bbox=${b.join(',')},EPSG:4326&propertyName=dbh_cm,crowndiameter_m,height_m,name_oz,is_verified,geom`;
      const j = await (await f(u)).json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rows = (j.features ?? []).map((x: any) => [x.geometry.coordinates[0], x.geometry.coordinates[1], x.properties.name_oz ?? '—', +x.properties.dbh_cm || 0, +x.properties.crowndiameter_m || 0, +x.properties.height_m || 0, x.properties.is_verified ? 1 : 0]);
    }
    for (const t of rows) { const k = `${t[0].toFixed(6)},${t[1].toFixed(6)}`; if (seen.has(k)) continue; seen.add(k); out.push({ p: F.toLocal([t[0], t[1]]) as XY, sp: t[2] ?? '—', d: +t[3] || 0, c: +t[4] || 0, h: +t[5] || 0, ok: !!t[6] }); }
  }
  return out;
}

/** Terrarium plitkalaridan relyef toʻri (z15 ≈ 3,6 m piksel; manba aniqligi ~30 m) */
export async function loadDem(bb: [number, number, number, number], F: Frame, step = 5, f: Fetch = fetch): Promise<BgData['dem']> {
  const z = 15, n = 2 ** z;
  const tx = (l: number) => Math.floor((l + 180) / 360 * n), ty = (la: number) => { const r = la * Math.PI / 180; return Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n); };
  const x0 = tx(bb[0]), x1 = tx(bb[2]), y0 = ty(bb[3]), y1 = ty(bb[1]);
  const W = (x1 - x0 + 1) * 256, H = (y1 - y0 + 1) * 256;
  const cv = new OffscreenCanvas(W, H), ctx = cv.getContext('2d')!;
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
    const bl = await (await f(TERRARIUM(z, x, y))).blob(); ctx.drawImage(await createImageBitmap(bl), (x - x0) * 256, (y - y0) * 256);
  }
  const d = ctx.getImageData(0, 0, W, H).data;
  const elev = (lon: number, lat: number) => {
    const px = ((lon + 180) / 360 * n - x0) * 256, r = lat * Math.PI / 180, py = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n - y0) * 256;
    const i = Math.max(0, Math.min(W - 2, Math.floor(px))), j = Math.max(0, Math.min(H - 2, Math.floor(py))), fx = px - i, fy = py - j;
    const v = (ii: number, jj: number) => { const k = (jj * W + ii) * 4; return d[k] * 256 + d[k + 1] + d[k + 2] / 256 - 32768; };
    return v(i, j) * (1 - fx) * (1 - fy) + v(i + 1, j) * fx * (1 - fy) + v(i, j + 1) * (1 - fx) * fy + v(i + 1, j + 1) * fx * fy;
  };
  const a = F.toLocal([bb[0], bb[1]]), b = F.toLocal([bb[2], bb[3]]);
  const nx = Math.ceil((b[0] - a[0]) / step) + 1, ny = Math.ceil((b[1] - a[1]) / step) + 1, zz: number[] = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const g = F.toGeo([a[0] + i * step, a[1] + j * step]); zz.push(Math.round(elev(g[0], g[1]) * 10) / 10); }
  return { x0: a[0], y0: a[1], step, nx, ny, z: zz, src: 'AWS Terrain Tiles (Terrarium, SRTM ~30 m) — sirt modeli, P' };
}

export async function loadPop(c: LngLat, R: number, F: Frame, f: Fetch = fetch): Promise<{ pop: BgData['pop']; src: string }> {
  const w = await readCogWindow(GHS_POP_URL, c, R, f), out: BgData['pop'] = [];
  for (let j = 0; j < w.h; j++) for (let i = 0; i < w.w; i++) { const v = w.v[j * w.w + i]; if (v > 0) out.push({ p: F.toLocal([w.lon0 + (i + 0.5) * w.dx, w.lat0 - (j + 0.5) * w.dy]) as XY, n: v }); }
  return { pop: out, src: GHS_POP_CITE };
}

/** Hammasini yuklash: chegara (mahalliy) atrofida R m */
export async function loadAll(origin: LngLat, boundary: XY[], R = 1200, f: Fetch = fetch, onStep?: (s: string) => void): Promise<BgData> {
  const F = frame(origin);
  const xs = boundary.map(p => p[0]), ys = boundary.map(p => p[1]);
  const g0 = F.toGeo([Math.min(...xs) - R, Math.min(...ys) - R]), g1 = F.toGeo([Math.max(...xs) + R, Math.max(...ys) + R]);
  const s0 = F.toGeo([Math.min(...xs) - 60, Math.min(...ys) - 60]), s1 = F.toGeo([Math.max(...xs) + 60, Math.max(...ys) + 60]);
  onStep?.('OSM'); const osm = parseOsm(await overpass(osmQuery([g0[0], g0[1], g1[0], g1[1]]), f, m => onStep?.(m)), F);
  onStep?.('Daraxtlar reyestri'); let trees: BgTree[] = []; try { trees = await loadTrees([s0[0], s0[1], s1[0], s1[1]], F, f); } catch (e) { console.warn('reyestr', e); }
  onStep?.('Relyef'); let dem: BgData['dem'] = null; try { dem = await loadDem([s0[0], s0[1], s1[0], s1[1]], F, 5, f); } catch (e) { console.warn('relyef', e); }
  onStep?.('Aholi'); let pop: BgData['pop'] = [], popSrc = ''; try { ({ pop, src: popSrc } = await loadPop(origin, R + 300, F, f)); } catch (e) { console.warn('aholi', e); }
  return { at: new Date().toISOString(), osm, trees, dem, pop, popSrc, nets: [], tu: [] };
}
