const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9_-]{8,}/g,
  /Bearer\s+\S+/gi,
  /service_role/gi,
];

export function readApiKey(env, name) {
  if (!name || typeof name !== "string") return null;
  const value = env?.[name];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function redactSecretsInText(text, extraSecrets = []) {
  let out = String(text ?? "");
  for (const secret of extraSecrets) {
    if (secret && typeof secret === "string" && secret.length > 0) {
      out = out.split(secret).join("[redacted-secret]");
    }
  }
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, "[redacted-secret]");
  }
  return out;
}

export function assertNoSecretInAudit(payload) {
  const dumped = JSON.stringify(payload);
  if (/sk-[A-Za-z0-9_-]{8,}/.test(dumped) || /Bearer\s+\S+/i.test(dumped)) {
    return false;
  }
  return true;
}
