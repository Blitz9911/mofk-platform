function envFlag(name: string) {
  const value = process.env[name];
  if (value == null) return false;
  return value === "true" || value === "1" || value === "yes";
}

/** Defaults false. Do not enable for all users until QA sign-off. */
export function isHealthIntelligenceEnabled() {
  return envFlag("EXPO_PUBLIC_MFK_HEALTH_INTELLIGENCE_ENABLED");
}

export function isApprovalLoggingEnabled() {
  return isHealthIntelligenceEnabled() && envFlag("EXPO_PUBLIC_MFK_APPROVAL_LOGGING_ENABLED");
}

export function isOdometerTrackingEnabled() {
  return isHealthIntelligenceEnabled() && envFlag("EXPO_PUBLIC_MFK_ODOMETER_TRACKING_ENABLED");
}

export function isAnomalyDetectionEnabled() {
  return isHealthIntelligenceEnabled() && envFlag("EXPO_PUBLIC_MFK_ANOMALY_DETECTION_ENABLED");
}

export function isOcrEnabled() {
  return isHealthIntelligenceEnabled() && envFlag("EXPO_PUBLIC_MFK_OCR_ENABLED");
}
