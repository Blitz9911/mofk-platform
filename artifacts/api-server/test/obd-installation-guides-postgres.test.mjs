import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationPath = resolve(__dirname, "../../../supabase1/supabase/migrations/20260802000000_obd_installation_guides_phase1.sql");
const rollbackPath = resolve(__dirname, "../../../supabase1/supabase/20260802_obd_installation_guides_phase1_rollback.sql");
const migrationSql = readFileSync(migrationPath, "utf8");
const rollbackSql = readFileSync(rollbackPath, "utf8");

const databaseUrl = process.env.TEST_DATABASE_URL;
const allowDestructive = process.env.ALLOW_DESTRUCTIVE_POSTGRES_TESTS === "true";

async function resetProjectBaseline(client) {
  await client.query(`
    drop schema if exists public cascade;
    drop schema if exists auth cascade;
    create schema public;
    create schema auth;
    create extension if not exists "pgcrypto";

    do $$
    begin
      if not exists (select 1 from pg_roles where rolname = 'anon') then
        create role anon nologin;
      end if;
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then
        create role authenticated nologin;
      end if;
    end;
    $$;

    grant usage on schema public to anon, authenticated;
    grant usage on schema auth to anon, authenticated;

    create or replace function auth.uid()
    returns uuid
    language sql
    stable
    as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;

    create table public.users (
      id uuid primary key,
      phone varchar(20) not null unique,
      name varchar(120) not null,
      email varchar(255) unique,
      role varchar(20) not null default 'user',
      is_active boolean not null default true,
      created_at timestamptz not null default now()
    );

    create table public.vehicles (
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

    create or replace function public.set_updated_at()
    returns trigger
    language plpgsql
    set search_path = public, pg_temp
    as $$
    begin
      new.created_at := coalesce(new.created_at, now());
      return new;
    end;
    $$;

    grant execute on function auth.uid() to anon, authenticated;
    grant execute on function public.current_user_is_admin() to authenticated;
    grant select, insert, update, delete on public.users to authenticated;
    grant select, insert, update, delete on public.vehicles to authenticated;
  `);
}

async function count(client, sql, params = []) {
  const result = await client.query(sql, params);
  return Number(result.rows[0].count);
}

test("OBD installation guides migration, seed, RLS, and rollback work on PostgreSQL", { skip: !databaseUrl || !allowDestructive }, async () => {
  const { createRequire } = await import("node:module");
  const requireFromDbPackage = createRequire(new URL("../../../lib/db/package.json", import.meta.url));
  const { Client } = requireFromDbPackage("pg");
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const regularUserId = "00000000-0000-0000-0000-000000000001";
  const otherUserId = "00000000-0000-0000-0000-000000000002";
  const adminUserId = "00000000-0000-0000-0000-000000000003";

  try {
    await resetProjectBaseline(client);

    assert.equal(await count(client, "select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'vehicles' and column_name = 'year'"), 1);
    assert.equal(await count(client, "select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'vehicles' and column_name = 'user_id'"), 1);

    await client.query(migrationSql);
    await client.query(migrationSql);

    assert.equal(await count(client, "select count(*) from public.vehicle_makes"), 5);
    assert.equal(await count(client, "select count(*) from public.vehicle_models"), 7);
    assert.equal(await count(client, "select count(*) from public.vehicle_generations"), 9);
    assert.equal(await count(client, "select count(*) from public.obd_installation_guides"), 9);

    const elantraArabic = await client.query("select generation_code from public.match_vehicle_generation('هيونداي', 'إلنترا', 2023, 'GCC')");
    const elantraAlias = await client.query("select generation_code from public.match_vehicle_generation('هيونداي', 'إيلانترا', 2023, 'GCC')");
    assert.equal(elantraArabic.rows[0]?.generation_code, "CN7-GCC");
    assert.equal(elantraAlias.rows[0]?.generation_code, "CN7-GCC");

    const lc200 = await client.query("select generation_code from public.match_vehicle_generation('Toyota', 'Land Cruiser', 2021, 'GCC')");
    const lc300 = await client.query("select generation_code from public.match_vehicle_generation('Toyota', 'Land Cruiser', 2022, 'GCC')");
    const outsideRange = await client.query("select generation_code from public.match_vehicle_generation('Toyota', 'Corolla', 2022, 'GCC')");
    assert.equal(lc200.rows[0]?.generation_code, "LC200-GCC");
    assert.equal(lc300.rows[0]?.generation_code, "LC300-GCC");
    assert.equal(outsideRange.rowCount, 0);

    await client.query(
      `insert into public.users (id, phone, name, role)
       values ($1, '+966500000001', 'Regular', 'user'),
              ($2, '+966500000002', 'Other', 'user'),
              ($3, '+966500000003', 'Admin', 'admin')`,
      [regularUserId, otherUserId, adminUserId],
    );
    const vehicles = await client.query(
      `insert into public.vehicles (user_id, make, model, year)
       values ($1, 'Toyota', 'Land Cruiser', 2022),
              ($2, 'Toyota', 'Land Cruiser', 2022)
       returning id`,
      [regularUserId, otherUserId],
    );

    await client.query("set role authenticated");
    await client.query("select set_config('request.jwt.claim.sub', $1, false)", [regularUserId]);
    assert.equal(await count(client, "select count(*) from public.obd_installation_guides"), 0);

    await client.query("reset role");
    await client.query("set role authenticated");
    await client.query("select set_config('request.jwt.claim.sub', $1, false)", [adminUserId]);
    assert.equal(await count(client, "select count(*) from public.obd_installation_guides"), 9);

    await client.query("reset role");
    const guideId = (await client.query("select id from public.obd_installation_guides limit 1")).rows[0].id;
    await client.query("set role authenticated");
    await client.query("select set_config('request.jwt.claim.sub', $1, false)", [regularUserId]);
    await assert.rejects(
      () => client.query(
        `insert into public.obd_guide_feedback (guide_id, vehicle_id, user_id, was_location_correct)
         values ($1, $2, $3, true)`,
        [guideId, vehicles.rows[1].id, regularUserId],
      ),
      /row-level security|violates row-level security|permission denied/i,
    );

    await client.query("reset role");
    await client.query(rollbackSql);

    assert.equal(await count(client, "select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'current_user_is_admin'"), 1);
    assert.equal(await count(client, "select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'set_updated_at'"), 1);
    assert.equal(await count(client, "select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'obd_installation_guides'"), 0);
    assert.equal(await count(client, "select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'vehicles' and column_name = 'vehicle_generation_id'"), 0);
  } finally {
    await client.query("reset role").catch(() => {});
    await client.end();
  }
});
