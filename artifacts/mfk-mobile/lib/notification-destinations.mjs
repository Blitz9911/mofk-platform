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

export function toSafeMobileRoute(actionUrl) {
  if (!actionUrl || typeof actionUrl !== "string") return "/notifications";
  const clean = actionUrl.replace(/^\/app/, "") || "/(tabs)";
  if (/^https?:/i.test(clean) || clean.includes("://")) return "/notifications";
  if (ALLOWED_PREFIXES.some((prefix) => clean === prefix || clean.startsWith(`${prefix}?`) || clean.startsWith(`${prefix}/`))) {
    return clean;
  }
  return "/notifications";
}
