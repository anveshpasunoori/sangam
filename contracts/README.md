# Sangam contracts (stage E)

Stage E of the Sangam Product Blueprint: the data model, executable SQL migrations, the OpenAPI contract and the event schemas. These come before any backend code is written. Implementation (stage F) builds against these files.

| Path | What it is |
| --- | --- |
| [`state-machines/`](state-machines) | Civic and Ombudsman case flows as JSON. The single source the database, API, events and web app are tested against. |
| [`db/migrations/`](db/migrations) | PostgreSQL 16 migrations, one schema per bounded context. Rules are enforced in the database. |
| [`docs/erd.md`](docs/erd.md) | Entity-relationship diagrams (Mermaid) per context. |
| [`openapi/sangam.yaml`](openapi/sangam.yaml) | OpenAPI 3.1 for the member-facing API: 77 operations across 13 tags. |
| [`events/`](events) | JSON Schema (2020-12) for the event envelope and 12 domain events, each with a validated example. |
| [`test/`](test) | Contract tests: cross-file consistency, and the database enforcing each rule. |

## Run the checks

Needs Docker. From the repo root:

```bash
npm install
npm run contracts:check
```

That lints the OpenAPI file, starts a throwaway `postgres:16-alpine` container on port 55432 (`npm run db:up -w @sangam/contracts`), creates a fresh database, applies every migration and runs the tests. Remove the container with `npm run db:down -w @sangam/contracts`. To migrate another database: `DATABASE_URL=postgres://… npm run migrate -w @sangam/contracts`. The runner refuses to re-apply a migration whose file changed; add a new migration instead.

## Rules enforced by the database

| Blueprint rule | How |
| --- | --- |
| One policy decides post visibility for every read path | `content.can_view(viewer, post)` |
| Default audience Friends, local discovery off | `identity.privacy_settings` created on account insert |
| No mandatory legal name or Aadhaar | No such columns (tested) |
| Blocks remove friendship, follows, requests | Trigger on `graph.blocks` |
| Private communities never auto-approve | Trigger on `community.members` |
| Per-conversation message order | `seq` assigned under a row lock; only participants can send |
| Screening never blocks without a reason and a policy | CHECK on `trust.screenings` |
| Every enforcement names the rule and decider; AI does not suspend accounts | CHECKs on `trust.enforcements` (append-only) |
| Appeals reach a different human on the Trust team, with reasoning | Trigger and CHECK on `trust.appeals` |
| No civic transition outside the state machine; every step logged with actor | `civic.case_events` insert is the transition, validated against `civic.case_transitions`; direct state edits refused |
| Only the complainant confirms a resolution | Actor check in the transition trigger |
| No acknowledgement without a verified official source | Authority steps require `official_source_id` |
| Evidence originals hashed, versioned, immutable; access logged | `civic.evidence` CHECK and guards; `civic.evidence_access_log` append-only |
| Public civic view hides identities and private cases | `civic.public_case_summaries` |
| Ombudsman reviewer independent and conflict-free | `ombudsman.is_conflicted` checked on assignment; only Ombudsman staff act |

## Open decisions this contract leaves open

The blueprint lists seven open decisions. These are the ones that touch the contract, and how it stays neutral:

- **Messaging encryption (decision 5).** A message carries either `body` or `ciphertext`, never both. Events never carry message content.
- **Identity verification (decision 4).** `identity.verifications` is per purpose (`public_figure`, `organisation`, `creator`, `payments`); no action requires it yet.
- **Civic routing (decision 2).** `civic.authorities.channel_kind` supports both `official_integration` and `guided_handoff`.
- **Ombudsman independence (decision 3).** Ombudsman staff are a separate team, and the cases live in their own schema so they can move to a separate deployment. Who appoints the reviewers is not modelled.
- **Moderation languages (decision 6).** Screenings record `lang` and `model_version`, so precision and recall can be measured per language.

## Not in this contract yet

- Staff consoles (triage, routing, reviewer queues, admin) and their API. Staff actions are modelled in the database and tested, but have no HTTP surface yet.
- Creator and business, commerce and payments, ads: deferred to step 11 in the blueprint.
- Reels and story creation, live streaming, calls.
- Row-level security and database roles per service. Authorisation is planned to be server-side; this needs designing before stage F.
