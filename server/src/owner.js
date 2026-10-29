/* Egasi paneli: foydalanuvchilar, to'lovlar, tanga sarfi — faqat OWNER_EMAILS dagi hisoblarga (GET /owner/stats).
   Shaxsiy ma'lumot minimal: pochta yarim yashirin, karta raqami ko'rsatilmaydi. */
const n = (v) => Number(v ?? 0);
export const maskEmail = (e) => {
  if (!e) return null;
  const [u, d] = String(e).split('@');
  return `${u.slice(0, 2)}${'•'.repeat(Math.max(1, Math.min(6, u.length - 2)))}@${d ?? ''}`;
};

export async function ownerStats(db, now = new Date()) {
  const one = async (sql, p = []) => (await db.query(sql, p)).rows[0] ?? {};
  const all = async (sql, p = []) => (await db.query(sql, p)).rows;
  const t = now.toISOString();

  const u = await one(`SELECT count(*) AS total,
      count(*) FILTER (WHERE created_at > $1::timestamptz - interval '1 day') AS d1,
      count(*) FILTER (WHERE created_at > $1::timestamptz - interval '7 days') AS d7,
      count(*) FILTER (WHERE created_at > $1::timestamptz - interval '30 days') AS d30,
      count(*) FILTER (WHERE google_sub IS NOT NULL) AS google,
      count(*) FILTER (WHERE google_sub IS NULL AND email IS NOT NULL) AS email,
      count(*) FILTER (WHERE email IS NULL AND phone IS NOT NULL) AS phone FROM users`, [t]);
  const active = await one(`SELECT count(DISTINCT user_id) FILTER (WHERE created_at > $1::timestamptz - interval '7 days') AS d7,
      count(DISTINCT user_id) FILTER (WHERE created_at > $1::timestamptz - interval '30 days') AS d30 FROM sessions`, [t]);
  const signups = await all(`SELECT to_char(created_at AT TIME ZONE 'Asia/Tashkent', 'YYYY-MM-DD') AS day, count(*) AS c
      FROM users WHERE created_at > $1::timestamptz - interval '30 days' GROUP BY 1 ORDER BY 1`, [t]);

  const pay = await one(`SELECT count(*) FILTER (WHERE state = 'paid') AS paid,
      coalesce(sum(amount) FILTER (WHERE state = 'paid'), 0) AS revenue,
      coalesce(sum(amount) FILTER (WHERE state = 'paid' AND paid_at > $1::timestamptz - interval '30 days'), 0) AS revenue30,
      count(DISTINCT user_id) FILTER (WHERE state = 'paid') AS buyers,
      count(*) FILTER (WHERE state = 'new') AS open, count(*) FILTER (WHERE state = 'cancelled') AS cancelled FROM orders`, [t]);
  const byPack = await all(`SELECT pack, count(*) AS c, sum(amount) AS s FROM orders WHERE state = 'paid' GROUP BY pack ORDER BY s DESC`);
  const byPs = await all(`SELECT coalesce(m.ps, o.provider) AS ps, count(*) AS c, sum(o.amount) AS s FROM orders o
      LEFT JOIN multicard_tx m ON m.order_id = o.id WHERE o.state = 'paid' GROUP BY 1 ORDER BY s DESC`);
  const recent = await all(`SELECT o.id, o.pack, o.coins, o.amount, coalesce(m.ps, o.provider) AS ps, o.state, o.created_at, o.paid_at, u.email
      FROM orders o JOIN users u ON u.id = o.user_id LEFT JOIN multicard_tx m ON m.order_id = o.id ORDER BY o.id DESC LIMIT 15`);

  const coins = await one(`SELECT coalesce(sum(delta) FILTER (WHERE delta > 0 AND reason = 'payment'), 0) AS bought,
      coalesce(sum(delta) FILTER (WHERE delta > 0 AND reason <> 'payment'), 0) AS granted,
      coalesce(-sum(delta) FILTER (WHERE delta < 0), 0) AS spent FROM ledger`);
  const spend = await all(`SELECT reason, split_part(ref, '@', 1) AS item, count(*) AS c, -sum(delta) AS coins FROM ledger
      WHERE delta < 0 AND created_at > $1::timestamptz - interval '30 days' GROUP BY 1, 2 ORDER BY coins DESC LIMIT 20`, [t]);
  const exportsFree = await all(`SELECT bundle, count(*) AS c FROM exports WHERE created_at > $1::timestamptz - interval '30 days'
      GROUP BY bundle ORDER BY c DESC LIMIT 20`, [t]);
  const projects = await one(`SELECT count(*) AS n, coalesce(sum(spent), 0) AS spent, coalesce(sum(gen_used), 0) AS gen FROM project_spend`);

  return {
    at: t,
    users: { total: n(u.total), d1: n(u.d1), d7: n(u.d7), d30: n(u.d30), google: n(u.google), email: n(u.email), phone: n(u.phone), active7: n(active.d7), active30: n(active.d30) },
    signups: signups.map((r) => ({ day: r.day, c: n(r.c) })),
    payments: { paid: n(pay.paid), revenue: n(pay.revenue), revenue30: n(pay.revenue30), buyers: n(pay.buyers), open: n(pay.open), cancelled: n(pay.cancelled),
      byPack: byPack.map((r) => ({ pack: r.pack, c: n(r.c), s: n(r.s) })), byPs: byPs.map((r) => ({ ps: r.ps ?? '—', c: n(r.c), s: n(r.s) })),
      recent: recent.map((r) => ({ id: n(r.id), pack: r.pack, coins: n(r.coins), amount: n(r.amount), ps: r.ps ?? '—', state: r.state,
        at: (r.paid_at ?? r.created_at)?.toISOString?.() ?? String(r.paid_at ?? r.created_at), who: maskEmail(r.email) })) },
    coins: { bought: n(coins.bought), granted: n(coins.granted), spent: n(coins.spent),
      spend30: spend.map((r) => ({ reason: r.reason, item: r.item, c: n(r.c), coins: n(r.coins) })),
      exports30: exportsFree.map((r) => ({ bundle: r.bundle, c: n(r.c) })) },
    projects: { n: n(projects.n), spent: n(projects.spent), gen: n(projects.gen) },
  };
}
