-- 0009 Platform Ombudsman: cases, append-only events with an enforced state machine,
-- conflict-checked reviewer assignment, findings and corrective actions.
-- Independence (Architecture): access isolated from Trust staff; separate deployment later.

CREATE TYPE ombudsman.case_state AS ENUM (
  'RECEIVED', 'CONFLICT_CHECK', 'ASSIGNED', 'UNDER_REVIEW', 'FINDINGS_ISSUED', 'CORRECTIVE_ACTION', 'CLOSED');
CREATE TYPE ombudsman.actor_kind AS ENUM ('complainant', 'ombudsman');
CREATE TYPE ombudsman.complaint_type AS ENUM (
  'wrongful_suspension', 'moderation_decision', 'privacy', 'accessibility', 'impersonation', 'unresolved_support');

CREATE TABLE ombudsman.case_transitions (
  from_state ombudsman.case_state NOT NULL,
  to_state   ombudsman.case_state NOT NULL,
  action     text NOT NULL,
  actor      ombudsman.actor_kind NOT NULL,
  requires_conflict_free_reviewer boolean NOT NULL DEFAULT false,
  PRIMARY KEY (from_state, to_state, action)
);
INSERT INTO ombudsman.case_transitions (from_state, to_state, action, actor, requires_conflict_free_reviewer) VALUES
  ('RECEIVED', 'CONFLICT_CHECK', 'start_conflict_check', 'ombudsman', false),
  ('RECEIVED', 'CLOSED', 'decline_out_of_remit', 'ombudsman', false),
  ('CONFLICT_CHECK', 'ASSIGNED', 'assign', 'ombudsman', true),
  ('ASSIGNED', 'UNDER_REVIEW', 'start_review', 'ombudsman', false),
  ('UNDER_REVIEW', 'FINDINGS_ISSUED', 'issue_findings', 'ombudsman', false),
  ('FINDINGS_ISSUED', 'CORRECTIVE_ACTION', 'require_corrective_action', 'ombudsman', false),
  ('FINDINGS_ISSUED', 'CLOSED', 'close', 'ombudsman', false),
  ('CORRECTIVE_ACTION', 'CLOSED', 'close', 'ombudsman', false),
  ('RECEIVED', 'CLOSED', 'withdraw', 'complainant', false),
  ('CONFLICT_CHECK', 'CLOSED', 'withdraw', 'complainant', false),
  ('ASSIGNED', 'CLOSED', 'withdraw', 'complainant', false),
  ('UNDER_REVIEW', 'CLOSED', 'withdraw', 'complainant', false);

CREATE TABLE ombudsman.cases (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref            text NOT NULL UNIQUE CHECK (ref ~ '^SGM-O-[0-9]{4,}$'),
  complainant_id uuid NOT NULL REFERENCES identity.accounts,
  type           ombudsman.complaint_type NOT NULL,
  description    text NOT NULL CHECK (length(description) BETWEEN 20 AND 800),
  -- Optional links to what the complaint is about.
  subject_enforcement_id uuid REFERENCES trust.enforcements,
  subject_civic_case_id  uuid REFERENCES civic.cases,
  state          ombudsman.case_state NOT NULL DEFAULT 'RECEIVED',
  reviewer_id    uuid REFERENCES platform.staff,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE SEQUENCE ombudsman.case_ref_seq START 200;

-- Conflict rule: the reviewer is on the Ombudsman team and had no role in the subject
-- decision (neither the original decider nor the appeal reviewer).
CREATE FUNCTION ombudsman.is_conflicted(reviewer uuid, case_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT
    NOT EXISTS (SELECT 1 FROM platform.staff s WHERE s.id = reviewer AND s.team = 'ombudsman' AND s.active)
    OR EXISTS (
      SELECT 1 FROM ombudsman.cases c
      LEFT JOIN trust.enforcements e ON e.id = c.subject_enforcement_id
      LEFT JOIN trust.appeals a ON a.enforcement_id = e.id
      WHERE c.id = case_id AND reviewer IN (e.decider_staff_id, a.reviewer_id))
$$;

CREATE TABLE ombudsman.case_events (
  case_id     uuid NOT NULL REFERENCES ombudsman.cases,
  seq         int NOT NULL,
  action      text NOT NULL,
  from_state  ombudsman.case_state NOT NULL,
  to_state    ombudsman.case_state NOT NULL,
  actor_kind  ombudsman.actor_kind NOT NULL,
  actor_account_id uuid REFERENCES identity.accounts,
  actor_staff_id   uuid REFERENCES platform.staff,
  assign_reviewer_id uuid REFERENCES platform.staff,
  note        text CHECK (length(note) <= 4000),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (case_id, seq),
  CHECK (
    (actor_kind = 'complainant' AND actor_account_id IS NOT NULL AND actor_staff_id IS NULL) OR
    (actor_kind = 'ombudsman' AND actor_staff_id IS NOT NULL AND actor_account_id IS NULL))
);

CREATE FUNCTION ombudsman.apply_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c ombudsman.cases; t ombudsman.case_transitions;
BEGIN
  SELECT * INTO c FROM ombudsman.cases WHERE id = NEW.case_id FOR UPDATE;
  NEW.from_state := c.state;
  NEW.seq := COALESCE((SELECT max(seq) FROM ombudsman.case_events WHERE case_id = NEW.case_id), 0) + 1;

  SELECT * INTO t FROM ombudsman.case_transitions
    WHERE from_state = c.state AND to_state = NEW.to_state AND action = NEW.action;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'transition % -> % via % is not allowed', c.state, NEW.to_state, NEW.action USING ERRCODE = 'check_violation';
  END IF;
  IF t.actor <> NEW.actor_kind THEN
    RAISE EXCEPTION 'transition must be made by %', t.actor USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NEW.actor_kind = 'complainant' AND NEW.actor_account_id <> c.complainant_id THEN
    RAISE EXCEPTION 'only the complainant can withdraw' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NEW.actor_kind = 'ombudsman' AND NOT EXISTS (
       SELECT 1 FROM platform.staff WHERE id = NEW.actor_staff_id AND team = 'ombudsman') THEN
    RAISE EXCEPTION 'only ombudsman staff can act on ombudsman cases' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF t.requires_conflict_free_reviewer THEN
    IF NEW.assign_reviewer_id IS NULL OR ombudsman.is_conflicted(NEW.assign_reviewer_id, c.id) THEN
      RAISE EXCEPTION 'reviewer is missing or conflicted' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  PERFORM set_config('ombudsman.allow_case_write', 'on', true);
  UPDATE ombudsman.cases SET
    state = NEW.to_state,
    reviewer_id = COALESCE(NEW.assign_reviewer_id, reviewer_id),
    updated_at = now()
  WHERE id = c.id;
  RETURN NEW;
END $$;
CREATE TRIGGER case_events_apply BEFORE INSERT ON ombudsman.case_events FOR EACH ROW EXECUTE FUNCTION ombudsman.apply_event();
CREATE TRIGGER case_events_append_only BEFORE UPDATE OR DELETE ON ombudsman.case_events
  FOR EACH ROW EXECUTE FUNCTION platform.forbid_mutation();

CREATE FUNCTION ombudsman.guard_case() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.state <> 'RECEIVED' OR NEW.reviewer_id IS NOT NULL THEN
      RAISE EXCEPTION 'cases are created as RECEIVED without a reviewer' USING ERRCODE = 'check_violation';
    END IF;
  ELSIF (NEW.state IS DISTINCT FROM OLD.state OR NEW.reviewer_id IS DISTINCT FROM OLD.reviewer_id)
        AND current_setting('ombudsman.allow_case_write', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'case state changes only through ombudsman.case_events' USING ERRCODE = 'restrict_violation';
  END IF;
  PERFORM set_config('ombudsman.allow_case_write', 'off', true);
  RETURN NEW;
END $$;
CREATE TRIGGER cases_guard BEFORE INSERT OR UPDATE ON ombudsman.cases FOR EACH ROW EXECUTE FUNCTION ombudsman.guard_case();

CREATE TABLE ombudsman.findings (
  case_id     uuid PRIMARY KEY REFERENCES ombudsman.cases,
  outcome     text NOT NULL CHECK (outcome IN ('upheld', 'upheld_in_part', 'not_upheld')),
  summary     text NOT NULL CHECK (length(summary) > 0),
  issued_by   uuid NOT NULL REFERENCES platform.staff,
  issued_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ombudsman.corrective_actions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id     uuid NOT NULL REFERENCES ombudsman.findings,
  description text NOT NULL,
  owner_team  platform.staff_team NOT NULL CHECK (owner_team <> 'ombudsman'),
  due_at      timestamptz NOT NULL,
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done', 'overdue', 'disputed')),
  response    text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Aggregate transparency report: counts only, no personal data.
CREATE VIEW ombudsman.transparency_report AS
  SELECT c.type, date_trunc('quarter', c.created_at) AS quarter,
         count(*) AS cases,
         count(*) FILTER (WHERE f.outcome IN ('upheld', 'upheld_in_part')) AS upheld,
         count(ca.id) AS corrective_actions
  FROM ombudsman.cases c
  LEFT JOIN ombudsman.findings f ON f.case_id = c.id
  LEFT JOIN ombudsman.corrective_actions ca ON ca.case_id = c.id
  GROUP BY 1, 2;
