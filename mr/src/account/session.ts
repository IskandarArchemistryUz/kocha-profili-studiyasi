/** Hisob: sessiya (HttpOnly cookie api.archemistry.uz da), /me, kod soʻrash va tasdiqlash, Google, chiqish */
import { apiBase } from './config';
import { getLang } from '../i18n';
import { syncAcctOwner } from '../core/wm';

export interface Me { id: number; email: string | null; phone: string | null; name: string | null; balance: number; trialsLeft: number; owner?: boolean }
export interface AuthCfg { email: boolean; phone: boolean; google: string | null }
export class ApiError extends Error { constructor(public code: string, msg: string, public status = 0, public details?: { need?: number; balance?: number }) { super(msg); } }

let me: Me | null = null, checked: Promise<Me | null> | null = null;
const subs = new Set<(m: Me | null) => void>();
export const onAuth = (f: (m: Me | null) => void): (() => void) => { subs.add(f); return () => subs.delete(f); };
const set = (m: Me | null) => { me = m; subs.forEach(f => f(m)); };
export const current = (): Me | null => me;

async function call<T>(path: string, body?: unknown): Promise<T> {
  let r: Response;
  try {
    r = await fetch(apiBase() + path, { method: body === undefined ? 'GET' : 'POST', credentials: 'include', headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch { throw new ApiError('offline', 'Server bilan aloqa yoʻq. Internetni tekshiring yoki birozdan keyin urinib koʻring.'); }
  const j = await r.json().catch(() => ({})) as { error?: string; message?: string; need?: number; balance?: number };
  if (!r.ok) throw new ApiError(j.error ?? 'server', j.message ?? 'Server xatosi', r.status, { need: j.need, balance: j.balance });
  return j as T;
}

/** Sessiya bormi (bir marta soʻraladi; xato — kirilmagan deb hisoblanadi) */
export function check(force = false): Promise<Me | null> {
  if (!checked || force) checked = call<Me>('/me').then(m => { syncAcctOwner(!!m.owner); set(m); return m; }, (e: unknown) => { if (e instanceof ApiError && e.status === 401) syncAcctOwner(false); set(null); return null; });
  return checked;
}
export const config = (): Promise<AuthCfg> => call<AuthCfg>('/auth/config');
export const requestCode = (target: string): Promise<{ sent: boolean; kind: string }> => call('/auth/code', { target, lang: getLang() });
export async function verifyCode(target: string, code: string): Promise<Me | null> { await call('/auth/verify', { target, code }); return check(true); }
export async function google(credential: string): Promise<Me | null> { await call('/auth/google', { credential }); return check(true); }
export async function logout(): Promise<void> { try { await call('/auth/logout', {}); } finally { syncAcctOwner(false); checked = Promise.resolve(null); set(null); } }

/* ---------- toʻlov: tanga toʻplamlari (Payme / Click) ---------- */
export interface Pack { id: string; coins: number; uzs: number; usd: number }
export interface PayCfg { payme: boolean; click: boolean; multicard?: boolean; packs: Pack[] }
export interface Order { id: number; pack: string; coins: number; amount: number; provider: string; state: 'new' | 'paid' | 'cancelled' | 'refunded'; balance: number }
export const payConfig = (): Promise<PayCfg> => call<PayCfg>('/pay/config');
export const createOrder = (pack: string, provider: 'payme' | 'click' | 'multicard'): Promise<{ orderId: number; amount: number; coins: number; url: string }> => call('/pay/order', { pack, provider });
export const orderStatus = (id: number): Promise<Order> => call<Order>(`/pay/order/${id}`);

/* ---------- tanga sarfi: narx, toza eksport, haftalik sinov, tarix (account/pay.ts) ---------- */
export const quote = (items: string[], areaHa = 0): Promise<{ coins: number; k: number; items: string[] }> => call('/quote', { items, areaHa });
export const exportTicket = (items: string[], areaHa: number, stateHash: string, project?: string | null): Promise<{ ticket: string; price: number; charged: number; balance: number; repeat: boolean; capped?: boolean }> => call('/export/ticket', { items, areaHa, stateHash, project: project ?? undefined });
export const useTrial = (kind: string, ref?: string, project?: string | null, areaHa = 0): Promise<{ free: boolean; left: number; charged: number; balance: number; price?: number; capped?: boolean }> => call('/trial', { kind, ref, project: project ?? undefined, areaHa });
export interface ProjInfo { spent: number; cap: number; k: number; genFree: number }
export const projectInfo = (project: string, areaHa = 0): Promise<ProjInfo> => call('/project/info', { project, areaHa });
export interface Prices { items: Record<string, { coins: number; mr: boolean }>; trials: Record<string, { coins: number; mr: boolean }>; trialsPerWeek: number; genFree: number }
export const prices = (): Promise<Prices> => call<Prices>('/prices');
export interface HistItem { delta: number; reason: string; ref: string | null; created_at: string }
export const history = (): Promise<HistItem[]> => call<{ items: HistItem[] }>('/me/history').then(r => r.items);

/** Egasi paneli (faqat OWNER_EMAILS dagi hisob) */
export interface OwnerStats {
  at: string;
  users: { total: number; d1: number; d7: number; d30: number; google: number; email: number; phone: number; active7: number; active30: number };
  signups: { day: string; c: number }[];
  payments: { paid: number; revenue: number; revenue30: number; buyers: number; open: number; cancelled: number;
    byPack: { pack: string; c: number; s: number }[]; byPs: { ps: string; c: number; s: number }[];
    recent: { id: number; pack: string; coins: number; amount: number; ps: string; state: string; at: string; who: string | null }[] };
  coins: { bought: number; granted: number; spent: number; spend30: { reason: string; item: string; c: number; coins: number }[]; exports30: { bundle: string; c: number }[] };
  projects: { n: number; spent: number; gen: number };
}
export const ownerStats = (): Promise<OwnerStats> => call<OwnerStats>('/owner/stats');

