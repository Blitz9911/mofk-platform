const assert = require("node:assert/strict");

async function main() {
  const { shouldPersistPushToken } = await import("../lib/push-registration.mjs");
  assert.equal(shouldPersistPushToken({ status: 201, payload: { ok: true, id: "device-1" } }), true);
  assert.equal(shouldPersistPushToken({ status: 503, payload: { error: "api_base_unconfigured" } }), false);
  assert.equal(shouldPersistPushToken({ status: 201, payload: { ok: true, persisted: false } }), false);
  assert.equal(shouldPersistPushToken({ status: 200, payload: { ok: false } }), false);
  console.log("notification registration flow: 4/4 PASS");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
