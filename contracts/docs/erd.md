# Sangam data model (ERD)

PostgreSQL 16, one schema per bounded context. The executable source is [`db/migrations`](../db/migrations); these diagrams show its tables and keys. Columns are trimmed to keys and the fields that carry a rule.

## Identity, graph and content

```mermaid
erDiagram
  identity_accounts ||--|| identity_privacy_settings : "defaults on insert"
  identity_accounts ||--o{ identity_passkeys : has
  identity_accounts ||--o{ identity_sessions : has
  identity_accounts ||--o{ identity_devices : has
  identity_accounts ||--o{ identity_verifications : "optional, per purpose"
  identity_accounts ||--o{ graph_friendships : "pair, a < b"
  identity_accounts ||--o{ graph_follows : follows
  identity_accounts ||--o{ graph_blocks : "blocks (clears ties)"
  identity_accounts ||--o{ graph_mutes : mutes
  identity_accounts ||--o{ graph_close_friends : owns
  identity_accounts ||--o{ content_posts : writes
  content_posts ||--o{ content_post_revisions : "append-only"
  content_posts ||--o{ content_post_media : has
  media_assets ||--o{ content_post_media : "used in"
  content_posts ||--o| content_polls : has
  content_polls ||--o{ content_poll_options : has
  content_poll_options ||--o{ content_poll_votes : "one per account"
  content_posts ||--o{ content_comments : has
  content_posts ||--o{ content_reactions : has
  content_posts ||--o{ content_saves : "private to saver"

  identity_accounts {
    uuid id PK
    citext handle UK
    text display_name "any name; no legal name, no Aadhaar"
    lang ui_lang
    account_status status
  }
  identity_privacy_settings {
    uuid account_id PK
    audience default_audience "friends"
    text who_can_message "friends"
    bool local_discovery "false"
    bool personalised_ranking
  }
  identity_sessions {
    uuid id PK
    bytea token_hash "sha256 only"
  }
  content_posts {
    uuid id PK
    uuid author_id FK
    audience audience "default friends"
    post_status status "draft | held_for_review | published | removed | deleted"
    uuid community_id FK
    uuid civic_issue_id FK
  }
  media_assets {
    uuid id PK
    bytea sha256 "32 bytes"
    asset_status status "uploading -> scanning -> ready"
    text alt_text
  }
```

`content.can_view(viewer, post)` is the single visibility check (audience, close friends, blocks in either direction, draft and held posts visible only to the author). Feeds, search, shares and community views all call it at serve time.

## Communities and messaging

```mermaid
erDiagram
  community_communities ||--o{ community_members : has
  community_communities ||--o{ community_rules : has
  community_communities ||--o{ community_events : hosts
  community_events ||--o{ community_rsvps : has
  community_communities ||--o{ content_posts : "community feed"
  messaging_conversations ||--o{ messaging_participants : has
  messaging_conversations ||--o{ messaging_messages : "ordered by seq"
  messaging_message_requests }o--o| messaging_conversations : "accepted into"

  community_members {
    uuid community_id PK
    uuid account_id PK
    role role
    membership_status status "private: requested until approved"
  }
  messaging_messages {
    uuid conversation_id PK
    bigint seq PK "assigned under lock"
    uuid client_msg_id "idempotent retries"
    text body "exactly one of body"
    bytea ciphertext "or ciphertext (open decision 5)"
  }
```

## Trust and safety

```mermaid
erDiagram
  trust_policies ||--o{ trust_screenings : "cited by"
  trust_policies ||--o{ trust_enforcements : "cited by"
  trust_enforcements ||--o| trust_appeals : "one appeal"
  platform_staff ||--o{ trust_enforcements : "human decider"
  platform_staff ||--o{ trust_appeals : "reviewer (trust team, not the decider)"
  identity_accounts ||--o{ trust_reports : "confidential"

  trust_screenings {
    screen_verdict verdict "allow | request_revision | hold_for_review | reject"
    uuid policy_id FK "required unless allow"
    text reason "required unless allow"
    text model_version
  }
  trust_enforcements {
    uuid id PK "append-only"
    enforcement_action action
    uuid policy_id FK "always"
    decider_kind decider_kind "automated never suspends"
    uuid decider_staff_id FK
  }
  trust_appeals {
    appeal_status status
    uuid reviewer_id FK
    text decision_reasoning "required when decided"
  }
```

## Sangam Civic

```mermaid
erDiagram
  civic_cases ||--o{ civic_case_events : "append-only log; insert = transition"
  civic_case_transitions ||--o{ civic_case_events : "validates"
  civic_cases ||--o{ civic_evidence : has
  civic_evidence ||--o{ civic_evidence_access_log : "every read logged"
  civic_evidence ||--o| civic_evidence : "replaces (new version)"
  civic_authorities ||--o{ civic_cases : "routed to"
  civic_authorities ||--o{ civic_official_sources : issues
  civic_official_sources ||--o{ civic_case_events : "required for authority steps"
  platform_staff ||--o{ civic_official_sources : verifies
  civic_issues ||--o{ civic_issue_cases : groups
  civic_cases ||--o| civic_issue_cases : "in at most one"
  civic_issues ||--o{ civic_issue_supporters : "affected too"

  civic_cases {
    uuid id PK
    text ref UK "SGM-C-nnnn"
    uuid complainant_id FK
    case_state state "changes only via case_events"
    bool escalated
    visibility visibility "public_anonymous | public_named | private"
    timestamptz accuracy_confirmed_at "required to leave DRAFT"
  }
  civic_case_events {
    uuid case_id PK
    int seq PK
    text action
    case_state from_state
    case_state to_state "null for side events"
    actor_kind actor_kind "complainant | platform | authority"
    uuid official_source_id FK
  }
  civic_evidence {
    uuid id PK
    bytea sha256 "32 bytes, immutable"
    text original_key "restricted bucket, immutable"
    text redacted_key "public derivative after review"
    int version
  }
```

The state machine is [`state-machines/civic.json`](../state-machines/civic.json). `civic.public_case_summaries` never exposes private cases or anonymous complainants. `civic.category_stats_90d` counts an acknowledgement only when an authority event cites a verified source.

## Ombudsman

```mermaid
erDiagram
  ombudsman_cases ||--o{ ombudsman_case_events : "append-only; insert = transition"
  ombudsman_case_transitions ||--o{ ombudsman_case_events : validates
  ombudsman_cases ||--o| ombudsman_findings : has
  ombudsman_findings ||--o{ ombudsman_corrective_actions : tracks
  trust_enforcements ||--o{ ombudsman_cases : "subject (optional)"
  civic_cases ||--o{ ombudsman_cases : "subject (optional)"
  platform_staff ||--o{ ombudsman_cases : "reviewer: ombudsman team, conflict-free"

  ombudsman_cases {
    uuid id PK
    text ref UK "SGM-O-nnnn"
    case_state state "changes only via case_events"
    uuid reviewer_id FK
  }
```

`ombudsman.is_conflicted(reviewer, case)` rejects anyone outside the Ombudsman team, and anyone who decided the subject enforcement or its appeal.

## Platform

`platform.outbox` (transactional outbox; payloads follow [`events/`](../events)), `platform.idempotency_keys`, `platform.notifications`, `platform.staff`.
