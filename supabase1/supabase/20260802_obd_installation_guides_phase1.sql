-- Mofk OBD-II installation guides - Phase 1
-- Safe proposal only: review before running in Supabase production.

begin;

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public;

create or replace function public.normalize_vehicle_name(value text)
returns text
language sql
immutable
parallel safe
set search_path = public, pg_temp
as $$
  select regexp_replace(
    replace(
      replace(
        replace(
          replace(
            replace(
              replace(lower(coalesce(value, '')), 'أ', 'ا'),
              'إ', 'ا'
            ),
            'آ', 'ا'
          ),
          'ٱ', 'ا'
        ),
        'ى', 'ي'
      ),
      'ة', 'ه'
    ),
    '[^0-9a-zء-ي]+',
    '',
    'g'
  );
$$;

revoke all on function public.normalize_vehicle_name(text) from public;
grant execute on function public.normalize_vehicle_name(text) to authenticated;
revoke execute on function public.normalize_vehicle_name(text) from anon;

create table if not exists public.vehicle_makes (
  id uuid primary key default gen_random_uuid(),
  name_en varchar(80) not null,
  name_ar varchar(80) not null,
  slug varchar(80) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicle_makes_slug_unique unique (slug)
);

create table if not exists public.vehicle_models (
  id uuid primary key default gen_random_uuid(),
  make_id uuid not null references public.vehicle_makes(id) on delete cascade,
  name_en varchar(100) not null,
  name_ar varchar(100) not null,
  slug varchar(100) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicle_models_make_slug_unique unique (make_id, slug)
);

create table if not exists public.vehicle_model_aliases (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.vehicle_models(id) on delete cascade,
  alias varchar(120) not null,
  normalized_alias varchar(120) not null,
  language varchar(12) not null default 'ar',
  created_at timestamptz not null default now(),
  constraint vehicle_model_aliases_model_normalized_language_unique unique (model_id, normalized_alias, language)
);

create table if not exists public.vehicle_generations (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.vehicle_models(id) on delete cascade,
  generation_code varchar(60) not null,
  generation_name varchar(120),
  year_from integer not null,
  year_to integer not null,
  market varchar(20) not null default 'GCC',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicle_generations_year_range_check check (year_from <= year_to),
  constraint vehicle_generations_model_code_market_unique unique (model_id, generation_code, market)
);

create table if not exists public.obd_installation_guides (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.vehicle_generations(id) on delete cascade,
  title_ar varchar(180) not null,
  title_en varchar(180),
  short_description_ar text,
  port_location_code varchar(80),
  port_location_ar text,
  access_difficulty varchar(20) not null default 'unknown',
  port_orientation varchar(40),
  has_cover boolean,
  warning_ar text,
  verification_status varchar(24) not null default 'preliminary',
  source_type varchar(40) not null default 'internal_seed',
  source_reference text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_by uuid references public.users(id) on delete set null,
  constraint obd_installation_guides_generation_unique unique (generation_id),
  constraint obd_installation_guides_access_difficulty_check check (access_difficulty in ('unknown', 'easy', 'medium', 'hard')),
  constraint obd_installation_guides_verification_status_check check (verification_status in ('preliminary', 'verified', 'field_verified'))
);

create table if not exists public.obd_installation_steps (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.obd_installation_guides(id) on delete cascade,
  step_number integer not null,
  instruction_ar text not null,
  instruction_en text,
  image_url text,
  alt_text_ar text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint obd_installation_steps_number_check check (step_number > 0),
  constraint obd_installation_steps_guide_step_unique unique (guide_id, step_number)
);

create table if not exists public.obd_guide_feedback (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.obd_installation_guides(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  was_location_correct boolean,
  was_installation_successful boolean,
  comment text,
  submitted_image_url text,
  review_status varchar(20) not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.users(id) on delete set null,
  constraint obd_guide_feedback_review_status_check check (review_status in ('pending', 'reviewed', 'approved', 'rejected'))
);

alter table public.vehicles
  add column if not exists vehicle_model_id uuid references public.vehicle_models(id) on delete set null,
  add column if not exists vehicle_generation_id uuid references public.vehicle_generations(id) on delete set null,
  add column if not exists market varchar(20) not null default 'GCC';

create index if not exists idx_vehicle_models_make on public.vehicle_models(make_id);
create index if not exists idx_vehicle_model_aliases_normalized on public.vehicle_model_aliases(normalized_alias);
create index if not exists idx_vehicle_generations_model_years_market on public.vehicle_generations(model_id, market, year_from, year_to);
create index if not exists idx_obd_guides_generation_published on public.obd_installation_guides(generation_id, is_published);
create index if not exists idx_obd_steps_guide_step on public.obd_installation_steps(guide_id, step_number);
create index if not exists idx_obd_feedback_user on public.obd_guide_feedback(user_id, created_at);
create index if not exists idx_obd_feedback_vehicle on public.obd_guide_feedback(vehicle_id, created_at);
create index if not exists idx_vehicles_model_generation on public.vehicles(vehicle_model_id, vehicle_generation_id);

drop trigger if exists set_vehicle_makes_updated_at on public.vehicle_makes;
create trigger set_vehicle_makes_updated_at
before update on public.vehicle_makes
for each row execute function public.set_updated_at();

drop trigger if exists set_vehicle_models_updated_at on public.vehicle_models;
create trigger set_vehicle_models_updated_at
before update on public.vehicle_models
for each row execute function public.set_updated_at();

drop trigger if exists set_vehicle_generations_updated_at on public.vehicle_generations;
create trigger set_vehicle_generations_updated_at
before update on public.vehicle_generations
for each row execute function public.set_updated_at();

drop trigger if exists set_obd_installation_guides_updated_at on public.obd_installation_guides;
create trigger set_obd_installation_guides_updated_at
before update on public.obd_installation_guides
for each row execute function public.set_updated_at();

drop trigger if exists set_obd_installation_steps_updated_at on public.obd_installation_steps;
create trigger set_obd_installation_steps_updated_at
before update on public.obd_installation_steps
for each row execute function public.set_updated_at();

create or replace function public.match_vehicle_generation(
  p_make text,
  p_model text,
  p_year integer,
  p_market text default 'GCC'
)
returns table (
  generation_id uuid,
  model_id uuid,
  make_id uuid,
  make_name_en varchar,
  make_name_ar varchar,
  model_name_en varchar,
  model_name_ar varchar,
  generation_code varchar,
  generation_name varchar,
  year_from integer,
  year_to integer,
  market varchar
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with normalized_input as (
    select
      public.normalize_vehicle_name(p_make) as make_name,
      public.normalize_vehicle_name(p_model) as model_name,
      upper(coalesce(nullif(p_market, ''), 'GCC')) as market_name
  )
  select
    g.id,
    vm.id,
    mk.id,
    mk.name_en,
    mk.name_ar,
    vm.name_en,
    vm.name_ar,
    g.generation_code,
    g.generation_name,
    g.year_from,
    g.year_to,
    g.market
  from normalized_input input
  join public.vehicle_makes mk
    on mk.is_active is true
   and (
      public.normalize_vehicle_name(mk.name_en) = input.make_name
      or public.normalize_vehicle_name(mk.name_ar) = input.make_name
      or public.normalize_vehicle_name(mk.slug) = input.make_name
   )
  join public.vehicle_models vm
    on vm.make_id = mk.id
   and vm.is_active is true
   and (
      public.normalize_vehicle_name(vm.name_en) = input.model_name
      or public.normalize_vehicle_name(vm.name_ar) = input.model_name
      or public.normalize_vehicle_name(vm.slug) = input.model_name
      or exists (
        select 1
        from public.vehicle_model_aliases a
        where a.model_id = vm.id
          and a.normalized_alias = input.model_name
      )
   )
  join public.vehicle_generations g
    on g.model_id = vm.id
   and upper(g.market) = input.market_name
   and p_year between g.year_from and g.year_to
  order by g.year_from desc;
$$;

revoke all on function public.match_vehicle_generation(text, text, integer, text) from public;
grant execute on function public.match_vehicle_generation(text, text, integer, text) to authenticated;
revoke execute on function public.match_vehicle_generation(text, text, integer, text) from anon;

create or replace function public.get_obd_installation_guide_for_vehicle(p_vehicle_id uuid)
returns table (
  status text,
  vehicle_id uuid,
  generation_id uuid,
  guide_id uuid,
  make_name_ar varchar,
  make_name_en varchar,
  model_name_ar varchar,
  model_name_en varchar,
  generation_code varchar,
  generation_name varchar,
  year_from integer,
  year_to integer,
  market varchar,
  title_ar varchar,
  title_en varchar,
  short_description_ar text,
  port_location_code varchar,
  port_location_ar text,
  access_difficulty varchar,
  port_orientation varchar,
  has_cover boolean,
  warning_ar text,
  verification_status varchar,
  is_published boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  vehicle_row record;
  matched_count integer;
  matched_row record;
  guide_row record;
begin
  select v.*
    into vehicle_row
  from public.vehicles v
  where v.id = p_vehicle_id
    and (v.user_id = (select auth.uid()) or public.current_user_is_admin())
  limit 1;

  if not found then
    status := 'vehicle_not_found';
    vehicle_id := p_vehicle_id;
    return next;
    return;
  end if;

  if vehicle_row.vehicle_generation_id is not null then
    select
      g.id as generation_id,
      vm.id as model_id,
      mk.name_ar as make_name_ar,
      mk.name_en as make_name_en,
      vm.name_ar as model_name_ar,
      vm.name_en as model_name_en,
      g.generation_code,
      g.generation_name,
      g.year_from,
      g.year_to,
      g.market
      into matched_row
    from public.vehicle_generations g
    join public.vehicle_models vm on vm.id = g.model_id
    join public.vehicle_makes mk on mk.id = vm.make_id
    where g.id = vehicle_row.vehicle_generation_id
    limit 1;
    matched_count := case when matched_row.generation_id is null then 0 else 1 end;
  else
    select count(*)
      into matched_count
    from public.match_vehicle_generation(vehicle_row.make, vehicle_row.model, vehicle_row.year, vehicle_row.market);

    select *
      into matched_row
    from public.match_vehicle_generation(vehicle_row.make, vehicle_row.model, vehicle_row.year, vehicle_row.market)
    limit 1;
  end if;

  vehicle_id := vehicle_row.id;

  if matched_count = 0 then
    status := 'guide_not_available';
    return next;
    return;
  end if;

  if matched_count > 1 then
    status := 'ambiguous_generation_match';
    return next;
    return;
  end if;

  select *
    into guide_row
  from public.obd_installation_guides guide
  where guide.generation_id = matched_row.generation_id
  limit 1;

  generation_id := matched_row.generation_id;
  make_name_ar := matched_row.make_name_ar;
  make_name_en := matched_row.make_name_en;
  model_name_ar := matched_row.model_name_ar;
  model_name_en := matched_row.model_name_en;
  generation_code := matched_row.generation_code;
  generation_name := matched_row.generation_name;
  year_from := matched_row.year_from;
  year_to := matched_row.year_to;
  market := matched_row.market;

  if guide_row.id is null or (guide_row.is_published is false and not public.current_user_is_admin()) then
    status := 'guide_preparing';
    return next;
    return;
  end if;

  status := 'guide_available';
  guide_id := guide_row.id;
  title_ar := guide_row.title_ar;
  title_en := guide_row.title_en;
  short_description_ar := guide_row.short_description_ar;
  port_location_code := guide_row.port_location_code;
  port_location_ar := guide_row.port_location_ar;
  access_difficulty := guide_row.access_difficulty;
  port_orientation := guide_row.port_orientation;
  has_cover := guide_row.has_cover;
  warning_ar := guide_row.warning_ar;
  verification_status := guide_row.verification_status;
  is_published := guide_row.is_published;
  return next;
end;
$$;

revoke all on function public.get_obd_installation_guide_for_vehicle(uuid) from public;
grant execute on function public.get_obd_installation_guide_for_vehicle(uuid) to authenticated;
revoke execute on function public.get_obd_installation_guide_for_vehicle(uuid) from anon;

alter table public.vehicle_makes enable row level security;
alter table public.vehicle_models enable row level security;
alter table public.vehicle_model_aliases enable row level security;
alter table public.vehicle_generations enable row level security;
alter table public.obd_installation_guides enable row level security;
alter table public.obd_installation_steps enable row level security;
alter table public.obd_guide_feedback enable row level security;

drop policy if exists "Users can read active vehicle makes" on public.vehicle_makes;
create policy "Users can read active vehicle makes"
on public.vehicle_makes for select
to authenticated
using (is_active is true);

drop policy if exists "Admins can manage vehicle makes" on public.vehicle_makes;
create policy "Admins can manage vehicle makes"
on public.vehicle_makes for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Users can read active vehicle models" on public.vehicle_models;
create policy "Users can read active vehicle models"
on public.vehicle_models for select
to authenticated
using (
  is_active is true
  and exists (
    select 1 from public.vehicle_makes mk
    where mk.id = vehicle_models.make_id
      and mk.is_active is true
  )
);

drop policy if exists "Admins can manage vehicle models" on public.vehicle_models;
create policy "Admins can manage vehicle models"
on public.vehicle_models for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Users can read active vehicle model aliases" on public.vehicle_model_aliases;
create policy "Users can read active vehicle model aliases"
on public.vehicle_model_aliases for select
to authenticated
using (
  exists (
    select 1
    from public.vehicle_models vm
    join public.vehicle_makes mk on mk.id = vm.make_id
    where vm.id = vehicle_model_aliases.model_id
      and vm.is_active is true
      and mk.is_active is true
  )
);

drop policy if exists "Admins can manage vehicle model aliases" on public.vehicle_model_aliases;
create policy "Admins can manage vehicle model aliases"
on public.vehicle_model_aliases for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Users can read active vehicle generations" on public.vehicle_generations;
create policy "Users can read active vehicle generations"
on public.vehicle_generations for select
to authenticated
using (
  exists (
    select 1
    from public.vehicle_models vm
    join public.vehicle_makes mk on mk.id = vm.make_id
    where vm.id = vehicle_generations.model_id
      and vm.is_active is true
      and mk.is_active is true
  )
);

drop policy if exists "Admins can manage vehicle generations" on public.vehicle_generations;
create policy "Admins can manage vehicle generations"
on public.vehicle_generations for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Users can read published OBD installation guides" on public.obd_installation_guides;
create policy "Users can read published OBD installation guides"
on public.obd_installation_guides for select
to authenticated
using (is_published is true);

drop policy if exists "Admins can manage OBD installation guides" on public.obd_installation_guides;
create policy "Admins can manage OBD installation guides"
on public.obd_installation_guides for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Users can read published OBD installation steps" on public.obd_installation_steps;
create policy "Users can read published OBD installation steps"
on public.obd_installation_steps for select
to authenticated
using (
  exists (
    select 1
    from public.obd_installation_guides guide
    where guide.id = obd_installation_steps.guide_id
      and guide.is_published is true
  )
);

drop policy if exists "Admins can manage OBD installation steps" on public.obd_installation_steps;
create policy "Admins can manage OBD installation steps"
on public.obd_installation_steps for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Users can read own OBD guide feedback" on public.obd_guide_feedback;
create policy "Users can read own OBD guide feedback"
on public.obd_guide_feedback for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own OBD guide feedback for owned vehicles" on public.obd_guide_feedback;
create policy "Users can insert own OBD guide feedback for owned vehicles"
on public.obd_guide_feedback for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.vehicles v
    where v.id = obd_guide_feedback.vehicle_id
      and v.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can manage OBD guide feedback" on public.obd_guide_feedback;
create policy "Admins can manage OBD guide feedback"
on public.obd_guide_feedback for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

grant select on public.vehicle_makes to authenticated;
grant select on public.vehicle_models to authenticated;
grant select on public.vehicle_model_aliases to authenticated;
grant select on public.vehicle_generations to authenticated;
grant select on public.obd_installation_guides to authenticated;
grant select on public.obd_installation_steps to authenticated;
grant select, insert on public.obd_guide_feedback to authenticated;
grant select, insert, update, delete on public.vehicle_makes to authenticated;
grant select, insert, update, delete on public.vehicle_models to authenticated;
grant select, insert, update, delete on public.vehicle_model_aliases to authenticated;
grant select, insert, update, delete on public.vehicle_generations to authenticated;
grant select, insert, update, delete on public.obd_installation_guides to authenticated;
grant select, insert, update, delete on public.obd_installation_steps to authenticated;
grant select, insert, update, delete on public.obd_guide_feedback to authenticated;

do $seed$
declare
  toyota_id uuid;
  nissan_id uuid;
  hyundai_id uuid;
  ford_id uuid;
  kia_id uuid;
  land_cruiser_id uuid;
  corolla_id uuid;
  patrol_id uuid;
  elantra_id uuid;
  edge_id uuid;
  k8_id uuid;
  sportage_id uuid;
  gen_id uuid;
begin
  insert into public.vehicle_makes (name_en, name_ar, slug)
  values
    ('Toyota', 'تويوتا', 'toyota'),
    ('Nissan', 'نيسان', 'nissan'),
    ('Hyundai', 'هيونداي', 'hyundai'),
    ('Ford', 'فورد', 'ford'),
    ('Kia', 'كيا', 'kia')
  on conflict (slug) do update
  set name_en = excluded.name_en,
      name_ar = excluded.name_ar,
      is_active = true;

  select id into toyota_id from public.vehicle_makes where slug = 'toyota';
  select id into nissan_id from public.vehicle_makes where slug = 'nissan';
  select id into hyundai_id from public.vehicle_makes where slug = 'hyundai';
  select id into ford_id from public.vehicle_makes where slug = 'ford';
  select id into kia_id from public.vehicle_makes where slug = 'kia';

  insert into public.vehicle_models (make_id, name_en, name_ar, slug)
  values
    (toyota_id, 'Land Cruiser', 'لاند كروزر', 'land-cruiser'),
    (toyota_id, 'Corolla', 'كورولا', 'corolla'),
    (nissan_id, 'Patrol', 'باترول', 'patrol'),
    (hyundai_id, 'Elantra', 'إلنترا', 'elantra'),
    (ford_id, 'Edge', 'ايدج', 'edge'),
    (kia_id, 'K8', 'كي 8', 'k8'),
    (kia_id, 'Sportage', 'سبورتاج', 'sportage')
  on conflict (make_id, slug) do update
  set name_en = excluded.name_en,
      name_ar = excluded.name_ar,
      is_active = true;

  select id into land_cruiser_id from public.vehicle_models where make_id = toyota_id and slug = 'land-cruiser';
  select id into corolla_id from public.vehicle_models where make_id = toyota_id and slug = 'corolla';
  select id into patrol_id from public.vehicle_models where make_id = nissan_id and slug = 'patrol';
  select id into elantra_id from public.vehicle_models where make_id = hyundai_id and slug = 'elantra';
  select id into edge_id from public.vehicle_models where make_id = ford_id and slug = 'edge';
  select id into k8_id from public.vehicle_models where make_id = kia_id and slug = 'k8';
  select id into sportage_id from public.vehicle_models where make_id = kia_id and slug = 'sportage';

  insert into public.vehicle_model_aliases (model_id, alias, normalized_alias, language)
  values
    (land_cruiser_id, 'Land Cruiser', public.normalize_vehicle_name('Land Cruiser'), 'en'),
    (land_cruiser_id, 'لاند كروزر', public.normalize_vehicle_name('لاند كروزر'), 'ar'),
    (land_cruiser_id, 'لاندكروزر', public.normalize_vehicle_name('لاندكروزر'), 'ar'),
    (patrol_id, 'Patrol', public.normalize_vehicle_name('Patrol'), 'en'),
    (patrol_id, 'باترول', public.normalize_vehicle_name('باترول'), 'ar'),
    (elantra_id, 'Elantra', public.normalize_vehicle_name('Elantra'), 'en'),
    (elantra_id, 'إلنترا', public.normalize_vehicle_name('إلنترا'), 'ar'),
    (elantra_id, 'إيلانترا', public.normalize_vehicle_name('إيلانترا'), 'ar'),
    (corolla_id, 'Corolla', public.normalize_vehicle_name('Corolla'), 'en'),
    (corolla_id, 'كورولا', public.normalize_vehicle_name('كورولا'), 'ar'),
    (edge_id, 'Edge', public.normalize_vehicle_name('Edge'), 'en'),
    (edge_id, 'ايدج', public.normalize_vehicle_name('ايدج'), 'ar'),
    (k8_id, 'K8', public.normalize_vehicle_name('K8'), 'en'),
    (k8_id, 'كي 8', public.normalize_vehicle_name('كي 8'), 'ar'),
    (sportage_id, 'Sportage', public.normalize_vehicle_name('Sportage'), 'en'),
    (sportage_id, 'سبورتاج', public.normalize_vehicle_name('سبورتاج'), 'ar')
  on conflict (model_id, normalized_alias, language) do nothing;

  insert into public.vehicle_generations (model_id, generation_code, generation_name, year_from, year_to, market, notes)
  values
    (land_cruiser_id, 'LC200-GCC', 'Land Cruiser 200 Series GCC', 2008, 2021, 'GCC', 'Seed only; guide unpublished until verified.'),
    (land_cruiser_id, 'LC300-GCC', 'Land Cruiser 300 Series GCC', 2022, 2026, 'GCC', 'Seed only; guide unpublished until verified.'),
    (patrol_id, 'Y62-FL-GCC', 'Patrol Y62 facelift GCC', 2020, 2024, 'GCC', 'Seed only; guide unpublished until verified.'),
    (patrol_id, 'Y63-GCC', 'Patrol GCC 2025+', 2025, 2026, 'GCC', 'Seed only; guide unpublished until verified.'),
    (elantra_id, 'CN7-GCC', 'Elantra CN7 GCC', 2021, 2026, 'GCC', 'Seed only; guide unpublished until verified.'),
    (corolla_id, 'E210-2023-GCC', 'Corolla 2023 GCC', 2023, 2023, 'GCC', 'Seed only; guide unpublished until verified.'),
    (edge_id, 'EDGE-2026-GCC', 'Edge 2026 GCC', 2026, 2026, 'GCC', 'Seed only; guide unpublished until verified.'),
    (k8_id, 'K8-2026-GCC', 'K8 2026 GCC', 2026, 2026, 'GCC', 'Seed only; guide unpublished until verified.'),
    (sportage_id, 'SPORTAGE-2026-GCC', 'Sportage 2026 GCC', 2026, 2026, 'GCC', 'Seed only; guide unpublished until verified.')
  on conflict (model_id, generation_code, market) do update
  set generation_name = excluded.generation_name,
      year_from = excluded.year_from,
      year_to = excluded.year_to,
      notes = excluded.notes;

  for gen_id in
    select id from public.vehicle_generations
    where generation_code in (
      'LC200-GCC',
      'LC300-GCC',
      'Y62-FL-GCC',
      'Y63-GCC',
      'CN7-GCC',
      'E210-2023-GCC',
      'EDGE-2026-GCC',
      'K8-2026-GCC',
      'SPORTAGE-2026-GCC'
    )
  loop
    insert into public.obd_installation_guides (
      generation_id,
      title_ar,
      title_en,
      short_description_ar,
      access_difficulty,
      verification_status,
      source_type,
      source_reference,
      is_published
    )
    select
      gen_id,
      concat('دليل تركيب جهاز مفك - ', mk.name_ar, ' ', vm.name_ar),
      concat('Mofk OBD-II installation guide - ', mk.name_en, ' ', vm.name_en),
      'نعمل حاليًا على تجهيز دليل موثّق لمركبتك.',
      'unknown',
      'preliminary',
      'internal_seed',
      'Phase 1 seed; no port location, images, or external source added.',
      false
    from public.vehicle_generations g
    join public.vehicle_models vm on vm.id = g.model_id
    join public.vehicle_makes mk on mk.id = vm.make_id
    where g.id = gen_id
    on conflict (generation_id) do update
    set
      title_ar = excluded.title_ar,
      title_en = excluded.title_en,
      short_description_ar = excluded.short_description_ar,
      access_difficulty = excluded.access_difficulty,
      verification_status = excluded.verification_status,
      source_type = excluded.source_type,
      source_reference = excluded.source_reference
    where public.obd_installation_guides.is_published is false;
  end loop;
end;
$seed$;

commit;
