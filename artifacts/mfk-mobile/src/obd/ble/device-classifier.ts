import { containsElm327Service, isV011NameHint } from "./ble.constants";
import type { ObdDeviceClass } from "../types/obd.types";

const MFK_NAME = /\b(v011|mofk|mfk|vlink)\b/i;
const LIKELY_OBD_NAME =
  /\b(elm|obd|obdii|obd-ii|veepeak|vgate|konnwei|bafx|obdlink|icar|ios-vlink|vlinker|vpecker|launch|autel|car scanner)\b/i;
const REJECT_NAME =
  /\b(tv|headphone|headset|airpods|watch|macbook|laptop|iphone|ipad|galaxy buds|speaker|keyboard|mouse|band|printer|remote|buds|audio)\b/i;

export function classifyObdDevice(input: {
  name?: string | null;
  localName?: string | null;
  serviceUUIDs?: string[] | null;
  manufacturerData?: string | null;
  savedId?: string | null;
  id?: string;
}): ObdDeviceClass {
  const name = `${input.name ?? ""} ${input.localName ?? ""}`.trim();
  if (input.savedId && input.id && input.savedId === input.id) return "mfk";
  if (REJECT_NAME.test(name)) return "unknown";
  if (MFK_NAME.test(name)) return "mfk";
  if (LIKELY_OBD_NAME.test(name) || isV011NameHint(name)) return "likely_obd";
  // Manufacturer data is common on phones/TVs — only FFE0/FFF0 means an adapter clone.
  if (containsElm327Service(input.serviceUUIDs)) return "uart_generic";
  return "unknown";
}

export function isLikelyObdDevice(input: {
  name?: string | null;
  localName?: string | null;
  serviceUUIDs?: string[] | null;
  manufacturerData?: string | null;
  savedId?: string | null;
  id?: string;
}) {
  const rank = classifyObdDevice(input);
  return rank === "mfk" || rank === "likely_obd";
}

export function friendlyAdapterName(name: string | null | undefined) {
  const value = (name ?? "").trim();
  if (!value || value === "جهاز BLE بدون اسم") return "قطعة مفك";
  if (MFK_NAME.test(value) || LIKELY_OBD_NAME.test(value)) return "قطعة مفك";
  return "قطعة مفك";
}

export function deviceRank(deviceClass: ObdDeviceClass) {
  if (deviceClass === "mfk") return 0;
  if (deviceClass === "likely_obd") return 1;
  if (deviceClass === "uart_generic") return 2;
  return 3;
}
