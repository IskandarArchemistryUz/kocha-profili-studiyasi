/* Ishga tushirish: node src/server.js
   Muhit oʻzgaruvchilari (.env.example ga qarang). Maxfiy qiymatlar repoga yozilmaydi. */
import pg from 'pg';
import { fromPool, migrate } from './db.js';
import { pruneEvents } from './events.js';
import { buildApp } from './app.js';
import { makeSender } from './mailer.js';
import { makeGoogleVerifier } from './google.js';
import { makeCache } from './data/cache.js';
import { makeEra5 } from './data/era5.js';
import { makePower } from './data/power.js';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';
import { makeFal } from './render/fal.js';
import { makeR2 } from './render/r2.js';

const env = process.env;
const need = (k) => { if (!env[k]) { console.error(`${k} berilmagan`); process.exit(1); } return env[k]; };

const pool = new pg.Pool({ connectionString: need('DATABASE_URL'), max: 10 });
const db = fromPool(pool);
await migrate(db);
// foydalanish hodisalari: 400 kundan eskisini kuniga bir marta tozalash
const prune = () => pruneEvents(db).catch((e) => console.error('events prune', e));
void prune(); setInterval(prune, 24 * 3600e3).unref();

// Egasiga xabar (render chegarasi, fal balansi): SMTP boʻlsa — pochta, boʻlmasa — jurnal
const ownerMails = (env.OWNER_EMAILS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const mailer = env.SMTP_URL ? nodemailer.createTransport(env.SMTP_URL) : null;
const notifyOwner = async (subject, text) => {
  console.warn(`[egasiga] ${subject}: ${text}`);
  if (mailer && ownerMails.length) await mailer.sendMail({ from: env.MAIL_FROM || 'Archemistry Lab <kod@archemistry.uz>', to: ownerMails.join(','), subject: `Archemistry Lab — ${subject}`, text });
};
// Render: FAL_KEY va R2 toʻliq boʻlmasa — oʻchiq (/render/* → 503 «Render vaqtincha ishlamayapti»)
const renderOn = !!(env.FAL_KEY && env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY);
if (!renderOn) console.warn('render: FAL_KEY yoki R2_* berilmagan — render oʻchiq');

const app = await buildApp({
  db,
  pepper: need('OTP_PEPPER'),
  secret: need('TICKET_SECRET'),
  send: makeSender(env.OTP_SENDER || 'log'),
  googleClientId: env.GOOGLE_CLIENT_ID || null,
  google: env.GOOGLE_CLIENT_ID ? makeGoogleVerifier(env.GOOGLE_CLIENT_ID) : null,
  payme: env.PAYME_MERCHANT_ID && env.PAYME_KEY ? { merchantId: env.PAYME_MERCHANT_ID, key: env.PAYME_KEY, test: env.PAYME_TEST === '1' } : null,
  click: env.CLICK_SERVICE_ID && env.CLICK_MERCHANT_ID && env.CLICK_SECRET ? { serviceId: env.CLICK_SERVICE_ID, merchantId: env.CLICK_MERCHANT_ID, secret: env.CLICK_SECRET } : null,
  multicard: env.MULTICARD_APP_ID && env.MULTICARD_SECRET && env.MULTICARD_STORE_ID ? {
    appId: env.MULTICARD_APP_ID.trim(), secret: env.MULTICARD_SECRET.trim(), storeId: env.MULTICARD_STORE_ID.trim(),
    base: env.MULTICARD_BASE || 'https://mesh.multicard.uz',
    callbackUrl: env.MULTICARD_CALLBACK_URL || 'https://api.archemistry.uz/pay/multicard/callback',
    mxik: env.OFD_MXIK || '10305008002000000', packageCode: env.OFD_PACKAGE_CODE || '1514296',
    unit: env.MULTICARD_AMOUNT_UNIT === 'sum' ? 'sum' : 'tiyin',
    ips: (env.MULTICARD_IPS ?? '195.158.26.90').split(',').map((s) => s.trim()).filter(Boolean),
  } : null,
  returnUrl: env.PAY_RETURN_URL || 'https://archemistry.uz/app/',
  origins: (env.ORIGINS || 'https://archemistry.uz,https://www.archemistry.uz').split(','),
  cookieDomain: env.COOKIE_DOMAIN || undefined,
  // hudud ma'lumoti keshi: sukut — server/cache (xizmat faqat /srv/archemistry/server ga yoza oladi), 20 GB
  data: { cache: makeCache({ dir: env.DATA_CACHE_DIR || fileURLToPath(new URL('../cache', import.meta.url)), maxBytes: Number(env.DATA_CACHE_GB || 20) * 2 ** 30 }), era5: makeEra5({ key: env.CDS_API_KEY || null }), power: env.NASA_POWER === '0' ? null : makePower() },
  mapKeys: { arcgis: env.ARCGIS_API_KEY || null },
  // agent «Maslahatchi»: kalit boʻlmasa oʻchiq. Narx/chegara — .env (AGENT_*), sukut agent.js: AGENT_DEFAULTS
  agent: env.ANTHROPIC_API_KEY ? {
    apiKey: env.ANTHROPIC_API_KEY.trim(),
    services: (env.AGENT_SERVICES || 'mr,joy').split(',').map((s) => s.trim()).filter(Boolean),
    models: { ...(env.AGENT_MODEL_SHORT ? { short: env.AGENT_MODEL_SHORT } : {}), ...(env.AGENT_MODEL_LONG ? { long: env.AGENT_MODEL_LONG } : {}) },
    ...(env.AGENT_PRICES ? { prices: JSON.parse(env.AGENT_PRICES) } : {}),
    ...(env.AGENT_FREE_DAILY_USD ? { freeDailyUsd: Number(env.AGENT_FREE_DAILY_USD) } : {}),
    ...(env.AGENT_DAILY_USD ? { dailyUsd: Number(env.AGENT_DAILY_USD) } : {}),
  } : null,
  render: renderOn ? {
    fal: makeFal({ key: env.FAL_KEY.trim() }),
    r2: makeR2({ accountId: env.R2_ACCOUNT_ID.trim(), keyId: env.R2_ACCESS_KEY_ID.trim(), secret: env.R2_SECRET_ACCESS_KEY.trim(), bucket: (env.R2_BUCKET || 'archemistry-render').trim() }),
    hookUrl: `${(env.RENDER_HOOK_BASE || 'https://api.archemistry.uz').replace(/\/$/, '')}/render/hook`,
    dailyUsd: Number(env.RENDER_DAILY_USD_CAP || 20),
    notify: notifyOwner,
  } : null,
  owners: (env.OWNER_EMAILS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  secure: env.COOKIE_SECURE !== '0',
  logger: true,
});
await app.listen({ host: env.HOST || '127.0.0.1', port: Number(env.PORT || 8080) });
