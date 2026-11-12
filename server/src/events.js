/* Foydalanish hodisalari: POST /ev (anonim, brauzerdan navigator.sendBeacon) va egasi paneli uchun hisoblar.
   Yoziladi: anonim ID (brauzer localStorage dagi tasodifiy satr), kirgan boʻlsa user_id, xizmat, hodisa nomi,
   kichik props (faqat raqam/qisqa satr), Cloudflare davlati. IP, loyiha mazmuni, joy, matn — yoʻq. */

const NAME = /^[a-z0-9][a-z0-9_./:-]{0,79}$/;
const ANON = /^[A-Za-z0-9_-]{8,40}$/;
const SVC = /^[a-z]{1,12}$/;

/** props: koʻpi bilan 8 kalit, qiymat — son, boolean yoki ≤ 80 belgili satr */
function cleanProps(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return null;
  const o = {};
  for (const [k, v] of Object.entries(p).slice(0, 8)) {
    if (!/^[a-z0-9_]{1,24}$/i.test(k)) continue;
    if (typeof v === 'number' && Number.isFinite(v)) o[k] = Math.round(v * 1000) / 1000;
    else if (typeof v === 'boolean') o[k] = v;
    else if (typeof v === 'string') o[k] = v.replace(/[\u0000-\u001f<>]/g, '').slice(0, 80);
  }
  return Object.keys(o).length ? o : null;
}

/** Brauzerdan kelgan paket: { a: anon, s: xizmat, e: [{ n: nom, p?: props }] } → yoziladigan qatorlar */
export function parseBatch(body) {
  let b = body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { return null; } }
  if (!b || typeof b !== 'object') return null;
  const anon = String(b.a ?? ''), svc = String(b.s ?? '');
  if (!ANON.test(anon) || !SVC.test(svc) || !Array.isArray(b.e)) return null;
  const rows = [];
  for (const e of b.e.slice(0, 50)) {
    const name = String(e?.n ?? '').toLowerCase();
    if (!NAME.test(name)) continue;
    rows.push({ name, props: cleanProps(e?.p) });
  }
  return { anon, svc, rows };
}

export async function insertEvents(db, { anon, svc, rows }, userId, country) {
  if (!rows.length) return 0;
  const vals = [], args = [];
  rows.forEach((r, i) => {
    const k = i * 6;
    vals.push(`($${k + 1}, $${k + 2}, $${k + 3}, $${k + 4}, $${k + 5}::jsonb, $${k + 6})`);
    args.push(anon, userId ?? null, svc, r.name, r.props ? JSON.stringify(r.props) : null, country ?? null);
  });
  await db.query(`INSERT INTO events (anon, user_id, svc, name, props, country) VALUES ${vals.join(', ')}`, args);
  return rows.length;
}

/** Eski hodisalarni tozalash (400 kundan eski) — kuniga bir marta chaqiriladi */
export async function pruneEvents(db, days = 400) {
  const r = await db.query(`DELETE FROM events WHERE at < now() - ($1::int * interval '1 day') RETURNING 1`, [days]);
  return r.rows.length;
}

const n = (x) => Number(x ?? 0);

/* Voronka bosqichlari (Master reja): sahifani ochdi → 1-qadam → kirdi → 3-qadam → pullik harakat.
   Har bosqich — oxirgi 30 kunda shu ishni qilgan anonim brauzerlar soni (oldingi bosqichdan qatʼi nazar emas: zanjir). */
export const FUNNEL = [
  { key: 'open', label: 'Master rejani ochdi' },
  { key: 'step1', label: '1-qadam: joy va uchastka' },
  { key: 'login', label: 'Hisobga kirdi' },
  { key: 'step3', label: '3-qadam: parsellar va zonalar' },
  { key: 'paid', label: 'Birinchi pullik harakat' },
];

export async function eventStats(db, at) {
  const t = at ?? new Date();
  const one = async (sql, a = [t]) => (await db.query(sql, a)).rows[0];
  const all = async (sql, a = [t]) => (await db.query(sql, a)).rows;
  // har anonim brauzer uchun 30 kunlik belgilar; zanjir — har keyingi bosqich oldingisini ham talab qiladi
  const f = await one(`WITH a AS (
      SELECT anon,
        bool_or(svc = 'mr') AS open,
        bool_or(name = 'mr/step/uchastka') AS step1,
        bool_or(user_id IS NOT NULL AND svc = 'mr') AS login,
        bool_or(name = 'mr/step/parsel') AS step3,
        array_remove(array_agg(DISTINCT user_id), NULL) AS uids
      FROM events WHERE at > $1::timestamptz - interval '30 days' GROUP BY anon),
    paid AS (SELECT DISTINCT user_id FROM ledger WHERE delta < 0 AND created_at > $1::timestamptz - interval '30 days')
    SELECT count(*) FILTER (WHERE open) AS open,
      count(*) FILTER (WHERE open AND step1) AS step1,
      count(*) FILTER (WHERE open AND step1 AND login) AS login,
      count(*) FILTER (WHERE open AND step1 AND login AND step3) AS step3,
      count(*) FILTER (WHERE open AND step1 AND login AND step3 AND EXISTS (SELECT 1 FROM paid WHERE paid.user_id = ANY(a.uids))) AS paid,
      count(*) AS anons
    FROM a`);
  // qaytish: roʻyxatdan oʻtgan haftasi boʻyicha guruh (oxirgi 8 hafta), keyingi 1/2/3/4-haftada faol boʻlganlar ulushi
  const cohorts = await all(`WITH u AS (
      SELECT id, date_trunc('week', created_at) AS wk, created_at FROM users WHERE created_at > $1::timestamptz - interval '8 weeks'),
    act AS (SELECT DISTINCT e.user_id, floor(extract(epoch FROM (e.at - u.created_at)) / 604800)::int AS w
      FROM events e JOIN u ON u.id = e.user_id WHERE e.at >= u.created_at)
    SELECT u.wk, count(DISTINCT u.id) AS size,
      count(DISTINCT act.user_id) FILTER (WHERE act.w = 1) AS w1,
      count(DISTINCT act.user_id) FILTER (WHERE act.w = 2) AS w2,
      count(DISTINCT act.user_id) FILTER (WHERE act.w = 3) AS w3,
      count(DISTINCT act.user_id) FILTER (WHERE act.w = 4) AS w4
    FROM u LEFT JOIN act ON act.user_id = u.id GROUP BY u.wk ORDER BY u.wk DESC`);
  // eng koʻp hodisalar (30 kun): nomi, soni, nechta brauzer
  const top = await all(`SELECT svc, name, count(*) AS c, count(DISTINCT anon) AS who FROM events
      WHERE at > $1::timestamptz - interval '30 days' AND name NOT LIKE 'pv%' AND name NOT LIKE 'err/%' GROUP BY 1, 2 ORDER BY c DESC LIMIT 40`);
  const svc = await all(`SELECT svc, count(DISTINCT anon) AS who, count(*) AS c FROM events
      WHERE at > $1::timestamptz - interval '30 days' GROUP BY 1 ORDER BY who DESC`);
  const day = await all(`SELECT to_char(date_trunc('day', at AT TIME ZONE 'Asia/Tashkent'), 'YYYY-MM-DD') AS d, count(DISTINCT anon) AS who
      FROM events WHERE at > $1::timestamptz - interval '30 days' GROUP BY 1 ORDER BY 1`);
  // manba: har brauzerning 30 kundagi birinchi sahifa ochilishi (first-touch) — UTM manbasi, boʻlmasa kelgan sayt
  const src = await all(`WITH f AS (
      SELECT DISTINCT ON (anon) anon, lower(coalesce(nullif(props->>'source', ''), nullif(props->>'ref', ''), '-')) AS s
      FROM events WHERE name = 'pv' AND at > $1::timestamptz - interval '30 days' ORDER BY anon, at),
    lg AS (SELECT DISTINCT anon FROM events WHERE user_id IS NOT NULL AND at > $1::timestamptz - interval '30 days')
    SELECT f.s, count(*) AS who, count(lg.anon) AS login FROM f LEFT JOIN lg ON lg.anon = f.anon GROUP BY 1 ORDER BY who DESC LIMIT 25`);
  const camp = await all(`SELECT lower(props->>'source') AS s, lower(coalesce(props->>'campaign', '')) AS c, count(DISTINCT anon) AS who FROM events
      WHERE name = 'pv' AND props ? 'source' AND at > $1::timestamptz - interval '30 days' GROUP BY 1, 2 ORDER BY who DESC LIMIT 25`);
  // qurilma: ekran kengligi boʻyicha (har brauzerning oxirgi sahifa ochilishi)
  const dev = await all(`WITH l AS (
      SELECT DISTINCT ON (anon) anon, (props->>'w')::int AS w, (props->>'touch')::boolean AS t
      FROM events WHERE name = 'pv' AND props ? 'w' AND at > $1::timestamptz - interval '30 days' ORDER BY anon, at DESC)
    SELECT CASE WHEN w < 768 THEN 'phone' WHEN w < 1280 THEN 'tablet' ELSE 'desktop' END AS k, count(*) AS who,
      count(*) FILTER (WHERE t) AS touch FROM l GROUP BY 1`);
  // xatolar (30 kun): brauzer xatolari, WebGL yoʻqolishi, taxminiy qulash (sahifa yopilmay turib oʻchgan)
  const errs = await all(`SELECT name, svc, coalesce(props->>'m', '') AS m, coalesce(props->>'at', '') AS src, count(*) AS c, count(DISTINCT anon) AS who, max(at) AS last
      FROM events WHERE name LIKE 'err/%' AND at > $1::timestamptz - interval '30 days' GROUP BY 1, 2, 3, 4 ORDER BY who DESC, c DESC LIMIT 40`);
  const since = await one(`SELECT min(at) AS at FROM events`, []);
  return {
    since: since.at ? new Date(since.at).toISOString() : null,
    funnel: FUNNEL.map((s) => ({ key: s.key, c: n(f[s.key]) })),
    anons30: n(f.anons),
    daily: day.map((r) => ({ d: r.d, who: n(r.who) })),
    services: svc.map((r) => ({ svc: r.svc, who: n(r.who), c: n(r.c) })),
    top: top.map((r) => ({ svc: r.svc, name: r.name, c: n(r.c), who: n(r.who) })),
    sources: src.map((r) => ({ s: r.s, who: n(r.who), login: n(r.login) })),
    campaigns: camp.map((r) => ({ s: r.s, c: r.c, who: n(r.who) })),
    devices: ['desktop', 'tablet', 'phone'].map((k) => { const r = dev.find((x) => x.k === k); return { k, who: n(r?.who), touch: n(r?.touch) }; }),
    errors: errs.map((r) => ({ name: r.name, svc: r.svc, m: r.m, src: r.src, c: n(r.c), who: n(r.who), last: new Date(r.last).toISOString() })),
    cohorts: cohorts.map((r) => ({ wk: new Date(r.wk).toISOString().slice(0, 10), size: n(r.size), w: [n(r.w1), n(r.w2), n(r.w3), n(r.w4)] })),
  };
}
