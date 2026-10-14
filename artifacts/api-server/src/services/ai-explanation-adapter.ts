import { isExternalLlmEnabled } from "../lib/health-intelligence-flags";
import { explainForAssistant } from "./vehicle-health-engine.mjs";

/** LLM is optional. Callers must pass a stored recommendation row, never client-authored copy. */
export function explainRecommendation(rec: Record<string, unknown>) {
  return explainForAssistant(rec);
}

export async function maybeLlmExplain(rec: Record<string, unknown>) {
  const base = explainRecommendation(rec);
  if (!isExternalLlmEnabled()) {
    return { ...base, provider: "rules" as const };
  }
  return { ...base, provider: "rules" as const, llmSkipped: "provider_not_configured" };
}
