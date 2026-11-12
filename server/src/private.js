/* Shaxsiy maʼlumot qatlami (12.11.2026): hisob egasi oʻz binolar maʼlumotini (masalan, tozalangan kadastr — qavat, xonadon,
   qurilgan yil) yuklaydi; u faqat oʻsha hisobga koʻrinadi va Joyshunos «Ijtimoiy skaner»ida avtomatik ulanadi.
   Hozircha faqat egasi (OWNER_EMAILS) uchun — app.js da tekshiriladi.
   Maxfiylik: xususiyatlar faqat PROPS roʻyxatidan; boshqa har qanday maydon (F.I.Sh., STIR, kadastr raqami…) tashlab yuboriladi.
   nginx tanasi ≤ 128 KB — brauzer obyektlarni boʻlib-boʻlib yuboradi (bir soʻrovda ≤ CHUNK). */

export const MAX_LAYERS = 5;
export const MAX_FEATURES = 60_000;
export const CHUNK = 400;
export const MAX_SPAN = 0.06;   // bbox soʻrovi, ~5–6 km
const MAX_VERT = 2000;

/** Ruxsat etilgan xususiyatlar: nom → tekshiruvchi (yaroqsiz — undefined) */
const int = (lo, hi) => (v) => { const n = Number(v); return Number.isFinite(n) && n >= lo && n <= hi ? Math.round(n) : undefined; };
const str = (max) => (v) => { if (v == null) return undefined; const s = String(v).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max); return s || undefined; };
export const PROPS = { qavat: int(1, 200), xonadon: int(1, 5000), yil: int(1800, 2100), devor: str(40), manzil: str(120), turi: str(40) };

export class PrivateError extends Error { constructor(code, message) { super(message); this.code = code; } }

const r6 = (v) => Math.round(v * 1e6) / 1e6;
/** GeoJSON Polygon/MultiPolygon (WGS84) → { geom, bbox } yoki null */
export function cleanGeom(g) {
  if (!g || (g.type !== 'Polygon' && g.type !== 'MultiPolygon')) return null;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  if (!Array.isArray(polys) || !polys.length) return null;
  let n = 0, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const out = [];
  for (const rings of polys) {
    if (!Array.isArray(rings) || !rings.length) return null;
    const pr = [];
    for (const ring of rings) {
      if (!Array.isArray(ring) || ring.length < 4) return null;
      const rr = [];
      for (const p of ring) {
        const x = Number(p?.[0]), y = Number(p?.[1]);
        if (!Number.isFinite(x) || !Number.isFinite(y) || x < -180 || x > 180 || y < -90 || y > 90) return null;
        rr.push([r6(x), r6(y)]); if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        if (++n > MAX_VERT) return null;
      }
      pr.push(rr);
    }
    out.push(pr);
  }
  // bitta bino ~ 2 km dan katta boʻlmaydi (proyeksiyalangan koordinatani yoki xato faylni tutish uchun)
  if (x1 - x0 > 0.03 || y1 - y0 > 0.03) return null;
  return { geom: out.length === 1 ? { type: 'Polygon', coordinates: out[0] } : { type: 'MultiPolygon', coordinates: out }, bbox: [x0, y0, x1, y1] };
}
export function cleanProps(p) {
  const o = {};
  for (const [k, f] of Object.entries(PROPS)) { const v = f(p?.[k]); if (v !== undefined) o[k] = v; }
  return o;
}

export function makePrivate(db) {
  async function layers(userId) {
    const { rows } = await db.query(`SELECT id, name, source, n, created_at FROM private_layers WHERE user_id = $1 ORDER BY id`, [userId]);
    return rows.map((r) => ({ id: Number(r.id), name: r.name, source: r.source, n: r.n, created: r.created_at?.toISOString?.() ?? String(r.created_at) }));
  }
  async function create(userId, { name, source }) {
    const nm = str(80)(name), src = str(120)(source);
    if (!nm || !src) throw new PrivateError('bad_request', 'nom va manba majburiy');
    const { rows: [c] } = await db.query(`SELECT count(*)::int AS c FROM private_layers WHERE user_id = $1`, [userId]);
    if (c.c >= MAX_LAYERS) throw new PrivateError('limit', `koʻpi bilan ${MAX_LAYERS} ta qatlam`);
    const { rows: [r] } = await db.query(`INSERT INTO private_layers (user_id, name, source) VALUES ($1, $2, $3) RETURNING id`, [userId, nm, src]);
    return { id: Number(r.id) };
  }
  async function own(userId, layerId) {
    const id = Number(layerId);
    if (!Number.isInteger(id) || id <= 0) throw new PrivateError('bad_request', 'qatlam id');
    const { rows: [r] } = await db.query(`SELECT id, n FROM private_layers WHERE id = $1 AND user_id = $2`, [id, userId]);
    if (!r) throw new PrivateError('not_found', 'qatlam topilmadi');
    return r;
  }
  async function add(userId, layerId, features) {
    const L = await own(userId, layerId);
    if (!Array.isArray(features) || !features.length || features.length > CHUNK) throw new PrivateError('bad_request', `1–${CHUNK} ta obyekt`);
    if (L.n + features.length > MAX_FEATURES) throw new PrivateError('limit', `qatlamda koʻpi bilan ${MAX_FEATURES} obyekt`);
    let ok = 0, skip = 0;
    await db.tx(async (t) => {
      for (const f of features) {
        const g = cleanGeom(f?.geometry); if (!g) { skip++; continue; }
        const p = cleanProps(f?.properties);
        await t.query(`INSERT INTO private_features (layer_id, minx, miny, maxx, maxy, props, geom) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [L.id, ...g.bbox, JSON.stringify(p), JSON.stringify(g.geom)]);
        ok++;
      }
      await t.query(`UPDATE private_layers SET n = n + $2 WHERE id = $1`, [L.id, ok]);
    });
    return { added: ok, skipped: skip };
  }
  async function remove(userId, layerId) {
    const L = await own(userId, layerId);
    await db.query(`DELETE FROM private_features WHERE layer_id = $1`, [L.id]);
    await db.query(`DELETE FROM private_layers WHERE id = $1`, [L.id]);
    return { ok: true };
  }
  /** bbox bilan kesishgan obyektlar (barcha qatlamlardan); koʻpi bilan 8000 */
  async function features(userId, bb) {
    const ls = await layers(userId);
    if (!ls.length) return { layers: [], features: [] };
    const { rows } = await db.query(
      `SELECT f.layer_id, f.props, f.geom FROM private_features f JOIN private_layers l ON l.id = f.layer_id
       WHERE l.user_id = $1 AND f.maxx >= $2 AND f.minx <= $4 AND f.maxy >= $3 AND f.miny <= $5 LIMIT 8000`, [userId, ...bb]);
    return { layers: ls.map(({ id, name, source }) => ({ id, name, source })), features: rows.map((r) => ({ l: Number(r.layer_id), p: r.props, g: r.geom })) };
  }
  return { layers, create, add, remove, features };
}

/** «g,j,s,sh» → [g, j, s, sh] yoki xato */
export function parseBbox(q) {
  const b = String(q ?? '').split(',').map(Number);
  if (b.length !== 4 || !b.every(Number.isFinite) || !(b[0] < b[2] && b[1] < b[3]) || b[2] - b[0] > MAX_SPAN || b[3] - b[1] > MAX_SPAN) throw new PrivateError('bad_request', `bbox=g‘arb,janub,sharq,shimol (≤ ${MAX_SPAN}°)`);
  return b;
}
