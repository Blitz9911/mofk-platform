function envFlag(name: string) {
  const value = process.env[name];
  if (value == null) return false;
  return value === "true" || value === "1" || value === "yes";
}

/** Defaults false. Existing maintenance/recs keep working when this is off. */
export function isHealthIntelligenceEnabled() {
  return envFlag("MFK_HEALTH_INTELLIGENCE_ENABLED");
}

export function isApprovalLoggingEnabled() {
  return isHealthIntelligenceEnabled() && envFlag("MFK_APPROVAL_LOGGING_ENABLED");
}

export function isOdometerTrackingEnabled() {
  return isHealthIntelligenceEnabled() && envFlag("MFK_ODOMETER_TRACKING_ENABLED");
}

export function isAnomalyDetectionEnabled() {
  return isHealthIntelligenceEnabled() && envFlag("MFK_ANOMALY_DETECTION_ENABLED");
}

export function isOcrEnabled() {
  return isHealthIntelligenceEnabled() && envFlag("MFK_OCR_ENABLED");
}

export function isExternalLlmEnabled() {
  return isHealthIntelligenceEnabled() && envFlag("MFK_LLM_EXPLANATIONS_ENABLED");
}
