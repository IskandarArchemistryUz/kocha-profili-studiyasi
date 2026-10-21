/* Toʻlovlar: tanga toʻplami buyurtmasi → Payme (Merchant API, JSON-RPC) yoki Click (Shop API: prepare / complete).
   Tamoyil: summa va tanga soni faqat serverdagi buyurtmadan olinadi; toʻlov xabari ikki marta kelsa ham tanga bir marta
   qoʻshiladi (ledger: reason 'payment', ref 'order:<id>'). Protokol — Payme va Click rasmiy namunalari asosida
   (PaycomUZ/paycom-integration-php-template, click-llc/click-integration-php).
   Multicard — docs.multicard.uz: POST /auth → token; POST /payment/invoice → checkout_url;
   «Callback (success)»: sign = md5(store_id + invoice_id + amount + secret), javob {success:true}; aks holda Multicard pulni qaytaradi. */
import { createHash, timingSafeEqual } from 'node:crypto';
import { PACKS } from './prices.js';

export const PAYME_TIMEOUT = 43_200_000;   // 12 soat: yaratilgan, lekin bajarilmagan tranzaksiya eskiradi
const ms = (d) => d.getTime();
const md5 = (s) => createHash('md5').update(s).digest('hex');
const eq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };

/** Payme xatosi: kod va uch tildagi xabar */
export class PaymeError extends Error {
  constructor(code, uz, ru, en, data) { super(en); this.code = code; this.msg = { uz, ru, en }; this.data = data; }
}
const PE = {
  auth: () => new PaymeError(-32504, 'Ruxsat yoʻq', 'Недостаточно привилегий', 'Insufficient privilege'),
  method: (m) => new PaymeError(-32601, 'Usul topilmadi', 'Метод не найден', 'Method not found', m),
  rpc: () => new PaymeError(-32600, 'Soʻrov notoʻgʻri', 'Неверный запрос', 'Invalid JSON-RPC object'),
  amount: () => new PaymeError(-31001, 'Summa notoʻgʻri', 'Неверная сумма', 'Invalid amount'),
  order: () => new PaymeError(-31050, 'Buyurtma topilmadi', 'Заказ не найден', 'Order not found', 'order_id'),
  busy: () => new PaymeError(-31051, 'Buyurtma boshqa toʻlovda yoki toʻlangan', 'Заказ ожидает оплаты или оплачен', 'Order is being paid or already paid', 'order_id'),
  notFound: () => new PaymeError(-31003, 'Tranzaksiya topilmadi', 'Транзакция не найдена', 'Transaction not found'),
  perform: () => new PaymeError(-31008, 'Amalni bajarib boʻlmaydi', 'Невозможно выполнить операцию', 'Could not perform this operation'),
  cancel: () => new PaymeError(-31007, 'Bekor qilib boʻlmaydi: tangalar ishlatilgan', 'Невозможно отменить: монеты использованы', 'Could not cancel: credits already used'),
};

/**
 * @param {object} o
 * @param {object} o.db
 * @param {object} o.wallet  wallet.js (credit)
 * @param {{merchantId:string,key:string,test?:boolean}|null} o.payme
 * @param {{serviceId:string,merchantId:string,secret:string}|null} o.click
 * @param {{appId:string,secret:string,storeId:string,base:string,callbackUrl:string,mxik:string,packageCode:string,unit?:'tiyin'|'sum',ips?:string[]}|null} o.multicard
 * @param {string} o.returnUrl  toʻlovdan keyin qaytish sahifasi (?tolov=<id> qoʻshiladi)
 * @param {typeof fetch} o.fetchImpl  tashqi soʻrovlar (testda soxta)
 */
export function makePayments({ db, wallet, payme = null, click = null, multicard = null, returnUrl = 'https://archemistry.uz/app/', now = () => new Date(), fetchImpl = globalThis.fetch }) {
  const packById = (id) => PACKS.find((p) => p.id === id);

  async function createOrder(userId, packId, provider) {
    const p = packById(packId);
    if (!p) throw Object.assign(new Error('nomaʼlum toʻplam'), { code: 'bad_pack' });
    if (provider === 'payme' && !payme) throw Object.assign(new Error('Payme hali ulanmagan'), { code: 'provider_off' });
    if (provider === 'click' && !click) throw Object.assign(new Error('Click hali ulanmagan'), { code: 'provider_off' });
    if (provider === 'multicard' && !multicard) throw Object.assign(new Error('Karta orqali toʻlov hali ulanmagan'), { code: 'provider_off' });
    if (!['payme', 'click', 'multicard'].includes(provider)) throw Object.assign(new Error('toʻlov usuli notoʻgʻri'), { code: 'bad_provider' });
    const { rows } = await db.query(
      `INSERT INTO orders (user_id, pack, coins, amount, provider) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [userId, p.id, p.coins, p.uzs, provider]);
    const id = Number(rows[0].id), back = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}tolov=${id}`;
    const url = provider === 'payme' ? paymeUrl(id, p.uzs, back) : provider === 'click' ? clickUrl(id, p.uzs, back) : await multicardInvoice(id, p, back);
    return { orderId: id, amount: p.uzs, coins: p.coins, url };
  }

  /* ================= Multicard ================= */
  const mcAmount = (uzs) => (multicard?.unit === 'sum' ? uzs : uzs * 100);
  let mcToken = null, mcTokenUntil = 0;
  async function mcCall(path, body, retry = true) {
    if (!mcToken || Date.now() > mcTokenUntil) {
      const r = await fetchImpl(`${multicard.base}/auth`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ application_id: multicard.appId, secret: multicard.secret }) });
      const j = await r.json().catch(() => ({}));
      const t = j?.data?.token ?? j?.token;
      if (!r.ok || !t) throw Object.assign(new Error('Multicard: avtorizatsiya oʻtmadi'), { code: 'provider_error' });
      const exp = Date.parse(String(j?.data?.expiry ?? j?.expiry ?? '').replace(' ', 'T') + '+05:00');
      mcToken = t; mcTokenUntil = Number.isFinite(exp) ? exp - 60_000 : Date.now() + 3_600_000;
    }
    const r = await fetchImpl(`${multicard.base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mcToken}` }, body: JSON.stringify(body) });
    if (r.status === 401 && retry) { mcToken = null; return mcCall(path, body, false); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.success === false) throw Object.assign(new Error('Multicard: ' + (j?.error?.details ?? j?.message ?? `HTTP ${r.status}`)), { code: 'provider_error' });
    return j.data ?? j;
  }
  async function multicardInvoice(orderId, p, back) {
    const a = mcAmount(p.uzs);
    try {
      const d = await mcCall('/payment/invoice', {
        store_id: Number(multicard.storeId) || multicard.storeId, amount: a, invoice_id: String(orderId), lang: 'ru',
        return_url: back, callback_url: multicard.callbackUrl,
        ofd: [{ qty: 1, price: a, total: a, mxik: multicard.mxik, package_code: multicard.packageCode, name: `Archemistry Lab: ${p.coins} tanga` }],
      });
      if (!d?.checkout_url) throw Object.assign(new Error('Multicard: toʻlov havolasi kelmadi'), { code: 'provider_error' });
      await db.query(`UPDATE orders SET ext_id = $1 WHERE id = $2`, [d.uuid ?? null, orderId]);
      return d.checkout_url;
    } catch (e) {
      await db.query(`UPDATE orders SET state = 'cancelled', cancelled_at = now() WHERE id = $1 AND state = 'new'`, [orderId]);
      throw e.code ? e : Object.assign(new Error('Multicard bilan aloqa yoʻq'), { code: 'provider_error' });
    }
  }
  /** «Callback (success)»: javob {success:true} — toʻlov qabul qilindi; aks holda Multicard toʻlovni bekor qiladi */
  async function multicardCallback(b, ip) {
    const no = (message) => ({ success: false, message });
    if (!multicard) return { status: 404, body: no('Multicard ulanmagan') };
    if (multicard.ips?.length && !multicard.ips.includes(String(ip))) return { status: 403, body: no('forbidden') };
    if (!b || b.invoice_id == null || b.amount == null || !b.sign || !b.uuid) return { status: 400, body: no('Soʻrov notoʻgʻri') };
    if (!eq(md5(`${b.store_id}${b.invoice_id}${b.amount}${multicard.secret}`), String(b.sign).toLowerCase())) return { status: 400, body: no('Imzo notoʻgʻri') };
    if (String(b.store_id) !== String(multicard.storeId)) return { status: 400, body: no('Doʻkon notoʻgʻri') };
    const orderId = Number(b.invoice_id);
    return db.tx(async (q) => {
      const o = Number.isInteger(orderId) ? (await q.query(`SELECT id, amount, state, provider FROM orders WHERE id = $1 FOR UPDATE`, [orderId])).rows[0] : null;
      if (!o || o.provider !== 'multicard') return { status: 200, body: no('Buyurtma topilmadi') };
      const seen = (await q.query(`SELECT order_id FROM multicard_tx WHERE uuid = $1`, [String(b.uuid)])).rows[0];
      if (seen) return { status: 200, body: Number(seen.order_id) === orderId ? { success: true, message: 'OK' } : no('Tranzaksiya boshqa buyurtmaga tegishli') };
      if (o.state !== 'new') return { status: 200, body: no(o.state === 'paid' ? 'Buyurtma allaqachon toʻlangan' : 'Buyurtma bekor qilingan') };
      if (Number(b.amount) !== mcAmount(o.amount)) return { status: 200, body: no('Summa notoʻgʻri') };
      await q.query(`INSERT INTO multicard_tx (uuid, order_id, amount, ps, card_pan, receipt_url) VALUES ($1, $2, $3, $4, $5, $6)`,
        [String(b.uuid), orderId, Number(b.amount), b.ps ?? null, b.card_pan ?? null, b.receipt_url ?? null]);
      await markPaid(q, orderId);
      return { status: 200, body: { success: true, message: 'OK' } };
    });
  }

  /** Payme toʻlov sahifasi: base64("m=…;ac.order_id=…;a=<tiyin>;c=<qaytish>") */
  function paymeUrl(orderId, uzs, back) {
    const q = Buffer.from(`m=${payme.merchantId};ac.order_id=${orderId};a=${uzs * 100};c=${back}`).toString('base64');
    return `${payme.test ? 'https://checkout.test.paycom.uz' : 'https://checkout.paycom.uz'}/${q}`;
  }
  function clickUrl(orderId, uzs, back) {
    const u = new URL('https://my.click.uz/services/pay');
    u.search = new URLSearchParams({ service_id: click.serviceId, merchant_id: click.merchantId, amount: String(uzs), transaction_param: String(orderId), return_url: back }).toString();
    return u.toString();
  }

  async function orderOf(userId, id) {
    const { rows } = await db.query(`SELECT id, pack, coins, amount, provider, state, created_at, paid_at FROM orders WHERE id = $1 AND user_id = $2`, [id, userId]);
    return rows[0] ? { ...rows[0], id: Number(rows[0].id) } : null;
  }

  /** Buyurtma toʻlandi (tranzaksiya ichida): holat va tanga — bir marta */
  async function markPaid(q, orderId) {
    const { rows } = await q.query(`UPDATE orders SET state = 'paid', paid_at = now() WHERE id = $1 AND state = 'new' RETURNING user_id, coins, pack`, [orderId]);
    if (!rows[0]) return;
    await q.query(`INSERT INTO ledger (user_id, delta, reason, ref, note) VALUES ($1, $2, 'payment', $3, $4) ON CONFLICT (user_id, reason, ref) DO NOTHING`,
      [rows[0].user_id, rows[0].coins, `order:${orderId}`, rows[0].pack]);
  }

  /* ================= Payme ================= */
  async function paymeKey() {
    const { rows } = await db.query(`SELECT value FROM kv WHERE key = 'payme_key'`);
    return rows[0]?.value ?? payme.key;
  }
  async function paymeAuth(header) {
    const m = /^\s*Basic\s+(\S+)\s*$/i.exec(header ?? '');
    if (!m) return false;
    return eq(Buffer.from(m[1], 'base64').toString(), `Paycom:${await paymeKey()}`);
  }
  async function orderForPayme(q, params) {
    const id = Number(params?.account?.order_id);
    if (!Number.isInteger(id) || id <= 0) throw PE.order();
    const { rows } = await q.query(`SELECT id, amount, state FROM orders WHERE id = $1`, [id]);
    const o = rows[0];
    if (!o) throw PE.order();
    if (o.state !== 'new') throw PE.busy();
    if (Number(params.amount) !== o.amount * 100) throw PE.amount();
    return { id, amount: o.amount };
  }
  const txOut = (t) => ({ create_time: Number(t.create_time), perform_time: Number(t.perform_time), cancel_time: Number(t.cancel_time), transaction: String(t.id), state: t.state, reason: t.reason ?? null });
  const findTx = async (q, id, lock = false) => (await q.query(`SELECT * FROM payme_tx WHERE payme_id = $1${lock ? ' FOR UPDATE' : ''}`, [String(id)])).rows[0];
  const expired = (t) => t.state === 1 && ms(now()) - Number(t.create_time) > PAYME_TIMEOUT;
  async function cancelTx(q, t, reason, orderState = 'cancelled') {
    const state = t.state === 2 ? -2 : -1, ct = ms(now());
    await q.query(`UPDATE payme_tx SET state = $1, cancel_time = $2, reason = $3 WHERE id = $4`, [state, ct, reason, t.id]);
    await q.query(`UPDATE orders SET state = $1, cancelled_at = now() WHERE id = $2 AND state IN ('new', 'paid')`, [orderState, t.order_id]);
    return { ...t, state, cancel_time: ct, reason };
  }

  // eskirgan tranzaksiya bekor qilinishi saqlanib qolishi uchun xato tranzaksiyadan tashqarida tashlanadi
  const unwrap = (r) => { if (r && r.fail) throw r.fail; return r; };
  const PAYME = {
    async CheckPerformTransaction(p) {
      await orderForPayme(db, p);
      const { rows } = await db.query(`SELECT 1 FROM payme_tx WHERE order_id = $1 AND state IN (1, 2)`, [Number(p.account.order_id)]);
      if (rows.length) throw PE.busy();
      return { allow: true };
    },
    async CreateTransaction(p) {
      return unwrap(await db.tx(async (q) => {
        const t = await findTx(q, p.id, true);
        if (t) {
          if (t.state !== 1) throw PE.perform();
          if (expired(t)) { await cancelTx(q, t, 4); return { fail: PE.perform() }; }
          return { create_time: Number(t.create_time), transaction: String(t.id), state: t.state };
        }
        const o = await orderForPayme(q, p);
        const busy = await q.query(`SELECT 1 FROM payme_tx WHERE order_id = $1 AND state IN (1, 2) FOR UPDATE`, [o.id]);
        if (busy.rows.length) throw PE.busy();
        if (ms(now()) - Number(p.time) >= PAYME_TIMEOUT) throw PE.perform();
        const ct = ms(now());
        const { rows } = await q.query(
          `INSERT INTO payme_tx (payme_id, order_id, payme_time, amount, state, create_time) VALUES ($1, $2, $3, $4, 1, $5) RETURNING id`,
          [String(p.id), o.id, Number(p.time), Number(p.amount), ct]);
        return { create_time: ct, transaction: String(rows[0].id), state: 1 };
      }));
    },
    async PerformTransaction(p) {
      return unwrap(await db.tx(async (q) => {
        const t = await findTx(q, p.id, true);
        if (!t) throw PE.notFound();
        if (t.state === 2) return { transaction: String(t.id), perform_time: Number(t.perform_time), state: 2 };
        if (t.state !== 1) throw PE.perform();
        if (expired(t)) { await cancelTx(q, t, 4); return { fail: PE.perform() }; }
        const pt = ms(now());
        await q.query(`UPDATE payme_tx SET state = 2, perform_time = $1 WHERE id = $2`, [pt, t.id]);
        await markPaid(q, t.order_id);
        return { transaction: String(t.id), perform_time: pt, state: 2 };
      }));
    },
    async CancelTransaction(p) {
      return db.tx(async (q) => {
        const t = await findTx(q, p.id, true);
        if (!t) throw PE.notFound();
        if (t.state < 0) return { transaction: String(t.id), cancel_time: Number(t.cancel_time), state: t.state };
        if (t.state === 1) { const c = await cancelTx(q, t, Number(p.reason) || null); return { transaction: String(c.id), cancel_time: c.cancel_time, state: c.state }; }
        // bajarilgandan keyin: tangalar hali ishlatilmagan boʻlsa — qaytariladi va tanga yechiladi
        const o = (await q.query(`SELECT user_id, coins FROM orders WHERE id = $1`, [t.order_id])).rows[0];
        await q.query(`SELECT id FROM users WHERE id = $1 FOR UPDATE`, [o.user_id]);
        const bal = (await q.query(`SELECT COALESCE(SUM(delta), 0)::int AS b FROM ledger WHERE user_id = $1`, [o.user_id])).rows[0].b;
        if (bal < o.coins) throw PE.cancel();
        await q.query(`INSERT INTO ledger (user_id, delta, reason, ref, note) VALUES ($1, $2, 'refund', $3, 'payme') ON CONFLICT (user_id, reason, ref) DO NOTHING`,
          [o.user_id, -o.coins, `order:${t.order_id}`]);
        const c = await cancelTx(q, t, Number(p.reason) || null, 'refunded');
        return { transaction: String(c.id), cancel_time: c.cancel_time, state: c.state };
      });
    },
    async CheckTransaction(p) {
      const t = await findTx(db, p.id);
      if (!t) throw PE.notFound();
      return txOut(t);
    },
    async GetStatement(p) {
      const from = Number(p.from), to = Number(p.to);
      if (!(from < to)) throw new PaymeError(-31050, 'Davr notoʻgʻri', 'Неверный период', 'Incorrect period', 'from');
      const { rows } = await db.query(`SELECT * FROM payme_tx WHERE payme_time BETWEEN $1 AND $2 ORDER BY payme_time`, [from, to]);
      return { transactions: rows.map((t) => ({ id: t.payme_id, time: Number(t.payme_time), amount: Number(t.amount), account: { order_id: String(t.order_id) }, ...txOut(t), receivers: null })) };
    },
    async ChangePassword(p) {
      const pw = String(p.password ?? '').trim();
      if (!pw) throw new PaymeError(-31050, 'Parol berilmagan', 'Пароль не указан', 'Password not specified', 'password');
      await db.query(`INSERT INTO kv (key, value) VALUES ('payme_key', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [pw]);
      return { success: true };
    },
  };

  /** JSON-RPC soʻrovi → javob (Payme har doim HTTP 200 kutadi) */
  async function paymeRpc(authHeader, body) {
    const id = body?.id ?? null;
    const out = (result, e) => ({ jsonrpc: '2.0', id, ...(e ? { error: { code: e.code, message: e.msg, data: e.data ?? null } } : { result }) });
    if (!payme) return out(null, PE.method('payme_off'));
    if (!(await paymeAuth(authHeader))) return out(null, PE.auth());
    if (!body || typeof body.method !== 'string' || typeof body.params !== 'object') return out(null, PE.rpc());
    const fn = PAYME[body.method];
    if (!fn) return out(null, PE.method(body.method));
    try { return out(await fn(body.params)); }
    catch (e) { if (e instanceof PaymeError) return out(null, e); throw e; }
  }

  /* ================= Click ================= */
  const clickSign = (r, action) => md5(`${r.click_trans_id}${r.service_id}${click.secret}${r.merchant_trans_id}${action === 1 ? r.merchant_prepare_id : ''}${r.amount}${r.action}${r.sign_time}`);
  const C = (error, error_note, extra = {}) => ({ error, error_note, ...extra });

  async function clickHandle(r, action) {
    if (!click) return C(-8, 'Click is not configured');
    const need = ['click_trans_id', 'service_id', 'merchant_trans_id', 'amount', 'action', 'sign_time', 'sign_string', ...(action === 1 ? ['merchant_prepare_id'] : [])];
    if (!r || need.some((k) => r[k] == null || r[k] === '')) return C(-8, 'Error in request from click');
    const base = { click_trans_id: r.click_trans_id, merchant_trans_id: r.merchant_trans_id };
    if (!eq(clickSign(r, action), String(r.sign_string).toLowerCase())) return C(-1, 'SIGN CHECK FAILED!', base);
    if (Number(r.action) !== action) return C(-3, 'Action not found', base);
    if (String(r.service_id) !== String(click.serviceId)) return C(-8, 'Error in request from click', base);
    const orderId = Number(r.merchant_trans_id);
    return db.tx(async (q) => {
      const o = Number.isInteger(orderId) ? (await q.query(`SELECT id, amount, state FROM orders WHERE id = $1 FOR UPDATE`, [orderId])).rows[0] : null;
      if (!o) return C(-5, 'User does not exist', base);
      if (action === 0) {
        if (o.state === 'paid') return C(-4, 'Already paid', base);
        if (o.state !== 'new') return C(-9, 'Transaction cancelled', base);
        if (Math.abs(Number(r.amount) - o.amount) > 0.01) return C(-2, 'Incorrect parameter amount', base);
        const prev = (await q.query(`SELECT id, state FROM click_tx WHERE click_trans_id = $1`, [String(r.click_trans_id)])).rows[0];
        const tx = prev ?? (await q.query(`INSERT INTO click_tx (click_trans_id, order_id, amount, state) VALUES ($1, $2, $3, 'prepared') RETURNING id`, [String(r.click_trans_id), orderId, Number(r.amount)])).rows[0];
        return C(0, 'Success', { ...base, merchant_prepare_id: Number(tx.id) });
      }
      const tx = (await q.query(`SELECT id, state, order_id FROM click_tx WHERE id = $1 AND click_trans_id = $2 FOR UPDATE`, [Number(r.merchant_prepare_id), String(r.click_trans_id)])).rows[0];
      if (!tx || Number(tx.order_id) !== orderId) return C(-6, 'Transaction does not exist', base);
      if (o.state === 'paid' || tx.state === 'paid') return C(-4, 'Already paid', base);
      if (tx.state === 'cancelled' || o.state !== 'new') return C(-9, 'Transaction cancelled', base);
      if (Math.abs(Number(r.amount) - o.amount) > 0.01) return C(-2, 'Incorrect parameter amount', base);
      if (Number(r.error) < 0) {   // Click toʻlov oʻtmaganini xabar qildi
        await q.query(`UPDATE click_tx SET state = 'cancelled' WHERE id = $1`, [tx.id]);
        return C(-9, 'Transaction cancelled', base);
      }
      await q.query(`UPDATE click_tx SET state = 'paid' WHERE id = $1`, [tx.id]);
      await markPaid(q, orderId);
      return C(0, 'Success', { ...base, merchant_confirm_id: Number(tx.id) });
    });
  }

  return {
    config: () => ({ payme: !!payme, click: !!click, multicard: !!multicard, packs: PACKS }),
    createOrder, orderOf, paymeRpc, multicardCallback,
    clickPrepare: (r) => clickHandle(r, 0),
    clickComplete: (r) => clickHandle(r, 1),
    _clickSign: (r, a) => clickSign(r, a),
  };
}
