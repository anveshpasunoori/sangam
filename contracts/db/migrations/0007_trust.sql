-- 0007 Trust and safety: policies, pre-publish screening, reports, enforcement, appeals.
-- Rules (PRD): every enforcement shows the rule and the decider and can be appealed;
-- appeals reach a human; outcome and reasoning are recorded; the author always sees the
-- reason for a screening verdict and a route to human review.

CREATE TABLE trust.policies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL CHECK (code ~ '^[a-z_]+$'),
  version     int NOT NULL CHECK (version >= 1),
  title       text NOT NULL,
  summary     text NOT NULL,
  protected_speech_note text, -- e.g. "criticism of institutions is allowed"
  effective_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code, version)
);

CREATE TYPE trust.target_kind AS ENUM ('post', 'comment', 'message', 'account', 'community', 'civic_case');

-- Pre-publish screening -----------------------------------------------------------
CREATE TYPE trust.screen_verdict AS ENUM ('allow', 'request_revision', 'hold_for_review', 'reject');

CREATE TABLE trust.screenings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_kind   trust.target_kind NOT NULL CHECK (target_kind IN ('post', 'comment', 'civic_case')),
  target_id     uuid NOT NULL,
  author_id     uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  verdict       trust.screen_verdict NOT NULL,
  policy_id     uuid REFERENCES trust.policies,
  reason        text,
  model_version text NOT NULL,
  lang          platform.lang,
  created_at    timestamptz NOT NULL DEFAULT now(),
  -- Nothing is blocked without a reason and a cited policy.
  CHECK (verdict = 'allow' OR (reason IS NOT NULL AND length(reason) > 0 AND policy_id IS NOT NULL))
);
CREATE INDEX screenings_target ON trust.screenings (target_kind, target_id);

-- Reports from members --------------------------------------------------------------
CREATE TYPE trust.report_status AS ENUM ('received', 'in_review', 'actioned', 'no_violation', 'closed');

CREATE TABLE trust.reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  target_kind trust.target_kind NOT NULL,
  target_id   uuid NOT NULL,
  reason_code text NOT NULL CHECK (reason_code IN (
    'threat_or_violence', 'targeted_harassment', 'hateful_conduct', 'sexual_content',
    'impersonation', 'scam_or_spam', 'private_information', 'other')),
  details     text CHECK (length(details) <= 400),
  status      trust.report_status NOT NULL DEFAULT 'received',
  created_at  timestamptz NOT NULL DEFAULT now()
);
-- Reports are confidential: the reported account never sees reporter_id. API never exposes it.
CREATE INDEX reports_target ON trust.reports (target_kind, target_id);
CREATE INDEX reports_reporter ON trust.reports (reporter_id, created_at DESC);

-- Enforcement -----------------------------------------------------------------------
CREATE TYPE trust.decider_kind AS ENUM ('automated', 'human');
CREATE TYPE trust.enforcement_action AS ENUM ('hide', 'remove', 'hold', 'restrict_reach', 'suspend_account', 'restore', 'publish');

CREATE TABLE trust.enforcements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_kind   trust.target_kind NOT NULL,
  target_id     uuid NOT NULL,
  subject_account_id uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  action        trust.enforcement_action NOT NULL,
  policy_id     uuid NOT NULL REFERENCES trust.policies,
  decider_kind  trust.decider_kind NOT NULL,
  decider_staff_id uuid REFERENCES platform.staff,
  model_version text,
  explanation   text NOT NULL CHECK (length(explanation) > 0),
  supersedes_id uuid REFERENCES trust.enforcements,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CHECK ((decider_kind = 'human') = (decider_staff_id IS NOT NULL)),
  CHECK ((decider_kind = 'automated') = (model_version IS NOT NULL)),
  -- AI does not suspend accounts on its own (PRD non-goal).
  CHECK (NOT (decider_kind = 'automated' AND action = 'suspend_account'))
);
CREATE INDEX enforcements_subject ON trust.enforcements (subject_account_id, created_at DESC);
CREATE TRIGGER enforcements_append_only BEFORE UPDATE OR DELETE ON trust.enforcements
  FOR EACH ROW WHEN (pg_trigger_depth() = 0) EXECUTE FUNCTION platform.forbid_mutation();

-- Appeals ---------------------------------------------------------------------------
CREATE TYPE trust.appeal_status AS ENUM ('submitted', 'in_review', 'upheld', 'reversed', 'withdrawn');

CREATE TABLE trust.appeals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enforcement_id uuid NOT NULL REFERENCES trust.enforcements,
  appellant_id   uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  reason         text NOT NULL CHECK (length(reason) BETWEEN 10 AND 500),
  status         trust.appeal_status NOT NULL DEFAULT 'submitted',
  reviewer_id    uuid REFERENCES platform.staff,
  decision_reasoning text,
  decided_at     timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enforcement_id),
  -- A decided appeal names a human reviewer and records reasoning.
  CHECK (status NOT IN ('upheld', 'reversed') OR (reviewer_id IS NOT NULL AND decision_reasoning IS NOT NULL AND decided_at IS NOT NULL))
);

-- The reviewer of an appeal is a human on the Trust team, and not the person who decided the original action.
CREATE FUNCTION trust.check_appeal_reviewer() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE team platform.staff_team; original uuid;
BEGIN
  IF NEW.reviewer_id IS NULL THEN RETURN NEW; END IF;
  SELECT s.team INTO team FROM platform.staff s WHERE s.id = NEW.reviewer_id;
  IF team <> 'trust' THEN
    RAISE EXCEPTION 'appeal reviewer must be on the trust team' USING ERRCODE = 'check_violation';
  END IF;
  SELECT decider_staff_id INTO original FROM trust.enforcements WHERE id = NEW.enforcement_id;
  IF original = NEW.reviewer_id THEN
    RAISE EXCEPTION 'appeal reviewer decided the original action' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER appeals_reviewer BEFORE INSERT OR UPDATE ON trust.appeals
  FOR EACH ROW EXECUTE FUNCTION trust.check_appeal_reviewer();

-- Current state of a target = its latest enforcement.
CREATE VIEW trust.current_enforcement AS
  SELECT DISTINCT ON (target_kind, target_id) *
  FROM trust.enforcements
  ORDER BY target_kind, target_id, created_at DESC, id DESC;
