-- Mofk Supabase MVP schema
-- Run this file in Supabase > SQL Editor before testing the website.

create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  phone varchar(20) not null unique,
  name varchar(120) not null,
  email varchar(255) unique,
  password_hash text,
  city varchar(60),
  language varchar(2) not null default 'ar',
  role varchar(20) not null default 'user',
  subscription_tier varchar(20) not null default 'free',
  subscription_started_at timestamptz,
  subscription_ends_at timestamptz,
  subscription_auto_renew boolean not null default true,
  is_active boolean not null default true,
  last_active_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  vin varchar(17),
  make varchar(50) not null,
  model varchar(80) not null,
  year integer not null,
  plate_number varchar(20),
  nickname varchar(60),
  odometer_km integer not null default 0,
  fuel_type varchar(20) not null default 'petrol',
  engine_cc integer,
  adapter_mac varchar(17),
  health_score smallint not null default 100,
  image_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_vehicles_user on public.vehicles(user_id);

create table if not exists public.fuel_logs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  filled_at timestamptz not null default now(),
  odometer_km integer not null,
  liters numeric(6,2) not null,
  price_per_liter_halalas integer not null,
  total_cost_halalas integer not null,
  fuel_grade varchar(10) not null default '91',
  station_name_ar varchar(120),
  is_full boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_fuel_vehicle_filled on public.fuel_logs(vehicle_id, filled_at);
create index if not exists idx_fuel_user on public.fuel_logs(user_id, filled_at);

create table if not exists public.activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  kind varchar(40) not null,
  title_ar varchar(200) not null,
  subtitle_ar text,
  severity varchar(10),
  occurred_at timestamptz not null default now()
);

create index if not exists idx_activity_user on public.activity(user_id, occurred_at);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_name text;
  profile_phone text;
begin
  profile_name := coalesce(
    nullif(new.raw_user_meta_data->>'name', ''),
    nullif(new.raw_user_meta_data->>'full_name', ''),
    split_part(new.email, '@', 1),
    'مستخدم مفك'
  );

  profile_phone := coalesce(
    nullif(new.raw_user_meta_data->>'phone', ''),
    concat('user-', substring(new.id::text, 1, 12))
  );

  if exists (
    select 1 from public.users
    where phone = profile_phone and id <> new.id
  ) then
    profile_phone := concat('user-', substring(new.id::text, 1, 12));
  end if;

  insert into public.users (id, name, phone, email)
  values (new.id, profile_name, profile_phone, new.email)
  on conflict (id) do update
  set
    name = excluded.name,
    phone = case
      when exists (
        select 1 from public.users u
        where u.phone = excluded.phone and u.id <> public.users.id
      ) then public.users.phone
      else excluded.phone
    end,
    email = excluded.email;

  return new;
  exception
    when unique_violation then
      insert into public.users (id, name, phone, email)
      values (new.id, profile_name, concat('user-', substring(new.id::text, 1, 12)), new.email)
      on conflict (id) do update
      set name = excluded.name,
          email = excluded.email;
      return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

alter table public.users enable row level security;
alter table public.vehicles enable row level security;
alter table public.fuel_logs enable row level security;
alter table public.activity enable row level security;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.role = 'admin'
      and u.is_active is true
  );
$$;

revoke all on function public.current_user_is_admin() from public;
grant execute on function public.current_user_is_admin() to authenticated;
revoke execute on function public.current_user_is_admin() from anon;

create or replace function public.plan_vehicle_limit(plan text)
returns integer
language sql
immutable
set search_path = public, pg_temp
as $$
  select case coalesce(plan, 'free')
    when 'free' then 1
    when 'mofk' then 1
    when 'plus' then 1
    when 'premium' then 3
    when 'pro' then 3
    when 'family' then 5
    when 'fleet' then null
    else 1
  end;
$$;

revoke all on function public.plan_vehicle_limit(text) from public;
grant execute on function public.plan_vehicle_limit(text) to authenticated;
revoke execute on function public.plan_vehicle_limit(text) from anon;

drop policy if exists "Users can read own profile" on public.users;
create policy "Users can read own profile"
on public.users for select
using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.users;
create policy "Users can insert own profile"
on public.users for insert
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
on public.users for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Admins can read all profiles" on public.users;
create policy "Admins can read all profiles"
on public.users for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists "Admins can update all profiles" on public.users;
create policy "Admins can update all profiles"
on public.users for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

revoke update on public.users from anon, authenticated;
grant update (name, phone, email, city, language, last_active_at) on public.users to authenticated;

create or replace function public.enforce_vehicle_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  owner_role text;
  owner_tier text;
  allowed_count integer;
  existing_count integer;
begin
  select u.role, u.subscription_tier
    into owner_role, owner_tier
  from public.users u
  where u.id = new.user_id;

  if owner_role is null then
    raise exception 'لم يتم العثور على مالك المركبة.' using errcode = '23503';
  end if;

  if owner_role = 'admin' then
    return new;
  end if;

  allowed_count := public.plan_vehicle_limit(owner_tier);

  if allowed_count is null then
    return new;
  end if;

  select count(*)
    into existing_count
  from public.vehicles v
  where v.user_id = new.user_id;

  if existing_count >= allowed_count then
    raise exception 'وصلت للحد الأقصى للمركبات في باقتك الحالية.' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_vehicle_plan_limit() from public;
revoke execute on function public.enforce_vehicle_plan_limit() from anon, authenticated;

drop trigger if exists enforce_vehicle_plan_limit_before_insert on public.vehicles;
create trigger enforce_vehicle_plan_limit_before_insert
before insert on public.vehicles
for each row execute function public.enforce_vehicle_plan_limit();

create or replace function public.admin_update_user_access(
  target_user_id uuid,
  new_role text default null,
  new_subscription_tier text default null,
  new_is_active boolean default null
)
returns table (
  id uuid,
  name varchar,
  phone varchar,
  email varchar,
  role varchar,
  subscription_tier varchar,
  is_active boolean,
  city varchar,
  last_active_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  clean_role text;
  clean_tier text;
begin
  if not public.current_user_is_admin() then
    raise exception 'صلاحية الأدمن مطلوبة.' using errcode = '42501';
  end if;

  clean_role := nullif(trim(coalesce(new_role, '')), '');
  clean_tier := nullif(trim(coalesce(new_subscription_tier, '')), '');

  if clean_role is not null and clean_role not in ('user', 'admin', 'fleet') then
    raise exception 'قيمة الصلاحية غير صحيحة.' using errcode = '22023';
  end if;

  if clean_tier is not null and clean_tier not in ('free', 'mofk', 'plus', 'premium', 'pro', 'family', 'fleet') then
    raise exception 'قيمة الباقة غير صحيحة.' using errcode = '22023';
  end if;

  return query
  update public.users u
  set
    role = coalesce(clean_role, u.role),
    subscription_tier = coalesce(clean_tier, u.subscription_tier),
    is_active = coalesce(new_is_active, u.is_active),
    subscription_started_at = case
      when clean_tier is not null and clean_tier <> u.subscription_tier then now()
      else u.subscription_started_at
    end
  where u.id = target_user_id
  returning
    u.id,
    u.name,
    u.phone,
    u.email,
    u.role,
    u.subscription_tier,
    u.is_active,
    u.city,
    u.last_active_at,
    u.created_at;
end;
$$;

revoke all on function public.admin_update_user_access(uuid, text, text, boolean) from public;
grant execute on function public.admin_update_user_access(uuid, text, text, boolean) to authenticated;
revoke execute on function public.admin_update_user_access(uuid, text, text, boolean) from anon;

drop policy if exists "Users can manage own vehicles" on public.vehicles;
create policy "Users can manage own vehicles"
on public.vehicles for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage own fuel logs" on public.fuel_logs;
create policy "Users can manage own fuel logs"
on public.fuel_logs for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage own activity" on public.activity;
create policy "Users can manage own activity"
on public.activity for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

