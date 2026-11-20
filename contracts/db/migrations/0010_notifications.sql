-- 0010 Notifications.

CREATE TYPE platform.notification_kind AS ENUM (
  'civic_review_needed', 'civic_update', 'moderation_decision', 'appeal_decided', 'ombudsman_update',
  'community_event', 'message_request', 'friend_request', 'mention', 'comment', 'reaction');

CREATE TABLE platform.notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   uuid NOT NULL REFERENCES identity.accounts ON DELETE CASCADE,
  kind         platform.notification_kind NOT NULL,
  subject_kind text NOT NULL,
  subject_id   uuid NOT NULL,
  -- Rendered text is localised at read time; only parameters are stored.
  params       jsonb NOT NULL DEFAULT '{}',
  read_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_unread ON platform.notifications (account_id, created_at DESC) WHERE read_at IS NULL;
