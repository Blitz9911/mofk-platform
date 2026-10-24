-- Additive push-notification tables.
-- Do NOT apply to production from this pull request.
-- Does not drop or recreate the existing notifications inbox.

CREATE TABLE IF NOT EXISTS device_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform varchar(20) NOT NULL DEFAULT 'unknown',
  device_label varchar(80),
  disabled_at timestamptz,
  last_error text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_device_push_tokens_user_token
  ON device_push_tokens (user_id, token);
CREATE INDEX IF NOT EXISTS idx_device_push_tokens_user
  ON device_push_tokens (user_id);

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  push_enabled boolean NOT NULL DEFAULT true,
  maintenance_enabled boolean NOT NULL DEFAULT true,
  recommendations_enabled boolean NOT NULL DEFAULT true,
  diagnostics_enabled boolean NOT NULL DEFAULT true,
  unsubscribed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  token_id uuid REFERENCES device_push_tokens(id) ON DELETE SET NULL,
  provider varchar(20) NOT NULL DEFAULT 'expo',
  ticket_id varchar(80),
  status varchar(30) NOT NULL,
  error_message text,
  attempt integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notification_deliveries
  ADD COLUMN IF NOT EXISTS receipt_status varchar(30),
  ADD COLUMN IF NOT EXISTS receipt_error text,
  ADD COLUMN IF NOT EXISTS receipt_checked_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_notification
  ON notification_deliveries (notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_status
  ON notification_deliveries (status, created_at DESC);

-- Do not add a unique (user_id, dedupe_key) until UAT is checked for
-- duplicate inbox rows from the older local generator. App-level dedupe remains.

ALTER TABLE device_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;

-- Token writes are server-mediated; clients can only read their own registrations.
DROP POLICY IF EXISTS "owners manage device_push_tokens" ON device_push_tokens;
DROP POLICY IF EXISTS "owners read device_push_tokens" ON device_push_tokens;
CREATE POLICY "owners read device_push_tokens"
  ON device_push_tokens
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owners manage notification_preferences" ON notification_preferences;
CREATE POLICY "owners manage notification_preferences"
  ON notification_preferences
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owners read notification_deliveries" ON notification_deliveries;
CREATE POLICY "owners read notification_deliveries"
  ON notification_deliveries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.id = notification_id AND n.user_id = (SELECT auth.uid())
    )
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON device_push_tokens FROM anon, authenticated;
    GRANT SELECT ON device_push_tokens TO authenticated;
    GRANT SELECT, INSERT, UPDATE ON notification_preferences TO authenticated;
    GRANT SELECT ON notification_deliveries TO authenticated;
  END IF;
END $$;
