-- Smart recommendations upgrade for Mofk.
-- Run in Supabase SQL editor after reviewing the target project.

alter table public.recommendations
  add column if not exists user_id uuid references public.users(id) on delete cascade,
  add column if not exists category varchar(30),
  add column if not exists priority varchar(12),
  add column if not exists status varchar(16) not null default 'active',
  add column if not exists source varchar(40),
  add column if not exists source_reference_id varchar(80),
  add column if not exists rule_code varchar(80),
  add column if not exists dedupe_key varchar(220),
  add column if not exists summary_ar text,
  add column if not exists reason_ar text,
  add column if not exists recommended_action_ar text,
  add column if not exists due_date timestamptz,
  add column if not exists due_mileage integer,
  add column if not exists dismissed_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

update public.recommendations r
set user_id = v.user_id
from public.vehicles v
where r.vehicle_id = v.id
  and r.user_id is null;

update public.recommendations
set
  category = coalesce(category, kind),
  priority = coalesce(priority, severity),
  summary_ar = coalesce(summary_ar, description_ar),
  reason_ar = coalesce(reason_ar, description_ar),
  recommended_action_ar = coalesce(recommended_action_ar, suggested_action),
  source = coalesce(source, 'system_rule'),
  rule_code = coalesce(rule_code, 'LEGACY_RECOMMENDATION'),
  dedupe_key = coalesce(dedupe_key, vehicle_id::text || ':' || coalesce(rule_code, 'LEGACY_RECOMMENDATION') || ':' || id::text);

create unique index if not exists idx_recs_dedupe_key on public.recommendations(dedupe_key);
create index if not exists idx_recs_user_status on public.recommendations(user_id, status);
create index if not exists idx_recs_vehicle_status on public.recommendations(vehicle_id, status);

alter table public.recommendations enable row level security;

grant select, insert, update on table public.recommendations to authenticated;

drop policy if exists "Users can read own recommendations" on public.recommendations;
create policy "Users can read own recommendations"
on public.recommendations
for select
to authenticated
using (
  exists (
    select 1
    from public.vehicles v
    where v.id = recommendations.vehicle_id
      and v.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can update own recommendation status" on public.recommendations;
create policy "Users can update own recommendation status"
on public.recommendations
for update
to authenticated
using (
  exists (
    select 1
    from public.vehicles v
    where v.id = recommendations.vehicle_id
      and v.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.vehicles v
    where v.id = recommendations.vehicle_id
      and v.user_id = (select auth.uid())
  )
);
