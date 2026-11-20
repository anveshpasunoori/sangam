-- 0004 Media and content: assets, posts, revisions, polls, comments, reactions, saves,
-- and the single policy enforcement point for post visibility.

-- Media ----------------------------------------------------------------------------
CREATE TYPE media.asset_kind AS ENUM ('image', 'video', 'audio', 'document');
CREATE TYPE media.asset_status AS ENUM ('uploading', 'scanning', 'processing', 'ready', 'rejected', 'deleted');

CREATE TABLE media.assets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  kind         media.asset_kind NOT NULL,
  status       media.asset_status NOT NULL DEFAULT 'uploading',
  mime_type    text NOT NULL,
  byte_size    bigint NOT NULL CHECK (byte_size > 0),
  sha256       bytea NOT NULL CHECK (length(sha256) = 32),
  storage_key  text NOT NULL UNIQUE,
  width        int CHECK (width > 0),
  height       int CHECK (height > 0),
  duration_ms  int CHECK (duration_ms > 0),
  alt_text     text CHECK (length(alt_text) <= 1000),
  created_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz
);
CREATE INDEX assets_owner ON media.assets (owner_id, created_at DESC);

-- Resumable uploads (PRD: Low bandwidth).
CREATE TABLE media.upload_sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id       uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  declared_size  bigint NOT NULL CHECK (declared_size > 0 AND declared_size <= 2147483648),
  declared_sha256 bytea NOT NULL CHECK (length(declared_sha256) = 32),
  mime_type      text NOT NULL,
  received_bytes bigint NOT NULL DEFAULT 0 CHECK (received_bytes >= 0),
  asset_id       uuid REFERENCES media.assets,
  created_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL DEFAULT now() + interval '24 hours',
  CHECK (received_bytes <= declared_size)
);

-- Content ----------------------------------------------------------------------------
CREATE TYPE content.post_status AS ENUM ('draft', 'held_for_review', 'published', 'removed', 'deleted');

CREATE TABLE content.posts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  audience      content.audience NOT NULL DEFAULT 'friends',
  status        content.post_status NOT NULL DEFAULT 'draft',
  body          text NOT NULL DEFAULT '' CHECK (length(body) <= 5000),
  lang          platform.lang,
  community_id  uuid, -- FK added in 0005
  civic_issue_id uuid, -- FK added in 0008
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  published_at  timestamptz,
  CHECK ((status = 'published') <= (published_at IS NOT NULL))
);
CREATE INDEX posts_author_published ON content.posts (author_id, published_at DESC) WHERE status = 'published';
CREATE INDEX posts_published ON content.posts (published_at DESC) WHERE status = 'published';
CREATE TRIGGER posts_touch BEFORE UPDATE ON content.posts FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

-- Every edit is kept as a revision (append-only).
CREATE TABLE content.post_revisions (
  post_id    uuid NOT NULL REFERENCES content.posts ON DELETE CASCADE,
  revision   int NOT NULL CHECK (revision >= 1),
  body       text NOT NULL,
  audience   content.audience NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, revision)
);
CREATE TRIGGER post_revisions_append_only BEFORE UPDATE OR DELETE ON content.post_revisions
  FOR EACH ROW WHEN (pg_trigger_depth() = 0) EXECUTE FUNCTION platform.forbid_mutation();

CREATE TABLE content.post_media (
  post_id  uuid NOT NULL REFERENCES content.posts ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES media.assets,
  position smallint NOT NULL CHECK (position BETWEEN 0 AND 9),
  PRIMARY KEY (post_id, position),
  UNIQUE (post_id, asset_id)
);

CREATE TABLE content.polls (
  post_id   uuid PRIMARY KEY REFERENCES content.posts ON DELETE CASCADE,
  question  text NOT NULL CHECK (length(question) BETWEEN 1 AND 200),
  closes_at timestamptz
);
CREATE TABLE content.poll_options (
  post_id  uuid NOT NULL REFERENCES content.polls ON DELETE CASCADE,
  position smallint NOT NULL CHECK (position BETWEEN 0 AND 3),
  label    text NOT NULL CHECK (length(label) BETWEEN 1 AND 80),
  PRIMARY KEY (post_id, position)
);
CREATE TABLE content.poll_votes (
  post_id    uuid NOT NULL,
  voter_id   uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  position   smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, voter_id),
  FOREIGN KEY (post_id, position) REFERENCES content.poll_options
);

CREATE TYPE content.comment_status AS ENUM ('visible', 'hidden', 'removed', 'deleted');

CREATE TABLE content.comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES content.posts ON DELETE CASCADE,
  author_id  uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  parent_id  uuid REFERENCES content.comments ON DELETE CASCADE,
  body       text NOT NULL CHECK (length(body) BETWEEN 1 AND 1000),
  status     content.comment_status NOT NULL DEFAULT 'visible',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX comments_post ON content.comments (post_id, created_at);

CREATE TABLE content.reactions (
  post_id    uuid NOT NULL REFERENCES content.posts ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  kind       text NOT NULL DEFAULT 'like' CHECK (kind IN ('like')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, account_id)
);

-- Saved posts are visible only to the saver.
CREATE TABLE content.saves (
  account_id uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  post_id    uuid NOT NULL REFERENCES content.posts ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, post_id)
);

-- Policy enforcement point ----------------------------------------------------------
-- Architecture rule: ONE function decides audience and block visibility for every read
-- path, including cached feeds, search and shares. Feed caches store candidates only and
-- must re-check this at serve time.
CREATE FUNCTION content.can_view(viewer uuid, post_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT CASE
    WHEN p.author_id = viewer THEN p.status IN ('draft', 'held_for_review', 'published')
    WHEN p.status <> 'published' THEN false
    WHEN viewer IS NOT NULL AND graph.is_blocked_either(viewer, p.author_id) THEN false
    WHEN p.audience = 'public' THEN true
    WHEN viewer IS NULL THEN false
    WHEN p.audience = 'friends' THEN graph.are_friends(viewer, p.author_id)
    WHEN p.audience = 'close_friends' THEN EXISTS (
      SELECT 1 FROM graph.close_friends cf WHERE cf.owner = p.author_id AND cf.member = viewer)
    ELSE false
  END
  FROM content.posts p WHERE p.id = post_id
$$;

-- Feed signals (PRD: Controls). Each is reversible.
CREATE TABLE feed.not_interested (
  account_id uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  post_id    uuid NOT NULL REFERENCES content.posts ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, post_id)
);
CREATE TABLE feed.show_less (
  account_id uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  author_id  uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, author_id)
);
