import assert from "node:assert/strict";
import test from "node:test";
import { authTokenSecret, assertAuthConfiguration } from "../src/lib/auth-config.ts";

test("production startup fails clearly when auth secret is missing", () => {
  const previous = { node: process.env.NODE_ENV, uat: process.env.MFK_ENV, jwt: process.env.JWT_SECRET, auth: process.env.AUTH_TOKEN_SECRET };
  delete process.env.JWT_SECRET;
  delete process.env.AUTH_TOKEN_SECRET;
  process.env.NODE_ENV = "production";
  delete process.env.MFK_ENV;
  assert.throws(() => assertAuthConfiguration(), /JWT_SECRET or AUTH_TOKEN_SECRET/);
  Object.assign(process.env, previous);
});

test("UAT startup also requires a local auth secret", () => {
  const previous = { node: process.env.NODE_ENV, uat: process.env.MFK_ENV, jwt: process.env.JWT_SECRET, auth: process.env.AUTH_TOKEN_SECRET };
  delete process.env.JWT_SECRET;
  delete process.env.AUTH_TOKEN_SECRET;
  process.env.NODE_ENV = "production";
  process.env.MFK_ENV = "uat";
  assert.throws(() => authTokenSecret(), /JWT_SECRET or AUTH_TOKEN_SECRET/);
  Object.assign(process.env, previous);
});
