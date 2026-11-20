-- 0006 Messaging: conversations, participants, per-conversation ordered messages,
-- receipts and message requests.
--
-- Open decision 5 (end-to-end encryption) is not settled. The schema supports both:
-- a message carries either plaintext `body` or an opaque `ciphertext`, never both.
-- Private messages are not training data by default: no export path reads this schema
-- unless a participant has opted in (not modelled until that decision is made).

CREATE TYPE messaging.conversation_kind AS ENUM ('direct', 'group');

CREATE TABLE messaging.conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        messaging.conversation_kind NOT NULL,
  title       text CHECK (length(title) <= 80),
  last_seq    bigint NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (kind = 'group' OR title IS NULL)
);

CREATE TABLE messaging.participants (
  conversation_id uuid NOT NULL REFERENCES messaging.conversations ON DELETE CASCADE,
  account_id      uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  joined_at       timestamptz NOT NULL DEFAULT now(),
  left_at         timestamptz,
  last_read_seq   bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (conversation_id, account_id)
);
CREATE INDEX participants_account ON messaging.participants (account_id) WHERE left_at IS NULL;

CREATE TABLE messaging.messages (
  conversation_id uuid NOT NULL REFERENCES messaging.conversations ON DELETE CASCADE,
  seq             bigint NOT NULL CHECK (seq >= 1),
  id              uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  sender_id       uuid NOT NULL REFERENCES identity.accounts,
  client_msg_id   uuid NOT NULL,
  body            text CHECK (length(body) BETWEEN 1 AND 4000),
  ciphertext      bytea,
  asset_id        uuid REFERENCES media.assets,
  created_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  PRIMARY KEY (conversation_id, seq),
  UNIQUE (sender_id, client_msg_id),
  CHECK (num_nonnulls(body, ciphertext) = 1 OR (deleted_at IS NOT NULL AND body IS NULL AND ciphertext IS NULL))
);

-- Per-conversation ordering: seq is assigned from the conversation row under a lock.
CREATE FUNCTION messaging.assign_seq() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE messaging.conversations SET last_seq = last_seq + 1
    WHERE id = NEW.conversation_id RETURNING last_seq INTO NEW.seq;
  IF NOT EXISTS (SELECT 1 FROM messaging.participants
                 WHERE conversation_id = NEW.conversation_id AND account_id = NEW.sender_id AND left_at IS NULL) THEN
    RAISE EXCEPTION 'sender is not a participant' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER messages_seq BEFORE INSERT ON messaging.messages FOR EACH ROW EXECUTE FUNCTION messaging.assign_seq();

-- Requests from people who are not connected. The sender cannot see whether it was read.
CREATE TYPE messaging.request_status AS ENUM ('pending', 'accepted', 'deleted', 'blocked');

CREATE TABLE messaging.message_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_account uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  to_account   uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  first_text   text NOT NULL CHECK (length(first_text) BETWEEN 1 AND 1000),
  status       messaging.request_status NOT NULL DEFAULT 'pending',
  conversation_id uuid REFERENCES messaging.conversations,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (from_account <> to_account),
  CHECK ((status = 'accepted') = (conversation_id IS NOT NULL))
);
CREATE UNIQUE INDEX message_requests_one_pending ON messaging.message_requests (from_account, to_account)
  WHERE status = 'pending';
