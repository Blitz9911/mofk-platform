-- Rollback for 20261015_vehicle_health_intelligence.sql
-- Does not drop maintenance_logs, recommendations, or vehicles.

DROP TABLE IF EXISTS maintenance_log_items;
DROP TABLE IF EXISTS maintenance_attachments;
DROP TABLE IF EXISTS maintenance_rules;
DROP TABLE IF EXISTS maintenance_approval_requests;
DROP TABLE IF EXISTS odometer_readings;
-- notifications may pre-exist from the mobile bridge; only drop if unused in your environment.
-- DROP TABLE IF EXISTS notifications;
