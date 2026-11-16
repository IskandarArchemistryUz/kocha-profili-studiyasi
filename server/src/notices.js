/* Sovgʻa xabarnomalari (16.11.2026): foydalanuvchiga tanga sovgʻa qilinganda (roʻyxatdan oʻtish sovgʻasi, sinov kirishi)
   ilovada bir marta xabar chiqadi. Alohida jadval yoʻq: xabar = ledger dagi musbat sovgʻa yozuvi, users.notice_seen dan katta id.
   Izoh (note) yuborilmaydi — unda egasining pochtasi bor. */
export const GIFT_REASONS = ['signup', 'promo'];

/** Koʻrilmagan sovgʻalar (koʻpi bilan 5 ta, eskisidan) */
export async function listNotices(db, userId) {
  const { rows } = await db.query(
    `SELECT l.id, l.delta, l.reason, l.created_at FROM ledger l JOIN users u ON u.id = l.user_id
      WHERE l.user_id = $1 AND l.id > u.notice_seen AND l.delta > 0 AND l.reason = ANY($2)
      ORDER BY l.id LIMIT 5`, [userId, GIFT_REASONS]);
  return rows.map((r) => ({ id: Number(r.id), coins: r.delta, kind: r.reason, at: r.created_at?.toISOString?.() ?? String(r.created_at) }));
}

/** upTo gacha koʻrildi (orqaga qaytmaydi; boshqa foydalanuvchi yozuvi id si ham faqat oʻz chegarasini siljitadi) */
export async function markSeen(db, userId, upTo) {
  const n = Number(upTo);
  if (!Number.isSafeInteger(n) || n <= 0) return false;
  const { rows } = await db.query(`SELECT COALESCE(MAX(id), 0) AS m FROM ledger WHERE user_id = $1 AND id <= $2`, [userId, n]);
  const m = Number(rows[0].m);
  if (!m) return false;
  await db.query(`UPDATE users SET notice_seen = GREATEST(notice_seen, $2) WHERE id = $1`, [userId, m]);
  return true;
}

/**
 * Roʻyxatdan oʻtish sovgʻasini hali olmagan barcha hisoblarga berish (orqaga). (user, 'signup', 'signup') — yangi
 * hisoblardagi bilan bir kalit: ikki marta berilmaydi, tugma qayta bosilsa ham. exclude — egasi pochtalari.
 */
export async function giftSignupAll(db, coins, exclude = []) {
  if (!Number.isInteger(coins) || coins <= 0) return { credited: 0, coins: 0 };
  const { rows } = await db.query(
    `INSERT INTO ledger (user_id, delta, reason, ref, note)
     SELECT id, $1, 'signup', 'signup', 'Roʻyxatdan oʻtish sovgʻasi (orqaga, 16.11)' FROM users
      WHERE email IS NULL OR NOT (lower(email) = ANY($2))
     ON CONFLICT (user_id, reason, ref) DO NOTHING RETURNING user_id`, [coins, exclude.map((e) => e.toLowerCase())]);
  return { credited: rows.length, coins };
}
