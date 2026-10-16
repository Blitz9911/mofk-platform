-- Remove leftover broad grants from earlier mobile bootstrap scripts.
-- RLS remains the source of row ownership; these grants only expose needed REST verbs.

revoke all on table public.users from authenticated;
revoke all on table public.vehicles from authenticated;
revoke all on table public.telemetry from authenticated;
revoke all on table public.subscription_plans from authenticated;

grant select on table public.subscription_plans to authenticated;
grant select, insert, update on table public.users to authenticated;
grant select, insert, update, delete on table public.vehicles to authenticated;
grant select, insert on table public.telemetry to authenticated;
