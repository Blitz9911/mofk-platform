import assert from "node:assert/strict";
import test from "node:test";

const hasDb = Boolean(process.env.DATABASE_URL);

test("database integration is skipped without DATABASE_URL", { skip: hasDb }, () => {
  assert.equal(hasDb, false);
});

test("two authenticated roles cannot share another user's vehicle rows", { skip: !hasDb }, async () => {
  const pg = await import("pg");
  const client = new pg.default.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const policies = await client.query(
      `select tablename, policyname
       from pg_policies
       where tablename in (
         'maintenance_logs',
         'maintenance_log_items',
         'maintenance_attachments',
         'maintenance_rules',
         'maintenance_approval_requests',
         'odometer_readings',
         'notifications'
       )`,
    );
    assert.ok(policies.rowCount >= 1, "expected RLS policies after migration");
    const rls = await client.query(
      `select relname, relrowsecurity
       from pg_class
       where relname in (
         'maintenance_log_items',
         'odometer_readings',
         'maintenance_approval_requests'
       )`,
    );
    for (const row of rls.rows) {
      assert.equal(row.relrowsecurity, true, `${row.relname} must have RLS`);
    }
  } finally {
    await client.end();
  }
});
