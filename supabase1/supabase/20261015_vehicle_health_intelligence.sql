-- Additive Vehicle Health Intelligence tables.
-- Do NOT apply to production from this pull request.
-- Reuses maintenance_logs as the historical record.
-- Does not drop or recreate a pre-existing notifications table.

ALTER TABLE IF EXISTS maintenance_logs
  ADD COLUMN IF NOT EXISTS idempotency_key varchar(200);

CREATE UNIQUE INDEX IF NOT EXISTS idx_maint_logs_idempotency
  ON maintenance_logs (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS maintenance_log_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id uuid NOT NULL REFERENCES maintenance_logs(id) ON DELETE CASCADE,
  kind varchar(20) NOT NULL DEFAULT 'part',
  name_ar varchar(120) NOT NULL,
  brand varchar(80),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_cost_sar integer CHECK (unit_cost_sar IS NULL OR unit_cost_sar >= 0),
  oil_type varchar(40),
  oil_viscosity varchar(20)
);

CREATE INDEX IF NOT EXISTS idx_maint_log_items_log ON maintenance_log_items (log_id);

CREATE TABLE IF NOT EXISTS maintenance_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id uuid NOT NULL REFERENCES maintenance_logs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  mime_type varchar(80),
  kind varchar(20) NOT NULL DEFAULT 'invoice',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maint_attachments_log ON maintenance_attachments (log_id);
CREATE INDEX IF NOT EXISTS idx_maint_attachments_user ON maintenance_attachments (user_id);

CREATE TABLE IF NOT EXISTS maintenance_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
  make varchar(50),
  model varchar(80),
  year integer,
  engine varchar(40),
  service_type varchar(50) NOT NULL,
  interval_km integer CHECK (interval_km IS NULL OR interval_km > 0),
  interval_days integer CHECK (interval_days IS NULL OR interval_days > 0),
  soon_km integer,
  soon_days integer,
  estimated_cost integer,
  rule_source varchar(30) NOT NULL DEFAULT 'user_configured',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (vehicle_id IS NOT NULL OR make IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_maint_rules_vehicle_service
  ON maintenance_rules (vehicle_id, service_type)
  WHERE vehicle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_maint_rules_catalog
  ON maintenance_rules (make, model, year, service_type);

CREATE TABLE IF NOT EXISTS maintenance_approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind varchar(30) NOT NULL DEFAULT 'dtc_cleared',
  status varchar(20) NOT NULL DEFAULT 'pending',
  title_ar varchar(200) NOT NULL,
  body_ar text NOT NULL,
  dtc_code varchar(8),
  reminder_at timestamptz,
  resolved_log_id uuid REFERENCES maintenance_logs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maint_approvals_vehicle ON maintenance_approval_requests (vehicle_id, status);

CREATE TABLE IF NOT EXISTS odometer_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  km integer NOT NULL CHECK (km >= 0 AND km <= 2000000),
  source varchar(30) NOT NULL DEFAULT 'manual',
  estimated boolean NOT NULL DEFAULT false,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_odometer_vehicle ON odometer_readings (vehicle_id, recorded_at DESC);

-- Compatible additive columns only. Never recreate notifications.
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
  type varchar(40) NOT NULL,
  severity varchar(10) NOT NULL DEFAULT 'info',
  title_ar varchar(200) NOT NULL,
  body_ar text,
  action_url varchar(200),
  dedupe_key varchar(160),
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS notifications
  ADD COLUMN IF NOT EXISTS vehicle_id uuid,
  ADD COLUMN IF NOT EXISTS type varchar(40),
  ADD COLUMN IF NOT EXISTS severity varchar(10) DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS title_ar varchar(200),
  ADD COLUMN IF NOT EXISTS body_ar text,
  ADD COLUMN IF NOT EXISTS action_url varchar(200),
  ADD COLUMN IF NOT EXISTS dedupe_key varchar(160),
  ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_dedupe ON notifications (user_id, dedupe_key);

ALTER TABLE IF EXISTS maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_log_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE odometer_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners manage maintenance_logs" ON maintenance_logs;
CREATE POLICY "owners manage maintenance_logs"
  ON maintenance_logs
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM vehicles v
      WHERE v.id = vehicle_id AND v.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "owners manage maintenance_log_items" ON maintenance_log_items;
CREATE POLICY "owners manage maintenance_log_items"
  ON maintenance_log_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM maintenance_logs l
      JOIN vehicles v ON v.id = l.vehicle_id
      WHERE l.id = log_id AND v.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM maintenance_logs l
      JOIN vehicles v ON v.id = l.vehicle_id
      WHERE l.id = log_id AND v.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "owners manage maintenance_attachments" ON maintenance_attachments;
CREATE POLICY "owners manage maintenance_attachments"
  ON maintenance_attachments
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

DROP POLICY IF EXISTS "owners manage maintenance_rules" ON maintenance_rules;
DROP POLICY IF EXISTS "owners read maintenance_rules" ON maintenance_rules;
DROP POLICY IF EXISTS "owners write own maintenance_rules" ON maintenance_rules;
CREATE POLICY "owners read maintenance_rules"
  ON maintenance_rules
  FOR SELECT
  TO authenticated
  USING (
    vehicle_id IS NULL
    OR EXISTS (
      SELECT 1 FROM vehicles v
      WHERE v.id = vehicle_id AND v.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "owners write own maintenance_rules"
  ON maintenance_rules
  FOR ALL
  TO authenticated
  USING (
    vehicle_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM vehicles v
      WHERE v.id = vehicle_id AND v.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    vehicle_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM vehicles v
      WHERE v.id = vehicle_id AND v.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "owners manage maintenance_approval_requests" ON maintenance_approval_requests;
CREATE POLICY "owners manage maintenance_approval_requests"
  ON maintenance_approval_requests
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM vehicles v
      WHERE v.id = vehicle_id AND v.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "owners manage odometer_readings" ON odometer_readings;
CREATE POLICY "owners manage odometer_readings"
  ON odometer_readings
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM vehicles v
      WHERE v.id = vehicle_id AND v.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "owners manage notifications" ON notifications;
CREATE POLICY "owners manage notifications"
  ON notifications
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (
      vehicle_id IS NULL
      OR EXISTS (
        SELECT 1 FROM vehicles v
        WHERE v.id = vehicle_id AND v.user_id = (SELECT auth.uid())
      )
    )
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT SELECT, INSERT, UPDATE ON maintenance_log_items TO authenticated;
    GRANT SELECT, INSERT ON maintenance_attachments TO authenticated;
    GRANT SELECT, INSERT, UPDATE ON maintenance_rules TO authenticated;
    GRANT SELECT, INSERT, UPDATE ON maintenance_approval_requests TO authenticated;
    GRANT SELECT, INSERT ON odometer_readings TO authenticated;
    GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;
  END IF;
END $$;
