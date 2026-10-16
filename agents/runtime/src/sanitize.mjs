const UNTRUSTED_KEYS = new Set([
  "instructions",
  "system",
  "prompt",
  "ignorePreviousPolicy",
  "jailbreak",
  "developerMessage",
  "toolCalls",
  "shell",
  "command",
]);

const FORBIDDEN_SUBSTRINGS = [
  "ignore previous",
  "you are now",
  "exfiltrat",
  "sk-proj-",
  "service_role",
  "eas secret",
];

export function asPlainData(value) {
  if (value == null) return value;
  if (typeof value === "string") {
    return FORBIDDEN_SUBSTRINGS.some((needle) => value.toLowerCase().includes(needle))
      ? "[redacted-untrusted-text]"
      : value;
  }
  if (Array.isArray(value)) return value.map(asPlainData);
  if (typeof value === "object") {
    const out = {};
    for (const [key, nested] of Object.entries(value)) {
      if (UNTRUSTED_KEYS.has(key)) {
        out[key] = "[ignored-untrusted-field]";
        continue;
      }
      out[key] = asPlainData(nested);
    }
    return out;
  }
  return value;
}

export function assertSyntheticTaskId(taskId) {
  if (typeof taskId !== "string" || !taskId.startsWith("synthetic-")) {
    throw new Error("taskId must be synthetic-*");
  }
}
