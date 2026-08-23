import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL saknas. Lägg den i miljön innan migrering.");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

await pool.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`);

const directory = path.join(process.cwd(), "migrations");
const files = (await readdir(directory))
  .filter((file) => file.endsWith(".sql"))
  .sort();

for (const filename of files) {
  const exists = await pool.query(
    "SELECT 1 FROM schema_migrations WHERE filename = $1",
    [filename],
  );
  if (exists.rowCount) continue;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(await readFile(path.join(directory, filename), "utf8"));
    await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [
      filename,
    ]);
    await client.query("COMMIT");
    console.log(`Migrerad: ${filename}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

await pool.end();
