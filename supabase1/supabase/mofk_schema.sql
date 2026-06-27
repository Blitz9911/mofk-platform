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
begin
  insert into public.users (id, name, phone, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1), 'مستخدم مفك'),
    coalesce(nullif(new.raw_user_meta_data->>'phone', ''), concat('user-', substring(new.id::text, 1, 12))),
    new.email
  )
  on conflict (id) do update
  set
    name = excluded.name,
    phone = excluded.phone,
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
