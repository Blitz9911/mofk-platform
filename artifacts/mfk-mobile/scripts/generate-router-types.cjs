const fs = require("node:fs");
const path = require("node:path");

// Internal Expo Router APIs: recheck this script when upgrading expo-router.
const requireContext = require("expo-router/build/testing-library/require-context-ponyfill").default;
const { getRoutes } = require("expo-router/build/getRoutes");
const { getTypedRoutesDeclarationFile } = require("expo-router/build/typed-routes/generate");

const root = path.resolve(__dirname, "..");
const appRoot = path.join(root, "app");
const outputDir = path.join(root, ".expo", "types");
const ctx = requireContext(appRoot, true, /\.[tj]sx?$/);

if (!ctx.keys().length) {
  throw new Error("No route files found.");
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
  throw new Error("Expo Router could not build the route tree.");
}

const declaration = getTypedRoutesDeclarationFile(ctx);
if (!declaration || !declaration.includes("href")) {
  throw new Error("Invalid router type declaration.");
}

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "router.d.ts"), declaration, "utf8");
console.log("Generated .expo/types/router.d.ts");
