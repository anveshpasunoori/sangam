// Applies db/migrations/*.sql in order, once each, recording them in platform_migrations.
import { readdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import pg from "pg";

export const DEFAULT_URL = "postgres://postgres:sangam@127.0.0.1:55432/sangam";
const dir = new URL("../db/migrations/", import.meta.url);

export async function migrate(url = process.env.DATABASE_URL ?? DEFAULT_URL, log = console.log) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS public.schema_migrations (
      name text PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`);
    const done = new Map((await client.query("SELECT name, sha256 FROM public.schema_migrations")).rows.map((r) => [r.name, r.sha256]));
    for (const name of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
      const sql = readFileSync(new URL(name, dir), "utf8");
      const sha = createHash("sha256").update(sql).digest("hex");
      if (done.has(name)) {
        if (done.get(name) !== sha) throw new Error(`${name} changed after it was applied; add a new migration instead`);
        continue;
      }
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO public.schema_migrations (name, sha256) VALUES ($1, $2)", [name, sha]);
        await client.query("COMMIT");
        log(`applied ${name}`);
      } catch (e) {
        await client.query("ROLLBACK");
        throw new Error(`${name}: ${e.message}`);
      }
    }
  } finally {
    await client.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrate().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
