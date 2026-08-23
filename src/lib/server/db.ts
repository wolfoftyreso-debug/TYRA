import pg from "pg";

import { getServerEnv } from "./env";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export type SqlResult<T> = {
  rows: T[];
  rowCount: number | null;
};

export function getPool() {
  if (pool) return pool;
  const { DATABASE_URL } = getServerEnv();
  pool = new Pool({
    connectionString: DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000
  });
  return pool;
}

export async function query<T = unknown>(
  text: string,
  params: unknown[] = []
): Promise<SqlResult<T>> {
  const p = getPool();
  const res = await p.query(text, params);
  return { rows: res.rows as T[], rowCount: res.rowCount };
}

export async function withTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const p = getPool();
  const client = await p.connect();
  try {
    await client.query("begin");
    const res = await fn(client);
    await client.query("commit");
    return res;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

