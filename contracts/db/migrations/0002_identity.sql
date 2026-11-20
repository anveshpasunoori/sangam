-- 0002 Identity: accounts, passkeys, sessions, devices, verification, privacy.
-- Non-goals honoured: no mandatory legal name, no Aadhaar column anywhere.

CREATE TYPE identity.account_status AS ENUM ('active', 'suspended', 'deactivated', 'deleted');

CREATE TABLE identity.accounts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handle        citext NOT NULL UNIQUE CHECK (handle ~ '^[a-z0-9._]{3,30}$'),
  display_name  text NOT NULL CHECK (length(display_name) BETWEEN 2 AND 40),
  bio           text NOT NULL DEFAULT '' CHECK (length(bio) <= 160),
  ui_lang       platform.lang NOT NULL DEFAULT 'en',
  status        identity.account_status NOT NULL DEFAULT 'active',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz,
  CHECK ((status = 'deleted') = (deleted_at IS NOT NULL))
);
CREATE TRIGGER accounts_touch BEFORE UPDATE ON identity.accounts
  FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

-- WebAuthn passkeys are the primary sign-in method.
CREATE TABLE identity.passkeys (
  credential_id bytea PRIMARY KEY,
  account_id    uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  public_key    bytea NOT NULL,
  sign_count    bigint NOT NULL DEFAULT 0 CHECK (sign_count >= 0),
  transports    text[] NOT NULL DEFAULT '{}',
  nickname      text CHECK (length(nickname) <= 40),
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz
);
CREATE INDEX passkeys_account ON identity.passkeys (account_id);

CREATE TABLE identity.devices (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  platform    text NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  push_token  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz
);

-- Sessions store only a hash of the opaque token.
CREATE TABLE identity.sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  device_id   uuid REFERENCES identity.devices ON DELETE SET NULL,
  token_hash  bytea NOT NULL UNIQUE CHECK (length(token_hash) = 32),
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  CHECK (expires_at > created_at)
);
CREATE INDEX sessions_account ON identity.sessions (account_id) WHERE revoked_at IS NULL;

-- Verification is optional and per purpose. Which actions require it is open decision 4.
CREATE TYPE identity.verification_kind AS ENUM ('public_figure', 'organisation', 'creator', 'payments');
CREATE TYPE identity.verification_status AS ENUM ('pending', 'approved', 'rejected', 'revoked');

CREATE TABLE identity.verifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  kind        identity.verification_kind NOT NULL,
  status      identity.verification_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES platform.staff,
  reviewed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'pending') = (reviewed_at IS NULL))
);
CREATE UNIQUE INDEX verifications_one_active ON identity.verifications (account_id, kind)
  WHERE status IN ('pending', 'approved');

CREATE VIEW identity.verified_accounts AS
  SELECT DISTINCT account_id FROM identity.verifications
  WHERE status = 'approved' AND kind IN ('public_figure', 'organisation', 'creator');

-- Privacy by default (PRD): Friends audience, messages from friends, local discovery off.
CREATE TABLE identity.privacy_settings (
  account_id           uuid PRIMARY KEY REFERENCES identity.accounts ON DELETE CASCADE,
  default_audience     content.audience NOT NULL DEFAULT 'friends',
  who_can_message      text NOT NULL DEFAULT 'friends' CHECK (who_can_message IN ('everyone', 'friends')),
  local_discovery      boolean NOT NULL DEFAULT false,
  personalised_ranking boolean NOT NULL DEFAULT true,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION identity.create_privacy_defaults() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO identity.privacy_settings (account_id) VALUES (NEW.id);
  RETURN NEW;
END $$;
CREATE TRIGGER accounts_privacy_defaults AFTER INSERT ON identity.accounts
  FOR EACH ROW EXECUTE FUNCTION identity.create_privacy_defaults();
