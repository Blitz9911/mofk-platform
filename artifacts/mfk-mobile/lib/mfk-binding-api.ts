import AsyncStorage from "@react-native-async-storage/async-storage";

import { getValidSupabaseSession, supabaseRequest } from "@/lib/supabase";
import { fingerprintToServerPayload } from "@/src/obd/binding/fingerprint";
import { isDeviceBindingEnabled } from "@/src/obd/binding/feature-flags";
import type { FingerprintMatchResult, VehicleFingerprint } from "@/src/obd/binding/types";

const CLIENT_KEY = "mfk.binding.client-key.v1";
const LAST_VERIFY = "mfk.binding.last-verification.v1";

export async function getOrCreateBindingClientKey() {
  const existing = await AsyncStorage.getItem(CLIENT_KEY);
  if (existing) return existing;
  const created = `client-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
  await AsyncStorage.setItem(CLIENT_KEY, created);
  return created;
}

export async function saveLastVerification(result: FingerprintMatchResult) {
  await AsyncStorage.setItem(LAST_VERIFY, JSON.stringify({ result, at: Date.now() }));
}

export async function loadLastVerification(): Promise<{ result: FingerprintMatchResult; at: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_VERIFY);
    return raw ? (JSON.parse(raw) as { result: FingerprintMatchResult; at: number }) : null;
  } catch {
    return null;
  }
}

async function rpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
  if (!isDeviceBindingEnabled()) {
    throw new Error("Device binding is disabled.");
  }
  const session = await getValidSupabaseSession();
  if (!session?.access_token) throw new Error("يلزم تسجيل الدخول أولًا.");
  return supabaseRequest<T>(
    `/rest/v1/rpc/${name}`,
    { method: "POST", body: JSON.stringify(body) },
    session.access_token,
  );
}

export async function registerMfkDevice(input: {
  deviceModel: string;
  hardwareIdentifier: string | null;
}) {
  const clientKey = await getOrCreateBindingClientKey();
  return rpc("mfk_register_device", {
    p_client_key: clientKey,
    p_device_model: input.deviceModel,
    p_hardware_identifier: input.hardwareIdentifier,
    p_hardware_identity_type: "unverified_hardware",
  });
}

export async function bindMfkDeviceVehicle(
  deviceId: string,
  vehicleId: string,
  fingerprint: VehicleFingerprint,
) {
  return rpc("mfk_bind_device_vehicle", {
    p_device_id: deviceId,
    p_vehicle_id: vehicleId,
    p_fingerprint: fingerprintToServerPayload(fingerprint),
  });
}

export async function recordMfkVerification(
  deviceId: string,
  vehicleId: string,
  result: FingerprintMatchResult,
  summaryAr: string,
) {
  await saveLastVerification(result);
  return rpc("mfk_record_verification", {
    p_device_id: deviceId,
    p_vehicle_id: vehicleId,
    p_result: result,
    p_summary_ar: summaryAr,
  });
}

export async function requestMfkVehicleTransfer(deviceId: string, toVehicleId: string) {
  return rpc("mfk_request_vehicle_transfer", {
    p_device_id: deviceId,
    p_to_vehicle_id: toVehicleId,
  });
}

export async function completeMfkVehicleTransfer(requestId: string) {
  return rpc("mfk_complete_vehicle_transfer", { p_request_id: requestId });
}
