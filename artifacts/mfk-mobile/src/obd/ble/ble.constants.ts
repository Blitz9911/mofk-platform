export const V011_SERVICE_UUID_SHORT = "ffe0";
export const V011_WRITE_CHARACTERISTIC_UUID_SHORT = "ffe1";
export const V011_NOTIFY_CHARACTERISTIC_UUID_SHORT = "ffe2";

export const V011_SERVICE_UUID_128 = "0000ffe0-0000-1000-8000-00805f9b34fb";
export const V011_WRITE_CHARACTERISTIC_UUID_128 = "0000ffe1-0000-1000-8000-00805f9b34fb";
export const V011_NOTIFY_CHARACTERISTIC_UUID_128 = "0000ffe2-0000-1000-8000-00805f9b34fb";

export const ELM327_SCAN_TIMEOUT_MS = 9_000;
export const ELM327_SERVICE_UUIDS_SHORT = ["ffe0", "fff0"] as const;
export const ELM327_WRITE_CHARACTERISTIC_UUIDS_SHORT = ["ffe1", "fff1", "fff2"] as const;
export const ELM327_NOTIFY_CHARACTERISTIC_UUIDS_SHORT = ["ffe2", "ffe1", "fff1", "fff4"] as const;

const BLUETOOTH_BASE_UUID_SUFFIX = "-0000-1000-8000-00805f9b34fb";

export function normalizeBleUuid(uuid: string): string {
  return uuid.trim().toLowerCase();
}

export function expandBleUuid(uuid: string): string {
  const normalized = normalizeBleUuid(uuid);
  if (/^[0-9a-f]{4}$/.test(normalized)) {
    return `0000${normalized}${BLUETOOTH_BASE_UUID_SUFFIX}`;
  }
  return normalized;
}

export function bleUuidMatches(actual: string, expectedShortOrFull: string): boolean {
  return expandBleUuid(actual) === expandBleUuid(expectedShortOrFull);
}

export function containsV011Service(serviceUUIDs: string[] | null | undefined): boolean {
  return containsElm327Service(serviceUUIDs);
}

export function containsElm327Service(serviceUUIDs: string[] | null | undefined): boolean {
  return (serviceUUIDs ?? []).some((uuid) =>
    ELM327_SERVICE_UUIDS_SHORT.some((candidateUuid) => bleUuidMatches(uuid, candidateUuid)),
  );
}

export function isV011NameHint(name: string | null | undefined): boolean {
  const normalized = (name ?? "").trim().toLowerCase();
  return (
    normalized.includes("v011") ||
    normalized.includes("elm") ||
    normalized.includes("obd") ||
    normalized.includes("mofk") ||
    normalized.includes("mfk") ||
    normalized.includes("vlink") ||
    normalized.includes("veepeak") ||
    normalized.includes("car scanner")
  );
}
