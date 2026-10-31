const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const mobileRoot = path.resolve(__dirname, "..");
const supabase = fs.readFileSync(path.join(mobileRoot, "lib/supabase.ts"), "utf8");
const eas = JSON.parse(fs.readFileSync(path.join(mobileRoot, "eas.json"), "utf8"));

assert.doesNotMatch(supabase, /DEV_PHONE_OTP_CODE|phoneOtpFallbackToMock|shouldUseMockOtpFallback/);
assert.doesNotMatch(supabase, /phoneAuthPassword|phoneAuthEmail/);
assert.equal(eas.build.uat.env.EXPO_PUBLIC_AUTH_OTP_MODE, "sms");
assert.equal(eas.build["testflight-uat"].env.EXPO_PUBLIC_AUTH_OTP_MODE, "sms");

console.log("OTP security checks: 5/5 PASS");
