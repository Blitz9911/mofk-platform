-- Additive MFK device/vehicle binding. Do not apply until flags and UAT are approved.
-- Does not alter public.vehicles, subscriptions, or existing RLS on those tables.

create extension if not exists pgcrypto;

create table if not exists public.mfk_devices (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  client_key text not null,
  device_model text not null default 'V011',
  hardware_identifier text,
  hardware_identity_type text not null default 'unverified_hardware'
    check (hardware_identity_type in ('unverified_hardware', 'cryptographic_hardware')),
  binding_status text not null default 'unbound'
    check (binding_status in ('unbound', 'bound', 'review', 'transferred')),
  registered_at timestamptz not null default now(),
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, client_key)
);

create table if not exists public.mfk_device_bindings (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.mfk_devices(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  owner_user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'inactive')),
  activated_at timestamptz not null default now(),
  deactivated_at timestamptz
);

create unique index if not exists mfk_device_bindings_one_active
  on public.mfk_device_bindings (device_id)
  where status = 'active';

create table if not exists public.mfk_vehicle_fingerprints (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  device_id uuid references public.mfk_devices(id) on delete set null,
  vin_available boolean not null default false,
  vin_hmac text,
  calibration_id text,
  cvn text,
  ecu_name text,
  protocol text,
  supported_pids_normalized text,
  ecu_ids_normalized text,
  collected_at timestamptz not null default now()
);

create table if not exists public.mfk_binding_verifications (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.mfk_devices(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  owner_user_id uuid not null references public.users(id) on delete cascade,
  result text not null check (result in ('VERIFIED', 'LIKELY_MATCH', 'INCONCLUSIVE', 'MISMATCH', 'UNSUPPORTED')),
  summary_ar text,
  created_at timestamptz not null default now()
);

create table if not exists public.mfk_device_transfer_requests (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.mfk_devices(id) on delete cascade,
  owner_user_id uuid not null references public.users(id) on delete cascade,
  from_vehicle_id uuid references public.vehicles(id) on delete set null,
  to_vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'completed', 'rejected')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.mfk_binding_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users(id) on delete set null,
  action text not null,
  device_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.mfk_devices enable row level security;
alter table public.mfk_device_bindings enable row level security;
alter table public.mfk_vehicle_fingerprints enable row level security;
alter table public.mfk_binding_verifications enable row level security;
alter table public.mfk_device_transfer_requests enable row level security;
alter table public.mfk_binding_audit_logs enable row level security;

revoke all on table public.mfk_devices from anon, authenticated;
revoke all on table public.mfk_device_bindings from anon, authenticated;
revoke all on table public.mfk_vehicle_fingerprints from anon, authenticated;
revoke all on table public.mfk_binding_verifications from anon, authenticated;
revoke all on table public.mfk_device_transfer_requests from anon, authenticated;
revoke all on table public.mfk_binding_audit_logs from anon, authenticated;

grant select on table public.mfk_devices to authenticated;
grant select on table public.mfk_device_bindings to authenticated;
grant select on table public.mfk_vehicle_fingerprints to authenticated;
grant select on table public.mfk_binding_verifications to authenticated;
grant select on table public.mfk_device_transfer_requests to authenticated;

create policy "owners read mfk_devices"
  on public.mfk_devices for select to authenticated
  using (owner_user_id = (select auth.uid()));

create policy "owners read mfk_device_bindings"
  on public.mfk_device_bindings for select to authenticated
  using (owner_user_id = (select auth.uid()));

create policy "owners read mfk_vehicle_fingerprints"
  on public.mfk_vehicle_fingerprints for select to authenticated
  using (
    exists (
      select 1 from public.vehicles v
      where v.id = vehicle_id and v.user_id = (select auth.uid())
    )
  );

create policy "owners read mfk_binding_verifications"
  on public.mfk_binding_verifications for select to authenticated
  using (owner_user_id = (select auth.uid()));

create policy "owners read mfk_device_transfer_requests"
  on public.mfk_device_transfer_requests for select to authenticated
  using (owner_user_id = (select auth.uid()));

create or replace function public.mfk_vin_hmac(vin text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  pepper text;
begin
  if vin is null or length(btrim(vin)) = 0 then
    return null;
  end if;
  pepper := coalesce(current_setting('app.settings.vin_pepper', true), '');
  if pepper = '' then
    return null;
  end if;
  return encode(hmac(upper(btrim(vin)), pepper, 'sha256'), 'hex');
end;
$$;

create or replace function public.mfk_audit(action text, device uuid, payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.mfk_binding_audit_logs (actor_user_id, action, device_id, payload)
  values ((select auth.uid()), action, device, coalesce(payload, '{}'::jsonb));
end;
$$;

create or replace function public.mfk_register_device(
  p_client_key text,
  p_device_model text,
  p_hardware_identifier text,
  p_hardware_identity_type text
)
returns public.mfk_devices
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := (select auth.uid());
  row public.mfk_devices;
  identity text := coalesce(nullif(p_hardware_identity_type, ''), 'unverified_hardware');
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if identity <> 'unverified_hardware' and identity <> 'cryptographic_hardware' then
    identity := 'unverified_hardware';
  end if;

  insert into public.mfk_devices (
    owner_user_id, client_key, device_model, hardware_identifier, hardware_identity_type
  ) values (
    uid, p_client_key, coalesce(nullif(p_device_model, ''), 'V011'), p_hardware_identifier, identity
  )
  on conflict (owner_user_id, client_key)
  do update set
    hardware_identifier = excluded.hardware_identifier,
    updated_at = now()
  returning * into row;

  perform public.mfk_audit('register_device', row.id, jsonb_build_object(
    'identity_type', row.hardware_identity_type,
    'model', row.device_model
  ));
  return row;
end;
$$;

create or replace function public.mfk_bind_device_vehicle(
  p_device_id uuid,
  p_vehicle_id uuid,
  p_fingerprint jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := (select auth.uid());
  device public.mfk_devices;
  vehicle public.vehicles;
  active_binding public.mfk_device_bindings;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select * into device from public.mfk_devices where id = p_device_id and owner_user_id = uid;
  if device.id is null then
    raise exception 'device not owned';
  end if;

  select * into vehicle from public.vehicles where id = p_vehicle_id and user_id = uid;
  if vehicle.id is null then
    raise exception 'vehicle not owned';
  end if;

  select * into active_binding
  from public.mfk_device_bindings
  where device_id = p_device_id and status = 'active';

  if active_binding.id is not null and active_binding.vehicle_id <> p_vehicle_id then
    raise exception 'device already bound to another vehicle';
  end if;

  if active_binding.id is null then
    insert into public.mfk_device_bindings (device_id, vehicle_id, owner_user_id, status)
    values (p_device_id, p_vehicle_id, uid, 'active');
  end if;

  insert into public.mfk_vehicle_fingerprints (
    vehicle_id, device_id, vin_available, vin_hmac, calibration_id, cvn, ecu_name, protocol,
    supported_pids_normalized, ecu_ids_normalized
  ) values (
    p_vehicle_id,
    p_device_id,
    coalesce((p_fingerprint->>'vinAvailable')::boolean, false),
    public.mfk_vin_hmac(p_fingerprint->>'vinNormalized'),
    p_fingerprint->>'calibrationId',
    p_fingerprint->>'cvn',
    p_fingerprint->>'ecuName',
    p_fingerprint->>'protocol',
    p_fingerprint->>'supportedPidsNormalized',
    p_fingerprint->>'ecuIdsNormalized'
  );

  update public.mfk_devices
  set binding_status = 'bound', last_verified_at = now(), updated_at = now()
  where id = p_device_id;

  perform public.mfk_audit('bind_vehicle', p_device_id, jsonb_build_object('vehicle_id', p_vehicle_id));
  return jsonb_build_object('ok', true, 'device_id', p_device_id, 'vehicle_id', p_vehicle_id);
end;
$$;

create or replace function public.mfk_record_verification(
  p_device_id uuid,
  p_vehicle_id uuid,
  p_result text,
  p_summary_ar text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if not exists (select 1 from public.mfk_devices where id = p_device_id and owner_user_id = uid) then
    raise exception 'device not owned';
  end if;
  insert into public.mfk_binding_verifications (device_id, vehicle_id, owner_user_id, result, summary_ar)
  values (p_device_id, p_vehicle_id, uid, p_result, p_summary_ar);
  update public.mfk_devices set last_verified_at = now(), updated_at = now() where id = p_device_id;
  perform public.mfk_audit('verify', p_device_id, jsonb_build_object('result', p_result, 'vehicle_id', p_vehicle_id));
end;
$$;

create or replace function public.mfk_request_vehicle_transfer(p_device_id uuid, p_to_vehicle_id uuid)
returns public.mfk_device_transfer_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := (select auth.uid());
  device public.mfk_devices;
  from_id uuid;
  last_completed timestamptz;
  req public.mfk_device_transfer_requests;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  select * into device from public.mfk_devices where id = p_device_id and owner_user_id = uid;
  if device.id is null then
    raise exception 'device not owned';
  end if;
  if not exists (select 1 from public.vehicles where id = p_to_vehicle_id and user_id = uid) then
    raise exception 'vehicle not owned';
  end if;

  select max(completed_at) into last_completed
  from public.mfk_device_transfer_requests
  where device_id = p_device_id and status = 'completed';
  if last_completed is not null and last_completed > now() - interval '72 hours' then
    raise exception 'transfer cooldown active';
  end if;

  select vehicle_id into from_id
  from public.mfk_device_bindings
  where device_id = p_device_id and status = 'active';

  insert into public.mfk_device_transfer_requests (device_id, owner_user_id, from_vehicle_id, to_vehicle_id)
  values (p_device_id, uid, from_id, p_to_vehicle_id)
  returning * into req;
  perform public.mfk_audit('transfer_request', p_device_id, jsonb_build_object('to_vehicle_id', p_to_vehicle_id));
  return req;
end;
$$;

create or replace function public.mfk_complete_vehicle_transfer(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := (select auth.uid());
  req public.mfk_device_transfer_requests;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  select * into req from public.mfk_device_transfer_requests where id = p_request_id and owner_user_id = uid;
  if req.id is null then
    raise exception 'transfer not found';
  end if;
  if req.status <> 'pending' then
    raise exception 'transfer not pending';
  end if;

  update public.mfk_device_bindings
  set status = 'inactive', deactivated_at = now()
  where device_id = req.device_id and status = 'active';

  insert into public.mfk_device_bindings (device_id, vehicle_id, owner_user_id, status)
  values (req.device_id, req.to_vehicle_id, uid, 'active');

  update public.mfk_devices set binding_status = 'bound', updated_at = now() where id = req.device_id;
  update public.mfk_device_transfer_requests
  set status = 'completed', completed_at = now()
  where id = req.id;

  perform public.mfk_audit('transfer_complete', req.device_id, jsonb_build_object('request_id', req.id));
  return jsonb_build_object('ok', true, 'vehicle_id', req.to_vehicle_id);
end;
$$;

revoke all on function public.mfk_vin_hmac(text) from public, anon, authenticated;
revoke all on function public.mfk_audit(text, uuid, jsonb) from public, anon, authenticated;

grant execute on function public.mfk_register_device(text, text, text, text) to authenticated;
grant execute on function public.mfk_bind_device_vehicle(uuid, uuid, jsonb) to authenticated;
grant execute on function public.mfk_record_verification(uuid, uuid, text, text) to authenticated;
grant execute on function public.mfk_request_vehicle_transfer(uuid, uuid) to authenticated;
grant execute on function public.mfk_complete_vehicle_transfer(uuid) to authenticated;
