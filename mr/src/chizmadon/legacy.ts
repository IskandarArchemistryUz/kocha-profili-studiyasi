/**
 * Eski «Albom» (maket.html, 2026-10-19 da oʻchirildi) dan Chizmadonga oʻtkazish.
 * Ikki manba (brauzerdagi IndexedDB, bir xil sayt manzili):
 *  1) `kps_maket/docs` — eski albom hujjati (varaqlar, elementlar) → erkin varaqlar;
 *  2) `kps_mat/mats` — boshqa oynalardan «Albomga yuborish» bilan yuborilgan materiallar (rasm, SVG) → «Loyihadan» (inbox).
 * Elementlar Chizmadon turlariga bir-bir oʻtkaziladi (matn, shakl, chiziq, oqim, belgi, qator, rasm); shartli belgilar —
 * oʻz yozuvlari bilan (namuna toʻrtburchak + matn), chunki Chizmadon legendasi varaqdan avtomatik tuziladi.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { type ChEl, type ChInbox, type ChLayer, type ChPage, type ChPaper, type Dash, type FlowBand, type IconLook, PAPER_MM, cid, defaultLayers } from './model';

const PT = 0.3528;
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const col = (v: unknown, d?: string) => (typeof v === 'string' && v && v !== 'none' && v !== 'transparent' ? v : d);
const DASH: Record<string, Dash> = { solid: 'solid', dash: 'dash', long: 'long', dot: 'dot', dashdot: 'dashdot', dashdotdot: 'dash2dot' };
const BAND: Record<string, FlowBand> = { dots: 'nuqta', dash: 'punktir', stripe: 'lenta', outline: 'kontur' };
const LOOK: Record<string, IconLook> = { circle: 'doira', outline: 'doira', tree: 'doira', pin: 'pin', bare: 'belgi', ripple: 'tolqin' };
const ROW: Record<string, 'tree' | 'people' | 'dot' | 'icon'> = { tree: 'tree', person: 'people', dot: 'dot', icon: 'icon' };
const pts = (v: unknown): [number, number][] => (Array.isArray(v) ? v.filter(p => Array.isArray(p) && p.length >= 2).map(p => [num(p[0]), num(p[1])] as [number, number]) : []);

/** Bitta eski element → Chizmadon element(lar)i. Nomaʼlum tur — boʻsh roʻyxat (hisobotda sanaladi). */
export function convertItem(it: any, layer: string): ChEl[] {
  if (!it || typeof it !== 'object') return [];
  const box = { x: num(it.x), y: num(it.y), w: num(it.w, 10), h: num(it.h, 10) }, op = it.op != null ? { opacity: num(it.op, 1) } : {};
  const rot = it.rot ? { rot: num(it.rot) } : {}, base = { layer, ...(typeof it.name === 'string' ? { name: it.name } : {}), ...(typeof it.grp === 'string' ? { group: it.grp } : {}) };
  const stroke = { stroke: col(it.stroke), width: num(it.sw, 0.35), dash: DASH[it.ls || (it.dash ? 'dash' : 'solid')] ?? 'solid' };
  const E = (e: Omit<ChEl, 'id'>): ChEl => ({ id: cid(), ...e } as ChEl);
  switch (it.t) {
    case 'rect': case 'ellipse':
      return [E({ t: it.t, ...base, ...box, ...rot, style: { fill: col(it.fill, 'none'), ...stroke, ...(it.fop != null ? { opacity: num(it.fop, 1) * num(it.op, 1) } : op) } })];
    case 'poly': {
      const P = pts(it.pts); if (P.length < 2) return [];
      const closed = it.closed !== false;
      return [E({ t: closed ? 'poly' : 'line', ...base, pts: P, style: { fill: closed ? col(it.fill, 'none') : undefined, ...stroke, smooth: !!it.smooth, ...(it.fop != null ? { opacity: num(it.fop, 1) * num(it.op, 1) } : op) } })];
    }
    case 'line': case 'arrow': case 'pen': {
      const P = pts(it.pts); if (P.length < 2) return [];
      const deco = it.deco === 'rail' || it.deco === 'stations' || it.deco === 'casing' ? { deco: it.deco } : {};
      return [E({ t: it.t, ...base, pts: P, style: { ...stroke, stroke: col(it.stroke, '#141414'), smooth: !!it.smooth, ...(it.t === 'arrow' ? { head: 'end' as const } : {}), ...deco, ...op } })];
    }
    case 'flow': {
      const P = pts(it.pts); if (P.length < 2) return [];
      return [E({ t: 'flow', ...base, pts: P, style: { stroke: col(it.col, '#f0a35e'), width: num(it.w, 6), band: BAND[it.style] ?? 'toliq', opacity: num(it.fop, 0.85) * num(it.op, 1), head: 'end', smooth: true } })];
    }
    case 'icon':
      return [E({ t: 'icon', ...base, ...box, icon: typeof it.g === 'string' ? it.g : 'nuqta', look: LOOK[it.style] ?? 'doira', style: { stroke: col(it.col, '#2f6f4f'), ...op } })];
    case 'row': {
      const P = pts(it.pts); if (P.length < 2) return [];
      const kind = ROW[it.g] ?? 'tree';
      return [E({ t: 'row', ...base, pts: P, row: { kind, gap: num(it.sp, 5), size: num(it.sz, 4), ...(kind === 'icon' ? { icon: it.ig || 'tree' } : {}) }, style: { fill: col(it.col), smooth: !!it.smooth, ...op } })];
    }
    case 'text': {
      const out: ChEl[] = [];
      if (col(it.bg)) out.push(E({ t: 'rect', ...base, ...box, ...rot, style: { fill: it.bg, stroke: 'none' } }));
      out.push(E({ t: 'text', ...base, ...box, ...rot, text: String(it.text ?? ''), style: { size: num(it.fs, 14), font: typeof it.ff === 'string' ? it.ff : 'Archivo', fill: col(it.col, '#141414'), bold: !!it.b, italic: !!it.i, align: it.al === 'c' ? 'middle' : it.al === 'r' ? 'end' : 'start', ...(it.lh ? { lh: num(it.lh, 1.25) } : {}), ...op } }));
      return out;
    }
    case 'image': case 'mat': case 'map':
      return [E({ t: 'image', ...base, ...box, ...rot, ...(typeof it.src === 'string' && it.src ? { src: it.src } : {}), name: base.name ?? (it.t === 'map' ? 'Xarita' : 'Rasm'),
        style: { ...(it.t === 'map' || it.frame ? { stroke: '#141414', width: num(it.fsw, 0.35) } : {}), ...op } })];
    case 'legend': {
      // eski legenda yozuvlari bilan: sarlavha + har qatorda namuna va matn (varaqdan avtomatik emas — asl holicha)
      const fs = num(it.fs, 9), sz = fs * PT * 1.1, rh = fs * PT * 1.9, cols = Math.max(1, num(it.cols, 1)), cw = box.w / cols, g = cid('g'), out: ChEl[] = [];
      let y0 = box.y + fs * PT * 0.2;
      if (it.title) { out.push(E({ t: 'text', layer, group: g, x: box.x + 1.5, y: y0, w: box.w - 3, h: fs * PT * 1.5, text: String(it.title), style: { size: fs * 1.15, bold: true } })); y0 += fs * PT * 1.2 * 1.2; }
      (Array.isArray(it.entries) ? it.entries : []).filter((e: any) => e && e.on !== false).forEach((e: any, i: number) => {
        const cx = box.x + 1.5 + (i % cols) * cw, cy = y0 + Math.floor(i / cols) * rh, c = col(e.col, '#999999')!;
        if (e.kind === 'line') out.push(E({ t: 'line', layer, group: g, pts: [[cx, cy + sz / 2], [cx + sz * 1.8, cy + sz / 2]], style: { stroke: c, width: Math.max(0.35, fs * PT * 0.18), dash: e.dash ? 'dash' : 'solid' } }));
        else if (e.kind === 'dot') out.push(E({ t: 'ellipse', layer, group: g, x: cx + sz * 0.12, y: cy + sz * 0.12, w: sz * 0.76, h: sz * 0.76, style: { fill: c, stroke: 'none' } }));
        else out.push(E({ t: 'rect', layer, group: g, x: cx, y: cy, w: sz * 1.8, h: sz, style: { fill: c, stroke: '#141414', width: 0.15 } }));
        out.push(E({ t: 'text', layer, group: g, x: cx + sz * 2.3, y: cy, w: Math.max(10, cw - sz * 2.6), h: sz * 1.3, text: String(e.label ?? ''), style: { size: fs } }));
      });
      return out;
    }
    default: return [];
  }
}

/** Eski albom hujjati → erkin varaqlar. skipped — oʻtkazilmagan elementlar soni (nomaʼlum tur) */
export function convertMaketDoc(doc: any): { pages: ChPage[]; skipped: number; name: string } {
  const out: ChPage[] = []; let skipped = 0;
  const pages = Array.isArray(doc?.pages) ? doc.pages : [], oldLayers: any[] = Array.isArray(doc?.layers) && doc.layers.length ? doc.layers : [{ id: 'L0', name: 'Asosiy', vis: true }];
  pages.forEach((pg: any, i: number) => {
    const fmt = typeof pg?.fmt === 'string' ? pg.fmt : 'A3', land = pg?.orient !== 'P';
    const paper: ChPaper = fmt in PAPER_MM && fmt !== 'A0+' ? fmt as ChPaper : 'custom';
    const layers: ChLayer[] = oldLayers.map(l => ({ id: cid('l'), name: String(l.name || 'Qatlam').slice(0, 80), visible: l.vis !== false, locked: !!l.lock }));
    const lid = new Map(oldLayers.map((l, k) => [String(l.id), layers[k].id]));
    const p: ChPage = { id: cid('p'), name: `${doc?.name || 'Albom'} · ${i + 1}`, paper, landscape: land, layers: layers.length ? layers : defaultLayers(), els: [], tpl: 'maket' };
    if (paper === 'custom') { const [a, b] = fmt === 'A0+' ? [1300, 900] : [420, 297]; p.w = land ? a : b; p.h = land ? b : a; }
    for (const it of Array.isArray(pg?.items) ? pg.items : []) {
      const els = convertItem(it, lid.get(String(it?.layer ?? 'L0')) ?? p.layers[0].id);
      if (!els.length) skipped++; p.els.push(...els);
    }
    // eski shtamp (pg.tb) oʻtkazilmaydi — Chizmadon erkin varaqqa oʻz shtampini qoʻyadi (Albom → Shtamp)
    out.push(p);
  });
  return { pages: out, skipped, name: String(doc?.name || '') };
}

/** Yuborilgan material → «Loyihadan» yozuvi (rasm sifatida). design (GeoJSON) — oʻtkazilmaydi (u xarita qatlami edi). */
export function matToInbox(m: any): Omit<ChInbox, 'id' | 'at'> | null {
  if (!m || m.kind === 'design' || typeof m.src !== 'string' || !m.src) return null;
  const aspect = num(m.aspect, 0) > 0 ? m.aspect : num(m.mW, 0) > 0 && num(m.mH, 0) > 0 ? m.mW / m.mH : 4 / 3;
  const w = 200, h = Math.round(w / aspect);
  return { name: String(m.name || 'Material').slice(0, 120), kind: 'sheet', src: m.src, w, h };
}

/* ---------- IndexedDB (brauzerda) ---------- */
function idbAll(db: string, store: string): Promise<any[]> {
  return new Promise(res => {
    if (typeof indexedDB === 'undefined') { res([]); return; }
    const r = indexedDB.open(db);
    r.onerror = () => res([]);
    r.onupgradeneeded = () => { r.transaction?.abort(); res([]); };   // baza yoʻq edi — yaratmaymiz
    r.onsuccess = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains(store)) { d.close(); res([]); return; }
      const q = d.transaction(store, 'readonly').objectStore(store).getAll();
      q.onsuccess = () => { d.close(); res(q.result ?? []); }; q.onerror = () => { d.close(); res([]); };
    };
  });
}
function idbDel(db: string, store: string, ids: string[]): Promise<void> {
  return new Promise(res => {
    const r = indexedDB.open(db); r.onerror = () => res();
    r.onsuccess = () => { const d = r.result; if (!d.objectStoreNames.contains(store)) { d.close(); res(); return; } const t = d.transaction(store, 'readwrite'); ids.forEach(id => t.objectStore(store).delete(id)); t.oncomplete = () => { d.close(); res(); }; t.onerror = () => { d.close(); res(); }; };
  });
}
const DONE_KEY = 'chz-legacy-album';
/** Eski albom va yuborilgan materiallar: hali olinmaganlari */
export async function legacyPending(): Promise<{ doc: any | null; mats: any[] }> {
  const [docs, mats] = await Promise.all([idbAll('kps_maket', 'docs'), idbAll('kps_mat', 'mats')]);
  const doc = docs.find(d => d && d.id === 'main' && Array.isArray(d.pages) && d.pages.some((p: any) => Array.isArray(p?.items) && p.items.length)) ?? null;
  let stamp = ''; try { stamp = localStorage.getItem(DONE_KEY) ?? ''; } catch { /* */ }
  const sig = doc ? `${doc.pages.length}:${JSON.stringify(doc.pages).length}` : '';
  return { doc: doc && sig !== stamp ? doc : null, mats: mats.filter(m => matToInbox(m)) };
}
/** Olindi: albom belgilanadi (qayta taklif qilinmaydi), materiallar navbatdan oʻchiriladi (endi Chizmadon loyihasida) */
export async function legacyTaken(doc: any | null, mats: any[]): Promise<void> {
  if (doc) try { localStorage.setItem(DONE_KEY, `${doc.pages.length}:${JSON.stringify(doc.pages).length}`); } catch { /* */ }
  if (mats.length) await idbDel('kps_mat', 'mats', mats.map(m => String(m.id)));
}
