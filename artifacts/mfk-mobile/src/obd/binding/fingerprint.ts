import { decodeMode09Text, decodeMode09Vin } from "../vehicle-info/mode09-parser";
import type { FingerprintAvailability, VehicleFingerprint } from "./types";

function normalizeVin(value: string | null | undefined) {
  if (!value) return null;
  const cleaned = value.replace(/[^A-HJ-NPR-Z0-9]/gi, "").toUpperCase();
  return cleaned.length === 17 ? cleaned : null;
}

function normalizeToken(value: string | null | undefined) {
  if (!value) return null;
  const cleaned = value.replace(/\s+/g, " ").trim().toUpperCase();
  return cleaned || null;
}

function sortJoin(values: string[]) {
  return [...new Set(values.map((item) => item.trim().toUpperCase()).filter(Boolean))].sort().join(",");
}

export function emptyFingerprint(error?: string | null): VehicleFingerprint {
  return {
    vinNormalized: null,
    vinAvailability: error ? "timeout" : "unavailable",
    calibrationId: null,
    calibrationAvailability: error ? "timeout" : "unavailable",
    cvn: null,
    cvnAvailability: error ? "timeout" : "unavailable",
    ecuName: null,
    ecuNameAvailability: error ? "timeout" : "unavailable",
    protocol: null,
    supportedPidsNormalized: "",
    ecuIdsNormalized: "",
    collectedAt: Date.now(),
    collectionError: error ?? null,
  };
}

export function availabilityFor(value: string | null, malformed = false): FingerprintAvailability {
  if (malformed) return "malformed";
  if (value) return "ok";
  return "unavailable";
}

export function normalizeFingerprint(input: Partial<VehicleFingerprint> & Pick<VehicleFingerprint, "collectedAt">): VehicleFingerprint {
  const vin = normalizeVin(input.vinNormalized ?? null);
  return {
    vinNormalized: vin,
    vinAvailability: input.vinAvailability ?? availabilityFor(vin),
    calibrationId: normalizeToken(input.calibrationId),
    calibrationAvailability: input.calibrationAvailability ?? availabilityFor(normalizeToken(input.calibrationId)),
    cvn: normalizeToken(input.cvn),
    cvnAvailability: input.cvnAvailability ?? availabilityFor(normalizeToken(input.cvn)),
    ecuName: normalizeToken(input.ecuName),
    ecuNameAvailability: input.ecuNameAvailability ?? availabilityFor(normalizeToken(input.ecuName)),
    protocol: normalizeToken(input.protocol),
    supportedPidsNormalized: input.supportedPidsNormalized ?? "",
    ecuIdsNormalized: input.ecuIdsNormalized ?? "",
    collectedAt: input.collectedAt,
    collectionError: input.collectionError ?? null,
  };
}

export function fingerprintToServerPayload(fingerprint: VehicleFingerprint) {
  return {
    vinNormalized: fingerprint.vinAvailability === "ok" ? fingerprint.vinNormalized : null,
    vinAvailable: fingerprint.vinAvailability === "ok",
    calibrationId: fingerprint.calibrationAvailability === "ok" ? fingerprint.calibrationId : null,
    cvn: fingerprint.cvnAvailability === "ok" ? fingerprint.cvn : null,
    ecuName: fingerprint.ecuNameAvailability === "ok" ? fingerprint.ecuName : null,
    protocol: fingerprint.protocol,
    supportedPidsNormalized: fingerprint.supportedPidsNormalized,
    ecuIdsNormalized: fingerprint.ecuIdsNormalized,
  };
}

export async function collectVehicleFingerprintFromSend(
  send: (command: string, timeoutMs: number) => Promise<string>,
  context: { protocol?: string | null; supportedPids?: string[]; ecuIds?: string[] },
): Promise<VehicleFingerprint> {
  const supportedPidsNormalized = sortJoin(context.supportedPids ?? []);
  const ecuIdsNormalized = sortJoin(context.ecuIds ?? []);
  const protocol = normalizeToken(context.protocol);

  try {
    await send("0900", 6_000);
  } catch {
    /* Mode 09 bitmap is optional; identification PIDs are still attempted. */
  }

  const tryPid = async (pid: string) => {
    try {
      return await send(pid, 8_000);
    } catch (error) {
      if (String(error).toLowerCase().includes("timeout")) throw error;
      return null;
    }
  };

  try {
    let vinRaw: string | null = null;
    try {
      vinRaw = await tryPid("0902");
    } catch {
      return emptyFingerprint("adapter timeout");
    }
    const vinDecoded = vinRaw ? decodeMode09Vin(vinRaw) : { vin: null, availability: "unavailable" as const };

    const calRaw = await tryPid("0904");
    const cvnRaw = await tryPid("0906");
    const ecuRaw = await tryPid("090A");
    const calibrationId = calRaw ? decodeMode09Text(calRaw, "0904") : null;
    const cvn = cvnRaw ? decodeMode09Text(cvnRaw, "0906") : null;
    const ecuName = ecuRaw ? decodeMode09Text(ecuRaw, "090A") : null;

    return normalizeFingerprint({
      vinNormalized: vinDecoded.vin,
      vinAvailability: vinDecoded.availability,
      calibrationId,
      calibrationAvailability: availabilityFor(calibrationId),
      cvn,
      cvnAvailability: availabilityFor(cvn),
      ecuName,
      ecuNameAvailability: availabilityFor(ecuName),
      protocol,
      supportedPidsNormalized,
      ecuIdsNormalized,
      collectedAt: Date.now(),
      collectionError: null,
    });
  } catch (error) {
    return emptyFingerprint(error instanceof Error ? error.message : "adapter timeout");
  }
}
