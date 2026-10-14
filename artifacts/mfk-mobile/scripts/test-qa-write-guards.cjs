const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const { join } = require("node:path");

async function main() {
  const mod = await import(pathToFileURL(join(__dirname, "../lib/qa-write-guards.mjs")).href);
  const payload = mod.buildMaintenanceLogInsert({
    vehicleId: "v1",
    userId: "u1",
    serviceType: "oil_change",
    doneAt: "2026-10-15T00:00:00.000Z",
    doneAtKm: 40000,
    costSar: 300,
    source: "manual",
  });
  assert.equal(payload.actual_cost_sar, undefined);
  assert.equal(payload.cost_sar, 300);
  assert.equal(mod.maintenanceInsertFallbacks(payload).length, 3);

  const bad = mod.assertOdometerWrite({ km: -1, previousKm: 10 });
  assert.equal(bad.ok, false);
  const drop = mod.assertOdometerWrite({ km: 1000, previousKm: 50000, estimated: false });
  assert.equal(drop.ok, false);
  const ok = mod.assertOdometerWrite({ km: 51000, previousKm: 50000 });
  assert.equal(ok.ok, true);

  const fake = mod.committedOdometerResponse({
    km: 1,
    estimated: false,
    vehicleUpdated: false,
    historyStored: false,
  });
  assert.equal(fake.ok, false);
  assert.equal(/local_pending/.test(JSON.stringify(fake)), false);

  const committed = mod.committedOdometerResponse({
    km: 51000,
    estimated: false,
    vehicleUpdated: true,
    historyStored: false,
  });
  assert.equal(committed.ok, true);
  assert.equal(committed.stored, "vehicle");
  console.log("qa-write-guards: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
