import { readFileSync, readdirSync } from "node:fs";
import pg from "pg";
import YAML from "yaml";
import { migrate, DEFAULT_URL } from "../scripts/migrate.mjs";

export const root = new URL("../", import.meta.url);
export const readJson = (p: string) => JSON.parse(readFileSync(new URL(p, root), "utf8"));
export const openapi = () => YAML.parse(readFileSync(new URL("openapi/sangam.yaml", root), "utf8"));
export const civicMachine = () => readJson("state-machines/civic.json");
export const ombMachine = () => readJson("state-machines/ombudsman.json");
export const eventFiles = () => readdirSync(new URL("events/", root)).filter((f) => f.endsWith(".schema.json"));

const adminUrl = process.env.DATABASE_URL ?? DEFAULT_URL;

/** Creates a throwaway database, applies every migration, and returns a connected client. */
export async function freshDatabase() {
  const name = `sangam_test_${process.pid}_${Date.now()}`;
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.end();
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  await migrate(url.toString(), () => {});
  const client = new pg.Client({ connectionString: url.toString() });
  await client.connect();
  return {
    client,
    async drop() {
      await client.end();
      const a = new pg.Client({ connectionString: adminUrl });
      await a.connect();
      await a.query(`DROP DATABASE ${name} WITH (FORCE)`);
      await a.end();
    },
  };
}

let sp = 0;
/** Runs a statement inside a savepoint and returns the error message it raised (or null). */
export async function errorOf(client: pg.Client, sql: string, params: unknown[] = []): Promise<string | null> {
  const name = `sp${++sp}`;
  await client.query(`SAVEPOINT ${name}`);
  try {
    await client.query(sql, params);
    await client.query(`RELEASE SAVEPOINT ${name}`);
    return null;
  } catch (e) {
    await client.query(`ROLLBACK TO SAVEPOINT ${name}`);
    return (e as Error).message;
  }
}

export async function one<T = Record<string, unknown>>(client: pg.Client, sql: string, params: unknown[] = []): Promise<T> {
  const r = await client.query(sql, params);
  return r.rows[0] as T;
}
