-- 0005 Communities and events: groups, membership and roles, rules, events, RSVPs.

CREATE TYPE community.privacy AS ENUM ('public', 'private');
CREATE TYPE community.role AS ENUM ('owner', 'admin', 'moderator', 'member');
CREATE TYPE community.membership_status AS ENUM ('requested', 'active', 'banned');

CREATE TABLE community.communities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        citext NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{3,60}$'),
  name        text NOT NULL CHECK (length(name) BETWEEN 3 AND 80),
  description text NOT NULL DEFAULT '' CHECK (length(description) <= 500),
  privacy     community.privacy NOT NULL DEFAULT 'public',
  created_by  uuid NOT NULL REFERENCES identity.accounts,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE community.members (
  community_id uuid NOT NULL REFERENCES community.communities ON DELETE CASCADE,
  account_id   uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  role         community.role NOT NULL DEFAULT 'member',
  status       community.membership_status NOT NULL,
  approved_by  uuid REFERENCES identity.accounts,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (community_id, account_id),
  -- Admin approval for private communities: only active members hold elevated roles.
  CHECK (role = 'member' OR status = 'active')
);
CREATE INDEX members_account ON community.members (account_id) WHERE status = 'active';

-- Private communities never auto-approve: a join must start as 'requested'.
CREATE FUNCTION community.enforce_join() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p community.privacy;
BEGIN
  SELECT privacy INTO p FROM community.communities WHERE id = NEW.community_id;
  IF p = 'private' AND NEW.status = 'active' AND NEW.role = 'member' AND NEW.approved_by IS NULL THEN
    RAISE EXCEPTION 'private community membership needs admin approval' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER members_enforce_join BEFORE INSERT OR UPDATE ON community.members
  FOR EACH ROW EXECUTE FUNCTION community.enforce_join();

CREATE TABLE community.rules (
  community_id uuid NOT NULL REFERENCES community.communities ON DELETE CASCADE,
  position     smallint NOT NULL CHECK (position BETWEEN 0 AND 19),
  text         text NOT NULL CHECK (length(text) BETWEEN 3 AND 300),
  PRIMARY KEY (community_id, position)
);

CREATE TABLE community.events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES community.communities ON DELETE CASCADE,
  title        text NOT NULL CHECK (length(title) BETWEEN 3 AND 120),
  description  text NOT NULL DEFAULT '',
  place        text NOT NULL CHECK (length(place) BETWEEN 2 AND 200),
  starts_at    timestamptz NOT NULL,
  ends_at      timestamptz,
  created_by   uuid NOT NULL REFERENCES identity.accounts,
  cancelled_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);
CREATE INDEX events_upcoming ON community.events (community_id, starts_at) WHERE cancelled_at IS NULL;

CREATE TABLE community.rsvps (
  event_id   uuid NOT NULL REFERENCES community.events ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  response   text NOT NULL CHECK (response IN ('going', 'interested')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, account_id)
);

ALTER TABLE content.posts
  ADD CONSTRAINT posts_community_fk FOREIGN KEY (community_id) REFERENCES community.communities ON DELETE SET NULL;
