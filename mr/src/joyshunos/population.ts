/* Aholi zichligi — istalgan shahar uchun (13.11.2026).
   Manbalar ustuvorlik bilan: avval shaharning oʻz batafsil maʼlumoti (hozir — Toshkent kadastri, 50 m), boʻlmasa —
   global GHS-POP R2023A (JRC, 2025-yil holati, 3″ ≈ 90 m, WGS84). GHS-POP — AWS Open Data dagi bitta global COG
   (BigTIFF, Deflate, float64, 512×512 plitka): brauzer faqat kerakli plitkalarni HTTP Range bilan oʻqiydi.
   Qiymat — katakdagi kishilar soni (model: aholi roʻyxati × qurilgan hajm), haqiqiy sanoq emas. */
import type { LngLat } from '../core/doc';

export const GHS_POP_URL = 'https://jrc-ghsl.s3.eu-central-1.amazonaws.com/ghs-pop/r2023a/4326/3asec/2025/GHS_POP_E2025_GLOBE_R2023A_4326_3ss_V1_0.tif';
export const GHS_POP_CITE = 'GHS-POP R2023A, JRC (2023), 2025-yil, 3″ ≈ 90 m';

/** Nuqta atrofidagi aholi oynasi: (lon0, lat0) — chap-yuqori burchak, dx/dy — gradus; v — katakdagi kishilar (NaN — maʼlumot yoʻq) */
export interface PopWin { src: 'ghsl' | 'kadastr'; lon0: number; lat0: number; dx: number; dy: number; w: number; h: number; v: Float32Array; cite: string }

/** Katak maydoni, ga (kenglikka bogʻliq) */
export function cellHa(p: PopWin, lat: number): number { return (p.dx * 111_320 * Math.cos(lat * Math.PI / 180)) * (p.dy * 111_132) / 1e4; }
/** Nuqtadagi zichlik, kishi/ga (NaN — oyna tashqarisida yoki maʼlumot yoʻq) */
export function popDens(p: PopWin, lon: number, lat: number): number {
  const i = Math.floor((lon - p.lon0) / p.dx), j = Math.floor((p.lat0 - lat) / p.dy);
  if (i < 0 || j < 0 || i >= p.w || j >= p.h) return NaN;
  return p.v[j * p.w + i] / cellHa(p, lat);
}
/** Doira ichidagi jami aholi va oʻrtacha zichlik */
export function popStats(p: PopWin, c: LngLat, R: number): { aholi: number; zich: number; cells: number } {
  const kx = 111_320 * Math.cos(c[1] * Math.PI / 180), ky = 111_132; let s = 0, cells = 0;
  for (let j = 0; j < p.h; j++) for (let i = 0; i < p.w; i++) {
    const lon = p.lon0 + (i + 0.5) * p.dx, lat = p.lat0 - (j + 0.5) * p.dy;
    if (Math.hypot((lon - c[0]) * kx, (lat - c[1]) * ky) > R) continue;
    const v = p.v[j * p.w + i]; if (!Number.isFinite(v)) continue; s += v; cells++;
  }
  return { aholi: Math.round(s), zich: Math.round(s / (Math.PI * R * R / 1e4)), cells };
}

/* ---------------- minimal COG oʻquvchi (faqat shu fayl turi uchun: BigTIFF/TIFF, Deflate, plitkali, 1 kanal) ---------------- */
interface CogHead { le: boolean; big: boolean; W: number; H: number; tw: number; th: number; bps: number; sf: number; comp: number; pred: number; offs: number; cnts: number; /** massiv elementi baytlarda (LONG — 4, LONG8 — 8) */ offB: number; cntB: number; ox: number; oy: number; sx: number; sy: number; nodata: number }
type Fetch = typeof fetch;
const heads = new Map<string, Promise<CogHead>>();

async function range(f: Fetch, url: string, a: number, n: number): Promise<DataView> {
  const r = await f(url, { headers: { Range: `bytes=${a}-${a + n - 1}` } });
  if (r.status !== 206) { void r.body?.cancel(); throw new Error(`COG ${r.status}`); }   // 200 — butun fayl (12 GB) kelardi: toʻxtatamiz
  return new DataView(await r.arrayBuffer());
}
export function parseCogHead(dv: DataView): CogHead {
  const le = dv.getUint16(0) === 0x4949, big = dv.getUint16(2, le) === 43;
  const u64 = (o: number) => Number(dv.getBigUint64(o, le));
  const off = big ? u64(8) : dv.getUint32(4, le), n = big ? u64(off) : dv.getUint16(off, le);
  const T = new Map<number, { typ: number; cnt: number; at: number }>();
  for (let i = 0; i < n; i++) {
    const e = off + (big ? 8 : 2) + i * (big ? 20 : 12), tag = dv.getUint16(e, le), typ = dv.getUint16(e + 2, le), cnt = big ? u64(e + 4) : dv.getUint32(e + 4, le);
    const size = ({ 1: 1, 2: 1, 3: 2, 4: 4, 12: 8, 16: 8 } as Record<number, number>)[typ] ?? 1, inl = size * cnt <= (big ? 8 : 4);
    T.set(tag, { typ, cnt, at: inl ? e + (big ? 12 : 8) : (big ? u64(e + 12) : dv.getUint32(e + 8, le)) });
  }
  const one = (tag: number, d = 0) => { const t = T.get(tag); if (!t) return d; return t.typ === 3 ? dv.getUint16(t.at, le) : t.typ === 16 ? u64(t.at) : dv.getUint32(t.at, le); };
  const dbl = (tag: number, k: number) => { const t = T.get(tag); return t && t.at + 8 * k + 8 <= dv.byteLength ? dv.getFloat64(t.at + 8 * k, le) : NaN; };
  const nd = T.get(42113); let nodata = NaN;
  if (nd && nd.at + nd.cnt <= dv.byteLength) { let s = ''; for (let k = 0; k < nd.cnt; k++) { const ch = dv.getUint8(nd.at + k); if (ch) s += String.fromCharCode(ch); } nodata = Number(s); }
  return { le, big, W: one(256), H: one(257), tw: one(322), th: one(323), bps: one(258), sf: one(339, 1), comp: one(259, 1), pred: one(317, 1), offs: T.get(324)!.at, cnts: T.get(325)!.at, offB: T.get(324)!.typ === 16 ? 8 : 4, cntB: T.get(325)!.typ === 16 ? 8 : 4,
    sx: dbl(33550, 0), sy: dbl(33550, 1), ox: dbl(33922, 3), oy: dbl(33922, 4), nodata };
}
async function inflate(b: ArrayBuffer): Promise<ArrayBuffer> {
  return new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer();
}

const tilesC = new Map<string, Promise<ArrayBuffer | null>>();
/** Bitta plitka (ochilgan baytlar); sessiya davomida xotirada — 512×3″ plitka ≈ 47×35 km, bir shahar uchun 1–4 ta */
function tileBytes(url: string, h: CogHead, t: number, f: Fetch): Promise<ArrayBuffer | null> {
  const k = `${url}#${t}`;
  if (!tilesC.has(k)) {
    if (tilesC.size > 12) tilesC.delete(tilesC.keys().next().value!);
    tilesC.set(k, (async () => {
      const [od, cd] = await Promise.all([range(f, url, h.offs + t * h.offB, h.offB), range(f, url, h.cnts + t * h.cntB, h.cntB)]);
      const o = h.offB === 8 ? Number(od.getBigUint64(0, h.le)) : od.getUint32(0, h.le), n = h.cntB === 8 ? Number(cd.getBigUint64(0, h.le)) : cd.getUint32(0, h.le);
      if (!n) return null;
      const b = (await range(f, url, o, n)).buffer as ArrayBuffer;
      return h.comp === 8 || h.comp === 32946 ? inflate(b) : b;
    })().catch(e => { tilesC.delete(k); throw e; }));
  }
  return tilesC.get(k)!;
}
/** COG dan (lon, lat) atrofidagi R m oynani oʻqish */
export async function readCogWindow(url: string, c: LngLat, R: number, f: Fetch = fetch.bind(globalThis)): Promise<PopWin> {
  if (!heads.has(url)) heads.set(url, range(f, url, 0, 65536).then(parseCogHead).catch(e => { heads.delete(url); throw e; }));
  const h = await heads.get(url)!;
  if (h.comp !== 8 && h.comp !== 32946) throw new Error(`COG: siqish ${h.comp} qoʻllanmaydi`);
  const kx = 111_320 * Math.cos(c[1] * Math.PI / 180), ky = 111_132;
  const i0 = Math.max(0, Math.floor((c[0] - R / kx - h.ox) / h.sx)), i1 = Math.min(h.W - 1, Math.floor((c[0] + R / kx - h.ox) / h.sx));
  const j0 = Math.max(0, Math.floor((h.oy - (c[1] + R / ky)) / h.sy)), j1 = Math.min(h.H - 1, Math.floor((h.oy - (c[1] - R / ky)) / h.sy));
  const w = i1 - i0 + 1, hh = j1 - j0 + 1, v = new Float32Array(w * hh).fill(NaN), across = Math.ceil(h.W / h.tw);
  const tiles: number[] = [];
  for (let tj = Math.floor(j0 / h.th); tj <= Math.floor(j1 / h.th); tj++) for (let ti = Math.floor(i0 / h.tw); ti <= Math.floor(i1 / h.tw); ti++) tiles.push(tj * across + ti);
  await Promise.all(tiles.map(async t => {
    const raw = await tileBytes(url, h, t, f); if (!raw) return;   // boʻsh plitka (dengiz/choʻl)
    const dv = new DataView(raw), B = h.bps / 8;
    const ti = t % across, tj = Math.floor(t / across);
    for (let y = 0; y < h.th; y++) {
      const J = tj * h.th + y - j0; if (J < 0 || J >= hh) continue;
      let prev = 0;
      for (let x = 0; x < h.tw; x++) {
        const I = ti * h.tw + x - i0, p = (y * h.tw + x) * B; if (p + B > raw.byteLength) break;
        let q = h.sf === 3 ? (B === 8 ? dv.getFloat64(p, h.le) : dv.getFloat32(p, h.le)) : B === 2 ? dv.getUint16(p, h.le) : dv.getUint32(p, h.le);
        if (h.pred === 2 && h.sf !== 3) { q += prev; prev = q; }
        if (I < 0 || I >= w) continue;
        v[J * w + I] = q === h.nodata || q < 0 ? NaN : q;
      }
    }
  }));
  return { src: 'ghsl', lon0: h.ox + i0 * h.sx, lat0: h.oy - j0 * h.sy, dx: h.sx, dy: h.sy, w, h: hh, v, cite: GHS_POP_CITE };
}

/** Kadastr 50 m toʻridan (Toshkent) xuddi shu koʻrinishdagi oyna */
export function kadWindow(g: { ix: { bbox: [number, number, number, number]; qadam: [number, number]; nx: number; ny: number; sana?: string }; aholi: Uint16Array }, c: LngLat, R: number): PopWin | null {
  const kx = 111_320 * Math.cos(c[1] * Math.PI / 180), ky = 111_132, [W, , , N] = g.ix.bbox, [dx, dy] = g.ix.qadam;
  const i0 = Math.max(0, Math.floor((c[0] - R / kx - W) / dx)), i1 = Math.min(g.ix.nx - 1, Math.floor((c[0] + R / kx - W) / dx));
  const j0 = Math.max(0, Math.floor((N - (c[1] + R / ky)) / dy)), j1 = Math.min(g.ix.ny - 1, Math.floor((N - (c[1] - R / ky)) / dy));
  if (i1 < i0 || j1 < j0) return null;
  const w = i1 - i0 + 1, h = j1 - j0 + 1, v = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) v[j * w + i] = g.aholi[(j0 + j) * g.ix.nx + i0 + i];
  return { src: 'kadastr', lon0: W + i0 * dx, lat0: N - j0 * dy, dx, dy, w, h, v, cite: 'Toshkent shahar GIS (kadastr), 2023 — 50 m' };
}

/** GHS-POP zichlik shkalasi, kishi/ga (90 m katak kadastrning 50 m katagidan silliqroq — chegaralar pastroq) */
export const GHS_DENS: [number, string][] = [[0, '#fff3e6'], [25, '#fdd0a2'], [50, '#fd8d3c'], [100, '#d94801'], [150, '#a63603'], [200, '#7f2704']];
export function ghsCol(perHa: number): string | null { if (!(perHa > 0.5)) return null; let c = GHS_DENS[0][1]; for (const [t, col] of GHS_DENS) if (perHa >= t) c = col; return c; }
