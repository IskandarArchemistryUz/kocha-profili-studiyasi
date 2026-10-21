/* Ishga tushirish: node src/server.js
   Muhit oʻzgaruvchilari (.env.example ga qarang). Maxfiy qiymatlar repoga yozilmaydi. */
import pg from 'pg';
import { fromPool, migrate } from './db.js';
import { buildApp } from './app.js';
import { makeSender } from './mailer.js';
import { makeGoogleVerifier } from './google.js';

const env = process.env;
const need = (k) => { if (!env[k]) { console.error(`${k} berilmagan`); process.exit(1); } return env[k]; };

const pool = new pg.Pool({ connectionString: need('DATABASE_URL'), max: 10 });
const db = fromPool(pool);
await migrate(db);

const app = await buildApp({
  db,
  pepper: need('OTP_PEPPER'),
  secret: need('TICKET_SECRET'),
  send: makeSender(env.OTP_SENDER || 'log'),
  googleClientId: env.GOOGLE_CLIENT_ID || null,
  google: env.GOOGLE_CLIENT_ID ? makeGoogleVerifier(env.GOOGLE_CLIENT_ID) : null,
  payme: env.PAYME_MERCHANT_ID && env.PAYME_KEY ? { merchantId: env.PAYME_MERCHANT_ID, key: env.PAYME_KEY, test: env.PAYME_TEST === '1' } : null,
  click: env.CLICK_SERVICE_ID && env.CLICK_MERCHANT_ID && env.CLICK_SECRET ? { serviceId: env.CLICK_SERVICE_ID, merchantId: env.CLICK_MERCHANT_ID, secret: env.CLICK_SECRET } : null,
  returnUrl: env.PAY_RETURN_URL || 'https://archemistry.uz/app/',
  origins: (env.ORIGINS || 'https://archemistry.uz,https://www.archemistry.uz').split(','),
  cookieDomain: env.COOKIE_DOMAIN || undefined,
  secure: env.COOKIE_SECURE !== '0',
  logger: true,
});
await app.listen({ host: env.HOST || '127.0.0.1', port: Number(env.PORT || 8080) });
