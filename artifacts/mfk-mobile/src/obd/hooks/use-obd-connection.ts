import { useEffect, useMemo, useState } from "react";

import { emptyPollMetrics } from "../polling/polling-scheduler";
import { ObdService } from "../services/obd-service";
import type { ObdDevice, ObdSnapshot } from "../types/obd.types";

const initialSnapshot: ObdSnapshot = {
  state: "idle",
  permissionStatus: "unknown",
  bluetoothState: "unknown",
  devices: [],
  selectedDevice: null,
  lastSuccessfulDevice: null,
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
    liveReadings: {},
    liveSignals: {},
    frozen: false,
    recording: false,
    recordedFrames: [],
    playbackIndex: null,
    pollMetrics: emptyPollMetrics(),
  dtcScan: null,
  diagnosticHistory: [],
  vehicleInfo: null,
  sessionActivity: "idle",
  occupancy: "none",
  commandTrace: [],
  logs: [],
  userMessage: null,
  technicalError: null,
};

const sharedObdService = new ObdService();

export function useObdConnection() {
  const [snapshot, setSnapshot] = useState<ObdSnapshot>(initialSnapshot);

  useEffect(() => {
    const unsubscribe = sharedObdService.subscribe(setSnapshot);
    return () => {
      unsubscribe();
    };
  }, []);

  const actions = useMemo(
    () => ({
      requestPermissions: () => sharedObdService.requestPermissions(),
      scan: () => sharedObdService.scan(),
      stopScan: () => sharedObdService.stopScan(),
      connect: (device: ObdDevice) => sharedObdService.connect(device),
      reconnect: () => sharedObdService.reconnect(),
      connectMock: () => sharedObdService.connectMock(),
      disconnect: () => sharedObdService.disconnect(),
      readTroubleCodes: () => sharedObdService.readTroubleCodes("03"),
      runDiagnosticScan: () => sharedObdService.runDiagnosticScan(),
      readVehicleInformation: () => sharedObdService.readVehicleInformation(),
      collectVehicleFingerprint: () => sharedObdService.collectVehicleFingerprint(),
      readFreezeFrame: () => sharedObdService.readFreezeFrame(),
      startLivePolling: () => sharedObdService.startLivePolling(),
      startBackgroundLivePolling: () => sharedObdService.startBackgroundLivePolling(),
      stopLivePolling: () => sharedObdService.stopLivePolling(),
      setVisibleCommands: (commands: string[]) => sharedObdService.setVisibleCommands(commands),
      setFrozen: (frozen: boolean) => sharedObdService.setFrozen(frozen),
      startRecording: () => sharedObdService.startRecording(),
      stopRecording: () => sharedObdService.stopRecording(),
      setPlaybackIndex: (index: number | null) => sharedObdService.setPlaybackIndex(index),
      clearTroubleCodesAfterConfirmation: () => sharedObdService.clearTroubleCodesAfterConfirmation(),
      runCapabilityAudit: (options?: { allowAtz?: boolean }) => sharedObdService.runCapabilityAudit(options),
      getLastCapabilityAudit: () => sharedObdService.getLastCapabilityAudit(),
    }),
    [],
  );

  return {
    ...snapshot,
    ...actions,
  };
}
