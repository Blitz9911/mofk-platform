-- Additive notification-system tables and columns.
-- DO NOT APPLY to UAT or Production without explicit approval.
-- Reuses 20261016_push_notifications.sql (tokens, preferences, deliveries).

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS superseded_at timestamptz;

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS documents_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS device_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS subscriptions_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS quiet_hours_start smallint,
  ADD COLUMN IF NOT EXISTS quiet_hours_end smallint;

CREATE TABLE IF NOT EXISTS notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  event_type varchar(60) NOT NULL,
  source varchar(40) NOT NULL DEFAULT 'system',
  source_id varchar(160),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_events_user
  ON notification_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_events_type
  ON notification_events (event_type, created_at DESC);

CREATE TABLE IF NOT EXISTS notification_rules (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Isolated document-expiration store. Feature is dependent on this table
-- being approved and applied. Do not invent expiration dates without rows.
CREATE TABLE IF NOT EXISTS vehicle_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  kind varchar(30) NOT NULL,
  expires_at date NOT NULL,
  source varchar(30) NOT NULL DEFAULT 'user_entered',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_documents_vehicle_kind
  ON vehicle_documents (vehicle_id, kind);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_user
  ON vehicle_documents (user_id);

ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners read notification_events" ON notification_events;
CREATE POLICY "owners read notification_events"
  ON notification_events
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owners manage notification_rules" ON notification_rules;
CREATE POLICY "owners manage notification_rules"
  ON notification_rules
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owners manage vehicle_documents" ON vehicle_documents;
CREATE POLICY "owners manage vehicle_documents"
  ON vehicle_documents
  FOR ALL
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM vehicles v
      WHERE v.id = vehicle_id AND v.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM vehicles v
      WHERE v.id = vehicle_id AND v.user_id = (SELECT auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.prevent_client_notification_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'clients cannot create or delete notifications'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id
     OR NEW.type IS DISTINCT FROM OLD.type
     OR NEW.severity IS DISTINCT FROM OLD.severity
     OR NEW.title_ar IS DISTINCT FROM OLD.title_ar
     OR NEW.body_ar IS DISTINCT FROM OLD.body_ar
     OR NEW.action_url IS DISTINCT FROM OLD.action_url
     OR NEW.dedupe_key IS DISTINCT FROM OLD.dedupe_key
     OR NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at
     OR NEW.sent_at IS DISTINCT FROM OLD.sent_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.superseded_at IS DISTINCT FROM OLD.superseded_at THEN
    RAISE EXCEPTION 'clients cannot modify sensitive notification fields'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT SELECT ON notification_events TO authenticated;
    GRANT SELECT, INSERT, UPDATE ON notification_rules TO authenticated;
    GRANT SELECT, INSERT, UPDATE ON vehicle_documents TO authenticated;
    REVOKE INSERT, DELETE, TRUNCATE ON notifications FROM authenticated;
    GRANT SELECT ON notifications TO authenticated;
    GRANT UPDATE (is_read, read_at) ON notifications TO authenticated;
  END IF;
END $$;

-- Active-row uniqueness is applied in 20261021_notification_dedupe_unique.sql
-- after collapsing historical duplicates.
