import AsyncStorage from "@react-native-async-storage/async-storage";

import type { ObdDevice } from "../types/obd.types";

const KEY = "mfk.saved-obd-device.v1";

export type SavedObdDevice = {
  id: string;
  name: string;
  savedAt: number;
};

export async function loadSavedObdDevice(): Promise<SavedObdDevice | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedObdDevice;
    if (!parsed?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveObdDevice(device: Pick<ObdDevice, "id" | "name">) {
  const payload: SavedObdDevice = {
    id: device.id,
    name: device.name,
    savedAt: Date.now(),
  };
  await AsyncStorage.setItem(KEY, JSON.stringify(payload));
}

export async function clearSavedObdDevice() {
  await AsyncStorage.removeItem(KEY);
}
