import type { Ionicons } from "@expo/vector-icons";

export const MAINTENANCE_LOGS_QUERY_KEY = ["maintenance-logs", { limit: 200 }] as const;

export const SERVICE_TYPES: Array<{
  value: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { value: "oil_change", label: "تغيير الزيت", icon: "water-outline" },
  { value: "tire_rotation", label: "تدوير الإطارات", icon: "ellipse-outline" },
  { value: "brake_inspection", label: "فحص الفرامل", icon: "stop-circle-outline" },
  { value: "battery_check", label: "فحص البطارية", icon: "battery-charging-outline" },
  { value: "air_filter", label: "تغيير فلتر الهواء", icon: "funnel-outline" },
  { value: "transmission_fluid", label: "سائل ناقل الحركة", icon: "git-network-outline" },
  { value: "coolant_flush", label: "تغيير سائل التبريد", icon: "snow-outline" },
  { value: "spark_plugs", label: "تغيير شمعات الإشعال", icon: "flash-outline" },
  { value: "timing_belt", label: "سير التوقيت", icon: "timer-outline" },
  { value: "wheel_alignment", label: "ضبط زوايا الإطارات", icon: "speedometer-outline" },
  { value: "ac_service", label: "صيانة التكييف", icon: "thermometer-outline" },
  { value: "other", label: "أخرى", icon: "ellipsis-horizontal-circle-outline" },
];

export async function fetchMaintenanceLogs() {
  const response = await fetch("/api/maintenance/logs?limit=200", {
    headers: { "Content-Type": "application/json" },
  });

  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : null;

  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || "تعذر تحميل سجل الصيانة.");
  }

  return data as any[];
}

export function serviceLabel(value?: string | null) {
  if (!value) return "-";
  return SERVICE_TYPES.find((item) => item.value === value)?.label || value;
}

export function serviceIcon(value?: string | null): keyof typeof Ionicons.glyphMap {
  return SERVICE_TYPES.find((item) => item.value === value)?.icon ?? "construct-outline";
}

export function logTitle(item: any) {
  return item?.serviceTypeAr || serviceLabel(item?.serviceType);
}

export function vehicleName(item: any, vehicles?: any[]) {
  const fromLog =
    item?.vehicleNickname ||
    [item?.vehicleMake, item?.vehicleModel].filter(Boolean).join(" ");
  if (fromLog) return fromLog;
  const vehicle = (vehicles ?? []).find((row) => row.id === item?.vehicleId);
  if (vehicle) {
    return vehicle.nickname || [vehicle.make, vehicle.model].filter(Boolean).join(" ") || "مركبة";
  }
  return "مركبة";
}

export function formatKm(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num) || value === null || value === undefined || value === "") return "-";
  return `${num.toLocaleString("ar-SA")} كم`;
}

export function formatSar(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num) || value === null || value === undefined || value === "") return "-";
  return `${num.toLocaleString("ar-SA")} ر.س`;
}

export function formatDate(value: unknown) {
  if (!value || typeof value !== "string") return "-";
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function formatDateLong(value: unknown) {
  if (!value || typeof value !== "string") return "-";
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function monthHeading(value: unknown) {
  if (!value || typeof value !== "string") return "بدون تاريخ";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "بدون تاريخ";
  return new Intl.DateTimeFormat("ar-SA", { year: "numeric", month: "long" }).format(date);
}

export function isThisMonth(value: unknown) {
  if (!value || typeof value !== "string") return false;
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

export function doneAtOf(item: any) {
  return item?.lastDoneAt || item?.doneAt || item?.createdAt || null;
}

export function doneKmOf(item: any) {
  return item?.lastDoneKm ?? item?.doneAtKm;
}

export function costOf(item: any) {
  return item?.estimatedCost ?? item?.actualCostSar ?? item?.cost;
}

export function completedLogs(rows: any[] | undefined) {
  return (rows ?? [])
    .filter((item: any) => {
      if (item.isRecommendation) return false;
      if (item.status && item.status !== "done") return false;
      return true;
    })
    .sort((a: any, b: any) => {
      const aDate = new Date(doneAtOf(a) || 0).getTime();
      const bDate = new Date(doneAtOf(b) || 0).getTime();
      return bDate - aDate;
    });
}
