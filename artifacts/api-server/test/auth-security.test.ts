import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import { verifySupabaseJwt } from "../src/lib/supabase-jwt.ts";

const ref = "nbuqxtasvqdnallukbyx";
const issuer = `https://${ref}.supabase.co/auth/v1`;
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = publicKey.export({ format: "jwk" }) as Record<string, string>;

function makeToken(overrides: Record<string, unknown> = {}) {
  const header = { alg: "RS256", kid: "uat-test-key", typ: "JWT" };
  const payload = {
    sub: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    iss: issuer,
    aud: "authenticated",
    exp: Math.floor(Date.now() / 1000) + 300,
    ...overrides,
  };
  const encoded = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const signingInput = `${encoded(header)}.${encoded(payload)}`;
  const signature = sign("RSA-SHA256", Buffer.from(signingInput), privateKey).toString("base64url");
  return `${signingInput}.${signature}`;
}

test.before(() => {
  process.env.MFK_ENV = "uat";
  process.env.MFK_UAT_SUPABASE_REF = ref;
  globalThis.fetch = async () => new Response(JSON.stringify({ keys: [{ ...jwk, kid: "uat-test-key", kty: "RSA", alg: "RS256", use: "sig" }] }), { status: 200 });
});

test("accepts a correctly signed UAT Supabase JWT", async () => {
  const payload = await verifySupabaseJwt(makeToken());
  assert.equal(payload?.sub, "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
});

test("rejects a JWT with a forged signature", async () => {
  const parts = makeToken().split(".");
  parts[2] = `${parts[2].slice(0, -1)}${parts[2].endsWith("A") ? "B" : "A"}`;
  const token = parts.join(".");
  assert.equal(await verifySupabaseJwt(token), null);
});

test("rejects an expired JWT", async () => {
  assert.equal(await verifySupabaseJwt(makeToken({ exp: Math.floor(Date.now() / 1000) - 1 })), null);
});

test("rejects a token issued for Production", async () => {
  assert.equal(await verifySupabaseJwt(makeToken({ iss: "https://tnkcmoqzcvtsaqwsghet.supabase.co/auth/v1" })), null);
});
