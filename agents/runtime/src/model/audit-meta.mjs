import { createHash } from "node:crypto";

const SENSITIVE_KEYS = new Set([
  "content",
  "text",
  "prompt",
  "messages",
  "apiKey",
  "token",
  "authorization",
  "secret",
  "password",
  "service_role",
]);

export function digest(value) {
  return createHash("sha256").update(String(value ?? ""), "utf8").digest("hex").slice(0, 16);
}

export function redact(value) {
  if (value == null) return value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redact);
  const out = {};
  for (const [key, nested] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(key) || /key|token|secret|prompt|message/i.test(key)) {
      out[key] = "[omitted]";
      continue;
    }
    out[key] = redact(nested);
  }
  return out;
}

export function modelAuditMetadata({
  agentId,
  provider,
  modelId,
  outcome,
  code = null,
  attempt,
  inputChars,
  outputChars,
  estimatedTokens,
  trustedDigest,
  untrustedDigest,
}) {
  return {
    agentId,
    provider,
    modelId,
    live: false,
    outcome,
    code,
    attempt,
    inputChars,
    outputChars,
    estimatedTokens,
    trustedDigest,
    untrustedDigest,
    storedPrompt: false,
    storedSecrets: false,
  };
}
