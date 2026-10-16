-- Rollback for 20261010_mfk_device_binding.sql only. Does not touch vehicles or subscriptions.

drop function if exists public.mfk_complete_vehicle_transfer(uuid);
drop function if exists public.mfk_request_vehicle_transfer(uuid, uuid);
drop function if exists public.mfk_record_verification(uuid, uuid, text, text);
drop function if exists public.mfk_bind_device_vehicle(uuid, uuid, jsonb);
drop function if exists public.mfk_register_device(text, text, text, text);
drop function if exists public.mfk_audit(text, uuid, jsonb);
drop function if exists public.mfk_vin_hmac(text);

drop table if exists public.mfk_binding_audit_logs;
drop table if exists public.mfk_device_transfer_requests;
drop table if exists public.mfk_binding_verifications;
drop table if exists public.mfk_vehicle_fingerprints;
drop table if exists public.mfk_device_bindings;
drop table if exists public.mfk_devices;
