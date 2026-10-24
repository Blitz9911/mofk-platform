-- DO NOT APPLY to UAT or Production without explicit approval.
-- Run AFTER 20261016_push_notifications.sql and 20261021_notification_system.sql
-- (needs notifications.superseded_at).
-- Collapses historical active duplicates, then enforces one active inbox
-- row per (user_id, dedupe_key). Superseded rows remain so a new service
-- cycle can insert a new active reminder.

UPDATE notifications n
SET
  superseded_at = now(),
  is_read = true,
  read_at = COALESCE(n.read_at, now())
FROM (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, dedupe_key
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM notifications
  WHERE dedupe_key IS NOT NULL
    AND superseded_at IS NULL
) ranked
WHERE n.id = ranked.id
  AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_active_dedupe
  ON notifications (user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL AND superseded_at IS NULL;
