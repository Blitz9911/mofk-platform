-- Additive Vehicle Health Intelligence tables.
-- Do NOT apply to production from this pull request.
-- Reuses maintenance_logs as the historical record (no duplicate maintenance_records table).

CREATE TABLE IF NOT EXISTS maintenance_log_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id uuid NOT NULL,
  kind varchar(20) NOT NULL DEFAULT 'part',
  name_ar varchar(120) NOT NULL,
  brand varchar(80),
  quantity integer NOT NULL DEFAULT 1,
  unit_cost_sar integer,
  oil_type varchar(40),
  oil_viscosity varchar(20)
);

CREATE INDEX IF NOT EXISTS idx_maint_log_items_log ON maintenance_log_items (log_id);

CREATE TABLE IF NOT EXISTS maintenance_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id uuid NOT NULL,
  user_id uuid NOT NULL,
  vehicle_id uuid NOT NULL,
  storage_path text NOT NULL,
  mime_type varchar(80),
  kind varchar(20) NOT NULL DEFAULT 'invoice',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maint_attachments_log ON maintenance_attachments (log_id);
CREATE INDEX IF NOT EXISTS idx_maint_attachments_user ON maintenance_attachments (user_id);

CREATE TABLE IF NOT EXISTS maintenance_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid,
  make varchar(50),
  model varchar(80),
  year integer,
  engine varchar(40),
  service_type varchar(50) NOT NULL,
  interval_km integer,
  interval_days integer,
  soon_km integer,
  soon_days integer,
  estimated_cost integer,
  rule_source varchar(30) NOT NULL DEFAULT 'user_configured',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maint_rules_vehicle ON maintenance_rules (vehicle_id, service_type);

CREATE TABLE IF NOT EXISTS maintenance_approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL,
  user_id uuid NOT NULL,
  kind varchar(30) NOT NULL DEFAULT 'dtc_cleared',
  status varchar(20) NOT NULL DEFAULT 'pending',
  title_ar varchar(200) NOT NULL,
  body_ar text NOT NULL,
  dtc_code varchar(8),
  reminder_at timestamptz,
  resolved_log_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maint_approvals_vehicle ON maintenance_approval_requests (vehicle_id, status);

CREATE TABLE IF NOT EXISTS odometer_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL,
  user_id uuid NOT NULL,
  km integer NOT NULL,
  source varchar(30) NOT NULL DEFAULT 'manual',
  estimated boolean NOT NULL DEFAULT false,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_odometer_vehicle ON odometer_readings (vehicle_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  vehicle_id uuid,
  type varchar(40) NOT NULL,
  severity varchar(10) NOT NULL DEFAULT 'info',
  title_ar varchar(200) NOT NULL,
  body_ar text,
  action_url varchar(200),
  dedupe_key varchar(160),
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_dedupe ON notifications (user_id, dedupe_key);

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
