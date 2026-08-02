-- Rollback for Mofk OBD-II installation guides - Phase 1.
-- Review before running. This removes only objects introduced by the phase 1 proposal.
-- Warning: dropping vehicle_model_id, vehicle_generation_id, and market removes
-- any OBD guide linking values saved on existing vehicles after this feature is used.
-- This rollback intentionally does not drop public.current_user_is_admin(),
-- public.set_updated_at(), or any other shared pre-existing object.

begin;

drop function if exists public.get_obd_installation_guide_for_vehicle(uuid);
drop function if exists public.match_vehicle_generation(text, text, integer, text);

drop table if exists public.obd_guide_feedback;
drop table if exists public.obd_installation_steps;
drop table if exists public.obd_installation_guides;

alter table if exists public.vehicles
  drop column if exists vehicle_generation_id,
  drop column if exists vehicle_model_id,
  drop column if exists market;

drop table if exists public.vehicle_generations;
drop table if exists public.vehicle_model_aliases;
drop table if exists public.vehicle_models;
drop table if exists public.vehicle_makes;

drop function if exists public.normalize_vehicle_name(text);
drop function if exists public.obd_guides_set_updated_at();

commit;
