// Checks that the database enforces the blueprint's rules, not just records them.
import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it } from "vitest";
import type pg from "pg";
import { errorOf, freshDatabase, one } from "./helpers";

let db: Awaited<ReturnType<typeof freshDatabase>>;
let c: pg.Client;
beforeAll(async () => {
  db = await freshDatabase();
  c = db.client;
}, 60_000);
afterAll(async () => db?.drop());
beforeEach(async () => void (await c.query("BEGIN")));
afterEach(async () => void (await c.query("ROLLBACK")));

const account = async (handle: string) =>
  (await one<{ id: string }>(c, "INSERT INTO identity.accounts (handle, display_name) VALUES ($1::text, $1::text) RETURNING id", [handle])).id;
const staff = async (team: string, name = `${team} person`) =>
  (await one<{ id: string }>(c, "INSERT INTO platform.staff (display_name, team) VALUES ($1, $2) RETURNING id", [name, team])).id;
const befriend = (a: string, b: string) =>
  c.query("INSERT INTO graph.friendships (account_a, account_b) VALUES (LEAST($1::uuid, $2::uuid), GREATEST($1::uuid, $2::uuid))", [a, b]);
const post = async (author: string, audience: string) =>
  (await one<{ id: string }>(c, "INSERT INTO content.posts (author_id, audience, status, body, published_at) VALUES ($1, $2, 'published', 'hi', now()) RETURNING id", [author, audience])).id;
const canView = async (viewer: string | null, postId: string) => (await one<{ v: boolean }>(c, "SELECT content.can_view($1, $2) AS v", [viewer, postId])).v;

describe("identity", () => {
  it("new accounts get privacy defaults: Friends, messages from friends, local discovery off", async () => {
    const a = await account("arjun.demo");
    expect(await one(c, "SELECT default_audience, who_can_message, local_discovery FROM identity.privacy_settings WHERE account_id = $1", [a])).toEqual({
      default_audience: "friends",
      who_can_message: "friends",
      local_discovery: false,
    });
  });
  it("stores no Aadhaar and does not require a legal name", async () => {
    const r = await c.query("SELECT 1 FROM information_schema.columns WHERE column_name ILIKE '%aadhaar%' OR column_name ILIKE '%legal_name%'");
    expect(r.rowCount).toBe(0);
  });
});

describe("visibility: one policy enforcement point", () => {
  it("applies audience, blocks and close friends", async () => {
    const [author, friend, stranger, close] = [await account("author"), await account("friend"), await account("stranger"), await account("closeone")];
    await befriend(author, friend);
    await befriend(author, close);
    await c.query("INSERT INTO graph.close_friends (owner, member) VALUES ($1, $2)", [author, close]);
    const pub = await post(author, "public");
    const fr = await post(author, "friends");
    const cf = await post(author, "close_friends");
    const me = await post(author, "only_me");

    expect([await canView(stranger, pub), await canView(null, pub)]).toEqual([true, true]);
    expect([await canView(friend, fr), await canView(stranger, fr), await canView(null, fr)]).toEqual([true, false, false]);
    expect([await canView(close, cf), await canView(friend, cf)]).toEqual([true, false]);
    expect([await canView(author, me), await canView(friend, me)]).toEqual([true, false]);

    await c.query("INSERT INTO graph.blocks (blocker, blocked) VALUES ($1, $2)", [stranger, author]);
    expect(await canView(stranger, pub)).toBe(false);
  });

  it("blocking removes the friendship and follows both ways", async () => {
    const [a, b] = [await account("aaa"), await account("bbb")];
    await befriend(a, b);
    await c.query("INSERT INTO graph.follows VALUES ($1, $2), ($2, $1)", [a, b]);
    await c.query("INSERT INTO graph.blocks (blocker, blocked) VALUES ($1, $2)", [a, b]);
    expect((await one<{ f: boolean }>(c, "SELECT graph.are_friends($1, $2) AS f", [a, b])).f).toBe(false);
    expect((await c.query("SELECT 1 FROM graph.follows WHERE follower IN ($1, $2)", [a, b])).rowCount).toBe(0);
  });

  it("a held or draft post is visible only to its author", async () => {
    const [a, b] = [await account("held.author"), await account("held.friend")];
    await befriend(a, b);
    const p = (await one<{ id: string }>(c, "INSERT INTO content.posts (author_id, audience, status, body) VALUES ($1, 'public', 'held_for_review', 'x') RETURNING id", [a])).id;
    expect([await canView(a, p), await canView(b, p)]).toEqual([true, false]);
  });
});

describe("communities", () => {
  it("private communities never auto-approve a join", async () => {
    const owner = await account("owner1");
    const joiner = await account("joiner1");
    const id = (await one<{ id: string }>(c, "INSERT INTO community.communities (slug, name, privacy, created_by) VALUES ('lake-view', 'Lake View', 'private', $1) RETURNING id", [owner])).id;
    expect(await errorOf(c, "INSERT INTO community.members (community_id, account_id, status) VALUES ($1, $2, 'active')", [id, joiner])).toMatch(/admin approval/);
    expect(await errorOf(c, "INSERT INTO community.members (community_id, account_id, status) VALUES ($1, $2, 'requested')", [id, joiner])).toBeNull();
    expect(await errorOf(c, "UPDATE community.members SET status = 'active', approved_by = $3 WHERE community_id = $1 AND account_id = $2", [id, joiner, owner])).toBeNull();
  });
});

describe("messaging", () => {
  it("orders messages per conversation, rejects outsiders and double payloads", async () => {
    const [a, b, x] = [await account("msg.a"), await account("msg.b"), await account("msg.x")];
    const conv = (await one<{ id: string }>(c, "INSERT INTO messaging.conversations (kind) VALUES ('direct') RETURNING id")).id;
    await c.query("INSERT INTO messaging.participants (conversation_id, account_id) VALUES ($1, $2), ($1, $3)", [conv, a, b]);
    const send = (who: string, body: string | null, cipher: string | null = null) =>
      c.query("INSERT INTO messaging.messages (conversation_id, sender_id, client_msg_id, body, ciphertext) VALUES ($1, $2, gen_random_uuid(), $3, $4) RETURNING seq", [conv, who, body, cipher]);
    expect((await send(a, "hi")).rows[0].seq).toBe("1");
    expect((await send(b, "hello")).rows[0].seq).toBe("2");
    expect(await errorOf(c, "INSERT INTO messaging.messages (conversation_id, sender_id, client_msg_id, body) VALUES ($1, $2, gen_random_uuid(), 'x')", [conv, x])).toMatch(/not a participant/);
    expect(await errorOf(c, "INSERT INTO messaging.messages (conversation_id, sender_id, client_msg_id, body, ciphertext) VALUES ($1, $2, gen_random_uuid(), 'x', '\\x00')", [conv, a])).toMatch(/check constraint/);
  });
});

describe("trust and safety", () => {
  const policy = async () => (await one<{ id: string }>(c, "INSERT INTO trust.policies (code, version, title, summary) VALUES ('harassment', 1, 'Harassment', 'No targeted harassment') RETURNING id")).id;

  it("screening never blocks without a reason and a policy", async () => {
    const a = await account("scr.author");
    expect(await errorOf(c, "INSERT INTO trust.screenings (target_kind, target_id, author_id, verdict, model_version) VALUES ('post', gen_random_uuid(), $1, 'request_revision', 'v0')", [a])).toMatch(/check constraint/);
    expect(await errorOf(c, "INSERT INTO trust.screenings (target_kind, target_id, author_id, verdict, model_version) VALUES ('post', gen_random_uuid(), $1, 'allow', 'v0')", [a])).toBeNull();
  });

  it("enforcement names a policy and decider; AI cannot suspend accounts", async () => {
    const a = await account("enf.subject");
    const p = await policy();
    expect(await errorOf(c, "INSERT INTO trust.enforcements (target_kind, target_id, subject_account_id, action, policy_id, decider_kind, model_version, explanation) VALUES ('account', $1, $1, 'suspend_account', $2, 'automated', 'v0', 'x')", [a, p])).toMatch(/check constraint/);
    expect(await errorOf(c, "INSERT INTO trust.enforcements (target_kind, target_id, subject_account_id, action, policy_id, decider_kind, explanation) VALUES ('comment', gen_random_uuid(), $1, 'hide', $2, 'human', 'x')", [a, p])).toMatch(/check constraint/);
  });

  it("appeals are decided by a different human on the trust team, with reasoning", async () => {
    const a = await account("appellant");
    const p = await policy();
    const decider = await staff("trust", "Decider");
    const other = await staff("trust", "Other reviewer");
    const civicStaff = await staff("civic");
    const enf = (await one<{ id: string }>(c, "INSERT INTO trust.enforcements (target_kind, target_id, subject_account_id, action, policy_id, decider_kind, decider_staff_id, explanation) VALUES ('comment', gen_random_uuid(), $1, 'hide', $2, 'human', $3, 'Hidden for harassment') RETURNING id", [a, p, decider])).id;
    const ap = (await one<{ id: string }>(c, "INSERT INTO trust.appeals (enforcement_id, appellant_id, reason) VALUES ($1, $2, 'This criticises a decision, not a person.') RETURNING id", [enf, a])).id;
    const decide = (rev: string, reasoning: string | null) =>
      errorOf(c, "UPDATE trust.appeals SET status = 'reversed', reviewer_id = $2, decision_reasoning = $3, decided_at = now() WHERE id = $1", [ap, rev, reasoning]);
    expect(await decide(decider, "ok")).toMatch(/decided the original/);
    expect(await decide(civicStaff, "ok")).toMatch(/trust team/);
    expect(await decide(other, null)).toMatch(/check constraint/);
    expect(await decide(other, "Criticism of a decision is protected.")).toBeNull();
  });

  it("enforcements are append-only", async () => {
    const a = await account("enf.append");
    const p = await policy();
    const id = (await one<{ id: string }>(c, "INSERT INTO trust.enforcements (target_kind, target_id, subject_account_id, action, policy_id, decider_kind, model_version, explanation) VALUES ('comment', gen_random_uuid(), $1, 'hide', $2, 'automated', 'v0', 'x') RETURNING id", [a, p])).id;
    expect(await errorOf(c, "UPDATE trust.enforcements SET explanation = 'y' WHERE id = $1", [id])).toMatch(/append-only/);
  });
});

describe("Sangam Civic", () => {
  async function setup() {
    const complainant = await account("resident");
    const other = await account("neighbour");
    const triage = await staff("civic", "Triage");
    const authority = (await one<{ id: string }>(c, "INSERT INTO civic.authorities (name, jurisdiction, channel_kind, channel_url) VALUES ('Navapur Municipal Corporation', 'Navapur', 'guided_handoff', 'https://example.org/grievance') RETURNING id")).id;
    const id = (await one<{ id: string }>(c, `INSERT INTO civic.cases (ref, complainant_id, category, title, description, location_text, accuracy_confirmed_at)
      VALUES ('SGM-C-' || nextval('civic.case_ref_seq'), $1, 'waste', 'Garbage not collected', 'The collection vehicle skipped Lanes 3 to 5 for six days.', 'Lake View Colony', now()) RETURNING id`, [complainant])).id;
    const state = async () => (await one<{ state: string; escalated: boolean }>(c, "SELECT state, escalated FROM civic.cases WHERE id = $1", [id]));
    const byComplainant = (action: string, to: string | null, who = complainant) =>
      errorOf(c, "INSERT INTO civic.case_events (case_id, action, from_state, to_state, actor_kind, actor_account_id) VALUES ($1, $2, 'DRAFT', $3, 'complainant', $4)", [id, action, to, who]);
    const byPlatform = (action: string, to: string | null) =>
      errorOf(c, "INSERT INTO civic.case_events (case_id, action, from_state, to_state, actor_kind, actor_staff_id) VALUES ($1, $2, 'DRAFT', $3, 'platform', $4)", [id, action, to, triage]);
    const source = async () =>
      (await one<{ id: string }>(c, "INSERT INTO civic.official_sources (case_id, authority_id, channel, reference, received_at, verified_by) VALUES ($1, $2, 'grievance portal', 'NMC/2026/1042', now(), $3) RETURNING id", [id, authority, triage])).id;
    const byAuthority = (action: string, to: string, src: string | null) =>
      errorOf(c, "INSERT INTO civic.case_events (case_id, action, from_state, to_state, actor_kind, official_source_id) VALUES ($1, $2, 'DRAFT', $3, 'authority', $4)", [id, action, to, src]);
    return { id, other, state, byComplainant, byPlatform, byAuthority, source };
  }

  it("walks the full journey and logs every step with its actor", async () => {
    const k = await setup();
    expect(await k.byComplainant("submit", "SUBMITTED")).toBeNull();
    expect(await k.byPlatform("triage", "TRIAGED")).toBeNull();
    expect(await k.byPlatform("start_routing", "ROUTING_PENDING")).toBeNull();
    expect(await k.byPlatform("route", "ROUTED")).toBeNull();
    expect(await k.byAuthority("acknowledge", "ACKNOWLEDGED", await k.source())).toBeNull();
    expect(await k.byAuthority("report_progress", "IN_PROGRESS", await k.source())).toBeNull();
    expect(await k.byAuthority("respond", "RESPONSE_RECEIVED", await k.source())).toBeNull();
    expect(await k.byPlatform("request_confirmation", "RESOLUTION_REVIEW")).toBeNull();
    expect(await k.byComplainant("confirm_not_fixed", "UNRESOLVED")).toBeNull();
    expect(await k.byComplainant("escalate", "IN_PROGRESS")).toBeNull();
    expect(await k.state()).toEqual({ state: "IN_PROGRESS", escalated: true });
    const log = (await c.query("SELECT seq, from_state, to_state, actor_kind FROM civic.case_events WHERE case_id = $1 ORDER BY seq", [k.id])).rows;
    expect(log.map((r) => r.seq)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(log[4]).toMatchObject({ from_state: "ROUTED", to_state: "ACKNOWLEDGED", actor_kind: "authority" });
  });

  it("refuses transitions outside the state machine", async () => {
    const k = await setup();
    await k.byComplainant("submit", "SUBMITTED");
    expect(await k.byPlatform("close", "CLOSED")).toMatch(/not allowed/);
    expect(await k.state()).toMatchObject({ state: "SUBMITTED" });
  });

  it("only the complainant can confirm a resolution", async () => {
    const k = await setup();
    for (const [a, s] of [["submit", "SUBMITTED"]] as const) await k.byComplainant(a, s);
    for (const [a, s] of [["triage", "TRIAGED"], ["start_routing", "ROUTING_PENDING"], ["route", "ROUTED"]] as const) await k.byPlatform(a, s);
    for (const [a, s] of [["acknowledge", "ACKNOWLEDGED"], ["report_progress", "IN_PROGRESS"], ["respond", "RESPONSE_RECEIVED"]] as const)
      await k.byAuthority(a, s, await k.source());
    await k.byPlatform("request_confirmation", "RESOLUTION_REVIEW");
    expect(await k.byPlatform("confirm_fixed", "RESOLVED")).toMatch(/must be made by complainant/);
    expect(await k.byComplainant("confirm_fixed", "RESOLVED", k.other)).toMatch(/only the complainant/);
    expect(await k.byComplainant("confirm_fixed", "RESOLVED")).toBeNull();
  });

  it("an authority step needs a verified official source", async () => {
    const k = await setup();
    await k.byComplainant("submit", "SUBMITTED");
    for (const [a, s] of [["triage", "TRIAGED"], ["start_routing", "ROUTING_PENDING"], ["route", "ROUTED"]] as const) await k.byPlatform(a, s);
    expect(await k.byAuthority("acknowledge", "ACKNOWLEDGED", null)).toMatch(/needs a verified official source/);
    expect(await k.state()).toMatchObject({ state: "ROUTED" });
  });

  it("case state cannot be edited directly, and the log is append-only", async () => {
    const k = await setup();
    await k.byComplainant("submit", "SUBMITTED");
    expect(await errorOf(c, "UPDATE civic.cases SET state = 'RESOLVED' WHERE id = $1", [k.id])).toMatch(/only through civic.case_events/);
    expect(await errorOf(c, "UPDATE civic.case_events SET note = 'edited' WHERE case_id = $1", [k.id])).toMatch(/append-only/);
    expect(await errorOf(c, "DELETE FROM civic.case_events WHERE case_id = $1", [k.id])).toMatch(/append-only/);
    expect(await errorOf(c, "UPDATE civic.cases SET title = 'Garbage not collected, Lanes 3-5' WHERE id = $1", [k.id])).toBeNull();
  });

  it("cases must be created as drafts, and submitted only after the accuracy confirmation", async () => {
    const a = await account("drafty");
    expect(await errorOf(c, `INSERT INTO civic.cases (ref, complainant_id, category, title, description, location_text, state, accuracy_confirmed_at)
      VALUES ('SGM-C-9999', $1, 'roads', 'Pothole on Main Road', 'A deep pothole has been there for two weeks.', 'Main Road', 'RESOLVED', now())`, [a])).toMatch(/created as DRAFT/);
    const id = (await one<{ id: string }>(c, `INSERT INTO civic.cases (ref, complainant_id, category, title, description, location_text)
      VALUES ('SGM-C-9998', $1, 'roads', 'Pothole on Main Road', 'A deep pothole has been there for two weeks.', 'Main Road') RETURNING id`, [a])).id;
    expect(await errorOf(c, "INSERT INTO civic.case_events (case_id, action, from_state, to_state, actor_kind, actor_account_id) VALUES ($1, 'submit', 'DRAFT', 'SUBMITTED', 'complainant', $2)", [id, a])).toMatch(/check constraint/);
  });

  it("evidence is hashed and its original is immutable", async () => {
    const k = await setup();
    const owner = (await one<{ complainant_id: string }>(c, "SELECT complainant_id FROM civic.cases WHERE id = $1", [k.id])).complainant_id;
    expect(await errorOf(c, "INSERT INTO civic.evidence (case_id, file_name, mime_type, byte_size, sha256, original_key, uploaded_by) VALUES ($1, 'a.jpg', 'image/jpeg', 10, '\\x00', 'k1', $2)", [k.id, owner])).toMatch(/check constraint/);
    const ev = (await one<{ id: string }>(c, "INSERT INTO civic.evidence (case_id, file_name, mime_type, byte_size, sha256, original_key, uploaded_by) VALUES ($1, 'a.jpg', 'image/jpeg', 10, sha256('photo'), 'k2', $2) RETURNING id", [k.id, owner])).id;
    expect(await errorOf(c, "UPDATE civic.evidence SET sha256 = sha256('other') WHERE id = $1", [ev])).toMatch(/immutable/);
    expect(await errorOf(c, "DELETE FROM civic.evidence WHERE id = $1", [ev])).toMatch(/append-only/);
  });

  it("public summaries hide private cases and anonymous complainants", async () => {
    const k = await setup();
    await k.byComplainant("submit", "SUBMITTED");
    const row = await one(c, "SELECT complainant_name FROM civic.public_case_summaries WHERE id = $1", [k.id]);
    expect(row).toEqual({ complainant_name: null });
  });
});

describe("Ombudsman", () => {
  it("assigns only a conflict-free reviewer from the ombudsman team", async () => {
    const a = await account("omb.complainant");
    const p = (await one<{ id: string }>(c, "INSERT INTO trust.policies (code, version, title, summary) VALUES ('spam', 1, 'Spam', 'No spam') RETURNING id")).id;
    const trustPerson = await staff("trust", "Trust decider");
    const ombA = await staff("ombudsman", "Reviewer A");
    const ombB = await staff("ombudsman", "Reviewer B");
    const enf = (await one<{ id: string }>(c, "INSERT INTO trust.enforcements (target_kind, target_id, subject_account_id, action, policy_id, decider_kind, decider_staff_id, explanation) VALUES ('account', $1, $1, 'suspend_account', $2, 'human', $3, 'Spam') RETURNING id", [a, p, trustPerson])).id;
    const id = (await one<{ id: string }>(c, "INSERT INTO ombudsman.cases (ref, complainant_id, type, description, subject_enforcement_id) VALUES ('SGM-O-' || lpad(nextval('ombudsman.case_ref_seq')::text, 4, '0'), $1, 'wrongful_suspension', 'My account was suspended for spam that I did not send.', $2) RETURNING id", [a, enf])).id;
    const act = (action: string, to: string, by: string, reviewer: string | null = null) =>
      errorOf(c, "INSERT INTO ombudsman.case_events (case_id, action, from_state, to_state, actor_kind, actor_staff_id, assign_reviewer_id) VALUES ($1, $2, 'RECEIVED', $3, 'ombudsman', $4, $5)", [id, action, to, by, reviewer]);

    expect(await act("start_conflict_check", "CONFLICT_CHECK", trustPerson)).toMatch(/only ombudsman staff/);
    expect(await act("start_conflict_check", "CONFLICT_CHECK", ombA)).toBeNull();
    expect(await act("assign", "ASSIGNED", ombA, trustPerson)).toMatch(/conflicted/);
    expect(await act("assign", "ASSIGNED", ombA, null)).toMatch(/missing or conflicted/);
    expect(await act("assign", "ASSIGNED", ombA, ombB)).toBeNull();
    expect(await one(c, "SELECT state, reviewer_id FROM ombudsman.cases WHERE id = $1", [id])).toEqual({ state: "ASSIGNED", reviewer_id: ombB });
    expect(await errorOf(c, "UPDATE ombudsman.cases SET state = 'CLOSED' WHERE id = $1", [id])).toMatch(/only through ombudsman.case_events/);
  });
});
