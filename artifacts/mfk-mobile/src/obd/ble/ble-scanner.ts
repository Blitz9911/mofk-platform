import type { MfkBleManager } from "./ble-manager";
import type { ObdDevice } from "../types/obd.types";

export class BleScanner {
  constructor(private readonly manager: MfkBleManager) {}

  scan(onDevice: (device: ObdDevice) => void) {
    return this.manager.scan(onDevice);
  }

  stopScan() {
    return this.manager.stopScan();
  }
}
