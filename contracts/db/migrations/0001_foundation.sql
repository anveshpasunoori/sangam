-- 0001 Foundation: schemas per bounded context, shared types, staff, transactional outbox.
-- Target: PostgreSQL 16+. One schema per bounded context (Product Blueprint, Architecture overview).

CREATE EXTENSION IF NOT EXISTS citext;

CREATE SCHEMA identity;
CREATE SCHEMA graph;
CREATE SCHEMA media;
CREATE SCHEMA content;
CREATE SCHEMA feed;
CREATE SCHEMA messaging;
CREATE SCHEMA community;
CREATE SCHEMA trust;
CREATE SCHEMA civic;
CREATE SCHEMA ombudsman;
CREATE SCHEMA platform;

-- Shared types ----------------------------------------------------------------

-- Every post carries an audience; default is Friends (PRD: Audience).
CREATE TYPE content.audience AS ENUM ('public', 'friends', 'close_friends', 'only_me');

-- Twelve launch languages (PRD: Goals), BCP 47 primary tags.
CREATE TYPE platform.lang AS ENUM ('hi', 'te', 'ta', 'kn', 'ml', 'bn', 'mr', 'gu', 'pa', 'or', 'ur', 'en');

-- Generic updated_at maintenance.
CREATE FUNCTION platform.touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- Reject UPDATE and DELETE on append-only logs.
CREATE FUNCTION platform.forbid_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END $$;

-- Staff ----------------------------------------------------------------------
-- Staff identities are separate from member accounts so that access can be isolated
-- per team (Ombudsman access is isolated from Trust staff).
CREATE TYPE platform.staff_team AS ENUM ('trust', 'civic', 'ombudsman', 'support');

CREATE TABLE platform.staff (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL CHECK (length(display_name) BETWEEN 2 AND 80),
  team         platform.staff_team NOT NULL,
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Transactional outbox -----------------------------------------------------------
-- Services write domain events here in the same transaction as the state change;
-- a relay publishes them to durable queues (Kafka only when justified).
-- Payloads must validate against contracts/events/<type>.schema.json.
CREATE TABLE platform.outbox (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id       uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  event_type     text NOT NULL CHECK (event_type ~ '^[a-z]+(\.[a-z_]+)+\.v[0-9]+$'),
  aggregate_type text NOT NULL,
  aggregate_id   text NOT NULL,
  payload        jsonb NOT NULL,
  occurred_at    timestamptz NOT NULL DEFAULT now(),
  published_at   timestamptz
);
CREATE INDEX outbox_unpublished ON platform.outbox (id) WHERE published_at IS NULL;

-- Idempotency keys for POST endpoints (Idempotency-Key header in the OpenAPI spec).
CREATE TABLE platform.idempotency_keys (
  account_id    uuid NOT NULL,
  key           text NOT NULL CHECK (length(key) BETWEEN 8 AND 128),
  request_hash  bytea NOT NULL,
  response_code int,
  response_body jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, key)
);
