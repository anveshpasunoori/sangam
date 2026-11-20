// Starts or stops a throwaway PostgreSQL 16 container for contract tests.
import { execFileSync } from "node:child_process";

const NAME = "sangam-contracts-pg";
const PORT = process.env.SANGAM_PG_PORT ?? "55432";
const run = (args, opts = {}) => execFileSync("docker", args, { encoding: "utf8", ...opts }).trim();

const cmd = process.argv[2];
if (cmd === "up") {
  const existing = run(["ps", "-aq", "-f", `name=^${NAME}$`]);
  if (existing) run(["rm", "-f", NAME]);
  run(["run", "-d", "--name", NAME, "-e", "POSTGRES_PASSWORD=sangam", "-e", "POSTGRES_DB=sangam", "-p", `127.0.0.1:${PORT}:5432`, "postgres:16-alpine"]);
  for (let i = 0; i < 60; i++) {
    try {
      run(["exec", NAME, "pg_isready", "-U", "postgres", "-d", "sangam"], { stdio: "pipe" });
      // pg_isready can pass during the init restart; confirm with a real query.
      run(["exec", NAME, "psql", "-U", "postgres", "-d", "sangam", "-c", "select 1"], { stdio: "pipe" });
      console.log(`postgres ready: postgres://postgres:sangam@127.0.0.1:${PORT}/sangam`);
      process.exit(0);
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  console.error("postgres did not become ready");
  process.exit(1);
} else if (cmd === "down") {
  run(["rm", "-f", NAME]);
  console.log("removed", NAME);
} else {
  console.error("usage: db.mjs up|down");
  process.exit(2);
}
