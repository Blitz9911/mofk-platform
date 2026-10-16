import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createModelError, MODEL_ERROR_CODES } from "./errors.mjs";

const SCHEMA_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../contracts/model-response.schema.json",
);

const ALLOWED_TOOLS = new Set();

const DENIED_TOOLS = new Set([
  "execute_shell",
  "shell",
  "fetch",
  "network",
  "github_write",
  "llm_api_call",
  "production_deploy",
  "production_db_write",
  "secret_exfiltration",
  "live_obd_write",
  "obd_mode_04",
  "merge_to_protected_branch",
  "auto_merge",
  "create_production_write_token",
]);

export function loadModelResponseSchema() {
  return JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
}

function fail(errors) {
  throw createModelError(
    MODEL_ERROR_CODES.SCHEMA_INVALID,
    `malformed model output: ${errors.join("; ")}`,
    { errors },
  );
}

export function parseModelText(raw) {
  const text = typeof raw === "string" ? raw : raw?.text;
  if (typeof text !== "string" || !text.trim()) {
    fail(["empty model text"]);
  }
  try {
    return JSON.parse(text);
  } catch {
    fail(["model text is not JSON"]);
  }
}

export function validateModelResponse(rawObject) {
  const errors = [];
  if (!rawObject || typeof rawObject !== "object" || Array.isArray(rawObject)) {
    return { ok: false, errors: ["response must be an object"] };
  }
  const keys = Object.keys(rawObject);
  const allowed = new Set([
    "kind",
    "summary",
    "proposedActions",
    "toolRequests",
    "approvalNeeded",
    "confidence",
    "refusalReason",
  ]);
  for (const key of keys) {
    if (!allowed.has(key)) errors.push(`unexpected field ${key}`);
  }
  if (!["proposal", "refusal"].includes(rawObject.kind)) errors.push("kind invalid");
  if (typeof rawObject.summary !== "string" || !rawObject.summary.trim()) {
    errors.push("summary required");
  }
  if (rawObject.summary && rawObject.summary.length > 2000) errors.push("summary too long");
  if (!Array.isArray(rawObject.proposedActions) || rawObject.proposedActions.length > 12) {
    errors.push("proposedActions invalid");
  } else if (rawObject.proposedActions.some((item) => typeof item !== "string" || item.length > 500)) {
    errors.push("proposedActions items invalid");
  }
  if (!Array.isArray(rawObject.toolRequests) || rawObject.toolRequests.length > 8) {
    errors.push("toolRequests invalid");
  } else {
    for (const tool of rawObject.toolRequests) {
      if (!tool || typeof tool !== "object" || typeof tool.name !== "string" || !tool.name) {
        errors.push("toolRequests.name required");
      }
      if (tool && Object.keys(tool).some((key) => key !== "name" && key !== "args")) {
        errors.push("toolRequests unexpected field");
      }
    }
  }
  if (rawObject.approvalNeeded !== true) errors.push("approvalNeeded must be true");
  if (typeof rawObject.confidence !== "number" || rawObject.confidence < 0 || rawObject.confidence > 1) {
    errors.push("confidence invalid");
  }
  if (rawObject.refusalReason != null && typeof rawObject.refusalReason !== "string") {
    errors.push("refusalReason invalid");
  }
  if (rawObject.kind === "refusal" && !rawObject.refusalReason) {
    errors.push("refusalReason required when kind is refusal");
  }
  return { ok: errors.length === 0, errors };
}

export function assertAuthorizedTools(response) {
  const tools = response.toolRequests || [];
  if (tools.length === 0) return;
  for (const tool of tools) {
    const name = String(tool.name || "").toLowerCase();
    if (DENIED_TOOLS.has(name) || !ALLOWED_TOOLS.has(name)) {
      throw createModelError(
        MODEL_ERROR_CODES.UNAUTHORIZED_TOOL,
        `unauthorized tool request ${tool.name}`,
        { tool: tool.name },
      );
    }
  }
}

export function parseAndValidateModelOutput(raw) {
  const parsed = parseModelText(raw);
  const valid = validateModelResponse(parsed);
  if (!valid.ok) fail(valid.errors);
  assertAuthorizedTools(parsed);
  return parsed;
}
