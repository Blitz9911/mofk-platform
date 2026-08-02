import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test, before } from "node:test";
import { createRequire } from "node:module";
import ts from "typescript";

const root = path.resolve(process.cwd(), "artifacts/api-server");
const outdir = path.join(tmpdir(), "mofk-recommendation-engine-test");
let engine;
const recommendationFiles = [
  "types",
  "maintenance",
  "diagnostics",
  "battery",
  "fuel",
  "data-quality",
  "engine",
];

before(async () => {
  await rm(outdir, { recursive: true, force: true });
  await mkdir(outdir, { recursive: true });
  await writeFile(path.join(outdir, "package.json"), JSON.stringify({ type: "commonjs" }));

  for (const name of recommendationFiles) {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(path.join(root, "src/recommendations", `${name}.ts`), "utf8"),
    );
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
      fileName: `${name}.ts`,
    }).outputText;
    await writeFile(path.join(outdir, `${name}.js`), output);
  }

  const require = createRequire(path.join(outdir, "test.cjs"));
  engine = require(path.join(outdir, "engine.js"));
});

function vehicle(overrides = {}) {
  return {
    id: "vehicle-1",
    userId: "user-1",
    make: "Toyota",
    model: "Camry",
    nickname: "كامري",
    odometerKm: 10500,
    adapterMac: "AA:BB",
    healthScore: 90,
    ...overrides,
  };
}

function evaluate(overrides = {}) {
  return engine.evaluateVehicleRecommendations({
    vehicle: vehicle(overrides.vehicle),
    maintenance: overrides.maintenance ?? [],
    dtcs: overrides.dtcs ?? [],
    telemetry: overrides.telemetry ?? [],
    fuelLogs: overrides.fuelLogs ?? [],
    now: new Date("2026-07-31T12:00:00Z"),
  });
}

test("creates overdue maintenance recommendation", () => {
  const recs = evaluate({
    maintenance: [{
      id: "maint-1",
      vehicleId: "vehicle-1",
      serviceType: "oil",
      serviceTypeAr: "تغيير زيت المحرك",
      nextDueKm: 10000,
      estimatedCost: 180,
    }],
  });

  assert.equal(recs.some((rec) => rec.ruleCode === "MAINTENANCE_OVERDUE"), true);
});

test("does not duplicate the same recommendation key", () => {
  const recs = evaluate({
    maintenance: [
      { id: "maint-1", vehicleId: "vehicle-1", serviceType: "oil", serviceTypeAr: "تغيير الزيت", nextDueKm: 10000 },
      { id: "maint-1", vehicleId: "vehicle-1", serviceType: "oil", serviceTypeAr: "تغيير الزيت", nextDueKm: 10000 },
    ],
  });
  const keys = recs.map((rec) => rec.dedupeKey);
  assert.equal(new Set(keys).size, keys.length);
});

test("creates high risk DTC recommendation without making every DTC critical", () => {
  const recs = evaluate({
    dtcs: [
      { id: "dtc-1", vehicleId: "vehicle-1", code: "P0300", severity: "critical", status: "active" },
      { id: "dtc-2", vehicleId: "vehicle-1", code: "P0456", severity: "low", status: "active" },
    ],
  });

  assert.equal(recs.some((rec) => rec.ruleCode === "ACTIVE_HIGH_RISK_DTC"), true);
  assert.equal(recs.some((rec) => rec.metadata.code === "P0456" && rec.priority === "critical"), false);
});

test("creates fuel consumption increase recommendation against vehicle baseline", () => {
  const recs = evaluate({
    fuelLogs: [
      { id: "f1", vehicleId: "vehicle-1", filledAt: "2026-05-01T00:00:00Z", odometerKm: 1000, liters: 40 },
      { id: "f2", vehicleId: "vehicle-1", filledAt: "2026-05-10T00:00:00Z", odometerKm: 1500, liters: 40 },
      { id: "f3", vehicleId: "vehicle-1", filledAt: "2026-05-20T00:00:00Z", odometerKm: 2000, liters: 40 },
      { id: "f4", vehicleId: "vehicle-1", filledAt: "2026-06-01T00:00:00Z", odometerKm: 2300, liters: 42 },
      { id: "f5", vehicleId: "vehicle-1", filledAt: "2026-06-10T00:00:00Z", odometerKm: 2600, liters: 42 },
    ],
  });

  assert.equal(recs.some((rec) => rec.ruleCode === "FUEL_CONSUMPTION_INCREASE"), true);
});

test("creates data-quality recommendations when key data is missing", () => {
  const recs = evaluate({ vehicle: { odometerKm: 0, adapterMac: null }, maintenance: [] });
  assert.equal(recs.some((rec) => rec.ruleCode === "MISSING_ODOMETER"), true);
  assert.equal(recs.some((rec) => rec.ruleCode === "DEVICE_NOT_CONNECTED"), true);
});
