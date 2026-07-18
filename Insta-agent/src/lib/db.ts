import { Pool, type PoolClient, type QueryResultRow } from "pg";

// A single shared connection pool for the whole process. On Vercel's serverless
// runtime each warm instance keeps its own pool, so the max is kept small to
// avoid exhausting Render PostgreSQL's connection limit under concurrency.
// The pool is cached on globalThis so Next.js hot-reload (dev) and warm lambda
// reuse (prod) don't leak a new pool on every module evaluation.
const globalForDb = globalThis as unknown as { _pgPool?: Pool };

export function getPool(): Pool {
  if (!globalForDb._pgPool) {
    const connectionString = process.env.DATABASE_URL;
    // Fail fast with a clear message instead of letting pg throw a cryptic
    // "connection string missing" deep inside a request handler.
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is not set — add your Render PostgreSQL connection string to .env"
      );
    }
    globalForDb._pgPool = new Pool({
      connectionString,
      // Render external connections require SSL; their managed cert isn't in
      // Node's trust store, so verification is disabled (transport is still
      // encrypted). Internal connections accept SSL too, so this is safe either way.
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return globalForDb._pgPool;
}

// Run a parameterized query and return the rows. ALWAYS pass user/API values via
// `params` ($1, $2, …), never string-interpolated into `text` — that's the SQL
// injection boundary.
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const res = await getPool().query<T>(text, params as unknown[]);
  return res.rows;
}

// Convenience for single-row lookups; returns null when nothing matched.
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

// Run several statements inside one transaction on a dedicated client. Rolls
// back on any error and always releases the client back to the pool.
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Postgres SQLSTATE for unique_violation — used to treat a duplicate insert
// (webhook redelivery / echo of our own send) as a no-op instead of an error.
export const UNIQUE_VIOLATION = "23505";
