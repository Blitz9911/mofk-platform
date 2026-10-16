// Drove West V011 GATT contract (BLE OBD-II Application Integration Reference, Rev 1.0).
// FFE1 is the adapter->app notify/read characteristic, FFE2 is the app->adapter write
// characteristic — confirmed at runtime by property, never assumed from the UUID alone.
export const OBD_SERVICE_UUID = "0000ffe0-0000-1000-8000-00805f9b34fb";
export const OBD_NOTIFY_UUID = "0000ffe1-0000-1000-8000-00805f9b34fb";
export const OBD_WRITE_UUID = "0000ffe2-0000-1000-8000-00805f9b34fb";

export const DEVICE_NAME_HINT = "V011";
