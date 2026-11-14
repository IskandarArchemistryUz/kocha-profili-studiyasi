/**
 * Xizmatlar holati loyiha bilan birga (3b-1, 14.11.2026).
 * Joyshunos, Koʻchasoz, Render… oʻz holatini brauzerda `kalit@<loyiha id>` sifatida saqlaydi (core/projctx.scoped).
 * Loyiha bulutga yuklanganda shu kalitlar fayl ichida `svc` boʻlib ketadi, boshqa qurilmada yuklab olinganda qayta yoziladi —
 * tahlil hududi, qatlamlar, koʻcha, render asosi yoʻqolmaydi.
 * Xizmat sahifasi oʻzi ham kuzatadi: holat oʻzgarsa va loyiha bulutda boʻlsa — bir necha soniyadan keyin yuklaydi.
 */
type KV = Pick<Storage, 'getItem' | 'setItem' | 'key' | 'length'>;

/** bitta qiymat va jami chegaralari (localStorage ~5 MB; bulutga keraksiz ogʻirlik bormasin) */
export const SVC_MAX_ITEM = 512 * 1024, SVC_MAX_TOTAL = 3 * 1024 * 1024;

const ls = (): KV | null => { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; } };

/** Loyihaning xizmat kalitlari: { asosiy kalit → matn } (kalitdan `@id` olib tashlanadi) */
export function collectSvc(p: string, store: KV | null = ls()): Record<string, string> {
  const out: Record<string, string> = {}; if (!store) return out;
  const suf = `@${p}`; let total = 0;
  const keys: string[] = [];
  try { for (let i = 0; i < store.length; i++) { const k = store.key(i); if (k && k.endsWith(suf) && k.length > suf.length) keys.push(k); } } catch { return out; }
  for (const k of keys.sort()) {
    const v = store.getItem(k); if (v == null || v.length > SVC_MAX_ITEM || total + v.length > SVC_MAX_TOTAL) continue;
    out[k.slice(0, -suf.length)] = v; total += v.length;
  }
  return out;
}

/** Bulutdan kelgan holatni yozish (bulutdagisi yangiroq — ustiga yoziladi). Yozilgan kalitlar soni. */
export function restoreSvc(p: string, svc: unknown, store: KV | null = ls()): number {
  if (!store || !svc || typeof svc !== 'object') return 0;
  let n = 0;
  for (const [k, v] of Object.entries(svc as Record<string, unknown>)) {
    if (typeof v !== 'string' || !/^[\w.:-]{1,64}$/.test(k) || v.length > SVC_MAX_ITEM) continue;
    try { store.setItem(`${k}@${p}`, v); n++; } catch { /* joy yoʻq */ }
  }
  return n;
}

/** Holat izi (FNV-1a) — oʻzgarganini bilish uchun */
export function svcHash(svc: Record<string, string>): string {
  let h = 0x811c9dc5;
  for (const k of Object.keys(svc).sort()) { const s = `${k}=${svc[k]};`; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } }
  return h.toString(36);
}
