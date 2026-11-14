/**
 * Loyihalar bulutda (2-PR, 14.11.2026) — server: server/src/projects.js.
 * Brauzer (IndexedDB) asosiy nusxa boʻlib qoladi: har oʻzgarish darhol shu yerda saqlanadi, bulutga esa bir necha soniyadan keyin.
 * Bulutga faqat foydalanuvchi oʻzi tanlab koʻchirgan loyihalar boradi («Bulutga koʻchirish»); koʻchirilgandan keyin brauzerdan oʻchirilmaydi.
 * Hujjat gzip qilib R2 ga presigned PUT bilan yuklanadi (nginx tanasi ≤ 128 KB), server faqat tekshiradi va versiyani oshiradi.
 * Ikki qurilmada bir vaqtda oʻzgartirilsa — server 409 qaytaradi; foydalanuvchi qaysi nusxani qoldirishni tanlaydi.
 */
import { apiBase } from '../account/config';
import { tr, tf } from '../i18n';
import { migrate, type Project } from '../core/doc';
import { collectSvc, restoreSvc, svcHash } from './svcstate';
import { cacheGet, cachePut, cacheDel, getProject, putProject, getLayerData, putLayerData, exportJSON, FILE_KIND } from './db';

export type ProjectType = 'master' | 'kochasoz' | 'joyshunos' | 'chizmadon' | 'render' | 'dizaynkod' | 'binokor' | 'bogshunos';
export interface CloudItem { id: string; type: ProjectType; name: string; meta: Record<string, unknown>; version: number; bytes: number; created: string; updated: string; deleted: string | null }
export interface CloudUsage { bytes: number; count: number; quota: number | null; max: number | null }
/** svc — bulutga yuborilgan xizmatlar holati izi (svcstate.svcHash) */
export interface CloudLink { version: number; at: string; svc?: string }

export class CloudError extends Error {
  constructor(public code: string, msg: string, public status = 0, public extra: Record<string, unknown> = {}) { super(msg); }
}

/** tarmoq: sinovlarda almashtiriladi */
let fetchImpl: typeof fetch = (...a) => fetch(...a);
export function _setFetch(f: typeof fetch): void { fetchImpl = f; }

async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let r: Response;
  try {
    r = await fetchImpl(apiBase() + path, { method, credentials: 'include', headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch { throw new CloudError('offline', tr('Internet yoʻq')); }
  let j: any = null; try { j = await r.json(); } catch { /* boʻsh javob */ }
  if (!r.ok) throw new CloudError(j?.error ?? 'server', j?.message ?? tf('Server xatosi (${s})', { s: r.status }), r.status, j ?? {});
  return j as T;
}

/* ---------- gzip ---------- */
export async function gzip(text: string): Promise<Uint8Array> {
  const s = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
export async function gunzip(buf: ArrayBuffer | Uint8Array): Promise<string> {
  const s = new Blob([buf as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(s).text();
}

/* ---------- loyiha ↔ bulut bogʻlanishi (brauzerda) ---------- */
const linkKey = (id: string) => `cloud:${id}`;
export const getLink = (id: string): Promise<CloudLink | null> => cacheGet<CloudLink>(linkKey(id)).catch(() => null);
export const setLink = (id: string, l: CloudLink): Promise<void> => cachePut(linkKey(id), l);
export const dropLink = (id: string): Promise<void> => cacheDel(linkKey(id));

/* ---------- soʻrovlar ---------- */
export const list = (type: ProjectType = 'master', trash = false): Promise<{ items: CloudItem[]; usage: CloudUsage }> =>
  api(`/projects?type=${type}${trash ? '&trash=1' : ''}`);
export const info = (id: string): Promise<{ project: CloudItem; version: number; url: string }> => api(`/projects/${encodeURIComponent(id)}`);
export const remove = (id: string): Promise<{ ok: boolean; purge_days: number }> => api(`/projects/${encodeURIComponent(id)}`, 'DELETE');

/** roʻyxatda koʻrinadigan qisqa maʼlumot */
export function metaOf(doc: Project): Record<string, unknown> {
  return { buildings: doc.buildings?.length ?? 0, hasSite: !!doc.site };
}

/** hujjat + import qilingan qatlamlar obyektlari → fayl matni (Fayldan ochish bilan bir xil format) */
async function payload(doc: Project, svc: Record<string, string>): Promise<string> {
  const layers: Record<string, unknown[]> = {};
  for (const l of doc.userLayers ?? []) { const f = await getLayerData<unknown>(doc.id, l.id).catch(() => null); if (f) layers[l.id] = f; }
  return exportJSON(doc, layers, Object.keys(svc).length ? { svc } : undefined);
}

/**
 * Bulutga yuklash. base — bulutdagi versiya (yangi loyiha — 0). Mos kelmasa CloudError('conflict', … { version }).
 * Muvaffaqiyatda bogʻlanish yangilanadi.
 */
export async function upload(doc: Project, base?: number, type: ProjectType = 'master'): Promise<CloudItem> {
  const b = base ?? (await getLink(doc.id))?.version ?? 0;
  const svc = collectSvc(doc.id);
  const gz = await gzip(await payload(doc, svc));
  const u = await api<{ key: string; put: { url: string; headers: Record<string, string> } }>(`/projects/${encodeURIComponent(doc.id)}/upload`, 'POST', { type, bytes: gz.byteLength, base_version: b });
  let r: Response;
  try { r = await fetchImpl(u.put.url, { method: 'PUT', headers: u.put.headers, body: gz as BodyInit }); }
  catch { throw new CloudError('offline', tr('Internet yoʻq')); }
  if (!r.ok) throw new CloudError('storage', tf('Bulut ombori javob bermadi (${s})', { s: r.status }), r.status);
  const c = await api<{ project: CloudItem }>(`/projects/${encodeURIComponent(doc.id)}/commit`, 'POST', { key: u.key, base_version: b, name: doc.name || 'Loyiha', type, meta: metaOf(doc) });
  await setLink(doc.id, { version: c.project.version, at: c.project.updated, svc: svcHash(svc) });
  return c.project;
}

/** Bulutdan yuklab olib brauzerga yozish (id oʻzgarmaydi). version — eski nusxa. */
export async function download(id: string, version?: number): Promise<Project> {
  const g = await api<{ project: CloudItem; version: number; url: string }>(`/projects/${encodeURIComponent(id)}${version != null ? `?version=${version}` : ''}`);
  let r: Response;
  try { r = await fetchImpl(g.url); } catch { throw new CloudError('offline', tr('Internet yoʻq')); }
  if (!r.ok) throw new CloudError('storage', tf('Bulut ombori javob bermadi (${s})', { s: r.status }), r.status);
  const j = JSON.parse(await gunzip(await r.arrayBuffer()));
  if (!j || j.kind !== FILE_KIND || !j.project) throw new CloudError('bad_file', tr('Bulutdagi fayl buzilgan'));
  const p: Project = { ...migrate(j.project), id };
  const ids = new Set((p.userLayers ?? []).map(l => l.id));
  for (const [lid, fs] of Object.entries(j.layers ?? {})) if (ids.has(lid) && Array.isArray(fs)) await putLayerData(id, lid, fs as unknown[]);
  restoreSvc(id, j.svc);
  await putProject(p);
  if (version == null) await setLink(id, { version: g.version, at: g.project.updated, svc: svcHash(collectSvc(id)) });
  return p;
}

/** Brauzerdagi loyihani bulutga koʻchirish (tanlab). Brauzerdagi nusxa oʻchirilmaydi. */
export async function moveToCloud(id: string): Promise<CloudItem> {
  const doc = await getProject(id);
  if (!doc) throw new CloudError('not_found', tr('Loyiha topilmadi'));
  return upload(doc, (await getLink(id))?.version ?? 0);
}

/* ---------- avtomatik sinxron (muharrir ichida) ---------- */
export type SyncState = 'local' | 'pending' | 'syncing' | 'cloud' | 'offline' | 'conflict' | 'error';
export interface CloudSync { push(doc: Project): void; flush(): Promise<void>; dispose(): void; readonly state: SyncState; resolve(choice: 'mine' | 'theirs'): Promise<Project | null> }

/**
 * Bogʻlangan loyiha har oʻzgarganda `delay` ms jimlikdan keyin bulutga yuklanadi.
 * Internet yoʻq — 'offline', keyingi oʻzgarishda yoki `retryMs` dan keyin qayta urinadi.
 * Ziddiyat — 'conflict': resolve('mine') — bulutdagi ustiga shu nusxa (bulutdagisi eski nusxalarda qoladi);
 * resolve('theirs') — bulutdagini ochish (shu brauzerdagisi avval nusxa sifatida saqlanadi).
 */
export function cloudSync(id: string, onState: (s: SyncState) => void, opts: { delay?: number; retryMs?: number; makeCopy?: (doc: Project) => Promise<void> } = {}): CloudSync {
  const delay = opts.delay ?? 4000, retryMs = opts.retryMs ?? 30_000;
  let timer: ReturnType<typeof setTimeout> | null = null, last: Project | null = null, state: SyncState = 'local', linked = false, busy: Promise<void> | null = null, dead = false;
  const set = (s: SyncState) => { if (state !== s) { state = s; onState(s); } };
  void getLink(id).then(l => { linked = !!l; if (dead) return; set(linked ? 'cloud' : 'local'); if (linked && last) { set('pending'); schedule(); } });
  const run = async (): Promise<void> => {
    timer = null; const d = last; if (!d || !linked || state === 'conflict') return;
    set('syncing');
    try { await upload(d); if (last === d) set('cloud'); else schedule(); }
    catch (e) {
      const c = e instanceof CloudError ? e.code : 'error';
      if (c === 'conflict') set('conflict');
      else if (c === 'offline' || c === 'storage') { set('offline'); if (!dead) timer = setTimeout(() => { busy = run(); }, retryMs); }
      else { console.error(e); set('error'); }
    }
  };
  const schedule = () => { if (timer) clearTimeout(timer); timer = setTimeout(() => { busy = run(); }, delay); };
  return {
    get state() { return state; },
    push(doc) { last = doc; if (!linked || state === 'conflict') return; set('pending'); schedule(); },
    async flush() { if (timer) { clearTimeout(timer); timer = null; busy = run(); } await busy; },
    dispose() { dead = true; if (timer) clearTimeout(timer); },
    async resolve(choice) {
      if (choice === 'mine') {
        const srv = await info(id); const d = last ?? await getProject(id); if (!d) return null;
        await upload(d, srv.version); set('cloud'); return d;
      }
      const cur = last ?? await getProject(id);
      if (cur && opts.makeCopy) await opts.makeCopy(cur);
      const p = await download(id); last = null; set('cloud'); return p;
    },
  };
}

/* ---------- xizmat sahifalari (Joyshunos, Koʻchasoz, Render…) ---------- */
/**
 * Xizmat loyiha ichida (?p=) ochilganda: holat (`kalit@p`) oʻzgarsa va loyiha bulutda boʻlsa — bulutga yuklaydi.
 * Hujjatning oʻzi brauzerdagi nusxadan olinadi. Ziddiyat — kuzatish toʻxtaydi (Master reja ochilganda tanlov chiqadi).
 */
export function svcWatch(p: string, every = 5000): () => void {
  let dead = false, busy = false, t: ReturnType<typeof setInterval> | null = null;
  const tick = async (): Promise<void> => {
    if (dead || busy) return; busy = true;
    try {
      const l = await getLink(p); if (!l) { stop(); return; }
      if (l.svc === svcHash(collectSvc(p))) return;
      const doc = await getProject(p); if (!doc) { stop(); return; }
      await upload(doc, l.version);
    } catch (e) {
      const c = e instanceof CloudError ? e.code : '';
      if (c !== 'offline' && c !== 'storage') stop();
    } finally { busy = false; }
  };
  const vis = () => { if (document.visibilityState === 'hidden') void tick(); };
  const stop = () => { dead = true; if (t) clearInterval(t); if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', vis); };
  t = setInterval(() => void tick(), every);
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', vis);
  return stop;
}

/** Master reja ochilganda: xizmatlarda bulutga yetib bormagan oʻzgarish bormi */
export async function svcDirty(id: string): Promise<boolean> {
  const l = await getLink(id).catch(() => null);
  return !!l && l.svc !== svcHash(collectSvc(id));
}
