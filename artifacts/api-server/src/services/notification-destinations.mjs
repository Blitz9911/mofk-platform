export const DESTINATION_BY_TYPE = {
  maintenance_upcoming: "/maintenance",
  maintenance_overdue: "/maintenance",
  maintenance_completed: "/maintenance",
  maintenance_threshold: "/maintenance",
  odometer_review: "/maintenance",
  recommendation_new: "/recommendations",
  recommendation_priority: "/recommendations",
  dtc_new: "/dtc",
  dtc_reappeared: "/dtc",
  document_insurance: "/vehicles",
  document_registration: "/vehicles",
  document_inspection: "/vehicles",
  obd_pair_success: "/device-binding",
  obd_pair_error: "/device-binding",
  obd_permission: "/device-binding",
  subscription_activated: "/(tabs)/subscription-tab",
  subscription_renewal: "/(tabs)/subscription-tab",
  subscription_expired: "/(tabs)/subscription-tab",
  subscription_payment_failed: "/(tabs)/subscription-tab",
  push_probe: "/(tabs)",
};

const ALLOWED_PREFIXES = [
  "/(tabs)",
  "/maintenance",
  "/recommendations",
  "/dtc",
  "/vehicles",
  "/device-binding",
  "/notifications",
  "/notification-settings",
];

export function actionUrlForType(type) {
  return DESTINATION_BY_TYPE[type] || "/(tabs)";
}

export function isAllowedActionUrl(url) {
  if (!url || typeof url !== "string") return false;
  if (/^https?:/i.test(url) || url.includes("://") || url.includes("\\")) return false;
  const clean = url.replace(/^\/app/, "") || "/(tabs)";
  return ALLOWED_PREFIXES.some((prefix) => clean === prefix || clean.startsWith(`${prefix}?`) || clean.startsWith(`${prefix}/`));
}

export function sanitizeActionUrl(url, type) {
  if (isAllowedActionUrl(url)) {
    return url.replace(/^\/app/, "") || "/(tabs)";
  }
  return actionUrlForType(type);
}

export function categoryForType(type) {
  if (String(type).startsWith("maintenance") || type === "odometer_review") return "maintenance";
  if (String(type).startsWith("dtc")) return "diagnostics";
  if (String(type).startsWith("document")) return "documents";
  if (String(type).startsWith("obd")) return "device";
  if (String(type).startsWith("subscription")) return "subscriptions";
  if (String(type).startsWith("recommendation")) return "recommendations";
  return "general";
}
