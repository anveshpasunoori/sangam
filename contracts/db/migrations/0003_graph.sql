-- 0003 Social graph: friends, follows, close friends, blocks, mutes.
-- Strong consistency for blocks (Architecture: Graph context).

-- Friendships are stored once per pair, smaller id first.
CREATE TABLE graph.friendships (
  account_a  uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  account_b  uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_a, account_b),
  CHECK (account_a < account_b)
);
CREATE INDEX friendships_b ON graph.friendships (account_b);

CREATE TYPE graph.request_status AS ENUM ('pending', 'accepted', 'declined', 'cancelled');

CREATE TABLE graph.friend_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_account uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  to_account   uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  status       graph.request_status NOT NULL DEFAULT 'pending',
  created_at   timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CHECK (from_account <> to_account),
  CHECK ((status = 'pending') = (responded_at IS NULL))
);
CREATE UNIQUE INDEX friend_requests_one_pending ON graph.friend_requests (from_account, to_account)
  WHERE status = 'pending';

CREATE TABLE graph.follows (
  follower   uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  followee   uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower, followee),
  CHECK (follower <> followee)
);
CREATE INDEX follows_followee ON graph.follows (followee);

-- Close friends is a private list owned by one account.
CREATE TABLE graph.close_friends (
  owner      uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  member     uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner, member),
  CHECK (owner <> member)
);

CREATE TABLE graph.blocks (
  blocker    uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  blocked    uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker, blocked),
  CHECK (blocker <> blocked)
);
CREATE INDEX blocks_blocked ON graph.blocks (blocked);

-- Mutes are invisible to the muted account.
CREATE TABLE graph.mutes (
  muter      uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  muted      uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (muter, muted),
  CHECK (muter <> muted)
);

CREATE FUNCTION graph.are_friends(a uuid, b uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM graph.friendships WHERE account_a = LEAST(a, b) AND account_b = GREATEST(a, b))
$$;

-- A block in either direction hides both parties from each other.
CREATE FUNCTION graph.is_blocked_either(a uuid, b uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM graph.blocks WHERE (blocker = a AND blocked = b) OR (blocker = b AND blocked = a))
$$;

-- Blocking removes friendship, follows, close-friend entries and pending requests.
CREATE FUNCTION graph.on_block() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM graph.friendships WHERE account_a = LEAST(NEW.blocker, NEW.blocked) AND account_b = GREATEST(NEW.blocker, NEW.blocked);
  DELETE FROM graph.follows WHERE (follower, followee) IN ((NEW.blocker, NEW.blocked), (NEW.blocked, NEW.blocker));
  DELETE FROM graph.close_friends WHERE (owner, member) IN ((NEW.blocker, NEW.blocked), (NEW.blocked, NEW.blocker));
  UPDATE graph.friend_requests SET status = 'cancelled', responded_at = now()
    WHERE status = 'pending' AND ((from_account = NEW.blocker AND to_account = NEW.blocked) OR (from_account = NEW.blocked AND to_account = NEW.blocker));
  RETURN NEW;
END $$;
CREATE TRIGGER blocks_cleanup AFTER INSERT ON graph.blocks FOR EACH ROW EXECUTE FUNCTION graph.on_block();
