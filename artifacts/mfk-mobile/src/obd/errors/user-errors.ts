export type ObdErrorCode =
  | "BLE_POWERED_OFF"
  | "DEVICE_NOT_FOUND"
  | "CONNECTION_FAILED"
  | "ELM_TIMEOUT"
  | "NO_DATA"
  | "ECU_NOT_RESPONDING"
  | "PERMISSION_DENIED"
  | "INTERNET_OFFLINE"
  | "ADAPTER_MISMATCH"
  | "UNKNOWN";

const MESSAGES: Record<ObdErrorCode, { title: string; body: string }> = {
  BLE_POWERED_OFF: {
    title: "البلوتوث غير مفعّل",
    body: "فعّل البلوتوث من إعدادات الجوال ثم أعد المحاولة.",
  },
  PERMISSION_DENIED: {
    title: "السماح بالبلوتوث",
    body: "يحتاج مفك إلى البلوتوث للاتصال بالقطعة الموجودة في سيارتك.",
  },
  DEVICE_NOT_FOUND: {
    title: "لم نجد قطعة مفك",
    body: "تأكد أن القطعة مركّبة والسيارة في وضع التشغيل، ثم قرّب الجوال منها.",
  },
  CONNECTION_FAILED: {
    title: "تعذر الاتصال بمفك",
    body: "تأكد أن القطعة مركّبة بشكل صحيح ثم أعد المحاولة.",
  },
  ELM_TIMEOUT: {
    title: "تأخر الرد من القطعة",
    body: "القطعة لم ترد في الوقت المتوقع. أعد المحاولة مع بقاء السيارة في وضع التشغيل.",
  },
  NO_DATA: {
    title: "السيارة لم ترسل بيانات",
    body: "تأكد من تشغيل السويتش أو المحرك ثم أعد الفحص.",
  },
  ECU_NOT_RESPONDING: {
    title: "تعذر التواصل مع السيارة",
    body: "تأكد أن السيارة في وضع التشغيل وأن قطعة مفك مثبتة بشكل صحيح.",
  },
  ADAPTER_MISMATCH: {
    title: "الجهاز المكتشف غير متوافق",
    body: "اختر قطعة مفك من قائمة الأجهزة المتوافقة.",
  },
  INTERNET_OFFLINE: {
    title: "لا يوجد اتصال بالإنترنت",
    body: "قراءة السيارة عبر القطعة تعمل بدون إنترنت. المزايا السحابية تحتاج اتصالاً.",
  },
  UNKNOWN: {
    title: "تعذر إكمال العملية",
    body: "حدث خطأ غير متوقع. أعد المحاولة بعد لحظات.",
  },
};

export function mapObdError(error: unknown): { code: ObdErrorCode; title: string; body: string; technical: string } {
  const technical = error instanceof Error ? error.message : String(error ?? "unknown");
  const upper = technical.toUpperCase();
  let code: ObdErrorCode = "UNKNOWN";
  if (upper.includes("PERMISSION") || upper.includes("BLUETOOTH_PERMISSION")) code = "PERMISSION_DENIED";
  else if (upper.includes("BLUETOOTH_OFF") || upper.includes("POWERED_OFF")) code = "BLE_POWERED_OFF";
  else if (upper.includes("NOT_FOUND") || upper.includes("NO DEVICE")) code = "DEVICE_NOT_FOUND";
  else if (upper.includes("FFE1") || upper.includes("FFE2") || upper.includes("CHARACTERISTIC")) code = "ADAPTER_MISMATCH";
  else if (upper.includes("TIMEOUT") || upper.includes("ELM")) code = "ELM_TIMEOUT";
  else if (upper.includes("NO DATA")) code = "NO_DATA";
  else if (upper.includes("UNABLE TO CONNECT") || upper.includes("BUS") || upper.includes("ECU")) code = "ECU_NOT_RESPONDING";
  else if (upper.includes("CONNECT")) code = "CONNECTION_FAILED";
  return { code, ...MESSAGES[code], technical };
}

export function userMessageForState(state: string) {
  switch (state) {
    case "permission_required":
      return MESSAGES.PERMISSION_DENIED.body;
    case "bluetooth_disabled":
      return MESSAGES.BLE_POWERED_OFF.body;
    case "vehicle_not_ready":
      return MESSAGES.ECU_NOT_RESPONDING.body;
    default:
      return null;
  }
}
