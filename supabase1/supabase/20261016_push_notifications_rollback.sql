-- Rollback for UAT only. Do NOT run on production.
-- Restores pre-push schema. Does not drop the existing notifications inbox.

DROP TABLE IF EXISTS notification_deliveries;
DROP TABLE IF EXISTS notification_preferences;
DROP TABLE IF EXISTS device_push_tokens;
