// Checks that the state machines, SQL, OpenAPI and event schemas describe the same system.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import type pg from "pg";
import { civicMachine, eventFiles, freshDatabase, ombMachine, openapi, readJson } from "./helpers";

let db: Awaited<ReturnType<typeof freshDatabase>>;
let client: pg.Client;
beforeAll(async () => {
  db = await freshDatabase();
  client = db.client;
}, 60_000);
afterAll(async () => db?.drop());

const key = (t: { from: string; to: string; action: string; actor: string }) => `${t.from}>${t.to}:${t.action}@${t.actor}`;
const enumValues = async (type: string) =>
  (await client.query(`SELECT unnest(enum_range(NULL::${type}))::text AS v`)).rows.map((r) => r.v as string);

describe("state machines match the database", () => {
  it("civic transitions", async () => {
    const sql = (await client.query("SELECT from_state AS from, to_state AS to, action, actor FROM civic.case_transitions")).rows;
    const m = civicMachine();
    expect(sql.map(key).sort()).toEqual(m.transitions.map(key).sort());
    const verified = (await client.query("SELECT from_state, to_state FROM civic.case_transitions WHERE requires_verified_source")).rows;
    expect(verified.map((r) => `${r.from_state}>${r.to_state}`).sort()).toEqual(
      m.transitions.filter((t: { requires?: string }) => t.requires === "verified_source").map((t: { from: string; to: string }) => `${t.from}>${t.to}`).sort(),
    );
  });

  it("civic side events", async () => {
    const sql = (await client.query("SELECT action, actor, allowed_in::text FROM civic.case_side_events")).rows.map((r) => `${r.action}@${r.actor}:${r.allowed_in}`);
    const json = civicMachine().events_without_state_change.flatMap((e: { action: string; actor: string; allowed_in: string[] }) =>
      e.allowed_in.map((s) => `${e.action}@${e.actor}:${s}`),
    );
    expect(sql.sort()).toEqual(json.sort());
  });

  it("civic and ombudsman state enums", async () => {
    expect(await enumValues("civic.case_state")).toEqual(civicMachine().states);
    expect(await enumValues("ombudsman.case_state")).toEqual(ombMachine().states);
  });

  it("ombudsman transitions", async () => {
    const sql = (await client.query("SELECT from_state AS from, to_state AS to, action, actor FROM ombudsman.case_transitions")).rows;
    expect(sql.map(key).sort()).toEqual(ombMachine().transitions.map(key).sort());
  });

  it("every state is reachable from the initial state", () => {
    for (const m of [civicMachine(), ombMachine()]) {
      const seen = new Set([m.initial]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const t of m.transitions) if (seen.has(t.from) && !seen.has(t.to)) seen.add(t.to), (grew = true);
      }
      expect([...seen].sort()).toEqual([...m.states].sort());
    }
  });
});

describe("OpenAPI matches the database and state machines", () => {
  const s = () => openapi().components.schemas;

  it("languages, audiences and civic categories", async () => {
    expect(s().Lang.enum).toEqual(await enumValues("platform.lang"));
    expect(s().Audience.enum).toEqual(await enumValues("content.audience"));
    const cats = (await client.query("SELECT code FROM civic.categories ORDER BY code")).rows.map((r) => r.code);
    expect([...s().CivicCategory.enum].sort()).toEqual(cats);
  });

  it("civic and ombudsman states", () => {
    expect(s().CivicState.enum).toEqual(civicMachine().states);
    expect(s().OmbudsmanCase.properties.state.enum).toEqual(ombMachine().states);
  });

  it("complainant actions exposed by the API are exactly the complainant actions in the machine", () => {
    const m = civicMachine();
    const machine = new Set<string>([
      ...m.transitions.filter((t: { actor: string }) => t.actor === "complainant").map((t: { action: string }) => t.action),
      ...m.events_without_state_change.filter((e: { actor: string; action: string }) => e.actor === "complainant" && e.action !== "add_evidence").map((e: { action: string }) => e.action),
    ]);
    const variants = s().CivicComplainantAction.oneOf;
    const api = new Set<string>([variants[0].properties.action.const, ...variants[1].properties.action.enum]);
    expect([...api].sort()).toEqual([...machine].sort());
    expect([...s().CivicCase.allOf[1].properties.allowed_actions.items.enum].sort()).toEqual([...machine].sort());
  });

  it("ombudsman complaint types", async () => {
    expect(s().OmbudsmanType.enum).toEqual(await enumValues("ombudsman.complaint_type"));
  });

  it("report reasons", async () => {
    const def = (await client.query("SELECT pg_get_constraintdef(oid) AS d FROM pg_constraint WHERE conrelid = 'trust.reports'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%reason_code%'")).rows[0].d as string;
    const sqlReasons = [...def.matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1]).sort();
    expect([...s().ReportInput.properties.reason_code.enum].sort()).toEqual(sqlReasons);
  });

  it("every operation has an operationId and a 4xx response", () => {
    for (const [path, item] of Object.entries<Record<string, { operationId?: string; responses: Record<string, unknown> }>>(openapi().paths)) {
      for (const [method, op] of Object.entries(item)) {
        if (!["get", "post", "put", "patch", "delete"].includes(method)) continue;
        expect(op.operationId, `${method} ${path}`).toBeTruthy();
        expect(Object.keys(op.responses).some((c) => c.startsWith("4")), `${method} ${path}`).toBe(true);
      }
    }
  });
});

describe("event schemas", () => {
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);
  ajv.addSchema(readJson("events/envelope.schema.json"));
  const files = eventFiles().filter((f) => f !== "envelope.schema.json");
  for (const f of files) ajv.addSchema(readJson(`events/${f}`));
  const validator = (t: string) => ajv.getSchema(`https://schemas.sangam.example/events/${t}.schema.json`)!;

  it("index lists every schema file", () => {
    expect(readJson("events/index.json").events.map((e: { schema: string }) => e.schema).sort()).toEqual(files.sort());
  });

  it("every example validates", () => {
    for (const f of files) {
      const schema = readJson(`events/${f}`);
      const v = validator(schema.title);
      for (const ex of schema.examples) expect(v(ex), `${f}: ${ajv.errorsText(v.errors)}`).toBe(true);
    }
  });

  it("event types match the outbox naming check", async () => {
    await client.query("BEGIN");
    try {
      for (const f of files) {
        const t = readJson(`events/${f}`).title;
        expect(await errorOf(t)).toBeNull();
      }
      expect(await errorOf("Bad.Type")).toMatch(/check constraint/);
    } finally {
      await client.query("ROLLBACK");
    }
    async function errorOf(t: string) {
      await client.query("SAVEPOINT e");
      try {
        await client.query("INSERT INTO platform.outbox (event_type, aggregate_type, aggregate_id, payload) VALUES ($1, 'x', 'x', '{}')", [t]);
        await client.query("ROLLBACK TO SAVEPOINT e");
        return null;
      } catch (e) {
        await client.query("ROLLBACK TO SAVEPOINT e");
        return (e as Error).message;
      }
    }
  });

  it("enforce the rules they document", () => {
    const civic = readJson("events/civic.case.transitioned.v1.schema.json").examples[0];
    const authorityWithoutSource = { ...civic, data: { ...civic.data, action: "acknowledge", from_state: "ROUTED", to_state: "ACKNOWLEDGED", actor_kind: "authority", official_source_id: null } };
    expect(validator("civic.case.transitioned.v1")(authorityWithoutSource)).toBe(false);

    const enf = readJson("events/trust.enforcement.applied.v1.schema.json").examples[0];
    expect(validator("trust.enforcement.applied.v1")({ ...enf, data: { ...enf.data, action: "suspend_account" } })).toBe(false);

    const msg = readJson("events/messaging.message.sent.v1.schema.json").examples[0];
    expect(validator("messaging.message.sent.v1")({ ...msg, data: { ...msg.data, body: "hello" } })).toBe(false);

    const scr = readJson("events/trust.screening.completed.v1.schema.json").examples[0];
    expect(validator("trust.screening.completed.v1")({ ...scr, data: { ...scr.data, policy_code: null } })).toBe(false);
  });

  it("civic event enums follow the state machine", () => {
    const d = readJson("events/civic.case.transitioned.v1.schema.json").properties.data.properties;
    expect(d.from_state.enum).toEqual(civicMachine().states);
  });
});
