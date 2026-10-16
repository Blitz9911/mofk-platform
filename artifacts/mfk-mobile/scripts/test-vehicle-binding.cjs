const assert = require("node:assert/strict");
const path = require("node:path");
const ts = require("typescript");

require.extensions[".ts"] = function compileTypeScript(module, filename) {
  const source = require("node:fs").readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const root = path.resolve(__dirname, "..");
const { matchVehicleFingerprints } = require(path.join(root, "src/obd/binding/matcher.ts"));
const { emptyFingerprint, normalizeFingerprint } = require(path.join(root, "src/obd/binding/fingerprint.ts"));

function fp(partial) {
  return normalizeFingerprint({ collectedAt: 1, ...partial });
}

const base = fp({
  vinNormalized: "JTHBZ1B13P2023392",
  vinAvailability: "ok",
  calibrationId: "CAL-A",
  calibrationAvailability: "ok",
  protocol: "ISO 15765-4",
  supportedPidsNormalized: "010C,010D",
});

assert.equal(matchVehicleFingerprints(base, base), "VERIFIED");

assert.equal(
  matchVehicleFingerprints(
    base,
    fp({ vinNormalized: null, vinAvailability: "unavailable", calibrationId: "CAL-A", calibrationAvailability: "ok", protocol: "ISO 15765-4", supportedPidsNormalized: "010C,010D" }),
  ),
  "LIKELY_MATCH",
);

assert.equal(
  matchVehicleFingerprints(
    base,
    fp({ vinNormalized: "JTHBZ1B13P2023392", vinAvailability: "ok", calibrationId: "CAL-B", calibrationAvailability: "ok" }),
  ),
  "LIKELY_MATCH",
);

assert.equal(
  matchVehicleFingerprints(
    base,
    fp({ vinNormalized: "KMHL341A7RA334421", vinAvailability: "ok", calibrationId: "CAL-A", calibrationAvailability: "ok" }),
  ),
  "MISMATCH",
);

assert.equal(
  matchVehicleFingerprints(
    fp({ protocol: "ISO 15765-4", supportedPidsNormalized: "010C,010D" }),
    fp({ vinNormalized: "KMHL341A7RA334421", vinAvailability: "ok", protocol: "ISO 15765-4", supportedPidsNormalized: "010C,010D" }),
  ),
  "INCONCLUSIVE",
);

assert.equal(
  matchVehicleFingerprints(
    base,
    fp({ calibrationId: "CAL-Z", calibrationAvailability: "ok", protocol: "ISO 15765-4", supportedPidsNormalized: "010C" }),
  ),
  "INCONCLUSIVE",
);

assert.equal(matchVehicleFingerprints(base, emptyFingerprint("adapter timeout")), "INCONCLUSIVE");
assert.equal(matchVehicleFingerprints(base, fp({ vinNormalized: "!!!!", vinAvailability: "malformed" })), "INCONCLUSIVE");
assert.equal(matchVehicleFingerprints(base, emptyFingerprint()), "UNSUPPORTED");

console.log("Vehicle binding matcher tests passed");
