/**
 * Render — server chaqiruvlari (server/src/render/routes.js). Kalit yoʻq: hamma render serverda, tanga bilan.
 * Oqim: kadr → WebP (≤ 2048 px) → /render/upload-url → R2 ga toʻgʻridan-toʻgʻri PUT → /render/jobs → har 3 s /render/jobs/:id.
 */
import { apiBase } from '../account/config';
import { ApiError } from '../account/session';

/** Hammaga: fast · pro · pro4k. Sinov modellari (lab) — faqat egasiga, server konfigida keladi */
export type Engine = 'fast' | 'pro' | 'pro4k' | 'nbpro' | 'qwen' | 'kontext' | 'seedream5' | 'gptimg' | 'up2' | 'up3' | 'up4' | 'enhance';
export const ENGINES: [Engine, string][] = [['fast', 'Tez'], ['pro', 'Pro 2K'], ['pro4k', 'Pro 4K']];
export const LAB: [Engine, string][] = [['nbpro', 'Nano Banana Pro'], ['qwen', 'Qwen Edit'], ['kontext', 'FLUX Kontext'], ['seedream5', 'Seedream 5'], ['gptimg', 'GPT Image 2']];
export interface RenderCfg { enabled: boolean; message: string | null; engines: Partial<Record<Engine, { coins: number; lab?: boolean }>>; maxBytes: number; maxSide: number; maxRefs: number; types: string[]; owner?: boolean; parallel?: number }
export type Status = 'queued' | 'running' | 'done' | 'failed' | 'refunded';
export interface Job {
  id: string; status: Status; engine: Engine; source: string; coins: number; created: string; finished: string | null; downgraded: boolean;
  params: { subj?: string; style?: string; fid?: string; refs: number; from?: string; factor?: number }; tag: string | null;
  thumb?: string; out?: string; w?: number | null; h?: number | null; prompt?: string; error?: string;
}
/** Yangi render (input…) yoki tayyor natijani kattalashtirish (from — ish id si) */
export interface JobBody {
  engine: Engine; input?: { key: string; w: number; h: number }; refs?: { key: string; role: string }[]; from?: string;
  subj?: string; style?: string; fid?: string; extra?: string; source?: string; tag?: string; project?: string;
}
/** Kattalashtirish: SeedVR2 (asliga sodiq) va tiniqlashtirish (detal qo'shadi, 2×) */
export const UPS: [Engine, string][] = [['up2', '×2'], ['up3', '×3'], ['up4', '×4']];
export const TERMINAL: Status[] = ['done', 'failed', 'refunded'];
export const POLL_MS = 3000;

type F = typeof fetch;
let F_: F = (...a) => fetch(...a);
/** testlar uchun */
export const setFetch = (f: F): void => { F_ = f; };

async function call<T>(path: string, body?: unknown): Promise<T> {
  let r: Response;
  try {
    r = await F_(apiBase() + path, { method: body === undefined ? 'GET' : 'POST', credentials: 'include',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch { throw new ApiError('offline', 'Server bilan aloqa yoʻq. Internetni tekshiring yoki birozdan keyin urinib koʻring.'); }
  const j = await r.json().catch(() => ({})) as { error?: string; message?: string; need?: number; balance?: number };
  if (!r.ok) throw new ApiError(j.error ?? 'server', j.message ?? 'Server xatosi', r.status, { need: j.need, balance: j.balance });
  return j as T;
}

export const renderApi = {
  config: () => call<RenderCfg>('/render/config'),
  job: (id: string) => call<Job>(`/render/jobs/${encodeURIComponent(id)}`),
  history: (limit = 30) => call<{ items: Job[] }>(`/render/history?limit=${limit}`).then(r => r.items),
  create: (b: JobBody) => call<{ id: string; status: Status; engine: Engine; coins: number; downgraded: boolean; balance: number }>('/render/jobs', b),
  /** Rasmni R2 ga yuklash: imzolangan havola olinadi, fayl toʻgʻridan-toʻgʻri R2 ga ketadi (server orqali emas) */
  async upload(blob: Blob): Promise<string> {
    const u = await call<{ key: string; url: string; headers: Record<string, string> }>('/render/upload-url', { type: blob.type, bytes: blob.size });
    let r: Response;
    try { r = await F_(u.url, { method: 'PUT', headers: u.headers, body: blob }); }
    catch { throw new ApiError('upload', 'Rasm yuklanmadi — internetni tekshiring'); }
    if (!r.ok) throw new ApiError('upload', 'Rasm yuklanmadi', r.status);
    return u.key;
  },
};

/** Kadr → WebP (brauzer WebP yoza olmasa — PNG), uzun tomoni ≤ max px. Natija ≤ maxBytes boʻlguncha sifat pasayadi. */
export async function toUpload(src: string, max = 2048, maxBytes = 8 * 2 ** 20): Promise<{ blob: Blob; w: number; h: number }> {
  const im = new Image();
  if (/^https?:/.test(src)) im.crossOrigin = 'anonymous';
  im.src = src; await im.decode();
  const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
  const x = c.getContext('2d')!; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
  for (const q of [0.92, 0.85, 0.75, 0.6]) {
    const b = await new Promise<Blob | null>(ok => c.toBlob(ok, 'image/webp', q));
    if (b && (b.type === 'image/webp' || b.type === 'image/png') && b.size <= maxBytes) return { blob: b, w: c.width, h: c.height };
    if (b && b.type !== 'image/webp') break;   // WebP yoʻq — sifat yordam bermaydi
  }
  throw new ApiError('too_big', 'Rasm juda katta');
}

/** Ish tugaguncha soʻrash (3 s). onTick — har javobda; signal — toʻxtatish */
export async function waitJob(id: string, onTick?: (j: Job) => void, signal?: AbortSignal, api = renderApi, ms = POLL_MS): Promise<Job> {
  let misses = 0;
  for (;;) {
    if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
    try {
      const j = await api.job(id); misses = 0; onTick?.(j);
      if (TERMINAL.includes(j.status)) return j;
    } catch (e) {
      // aloqa uzilsa — bir necha marta urinib koʻriladi; 401/404 — darhol
      if (e instanceof ApiError && (e.status === 401 || e.status === 404)) throw e;
      if (++misses > 20) throw e;
    }
    await new Promise(ok => setTimeout(ok, ms));
  }
}
