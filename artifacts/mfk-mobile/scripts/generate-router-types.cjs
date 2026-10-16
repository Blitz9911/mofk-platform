#!/usr/bin/env node
/**
 * Generate .expo/types/router.d.ts without Metro.
 *
 * Relies on Expo Router INTERNAL APIs:
 *   expo-router/build/testing-library/require-context-ponyfill
 *   expo-router/build/getRoutes
 *   expo-router/build/typed-routes/generate
 * Recheck this script when upgrading expo-router.
 *
 * Does not import app screens or call app services. It only enumerates route
 * files under ./app (resolved from this script) and writes declaration text.
 * Output is gitignored via .expo/. The script never reads a previous
 * router.d.ts; missing output is not an error.
 */
const fs = require("node:fs");
const path = require("node:path");

function fail(message) {
  console.error(message);
  process.exit(1);
}

try {
  const requireContext = require("expo-router/build/testing-library/require-context-ponyfill").default;
  const { getRoutes } = require("expo-router/build/getRoutes");
  const { getTypedRoutesDeclarationFile } = require("expo-router/build/typed-routes/generate");

  const root = path.resolve(__dirname, "..");
  const appRoot = path.join(root, "app");
  const outputDir = path.join(root, ".expo", "types");
  const outputFile = path.join(outputDir, "router.d.ts");

  if (!fs.existsSync(appRoot) || !fs.statSync(appRoot).isDirectory()) {
    fail(`App directory not found: ${appRoot}`);
  }

  const ctx = requireContext(appRoot, true, /\.[tj]sx?$/);
  if (!ctx.keys().length) {
    fail("No route files found.");
  }

  const tree = getRoutes(ctx, {
    ignore: [/_layout\.[tj]sx?$/],
    platformRoutes: false,
    notFound: false,
    ignoreEntryPoints: true,
    ignoreRequireErrors: false,
    importMode: "async",
  });
  if (!tree) {
    fail("Expo Router could not build the route tree.");
  }

  const declaration = getTypedRoutesDeclarationFile(ctx);
  if (!declaration || !declaration.includes("href")) {
    fail("Invalid router type declaration.");
  }

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputFile, declaration, "utf8");
  console.log("Generated .expo/types/router.d.ts");
} catch (error) {
  fail(error instanceof Error ? error.stack || error.message : String(error));
}
