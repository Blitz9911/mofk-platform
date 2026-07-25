import { useEffect, useMemo, useState } from "react";

import { ObdService } from "../services/obd-service";
import type { ObdDevice, ObdSnapshot } from "../types/obd.types";

const initialSnapshot: ObdSnapshot = {
  state: "idle",
  permissionStatus: "unknown",
  bluetoothState: "unknown",
  devices: [],
  selectedDevice: null,
  initResult: null,
  liveValues: {
    rpm: null,
    speed: null,
    coolantTemp: null,
    engineLoad: null,
    throttle: null,
    fuelLevel: null,
    controlModuleVoltage: null,
  },
  logs: [],
  userMessage: null,
  technicalError: null,
};

export function useObdConnection() {
  const service = useMemo(() => new ObdService(), []);
  const [snapshot, setSnapshot] = useState<ObdSnapshot>(initialSnapshot);

  useEffect(() => {
    const unsubscribe = service.subscribe(setSnapshot);
    return () => {
      unsubscribe();
      service.destroy();
    };
  }, [service]);

  return {
    ...snapshot,
    requestPermissions: () => service.requestPermissions(),
    scan: () => service.scan(),
    stopScan: () => service.stopScan(),
    connect: (device: ObdDevice) => service.connect(device),
    connectMock: () => service.connectMock(),
    disconnect: () => service.disconnect(),
    readTroubleCodes: () => service.readTroubleCodes("03"),
    clearTroubleCodesAfterConfirmation: () => service.clearTroubleCodesAfterConfirmation(),
  };
}
