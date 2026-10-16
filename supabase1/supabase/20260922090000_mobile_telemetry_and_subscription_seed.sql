create table if not exists public.telemetry (
  time timestamptz not null default now(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  session_id text,
  rpm numeric,
  speed_kmh numeric,
  coolant_temp numeric,
  intake_temp numeric,
  battery_v numeric,
  fuel_level_pct numeric,
  engine_load numeric,
  throttle_pos numeric,
  created_at timestamptz not null default now(),
  primary key (vehicle_id, time)
);

create index if not exists telemetry_vehicle_time_idx
  on public.telemetry (vehicle_id, time desc);

alter table public.telemetry enable row level security;

drop policy if exists "Users can read telemetry for their vehicles" on public.telemetry;
create policy "Users can read telemetry for their vehicles"
  on public.telemetry
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.vehicles
      where vehicles.id = telemetry.vehicle_id
        and vehicles.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can insert telemetry for their vehicles" on public.telemetry;
create policy "Users can insert telemetry for their vehicles"
  on public.telemetry
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.vehicles
      where vehicles.id = telemetry.vehicle_id
        and vehicles.user_id = (select auth.uid())
    )
  );

grant select, insert on public.telemetry to authenticated;

insert into public.subscription_plans (
  id,
  name,
  name_ar,
  description_ar,
  price_monthly_sar,
  price_yearly_sar,
  max_vehicles,
  tier,
  features,
  features_ar,
  is_popular,
  sort_order
)
values
  (
    'free',
    'Free',
    'باقة مجانية',
    'إدارة مركبة واحدة بدون جهاز وبدون دفع',
    0,
    0,
    1,
    'free',
    array['One vehicle', 'Maintenance log', 'Fuel log'],
    array['مركبة واحدة', 'سجل الصيانة', 'سجل البنزين والصرفية'],
    false,
    1
  ),
  (
    'mofk',
    'Mofk',
    'باقة مفك',
    'اشتراك مدفوع لمركبة واحدة مع جهاز مفك OBD',
    29,
    290,
    1,
    'mofk',
    array['OBD diagnostics', 'Unlimited AI assistant', 'PDF export'],
    array['تشخيص OBD', 'رسائل المساعد الذكي غير محدودة', 'تصدير PDF'],
    true,
    2
  ),
  (
    'family',
    'Family',
    'باقة العائلة',
    'لعدة مركبات مع تقارير أعمق وتصدير PDF',
    59,
    590,
    3,
    'family',
    array['Up to 3 vehicles', 'Advanced health reports', 'Priority support'],
    array['حتى 3 مركبات', 'تقارير صحة متقدمة', 'دعم أولوية'],
    false,
    3
  ),
  (
    'fleet',
    'Fleet',
    'باقة الاسطول',
    'للشركات: التفاصيل والتسعير في الموقع',
    0,
    null,
    null,
    'fleet',
    array[]::text[],
    array[]::text[],
    false,
    4
  )
on conflict (id) do update set
  name = excluded.name,
  name_ar = excluded.name_ar,
  description_ar = excluded.description_ar,
  price_monthly_sar = excluded.price_monthly_sar,
  price_yearly_sar = excluded.price_yearly_sar,
  max_vehicles = excluded.max_vehicles,
  tier = excluded.tier,
  features = excluded.features,
  features_ar = excluded.features_ar,
  is_popular = excluded.is_popular,
  sort_order = excluded.sort_order;
