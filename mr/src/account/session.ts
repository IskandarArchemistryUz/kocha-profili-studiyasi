/** Hisob: sessiya (HttpOnly cookie api.archemistry.uz da), /me, kod soʻrash va tasdiqlash, Google, chiqish */
import { apiBase } from './config';
import { getLang } from '../i18n';

export interface Me { id: number; email: string | null; phone: string | null; name: string | null; balance: number; trialsLeft: number }
export interface AuthCfg { email: boolean; phone: boolean; google: string | null }
export class ApiError extends Error { constructor(public code: string, msg: string, public status = 0) { super(msg); } }

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
  const j = await r.json().catch(() => ({})) as { error?: string; message?: string };
  if (!r.ok) throw new ApiError(j.error ?? 'server', j.message ?? 'Server xatosi', r.status);
  return j as T;
}

/** Sessiya bormi (bir marta soʻraladi; xato — kirilmagan deb hisoblanadi) */
export function check(force = false): Promise<Me | null> {
  if (!checked || force) checked = call<Me>('/me').then(m => { set(m); return m; }, () => { set(null); return null; });
  return checked;
}
export const config = (): Promise<AuthCfg> => call<AuthCfg>('/auth/config');
export const requestCode = (target: string): Promise<{ sent: boolean; kind: string }> => call('/auth/code', { target, lang: getLang() });
export async function verifyCode(target: string, code: string): Promise<Me | null> { await call('/auth/verify', { target, code }); return check(true); }
export async function google(credential: string): Promise<Me | null> { await call('/auth/google', { credential }); return check(true); }
export async function logout(): Promise<void> { try { await call('/auth/logout', {}); } finally { checked = Promise.resolve(null); set(null); } }
