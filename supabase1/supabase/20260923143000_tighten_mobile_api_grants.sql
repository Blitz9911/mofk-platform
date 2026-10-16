-- Tighten mobile REST access while keeping the same RLS ownership model.
-- Sensitive user-owned tables must be reachable only with an authenticated JWT.

revoke all on table public.users from anon;
revoke all on table public.vehicles from anon;
revoke all on table public.telemetry from anon;

revoke insert, update, delete, truncate, references, trigger on table public.subscription_plans from anon;
revoke insert, update, delete, truncate, references, trigger on table public.subscription_plans from authenticated;

grant select on table public.subscription_plans to anon, authenticated;
grant select, insert, update on table public.users to authenticated;
grant select, insert, update, delete on table public.vehicles to authenticated;
grant select, insert on table public.telemetry to authenticated;

drop policy if exists "Users can insert own profile" on public.users;
drop policy if exists "Users can read own profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Users can manage own vehicles" on public.vehicles;

create policy "Users can insert own profile"
  on public.users
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "Users can read own profile"
  on public.users
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update own profile"
  on public.users
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Users can manage own vehicles"
  on public.vehicles
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
