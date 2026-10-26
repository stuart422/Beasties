// Database: Postgres everywhere.
// - DATABASE_URL set (Vercel, Neon or any Postgres): a normal `pg` connection pool.
// - No DATABASE_URL (local dev): PGlite, a real Postgres engine stored in data/pglite.
// Both are used through the same small helpers: query, one, tx.
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

export const ROOT = resolve(import.meta.dirname, '..');
export const DATA_DIR = resolve(ROOT, 'data');
export const PHOTOS_DIR = resolve(ROOT, 'photos');
export const IS_LOCAL_DB = !process.env.DATABASE_URL;

let driver; // { query(text, params) -> { rows }, transaction(fn) }

async function connect() {
  if (driver) return driver;
  if (IS_LOCAL_DB) {
    mkdirSync(DATA_DIR, { recursive: true });
    const { PGlite } = await import('@electric-sql/pglite');
    const pg = await PGlite.create(resolve(DATA_DIR, 'pglite'));
    driver = {
      query: (text, params) => pg.query(text, params),
      transaction: (fn) => pg.transaction((t) => fn((text, params) => t.query(text, params))),
    };
  } else {
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5, idleTimeoutMillis: 10000 });
    driver = {
      query: (text, params) => pool.query(text, params),
      async transaction(fn) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const out = await fn((text, params) => client.query(text, params));
          await client.query('COMMIT');
          return out;
        } catch (err) {
          await client.query('ROLLBACK').catch(() => {});
          throw err;
        } finally {
          client.release();
        }
      },
    };
  }
  return driver;
}

/** All rows for a query. Placeholders are $1, $2, ... */
export async function query(text, params = []) {
  return (await (await connect()).query(text, params)).rows;
}

/** The first row, or undefined. */
export async function one(text, params = []) {
  return (await query(text, params))[0];
}

/** Run several statements as one transaction. fn gets { query, one } bound to it. */
export async function tx(fn) {
  return (await connect()).transaction(async (q) => fn({
    query: async (text, params = []) => (await q(text, params)).rows,
    one: async (text, params = []) => (await q(text, params)).rows[0],
  }));
}

/* ---------- Migrations: server/migrations/NNN_name.sql, applied once each, in order ---------- */

export async function migrate() {
  await query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');
  const done = new Set((await query('SELECT name FROM schema_migrations')).map((r) => r.name));
  const dir = resolve(import.meta.dirname, 'migrations');
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const applied = [];
  for (const file of files) {
    if (done.has(file)) continue;
    const sql = readFileSync(resolve(dir, file), 'utf8');
    await tx(async (t) => {
      for (const statement of sql.split(/;\s*$/m).map((s) => s.trim()).filter(Boolean)) await t.query(statement);
      await t.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    });
    applied.push(file);
  }
  return applied;
}
