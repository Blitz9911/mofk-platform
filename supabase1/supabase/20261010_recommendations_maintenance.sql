-- Additive recommendations + maintenance integration.
-- Do NOT apply to production from this pull request.
-- Safe to re-run: IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.

ALTER TABLE IF EXISTS recommendations
  ALTER COLUMN suggested_action TYPE varchar(200);

ALTER TABLE IF EXISTS recommendations
  ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS source varchar(40),
  ADD COLUMN IF NOT EXISTS source_key varchar(80),
  ADD COLUMN IF NOT EXISTS category varchar(20),
  ADD COLUMN IF NOT EXISTS service_type varchar(50),
  ADD COLUMN IF NOT EXISTS linked_maintenance_item_id uuid,
  ADD COLUMN IF NOT EXISTS linked_maintenance_log_id uuid,
  ADD COLUMN IF NOT EXISTS deferred_until timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE recommendations
SET status = COALESCE(NULLIF(status, ''), 'active')
WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_recs_source_key
  ON recommendations (vehicle_id, source_key);

CREATE TABLE IF NOT EXISTS maintenance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL,
  user_id uuid NOT NULL,
  service_type varchar(50) NOT NULL,
  service_type_ar varchar(100),
  custom_service_name varchar(120),
  done_at timestamptz NOT NULL,
  done_at_km integer,
  actual_cost_sar integer,
  cost_sar integer,
  notes text,
  source varchar(30) NOT NULL DEFAULT 'manual',
  recommendation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE maintenance_logs
  ADD COLUMN IF NOT EXISTS recommendation_id uuid,
  ADD COLUMN IF NOT EXISTS service_type_ar varchar(100),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_maint_logs_vehicle
  ON maintenance_logs (vehicle_id, done_at DESC);
CREATE INDEX IF NOT EXISTS idx_maint_logs_user
  ON maintenance_logs (user_id, done_at DESC);

CREATE TABLE IF NOT EXISTS recommendation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id uuid NOT NULL,
  vehicle_id uuid NOT NULL,
  action varchar(40) NOT NULL,
  from_status varchar(20),
  to_status varchar(20),
  note text,
  maintenance_log_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rec_events_rec
  ON recommendation_events (recommendation_id, created_at DESC);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT SELECT, INSERT, UPDATE ON recommendations TO authenticated;
    GRANT SELECT, INSERT, UPDATE ON maintenance_logs TO authenticated;
    GRANT SELECT, INSERT ON recommendation_events TO authenticated;
  END IF;
END $$;
