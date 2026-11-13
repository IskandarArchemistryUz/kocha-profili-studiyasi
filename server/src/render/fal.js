/* fal.ai mijozi: queue (yuborish, holat, natija) va webhook imzosini tekshirish.
   Kalit faqat serverdagi .env da (FAL_KEY). Dvigatel nomlari oʻzimizniki (Archemistry Tez / Pro) — provayder brauzerga koʻrinmaydi.
   Webhook imzosi (fal hujjati): ED25519; xabar = request_id \n user_id \n timestamp \n sha256hex(body);
   ochiq kalitlar — JWKS (24 soat keshlanadi); vaqt farqi ±300 s. */
import { createHash, createPublicKey, verify as edVerify } from 'node:crypto';

export const QUEUE = 'https://queue.fal.run';
export const JWKS_URL = 'https://rest.fal.ai/.well-known/jwks.json';

/**
 * Dvigatellar. usd — taxminiy tannarx (fal narxlari 13.11.2026; kunlik chegara shu bilan hisoblanadi).
 * Model identifikatori va kirish sxemasi — kalit qoʻyilgach fal playground da bir marta tekshiring.
 */
export const ENGINES = Object.freeze({
  fast: { item: 'ren.fast', model: 'fal-ai/bytedance/seedream/v4.5/edit', usd: 0.04, input: (p) => ({ prompt: p.prompt, image_urls: p.images, num_images: 1, image_size: 'auto_2K', enable_safety_checker: true }) },
  pro: { item: 'ren.pro', model: 'fal-ai/nano-banana-pro/edit', usd: 0.15, input: (p) => ({ prompt: p.prompt, image_urls: p.images, num_images: 1, resolution: '2K', aspect_ratio: p.aspect ?? 'auto', output_format: 'png' }) },
  pro4k: { item: 'ren.pro4k', model: 'fal-ai/nano-banana-pro/edit', usd: 0.30, input: (p) => ({ prompt: p.prompt, image_urls: p.images, num_images: 1, resolution: '4K', aspect_ratio: p.aspect ?? 'auto', output_format: 'png' }) },
});

/** Kadr nisbati → fal qabul qiladigan eng yaqin qiymat */
const ARS = [['1:1', 1], ['4:3', 4 / 3], ['3:2', 1.5], ['16:9', 16 / 9], ['21:9', 21 / 9], ['3:4', 0.75], ['2:3', 2 / 3], ['9:16', 9 / 16]];
export const nearAR = (w, h) => (w > 0 && h > 0 ? ARS.reduce((b, x) => (Math.abs(Math.log(x[1] / (w / h))) < Math.abs(Math.log(b[1] / (w / h))) ? x : b))[0] : 'auto');

/** queue holat yoʻli — faqat «egasi/ilova» (ichki boʻlimsiz) */
const appOf = (engine) => ENGINES[engine].model.split('/').slice(0, 2).join('/');

export class FalError extends Error {
  constructor(status, msg, kind) { super(msg); this.status = status; this.kind = kind; }
}

export function makeFal({ key, fetchImpl = globalThis.fetch, base = QUEUE, jwksUrl = JWKS_URL, now = () => new Date(), timeoutMs = 30_000 }) {
  if (!key) throw new Error('FAL_KEY berilmagan');
  const auth = { authorization: `Key ${key}` };
  async function call(url, init = {}) {
    let r;
    try { r = await fetchImpl(url, { ...init, headers: { ...auth, ...(init.headers ?? {}) }, signal: AbortSignal.timeout(timeoutMs) }); }
    catch (e) { throw new FalError(0, `fal: ${e?.name === 'TimeoutError' ? 'vaqt tugadi' : 'aloqa yoʻq'}`, 'network'); }
    const j = await r.json().catch(() => null);
    if (!r.ok) {
      const detail = typeof j?.detail === 'string' ? j.detail : JSON.stringify(j?.detail ?? j ?? '').slice(0, 200);
      // balans tugasa fal 403 «Exhausted balance» qaytaradi — egasiga xabar beriladi
      throw new FalError(r.status, `fal ${r.status}: ${detail}`, /balance|locked/i.test(detail) ? 'balance' : r.status === 422 ? 'input' : 'upstream');
    }
    return j;
  }

  let jwks = null, jwksAt = 0;
  async function keys() {
    if (jwks && now().getTime() - jwksAt < 24 * 3600e3) return jwks;
    const r = await fetchImpl(jwksUrl, { signal: AbortSignal.timeout(10_000) });
    if (!r.ok) throw new FalError(r.status, 'fal JWKS olinmadi', 'jwks');
    const j = await r.json();
    jwks = (j.keys ?? []).filter((k) => k.kty === 'OKP' && k.crv === 'Ed25519' && k.x).map((k) => createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: k.x }, format: 'jwk' }));
    jwksAt = now().getTime();
    return jwks;
  }

  return {
    /** Navbatga qoʻyish → { request_id } */
    async submit(engine, params, webhookUrl) {
      const e = ENGINES[engine];
      if (!e) throw new FalError(400, 'dvigatel notoʻgʻri', 'input');
      const url = `${base}/${e.model}${webhookUrl ? `?fal_webhook=${encodeURIComponent(webhookUrl)}` : ''}`;
      const j = await call(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(e.input(params)) });
      if (!j?.request_id) throw new FalError(502, 'fal: request_id yoʻq', 'upstream');
      // holat va natija manzillari javobda keladi — saqlanadi (model yoʻli ichki boʻlimli boʻlsa ham toʻgʻri)
      return { request_id: j.request_id, status_url: j.status_url ?? null, response_url: j.response_url ?? null };
    },
    /** Holat: IN_QUEUE · IN_PROGRESS · COMPLETED (xato boʻlsa ham COMPLETED + error) */
    status: (engine, id, url) => call(url || `${base}/${appOf(engine)}/requests/${encodeURIComponent(id)}/status`),
    result: (engine, id, url) => call(url || `${base}/${appOf(engine)}/requests/${encodeURIComponent(id)}`),
    /** Webhook imzosi: true — haqiqiy fal xabari */
    async verifyWebhook(headers, raw) {
      const h = (n) => headers[n] ?? headers[n.toLowerCase()];
      const rid = h('x-fal-webhook-request-id'), uid = h('x-fal-webhook-user-id'), ts = h('x-fal-webhook-timestamp'), sig = h('x-fal-webhook-signature');
      if (!rid || !uid || !ts || !sig || !/^[0-9a-f]+$/i.test(sig)) return false;
      if (!/^\d+$/.test(ts) || Math.abs(now().getTime() / 1000 - Number(ts)) > 300) return false;
      const msg = Buffer.from([rid, uid, ts, createHash('sha256').update(raw).digest('hex')].join('\n'), 'utf8');
      const s = Buffer.from(sig, 'hex');
      for (const k of await keys()) { try { if (edVerify(null, msg, k, s)) return true; } catch { /* boshqa kalit */ } }
      return false;
    },
  };
}
