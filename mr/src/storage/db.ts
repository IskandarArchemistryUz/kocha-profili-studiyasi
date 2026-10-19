/**
 * Saqlash — bitta IndexedDB bazasi («archemistry-mr»): loyihalar, kontekst keshi, fayllar.
 * Eski versiyadagi 73 localStorage kaliti va 7 baza oʻrniga. Keyinroq server (bulut) shu interfeys ortiga qoʻshiladi.
 */
import { migrate, type Project } from '../core/doc';

const DB_NAME = 'archemistry-mr';
const VERSION = 1;
export const STORES = { projects: 'projects', cache: 'cache', assets: 'assets' } as const;

export interface ProjectMeta { id: string; name: string; updated: string; created: string; buildings: number; hasSite: boolean }

let dbp: Promise<IDBDatabase> | null = null;

export function openDB(factory: IDBFactory = indexedDB): Promise<IDBDatabase> {
  if (dbp) return dbp;
  dbp = new Promise((ok, no) => {
    const r = factory.open(DB_NAME, VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains(STORES.projects)) db.createObjectStore(STORES.projects, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.cache)) db.createObjectStore(STORES.cache, { keyPath: 'k' });
      if (!db.objectStoreNames.contains(STORES.assets)) db.createObjectStore(STORES.assets, { keyPath: 'id' });
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => { dbp = null; no(r.error); };
    r.onblocked = () => { dbp = null; no(new Error('Baza boshqa oynada band — boshqa oynalarni yoping')); };
  });
  return dbp;
}

/** test uchun: ulanishni yopish */
export async function _reset(): Promise<void> { if (dbp) { try { (await dbp).close(); } catch { /* ochilmagan */ } } dbp = null; }

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  return openDB().then(db => new Promise<T>((ok, no) => {
    const t = db.transaction(store, mode); const s = t.objectStore(store);
    let out: T; const q = fn(s);
    if (q) q.onsuccess = () => { out = q.result; };
    t.oncomplete = () => ok(out);
    t.onerror = () => no(t.error); t.onabort = () => no(t.error || new Error('Tranzaksiya bekor qilindi'));
  }));
}

export async function putProject(doc: Project): Promise<void> { await tx(STORES.projects, 'readwrite', s => s.put(doc)); }

export async function getProject(id: string): Promise<Project | null> {
  const raw = await tx<unknown>(STORES.projects, 'readonly', s => s.get(id));
  return raw ? migrate(raw) : null;
}

export async function deleteProject(id: string): Promise<void> { await tx(STORES.projects, 'readwrite', s => s.delete(id)); }

export async function listProjects(): Promise<ProjectMeta[]> {
  const all = await tx<any[]>(STORES.projects, 'readonly', s => s.getAll());
  return (all || []).map(p => ({ id: p.id, name: p.name, updated: p.updated, created: p.created, buildings: (p.buildings || []).length, hasSite: !!p.site }))
    .sort((a, b) => b.updated.localeCompare(a.updated));
}

/* ---------- kesh (kontekst, plitkalar) ---------- */
export async function cacheGet<T>(k: string): Promise<T | null> {
  const r = await tx<{ k: string; v: T } | undefined>(STORES.cache, 'readonly', s => s.get(k));
  return r ? r.v : null;
}
export async function cachePut<T>(k: string, v: T): Promise<void> { await tx(STORES.cache, 'readwrite', s => s.put({ k, v, t: Date.now() })); }
export async function cacheDel(k: string): Promise<void> { await tx(STORES.cache, 'readwrite', s => s.delete(k)); }

/* ---------- foydalanuvchi qatlamlari (import qilingan obyektlar; hujjatda faqat tavsif) ---------- */
const ulKey = (project: string, layer: string) => `ul:${project}:${layer}`;
export async function putLayerData(project: string, layer: string, features: unknown[]): Promise<void> { await tx(STORES.assets, 'readwrite', s => s.put({ id: ulKey(project, layer), features, t: Date.now() })); }
export async function getLayerData<T>(project: string, layer: string): Promise<T[] | null> {
  const r = await tx<{ features: T[] } | undefined>(STORES.assets, 'readonly', s => s.get(ulKey(project, layer)));
  return r ? r.features : null;
}
export async function deleteLayerData(project: string, layer: string): Promise<void> { await tx(STORES.assets, 'readwrite', s => s.delete(ulKey(project, layer))); }

/* ---------- fayl ---------- */
export const FILE_KIND = 'archemistry-master-reja';

/** layers — import qilingan qatlamlar obyektlari (qatlam id → obyektlar): fayl boshqa kompyuterda toʻliq ochilishi uchun */
export function exportJSON(doc: Project, layers?: Record<string, unknown[]>): string {
  const L = layers && Object.keys(layers).length ? layers : null;
  // katta qatlamlar bilan chiroyli formatlash fayldagi joyni 3 baravar oshiradi — u holda ixcham yoziladi
  return JSON.stringify({ kind: FILE_KIND, exported: new Date().toISOString(), project: doc, ...(L ? { layers: L } : {}) }, null, L ? 0 : 1);
}

/** Fayldan oʻqish; nusxa sifatida ochish uchun yangi id beriladi (mavjud loyiha ustiga yozilmaydi) */
export function importJSON(text: string, newId: () => string): Project {
  let j: any;
  try { j = JSON.parse(text); } catch { throw new Error('Fayl JSON emas'); }
  if (!j || j.kind !== FILE_KIND || !j.project) throw new Error('Bu Archemistry Master reja fayli emas');
  const p = migrate(j.project);
  return { ...p, id: newId() };
}

/** Fayldan ochish: loyiha + qatlamlar obyektlari (faqat hujjatda tavsifi bor qatlamlar) */
export function importJSONWithLayers(text: string, newId: () => string): { project: Project; layers: Record<string, unknown[]> } {
  const project = importJSON(text, newId);
  let layers: Record<string, unknown[]> = {};
  try { const j = JSON.parse(text); if (j.layers && typeof j.layers === 'object') layers = j.layers; } catch { /* importJSON allaqachon tekshirdi */ }
  const ids = new Set((project.userLayers ?? []).map(l => l.id));
  return { project, layers: Object.fromEntries(Object.entries(layers).filter(([k, v]) => ids.has(k) && Array.isArray(v))) };
}

/* ---------- avtosaqlash ---------- */
export interface AutoSaver { flush(): Promise<void>; dispose(): void; readonly state: 'saved' | 'pending' | 'error' }

/** Har oʻzgarishdan keyin `delay` ms jimlikda saqlaydi; xatoni onState orqali bildiradi */
export function autosave(subscribe: (fn: (doc: Project) => void) => () => void, onState: (s: AutoSaver['state']) => void, delay = 500, put = putProject): AutoSaver {
  let timer: ReturnType<typeof setTimeout> | null = null, last: Project | null = null, state: AutoSaver['state'] = 'saved';
  const set = (s: AutoSaver['state']) => { state = s; onState(s); };
  const run = async () => { timer = null; const d = last; if (!d) return; try { await put(d); if (last === d) set('saved'); } catch (e) { console.error(e); set('error'); } };
  const off = subscribe(doc => { last = doc; set('pending'); if (timer) clearTimeout(timer); timer = setTimeout(run, delay); });
  return {
    get state() { return state; },
    async flush() { if (timer) { clearTimeout(timer); await run(); } },
    dispose() { off(); if (timer) clearTimeout(timer); },
  };
}
