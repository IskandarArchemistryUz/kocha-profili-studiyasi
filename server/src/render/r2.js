/* Cloudflare R2 (S3 mos API) — AWS SigV4 imzosi qoʻlda (SDK siz, ~bitta fayl).
   VPS rasm saqlamaydi: brauzer kirishni toʻgʻridan-toʻgʻri R2 ga PUT qiladi (presigned, 5 daqiqa),
   server natijani fal URL dan R2 ga stream bilan koʻchiradi, brauzerga qisqa muddatli GET havolasi beriladi. */
import { createHash, createHmac } from 'node:crypto';

const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
const encPath = (k) => k.split('/').map(enc).join('/');
const sha = (s) => createHash('sha256').update(s).digest('hex');
const hmac = (k, s) => createHmac('sha256', k).update(s).digest();
const amzDate = (d) => d.toISOString().replace(/[:-]|\.\d{3}/g, '');   // 20261113T101500Z

/**
 * @param {object} o
 * @param {string} o.accountId  R2_ACCOUNT_ID
 * @param {string} o.keyId      R2_ACCESS_KEY_ID
 * @param {string} o.secret     R2_SECRET_ACCESS_KEY
 * @param {string} o.bucket     R2_BUCKET
 * @param {string} [o.endpoint] sukut: https://<account>.r2.cloudflarestorage.com
 */
export function makeR2({ accountId, keyId, secret, bucket, endpoint, region = 'auto', virtualHost = false, fetchImpl = globalThis.fetch, now = () => new Date() }) {
  if (!keyId || !secret || !bucket || (!accountId && !endpoint)) throw new Error('R2 sozlamasi toʻliq emas');
  const base = new URL(endpoint || `https://${accountId}.r2.cloudflarestorage.com`);
  const host = base.host, service = 's3';
  // R2 — yoʻl uslubi (/bucket/key); virtualHost — AWS hujjatidagi namuna bilan tekshirish uchun (host = bucket.endpoint)
  const pathOf = (key) => (virtualHost ? `/${encPath(key)}` : `/${bucket}/${encPath(key)}`);

  function signingKey(day) {
    return hmac(hmac(hmac(hmac(`AWS4${secret}`, day), region), service), 'aws4_request');
  }

  /** Presigned URL (query imzo). headers — imzoga kiradigan sarlavhalar (brauzer aynan shularni yuborishi shart). */
  function presign(method, key, { expires = 300, headers = {} } = {}) {
    const t = now(), d = amzDate(t), day = d.slice(0, 8), scope = `${day}/${region}/${service}/aws4_request`;
    const hs = { host, ...Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v).trim()])) };
    const names = Object.keys(hs).sort();
    const q = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256', 'X-Amz-Credential': `${keyId}/${scope}`, 'X-Amz-Date': d,
      'X-Amz-Expires': String(expires), 'X-Amz-SignedHeaders': names.join(';'),
    };
    const qs = Object.keys(q).sort().map((k) => `${enc(k)}=${enc(q[k])}`).join('&');
    const path = pathOf(key);
    const canon = [method, path, qs, names.map((n) => `${n}:${hs[n]}\n`).join(''), names.join(';'), 'UNSIGNED-PAYLOAD'].join('\n');
    const sts = ['AWS4-HMAC-SHA256', d, scope, sha(canon)].join('\n');
    const sig = createHmac('sha256', signingKey(day)).update(sts).digest('hex');
    return `${base.origin}${path}?${qs}&X-Amz-Signature=${sig}`;
  }

  /** Sarlavha imzosi bilan soʻrov (server oʻzi: HEAD, PUT, DELETE) */
  function signedInit(method, key, headers = {}) {
    const t = now(), d = amzDate(t), day = d.slice(0, 8), scope = `${day}/${region}/${service}/aws4_request`;
    const hs = { host, 'x-amz-content-sha256': 'UNSIGNED-PAYLOAD', 'x-amz-date': d, ...Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v).trim()])) };
    const names = Object.keys(hs).sort();
    const path = pathOf(key);
    const canon = [method, path, '', names.map((n) => `${n}:${hs[n]}\n`).join(''), names.join(';'), 'UNSIGNED-PAYLOAD'].join('\n');
    const sts = ['AWS4-HMAC-SHA256', d, scope, sha(canon)].join('\n');
    const sig = createHmac('sha256', signingKey(day)).update(sts).digest('hex');
    const { host: _h, ...send } = hs;
    return { url: `${base.origin}${path}`, headers: { ...send, authorization: `AWS4-HMAC-SHA256 Credential=${keyId}/${scope}, SignedHeaders=${names.join(';')}, Signature=${sig}` } };
  }

  return {
    /** Brauzer uchun yuklash havolasi: turi va hajmi imzoga kiradi — boshqa fayl yoki kattaroq hajm qabul qilinmaydi */
    presignPut: (key, { type, bytes, expires = 300 }) => ({
      url: presign('PUT', key, { expires, headers: { 'content-type': type, 'content-length': bytes } }),
      headers: { 'content-type': type },
    }),
    presignGet: (key, expires = 3600) => presign('GET', key, { expires }),
    /** Obyekt bormi: { bytes, type } yoki null */
    async head(key) {
      const { url, headers } = signedInit('HEAD', key);
      const r = await fetchImpl(url, { method: 'HEAD', headers });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`R2 HEAD ${r.status}`);
      return { bytes: Number(r.headers.get('content-length')) || 0, type: r.headers.get('content-type') || '' };
    },
    /** Yozish: body — Buffer yoki web ReadableStream (bytes maʼlum boʻlishi shart: R2 chunked qabul qilmaydi) */
    async put(key, body, { type, bytes }) {
      const { url, headers } = signedInit('PUT', key, { 'content-type': type, 'content-length': bytes });
      const r = await fetchImpl(url, { method: 'PUT', headers, body, duplex: 'half' });
      if (!r.ok) throw new Error(`R2 PUT ${r.status}`);
    },
    async del(key) {
      const { url, headers } = signedInit('DELETE', key);
      const r = await fetchImpl(url, { method: 'DELETE', headers });
      if (!r.ok && r.status !== 404) throw new Error(`R2 DELETE ${r.status}`);
    },
  };
}
