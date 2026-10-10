-- Rollback for 20261010_recommendations_maintenance.sql
-- Does not drop maintenance_logs (may already hold user history).
-- Does not delete recommendation rows.

DROP INDEX IF EXISTS idx_rec_events_rec;
DROP TABLE IF EXISTS recommendation_events;

DROP INDEX IF EXISTS idx_recs_source_key;

ALTER TABLE IF EXISTS recommendations
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS source,
  DROP COLUMN IF EXISTS source_key,
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS service_type,
  DROP COLUMN IF EXISTS linked_maintenance_item_id,
  DROP COLUMN IF EXISTS linked_maintenance_log_id,
  DROP COLUMN IF EXISTS deferred_until,
  DROP COLUMN IF EXISTS resolved_at,
  DROP COLUMN IF EXISTS updated_at,
  DROP COLUMN IF EXISTS metadata;
