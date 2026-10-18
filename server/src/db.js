/* Maʼlumotlar bazasi qatlami: ishda — PostgreSQL (pg.Pool), testda — PGlite (xotiradagi Postgres).
   Ikkalasi ham bir xil interfeysga keltiriladi: query(sql, params) → { rows }, tx(fn). */
import { readFileSync } from 'node:fs';

const SCHEMA = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

/** pg.Pool dan */
export function fromPool(pool) {
  return {
    query: (sql, params) => pool.query(sql, params),
    async tx(fn) {
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        const r = await fn({ query: (sql, params) => c.query(sql, params) });
        await c.query('COMMIT');
        return r;
      } catch (e) {
        await c.query('ROLLBACK').catch(() => {});
        throw e;
      } finally { c.release(); }
    },
    close: () => pool.end(),
  };
}

/** PGlite dan (testlar) */
export function fromPglite(pg) {
  return {
    query: (sql, params) => pg.query(sql, params),
    tx: (fn) => pg.transaction((t) => fn({ query: (sql, params) => t.query(sql, params) })),
    close: () => pg.close(),
  };
}

export async function migrate(db) {
  // PGlite query() bitta buyruq oladi — sxemani buyruqlarga boʻlamiz
  const stmts = SCHEMA.split(/;\s*\n/).map((s) => s.replace(/^\s*--.*$/gm, '').trim()).filter(Boolean);
  for (const s of stmts) await db.query(s);
}
