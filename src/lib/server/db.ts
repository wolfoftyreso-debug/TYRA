import "server-only";
import { Pool } from "pg";

const globalForDb = globalThis as unknown as { tyreDbPool?: Pool };

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

export function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL saknas.");
  }
  if (!globalForDb.tyreDbPool) {
    globalForDb.tyreDbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : undefined,
    });
  }
  return globalForDb.tyreDbPool;
}

export async function orgQuery<T>(
  organizationId: string,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  if (!sql.includes("$1")) {
    throw new Error("Org-scope saknas i serverfrågan.");
  }
  const result = await getPool().query(sql, [organizationId, ...params]);
  return result.rows as T[];
}
