-- 0008 Sangam Civic: authorities, cases, append-only case events with an enforced state
-- machine, verified acknowledgement sources, hashed and versioned evidence with an access
-- log, public issues and supporters.
--
-- Rules (PRD: Civic states, Civic evidence, Civic honesty):
--   * no transition outside contracts/state-machines/civic.json; every transition logged with actor
--   * only the complainant confirms a resolution
--   * authority steps require a verified official source reference
--   * originals restricted, hashed and versioned; public view is a redacted derivative

CREATE TYPE civic.case_state AS ENUM (
  'DRAFT', 'SUBMITTED', 'TRIAGED', 'ROUTING_PENDING', 'ROUTED', 'ACKNOWLEDGED', 'IN_PROGRESS',
  'RESPONSE_RECEIVED', 'RESOLUTION_REVIEW', 'RESOLVED', 'UNRESOLVED', 'CLOSED', 'WITHDRAWN',
  'REJECTED', 'DUPLICATE', 'REOPENED');
CREATE TYPE civic.actor_kind AS ENUM ('complainant', 'platform', 'authority');
CREATE TYPE civic.visibility AS ENUM ('public_anonymous', 'public_named', 'private');

CREATE TABLE civic.categories (
  code  text PRIMARY KEY CHECK (code ~ '^[a-z_]+$'),
  label text NOT NULL
);
INSERT INTO civic.categories (code, label) VALUES
  ('roads', 'Roads'), ('transport', 'Transport'), ('water', 'Water'), ('sanitation', 'Sanitation'),
  ('electricity', 'Electricity'), ('waste', 'Waste'), ('healthcare', 'Healthcare'), ('education', 'Education'),
  ('consumer_services', 'Consumer services'), ('public_services', 'Public services'),
  ('environment', 'Environment'), ('public_safety', 'Public safety');

-- Allowed transitions; seeded from contracts/state-machines/civic.json (a test checks they match).
CREATE TABLE civic.case_transitions (
  from_state civic.case_state NOT NULL,
  to_state   civic.case_state NOT NULL,
  action     text NOT NULL,
  actor      civic.actor_kind NOT NULL,
  requires_verified_source boolean NOT NULL DEFAULT false,
  PRIMARY KEY (from_state, to_state, action)
);
INSERT INTO civic.case_transitions (from_state, to_state, action, actor, requires_verified_source) VALUES
  ('DRAFT', 'SUBMITTED', 'submit', 'complainant', false),
  ('SUBMITTED', 'TRIAGED', 'triage', 'platform', false),
  ('SUBMITTED', 'REJECTED', 'reject', 'platform', false),
  ('SUBMITTED', 'DUPLICATE', 'mark_duplicate', 'platform', false),
  ('TRIAGED', 'ROUTING_PENDING', 'start_routing', 'platform', false),
  ('TRIAGED', 'REJECTED', 'reject', 'platform', false),
  ('TRIAGED', 'DUPLICATE', 'mark_duplicate', 'platform', false),
  ('ROUTING_PENDING', 'ROUTED', 'route', 'platform', false),
  ('ROUTED', 'ACKNOWLEDGED', 'acknowledge', 'authority', true),
  ('ACKNOWLEDGED', 'IN_PROGRESS', 'report_progress', 'authority', true),
  ('IN_PROGRESS', 'RESPONSE_RECEIVED', 'respond', 'authority', true),
  ('RESPONSE_RECEIVED', 'RESOLUTION_REVIEW', 'request_confirmation', 'platform', false),
  ('RESOLUTION_REVIEW', 'RESOLVED', 'confirm_fixed', 'complainant', false),
  ('RESOLUTION_REVIEW', 'UNRESOLVED', 'confirm_not_fixed', 'complainant', false),
  ('RESOLVED', 'CLOSED', 'close', 'platform', false),
  ('UNRESOLVED', 'IN_PROGRESS', 'escalate', 'complainant', false),
  ('RESOLVED', 'REOPENED', 'reopen', 'complainant', false),
  ('UNRESOLVED', 'REOPENED', 'reopen', 'complainant', false),
  ('CLOSED', 'REOPENED', 'reopen', 'complainant', false),
  ('REOPENED', 'TRIAGED', 'triage', 'platform', false),
  ('SUBMITTED', 'WITHDRAWN', 'withdraw', 'complainant', false),
  ('TRIAGED', 'WITHDRAWN', 'withdraw', 'complainant', false),
  ('ROUTING_PENDING', 'WITHDRAWN', 'withdraw', 'complainant', false),
  ('ROUTED', 'WITHDRAWN', 'withdraw', 'complainant', false),
  ('ACKNOWLEDGED', 'WITHDRAWN', 'withdraw', 'complainant', false),
  ('IN_PROGRESS', 'WITHDRAWN', 'withdraw', 'complainant', false),
  ('RESPONSE_RECEIVED', 'WITHDRAWN', 'withdraw', 'complainant', false),
  ('RESOLUTION_REVIEW', 'WITHDRAWN', 'withdraw', 'complainant', false),
  ('REOPENED', 'WITHDRAWN', 'withdraw', 'complainant', false);

-- Events that do not change state, and the states that allow them.
CREATE TABLE civic.case_side_events (
  action     text NOT NULL,
  actor      civic.actor_kind NOT NULL,
  allowed_in civic.case_state NOT NULL,
  PRIMARY KEY (action, allowed_in)
);
INSERT INTO civic.case_side_events (action, actor, allowed_in)
SELECT 'escalate', 'complainant'::civic.actor_kind, s::civic.case_state FROM unnest(ARRAY['ROUTED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESPONSE_RECEIVED']) s
UNION ALL
SELECT 'add_evidence', 'complainant'::civic.actor_kind, s::civic.case_state FROM unnest(ARRAY['DRAFT', 'SUBMITTED', 'TRIAGED', 'ROUTING_PENDING', 'ROUTED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'REOPENED']) s
UNION ALL
SELECT 'add_note', 'platform'::civic.actor_kind, s::civic.case_state FROM unnest(ARRAY['SUBMITTED', 'TRIAGED', 'ROUTING_PENDING', 'ROUTED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESPONSE_RECEIVED', 'RESOLUTION_REVIEW', 'REOPENED']) s;

-- Authorities and their verified official channels (Gate before step 9: at least one
-- authorised integration or a verified guided-channel directory).
CREATE TABLE civic.authorities (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  jurisdiction  text NOT NULL,
  parent_id     uuid REFERENCES civic.authorities, -- next level for escalation
  channel_url   text CHECK (channel_url ~ '^https://'),
  channel_kind  text NOT NULL CHECK (channel_kind IN ('official_integration', 'guided_handoff')),
  verified_by   uuid REFERENCES platform.staff,
  verified_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE civic.cases (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref            text NOT NULL UNIQUE CHECK (ref ~ '^SGM-C-[0-9]{4,}$'),
  complainant_id uuid NOT NULL REFERENCES identity.accounts,
  category       text NOT NULL REFERENCES civic.categories,
  title          text NOT NULL CHECK (length(title) BETWEEN 8 AND 80),
  description    text NOT NULL CHECK (length(description) BETWEEN 20 AND 800),
  location_text  text NOT NULL CHECK (length(location_text) BETWEEN 4 AND 120),
  ward           text,
  latitude       numeric(8, 6) CHECK (latitude BETWEEN -90 AND 90),
  longitude      numeric(9, 6) CHECK (longitude BETWEEN -180 AND 180),
  visibility     civic.visibility NOT NULL DEFAULT 'public_anonymous',
  accuracy_confirmed_at timestamptz,
  state          civic.case_state NOT NULL DEFAULT 'DRAFT',
  escalated      boolean NOT NULL DEFAULT false,
  authority_id   uuid REFERENCES civic.authorities,
  duplicate_of   uuid REFERENCES civic.cases,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (state = 'DRAFT' OR accuracy_confirmed_at IS NOT NULL),
  CHECK ((state = 'DUPLICATE') = (duplicate_of IS NOT NULL))
);
CREATE SEQUENCE civic.case_ref_seq START 1000;
CREATE INDEX cases_complainant ON civic.cases (complainant_id, created_at DESC);
CREATE INDEX cases_open ON civic.cases (state) WHERE state NOT IN ('CLOSED', 'WITHDRAWN', 'REJECTED', 'DUPLICATE');

-- Verified official source references. An authority step must cite one.
CREATE TABLE civic.official_sources (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id      uuid NOT NULL REFERENCES civic.cases ON DELETE CASCADE,
  authority_id uuid NOT NULL REFERENCES civic.authorities,
  channel      text NOT NULL,
  reference    text NOT NULL CHECK (length(reference) > 0),
  received_at  timestamptz NOT NULL,
  verified_by  uuid NOT NULL REFERENCES platform.staff,
  verified_at  timestamptz NOT NULL DEFAULT now()
);

-- Append-only case log. Inserting an event IS the transition: a trigger validates it
-- against case_transitions and moves the case. Direct updates of cases.state are refused.
CREATE TABLE civic.case_events (
  case_id     uuid NOT NULL REFERENCES civic.cases,
  seq         int NOT NULL,
  action      text NOT NULL,
  from_state  civic.case_state NOT NULL,
  to_state    civic.case_state, -- NULL for side events (escalate, add_evidence, add_note)
  actor_kind  civic.actor_kind NOT NULL,
  actor_account_id uuid REFERENCES identity.accounts,
  actor_staff_id   uuid REFERENCES platform.staff,
  official_source_id uuid REFERENCES civic.official_sources,
  note        text CHECK (length(note) <= 2000),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (case_id, seq),
  CHECK (
    (actor_kind = 'complainant' AND actor_account_id IS NOT NULL AND actor_staff_id IS NULL) OR
    (actor_kind = 'platform' AND actor_staff_id IS NOT NULL AND actor_account_id IS NULL) OR
    (actor_kind = 'authority' AND official_source_id IS NOT NULL))
);

CREATE FUNCTION civic.apply_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c civic.cases; t civic.case_transitions;
BEGIN
  SELECT * INTO c FROM civic.cases WHERE id = NEW.case_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'case % not found', NEW.case_id; END IF;

  NEW.from_state := c.state;
  NEW.seq := COALESCE((SELECT max(seq) FROM civic.case_events WHERE case_id = NEW.case_id), 0) + 1;

  IF NEW.actor_kind = 'complainant' AND NEW.actor_account_id <> c.complainant_id THEN
    RAISE EXCEPTION 'only the complainant can act as complainant' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.to_state IS NULL THEN
    IF NOT EXISTS (SELECT 1 FROM civic.case_side_events s
                   WHERE s.action = NEW.action AND s.actor = NEW.actor_kind AND s.allowed_in = c.state) THEN
      RAISE EXCEPTION 'event % by % not allowed in state %', NEW.action, NEW.actor_kind, c.state
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.action = 'escalate' THEN
      IF c.escalated THEN RAISE EXCEPTION 'case already escalated' USING ERRCODE = 'check_violation'; END IF;
      PERFORM set_config('civic.allow_case_write', 'on', true);
      UPDATE civic.cases SET escalated = true, updated_at = now() WHERE id = c.id;
    END IF;
    RETURN NEW;
  END IF;

  SELECT * INTO t FROM civic.case_transitions
    WHERE from_state = c.state AND to_state = NEW.to_state AND action = NEW.action;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'transition % -> % via % is not allowed', c.state, NEW.to_state, NEW.action
      USING ERRCODE = 'check_violation';
  END IF;
  IF t.actor <> NEW.actor_kind THEN
    RAISE EXCEPTION 'transition % -> % must be made by %, not %', c.state, NEW.to_state, t.actor, NEW.actor_kind
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF t.requires_verified_source AND NEW.official_source_id IS NULL THEN
    RAISE EXCEPTION 'transition % -> % needs a verified official source', c.state, NEW.to_state
      USING ERRCODE = 'check_violation';
  END IF;

  PERFORM set_config('civic.allow_case_write', 'on', true);
  UPDATE civic.cases SET
    state = NEW.to_state,
    escalated = CASE WHEN NEW.action = 'escalate' THEN true WHEN NEW.action = 'reopen' THEN false ELSE escalated END,
    updated_at = now()
  WHERE id = c.id;
  RETURN NEW;
END $$;
CREATE TRIGGER case_events_apply BEFORE INSERT ON civic.case_events FOR EACH ROW EXECUTE FUNCTION civic.apply_event();
CREATE TRIGGER case_events_append_only BEFORE UPDATE OR DELETE ON civic.case_events
  FOR EACH ROW EXECUTE FUNCTION platform.forbid_mutation();

CREATE FUNCTION civic.guard_case_state() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.state IS DISTINCT FROM OLD.state OR NEW.escalated IS DISTINCT FROM OLD.escalated)
     AND current_setting('civic.allow_case_write', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'case state changes only through civic.case_events' USING ERRCODE = 'restrict_violation';
  END IF;
  -- Reset the guard so it covers only the one write it was opened for.
  PERFORM set_config('civic.allow_case_write', 'off', true);
  RETURN NEW;
END $$;
CREATE TRIGGER cases_guard_state BEFORE UPDATE ON civic.cases FOR EACH ROW EXECUTE FUNCTION civic.guard_case_state();

-- New cases start in DRAFT; the 'submit' event moves them on.
CREATE FUNCTION civic.guard_case_insert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.state <> 'DRAFT' OR NEW.escalated THEN
    RAISE EXCEPTION 'cases are created as DRAFT' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER cases_guard_insert BEFORE INSERT ON civic.cases FOR EACH ROW EXECUTE FUNCTION civic.guard_case_insert();

-- Evidence ----------------------------------------------------------------------------
CREATE TABLE civic.evidence (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id       uuid NOT NULL REFERENCES civic.cases,
  version       int NOT NULL DEFAULT 1 CHECK (version >= 1),
  replaces_id   uuid REFERENCES civic.evidence,
  file_name     text NOT NULL CHECK (length(file_name) BETWEEN 1 AND 200),
  mime_type     text NOT NULL,
  byte_size     bigint NOT NULL CHECK (byte_size > 0),
  sha256        bytea NOT NULL CHECK (length(sha256) = 32),
  original_key  text NOT NULL UNIQUE, -- restricted bucket
  redacted_key  text UNIQUE,          -- public derivative, NULL until redaction is reviewed
  redaction_reviewed_by uuid REFERENCES platform.staff,
  uploaded_by   uuid NOT NULL REFERENCES identity.accounts,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CHECK ((redacted_key IS NULL) = (redaction_reviewed_by IS NULL)),
  CHECK ((version = 1) = (replaces_id IS NULL))
);
CREATE INDEX evidence_case ON civic.evidence (case_id);
CREATE TRIGGER evidence_append_only BEFORE DELETE ON civic.evidence
  FOR EACH ROW EXECUTE FUNCTION platform.forbid_mutation();

-- Hash and original are immutable once written; only the redacted derivative can be attached.
CREATE FUNCTION civic.guard_evidence_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.sha256 <> OLD.sha256 OR NEW.original_key <> OLD.original_key OR NEW.byte_size <> OLD.byte_size
     OR NEW.case_id <> OLD.case_id OR NEW.version <> OLD.version THEN
    RAISE EXCEPTION 'evidence originals are immutable; upload a new version' USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER evidence_guard_update BEFORE UPDATE ON civic.evidence FOR EACH ROW EXECUTE FUNCTION civic.guard_evidence_update();

CREATE TABLE civic.evidence_access_log (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  evidence_id uuid NOT NULL REFERENCES civic.evidence,
  accessed_by_account uuid REFERENCES identity.accounts,
  accessed_by_staff   uuid REFERENCES platform.staff,
  variant     text NOT NULL CHECK (variant IN ('original', 'redacted')),
  purpose     text NOT NULL,
  accessed_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(accessed_by_account, accessed_by_staff) = 1)
);
CREATE TRIGGER evidence_access_log_append_only BEFORE UPDATE OR DELETE ON civic.evidence_access_log
  FOR EACH ROW EXECUTE FUNCTION platform.forbid_mutation();

-- Public issues ------------------------------------------------------------------------
-- An issue groups cases about the same problem. It exposes only public summaries.
CREATE TABLE civic.issues (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category    text NOT NULL REFERENCES civic.categories,
  title       text NOT NULL,
  ward        text NOT NULL,
  authority_id uuid REFERENCES civic.authorities,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE civic.issue_cases (
  issue_id uuid NOT NULL REFERENCES civic.issues ON DELETE CASCADE,
  case_id  uuid NOT NULL UNIQUE REFERENCES civic.cases,
  PRIMARY KEY (issue_id, case_id)
);
CREATE TABLE civic.issue_supporters (
  issue_id   uuid NOT NULL REFERENCES civic.issues ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (issue_id, account_id)
);

ALTER TABLE content.posts
  ADD CONSTRAINT posts_civic_issue_fk FOREIGN KEY (civic_issue_id) REFERENCES civic.issues ON DELETE SET NULL;

-- Public summary: no complainant identity unless they chose public_named, never private cases,
-- never original evidence.
CREATE VIEW civic.public_case_summaries AS
  SELECT c.id, c.ref, c.category, c.title, c.ward, c.state, c.escalated, c.created_at,
         CASE WHEN c.visibility = 'public_named' THEN a.display_name END AS complainant_name,
         ic.issue_id
  FROM civic.cases c
  JOIN identity.accounts a ON a.id = c.complainant_id
  LEFT JOIN civic.issue_cases ic ON ic.case_id = c.id
  WHERE c.visibility <> 'private' AND c.state NOT IN ('DRAFT', 'WITHDRAWN', 'REJECTED');

-- Accountability dashboard: acknowledgement counted only when an authority event cites a verified source.
CREATE VIEW civic.category_stats_90d AS
  WITH recent AS (
    SELECT * FROM civic.cases WHERE state <> 'DRAFT' AND created_at >= now() - interval '90 days'),
  first_ack AS (
    SELECT e.case_id, min(e.created_at) AS at
    FROM civic.case_events e
    WHERE e.actor_kind = 'authority' AND e.official_source_id IS NOT NULL
    GROUP BY e.case_id),
  submitted AS (
    SELECT case_id, min(created_at) AS at FROM civic.case_events WHERE action = 'submit' GROUP BY case_id)
  SELECT r.category,
         count(*) AS complaints,
         count(fa.case_id) AS verified_acknowledgements,
         percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM fa.at - s.at) / 86400.0) AS median_days_to_first_response
  FROM recent r
  LEFT JOIN first_ack fa ON fa.case_id = r.id
  LEFT JOIN submitted s ON s.case_id = r.id
  GROUP BY r.category;
