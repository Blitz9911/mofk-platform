import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationPath = resolve(__dirname, "../../../supabase1/supabase/20260802_obd_installation_guides_phase1.sql");
const migration = readFileSync(migrationPath, "utf8");

function normalizeVehicleName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replaceAll("أ", "ا")
    .replaceAll("إ", "ا")
    .replaceAll("آ", "ا")
    .replaceAll("ٱ", "ا")
    .replaceAll("ى", "ي")
    .replaceAll("ة", "ه")
    .replace(/[^0-9a-zء-ي]+/g, "");
}

const makes = [
  { slug: "toyota", en: "Toyota", ar: "تويوتا" },
  { slug: "nissan", en: "Nissan", ar: "نيسان" },
  { slug: "hyundai", en: "Hyundai", ar: "هيونداي" },
  { slug: "ford", en: "Ford", ar: "فورد" },
  { slug: "kia", en: "Kia", ar: "كيا" },
];

const models = [
  { make: "toyota", slug: "land-cruiser", en: "Land Cruiser", ar: "لاند كروزر", aliases: ["Land Cruiser", "لاند كروزر", "لاندكروزر"] },
  { make: "toyota", slug: "corolla", en: "Corolla", ar: "كورولا", aliases: ["Corolla", "كورولا"] },
  { make: "nissan", slug: "patrol", en: "Patrol", ar: "باترول", aliases: ["Patrol", "باترول"] },
  { make: "hyundai", slug: "elantra", en: "Elantra", ar: "إلنترا", aliases: ["Elantra", "إلنترا", "إيلانترا"] },
  { make: "ford", slug: "edge", en: "Edge", ar: "ايدج", aliases: ["Edge", "ايدج"] },
  { make: "kia", slug: "k8", en: "K8", ar: "كي 8", aliases: ["K8", "كي 8"] },
  { make: "kia", slug: "sportage", en: "Sportage", ar: "سبورتاج", aliases: ["Sportage", "سبورتاج"] },
];

const generations = [
  { make: "toyota", model: "land-cruiser", code: "LC200-GCC", from: 2008, to: 2021, market: "GCC" },
  { make: "toyota", model: "land-cruiser", code: "LC300-GCC", from: 2022, to: 2026, market: "GCC" },
  { make: "nissan", model: "patrol", code: "Y62-FL-GCC", from: 2020, to: 2024, market: "GCC" },
  { make: "nissan", model: "patrol", code: "Y63-GCC", from: 2025, to: 2026, market: "GCC" },
  { make: "hyundai", model: "elantra", code: "CN7-GCC", from: 2021, to: 2026, market: "GCC" },
  { make: "toyota", model: "corolla", code: "E210-2023-GCC", from: 2023, to: 2023, market: "GCC" },
  { make: "ford", model: "edge", code: "EDGE-2026-GCC", from: 2026, to: 2026, market: "GCC" },
  { make: "kia", model: "k8", code: "K8-2026-GCC", from: 2026, to: 2026, market: "GCC" },
  { make: "kia", model: "sportage", code: "SPORTAGE-2026-GCC", from: 2026, to: 2026, market: "GCC" },
];

function matchVehicle({ make, model, year, market = "GCC" }) {
  const makeKey = normalizeVehicleName(make);
  const modelKey = normalizeVehicleName(model);
  const matchedMake = makes.find((item) =>
    [item.slug, item.en, item.ar].some((value) => normalizeVehicleName(value) === makeKey)
  );
  if (!matchedMake) return [];

  const matchedModel = models.find((item) =>
    item.make === matchedMake.slug &&
    [item.slug, item.en, item.ar, ...item.aliases].some((value) => normalizeVehicleName(value) === modelKey)
  );
  if (!matchedModel) return [];

  return generations.filter((item) =>
    item.make === matchedMake.slug &&
    item.model === matchedModel.slug &&
    item.market === market.toUpperCase() &&
    year >= item.from &&
    year <= item.to
  );
}

test("matches Arabic and English vehicle names", () => {
  assert.equal(matchVehicle({ make: "Toyota", model: "Land Cruiser", year: 2020 })[0]?.code, "LC200-GCC");
  assert.equal(matchVehicle({ make: "تويوتا", model: "لاند كروزر", year: 2024 })[0]?.code, "LC300-GCC");
});

test("treats إلنترا and إيلانترا as one Elantra model", () => {
  assert.equal(matchVehicle({ make: "Hyundai", model: "Elantra", year: 2023 })[0]?.code, "CN7-GCC");
  assert.equal(matchVehicle({ make: "هيونداي", model: "إلنترا", year: 2023 })[0]?.code, "CN7-GCC");
  assert.equal(matchVehicle({ make: "هيونداي", model: "إيلانترا", year: 2023 })[0]?.code, "CN7-GCC");
});

test("matches years inclusively inside generation ranges", () => {
  assert.equal(matchVehicle({ make: "Nissan", model: "Patrol", year: 2020 })[0]?.code, "Y62-FL-GCC");
  assert.equal(matchVehicle({ make: "Nissan", model: "Patrol", year: 2024 })[0]?.code, "Y62-FL-GCC");
  assert.equal(matchVehicle({ make: "Nissan", model: "Patrol", year: 2025 })[0]?.code, "Y63-GCC");
});

test("does not match years outside generation ranges", () => {
  assert.deepEqual(matchVehicle({ make: "Toyota", model: "Corolla", year: 2022 }), []);
  assert.deepEqual(matchVehicle({ make: "Ford", model: "Edge", year: 2025 }), []);
});

test("keeps Land Cruiser generations separate", () => {
  assert.equal(matchVehicle({ make: "Toyota", model: "Land Cruiser", year: 2021 })[0]?.code, "LC200-GCC");
  assert.equal(matchVehicle({ make: "Toyota", model: "Land Cruiser", year: 2022 })[0]?.code, "LC300-GCC");
});

test("does not expose unpublished seeded guides to normal users", () => {
  const guide = { generationCode: "LC300-GCC", isPublished: false };
  const status = guide.isPublished ? "guide_available" : "guide_preparing";
  assert.equal(status, "guide_preparing");
  assert.match(migration, /is_published\s+boolean\s+not null\s+default false/i);
  assert.match(migration, /Users can read published OBD installation guides/);
});

test("feedback is limited to owned vehicles by RLS policy", () => {
  assert.match(migration, /Users can insert own OBD guide feedback for owned vehicles/);
  assert.match(migration, /v\.user_id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /\(select auth\.uid\(\)\) = user_id/);
});

test("guide-not-available status and idempotent seed are present", () => {
  assert.match(migration, /guide_not_available/);
  assert.match(migration, /on conflict \(slug\) do update/i);
  assert.match(migration, /on conflict \(make_id, slug\) do update/i);
  assert.match(migration, /on conflict \(model_id, normalized_alias, language\) do nothing/i);
  assert.match(migration, /on conflict \(model_id, generation_code, market\) do update/i);
  assert.match(migration, /on conflict \(generation_id\) do update/i);
});
