-- Unify completed maintenance history around public.maintenance_logs.
-- Safe to run more than once. Keeps legacy cost_sar for compatibility and adds actual_cost_sar.

create table if not exists public.maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  service_type varchar(50) not null,
  custom_service_name varchar(120),
  done_at timestamptz not null,
  done_at_km integer,
  actual_cost_sar integer,
  cost_sar integer,
  notes text,
  source varchar(30) not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.maintenance_logs
  add column if not exists custom_service_name varchar(120),
  add column if not exists done_at_km integer,
  add column if not exists actual_cost_sar integer,
  add column if not exists cost_sar integer,
  add column if not exists notes text,
  add column if not exists source varchar(30) not null default 'manual',
  add column if not exists updated_at timestamptz not null default now();

update public.maintenance_logs
set actual_cost_sar = cost_sar
where actual_cost_sar is null and cost_sar is not null;

update public.maintenance_logs
set cost_sar = actual_cost_sar
where cost_sar is null and actual_cost_sar is not null;

create index if not exists idx_maintenance_logs_user_done
  on public.maintenance_logs(user_id, done_at desc);

create index if not exists idx_maintenance_logs_vehicle_done
  on public.maintenance_logs(vehicle_id, done_at desc);

alter table public.maintenance_logs enable row level security;

grant select, insert, update, delete on table public.maintenance_logs to authenticated;

drop policy if exists "Users can read own maintenance logs" on public.maintenance_logs;
create policy "Users can read own maintenance logs"
on public.maintenance_logs
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own maintenance logs" on public.maintenance_logs;
create policy "Users can insert own maintenance logs"
on public.maintenance_logs
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.vehicles v
    where v.id = maintenance_logs.vehicle_id
      and v.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can update own maintenance logs" on public.maintenance_logs;
create policy "Users can update own maintenance logs"
on public.maintenance_logs
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.vehicles v
    where v.id = maintenance_logs.vehicle_id
      and v.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can delete own maintenance logs" on public.maintenance_logs;
create policy "Users can delete own maintenance logs"
on public.maintenance_logs
for delete
to authenticated
using ((select auth.uid()) = user_id);
