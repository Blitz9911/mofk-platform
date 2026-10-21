import { PermissionsAndroid, Platform } from "react-native";

export type BlePermissionResult = {
  granted: boolean;
  status: "granted" | "denied";
  requested: string[];
};

export async function requestBlePermissions(): Promise<BlePermissionResult> {
  if (Platform.OS === "ios") {
    return { granted: true, status: "granted", requested: [] };
  }

  if (Platform.OS !== "android") {
    return { granted: true, status: "granted", requested: [] };
  }

  const requested =
    Platform.Version >= 31
      ? [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

  const results = await PermissionsAndroid.requestMultiple(requested);
  const granted = requested.every((permission) => results[permission] === PermissionsAndroid.RESULTS.GRANTED);

  return {
    granted,
    status: granted ? "granted" : "denied",
    requested,
  };
}
