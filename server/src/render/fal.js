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
/** Kirish oʻlchami (uzun tomoni ≤ 2048) — modelga aniq oʻlcham beriladi, kadr qayta kesilmasin */
const sizeOf = (p, long = 0) => {
  if (!(p.w > 0 && p.h > 0)) return undefined;
  const k = long ? long / Math.max(p.w, p.h) : 1;
  return { width: Math.round((p.w * k) / 16) * 16, height: Math.round((p.h * k) / 16) * 16 };
};
const KONTEXT_AR = new Set(['21:9', '16:9', '4:3', '3:2', '1:1', '2:3', '3:4', '9:16', '9:21']);

export const ENGINES = Object.freeze({
  /* 13.11 kechqurun (egasi tasdiqladi, project claude/render-model-taqqoslov-13-11.md):
     Tez — Seedream 5 Lite (aniq o'lcham — kadr saqlanadi); Pro / Pro 4K — GPT Image 2 (eng realistik, kamera saqlanadi) */
  fast: { item: 'ren.fast', model: 'fal-ai/bytedance/seedream/v5/lite/edit', usd: 0.035, input: (p) => ({ prompt: p.prompt, image_urls: p.images, num_images: 1, ...(sizeOf(p) ? { image_size: sizeOf(p) } : {}), enable_safety_checker: true }) },
  pro: { item: 'ren.pro', model: 'openai/gpt-image-2/edit', usd: 0.08, input: (p) => ({ prompt: p.prompt, image_urls: p.images, num_images: 1, image_size: sizeOf(p, 2048) ?? 'auto', quality: 'medium', output_format: 'png' }) },
  pro4k: { item: 'ren.pro4k', model: 'openai/gpt-image-2/edit', usd: 0.45, input: (p) => ({ prompt: p.prompt, image_urls: p.images, num_images: 1, image_size: sizeOf(p, 3840) ?? 'auto', quality: 'high', output_format: 'png' }) },
  /* eski Pro (Nano Banana Pro) — egasi sinovi uchun saqlanadi */
  nbpro: { item: 'ren.pro', lab: true, model: 'fal-ai/nano-banana-pro/edit', usd: 0.15, input: (p) => ({ prompt: p.prompt, image_urls: p.images, num_images: 1, resolution: '2K', aspect_ratio: p.aspect ?? 'auto', output_format: 'png' }) },
  /* Kattalashtirish (kind: 'up'): kirish — tayyor natija. SeedVR2 — asliga sodiq; Clarity — detal qo'shadi (Magnific uslubi) */
  up2: { item: 'ren.up2', kind: 'up', factor: 2, label: 'Kattalashtirish', model: 'fal-ai/seedvr/upscale/image', usd: 0.02, input: (p) => ({ image_url: p.images[0], upscale_mode: 'factor', upscale_factor: 2, noise_scale: 0.1, output_format: 'jpg' }) },
  up3: { item: 'ren.up3', kind: 'up', factor: 3, label: 'Kattalashtirish', model: 'fal-ai/seedvr/upscale/image', usd: 0.04, input: (p) => ({ image_url: p.images[0], upscale_mode: 'factor', upscale_factor: 3, noise_scale: 0.1, output_format: 'jpg' }) },
  up4: { item: 'ren.up4', kind: 'up', factor: 4, label: 'Kattalashtirish', model: 'fal-ai/seedvr/upscale/image', usd: 0.06, input: (p) => ({ image_url: p.images[0], upscale_mode: 'factor', upscale_factor: 4, noise_scale: 0.1, output_format: 'jpg' }) },
  enhance: { item: 'ren.enhance', kind: 'up', factor: 2, maxOut: 4096, label: 'Tiniqlashtirish', model: 'fal-ai/clarity-upscaler', usd: 0.3, input: (p) => ({ image_url: p.images[0], upscale_factor: 2, prompt: 'masterpiece, best quality, highres, photorealistic architectural photography, sharp facade details', negative_prompt: '(worst quality, low quality, normal quality:2), blurry, distorted geometry', creativity: 0.3, resemblance: 0.7, enable_safety_checker: true }) },
  /* Sinov modellari (13.11, lab: true) — hozircha faqat egasiga: geometriya taqqoslovi, keyin eng yaxshisi «Tez» boʻladi */
  qwen: { item: 'ren.fast', lab: true, model: 'fal-ai/qwen-image-edit-2511', usd: 0.07, input: (p) => ({ prompt: p.prompt, image_urls: p.images, num_images: 1, output_format: 'png', enable_safety_checker: true }) },
  kontext: { item: 'ren.fast', lab: true, model: 'fal-ai/flux-pro/kontext', usd: 0.04, refs: false, input: (p) => ({ prompt: p.prompt, image_url: p.images[0], num_images: 1, output_format: 'png', safety_tolerance: '2', ...(KONTEXT_AR.has(p.aspect) ? { aspect_ratio: p.aspect } : {}) }) },
  seedream5: { item: 'ren.fast', lab: true, model: 'fal-ai/bytedance/seedream/v5/lite/edit', usd: 0.035, input: (p) => ({ prompt: p.prompt, image_urls: p.images, num_images: 1, ...(sizeOf(p) ? { image_size: sizeOf(p) } : {}), enable_safety_checker: true }) },
  gptimg: { item: 'ren.pro', lab: true, model: 'openai/gpt-image-2/edit', usd: 0.2, input: (p) => ({ prompt: p.prompt, image_urls: p.images, num_images: 1, image_size: 'auto', quality: 'medium', output_format: 'png' }) },
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
