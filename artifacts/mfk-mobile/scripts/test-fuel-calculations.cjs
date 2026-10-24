const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const ts = require("typescript");

require.extensions[".ts"] = function compileTypeScript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const { buildFuelStats, withFuelConsumption, filterFuelRowsByPeriod } = require(path.join(__dirname, "..", "lib", "fuel-calculations.ts"));
const row = (id, date, odometer, liters, is_full, cost = liters * 2.18) => ({
  id,
  filled_at: `${date}T10:00:00.000Z`,
  odometer_km: odometer,
  liters,
  total_cost_halalas: Math.round(cost * 100),
  is_full,
});

const first = withFuelConsumption([row("first", "2026-10-01", 1000, 40, true)]);
assert.equal(first[0].consumption, null, "first fill has no interval");

const twoFull = withFuelConsumption([
  row("a", "2026-10-01", 1000, 40, true),
  row("b", "2026-10-10", 1200, 20, true),
]);
assert.deepEqual(twoFull[1].consumption, { distanceKm: 200, consumptionL100km: 10, kmPerLiter: 10 });

const withPartial = withFuelConsumption([
  row("a", "2026-10-01", 1000, 40, true),
  row("partial", "2026-10-05", 1100, 10, false),
  row("b", "2026-10-10", 1200, 20, true),
]);
assert.equal(withPartial[1].consumption, null, "partial fill has no standalone consumption");
assert.deepEqual(withPartial[2].consumption, { distanceKm: 200, consumptionL100km: 15, kmPerLiter: 6.67 });
assert.equal(withFuelConsumption([
  row("a", "2026-10-01", 1000, 40, true),
  row("unknown-null", "2026-10-05", 1100, 10, null),
  row("b", "2026-10-10", 1200, 20, true),
])[2].consumption, null, "null fill type breaks the interval");
const unknownUndefined = row("unknown-undefined", "2026-10-05", 1100, 10, true);
delete unknownUndefined.is_full;
assert.equal(withFuelConsumption([
  row("a", "2026-10-01", 1000, 40, true),
  unknownUndefined,
  row("b", "2026-10-10", 1200, 20, true),
])[2].consumption, null, "undefined fill type breaks the interval");
const afterMiddleDelete = withFuelConsumption([row("a", "2026-10-01", 1000, 40, true), row("b", "2026-10-10", 1200, 20, true)]);
assert.deepEqual(afterMiddleDelete[1].consumption, { distanceKm: 200, consumptionL100km: 10, kmPerLiter: 10 }, "deleting a middle partial recalculates the interval");

assert.equal(withFuelConsumption([row("missing", "2026-10-01", null, 40, true), row("next", "2026-10-10", 1200, 20, true)])[1].consumption, null);
assert.equal(withFuelConsumption([row("a", "2026-10-01", 1200, 40, true), row("bad", "2026-10-10", 1100, 20, true)])[1].consumption, null);

const stats = buildFuelStats([
  row("a", "2026-10-01", 1000, 40, true),
  row("b", "2026-10-10", 1200, 20, true),
  row("c", "2026-10-20", 1400, 30, true),
], "month", new Date("2026-10-24T12:00:00Z"));
assert.equal(stats.avgKmPerLiter, 8, "weighted average uses total distance / total interval litres");
assert.equal(stats.fillCount, 3);
assert.equal(filterFuelRowsByPeriod([{ ...row("old", "2026-09-30", 900, 20, true) }, ...[
  row("new", "2026-10-01", 1000, 40, true),
]], "month", new Date("2026-10-24T12:00:00Z")).length, 1);

const chartRows = [
  row("jan", "2026-01-05", 1000, 40, true, 100),
  row("feb", "2026-02-05", 1200, 40, true, 200),
  row("mar", "2026-03-05", 1400, 40, true, 300),
  row("apr", "2026-04-05", 1600, 40, true, 400),
];
const yearStats = buildFuelStats(chartRows, "year", new Date("2026-12-01T12:00:00Z"));
assert.equal(yearStats.trendByDay.length, 4, "year chart groups by month without dropping records");
assert.equal(yearStats.trendByDay.reduce((sum, item) => sum + item.liters, 0), yearStats.totalLiters);
assert.equal(yearStats.trendByDay.reduce((sum, item) => sum + item.costSar, 0), yearStats.totalCostSar);
const byId = (items) => new Map(items.map((item) => [item.row.id, item.consumption]));
assert.deepEqual(byId(withFuelConsumption([...chartRows].reverse())), byId(withFuelConsumption(chartRows)), "ordering does not change calculations");

console.log("Fuel calculation tests passed");
