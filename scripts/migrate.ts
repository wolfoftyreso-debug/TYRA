import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import pg from "pg";

const MIGRATIONS_DIR = path.join(process.cwd(), "migrations");

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL saknas.");
    process.exit(1);
  }

  const { Pool } = pg;
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });

  const filenames = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b, "en"));

  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(
      `create table if not exists schema_migrations (
        filename text primary key,
        applied_at timestamptz not null default now()
      )`
    );

    const applied = await client.query<{ filename: string }>(
      "select filename from schema_migrations"
    );
    const appliedSet = new Set(applied.rows.map((r) => r.filename));

    for (const filename of filenames) {
      if (appliedSet.has(filename)) continue;
      const full = path.join(MIGRATIONS_DIR, filename);
      const sql = await readFile(full, "utf8");
      console.log(`Applying ${filename}...`);
      await client.query(sql);
      await client.query(
        "insert into schema_migrations (filename) values ($1)",
        [filename]
      );
    }

    await client.query("commit");
    console.log("Migrations complete.");
  } catch (err) {
    await client.query("rollback");
    console.error(err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

